# MIP-002 — Meta Self-Service Business Onboarding

> Fase A: Auditoría y diseño. Verificado contra el código real y la documentación oficial vigente de Meta (`developers.facebook.com/docs/facebook-login/facebook-login-for-business/`) — no asumido. Origen: hallazgo operativo real al intentar conectar "La Casa del Centro" (CDC) manualmente — el proceso actual (Graph API Explorer + Business Manager por cliente) no escala.

## 1. Objetivo

Reemplazar la conexión manual de páginas de Meta (lo que hicimos para Tacamaron y lo que llevamos un buen rato intentando sin éxito para CDC) por un flujo de autoservicio: cada empresa conecta su propia página desde dentro de MAHP, sin que el admin de MAHP toque Graph API Explorer o Business Manager nunca más.

## 2. Auditoría — estado real verificado

### 2.1 Lo que ya existe y es reutilizable

- **`company_meta_pages`** (v21): `company_id`, `channel`, `page_id`, `page_access_token`, `page_name`, `active` — ya tiene la forma correcta para guardar una conexión. **No se crea una tabla paralela**: se extiende esta, siguiendo el mismo criterio ya aplicado en el sprint de QA (`docs/ARCHITECTURE/00-INDEX.md`) de no fragmentar estructuras que ya existen.
- RLS: hoy esta tabla **no tiene ninguna política para `authenticated`** a propósito (solo `service_role` la lee/escribe) — eso cambia: con autoservicio, cada `company_admin` necesita poder ver (no necesariamente escribir directo) el estado de su propia conexión.
- `meta-webhook` y `meta-send-message`: no cambian en su lógica interna — siguen leyendo `company_meta_pages` igual. Solo cambia *cómo* se llena esa tabla.
- `js/shared/socialHub.js` / `empresa.html`: el patrón de pestaña lazy-loaded ya existe — la nueva sección "Conexiones sociales" se integra igual, no es una app aparte.

### 2.2 Lo que NO existe todavía (genuinamente nuevo para MIP-002)

- Facebook Login for Business **no está configurado** en la app "Marketing Activity Hub Pro" — no hay `Configuration` (`config_id`) creada, no se ha usado el flujo OAuth en ningún punto de este proyecto hasta ahora. Todo lo hecho hasta hoy fue con tokens de usuario generados manualmente en Graph API Explorer.
- ~~Abierto, bloqueante~~ **Resuelto**: la app ya tiene el producto "Inicio de sesión con Facebook para empresas" disponible, con el botón "Crear configuración" listo — confirma que es compatible, no hace falta recrearla como tipo Business.
- No existe ningún Edge Function de OAuth (inicio, callback, intercambio de código) — `meta-webhook` y `meta-send-message` son los únicos dos que existen, y ninguno sirve para esto.
- No existe una cartera empresarial ("Business Portfolio") propia de MAHP con control total, separada de la de cada cliente — la documentación de Meta la exige para tokens de usuario de sistema.
- No existe UI de "Conexiones sociales" — hoy la conexión de una página no tiene ninguna pantalla, se hace por fuera (SQL manual).

### 2.3 Social AI Hub — qué es prototipo vs. construido (reutilizando `docs/QA/01-FLUJOS-REALES.md`)

Construido y probado con tráfico real: bandeja de conversaciones, recepción de mensajes, respuesta manual, sugerencia de IA, asignación de colaborador, tags con confianza. Prototipo/no construido: base de conocimientos, modos manual/asistido/automático configurables (ver `docs/social-ai-hub/00-audit.md`, sigue vigente).

## 3. Decisión de arquitectura: token de usuario de sistema, no token de usuario

La documentación de Meta distingue dos tipos de token bajo Facebook Login for Business:

| | Token de usuario | Token de usuario de sistema |
|---|---|---|
| Duración | Corta (horas) | Normalmente sin caducidad |
| Atado a | La cuenta personal de quien se loguea | La cartera empresarial del cliente |
| Caso de uso de Meta | Apps de consumidor | Tech providers gestionando negocios de clientes |

> **Reemplazado por §8.6 (2026-11-03):** el Product Owner eligió **token de usuario**, para no exigir Business Manager a cada cliente. Se conserva el razonamiento original:

**MAHP necesita el de usuario de sistema** — es exactamente el caso "tech provider gestionando negocios de clientes" que describe la documentación, y evita que la conexión de un cliente se rompa cada vez que expire un token corto (el problema de fondo que ya vivimos con los tokens manuales).

## 4. Prerequisitos de Meta — checklist antes de FASE C

- [ ] Confirmar que la app es de tipo **Business** (bloqueante, ver 2.2).
- [ ] Crear una **Configuration** de Facebook Login for Business en el App Dashboard, con los permisos mínimos reales que Social AI Hub usa hoy (`pages_show_list`, `pages_messaging`, `pages_read_engagement`) — no pedir de más (sección 8 del prompt original, ya es principio establecido en este proyecto).
- [ ] Solicitar **Advanced Access** para atender negocios que MAHP no posee — esto es una revisión de Meta aparte de la de `pages_messaging`, hay que sumarla al checklist de App Review ya en curso.
- [ ] Crear/confirmar la cartera empresarial propia de MAHP (distinta de la de cada cliente) con control total.
- [ ] Confirmar la URL de retorno (callback) que va a recibir el `code` — necesita ser una Edge Function nueva, pública, con el mismo nivel de cuidado que `meta-webhook` (`ADR-007`: ningún secreto en el cliente, intercambio de código solo en el backend).

## 5. Modelo de datos propuesto (FASE B, pendiente de tu aprobación — no se ejecuta todavía)

Extensión de `company_meta_pages` (no tabla nueva), vía `supabase_schema_v25.sql`:

- `status` — enum: `no_conectada` / `esperando_autorizacion` / `autorizacion_cancelada` / `conectada` / `permisos_insuficientes` / `requiere_reconexion` / `token_invalido` / `error_sincronizacion` (los 8 estados mínimos que pide la sección 4 del prompt).
- `connected_by` → `profiles(id)` — qué usuario de MAHP conectó la página.
- `granted_scopes` — qué permisos concedió realmente el cliente (puede ser un subconjunto de lo solicitado).
- `last_checked_at` — última vez que se verificó que la conexión sigue viva.
- `instagram_account_id` (nullable) — cuenta de Instagram vinculada, cuando exista y esté autorizada.

RLS nueva: `company_admin` de la empresa dueña puede `select` su propia fila (nunca el `page_access_token` en sí — ese sigue sin política para `authenticated`, se expone por una vista o función que oculta esa columna).

Tabla nueva, si hace falta trazabilidad de eventos de conexión/desconexión por separado (sección 11 del prompt) — a decidir en FASE B, no antes.

## 6. Próxima fase recomendada

~~**FASE B**~~: hecha, ver §8. **FASE C**: en curso; el plan para publicar la app está en `MIP-003`.

## 7. Lo que esto NO resuelve hoy

Esto no conecta CDC hoy mismo — es la solución correcta para que la *próxima* empresa (y CDC, una vez construido) se conecten sin esta fricción. Si quieres tener CDC funcionando mientras tanto, seguimos en paralelo con "Asignar socio" en Business Manager (lo que estábamos intentando antes de este prompt).

## 8. FASE B — Diseño detallado (aprobado el 2026-10-31)

Aprobado por el Product Owner: el cuadro vive en Social Hub; solo `company_admin` (y `super_admin`) conecta o desconecta; director y colaborador ven el estado. Verificado contra la documentación vigente de Facebook Login for Business (Graph API `v26.0`).

### 8.1 Flujo

1. Social Hub → cuadro **"Conexiones sociales"** (`js/shared/conexionesSociales.js`, mismo patrón modular que los demás `js/shared/`). Muestra una fila por canal: Facebook e Instagram.
2. **"Conectar con Facebook"** carga el JS SDK de Meta y llama `FB.login({ config_id, response_type: 'code', override_default_response_type: true })`. El cliente elige su página en la ventana oficial de Meta.
3. El navegador envía **solo el `code`** a la Edge Function nueva **`meta-oauth`** (con el JWT del usuario). La función:
   - verifica que quien llama sea `company_admin` de esa empresa (o `super_admin`);
   - cambia el `code` por un token en `GET /v26.0/oauth/access_token` con `client_secret` (secreto `META_APP_SECRET`, que ya existe);
   - lista las páginas autorizadas con su Instagram vinculado (`/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}`);
   - con **una** página, conecta directo; con varias, guarda el token 10 minutos en `meta_oauth_sessions` y devuelve la lista **sin tokens** para que el admin elija.
4. Al conectar: verifica que la página no esté ya conectada a **otra** empresa (aislamiento, `07H` §6; la restricción `unique (channel, page_id)` ya lo impide); guarda la fila de Facebook y, si existe, la de Instagram (`page_id` = id de la cuenta de Instagram, que es el `entry.id` que ya usa `meta-webhook`); suscribe la página con `POST /{page-id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks`; registra los permisos concedidos (`/me/permissions`).
5. Otras acciones de `meta-oauth`: **desconectar** (quita la suscripción, `active = false`, borra el token, estado `desconectada`) y **verificar** (prueba el token y actualiza `status`/`last_checked_at`; botón "Verificar conexión").

### 8.2 Estados (los 8 de §5)

| Estado | Dónde vive | Qué ve el admin |
|---|---|---|
| No conectada | Pantalla (sin fila) | Botón "Conectar con Facebook" |
| Esperando autorización | Pantalla (ventana de Meta abierta) | "Esperando a Meta…" |
| Autorización cancelada | Pantalla (ventana cerrada sin `code`) | Aviso + reintentar |
| `conectada` | `company_meta_pages.status` | ✅ nombre de la página, quién conectó y cuándo |
| `permisos_insuficientes` | idem | Qué permiso falta + "Reconectar" |
| `requiere_reconexion` / `token_invalido` | idem | "Reconectar" |
| `error_sincronizacion` | idem | `last_error` + "Verificar conexión" |
| `desconectada` | idem | Botón "Conectar con Facebook" |

### 8.3 Datos — `supabase_schema_v25.sql`

- `company_meta_pages` + `status`, `connected_by`, `granted_scopes`, `linked_page_id`, `last_checked_at`, `last_error`, `updated_at`. **Se descarta** la columna `instagram_account_id` propuesta en §5: Instagram ya vive como su propia fila (`channel = 'instagram'`), que es como lo resuelve `meta-webhook` hoy.
- `meta_oauth_sessions` (tabla nueva, solo service role, caduca a los 10 minutos).
- `my_meta_connections(company_id)`: estado sin token, para cualquier miembro de la empresa.
- Trazabilidad: trigger hacia `audit_log` (`meta_conectada` / `meta_desconectada` / `meta_estado_cambiado`). No hace falta tabla aparte.

### 8.4 Permisos que pedirá la Configuración

`pages_show_list`, `pages_messaging`, `pages_read_engagement`, **`pages_manage_metadata`** (sin este, `subscribed_apps` falla; faltaba en §4), `instagram_basic`, `instagram_manage_messages`, y `business_management` solo si se elige token de usuario de sistema (§8.6).

### 8.5 Hallazgos

- `meta-send-message` llama a Graph API **`v19.0`**, una versión ya fuera de soporte; Meta la atiende con la más antigua vigente. Las funciones nuevas usan `v26.0`, y conviene subir las dos existentes en la misma Fase C.
- Antes de App Review, solo personas con rol en la app (administrador, desarrollador o **tester**) o en la página pueden autorizar. Los testers deben ser empleados o personas con acuerdo: no es un camino para clientes (ver `MIP-003` §3). Para el flujo de usuario de sistema, además deben tener control total de la cartera del cliente.
- La cuenta de revisor de Meta (`carlosdanielfin+metareview@gmail.com`) no tiene perfil en MAHP y no puede iniciar sesión. Hay que invitarla antes de enviar a revisión.

### 8.6 Decisiones abiertas antes de FASE C

1. **Tipo de token de la Configuración — DECIDIDO (2026-11-03): token de usuario.** §3 eligió *token de usuario de sistema* (no caduca, atado a la cartera del cliente). Su costo: **exige que el cliente tenga una cartera empresarial (Business Manager)**, algo que muchos restaurantes pequeños no tienen. La alternativa, *token de usuario*, funciona con cualquier página: el token de usuario largo da tokens de página que no caducan mientras el cliente no cambie su contraseña ni quite la app (para eso existe "Verificar / Reconectar"). **Recomendación: token de usuario**, que es menos fricción, el objetivo de este documento. Si se elige, cambia la decisión de §3.
2. **Datos de la app para el frontend — HECHO**, ver §8.7.
3. **Dominios en la app de Meta — HECHO**, ver §8.7.

### 8.7 Configuración de Meta — hecha (2026-11-03)

- **App ID:** `1011783041707142`. **`config_id`:** `1683981806659523` ("MAHP Conexiones sociales": variación General, token de acceso de usuario). Ninguno es secreto.
- **Permisos:** `pages_show_list`, `pages_messaging`, `pages_read_engagement`, `pages_manage_metadata`, `instagram_basic`, `instagram_manage_messages`. Este último hubo que agregarlo antes en el caso de uso "API de Instagram"; sin eso no aparece en el asistente.
- **Dominios:** `miguelangelhdezpadilla-art.github.io` en Dominios de la app; "Iniciar sesión con el SDK para JavaScript" activado, con `https://miguelangelhdezpadilla-art.github.io/` en sus dominios permitidos.
- **Instagram requiere página vinculada:** con Facebook Login, la cuenta de Instagram del cliente debe ser profesional y estar vinculada a su página de Facebook. Meta recomienda *Unified Login* para integraciones nuevas; aquí se usa Facebook Login porque `meta-webhook` y `company_meta_pages` ya siguen ese modelo. Aún sin probar con una cuenta real.

**Pendiente antes de publicar la app** (aviso de Meta en Configuración básica): ícono de 1024 x 1024, URL de la política de privacidad, eliminación de datos de usuario y categoría, además de App Review con acceso avanzado. La política de privacidad y la eliminación de datos son texto legal: no se redactan aquí (`CLAUDE.md` §6). La app tampoco está asociada a un portfolio comercial.
