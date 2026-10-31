# ADR-021 — Una cuenta puede pertenecer a varias empresas, con una "empresa activa" a la vez

Estado: Aceptado
Fecha: 2026-10-31
Decisores: Product Owner

## Contexto

Hasta `v23`, `profiles.company_id` era la única relación entre una cuenta y una empresa: una cuenta = una empresa = un rol. El caso real que lo rompió: la misma persona es `director` de "ta camaron" y debe ser `company_admin` de "La Casa del Centro". La invitación de CDC a ese correo quedó pendiente (⏳) indefinidamente, porque `handle_new_user()` solo aplica invitaciones al **registrarse**, y esa cuenta ya existía. La única salida era mover la cuenta de empresa, lo que la sacaba de la otra.

## Decisión

- Tabla nueva **`company_memberships`** (`user_id`, `company_id`, `role`, `active`): todas las empresas de una cuenta, con rol y revocación **por empresa**.
- **`profiles.company_id` / `profiles.role` pasan a significar "empresa activa"**, la que se está viendo. `my_company_id()` / `my_role()` conservan su firma, pero ahora exigen además una membresía activa en esa empresa. Resultado: **ninguna política RLS existente se reescribe**, y el aislamiento sigue siendo de una empresa a la vez.
- **`switch_company(id)`** (`security definer`, `ADR-006`) cambia la empresa activa solo hacia una membresía activa propia. **`my_companies()`** alimenta el selector de empresa del encabezado, que solo aparece si la cuenta tiene más de una.
- **Invitar un correo que ya tiene cuenta lo agrega a la empresa al momento** (trigger sobre `invites` → `apply_invite()`, no expuesta a clientes).
- **`profiles.active` = revocación global** (solo Super Admin); **`company_memberships.active` = revocación en una empresa** (su `company_admin`, pestaña Equipo).
- Un trigger (`guard_profile_update`) impide que un usuario edite su propio `role`/`company_id`/`active` salvo hacia una membresía activa. Esto cierra un hueco previo de la política `profiles_update` de `v2`, que permitía a cualquier usuario ponerse `role = 'super_admin'`.

## Alternativas consideradas

- **Correos alias por empresa** (`correo+cdc@gmail.com`): sin cambios de código, pero obliga a cerrar sesión para cambiar de empresa y duplica identidades. Sirve como parche, no como modelo.
- **Reescribir todas las políticas RLS a `company_id in (mis empresas)`**: ve todas las empresas a la vez, pero hay que tocar ~60 políticas en 10 archivos de esquema, y una sola mal migrada filtra datos entre empresas. Además, la interfaz trabaja con una empresa por pantalla.
- **Nivel "organización" sobre `companies`** (`10C-ORGANIZATION-MODEL.md`): resuelve otro problema (sucursales de un mismo negocio), no el de una persona que trabaja para negocios distintos.

## Consecuencias

**Se gana**: una persona, una cuenta y varias empresas, con rol distinto en cada una. Las invitaciones a cuentas existentes ya no se atascan. Un `company_admin` revoca a alguien solo de su empresa, sin afectar las demás. Se corrige la escalación de privilegios vía `profiles_update`.

**Se sacrifica/queda pendiente**:
- La empresa activa vive en la base de datos, no en la pestaña: con dos pestañas abiertas en empresas distintas, la última elegida manda en ambas al recargar.
- Una invitación a un correo existente se aplica sin que esa persona la acepte; aparece en su selector la próxima vez que entra.
- `points_totals`/`points_by_campaign` (`v15`) y el resto de vistas no cambian: ya agrupaban por `company_id` de la fila, no del perfil.

## Referencias

`supabase_schema_v24.sql`, `ADR-001`, `ADR-006`, `DATABASE.md` §3, `06H-PERMISSIONS-MATRIX.md`, `js/supabaseClient.js` (`requireSession`, `cambiarEmpresa`).
