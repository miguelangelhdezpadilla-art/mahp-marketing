-- ============================================================
-- Esquema v6: estrategias directivas (Fase 11)
-- Ejecutar completo en el SQL Editor de Supabase (de una sola vez).
-- ============================================================

create table strategies (
  id bigint generated always as identity primary key,
  company_id bigint not null references companies(id),
  created_by uuid references profiles(id),
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table strategies enable row level security;

create policy "strategies_select" on strategies
  for select to authenticated
  using (my_role() = 'super_admin' or company_id = my_company_id());

create policy "strategies_write" on strategies
  for all to authenticated
  using (my_role() = 'super_admin' or (my_role() = 'company_admin' and company_id = my_company_id()))
  with check (my_role() = 'super_admin' or (my_role() = 'company_admin' and company_id = my_company_id()));
