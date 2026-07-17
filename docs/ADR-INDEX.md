# ADR INDEX — Architecture Decision Records de MAHP

> Historial de decisiones arquitectónicas — el *por qué*, no el *qué* (eso
> vive en los MDS) ni una *capacidad compartida* (eso es un CCEC). Un ADR
> se escribe cuando se toma una decisión con alternativas reales
> descartadas, para que esa razón no se pierda con el tiempo.
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

Los primeros 8 ADR documentan decisiones ya vigentes en producción (retroactivos). Desde `ADR-009`, la serie es **prospectiva** — decisiones tomadas al mismo tiempo que se documentan, no reconstruidas después.

**Nota sobre `ADR-011`**: `MPS-002-000-PRODUCT-CONSTITUTION.md` §8 reservó ese número para "la IA asistirá al usuario; las acciones críticas requerirán aprobación humana" — pero esa decisión ya está registrada de forma absoluta (`ADR-007`, `ADR-009`, `PROJECT-BLUEPRINT.md` §5 principio 3) y no tenía contenido nuevo específico de Social AI Hub que justificara un archivo propio. Se documenta el salto aquí en vez de crear un ADR duplicado solo para no dejar un hueco en la numeración — mismo criterio de "no duplicar" aplicado a esta serie.
