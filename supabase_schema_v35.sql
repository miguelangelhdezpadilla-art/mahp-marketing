-- ============================================================
-- MAHP — Esquema v35: sugerencias de campaña (Meta Ads + Claude)
-- ============================================================
-- Qué agrega (aditiva):
--   1. meta_ads_analysis: una fila por empresa con
--        - lo que Meta recomienda para la cuenta publicitaria
--          (/act_X/recommendations) y su puntaje de oportunidad (0–100),
--          que meta-ads trae en cada sincronización;
--        - el análisis con proyección que escribe Claude a pedido
--          (botón "Analizar"), con la proyección calculada por el código.
--      Solo la Edge Function escribe. Leen admin y director de la
--      empresa y super_admin (decisión del PO, 2026-11-28: igual que
--      las tendencias de campañas).
--   2. ai_usage.use_case admite 'campanas' (el análisis se cobra al
--      presupuesto de IA de la empresa).
-- Requiere v28 y v33.
-- ============================================================

create table meta_ads_analysis (
  company_id            bigint primary key references companies(id) on delete cascade,
  ad_account_id         text,
  opportunity_score     numeric(5,2),
  recommendations       jsonb not null default '[]'::jsonb,  -- [{tipo,nivel,texto,mejora,puntos,url}]
  recommendations_at    timestamptz,
  recommendations_error text,
  analysis              jsonb,                               -- {resumen,hallazgos,sugerencias,proyeccion,proyeccion_cifras}
  analysis_model        text,
  analysis_at           timestamptz,
  analysis_by           uuid references profiles(id) on delete set null,
  updated_at            timestamptz not null default now()
);

alter table meta_ads_analysis enable row level security;
create policy "meta_ads_analysis_select" on meta_ads_analysis for select to authenticated
  using (my_role() = 'super_admin' or (company_id = my_company_id() and my_role() in ('company_admin','director')));
revoke all on meta_ads_analysis from anon;
revoke insert, update, delete on meta_ads_analysis from authenticated;

alter table ai_usage drop constraint if exists ai_usage_use_case_check;
alter table ai_usage add constraint ai_usage_use_case_check
  check (use_case in ('social_respuesta','playground','calendario','aprendizaje','campanas'));

select json_build_object(
  'tabla', (select relrowsecurity from pg_class where relname = 'meta_ads_analysis'),
  'uso', (select pg_get_constraintdef(oid) from pg_constraint where conname = 'ai_usage_use_case_check')
);
