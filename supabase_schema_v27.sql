-- ============================================================
-- Esquema v27: Social AI Hub — imágenes/adjuntos e historial de Meta
--
--   1. Bucket privado `social-media` para los adjuntos (imágenes,
--      video, audio, archivos) que llegan por Messenger e Instagram.
--      Las URLs de Meta caducan; los Edge Functions descargan el
--      archivo una vez y lo guardan aquí. messages.media_url guarda la
--      ruta dentro del bucket (empresa/conversación/archivo).
--      Lectura: solo miembros de la empresa dueña de la carpeta, vía
--      URL firmada. Escritura: solo service role (sin políticas de
--      insert/update/delete para el navegador).
--
--   2. last_message_at ya no retrocede: al importar historial
--      (meta-sync-conversation) se insertan mensajes con fecha
--      antigua, y el trigger de v20 ponía esa fecha vieja como "último
--      mensaje", hundiendo la conversación en la bandeja.
--
-- Requiere que supabase_schema_v26.sql ya esté aplicado.
-- Ejecutar completo en el SQL Editor de Supabase (de una sola vez).
-- Ningún dato se borra.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Bucket de adjuntos
-- ----------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('social-media', 'social-media', false, 26214400)  -- 25 MB, límite de Messenger
on conflict (id) do nothing;

drop policy if exists "social_media_select" on storage.objects;
create policy "social_media_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'social-media'
    and (
      public.my_role() = 'super_admin'
      or (storage.foldername(name))[1] = public.my_company_id()::text
    )
  );

-- ----------------------------------------------------------------
-- 2. last_message_at: solo avanza
-- ----------------------------------------------------------------
create or replace function update_conversation_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update conversations
  set last_message_at = greatest(coalesce(last_message_at, new.sent_at), new.sent_at)
  where id = new.conversation_id;
  return new;
end;
$$;
