# API STANDARDS — Convenciones Oficiales de API

> MDS-009, Documento 2 de 10. Convenciones, versionado, nomenclatura,
> respuestas, errores, paginación, filtros, ordenamiento, rate limits,
> idempotencia, manejo de fechas, compatibilidad y deprecación — el estándar
> que toda superficie de API de MAHP debe seguir, exista hoy o se construya
> mañana.
>
> Última actualización: 2026-07-12.

---

## 1. Alcance de este estándar

Aplica a dos superficies, con matices distintos:

- **PostgREST** (`API.md` §2) — ya sigue sus propias convenciones (las de PostgREST/Supabase), que MAHP no reescribe. Este documento fija cómo MAHP *usa* esas convenciones de forma consistente (embeds, vistas, RPC).
- **Edge Functions** (`API.md` §3–4) — donde MAHP sí define su propio contrato. Este documento formaliza como estándar lo que `API.md` §4 ya establecía como convención de facto para `generar-calendario`, y lo extiende a todo lo que MDS-009 diseña (adaptadores de integración, webhooks entrantes).

## 2. Convenciones generales

- **Idioma del contrato**: claves JSON en inglés (`error`, `data`, `message`), consistente con `generar-calendario` ya en producción — el español es el idioma de la interfaz, no el de los contratos de datos (`07C-DATABASE-STANDARDS.md` §1 aplicado a API).
- **Formato único**: JSON siempre, nunca XML/form-encoded en respuestas nuevas.
- **HTTPS obligatorio** — ya garantizado por Supabase/GitHub Pages, sin excepción.

## 3. Versionado

**Estado actual: sin versionado de contrato** (`API.md` §5, riesgo ya identificado). Estándar hacia adelante, desarrollo completo en `08H-VERSIONING.md`: toda Edge Function pensada para consumo externo (no solo interno del frontend de MAHP) se publica bajo un prefijo de versión desde su primer día (`/v1/nombre-funcion`), aunque hoy no exista todavía ninguna con consumidores externos reales.

## 4. Nomenclatura

- **Edge Functions**: `kebab-case`, verbo-sustantivo cuando aplica (`generar-calendario`), sustantivo-adaptador cuando es un adaptador de integración (`meta-adapter`, `stripe-webhook`) — consistente con `07C-DATABASE-STANDARDS.md` §1 adaptado a funciones de red en vez de funciones SQL.
- **Parámetros de query** (para futura API pública, §5–6): `snake_case`, en inglés (`company_id`, `created_after`), reflejando el nombre real de la columna subyacente sin traducirlo — evita una capa de mapeo innecesaria.

## 5. Respuestas

Contrato uniforme heredado de `API.md` §4, ya vigente en `generar-calendario`, formalizado aquí como estándar para toda función futura:

```json
// Éxito
{ "data": { ... } }

// Error
{ "error": "mensaje legible" }
```

Nunca mezclar ambas claves en la misma respuesta. Nunca devolver un array desnudo en la raíz (siempre envuelto en `{ "data": [...] }`) para poder agregar metadatos (paginación, §7) sin romper compatibilidad después.

## 6. Errores

| Código HTTP | Cuándo | Ya en uso |
|---|---|---|
| `400` | Petición malformada (falta un campo requerido) | ✅ `generar-calendario` |
| `401` | Sin sesión válida / token ausente o inválido | ✅ `generar-calendario` |
| `403` | Sesión válida pero sin permiso para la acción (equivalente de negocio del 42501 de RLS, ver `07C-DATABASE-STANDARDS.md` §7) | [FUTURO] |
| `404` | Recurso no encontrado | [FUTURO] |
| `409` | Conflicto (ej. token de integración ya existe para ese proveedor) | [FUTURO] |
| `429` | Rate limit excedido (§8) | [FUTURO] |
| `502` | El proveedor externo (Groq, Meta, Stripe) respondió con error | ✅ `generar-calendario` (Groq) |
| `500` | Excepción no controlada | ✅ `generar-calendario` |

Todo error trae `error` como string legible — nunca solo un código sin mensaje, siguiendo el precedente ya establecido.

## 7. Paginación

**No aplica hoy** — PostgREST ya soporta paginación nativa (`Range`/`Content-Range` headers) que el frontend actual no necesita porque los volúmenes por empresa son bajos. Estándar para cuando una futura API pública (§/`08D`) lo requiera: seguir el mismo mecanismo de PostgREST (`Range` header, `limit`/`offset` como parámetros), no inventar un esquema de paginación propio — reduce la superficie que un desarrollador externo debe aprender si ya conoce PostgREST.

## 8. Filtros y ordenamiento

Mismo principio: PostgREST ya define una sintaxis de filtros (`?status=eq.pendiente`) y orden (`?order=fecha.desc`) usada internamente por todo el frontend hoy. Cualquier API pública futura hereda esta misma sintaxis en vez de definir una nueva — es, de nuevo, la superficie que ya existe, ahora expuesta con control de acceso de terceros (`api_keys`, `08E-SECURITY.md`).

## 9. Rate Limits

**No existe hoy** (`API.md` §5, riesgo ya identificado, reafirmado aquí). Estándar para cuando se active: límites por `company_id` (no solo por IP, que no distingue empresas detrás de una misma red corporativa), con `429` + header `Retry-After`. Prioridad de implementación: **antes** de abrir cualquier API pública a terceros (§/`08` documento principal, §5) — nunca después, para no tener que retrofit-earlo bajo presión de abuso real.

## 10. Idempotencia

**No implementada hoy** en `generar-calendario` (cada invocación genera una nueva llamada a Groq, sin deduplicación). Estándar hacia adelante para operaciones de escritura expuestas externamente (webhooks entrantes como Stripe, §/`08B`): aceptar un header `Idempotency-Key` opcional, y si se repite dentro de una ventana de tiempo, devolver la respuesta original cacheada en vez de repetir el efecto — estándar de la industria para webhooks de pago, aplicable en cuanto exista un webhook entrante real (Stripe/Mercado Pago).

## 11. Manejo de fechas

Mismo estándar que `07C-DATABASE-STANDARDS.md` §4 aplicado al borde de la API: toda fecha/hora en JSON viaja en **ISO 8601 con zona horaria** (`2026-07-12T19:34:15.222Z`), nunca como timestamp Unix ni como fecha local sin zona — evita la ambigüedad ya identificada como principio de diseño de datos, ahora aplicada también al contrato externo.

## 12. Buenas prácticas heredadas de incidentes reales

- **Nunca asumir una relación implícita sin fijarla** — aplicado a una futura API pública: si se expone un embed tipo PostgREST de una tabla con FK ambigua (`activity_updates`), el endpoint público debe fijar la relación igual que ya lo hace el cliente interno (`DATABASE.md` §4).
- **Nunca hardcodear secretos** — todo secreto de proveedor externo vive como variable de entorno de Edge Function, nunca en código ni en respuesta de API (`API.md` §4, `CLAUDE.md` §5).
- **Manejar `OPTIONS` (CORS) antes que cualquier otra lógica** — ya estándar en `generar-calendario`, se mantiene para toda función nueva.

## 13. Compatibilidad y deprecación

Ninguna Edge Function o endpoint público, una vez tenga un consumidor externo real, cambia su contrato de forma incompatible sin: (1) publicar una nueva versión (`/v2/`) en paralelo, (2) anunciar una fecha de retiro de la versión anterior, (3) mantener ambas versiones activas durante esa ventana. Hoy esto no aplica a `generar-calendario` porque su único consumidor es el propio frontend de MAHP, desplegado junto con cualquier cambio de contrato — la regla se activa el día que exista un consumidor que MAHP no controle directamente.

---

## KPIs de este estándar

Ver consolidado en `08-ENTERPRISE-INTEGRATION-PLATFORM.md` Entregable Final §5. Específicos de este documento: % de Edge Functions que siguen el contrato de error uniforme (hoy: 1 de 1 — 100%), tiempo de respuesta p95 por función, tasa de error 5xx.
