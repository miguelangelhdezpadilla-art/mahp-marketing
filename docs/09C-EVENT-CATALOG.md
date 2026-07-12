# EVENT CATALOG — Catálogo de Eventos Empresariales

> MDS-010, Documento 4 de 10. Extiende `08F-EVENT-ARCHITECTURE.md` §2 con el
> catálogo completo de eventos de negocio pedido por esta fase. Formato por
> evento: Origen, Destino, Prioridad, Impacto, Consumidores, Acciones
> asociadas. No se repiten aquí los eventos ya catalogados en `08F` — se
> referencian y se agregan solo los nuevos.
>
> Prioridad: 🔴 Alta (afecta dinero/acceso/reputación) · 🟡 Media (afecta
> operación) · 🟢 Baja (informativo).
>
> Última actualización: 2026-07-12.

---

## Ya catalogados en `08F-EVENT-ARCHITECTURE.md` §2 — no se repiten

`actividad.creada`, `actividad.asignada`, `actividad.completada`, `actividad.eliminada`, `avance.reportado`, `evidencia.subida`, `seguidores.meta_alcanzada`, `campana.creada`, `integracion.token_vencido`, `webhook.entrega_fallida`, `api.rate_limit_excedido`, `ia.calendario_generado`, `ia.calendario_publicado`, `usuario.invitado`, `usuario.acceso_revocado`, `usuario.sesion_iniciada`, `empresa.creada`, `integracion.conectada`, `integracion.desconectada`.

---

## Eventos nuevos de esta fase

### `empresa.creada` — ya catalogado, referencia cruzada

Ver `08F-EVENT-ARCHITECTURE.md` §2, tabla de eventos de sistema.

### `usuario.invitado` — ya catalogado, referencia cruzada

Ver `08F-EVENT-ARCHITECTURE.md` §2, tabla de eventos de usuario.

### `campana.publicada`

- **Origen**: `company_admin` cambia `campaigns.status` a `activa` (distinto de `campana.creada`, que es la inserción — este evento es la activación explícita, si el flujo de negocio llegara a separar "creada en borrador" de "publicada" — hoy `campaigns.status` nace `activa` por defecto, `DATABASE.md` §4, así que este evento es **[FUTURO]** condicionado a que se introduzca un estado de borrador).
- **Destino**: equipo de la empresa (colaboradores con actividades en esa campaña).
- **Prioridad**: 🟡 Media.
- **Impacto**: visibilidad de campaña para todo el equipo.
- **Consumidores**: notificaciones, futuro workflow de "onboarding de campaña" (`09D-AUTOMATION-TEMPLATES.md`).
- **Acciones asociadas**: notificar al equipo asignado; disparar plantilla de recordatorio de KPIs.

### `actividad.vencida`

- **Origen**: cálculo periódico (no un trigger 1:1 — requiere comparar `actividades.fecha < hoy AND status != 'completada'`, evaluado por el Job Scheduler, `09F-JOB-SCHEDULER.md`, no por un trigger de escritura).
- **Destino**: colaborador asignado, escalando a `company_admin`/`director` si persiste.
- **Prioridad**: 🟡 Media.
- **Impacto**: operativo — señal de que el trabajo no se está completando a tiempo.
- **Consumidores**: Notification Engine (`09H`), plantilla de recordatorio (`09D`).
- **Acciones asociadas**: notificar; si sigue vencida tras N días, escalar (ver diagrama de ejemplo en `09-ENTERPRISE-AUTOMATION-PLATFORM.md` §12).

### `contenido.aprobado` / `contenido.rechazado`

- **Origen**: resolución de un flujo de aprobación (`09G-APPROVAL-WORKFLOWS.md`) sobre contenido generado por IA o creado manualmente.
- **Destino**: quien solicitó la aprobación (autor del contenido, o el agente de IA que lo generó como contexto para IA Orchestration, `09E`).
- **Prioridad**: 🟡 Media.
- **Impacto**: desbloquea (aprobado) o detiene (rechazado) la publicación.
- **Consumidores**: Workflow Engine (continúa o cancela el workflow que esperaba la aprobación), notificaciones.
- **Acciones asociadas**: si aprobado, continuar el workflow (publicar); si rechazado, notificar al autor con el motivo.

### `seguidores.meta_alcanzada` — ya catalogado, referencia cruzada

Ver `08F-EVENT-ARCHITECTURE.md` §2, tabla de eventos de negocio.

### `integracion.fallida`

- **Origen**: un adaptador de integración (`08-ENTERPRISE-INTEGRATION-PLATFORM.md` §2) recibe un error no relacionado con token vencido (que ya es `integracion.token_vencido`, `08F` §2) — ej. el proveedor externo está caído, o rechaza la solicitud por otro motivo.
- **Destino**: `company_admin` de la empresa afectada.
- **Prioridad**: 🔴 Alta si la integración es crítica para un workflow en curso (ej. una publicación programada); 🟡 Media si es una sincronización de métricas no urgente.
- **Impacto**: un workflow que dependía de esa integración se detiene y requiere atención (`09A-WORKFLOW-ENGINE.md` §8, manejo de errores).
- **Consumidores**: Notification Engine, Workflow Engine (marca el paso como fallido).
- **Acciones asociadas**: notificar; reintentar según política de la acción (`09A` §7).

### `ia.tarea_completada`

- **Origen**: un agente de IA (`05-AI-ECOSYSTEM.md`) termina su parte de una cadena de orquestación (`09E-AI-ORCHESTRATION.md`).
- **Destino**: el siguiente agente en la cadena, o el workflow que lo invocó si es el último paso.
- **Prioridad**: 🟢 Baja (informativo, interno a la orquestación).
- **Impacto**: avanza el workflow al siguiente paso.
- **Consumidores**: Workflow Engine, AI Orchestration.
- **Acciones asociadas**: pasar el resultado como contexto de entrada al siguiente paso (`05-AI-ECOSYSTEM.md` §11, patrón "cadena").

### `pago.recibido`

- **Origen**: webhook entrante de Stripe/Mercado Pago (`08C-INTEGRATIONS-CATALOG.md`, ambos [FUTURO]).
- **Destino**: `super_admin` (gestión de cuenta), `company_admin` (confirmación).
- **Prioridad**: 🔴 Alta — afecta directamente acceso/facturación.
- **Impacto**: activa o mantiene activo el acceso de la empresa.
- **Consumidores**: actualización de `companies.active`/futura `subscriptions`, `audit_log`.
- **Acciones asociadas**: confirmar acceso; si es un pago fallido en vez de recibido (evento hermano `pago.fallido`, mismo origen), iniciar flujo de aviso antes de suspender.

### `sucursal.agregada`

- **Origen**: alta de una sucursal — depende directamente de que exista el modelo de datos de Franquicias/Sucursales (`07A-DOMAIN-MODEL.md` §18, [FUTURO], bloqueado por decisión de modelo no tomada).
- **Destino**: `company_admin` de la empresa matriz.
- **Prioridad**: 🟢 Baja.
- **Impacto**: habilita filtrado y reportes por sucursal.
- **Consumidores**: dashboard, futuros reportes consolidados.
- **Acciones asociadas**: ninguna crítica — principalmente informativo hasta que existan workflows específicos de franquicias (`09D-AUTOMATION-TEMPLATES.md`, plantillas de Franquicias/Restaurantes).
- **Nota de coherencia**: este evento es **doblemente [FUTURO]** — no solo falta el motor de automatización (alcance de esta fase), falta el modelo de datos mismo que lo originaría (alcance de MDS-008, ya señalado como bloqueado ahí). Se documenta aquí para completar el catálogo pedido por MDS-010, no porque esté más cerca de construirse que el resto.

### `documento.actualizado`

- **Origen**: interpretado en el contexto de MAHP como actualización de contenido estratégico (`strategies`, `07A-DOMAIN-MODEL.md` §7) o de un archivo adjunto (Google Drive, `08C-INTEGRATIONS-CATALOG.md`) — MAHP no tiene hoy un concepto genérico de "documento" más allá de estos dos.
- **Destino**: lectores habituales del documento (`director`/`collaborator` para `strategies`).
- **Prioridad**: 🟢 Baja.
- **Impacto**: informativo.
- **Consumidores**: notificaciones, futuro registro de versiones (`07D-DATA-LIFECYCLE.md` §5, hoy `strategies` no versiona ediciones — este evento asume que se agregaría esa capacidad si se activa).
- **Acciones asociadas**: notificar a quienes ya leyeron la versión anterior.

---

## Tabla resumen de prioridad

| Prioridad | Eventos |
|---|---|
| 🔴 Alta | `pago.recibido`/`pago.fallido`, `integracion.fallida` (si bloquea un workflow en curso) |
| 🟡 Media | `campana.publicada`, `actividad.vencida`, `contenido.aprobado`/`rechazado`, `integracion.fallida` (no bloqueante) |
| 🟢 Baja | `ia.tarea_completada`, `sucursal.agregada`, `documento.actualizado` |

## Regla de gobierno de este catálogo

Ningún evento nuevo se agrega a este catálogo sin: nombre en formato `dominio.acción` (`08B-WEBHOOKS.md` §1), al menos un consumidor real o planeado, y clasificación de prioridad — mismo estándar de validación ya fijado en `09B-BUSINESS-RULES-ENGINE.md` §6 para las reglas que lo consumen.
