# BUSINESS GROWTH — Crecimiento Empresarial

> MDS-012, Documento 3 de 10. Segmentación de clientes, adquisición,
> retención y ventajas competitivas. **Extiende** `10I-GROWTH-STRATEGY.md`
> (MDS-011, ángulo operativo: qué cambia en soporte/infraestructura al
> crecer) con el ángulo comercial — no repite su contenido.
>
> Última actualización: 2026-07-12.

---

## 1. Segmentación de clientes

Hereda directamente `01-IDENTIDAD-DEL-PRODUCTO.md` §9 — no se redefine el mercado objetivo, se prioriza dentro de él:

| Segmento | Prioridad | Por qué |
|---|---|---|
| Restaurantes y servicios | Alta — ya validado | Es el giro que originó las categorías de actividad actuales del producto real |
| PyMEs con equipo de marketing (no una sola persona) | Alta — es el mercado inicial explícito | Sin equipo, no hay necesidad real de roles diferenciados (`company_admin`/`director`/`collaborator`) |
| Agencias (gestionan varias marcas) | Media | Requiere el modelo de organización/sucursales todavía bloqueado (`10C-ORGANIZATION-MODEL.md`) para gestionar varios clientes desde una sola cuenta — hoy una agencia usaría MAHP como varias empresas separadas, sin consolidación |
| Franquicias/cadenas multisucursal | Media, bloqueada | Misma dependencia que agencias |
| Corporativos/Enterprise | Baja hasta Fase 5 | Requiere SLA real, roles granulares — ninguno construido todavía (`11A-PRODUCT-ROADMAP.md` Fase 5) |

## 2. Adquisición

No se fabrican canales de adquisición específicos (campañas pagadas, alianzas) sin decisión real de negocio (`CLAUDE.md` §6) — este documento identifica el mecanismo estructural en vez de un plan de marketing: el propio producto (`06F-INTEGRATIONS.md`, `08C-INTEGRATIONS-CATALOG.md`, Google Business/Analytics) puede convertirse en canal de adquisición indirecta una vez existan integraciones reales — un cliente que conecta su Google Business Profile ve valor inmediato sin fricción de configuración manual.

## 3. Retención

Mecanismo de retención más fuerte ya existente, sin construir nada nuevo: **el historial**. Una empresa con meses de `activity_updates`, `points_log`, `follower_logs` acumulados tiene un costo de cambio real (perder ese historial) que ninguna hoja de cálculo o competidor nuevo iguala fácilmente — es una consecuencia directa del principio "nada crítico se pierde" (`PROJECT-BLUEPRINT.md` §5, principio 4), no una estrategia de retención diseñada aparte.

Mecanismo secundario: gamificación (`points_log`, ranking) ya genera engagement recurrente del lado del `collaborator`, el rol que más tiempo pasa operando el sistema día a día.

## 4. Ventajas competitivas

No se compara con competidores nombrados sin datos reales (`CLAUDE.md` §6). Ventajas verificables desde la arquitectura documentada:

- **Seguridad real, no de interfaz** (`07H-MULTI-TENANT-DESIGN.md`) — verificable técnicamente, no solo una promesa de marketing.
- **IA integrada al flujo central desde el día uno del diseño**, no agregada después (`PROJECT-BLUEPRINT.md` §4) — la mayoría de herramientas de marketing genéricas añaden IA como función aparte sobre una arquitectura que no la anticipó.
- **Documentación como parte de construir** (`CLAUDE.md` §7) — resultado tangible: 90 documentos verificados contra código real antes de esta fase, lo que reduce el riesgo de deuda técnica oculta al escalar.

## 5. Riesgos de negocio (resumen — detalle completo en `11G-RISK-MANAGEMENT.md`)

El riesgo de negocio más inmediato no es de mercado, es de **concentración**: un solo cliente activo hoy significa que cualquier decisión de producto se valida contra una sola realidad — un sesgo real hasta que exista el segundo cliente (criterio de salida de Fase 1, `11A`).

## 6. Oportunidades de crecimiento

- **Integraciones como multiplicador** (`08C-INTEGRATIONS-CATALOG.md`, sección n8n/Zapier/Make): una sola API pública bien diseñada habilita más combinaciones de valor que construir integraciones una por una.
- **Automatización como diferenciador de retención**: una empresa con varios workflows configurados (`09-ENTERPRISE-AUTOMATION-PLATFORM.md`) tiene, además del historial de datos, configuración operativa propia que migrar a otra herramienta — refuerza §3.

---

## KPIs

Ver `11H-SUCCESS-METRICS.md` para el catálogo completo — específicos de crecimiento: clientes activos por segmento (§1), tasa de conversión de prueba gratuita (`10B` §7, cuando exista), costo de adquisición por canal (cuando existan canales reales, no antes).
