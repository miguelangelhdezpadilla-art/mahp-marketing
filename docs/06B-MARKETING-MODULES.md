# MARKETING MODULES — Especificación Funcional

> MDS-007, Documento 3 de 11. Los 8 módulos del área de Marketing — el
> corazón operativo diario de MAHP. Mismo formato de `06A-CORE-MODULES.md`.
>
> Última actualización: 2026-07-09.

---

## 1. Campañas — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Agrupar actividades bajo un objetivo de negocio medible |
| Problema / Valor | Sin campaña, una actividad es una tarea suelta sin propósito medible — resuelve "¿esto para qué es?" |
| Usuarios / Roles / Permisos | Crea/edita `company_admin`; lee `director` (solo lectura) |
| Entradas → Proceso → Salidas | Nombre/objetivo/fechas → `insert` en `campaigns` → contenedor listo para KPIs y actividades |
| Reglas de negocio | Ver `06G-BUSINESS-RULES.md` §1 |
| KPIs / Criterios de éxito | % de campañas con al menos un objetivo (KPI) definido; % que cierran con actividad completa |
| Automatización / IA | Campaign Planner (`05A-AI-AGENTS.md` #2, futuro) |
| Dependencias / Relaciones / Integraciones | Depende de Empresas; de ella dependen Calendario/Actividades/KPIs |
| Notificaciones / Reportes | Reporte de cierre — ver Analytics (`06D`) |
| Escalabilidad / Evolución | Sostiene volumen alto sin cambio; evolución: plantillas de campaña reutilizables por giro (`05A-AI-AGENTS.md` #21) |

## 2. Calendario — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Visualizar todas las actividades distribuidas en el tiempo |
| Problema / Valor | Vista de "qué hay este mes" de un vistazo, sin revisar fila por fila |
| Usuarios / Roles / Permisos | Editable: `company_admin`/`collaborator` (lo suyo); solo lectura: `director` |
| Entradas → Proceso → Salidas | Actividades con fecha → FullCalendar renderiza → drag&drop actualiza fecha |
| Reglas de negocio | Ver `06G-BUSINESS-RULES.md` §2 |
| KPIs / Criterios de éxito | % de actividades movidas de fecha (proxy de mala planeación inicial si es alto) |
| Automatización / IA | Calendar Planner **[EXISTE]** genera actividades directo en esta vista |
| Dependencias / Relaciones / Integraciones | Depende de Actividades; futuro — sincronización con Google Calendar (`06F`) |
| Escalabilidad / Evolución | Vista de tarjetas tipo Monday.com **[FUTURO]** (`04B-COMPONENT-LIBRARY.md` §16 gráficas aparte; ver `ROADMAP.md` Fase 8) |

## 3. Actividades — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Unidad mínima de trabajo ejecutable, con estado y avance |
| Problema / Valor | Es lo que un `collaborator` realmente ejecuta — el punto de contacto más frecuente de todo el sistema |
| Usuarios / Roles / Permisos | Crea/asigna `company_admin`; ejecuta/reporta `collaborator` (solo lo suyo, campos acotados) |
| Entradas → Proceso → Salidas | Título/canal/fecha/asignación → ciclo pendiente→en_progreso→completada → evidencia + puntos de gamificación |
| Reglas de negocio | Ver `06G-BUSINESS-RULES.md` §5 |
| KPIs / Criterios de éxito | % de cumplimiento (completadas/asignadas); tiempo promedio de ciclo |
| Automatización / IA | Content Creator, Video Campaign Advisor (`05A` #5, #8) completan la descripción |
| Dependencias / Relaciones / Integraciones | Depende de Campañas (opcional) y Usuarios (`assigned_to`) |
| Notificaciones / Reportes | Notificación al asignar/reportar avance (`MODULOS.md` #20) |
| Escalabilidad / Evolución | Soft delete ya implementado (`DATABASE.md` §2, `v16`); categorías personalizables por empresa **[FUTURO]** |

## 4. Contenido — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Gestionar el contenido real (copy, guion, pieza) de una actividad como entidad propia, no solo un campo de texto |
| Problema / Valor | Hoy `descripcion` de una actividad es un solo campo de texto libre — no hay versiones, no hay aprobación de contenido separada del estado de la tarea |
| Usuarios / Roles / Permisos | `company_admin`/`collaborator` redactan; `company_admin` aprueba |
| Entradas → Proceso → Salidas | Borrador → revisión → aprobado → listo para publicar (fuera de MAHP, sin integración directa todavía) |
| Reglas de negocio | Un contenido no aprobado no debería contar como "actividad completada" — regla nueva a definir si se construye |
| KPIs / Criterios de éxito | Tiempo entre borrador y aprobación |
| Automatización / IA | Content Creator, Copywriter, QA Advisor (`05A` #5, #6, #19) |
| Dependencias / Relaciones / Integraciones | Depende de Actividades; se integra con Redes Sociales para publicación directa (`06F`) |
| Escalabilidad / Evolución | Es el prerequisito funcional de cualquier integración de publicación directa a redes |

## 5. Redes Sociales — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Registrar y dar seguimiento al crecimiento de seguidores por canal |
| Problema / Valor | Consolida un dato que antes vivía disperso (capturas de pantalla, memoria) |
| Usuarios / Roles / Permisos | Reportan `company_admin`/`director`/`collaborator` (con permisos de insert distintos, ver `DATABASE.md` §5); todos leen dentro de su empresa |
| Entradas → Proceso → Salidas | Conteo antes/después por canal → `delta` calculado → historial + metas (`MODULOS.md` #16-17) |
| Reglas de negocio | Una sola meta activa por canal por empresa (`DATABASE.md` §5, `follower_goals`) |
| KPIs / Criterios de éxito | % de avance hacia meta (`pct_total`/`pct_gain`) |
| Automatización / IA | Social Media Manager (`05A` #10) |
| Dependencias / Relaciones / Integraciones | Candidato directo de integración con Meta/TikTok para captura automática en vez de manual (`06F`) |
| Escalabilidad / Evolución | El reporte manual es la limitación principal — integración directa es la evolución más valiosa de este módulo |

## 6. Influencers — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Gestionar relaciones y colaboraciones con creadores de contenido externos |
| Problema / Valor | Hoy no hay forma de registrar una colaboración con un influencer como parte de una campaña |
| Usuarios / Roles / Permisos | `company_admin` |
| Entradas → Proceso → Salidas | Datos de contacto + términos de colaboración → seguimiento de entregables → resultado (alcance, engagement reportado manualmente) |
| Reglas de negocio | A definir al priorizarse |
| KPIs / Criterios de éxito | Costo por resultado de colaboraciones con influencers |
| Automatización / IA | Ninguno del catálogo actual lo cubre directamente — candidato de nuevo agente si se construye |
| Dependencias / Relaciones / Integraciones | Se relaciona con Campañas y Presupuestos (§7) |
| Escalabilidad / Evolución | Baja prioridad hasta validar demanda real de clientes actuales |

## 7. Presupuestos — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Registrar y controlar el gasto planeado vs. real de una campaña |
| Problema / Valor | Hoy MAHP mide ejecución y resultado, pero no costo — una empresa no puede ver "cuánto me costó esta campaña" dentro del sistema |
| Usuarios / Roles / Permisos | `company_admin` define y controla; `director` solo lectura |
| Entradas → Proceso → Salidas | Presupuesto asignado por campaña → gasto registrado (manual o vía integración de pauta, `06F`) → variación |
| Reglas de negocio | Alertar si el gasto real supera el presupuesto planeado |
| KPIs / Criterios de éxito | % de campañas dentro de presupuesto |
| Automatización / IA | Advertising Advisor (`05A` #12) |
| Dependencias / Relaciones / Integraciones | Depende de Campañas; se enriquece con integración de pauta publicitaria (`06F`) |
| Escalabilidad / Evolución | Prerequisito para reportes financieros de marketing más completos |

## 8. Activos Digitales — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Biblioteca centralizada de imágenes, videos y logos reutilizables (Digital Asset Management) |
| Problema / Valor | Hoy las evidencias (`evidencias`, `MODULOS.md` #13) son subidas puntuales por tarea — no hay un banco de recursos de marca reutilizable entre campañas |
| Usuarios / Roles / Permisos | `company_admin`/`collaborator` suben; todos los roles de la empresa consultan |
| Entradas → Proceso → Salidas | Archivo + etiquetas → Storage (mismo patrón que Evidencias, `MODULOS.md` #13) → buscable por campaña/canal/tipo |
| Reglas de negocio | Distinto de Evidencias: un activo digital es reutilizable, una evidencia es prueba de un hecho puntual — no se fusionan aunque compartan infraestructura de Storage |
| KPIs / Criterios de éxito | Reutilización de assets entre campañas (evita recrear lo mismo) |
| Automatización / IA | Graphic & Creative Director (`05A` #7) podría sugerir assets existentes relevantes |
| Dependencias / Relaciones / Integraciones | Reutiliza Supabase Storage ya en uso por Evidencias |
| Escalabilidad / Evolución | Requiere buscador (`04B-COMPONENT-LIBRARY.md` §20, futuro) para ser útil a volumen |
