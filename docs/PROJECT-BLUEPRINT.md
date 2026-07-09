# PROJECT BLUEPRINT — Marketing Activity Hub Pro (MAHP)

> Este documento es la Constitución del proyecto. Todo módulo futuro se diseña
> aquí antes de implementarse en código. Los capítulos se desarrollan uno por
> uno, con aprobación previa; los que aún no tienen contenido quedan marcados
> como pendientes en el propio índice.
>
> Estado: capítulos 1–5 desarrollados (MDS-002, "Identidad del Producto").
> Capítulos 6–8 pendientes (MDS-003). Resto de la Parte I en adelante:
> ver tabla de "Documentos relacionados" para lo ya desarrollado en archivos
> propios.
> Última actualización: 2026-07-08.

---

## Índice

### Parte I — Producto

#### 1. Identidad del Producto

**Nombre completo**: Marketing Activity Hub Pro (MAHP).
**Categoría**: SaaS B2B multiempresa (multi-tenant) de operación de marketing, con inteligencia artificial integrada como parte central del flujo, no como función aparte.

**Qué es**: el sistema donde una empresa planea, asigna, ejecuta, mide y audita su trabajo de marketing — con una experiencia distinta por rol (`super_admin`, `company_admin`, `director`, `collaborator`) sobre los mismos datos, aislados por empresa a nivel de base de datos (ver `DATABASE.md` §1).

**Qué NO es** (ver capítulo 4 — Filosofía):
- No es un calendario de contenido aislado — el calendario es una vista, no el producto.
- No es un gestor de tareas genérico — las tareas existen dentro de campañas con objetivos medibles, no sueltas.
- No es un CRM — no gestiona relaciones con clientes finales ni pipeline de ventas; gestiona la operación interna de marketing de la empresa.

**Identidad visual**: logotipo temporal 📊, paleta indigo (`#6366F1`) como color de marca, tipografía Poppins (títulos) + Inter (cuerpo). Detalle completo del sistema visual en `UI-UX.md`.

**Estado de madurez**: producto funcional en producción, con 4 roles operativos, seguridad multiempresa real, generación de contenido con IA, y gamificación — evolucionando por fases documentadas y verificadas en `ROADMAP.md`.

#### 2. Visión

Hacia dónde evoluciona el producto en los próximos años. *(Desarrollo completo en `VISION.md`)*

#### 3. Misión

**En una frase**: darle a cualquier empresa que hace marketing en serio una sola fuente de verdad — con visibilidad distinta para quien dirige, quien administra y quien ejecuta — en vez de hojas de cálculo, chats dispersos y reportes armados a mano al final del mes.

**Qué resuelve hoy**: planeación de campañas con objetivos medibles (`campaigns` + `kpis`), asignación y seguimiento de tareas con evidencia (`actividades` + `activity_updates` + `evidencias`), generación de calendarios de contenido asistida por IA, y visibilidad en tiempo real del avance sin necesitar que nadie arme un reporte manual.

**Para quién**: empresas que ya tienen un equipo operando marketing (no una sola persona) y necesitan que dirección, administración y ejecución trabajen sobre la misma información — hoy modelado explícitamente en 4 roles (`super_admin` = el proveedor de la plataforma; `company_admin`, `director`, `collaborator` = la empresa cliente).

#### 4. Filosofía

> MAHP no es un calendario. No es un gestor de tareas. No es un CRM.
> Es un Sistema Operativo Empresarial impulsado por Inteligencia Artificial.

Esta declaración no es una frase de mercadeo — es el criterio que decide cómo se construye cada módulo:

- **"Sistema operativo", no "herramienta más"**: cada módulo nuevo se diseña para conectarse con lo que ya existe (una actividad generada por IA vive en la misma tabla, con las mismas reglas de seguridad, que una creada a mano), no como una función aislada con su propia lógica paralela.
- **La IA participa en el flujo central, no es un botón aparte**: la generación de calendario no es un "extra" — reemplaza directamente el trabajo de planeación manual, y lo que genera se vuelve una actividad real del sistema, con el mismo ciclo de vida que cualquier otra (ver `IA.md`).
- **Cada rol tiene su propia experiencia, no una pantalla con permisos ocultos**: `director` no ve la misma pantalla que `company_admin` con botones deshabilitados — tiene su propia página, con el mismo lenguaje visual, mostrando exactamente lo que su rol necesita.
- **La seguridad es del sistema, no de la pantalla**: ninguna regla de "quién puede ver qué" depende de que la interfaz la respete — vive en RLS, a nivel de base de datos (ver `DATABASE.md` §1, `ROADMAP.md` Fase 3).

#### 5. Principios del Producto

Reglas de diseño que guían toda decisión técnica y de producto, derivadas de cómo se ha construido MAHP hasta ahora:

1. **Seguridad a nivel de base de datos, no de interfaz.** Toda regla de acceso se expresa en RLS. El frontend puede tener bugs de interfaz sin que eso comprometa datos de otra empresa.
2. **Aislamiento multiempresa total.** Ningún dato operativo existe sin `company_id`. El único rol sin esa restricción es `super_admin`, y de forma explícita, no por omisión.
3. **La IA sugiere y genera; las personas deciden y publican.** Ninguna acción de IA escribe datos reales sin pasar por una pantalla de revisión humana primero (ver `IA.md` §4).
4. **Nada crítico se pierde.** Historial de avances, evidencias y auditoría son de solo-inserción (`append-only`) donde importa la trazabilidad — se puede editar la interpretación (ej. una observación), nunca borrar el rastro de que existió.
5. **Simplicidad sobre complejidad.** Sin framework de frontend, sin servidor propio salvo lo estrictamente necesario (una sola Edge Function, no una API completa). Se agrega complejidad solo cuando resuelve un problema real, no por anticipación.
6. **Compatibilidad hacia atrás, siempre.** Ningún módulo nuevo rompe uno existente — principio ya codificado como regla dura en `CLAUDE.md` §3.
7. **Documentar es parte de construir, no un paso posterior.** Un módulo se considera incompleto si `MODULOS.md`/`DATABASE.md` no reflejan lo que realmente hace.

#### 6. Problemas que resuelve

Dolencias reales: marketing disperso en hojas de cálculo y chats, falta de visibilidad para dirección, trabajo no auditable. *(Desarrollo pendiente — MDS-003)*

#### 7. Público Objetivo

Perfil de empresas cliente y los 4 roles que operan dentro de cada una (super admin, admin de empresa, directivo, colaborador). *(Desarrollo pendiente — MDS-003)*

#### 8. Propuesta de Valor

Por qué una empresa elegiría MAHP sobre una hoja de cálculo, un CRM genérico o un gestor de tareas. *(Desarrollo pendiente — MDS-003)*

### Parte II — Arquitectura

9. **Arquitectura General** — panorama técnico de alto nivel: frontend estático + Supabase (Postgres, Auth, RLS, Storage, Edge Functions) + IA externa.
10. **Arquitectura SaaS** — modelo de negocio multiempresa, ciclo de vida de una cuenta cliente, planes.
11. **Arquitectura Multiempresa** — aislamiento por `company_id`, RLS como frontera real de seguridad (no solo interfaz).
12. **Arquitectura de Base de Datos** — visión de tablas, relaciones, vistas y triggers. *(Referencia detallada y versionada en `DATABASE.md`)*
13. **Arquitectura Frontend** — HTML + JavaScript vanilla modular (ES modules), estructura de `js/shared/`, patrones de render sin framework.
14. **Arquitectura Backend** — Supabase como backend completo: Postgres, RLS, Auth, Storage, Edge Functions (proxy de IA).
15. **Inteligencia Artificial** — estado actual (generación de calendario vía Groq detrás de una Edge Function) y visión de expansión. *(Desarrollo completo en `IA.md`)*

### Parte III — Experiencia y Producto

16. **Diseño UX/UI** — sistema visual, componentes reutilizables, convenciones de interfaz por rol. *(Desarrollo completo en `UI-UX.md`)*
17. **Ecosistema MAHP** — cómo conviven la landing pública (`index.html`) y la aplicación autenticada (4 paneles por rol), y qué piezas futuras se suman (mobile, integraciones).
18. **Módulos actuales** — inventario completo de lo construido y en producción. *(Desarrollo completo en `MODULOS.md`)*
19. **Módulos futuros** — backlog priorizado de nuevas capacidades.

### Parte IV — Seguridad e Integraciones

20. **Seguridad** — RLS por tabla, auditoría (`audit_log`), gestión de accesos/revocación, manejo de secretos (API keys, sin exponer nunca en el cliente).
21. **Integraciones** — servicios externos actuales (Groq) y candidatos futuros (correo transaccional, redes sociales, pagos).
22. **API** — superficie de Edge Functions y sus contratos de entrada/salida. *(Desarrollo completo en `API.md`)*
23. **Automatizaciones** — triggers de base de datos que reaccionan a eventos (puntos de gamificación, notificaciones, sincronización de progreso) sin depender de que el cliente "recuerde" hacerlo.

### Parte V — Evolución y Estándares

24. **Roadmap** — plan de evolución por fases, con estado (construido / diseñado / pendiente). *(Desarrollo completo en `ROADMAP.md`)*
25. **Estándares de Desarrollo** — cómo se escribe código nuevo en este proyecto para que encaje con lo existente.
26. **Convenciones de Código** — nomenclatura (UI en español, identificadores de código en inglés/español mixto ya establecido), estructura de archivos, estilo.
27. **Buenas Prácticas** — lecciones aprendidas del propio proyecto (verificar relaciones ambiguas en PostgREST, no asumir columnas sin revisar el schema real, nunca ejecutar SQL directo sin mostrarlo primero).
28. **Control de Versiones** — flujo de Git, despliegue vía GitHub Pages, esquema SQL versionado por archivo (`supabase_schema_vN.sql`) en vez de migraciones automáticas.
29. **Documentación** — cómo se mantiene vivo este set de documentos y su historial de cambios. *(Bitácora en `CHANGELOG.md`)*
30. **Reglas para Claude Code** — instrucciones operativas para cualquier asistente de IA que trabaje en este repositorio. *(Desarrollo completo en `CLAUDE.md`)*

### Parte VI — Visión a Largo Plazo

31. **Estrategia de Escalabilidad** — cómo crecer (más empresas, más datos, más módulos) sin romper lo existente ni la arquitectura sin servidor propio.
32. **Futuro del Producto** — visión más allá del roadmap inmediato: hacia dónde podría llegar MAHP como categoría de producto.

---

## Documentos relacionados

| Documento | Contenido |
|---|---|
| `VISION.md` | Desarrollo completo del capítulo 2 |
| `ROADMAP.md` | Desarrollo completo del capítulo 24 — fases con estado |
| `CLAUDE.md` | Desarrollo completo del capítulo 30 — reglas operativas para IA |
| `CHANGELOG.md` | Bitácora de cambios del producto y de esta documentación |
| `UI-UX.md` | Desarrollo completo del capítulo 16 |
| `IA.md` | Desarrollo completo del capítulo 15 |
| `API.md` | Desarrollo completo del capítulo 22 |
| `DATABASE.md` | Desarrollo completo del capítulo 12 |
| `MODULOS.md` | Desarrollo completo del capítulo 18 |
