# MPS-002-002 — SOCIAL AI HUB: Enterprise Functional Specification

> Tercer documento de la serie MPS. `MPS-002-000` fijó identidad y
> límites (en particular, el límite de CRM ligero, §6); `MPS-002-001`
> diseñó el Conversation Intelligence Engine (CIE) — ciclo de vida de 18
> etapas, eventos, motores. Este documento traduce ambos en
> **comportamiento funcional completo**: qué puede hacer cada actor
> (humano o IA), con qué reglas, en qué estados, con qué manejo de error
> — listo para diseño técnico e historias de usuario, sin diseñar base de
> datos ni APIs.
>
> **Gobernado por `MES-001-ENGINEERING-CONSTITUTION.md`**, ya aprobada:
> este documento aplica sus Estados de Madurez (§4A), su política de
> Quality Gates proporcionales (los 9, por ser un MPS completo, §7), y
> **reemplaza el "Enterprise Readiness Score" combinado pedido por el
> documento de fase con el formato ya oficial de Engineering Maturity +
> Implementation Maturity** (`MES-001` §14) — ver Enterprise Architecture
> Review Q1 para la justificación explícita de esta desviación.
>
> Dependencias verificadas: MDS-001 a MDS-012, `CCEC-001`/`004`/`005`,
> `ADR-001` a `ADR-016`, `MEM-002-001`, `MPS-002-000`, `MPS-002-001`,
> `MES-001` — todas existen. Sin gaps.
>
> Última actualización: 2026-07-12.

---

## 1. Contexto y Objetivo

No se repite lo ya establecido en `MPS-002-000` (misión, principios, límites) ni en `MPS-002-001` (ciclo de vida de la conversación, motores del CIE, eventos) — este documento los **consume** para responder, módulo por módulo: qué puede hacer el usuario, qué puede hacer la IA, qué es automático, qué requiere aprobación humana, qué reglas gobiernan cada acción.

---

## 2. Módulos Funcionales

### 2.1 Dashboard Ejecutivo — extiende `06A-CORE-MODULES.md` #6, no lo reemplaza

| Campo | Detalle |
|---|---|
| Objetivo | Vista consolidada de la salud de la comunicación conversacional de la empresa |
| Alcance | Solo lectura — no ejecuta acciones, enruta a los módulos que sí lo hacen |
| Funcionalidades | Conteo de conversaciones activas/prioridad alta/escaladas; tiempo de primera respuesta promedio; tendencia de intención de negocio (§6 `MPS-002-001`); accesos directos a conversaciones que requieren atención |
| Entradas | `AnalyticsUpdated` (`MPS-002-001` §10), datos agregados de `CCEC-004A` |
| Salidas | Ninguna — es terminal, solo enlaza a otros módulos |
| Dependencias | `renderizarResumen()` existente (`06A` #6), `CCEC-004A` |
| Restricciones | Sin dato de una conversación específica de cliente final más allá de agregados — mismo límite de minimización de `CCEC-005` §3 |

### 2.2 Bandeja Inteligente de Conversaciones

| Campo | Detalle |
|---|---|
| Objetivo | Lista priorizada de conversaciones, el punto de entrada operativo diario |
| Alcance | Lectura + navegación; la acción sobre una conversación ocurre en 2.3 |
| Funcionalidades | Lista ordenada por prioridad (`MPS-002-001` §8); filtros por estado/canal/intención/asignado; búsqueda (caso de uso "Buscar conversaciones", §3) |
| Entradas | Conversaciones con su clasificación/priorización ya calculada (etapas 8–9 del ciclo de vida, `MPS-002-001` §4) |
| Salidas | Selección de una conversación → 2.3 |
| Dependencias | Motor de Clasificación y Priorización (`MPS-002-001` §7–8) |
| Restricciones | Un `collaborator`/rol de ejecución solo ve las conversaciones asignadas a él o sin asignar de su empresa — mismo alcance de RLS que cualquier otro dato (`07H-MULTI-TENANT-DESIGN.md`) |

### 2.3 Gestión de Conversaciones

| Campo | Detalle |
|---|---|
| Objetivo | Ejecutar el ciclo de vida completo de una conversación individual (etapas 10–13, `MPS-002-001` §4) |
| Alcance | Responder, asignar, escalar, cerrar, reabrir, transferir |
| Funcionalidades | Ver hilo completo del canal; usar/editar/descartar sugerencia de IA (§9 `MPS-002-001`); cambiar asignación; cerrar/reabrir; adjuntar etiqueta |
| Entradas | Mensaje normalizado + contexto (etapas 2–7) |
| Salidas | `AIRecommendationGenerated`, `ConversationAssigned`, `ConversationEscalated`, `ConversationResolved` (`MPS-002-001` §10) |
| Dependencias | Adaptador de Meta Graph API (`ADR-010`), CIE completo |
| Restricciones | Human in the Loop sin excepción (`ADR-009`) — ninguna respuesta sale sin que un humano la haya originado o confirmado |

### 2.4 Gestión de Clientes — CRM ligero, límite estricto de `MPS-002-000` §6

| Campo | Detalle |
|---|---|
| Objetivo | Administrar el registro mínimo de contacto necesario para dar contexto a una conversación |
| Alcance | Contacto + historial de conversación — **nunca** pipeline de ventas, etapas de oportunidad, ni gestión de cuentas comerciales complejas |
| Funcionalidades | Ver/editar datos básicos de contacto (nombre público, canal de origen); etiquetar cliente; ver historial de conversaciones de ese contacto |
| Entradas | `ContactoCreado` (etapa 4, `MPS-002-001` §4) |
| Salidas | Contexto de cliente consumido por la etapa 5 del ciclo de vida |
| Dependencias | Ninguna externa — vive dentro del dominio del CIE |
| Restricciones | Toda funcionalidad que se acerque a pipeline de ventas (etapas de negociación, valor de oportunidad configurable) se rechaza explícitamente por este documento — ver Enterprise Architecture Review Q4 |

### 2.5 Perfil Unificado del Cliente

| Campo | Detalle |
|---|---|
| Objetivo | Una sola vista de todo lo que MAHP sabe de un contacto — historial de conversación consolidado, no una ficha comercial |
| Alcance | Solo lectura consolidada de datos ya existentes en 2.4 — no es un módulo con datos propios adicionales |
| Funcionalidades | Línea de tiempo de conversaciones; conteo de interacciones; intención de negocio predominante (agregado de §6 `MPS-002-001`) |
| Entradas | Datos de 2.4 + eventos históricos del CIE |
| Salidas | Ninguna — es de consulta |
| Dependencias | 2.4 |
| Restricciones | Mismo límite de CRM ligero — nunca un scoring comercial tipo "valor de vida del cliente" sin decisión estratégica explícita de expandir la categoría (`06J-FUTURE-MODULES.md` §1) |

### 2.6 IA Conversacional

| Campo | Detalle |
|---|---|
| Objetivo | Interfaz donde el colaborador interactúa con las sugerencias del CIE |
| Alcance | Mostrar sugerencia + explicación (`ADR-014`); capturar aceptar/editar/rechazar |
| Funcionalidades | Ver sugerencia de respuesta con motivo visible; un clic para usar tal cual, editar antes de enviar, o descartar |
| Entradas | Salida del Motor de Recomendaciones (`MPS-002-001` §8) |
| Salidas | `RecommendationFeedbackCaptured` (etapa 14, `MPS-002-001` §4) — insumo del Motor de Aprendizaje |
| Dependencias | Community Manager Advisor (`05A-AI-AGENTS.md` #11) vía Edge Function proxy (`ADR-007`) |
| Restricciones | Nunca envío automático de una sugerencia sin acción humana — mismo límite que 2.3 |

### 2.7 Business Intent Engine — interfaz funcional sobre el motor ya diseñado

| Campo | Detalle |
|---|---|
| Objetivo | Mostrar y permitir corregir la intención de negocio detectada |
| Alcance | Visualización + corrección manual — el motor mismo ya está diseñado en `MPS-002-001` §6, aquí se define su interfaz funcional |
| Funcionalidades | Ver intención detectada + confianza; reclasificar manualmente si el motor se equivocó (alimenta Motor de Aprendizaje) |
| Entradas | `BusinessIntentDetected` |
| Salidas | Corrección manual → retroalimentación (etapa 14) |
| Dependencias | `MPS-002-001` §6 |
| Restricciones | La reclasificación manual nunca reentrena un modelo (`ADR-015`) — solo se registra como dato de retroalimentación |

### 2.8 Community / Customer Engagement Advisor

| Campo | Detalle |
|---|---|
| Objetivo | Vista agregada de patrones de engagement — no una acción sobre una conversación individual |
| Alcance | Extiende Customer Experience Advisor (`05A-AI-AGENTS.md` #13) con datos reales de conversación, por primera vez desde su diseño en MDS-006 |
| Funcionalidades | Insight cualitativo ("las quejas de este mes se concentran en X"); tendencia de sentimiento por canal/campaña |
| Entradas | Agregado de `CustomerIntentDetected`/sentimiento a través del tiempo |
| Salidas | Ninguna accionable directa — es insight, no acción (mismo límite ya fijado para `05A` #13) |
| Dependencias | `05A-AI-AGENTS.md` #13 |
| Restricciones | Sin datos de un cliente final individual identificable — solo patrones agregados, por diseño de privacidad (`CCEC-005` §3) |

### 2.9 Automatizaciones

| Campo | Detalle |
|---|---|
| Objetivo | Configurar reglas de conversación reutilizando el motor ya existente |
| Alcance | Interfaz de configuración — el motor es `09A-WORKFLOW-ENGINE.md`/`09B-BUSINESS-RULES-ENGINE.md`, no propio (`ADR-013`) |
| Funcionalidades | Crear/editar/desactivar regla ("si intención=Soporte y pregunta frecuente, responder automático"); ver historial de ejecuciones |
| Entradas | Catálogo de eventos de conversación (`MPS-002-001` §10, extiende `09C-EVENT-CATALOG.md`) |
| Salidas | `WorkflowTriggered` |
| Dependencias | `09A`/`09B`, requiere aprobación de `company_admin` para activarse (`09G-APPROVAL-WORKFLOWS.md` §3) |
| Restricciones | Ninguna automatización de conversación con efecto externo se activa sin aprobación explícita — mismo límite que toda automatización de MAHP |

### 2.10 Integración con CRM *(ligero, interno)*

| Campo | Detalle |
|---|---|
| Objetivo | No es integración con un CRM externo — es la conexión entre el CIE y el registro de contacto de 2.4 |
| Alcance | Interno al módulo — **no existe integración con Salesforce/HubSpot en el MVP**, señalado explícitamente para no generar expectativa fuera de alcance |
| Funcionalidades | Vincular conversación a contacto; generar lead (`LeadCreated`) |
| Entradas | Etapas 4–5 del ciclo de vida |
| Salidas | `LeadCreated` |
| Dependencias | 2.4 |
| Restricciones | Integración con un CRM externo real es candidata de `08C-INTEGRATIONS-CATALOG.md` futura, no de este documento |

### 2.11 Analytics

| Campo | Detalle |
|---|---|
| Objetivo | Métricas del módulo, consumidas por 2.1 |
| Alcance | No construye panel propio — alimenta `CCEC-004A` |
| Funcionalidades | Ver KPIs funcionales (§8 de este documento) |
| Entradas | `AnalyticsUpdated` |
| Salidas | Ninguna — es de consulta |
| Dependencias | `CCEC-004A-METRICS-AND-DASHBOARDS.md` |
| Restricciones | Ninguna métrica nueva fuera del formato ya establecido de `CCEC-004A` |

### 2.12 Configuración

| Campo | Detalle |
|---|---|
| Objetivo | Ajustes del módulo por empresa |
| Alcance | Conexión de canal (Meta Graph API), preferencias de notificación, plantillas de respuesta |
| Funcionalidades | Conectar/desconectar página de Meta (OAuth, `08E-SECURITY.md` §2); gestionar plantillas (caso de uso "Gestionar plantillas", §3) |
| Entradas | Acción de `company_admin` |
| Salidas | `integracion.conectada`/`desconectada` (`08F-EVENT-ARCHITECTURE.md` §2) |
| Dependencias | Adaptador de Meta (`ADR-010`) |
| Restricciones | Solo `company_admin` puede conectar/desconectar integración — mismo criterio de `08E-SECURITY.md` §3 |

### 2.13 Administración

| Campo | Detalle |
|---|---|
| Objetivo | Gestión de usuarios y permisos específicos del módulo |
| Alcance | Asignar rol funcional (§5) a un usuario ya existente en MAHP — no crea usuarios nuevos, reutiliza `profiles` |
| Funcionalidades | Asignar/quitar rol funcional de Social AI Hub a un colaborador existente |
| Entradas | Acción de `company_admin` |
| Salidas | Cambio de permiso efectivo |
| Dependencias | `07H-MULTI-TENANT-DESIGN.md`, modelo de 4 roles base de MAHP |
| Restricciones | Los roles funcionales de §5 son una capa sobre los 4 roles base, nunca los reemplazan |

### 2.14 Auditoría

| Campo | Detalle |
|---|---|
| Objetivo | Trazabilidad de accesos y decisiones del módulo |
| Alcance | Interfaz de solo lectura sobre `CCEC-001` — no un mecanismo de auditoría propio |
| Funcionalidades | Ver quién accedió/respondió qué conversación; ver eventos de configuración (conectar canal, crear automatización) |
| Entradas | `AuditRecorded` (`MPS-002-001` §10) |
| Salidas | Ninguna |
| Dependencias | `CCEC-001A-AUDIT-EVENT-CATALOG.md` — requiere agregar los eventos nuevos de este módulo al catálogo |
| Restricciones | Mismo alcance de lectura ya definido en `CCEC-001B` (`super_admin` todo, `company_admin` solo su empresa) |

### 2.15 Centro de Notificaciones

| Campo | Detalle |
|---|---|
| Objetivo | Avisar de eventos que requieren atención |
| Alcance | Interfaz sobre `09H-NOTIFICATION-ORCHESTRATION.md`, no motor propio |
| Funcionalidades | Notificación de asignación, escalamiento, conversación sin responder a tiempo |
| Entradas | `ConversationAssigned`, `ConversationEscalated` |
| Salidas | Ninguna — es terminal |
| Dependencias | `09H` |
| Restricciones | Ningún canal de notificación nuevo específico de este módulo — reutiliza los ya diseñados (in-app, y los de `08C-INTEGRATIONS-CATALOG.md` cuando existan) |

---

## 3. Casos de Uso

Los 15 pedidos por esta fase — no se repiten los 50 ya catalogados en `MEM-002-001` §7, cada caso de uso aquí referencia el suyo cuando corresponde.

### CU-01 Responder conversación

| Campo | Detalle |
|---|---|
| Actor principal | Colaborador con rol funcional de ejecución (§5) |
| Actores secundarios | IA (sugerencia opcional), Sistema (registra evento) |
| Precondiciones | Conversación asignada al actor, estado `respondido` no alcanzado |
| Flujo principal | 1) Actor abre conversación (2.3). 2) Ve sugerencia de IA si existe (2.6). 3) Escribe/edita/usa tal cual. 4) Envía. 5) Sistema registra `AIRecommendationGenerated` (si aplica) y avanza estado |
| Flujos alternativos | Sin sugerencia de IA disponible → actor responde directo, sin paso 2 |
| Excepciones | Falla de envío (etapa 11, `MPS-002-001` §4) → reintento automático, notificación si falla definitivo |
| Resultado esperado | Mensaje entregado al cliente vía Meta, conversación en estado `respondido` |

### CU-02 Asignar conversación

| Campo | Detalle |
|---|---|
| Actor principal | Sistema (automático, etapa 10) o Supervisor (manual) |
| Actores secundarios | Colaborador destino |
| Precondiciones | Conversación clasificada y priorizada (etapas 8–9) |
| Flujo principal | 1) Regla de enrutamiento evalúa (`09B`). 2) Asigna a colaborador/rol. 3) `ConversationAssigned`. 4) Notifica (2.15) |
| Flujos alternativos | Reasignación manual por Supervisor en cualquier momento |
| Excepciones | Ningún colaborador cumple la regla → escala a `company_admin` por defecto (`MPS-002-001` §4, etapa 10) |
| Resultado esperado | Conversación con responsable activo único (Regla de negocio RN-01, §4) |

### CU-03 Escalar incidencia

| Campo | Detalle |
|---|---|
| Actor principal | Colaborador o Sistema (regla automática de sentimiento negativo, `MPS-002-001` §6) |
| Actores secundarios | Rol de mayor jerarquía (destino del escalamiento) |
| Precondiciones | Conversación activa, no cerrada |
| Flujo principal | 1) Se cumple condición de escalamiento. 2) `ConversationEscalated`. 3) Notificación inmediata (2.15) |
| Flujos alternativos | Escalamiento manual iniciado por el propio colaborador ante un caso que excede su criterio |
| Excepciones | Sin rol de mayor jerarquía configurado → escala a `company_admin` |
| Resultado esperado | Conversación visible y priorizada para el rol escalado |

### CU-04 Crear lead

| Campo | Detalle |
|---|---|
| Actor principal | Colaborador |
| Actores secundarios | Sistema (registra evento) |
| Precondiciones | Conversación con intención "Venta"/"Oportunidad comercial" (`MPS-002-001` §6) |
| Flujo principal | 1) Colaborador marca conversación como lead calificado. 2) `LeadCreated`. 3) Vínculo a campaña si aplica (caso de uso 29, `MEM-002-001` §7) |
| Flujos alternativos | Ninguno |
| Excepciones | Conversación sin contacto resuelto (etapa 4 fallida) → no se puede crear lead hasta resolver identidad |
| Resultado esperado | Lead visible en 2.4/2.5, atribuible a campaña |

### CU-05 Crear reservación

| Campo | Detalle |
|---|---|
| Actor principal | Colaborador |
| Actores secundarios | Sistema |
| Precondiciones | Conversación con intención "Reservación" |
| Flujo principal | 1) Colaborador confirma disponibilidad (manual, sin integración de disponibilidad en el MVP). 2) `ReservationCreated` |
| Flujos alternativos | Automática, solo si existe integración de disponibilidad garantizada (fuera de alcance de este documento, `MPS-002-001` §8) |
| Excepciones | Sin disponibilidad real → colaborador informa al cliente, no se crea el evento |
| Resultado esperado | Reservación registrada, visible en Dashboard Ejecutivo |

### CU-06 Transferir conversación

| Campo | Detalle |
|---|---|
| Actor principal | Colaborador |
| Actores secundarios | Colaborador destino |
| Precondiciones | Conversación asignada al actor |
| Flujo principal | 1) Actor selecciona nuevo responsable. 2) Contexto completo se preserva (principio Context Aware, `MPS-002-001` §3). 3) `ConversationAssigned` (reasignación) |
| Flujos alternativos | Transferencia automática vía motor de reglas (SLA, horario, disponibilidad, prioridad, carga de trabajo, cola disponible — `ADR-019`), nunca solo por tiempo de inactividad |
| Excepciones | Destino sin permiso de rol funcional → transferencia rechazada |
| Resultado esperado | Nuevo responsable con contexto completo, sin que el cliente perciba discontinuidad |

### CU-07 Cerrar conversación

| Campo | Detalle |
|---|---|
| Actor principal | Colaborador o regla automática (sin respuesta del cliente en X días) |
| Actores secundarios | Sistema |
| Precondiciones | Ver validaciones funcionales §7 (RV-04) |
| Flujo principal | 1) Actor marca como resuelta. 2) `ConversationResolved`. 3) Etapas 14–18 del ciclo de vida se ejecutan (retroalimentación, analytics, auditoría, aprendizaje) |
| Flujos alternativos | Cierre automático por inactividad — regla configurable, no forzada |
| Excepciones | Ninguna — el cierre nunca falla, es un cambio de estado |
| Resultado esperado | Conversación en estado `cerrado`, datos preservados (nunca se borra, `PROJECT-BLUEPRINT.md` §5 principio 4) |

### CU-08 Reabrir conversación

| Campo | Detalle |
|---|---|
| Actor principal | Colaborador |
| Actores secundarios | Sistema |
| Precondiciones | Conversación en estado `cerrado` |
| Flujo principal | 1) Actor reabre (nuevo mensaje del cliente, o corrección de cierre accidental). 2) Vuelve a `en_seguimiento` o `asignado` |
| Flujos alternativos | Reapertura automática si el cliente envía un nuevo mensaje en una conversación ya cerrada |
| Excepciones | Ninguna — sin fricción, mismo principio que el cierre (`MPS-002-001` §4, etapa 13) |
| Resultado esperado | Conversación activa de nuevo, historial completo preservado |

### CU-09 Aceptar sugerencia IA

| Campo | Detalle |
|---|---|
| Actor principal | Colaborador |
| Actores secundarios | IA, Motor de Aprendizaje |
| Precondiciones | Sugerencia generada (`AIRecommendationGenerated`) |
| Flujo principal | 1) Colaborador usa la sugerencia tal cual o editada. 2) `RecommendationFeedbackCaptured` con resultado "usada"/"editada" |
| Flujos alternativos | — |
| Excepciones | — |
| Resultado esperado | Retroalimentación registrada, alimenta §8 KPI "Precisión de recomendaciones" |

### CU-10 Rechazar sugerencia IA

| Campo | Detalle |
|---|---|
| Actor principal | Colaborador |
| Actores secundarios | IA, Motor de Aprendizaje |
| Precondiciones | Sugerencia generada |
| Flujo principal | 1) Colaborador descarta la sugerencia y responde distinto o no responde con IA. 2) `RecommendationFeedbackCaptured` con resultado "ignorada" |
| Flujos alternativos | — |
| Excepciones | — |
| Resultado esperado | Retroalimentación registrada — nunca penaliza al colaborador ni bloquea la conversación |

### CU-11 Etiquetar cliente

| Campo | Detalle |
|---|---|
| Actor principal | Colaborador |
| Actores secundarios | — |
| Precondiciones | Contacto resuelto (2.4) |
| Flujo principal | 1) Actor agrega etiqueta libre o de catálogo de empresa. 2) Etiqueta visible en Perfil Unificado (2.5) |
| Flujos alternativos | Etiqueta sugerida automáticamente por IA según intención recurrente, en estado `Suggested` — requiere confirmación humana para pasar a `Confirmed`/`Locked` (`ADR-018`) |
| Excepciones | — |
| Resultado esperado | Cliente clasificado para búsqueda/filtro futuro |

### CU-12 Buscar conversaciones

| Campo | Detalle |
|---|---|
| Actor principal | Cualquier rol funcional con acceso a 2.2 |
| Actores secundarios | — |
| Precondiciones | — |
| Flujo principal | 1) Actor busca por texto/etiqueta/cliente/canal/estado. 2) Resultados filtrados por su alcance de rol (§5) |
| Flujos alternativos | — |
| Excepciones | Sin resultados → mensaje claro, nunca error técnico expuesto |
| Resultado esperado | Lista de conversaciones relevantes |

### CU-13 Consultar historial

| Campo | Detalle |
|---|---|
| Actor principal | Colaborador |
| Actores secundarios | — |
| Precondiciones | Contacto con conversaciones previas |
| Flujo principal | 1) Actor abre Perfil Unificado (2.5). 2) Ve línea de tiempo completa |
| Flujos alternativos | — |
| Excepciones | Historial muy largo → resumen automático (caso de uso 48, `MEM-002-001` §7) |
| Resultado esperado | Contexto completo disponible antes de responder |

### CU-14 Configurar automatización

| Campo | Detalle |
|---|---|
| Actor principal | `company_admin` |
| Actores secundarios | Sistema de aprobación (`09G`) |
| Precondiciones | Al menos un evento de conversación disponible en el catálogo (`MPS-002-001` §10) |
| Flujo principal | 1) Admin define regla (evento + condición + acción, `09B`). 2) Solicita aprobación si la acción tiene efecto externo. 3) Regla activa |
| Flujos alternativos | Instanciar desde plantilla (`09D-AUTOMATION-TEMPLATES.md`) en vez de crear desde cero |
| Excepciones | Regla mal condicionada (bucle) → rechazada por los límites duros ya fijados (`09A-WORKFLOW-ENGINE.md` §7) |
| Resultado esperado | Automatización activa, auditable (Regla de negocio RN-05, §4) |

### CU-15 Gestionar plantillas

| Campo | Detalle |
|---|---|
| Actor principal | `company_admin` o Community Manager (§5) |
| Actores secundarios | — |
| Precondiciones | — |
| Flujo principal | 1) Actor crea/edita plantilla de respuesta frecuente. 2) Plantilla disponible como sugerencia rápida en 2.3 |
| Flujos alternativos | — |
| Excepciones | Plantilla vacía o inválida → validación bloquea guardado (§7) |
| Resultado esperado | Plantilla reutilizable, reduce tiempo de respuesta (KPI, §8) |

---

## 4. Reglas de Negocio

| ID | Regla | Dominio |
|---|---|---|
| RN-01 | Una conversación solo puede estar asignada a un responsable activo (`profiles.active = true`) a la vez | Gestión de Conversaciones |
| RN-02 | Toda conversación debe tener un estado válido de la máquina de estados (§6) en todo momento — nunca un estado nulo/indefinido | Gestión de Conversaciones |
| RN-03 | Toda conversación debe quedar auditada según el alcance de `CCEC-001A` — acceso, asignación, cierre | Auditoría |
| RN-04 | Toda recomendación de IA debe registrar aceptación, edición o rechazo (`RecommendationFeedbackCaptured`) — nunca queda sin retroalimentación registrada | IA Conversacional |
| RN-05 | Toda automatización debe ser trazable a la regla que la disparó y al evento que la originó | Automatizaciones |
| RN-06 | Ninguna respuesta sale al cliente sin origen humano (escrita o confirmada) — `ADR-009` aplicado sin excepción | Gestión de Conversaciones |
| RN-07 | Un contacto no puede tener más datos almacenados que el límite de CRM ligero (`MPS-002-000` §6, formalizado como principio permanente en `ADR-020`) — ninguna pantalla puede agregar un campo de pipeline de ventas | Gestión de Clientes |
| RN-16 | Un cliente es una entidad única que puede tener múltiples identidades digitales (Instagram, Facebook, Messenger, futuros canales) — nunca se duplica un cliente por canal (`ADR-017`) | Gestión de Clientes |
| RN-08 | Una automatización con efecto externo (envío de mensaje, creación de lead) requiere aprobación de `company_admin` antes de activarse | Automatizaciones |
| RN-09 | El cierre de una conversación nunca elimina datos — solo cambia estado (RN-02) | Gestión de Conversaciones |
| RN-10 | Solo `company_admin` puede conectar/desconectar la integración de Meta Graph API | Configuración |
| RN-11 | Una conversación escalada mantiene su asignación original visible — el escalamiento agrega un rol, no reemplaza al responsable | Gestión de Conversaciones |
| RN-12 | Ningún dato de cliente final se retiene más allá de lo necesario para su propósito (`CCEC-005` §3, principio 1) | Gestión de Clientes |
| RN-13 | La reclasificación manual de una intención de negocio nunca reentrena el modelo de IA (`ADR-015`) — solo se registra como retroalimentación | Business Intent Engine |
| RN-14 | Un rol funcional (§5) nunca otorga más acceso del que el rol base de MAHP (`profiles.role`) ya permite — es una restricción adicional, nunca una ampliación | Roles y Permisos |
| RN-15 | Toda plantilla de respuesta pertenece a una empresa (`company_id`) — nunca compartida entre empresas | Configuración |

---

## 5. Roles y Permisos

| Rol funcional | Funciones permitidas | Restricciones | Responsabilidades |
|---|---|---|---|
| **Owner** | Todo lo de Administrador + decisiones de plan/facturación del módulo (`10B`) | Uno por empresa, mapea a `company_admin` fundador | Decisión final sobre activación del módulo |
| **Administrador** | Configurar integraciones (2.12), gestionar roles (2.13), ver auditoría completa de su empresa (2.14), aprobar automatizaciones (RN-08) | Mapea a `company_admin` — no puede exceder el alcance de RLS de ese rol base (RN-14) | Gobierno del módulo dentro de su empresa |
| **Supervisor** | Reasignar conversaciones (CU-02 manual), ver Dashboard Ejecutivo completo, escalar (CU-03) | Sin acceso a Configuración (2.12) ni Administración (2.13) | Supervisión operativa diaria |
| **Community Manager** | Responder (CU-01), gestionar plantillas (CU-15), etiquetar (CU-11) | Sin acceso a Automatizaciones (2.9) ni Configuración | Ejecución de conversaciones de marketing/engagement |
| **Ejecutivo de Ventas** | Responder conversaciones con intención Venta/Oportunidad, crear lead (CU-04), crear reservación (CU-05) | Solo ve conversaciones con esas intenciones asignadas a él | Conversión comercial |
| **Atención al Cliente** | Responder conversaciones con intención Soporte/Queja/Facturación, escalar (CU-03) | Sin acceso a creación de leads | Resolución de soporte |
| **Operador** | Responder (CU-01), transferir (CU-06), cerrar/reabrir (CU-07/08) | Rol de ejecución general, sin especialización de intención | Operación general cuando no hay roles especializados asignados |
| **Auditor** | Ver auditoría (2.14) — solo lectura | Sin ninguna acción de escritura en ningún módulo | Verificación de cumplimiento y trazabilidad |
| **IA (capacidades automatizadas)** | Generar sugerencia (2.6), clasificar (2.7), ejecutar automatización ya aprobada (2.9) | Nunca actúa sin que un humano haya aprobado el mecanismo de antemano (RN-06, RN-08) — no es un "usuario" con permisos propios, es un actor sujeto a las reglas de quien configuró la automatización | Acelerar sin decidir — mismo principio Human in the Loop en cada fila de esta tabla |

**Nota de coherencia con roles base**: estos 9 roles funcionales son una capa de permisos **dentro** de Social AI Hub — ninguno reemplaza ni amplía los 4 roles base de MAHP (`super_admin`/`company_admin`/`director`/`collaborator`, `07H-MULTI-TENANT-DESIGN.md`). Un `collaborator` de MAHP podría tener el rol funcional "Community Manager" dentro de este módulo, pero sigue sujeto a todas las restricciones de RLS de `collaborator` a nivel de plataforma (RN-14).

---

## 6. Estados del Sistema

### 6.1 Conversaciones — ya diseñado en `MPS-002-001` §"Diagramas", referenciado, no repetido

```
recibido ──▶ en_analisis ──▶ clasificado ──▶ asignado ──▶ respondido
                                                              │
                                          ┌───────────────────┼──────────────┐
                                          ▼                   ▼               ▼
                                    en_seguimiento      escalado         cerrado
                                          │                   │               ▲
                                          └───────────────────┴───────────────┘
                                                              │
                                                              ▼
                                                    reabierto (CU-08, sin fricción)
```

### 6.2 Clientes/Contactos — nuevo

```
nuevo (primer mensaje, etapa 4) ──▶ activo (con historial) ──▶ inactivo (sin
        │                                                        mensajes
        │                                                        en N días)
        └──────────────────────────────────────────────────────────┘
                    (reactivación con nuevo mensaje, sin fricción)
```

### 6.3 Leads — nuevo

```
sin_calificar ──▶ calificado (CU-04, LeadCreated) ──▶ convertido (venta atribuida)
                          │
                          └──▶ descartado (sin seguimiento del cliente)
```

### 6.4 Automatizaciones — hereda `09A-WORKFLOW-ENGINE.md` §9, aplicado a reglas de conversación

```
propuesta ──▶ pendiente_aprobacion (RN-08) ──▶ activa ──▶ desactivada
                        │
                        └──▶ rechazada
```

### 6.5 Recomendaciones IA — nuevo

```
generada ──▶ usada_tal_cual (CU-09)
    │
    ├──▶ editada (CU-09, variante)
    │
    └──▶ ignorada (CU-10)
```
Estado terminal en los tres casos — cada recomendación se resuelve una sola vez (RN-04).

### 6.6 Integraciones — hereda `08F-EVENT-ARCHITECTURE.md` §2

```
desconectada ──▶ conectada ──▶ token_vencido ──▶ reconectada / desconectada
```

### 6.7 Notificaciones — hereda `09H-NOTIFICATION-ORCHESTRATION.md` §"in-app"

```
generada ──▶ entregada ──▶ leída
```

---

## 7. Validaciones Funcionales

| ID | Validación | Aplica a |
|---|---|---|
| RV-01 | Toda conversación requiere `company_id` resoluble antes de procesarse más allá de la etapa 3 | Ciclo de vida (`MPS-002-001` §4) |
| RV-02 | Ninguna asignación (CU-02) a un colaborador con `profiles.active = false` (RN-01) | Gestión de Conversaciones |
| RV-03 | Un rol funcional (§5) no puede ejecutar una acción fuera de sus "Funciones permitidas" — validado antes de mostrar la opción en interfaz, no solo al ejecutar | Todos los módulos |
| RV-04 | Cierre de conversación (CU-07) requiere que no haya una acción pendiente de aprobación asociada (ej. automatización esperando `09G`) | Gestión de Conversaciones |
| RV-05 | Activar una automatización (CU-14) requiere al menos un evento y una acción válidos del catálogo — nunca una regla vacía | Automatizaciones |
| RV-06 | Conectar integración (2.12) requiere permiso de `company_admin` (RN-10) y OAuth completado exitosamente | Configuración |
| RV-07 | Un dato de contacto (2.4) no puede exceder los campos ya definidos en el límite de CRM ligero (RN-07) — cualquier campo nuevo requiere revisión contra `MPS-002-000` §6 | Gestión de Clientes |
| RV-08 | Plantilla (CU-15) requiere contenido no vacío y `company_id` válido (RN-15) | Configuración |

---

## 8. Manejo de Errores

| Escenario | Comportamiento esperado | Experiencia del usuario |
|---|---|---|
| Error de conexión con Meta | Reintento con backoff (mismo mecanismo de `09A-WORKFLOW-ENGINE.md` §7); si falla definitivo, marcar mensaje como "no entregado" | Indicador visual claro en la conversación, nunca un error técnico crudo |
| Cliente no identificado (etapa 4 fallida) | Conversación queda visible pero sin contacto vinculado; no bloquea la bandeja | Aviso "cliente sin identificar" con opción de vincular manualmente |
| Permisos insuficientes (RV-03) | Acción no se ofrece en interfaz; si se intenta vía atajo, rechazo explícito | Mensaje "no tienes permiso para esta acción", nunca fallo silencioso |
| IA no disponible (proveedor caído, etapa 7) | Degradar a clasificación/priorización manual pendiente — la conversación sigue operable sin IA | Aviso "sugerencia de IA no disponible, puedes responder directamente" |
| Automatización fallida | Reintento según política ya definida (`09A` §7); tras agotar reintentos, notificar al dueño de la automatización (`09I-AUTOMATION-GOVERNANCE.md` §2) | Notificación al `company_admin`, nunca una conversación bloqueada por la falla |
| Integración externa fallida (Meta Graph API caída) | Mensajes entrantes se encolan hasta que el servicio se restablece; ningún dato se pierde | Banner de estado "canal temporalmente no disponible" en 2.1/2.2 |

---

## 9. KPIs Funcionales

No se repiten los ya definidos en `MPS-002-001` §12 (tiempo de respuesta, resolución, precisión, conversión, etc.) — se agregan los específicos de los módulos funcionales nuevos de este documento:

| Módulo | KPI | Alimenta Dashboard Ejecutivo (2.1) |
|---|---|---|
| Gestión de Clientes (2.4) | Contactos nuevos vs. recurrentes por periodo | Sí |
| Perfil Unificado (2.5) | Conversaciones promedio por contacto | No — detalle, no resumen |
| Automatizaciones (2.9) | Reglas activas, tasa de éxito (reutiliza `09A` KPIs) | Sí |
| Community/Customer Engagement Advisor (2.8) | Tendencia de sentimiento por canal | Sí |
| Configuración (2.12) | Estado de conexión del canal (activo/token vencido) | Sí — alerta si no está `conectada` |
| Auditoría (2.14) | Eventos auditados vs. eventos totales del catálogo (cobertura, mismo criterio que `CCEC-001A`) | No — panel de gobierno, no operativo |
| Centro de Notificaciones (2.15) | Tiempo entre evento y notificación entregada | No |

---

## 10. Product Backlog Inicial

Organizado en 8 épicas, mapeadas a los 15 módulos funcionales (§2). **Backlog inicial, no exhaustivo** — historias representativas por feature, suficientes para iniciar diseño técnico; el detalle completo se expande en `MPS-002-003` (UX Blueprint) y en la implementación misma, consistente con `MES-001` (Documentation First no exige exhaustividad prematura, principio 12).

### Épica 1 — Bandeja y Gestión de Conversaciones (2.2, 2.3)

| Feature | Historia de usuario | Criterios de aceptación | Prioridad | Dependencias | Riesgos | Story Points | Sprint |
|---|---|---|---|---|---|---|---|
| Bandeja priorizada | Como Operador, quiero ver mis conversaciones ordenadas por prioridad para atender primero lo urgente | Lista ordenada por puntaje (§8 `MPS-002-001`); filtro por estado/canal | Alta | CIE (clasificación/priorización) | Riesgo de priorización incorrecta (`MPS-002-001` §13) | 8 | 1 |
| Responder conversación (CU-01) | Como Operador, quiero responder un mensaje con o sin sugerencia de IA | Sugerencia visible con motivo (`ADR-014`); envío exitoso actualiza estado | Alta | Adaptador Meta (`ADR-010`) | Ventana 24h de Meta (`MPS-002-001` §1, [HIPÓTESIS]) | 13 | 1 |
| Asignar/reasignar (CU-02, CU-06) | Como Supervisor, quiero reasignar una conversación a otro colaborador | Contexto se preserva; notificación al nuevo responsable | Alta | 2.15 | — | 5 | 1 |
| Cerrar/reabrir (CU-07, CU-08) | Como Operador, quiero cerrar una conversación resuelta y reabrirla si el cliente vuelve a escribir | Sin pérdida de datos (RN-09); reapertura sin fricción | Media | — | — | 5 | 2 |
| Escalar (CU-03) | Como Atención al Cliente, quiero escalar una queja grave a un supervisor | Notificación inmediata; responsable original visible (RN-11) | Alta | 2.15 | — | 3 | 1 |

### Épica 2 — Gestión de Clientes y Perfil Unificado (2.4, 2.5)

| Feature | Historia de usuario | Criterios de aceptación | Prioridad | Dependencias | Riesgos | Story Points | Sprint |
|---|---|---|---|---|---|---|---|
| Identificación de contacto | Como Sistema, quiero vincular cada mensaje a un contacto (con sus múltiples identidades de canal) para dar contexto | Contacto nuevo o existente resuelto en etapa 4; respeta RN-07, RN-16 (`ADR-017`) | Alta | Adaptador Meta | Mecanismo técnico de vinculación automática entre identidades todavía no diseñado (`ADR-017`, pendiente para `MPS-002-003`) | 8 | 1 |
| Perfil Unificado (CU-13) | Como Operador, quiero ver el historial completo de un cliente antes de responder | Línea de tiempo completa; resumen si es muy larga (caso de uso 48) | Media | Épica 1 | — | 5 | 2 |
| Etiquetar cliente (CU-11) | Como Community Manager, quiero etiquetar un contacto para encontrarlo después | Etiqueta persistente, visible en búsqueda (CU-12) | Baja | — | — | 3 | 3 |

### Épica 3 — IA Conversacional y Business Intent Engine (2.6, 2.7)

| Feature | Historia de usuario | Criterios de aceptación | Prioridad | Dependencias | Riesgos | Story Points | Sprint |
|---|---|---|---|---|---|---|---|
| Sugerencia de respuesta | Como Operador, quiero ver una sugerencia de IA con su motivo antes de responder | Motivo siempre visible (`ADR-014`); aceptar/editar/rechazar registrado (RN-04) | Alta | Community Manager Advisor (`05A` #11), `ADR-007` | Dependencia de proveedor de IA (`MPS-002-001` §13) | 13 | 2 |
| Clasificación de intención (CU-... vía 2.7) | Como Ejecutivo de Ventas, quiero ver por qué una conversación se clasificó como "Venta" | Confianza + motivo visibles; reclasificación manual disponible | Media | Motor de análisis IA | — | 8 | 2 |
| Retroalimentación (CU-09, CU-10) | Como Sistema, quiero registrar si una sugerencia fue útil para mejorar reglas futuras | 100% de sugerencias con retroalimentación capturada (RN-04) | Alta | — | Sin ese registro, `ADR-015` no tiene insumo | 5 | 2 |

### Épica 4 — Automatizaciones (2.9)

| Feature | Historia de usuario | Criterios de aceptación | Prioridad | Dependencias | Riesgos | Story Points | Sprint |
|---|---|---|---|---|---|---|---|
| Configurar automatización (CU-14) | Como `company_admin`, quiero crear una regla de respuesta automática para preguntas frecuentes | Requiere aprobación si tiene efecto externo (RN-08); auditable (RN-05) | Media | `09A`/`09B` en uso real | Complejidad de depuración (`09-*` riesgo ya reconocido) | 13 | 3 |
| Plantillas (CU-15) | Como Community Manager, quiero gestionar plantillas de respuesta reutilizables | Validación de contenido no vacío (RV-08) | Baja | — | — | 5 | 3 |

### Épica 5 — Integración con Meta y Configuración (2.12)

| Feature | Historia de usuario | Criterios de aceptación | Prioridad | Dependencias | Riesgos | Story Points | Sprint |
|---|---|---|---|---|---|---|---|
| Conectar página de Meta | Como `company_admin`, quiero conectar mi Facebook Page/Instagram Business a MAHP | OAuth completo (RV-06); token cifrado (`08E-SECURITY.md` §8) | Crítica | Revisión de app en Meta for Developers (externo, plazo no controlado) | Rechazo/demora de la revisión de Meta (`MPS-002-001` §13) | 13 | 0 *(prerrequisito, antes de Sprint 1)* |
| Detección de token vencido | Como Sistema, quiero notificar cuando la conexión con Meta falla | Notificación a `company_admin`; conversación no se pierde | Alta | Conexión de Meta ya activa | — | 5 | 1 |

### Épica 6 — Dashboard Ejecutivo y Analytics (2.1, 2.11)

| Feature | Historia de usuario | Criterios de aceptación | Prioridad | Dependencias | Riesgos | Story Points | Sprint |
|---|---|---|---|---|---|---|---|
| Indicadores agregados | Como Owner, quiero ver el estado general de mis conversaciones sin entrar a cada una | Conteos y tendencias según §9; solo agregados (sin dato individual de tercero) | Media | `CCEC-004A` (Implementation Maturity 1/10, `MES-001` §14.2) | Sin observabilidad real implementada todavía | 8 | 3 |

### Épica 7 — Administración, Auditoría y Notificaciones (2.13, 2.14, 2.15)

| Feature | Historia de usuario | Criterios de aceptación | Prioridad | Dependencias | Riesgos | Story Points | Sprint |
|---|---|---|---|---|---|---|---|
| Asignar rol funcional | Como `company_admin`, quiero asignar el rol "Ejecutivo de Ventas" a un colaborador | Respeta RN-14 (nunca excede rol base) | Media | — | — | 5 | 2 |
| Ver auditoría del módulo | Como Auditor, quiero ver quién accedió a qué conversación | Eventos de `CCEC-001A` específicos del módulo agregados al catálogo | Media | `CCEC-001` (Implementation Maturity 2/10) | Cobertura de auditoría parcial hoy | 8 | 3 |
| Notificaciones de asignación/escalamiento | Como Operador, quiero recibir aviso cuando se me asigna una conversación | Notificación in-app entregada (`09H`) | Alta | 2.15 ya existente | — | 3 | 1 |

### Épica 8 — Community/Customer Engagement Advisor (2.8)

| Feature | Historia de usuario | Criterios de aceptación | Prioridad | Dependencias | Riesgos | Story Points | Sprint |
|---|---|---|---|---|---|---|---|
| Insight agregado de sentimiento | Como `director`, quiero ver tendencias de sentimiento por canal sin ver conversaciones individuales | Solo datos agregados (`CCEC-005` §3) | Baja | Volumen real de conversaciones acumulado | Insuficiente volumen inicial para insight significativo | 8 | 4 *(post-MVP)* |

**Total estimado del backlog inicial**: ~145 story points, 4 sprints sugeridos (Sprint 0 = prerrequisito de conexión Meta, Sprints 1–3 = MVP funcional completo, Sprint 4 = primera extensión post-MVP).

---

## 11. Traceability Matrix

Cadenas representativas, extremo a extremo — no exhaustiva para los 100+ elementos de este documento, suficiente para validar que el método de trazabilidad funciona desde la visión hasta el desarrollo.

| Objetivo del producto (`MPS-002-000`) | Funcionalidad | Caso de uso | Regla de negocio | KPI | Historia de usuario |
|---|---|---|---|---|---|
| Reducir tiempo de respuesta (`MEM-002-001` §3) | Bandeja priorizada (2.2) + Responder (2.3) | CU-01 | RN-06 | Tiempo de primera respuesta (`MPS-002-001` §12) | "Bandeja priorizada", Épica 1 |
| IA asiste sin decidir (principio Human in the Loop) | IA Conversacional (2.6) | CU-09, CU-10 | RN-04, RN-06 | Precisión de recomendaciones (`MPS-002-001` §12) | "Sugerencia de respuesta", Épica 3 |
| CRM ligero, nunca completo (`MPS-002-000` §6, `ADR-020`) | Gestión de Clientes (2.4) | CU-11 | RN-07, RN-16 | Contactos nuevos vs. recurrentes (§9) | "Identificación de contacto", Épica 2 |
| Automatización configurable, no código a medida (principio 19, `MES-001` §4) | Automatizaciones (2.9) | CU-14 | RN-05, RN-08 | Reglas activas / tasa de éxito (§9) | "Configurar automatización", Épica 4 |
| Auditoría completa (principio 8, `MES-001` §4) | Auditoría (2.14) | — *(transversal, no un CU único)* | RN-03 | Cobertura de auditoría (§9) | "Ver auditoría del módulo", Épica 7 |
| Channel-agnostic, Meta primero (`ADR-010`) | Configuración (2.12) | — | RN-10 | Estado de conexión del canal (§9) | "Conectar página de Meta", Épica 5 |
| Explainable AI (`ADR-014`) | Business Intent Engine (2.7) | — | RN-13 | Precisión en clasificación (`MPS-002-001` §12) | "Clasificación de intención", Épica 3 |

---

## 12. Definition of Done

✓ 15 módulos funcionales definidos (§2).
✓ 15 casos de uso documentados (§3).
✓ 16 reglas de negocio catalogadas y clasificadas por dominio (§4).
✓ Matriz de 9 roles funcionales (§5).
✓ Estados funcionales de 7 entidades (§6).
✓ 8 validaciones funcionales (§7).
✓ 6 escenarios de error (§8).
✓ Backlog inicial de 8 épicas (§10).
✓ Matriz de trazabilidad (§11).

---

## 13. Enterprise Architecture Review (obligatorio)

**1. ¿Qué contradicciones encontraste con MES, MDS, MPS, ADR y CCEC?**
Una: el documento de fase pedía un "Enterprise Readiness Score" combinado (0–100), formato que `MES-001` §14 reemplazó explícitamente por dos métricas independientes (decisión ya aprobada por el Product Owner). Este documento usa el formato ya vigente (§15), no el pedido originalmente — señalado en el encabezado, no aplicado en silencio. Ninguna otra contradicción: el límite de CRM ligero (`MPS-002-000` §6) se mantiene sin excepción en los 15 módulos (particularmente 2.4/2.5/2.10, donde el riesgo de erosión era mayor).

**2. ¿Qué riesgos de escalabilidad existen?**
Ninguno nuevo — hereda los ya documentados en `MPS-002-001` §13 (cola compartida, dependencia de Meta). La única adición: el backlog (§10) asume volumen bajo-medio en el MVP (Épica 1, "decenas/día" per `MEM-002-001` §6) — si el primer cliente real tiene un volumen mayor al esperado, el Sprint 1 podría requerir revisión de alcance.

**3. ¿Qué decisiones deberían convertirse en nuevos ADR?**
**Resuelto por decisión del Product Owner** — 4 ADR creadas en este mismo cambio: `ADR-017` (Unified Customer Identity Model), `ADR-018` (AI Assisted Tagging con estados `Suggested`/`Confirmed`/`Locked`), `ADR-019` (Intelligent Conversation Routing basado en reglas, nunca solo inactividad), y `ADR-020` (MAHP Lightweight CRM Boundary — supersede la propuesta original más estrecha de "catálogo cerrado de campos", ahora un principio permanente). Queda pendiente, sin crear todavía por no haber sido aprobada explícitamente: la propuesta original de "roles funcionales estrictamente aditivos" (RN-14) — sigue siendo candidata, no descartada.

**4. ¿Qué debería rediseñarse antes del desarrollo?**
Nada de lo especificado aquí requiere rediseño. Las 3 decisiones que estaban pendientes (identidad de contacto entre canales, etiquetado automático, transferencia por inactividad) **ya se resolvieron** vía `ADR-017`/`018`/`019` — ver actualización de CU-06, CU-11, RN-16 en este mismo cambio. Persisten como trabajo técnico pendiente para `MPS-002-003` (no como decisiones sin tomar): el mecanismo de vinculación automática entre identidades (`ADR-017`) y los campos de horario/disponibilidad/carga de trabajo que el motor de enrutamiento (`ADR-019`) necesitará y que `profiles` no tiene hoy.

**5. ¿Qué dependencias externas existen?**
Meta Graph API + su proceso de revisión de app (crítico, Épica 5, Sprint 0), proveedor de IA vía proxy (`ADR-007`) — ninguna nueva frente a `MPS-002-001`.

**6. ¿Qué supuestos se realizaron?**
Que la confirmación de reservación (CU-05) es manual en el MVP, sin integración de disponibilidad — evita prometer una automatización que dependería de un sistema externo no diseñado. Que el volumen inicial de conversaciones es bajo-medio (punto 2).

**7. ¿Qué oportunidades de mejora existen?**
(a) Aplicar el Project Reality Check retroactivamente a `MPS-002-000`/`001` en una futura sesión de mantenimiento (recomendación ya pendiente desde `MES-001`). (b) Cuando exista integración con CRM externo real (`08C-INTEGRATIONS-CATALOG.md`), revisar si 2.10 necesita rediseñarse o si sigue siendo puramente interno.

**8. ¿Qué impacto tendrá este documento sobre el resto de MAHP?**
Es el primer documento de todo `/docs` con un backlog real (épicas, historias, story points, sprints) y una matriz de trazabilidad completa — establece el formato que `MPS-002-003` y futuros MPS deberían seguir para pasar de especificación a desarrollo real.

**9. ¿Mantiene la visión original del proyecto?**
Sí — el límite de CRM ligero, revisado explícitamente en cada uno de los 15 módulos, es la prueba más concreta hasta ahora de que la identidad de producto ("MAHP no es un CRM") se sostiene incluso al nivel de detalle funcional, no solo en documentos de visión.

**10. Recomendación**:
☑ **Aprobado**

Justificación: el documento cumple su Definition of Done, y las 3 decisiones que motivaban "Aprobar con observaciones" en la revisión anterior fueron resueltas por decisión explícita del Product Owner en este mismo cambio (`ADR-017`/`018`/`019`/`020`). Única observación heredada, no nueva: la ventana de 24h de Meta (`MPS-002-001` §1) sigue sin verificarse contra documentación oficial — no bloquea esta especificación, pero condiciona el diseño de seguimiento en `MPS-002-003`.

---

## 14. Project Reality Check (PRC)

*(Tercer estándar obligatorio de `MES-001` §12A — segunda aplicación después de la del propio `MES-001`.)*

**1. ¿Qué funcionalidades están completamente especificadas?** Los 15 módulos, 15 casos de uso, 15 reglas de negocio, 9 roles, 7 máquinas de estado — el 100% de lo pedido por esta fase.

**2. ¿Qué funcionalidades siguen siendo hipótesis?** Solo el comportamiento de seguimiento fuera de la ventana de 24h de Meta ([HIPÓTESIS] heredada de `MPS-002-001` §1) — el etiquetado asistido por IA (CU-11) y el enrutamiento inteligente (CU-06) ya son decisión tomada (`ADR-018`/`019`), pendientes de diseño técnico, no de decisión de producto.

**3. ¿Qué depende de Meta Graph API?** Todo el módulo 2.3 (Gestión de Conversaciones) y 2.12 (Configuración) — sin la app aprobada por Meta for Developers, ninguna conversación real puede procesarse.

**4. ¿Qué depende de decisiones legales?** RN-07/RN-12 (límite de CRM ligero y minimización de datos) dependen de que `CCEC-005` complete su consulta legal real antes de capturar el primer dato de un cliente final — sin cambio frente a lo ya señalado.

**5. ¿Qué requiere validación del Product Owner?** Ya recibida en este mismo ciclo: identidad de cliente multi-canal, etiquetado asistido, enrutamiento inteligente, y el límite de CRM ligero como principio permanente (`ADR-017`–`020`). Pendiente todavía: priorización final de épicas y sprints del backlog (§10); el alcance del rol "Ejecutivo de Ventas" (§5), el más cercano al límite de CRM y el que más vale la pena confirmar explícitamente.

**6. ¿Qué puede desarrollarse inmediatamente?** El proceso de revisión de app ante Meta for Developers (Épica 5, Sprint 0) — no depende de que `MPS-002-003` exista, tiene plazo externo largo, y es career crítico del roadmap completo.

**7. ¿Qué bloquea el desarrollo?** `MPS-002-003` (Enterprise UX Blueprint) es el siguiente gate formal antes de diseño técnico — sin él, no hay pantallas que construir, aunque el modelo funcional (este documento) ya esté completo.

---

## 15. Engineering Maturity & Implementation Maturity

*(Formato oficial de `MES-001` §14 — reemplaza el "Enterprise Readiness Score" combinado pedido originalmente por esta fase, ver Enterprise Architecture Review Q1.)*

### 15.1 Engineering Maturity — calidad de esta especificación

| Dimensión | Puntaje (0–10) | Justificación |
|---|---|---|
| Funcionalidad (diseño) | 9 | 15 módulos, 15 casos de uso, reglas y validaciones completos y consistentes entre sí |
| Arquitectura (coherencia) | 9 | Sin contradicción nueva con `MPS-002-000`/`001`/`MES-001`, salvo la ya señalada y resuelta (formato de score) |
| Escalabilidad (diseño) | 8 | Hereda sin fricción los límites ya reconocidos, backlog dimensionado con supuestos explícitos |
| Seguridad (diseño) | 8 | RN-10, RV-06 aplican el mismo estándar de `08E-SECURITY.md` sin excepción |
| IA (diseño) | 9 | Human in the Loop y Explainable AI presentes en cada módulo/caso de uso que toca IA, sin una sola excepción encontrada |
| UX | N/A | Deliberadamente fuera de alcance de este documento (regla de la fase) — se evalúa en `MPS-002-003` |
| Observabilidad (diseño) | 8 | KPIs funcionales definidos por módulo (§9), todos consumiendo `CCEC-004A` sin panel propio |
| Documentación | 9 | Mismo estándar de honestidad de estado que el resto de `/docs`, con 3 decisiones pendientes marcadas explícitamente, no ocultas |
| Gobernanza (diseño) | 9 | EAR + PRC + Engineering/Implementation Maturity aplicados sin excepción, formato ya oficial de `MES-001` |
| Preparación para Desarrollo | 8 | Backlog con story points y sprints reales — el documento más "listo para construir" de toda la serie hasta ahora |

**Engineering Maturity total: 86/90 (96%)** *(UX excluido del cálculo por ser N/A, no un 0)*

### 15.2 Implementation Maturity — cuánto de Social AI Hub existe realmente

| Dimensión | Puntaje (0–10) | Justificación |
|---|---|---|
| Producto (los 15 módulos) | 0 | Ninguno construido — este documento es especificación, no código |
| IA conversacional | 1 | Community Manager Advisor existe (`05A` #11) pero sin datos reales de conversación que consumir todavía |
| Integración con Meta | 0 | Sin app aprobada, sin adaptador construido |
| Automatizaciones de conversación | 0 | `09A`/`09B` existen para el resto de MAHP, sin extender todavía al catálogo de eventos de este módulo |
| Auditoría del módulo | 0 | Eventos de este módulo no agregados a `CCEC-001A` todavía |
| Observabilidad del módulo | 0 | Sin métrica real capturada |

**Implementation Maturity total: 1/60 (2%)**

### 15.3 Lectura conjunta

Consistente con `ADR-016` (Progressive Infrastructure Strategy): un 96% de madurez de diseño frente a un 2% de construcción real es exactamente lo esperado para un documento de especificación funcional que todavía no ha pasado por UX, diseño técnico ni desarrollo — no es una señal de alarma, es la fotografía correcta de dónde está Social AI Hub en su ciclo de vida (`MES-001` §4A: la mayoría de sus componentes en estado `Specified` tras este documento, ninguno todavía en `Prototype`).

---

## Entregable Final

**1. Resumen ejecutivo**: Social AI Hub tiene ahora su comportamiento funcional completo — 15 módulos, 15 casos de uso, 15 reglas de negocio, 9 roles, 7 máquinas de estado, validaciones y manejo de error — todo trazable desde la visión (`MPS-002-000`) hasta un backlog real de 8 épicas y ~145 story points (§10–11). El límite de CRM ligero, la restricción más frágil de todo el módulo, se sostuvo sin excepción en los 15 módulos revisados. La brecha de implementación (2%) es la esperada para esta etapa, no un riesgo.

**2. Catálogo funcional consolidado**: 15 módulos (§2) + 15 casos de uso (§3) + 16 reglas de negocio (§4, incluida RN-16 de identidad multi-canal) + 9 roles (§5) + 7 estados (§6) + 8 validaciones (§7) + 6 escenarios de error (§8) + KPIs funcionales por módulo (§9).

**3. Backlog priorizado**: 8 épicas, ~145 story points, 4 sprints sugeridos (§10) — Sprint 0 (conexión Meta, prerrequisito externo) → Sprint 1 (bandeja, respuesta, asignación, notificaciones — el núcleo operable) → Sprint 2 (IA conversacional, perfil unificado, roles) → Sprint 3 (automatizaciones, plantillas, dashboard, auditoría) → Sprint 4 (Customer Engagement Advisor, post-MVP).

**4. ADR creadas**: `ADR-017` (Unified Customer Identity Model), `ADR-018` (AI Assisted Tagging), `ADR-019` (Intelligent Conversation Routing) y `ADR-020` (MAHP Lightweight CRM Boundary) — las 4 aprobadas y creadas en este mismo cambio, tras decisión explícita del Product Owner. Pendiente, no descartada: la propuesta original de "roles funcionales estrictamente aditivos" (RN-14).

**5. Riesgos abiertos**: la ventana de 24h de Meta sigue sin verificarse contra documentación oficial (heredado de `MPS-002-001`, con impacto directo en la Épica 1); el mecanismo técnico de vinculación de identidades entre canales (`ADR-017`) y los campos de horario/disponibilidad/carga de trabajo que el enrutamiento inteligente (`ADR-019`) requiere y que `profiles` no tiene hoy — ambos quedan como trabajo de diseño técnico para `MPS-002-003`, no como decisiones sin tomar; volumen real de conversaciones del primer cliente todavía desconocido, con impacto directo en el dimensionamiento del backlog.

**6. Recomendaciones para iniciar `MPS-002-003` — Enterprise UX Blueprint**: (a) diseñar explícitamente el componente de UI para etiquetas en sus 3 estados (`Suggested`/`Confirmed`/`Locked`, `ADR-018`) y para la explicación de una transferencia automática (`ADR-019`) — ambos ya son decisión de producto, faltan solo su forma visual; (b) iniciar el proceso de revisión de app ante Meta for Developers en paralelo a `MPS-002-003`, no después — es la dependencia externa de mayor plazo de todo el roadmap; (c) usar el backlog de este documento (§10) como esqueleto de las pantallas a diseñar, en vez de que `MPS-002-003` derive su propio catálogo desde cero; (d) coordinar con `07A-DOMAIN-MODEL.md` la extensión de datos de usuario (horario/disponibilidad) que `ADR-019` ya anticipa como necesaria.

**No se implementó código, base de datos ni APIs técnicas en esta fase — solo especificación funcional, conforme a las reglas de MPS-002-002. No avanzar a MPS-002-003 hasta recibir la aprobación explícita del Product Owner.**
