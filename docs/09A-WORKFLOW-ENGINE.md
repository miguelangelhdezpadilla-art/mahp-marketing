# WORKFLOW ENGINE — Motor de Flujos de Trabajo

> MDS-010, Documento 2 de 10. Disparadores, condiciones, acciones,
> ramificaciones, esperas, temporizadores, reintentos, manejo de errores,
> finalización, versionado y reutilización de plantillas.
>
> **Estado: [FUTURO] en su totalidad.**
>
> Última actualización: 2026-07-12.

---

## 1. Qué es un workflow en MAHP

Una secuencia ordenada de pasos, disparada por un evento (`09C-EVENT-CATALOG.md`), que ejecuta acciones — internas, de IA, de integración o de aprobación — con ramificaciones y esperas opcionales, hasta llegar a un estado final. Es la generalización configurable de lo que hoy son triggers de Postgres fijos en código (`DATABASE.md` §6–7): mismo concepto (evento → efecto), con la diferencia de que un workflow lo define el `company_admin` sin escribir SQL, y puede tener más de un paso.

## 2. Disparadores (Triggers)

Un workflow se dispara por: (a) un evento del catálogo (`09C-EVENT-CATALOG.md`), vía el Business Rules Engine (`09B`) decidiendo que aplica, o (b) directamente por un temporizador (§6), sin evento de por medio (ej. "todos los lunes a las 9am"). No hay un tercer tipo de disparador en la V1 — mantener solo estos dos cubre los casos de uso identificados en `09D-AUTOMATION-TEMPLATES.md` sin sobre-diseñar.

## 3. Condiciones

Evaluadas en dos momentos distintos, con responsabilidades separadas:

- **Antes de iniciar** (pertenece al Business Rules Engine, `09B`): ¿esta regla aplica a este evento?
- **Dentro del workflow** (pertenece a este documento): ramificación entre pasos — "si la actividad sigue vencida después de 24h, notificar a `company_admin`; si no, terminar" (ejemplo ya usado en `09-ENTERPRISE-AUTOMATION-PLATFORM.md` §12, diagrama).

Sintaxis propuesta (conceptual, no técnica): comparación simple sobre campos de la entidad relacionada al evento (`actividad.status = 'pendiente'`, `follower_goals_progress.pct_total >= 100`) — sin lenguaje de expresión arbitrario en la V1, para no reabrir el riesgo de seguridad de ejecutar código no confiable definido por el cliente.

## 4. Acciones

Catálogo mínimo de tipos de acción que un paso de workflow puede ejecutar:

| Tipo de acción | Ejemplo | Reutiliza |
|---|---|---|
| Interna | Crear actividad, actualizar KPI | Mismo camino de escritura que un `insert`/`update` manual — RLS se sigue aplicando (`09-*` §1) |
| Notificación | Avisar a un rol/usuario específico | `09H-NOTIFICATION-ORCHESTRATION.md` |
| Agente de IA | Generar contenido, resumir avance | `09E-AI-ORCHESTRATION.md` |
| Integración externa | Publicar en Meta, enviar WhatsApp | `08-ENTERPRISE-INTEGRATION-PLATFORM.md` |
| Aprobación | Pausar hasta que un humano decida | `09G-APPROVAL-WORKFLOWS.md` |
| Espera | Detener el workflow N tiempo | §6 |

Ninguna acción tipo "ejecutar código arbitrario" existe en el catálogo — toda acción es una de estas seis categorías predefinidas, con parámetros, no una función libre. Es la misma decisión de seguridad que ya excluye lenguajes de expresión arbitrarios en §3.

## 5. Ramificaciones

Un paso puede tener más de una salida según una condición (§3) — estructura de árbol, no de grafo arbitrario en la V1 (sin ciclos): un workflow siempre progresa hacia un estado final, nunca puede configurarse para volver a un paso anterior indefinidamente. Esta restricción es deliberada — elimina por diseño la clase de error "workflow infinito" señalada como riesgo en `09-ENTERPRISE-AUTOMATION-PLATFORM.md` Entregable Final §4, en vez de mitigarla solo con límites de tiempo de ejecución.

## 6. Esperas y Temporizadores

Un paso "espera" detiene el workflow por un periodo fijo (`esperar 24 horas`) o hasta una condición temporal (`esperar hasta la fecha de la actividad`) antes de continuar al siguiente paso. Implementado sobre el Job Scheduler (`09F-JOB-SCHEDULER.md`) — el workflow no "duerme" ocupando un proceso, se reinserta en la cola con una fecha de ejecución futura, mismo patrón que cualquier reintento (§7).

## 7. Reintentos

Cada acción (§4) que dependa de un sistema externo (integración, agente de IA) tiene reintentos con backoff exponencial — mismo mecanismo ya diseñado para webhooks (`08B-WEBHOOKS.md` §4), reutilizado aquí, no reinventado. Un límite duro de reintentos (ej. 5) es obligatorio para toda acción — después de agotarse, el paso se marca como fallido (§8) y el workflow se detiene, nunca reintenta indefinidamente.

**Límites duros de diseño** (mitigación directa del riesgo de complejidad operativa señalado en el documento principal):
- Máximo de pasos por workflow (ej. 20) — un workflow que necesita más pasos probablemente debería dividirse en varios workflows encadenados por eventos.
- Timeout obligatorio por acción individual.
- Límite de reintentos obligatorio, sin opción de "reintentar para siempre".

## 8. Manejo de errores

Un paso fallido (reintentos agotados) detiene el workflow completo por defecto — no continúa silenciosamente a los siguientes pasos con un efecto parcial no verificado. Notifica al dueño responsable de la automatización (`09I-AUTOMATION-GOVERNANCE.md`) con el detalle del fallo. **[FUTURO, V3]**: manejo de errores configurable por paso (continuar/detener/rama alternativa) — no en la primera versión, para mantener el comportamiento predecible mientras se valida el motor con casos reales.

## 9. Finalización

Un workflow termina en uno de tres estados: **completado** (todos los pasos ejecutados con éxito), **fallido** (un paso agotó reintentos), o **cancelado** (una aprobación fue rechazada, `09G-APPROVAL-WORKFLOWS.md`). El estado final y su historial completo quedan registrados — mismo principio de "nada crítico se pierde" (`PROJECT-BLUEPRINT.md` §5 principio 4) aplicado a ejecuciones de workflow, no solo a datos de negocio.

## 10. Versionado de flujos

Un workflow editado no modifica las ejecuciones ya en curso de la versión anterior — mismo principio ya establecido para APIs (`08H-VERSIONING.md` §4): una ejecución en curso termina con la versión con la que empezó, una nueva ejecución usa la versión vigente. Evita el caso de un workflow que cambia de comportamiento a mitad de su propia ejecución.

## 11. Reutilización de plantillas

Un workflow puede crearse desde cero o instanciarse desde una plantilla (`09D-AUTOMATION-TEMPLATES.md`) — la plantilla define la estructura (pasos, tipos de acción), la empresa cliente solo ajusta parámetros (a quién notificar, después de cuánto tiempo) sin tocar la lógica. Es el camino recomendado para la mayoría de empresas cliente, que no deberían necesitar construir un workflow desde cero para los casos de uso comunes.

---

## KPIs

| KPI | Definición |
|---|---|
| Workflows activos | Total configurado y en uso por empresa |
| Tasa de éxito | % de ejecuciones que terminan "completado" sin reintentos |
| Tiempo promedio de ejecución | Desde disparo hasta finalización |
| Workflows desde plantilla vs. desde cero | Señal de si el catálogo de plantillas cubre la demanda real |
