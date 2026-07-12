-- =====================================================================
-- v19: Auditoría de impersonación de super_admin (CCEC-001A, prioridad
-- más alta identificada en CCEC-001 §1 y 07F-SECURITY-AND-AUDIT.md §5)
-- =====================================================================
-- Hoy, cuando super_admin entra al panel operativo de una empresa
-- (empresa.html?company_id=X), esa acción no queda registrada en ningún
-- lado — un vacío de auditoría señalado de forma independiente en
-- 07F-SECURITY-AND-AUDIT.md, CCEC-001-ENTERPRISE-AUDIT-PLATFORM.md y
-- 10A-MULTI-TENANT-MODEL.md.
--
-- Esta migración agrega una función security definer que el cliente
-- invoca al detectar que un super_admin está impersonando una empresa.
-- La función valida el rol internamente (mismo patrón que
-- soft_delete_actividades(), v18) — nunca confía en que el cliente
-- ya validó nada.

create or replace function log_impersonation_start(p_company_id bigint)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if my_role() <> 'super_admin' then
    raise exception 'No autorizado';
  end if;

  insert into audit_log (actor_id, company_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    p_company_id,
    'impersonacion_iniciada',
    'company',
    p_company_id::text,
    jsonb_build_object('iniciado_en', now())
  );
end;
$$;

grant execute on function log_impersonation_start(bigint) to authenticated;
