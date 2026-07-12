# EVENT ARCHITECTURE — Arquitectura de Eventos

> MDS-009, Documento 7 de 10. Catálogo formal de eventos de negocio,
> técnicos, de IA, de usuario y de sistema — la base compartida que
> consumen Notificaciones (ya existe), Webhooks (`08B`, futuro) y el motor
> de Automatizaciones (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §13, futuro,
> territorio de MDS-010).
>
> Última actualización: 2026-07-12.

---

## 1. MAHP ya es orientado a eventos — internamente

No se está introduciendo un concepto nuevo: los triggers de Postgres (`DATABASE.md` §6–7) **son** manejadores de eventos, solo que síncronos y acoplados 1:1 a un evento de base de datos (`07-ENTERPRISE-DATA-PLATFORM.md` §5). Lo que este documento agrega es un **catálogo formal y nombrado** de esos eventos, para que webhooks, automatizaciones e IA puedan suscribirse al mismo vocabulario en vez de que cada consumidor futuro reinvente su propia lista.

## 2. Catálogo de eventos

### Eventos de negocio

| Evento | Disparador real hoy | Consumidores actuales | Consumidores futuros |
|---|---|---|---|
| `actividad.creada` | `insert` en `actividades` | — | Webhooks, Automatizaciones |
| `actividad.asignada` | `update` de `assigned_to` | `notify_actividad_asignada` (notificación in-app) | Webhooks |
| `actividad.completada` | `status` → `completada` | `award_tarea_completada` (puntos) | Webhooks, IA (resumen) |
| `actividad.eliminada` | `deleted_at` set (vía `soft_delete_actividades`, `v18`) | — | Webhooks, Auditoría (`07F` §5, gap) |
| `avance.reportado` | `insert` en `activity_updates` | `sync_activity_progress`, `award_avance_reportado` | Webhooks |
| `evidencia.subida` | `insert` en `evidencias` | `award_evidencia_subida` | Webhooks |
| `seguidores.meta_alcanzada` | Cálculo sobre `follower_goals_progress` | — | Webhooks (requiere lógica de umbral nueva, no un trigger 1:1 existente) |
| `campana.creada` | `insert` en `campaigns` | — | Webhooks |

### Eventos técnicos

| Evento | Origen | Consumidores |
|---|---|---|
| `integracion.token_vencido` | Adaptador detecta `401`/expiración al llamar a un proveedor | Notificación a `company_admin` (`06F-INTEGRATIONS.md` §1) |
| `webhook.entrega_fallida` | Reintentos agotados (`08B-WEBHOOKS.md` §4) | Notificación a `company_admin` |
| `api.rate_limit_excedido` | `08A-API-STANDARDS.md` §9 | Log, posible suspensión temporal (`08E-SECURITY.md` §9) |

### Eventos de IA

| Evento | Origen | Consumidores |
|---|---|---|
| `ia.calendario_generado` | Respuesta de `generar-calendario` recibida | Interfaz de revisión (ya existe) |
| `ia.calendario_publicado` | `company_admin` publica lo generado | Mismo camino que `actividad.creada` — no es un evento distinto en la base de datos, es la misma escritura (`PROJECT-BLUEPRINT.md` §4: una actividad de IA vive con las mismas reglas que una manual) |

### Eventos de usuario

| Evento | Origen | Consumidores |
|---|---|---|
| `usuario.invitado` | `insert` en `invites` | `audit_log` |
| `usuario.acceso_revocado` | `update` de `profiles.active` | `audit_log` |
| `usuario.sesion_iniciada` | Login exitoso | Ninguno hoy — candidato futuro para métricas de adopción |

### Eventos de sistema

| Evento | Origen | Consumidores |
|---|---|---|
| `empresa.creada` | `insert` en `companies` | `audit_log` |
| `integracion.conectada` / `integracion.desconectada` | OAuth completado/revocado (`08E-SECURITY.md` §2) | `audit_log` (extendiendo el gap ya señalado) |

## 3. Colas

**No existe infraestructura de colas dedicada hoy** (no hay Redis, no hay broker de mensajes — `08-ENTERPRISE-INTEGRATION-PLATFORM.md` §4). El patrón propuesto para cuando se active el despacho asíncrono (webhooks salientes, automatizaciones) reutiliza Postgres mismo:

```
Evento ocurre (trigger existente)
        │
        ▼
Trigger adicional inserta una fila en tabla de cola
   (ej. webhook_queue: company_id, event, payload, status, attempts)
        │
        ▼
Edge Function "procesador de cola", invocada por pg_cron cada N minutos
        │
        ▼
Procesa filas pendientes, marca status = 'entregado'/'fallido', aplica
reintentos con backoff (08B-WEBHOOKS.md §4)
```

Es el mismo patrón ya diseñado para el motor de automatizaciones (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §13, `automation_queue`) — **no se diseña dos veces**: si MDS-010 (Enterprise Automation Platform, siguiente fase dependiente de este documento) construye `automation_queue`, el despacho de webhooks debería reutilizar la misma infraestructura de cola, no crear una tabla paralela solo para webhooks. Se señala aquí como restricción de diseño hacia adelante, no se resuelve en este documento.

## 4. Prioridades

**[FUTURO]**: cuando exista cola real, los eventos con efecto en dinero/acceso (`webhook` de Stripe, `integracion.token_vencido`) deben tener prioridad de procesamiento sobre eventos informativos (notificación de avance reportado) — no se implementa hoy porque no existe la cola misma todavía; se documenta como requisito de diseño para cuando se construya.

## 5. Observabilidad

Mismo gap ya señalado en `07-ENTERPRISE-DATA-PLATFORM.md` §11: no existe panel de observabilidad de eventos hoy. Cuando exista la cola de §3, las métricas mínimas a exponer son: eventos encolados vs. procesados vs. fallidos, latencia de procesamiento, tasa de reintentos por tipo de evento.

## 6. Límite reconocido de esta arquitectura

Postgres + `pg_cron` como motor de eventos es válido para el volumen actual y el proyectado a mediano plazo (miles de empresas, `07-ENTERPRISE-DATA-PLATFORM.md` §8) pero no es un broker de eventos de alto rendimiento — si el volumen de eventos-por-segundo llegara a un punto donde `pg_cron` cada N minutos es insuficiente (latencia inaceptable para casos de uso en tiempo real), la migración a un broker dedicado (ej. una cola gestionada) es la evolución esperada, no un fracaso del diseño actual — mismo criterio de "no construir por anticipación" ya aplicado en todo este documento.

---

## Diagrama — flujo completo de un evento, desde origen hasta los tres consumidores

```
                    Acción real en MAHP
                    (ej. colaborador completa una tarea)
                            │
                            ▼
                 UPDATE actividades SET status='completada'
                            │
              ┌─────────────┼─────────────────┐
              ▼             ▼                  ▼
   award_tarea_completada  notify_actividad_  [FUTURO] insertar en
   (puntos, v15)           asignada (no aplica  webhook_queue si hay
                            aquí, ya asignada)   webhook configurado
                                                      │
                                                      ▼
                                          Edge Function despachadora
                                          (pg_cron) → POST al endpoint
                                          del cliente (08B-WEBHOOKS.md)
```
