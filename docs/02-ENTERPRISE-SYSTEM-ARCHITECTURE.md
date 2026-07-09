# ENTERPRISE SYSTEM ARCHITECTURE — Marketing Activity Hub Pro

> Plano maestro de arquitectura. Todo desarrollo futuro debe respetarlo; si
> una funcionalidad lo contradice, debe justificarse antes de implementarse.
> Complementa `01-IDENTIDAD-DEL-PRODUCTO.md` (por qué existe MAHP) con cómo
> debe construirse para sostener esa identidad durante los próximos 10 años.
>
> Estado del sistema al momento de este documento: **plataforma pequeña, en
> producción, con un solo cliente activo conocido, arquitectura monolítica
> deliberada**. Este documento diseña la trayectoria de crecimiento — no
> describe un sistema que ya opera a escala. Donde algo es aspiracional se
> marca explícitamente como tal; no se presenta como construido lo que no lo
> está (mismo criterio que ya rige el resto de `/docs`, ver `CLAUDE.md` §2).
>
> Última actualización: 2026-07-09.

---

## 1. Introducción

**Propósito**: definir la arquitectura que debe sostener a MAHP tanto en su forma actual (una plataforma pequeña, funcional, de bajo volumen) como en la que aspira a ser (una plataforma SaaS con miles de empresas cliente, según `01-IDENTIDAD-DEL-PRODUCTO.md` §4 — visión a 5 y 10 años).

**Cómo debe utilizarse**: como referencia obligatoria antes de diseñar cualquier módulo nuevo de tamaño significativo. Su checklist (§19) es la prueba de aceptación arquitectónica; su roadmap (§17) indica en qué momento del crecimiento del producto se vuelve necesario adoptar cada pieza más avanzada (no antes — ver Principio de Simplicidad Progresiva, §2.6).

**Qué decisiones controla**: estructura de módulos y sus dependencias, qué vive en el "Core" vs. qué es un módulo reemplazable, cómo se diseña cualquier nueva integración o capacidad de IA, y en qué momento (no si) se adoptan patrones más complejos (colas, microservicios, múltiples regiones).

**Qué documentos complementa**: `01-IDENTIDAD-DEL-PRODUCTO.md` (el porqué), `DATABASE.md`/`MODULOS.md`/`API.md`/`IA.md`/`UI-UX.md` (el estado actual verificado, que este documento no repite), `ROADMAP.md` (evolución de producto por fases) y `CLAUDE.md` (reglas operativas del día a día).

---

## 2. Principios de Arquitectura

1. **Arquitectura modular.** Cada capacidad (campañas, seguidores, gamificación, IA) es un módulo con una responsabilidad, ya materializado hoy como archivos independientes en `js/shared/` — el mismo principio debe regir cuando esos módulos crezcan a servicios propios.
2. **Separación de responsabilidades.** Presentación (HTML/CSS), lógica de módulo (`js/shared/*.js`), autorización de datos (RLS en Postgres) y orquestación de sesión (`supabaseClient.js`) son capas distintas que no se mezclan — ya es así hoy, debe seguir siéndolo a cualquier escala.
3. **Bajo acoplamiento, alta cohesión.** Un módulo no debe conocer los detalles internos de otro; se comunican a través de datos compartidos (tablas) o eventos (triggers/notificaciones), nunca importando funciones internas cruzadas entre módulos de dominio distinto.
4. **Seguridad por diseño, no por capa añadida.** RLS es la autorización real desde el día uno (`DATABASE.md` §1) — no se diseña "luego se asegura", se diseña seguro desde la primera línea de cada tabla nueva.
5. **Multi-tenancy estructural, no opcional.** Todo dato operativo nuevo lleva `company_id` y su política RLS correspondiente en el mismo cambio que lo crea — nunca como una migración separada "para después".
6. **Simplicidad progresiva (principio rector de esta arquitectura).** Se diseña *pensando* en 1 millón de usuarios, pero **se construye para el volumen real de hoy**. Colas de mensajes, microservicios, múltiples regiones o un motor de reglas genérico no se adoptan por anticipación — se adoptan cuando el roadmap de escalabilidad (§14) indica que el volumen real los justifica. Construir la complejidad antes de necesitarla es tan riesgoso como no haberla diseñado.
7. **Reutilización sobre duplicación.** Ya validado en la práctica (`MODULOS.md`, `js/shared/`) — ninguna lógica se repite en más de un rol/página cuando puede compartirse.
8. **Performance primero, sin prematuro.** Se optimiza cuando hay una medición real de que algo es lento (`DATABASE.md` §6 — riesgos de escalabilidad ya identificados), no especulativamente.
9. **Documentación primero.** Ya es principio fundacional del proyecto (`01-IDENTIDAD-DEL-PRODUCTO.md` §7, principio 10) — ningún módulo se considera terminado sin su documentación correspondiente actualizada.
10. **Compatibilidad hacia atrás no negociable.** Regla dura ya codificada en `CLAUDE.md` §3 — se reafirma aquí como principio arquitectónico, no solo de proceso.
11. **Preparado para IA, no dependiente de un único proveedor.** El diseño de la Edge Function de IA (`IA.md` §2) ya aísla el proveedor (Groq) detrás de una interfaz propia — este principio exige que cualquier capacidad de IA futura mantenga esa misma separación.
12. **Verificar antes de asumir.** Principio operativo ya establecido (`CLAUDE.md` §2) elevado a principio arquitectónico: ninguna decisión de arquitectura se toma sobre una suposición sin confirmar contra el código o esquema reales.

---

## 3. Arquitectura General

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENTE (navegador)                       │
│  index.html (landing) · login.html · admin/empresa/directivo/     │
│  colaborador.html — HTML + JS vanilla modular (ES modules)        │
└───────────────┬────────────────────────────────┬──────────────────┘
                 │ supabase-js (REST/PostgREST)   │ fetch (Edge Fn)
                 ▼                                ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│         SUPABASE              │    │   EDGE FUNCTIONS (Deno)      │
│ ── Auth (email/password)      │    │  generar-calendario:         │
│ ── Postgres + RLS             │◄───┤   valida sesión → llama IA   │
│ ── Storage (bucket evidencias)│    │   externa → responde         │
│ ── Realtime (no usado hoy)    │    └───────────────┬──────────────┘
│ ── Triggers/Functions SQL     │                    │
└───────────────┬───────────────┘                    ▼
                 │                          ┌──────────────────┐
                 │                          │   Groq (IA)        │
                 │                          └──────────────────┘
                 ▼
   ┌───────────────────────────────────────────────────────┐
   │  DOMINIOS DE DATOS (todos con RLS por company_id)       │
   │  Identidad: companies · profiles · invites               │
   │  Operación: actividades · campaigns · kpis ·             │
   │             activity_updates · evidencias                │
   │  Seguidores: social_channels · follower_logs · metas     │
   │  Gamificación: points_log + vistas                       │
   │  Sistema: notifications · audit_log · strategies          │
   └───────────────────────────────────────────────────────┘
```

**Cómo se relacionan los dominios**: toda escritura de un colaborador (avance, evidencia) dispara triggers que alimentan simultáneamente sincronización de estado (`actividades`), gamificación (`points_log`) y notificaciones — un solo evento del usuario, múltiples efectos automáticos, cero pasos manuales adicionales (patrón ya documentado en `DATABASE.md` §6 y `MODULOS.md` #20). La IA no es un dominio de datos aparte: escribe directamente en `actividades`, igual que un humano, tras revisión (`IA.md` §4).

**Realtime**: Supabase lo ofrece pero **no se usa hoy** — toda la app se refresca por recarga o recarga tras acción (ver conversación previa con el usuario sobre "no hay actualizaciones en vivo"). Es el candidato más directo para la primera adopción de una capacidad "nueva" sin rediseñar nada — ver §17 (Roadmap Arquitectónico, V2).

---

## 4. Arquitectura SaaS

**Modelo multi-tenant**: por columna (`company_id`), no por base de datos ni por schema separado — ya documentado y validado en `DATABASE.md` §1. Es la decisión correcta para el volumen actual y proyectado a mediano plazo (cientos/miles de empresas pequeñas): más simple de mantener que aislamiento físico, y Postgres/RLS ya demostró sostenerlo de forma segura.

**Aislamiento de empresas**: frontera real a nivel de base de datos, verificado repetidamente en este proyecto (no solo declarado). Ningún cambio de arquitectura futuro debe debilitar esto — cualquier tabla nueva multi-tenant debe nacer con su política RLS en el mismo commit.

**Usuarios y permisos**: 4 roles fijos hoy (`super_admin`/`company_admin`/`director`/`collaborator`). Para escalar a miles de empresas con necesidades distintas, el diseño debe evolucionar de "roles fijos" a **roles + permisos granulares por empresa** (ej. una empresa grande quiere un quinto rol "supervisor de área") — hoy no existe esa capa, es una brecha real de arquitectura si el mercado de "corporativos"/"franquicias" (`01-IDENTIDAD-DEL-PRODUCTO.md` §9) se activa.

**Escalabilidad del modelo**: sostenible mientras el volumen de filas por tabla permanezca en el rango de millones, no de miles de millones — ver §14. El límite real no es el modelo multi-tenant en sí, es la ausencia de particionamiento de tablas grandes (`actividades`, `activity_updates`, `points_log`) cuando el número de empresas crezca en dos o tres órdenes de magnitud.

**Facturación, suscripciones, límites y planes** — *diseño conceptual, nada de esto existe hoy*:

| Concepto | Diseño propuesto |
|---|---|
| `plans` | Tabla nueva: `id`, `name`, `price`, `limits` (jsonb: máx. colaboradores, máx. actividades/mes, acceso a IA sí/no) |
| `companies.plan_id` | FK a `plans` — cada empresa tiene un plan activo |
| Aplicación de límites | Función `security definer` que valida el límite antes de un `insert` crítico (ej. no permitir invitar más colaboradores de los que el plan permite) — mismo patrón ya usado por `my_role()`/`my_company_id()` |
| Proveedor de pago | Abstracción de integración (§12) — Stripe o Mercado Pago según mercado, nunca acoplado directo al resto del sistema |
| Ciclo de vida de suscripción | Estado (`activa`/`vencida`/`cancelada`) en `companies`, gestionado por webhook del proveedor de pago hacia una Edge Function nueva |

Ninguna de estas tablas debe crearse hasta que el negocio decida realmente cobrar — es diseño para el momento en que se necesite, no una migración a ejecutar ahora (Principio 6, Simplicidad Progresiva).

---

## 5. Arquitectura de Módulos

Inventario completo de módulos actuales y sus dependencias reales en `MODULOS.md`. Vista jerárquica (Core en la base, dominios encima, sin dependencias cruzadas entre dominios del mismo nivel):

```
                        ┌─────────────────────┐
                        │        CORE          │   (§6)
                        │ sesión · RLS helpers  │
                        │ notificaciones · UI    │
                        └──────────┬───────────┘
        ┌───────────┬──────────────┼──────────────┬───────────┐
        ▼           ▼              ▼              ▼           ▼
   ┌─────────┐ ┌──────────┐  ┌───────────┐  ┌───────────┐ ┌─────────┐
   │Identidad │ │Operación │  │Seguidores │  │Gamificación│ │ Sistema │
   │empresas/ │ │campañas/ │  │canales/   │  │puntos/    │ │estrateg./│
   │usuarios  │ │actividad │  │metas      │  │ranking    │ │auditoría│
   └─────────┘ └────┬─────┘  └───────────┘  └─────▲─────┘ └─────────┘
                     │                              │
                     ▼                              │
               ┌───────────┐                        │
               │    IA      │────── genera actividades ──┘ (dispara puntos)
               └───────────┘
```

**Módulos futuros** (ver `MODULOS.md` "diseñados no construidos" + `01-IDENTIDAD-DEL-PRODUCTO.md` §9 mercados futuros): Facturación/Planes (§4), Integraciones externas (§12), Motor de Automatizaciones formal (§13), App móvil (consume la misma API PostgREST, sin backend nuevo), API pública (§12), Marketplace de plantillas/integraciones de terceros.

**Regla de dependencia**: un módulo de dominio (Operación, Seguidores, Gamificación, Sistema) puede depender del Core y puede *reaccionar* a eventos de otro dominio (vía trigger, ej. Gamificación reacciona a Operación) — pero nunca debe **importar código** de otro módulo de dominio directamente. Si dos módulos de dominio necesitan compartir lógica, esa lógica se sube al Core.

---

## 6. Arquitectura del Core

**Qué pertenece al Core** (hoy, ya construido): `js/supabaseClient.js` (sesión, resolución de rol/empresa), `js/ui.js` (toasts, modales, sanitización, notificaciones, tabs), las funciones `security definer` de Postgres (`my_role()`, `my_company_id()`), y la convención de RLS misma como mecanismo, no como módulo.

**Qué depende del Core**: todos los módulos de dominio (§5) — reciben `supabaseClient` como parámetro (patrón ya validado, `CLAUDE.md` §3), nunca instancian su propia conexión.

**Qué nunca debe depender entre sí directamente**: dos módulos de dominio (ej. `js/shared/gamificacion.js` y `js/shared/campanias.js`) no deben importarse mutuamente. Si `gamificacion.js` necesita datos de campañas, los consulta directamente por su cuenta (vía `supabaseClient`, respetando RLS) — no llama a una función interna de `campanias.js`. Esto es lo que permite que un módulo de dominio se reescriba o se mueva a un servicio separado en el futuro sin tener que rastrear quién más lo importa.

**Candidato a Core que aún no existe**: una capa de "eventos de dominio" explícita (hoy los triggers de Postgres cumplen ese rol de forma implícita) — ver §13.

---

## 7. Arquitectura Frontend

**Hoy**: HTML + JS vanilla en módulos ES nativos, sin bundler, sin build step, sin framework — decisión correcta para el tamaño actual (`UI-UX.md` §1–§2, `01-IDENTIDAD-DEL-PRODUCTO.md` §7 principio 2, Simplicidad).

**Estructura de carpetas actual** (ya consistente, se mantiene como convención): `js/` para el punto de entrada de cada página, `js/shared/` para módulos de dominio reutilizables, `assets/` para CSS y assets estáticos.

**Convenciones a mantener conforme crece**:
- Un módulo de dominio nuevo va a `js/shared/nombre.js`, exporta funciones que reciben `supabaseClient` + IDs de contenedor DOM, nunca asume el DOM global.
- Componentes visuales reutilizables (badges, cards, skeletons) documentados en `UI-UX.md` §4 — un componente nuevo se agrega ahí, no se reinventa.

**Umbral de migración a build tooling**: esta arquitectura recomienda **no** adoptar un framework (React/Vue/etc.) ni un bundler mientras el número de módulos de dominio compartidos se mantenga manejable a simple vista (referencia práctica: mientras `empresa.js` — hoy 422 líneas, el archivo más grande de lógica de página — no supere un orden de magnitud más). Cuando se cruce ese umbral, o cuando se construya la app móvil (§17), es el punto natural para introducir un framework de componentes — no antes, por el Principio 6.

---

## 8. Arquitectura Backend

Backend completo delegado a Supabase — sin servidor propio salvo Edge Functions puntuales (`API.md` §1). Piezas:

- **Auth**: email/password nativo de Supabase. Ver §10 para roadmap de MFA/SSO.
- **Edge Functions**: patrón único y ya establecido (`API.md` §4) — validar sesión primero, secretos vía `Deno.env`, contrato de error consistente (`{ error }`). Toda función nueva sigue exactamente este patrón.
- **Triggers/Functions SQL**: mecanismo principal de automatización hoy (§13) — reaccionan a `insert`/`update`, escriben con `security definer` cuando el rol invocador no tendría permiso directo.
- **Policies (RLS)**: una política por operación (`select`/`insert`/`update`/`delete`) y tabla, nunca una política genérica "todo permitido a autenticados" — convención ya seguida en las 13+ tablas documentadas (`DATABASE.md`).
- **Buenas prácticas ya en vigor**: ningún secreto en el cliente (`IA.md` §5), sin ejecución directa de comandos contra la base del cliente sin su instrucción explícita (`CLAUDE.md` §4).

---

## 9. Arquitectura de Base de Datos

*(Diseño conceptual — no se genera SQL en esta fase; ver `DATABASE.md` para el esquema real ya implementado)*

**Entidades principales y relaciones**: ya inventariadas en `DATABASE.md` §2–§7. A nivel de diseño, el modelo sigue una jerarquía consistente: `companies` → `profiles`/`campaigns` → `actividades` → (`activity_updates` | `evidencias` | `points_log`). Toda tabla nueva debe encajar en este árbol o justificar por qué no.

**Normalización**: el esquema actual está razonablemente normalizado (3FN práctica) con vistas (`points_totals`, `follower_totals`, etc.) para las agregaciones — patrón correcto, se mantiene: **agregar con vistas, no con columnas desnormalizadas que haya que mantener sincronizadas a mano**.

**Índices**: no auditados formalmente todavía. Recomendación de diseño: índice compuesto `(company_id, <columna de filtro frecuente>)` en toda tabla operativa de alto volumen (`actividades`, `activity_updates`, `points_log`) — hoy el volumen no lo exige, pero es el primer ajuste esperado en el escalón de 10,000+ usuarios (§14).

**Auditoría e historial**: ya existe `audit_log` (eventos administrativos) y el patrón *append-only* en `activity_updates`/`points_log`/`follower_logs` (`DATABASE.md` §1). Extender este mismo patrón a cualquier tabla nueva donde la trazabilidad importe, en vez de inventar un mecanismo distinto por módulo.

**Soft delete**: ✅ *implementado (`supabase_schema_v16.sql`)* en `actividades` y `evidencias` — columna `deleted_at timestamptz null`, políticas de `select` filtrando `deleted_at is null` por defecto, sin tabla de papelera separada. El borrado físico real quedó restringido a `super_admin` únicamente (no expuesto en ninguna pantalla); "eliminar" desde la app es un `update`, no un `delete`. Ver `DATABASE.md` §2/§4 para el detalle.

**Migraciones y versionado**: el patrón actual (`supabase_schema_vN.sql` aplicado manualmente) es adecuado para un solo desarrollador y un entorno — es una **limitación arquitectónica real** en cuanto haya más de una persona o más de un entorno (dev/staging/producción), ya señalada en `DATABASE.md`/el análisis de MDS-001. Recomendación: adoptar `supabase migration new` (herramienta ya instalada, usada en esta misma sesión para Edge Functions) formalmente para cada cambio de esquema futuro, mantiene el mismo espíritu de "un archivo por cambio" pero con aplicación y rollback gestionados por la CLI en vez de copiar y pegar a mano.

**Convenciones**: nombres de tabla en español donde reflejan el dominio de negocio original (`actividades`) y en inglés donde se construyó después (`points_log`, `follower_goals`) — inconsistencia heredada, documentada aquí para que no se "corrija" a mitad de camino sin una decisión explícita (romper nombres de tabla existentes no es gratuito).

---

## 10. Arquitectura de Seguridad

**Autenticación**: Supabase Auth, email/password. Roadmap natural: SSO (Google Workspace/Microsoft) cuando el mercado de "corporativos" (§4, `01-IDENTIDAD-DEL-PRODUCTO.md` §9) se vuelva real — Supabase Auth ya lo soporta nativamente, sin rediseño.

**Autorización**: RLS por rol + `company_id`, la decisión arquitectónica más importante del proyecto (reafirmada en cada documento de `/docs`). Evolución propuesta para permisos granulares por empresa: tabla `permissions` (rol base + overrides por `company_id`), consultada por una función `security definer` adicional — sin tocar el modelo de 4 roles base, extendiéndolo.

**Auditoría y logs**: `audit_log` cubre eventos administrativos (`DATABASE.md` §7); no cubre hoy operaciones de lectura sensibles (ej. qué `super_admin` entró a qué empresa y cuándo) — brecha de cumplimiento si se vende a empresas con requisitos regulatorios más estrictos.

**Protección de datos**: aislamiento por RLS ya cubre confidencialidad entre empresas. Falta explícitamente: cifrado a nivel de columna para datos especialmente sensibles (hoy no hay ninguno que lo requiera, pero un futuro módulo de facturación con datos de pago sí lo exigiría — nunca almacenar datos de tarjeta directamente, delegar 100% al proveedor de pago).

**Backups y recuperación**: gestionados por Supabase (point-in-time recovery disponible según plan de Supabase contratado) — no hay estrategia propia de backup adicional documentada. Recomendación: confirmar y documentar explícitamente el nivel de PITR contratado en Supabase como parte de este documento en su próxima revisión — es información operativa crítica que hoy no vive en ningún lado de `/docs`.

**Buenas prácticas ya en vigor**: sin secretos en cliente, verificación de relaciones ambiguas antes de un `.select()` (`DATABASE.md` §4), Edge Functions que exigen sesión válida (`API.md` §3).

---

## 11. Arquitectura de Inteligencia Artificial

**Hoy**: un solo "especialista" implícito — generación de calendario (`IA.md`), equivalente funcional a un **Calendar Planner**. No existe orquestación entre especialistas ni memoria entre generaciones.

**Diseño del ecosistema futuro** — especialistas virtuales, cada uno una responsabilidad acotada, no un solo modelo genérico "que hace de todo":

| Especialista | Responsabilidad | Consume | Produce |
|---|---|---|---|
| **Calendar Planner** *(existe)* | Generar calendario de actividades | Campaña, canales, frecuencia, contexto | Actividades propuestas (`IA.md`) |
| **Content Creator** | Redactar copy/descripciones por actividad | Actividad ya planeada + tono de marca | Texto listo para publicar |
| **Creative Director** | Sugerir dirección visual/formato (reel, carrusel, historia) | Canal + objetivo de la actividad | Recomendación de formato |
| **KPI Advisor** | Detectar KPIs atrasados y explicar por qué | `kpis` + `activity_updates` históricos | Insight accionable (no un calendario) |
| **Business Analyst** | Resumir desempeño de campaña en lenguaje humano | Datos agregados de una campaña cerrada | Resumen ejecutivo |
| **Campaign Optimizer** | Sugerir ajustes a una campaña en curso | Avance real vs. plan | Recomendaciones de ajuste |
| **Automation Expert** | Proponer reglas de automatización basadas en patrones repetidos | Historial de acciones manuales repetitivas | Sugerencia de regla (§13) |
| **Marketing Strategist** | Orquestador — decide qué especialista invocar según lo que pide el usuario | Solicitud en lenguaje natural | Enruta a uno o más especialistas |

**Cómo colaboran entre sí**: cada especialista es una función/prompt independiente detrás de la misma Edge Function base (o funciones hermanas siguiendo el patrón de `API.md` §4) — no un solo prompt gigante que intenta todo. El **Marketing Strategist** es el único punto de entrada conversacional futuro; los demás no se exponen directo al usuario sin pasar por él, para mantener consistencia de experiencia.

**Cómo interactúan con los usuarios**: sin excepción, bajo el Principio 3 de `01-IDENTIDAD-DEL-PRODUCTO.md` §7 — ningún especialista escribe datos reales sin revisión humana. El **KPI Advisor** y el **Business Analyst** son los primeros candidatos de expansión (§17, Roadmap) porque son de solo lectura/sugerencia, sin el riesgo de publicar contenido incorrecto.

**Independencia de proveedor**: cada especialista debe poder cambiar de modelo/proveedor (Groq, OpenAI, Anthropic) sin que el resto del sistema lo note — la interfaz entre el frontend y la IA siempre es "una Edge Function que recibe contexto y regresa una estructura de datos conocida", nunca una llamada directa a un SDK de proveedor específico desde el cliente.

---

## 12. Arquitectura de Integraciones

**Principio de diseño**: cada integración externa vive detrás de un **adaptador propio** (una Edge Function o un módulo backend por proveedor) — el resto del sistema nunca habla directo con la API de un tercero. Esto es una extensión directa del mismo patrón ya usado para Groq (`IA.md` §2).

| Integración | Prioridad sugerida | Patrón de arquitectura |
|---|---|---|
| Meta (Instagram/Facebook) | Alta — coincide con canales ya modelados en `social_channels` | OAuth por empresa, tokens guardados cifrados, adaptador que traduce "publicar actividad" → llamada a Graph API |
| Google Business / Google Calendar | Alta — natural para el mercado de restaurantes/servicios ya validado | Igual patrón OAuth por empresa |
| WhatsApp Business | Media — canal de notificación, no solo de publicación | Adaptador de notificaciones, alternativo/adicional a las notificaciones in-app actuales |
| TikTok | Media | Igual patrón que Meta |
| Slack / Microsoft Teams | Media — mercado "corporativos"/"agencias" | Adaptador de notificaciones salientes (igual rol que WhatsApp) |
| Stripe / Mercado Pago | Alta cuando se active facturación (§4) | Webhook entrante → Edge Function → actualiza `companies`/futura tabla `subscriptions` |
| OpenAI / Anthropic | Ya prevista por diseño (§11, independencia de proveedor) | Mismo adaptador que Groq, intercambiable |

**Almacenamiento de credenciales de terceros**: tabla nueva `integration_tokens` (`company_id`, `provider`, `access_token` cifrado, `refresh_token` cifrado, `expires_at`) — RLS igual que cualquier tabla operativa (solo esa empresa y `super_admin`).

**API pública** (para integraciones de terceros hacia MAHP, no solo de MAHP hacia terceros): PostgREST ya expone un API REST — lo que falta es una capa de **API keys por empresa** (tabla `api_keys`, con scopes) y documentación pública versionada, cuando el negocio decida abrir esta puerta. No se diseña más a fondo aquí porque depende de una decisión de producto que todavía no se ha tomado.

---

## 13. Arquitectura de Automatizaciones

**Hoy**: triggers de Postgres — reactivos, síncronos, acoplados 1:1 a un evento de base de datos (`DATABASE.md` §6, `MODULOS.md`). Suficiente y correcto para el volumen y complejidad actuales (Principio 6).

**Motor de automatización futuro** (cuando las reglas dejen de ser fijas en código SQL y una empresa cliente quiera definir las suyas):

```
Evento (insert/update en una tabla, o acción de usuario)
        │
        ▼
   Tabla `automation_rules` (company_id, evento, condición, acción)
        │  ¿la condición se cumple para este evento?
        ▼
   Tabla `automation_queue` (encolar la acción, no ejecutarla en línea)
        │
        ▼
   Edge Function "procesador de cola" (pg_cron la invoca cada N minutos)
        │
        ▼
   Ejecuta la acción: notificar, crear actividad, llamar integración externa
```

**Por qué colas y no triggers directos para este caso**: una regla definida por el usuario puede fallar (ej. la integración externa no responde) — necesita reintentos y un registro de qué pasó, algo que un trigger síncrono de Postgres no maneja bien. Los triggers actuales (puntos, notificaciones internas) siguen siendo triggers directos porque son internos, rápidos y no dependen de servicios externos — no todo se migra a este motor, solo las automatizaciones configurables por el cliente y las que dependen de integraciones (§12).

**Sin necesidad de infraestructura de colas externa (ej. RabbitMQ/SQS) todavía**: una tabla + `pg_cron` (ya disponible en Supabase) resuelve el volumen esperado hasta el escalón de decenas de miles de empresas (§14) — adoptar una cola externa antes de eso sería complejidad prematura (Principio 6).

---

## 14. Arquitectura de Escalabilidad

| Usuarios totales | Qué cambia | Qué permanece igual |
|---|---|---|
| **100** (hoy) | Nada — arquitectura actual sobra | Todo |
| **1,000** | Revisar índices en `actividades`/`activity_updates` (§9); considerar caché de consultas de dashboard (`renderizarResumen`, `MODULOS.md` #6) si se nota latencia | Modelo multi-tenant, RLS, frontend vanilla, un solo proyecto Supabase |
| **10,000** | Formalizar migraciones (§9); adoptar el motor de automatización con cola (§13) si hay reglas configurables activas; primeras métricas de observabilidad (§15) obligatorias, no opcionales | Sigue siendo un monolito frontend + Supabase — no se justifica separar servicios todavía |
| **100,000** | Particionamiento de tablas de alto volumen por rango de fecha o por `company_id`; considerar Supabase en un tier con más cómputo/réplicas de lectura; frontend probablemente ya migrado a un framework de componentes (§7, umbral cruzado) | El modelo de datos y RLS no cambian de forma — se optimizan, no se rediseñan |
| **1,000,000** | Aquí sí se justifica evaluar separar dominios de alto volumen (ej. `points_log`/gamificación) en un servicio propio si su carga de escritura satura el resto; posible sharding por región geográfica de empresas cliente | La identidad y los principios de `01-IDENTIDAD-DEL-PRODUCTO.md` no cambian — la forma de servir la misma promesa sí se vuelve distribuida |

**Lectura central de esta tabla**: el salto de complejidad grande (microservicios, particionamiento, colas externas) no ocurre hasta el escalón de 100,000+ usuarios — construir para eso hoy sería contradecir el Principio 6.

---

## 15. Arquitectura de Observabilidad

**Hoy**: prácticamente inexistente fuera de `console.error()` disperso en el código (ej. `js/shared/dashboard.js`, `js/shared/avances.js`) y los logs nativos de Supabase (accesibles en su dashboard, no centralizados en la app). No hay alertas, no hay métricas de negocio, no hay trazabilidad de errores en producción más allá de lo que un usuario reporte manualmente.

**Diseño propuesto, en orden de prioridad**:
1. **Tabla `error_log`** (o reutilizar `audit_log` con una categoría nueva) — cualquier `catch` relevante del frontend reporta ahí, no solo a la consola del navegador de un usuario que nadie más ve.
2. **Métricas de negocio básicas** ya calculables con lo existente: actividades creadas/completadas por semana, generaciones de IA por empresa (para control de costo, `IA.md` §5), latencia de las consultas del dashboard.
3. **Alertas** sobre lo crítico primero: fallos repetidos de la Edge Function de IA, RLS denegando más operaciones de lo esperado (posible bug de permisos, no solo un usuario probando límites).
4. **Trazabilidad end-to-end**: no prioritaria hasta el escalón de 10,000 usuarios (§14) — hoy el volumen permite depurar leyendo directamente la tabla involucrada.

Esta es, junto con las migraciones formales (§9), la brecha arquitectónica más urgente de cerrar **antes** de que el volumen de usuarios crezca — no por sofisticación, sino porque hoy un error en producción solo se detecta si un usuario lo reporta.

---

## 16. Riesgos Arquitectónicos

| Riesgo | Naturaleza | Mitigación |
|---|---|---|
| Relaciones ambiguas de PostgREST al agregar una segunda FK hacia la misma tabla | Recurrente, ya materializado una vez (`DATABASE.md` §4) | Checklist §19 debe incluirlo explícitamente en cada revisión de esquema nuevo |
| Sin migraciones formales | Organizativo, se agrava con más personas/entornos | §9 — adoptar `supabase migration` |
| Sin observabilidad real | Operativo — errores invisibles hasta que un usuario los reporta | §15 |
| Dependencia de un solo proveedor de IA (Groq) | Técnico — sin fallback si el servicio falla o cambia condiciones | §11 — diseño ya aísla el proveedor detrás de una interfaz propia, falta implementar un segundo proveedor de respaldo cuando el volumen lo justifique |
| Sin rate limiting en Edge Functions | Seguridad/costo (`IA.md` §5) | Agregar límite por usuario/empresa antes de exponer más especialistas de IA (§11) |
| `empresa.html`/`empresa.js` concentrando cada vez más responsabilidades | Mantenibilidad (ya señalado en MDS-001) | §7 — umbral de división definido |
| ~~Ausencia de soft delete~~ | ~~Riesgo de negocio (pérdida irreversible de datos)~~ | ✅ Resuelto en `actividades`/`evidencias` (`supabase_schema_v16.sql`, 2026-07-09) — pendiente evaluar extenderlo a `campaigns`/`strategies` si se detecta el mismo riesgo ahí |
| RLS mal escrita en una tabla nueva | El riesgo más severo posible (fuga de datos entre empresas) | Ninguna tabla nueva se despliega sin política `select`/`insert`/`update`/`delete` explícita y revisada — regla ya en `CLAUDE.md` §3, reforzada aquí como riesgo arquitectónico de máxima severidad |
| Todo el backend en un solo proyecto Supabase (single region, single tenant de infraestructura) | Disponibilidad | Aceptable hasta el escalón de 100,000 usuarios (§14); documentar plan de multi-región cuando el mercado lo exija geográficamente |

---

## 17. Roadmap Arquitectónico

| Versión | Foco | Cambios clave |
|---|---|---|
| **V1** *(actual)* | Consolidar lo construido | Cerrar brechas de `ROADMAP.md` (producto) + observabilidad mínima y migraciones formales (arquitectura) |
| **V2** | Tiempo real y primeros especialistas de IA de solo-lectura | Adoptar Supabase Realtime para notificaciones/calendario sin recargar; KPI Advisor y Business Analyst (§11) |
| **V3** | Multi-tenancy comercial | Tablas de planes/suscripciones (§4), primera integración de pago, permisos granulares por empresa (§10) |
| **V5** | Ecosistema abierto | Integraciones de canal (Meta, Google, WhatsApp — §12), API pública con API keys, motor de automatización con cola (§13) |
| **V10** | Plataforma distribuida | Particionamiento/sharding donde el volumen lo exija (§14), posible separación de dominios de alto volumen en servicios propios, multi-región si el mercado lo requiere |

Cada versión solo se activa cuando el escalón de usuarios correspondiente (§14) o una decisión de negocio explícita (facturación, mercado nuevo) lo justifica — no por calendario fijo.

---

## 18. Diagramas

**Flujo de autenticación**
```
Usuario → login.html → Supabase Auth (email/password)
                              │
                    ¿sesión válida?
                              │
                    profiles.role ──► roleHome(role)
                              │
              ┌───────────────┼───────────────┬───────────────┐
              ▼               ▼               ▼               ▼
        admin.html      empresa.html   directivo.html   colaborador.html
        (super_admin)   (company_admin) (director)      (collaborator)
```

**Flujo de datos: generación de actividad por IA**
```
company_admin llena formulario
        │
        ▼
Edge Function "generar-calendario" ── valida sesión ──► Groq
        │                                                  │
        ◄─────────────────── JSON de actividades ──────────┘
        │
company_admin revisa + elige colaborador
        │
        ▼
insert masivo en `actividades` (assigned_to definido)
        │
        ├──► aparece en calendario del colaborador
        ├──► notificación automática (trigger)
        └──► al completarse: trigger otorga puntos (points_log)
```

**Arquitectura SaaS (aislamiento)**
```
Empresa A ─┐                         ┌─ ve/edita solo lo de A
           ├─ RLS (company_id) ──────┤
Empresa B ─┤                         ├─ ve/edita solo lo de B
           │                         │
Empresa C ─┘                         └─ ve/edita solo lo de C

super_admin ────────────────────────► ve/edita todas (sin restricción de company_id)
```

**Arquitectura de IA (futura, §11)**
```
Usuario ──► Marketing Strategist (orquestador)
                    │
     ┌──────┬───────┼───────┬──────────┬───────────┐
     ▼      ▼       ▼       ▼          ▼           ▼
 Calendar Content Creative  KPI    Business    Campaign
 Planner  Creator Director Advisor Analyst    Optimizer
  (existe)  (futuro)(futuro)(futuro) (futuro)   (futuro)
     │
     ▼
 revisión humana ──► se publica como dato real
```

**Arquitectura de integraciones (futura, §12)**
```
MAHP Core
    │
    ▼
Adaptador por proveedor (Edge Function dedicada)
    │
    ├──► Meta Graph API
    ├──► Google Business / Calendar API
    ├──► WhatsApp Business API
    ├──► Stripe / Mercado Pago (webhooks entrantes)
    └──► Slack / Teams (notificaciones salientes)
```

---

## 19. Checklist de Validación

Antes de aprobar una funcionalidad nueva de tamaño significativo, además del checklist de `01-IDENTIDAD-DEL-PRODUCTO.md` §14 (alineación con identidad/producto), verificar arquitectura:

1. ¿Respeta la modularidad — vive en su propio módulo de `js/shared/` o dominio de datos, sin mezclarse con otro?
2. ¿Genera una dependencia directa entre dos módulos de dominio? (No debería — §6)
3. ¿Es escalable sin rediseño hasta el próximo escalón de §14?
4. ¿Es reutilizable entre roles/páginas en vez de duplicarse?
5. ¿Toda tabla nueva tiene `company_id` + las 4 políticas RLS (`select`/`insert`/`update`/`delete`) explícitas?
6. Si la tabla nueva tiene una FK hacia una tabla que ya tiene otra FK al mismo destino (ej. otra hacia `profiles`), ¿se documentó explícitamente cómo se va a fijar la relación en cualquier `.select()` futuro? (§16, riesgo recurrente)
7. Si usa IA, ¿el proveedor está aislado detrás de una Edge Function/adaptador, nunca llamado directo desde el cliente?
8. Si es una integración externa, ¿vive detrás de un adaptador propio (§12), sin acoplar el resto del sistema a la API del tercero?
9. ¿Quedará documentado en el mismo cambio (`MODULOS.md`/`DATABASE.md`/`CHANGELOG.md`)?
10. ¿Está alineada con la visión del producto (`01-IDENTIDAD-DEL-PRODUCTO.md`)?

---

## 20. Definition of Done

- [x] Arquitectura completa y documentada (§1–§18).
- [x] Todos los módulos actuales y futuros definidos (§5).
- [x] Core del sistema claramente identificado (§6).
- [x] Dependencias documentadas (§5, §6, §19 pregunta 2).
- [x] Diagramas claros incluidos (§18).
- [x] Arquitectura diseñada para soportar el crecimiento del producto (§14, §17).
- [x] Documento utilizable como referencia para decisiones de desarrollo futuras (§19).

---

## Resumen para el CTO (tú)

**1. Decisiones arquitectónicas más importantes de este documento**
- Formalizar la "Simplicidad Progresiva" (Principio 6) como criterio explícito para rechazar complejidad prematura — es la decisión que evita que este documento se use para justificar sobre-ingeniería.
- Definir el Core del sistema (§6) y la regla de que los módulos de dominio nunca se importan entre sí — es lo que mantiene reemplazable cada pieza a futuro.
- Diseñar la IA como ecosistema de especialistas (§11) en vez de un solo asistente genérico, alineado con la identidad ya definida en MDS-002.
- Establecer el roadmap por escalón de usuarios (§14/§17) en vez de por fecha — las decisiones grandes (particionamiento, colas, microservicios) se disparan por evidencia de necesidad, no por calendario.

**2. Mejoras a mediano y largo plazo**
Mediano plazo: observabilidad mínima y migraciones formales (§9, §15 — son la brecha más urgente porque afectan la operación de hoy, no solo el crecimiento futuro). Largo plazo: permisos granulares por empresa y el motor de automatización con cola (§10, §13), cuando el mercado de corporativos/franquicias se active.

**3. Inconsistencias detectadas entre la arquitectura actual y la visión del producto**
- La visión (`01-IDENTIDAD-DEL-PRODUCTO.md` §4) apunta a agencias gestionando varias marcas — el modelo de roles actual (4 roles fijos, uno por persona por empresa) no contempla que una sola persona opere varias empresas cliente a la vez desde una sola cuenta. Es una brecha real si "agencias" se activa como mercado antes de rediseñar esto.
- ~~La ausencia de soft delete (§9) contradice el principio de "nada crítico se pierde"~~ — **resuelto el 2026-07-09** (`supabase_schema_v16.sql`): `actividades`/`evidencias` ya no pierden datos por un borrado desde la app.

**4. Plan de transición propuesto**
No se requiere ninguna migración inmediata — el sistema actual es coherente con el escalón V1 de este roadmap. La primera transición real (V1→V2) debe iniciar con observabilidad y migraciones formales (bajo riesgo, alto valor, no rompen nada existente), seguida de Realtime para notificaciones (mejora de experiencia sin cambiar el modelo de datos), antes de tocar cualquier pieza de monetización o integraciones externas.

**5. Confirmación**
No se implementó ningún cambio de código, HTML, CSS, JavaScript, ni de Supabase durante esta fase. Este documento es exclusivamente de diseño y análisis, pendiente de tu aprobación antes de que cualquiera de sus recomendaciones se convierta en trabajo real.
