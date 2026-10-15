# Social AI Hub — Fase 0: Auditoría

> Entregable de la Fase 0 del "MAHP — SOCIAL AI HUB — MASTER IMPLEMENTATION PROMPT v1.0". Verificado contra el código y el esquema reales de este repositorio — no asumido. Última actualización: sprint de conexión de "La Casa del Centro" / verificación de App Review de Meta.

## Hallazgo principal

**Social AI Hub ya existe y está desplegado en producción.** No es un módulo nuevo por construir — es un módulo ya construido, con datos reales entrando (al menos para una de las dos empresas), pendiente de la aprobación de App Review de Meta para recibir mensajes de clientes reales fuera de modo desarrollo. Las Fases 1-8 de este prompt deben leerse como "qué extender", no "qué construir desde cero".

## A-B. Tecnologías y estructura reales

- Frontend: HTML + JS vanilla con ES modules, sin framework ni bundler (`ADR-003`). `js/shared/socialHub.js` + integración lazy-loaded en `empresa.html`/`js/empresa.js`.
- Backend: Supabase completo — Postgres + RLS + Auth + Edge Functions, sin servidor propio (`ADR-002`).
- Autenticación: Supabase Auth, roles `super_admin`/`company_admin`/`director`/`collaborator` vía `profiles.role`, cada uno con su propio dashboard (`roleHome()` en `js/supabaseClient.js`).
- Multi-empresa: por columna `company_id` + RLS, nunca schema/DB por empresa (`ADR-001`).
- IA: **Groq** (`llama-3.3-70b-versatile`), vía Edge Function proxy. No hay integración de Anthropic en este código — verificado antes de asumirlo, igual que pide este prompt en su sección 7.
- Integraciones ya existentes: Meta Graph API (Messenger, Facebook) — ver abajo.

## C. Tablas reales (v20-v23) vs. nombres propuestos en este prompt

Ninguna coincide por nombre — coinciden por función. **No crear las propuestas como tablas nuevas**: ya existe su equivalente.

| Propuesto en este prompt | Ya existe como | Diferencia relevante |
|---|---|---|
| `social_connections` | `company_meta_pages` | `company_id`, `channel`, `page_id`, `page_access_token` — sin política RLS para `authenticated` a propósito (solo `service_role` la lee) |
| `social_contacts` | `customers` + `customer_identities` | separadas a propósito: identidad unificada por cliente vs. identidad por canal (`ADR-017`) |
| `social_conversations` | `conversations` | ya incluye `ia_intencion`/`ia_sentimiento`/`ia_urgencia`/`ia_oportunidad`/`ia_explicacion`/`ia_resumen`/`assigned_to`/`assigned_reason` |
| `social_messages` | `messages` | `sender_type` `cliente`/`agente`/`ia`; idempotencia real (`unique constraint` + `upsert(..., {ignoreDuplicates:true})`, corregida tras revisión externa) |
| `ai_response_suggestions` | fila en `messages` con `sender_type='ia'` | no es tabla separada hoy — functional pero menos queryable que una tabla dedicada |
| `knowledge_base_entries` | **no existe** | genuinamente nuevo, ver abajo |
| `ai_settings` | **no existe** | genuinamente nuevo, ver abajo |
| `ai_audit_logs` | parcial (`ia_explicacion`, `assigned_reason` dan motivo visible, `ADR-014`) | no hay tabla de auditoría dedicada |

## D. Lo que de verdad es nuevo en este prompt (no construido)

1. **Base de conocimientos empresarial** (`knowledge_base_entries`, sección 6) — no existe ninguna tabla ni UI para esto.
2. **Modos de operación manual/asistido/automático configurables por empresa** (`ai_settings`, sección 9) — hoy el sistema opera siempre en el equivalente de "asistido" (la IA sugiere en `messages`, un agente humano decide enviar vía `meta-send-message`; nunca envío automático — ya es `Human-in-the-Loop` por diseño, `ADR-009`), pero no existe una tabla/UI que lo haga configurable, y no existe modo automático en absoluto.
3. **RAG contra la base de conocimientos** (pasos 4-6 de la sección 7) — hoy `analizarConIA` en `meta-webhook` manda solo el texto del cliente a Groq, sin ningún contexto de negocio recuperado.
4. **`ai_audit_logs` como tabla dedicada**, distinta de los campos de explicación ya existentes.

## E-G. Seguridad ya verificada (no asumida, probada en vivo)

- Firma `X-Hub-Signature-256` validada con comparación de tiempo constante antes de procesar cualquier payload de Meta.
- El Page Access Token nunca toca el navegador — vive solo en `company_meta_pages` (sin RLS para `authenticated`) y se lee únicamente desde `meta-send-message` con `service_role`.
- RLS activo en las 6 tablas del sprint (`customers`, `customer_identities`, `conversations`, `messages`, `conversation_tags`, `company_meta_pages`).
- Idempotencia real de mensajes entrantes (índice único + `ON CONFLICT DO NOTHING`) — corregida en v23 tras una revisión externa que encontró una ventana de carrera en la versión anterior.
- IA corre en background (`EdgeRuntime.waitUntil`) para no bloquear la respuesta al webhook y evitar reintentos duplicados de Meta.
- Etiqueta `HUMAN_AGENT` aplicada en los envíos salientes (ventana de 7 días en vez de 24h, verificado contra documentación real de Meta, no asumido).

Ningún secreto vive en archivos del repo ni en `docs/social-ai-hub/` — consistente con la sección 15 de este prompt.

## Estado real de producción (al momento de este audit)

- **"ta camaron" / Tacamaron Beny** (`company_id=1`): única página conectada en `company_meta_pages` (Facebook). App de Meta todavía "Sin publicar" — credenciales de revisor ya creadas y verificadas con Playwright (login real, pestaña Social Hub visible). Falta confirmar si los mensajes entrantes ya están aterrizando en `messages` — consulta en curso al momento de este documento.
- **"La Casa del Centro"** (`company_id=2`): **sin conectar** — cero filas en `company_meta_pages`. No es un defecto de código: es la protección multi-tenant funcionando como se diseñó (`meta-webhook` recibe el evento, no reconoce el `page_id`, lo descarta y registra `"page_id sin empresa conectada"`). Falta el Page ID + Page Access Token de esa empresa para conectarla (mismo procedimiento ya usado para Tacamaron).

## Riesgo de ejecutar este prompt tal cual, sin reconciliar

Si se crean las tablas `social_*` propuestas en paralelo a las ya existentes:
- **Split-brain de datos**: el webhook ya desplegado seguiría escribiendo en `conversations`/`messages`; cualquier código nuevo que use `social_conversations`/`social_messages` nunca vería esos datos, y viceversa.
- **Documentación fragmentada**: ya existe una serie completa y gobernada (`MIP-001`, `MPS-002-000/001/002`, `ADR-017/018/019/020`, `docs/QA/01-FLUJOS-REALES.md`) que cubre exactamente lo que `docs/social-ai-hub/01...09` propone duplicar.

## Recomendación

**No reconstruir — extender.** Las piezas genuinamente nuevas (base de conocimientos, modos de operación, auditoría dedicada) se diseñan como migraciones nuevas (`supabase_schema_v24.sql` en adelante) relacionadas a las tablas ya existentes, y se documentan dentro de la serie ya establecida (ej. un `MPS-002-003`) en vez de bajo `docs/social-ai-hub/`. Esta carpeta queda como el punto de entrada que este prompt específico esperaba, igual que se hizo con `docs/ARCHITECTURE/` en el sprint de agentes — un índice honesto, no una fuente de verdad paralela.

## Plan técnico propuesto (pendiente de tu aprobación — Fase 0 termina aquí)

1. Cerrar lo que ya estaba en curso: conectar "La Casa del Centro", confirmar que los mensajes de Tacamaron llegan a `messages`.
2. Diseñar `knowledge_base_entries` + RLS aislada por empresa (sección 6).
3. Diseñar `ai_settings` — modo manual/asistido/automático por empresa, default nunca automático (sección 9, ya alineado con `ADR-009`).
4. Extender `analizarConIA` en `meta-webhook` para incluir contexto recuperado de la base de conocimientos antes de llamar a Groq (RAG simple).
5. Evaluar si `ia_explicacion`/`assigned_reason` ya cubren la sección 12 de auditoría, o si de verdad hace falta `ai_audit_logs` como tabla dedicada.
6. Pruebas con Playwright (ya instalado, Fase 2 del sprint de agentes) para los casos de la sección 14 que apliquen a lo nuevo.

No se toca esquema ni código hasta que apruebes este plan — tal como pide la sección 18 de este prompt.
