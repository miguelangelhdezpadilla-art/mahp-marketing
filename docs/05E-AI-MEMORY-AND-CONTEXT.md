# AI MEMORY AND CONTEXT — Estrategia de Memoria del Ecosistema

> MDS-006, Documento 6 de 6. **100% diseño futuro — hoy no existe memoria
> de ningún tipo.** Cada llamada a Calendar Planner empieza desde cero, sin
> recordar generaciones anteriores (limitación ya documentada en `IA.md` §6).
> Este documento define cómo debería funcionar la memoria cuando se priorice,
> sin implicar que ya está construida.
>
> Última actualización: 2026-07-09.

---

## 1. Contexto del Usuario

Qué debería saber cualquier agente sobre quién lo invoca: rol (`super_admin`/`company_admin`/`director`/`collaborator`), nombre, y nada más de forma persistente — ningún dato personal adicional se retiene entre sesiones sin necesidad concreta. El contexto de usuario se reconstruye en cada invocación a partir de `profiles` (fuente de verdad ya existente), nunca se duplica en un almacén de memoria separado.

## 2. Contexto de Empresa

Nombre, giro (cuando exista ese campo — ver `ROADMAP.md`, categorías personalizables), y canales activos (`social_channels`). Igual que el contexto de usuario, se lee de las tablas reales en cada invocación — la "memoria de empresa" no es un caché separado que pueda desincronizarse de la base de datos real.

## 3. Contexto de Campañas

La campaña activa (si la invocación ocurre dentro de una), sus objetivos (`kpis`), y campañas anteriores relevantes por similitud (ej. Campaign Planner consultando campañas pasadas del mismo tipo antes de proponer una nueva, `05A-AI-AGENTS.md` agente 2). Ventana de "campañas anteriores relevantes" propuesta: últimas 5–10 campañas cerradas de esa empresa, no el historial completo — control de costo de contexto (tokens) además de relevancia.

## 4. Historial

**Memoria persistente real [FUTURO]**: qué generó cada agente antes para esa empresa, y qué de eso se aceptó/rechazó/editó. Es la pieza que permitiría el horizonte de 10 años de `01-IDENTIDAD-DEL-PRODUCTO.md` §4 ("la IA aprende de qué ha funcionado específicamente para cada empresa"). Diseño conceptual de tabla: `ai_interactions` (`id`, `company_id`, `agent`, `input_summary`, `output_summary`, `accepted boolean`, `created_at`) — un registro liviano, no el prompt/respuesta completos (por costo de almacenamiento y por minimización de datos, `05C-AI-GOVERNANCE.md` §2).

## 5. Preferencias

Ajustes explícitos que una empresa/usuario haya dado sobre cómo prefiere que la IA se comporte (ej. "prefiero copy más formal", "nunca sugieras promociones con descuento"). No existe hoy ningún mecanismo para capturar esto. Diseño propuesto: extensión de la tabla de historial (§4) o una tabla `ai_preferences` (`company_id`, `preference_key`, `preference_value`) — consultada como parte del contexto en cada invocación de agentes de contenido/estrategia.

## 6. Permisos

La memoria nunca otorga acceso más allá de lo que RLS ya permitiría al usuario que invoca al agente — un agente no puede "recordar" para un `collaborator` datos de una campaña que ese colaborador no tendría permiso de ver directamente. Mismo principio de `05-AI-ECOSYSTEM.md` §5 aplicado específicamente a memoria persistente.

## 7. Memoria Temporal

Contexto que solo vive durante una sesión de interacción (ej. dentro de un flujo multi-paso del Marketing Strategist, `05-AI-ECOSYSTEM.md` §11 — el resultado de Campaign Planner pasa como contexto temporal a Calendar Planner en la misma solicitud, pero no se guarda más allá de esa cadena). No requiere una tabla nueva — vive en memoria de la Edge Function mientras dura la orquestación, se descarta al terminar.

## 8. Memoria Persistente

Ver §4 (historial) y §5 (preferencias) — las dos únicas categorías de memoria persistente propuestas en este documento. Deliberadamente acotado: no se propone que los agentes "recuerden" conversaciones completas o datos no estructurados de forma abierta — toda memoria persistente tiene un esquema definido, consistente con el resto de la arquitectura de datos de MAHP (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §9).

## 9. Resumen de Conversaciones

Solo aplica a partir de que exista el Marketing Strategist conversacional (`05-AI-ECOSYSTEM.md` §9, horizonte a 5 años) — hasta entonces, cada agente responde a una solicitud puntual sin "conversación" que resumir. Diseño para cuando aplique: un resumen corto (no la transcripción completa) se guarda como parte del historial (§4) si la interacción resultó en una acción real (contenido publicado, campaña creada) — interacciones descartadas no generan un resumen persistente.

## 10. Control de Acceso

La memoria de una empresa es tan privada como cualquier otro dato de esa empresa — RLS por `company_id` aplica a cualquier tabla de memoria futura (`ai_interactions`, `ai_preferences`) exactamente igual que a `actividades` o `campaigns`. Ningún agente global "aprende" de forma que mezcle datos entre empresas (`05C-AI-GOVERNANCE.md` §2) — la memoria es siempre por-empresa, nunca un modelo entrenado sobre el conjunto de todos los clientes de MAHP sin anonimización y consentimiento explícito (fuera de alcance de este documento, requeriría su propia revisión de gobernanza si se propusiera).

## 11. Caducidad de Información

- **Memoria temporal (§7)**: caduca al terminar la invocación/cadena de orquestación — nunca sobrevive más allá de una sola solicitud del usuario.
- **Historial (§4)**: sin caducidad automática propuesta — es un registro liviano (resúmenes, no datos completos), de bajo costo de almacenamiento, y su valor (aprendizaje de qué funciona) aumenta con el tiempo, no disminuye.
- **Preferencias (§5)**: persisten hasta que el usuario las cambie explícitamente — nunca expiran solas, porque una preferencia no declarada obsoleta seguiría siendo válida indefinidamente para el usuario que la estableció.
- **Principio general**: ante la duda entre guardar más o guardar menos, se guarda menos (`05C-AI-GOVERNANCE.md` §9, minimización de datos) — la memoria de MAHP se diseña para ser útil, no exhaustiva.
