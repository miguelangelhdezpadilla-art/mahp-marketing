# DOMAIN MODEL — Dominios de Datos de MAHP

> MDS-008, Documento 2 de 10. Los dominios de negocio que organizan todo dato
> de la plataforma. Cada dominio se documenta con: Objetivo, Propietario,
> Responsable, Datos principales, Dependencias, Eventos, Relaciones. Formato y
> convención de estado heredados de `06-PRODUCT-BLUEPRINT.md`/`06A`.
>
> Numeración de secciones fijada por `07-ENTERPRISE-DATA-PLATFORM.md` §4 —
> no reordenar sin actualizar esa tabla también.
>
> Última actualización: 2026-07-12.

---

## Core

### 1. Empresas — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Ancla de aislamiento multiempresa; toda tabla operativa cuelga de `company_id` |
| Propietario | `super_admin` (crea/desactiva); dato visible (nombre) a toda la empresa |
| Responsable técnico | Tabla `companies` (`v2`) — ver `DATABASE.md` §3 |
| Datos principales | `id`, `name`, `active`, `created_at` |
| Dependencias | Ninguna — es la raíz |
| Eventos | "empresa creada" registrado en `audit_log` |
| Relaciones | Origen de FK `company_id` en prácticamente toda tabla operativa (§5–13) |

### 2. Usuarios — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Representar a cada persona con acceso, vinculada a una empresa y un rol |
| Propietario | `super_admin` (revoca/restaura acceso global); `company_admin` gestiona el equipo de su empresa vía invitaciones (§3) |
| Responsable técnico | Tabla `profiles` (`v2`), 1:1 con `auth.users` |
| Datos principales | `id` (= `auth.users.id`), `role`, `company_id` (nulo solo en `super_admin`), `full_name`, `active` |
| Dependencias | `companies` (§1) |
| Eventos | "acceso revocado/restaurado" en `audit_log` |
| Relaciones | Base de `my_role()`/`my_company_id()` (`DATABASE.md` §1) — toda política RLS del sistema depende indirectamente de esta tabla |

### 3. Invitaciones — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Convertir un correo en un usuario con rol y empresa definidos, sin que `company_admin` pueda crear otro `company_admin` de su misma empresa |
| Propietario | `super_admin` (primer `company_admin` de una empresa) y `company_admin` (`director`/`collaborator` de su propia empresa) |
| Responsable técnico | Tabla `invites` (`v2`) |
| Datos principales | `email`, `role`, `company_id`, `invited_by`, `used` |
| Dependencias | `companies` (§1), `profiles` (§2) |
| Eventos | "invitación creada/cancelada" en `audit_log` |
| Relaciones | La regla de negocio (quién puede invitar a quién) vive en la política `invites_insert`, no en el cliente — ver `06G-BUSINESS-RULES.md` |

### 4. Auditoría — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Bitácora administrativa de eventos que afectan acceso o estructura de cuentas |
| Propietario | `super_admin` (único lector hoy vía `admin.html`) |
| Responsable técnico | Tabla `audit_log` (`v3`), `insert`-only vía trigger, nunca directo desde el cliente |
| Datos principales | `actor_id`, `company_id`, `action`, `target_type`, `target_id`, `details` (jsonb) |
| Dependencias | `profiles` (§2), `companies` (§1) |
| Eventos | Es en sí mismo el registro de eventos — no dispara otros |
| Relaciones | Cobertura actual: empresa creada, invitación creada/cancelada, acceso revocado/restaurado. No cubre aún eventos de datos operativos (ver `07F` §5, [FUTURO]) |

---

## Marketing

### 5. Campañas — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Agrupar actividades bajo un objetivo medible, en vez de tareas sueltas |
| Propietario | `company_admin` crea; `director`/`collaborator` leen |
| Responsable técnico | Tabla `campaigns` (`v2`) |
| Datos principales | `name`, `objective`, `start_date`, `end_date`, `status` |
| Dependencias | `companies` (§1) |
| Eventos | Ninguno propio — sus efectos se observan a través de `actividades`/`kpis` |
| Relaciones | `kpis.campaign_id` (nullable — vacío = KPI general de empresa), `actividades.campaign_id`, `follower_goals.campaign_id` |

### 6. Actividades / Calendario — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Unidad central de trabajo: qué se hace, cuándo, quién lo hace, con qué estado |
| Propietario | `super_admin`/`company_admin` crean y editan completo; `collaborator` edita un subconjunto acotado de campos de lo suyo (`actividades_collaborator_update`) |
| Responsable técnico | Tabla `actividades` — la tabla original del sistema, sin `create table` propio (`DATABASE.md` §2) |
| Datos principales | `titulo`, `canal`, `fecha`, `descripcion`, `campaign_id`, `assigned_to`, `progress_pct`, `status`, `deleted_at` |
| Dependencias | `companies` (§1), `campaigns` (§5, opcional), `profiles` (§2, vía `assigned_to`) |
| Eventos | Trigger `sync_activity_progress()` (progreso/estado), `award_tarea_completada()` (puntos, §12), `notify_actividad_asignada` (notificaciones, §13) |
| Relaciones | Es el nodo con más dependientes del sistema: `activity_updates` (§9), `evidencias` (§10), `points_log` (§12), `notifications` (§13), `follower_logs` (§8) |

### 7. Contenido Estratégico — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Guía de dirección (no accionable, sin fecha) que da contexto a lo que se ejecuta |
| Propietario | `company_admin`/`super_admin` publican; `director`/`collaborator` leen |
| Responsable técnico | Tabla `strategies` (`v6`) |
| Datos principales | `title`, `content`, `created_by` |
| Dependencias | `companies` (§1), `profiles` (§2) |
| Eventos | Ninguno |
| Relaciones | Sin relación uno-a-uno con actividades — es contexto general, no estructurado (`MODULOS.md` #15) |

---

## Seguidores y Redes Sociales

### 8. Seguidores por Canal — **[EXISTE], no versionado en `.sql`**

| Campo | Detalle |
|---|---|
| Objetivo | Medir crecimiento real de audiencia por canal, vinculado a la actividad/campaña que lo generó |
| Propietario | `company_admin`/`director` fijan metas; cualquier rol reporta según su alcance |
| Responsable técnico | `social_channels`, `follower_logs` (RLS confirmada), `follower_goals` (`v14`) + vistas `follower_totals`, `follower_delta_by_campaign`, `follower_goals_progress` |
| Datos principales | `before_count`/`after_count`/`delta` (`follower_logs`); `goal_total`/`goal_gain` (`follower_goals`) |
| Dependencias | `companies` (§1), `actividades` (§6, vía `activity_id` nullable), `campaigns` (§5, vía `follower_goals.campaign_id`) |
| Eventos | Ninguno automatizado — reporte manual vía formulario |
| Relaciones | ⚠️ Riesgo de gobernanza abierto: estas tablas se crearon fuera del flujo de versionado (`DATABASE.md` §9) — pendiente generar un `.sql` puramente descriptivo que las capture con certeza |

---

## Operaciones

### 9. Avances — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Registrar cada reporte de progreso de una tarea, con quién lo hizo y cuándo |
| Propietario | `collaborator` reporta lo suyo; `company_admin`/`director` leen todo |
| Responsable técnico | Tabla `activity_updates` (`v2`, extendida `v13`) — `append-only` |
| Datos principales | `activity_id`, `user_id`, `progress_pct`, `note`, `authorized_by` (nullable) |
| Dependencias | `actividades` (§6), `profiles` (§2, **dos** FK — ver advertencia abajo) |
| Eventos | Trigger `sync_activity_progress()` sincroniza `actividades`; `award_avance_reportado()` otorga puntos (§12) |
| Relaciones | ⚠️ Dos columnas `uuid references profiles(id)` (`user_id`, `authorized_by`) — cualquier embed implícito de `profiles` debe fijar la relación (`profiles!user_id(...)`), o falla en ejecución. Ya ocurrió una vez en producción (`DATABASE.md` §4) |

### 10. Evidencias — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Respaldo verificable (imagen/video) de que una tarea se ejecutó |
| Propietario | `collaborator` sube; el resto de roles de la empresa ven |
| Responsable técnico | Tabla `evidencias` (`v12`, `deleted_at` en `v16`) + Supabase Storage (bucket `evidencias`) |
| Datos principales | `activity_id`, `uploaded_by`, `file_url`, `file_type`, `file_name`, `deleted_at` |
| Dependencias | `actividades` (§6, cascade), `companies` (§1, cascade), `profiles` (§2) |
| Eventos | `award_evidencia_subida()` otorga puntos (§12) |
| Relaciones | La tabla solo referencia el archivo — el archivo real vive en Storage. No existe hoy borrado de evidencias en la interfaz, aunque `deleted_at` ya está listo para esa capacidad (`MODULOS.md` #13) |

---

## Analytics

### 11. KPIs — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Objetivos medibles, generales de empresa o específicos de una campaña |
| Propietario | `company_admin` define; `director` lee |
| Responsable técnico | Tabla `kpis` (`v2`) |
| Datos principales | `name`, `target_value`, `current_value`, `unit`, `period`, `campaign_id` (nullable) |
| Dependencias | `companies` (§1), `campaigns` (§5, opcional) |
| Eventos | Ninguno automatizado hoy — `current_value` se actualiza manualmente (`06D-ANALYTICS-MODULES.md`, marcado parcial) |
| Relaciones | Es el único dominio de Analytics [EXISTE] pero sin trigger de sincronización — candidato a automatización futura |

---

## Gamificación

### 12. Puntos y Ranking — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Reconocer actividad real (completar tareas, reportar avance, subir evidencia) con puntos verificables |
| Propietario | Nadie escribe directo — **solo triggers insertan** |
| Responsable técnico | Tabla `points_log` (`v15`) + vistas `points_totals`/`points_by_campaign` |
| Datos principales | `user_id`, `action`, `points`, `activity_id` (nullable), `campaign_id` (nullable) |
| Dependencias | `profiles` (§2), `companies` (§1), `actividades` (§6, opcional) |
| Eventos | Alimentado por `award_tarea_completada()`, `award_avance_reportado()`, `award_evidencia_subida()` — nunca por inserción directa del cliente |
| Relaciones | `select`-only para el cliente — es el ejemplo más estricto del principio "un dato, un dueño de escritura" (§3 del documento principal) |

---

## Sistema

### 13. Notificaciones — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Avisar en tiempo real de eventos relevantes (asignación, avance) sin que el destinatario tenga que buscarlos |
| Propietario | Nadie escribe directo — solo triggers |
| Responsable técnico | Tabla `notifications` (`v5`, disparadores `v5`/`v9`) |
| Datos principales | `recipient_id`, `message`, `read` |
| Dependencias | `profiles` (§2), `companies` (§1) |
| Eventos | Se llena vía trigger al asignar/reasignar actividad o reportar/editar avance |
| Relaciones | Consumida por `configurarNotificaciones()` (`js/ui.js`) en las 4 páginas con sesión (`MODULOS.md` #20) |

---

## Inteligencia Artificial

### 14. IA — **[PARCIAL]**

| Campo | Detalle |
|---|---|
| Objetivo | Que los agentes de IA lean el contexto real de la empresa (canal, campaña, frecuencia) y escriban actividades reales — nunca con permisos distintos a los de un humano |
| Propietario | `company_admin` revisa y publica lo que la IA genera — la IA nunca escribe directo (`IA.md` §4) |
| Responsable técnico | Sin tabla propia hoy. Edge Function `generar-calendario` lee contexto de formulario, no de base de datos, y escribe a `actividades` (§6) como cualquier cliente autenticado |
| Datos principales | N/A — no hay estructura de datos de IA persistente todavía |
| Dependencias | `actividades` (§6), `campaigns` (§5) — la IA depende de los dominios operativos, nunca al revés (`06-PRODUCT-BLUEPRINT.md` §3) |
| Eventos | Ninguno propio — lo que genera dispara los mismos triggers que cualquier actividad (§6) |
| Relaciones | **[FUTURO]**: memoria persistente, base de conocimiento y búsqueda semántica — preparación arquitectónica sin tabla definida todavía; ver `07-ENTERPRISE-DATA-PLATFORM.md` §10 y `05E-AI-MEMORY-AND-CONTEXT.md` para el diseño conceptual ya existente que este dominio de datos deberá soportar cuando se construya |

---

## Dominios futuros — sin tabla hoy

### 15. Configuración — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Centralizar ajustes de empresa (branding, seguridad, notificaciones, preferencias) hoy repartidos entre `companies`/`profiles` sin pantalla dedicada |
| Propietario | `company_admin` (propuesto) |
| Responsable técnico | Sin tabla — candidato: `company_settings` (jsonb por empresa) o columnas dedicadas, decisión no tomada |
| Datos principales | N/A |
| Dependencias | `companies` (§1) |
| Eventos | N/A |
| Relaciones | Ver `06A-CORE-MODULES.md` §6 |

### 16. Integraciones — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Sincronizar datos de MAHP con Meta, Google, WhatsApp, TikTok y otros sistemas externos |
| Propietario | Por definir |
| Responsable técnico | Sin tabla — el diseño completo de esta capa es el objeto de MDS-009 (`08-ENTERPRISE-INTEGRATION-PLATFORM.md`), que depende de este documento |
| Datos principales | N/A |
| Dependencias | Prácticamente todos los dominios existentes, como origen/destino de sincronización |
| Eventos | N/A — MDS-009 deberá definir el modelo de eventos (webhooks, colas) |
| Relaciones | Este documento es la base declarada de MDS-009 — cualquier tabla de integraciones futura debe seguir los mismos principios de §3 (dueño único de escritura, `company_id` obligatorio, RLS como frontera) |

### 17. Marketplace — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Catálogo de integraciones/apps de terceros instalables por empresa |
| Propietario | Por definir |
| Responsable técnico | Sin tabla — depende de que Integraciones (§16) exista primero |
| Datos principales | N/A |
| Dependencias | Integraciones (§16) |
| Eventos | N/A |
| Relaciones | Ver `06J-FUTURE-MODULES.md` |

### 18. Franquicias / Sucursales — **[FUTURO], bloqueado**

| Campo | Detalle |
|---|---|
| Objetivo | Que una empresa cliente opere varias ubicaciones bajo la misma cuenta, con vista consolidada |
| Propietario | `company_admin` (propuesto) |
| Responsable técnico | Sin tabla — decisión de modelo no tomada: `companies.parent_company_id` vs. tabla `branches` dedicada |
| Datos principales | N/A |
| Dependencias | `companies` (§1) |
| Eventos | N/A |
| Relaciones | Bloquea al agente de IA "Franchise Operations Advisor" (`05A-AI-AGENTS.md` #20) y al mercado "Franquicias" (`01-IDENTIDAD-DEL-PRODUCTO.md` §9). Mismo bloqueo ya señalado en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §4/§20, `04C-UX-GUIDELINES.md` §16 y `06A-CORE-MODULES.md` §2 — este documento no lo resuelve, lo hereda |

### 19. Operaciones de Negocio (CRM / Inventario / Ventas / Compras / Finanzas / RH) — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Capacidades explícitamente fuera del alcance actual de MAHP como producto de marketing |
| Propietario | N/A |
| Responsable técnico | Sin tabla, sin diseño de datos — intencional |
| Datos principales | N/A |
| Dependencias | N/A |
| Eventos | N/A |
| Relaciones | Catalogado en `06J-FUTURE-MODULES.md` como "fuera de alcance actual" — se documenta aquí únicamente para que quede explícito que este documento **no** diseña datos para ellos, no por descuido sino por decisión de alcance (`PROJECT-BLUEPRINT.md` §1, "Qué NO es") |
