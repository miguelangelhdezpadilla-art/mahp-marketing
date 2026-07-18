# ADR-018 — AI Assisted Tagging: etiquetas con niveles de confianza (`Suggested` → `Confirmed` → `Locked`)

Estado: Aceptado
Fecha: 2026-07-12
Decisores: Chief Product Owner

## Contexto

`MPS-002-002-FUNCTIONAL-SPECIFICATION.md` (CU-11, Etiquetar cliente) dejó explícitamente pendiente si el etiquetado de un contacto podía generarse automáticamente por IA o debía ser siempre manual.

## Decisión

Las etiquetas **sí pueden ser sugeridas automáticamente por IA**, pero siguen un ciclo de tres estados: **`Suggested`** (propuesta por IA, sin efecto todavía) → **`Confirmed`** (un humano la validó) → **`Locked`** (etiqueta confirmada que, por su criticidad, no debe removerse casualmente — requiere una acción deliberada adicional para desbloquearse). La IA nunca puede llevar una etiqueta más allá de `Suggested` por sí sola.

## Alternativas consideradas

- **Etiquetado 100% automático, aplicado sin revisión**: se descartó de inmediato — viola directamente Human in the Loop (`ADR-009`) y Explainable AI (`ADR-014`), ambos ya no negociables en toda la plataforma; modificar información de un cliente sin trazabilidad de quién decidió qué es exactamente el riesgo que esos principios existen para prevenir.
- **Etiquetado 100% manual, sin asistencia de IA**: se descartó — renuncia sin necesidad a una capacidad de valor real (detectar patrones que un humano tardaría en notar, ej. "cliente recurrente con quejas"), contradiciendo el principio "AI Assisted" (`MPS-002-001` §3, principio 2) sin que exista un riesgo real que lo justifique, dado que el estado `Suggested` ya es seguro por diseño.

## Consecuencias

**Se gana**: se preserva el beneficio de la IA (detección de patrones, ahorro de tiempo) sin sacrificar el control humano sobre información que puede ser sensible o crítica; cada etiqueta es auditable en su estado exacto (quién la confirmó, cuándo) vía `CCEC-001A`, reforzando RN-03 de `MPS-002-002`.

**Se sacrifica/queda pendiente**: qué categorías de etiqueta ameritan llegar a `Locked` (vs. quedarse en `Confirmed`, removible libremente) es una decisión de configuración por empresa, no resuelta aquí — candidata natural para `MPS-002-003` o para configuración vía el mismo mecanismo ya usado en `10B-SUBSCRIPTION-AND-LICENSING.md` (reglas por plan/empresa). El modelo de datos exacto para representar los tres estados (columna de estado vs. tabla de historial de etiquetas) tampoco se resuelve aquí — es diseño técnico posterior.

## Referencias

`MPS-002-002-FUNCTIONAL-SPECIFICATION.md` §2.4, CU-11; `ADR-009`, `ADR-014`; `CCEC-001A-AUDIT-EVENT-CATALOG.md`.
