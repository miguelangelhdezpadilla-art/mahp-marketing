# SECURITY — Seguridad de la Plataforma de Integración

> MDS-009, Documento 6 de 10. OAuth, JWT, API keys, scopes, roles, permisos,
> auditoría, logs, rotación de credenciales, cifrado, protección contra
> abuso y rate limiting — la capa de seguridad específica de API e
> integraciones. Complementa, no repite, `07F-SECURITY-AND-AUDIT.md`
> (seguridad de datos en general) — este documento cubre específicamente la
> frontera con sistemas externos.
>
> Última actualización: 2026-07-12.

---

## 1. JWT — ya vigente, sin cambios de diseño

MAHP ya usa JWT para toda sesión autenticada (Supabase Auth), verificado explícitamente por cada Edge Function antes de procesar cualquier trabajo (`API.md` §4, punto 2). Este estándar no cambia para la plataforma de integración — toda Edge Function nueva (adaptadores, webhooks salientes activados por acción de usuario) sigue exigiendo y validando el JWT de sesión exactamente igual que `generar-calendario` hoy.

## 2. OAuth — para integraciones salientes con proveedores externos

**[FUTURO]**. Cuando MAHP se conecta a Meta/Google/etc. en nombre de una empresa cliente (`08C-INTEGRATIONS-CATALOG.md`), el flujo es OAuth 2.0 estándar del lado del proveedor externo, no un esquema propio de MAHP:

```
company_admin inicia conexión
        │
        ▼
Redirección al proveedor (Meta/Google/...) con scope mínimo necesario
        │
        ▼
Proveedor redirige de vuelta con código de autorización
        │
        ▼
Edge Function intercambia código por access_token + refresh_token
        │
        ▼
Tokens cifrados, guardados en integration_tokens (company_id, provider)
        │  RLS: solo esa empresa y super_admin pueden ver que existe la conexión
        │       (nunca el token en sí, ni siquiera para company_admin — ver §5)
        ▼
Adaptador usa el token en llamadas futuras, lo refresca cuando expira
```

**Principio de scope mínimo**: cada integración solicita exclusivamente los permisos que necesita (ej. `drive.file`, no acceso completo a Drive — ya señalado en `08C-INTEGRATIONS-CATALOG.md`, Google Drive). Nunca se solicita un scope amplio "por si acaso se necesita después".

## 3. API Keys — para la API pública

**[FUTURO]**. Tabla `api_keys` (`company_id`, `key_hash`, `scopes` (array), `created_by`, `last_used_at`, `revoked_at`) — mismo patrón de soft delete/revocación que el resto del sistema (`revoked_at`, no borrado físico, consistente con `07D-DATA-LIFECYCLE.md` §7). El valor real del key se muestra **una sola vez** al generarse (patrón estándar de la industria) y solo se almacena su hash — ni siquiera `super_admin` puede recuperarlo después, solo revocarlo y generar uno nuevo.

**Scopes propuestos** (mínimo viable, se amplían solo con necesidad real):

| Scope | Permite |
|---|---|
| `read:actividades` | Leer actividades de la empresa del key |
| `read:kpis` | Leer KPIs de la empresa del key |
| `write:actividades` | Crear actividades (nunca editar/eliminar vía API pública en la primera versión) |
| `webhooks:manage` | Configurar endpoints de webhook (`08B-WEBHOOKS.md`) |

Un `api_key` nunca puede ver u operar más de lo que el rol que lo generó podría ver como usuario humano — mismo límite exacto de RLS (`06F-INTEGRATIONS.md` §5, principio ya fijado ahí), verificado técnicamente porque el `api_key` se resuelve, del lado de Postgres, al mismo `company_id` y a un rol equivalente restringido, no a un bypass de RLS.

## 4. Roles y permisos para integraciones

No se crea un sistema de roles paralelo para integraciones — se mapean a los 4 roles existentes (`PROJECT-BLUEPRINT.md` §4): un `api_key` generado por `company_admin` puede tener scopes de escritura; uno generado en un contexto de solo-lectura (futuro, si `director` pudiera generar keys) quedaría limitado a scopes `read:*`. La decisión de qué roles pueden generar keys es de negocio, no técnica, y no se resuelve en este documento — se señala como decisión pendiente.

## 5. Auditoría de integraciones

Todo evento de integración es candidato obligatorio para `audit_log` (extendiendo el gap ya señalado en `07F-SECURITY-AND-AUDIT.md` §5): conexión OAuth creada/revocada, `api_key` generado/revocado, primer uso de un `api_key` nuevo. Un token de integración comprometido es, en impacto, equivalente a una cuenta de usuario comprometida — merece el mismo nivel de trazabilidad.

## 6. Logs

Toda llamada a la API pública (cuando exista) se registra con: `api_key` usado (por su id, no su valor), endpoint, código de respuesta, timestamp — no el payload completo por defecto (para no almacenar datos de negocio duplicados innecesariamente, `07B-DATA-GOVERNANCE.md` §3), salvo en caso de error, donde sí vale la pena para diagnóstico.

## 7. Rotación de credenciales

- **Tokens OAuth de proveedores externos**: rotación automática vía `refresh_token`, transparente para el usuario — si el `refresh_token` también expira o se revoca del lado del proveedor, se notifica al `company_admin` (`06F-INTEGRATIONS.md` §1, ya señalado).
- **`api_keys` de MAHP**: rotación manual, iniciada por el `company_admin` — generar uno nuevo y revocar el anterior; sin expiración automática forzada en la primera versión (se puede agregar después sin romper compatibilidad, es aditivo).
- **Credenciales internas de alto privilegio** (tokens de Management API, `service_role`): mismo estándar ya practicado en esta misma fase de trabajo — de un solo uso, alcance explícito, revocación inmediata (`07F-SECURITY-AND-AUDIT.md` §6).

## 8. Cifrado

`integration_tokens.access_token`/`refresh_token` se almacenan cifrados, no en texto plano — es el único caso en todo el sistema donde un dato dentro de una tabla normal (protegida por RLS) requiere una capa adicional de cifrado a nivel de aplicación, porque el valor en sí (no solo el acceso a la fila) es lo sensible: alguien con acceso legítimo de lectura a la fila (ej. `super_admin` en labores de soporte) no debería poder leer el token en texto plano sin una razón operativa explícita que pase por un mecanismo distinto al `select` normal.

## 9. Protección contra abuso y rate limiting

Ver `08A-API-STANDARDS.md` §9 para el estándar general. Aplicado específicamente a seguridad: un `api_key` con actividad anómala (volumen fuera de lo esperado para su plan/uso histórico) debe poder suspenderse automáticamente **[FUTURO]**, con notificación al `company_admin`, antes de que se vuelva un problema de disponibilidad para el resto de la plataforma — mismo principio de "un cliente ballena no debe afectar a los demás" ya aplicado en `07-ENTERPRISE-DATA-PLATFORM.md` §8 a nivel de datos, ahora a nivel de tráfico de API.

---

## Checklist de seguridad — específico de integraciones

- [ ] ¿El scope de OAuth/API key solicitado es el mínimo necesario, no "por si acaso"?
- [ ] ¿El token/credencial se guarda cifrado, nunca en texto plano ni en log?
- [ ] ¿Existe registro en `audit_log` para la conexión/desconexión?
- [ ] ¿Un token vencido falla de forma visible (notificación), no en silencio?
- [ ] ¿El `api_key`/token está limitado exactamente al mismo alcance de RLS que tendría el usuario que lo generó?
- [ ] ¿Hay un plan de rotación/revocación, aunque sea manual en la primera versión?
