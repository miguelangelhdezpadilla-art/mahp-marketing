# ENTERPRISE DATA PLATFORM — Plataforma Empresarial de Datos de MAHP

> MDS-008, Documento principal (1 de 10). Estrategia completa de gestión de
> datos: cómo se crean, almacenan, protegen, relacionan, auditan y evolucionan
> los datos de MAHP durante todo su ciclo de vida — no solo el listado de
> tablas (eso vive, verificado línea por línea contra el esquema real, en
> `DATABASE.md`).
>
> **Convención de estado, igual que en `06-PRODUCT-BLUEPRINT.md`**:
> **[EXISTE]** = construido y verificado contra `DATABASE.md`/el código real.
> **[FUTURO]** = diseño, no implementado. **[PARCIAL]** = existe una versión
> reducida de lo descrito. Ningún dominio ni entidad se presenta como
> construido si no lo está (`CLAUDE.md` §2).
>
> Última actualización: 2026-07-12.

---

## 1. Filosofía de Datos

MAHP tiene una sola fuente de verdad por empresa, no una por módulo. Un dato no se duplica entre pantallas — se lee desde el mismo origen (una actividad generada por IA vive en la misma tabla `actividades`, con las mismas reglas, que una creada a mano; ver `PROJECT-BLUEPRINT.md` §4). La plataforma de datos existe para que esa promesa siga siendo cierta cuando MAHP pase de decenas a miles de empresas: **los datos son un activo de la empresa cliente, no del proveedor** — MAHP los custodia, los aísla y los hace auditables, pero nunca los mezcla entre clientes ni los usa fuera del contexto para el que se generaron.

Tres verdades gobiernan cada decisión de este documento:

1. **El dato correcto en el lugar correcto vale más que el dato completo en cualquier lugar.** MAHP no intenta capturar todo lo capturable — captura lo que un rol necesita para decidir o actuar (`06-PRODUCT-BLUEPRINT.md` §1).
2. **Ningún dato operativo existe sin dueño y sin empresa.** Todo registro de negocio lleva `company_id` y, donde aplica, un `created_by`/`uploaded_by`/`reported_by` — la trazabilidad no es opcional (ver §7).
3. **El historial es un producto, no un subproducto.** Las tablas de bitácora (`activity_updates`, `points_log`, `audit_log`, `follower_logs`) están diseñadas `append-only` desde el día uno — no como una mejora futura de auditoría (`DATABASE.md` §1).

## 2. Arquitectura General de Datos

```
                    ┌───────────────────────────────────────┐
                    │        POSTGRESQL (Supabase)            │
                    │   única base de datos, un solo cluster   │
                    └───────────────────┬───────────────────┘
                                          │
              ┌───────────────┬───────────┴───────────┬───────────────┐
              ▼                ▼                        ▼               ▼
        AISLAMIENTO         SEGURIDAD                HISTORIAL      VISTAS DE
        MULTI-TENANT          (RLS)                (append-only)   AGREGACIÓN
        company_id en      my_role() /              activity_       points_totals,
        cada tabla         my_company_id()           updates,        follower_totals,
        operativa          security definer          points_log,     follower_goals_
        (§6, `07H`)        (§9, `07F`)                audit_log,      progress...
                                                       follower_logs   (materializadas
                                                       (§7)            solo por consulta,
                                                                       no por refresh —
                                                                       ver `07C` §5)
```

No existe capa de datos separada del backend de aplicación: Postgres **es** la plataforma de datos (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §9). No hay data warehouse, ni ETL, ni réplica analítica — decisión deliberada de simplicidad (`PROJECT-BLUEPRINT.md` §5, principio 5), no una limitación no reconocida. Cuándo esto deja de alcanzar se trata en §8 y en `07I`.

## 3. Principios de Diseño

Heredados de `PROJECT-BLUEPRINT.md` §5 y hechos específicos a datos:

1. **Seguridad a nivel de fila, no de consulta.** Ninguna tabla operativa confía en que el cliente agregue `.eq('company_id', ...)` — RLS lo exige siempre (`07F`).
2. **Un dato tiene un solo dueño de escritura.** `actividades.progress_pct`/`status` los escribe únicamente el trigger `sync_activity_progress()`, nunca el cliente directo — el mismo patrón se repite en gamificación y notificaciones (`DATABASE.md` §4, §6, §7).
3. **Borrar es casi siempre marcar, no destruir.** El borrado físico existe pero está reservado a `super_admin` vía SQL Editor, nunca expuesto en la interfaz (`07D`).
4. **Toda relación ambigua se declara explícita.** Dos columnas `uuid references profiles(id)` en la misma tabla (`activity_updates.user_id`/`authorized_by`) se referencian siempre por nombre (`profiles!user_id(...)`) — ya causó una falla real en producción cuando no se hizo (`DATABASE.md` §4).
5. **El esquema se versiona por archivo, no por herramienta de migración.** `supabase_schema_vN.sql` en orden estricto es la fuente de verdad del historial de cambios (`07C`).
6. **Ningún dato nuevo se diseña sin decidir primero quién lo puede leer.** La pregunta "¿quién ve esto?" se responde antes de `CREATE TABLE`, no después.

## 4. Modelo de Dominios

Catálogo completo en `07A-DOMAIN-MODEL.md`. Resumen:

| Dominio | Estado | Tablas/entidades reales | Documento |
|---|---|---|---|
| Core | [EXISTE] | `companies`, `profiles`, `invites`, `audit_log` | `07A` §1–4 |
| Marketing | [EXISTE] | `campaigns`, `actividades`, `strategies` | `07A` §5–7 |
| Seguidores / Redes | [EXISTE], no versionado | `social_channels`, `follower_logs`, `follower_goals` + 3 vistas | `07A` §8 |
| Operaciones | [EXISTE] | `activity_updates`, `evidencias` | `07A` §9–10 |
| Analytics / KPIs | [EXISTE] | `kpis` + vistas de agregación | `07A` §11 |
| Gamificación | [EXISTE] | `points_log` + 2 vistas | `07A` §12 |
| Sistema | [EXISTE] | `notifications` | `07A` §13 |
| Inteligencia Artificial | [PARCIAL] | sin tablas propias hoy — consume dominios existentes vía Edge Function (`IA.md`) | `07A` §14 |
| Configuración | [FUTURO] | sin tabla dedicada — ajustes repartidos hoy en `companies`/`profiles` | `07A` §15 |
| Integraciones | [FUTURO] | sin tablas — diseño en `08-ENTERPRISE-INTEGRATION-PLATFORM.md` (MDS-009) | `07A` §16 |
| Marketplace | [FUTURO] | sin tablas | `07A` §17 |
| Franquicias / Sucursales | [FUTURO] | bloqueado — decisión de modelo no tomada (`companies.parent_company_id` vs. tabla `branches`) | `07A` §18 |
| Operaciones de negocio (CRM/Inventario/Ventas/Finanzas/RH) | [FUTURO] | fuera de alcance actual, ver `06J-FUTURE-MODULES.md` | `07A` §19 |

## 5. Flujo General de Información

```
Usuario/IA genera un dato
        │
        ▼
Cliente (JS) llama a Supabase con su sesión autenticada
        │
        ▼
PostgREST resuelve el JWT → auth.uid() disponible
        │
        ▼
RLS evalúa my_role()/my_company_id() contra la política de la tabla   ──✗──▶ rechazado (42501)
        │ ✓
        ▼
INSERT/UPDATE aplicado
        │
        ▼
Triggers reaccionan (sync de progreso, puntos, notificaciones, auditoría)
        │
        ▼
El dato es legible de inmediato por quien tenga RLS de lectura — sin caché intermedia, sin ETL
```

No existe una etapa de "procesamiento" entre la escritura y la disponibilidad del dato — es lectura consistente inmediata (Postgres transaccional), no eventual. Esto simplifica el modelo pero es también el límite de escala reconocido en §8.

## 6. Estrategia Multiempresa

Desarrollo completo en `07H-MULTI-TENANT-DESIGN.md`. Resumen: aislamiento **por columna** (`company_id`), no por schema ni por base de datos separada — una sola instancia de Postgres sirve a todas las empresas, y la frontera real es RLS, nunca el cliente (`DATABASE.md` §1). `super_admin` es la única identidad sin esa restricción, de forma explícita y auditada, no por omisión (`PROJECT-BLUEPRINT.md` §5, principio 2).

## 7. Gobierno de Datos

Desarrollo completo en `07B-DATA-GOVERNANCE.md`. Resumen de propiedad por dominio:

| Quién escribe | Qué garantiza |
|---|---|
| Cliente (vía RLS) | Datos operativos directos: actividades, campañas, evidencias, avances |
| Triggers (`security definer`) | Datos derivados: progreso sincronizado, puntos, notificaciones, auditoría — nunca editables por el cliente |
| Solo `super_admin` (SQL Editor) | Borrado físico, correcciones estructurales, purga real |

## 8. Escalabilidad

MAHP hoy escala verticalmente sobre un único Postgres gestionado por Supabase — válido para el volumen actual (decenas de empresas). La estrategia hacia miles de empresas y millones de registros no requiere cambiar el modelo de aislamiento (`company_id` + RLS ya es la estrategia correcta para multi-tenancy a esa escala, es el patrón usado por SaaS mucho más grandes), pero sí requiere decisiones que hoy son **[FUTURO]**, no urgentes:

- Índices compuestos con `company_id` como primera columna en las tablas de mayor volumen (`actividades`, `activity_updates`, `points_log`) — hoy no auditados formalmente.
- Particionamiento de tablas `append-only` por fecha si el volumen de `activity_updates`/`points_log`/`audit_log` lo justifica.
- Vistas materializadas (con refresh programado) para las agregaciones de seguidores/puntos si las vistas actuales (calculadas al vuelo) dejan de responder rápido con más datos.
- Separación física de un cliente "ballena" (una sola empresa con volumen desproporcionado) a su propio proyecto Supabase, si algún cliente individual satura recursos compartidos — el modelo de datos ya lo permite sin cambios, porque el aislamiento es total desde el día uno.

Ninguna de estas decisiones es necesaria hoy — se documentan para que no se improvisen bajo presión cuando sí lo sean.

## 9. Seguridad

Desarrollo completo en `07F-SECURITY-AND-AUDIT.md`. RLS es la única frontera de autorización real (`PROJECT-BLUEPRINT.md` §5, principio 1) — nunca la interfaz. Funciones `security definer` (`my_role()`, `my_company_id()`) permiten resolver identidad sin quedar atrapadas en su propia regla de seguridad. Lección operativa reciente incorporada a este documento: **una política de `UPDATE` no basta por sí sola** — Postgres exige que la fila resultante siga satisfaciendo las políticas de `SELECT` aplicables, lo que en `v16` bloqueó silenciosamente el soft delete para todos los roles hasta corregirse en `v18` con una función `security definer` dedicada (`DATABASE.md` §2). Este hallazgo se documenta como estándar de diseño en `07C-DATABASE-STANDARDS.md` §7, no solo como nota histórica.

## 10. Preparación para IA

Desarrollo completo en `07A-DOMAIN-MODEL.md` §14 y cruce directo con `05-AI-ECOSYSTEM.md`. Hoy los agentes de IA (Groq vía Edge Function) consumen datos existentes por lectura puntual (contexto de formulario) y escriben únicamente a través del mismo camino que un humano — nunca con permisos elevados (`IA.md` §4). No existe todavía memoria persistente de IA, base de conocimiento, ni búsqueda semántica — son capacidades **[FUTURO]** que este documento prepara arquitectónicamente sin implementarlas (ver `07A` §14 para el detalle de qué tabla/estructura tendría sentido cuando se construyan).

## 11. Observabilidad

Desarrollo completo en `07F-SECURITY-AND-AUDIT.md` §5. Hoy la observabilidad de datos es la que ya existe operativamente: `audit_log` (eventos administrativos), los triggers de gamificación/notificaciones como bitácora implícita, y los logs de Supabase (Postgres + Edge Functions) fuera del alcance del cliente. No existe un panel de observabilidad de datos dedicado (métricas de calidad, latencia de escritura, tasa de error de RLS) — **[FUTURO]**, catalogado con KPIs propuestos en §12 de este documento y en `07I-DATA-QUALITY.md`.

## 12. Estrategia de Evolución

| Horizonte | Qué se agrega | Depende de |
|---|---|---|
| Ahora → V2 | Cerrar el hueco de versionado de `social_channels`/`follower_logs`/`follower_goals` (`DATABASE.md` §9) | Sesión con SQL Editor a mano, ya señalada como pendiente |
| V2 | Tabla `branches` o `companies.parent_company_id` (desbloquea Franquicias) | Decisión de modelo, no tomada — ver `07A` §18 |
| V2–V3 | Estructura de datos para integraciones (MDS-009, este documento es su dependencia) | `08-ENTERPRISE-INTEGRATION-PLATFORM.md` |
| V3 | Memoria de IA / base de conocimiento / embeddings | Volumen de uso real de IA que lo justifique — no antes |
| V3+ | Particionamiento / vistas materializadas si el volumen lo exige | Métricas reales de `07I`, no proyección |

---

## Diagramas

**Ciclo de vida de un dato operativo** (detalle completo en `07D`):

```
Creación → Validación (RLS + constraints) → Uso (lectura por rol) → Actualización
    → (opcional) Versionado en tabla de historial → Archivado lógico (deleted_at)
    → Recuperación (si aplica) → Eliminación definitiva (solo super_admin, SQL Editor)
```

**Frontera de auditoría por dominio:**

```
Dominios con historial append-only:          Dominios sin historial dedicado (solo estado actual):
  activity_updates  (avances)                   companies, profiles, invites
  points_log        (gamificación)               campaigns, kpis
  audit_log         (administración)             evidencias (solo soft delete)
  follower_logs     (seguidores)                 notifications, strategies
```

---

## Checklist — validar cualquier cambio relacionado con datos

- [ ] ¿La tabla/columna nueva tiene `company_id` (o hereda aislamiento vía FK a una tabla que sí lo tiene)?
- [ ] ¿Se definió la política RLS de `select` antes que cualquier otra?
- [ ] ¿Alguna política de `update`/`insert` sobre una tabla con `deleted_at` (o cualquier columna que la política de `select` filtre) fue probada contra el problema documentado en `DATABASE.md` §2 (`v18`)?
- [ ] ¿Existe más de una FK hacia la misma tabla? Si sí, ¿todo `.select()` futuro fijará la relación explícitamente?
- [ ] ¿Quién escribe cada columna está documentado (cliente directo vs. trigger `security definer`)?
- [ ] ¿El dato requiere historial append-only, o basta con estado actual?
- [ ] ¿Se agregó/actualizó `supabase_schema_vN.sql` con el siguiente número disponible?
- [ ] ¿`DATABASE.md` y `07E-ENTITY-CATALOG.md` quedaron actualizados en el mismo cambio?

---

## Definition of Done

✓ Plataforma Empresarial de Datos completamente documentada (este documento + 9 anexos).
✓ Dominios definidos con objetivo, propietario, datos principales, dependencias, eventos, relaciones (`07A`).
✓ Políticas oficiales de gobierno de datos (`07B`).
✓ Catálogo de entidades verificado contra el esquema real (`07E`).
✓ Estándares de calidad y seguridad (`07F`, `07I`).
✓ Diagramas arquitectónicos (este documento, `07A`, `07D`, `07H`).
✓ Estrategia preparada para IA y crecimiento futuro (§10, §8, `07A` §14).

---

## Entregable Final

**1. Resumen de la arquitectura propuesta**: un único Postgres (Supabase) como plataforma de datos, sin capa analítica separada; aislamiento multiempresa por `company_id` + RLS como frontera real de seguridad; historial append-only donde la trazabilidad importa; borrado por defecto lógico, físico solo por `super_admin`. Es la misma arquitectura que ya opera en producción, documentada formalmente y con su evolución explícita hacia franquicias, integraciones e IA.

**2. Dominios más críticos para el MVP**: Core (sin él nada opera) y Marketing (`actividades`/`campaigns`) — ya construidos y en producción. Seguidores/Redes y Gamificación son diferenciadores ya construidos pero secundarios al MVP funcional. Analytics/KPIs es [EXISTE] pero con vistas menos maduras (`06D-ANALYTICS-MODULES.md`).

**3. Cómo soporta crecer de decenas a miles de empresas**: el modelo de aislamiento no cambia con la escala — `company_id` + RLS es el mismo patrón a 10 o a 10,000 empresas. Lo que cambia son decisiones de rendimiento (índices, particionamiento, vistas materializadas — §8), no de arquitectura. El riesgo real de escala no es el modelo de datos, es la ausencia hoy de observabilidad de datos (§11) para saber *cuándo* esas decisiones se vuelven necesarias.

**4. Riesgos identificados**:
- **Calidad**: `social_channels`/`follower_logs`/`follower_goals` no están versionadas en `.sql` — riesgo de que una futura sesión de SQL Editor las modifique sin dejar rastro (`DATABASE.md` §9, ya señalado como pendiente).
- **Seguridad**: el patrón de bug encontrado en `v16`/corregido en `v18` (política de `UPDATE` bloqueada por política de `SELECT`) puede repetirse en cualquier tabla nueva con `deleted_at` u otro filtro de visibilidad — mitigado documentando el patrón como estándar en `07C` §7, pero requiere disciplina de revisión, no solo documentación.
- **Escalabilidad**: sin métricas de observabilidad de datos hoy, no hay forma de detectar con anticipación cuándo el modelo actual (consulta directa, sin caché ni vistas materializadas) deja de responder — riesgo de descubrirlo reactivamente.
- **Gobernanza**: no existe hoy un dueño de datos formal por dominio más allá de "quién lo construyó" — aceptable al tamaño actual del equipo, no lo será con más colaboradores en el proyecto.

**5. Hoja de ruta propuesta**: ver §12 de este documento.

**6. Verificación de coherencia con MDS-001 a MDS-007**: revisada explícitamente contra `PROJECT-BLUEPRINT.md`, `DATABASE.md`, `04-DESIGN-SYSTEM.md`, `05-AI-ECOSYSTEM.md` y `06-PRODUCT-BLUEPRINT.md` (+ sus anexos). **Una inconsistencia preexistente detectada, no introducida por este documento**: `PROJECT-BLUEPRINT.md` (MDS-001/002) no se actualizó cuando se crearon los documentos `04-*`, `05-*` y `06-*` (MDS-005/006/007) — su índice y su tabla "Documentos relacionados" siguen reflejando el estado de MDS-002/003, sin referenciar Diseño, IA ni Producto como capítulos numerados. Se reporta aquí sin corregirla, porque corregir el índice maestro de `PROJECT-BLUEPRINT.md` está fuera del alcance declarado de MDS-008 (que solo agrega `07-*`) y requiere una decisión de numeración de capítulos que le corresponde al dueño del documento.

**No se implementó ningún cambio de código, SQL ni de producto en esta fase — solo documentación, conforme a las reglas de MDS-008.**
