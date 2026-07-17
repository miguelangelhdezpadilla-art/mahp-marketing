# ADR-013 — El Conversation Intelligence Engine es una cadena de eventos sobre el motor de workflows existente, no un motor de IA/reglas independiente

Estado: Aceptado
Fecha: 2026-07-12
Decisores: Chief Product Owner

## Contexto

Al diseñar `MPS-002-001-CONVERSATION-INTELLIGENCE-ENGINE.md`, el CIE necesitaba clasificar, priorizar, recomendar y activar automatizaciones a partir de conversaciones — funcionalidad con superficie suficiente para, mal diseñada, terminar como un segundo motor de reglas y eventos específico de Social AI Hub, en paralelo al ya construido para toda la plataforma (`09A-WORKFLOW-ENGINE.md`, `09B-BUSINESS-RULES-ENGINE.md`, `08F-EVENT-ARCHITECTURE.md`).

## Decisión

El CIE se implementa como una secuencia de eventos (`ConversationReceived`, `BusinessIntentDetected`, `ConversationAssigned`, etc. — catálogo completo en `MPS-002-001` §10) que consume el Business Rules Engine y el Workflow Engine ya existentes para decidir y ejecutar acciones. El CIE no tiene su propia cola, su propio motor de reglas, ni su propio mecanismo de reintentos — reutiliza `automation_queue`/`pg_cron` (`ADR-008`) y el catálogo de eventos ya existente (`09C-EVENT-CATALOG.md`), extendiéndolo con los eventos nuevos de conversación en vez de crear un catálogo paralelo.

## Alternativas consideradas

- **Motor de reglas propio para conversaciones** (dado que sus condiciones — intención, sentimiento, prioridad — son distintas a las de una automatización de marketing genérica): se descartó porque el Business Rules Engine ya es genérico por diseño (`09B` §1: "SI ocurre evento Y condiciones ENTONCES acción", sin asumir el dominio del evento) — no había necesidad real de un motor distinto, solo de un catálogo de eventos y condiciones nuevo, que sí es apropiado agregar.
- **Cola de eventos dedicada para el CIE** (separada de `automation_queue`), argumentando que el volumen de conversaciones podría ser distinto al de automatizaciones de marketing: se descartó por prematuro — no hay evidencia de volumen real todavía, y crear una segunda cola contradice directamente el principio ya establecido en `ADR-008` de una sola infraestructura de cola para toda la plataforma hasta que el volumen real la haga insuficiente.

## Consecuencias

**Se gana**: ninguna duplicación de infraestructura — el CIE hereda automáticamente cualquier mejora futura del Workflow Engine (ej. si se agrega mejor manejo de errores en `09A`, el CIE se beneficia sin cambio propio); el catálogo de eventos permanece como una sola fuente de verdad (`09C-EVENT-CATALOG.md` extendido, no un catálogo nuevo).

**Se sacrifica/queda pendiente**: si el volumen real de conversaciones eventualmente supera lo que la cola compartida puede sostener (`ADR-008`, límite ya reconocido), el CIE no tiene infraestructura propia a la que recurrir de forma aislada — compartiría el mismo cuello de botella que cualquier otro consumidor de la cola, decisión aceptada conscientemente en vez de sobre-diseñar para un volumen no confirmado.

## Referencias

`MPS-002-001-CONVERSATION-INTELLIGENCE-ENGINE.md` §1/§3 (principio 1)/§10, `09A-WORKFLOW-ENGINE.md`, `09B-BUSINESS-RULES-ENGINE.md`, `08F-EVENT-ARCHITECTURE.md` §3, `ADR-008`.
