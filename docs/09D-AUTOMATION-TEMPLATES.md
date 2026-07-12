# AUTOMATION TEMPLATES — Plantillas Reutilizables

> MDS-010, Documento 5 de 10. Plantillas para Marketing, Campañas,
> Publicaciones, Recordatorios, Aprobaciones, Reportes, Seguimiento de
> KPIs, Onboarding, Franquicias, Restaurantes y Gestión de equipos.
>
> **Estado: [FUTURO]** — depende de que exista primero el Workflow Engine
> (`09A`). Ninguna plantilla listada aquí está construida.
>
> Última actualización: 2026-07-12.

---

## 1. Por qué plantillas, no solo un motor libre

La mayoría de empresas cliente no deberían necesitar construir un workflow desde cero (`09A-WORKFLOW-ENGINE.md` §11) — necesitan resolver un puñado de necesidades recurrentes ya conocidas por MAHP a través de todo el catálogo de módulos ya diseñado. Una plantilla es un workflow predefinido por MAHP donde la empresa solo ajusta parámetros (destinatario, tiempo de espera, canal) — reduce el riesgo de que un cliente cree una automatización mal condicionada (`09-ENTERPRISE-AUTOMATION-PLATFORM.md` Entregable Final §4) al no tener que diseñar la lógica desde cero.

## 2. Catálogo de plantillas por categoría

### Marketing / Campañas / Publicaciones

| Plantilla | Dispara con | Acción |
|---|---|---|
| Recordatorio de campaña próxima a vencer | `campaigns.end_date` cercana | Notificar a `company_admin` con avance actual |
| Publicación programada | Fecha/hora configurada | Ejecuta la publicación vía integración (`08C-INTEGRATIONS-CATALOG.md`) cuando exista |
| Onboarding de campaña nueva | `campana.publicada` (`09C-EVENT-CATALOG.md`) | Notifica al equipo, crea recordatorio de primer reporte de avance |

### Recordatorios

| Plantilla | Dispara con | Acción |
|---|---|---|
| Actividad vencida | `actividad.vencida` (`09C`) | Notifica al colaborador; escala a `company_admin`/`director` tras N días (ejemplo ya usado en `09-*` §12) |
| Reporte de seguidores pendiente | Periodicidad configurada sin reporte reciente en `follower_logs` | Notifica al responsable del canal |

### Aprobaciones

| Plantilla | Dispara con | Acción |
|---|---|---|
| Aprobación de contenido generado por IA | `ia.calendario_generado` (`08F-EVENT-ARCHITECTURE.md` §2) | Ya es, en esencia, el flujo manual actual de revisión antes de publicar (`IA.md` §4) — esta plantilla lo formaliza como workflow configurable en vez de paso fijo de interfaz |
| Aprobación de presupuesto de campaña | Creación de campaña sobre un monto configurado | Pausa hasta aprobación de `company_admin` (`09G-APPROVAL-WORKFLOWS.md`) |

### Reportes

| Plantilla | Dispara con | Acción |
|---|---|---|
| Resumen semanal para `director` | Temporizador (todos los lunes) | Genera y envía resumen de avance (`07A-DOMAIN-MODEL.md` §9, `activity_updates`) — mismo caso de uso ya identificado como candidato de correo en `08C-INTEGRATIONS-CATALOG.md`, sección Correo |
| Reporte de gamificación mensual | Temporizador | Envía ranking del mes (`points_totals`) |

### Seguimiento de KPIs

| Plantilla | Dispara con | Acción |
|---|---|---|
| Alerta de KPI en riesgo | `kpis.current_value` por debajo de umbral esperado para la fecha | Notifica a `company_admin` |
| Meta de seguidores alcanzada | `seguidores.meta_alcanzada` (`08F` §2) | Notifica al equipo, sugiere definir nueva meta |

### Onboarding

| Plantilla | Dispara con | Acción |
|---|---|---|
| Bienvenida a nuevo colaborador | `usuario.invitado` usado (perfil creado) | Notificación de bienvenida + asignación de primera tarea guía (si existe) |
| Checklist de primeros pasos de empresa nueva | `empresa.creada` | Secuencia de recordatorios para completar configuración inicial |

### Franquicias / Restaurantes

**Todas [FUTURO], bloqueadas por la misma dependencia ya señalada dos veces** (`07A-DOMAIN-MODEL.md` §18, `09C-EVENT-CATALOG.md`, evento `sucursal.agregada`): sin modelo de datos de sucursales, estas plantillas no tienen sobre qué operar. Se documentan como diseño conceptual, no como algo que pueda construirse antes de resolver esa dependencia:

| Plantilla | Dispara con | Acción |
|---|---|---|
| Consolidado multi-sucursal | Temporizador | Reporte agregado de todas las sucursales de una empresa matriz |
| Reseña de Google Business recibida | Integración de Google (`08C-INTEGRATIONS-CATALOG.md`, Google Business) | Notifica a la sucursal correspondiente |

### Gestión de equipos

| Plantilla | Dispara con | Acción |
|---|---|---|
| Colaborador sin actividad reciente | Sin `activity_updates` en N días | Notifica a `company_admin`/`director` — señal de posible bloqueo o desenganche |
| Reasignación automática de pendientes al revocar acceso | `usuario.acceso_revocado` (`08F` §2) | Sugiere (no ejecuta automáticamente sin aprobación, `09G`) reasignar actividades del usuario revocado |

## 3. Cómo se versionan las plantillas

Igual que cualquier workflow (`09A-WORKFLOW-ENGINE.md` §10) — una plantilla mejorada por MAHP no altera retroactivamente las instancias ya creadas por empresas clientes a partir de una versión anterior; una empresa puede optar por actualizar a la versión nueva, no se le impone.

## 4. Cómo se prioriza qué plantilla construir primero

Estrictamente por evidencia de demanda, no por esta lista — el orden en que aparecen aquí es de agrupación temática, no de prioridad de construcción. La prioridad real se decide cuando exista el primer caso real que la active (`09-ENTERPRISE-AUTOMATION-PLATFORM.md` §12, Roadmap Evolutivo).

---

## KPIs

| KPI | Definición |
|---|---|
| Plantillas activas por empresa | Adopción real vs. catálogo disponible |
| Plantilla más instanciada | Señal de qué necesidad es más recurrente entre clientes |
| Personalización promedio | Cuánto se desvía cada instancia de los parámetros por defecto de la plantilla — señal de si la plantilla está bien calibrada o necesita ajustarse |
