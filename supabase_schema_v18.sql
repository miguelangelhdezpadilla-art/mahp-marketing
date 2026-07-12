-- =====================================================================
-- v18: Corrige el borrado suave (soft delete) de actividades bajo RLS
-- =====================================================================
-- Bug: actividades_select exige deleted_at IS NULL para que una fila sea
-- visible. Postgres exige que la fila resultante de un UPDATE siga
-- satisfaciendo las políticas de SELECT aplicables, así que cualquier
-- UPDATE de cliente que mueva deleted_at fuera de NULL es rechazado por
-- RLS sin importar el rol (incluido super_admin). Afecta tanto al botón
-- "Eliminar" del calendario como a la herramienta nueva de borrado en
-- lote del Super Admin.
--
-- Fix: mover el borrado suave a una función security definer (mismo
-- patrón que my_role()/my_company_id()), que hace el UPDATE evitando
-- que RLS se re-evalúe contra la fila ya marcada como eliminada.

create or replace function soft_delete_actividades(p_ids bigint[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if my_role() = 'super_admin' then
    update actividades set deleted_at = now() where id = any(p_ids);
  elsif my_role() = 'company_admin' then
    update actividades set deleted_at = now()
    where id = any(p_ids) and company_id = my_company_id();
  else
    raise exception 'No autorizado';
  end if;
end;
$$;

grant execute on function soft_delete_actividades(bigint[]) to authenticated;
