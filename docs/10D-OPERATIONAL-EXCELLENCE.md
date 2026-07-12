# OPERATIONAL EXCELLENCE — Excelencia Operativa

> MDS-011, Documento 5 de 10. SLA, gestión de incidentes, gestión de
> cambios, gestión de capacidad, continuidad del negocio, ventanas de
> mantenimiento y escalamiento operativo. SLO detallado en
> `10F-SERVICE-LEVEL-OBJECTIVES.md`; backups/DR en
> `10E-BACKUP-AND-DISASTER-RECOVERY.md`; observabilidad que sustenta todo
> esto es `CCEC-004-OBSERVABILITY-PLATFORM.md`, referenciada aquí sin
> redefinirse.
>
> **Estado: [FUTURO] en su totalidad** — hoy no existe SLA formal, ni
> proceso de gestión de incidentes, ni ventanas de mantenimiento
> planeadas; con una sola empresa cliente activa, la operación es directa
> e informal.
>
> Última actualización: 2026-07-12.

---

## 1. SLA — Service Level Agreement

Compromiso contractual con el cliente (distinto de SLO, el objetivo técnico interno — `10F`). No se fabrica un número de disponibilidad comprometido en este documento sin decisión real de negocio (`CLAUDE.md` §6) — la estructura propuesta: SLA formal solo para planes que lo justifiquen comercialmente (`10B-SUBSCRIPTION-AND-LICENSING.md` §2, un plan "Enterprise" podría incluir SLA explícito; un plan básico, mejor esfuerzo sin compromiso contractual).

## 2. Gestión de incidentes

Proceso propuesto, mínimo viable:

```
Detección (alerta de CCEC-004C, o reporte de cliente vía 10H-SUPPORT)
        │
        ▼
Clasificación de severidad (misma escala 🔴/🟡/🟢 de CCEC-004C §3)
        │
        ▼
Respuesta según severidad (tiempo objetivo, 10F)
        │
        ▼
Resolución + comunicación al cliente afectado (10H)
        │
        ▼
Post-mortem para incidentes 🔴 — qué pasó, por qué, qué cambia para
que no se repita (alimenta Gestión de Cambios, §3)
```

No se reinventa un sistema de clasificación de severidad — reutiliza el ya definido en `CCEC-004C-ALERTING-STRATEGY.md` §3, consistente con la instrucción de esta fase de no redefinir lo que ya vive en un CCEC.

## 3. Gestión de cambios

Hoy: cambios de esquema van por `supabase_schema_vN.sql` (`07C-DATABASE-STANDARDS.md` §2), cambios de código van por commit + despliegue directo a GitHub Pages (`10G-DEPLOYMENT-STRATEGY.md`) — sin ventana de aprobación formal, apropiado para el tamaño actual del equipo. Propuesta para escalar: todo cambio que module una tabla con datos de producción de más de una empresa pasa por una revisión explícita antes de aplicarse (ya es, de facto, la práctica seguida en esta misma documentación — cada `supabase_schema_vN.sql` se ha presentado para aprobación antes de ejecutarse, `CLAUDE.md` §4).

## 4. Gestión de capacidad

Hereda `07-ENTERPRISE-DATA-PLATFORM.md` §8 y `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §14 — no se redefine el modelo de escalabilidad técnica. Lo que agrega esta fase: el **proceso** de revisar capacidad periódicamente (trimestral, alineado a la frecuencia de revisión ya declarada en el encabezado de todos los documentos MDS) usando las métricas de `CCEC-004A`, en vez de reaccionar solo cuando algo ya se degradó.

## 5. Continuidad del negocio

Qué pasa si Supabase o GitHub Pages tienen una interrupción — **fuera del control directo de MAHP** (son proveedores gestionados). Mitigación realista: monitoreo del estado de ambos proveedores (páginas de status pública de Supabase/GitHub), comunicación proactiva al cliente si hay una interrupción del proveedor (`10H-SUPPORT-OPERATIONS.md` §5), sin prometer continuidad que MAHP no controla — más allá de eso, ver recuperación ante desastres (`10E`).

## 6. Ventanas de mantenimiento

**No existen hoy** — cualquier despliegue a GitHub Pages es instantáneo y no requiere ventana (sitio estático); cambios de esquema en Supabase, al ser manuales y poco frecuentes, se hacen sin anuncio formal por ser una sola empresa cliente. Propuesta para cuando haya más clientes: anuncio previo (vía `10H`, canal de comunicación de estado) solo para cambios de esquema con riesgo de interrupción — no para despliegues de frontend, que no la requieren dada la arquitectura actual.

## 7. Escalamiento operativo

Hoy: el propio Chief Product Owner es todo el equipo operativo — no hay a quién escalar. Estructura propuesta para cuando exista más de una persona en operación: escalamiento por severidad (§2) a la persona/rol responsable, mismo patrón ya usado en `09I-AUTOMATION-GOVERNANCE.md` §2 (todo tiene un dueño responsable), aplicado ahora a incidentes de plataforma en vez de automatizaciones de cliente.

---

## KPIs

Ver `CCEC-004A` para el mecanismo. Específicos de este dominio: tiempo medio de detección de incidente, tiempo medio de resolución por severidad, número de incidentes por trimestre, % de cambios de esquema sin incidente asociado.
