# PRODUCT ROADMAP — Hoja de Ruta del Producto

> MDS-012, Documento 2 de 10. Cinco fases (MVP → Enterprise), cada una con
> objetivos, funcionalidades, dependencias, riesgos, métricas de éxito y
> criterios de salida. **Extiende** `ROADMAP.md` (que organiza lo ya
> construido por estado real) con la mirada hacia adelante — no repite su
> contenido.
>
> Última actualización: 2026-07-12.

---

## FASE 1 — MVP (estado actual)

| Campo | Detalle |
|---|---|
| Objetivos | Validar que el modelo de 4 roles + campañas + calendario + IA resuelve el problema real de una empresa |
| Funcionalidades | Las ~22 ya construidas y verificadas en `MODULOS.md` — Core, Marketing, Operaciones, Gamificación, IA (generación de calendario) |
| Dependencias | Ninguna — ya cumplida |
| Riesgos | **Confirmado, no proyectado**: sin backup gestionado (`10E-BACKUP-AND-DISASTER-RECOVERY.md`), mitigado con respaldo manual semanal desde 2026-07-12 |
| Métricas de éxito | Un cliente activo operando sin fricción bloqueante — cumplido |
| Criterio de salida | Segundo cliente real con necesidades propias (facturación distinta, volumen distinto) — todavía no ocurrido |

## FASE 2 — Early Adopters

| Campo | Detalle |
|---|---|
| Objetivos | Validar el modelo con un puñado de clientes (decenas, no cientos) con necesidades ligeramente distintas entre sí |
| Funcionalidades | `10B-SUBSCRIPTION-AND-LICENSING.md` (planes reales), primera integración saliente real (Meta o Google según quién lo pida primero, `08C-INTEGRATIONS-CATALOG.md`), cierre del hueco de versionado de seguidores (`DATABASE.md` §9) |
| Dependencias | Segundo cliente confirmado (criterio de salida de Fase 1) |
| Riesgos | Complejidad operativa de dar soporte 1:1 a más de un cliente sin estructura de niveles (`10H-SUPPORT-OPERATIONS.md` §1) — mitigado siendo todavía volumen bajo |
| Métricas de éxito | Retención de los primeros clientes más allá de un ciclo de facturación; al menos una integración externa en uso real, no solo diseñada |
| Criterio de salida | Volumen de soporte que ya no cabe en atención informal 1:1 |

## FASE 3 — Escalamiento Nacional

| Campo | Detalle |
|---|---|
| Objetivos | Crecer dentro del mercado ya validado (`01-IDENTIDAD-DEL-PRODUCTO.md` §9: PyMEs de Latinoamérica, restaurantes/servicios) sin salir de él todavía |
| Funcionalidades | Soporte por niveles real (`10H` §1), primer ADR (decisiones ya tomadas empiezan a documentarse con su razonamiento, `11` §14), automatización configurable por cliente (`09-ENTERPRISE-AUTOMATION-PLATFORM.md`, activada por demanda real), upgrade de Supabase a plan que garantice backups reales si no se hizo antes (`10E` §2) |
| Dependencias | Volumen de Fase 2 alcanzado |
| Riesgos | Mismo límite técnico ya reconocido en `07-ENTERPRISE-DATA-PLATFORM.md` §8 empieza a acercarse (miles de empresas) — todavía no crítico a este volumen |
| Métricas de éxito | MRR/ARR creciendo de forma sostenida (`11H-SUCCESS-METRICS.md`); churn bajo control |
| Criterio de salida | Demanda real y confirmada fuera del mercado inicial (otro idioma, otro país, otro giro de negocio no cubierto por las categorías actuales) |

## FASE 4 — Expansión Internacional

| Campo | Detalle |
|---|---|
| Objetivos | Operar fuera del mercado hispanohablante inicial |
| Funcionalidades | Los tres prerrequisitos ya identificados en `10I-GROWTH-STRATEGY.md` §2: internacionalización de interfaz, múltiples monedas en facturación, resolución explícita de residencia de datos por país. Desarrollo completo de la estrategia en `11C-MARKET-EXPANSION.md` |
| Dependencias | Fase 3 estable, decisión de negocio confirmada de entrar a un mercado específico (no expansión especulativa) |
| Riesgos | Residencia de datos puede exigir un modelo de infraestructura distinto al de "un solo cluster Postgres" (`07H-MULTI-TENANT-DESIGN.md` §8) — el mayor riesgo arquitectónico de todo este roadmap |
| Métricas de éxito | Primer cliente fuera del mercado inicial operando establemente |
| Criterio de salida | Segundo mercado internacional confirmado, o decisión consciente de no expandir más (ambas son salidas válidas) |

## FASE 5 — Plataforma Enterprise

| Campo | Detalle |
|---|---|
| Objetivos | Atender clientes que exigen SLA formal, soporte dedicado, y capacidades de integración/automatización maduras |
| Funcionalidades | SLA real con números respaldados por datos (`10F-SERVICE-LEVEL-OBJECTIVES.md`), Marketplace activo (`08I-MARKETPLACE.md`), roles/permisos granulares por empresa (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §4, `10A-MULTI-TENANT-MODEL.md` §3), modelo de organización/sucursales resuelto (si hay demanda, `10C-ORGANIZATION-MODEL.md`) |
| Dependencias | Al menos un trimestre de datos reales de `CCEC-004A` para fijar SLO/SLA honestos (`10F` §1) |
| Riesgos | Ver `11G-RISK-MANAGEMENT.md` — a este volumen, los riesgos de mantenimiento y complejidad operativa superan a los de producto |
| Métricas de éxito | Primer contrato Enterprise con SLA firmado y cumplido |
| Criterio de salida | No aplica — es el horizonte de madurez de esta hoja de ruta, más allá de esta fase vive `11I-LONG-TERM-VISION.md` |

---

## Plan de ejecución por trimestres (próximos 12 meses)

| Trimestre | Foco |
|---|---|
| T1 | Confirmar decisión de backup (`10E` §2: ¿upgrade a Pro, o mantener mitigación manual?); cerrar versionado de `social_channels`/`follower_logs` |
| T2 | Si hay segundo cliente confirmado: activar `10B` (planes reales) |
| T3 | Primera integración externa real, si hay demanda confirmada; evaluar necesidad de soporte por niveles |
| T4 | Revisión de 6 meses de esta estrategia (`11`); ajustar roadmap con datos reales de adopción, no proyección |

---

## Diagrama — hoja de ruta tecnológica consolidada

```
MVP ──▶ Early Adopters ──▶ Escalamiento Nacional ──▶ Expansión Intl. ──▶ Enterprise
 │            │                     │                       │                │
 │        10B (planes)         10H (soporte),          11C (i18n,        10F (SLA
 │        primera              primer ADR,              multi-moneda,     real), 08I
 │        integración          09-* activado             residencia         (Marketplace)
 │        real                                            de datos)
 │
 └── ya construido: Core, Marketing, Operaciones, Gamificación, IA (Calendar Planner)
```
