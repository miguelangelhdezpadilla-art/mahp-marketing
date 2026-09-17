-- ============================================================
-- Esquema v22: índice único parcial para procesamiento idempotente
-- de mensajes entrantes de Meta.
--
-- Meta reintenta la entrega de un webhook si no responde rápido o
-- ante cualquier fallo transitorio (documentado por Meta) — sin este
-- índice, un reintento podría insertar el mismo mensaje dos veces.
-- meta-webhook ya revisa duplicados por meta_message_id antes de
-- insertar (Fase 2, revisión post-deploy); este índice es la garantía
-- a nivel de base de datos, no solo de aplicación — mismo principio
-- que RLS: la garantía real vive en Postgres, nunca solo en el
-- cliente/función.
--
-- Parcial (where meta_message_id is not null) porque los mensajes sin
-- ese campo (por ejemplo, insertados por un agente humano vía
-- meta-send-message, que no siempre trae message_id de Meta) no deben
-- chocar entre sí con null = null.
--
-- Ejecutar completo en el SQL Editor de Supabase.
-- ============================================================

create unique index messages_meta_message_id_unique
  on messages (meta_message_id)
  where meta_message_id is not null;
