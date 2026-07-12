# DATA QUALITY — Calidad de Datos de MAHP

> MDS-008, Documento 10 de 10. Dimensiones de calidad, verificaciones y
> KPIs de la plataforma de datos. Cierra la fase MDS-008.
>
> Última actualización: 2026-07-12.

---

## 1. Dimensiones de calidad aplicadas a MAHP

| Dimensión | Qué significa aquí | Mecanismo actual |
|---|---|---|
| Integridad referencial | Toda FK apunta a una fila real | `references` de Postgres — nunca opcional en columnas de relación |
| Completitud | Los campos obligatorios de negocio no quedan vacíos | `not null` + validación de cliente (capa 3 de `07B` §4) |
| Consistencia | El mismo hecho no se contradice entre tablas | Un solo dueño de escritura por dato (`07B` §1) |
| Unicidad | No hay duplicados donde no deben existir | `unique(company_id, channel_id)` en `follower_goals` es el único caso hoy con constraint explícita de este tipo |
| Vigencia (freshness) | El dato refleja el estado real al momento de leerse | Lectura transaccional directa, sin caché intermedia (`07-ENTERPRISE-DATA-PLATFORM.md` §5) — la vigencia es inmediata por diseño, no por proceso de sincronización |
| Trazabilidad | Se puede reconstruir quién hizo qué y cuándo | Tablas append-only (§5 de `07D`) + `audit_log`, con el gap ya señalado de eventos operativos y de impersonación (`07F` §5) |

## 2. Dónde se protege la calidad (y dónde no)

MAHP protege calidad **en el punto de entrada**, no con limpieza posterior: constraints de Postgres primero, RLS segundo, validación de cliente tercero (`07B` §4). No existe, ni se planea, un proceso de "limpieza de datos" en batch — si un dato entra mal, es porque una de las tres capas falló, y la corrección es arreglar esa capa, no escribir un script de limpieza recurrente.

**Excepción reconocida**: `social_channels`/`follower_logs`/`follower_goals` (no versionadas en `.sql`, `07B` §5) son la única familia de tablas donde no hay certeza total de que las tres capas estén correctamente alineadas con lo documentado — es el riesgo de calidad más concreto y accionable identificado en esta fase.

## 3. Duplicidad

Sin mecanismo de detección de duplicados hoy más allá de la constraint `unique` de `follower_goals`. No es un problema observado en producción — la mayoría de entidades (`actividades`, `campaigns`, `evidencias`) no tienen un concepto natural de "duplicado" que deba prevenirse a nivel de base de datos, es un juicio humano al crearlas.

## 4. Validación de tipos y rangos

Ejemplos ya vigentes: `actividades.progress_pct` limitado `0–100`, `follower_goals.goal_total`/`goal_gain` con `check > 0`, `evidencias.file_type` con `check in ('image','video')`. Estándar para toda columna nueva de tipo numérico o enumerado: si el dominio de valores válidos es conocido y finito, se declara como `check` constraint, no se confía solo en la validación de cliente.

---

## 5. KPIs de la plataforma de datos

| KPI | Definición | Cómo se mide hoy |
|---|---|---|
| Integridad referencial | % de FKs sin huérfanos | No medido activamente — garantizado por diseño (`references` sin `on delete` permisivo indebido), no monitoreado |
| Disponibilidad | % de tiempo que la base de datos responde | Delegado a Supabase (SLA de plataforma), sin panel propio |
| Calidad de esquema versionado | % de tablas con historial `.sql` completo | Hoy: todas excepto la familia de seguidores (§2) — objetivo: 100% |
| Latencia de escritura | Tiempo entre acción de usuario y dato disponible para lectura | No medido — arquitectura es de consistencia inmediata (§1), por lo que el riesgo real es latencia de red, no de modelo |
| Consistencia de campos derivados | Que `progress_pct`/`status` siempre reflejen el último `activity_update` | Garantizado por trigger, no observado con métrica — riesgo si el trigger fallara silenciosamente (sin panel de errores de trigger hoy) |
| Cobertura de auditoría | % de tipos de evento relevantes registrados en `audit_log` | Hoy: 3 de al menos 6 identificados (`07F` §5) — 50% |
| Tiempo de recuperación de un dato eliminado | Desde soft delete hasta restauración | Manual, vía SQL Editor — sin métrica de tiempo real porque no hay proceso automatizado |
| Uso por IA | Volumen de escritura originada por generación de IA vs. manual | No medido — candidato natural cuando exista más de un agente de IA activo (`05-AI-ECOSYSTEM.md`) |

Todos estos KPIs son **[FUTURO]** en el sentido de "sin panel/dashboard dedicado hoy" — los mecanismos que los garantizan (constraints, triggers, RLS) sí existen y son [EXISTE]; lo que falta es la capa de observación, no la de control. Esta distinción es intencional: MAHP prioriza que el dato esté bien por diseño sobre medir después si lo está.

---

## 6. Riesgos de calidad identificados en esta fase

1. **Alto**: familia de tablas de seguidores sin versionado `.sql` — cualquier cambio futuro hecho directo en SQL Editor podría alterar constraints o RLS sin dejar rastro documentado.
2. **Medio**: sin observabilidad de fallos de trigger — si `sync_activity_progress()` fallara silenciosamente para una fila, no hay alerta, solo se notaría por inconsistencia visible eventualmente.
3. **Medio**: impersonación de `super_admin` sin auditoría (ya señalado en `07F` §5) — también es un riesgo de calidad de trazabilidad, no solo de seguridad.
4. **Bajo**: ausencia de detección de duplicados fuera de `follower_goals` — aceptable al volumen y naturaleza actual de los datos.

---

## Cierre de MDS-008

Con este documento se completan los 10 entregables de la fase (`07` + `07A`–`07I`). Ver `07-ENTERPRISE-DATA-PLATFORM.md` sección "Entregable Final" para el resumen ejecutivo, priorización de dominios críticos, hoja de ruta y verificación de coherencia con MDS-001 a MDS-007 requeridos por el documento de fase.
