-- ============================================================
-- Esquema v14: metas de seguidores por canal
-- Ejecutar completo en el SQL Editor de Supabase.
-- ============================================================

create table follower_goals (
  id          bigint generated always as identity primary key,
  company_id  bigint not null references companies(id) on delete cascade,
  channel_id  bigint not null references social_channels(id) on delete cascade,
  campaign_id bigint references campaigns(id) on delete set null,
  goal_total  bigint not null check (goal_total > 0),
  goal_gain   bigint not null check (goal_gain > 0),
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now(),
  -- Solo una meta activa por canal por empresa
  unique (company_id, channel_id)
);

alter table follower_goals enable row level security;

-- Lectura: toda la empresa puede ver las metas
create policy "follower_goals_select" on follower_goals
  for select to authenticated
  using (my_role() = 'super_admin' or company_id = my_company_id());

-- Solo admin y director pueden crear/editar metas
create policy "follower_goals_insert" on follower_goals
  for insert to authenticated
  with check (
    my_role() = 'super_admin'
    or (
      my_role() in ('company_admin', 'director')
      and company_id = my_company_id()
    )
  );

create policy "follower_goals_update" on follower_goals
  for update to authenticated
  using (
    my_role() = 'super_admin'
    or (
      my_role() in ('company_admin', 'director')
      and company_id = my_company_id()
    )
  )
  with check (
    my_role() = 'super_admin'
    or (
      my_role() in ('company_admin', 'director')
      and company_id = my_company_id()
    )
  );

create policy "follower_goals_delete" on follower_goals
  for delete to authenticated
  using (
    my_role() = 'super_admin'
    or (
      my_role() in ('company_admin', 'director')
      and company_id = my_company_id()
    )
  );

-- Vista: avance actual vs metas por canal
-- Une follower_totals con follower_goals para calcular
-- el % de avance hacia cada meta
create or replace view follower_goals_progress as
select
  fg.id            as goal_id,
  fg.company_id,
  fg.channel_id,
  sc.name          as channel_name,
  sc.icon          as channel_icon,
  fg.goal_total,
  fg.goal_gain,
  fg.campaign_id,
  coalesce(ft.total_actual, 0) as total_actual,
  -- Ganancia real desde el inicio de la campaña
  coalesce(
    (select sum(fl.delta)
     from follower_logs fl
     where fl.channel_id = fg.channel_id
       and fl.company_id = fg.company_id),
    0
  ) as gain_actual,
  -- % hacia meta total
  case when fg.goal_total > 0
    then least(100, round(
      coalesce(ft.total_actual, 0) * 100.0 / fg.goal_total
    ))
    else 0
  end as pct_total,
  -- % hacia ganancia esperada
  case when fg.goal_gain > 0
    then least(100, round(
      coalesce(
        (select sum(fl.delta)
         from follower_logs fl
         where fl.channel_id = fg.channel_id
           and fl.company_id = fg.company_id),
        0
      ) * 100.0 / fg.goal_gain
    ))
    else 0
  end as pct_gain
from follower_goals fg
join social_channels sc on sc.id = fg.channel_id
left join follower_totals ft
  on ft.channel_id = fg.channel_id
  and ft.company_id = fg.company_id;
