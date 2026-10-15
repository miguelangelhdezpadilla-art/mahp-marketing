# Criterios de auditoría UX

Usado por `mahp-ux-agent` para cada flujo de `docs/QA/01-FLUJOS-REALES.md`. Responder las 6 preguntas explícitamente, no en general.

1. **Discoverability** — ¿el usuario entiende qué puede hacer sin explicación externa?
2. **Navigation** — ¿puede llegar al siguiente paso sin perderse?
3. **Feedback** — ¿el sistema comunica lo que está pasando (loading, éxito, error)? MAHP ya tiene `showToast`/`showConfirm`/`showInfo` en `js/ui.js` — un flujo nuevo que no los use es un hallazgo.
4. **Error handling** — ¿los mensajes de error explican cómo resolver el problema, o son genéricos?
5. **Consistency** — ¿este componente se ve/comporta como su equivalente ya construido? (`docs/04B-COMPONENT-LIBRARY.md`, `docs/04-DESIGN-SYSTEM.md`)
6. **Accessibility** — labels en formularios, navegación por teclado, foco visible, contraste, mensajes de error asociados al campo.
7. **Responsive** — mínimo desktop (~1440px) / tablet (~768px) / mobile (~375px). Requiere automatización de navegador (Fase 2); sin ella, revisar los `@media` existentes en `assets/styles.css` como sustituto parcial, dejándolo explícito en el reporte.

No declarar "correcto" solo porque una prueba técnica pasó — un test verde no es evidencia de buena UX.
