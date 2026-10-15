# Architecture — índice, no duplicado

Esta carpeta existe porque el prompt de QA/agentes la pide explícitamente, pero **no duplica** la documentación de arquitectura que ya existe — ese contenido ya está gobernado por su propia serie, con su propia regla de "un ADR nunca se edita para cambiar la decisión". Crear una segunda copia aquí fragmentaría la fuente de verdad.

Para arquitectura real, usa:

- **Visión general del sistema**: `docs/02-ENTERPRISE-SYSTEM-ARCHITECTURE.md`
- **Estándares de ingeniería (máxima autoridad técnica)**: `docs/MES-001-ENGINEERING-CONSTITUTION.md`
- **Decisiones arquitectónicas (el porqué)**: `docs/ADR-INDEX.md` y los `ADR-001`...`ADR-020`
- **Modelo de datos**: `docs/07A-DOMAIN-MODEL.md`, `docs/DATABASE.md`
- **Estándares de base de datos**: `docs/07C-DATABASE-STANDARDS.md`
- **Capacidades transversales (audit, observability, privacidad)**: `docs/CCEC-001`, `CCEC-004`, `CCEC-005`
- **Integración con Meta**: `docs/MIP-001-META-GRAPH-API-INTEGRATION.md`
- **Reglas operativas para cualquier IA que trabaje en este repo**: `docs/CLAUDE.md`

`mahp-architect` lee de ahí, no de aquí. Esta carpeta solo queda como el punto de entrada que el prompt de agentes esperaba encontrar.
