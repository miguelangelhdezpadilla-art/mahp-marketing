-- ============================================================
-- Esquema v8: observaciones editables (Fase 3 de colaboradores)
-- Ejecutar completo en el SQL Editor de Supabase (de una sola vez).
-- ============================================================

alter table activity_updates add column updated_at timestamptz;

-- Permite que el autor de una observación edite su propio texto.
create policy "activity_updates_update_own" on activity_updates
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Protege todo excepto el texto (note): nadie puede, por esta vía,
-- cambiar a qué actividad pertenece, quién la escribió, el % de avance
-- que tenía en su momento, ni la fecha original de creación.
create or replace function lock_campos_observacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.activity_id := old.activity_id;
  new.user_id := old.user_id;
  new.progress_pct := old.progress_pct;
  new.created_at := old.created_at;

  if new.note is distinct from old.note then
    new.updated_at := now();
  end if;

  return new;
end;
$$;

create trigger trg_lock_campos_observacion
  before update on activity_updates
  for each row execute function lock_campos_observacion();
