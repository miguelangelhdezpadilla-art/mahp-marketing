# AI ECOSYSTEM — Marketing Activity Hub Pro

> MDS-006, Documento 1 de 6. Estrategia y arquitectura general del
> ecosistema de IA de MAHP. **Estado del sistema real hoy: un solo agente
> implementado** (Calendar Planner, vía Groq + Edge Function `generar-calendario`,
> ver `IA.md`). Todo lo demás en este documento y en `05A`–`05E` es diseño
> futuro, no construido — se marca explícitamente en cada sección para no
> confundir visión con estado actual (mismo criterio que el resto de `/docs`,
> `CLAUDE.md` §2).
>
> Complementa `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §11 (que ya esbozó 8
> especialistas) — este documento y sus 5 acompañantes son el desarrollo
> completo de esa sección, con 24 agentes en vez de 8.
>
> Última actualización: 2026-07-09.

---

## 1. Filosofía de IA

La IA en MAHP existe para **potenciar, nunca reemplazar** — principio ya fundacional (`01-IDENTIDAD-DEL-PRODUCTO.md` §7, principio 3: "la IA debe potenciar a las personas, no reemplazarlas"). Cada agente del ecosistema reduce trabajo repetitivo, propone en vez de decidir, analiza en vez de actuar, y siempre explica el porqué de su recomendación en lenguaje humano (`04-DESIGN-SYSTEM.md` §1). Ningún agente publica un dato real sin que una persona lo confirme primero — la única excepción posible sería un agente puramente analítico de solo-lectura (§8), y aun así su salida es una sugerencia visible, nunca una acción silenciosa.

## 2. Objetivos Estratégicos

1. Reducir el tiempo entre "se decidió una campaña" y "el equipo tiene un plan ejecutable" — ya el objetivo del único agente construido hoy.
2. Detectar proactivamente lo que necesita atención (KPI atrasado, campaña sin actividad reciente) antes de que una persona tenga que buscarlo.
3. Reducir la carga de trabajo creativo repetitivo (copy, formato, primer borrador) sin quitarle a la persona la decisión final.
4. Convertir datos que ya existen en la base de datos en lenguaje humano accionable, sin que nadie tenga que armar un reporte a mano.
5. Mantener el costo y el riesgo de cada llamada a un modelo de IA predecible y auditable (`IA.md` §5).

## 3. Arquitectura General del Ecosistema

```
Usuario (según su rol) ──► Marketing Strategist (orquestador, §5A)
                                   │
              ┌────────────────────┼────────────────────────┐
              ▼                    ▼                         ▼
       Agentes de              Agentes de                Agentes de
       Estrategia/Plan.        Contenido/Creatividad      Análisis/Datos
              │                    │                         │
              └────────────────────┴─────────────┬───────────┘
                                                   ▼
                                    Edge Function(s) por especialidad
                                    (mismo patrón que generar-calendario,
                                     API.md §4 — un adaptador por proveedor,
                                     02-ARCHITECTURE §11)
                                                   │
                                                   ▼
                                     Modelo(s) de IA (Groq / OpenAI /
                                     Anthropic — intercambiable, nunca
                                     acoplado al resto del sistema)
                                                   │
                                                   ▼
                          Resultado ──► revisión humana ──► dato real en MAHP
```

Cada agente es una **función/prompt independiente**, no un modelo entrenado a medida — la especialización viene del prompt, el contexto que recibe (`05E-AI-MEMORY-AND-CONTEXT.md`) y las herramientas/datos a los que tiene acceso (`05A-AI-AGENTS.md`), no de infraestructura de ML propia. Esto mantiene el ecosistema completo dentro del principio de Simplicidad Progresiva (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §2.6) — 24 "agentes" son 24 prompts y contratos de datos bien definidos, no 24 sistemas de software distintos.

## 4. Relación entre IA y Usuarios

La IA se adapta al rol de quien la invoca, nunca al revés — un agente no ofrece una capacidad que el rol del usuario no tendría de todas formas sin IA (`01-IDENTIDAD-DEL-PRODUCTO.md` §7, principio 12: cada rol ve exactamente lo que necesita).

| Rol | Cómo interactúa con la IA |
|---|---|
| `super_admin` | Acceso a todos los agentes, en cualquier empresa que administre — mismo criterio que su acceso a datos (`02-ARCHITECTURE` §4) |
| `company_admin` | Acceso completo a los agentes de su empresa — es quien hoy ya usa Calendar Planner, y quien más se beneficia de Campaign Planner/Content Creator/Automation Expert |
| `director` | Agentes de **solo análisis/lectura** (Business Analyst, KPI Advisor, Data Analyst) — nunca agentes que generan contenido publicable, consistente con su rol de solo-lectura en el resto del sistema (`02-ARCHITECTURE` §5) |
| `collaborator` | Sin acceso directo a agentes en la V1 de este ecosistema (§9) — recibe el resultado ya revisado por su `company_admin`/`director`, no invoca IA por su cuenta. Candidato de expansión futura: un asistente de ejecución (ver `05A` — no incluido en el catálogo inicial de 24 por no tener aún un caso de uso claro) |
| Equipo de Marketing *(uso de `company_admin`, no un rol técnico distinto)* | Foco en agentes de Contenido/Creatividad/Canales (§5A, grupos 2 y 3) |
| Franquiciatario / Consultor / Cliente futuro (agencia) | **[FUTURO]** — dependen de los cambios de modelo de roles ya identificados en `02-ARCHITECTURE` §4/§20 y `04C-UX-GUIDELINES.md` §16; no se diseña su experiencia de IA en detalle hasta que el rol mismo exista |

**Principio de interacción**: todo agente responde en español simple, sin jerga técnica ni de modelo de IA (`04-DESIGN-SYSTEM.md` §1), y toda salida que pueda convertirse en un dato real de MAHP se presenta primero como propuesta claramente marcada (`04C-UX-GUIDELINES.md` §14).

## 5. Relación entre IA y Módulos

| Módulo de MAHP | Cómo colabora la IA hoy / en el diseño futuro |
|---|---|
| **Dashboard** | Business Analyst/KPI Advisor (§5A) resumen el estado en lenguaje humano — hoy el dashboard es solo números, sin narrativa generada |
| **Calendario** | Calendar Planner **[EXISTE]** — genera actividades directamente en `actividades` |
| **Campañas** | Campaign Planner define objetivos/estructura antes de que existan actividades — hoy el admin arma la campaña a mano |
| **Actividades** | Content Creator/Copywriter completan el `descripcion` de una actividad ya planeada |
| **KPIs** | KPI Advisor detecta atraso respecto a la meta y explica por qué, sin esperar a que un humano lo note |
| **Reportes** | Business Analyst/Data Analyst convierten datos crudos en resumen ejecutivo |
| **Notificaciones** | Un agente puede generar la notificación en sí ("KPI X va atrasado") pero el disparo sigue siendo un trigger de base de datos (`02-ARCHITECTURE` §13), no la IA decidiendo cuándo notificar |
| **Automatizaciones** | Automation Expert/Workflow Optimizer sugieren reglas basadas en patrones repetidos — la ejecución sigue siendo el motor de `02-ARCHITECTURE` §13, la IA solo propone la regla |
| **Base de datos** | Ningún agente escribe directo — todo pasa por el mismo `insert`/`update` que usaría un humano, con las mismas políticas RLS (`05C-AI-GOVERNANCE.md` §5) |
| **Documentación** | Documentation Assistant (§5A, grupo 7) — mantiene `/docs` sincronizado con el código, un caso de uso interno del propio equipo de MAHP, no de los clientes |
| **Módulo Multiempresa** | Cada invocación de cualquier agente está acotada a una sola empresa (`company_id`) — igual que cualquier consulta del sistema; ningún agente ve ni mezcla datos entre empresas (`05C-AI-GOVERNANCE.md` §2) |

## 6. Beneficios Empresariales

- Menos tiempo de planeación manual (ya medible hoy con Calendar Planner: de "hoja en blanco" a "revisar una propuesta").
- Detección temprana de problemas (KPI atrasado, campaña estancada) sin esperar a un reporte mensual.
- Consistencia de tono en todo el contenido generado (Copywriter/Content Creator siguen la personalidad de marca definida en `01-IDENTIDAD-DEL-PRODUCTO.md` §11).
- Reducción de trabajo repetitivo de bajo valor (armar reportes, redactar primeros borradores) para que el equipo humano se enfoque en decisión y estrategia.
- Diferenciador de producto real frente a un CRM o gestor de tareas genérico (`01-IDENTIDAD-DEL-PRODUCTO.md` §10).

## 7. Principios Éticos

Desarrollo completo en `05C-AI-GOVERNANCE.md` — resumen aquí: control humano siempre, transparencia sobre qué es generado por IA vs. dato real, sin sesgos de negocio ocultos (un agente no recomienda un proveedor/canal por interés comercial de MAHP no declarado al usuario), privacidad estricta entre empresas, y ningún agente fabrica datos que parezcan reales sin serlo (mismo principio ya aplicado a contenido humano — `CLAUDE.md` §6 — extendido aquí a generación de IA: nunca un testimonio, precio o cifra inventada presentada como real).

## 8. Casos de Uso Prioritarios

1. **Generación de calendario** — ya construido (Calendar Planner).
2. **Detección de KPI atrasado** — de solo lectura, bajo riesgo, alto valor — primer candidato de expansión (§9).
3. **Resumen ejecutivo de campaña cerrada** — de solo lectura, ahorra el reporte manual de fin de campaña.
4. **Primer borrador de copy por actividad** — mayor valor creativo, requiere revisión humana más cuidadosa antes de publicar.
5. **Sugerencia de automatización** basada en patrones repetidos de un `company_admin` — valor a mediano plazo, depende de tener volumen de uso suficiente para detectar el patrón.

## 9. Evolución Esperada

**A 3 años**: los agentes de solo-lectura (KPI Advisor, Business Analyst, Data Analyst) están en producción y son de uso diario para `director`; Calendar Planner y Content Creator cubren la mayoría de la generación de contenido de una campaña.

**A 5 años**: el Marketing Strategist orquesta múltiples agentes en una sola solicitud conversacional ("prepárame la campaña de fin de año") en vez de que el usuario invoque cada especialista por separado — coincide con el horizonte de `01-IDENTIDAD-DEL-PRODUCTO.md` §4 de agencias multi-marca, donde la orquestación automática de varios agentes por campaña se vuelve más valiosa cuanto más campañas simultáneas gestiona una sola cuenta.

**A 10 años**: la IA no solo responde a solicitudes — aprende de qué ha funcionado específicamente para cada empresa cliente a lo largo de su historia con la plataforma (mismo horizonte ya declarado en `01-IDENTIDAD-DEL-PRODUCTO.md` §4), con memoria persistente real (`05E-AI-MEMORY-AND-CONTEXT.md`) en vez de contexto reconstruido en cada llamada.

## 10. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|---|---|
| Dependencia de un solo proveedor de modelo | Cada agente aislado detrás de su propia Edge Function/adaptador (`02-ARCHITECTURE` §11) — proveedor intercambiable sin rediseño |
| Costo descontrolado por uso masivo de múltiples agentes | Rate limiting por empresa/usuario (brecha ya identificada en `IA.md` §5, urgente de cerrar antes de expandir el catálogo de agentes) + disparo manual, no automático, como estándar inicial (§8, ya el criterio de Calendar Planner) |
| Un agente genera contenido incorrecto o de mala calidad | Revisión humana obligatoria antes de publicar (§1) — ningún agente tiene permiso de escritura directa sin ese paso |
| Fuga de datos entre empresas a través de un prompt mal acotado | Todo agente recibe contexto ya filtrado por `company_id` desde el backend, nunca construye su propia consulta sin esa restricción (§5, `05C-AI-GOVERNANCE.md` §5) |
| Un usuario de un rol que no debería usar cierto agente lo invoca de todas formas | Permisos por agente definidos explícitamente en `05A-AI-AGENTS.md`, verificados en la Edge Function igual que cualquier otro endpoint (`API.md` §4) |
| El ecosistema crece a 24+ agentes de forma desordenada, cada uno con su propio patrón | Registro formal de agentes + estándar único de prompts (§11 abajo, `05D-AI-PROMPT-STANDARDS.md`) |

## 11. Escalabilidad del Ecosistema

**Registro de agentes [FUTURO]**: tabla conceptual `ai_agents` (`id`, `name`, `version`, `status` activo/deprecado, `allowed_roles`, `edge_function`) — permite activar/desactivar un agente por empresa o por plan sin tocar código, y da un solo lugar donde ver qué existe (equivalente a `MODULOS.md` pero para agentes de IA).

**Versionado**: cada agente sigue el mismo criterio de compatibilidad hacia atrás que el resto del sistema (`03-ENGINEERING-STANDARDS.md` §11) — un cambio de prompt que altera el contrato de salida es una nueva versión, no un reemplazo silencioso del agente existente.

**Herramientas compartidas**: sanitización de salida, formato de contrato de error (`{ error }`, `API.md` §4), y el patrón de autenticación de Edge Function son comunes a todos los agentes — viven en el Core (`02-ARCHITECTURE` §6), no se reimplementan por agente.

**Comunicación entre agentes**: en la V1 (§9, MVP) no hay comunicación directa entre agentes — el Marketing Strategist orquesta secuencialmente, cada agente recibe el resultado del anterior como parte de su contexto de entrada (patrón "cadena", no "conversación entre agentes"). Comunicación más compleja (un agente consultando a otro dinámicamente) es un candidato de V3+ (§9), no de la primera versión.

**Delegación y priorización**: el Marketing Strategist decide qué agente(s) invocar según la solicitud del usuario — en la V1 esta decisión es una regla simple (mapeo de intención a agente), no un modelo de decisión propio; se vuelve más sofisticada solo si el volumen de solicitudes ambiguas lo justifica.

**Observabilidad**: cada invocación de agente se registra (qué agente, qué empresa, éxito/error, costo aproximado) — mismo mecanismo propuesto en `02-ARCHITECTURE` §15 (observabilidad general), aplicado específicamente al uso de IA para controlar costo y detectar mal uso.
