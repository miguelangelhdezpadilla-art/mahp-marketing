# CCEC-001B — Acceso y Retención de Auditoría

> Quién puede leer qué de `audit_log`, y cuánto tiempo se conserva.
>
> Última actualización: 2026-07-12.

---

## 1. Acceso — estado actual

Hoy, `audit_log` es visible únicamente para `super_admin` (pestaña "Actividad" de `admin.html`, `MODULOS.md` #5) — ningún `company_admin` puede ver la auditoría de su propia empresa, aunque los eventos que la generan (invitaciones, revocaciones) ocurren dentro de su empresa.

## 2. Acceso — propuesta

| Rol | Alcance de lectura propuesto | Justificación |
|---|---|---|
| `super_admin` | Todo, cualquier empresa | Sin cambio — ya es así |
| `company_admin` | Eventos de `audit_log` donde `company_id` = la suya | Hoy no puede ver ni siquiera cuándo se revocó el acceso de su propio colaborador — es información que ya le pertenece por RLS en todo lo demás, la auditoría no debería ser la excepción |
| `director`/`collaborator` | Sin acceso a `audit_log` | No es su función administrativa — mismo criterio que hoy ya aplica implícitamente |

**Implementación conceptual**: una política RLS nueva de `select` sobre `audit_log` para `company_admin` limitada por `company_id = my_company_id()` — mismo patrón exacto ya usado en cualquier otra tabla operativa (`07C-DATABASE-STANDARDS.md` §3), sin necesidad de mecanismo especial.

**Excepción**: el evento `impersonacion_iniciada`/`impersonacion_finalizada` (`CCEC-001A`) — aunque ocurre dentro del `company_id` de la empresa impersonada, se recomienda que **no** sea visible para `company_admin`, solo para `super_admin`, porque expone información sobre la operación interna de la plataforma (quién de MAHP entró a ver sus datos y cuándo) que es una decisión de transparencia distinta a "quién invité yo" — señalado como decisión de producto pendiente de confirmar, no resuelta unilateralmente en este documento.

## 3. Retención

Hereda directamente `07B-DATA-GOVERNANCE.md` §7: sin expiración automática, retención indefinida por decisión, no por omisión — un evento de auditoría de hace dos años sigue teniendo valor de cumplimiento/trazabilidad, a diferencia de un log técnico de depuración (`CCEC-004`), que sí tiene sentido rotar.

## 4. Diferencia con retención de logs de observabilidad

Auditoría (esta CCEC) y logs técnicos (`CCEC-004-OBSERVABILITY-PLATFORM.md`) tienen políticas de retención opuestas por diseño: auditoría se conserva indefinidamente (es evidencia de qué pasó, para siempre); logs de observabilidad rotan agresivamente (son evidencia de cómo se comportó el sistema recientemente, no un archivo histórico permanente) — mezclar ambos en una sola política de retención sería un error de diseño que esta separación previene explícitamente.

## 5. Inmutabilidad

Ningún registro de `audit_log` se edita ni se borra, ni siquiera por `super_admin` vía SQL Editor en operación normal — es append-only estricto (`DATABASE.md` §1). La única excepción sería una purga por orden legal explícita, fuera del alcance de este documento (`07B-DATA-GOVERNANCE.md` §11, cumplimiento formal, [FUTURO]).

---

## Checklist de acceso — antes de exponer auditoría a un rol nuevo

- [ ] ¿El alcance de lectura respeta `company_id` igual que cualquier otra tabla?
- [ ] ¿Hay algún evento (como impersonación) que deba excluirse de ese alcance por motivos de transparencia de plataforma, no solo de aislamiento multiempresa?
- [ ] ¿Se confirmó que ningún rol puede escribir o modificar `audit_log`, solo leerlo?
