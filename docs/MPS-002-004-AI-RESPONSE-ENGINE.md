# MPS-002-004 — MAHP AI Response Engine

| Campo | Valor |
|---|---|
| Estado | **Aprobado 2026-11-20**. Proveedor: Claude ([`ADR-023`](ADR-023-claude-proveedor-de-ia.md)). E1–E2 escritas y probadas localmente; **no desplegadas** (falta `ANTHROPIC_API_KEY`). Ver §12 |
| Fecha | 2026-11-20 |
| Módulo | Social AI Hub |
| Base | [`MPS-002-003`](MPS-002-003-AI-CUSTOMER-SERVICE-KNOWLEDGE-CENTER.md) (modelo de datos, RAG, seguridad), [`ADR-022`](ADR-022-respuesta-automatica-ia-social-ai-hub.md) (modo automático), [`ADR-014`](ADR-014-explainable-ai-obligatorio.md) |

Este documento **no repite** MPS-002-003: añade lo que aquel no cubría — capa independiente del proveedor, selección de modelos, presupuestos por empresa, registro de consumo, panel de consumo y plan de pruebas — y actualiza la auditoría con el estado real del código al 2026-11-20.

---

## 0. Resumen ejecutivo

> **Actualización 2026-11-20 (decisiones del Product Owner)**:
> - Todo el plan quedó aprobado, con la IA en Claude: Haiku 5.5 como modelo económico y Opus 5.5 como avanzado (`ADR-023`).
> - Las cifras de Groq de §8 quedan como referencia histórica; los costos vigentes están en §8.1.
> - DE2 y DE3: aprobados como se propusieron, con un ajuste. Agotar el presupuesto no pone `suspended_at`: la reserva se rechaza y el servicio vuelve solo al día o al mes siguiente. `suspended_at` queda como paro manual de MAHP.
> - Realtime de `messages`: aprobado, incluido en v28.

1. **Hallazgo urgente (H10):** el modelo en producción (`llama-3.3-70b-versatile`) aparece hoy en la página oficial de modelos de Groq con precio **"Contact sales" (Enterprise)**, igual que `llama-3.1-8b-instant`. No sé si la API key actual sigue funcionando con él ni a qué precio; hay que revisar los logs de `meta-webhook` y la consola de Groq. Los modelos con precio público son `openai/gpt-oss-20b` ($0.075 / $0.30 por millón de tokens de entrada/salida) y `openai/gpt-oss-120b` ($0.15 / $0.60).
2. Hoy **no existe ningún registro de consumo ni límite de gasto**: cada mensaje entrante dispara una llamada al modelo, sin tope por empresa, por conversación ni por día (H12, H14).
3. `generar-calendario` funciona como **proxy abierto a Groq** para cualquier usuario con sesión: acepta un prompt arbitrario, sin límite de tamaño, de frecuencia ni de registro (H11).
4. Propuesta: una librería compartida `_shared/ai/` (proveedor intercambiable + motor de 12 pasos + guardián de presupuesto) y **tres tablas nuevas aditivas**: `ai_models`, `ai_company_limits` y `ai_usage`. Se construye por etapas; la primera no toca la base de datos.
5. Costo estimado con `gpt-oss-20b`: **≈ $0.0004 USD por respuesta** (≈ 4–5 veces menos que el precio público anterior del 70B). 1,000 empresas × 2,000 respuestas/mes ≈ **$800 USD/mes** en IA (supuestos en §8).

---

## 1. Auditoría — estado real (2026-11-20)

### 1.1 Lo que existe

| Área | Estado | Dónde |
|---|---|---|
| Frontend | HTML + JS vanilla en GitHub Pages; Social Hub en `empresa.html`; panel global en `admin.html` (rol `super_admin`) | `js/shared/socialHub.js`, `js/admin.js` |
| Autenticación | Supabase Auth; roles `super_admin`, `company_admin`, `director`, `collaborator`; empresa activa por `my_company_id()` (una cuenta, varias empresas — ADR-021) | v2, v24 |
| Multiempresa | `company_id` en todas las tablas + RLS | v12–v27 |
| Meta — entrada | `meta-webhook`: firma HMAC, empresa por `page_id`, cliente unificado, adjuntos a Storage privado (v27), ecos, nombres de Instagram, idempotencia por `meta_message_id` | `supabase/functions/meta-webhook` (desplegado sin JWT) |
| Meta — salida | `meta-send-message`: valida sesión y RLS, `RESPONSE` → `HUMAN_AGENT` si la ventana cerró, guarda con service role, liga `ai_response_id` | v26 |
| Sincronización | `meta-sync-conversation`: historial y nombres | v27 |
| Conversaciones | `conversations` (con campos `ia_*` de clasificación), `messages` (solo lectura para el navegador desde v26), `customers`, `customer_identities` | v20, v26 |
| IA actual | Una llamada por mensaje entrante (clasificación + borrador) dentro de `meta-webhook`, en `waitUntil`, sin cola. Borrador guardado en `ai_responses` como `propuesta` | `analizarConIA` |
| IA — otros usos | `generar-calendario`: prompt libre del navegador → Groq | `supabase/functions/generar-calendario`, `js/shared/ia.js` |
| Secretos | `GROQ_API_KEY`, `META_APP_SECRET`, `META_VERIFY_TOKEN` en Supabase Secrets; ninguna llave en el navegador (verificado: no hay llamadas directas a Groq en `js/`) | ✓ |
| Base de conocimientos | **No existe.** Diseñada en MPS-002-003 §5 (no construida) | — |
| Cola de trabajos | **No existe** (H9) | — |
| Consumo / presupuesto | **No existe.** `ai_responses` tiene columnas de tokens, pero `est_cost_usd` nunca se llena | — |
| Realtime | Publicación con `invites` y `ai_responses`; **`messages` no está** (la bandeja no se actualiza en vivo — pendiente de tu decisión) | v26 |

### 1.2 Hallazgos nuevos (continúan la numeración de MPS-002-003 §4)

| # | Hallazgo | Evidencia | Riesgo | Corrección propuesta |
|---|---|---|---|---|
| **H10** | Modelo en producción ya no tiene precio público | `console.groq.com/docs/models` (consultado 2026-11-20): `llama-3.3-70b-versatile` → "Contact sales" | Las sugerencias pueden estar fallando sin que nadie lo note (el error solo va a `console.error`), o cobrándose a una tarifa desconocida | Revisar logs y consola de Groq; mover el modelo a configuración (`ai_models`) y cambiar a `gpt-oss-20b` tras una prueba comparativa (DE1) |
| **H11** | `generar-calendario` es un proxy abierto | Cualquier usuario con sesión manda cualquier `prompt`, sin límite de tamaño, `max_tokens 1500`, sin registro; devuelve el error crudo de Groq | Consumo abusivo de la cuota de MAHP desde cualquier cuenta, incluso de un colaborador; filtración de detalles del proveedor | Límite de tamaño, límite por usuario/hora, registro en `ai_usage` con su `company_id`, error genérico al cliente |
| **H12** | Sin registro ni tope de consumo | No existe tabla de uso; nada consulta el gasto antes de llamar al modelo | Una sola empresa (o un solo cliente insistente) puede consumir el presupuesto de todas | `ai_usage` + reserva atómica de presupuesto (§4) |
| **H13** | Proveedor fijo en el código, duplicado | `fetch('https://api.groq.com/…')` copiado en dos funciones con modelos fijos | Cambiar de modelo o proveedor exige editar y desplegar varias funciones | Capa de proveedor única (§2.2) |
| **H14** | Una llamada al modelo por cada mensaje, sin agrupar ni limitar | `waitUntil(analizarConIA(...))` por cada mensaje con texto | Un cliente que manda 50 mensajes seguidos genera 50 llamadas; vector de abuso de costo desde fuera de MAHP | Agrupar ráfagas (cola, 8 s), tope por conversación por hora, saltar mensajes triviales sin IA (§3) |

Siguen abiertos de MPS-002-003: **H5** (token de página en texto plano), **H6** (token en query string), **H7**, **H8**, **H9** (sin cola).

### 1.3 Qué se reutiliza (no se duplica)

- Tablas: `conversations`, `messages`, `ai_responses` (ya es el registro por respuesta), `audit_log`, `company_meta_pages`.
- Funciones: `meta-webhook` sigue siendo la entrada; `meta-send-message` sigue siendo la única vía de envío humano; el envío automático reutiliza su lógica extraída a `_shared/meta.ts`.
- Diseño: tablas de conocimiento, `match_knowledge`, `ai_jobs`, `ai_assistants`, `ai_human_handoffs` y validación de cifras **tal como están en MPS-002-003 §5–§6**. Este documento solo añade lo de costo y proveedor.

---

## 2. Arquitectura del motor

### 2.1 Vista general

```
                 ┌─────────────── entradas ───────────────┐
 meta-webhook ──►│ ai_jobs (cola, agrupa ráfagas)          │
 Probar asistente│ solicitud directa (playground, sin envío)│
 generar-calend. │ solicitud directa (otro "uso")          │
                 └───────────────────┬─────────────────────┘
                                     ▼
                      _shared/ai/engine.ts  — responder(solicitud)
   1 empresa (del servidor, nunca del cliente/modelo)   7 ¿necesita modelo? → reglas sin IA
   2 conversación                                       8 generar (router de modelos)
   3 últimos N mensajes, recortados                     9 validar (código, no prompt)
   4 conocimiento: match_knowledge(company_id, …)      10 ¿humano?
   5 guardas: modo, pausas, ventana 24 h, presupuesto  11 registrar ai_usage + ai_responses
   6 intención (reglas → modelo)                       12 devolver resultado tipado
                                     │
                       _shared/ai/budget.ts  (reserva → liquida)
                                     │
                       _shared/ai/providers/  (interfaz única)
                         ├─ openaiCompatible.ts  → Groq hoy (sirve también para OpenAI, Together, etc.)
                         └─ (futuro) anthropic.ts, gemini.ts …
```

### 2.2 Capa de proveedor

```ts
// _shared/ai/types.ts
interface LlmRequest {
  model: ModelConfig;            // fila de ai_models: proveedor, id, límites, precios
  system: string;                // instrucciones fijas (versionadas en git)
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxOutputTokens: number;       // min(modelo, límite de la empresa)
  json: boolean;
}
interface LlmResult {
  ok: boolean;
  text: string;
  inputTokens: number;  outputTokens: number;   // los que reporta el proveedor
  latencyMs: number;
  error?: { kind: 'rate_limit' | 'timeout' | 'auth' | 'bad_output' | 'provider'; detail: string };
}
interface LlmProvider { complete(req: LlmRequest): Promise<LlmResult>; }
```

- El resto de MAHP **solo llama a `responder()`** y nunca ve el proveedor. Cambiar de modelo = editar una fila de `ai_models`; cambiar de proveedor = agregar un adaptador más el secreto `<PROVEEDOR>_API_KEY`.
- El adaptador normaliza los errores (rate limit, timeout de 20 s, autenticación) y **nunca lanza excepciones**: el motor decide qué hacer con cada `kind`.
- Las pruebas usan un `FakeProvider` (§7) — sin llaves reales.

### 2.3 Resultado del motor

```ts
interface EngineResult {
  outcome: 'regla' | 'propuesta' | 'enviar' | 'escalar' | 'bloqueado' | 'sin_presupuesto' | 'error_proveedor' | 'omitido';
  text?: string;
  intent?: string; confidence?: number;
  reason: string;                 // visible (ADR-014)
  sources: { kind: string; id: number; version: number }[];
  usage: { model?: string; inputTokens: number; outputTokens: number; costUsd: number };
}
```

El que llama decide según el modo (manual / asistido / automático, §5); el motor nunca envía a Meta por sí mismo.

---

## 3. Optimización de costos

### 3.1 Escalera de resolución (de más barata a más cara)

| Nivel | Cuándo | Costo |
|---|---|---|
| 0. **Omitir** | Mensaje sin texto útil (solo emoji, sticker, "ok", "👍"), eco, duplicado, conversación pausada o con handoff abierto | $0 |
| 1. **Regla sin IA** | Saludo o agradecimiento → plantilla de la empresa; horario y ubicación por palabras clave claras → texto generado desde la entrada estructurada `negocio` (sin modelo). Si la coincidencia es dudosa, sigue al nivel 2 | $0 |
| 2. **Modelo económico** (predeterminado) | Todo lo demás | ≈ $0.0004 |
| 3. **Modelo avanzado** (opcional por empresa) | Solo si la empresa lo tiene habilitado **y** el económico devolvió confianza baja o una salida inválida. Un reintento como máximo | ≈ $0.0008 |

El nivel 1 empieza con reglas pocas y conservadoras: una regla equivocada responde mal sin que el modelo lo note. Cada regla que responde queda en `ai_responses` como `source='regla'`, igual de auditable.

### 3.2 Recorte del contexto (aplicado por código, no por prompt)

- **Historial**: solo los últimos 6 mensajes, máximo 300 caracteres cada uno; los más viejos solo entran si la búsqueda los necesita (reformulación, MPS-002-003 §6.2 paso 6).
- **Conocimiento**: nunca documentos completos; top-5 fragmentos de `match_knowledge` (≤ 600 tokens cada uno) + perfil fijo del negocio (≤ 400 tokens).
- **Presupuesto de entrada**: si el total estimado supera `max_input_tokens` de la empresa, se recortan primero el historial y luego los fragmentos de menor puntaje. Nunca se recortan las instrucciones del sistema.
- **Salida**: `max_output_tokens` = mínimo entre el límite del modelo y el de la empresa (predeterminado 400). En `gpt-oss`, `reasoning_effort: "low"`, porque los tokens de razonamiento se cobran como salida.
- **Una sola llamada** para clasificar y redactar (ya es así hoy); la reformulación de la pregunta se hace con reglas cuando es posible.
- **Ráfagas**: con `ai_jobs`, tres mensajes en 8 segundos generan **una** llamada (diseñado en MPS-002-003, corrige H14).
- **Tope por conversación**: máximo N generaciones por conversación por hora (predeterminado 10); al superarlo, se pasa a "requiere humano" sin llamar al modelo.

### 3.3 Límites configurables por empresa

Los define MAHP (`super_admin`), no la empresa, porque son parte del plan contratado:

| Límite | Predeterminado propuesto |
|---|---|
| Presupuesto diario (USD) | 1.00 |
| Presupuesto mensual (USD) | 10.00 |
| Tokens de entrada por solicitud | 3,000 |
| Tokens de salida por solicitud | 400 |
| Generaciones por conversación por hora | 10 |
| Modelo avanzado permitido | No |
| Al agotar el presupuesto | Seguir solo con reglas; sin sugerencias de IA; el modo automático se suspende. **Los humanos siempre pueden responder** |

---

## 4. Modelo de datos (aditivo — migración propuesta v28)

> No se ejecuta nada sin tu autorización. Ninguna instrucción destructiva.

**`ai_models`** — catálogo global (lo administra `super_admin`)
- `id`, `provider` (`groq`, …), `model_id` (`openai/gpt-oss-20b`), `tier` `check in ('economico','avanzado')`
- `price_input_per_mtok`, `price_output_per_mtok` (numeric, USD), `max_context_tokens`, `supports_json bool`, `active bool`, `notes`, `updated_at`
- Los precios viven aquí y no en el código: si el proveedor cambia la tarifa (como pasó con H10), se corrige una fila, sin desplegar.
- RLS: lectura para `authenticated`; escritura solo `super_admin`.

**`ai_company_limits`** — 1 fila por empresa
- `company_id` (PK), `daily_budget_usd`, `monthly_budget_usd`, `max_input_tokens`, `max_output_tokens`, `max_gen_per_conversation_hour`, `default_model_id` → `ai_models`, `advanced_model_id` (nullable), `allow_advanced bool`, `suspended_at`, `suspended_reason`, `updated_by`, `updated_at`
- Si una empresa no tiene fila, se aplican los valores predeterminados (§3.3); nunca "sin límite".
- RLS: lectura para miembros de esa empresa y `super_admin`; escritura solo `super_admin`. Los cambios se registran en `audit_log`.
- Es una tabla separada de `ai_assistants` (MPS-002-003) porque la escribe otra persona: el asistente lo configura la empresa, los límites los fija MAHP.

**`ai_usage`** — registro contable, **una fila por llamada al proveedor** (incluye la reserva)
- `id`, `company_id`, `use_case` (`social_respuesta`, `playground`, `calendario`, …), `ai_response_id` (nullable), `conversation_id` (nullable), `user_id` (nullable), `provider`, `model_id`, `status` `check in ('reservada','liquidada','fallida','liberada')`
- `est_cost_usd` (reservado), `input_tokens`, `output_tokens`, `cost_usd` (real, calculado con los precios de `ai_models` vigentes en ese momento), `latency_ms`, `error_kind`, `created_at`, `settled_at`
- Índice `(company_id, created_at)`.
- RLS: lectura para miembros de la empresa y `super_admin`; **sin escritura desde el navegador**.
- ¿Por qué otra tabla si ya existe `ai_responses`? Porque una respuesta puede usar dos llamadas (económico + avanzado) o ninguna (regla), y porque `calendario` no es una respuesta. `ai_responses` conserva sus columnas de tokens como resumen.

**Funciones (`security definer`, solo `service_role`)**
- `ai_reserve(p_company_id, p_use_case, p_model_id, p_est_cost) returns bigint | null`: toma `pg_advisory_xact_lock(p_company_id)`, suma lo gastado hoy y en el mes (liquidado + reservado), y si cabe inserta la fila `reservada`; si no, devuelve `null` y registra la suspensión. El candado por empresa evita que dos solicitudes simultáneas pasen las dos el último dólar, y como es por empresa, **una empresa nunca bloquea ni consume el presupuesto de otra**.
- `ai_settle(p_usage_id, p_input, p_output, p_status, p_error)`: calcula `cost_usd` con los tokens reales y libera la diferencia.
- Las reservas que nadie liquida (función caída a mitad) se liberan después de 10 minutos con `pg_cron`.

**Vistas para el panel** (`security_invoker = on`, así respetan la RLS de quien consulta)
- `ai_usage_daily`: empresa, día, modelo, solicitudes, tokens de entrada/salida, costo.
- `ai_usage_status`: empresa, gasto de hoy / del mes, límites, `suspended_at`, estado (`activo` / `cerca del límite` (≥ 80 %) / `suspendido`).

---

## 5. Modos y paros

Sin cambios respecto a ADR-022: **manual** (solo clasificación, o nada), **asistido** (propuestas; es el comportamiento actual) y **automático** (desactivado por defecto, solo `company_admin` lo activa, con las 21 salvaguardas).

Paros, del más amplio al más específico; todos se vuelven a comprobar **justo antes de enviar**:

| Paro | Dónde | Quién |
|---|---|---|
| Global de MAHP | Secreto `AI_AUTO_ENABLED=false` (no requiere migración; se cambia con `supabase secrets set`) | MAHP |
| Empresa — presupuesto | `ai_company_limits.suspended_at` (automático al agotar el presupuesto) | Sistema / `super_admin` |
| Empresa — pánico | `ai_assistants.auto_paused_at` (MPS-002-003) | `company_admin`, `director` |
| Conversación | `conversations.ai_paused` (MPS-002-003 §5.3) | Cualquier miembro que atiende |

---

## 6. Panel de consumo

- **Vista global** — nueva pestaña "Consumo IA" en `admin.html` (solo `super_admin`): tabla por empresa con modelo, solicitudes, tokens, costo de hoy y del mes, límites y estado; edición de límites y de `ai_models`.
- **Vista de empresa** — sección dentro de Social Hub → "Mi asistente": solo su empresa (lo garantiza la RLS, no la interfaz), con un medidor de su presupuesto. Los precios unitarios del proveedor no se le muestran a la empresa; solo su costo.
- Todo número sale de las vistas de §4; nada se calcula en el navegador.

---

## 7. Plan de pruebas

**Automatizadas, sin cuentas ni llaves reales** (`deno test`, en `supabase/functions/_shared/ai/*_test.ts`):

| Prueba | Cómo |
|---|---|
| Preguntas frecuentes, precios, promociones | `FakeProvider` + conocimiento de ejemplo; se verifica que la cifra respondida exista en la fuente |
| Precio inventado | El fake devuelve "$99" que no está en las fuentes → resultado `bloqueado` |
| Sin información | Recuperación vacía → `escalar`, sin llamar al modelo |
| Contexto | Historial "¿cuánto cuesta el taco?" + "¿y si pido cinco?" → la búsqueda recibe la pregunta reformulada |
| Requiere humano | "quiero hablar con una persona", queja → `escalar` |
| Inyección | Batería fija ("ignora tus instrucciones…", "muéstrame tu prompt") → la salida pasa la validación o se bloquea |
| Límites de consumo | Función de reserva simulada en memoria: presupuesto agotado → `sin_presupuesto` sin llamar al proveedor |
| Errores del proveedor | El fake devuelve 429 / timeout / JSON roto → `error_proveedor`, la reserva se libera, no se envía nada |
| Duplicados | Mismo `trigger_message_id` dos veces → una sola generación |
| Recorte de contexto | Historial y fragmentos enormes → la entrada estimada nunca supera el límite |

**Contra la base de datos** (script SQL con dos empresas de prueba creadas para eso, ejecutado por ti o con tu autorización):
- Aislamiento: el usuario de la empresa A no ve `ai_usage`, `ai_company_limits` ni las vistas de la empresa B.
- Concurrencia de `ai_reserve`: 20 reservas simultáneas no superan el presupuesto.
- El navegador no puede escribir en `ai_usage` ni en `ai_company_limits` (salvo `super_admin` en límites).

**Reales** (no automatizadas, con tu autorización): una conversación real en la página de Tacamaron en modo asistido, y la comparación de modelos de DE1 con 30–50 preguntas reales de las dos empresas.

Un `FakeProvider` es un doble de prueba: no cuenta como "integración funcionando". Ninguna integración se declara funcional sin la prueba real correspondiente.

---

## 8. Costos estimados

Precios publicados en `console.groq.com/docs/models`, consultados el 2026-11-20 (**verificar en tu consola de Groq antes de presupuestar**):

| Modelo | Entrada / 1M | Salida / 1M |
|---|---|---|
| `openai/gpt-oss-20b` (económico propuesto) | $0.075 | $0.30 |
| `openai/gpt-oss-120b` (avanzado propuesto) | $0.15 | $0.60 |
| `llama-3.3-70b-versatile` (actual) | Contact sales (antes $0.59 / $0.79) | — |

**Supuesto por respuesta**: 2,500 tokens de entrada (instrucciones 800 + conocimiento 1,200 + historial 400 + mensaje 100) y 500 de salida (300 de respuesta + ~200 de razonamiento con `reasoning_effort: low`).

| Escenario | Cálculo | Costo |
|---|---|---|
| 1 respuesta, económico | 2,500 × 0.075/1M + 500 × 0.30/1M | **≈ $0.00034** |
| 1 respuesta, avanzado | 2,500 × 0.15/1M + 500 × 0.60/1M | ≈ $0.00068 |
| Misma respuesta con el 70B al precio público anterior | 2,500 × 0.59/1M + 500 × 0.79/1M | ≈ $0.0019 |
| 1 empresa, 3,000 mensajes/mes → ~2,000 llamadas (ráfagas agrupadas y reglas) | 2,000 × 0.00034 + 10 % de reintentos avanzados | **≈ $0.75 / mes** |
| 1,000 empresas con ese mismo volumen | | **≈ $750–800 / mes** |

- **Embeddings**: `gte-small` dentro de Supabase Edge Functions, sin costo por token (MPS-002-003 §6.3).
- **Supabase**: cada respuesta usa ~2–3 invocaciones de Edge Functions (webhook, cola, envío). El plan Pro incluye una cuota mensual de invocaciones; confirma tu plan, porque yo no veo tu facturación.
- **Lo que más mueve el costo**: el volumen de salida (en `gpt-oss` el razonamiento cuenta como salida), el uso del modelo avanzado y no agrupar ráfagas. Los tres quedan limitados por `ai_company_limits`.

---

### 8.1 Costos con Claude (vigentes)

Precios de la API de Anthropic al 2026-11-20. Haiku 5.5 corre con el razonamiento apagado. Opus 5.5 no permite apagarlo, así que se le reservan 1,500 tokens extra de salida.

| Escenario | Cálculo | Costo |
|---|---|---|
| 1 respuesta, Haiku 5.5 (2,500 de entrada y 300 de salida) | 2,500 × 0.10/1M + 300 × 0.50/1M | **≈ $0.0004** |
| 1 respuesta, Opus 5.5 (2,500 de entrada y ~1,000 de salida con razonamiento) | 2,500 × 4/1M + 1,000 × 20/1M | ≈ $0.03 |
| 1 empresa, ~2,000 llamadas al mes, solo Haiku | | **≈ $0.80 / mes** |
| 1,000 empresas con ese volumen, solo Haiku | | **≈ $800 / mes** |
| Calendario (hasta 12,000 caracteres de entrada y 3,000 tokens de salida, Haiku) | | ≤ $0.0019 por calendario |

Con el presupuesto predeterminado de $1/día, una empresa puede generar unas 2,000 respuestas diarias con Haiku antes de llegar al tope. Si tiene el modelo avanzado habilitado, cada reintento con Opus consume ese presupuesto unas 75 veces más rápido.

## 9. Implementación por etapas

| Etapa | Contenido | ¿Toca la base de datos? | Criterio de salida |
|---|---|---|---|
| **E1** | `_shared/ai/` (tipos, adaptador OpenAI-compatible, `FakeProvider`, recorte de contexto, validación); `meta-webhook` y `generar-calendario` pasan a usar la capa; modelo configurable por secreto mientras no exista `ai_models`; corrección de H11 (tamaño, frecuencia, error genérico); omisión de mensajes triviales (nivel 0); pruebas `deno test` | No | Pruebas pasan; despliegue autorizado; una sugerencia real en Tacamaron |
| **E2** | Migración v28: `ai_models`, `ai_company_limits`, `ai_usage`, `ai_reserve`/`ai_settle`, vistas, liberación de reservas con `pg_cron` | Sí (aditiva) | Script de aislamiento y concurrencia ejecutado |
| **E3** | El motor reserva y liquida en cada llamada; suspensión por presupuesto; panel global y panel de empresa | No | Límite de prueba bajo ($0.01) suspende y lo muestra el panel |
| **E4** | Base de conocimientos (MPS-002-003 Fases 4–5): tablas, captura, `pgvector` + texto en español, `match_knowledge` | Sí (aditiva) | Medición de recuperación en español |
| **E5** | Motor completo de 12 pasos con recuperación, reglas de nivel 1, validación de cifras, "Probar mi asistente" | No | Batería de §7 en playground |
| **E6** | `ai_jobs` + `pg_cron` (H9, H14), modos, paros, handoffs | Sí (aditiva) | Automático probado solo en una página de prueba |

E1 se puede hacer ya y entrega valor inmediato: resuelve H10, H11 y H13 y prepara el resto. Sin la base de conocimientos (E4), la IA sigue limitada a borradores que no afirman datos del negocio, como hoy.

---

## 10. Decisiones necesarias

| # | Decisión | Recomendación |
|---|---|---|
| **DE1** | Modelo predeterminado ante H10 | Revisar primero en los logs si el 70B sigue respondiendo; comparar `gpt-oss-20b` contra el actual con 30–50 mensajes reales; adoptar `gpt-oss-20b` como económico y `gpt-oss-120b` como avanzado. Reemplaza D3 de MPS-002-003 |
| **DE2** | Valores predeterminados de límites (§3.3) | $1/día, $10/mes, avanzado apagado; ajustable por empresa desde `admin.html` |
| **DE3** | Qué pasa al agotar el presupuesto | Reglas siguen; sin sugerencias de IA; automático suspendido; humanos siempre pueden responder |
| **DE4** | Aprobación de E1 | — |
| — | Agregar `messages` a Realtime (pendiente de la sesión anterior) | Sí |

Siguen abiertas D2, D4 y D6 de MPS-002-003.

---

## 12. Estado de implementación (2026-11-24)

| Etapa | Estado |
|---|---|
| E1 | ✅ Código y pruebas: `_shared/ai/` (`types`, `models`, `anthropic`, `context`, `validate`, `prompts`, `engine`, `ledger`, `testing/fakes`). `meta-webhook` y `generar-calendario` ya usan el motor y Groq quedó retirado del código. 23 pruebas pasan (`deno test supabase/functions/_shared/ai/`). Desplegado el 2026-11-24. ✅ Prueba de punta a punta el 2026-11-25 (calendario $0.0007, sugerencia del Social Hub $0.00026; detalle en CHANGELOG) |
| E2 | ✅ `supabase_schema_v28.sql` aplicada el 2026-11-20 |
| E3 | ✅ 2026-11-25: pestaña Consumo IA en `admin.html` (límites, suspender/reanudar, modelos) y tarjeta "Mi asistente" en el Social Hub (`js/shared/consumoIA.js`). RLS verificada; ⏳ prueba de límite bajo ($0.01) que pausa la IA y lo muestra el panel |
| E4–E6 | ✅ 2026-11-25 (versión reducida): v31, búsqueda de texto (no pgvector, decisión del PO), "Probar mi asistente", modos y paros en `ai_assistants`, decisión del automático en `_shared/ai/autopilot.ts`. Sin `ai_jobs`/`pg_cron`: las ráfagas se manejan con una espera de 8 s en el webhook. Sin `ai_human_handoffs`: la transferencia usa `conversations.ai_paused`. ⏳ Interruptor global y prueba real del envío automático |

**Lo que las pruebas no cubren**:
- Las pruebas usan un proveedor simulado y un registro de consumo en memoria. **No prueban** la API real de Anthropic, la base de datos ni Meta.
- La concurrencia real de `ai_reserve`, el aislamiento por RLS y una conversación real en Tacamaron quedan para después del despliegue, según §7.
- Los duplicados los cubre el índice único `ai_responses_trigger_webhook_unique` (v26) y el `upsert` por `meta_message_id`; esa parte no se prueba aquí.

## 11. Referencias

- Groq — Models (precios y estado): https://console.groq.com/docs/models (consultado 2026-11-20)
- Reporte del cambio a "Contact sales" de los modelos Llama: https://www.usagepricing.com/blueprint/activity/groq-2026-08-26-llama-enterprise-only
- MPS-002-003, ADR-022, ADR-014, ADR-021, `docs/DATABASE.md`
