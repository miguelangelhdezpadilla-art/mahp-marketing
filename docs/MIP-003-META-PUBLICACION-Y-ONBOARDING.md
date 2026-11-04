# MIP-003 — Plan para publicar la app de Meta y reducir la fricción del cliente

> Propuesta del 2026-11-03, pendiente de aprobación del Product Owner. Continúa `MIP-002`. Verificada contra la documentación de Meta en esa fecha; lo que viene de terceros o falta probar está marcado.

> **Corrección del 2026-11-03 (§2.5):** la recomendación de Instagram Login se revisó al abrir el panel de Meta. Ver §2.5 antes de §1 y §2.2.

## 1. Recomendación

1. **Instagram:** agregar un botón **"Conectar Instagram"** con *Instagram Login*. El cliente ya no necesitaría página de Facebook, ni cuenta de Facebook, ni vincularlas. Solo seguiría siendo obligatoria la **cuenta profesional**, que Meta exige en todos los métodos.
2. **App Review:** no se puede evitar con app propia si se atiende a otros negocios, pero se puede preparar para pasarla de una vez: pedir pocos permisos, entregar un flujo que funcione y enviar evidencia por permiso.
3. **Publicación:** empezar ya por lo que depende de ti, **conectar la app a un portfolio y verificar el negocio**. Lo demás depende en buena parte de eso.
4. **Mientras tanto:** conectar CDC con un rol en su página, no como tester (§3).

## 2. Instagram: quitar fricción al cliente

### 2.1 Qué se puede eliminar y qué no

| Requisito hoy | ¿Se puede eliminar? | Cómo |
|---|---|---|
| Página de Facebook vinculada | **Sí** | Instagram Login no la requiere |
| Que el cliente use Facebook | **Sí** | Inicia sesión con Instagram |
| Cuenta profesional (empresa o creador) | **No** | Meta la exige en los 3 métodos; solo se puede guiar |
| Rol en la app antes de la revisión | **Temporalmente, no** | Se elimina con Advanced Access (§4) |

### 2.2 Los tres métodos de Meta

| | Facebook Login (configurado) | Instagram Login | Unified Login |
|---|---|---|---|
| Página de Facebook | Obligatoria | No | No |
| Inicio de sesión | Facebook | Instagram | Cualquiera de los dos |
| Permiso de mensajes | `instagram_manage_messages` | `instagram_business_manage_messages` | Meta no lo detalla en la página revisada |
| Portfolio comercial | — | — | **Obligatorio** |
| Documentación | Completa | Completa | Es la que Meta recomienda para integraciones nuevas, pero no encontré una guía paso a paso |

**Decisión propuesta:** construir Instagram Login, que tiene el flujo documentado de principio a fin. Cuando la app esté conectada a un portfolio, revisar la pestaña "API setup with Unified login" del panel. Si ofrece un solo flujo para ambos inicios de sesión, puede reemplazarlo antes de enviar la revisión.

### 2.3 Lo que cuesta técnicamente

- **El token dura 60 días** y hay que renovarlo: se puede renovar si tiene al menos 24 horas y no ha caducado. Hace falta una tarea programada; si falla, el cuadro muestra "Reconectar".
- **Otro servidor y otro flujo:** `graph.instagram.com` y una redirección con `redirect_uri`, no la ventana del SDK.
- **Por verificar en la primera prueba:**
  - Si el webhook se firma con el *Instagram App Secret* (es lo que sugieren los resultados, sin confirmación directa). `meta-webhook` valida hoy con `META_APP_SECRET`.
  - Qué id llega en `entry.id`, para que `meta-webhook` encuentre la cuenta.
  - Si este método también necesita el ajuste "Permitir acceso a los mensajes" (Meta lo documenta para el método con Facebook).

### 2.4 Guía dentro del cuadro

Antes de abrir la ventana de Meta, el cuadro muestra una lista corta:

1. **Cuenta profesional:** "En Instagram: Configuración → Tipo de cuenta y herramientas → Cambiar a cuenta profesional". *(Confirmar las rutas exactas de menú con una cuenta real antes de publicarlas.)*
2. **Permitir mensajes:** "Configuración → Mensajes y respuestas a historias → Controles de mensajes → Herramientas conectadas → Permitir acceso a los mensajes".
3. **Conectar:** el botón.

Después de conectar, MAHP confirma el resultado y explica cualquier error en lenguaje simple. También conviene un enlace para reenviar estas instrucciones a quien administre la cuenta.

### 2.5 Corrección: lo que muestra el panel de Meta

Al abrir la configuración de Instagram de la app aparecieron tres datos que esta propuesta no tenía en cuenta:

1. **Instagram Login ya es "legacy".** Meta dice que sigue funcionando, sin fecha de fin, pero que las funciones nuevas solo llegan a Unified Login y que las apps nuevas ya no pueden configurarlo. Migrar después obligaría a cada cliente a reconectarse una vez.
2. **"Para recibir webhooks, la app debe estar publicada"**, según el panel en Instagram Login. Sin publicar no llegarían los mensajes de Instagram, así que probar de punta a punta depende de la verificación y de los requisitos de §5.
3. **Unified Login pide portfolio comercial a la app y al cliente.** Sin página de Facebook, pero con un requisito distinto. El token pertenecería al portfolio del cliente.

**Comparación actualizada:**

| | Facebook Login (ya configurado) | Instagram Login | Unified Login |
|---|---|---|---|
| El cliente necesita | Página de Facebook vinculada | Solo cuenta profesional | Cuenta profesional y portfolio comercial |
| Futuro | Vigente | Legacy, sin fecha de fin | Recomendado por Meta |
| Token | De página | 60 días, requiere renovar | Del portfolio; duración por confirmar |
| Requisito para la app | Ya cumplido | Publicada para recibir webhooks | Conectada a un portfolio |

**Recomendación revisada:** conectar primero la app a un portfolio, que es necesario en cualquier caso. Después probar Unified Login con la cuenta de CDC para ver qué tanta fricción real tiene el portfolio para un cliente. Si es poca, usar Unified Login. Si no, usar Instagram Login aceptando una migración futura. Decisión pendiente del Product Owner.

Fuentes: panel de la app (2026-11-03), [guía de migración](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/migration-guide.md), [Unified Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login), [configurar webhooks](https://developers.facebook.com/documentation/instagram-platform/webhooks/setup), [ejemplos de webhooks](https://developers.facebook.com/documentation/instagram-platform/webhooks/examples).

### 2.6 Avance (2026-11-04)

- Portfolio **Marketing Activity Hub Pro** creado por el Product Owner, como persona física, y app conectada (`business_id` 1119262284046383). Falta verificarlo.
- Unified Login ya aparece habilitado en el panel. Meta propone una configuración con token de usuario del sistema (caducidad: nunca), cuenta de Instagram como activo obligatorio y permisos `instagram_basic` e `instagram_manage_messages`, además de otros que MAHP no necesita (anuncios, comentarios, publicación). Por eso **ya no se plantea quitar esos dos permisos** si se elige Unified Login.
- La prueba se hará con CDC, que ya tiene portfolio. No mide la fricción de un cliente sin portfolio: esa duda sigue abierta.

## 3. Mientras no haya Advanced Access

**Corrección a lo que dije antes:** sugerí agregar al dueño de CDC como tester. Meta solo permite testers que sean **empleados tuyos o personas con quienes tengas un acuerdo**. No es un camino para clientes en general.

**Camino propuesto para CDC:** el dueño te da un rol en su página (y en su cuenta de Instagram, para probar ese canal) y tú conectas desde el cuadro. Meta aclara que Standard Access limita los datos a usuarios con rol en la app o en la página. Esto cubre pocos clientes de confianza, no el crecimiento.

## 4. App Review: cómo hacerla más simple

Con Advanced Access, cualquier cliente se conecta sin pasos manuales. Meta exige **Business Verification y App Review**. La buena noticia: el 9 de octubre de 2026 anunció que retira **Access Verification**, un trámite menos.

### 4.1 Orden de trabajo

| # | Paso | Quién |
|---|---|---|
| 1 | Crear o elegir el portfolio comercial y conectar la app | Tú, con mi guía |
| 2 | Business Verification (solo un admin del negocio puede hacerla) | Tú |
| 3 | Completar la Configuración básica (§5) | Tú y yo |
| 4 | Terminar el flujo real, incluida la eliminación de datos | Yo |
| 5 | Preparar cuenta de revisor, página e Instagram de prueba | Tú y yo |
| 6 | Grabar los videos por permiso (§4.3) | Tú y yo |
| 7 | Enviar a revisión y publicar | Tú y yo |

Una guía de terceros dice que la app debe estar *Live* antes de pedir Advanced Access. Meta sí dice que para publicar debe estar conectada a un negocio verificado. El orden exacto de los pasos 6 y 7 se confirma en el panel cuando llegue el momento.

### 4.2 Pedir solo lo necesario

| Permiso | Para qué | Estado |
|---|---|---|
| `pages_show_list` | Listar las páginas del cliente | Configurado |
| `pages_manage_metadata` | Suscribir la página al webhook | Configurado |
| `pages_messaging` | Mensajes de Messenger | Configurado |
| `pages_read_engagement` | Datos de la página | Configurado; confirmar si es necesario |
| `instagram_basic`, `instagram_manage_messages` | Instagram vía Facebook | Configurados; ver decisión D1 |
| `instagram_business_basic`, `instagram_business_manage_messages` | Instagram Login | Por agregar si se aprueba |
| Human Agent | Responder hasta 7 días (`MIP-001`) | Por agregar |
| Business Asset User Profile Access | Nombre real del contacto | Sin agregar en el caso de uso de Instagram; `meta-webhook` lo necesita |

**Dudas abiertas:**
- **`business_management`:** la guía de Messenger lo marca como dependencia y lo incluye en la lista de permisos a solicitar, pero la referencia de permisos no lo lista como dependencia de `pages_messaging`. No está en la Configuración. Propuesta: probar sin él y agregarlo solo si la prueba lo exige (por ejemplo, con páginas de un portfolio).
- **`instagram_basic`:** la referencia lista `pages_read_user_content` como dependencia, y no estaba entre los permisos marcados. Confirmar en la prueba.

### 4.3 Qué pide Meta como evidencia

Para cada permiso: el caso de uso escrito y un video con el inicio de sesión y el permiso en acción. En mensajes (`pages_messaging`, `instagram_manage_messages`, `instagram_business_manage_messages`) pide además el **mensaje enviado desde la app apareciendo en la bandeja** y una petición cURL. Quien revisa debe poder cargar y probar la app.

Prepararíamos un guion por permiso sobre un solo recorrido: entrar a MAHP → Social Hub → Conectar → aceptar → recibir y responder un mensaje.

**Cuenta de revisor:** `carlosdanielfin+metareview@gmail.com` no tiene perfil en MAHP. Hay que invitarla y probar su acceso antes de enviar.

### 4.4 Causas comunes de rechazo y tiempos *(guías de terceros, sin confirmar con Meta)*

- **Rechazos:** política que no explica cada permiso, enlace de eliminación de datos que falla, video con una sesión de administrador en vez de un usuario sin rol, descripción vaga, app en desarrollo.
- **Tiempos:** Business Verification de 1 a 14 días hábiles según la fuente; App Review de 3 a 7 días hábiles por lo general; todo el proceso de 3 semanas a 3 meses. Meta no publica plazos en lo revisado, así que tómalo como orientación, no como compromiso.

### 4.5 Alternativa: un proveedor con app ya aprobada

Servicios como SocialAPI.ai, Zernio o Ayrshare ya tienen Advanced Access: el cliente autoriza **su** app y tú no pasas por la revisión.

**No la recomiendo como camino principal.** Si Meta restringe esa app, todas tus conexiones caen a la vez y no puedes apelar. Además, los mensajes de tus clientes pasarían por otro proveedor, lo que habría que declarar en la privacidad. Sirve como plan B si la revisión se atora. *(La comparación viene de uno de esos proveedores; los precios habría que confirmarlos.)*

## 5. Requisitos para publicar

| Requisito | Propuesta | Quién |
|---|---|---|
| **Ícono 1024 x 1024** | Generarlo desde `assets/favicon.svg`, o usar tu logo si tienes uno mejor | Yo, con tu visto bueno |
| **Categoría** | La más cercana a mensajería para negocios; la elegimos en el menú del panel | Tú y yo |
| **URL de privacidad** | Página `privacidad.html` en el sitio; el enlace "Privacidad" de `index.html` hoy no lleva a ningún lado | Yo la página, **el texto no** (§5.1) |
| **Eliminación de datos** | Callback en una Edge Function (§5.2) | Yo |
| **URL de condiciones del servicio** | Meta tiene el campo; no apareció en el aviso de faltantes. Conviene tenerla para vender | Asesoría legal |

### 5.1 Política de privacidad: qué debe cubrir

El Product Owner pidió una plantilla como excepción a `CLAUDE.md` §6: [PLANTILLA-AVISO-PRIVACIDAD-MAHP.md](legal/PLANTILLA-AVISO-PRIVACIDAD-MAHP.md). Debe revisarla un abogado antes de publicarse. Esta lista resume lo que debe cubrir:

- **Identidad:** quién responde legalmente y su domicilio. `[PENDIENTE: razón social o nombre, domicilio, correo]`
- **Rol de MAHP:** si actúa como responsable o como encargado de los datos de los clientes de cada empresa. No encontré una fuente confiable para SaaS: es la pregunta principal para tu abogado.
- **Datos tratados:** cuentas de MAHP, páginas conectadas, mensajes y nombres de contactos que escriben por Messenger o Instagram.
- **Uso de cada permiso de Meta:** es un motivo de rechazo señalado por terceros.
- **Finalidades:** la ley vigente pide separar las necesarias de las voluntarias (según despachos; confirmar en el texto oficial).
- **Terceros que reciben datos:** Meta, Supabase, y **Groq, porque `meta-webhook` lo usa para la IA**. No omitirlo.
- **Conservación y eliminación:** cuánto tiempo y cómo solicitarla (Meta exige explicarlo en la política).
- **Derechos de los titulares y cómo ejercerlos.**

Marco en México: la nueva ley federal de protección de datos en posesión de particulares se publicó el 20 de marzo de 2025.

### 5.2 Eliminación de datos: callback, no solo instrucciones

Meta acepta un callback o una URL de instrucciones. Recomiendo el **callback**, porque es automático y queda comprobable: Meta envía un `signed_request`, se valida con el App Secret, se inicia el borrado y se responde con `url` y `confirmation_code` para consultar el estado.

**Hay que decidir el alcance:** el `user_id` que envía Meta es el de quien usó la app (el admin del cliente), no el de cada persona que escribió. Propuesta: borrar los tokens y conexiones de esa persona. El tratamiento de las conversaciones se define con asesoría legal.

## 6. Decisiones que necesito de ti

| # | Decisión | Mi recomendación |
|---|---|---|
| D1 | ¿Cómo se conecta Instagram? | **Un solo camino, Instagram Login.** Si se confirma en pruebas, se quitan `instagram_basic` e `instagram_manage_messages` de la Configuración: menos permisos que revisar |
| D2 | ¿Quién verifica el negocio? ¿Persona física o moral? | Quien tenga los papeles a nombre del negocio de MAHP. Fuentes de terceros mencionan la Constancia de Situación Fiscal; confirma la lista en la pantalla de verificación |
| D3 | ¿Quién redacta la política de privacidad? | Abogado, o plantilla revisada por uno, usando §5.1 |
| D4 | ¿Plan B con proveedor (§4.5)? | Solo si la revisión se atora |

## 7. Fuentes

**Meta:**
[Instagram Platform: métodos y accesos](https://developers.facebook.com/docs/instagram-platform/overview/) ·
[Business Login for Instagram](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login) ·
[Enviar mensajes con Instagram Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/messaging-api) ·
[Instagram Messaging: primeros pasos](https://developers.facebook.com/documentation/business-messaging/instagram-messaging/get-started) ·
[Plataforma de Messenger](https://developers.facebook.com/documentation/business-messaging/messenger-platform/overview) ·
[Referencia de permisos](https://developers.facebook.com/documentation/development/permissions) ·
[Business Verification](https://developers.facebook.com/docs/development/release/business-verification/) ·
[Retiro de Access Verification](https://developers.facebook.com/blog/post/2026/10/09/retiring-access-verification-for-tech-provider-apps) ·
[Roles de la app](https://developers.facebook.com/documentation/development/build-and-test/app-roles) ·
[Callback de eliminación de datos](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/) ·
[Crear una app para Instagram](https://developers.facebook.com/documentation/development/create-an-app/other-app-types/instagram-apis.md)

**Terceros (orientativas, algunas con interés comercial):**
[OT1-Pro: guía de verificación](https://ot1-pro.com/blog/meta-app-verification-2026-founder-guide) ·
[SocialAPI.ai: opciones sin App Review](https://social-api.ai/blog/instagram-facebook-api-without-meta-app-review) ·
[Leadsales: verificar negocio](https://leadsales.io/blog/verificar-negocio-meta-business-para-usar-api/) ·
[Aurora Inbox: verificación de Meta](https://www.aurorainbox.com/en/2026/05/14/what-is-meta-business-verification/) ·
[Twilio: requisitos en México](https://www.twilio.com/en-us/guidelines/mx/regulatory) ·
[Garrigues: nueva ley de datos en México](https://www.garrigues.com/es_ES/noticia/mexico-nueva-ley-federal-proteccion-datos-personales-posesion-particulares-introduce)
