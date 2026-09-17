-- ============================================================
-- Esquema v21: Social AI Hub — mapeo de páginas de Meta por empresa
--
-- Requiere que supabase_schema_v20.sql ya esté aplicado.
--
-- Resuelve el hallazgo de la revisión de Fase 2: el webhook de Meta
-- entrega un page_id (o instagram business account id) por evento,
-- nunca un company_id — sin esta tabla, el webhook no tiene forma
-- confiable de saber a qué empresa pertenece un mensaje entrante, y
-- MAHP es multi-tenant por diseño (ADR-001). Cada empresa conecta su
-- propia página y guarda su propio Page Access Token aquí.
--
-- El token es un secreto (mismo nivel que una API key, ADR-007 /
-- CLAUDE.md §5): esta tabla NO tiene ninguna política RLS para el
-- rol `authenticated` a propósito — ni siquiera company_admin puede
-- leerla desde el navegador. Solo la Edge Function, usando
-- SUPABASE_SERVICE_ROLE_KEY (que ignora RLS), la lee. Conectar una
-- página nueva es, por ahora, una fila insertada manualmente por
-- super_admin vía SQL — un flujo de auto-conexión desde la UI es una
-- funcionalidad aparte, no construida todavía porque no se ha pedido.
--
-- Ejecutar completo en el SQL Editor de Supabase.
-- ============================================================

create table company_meta_pages (
  id                bigint generated always as identity primary key,
  company_id        bigint not null references companies(id)
                      on delete cascade,
  channel           text not null check (channel in ('facebook','instagram')),
  page_id           text not null,          -- Page ID / IG Business Account ID
  page_access_token text not null,          -- secreto — nunca expuesto al cliente
  page_name         text,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (channel, page_id)
);

alter table company_meta_pages enable row level security;

-- Sin política para `authenticated`: RLS deniega todo por defecto.
-- Solo el service role (Edge Function) puede leer/escribir esta tabla.
