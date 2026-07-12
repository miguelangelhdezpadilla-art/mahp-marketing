# GROWTH STRATEGY — Estrategia de Crecimiento

> MDS-011, Documento 10 de 10. Escalabilidad comercial — complementa (no
> redefine) la escalabilidad técnica ya cubierta en
> `07-ENTERPRISE-DATA-PLATFORM.md` §8 y `02-ENTERPRISE-SYSTEM-
> ARCHITECTURE.md` §14. Cierra la fase MDS-011.
>
> Última actualización: 2026-07-12.

---

## 1. De un cliente a muchos — qué cambia y qué no

| Volumen | Qué exige (comercial) | Documento relevante |
|---|---|---|
| 1 cliente (hoy) | Nada — atención directa | — |
| Decenas de clientes | Planes diferenciados, facturación automatizada | `10B-SUBSCRIPTION-AND-LICENSING.md` |
| Cientos de clientes | Soporte por niveles, base de conocimiento | `10H-SUPPORT-OPERATIONS.md` |
| Miles de clientes | SLA formal para planes altos, estado de servicio público | `10F`, `10H` §5 |

Ningún salto de este camino requiere cambiar el modelo técnico multi-tenant (`07H-MULTI-TENANT-DESIGN.md` §7 ya lo confirmó: válido de decenas a miles de empresas sin cambio estructural) — el crecimiento comercial y el técnico son, deliberadamente, caminos independientes en esta arquitectura.

## 2. Preparación para crecimiento internacional

Mencionado como objetivo general de esta fase. Estado real: MAHP hoy opera en español, sin internacionalización de interfaz (`04-DESIGN-SYSTEM.md`, sin mención de i18n), sin manejo de múltiples monedas en facturación (`10B`, precios como placeholder, sin moneda fijada), sin consideración de residencia de datos por país (`07H-MULTI-TENANT-DESIGN.md` §8, señalado como riesgo latente, no resuelto). Expansión internacional real requeriría resolver los tres — no se resuelven en este documento, se listan como prerrequisitos explícitos para no prometer una capacidad que no existe.

## 3. Preparación para múltiples planes comerciales

Ya cubierto en `10B-SUBSCRIPTION-AND-LICENSING.md` — este documento no lo repite, confirma que la estructura de `plans`/`limits` ya diseñada soporta tantos planes como el negocio decida sin cambio de arquitectura (agregar un plan nuevo es una fila nueva en `plans`, no una migración).

## 4. Reducción de costos operativos

- **Autoservicio** (§1, decenas de clientes en adelante): reduce el costo marginal de cada cliente nuevo — es la razón de negocio detrás de activar `10B` antes que expandir soporte humano.
- **Automatización de operaciones internas** (`09-ENTERPRISE-AUTOMATION-PLATFORM.md`): recordatorios, seguimiento de KPIs y aprobaciones reducen trabajo manual **del cliente**, no directamente el costo operativo de MAHP como proveedor — distinción importante para no confundir "MAHP automatiza el marketing de sus clientes" (ya es el producto) con "MAHP automatiza su propia operación interna" (sería una capa adicional, hoy no diseñada, candidata de una fase futura si el volumen de operación interna lo justifica).

## 5. Cómo esto incrementa el valor de MAHP frente a la competencia

No se fabrican comparaciones con competidores específicos sin datos reales (`CLAUDE.md` §6 aplicado a afirmaciones de mercado) — lo que sí es verificable desde esta documentación: la combinación de RLS como frontera real de seguridad (`07H`), IA integrada al flujo central en vez de como función aparte (`PROJECT-BLUEPRINT.md` §4), y ahora una plataforma de integración/automatización diseñada (aunque no construida, MDS-009/010) es una base arquitectónica coherente de la que muchas herramientas de marketing genéricas carecen por haber crecido sin ese diseño previo.

## 6. Roadmap Evolutivo consolidado (MVP → V2 → V3)

| Fase | Qué se activa | Condición |
|---|---|---|
| MVP (ahora) | Nada de MDS-011 — MAHP ya opera sin ello | — |
| V2 | `10B` (planes/facturación real) | Segundo cliente pagando con necesidades de facturación distintas al primero |
| V2 | `10E` §2 (confirmar nivel real de backup/PITR) | Inmediato — no depende de más clientes, es verificación pendiente ya |
| V2 | `10D`/`10H` informal → primeros niveles reales de soporte | Volumen de soporte que ya no cabe en atención 1:1 |
| V3 | `10C` (organización/sucursales) — solo si se resuelve la decisión de modelo | Cliente real multi-sucursal confirmado |
| V3 | `10F` con números reales de SLO, posible SLA para plan Enterprise | Al menos un trimestre de datos reales de `CCEC-004A` |
| V3+ | Expansión internacional (§2) | Solo tras resolver i18n, multi-moneda, residencia de datos |

---

## KPIs

| KPI | Definición |
|---|---|
| Costo de adquisición vs. costo de soporte por cliente | Señal de cuándo autoservicio (§4) se vuelve necesario |
| Empresas activas por plan | Ver `10B` §"KPIs" |
| Tiempo desde alta hasta primer uso real | Ya identificado en `06A-CORE-MODULES.md` §1 como KPI de Empresas — este documento lo reutiliza como señal de crecimiento saludable, no lo redefine |

---

## Cierre de MDS-011

Con este documento se completan los 10 entregables de la fase (`10` + `10A`–`10I`). Ver `10-ENTERPRISE-SAAS-PLATFORM.md`, sección "Entregable Final", para el resumen ejecutivo completo, capacidades críticas, evolución por fases y verificación de coherencia con MDS-001 a MDS-010 y con `CCEC-001`/`CCEC-004`.

**Nota de honestidad de estado, consistente con todo `/docs`**: de los 10 documentos de esta fase, el único con una acción real pendiente de ejecutar de inmediato (no condicionada a crecimiento futuro) es `10E-BACKUP-AND-DISASTER-RECOVERY.md` §2 — confirmar el nivel de backup/PITR contratado en Supabase. Todo lo demás de MDS-011 es diseño para cuando el negocio crezca, no trabajo pendiente urgente.
