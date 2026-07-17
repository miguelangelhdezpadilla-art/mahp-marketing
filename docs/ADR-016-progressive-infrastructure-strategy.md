# ADR-016 — Progressive Infrastructure Strategy: una capacidad documentada como `Designed`/`Planned` no es una inconsistencia

Estado: Aceptado
Fecha: 2026-07-12
Decisores: Chief Product Owner

## Contexto

Al escribir `MES-001-ENGINEERING-CONSTITUTION.md`, el principio "Observability by Default" (§4, principio 11) parecía en tensión con la realidad de `CCEC-004-OBSERVABILITY-PLATFORM.md`: completamente diseñado, sin una sola línea implementada. Sin una decisión explícita, cada futuro documento que encontrara una brecha similar (diseño completo, implementación en cero) tendría que decidir, caso por caso, si eso cuenta como incumplimiento del estándar de ingeniería o como una fase normal del ciclo de vida de una capacidad.

## Decisión

Se adopta una **Progressive Infrastructure Strategy**: cualquier capacidad de MAHP puede documentarse de forma completa y madura en estado `Designed` o `Planned` (`MES-001` §4A, Estados de Madurez Oficiales) sin que eso constituya una inconsistencia, un incumplimiento de principio, o una brecha que penalice la evaluación de calidad del proyecto. La única condición: el estado real debe declararse explícitamente y con honestidad — la inconsistencia no es "estar diseñado sin construir", es **presentar algo como más avanzado de lo que realmente es** (ej. decir `Production` cuando en realidad es `Designed`).

## Alternativas consideradas

- **Tratar todo diseño sin implementación como una brecha a resolver con urgencia**: se descartó — penalizaría exactamente el método que ha hecho de la documentación de MAHP su punto más fuerte (Documentación: 10/10 en `MES-001` §14.1), desincentivando diseñar completo antes de construir.
- **No distinguir entre calidad de diseño y estado de construcción, midiendo todo en un solo puntaje** (el enfoque original de la primera versión de `MES-001`): se descartó directamente por esta decisión del Product Owner — combinar ambos ocultaba tanto la fortaleza real (diseño maduro) como la brecha real (poca construcción) detrás de un número intermedio poco accionable.

## Consecuencias

**Se gana**: el vocabulario de 7 Estados de Madurez (`MES-001` §4A) y las dos métricas separadas (Engineering Maturity / Implementation Maturity, `MES-001` §14) dejan de estar en tensión con los principios de la Constitución — son, de hecho, la expresión directa de este ADR. Un documento como `CCEC-004` puede seguir siendo referencia de excelencia de diseño sin que su falta de implementación se lea como una falla del proyecto.

**Se sacrifica/queda pendiente**: este ADR no resuelve **cuándo** una capacidad debe pasar de `Designed` a construirse — solo establece que estar en `Designed` no es, por sí mismo, un problema. La priorización de qué implementar primero sigue gobernada por el criterio ya vigente en todo `/docs`: demanda real confirmada, no anticipación (`PROJECT-BLUEPRINT.md` §5 principio 5). Existe un riesgo real de que "Progressive Infrastructure Strategy" se use como excusa para nunca implementar — mitigado porque `MES-001` §14.2 (Implementation Maturity) hace ese vacío visible y medible en cada revisión, en vez de dejarlo sin seguimiento.

## Referencias

`MES-001-ENGINEERING-CONSTITUTION.md` §4 (principio 11), §4A, §14, `CCEC-004-OBSERVABILITY-PLATFORM.md`, `CCEC-001-ENTERPRISE-AUDIT-PLATFORM.md`.
