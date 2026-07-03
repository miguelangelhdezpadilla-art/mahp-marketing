-- ============================================================
-- Esquema v9: notificar también cuando se edita una observación
-- Ejecutar completo en el SQL Editor de Supabase (de una sola vez).
-- ============================================================

create or replace function notify_avance_reportado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id bigint;
  v_titulo text;
  v_mensaje text;
begin
  select company_id, titulo into v_company_id, v_titulo
  from actividades where id = new.activity_id;

  if tg_op = 'INSERT' then
    v_mensaje := 'Se reportó avance (' || new.progress_pct || '%) en: ' || v_titulo;
  else
    v_mensaje := 'Se editó una observación en: ' || v_titulo;
  end if;

  insert into notifications (company_id, recipient_id, message)
  select v_company_id, p.id, v_mensaje
  from profiles p
  where p.company_id = v_company_id and p.role = 'company_admin' and p.active = true;

  return new;
end;
$$;

drop trigger if exists trg_notify_avance_reportado on activity_updates;

create trigger trg_notify_avance_reportado
  after insert or update of note on activity_updates
  for each row execute function notify_avance_reportado();
