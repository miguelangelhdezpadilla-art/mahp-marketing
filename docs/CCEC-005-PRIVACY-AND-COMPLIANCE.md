# CCEC-005 — PRIVACY AND COMPLIANCE PLATFORM

> Capacidad Compartida (CCEC) — cómo MAHP maneja datos de **terceros**
> (clientes finales de la empresa cliente, no usuarios de MAHP) de forma
> responsable. Origen: riesgo identificado en
> `MEM-002-001-SOCIAL-AI-HUB-VISION.md` §12 — Social AI Hub sería el
> primer módulo de MAHP en capturar datos de personas que nunca se
> registraron en MAHP (mensajes, nombres, números de contacto de clientes
> finales vía Meta Graph API) — pero el marco de manejo de esos datos no
> es exclusivo de ese módulo, por eso es una CCEC y no una sección de
> `MEM-002-001`.
>
> **Advertencia explícita, no negociable (`CLAUDE.md` §6)**: este
> documento define principios técnicos y de proceso. **No contiene, y no
> debe usarse como, texto legal real** (aviso de privacidad, política de
> privacidad publicable, contrato). Todo texto legal real requiere
> redacción y revisión de un abogado antes de publicarse o de que MAHP
> capture el primer dato real de un tercero.
>
> Última actualización: 2026-07-12.

---

## 1. Por qué esto es una CCEC y no parte de `MEM-002-001`

Hasta ahora, todo dato que maneja MAHP pertenece a alguien con cuenta en el sistema (`profiles`, `07E-ENTITY-CATALOG.md`) — el aislamiento multiempresa (`07H-MULTI-TENANT-DESIGN.md`) protege datos *entre* empresas, pero toda la gobernanza de datos existente (`07B-DATA-GOVERNANCE.md`) asume que el sujeto del dato es un usuario de MAHP. Social AI Hub rompe ese supuesto: una conversación de WhatsApp/Meta contiene datos de una persona que **nunca aceptó nada de MAHP directamente** — es cliente de la empresa cliente, no de MAHP. Cualquier módulo futuro con el mismo patrón (integración de correo, CRM, formularios públicos) tendría la misma necesidad — por eso es una capacidad compartida, no una sección de un solo módulo.

## 2. Alcance

Aplica a todo dato de una persona que **no tiene cuenta en MAHP** pero cuya información MAHP procesa en nombre de una empresa cliente — hoy, exclusivamente proyectado para Social AI Hub (`MEM-002-001`); en el futuro, cualquier módulo con el mismo patrón debe evaluarse contra este documento antes de capturar el primer dato real (mismo criterio de integración ya establecido para `CCEC-001`/`CCEC-004`).

**No aplica** a datos de usuarios de MAHP (`profiles`) — esos ya están cubiertos por `07B-DATA-GOVERNANCE.md` y los términos de servicio de MAHP hacia sus propios clientes (empresas), un contrato distinto.

## 3. Principios técnicos (no legales) que debe cumplir cualquier integración con datos de terceros

1. **Minimización de datos**: capturar solo lo que el caso de uso requiere (ej. mensaje + identificador de contacto), no todo lo que la API del proveedor ofrezca por defecto.
2. **Finalidad limitada**: el dato de un cliente final se usa para responder/dar seguimiento a esa conversación y, si la empresa lo activa explícitamente, para métricas agregadas (`CCEC-004A`) — nunca para un propósito distinto sin que la empresa cliente lo sepa.
3. **Aislamiento multiempresa sin excepción**: un dato de cliente final de la Empresa A nunca es visible ni cruzable con datos de la Empresa B — mismo estándar que cualquier otro dato operativo (`07H-MULTI-TENANT-DESIGN.md`), sin relajarse por tratarse de datos de terceros.
4. **Retención distinta a la de MAHP para sus propios usuarios**: mientras que MAHP retiene datos de sus empresas clientes indefinidamente por decisión (`07B-DATA-GOVERNANCE.md` §7), el dato de un cliente final de una conversación **debería** tener una ventana de retención más conservadora — no se fija un número en este documento sin decisión real de negocio informada por la revisión legal (§6).
5. **Derecho de eliminación del sujeto del dato**: a diferencia del soft delete por defecto de MAHP (`ADR-005`, pensado para proteger a la empresa cliente de su propio error), un cliente final podría tener derecho a pedir que su conversación se elimine — un mecanismo distinto, todavía no diseñado en detalle, señalado como prerrequisito de MEM-002-002.
6. **Nunca usar datos de conversación para entrenar modelos de IA de terceros** sin consentimiento explícito y separado — el proveedor de IA (Groq/otro, `ADR-007`) procesa el contenido para generar una respuesta, no para reentrenamiento, salvo que el contrato con ese proveedor lo garantice explícitamente.

## 4. Relación con capacidades ya existentes

| Capacidad existente | Cómo se relaciona |
|---|---|
| `07B-DATA-GOVERNANCE.md` | Gobierno de datos de MAHP en general — este documento es su extensión específica para sujetos sin cuenta en el sistema |
| `CCEC-001` (Auditoría) | Todo acceso a una conversación con datos de un tercero es candidato de evento auditable (`CCEC-001A`) — quién leyó qué conversación, no solo quién la respondió |
| `08E-SECURITY.md` | Credenciales de la integración (token de Meta Graph API) siguen el mismo estándar de cifrado ya definido — este documento no lo redefine |
| `ADR-005` (soft delete por defecto) | No se extiende automáticamente a datos de terceros — ver principio 5, requiere diseño propio |

## 5. Qué NO cubre este documento

- Texto legal real (§ advertencia del encabezado).
- Cumplimiento regulatorio específico por país (GDPR, LFPDPPP, CCPA) — cada uno tiene requisitos distintos; este documento da el marco técnico común, la aplicación legal específica depende de en qué país opere cada empresa cliente y es, de nuevo, trabajo de un abogado, no de este documento.
- Decisión de negocio de cuánto tiempo retener datos de terceros (§3, principio 4) — pendiente de decisión informada.

## 6. Acción requerida antes de MEM-002-002

**No es un ajuste de documentación — es una consulta legal real**, con estas preguntas concretas para el abogado que la atienda:

1. ¿Qué avisos/consentimientos requiere legalmente capturar y responder mensajes de clientes finales vía Meta Graph API, en los países donde opere la primera empresa cliente que use Social AI Hub?
2. ¿Qué ventana de retención de esos datos es razonable/exigida legalmente?
3. ¿Qué mecanismo de eliminación a solicitud del cliente final es obligatorio, y con qué plazo de respuesta?
4. ¿MAHP actúa como "encargado del tratamiento" (procesa datos en nombre de la empresa cliente) o como "responsable" en este flujo — la respuesta cambia qué obligaciones legales aplican directamente a MAHP vs. a la empresa cliente?

---

## Checklist — antes de que cualquier módulo capture su primer dato real de un tercero

- [ ] ¿Se identificó qué dato específico se captura y por qué (principio de minimización)?
- [ ] ¿Se completó la consulta legal de §6 para el módulo y países relevantes?
- [ ] ¿El dato queda aislado por `company_id` sin excepción?
- [ ] ¿Existe (aunque sea manual al inicio) un mecanismo de responder a una solicitud de eliminación del sujeto del dato?
- [ ] ¿El acceso a este dato genera un evento auditable en `CCEC-001A`?

---

## Entregable

**Resumen**: esta CCEC no resuelve el cumplimiento legal — lo hace explícito, lo separa claramente de lo que sí se puede diseñar técnicamente (minimización, aislamiento, auditoría), y fija el punto exacto en el que un abogado real debe intervenir antes de que MAHP procese el primer dato real de un cliente final. Es, deliberadamente, el documento de esta serie con menos respuestas y más preguntas correctas — corresponde al perfil de riesgo real del tema.
