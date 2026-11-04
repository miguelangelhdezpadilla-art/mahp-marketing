-- ============================================================
-- Esquema v25: Conexiones sociales en autoservicio (MIP-002 Fase B)
--
-- Hasta v24 una página de Meta se conectaba a mano (Graph API
-- Explorer + SQL). Con v25 cada company_admin conecta su propia
-- página desde Social Hub → "Conexiones sociales":
--
--   * company_meta_pages gana estado, quién conectó, permisos
--     concedidos y la última verificación. La escritura sigue siendo
--     SOLO del service role (Edge Function meta-oauth); el token nunca
--     se expone al navegador.
--   * meta_oauth_sessions guarda, por 10 minutos, el token de usuario
--     mientras el admin elige cuál de sus páginas conectar (el "code"
--     de Meta es de un solo uso). Solo service role.
--   * my_meta_connections() deja ver el ESTADO de las conexiones (sin
--     token) a cualquier miembro de la empresa.
--   * Cada conexión, desconexión y cambio de estado queda en audit_log.
--
-- Requiere que supabase_schema_v24.sql ya esté aplicado.
-- Ejecutar completo en el SQL Editor de Supabase (de una sola vez).
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Estado de cada conexión
--    "no conectada", "esperando autorización" y "autorización
--    cancelada" (MIP-002 §5) no se guardan: son estados de la
--    pantalla (sin fila / ventana de Meta abierta / ventana cerrada).
-- ----------------------------------------------------------------
alter table company_meta_pages
  add column status text not null default 'conectada'
    check (status in ('conectada','permisos_insuficientes','requiere_reconexion',
                      'token_invalido','error_sincronizacion','desconectada')),
  add column connected_by     uuid references profiles(id) on delete set null,
  add column granted_scopes   text[],
  add column linked_page_id   text,         -- en la fila de Instagram: la página de Facebook por la que se conectó
  add column last_checked_at  timestamptz,
  add column last_error       text,
  add column updated_at       timestamptz not null default now();

-- La conexión manual existente (ta camaron) queda como conectada.
update company_meta_pages set status = case when active then 'conectada' else 'desconectada' end;

-- ----------------------------------------------------------------
-- 2. Sesiones temporales del flujo OAuth (solo service role)
-- ----------------------------------------------------------------
create table meta_oauth_sessions (
  id          uuid primary key default gen_random_uuid(),
  company_id  bigint not null references companies(id) on delete cascade,
  created_by  uuid not null references profiles(id) on delete cascade,
  user_token  text not null,                 -- secreto — nunca sale de la Edge Function
  pages       jsonb not null,                -- páginas disponibles, SIN tokens
  expires_at  timestamptz not null default now() + interval '10 minutes'
);

alter table meta_oauth_sessions enable row level security;
-- Sin políticas para authenticated/anon: RLS lo deniega todo.
revoke all on meta_oauth_sessions from anon, authenticated;

-- ----------------------------------------------------------------
-- 3. Lectura del estado (sin token) para los miembros de la empresa
-- ----------------------------------------------------------------
create or replace function my_meta_connections(p_company_id bigint)
returns table (
  id bigint, channel text, page_id text, page_name text, status text,
  granted_scopes text[], linked_page_id text, last_checked_at timestamptz,
  last_error text, connected_by_name text, updated_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select c.id, c.channel, c.page_id, c.page_name, c.status,
         c.granted_scopes, c.linked_page_id, c.last_checked_at,
         c.last_error, p.full_name, c.updated_at
  from company_meta_pages c
  left join profiles p on p.id = c.connected_by
  where c.company_id = p_company_id
    and (my_role() = 'super_admin' or p_company_id = my_company_id())
  order by c.channel;
$$;

revoke execute on function my_meta_connections(bigint) from public, anon;
grant execute on function my_meta_connections(bigint) to authenticated;

-- ----------------------------------------------------------------
-- 4. Auditoría de conexiones (MIP-002 §5, trazabilidad)
--    La Edge Function escribe con service role, así que auth.uid()
--    es nulo: el autor real va en connected_by.
-- ----------------------------------------------------------------
create or replace function log_meta_connection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into audit_log (actor_id, company_id, action, target_type, target_id, details)
    values (
      new.connected_by,
      new.company_id,
      case
        when new.status = 'conectada'    then 'meta_conectada'
        when new.status = 'desconectada' then 'meta_desconectada'
        else 'meta_estado_cambiado'
      end,
      'meta_page',
      new.page_id,
      jsonb_build_object('channel', new.channel, 'page_name', new.page_name,
                         'status', new.status, 'error', new.last_error)
    );
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- BEFORE para poder fijar updated_at en la misma fila.
create trigger trg_log_meta_connection
  before insert or update on company_meta_pages
  for each row execute function log_meta_connection();

-- ----------------------------------------------------------------
-- 5. Verificación
-- ----------------------------------------------------------------
select company_id, channel, page_id, page_name, status, active
from company_meta_pages
order by company_id, channel;
