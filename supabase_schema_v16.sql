-- ============================================================
-- Esquema v16: soft delete en tablas críticas (actividades, evidencias)
-- Decidido en docs/02-ENTERPRISE-SYSTEM-ARCHITECTURE.md §9 y
-- docs/03-ENGINEERING-STANDARDS.md §10 — "nada crítico se pierde".
-- Ejecutar completo en el SQL Editor de Supabase.
-- ============================================================

-- 1. Columna deleted_at en las dos tablas
alter table actividades add column if not exists deleted_at timestamptz;
alter table evidencias  add column if not exists deleted_at timestamptz;

-- 2. El colaborador no debe poder borrar (ni siquiera de forma suave)
--    una tarea a través de su permiso de editar sus propias actividades.
--    Se agrega deleted_at a la lista de campos que el trigger existente
--    ya protege (company_id, assigned_to, campaign_id, progress_pct, status).
create or replace function lock_campos_actividad_colaborador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if my_role() = 'collaborator' then
    new.company_id   := old.company_id;
    new.assigned_to  := old.assigned_to;
    new.campaign_id  := old.campaign_id;
    new.progress_pct := old.progress_pct;
    new.status       := old.status;
    new.deleted_at   := old.deleted_at;
  end if;
  return new;
end;
$$;
-- (el trigger trg_lock_campos_actividad_colaborador ya existe desde v10
--  y usa esta misma función; no hace falta recrearlo)

-- 3. Lectura: nunca devolver filas borradas (para ningún rol, incluido
--    super_admin, en las consultas normales de la app)
drop policy if exists "actividades_select" on actividades;
create policy "actividades_select" on actividades
  for select to authenticated
  using (
    deleted_at is null
    and (
      my_role() = 'super_admin'
      or (my_role() in ('company_admin','director') and company_id = my_company_id())
      or (my_role() = 'collaborator' and assigned_to = auth.uid())
    )
  );

drop policy if exists "evidencias_select" on evidencias;
create policy "evidencias_select" on evidencias
  for select to authenticated
  using (
    deleted_at is null
    and (my_role() = 'super_admin' or company_id = my_company_id())
  );

-- 4. Separar "actividades_write" (insert+update+delete en una sola regla)
--    en políticas específicas: company_admin conserva insert/update,
--    pero pierde la capacidad de borrado físico — de aquí en adelante
--    "borrar" desde la app es un update que solo pone deleted_at.
--    Solo super_admin retiene delete físico, y no se expone en la UI:
--    es exclusivamente para soporte/limpieza vía SQL Editor si hiciera falta.
drop policy if exists "actividades_write" on actividades;

create policy "actividades_insert" on actividades
  for insert to authenticated
  with check (
    my_role() = 'super_admin'
    or (my_role() = 'company_admin' and company_id = my_company_id())
  );

create policy "actividades_update" on actividades
  for update to authenticated
  using (
    my_role() = 'super_admin'
    or (my_role() = 'company_admin' and company_id = my_company_id())
  )
  with check (
    my_role() = 'super_admin'
    or (my_role() = 'company_admin' and company_id = my_company_id())
  );

create policy "actividades_delete" on actividades
  for delete to authenticated
  using (my_role() = 'super_admin');
