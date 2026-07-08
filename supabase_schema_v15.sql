-- ============================================================
-- Esquema v15: gamificación — puntos y ranking
-- Ejecutar completo en el SQL Editor de Supabase.
-- ============================================================

-- Tabla de registro de puntos
create table points_log (
  id          bigint generated always as identity primary key,
  company_id  bigint not null references companies(id)
                on delete cascade,
  user_id     uuid not null references profiles(id)
                on delete cascade,
  action      text not null,
  points      int  not null,
  activity_id bigint references actividades(id)
                on delete set null,
  campaign_id bigint references campaigns(id)
                on delete set null,
  created_at  timestamptz not null default now()
);

alter table points_log enable row level security;

-- Solo admin y director ven los puntos
create policy "points_log_select" on points_log
  for select to authenticated
  using (
    my_role() = 'super_admin'
    or (
      my_role() in ('company_admin','director')
      and company_id = my_company_id()
    )
  );

-- Solo triggers insertan puntos (nunca el cliente)
-- No se define insert policy para usuarios normales.

-- Vista: total de puntos por usuario
create or replace view points_totals as
select
  pl.company_id,
  pl.user_id,
  p.full_name,
  sum(pl.points)  as total_points,
  count(*)        as total_events
from points_log pl
join profiles p on p.id = pl.user_id
group by pl.company_id, pl.user_id, p.full_name;

-- Vista: puntos por usuario por campaña
create or replace view points_by_campaign as
select
  pl.company_id,
  pl.campaign_id,
  pl.user_id,
  p.full_name,
  sum(pl.points)  as total_points,
  count(*)        as total_events
from points_log pl
join profiles p on p.id = pl.user_id
where pl.campaign_id is not null
group by pl.company_id, pl.campaign_id,
         pl.user_id, p.full_name;

-- ── Trigger 1: tarea completada → +50 pts
--              si fue antes de fecha → +20 pts bonus
create or replace function award_tarea_completada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo actúa cuando status cambia a 'completada'
  if new.status = 'completada'
     and (old.status is null
          or old.status <> 'completada')
     and new.assigned_to is not null then

    -- Puntos base por completar
    insert into points_log (
      company_id, user_id, action,
      points, activity_id, campaign_id
    ) values (
      new.company_id,
      new.assigned_to,
      'tarea_completada',
      50,
      new.id,
      new.campaign_id
    );

    -- Bonus por completar antes de la fecha límite
    if new.fecha >= current_date then
      insert into points_log (
        company_id, user_id, action,
        points, activity_id, campaign_id
      ) values (
        new.company_id,
        new.assigned_to,
        'completada_antes_fecha',
        20,
        new.id,
        new.campaign_id
      );
    end if;

  end if;
  return new;
end;
$$;

create trigger trg_award_tarea_completada
  after update on actividades
  for each row execute function award_tarea_completada();

-- ── Trigger 2: avance reportado → +5 pts por cada 10%
create or replace function award_avance_reportado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id bigint;
  v_campaign_id bigint;
  v_puntos int;
begin
  select company_id, campaign_id
  into v_company_id, v_campaign_id
  from actividades where id = new.activity_id;

  -- 5 puntos por cada 10% de avance (redondeado)
  v_puntos := (new.progress_pct / 10) * 5;

  if v_puntos > 0 then
    insert into points_log (
      company_id, user_id, action,
      points, activity_id, campaign_id
    ) values (
      v_company_id,
      new.user_id,
      'avance_reportado',
      v_puntos,
      new.activity_id,
      v_campaign_id
    );
  end if;

  return new;
end;
$$;

create trigger trg_award_avance_reportado
  after insert on activity_updates
  for each row execute function award_avance_reportado();

-- ── Trigger 3: evidencia subida → +10 pts
create or replace function award_evidencia_subida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id bigint;
begin
  select campaign_id into v_campaign_id
  from actividades where id = new.activity_id;

  insert into points_log (
    company_id, user_id, action,
    points, activity_id, campaign_id
  ) values (
    new.company_id,
    new.uploaded_by,
    'evidencia_subida',
    10,
    new.activity_id,
    v_campaign_id
  );

  return new;
end;
$$;

create trigger trg_award_evidencia_subida
  after insert on evidencias
  for each row execute function award_evidencia_subida();
