# ADR-014 — Ninguna clasificación, priorización o recomendación de IA se aplica sin un campo de explicación (motivo) visible

Estado: Aceptado
Fecha: 2026-07-12
Decisores: Chief Product Owner

## Contexto

El CIE (`MPS-002-001`) produce salidas de IA que afectan decisiones de negocio reales — a qué conversación responder primero, qué intención se le atribuye a un cliente, qué respuesta se sugiere. Sin un motivo visible, un colaborador solo puede aceptar o rechazar una sugerencia a ciegas, lo que erosiona la confianza en el sistema y dificulta detectar un error del motor antes de que tenga efecto (ej. una queja grave clasificada con prioridad baja).

## Decisión

Toda salida de clasificación, priorización o recomendación del CIE incluye, de forma obligatoria, un campo de explicación breve del factor dominante que la produjo — nunca solo una etiqueta o un número aislado. Es una decisión vinculante para el diseño funcional (`MPS-002-002` en adelante), no solo un principio aspiracional (`MPS-002-001` §3, principio 7, "Explainable AI").

## Alternativas consideradas

- **Explicación opcional, mostrada solo bajo demanda** (ej. un botón "¿por qué?"): se descartó — un colaborador presionado por tiempo no la pediría, y el valor de la explicación es mayor precisamente cuando decide rápido sin cuestionar; hacerla opcional reduciría su uso real a casi cero.
- **Sin explicación, confiar en la precisión del modelo**: se descartó de inmediato — contradice directamente el principio Human in the Loop (`PROJECT-BLUEPRINT.md` §5 principio 3): un humano no puede supervisar de forma real una decisión que no entiende por qué se propuso.

## Consecuencias

**Se gana**: cada sugerencia del CIE es auditable no solo en el sentido de `CCEC-001` (quién vio qué) sino en el sentido de *por qué el motor decidió lo que decidió* — reduce el riesgo de sesgo o error silencioso identificado en `MPS-002-001` §13; facilita que un `company_admin` ajuste manualmente reglas de priorización cuando el motivo mostrado revela un criterio que no le parece correcto para su negocio.

**Se sacrifica/queda pendiente**: el diseño del prompt de análisis IA (etapa 7 del ciclo de vida, `MPS-002-001` §4) debe producir explicación estructurada, no solo la clasificación — esto es una restricción real sobre cómo se diseñará esa llamada de IA en `MPS-002-002`, no una decisión sin costo de implementación.

## Referencias

`MPS-002-001-CONVERSATION-INTELLIGENCE-ENGINE.md` §3 (principio 7), §7, §8, §13.
