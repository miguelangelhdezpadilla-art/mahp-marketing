# SERVICE LEVEL OBJECTIVES — Objetivos de Nivel de Servicio

> MDS-011, Documento 7 de 10. SLO técnicos internos — distintos de SLA
> (`10D-OPERATIONAL-EXCELLENCE.md` §1, compromiso contractual con el
> cliente). Un SLO es la vara con la que el propio equipo se mide antes de
> prometer nada a un cliente.
>
> **Estado: [FUTURO] en su totalidad** — sin métricas de observabilidad
> reales (`CCEC-004`) todavía, no hay datos históricos sobre los que fijar
> un SLO honesto. Este documento define el marco, no los números finales.
>
> Última actualización: 2026-07-12.

---

## 1. Por qué no hay números todavía

Un SLO fijado sin datos históricos reales es una promesa fabricada (`CLAUDE.md` §6, aplicado aquí a compromisos técnicos, no solo a precios/testimonios) — MAHP no tiene hoy medición de disponibilidad ni de latencia propia (depende enteramente de Supabase/GitHub Pages, sin panel propio, `CCEC-004` §4). Los SLO de este documento se completan con números reales solo después de que `CCEC-004A` esté capturando datos por al menos un periodo representativo (ej. un trimestre).

## 2. Marco de SLO propuesto

| Categoría | Qué mediría | Depende de |
|---|---|---|
| Disponibilidad de la aplicación | % de tiempo que `empresa.html`/`colaborador.html`/etc. cargan y responden | Delegado a GitHub Pages/Supabase — sin panel propio hoy |
| Disponibilidad de la API | % de tiempo que PostgREST/Edge Functions responden correctamente | `CCEC-004A`, categoría API/Integraciones |
| Latencia de escritura | Tiempo entre acción de usuario y dato disponible | `07-ENTERPRISE-DATA-PLATFORM.md` §5 — hoy es consistencia inmediata por arquitectura, no medida activamente |
| Éxito de automatizaciones | % de workflows que terminan "completado" sin intervención manual | `09A-WORKFLOW-ENGINE.md` KPIs, cuando exista el motor |
| Entrega de notificaciones/webhooks | % entregado exitosamente | `09H`/`08B` KPIs |

## 3. Relación con SLA

Un SLA nunca promete más de lo que el SLO interno ya demuestra sostener de forma consistente — la secuencia correcta es: medir (`CCEC-004`) → fijar SLO interno realista → solo después, si el negocio lo requiere, ofrecer SLA a clientes (`10B`, planes Enterprise) con margen de seguridad respecto al SLO interno, nunca igual a él.

## 4. Error budget

**[FUTURO, V3]**: concepto de "cuánto margen de falla se permite antes de pausar cambios de riesgo y enfocarse en estabilidad" — no aplicable hoy, requiere primero tener un SLO real medido (§1) y un volumen de cambios lo bastante alto para que el concepto tenga sentido operativo (con un solo cliente y cambios poco frecuentes, no hay suficiente señal para un error budget significativo).

## 5. Revisión de SLO

Cada 90 días, alineado a la frecuencia de revisión ya declarada por todos los documentos MDS/CCEC — un SLO no es una promesa fija de por vida, se ajusta con la evidencia real de `CCEC-004A`.

---

## KPIs de este documento mismo

**Cobertura de SLO con datos reales**: % de las categorías de §2 que ya tienen un número basado en medición real (vs. sin definir por falta de datos) — la métrica más honesta posible sobre el estado de madurez operativa de MAHP en un momento dado.
