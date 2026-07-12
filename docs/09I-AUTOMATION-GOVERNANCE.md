# AUTOMATION GOVERNANCE — Gobierno de Automatizaciones

> MDS-010, Documento 10 de 10. Observabilidad (logs, trazabilidad,
> auditoría, estado de flujos, historial, reintentos, alertas, métricas) y
> gobierno (propiedad, límites, revisión) de toda la plataforma de
> automatización. Cierra la fase MDS-010.
>
> Última actualización: 2026-07-12.

---

## 1. Por qué gobierno, no solo motor técnico

Un motor de automatización configurable es, por diseño, más fácil de usar mal que un trigger fijo en código (`09-ENTERPRISE-AUTOMATION-PLATFORM.md` Entregable Final §4, riesgo de complejidad operativa) — cuantas más personas pueden crear una regla, más importa que cada regla tenga dueño, límites y visibilidad. Este documento es la contraparte de gobierno de `09A`–`09H`, igual que `07B-DATA-GOVERNANCE.md` lo es de la plataforma de datos.

## 2. Propiedad

Toda automatización (regla, workflow, o instancia de plantilla) tiene un **dueño humano** desde su creación — quien la creó, salvo transferencia explícita. El dueño es responsable de: revisar alertas de fallo (§6), decidir si sigue activa, y es a quien se le atribuye si genera un efecto no deseado. Ninguna automatización puede existir sin dueño — es una validación obligatoria al crearla, mismo nivel de rigor que las validaciones ya fijadas en `09B-BUSINESS-RULES-ENGINE.md` §6.

## 3. Logs

Cada ejecución de workflow registra: qué lo disparó (evento + regla), cada paso ejecutado con su resultado, tiempo de cada paso, y el estado final (`09A-WORKFLOW-ENGINE.md` §9). No es un log técnico opaco — debe ser legible por el `company_admin` dueño de la automatización, no solo por quien la construyó técnicamente.

## 4. Trazabilidad

Toda acción ejecutada por una automatización queda marcada como tal en el dato que produce (ej. una actividad creada por un workflow lleva un origen distinguible de una creada manualmente) — extiende el mismo principio ya aplicado a actividades generadas por IA, que viven en la misma tabla con las mismas reglas pero siguen siendo identificables en su origen cuando hace falta (`PROJECT-BLUEPRINT.md` §4).

## 5. Auditoría

Eventos de gobierno que deben quedar en `audit_log` (extendiendo, una vez más, el gap ya señalado repetidamente en `07F-SECURITY-AND-AUDIT.md` §5, `08E-SECURITY.md` §5, `08B-WEBHOOKS.md` §7): automatización creada/desactivada, cambio de dueño, aprobación/rechazo de una automatización nueva (`09G-APPROVAL-WORKFLOWS.md` §3, categoría "Automatizaciones"). Este documento consolida el patrón: **toda capa nueva de MAHP desde MDS-008 ha señalado el mismo gap de auditoría operativa** — se recomienda, fuera del alcance de esta fase, tratarlo como un proyecto propio antes de construir cualquiera de estas plataformas, no seguir posponiéndolo fase tras fase.

## 6. Alertas

Una automatización que falla repetidamente (agota reintentos más de N veces en un periodo) genera una alerta a su dueño, no solo un registro pasivo en el log — la diferencia entre observabilidad pasiva (§3) y alerta activa es que la segunda requiere que alguien la vea sin tener que ir a buscarla.

## 7. Historial

Igual que cualquier dato de negocio con valor de trazabilidad (`07D-DATA-LIFECYCLE.md` §5), el historial de ejecuciones es append-only — nunca se sobreescribe una ejecución pasada, incluso si el workflow se edita después (`09A-WORKFLOW-ENGINE.md` §10, versionado).

## 8. Reintentos — gobierno, no solo mecánica

Complementa `09A-WORKFLOW-ENGINE.md` §7 (los límites técnicos) con la pregunta de gobierno: ¿quién decide cuándo un reintento agotado se reintenta manualmente? Respuesta: el dueño de la automatización (§2), nunca automático más allá del límite ya configurado — reintentar manualmente después de un fallo es una decisión consciente, no un botón que "simplemente lo vuelve a intentar" sin que alguien haya revisado por qué falló.

## 9. Métricas

Ver KPIs consolidados por documento. Métrica de gobierno específica de este documento: **% de automatizaciones activas con dueño identificado y activo en la empresa** (no un usuario cuyo acceso ya fue revocado, `07A-DOMAIN-MODEL.md` §2) — una automatización sin dueño activo es, por definición, una automatización huérfana y debe señalarse para revisión, nunca seguir ejecutándose indefinidamente sin que nadie la posea.

## 10. Límites de plataforma (no solo por workflow)

Complementando los límites por workflow ya fijados (`09A-WORKFLOW-ENGINE.md` §7: máximo de pasos, timeout, reintentos), a nivel de plataforma:

- Límite de automatizaciones activas simultáneas por empresa (evita que una sola empresa sature la cola compartida, `09F-JOB-SCHEDULER.md` §6).
- Límite de eventos generados por una sola automatización en una ventana de tiempo (previene el caso de una regla mal condicionada generando un volumen anómalo de notificaciones/acciones).

Ambos límites son configurables por plan/tier cuando exista un modelo de negocio de planes (`08C-INTEGRATIONS-CATALOG.md`, Stripe/Mercado Pago) — en la V1, un límite fijo conservador aplicable a todas las empresas es suficiente.

## 11. Revisión periódica

**[FUTURO]**: recordatorio automático al dueño de una automatización que no ha tenido actividad (ni éxito ni fallo — señal de que el evento que la dispara simplemente no ha ocurrido) en un periodo largo, para que confirme si sigue siendo necesaria — evita la acumulación silenciosa de automatizaciones olvidadas, mismo espíritu que la retención de datos (`07B-DATA-GOVERNANCE.md` §7) pero aplicado a configuración, no a datos.

---

## KPIs de gobierno

| KPI | Definición |
|---|---|
| Automatizaciones con dueño activo | % del total — objetivo: 100% |
| Automatizaciones huérfanas detectadas | Dueño con acceso revocado, sin reasignar |
| Cobertura de auditoría de gobierno | % de eventos de §5 efectivamente registrados en `audit_log` cuando se construya |
| Alertas atendidas vs. ignoradas | Señal de si el mecanismo de alerta (§6) realmente cambia comportamiento |

---

## Cierre de MDS-010

Con este documento se completan los 10 entregables de la fase (`09` + `09A`–`09I`). Ver `09-ENTERPRISE-AUTOMATION-PLATFORM.md`, sección "Entregable Final", para el resumen ejecutivo, workflows esenciales, hoja de ruta por fases y verificación de coherencia con MDS-001 a MDS-009 requeridos por el documento de fase.

**Hallazgo transversal de esta fase, elevado explícitamente para las siguientes (MDS-011 SaaS Platform Blueprint, MDS-012 Enterprise Product Roadmap)**: el gap de auditoría operativa (impersonación de `super_admin`, eventos de datos, eventos de integración, eventos de automatización) se ha señalado de forma independiente en cuatro fases consecutivas (MDS-008, MDS-009, MDS-010 §5 de este documento). Se recomienda que una futura fase lo trate como proyecto propio de auditoría unificada, en vez de seguir acumulándolo como nota recurrente.
