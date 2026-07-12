# ENTERPRISE INTEGRATION PLATFORM — Plataforma de Integraciones y APIs de MAHP

> MDS-009, Documento principal (1 de 10). Estrategia completa de comunicación
> entre MAHP y sistemas externos: APIs, webhooks, eventos, SDK,
> integraciones, seguridad, versionado, developer experience y marketplace.
> No es solo un catálogo de endpoints — es cómo MAHP se conecta con el
> mundo sin dejar de ser, en su núcleo, el sistema simple y sin servidor
> propio que es hoy (`PROJECT-BLUEPRINT.md` §5, principio 5).
>
> **Punto de partida real, no aspiracional**: hoy MAHP no tiene API pública,
> no tiene webhooks, no tiene SDK, no tiene Marketplace. Tiene PostgREST
> (autogenerado) + una Edge Function (`API.md`). Este documento diseña la
> plataforma que se construye *a partir de* ese punto de partida, con la
> misma convención de estado que el resto de `/docs`: **[EXISTE]** / **[FUTURO]** /
> **[PARCIAL]** — nada se presenta como construido si no lo está (`CLAUDE.md` §2).
>
> Última actualización: 2026-07-12.

---

## 1. Filosofía API First

MAHP no adopta "API First" como promesa de marketing — lo adopta como restricción de diseño: **toda funcionalidad nueva debe poder invocarse por API antes de tener una pantalla**, aunque hoy, en la práctica, el único consumidor de esa API sea el propio frontend de MAHP. Esto ya es parcialmente cierto por construcción: PostgREST expone automáticamente cada tabla, así que MAHP ha sido, sin proponérselo explícitamente, "API First" desde su primera tabla (`API.md` §2). Lo que falta no es la filosofía, es la superficie pública, la documentación externa y el control de acceso de terceros — eso es lo que diseña este documento.

Tres compromisos que se derivan de esta filosofía:

1. **Ninguna integración privilegiada se salta RLS.** Un adaptador de integración (Meta, WhatsApp, Stripe) escribe a MAHP con los mismos límites de `company_id` que cualquier usuario humano — nunca con una llave maestra que ignore el aislamiento multiempresa (`07H-MULTI-TENANT-DESIGN.md` §9).
2. **La API pública, cuando exista, es un cliente más de PostgREST/RLS, no un sistema paralelo.** No se construye una capa de autorización nueva para terceros — se reutiliza la que ya protege a la aplicación (§/`08E-SECURITY.md`).
3. **Simplicidad hasta que la demanda real la rompa.** No se construye Marketplace, SDK multi-lenguaje ni motor de eventos sofisticado por anticipación — cada capa de esta plataforma tiene una condición de activación explícita (§12), consistente con `PROJECT-BLUEPRINT.md` §5 principio 5.

## 2. Arquitectura General

```
                         ┌─────────────────────────────┐
                         │      MAHP (Supabase)          │
                         │                                │
   Frontend MAHP  ──────▶│  PostgREST (autogenerado)      │◀────── Terceros [FUTURO]
   (hoy, único            │  + RLS como única autorización │        (con API key,
   consumidor real)       │                                │         mismo límite RLS)
                         │  Edge Functions (adaptadores)   │
                         │   - generar-calendario [EXISTE] │
                         │   - meta-adapter       [FUTURO] │──▶ Graph API (Meta)
                         │   - google-adapter     [FUTURO] │──▶ Google APIs
                         │   - whatsapp-adapter   [FUTURO] │──▶ WhatsApp Business API
                         │   - stripe-webhook     [FUTURO] │◀── Stripe (webhook entrante)
                         │   - webhook-dispatcher [FUTURO] │──▶ Endpoints del cliente
                         │                                │
                         │  integration_tokens   [FUTURO]  │  (credenciales cifradas
                         │  api_keys             [FUTURO]  │   por empresa, RLS normal)
                         └─────────────────────────────┘
```

Principio heredado de `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §12: **cada integración externa vive detrás de un adaptador propio** (una Edge Function por proveedor) — el resto del sistema nunca habla directo con la API de un tercero. Es la misma arquitectura ya validada con Groq (`IA.md` §2), extendida, no reinventada.

## 3. Estrategia de Integración

Dos direcciones, tratadas como problemas de diseño distintos:

| Dirección | Qué es | Ejemplo | Estado |
|---|---|---|---|
| **MAHP → terceros** (saliente) | MAHP consume o escribe en un sistema externo | Publicar en Meta, enviar WhatsApp, generar contenido con Groq/OpenAI | [PARCIAL] — solo Groq [EXISTE] |
| **Terceros → MAHP** (entrante) | Un sistema externo consume datos/eventos de MAHP | Un cliente con su propio BI, un webhook entrante de Stripe, n8n/Zapier/Make orquestando MAHP | [FUTURO] |

Ambas direcciones comparten la misma frontera de seguridad (RLS + credenciales por empresa) pero tienen ciclos de vida y prioridades de negocio distintos — la saliente resuelve necesidades ya validadas por el catálogo de módulos (`06F-INTEGRATIONS.md`); la entrante depende de demanda de clientes que hoy no se ha confirmado (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §12, "depende de una decisión de producto que todavía no se ha tomado").

## 4. Modelo de Comunicación

```
Síncrono (request/response):
  Cliente MAHP ──▶ Edge Function adaptador ──▶ API del tercero ──▶ respuesta inmediata
  (ej. "publicar ahora en Instagram" — el usuario espera confirmación)

Asíncrono (evento/webhook):
  Evento de dominio en MAHP ──▶ cola de despacho [FUTURO] ──▶ POST a webhook del cliente
  (ej. "actividad completada" — nadie espera una respuesta inmediata)

Asíncrono entrante (webhook de terceros hacia MAHP):
  Stripe/proveedor ──▶ Edge Function receptora ──▶ valida firma ──▶ actualiza estado en MAHP
```

MAHP no tiene hoy infraestructura de colas (no hay Redis, no hay un broker de mensajes) — el patrón asíncrono saliente [FUTURO] se apoya en Postgres mismo (tabla de cola + `pg_cron`), consistente con el motor de automatizaciones ya diseñado en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §13, no en una pieza de infraestructura nueva.

## 5. API Pública

**[FUTURO]**. Desarrollo completo en `08A-API-STANDARDS.md`. Hoy PostgREST ya expone cada tabla como REST (`API.md` §2), pero eso no es todavía una "API pública": falta autenticación de terceros (`api_keys` por empresa, con scopes — `02-ARCHITECTURE` §12), documentación versionada externa y un portal (`08D-DEVELOPER-PORTAL.md`). La superficie técnica ya existe; lo que falta es la capa de producto alrededor de ella.

## 6. API Privada

**[EXISTE], parcial**. La única superficie hoy: PostgREST consumido exclusivamente por el frontend de MAHP con sesión de usuario, más la Edge Function `generar-calendario` (`API.md` §3). No requiere diseño nuevo — ya sigue el estándar de `API.md` §4 (CORS, validación de sesión, secretos server-side, contrato de error uniforme), que este documento adopta como convención oficial para toda futura Edge Function (`08A` §7).

## 7. APIs Internas

Se refiere aquí a comunicación entre componentes del propio backend de MAHP (Edge Function ↔ Postgres, trigger ↔ trigger) — hoy es enteramente Postgres nativo (RPC vía `security definer`, triggers) sin protocolo de red de por medio (`07-ENTERPRISE-DATA-PLATFORM.md` §5). No hay microservicios ni comunicación entre procesos separados — decisión de simplicidad vigente, no un vacío por resolver.

## 8. Integraciones Empresariales

Catálogo completo en `08C-INTEGRATIONS-CATALOG.md`, que extiende (no reemplaza) los 6 módulos de integración ya diseñados en `06F-INTEGRATIONS.md` con el resto de servicios pedidos por esta fase (Google Drive/Analytics/Ads, YouTube, LinkedIn, Stripe, Mercado Pago, OpenAI/Anthropic, n8n/Zapier/Make, Slack/Teams, correo, SMS).

## 9. Event Driven Architecture

Desarrollo completo en `08F-EVENT-ARCHITECTURE.md`. MAHP ya es, en un sentido estricto, orientado a eventos internamente — los triggers de Postgres son manejadores de eventos síncronos (`DATABASE.md` §1, `07-ENTERPRISE-DATA-PLATFORM.md` §5). Lo que no existe es un **catálogo formal de eventos de dominio** reutilizable por webhooks, automatizaciones e IA a la vez — eso es lo que este documento formaliza.

## 10. Marketplace

**[FUTURO]**. Desarrollo completo en `08I-MARKETPLACE.md`. Depende estrictamente de que exista primero API pública + webhooks (§5, §9) — no tiene valor aislado sin integraciones reales que catalogar (`06F-INTEGRATIONS.md` #6, mismo principio de dependencia ya señalado ahí).

## 11. Escalabilidad

La plataforma de integraciones hereda directamente la estrategia de `07-ENTERPRISE-DATA-PLATFORM.md` §8: un adaptador por proveedor escala horizontalmente sin tocar el núcleo de MAHP (agregar Meta no requiere cambiar cómo funciona WhatsApp). El riesgo de escala real no es de cómputo, es de **mantenimiento**: cada proveedor externo cambia su API con el tiempo (versiones de Graph API, deprecaciones de Google) — la mitigación es el mismo principio de adaptador aislado: un proveedor roto no debe poder romper otro ni el núcleo de MAHP.

## 12. Roadmap de Evolución

| Fase | Qué se agrega | Condición de activación |
|---|---|---|
| MVP (ahora) | Nada nuevo — se documenta la plataforma, no se construye | Aprobación de este documento |
| V2 | Primera integración saliente real: Meta o Google (según demanda confirmada de clientes) + `integration_tokens` | Al menos un cliente pagando que la pida explícitamente |
| V2 | API pública mínima (`api_keys` con scopes) si un cliente lo solicita para su propio BI | Solicitud real, no anticipación |
| V3 | Webhooks salientes + catálogo de eventos formalizado | Después de tener al menos 2 integraciones salientes que ya necesiten notificar eventos |
| V3 | SDK oficial (empezando por JS/TS, ya que el resto del stack es JS) | Cuando exista API pública con uso externo real medido |
| V3+ | Marketplace | Cuando existan integraciones de terceros reales que catalogar, no antes |

---

## Diagramas

**Flujo de una integración saliente (ej. publicar en Meta), extremo a extremo:**

```
company_admin conecta cuenta (OAuth)
        │
        ▼
Token guardado cifrado en integration_tokens (company_id, provider)
        │
        ▼
Usuario publica una actividad → Edge Function "meta-adapter"
        │
        ▼
Adaptador valida sesión (igual que API.md §4) + recupera token de la empresa
        │
        ▼
Llamada a Graph API ──✗──▶ token vencido → notificación "reconexión requerida" (06F-INTEGRATIONS.md §1)
        │ ✓
        ▼
Respuesta guardada/reflejada en actividades — mismo camino de escritura que cualquier actividad manual
```

**Flujo de IA usando la plataforma de integración (ver §/`API.md` §3 para el caso ya construido):**

```
Formulario (contexto) → Edge Function (valida sesión) → proveedor de IA (Groq hoy,
intercambiable por diseño — 02-ARCHITECTURE §11) → revisión humana → publicación real
```

---

## Checklist — aprobar cualquier integración nueva antes de implementarla

- [ ] ¿Existe un adaptador propio (Edge Function dedicada), o se propone hablar directo con el tercero desde el cliente? (Solo la primera opción es aceptable — §2.)
- [ ] ¿Las credenciales del tercero se guardan cifradas, con `company_id`, nunca en texto plano ni hardcodeadas? (`08E-SECURITY.md`)
- [ ] ¿Un token vencido/inválido falla de forma visible (notificación), no en silencio? (`06F-INTEGRATIONS.md` §1)
- [ ] ¿La integración respeta el aislamiento multiempresa — nunca una llave que vea más de una empresa a la vez?
- [ ] ¿Hay una condición de activación real (cliente que lo pide) documentada, o se está construyendo por anticipación?
- [ ] ¿El contrato de error sigue la convención de `API.md` §4 / `08A-API-STANDARDS.md`?
- [ ] ¿Se actualizó `06F-INTEGRATIONS.md`/`08C-INTEGRATIONS-CATALOG.md` en el mismo cambio?

---

## Definition of Done

✓ Plataforma Empresarial de Integraciones completamente documentada (este documento + 9 anexos).
✓ Estándares oficiales para APIs (`08A`).
✓ Estándares para Webhooks (`08B`).
✓ Catálogo de integraciones (`08C`, extendiendo `06F`).
✓ Estrategia SDK (`08G`).
✓ Estrategia Marketplace (`08I`).
✓ Políticas de seguridad (`08E`).
✓ Diagramas completos (este documento + anexos).

---

## Entregable Final

**1. Resumen de la arquitectura de integración propuesta**: adaptador propio por proveedor (Edge Function), mismo patrón que Groq; RLS como frontera también para integraciones (nunca una llave que la salte); API pública y webhooks como capas que se activan por demanda real, no por anticipación; Marketplace como el escalón final, dependiente de que exista tráfico real de integraciones antes.

**2. Integraciones críticas para el MVP y su prioridad**: ninguna integración es parte del MVP actual de MAHP — el producto ya opera sin integraciones externas (`06-PRODUCT-BLUEPRINT.md` §2, "0 de 6" en el catálogo de Integraciones). Si se activara una, el orden de prioridad heredado de `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §12 y `06F-INTEGRATIONS.md` es: **Meta y Google (alta)** — coinciden con canales y mercado ya validados (restaurantes/servicios) — antes que WhatsApp/TikTok/Slack (media) o Stripe/Mercado Pago (alta pero condicionada a que exista facturación, `02-ARCHITECTURE` §4).

**3. Plan de implementación por fases**: ver §12 de este documento (MVP → V2 → V3), gatillado por demanda confirmada de clientes en cada paso, no por calendario.

**4. Riesgos**:
- **Seguridad**: credenciales de terceros son el dato más sensible que MAHP manejaría que no maneja hoy — requiere cifrado real, no solo RLS (`08E-SECURITY.md` §2).
- **Compatibilidad**: proveedores externos cambian sus APIs sin avisar a MAHP — el patrón de adaptador aislado limita el daño, no lo elimina.
- **Escalabilidad**: sin infraestructura de colas real, un motor de webhooks a alto volumen podría exigir más que Postgres + `pg_cron` — riesgo aceptado y documentado, no resuelto (`08F-EVENT-ARCHITECTURE.md` §6).
- **Mantenimiento**: cada integración nueva es superficie a mantener indefinidamente — el checklist de este documento existe precisamente para que no se agreguen sin justificación de demanda real.

**5. Métricas de éxito**: ver KPIs por documento (`08A` §9, `08B` §7, `08I` §7) — consolidadas: disponibilidad de adaptadores, éxito de entrega de webhooks, adopción de API pública por clientes reales, integraciones activas por empresa.

**6. Verificación de coherencia con MDS-001 a MDS-008**: revisado explícitamente contra `API.md`, `IA.md`, `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §12–13, `06F-INTEGRATIONS.md` y los 10 documentos de MDS-008 (en particular `07A-DOMAIN-MODEL.md` §16, que ya reservaba el dominio "Integraciones" como [FUTURO] dependiente de este documento, y `07H-MULTI-TENANT-DESIGN.md` §9, que ya fijaba la restricción de que credenciales de integración deben llevar `company_id`). **Ninguna inconsistencia nueva detectada** — este documento es consistente con y extiende directamente el trabajo de `06F`/`02§12`, sin contradecirlo. Se preserva la misma inconsistencia preexistente ya reportada en MDS-008 (índice de `PROJECT-BLUEPRINT.md` desactualizado desde MDS-005) — no se corrige aquí por la misma razón: fuera del alcance declarado de esta fase.

**No se implementó ningún cambio de código, API ni de producto en esta fase — solo documentación, conforme a las reglas de MDS-009.**
