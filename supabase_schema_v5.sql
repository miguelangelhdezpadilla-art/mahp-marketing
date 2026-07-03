-- ============================================================
-- Esquema v5: notificaciones
-- Ejecutar completo en el SQL Editor de Supabase (de una sola vez).
-- ============================================================

create table notifications (
  id bigint generated always as identity primary key,
  company_id bigint references companies(id),
  recipient_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "notifications_select" on notifications
  for select to authenticated
  using (recipient_id = auth.uid() or my_role() = 'super_admin');

create policy "notifications_update" on notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Nadie inserta notificaciones directamente: solo los triggers de abajo.

-- ----------------------------------------------------------------
-- Trigger 1: se asigna (o reasigna) una actividad a un colaborador
-- ----------------------------------------------------------------
create or replace function notify_actividad_asignada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is not null
     and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    insert into notifications (company_id, recipient_id, message)
    values (new.company_id, new.assigned_to, 'Se te asignó una nueva actividad: ' || new.titulo);
  end if;
  return new;
end;
$$;

create trigger trg_notify_actividad_asignada
  after insert or update on actividades
  for each row execute function notify_actividad_asignada();

-- ----------------------------------------------------------------
-- Trigger 2: un colaborador reporta avance -> avisa a los Admins de su empresa
-- ----------------------------------------------------------------
create or replace function notify_avance_reportado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id bigint;
  v_titulo text;
begin
  select company_id, titulo into v_company_id, v_titulo
  from actividades where id = new.activity_id;

  insert into notifications (company_id, recipient_id, message)
  select v_company_id, p.id, 'Se reportó avance (' || new.progress_pct || '%) en: ' || v_titulo
  from profiles p
  where p.company_id = v_company_id and p.role = 'company_admin' and p.active = true;

  return new;
end;
$$;

create trigger trg_notify_avance_reportado
  after insert on activity_updates
  for each row execute function notify_avance_reportado();
