# ADR-005 — Soft delete como comportamiento por defecto, borrado físico exclusivo de `super_admin`

Estado: Aceptado
Fecha: (retroactivo — decisión original en `v16`, corregida en `v18`, formalizado como ADR el 2026-07-12)
Decisores: Chief Product Owner

## Contexto

"Eliminar" una actividad desde la interfaz no debía significar pérdida irreversible de datos por un clic accidental, pero tampoco debía requerir que cada rol entendiera la diferencia entre "ocultar" y "destruir".

## Decisión

Toda acción de "eliminar" expuesta en la interfaz marca `deleted_at = now()` (soft delete), nunca ejecuta un `DELETE` real. El borrado físico existe como capacidad separada, reservada exclusivamente a `super_admin` vía SQL Editor, nunca expuesta en ninguna pantalla.

## Alternativas consideradas

- **Borrado físico directo desde la interfaz**: más simple de implementar, pero irreversible por diseño — un error de un `collaborator` o `company_admin` sería permanente, contradice el principio de "nada crítico se pierde".
- **Papelera con restauración desde la interfaz**: mejor experiencia que soft delete silencioso, pero mayor alcance de UI no justificado hasta que exista demanda — quedó documentado como candidato futuro (`07B-DATA-GOVERNANCE.md` §10), no descartado, solo no priorizado en la primera versión.

## Consecuencias

**Se gana**: cualquier "borrado" hecho por error es recuperable vía soporte (`super_admin`, SQL directo) sin pérdida real de datos.

**Se sacrifica/queda pendiente**: el hallazgo más significativo de todo el trabajo de esta serie de documentación — Postgres exige que la fila resultante de un `UPDATE` siga satisfaciendo las políticas de `SELECT` aplicables, no solo el `WITH CHECK` de `UPDATE`; como la política de lectura filtra `deleted_at IS NULL`, el soft delete se autobloqueaba para **todos los roles, incluido `super_admin`**, desde que se introdujo en `v16` hasta que se diagnosticó y corrigió en `v18` con una función `security definer` dedicada. Es el ejemplo canónico que fundamenta el estándar de diseño de `ADR-006`.

## Referencias

`07D-DATA-LIFECYCLE.md` §7, `DATABASE.md` §2, `07C-DATABASE-STANDARDS.md` §7, `MODULOS.md` #23.
