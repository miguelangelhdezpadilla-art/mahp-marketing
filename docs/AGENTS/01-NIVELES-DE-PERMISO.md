# Niveles de permiso de los agentes MAHP

## LEVEL 1 — OBSERVE
Puede: leer, analizar, ejecutar pruebas de solo-lectura, navegar (cuando haya navegador disponible), tomar screenshots, revisar logs.
No puede: modificar código.
Agentes en este nivel: `mahp-architect`, `mahp-qa-agent` (analiza y reporta, no corrige), `mahp-ux-agent`, `mahp-visual-auditor`, `mahp-security-auditor`.

## LEVEL 2 — DEVELOP
Puede: modificar código, crear archivos, ejecutar tests, corregir errores ya identificados.
Agente en este nivel: `mahp-developer`, `mahp-documentation-agent`.

## LEVEL 3 — AUTONOMOUS
Puede ejecutar el ciclo completo (`docs/OPERATIONS/00-CICLO-DE-TAREA.md`) de punta a punta para una tarea bien acotada y de bajo riesgo, sin pausar entre pasos — pero **nunca** se salta las paradas obligatorias de LEVEL 4.

## LEVEL 4 — SYSTEM
**No se habilita automáticamente. Requiere autorización humana explícita, caso por caso.**

Acciones que siempre son LEVEL 4 en MAHP, sin excepción:
- `git commit` / `git push`.
- Cualquier ejecución directa contra el Supabase real del usuario (SQL Editor, Management API, `supabase db push`) — la excepción ya validada de usar la CLI de Supabase directamente solo aplica cuando el usuario ya autenticó esa sesión y lo pidió para esa tarea puntual.
- Borrar archivos, tablas, o datos existentes.
- Migraciones que alteran (no solo agregan) datos ya existentes.
- Instalar dependencias/runtimes nuevos en el entorno (ej. Node, Playwright) — se explica qué se va a instalar y para qué antes de hacerlo.
- Revocar o rotar secretos.
- Publicar o modificar algo visible externamente (la app de Meta, un PR, un mensaje enviado a un cliente real).

Si una tarea requiere un paso LEVEL 4: **DETENERSE → EXPLICAR → SOLICITAR AUTORIZACIÓN**, nunca asumir que el permiso de una tarea anterior se extiende a esta.
