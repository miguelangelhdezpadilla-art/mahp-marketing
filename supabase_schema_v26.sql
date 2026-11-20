-- ============================================================
-- Esquema v26: Social AI Hub — sugerencias de IA fuera de
-- `messages` (H1) y escritura de mensajes solo desde el servidor (H2)
--
-- Hallazgos de MPS-002-003 §4:
--
--   H1  meta-webhook guardaba cada sugerencia de IA como una fila de
--       messages (direction='outbound', sender_type='ia') aunque nunca
--       se envió a Meta. El historial mostraba como "enviado" algo que
--       el cliente nunca recibió, y la conversación parecía atendida
--       (el último mensaje era saliente).
--       → Tabla nueva ai_responses: una fila por cada respuesta que
--         genera la IA, con su estado (propuesta, aprobada, editada…).
--       → Las sugerencias que ya existen NO se borran: se marcan en
--         messages.legacy_ai_suggestion y se copian a ai_responses con
--         status 'legacy'. La bandeja deja de mostrarlas como mensajes.
--
--   H2  Cualquier miembro podía insertar filas en messages directamente
--       (con cualquier sender_type, incluido 'ia'), sin enviar nada a
--       Meta: se podía falsificar el historial.
--       → Se elimina la política messages_insert y el permiso insert
--         del navegador. Responder sigue disponible para todo miembro
--         con acceso, a través de la Edge Function meta-send-message,
--         que valida la sesión, envía a Meta y solo entonces guarda.
--
-- ORDEN DE DESPLIEGUE (importante, ver CHANGELOG 2026-11-15):
--   1. Desplegar meta-send-message nueva (funciona con y sin v26).
--   2. Ejecutar ESTE archivo completo en el SQL Editor.
--   3. Desplegar meta-webhook nueva.
--   4. Publicar el frontend (js/shared/socialHub.js).
--   Si entre 2 y 3 entra alguna sugerencia por el webhook viejo, volver
--   a ejecutar solo la sección 3 de este archivo (es idempotente).
--
-- Requiere que supabase_schema_v25.sql ya esté aplicado.
-- Ningún dato se borra.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Respuestas generadas por IA
--    Ojo PostgREST (DATABASE.md, CLAUDE.md §2.2): esta tabla tiene DOS
--    FK hacia messages (trigger_message_id, sent_message_id). Un embed
--    implícito messages(...) falla en silencio; fijar la relación con
--    messages!trigger_message_id(...) o consultar por separado.
-- ----------------------------------------------------------------
create table ai_responses (
  id                 bigint generated always as identity primary key,
  company_id         bigint not null references companies(id) on delete cascade,
  conversation_id    bigint references conversations(id) on delete cascade,  -- nulo solo en pruebas (playground, futuro)
  trigger_message_id bigint references messages(id) on delete set null,      -- mensaje del cliente que la originó
  source             text not null default 'webhook'
                     check (source in ('webhook','regenerar','playground','legacy')),
  mode_at_generation text not null default 'asistido'
                     check (mode_at_generation in ('manual','asistido','automatico')),
  draft              text not null,                -- lo que propuso la IA
  final_text         text,                         -- lo que se envió (igual o editado)
  status             text not null default 'propuesta'
                     check (status in ('propuesta','aprobada','editada','descartada',
                                       'enviada','bloqueada','fallida','escalada','legacy')),
  intent             text,
  confidence         numeric,
  needs_human        boolean,
  decision_reason    text,                         -- ADR-014: motivo visible
  blocked_reason     text,
  retrieved          jsonb,                        -- fuentes usadas (RAG, MPS-002-003 §6)
  model              text,
  input_tokens       int,
  output_tokens      int,
  latency_ms         int,
  est_cost_usd       numeric,
  reviewed_by        uuid references profiles(id) on delete set null,
  reviewed_at        timestamptz,
  sent_message_id    bigint references messages(id) on delete set null,
  legacy_message_id  bigint unique,                -- fila de messages de la que se copió (solo 'legacy')
  created_at         timestamptz not null default now()
);

create index ai_responses_conversation_idx on ai_responses (conversation_id, created_at desc);
create index ai_responses_company_idx      on ai_responses (company_id, created_at desc);

-- Una sola respuesta automática del webhook por mensaje del cliente
-- (reintentos de Meta / ejecuciones dobles no generan dos sugerencias).
create unique index ai_responses_trigger_webhook_unique
  on ai_responses (trigger_message_id)
  where source = 'webhook' and trigger_message_id is not null;

alter table ai_responses enable row level security;

-- Lectura: miembros de la empresa (mismo criterio que conversations).
create policy "ai_responses_select" on ai_responses
  for select to authenticated
  using (my_role() = 'super_admin' or company_id = my_company_id());

-- Escritura: solo Edge Functions (service role). Sin políticas de
-- insert/update/delete para el navegador: aprobar, editar o descartar
-- una sugerencia pasa por meta-send-message.
revoke insert, update, delete on ai_responses from anon, authenticated;

-- Realtime: la bandeja escucha sugerencias nuevas igual que mensajes.
alter publication supabase_realtime add table ai_responses;

-- ----------------------------------------------------------------
-- 2. Marca de sugerencias antiguas dentro de messages
-- ----------------------------------------------------------------
alter table messages
  add column legacy_ai_suggestion boolean not null default false;

-- ----------------------------------------------------------------
-- 3. Migrar las sugerencias existentes (idempotente: se puede
--    volver a ejecutar sola, no duplica nada)
--    Criterio: salientes de IA sin meta_message_id = nunca se
--    enviaron a Meta (todo envío real trae message_id de Meta).
-- ----------------------------------------------------------------
update messages
set legacy_ai_suggestion = true
where sender_type = 'ia'
  and direction = 'outbound'
  and meta_message_id is null
  and not legacy_ai_suggestion;

insert into ai_responses (company_id, conversation_id, trigger_message_id, source,
                          mode_at_generation, draft, status, legacy_message_id, created_at)
select m.company_id,
       m.conversation_id,
       ( -- último mensaje del cliente anterior a la sugerencia
         select i.id from messages i
         where i.conversation_id = m.conversation_id
           and i.direction = 'inbound'
           and i.sent_at <= m.sent_at
         order by i.sent_at desc
         limit 1 ),
       'legacy',
       'asistido',
       m.content,
       'legacy',
       m.id,
       m.sent_at
from messages m
where m.legacy_ai_suggestion
on conflict (legacy_message_id) do nothing;

-- ----------------------------------------------------------------
-- 4. H2: messages solo se escribe desde el servidor
--    meta-webhook (mensajes del cliente) y meta-send-message
--    (respuestas) usan service role, que no pasa por RLS.
-- ----------------------------------------------------------------
drop policy if exists "messages_insert" on messages;
revoke insert, update, delete on messages from anon, authenticated;

-- ----------------------------------------------------------------
-- 5. Verificación
-- ----------------------------------------------------------------
-- a) Debe coincidir: sugerencias marcadas = filas legacy copiadas
select
  (select count(*) from messages where legacy_ai_suggestion)  as sugerencias_marcadas,
  (select count(*) from ai_responses where status = 'legacy') as legacy_copiadas;

-- b) Políticas de messages: debe quedar solo messages_select
select policyname, cmd from pg_policies where tablename = 'messages';

-- c) El navegador ya no puede insertar en messages (debe dar false)
select has_table_privilege('authenticated', 'public.messages', 'insert') as authenticated_puede_insertar;
