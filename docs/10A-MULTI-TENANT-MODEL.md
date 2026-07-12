# MULTI-TENANT MODEL — Modelo Multi-Tenant Operativo

> MDS-011, Documento 2 de 10. **Extiende** `07H-MULTI-TENANT-DESIGN.md`
> (MDS-008) con la capa de administración central y roles administrativos
> que operan sobre el aislamiento ya diseñado — no redefine aislamiento de
> datos (eso sigue siendo `07H` + `MDS-008` en general, referenciado tal
> como pide esta fase).
>
> Última actualización: 2026-07-12.

---

## 1. Lo que ya está resuelto — no se repite aquí

Aislamiento por `company_id` + RLS, un solo cluster Postgres, `super_admin` como excepción explícita — todo en `07H-MULTI-TENANT-DESIGN.md`. Este documento asume ese modelo como dado y construido.

## 2. Administración central

Hoy: `admin.html` (`MODULOS.md` #2–5) es la única superficie de administración central — gestión de empresas, invitaciones, usuarios globales, auditoría. Es ya, en esencia, un panel de administración multi-tenant operativo, solo que sin el vocabulario formal de "consola de operaciones SaaS". Este documento no propone reemplazarlo — propone qué le falta para el estado "Enterprise Ready":

| Capacidad | Estado |
|---|---|
| Crear/listar empresas | [EXISTE] |
| Invitar primer `company_admin` | [EXISTE] |
| Revocar/restaurar acceso de usuario | [EXISTE] |
| Ver auditoría (`audit_log`) | [EXISTE], alcance a extender vía `CCEC-001B` |
| Ver estado de suscripción/plan por empresa | [FUTURO] — depende de `10B-SUBSCRIPTION-AND-LICENSING.md` |
| Ver salud operativa por empresa (uso, errores) | [FUTURO] — depende de `CCEC-004A` |
| Impersonar con registro auditado | 🟡 Parcial — la impersonación ya existe (`?company_id=`), el registro no (`CCEC-001A`, evento `impersonacion_iniciada`) |

## 3. Roles administrativos — brecha ya identificada

`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §4 ya señaló la brecha real: 4 roles fijos hoy, sin capa de permisos granulares por empresa. Este documento no la resuelve (es una decisión de producto, no solo técnica) — la sitúa explícitamente en el contexto operativo SaaS: una empresa "Enterprise" típicamente pide roles adicionales (ej. "supervisor de área", "solo lectura de facturación") que el modelo actual de 4 roles fijos no cubre. Diseño propuesto, consistente con lo ya anticipado en `02-ARCHITECTURE` §10: tabla `permissions` (rol base + overrides por `company_id`), sin tocar el modelo de 4 roles base — extensión aditiva, no reemplazo.

## 4. Límites por plan

Ver desarrollo completo en `10B-SUBSCRIPTION-AND-LICENSING.md` — la aplicación de límites (máximo de colaboradores, máximo de actividades/mes) es una función `security definer` más, del mismo tipo que `my_role()`/`my_company_id()` (`02-ARCHITECTURE` §4, ya anticipado), no un mecanismo de aislamiento nuevo.

## 5. SSO — nota de alcance

`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §10 ya anticipó SSO (Google Workspace/Microsoft) como roadmap natural cuando el mercado "corporativos" se active, soportado nativamente por Supabase Auth sin rediseño. Este documento no agrega nada nuevo a esa decisión — la referencia como ya cubierta.

---

## KPIs

Ver `CCEC-004A-METRICS-AND-DASHBOARDS.md` para el mecanismo — métricas específicas de este dominio: empresas activas por plan, uso de `admin.html` (impersonaciones por semana), cobertura de auditoría de impersonación una vez implementada.
