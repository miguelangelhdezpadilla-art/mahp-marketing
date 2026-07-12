# ENTERPRISE SAAS PLATFORM — Plataforma SaaS, Operación y Multiempresa de MAHP

> MDS-011, Documento principal (1 de 10). Cómo se administran
> organizaciones, empresas, sucursales, suscripciones, licencias, entornos,
> despliegues, disponibilidad, continuidad del negocio y soporte
> operativo. **No redefine auditoría, logging ni observabilidad** — esas
> capacidades ya existen como `CCEC-001-ENTERPRISE-AUDIT-PLATFORM.md` y
> `CCEC-004-OBSERVABILITY-PLATFORM.md`, y este documento las referencia en
> vez de duplicarlas, conforme a la instrucción explícita de esta fase.
>
> **Maturity Target declarado por la fase: "Production Ready → Enterprise
> Ready"** — esa flecha es literal: MAHP hoy es un producto en producción
> real (una empresa cliente activa), no todavía una plataforma con SLA,
> soporte por niveles, ni continuidad de negocio formal. Este documento
> diseña el "Enterprise Ready" de destino sin fingir que ya se llegó ahí.
>
> Última actualización: 2026-07-12.

---

## 1. Modelo Multi-Tenant

Desarrollo completo en `10A-MULTI-TENANT-MODEL.md`, que **extiende, no redefine**, `07H-MULTI-TENANT-DESIGN.md` (MDS-008) — el modelo de aislamiento por `company_id` + RLS ya está diseñado y construido; lo que agrega esta fase es la capa de administración central y límites por plan que operan *sobre* ese aislamiento, no un modelo nuevo.

## 2. Organizaciones, Empresas y Sucursales

Desarrollo completo en `10C-ORGANIZATION-MODEL.md`. Resumen: hoy `companies` es un nivel plano (una fila = una empresa cliente, sin jerarquía) — la necesidad de "organización" (una matriz con varias empresas/sucursales) es la misma brecha ya señalada tres veces (`07A-DOMAIN-MODEL.md` §18, `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §4, `06A-CORE-MODULES.md` §2): bloqueada por una decisión de modelo de datos no tomada. Este documento no la toma tampoco — la sitúa dentro del marco operativo SaaS para cuando se decida.

## 3. Planes, Licencias y Suscripciones

Desarrollo completo en `10B-SUBSCRIPTION-AND-LICENSING.md`, construido directamente sobre el diseño conceptual ya existente en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §4 (tabla `plans`, `companies.plan_id`, límites vía función `security definer`, proveedor de pago abstraído) — no se rediseña desde cero, se completa con el detalle operativo de facturación, renovaciones, upgrade/downgrade y add-ons que MDS-003 dejó fuera de alcance.

## 4. Ciclo de Vida del Cliente

```
Prospecto ──▶ Alta (super_admin crea companies, MDS-002/§1) ──▶
Prueba gratuita [FUTURO, 10B §5] ──▶ Suscripción activa ──▶
   ├─▶ Renovación (recurrente)
   ├─▶ Upgrade/downgrade de plan [FUTURO, 10B §6]
   └─▶ Cancelación/impago ──▶ Suspensión (companies.active = false,
                               ya construido) ──▶ Reactivación o
                               purga eventual (07D-DATA-LIFECYCLE.md §9)
```

El único tramo ya construido de este ciclo es alta manual (`super_admin` crea la empresa, `MODULOS.md` #2) y suspensión (`companies.active`, ya existente desde `v2`) — todo lo demás (prueba gratuita, autoservicio de upgrade, facturación real) es `10B`, [FUTURO].

## 5. Estrategia de Despliegue

Desarrollo completo en `10G-DEPLOYMENT-STRATEGY.md`. Estado real, sin adornar: GitHub Pages (frontend estático) + Supabase (backend gestionado), sin pipeline de CI/CD, sin entornos de staging separados, un solo ambiente de producción (`PROJECT-BLUEPRINT.md` §28). Es una arquitectura de despliegue válida y deliberadamente simple para el tamaño actual (`PROJECT-BLUEPRINT.md` §5, principio 5) — `10G` diseña su evolución, no la reemplaza antes de que el volumen lo exija.

## 6. Operational Excellence

Desarrollo completo en `10D-OPERATIONAL-EXCELLENCE.md`. Cubre SLA/SLO (`10F`), gestión de incidentes, gestión de cambios, gestión de capacidad, continuidad del negocio, recuperación ante desastres (`10E`), backups (`10E`), ventanas de mantenimiento y escalamiento operativo — **la observabilidad que sustenta todo esto es `CCEC-004`, referenciada, no redefinida**.

## 7. Alta Disponibilidad y Continuidad

Desarrollo completo en `10E-BACKUP-AND-DISASTER-RECOVERY.md`. **Estado real confirmado el 2026-07-12**: proyecto en plan Free de Supabase, PITR deshabilitado, sin backups automáticos gestionados de ningún tipo — la brecha señalada en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §10 no solo se confirmó, resultó ser más seria de lo asumido (se esperaba al menos backup diario, no existe ninguno). Es el hallazgo de mayor riesgo real de toda la fase MDS-011 — ver `10E` §2 para la decisión de negocio pendiente (upgrade de plan) y §6 para una mitigación provisional de bajo costo.

## 8. Estrategia de Soporte

Desarrollo completo en `10H-SUPPORT-OPERATIONS.md`. Estado real hoy: soporte informal, directo (no hay niveles, no hay base de conocimiento pública, no hay estado de servicio publicado) — consistente con tener una sola empresa cliente activa. `10H` diseña la estructura de niveles para cuando el número de clientes deje de permitir soporte 1:1 informal.

## 9. Escalabilidad Técnica y Comercial

Técnica: hereda íntegramente `07-ENTERPRISE-DATA-PLATFORM.md` §8 y `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §14 — no se redefine. Comercial: desarrollo completo en `10I-GROWTH-STRATEGY.md`.

## 10. Roadmap Operativo

Ver §12 más abajo (Roadmap Evolutivo consolidado) y el detalle por documento en cada anexo.

---

## Diagramas

**Arquitectura operativa actual, sin adornar:**

```
┌──────────────┐        ┌───────────────────────┐
│ GitHub Pages   │ ────▶ │  Navegador del usuario   │
│ (frontend       │      └──────────┬────────────┘
│  estático)       │                 │
└──────────────┘                  │ supabase-js
                                    ▼
                          ┌───────────────────┐
                          │     Supabase          │
                          │  Postgres + RLS + Auth  │
                          │  + Storage + Edge Fns   │
                          │  (backups: NINGUNO —      │
                          │   plan Free, PITR         │
                          │   deshabilitado — §7)      │
                          └───────────────────┘

Sin: staging separado, CI/CD, multi-región, balanceo de carga,
     SLA formal, soporte por niveles — todo eso es diseño de
     esta fase, no infraestructura existente.
```

**Relación entre esta fase y las capacidades CCEC:**

```
MDS-011 (esta fase)
  │
  ├─▶ necesita auditoría de eventos SaaS (suscripción creada,
  │    plan cambiado, cuenta suspendida) ──▶ CCEC-001A
  │    (se agregan ahí, no se redefine el mecanismo aquí)
  │
  └─▶ necesita observabilidad de SLA/capacidad/incidentes
       ──▶ CCEC-004A/B/C (se agregan métricas ahí,
           no se redefine el mecanismo aquí)
```

---

## Checklist — antes de dar por completa cualquier capacidad operativa nueva de esta fase

- [ ] ¿Se verificó que no es responsabilidad de una capacidad ya definida en `07H`, `02§4/§10/§14`, `CCEC-001` o `CCEC-004` antes de diseñarla aquí?
- [ ] ¿Todo evento nuevo con relevancia de auditoría se agregó a `CCEC-001A`, no a un mecanismo propio?
- [ ] ¿Toda métrica/alerta nueva se definió en el formato de `CCEC-004A`/`CCEC-004C`, no como tabla de KPI aislada?
- [ ] ¿La brecha de "sucursales/organización" se referenció como ya bloqueada, en vez de proponerse resolver aquí sin la decisión de modelo pendiente?
- [ ] ¿Se distinguió explícitamente qué es real hoy (una empresa en producción, GitHub Pages + Supabase) de qué es diseño para escalar?

---

## Definition of Done

✓ Especificación integral de cómo MAHP operará como plataforma SaaS en producción (este documento + 9 anexos), alineada con MDS-001 a MDS-010 y con `CCEC-001`/`CCEC-004`, sin duplicar sus responsabilidades.

---

## Entregable Final

**1. Resumen de la estrategia operativa SaaS**: MAHP opera hoy sobre una arquitectura deliberadamente simple (estático + Supabase, un solo ambiente, un solo cliente activo) — válida para el momento actual. La estrategia "Enterprise Ready" no reemplaza esa base, la extiende con capas que se activan por demanda real: planes/facturación cuando haya más de un cliente pagando con necesidades distintas, soporte por niveles cuando el volumen de clientes supere lo atendible 1:1, SLA formal cuando un cliente lo exija contractualmente.

**2. Capacidades críticas para el lanzamiento del MVP**: ninguna de esta fase — el MVP de MAHP ya está lanzado y operando sin ellas (`ROADMAP.md`). Si se tuviera que elegir la primera en activarse, sería `10B` (planes/suscripciones), porque es la única con una condición de activación clara y ya parcialmente diseñada desde MDS-003 (más de un cliente pagando con necesidades de facturación real).

**3. Evolución operativa hacia V2 y V3**: ver §12 (Roadmap Evolutivo) en cada anexo — consolidado en `10I-GROWTH-STRATEGY.md` §6.

**4. Verificación de coherencia con MDS-001 a MDS-010 y documentos CCEC**: revisado explícitamente contra `07H-MULTI-TENANT-DESIGN.md`, `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §4/§10/§14, `07A-DOMAIN-MODEL.md` §18, `08C-INTEGRATIONS-CATALOG.md` (Stripe/Mercado Pago), y los 8 documentos de `CCEC-001`/`CCEC-004`. **Ninguna inconsistencia nueva** — este documento extiende sin contradecir. Se hereda, sin resolver por no ser su alcance, la decisión de modelo de sucursales/organización pendiente desde MDS-003.

**5. Responsabilidades transversales que aún deban extraerse a un CCEC independiente**: se identifica una candidata nueva durante esta fase — **gestión de incidentes y comunicación de estado de servicio** (`10D`/`10H`) tiene la misma forma de "capacidad compartida" que auditoría y observabilidad (útil para todo MDS futuro que module algo con impacto de disponibilidad), pero no se extrae a un CCEC-005 en esta fase porque, a diferencia de auditoría/observabilidad, no hay todavía evidencia de que múltiples MDS la hayan necesitado y redefinido por separado — se señala como candidata a vigilar, no se actúa preventivamente (mismo criterio de no construir/extraer por anticipación de todo `/docs`).

**No se implementó ningún cambio de código, infraestructura ni de producto en esta fase — solo documentación, conforme a las reglas de MDS-011.**
