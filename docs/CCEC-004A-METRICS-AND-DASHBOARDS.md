# CCEC-004A — Métricas y Dashboards

> Consolida los KPIs ya propuestos en `07-ENTERPRISE-DATA-PLATFORM.md` §11,
> `07I-DATA-QUALITY.md` §5, `08F-EVENT-ARCHITECTURE.md` §5,
> `09-ENTERPRISE-AUTOMATION-PLATFORM.md` §11 en un solo vocabulario de
> métricas, con dueño de panel por categoría.
>
> Última actualización: 2026-07-12.

---

## 1. Categorías de métricas

| Categoría | Métricas ya identificadas en MDS previos | Origen |
|---|---|---|
| **Datos** | Integridad referencial, cobertura de esquema versionado, latencia de escritura, consistencia de campos derivados | `07I-DATA-QUALITY.md` §5 |
| **Eventos/Cola** | Profundidad de cola, latencia de procesamiento, tasa de fallo, tareas recurrentes activas | `08F-EVENT-ARCHITECTURE.md` §5, `09F-JOB-SCHEDULER.md` KPIs |
| **Workflows** | Workflows activos, tasa de éxito, tiempo promedio de ejecución, workflows desde plantilla vs. desde cero | `09A-WORKFLOW-ENGINE.md` KPIs |
| **Notificaciones** | Tasa de entrega por canal, tiempo de respuesta a alertas escaladas, fatiga de notificación | `09H-NOTIFICATION-ORCHESTRATION.md` §8 KPIs |
| **API/Integraciones** | Latencia p95, tasa de error 5xx, entrega de webhooks, desarrolladores activos | `08A-API-STANDARDS.md` §13, `08B-WEBHOOKS.md` KPIs, `08D-DEVELOPER-PORTAL.md` KPIs |
| **Auditoría** (cobertura, no contenido) | % de eventos del catálogo `CCEC-001A` efectivamente registrados | `CCEC-001` |

## 2. Formato único de una métrica

Toda métrica de esta CCEC se define con: **nombre**, **unidad**, **dimensión de corte** (siempre incluye `company_id` cuando aplica — ninguna métrica agregada global oculta el desglose por empresa, mismo principio de aislamiento multiempresa aplicado a observabilidad), **frecuencia de captura**, **dueño del panel**. Ninguna métrica se agrega a un dashboard sin estos cinco campos definidos — es el mismo nivel de disciplina que `CCEC-001A` exige para eventos de auditoría.

## 3. Paneles propuestos (no construidos)

| Panel | Audiencia | Métricas que agrupa |
|---|---|---|
| Salud de la plataforma | Equipo técnico de MAHP (`super_admin`) | Datos, Eventos/Cola, API/Integraciones |
| Salud de automatización por empresa | `company_admin` de cada empresa | Workflows, Notificaciones (de su propia empresa) |
| Adopción de API pública | Equipo técnico de MAHP | API/Integraciones (agregado, sin datos de una empresa específica) |

**Ningún panel mezcla datos de más de una empresa para una audiencia que no sea `super_admin`** — mismo aislamiento multiempresa de `07H-MULTI-TENANT-DESIGN.md`, aplicado también a observabilidad, no solo a datos operativos.

## 4. Fuente de cada métrica

No se duplica dato para alimentar métricas — cada una se calcula sobre las tablas ya existentes (`07E-ENTITY-CATALOG.md`) o las que cada MDS ya proyectó (`automation_queue`, `webhook_deliveries`), consistente con `07B-DATA-GOVERNANCE.md` §3 ("ningún dato de negocio vive duplicado en dos tablas") extendido a métricas: una métrica es una consulta agregada sobre datos ya existentes, no una tabla paralela que hay que mantener sincronizada.

## 5. Condición de activación por categoría

Igual que toda esta documentación, no se construye por anticipación — cada panel se activa cuando el dominio que mide (workflows, integraciones, etc.) tenga uso real que observar. El panel de "Salud de la plataforma" es la excepción: tiene sentido desde el primer momento en que exista más de una integración o automatización en producción, porque su propósito es precisamente detectar problemas antes de que un cliente los reporte.

---

## KPI de esta CCEC misma

**Cobertura de instrumentación**: % de las categorías de §1 que tienen al menos una métrica realmente capturada (no solo documentada) — la métrica más honesta de esta CCEC, porque documentar un KPI no es lo mismo que medirlo.
