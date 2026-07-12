# ORGANIZATION MODEL — Organizaciones, Empresas y Sucursales

> MDS-011, Documento 4 de 10. Modelo de organizaciones, empresas y
> sucursales dentro del marco operativo SaaS. **No resuelve** la decisión
> de modelo de datos ya bloqueada desde MDS-003 — la sitúa en su contexto
> operativo/comercial para cuando se decida.
>
> Última actualización: 2026-07-12.

---

## 1. Estado real hoy

`companies` es un nivel plano: una fila = una empresa cliente, sin jerarquía padre/hijo. No existe el concepto de "organización" que agrupe varias empresas o sucursales bajo una sola cuenta. Esta es la tercera vez que la documentación de MAHP señala esta misma brecha:

| Documento | Qué dijo |
|---|---|
| `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §4/§20 | "decisión de modelo de datos pendiente, no tomada" |
| `06A-CORE-MODULES.md` §2 (Sucursales) | "[FUTURO]... bloqueado hasta decidir el modelo de datos" |
| `07A-DOMAIN-MODEL.md` §18 | "[FUTURO], bloqueado... decisión de modelo no tomada" |

Este documento no rompe ese patrón fingiendo resolverlo — lo confirma como la misma brecha, ahora vista desde el ángulo operativo/comercial en vez del ángulo de producto.

## 2. Por qué importa desde la perspectiva SaaS específicamente

Las fases anteriores señalaron la brecha desde "qué módulo de producto se bloquea" (Sucursales) o "qué dominio de datos falta" (`07A`). Desde SaaS, la pregunta adicional es: **¿la facturación es por empresa o por organización?** Si una matriz con 5 sucursales debe pagar una sola suscripción con límites compartidos, o 5 suscripciones independientes, es una decisión de negocio que determina, en parte, cuál de las dos opciones técnicas (`companies.parent_company_id` vs. tabla `branches`) tiene más sentido — información nueva que aporta esta fase a la decisión pendiente, sin tomarla.

## 3. Dos modelos posibles, con su implicación de licenciamiento

| Modelo | Cómo se ve | Implicación de facturación (`10B`) |
|---|---|---|
| `companies.parent_company_id` (jerarquía dentro de la misma tabla) | Una organización = varias filas de `companies` enlazadas | Cada "sucursal" podría tener su propio `plan_id`, o heredar el de la matriz — ambigüedad a resolver junto con la decisión de modelo |
| Tabla `branches` separada (una `company_id` matriz, sucursales como sub-entidad, no como `companies` propias) | Una organización = una fila de `companies` + N filas de `branches` | Un solo `plan_id` por organización, límites compartidos entre sucursales — más simple de facturar, menos flexible operativamente |

Esta tabla es información nueva para la decisión, no una resolución — se entrega a quien deba decidir (`CLAUDE.md` §8: preferir preguntar antes de decisiones de negocio ambiguas).

## 4. Qué SÍ se puede diseñar sin resolver la decisión

- **Nomenclatura de roles a nivel organización** (si llegara a existir): un `company_admin` de la matriz vería consolidado across sucursales; un `company_admin` de sucursal (si el modelo lo permite) solo la suya — mismo patrón de alcance por RLS ya establecido, aplicable a cualquiera de los dos modelos.
- **Reportes consolidados**: independientemente del modelo elegido, la necesidad de negocio es la misma — un dashboard que sume KPIs/actividades de todas las sucursales de una organización (`06D-ANALYTICS-MODULES.md`).

## 5. Condición de activación

Igual que toda esta documentación: se resuelve cuando exista un cliente real con más de una ubicación pidiéndolo explícitamente — no antes. El mercado de franquicias/restaurantes multi-sucursal ya está identificado (`01-IDENTIDAD-DEL-PRODUCTO.md` §9) como candidato, pero identificado no es lo mismo que confirmado con un cliente real.

---

## KPIs

Ninguno aplicable hasta que el modelo se decida y construya — este documento no propone métricas para una capacidad que no existe.

---

## Nota para quien resuelva esta decisión en el futuro

Cuando se decida, actualizar en el mismo cambio: `06A-CORE-MODULES.md` §2, `07A-DOMAIN-MODEL.md` §18, `09C-EVENT-CATALOG.md` (evento `sucursal.agregada`, hoy marcado "doblemente futuro"), `09D-AUTOMATION-TEMPLATES.md` (plantillas de Franquicias) y este documento — es la misma brecha citada en 5 lugares de `/docs`; resolverla en uno sin actualizar los demás dejaría la documentación inconsistente (`CLAUDE.md` §7).
