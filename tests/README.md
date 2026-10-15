# Tests — estado real

Actualizado en la Fase 2 (Browser & Visual QA).

- **Node v24.19.0 + Playwright `@playwright/test` instalados** (`package.json`, solo dev tooling — la app publicada sigue siendo HTML/JS plano sin bundler, `ADR-003`). Chromium descargado localmente.
- `playwright.config.js` en la raíz: levanta el servidor local (`python -m http.server 8765`) automáticamente, 3 proyectos (`desktop` 1440px, `tablet`, `mobile`) para cubrir el criterio "Responsive" de `docs/UX/00-CRITERIOS-AUDITORIA.md`.
- `e2e/login.spec.js` — **primer test real, corrido y en verde** (`npx playwright test`, 2 passed): renderizado del formulario + caso borde de credenciales inválidas. Cubre el flujo #3 de `docs/QA/01-FLUJOS-REALES.md`.
- `visual/` — pendiente: falta la primera baseline de screenshots (`mahp-visual-auditor`).
- `accessibility/` — pendiente: falta integrar axe-core (no instalado todavía, se agrega cuando haga falta, no por anticipación).
- `regression/` — pendiente: se llena a medida que existan más E2E que valga la pena volver a correr como red de seguridad.

Comando para correr todo: `npx playwright test` (desde la raíz del proyecto, con Node en el PATH). Reporte HTML en `playwright-report/` tras cada corrida.
