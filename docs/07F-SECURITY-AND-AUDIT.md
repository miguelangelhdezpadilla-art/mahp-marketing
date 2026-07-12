# SECURITY AND AUDIT — Seguridad y Auditoría de Datos

> MDS-008, Documento 7 de 10. Cómo se protege cada dato (autorización,
> secretos, integridad) y cómo se audita su acceso y modificación. La
> superficie de seguridad de red/API (OAuth, API keys de terceros, rate
> limiting de tráfico externo) es objeto de MDS-009
> (`08-ENTERPRISE-INTEGRATION-PLATFORM.md`) — este documento cubre
> exclusivamente la capa de datos.
>
> Última actualización: 2026-07-12.

---

## 1. RLS como única frontera de autorización real

Principio ya establecido y no negociable (`PROJECT-BLUEPRINT.md` §5, principio 1): **ninguna regla de "quién puede ver o escribir qué" vive solo en el cliente.** El frontend puede tener bugs de interfaz (un botón visible que no debería estarlo) sin que eso comprometa datos de otra empresa o de otro rol — porque la base de datos, no la pantalla, es quien decide.

Cada tabla operativa tiene `relrowsecurity = true` desde su creación, con al menos una política por comando (`select`/`insert`/`update`/`delete`) explícita — nunca una tabla operativa sin RLS "porque es interna".

## 2. Identidad: funciones `security definer`

`my_role()` y `my_company_id()` (`DATABASE.md` §1) resuelven identidad leyendo `profiles` con los privilegios del dueño de la función, no del rol invocador — así un `collaborator`, cuya propia política de `select` sobre `profiles` podría ser restrictiva, puede seguir resolviendo su propio rol sin quedar atrapado en un ciclo de autorización. Es el único uso legítimo de `security definer` para lectura en el sistema.

Para escritura, `security definer` se reserva a: (a) triggers que escriben datos derivados que el rol invocador no podría escribir directo (`award_*`, `notify_*`, `sync_activity_progress`), y (b) funciones RPC que existen específicamente para sortear el problema documentado en `07C-DATABASE-STANDARDS.md` §7 (`soft_delete_actividades()`). Nunca se usa como atajo genérico para "que funcione sin pelear con RLS" — cada uso está justificado por un motivo específico y documentado.

## 3. Privilegios a nivel de columna

Por debajo de RLS existe una segunda capa, más granular y menos visible: los `GRANT`/`REVOKE` por columna (`information_schema.column_privileges`). Verificado en producción el 2026-07-12 durante el diagnóstico del bug de `v18`: todas las columnas de `actividades` tienen `SELECT`/`INSERT`/`UPDATE`/`REFERENCES` concedidos a `authenticated` (y, históricamente, también a `anon`) — es decir, **hoy esta capa no restringe nada más allá de lo que ya restringe RLS**. Se documenta explícitamente para que quede claro que es una capa real del sistema (y una fuente de error distinta — un error de privilegio de columna produce "permission denied for column X", no "violates row-level security policy", son diagnósticos distintos), no para proponer usarla activamente todavía.

**[FUTURO]**: revocar privilegios de columna específicos a `anon` donde no haya necesidad de que un usuario no autenticado siquiera intente la operación (defensa en profundidad) — no es urgente porque RLS ya bloquea correctamente, pero reduce superficie de ataque.

## 4. Secretos

Ninguna API key, token o contraseña se escribe en un archivo del repositorio ni en código que corre en el navegador — regla ya vigente y con precedente real de incidente corregido (`CLAUDE.md` §5: la clave de Groq expuesta en `js/shared/ia.js`, movida a secreto de Edge Function). Aplicado a datos: significa que ninguna tabla almacena un secreto de terceros en texto plano accesible por RLS normal — hoy no existe tal dato (MAHP no guarda credenciales de servicios externos en base de datos todavía), y cuando MDS-009 lo requiera (tokens de integración con Meta/Google/etc.), la decisión de diseño ya está anticipada aquí: esos tokens deben vivir cifrados o en un almacén de secretos dedicado, nunca en una columna de texto plano con RLS como única protección.

## 5. Auditoría

Ver `07B-DATA-GOVERNANCE.md` §6 para la política. Complemento técnico: `audit_log` se llena exclusivamente vía trigger `security definer`, nunca por `insert` directo del cliente — un `company_admin` no puede fabricar un evento de auditoría falso ni borrar uno real (no existe política de `update`/`delete` para esa tabla).

**Cobertura actual vs. objetivo:**

| Evento | Cubierto hoy |
|---|---|
| Empresa creada/desactivada | ✅ |
| Invitación creada/cancelada | ✅ |
| Acceso revocado/restaurado | ✅ |
| Actividad creada/editada/eliminada | ❌ [FUTURO] — reconstruible indirectamente vía `activity_updates`/timestamps, no registrado explícitamente |
| Cambio de rol de un usuario | ❌ [FUTURO] |
| Acceso de `super_admin` a datos de una empresa (impersonación) | ❌ [FUTURO] — riesgo de gobierno real: hoy no queda registro de qué empresa vio un `super_admin` y cuándo |

El último punto (impersonación sin auditoría) es el hallazgo de seguridad más relevante de este documento: `super_admin` puede ver/operar el panel de cualquier empresa vía `?company_id=`, y esa acción no genera hoy ninguna fila en `audit_log`. Se reporta como riesgo en el Entregable Final de `07-ENTERPRISE-DATA-PLATFORM.md`.

## 6. Rotación de credenciales

Aplica a nivel de plataforma (Supabase), no de datos de negocio: rotación de claves de servicio (`service_role`), tokens de acceso personal de Management API, y secretos de Edge Functions. **Práctica ya validada en esta misma fase de trabajo**: para el diagnóstico del bug de `v18`, se usó un token de acceso personal de Supabase, explícitamente autorizado por el usuario para esa tarea puntual, y revocado inmediatamente después de terminar (`CLAUDE.md` §4, excepción documentada). Este es el estándar formal: cualquier credencial de alto privilegio usada fuera del flujo normal de la aplicación es de un solo uso, con alcance explícito y revocación inmediata — nunca una credencial de larga duración compartida por conveniencia.

## 7. Protección contra abuso

No existe hoy rate limiting propio a nivel de datos — MAHP depende del rate limiting de plataforma que Supabase ya provee (PostgREST, Auth). No hay un patrón de abuso identificado en producción que lo requiera todavía. **[FUTURO]**: si el Marketplace o las integraciones (MDS-009) exponen escritura desde sistemas externos, esa superficie sí necesitará límites propios — no aplica a la app autenticada actual, donde cada escritura ya pasa por una sesión de usuario real.

## 8. Cifrado

En tránsito: TLS end-to-end (Supabase/GitHub Pages), no configurable ni gestionado por la aplicación. En reposo: gestionado por Supabase (cifrado de disco a nivel de infraestructura), fuera del control directo de MAHP. No hay hoy ningún dato cifrado a nivel de aplicación (columna cifrada con clave propia) — no ha sido necesario porque no se almacena información de esa sensibilidad (`07B-DATA-GOVERNANCE.md` §11).

---

## Checklist de seguridad de datos — para todo cambio de esquema

- [ ] ¿La tabla nueva tiene RLS activado desde su creación, no agregado después?
- [ ] ¿La política de `select` está definida antes que las demás?
- [ ] ¿Alguna función `security definer` nueva tiene un motivo específico documentado, no es un atajo genérico?
- [ ] ¿El evento merece una fila en `audit_log`? Si la respuesta es "no está claro", tratarlo como si fuera "sí" y agregarlo.
- [ ] ¿Algún dato nuevo es un secreto de terceros? Si sí, ¿está diseñado para no vivir en texto plano?
