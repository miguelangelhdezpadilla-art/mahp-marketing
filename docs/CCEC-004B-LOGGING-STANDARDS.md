# CCEC-004B — Estándares de Logging

> Formato común de logs técnicos, distinto de auditoría (`CCEC-001`) y de
> métricas agregadas (`CCEC-004A`). Responde "¿qué pasó exactamente en este
> evento técnico específico?", con todo el detalle necesario para depurar.
>
> Última actualización: 2026-07-12.

---

## 1. Qué es un log en esta CCEC (y qué no es)

Un log es el detalle crudo de una ejecución técnica individual — una invocación de Edge Function, un paso de workflow, un intento de entrega de webhook. **No es** un registro de negocio (eso vive en la tabla correspondiente del dominio, `07E-ENTITY-CATALOG.md`) ni un evento de auditoría (`CCEC-001`). La prueba de qué es qué: si el registro tiene valor para "depurar por qué algo falló técnicamente", es un log; si tiene valor para "demostrar quién hizo qué", es auditoría; si tiene valor de negocio permanente para el cliente, es una tabla de dominio.

## 2. Formato común

Todo log estructurado (no texto libre) con al menos: `timestamp`, `company_id` (cuando aplica), `component` (qué pieza lo generó — Edge Function, Workflow Engine, procesador de cola), `level` (`info`/`warn`/`error`), `message`, `context` (jsonb, detalle específico del evento). Mismo principio de estructura que `audit_log.details` (`DATABASE.md` §7) — jsonb para flexibilidad, sin perder consultabilidad de los campos fijos.

## 3. Dónde viven los logs hoy

- **Logs de Postgres/PostgREST**: nativos de Supabase, fuera del control de la aplicación — MAHP los consulta cuando hace falta, no los reimplementa.
- **Logs de Edge Functions**: nativos de Supabase (consola de funciones) — mismo criterio.
- **Logs de dominio propios de MAHP** (los que si necesitan tabla propia): `webhook_deliveries` (`08B-WEBHOOKS.md` §6), historial de ejecución de workflows (`09A-WORKFLOW-ENGINE.md` §9), futuro log de entregas de notificación multicanal (`09H-NOTIFICATION-ORCHESTRATION.md` §8) — los tres siguen el mismo formato de §2, no cada uno el suyo.

## 4. Niveles

| Nivel | Cuándo | Ejemplo |
|---|---|---|
| `info` | Operación normal completada | Paso de workflow ejecutado con éxito |
| `warn` | Algo no ideal pero no bloqueante | Reintento consumido, todavía quedan disponibles |
| `error` | Operación falló | Reintentos agotados, integración rechazó la solicitud |

Ningún log usa niveles adicionales (`debug`, `trace`, `fatal`) en la V1 — tres niveles cubren toda decisión de severidad necesaria hoy; agregar más es complejidad sin necesidad demostrada (`PROJECT-BLUEPRINT.md` §5, principio 5).

## 5. Qué nunca va en un log

- Secretos, tokens, contraseñas — ni siquiera parcialmente (mismo principio que `CLAUDE.md` §5, aplicado a logs, no solo a código fuente).
- Datos personales más allá de lo estrictamente necesario para depurar (`07B-DATA-GOVERNANCE.md` §11) — un log de fallo de webhook necesita la URL de destino, no necesita el contenido completo del payload de negocio si ya está disponible en la tabla de origen.

## 6. Retención

Corta y con rotación — opuesto deliberado a la retención indefinida de auditoría (`CCEC-001B` §4). Un log técnico pierde valor rápido una vez que el incidente que documenta está resuelto; conservarlo indefinidamente es costo sin beneficio. Ventana propuesta: 30–90 días para logs de dominio propios de MAHP (`webhook_deliveries`, historial de workflows) — número a ajustar con necesidad operativa real, no una decisión final de este documento.

## 7. Correlación entre logs

Todo log que resulte de un workflow o cadena de eventos (`09-ENTERPRISE-AUTOMATION-PLATFORM.md`) lleva un identificador de ejecución común (`execution_id`) para poder reconstruir la secuencia completa de un workflow fallido a través de sus distintos pasos/componentes — sin esto, depurar un workflow de varios pasos requeriría buscar manualmente en logs dispersos sin relación explícita entre ellos.

---

## KPI de esta CCEC misma

**Cobertura de componentes instrumentados**: % de componentes del sistema (Edge Functions, Workflow Engine, procesador de cola, adaptadores de integración) que efectivamente emiten logs en este formato común, vs. los que todavía no lo hacen.
