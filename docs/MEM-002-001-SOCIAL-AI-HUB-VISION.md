# MEM-002-001 — SOCIAL AI HUB: Product Vision & Business Blueprint

> Primer documento de **MAHP Enterprise Modules (MEM)** — una serie nueva,
> distinta de MDS/CCEC/ADR: donde MDS diseña la *plataforma*, CCEC define
> *capacidades compartidas* y ADR registra *decisiones arquitectónicas*,
> MEM diseña un **módulo de producto vendible** de principio a fin, empezando
> por su visión de negocio (este documento).
>
> **Continúa en** `MPS-002-000-PRODUCT-CONSTITUTION.md` (serie **MPS**,
> MAHP Product Specifications — constitución de producto: identidad,
> principios, límites y gobierno), y después en `MPS-002-001` (Functional
> Specification, no iniciado).
>
> **Estado: [FUTURO] en su totalidad.** Social AI Hub no existe hoy en
> ninguna forma — ni como código, ni como integración, ni como agente
> funcional. Este documento diseña el producto, no lo construye
> (`CLAUDE.md` §2, `PROJECT-BLUEPRINT.md`: todo módulo se diseña antes de
> implementarse).
>
> Dependencias verificadas antes de escribir: MDS-001 a MDS-012 (existen),
> `CCEC-001`/`CCEC-004` (existen), `ADR-001` a `ADR-008` (existen). Sin
> gaps de dependencia — a diferencia de MDS-009/MDS-011, esta fase no
> requirió pausar para crear nada primero.
>
> **Revisión post-aprobación (2026-07-12)**: tras la primera versión de
> este documento, el usuario pidió 4 cambios antes de subir a git,
> aplicados en este mismo documento y en los archivos relacionados:
> integración oficial con Community Manager Advisor (`05A-AI-AGENTS.md`
> #11, actualizado), alcance de MVP fijado a Meta Graph API (Facebook
> Pages, Instagram Business, Messenger — ya no "el canal con más
> demanda"), nueva capacidad transversal `CCEC-005-PRIVACY-AND-
> COMPLIANCE.md`, y `ADR-009` (Social AI Hub como módulo nativo, no
> aislado).
>
> Última actualización: 2026-07-12.

---

## 1. Misión del módulo

**¿Por qué existe Social AI Hub?** Porque MAHP ya tiene, diseñado y esperando, el otro lado de este problema: `06F-INTEGRATIONS.md` §1 y §3 diseñaron Meta y WhatsApp como integraciones candidatas; `05A-AI-AGENTS.md` #11 (Community Manager Advisor) es hoy un asesor que **depende 100% de que el usuario le pegue el contexto manualmente**, "sin integración real con Meta/WhatsApp, no puede ver mensajes por sí mismo" — literalmente bloqueado, en sus propias palabras de diseño, por la ausencia de este módulo.

**Integración oficial, no activación implícita**: Social AI Hub **es** el módulo del que depende Community Manager Advisor — no un módulo aparte que además lo beneficia de paso. Esta relación quedó formalizada directamente en `05A-AI-AGENTS.md` #11 (actualizado en el mismo cambio que este documento) y en `ADR-009` (Social AI Hub como módulo nativo del ecosistema, no un componente aislado). Todo lo demás que MAHP ya diseñó alrededor de comunicación externa (`08C-INTEGRATIONS-CATALOG.md`: WhatsApp, Slack, Teams, correo, SMS) queda como expansión de canal dentro de este mismo módulo, no como productos separados.

**¿Qué problema resuelve?** Ver §4 (Problemas que resuelve) — en una frase: hoy una empresa que usa MAHP para planear y ejecutar marketing tiene que salir de MAHP para hablar con sus clientes reales, en una app distinta por canal, sin que esa conversación se conecte con la campaña, el colaborador responsable o el historial de esa cuenta.

**¿Por qué un negocio debería usarlo?** Porque ya es cliente de MAHP para la mitad del problema (planear/ejecutar) — Social AI Hub cierra el círculo con la otra mitad (conversar/vender/atender) sin salir de la misma plataforma, con el mismo aislamiento multiempresa y el mismo modelo de roles ya construido (`07H-MULTI-TENANT-DESIGN.md`).

**¿Qué lo hace diferente?** Ver §9 (Análisis de competencia) y §10 (Ventajas competitivas) — resumen de una línea: las plataformas comparadas resuelven mensajería omnicanal como producto aislado; Social AI Hub nace conectado a campañas, KPIs, colaboradores y gamificación que ya existen, no como una integración añadida a un CRM genérico.

## 2. Visión del módulo

| Horizonte | Visión |
|---|---|
| **1 año** | Bandeja unificada funcional para al menos Meta (Instagram/Facebook) y WhatsApp Business — un `collaborator` responde desde MAHP, no desde 3 apps. Community Manager Advisor (`05A` #11) deja de depender de contexto pegado a mano. |
| **3 años** | Automatización de primer nivel (respuestas frecuentes, enrutamiento a la persona correcta, captura de leads) vía el Workflow Engine ya diseñado (`09A-WORKFLOW-ENGINE.md`) — Social AI Hub no construye su propio motor de automatización, reutiliza el de MAHP. |
| **5 años** | Inteligencia comercial real: predicción de abandono de conversación, sugerencia de venta cruzada, resumen automático de sentimiento por sucursal/franquicia — construido sobre la orquestación de IA ya diseñada (`09E-AI-ORCHESTRATION.md`), no un sistema de IA paralelo. |
| **10 años** | Centro de comunicación empresarial de referencia para el segmento ya validado de MAHP (restaurantes, franquicias, PyMEs con equipo) — mismo criterio de categoría que `11I-LONG-TERM-VISION.md` aplica al producto completo, aplicado aquí a este módulo específicamente. |

## 3. Objetivos estratégicos

1. **Reducir tiempo de respuesta** al cliente final de la empresa usuaria de MAHP — medible, no aspiracional (§11).
2. **Centralizar comunicación** de todos los canales relevantes en una sola bandeja, dentro de MAHP.
3. **Convertir conversación en dato de negocio** — un mensaje respondido debe poder generar una actividad, un lead, o alimentar un KPI ya existente (`07A-DOMAIN-MODEL.md`), no vivir aislado.
4. **Automatizar sin perder el criterio humano** — mismo principio no negociable de todo MAHP (`PROJECT-BLUEPRINT.md` §5, principio 3): IA sugiere/asiste, un humano decide en las conversaciones que importan.
5. **Generar inteligencia comercial** reutilizando KPIs y campañas ya existentes, no un sistema de reportes paralelo.

## 4. Problemas que resuelve

| Problema | Descripción | Impacto | Costo para la empresa | Cómo lo resuelve Social AI Hub |
|---|---|---|---|---|
| Responder desde múltiples plataformas | Instagram, Facebook, WhatsApp, cada uno en su app | Tiempo perdido cambiando de contexto, mensajes olvidados | Horas/semana de un colaborador | Bandeja unificada dentro de MAHP |
| Pérdida de clientes | Un mensaje sin responder a tiempo se pierde o se va con la competencia | Ventas/reservaciones perdidas | Directo en ingresos | Enrutamiento y alertas de mensajes sin atender (`09H-NOTIFICATION-ORCHESTRATION.md`, reutilizado) |
| Seguimiento manual | Nadie recuerda si ya se le dio seguimiento a un lead de Instagram hace 3 días | Leads que se enfrían sin que nadie lo note | Oportunidad de venta perdida | Estado de conversación visible, igual que el estado de una actividad (`actividades.status`) |
| Falta de indicadores | Ninguna cifra real de cuántos mensajes llegan, cuántos se responden, en cuánto tiempo | Decisiones sin datos | Indirecto — mala asignación de personal | Métricas nativas (§11), reutilizando `CCEC-004A` |
| Falta de automatización | Las mismas 10 preguntas se responden a mano cada vez | Tiempo desperdiciado en trabajo repetitivo | Costo de oportunidad de personal | Automatización de respuestas frecuentes vía `09A-WORKFLOW-ENGINE.md` |
| Falta de contexto | Quien responde no sabe si ese cliente ya compró antes o qué campaña lo trajo | Respuestas genéricas, mala experiencia | Percepción de marca | Conversación vinculada a `campaigns`/`actividades` cuando aplica |
| Falta de historial | Un colaborador nuevo no tiene forma de ver conversaciones previas de un cliente | Repetir preguntas ya respondidas, mala experiencia | Fricción operativa | Historial persistente por conversación, mismo principio append-only de `07D-DATA-LIFECYCLE.md` §5 |
| Dificultad para medir resultados | ¿Cuántas ventas realmente vinieron de Instagram? Hoy, nadie lo sabe con certeza | Presupuesto de marketing mal asignado | Indirecto pero significativo | Conexión directa con KPIs/campañas ya existentes en MAHP |

## 5. Propuesta de valor

**¿Por qué una empresa elegiría Social AI Hub?** Porque ya es cliente de MAHP — no es una decisión de comprar una herramienta más, es activar una capacidad dentro de la que ya usa, con el mismo login, los mismos roles, el mismo historial de campaña.

**¿Cuál es su diferenciador?** Nace conectado al resto del producto (campañas, KPIs, gamificación, automatización) — ninguna de las plataformas de §9 tiene ese contexto de negocio de marketing operativo previo, porque ninguna es, primero, una plataforma de gestión de marketing.

**Ventajas competitivas** (resumen — detalle en §10): contexto de campaña nativo, automatización reutilizando el mismo motor de todo MAHP, un solo proveedor y una sola factura para marketing + comunicación.

**Beneficios económicos**: menor costo que sumar una herramienta de mensajería separada (sin integración doble que pagar y mantener); tiempo de personal recuperado por automatización de respuestas frecuentes.

**Beneficios operativos**: una sola bandeja, un solo login, un solo lugar donde buscar el historial de un cliente.

**Beneficios estratégicos**: datos de conversación que retroalimentan campañas reales — cierra el ciclo planear → ejecutar → conversar → medir que hoy se rompe en el paso de "conversar".

## 6. Tipos de clientes

| Perfil | Objetivos | Dolores | Necesidades | Volumen estimado de conversaciones | Indicadores clave |
|---|---|---|---|---|---|
| **Restaurante independiente** | Reservaciones, pedidos, resolver dudas de horario/menú rápido | Un solo encargado atendiendo todo, sin tiempo | Respuestas automáticas a preguntas frecuentes (horario, menú, ubicación) | Bajo-medio (decenas/día) | Tiempo de respuesta, reservaciones confirmadas |
| **Cadena de restaurantes** | Consistencia de atención entre sucursales | Cada sucursal responde distinto, sin estándar | Plantillas de respuesta compartidas, visibilidad consolidada — depende de `10C-ORGANIZATION-MODEL.md` (bloqueado, `11B-BUSINESS-GROWTH.md` §1) | Medio (cientos/día, repartido) | Consistencia de tono, tiempo de respuesta por sucursal |
| **Franquicia** | Que cada franquiciatario atienda bien sin perder control de marca | Franquiciante sin visibilidad de cómo atienden sus franquiciatarios | Supervisión sin micromanejo — mismo bloqueo de modelo de organización | Medio-alto, repartido | Cumplimiento de estándar de marca, satisfacción por unidad |
| **Agencia de marketing** | Atender conversaciones de varios clientes a la vez | Cambiar de cuenta constantemente, mezclar contextos | Vista consolidada multi-cliente — depende de la misma decisión de organización bloqueada (`10C`, `11D-MONETIZATION.md` §6) | Alto, repartido entre cuentas | Tiempo de respuesta por cliente gestionado |
| **Tienda minorista** | Ventas directas por chat, catálogo, cotizaciones | Preguntas de producto/precio repetitivas | Respuestas automáticas de catálogo, captura de pedido | Medio-alto (picos estacionales) | Conversión de conversación a venta |
| **Empresa multisucursal** | Enrutar cada conversación a la sucursal correcta | Mensajes que llegan a la cuenta central sin saber a quién corresponden | Enrutamiento automático por sucursal/ubicación — mismo bloqueo de `10C` | Medio-alto | Enrutamiento correcto (%), tiempo hasta primera respuesta |
| **Empresa Enterprise** | SLA de atención, reportes ejecutivos, integración con su propio CRM | Falta de trazabilidad y cumplimiento auditable | SLA real (`10F-SERVICE-LEVEL-OBJECTIVES.md`), auditoría (`CCEC-001`), API pública (`08-ENTERPRISE-INTEGRATION-PLATFORM.md`) | Alto | SLA cumplido, NPS, tiempo de resolución |

**Nota de coherencia**: 3 de los 7 perfiles (cadena, franquicia, agencia, multisucursal) dependen de la misma decisión de modelo de organización/sucursales bloqueada desde MDS-003 (`10C-ORGANIZATION-MODEL.md`, reafirmado en `11B`/`11D`) — Social AI Hub no la resuelve, la hereda como prerrequisito para esos 4 perfiles específicamente, no para restaurante independiente/tienda minorista/Enterprise, que no la requieren.

## 7. Casos de uso (50)

### Atención y soporte

1. Responder preguntas frecuentes (horario, ubicación, precios)
2. Resolver quejas de servicio
3. Escalar una queja grave a un humano de mayor jerarquía
4. Confirmar recepción de un pedido
5. Informar estado de un pedido/envío
6. Reprogramar una cita/reservación
7. Cancelar una reservación
8. Responder fuera de horario con mensaje automático + captura de contacto
9. Encuestas de satisfacción post-atención
10. Recolectar feedback estructurado de una queja

### Ventas

11. Ventas directas desde Instagram
12. Ventas directas desde Facebook
13. Ventas directas desde WhatsApp
14. Enviar catálogo de productos por chat
15. Generar cotización a partir de una conversación
16. Dar seguimiento a un carrito abandonado (si hay e-commerce conectado)
17. Ofrecer upsell/cross-sell contextual durante la conversación
18. Confirmar pago recibido
19. Enviar factura tras una venta
20. Recuperar una venta perdida con seguimiento automático a los N días

### Marketing y captación

21. Captura de leads desde un anuncio de Meta
22. Captura de leads desde un formulario de Instagram
23. Enviar promoción activa a quien pregunta por precios
24. Notificar de una nueva promoción a contactos que ya interactuaron antes
25. Reactivar clientes inactivos con una campaña de reconexión
26. Medir qué campaña originó cada conversación (atribución)
27. Enviar contenido de la campaña activa cuando el cliente pregunta "¿qué tienen nuevo?"
28. Vincular conversación a un `campaign_id` existente de MAHP
29. Generar un lead calificado como `actividad` de seguimiento en el calendario
30. Reportar automáticamente cuántas conversaciones originó cada canal por campaña

### Operación interna / equipos

31. Enrutar conversación al colaborador correcto según tema
32. Asignar conversación a un colaborador específico manualmente
33. Reasignar conversación si el colaborador está de vacaciones/inactivo
34. Alertar si una conversación lleva más de X tiempo sin respuesta (`09H`)
35. Ver historial completo de un cliente antes de responder
36. Etiquetar conversaciones por tipo (venta, queja, duda, otro)
37. Buscar conversaciones anteriores por cliente/etiqueta
38. Ver carga de trabajo por colaborador (conversaciones activas asignadas)
39. Transferir una conversación entre colaboradores sin perder contexto
40. Registrar nota interna sobre una conversación, no visible para el cliente

### Franquicias / multisucursal *(dependen de `10C`)*

41. Enrutar conversación a la sucursal más cercana/correcta
42. Ver reporte consolidado de conversaciones de toda la cadena
43. Detectar una sucursal con tiempo de respuesta fuera de estándar
44. Aplicar plantilla de respuesta de marca uniforme entre sucursales
45. Alertar a la franquicia matriz de una queja grave en cualquier unidad

### IA y automatización

46. Sugerencia de respuesta por IA para el colaborador (Community Manager Advisor, `05A` #11 — activado por primera vez con datos reales)
47. Respuesta automática completa para preguntas de bajo riesgo (horario, ubicación), sin intervención humana
48. Resumen automático de una conversación larga antes de que un supervisor la revise
49. Detección de sentimiento (cliente molesto) para priorizar/escalar automáticamente
50. Sugerencia de la siguiente mejor acción (agendar, cotizar, escalar) según el contenido de la conversación

## 8. Análisis de competencia

| Plataforma | Fortalezas | Debilidades | Costo | UX | Automatización | IA | Integraciones | Reportes | Oportunidad para MAHP |
|---|---|---|---|---|---|---|---|---|---|
| **Meta Business Suite** | Gratis, nativo de Meta, sin fricción de conexión | Solo Meta (Instagram/Facebook), sin WhatsApp Business API real, sin CRM | Gratis | Simple pero limitada | Básica | Ninguna | Ninguna externa | Básicos | MAHP conecta la conversación con campaña/KPI, algo que Meta Business Suite no hace ni pretende hacer |
| **HubSpot** | CRM completo, muy maduro, gran ecosistema | Caro a escala, curva de aprendizaje alta, pensado para B2B/ventas complejas | Alto (escalado) | Robusta pero compleja | Avanzada | Sí, genérica | Amplias | Avanzados | MAHP es más simple y ya está diseñado para el perfil de PyME/restaurante que HubSpot sobre-atiende |
| **Zendesk** | Estándar de la industria en soporte/tickets | Enfocado en soporte, no en ventas/marketing conversacional | Alto | Buena para soporte, no para ventas | Media | Sí, genérica | Amplias | Avanzados | MAHP conecta la conversación a campañas de marketing, no solo a tickets de soporte |
| **ManyChat** | Especializado en automatización de chat, fácil de usar | Solo automatización de chat, sin CRM, sin conexión a marketing operativo más amplio | Medio | Buena, orientada a marketers | Alta (su especialidad) | Limitada | Meta, algo de WhatsApp | Básicos | MAHP hereda esta fortaleza de automatización vía su propio Workflow Engine (`09A`), sin ser una isla — conectado a campañas reales |
| **Respond.io** | Omnicanal real, buena gestión de múltiples canales | Sin funcionalidad de marketing/campañas — es solo mensajería | Medio-alto | Buena para equipos de soporte multicanal | Media-alta | Limitada | Amplias | Medios | Mismo diferenciador: MAHP no es "solo mensajería", es mensajería conectada al resto de la operación de marketing |
| **Intercom** | Producto maduro, buen chat en vivo para sitios web | Caro, orientado a SaaS/producto digital, no a restaurantes/retail físico | Alto | Muy buena | Alta | Sí | Amplias | Avanzados | El mercado inicial de MAHP (restaurantes/servicios, `01-IDENTIDAD-DEL-PRODUCTO.md` §9) no es el mercado objetivo de Intercom |
| **Freshdesk** | Costo accesible, buena relación precio/funcionalidad | Enfocado en tickets de soporte, no en ventas conversacionales | Bajo-medio | Buena | Media | Limitada | Amplias | Buenos | Mismo diferenciador que Zendesk, a menor costo — MAHP compite en el segmento de PyME donde Freshdesk también juega, con la ventaja de contexto de marketing |
| **Salesforce Service Cloud** | Enterprise, altamente configurable, ecosistema enorme | Complejo, caro, sobredimensionado para PyME/restaurantes | Muy alto | Compleja | Muy alta | Sí (Einstein) | Máximas | Máximos | Fuera del alcance del mercado inicial de MAHP — referencia de hacia dónde podría evolucionar el perfil Enterprise (§6), no un competidor directo hoy |

## 9. Ventajas competitivas

1. **Contexto de campaña nativo** — ninguna plataforma comparada conecta una conversación a una campaña de marketing con KPIs reales de la misma forma, porque ninguna nace siendo primero una plataforma de gestión de marketing.
2. **Automatización reutilizando el motor de toda la plataforma** — Social AI Hub no construye su propio motor de reglas/workflows; usa `09A-WORKFLOW-ENGINE.md`/`09B-BUSINESS-RULES-ENGINE.md`, ya diseñados para todo MAHP. Un cliente que ya automatiza recordatorios de campaña puede automatizar respuestas de chat con el mismo conocimiento.
3. **KPIs comerciales unificados** — la conversión de una conversación en venta alimenta el mismo sistema de KPIs (`07A-DOMAIN-MODEL.md` §11) que ya mide el resto del marketing de la empresa.
4. **CRM ligero integrado, no un CRM aparte que sincronizar** — el historial de conversación vive junto al historial de campañas/actividades de ese cliente, sin duplicar datos entre dos sistemas (`07B-DATA-GOVERNANCE.md` §3).
5. **Gamificación ya existente extendida** — responder rápido y bien podría sumar puntos igual que completar una tarea (`points_log`, `07A` §12) — mismo sistema, alcance nuevo.
6. **Un solo proveedor, una sola factura** — ventaja comercial directa sobre sumar ManyChat + Zendesk + HubSpot por separado.

## 10. Métricas de éxito

| Métrica | Definición |
|---|---|
| Tiempo de respuesta | Desde mensaje recibido hasta primera respuesta (humana o IA) |
| Conversaciones atendidas | Total por periodo, por canal, por colaborador |
| Conversaciones resueltas por IA sin intervención humana | % del total — mide adopción real de automatización |
| Leads generados | Conversaciones marcadas como lead calificado |
| Ventas atribuidas | Conversaciones que terminan en venta registrada |
| Tasa de conversión conversación→venta | Ventas / conversaciones totales |
| Satisfacción del cliente | Encuesta post-conversación (caso de uso #9) |
| Tiempo ahorrado por automatización | Estimado: conversaciones resueltas por IA × tiempo promedio que tomaría manualmente |
| ROI del módulo | Valor generado (ventas atribuidas + tiempo ahorrado) vs. costo de construcción/mantenimiento — solo medible una vez construido y en uso real |

Mecanismo de medición: `CCEC-004A-METRICS-AND-DASHBOARDS.md`, reutilizado — Social AI Hub no diseña su propio sistema de métricas.

## 11. Roadmap del módulo

| Fase | Objetivos | Características | Riesgos | Dependencias |
|---|---|---|---|---|
| **MVP** | Bandeja unificada mínima — **alcance definido explícitamente, no por demanda a determinar**: **Meta Graph API — Facebook Pages, Instagram Business y Messenger**, un solo proveedor de API para los tres | Conexión OAuth de página/cuenta de empresa vía Meta Graph API (mismo patrón de `08E-SECURITY.md` §2), historial por conversación, asignación manual a colaborador | Dependencia total de aprobación de la app en Meta for Developers (revisión de permisos avanzados de Graph API puede tardar) — riesgo elevado a central en esta fase por ser el único proveedor del MVP (ver §12, riesgo reforzado) | `08-ENTERPRISE-INTEGRATION-PLATFORM.md` (adaptador por proveedor), `07A-DOMAIN-MODEL.md` (nuevo dominio de datos), `CCEC-005-PRIVACY-AND-COMPLIANCE.md` (revisión legal de datos de clientes finales, prerrequisito antes de capturar conversaciones reales) |
| **V2** | Segundo canal + automatización básica | WhatsApp Business API como canal adicional (fuera de Meta Graph API, requiere su propio adaptador — `08C-INTEGRATIONS-CATALOG.md`), respuestas automáticas a preguntas frecuentes vía `09A-WORKFLOW-ENGINE.md`, enrutamiento manual por tema | Automatización mal configurada respondiendo incorrectamente — mitigado con el mismo límite de supervisión de `09G-APPROVAL-WORKFLOWS.md` | MVP estable, primeros datos reales de uso |
| **V3** | Community Manager Advisor activado con datos reales | El agente ya diseñado (`05A` #11) deja de depender de contexto pegado a mano — sugiere respuestas en tiempo real dentro de la bandeja | Costo de IA por conversación sin control — requiere límite de consumo (`05C-AI-GOVERNANCE.md`) | V2 en uso estable, volumen suficiente para justificar el costo de IA por conversación |
| **Enterprise** | SLA, reportes ejecutivos, multi-sucursal | SLA real (`10F`), vista consolidada multi-sucursal (bloqueada por `10C`), API pública para integrar con CRM del cliente (`08-ENTERPRISE-INTEGRATION-PLATFORM.md` §5) | Requiere que la decisión de modelo de organización (`10C`) ya esté resuelta | Al menos un cliente Enterprise real pidiéndolo |
| **AI Native** | IA como participante activo, no solo asistente | Respuestas automáticas completas para más tipos de conversación, predicción de abandono, sugerencia de venta cruzada (casos de uso 46–50) | Mismo límite no negociable de `PROJECT-BLUEPRINT.md` §5 principio 3 — nunca sin supervisión para acciones críticas (una venta, una promesa al cliente) | Horizonte "mediano/largo plazo" de `11F-AI-EVOLUTION.md` alcanzado a nivel de toda la plataforma, no solo de este módulo |
| **Global Platform** | Referencia de categoría en comunicación empresarial con IA | Visión a 10 años — mismo horizonte que `11I-LONG-TERM-VISION.md` aplicado específicamente a comunicación | Ver riesgos de expansión internacional ya documentados en `11C-MARKET-EXPANSION.md` | Vigencia de todo lo anterior en producción estable |

## 12. Riesgos

| Riesgo | Tipo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|---|
| Dependencia de Meta (cambios de política, suspensión de acceso a la API, rechazo de la revisión de la app) | Técnico/Comercial | **Alto, elevado a crítico para el MVP** — al ser Meta Graph API el único proveedor del alcance del MVP (§11), no hay canal alternativo mientras V2 (WhatsApp) no exista | Media — las plataformas de mensajería cambian políticas con frecuencia, y la revisión de permisos avanzados de Graph API no está garantizada | Arquitectura de adaptador aislado por proveedor (`08-ENTERPRISE-INTEGRATION-PLATFORM.md` §2, `ADR-008`/`ADR-009` mismo principio de aislamiento) para que un problema con Meta no bloquee el diseño de V2 (WhatsApp); iniciar el proceso de revisión de la app en Meta for Developers lo antes posible dado que su tiempo no lo controla MAHP |
| Cambios de API de WhatsApp Business | Técnico | Alto | Media | Mismo patrón de adaptador aislado |
| Escalabilidad de volumen de conversaciones | Técnico | Medio, lejano | Baja al volumen inicial | Hereda `07-ENTERPRISE-DATA-PLATFORM.md` §8 — mismo modelo multi-tenant, sin rediseño necesario a corto plazo |
| Seguridad de credenciales de conexión (tokens OAuth de Meta/WhatsApp por empresa) | Seguridad | Alto si se compromete | Baja con buen diseño | Mismo estándar ya fijado en `08E-SECURITY.md` §2/§8 — cifrado, scope mínimo, sin excepción |
| Privacidad de conversaciones de clientes finales (no usuarios de MAHP, sino clientes de la empresa cliente) | Legal/Privacidad | Alto — dato de terceros, no solo de la empresa | Media | Marco técnico/de proceso definido en `CCEC-005-PRIVACY-AND-COMPLIANCE.md` (capacidad transversal, no exclusiva de este módulo) — **el texto legal real todavía no existe** (`CLAUDE.md` §6, nunca redactar texto legal real) y su revisión por un abogado es prerrequisito antes de capturar la primera conversación real, no solo antes de "lanzar" |
| Disponibilidad — una caída de Meta/WhatsApp deja sin funcionar el canal | Técnico/Operativo | Medio | Media | Mismo criterio de `10D-OPERATIONAL-EXCELLENCE.md` §5 — fuera del control de MAHP, mitigado con comunicación proactiva, no con garantía de disponibilidad que MAHP no controla |
| Costo de IA por conversación sin límite | Comercial/Técnico | Medio | Alta si no se limita desde el diseño | Límite de consumo desde el primer día de V3 (`05C-AI-GOVERNANCE.md`), no como ajuste posterior |
| Construir por anticipación sin demanda confirmada | Comercial | Alto — esfuerzo desperdiciado | Media si no se respeta el criterio | Mismo criterio de activación por demanda de todo `/docs` — MVP solo arranca con un canal cuando exista un cliente real pidiéndolo, no antes |

---

## Checklist — validar que la visión del módulo está completa

- [x] ¿Existe una visión clara a 1/3/5/10 años?
- [x] ¿Existe una misión que explica por qué existe el módulo, no solo qué hace?
- [x] ¿Existen objetivos estratégicos medibles?
- [x] ¿Existen perfiles completos de los 7 tipos de cliente pedidos?
- [x] ¿Existen al menos 50 casos de uso reales?
- [x] ¿Existe análisis de las 8 plataformas competidoras pedidas?
- [x] ¿Existen ventajas competitivas específicas, no genéricas?
- [x] ¿Existe un roadmap evolutivo con las 6 fases pedidas?
- [x] ¿Están los riesgos identificados con impacto, probabilidad y mitigación?
- [x] ¿Es coherente con MDS-001 a MDS-012, CCEC y ADR? (ver Entregable Final)

---

## Definition of Done

✓ Visión clara del módulo (§2).
✓ Misión bien definida (§1).
✓ Objetivos estratégicos (§3).
✓ Perfiles de clientes (§6).
✓ Casos de uso (§7, 50).
✓ Análisis competitivo (§8, 8 plataformas).
✓ Ventajas competitivas (§9).
✓ Roadmap evolutivo (§11, 6 fases).
✓ Riesgos identificados y mitigaciones (§12).
✓ Coherencia con el MAHP Master Manual verificada (Entregable Final).

---

## Entregable Final

**1. Resumen de la visión del módulo**: Social AI Hub es la bandeja de comunicación omnicanal que se integra oficialmente con el Community Manager Advisor ya existente (`05A` #11, actualizado para reflejar esta relación) y con el motor de automatización (`09-*`). No es un módulo aparte que además beneficia a esos componentes — es, por decisión formal (`ADR-009`), un módulo nativo del ecosistema MAHP.

**2. Diferenciadores principales frente a la competencia**: contexto de campaña/KPI nativo (ninguna plataforma comparada lo tiene, porque ninguna nace como plataforma de marketing), automatización reutilizando el motor de toda la plataforma en vez de uno aislado, un solo proveedor/factura para marketing + comunicación.

**3. Prioridades para el MVP**: alcance definido explícitamente — **Meta Graph API únicamente (Facebook Pages, Instagram Business, Messenger)**, un solo proveedor de API, historial por conversación, asignación manual. Deliberadamente acotado a un solo proveedor (no "el canal con más demanda", una decisión ya tomada) para minimizar superficie de integración en la primera versión.

**4. Mayores riesgos y mitigaciones**: dependencia de Meta elevada a riesgo crítico del MVP por ser el único proveedor de esta fase (mitigada con adaptador aislado, `ADR-008`/`ADR-009`, e inicio temprano del proceso de revisión de la app en Meta for Developers); privacidad de datos de clientes finales (marco técnico ya definido en `CCEC-005-PRIVACY-AND-COMPLIANCE.md`, texto legal real todavía pendiente de abogado); costo de IA sin control (mitigado con límite desde el diseño de V3).

**5. Recomendación antes de iniciar MEM-002-002 (Functional Blueprint)**: con el alcance de canal ya resuelto (Meta Graph API), la recomendación cambia de "definir el canal" a **iniciar cuanto antes el proceso de revisión de la app ante Meta for Developers** (plazo fuera del control de MAHP, puede convertirse en el cuello de botella real del roadmap) y completar la revisión legal de `CCEC-005-PRIVACY-AND-COMPLIANCE.md` en paralelo — ninguna de las dos debe esperar a que MEM-002-002 esté terminado, porque ambas tienen plazos externos que MAHP no controla.

**Verificación de coherencia con MDS-001 a MDS-012, CCEC y ADR**: revisada explícitamente contra `06F-INTEGRATIONS.md`, `05A-AI-AGENTS.md` #11 (actualizado en este mismo cambio), `08-ENTERPRISE-INTEGRATION-PLATFORM.md` + anexos, `09-ENTERPRISE-AUTOMATION-PLATFORM.md` + anexos, `10C-ORGANIZATION-MODEL.md`, `CCEC-001`/`CCEC-004`/`CCEC-005` (nueva), y `ADR-008`/`ADR-009` (nuevo). **Ninguna inconsistencia ni duplicidad detectada.** Hereda, sin resolver, la misma decisión de modelo de organización bloqueada desde MDS-003 (afecta a 3 de los 7 perfiles de cliente de este módulo específicamente).

**No se implementó código, API, base de datos ni interfaz en esta fase — solo visión de producto, conforme a las reglas de MEM-002-001. No avanzar a MEM-002-002 hasta recibir aprobación.**
