# INTEGRATIONS CATALOG — Catálogo Completo de Integraciones

> MDS-009, Documento 4 de 10. Extiende `06F-INTEGRATIONS.md` (6 módulos ya
> diseñados: Meta, Google, WhatsApp, TikTok, APIs, Webhooks) con el resto de
> servicios pedidos por esta fase. Formato por integración: Objetivo,
> Beneficio, Datos intercambiados, Frecuencia, Seguridad, Dependencias,
> Casos de uso, Riesgos. **Todo [FUTURO]** — ninguna integración de este
> catálogo está construida.
>
> Última actualización: 2026-07-12.

---

## Ya diseñadas en `06F-INTEGRATIONS.md` — no se repiten aquí

Meta (Instagram/Facebook), Google Business/Calendar, WhatsApp Business, TikTok, API pública de MAHP, Webhooks. Ver ese documento para su especificación completa; este catálogo asume esas seis como ya cubiertas y agrega las siguientes.

---

## Google Drive

- **Objetivo**: adjuntar/sincronizar archivos de campaña (briefs, artes) sin salir de MAHP.
- **Beneficio**: elimina el ir-y-venir entre MAHP y una carpeta compartida externa para encontrar el archivo fuente de una evidencia o pieza de contenido.
- **Datos intercambiados**: metadatos de archivo (nombre, link, tipo) — no el contenido binario, que permanece en Drive.
- **Frecuencia**: bajo volumen, a demanda (cuando se adjunta un archivo).
- **Seguridad**: OAuth por empresa, scope de solo lectura/escritura de archivos específicos (`drive.file`), nunca acceso completo al Drive del usuario.
- **Dependencias**: relacionado con "Adjuntos de archivo en propuestas" (`MODULOS.md`, diseñado no construido).
- **Casos de uso**: adjuntar el brief de una campaña; vincular el archivo fuente de una pieza gráfica publicada.
- **Riesgos**: scope de OAuth mal configurado podría pedir más acceso del necesario — mitigado exigiendo el scope mínimo (`drive.file`) desde el diseño.

## Google Analytics

- **Objetivo**: traer métricas de tráfico web reales al dashboard de MAHP.
- **Beneficio**: KPIs de "visitas"/"conversión" dejan de ser reporte manual.
- **Datos intercambiados**: métricas agregadas de solo lectura (sesiones, conversiones) por rango de fecha.
- **Frecuencia**: sincronización periódica (diaria), no en tiempo real.
- **Seguridad**: OAuth por empresa, scope de solo lectura.
- **Dependencias**: KPIs (`06D-ANALYTICS-MODULES.md`).
- **Casos de uso**: KPI automático de tráfico atribuido a una campaña.
- **Riesgos**: atribución de tráfico a campaña específica requiere convención de UTMs que MAHP no impone hoy — sin eso, el dato llega pero no se puede relacionar automáticamente con la campaña correcta.

## Google Ads

- **Objetivo**: métricas de campañas pagadas (gasto, alcance, conversiones) dentro de MAHP.
- **Beneficio**: unifica orgánico (redes) y pagado (Ads) en un solo panel de KPIs.
- **Datos intercambiados**: métricas agregadas de solo lectura por campaña de Ads.
- **Frecuencia**: sincronización periódica (diaria).
- **Seguridad**: OAuth por empresa, scope de solo lectura de reportes.
- **Dependencias**: KPIs, Presupuestos (`06B-MARKETING-MODULES.md`).
- **Casos de uso**: Advertising Advisor (`05A-AI-AGENTS.md` #12) usa este dato como fuente real en vez de estimaciones.
- **Riesgos**: requiere que la empresa cliente ya tenga cuenta de Google Ads activa — adopción limitada al segmento que ya invierte en pauta.

## TikTok — ya cubierta en `06F-INTEGRATIONS.md` §4

## YouTube

- **Objetivo**: publicación y métricas de video, mismo patrón que Meta/TikTok.
- **Beneficio**: canal de video gestionado desde el mismo calendario que el resto.
- **Datos intercambiados**: metadatos de video subido, métricas de vistas/retención de solo lectura.
- **Frecuencia**: a demanda (publicación) + sincronización periódica (métricas).
- **Seguridad**: OAuth por empresa, scope de YouTube Data API acotado a gestión de contenido propio.
- **Dependencias**: igual que Meta (`06F` §1).
- **Casos de uso**: Video Campaign Advisor (`05A` #8).
- **Riesgos**: cuotas de la YouTube Data API son más restrictivas que Graph API — puede limitar frecuencia de sincronización a mayor escala.

## LinkedIn

- **Objetivo**: publicación en LinkedIn para el mercado B2B/agencias/corporativos.
- **Beneficio**: cubre un canal que Meta/TikTok no atienden, relevante para el segmento "agencias"/"corporativos" (`01-IDENTIDAD-DEL-PRODUCTO.md` §9).
- **Datos intercambiados**: contenido publicado, métricas de engagement de solo lectura.
- **Frecuencia**: a demanda + sincronización periódica.
- **Seguridad**: OAuth por empresa (LinkedIn Marketing API, requiere aprobación de partner de LinkedIn).
- **Dependencias**: igual que Meta.
- **Casos de uso**: Community Manager Advisor (`05A` #11) extendido a B2B.
- **Riesgos**: acceso a la API de LinkedIn requiere aprobación de la plataforma, no es autoservicio — riesgo de plazo, no técnico.

## Stripe

- **Objetivo**: cobro de suscripción de MAHP a sus empresas cliente.
- **Beneficio**: activa el modelo de negocio SaaS real (`PROJECT-BLUEPRINT.md` §10, Arquitectura SaaS).
- **Datos intercambiados**: eventos de suscripción/pago (webhook entrante), nunca datos de tarjeta (los retiene Stripe, PCI-DSS es responsabilidad de Stripe, no de MAHP).
- **Frecuencia**: eventos entrantes según ciclo de facturación (mensual/anual).
- **Seguridad**: webhook con validación de firma (`08B-WEBHOOKS.md` §2–3); llave secreta de Stripe nunca en cliente.
- **Dependencias**: tabla futura `subscriptions`, `companies.active` como reflejo del estado de pago.
- **Casos de uso**: activar/suspender acceso de una empresa según estado de pago.
- **Riesgos**: es la integración de mayor impacto de negocio si falla (una empresa que pagó pero queda suspendida por un webhook perdido) — exige idempotencia y reintentos robustos desde el primer día que se construya, no como mejora posterior.

## Mercado Pago

- **Objetivo**: mismo rol que Stripe, para el mercado latinoamericano donde Mercado Pago tiene mayor adopción que Stripe.
- **Beneficio**: cubre mercados donde Stripe no opera o donde el cliente ya usa Mercado Pago para su propio negocio.
- **Datos intercambiados**: igual que Stripe.
- **Frecuencia**: igual que Stripe.
- **Seguridad**: igual que Stripe, validación de firma propia de Mercado Pago.
- **Dependencias**: igual que Stripe — probablemente exclusive-or con Stripe por región, no ambas activas para la misma empresa.
- **Casos de uso**: igual que Stripe.
- **Riesgos**: mantener dos proveedores de pago duplica la superficie de webhooks entrantes a mantener — decisión de negocio pendiente sobre si se soportan ambos o se elige uno según mercado inicial.

## OpenAI

- **Objetivo**: proveedor de IA alternativo/adicional a Groq.
- **Beneficio**: ya previsto por diseño desde `IA.md`/`02-ARCHITECTURE` §11 — independencia de proveedor de IA, no atado a uno solo.
- **Datos intercambiados**: prompt de contexto (igual que Groq hoy) → contenido generado.
- **Frecuencia**: a demanda (generación de calendario u otro contenido).
- **Seguridad**: mismo patrón que Groq — API key server-side, Edge Function como único punto de contacto (`API.md` §4).
- **Dependencias**: mismo adaptador que Groq, intercambiable.
- **Casos de uso**: fallback si Groq no está disponible; comparación de calidad de salida entre proveedores.
- **Riesgos**: costo por token distinto a Groq — requiere control de consumo si se activa (`05C-AI-GOVERNANCE.md`).

## Anthropic

- **Objetivo**: igual que OpenAI — proveedor de IA alternativo, con capacidades de razonamiento más largo para tareas de IA más complejas que generación de calendario (ej. futuros agentes de análisis, `05A-AI-AGENTS.md`).
- **Beneficio**: igual que OpenAI, más adecuado para agentes que requieran contexto extenso (histórico de una empresa completa).
- **Datos intercambiados**: igual que Groq/OpenAI.
- **Frecuencia**: a demanda.
- **Seguridad**: igual que Groq/OpenAI.
- **Dependencias**: igual que Groq/OpenAI.
- **Casos de uso**: agentes de IA más sofisticados que la generación de calendario actual (`05A-AI-AGENTS.md`, catálogo de 24 agentes, mayoría [FUTURO]).
- **Riesgos**: igual que OpenAI — control de costo.

## n8n / Zapier / Make

- **Objetivo**: permitir que un cliente conecte MAHP con su propio stack de automatización sin que MAHP construya cada integración una por una.
- **Beneficio**: multiplica el número de integraciones efectivas sin multiplicar el trabajo de ingeniería de MAHP — un solo conector genérico (vía API pública, §/`08` documento principal §5) habilita cientos de combinaciones que el cliente arma por su cuenta.
- **Datos intercambiados**: depende de lo que el cliente configure — MAHP expone eventos (vía webhooks, `08B`) y datos (vía API pública) genéricos, no específicos a estas plataformas.
- **Frecuencia**: variable, definida por el cliente.
- **Seguridad**: `api_keys` con scopes (`08E-SECURITY.md`), igual que cualquier consumidor de la API pública.
- **Dependencias**: requiere que existan primero API pública + webhooks (§/`08` documento principal §12) — no es una integración nativa construida por MAHP, es una consecuencia de tener una API pública bien diseñada.
- **Casos de uso**: cliente conecta "actividad completada en MAHP" → "crear tarea en su Trello"; "nuevo lead en su CRM" → "crear actividad en MAHP".
- **Riesgos**: bajo, porque MAHP no construye nada específico para estas plataformas — el riesgo es el de la API pública en general (§/`08E-SECURITY.md`).

## Slack / Microsoft Teams

- **Objetivo**: notificaciones salientes al canal de trabajo del cliente, para el segmento "agencias"/"corporativos".
- **Beneficio**: mismo rol que WhatsApp (`06F-INTEGRATIONS.md` §3) pero para equipos que ya viven en Slack/Teams en vez de WhatsApp.
- **Datos intercambiados**: mensaje de notificación (mismo evento que alimenta `notifications` in-app).
- **Frecuencia**: por evento (asignación, avance, completada).
- **Seguridad**: webhook entrante de Slack/Teams (URL de canal generada por el cliente), tratado como credencial sensible.
- **Dependencias**: extiende Notificaciones (`06A-CORE-MODULES.md` #7), reutiliza el catálogo de eventos de `08F-EVENT-ARCHITECTURE.md`.
- **Casos de uso**: aviso de "actividad completada" directo al canal de marketing del cliente en Slack.
- **Riesgos**: bajo — es notificación de solo lectura hacia el cliente, no escritura hacia MAHP.

## Correo electrónico

- **Objetivo**: canal de notificación universal, sin depender de que el cliente instale/configure nada.
- **Beneficio**: es el canal de integración de menor fricción — todo usuario tiene correo, no todos usan Slack/WhatsApp.
- **Datos intercambiados**: mismo catálogo de eventos que notificaciones in-app, formateado como email.
- **Frecuencia**: por evento, o digest diario/semanal (a decidir).
- **Seguridad**: proveedor transaccional (ej. Resend, Postmark — no decidido, no se fabrica una elección aquí sin confirmar con el usuario, `CLAUDE.md` §6), API key server-side.
- **Dependencias**: extiende Notificaciones.
- **Casos de uso**: resumen semanal de avance para `director`, que hoy tiene que entrar a la app para verlo.
- **Riesgos**: deliverability (que el correo no caiga en spam) es un riesgo operativo continuo, no solo de implementación inicial.

## SMS

- **Objetivo**: notificación de mayor urgencia que correo, para eventos críticos.
- **Beneficio**: alcance garantizado incluso sin conexión a internet activa del destinatario.
- **Datos intercambiados**: mensaje corto, mismo catálogo de eventos filtrado a los más urgentes.
- **Frecuencia**: baja — reservado a eventos críticos, no notificación general (costo por mensaje es significativamente mayor que email/in-app).
- **Seguridad**: proveedor (ej. Twilio — no decidido), API key server-side, número de destino validado como perteneciente al usuario.
- **Dependencias**: extiende Notificaciones.
- **Casos de uso**: actividad vencida sin completar, un solo caso de uso claro — no reemplazo general de notificaciones in-app.
- **Riesgos**: costo por mensaje — requiere límite de uso por empresa para no generar gasto no controlado (`05C-AI-GOVERNANCE.md`, mismo principio de control de costo aplicado aquí).

## APIs empresariales futuras

- **Objetivo**: placeholder deliberado para integraciones aún no identificadas que surjan de clientes empresariales específicos (ERPs, sistemas de punto de venta para el segmento restaurantero).
- **Beneficio**: la arquitectura de adaptador propio (§/`08` documento principal §2) ya soporta agregar cualquier integración nueva sin rediseño — este ítem documenta esa capacidad, no una integración específica.
- **Datos intercambiados**: por definir caso por caso.
- **Frecuencia**: por definir.
- **Seguridad**: mismo estándar que toda integración (`08E-SECURITY.md`).
- **Dependencias**: ninguna nueva — reutiliza todo lo diseñado en este documento.
- **Casos de uso**: por definir cuando exista un cliente empresarial real que lo requiera.
- **Riesgos**: el único riesgo real es construir una integración así antes de que exista demanda confirmada — mismo principio de activación por demanda de `08-ENTERPRISE-INTEGRATION-PLATFORM.md` §12.

---

## Tabla resumen de prioridad sugerida

| Integración | Prioridad | Motivo |
|---|---|---|
| Meta, Google Business/Calendar | Alta | Ya validado por mercado inicial (`06F`) |
| Stripe o Mercado Pago | Alta, condicionada | Solo cuando se active el modelo de facturación real |
| WhatsApp, TikTok, Google Analytics/Ads | Media | Complementan lo ya validado, sin ser bloqueantes |
| n8n/Zapier/Make | Media | Alto apalancamiento (una sola API pública habilita muchas combinaciones) una vez exista API pública |
| YouTube, LinkedIn, Slack/Teams, correo, SMS | Baja–Media | Segmentos específicos, no el mercado inicial general |
| Google Drive, OpenAI, Anthropic, APIs empresariales futuras | Baja | Mejoras de calidad de vida o redundancia de proveedor, no bloqueantes |
