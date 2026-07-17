# MES-001 — MAHP ENGINEERING CONSTITUTION

> Máxima autoridad técnica del proyecto. Toda decisión de ingeniería
> futura — y toda decisión ya tomada en MDS, MPS, ADR y CCEC — debe ser
> compatible con este documento. Donde no lo es, se declara aquí como
> hallazgo explícito (§7, Enterprise Architecture Review), nunca en
> silencio.
>
> **Verificación previa realizada, no asumida**: antes de escribir este
> documento se revisaron los 12 MDS, ambos MPS, los 15 ADR, los 3 CCEC y
> el MEM existentes — el hallazgo de coherencia más significativo (§7 Q1)
> se descubrió en ese proceso, no se inventó después.
>
> Última actualización: 2026-07-12.

---

## 1. Contexto

MAHP creció, en el curso de esta misma sesión de documentación, de un producto con `/docs` disperso a un Master Manual de 12 fases MDS, 2 fases MPS, 15 ADR y 3 CCEC — sin que existiera, hasta ahora, un documento que dijera **cómo se construye software en este proyecto**, independiente de qué se construye. MES-001 es ese documento: no diseña un módulo, diseña el proceso y los principios con los que se diseña y construye cualquier módulo.

## 2. Objetivos del documento

Definir principios oficiales de ingeniería (§4) y estándares únicos para las 15 categorías pedidas por esta fase (arquitectura, desarrollo, IA, seguridad, calidad, observabilidad, documentación, integraciones, APIs, base de datos, automatización, DevOps, testing, UX engineering, gobernanza técnica) — desarrollados a través de las secciones siguientes, no como una lista aislada. Este documento es la referencia obligatoria para todo MDS, MPS, ADR y CCEC futuro.

## 3. Convención de honestidad de este documento

Igual que todo `/docs` desde MDS-008: este documento no describe un MAHP aspiracional como si ya existiera. Cada principio, regla y puntaje de Engineering Maturity / Implementation Maturity (§14) refleja el estado real verificado, expresado en los **Estados de Madurez Oficiales** (§4A) — una Constitución que miente sobre el presente no sirve como autoridad para el futuro.

Bajo la **Progressive Infrastructure Strategy** (`ADR-016`, decisión del Product Owner): que una capacidad esté en estado `Designed`/`Planned` en vez de `Production` **no es, por sí mismo, una inconsistencia** — es información honesta sobre en qué punto de su ciclo de vida está. La inconsistencia solo existe si el estado real no se declara, o si se presenta un estado más avanzado del que realmente tiene.

## 4. Principios fundamentales de ingeniería

| # | Principio | Definición | Objetivo | Justificación | Beneficios | Impacto arquitectónico | Ejemplo | Riesgo de no cumplirlo |
|---|---|---|---|---|---|---|---|---|
| 1 | **Architecture First** | Ningún módulo se construye sin que su arquitectura se documente primero | Evitar deuda técnica por decisiones improvisadas | Ya es la filosofía fundacional de MAHP (`PROJECT-BLUEPRINT.md`: "todo módulo se diseña antes de implementarse") | Decisiones revisables antes de tener costo de reversión en código | Cada MDS/MPS existe antes que su código | Los 12 MDS + 2 MPS ya siguieron este orden sin excepción | Repetir el patrón de `v16`→`v18` (bug de RLS descubierto en producción por no validarse el diseño primero) |
| 2 | **AI First** | La IA participa en el flujo central desde el diseño, no como función añadida | Que la IA sea parte del producto, no un plugin | `PROJECT-BLUEPRINT.md` §4, ya establecido | Diferenciador de categoría (`11-ENTERPRISE-PRODUCT-STRATEGY.md`) | Cada dominio de datos nuevo considera su relación con IA desde `07A-DOMAIN-MODEL.md` | Community Manager Advisor diseñado en MDS-006, activado recién en MEM-002-001 | Construir un módulo y "agregarle IA después" — exactamente lo que este principio previene |
| 3 | **API First** | Toda funcionalidad debe poder invocarse por API antes de tener pantalla | Consistencia entre lo que el frontend usa y lo que un tercero podría usar | `08-ENTERPRISE-INTEGRATION-PLATFORM.md` §1 | Una futura API pública no requiere reconstruir lo ya hecho | PostgREST ya expone cada tabla automáticamente | El propio frontend de MAHP ya consume PostgREST como cualquier cliente externo lo haría | Una función solo accesible desde un botón específico, imposible de automatizar o exponer después |
| 4 | **Event Driven** | Todo hecho relevante es un evento nombrado, no una escritura silenciosa | Que auditoría, automatización e IA compartan un solo vocabulario | `08F-EVENT-ARCHITECTURE.md`, `09C-EVENT-CATALOG.md` | Un evento nuevo se consume por N sistemas sin rediseño | Catálogo de eventos único, extendido por cada módulo, nunca duplicado | `MPS-002-001` extiende el catálogo con eventos de conversación en vez de crear uno propio (`ADR-013`) | Cuatro dominios reinventando su propio mecanismo de notificación — el mismo patrón que forzó a crear `CCEC-001`/`CCEC-004` |
| 5 | **Security by Design** | La seguridad se decide en el diseño, no se audita después | Que RLS sea la autoridad real desde la primera línea de esquema | `PROJECT-BLUEPRINT.md` §5 principio 1 | Menor superficie de vulnerabilidad acumulada | Ninguna tabla operativa nace sin política de `select` | Todo `supabase_schema_vN.sql` incluye RLS en el mismo cambio que la tabla | El propio incidente de `v16`/`v18` — una política pensada sin validar su interacción con otra |
| 6 | **Privacy by Design** | El dato de terceros se protege desde el modelo, no con un aviso legal añadido después | Evitar que el primer dato real de un cliente final se capture sin marco | `CCEC-005-PRIVACY-AND-COMPLIANCE.md` | Reduce riesgo legal y reputacional | Todo dominio con dato de tercero se evalúa contra `CCEC-005` antes de construirse | Social AI Hub diseñó su modelo de conversación sabiendo que necesitaría mecanismo de eliminación (`CCEC-005` §3) | Capturar el primer mensaje real de un cliente sin haber resuelto la consulta legal pendiente |
| 7 | **Human in the Loop** | Ninguna acción crítica ocurre sin aprobación humana explícita | Que la IA acelere sin decidir sola | No negociable en todo MAHP desde `PROJECT-BLUEPRINT.md` §5 principio 3 | Confianza del cliente en el sistema, control de riesgo comercial | Approval Engine (`09G`) es el único camino para acción crítica de IA | Ninguno de los ~30 agentes de IA diseñados ejecuta sin revisión (`05-AI-ECOSYSTEM.md` §9) | Un mensaje enviado automáticamente a un cliente real sin que nadie lo aprobara |
| 8 | **Modular by Default** | Un módulo se puede activar/desactivar sin romper el resto | Que Social AI Hub, Automatización, Integraciones sean opcionales por plan | `10B-SUBSCRIPTION-AND-LICENSING.md` §2, `MPS-002-000` §4 principio 14 | Un plan básico no paga infraestructura que no usa | Ningún módulo nuevo introduce dependencia obligatoria en el Core | Una empresa sin Social AI Hub sigue operando MAHP con normalidad | Un módulo nuevo que, sin querer, hace que el resto de MAHP falle si no está configurado |
| 9 | **Cloud Ready** | El sistema opera sobre infraestructura gestionada, sin servidor propio que mantener | Minimizar operación de infraestructura con equipo pequeño | `ADR-002` | Cero costo de mantenimiento de servidor propio | Supabase + GitHub Pages como única infraestructura | Todo MAHP ya opera así desde su origen multiempresa | Introducir un servidor propio sin justificación real — contradice `ADR-002` directamente |
| 10 | **Enterprise Scalability** | El diseño soporta crecer en 2-3 órdenes de magnitud sin rediseño estructural | Que multi-tenancy y cola de eventos aguanten el roadmap comercial (`11A`) | `07-ENTERPRISE-DATA-PLATFORM.md` §8, `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §14 | Crecimiento comercial sin freno técnico | `company_id`+RLS ya validado hasta miles de empresas (`07H` §7) | Ningún cambio de modelo de datos fue necesario entre MDS-008 y MPS-002-001 | Descubrir el límite de escala en producción, no en documentación |
| 11 | **Observability by Default** | Todo componente nuevo emite métricas/logs desde su primer día, no como mejora posterior | Saber que algo falla antes de que el cliente lo reporte | `CCEC-004-OBSERVABILITY-PLATFORM.md` | Detección temprana de degradación | Todo dominio nuevo se evalúa contra `CCEC-004A` antes de construirse | `CCEC-004` en estado `Designed` (§4A) — bajo `ADR-016`, esperado y correcto en esta etapa, no un incumplimiento | Declarar observabilidad como `Production` sin serlo — eso sí sería la falla que este principio previene |
| 12 | **Documentation First** | Un módulo se diseña en `/docs` antes de escribirse en código | Que la documentación sea la fuente de verdad, no un resumen posterior | `CLAUDE.md` §7, filosofía fundacional de todo el proyecto | Decisiones revisables sin costo de código; onboarding de cualquier persona nueva | Cada uno de los 90+ documentos de `/docs` existe antes que su implementación | Ningún MDS/MPS de esta sesión se escribió después de construir algo | Documentación que describe código ya escrito — pierde su función de diseño previo |
| 13 | **Testability** | Todo componente debe poder verificarse sin depender de producción real | Confianza en un cambio antes de desplegarlo | Nuevo — **[FUTURO]**, sin estándar previo en `/docs` | Menos regresiones, menos incidentes descubiertos por el cliente | Requiere que `10G-DEPLOYMENT-STRATEGY.md` eventualmente incorpore CI (§5, ya señalado ahí como [FUTURO]) | *(Sin ejemplo real hoy — ver Enterprise Readiness Score, §9)* | Cada despliegue es, hoy, la primera vez que el cambio se ejecuta fuera de la máquina del desarrollador |
| 14 | **Automation First** | Preferir automatizar un proceso repetitivo antes que documentarlo como manual permanente | Reducir trabajo humano repetitivo, mismo criterio que el producto ofrece a sus clientes | Coherencia entre lo que MAHP vende (`09-ENTERPRISE-AUTOMATION-PLATFORM.md`) y cómo se opera a sí mismo | El equipo de ingeniería no debería hacer manualmente lo que le vende a sus clientes automatizar | El respaldo semanal (`10E` §6) ya es una automatización de infraestructura, no un recordatorio manual | Tarea programada de Windows para el respaldo, en vez de "recordar hacerlo cada semana" | Procesos operativos que dependen de que una persona no se le olvide |
| 15 | **Explainable AI** | Toda salida de IA con impacto de decisión debe mostrar su motivo | Que un humano pueda confiar o cuestionar una sugerencia, no aceptarla a ciegas | `ADR-014` | Detecta error de IA antes de que tenga efecto | Cada motor de IA nuevo incluye campo de explicación desde su diseño | El CIE (`MPS-002-001` §3, §7, §8) no tiene ninguna salida sin motivo | Una recomendación de IA que se sigue sin poder cuestionarse — mismo riesgo que motivó `ADR-014` |
| 16 | **Backward Compatibility** | Ningún módulo nuevo rompe uno existente | Que agregar no signifique arriesgar lo ya construido | `PROJECT-BLUEPRINT.md` §5 principio 6, `CLAUDE.md` §3 | Confianza de que MAHP crece sin regresiones | `supabase_schema_vN.sql` nunca se edita, solo se extiende (`ADR-004`) | 19 archivos de esquema, ninguno reescrito | Un cambio de esquema que silenciosamente deja de funcionar para una empresa existente |
| 17 | **Performance by Design** | El rendimiento se considera en el diseño de datos/consultas, no se optimiza reactivamente | Evitar reescribir consultas críticas bajo presión de un incidente real | Nuevo — parcialmente cubierto por `07-ENTERPRISE-DATA-PLATFORM.md` §8 (índices, particionamiento futuro) | Menor riesgo de degradación sorpresiva al crecer | Diseño de índices compuestos ya anticipado (no implementado) para tablas de alto volumen | *(Ver Enterprise Readiness Score, §9 — sin medición real todavía)* | Descubrir un cuello de botella de rendimiento solo cuando un cliente real lo sufre |
| 18 | **Compliance Ready** | El diseño no bloquea cumplimiento normativo futuro, aunque no lo resuelva hoy | Que expansión internacional (`11C`) no exija rediseño de arquitectura de datos | `CCEC-005`, `11C-MARKET-EXPANSION.md` §4 | Evita el riesgo arquitectónico más serio identificado en toda la serie de crecimiento (`11C` §4) | Aislamiento multiempresa ya compatible con requisitos de separación de datos, aunque no con residencia geográfica | `CCEC-005` deja explícitas las preguntas legales pendientes en vez de ignorarlas | Descubrir un requisito regulatorio bloqueante después de vender a un mercado nuevo |
| 19 | **Configuration over Customization** | Preferir que una empresa cliente ajuste comportamiento vía configuración (planes, reglas, workflows) antes que MAHP le construya código a medida | Que el producto escale sin bifurcarse por cliente | Coherente con el modelo SaaS de un solo código base (`10-ENTERPRISE-SAAS-PLATFORM.md`) | Un solo MAHP para todos los clientes, no N variantes que mantener | Reglas de negocio configurables (`09B`) en vez de lógica condicional por empresa en el código | Un restaurante prioriza "Reservación" sobre otras intenciones vía regla, no vía código exclusivo para él (`MPS-002-001` §7) | Código con `if (company_id === X)` — la forma más rápida de volver MAHP imposible de mantener |
| 20 | **Continuous Improvement** | Cada fase de documentación reporta hallazgos que alimentan la siguiente, no se cierra en silencio | Que el propio proceso de construir MAHP mejore con el tiempo | Ya practicado sin excepción desde MDS-008 (cada fase señala gaps para la siguiente) | Los mismos 4 hallazgos de auditoría no se repitieron una quinta vez — se resolvieron con `CCEC-001` | El "Motor de Aprendizaje" del CIE (`MPS-002-001` §9) aplica este mismo principio al producto, no solo a la ingeniería | El hallazgo del respaldo faltante (`10E`) se convirtió en una tarea automatizada, no solo en un párrafo de riesgo | Documentar un riesgo la primera vez y no volver a mencionarlo hasta que ya sea un incidente |

## 4A. Estados de Madurez Oficiales

**Decisión del Product Owner (2026-07-12)**: todo módulo, agente de IA y componente de MAHP debe declarar uno de estos 7 estados oficiales — reemplaza, con más granularidad, la convención informal [EXISTE]/[FUTURO]/[PARCIAL] usada en `/docs` hasta esta fecha.

| Estado | Significa | Equivalente aproximado a la convención anterior |
|---|---|---|
| **Proposed** | Idea documentada, sin arquitectura ni validación todavía | Sub-estado de [FUTURO], el más temprano |
| **Designed** | Arquitectura y principios definidos (ej. un MDS/MPS completo) | [FUTURO], con diseño ya sólido — ej. `CCEC-004` hoy |
| **Specified** | Contrato funcional/técnico completo, listo para construirse | [FUTURO], en el borde de pasar a construcción |
| **Prototype** | Primera versión construida, sin garantías de estabilidad | [PARCIAL], fase temprana |
| **MVP** | Versión mínima viable en uso real, con alcance acotado deliberadamente | [PARCIAL] o [EXISTE], según cobertura |
| **Production** | En uso real, estable, con el nivel de calidad esperado para su criticidad | [EXISTE] |
| **Deprecated** | Reemplazado o retirado — se conserva documentado, no se borra (mismo principio de `ADR-004`/`ADR-005`, nada crítico se pierde) | Sin equivalente previo — no existía este estado en `/docs` hasta ahora |

**Regla de aplicación**: este estándar rige para todo documento **nuevo** desde esta fecha sin excepción. La re-etiquetación retroactiva de los 90+ documentos existentes de [EXISTE]/[FUTURO]/[PARCIAL] a estos 7 estados **no se ejecuta en este cambio** — es un trabajo de alcance considerable que merece su propia decisión de priorización (ver Entregable Final, recomendación), no una migración silenciosa de vocabulario dentro de esta Constitución.

## 5. Pilares de Ingeniería MAHP

| Pilar | Nombre completo | Responsabilidad | Alcance | Dependencias |
|---|---|---|---|---|
| **MES** | Engineering Standards | Cómo se construye — principios, procesos, calidad, gobernanza técnica | Todo el proyecto, transversal | Ninguna — es la constitución de la que dependen los demás |
| **MDS** | Development System | Qué se construye a nivel de plataforma — visión y diseño de cada capa (datos, integración, automatización, SaaS, estrategia) | Plataforma completa, por fases numeradas (MDS-001 a MDS-012) | MES (principios), CCEC (capacidades reutilizadas), ADR (decisiones que hereda) |
| **MPS** | Product Specifications | Qué se construye a nivel de módulo de producto vendible — constitución y blueprint funcional | Un módulo a la vez (hoy: Social AI Hub, `MPS-002-000`/`001`) | MDS (plataforma sobre la que corre), MEM (visión de negocio que antecede a MPS), CCEC, ADR |
| **ADR** | Architecture Decision Records | Por qué se decidió algo — contexto, alternativas, consecuencias | Una decisión puntual por archivo, transversal a cualquier pilar | MES (principios que justifican la decisión) |
| **CCEC** | **Cross-Cutting Enterprise Capabilities** | Capacidades compartidas por todo el sistema (auditoría, observabilidad, privacidad, y las que se agreguen bajo el mismo criterio) | Transversal — consumida por cualquier MDS/MPS, nunca redefinida por dominio | MES (principios) |

**✅ Definición oficial resuelta (decisión del Product Owner, 2026-07-12)**: el documento de fase de MES-001 proponía originalmente "Compliance, Cybersecurity & Enterprise Compliance" — expansión distinta a la ya usada de facto en 8 documentos existentes ("capacidades compartidas por todo el sistema"). El Product Owner resolvió la contradicción con **CCEC = Cross-Cutting Enterprise Capabilities**: preserva el alcance amplio ya vigente (auditoría, observabilidad, privacidad — ninguna limitada a compliance/ciberseguridad) con una expansión formal en inglés, consistente con el resto de la nomenclatura de la serie (MDS, MPS, ADR, MES). Esta es ahora la única definición válida; todo documento nuevo la usa desde su creación, y los documentos existentes (`CCEC-001`, `CCEC-004`, `CCEC-005` y sus anexos) fueron actualizados con una referencia a esta definición en el mismo cambio.

## 6. Ciclo oficial de desarrollo

| Etapa | Criterio de entrada | Criterio de salida |
|---|---|---|
| **1. Idea** | Necesidad real identificada (cliente, hallazgo de documentación, riesgo) — nunca "porque sería interesante" (`PROJECT-BLUEPRINT.md` §5 principio 5) | Problema articulado en una frase clara |
| **2. Análisis** | Idea aceptada como merecedora de exploración | Se sabe si requiere un MDS/MPS nuevo, extiende uno existente, o es un ajuste menor sin ciclo completo (`CLAUDE.md` §7) |
| **3. Arquitectura** | Análisis completo | Diseño de alto nivel compatible con MES-001 (este documento) verificado |
| **4. ADR (si aplica)** | La arquitectura implica una decisión con alternativas reales descartadas | ADR registrado en `ADR-INDEX.md`, estado `Aceptado` o `Propuesto` según corresponda |
| **5. Product Specification** | Arquitectura y ADRs (si aplicaban) resueltos | MDS o MPS completo, con Entregable Final y coherencia verificada |
| **6. UX** | Especificación funcional aprobada | Flujo de interfaz definido, consistente con `04-DESIGN-SYSTEM.md` |
| **7. Data Model** | UX definido (o en paralelo si no depende de interfaz) | Modelo de datos compatible con `07A-DOMAIN-MODEL.md`, sin tabla física creada todavía |
| **8. API** | Modelo de datos definido | Contrato de API definido (`08A-API-STANDARDS.md`), sin implementación |
| **9. Desarrollo** | Contrato de API y modelo de datos aprobados | Código escrito, `supabase_schema_vN.sql` siguiente número, sin desplegar a producción todavía |
| **10. Testing** | Código completo | Casos de prueba definidos y ejecutados — hoy en estado `Proposed` como práctica formal (§4, principio 13; §4A) |
| **11. QA** | Testing pasado | Verificación funcional contra la especificación original |
| **12. Security Review** | QA pasado | RLS verificado, sin secretos expuestos (`CLAUDE.md` §5), checklist de `07F`/`08E` cumplido |
| **13. Architecture Review** | Security Review pasado | Verificación de que no contradice MES-001 ni ningún ADR vigente |
| **14. Release** | Architecture Review pasado | Desplegado a producción (`10G-DEPLOYMENT-STRATEGY.md`) |
| **15. Observabilidad** | Release completado | Métricas/logs del nuevo componente visibles (`CCEC-004`) |
| **16. Mejora continua** | Tiempo de uso real suficiente para tener señal | Hallazgos alimentan la etapa 1 del siguiente ciclo (principio 20, §4) |

**Nota de honestidad**: este ciclo de 16 etapas es el ideal — la práctica real de esta sesión (documentada en `CHANGELOG.md`) ha cumplido rigurosamente las etapas 1–5 en cada MDS/MPS, y las etapas 9/12/13 de forma abreviada para cambios pequeños (ej. `v18`, `v19`), consistente con `CLAUDE.md` §7 ("un fix o ajuste pequeño no necesita ese ciclo completo"). Las etapas 10–11 (testing/QA formal) no se han practicado todavía de forma alguna — hallazgo explícito, no oculto (ver §14, Implementation Maturity).

## 7. Quality Gates

| Gate | Objetivo | Checklist (resumen) | Criterio de aprobación |
|---|---|---|---|
| **Functional Review** | ¿Resuelve el problema que dijo resolver? | Casos de uso cubiertos, entregable final del MDS/MPS revisado | Todo caso de uso crítico tiene una respuesta explícita |
| **Architecture Review** | ¿Es compatible con MES-001 y los ADR vigentes? | Checklist de cada MDS/MPS ya existente (ej. `MPS-002-001` §"Checklist") | Sin contradicción con ADR `Aceptado`; toda contradicción nueva requiere un ADR que la reemplace |
| **Security Review** | ¿RLS y secretos correctos? | `07F-SECURITY-AND-AUDIT.md` checklist, `08E-SECURITY.md` checklist | Ninguna tabla operativa sin política de `select`; ningún secreto en cliente |
| **AI Review** | ¿Respeta Human in the Loop y Explainable AI? | `05C-AI-GOVERNANCE.md`, `ADR-007`, `ADR-014` | Ninguna acción crítica sin aprobación; toda salida de IA con motivo visible |
| **UX Review** | ¿Consistente con el sistema de diseño? | `04-DESIGN-SYSTEM.md`/anexos | Sin componente visual nuevo fuera de los tokens ya establecidos |
| **Performance Review** | ¿Escala dentro de los límites reconocidos? | `07-ENTERPRISE-DATA-PLATFORM.md` §8 | Sin operación que ignore los límites ya documentados de la cola/RLS |
| **Documentation Review** | ¿`DATABASE.md`/`MODULOS.md`/CCEC relevantes actualizados en el mismo cambio? | `CLAUDE.md` §7 | Ningún cambio de comportamiento sin su documentación correspondiente actualizada |
| **Compliance Review** | ¿Datos de terceros manejados según `CCEC-005`? | Checklist de `CCEC-005` | Solo aplica a módulos con dato de tercero — el resto pasa automáticamente |
| **Release Readiness Review** | ¿Listo para producción real? | Suma de los gates anteriores + `10D-OPERATIONAL-EXCELLENCE.md` | Todos los gates previos aprobados o explícitamente exentos con justificación |

**Política de proporcionalidad — vinculante (decisión del Product Owner, 2026-07-12)**: los Quality Gates se aplican en proporción al impacto del cambio, nunca los 9 de forma automática e indiscriminada. Esto no es una recomendación ni una nota aclaratoria — es la política oficial de esta Constitución, consistente con `PROJECT-BLUEPRINT.md` §5 principio 5 (simplicidad) al tamaño de equipo actual.

| Tamaño de cambio | Gates obligatorios | Ejemplo real de esta sesión |
|---|---|---|
| Módulo nuevo (MDS/MPS completo) | Los 9, sin excepción | `MPS-002-001` (CIE) |
| Extensión de un módulo existente | Functional + Architecture + Documentation, más los específicos que el cambio toque (Security si toca RLS, AI si toca un agente) | `10E` §6 (respaldo automatizado) — Documentation + Architecture |
| Fix puntual / corrección de bug | Security (si toca RLS/datos) + Documentation, mínimo | `v18` (fix de RLS), `v19` (auditoría de impersonación) |
| Ajuste de documentación sin cambio de comportamiento | Documentation únicamente | Actualizaciones de `PROJECT-BLUEPRINT.md` §"Documentos relacionados" |

Un cambio que omite un gate aplicable debe declarar explícitamente por qué, mismo criterio que "Release Readiness Review" ya exige (columna "Criterio de aprobación").

## 8. Reglas oficiales

| Categoría | Regla vigente | Origen |
|---|---|---|
| Documentación | Todo módulo se diseña en `/docs` antes de código; cambio de comportamiento actualiza su documento en el mismo cambio | `CLAUDE.md` §7 |
| Versionado (esquema) | `supabase_schema_vN.sql`, siguiente número, nunca editado una vez aplicado | `ADR-004` |
| Versionado (API) | Prefijo de versión desde el primer consumidor externo real, no antes | `08H-VERSIONING.md` |
| Naming Convention | Tablas/columnas: español donde el dominio es español, inglés donde ya se estableció así; funciones: verbo+sustantivo | `07C-DATABASE-STANDARDS.md` §1 |
| Branch Strategy | **[FUTURO]** — sin estrategia formal de ramas hoy; un solo desarrollador trabajando directo en `main` | Hallazgo nuevo, ver §9 |
| Commits | Mensaje explica el porqué, no solo el qué (ya practicado en cada commit de esta sesión) | Práctica ya establecida, sin documento previo que la fijara — formalizada aquí |
| Pull Requests | **[FUTURO]** — sin flujo de PR hoy, cambios van directo a `main` | Hallazgo nuevo, ver §9 |
| Code Reviews | **[FUTURO]** — sin segundo revisor humano hoy (equipo de una persona) | Hallazgo nuevo, ver §9 |
| ADR | Se crea cuando hay alternativas reales descartadas; nunca se edita un ADR `Aceptado`, se reemplaza | `ADR-INDEX.md` |
| Riesgos | Todo riesgo identificado se documenta con impacto/probabilidad/mitigación, nunca solo mencionado sin acción | Práctica ya establecida desde MDS-008 |
| Dependencias | Toda fase verifica sus dependencias declaradas existen antes de escribirse (ya practicado: MDS-009 pausó por MDS-008 faltante) | Práctica ya establecida |
| IA | Vía Edge Function proxy, nunca API key en cliente; toda acción crítica requiere aprobación humana | `ADR-007`, `ADR-009` |
| Integraciones | Adaptador propio aislado por proveedor, nunca acoplamiento directo | `08-ENTERPRISE-INTEGRATION-PLATFORM.md` §2, `ADR-008`/`ADR-010` |
| Seguridad | RLS como única autorización real; `security definer` solo con justificación explícita | `07F-SECURITY-AND-AUDIT.md` §1–2 |
| Observabilidad | Toda métrica nueva sigue el formato de `CCEC-004A`, nunca un panel aislado | `CCEC-004A-METRICS-AND-DASHBOARDS.md` |
| Logging | Formato común de `CCEC-004B`; nunca secretos en log | `CCEC-004B-LOGGING-STANDARDS.md` |
| Auditoría | Todo evento con relevancia administrativa/seguridad va a `audit_log` vía `CCEC-001A`, nunca mecanismo propio | `CCEC-001` |
| Errores | Contrato uniforme `{ error: "..." }`, código HTTP correspondiente | `08A-API-STANDARDS.md` §5–6 |
| Configuración | Preferir configuración (planes, reglas) sobre código específico por cliente (principio 19, §4) | `10B-SUBSCRIPTION-AND-LICENSING.md` |
| Feature Flags | **[FUTURO]** — sin mecanismo formal hoy; activación por plan (`10B`) cumple un rol similar pero no es lo mismo | Hallazgo nuevo, ver §9 |
| Migraciones | Ver "Versionado (esquema)" — mismo mecanismo, sin herramienta automatizada | `ADR-004` |

## 9. Gobernanza técnica

**Roles**: hoy, una sola persona (Chief Product Owner) cumple todos los roles de ingeniería — no hay una estructura de roles separados que gobernar todavía. Este documento define los roles **de destino** (§"Role" del propio documento de fase: CTO, Arquitecto Principal, Arquitecto de Seguridad, etc.) para cuando el equipo crezca, sin fingir que existen hoy.

**Responsabilidades**: propiedad técnica (arquitectura, seguridad, calidad) y propiedad funcional (qué construye valor de negocio) recaen hoy en la misma persona — MES-001 anticipa su separación futura sin forzarla antes de que el equipo lo requiera.

**Aprobaciones**: todo MDS/MPS/CCEC/ADR requiere aprobación explícita del Product Owner antes de avanzar a la siguiente fase — ya practicado sin excepción en toda esta sesión, formalizado aquí como regla de gobierno, no solo costumbre.

**Gestión del conocimiento**: `/docs` completo es el mecanismo — no existe (ni se propone) una herramienta separada de conocimiento (wiki, Notion) mientras `/docs` cumpla la función sin fricción.

**Mantenimiento**: `CHANGELOG.md` como bitácora única de qué cambió y por qué — ya practicado.

## 10. Definición de "Enterprise Ready"

| Dimensión | Criterio mínimo |
|---|---|
| Arquitectura | Diseñada en MDS/MPS antes de construirse; sin contradicción con ADR vigente |
| Seguridad | RLS completo, sin secretos expuestos, checklist de `07F`/`08E` cumplido |
| Escalabilidad | Validado contra los límites ya documentados (`07-*` §8) para el volumen proyectado del módulo |
| IA | Human in the Loop y Explainable AI sin excepción (`ADR-007`, `ADR-009`, `ADR-014`) |
| UX | Consistente con `04-DESIGN-SYSTEM.md`, sin componente visual huérfano |
| APIs | Contrato definido según `08A-API-STANDARDS.md`, con manejo de error uniforme |
| Testing | **[FUTURO como estándar general]** — mínimo viable: verificación manual documentada del flujo principal antes de release |
| Documentación | `DATABASE.md`/`MODULOS.md`/CCEC relevantes actualizados en el mismo cambio |
| Observabilidad | Métricas mínimas visibles según `CCEC-004A` — aceptable que sea manual/consulta directa mientras no exista panel, nunca ausente por completo |
| Auditoría | Eventos administrativos/de seguridad registrados vía `CCEC-001A` |
| Cumplimiento | Si maneja dato de tercero, evaluado contra `CCEC-005` antes de capturar el primer dato real |

Un módulo es "Enterprise Ready" cuando cumple las 11 dimensiones — "Production Ready" (nivel intermedio, ya usado en `10-ENTERPRISE-SAAS-PLATFORM.md`) es aceptable para operar con clientes reales sin cumplir todas, siempre que los vacíos estén documentados explícitamente, no ocultos.

## 11. Enterprise Checklist (maestra)

- [ ] ¿Existe un MDS/MPS que diseñó este módulo antes del código?
- [ ] ¿Existen los ADR necesarios, sin contradecir uno `Aceptado`?
- [ ] ¿Pasó los Quality Gates proporcionales a su tamaño (§7)?
- [ ] ¿RLS completo, sin secretos expuestos?
- [ ] ¿Eventos de auditoría agregados a `CCEC-001A` si aplica?
- [ ] ¿Métricas mínimas definidas según `CCEC-004A` si aplica?
- [ ] ¿Dato de tercero evaluado contra `CCEC-005` si aplica?
- [ ] ¿`DATABASE.md`/`MODULOS.md` actualizados en el mismo cambio?
- [ ] ¿`CHANGELOG.md` registra el cambio con el porqué, no solo el qué?
- [ ] ¿Se verificó compatibilidad hacia atrás (`ADR-004`, principio 16)?
- [ ] ¿Aprobación explícita del Product Owner recibida?

## 12. Definition of Done

✓ Estándar oficial de ingeniería definido (§4).
✓ Reglas obligatorias para todos los módulos (§8).
✓ Ciclo oficial de desarrollo (§6).
✓ Quality Gates (§7).
✓ Gobernanza técnica (§9).
✓ Coherencia con MDS, MPS, ADR y CCEC — con un hallazgo (CCEC) resuelto por decisión explícita del Product Owner (§5).
✓ Utilizable como referencia de onboarding — ver §13, mapa conceptual.
✓ Project Reality Check aplicado a este mismo documento (§12A).

## 12A. Project Reality Check — nuevo estándar

**Decisión del Product Owner (2026-07-12)**: se agrega el Project Reality Check (PRC) como tercera sección obligatoria (junto con Enterprise Architecture Review y Enterprise Readiness) en todo documento MDS/MPS/CCEC/ADR/MES **de tamaño significativo** de aquí en adelante — mismo criterio de proporcionalidad de §7 (un ADR de una sola decisión no necesita un PRC completo; un MDS/MPS/CCEC nuevo sí). Su propósito: evitar que, con el tiempo, se mezcle lo ya implementado con lo que todavía es diseño — el mismo riesgo que motivó separar Engineering Maturity de Implementation Maturity (§14).

**Formato oficial del PRC** — siete preguntas, respuesta breve y honesta:

1. ¿Qué está realmente implementado?
2. ¿Qué solo está diseñado?
3. ¿Qué depende de terceros?
4. ¿Qué requiere una decisión legal?
5. ¿Qué requiere validación del Product Owner?
6. ¿Qué puede desarrollarse inmediatamente?
7. ¿Qué bloquea el avance?

Este documento (MES-001) aplica su propio PRC en §15, como primer ejemplo de referencia para los siguientes documentos que lo incorporen.

---

## 13. Enterprise Architecture Review (obligatorio)

**1. ¿Qué contradicciones encontraste con MDS, MPS, ADR y CCEC?**
La expansión del acrónimo CCEC en el documento de fase ("Compliance, Cybersecurity & Enterprise Compliance") contradecía la ya vigente y usada en 8 documentos ("capacidades compartidas por todo el sistema", definida por el propio usuario). **Resuelta por decisión del Product Owner**: CCEC = Cross-Cutting Enterprise Capabilities (§5) — preserva el alcance amplio ya vigente, aplicada retroactivamente a `CCEC-001`/`004`/`005` en el mismo cambio.

**2. ¿Qué riesgos de escalabilidad existen?**
Ninguno nuevo — se heredan y consolidan los ya documentados: techo de la cola Postgres+`pg_cron` en decenas de miles de empresas (`ADR-008`, `07-*` §8), ausencia de índices compuestos verificados formalmente para tablas de alto volumen (`07-*` §8), y el riesgo, más organizativo que técnico, de que Quality Gates completos aplicados sin proporcionalidad (§7) frenen la velocidad de un equipo pequeño sin aportar seguridad real equivalente.

**3. ¿Qué decisiones deberían convertirse en nuevos ADR?**
(a) ~~La resolución final del significado de CCEC~~ — resuelta directamente en §5, no ameritó ADR propio (es nomenclatura, no arquitectura). (b) ~~Formalizar Quality Gates proporcionales~~ — resuelto como política vinculante directamente en §7 por decisión del Product Owner, tampoco ameritó ADR propio. (c) **Sí se materializa como ADR**: la Progressive Infrastructure Strategy (`ADR-016`, creado en este mismo cambio) — formaliza que una capacidad puede documentarse completa en estado `Designed`/`Planned` sin ser una inconsistencia, resolviendo la pregunta que este documento tenía abierta sobre Observabilidad. La decisión de cuándo introducir CI/testing automatizado sigue sin fecha ni condición explícita — candidata a un ADR futuro cuando se tome esa decisión, no antes.

**4. ¿Qué deberíamos rediseñar antes del desarrollo?**
Nada de lo ya diseñado en MDS/MPS requiere rediseño — la Constitución confirma coherencia retroactiva, no la rompe. Lo que falta no es rediseño, es **implementación**: `CCEC-001`/`CCEC-004` siguen sin una sola línea de código real más allá de `v19` (auditoría de impersonación), y el modelo channel-agnostic del CIE sigue sin validarse contra un segundo canal real (`MPS-002-001` §14).

**5. ¿Qué dependencias externas existen?**
Supabase (plan Free, backup gestionado ausente — `10E`), GitHub Pages, Meta Graph API (`ADR-010`), un proveedor de IA vía proxy (Groq hoy, intercambiable — `ADR-007`), y, a futuro, Stripe/Mercado Pago (`10B`) — ninguna dependencia nueva introducida por este documento.

**6. ¿Qué supuestos se realizaron?**
Que el equipo seguirá siendo pequeño en el corto plazo (justifica Quality Gates proporcionales, §7, y ausencia de Branch Strategy/PR/Code Review formales, §8) — un supuesto explícito, no oculto, que dejará de sostenerse el día que se sume una segunda persona de ingeniería.

**7. ¿Qué oportunidades de mejora detectaste?**
(a) ~~Resolver la contradicción de CCEC~~ — hecho, ver §5. (b) Priorizar la implementación real de `CCEC-001`/`004` sobre seguir diseñando nuevos MDS/MPS — es el vacío más repetido de toda la documentación (señalado independientemente en MDS-008, 009, 010, y aquí por cuarta vez) — **ya no se considera inconsistencia bajo `ADR-016`, pero sigue siendo la prioridad de ejecución más alta** (ver Implementation Maturity, §14). (c) Definir una condición de activación explícita para testing automatizado, en vez de dejarlo indefinidamente como "cuando haga falta". (d) *(Nueva, surgida de esta misma revisión)* Adoptar el Project Reality Check (§12A) en los documentos de mayor tamaño ya existentes (los 2 MPS, los 3 CCEC) para que reflejen el nuevo estándar, no solo los que se escriban de aquí en adelante.

**8. ¿Qué impacto tendrá este estándar sobre todo el ecosistema MAHP?**
Retroactivo: todo MDS/MPS/CCEC/ADR ya existente queda, a partir de hoy, sujeto a los principios de §4 y las reglas de §8 — la mayoría ya los cumplía de facto (por eso este documento pudo escribirse citando ejemplos reales, no hipotéticos, en casi cada principio); los que no (Branch Strategy, PR, Code Review, Testing formal) quedan documentados como brechas conocidas, no como incumplimientos ocultos.

**9. ¿Mantiene la visión original de MAHP?**
Sí. La tensión señalada en la primera versión de este documento (9 Quality Gates y ciclo de 16 etapas vs. `PROJECT-BLUEPRINT.md` §5 principio 5, simplicidad) quedó resuelta con la política de proporcionalidad vinculante (§7): la Constitución existe completa para cuando el equipo/producto la necesite completa, pero se aplica hoy de forma proporcional, nunca de forma literal a un ajuste menor. La Progressive Infrastructure Strategy (`ADR-016`) refuerza la misma visión desde otro ángulo: diseñar completo y honesto antes de construir (`PROJECT-BLUEPRINT.md`, filosofía fundacional) sigue siendo el método, documentar ese diseño como `Designed` en vez de fingirlo `Production` es exactamente esa honestidad, no una desviación de ella.

**10. Recomendación**:
☑ **Aprobado**

Justificación: las dos observaciones que motivaban "Aprobar con observaciones" en la revisión anterior (CCEC, proporcionalidad de Quality Gates) fueron resueltas por decisión explícita del Product Owner en este mismo cambio, junto con tres mejoras adicionales que el propio proceso de revisión hizo emerger (Estados de Madurez, Progressive Infrastructure Strategy, Project Reality Check). El documento cumple su Definition of Done, es coherente con el 100% del Master Manual existente, y no tiene observaciones abiertas pendientes de decisión.

---

## 14. Engineering Maturity & Implementation Maturity

**Decisión del Product Owner (2026-07-12)**: la Enterprise Readiness Score original combinaba calidad de arquitectura con estado real de construcción en un solo número — bajo la Progressive Infrastructure Strategy (`ADR-016`), eso penalizaba injustamente un diseño excelente todavía no construido. Se dividen en dos métricas independientes, cada una con su propio total — nunca sumadas entre sí.

### 14.1 Engineering Maturity Score — calidad del diseño, independiente de si está construido

| Dimensión | Puntaje (0–10) | Justificación |
|---|---|---|
| Arquitectura general | 9 | Consistente en 100+ documentos, sin contradicciones internas tras esta revisión (CCEC resuelto, §5) |
| Estándares y principios (este documento) | 9 | 20 principios justificados con ejemplo real, no aspiracional; ciclo de desarrollo y Quality Gates definidos con proporcionalidad |
| Diseño de seguridad | 8 | RLS como única autoridad, `security definer` con regla de justificación explícita (`07F` §2) — diseño maduro, validado por el propio incidente `v16`/`v18` resuelto con rigor |
| Diseño de IA | 8 | Human in the Loop y Explainable AI no negociables desde el diseño (`ADR-007`, `ADR-009`, `ADR-014`), aplicados consistentemente en cada agente/motor diseñado |
| Diseño de observabilidad | 9 | `CCEC-004` es un diseño completo de logs/métricas/alertas en tres capas, sin vacíos conceptuales |
| Diseño de auditoría | 9 | `CCEC-001` con catálogo de eventos, política de acceso/retención y guía de integración completos |
| Diseño de escalabilidad | 8 | Multi-tenant por columna con límites reconocidos explícitamente (`07-*` §8, `ADR-008`), no un techo descubierto por sorpresa |
| Documentación | 10 | 100+ documentos con honestidad de estado consistente — el estándar más alto de todo este proyecto, sin excepción encontrada |
| Gobernanza (diseño del proceso) | 9 | Ciclo de aprobación por fases, ADR con plantilla y regla de gobierno, Quality Gates proporcionales — proceso maduro en el papel |

**Engineering Maturity total: 79/90 (88%)**

### 14.2 Implementation Maturity Score — cuánto de ese diseño está realmente construido y operando

| Dimensión | Puntaje (0–10) | Justificación |
|---|---|---|
| Producto core (Marketing/Operaciones/Gamificación) | 7 | ~22 módulos reales en `MODULOS.md`, un cliente operando establemente |
| Seguridad operativa | 6 | RLS funcionando en producción real; auditoría (`CCEC-001`) con 1 de ~15 eventos catalogados implementado (`v19`) |
| IA | 1 | 1 de ~30 agentes/motores diseñados está construido (Calendar Planner) |
| Observabilidad | 1 | `CCEC-004` con cero implementación — ni una métrica propia capturada hoy |
| Automatización / Integraciones | 0 | `09-*`/`08-*` completamente diseñados, cero construido |
| Testing / CI | 0 | Sin práctica formal de ningún tipo todavía |
| Continuidad / Backup | 3 | Respaldo semanal manual ya operando (`10E` §6) — mitigación real, no backup gestionado completo |
| Gobernanza (operación real) | 4 | Proceso de aprobación practicado con rigor; roles de destino sin operar (equipo de una persona) |

**Implementation Maturity total: 22/80 (28%)**

### 14.3 Lectura conjunta, sin combinar los números

La brecha entre 88% (diseño) y 28% (construcción) **no es un problema** bajo `ADR-016` — es la fotografía honesta de un proyecto que, deliberadamente, documenta completo antes de construir (`PROJECT-BLUEPRINT.md`, filosofía fundacional). Sería una señal de alarma real si Implementation Maturity superara a Engineering Maturity (construir sin diseñar primero) — lo contrario es exactamente el método que este proyecto eligió y que esta Constitución formaliza.

**Qué falta para que Implementation Maturity avance, en orden de impacto**: (1) implementar `CCEC-001`/`CCEC-004` en código real — el gap más repetido de toda la documentación; (2) introducir alguna forma de testing antes del siguiente módulo con impacto de negocio real (Social AI Hub calificaría); (3) confirmar o migrar el plan de Supabase para backup gestionado real (`10E` §2, sigue pendiente); (4) construir la primera integración/automatización real de `08-*`/`09-*`.

---

## 15. Project Reality Check — MES-001

Primer PRC de `/docs`, aplicado a este mismo documento como referencia para los siguientes (§12A).

**1. ¿Qué está realmente implementado?** El estándar mismo, como documento: los 20 principios, el ciclo de desarrollo, los Quality Gates y sus reglas ya rigen esta sesión de trabajo de facto (por eso cada principio cita un ejemplo real, no hipotético). `v18`/`v19` en producción real.

**2. ¿Qué solo está diseñado?** Prácticamente toda la Implementation Maturity de §14.2: IA (1/10), Observabilidad (1/10), Automatización/Integraciones (0/10), Testing (0/10).

**3. ¿Qué depende de terceros?** Supabase (plan/backups, `10E`), Meta Graph API (`ADR-010`), el proveedor de IA vía proxy (`ADR-007`) — ninguno introducido por MES-001, todos heredados.

**4. ¿Qué requiere una decisión legal?** Nada de este documento directamente — hereda sin cambio el prerrequisito ya señalado en `CCEC-005` (consulta legal de privacidad, todavía pendiente).

**5. ¿Qué requiere validación del Product Owner?** Ya recibida en este mismo ciclo: CCEC, Enterprise Readiness dividida, Progressive Infrastructure Strategy, Estados de Madurez, Quality Gates proporcionales, y el propio PRC como estándar nuevo.

**6. ¿Qué puede desarrollarse inmediatamente?** `ADR-016` (este cambio). La re-etiquetación de módulos existentes con los 7 Estados de Madurez, si se prioriza (§4A, "no se ejecuta en este cambio").

**7. ¿Qué bloquea el avance?** Nada bloquea que MES-001 se suba a git — es la última aprobación pendiente (§13 Q10, ya `Aprobado`). Lo que sí sigue bloqueado, heredado de fases anteriores: la decisión de modelo de organización/sucursales (`10C`), la verificación de la ventana de 24h de Meta (`MPS-002-001` §1), y la consulta legal de `CCEC-005`.

---

## Entregable Final

**1. Resumen ejecutivo**: MES-001 confirma, con números ya separados correctamente (§14), que MAHP tiene una **Engineering Maturity de 88%** — disciplina de diseño, arquitectura y gobierno genuinamente madura — frente a una **Implementation Maturity de 28%**, la brecha esperada y correcta de un proyecto que documenta completo antes de construir (`ADR-016`), no una señal de alarma. El punto más fuerte sigue siendo Documentación (10/10); el de mayor oportunidad de ejecución, Automatización/Integraciones/Testing (0/10 cada uno) — diseñados por completo, sin una sola línea construida.

**2. Mapa conceptual del estándar**:
```
                    MES-001 (esta Constitución)
                              │
    ┌───────────────┬─────────┼─────────┬───────────────┬──────────────┐
    ▼               ▼         ▼         ▼               ▼              ▼
20 Principios  Estados de  Ciclo de  9 Quality      Enterprise     Project
(§4)           Madurez     16 etapas  Gates          Architecture   Reality
               (§4A, 7      (§6)      (§7,           Review +       Check
               estados)               proporcionales) Maturity      (§12A,
                                                       Score x2      nuevo
                                                       (§13/§14)     estándar)
    │               │         │         │               │              │
    └───────────────┴─────────┴─────────┴───────────────┴──────────────┘
                                        ▼
                          Rige: MDS · MPS · ADR · CCEC
                          (retroactivo, §13 Q8; CCEC = Cross-Cutting
                           Enterprise Capabilities, §5)
```

**3. Roadmap para desarrollar los siguientes documentos MES**: `MES-002` (Testing & Quality Standards — activaría Implementation Maturity de Calidad, hoy 0/10), `MES-003` (DevOps & CI/CD Standards — condición de activación explícita para lo señalado como `Proposed` en §4 principio 13 y §8), `MES-004` (Observability Implementation Standards — el puente entre `CCEC-004` en `Designed` y observabilidad real en `Production`).

**4. Recomendaciones para evolucionar la metodología**: (a) tratar "implementar lo ya diseñado en CCEC" como su propia iniciativa priorizada — sigue siendo la brecha de Implementation Maturity más repetida, ahora medida formalmente (§14.2); (b) considerar que el próximo módulo con clientes reales (Social AI Hub) sea el primero en pasar por testing real, estableciendo el precedente; (c) aplicar el Project Reality Check (§12A) a los documentos grandes ya existentes (2 MPS, 3 CCEC) en una futura sesión de mantenimiento documental, no solo a los nuevos; (d) decidir, en algún momento futuro, si se prioriza la re-etiquetación de `/docs` existente a los 7 Estados de Madurez (§4A) o se deja que ocurra orgánicamente conforme cada documento se revisite.

**No se implementó código, pantallas, APIs ni base de datos en esta fase — solo la Constitución de Ingeniería, conforme a las reglas de MES-001. No avanzar a la siguiente fase hasta recibir la aprobación explícita del Product Owner.**
