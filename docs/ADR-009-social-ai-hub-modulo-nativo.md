# ADR-009 — Social AI Hub es un módulo nativo del ecosistema MAHP, no un componente aislado

Estado: Aceptado
Fecha: 2026-07-12
Decisores: Chief Product Owner

## Contexto

Al diseñar `MEM-002-001-SOCIAL-AI-HUB-VISION.md`, existían dos formas de posicionar el nuevo módulo: como una integración de mensajería que MAHP simplemente añade a su catálogo (mismo estatus que cualquier adaptador de `08C-INTEGRATIONS-CATALOG.md`), o como una extensión nativa que se integra formalmente con capacidades centrales ya existentes — específicamente, el agente de IA Community Manager Advisor (`05A-AI-AGENTS.md` #11), que desde su diseño original en MDS-006 ya declaraba depender de una integración de mensajería que no existía.

## Decisión

Social AI Hub **es** el módulo del que depende Community Manager Advisor — no un módulo aparte que además lo beneficia de paso. Esta relación es oficial y bidireccional: `05A-AI-AGENTS.md` #11 fue actualizado para referenciar `MEM-002-001` como su módulo de integración, y `MEM-002-001` referencia a Community Manager Advisor como su punto de activación de IA, no como una capacidad genérica añadida después.

## Alternativas consideradas

- **Social AI Hub como integración aislada** (mismo estatus que un adaptador de Stripe o Google Analytics, `08C-INTEGRATIONS-CATALOG.md`): más simple de enmarcar, pero desconecta el módulo del resto del ecosistema de IA (`05-AI-ECOSYSTEM.md`) y del motor de automatización (`09-*`) — trataría como opcional/periférico algo que en realidad resuelve una dependencia ya declarada de un agente central.
- **Reemplazar Community Manager Advisor por un agente nuevo específico de Social AI Hub**: se descartó — el agente ya está diseñado, catalogado, y su objetivo ("asesor, no ejecutor") sigue siendo exactamente correcto para el nuevo contexto; no había ninguna razón de diseño para duplicarlo.

## Consecuencias

**Se gana**: coherencia entre lo ya diseñado (MDS-006) y lo nuevo (MEM-002-001) — un agente que llevaba diseñado desde MDS-006 sin poder cumplir su función encuentra, en este módulo, la pieza que le faltaba, en vez de que ambos evolucionen por separado. Reduce el riesgo de que un futuro documento proponga "otro" agente de mensajería sin saber que ya existe uno esperando esta integración.

**Se sacrifica/queda pendiente**: Social AI Hub hereda las mismas restricciones no negociables de todo agente de IA en MAHP (`PROJECT-BLUEPRINT.md` §5, principio 3) — Community Manager Advisor sigue siendo asesor, nunca ejecutor automático sin supervisión, incluso con acceso a conversaciones reales; cualquier ambición de automatización completa (casos de uso 47–50 de `MEM-002-001` §7) debe respetar ese límite, no es una vía para relajarlo.

## Referencias

`MEM-002-001-SOCIAL-AI-HUB-VISION.md`, `05A-AI-AGENTS.md` #11, `05-AI-ECOSYSTEM.md` §11 (patrón de orquestación), `PROJECT-BLUEPRINT.md` §5 principio 3, `ADR-007` (mismo principio de proxy/supervisión aplicado a IA), `ADR-008` (mismo principio de adaptador aislado por proveedor, aplicado al canal de Meta Graph API específicamente, no al módulo en su conjunto).
