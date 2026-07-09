# BUSINESS RULES — Reglas de Negocio Oficiales de MAHP

> MDS-007, Documento 8 de 11. Reglas de negocio por categoría. La mayoría de
> las reglas marcadas **[EXISTE]** ya están aplicadas como RLS o trigger real
> (`DATABASE.md`) — este documento las reformula como regla de negocio
> explícita, no las reinventa. Las marcadas **[FUTURO]** son reglas de diseño
> para módulos aún no construidos.
>
> Formato por regla: Objetivo · Condición · Acción · Excepciones · Impacto.
>
> Última actualización: 2026-07-09.

---

## 1. Campañas

**R1.1 — Aislamiento por empresa** *[EXISTE]*
Objetivo: ninguna campaña es visible fuera de su empresa. Condición: `company_id ≠ empresa del usuario`. Acción: RLS deniega la lectura. Excepciones: `super_admin`. Impacto: seguridad crítica — sin excepción posible para otros roles.

**R1.2 — Escritura restringida** *[EXISTE]*
Objetivo: solo quien administra puede crear/editar campañas. Condición: rol distinto de `company_admin`/`super_admin`. Acción: operación denegada. Excepciones: ninguna — `director` es explícitamente de solo lectura. Impacto: mantiene la planeación centralizada en una sola fuente de decisión.

**R1.3 — Objetivo recomendado** *[FUTURO]*
Objetivo: incentivar que toda campaña tenga al menos un KPI. Condición: campaña sin ningún `kpis.campaign_id` asociado tras N días de creada. Acción: recordatorio, no bloqueo. Excepciones: ninguna. Impacto: mejora la medibilidad sin forzar un flujo rígido.

## 2. Calendario

**R2.1 — Reprogramación por drag & drop** *[EXISTE]*
Objetivo: permitir mover actividades sin reabrir el formulario completo. Condición: usuario con permiso de edición sobre esa actividad. Acción: `update` de `fecha` únicamente. Excepciones: `director` (solo lectura, `editable:false`). Impacto: agilidad operativa sin exponer edición de otros campos vía ese gesto.

**R2.2 — Colaborador limitado a lo suyo** *[EXISTE]*
Objetivo: un colaborador no reprograma tareas ajenas. Condición: `assigned_to ≠ auth.uid()`. Acción: RLS deniega el `update`. Excepciones: ninguna. Impacto: previene interferencia entre colaboradores.

## 3. KPIs

**R3.1 — Meta vs. actual siempre visible** *[EXISTE]*
Objetivo: nunca mostrar un KPI sin contexto de meta. Condición: siempre. Acción: la tarjeta de KPI muestra ambos valores + barra de progreso. Excepciones: ninguna. Impacto: evita números sin significado.

**R3.2 — Alerta por atraso** *[FUTURO]*
Objetivo: avisar antes de que el periodo cierre si un KPI va mal. Condición: avance proporcional al tiempo transcurrido < 70% (umbral inicial sugerido). Acción: KPI Advisor genera alerta (`06E-AI-MODULES.md` #4). Excepciones: KPIs marcados como informativos, no de seguimiento activo (concepto a definir si se prioriza). Impacto: reduce sorpresas al cierre de periodo.

## 4. Contenido

**R4.1 — Sin publicación sin aprobación** *[FUTURO]*
Objetivo: que contenido generado por IA o por un colaborador no se considere listo sin revisión. Condición: contenido en estado "borrador". Acción: bloquea que la actividad se marque "completada" hasta aprobación explícita (regla nueva, requiere el módulo Contenido construido primero). Excepciones: empresas que desactiven el flujo de aprobación (configuración por empresa, futuro). Impacto: control de calidad consistente con `05-AI-ECOSYSTEM.md` §1.

## 5. Actividades

**R5.1 — Campos protegidos para el colaborador** *[EXISTE]*
Objetivo: que un colaborador edite lo operativo (título/canal/fecha) sin poder alterar asignación, empresa, campaña, avance o estado por esa vía. Condición: `my_role() = 'collaborator'`. Acción: trigger `lock_campos_actividad_colaborador` fuerza esos campos a su valor anterior. Excepciones: ninguna. Impacto: seguridad de integridad de datos sin necesitar una política de columna separada.

**R5.2 — Borrado es siempre suave** *[EXISTE, `v16`]*
Objetivo: nunca perder una actividad de forma irreversible desde la interfaz. Condición: cualquier "eliminar" desde `empresa.html`. Acción: `update` de `deleted_at`, nunca `delete` físico. Excepciones: `super_admin` retiene borrado físico vía SQL Editor, no expuesto en UI. Impacto: cierra el riesgo de pérdida de datos ya señalado en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §16.

**R5.3 — Estado inicial fijo** *[EXISTE]*
Objetivo: consistencia — toda actividad nace `pendiente`. Condición: `insert` sin `status` explícito. Acción: `default 'pendiente'`. Excepciones: ninguna. Impacto: simplifica el formulario de creación (`FASES-APP.md` Fase 13).

## 6. Reportes

**R6.1 — El reporte nunca recalcula, refleja** *[FUTURO — aplica cuando se construya exportación formal]*
Objetivo: que un reporte exportado coincida siempre con lo que la pantalla ya mostraba. Condición: generación de PDF/CSV. Acción: usa exactamente las mismas consultas que el dashboard en pantalla. Excepciones: ninguna. Impacto: evita que un reporte exportado contradiga lo que el usuario vio en vivo.

## 7. Notificaciones

**R7.1 — Nunca generadas por el cliente directamente** *[EXISTE]*
Objetivo: consistencia de contenido y evitar spam auto-generado. Condición: siempre. Acción: solo triggers de base de datos insertan en `notifications`. Excepciones: ninguna hoy. Impacto: garantiza que el mensaje sea siempre el mismo formato para el mismo tipo de evento.

**R7.2 — Marcado de lectura al abrir el panel** *[EXISTE]*
Objetivo: simplicidad de UX — sin necesidad de marcar una por una. Condición: usuario abre `#panelNotificaciones`. Acción: `update` masivo de `read = true` para ese usuario. Excepciones: ninguna. Impacto: reduce fricción, a costa de no poder "posponer" una notificación individual (aceptado como trade-off).

## 8. Empresas

**R8.1 — Alta exclusiva de `super_admin`** *[EXISTE]*
Objetivo: control de quién puede operar en la plataforma. Condición: creación de una fila en `companies`. Acción: solo `super_admin` tiene permiso de `insert`. Excepciones: ninguna hoy — candidato futuro: autoservicio (`02-ARCHITECTURE` §4). Impacto: previene empresas fantasma/spam en la V1 del producto.

## 9. Usuarios

**R9.1 — Vínculo automático al registrarse** *[EXISTE]*
Objetivo: que nadie tenga que "crear" la cuenta de otra persona manualmente. Condición: registro con un correo que coincide con una invitación pendiente. Acción: trigger vincula automáticamente `profiles.company_id`/`role`. Excepciones: ninguna. Impacto: nadie conoce la contraseña de nadie más, ni siquiera temporalmente (`FASES-APP.md` Fase 4).

**R9.2 — Revocación reversible** *[EXISTE]*
Objetivo: quitar acceso sin destruir el historial de esa persona. Condición: `company_admin`/`super_admin` revoca acceso. Acción: `profiles.active = false`, RLS bloquea acceso a datos sin borrar nada. Excepciones: ninguna. Impacto: reversible con un clic si fue un error.

## 10. Permisos

**R10.1 — RLS es la única fuente de autorización real** *[EXISTE]*
Objetivo: que ningún bug de interfaz comprometa el aislamiento de datos. Condición: siempre. Acción: toda tabla operativa nueva nace con RLS habilitado en el mismo cambio que la crea. Excepciones: ninguna — regla absoluta (`03-ENGINEERING-STANDARDS.md` §16). Impacto: es la regla de mayor severidad de todo el sistema.

## 11. Automatizaciones

**R11.1 — Ninguna automatización interna requiere aprobación por evento** *[EXISTE]*
Objetivo: que triggers como sincronizar progreso o notificar no generen fricción. Condición: evento interno determinista (avance reportado, evidencia subida). Acción: se ejecuta sin intervención. Excepciones: automatizaciones configurables por el usuario (futuro, `06E-AI-MODULES.md` #3) sí requieren activación explícita una vez. Impacto: distingue automatización de plataforma (siempre activa) de automatización de negocio (opt-in).

## 12. Inteligencia Artificial

**R12.1 — Revisión humana obligatoria antes de publicar** *[EXISTE, Calendar Planner]*
Objetivo: ningún dato generado por IA se vuelve real sin confirmación. Condición: cualquier salida de cualquier agente que pueda convertirse en un dato de negocio. Acción: se presenta como propuesta, requiere acción explícita de "publicar"/"aceptar". Excepciones: ninguna — regla más importante de todo el ecosistema de IA (`05-AI-ECOSYSTEM.md` §1, `05C-AI-GOVERNANCE.md` §6). Impacto: es lo que hace que la IA sea segura de usar en un contexto de negocio real.

**R12.2 — Contexto acotado por empresa** *[EXISTE]*
Objetivo: que un agente nunca mezcle datos de dos empresas. Condición: cualquier invocación de cualquier agente. Acción: el contexto enviado al modelo se filtra por `company_id` desde el backend, no se construye del lado del cliente. Excepciones: ninguna. Impacto: extiende el aislamiento multiempresa (R1.1) al dominio de IA.
