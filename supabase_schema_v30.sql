-- ============================================================
-- Esquema v30: seguidores desde Meta + metas por periodo
--
--   1. social_channels.meta_channel liga un canal de seguidores con
--      su red en Meta ('facebook' / 'instagram'). Los canales
--      existentes se ligan por nombre; si una empresa tiene Meta
--      conectado y no tiene el canal, se crea.
--   2. meta_followers_at(empresa, red, fecha): seguidores al cierre
--      de ese día según meta_insights_daily (v29). Facebook guarda el
--      total diario 90 días hacia atrás (page_follows); Instagram solo
--      tiene la foto diaria (followers_count) desde v29, así que antes
--      de esa fecha se ESTIMA restando los seguidores nuevos
--      (follower_count) — marcado como estimado (Meta no da las bajas
--      de Instagram por día).
--   3. follower_totals: los canales ligados a Meta toman la cifra de
--      Meta; los demás siguen con el último registro manual. Columna
--      nueva `source` ('meta' | 'manual').
--   4. follower_goals por periodo: start_date / end_date, varias metas
--      por canal (se quita el unique por canal), meta total y/o
--      ganancia (al menos una).
--   5. follower_goals_progress: avance dentro del periodo. Ganancia =
--      seguidores al corte − seguidores al cierre del día anterior al
--      inicio (Meta) o suma de registros manuales del periodo.
--
-- Las vistas pasan a security_invoker: respetan el RLS de quien
-- consulta (antes corrían con permisos del dueño).
-- Requiere v29. Ejecutar completo, de una sola vez. Ningún dato se borra.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Canal ↔ red de Meta
-- ----------------------------------------------------------------
alter table social_channels
  add column if not exists meta_channel text
  check (meta_channel in ('facebook','instagram'));

create unique index if not exists social_channels_meta_unique
  on social_channels (company_id, meta_channel)
  where meta_channel is not null;

-- Ligar por nombre (un canal por empresa y red: el de menor id).
with candidatos as (
  select distinct on (company_id, red) id, red
  from (
    select id, company_id,
           case when name ilike '%facebook%' then 'facebook'
                when name ilike '%instagram%' then 'instagram' end as red
    from social_channels
    where meta_channel is null
  ) x
  where red is not null
    and not exists (select 1 from social_channels s
                    where s.company_id = x.company_id and s.meta_channel = x.red)
  order by company_id, red, id
)
update social_channels sc
set meta_channel = c.red
from candidatos c
where sc.id = c.id;

-- Empresas con Meta conectado y sin canal: se crea.
insert into social_channels (company_id, name, icon, meta_channel)
select distinct p.company_id,
       case p.channel when 'facebook' then 'Facebook' else 'Instagram' end,
       case p.channel when 'facebook' then '📘' else '📸' end,
       p.channel
from company_meta_pages p
where p.active
  and not exists (select 1 from social_channels s
                  where s.company_id = p.company_id and s.meta_channel = p.channel);

-- ----------------------------------------------------------------
-- 2. Seguidores en una fecha
-- ----------------------------------------------------------------
create or replace function meta_followers_at(p_company bigint, p_channel text, p_date date)
returns table (followers bigint, estimated boolean)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_valor numeric;
  v_fecha date;
  v_nuevos numeric;
begin
  -- Dato real más reciente en o antes de la fecha.
  select value into v_valor
  from meta_insights_daily
  where company_id = p_company and channel = p_channel and breakdown = ''
    and metric in ('followers_count', 'page_follows')
    and date <= p_date
  order by date desc, (metric = 'followers_count') desc
  limit 1;

  if v_valor is not null then
    return query select v_valor::bigint, false;
    return;
  end if;

  -- Antes del primer dato: solo Instagram se puede estimar.
  if p_channel <> 'instagram' then
    return;
  end if;

  select value, date into v_valor, v_fecha
  from meta_insights_daily
  where company_id = p_company and channel = p_channel and breakdown = ''
    and metric = 'followers_count'
  order by date asc
  limit 1;

  if v_valor is null then
    return;
  end if;

  select coalesce(sum(value), 0) into v_nuevos
  from meta_insights_daily
  where company_id = p_company and channel = p_channel and breakdown = ''
    and metric = 'follower_count'
    and date > p_date and date < v_fecha;

  return query select (v_valor - v_nuevos)::bigint, true;
end;
$$;

grant execute on function meta_followers_at(bigint, text, date) to authenticated;

-- ----------------------------------------------------------------
-- 3. Totales actuales
-- ----------------------------------------------------------------
create or replace view follower_totals with (security_invoker = true) as
select sc.company_id,
       sc.id   as channel_id,
       sc.name as channel_name,
       sc.icon as channel_icon,
       coalesce(meta.followers, man.after_count) as total_actual,
       coalesce(meta.fecha::timestamptz, man.created_at) as last_updated,
       case when meta.followers is not null then 'meta' else 'manual' end as source
from social_channels sc
left join lateral (
  select m.value::bigint as followers, m.date as fecha
  from meta_insights_daily m
  where sc.meta_channel is not null
    and m.company_id = sc.company_id and m.channel = sc.meta_channel
    and m.metric = 'followers_count' and m.breakdown = ''
  order by m.date desc
  limit 1
) meta on true
left join lateral (
  select fl.after_count, fl.created_at
  from follower_logs fl
  where fl.channel_id = sc.id
  order by fl.created_at desc
  limit 1
) man on true
where meta.followers is not null or man.after_count is not null;

-- ----------------------------------------------------------------
-- 4. Metas por periodo
-- ----------------------------------------------------------------
alter table follower_goals add column if not exists start_date date;
alter table follower_goals add column if not exists end_date date;
alter table follower_goals add column if not exists name text;

update follower_goals
set start_date = (created_at at time zone 'America/Mexico_City')::date
where start_date is null;

alter table follower_goals alter column start_date set not null;
alter table follower_goals alter column start_date set default (now() at time zone 'America/Mexico_City')::date;

alter table follower_goals drop constraint if exists follower_goals_company_id_channel_id_key;
alter table follower_goals drop constraint if exists follower_goals_goal_total_check;
alter table follower_goals drop constraint if exists follower_goals_goal_gain_check;
alter table follower_goals alter column goal_total drop not null;
alter table follower_goals alter column goal_gain drop not null;

alter table follower_goals add constraint follower_goals_valores check (
  (goal_total is null or goal_total > 0)
  and (goal_gain is null or goal_gain > 0)
  and (goal_total is not null or goal_gain is not null)
);
alter table follower_goals add constraint follower_goals_periodo check (
  end_date is null or end_date >= start_date
);

create index if not exists follower_goals_company_channel
  on follower_goals (company_id, channel_id, start_date desc);

-- ----------------------------------------------------------------
-- 5. Avance por meta
-- ----------------------------------------------------------------
drop view if exists follower_goals_progress;

create view follower_goals_progress with (security_invoker = true) as
with hoy as (
  select (now() at time zone 'America/Mexico_City')::date as d
),
base as (
  select fg.*,
         sc.name as channel_name,
         sc.icon as channel_icon,
         sc.meta_channel,
         case when hoy.d < fg.start_date then 'futura'
              when fg.end_date is not null and hoy.d > fg.end_date then 'terminada'
              else 'activa' end as estado,
         least(coalesce(fg.end_date, hoy.d), hoy.d) as fecha_corte,
         hoy.d as hoy
  from follower_goals fg
  join social_channels sc on sc.id = fg.channel_id
  cross join hoy
),
calc as (
  select b.*,
         m_corte.followers  as meta_corte,
         m_inicio.followers as inicio_meta,
         coalesce(m_inicio.estimated, false) as inicio_estimado,
         (select fl.after_count from follower_logs fl
          where fl.channel_id = b.channel_id
            and (fl.created_at at time zone 'America/Mexico_City')::date <= b.fecha_corte
          order by fl.created_at desc limit 1) as manual_corte,
         (select coalesce(sum(fl.delta), 0) from follower_logs fl
          where fl.channel_id = b.channel_id
            and (fl.created_at at time zone 'America/Mexico_City')::date
                between b.start_date and b.fecha_corte) as ganancia_manual
  from base b
  left join lateral meta_followers_at(b.company_id, b.meta_channel, b.fecha_corte) m_corte
    on b.meta_channel is not null
  left join lateral meta_followers_at(b.company_id, b.meta_channel, b.start_date - 1) m_inicio
    on b.meta_channel is not null
),
-- Un canal ligado a Meta pero sin datos de Meta (p. ej. conexión
-- caída) sigue usando sus registros manuales.
fuente as (
  select c.*,
         (c.meta_corte is not null) as usa_meta,
         case when c.meta_corte is not null then c.meta_corte else c.manual_corte end as total_corte,
         case when c.estado = 'futura' then 0
              when c.meta_corte is not null then coalesce(c.meta_corte - c.inicio_meta, 0)
              else c.ganancia_manual end as ganancia
  from calc c
)
select c.id as goal_id,
       c.company_id,
       c.channel_id,
       c.channel_name,
       c.channel_icon,
       c.goal_total,
       c.goal_gain,
       c.campaign_id,
       coalesce(c.total_corte, 0) as total_actual,
       c.ganancia as gain_actual,
       case when c.goal_total > 0
            then least(100, greatest(0, round(coalesce(c.total_corte, 0) * 100.0 / c.goal_total)))
            end as pct_total,
       case when c.goal_gain > 0
            then least(100, greatest(0, round(c.ganancia * 100.0 / c.goal_gain)))
            end as pct_gain,
       c.start_date,
       c.end_date,
       c.name,
       c.estado,
       case when c.usa_meta then 'meta' else 'manual' end as source,
       case when c.usa_meta then c.inicio_meta end as followers_at_start,
       c.usa_meta and c.inicio_estimado as start_estimated,
       case when c.end_date is not null then c.end_date - c.start_date + 1 end as dias_total,
       greatest(0, c.fecha_corte - c.start_date + 1) as dias_transcurridos
from fuente c;
