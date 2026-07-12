# CCEC-001 — ENTERPRISE AUDIT PLATFORM

> Capacidad Compartida (CCEC) — no una fase de producto (MDS), una
> capacidad transversal que todo MDS presente y futuro reutiliza en vez de
> redefinir. Origen: el mismo hallazgo se reportó de forma independiente en
> `07F-SECURITY-AND-AUDIT.md` §5 (MDS-008), `08E-SECURITY.md` §5 y
> `08B-WEBHOOKS.md` §7 (MDS-009), y `09I-AUTOMATION-GOVERNANCE.md` §5
> (MDS-010) — cuatro fases seguidas señalando el mismo vacío de auditoría
> operativa sin resolverlo. Este documento es esa resolución.
>
> **Estado: [PARCIAL].** `audit_log` (`DATABASE.md` §7) ya existe y cubre 3
> categorías de eventos administrativos. Este documento diseña cómo
> extenderlo a todo lo que las fases posteriores han identificado, sin
> romper lo ya construido.
>
> Última actualización: 2026-07-12.

---

## 1. Por qué esto es una CCEC y no un capítulo más de un MDS

Cada MDS que se ha escrito desde MDS-008 ha necesitado auditoría — y cada uno la ha vuelto a definir con su propio criterio parcial ("esto debería registrarse en `audit_log`"), sin una regla común de qué hace a un evento auditable, quién lo puede leer, ni cuánto tiempo se conserva. El resultado, si se sigue así, es una tabla `audit_log` con eventos de forma y calidad inconsistente entre dominios. Una CCEC existe precisamente para esto: **una sola definición de la capacidad, consumida por N dominios**, en vez de N definiciones parciales que eventualmente convergen mal.

## 2. Lo que ya existe (no se rediseña, se hereda)

`audit_log` (`DATABASE.md` §7, `v3`): `id`, `actor_id` → `profiles` (nullable), `company_id` → `companies`, `action`, `target_type`, `target_id` (texto), `details` (jsonb), `created_at`. `insert`-only vía trigger, nunca directo desde el cliente (`07F-SECURITY-AND-AUDIT.md` §5). Cobertura actual: empresa creada, invitación creada/cancelada, acceso revocado/restaurado (`MODULOS.md` #5).

Esta estructura ya es correcta y suficiente como base — este documento no propone una tabla nueva, propone **completar su cobertura** y **formalizar su gobierno**.

## 3. Principio rector

**Todo evento que un humano razonablemente preguntaría "¿quién hizo esto y cuándo?" es auditable por defecto** — la pregunta al diseñar cualquier capacidad nueva no es "¿necesita auditoría?" sino "¿por qué NO la necesitaría?". Este es el cambio de postura respecto a cómo se ha venido documentando: hasta MDS-010, cada fase señalaba auditoría como algo pendiente de agregar; desde esta CCEC, es el default, y omitirla requiere justificación explícita.

## 4. Alcance consolidado

Ver catálogo completo en `CCEC-001A-AUDIT-EVENT-CATALOG.md` — consolida, sin repetir contenido íntegro, los eventos ya identificados en:

| Fuente | Qué aportó |
|---|---|
| `07F-SECURITY-AND-AUDIT.md` §5 (MDS-008) | Gap de impersonación de `super_admin`; eventos operativos de `actividades` |
| `08E-SECURITY.md` §5 (MDS-009) | Eventos de conexión/token de integraciones, `api_keys` |
| `08B-WEBHOOKS.md` §7 (MDS-009) | Configuración de webhooks |
| `09I-AUTOMATION-GOVERNANCE.md` §5 (MDS-010) | Eventos de gobierno de automatizaciones |

## 5. Arquitectura

Sin cambios de infraestructura — sigue siendo Postgres, `insert`-only, poblada exclusivamente por triggers `security definer` (mismo patrón ya validado, `07C-DATABASE-STANDARDS.md` §3). Lo que cambia es la **disciplina de cobertura**: todo trigger nuevo que module datos con relevancia administrativa/de seguridad debe, en el mismo cambio, agregar su `insert` correspondiente a `audit_log` — es una regla de `CLAUDE.md` §7 aplicada específicamente a auditoría, no una capacidad técnica nueva.

```
Evento con relevancia de auditoría (cualquier dominio)
        │
        ▼
Trigger security definer del dominio (ya existente o nuevo)
        │
        ▼
insert en audit_log (actor_id, company_id, action, target_type,
                      target_id, details)
        │
        ▼
Consumido por: panel de super_admin (hoy), futuro panel de
company_admin con alcance a su empresa (§/CCEC-001B, [FUTURO])
```

## 6. Qué NO cubre esta CCEC

- **Observabilidad de sistema** (salud de colas, latencia, métricas de rendimiento) — es `CCEC-004-OBSERVABILITY-PLATFORM.md`. Auditoría responde "quién hizo qué"; observabilidad responde "qué tan bien está funcionando el sistema". Son preguntas distintas con consumidores distintos (seguridad/cumplimiento vs. ingeniería/operación).
- **Historial de negocio de solo-inserción** (`activity_updates`, `points_log`, `follower_logs`) — esos ya cumplen función de trazabilidad propia dentro de su dominio (`07D-DATA-LIFECYCLE.md` §5) y no necesitan además una entrada en `audit_log`; duplicarlo sería redundante, no más seguro.

## 7. Extensión de dominios futuros

Todo MDS posterior a esta CCEC (MDS-012 en adelante) que module un evento con relevancia de auditoría **no vuelve a discutir si debe auditarse** — consulta `CCEC-001A-AUDIT-EVENT-CATALOG.md`, agrega su evento si falta siguiendo el formato ya establecido ahí, y listo. Guía de integración completa en `CCEC-001C-AUDIT-INTEGRATION-GUIDE.md`.

---

## Diagrama — de 4 fuentes dispersas a una sola capacidad

```
Antes (MDS-008 a MDS-010):
  07F señala gap ──┐
  08E señala gap ──┼──▶  4 hallazgos aislados, ningún dueño,
  08B señala gap ──┤     ningún estándar común, riesgo de
  09I señala gap ──┘     implementarse 4 veces distinto

Después (esta CCEC):
  07F, 08E, 08B, 09I ──▶  CCEC-001 (una sola definición)
                                │
                    consumida por todo dominio futuro
                    sin redefinir el concepto cada vez
```

---

## Checklist — antes de dar por completa la auditoría de un dominio nuevo

- [ ] ¿Se consultó `CCEC-001A-AUDIT-EVENT-CATALOG.md` en vez de decidir "a criterio" qué se audita?
- [ ] ¿Cada evento nuevo tiene su `insert` en `audit_log` en el mismo trigger/cambio que lo produce, no como tarea separada "para después"?
- [ ] ¿Se documentó en `CCEC-001A` si el evento no existía ahí?
- [ ] ¿Se revisó `CCEC-001B` para confirmar quién debe poder leer este evento?

---

## Entregable

**Resumen**: `audit_log` ya es la infraestructura correcta; lo que faltaba era disciplina de cobertura y una definición común de qué es auditable — esta CCEC la provee, consolidando 4 hallazgos independientes en una sola capacidad reutilizable. **Gap más urgente, cerrado el 2026-07-12 (`v19`)**: impersonación de `super_admin` (`07F-SECURITY-AND-AUDIT.md` §5) — era el único de los eventos identificados con impacto de seguridad directo, no solo de trazabilidad operativa. Implementado vía `log_impersonation_start()` (`security definer`, mismo patrón que `soft_delete_actividades()`), invocada por `empresa.js` al detectar impersonación activa — ver `DATABASE.md` §7 y `CCEC-001A` para el detalle. Pendiente: `impersonacion_finalizada` (requiere detectar cierre de sesión, no solo inicio).
