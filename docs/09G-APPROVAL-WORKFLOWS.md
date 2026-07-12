# APPROVAL WORKFLOWS — Flujos de Aprobación

> MDS-010, Documento 8 de 10. Aprobaciones para contenido, campañas,
> presupuestos, usuarios, integraciones, configuraciones críticas y
> automatizaciones. Generaliza el patrón ya validado en producción para
> contenido de IA (`IA.md` §4) a cualquier acción de automatización con
> efecto significativo.
>
> **Estado: [PARCIAL]** — el caso de "revisar antes de publicar" ya existe
> para IA (construido); el motor de aprobación genérico reutilizable por
> cualquier workflow es **[FUTURO]**.
>
> Última actualización: 2026-07-12.

---

## 1. Lo que ya existe hoy

La generación de calendario con IA (`MODULOS.md` #21) ya implementa, sin llamarlo así, una aprobación: el resultado de `generar-calendario` se muestra en pantalla, el `company_admin` lo revisa y decide publicarlo o no, antes de que se escriba una sola fila real en `actividades` (`IA.md` §4). Este documento no reemplaza ese flujo — lo reconoce como la primera instancia real de "aprobación" en MAHP y diseña cómo generalizarlo.

## 2. Qué es una aprobación en este motor

Un paso especial de workflow (`09A-WORKFLOW-ENGINE.md` §4, tipo "Aprobación") que detiene la ejecución y crea una solicitud visible para un rol específico, hasta que alguien la apruebe o la rechace. El workflow no continúa —ni falla— mientras la solicitud está pendiente; queda en un estado explícito de "esperando aprobación", distinto de "en curso" o "fallido" (`09A` §9).

## 3. Categorías de aprobación de esta fase

| Categoría | Quién aprueba | Ya existe hoy |
|---|---|---|
| Contenido (generado por IA o manual) | `company_admin` | ✅ Parcial — ya existe para IA (`IA.md` §4), no generalizado a contenido manual |
| Campañas | `company_admin` | ❌ [FUTURO] |
| Presupuestos | `company_admin` | ❌ [FUTURO] — depende de que exista el módulo de Presupuestos (`06B-MARKETING-MODULES.md`, [FUTURO]) |
| Usuarios (invitaciones a roles sensibles) | `super_admin`/`company_admin` según regla ya vigente de `invites_insert` | 🟡 Parcial — la restricción de quién puede invitar a quién ya existe (`DATABASE.md` §3), pero como regla de RLS fija, no como un paso de aprobación configurable con posibilidad de rechazo explícito |
| Integraciones | `company_admin` | ❌ [FUTURO] — conectar una integración nueva (`08E-SECURITY.md` §2) es en sí mismo un acto que podría requerir aprobación de un segundo rol en empresas con controles internos más estrictos |
| Configuraciones críticas | `company_admin`/`super_admin` según el cambio | ❌ [FUTURO] |
| Automatizaciones (activar una regla nueva) | `company_admin` | ❌ [FUTURO] — mismo principio de `09-ENTERPRISE-AUTOMATION-PLATFORM.md` §1: toda automatización tiene un dueño humano, que la aprueba al crearla |

## 4. Flujo de una solicitud de aprobación

```
Workflow llega a un paso tipo "Aprobación"
        │
        ▼
Se crea una solicitud visible (notificación + panel, 09H-NOTIFICATION-ORCHESTRATION.md)
        │
        ▼
Workflow en estado "esperando aprobación" (no consume reintentos, no expira
por defecto — [FUTURO]: expiración configurable si nadie responde en X tiempo)
        │
   ┌─────┴─────┐
   ▼           ▼
Aprobado     Rechazado
   │           │
   ▼           ▼
Continúa    Workflow termina en estado "cancelado" (09A §9), se
al          notifica al autor con el motivo si se proporcionó uno
siguiente
paso
```

## 5. Quién puede aprobar

Determinado por rol, siguiendo exactamente la matriz de permisos ya existente (`06H-PERMISSIONS-MATRIX.md`) — este motor no introduce un concepto de "aprobador" separado de los 4 roles ya definidos. Un workflow de aprobación de presupuesto, por ejemplo, siempre resuelve a "quien tenga rol `company_admin` en esta empresa", no a una persona específica hardcodeada.

## 6. Delegación de aprobación

**[FUTURO, V3]**: que un `company_admin` pueda delegar temporalmente su capacidad de aprobar a un `director` (ej. durante vacaciones) — no en la V1, para no complejizar el modelo de permisos ya establecido antes de validar el motor de aprobación con casos simples.

## 7. Trazabilidad

Toda decisión de aprobación (quién, cuándo, aprobado/rechazado, motivo si se dio) se registra de forma permanente — mismo principio de historial append-only ya aplicado a `activity_updates`/`points_log` (`07D-DATA-LIFECYCLE.md` §5), extendido a decisiones de aprobación. Es también, directamente, un evento candidato para `audit_log` (extendiendo el gap de cobertura ya señalado en `07F-SECURITY-AND-AUDIT.md` §5) — una aprobación es, por definición, una decisión administrativa significativa.

## 8. Relación con IA Orchestration

Todo workflow con un paso de IA que termine en efecto externo pasa obligatoriamente por este motor, sin excepción configurable (`09E-AI-ORCHESTRATION.md` §7) — es la regla más estricta de todo el sistema de aprobaciones, no una categoría más entre iguales.

---

## KPIs

| KPI | Definición |
|---|---|
| Tiempo promedio de resolución | Desde solicitud hasta aprobación/rechazo |
| Tasa de aprobación | % aprobado vs. rechazado, por categoría |
| Solicitudes pendientes | Cuántas esperan respuesta en un momento dado — señal de cuello de botella si crece sin control |
| Automatizaciones aprobadas al crearse | % de reglas nuevas que efectivamente pasaron por aprobación explícita de su dueño (`09I-AUTOMATION-GOVERNANCE.md`) |
