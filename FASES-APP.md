# Estructuración de la app por fases

> Documento vivo: se construye fase por fase, con tu aprobación entre cada una.

---

## Fase 1 — Roles principales

### Roles

| Rol | Quién es | Alcance |
|---|---|---|
| **Super Admin** (tú) | El proveedor de la plataforma | Toda la app, todas las empresas |
| **Admin de Empresa** | Quien dirige marketing/operaciones en la empresa cliente | Su empresa completa |
| **Directivo** | Gerencia de la empresa cliente | Su empresa, solo lectura de métricas |
| **Colaborador** | Personal operativo de la empresa cliente | Solo sus tareas asignadas |

### Matriz de permisos

| Acción | Super Admin | Admin Empresa | Directivo | Colaborador |
|---|:---:|:---:|:---:|:---:|
| Crear / desactivar empresas | ✅ | ❌ | ❌ | ❌ |
| Invitar Admin de Empresa | ✅ | ❌ | ❌ | ❌ |
| Gestionar accesos/contraseñas de su empresa | ✅ (todas) | ✅ (la suya) | ❌ | ❌ |
| Invitar Directivos / Colaboradores | ✅ | ✅ | ❌ | ❌ |
| Crear/editar campañas y calendario | ✅ | ✅ | 👁️ solo ver | ❌ |
| Asignar tareas a colaboradores | ✅ | ✅ | ❌ | ❌ |
| Actualizar avance de su propia tarea | ✅ | ✅ | ❌ | ✅ |
| Ver dashboard de su empresa | ✅ | ✅ | ✅ | 👁️ vista reducida |
| Ver dashboards de **todas** las empresas | ✅ | ❌ | ❌ | ❌ |
| Configurar KPIs de su empresa | ✅ | ✅ | 👁️ solo ver | ❌ |

### Permisos de invitación: company_admin vs. los demás roles

Esto es lo que distingue específicamente a `company_admin` de los otros tres roles en cuanto a creación de accesos:

| | Super Admin | **company_admin** | Directivo | Colaborador |
|---|:---:|:---:|:---:|:---:|
| Puede invitar a alguien | ✅ | ✅ | ❌ | ❌ |
| A qué roles puede invitar | `company_admin` (de cualquier empresa) | `director`, `collaborator` — **nunca** otro `company_admin` | — | — |
| A qué empresas puede invitar | Cualquiera | **Solo la suya** | — | — |

En otras palabras: `company_admin` tiene el mismo "poder de invitar" que el Super Admin en cuanto a mecánica, pero con dos límites duros — no puede salirse de su propia empresa, y no puede crear otro `company_admin` (eso sigue siendo exclusivo del Super Admin, para que una empresa no pueda "clonarse" administradores sin que tú lo sepas). Director y Colaborador no tienen esta capacidad bajo ninguna circunstancia.

**Esto ya está implementado así**, tanto en la interfaz (`empresa.html` solo ofrece invitar Directivo/Colaborador) como en la base de datos (la política de seguridad `invites_insert` rechaza cualquier intento de saltarse estos límites, así alguien manipule la página).

### Cómo entra cada rol

- **Super Admin** → panel con lista de empresas, botón para crear empresa nueva, e invitar a su primer Admin.
- **Admin de Empresa** → calendario y campañas de su empresa; invita Directivos/Colaboradores.
- **Directivo** → dashboard de solo lectura (Fase 2).
- **Colaborador** → lista de "Mis tareas", con control para reportar avance.

### Estado actual

Esta fase ya está **implementada y funcionando**: `login.html`, `admin.html`, `empresa.html`, `directivo.html`, `colaborador.html`, con la base de datos (`companies`, `profiles`, `invites`) corriendo en Supabase. El Super Admin además puede entrar a "modo observador" a cualquier panel desde botones en `admin.html`, sin necesitar la contraseña de esa persona.

---

## Fase 2 — Dashboards y KPIs

### Quién ve qué

| | Admin Empresa | Directivo | Colaborador | Super Admin |
|---|:---:|:---:|:---:|:---:|
| Dashboard de KPIs y avances de su empresa | ✅ (+ editar KPIs) | ✅ (solo lectura) | ❌ | ✅ (de cualquier empresa) |
| Resumen de "mis tareas" | — | — | ✅ | — |

El Admin de Empresa ve el **mismo dashboard** que el Directivo, más los controles para configurar KPIs y gestionar campañas/usuarios. El Directivo recibe una versión idéntica pero de solo lectura — así ambos hablan "el mismo idioma" cuando lo revisan juntos.

### Estructura visual del dashboard (de arriba hacia abajo)

1. **Tarjetas de KPI** — una por indicador: nombre, valor actual / meta, barra de progreso con %. *(Ya implementado en `directivo.html`)*
2. **Selector de periodo** — filtra el dashboard por semana / mes / trimestre. *(Pendiente de construir)*
3. **Avance de campañas** — tabla: campaña, estado, % de avance promedio (calculado de sus actividades). *(Ya implementado)*
4. **Desempeño por colaborador** — tabla: colaborador, tareas asignadas, completadas, % de avance promedio. *(Ya implementado)*
5. **Botón "Exportar reporte"** — descarga un PDF/CSV con la foto del periodo seleccionado, para enviar a dirección o juntas. *(Pendiente de construir)*

### Modelo de KPI personalizable

Cada empresa define los suyos — no hay una lista fija, porque cada negocio mide cosas distintas:

| Campo | Ejemplo |
|---|---|
| Nombre | "Reseñas en Google" |
| Meta (`target_value`) | 40 |
| Valor actual (`current_value`) | 23 |
| Unidad | "reseñas" |
| Periodo | "Junio 2026" |

Dos formas de alimentar el valor actual:
- **Manual** — el Admin de Empresa lo actualiza a mano (ventas, reseñas, alcance en redes: datos que vienen de fuera de la app).
- **Automático** — calculado por la propia app a partir de las actividades (ej. "% de cumplimiento de campaña" = actividades completadas / asignadas). Esto ya es posible con los datos que existen hoy (`activity_updates`), solo falta la regla que decida qué KPIs se calculan solos.

### Nota sobre las categorías de actividad

Hoy las categorías del calendario (Marketing / Operatividad / Mantenimiento / Inversión, con sus colores) están fijas en el código — pensadas para el primer cliente (un restaurante). Si vas a vender esto a empresas de otros giros, conviene que cada empresa pueda definir sus propias categorías en vez de heredar las del restaurante original. Lo marco como pendiente de decisión, no lo cambio todavía.

---

## Fase 3 — Seguridad y accesos

### Autenticación

- Cada usuario inicia sesión con su propio correo y contraseña (Supabase Auth) — nadie comparte cuentas.
- Confirmación de correo al registrarse (lo gestiona Supabase automáticamente, sin servidor propio).
- Las sesiones se renuevan solas; cerrar sesión invalida el acceso desde ese navegador.

### Aislamiento de datos entre empresas (multi-tenant)

Cada fila de información operativa (`actividades`, `campaigns`, `kpis`, `activity_updates`) lleva una etiqueta `company_id`. La regla, aplicada **dentro de la base de datos** (no solo en la pantalla):

> Un usuario solo puede leer o escribir filas cuyo `company_id` coincida con el de su propia empresa — excepto el Super Admin.

Aunque alguien manipulara la app desde el navegador (inspeccionando el código, cambiando peticiones), la base de datos rechaza cualquier intento de tocar datos de otra empresa. Esto ya está implementado con Row Level Security (RLS) de Postgres — son las "políticas" definidas en `supabase_schema_v2.sql`.

### Control de accesos por rol

Cada tabla tiene reglas separadas para leer/crear/editar/borrar, según el rol:

| Tabla | Quién puede ver | Quién puede editar |
|---|---|---|
| `companies` | Super Admin (todas) / cada empresa (la suya) | Solo Super Admin |
| `profiles` (usuarios) | Tu propia empresa | Admins de esa empresa / Super Admin |
| `invites` | Tu propia empresa | Admin Empresa (solo roles internos) / Super Admin |
| `actividades` | Admin/Directivo (toda la empresa), Colaborador (solo lo suyo) | Admin Empresa / Super Admin |
| `kpis`, `campaigns` | Toda tu empresa | Admin Empresa / Super Admin |

Ningún visitante anónimo (sin sesión) puede leer ni escribir nada — todas las reglas exigen estar autenticado.

### Pendiente de reforzar (recomendado, no implementado todavía)

1. **Modo "ver" vs "editar" para el Super Admin**: hoy cuando entras al panel operativo de una empresa desde `admin.html`, técnicamente puedes editar igual que su Admin (es necesario para soporte), pero conviene marcar visualmente que estás en "modo observador" para no editar por accidente datos de un cliente.
2. **Política de contraseña**: Supabase permite subir el mínimo de caracteres y exigir complejidad desde el dashboard del proyecto — vale la pena activarlo antes de vender a clientes reales.

### Registro de invitaciones y accesos (ya implementado, parcialmente)

La tabla `invites` ya guarda **quién invitó a quién, a qué rol, a qué empresa y cuándo** (columna `invited_by`) — es, de hecho, un registro completo de cada invitación creada por cada `company_admin`. Lo único que falta es mostrarlo más explícitamente en la pantalla (hoy se ve la lista de invitaciones, pero no el nombre de quién la generó) — es un ajuste de interfaz, no de base de datos.

### Revocar accesos (diseño nuevo, no implementado todavía)

Hoy se puede borrar una invitación **mientras esté pendiente** (antes de que la persona se registre), pero no existe forma de quitarle el acceso a alguien que **ya tiene cuenta**. Propuesta, manteniéndonos sin servidor propio:

- Agregar una columna `active` (sí/no) a `profiles`, en `true` por default.
- Las reglas de seguridad (RLS) se ajustan para que un perfil con `active = false` pierda todo acceso a los datos de su empresa — puede seguir "entrando" con su correo/contraseña (eso lo controla Supabase, no nosotros), pero la app no le muestra nada y no puede leer ni escribir información.
- Un botón "Revocar acceso" en la tabla de usuarios (`admin.html` para cualquiera, `empresa.html` para los de su propia empresa) que solo cambia ese campo a `false` — reversible, por si fue un error.

### Auditoría de actividades (diseño nuevo, no implementado todavía)

Una tabla `audit_log` (quién hizo qué, sobre qué, cuándo, en qué empresa) que se llena **sola** mediante triggers — no depende de que el código de la pantalla "se acuerde" de registrar el evento, así que no se puede dejar pasar por accidente ni desactivar desde el navegador. Eventos a registrar inicialmente (los que pide esta fase — invitaciones y accesos — más uno relacionado):

| Evento | Quién lo dispara |
|---|---|
| Empresa creada | Super Admin |
| Invitación creada | Super Admin / Admin de Empresa |
| Invitación cancelada | Super Admin / Admin de Empresa |
| Acceso revocado / restaurado | Super Admin / Admin de Empresa |

Visible como una nueva sección "Actividad reciente": el Super Admin ve la de toda la plataforma, cada Admin de Empresa ve solo la de su propia empresa — mismo criterio de aislamiento que el resto de la app.

---

## Fase 4 — Creación de usuarios y gestión colaborativa

### Flujo de invitación (ya implementado)

1. El Admin de Empresa (o el Super Admin, para crear el primer Admin) llena un formulario: correo + rol (Directivo o Colaborador).
2. Eso crea una invitación pendiente, ligada a su empresa.
3. La persona invitada se registra en `login.html` con exactamente ese correo.
4. Al registrarse, la base de datos la vincula automáticamente a la empresa y el rol correctos — sin que nadie tenga que compartir contraseñas ni el Admin tenga que "crear" la cuenta a mano.

### Por qué no hay "credenciales iniciales" que comunicar (decisión confirmada)

Se evaluó automatizar el envío de correo + contraseña inicial, pero requeriría una pieza de servidor nueva (Edge Function con la clave de administración de Supabase) que hoy no existe en la app — se decidió **no** construirla por ahora y mantener el flujo manual. Esto tiene una ventaja de seguridad de fondo: como cada persona crea su propia contraseña, **nadie — ni siquiera el Admin que invita — llega a conocerla en ningún momento**, ni de forma temporal.

Lo que sí ya pasa automáticamente, sin que se tenga que construir nada:

- **Contraseñas cifradas** — Supabase nunca guarda la contraseña en texto plano, la cifra (`bcrypt`) antes de guardarla.
- **Token de verificación** — al registrarse, Supabase manda un correo de confirmación con un enlace de un solo uso; hasta no confirmarlo, esa cuenta no puede iniciar sesión (la fricción que ya viviste al probarlo).

Permisos por colaborador: se mantienen **por rol** (todos los Colaboradores tienen las mismas capacidades) y no individuales por persona — más simple de auditar ("¿qué puede hacer un Colaborador?" tiene una sola respuesta), y es justo lo que ya está implementado en la tabla de abajo.

### Qué puede modificar cada quién (decisión actualizada)

| | Título / canal / fecha | Crear / borrar / reasignar | Reportar avance |
|---|:---:|:---:|:---:|
| Admin de Empresa | ✅ (cualquier actividad de su empresa) | ✅ | ✅ |
| Colaborador | ✅ (**solo** sus propias tareas asignadas) | ❌ | ✅ (solo lo suyo) |

Ajuste confirmado: el Colaborador ya no solo reporta avance — también puede editar el **título, canal y fecha** de las tareas que tiene asignadas (para reprogramarlas o aclarar el detalle). Lo que sigue sin poder hacer: crear actividades nuevas, borrarlas, o reasignarlas a otra persona — eso se queda en manos del Admin de Empresa, para que nadie se "auto-asigne" trabajo fuera de la planeación.

**Nota técnica para cuando se construya:** dar permiso de edición de fila completa sería riesgoso (un colaborador podría, sin querer o no, cambiar a qué empresa o a quién pertenece la tarea). La forma segura es una regla en la base de datos que solo deje pasar el cambio de `titulo`/`canal`/`fecha`/`color`, y bloquee cualquier intento de tocar `company_id`, `assigned_to`, `campaign_id`, `progress_pct` o `status` por esa vía (esos campos solo cambian a través del Admin o del reporte de avance). No se requiere ninguna decisión de tu parte aquí, es solo cómo se va a implementar con seguridad.

### Flujo colaborativo de extremo a extremo (ya implementado)

```
Admin crea actividad → la asigna a un Colaborador
        ↓
Colaborador la ve en "Mis tareas" → reporta % de avance + nota
        ↓
Se guarda en activity_updates → un trigger sincroniza el progress_pct
de la actividad automáticamente
        ↓
Directivo (y Admin) ven el avance agregado por campaña y por
colaborador en su dashboard, la próxima vez que lo abren
```

### Pendiente (se resuelve junto con la Fase 5)

No hay notificaciones todavía cuando se asigna una tarea nueva o cuando alguien reporta avance — el usuario tiene que entrar a revisar. La Fase 5 ya pide notificaciones para las propuestas de calendario, así que conviene diseñar **un solo sistema de notificaciones** que cubra ambos casos en vez de dos por separado.

---

## Fase 5 — Calendarios personalizados y propuestas

### Concepto

Tú (Super Admin) puedes armar un calendario sugerido para una empresa y enviárselo como **propuesta** — la empresa decide si lo acepta tal cual, lo modifica antes de aceptarlo, o lo rechaza. Es distinto a crear actividades directamente: una propuesta no aparece en el calendario real de la empresa hasta que alguien de esa empresa la apruebe.

### Entidades nuevas

| Entidad | Qué guarda |
|---|---|
| `calendar_proposals` | Quién la envió, a qué empresa, estado (`pendiente` / `aceptada` / `rechazada`), cuándo se respondió |
| `proposal_items` | Las actividades sugeridas dentro de esa propuesta (título, canal, fecha, color) — son un "borrador", no actividades reales todavía |

### Flujo

1. **Tú** armas la propuesta: eliges la empresa destino y agregas las actividades sugeridas (misma mecánica que ya existe para agregar actividades, pero guardando en `proposal_items` en vez de `actividades`).
2. **El Admin de Empresa** la ve en una nueva sección "Propuestas recibidas" dentro de `empresa.html`, con tres botones:
   - **Aceptar** → las actividades propuestas se copian tal cual al calendario real.
   - **Modificar** → puede editar fecha/título/canal de cada actividad propuesta antes de aceptar (igual que edita las suyas).
   - **Rechazar** → la propuesta queda cerrada; opcionalmente con un comentario de por qué.
3. Quedan vinculadas: si se acepta, las actividades creadas guardan de qué propuesta vinieron — para que puedas dar seguimiento a cuántas de tus propuestas se usan.

### Notificaciones

Sin servidor propio, la forma más simple (mismo criterio que usamos para las invitaciones) es una **bandeja dentro de la app**: una tabla `notifications` (a quién, qué pasó, leída/no leída) que se llena sola cuando se crea o responde una propuesta, y un contador/campanita en la barra superior que se revisa cada vez que alguien abre su panel — sin necesidad de correo ni servicios externos.

👉 Si en algún momento quieres que además llegue un correo o una notificación push de verdad (no solo al abrir la app), eso sí requiere conectar un servicio externo (ej. Resend para correos) — lo dejo como mejora futura, no como parte de esta fase base.

---

## Fase 6 — Conexión con IA

### Idea central: la IA reutiliza el sistema de propuestas de la Fase 5

En vez de inventar un camino nuevo, la forma más simple y segura es que la IA **genere propuestas de calendario igual que tú lo harías a mano** (Fase 5) — solo que el remitente es automático. Así, una empresa nunca recibe cambios directos de una IA sin revisarlos: siempre los ve como propuesta para aceptar, modificar o rechazar.

### Qué parámetros analizaría (por empresa, nunca mezclando entre empresas)

| Fuente de datos | Para qué le sirve a la IA |
|---|---|
| Actividades pasadas y su categoría/canal (`actividades`) | Detectar qué tipo de contenido/canal se ha usado y con qué frecuencia |
| Avances y cumplimiento (`activity_updates`, `progress_pct`, `status`) | Saber qué tanto se completa lo planeado y qué colaborador lleva qué carga |
| KPIs configurados y su evolución (`kpis`) | Identificar qué indicador va atrasado respecto a su meta, para priorizar ahí |
| Fechas/temporada | Sugerir actividades relevantes a la época del año |
| Giro de la empresa | Para que las sugerencias tengan sentido para *ese* tipo de negocio (esto se vuelve más importante si en el futuro se venden las categorías personalizadas mencionadas en la Fase 2) |

### Qué entrega la IA

1. **Una propuesta completa de calendario** (usa exactamente `calendar_proposals` + `proposal_items` de la Fase 5) — la empresa la revisa igual que una propuesta tuya.
2. **Insights puntuales más pequeños**, sin ser un calendario completo — tarjetas tipo "⚠️ KPI 'Reseñas Google' va 30% atrasado respecto a tu meta de este mes" en el dashboard del Directivo/Admin.

### Cómo se dispara (recomendado para empezar)

Un botón **"Generar sugerencia con IA"** que el Admin de Empresa o tú presionan cuando lo quieren — no automático ni en segundo plano. Es más fácil de demostrar en una venta, más predecible, y controla el costo de cada llamada a la IA. Más adelante se puede pasar a un disparador automático (ej. el primer día de cada mes) si decides que vale la pena.

### Pieza técnica nueva que esto introduce

Hasta ahora toda la app es 100% estática (HTML + Supabase desde el navegador) — no ha hecho falta ningún servidor propio. La IA es la primera función que sí necesita una pieza de servidor: una **Supabase Edge Function** que recibe la petición ("genera una propuesta para la empresa X"), junta los datos de *esa* empresa, los manda a un modelo de IA, y guarda el resultado como propuesta. La clave de la API de IA vive como secreto dentro de esa función — nunca en el navegador, igual de protegida que cualquier credencial sensible de las que hemos cuidado en este proyecto.

---

## Fase 7 — Visualización y accesibilidad

### Punto de partida

Hoy cada panel (`empresa.html`, `directivo.html`, `colaborador.html`) es una sola página larga: todo apilado de arriba hacia abajo (formularios, tablas, calendario). Funciona, pero para alguien sin conocimientos técnicos — un colaborador de restaurante revisando desde su celular, por ejemplo — es fácil perderse desplazándose entre secciones que no necesita ese momento.

### Cambios propuestos por área

**1. Navegación por pestañas en vez de una sola página larga**
En `empresa.html`, agrupar "Calendario", "Campañas" y "Equipo" en pestañas dentro de la misma página (sin recargar) — el Admin ve una cosa a la vez en vez de todo junto. `directivo.html` y `colaborador.html` ya son lo bastante cortos para no necesitarlo.

**2. Barra superior consistente en todas las páginas**
Mismo lugar para: nombre de la empresa/usuario, 🔔 notificaciones (Fase 5), y cerrar sesión — ya existe la base (`topbar`), falta unificar el ícono de notificaciones en los 4 paneles por igual.

**3. Lenguaje simple y sin jerga técnica**
Ya se usa español sencillo en los textos (no se habla de "RLS" ni "company_id" en la interfaz) — mantenerlo así conforme se agreguen pantallas nuevas, dejando los términos técnicos solo en este documento.

**4. Estados vacíos que guían, no solo informan**
Hoy dice "Sin tareas asignadas todavía" — está bien, pero se puede sumar una frase de qué hacer a continuación según el rol (ej. al Admin: "Crea tu primera campaña arriba ↑").

**5. Pensado primero para celular, no para escritorio**
Los colaboradores muy probablemente van a revisar "Mis tareas" desde el teléfono durante su turno. Las tarjetas de tareas ya se acomodan bien en pantallas chicas; lo que falta revisar son las **tablas** (invitaciones, campañas, usuarios) en `admin.html` y `empresa.html`, que en un celular se ven apretadas — conviene que en pantallas angostas se muestren como tarjetas en vez de tabla.

**6. Accesos rápidos a lo más usado**
Para el Colaborador, lo más usado es "reportar avance" — ya es el primer botón que ve. Para el Admin de Empresa, lo más usado va a ser "agregar actividad" — conviene que ese formulario quede arriba de todo (o en su propia pestaña) en vez de mezclado entre invitaciones y campañas.

**7. Resumen ejecutivo: tarjetas grandes para entender todo en 5 segundos**
Arriba de todo en `directivo.html` (y, en versión reducida, en `empresa.html`), una fila de 4 tarjetas grandes con número + ícono — sin tener que leer ninguna tabla:

```
📅 Actividades hoy → 18      📈 Cumplimiento → 87%
🔥 Campañas activas → 12     👥 Colaboradores → 8
```

Reglas para que de verdad se entiendan "en 5 segundos":

- **Números grandes, una sola cifra por tarjeta** — nada de párrafos ni varias métricas juntas en una misma tarjeta.
- **Color como semáforo, no decoración**: ej. "Cumplimiento" se pinta verde si va bien (≥90%), amarillo si va regular (70–89%), rojo si necesita atención (<70%) — el gerente capta el color antes de leer el número.
- **Máximo 4 a 6 tarjetas** — si se necesitan más métricas, van más abajo en detalle, no en esta fila.
- **Orden por urgencia, no por orden alfabético** — lo que necesita atención (ej. cumplimiento bajo) va primero, lo informativo (ej. total de colaboradores) va al final.
- Estas tarjetas son aparte de las tarjetas de KPI personalizables (Fase 2) — esta fila es un resumen operativo fijo (actividades, cumplimiento, campañas, equipo), las de KPI son las que cada empresa configura a su gusto.

**Decisión confirmada sobre "colaboradores conectados":** se muestra el **total de colaboradores activos** (con acceso, según la Fase 3) en vez de "conectados ahora" — no se construye rastreo de presencia en tiempo real.

### Lo que ya cumple esto (sin cambios necesarios)

- Colores consistentes por categoría de actividad (azul/verde/naranja/rojo) en todos los paneles.
- Tarjetas de KPI con barra de progreso visual en vez de solo números.
- Badges de estado (pendiente/en progreso/completada) con color, no solo texto.
- Mensajes de error y éxito en rojo/verde, no técnicos ("✅ Actividad agregada" en vez de un código de error).

---

## Fase 8 — Calendario tipo Monday.com (vista de tarjetas)

### Concepto

El calendario de mes (`empresa.html`) se queda igual para tener de un vistazo "qué hay este mes" — pero se le suma una **vista de tarjetas** complementaria, donde cada actividad se ve como una tarjeta rica en vez de solo una barra de color:

```
□ Crear video TikTok
📅 28 Junio   👤 Miguel   🟡 En progreso
💬 3 comentarios   📎 2 archivos (próximamente)
```

Las dos vistas muestran las mismas actividades — solo cambia cómo se presentan. El usuario alterna entre "Vista calendario" y "Vista tarjetas" con un botón, sin que sea información distinta.

### De dónde sale cada dato de la tarjeta (la mayoría ya existe)

| Campo de la tarjeta | De dónde sale | ¿Nuevo? |
|---|---|---|
| Checkbox / título | `actividades.titulo`, marcado según `status` | Ya existe |
| 📅 Fecha | `actividades.fecha` | Ya existe |
| 👤 Responsable | `actividades.assigned_to` → nombre en `profiles` | Ya existe |
| 🟡 Estado | `actividades.status`, con el mismo badge de color que ya usa la app | Ya existe |
| 💬 Comentarios | **Conteo** de filas en `activity_updates` para esa actividad — las notas que ya deja un colaborador al reportar avance funcionan como "comentarios", sin tabla nueva | Ya existe (solo falta contarlas) |
| 📎 Archivos | Cantidad de adjuntos | **Nuevo** — ver abajo |

### Archivos adjuntos (diseño documentado, no se construye todavía)

Decisión confirmada: por ahora solo se deja diseñado, sin implementar Storage. Cuando se construya:

- Tabla `activity_files` (id, `activity_id`, `uploaded_by`, nombre del archivo, URL, fecha).
- Un bucket de **Supabase Storage** (almacenamiento de archivos, separado de las tablas) con sus propias reglas de acceso — mismo criterio de aislamiento que el resto de la app: solo gente de la misma empresa puede ver/subir archivos de sus propias actividades.
- En la tarjeta, mientras no exista esto, el contador de 📎 se muestra como "—" o se oculta, en vez de inventar un número.

### Arrastrar y soltar (decisión confirmada: dentro del calendario de mes)

FullCalendar (la librería que ya usa la app) soporta esto de fábrica — no se agrega ninguna librería nueva:

- Se activa el modo "editable" del calendario.
- Al arrastrar una tarjeta a otro día, se dispara un evento (`eventDrop`) que actualiza el campo `fecha` de esa actividad en la base de datos — mismo permiso que ya existe hoy para editar una actividad (Admin de Empresa, o el propio Colaborador si es una de sus tareas asignadas, según la Fase 4).
- Mover entre columnas de estado (tablero Kanban) **no** se construye en esta fase — quedó descartado a favor de lo anterior, que es más simple y no requiere una vista nueva.

---

## Fase 9 — Centro de campañas (jerarquía Campaña → Objetivos → Actividades → Resultados)

### La jerarquía, con tu ejemplo

```
Campaña: Mundial 2026
  └─ Objetivo: 100 reservas (meta medible)
       └─ Actividades: 20 publicaciones (lo que se hace para llegar ahí)
            └─ Resultado: cuántas reservas se llevan hasta hoy
```

Una campaña puede tener más de un objetivo (ej. "100 reservas" y, aparte, "30,000 personas alcanzadas") — cada uno con sus propias actividades y su propio resultado.

### Cómo se arma con lo que ya existe (sin tablas nuevas)

La pieza que falta es "Objetivos" — y resulta que ya tienes algo que hace exactamente eso: la tabla `kpis` (meta + valor actual + unidad). Hoy un KPI solo puede ser "de toda la empresa"; la propuesta es agregarle un `campaign_id` **opcional**:

- `kpis.campaign_id` vacío → es un KPI general de la empresa (como hoy).
- `kpis.campaign_id` con valor → es un Objetivo de **esa** campaña específica.

Con eso, la jerarquía completa queda así, sin inventar entidades nuevas:

| Nivel | Tabla que ya existe |
|---|---|
| Campaña | `campaigns` |
| Objetivo (meta medible) | `kpis` (filtrados por `campaign_id`) |
| Actividades | `actividades` (ya tienen `campaign_id`) |
| Resultado | el propio `current_value` del objetivo — **siempre al día**, no un reporte aparte que se pueda desactualizar |

### Cómo se ve en pantalla

En `empresa.html` y `directivo.html`, cada campaña de la tabla se puede **expandir** (clic para desplegar) y mostrar adentro:

1. Sus objetivos, con la misma tarjeta de KPI con barra de progreso que ya existe (meta vs. resultado).
2. Sus actividades relacionadas (lo que ya se ve hoy en el calendario, pero filtrado a solo esa campaña).

Así, "Resultados" no es una pantalla aparte ni algo que alguien tenga que ir a llenar — es simplemente la misma barra de progreso del objetivo, que ya se actualiza sola conforme avanzan las actividades y conforme el Admin actualiza el valor del KPI.

---

## Fase 10 — Vista de Colaborador: calendario de trabajo

### Punto de partida

Hoy `colaborador.html` muestra "Mis tareas" como una lista de tarjetas apiladas (buena para celular, según la Fase 7) — pero no hay una vista de **calendario** como la que ya tiene el Admin de Empresa.

### Diseño: el mismo calendario, con datos ya filtrados a lo suyo

Se agrega a `colaborador.html` el mismo componente de calendario visual (FullCalendar) que ya usa `empresa.html` — no es una librería nueva, solo se reutiliza. La diferencia es el filtro de datos, que ya existe en la base: el colaborador **solo ve sus propias tareas asignadas** (`assigned_to = su usuario`), igual que en la vista de tarjetas actual.

Cada actividad en el calendario muestra, igual que hoy en la tarjeta:

| Dato | De dónde sale |
|---|---|
| Tarea / título | `actividades.titulo` |
| Fecha | `actividades.fecha` (posición en el calendario) |
| Responsable | El propio colaborador (no hace falta mostrarlo, ya sabe que son las suyas) |
| Estado de avance | Color del evento, igual que ya se usa en `empresa.html` (pendiente/en progreso/completada) |

**Las dos vistas conviven**, no se reemplaza una por la otra: arriba el calendario de mes para ver "qué tengo y cuándo" de un vistazo, abajo la lista de tarjetas (la que ya existe) para reportar avance con el control deslizante — eso no se puede hacer cómodo dentro de una celda de calendario tan chica.

Clic en un evento del calendario simplemente **desplaza la pantalla** hacia su tarjeta correspondiente en la lista de abajo (donde sí están los controles para reportar avance), en vez de duplicar la lógica de edición en dos lugares.

---

## Fase 11 — Estrategias directivas en la vista de Colaborador

### Decisión confirmada sobre quién las publica

El Directivo se mantiene 100% solo-lectura (no se le da ningún permiso de escritura nuevo). Quien redacta y publica las estrategias es el **Admin de Empresa**, en representación de lo que dirección indique — el Directivo puede verlas igual que el Colaborador, pero no crearlas.

### Modelo de datos (una tabla nueva, simple)

`strategies` (id, `company_id`, `created_by`, título, contenido, fecha) — un texto guía por estrategia, sin estructura más compleja que eso por ahora (no es una tarea con fecha/estado, es una guía de referencia).

### Dónde se ve

- **`empresa.html`**: nueva sección "Estrategias directivas" — formulario simple (título + texto) para publicar una nueva, y la lista de las ya publicadas.
- **`colaborador.html`**: nueva pestaña/sección "Estrategias", de solo lectura — el colaborador las consulta como guía antes o durante su trabajo, no se relacionan una a una con sus tareas (son contexto general, no instrucciones por actividad).
- **`directivo.html`**: misma lista de solo lectura, para que el Directivo pueda confirmar que lo que se publicó refleja lo que indicó.

### Seguridad

Mismo criterio que toda la app: solo gente de la misma empresa las ve; solo el Admin de esa empresa (o el Super Admin) puede publicarlas o editarlas.

---

## Fase 12 — Evaluación de actividades (y un hueco que se cierra de paso)

### Qué evalúa el colaborador

"Estado" y "cumplimiento" ya existen — son el `status` y el `progress_pct` que el colaborador ya reporta hoy. Lo que falta es **calidad**, que se agrega como un menú desplegable más, justo al lado del control de avance que ya existe en `colaborador.html`:

> Calidad del trabajo: Excelente / Buena / Regular / Necesita mejora

Se guarda junto con el avance, en la misma fila de `activity_updates` (una columna nueva `quality`) — no es un formulario aparte, es un campo más del mismo reporte que el colaborador ya hace.

### Cómo se conecta con el dashboard

En `directivo.html`, la tabla "Desempeño por colaborador" suma una columna **"Calidad promedio"**: se calcula a partir de todas las evaluaciones de ese colaborador (convirtiendo Excelente/Buena/Regular/Necesita mejora a una escala interna para promediar, y mostrando de vuelta la etiqueta más cercana) — el Director ve de un vistazo no solo *cuánto* avanza cada colaborador, sino *qué tan bien*.

### Estado: construido (con un ajuste a la decisión original)

Se decidió que las observaciones sí se puedan **editar** después de creadas (a diferencia de lo que se planteó originalmente, que era un historial 100% fijo). Para no perder trazabilidad por completo, cada edición queda marcada como "(editado)" — nadie ve un valor cambiado sin saber que cambió. Lo que sigue protegido sin excepción: nadie puede alterar a qué actividad pertenece la observación, quién la escribió, el % de avance que tenía en ese momento, ni la fecha original.

Ya está construido: en `colaborador.html`, cada tarea tiene un botón "Ver observaciones anteriores" con un lápiz ✏️ para editar cualquiera de las suyas. En `empresa.html`, al hacer clic en una actividad del calendario, la opción "3" muestra el mismo historial (solo lectura, para el Admin).

### Un hueco que esto deja al descubierto: el Admin de Empresa no tenía esta tabla

Repasando, el dashboard de "Desempeño por colaborador" solo existe hoy en `directivo.html` — el Admin de Empresa (quien según la Fase 1 original debía ver "el mismo dashboard que el Directivo, más controles") no tiene forma de verlo. Se cierra agregando al Admin de Empresa como un acceso más permitido a esa misma pantalla (igual que ya puede ver el Super Admin), en vez de duplicar la tabla en dos archivos — reutiliza exactamente lo que ya existe.

---

## Fase 13 — Generación de actividades desde el área administrativa

### Lo que ya existe (la mayoría)

El formulario "Agregar nueva actividad" en `empresa.html` ya cubre título, fecha, responsable (el selector de colaborador) y categoría. Dos cosas puntuales para completar exactamente lo que pides:

1. **Descripción**: hoy existe el campo "Canal o Detalle", que es más una etiqueta corta (ej. "Facebook") que una descripción real. Se agrega un campo de texto largo aparte — `descripcion` — para que el detalle completo de la tarea no se mezcle con el canal.
2. **Estado inicial**: hoy toda actividad nueva nace como "pendiente" automáticamente (no es una decisión del Admin al crearla) — tiene sentido mantenerlo así (toda tarea nueva empieza pendiente por definición), así que no se agrega un selector para esto a menos que prefieras poder marcar una actividad como "ya en progreso" desde el momento en que la creas.

### Archivos o notas adjuntos

Esto es exactamente lo mismo que ya quedó diseñado (sin construir) en la **Fase 8** — no se diseña dos veces. Cuando se decida construir Storage, aplica igual aquí: se sube desde el mismo formulario de creación, no solo después.

---

## Fase 14 — Integración con el calendario de colaboradores

### Lo que ya pasa automáticamente

En cuanto el Admin crea la actividad y elige el responsable, esa persona la ve de inmediato — no hace falta "sincronizar" nada aparte, porque ambas pantallas leen la misma tabla `actividades` filtrada por quién es. Con la **Fase 10** (calendario visual del colaborador), también se ve ahí, coloreada por estado (pendiente/en progreso/completada) igual que en el calendario del Admin.

### Lo que falta: avisarle que le llegó algo nuevo

Aquí sí hay un hueco real: nadie le avisa al colaborador que tiene una tarea nueva — tiene que abrir la app para enterarse. Y esta es, contando, la **tercera vez** que esta necesidad aparece en el documento:

- Fase 5: avisar cuando llega una propuesta de calendario.
- Fase 4: avisar cuando se asigna o se actualiza una tarea.
- Fase 14 (aquí): avisar específicamente cuando se asigna una actividad nueva.

Las tres son el mismo problema. Ya quedó diseñada la solución (una tabla `notifications` + una campanita 🔔 en la barra superior) pero nunca se ha construido. Dado que ya se repitió tres veces, probablemente valga la pena construirla ahora en vez de seguir posponiéndola — te pregunto al final de esta fase si quieres priorizarla.

### Estado: construido

Ya quedó implementado: tabla `notifications` (`supabase_schema_v5.sql`), con dos disparadores automáticos — se asigna/reasigna una actividad → notifica al colaborador; se reporta avance **o se edita una observación** → notifica a los Admins de esa empresa (`supabase_schema_v9.sql`). La campanita 🔔 vive en la barra superior de las 4 páginas (se abre con clic, marca todo como leído al abrirla). Cubre los casos de la Fase 4 y de esta Fase 14 — el caso de la Fase 5 (propuestas de calendario) se conectará solo cuando esa fase se construya, usando la misma tabla.

### Arrastrar y soltar: construido para ambos roles

El Admin de Empresa y el Colaborador ya pueden arrastrar una actividad a otro día en su respectivo calendario (`empresa.html` y `colaborador.html`) — cambia la `fecha` directamente. Para el colaborador esto requirió agregar a nivel de base de datos el permiso que ya se había aprobado en la Fase 4 original pero nunca se construyó (`supabase_schema_v10.sql`): puede mover/editar sus propias tareas asignadas, pero no su empresa, campaña, % de avance o estado.

---

## Fase 15 — Modularización del código (Fase 1: separar el JavaScript)

### Por qué

Hoy cada página (`admin.html`, `empresa.html`, `directivo.html`, `colaborador.html`, `login.html`) tiene todo su JavaScript metido dentro de un `<script type="module">` en el propio HTML — funciona, pero el archivo crece y mezcla "estructura de la página" con "lógica". Separarlo no cambia ningún comportamiento, solo dónde vive el código.

### Estructura propuesta (carpeta `js/`)

| Archivo | Responsabilidad única |
|---|---|
| `js/supabaseClient.js` | Conexión a Supabase + todo lo de sesión/autenticación (`requireSession`, `resolveCompanyId`, `resolveUserId`, `roleHome`, `logout`). Ya existe hoy en `assets/`, solo se mueve. |
| `js/ui.js` | Componentes de interfaz reutilizables: toasts, modales, campanita de notificaciones. Ya existe hoy en `assets/`, solo se mueve. |
| `js/login.js` | Lógica de `login.html`: iniciar sesión, crear cuenta, alternar entre los dos modos. (No estaba en tu lista, pero por consistencia — "cada HTML queda limpio" — también le toca su propio archivo). |
| `js/admin.js` | Todo lo del panel Super Admin: empresas, invitaciones, usuarios, auditoría, pestañas. |
| `js/empresa.js` | Todo lo del panel Admin de Empresa: resumen, equipo, campañas, objetivos, calendario (incluye arrastrar y soltar), estrategias, observaciones. |
| `js/directivo.js` | Todo lo del dashboard Directivo: resumen, KPIs, avance de campañas, desempeño por colaborador, estrategias (solo lectura). |
| `js/colaborador.js` | Todo lo del panel Colaborador: calendario, tareas, observaciones (con edición), estrategias (solo lectura). |

### Qué cambia en cada HTML

Cada página pasa de tener cientos de líneas de `<script type="module"> ... </script>` a una sola línea:

```html
<script type="module" src="js/empresa.js"></script>
```

El HTML se queda únicamente con estructura (`<div>`, `<table>`, formularios) y las etiquetas `<link>`/`<script>` de las librerías externas (Supabase, FullCalendar, Font Awesome, fuentes). El CSS (`assets/styles.css`) no se mueve — esta fase es solo sobre JavaScript.

### Lo que NO cambia

Ningún comportamiento ni función se modifica — es exactamente el mismo código, solo movido de lugar. Las funciones que hoy se llaman desde `onclick="..."` en el HTML (ej. `onclick="crearEmpresa()"`) sigue funcionando igual, porque cada archivo sigue exponiéndolas en `window` tal como ya lo hace ahora.

### Estado: Fase 1 construida

Ya quedó hecho: carpeta `js/` con `supabaseClient.js`, `ui.js`, `login.js`, `admin.js`, `empresa.js`, `directivo.js`, `colaborador.js`. Cada HTML termina con una sola línea `<script type="module" src="js/...">`.

---

## Fase 16 — Modularización (Fase 2: funciones compartidas)

### Lo que de verdad está duplicado, revisando `empresa.js` / `directivo.js` / `colaborador.js`

| Código duplicado | Dónde aparece | Va a |
|---|---|---|
| Las 4 tarjetas de resumen (Actividades hoy, Cumplimiento, Campañas activas, Colaboradores) | Idéntico en `empresa.js` y `directivo.js` | `js/shared/dashboard.js` |
| Tarjeta visual de un KPI (nombre + barra de progreso) | Se repite **3 veces**: en `cargarKpis()` de `directivo.js`, y dentro de `cargarDetalleCampania()` tanto en `empresa.js` como en `directivo.js` | `js/shared/kpis.js` |
| Cargar y desplegar el detalle de una campaña (sus objetivos + sus actividades) | Casi idéntico en `empresa.js` y `directivo.js` — la única diferencia es que `empresa.js` además agrega el formulario "Agregar objetivo" | `js/shared/campanias.js` |

**Bonus que noté y no estaba en tu lista:** `cargarEstrategias()` (cargar y mostrar la lista de estrategias) está duplicada **3 veces** — en `empresa.js`, `directivo.js` y `colaborador.js`. Te pregunto al final si quieres que también se mueva a un archivo compartido (`js/shared/estrategias.js`) ya que aplica el mismo principio de esta fase.

### Qué contiene cada archivo compartido

**`js/shared/kpis.js`**
- `renderizarTarjetaKpi(kpi)` → regresa el HTML de una tarjeta (nombre, meta vs. actual, barra de progreso). Una sola función, usada por las 3 vistas que hoy la repiten.
- `renderizarGridKpis(listaKpis)` → envuelve varias tarjetas, o muestra "Sin KPIs todavía" si la lista viene vacía.

**`js/shared/dashboard.js`**
- `renderizarResumen(supabaseClient, companyId, idDelContenedor)` → hace las 4 consultas (actividades de hoy, cumplimiento, campañas activas, colaboradores) y dibuja las tarjetas grandes. La llaman `empresa.js` y `directivo.js` con un solo argumento distinto: en qué `<div>` dibujar.

**`js/shared/campanias.js`**
- `toggleCampania(supabaseClient, campaignId, opciones)` → abre/cierra la fila expandible y, si hace falta, llama a cargar el detalle.
- `cargarDetalleCampania(supabaseClient, campaignId, opciones)` → trae objetivos + actividades de esa campaña y los pinta (usando `kpis.js` para las tarjetas de objetivo). El parámetro `opciones.permitirAgregarObjetivo` decide si se agrega el formulario al final — así `empresa.js` lo activa y `directivo.js` no, sin duplicar la función.

Estos archivos reciben `supabaseClient` como argumento (en vez de crear su propia conexión) para seguir usando siempre la misma instancia que ya inicializa `supabaseClient.js` — ningún archivo nuevo se conecta a Supabase por su cuenta.

### Qué NO se comparte (aunque se ven parecidas)

Las tablas "Campañas activas" (`empresa.js`) y "Avance de campañas" (`directivo.js`) tienen **columnas distintas** (una muestra Objetivo/Inicio/Fin, la otra muestra Avance promedio) — esa fila no se unifica, solo lo que sí es idéntico: el detalle que se despliega al hacer clic.

### Estado: construido

Quedó implementado: `js/shared/dashboard.js`, `js/shared/kpis.js`, `js/shared/campanias.js` y `js/shared/estrategias.js` (este último se agregó también, según lo decidido). `empresa.js`, `directivo.js` y `colaborador.js` ahora importan estas funciones en vez de repetirlas.

---

## Fase 17 — Modularización (Fase 3: limpieza de HTML)

### Ya está resuelta, sin trabajo nuevo

Esta fase pedía que cada HTML quedara solo con estructura y una sola línea de `<script>` hacia su JS — eso ya pasó **como efecto directo de la Fase 1** (Fase 15), cuando se extrajo todo el JavaScript inline a `js/`. Verificado en los 5 archivos: cada uno tiene únicamente

1. Las etiquetas `<script src="...">` de librerías externas (Supabase, FullCalendar) — eso no es lógica propia, es cargar una librería, igual que un `<link>` de una fuente.
2. Una sola línea `<script type="module" src="js/archivo.js"></script>` con el código de esa página.

No hay ningún otro `<script>` con código suelto en ninguno de los 5 HTML. Los `onclick="nombreFuncion()"` que quedan en botones (ej. `onclick="crearEmpresa()"`) son simples llamadas a una función ya definida en el `.js` — no es lógica mezclada, es la forma estándar de conectar un evento a su controlador sin un framework de por medio.

---
