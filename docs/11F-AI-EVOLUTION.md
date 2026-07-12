# AI EVOLUTION — Evolución del Ecosistema de IA

> MDS-012, Documento 7 de 10. Los tres horizontes pedidos por esta fase
> (asistentes → agentes colaborativos → orquestación autónoma
> supervisada). **No redefine** `05-AI-ECOSYSTEM.md`/`05A`–`05E` (MDS-006)
> ni `09E-AI-ORCHESTRATION.md` (MDS-010) — los sitúa en una línea de
> tiempo, con el mismo principio no negociable de supervisión humana en
> los tres horizontes.
>
> Última actualización: 2026-07-12.

---

## Horizonte corto plazo — Asistentes inteligentes

**Estado: [PARCIAL], en curso.** Es donde MAHP está hoy: un asistente por tarea específica, invocado explícitamente por el usuario, sin memoria entre invocaciones (`05E-AI-MEMORY-AND-CONTEXT.md`, [FUTURO]). Calendar Planner (`IA.md`) es el único construido; `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §11 ya cataloga 6 más diseñados (Content Creator, Creative Director, KPI Advisor, Business Analyst, Campaign Optimizer, Automation Expert) — completar este horizonte es construir esos, no diseñar nada nuevo.

**Qué define este horizonte**: el usuario pide, la IA responde una vez, el usuario revisa y decide (`PROJECT-BLUEPRINT.md` §5, principio 3) — sin coordinación entre asistentes.

## Horizonte mediano plazo — Agentes colaborativos especializados

**Estado: [FUTURO], diseño ya existente.** Es el patrón "cadena" ya formalizado en `05-AI-ECOSYSTEM.md` §11 y `05B-AI-WORKFLOWS.md`: varios agentes encadenados, cada uno recibiendo el resultado del anterior, orquestados por un Marketing Strategist con reglas simples de delegación. `09E-AI-ORCHESTRATION.md` (MDS-010) ya formalizó este mismo patrón como una acción reutilizable del Workflow Engine — este horizonte se alcanza cuando ambos diseños (el de MDS-006 y el de MDS-010) se construyen juntos, no cuando se diseña un tercero.

**Qué define este horizonte**: varios agentes cooperan en una tarea compuesta (ej. "nueva campaña completa"), pero la coordinación sigue siendo una secuencia predecible (cadena), no negociación dinámica entre agentes — y sigue habiendo un punto de aprobación humana antes de cualquier efecto externo (`09G-APPROVAL-WORKFLOWS.md` §8).

## Horizonte largo plazo — Orquestación autónoma supervisada

**Estado: [FUTURO], sin diseño detallado todavía — el más especulativo de los tres.** `05-AI-ECOSYSTEM.md` §11 ya lo marcó como "candidato de V3+": comunicación dinámica entre agentes (un agente consulta a otro según necesidad, no un guion fijo), decisiones de delegación más sofisticadas que el mapeo simple actual.

**El límite no negociable, explícito en el propio documento de fase de MDS-012 y consistente con todo `/docs` hasta ahora**: "orquestación autónoma" nunca significa "sin supervisión humana para acciones críticas" — significa que la IA coordina más de su propio proceso interno (qué agente llamar, en qué orden, con qué prioridad) sin que un humano tenga que decidir cada paso intermedio, pero **el punto de aprobación antes de un efecto externo real no desaparece en ningún horizonte** (`09G-APPROVAL-WORKFLOWS.md` §8, ya lo fija como regla dura, no configurable por el cliente).

**Mecanismos de control que este horizonte requeriría, cuando se diseñe en detalle** (no se diseñan aquí, se listan como prerrequisitos): límites de gasto/costo por autonomía otorgada (extiende `05C-AI-GOVERNANCE.md`), auditoría de cada decisión autónoma (`CCEC-001A`, candidato de eventos nuevo), y un mecanismo de "pausa de emergencia" que un humano pueda activar para detener toda orquestación autónoma de una empresa de inmediato.

---

## Diagrama — los tres horizontes, con el mismo límite constante

```
CORTO PLAZO              MEDIANO PLAZO                LARGO PLAZO
Asistentes                Agentes en cadena            Orquestación autónoma
(uno a la vez,             (varios, secuencia            (coordinación dinámica,
invocado por                predecible,                  con mecanismos de
el usuario)                  Marketing Strategist          control/pausa)
    │                         delega)                          │
    │                             │                             │
    └─────────────────────────────┴─────────────────────────────┘
                                   │
              SIEMPRE: aprobación humana antes de efecto externo
              (09G-APPROVAL-WORKFLOWS.md §8 — constante en los 3 horizontes,
               nunca un horizonte "gradúa" fuera de este requisito)
```

---

## Condición de avance entre horizontes

No es una fecha — es evidencia de que el horizonte anterior está siendo usado establemente (mismo criterio de activación por demanda de todo `/docs`). Pasar de "corto" a "mediano" antes de que los 7 asistentes de corto plazo estén construidos y en uso real sería anticipación, no evolución.

---

## KPIs

Ver `05-AI-ECOSYSTEM.md` §11 (observabilidad de IA ya diseñada: qué agente, qué empresa, éxito/error, costo) — este documento agrega uno propio: **horizonte real vs. horizonte documentado** — señal honesta de en qué punto de esta línea de tiempo está MAHP en cada revisión de 6 meses de `11-ENTERPRISE-PRODUCT-STRATEGY.md`.
