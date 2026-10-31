-- ============================================================
-- Esquema v24: una cuenta, varias empresas (ADR-021)
--
-- Hasta v23 cada cuenta pertenecía a UNA sola empresa
-- (profiles.company_id). Para que una misma persona pueda ser, por
-- ejemplo, director de "ta camaron" y company_admin de "La Casa del
-- Centro" sin crear otra cuenta:
--
--   * company_memberships guarda TODAS las empresas de una cuenta,
--     con un rol y un estado (activo/revocado) por empresa.
--   * profiles.company_id / profiles.role pasan a ser la "empresa
--     activa" (la que se está viendo ahora). Por eso ninguna política
--     RLS existente se reescribe: todas siguen usando my_company_id()
--     y my_role(), que ahora además exigen una membresía activa.
--   * switch_company() cambia la empresa activa, solo hacia empresas
--     donde la cuenta tiene membresía activa.
--   * Invitar un correo que YA tiene cuenta lo agrega a la empresa al
--     momento (antes la invitación quedaba pendiente para siempre).
--
-- También cierra un hueco previo de profiles_update (v2): cualquier
-- usuario podía editar su propio role/company_id/active — incluido
-- ponerse role = 'super_admin'. Ahora un trigger lo impide.
--
-- Requiere que supabase_schema_v23.sql ya esté aplicado.
-- Ejecutar completo en el SQL Editor de Supabase (de una sola vez).
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Membresías
-- ----------------------------------------------------------------
create table company_memberships (
  user_id     uuid   not null references profiles(id) on delete cascade,
  company_id  bigint not null references companies(id) on delete cascade,
  role        text   not null check (role in ('company_admin','director','collaborator')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  primary key (user_id, company_id)
);

create index company_memberships_company_idx on company_memberships(company_id);

alter table company_memberships enable row level security;

-- ----------------------------------------------------------------
-- 2. Migrar lo existente: cada perfil con empresa = 1 membresía.
--    profiles.active pasa a significar solo "revocado en TODA la
--    plataforma" (lo usa el Super Admin); el revocar por empresa vive
--    ahora en company_memberships.active. Se apaga el trigger de
--    auditoría para no registrar "acceso restaurado" falsos.
-- ----------------------------------------------------------------
insert into company_memberships (user_id, company_id, role, active)
select id, company_id, role, active
from profiles
where company_id is not null and role <> 'super_admin'
on conflict do nothing;

alter table profiles disable trigger trg_log_access_toggle;
update profiles set active = true where role <> 'super_admin' and active = false;
alter table profiles enable trigger trg_log_access_toggle;

-- ----------------------------------------------------------------
-- 3. Identidad: mismas firmas que v3, ahora validadas contra la
--    membresía de la empresa activa.
-- ----------------------------------------------------------------
create or replace function my_company_id()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select p.company_id
  from profiles p
  join company_memberships m
    on m.user_id = p.id and m.company_id = p.company_id and m.active
  where p.id = auth.uid() and p.active;
$$;

create or replace function my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select case when p.role = 'super_admin' then 'super_admin' else m.role end
  from profiles p
  left join company_memberships m
    on m.user_id = p.id and m.company_id = p.company_id and m.active
  where p.id = auth.uid() and p.active;
$$;

-- ----------------------------------------------------------------
-- 4. Candado sobre profiles: role/company_id solo cambian hacia una
--    membresía activa de la propia cuenta, y active (revocación
--    global) solo lo cambia el Super Admin.
--    Las funciones internas de este archivo marcan
--    mahp.profile_guard_bypass = 'on' dentro de su transacción;
--    set_config no está expuesto por la API REST (vive en pg_catalog).
-- ----------------------------------------------------------------
create or replace function guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SQL Editor / service_role (sin usuario autenticado) o funciones internas
  if auth.uid() is null or current_setting('mahp.profile_guard_bypass', true) = 'on' then
    return new;
  end if;

  if my_role() = 'super_admin' then
    return new;
  end if;

  if new.active is distinct from old.active then
    raise exception 'Solo el Super Admin puede revocar o restaurar una cuenta completa';
  end if;

  if new.role is distinct from old.role or new.company_id is distinct from old.company_id then
    if new.id <> auth.uid() then
      raise exception 'Solo puedes cambiar tu propia empresa activa';
    end if;
    if not exists (
      select 1 from company_memberships m
      where m.user_id = new.id and m.company_id = new.company_id
        and m.role = new.role and m.active
    ) then
      raise exception 'No tienes una membresía activa con ese rol en esa empresa';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_guard_profile_update
  before update on profiles
  for each row execute function guard_profile_update();

-- ----------------------------------------------------------------
-- 5. RLS
-- ----------------------------------------------------------------
-- Ver: tus propias membresías (para el selector de empresa) y las de
-- la empresa activa (para la pestaña Equipo).
create policy "memberships_select" on company_memberships
  for select to authenticated
  using (my_role() = 'super_admin' or user_id = auth.uid() or company_id = my_company_id());

-- Revocar/restaurar dentro de una empresa: su company_admin (no a sí
-- mismo) o el Super Admin. Solo la columna "active" es editable.
create policy "memberships_update" on company_memberships
  for update to authenticated
  using (
    my_role() = 'super_admin'
    or (my_role() = 'company_admin' and company_id = my_company_id() and user_id <> auth.uid())
  )
  with check (
    my_role() = 'super_admin'
    or (my_role() = 'company_admin' and company_id = my_company_id() and user_id <> auth.uid())
  );

revoke insert, update, delete on company_memberships from anon, authenticated;
grant update (active) on company_memberships to authenticated;
-- Sin políticas de insert/delete: las membresías solo nacen de una
-- invitación (apply_invite, abajo).

-- profiles: además de tu empresa activa, ver a cualquiera que sea
-- miembro de ella aunque su empresa activa ahora sea otra.
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select to authenticated
  using (
    my_role() = 'super_admin'
    or id = auth.uid()
    or exists (
      select 1 from company_memberships m
      where m.user_id = profiles.id and m.company_id = my_company_id()
    )
  );

-- Vista de miembros por empresa (reemplaza los
-- profiles.eq('company_id', ...) del frontend). security_invoker:
-- respeta las políticas RLS de quien consulta.
create or replace view company_members
with (security_invoker = true) as
select
  p.id,
  m.company_id,
  m.role,
  (m.active and p.active) as active,
  p.full_name,
  m.created_at
from company_memberships m
join profiles p on p.id = m.user_id;

grant select on company_members to authenticated;

-- ----------------------------------------------------------------
-- 6. Cambiar de empresa activa
-- ----------------------------------------------------------------
create or replace function switch_company(p_company_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select m.role into v_role
  from company_memberships m
  join profiles p on p.id = m.user_id
  where m.user_id = auth.uid() and m.company_id = p_company_id
    and m.active and p.active and p.role <> 'super_admin';

  if v_role is null then
    raise exception 'No tienes acceso a esa empresa';
  end if;

  update profiles set company_id = p_company_id, role = v_role
  where id = auth.uid();

  return v_role;
end;
$$;

create or replace function my_companies()
returns table (company_id bigint, name text, role text, is_current boolean)
language sql
security definer
stable
set search_path = public
as $$
  select c.id, c.name, m.role, c.id = p.company_id
  from company_memberships m
  join companies c on c.id = m.company_id
  join profiles p on p.id = m.user_id
  where m.user_id = auth.uid() and m.active and p.active
  order by c.name;
$$;

revoke execute on function switch_company(bigint) from public, anon;
revoke execute on function my_companies() from public, anon;
grant execute on function switch_company(bigint) to authenticated;
grant execute on function my_companies() to authenticated;

-- ----------------------------------------------------------------
-- 7. Invitaciones
-- ----------------------------------------------------------------
-- Aplica una invitación a una cuenta concreta. Uso interno: NO se
-- expone a clientes (permitiría auto-aplicarse cualquier invitación).
create or replace function apply_invite(p_invite_id bigint, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv invites%rowtype;
begin
  select * into inv from invites where id = p_invite_id and not used;
  if not found then
    return;
  end if;

  perform set_config('mahp.profile_guard_bypass', 'on', true);

  -- Cuenta sin perfil todavía: esta empresa pasa a ser la activa
  insert into profiles (id, company_id, role, full_name)
  values (p_user_id, inv.company_id, inv.role, (select email from auth.users where id = p_user_id))
  on conflict (id) do nothing;

  insert into company_memberships (user_id, company_id, role)
  values (p_user_id, inv.company_id, inv.role)
  on conflict (user_id, company_id) do update set role = excluded.role, active = true;

  -- Si esa empresa ya era la activa, mantener el rol sincronizado
  update profiles set role = inv.role
  where id = p_user_id and company_id = inv.company_id and role <> 'super_admin';

  update invites set used = true where id = inv.id;

  perform set_config('mahp.profile_guard_bypass', 'off', true);
end;
$$;

revoke execute on function apply_invite(bigint, uuid) from public, anon, authenticated;

-- Registro nuevo: aplica todas sus invitaciones pendientes. La más
-- reciente queda como empresa activa (mismo criterio que v2).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
begin
  for inv in
    select id from invites
    where lower(email) = lower(new.email) and not used
    order by created_at desc
  loop
    perform apply_invite(inv.id, new.id);
  end loop;

  return new;
end;
$$;

-- Invitación a un correo que ya tiene cuenta: se aplica al momento.
create or replace function apply_invite_to_existing_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower(new.email);
  if v_user_id is not null then
    perform apply_invite(new.id, v_user_id);
  end if;
  return new;
end;
$$;

create trigger trg_apply_invite_existing_user
  after insert on invites
  for each row execute function apply_invite_to_existing_user();

-- Invitaciones que ya estaban atascadas (correo con cuenta existente),
-- p. ej. la de company_admin de La Casa del Centro.
do $$
declare
  r record;
begin
  for r in
    select i.id as invite_id, u.id as user_id
    from invites i
    join auth.users u on lower(u.email) = lower(i.email)
    where not i.used
    order by i.created_at desc
  loop
    perform apply_invite(r.invite_id, r.user_id);
  end loop;
end;
$$;

-- ----------------------------------------------------------------
-- 8. Auditoría de revocar/restaurar por empresa
-- ----------------------------------------------------------------
create or replace function log_membership_toggle()
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
      'membership',
      new.user_id::text,
      jsonb_build_object(
        'full_name', (select full_name from profiles where id = new.user_id),
        'role', new.role
      )
    );
  end if;
  return new;
end;
$$;

create trigger trg_log_membership_toggle
  after update on company_memberships
  for each row execute function log_membership_toggle();

-- ----------------------------------------------------------------
-- 9. Notificaciones de avance: a los company_admin de la empresa por
--    membresía, no por empresa activa (un admin que está viendo otra
--    empresa también debe enterarse). Resto igual que v9.
-- ----------------------------------------------------------------
create or replace function notify_avance_reportado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id bigint;
  v_titulo text;
  v_mensaje text;
begin
  select company_id, titulo into v_company_id, v_titulo
  from actividades where id = new.activity_id;

  if tg_op = 'INSERT' then
    v_mensaje := 'Se reportó avance (' || new.progress_pct || '%) en: ' || v_titulo;
  else
    v_mensaje := 'Se editó una observación en: ' || v_titulo;
  end if;

  insert into notifications (company_id, recipient_id, message)
  select v_company_id, m.user_id, v_mensaje
  from company_memberships m
  join profiles p on p.id = m.user_id
  where m.company_id = v_company_id and m.role = 'company_admin'
    and m.active and p.active;

  return new;
end;
$$;

-- ----------------------------------------------------------------
-- 10. Verificación (debe listar una fila por cuenta y empresa)
-- ----------------------------------------------------------------
select u.email, c.name as empresa, m.role, m.active,
       (p.company_id = m.company_id) as es_empresa_activa
from company_memberships m
join profiles p on p.id = m.user_id
join auth.users u on u.id = m.user_id
join companies c on c.id = m.company_id
order by u.email, c.name;
