# ADR-019 — Intelligent Conversation Routing: la transferencia automática se basa en reglas de negocio, nunca solo en inactividad

Estado: Aceptado
Fecha: 2026-07-12
Decisores: Chief Product Owner

## Contexto

`MPS-002-002-FUNCTIONAL-SPECIFICATION.md` (CU-06, Transferir conversación) dejó explícitamente pendiente si el sistema debía sugerir/ejecutar una transferencia automática cuando el colaborador asignado estuviera inactivo.

## Decisión

La transferencia automática de una conversación **nunca se dispara únicamente por tiempo de inactividad**. Se basa en un motor de reglas que evalúa, en conjunto: horario laboral del colaborador, su disponibilidad (vacaciones/ausencia), SLA de la conversación, prioridad (`MPS-002-001` §8), carga de trabajo actual del colaborador, existencia de una cola/rol disponible al que transferir, y el supervisor responsable. Esto reutiliza el Business Rules Engine ya existente (`09B-BUSINESS-RULES-ENGINE.md`), consistente con `ADR-013` (el CIE es una cadena de eventos sobre el motor ya existente, no uno propio) y con el principio "Configuration over Customization" (`MES-001` §4, principio 19).

## Alternativas consideradas

- **Transferencia automática por timeout simple** (ej. "5 minutos sin respuesta → transferir"): se descartó — es una señal insuficiente por sí sola; un colaborador puede estar atendiendo otra conversación urgente, o el timeout puede ser inapropiado fuera de horario laboral, generando transferencias erráticas que dañan la experiencia del cliente en vez de mejorarla.
- **Transferencia siempre manual**: se descartó — renuncia a reducir tiempo de respuesta (objetivo central del módulo, `MEM-002-001` §3) en el escenario exacto donde más se necesita automatización: cuando el responsable original no puede atender.

## Consecuencias

**Se gana**: enrutamiento realista que refleja cómo opera un equipo real (horarios, SLA, prioridad), no una heurística ingenua; reutiliza infraestructura ya construida en vez de crear un motor de reglas propio para este caso — mismo ahorro de complejidad que `ADR-013` ya validó para el resto del CIE.

**Se sacrifica/queda pendiente**: el motor de reglas necesita datos que **no existen todavía como concepto en MAHP** — `profiles` no tiene hoy campos de horario laboral, vacaciones, ni carga de trabajo actual. Este ADR fija el principio de enrutamiento inteligente; el modelo de datos que lo hace posible es una brecha nueva identificada aquí, no resuelta, candidata directa para `MPS-002-003` o una extensión de `07A-DOMAIN-MODEL.md` (dominio Core/Usuarios).

## Referencias

`MPS-002-002-FUNCTIONAL-SPECIFICATION.md` §2.3, CU-06; `09B-BUSINESS-RULES-ENGINE.md`; `ADR-013`; `MES-001-ENGINEERING-CONSTITUTION.md` §4 (principio 19); `07A-DOMAIN-MODEL.md` §2 (Usuarios, gap de datos identificado).
