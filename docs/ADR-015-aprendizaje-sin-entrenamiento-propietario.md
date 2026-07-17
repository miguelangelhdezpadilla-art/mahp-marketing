# ADR-015 — El Motor de Aprendizaje del CIE no entrena modelos propietarios; mejora por ajuste humano de reglas y prompts

Estado: Aceptado
Fecha: 2026-07-12
Decisores: Chief Product Owner

## Contexto

`MPS-002-001` §9 (Motor de Aprendizaje) pedía diseñar "mejora continua" a partir de resultados de conversación, aceptación/rechazo de sugerencias, tiempo de resolución y satisfacción — un requerimiento que, sin acotar, es ambiguo entre dos caminos muy distintos: (a) reentrenar o afinar (fine-tune) un modelo de IA propio con esos datos, o (b) usar esos datos como insumo para que humanos ajusten reglas, umbrales y prompts existentes.

## Decisión

El Motor de Aprendizaje **no entrena ni afina modelos de IA propietarios de MAHP**. "Aprendizaje continuo" significa: se captura retroalimentación estructurada (etapa 14 del ciclo de vida, `MPS-002-001` §4) y se pone a disposición de un humano (`company_admin`, o en el futuro un agente de análisis como Customer Experience Advisor, `05A-AI-AGENTS.md` #13) para ajustar manualmente pesos de priorización (`MPS-002-001` §8), reglas de clasificación, o el prompt de análisis IA (etapa 7) — el modelo subyacente (Groq u otro proveedor, `ADR-007`) sigue siendo un modelo de propósito general consultado por prompt, sin cambio de esa arquitectura.

## Alternativas consideradas

- **Fine-tuning de un modelo propio con datos de conversación de cada empresa**: se descartó — introduce costo, complejidad de infraestructura de ML (entrenamiento, versionado de modelos, evaluación) que ningún documento previo de MAHP ha decidido asumir (`05-AI-ECOSYSTEM.md` no lo contempla), y además complica gravemente el aislamiento multiempresa (`07H-MULTI-TENANT-DESIGN.md`) — un modelo entrenado con datos de una empresa no debe filtrar comportamiento hacia otra.
- **Aprendizaje por refuerzo automático de los pesos de priorización sin intervención humana**: se descartó — ajustar automáticamente qué se prioriza más, sin que un humano lo revise, viola directamente el principio Human in the Loop aplicado no solo a respuestas individuales sino a la configuración misma del sistema.

## Consecuencias

**Se gana**: el "aprendizaje" del CIE es explicable y auditable en el mismo sentido que sus recomendaciones (`ADR-014`) — un ajuste de regla lo hizo una persona identificable, no un proceso opaco de reentrenamiento; evita un costo de infraestructura de ML no presupuestado ni decidido; mantiene el aislamiento multiempresa sin el riesgo adicional que introduciría un modelo entrenado con datos mezclados o por separado.

**Se sacrifica/queda pendiente**: la mejora del sistema depende de que alguien (humano) efectivamente revise la retroalimentación capturada y ajuste — sin ese proceso activo, los datos de la etapa 14 se acumulan sin generar mejora real. `MPS-002-002` debería considerar qué tan fácil se hace ese ajuste (¿requiere editar configuración técnica, o existe una interfaz simple?), sin que este ADR lo resuelva.

## Referencias

`MPS-002-001-CONVERSATION-INTELLIGENCE-ENGINE.md` §9, `05-AI-ECOSYSTEM.md`, `05A-AI-AGENTS.md` #13, `ADR-007`, `07H-MULTI-TENANT-DESIGN.md`.
