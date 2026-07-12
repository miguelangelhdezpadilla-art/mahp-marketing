# DATA LIFECYCLE — Ciclo de Vida de los Datos

> MDS-008, Documento 5 de 10. El recorrido completo de un dato en MAHP:
> creación, validación, uso, actualización, versionado, archivado,
> eliminación lógica, recuperación y eliminación definitiva.
>
> Última actualización: 2026-07-12.

---

## 1. Creación

Todo dato operativo nace de una acción de un rol autorizado (nunca de un proceso de sistema sin actor identificable, salvo triggers de derivación — §3). En el momento de creación:

- Se asigna `company_id` automáticamente por contexto de sesión (`resolveCompanyId()`, `js/supabaseClient.js`) — nunca elegido libremente por el cliente en un campo de formulario.
- Se aplica la política `insert` de RLS antes que cualquier lógica de negocio adicional.
- Los campos derivados (`progress_pct`, `status` por defecto) nacen con su valor inicial fijo, no calculado por el cliente.

## 2. Validación

Ver `07B-DATA-GOVERNANCE.md` §4 para las tres capas (constraints → RLS → cliente). En el ciclo de vida, la validación ocurre **antes** de que el dato exista, no después — MAHP no tiene un estado "borrador inválido" persistido; si la validación falla, no hay fila.

## 3. Uso

Un dato "en uso" es leído por los roles que su política de `select` permite, potencialmente muchas veces, sin que la lectura lo modifique. Excepción explícita: `notifications.read` cambia como efecto secundario de que el destinatario abra el panel — es la única lectura del sistema que también escribe, y está documentada así intencionalmente (`MODULOS.md` #20).

## 4. Actualización

Sigue la regla de propiedad de `07B` §1: el rol autorizado actualiza directo vía RLS, o un trigger `security definer` actualiza un campo derivado. Ejemplo del segundo caso: cuando un `collaborator` inserta en `activity_updates`, no está "actualizando `actividades`" desde su perspectiva — está reportando un avance; es `sync_activity_progress()` quien traduce eso en una actualización de `actividades.progress_pct`/`status`.

## 5. Versionado (del dato, no del esquema)

MAHP versiona el **esquema** por archivo (`07C` §2), pero no versiona automáticamente cada **fila** — no hay tabla de historial genérica tipo "audit trail de cualquier cambio". Donde el versionado de datos importa para el negocio, existe una tabla dedicada `append-only`:

| Qué se versiona | Tabla | Nota |
|---|---|---|
| Avance de una tarea a lo largo del tiempo | `activity_updates` | Cada reporte es una fila nueva, nunca se sobreescribe el anterior |
| Conteo de seguidores por canal | `follower_logs` | Cada reporte (`before_count`/`after_count`) es una fila nueva |
| Puntos otorgados | `points_log` | Cada evento de gamificación es una fila nueva, nunca se recalcula "el total" y se sobreescribe |

Fuera de estos tres casos, una actualización sobreescribe el valor anterior sin dejar rastro explícito — aceptable porque no son datos donde la evolución en el tiempo sea, en sí misma, información de negocio (el título de una actividad no necesita historial de ediciones).

## 6. Archivado

Ver `07B-DATA-GOVERNANCE.md` §8 — no hay archivado físico hoy, es [FUTURO] y depende de volumen real, no de una fecha planeada.

## 7. Eliminación lógica (soft delete)

El patrón estándar del sistema, y el que motivó el hallazgo más significativo de esta fase de documentación:

```
Estado inicial: deleted_at = NULL (visible)
        │
        │  usuario autorizado pide "eliminar"
        ▼
Antes de v18:  UPDATE actividades SET deleted_at = now() WHERE id = X
               ──▶ RLS rechaza SIEMPRE, para cualquier rol, con
                   "new row violates row-level security policy"
               Causa: actividades_select exige deleted_at IS NULL:
               la fila resultante del UPDATE deja de ser "visible"
               según esa política, y Postgres exige que la fila
               resultante de un UPDATE siga pasando las políticas
               de SELECT aplicables, no solo el WITH CHECK del UPDATE.

Desde v18:     SELECT soft_delete_actividades(ARRAY[X])
               ──▶ función security definer, hace el UPDATE
                   internamente sin volver a evaluar la política
                   de SELECT contra la fila ya marcada
               ──▶ éxito, deleted_at = now()

Estado final: deleted_at = timestamp (invisible para lectura normal,
              preservado íntegro en la base de datos)
```

Este es el ejemplo canónico, verificado en producción el 2026-07-12, de por qué "borrar" en MAHP nunca es un `.update()` de cliente ingenuo sobre una columna que la propia política de `SELECT` protege — es el caso de estudio que fundamenta el estándar de `07C-DATABASE-STANDARDS.md` §7.

## 8. Recuperación

Operación de soporte, no de interfaz (ver `07B` §10): `update ... set deleted_at = null`. Como no hay UI, requiere `super_admin` con acceso al SQL Editor. El dato nunca se pierde en este paso — el soft delete garantiza que la recuperación sea trivial mientras no se llegue a §9.

## 9. Eliminación definitiva

Único paso irreversible del ciclo. Reservado exclusivamente a `super_admin`, únicamente vía SQL Editor (política `actividades_delete`, nunca expuesta en ninguna pantalla — `DATABASE.md` §2). No existe hoy un proceso automático que purgue filas con `deleted_at` antiguo — toda eliminación física es una decisión manual, puntual y deliberada, nunca una tarea programada.

---

## Diagrama — ciclo completo

```
 Creación ──▶ Validación ──▶ Uso (lectura repetida) ──▶ Actualización
                                                              │
                                        ┌─────────────────────┘
                                        ▼
                              [opcional] Versionado append-only
                              (activity_updates / follower_logs /
                               points_log)
                                        │
                                        ▼
                              Eliminación lógica (soft delete,
                              vía función security definer, v18+)
                                        │
                          ┌─────────────┴─────────────┐
                          ▼                             ▼
                   Recuperación                 Eliminación definitiva
                   (SQL Editor,                 (SQL Editor,
                   super_admin)                 super_admin, irreversible)
```
