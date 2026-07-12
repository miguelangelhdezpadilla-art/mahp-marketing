# PROJECT BLUEPRINT — Marketing Activity Hub Pro (MAHP)

> Este documento es la Constitución del proyecto. Todo módulo futuro se diseña
> aquí antes de implementarse en código. Los capítulos se desarrollan uno por
> uno, con aprobación previa; los que aún no tienen contenido quedan marcados
> como pendientes en el propio índice.
>
> Estado: los 32 capítulos tienen desarrollo completo en al menos un
> documento propio — ver tabla de "Documentos relacionados" actualizada.
> La serie MDS-001 a MDS-012 (más `CCEC-001`/`CCEC-004` y los primeros
> `ADR-001` a `ADR-008`) se completó el 2026-07-12; este índice se
> actualizó en el mismo cambio para dejar de estar desactualizado desde
> MDS-005, inconsistencia señalada en `07-ENTERPRISE-DATA-PLATFORM.md`,
> `08-ENTERPRISE-INTEGRATION-PLATFORM.md`, `09-ENTERPRISE-AUTOMATION-
> PLATFORM.md` y resuelta en `11-ENTERPRISE-PRODUCT-STRATEGY.md`.
> Última actualización: 2026-07-12.

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

Dolencias reales: marketing disperso en hojas de cálculo y chats, falta de visibilidad para dirección, trabajo no auditable. *(Desarrollo completo en `VISION.md`, sección "El problema de fondo")*

#### 7. Público Objetivo

Perfil de empresas cliente y los 4 roles que operan dentro de cada una (super admin, admin de empresa, directivo, colaborador). *(Desarrollo completo en `01-IDENTIDAD-DEL-PRODUCTO.md` §9, MDS-002; segmentación priorizada en `11B-BUSINESS-GROWTH.md` §1, MDS-012)*

#### 8. Propuesta de Valor

Por qué una empresa elegiría MAHP sobre una hoja de cálculo, un CRM genérico o un gestor de tareas. *(Desarrollo completo en `01-IDENTIDAD-DEL-PRODUCTO.md` §10, MDS-002)*

### Parte II — Arquitectura

9. **Arquitectura General** — panorama técnico de alto nivel: frontend estático + Supabase (Postgres, Auth, RLS, Storage, Edge Functions) + IA externa. *(Desarrollo completo en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md`, MDS-003; decisiones fundacionales en `ADR-002`, `ADR-003`)*
10. **Arquitectura SaaS** — modelo de negocio multiempresa, ciclo de vida de una cuenta cliente, planes. *(Diseño conceptual en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §4; desarrollo operativo completo en `10-ENTERPRISE-SAAS-PLATFORM.md` + `10A`–`10I`, MDS-011)*
11. **Arquitectura Multiempresa** — aislamiento por `company_id`, RLS como frontera real de seguridad (no solo interfaz). *(Desarrollo completo en `07H-MULTI-TENANT-DESIGN.md`, MDS-008; `10A-MULTI-TENANT-MODEL.md`, MDS-011; decisión fundacional en `ADR-001`)*
12. **Arquitectura de Base de Datos** — visión de tablas, relaciones, vistas y triggers. *(Referencia detallada y versionada en `DATABASE.md`; plataforma de datos completa en `07-ENTERPRISE-DATA-PLATFORM.md` + `07A`–`07I`, MDS-008; convención de versionado en `ADR-004`)*
13. **Arquitectura Frontend** — HTML + JavaScript vanilla modular (ES modules), estructura de `js/shared/`, patrones de render sin framework. *(Decisión fundacional en `ADR-003`)*
14. **Arquitectura Backend** — Supabase como backend completo: Postgres, RLS, Auth, Storage, Edge Functions (proxy de IA). *(Decisión fundacional en `ADR-002`; patrón de identidad en `ADR-006`)*
15. **Inteligencia Artificial** — estado actual (generación de calendario vía Groq detrás de una Edge Function) y visión de expansión. *(Desarrollo completo en `IA.md`; ecosistema completo en `05-AI-ECOSYSTEM.md` + `05A`–`05E`, MDS-006; orquestación en `09E-AI-ORCHESTRATION.md`, MDS-010; evolución en 3 horizontes en `11F-AI-EVOLUTION.md`, MDS-012; decisión fundacional en `ADR-007`)*

### Parte III — Experiencia y Producto

16. **Diseño UX/UI** — sistema visual, componentes reutilizables, convenciones de interfaz por rol. *(Desarrollo completo en `UI-UX.md`; sistema de diseño completo en `04-DESIGN-SYSTEM.md` + `04A`–`04D`, MDS-005)*
17. **Ecosistema MAHP** — cómo conviven la landing pública (`index.html`) y la aplicación autenticada (4 paneles por rol), y qué piezas futuras se suman (mobile, integraciones). *(Ver `MODULOS.md` introducción; especificación funcional completa en `06-PRODUCT-BLUEPRINT.md` + `06A`–`06J`, MDS-007)*
18. **Módulos actuales** — inventario completo de lo construido y en producción. *(Desarrollo completo en `MODULOS.md`; catálogo funcional de 53 módulos en `06-PRODUCT-BLUEPRINT.md` + anexos, MDS-007)*
19. **Módulos futuros** — backlog priorizado de nuevas capacidades. *(Desarrollo completo en `06J-FUTURE-MODULES.md`, MDS-007; secuenciación en `11-ENTERPRISE-PRODUCT-STRATEGY.md` §13/§20, MDS-012)*

### Parte IV — Seguridad e Integraciones

20. **Seguridad** — RLS por tabla, auditoría (`audit_log`), gestión de accesos/revocación, manejo de secretos (API keys, sin exponer nunca en el cliente). *(Desarrollo completo en `07F-SECURITY-AND-AUDIT.md`, MDS-008; `08E-SECURITY.md`, MDS-009; capacidad transversal de auditoría en `CCEC-001-ENTERPRISE-AUDIT-PLATFORM.md` + `CCEC-001A`–`C`)*
21. **Integraciones** — servicios externos actuales (Groq) y candidatos futuros (correo transaccional, redes sociales, pagos). *(Desarrollo completo en `06F-INTEGRATIONS.md`, MDS-007; plataforma completa en `08-ENTERPRISE-INTEGRATION-PLATFORM.md` + `08A`–`08I`, MDS-009; catálogo extendido en `08C-INTEGRATIONS-CATALOG.md`)*
22. **API** — superficie de Edge Functions y sus contratos de entrada/salida. *(Desarrollo completo en `API.md`; estándares oficiales en `08A-API-STANDARDS.md`, MDS-009; versionado en `08H-VERSIONING.md`)*
23. **Automatizaciones** — triggers de base de datos que reaccionan a eventos (puntos de gamificación, notificaciones, sincronización de progreso) sin depender de que el cliente "recuerde" hacerlo. *(Estado actual en `DATABASE.md` §6–7; plataforma completa de workflows/reglas/orquestación configurable en `09-ENTERPRISE-AUTOMATION-PLATFORM.md` + `09A`–`09I`, MDS-010; decisión de infraestructura en `ADR-008`)*

### Parte V — Evolución y Estándares

24. **Roadmap** — plan de evolución por fases, con estado (construido / diseñado / pendiente). *(Desarrollo completo en `ROADMAP.md`; hoja de ruta a 5 fases MVP→Enterprise en `11A-PRODUCT-ROADMAP.md`, MDS-012)*
25. **Estándares de Desarrollo** — cómo se escribe código nuevo en este proyecto para que encaje con lo existente. *(Desarrollo completo en `03-ENGINEERING-STANDARDS.md`, MDS-004; estándares de esquema en `07C-DATABASE-STANDARDS.md`, MDS-008)*
26. **Convenciones de Código** — nomenclatura (UI en español, identificadores de código en inglés/español mixto ya establecido), estructura de archivos, estilo. *(Desarrollo completo en `03-ENGINEERING-STANDARDS.md`, MDS-004)*
27. **Buenas Prácticas** — lecciones aprendidas del propio proyecto (verificar relaciones ambiguas en PostgREST, no asumir columnas sin revisar el schema real, nunca ejecutar SQL directo sin mostrarlo primero). *(Desarrollo completo en `CLAUDE.md` §2; catálogo de decisiones con su razonamiento en `ADR-INDEX.md`)*
28. **Control de Versiones** — flujo de Git, despliegue vía GitHub Pages, esquema SQL versionado por archivo (`supabase_schema_vN.sql`) en vez de migraciones automáticas. *(Estrategia de despliegue completa en `10G-DEPLOYMENT-STRATEGY.md`, MDS-011; decisiones fundacionales en `ADR-003`, `ADR-004`)*
29. **Documentación** — cómo se mantiene vivo este set de documentos y su historial de cambios. *(Bitácora en `CHANGELOG.md`)*
30. **Reglas para Claude Code** — instrucciones operativas para cualquier asistente de IA que trabaje en este repositorio. *(Desarrollo completo en `CLAUDE.md`)*

### Parte VI — Visión a Largo Plazo

31. **Estrategia de Escalabilidad** — cómo crecer (más empresas, más datos, más módulos) sin romper lo existente ni la arquitectura sin servidor propio. *(Desarrollo completo en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §14, MDS-003; estrategia de datos en `07-ENTERPRISE-DATA-PLATFORM.md` §8, MDS-008; estrategia comercial en `10I-GROWTH-STRATEGY.md`, MDS-011)*
32. **Futuro del Producto** — visión más allá del roadmap inmediato: hacia dónde podría llegar MAHP como categoría de producto. *(Desarrollo completo en `11I-LONG-TERM-VISION.md`, MDS-012 — horizonte a 10 años)*

---

## Documentos relacionados

> Tabla reconstruida el 2026-07-12 (MDS-012) — desactualizada desde
> MDS-005 antes de este cambio, señalada como inconsistencia en
> `07-ENTERPRISE-DATA-PLATFORM.md`, `08-ENTERPRISE-INTEGRATION-
> PLATFORM.md` y `09-ENTERPRISE-AUTOMATION-PLATFORM.md`.

### Documentos originales (capítulos 1–30, base fundacional)

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

### MDS-002 a MDS-004 — Identidad, Arquitectura, Estándares

| Documento | Contenido |
|---|---|
| `01-IDENTIDAD-DEL-PRODUCTO.md` | Capítulos 1, 6–8 (identidad, problema, público objetivo, propuesta de valor) |
| `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` | Capítulos 9–11, 14, 20–21, 31 (arquitectura general, SaaS, multiempresa, backend, seguridad, integraciones, escalabilidad) |
| `03-ENGINEERING-STANDARDS.md` | Capítulos 25–26 (estándares y convenciones de desarrollo) |

### MDS-005 — Sistema de Diseño

| Documento | Contenido |
|---|---|
| `04-DESIGN-SYSTEM.md` + `04A`–`04D` | Capítulo 16 (diseño UX/UI), desarrollo completo: tokens, componentes, guías UX, principios |

### MDS-006 — Ecosistema de IA

| Documento | Contenido |
|---|---|
| `05-AI-ECOSYSTEM.md` + `05A`–`05E` | Capítulo 15 (IA), desarrollo completo: 24 agentes catalogados, flujos colaborativos, gobierno, estándares de prompt, memoria/contexto |

### MDS-007 — Blueprint de Producto

| Documento | Contenido |
|---|---|
| `06-PRODUCT-BLUEPRINT.md` + `06A`–`06J` | Capítulos 17–19 (ecosistema, módulos actuales y futuros), 53 módulos catalogados |

### MDS-008 — Plataforma de Datos

| Documento | Contenido |
|---|---|
| `07-ENTERPRISE-DATA-PLATFORM.md` + `07A`–`07I` | Capítulos 11–12, 31 (multiempresa, base de datos, escalabilidad), dominios/gobierno/entidades/seguridad/calidad de datos |

### MDS-009 — Plataforma de Integración

| Documento | Contenido |
|---|---|
| `08-ENTERPRISE-INTEGRATION-PLATFORM.md` + `08A`–`08I` | Capítulos 21–22 (integraciones, API), estándares, webhooks, catálogo extendido, developer portal, seguridad, eventos, SDK, versionado, marketplace |

### MDS-010 — Plataforma de Automatización

| Documento | Contenido |
|---|---|
| `09-ENTERPRISE-AUTOMATION-PLATFORM.md` + `09A`–`09I` | Capítulo 23 (automatizaciones), workflows, reglas de negocio, eventos, plantillas, orquestación de IA, scheduler, aprobaciones, notificaciones, gobierno |

### MDS-011 — Plataforma SaaS y Operación

| Documento | Contenido |
|---|---|
| `10-ENTERPRISE-SAAS-PLATFORM.md` + `10A`–`10I` | Capítulo 10 (SaaS), multi-tenant operativo, planes, organización, excelencia operativa, backup/DR, SLO, despliegue, soporte, crecimiento |

### MDS-012 — Estrategia de Producto (capítulo de cierre)

| Documento | Contenido |
|---|---|
| `11-ENTERPRISE-PRODUCT-STRATEGY.md` + `11A`–`11I` | Capítulos 24, 31–32 (roadmap, escalabilidad, futuro), estrategia integral, roadmap 5 fases, crecimiento, expansión, monetización, innovación, evolución de IA, riesgos, métricas, visión a 10 años |

### CCEC — Capacidades Compartidas entre todo el Sistema

| Documento | Contenido |
|---|---|
| `CCEC-001-ENTERPRISE-AUDIT-PLATFORM.md` + `CCEC-001A`–`C` | Capítulo 20 (seguridad) — catálogo de eventos auditables, acceso/retención, guía de integración para todo MDS futuro |
| `CCEC-004-OBSERVABILITY-PLATFORM.md` + `CCEC-004A`–`C` | Logs, métricas/dashboards, alertas — capacidad transversal de observabilidad |

### ADR — Historial de Decisiones Arquitectónicas

| Documento | Contenido |
|---|---|
| `ADR-INDEX.md` + `ADR-001`–`008` | El *porqué* de las decisiones ya tomadas: multi-tenancy por columna, Supabase como backend completo, frontend vanilla, esquema versionado por archivo, soft delete por defecto, `security definer` para identidad, IA vía Edge Function proxy, cola sobre Postgres+`pg_cron` |
