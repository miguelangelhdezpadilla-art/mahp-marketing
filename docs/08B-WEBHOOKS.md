# WEBHOOKS — Diseño Oficial de Webhooks de MAHP

> MDS-009, Documento 3 de 10. Eventos, disparadores, payloads, seguridad,
> reintentos, versionado, logs y auditoría de webhooks — tanto salientes
> (MAHP notifica a terceros) como entrantes (terceros notifican a MAHP).
>
> **Estado: [FUTURO] en su totalidad** — no existe hoy ningún webhook,
> saliente ni entrante, en producción. Este documento diseña ambos sin
> implementarlos, conforme a las reglas de MDS-009.
>
> Última actualización: 2026-07-12.

---

## 1. Webhooks salientes (MAHP → terceros)

Notifican a un sistema externo cuando ocurre un evento de dominio en MAHP. Reutilizan el mismo catálogo de eventos que alimenta Notificaciones in-app y el futuro motor de Automatizaciones (`08F-EVENT-ARCHITECTURE.md`, `06A-INTEGRATIONS.md` §6) — **no es un sistema de eventos paralelo**, es un consumidor más del mismo catálogo.

### Disparadores

Cualquier evento ya cubierto por triggers existentes es candidato directo (`DATABASE.md` §6–7): actividad asignada, avance reportado, actividad completada, evidencia subida. Extensión propuesta para cuando se active: actividad creada, actividad eliminada (soft delete), meta de seguidores alcanzada.

### Payload

```json
{
  "event": "actividad.completada",
  "company_id": 1,
  "occurred_at": "2026-07-12T19:34:15.222Z",
  "data": {
    "activity_id": 49,
    "titulo": "...",
    "assigned_to": "uuid",
    "campaign_id": 3
  }
}
```

Convención: `event` en formato `dominio.acción` (`actividad.completada`, `seguidores.meta_alcanzada`), en inglés/español mixto consistente con el resto del sistema (`07C-DATABASE-STANDARDS.md` §1) — se usa el nombre real de la entidad tal como vive en la base de datos, no una traducción nueva.

## 2. Webhooks entrantes (terceros → MAHP)

El caso de uso principal identificado: pagos (Stripe/Mercado Pago, `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §12) — "webhook entrante → Edge Function → actualiza `companies`/futura tabla `subscriptions`". Patrón general para cualquier webhook entrante futuro:

1. Edge Function dedicada por proveedor (`stripe-webhook`, nunca un endpoint genérico que intente parsear cualquier proveedor).
2. Validar la firma del webhook con el secreto del proveedor (`Deno.env.get('STRIPE_WEBHOOK_SECRET')`) **antes** de procesar el body — nunca confiar en el payload sin verificar que vino realmente del proveedor.
3. Responder `200` rápido (menos de unos segundos) y procesar el efecto de forma que no bloquee la respuesta si el proveedor tiene su propio timeout — Stripe, por ejemplo, reintenta si no recibe `200` a tiempo.
4. Aplicar idempotencia (`08A-API-STANDARDS.md` §10) — un webhook de pago puede llegar duplicado por diseño del proveedor, MAHP debe poder recibirlo dos veces sin duplicar el efecto.

## 3. Seguridad

- **Salientes**: el endpoint del cliente lo configura el propio `company_admin` (§/`08-ENTERPRISE-INTEGRATION-PLATFORM.md` §8) — MAHP firma cada payload con un secreto único por empresa (HMAC-SHA256 en un header `X-MAHP-Signature`), para que el receptor pueda verificar que el webhook realmente vino de MAHP.
- **Entrantes**: se valida la firma del proveedor externo (Stripe, Meta) según su propio esquema — nunca se procesa un webhook entrante sin esa validación, sin excepción, incluso en desarrollo.
- Ninguna URL de webhook ni secreto de firma se expone en respuestas de API ni en logs de cliente (`CLAUDE.md` §5 aplicado a este dominio).

## 4. Reintentos

Salientes: backoff exponencial (ej. 1 min, 5 min, 30 min, 2 h, luego abandonar y notificar al `company_admin` que el endpoint dejó de responder) — nunca bloquea la operación interna de MAHP por un webhook fallido (`06F-INTEGRATIONS.md` §6, principio ya fijado ahí). Entrantes: MAHP debe responder rápido y de forma idempotente precisamente porque el proveedor externo decide su propia política de reintento, fuera del control de MAHP.

## 5. Versionado

Mismo estándar de `08H-VERSIONING.md`: el payload de un evento lleva su propio campo de versión (`"schema_version": 1`) desde el primer webhook que se construya, para poder evolucionar el payload sin romper integraciones existentes de clientes.

## 6. Logs

**[FUTURO]**: tabla `webhook_deliveries` (`company_id`, `event`, `url`, `status_code`, `attempt`, `delivered_at`, `payload`) — permite a un `company_admin` ver el historial de entregas de sus propios webhooks (éxito/fallo), consistente con el principio de que el historial es append-only donde importa la trazabilidad (`PROJECT-BLUEPRINT.md` §5, principio 4).

## 7. Auditoría

La configuración de un webhook (URL agregada/eliminada) es un evento administrativo — debería registrarse en `audit_log` siguiendo el mismo criterio ya señalado como gap en `07F-SECURITY-AND-AUDIT.md` §5 (cobertura de eventos operativos). Este documento no resuelve ese gap, lo hereda y lo extiende: un webhook mal configurado o secuestrado es, además de un problema técnico, un problema de auditoría.

---

## KPIs

| KPI | Definición |
|---|---|
| Tasa de entrega exitosa | % de webhooks salientes entregados con `2xx` en el primer intento |
| Tiempo de recuperación | Tiempo entre primer fallo y entrega exitosa (tras reintentos) |
| Webhooks abandonados | % que agotan reintentos sin éxito — señal de endpoints de cliente mal mantenidos |
| Latencia de procesamiento entrante | Tiempo entre recepción de un webhook entrante y efecto reflejado en MAHP |
