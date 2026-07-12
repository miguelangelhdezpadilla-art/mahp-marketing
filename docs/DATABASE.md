# DATABASE — Marketing Activity Hub Pro

> Capítulo 12 del `PROJECT-BLUEPRINT.md`. Backend: Supabase (PostgreSQL + Row
> Level Security). No hay ORM ni migraciones automatizadas — el esquema vive
> como una secuencia de archivos `supabase_schema_vN.sql` en la raíz del
> proyecto, aplicados manualmente en el SQL Editor de Supabase, en orden.
>
> Última actualización: 2026-07-08.

---

## 1. Convenciones del esquema

- **Multi-tenant por columna, no por schema**: toda tabla operativa lleva `company_id bigint references companies(id)`. El aislamiento entre empresas se aplica con RLS, nunca confiando en que el cliente filtre correctamente.
- **Dos funciones `security definer`** hacen de base para casi todas las políticas, porque permiten leer `profiles` sin quedar atrapadas en su propia regla de seguridad:
  - `my_role() returns text` — el rol del usuario autenticado.
  - `my_company_id() returns bigint` — la empresa del usuario autenticado.
- **`profiles.id` = `auth.users.id`** (relación 1:1, no hay una tabla `users` separada).
- **El historial es append-only por diseño** en varias tablas (`activity_updates`, `points_log`, `audit_log`, `follower_logs`): no se definen políticas de `update`/`delete` para el cliente — solo `insert`, para que sirvan como bitácora confiable.
- **Los triggers usan `security definer`** para escribir en tablas que el rol invocador no podría tocar directamente (ej. un colaborador dispara `award_evidencia_subida()` al subir un archivo, pero no tiene permiso de `insert` directo sobre `points_log`).

---

## 2. `actividades` — la tabla original

Es la única tabla que **predata el sistema de versionado** (viene del `mahp.html` de un solo archivo, antes de que existiera el modelo multiempresa). No tiene un `create table` en ningún `.sql` — solo una cadena de `alter table` que la fue adaptando:

| Columna | Tipo | Agregada en | Notas |
|---|---|---|---|
| `id` | bigint (PK) | original | — |
| `titulo`, `canal`, `fecha`, `color` | text/date | original | Campos del calendario original |
| `descripcion` | text | `v7` | Separado de `canal`, que antes hacía ambas funciones |
| `company_id` | bigint → `companies(id)` | `v2` | Ancla multiempresa |
| `campaign_id` | bigint → `campaigns(id)` | `v2` | Nullable — actividad puede no pertenecer a campaña |
| `assigned_to` | uuid → `profiles(id)` | `v2` | Nullable — sin asignar hasta que alguien la tome |
| `progress_pct` | int, `0–100`, default `0` | `v2` | Sincronizado por trigger, no editado directo por el cliente |
| `status` | text, default `'pendiente'` | `v2` | `pendiente` / `en_progreso` / `completada` |
| `deleted_at` | timestamptz, nullable | `v16` | Soft delete — ver nota abajo |
| `authorized_by` (en `activity_updates`, no aquí) | — | — | Ver nota en §4 |

RLS (`v2`, reestructurada en `v16`): `company_admin`/`director` ven toda su empresa; `collaborator` solo `assigned_to = auth.uid()`; ambos filtrados además por `deleted_at is null`. Inserción y edición reservadas a `super_admin`/`company_admin` (políticas `actividades_insert`/`actividades_update`); el colaborador edita indirectamente vía `activity_updates` y un permiso acotado de campos (`actividades_collaborator_update`, `v10`).

**Soft delete (`v16`, corregido en `v18`)**: "eliminar" una actividad desde la app ya no es un `delete` físico — es un `update` que pone `deleted_at = now()`. La política `actividades_delete` (borrado físico real) quedó reservada exclusivamente a `super_admin`, y no se expone en ninguna pantalla — es solo para soporte vía SQL Editor si alguna vez hace falta purgar de verdad. El trigger `lock_campos_actividad_colaborador` (`v10`) se actualizó para que un colaborador tampoco pueda poner `deleted_at` a través de su permiso de editar sus propias tareas.

**Bug de `v16` corregido en `v18`**: como `actividades_select` exige `deleted_at IS NULL`, un `UPDATE` de cliente que mueve `deleted_at` fuera de `NULL` hace que la fila resultante deje de satisfacer esa política de SELECT — y Postgres exige que la fila resultante de un `UPDATE` siga siendo visible según las políticas de SELECT aplicables, además de pasar el `WITH CHECK` de la política de `UPDATE`. El resultado: **ningún rol, ni siquiera `super_admin`, podía marcar `deleted_at` mediante un `.update()` directo del cliente** — RLS lo rechazaba siempre con "new row violates row-level security policy", sin relación con permisos reales. `v18` introduce `soft_delete_actividades(p_ids bigint[])`, una función `security definer` (mismo patrón que `my_role()`/`my_company_id()`) que hace el `UPDATE` internamente evitando la re-evaluación de la política de SELECT contra la fila ya marcada. Tanto la opción "Eliminar" del calendario como la herramienta de borrado en lote del Super Admin (`js/empresa.js`) usan esta función vía `.rpc()` en vez de un `.update()` directo.

---

## 3. Núcleo multiempresa

### `companies` (`v2`)
`id` (PK) · `name` · `active` · `created_at`. Solo `super_admin` crea/desactiva.

### `profiles` (`v2`)
`id` (PK, = `auth.users.id`) · `role` (`super_admin`/`company_admin`/`director`/`collaborator`) · `company_id` → `companies` (nulo solo para `super_admin`) · `full_name` · `active` (default `true`, controla revocación de acceso) · `created_at`.

### `invites` (`v2`)
`id` (PK) · `email` · `role` · `company_id` → `companies` · `invited_by` → `profiles` · `used` (bool) · `created_at`. Política de inserción (`invites_insert`) es la que impone la regla de negocio: `company_admin` solo puede invitar `director`/`collaborator` de **su propia** empresa, nunca otro `company_admin`.

---

## 4. Operación: campañas, KPIs, avances, evidencias

### `campaigns` (`v2`)
`id` (PK) · `company_id` → `companies` · `name` · `objective` · `start_date` · `end_date` · `status` (default `'activa'`).

### `kpis` (`v2`)
`id` (PK) · `company_id` → `companies` · `campaign_id` → `campaigns` (nullable — vacío es KPI general de empresa, con valor es "objetivo" de esa campaña) · `name` · `target_value` · `current_value` (default `0`) · `unit` · `period` · `created_at`.

### `activity_updates` (`v2`, extendida en `v13`)
`id` (PK) · `activity_id` → `actividades` · `user_id` → `profiles` (quien reportó) · `progress_pct` (`0–100`) · `note` · `created_at` · `authorized_by` → `profiles` (nullable, `v13`) · `updated_at` (`v8`).

⚠️ **Nota de arquitectura**: esta tabla tiene **dos** columnas `uuid references profiles(id)` (`user_id` y `authorized_by`). Cualquier `.select()` que intente un embed implícito de `profiles` sin especificar cuál relación usar falla en tiempo de ejecución con *"more than one relationship was found"* — ya ocurrió una vez en producción (`js/shared/avances.js`). La forma correcta es `profiles!user_id(full_name)`, fijando la relación explícitamente.

Trigger asociado: `sync_activity_progress()` (`v2`) — cada `insert` aquí actualiza `actividades.progress_pct` y `actividades.status` automáticamente. El cliente nunca escribe esos campos directo.

### `evidencias` (`v12`, `deleted_at` agregado en `v16`)
`id` (PK) · `activity_id` → `actividades` (cascade) · `company_id` → `companies` (cascade) · `uploaded_by` → `profiles` · `file_url` · `file_type` (`check in ('image','video')`) · `file_name` · `created_at` · `deleted_at` (nullable, soft delete — ver `actividades` §2). Archivos alojados en Supabase Storage (bucket `evidencias`), la tabla solo guarda la referencia. No existe hoy ninguna función de borrado de evidencias en la interfaz — la columna queda lista para cuando se construya esa capacidad, sin requerir otra migración.

---

## 5. Seguidores por canal — ⚠️ reconstruida por uso, no verificada línea por línea

Estas tablas/vistas **no existen en ningún `supabase_schema_vN.sql`** — se crearon directamente en el SQL Editor de Supabase en algún momento sin dejar registro versionado. La estructura de abajo se reconstruyó a partir de los `.select()`/`.insert()` reales que ya corren en producción (`js/shared/seguidores.js`, `js/shared/metasSeguidores.js`, `js/shared/kpis.js`), **no de una inspección directa del esquema**. Tratar como referencia de alta confianza pero no absoluta hasta confirmarla con un `\d+ nombre_tabla` en el SQL Editor.

### `social_channels`
`id` (PK) · `company_id` → `companies` · `name` · `icon` (emoji, texto corto).

### `follower_logs`
`id` (PK) · `company_id` → `companies` · `channel_id` → `social_channels` · `activity_id` → `actividades` (nullable) · `reported_by` → `profiles` · `before_count` · `after_count` · `delta` (calculada — no se inserta desde el cliente) · `note` (nullable) · `created_at`.

**RLS confirmada directamente (única tabla de este grupo con política verificada, no solo inferida por uso):**
- `follower_logs_select`: `super_admin` o `company_id = my_company_id()` (toda la empresa, cualquier rol).
- `follower_logs_insert` (`v17`): `super_admin`, `company_admin`, `director` (agregado en `v17` — antes causaba `new row violates row-level security policy` al reportar desde `directivo.html`, ya tenía el formulario en pantalla pero la política nunca lo permitió), y `collaborator` solo sobre actividades que tiene asignadas.

### `follower_totals` *(vista)*
Columnas usadas: `channel_id`, `channel_name`, `channel_icon`, `total_actual`, `company_id`. Muy probablemente el último `after_count` por canal desde `follower_logs`.

### `follower_delta_by_campaign` *(vista)*
Columnas usadas: `channel_id`, `campaign_id`, `delta_total`. Suma de `follower_logs.delta` agrupada por canal y campaña (vía `follower_logs.activity_id → actividades.campaign_id`).

### `follower_goals` (`v14` — sí versionada)
`id` (PK) · `company_id` → `companies` · `channel_id` → `social_channels` · `campaign_id` → `campaigns` (nullable) · `goal_total` (`check > 0`) · `goal_gain` (`check > 0`) · `created_by` → `profiles` · `created_at` · `unique(company_id, channel_id)` — una sola meta activa por canal por empresa.

### `follower_goals_progress` *(vista, `v14`)*
Une `follower_goals` + `social_channels` + `follower_totals` + suma de `follower_logs.delta`: `goal_id`, `company_id`, `channel_id`, `channel_name`, `channel_icon`, `goal_total`, `goal_gain`, `campaign_id`, `total_actual`, `gain_actual`, `pct_total`, `pct_gain`.

---

## 6. Gamificación (`v15`)

### `points_log`
`id` (PK) · `company_id` → `companies` · `user_id` → `profiles` · `action` (texto libre: `tarea_completada`, `completada_antes_fecha`, `avance_reportado`, `evidencia_subida`) · `points` (int) · `activity_id` → `actividades` (nullable) · `campaign_id` → `campaigns` (nullable) · `created_at`. Solo `select` para el cliente — **únicamente los triggers insertan**, nunca la aplicación directamente.

### `points_totals` / `points_by_campaign` *(vistas)*
Suman `points_log.points` por usuario (global y por campaña respectivamente), con `full_name` ya unido desde `profiles`.

**Triggers que alimentan `points_log`:**
| Trigger | Dispara en | Otorga |
|---|---|---|
| `award_tarea_completada()` | `actividades` pasa a `status='completada'` | +50 pts, y +20 pts si `fecha >= current_date` |
| `award_avance_reportado()` | `insert` en `activity_updates` | +5 pts por cada 10% de `progress_pct` |
| `award_evidencia_subida()` | `insert` en `evidencias` | +10 pts |

---

## 7. Colaboración y sistema

### `strategies` (`v6`)
`id` (PK) · `company_id` → `companies` · `created_by` → `profiles` · `title` · `content` · `created_at`. Solo lectura para `director`/`collaborator`; solo `company_admin`/`super_admin` publican.

### `notifications` (`v5`, disparadores en `v5`/`v9`)
`id` (PK) · `company_id` → `companies` · `recipient_id` → `profiles` · `message` · `read` (default `false`) · `created_at`. Se llena vía trigger cuando se asigna/reasigna una actividad, o cuando se reporta/edita un avance — nunca insertada manualmente desde el cliente.

### `audit_log` (`v3`)
`id` (PK) · `actor_id` → `profiles` (nullable) · `company_id` → `companies` · `action` · `target_type` · `target_id` (texto) · `details` (jsonb) · `created_at`. Eventos cubiertos: empresa creada, invitación creada/cancelada, acceso revocado/restaurado.

---

## 8. Nota sobre la numeración de archivos (v1, v11)

No hay archivos perdidos. `v2`–`v13` se agregaron todos juntos en el primer commit de este repositorio — es decir, ya existían como archivos sueltos en el proyecto antes de tener control de versiones. `v1` corresponde a la tabla `actividades` original (anterior a la convención de versionado). `v11` nunca se usó — un salto en la numeración manual del historial previo a Git, confirmado revisando `git log --diff-filter=A` sobre los archivos `supabase_schema_v*.sql`.

## 9. Pendiente para cerrar el hueco de documentación

Generar (con tu aprobación, en una sesión donde tengas el SQL Editor a mano) un `supabase_schema_v16.sql` **puramente descriptivo** — sin `create table`, solo comentarios — que capture la definición exacta y verificada de `social_channels`, `follower_logs`, `follower_totals` y `follower_delta_by_campaign`, para que este documento deje de depender de inferencia por uso.
