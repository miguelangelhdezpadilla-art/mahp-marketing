# MIP-001 — Meta Graph API Integration Blueprint

> Primer documento de **MAHP Integration Platform (MIP)** — una serie
> nueva, un nivel más técnico que MPS: donde `MPS-002-002` especificó el
> comportamiento funcional de Social AI Hub, MIP diseña la arquitectura
> de integración con un proveedor externo específico, todavía sin código,
> sin endpoints, sin SDK.
>
> **Estado: [FUTURO] en su totalidad.**
>
> **Verificación de dependencias, con dos hallazgos**:
> - MDS-001→012, `MES-001`, `MPS-002-000/001/002` existen. Sin gaps.
> - El documento de fase cita `ADR-001 → ADR-013` — pero la serie ya
>   llega hasta `ADR-020`, con al menos 4 directamente relevantes aquí no
>   listadas: `ADR-017` (Unified Customer Identity Model — exactamente lo
>   que la sección "Modelo de Cliente" de esta fase pide "diseñar",
>   **ya decidido**, no se re-decide), `ADR-018` (AI Assisted Tagging),
>   `ADR-019` (Intelligent Conversation Routing), `ADR-020` (MAHP
>   Lightweight CRM Boundary). Se aplican, no se ignoran por no estar en
>   la lista original.
> - El documento de fase cita `CCEC-001 → CCEC-005` como si fuera un
>   rango continuo — **`CCEC-002` y `CCEC-003` nunca se crearon**; solo
>   existen `CCEC-001` (Auditoría), `CCEC-004` (Observabilidad) y
>   `CCEC-005` (Privacidad). No es un error de esta fase, es un hallazgo
>   sobre la numeración real de la serie CCEC, señalado aquí por primera
>   vez.
>
> Última actualización: 2026-07-12.

---

## 0. Hallazgo previo: la ventana de mensajería de Meta, verificada

Desde `MPS-002-001` §1, este documento cargaba una **[HIPÓTESIS]** sin verificar sobre la ventana de 24 horas de Meta. Se investigó contra fuentes técnicas especializadas vigentes a 2026 antes de escribir este documento — no es documentación primaria de Meta citada directamente (no se pudo renderizar), pero es consistente entre dos fuentes independientes. Se marca **[VERIFICADO — fuente secundaria, confirmar con equipo técnico antes de implementar]**, ya no [HIPÓTESIS] sin base:

- **Ventana estándar de 24 horas**: se abre/reinicia cuando el cliente envía un mensaje directo, responde a una historia, o responde dentro de un hilo existente — **no** se abre por clics, vistas o "me gusta" sin mensaje. Pasadas 24h sin nuevo mensaje del cliente, el envío estándar se bloquea.
- **Etiqueta `HUMAN_AGENT`**: extiende la ventana a **7 días**, exclusivamente cuando el mensaje lo redacta una persona real (Meta detecta intentos automatizados y los rechaza) — uso exclusivo de soporte/seguimiento de un caso ya abierto, nunca contenido promocional.
- **Esto encaja exactamente con la arquitectura ya decidida de MAHP**: como todo mensaje en Social AI Hub tiene origen humano por diseño (Human in the Loop, `ADR-009` — nunca envío automático sin confirmación), la etiqueta `HUMAN_AGENT` es el mecanismo correcto y ya compatible para la etapa 12 (Seguimiento) del ciclo de vida de conversación (`MPS-002-001` §4) — no requiere ningún cambio de diseño, solo aplicarla en el adaptador de Meta.
- **Cambios de política 2026**: las etiquetas heredadas (`CONFIRMED_EVENT_UPDATE`, `POST_PURCHASE_UPDATE`, `ACCOUNT_UPDATE`) se retiran el 27 de abril de 2026 a favor de "Utility Templates"; "Recurring Notifications" terminó el 10 de febrero de 2026 (excepto AU/EU/JP/KR/UK) — ninguna afecta a `HUMAN_AGENT`.
- **Límite de tasa separado**: 200 mensajes/hora para DMs salientes automatizados dentro de la ventana abierta (reducido desde 5,000 en octubre de 2024) — dato de diseño directo para el Rate Limit Manager (§3).

Sources:
- [Instagram Messaging API 24-Hour Window Policy: The Complete Guide (2026)](https://www.keyapi.ai/blog/instagram-messaging-api-policy/)
- [Meta's deprecation of the Message Tags feature on Messenger | Manychat](https://community.manychat.com/product-updates/meta-s-deprecation-of-the-message-tags-feature-on-messenger-9010)

---

## 1. Contexto

MVP: Facebook Pages, Facebook Messenger, Instagram Business, Instagram Direct Messaging. WhatsApp Business Cloud API queda fuera, documentado en `MIP-002` (no iniciado). Principio de desacoplamiento no negociable: **ningún módulo funcional de `MPS-002-002` habla directo con Meta Graph API** — todo pasa por el Meta Integration Gateway (§3).

## 2. Objetivos

Conectar múltiples páginas/cuentas por organización; gestionar múltiples restaurantes y múltiples organizaciones (bloqueado por el mismo modelo de organización pendiente desde MDS-003, `10C-ORGANIZATION-MODEL.md` — este documento diseña la integración asumiendo que ese modelo se resuelva, no lo resuelve); sincronizar conversaciones/clientes/eventos; autenticación, permisos, webhooks, errores, auditoría, observabilidad; escalar a millones de conversaciones sin rediseño.

---

## 3. Arquitectura General

```
MAHP
  │
  ▼
Social AI Hub (MPS-002-002)
  │  (nunca habla directo con Meta — principio de desacoplamiento)
  ▼
┌─────────────────────────────────────────────────────────┐
│              META INTEGRATION GATEWAY                      │
│         (único punto de entrada/salida hacia Meta)          │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Authentication    │  │ Webhook Service   │                │
│  │ Service (§4)       │  │ (§6)              │                │
│  └─────────────────┘  └─────────────────┘                  │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Conversation Sync  │  │ Media Service     │                │
│  │ Engine (§7)         │  │                    │                │
│  └─────────────────┘  └─────────────────┘                  │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Permission Manager │  │ Rate Limit Manager │                │
│  │ (§5)               │  │                    │                │
│  └─────────────────┘  └─────────────────┘                  │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Retry Queue        │  │ Audit Service      │                │
│  │ (reutiliza ADR-008) │  │ (reutiliza CCEC-001)│                │
│  └─────────────────┘  └─────────────────┘                  │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Monitoring Service  │  │ Token Manager      │                │
│  │ (reutiliza CCEC-004) │  │ (§4)               │                │
│  └─────────────────┘  └─────────────────┘                  │
│  ┌─────────────────┐                                        │
│  │ Configuration       │                                     │
│  │ Service              │                                     │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────┘
  │
  ▼
Meta Graph API
```

| Componente | Responsabilidad | Reutiliza / Nuevo |
|---|---|---|
| Authentication Service | Ciclo completo de OAuth y tokens (§4) | Nuevo, extiende `08E-SECURITY.md` §2 |
| Webhook Service | Recibir, validar, encolar eventos de Meta (§6) | Nuevo, extiende `08B-WEBHOOKS.md` §2 |
| Conversation Sync Engine | Sincronización inicial/incremental, alimenta el CIE (§7, §8) | Nuevo, alimenta `MPS-002-001` §4 |
| Media Service | Descargar/almacenar adjuntos multimedia de conversaciones | Nuevo |
| Permission Manager | Validar que el token tiene el scope mínimo requerido por acción (§5) | Nuevo |
| Rate Limit Manager | Respetar 200 msg/hora y límites de Graph API por página | Nuevo, informa reintentos |
| Retry Queue | Reintentos con backoff para envío/recepción fallida | **Reutiliza** `automation_queue`/`pg_cron` (`ADR-008`) — no se crea infraestructura nueva |
| Audit Service | Registrar eventos de integración (conexión, desconexión, fallo) | **Reutiliza** `CCEC-001A`, agrega catálogo de eventos nuevo |
| Monitoring Service | Logs/métricas/alertas del adaptador | **Reutiliza** `CCEC-004A`/`B`/`C` |
| Token Manager | Almacenamiento cifrado, refresh, expiración de tokens | Nuevo, extiende `08E-SECURITY.md` §8 (`integration_tokens`) |
| Configuration Service | Conexión/desconexión de páginas por empresa | Nuevo, es 2.12 de `MPS-002-002` |

**Principio de desacoplamiento verificado**: de los 11 componentes, solo 4 son genuinamente nuevos en su lógica (Authentication, Webhook, Conversation Sync, Media, Permission, Rate Limit, Token, Configuration — 8 en realidad); Retry Queue, Audit Service y Monitoring Service son el mismo mecanismo ya construido para toda la plataforma, aplicado aquí — consistente con `ADR-013` (no duplicar infraestructura de cola/eventos por módulo).

---

## 4. Modelo de Autenticación

```
company_admin inicia conexión (Configuration Service)
        │
        ▼
Redirección OAuth 2.0 a Meta, scope mínimo (§5)
        │
        ▼
Meta redirige con código de autorización
        │
        ▼
Authentication Service intercambia código por:
  - Access Token de corta duración (~1-2h)
  - Se intercambia inmediatamente por un Long-Lived Token (~60 días)
        │
        ▼
Token Manager cifra y almacena (integration_tokens, 08E-SECURITY.md §8)
        │
        ▼
Renovación automática antes de expirar (job periódico, reutiliza
Job Scheduler de 09F-JOB-SCHEDULER.md)
        │
   ┌────┴────┐
   ▼         ▼
Renovado   Falla → evento integracion.token_vencido (08F §2) →
exitoso    notificación a company_admin (09H) → reconexión manual
```

| Aspecto | Diseño |
|---|---|
| Access Tokens | Corta duración, nunca almacenados más allá del intercambio inmediato por Long-Lived Token |
| Long-Lived Tokens | ~60 días, renovados automáticamente antes de expirar |
| Refresh Strategy | Job periódico (Job Scheduler, `09F`) intenta renovar con margen de días antes del vencimiento real |
| Expiración | Detectada proactivamente (renovación fallida) y reactivamente (llamada rechazada) |
| Revocación | `company_admin` puede desconectar manualmente (2.12); Meta puede revocar del lado del usuario — el sistema debe detectar ambos casos |
| Reconexión | Mismo flujo OAuth desde cero — sin estado intermedio roto |
| Renovación automática | Sí, vía Job Scheduler — nunca depende de que un humano lo recuerde (principio Automation First, `MES-001` §4) |
| Multiusuario | Un token por página/cuenta conectada, no por usuario de MAHP — cualquier colaborador con permiso opera sobre la conexión ya establecida por `company_admin` |
| Multiorganización | Un token por página, por empresa (`company_id`) — aislamiento multiempresa sin excepción (`07H-MULTI-TENANT-DESIGN.md`), bloqueado a nivel de organización real hasta que `10C-ORGANIZATION-MODEL.md` se resuelva |

---

## 5. Modelo de Permisos — mínimo privilegio

| Permiso | Para qué sirve | Funcionalidad de `MPS-002-002` que lo usa |
|---|---|---|
| `pages_show_list` | Listar las páginas administradas por el usuario que conecta | Configuración (2.12) — selección de página a conectar |
| `pages_read_engagement` | Leer comentarios/interacciones de la página | Business Intent Engine (2.7) — contexto de comentarios, no solo DMs |
| `pages_manage_metadata` | Suscribir la página a webhooks | Webhook Service (§6) |
| `pages_manage_posts` | **No requerido por el MVP** — gestión de publicaciones, fuera del alcance de Social AI Hub (que es conversación, no publicación de contenido, ya cubierto por `06B-MARKETING-MODULES.md`) | Ninguna — señalado explícitamente para no solicitarlo sin uso real (principio de mínimo privilegio) |
| `pages_messaging` | Enviar/recibir mensajes de Messenger | Gestión de Conversaciones (2.3) |
| `instagram_basic` | Leer información básica de la cuenta de Instagram Business | Configuración (2.12) |
| `instagram_manage_messages` | Enviar/recibir Instagram Direct | Gestión de Conversaciones (2.3) |
| `business_management` | Administrar activos de negocio vinculados (necesario si la cuenta de Instagram cuelga de un Business Manager) | Configuración (2.12) |

**Aplicación de mínimo privilegio**: `pages_manage_posts` se excluye explícitamente del MVP — es el ejemplo concreto de un permiso que Meta ofrece pero que Social AI Hub no necesita, y solicitarlo "por si acaso" violaría el principio ya fijado en `08-ENTERPRISE-INTEGRATION-PLATFORM.md` §1 y `08E-SECURITY.md` §2.

---

## 6. Webhooks

| Aspecto | Diseño |
|---|---|
| Eventos recibidos | Mensajes entrantes (Messenger/Instagram), cambios de estado de entrega, actualizaciones de la página |
| Validación | Verificación de firma `X-Hub-Signature-256` de Meta contra el secreto de la app — nunca procesar un payload sin validar (mismo principio ya fijado en `08B-WEBHOOKS.md` §2) |
| Firma / Seguridad | HMAC-SHA256, secreto almacenado como variable de entorno de Edge Function (`ADR-007`, mismo patrón), nunca en código |
| Reintentos | Meta reintenta su propio webhook si no se responde `200` rápido — el Webhook Service responde de inmediato y procesa de forma asíncrona (mismo patrón de `08B-WEBHOOKS.md` §2, punto 3) |
| Procesamiento | Async vía Retry Queue (`ADR-008`) — nunca bloquea la respuesta HTTP a Meta |
| Colas | Misma `automation_queue` ya diseñada, no una cola dedicada a Meta (`ADR-013` extendido a integraciones) |
| Eventos duplicados | Meta puede reenviar el mismo evento — deduplicación por `message_id` antes de procesar (idempotencia) |
| Idempotencia | Procesar el mismo evento dos veces nunca debe crear dos conversaciones ni duplicar un mensaje — mismo estándar ya fijado en `08A-API-STANDARDS.md` §10 |
| Timeouts | Respuesta a Meta en menos de unos segundos, sin importar cuánto tarde el procesamiento real (asíncrono) |
| Dead Letter Queue | Evento que falla procesamiento tras agotar reintentos va a una cola de revisión manual — nunca se descarta silenciosamente (principio "nada crítico se pierde", `PROJECT-BLUEPRINT.md` §5 principio 4) |
| Escalabilidad | Un webhook por app de Meta, enrutado internamente por `company_id` según la página — no un webhook por empresa |

---

## 7. Sincronización

| Tipo | Diseño |
|---|---|
| Inicial | Al conectar una página, sincronizar conversaciones abiertas recientes (no todo el historial histórico — ventana razonable, ej. últimos 30 días) |
| Incremental | Webhooks en tiempo real para todo lo nuevo después de la sincronización inicial |
| Reconciliación | Job periódico (Job Scheduler) que compara estado local vs. Meta para detectar eventos perdidos (ej. webhook que falló silenciosamente del lado de Meta) |
| Recuperación de errores | Reintentos vía Retry Queue; tras agotar, Dead Letter Queue (§6) |
| Conflictos | Un mensaje ya procesado que llega de nuevo se descarta por idempotencia (§6) — no hay conflicto real posible en un flujo de solo-inserción de mensajes |
| Reintentos | Backoff exponencial, mismo mecanismo ya fijado (`09A-WORKFLOW-ENGINE.md` §7) |
| Eventos perdidos | Cubiertos por la reconciliación periódica — ninguna dependencia de que el webhook nunca falle |
| Procesamiento paralelo | Múltiples páginas/empresas procesan en paralelo sin interferir — aislamiento por `company_id`, mismo principio de siempre |
| Consistencia | El estado de una conversación en MAHP es eventualmente consistente con Meta (segundos, no instantáneo) — aceptable para el caso de uso, señalado explícitamente para no prometer tiempo real estricto |

---

## 8. Modelo Canónico de Conversaciones

El CIE (`MPS-002-001`) nunca debe saber si un mensaje vino de Messenger o Instagram — el Conversation Sync Engine normaliza ambos a una forma única antes de que el CIE los toque, aplicando el principio Omnichannel Ready ya fijado (`MPS-002-001` §3, principio 10; `MES-001` §4, principio channel-agnostic vía `ADR-010`).

```
Mensaje de Messenger  ──┐
                          ├──▶  Normalización  ──▶  Mensaje canónico
Mensaje de Instagram   ──┘        (Conversation      (texto, adjuntos,
                                    Sync Engine)       remitente, timestamp,
                                                        canal de origen
                                                        como metadato,
                                                        nunca como campo
                                                        que cambia la
                                                        lógica del CIE)
```

El "canal de origen" se conserva como dato (para saber por dónde responder), pero nunca condiciona cómo el CIE clasifica, prioriza o recomienda — esa lógica es idéntica sin importar el canal, ya diseñada así desde `MPS-002-001`.

## 9. Modelo de Cliente e Identidades

**Ya decidido — `ADR-017`, no se re-diseña aquí.** Un cliente es una entidad única; Facebook, Instagram y Messenger son identidades digitales vinculadas a esa entidad, nunca clientes duplicados.

```
Cliente
  │
  ├── Identidad: Facebook (Page-Scoped ID de esa página)
  ├── Identidad: Instagram (Instagram-Scoped ID)
  └── Identidad: Messenger (mismo espacio de ID que Facebook Page,
                             técnicamente la misma identidad que
                             Facebook en la mayoría de los casos)
```

**Aporte técnico de este documento a `ADR-017`** (el ADR fijó el principio, dejó el mecanismo pendiente — `MPS-002-002` §14 Entregable Final, punto 6, ya lo anticipaba): Meta identifica a un usuario con IDs distintos y no correlacionables entre Facebook Page y Instagram Business (Page-Scoped ID vs. Instagram-Scoped ID) — **Meta no provee un identificador único de persona real entre ambos por defecto**. El mecanismo de vinculación automática sigue sin resolverse (no hay señal confiable de Meta para "esta persona de Instagram es la misma que esta de Facebook") — la vinculación práctica en el MVP requerirá fusión manual por el colaborador (mismo mecanismo de respaldo ya anticipado en `ADR-017`, "Alternativas consideradas"), no automática.

---

## 10. Seguridad

Hereda sin excepción `08E-SECURITY.md` — no se redefine, se aplica: OAuth 2.0 (§4), tokens cifrados en `integration_tokens` (§4), HTTPS/HSTS ya garantizado por la plataforma (`ADR-002`), verificación de firma de webhook (§6), mínimo privilegio (§5), rotación de tokens vía renovación automática (§4), y auditoría de cada conexión/desconexión vía `CCEC-001A` (evento nuevo a agregar: `integracion_meta_conectada`/`desconectada`, ya anticipado en `08F-EVENT-ARCHITECTURE.md` §2 de forma genérica, aquí específico del proveedor). Sin secrets vault dedicado más allá de las variables de entorno de Edge Function ya usadas en toda la plataforma (`ADR-007`) — introducir uno nuevo (ej. HashiCorp Vault) sería complejidad no justificada al volumen actual (`PROJECT-BLUEPRINT.md` §5 principio 5).

## 11. Observabilidad

Hereda `CCEC-004` sin excepción. Métricas específicas de este adaptador (formato de `CCEC-004A`): latencia de webhook a procesamiento, tasa de éxito de envío de mensaje, tokens próximos a vencer, tasa de éxito de renovación automática, profundidad de la Retry Queue específica de este proveedor. Logs siguen `CCEC-004B` (nunca el contenido del token, nunca el mensaje completo salvo en caso de error para diagnóstico). Health check: ping periódico de verificación de token activo, no solo esperar a que falle un envío real.

## 12. Manejo de Errores

| Error | Estrategia |
|---|---|
| Rate limit (Meta, no solo el de 200/h ya identificado en §0) | Backoff exponencial vía Retry Queue, respetando el header `Retry-After` si Meta lo provee |
| `401` | Token inválido/revocado → marcar integración como desconectada, notificar `company_admin` |
| `403` | Permiso insuficiente → nunca debería ocurrir si Permission Manager valida antes (§3) — si ocurre, es señal de que Meta cambió el modelo de permisos, alertar al equipo técnico |
| `404` | Recurso no encontrado (página eliminada, conversación inexistente) → descartar el evento, registrar en log, no reintentar indefinidamente |
| `500` (de Meta) | Reintento con backoff — es un fallo del proveedor, no de MAHP |
| Timeout | Reintento con backoff; si persiste, Dead Letter Queue (§6) |
| Webhook Failure | Ver §6 — reintento de Meta + reconciliación periódica como red de seguridad |
| Token Expired | Ver §4 — renovación proactiva antes de que ocurra en la práctica |
| API Changes (Meta cambia un contrato) | Adaptador aislado (§3, principio de desacoplamiento) — un cambio de Graph API se corrige en el Meta Integration Gateway sin tocar el CIE ni Social AI Hub |
| Network Failure | Reintento con backoff, mismo mecanismo general |
| Retry Strategy | Backoff exponencial uniforme en todo el Gateway, mismo ya usado en el resto de la plataforma (`09A-WORKFLOW-ENGINE.md` §7) |
| Circuit Breaker | **[FUTURO]** — si Meta está caído por completo, dejar de intentar por un periodo antes de reintentar en bloque, para no saturar la cola con reintentos inútiles; no se diseña en detalle aquí, señalado como mejora futura sobre el mecanismo de reintentos ya existente |

## 13. Escalabilidad

| Volumen | Qué cambia | Qué permanece igual |
|---|---|---|
| 1 restaurante | Nada — arquitectura actual sobra | Todo |
| 100 restaurantes | Verificar que el límite de 200 msg/hora por página (§0) no se convierta en cuello de botella si un restaurante tiene picos de conversación | Modelo de adaptador único, cola compartida |
| 1,000 restaurantes | Revisar profundidad de Retry Queue específica de Meta; posible necesidad de particionar la cola por rango de `company_id` (mismo criterio ya anticipado en `07-ENTERPRISE-DATA-PLATFORM.md` §8) | Un solo Meta Integration Gateway, sin fragmentar por cliente |
| 10,000 restaurantes | Formalizar métricas de `CCEC-004` como obligatorias, no opcionales (mismo umbral ya fijado en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §14) | Arquitectura de adaptador único sigue siendo válida |
| 100,000 restaurantes | Evaluar si el Meta Integration Gateway necesita escalar como servicio propio separado del resto de Edge Functions — decisión de infraestructura, no de este documento | El modelo de datos (canónico, multi-tenant) no cambia de forma |

## 14. Roadmap

| Fase | Alcance |
|---|---|
| Fase 1 | Messenger, Instagram, OAuth, Webhooks, Sincronización — el MVP completo de este documento |
| Fase 2 | Analytics, Insights, Media — expansión de datos consumidos de Meta más allá de mensajería pura |
| Fase 3 | WhatsApp Cloud API (`MIP-002`, no iniciado) |
| Fase 4 | Otros proveedores (`08C-INTEGRATIONS-CATALOG.md`: TikTok, Telegram, Google Business Messages) |

## 15. Riesgos

| Riesgo | Tipo | Mitigación |
|---|---|---|
| Cambio de política de Meta (ej. la ya identificada para abril 2026, §0) | Técnico/Comercial | Adaptador aislado (§3) — el cambio se absorbe en un solo componente |
| Rechazo/demora de revisión de app en Meta for Developers | Comercial/Plazo | Ya señalado como crítico desde `MPS-002-001`/`002` — iniciar cuanto antes, fuera del control de MAHP |
| Costo de Meta Graph API | Comercial | Graph API es gratuita para mensajería estándar hoy — riesgo bajo, pero no verificado contra términos comerciales futuros de Meta |
| Límite de 200 msg/hora en picos de alto volumen | Técnico | Rate Limit Manager (§3) con cola de espera, no fallo — mensajes se retrasan, no se pierden |
| Dependencia total de un solo proveedor en el MVP | Comercial | Aceptado conscientemente (`ADR-010`) — Fase 3/4 diversifican |
| Vinculación de identidad entre Facebook e Instagram sin señal automática confiable (§9) | Técnico | Fusión manual como respaldo, ya anticipado en `ADR-017` |

---

## 16. Enterprise Architecture Review (obligatorio)

**1. ¿Qué contradicciones existen con MDS, MES, MPS, ADR y CCEC?** Ninguna de fondo. Dos hallazgos de referencia desactualizada en el propio documento de fase (ya corregidos en el encabezado): la lista de ADR se detenía en `ADR-013` sin conocer `014`–`020` (en particular `ADR-017`, que este documento aplica directamente); la lista de CCEC asumía un rango continuo `001→005` que nunca existió como tal (`002`/`003` nunca se crearon).

**2. ¿Qué componentes deberían convertirse en módulos independientes?** Ninguno de los 11 — 3 de ellos (Retry Queue, Audit Service, Monitoring Service) ya son la infraestructura compartida existente, no componentes nuevos que aislar. El Meta Integration Gateway completo podría, en el futuro (Fase 4, múltiples proveedores), generalizarse a un "Integration Gateway" genérico del que Meta sea una instancia — no se rediseña ahora, sin evidencia de necesidad todavía (mismo criterio de activación por demanda de toda la plataforma).

**3. ¿Qué nuevos ADR deben crearse?** Ninguno nuevo de arquitectura — este documento aplica y extiende decisiones ya tomadas (`ADR-007`, `008`, `009`, `010`, `013`, `017`) sin necesitar una decisión nueva con alternativas reales que registrar. La verificación de la ventana de Meta (§0) es un hallazgo técnico, no una decisión arquitectónica de MAHP.

**4. ¿Qué riesgos técnicos existen?** Ver §15 — consolidados, ninguno nuevo fuera de lo ya identificado en `MPS-002-001`/`002`.

**5. ¿Qué riesgos legales existen?** Mismo prerrequisito ya señalado en `CCEC-005` — captura de datos de mensajes de clientes finales vía Meta requiere la consulta legal todavía pendiente, con impacto directo aquí porque este documento es el que efectivamente construiría esa captura.

**6. ¿Qué dependencias externas existen?** Meta Graph API + Meta for Developers (revisión de app) — sin cambio frente a documentos previos.

**7. ¿Qué decisiones quedan pendientes del Product Owner?** Ninguna decisión de arquitectura — el modelo de cliente, canal y desacoplamiento ya estaban resueltos antes de este documento. Sí queda pendiente, como trabajo técnico no decisión de producto: confirmar con el equipo técnico la verificación de §0 contra la documentación oficial de Meta antes de implementar (recomendado explícitamente, no bloqueante).

**8. ¿Qué impacto tendrá esta integración sobre el resto de MAHP?** Es la primera vez que un adaptador de `08-ENTERPRISE-INTEGRATION-PLATFORM.md` §2 se diseña en detalle completo — sirve de plantilla para `MIP-002` (WhatsApp) y cualquier `MIP` futuro.

**9. ¿Mantiene el principio de desacoplamiento arquitectónico?** Sí, verificado explícitamente en §3: ningún módulo funcional de `MPS-002-002` referencia Meta directamente en ninguna de sus 15 especificaciones — todos pasan por el Gateway.

**10. Recomendación**: ☑ **Aprobar con observaciones** — el documento es coherente y no requiere rediseño, pero la verificación de §0 (fuente secundaria, no primaria) debería confirmarse formalmente contra la documentación oficial de Meta por el equipo técnico antes de que el Webhook Service/Conversation Sync Engine se construyan, dado que condiciona directamente su diseño de reintentos y ventanas de mensajería.

## 17. Project Reality Check (PRC)

*(Formato oficial de 7 preguntas, `MES-001` §12A — incorpora las 6 preguntas específicas de esta fase dentro de ese formato, sin duplicar dos versiones de PRC.)*

**1. ¿Qué está realmente implementado?** Nada de este adaptador. Community Manager Advisor (`05A` #11) y el resto del CIE existen solo como diseño.

**2. ¿Qué solo está diseñado?** Los 11 componentes del Gateway, el modelo de autenticación, permisos, webhooks, sincronización — el 100% de este documento.

**3. ¿Qué depende de terceros?** Meta Graph API en su totalidad — incluye explícitamente **Meta App Review** (pregunta específica de esta fase) como el paso externo de mayor plazo, y la vigencia de la verificación de §0 contra cambios de política reales de Meta.

**4. ¿Qué requiere una decisión legal?** La consulta legal de `CCEC-005`, con impacto directo y ya no solo teórico en este documento.

**5. ¿Qué requiere validación del Product Owner?** Ninguna decisión de arquitectura nueva (punto 7 de la EAR) — solo la confirmación técnica de §0.

**6. ¿Qué puede desarrollarse inmediatamente?** El registro de la app en Meta for Developers y el inicio de su proceso de revisión — no depende de que exista ni una línea de código del Gateway. **Depende del backend**: Authentication/Token/Webhook Service (requieren Edge Functions y `integration_tokens`, `08E-SECURITY.md` §8). **Depende del frontend**: Configuration Service (2.12 de `MPS-002-002`) — pantalla de conectar página, ya diseñada funcionalmente, pendiente de `MPS-002-003` (UX).

**7. ¿Qué bloquea el desarrollo?** La aprobación de este documento, y en paralelo, el plazo externo de Meta for Developers — ninguno bloquea al otro, pueden avanzar simultáneamente.

## 18. Engineering Maturity & Implementation Maturity

*(Formato oficial de `MES-001` §14. Los 8 dimensiones pedidas por esta fase — Arquitectura, Seguridad, Escalabilidad, Integración, Observabilidad, Resiliencia, Gobernanza, Documentación — se evalúan en ambas tablas; "Engineering Maturity" e "Implementation Maturity" no son dimensiones dentro de un score, son los dos scores mismos, reconciliado aquí con el estándar ya vigente.)*

### 18.1 Engineering Maturity — calidad de este diseño

| Dimensión | Puntaje (0–10) | Justificación |
|---|---|---|
| Arquitectura | 9 | Desacoplamiento verificado explícitamente (Q9), 11 componentes con responsabilidad única y clara |
| Seguridad | 9 | Hereda `08E-SECURITY.md` sin excepción, mínimo privilegio aplicado con ejemplo concreto (`pages_manage_posts` excluido) |
| Escalabilidad | 8 | Tabla de 5 escalones con qué cambia/qué no, límite real de Meta (200/h) ya incorporado al diseño |
| Integración | 9 | Primer adaptador de `08-ENTERPRISE-INTEGRATION-PLATFORM.md` diseñado a este nivel de detalle — sirve de plantilla |
| Observabilidad | 8 | Métricas específicas definidas, en el formato ya oficial de `CCEC-004A`, sin panel propio |
| Resiliencia | 8 | Retry Queue, DLQ, idempotencia, reconciliación periódica — cubre el ciclo completo de fallo y recuperación |
| Gobernanza | 9 | EAR + PRC + Engineering/Implementation Maturity aplicados; 2 hallazgos de coherencia reales detectados y señalados, no ocultos |
| Documentación | 9 | Honestidad de estado consistente, incluida la calificación explícita de la verificación de Meta como "fuente secundaria, no primaria" |

**Engineering Maturity total: 69/80 (86%)**

### 18.2 Implementation Maturity — cuánto existe realmente

| Dimensión | Puntaje (0–10) | Justificación |
|---|---|---|
| Arquitectura | 0 | Ningún componente construido |
| Seguridad | 0 | Sin `integration_tokens` real, sin adaptador |
| Escalabilidad | 0 | Sin datos de volumen real — todo el análisis es proyección |
| Integración | 0 | App de Meta ni siquiera registrada todavía |
| Observabilidad | 0 | Sin métrica real de este adaptador |
| Resiliencia | 0 | Sin Retry Queue específica en uso |
| Gobernanza | 3 | El proceso de aprobación por fases sí está operando activamente (este mismo documento es prueba de eso) |
| Documentación | 8 | Este documento y sus referencias ya existen y son consultables — la única dimensión con implementación real, porque *es* documentación |

**Implementation Maturity total: 11/80 (14%)**

### 18.3 Lectura conjunta

Mismo patrón ya esperado bajo `ADR-016`: diseño maduro (86%), construcción todavía en el arranque (14%, sostenido casi enteramente por la documentación misma). Acción concreta para mover Implementation Maturity: registrar la app en Meta for Developers (§17, punto 6) — es la única acción de este roadmap que no depende de ningún otro documento.

---

## Entregable Final

1. **Resumen ejecutivo**: MIP-001 diseña la integración completa con Meta Graph API para el MVP de Social AI Hub — 11 componentes desacoplados detrás de un Gateway único, autenticación OAuth con renovación automática, permisos de mínimo privilegio, webhooks idempotentes sobre la infraestructura de cola ya existente, y un hallazgo real que resuelve una hipótesis arrastrada desde `MPS-002-001`: la etiqueta `HUMAN_AGENT` de Meta extiende la ventana de respuesta a 7 días exactamente para el patrón de "toda respuesta tiene origen humano" que MAHP ya decidió como no negociable.

2. **Arquitectura de Integración**: §3.

3. **Modelo de Autenticación**: §4.

4. **Modelo de Permisos**: §5.

5. **Diseño de Webhooks**: §6.

6. **Estrategia de Sincronización**: §7.

7. **Modelo Canónico de Conversaciones**: §8.

8. **Modelo de Cliente e Identidades**: §9 (aplica `ADR-017`, no lo redefine).

9. **Seguridad**: §10.

10. **Observabilidad**: §11.

11. **Manejo de Errores**: §12.

12. **Estrategia de Escalabilidad**: §13.

13. **Roadmap de Implementación**: §14.

14. **Riesgos**: §15.

15. **ADR Propuestos**: ninguno — este documento aplica decisiones ya tomadas sin requerir una nueva (§16, Q3).

16. **Product Backlog inicial para desarrollo**: no se duplica un backlog nuevo — este documento detalla técnicamente la Épica 5 ("Integración con Meta y Configuración") ya definida en `MPS-002-002` §10, sin agregar historias nuevas fuera de esa épica.

17. **Recomendaciones para iniciar `MIP-002` (WhatsApp Cloud API)**: (a) confirmar la verificación de §0 con el equipo técnico antes de construir, porque `MIP-002` probablemente enfrentará las mismas preguntas de ventana de mensajería con reglas distintas de WhatsApp; (b) usar este documento como plantilla estructural directa — mismos 11 tipos de componente, mismo principio de desacoplamiento; (c) verificar si WhatsApp Business Cloud API expone una señal de identidad más confiable entre canales que Meta Graph API (§9), lo que podría simplificar el mecanismo pendiente de `ADR-017`.

**No se generó código en esta fase. No avanzar a MIP-002 sin aprobación explícita del Product Owner.**
