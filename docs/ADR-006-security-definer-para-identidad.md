# ADR-006 — Funciones `security definer` como patrón de resolución de identidad y escritura privilegiada en RLS

Estado: Aceptado
Fecha: (retroactivo — `my_role()`/`my_company_id()` desde `v2`, extendido con `soft_delete_actividades()` en `v18`, formalizado como ADR el 2026-07-12)
Decisores: Chief Product Owner

## Contexto

Las políticas RLS necesitan resolver "¿cuál es el rol/empresa del usuario actual?" leyendo la tabla `profiles` — pero si esa lectura misma está sujeta a RLS, un rol con política de `select` restrictiva sobre `profiles` podría no poder resolver ni siquiera su propia identidad, generando un ciclo de autorización roto.

## Decisión

Dos funciones `security definer` (`my_role()`, `my_company_id()`) leen `profiles` con los privilegios del dueño de la función, no del rol invocador, rompiendo el ciclo. El mismo patrón se extiende a operaciones de escritura que RLS bloquearía correctamente por diseño pero que necesitan un camino alternativo autorizado (`soft_delete_actividades()`, `v18`), siempre con la validación de rol replicada **dentro** de la función misma.

## Alternativas consideradas

- **Política de `select` sobre `profiles` totalmente abierta a cualquier autenticado**: rompe el ciclo sin necesitar `security definer`, pero expone todos los perfiles (incluidos de otras empresas) a cualquier usuario autenticado — inaceptable para el aislamiento multiempresa.
- **Resolver identidad en el cliente y enviarla como parámetro**: nunca considerado en serio — confiar en un valor que el cliente afirma sobre sí mismo viola el principio de que RLS es la única autorización real, no la interfaz.

## Consecuencias

**Se gana**: patrón centralizado y auditable — un error en la lógica de identidad se corrige en dos funciones, no en cada política individual; permite construir funciones de escritura privilegiada (como el fix de `v18`) sin abrir una brecha de seguridad, siempre que la función valide autorización internamente.

**Se sacrifica/queda pendiente**: cada función `security definer` nueva es una decisión de seguridad que debe justificarse explícitamente (nunca "por conveniencia") — regla ya fijada en `07F-SECURITY-AND-AUDIT.md` §2; un uso descuidado de este patrón sería la forma más directa de introducir una vulnerabilidad de escalación de privilegios en todo el sistema.

## Referencias

`DATABASE.md` §1, `07F-SECURITY-AND-AUDIT.md` §2, `07C-DATABASE-STANDARDS.md` §3/§7, `ADR-005`.
