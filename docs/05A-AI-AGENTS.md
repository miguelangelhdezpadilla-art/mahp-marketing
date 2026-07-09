# AI AGENTS — Catálogo Oficial de Agentes de MAHP

> MDS-006, Documento 2 de 6. Los 24 agentes del ecosistema de IA. **Ninguno
> está construido salvo Calendar Planner** (marcado `[EXISTE]`); los 23
> restantes son diseño — perfil completo para cuando se prioricen (ver plan
> de fases en el resumen ejecutivo de esta fase). Todos siguen la arquitectura
> de `05-AI-ECOSYSTEM.md` §3 (Edge Function propia, revisión humana
> obligatoria antes de publicar) y el estándar de prompts de
> `05D-AI-PROMPT-STANDARDS.md`.
>
> Formato por agente: Objetivo · Descripción · Funciones · Permisos ·
> Entradas/Salidas · Fuentes de información · Módulos con los que interactúa ·
> Limitaciones · Ejemplo de uso · Indicador de éxito.
>
> Última actualización: 2026-07-09.

---

## Grupo 1 — Estrategia y Planeación

### 1. Marketing Strategist *(orquestador)*
| | |
|---|---|
| **Objetivo** | Interpretar una solicitud del usuario en lenguaje natural y coordinar qué otros agentes invocar |
| **Descripción** | Único punto de entrada conversacional futuro del ecosistema — no genera contenido por sí mismo, delega (`05-AI-ECOSYSTEM.md` §3) |
| **Funciones** | Clasificar intención · seleccionar agente(s) · pasar contexto relevante · consolidar resultado final |
| **Permisos** | `company_admin`, `super_admin` |
| **Entradas** | Solicitud en lenguaje natural + contexto de empresa/campaña activa |
| **Salidas** | Resultado de uno o más agentes, presentado de forma unificada |
| **Fuentes de información** | Ninguna directa — reenvía a los agentes correspondientes |
| **Módulos** | Todos, indirectamente |
| **Limitaciones** | En la V1, reglas de enrutamiento simples, no razonamiento complejo multi-paso |
| **Ejemplo de uso** | *"Prepárame la campaña de diciembre"* → invoca Campaign Planner → Content Creator → Calendar Planner en secuencia |
| **Indicador de éxito** | % de solicitudes enrutadas al agente correcto sin que el usuario tenga que repetir/corregir |

### 2. Campaign Planner
| | |
|---|---|
| **Objetivo** | Estructurar una campaña nueva (objetivos, canales, duración) antes de generar actividades |
| **Descripción** | Llena el paso que hoy hace un `company_admin` a mano en el formulario de campaña |
| **Funciones** | Proponer objetivos medibles (KPIs) · sugerir duración/canales según el tipo de negocio · dejar la campaña lista para que Calendar Planner genere actividades |
| **Permisos** | `company_admin` |
| **Entradas** | Descripción libre del objetivo de negocio, giro de la empresa |
| **Salidas** | Borrador de `campaigns` + `kpis` asociados, sin publicar hasta revisión |
| **Fuentes de información** | `campaigns`/`kpis` históricos de la empresa (para no repetir objetivos ya usados) |
| **Módulos** | Campañas, KPIs |
| **Limitaciones** | No conoce el mercado del cliente más allá de lo que la empresa ya registró — no sustituye investigación de mercado real |
| **Ejemplo de uso** | *"Quiero una campaña para el Día del Padre"* → propone objetivo, 2 canales, 3 semanas de duración |
| **Indicador de éxito** | % de campañas propuestas que se aceptan sin modificar la estructura base |

### 3. Calendar Planner — **[EXISTE]**
| | |
|---|---|
| **Objetivo** | Generar un calendario de actividades ejecutable a partir de una campaña |
| **Descripción** | Ya construido — `js/shared/ia.js` + Edge Function `generar-calendario` (`IA.md`) |
| **Funciones** | Generar entre 4 y 31 actividades según frecuencia; asignar canal y fecha por actividad |
| **Permisos** | `company_admin` |
| **Entradas** | Campaña, canales, mes, frecuencia, contexto (`IA.md` §3) |
| **Salidas** | Lista de actividades propuestas (`titulo`, `canal`, `fecha`, `descripcion`) |
| **Fuentes de información** | `campaigns`, `social_channels` |
| **Módulos** | Calendario, Actividades |
| **Limitaciones** | Ya documentadas en `IA.md` §6 (un solo colaborador por lote, sin memoria entre generaciones) |
| **Ejemplo de uso** | Ya en uso real por clientes de MAHP |
| **Indicador de éxito** | % de actividades generadas que se publican sin editar (ya medible con datos reales) |

### 4. Project Coordinator
| | |
|---|---|
| **Objetivo** | Vigilar que las actividades de una campaña avancen a tiempo y avisar de retrasos |
| **Descripción** | Versión de IA del seguimiento manual que hoy hace un `company_admin` revisando el calendario |
| **Funciones** | Detectar actividades vencidas sin reportar avance · sugerir redistribución de carga entre colaboradores |
| **Permisos** | `company_admin`, `director` (solo lectura) |
| **Entradas** | Estado de `actividades`/`activity_updates` de una campaña |
| **Salidas** | Lista de alertas priorizadas, no acción directa |
| **Fuentes de información** | `actividades`, `activity_updates`, `profiles` (carga por colaborador) |
| **Módulos** | Actividades, Colaboradores |
| **Limitaciones** | No reasigna tareas por sí mismo — solo sugiere, la reasignación la hace un humano (ya la herramienta de `MODULOS.md` #22) |
| **Ejemplo de uso** | *"3 actividades de esta campaña llevan 5 días sin avance"* |
| **Indicador de éxito** | Reducción del tiempo promedio entre que una actividad se atrasa y alguien actúa |

---

## Grupo 2 — Contenido y Creatividad

### 5. Content Creator
| | |
|---|---|
| **Objetivo** | Redactar el contenido completo de una actividad ya planeada (más allá del título que ya da Calendar Planner) |
| **Descripción** | Ya previsto en `02-ARCHITECTURE` §11 — expande la `descripcion` de una actividad a un texto listo para publicar |
| **Funciones** | Redactar copy por canal · adaptar tono a la personalidad de marca de esa empresa (`01-IDENTIDAD-DEL-PRODUCTO.md` §11 como referencia, adaptado por empresa cliente) |
| **Permisos** | `company_admin`, `collaborator` (sobre sus propias tareas asignadas) |
| **Entradas** | Actividad ya planeada (título, canal, contexto de campaña) |
| **Salidas** | Texto de `descripcion` propuesto |
| **Fuentes de información** | La actividad misma, campaña asociada, estrategias publicadas (`strategies`) |
| **Módulos** | Actividades, Estrategias |
| **Limitaciones** | No genera imágenes/video — solo texto (ver Graphic & Creative Director, Video Campaign Advisor) |
| **Ejemplo de uso** | Actividad "Post de lanzamiento" → propone 3 versiones cortas de copy |
| **Indicador de éxito** | % de contenido generado que se publica con edición mínima |

### 6. Copywriter
| | |
|---|---|
| **Objetivo** | Especializarse en textos publicitarios de conversión (anuncios pagados, CTAs) — distinto de Content Creator, que cubre contenido orgánico |
| **Descripción** | Foco en persuasión y llamada a la acción, no en narrativa de marca general |
| **Funciones** | Generar variantes de copy para pruebas A/B · ajustar longitud según el canal (anuncio de Meta vs. descripción de Google) |
| **Permisos** | `company_admin` |
| **Entradas** | Objetivo de conversión, público objetivo, canal publicitario |
| **Salidas** | 2–4 variantes de copy corto |
| **Fuentes de información** | Campaña activa, resultados de copy anterior si existen (`05E-AI-MEMORY-AND-CONTEXT.md`) |
| **Módulos** | Campañas, futura integración de Advertising (`02-ARCHITECTURE` §12) |
| **Limitaciones** | Depende de que exista integración de pauta publicitaria (§12 de arquitectura, no construida) para medir resultado real — sin eso, no puede aprender qué variante funcionó mejor |
| **Ejemplo de uso** | *"Necesito 3 variantes de anuncio para Instagram Ads"* |
| **Indicador de éxito** | Tasa de conversión de la variante elegida (requiere integración publicitaria) |

### 7. Graphic & Creative Director
| | |
|---|---|
| **Objetivo** | Sugerir dirección visual/formato para una actividad (ya esbozado como "Creative Director" en `02-ARCHITECTURE` §11) |
| **Descripción** | No genera imágenes — recomienda qué tipo de pieza visual encaja mejor |
| **Funciones** | Sugerir formato (carrusel, imagen única, historia) según canal y objetivo · recomendar paleta/tono visual consistente con la marca de la empresa cliente |
| **Permisos** | `company_admin` |
| **Entradas** | Actividad + canal |
| **Salidas** | Recomendación de formato en texto, no el asset final |
| **Fuentes de información** | Canal, historial de qué formatos usó antes esa empresa |
| **Módulos** | Actividades |
| **Limitaciones** | No genera imágenes reales — eso requeriría integrar un modelo de generación de imágenes, decisión de producto no tomada |
| **Ejemplo de uso** | *"¿Qué formato uso para este post de Instagram?"* → "Carrusel de 3 imágenes, tono cálido" |
| **Indicador de éxito** | Adopción de la recomendación (el colaborador sigue el formato sugerido) |

### 8. Video Campaign Advisor
| | |
|---|---|
| **Objetivo** | Asesorar en guiones/estructura de contenido en video (reels, TikToks) |
| **Descripción** | Especialización de Content Creator para el formato video, dado su peso creciente en redes |
| **Funciones** | Proponer estructura de guion corto (gancho, desarrollo, CTA) · sugerir duración óptima por plataforma |
| **Permisos** | `company_admin`, `collaborator` |
| **Entradas** | Objetivo de la pieza, canal (TikTok/Reels/Shorts) |
| **Salidas** | Guion en texto, no el video en sí |
| **Fuentes de información** | Canal, campaña |
| **Módulos** | Actividades |
| **Limitaciones** | No produce ni edita video — solo la estructura narrativa |
| **Ejemplo de uso** | *"Necesito un guion de reel de 15 segundos para promocionar el menú nuevo"* |
| **Indicador de éxito** | % de guiones usados sin reescritura mayor |

### 9. SEO Specialist
| | |
|---|---|
| **Objetivo** | Optimizar contenido de texto para posicionamiento en buscadores |
| **Descripción** | Foco en contenido de largo plazo (blog, Google Business) más que en redes sociales |
| **Funciones** | Sugerir palabras clave relevantes al giro de la empresa · revisar longitud/estructura de un texto ya generado |
| **Permisos** | `company_admin` |
| **Entradas** | Texto ya redactado (de Content Creator u otro origen), giro del negocio |
| **Salidas** | Sugerencias de ajuste, no reescritura automática |
| **Fuentes de información** | Contenido de la actividad, integración futura de Google Business (`02-ARCHITECTURE` §12) |
| **Módulos** | Actividades |
| **Limitaciones** | Sin integración con Google Search Console (no prevista en el corto plazo), no puede medir posicionamiento real — solo aplica buenas prácticas generales |
| **Ejemplo de uso** | *"Revisa este texto para SEO local"* |
| **Indicador de éxito** | Requiere integración externa para medirse con datos reales — en el corto plazo, solo adopción de las sugerencias |

---

## Grupo 3 — Canales y Comunidad

### 10. Social Media Manager
| | |
|---|---|
| **Objetivo** | Dar una vista consolidada del estado de todos los canales sociales de la empresa |
| **Descripción** | Complementa el módulo de Seguidores (`MODULOS.md` #16) con narrativa, no solo números |
| **Funciones** | Resumir crecimiento/caída de seguidores por canal · señalar el canal con mejor/peor desempeño del periodo |
| **Permisos** | `company_admin`, `director` |
| **Entradas** | Rango de fechas |
| **Salidas** | Resumen en texto + referencia a los números reales (nunca reemplaza la tabla, la explica) |
| **Fuentes de información** | `follower_logs`, `follower_totals`, `follower_goals_progress` |
| **Módulos** | Seguidores, Metas de seguidores |
| **Limitaciones** | Tan bueno como los datos que la empresa registre manualmente (`follower_logs` depende de reporte humano, no de integración directa con las redes — ver §12 de arquitectura) |
| **Ejemplo de uso** | *"¿Cómo van mis redes este mes?"* → "Instagram creció 8%, Facebook se estancó" |
| **Indicador de éxito** | Reducción de tiempo que el admin pasa revisando la tabla de seguidores manualmente |

### 11. Community Manager Advisor
| | |
|---|---|
| **Objetivo** | Sugerir cómo responder a la comunidad (comentarios, mensajes) — asesor, no ejecutor |
| **Descripción** | No publica ni responde directamente — MAHP hoy no tiene integración con las bandejas de mensajería de cada red (§12 de arquitectura) |
| **Funciones** | Sugerir tono de respuesta ante un escenario descrito por el usuario |
| **Permisos** | `company_admin`, `collaborator` |
| **Entradas** | Descripción del comentario/situación a responder (pegado manualmente, sin integración) |
| **Salidas** | Sugerencia de respuesta |
| **Fuentes de información** | Personalidad de marca de la empresa |
| **Módulos** | Ninguno directo — es un agente independiente hasta que exista integración de mensajería |
| **Limitaciones** | Depende 100% de que el usuario le pegue el contexto manualmente — sin integración real con Meta/WhatsApp, no puede ver mensajes por sí mismo |
| **Ejemplo de uso** | *"Un cliente se quejó de que llegó tarde su pedido, ¿cómo respondo?"* |
| **Indicador de éxito** | Solo medible cualitativamente hasta que exista integración |

### 12. Advertising Advisor
| | |
|---|---|
| **Objetivo** | Asesorar en configuración básica de campañas pagadas (presupuesto, segmentación) |
| **Descripción** | Asesor, no ejecutor — no crea la campaña publicitaria por sí mismo (requiere integración con Meta/Google Ads, §12 de arquitectura) |
| **Funciones** | Sugerir presupuesto inicial razonable según objetivo · recomendar segmentación básica |
| **Permisos** | `company_admin` |
| **Entradas** | Objetivo de campaña, presupuesto disponible |
| **Salidas** | Recomendación en texto |
| **Fuentes de información** | Campaña activa |
| **Módulos** | Campañas |
| **Limitaciones** | Sin integración con plataformas de pauta, no puede confirmar resultados reales ni ejecutar la configuración |
| **Ejemplo de uso** | *"Tengo $2,000 MXN para promover este evento, ¿cómo lo distribuyo?"* |
| **Indicador de éxito** | Requiere integración publicitaria para medirse con datos reales |

### 13. Customer Experience Advisor
| | |
|---|---|
| **Objetivo** | Sugerir mejoras a la experiencia del cliente final de la empresa cliente (no del usuario de MAHP) a partir de patrones en las actividades/campañas |
| **Descripción** | Agente de nivel más estratégico — analiza qué tipo de campañas generan mejor respuesta |
| **Funciones** | Identificar qué canal/tipo de contenido tiene mejor relación avance-resultado |
| **Permisos** | `company_admin`, `director` |
| **Entradas** | Historial de campañas cerradas |
| **Salidas** | Insight cualitativo, no una acción |
| **Fuentes de información** | `campaigns`, `kpis`, `follower_goals_progress` |
| **Módulos** | Campañas, KPIs, Seguidores |
| **Limitaciones** | Sin datos del cliente final real (encuestas, reseñas) — infiere solo de datos internos de MAHP |
| **Ejemplo de uso** | *"¿Qué tipo de campaña le ha funcionado mejor a este restaurante?"* |
| **Indicador de éxito** | Precisión percibida del insight (retroalimentación cualitativa del usuario) |

---

## Grupo 4 — Análisis y Resultados

### 14. Business Analyst
| | |
|---|---|
| **Objetivo** | Resumir el desempeño de una campaña cerrada en lenguaje humano |
| **Descripción** | Ya previsto en `02-ARCHITECTURE` §11 |
| **Funciones** | Generar resumen ejecutivo de campaña · comparar contra campañas anteriores similares |
| **Permisos** | `company_admin`, `director` |
| **Entradas** | Campaña ya cerrada/completada |
| **Salidas** | Texto de resumen, nunca modifica datos |
| **Fuentes de información** | `campaigns`, `kpis`, `actividades`, `activity_updates` de esa campaña |
| **Módulos** | Campañas, Reportes |
| **Limitaciones** | La calidad del resumen depende de que la campaña tenga datos suficientes reportados |
| **Ejemplo de uso** | *"Resume cómo fue la campaña de Mundial 2026"* |
| **Indicador de éxito** | % de resúmenes que el usuario usa tal cual para reportar a dirección, sin reescribir |

### 15. KPI Advisor
| | |
|---|---|
| **Objetivo** | Detectar KPIs atrasados respecto a su meta y explicar por qué |
| **Descripción** | Ya previsto en `02-ARCHITECTURE` §11 — primer candidato de expansión del ecosistema (`05-AI-ECOSYSTEM.md` §8) |
| **Funciones** | Comparar `current_value` vs. `target_value` ajustado por tiempo transcurrido del periodo · señalar la causa probable (poca actividad reciente, canal débil) |
| **Permisos** | `company_admin`, `director` |
| **Entradas** | KPIs activos de la empresa |
| **Salidas** | Alerta priorizada con explicación |
| **Fuentes de información** | `kpis`, `actividades` relacionadas |
| **Módulos** | KPIs, Dashboard |
| **Limitaciones** | La causa que sugiere es una correlación, no una certeza — se presenta como hipótesis, no como diagnóstico definitivo |
| **Ejemplo de uso** | *"Reseñas en Google va 30% atrasado — solo 2 actividades de ese canal este mes"* |
| **Indicador de éxito** | Tiempo entre que un KPI se atrasa y el usuario se entera (objetivo: mismo día, no fin de mes) |

### 16. Data Analyst
| | |
|---|---|
| **Objetivo** | Responder preguntas específicas de datos en lenguaje natural, sin que el usuario tenga que interpretar una tabla |
| **Descripción** | Más genérico que Business Analyst (que se enfoca en campañas) — cubre cualquier pregunta de datos del sistema |
| **Funciones** | Traducir una pregunta en español a una consulta acotada por RLS · presentar el resultado en texto/tabla simple |
| **Permisos** | `company_admin`, `director` |
| **Entradas** | Pregunta en lenguaje natural |
| **Salidas** | Respuesta en texto, con el dato exacto citado |
| **Fuentes de información** | Cualquier tabla a la que el rol del usuario ya tenga acceso vía RLS — nunca más de lo que el usuario vería manualmente |
| **Módulos** | Todos, de solo lectura |
| **Limitaciones** | No genera SQL arbitrario sin restricción — las preguntas se mapean a consultas predefinidas y seguras, no a ejecución libre (`05C-AI-GOVERNANCE.md` §5) |
| **Ejemplo de uso** | *"¿Cuántas actividades completó Juan este mes?"* |
| **Indicador de éxito** | % de preguntas respondidas correctamente sin que el usuario tenga que ir a verificar manualmente |

---

## Grupo 5 — Operación y Automatización

### 17. Automation Expert
| | |
|---|---|
| **Objetivo** | Proponer reglas de automatización basadas en patrones repetidos de trabajo manual |
| **Descripción** | Ya previsto en `02-ARCHITECTURE` §11/§13 |
| **Funciones** | Detectar acciones manuales repetitivas (ej. el mismo tipo de actividad creada cada semana) · proponer una regla para el motor de automatización (`02-ARCHITECTURE` §13) |
| **Permisos** | `company_admin` |
| **Entradas** | Historial de actividades de la empresa |
| **Salidas** | Sugerencia de regla, no la activa por sí mismo |
| **Fuentes de información** | `actividades` históricas |
| **Módulos** | Automatizaciones |
| **Limitaciones** | Depende de que exista el motor de automatización con cola (`02-ARCHITECTURE` §13), no construido — sin eso, sus sugerencias no se pueden activar directamente, solo informar |
| **Ejemplo de uso** | *"Cada lunes creas una actividad de 'Promo de la semana' — ¿quieres automatizarlo?"* |
| **Indicador de éxito** | % de reglas sugeridas que el usuario activa |

### 18. Workflow Optimizer
| | |
|---|---|
| **Objetivo** | Sugerir mejoras al flujo de trabajo del equipo (no solo automatizar una tarea puntual, sino todo el proceso) |
| **Descripción** | Nivel más alto que Automation Expert — mira el proceso completo, no una tarea aislada |
| **Funciones** | Identificar cuellos de botella (ej. actividades que tardan mucho en pasar de "pendiente" a "en progreso") |
| **Permisos** | `company_admin` |
| **Entradas** | Historial de estados de actividades |
| **Salidas** | Recomendación de proceso, en texto |
| **Fuentes de información** | `actividades`, `activity_updates` |
| **Módulos** | Actividades, Colaboradores |
| **Limitaciones** | Recomendación cualitativa — no reestructura el equipo ni reasigna por sí mismo |
| **Ejemplo de uso** | *"Las tareas asignadas a Ana tardan el doble en completarse que las de Luis — ¿está sobrecargada?"* |
| **Indicador de éxito** | Reducción del tiempo promedio de ciclo de una actividad tras aplicar la recomendación |

### 19. Quality Assurance Advisor
| | |
|---|---|
| **Objetivo** | Revisar contenido generado por otros agentes (o por humanos) antes de publicarse, buscando inconsistencias |
| **Descripción** | Meta-agente — su entrada típica es la salida de otro agente, no datos crudos |
| **Funciones** | Verificar que el tono coincide con la personalidad de marca · señalar inconsistencias (fechas, nombres de canal mal escritos) |
| **Permisos** | `company_admin` |
| **Entradas** | Contenido ya generado (por Content Creator, Copywriter, etc.) |
| **Salidas** | Lista de observaciones, no corrige automáticamente |
| **Fuentes de información** | El contenido a revisar + personalidad de marca de la empresa |
| **Módulos** | Actividades |
| **Limitaciones** | No reemplaza revisión humana — es una segunda opinión adicional, no la aprobación final |
| **Ejemplo de uso** | Revisa un lote de 10 actividades generadas por Calendar Planner antes de publicarlas |
| **Indicador de éxito** | Reducción de errores que llegan a publicarse (medible comparando antes/después de activar este agente) |

---

## Grupo 6 — Verticales Especializados

### 20. Franchise Operations Advisor
| | |
|---|---|
| **Objetivo** | Asesorar en consistencia de marketing entre varias sucursales de una franquicia |
| **Descripción** | **[FUTURO — depende de un cambio de modelo de datos]**: requiere el concepto de "empresa padre / empresas hijas" ya identificado como brecha en `04C-UX-GUIDELINES.md` §16 (rol "Franquiciatario") — no se puede construir antes de que ese modelo exista |
| **Funciones** | Comparar desempeño entre sucursales · sugerir que una campaña exitosa en una sucursal se replique en otras |
| **Permisos** | Rol "Franquiciatario" **[no existe todavía]** |
| **Entradas** | Datos agregados de varias `companies` relacionadas |
| **Salidas** | Comparativo entre sucursales |
| **Fuentes de información** | `campaigns`/`kpis` de múltiples empresas del mismo grupo |
| **Módulos** | Requiere el módulo Multiempresa jerárquico, no construido |
| **Limitaciones** | Bloqueado por completo hasta que exista el modelo de datos correspondiente |
| **Ejemplo de uso** | *"¿Qué sucursal tuvo mejor desempeño este trimestre?"* |
| **Indicador de éxito** | No aplicable hasta construir el prerequisito |

### 21. Restaurant Marketing Specialist
| | |
|---|---|
| **Objetivo** | Dar recomendaciones específicas al giro de restaurantes (el mercado inicial validado de MAHP, `01-IDENTIDAD-DEL-PRODUCTO.md` §9) |
| **Descripción** | Versión de Marketing Strategist con conocimiento de dominio específico de restaurantes — promociones de temporada, días de la semana con más tráfico, etc. |
| **Funciones** | Sugerir tipos de promoción típicos del giro (2x1, menú del día) · recomendar frecuencia de publicación según patrones del sector |
| **Permisos** | `company_admin` (de empresas marcadas con giro "restaurante") |
| **Entradas** | Contexto de campaña, temporada del año |
| **Salidas** | Sugerencia de campaña o actividad |
| **Fuentes de información** | Categorías de actividad, historial de campañas de ese giro |
| **Módulos** | Campañas, Calendario |
| **Limitaciones** | Depende de que exista el campo de "giro de negocio" por empresa (hoy no modelado explícitamente — categorías de actividad están fijas en código, `ROADMAP.md`) y de categorías personalizables por empresa (brecha ya identificada) |
| **Ejemplo de uso** | *"Es octubre, ¿qué promoción sugieres para un restaurante?"* |
| **Indicador de éxito** | Adopción de sugerencias específicas de giro vs. genéricas |

---

## Grupo 7 — Soporte Interno

### 22. Executive Assistant
| | |
|---|---|
| **Objetivo** | Resumir lo más relevante que un `company_admin`/`director` necesita saber al entrar a MAHP ese día |
| **Descripción** | Agente de "briefing diario" — no es un chat de propósito general, es un resumen proactivo |
| **Funciones** | Priorizar entre notificaciones, KPIs atrasados y actividades vencidas en un solo resumen corto |
| **Permisos** | `company_admin`, `director` |
| **Entradas** | Estado actual de la empresa (notificaciones, KPIs, actividades) |
| **Salidas** | Resumen breve, tipo "buenos días" |
| **Fuentes de información** | `notifications`, `kpis` (vía KPI Advisor), `actividades` |
| **Módulos** | Dashboard, Notificaciones |
| **Limitaciones** | Reutiliza la salida de otros agentes (KPI Advisor, Project Coordinator) — no analiza datos crudos por sí mismo, es un agregador |
| **Ejemplo de uso** | Al entrar a `empresa.html`: *"Hoy tienes 3 actividades pendientes y un KPI atrasado"* |
| **Indicador de éxito** | Reducción del tiempo que el usuario tarda en entender el estado de su empresa al iniciar sesión |

### 23. Documentation Assistant
| | |
|---|---|
| **Objetivo** | Ayudar a mantener `/docs` sincronizado con el código — uso interno del equipo de MAHP, no de las empresas cliente |
| **Descripción** | Único agente cuyo "usuario" es el propio equipo de desarrollo de MAHP, no una empresa cliente |
| **Funciones** | Señalar cuándo un cambio de código probablemente requiere actualizar `MODULOS.md`/`DATABASE.md` · resumir un conjunto de cambios en una entrada de `CHANGELOG.md` |
| **Permisos** | Equipo de desarrollo de MAHP (no es un rol de la aplicación) |
| **Entradas** | Diff de código o descripción de un cambio |
| **Salidas** | Sugerencia de qué documento actualizar y borrador del texto |
| **Fuentes de información** | El propio repositorio y `/docs` |
| **Módulos** | Ninguno de la app — meta-nivel sobre el propio proyecto |
| **Limitaciones** | Sugiere, no reemplaza el criterio de quien revisa — mismo principio de todo el ecosistema (§1 de `05-AI-ECOSYSTEM.md`) aplicado a la documentación en sí |
| **Ejemplo de uso** | *"Agregué la tabla `X`, ¿qué debo actualizar?"* → señala `DATABASE.md` y propone el texto |
| **Indicador de éxito** | Reducción de brechas de documentación detectadas en auditorías futuras (mismo tipo de brecha ya cerrada manualmente en MDS-001/MDS-003) |

### 24. Innovation Advisor
| | |
|---|---|
| **Objetivo** | Proponer ideas de nuevas funcionalidades o campañas poco convencionales, fuera del patrón habitual de la empresa |
| **Descripción** | El agente más "creativo/estratégico" del catálogo — deliberadamente no operativo |
| **Funciones** | Sugerir un tipo de campaña que la empresa nunca ha probado, basado en tendencias generales del giro |
| **Permisos** | `company_admin` |
| **Entradas** | Historial de campañas de la empresa (para saber qué NO ha probado) |
| **Salidas** | Idea en texto, deliberadamente fuera de lo esperado |
| **Fuentes de información** | `campaigns` históricas |
| **Módulos** | Campañas |
| **Limitaciones** | El menos prioritario del catálogo (§ resumen ejecutivo) — valor especulativo, no operativo, no mide un problema urgente |
| **Ejemplo de uso** | *"Nunca has hecho una colaboración con otro negocio local — ¿lo consideras?"* |
| **Indicador de éxito** | Cualitativo únicamente — no tiene una métrica operativa clara, a diferencia del resto del catálogo |
