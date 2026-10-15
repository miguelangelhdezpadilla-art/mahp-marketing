# Índice de agentes MAHP

Definiciones reales (invocables por el Agent tool de Claude Code) en `.claude/agents/`. Esta tabla es solo el mapa — la fuente de verdad de cada rol vive en su propio archivo `.md`.

| Agente | Nivel | Rol | Archivo |
|---|---|---|---|
| mahp-architect | 1 — OBSERVE | Arquitectura, dependencias, impacto de cambios | `.claude/agents/mahp-architect.md` |
| mahp-developer | 2 — DEVELOP | Implementación, refactor, corrección | `.claude/agents/mahp-developer.md` |
| mahp-qa-agent | 1 — OBSERVE | Pruebas funcionales, regresión | `.claude/agents/mahp-qa-agent.md` |
| mahp-ux-agent | 1 — OBSERVE | Experiencia de usuario | `.claude/agents/mahp-ux-agent.md` |
| mahp-visual-auditor | 1 — OBSERVE | Interfaz, responsive, visual | `.claude/agents/mahp-visual-auditor.md` |
| mahp-security-auditor | 1 — OBSERVE | Secretos, permisos, vulnerabilidades | `.claude/agents/mahp-security-auditor.md` |
| mahp-documentation-agent | 2 — DEVELOP | Documentación, changelog, trazabilidad | `.claude/agents/mahp-documentation-agent.md` |
| mahp-orchestrator | — (política) | Orden de dispatch, cuándo detenerse | `.claude/agents/mahp-orchestrator.md` |

Nota honesta sobre `mahp-orchestrator`: en este harness los subagentes no invocan a otros subagentes — quien orquesta de verdad es la sesión principal de Claude Code, usando el Agent tool para llamar a los demás. Ese archivo es la política que la sesión principal sigue, no un octavo agente invocable de la misma forma que los otros siete.

Ver `docs/AGENTS/01-NIVELES-DE-PERMISO.md` para qué puede hacer cada nivel, y `docs/OPERATIONS/00-CICLO-DE-TAREA.md` para el flujo completo de una tarea.
