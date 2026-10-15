# Ciclo de una tarea autónoma en MAHP

```
TASK → ANALYZE → PLAN → IMPLEMENT → TEST → BROWSER VALIDATION →
DETECT PROBLEMS → FIX → RETEST → DOCUMENT → REPORT
```

Una tarea no se declara terminada porque "el código se ve correcto". Está terminada cuando:

```
CODE + TESTS + BROWSER + UX + REGRESSION + DOCUMENTATION
```

se validaron en la medida que el entorno lo permita — y si el entorno no lo permite (ej. sin navegador todavía en Fase 1), **se declara explícitamente qué no se pudo validar**, no se asume que pasó.

## Pasos

1. **Entender la tarea** — si es ambigua en alcance o decisión de negocio, preguntar antes de plan.
2. **Localizar código relevante** — nunca asumir, verificar contra el repo real.
3. **Identificar dependencias** — qué otros módulos/tablas toca.
4. **Plan** — qué agente(s) intervienen y en qué orden (`docs/AGENTS/mahp-orchestrator.md`... ver `.claude/agents/mahp-orchestrator.md`).
5. **Implementar** (`mahp-developer`).
6. **Ejecutar tests** — si existen (Fase 2 en adelante).
7. **Abrir la aplicación** — servidor local (`python -m http.server` en la raíz del proyecto).
8. **Probar como usuario** (`mahp-qa-agent`, `mahp-ux-agent`, `mahp-visual-auditor`).
9. **Detectar errores** — reportar con `docs/QA/00-PLANTILLA-DEFECTO.md`.
10. **Corregir** — solo si el nivel de permiso lo permite (`docs/AGENTS/01-NIVELES-DE-PERMISO.md`).
11. **Volver a probar** — nunca asumir que la corrección funcionó sin repetir el paso 8.
12. **Regresión** — confirmar que no se rompió algo que ya funcionaba (`docs/QA/01-FLUJOS-REALES.md`).
13. **Documentar** (`mahp-documentation-agent`) — `docs/CHANGELOG.md` + el doc del módulo tocado, en el mismo cambio.
14. **Reporte final** — qué se hizo, qué falta, qué no se pudo validar y por qué.

## Git

- Antes de cambios importantes: `git status`, confirmar branch, no sobrescribir trabajo humano sin investigar primero.
- Después de cambios: mostrar archivos modificados, explicar el porqué, ejecutar tests si existen.
- **Nunca** `git commit` ni `git push` automáticos — LEVEL 4, siempre requiere que el usuario lo pida explícitamente (regla ya vigente en este proyecto desde antes de esta iniciativa de agentes).

## Principio de seguridad

Ante cualquier acción de alto riesgo (ver LEVEL 4 en `docs/AGENTS/01-NIVELES-DE-PERMISO.md`):

**DETENERSE → EXPLICAR → SOLICITAR AUTORIZACIÓN.**

Nunca: borrar archivos importantes sin confirmar, eliminar datos, ejecutar comandos destructivos sin autorización, revelar secretos (ni imprimir API keys/passwords, ni parcialmente), modificar producción sin decirlo, o correr migraciones destructivas automáticamente.
