# SUCCESS METRICS — Indicadores Estratégicos

> MDS-012, Documento 9 de 10. Crecimiento de clientes, retención, churn,
> MRR, ARR, NPS, activación, adopción de funcionalidades, uso de IA,
> tiempo ahorrado, disponibilidad, satisfacción del cliente. Consolida el
> nivel estratégico — los KPIs técnicos/operativos detallados ya viven en
> cada MDS/CCEC (`CCEC-004A-METRICS-AND-DASHBOARDS.md` es el mecanismo,
> este documento define qué mirar al nivel de negocio).
>
> **Ninguna cifra de este documento es una meta comprometida** — son las
> definiciones y el mecanismo de medición; los números objetivo se fijan
> con datos reales, no se fabrican aquí (`CLAUDE.md` §6).
>
> Última actualización: 2026-07-12.

---

## 1. Métricas comerciales

| Métrica | Definición | Estado de medición hoy |
|---|---|---|
| Clientes activos | Empresas con `active = true` y uso reciente | Medible hoy (`companies`, `07E-ENTITY-CATALOG.md`) |
| MRR (Monthly Recurring Revenue) | Ingreso recurrente mensual | No medible — depende de `10B-SUBSCRIPTION-AND-LICENSING.md`, no construido |
| ARR (Annual Recurring Revenue) | MRR × 12, ajustado por contratos anuales | Mismo estado que MRR |
| Churn | % de clientes que cancelan por periodo | No medible — requiere historial de cancelaciones que no existe con un solo cliente |
| Tasa de conversión de prueba gratuita | % que pasa de prueba a plan pagado | No medible — `10B` §7 (pruebas gratuitas) es [FUTURO] |

## 2. Métricas de retención y satisfacción

| Métrica | Definición | Estado de medición hoy |
|---|---|---|
| Retención (cohortes) | % de clientes activos tras N meses desde alta | No medible con un solo cliente — necesita cohortes reales |
| NPS (Net Promoter Score) | Encuesta estándar de recomendación | No implementado — requiere mecanismo de encuesta, señalado ya como [FUTURO] en `10H-SUPPORT-OPERATIONS.md` §"KPIs" |
| Satisfacción del cliente | Complementa NPS con feedback cualitativo | Hoy: informal, vía comunicación directa (`10H` §6) |

## 3. Métricas de activación y adopción

| Métrica | Definición | Estado de medición hoy |
|---|---|---|
| Tiempo desde alta hasta primer uso real | Ya identificado como KPI en `06A-CORE-MODULES.md` §1 | Medible manualmente, sin panel dedicado |
| Adopción de funcionalidades | % de empresas usando cada módulo (`MODULOS.md`) | No medible sistemáticamente — requiere `CCEC-004A` |
| Actividades sin asignar/sin seguimiento | Ya identificado en `VISION.md` como métrica de progreso hacia la visión | Medible por consulta directa, sin panel |

## 4. Métricas de IA

| Métrica | Definición | Estado de medición hoy |
|---|---|---|
| Uso de IA | Invocaciones de agentes por empresa/periodo | `05-AI-ECOSYSTEM.md` §11 ya diseñó observabilidad de esto — no implementada |
| Tiempo ahorrado por automatización | Estimado: tareas que antes eran manuales ahora automáticas | Requiere que `09-ENTERPRISE-AUTOMATION-PLATFORM.md` esté construido — hoy [FUTURO] |
| Horizonte de IA alcanzado | Ver `11F-AI-EVOLUTION.md` §"KPIs" | Medible cualitativamente en cada revisión de 6 meses |

## 5. Métricas técnicas/de plataforma

No se redefinen — ver `10F-SERVICE-LEVEL-OBJECTIVES.md` (disponibilidad, latencia) y `CCEC-004A` (mecanismo general). Este documento solo confirma que "disponibilidad" y "tiempo de respuesta" pedidos por esta fase ya tienen dueño documental (`10F`), no se duplican aquí.

---

## 6. Por qué la mayoría de estas métricas dicen "no medible hoy"

Es una respuesta honesta, no una falla de este documento: MAHP tiene un cliente activo, sin planes de facturación reales, sin `CCEC-004` implementado. La mayoría de los KPIs "estratégicos" de una empresa SaaS madura requieren volumen y tiempo que MAHP todavía no tiene — este documento define **qué medir cuando exista qué medir**, consistente con el mismo principio de honestidad de estado aplicado en todo `/docs` (`11-ENTERPRISE-PRODUCT-STRATEGY.md` §3, valor 3).

---

## Panel estratégico propuesto (cuándo se activa)

Se activa cuando exista más de un cliente con al menos 3 meses de historial — antes de eso, cualquier tendencia calculada sobre una sola empresa no es una métrica confiable, es una anécdota con forma de número.
