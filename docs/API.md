# API — Marketing Activity Hub Pro

> Capítulo 22 del `PROJECT-BLUEPRINT.md`. MAHP no tiene un backend propio con
> endpoints REST escritos a mano — la "API" es la combinación de PostgREST
> (autogenerado por Supabase sobre Postgres) y una única Edge Function.
>
> Última actualización: 2026-07-08.

---

## 1. Panorama general

| Capa | Qué es | Quién la usa |
|---|---|---|
| PostgREST (Supabase) | API REST autogenerada sobre cada tabla/vista de Postgres | Todo el frontend, vía `supabase-js` |
| Edge Function `generar-calendario` | Único endpoint de servidor escrito a mano en este proyecto | `js/shared/ia.js` |

No existe ningún servidor Node/Express/etc. propio. Toda la superficie de "backend" vive en Supabase.

## 2. PostgREST — la API implícita

El SDK `supabase-js` (cargado vía CDN en cada HTML) traduce `.from('tabla').select()/.insert()/.update()/.delete()` en llamadas HTTP a PostgREST. No hay una capa intermedia de "controladores" — **RLS es la única autorización real**, aplicada por Postgres mismo, no por código de aplicación (ver `DATABASE.md` §1).

Patrones usados en todo el proyecto:
- **Embeds relacionales** (`select('*, actividades(titulo), profiles(full_name)')`) para traer datos de tablas relacionadas en una sola llamada. ⚠️ Requiere fijar la relación explícitamente (`profiles!user_id(...)`) cuando la tabla de destino tiene más de una FK hacia el mismo lugar — ver el incidente documentado en `DATABASE.md` §4.
- **Vistas como si fueran tablas de solo lectura** (`points_totals`, `follower_totals`, `follower_goals_progress`, etc.) — la lógica de agregación vive en SQL, no se recalcula en JavaScript.
- **RPC implícito vía triggers**, no vía funciones invocadas directamente desde el cliente — el cliente hace un `insert` simple y deja que Postgres reaccione (otorgar puntos, sincronizar progreso, notificar).

## 3. Edge Function: `generar-calendario`

Única pieza de código de servidor del proyecto. Código fuente: `supabase/functions/generar-calendario/index.ts`. Documentación de negocio completa en `IA.md` — aquí solo el contrato técnico.

**Endpoint**: invocado vía `supabase.functions.invoke('generar-calendario', { body })`, equivalente a `POST https://<project-ref>.supabase.co/functions/v1/generar-calendario`.

**Headers requeridos**
| Header | Origen | Obligatorio |
|---|---|---|
| `Authorization` | Token de sesión del usuario (lo agrega automáticamente `supabase-js`) | Sí — 401 si falta o no corresponde a una sesión válida |
| `Content-Type` | `application/json` | Sí |

**Request body**
```json
{ "prompt": "string — el prompt completo ya construido del lado del cliente" }
```

**Responses**
| Código | Cuándo | Body |
|---|---|---|
| `200` | Éxito | Respuesta cruda de la API de Groq (`choices[0].message.content` contiene el JSON del calendario como texto) |
| `400` | Falta `prompt` o no es string | `{ "error": "Falta el prompt" }` |
| `401` | Sin `Authorization`, o sesión inválida | `{ "error": "No autorizado" }` / `{ "error": "Sesión inválida" }` |
| `502` | Groq respondió con error | `{ "error": "Groq error: <detalle>" }` |
| `500` | Excepción no controlada | `{ "error": "<mensaje>" }` |

**CORS**: `Access-Control-Allow-Origin: *` — abierto a cualquier origen (mitigado por la exigencia de sesión válida, no por restricción de dominio). Maneja `OPTIONS` explícitamente para el preflight.

**Secretos usados** (ver `IA.md` §5): `GROQ_API_KEY`, más `SUPABASE_URL`/`SUPABASE_ANON_KEY` (inyectados automáticamente por el runtime de Edge Functions, no configurados a mano).

## 4. Convención para futuras Edge Functions

Cualquier función nueva debe seguir el mismo patrón que `generar-calendario`, en este orden:
1. Manejar `OPTIONS` para CORS antes que cualquier otra cosa.
2. Exigir y validar `Authorization` con `supabase.auth.getUser()` antes de hacer cualquier trabajo — nunca confiar en el cliente.
3. Cualquier clave de servicio externo (API keys) se lee de `Deno.env.get(...)`, nunca hardcodeada, nunca regresada en una respuesta.
4. Responder siempre `{ error: "..." }` en fallos, con el código HTTP correspondiente — es el contrato que ya espera `js/shared/ia.js` y que debe mantenerse consistente para que el manejo de errores del cliente no tenga que ramificarse por función.

## 5. Lo que esta API *no* tiene (todavía)

- Sin rate limiting propio (ver `IA.md` §5 — riesgo identificado, no solo de la función de IA sino de cualquier futura Edge Function).
- Sin versionado de contrato (`/v1/`, `/v2/`) — si el formato de respuesta de `generar-calendario` cambia, no hay compatibilidad hacia atrás planeada.
- Sin webhooks salientes ni API pública para integraciones de terceros — todo el consumo es interno, desde el propio frontend de MAHP.
