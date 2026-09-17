-- ============================================================
-- Esquema v23: corrige el índice de idempotencia de v22 para que
-- sirva como "arbiter" de ON CONFLICT.
--
-- v22 creó un índice único PARCIAL (where meta_message_id is not
-- null). Postgres exige que un ON CONFLICT (columna) repita ese mismo
-- predicado para poder usar un índice parcial como arbiter — sin
-- eso, "insert ... on conflict (meta_message_id) do nothing" falla
-- con "no unique or exclusion constraint matching the ON CONFLICT
-- specification". Necesario para pasar de "select + insert" (con una
-- ventana de carrera entre dos entregas concurrentes del webhook de
-- Meta) a un insert verdaderamente atómico e idempotente.
--
-- La solución no es agregar el predicado al ON CONFLICT: es innecesario
-- — un UNIQUE constraint normal en Postgres ya trata cada NULL como
-- distinto de cualquier otro NULL (semántica estándar SQL), así que
-- una restricción no-parcial logra exactamente lo mismo que el índice
-- parcial de v22 (los mensajes sin meta_message_id nunca chocan entre
-- sí) y sí funciona como arbiter simple de ON CONFLICT.
--
-- Requiere que supabase_schema_v22.sql ya esté aplicado.
-- Ejecutar completo en el SQL Editor de Supabase.
-- ============================================================

drop index if exists messages_meta_message_id_unique;

alter table messages
  add constraint messages_meta_message_id_key unique (meta_message_id);
