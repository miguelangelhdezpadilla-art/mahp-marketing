-- ============================================================
-- Esquema v2: multi-empresa, roles y dashboards
-- Ejecutar completo en el SQL Editor de Supabase (de una sola vez).
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Tablas nuevas
-- ----------------------------------------------------------------
create table companies (
  id bigint generated always as identity primary key,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id bigint references companies(id),
  role text not null check (role in ('super_admin','company_admin','director','collaborator')),
  full_name text,
  created_at timestamptz not null default now()
);

create table invites (
  id bigint generated always as identity primary key,
  email text not null,
  role text not null check (role in ('company_admin','director','collaborator')),
  company_id bigint not null references companies(id),
  invited_by uuid references profiles(id),
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create table campaigns (
  id bigint generated always as identity primary key,
  company_id bigint not null references companies(id),
  name text not null,
  objective text,
  start_date date,
  end_date date,
  status text not null default 'activa',
  created_at timestamptz not null default now()
);

create table activity_updates (
  id bigint generated always as identity primary key,
  activity_id bigint not null references actividades(id) on delete cascade,
  user_id uuid not null references profiles(id),
  progress_pct int not null check (progress_pct between 0 and 100),
  note text,
  created_at timestamptz not null default now()
);

create table kpis (
  id bigint generated always as identity primary key,
  company_id bigint not null references companies(id),
  name text not null,
  target_value numeric not null,
  current_value numeric not null default 0,
  unit text,
  period text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 2. Extender la tabla existente "actividades"
-- ----------------------------------------------------------------
alter table actividades
  add column company_id bigint references companies(id),
  add column campaign_id bigint references campaigns(id),
  add column assigned_to uuid references profiles(id),
  add column progress_pct int not null default 0 check (progress_pct between 0 and 100),
  add column status text not null default 'pendiente';

-- ----------------------------------------------------------------
-- 3. Funciones helper para RLS (security definer: leen profiles
--    sin quedar atrapadas en su propia política de seguridad)
-- ----------------------------------------------------------------
create or replace function my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function my_company_id()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select company_id from profiles where id = auth.uid();
$$;

-- ----------------------------------------------------------------
-- 4. Trigger: vincular invites con auth.users al registrarse
-- ----------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_invite invites%rowtype;
begin
  select * into matched_invite
  from invites
  where email = new.email and used = false
  order by created_at desc
  limit 1;

  if matched_invite.id is not null then
    insert into profiles (id, company_id, role, full_name)
    values (new.id, matched_invite.company_id, matched_invite.role, new.email);

    update invites set used = true where id = matched_invite.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------
-- 5. Trigger: el progreso reportado por un colaborador actualiza
--    la actividad (así nunca necesita permiso de UPDATE directo
--    sobre "actividades", solo de INSERT sobre "activity_updates")
-- ----------------------------------------------------------------
create or replace function sync_activity_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update actividades
  set progress_pct = new.progress_pct,
      status = case when new.progress_pct >= 100 then 'completada' else 'en_progreso' end
  where id = new.activity_id;
  return new;
end;
$$;

create trigger on_activity_update
  after insert on activity_updates
  for each row execute function sync_activity_progress();

-- ----------------------------------------------------------------
-- 6. Row Level Security
-- ----------------------------------------------------------------
alter table companies enable row level security;
alter table profiles enable row level security;
alter table invites enable row level security;
alter table campaigns enable row level security;
alter table activity_updates enable row level security;
alter table kpis enable row level security;

-- Quita la política abierta original (cualquiera podía leer/escribir)
drop policy if exists "Acceso publico anon" on actividades;

-- companies: super_admin ve y administra todo; el resto solo ve la suya
create policy "companies_select" on companies
  for select to authenticated
  using (my_role() = 'super_admin' or id = my_company_id());

create policy "companies_insert" on companies
  for insert to authenticated
  with check (my_role() = 'super_admin');

create policy "companies_update" on companies
  for update to authenticated
  using (my_role() = 'super_admin')
  with check (my_role() = 'super_admin');

-- profiles: ver tu propia empresa o, si eres super_admin, todas
create policy "profiles_select" on profiles
  for select to authenticated
  using (my_role() = 'super_admin' or id = auth.uid() or company_id = my_company_id());

-- Nota: por simplicidad de v1, cualquier admin con alcance sobre el
-- perfil puede editar rol/empresa de ese perfil. Para v2 conviene
-- mover este tipo de cambios a una función dedicada que valide
-- explícitamente qué cambios de rol están permitidos.
create policy "profiles_update" on profiles
  for update to authenticated
  using (
    id = auth.uid()
    or my_role() = 'super_admin'
    or (my_role() = 'company_admin' and company_id = my_company_id())
  )
  with check (
    id = auth.uid()
    or my_role() = 'super_admin'
    or (my_role() = 'company_admin' and company_id = my_company_id())
  );

-- invites: company_admin gestiona invitaciones de su empresa; super_admin, de cualquiera
create policy "invites_select" on invites
  for select to authenticated
  using (my_role() = 'super_admin' or company_id = my_company_id());

create policy "invites_insert" on invites
  for insert to authenticated
  with check (
    my_role() = 'super_admin'
    or (my_role() = 'company_admin' and company_id = my_company_id() and role in ('director','collaborator'))
  );

create policy "invites_delete" on invites
  for delete to authenticated
  using (my_role() = 'super_admin' or (my_role() = 'company_admin' and company_id = my_company_id()));

-- campaigns: lectura para toda la empresa; escritura solo para admins
create policy "campaigns_select" on campaigns
  for select to authenticated
  using (my_role() = 'super_admin' or company_id = my_company_id());

create policy "campaigns_write" on campaigns
  for all to authenticated
  using (my_role() = 'super_admin' or (my_role() = 'company_admin' and company_id = my_company_id()))
  with check (my_role() = 'super_admin' or (my_role() = 'company_admin' and company_id = my_company_id()));

-- actividades: company_admin/director ven toda la empresa; colaborador solo lo asignado
create policy "actividades_select" on actividades
  for select to authenticated
  using (
    my_role() = 'super_admin'
    or (my_role() in ('company_admin','director') and company_id = my_company_id())
    or (my_role() = 'collaborator' and assigned_to = auth.uid())
  );

create policy "actividades_write" on actividades
  for all to authenticated
  using (my_role() = 'super_admin' or (my_role() = 'company_admin' and company_id = my_company_id()))
  with check (my_role() = 'super_admin' or (my_role() = 'company_admin' and company_id = my_company_id()));

-- activity_updates: solo se puede insertar (es un historial); se borra/edita nunca desde la app
create policy "activity_updates_select" on activity_updates
  for select to authenticated
  using (
    my_role() = 'super_admin'
    or exists (
      select 1 from actividades a
      where a.id = activity_updates.activity_id
        and a.company_id = my_company_id()
    )
  );

create policy "activity_updates_insert" on activity_updates
  for insert to authenticated
  with check (
    my_role() = 'super_admin'
    or (
      my_role() = 'company_admin'
      and exists (select 1 from actividades a where a.id = activity_id and a.company_id = my_company_id())
    )
    or (
      my_role() = 'collaborator'
      and exists (select 1 from actividades a where a.id = activity_id and a.assigned_to = auth.uid())
    )
  );

-- kpis: lectura para toda la empresa; escritura solo para admins
create policy "kpis_select" on kpis
  for select to authenticated
  using (my_role() = 'super_admin' or company_id = my_company_id());

create policy "kpis_write" on kpis
  for all to authenticated
  using (my_role() = 'super_admin' or (my_role() = 'company_admin' and company_id = my_company_id()))
  with check (my_role() = 'super_admin' or (my_role() = 'company_admin' and company_id = my_company_id()));

-- ----------------------------------------------------------------
-- 7. Bootstrap manual del primer Super Admin (hazlo TÚ, una sola vez)
-- ----------------------------------------------------------------
-- Paso A: ve a Authentication > Users en el dashboard de Supabase y
--         crea manualmente tu propio usuario (correo + contraseña),
--         o regístrate desde login.html una vez esté publicado.
-- Paso B: copia el UUID de ese usuario (columna "id" en Authentication > Users)
--         y ejecuta, reemplazando los valores:
--
-- insert into profiles (id, role, full_name)
-- values ('PEGA-AQUI-EL-UUID', 'super_admin', 'Tu Nombre');
