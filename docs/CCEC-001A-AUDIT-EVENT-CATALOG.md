# CCEC-001A — Catálogo de Eventos de Auditoría

> Consolida los eventos de auditoría identificados en `07F`, `08E`, `08B` y
> `09I`. Formato por evento: Estado, Actor, Origen, `target_type`, Detalle
> mínimo esperado en `details`. Cualquier evento nuevo se agrega aquí en el
> mismo cambio que lo produce (`CCEC-001` §7).
>
> Última actualización: 2026-07-12.

---

## Ya construidos (`v3`, `MODULOS.md` #5)

| Evento (`action`) | Actor | `target_type` |
|---|---|---|
| `empresa_creada` | `super_admin` | `company` |
| `invitacion_creada` | `super_admin`/`company_admin` | `invite` |
| `invitacion_cancelada` | `super_admin`/`company_admin` | `invite` |
| `acceso_revocado` | `super_admin`/`company_admin` | `profile` |
| `acceso_restaurado` | `super_admin`/`company_admin` | `profile` |
| `impersonacion_iniciada` (`v19`) | `super_admin` | `company` |

## Core — pendientes (origen: `07F-SECURITY-AND-AUDIT.md` §5)

| Evento | Estado | Actor | `target_type` | Detalle mínimo en `details` |
|---|---|---|---|---|
| `impersonacion_finalizada` | 🔴 [FUTURO] — requiere detectar cierre de sesión/navegación fuera del panel, no solo el inicio | `super_admin` | `company` | duración de la sesión de impersonación |
| `rol_cambiado` | 🟡 [FUTURO] | `super_admin`/`company_admin` | `profile` | rol anterior, rol nuevo |
| `actividad_creada` | 🟢 [FUTURO] | rol que la crea | `actividad` | `company_id`, `campaign_id` si aplica |
| `actividad_editada` | 🟢 [FUTURO] | rol que la edita | `actividad` | campos modificados |
| `actividad_eliminada` | 🟢 [FUTURO] | rol que la elimina | `actividad` | referencia a `soft_delete_actividades` (`v18`) |

## Integraciones — pendientes (origen: `08E-SECURITY.md` §5, `08B-WEBHOOKS.md` §7)

| Evento | Estado | Actor | `target_type` | Detalle mínimo en `details` |
|---|---|---|---|---|
| `integracion_conectada` | [FUTURO] | `company_admin` | `integration_token` | `provider`, nunca el token en sí |
| `integracion_desconectada` | [FUTURO] | `company_admin` | `integration_token` | `provider` |
| `api_key_generado` | [FUTURO] | `company_admin` | `api_key` | `scopes` otorgados, nunca el valor del key |
| `api_key_revocado` | [FUTURO] | `company_admin` | `api_key` | motivo si se proporcionó |
| `api_key_primer_uso` | [FUTURO] | sistema (trigger de primer uso detectado) | `api_key` | endpoint invocado |
| `webhook_configurado` | [FUTURO] | `company_admin` | `webhook_endpoint` | URL (sin secreto de firma) |
| `webhook_eliminado` | [FUTURO] | `company_admin` | `webhook_endpoint` | — |

## Automatización — pendientes (origen: `09I-AUTOMATION-GOVERNANCE.md` §5)

| Evento | Estado | Actor | `target_type` | Detalle mínimo en `details` |
|---|---|---|---|---|
| `automatizacion_creada` | [FUTURO] | `company_admin` | `automation_rule` | evento que dispara, workflow asociado |
| `automatizacion_desactivada` | [FUTURO] | `company_admin` | `automation_rule` | motivo si se proporcionó |
| `automatizacion_dueno_cambiado` | [FUTURO] | `company_admin` | `automation_rule` | dueño anterior, dueño nuevo |
| `automatizacion_aprobada` / `automatizacion_rechazada` | [FUTURO] | según `09G-APPROVAL-WORKFLOWS.md` §5 | `automation_rule` | resultado, motivo |

---

## Regla de formato para eventos nuevos

`action` en `snake_case`, español, verbo en participio pasado (`_creada`, `_revocado`) — consistente con los 5 eventos ya construidos, no se introduce un formato distinto para eventos nuevos (a diferencia de los eventos de negocio de `09C-EVENT-CATALOG.md`, que usan `dominio.acción` en formato de integración — son catálogos con propósitos distintos: éste es para auditoría interna legible por `super_admin`, aquél es para consumo por webhooks/automatizaciones externas).
