-- ============================================================
-- Esquema v10: el colaborador puede mover/editar sus propias
-- actividades (titulo/canal/fecha/color): decision ya aprobada
-- en la Fase 4 original, faltaba construirla.
-- ============================================================

create policy "actividades_collaborator_update" on actividades
  for update to authenticated
  using (assigned_to = auth.uid())
  with check (assigned_to = auth.uid());

-- Protege todo lo que un colaborador NO debe poder cambiar por esta vía:
-- a qué empresa/campaña pertenece, a quién está asignada, su % de avance
-- o su estado (eso solo cambia vía activity_updates o por el Admin).
create or replace function lock_campos_actividad_colaborador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if my_role() = 'collaborator' then
    new.company_id := old.company_id;
    new.assigned_to := old.assigned_to;
    new.campaign_id := old.campaign_id;
    new.progress_pct := old.progress_pct;
    new.status := old.status;
  end if;
  return new;
end;
$$;

create trigger trg_lock_campos_actividad_colaborador
  before update on actividades
  for each row execute function lock_campos_actividad_colaborador();
