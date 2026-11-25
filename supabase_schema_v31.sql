-- ============================================================
-- MAHP — Esquema v31: base de conocimientos, asistente y modos
-- (MPS-002-004 E4–E6, ADR-022)
-- ============================================================
-- Qué agrega (aditiva: no borra ni cambia datos existentes):
--   1. Extensiones unaccent y pg_trgm (búsqueda en español sin acentos
--      y tolerante a faltas de ortografía). Decisión del Product Owner
--      (2026-11-25): búsqueda de texto, no semántica (sin proveedor de
--      embeddings).
--   2. knowledge_entries: lo que la empresa le enseña a su asistente.
--   3. match_knowledge(): búsqueda filtrada por empresa y vigencia,
--      solo service role (ADR-022 salvaguardas 6 y 10).
--   4. ai_assistants: modo (manual / asistido / automático), umbral,
--      mensaje de transferencia, pausa de emergencia.
--      Las empresas existentes quedan en 'asistido' (lo que hacen hoy);
--      las nuevas nacen en 'manual'. Ninguna queda en 'automatico'.
--   5. ai_set_mode / ai_set_auto_pause: activar el automático exige
--      company_admin y requisitos previos (salvaguardas 2 y 3).
--   6. conversations.ai_paused: pausa por conversación (escalamiento).
--
-- Requiere v28. Ejecutar completo, de una sola vez.
-- ============================================================

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- unaccent no es immutable (depende del diccionario); este envoltorio
-- fija el diccionario para poder usarlo en columnas generadas e índices.
create or replace function f_unaccent(t text)
returns text language sql immutable parallel safe strict
set search_path = public, extensions as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, t)
$$;

-- ----------------------------------------------------------------
-- 1. Base de conocimientos
-- ----------------------------------------------------------------
create table knowledge_entries (
  id           bigint generated always as identity primary key,
  company_id   bigint not null references companies(id) on delete cascade,
  kind         text not null default 'faq'
               check (kind in ('negocio','horario','producto','servicio','promocion','faq','politica')),
  title        text not null check (char_length(title) between 2 and 200),
  body         text not null check (char_length(body) between 2 and 3000),
  status       text not null default 'borrador' check (status in ('borrador','publicado','archivado')),
  valid_from   timestamptz,
  valid_until  timestamptz,
  published_at timestamptz,
  created_by   uuid references profiles(id) on delete set null,
  updated_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  texto_norm   text generated always as (lower(f_unaccent(title || ' ' || body))) stored,
  fts          tsvector generated always as (
                 setweight(to_tsvector('spanish', f_unaccent(title)), 'A') ||
                 setweight(to_tsvector('spanish', f_unaccent(body)), 'B')) stored,
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create index knowledge_entries_company_idx on knowledge_entries (company_id) where deleted_at is null;
create index knowledge_entries_fts_idx on knowledge_entries using gin (fts);
create index knowledge_entries_trgm_idx on knowledge_entries using gin (texto_norm extensions.gin_trgm_ops);

alter table knowledge_entries enable row level security;

-- Lectura: miembros con gestión (admin y director) y super_admin.
create policy "knowledge_select" on knowledge_entries
  for select to authenticated
  using (my_role() = 'super_admin'
         or (company_id = my_company_id() and my_role() in ('company_admin','director')));

-- Escritura: company_admin de su empresa, o super_admin.
create policy "knowledge_insert" on knowledge_entries
  for insert to authenticated
  with check (my_role() = 'super_admin'
              or (company_id = my_company_id() and my_role() = 'company_admin'));
create policy "knowledge_update" on knowledge_entries
  for update to authenticated
  using (my_role() = 'super_admin'
         or (company_id = my_company_id() and my_role() = 'company_admin'))
  with check (my_role() = 'super_admin'
              or (company_id = my_company_id() and my_role() = 'company_admin'));
-- Sin delete: se borra con deleted_at (queda el historial).
revoke delete on knowledge_entries from anon, authenticated;
revoke all on knowledge_entries from anon;

-- ----------------------------------------------------------------
-- 2. Asistente por empresa
-- ----------------------------------------------------------------
create table ai_assistants (
  company_id                    bigint primary key references companies(id) on delete cascade,
  mode                          text not null default 'manual'
                                check (mode in ('manual','asistido','automatico')),
  min_confidence                numeric(3,2) not null default 0.80 check (min_confidence between 0.50 and 1.00),
  max_auto_per_conversation_hour int not null default 3 check (max_auto_per_conversation_hour between 1 and 20),
  handoff_message               text check (handoff_message is null or char_length(handoff_message) <= 500),
  auto_paused_at                timestamptz,
  auto_paused_by                uuid references profiles(id) on delete set null,
  knowledge_changed_at          timestamptz,
  last_playground_at            timestamptz,
  activated_by                  uuid references profiles(id) on delete set null,
  activated_at                  timestamptz,
  updated_by                    uuid references profiles(id) on delete set null,
  updated_at                    timestamptz not null default now()
);

-- Empresas existentes: siguen como hoy (sugerencias con revisión humana).
insert into ai_assistants (company_id, mode)
select id, 'asistido' from companies
on conflict (company_id) do nothing;

create or replace function ai_assistants_for_new_company()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into ai_assistants (company_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger companies_ai_assistant_insert
  after insert on companies
  for each row execute function ai_assistants_for_new_company();

alter table ai_assistants enable row level security;

create policy "ai_assistants_select" on ai_assistants
  for select to authenticated
  using (my_role() = 'super_admin'
         or (company_id = my_company_id() and my_role() in ('company_admin','director')));

-- Solo el umbral, el tope y el mensaje de transferencia se editan
-- directo; modo y pausa pasan por las funciones de abajo.
create policy "ai_assistants_update" on ai_assistants
  for update to authenticated
  using (my_role() = 'super_admin'
         or (company_id = my_company_id() and my_role() = 'company_admin'))
  with check (my_role() = 'super_admin'
              or (company_id = my_company_id() and my_role() = 'company_admin'));
revoke insert, delete on ai_assistants from anon, authenticated;
revoke update on ai_assistants from authenticated;
grant update (min_confidence, max_auto_per_conversation_hour, handoff_message) on ai_assistants to authenticated;
revoke all on ai_assistants from anon;

-- Cambiar el conocimiento publicado obliga a volver a probar antes de
-- activar el automático (salvaguarda 3).
create or replace function knowledge_entries_touch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  end if;
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if new.status = 'publicado' and (tg_op = 'INSERT' or old.status is distinct from 'publicado') then
    new.published_at := now();
  end if;
  if new.status = 'publicado' or (tg_op = 'UPDATE' and old.status = 'publicado') then
    update ai_assistants set knowledge_changed_at = now() where company_id = new.company_id;
  end if;
  return new;
end $$;

create trigger knowledge_entries_touch
  before insert or update on knowledge_entries
  for each row execute function knowledge_entries_touch();

-- ----------------------------------------------------------------
-- 3. Búsqueda (solo service role)
-- ----------------------------------------------------------------
-- Une los términos del mensaje con OR (una pregunta rara vez repite
-- todas las palabras de la respuesta) y suma la similitud por
-- trigramas para tolerar faltas de ortografía. company_id y la regla
-- de vigencia se aplican aquí, no en el prompt.
create or replace function match_knowledge(p_company_id bigint, p_query text, p_k int default 5)
returns table (id bigint, kind text, title text, body text, score real)
language sql stable security definer set search_path = public, extensions as $$
  with q as (
    select lower(f_unaccent(coalesce(p_query, ''))) as norm,
           -- Los lexemas ya vienen normalizados: se arma el tsquery sin
           -- volver a pasarlos por el diccionario.
           (select string_agg(quote_literal(lexeme), ' | ')::tsquery
              from unnest(to_tsvector('spanish', f_unaccent(coalesce(p_query, ''))))) as tsq
  )
  select k.id, k.kind, k.title, k.body,
         (coalesce(ts_rank_cd(k.fts, q.tsq), 0) + word_similarity(q.norm, k.texto_norm))::real as score
  from knowledge_entries k, q
  where k.company_id = p_company_id
    and k.status = 'publicado'
    and k.deleted_at is null
    and (k.valid_from is null or k.valid_from <= now())
    and (k.valid_until is null or k.valid_until > now())
    and ((q.tsq is not null and k.fts @@ q.tsq) or word_similarity(q.norm, k.texto_norm) > 0.4)
  order by score desc
  limit least(greatest(p_k, 1), 10);
$$;

revoke execute on function match_knowledge(bigint, text, int) from public, anon, authenticated;
grant execute on function match_knowledge(bigint, text, int) to service_role;

-- ----------------------------------------------------------------
-- 4. Modo y pausa
-- ----------------------------------------------------------------
create or replace function ai_puede_gestionar(p_company_id bigint, p_solo_admin boolean)
returns boolean language sql stable security definer set search_path = public as $$
  select my_role() = 'super_admin'
      or (p_company_id = my_company_id()
          and my_role() = any (case when p_solo_admin then array['company_admin'] else array['company_admin','director'] end));
$$;
revoke execute on function ai_puede_gestionar(bigint, boolean) from public, anon;

-- Devuelve null si se aplicó; si no, el motivo en español.
create or replace function ai_set_mode(p_company_id bigint, p_mode text)
returns text language plpgsql security definer set search_path = public as $$
declare
  a ai_assistants%rowtype;
  faltan text[] := '{}';
begin
  if p_mode not in ('manual','asistido','automatico') then return 'Modo no válido.'; end if;
  if not ai_puede_gestionar(p_company_id, true) then return 'No tienes permiso para cambiar el modo.'; end if;
  select * into a from ai_assistants where company_id = p_company_id for update;
  if not found then return 'La empresa no tiene asistente configurado.'; end if;

  if p_mode = 'automatico' then
    -- Salvaguarda 2: lo activa la empresa, no MAHP.
    if my_role() <> 'company_admin' then
      return 'Solo el administrador de la empresa puede activar las respuestas automáticas.';
    end if;
    -- Salvaguarda 3: requisitos previos.
    if not exists (select 1 from company_meta_pages where company_id = p_company_id and active) then
      faltan := array_append(faltan, 'conectar Facebook o Instagram');
    end if;
    if not exists (select 1 from knowledge_entries where company_id = p_company_id and kind = 'negocio'
                   and status = 'publicado' and deleted_at is null) then
      faltan := array_append(faltan, 'publicar la información general del negocio');
    end if;
    if not exists (select 1 from knowledge_entries where company_id = p_company_id and kind = 'horario'
                   and status = 'publicado' and deleted_at is null) then
      faltan := array_append(faltan, 'publicar el horario de atención');
    end if;
    if coalesce(btrim(a.handoff_message), '') = '' then
      faltan := array_append(faltan, 'escribir el mensaje de transferencia a una persona');
    end if;
    if a.last_playground_at is null or (a.knowledge_changed_at is not null and a.last_playground_at < a.knowledge_changed_at) then
      faltan := array_append(faltan, 'probar el asistente después del último cambio de información');
    end if;
    if array_length(faltan, 1) > 0 then
      return 'Antes de activar falta: ' || array_to_string(faltan, '; ') || '.';
    end if;
  end if;

  update ai_assistants
     set mode = p_mode, updated_by = auth.uid(), updated_at = now(),
         activated_by = case when p_mode = 'automatico' then auth.uid() else activated_by end,
         activated_at = case when p_mode = 'automatico' then now() else activated_at end
   where company_id = p_company_id;

  insert into audit_log (actor_id, company_id, action, target_type, target_id, details)
  values (auth.uid(), p_company_id, 'ai_modo_cambiado', 'ai_assistants', p_company_id::text,
          jsonb_build_object('antes', a.mode, 'despues', p_mode));
  return null;
end $$;

-- Pausar: admin o director (y super_admin). Reanudar: admin (y super_admin).
create or replace function ai_set_auto_pause(p_company_id bigint, p_pausar boolean)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not ai_puede_gestionar(p_company_id, not p_pausar) then
    return case when p_pausar then 'No tienes permiso para pausar.' else 'Solo el administrador puede reanudar.' end;
  end if;
  update ai_assistants
     set auto_paused_at = case when p_pausar then now() else null end,
         auto_paused_by = case when p_pausar then auth.uid() else null end,
         updated_at = now(), updated_by = auth.uid()
   where company_id = p_company_id;
  if not found then return 'La empresa no tiene asistente configurado.'; end if;
  insert into audit_log (actor_id, company_id, action, target_type, target_id, details)
  values (auth.uid(), p_company_id, case when p_pausar then 'ai_pausa_emergencia' else 'ai_reanudado' end,
          'ai_assistants', p_company_id::text, null);
  return null;
end $$;

revoke execute on function ai_set_mode(bigint, text) from public, anon;
revoke execute on function ai_set_auto_pause(bigint, boolean) from public, anon;
grant execute on function ai_set_mode(bigint, text) to authenticated;
grant execute on function ai_set_auto_pause(bigint, boolean) to authenticated;

-- ----------------------------------------------------------------
-- 5. Pausa por conversación (escalamiento a humano)
-- ----------------------------------------------------------------
alter table conversations add column if not exists ai_paused boolean not null default false;
alter table conversations add column if not exists ai_paused_reason text;

-- Al resolver la conversación, la IA vuelve a poder responder en ella.
create or replace function conversations_ai_unpause_on_resolve()
returns trigger language plpgsql as $$
begin
  if new.status = 'resuelto' and old.status is distinct from 'resuelto' then
    new.ai_paused := false;
    new.ai_paused_reason := null;
  end if;
  return new;
end $$;

create trigger conversations_ai_unpause_on_resolve
  before update of status on conversations
  for each row execute function conversations_ai_unpause_on_resolve();

-- ----------------------------------------------------------------
-- Verificación
-- ----------------------------------------------------------------
select json_build_object(
  'asistentes', (select json_agg(json_build_object('c', company_id, 'modo', mode)) from ai_assistants),
  'rls', (select json_agg(relname) from pg_class where relname in ('knowledge_entries','ai_assistants') and relrowsecurity),
  'funciones', (select json_agg(proname) from pg_proc where proname in ('match_knowledge','ai_set_mode','ai_set_auto_pause','f_unaccent'))
);
