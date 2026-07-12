# NOTIFICATION ORCHESTRATION — Orquestación de Notificaciones

> MDS-010, Documento 9 de 10. Estrategia unificada para notificaciones
> in-app, correo, WhatsApp, Slack, Microsoft Teams, push móviles,
> escalamiento de alertas y preferencias por usuario.
>
> **Estado: [PARCIAL]** — el canal in-app ya está construido (`MODULOS.md`
> #20); todo lo demás es **[FUTURO]**, condicionado a las integraciones
> respectivas (`08C-INTEGRATIONS-CATALOG.md`).
>
> Última actualización: 2026-07-12.

---

## 1. Un motor, muchos canales

Principio central: **el evento y el mensaje se deciden una sola vez; el canal es un detalle de entrega**, no una decisión de negocio separada por canal. Hoy `notifications` (`DATABASE.md` §7) ya cumple ese rol para el único canal existente (in-app) — este documento extiende el mismo modelo a múltiples canales sin cambiar dónde vive la decisión de "qué evento genera qué mensaje" (eso sigue siendo el catálogo de eventos, `09C-EVENT-CATALOG.md`).

```
Evento (09C-EVENT-CATALOG.md)
        │
        ▼
Notification Engine: arma el mensaje UNA vez
        │
        ▼
Resuelve canal(es) según preferencia del destinatario (§5)
        │
   ┌────┼────┬────────┬────────┬────────┬─────────┐
   ▼    ▼    ▼        ▼        ▼        ▼         ▼
In-app Correo WhatsApp  Slack   Teams    SMS      Push
[EXISTE][FUTURO][FUTURO][FUTURO][FUTURO][FUTURO] [FUTURO]
```

## 2. Notificaciones en la plataforma (in-app) — ya construido

`notifications` + `configurarNotificaciones()` (`js/ui.js`, `MODULOS.md` #20) — sin cambios de diseño. Sigue siendo el canal por defecto y el único garantizado para todo usuario, sin depender de que haya configurado una integración externa.

## 3. Correo electrónico

Ver `08C-INTEGRATIONS-CATALOG.md`, sección Correo — canal de menor fricción, candidato de primera expansión más allá de in-app. Modo de entrega propuesto: inmediato para eventos de alta prioridad (`09C-EVENT-CATALOG.md`), digest agrupado (diario/semanal) para eventos informativos de baja prioridad — evita saturar al usuario con un correo por cada notificación menor.

## 4. WhatsApp / Slack / Microsoft Teams

Ver `08C-INTEGRATIONS-CATALOG.md` para el diseño de cada integración. Desde la perspectiva de este documento, los tres son variantes del mismo patrón: **complementan, nunca reemplazan** la notificación in-app — el registro de verdad de que algo se notificó sigue siendo `notifications` (principio ya fijado en `06F-INTEGRATIONS.md` §3 para WhatsApp específicamente, generalizado aquí a los tres canales).

## 5. Push móviles

**[FUTURO], sin condición de activación cercana** — depende de que exista una app móvil de MAHP (`06J-FUTURE-MODULES.md`, fuera de alcance actual) o que un cliente construya la suya sobre la API pública (`08-ENTERPRISE-INTEGRATION-PLATFORM.md` §5) y consuma notificaciones vía webhook. No se diseña infraestructura de push nativa sin que exista primero la superficie móvil que la necesitaría.

## 6. Escalamiento de alertas

Un evento de alta prioridad (`09C-EVENT-CATALOG.md`, ej. `pago.fallido`, `integracion.fallida` bloqueante) que no se atiende en un tiempo configurado escala al siguiente rol en la cadena de responsabilidad — mismo patrón ya usado como ejemplo en `09-ENTERPRISE-AUTOMATION-PLATFORM.md` §12 (recordatorio de actividad vencida escalando de colaborador a `company_admin`). El escalamiento en sí es un workflow más (`09A-WORKFLOW-ENGINE.md`), no un mecanismo aparte — reutiliza espera + condición + notificación, ningún concepto nuevo.

## 7. Preferencias por usuario

**[FUTURO]**: cada usuario decide, por tipo de evento, qué canal(es) prefiere recibir (ej. "avances de tarea solo in-app, pero actividades vencidas también por correo"). Hoy no existe esta granularidad — todo pasa únicamente por in-app. Diseño mínimo propuesto: tabla `notification_preferences` (`user_id`, `event_type`, `channel`, `enabled`) — aditiva, no requiere cambiar la tabla `notifications` existente.

**Regla no negociable de diseño**: las preferencias de canal nunca pueden desactivar completamente un evento de la categoría "aprobación requerida" (`09G-APPROVAL-WORKFLOWS.md`) o de prioridad 🔴 alta (`09C-EVENT-CATALOG.md`) — un usuario puede elegir *cómo* se le avisa, no si se le avisa, para eventos críticos.

## 8. Relación con Auditoría

Toda entrega de notificación por un canal externo (correo, WhatsApp, etc.) queda registrada con su resultado (entregado/fallido) — mismo patrón ya diseñado para webhooks (`08B-WEBHOOKS.md` §6, tabla `webhook_deliveries`), reutilizable aquí en vez de crear una tabla de logs paralela por canal.

---

## KPIs

| KPI | Definición |
|---|---|
| Tasa de entrega por canal | % de notificaciones entregadas exitosamente, desglosado por canal |
| Canal preferido por tipo de evento | Distribución de preferencias reales una vez existan (§7) |
| Tiempo de respuesta a alertas escaladas | Desde escalamiento hasta que alguien actúa |
| Fatiga de notificación | Proxy: % de notificaciones nunca abiertas — señal de que el digest o la granularidad de canal necesita ajuste |
