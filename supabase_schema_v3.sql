-- ============================================================
-- Esquema v3: revocar accesos + auditoría
-- Ejecutar completo en el SQL Editor de Supabase (de una sola vez).
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Revocar accesos: columna "active" en profiles
-- ----------------------------------------------------------------
alter table profiles add column active boolean not null default true;

-- my_role()/my_company_id() ya las usan TODAS las políticas de RLS,
-- así que basta con que dejen de "ver" a un perfil inactivo para que
-- pierda acceso a todo, sin tocar ninguna política existente.
create or replace function my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid() and active = true;
$$;

create or replace function my_company_id()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select company_id from profiles where id = auth.uid() and active = true;
$$;

-- ----------------------------------------------------------------
-- 2. Auditoría: tabla + RLS
-- ----------------------------------------------------------------
create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id) on delete set null,
  company_id bigint references companies(id),
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table audit_log enable row level security;

create policy "audit_log_select" on audit_log
  for select to authenticated
  using (my_role() = 'super_admin' or company_id = my_company_id());

-- Nadie inserta/edita audit_log directamente desde el cliente:
-- solo lo hacen los triggers de abajo (corren con privilegios de
-- propietario de la tabla, sin pasar por estas políticas).

-- ----------------------------------------------------------------
-- 3. Triggers que alimentan audit_log automáticamente
-- ----------------------------------------------------------------
create or replace function log_company_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (actor_id, company_id, action, target_type, target_id, details)
  values (auth.uid(), new.id, 'company_created', 'company', new.id::text, jsonb_build_object('name', new.name));
  return new;
end;
$$;

create trigger trg_log_company_created
  after insert on companies
  for each row execute function log_company_created();

create or replace function log_invite_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (actor_id, company_id, action, target_type, target_id, details)
  values (auth.uid(), new.company_id, 'invite_created', 'invite', new.id::text, jsonb_build_object('email', new.email, 'role', new.role));
  return new;
end;
$$;

create trigger trg_log_invite_created
  after insert on invites
  for each row execute function log_invite_created();

create or replace function log_invite_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.used = false then
    insert into audit_log (actor_id, company_id, action, target_type, target_id, details)
    values (auth.uid(), old.company_id, 'invite_cancelled', 'invite', old.id::text, jsonb_build_object('email', old.email, 'role', old.role));
  end if;
  return old;
end;
$$;

create trigger trg_log_invite_cancelled
  after delete on invites
  for each row execute function log_invite_cancelled();

create or replace function log_access_toggle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.active is distinct from new.active then
    insert into audit_log (actor_id, company_id, action, target_type, target_id, details)
    values (
      auth.uid(),
      new.company_id,
      case when new.active then 'access_restored' else 'access_revoked' end,
      'profile',
      new.id::text,
      jsonb_build_object('full_name', new.full_name, 'role', new.role)
    );
  end if;
  return new;
end;
$$;

create trigger trg_log_access_toggle
  after update on profiles
  for each row execute function log_access_toggle();
