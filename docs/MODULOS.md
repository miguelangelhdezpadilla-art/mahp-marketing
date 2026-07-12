# MÓDULOS — Marketing Activity Hub Pro

> Capítulo 18 del `PROJECT-BLUEPRINT.md`. Inventario de módulos construidos en
> el producto operativo (la landing pública se trata aparte, brevemente, en
> el capítulo 17 — Ecosistema MAHP).
>
> Última actualización: 2026-07-08.

---

## Tabla resumen

| # | Módulo | Archivo(s) principal(es) | Roles con acceso | Estado |
|---|---|---|---|---|
| 1 | Autenticación y sesión | `login.html`, `js/login.js`, `js/supabaseClient.js` | Todos | ✅ |
| 2 | Gestión de empresas (Super Admin) | `admin.html`, `js/admin.js` | `super_admin` | ✅ |
| 3 | Sistema de invitaciones | `js/admin.js`, `js/empresa.js` | `super_admin`, `company_admin` | ✅ |
| 4 | Revocación / restauración de acceso | `js/admin.js`, `js/empresa.js` | `super_admin`, `company_admin` | ✅ |
| 5 | Auditoría de eventos | `js/admin.js` | `super_admin` | ✅ |
| 6 | Dashboard / resumen ejecutivo | `js/shared/dashboard.js` | `company_admin`, `director` | ✅ |
| 7 | Calendario de actividades (admin) | `js/empresa.js` | `company_admin`, `super_admin` (vía impersonación) | ✅ |
| 8 | Calendario del colaborador | `js/colaborador.js` | `collaborator` | ✅ |
| 9 | Calendario del director (solo lectura) | `js/directivo.js` | `director` | ✅ |
| 10 | Campañas y objetivos (KPIs) | `js/shared/campanias.js`, `js/shared/kpis.js` | `company_admin`, `director` | ✅ |
| 11 | Reporte de avance de tareas | `js/colaborador.js`, `js/shared/detalleTarea.js` | `collaborator` (escribe), resto (lee) | ✅ |
| 12 | Completar tarea | `js/colaborador.js` | `collaborator` | ✅ |
| 13 | Evidencias (imagen/video) | `js/shared/evidencias.js` | `collaborator` (sube), resto (ve) | ✅ |
| 14 | Historial de tareas completadas | `js/shared/historialTareas.js` | `company_admin`, `director` | ✅ |
| 15 | Estrategias directivas | `js/shared/estrategias.js` | `company_admin` (publica), resto (lee) | ✅ |
| 16 | Seguidores por canal | `js/shared/seguidores.js` | `company_admin`, `director` | ✅ |
| 17 | Metas de seguidores | `js/shared/metasSeguidores.js` | `company_admin`, `director` (config.), `collaborator` (ve avance) | ✅ |
| 18 | Tabla de avances (empresa) | `js/shared/avances.js` | `company_admin`, `director` | ✅ |
| 19 | Gamificación (puntos y ranking) | `js/shared/gamificacion.js` | `company_admin`, `director` | ✅ |
| 20 | Notificaciones in-app | `js/ui.js` (`configurarNotificaciones`) | Todos los roles con sesión | ✅ |
| 21 | Generación de calendario con IA | `js/shared/ia.js` + Edge Function `generar-calendario` | `company_admin` | ✅ |
| 22 | Asignación masiva/individual de actividades | `js/empresa.js` | `company_admin` | ✅ |
| — | Adjuntos de archivo en propuestas | — | — | ⚪ Diseñado, no construido |
| — | Propuestas formales de calendario (Super Admin → empresa) | — | — | ⚪ Diseñado, no construido |
| — | Categorías de actividad personalizables por empresa | — | — | ⚪ Pendiente de decisión |

---

## Detalle por módulo

### 1. Autenticación y sesión
Login/signup con Supabase Auth (`login.html`). Al autenticar, `irADashboard()` consulta `profiles.role` y redirige con `roleHome(role)`. Cada página protegida llama `requireSession(rolesPermitidos)` (`js/supabaseClient.js`), que valida sesión + perfil + rol, y redirige si no corresponde. `resolveCompanyId()`/`resolveUserId()` resuelven a qué empresa/usuario aplica la página según el rol (el `super_admin` los toma de `?company_id=`/`?user_id=` en la URL).

### 2–5. Panel Super Admin
`admin.html`/`js/admin.js`, 4 pestañas: **Empresas** (crear, listar, enlace directo a "Ver panel operativo"), **Invitaciones** (invitar el primer `company_admin` de una empresa), **Usuarios** (listado global con botón Revocar/Restaurar acceso, editando `profiles.active`), **Actividad** (lectura de `audit_log`, alimentado por triggers — nunca por el cliente directamente).

### 6. Dashboard / resumen ejecutivo
`renderizarResumen()` (`js/shared/dashboard.js`) — 4 tarjetas: actividades de hoy, % de cumplimiento (semáforo verde ≥90% / ámbar ≥70% / rojo <70%), campañas activas, colaboradores activos. Compartido entre `empresa.js` y `directivo.js`.

### 7–9. Calendarios
Los 3 calendarios (admin, colaborador, director) usan FullCalendar sobre la misma tabla `actividades`, filtrada distinto por rol:
- **Admin** (`empresa.html`): ve toda la empresa, `editable: true` (drag & drop cambia `fecha`), colorea por categoría y agrega borde naranja si `status = 'en_progreso'`. "Eliminar" una actividad (opción del clic en evento) es un **soft delete** desde `supabase_schema_v16.sql` — pone `deleted_at`, no borra la fila; el borrado físico quedó exclusivo de `super_admin` vía SQL Editor, sin botón en la interfaz.
- **Colaborador** (`colaborador.html`): solo `assigned_to = su usuario`, editable (puede reprogramar sus propias tareas), colorea por estado (gris/ámbar/verde).
- **Director** (`directivo.html`): toda la empresa, `editable: false` — vista de solo lectura, mismo esquema de color que el admin.

### 10. Campañas y objetivos
`toggleCampania()`/`cargarDetalleCampania()` (`js/shared/campanias.js`) expanden una fila de campaña mostrando sus objetivos (`kpis` filtrados por `campaign_id`, vía `js/shared/kpis.js`) y sus actividades relacionadas. El formulario "Agregar objetivo" solo aparece para quien tenga `permitirAgregarObjetivo: true` (hoy, solo `empresa.js`).

### 11–12. Avance y completar tarea
El colaborador reporta `progress_pct` + nota en `activity_updates`; un trigger sincroniza `actividades.progress_pct`/`status` automáticamente. "Marcar como completada" (`window.completarTarea`) fuerza `progress_pct=100`, `status='completada'`, bloquea edición futura (banner "ya no puedes editarla") y saca la tarea de la lista activa del colaborador (`.neq('status','completada')`).

### 13. Evidencias
Subida de imagen/video a Supabase Storage (bucket `evidencias`) + registro en la tabla del mismo nombre. Galería con miniaturas, distingue imagen (`<img>`) de video (ícono 🎬). Cada evidencia subida dispara +10 pts de gamificación.

### 14. Historial de tareas completadas
`renderHistorialTareas()` — tarjetas expandibles por tarea completada, mostrando evidencias + historial completo de avances de esa tarea. Reemplazó a un componente anterior más simple (`renderTareasCompletadas`, eliminado como código muerto tras esta migración).

### 15. Estrategias directivas
Texto guía (no accionable/con fecha) publicado por `company_admin`, visible de solo lectura para `director` y `collaborator`. Sin relación uno-a-uno con actividades — es contexto general.

### 16–18. Seguidores, metas y avances
- **Seguidores** (`seguidores.js`): reporta cambio de conteo por canal (`before_count`/`after_count`), calcula `delta`, historial completo por actividad/campaña.
- **Metas** (`metasSeguidores.js`): admin/director fijan `goal_total` (meta absoluta) y `goal_gain` (ganancia esperada) por canal; el colaborador ve su avance hacia ambas metas dentro de cada tarea.
- **Tabla de avances** (`avances.js`): log cronológico de todos los `activity_updates` de la empresa, con nombre del colaborador — vista rápida para admin/director sin entrar tarea por tarea.

### 19. Gamificación
`renderRanking()`/`renderTablaPuntos()` (`gamificacion.js`) — podio top 3, tabs Global/por campaña, insignias calculadas en el cliente (👑 top colaborador, 🔥 en racha ≥3 completadas, 📎 evidenciador, ⚡ veloz — esta última usando `points_log.action = 'completada_antes_fecha'` como fuente de verdad en vez de recalcular fechas). Puntos otorgados exclusivamente por triggers (§6 de `DATABASE.md`), nunca por el cliente.

### 20. Notificaciones
`configurarNotificaciones()` (`js/ui.js`) — campanita compartida por las 4 páginas con sesión; cuenta no leídas, marca todo como leído al abrir el panel. Alimentada por triggers al asignar actividad o reportar/editar avance.

### 21. Generación de calendario con IA
Formulario (canal, campaña, mes, frecuencia, contexto) → prompt a Groq (`llama-3.3-70b-versatile`) vía la Edge Function `generar-calendario` (valida sesión del usuario antes de llamar a Groq; la API key vive como secreto del lado del servidor). El resultado se revisa, se elige a qué colaborador asignarlo, y se publica como filas reales en `actividades`.

### 22. Asignación de actividades
Tres mecanismos conviven: (a) asignar al crear una actividad manualmente, (b) seleccionar colaborador al publicar un calendario generado por IA, (c) botón masivo "Asignar pendientes" + opción individual al hacer clic en un evento del calendario — ambos pensados para corregir actividades que quedaron sin `assigned_to`.

### 23. Eliminar pendientes en lote (solo Super Admin)
Card "🛠️ Eliminar actividades pendientes" en la pestaña Calendario de `empresa.html`, visible únicamente cuando `miPerfil.role === 'super_admin'` (herramienta de soporte de la plataforma, no del cliente). Lista las actividades con `status='pendiente'` de la empresa con checkbox por fila; el botón "Eliminar seleccionadas" llama a la función `soft_delete_actividades` vía `.rpc()` (`js/empresa.js`, `window.eliminarPendientesSeleccionadas`) — **soft delete, reversible**, mismo criterio que el resto del sistema (`DATABASE.md` §2, `v16`, fix de RLS en `v18`). No usa el permiso de borrado físico que `v16` reservó exclusivamente a `super_admin` vía SQL Editor — ese sigue sin exponerse en ninguna pantalla.

---

## Módulos diseñados pero no construidos

- **Adjuntos de archivo en propuestas de calendario** — tabla `activity_files` + bucket de Storage, diseñado en Fase 8 de `FASES-APP.md`, nunca implementado.
- **Propuestas formales de calendario** (Super Admin arma una propuesta → empresa acepta/modifica/rechaza) — diseñado en Fase 5, la generación por IA terminó resolviendo una necesidad parecida por otro camino (publicación directa con revisión previa) sin llegar a construir el flujo de propuesta/aprobación original.
- **Categorías de actividad personalizables por empresa** — hoy fijas en código (Marketing/Operatividad/Mantenimiento/Inversión), pensadas para el primer cliente; identificado como necesario si se vende a giros distintos, sin decisión tomada todavía.
