-- ============================================================
-- Esquema v12: evidencias de actividades
-- Ejecutar completo en el SQL Editor de Supabase.
-- ============================================================

-- Tabla de evidencias
create table if not exists evidencias (
  id           bigint generated always as identity primary key,
  activity_id  bigint not null references actividades(id) on delete cascade,
  company_id   bigint not null references companies(id) on delete cascade,
  uploaded_by  uuid not null references profiles(id),
  file_url     text not null,
  file_type    text not null check (file_type in ('image','video')),
  file_name    text not null,
  created_at   timestamptz not null default now()
);

alter table evidencias enable row level security;

-- Lectura: toda la empresa puede ver las evidencias
drop policy if exists "evidencias_select" on evidencias;
create policy "evidencias_select" on evidencias
  for select to authenticated
  using (my_role() = 'super_admin' or company_id = my_company_id());

-- Insertar: colaborador solo sobre sus actividades asignadas;
--           admin puede insertar sobre cualquier actividad de su empresa
drop policy if exists "evidencias_insert" on evidencias;
create policy "evidencias_insert" on evidencias
  for insert to authenticated
  with check (
    my_role() = 'super_admin'
    or (my_role() = 'company_admin' and company_id = my_company_id())
    or (
      my_role() = 'collaborator'
      and company_id = my_company_id()
      and exists (
        select 1 from actividades a
        where a.id = activity_id
          and a.assigned_to = auth.uid()
      )
    )
  );
