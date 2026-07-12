# ENTERPRISE AUTOMATION PLATFORM — Plataforma de Automatización y Orquestación de MAHP

> MDS-010, Documento principal (1 de 10). Cómo MAHP coordina procesos
> empresariales completos — usuarios, agentes de IA, módulos internos, APIs
> externas, eventos y reglas de negocio — no solo cómo automatiza tareas
> sueltas.
>
> **Punto de partida real**: hoy la "automatización" de MAHP son triggers
> de Postgres fijos en código SQL (`DATABASE.md` §6–7) — reactivos, síncronos,
> no configurables por el cliente. El motor con reglas configurables por
> empresa (`automation_rules` + `automation_queue` + procesador vía
> `pg_cron`) ya está diseñado a nivel de arquitectura desde MDS-003
> (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §13) pero **no construido**. Este
> documento toma ese diseño de arquitectura y lo desarrolla a nivel de
> plataforma completa — workflows, reglas, plantillas, orquestación de IA,
> aprobaciones — sin implementarlo, conforme a las reglas de MDS-010.
>
> Convención de estado igual que el resto de `/docs`: **[EXISTE]** / **[FUTURO]** /
> **[PARCIAL]**.
>
> Última actualización: 2026-07-12.

---

## 1. Filosofía de Automatización

MAHP no automatiza para reemplazar personas — automatiza para que una persona no tenga que recordar hacer algo que el sistema ya sabe que debe pasar. Es la misma filosofía que ya rige la gamificación y las notificaciones actuales (`PROJECT-BLUEPRINT.md` §4: "la IA participa en el flujo central, no es un botón aparte") extendida a cualquier regla de negocio, no solo a las que hoy están fijas en triggers SQL.

Tres compromisos:

1. **Toda automatización tiene un dueño humano responsable**, aunque se ejecute sola — nunca una regla "huérfana" que nadie en la empresa cliente sabe que existe (`09I-AUTOMATION-GOVERNANCE.md`).
2. **Ninguna automatización se salta RLS ni el aislamiento multiempresa** — una regla de la Empresa A nunca puede leer ni escribir datos de la Empresa B, ejecutándose con los mismos límites que tendría el usuario que la configuró (mismo principio ya fijado para integraciones en `08-ENTERPRISE-INTEGRATION-PLATFORM.md` §1).
3. **Lo crítico siempre pasa por aprobación humana antes de tener efecto externo** — heredado directamente de `PROJECT-BLUEPRINT.md` §5 principio 3 ("la IA sugiere y genera; las personas deciden y publican"), extendido de "solo IA" a "toda automatización con efecto significativo" (`09G-APPROVAL-WORKFLOWS.md`).

## 2. Arquitectura General

```
                         EVENTO
        (insert/update en una tabla, acción de usuario,
         temporizador, o resultado de un agente de IA)
                            │
                            ▼
              ┌─────────────────────────┐
              │   BUSINESS RULES ENGINE    │  09B — ¿qué regla(s) de esta
              │   (evalúa condiciones)     │        empresa aplican a este evento?
              └─────────────┬─────────────┘
                            ▼
              ┌─────────────────────────┐
              │    WORKFLOW ENGINE         │  09A — ejecuta la secuencia de
              │  (orquesta la secuencia)   │        pasos: acciones, condiciones,
              └─────────────┬─────────────┘        esperas, ramificaciones
                            │
        ┌───────────────────┼───────────────────┬────────────────────┐
        ▼                   ▼                    ▼                    ▼
  Acción interna      Agente de IA         Integración externa   Solicitud de
  (crear actividad,   (09E — orquestación   (08-* — Meta,        aprobación
  notificar)          entre agentes)        WhatsApp, etc.)      (09G)
        │                   │                    │                    │
        └───────────────────┴────────────────────┴────────────────────┘
                            ▼
              ┌─────────────────────────┐
              │  JOB SCHEDULER / COLA      │  09F — igual patrón que
              │  (pg_cron + automation_    │        02-ARCHITECTURE §13,
              │   queue, reintentos)       │        reutilizado, no duplicado
              └─────────────┬─────────────┘        (ver 08F-EVENT-ARCHITECTURE §3)
                            ▼
                    Efecto real + registro
                    (observabilidad, §11)
```

**Decisión de diseño explícita**: la cola de despacho (`automation_queue`) es **la misma infraestructura** que `08F-EVENT-ARCHITECTURE.md` §3 ya reservó para webhooks — no se construyen dos colas paralelas. Un evento puede terminar disparando un webhook saliente (MDS-009) y una automatización interna (MDS-010) a la vez, desde el mismo catálogo de eventos (`09C-EVENT-CATALOG.md`, que extiende, no reemplaza, `08F-EVENT-ARCHITECTURE.md` §2).

## 3. Workflow Engine

Desarrollo completo en `09A-WORKFLOW-ENGINE.md`. Resumen: motor que ejecuta una secuencia de pasos (disparador → condiciones → acciones → ramificaciones → espera opcional → finalización), configurable por empresa, versionado, con reintentos y manejo de errores — la evolución natural de un trigger de Postgres fijo hacia una regla que el propio `company_admin` puede definir sin escribir SQL.

## 4. Event Engine

No se rediseña — es `08F-EVENT-ARCHITECTURE.md`, extendido con el catálogo completo de eventos empresariales en `09C-EVENT-CATALOG.md`. El Workflow Engine (§3) y el Business Rules Engine (§5) son **consumidores** del Event Engine, no una arquitectura de eventos separada.

## 5. Business Rules Engine

Desarrollo completo en `09B-BUSINESS-RULES-ENGINE.md`. Resumen: la capa que decide **si** un workflow debe ejecutarse (`SI ocurre X evento Y se cumplen condiciones Z, ENTONCES ejecutar workflow W`) — separada del Workflow Engine porque una misma condición puede disparar workflows distintos, y un mismo workflow puede ser disparado por reglas distintas; mezclar ambas responsabilidades en una sola tabla dificultaría reutilización.

## 6. AI Orchestration

Desarrollo completo en `09E-AI-ORCHESTRATION.md`. No introduce un modelo de colaboración de IA nuevo — formaliza y extiende el patrón "cadena" ya diseñado en `05-AI-ECOSYSTEM.md` §11 (orquestación secuencial, sin negociación dinámica entre agentes en V1) como **un tipo más de acción** que un Workflow puede invocar, con el mismo requisito no negociable de revisión humana antes de cualquier efecto externo (`PROJECT-BLUEPRINT.md` §5 principio 3).

## 7. Job Scheduler

Desarrollo completo en `09F-JOB-SCHEDULER.md`. Resumen: `pg_cron` + tabla de cola (`automation_queue`, compartida con webhooks — §2) para todo lo asíncrono/temporizado (esperas dentro de un workflow, recordatorios, reintentos) — sin infraestructura externa, mismo criterio de simplicidad ya fijado en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §13.

## 8. Notification Engine

Desarrollo completo en `09H-NOTIFICATION-ORCHESTRATION.md`. Unifica el canal in-app ya construido (`MODULOS.md` #20) con los canales futuros de `08C-INTEGRATIONS-CATALOG.md` (correo, WhatsApp, Slack, Teams, SMS, push) bajo una sola decisión de enrutamiento por evento y preferencia de usuario, en vez de que cada canal se configure por separado.

## 9. Approval Engine

Desarrollo completo en `09G-APPROVAL-WORKFLOWS.md`. Resumen: cualquier acción de una automatización marcada como "requiere aprobación" se detiene antes de tener efecto y genera una solicitud visible al rol correspondiente — mismo patrón ya validado en producción para contenido generado por IA (revisión antes de publicar, `IA.md` §4), generalizado a cualquier automatización, no solo IA.

## 10. Escalabilidad

Hereda directamente `07-ENTERPRISE-DATA-PLATFORM.md` §8 y `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §14: la cola basada en Postgres + `pg_cron` es válida hasta el escalón de decenas de miles de empresas con automatizaciones activas; una migración a infraestructura de colas dedicada (fuera de Postgres) es la evolución esperada más allá de ese punto, no una limitación no reconocida (mismo límite ya señalado en `08F-EVENT-ARCHITECTURE.md` §6).

## 11. Observabilidad

**[FUTURO]**, mismo gap estructural ya señalado en `07-ENTERPRISE-DATA-PLATFORM.md` §11 y `08F-EVENT-ARCHITECTURE.md` §5, ahora aplicado a workflows: estado de cada ejecución (pendiente/en curso/completado/fallido), historial completo por workflow, motivo de cada reintento, alertas cuando una automatización falla repetidamente. Es, junto con la auditoría de impersonación de `super_admin` (`07F-SECURITY-AND-AUDIT.md` §5), de los hallazgos de observabilidad más recurrentes en toda la documentación MDS — se consolida como prioridad transversal, no solo de esta fase.

## 12. Roadmap Evolutivo

| Fase | Qué se agrega | Condición de activación |
|---|---|---|
| MVP (ahora) | Nada — se documenta la plataforma, no se construye | Aprobación de este documento |
| V2 | `automation_rules` + `automation_queue` reales, con un catálogo mínimo de acciones (crear actividad, notificar, esperar) — el primer caso de uso real gana | Al menos un cliente pidiendo una regla que un trigger fijo no puede cubrir |
| V2 | Plantillas iniciales (`09D-AUTOMATION-TEMPLATES.md`) para los casos de uso ya validados del producto (recordatorios, seguimiento de KPIs) | Mismo trigger que el punto anterior |
| V3 | Workflow Engine visual (editor de flujos para `company_admin`, no solo reglas predefinidas por MAHP) | Adopción real de las reglas predefinidas de V2 que justifique dar control total al cliente |
| V3 | AI Orchestration como acción de workflow + Approval Engine generalizado | Cuando exista más de un agente de IA activo en producción (`05-AI-ECOSYSTEM.md` §9) |
| V3+ | Orquestación dinámica entre agentes de IA (fuera del patrón "cadena") | Solo si el volumen/complejidad real de solicitudes lo justifica — no antes (`05-AI-ECOSYSTEM.md` §11) |

---

## Diagramas

**Flujo de eventos → regla → workflow → acción, extremo a extremo:**

```
actividad.vencida (evento, 09C)
        │
        ▼
Business Rules Engine: ¿existe una regla de esta empresa para este evento?
        │ sí
        ▼
Workflow "Recordatorio de actividad vencida" (plantilla, 09D)
        │
        ├─▶ Acción: notificar al colaborador (Notification Engine, 09H)
        ├─▶ Espera: 24 horas
        └─▶ Condición: ¿sigue vencida? → sí → Acción: notificar a company_admin
                                        → no → Fin (sin acción adicional)
```

**Orquestación de IA dentro de un workflow (extiende `05B-AI-WORKFLOWS.md` §1):**

```
Workflow "Nueva campaña" (disparado por company_admin)
        │
        ▼
Acción tipo "Agente IA": Marketing Strategist → Campaign Planner →
Calendar Planner [ÚNICO PASO YA CONSTRUIDO HOY] → Content Creator → ...
        │
        ▼
Approval Engine: pausa el workflow, solicita revisión humana (09G)
        │ aprobado
        ▼
Acción: publicar (mismo camino de escritura que cualquier actividad manual)
```

---

## Checklist — validar cualquier automatización nueva antes de implementarla

- [ ] ¿Tiene un dueño humano responsable identificado, no solo un autor técnico?
- [ ] ¿Respeta el aislamiento multiempresa — se ejecuta con los límites de la empresa que la configuró, nunca con privilegios elevados?
- [ ] ¿Su efecto externo (publicación, mensaje a un cliente final, gasto) pasa por aprobación humana, o está explícitamente exenta con justificación documentada?
- [ ] ¿Reutiliza el catálogo de eventos existente (`09C`), o justifica por qué necesita un evento nuevo?
- [ ] ¿Tiene manejo de error y reintentos definidos, no solo el camino feliz?
- [ ] ¿Existe una condición de activación real (demanda de cliente), no solo anticipación?
- [ ] ¿Queda registrada en observabilidad (§11) desde su primera ejecución?

---

## Definition of Done

✓ Plataforma Empresarial de Automatización completamente documentada (este documento + 9 anexos).
✓ Motor de workflows definido (`09A`).
✓ Catálogo de eventos (`09C`, extiende `08F`).
✓ Motor de reglas de negocio (`09B`).
✓ Plantillas reutilizables (`09D`).
✓ Estrategia de orquestación de IA (`09E`).
✓ Estrategia de observabilidad (§11, `09I`).
✓ Diagramas completos (este documento + anexos).

---

## Entregable Final

**1. Resumen de la arquitectura propuesta**: un Business Rules Engine decide *si* actuar, un Workflow Engine decide *cómo* actuar (secuencia de pasos), ambos consumen el mismo catálogo de eventos que ya alimenta notificaciones y webhooks, y despachan sobre la misma cola Postgres+`pg_cron` ya diseñada desde MDS-003 — ninguna pieza nueva de infraestructura, solo la capa de configuración por encima de lo que ya existe.

**2. Workflows esenciales para el MVP**: ninguno es parte del MVP actual — igual que MDS-009, esta plataforma completa es [FUTURO]. Si se activara un primer caso, los candidatos de mayor valor con menor complejidad son: recordatorio de actividad vencida, notificación de meta de seguidores alcanzada, y seguimiento automático de KPI — los tres ya tienen sus datos de origen construidos (`actividades`, `follower_goals_progress`, `kpis`), solo falta la capa de regla configurable.

**3. Plan de implementación por fases**: ver §12 de este documento.

**4. Riesgos**:
- **Complejidad operativa**: un motor de reglas configurable por el cliente es, por diseño, más difícil de depurar que un trigger fijo en código — un `company_admin` puede crear una regla mal condicionada (bucle de notificaciones, workflow que nunca termina). Mitigación: límites duros desde el diseño (máximo de pasos por workflow, timeout obligatorio, ver `09A-WORKFLOW-ENGINE.md` §7).
- **Escalabilidad**: mismo límite ya reconocido de Postgres+`pg_cron` (§10) — aceptado hasta el volumen proyectado, no resuelto más allá.
- **Mantenimiento**: cada plantilla nueva (`09D`) es superficie a mantener — mismo criterio de MDS-009 de no construir sin demanda confirmada.
- **Gobernanza**: sin dueño claro de una automatización, una regla mal configurada puede operar indefinidamente sin que nadie la revise — mitigado en `09I-AUTOMATION-GOVERNANCE.md`.

**5. Métricas de impacto**: ver KPIs consolidados por documento (`09A` §9, `09B` §7, `09F` §6) — resumidas: procesos automatizados activos, tiempo ahorrado estimado (tareas que antes requerían acción manual), tasa de éxito vs. reintento vs. fallo, participación de IA por workflow, adopción de plantillas.

**6. Verificación de coherencia con MDS-001 a MDS-009**: revisado explícitamente contra `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §13–14, `05-AI-ECOSYSTEM.md` §9–11, `05B-AI-WORKFLOWS.md`, `07-ENTERPRISE-DATA-PLATFORM.md` y los 10 documentos de MDS-009 (en particular `08F-EVENT-ARCHITECTURE.md` §3, que ya reservaba explícitamente esta infraestructura de cola para no duplicarla — este documento cumple esa restricción). **Ninguna inconsistencia nueva detectada.** Se hereda, sin resolver por estar fuera de alcance, la misma inconsistencia ya reportada dos veces (índice desactualizado de `PROJECT-BLUEPRINT.md` desde MDS-005).

**No se implementó ningún cambio de código ni de producto en esta fase — solo documentación, conforme a las reglas de MDS-010.**
