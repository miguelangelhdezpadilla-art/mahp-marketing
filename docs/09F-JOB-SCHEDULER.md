# JOB SCHEDULER — Planificador de Tareas

> MDS-010, Documento 7 de 10. Motor temporizado que despacha workflows,
> reintentos, esperas y tareas periódicas. No introduce infraestructura
> nueva — es la aplicación concreta del patrón `automation_queue` +
> `pg_cron` ya diseñado en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §13 y
> compartido con webhooks (`08F-EVENT-ARCHITECTURE.md` §3).
>
> **Estado: [FUTURO]**.
>
> Última actualización: 2026-07-12.

---

## 1. Una sola cola, varios consumidores

```
                 ┌───────────────────────────┐
                 │   automation_queue (tabla)   │
                 │  company_id, tipo, payload,   │
                 │  status, run_at, attempts     │
                 └───────────────┬───────────┘
                                 │
                pg_cron invoca cada N minutos
                                 │
                                 ▼
                 Edge Function "procesador de cola"
                                 │
        ┌────────────┬───────────┼────────────┬───────────┐
        ▼            ▼            ▼            ▼           ▼
   Paso de        Espera de    Webhook       Reintento    Tarea
   workflow       workflow     saliente      de acción    periódica
   (09A)          vencida      (08B)         fallida      (ej. escaneo
                  (09A §6)                   (09A §7)      de vencidas,
                                                            09C)
```

Es la misma tabla y el mismo procesador que `08F-EVENT-ARCHITECTURE.md` §3 ya reservó para webhooks — este documento no la duplica, define cómo el Workflow Engine (`09A`) y el Business Rules Engine (`09B`) la usan como un consumidor más, junto a webhooks y otras tareas periódicas del sistema.

## 2. Tipos de entrada en la cola

| Tipo | `run_at` | Ejemplo |
|---|---|---|
| Inmediata | Ahora | Un evento acaba de ocurrir, se encola su acción asociada |
| Diferida | Futuro, fijo | "Esperar 24 horas" dentro de un workflow (`09A-WORKFLOW-ENGINE.md` §6) |
| Recurrente | Se re-encola a sí misma tras ejecutarse | Escaneo periódico de `actividad.vencida` (`09C-EVENT-CATALOG.md`) — no hay un trigger 1:1 para ese evento, tiene que evaluarse periódicamente |
| Reintento | Futuro, calculado por backoff | Un paso de workflow que falló y todavía tiene reintentos disponibles (`09A` §7) |

## 3. Frecuencia de `pg_cron`

No se fija un número en este documento sin datos reales que lo respalden (`CLAUDE.md` §6 aplicado a compromisos técnicos) — el intervalo correcto depende del volumen real de la cola cuando exista, con el único requisito de diseño de que sea suficientemente frecuente para que una espera de "24 horas" no se retrase de forma perceptible (ej. cada 1–5 minutos es el rango típico para este patrón, a confirmar con carga real).

## 4. Reintentos y backoff

Mismo mecanismo ya fijado en `08B-WEBHOOKS.md` §4 y referenciado en `09A-WORKFLOW-ENGINE.md` §7 — no se define un tercer esquema de backoff distinto. Una entrada de la cola que agota sus reintentos se marca `fallido` permanentemente y dispara la notificación de error correspondiente (`09A` §8), nunca desaparece silenciosamente.

## 5. Concurrencia

**Riesgo a mitigar cuando se construya**: si el procesador se invoca cada N minutos pero una ejecución anterior todavía no termina, podría procesar la misma fila dos veces. Mitigación de diseño estándar: bloqueo optimista (`SELECT ... FOR UPDATE SKIP LOCKED`, patrón nativo de Postgres para colas) — cada fila se toma por un solo procesador a la vez, sin necesidad de infraestructura de locks externa. Se documenta como requisito de implementación futura, no se implementa en esta fase.

## 6. Límite reconocido

Mismo límite ya señalado en `08F-EVENT-ARCHITECTURE.md` §6 y `09-ENTERPRISE-AUTOMATION-PLATFORM.md` §10: válido hasta el volumen proyectado de decenas de miles de empresas con automatizaciones activas; una cola dedicada fuera de Postgres es la evolución esperada más allá de ese punto.

---

## KPIs

| KPI | Definición |
|---|---|
| Profundidad de cola | Filas pendientes en un momento dado — señal temprana de saturación |
| Latencia de procesamiento | Tiempo entre `run_at` y ejecución real |
| Tasa de fallo permanente | % de filas que agotan reintentos |
| Tareas recurrentes activas | Total de escaneos periódicos configurados (ej. `actividad.vencida`) |
