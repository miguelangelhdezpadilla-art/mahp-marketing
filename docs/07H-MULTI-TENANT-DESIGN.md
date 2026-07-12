# MULTI-TENANT DESIGN — Diseño Multiempresa de MAHP

> MDS-008, Documento 9 de 10. Aislamiento de empresas, separación lógica,
> acceso, permisos, seguridad, escalabilidad y migraciones futuras del
> modelo multi-tenant.
>
> Última actualización: 2026-07-12.

---

## 1. Modelo elegido: aislamiento por columna, un solo cluster

MAHP usa **multi-tenancy por columna** (`company_id` en cada tabla operativa, una sola base de datos Postgres para todas las empresas) — no por schema por empresa, ni por base de datos separada por empresa. Es la decisión correcta al tamaño y naturaleza actual del producto (`PROJECT-BLUEPRINT.md` §5, principio 5: simplicidad sobre complejidad), y es también el patrón que usan SaaS multiempresa de escala mucho mayor — no es una limitación temporal, es la arquitectura objetivo.

```
┌──────────────────────────────────────────────────────────┐
│                    UN SOLO POSTGRES                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Empresa A     │  │ Empresa B     │  │ Empresa C     │   │
│  │ company_id=1  │  │ company_id=2  │  │ company_id=3  │   │
│  │ (mismas       │  │ (mismas       │  │ (mismas       │   │
│  │  tablas)      │  │  tablas)      │  │  tablas)      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         Separación real: RLS, no la estructura              │
└──────────────────────────────────────────────────────────┘
```

## 2. Aislamiento de empresas

Toda tabla operativa lleva `company_id bigint references companies(id)`. La política de `select` de cada tabla filtra por `company_id = my_company_id()` (excepto `super_admin`, que no tiene esa restricción — ver §4). Ninguna tabla operativa carece de esta columna; si una tabla nueva no la necesitara, sería señal de que no es un dato operativo de negocio (por ejemplo, una tabla de configuración global de plataforma, que hoy no existe).

## 3. Separación lógica vs. física

No hay separación física entre empresas — todas comparten el mismo hardware, el mismo proceso de Postgres, las mismas tablas. La separación es enteramente lógica, garantizada por RLS. Esto es deliberado: permite que una sola migración de esquema (`supabase_schema_vN.sql`) actualice a todas las empresas a la vez, sin coordinación por cliente — el costo operativo de mantener miles de empresas no crece con el número de empresas.

## 4. La excepción explícita: `super_admin`

`super_admin` es la única identidad del sistema sin restricción de `company_id` — y lo es **de forma explícita en cada política** (`my_role() = 'super_admin' OR (...)`), nunca por ausencia de una regla. Opera sobre cualquier empresa vía impersonación (`?company_id=` en la URL de `empresa.html`), lo cual es funcionalmente correcto pero tiene un gap de auditoría real: esa impersonación no queda registrada hoy (`07F-SECURITY-AND-AUDIT.md` §5) — es el hallazgo de seguridad más relevante de toda esta fase de documentación.

## 5. Acceso y permisos

Cuatro roles, mismo modelo de datos, distinta vista (`PROJECT-BLUEPRINT.md` §4): `super_admin` (proveedor), `company_admin`/`director`/`collaborator` (empresa cliente). El control de acceso nunca depende de qué pantalla carga el cliente — las cuatro páginas (`admin.html`, `empresa.html`, `directivo.html`, `colaborador.html`) son una conveniencia de experiencia, no un límite de seguridad; el límite real es RLS, verificable incluso si alguien intentara cargar `empresa.html` con una sesión de `collaborator` (fallaría en la base de datos, no solo en la interfaz).

## 6. Seguridad del modelo multi-tenant

Riesgo estructural reconocido de cualquier arquitectura de "una tabla, muchas empresas": una política RLS mal escrita en una sola tabla puede filtrar datos entre empresas. Mitigación vigente:

- Toda política nueva se revisa contra `DATABASE.md` antes de escribirse (`CLAUDE.md` §2).
- El patrón `my_role()`/`my_company_id()` centraliza la lógica de identidad en dos funciones auditables, en vez de repetir la lógica de resolución de rol/empresa en cada política — un error se corrige en un solo lugar, no en N políticas.
- El hallazgo de `v18` (`07C-DATABASE-STANDARDS.md` §7) demuestra que el mayor riesgo real no ha sido una fuga de datos entre empresas, sino un falso negativo (RLS bloqueando de más) — igualmente documentado como estándar para prevenir su opuesto (RLS permitiendo de más) con el mismo nivel de rigor.

## 7. Escalabilidad del modelo

Válido sin cambios estructurales de decenas a miles de empresas (`07-ENTERPRISE-DATA-PLATFORM.md` §8). El único escenario que rompe el modelo de "un cluster para todos" es un cliente individual con volumen desproporcionado ("ballena") que sature recursos compartidos — y el propio aislamiento por `company_id` hace que separar a ese cliente a su propio proyecto Supabase sea una migración de datos acotada (exportar las filas de un `company_id`), no un rediseño.

## 8. Migraciones futuras — qué cambiaría y qué no

| Escenario futuro | Requiere cambiar el modelo de aislamiento? | Qué sí cambia |
|---|---|---|
| Miles de empresas más | No | Índices, posible particionamiento (`07-ENTERPRISE-DATA-PLATFORM.md` §8) |
| Franquicias/sucursales dentro de una empresa (`07A` §18) | No — es un nivel adicional *dentro* de `company_id`, no un modelo nuevo | Nueva tabla `branches` o `companies.parent_company_id`, decisión aún no tomada |
| Un cliente "ballena" aislado a su propio proyecto | No, lo permite el diseño actual | Proceso de migración de datos puntual, no arquitectura |
| Requisito legal de residencia de datos por país | Posiblemente sí — RLS no resuelve dónde vive físicamente el dato | Fuera de alcance de este documento; señalado como riesgo latente, no como plan |

## 9. Frontera con Integraciones (MDS-009)

Cuando existan integraciones externas (Meta, Google, WhatsApp — `07A` §16), cada credencial/token de integración deberá llevar `company_id` con el mismo rigor que cualquier otro dato operativo — el aislamiento multiempresa no se relaja para datos de terceros. Esta es la restricción de diseño que este documento impone hacia adelante a MDS-009.
