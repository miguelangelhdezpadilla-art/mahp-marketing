-- ============================================================
-- Esquema v28: MAHP AI Response Engine — modelos, límites y consumo
-- (MPS-002-004 §4)
--
--   1. ai_models: catálogo global de modelos con su precio. Solo
--      super_admin lo ve y lo edita (las empresas no ven tarifas).
--   2. ai_company_limits: una fila por empresa con su presupuesto y
--      límites. Los valores predeterminados son los default de las
--      columnas; las empresas nuevas reciben su fila por trigger.
--      Solo super_admin escribe; cada cambio va a audit_log.
--   3. ai_usage: registro contable, una fila por llamada al proveedor.
--      Sin escritura desde el navegador.
--   4. ai_effective_limits / ai_reserve / ai_settle: solo service role.
--      ai_reserve toma un candado POR EMPRESA: dos solicitudes
--      simultáneas no pueden pasar las dos el último centavo, y una
--      empresa nunca bloquea ni consume el presupuesto de otra.
--   5. Vistas del panel (security_invoker: respetan la RLS de quien
--      consulta).
--   6. Realtime para messages (la bandeja se actualiza en vivo).
--
-- Requiere v27 aplicada. Aditiva: no borra ni modifica datos.
-- Ejecutar completo en el SQL Editor de Supabase (de una sola vez).
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Catálogo de modelos
-- ----------------------------------------------------------------
create table ai_models (
  model_id              text primary key,
  provider              text not null check (provider in ('anthropic')),
  tier                  text not null check (tier in ('economico','avanzado')),
  price_input_per_mtok  numeric(10,4) not null check (price_input_per_mtok >= 0),
  price_output_per_mtok numeric(10,4) not null check (price_output_per_mtok >= 0),
  reasoning_allowance   int not null default 0 check (reasoning_allowance >= 0),
  active                boolean not null default true,
  notes                 text,
  updated_at            timestamptz not null default now()
);

-- Precios de la API de Anthropic verificados el 2026-11-20.
insert into ai_models (model_id, provider, tier, price_input_per_mtok, price_output_per_mtok, reasoning_allowance, notes) values
  ('claude-haiku-5-5', 'anthropic', 'economico', 0.10, 0.50, 0,    'Predeterminado. Tarifa para prompts de hasta 100K tokens. Razonamiento apagado.'),
  ('claude-opus-5-5',  'anthropic', 'avanzado',  4.00, 20.00, 1500, 'Opcional por empresa. El razonamiento no se puede apagar: margen de 1500 tokens de salida.');

alter table ai_models enable row level security;
create policy "ai_models_super_admin" on ai_models
  for all to authenticated
  using (my_role() = 'super_admin')
  with check (my_role() = 'super_admin');
revoke all on ai_models from anon;

-- ----------------------------------------------------------------
-- 2. Límites por empresa
-- ----------------------------------------------------------------
create table ai_company_limits (
  company_id                    bigint primary key references companies(id) on delete cascade,
  daily_budget_usd              numeric(10,4) not null default 1.00  check (daily_budget_usd >= 0),
  monthly_budget_usd            numeric(10,4) not null default 10.00 check (monthly_budget_usd >= 0),
  max_input_tokens              int not null default 3000 check (max_input_tokens between 500 and 50000),
  max_output_tokens             int not null default 400  check (max_output_tokens between 50 and 4000),
  max_gen_per_conversation_hour int not null default 10   check (max_gen_per_conversation_hour between 0 and 200),
  default_model_id              text not null default 'claude-haiku-5-5' references ai_models(model_id),
  advanced_model_id             text references ai_models(model_id),
  allow_advanced                boolean not null default false,
  timezone                      text not null default 'America/Mexico_City',
  suspended_at                  timestamptz,
  suspended_reason              text,
  updated_by                    uuid references profiles(id) on delete set null,
  updated_at                    timestamptz not null default now()
);

insert into ai_company_limits (company_id)
select id from companies
on conflict (company_id) do nothing;

create or replace function ai_company_limits_for_new_company()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into ai_company_limits (company_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger companies_ai_limits_insert
  after insert on companies
  for each row execute function ai_company_limits_for_new_company();

-- Auditoría de cambios de límites (quién, cuándo, antes/después).
create or replace function ai_company_limits_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  insert into audit_log (actor_id, company_id, action, target_type, target_id, details)
  values (auth.uid(), new.company_id,
          case when new.suspended_at is not null and old.suspended_at is null then 'ai_suspendida'
               when new.suspended_at is null and old.suspended_at is not null then 'ai_reanudada'
               else 'ai_limites_cambiados' end,
          'ai_company_limits', new.company_id::text,
          jsonb_build_object('antes', to_jsonb(old), 'despues', to_jsonb(new)));
  return new;
end $$;

create trigger ai_company_limits_audit
  before update on ai_company_limits
  for each row execute function ai_company_limits_audit();

alter table ai_company_limits enable row level security;

-- Lectura: super_admin, o admin/director de la empresa activa.
create policy "ai_company_limits_select" on ai_company_limits
  for select to authenticated
  using (my_role() = 'super_admin'
         or (company_id = my_company_id() and my_role() in ('company_admin','director')));

-- Escritura: solo super_admin (los límites son parte del plan de MAHP).
create policy "ai_company_limits_update" on ai_company_limits
  for update to authenticated
  using (my_role() = 'super_admin')
  with check (my_role() = 'super_admin');

revoke insert, delete on ai_company_limits from anon, authenticated;
revoke all on ai_company_limits from anon;

-- ----------------------------------------------------------------
-- 3. Registro de consumo
-- ----------------------------------------------------------------
create table ai_usage (
  id               bigint generated always as identity primary key,
  company_id       bigint not null references companies(id) on delete cascade,
  use_case         text not null check (use_case in ('social_respuesta','playground','calendario')),
  model_id         text not null references ai_models(model_id),
  status           text not null default 'reservada'
                   check (status in ('reservada','liquidada','fallida','liberada')),
  est_cost_usd     numeric(12,6) not null default 0,
  input_tokens     int,
  output_tokens    int,
  cost_usd         numeric(12,6),
  latency_ms       int,
  error_kind       text,
  ai_response_id   bigint references ai_responses(id) on delete set null,
  conversation_id  bigint references conversations(id) on delete set null,
  user_id          uuid references profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  settled_at       timestamptz
);

create index ai_usage_company_created_idx on ai_usage (company_id, created_at);
create index ai_usage_user_created_idx on ai_usage (user_id, created_at) where user_id is not null;
create index ai_usage_reserved_idx on ai_usage (company_id) where status = 'reservada';

alter table ai_usage enable row level security;

create policy "ai_usage_select" on ai_usage
  for select to authenticated
  using (my_role() = 'super_admin'
         or (company_id = my_company_id() and my_role() in ('company_admin','director')));

revoke insert, update, delete on ai_usage from anon, authenticated;
revoke all on ai_usage from anon;

-- ----------------------------------------------------------------
-- 4. Funciones del motor (solo service role)
-- ----------------------------------------------------------------

-- Límites + datos del modelo predeterminado y avanzado. Sin fila → sin
-- resultado → el motor no llama al modelo (falla cerrado).
create or replace function ai_effective_limits(p_company_id bigint)
returns table (
  daily_budget_usd numeric, monthly_budget_usd numeric,
  max_input_tokens int, max_output_tokens int, max_gen_per_conversation_hour int,
  allow_advanced boolean, suspended_at timestamptz,
  default_model_id text, default_tier text, default_price_in numeric, default_price_out numeric, default_reasoning int,
  advanced_model_id text, advanced_tier text, advanced_price_in numeric, advanced_price_out numeric, advanced_reasoning int
)
language sql stable security definer set search_path = public as $$
  select l.daily_budget_usd, l.monthly_budget_usd,
         l.max_input_tokens, l.max_output_tokens, l.max_gen_per_conversation_hour,
         l.allow_advanced and a.active is true, l.suspended_at,
         d.model_id, d.tier, d.price_input_per_mtok, d.price_output_per_mtok, d.reasoning_allowance,
         a.model_id, a.tier, a.price_input_per_mtok, a.price_output_per_mtok, a.reasoning_allowance
  from ai_company_limits l
  join ai_models d on d.model_id = l.default_model_id and d.active
  left join ai_models a on a.model_id = l.advanced_model_id
  where l.company_id = p_company_id;
$$;

-- Reserva el costo máximo estimado de una llamada. Devuelve el id de la
-- reserva, o null con el motivo: suspendida | presupuesto_diario |
-- presupuesto_mensual | tope_usuario | modelo_inactivo | sin_limites.
create or replace function ai_reserve(
  p_company_id bigint, p_use_case text, p_model_id text, p_est_cost numeric,
  p_user_id uuid default null, p_conversation_id bigint default null,
  p_max_user_hour int default null
)
returns table (usage_id bigint, motivo text)
language plpgsql security definer set search_path = public as $$
declare
  l ai_company_limits%rowtype;
  v_dia numeric; v_mes numeric; v_usuario int;
  v_inicio_dia timestamptz; v_inicio_mes timestamptz;
  v_id bigint;
begin
  -- Candado por empresa (bigint): serializa solo las reservas de ESTA empresa.
  perform pg_advisory_xact_lock(p_company_id);

  select * into l from ai_company_limits where company_id = p_company_id;
  if not found then return query select null::bigint, 'sin_limites'; return; end if;
  if l.suspended_at is not null then return query select null::bigint, 'suspendida'; return; end if;
  if not exists (select 1 from ai_models where model_id = p_model_id and active) then
    return query select null::bigint, 'modelo_inactivo'; return;
  end if;

  -- Reservas que nadie liquidó (la función cayó a mitad) se liberan.
  update ai_usage set status = 'liberada', settled_at = now()
  where company_id = p_company_id and status = 'reservada'
    and created_at < now() - interval '10 minutes';

  v_inicio_dia := date_trunc('day',   now() at time zone l.timezone) at time zone l.timezone;
  v_inicio_mes := date_trunc('month', now() at time zone l.timezone) at time zone l.timezone;

  select coalesce(sum(case when status = 'reservada' then est_cost_usd else coalesce(cost_usd, 0) end)
                  filter (where created_at >= v_inicio_dia), 0),
         coalesce(sum(case when status = 'reservada' then est_cost_usd else coalesce(cost_usd, 0) end), 0)
    into v_dia, v_mes
  from ai_usage
  where company_id = p_company_id and status <> 'liberada' and created_at >= v_inicio_mes;

  if v_dia + p_est_cost > l.daily_budget_usd then
    return query select null::bigint, 'presupuesto_diario'; return;
  end if;
  if v_mes + p_est_cost > l.monthly_budget_usd then
    return query select null::bigint, 'presupuesto_mensual'; return;
  end if;

  if p_user_id is not null and p_max_user_hour is not null then
    select count(*) into v_usuario from ai_usage
    where user_id = p_user_id and status <> 'liberada' and created_at > now() - interval '1 hour';
    if v_usuario >= p_max_user_hour then
      return query select null::bigint, 'tope_usuario'; return;
    end if;
  end if;

  insert into ai_usage (company_id, use_case, model_id, est_cost_usd, user_id, conversation_id)
  values (p_company_id, p_use_case, p_model_id, p_est_cost, p_user_id, p_conversation_id)
  returning id into v_id;

  return query select v_id, null::text;
end $$;

-- Liquida una reserva con los tokens reales y el precio vigente.
create or replace function ai_settle(
  p_usage_id bigint, p_input_tokens int, p_output_tokens int, p_latency_ms int,
  p_status text, p_error_kind text default null
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('liquidada','fallida') then
    raise exception 'estado inválido: %', p_status;
  end if;
  update ai_usage u
     set status        = p_status,
         input_tokens  = p_input_tokens,
         output_tokens = p_output_tokens,
         latency_ms    = p_latency_ms,
         error_kind    = p_error_kind,
         cost_usd      = round((p_input_tokens * m.price_input_per_mtok
                                + p_output_tokens * m.price_output_per_mtok) / 1000000.0, 6),
         settled_at    = now()
    from ai_models m
   where u.id = p_usage_id and m.model_id = u.model_id
     and u.status in ('reservada','liberada');
end $$;

revoke execute on function ai_effective_limits(bigint) from public, anon, authenticated;
revoke execute on function ai_reserve(bigint, text, text, numeric, uuid, bigint, int) from public, anon, authenticated;
revoke execute on function ai_settle(bigint, int, int, int, text, text) from public, anon, authenticated;
grant execute on function ai_effective_limits(bigint) to service_role;
grant execute on function ai_reserve(bigint, text, text, numeric, uuid, bigint, int) to service_role;
grant execute on function ai_settle(bigint, int, int, int, text, text) to service_role;

-- ----------------------------------------------------------------
-- 5. Vistas del panel de consumo
-- ----------------------------------------------------------------

-- Consumo por empresa, día (zona horaria de la empresa), caso de uso y modelo.
create view ai_usage_daily with (security_invoker = on) as
select u.company_id,
       c.name as company_name,
       (u.created_at at time zone l.timezone)::date as dia,
       u.use_case,
       u.model_id,
       count(*) filter (where u.status in ('liquidada','fallida'))  as solicitudes,
       count(*) filter (where u.status = 'fallida')                 as fallidas,
       coalesce(sum(u.input_tokens), 0)                              as input_tokens,
       coalesce(sum(u.output_tokens), 0)                             as output_tokens,
       coalesce(sum(u.cost_usd), 0)                                  as costo_usd
from ai_usage u
join companies c on c.id = u.company_id
join ai_company_limits l on l.company_id = u.company_id
where u.status <> 'liberada'
group by 1, 2, 3, 4, 5;

-- Estado actual por empresa: gasto de hoy y del mes contra sus límites.
create view ai_usage_status with (security_invoker = on) as
select l.company_id,
       c.name as company_name,
       l.daily_budget_usd,
       l.monthly_budget_usd,
       l.default_model_id,
       l.allow_advanced,
       l.suspended_at,
       l.suspended_reason,
       coalesce(g.hoy, 0) as gasto_hoy_usd,
       coalesce(g.mes, 0) as gasto_mes_usd,
       coalesce(g.solicitudes_mes, 0) as solicitudes_mes,
       case
         when l.suspended_at is not null                    then 'suspendida'
         when coalesce(g.hoy, 0) >= l.daily_budget_usd      then 'agotado_hoy'
         when coalesce(g.mes, 0) >= l.monthly_budget_usd    then 'agotado_mes'
         when coalesce(g.hoy, 0) >= l.daily_budget_usd * 0.8
           or coalesce(g.mes, 0) >= l.monthly_budget_usd * 0.8 then 'cerca_del_limite'
         else 'activo'
       end as estado
from ai_company_limits l
join companies c on c.id = l.company_id
left join lateral (
  select sum(coalesce(u.cost_usd, u.est_cost_usd))
           filter (where u.created_at >= date_trunc('day', now() at time zone l.timezone) at time zone l.timezone) as hoy,
         sum(coalesce(u.cost_usd, u.est_cost_usd)) as mes,
         count(*) filter (where u.status in ('liquidada','fallida')) as solicitudes_mes
  from ai_usage u
  where u.company_id = l.company_id and u.status <> 'liberada'
    and u.created_at >= date_trunc('month', now() at time zone l.timezone) at time zone l.timezone
) g on true;

grant select on ai_usage_daily, ai_usage_status to authenticated;
revoke all on ai_usage_daily, ai_usage_status from anon;

-- ----------------------------------------------------------------
-- 6. Realtime para messages (pendiente desde v26)
-- ----------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table messages;
  end if;
end $$;

-- ----------------------------------------------------------------
-- Verificación (debe devolver lo indicado en cada comentario)
-- ----------------------------------------------------------------
-- Una fila de límites por empresa: empresas = con_limites
select (select count(*) from companies) as empresas,
       (select count(*) from ai_company_limits) as con_limites;

-- RLS activa en las 3 tablas: 3 filas con rowsecurity = true
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in ('ai_models','ai_company_limits','ai_usage');

-- authenticated NO puede ejecutar las funciones del motor: 3 filas en false
select p.proname, has_function_privilege('authenticated', p.oid, 'execute') as authenticated_puede
from pg_proc p where p.proname in ('ai_effective_limits','ai_reserve','ai_settle');

-- authenticated NO puede insertar en ai_usage: false
select has_table_privilege('authenticated', 'ai_usage', 'insert') as puede_insertar_ai_usage;

-- messages y ai_responses en Realtime: 2 filas
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and tablename in ('messages','ai_responses');
