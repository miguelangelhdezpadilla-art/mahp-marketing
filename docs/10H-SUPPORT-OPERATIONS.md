# SUPPORT OPERATIONS — Operación de Soporte

> MDS-011, Documento 9 de 10. Niveles de soporte, escalamiento, base de
> conocimiento, gestión de incidencias, estado de servicios y comunicación
> con clientes.
>
> **Estado real hoy**: soporte informal y directo — una sola empresa
> cliente, sin niveles, sin base de conocimiento pública, sin página de
> estado de servicio. Este documento diseña la estructura para cuando el
> volumen de clientes deje de permitir ese modelo 1:1.
>
> Última actualización: 2026-07-12.

---

## 1. Niveles de soporte — propuesta

| Nivel | Quién atiende | Qué resuelve | Estado |
|---|---|---|---|
| L0 — Autoservicio | Base de conocimiento (§3) | Preguntas frecuentes, cómo usar una función ya existente | [FUTURO] |
| L1 — Soporte general | Persona designada (hoy: el propio equipo de MAHP, sin designación formal) | Dudas de uso, reportes de bug sin causa clara | Parcial — existe informalmente |
| L2 — Soporte técnico | Quien tiene acceso a Supabase/código | Bugs confirmados, problemas de datos, incidentes de plataforma | Existe informalmente (es, hoy, la misma persona que L1) |
| L3 — Desarrollador Portal | Soporte a integradores externos (`08D-DEVELOPER-PORTAL.md` §9) | Problemas de API pública, SDK, webhooks | [FUTURO] — no aplica hasta que exista audiencia externa de desarrolladores |

**Realidad actual honesta**: MAHP no tiene niveles reales todavía — hay una sola persona atendiendo todo. Este documento no finge una estructura de niveles que no existe; documenta la que se activaría al crecer.

## 2. Escalamiento

Mismo patrón ya establecido en `10D-OPERATIONAL-EXCELLENCE.md` §7 y `09I-AUTOMATION-GOVERNANCE.md` §2: por severidad, a un dueño responsable identificado — no se diseña un mecanismo de escalamiento distinto para soporte al cliente del que ya existe para incidentes operativos, es el mismo concepto aplicado a quién recibe primero el reporte.

## 3. Base de conocimiento

**[FUTURO]**: documentación orientada al usuario final de la empresa cliente (`company_admin`/`director`/`collaborator`) — distinta en audiencia y tono de todo `/docs` (que es documentación técnica/arquitectónica para quien construye MAHP, no para quien lo usa). No existe hoy ningún documento de este tipo — es una brecha real de producto, no solo de soporte: un `collaborator` nuevo aprende a usar MAHP por ensayo y prueba o preguntando directamente, sin manual de usuario.

## 4. Gestión de incidencias (reportadas por cliente)

Distinto del "incidente de plataforma" de `10D-OPERATIONAL-EXCELLENCE.md` §2 (que puede no haber sido reportado por nadie, detectado por alerta) — aquí el origen es siempre un cliente reportando algo. Flujo propuesto: reporte → triage (¿es un bug real, una duda de uso, o una solicitud de función nueva?) → según el triage, entra a soporte (L1/L2) o al backlog de producto (`ROADMAP.md`), nunca se mezclan ambos caminos.

## 5. Estado de servicios

**[FUTURO]**: página de estado pública (ej. `status.mahp.app`, subdominio no reservado) mostrando disponibilidad reciente e incidentes activos — se alimenta de `CCEC-004A`/`CCEC-004C` (referenciado, no redefinido), no de un sistema de estado propio y separado. No se justifica hoy con un solo cliente que ya tiene comunicación directa; se activa cuando el volumen de clientes haga que la comunicación 1:1 de cada incidente deje de ser práctica.

## 6. Comunicación con clientes

Hoy: directa, informal (mismo canal que cualquier otra comunicación con el único cliente activo). Propuesta para escalar: comunicación proactiva de incidentes (no esperar a que el cliente pregunte), con plantilla mínima — qué pasó, impacto, tiempo estimado de resolución, mismo criterio de transparencia ya aplicado en toda esta documentación (nunca ocultar una limitación real, `CLAUDE.md` §2).

---

## KPIs

| KPI | Definición |
|---|---|
| Tiempo de primera respuesta | Por nivel de soporte |
| Tasa de resolución en L1 sin escalar | Señal de si la base de conocimiento/documentación de producto es suficiente |
| Satisfacción del cliente | [FUTURO] — requiere mecanismo de encuesta, no existe hoy |
| Incidencias que resultaron ser solicitudes de producto | Señal de qué tan bien se distingue soporte de roadmap (§4) |
