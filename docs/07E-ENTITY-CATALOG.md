# ENTITY CATALOG — Catálogo de Entidades de MAHP

> MDS-008, Documento 6 de 10. Especificación funcional (no SQL) de cada
> entidad real del sistema, verificada contra `DATABASE.md`. Formato por
> entidad: Descripción, Responsabilidad, Dominio, Relaciones, Propietario,
> Criticidad, Tiempo de vida, Historial, Auditoría, Uso por IA, Uso por
> reportes, Uso por automatizaciones.
>
> Criticidad: 🔴 Alta (pérdida/corrupción rompe el producto) · 🟡 Media
> (afecta un módulo, no el sistema) · 🟢 Baja (informativo/derivado).
>
> Última actualización: 2026-07-12.

---

## `companies`

- **Descripción**: la empresa cliente; unidad de aislamiento de todo el sistema.
- **Responsabilidad**: anclar `company_id` en cascada a todo dato operativo.
- **Dominio**: Core (`07A` §1).
- **Relaciones**: raíz — casi toda tabla operativa la referencia.
- **Propietario**: `super_admin`.
- **Criticidad**: 🔴 Alta.
- **Tiempo de vida**: indefinido; desactivable (`active=false`), sin borrado físico documentado en uso normal.
- **Historial**: no versionado por fila — solo `created_at`.
- **Auditoría**: evento "empresa creada" en `audit_log`.
- **Uso por IA**: ninguno directo — la IA opera dentro del contexto de una empresa ya resuelta.
- **Uso por reportes**: base de todo filtro de reporte (`company_id = X`).
- **Uso por automatizaciones**: ninguna hoy.

## `profiles`

- **Descripción**: identidad de cada persona con acceso, 1:1 con `auth.users`.
- **Responsabilidad**: resolver rol y empresa de la sesión activa.
- **Dominio**: Core (`07A` §2).
- **Relaciones**: referenciada por prácticamente toda tabla con un actor humano (`assigned_to`, `uploaded_by`, `reported_by`, `created_by`, `user_id`, `invited_by`, `actor_id`, `recipient_id`).
- **Propietario**: `super_admin` (revocación global), `company_admin` (equipo de su empresa).
- **Criticidad**: 🔴 Alta — base de `my_role()`/`my_company_id()`, de los que depende toda política RLS.
- **Tiempo de vida**: indefinido; revocable (`active=false`), sin borrado físico documentado en uso normal.
- **Historial**: no versionado por fila.
- **Auditoría**: eventos "acceso revocado/restaurado" en `audit_log`.
- **Uso por IA**: ninguno directo.
- **Uso por reportes**: nombre de colaborador en tablas de avances, historial, ranking.
- **Uso por automatizaciones**: destino de notificaciones y puntos.

## `invites`

- **Descripción**: invitación pendiente o usada, con rol y empresa predefinidos.
- **Responsabilidad**: convertir un correo en un `profile` con permisos correctos.
- **Dominio**: Core (`07A` §3).
- **Relaciones**: `companies`, `profiles` (vía `invited_by`).
- **Propietario**: `super_admin`/`company_admin` según regla de negocio de `invites_insert`.
- **Criticidad**: 🟡 Media.
- **Tiempo de vida**: hasta que `used=true`; sin expiración automática documentada.
- **Historial**: no versionado — `used` se sobreescribe.
- **Auditoría**: eventos "invitación creada/cancelada" en `audit_log`.
- **Uso por IA**: ninguno.
- **Uso por reportes**: pestaña "Invitaciones" de `admin.html`.
- **Uso por automatizaciones**: ninguna.

## `audit_log`

- **Descripción**: bitácora administrativa append-only.
- **Responsabilidad**: trazabilidad de eventos de cuenta y acceso.
- **Dominio**: Core (`07A` §4).
- **Relaciones**: `profiles` (actor), `companies`.
- **Propietario**: nadie escribe directo — solo triggers.
- **Criticidad**: 🟡 Media (informativa, no operativa).
- **Tiempo de vida**: indefinido, sin retención con expiración (`07B` §7).
- **Historial**: es en sí mismo el historial — `insert`-only.
- **Auditoría**: N/A (es la auditoría).
- **Uso por IA**: ninguno.
- **Uso por reportes**: pestaña "Actividad" de `admin.html`, solo `super_admin`.
- **Uso por automatizaciones**: ninguna — es destino, no origen.

## `campaigns`

- **Descripción**: agrupador de actividades bajo un objetivo medible.
- **Responsabilidad**: dar contexto de negocio a un conjunto de actividades y KPIs.
- **Dominio**: Marketing (`07A` §5).
- **Relaciones**: `companies`; referenciada por `actividades`, `kpis`, `follower_goals`.
- **Propietario**: `company_admin`.
- **Criticidad**: 🔴 Alta.
- **Tiempo de vida**: indefinido; sin soft delete propio hoy (`status` la marca inactiva, no `deleted_at`).
- **Historial**: no versionado por fila.
- **Auditoría**: ninguna dedicada.
- **Uso por IA**: contexto de entrada al generar calendario (`IA.md`).
- **Uso por reportes**: tabla de campañas expandible, KPIs, avances por campaña.
- **Uso por automatizaciones**: ninguna directa.

## `actividades`

- **Descripción**: la entidad central del sistema — unidad de trabajo de marketing.
- **Responsabilidad**: representar qué se hace, cuándo, por quién, con qué progreso.
- **Dominio**: Marketing (`07A` §6).
- **Relaciones**: la de más dependientes del sistema — ver `07A` §6.
- **Propietario**: `super_admin`/`company_admin` (control total), `collaborator` (subconjunto acotado de campos propios).
- **Criticidad**: 🔴 Alta — es el dato que justifica el producto.
- **Tiempo de vida**: indefinido; soft delete desde `v16` (corregido `v18`).
- **Historial**: no versionado directamente — su evolución se reconstruye vía `activity_updates`.
- **Auditoría**: no cubierta hoy por `audit_log` (gap señalado en `07B` §6, [FUTURO]).
- **Uso por IA**: destino de escritura de la generación de calendario; también origen de contexto para futuras recomendaciones.
- **Uso por reportes**: dashboard, calendarios de los 3 roles, historial de completadas, tabla de avances.
- **Uso por automatizaciones**: dispara `sync_activity_progress()`, `award_tarea_completada()`, `notify_actividad_asignada`.

## `strategies`

- **Descripción**: texto guía de dirección, sin fecha ni acción directa.
- **Responsabilidad**: dar contexto estratégico de solo lectura.
- **Dominio**: Marketing (`07A` §7).
- **Relaciones**: `companies`, `profiles` (`created_by`); sin relación estructurada a `actividades`.
- **Propietario**: `company_admin`/`super_admin`.
- **Criticidad**: 🟢 Baja.
- **Tiempo de vida**: indefinido, sin soft delete.
- **Historial**: no versionado.
- **Auditoría**: ninguna.
- **Uso por IA**: candidato natural de contexto futuro para generación de calendario (no implementado hoy).
- **Uso por reportes**: panel de estrategias directivas.
- **Uso por automatizaciones**: ninguna.

## `social_channels`, `follower_logs`, `follower_goals` (+ vistas)

- **Descripción**: canal social de la empresa, cada reporte de conteo de seguidores, y la meta fijada por canal.
- **Responsabilidad**: medir crecimiento real de audiencia, vinculado a la actividad/campaña que lo generó.
- **Dominio**: Seguidores/Redes (`07A` §8).
- **Relaciones**: `companies`, `actividades` (nullable), `campaigns` (vía metas).
- **Propietario**: `company_admin`/`director` (metas); cualquier rol autorizado reporta.
- **Criticidad**: 🟡 Media.
- **Tiempo de vida**: indefinido.
- **Historial**: `follower_logs` es append-only por diseño (cada reporte es una fila nueva).
- **Auditoría**: ninguna dedicada.
- **Uso por IA**: ninguno hoy.
- **Uso por reportes**: metas de seguidores, avance por canal, delta por campaña.
- **Uso por automatizaciones**: `delta` calculado, no insertado por el cliente.
- **⚠️ Nota de gobierno**: única familia de entidades no versionada en `.sql` (`07B` §5, `DATABASE.md` §9) — tratar como de alta confianza, no de certeza absoluta.

## `activity_updates`

- **Descripción**: cada reporte de avance de una tarea.
- **Responsabilidad**: historial verificable de progreso, con autor y fecha.
- **Dominio**: Operaciones (`07A` §9).
- **Relaciones**: `actividades`, `profiles` (dos FK — `user_id`/`authorized_by`, ver advertencia en `07A` §9).
- **Propietario**: `collaborator` (reporta lo suyo); lectura para `company_admin`/`director`.
- **Criticidad**: 🔴 Alta — es la fuente de verdad de "qué tan avanzada está" una tarea.
- **Tiempo de vida**: indefinido, append-only.
- **Historial**: es en sí mismo el historial de `actividades.progress_pct`.
- **Auditoría**: funciona como auditoría operativa implícita.
- **Uso por IA**: ninguno hoy; candidato futuro para resúmenes de avance generados por IA.
- **Uso por reportes**: tabla de avances, historial de tareas completadas.
- **Uso por automatizaciones**: dispara `sync_activity_progress()`, `award_avance_reportado()`.

## `evidencias`

- **Descripción**: referencia a un archivo (imagen/video) que respalda una tarea.
- **Responsabilidad**: prueba verificable de ejecución.
- **Dominio**: Operaciones (`07A` §10).
- **Relaciones**: `actividades` (cascade), `companies` (cascade), `profiles`.
- **Propietario**: `collaborator` sube; el resto de la empresa ve.
- **Criticidad**: 🟡 Media.
- **Tiempo de vida**: indefinido; soft delete desde `v16`, sin interfaz de borrado construida aún.
- **Historial**: no versionado — cada archivo es un registro único.
- **Auditoría**: ninguna dedicada.
- **Uso por IA**: ninguno.
- **Uso por reportes**: galería en historial de tareas completadas.
- **Uso por automatizaciones**: dispara `award_evidencia_subida()`.

## `kpis`

- **Descripción**: objetivo medible, general de empresa o de campaña.
- **Responsabilidad**: cuantificar éxito.
- **Dominio**: Analytics (`07A` §11).
- **Relaciones**: `companies`, `campaigns` (nullable).
- **Propietario**: `company_admin`.
- **Criticidad**: 🟡 Media.
- **Tiempo de vida**: indefinido.
- **Historial**: no versionado — `current_value` se sobreescribe.
- **Auditoría**: ninguna.
- **Uso por IA**: ninguno hoy.
- **Uso por reportes**: expansión de campaña, dashboard.
- **Uso por automatizaciones**: ninguna hoy — actualización manual (gap señalado en `07A` §11).

## `points_log` (+ `points_totals`, `points_by_campaign`)

- **Descripción**: cada evento de gamificación otorgado.
- **Responsabilidad**: reconocer actividad real con puntos verificables.
- **Dominio**: Gamificación (`07A` §12).
- **Relaciones**: `profiles`, `companies`, `actividades` (opcional), `campaigns` (opcional).
- **Propietario**: nadie escribe directo — solo triggers.
- **Criticidad**: 🟢 Baja (no operativa, sí valiosa para adopción).
- **Tiempo de vida**: indefinido, append-only.
- **Historial**: es en sí mismo el historial.
- **Auditoría**: funciona como auditoría de gamificación.
- **Uso por IA**: ninguno.
- **Uso por reportes**: ranking, podio, insignias.
- **Uso por automatizaciones**: alimentada por `award_tarea_completada()`, `award_avance_reportado()`, `award_evidencia_subida()`.

## `notifications`

- **Descripción**: aviso in-app de un evento relevante para un usuario.
- **Responsabilidad**: informar sin que el destinatario tenga que buscar.
- **Dominio**: Sistema (`07A` §13).
- **Relaciones**: `profiles`, `companies`.
- **Propietario**: nadie escribe directo — solo triggers.
- **Criticidad**: 🟢 Baja.
- **Tiempo de vida**: indefinido; `read` se sobreescribe, sin borrado.
- **Historial**: no versionado.
- **Auditoría**: ninguna dedicada.
- **Uso por IA**: ninguno.
- **Uso por reportes**: campanita de notificaciones.
- **Uso por automatizaciones**: alimentada al asignar/reasignar actividad o reportar/editar avance.

---

## Resumen de criticidad

| Criticidad | Entidades |
|---|---|
| 🔴 Alta | `companies`, `profiles`, `actividades`, `activity_updates`, `campaigns` |
| 🟡 Media | `invites`, `audit_log`, `evidencias`, `kpis`, `social_channels`/`follower_logs`/`follower_goals` |
| 🟢 Baja | `strategies`, `points_log`, `notifications` |

## Entidades futuras catalogadas (sin tabla hoy)

Ver `07A-DOMAIN-MODEL.md` §14–19 para IA, Configuración, Integraciones, Marketplace, Franquicias/Sucursales y Operaciones de Negocio — no se repiten aquí para no duplicar contenido; este catálogo solo describe entidades **[EXISTE]** verificadas contra el esquema real.
