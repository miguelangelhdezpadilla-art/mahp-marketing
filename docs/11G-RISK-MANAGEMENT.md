# RISK MANAGEMENT — Gestión de Riesgos Estratégicos

> MDS-012, Documento 8 de 10. Consolida en un solo lugar los riesgos ya
> identificados a lo largo de toda la serie MDS/CCEC — no descubre riesgos
> nuevos por descubrir, organiza los ya señalados por severidad real y
> añade los puramente estratégicos/de negocio que ningún documento técnico
> cubría.
>
> Última actualización: 2026-07-12.

---

## 1. Riesgos confirmados y activos (no proyectados)

| Riesgo | Severidad | Origen | Estado de mitigación |
|---|---|---|---|
| Sin backup gestionado por Supabase (plan Free, PITR deshabilitado) | 🔴 Alta — confirmado, no teórico | `10E-BACKUP-AND-DISASTER-RECOVERY.md` | Mitigado parcialmente: respaldo semanal manual activo desde 2026-07-12; decisión de upgrade a Pro pendiente |
| `social_channels`/`follower_logs`/`follower_goals` sin versionar en `.sql` | 🟡 Media | `DATABASE.md` §9 | No mitigado — acción pendiente identificada, no ejecutada |
| Concentración: un solo cliente activo | 🟡 Media (riesgo de negocio, no técnico) | `11B-BUSINESS-GROWTH.md` §5 | No mitigable directamente — se resuelve con crecimiento (`11A` Fase 2) |

## 2. Riesgos de seguridad

| Riesgo | Severidad | Origen | Estado |
|---|---|---|---|
| Impersonación de `super_admin` sin auditar | 🔴 Alta (integridad/cumplimiento) | `07F-SECURITY-AND-AUDIT.md` §5 | Catalogado en `CCEC-001A` como prioridad más alta de esa capacidad — no implementado todavía |
| Credenciales de integraciones futuras requieren cifrado a nivel de aplicación, no solo RLS | 🟡 Media, latente | `08E-SECURITY.md` §8 | No aplica todavía — ninguna integración real construida |
| Patrón de bug de `v16`/`v18` (política UPDATE bloqueada por política SELECT) puede repetirse en tablas nuevas con columna de visibilidad condicional | 🟡 Media, recurrente | `07C-DATABASE-STANDARDS.md` §7 | Mitigado con estándar de diseño documentado — requiere disciplina de revisión, no solo documentación |

## 3. Riesgos de escalabilidad y mantenimiento

| Riesgo | Severidad | Origen | Estado |
|---|---|---|---|
| Modelo de cola Postgres+`pg_cron` tiene techo (decenas de miles de empresas) | 🟢 Baja, lejano | `07-ENTERPRISE-DATA-PLATFORM.md` §8, `08F-EVENT-ARCHITECTURE.md` §6 | No requiere acción hasta acercarse al volumen |
| Motor de reglas configurable por cliente es más difícil de depurar que triggers fijos | 🟡 Media | `09-ENTERPRISE-AUTOMATION-PLATFORM.md` Entregable Final §4 | Mitigado por diseño: límites duros (máximo de pasos, sin ciclos, timeout obligatorio, `09A-WORKFLOW-ENGINE.md` §7) |
| Cada integración nueva es superficie de mantenimiento indefinida | 🟢 Baja, gestionable | `08-ENTERPRISE-INTEGRATION-PLATFORM.md` Entregable Final §4 | Mitigado por checklist de activación por demanda real |
| Sin observabilidad de datos/eventos/workflows todavía | 🟡 Media | `CCEC-004` (toda) | Capacidad diseñada, no implementada — mismo patrón que backup: diseño completo, ejecución pendiente |

## 4. Riesgos de gobernanza

| Riesgo | Severidad | Origen | Estado |
|---|---|---|---|
| Sin dueño formal de datos por dominio más allá de "quién lo construyó" | 🟢 Baja al tamaño actual | `07-ENTERPRISE-DATA-PLATFORM.md` Entregable Final §4 | Aceptable con un desarrollador; no lo será al crecer el equipo |
| Ausencia de Architecture Decision Records | 🟢 Baja, acumulativa | `11-ENTERPRISE-PRODUCT-STRATEGY.md` §14 | El razonamiento detrás de decisiones ya tomadas se pierde con el tiempo si no se documenta ahora |
| `PROJECT-BLUEPRINT.md` desactualizado desde MDS-005 | 🟢 Baja | Señalado en MDS-008/009/010 | Sin corregir — decisión de numeración pendiente del dueño del documento |
| Decisión de modelo de organización/sucursales bloqueada desde MDS-003 | 🟡 Media — bloquea 3 líneas de negocio (`11D` §6–7) | 6 documentos distintos | Sin resolver — requiere cliente real, no se puede forzar |

## 5. Riesgos estratégicos/de negocio — nuevos en este documento

| Riesgo | Severidad | Mitigación propuesta |
|---|---|---|
| Expansión internacional prematura sin resolver residencia de datos (`11C` §4) | 🟡 Media, futuro | No expandir a mercados con regulación de residencia de datos hasta resolver la arquitectura correspondiente |
| Construir Programa de Agencias/Franquicias (`11D` §6–7) antes de resolver el modelo de organización | 🟡 Media, futuro | Mismo criterio: no monetizar un modelo de datos que no existe |
| Sobre-invertir en Marketplace (`08I`) antes de tener integraciones reales que catalogar | 🟢 Baja | Ya mitigado por el propio diseño de `08I` §1 (condición de activación explícita) |

---

## Matriz de priorización

```
                     IMPACTO ALTO                    IMPACTO MEDIO/BAJO
URGENTE      │ Sin backup real (parcialmente   │ Impersonación sin
             │ mitigado)                        │ auditar
             │                                   │
NO URGENTE   │ Modelo de organización bloqueado │ ADR ausentes,
(pero real)  │ (bloquea 2 líneas de negocio)     │ PROJECT-BLUEPRINT
             │                                   │ desactualizado
```

---

## KPIs de gestión de riesgo

| KPI | Definición |
|---|---|
| Riesgos confirmados sin mitigación activa | Objetivo: tender a cero para los de severidad 🔴 |
| Tiempo desde identificación hasta mitigación | Ej. backup: identificado en `02-ARCH` (MDS-003), confirmado y mitigado en MDS-011 — brecha real de tiempo a acortar en futuros hallazgos |
| Riesgos re-identificados en más de una fase sin resolverse | Señal de que un hallazgo no se está actuando, no solo documentando (mismo patrón que llevó a crear `CCEC-001`/`CCEC-004`) |
