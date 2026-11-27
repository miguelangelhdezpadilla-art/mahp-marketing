-- ============================================================
-- MAHP — Esquema v34: la IA aprende de las respuestas del equipo
-- ============================================================
-- Qué agrega (aditiva):
--   1. knowledge_suggestions: preguntas que los clientes repiten y la
--      respuesta que el equipo les dio, detectadas cada noche por la
--      Edge Function ia-aprendizaje. Son BORRADORES: la IA no las usa
--      hasta que una persona las publica como Pregunta frecuente
--      (ADR-022 #6: solo conocimiento publicado).
--   2. Lectura y revisión: admin, director y colaborador de la empresa
--      (igual que el conocimiento, decisión D4) y super_admin. Solo la
--      función las crea.
--   3. ai_usage.use_case admite 'aprendizaje' (para cobrar el análisis
--      nocturno al presupuesto de la empresa).
--   4. pg_cron diario 10:00 UTC (04:00 en Aguascalientes), con el
--      secreto de Vault de meta-insights (cron_secret_ok, v29).
-- Requiere v28, v29 y v31.
-- ============================================================

create table knowledge_suggestions (
  id           bigint generated always as identity primary key,
  company_id   bigint not null references companies(id) on delete cascade,
  question     text not null check (char_length(question) between 2 and 200),
  answer       text not null check (char_length(answer) between 2 and 3000),
  times_asked  int not null default 2,          -- conversaciones distintas con esa pregunta
  examples     jsonb,                           -- [{conversation_id, message_id}] para revisar
  reason       text,                            -- por qué la IA la propone
  status       text not null default 'pendiente' check (status in ('pendiente','publicada','borrador','descartada')),
  entry_id     bigint references knowledge_entries(id) on delete set null,
  reviewed_by  uuid references profiles(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index knowledge_suggestions_company_idx on knowledge_suggestions (company_id, status, created_at desc);

alter table knowledge_suggestions enable row level security;
create policy "knowledge_suggestions_select" on knowledge_suggestions for select to authenticated
  using (my_role() = 'super_admin'
         or (company_id = my_company_id() and my_role() in ('company_admin','director','collaborator')));
create policy "knowledge_suggestions_update" on knowledge_suggestions for update to authenticated
  using (my_role() = 'super_admin'
         or (company_id = my_company_id() and my_role() in ('company_admin','director','collaborator')))
  with check (my_role() = 'super_admin'
         or (company_id = my_company_id() and my_role() in ('company_admin','director','collaborator')));
revoke all on knowledge_suggestions from anon;
revoke insert, delete, update on knowledge_suggestions from authenticated;
grant update (status, entry_id, reviewed_by, reviewed_at) on knowledge_suggestions to authenticated;

-- Nuevo uso en la contabilidad de IA.
alter table ai_usage drop constraint if exists ai_usage_use_case_check;
alter table ai_usage add constraint ai_usage_use_case_check
  check (use_case in ('social_respuesta','playground','calendario','aprendizaje'));

select cron.unschedule('ia-aprendizaje-diario')
where exists (select 1 from cron.job where jobname = 'ia-aprendizaje-diario');

select cron.schedule(
  'ia-aprendizaje-diario',
  '0 10 * * *',
  $$
  select net.http_post(
    url     := 'https://qahhwfthhvacumeitgan.supabase.co/functions/v1/ia-aprendizaje',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'meta_insights_cron_secret')
    ),
    body    := '{"modo":"cron"}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);

select json_build_object(
  'tabla', (select relrowsecurity from pg_class where relname = 'knowledge_suggestions'),
  'uso', (select pg_get_constraintdef(oid) from pg_constraint where conname = 'ai_usage_use_case_check'),
  'cron', (select json_agg(jobname) from cron.job where jobname = 'ia-aprendizaje-diario')
);
