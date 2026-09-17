-- ============================================================
-- Esquema v20: Social AI Hub — identidad de cliente, conversaciones,
-- mensajes y etiquetado con confianza.
--
-- Esta es la Fase 1 del sprint "Social AI Hub", planteada originalmente
-- como v17 (ya ocupado por el fix de follower_logs del 9-jul) y
-- rediseñada para alinearse con la arquitectura ya aprobada en
-- /docs en vez de un modelo plano ad-hoc:
--
--   ADR-017 — identidad unificada de cliente, múltiples canales
--             (tabla customers + customer_identities, no un solo
--             campo meta_sender_id suelto en conversations)
--   ADR-018 — etiquetas con niveles de confianza
--             Suggested → Confirmed → Locked (tabla conversation_tags,
--             no un text[] plano)
--   ADR-014 — IA explicable: ninguna clasificación de IA sin motivo
--             visible (ia_explicacion, forzado por check constraint)
--   ADR-020 — CRM ligero: customers.tipo es una clasificación simple
--             (lead/cliente/recurrente/perdido), nunca un pipeline
--             de etapas de negociación
--
-- Fuera de alcance en v20, a propósito (no construir por anticipación):
--   - Vinculación automática de identidades entre canales: no
--     diseñada todavía (MPS-002-002 §3, "pendiente para MPS-002-003").
--     Cada identidad de canal resuelve 1:1 a un customer nuevo salvo
--     fusión manual humana.
--   - Enrutamiento automático por reglas (ADR-019): solo asignación
--     manual en v20 (assigned_to + assigned_reason). El motor de
--     reglas se construye cuando haya demanda real, no antes.
--
-- Ejecutar completo en el SQL Editor de Supabase.
-- ============================================================

-- ── Clientes: identidad unificada (ADR-017) ──────────────
create table customers (
  id                bigint generated always as identity primary key,
  company_id        bigint not null references companies(id)
                      on delete cascade,
  full_name         text,
  email             text,
  phone             text,
  tipo              text not null default 'lead'
                    check (tipo in
                      ('lead','cliente','recurrente','perdido')),
  notas             text,
  ultimo_contacto   timestamptz,
  proximo_followup  timestamptz,
  created_at        timestamptz not null default now()
);

alter table customers enable row level security;

create policy "customers_select" on customers
  for select to authenticated
  using (
    my_role() = 'super_admin'
    or company_id = my_company_id()
  );

create policy "customers_write" on customers
  for all to authenticated
  using (
    my_role() = 'super_admin'
    or company_id = my_company_id()
  )
  with check (
    my_role() = 'super_admin'
    or company_id = my_company_id()
  );

-- ── Identidades de canal de un cliente (ADR-017) ─────────
-- Un customer puede tener varias filas aquí (una por canal). La
-- fusión de dos customers en uno (cuando se detecta manualmente que
-- son la misma persona) es una acción humana explícita, no automática.
create table customer_identities (
  id            bigint generated always as identity primary key,
  customer_id   bigint not null references customers(id)
                  on delete cascade,
  company_id    bigint not null references companies(id)
                  on delete cascade,
  channel       text not null check (channel in ('facebook','instagram')),
  external_id   text not null,  -- meta_sender_id
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  unique (company_id, channel, external_id)
);

alter table customer_identities enable row level security;

create policy "customer_identities_select" on customer_identities
  for select to authenticated
  using (
    my_role() = 'super_admin'
    or company_id = my_company_id()
  );

create policy "customer_identities_write" on customer_identities
  for all to authenticated
  using (
    my_role() = 'super_admin'
    or company_id = my_company_id()
  )
  with check (
    my_role() = 'super_admin'
    or company_id = my_company_id()
  );

-- ── Conversaciones ────────────────────────────────────────
create table conversations (
  id              bigint generated always as identity primary key,
  company_id      bigint not null references companies(id)
                    on delete cascade,
  customer_id     bigint references customers(id) on delete set null,
  meta_thread_id  text not null,
  channel         text not null check (channel in ('facebook','instagram')),
  status          text not null default 'nuevo'
                  check (status in ('nuevo','en_atencion','resuelto')),
  assigned_to     uuid references profiles(id),
  assigned_reason text,  -- motivo visible de la asignación (manual en v20)
  -- Análisis IA — ADR-014: ninguna clasificación sin motivo visible
  ia_intencion    text,
  ia_sentimiento  text,
  ia_urgencia     text,
  ia_oportunidad  int,
  ia_resumen      text,
  ia_explicacion  text,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (company_id, meta_thread_id),
  check (ia_intencion is null or ia_explicacion is not null)
);

alter table conversations enable row level security;

create policy "conversations_select" on conversations
  for select to authenticated
  using (
    my_role() = 'super_admin'
    or company_id = my_company_id()
  );

create policy "conversations_write" on conversations
  for all to authenticated
  using (
    my_role() = 'super_admin'
    or company_id = my_company_id()
  )
  with check (
    my_role() = 'super_admin'
    or company_id = my_company_id()
  );

-- ── Mensajes ──────────────────────────────────────────────
create table messages (
  id              bigint generated always as identity primary key,
  conversation_id bigint not null references conversations(id)
                    on delete cascade,
  company_id      bigint not null references companies(id)
                    on delete cascade,
  direction       text not null
                  check (direction in ('inbound','outbound')),
  sender_type     text not null
                  check (sender_type in ('cliente','agente','ia')),
  sender_id       text,        -- meta_sender_id o profile uuid
  content         text not null,
  message_type    text not null default 'text'
                  check (message_type in
                    ('text','image','video','audio','file')),
  media_url       text,
  meta_message_id text,
  sent_at         timestamptz not null default now()
);

alter table messages enable row level security;

create policy "messages_select" on messages
  for select to authenticated
  using (
    my_role() = 'super_admin'
    or company_id = my_company_id()
  );

create policy "messages_insert" on messages
  for insert to authenticated
  with check (
    my_role() = 'super_admin'
    or company_id = my_company_id()
  );

-- ── Etiquetas con niveles de confianza (ADR-018) ─────────
create table conversation_tags (
  id               bigint generated always as identity primary key,
  conversation_id  bigint not null references conversations(id)
                     on delete cascade,
  company_id       bigint not null references companies(id)
                     on delete cascade,
  tag              text not null,
  confidence_state text not null default 'suggested'
                   check (confidence_state in
                     ('suggested','confirmed','locked')),
  source           text not null check (source in ('ia','human')),
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now()
);

alter table conversation_tags enable row level security;

create policy "conversation_tags_select" on conversation_tags
  for select to authenticated
  using (
    my_role() = 'super_admin'
    or company_id = my_company_id()
  );

create policy "conversation_tags_write" on conversation_tags
  for all to authenticated
  using (
    my_role() = 'super_admin'
    or company_id = my_company_id()
  )
  with check (
    my_role() = 'super_admin'
    or company_id = my_company_id()
  );

-- ── Trigger: actualizar last_message_at ──────────────────
create or replace function update_conversation_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update conversations
  set last_message_at = new.sent_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger trg_update_conv_timestamp
  after insert on messages
  for each row
  execute function update_conversation_timestamp();
