-- ============================================================
-- Esquema v28: Estadísticas de Meta (Facebook + Instagram)
--
-- El panel de seguidores se llenaba solo a mano (follower_logs).
-- Con v28, la Edge Function meta-insights guarda cada día las cifras
-- que Meta expone por API (visualizaciones, alcance, seguidores,
-- interacciones…) para poder compararlas en el tiempo. Instagram solo
-- conserva ~30 días de varias métricas: si MAHP no las guarda, se
-- pierden.
--
--   1. meta_insights_daily: una fila por empresa/canal/métrica/día
--      (y desglose, p. ej. seguidores vs no seguidores).
--   2. meta_content_insights: cifras por publicación (mejor contenido).
--   3. Ejecución diaria con pg_cron + pg_net. El secreto que autoriza
--      la llamada se genera DENTRO de la base (Vault) y nunca sale de
--      ella: la función lo valida con cron_secret_ok() (solo service
--      role).
--
-- Lectura: miembros de la empresa. Escritura: solo service role.
-- Requiere v27. Ejecutar completo en el SQL Editor (de una sola vez).
-- Ningún dato existente se modifica.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Métricas diarias
-- ----------------------------------------------------------------
create table meta_insights_daily (
  id          bigint generated always as identity primary key,
  company_id  bigint not null references companies(id) on delete cascade,
  channel     text not null check (channel in ('facebook','instagram')),
  page_id     text not null,
  metric      text not null,                 -- nombre de Meta (views, reach, follower_count…)
  breakdown   text not null default '',      -- '' = total; p. ej. 'follower_type:FOLLOWER'
  date        date not null,                 -- día (zona de la cuenta de Meta)
  value       numeric not null,
  fetched_at  timestamptz not null default now(),
  unique (company_id, channel, page_id, metric, breakdown, date)
);

create index meta_insights_daily_lookup
  on meta_insights_daily (company_id, channel, metric, date desc);

alter table meta_insights_daily enable row level security;

create policy "meta_insights_daily_select" on meta_insights_daily
  for select to authenticated
  using (my_role() = 'super_admin' or company_id = my_company_id());

revoke insert, update, delete on meta_insights_daily from anon, authenticated;

-- ----------------------------------------------------------------
-- 2. Cifras por publicación
-- ----------------------------------------------------------------
create table meta_content_insights (
  id             bigint generated always as identity primary key,
  company_id     bigint not null references companies(id) on delete cascade,
  channel        text not null check (channel in ('facebook','instagram')),
  page_id        text not null,
  media_id       text not null,
  media_type     text,                       -- REELS, CAROUSEL_ALBUM, IMAGE, VIDEO, post…
  caption        text,
  permalink      text,
  thumbnail_url  text,                       -- URL de Meta: caduca, se renueva en cada corrida
  published_at   timestamptz,
  metrics        jsonb not null default '{}', -- {views, reach, likes, comments, shares, saved…}
  updated_at     timestamptz not null default now(),
  unique (channel, media_id)
);

create index meta_content_insights_company
  on meta_content_insights (company_id, channel, published_at desc);

alter table meta_content_insights enable row level security;

create policy "meta_content_insights_select" on meta_content_insights
  for select to authenticated
  using (my_role() = 'super_admin' or company_id = my_company_id());

revoke insert, update, delete on meta_content_insights from anon, authenticated;

-- ----------------------------------------------------------------
-- 3. Ejecución diaria
-- ----------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Secreto aleatorio generado aquí mismo; nadie necesita conocerlo.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'meta_insights_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'meta_insights_cron_secret');
  end if;
end $$;

create or replace function public.cron_secret_ok(p_secret text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'meta_insights_cron_secret' and decrypted_secret = p_secret
  );
$$;

revoke execute on function public.cron_secret_ok(text) from public, anon, authenticated;
grant execute on function public.cron_secret_ok(text) to service_role;

-- Todos los días a las 09:15 UTC (03:15 en Aguascalientes): Meta ya
-- cerró el día anterior.
select cron.unschedule('meta-insights-diario')
where exists (select 1 from cron.job where jobname = 'meta-insights-diario');

select cron.schedule(
  'meta-insights-diario',
  '15 9 * * *',
  $$
  select net.http_post(
    url     := 'https://qahhwfthhvacumeitgan.supabase.co/functions/v1/meta-insights',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'meta_insights_cron_secret')
    ),
    body    := '{"modo":"cron"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
