# AI MODULES — Especificación Funcional

> MDS-007, Documento 6 de 11. Los 5 módulos de Inteligencia Artificial vistos
> como **producto** (pantallas, flujos, valor de negocio) — el detalle técnico
> de cada agente ya vive en los 6 documentos de MDS-006 (`05-AI-ECOSYSTEM.md`
> a `05E-AI-MEMORY-AND-CONTEXT.md`); este documento no lo repite, lo enmarca
> con la plantilla funcional de esta fase.
>
> Última actualización: 2026-07-09.

---

## 1. Centro de IA — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Un lugar único donde el usuario accede a todos los agentes disponibles, en vez de que cada uno viva escondido en la pestaña de su módulo |
| Problema / Valor | Hoy la generación de calendario vive dentro de la pestaña Calendario de `empresa.html` — funciona con un solo agente, pero no escala a 24 sin una pantalla propia |
| Usuarios / Roles / Permisos | Todos los roles con acceso a al menos un agente (`05-AI-ECOSYSTEM.md` §4) |
| Entradas → Proceso → Salidas | Selección de agente o solicitud en lenguaje natural (vía Marketing Strategist) → resultado del agente correspondiente |
| Reglas de negocio | Ningún agente se oculta ni se expone fuera del permiso de su perfil (`05A-AI-AGENTS.md`, campo Permisos de cada uno) |
| KPIs / Criterios de éxito | % de usuarios que descubren y usan más de un agente (mide si el "centro" realmente centraliza, no solo Calendar Planner) |
| Automatización / IA | Es la fachada de todos los agentes de `05A-AI-AGENTS.md` |
| Dependencias / Relaciones / Integraciones | Depende de que existan al menos 2-3 agentes más allá de Calendar Planner para justificarse como pantalla propia |
| Escalabilidad / Evolución | Se construye cuando el catálogo de agentes activos supere ~3-4 — antes de eso, seguir el patrón actual (agente embebido en su módulo) es más simple (Simplicidad Progresiva) |

## 2. Agentes — **[PARCIAL: 1 de 24 existe]**

| Campo | Detalle |
|---|---|
| Objetivo | El catálogo mismo de especialistas virtuales |
| Problema / Valor | Ver `05-AI-ECOSYSTEM.md` §1/§6 |
| Usuarios / Roles / Permisos | Por agente — ver `05A-AI-AGENTS.md` |
| Entradas → Proceso → Salidas | Ver `05D-AI-PROMPT-STANDARDS.md` (contrato de entrada/salida estándar) |
| Reglas de negocio | Revisión humana obligatoria antes de publicar (`05-AI-ECOSYSTEM.md` §1) |
| KPIs / Criterios de éxito | Por agente, ya definidos individualmente en `05A-AI-AGENTS.md` |
| Automatización / IA | Es el módulo en sí |
| Dependencias / Relaciones / Integraciones | Cada agente depende de los módulos de datos que consulta (`05-AI-ECOSYSTEM.md` §5) |
| Escalabilidad / Evolución | Registro formal de agentes, versionado — ver `05-AI-ECOSYSTEM.md` §11 |

## 3. Automatizaciones — **[PARCIAL]**

| Campo | Detalle |
|---|---|
| Objetivo | Ejecutar acciones del sistema sin intervención manual repetida |
| Problema / Valor | Hoy cubierto parcialmente por triggers de base de datos fijos (sincronizar progreso, otorgar puntos, notificar — `DATABASE.md` §6) — no configurable por el usuario |
| Usuarios / Roles / Permisos | Triggers: nadie los configura, son parte del sistema. Motor configurable futuro: `company_admin` define reglas propias |
| Entradas → Proceso → Salidas | Evento → condición → acción (ver diagrama completo en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §13) |
| Reglas de negocio | Las automatizaciones internas (triggers) nunca requieren aprobación humana por evento individual; las configurables por usuario sí requieren que el usuario las active una vez |
| KPIs / Criterios de éxito | Horas de trabajo manual ahorradas |
| Automatización / IA | Automation Expert, Workflow Optimizer (`05A` #17-18) sugieren reglas nuevas |
| Dependencias / Relaciones / Integraciones | El motor configurable depende de la cola de automatización, no construida (`02-ARCHITECTURE` §13) |
| Escalabilidad / Evolución | Ver tabla de escalones de usuario en `02-ARCHITECTURE` §14 — el motor con cola se activa en el escalón de decenas de miles de usuarios o antes si hay demanda real |

## 4. Recomendaciones — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Sugerencias proactivas que el sistema ofrece sin que el usuario las pida explícitamente |
| Problema / Valor | Distinto de un agente invocado a demanda — una recomendación aparece sola cuando hay algo que vale la pena señalar (ej. KPI atrasado, patrón de automatización detectado) |
| Usuarios / Roles / Permisos | `company_admin`/`director`, según el tipo de recomendación |
| Entradas → Proceso → Salidas | Análisis periódico (no a demanda) → recomendación mostrada en Dashboard/Notificaciones |
| Reglas de negocio | Nunca se autoejecuta — toda recomendación requiere aceptación explícita (`05-AI-ECOSYSTEM.md` §1) |
| KPIs / Criterios de éxito | Tasa de aceptación de recomendaciones mostradas |
| Automatización / IA | Es la salida combinada de KPI Advisor, Automation Expert, Project Coordinator cuando actúan de forma proactiva en vez de a demanda |
| Dependencias / Relaciones / Integraciones | Depende de que los agentes de análisis (`05A` grupo 4-5) ya estén activos |
| Escalabilidad / Evolución | Requiere el registro de observabilidad de IA (`05-AI-ECOSYSTEM.md` §11) para no saturar al usuario con recomendaciones de baja calidad repetidas |

## 5. Asistentes — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Interacción conversacional con el ecosistema completo de IA, no un formulario por agente |
| Problema / Valor | Hoy cada agente (cuando existan más de uno) se invoca por su propio formulario — un asistente permite pedir en lenguaje natural y que el sistema decida qué agente(s) usar |
| Usuarios / Roles / Permisos | `company_admin`, `director` (limitado a agentes de solo-lectura que su rol ya permite) |
| Entradas → Proceso → Salidas | Solicitud en lenguaje natural → Marketing Strategist orquesta (`05A` #1) → resultado consolidado |
| Reglas de negocio | El asistente nunca tiene más permiso que la suma de lo que sus agentes individuales ya tendrían — no es una puerta trasera a más acceso |
| KPIs / Criterios de éxito | % de solicitudes resueltas sin que el usuario tenga que ir a un formulario específico |
| Automatización / IA | Es la interfaz conversacional del Marketing Strategist |
| Dependencias / Relaciones / Integraciones | Depende de memoria de contexto (`05E-AI-MEMORY-AND-CONTEXT.md` §9, resumen de conversaciones) para ser útil en solicitudes de varios turnos |
| Escalabilidad / Evolución | Horizonte a 5 años de `01-IDENTIDAD-DEL-PRODUCTO.md` §4 — no es un módulo de la V1 del ecosistema de IA |
