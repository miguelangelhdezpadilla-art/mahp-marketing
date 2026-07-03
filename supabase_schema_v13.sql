-- ============================================================
-- Esquema v13: autorización de edición en activity_updates
-- Ejecutar completo en el SQL Editor de Supabase.
-- ============================================================

-- Columna que guarda quién autorizó la última edición
alter table activity_updates
  add column if not exists authorized_by uuid references profiles(id),
  add column if not exists authorized_at timestamptz;

-- Función que registra en audit_log cuando se edita un avance
-- con autorización de director
create or replace function log_avance_editado_con_autorizacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.note is distinct from new.note
     and new.authorized_by is not null then
    insert into audit_log (
      actor_id, company_id, action,
      target_type, target_id, details
    )
    select
      new.authorized_by,
      a.company_id,
      'avance_editado_autorizado',
      'activity_update',
      new.id::text,
      jsonb_build_object(
        'activity_id', new.activity_id,
        'collaborator_id', new.user_id,
        'nota_anterior', old.note,
        'nota_nueva', new.note,
        'authorized_by', new.authorized_by
      )
    from actividades a
    where a.id = new.activity_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_avance_editado on activity_updates;
create trigger trg_log_avance_editado
  after update on activity_updates
  for each row execute function log_avance_editado_con_autorizacion();
