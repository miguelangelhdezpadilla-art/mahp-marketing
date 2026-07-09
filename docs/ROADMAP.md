# ROADMAP — Marketing Activity Hub Pro

> Capítulo 24 del `PROJECT-BLUEPRINT.md`. Reorganiza las 17 fases de
> `FASES-APP.md` (y el trabajo posterior no capturado ahí) **por estado real**,
> verificado contra el código y el esquema actuales — no por orden cronológico.
>
> Leyenda: ✅ Construido y verificado · 🟡 Parcialmente construido · ⚪ Diseñado, no construido
>
> Última actualización: 2026-07-08.

---

## ✅ Construido y verificado

| Fase origen | Entregable |
|---|---|
| 1 | Roles (`super_admin`/`company_admin`/`director`/`collaborator`), matriz de permisos, 5 páginas por rol |
| 4 | Flujo de invitación completo, permiso acotado del colaborador para editar título/canal/fecha de sus propias tareas |
| 9 | Centro de campañas: `kpis.campaign_id` como "objetivo", expandir campaña → objetivos + actividades |
| 10 | Calendario visual del colaborador (FullCalendar, filtrado a lo suyo) conviviendo con la lista de tarjetas |
| 11 | Estrategias directivas: publicación (admin) y lectura (director/colaborador) |
| 13 | Formulario "Agregar actividad" con descripción como campo separado del canal |
| 14 | Notificaciones automáticas vía trigger (asignación, avance reportado/editado); drag & drop en calendario de admin y de colaborador |
| 15–17 | Modularización completa: JS extraído de los HTML, funciones compartidas en `js/shared/`, cero lógica inline |
| — *(post-`FASES-APP.md`)* | Calendario de solo lectura para el director |
| — | Metas de seguidores por canal + avance visible al colaborador |
| — | Tabla de avances cronológica (empresa completa) para admin/director |
| — | Historial expandible de tareas completadas con evidencias + avances |
| — | Completar tarea (bloqueo de edición + registro de puntos) |
| — | Gamificación: puntos automáticos por trigger, ranking con podio e insignias |
| — | Generación de calendario con IA (Groq vía Edge Function segura) + selector de colaborador al publicar |
| — | Herramientas de reasignación: botón masivo "Asignar pendientes" + asignación individual desde el calendario |
| — | Landing pública, aislada de la app autenticada, con SEO/Open Graph/manifest/favicon |
| — | `docs/` — documentación estructurada del proyecto (en construcción activa) |

---

## 🟡 Parcialmente construido

**Fase 2 — Dashboards y KPIs**
Construido: tarjetas de KPI con barra de progreso, avance de campañas, desempeño por colaborador.
Falta: selector de periodo (semana/mes/trimestre), botón "Exportar reporte" (PDF/CSV), KPIs calculados automáticamente desde actividades (hoy todos son manuales).

**Fase 3 — Seguridad y accesos**
Construido: autenticación real, aislamiento multiempresa por RLS, revocar/restaurar acceso, `audit_log` con triggers.
Falta: indicador visual de "modo observador" cuando el Super Admin entra al panel de una empresa (hoy edita igual que el admin de esa empresa, sin distinción visual); política de contraseña reforzada (configuración de Supabase, no requiere código).

**Fase 6 — Conexión con IA**
Construido, pero **por un camino distinto al diseñado**: la Fase 5 (propuestas de calendario con estado pendiente/aceptada/rechazada) nunca se construyó, así que la IA no "reutiliza el sistema de propuestas" como proponía el documento original — en su lugar, genera un calendario que el admin revisa y publica directamente, sin un estado intermedio de aprobación formal.
Falta: insights puntuales tipo "⚠️ KPI atrasado" en el dashboard (solo se construyó la generación de calendario completo).

**Fase 7 — Visualización y accesibilidad**
Construido: navegación por pestañas, barra superior consistente, lenguaje simple, fila de tarjetas de resumen ejecutivo con semáforo de color.
Falta (verificado contra `assets/styles.css`: no existe el media query correspondiente): las tablas (invitaciones, campañas, usuarios) no se convierten a formato tarjeta en pantallas angostas — siguen siendo tablas apretadas en móvil.

**Fase 12 — Evaluación de actividades**
Construido: edición de observaciones ya reportadas, marcadas como "(editado)" para no perder trazabilidad; acceso del `company_admin` a la tabla "Desempeño por colaborador" (antes exclusiva del director).
⚠️ **No construido, pese a que `FASES-APP.md` lo marca como "Estado: construido"**: el campo "Calidad del trabajo" (Excelente/Buena/Regular/Necesita mejora) nunca se agregó — no existe columna `quality` en `activity_updates` en ningún `supabase_schema_vN.sql`, ni la columna "Calidad promedio" en la tabla de desempeño (`js/directivo.js`/`js/empresa.js`, verificado: solo 4 columnas — colaborador, tareas asignadas, completadas, avance promedio).

---

## ⚪ Diseñado, no construido

- **Fase 5 — Propuestas de calendario**: tablas `calendar_proposals`/`proposal_items`, flujo aceptar/modificar/rechazar. No existen en ningún schema versionado ni en el código.
- **Fase 8 — Vista de tarjetas tipo Monday.com**: toggle "Vista calendario" / "Vista tarjetas", tarjetas enriquecidas con conteo de comentarios y adjuntos. Verificado: no existe ningún toggle de vista en `empresa.html` ni lógica relacionada en `empresa.js`.
- **Adjuntos de archivo en propuestas de calendario** (Fase 8, diseño de `activity_files` + bucket Storage) — distinto del sistema de evidencias ya construido, que es específico de tareas asignadas, no de propuestas.
- **Categorías de actividad personalizables por empresa** (Fase 2) — hoy fijas en código (Marketing/Operatividad/Mantenimiento/Inversión), pensadas para el primer cliente.

---

## Próximos pasos sugeridos (por prioridad, no por fase)

1. **Cerrar el hueco de documentación de base de datos** (`social_channels`, `follower_logs`, `follower_totals`, `follower_delta_by_campaign` — ver `DATABASE.md` §9) antes de construir nada nuevo sobre esas tablas.
2. **Decidir el destino real de la Fase 12** (calidad del trabajo): ¿se construye tal como se diseñó originalmente, o se considera reemplazada por la gamificación (insignias) y se cierra el capítulo formalmente?
3. **Selector de periodo + exportar reporte** (Fase 2) — es lo más solicitado típicamente por perfiles directivos y hoy no existe ninguna forma de sacar una "foto" del dashboard fuera de la app.
4. **Modo observador visual para el Super Admin** (Fase 3) — bajo esfuerzo, cierra un riesgo real de edición accidental de datos de un cliente.
5. **Tablas responsivas en móvil** (Fase 7) — la Fase 7 identificó que el colaborador probablemente usa la app desde el celular; las tablas administrativas siguen sin adaptarse.
6. Evaluar si vale la pena formalizar la Fase 5 (propuestas) ahora que existe la generación por IA, o si el flujo actual (publicar directo) es suficiente y se cierra el diseño original como descartado.
