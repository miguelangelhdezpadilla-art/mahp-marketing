# DATABASE STANDARDS — Estándares Técnicos de Base de Datos

> MDS-008, Documento 4 de 10. Convenciones que todo cambio de esquema debe
> seguir: nomenclatura, versionado, RLS, triggers, manejo de fechas,
> compatibilidad y deprecación. Complementa, no repite, las convenciones ya
> fijadas en `DATABASE.md` §1 — este documento las explica y las extiende a
> estándar formal reutilizable en futuras fases (MDS-009 en adelante).
>
> Última actualización: 2026-07-12.

---

## 1. Nomenclatura

- **Tablas**: sustantivo plural, español, `snake_case` (`actividades`, `evidencias`, `campaigns` es la única excepción histórica en inglés — no se renombra retroactivamente, `CLAUDE.md` §3 prohíbe romper compatibilidad sin necesidad).
- **Columnas**: `snake_case`, español donde el dominio es español (`titulo`, `canal`), inglés donde ya se estableció así (`status`, `progress_pct`) — se prioriza consistencia con lo existente sobre pureza de idioma en una tabla ya creada.
- **Claves foráneas**: `<entidad>_id` (`company_id`, `campaign_id`, `activity_id`) — cuando hay más de una FK a la misma tabla, el nombre debe ser semántico, no genérico (`authorized_by` y `user_id`, ambas hacia `profiles`, nunca `profiles_id_1`/`profiles_id_2`).
- **Booleanos**: adjetivo o participio, sin prefijo `is_`/`has_` (`active`, `used`, `read`) — consistente con el estilo ya establecido en `companies.active`, `invites.used`, `notifications.read`.
- **Funciones**: verbo + sustantivo, `snake_case` (`my_role()`, `soft_delete_actividades()`, `sync_activity_progress()`).
- **Triggers**: prefijo `trg_` + acción descriptiva (`trg_award_tarea_completada`, `trg_lock_campos_actividad_colaborador`).
- **Políticas RLS**: `<tabla>_<comando>` (`actividades_select`, `actividades_update`), con sufijo de rol solo cuando coexisten varias políticas permisivas para el mismo comando (`actividades_collaborator_update`).

## 2. Versionado

Un solo archivo por cambio de esquema: `supabase_schema_vN.sql`, `N` = siguiente entero disponible, en la raíz del repositorio. Reglas:

- **Nunca se edita un `.sql` ya aplicado** — un error se corrige con un `vN+1` nuevo, nunca reescribiendo el histórico (`CLAUDE.md` §3).
- **Cada archivo se aplica manualmente** en el SQL Editor de Supabase, en orden — no hay migración automatizada ni CI que lo aplique (`PROJECT-BLUEPRINT.md` §28).
- **El encabezado de cada archivo debe explicar el porqué**, no solo el qué — precedente ya establecido en `v18` (documenta la causa raíz del bug de RLS, no solo el `CREATE FUNCTION`).
- **Todo archivo que cambie una tabla o política debe reflejarse en `DATABASE.md` en el mismo cambio** (`CLAUDE.md` §7) — un `.sql` sin su entrada en `DATABASE.md` se considera trabajo incompleto.

## 3. RLS como estándar no negociable

- **Toda tabla operativa tiene RLS activado** (`relrowsecurity = true`) desde su creación — nunca se agrega "después, cuando haya tiempo".
- **Política de `select` primero, siempre.** Se define antes que `insert`/`update`/`delete`, porque determina qué es "visible" y por tanto qué reglas heredan las demás (ver §7, lección de `v18`).
- **`security definer` solo para funciones auxiliares de identidad o triggers de escritura derivada** (`my_role()`, `my_company_id()`, y los triggers de sincronización/gamificación/notificaciones) — nunca para exponer un atajo de escritura directa que evite RLS desde el cliente.
- **Multi-tenant por columna (`company_id`), no por schema** — ver desarrollo completo en `07H-MULTI-TENANT-DESIGN.md`.

## 4. Manejo de fechas

- **Timestamps de sistema** (`created_at`, `updated_at`, `deleted_at`): siempre `timestamptz`, nunca `timestamp` sin zona — evita ambigüedad cuando la empresa cliente y el servidor están en zonas distintas.
- **Fechas de negocio** (`actividades.fecha`, `campaigns.start_date`/`end_date`): `date`, sin hora — una actividad de calendario no tiene hora de sistema, tiene un día.
- **Nunca se calcula "ahora" en el cliente para escribirlo a la base** — se usa `now()` de Postgres (`deleted_at = now()` vía la función `security definer`, no `new Date().toISOString()` calculado en JS e insertado directo) donde el momento exacto importa para integridad, aunque históricamente el cliente sí lo hacía antes de `v18` — ver nota de migración en `07D-DATA-LIFECYCLE.md` §7.

## 5. Vistas de agregación

Todas las vistas hoy (`follower_totals`, `follower_delta_by_campaign`, `follower_goals_progress`, `points_totals`, `points_by_campaign`) son vistas simples (calculadas al vuelo en cada consulta), **no materializadas** — consistente con el principio de simplicidad (`PROJECT-BLUEPRINT.md` §5, principio 5) mientras el volumen no lo justifique. Cambiar a vista materializada es una decisión de rendimiento documentada como posible en `07-ENTERPRISE-DATA-PLATFORM.md` §8, no un estándar vigente hoy.

## 6. Compatibilidad y deprecación

- **Nunca se elimina una columna o tabla en uso** sin verificar primero, contra el código real, que ningún `.select()`/`.insert()`/`.update()` la referencia (`CLAUDE.md` §2, punto 1 — ya hay precedente de documentos que asumieron código inexistente).
- **Deprecar es documentar "ya no se usa" en `DATABASE.md`, no borrar la columna de inmediato** — el borrado físico de estructura (a diferencia del de datos) requiere una ventana de verificación explícita antes de ejecutarse.
- **Ningún cambio de esquema rompe una política RLS existente sin verificar el efecto combinado** — la lección de §7 aplica en ambas direcciones: una política nueva puede bloquear silenciosamente una operación que otra política sí permitía.

## 7. Estándar derivado del bug de `v16`/`v18` — RLS de UPDATE vs. políticas de SELECT

Hallazgo elevado a estándar de diseño obligatorio para todo esquema futuro, no solo nota histórica:

> **Postgres exige que la fila resultante de un `UPDATE` siga satisfaciendo las políticas de `SELECT` aplicables, además de pasar el `WITH CHECK` de la política de `UPDATE`.** Si una política de `SELECT` filtra por una columna (por ejemplo, `deleted_at IS NULL`), cualquier `UPDATE` de cliente que mueva esa columna fuera del valor permitido por `SELECT` será rechazado con "new row violates row-level security policy" — **sin importar el rol**, incluido `super_admin`. Este comportamiento fue la causa real (no un problema de permisos) del bug corregido en `v18` (`DATABASE.md` §2).

**Regla de diseño derivada, aplicable a toda tabla nueva con una columna de visibilidad condicional** (`deleted_at`, o cualquier futura columna tipo `archived`/`hidden`/`status = 'oculto'`):

1. Si el cambio de esa columna debe poder hacerlo el cliente directamente vía `.update()`, verificar explícitamente que la política de `SELECT` no la excluya — o aceptar que ese `UPDATE` específico requerirá una función `security definer` dedicada (patrón `soft_delete_actividades()`), no un `.update()` directo.
2. Toda función `security definer` que exista para sortear este problema debe validar el rol/autorización **dentro de la función misma**, replicando la lógica de la política que evita — nunca asumir que "ser `security definer`" ya es suficiente autorización.
3. Este checklist se agrega también a `07-ENTERPRISE-DATA-PLATFORM.md` (checklist general) para que se revise en cada cambio de esquema, no solo se recuerde por este documento.

## 8. Nombrado de funciones RPC de escritura privilegiada

Cuando una operación requiere una función `security definer` por el motivo de §7 (o cualquier otro que amerite escritura privilegiada), el nombre debe seguir: `<verbo>_<entidad>(...)`, plural si opera en lote (`soft_delete_actividades(p_ids bigint[])`), singular si opera en una sola fila. Parámetros con prefijo `p_` para distinguirlos de columnas dentro del cuerpo de la función (ya establecido en `v18`).
