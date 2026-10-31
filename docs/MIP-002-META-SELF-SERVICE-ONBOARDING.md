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

**FASE B**: diseño detallado de permisos/RLS + el `supabase_schema_v25.sql` exacto, una vez confirmes el tipo de app (punto bloqueante de la sección 2.2). No tiene sentido diseñar el flujo OAuth completo si la app necesita recrearse como tipo Business primero.

## 7. Lo que esto NO resuelve hoy

Esto no conecta CDC hoy mismo — es la solución correcta para que la *próxima* empresa (y CDC, una vez construido) se conecten sin esta fricción. Si quieres tener CDC funcionando mientras tanto, seguimos en paralelo con "Asignar socio" en Business Manager (lo que estábamos intentando antes de este prompt).
