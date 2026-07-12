# DATA GOVERNANCE — Gobierno de Datos de MAHP

> MDS-008, Documento 3 de 10. Políticas oficiales de propiedad, calidad,
> consistencia, validación, versionado, auditoría, retención, archivado,
> soft delete, restauración y cumplimiento — el "quién puede y quién debe"
> sobre cada dato, no el "qué existe" (eso es `07E-ENTITY-CATALOG.md`).
>
> Última actualización: 2026-07-12.

---

## 1. Propiedad de datos

Regla única: **todo dato operativo tiene exactamente un mecanismo de escritura autorizado**, nunca dos caminos paralelos para el mismo campo.

| Tipo de dato | Quién escribe | Ejemplo |
|---|---|---|
| Datos directos de negocio | El rol correspondiente, vía RLS | `company_admin` crea `actividades` |
| Datos derivados/calculados | Solo el trigger `security definer` | `actividades.progress_pct`, `points_log`, `notifications` |
| Datos de auditoría | Solo el trigger, `insert`-only | `audit_log`, `activity_updates` |
| Borrado físico | Solo `super_admin`, vía SQL Editor | Ninguna tabla operativa lo expone en interfaz |

Cuando un dato parece necesitar dos escritores (por ejemplo, ¿quién corrige `progress_pct` si el trigger se equivocó?), la respuesta oficial es: se corrige por SQL directo bajo supervisión, no se abre una segunda vía de escritura en el cliente — abrir una segunda vía rompe la garantía de "un dato, un dueño" documentada en `07-ENTERPRISE-DATA-PLATFORM.md` §3.

## 2. Calidad

Ver desarrollo completo de indicadores en `07I-DATA-QUALITY.md`. Principio de gobierno: la calidad se protege en el punto de entrada (constraints + RLS + validación de cliente), no se corrige después con limpieza masiva — MAHP no tiene hoy, ni planea tener, un proceso de limpieza de datos en batch.

## 3. Consistencia

- **Un solo valor de verdad por hecho.** `actividades.progress_pct` no se recalcula en el cliente — se lee tal como lo dejó el trigger `sync_activity_progress()`.
- **Las vistas de agregación nunca son la fuente de verdad**, son una proyección de lectura (`follower_totals`, `points_totals`, etc.) — si una vista y su tabla base difieren, la tabla base tiene razón.
- **Ningún dato de negocio vive duplicado en dos tablas.** Si un campo parece necesitar copiarse (por ejemplo, el nombre de la empresa en cada actividad), la decisión de gobierno es siempre unir (`join`) en el momento de lectura, no desnormalizar — la única excepción ya aceptada es la columna calculada `delta` en `follower_logs`, que no se inserta desde el cliente precisamente para preservar esta regla.

## 4. Validaciones

Tres capas, en este orden de confianza (de mayor a menor):

1. **Constraints de Postgres** (`check`, `references`, `not null`) — la única capa que no se puede saltar bajo ninguna circunstancia, ni con un bug de cliente ni con RLS mal configurado.
2. **RLS** — determina *quién* puede escribir, no *qué forma* debe tener el dato; es la capa de autorización, no de validación de formato.
3. **Validación de cliente** (JS) — solo para experiencia de usuario (mensajes de error inmediatos); nunca la única línea de defensa, porque un cliente se puede evadir.

Ejemplo real ya en producción: `follower_goals` usa `check (goal_total > 0)` y `check (goal_gain > 0)` a nivel de columna, no solo validación de formulario (`DATABASE.md` §5).

## 5. Versionado

El esquema se versiona por archivo (`supabase_schema_vN.sql`, siguiente número disponible, nunca editar uno ya aplicado — `CLAUDE.md` §3), no por herramienta de migración automatizada. Desarrollo completo de la convención en `07C-DATABASE-STANDARDS.md` §2.

**Gap de gobierno reconocido y no resuelto por este documento**: `social_channels`, `follower_logs`, `follower_totals` y `follower_delta_by_campaign` se crearon fuera de este flujo — existen en producción pero no en ningún `.sql` versionado (`DATABASE.md` §9). Es una violación activa de esta misma política de gobierno, documentada explícitamente en vez de ocultada, con una acción pendiente ya identificada (generar un `.sql` descriptivo que las capture).

## 6. Auditoría

Dos niveles, distintos por diseño:

- **Auditoría administrativa** (`audit_log`): eventos de cuenta y acceso — empresa creada, invitación creada/cancelada, acceso revocado/restaurado. Visible solo a `super_admin`.
- **Auditoría operativa implícita**: `activity_updates`, `points_log`, `follower_logs` — no se llaman "auditoría" pero cumplen la misma función para su dominio: nunca se edita ni se borra una fila histórica, solo se agregan nuevas.

**[FUTURO]**: extender `audit_log` a eventos operativos (creación/edición/borrado de actividades, campañas) — hoy esos eventos son reconstruibles indirectamente vía `activity_updates`/timestamps, pero no hay un registro unificado. Señalado también en `07-ENTERPRISE-DATA-PLATFORM.md` §11.

## 7. Retención

No existe hoy una política de retención con expiración automática — todo dato se conserva indefinidamente salvo borrado explícito. Es una decisión válida al tamaño actual del producto, no un descuido: los datos de marketing (avances, evidencias, puntos) tienen valor histórico para el cliente, no son transaccionales de corta vida. Revisar cuando el volumen o requisitos de cumplimiento de un cliente específico lo exijan (§10).

## 8. Archivado

MAHP no tiene hoy un archivado físico (mover a almacenamiento frío) — el "archivado" real es el soft delete (§9). **[FUTURO]**: si el volumen de tablas `append-only` lo justifica, particionar por fecha y archivar particiones antiguas (`07-ENTERPRISE-DATA-PLATFORM.md` §8), sin que esto cambie la experiencia del cliente, que siempre debe poder consultar su historial completo.

## 9. Soft Delete

Estándar único para todo el sistema, no una excepción de `actividades`: marcar `deleted_at = now()`, nunca `DELETE` desde el cliente. Detalle técnico completo (incluida la lección aprendida sobre RLS) en `07C-DATABASE-STANDARDS.md` §7 y `07D-DATA-LIFECYCLE.md` §7.

Tablas con soft delete hoy: `actividades` (`v16`), `evidencias` (`v16`). Cualquier tabla operativa nueva que represente algo que un usuario pueda "eliminar" debe seguir el mismo patrón desde su creación — no agregarlo después como parche.

## 10. Restauración

Hoy **no existe interfaz de restauración** (deshacer un soft delete) en ninguna pantalla — es una operación de soporte vía SQL Editor (`update ... set deleted_at = null where id = ...`), consistente con que el borrado físico tampoco se expone. **[FUTURO]**: una vista de "papelera" por empresa (`company_admin` ve sus elementos con `deleted_at` no nulo y puede restaurar) es un candidato natural de siguiente iteración sobre el trabajo ya hecho en `v16`/`v18`, no requiere cambio de modelo de datos, solo interfaz + una función `security definer` equivalente a `soft_delete_actividades()` mencionada en `DATABASE.md` §2.

## 11. Cumplimiento

MAHP no maneja hoy datos de categoría especial (salud, menores, datos financieros de tarjeta) — el dato más sensible es la identidad de empleados de la empresa cliente (`profiles.full_name`, correo vía `auth.users`) y el contenido de marketing de esa empresa, ambos ya protegidos por el aislamiento multiempresa (`07H-MULTI-TENANT-DESIGN.md`). No existe hoy un documento de cumplimiento formal (privacidad, retención legal) — consistente con la regla de `CLAUDE.md` §6 de nunca fabricar texto legal: cuando se necesite, se redactará como documento real, no como relleno en este archivo.

---

## Resumen de decisiones de gobierno

| Política | Estado | Documento de detalle |
|---|---|---|
| Un dato, un dueño de escritura | Vigente, verificado | `07-ENTERPRISE-DATA-PLATFORM.md` §3 |
| Versionado estricto por archivo `.sql` | Vigente, con gap conocido (§5) | `07C` §2 |
| Soft delete como estándar de borrado | Vigente desde `v16`, corregido `v18` | `07C` §7, `07D` §7 |
| Auditoría administrativa | Vigente, cobertura parcial | §6 |
| Retención sin expiración automática | Vigente por decisión, no por omisión | §7 |
| Restauración vía interfaz | [FUTURO] | §10 |
| Cumplimiento formal (legal/privacidad) | [FUTURO] | §11 |
