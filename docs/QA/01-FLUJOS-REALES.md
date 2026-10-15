# Flujos reales de MAHP — base para pruebas

> Regla de `mahp-qa-agent`: nunca probar ni reportar sobre un flujo que no esté en esta lista sin antes verificarlo contra el código y agregarlo aquí. Última verificación: contra el código en este repositorio, sesión del sprint Social AI Hub.

| # | Flujo | Estado real | Dónde vive |
|---|---|---|---|
| 1 | Landing page pública | Implementado | `index.html`, `assets/landing.*` |
| 2 | Registro (crear cuenta) | Implementado — crea el usuario en Supabase Auth, pero **sin perfil** hasta que un admin lo invite | `login.html`, `js/login.js` (`crearCuenta`) |
| 3 | Login | Implementado | `login.html`, `js/login.js` (`iniciarSesion`) |
| 4 | Dashboard (resumen) | Implementado, por rol: `empresa.html` (company_admin), `directivo.html` (director), `colaborador.html` (collaborator), `admin.html` (super_admin) | `js/empresa.js`, `js/directivo.js`, etc. |
| 5 | Creación de empresa | Implementado — solo `super_admin`, desde `admin.html` | `admin.html` |
| 6 | Creación de campaña | Implementado | `js/shared/campanias.js` |
| 7 | Creación de actividad | Implementado, vía calendario | `empresa.html` tab Calendario, `js/empresa.js` |
| 8 | Asignación de tarea | Implementado (`assigned_to` en `actividades`) | `js/empresa.js` |
| 9 | Calendario | Implementado (FullCalendar) | `empresa.html` |
| 10 | Seguimiento / avances | Implementado | `js/shared/avances.js`, `js/shared/historialTareas.js` |
| 11 | Reportes / KPIs | Implementado | `js/shared/kpis.js`, `directivo.html` |
| 12 | Usuarios / equipo | Implementado | `js/shared/colaboradores.js`, invitaciones en `admin.html`/`empresa.html` |
| 13 | Roles | Implementado — `super_admin`/`company_admin`/`director`/`collaborator`, enforced por RLS | `DATABASE.md` §`profiles` |
| 14 | Integraciones (IA de contenido) | Implementado — Edge Function `generar-calendario` vía Groq | `js/shared/ia.js` |
| 15 | Social AI Hub | Implementado, **bloqueado en producción**: la app de Meta sigue sin publicar, así que no llegan mensajes reales todavía (solo se puede validar con el usuario de prueba una vez pase App Review) | `js/shared/socialHub.js`, `empresa.html` tab Social Hub |
| 16 | Meta integration (webhook + envío) | Implementado — `meta-webhook` y `meta-send-message` desplegadas y verificadas manualmente (firma HMAC, idempotencia, `company_meta_pages`); entrega real pendiente de App Review | `supabase/functions/meta-webhook/`, `supabase/functions/meta-send-message/` |

**Explícitamente NO implementado** (no probar, no reportar como defecto si "falta"):
- Etiquetado automático de conversaciones por IA (`conversation_tags` existe en el esquema y la UI de confirmar/bloquear está lista, pero `analizarConIA` todavía no crea tags — señalado ya en el sprint).
- Enrutamiento automático de conversaciones por reglas (`ADR-019` lo define, la implementación queda para cuando haya demanda real).
- Vinculación automática de identidades entre canales (`ADR-017`, diferido a `MPS-002-003`).
