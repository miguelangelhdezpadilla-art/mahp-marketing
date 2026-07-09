-- ============================================================
-- Esquema v17: permitir que el director reporte cambios de
-- seguidores (follower_logs) — el formulario ya existe en
-- directivo.html, pero la política de insert nunca incluyó
-- el rol 'director', solo company_admin/collaborator/super_admin.
-- Ejecutar completo en el SQL Editor de Supabase.
-- ============================================================

drop policy if exists "follower_logs_insert" on follower_logs;

create policy "follower_logs_insert" on follower_logs
  for insert to authenticated
  with check (
    my_role() = 'super_admin'
    or (my_role() = 'company_admin' and company_id = my_company_id())
    or (my_role() = 'director' and company_id = my_company_id())
    or (
      my_role() = 'collaborator'
      and company_id = my_company_id()
      and (
        activity_id is null
        or exists (
          select 1 from actividades a
          where a.id = follower_logs.activity_id
            and a.assigned_to = auth.uid()
        )
      )
    )
  );
