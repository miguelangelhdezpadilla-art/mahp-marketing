# INTEGRATIONS MODULES — Especificación Funcional

> MDS-007, Documento 7 de 11. Los 6 módulos de integración externa. **Ninguno
> está construido** — el patrón de arquitectura ya está diseñado en
> `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §12 (adaptador propio por proveedor,
> credenciales en `integration_tokens`); este documento aplica la plantilla
> funcional de esta fase a cada una.
>
> Última actualización: 2026-07-09.

---

## 1. Meta (Instagram/Facebook) — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Publicar directamente y capturar métricas reales de Instagram/Facebook sin salir de MAHP |
| Problema / Valor | Elimina el reporte manual de seguidores (`06B-MARKETING-MODULES.md` #5) y el copiar-pegar de contenido hacia la red social |
| Usuarios / Roles / Permisos | `company_admin` conecta la cuenta (OAuth); `collaborator` publica dentro de los límites que el admin autorizó |
| Entradas → Proceso → Salidas | OAuth de la empresa → token guardado cifrado (`integration_tokens`) → publicación/lectura de métricas vía Graph API |
| Reglas de negocio | Un token vencido no debe fallar en silencio — debe generar una notificación de reconexión requerida |
| KPIs / Criterios de éxito | % de empresas con Meta conectado; reducción de reporte manual de seguidores |
| Automatización / IA | Community Manager Advisor, Advertising Advisor (`05A` #11-12) se activan de verdad solo con esta integración |
| Dependencias / Relaciones / Integraciones | Prerequisito de Redes Sociales (`06B` #5) con datos automáticos en vez de manuales |
| Escalabilidad / Evolución | Prioridad alta (`02-ARCHITECTURE` §12) — es el canal más solicitado por el mercado inicial de MAHP |

## 2. Google (Business/Calendar) — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Sincronizar reseñas de Google Business y fechas del calendario de MAHP con Google Calendar |
| Problema / Valor | El giro "restaurantes"/"servicios" (`01-IDENTIDAD-DEL-PRODUCTO.md` §9) depende fuertemente de reseñas de Google — hoy MAHP no las ve |
| Usuarios / Roles / Permisos | `company_admin` conecta |
| Entradas → Proceso → Salidas | OAuth → lectura de reseñas/calificación → escritura opcional en Google Calendar |
| Reglas de negocio | Reseñas nuevas podrían alimentar un KPI automático (`06D-ANALYTICS-MODULES.md` #1, cálculo automático) |
| KPIs / Criterios de éxito | Adopción entre empresas del giro restaurantero/servicios |
| Automatización / IA | SEO Specialist (`05A` #9) usa datos de Google Business como fuente |
| Dependencias / Relaciones / Integraciones | Se relaciona con KPIs y Calendario |
| Escalabilidad / Evolución | Prioridad alta, mismo criterio que Meta |

## 3. WhatsApp Business — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Notificaciones salientes y, eventualmente, atención al cliente vía WhatsApp |
| Problema / Valor | Hoy las notificaciones son 100% in-app (`06A-CORE-MODULES.md` #7) — el usuario tiene que abrir MAHP para enterarse |
| Usuarios / Roles / Permisos | `company_admin` configura el número de la empresa |
| Entradas → Proceso → Salidas | Evento de notificación → adaptador WhatsApp → mensaje enviado |
| Reglas de negocio | Nunca reemplaza la notificación in-app, la complementa — el registro de verdad sigue siendo `notifications` |
| KPIs / Criterios de éxito | Tiempo de respuesta a una notificación cuando llega por WhatsApp vs. solo in-app |
| Automatización / IA | Community Manager Advisor (`05A` #11) — hoy bloqueado precisamente por falta de esta integración |
| Dependencias / Relaciones / Integraciones | Extiende Notificaciones (`06A` #7) |
| Escalabilidad / Evolución | Prioridad media (`02-ARCHITECTURE` §12) |

## 4. TikTok — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Publicación y métricas de TikTok, mismo patrón que Meta |
| Problema / Valor | Canal ya modelado en `social_channels`/`CANAL_CAL_COLOR` (`ia.js`) pero sin integración real |
| Usuarios / Roles / Permisos | Igual que Meta (§1) |
| Entradas → Proceso → Salidas | Igual que Meta, adaptador propio (`02-ARCHITECTURE` §12) |
| Reglas de negocio | Igual que Meta |
| KPIs / Criterios de éxito | Igual que Meta, medido por canal |
| Automatización / IA | Video Campaign Advisor (`05A` #8) se beneficia directamente |
| Dependencias / Relaciones / Integraciones | Igual que Meta |
| Escalabilidad / Evolución | Prioridad media — detrás de Meta/Google en el orden sugerido por `02-ARCHITECTURE` §12 |

## 5. APIs (pública, de MAHP hacia terceros) — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Permitir que sistemas externos consuman datos de MAHP (no que MAHP consuma de ellos — dirección inversa a Meta/Google/WhatsApp/TikTok) |
| Problema / Valor | Habilita integraciones que un cliente construya por su cuenta (ej. su propio BI) sin depender de que MAHP construya cada integración |
| Usuarios / Roles / Permisos | `company_admin` genera sus propias API keys |
| Entradas → Proceso → Salidas | PostgREST ya expone REST (`API.md` §2) — falta la capa de `api_keys` por empresa con scopes (`02-ARCHITECTURE` §12) |
| Reglas de negocio | Un API key nunca debe exponer más de lo que el rol que la generó podría ver — mismo límite de RLS |
| KPIs / Criterios de éxito | Número de integraciones de terceros activas construidas por clientes |
| Automatización / IA | N/A |
| Dependencias / Relaciones / Integraciones | Depende de decisión de negocio (`02-ARCHITECTURE` §12: "depende de una decisión de producto que todavía no se ha tomado") |
| Escalabilidad / Evolución | Baja prioridad hasta que haya demanda real de un cliente pidiéndolo |

## 6. Webhooks — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Notificar a sistemas externos cuando algo relevante ocurre en MAHP (ej. actividad completada → webhook a un sistema del cliente) |
| Problema / Valor | Complemento natural de APIs (§5) — en vez de que el tercero pregunte constantemente, MAHP le avisa cuando pasa algo |
| Usuarios / Roles / Permisos | `company_admin` configura endpoints de webhook |
| Entradas → Proceso → Salidas | Evento de dominio (mismo catálogo que dispara Notificaciones, `06A` #7) → `POST` a la URL configurada |
| Reglas de negocio | Reintentos con backoff si el endpoint del cliente falla — nunca bloquea la operación interna de MAHP por un webhook fallido |
| KPIs / Criterios de éxito | Entrega exitosa de webhooks (%) |
| Automatización / IA | N/A |
| Dependencias / Relaciones / Integraciones | Reutiliza el mismo catálogo de eventos que Notificaciones y el futuro motor de Automatizaciones (`06E` #3) |
| Escalabilidad / Evolución | Se construye junto con APIs (§5) — no tiene valor aislado sin un consumidor externo real |
