# CCEC-004 — OBSERVABILITY PLATFORM

> Capacidad Compartida — **CCEC = Cross-Cutting Enterprise Capabilities**,
> definición oficial en `MES-001-ENGINEERING-CONSTITUTION.md` §5 — cómo se
> sabe que el sistema está sano, no quién hizo qué (eso es
> `CCEC-001-ENTERPRISE-AUDIT-PLATFORM.md`). Origen: el mismo gap se
> reportó de forma independiente en `07-ENTERPRISE-DATA-PLATFORM.md` §11 y
> `07I-DATA-QUALITY.md` §5–6 (MDS-008), `08F-EVENT-ARCHITECTURE.md` §5
> (MDS-009), y `09-ENTERPRISE-AUTOMATION-PLATFORM.md` §11 y `09H-
> NOTIFICATION-ORCHESTRATION.md` §8 (MDS-010).
>
> **Estado de madurez oficial: `Designed`** (ver `MES-001` §"Estados de
> Madurez") — diseño completo, sin implementación real todavía. Bajo la
> **Progressive Infrastructure Strategy** (`ADR-016`), esto no es una
> inconsistencia: una capacidad puede documentarse completa en estado
> `Designed`/`Planned` antes de construirse, siempre que su estado quede
> declarado explícitamente, como aquí. Lo único disponible hoy son los
> logs nativos de la plataforma Supabase (Postgres + Edge Functions),
> fuera del control directo de la aplicación.
>
> Última actualización: 2026-07-12.

---

## 1. Por qué esto es una CCEC

Igual que con auditoría (`CCEC-001` §1): cada MDS desde MDS-008 ha propuesto su propia tabla de KPIs sin panel, sin mecanismo de captura común, y sin decidir qué es una métrica vs. una alerta vs. un log. Sin esta CCEC, cada dominio construiría su propio mini-sistema de monitoreo aislado — exactamente el tipo de duplicación que MDS-011 pide explícitamente evitar.

## 2. Las tres capas de observabilidad, y dónde vive cada una en esta CCEC

| Capa | Pregunta que responde | Documento |
|---|---|---|
| **Logs** | ¿Qué pasó exactamente, con todo el detalle, en un evento técnico específico? | `CCEC-004B-LOGGING-STANDARDS.md` |
| **Métricas / Dashboards** | ¿Cómo se está comportando el sistema en agregado, a lo largo del tiempo? | `CCEC-004A-METRICS-AND-DASHBOARDS.md` |
| **Alertas** | ¿Cuándo alguien necesita enterarse activamente, sin tener que ir a buscarlo? | `CCEC-004C-ALERTING-STRATEGY.md` |

## 3. Alcance consolidado — qué gaps resuelve

| Fuente | Qué aportó |
|---|---|
| `07-ENTERPRISE-DATA-PLATFORM.md` §11 (MDS-008) | Sin panel de calidad de datos, latencia de escritura, tasa de error de RLS |
| `07I-DATA-QUALITY.md` §5–6 (MDS-008) | 8 KPIs de calidad de datos, todos "sin panel/dashboard dedicado" |
| `08F-EVENT-ARCHITECTURE.md` §5 (MDS-009) | Sin observabilidad de cola de eventos (encolados/procesados/fallidos, latencia, reintentos) |
| `09-ENTERPRISE-AUTOMATION-PLATFORM.md` §11 (MDS-010) | Sin estado de ejecución de workflows, historial, alertas de fallo |
| `09H-NOTIFICATION-ORCHESTRATION.md` §8 (MDS-010) | Sin logs de entrega por canal de notificación |

## 4. Arquitectura

```
                    Toda pieza del sistema (dominio)
        (Postgres, Edge Functions, Workflow Engine, cola,
         integraciones, notificaciones)
                            │
              emite, en el mismo formato (CCEC-004B):
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼              ▼
           LOGS         MÉTRICAS       EVENTOS DE
       (CCEC-004B)    (CCEC-004A)      UMBRAL CRUZADO
                                             │
                                             ▼
                                   ALERTAS (CCEC-004C)
                                   → dueño responsable
                                   (mismo concepto de
                                   dueño que 09I-
                                   AUTOMATION-GOVERNANCE)
```

**Decisión de infraestructura**: no se adopta una herramienta externa de observabilidad (Datadog, Grafana Cloud, etc.) en esta fase — se diseña sobre lo que Supabase ya expone (logs nativos de Postgres/Edge Functions) más tablas propias donde MAHP necesita historial que Supabase no retiene indefinidamente (ej. `webhook_deliveries`, ya anticipada en `08B-WEBHOOKS.md` §6). Adoptar una herramienta externa es una decisión de costo/madurez para cuando el volumen lo justifique, no un requisito de diseño de esta CCEC.

## 5. Relación con Auditoría (`CCEC-001`)

Nunca se mezclan en la misma tabla ni en el mismo panel — un evento puede generar AMBOS un registro de auditoría (quién configuró un webhook) Y una métrica de observabilidad (cuántos webhooks de esa empresa fallaron esta semana), pero son dos escrituras a dos sistemas con dueños, audiencias y políticas de retención distintas (`CCEC-001B` §4).

## 6. Qué NO cubre esta CCEC

- **Observabilidad de infraestructura pura** (CPU, memoria, disco de Supabase) — responsabilidad de la plataforma Supabase, MAHP no la reimplementa.
- **Auditoría de seguridad/cumplimiento** — `CCEC-001`.
- **Métricas de negocio/producto** (adopción, retención de clientes) — pertenecen a `MDS-011` (Growth Strategy, `10I-GROWTH-STRATEGY.md`) o a analítica de producto, no a esta capacidad técnica.

---

## Diagrama — consolidación de 5 hallazgos en una capacidad

```
07 §11 ──┐
07I §5-6 ─┼──▶  5 tablas de KPI aisladas, sin panel,     ──▶  CCEC-004
08F §5 ──┤     ningún mecanismo de captura común              (una sola
09 §11 ──┤                                                     capacidad,
09H §8 ──┘                                                     3 capas)
```

---

## Checklist — antes de dar por completa la observabilidad de un dominio nuevo

- [ ] ¿Se definieron métricas siguiendo el formato de `CCEC-004A`, no una tabla de KPI aislada?
- [ ] ¿Los logs siguen el formato común de `CCEC-004B`?
- [ ] ¿Se identificaron los umbrales que ameritan alerta activa (`CCEC-004C`), no solo métricas pasivas?
- [ ] ¿Se evitó mezclar un evento de observabilidad con uno de auditoría en la misma escritura?

---

## Entregable

**Resumen**: se consolidan 5 hallazgos independientes de MDS-008/009/010 en una sola capacidad con tres capas claras (logs, métricas, alertas), sin adoptar infraestructura externa todavía — construida sobre lo que Supabase ya expone más tablas propias donde haga falta historial. **Condición de activación** (igual que toda esta documentación): se construye cuando el volumen real de alguno de los 5 dominios que la necesitan (datos, eventos, workflows, notificaciones, calidad) lo justifique, no antes.
