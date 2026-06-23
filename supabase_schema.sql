create table actividades (
  id bigint generated always as identity primary key,
  titulo text not null,
  canal text not null,
  fecha date not null,
  color text not null,
  created_at timestamptz not null default now()
);

alter table actividades enable row level security;

create policy "Acceso publico anon" on actividades
  for all
  to anon
  using (true)
  with check (true);
