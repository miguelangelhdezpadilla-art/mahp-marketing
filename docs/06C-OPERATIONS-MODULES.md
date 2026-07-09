# OPERATIONS MODULES — Especificación Funcional

> MDS-007, Documento 4 de 11. Los 5 módulos del área de Operaciones —
> ejecución del trabajo diario y su comprobación. Mismo formato de
> `06A-CORE-MODULES.md`.
>
> Última actualización: 2026-07-09.

---

## 1. Tareas — **[EXISTE]** *(es la vista de "Actividades" desde la perspectiva del colaborador)*

| Campo | Detalle |
|---|---|
| Objetivo | Que un `collaborator` sepa exactamente qué le toca hacer, sin ruido de lo que no le corresponde |
| Problema / Valor | Resuelve "¿qué hago hoy?" sin que el colaborador tenga que interpretar un calendario completo de la empresa |
| Usuarios / Roles / Permisos | `collaborator` — solo `assigned_to = auth.uid()` (`DATABASE.md` §2) |
| Entradas → Proceso → Salidas | Actividad asignada → reportar avance/completar → historial + evidencia |
| Reglas de negocio | Ver `06G-BUSINESS-RULES.md` §5; no puede crear, borrar ni reasignar (`FASES-APP.md` Fase 4) |
| KPIs / Criterios de éxito | % de tareas completadas a tiempo por colaborador |
| Automatización / IA | Project Coordinator (`05A` #4) para detectar atrasos |
| Dependencias / Relaciones / Integraciones | Es Actividades (`06B` #3) filtrado por usuario — no es una tabla separada |
| Escalabilidad / Evolución | Vista de calendario propia ya existe (`MODULOS.md` #8); vista de tarjetas tipo Monday.com **[FUTURO]** |

## 2. Checklists — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Descomponer una actividad en pasos verificables, no solo un % de avance subjetivo |
| Problema / Valor | Hoy el avance es un slider de 0-100% sin estructura — un checklist da pasos concretos y objetivos ("¿ya subiste la foto? ¿ya escribiste el copy?") |
| Usuarios / Roles / Permisos | `company_admin` define la plantilla; `collaborator` marca los pasos |
| Entradas → Proceso → Salidas | Plantilla de pasos (por tipo de actividad) → checklist instanciado por actividad → % de avance derivado automáticamente de pasos completados |
| Reglas de negocio | El % de avance de `activity_updates` podría calcularse solo si existe checklist, en vez de reportarse manualmente |
| KPIs / Criterios de éxito | Consistencia de reporte de avance entre colaboradores (menos subjetividad) |
| Automatización / IA | Ninguno directo — candidato: QA Advisor verificando que los pasos críticos no se salten |
| Dependencias / Relaciones / Integraciones | Depende de Actividades; podría reutilizarse en Procesos (§3) |
| Escalabilidad / Evolución | Valioso especialmente para el mercado "restaurantes"/franquicias donde los procesos son repetibles |

## 3. Procesos — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Definir secuencias de trabajo reutilizables más allá de una sola actividad (ej. "proceso de apertura de sucursal nueva": una secuencia de 15 actividades predefinidas) |
| Problema / Valor | Hoy cada actividad se crea individualmente — un proceso permite instanciar un flujo completo de una vez |
| Usuarios / Roles / Permisos | `company_admin` define y dispara |
| Entradas → Proceso → Salidas | Plantilla de proceso → se instancia → genera N actividades relacionadas automáticamente |
| Reglas de negocio | Las actividades generadas por un proceso siguen las mismas reglas que cualquier actividad (`06B` #3) |
| KPIs / Criterios de éxito | Tiempo ahorrado vs. crear las actividades una por una |
| Automatización / IA | Workflow Optimizer (`05A` #18) identifica candidatos a convertirse en proceso reutilizable |
| Dependencias / Relaciones / Integraciones | Se relaciona con Checklists (§2) y el motor de Automatizaciones (`06E`) |
| Escalabilidad / Evolución | Es el prerequisito funcional más directo para atender franquicias (procesos estandarizados entre sucursales) |

## 4. Evidencias — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Probar que una actividad se ejecutó realmente, con imagen o video |
| Problema / Valor | Sin evidencia, "completada" es solo una palabra — con evidencia, es verificable |
| Usuarios / Roles / Permisos | Sube `collaborator` (sus tareas) o `company_admin` (cualquiera de su empresa); todos los roles de la empresa ven |
| Entradas → Proceso → Salidas | Archivo → Storage (bucket `evidencias`) → galería visible en el detalle de la actividad |
| Reglas de negocio | Ver `06G-BUSINESS-RULES.md` §5; soft delete ya soportado a nivel de esquema (`DATABASE.md` §4) |
| KPIs / Criterios de éxito | % de tareas completadas con al menos una evidencia |
| Automatización / IA | Otorga +10 puntos de gamificación al subirse (`DATABASE.md` §6) |
| Dependencias / Relaciones / Integraciones | Depende de Actividades; comparte infraestructura de Storage con Activos Digitales (`06B` #8) |
| Escalabilidad / Evolución | Sin función de borrado en la interfaz hoy (`DATABASE.md` §4) — brecha menor, no priorizada |

## 5. Incidencias — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Registrar problemas operativos que no encajan como una "actividad" (ej. "la impresora del local se descompuso", "reclamo de cliente") |
| Problema / Valor | Hoy no hay forma de registrar un problema fuera del flujo de campaña/actividad — vive fuera de MAHP (WhatsApp, memoria) |
| Usuarios / Roles / Permisos | Cualquier rol reporta; `company_admin` resuelve/da seguimiento |
| Entradas → Proceso → Salidas | Descripción + prioridad → seguimiento de estado (abierta/en proceso/resuelta) → cierre con nota |
| Reglas de negocio | A definir al priorizarse — candidato: distinguir incidencia operativa (equipo, local) de incidencia de campaña (algo salió mal en una publicación) |
| KPIs / Criterios de éxito | Tiempo promedio de resolución |
| Automatización / IA | Customer Experience Advisor (`05A` #13) si la incidencia es de cara al cliente final |
| Dependencias / Relaciones / Integraciones | Podría relacionarse con Actividades (una incidencia originada en una tarea) sin ser dependiente de ella |
| Escalabilidad / Evolución | Menor prioridad que Checklists/Procesos — no resuelve un dolor ya validado en el producto actual, es especulativo |
