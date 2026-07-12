# ENTERPRISE PRODUCT STRATEGY — Estrategia de Producto, Roadmap y Crecimiento de MAHP

> MDS-012, Documento principal (1 de 10) — **capítulo de cierre del MAHP
> Master Manual**. Unifica visión, estrategia empresarial, roadmap
> tecnológico, crecimiento comercial, evolución de IA y expansión
> internacional. No redefine lo ya decidido en MDS-001 a MDS-011 — lo
> integra, lo valida, y donde encuentra vacíos o contradicciones, los
> señala explícitamente en vez de rellenarlos con una decisión nueva no
> autorizada.
>
> **Nota de alcance sobre ADR**: el documento de fase de MDS-012 pide
> respetar "Architecture Decision Records (ADR)" junto con los CCEC. Se
> verificó `/docs` completo antes de escribir esta fase: **no existe
> ningún documento ADR todavía** — es un hallazgo de esta misma fase (ver
> §14 y el Entregable Final), no un error de este documento.
>
> Última actualización: 2026-07-12.

---

## 1. Visión

Ya desarrollada completa en `VISION.md` (capítulo 2 de `PROJECT-BLUEPRINT.md`) — no se repite aquí. En una frase: *"ser el sistema operativo donde cualquier empresa planea, ejecuta, mide y mejora su marketing — con inteligencia artificial integrada en cada paso, no como una función aparte."*

## 2. Misión

Ya desarrollada en `PROJECT-BLUEPRINT.md` §3 — no se repite. Resumen: dar a cualquier empresa que hace marketing en serio una sola fuente de verdad, con visibilidad distinta por rol, en vez de hojas de cálculo y reportes armados a mano.

## 3. Valores

No estaban formalizados como lista independiente en ningún documento previo — se derivan aquí, por primera vez, de los principios ya codificados en `PROJECT-BLUEPRINT.md` §5 y aplicados consistentemente en 79+ documentos de `/docs`:

1. **Verificar antes de asumir.** Ningún documento de este proyecto presenta algo como construido sin comprobarlo contra el código o el esquema real (`CLAUDE.md` §2) — es, en la práctica, el valor más aplicado de todos.
2. **La seguridad vive en el sistema, no en la promesa.** RLS, no una casilla de interfaz, decide quién ve qué.
3. **Honestidad de estado sobre optimismo de producto.** Un documento marca [FUTURO] en vez de fingir que algo existe — incluso cuando eso significa admitir, como en `10E-BACKUP-AND-DISASTER-RECOVERY.md`, que hoy no hay backups reales.
4. **Nada crítico se pierde.** Soft delete, historial append-only, y ahora respaldo semanal — la misma convicción aplicada en capas distintas.
5. **La IA acelera, las personas deciden.** Ningún flujo de IA tiene efecto externo sin aprobación humana.

## 4. Principios Estratégicos

Extensión de negocio de los principios técnicos ya fijados (`PROJECT-BLUEPRINT.md` §5):

1. **No construir por anticipación.** Cada capacidad de MDS-009/010/011 tiene una condición de activación explícita (demanda real de cliente), no un calendario — es el principio individual más repetido en toda esta documentación.
2. **Cada fase que encuentra un gap lo reporta antes de proponer cambios.** Establecido como práctica desde MDS-008 y mantenido sin excepción hasta esta fase.
3. **Las capacidades transversales se definen una vez (CCEC), no por dominio.** Evita que auditoría, observabilidad, o cualquier futura capacidad compartida se reinvente cuatro veces como ya ocurrió antes de crear `CCEC-001`/`CCEC-004`.
4. **El crecimiento comercial y el técnico son caminos independientes.** El modelo multi-tenant ya soporta miles de empresas sin cambio estructural (`07H-MULTI-TENANT-DESIGN.md` §7) — lo que limita el crecimiento es la capa comercial/operativa (`10B`, `10H`), no la arquitectura.

## 5–8. Roadmap a 12 meses / 3 años / 5 años / Visión a 10 años

Desarrollo completo en `11A-PRODUCT-ROADMAP.md` (fases MVP → Enterprise) y `11I-LONG-TERM-VISION.md` (horizonte 10 años). No se duplican aquí.

## 9. Estrategia de Crecimiento

Desarrollo completo en `11B-BUSINESS-GROWTH.md`, que **extiende, no repite**, `10I-GROWTH-STRATEGY.md` (MDS-011, ya cubrió el ángulo operativo del crecimiento) — este documento cubre el ángulo comercial/estratégico (segmentación, adquisición, retención).

## 10. Estrategia de Internacionalización

Desarrollo completo en `11C-MARKET-EXPANSION.md`, que construye sobre los prerrequisitos ya identificados en `10I-GROWTH-STRATEGY.md` §2 (i18n, multi-moneda, residencia de datos) sin repetirlos.

## 11. Estrategia de Innovación

Desarrollo completo en `11E-INNOVATION-ROADMAP.md`.

## 12. Evolución del Ecosistema de IA

Desarrollo completo en `11F-AI-EVOLUTION.md`, que **no redefine** el ecosistema ya diseñado en `05-AI-ECOSYSTEM.md`/`05A`–`05E` (MDS-006) ni la orquestación ya formalizada en `09E-AI-ORCHESTRATION.md` (MDS-010) — sitúa ambos en los tres horizontes temporales que pide esta fase (asistentes → agentes colaborativos → orquestación autónoma supervisada).

## 13. Estrategia de Módulos Futuros

Ya catalogados completos en `06J-FUTURE-MODULES.md` (CRM, Inventario, Ventas, Compras, Finanzas, RH, Franquicias, BI, App Móvil, Marketplace) — no se repiten. Este documento agrega únicamente el criterio de secuenciación: ver §20 (Criterios para incorporar nuevas funcionalidades).

## 14. Gobierno del Producto

**Roles y responsabilidades**: `CLAUDE.md` ya define el rol de cualquier asistente de IA en el proyecto; este documento agrega el rol humano — Chief Product Owner (dueño único de decisiones de alcance y aprobación, `CLAUDE.md` §8) como responsable final de todo lo documentado en `/docs`.

**Gestión del backlog y priorización**: hoy vive implícitamente en `ROADMAP.md` (fases con estado ✅/🟡/⚪) y en los marcadores [EXISTE]/[FUTURO]/[PARCIAL] repetidos en cada documento MDS — no existe una herramienta de backlog separada (Jira, Linear), ni se propone adoptar una sin necesidad demostrada (mismo principio de simplicidad).

**Architecture Decision Records (ADR)**: **no existen todavía** — hallazgo de esta fase. Un ADR documenta *por qué* se tomó una decisión arquitectónica específica (ej. "por qué RLS por columna y no por schema", "por qué GitHub Pages y no Vercel") en el momento en que se tomó, con las alternativas consideradas — es distinto de un MDS (que diseña hacia adelante) y de un CCEC (que define una capacidad compartida). Su ausencia no bloqueó ninguna fase anterior porque las decisiones ya tomadas están documentadas dentro de los MDS correspondientes (ej. la decisión de multi-tenant por columna está en `07H`) — pero un ADR dedicado preservaría el *razonamiento* y las alternativas descartadas, que hoy se pierden. Se recomienda como iniciativa a evaluar después de esta fase, no se crea aquí sin aprobación explícita (mismo criterio que llevó a proponer el alcance de `CCEC-001`/`CCEC-004` antes de escribirlos).

**Cross-Cutting Enterprise Capabilities (CCEC)**: `CCEC-001` (Auditoría) y `CCEC-004` (Observabilidad) ya existen y están correctamente integrados por `MDS-011`. Este documento no agrega una tercera CCEC sin evidencia de necesidad repetida — mismo criterio usado para decidir crearlas la primera vez (§1 de `CCEC-001`: "el mismo hallazgo se reportó de forma independiente... cuatro fases seguidas").

**Gestión documental, versionado y revisiones**: ya establecido — `CHANGELOG.md` como bitácora, revisión cada 90 días declarada en el encabezado de cada MDS/CCEC, cada 6 meses para este documento de estrategia (según su propia ficha).

**Gestión de cambios**: hereda `10D-OPERATIONAL-EXCELLENCE.md` §3 para cambios de producto/esquema; a nivel de estrategia, ningún documento de `/docs` se reescribe retroactivamente — se corrige con una entrada nueva de `CHANGELOG.md` y una actualización fechada, mismo principio que `supabase_schema_vN.sql` nunca se edita una vez aplicado.

## 15. Gestión del Portafolio

MAHP tiene hoy un solo producto (no un portafolio de productos separados) — "gestión de portafolio" en este contexto significa priorizar entre los ~10 dominios documentados (Core, Marketing, Operaciones, Analytics, Gamificación, IA, Integraciones, Automatización, SaaS/Operación) qué recibe inversión de ingeniería primero. Criterio: mismo que rige todo `/docs` — demanda real de cliente sobre anticipación, con la única excepción ya aceptada de `10E` §2 (backup), que se actuó sin esperar más clientes por ser un riesgo activo, no uno proyectado.

## 16. Gestión del Ciclo de Vida del Producto

Aplicando el mismo patrón ya usado para datos (`07D-DATA-LIFECYCLE.md`) a nivel de funcionalidad: toda capacidad nace [FUTURO] (diseñada) → pasa a [PARCIAL]/[EXISTE] cuando se construye → puede eventualmente deprecarse (ninguna lo ha hecho todavía) siguiendo el mismo estándar de compatibilidad hacia atrás de `08H-VERSIONING.md` aplicado más allá de APIs.

## 17. Indicadores Estratégicos

Desarrollo completo en `11H-SUCCESS-METRICS.md`.

## 18. Riesgos y Planes de Mitigación

Desarrollo completo en `11G-RISK-MANAGEMENT.md`.

## 19. Modelo de Mejora Continua

Revisión trimestral de KPIs estratégicos (`11H`) + revisión de 90 días de cada MDS/CCEC ya establecida + este documento cada 6 meses — no se propone un proceso adicional de mejora continua separado (retrospectivas formales, etc.) sin equipo lo bastante grande para necesitarlo (`10D-OPERATIONAL-EXCELLENCE.md` §7, hoy una sola persona en operación).

## 20. Criterios para Incorporar Nuevas Funcionalidades

Formalización explícita del principio más repetido de todo `/docs` — checklist oficial:

- [ ] ¿Existe demanda real y confirmada (no proyectada) de al menos un cliente?
- [ ] ¿Se verificó que no duplica una capacidad ya diseñada o construida (`CLAUDE.md` §2)?
- [ ] ¿Respeta el modelo de aislamiento multiempresa y RLS como única autorización real?
- [ ] ¿Se identificó su dominio de datos (`07A-DOMAIN-MODEL.md`) y, si aplica, sus eventos de auditoría (`CCEC-001A`) y observabilidad (`CCEC-004A`)?
- [ ] ¿Se diseñó en `/docs` antes de implementarse en código (`PROJECT-BLUEPRINT.md`, filosofía fundacional)?
- [ ] ¿Tiene un dueño responsable claro, consistente con `09I-AUTOMATION-GOVERNANCE.md` §2 aplicado más allá de automatizaciones?

---

## Diagramas

**Evolución del producto — de MVP a Enterprise:**

```
FASE 1: MVP (hoy)          FASE 2: Early         FASE 3: Escalamiento    FASE 4: Expansión      FASE 5: Enterprise
Un cliente, sin planes,    Adopters               Nacional                Internacional           Plataforma completa
sin backups reales         Planes básicos (10B),   Soporte por niveles     i18n, multi-moneda,     SLA formal, ADR
(ya mitigado con           primeras integraciones  (10H), CCEC en uso      residencia de datos     maduro, marketplace
respaldo manual, 10E)      reales (08-*)           real, primer ADR        (10I §2)                activo (08I)
```

**Ecosistema MAHP consolidado** (integra todos los MDS/CCEC de esta serie):

```
                    ┌─────────────────────────────┐
                    │   11 · ESTRATEGIA (este doc)   │
                    └───────────────┬─────────────┘
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                             ▼
   07 · DATOS                  08 · INTEGRACIÓN              09 · AUTOMATIZACIÓN
   (dominio, gobierno,         (API, webhooks,                (workflows, reglas,
   calidad)                    marketplace)                   orquestación IA)
        │                           │                             │
        └───────────────┬───────────┴──────────────┬──────────────┘
                         ▼                           ▼
                  CCEC-001 · AUDITORÍA        CCEC-004 · OBSERVABILIDAD
                         │                           │
                         └─────────────┬─────────────┘
                                       ▼
                          10 · SAAS / OPERACIÓN
                          (multi-tenant, planes, soporte, SLA)
```

---

## Checklist — Definition of Done de esta fase

- [x] Estrategia de producto de largo plazo (este documento + `11I`).
- [x] Roadmap priorizado (`11A`).
- [x] Estrategia comercial (`11B`, `11D`).
- [x] Estrategia de internacionalización (`11C`).
- [x] Plan de evolución de IA (`11F`).
- [x] Métricas estratégicas (`11H`).
- [x] Modelo de gobierno del producto (§14 de este documento).
- [x] Coherencia con MDS-001 a MDS-011, CCEC y ADR verificada (ver Entregable Final §6).

---

## Entregable Final

**1. Resumen de la estrategia integral**: MAHP evoluciona de un MVP de un solo cliente hacia una plataforma SaaS multiempresa por demanda real, nunca por anticipación — el mismo principio que ha gobernado cada fase de documentación desde MDS-008 se eleva aquí a principio estratégico oficial (§4). La arquitectura técnica (multi-tenant, RLS, IA integrada al flujo central) ya soporta la visión a 10 años sin rediseño; lo que falta construir es casi enteramente la capa comercial/operativa (planes, soporte, SLA) y la disciplina de gobierno (ADR).

**2. Prioridades para los próximos 12 meses**: ver `11A-PRODUCT-ROADMAP.md` Fase 1–2. Resumen: (a) confirmar el nivel real de backup — pendiente desde `10E`, con mitigación ya activa; (b) activar `10B` (planes/facturación) en cuanto exista un segundo cliente con necesidades de facturación distintas; (c) cerrar el hueco de versionado de `social_channels`/`follower_logs` (`DATABASE.md` §9, pendiente desde antes de esta serie de fases).

**3. Plan de ejecución por trimestres**: ver `11A-PRODUCT-ROADMAP.md` §5.

**4. Mayores riesgos estratégicos**: ver `11G-RISK-MANAGEMENT.md` — el de mayor severidad confirmada (no proyectada) sigue siendo el de infraestructura (backup, ya mitigado parcialmente), no uno de mercado o producto.

**5. Criterios para evaluar nuevas oportunidades de negocio**: §20 de este documento.

**6. Validación de coherencia completa del MAHP Master Manual**: realizada de forma exhaustiva contra los 79 documentos existentes antes de esta fase — hallazgos consolidados abajo, sin corregirlos unilateralmente donde exceden el alcance de esta fase.

| Hallazgo | Tipo | Estado |
|---|---|---|
| `PROJECT-BLUEPRINT.md` no referencia los documentos `04-*`/`05-*`/`06-*`/`07-*`/`08-*`/`09-*`/`10-*`/`CCEC-*` en su índice ni tabla de "Documentos relacionados" — desactualizado desde MDS-005, señalado 3 veces antes de esta fase | Vacío de mantenimiento documental | No corregido — fuera de alcance de MDS-012, requiere decisión de numeración de capítulos del dueño del documento |
| Decisión de modelo de sucursales/organización (`companies.parent_company_id` vs. tabla `branches`) bloqueada desde MDS-003, señalada en 6 documentos (`06A`, `07A`, `02-ARCH`, `09C`, `09D`, `10C`) | Vacío de decisión de negocio | No corregido — requiere al cliente real multi-sucursal que ninguna fase ha tenido todavía |
| Serie de documentos ADR mencionada como dependencia contextual de MDS-012 pero inexistente | Vacío de gobierno (§14) | Señalado, no creado sin aprobación |
| `social_channels`/`follower_logs`/`follower_totals`/`follower_delta_by_campaign` sin versionar en `.sql`, señalado desde `DATABASE.md` §9 (antes de esta serie de fases) y heredado sin resolver por `07B-DATA-GOVERNANCE.md` §5 | Vacío de gobierno de datos | No corregido — pendiente de sesión con SQL Editor, ya identificado como acción, no repetido como decisión nueva aquí |
| Ninguna duplicidad de responsabilidad detectada entre MDS/CCEC — verificado explícitamente que `10-*` no redefine `07H`/`02§4`, que `09-*` no duplica la cola de `08F`, y que `11-*` (esta fase) no repite contenido de `VISION.md`/`ROADMAP.md`/`10I` | Confirmación positiva | Sin acción — es el resultado esperado de la disciplina de "no duplicar" aplicada fase por fase |

**No se implementó ningún cambio de código, arquitectura ni de producto en esta fase — solo documentación y validación de coherencia, conforme a las reglas de MDS-012.**
