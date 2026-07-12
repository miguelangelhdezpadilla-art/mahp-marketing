# DATA DICTIONARY — Diccionario de Datos de MAHP

> MDS-008, Documento 8 de 10. Glosario de negocio de los términos y campos
> más usados del sistema, pensado para que cualquier persona (no solo
> ingeniería) entienda qué significa cada dato. La referencia técnica
> columna-por-columna, con tipos exactos, ya existe y es la fuente de
> verdad — `DATABASE.md`; este documento no la duplica, la traduce.
>
> Última actualización: 2026-07-12.

---

## 1. Referencia rápida de tablas

| Tabla | Qué es, en una frase | Detalle técnico |
|---|---|---|
| `companies` | La empresa cliente | `DATABASE.md` §3 |
| `profiles` | Una persona con acceso al sistema | `DATABASE.md` §3 |
| `invites` | Una invitación pendiente o usada | `DATABASE.md` §3 |
| `audit_log` | Bitácora de eventos administrativos | `DATABASE.md` §7 |
| `campaigns` | Un esfuerzo de marketing con objetivo | `DATABASE.md` §4 |
| `actividades` | Una tarea de marketing programada | `DATABASE.md` §2 |
| `kpis` | Un objetivo medible | `DATABASE.md` §4 |
| `activity_updates` | Un reporte de avance de una tarea | `DATABASE.md` §4 |
| `evidencias` | Un archivo que prueba que se hizo una tarea | `DATABASE.md` §4 |
| `strategies` | Una guía de dirección publicada por la empresa | `DATABASE.md` §7 |
| `social_channels` | Un canal de red social de la empresa | `DATABASE.md` §5 |
| `follower_logs` | Un reporte de conteo de seguidores | `DATABASE.md` §5 |
| `follower_goals` | Una meta de seguidores por canal | `DATABASE.md` §5 |
| `points_log` | Un punto de gamificación otorgado | `DATABASE.md` §6 |
| `notifications` | Un aviso dentro de la app | `DATABASE.md` §7 |

## 2. Glosario de términos de negocio

**Actividad** — la unidad de trabajo mínima del sistema; una tarea de marketing con fecha, canal y responsable. No confundir con "evento de calendario" (la actividad *es* lo que se muestra en el calendario, no dos cosas separadas).

**Avance** — un reporte de progreso sobre una actividad, hecho por quien la ejecuta. Un avance no reemplaza al anterior, se acumula (ver `activity_updates` en §1).

**Campaña** — el "para qué" de un grupo de actividades. Una actividad puede no pertenecer a ninguna campaña (trabajo operativo suelto), pero una campaña sin actividades no tiene forma de ejecutarse.

**Colaborador** (`collaborator`) — el rol que ejecuta el trabajo. Ve y edita únicamente lo que tiene asignado.

**Director** (`director`) — el rol que supervisa sin ejecutar ni administrar. Acceso de solo lectura al calendario y visibilidad completa de reportes/KPIs de su empresa.

**Administrador de empresa** (`company_admin`) — el rol que opera la cuenta del lado del cliente: crea actividades, campañas, invita colaboradores, publica estrategia.

**Super administrador** (`super_admin`) — el rol del proveedor de la plataforma (MAHP), no de la empresa cliente. Ve y opera cualquier empresa vía impersonación, con permisos que ninguna empresa cliente tiene (por ejemplo, borrado físico real).

**Empresa** (`company`) — el cliente de MAHP; el límite de aislamiento de todo dato operativo.

**Evidencia** — el archivo (imagen/video) que respalda que una actividad realmente se ejecutó.

**Gamificación / Puntos** — reconocimiento automático (nunca manual) por completar tareas, reportar avance o subir evidencia. Ningún punto se otorga por acción del cliente directamente — siempre por un trigger que reacciona a un evento real.

**Meta de seguidores** — el objetivo fijado por canal social, con dos formas de medirlo: meta total (`goal_total`, un número absoluto a alcanzar) y meta de ganancia (`goal_gain`, cuánto crecer desde ahora).

**Multiempresa / Multi-tenant** — el diseño donde una sola base de datos sirve a muchas empresas, aisladas entre sí por `company_id` y RLS, nunca por bases de datos separadas (ver `07H-MULTI-TENANT-DESIGN.md`).

**RLS (Row Level Security)** — el mecanismo de PostgreSQL que decide, fila por fila, quién puede ver o modificar qué. En MAHP es la única autoridad real de permisos (`07F-SECURITY-AND-AUDIT.md` §1).

**Soft delete (borrado suave)** — marcar un dato como eliminado (`deleted_at`) sin borrarlo físicamente. Es el comportamiento por defecto de "eliminar" en toda la interfaz (`07D-DATA-LIFECYCLE.md` §7).

**Trigger** — una regla automática de la base de datos que reacciona a un evento (por ejemplo, insertar un avance) escribiendo otro dato (actualizar el progreso de la actividad) sin que el cliente tenga que hacerlo explícitamente.

## 3. Campos que aparecen en más de una tabla (y significan lo mismo en todas)

| Campo | Significado consistente en todo el sistema |
|---|---|
| `company_id` | La empresa dueña de este dato — nunca opcional en una tabla operativa, salvo para `super_admin` |
| `created_at` | Momento de creación, siempre `timestamptz`, nunca editable después de creado |
| `deleted_at` | `NULL` = visible/activo; con valor = eliminado lógicamente (`07D` §7) |
| `active` | Interruptor de disponibilidad (empresa desactivada, usuario con acceso revocado) — no es un soft delete, es un estado operativo reversible desde el primer diseño |
| `status` | Estado de ciclo de vida propio de cada entidad (`actividades.status`: `pendiente`/`en_progreso`/`completada`; `campaigns.status`: `activa`/...) — el conjunto de valores válidos no es el mismo entre tablas, solo el nombre del campo |

## 4. Notas de traducción español/inglés

El sistema mezcla español (dominio de negocio: `titulo`, `canal`, `actividades`) e inglés (infraestructura: `status`, `company_id`, `created_at`) de forma ya establecida y consistente — no es inconsistencia, es la convención documentada en `07C-DATABASE-STANDARDS.md` §1: los nombres nuevos siguen el idioma de lo que ya existe en su tabla, no se fuerza un idioma único retroactivamente.
