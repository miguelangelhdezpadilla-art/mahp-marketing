# CHANGELOG — Marketing Activity Hub Pro

> Capítulo 29 del `PROJECT-BLUEPRINT.md`. Bitácora del producto y de esta
> misma documentación. Arranca en el punto donde se formalizó `/docs` — el
> historial de commits completo sigue siendo la fuente de verdad técnica
> (`git log`); este archivo es la narrativa legible de qué cambió y por qué.
>
> Formato: más reciente arriba. Cada entrada indica si es cambio de **producto**
> o de **documentación**.

---

## 2026-07-09 — Documentación (MDS-006)

- **[Docs]** MDS-006 — creados 6 documentos del ecosistema de IA: `05-AI-ECOSYSTEM.md` (arquitectura general, relación con usuarios/módulos, riesgos, evolución 3/5/10 años, escalabilidad del ecosistema), `05A-AI-AGENTS.md` (**catálogo de 24 agentes**, cada uno con perfil completo — solo 1 marcado **[EXISTE]**: Calendar Planner; 2 bloqueados por completo hasta que existan prerequisitos de modelo de datos: Franchise Operations Advisor y Restaurant Marketing Specialist), `05B-AI-WORKFLOWS.md` (7 flujos colaborativos con diagramas, 3 de ellos explícitamente bloqueados hoy), `05C-AI-GOVERNANCE.md` (11 capítulos de gobernanza, incluye cumplimiento normativo señalado como pendiente sin evaluación legal), `05D-AI-PROMPT-STANDARDS.md` (estructura de 5 bloques derivada del prompt real ya en producción, no inventada), `05E-AI-MEMORY-AND-CONTEXT.md` (100% diseño futuro — hoy no existe ninguna memoria entre invocaciones). Ningún cambio de código, ninguna integración de IA nueva — solo diseño.

## 2026-07-09 — Documentación (MDS-005)

- **[Docs]** MDS-005 — creados 5 documentos de diseño: `04-DESIGN-SYSTEM.md` (20 capítulos: filosofía, principios UX/UI, arquitectura visual, responsive, grid, espaciados, tipografía, color, iconografía, sombras/bordes/elevaciones, animaciones, estados, accesibilidad WCAG, modo claro/oscuro), `04A-DESIGN-TOKENS.md` (valores exactos citados del código real, más 4 escalas nuevas formalizadas: espaciado, breakpoints, z-index, duraciones), `04B-COMPONENT-LIBRARY.md` (23 componentes, cada uno marcado **[EXISTE]** o **[FUTURO]** — 6 de ellos aspiracionales: switch, sidebar, breadcrumbs, gráficas, buscadores/filtros, paginación), `04C-UX-GUIDELINES.md` (flujos, jerarquía, experiencia por rol incluyendo 2 roles futuros que requieren cambio de modelo de datos), `04D-DESIGN-PRINCIPLES.md` (15 principios + estrategia de evolución visual V1→V10). Brecha de accesibilidad de mayor prioridad detectada: el foco no se gestiona al abrir/cerrar modales. Ningún cambio de código — solo diseño.

## 2026-07-09 — Producto

- **[Fix]** `follower_logs_insert` (`supabase_schema_v17.sql`) agregó el rol `director` a la política de inserción — el formulario "Reportar cambio de seguidores" ya existía en `directivo.html` pero la política de RLS nunca incluyó ese rol, causando `new row violates row-level security policy` al intentar guardarlo. Diagnosticado corriendo consultas de solo lectura contra `pg_policies` (confirmamos también que las 16 migraciones anteriores, incluida `v16`, ya estaban aplicadas). `DATABASE.md` §5 actualizado con la política real verificada.
- **[Feat/Sec]** Soft delete implementado en `actividades` y `evidencias` (`supabase_schema_v16.sql`), primera brecha cerrada de las detectadas en MDS-003/MDS-004. Columna `deleted_at`, políticas de lectura filtran filas borradas para todos los roles, y el borrado físico quedó restringido únicamente a `super_admin` (no expuesto en la interfaz). `js/empresa.js`: "Eliminar actividad" ahora hace un `update` (pone `deleted_at`) en vez de un `delete` físico. El trigger `lock_campos_actividad_colaborador` se actualizó para que un colaborador tampoco pueda soft-borrar sus propias tareas a través de su permiso de edición. Pendiente de tu parte: correr `supabase_schema_v16.sql` en el SQL Editor de Supabase.

## 2026-07-09 — Documentación

- **[Docs]** MDS-004 — creado `docs/03-ENGINEERING-STANDARDS.md`: manual oficial de ingeniería, 20 capítulos (filosofía, flujo de desarrollo, reglas generales, convenciones de nombres/código HTML/CSS/JS/Supabase/SQL, gestión de versiones, matriz de documentación, estándares de calidad, code review, testing, seguridad, protocolo de trabajo con IA, checklist, DoD, manifiesto). Cada estándar se contrasta contra patrones reales ya presentes en el código, no contra convenciones genéricas. Aplica explícitamente el principio de Simplicidad Progresiva a testing y control de versiones (sin exigir infraestructura que el tamaño actual del proyecto no necesita). Ningún cambio de código — solo diseño.
- **[Docs]** MDS-003 — creado `docs/02-ENTERPRISE-SYSTEM-ARCHITECTURE.md`: 20 capítulos de arquitectura empresarial (principios, arquitectura general/SaaS/módulos/Core/frontend/backend/base de datos/seguridad/IA/integraciones/automatizaciones/escalabilidad/observabilidad, riesgos, roadmap arquitectónico V1→V10, 5 diagramas, checklist de validación). Introduce el principio rector de "Simplicidad Progresiva" para evitar sobre-ingeniería, define el ecosistema futuro de especialistas de IA, y detecta 2 inconsistencias entre la arquitectura actual y la visión del producto (modelo de roles no contempla agencias multi-empresa; ausencia de soft delete contradice el principio de "nada crítico se pierde"). Ningún cambio de código o Supabase — solo diseño.

- **[Docs]** MDS-002 (versión completa) — creado `docs/01-IDENTIDAD-DEL-PRODUCTO.md`: 15 capítulos (identidad ejecutiva/técnica, historia, propósito, visión a 3/5/10 años, misión, filosofía, 15 principios fundamentales, problemas que resolvemos, público objetivo con mercados actuales y futuros, propuesta de valor, personalidad de marca, manifiesto, 10 opciones de lema con recomendación, criterios de decisión, conclusión). Es ahora la **fuente autoritativa de identidad** — `PROJECT-BLUEPRINT.md` capítulos 1/3/4/5 quedan pendientes de actualizarse para apuntar aquí en vez de duplicar contenido.

## 2026-07-08 — Documentación

- **[Docs]** MDS-002 (primera versión, resumida): desarrollados los capítulos 1 (Identidad), 3 (Misión), 4 (Filosofía) y 5 (Principios del Producto) directo en `PROJECT-BLUEPRINT.md`. Capítulos 6–8 (Problemas que resuelve, Público Objetivo, Propuesta de Valor) quedaron marcados como pendientes para MDS-003 — superado por la versión completa del 2026-07-09.
- **[Docs]** Creada la estructura `/docs` con los 10 archivos definidos (`PROJECT-BLUEPRINT.md`, `VISION.md`, `ROADMAP.md`, `CLAUDE.md`, `CHANGELOG.md`, `UI-UX.md`, `IA.md`, `API.md`, `DATABASE.md`, `MODULOS.md`).
- **[Docs]** `PROJECT-BLUEPRINT.md`: índice de 32 capítulos aprobado.
- **[Docs]** `DATABASE.md`: inventario completo de tablas y vistas. Detectadas y documentadas 4 tablas/vistas de seguidores (`social_channels`, `follower_logs`, `follower_totals`, `follower_delta_by_campaign`) que existen en producción sin haber sido nunca versionadas en un `.sql` — reconstruidas por evidencia de uso en el código, marcadas como pendientes de verificación directa.
- **[Docs]** `MODULOS.md`: inventario de 22 módulos construidos + 3 diseñados-no-construidos.
- **[Docs]** `ROADMAP.md`: reorganización de las 17 fases de `FASES-APP.md` por estado real (no cronológico). Corrección importante: la Fase 12 (*"Calidad del trabajo"*) estaba marcada como "construido" en `FASES-APP.md` sin estarlo — no existe columna `quality` en `activity_updates` ni en ningún schema versionado. Corregido a "parcialmente construido".
- **[Docs]** `VISION.md`, `UI-UX.md`, `IA.md`, `API.md` redactados.

## 2026-07-08 — Producto

- **[Feat]** Landing pública (`index.html`) construida en 10 fases: estructura/nav, hero, "¿Qué es MAHP?", módulos, línea de tiempo "Cómo funciona", sección de IA de alto impacto, galería de capturas (placeholders), planes + FAQ, footer + SEO/Open Graph/manifest/favicon, auditoría final. Completamente aislada de la app autenticada (`assets/landing.css`/`.js` propios).
- **[Fix]** Corregido embed ambiguo de PostgREST en `js/shared/avances.js` (`activity_updates` → `profiles` tenía dos relaciones posibles desde que `v13` agregó `authorized_by`); la tabla de avances quedaba silenciosamente vacía.
- **[Feat]** Calendario de solo lectura agregado al dashboard del director (antes no tenía ninguna vista de calendario).
- **[Feat]** Gamificación: tabla `points_log` + 3 triggers automáticos (tarea completada, avance reportado, evidencia subida) + ranking con podio e insignias (`supabase_schema_v15.sql`).
- **[Fix]** Actividades generadas por IA no llegaban a ningún colaborador porque `publicarCalendario()` nunca asignaba `assigned_to`. Agregado selector de colaborador al publicar, más herramientas de reasignación masiva/individual para corregir actividades ya huérfanas.
- **[Feat]** Frecuencia "1 por semana" agregada al generador de IA; el rango de actividades solicitado a la IA ahora escala según la frecuencia elegida en vez de un rango fijo.
- **[Feat]** Flujo de completar tarea (bloqueo de edición + banner) y vista de historial expandible de tareas completadas con evidencias y avances, para admin y director.
- **[Feat]** Metas de seguidores por canal (`supabase_schema_v14.sql`) + tabla de avances cronológica para admin/director.
- **[Sec]** Migrada la generación de calendario con IA de una llamada directa a Groq desde el navegador (con la API key expuesta en el código) a una Supabase Edge Function que guarda la clave como secreto de servidor — la clave anterior fue revocada y rotada.
- **[Infra]** Publicado en GitHub Pages; sitio accesible sin depender de que la computadora de desarrollo esté encendida.

## Anterior a 2026-07-08

Historial completo no reconstruido retroactivamente en este changelog — consultar `FASES-APP.md` (17 fases documentadas con contexto y decisiones) y `git log` para el detalle de commits previos al primer commit rastreado en este repositorio (`862f5b1 — Initial commit: marketing calendar app with Supabase integration`).
