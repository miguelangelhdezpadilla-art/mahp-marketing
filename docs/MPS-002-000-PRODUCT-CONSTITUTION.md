# MPS-002-000 — SOCIAL AI HUB: Product Constitution

> Primer documento de **MAHP Product Specifications (MPS)** — una serie
> nueva, distinta de MEM: si `MEM-002-001` fue la *visión de negocio*
> (por qué construirlo, para quién, contra quién compite), MPS es la
> *constitución de producto* — identidad, filosofía, límites y gobierno
> que toda especificación funcional futura (`MPS-002-001` en adelante)
> debe respetar. No repite el contenido de `MEM-002-001`, lo asume como
> ya resuelto y construye la siguiente capa encima.
>
> **Estado: [FUTURO] en su totalidad** — mismo estado que `MEM-002-001`,
> sin cambio: este documento define identidad y dirección, no construye
> nada.
>
> Dependencias verificadas antes de escribir: MDS-001 a MDS-012 (existen),
> `CCEC-001`/`004`/`005` (existen), `ADR-001` a `ADR-009` (existen),
> `MEM-002-001` (existe, con sus 4 ajustes ya aprobados). Sin gaps de
> dependencia.
>
> Última actualización: 2026-07-12.

---

## 1. Contexto — ampliación de alcance frente a `MEM-002-001`

`MEM-002-001` ya fijó el alcance de **MVP** a Meta Graph API únicamente (Facebook Pages, Instagram Business, Messenger). Este documento no lo contradice — establece la **arquitectura de producto** para que WhatsApp Business Platform, TikTok, Telegram, Google Business Messages, Email y Web Chat puedan sumarse después **sin rediseñar el módulo**, consistente con `08-ENTERPRISE-INTEGRATION-PLATFORM.md` §2 (adaptador propio por proveedor) ya aplicado a todo MAHP. Meta es el primer canal, no el único que la arquitectura soporta — ver `ADR-010`.

## 2. Misión

Ser el módulo de MAHP donde cada conversación con un cliente final deja de ser un evento aislado en una app externa y se convierte en un dato de negocio que alimenta, con permiso y propósito claros, marketing (`campaigns`), ventas (leads/oportunidades), atención al cliente (historial de conversación), CRM ligero (`§6`, límite explícito), automatización (`09-*`), IA (`05-*`) y analítica (`07A` §11). Ninguna conversación debe generar valor para un solo dominio si puede generarlo, de forma coherente y con permiso, para varios.

## 3. Visión

| Horizonte | Visión |
|---|---|
| **1 año** | Meta Graph API funcionando en producción real (Facebook Pages, Instagram Business, Messenger) — bandeja unificada, Community Manager Advisor (`05A` #11) respondiendo con contexto real por primera vez desde que fue diseñado en MDS-006. |
| **3 años** | Segundo y tercer canal activos (candidatos ya identificados en `MEM-002-001` V2/V3: WhatsApp Business Platform) — el mismo módulo, sin haber requerido reconstruirlo, prueba de que la arquitectura channel-agnostic (`ADR-010`) cumplió su propósito. |
| **5 años** | Inteligencia conversacional real: el Conversation Intelligence Engine (CIE — próxima fase funcional, ver §13) opera de forma rutinaria sobre volumen real: sentimiento, intención, siguiente mejor acción, integrados con Automatizaciones y Analytics sin ser un sistema de IA paralelo. |
| **10 años** | Social AI Hub como la razón por la que una empresa nueva elige MAHP en primer lugar, no solo una función que ya tenía cuando llegó — mismo criterio de categoría que `11I-LONG-TERM-VISION.md` aplica a todo MAHP, aquí concentrado en comunicación conversacional. |

## 4. Principios fundamentales del producto

| # | Principio | Qué significa | Por qué existe | Cómo afecta al diseño | Ejemplo práctico |
|---|---|---|---|---|---|
| 1 | **Omnicanal desde el diseño** | El núcleo del módulo no conoce "Meta" — conoce "conversación", "mensaje", "contacto"; cada canal es un adaptador que traduce hacia ese núcleo | Evita reconstruir el módulo por cada canal nuevo (§1) | Modelo de datos y lógica de negocio channel-agnostic; solo el adaptador de integración (`08-*`) es específico de proveedor | Agregar Telegram en el futuro no debería tocar cómo se guarda o enruta una conversación, solo cómo se recibe/envía el mensaje |
| 2 | **AI First** | La IA participa en el flujo desde el primer diseño, no se añade después | Mismo principio ya establecido para todo MAHP (`PROJECT-BLUEPRINT.md` §4) | El modelo de datos de conversación incluye desde el día uno campos para contexto/sugerencia de IA, no se agregan como parche | Una conversación siempre tiene un lugar donde vivir la sugerencia de Community Manager Advisor, no una tabla aparte agregada después |
| 3 | **Human in the Loop** | Ninguna acción crítica (enviar un mensaje real, cerrar una venta, prometer algo a un cliente) ocurre sin que un humano la apruebe o la ejecute directamente | No negociable en todo MAHP (`PROJECT-BLUEPRINT.md` §5 principio 3, `ADR-007`, `ADR-009`) | Todo flujo de IA termina en sugerencia o en un paso de aprobación (`09G-APPROVAL-WORKFLOWS.md`), nunca en envío automático sin excepción configurable | Casos de uso 47–50 de `MEM-002-001` respetan este límite incluso en el horizonte "AI Native" |
| 4 | **Privacy by Design** | La protección del dato de terceros se decide en el diseño, no se agrega antes de "lanzar" | Consecuencia directa del hallazgo de `CCEC-005-PRIVACY-AND-COMPLIANCE.md` | Minimización de datos, aislamiento multiempresa sin excepción, mecanismo de eliminación a solicitud del sujeto del dato — desde el modelo de datos, no como capa posterior | El campo de mensaje se diseña sabiendo que un día podría necesitar borrarse a solicitud del cliente final (`CCEC-005` §3, principio 5) |
| 5 | **Security by Design** | Credenciales y datos de conversación protegidos desde el primer diseño técnico | Mismo estándar ya fijado en `08E-SECURITY.md` | Tokens de Meta Graph API cifrados desde el primer adaptador, nunca "agregar cifrado después" | `integration_tokens` (`08E-SECURITY.md` §8) aplica sin excepción a las credenciales de este módulo |
| 6 | **API First** | Toda funcionalidad del módulo debe poder invocarse por API antes de tener pantalla | Mismo principio ya elevado a filosofía de toda la plataforma (`08-ENTERPRISE-INTEGRATION-PLATFORM.md` §1) | El diseño funcional (`MPS-002-001`) debe poder describirse como contrato de datos antes de describirse como interfaz | Una conversación y sus mensajes son entidades con forma clara, independientemente de qué pantalla las muestre |
| 7 | **Event Driven** | Cada hecho relevante (mensaje recibido, conversación asignada, IA sugirió algo) es un evento nombrado, no una escritura silenciosa | Reutiliza el catálogo ya diseñado (`09C-EVENT-CATALOG.md`, `08F-EVENT-ARCHITECTURE.md`) en vez de crear uno paralelo | Todo evento nuevo de este módulo se agrega al catálogo existente, con el mismo formato `dominio.acción` | `conversacion.mensaje_recibido`, `conversacion.asignada`, `conversacion.resuelta` — mismo vocabulario que el resto de MAHP |
| 8 | **Mobile First** | La experiencia de responder conversaciones se diseña primero para una pantalla pequeña, porque quien atiende suele hacerlo desde el celular | Nuevo para MAHP — el resto de la plataforma no lo declara explícitamente, este módulo sí porque su patrón de uso real (responder rápido, en movimiento) lo exige | El diseño funcional (`MPS-002-001`) debe evaluarse primero en un layout angosto, no adaptarse después desde escritorio | Un `collaborator` respondiendo desde su celular en un restaurante durante el servicio es el caso de uso primario, no el secundario |
| 9 | **Escalabilidad empresarial** | El módulo debe sostener desde una conversación diaria hasta miles, sin rediseño | Hereda directamente `07-ENTERPRISE-DATA-PLATFORM.md` §8 | Mismo modelo multi-tenant, mismos límites reconocidos de la cola Postgres+`pg_cron` (`ADR-008`) — no se inventa infraestructura nueva | Un restaurante independiente (decenas/día) y una cadena (cientos/día) usan la misma arquitectura, distinta solo en volumen |
| 10 | **Observabilidad** | Salud del módulo (mensajes entregados, latencia de respuesta, fallos de canal) es visible, no solo inferible | Consume `CCEC-004` directamente, no redefine observabilidad | Métricas de este módulo se definen en el formato de `CCEC-004A`, no como panel aislado | Latencia de entrega de mensaje por canal es una métrica más en el mismo vocabulario que latencia de Edge Functions |
| 11 | **Auditoría completa** | Quién leyó/respondió qué conversación queda registrado | Consume `CCEC-001` directamente | Todo acceso a conversación con datos de tercero es candidato de evento auditable (`CCEC-005` checklist) | Un `super_admin` que abre una conversación de soporte queda tan auditado como cuando impersona una empresa (`v19`) |
| 12 | **Experiencia de usuario consistente** | La bandeja de conversaciones se siente parte de MAHP, no una herramienta pegada | Mismo sistema de diseño ya construido (`04-DESIGN-SYSTEM.md`) | Ningún componente visual nuevo que no siga los tokens/patrones ya establecidos | Mismos colores de estado, misma tipografía, mismo lenguaje de badges que el resto de la app |
| 13 | **Automatización configurable** | Respuestas frecuentes y enrutamiento se automatizan con el motor ya existente | Reutiliza `09A-WORKFLOW-ENGINE.md`/`09B-BUSINESS-RULES-ENGINE.md`, no un motor propio | Una regla de automatización de conversación tiene la misma forma (evento → condición → acción) que cualquier otra en MAHP | "Si llega un mensaje fuera de horario, responder con mensaje automático" es un workflow más, no un feature especial de este módulo |
| 14 | **Arquitectura modular** | Social AI Hub se puede desactivar por empresa sin romper el resto de MAHP | Mismo criterio de activación por plan (`10B-SUBSCRIPTION-AND-LICENSING.md`) | El módulo no introduce dependencias obligatorias en el Core — una empresa sin Social AI Hub activo sigue operando MAHP normalmente | Un plan básico podría no incluir este módulo, igual que hoy podría no incluir acceso a IA (`10B` §2) |
| 15 | **Integración nativa con el ecosistema MAHP** | No es un componente aislado (`ADR-009`) | Decisión ya tomada y registrada | Toda relación con otros dominios se diseña explícitamente (§6, §7), no se deja implícita | Community Manager Advisor, Workflow Engine, KPIs — todos consumidos, ninguno reinventado |

## 5. Product Philosophy

**¿Qué es Social AI Hub?** El módulo de MAHP donde vive toda conversación externa con un cliente final, conectada al resto de la operación de marketing/ventas/atención que MAHP ya gestiona.

**¿Qué NO es?** No es un CRM completo (§6, límite explícito). No es una app de mensajería genérica (existe porque está conectada a MAHP, no como producto aislado). No es un sistema de atención al cliente de tickets estilo Zendesk — no gestiona SLA de soporte técnico complejo, gestiona conversación comercial/operativa (`MEM-002-001` §8, ya diferenciado de Zendesk/Freshdesk ahí).

**¿Qué problemas resuelve?** Ver `MEM-002-001` §4 — no se repite aquí.

**¿Qué problemas NO pretende resolver?** Soporte técnico complejo con base de conocimiento y SLA multinivel (ese es el espacio de Zendesk/Freshdesk, `MEM-002-001` §8); gestión de pipeline de ventas B2B complejo (espacio de HubSpot/Salesforce); comunicación interna de equipo (para eso ya existen Slack/Teams como integraciones de notificación, `08C-INTEGRATIONS-CATALOG.md`, no conversación con clientes).

**¿Cuál será su mayor diferenciador?** Ver `MEM-002-001` §9 (Ventajas competitivas) — no se repite. Resumen: contexto de campaña/KPI nativo, inexistente en cualquier competidor comparado porque ninguno nace como plataforma de marketing.

**¿Por qué una empresa debería adoptarlo?** Porque ya es cliente de MAHP — adoptar Social AI Hub no es evaluar una herramienta nueva, es activar una capacidad dentro de la que ya opera.

## 6. Product Boundaries

Sección crítica dado un hallazgo de coherencia real: `01-IDENTIDAD-DEL-PRODUCTO.md` §1 declara explícitamente **"MAHP no es un CRM"**, y `06J-FUTURE-MODULES.md` §1 cataloga CRM completo como fuera de alcance porque "contradice explícitamente la identidad del producto". Este documento **no revierte esa decisión** — la precisa:

| Frontera | Qué SÍ pertenece a Social AI Hub | Qué NO pertenece (sigue fuera de alcance) |
|---|---|---|
| **vs. CRM** | Historial de conversación por contacto, datos mínimos para responder con contexto (nombre, canal, conversaciones previas) — un "CRM ligero" en el sentido más literal: *relación con el cliente*, registrada, nada más | Pipeline de ventas con etapas configurables, gestión de oportunidades comerciales complejas, reportes de ventas tipo CRM — si la demanda real algún día lo justifica, es una decisión estratégica de expandir la categoría del producto completo (`06J` §1), no una función que este módulo añade por su cuenta |
| **vs. AI Ecosystem** | Consumir Community Manager Advisor (`05A` #11) como su agente de integración oficial (`ADR-009`) | Diseñar agentes de IA nuevos — cualquier especialista de IA nuevo se diseña en `05-AI-ECOSYSTEM.md`, no dentro de este módulo |
| **vs. Automatizaciones** | Configurar reglas/workflows específicos de conversación usando el motor existente | Construir un motor de reglas o de colas propio — prohibido explícitamente por `ADR-008` (una sola infraestructura de cola para todo MAHP) |
| **vs. Analytics** | Generar datos que alimenten KPIs ya existentes (`07A` §11) y métricas propias de conversación (`MEM-002-001` §10) | Construir un sistema de reportes/dashboards paralelo — toda métrica pasa por `CCEC-004A` |
| **vs. Core Platform** | Heredar `company_id`, RLS, roles de 4 tipos, autenticación — sin excepción | Redefinir aislamiento multiempresa, autenticación, o el modelo de roles — ninguno se toca |

## 7. Relación con el ecosistema MAHP

| Sistema | Objetivo de la relación | Información intercambiada | Eventos generados | Dependencias |
|---|---|---|---|---|
| **CRM** *(no existe como módulo — ver §6)* | Ninguna relación real con un CRM que no existe; Social AI Hub cubre el espacio mínimo de "relación con cliente" sin ser uno | Contacto ↔ historial de conversación | N/A | Ninguna — es autocontenido en este aspecto |
| **AI Ecosystem** (`05-*`) | Activar Community Manager Advisor con datos reales (`ADR-009`) | Contenido de conversación → contexto de entrada; sugerencia de IA → salida | `ia.tarea_completada` (`08F` §2, reutilizado) | Community Manager Advisor ya diseñado, sin cambios de diseño necesarios en el agente mismo |
| **Campaign Manager** (`campaigns`, `06B-MARKETING-MODULES.md`) | Vincular conversación a la campaña que la originó, cuando aplica | `campaign_id` opcional en la conversación | `campana.publicada` como posible origen de una conversación | Campañas ya existentes, sin cambio |
| **Analytics** (`07A` §11, `06D-ANALYTICS-MODULES.md`) | Conversación convertida en dato de KPI (conversión, tiempo de respuesta) | Métricas agregadas de conversación → panel de KPIs existente | Ninguno nuevo — consume el mismo mecanismo de `CCEC-004A` | `CCEC-004` debe existir (existe) |
| **Workflow Engine** (`09A`/`09B`) | Automatizar respuestas frecuentes y enrutamiento | Evento de conversación → regla → acción | `conversacion.mensaje_recibido`, `conversacion.vencida` (nuevos, a agregar a `09C-EVENT-CATALOG.md` cuando se construya) | Motor de workflows debe existir con volumen real de uso (`11A-PRODUCT-ROADMAP.md` Fase 2–3) |
| **Notification Center** (`09H`) | Alertar de mensaje sin responder a tiempo | Evento de conversación → notificación al colaborador/rol responsable | Reutiliza el mismo motor, ningún canal nuevo de notificación por este módulo | `09H` ya diseñado |
| **Identity & Access Management** (`profiles`, RLS, `07H`) | Determinar quién puede ver/responder qué conversación | Rol + `company_id` → alcance de conversaciones visibles | Ninguno — hereda RLS existente | Sin cambios al modelo de 4 roles |
| **Audit Platform** (`CCEC-001`) | Registrar acceso a conversaciones con datos de terceros | Acceso a conversación → evento de auditoría | Nuevo evento a agregar a `CCEC-001A` cuando se construya (`conversacion_accedida` o similar) | `CCEC-001` ya diseñado |
| **Enterprise Data Platform** (`07A-DOMAIN-MODEL.md`) | Registrar "Comunicación/Conversaciones" como dominio nuevo de datos | N/A — es el propio dominio | N/A | Debe agregarse a `07A-DOMAIN-MODEL.md` cuando se construya (nuevo dominio, hoy no listado) |
| **API Platform** (`08-*`) | Exponer el adaptador de Meta Graph API y, eventualmente, una API pública de conversaciones | Credenciales cifradas, mensajes entrantes/salientes | `integracion.conectada`/`desconectada`, `integracion.fallida` (`08F`/`09C`, reutilizados) | Adaptador nuevo específico de Meta, siguiendo el patrón ya establecido |
| **Dashboard Ejecutivo** (`06A-CORE-MODULES.md` #6) | Sumar indicador de conversación al resumen ejecutivo ya existente | Conteo/estado agregado de conversaciones → tarjeta del dashboard | Ninguno nuevo | `renderizarResumen()` ya existente, extensión aditiva |

## 8. Product Decisions (ADR)

Tres decisiones nuevas de este módulo, registradas en la serie ADR **compartida de toda la plataforma** (no una numeración propia del módulo — mismo criterio de "una sola definición" ya aplicado a CCEC, `ADR-INDEX.md`):

| Decisión de esta fase | ADR real | Nota |
|---|---|---|
| "Social AI Hub será un módulo nativo de MAHP" | **Ya registrada** — `ADR-009` (2026-07-12) | No se duplica; este documento la reafirma, no la re-declara |
| "El primer canal soportado será Meta, arquitectura preparada para más sin rediseño" | **Nueva — `ADR-010`** | Ver archivo dedicado |
| "La IA asistirá al usuario; las acciones críticas requerirán aprobación humana" | **Ya registrada** — principio no negociable de toda la plataforma (`PROJECT-BLUEPRINT.md` §5 principio 3, `ADR-007`, `ADR-009`) | No se duplica; no hay nada específico de este módulo que agregar a una regla ya absoluta |
| "Las conversaciones serán activos de negocio que alimentan CRM ligero, Analytics y Automatizaciones respetando permisos y privacidad" | **Nueva — `ADR-012`** | Ver archivo dedicado (numeración continúa tras `ADR-010`/`011`, ver nota) |

**Nota de numeración**: se salta a `ADR-012` porque `ADR-011` se reserva conceptualmente para la reafirmación de Human-in-the-Loop pero, al no haber contenido nuevo que justifique un archivo propio (sería un duplicado exacto de `ADR-007`/`ADR-009`), no se crea un archivo vacío solo para no saltar un número — el índice (`ADR-INDEX.md`) documenta explícitamente por qué `ADR-011` no existe como archivo.

## 9. Éxito del producto

No se repiten las métricas ya definidas en `MEM-002-001` §10 — se agrupan aquí por categoría, tal como pide esta fase:

| Categoría | Métricas |
|---|---|
| Objetivos estratégicos | Activación del módulo por empresas ya clientes de MAHP; tiempo desde activación hasta primera conversación real |
| KPIs | Tiempo de respuesta, tasa de conversación→venta (`MEM-002-001` §10) |
| Adopción | % de empresas cliente de MAHP con Social AI Hub activo; % de conversaciones atendidas dentro de MAHP vs. todavía fuera |
| Operativas | Conversaciones atendidas por periodo/canal/colaborador, disponibilidad del adaptador de Meta |
| IA | % de conversaciones con sugerencia de IA usada, % resueltas por IA sin intervención (una vez exista automatización de respuesta completa) |
| Comerciales | Leads generados, ventas atribuidas, ROI del módulo (`MEM-002-001` §10) |

## 10. Riesgos

No se repiten los riesgos ya identificados en `MEM-002-001` §12 (dependencia de Meta, privacidad, costo de IA, construir por anticipación) — este documento agrega los que emergen específicamente de la arquitectura channel-agnostic (`ADR-010`) y de la integración de ecosistema (§7):

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Diseñar el núcleo channel-agnostic mal desde el principio, forzando un rediseño real al agregar el segundo canal | Alto — invalidaría la promesa central de `ADR-010` | Media — es un riesgo de diseño, no de ejecución | `MPS-002-001` (Functional Specification) debe validar el modelo de datos explícitamente contra un segundo canal hipotético (WhatsApp) antes de darlo por bueno, no solo contra Meta |
| Sobre-conectar el módulo a demasiados sistemas del ecosistema (§7) antes de tener uso real, generando complejidad de mantenimiento sin beneficio probado | Medio | Media | Cada relación de §7 se activa cuando el propio dominio consumidor la necesite con evidencia real — mismo criterio de activación por demanda de toda la plataforma |
| Confundir "CRM ligero" (§6, permitido) con CRM completo (fuera de alcance) en el diseño funcional futuro, erosionando el límite ya fijado | Medio — riesgo de identidad de producto, no técnico | Media si no se vigila explícitamente | `MPS-002-001` debe citar explícitamente §6 de este documento antes de diseñar cualquier campo o pantalla relacionada con "cliente"/"contacto" |

---

## Checklist — validar que la constitución del producto está completa

- [x] ¿Existe misión y visión a 4 horizontes?
- [x] ¿Están los 15 principios explicados (qué/por qué/cómo/ejemplo)?
- [x] ¿La filosofía del producto responde qué es y qué NO es, con límites explícitos?
- [x] ¿Los límites funcionales evitan responsabilidad duplicada, en particular contra CRM?
- [x] ¿Existen decisiones arquitectónicas iniciales, sin duplicar las ya registradas?
- [x] ¿Existe integración conceptual con los 11 sistemas del ecosistema pedidos?
- [x] ¿Existen riesgos identificados, sin repetir los ya cubiertos en `MEM-002-001`?
- [x] ¿Existen criterios para evaluar funcionalidad futura? (§6, límite CRM; §7, activación por demanda de cada relación)

---

## Definition of Done

✓ Constitución oficial del producto (este documento).
✓ Principios de diseño (§4).
✓ Límites funcionales claros (§6).
✓ Decisiones arquitectónicas iniciales, sin duplicar (§8, `ADR-010`, `ADR-012`).
✓ Integración conceptual con el ecosistema (§7).
✓ Riesgos identificados (§10).
✓ Criterios para evaluar funcionalidad futura (§6, §7).

---

## Entregable Final

**1. Resumen ejecutivo**: Social AI Hub tiene ahora una constitución que fija su identidad antes de que exista una sola pantalla — omnicanal desde el núcleo (Meta primero, sin rediseño para el resto), IA que asiste sin ejecutar sin supervisión, y un límite explícito y defendido contra convertirse en el CRM que MAHP decidió, como identidad de producto, no ser.

**2. Coherencia con MDS-001 a MDS-012**: verificada — ningún principio, límite o relación de ecosistema contradice el Master Manual; el límite de CRM (§6) específicamente **refuerza** una decisión ya tomada (`01-IDENTIDAD-DEL-PRODUCTO.md` §1, `06J` §1) en vez de erosionarla, que era el riesgo real de diseñar este módulo sin esta constitución.

**3. Coherencia con `MEM-002-001`**: verificada — este documento asume como resuelto el alcance de MVP (Meta Graph API) y la integración con Community Manager Advisor, construye la constitución encima sin redefinir ninguna de las dos.

**4. Vacíos identificados antes de iniciar `MPS-002-001` (Functional Specification)**: (a) el modelo de datos channel-agnostic debe validarse contra un segundo canal hipotético antes de darse por bueno (§10, riesgo 1); (b) el nuevo dominio de datos "Comunicación/Conversaciones" todavía no está en `07A-DOMAIN-MODEL.md` — se agregará cuando `MPS-002-001` defina su forma real, no antes; (c) `CCEC-005` sigue esperando la consulta legal real, prerrequisito para que `MPS-002-001` pueda diseñar el modelo de datos de conversación con las respuestas legales ya conocidas, no como suposición.

**5. Mejoras estratégicas propuestas**: priorizar la validación del riesgo channel-agnostic (§10) como la primera actividad de `MPS-002-001`, antes que cualquier otra sección funcional — es el riesgo con mayor costo de corrección tardía de todo este documento.

**No se implementó código, pantallas, APIs ni base de datos en esta fase — solo constitución de producto, conforme a las reglas de MPS-002-000. No avanzar a MPS-002-001 hasta recibir aprobación explícita.**
