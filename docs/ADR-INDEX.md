# ADR INDEX — Architecture Decision Records de MAHP

> Historial de decisiones arquitectónicas — el *por qué*, no el *qué* (eso
> vive en los MDS) ni una *capacidad compartida* (eso es un CCEC). Un ADR
> se escribe cuando se toma una decisión con alternativas reales
> descartadas, para que esa razón no se pierda con el tiempo. CCEC =
> **Cross-Cutting Enterprise Capabilities**, definición oficial resuelta
> en `MES-001-ENGINEERING-CONSTITUTION.md` §5 (decisión del Product
> Owner, 2026-07-12).
>
> Origen: hallazgo de `11-ENTERPRISE-PRODUCT-STRATEGY.md` §14 (MDS-012) —
> la serie no existía hasta esta fecha, aunque decisiones arquitectónicas
> significativas ya se habían tomado y documentado (dispersas) desde
> MDS-002 en adelante. Estos primeros 8 ADR son **retroactivos**: capturan
> el razonamiento de decisiones ya tomadas, reconstruido a partir de la
> evidencia ya existente en `/docs` — no decisiones nuevas.
>
> Última actualización: 2026-07-12.

---

## Plantilla

Todo ADR nuevo sigue este formato:

```
# ADR-NNN — Título de la decisión

Estado: Propuesto / Aceptado / Reemplazado por ADR-XXX / Obsoleto
Fecha: AAAA-MM-DD
Decisores: (quién)

## Contexto
¿Qué problema forzaba a decidir algo?

## Decisión
¿Qué se decidió, en una frase clara?

## Alternativas consideradas
¿Qué otras opciones había, y por qué se descartaron?

## Consecuencias
¿Qué se gana? ¿Qué se sacrifica o queda pendiente por esta decisión?

## Referencias
Documentos MDS/CCEC donde esta decisión ya vive aplicada.
```

## Regla de gobierno

Un ADR **nunca se edita para cambiar la decisión** una vez `Aceptado` — si la decisión cambia, se escribe un ADR nuevo que la reemplaza, y el antiguo se marca `Reemplazado por ADR-XXX`, conservando su razonamiento original íntegro (mismo principio que `supabase_schema_vN.sql` nunca se edita una vez aplicado, `07C-DATABASE-STANDARDS.md` §2).

## Catálogo

| ADR | Título | Estado |
|---|---|---|
| [ADR-001](ADR-001-multi-tenant-por-columna.md) | Multi-tenancy por columna (`company_id`) + RLS, no schema/DB por empresa | Aceptado |
| [ADR-002](ADR-002-supabase-como-backend-completo.md) | Supabase como backend completo, sin servidor propio | Aceptado |
| [ADR-003](ADR-003-frontend-vanilla-sin-framework.md) | Frontend vanilla JS sin framework/bundler + GitHub Pages | Aceptado |
| [ADR-004](ADR-004-esquema-versionado-por-archivo.md) | Esquema versionado por archivo SQL secuencial, sin migraciones automatizadas | Aceptado |
| [ADR-005](ADR-005-soft-delete-por-defecto.md) | Soft delete como comportamiento por defecto, borrado físico exclusivo de `super_admin` | Aceptado |
| [ADR-006](ADR-006-security-definer-para-identidad.md) | Funciones `security definer` como patrón de resolución de identidad en RLS | Aceptado |
| [ADR-007](ADR-007-ia-via-edge-function-proxy.md) | IA vía Edge Function proxy, nunca API key en el cliente | Aceptado |
| [ADR-008](ADR-008-cola-sobre-postgres-pg-cron.md) | Cola de eventos/automatización sobre Postgres + `pg_cron`, sin broker externo | Aceptado |
| [ADR-009](ADR-009-social-ai-hub-modulo-nativo.md) | Social AI Hub es un módulo nativo del ecosistema MAHP, no un componente aislado | Aceptado |
| [ADR-010](ADR-010-meta-primer-canal-arquitectura-channel-agnostic.md) | Meta Graph API es el primer canal de Social AI Hub; el núcleo del módulo es channel-agnostic | Aceptado |
| ADR-011 | *(no existe como archivo — ver nota abajo)* | — |
| [ADR-012](ADR-012-conversaciones-como-activos-de-negocio.md) | Las conversaciones son activos de negocio que alimentan CRM ligero/Analytics/Automatizaciones, respetando permisos y privacidad | Aceptado |
| [ADR-013](ADR-013-cie-cadena-de-eventos-no-motor-paralelo.md) | El Conversation Intelligence Engine es una cadena de eventos sobre el motor de workflows existente, no un motor de IA/reglas independiente | Aceptado |
| [ADR-014](ADR-014-explainable-ai-obligatorio.md) | Ninguna clasificación, priorización o recomendación de IA se aplica sin un campo de explicación (motivo) visible | Aceptado |
| [ADR-015](ADR-015-aprendizaje-sin-entrenamiento-propietario.md) | El Motor de Aprendizaje del CIE no entrena modelos propietarios; mejora por ajuste humano de reglas y prompts | Aceptado |
| [ADR-016](ADR-016-progressive-infrastructure-strategy.md) | Progressive Infrastructure Strategy: una capacidad documentada como `Designed`/`Planned` no es una inconsistencia | Aceptado |
| [ADR-017](ADR-017-unified-customer-identity-model.md) | Unified Customer Identity Model: un cliente, múltiples identidades digitales | Aceptado |
| [ADR-018](ADR-018-ai-assisted-tagging.md) | AI Assisted Tagging: etiquetas con niveles de confianza (`Suggested`→`Confirmed`→`Locked`) | Aceptado |
| [ADR-019](ADR-019-intelligent-conversation-routing.md) | Intelligent Conversation Routing: transferencia automática basada en reglas, nunca solo en inactividad | Aceptado |
| [ADR-020](ADR-020-mahp-lightweight-crm-boundary.md) | MAHP Lightweight CRM Boundary: límite funcional permanente del CRM ligero | Aceptado |

Los primeros 8 ADR documentan decisiones ya vigentes en producción (retroactivos). Desde `ADR-009`, la serie es **prospectiva** — decisiones tomadas al mismo tiempo que se documentan, no reconstruidas después. `ADR-013` a `ADR-015` nacieron como propuestas en el Entregable Final de `MPS-002-001`. `ADR-016` nació de una tensión detectada durante la revisión de `MES-001-ENGINEERING-CONSTITUTION.md`. `ADR-017` a `ADR-020` nacieron de 3 decisiones pendientes señaladas en `MPS-002-002-FUNCTIONAL-SPECIFICATION.md` (identidad de cliente, etiquetado, enrutamiento) más una cuarta propuesta directamente por el Product Owner para formalizar el límite de CRM ligero como principio permanente — todas aceptadas en la misma ronda de decisiones. Mismo flujo en los cinco casos: propuesta en un Entregable Final o señalada por el Product Owner → aprobación explícita → creación del archivo.

**Nota sobre `ADR-011`**: `MPS-002-000-PRODUCT-CONSTITUTION.md` §8 reservó ese número para "la IA asistirá al usuario; las acciones críticas requerirán aprobación humana" — pero esa decisión ya está registrada de forma absoluta (`ADR-007`, `ADR-009`, `PROJECT-BLUEPRINT.md` §5 principio 3) y no tenía contenido nuevo específico de Social AI Hub que justificara un archivo propio. Se documenta el salto aquí en vez de crear un ADR duplicado solo para no dejar un hueco en la numeración — mismo criterio de "no duplicar" aplicado a esta serie.

**Nota sobre numeración de `ADR-017`–`020`**: el Product Owner los propuso originalmente como "ADR-010" a "ADR-013" — números ya ocupados por decisiones previas de esta misma serie. Se renumeraron a los siguientes disponibles (017–020) sin cambiar su contenido ni intención; señalado aquí para que quede explícito, no corregido en silencio.
