-- ============================================================
-- MAHP — Esquema v33: campañas de Meta Ads (tendencias de campaña)
-- ============================================================
-- Qué agrega (aditiva):
--   1. company_meta_ads: cuenta publicitaria de cada empresa y la llave
--      de usuario (60 días) con permiso ads_read. La llave es secreta:
--      el navegador puede leer todas las columnas MENOS user_token.
--   2. meta_ads_campaigns y meta_ads_daily: estado de cada campaña y
--      sus cifras por día (gasto, conversaciones iniciadas, alcance…).
--      Las llena la Edge Function meta-ads; el navegador solo lee.
--   3. Lectura: admin y director de la empresa, y super_admin
--      (decisión del Product Owner, 2026-11-26: los colaboradores no
--      ven el gasto en publicidad).
--   4. pg_cron diario 09:30 UTC (03:30 en Aguascalientes), con el mismo
--      secreto de Vault que meta-insights (cron_secret_ok, v29).
-- Requiere v29.
-- ============================================================

create table company_meta_ads (
  company_id       bigint primary key references companies(id) on delete cascade,
  ad_account_id    text,                      -- act_123…
  ad_account_name  text,
  currency         text,
  user_token       text not null,             -- SECRETO: solo service role
  token_expires_at timestamptz,
  status           text not null default 'conectada'
                   check (status in ('conectada','elegir_cuenta','sin_cuentas','token_invalido','error')),
  accounts         jsonb,                     -- [{id,name,currency}] para elegir; sin tokens
  last_error       text,
  last_synced_at   timestamptz,
  connected_by     uuid references profiles(id) on delete set null,
  updated_at       timestamptz not null default now()
);

create table meta_ads_campaigns (
  company_id       bigint not null references companies(id) on delete cascade,
  campaign_id      text not null,
  name             text not null,
  effective_status text,
  objective        text,
  updated_at       timestamptz not null default now(),
  primary key (company_id, campaign_id)
);

create table meta_ads_daily (
  company_id    bigint not null references companies(id) on delete cascade,
  campaign_id   text not null,
  fecha         date not null,
  spend         numeric(12,2) not null default 0,
  conversations int not null default 0,       -- onsite_conversion.messaging_conversation_started_7d
  impressions   int not null default 0,
  reach         int not null default 0,
  clicks        int not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (company_id, campaign_id, fecha)
);
create index meta_ads_daily_company_fecha_idx on meta_ads_daily (company_id, fecha);

alter table company_meta_ads enable row level security;
alter table meta_ads_campaigns enable row level security;
alter table meta_ads_daily enable row level security;

create policy "meta_ads_select" on company_meta_ads for select to authenticated
  using (my_role() = 'super_admin' or (company_id = my_company_id() and my_role() in ('company_admin','director')));
create policy "meta_ads_campaigns_select" on meta_ads_campaigns for select to authenticated
  using (my_role() = 'super_admin' or (company_id = my_company_id() and my_role() in ('company_admin','director')));
create policy "meta_ads_daily_select" on meta_ads_daily for select to authenticated
  using (my_role() = 'super_admin' or (company_id = my_company_id() and my_role() in ('company_admin','director')));

-- Sin escritura desde el navegador; la llave nunca se puede leer.
revoke all on company_meta_ads, meta_ads_campaigns, meta_ads_daily from anon;
revoke insert, update, delete on company_meta_ads, meta_ads_campaigns, meta_ads_daily from authenticated;
revoke select on company_meta_ads from authenticated;
grant select (company_id, ad_account_id, ad_account_name, currency, token_expires_at, status, accounts,
              last_error, last_synced_at, updated_at) on company_meta_ads to authenticated;

-- Ejecución diaria.
select cron.unschedule('meta-ads-diario')
where exists (select 1 from cron.job where jobname = 'meta-ads-diario');

select cron.schedule(
  'meta-ads-diario',
  '30 9 * * *',
  $$
  select net.http_post(
    url     := 'https://qahhwfthhvacumeitgan.supabase.co/functions/v1/meta-ads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'meta_insights_cron_secret')
    ),
    body    := '{"modo":"cron"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

select json_build_object(
  'tablas', (select json_agg(relname) from pg_class where relname in ('company_meta_ads','meta_ads_campaigns','meta_ads_daily') and relrowsecurity),
  'cron', (select json_agg(jobname) from cron.job where jobname = 'meta-ads-diario'),
  'token_oculto', not has_column_privilege('authenticated', 'company_meta_ads', 'user_token', 'select')
);
