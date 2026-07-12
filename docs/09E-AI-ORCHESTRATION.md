# AI ORCHESTRATION — Orquestación de Agentes de IA

> MDS-010, Documento 6 de 10. Delegación de tareas, resolución de
> conflictos, compartición de contexto, priorización, memoria compartida y
> supervisión humana entre agentes de IA. **No rediseña** la colaboración
> entre agentes — formaliza el patrón ya fijado en `05-AI-ECOSYSTEM.md` §11
> y `05B-AI-WORKFLOWS.md` como un tipo de acción dentro del Workflow Engine
> (`09A`).
>
> Última actualización: 2026-07-12.

---

## 1. Punto de partida: el patrón "cadena" ya está diseñado

`05-AI-ECOSYSTEM.md` §11 ya estableció, desde MDS-006: sin comunicación dinámica entre agentes en V1, orquestación secuencial (cada agente recibe el resultado del anterior como contexto), delegación por regla simple de mapeo intención→agente, siempre con revisión humana antes de publicar. Este documento no cambia ninguna de esas decisiones — las expresa como una acción del Workflow Engine (`09A-WORKFLOW-ENGINE.md` §4, tipo "Agente de IA"), para que una cadena de agentes pueda ser un paso dentro de un workflow más grande (ej. "nueva campaña" → cadena de agentes → aprobación → publicación → notificación), en vez de ser un flujo aislado fuera del motor de automatización.

## 2. Delegación de tareas

Hoy: el Marketing Strategist decide qué agente(s) invocar según una regla simple de mapeo (`05-AI-ECOSYSTEM.md` §11) — no cambia. Lo que agrega este documento: esa decisión de delegación puede, en sí misma, ser el resultado de una regla del Business Rules Engine (`09B-BUSINESS-RULES-ENGINE.md`) — por ejemplo, "si la solicitud menciona 'video', delegar también a Video Campaign Advisor" es una condición evaluable por el mismo motor que evalúa cualquier otra regla de negocio, no una lógica de IA separada y opaca.

## 3. Resolución de conflictos

**No aplica en V1** de la misma forma que no aplica en `05B-AI-WORKFLOWS.md`: en un patrón de cadena secuencial, no hay dos agentes actuando simultáneamente sobre el mismo dato, así que no hay conflicto que resolver en tiempo real. Un conflicto solo podría surgir en V3+ (comunicación dinámica entre agentes, `05-AI-ECOSYSTEM.md` §11) — no se diseña la resolución de un problema que la arquitectura actual no puede producir todavía.

## 4. Compartición de contexto

Cada agente en la cadena recibe como entrada el resultado del agente anterior (`05B-AI-WORKFLOWS.md`, diagramas de flujo) — es "paso de contexto por relevo", no una memoria compartida persistente entre agentes. El Workflow Engine es quien transporta ese contexto de un paso al siguiente (`09A-WORKFLOW-ENGINE.md` §4), reutilizando el mismo mecanismo genérico que usaría para pasar el resultado de una acción interna a la siguiente — un agente de IA no requiere una tubería de datos especial distinta a cualquier otra acción del workflow.

## 5. Priorización

Cuando múltiples workflows con pasos de IA se disparan a la vez (varias empresas generando contenido simultáneamente), la priorización es de infraestructura, no de negocio — se resuelve en la cola del Job Scheduler (`09F-JOB-SCHEDULER.md`), con el mismo criterio ya anticipado en `08F-EVENT-ARCHITECTURE.md` §4: eventos con efecto en dinero/acceso antes que informativos. Un paso de IA dentro de un workflow de aprobación de presupuesto, por ejemplo, no tiene hoy una razón de negocio para priorizarse sobre uno de generación de contenido — ambos se procesan en el orden de la cola salvo que surja un caso real que lo justifique.

## 6. Memoria compartida

**[FUTURO], no en V1** — mismo estado ya fijado en `07-ENTERPRISE-DATA-PLATFORM.md` §10 y `05E-AI-MEMORY-AND-CONTEXT.md`: no existe hoy memoria persistente de IA entre invocaciones. Lo que este documento aclara para el contexto de automatización: cuando exista, la memoria de IA seguiría el mismo aislamiento multiempresa que cualquier otro dato (`07H-MULTI-TENANT-DESIGN.md`) — un agente nunca recuerda ni aplica contexto de una empresa a otra, ni siquiera en el caso de `super_admin` operando varias empresas.

## 7. Supervisión humana

No negociable, ya fijado como principio del producto (`PROJECT-BLUEPRINT.md` §5, principio 3) y ahora también como regla dura de toda la plataforma de automatización (`09-ENTERPRISE-AUTOMATION-PLATFORM.md` §1, compromiso 3): cualquier workflow con un paso de IA que termine en un efecto externo (publicación, mensaje a un tercero, gasto) pasa obligatoriamente por el Approval Engine (`09G-APPROVAL-WORKFLOWS.md`) antes de ese efecto — sin excepción configurable por el cliente en la V1. Un `company_admin` no puede desactivar esta pausa de revisión, incluso si quisiera automatización completa — es una decisión de producto deliberada, no una limitación técnica temporal.

## 8. Qué es nuevo en este documento vs. lo ya diseñado

| Ya existía (MDS-006) | Agrega este documento (MDS-010) |
|---|---|
| Patrón de cadena secuencial | Expresarlo como acción del Workflow Engine, reutilizable dentro de cualquier workflow, no solo en el flujo fijo de "nueva campaña" |
| Delegación por regla simple | La regla de delegación puede vivir en el Business Rules Engine, auditable igual que cualquier otra regla |
| Revisión humana antes de publicar | Formalizarla como un paso de Approval Engine reutilizable, no una pantalla especial solo para contenido de IA |

---

## KPIs

Ver `05-AI-ECOSYSTEM.md` §11 (observabilidad de IA: qué agente, qué empresa, éxito/error, costo aproximado) — este documento no agrega KPIs nuevos, hereda esos y agrega uno propio de la capa de orquestación: **% de cadenas de IA que se ejecutan dentro de un workflow formal** (vs. invocación directa fuera del motor de automatización, como es el caso hoy de `generar-calendario`) — señal de adopción de esta plataforma sobre el patrón actual.
