-- ============================================================
-- MAHP — Esquema v32: adjuntos de la base de conocimientos
-- ============================================================
-- Qué agrega (aditiva):
--   1. Bucket privado `knowledge` (25 MB por archivo, límite de Meta),
--      solo con tipos de imagen, video, audio y documentos. Nada de
--      HTML, SVG ni ejecutables.
--   2. Políticas de storage: cada empresa solo ve y sube en su carpeta
--      ({company_id}/...). Subir y borrar: company_admin o super_admin.
--   3. knowledge_attachments: enlaces y archivos de cada entrada.
--      La IA comparte los enlaces tal cual; los archivos los adjunta el
--      envío automático cuando la respuesta usa esa entrada.
-- Requiere v31.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('knowledge', 'knowledge', false, 26214400, array[
  'image/jpeg','image/png','image/gif','image/webp',
  'video/mp4','video/quicktime','video/webm',
  'audio/mpeg','audio/mp4','audio/ogg','audio/wav',
  'application/pdf',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain','text/csv'
])
on conflict (id) do nothing;

drop policy if exists "knowledge_files_select" on storage.objects;
create policy "knowledge_files_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'knowledge'
         and (public.my_role() = 'super_admin'
              or ((storage.foldername(name))[1] = public.my_company_id()::text
                  and public.my_role() in ('company_admin','director'))));

drop policy if exists "knowledge_files_insert" on storage.objects;
create policy "knowledge_files_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'knowledge'
              and (public.my_role() = 'super_admin'
                   or ((storage.foldername(name))[1] = public.my_company_id()::text
                       and public.my_role() = 'company_admin')));

drop policy if exists "knowledge_files_delete" on storage.objects;
create policy "knowledge_files_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'knowledge'
         and (public.my_role() = 'super_admin'
              or ((storage.foldername(name))[1] = public.my_company_id()::text
                  and public.my_role() = 'company_admin')));

create table knowledge_attachments (
  id           bigint generated always as identity primary key,
  entry_id     bigint not null references knowledge_entries(id) on delete cascade,
  company_id   bigint not null references companies(id) on delete cascade,
  kind         text not null check (kind in ('enlace','imagen','video','audio','archivo')),
  label        text check (label is null or char_length(label) <= 120),
  url          text check (url is null or (url ~* '^https?://' and char_length(url) <= 1000)),
  storage_path text,
  file_name    text check (file_name is null or char_length(file_name) <= 200),
  mime_type    text,
  size_bytes   bigint check (size_bytes is null or size_bytes between 1 and 26214400),
  created_by   uuid references profiles(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  -- Un enlace lleva url; un archivo lleva ruta en el bucket, dentro de la carpeta de su empresa.
  check ((kind = 'enlace' and url is not null and storage_path is null)
      or (kind <> 'enlace' and storage_path is not null and url is null
          and split_part(storage_path, '/', 1) = company_id::text))
);

create index knowledge_attachments_entry_idx on knowledge_attachments (entry_id);

-- La empresa del adjunto es la de su entrada (no se confía en el navegador).
create or replace function knowledge_attachments_company()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select company_id into new.company_id from knowledge_entries where id = new.entry_id;
  if new.company_id is null then raise exception 'entrada no encontrada'; end if;
  return new;
end $$;

create trigger knowledge_attachments_company
  before insert on knowledge_attachments
  for each row execute function knowledge_attachments_company();

alter table knowledge_attachments enable row level security;

create policy "knowledge_attachments_select" on knowledge_attachments
  for select to authenticated
  using (my_role() = 'super_admin'
         or (company_id = my_company_id() and my_role() in ('company_admin','director')));
create policy "knowledge_attachments_insert" on knowledge_attachments
  for insert to authenticated
  with check (my_role() = 'super_admin'
              or (company_id = my_company_id() and my_role() = 'company_admin'));
create policy "knowledge_attachments_delete" on knowledge_attachments
  for delete to authenticated
  using (my_role() = 'super_admin'
         or (company_id = my_company_id() and my_role() = 'company_admin'));
revoke update on knowledge_attachments from anon, authenticated;
revoke all on knowledge_attachments from anon;

select json_build_object(
  'bucket', (select json_build_object('id', id, 'public', public, 'limite', file_size_limit) from storage.buckets where id = 'knowledge'),
  'rls', (select relrowsecurity from pg_class where relname = 'knowledge_attachments')
);
