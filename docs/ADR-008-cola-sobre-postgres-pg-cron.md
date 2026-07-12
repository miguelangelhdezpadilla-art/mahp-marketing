# ADR-008 — Cola de eventos/automatización sobre Postgres + `pg_cron`, sin broker externo

Estado: Aceptado
Fecha: (retroactivo — diseñado en MDS-003, extendido en MDS-009/010, formalizado como ADR el 2026-07-12)
Decisores: Chief Product Owner

## Contexto

Automatizaciones configurables por el cliente y webhooks salientes necesitan reintentos, backoff y tolerancia a fallos de servicios externos — algo que un trigger síncrono de Postgres no maneja bien, pero que tampoco justificaba adoptar infraestructura de mensajería dedicada (Redis, RabbitMQ, SQS) sin volumen real que la necesitara.

## Decisión

Una tabla de cola en el propio Postgres (`automation_queue`, compartida entre automatizaciones y webhooks — `08F-EVENT-ARCHITECTURE.md` §3) más `pg_cron` (ya disponible en Supabase) invocando periódicamente una Edge Function procesadora, con `SELECT ... FOR UPDATE SKIP LOCKED` para evitar procesamiento duplicado.

## Alternativas consideradas

- **Broker de mensajes dedicado (Redis/RabbitMQ/SQS)**: mejor rendimiento a alto volumen y patrones de pub/sub más sofisticados, pero es infraestructura adicional a operar, pagar y mantener — complejidad no justificada al volumen actual (cero automatizaciones en producción todavía).
- **Triggers síncronos para todo, sin cola**: ya descartado explícitamente en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §13 — una automatización configurable puede fallar por causas externas (integración caída) y necesita reintento con registro, algo que un trigger síncrono no puede ofrecer sin bloquear la transacción original.

## Consecuencias

**Se gana**: una sola pieza de infraestructura (la ya existente base de datos) sirve tanto para datos como para colas; sin costo ni operación adicional; suficiente para el volumen proyectado hasta decenas de miles de empresas.

**Se sacrifica/queda pendiente**: techo de rendimiento reconocido explícitamente — si el volumen de eventos por segundo superara lo que `pg_cron` cada pocos minutos puede sostener, esta decisión se revisaría hacia un broker dedicado; no es la arquitectura final para escala masiva, es la correcta para el tamaño actual y varios órdenes de magnitud por delante.

## Referencias

`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §13, `08F-EVENT-ARCHITECTURE.md` §3/§6, `09F-JOB-SCHEDULER.md`, `07-ENTERPRISE-DATA-PLATFORM.md` §8.
