# MPS-002-001 — SOCIAL AI HUB: Conversation Intelligence Engine Blueprint

> Segundo documento de la serie **MPS**. `MPS-002-000` fijó identidad,
> principios y límites del módulo (en particular, el límite frente a CRM
> completo, §6 de ese documento) — este documento diseña su **corazón
> funcional**: el Conversation Intelligence Engine (CIE), el componente
> que convierte un mensaje crudo de Meta en información útil para
> marketing, ventas, atención y automatización.
>
> **Estado: [FUTURO] en su totalidad.** Sin código, sin API, sin tabla
> física — lógica de negocio, estados, reglas y decisiones, conforme a
> las reglas de esta fase.
>
> Dependencias verificadas: MDS-001 a MDS-012, `CCEC-001`/`004`/`005`,
> `ADR-001` a `ADR-010`/`012` (`ADR-011` intencionalmente no creado),
> `MEM-002-001`, `MPS-002-000` — todas existen. Sin gaps.
>
> **Regla de esta fase aplicada literalmente**: "no asumir capacidades no
> soportadas por las APIs oficiales de Meta" — cada vez que este
> documento depende de un comportamiento real de Graph API/Messenger
> Platform que no se ha verificado contra documentación oficial de Meta,
> queda marcado explícitamente como **[HIPÓTESIS]**, no como hecho.
>
> Última actualización: 2026-07-12.

---

## 1. Contexto — qué hace Meta y qué hace MAHP

**Meta únicamente entrega mensajes.** La Graph API (Facebook Pages, Instagram Business, Messenger — alcance ya fijado en `ADR-010`) provee: recepción de mensajes entrantes, envío de mensajes salientes, metadatos básicos del remitente (ID, nombre público si el permiso lo permite). Meta no entiende intención, no prioriza, no clasifica, no recomienda — eso es exactamente lo que este documento diseña.

**El CIE no es infraestructura de IA nueva.** Reutiliza el mismo patrón ya validado en toda la plataforma: llamadas a un proveedor de IA (Groq u otro, `ADR-007`) vía Edge Function proxy, orquestadas con el mismo patrón "cadena" ya formalizado (`05-AI-ECOSYSTEM.md` §11, `09E-AI-ORCHESTRATION.md`). El CIE es una **secuencia de pasos de workflow especializados en conversación**, no un motor de IA paralelo — consistente con `ADR-009` (Social AI Hub como módulo nativo, no aislado).

**[HIPÓTESIS — Meta]**: Messenger Platform impone una "ventana de servicio al cliente" de 24 horas desde el último mensaje del cliente para responder sin restricciones de plantilla; fuera de esa ventana, el envío puede requerir etiquetas de mensaje aprobadas o anuncios "click-to-Messenger". Este documento **asume que esta restricción existe** (es política pública conocida de Meta a la fecha de redacción) pero no se ha verificado contra la documentación oficial vigente en el momento de construir — cualquier diseño de "seguimiento" (§5, etapa 12) que dependa de responder fuera de esa ventana debe revalidarse en `MPS-002-002`.

## 2. Objetivo

Diseñar un motor capaz de: comprender conversaciones, detectar intención del cliente e intención de negocio, priorizar, recomendar acciones, activar automatizaciones, alimentar CRM ligero (límite de `MPS-002-000` §6) y Analytics, colaborar con el AI Ecosystem, y aprender de forma continua mediante métricas y retroalimentación — **sin entrenar modelos propietarios** (§9, aclarado explícitamente por la regla de esta fase).

## 3. Principios del motor

| # | Principio | Definición | Justificación | Impacto en el diseño | Ejemplo práctico |
|---|---|---|---|---|---|
| 1 | **Event Driven** | Cada transición de estado de una conversación es un evento nombrado | Reutiliza `09C-EVENT-CATALOG.md`/`08F-EVENT-ARCHITECTURE.md`, no un mecanismo propio | El ciclo de vida completo (§5) se implementa como una cadena de eventos, no como un proceso monolítico | `ConversationReceived` dispara clasificación, no una función que "hace todo" en una sola llamada |
| 2 | **AI Assisted** | La IA sugiere en cada etapa donde aporta valor, nunca decide sola una acción crítica | Mismo principio ya no-negociable de toda la plataforma (`PROJECT-BLUEPRINT.md` §5 principio 3) | Cada motor (clasificación, priorización, recomendación) produce una sugerencia con nivel de confianza, no una acción ejecutada | El motor de recomendaciones sugiere una respuesta; el colaborador la edita o la envía tal cual — nunca se envía sola por defecto |
| 3 | **Human in the Loop** | Toda acción con efecto externo real (enviar mensaje, cerrar venta) requiere confirmación humana | `ADR-009`, `MPS-002-000` §4 principio 3 | Approval Engine (`09G-APPROVAL-WORKFLOWS.md`) es el mecanismo, no uno nuevo | Automatizar una respuesta de "bajo riesgo" (horario/ubicación) sigue siendo una decisión configurada por un humano, no improvisada por el motor |
| 4 | **Context Aware** | Cada análisis usa el historial disponible de esa conversación/cliente, no solo el último mensaje | Resuelve directamente el "problema de falta de contexto" ya identificado en `MEM-002-001` §4 | El motor de clasificación/priorización recibe como entrada el historial reciente, no solo el mensaje entrante aislado | Un mensaje "¿ya está listo?" se interpreta distinto si hay un pedido reciente en el historial que si no lo hay |
| 5 | **Business First** | El motor optimiza para resultado de negocio (venta, retención, resolución), no para "sonar inteligente" | Mismo criterio de `PROJECT-BLUEPRINT.md` §1 ("sistema operativo empresarial", no una demostración de IA) | Cada motor se diseña con una salida accionable (clasificación, prioridad, recomendación concreta), nunca solo un resumen | El motor de intención de negocio (§6) existe porque "vender más"/"resolver rápido" es el objetivo, no "entender lenguaje natural" como fin en sí mismo |
| 6 | **Privacy by Design** | El manejo del dato de conversación respeta `CCEC-005` desde el diseño de cada etapa | Mismo principio ya fijado en `MPS-002-000` §4 principio 4 | Ninguna etapa del ciclo de vida (§5) retiene más dato del necesario para su propia función | El motor de aprendizaje (§9) registra resultado y retroalimentación, no el contenido completo de cada conversación indefinidamente |
| 7 | **Explainable AI** | Toda clasificación/priorización/recomendación debe poder mostrar por qué llegó a esa conclusión | Nuevo para MAHP — necesario porque un colaborador debe poder confiar o cuestionar una sugerencia, no solo aceptarla a ciegas | Cada salida de IA incluye un motivo breve, no solo una etiqueta o un número | "Prioridad alta — cliente mencionó 'urgente' y tiene una reservación hoy", no solo "Prioridad: 9/10" |
| 8 | **Audit by Default** | Cada decisión del motor (clasificación aplicada, recomendación mostrada, aceptada o rechazada) es auditable | Consume `CCEC-001` directamente | Eventos del motor (§10) incluyen los campos mínimos que `CCEC-001A` exigiría si se cataloga como evento auditable | Quién vio una sugerencia de IA y si la usó queda tan trazable como cualquier otro evento administrativo |
| 9 | **Extensible** | Agregar una intención de negocio nueva o un canal nuevo no debe requerir rediseñar el motor | Mismo criterio de arquitectura channel-agnostic ya fijado (`ADR-010`) aplicado ahora a intenciones/clasificaciones, no solo a canales | Business Intent Engine (§6) y Motor de Clasificación (§7) se diseñan como catálogos configurables, no como lógica fija en código | Agregar la intención "Franquicias" (ya listada en §6) no debería requerir tocar cómo funciona la intención "Venta" |
| 10 | **Omnichannel Ready** | El CIE opera sobre "conversación" en abstracto, no sobre "conversación de Meta" | Mismo principio 1 de `MPS-002-000` §4, aplicado aquí al motor específicamente | Ninguna etapa del ciclo de vida (§5) referencia Meta por nombre en su lógica — solo el adaptador de canal lo hace | El motor de priorización funcionaría igual si la conversación llegara por WhatsApp, sin cambio de lógica |

## 4. Ciclo de vida de una conversación

| Etapa | Objetivo | Entradas | Salidas | Eventos generados | Reglas de negocio | Errores posibles |
|---|---|---|---|---|---|---|
| **1. Mensaje recibido** | Capturar el mensaje entrante sin pérdida | Payload crudo del adaptador de Meta | Mensaje normalizado (ver etapa 2) | `ConversationReceived` (nuevo) o `conversacion.mensaje_recibido` (`MPS-002-000` §7) | Todo mensaje se persiste antes de cualquier procesamiento — nunca se pierde por un fallo de una etapa posterior | Webhook de Meta entrega duplicado — requiere idempotencia (`08A-API-STANDARDS.md` §10) |
| **2. Normalización** | Convertir el formato específico de Meta a la forma abstracta del CIE (principio 10, §3) | Mensaje crudo | Mensaje en forma canónica (texto, adjuntos, remitente, timestamp) | Ninguno propio — parte del mismo procesamiento de la etapa 1 | El formato canónico no cambia si el canal cambia (channel-agnostic) | Mensaje con formato no soportado (ej. tipo de adjunto nuevo de Meta) — degradar a "adjunto no procesable", nunca fallar silenciosamente |
| **3. Identificación del canal** | Saber de qué página/cuenta de Meta y de qué empresa proviene | Metadatos del webhook | `company_id` resuelto | Ninguno propio | Un mensaje sin `company_id` resoluble no debe procesarse más allá — riesgo de fuga entre empresas (`07H-MULTI-TENANT-DESIGN.md`) | Página de Meta desconectada de cualquier empresa activa — descartar con log, nunca crear una conversación huérfana |
| **4. Identificación del cliente** | Vincular el mensaje a un contacto existente o crear uno nuevo | ID de remitente de Meta + `company_id` | Contacto resuelto (existente o nuevo) | Nuevo evento candidato: `ContactoCreado` (si es la primera vez) | El "CRM ligero" de `MPS-002-000` §6 se aplica exactamente aquí — se guarda identificador + nombre público, no un perfil extenso | Mismo cliente escribiendo desde Instagram y Facebook simultáneamente — **[DECISIÓN PENDIENTE]**: ¿se tratan como un solo contacto o dos? No resuelto en este documento, ver §12 |
| **5. Consulta CRM** | Traer historial de relación con este contacto (conversaciones previas, si es cliente recurrente) | Contacto resuelto | Contexto de cliente | Ninguno propio | Respeta el límite de CRM ligero — solo historial de conversación, nunca pipeline de ventas | Contacto nuevo sin historial — continuar con contexto vacío, no bloquear |
| **6. Consulta historial** | Traer los últimos mensajes de esta conversación específica (no de todo el cliente) | ID de conversación | Ventana de contexto reciente | Ninguno propio | Ventana acotada (ej. últimos N mensajes o últimas 24h) — mismo principio de minimización de datos (`CCEC-005` §3) | Conversación muy larga — resumen automático (caso de uso 48, `MEM-002-001` §7) en vez de enviar todo el historial a la IA |
| **7. Análisis IA** | Generar entendimiento del mensaje: intención de cliente, intención de negocio (§6), sentimiento | Mensaje normalizado + contexto de cliente + historial | Salida estructurada de IA (intención, sentimiento, confianza) | `CustomerIntentDetected`, `BusinessIntentDetected` | Vía Edge Function proxy (`ADR-007`), nunca llamada directa del cliente al proveedor de IA | Proveedor de IA no responde/tarda — degradar a clasificación manual pendiente, nunca bloquear la conversación indefinidamente |
| **8. Clasificación** | Aplicar las dimensiones de clasificación (§7) usando la salida del análisis IA | Salida de análisis IA | Conversación etiquetada (canal, prioridad preliminar, sentimiento, idioma, etc.) | Ninguno propio — parte del mismo evento `BusinessIntentDetected` o uno dedicado `ConversationClassified` | Toda clasificación de IA es editable por un humano después (principio Explainable AI, §3) | Clasificación con baja confianza — marcar como "sugerida, no confirmada" en vez de aplicarla como definitiva |
| **9. Priorización** | Calcular el puntaje de prioridad (§8) | Clasificación + reglas de negocio de la empresa | Puntaje de prioridad + motivo | Ninguno propio | Determinística sobre la clasificación — mismo puntaje de entrada produce siempre el mismo resultado (excepto si cambia el historial) | N/A — es un cálculo, no una llamada externa que pueda fallar |
| **10. Asignación** | Determinar a qué colaborador/rol corresponde | Prioridad + reglas de enrutamiento (caso de uso 31, `MEM-002-001` §7) | Conversación asignada | `ConversationAssigned` | Reutiliza el mismo Business Rules Engine (`09B`), no lógica propia de asignación | Ningún colaborador disponible que cumpla la regla — escalar a `company_admin` por defecto, nunca dejar sin asignar silenciosamente |
| **11. Respuesta** | El colaborador (o automatización aprobada) responde | Recomendación de respuesta (§9, opcional) + decisión humana | Mensaje saliente | `AIRecommendationGenerated` (si aplica) | Toda respuesta pasa por el mismo adaptador de canal que recibió el mensaje — coherencia de conversación en el mismo hilo de Meta | Fallo de envío (token vencido, límite de Meta alcanzado) — reintento con el mismo mecanismo ya diseñado (`09A-WORKFLOW-ENGINE.md` §7), notificación al colaborador si falla definitivamente |
| **12. Seguimiento** | Verificar si la conversación requiere una acción de seguimiento (recordatorio, segunda respuesta) | Estado de la conversación + tiempo transcurrido | Recordatorio o cierre automático de seguimiento | Reutiliza `09C-EVENT-CATALOG.md` (`actividad.vencida` como patrón equivalente) | **Sujeto a la restricción [HIPÓTESIS] de §1** — un seguimiento fuera de la ventana de 24h de Meta puede requerir un mecanismo distinto (plantilla aprobada), no resuelto aquí | Intentar responder fuera de ventana sin saberlo — el adaptador de Meta debería rechazar la llamada, capturar y notificar, no fallar en silencio |
| **13. Cierre** | Marcar la conversación como resuelta | Decisión del colaborador o regla automática (ej. sin respuesta del cliente en X días) | Conversación cerrada | `ConversationResolved` | El cierre no borra la conversación — mismo principio de "nada crítico se pierde" (`PROJECT-BLUEPRINT.md` §5 principio 4) | Cierre accidental — reapertura debe ser tan simple como el cierre, sin fricción |
| **14. Retroalimentación** | Capturar si la sugerencia de IA (si hubo) fue útil | Interacción del colaborador con la sugerencia (usada tal cual / editada / ignorada) | Registro de retroalimentación | Nuevo evento candidato: `RecommendationFeedbackCaptured` | Base del Motor de Aprendizaje (§9) — nunca opcional si hubo una sugerencia de IA en la conversación | Colaborador no interactúa con la sugerencia ni la rechaza explícitamente — se registra como "sin retroalimentación", no se asume aceptación silenciosa |
| **15. Actualización Analytics** | Reflejar el resultado en KPIs agregados | Datos de la conversación cerrada | Métricas actualizadas (`CCEC-004A`) | `AnalyticsUpdated` | Reutiliza el mecanismo ya existente, no un sistema de reportes propio (`MPS-002-000` §6) | N/A — es agregación, no una operación que "falle" de forma crítica |
| **16. Auditoría** | Registrar accesos/decisiones relevantes de esta conversación | Eventos de la conversación completa | Entradas en `audit_log` (vía `CCEC-001`) | `AuditRecorded` | Solo eventos con relevancia de auditoría (`CCEC-001` §3), no cada mensaje individual | N/A |
| **17. Aprendizaje** | Consolidar retroalimentación de esta conversación con el resto del histórico | Retroalimentación de la etapa 14 + resultado de la etapa 13 | Insumo para el Motor de Aprendizaje (§9) | Ninguno propio — proceso agregado, no por conversación individual | Ver §9 — nunca entrenamiento automático de modelo propietario | N/A |
| **18. Actualización Analytics** *(cierre del ciclo)* | Confirmar que el ciclo completo quedó reflejado en KPIs de largo plazo (ej. tendencias de intención de negocio) | Todo lo anterior agregado en el tiempo | Tendencias, no solo el dato puntual | Ninguno propio | — | — |

## 5. Business Intent Engine

| Intención | Cómo se identifica | Acciones recomendadas | Automatizaciones que puede activar | Indicadores que impacta |
|---|---|---|---|---|
| **Venta** | Palabras/patrones de interés en producto/precio + análisis IA de intención (etapa 7) | Enviar catálogo, cotizar, ofrecer promoción activa | Envío automático de catálogo (caso de uso 14, `MEM-002-001` §7) | Ventas atribuidas, tasa de conversión |
| **Reservación** | Mención de fecha/hora + patrón de solicitud de disponibilidad | Confirmar disponibilidad, solicitar datos faltantes | Confirmación automática si hay integración de disponibilidad (fuera de alcance de este documento) | Reservaciones confirmadas |
| **Soporte** | Pregunta sobre uso/estado de algo ya adquirido | Buscar en historial del cliente, responder con información conocida | Respuesta automática si es pregunta frecuente ya cubierta (`09A-WORKFLOW-ENGINE.md`) | Tiempo de resolución |
| **Queja** | Sentimiento negativo detectado + palabras de insatisfacción | Escalar, priorizar alto (§8), nunca responder solo con automatización sin revisión humana | Alerta inmediata (`09H-NOTIFICATION-ORCHESTRATION.md`), nunca auto-respuesta completa | Satisfacción, tasa de escalamiento |
| **Facturación** | Mención de pago/factura/recibo | Dirigir a información de pago o escalar a administración | Ninguna automática por defecto — dato sensible | Conversaciones resueltas sin escalar |
| **Franquicias** | Mención de interés en operar una unidad/franquicia | Enrutar a contacto especializado (si existe) | Ninguna — depende del modelo de organización todavía bloqueado (`10C-ORGANIZATION-MODEL.md`) | Leads de franquicia generados |
| **Reclutamiento** | Mención de empleo/vacante | Dirigir a proceso de reclutamiento de la empresa (fuera del alcance de MAHP hoy) | Ninguna | N/A — **[DECISIÓN PENDIENTE]**: ¿MAHP debería siquiera clasificar esta intención, dado que no tiene módulo de RH? Ver §12 |
| **Fidelización** | Cliente recurrente + sentimiento positivo | Sugerir oferta de fidelidad si existe, agradecer | Notificación de "cliente frecuente" al colaborador | Retención de clientes |
| **Recuperación de clientes** | Cliente inactivo que vuelve a escribir, o campaña de reactivación (caso de uso 25) | Priorizar respuesta rápida, contexto de por qué se fue si se conoce | Workflow de reactivación (`09D-AUTOMATION-TEMPLATES.md`) | Clientes recuperados |
| **Oportunidad comercial** | Señales combinadas de Venta + alto valor potencial (ej. pregunta por volumen/mayoreo) | Escalar a `company_admin` o rol de ventas, no tratar como conversación estándar | Ninguna automática — siempre revisión humana por ser de alto valor | Valor comercial de oportunidades detectadas |

## 6. Motor de clasificación

| Dimensión | Lógica/criterio |
|---|---|
| **Canal** | Determinado por el adaptador de origen (Facebook Pages / Instagram Business / Messenger) — no requiere IA, es un dato del webhook |
| **Tipo de cliente** | Nuevo vs. recurrente, determinado por si existe contacto previo (etapa 4 del ciclo de vida) |
| **Prioridad** | Ver Motor de Priorización (§8) — no es una clasificación aislada, es su propio motor |
| **Sentimiento** | Salida del análisis IA (etapa 7) — positivo/neutral/negativo, con nivel de confianza |
| **Idioma** | Detectado por el análisis IA — relevante para mercados de `11C-MARKET-EXPANSION.md`, aunque el MVP opera en español |
| **Sucursal** | **[DECISIÓN PENDIENTE]** — depende de que exista el modelo de organización/sucursales (`10C-ORGANIZATION-MODEL.md`), hoy bloqueado. Sin ese modelo, esta dimensión no tiene un valor real que asignar |
| **Producto** | Extraído del análisis IA si el mensaje lo menciona explícitamente — sin catálogo de productos formal en MAHP hoy, es una etiqueta libre, no una referencia a una tabla de productos |
| **Campaña** | Vinculación a `campaign_id` si el mensaje llegó como respuesta a un anuncio/promoción rastreable — depende de qué metadatos de atribución expone Meta **[HIPÓTESIS — Meta]**: Graph API puede exponer el `referral`/`ad_id` de un mensaje originado por un anuncio, pero esto no está confirmado contra la documentación vigente al momento de construir |
| **Estado** | Determinístico, no de IA — mapea directamente a la etapa del ciclo de vida (§4): recibido / en análisis / asignado / respondido / en seguimiento / cerrado |
| **Riesgo** | Combinación de sentimiento negativo + intención "Queja" + ausencia de respuesta dentro de un umbral de tiempo — alimenta directamente la Priorización (§8) |

## 7. Motor de priorización

**Fórmula conceptual** (no un algoritmo final — pesos y umbrales son decisión pendiente de `MPS-002-002`, informada por datos reales, no fabricada aquí sin evidencia, `CLAUDE.md` §6):

```
Prioridad = f(
  Urgencia_detectada_por_IA,       -- de la etapa 7 (ej. palabras "urgente", "ahora")
  Sentimiento,                      -- negativo pesa más que positivo/neutral
  Tipo_de_intención,                -- Queja y Oportunidad comercial priorizan más que Soporte genérico
  Valor_comercial_estimado,         -- si la intención es Venta/Oportunidad
  Tiempo_sin_respuesta,             -- crece con el tiempo, evita que una conversación se "enfríe"
  Historial_del_cliente             -- cliente recurrente/de alto valor prioriza sobre uno nuevo, si esa política está activa
)
```

**Ajuste por reglas de negocio**: la empresa cliente puede sobreescribir el peso relativo de cada factor vía el Business Rules Engine (`09B-BUSINESS-RULES-ENGINE.md`) — ej. un restaurante podría priorizar "Reservación" sobre cualquier otra intención durante horas pico, una decisión de negocio que el motor no debe imponer por defecto.

**Explicabilidad (principio 7, §3)**: cada puntaje de prioridad se acompaña del factor dominante que lo produjo — nunca solo un número.

## 8. Motor de recomendaciones

| Tipo de recomendación | Automática o requiere validación | Justificación |
|---|---|---|
| Respuesta sugerida (texto) | Requiere validación — el colaborador la envía, edita o descarta | Principio Human in the Loop (§3); es la evolución directa de Community Manager Advisor (`05A` #11) |
| Promoción a ofrecer | Requiere validación | Un descuento/oferta incorrecta tiene costo real de negocio |
| Producto a sugerir (venta cruzada) | Requiere validación | Mismo criterio — sugerencia comercial, nunca automática |
| Automatización a activar (ej. "esto podría ser un workflow") | Requiere aprobación explícita del `company_admin` antes de activarse (`09G-APPROVAL-WORKFLOWS.md` §3, categoría "Automatizaciones") | Activar una automatización nueva es, en sí, un cambio de configuración, no una acción de respuesta |
| Seguimiento sugerido (cuándo y cómo) | Puede ser automático **solo si** ya existe una regla aprobada de antemano (ej. recordatorio genérico a las 24h) — la sugerencia inicial de crear esa regla sí requiere aprobación | Distingue "ejecutar una regla ya aprobada" (aceptable automatizar) de "decidir una acción nueva no configurada" (siempre requiere humano) |
| Escalamiento sugerido | Automático cuando cumple una condición ya configurada (ej. sentimiento muy negativo) — la notificación de escalamiento es automática, la decisión de qué decir al escalar sigue siendo humana | Mismo patrón que alertas de `CCEC-004C` — informa, no actúa por su cuenta |
| Venta (cerrar/confirmar) | Nunca automática | Efecto financiero directo — máximo nivel de Human in the Loop |
| Reservación (confirmar) | Automática **solo si** existe integración de disponibilidad que lo garantice (fuera de alcance de este documento) — sin esa integración, siempre requiere validación | Confirmar una reservación que en realidad no hay disponible sería un error de negocio grave |

## 9. Motor de aprendizaje

**Lo que SÍ es**: un ciclo de retroalimentación estructurado — se registra qué sugerencia se dio, si se usó tal cual, se editó, o se ignoró (etapa 14 del ciclo de vida), junto con el resultado final de la conversación (venta, resolución, tiempo, satisfacción si existe encuesta). Este historial es analizable por un humano (`company_admin`, o en el futuro un agente de tipo `05A` #13 Customer Experience Advisor) para ajustar manualmente las reglas de clasificación/priorización o el prompt del análisis IA (etapa 7).

**Lo que NO es, explícitamente** (regla de esta fase): no hay entrenamiento automático de un modelo propietario de MAHP. El proveedor de IA (`ADR-007`) sigue siendo un modelo de propósito general consultado por prompt — "aprender" significa que **los humanos y las reglas configurables mejoran con el tiempo**, no que el modelo subyacente se reentrena. Esto es consistente con `05-AI-ECOSYSTEM.md` (ningún documento previo de MAHP asume fine-tuning propio) y evita un riesgo de costo/complejidad no justificado (`PROJECT-BLUEPRINT.md` §5 principio 5).

**Métricas que alimenta el ciclo**: tasa de aceptación de sugerencia (usada tal cual / editada / ignorada), tiempo de resolución por tipo de intención, conversión por intención, satisfacción cuando exista encuesta (caso de uso 9, `MEM-002-001` §7).

## 10. Eventos del sistema

| Evento | Descripción | Productor | Consumidores | Datos mínimos |
|---|---|---|---|---|
| `ConversationReceived` | Nuevo mensaje entrante capturado | Adaptador de canal (Meta) | Etapa de normalización, Analytics | `conversation_id`, `company_id`, `channel`, `timestamp` |
| `ConversationAssigned` | Conversación asignada a un colaborador/rol | Motor de asignación (etapa 10) | Notification Center (`09H`), Dashboard Ejecutivo | `conversation_id`, `assigned_to`, `priority_score` |
| `AIRecommendationGenerated` | El motor de recomendaciones produjo una sugerencia | Motor de recomendaciones (§8) | Interfaz del colaborador (futuro, `MPS-002-002`), Motor de Aprendizaje | `conversation_id`, `recommendation_type`, `confidence` |
| `CustomerIntentDetected` | Intención del cliente identificada (distinta de intención de negocio) | Análisis IA (etapa 7) | Motor de clasificación, Analytics | `conversation_id`, `intent_type`, `confidence` |
| `BusinessIntentDetected` | Intención de negocio identificada (§6) | Análisis IA (etapa 7) | Motor de priorización, Automatizaciones, Analytics | `conversation_id`, `business_intent`, `confidence` |
| `ConversationEscalated` | Conversación escalada a un rol de mayor jerarquía | Motor de recomendaciones o regla de negocio | Notification Center, Auditoría | `conversation_id`, `escalated_to`, `reason` |
| `ConversationResolved` | Conversación cerrada | Colaborador o regla automática (etapa 13) | Analytics, Motor de Aprendizaje | `conversation_id`, `resolution_type`, `duration` |
| `LeadCreated` | Conversación generó un lead calificado (caso de uso 29, `MEM-002-001` §7) | Colaborador o regla de negocio | CRM ligero, Campaign Manager, Analytics | `conversation_id`, `contact_id`, `source_campaign` (opcional) |
| `ReservationCreated` | Conversación generó una reservación confirmada | Colaborador (o automatización, si existe integración de disponibilidad) | Analytics, Dashboard Ejecutivo | `conversation_id`, `contact_id`, `reservation_datetime` |
| `WorkflowTriggered` | Una automatización de `09A-WORKFLOW-ENGINE.md` se disparó a partir de esta conversación | Business Rules Engine (`09B`) | Workflow Engine | `conversation_id`, `workflow_id`, `trigger_event` |
| `AuditRecorded` | Un evento de esta conversación se registró en auditoría | Cualquier etapa con relevancia de auditoría | `CCEC-001` (`audit_log`) | Mismo formato ya fijado en `CCEC-001A` |
| `AnalyticsUpdated` | Métricas agregadas actualizadas con el resultado de esta conversación | Etapa 15/18 del ciclo de vida | `CCEC-004A` | Agregado, no por conversación individual |

## 11. Integración con MAHP

| Sistema | Entradas que recibe del CIE | Salidas que el CIE consume de él | Dependencias | Eventos |
|---|---|---|---|---|
| **CRM (ligero, `MPS-002-000` §6)** | Contacto + historial de conversación | Historial existente del contacto (etapa 5) | Ninguna nueva — vive dentro del propio dominio del CIE, no un CRM externo | `LeadCreated` |
| **Workflow Engine (`09A`/`09B`)** | Eventos de conversación como disparadores | Ejecución de automatizaciones aprobadas | Motor de reglas y workflows ya diseñado, sin cambios | `WorkflowTriggered` |
| **AI Ecosystem (`05-*`)** | Ninguna — el CIE es quien consume, no quien alimenta agentes | Community Manager Advisor (`05A` #11) como agente de sugerencia de respuesta | Patrón de orquestación "cadena" ya diseñado (`09E`) | `AIRecommendationGenerated` |
| **Notification Center (`09H`)** | Eventos que requieren aviso (asignación, escalamiento, mensaje sin responder) | Ninguna — es unidireccional hacia notificaciones | Motor de notificaciones ya diseñado | `ConversationAssigned`, `ConversationEscalated` |
| **Analytics (`CCEC-004A`, `07A` §11)** | Métricas agregadas de conversación | Ninguna — es unidireccional hacia métricas | `CCEC-004` ya diseñado | `AnalyticsUpdated` |
| **Audit Platform (`CCEC-001`)** | Eventos con relevancia de auditoría | Ninguna | `CCEC-001` ya diseñado, requiere agregar el/los eventos nuevos de este documento a `CCEC-001A` cuando se construya | `AuditRecorded` |
| **Enterprise Data Platform (`07A-DOMAIN-MODEL.md`)** | Define el nuevo dominio "Comunicación/Conversaciones" (pendiente de agregar formalmente, ya señalado en `MPS-002-000` §"Vacíos") | Principios de gobierno de datos ya establecidos (`07B`) | Ninguna nueva | N/A — es estructural, no de eventos |
| **Identity & Access Management (`07H`, `profiles`)** | Determina quién puede ver/responder cada conversación | Rol + `company_id` del usuario actual | Sin cambios al modelo de 4 roles | N/A |
| **Dashboard Ejecutivo (`06A-CORE-MODULES.md` #6)** | Indicador agregado de conversaciones (activas, prioridad alta, etc.) | Ninguna | Extensión aditiva de `renderizarResumen()` | Consume `AnalyticsUpdated` indirectamente |

## 12. KPIs del motor

| KPI | Cómo se calcula | Para qué sirve |
|---|---|---|
| Tiempo de primera respuesta | `timestamp` de etapa 11 − `timestamp` de etapa 1 | Mide agilidad real, objetivo central de `MEM-002-001` §3 |
| Tiempo de resolución | `timestamp` de etapa 13 − `timestamp` de etapa 1 | Eficiencia operativa completa |
| Precisión en clasificación | % de clasificaciones de IA no corregidas por un humano | Calidad del análisis IA (etapa 7) — requiere que la corrección humana quede registrada (etapa 14) |
| Precisión de recomendaciones | % de recomendaciones usadas tal cual (sin editar) | Calidad del motor de recomendaciones (§8) |
| Conversaciones resueltas | Conteo de `ConversationResolved` por periodo | Volumen operativo |
| Conversaciones escaladas | Conteo de `ConversationEscalated` por periodo | Señal de carga o de casos complejos — no es necesariamente negativo, pero merece revisión si crece sin control |
| Conversión comercial | Conversaciones con `LeadCreated`/venta atribuida ÷ conversaciones con intención "Venta"/"Oportunidad comercial" | Mide impacto de negocio real, no solo actividad |
| Clientes recuperados | Conversaciones con intención "Recuperación de clientes" que terminan en resultado positivo | Mide efectividad de reactivación |
| Satisfacción | Promedio de encuestas post-conversación (caso de uso 9, cuando exista el mecanismo) | Experiencia del cliente final |
| Automatizaciones exitosas | % de `WorkflowTriggered` que completan sin fallo (`09A-WORKFLOW-ENGINE.md` KPIs, reutilizado) | Salud de la capa de automatización específica de conversación |

Mecanismo de captura: `CCEC-004A-METRICS-AND-DASHBOARDS.md`, reutilizado sin excepción — ningún KPI de esta lista se mide con infraestructura propia del CIE.

## 13. Riesgos

| Riesgo | Tipo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|---|
| Clasificación/priorización incorrecta con alta confianza aparente | Técnico/Ético | Alto — una queja mal priorizada como baja urgencia puede perder un cliente | Media | Principio Explainable AI (§3) — el motivo siempre visible permite que un humano detecte un error antes de actuar; nunca se ejecuta una acción crítica solo por el puntaje |
| Dependencia de IA para toda la cadena de valor del módulo | Técnico | Alto — si el proveedor de IA falla, el CIE completo se degrada | Media | Cada etapa que depende de IA (7, 8, 9, 11-sugerencia) tiene una ruta de degradación explícita a proceso manual (§4), nunca bloquea la conversación |
| Sesgo o trato desigual por el motor de priorización (ej. priorizar sistemáticamente cierto tipo de cliente) | Ético | Alto — riesgo reputacional y potencialmente legal | Baja-media | Pesos de priorización configurables y auditables (§8) — un `company_admin` puede revisar por qué el motor prioriza como prioriza |
| Privacidad de datos de conversación | Ya cubierto en `CCEC-005` | Alto | Media | Este documento no reintroduce el riesgo, lo hereda con la mitigación ya definida — cada etapa que retiene dato lo hace con minimización (§3, principio 6) |
| Ventana de 24h de Meta rompe el flujo de seguimiento diseñado (§4, etapa 12) | Técnico — **directamente ligado al [HIPÓTESIS] de §1** | Medio-alto si se confirma | Media | Validar contra documentación oficial de Meta antes de `MPS-002-002`; diseñar la etapa 12 con una ruta alternativa (plantilla aprobada) desde el inicio, no como parche posterior |
| Escalabilidad del motor de análisis IA a alto volumen de conversaciones simultáneas | Técnico | Medio, lejano | Baja al volumen inicial | Hereda los límites ya reconocidos de `07-ENTERPRISE-DATA-PLATFORM.md` §8 y el control de costo de `05C-AI-GOVERNANCE.md` §3 |
| Disponibilidad — el CIE depende de Meta Graph API, del proveedor de IA, y de la cola de eventos propia | Operativo | Medio | Media | Cada dependencia externa aislada por adaptador (`ADR-008`, `ADR-010`) — un fallo de una no debe cascar a las demás |

## 14. Decisiones pendientes explícitas (no resueltas en este documento)

1. **Identidad de contacto entre canales** (§4, etapa 4): ¿un mismo cliente escribiendo desde Instagram y Facebook es un contacto o dos?
2. **Dimensión "Sucursal"** (§7): sin valor real hasta que se resuelva el modelo de organización (`10C-ORGANIZATION-MODEL.md`).
3. **Intención "Reclutamiento"** (§6): ¿tiene sentido que el CIE la clasifique si MAHP no tiene módulo de RH para actuar sobre ella?
4. **Ventana de 24 horas de Meta** (§1, §4 etapa 12, §13): requiere verificación contra documentación oficial vigente antes de diseñar la etapa de seguimiento en detalle.
5. **Pesos exactos del Motor de Priorización** (§8): la fórmula es conceptual: los pesos reales deben calibrarse con datos de uso real, no fabricarse aquí.

---

## Diagramas

**Arquitectura lógica del CIE:**

```
┌─────────────────────────────────────────────────────────────┐
│                    CONVERSATION INTELLIGENCE ENGINE            │
│                                                                 │
│  Adaptador Meta ──▶ Normalización ──▶ Identificación           │
│                                       (canal + cliente)         │
│                                            │                     │
│                                            ▼                     │
│                              Consulta CRM ligero + historial     │
│                                            │                     │
│                                            ▼                     │
│                    ┌───────────────────────────────────┐        │
│                    │   Análisis IA (Edge Function proxy) │        │
│                    │   (mismo patrón que ADR-007)         │        │
│                    └───────────────────┬───────────────┘        │
│                                         ▼                         │
│         ┌───────────────┬───────────────┬───────────────┐        │
│         ▼               ▼               ▼               ▼        │
│   Clasificación    Priorización    Recomendaciones   Business     │
│      (§7)             (§8)             (§9)       Intent (§6)    │
│         └───────────────┴───────────────┴───────────────┘        │
│                                 │                                 │
│                                 ▼                                 │
│                    Asignación + Notificación (09H)                │
│                                 │                                 │
│                                 ▼                                 │
│               Respuesta (humana o automatización aprobada)        │
│                                 │                                 │
│                                 ▼                                 │
│                    Cierre → Retroalimentación → Aprendizaje       │
│                                 │                                 │
│                                 ▼                                 │
│               Analytics (CCEC-004A) + Auditoría (CCEC-001)        │
└─────────────────────────────────────────────────────────────┘
```

**Máquina de estados de una conversación:**

```
recibido ──▶ en_analisis ──▶ clasificado ──▶ asignado ──▶ respondido
                                                              │
                                          ┌───────────────────┼──────────────┐
                                          ▼                   ▼               ▼
                                    en_seguimiento      escalado         cerrado
                                          │                   │               ▲
                                          └───────────────────┴───────────────┘
                                              (cualquiera de estos ──▶ cerrado)
                                                              │
                                                              ▼
                                                    reabierto (desde cerrado,
                                                    sin fricción — §4 etapa 13)
```

**Flujo de decisiones del Business Intent Engine:**

```
Mensaje + contexto
        │
        ▼
¿Menciona producto/precio? ──sí──▶ Venta / Oportunidad comercial (según valor)
        │no
        ▼
¿Menciona fecha/disponibilidad? ──sí──▶ Reservación
        │no
        ▼
¿Sentimiento negativo + insatisfacción? ──sí──▶ Queja (prioridad alta automática)
        │no
        ▼
¿Cliente inactivo reactivándose? ──sí──▶ Recuperación de clientes
        │no
        ▼
¿Pregunta sobre algo ya adquirido? ──sí──▶ Soporte
        │no
        ▼
   Clasificación por defecto: Consulta general
```

**Flujo de eventos (extremo a extremo, ver también §4 y §10):**

```
ConversationReceived
        │
        ▼
CustomerIntentDetected + BusinessIntentDetected (paralelo, misma llamada de análisis IA)
        │
        ▼
ConversationAssigned ──▶ [Notification Center]
        │
        ▼
AIRecommendationGenerated (opcional, si aplica)
        │
        ▼
[Respuesta humana] ──▶ ConversationResolved o ConversationEscalated
        │
        ▼
AnalyticsUpdated + AuditRecorded
```

**Integraciones con módulos MAHP** — ver tabla completa en §11, representada como grafo:

```
                    ┌─────────────┐
                    │     CIE       │
                    └──────┬──────┘
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                     ▼
  Workflow Engine    AI Ecosystem            Notification
  (09A/09B)          (05A #11 vía 09E)        Center (09H)
        │                   │                     │
        └───────────────────┼─────────────────────┘
                             ▼
                    Analytics (CCEC-004A) + Audit (CCEC-001)
                             │
                             ▼
                    Dashboard Ejecutivo (06A #6)
```

---

## Definition of Done

✓ Especificación integral del CIE (este documento).
✓ Reglas de negocio claras en cada etapa del ciclo de vida (§4).
✓ Ciclo de vida completo, 18 etapas (§4).
✓ Motores de clasificación, priorización y recomendaciones (§6–9).
✓ Eventos documentados (§10).
✓ Diagramas arquitectónicos (6, sección Diagramas).
✓ Coherencia con MDS, MEM, CCEC y ADR validada (Entregable Final).

---

## Entregable Final

**1. Resumen ejecutivo**: el CIE es una secuencia de 18 etapas orientada a eventos que convierte un mensaje de Meta en información accionable — clasificación, prioridad, recomendación e intención de negocio — sin construir infraestructura de IA nueva (reutiliza el proxy de Edge Function ya validado, `ADR-007`) ni motor de reglas nuevo (reutiliza `09A`/`09B`). Cada salida de IA es explicable y ninguna acción crítica ocurre sin aprobación humana, extendiendo sin excepción los principios ya no negociables de toda la plataforma.

**2. Lista de decisiones arquitectónicas nuevas (ADR propuestas, no creadas todavía)**:

| # | Título propuesto | Contexto breve | Estado |
|---|---|---|---|
| ADR-013 (propuesta) | El CIE es una cadena de eventos sobre el motor de workflows existente, no un motor de IA/reglas independiente | Evita que Social AI Hub termine con su propia infraestructura de automatización paralela a `09A`/`09B` | Propuesto — pendiente de tu aprobación para crear el archivo |
| ADR-014 (propuesta) | Ninguna clasificación/priorización/recomendación de IA se aplica sin campo de explicación (motivo) visible | Formaliza el principio "Explainable AI" (§3) como decisión vinculante, no solo aspiracional | Propuesto |
| ADR-015 (propuesta) | El Motor de Aprendizaje no entrena modelos propietarios — mejora por ajuste humano de reglas/prompts, nunca fine-tuning automático | Evita ambigüedad futura sobre si "aprendizaje continuo" implica una inversión de infraestructura de ML que MAHP no ha decidido asumir | Propuesto |

**3. Riesgos abiertos y decisiones pendientes**: consolidados en §14 (5 decisiones) y §13 (7 riesgos) — el más urgente por bloquear diseño posterior es la verificación de la ventana de 24 horas de Meta (§1, §13), porque afecta directamente cómo se diseña la etapa de seguimiento en `MPS-002-002`.

**4. Recomendaciones antes de iniciar `MPS-002-002` (Functional Specification)**: (a) verificar contra documentación oficial de Meta vigente la política de ventana de 24h antes de diseñar la etapa de seguimiento en detalle; (b) resolver la decisión de identidad de contacto entre canales (§14, punto 1) — afecta directamente el modelo de datos de "contacto" que `MPS-002-002` tendrá que definir; (c) decidir si las 3 ADR propuestas se crean ahora o se difieren hasta validar el CIE contra un caso de uso real.

**Verificación de coherencia con MDS, MEM, CCEC y ADR**: revisada contra `MPS-002-000` (principios, límites de CRM respetados en todo el diseño del CIE — ningún motor gestiona pipeline de ventas), `MEM-002-001` (casos de uso referenciados sin repetirse), `05-AI-ECOSYSTEM.md`/`05A` #11/`09E-AI-ORCHESTRATION.md` (el CIE consume, no redefine, la orquestación de IA), `09A`/`09B`/`09C`/`08F` (reutilizados sin excepción para eventos y workflows), `CCEC-001`/`004`/`005` (auditoría, observabilidad y privacidad heredadas, no redefinidas), `ADR-001` a `ADR-012`. **Ninguna inconsistencia ni duplicidad detectada.**

**No se implementó código, interfaz, API ni base de datos física en esta fase — solo lógica de negocio y arquitectura funcional, conforme a las reglas de MPS-002-001. No avanzar a MPS-002-002 hasta recibir aprobación explícita.**
