# CCEC-004C — Estrategia de Alertas

> Cuándo un umbral de `CCEC-004A` deja de ser una métrica pasiva y se
> convierte en algo que alguien debe atender activamente. Complementa
> directamente `09I-AUTOMATION-GOVERNANCE.md` §6 (alertas de
> automatizaciones), generalizado a toda la plataforma.
>
> Última actualización: 2026-07-12.

---

## 1. Principio: alerta es una excepción, no un canal más de reporte

Una alerta interrumpe a alguien — por eso el listón para generar una es más alto que para simplemente registrar una métrica. Si todo se alerta, nada se atiende (fatiga de alertas, mismo riesgo ya señalado como "fatiga de notificación" en `09H-NOTIFICATION-ORCHESTRATION.md` §7). Regla: **una alerta existe solo cuando hay una acción clara que alguien debe tomar** — si no hay acción posible, es una métrica de dashboard (`CCEC-004A`), no una alerta.

## 2. Catálogo inicial de condiciones de alerta

| Condición | Origen | A quién alerta |
|---|---|---|
| Automatización falla repetidamente (agota reintentos > N veces) | `09I-AUTOMATION-GOVERNANCE.md` §6 | Dueño de la automatización |
| Cola de eventos con profundidad anómala | `08F-EVENT-ARCHITECTURE.md` §5, `09F-JOB-SCHEDULER.md` §6 | Equipo técnico de MAHP |
| Webhook agotó todos sus reintentos | `08B-WEBHOOKS.md` §4 | `company_admin` dueño del webhook |
| Integración con token vencido sin reconectar | `06F-INTEGRATIONS.md` §1, `09C-EVENT-CATALOG.md` (`integracion.token_vencido`) | `company_admin` |
| `api_key` con actividad anómala | `08E-SECURITY.md` §9 | Equipo técnico de MAHP (posible suspensión automática) |
| Tasa de error 5xx de una Edge Function fuera de rango | `08A-API-STANDARDS.md` §13 | Equipo técnico de MAHP |

## 3. Severidad

| Severidad | Criterio | Tiempo de respuesta esperado |
|---|---|---|
| Crítica | Afecta dinero, acceso, o múltiples empresas a la vez | Inmediato |
| Alta | Afecta a una empresa específica de forma bloqueante | Mismo día |
| Media | Degradación sin bloqueo total | Siguiente revisión programada |

Mapea directamente a la prioridad ya usada en `09C-EVENT-CATALOG.md` (🔴/🟡/🟢) — no se inventa una escala nueva, se reutiliza la ya establecida.

## 4. Canal de entrega de una alerta

Reutiliza el mismo motor de `09H-NOTIFICATION-ORCHESTRATION.md`, no un mecanismo aparte — una alerta es, técnicamente, una notificación de alta prioridad con destinatario resuelto por rol/dueño en vez de por preferencia general de usuario. La única diferencia de diseño: una alerta **no respeta** la preferencia de silenciar un canal si es de severidad crítica (mismo principio ya fijado en `09H` §7: las preferencias nunca pueden desactivar completamente un evento de prioridad alta).

## 5. Falsos positivos

Toda condición de alerta debe poder ajustarse (umbral, ventana de tiempo) sin cambiar de código — vive en configuración, no fija — porque una alerta que dispara falsos positivos con frecuencia se empieza a ignorar, socavando la utilidad de todas las demás. Es responsabilidad del dueño de cada categoría de alerta (equipo técnico para las de plataforma, `company_admin` para las de su empresa) reportar y ajustar umbrales ruidosos.

## 6. Relación con Approval Engine

Una alerta nunca ejecuta una acción automática por sí sola (ej. no desconecta una integración automáticamente al detectar anomalía) salvo que exista una automatización explícita y aprobada para eso (`09G-APPROVAL-WORKFLOWS.md`) — una alerta informa, no actúa, salvo decisión de negocio explícita en contrario.

---

## KPI de esta CCEC misma

**Tasa de acción sobre alerta**: % de alertas que resultan en una acción documentada del destinatario, vs. las que se ignoran — es la métrica que valida si el catálogo de condiciones (§2) está bien calibrado o generando ruido.

---

## Cierre de CCEC-001 y CCEC-004

Con `CCEC-004C` se completan los 8 documentos de esta iniciativa transversal (`CCEC-001` + 3 anexos, `CCEC-004` + 3 anexos). Ambas capacidades quedan disponibles para que MDS-011 (y cualquier fase posterior) las referencie en vez de redefinir auditoría u observabilidad — exactamente como MDS-011 lo pedía explícitamente en sus dependencias.
