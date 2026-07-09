# IDENTIDAD DEL PRODUCTO — Marketing Activity Hub Pro (MAHP)

> Documento oficial de identidad. El ADN de MAHP: toda funcionalidad futura
> debe respetarlo. Si una decisión lo contradice, debe justificarse
> explícitamente o rechazarse — no ignorarse en silencio.
>
> Relación con el resto de `/docs`: este documento desarrolla en profundidad
> lo que `PROJECT-BLUEPRINT.md` capítulos 1, 3, 4 y 5 resumen de forma
> ejecutiva. Donde haya diferencia de matiz, **este documento es la fuente
> autoritativa** de identidad; `PROJECT-BLUEPRINT.md` debe actualizarse para
> apuntar aquí en su próxima revisión.
>
> Última actualización: 2026-07-08.

---

## 1. Identidad del Producto

**Descripción ejecutiva**

Marketing Activity Hub Pro es el sistema operativo donde una empresa organiza, ejecuta y mide su marketing — con inteligencia artificial ayudando a planear y a producir contenido, y con cada persona del equipo viendo exactamente lo que su función necesita, ni más ni menos. No es una hoja de cálculo compartida ni un canal de chat con buenas intenciones: es el lugar donde el trabajo de marketing de una empresa efectivamente sucede, queda registrado, y se puede revisar sin tener que preguntarle a nadie "¿cómo va eso?".

**Descripción técnica**

SaaS multiempresa (multi-tenant) construido sobre Supabase (PostgreSQL con Row Level Security como frontera real de aislamiento entre empresas, Auth, Storage, Edge Functions) y un frontend HTML/JavaScript modular sin framework. Cuatro roles con RLS diferenciada (`super_admin`, `company_admin`, `director`, `collaborator`), un módulo de generación de contenido con IA (Groq) protegido detrás de una Edge Function, y un sistema de gamificación que convierte el cumplimiento operativo en un incentivo visible. Arquitectura completa en `PROJECT-BLUEPRINT.md` Parte II; inventario de módulos en `MODULOS.md`.

---

## 2. Nuestra Historia

MAHP no nació como una idea abstracta de "vamos a construir un SaaS de marketing" — nació como una herramienta real para resolver el problema real de un negocio real. El primer punto de partida fue un calendario de actividades de marketing para **un restaurante**: categorías fijas como Marketing, Operatividad, Mantenimiento e Inversión, un calendario visual, y la necesidad simple de saber qué se iba a publicar y cuándo, sin que esa información viviera solo en la cabeza de una persona.

Ese primer calendario funcionó. Y funcionar reveló algo más grande: el problema no era exclusivo de ese negocio. Cualquier empresa que hace marketing con algo más que una sola persona — donde alguien planea, alguien ejecuta, y alguien más necesita saber cómo va todo sin perseguir a nadie — vive la misma fricción. De ahí nació la decisión de convertir esa herramienta de un solo archivo en una plataforma multiempresa real: con roles, con aislamiento de datos serio, con la disciplina de que lo que funcionaba para un cliente pudiera funcionar para muchos sin que uno viera los datos de otro.

La incorporación de inteligencia artificial no fue el punto de partida — fue una consecuencia natural de haber construido primero la base correcta: una vez que existía una estructura confiable de campañas, actividades y roles, generar esas actividades con ayuda de un modelo de lenguaje dejó de ser una idea ambiciosa y se volvió el siguiente paso lógico. MAHP se construyó de adentro hacia afuera: primero la disciplina operativa, después la inteligencia que la potencia — no al revés.

---

## 3. Propósito

**¿Por qué existe MAHP?**

Porque la mayoría de las empresas que hacen marketing en serio no tienen un problema de falta de ideas — tienen un problema de **ejecución dispersa**. Lo que se planea en una junta se pierde en el camino hacia lo que realmente se publica. Lo que se publica no siempre se sabe si funcionó. Y quien dirige la empresa se entera del estado real de su marketing solo cuando alguien arma un reporte, casi siempre tarde y casi siempre incompleto.

MAHP existe para cerrar esa distancia entre "lo que se decidió" y "lo que realmente pasó" — haciendo que esa información viva en un solo lugar, actualizada por quien hace el trabajo, visible sin fricción para quien necesita saberlo.

**¿Qué impacto quiere generar?**

Que ninguna empresa cliente tenga que elegir entre "crecer su operación de marketing" y "mantener el control sobre ella". Que el tamaño del equipo deje de ser la razón por la que las cosas se caen — que 3 personas coordinadas en MAHP operen con la misma claridad que 30.

---

## 4. Visión

**A 3 años**: MAHP es la base operativa de marketing para un número significativo de PyMEs latinoamericanas de los giros donde ya se ha probado (restaurantes, servicios, comercio) — con generación de contenido por IA que no solo arma calendarios, sino que empieza a detectar por sí sola qué campaña necesita atención antes de que alguien lo pregunte.

**A 5 años**: MAHP atiende no solo empresas individuales sino **agencias que gestionan varias marcas a la vez** desde una sola cuenta, y franquicias que necesitan que cada sucursal opere con autonomía dentro de lineamientos centrales. La plataforma ya no asume un solo tipo de negocio — las categorías de actividad, las plantillas de campaña y las sugerencias de IA se adaptan al giro de cada empresa cliente.

**A 10 años**: "Usar MAHP" es, para una empresa que hace marketing con un equipo, tan natural como usar un correo corporativo o un sistema de facturación — no una herramienta que se evalúa comprar, sino la base esperada sobre la que se opera. La inteligencia artificial integrada ya no genera solo contenido: participa activamente sugiriendo estrategia, priorizando qué atender primero, y aprendiendo de qué ha funcionado específicamente para cada empresa cliente a lo largo de su historia con la plataforma.

Esta progresión no es aspiracional sin fundamento: cada horizonte se apoya en lo que el anterior ya construyó, siguiendo el mismo principio que guió la historia real del producto (§2) — la base sólida primero, la ambición después.

---

## 5. Misión

**Darle a cualquier empresa que hace marketing con un equipo — no con una sola persona — una sola fuente de verdad sobre su operación: qué se planeó, quién lo está haciendo, cómo va, y qué resultó. Con inteligencia artificial ayudando a planear y producir, y con cada persona del equipo viendo exactamente lo que necesita para hacer su parte bien.**

---

## 6. Filosofía

**Cómo pensamos**: empezamos por el problema operativo real, no por la tecnología de moda. La IA se incorporó después de que la base sin IA ya funcionaba — no como una manera de sonar innovadores, sino porque resolvía un paso concreto (generar el primer borrador de un calendario) que antes tomaba tiempo real de una persona.

**Cómo diseñamos**: cada rol tiene su propia pantalla, no una pantalla universal con partes ocultas según permisos. Es más trabajo de construir, pero significa que nadie ve complejidad que no le corresponde — el colaborador abre la app y ve sus tareas, no un dashboard completo con la mitad de las opciones deshabilitadas.

**Cómo desarrollamos**: verificando contra lo que realmente existe antes de asumir. Este proyecto tiene precedente documentado de construir sobre supuestos incorrectos (funciones que no existían, columnas nunca creadas, fases marcadas "construidas" sin estarlo) y de corregirlo activamente en cuanto se detecta — ver `CLAUDE.md` §2 y `ROADMAP.md`. Preferimos entregar menos pero verificado, no más pero asumido.

**Cómo tomamos decisiones**: con la pregunta "¿esto rompe algo que ya funciona?" siempre antes que "¿esto se puede construir más rápido de otra forma?". La compatibilidad hacia atrás no es una limitación técnica que toleramos — es una promesa a cada empresa cliente que ya confió sus datos operativos a la plataforma.

---

## 7. Los Principios Fundamentales

1. **El usuario siempre primero.** Cada decisión de producto se evalúa por lo que le ahorra o le clarifica a la persona que usa MAHP, no por lo que es más elegante de construir.
2. **La simplicidad supera la complejidad.** Sin framework de frontend, sin servidor propio salvo lo estrictamente necesario, sin abstracciones que no resuelven un problema hoy.
3. **La IA debe potenciar a las personas, no reemplazarlas.** Ninguna acción de IA se publica sin que una persona la revise primero (`IA.md` §4).
4. **Toda información debe generar valor, no solo existir.** Un dato que nadie va a ver ni usar no se guarda "por si acaso".
5. **Toda automatización debe ahorrar tiempo real, verificable.** Los triggers de base de datos (puntos, notificaciones, sincronización de avance) existen porque le quitan un paso manual a una persona — no porque "suena bien tenerlo automatizado".
6. **La colaboración es parte del producto, no un añadido.** Los 4 roles no son una jerarquía de permisos — son una forma de que distintas personas trabajen sobre la misma realidad sin pisarse.
7. **Las decisiones se basan en datos, no en intuición sin verificar.** Tanto las de producto (qué construir después, ver `ROADMAP.md`) como las técnicas (verificar el esquema real antes de escribir una consulta, `DATABASE.md`).
8. **El diseño comunica confianza.** Colores como semáforo (verde/ámbar/rojo con significado, no decoración), estados vacíos que explican qué hacer, mensajes de error en lenguaje humano — nunca un código técnico frente a alguien sin ese contexto.
9. **Cada módulo debe ser escalable sin romper lo existente.** Código nuevo modular, que recibe sus dependencias en vez de asumirlas (`js/shared/`, ver `CLAUDE.md` §3).
10. **La documentación es parte del desarrollo, no un trámite posterior.** Un módulo no está terminado si `MODULOS.md`/`DATABASE.md` no reflejan lo que realmente hace.
11. **La seguridad vive en la base de datos, no en la esperanza de que la interfaz se comporte.** RLS como única autorización real (`DATABASE.md` §1).
12. **Nada crítico se pierde.** Historial de avances, evidencias y auditoría son de solo-inserción donde importa la trazabilidad.
13. **Ningún cliente ve el dato de otro, sin excepción.** El aislamiento multiempresa no es configurable ni opcional — es estructural.
14. **Construir sobre lo real, no sobre lo asumido.** Antes de dar por hecho que algo existe o funciona de cierta forma, se verifica.
15. **Cada empresa cliente es distinta; el producto debe poder adaptarse sin fragmentarse.** Categorías y plantillas configurables por empresa son el horizonte, no una excepción que se resuelve caso por caso en el código.

---

## 8. Problemas que Resolvemos

| Problema | Cómo responde MAHP |
|---|---|
| **Desorganización** | Toda actividad vive en un calendario compartido con dueño y fecha claros, no repartida entre notas y memoria. |
| **Falta de seguimiento** | `activity_updates` + historial de avance visible por todos los roles relevantes, en tiempo real, sin pedirle a nadie un reporte. |
| **Poca comunicación** | Notificaciones automáticas cuando se asigna trabajo o se reporta avance — nadie tiene que "avisar" manualmente. |
| **Información dispersa** | Una sola base de datos por empresa: campañas, actividades, KPIs, evidencias y seguidores en el mismo lugar, no en herramientas separadas que no se hablan entre sí. |
| **Falta de indicadores** | KPIs configurables por campaña o por empresa, con meta y valor actual siempre visibles — no una cifra que alguien actualiza "cuando se acuerda". |
| **Planeación deficiente** | Generación de calendario con IA a partir de campaña, canales y frecuencia — reduce la planeación de "empezar de una hoja en blanco" a "revisar y ajustar una propuesta". |
| **Procesos manuales repetitivos** | Sincronización automática de avance, otorgamiento de puntos, notificaciones — vía triggers de base de datos, no pasos que alguien debe recordar hacer. |
| **Falta de estrategia visible** | Módulo de Estrategias Directivas: dirección publica el criterio, el equipo lo consulta como referencia antes de ejecutar. |

---

## 9. Público Objetivo

**Mercado inicial**: pequeñas y medianas empresas (PyMEs) de Latinoamérica que ya operan marketing con un equipo — no una sola persona — y sienten la fricción de coordinarlo sin una herramienta dedicada. Giros ya validados en el producto real: restaurantes y servicios (categorías de actividad actuales reflejan ese origen, ver §2).

**Mercados futuros**: empresas medianas, franquicias, corporativos, agencias (que gestionan marketing de varias marcas a la vez), retail, comercio y e-commerce.

**Perfil dentro de cada empresa cliente** (los 4 roles del sistema):
- **`company_admin`** — quien administra el día a día: crea campañas, asigna trabajo, invita al equipo. Es quien más tiempo pasa dentro de MAHP.
- **`director`** — dirección/gerencia: necesita ver el estado real sin operar el sistema — dashboard de solo lectura, mismo lenguaje visual que el admin.
- **`collaborator`** — quien ejecuta: reporta avance, sube evidencia, ve solo lo que le corresponde a él.
- **`super_admin`** — el proveedor de la plataforma (MAHP mismo): da de alta empresas nuevas y da soporte.

**Nivel de madurez digital esperado**: empresas que ya usan herramientas digitales básicas (WhatsApp Business, redes sociales, quizás una hoja de cálculo compartida) pero no un sistema dedicado — no se asume sofisticación técnica del usuario final, de ahí el lenguaje simple y sin jerga en toda la interfaz (`UI-UX.md` §5).

**Necesidades, dolores y objetivos**: necesitan visibilidad sin tener que pedirla; les duele no saber si el marketing planeado realmente se ejecutó; su objetivo es que el equipo crezca sin que la coordinación se vuelva un problema nuevo cada vez que se suma una persona.

---

## 10. Propuesta de Valor

**¿Por qué una empresa elegiría MAHP en vez de una hoja de cálculo?** Porque una hoja de cálculo no tiene roles, no notifica a nadie, y no distingue entre "lo planeado" y "lo que realmente se hizo" — cualquiera puede editar cualquier celda, y nada queda registrado de forma confiable.

**¿En vez de un CRM genérico?** Porque un CRM está diseñado para gestionar relaciones con clientes finales y pipeline de ventas — no para coordinar la ejecución interna de un equipo de marketing con campañas, calendario y evidencia de trabajo.

**¿En vez de un gestor de tareas genérico (tipo Trello/Asana)?** Porque una tarea suelta no tiene meta medible detrás — en MAHP, cada actividad puede vivir dentro de una campaña con un objetivo (KPI) real, y el avance de esa campaña se calcula solo, no se arma a mano.

**Qué lo hace diferente, en una idea**: es el único de los tres que combina aislamiento multiempresa real, roles con experiencias distintas, e inteligencia artificial que participa directamente en la planeación — no una integración añadida, sino parte del flujo central desde el diseño.

**Beneficios concretos que obtiene una empresa cliente**: menos tiempo armando reportes (el estado ya está visible), menos actividades que se caen sin que nadie lo note (asignación y notificación automáticas), y un primer borrador de calendario de contenido en segundos en vez de partir de una hoja en blanco.

---

## 11. Personalidad de la Marca

**Tono de comunicación**: directo, claro, sin jerga técnica ni formalismo excesivo — en español simple, el mismo criterio que ya rige cada texto de la interfaz (`UI-UX.md` §5). MAHP habla como una persona capaz explicando algo con confianza, no como un manual técnico.

**Estilo visual**: limpio, con propósito — color como señal (semáforo verde/ámbar/rojo), no como decoración. Tipografía Poppins para títulos (con carácter, sin perder seriedad), Inter para todo lo demás (legible, neutral). Paleta ancla en indigo (`#6366F1`), el mismo tono en la landing y en la app.

**Valores**: transparencia (nada se pierde, todo queda registrado), respeto por el tiempo de cada rol (cada quien ve solo lo suyo), y rigor técnico sin perder cercanía humana en el lenguaje.

**Lenguaje**: nunca un mensaje de error críptico — siempre explica qué pasó y, cuando aplica, qué hacer al respecto. Nunca asume que quien lee sabe qué es RLS, un trigger o un JSON — esos términos existen en esta documentación, nunca en la interfaz.

**Experiencia que debe ofrecer**: la sensación de estar viendo la realidad del negocio, no un formulario más que llenar. Rápida de entender sin necesitar explicación previa (`UI-UX.md` §5 — estados vacíos que guían, no solo informan).

**Qué emociones debe transmitir**: control ("sé exactamente cómo va mi marketing"), alivio ("no tengo que perseguir a nadie para saberlo"), y progreso tangible (barras de avance, insignias de gamificación, semáforos).

**Qué nunca debe transmitir**: vigilancia opresiva sobre el colaborador (la gamificación reconoce logros, no castiga), complejidad innecesaria, o la sensación de que el sistema oculta algo — cualquier dato relevante para un rol debe estar donde ese rol lo espera encontrar.

---

## 12. Manifiesto MAHP

> No creemos que el marketing de una empresa deba vivir repartido entre una hoja de cálculo, un grupo de chat y la memoria de quien lleva más tiempo en el equipo.
>
> Creemos que cada persona en un equipo de marketing merece ver exactamente lo que necesita para hacer bien su parte — ni una pantalla vacía de contexto, ni una sobrecargada de opciones que no le tocan.
>
> Creemos que la inteligencia artificial debe quitarle trabajo repetitivo a las personas, no quitarles la decisión. Por eso nada que genere la IA se publica solo — alguien lo revisa primero, siempre.
>
> Creemos que la seguridad no es una función que se agrega al final — es la base sobre la que se construye todo lo demás, silenciosa cuando funciona y absoluta cuando importa.
>
> Creemos que documentar no es el trabajo que queda para después del código — es parte del mismo trabajo, porque un sistema que nadie entiende completamente es un sistema que eventualmente se rompe sin que nadie sepa por qué.
>
> No construimos MAHP para impresionar con tecnología. Lo construimos para que una empresa que hace marketing en serio deje de perseguir la información y empiece a confiar en que ya la tiene.
>
> Eso es Marketing Activity Hub Pro: no un calendario, no un gestor de tareas, no un CRM. El lugar donde el marketing de una empresa realmente pasa — y queda registrado.

---

## 13. Lema Oficial

| # | Opción | Ventaja | Desventaja |
|---|---|---|---|
| 1 | *"Tu marketing, en un solo lugar."* | Directo, fácil de entender de inmediato | Suena parecido a cualquier herramienta de organización genérica |
| 2 | *"El sistema operativo de tu marketing."* | Refuerza la identidad central del producto (§1, §6) | "Sistema operativo" puede sonar técnico para un cliente no especializado |
| 3 | *"Marketing con claridad, no con caos."* | Nombra directamente el dolor que resuelve | Tono un poco negativo (menciona "caos") |
| 4 | *"Planea. Ejecuta. Mide. Todo en MAHP."* | Comunica el flujo completo del producto | Más largo, menos memorable como frase suelta |
| 5 | *"Donde tu equipo de marketing realmente trabaja."* | Enfatiza colaboración y uso diario real | No menciona IA ni el diferenciador técnico |
| 6 | *"Marketing impulsado por inteligencia, no por suposiciones."* | Conecta IA con el problema real (decisiones sin datos) | Frase más larga, tono más corporativo |
| 7 | *"Deja de perseguir tu marketing. Empieza a verlo."* | Emocionalmente directo, nombra el alivio (§11) | Menos descriptivo de qué es el producto |
| 8 | *"Un lugar. Todo tu equipo. Todo tu marketing."* | Ritmo memorable, enfatiza centralización | No diferencia de un gestor de tareas genérico |
| 9 | *"La claridad que tu marketing necesitaba."* | Cercano, orientado al beneficio | Genérico, podría aplicar a otras categorías de producto |
| 10 | *"Marketing Activity Hub Pro: el centro de tu operación."* | Usa el nombre completo, refuerza marca | Menos pegajoso como slogan independiente |

**Recomendación**: opción **2, "El sistema operativo de tu marketing"**, como lema oficial principal — es la que más fielmente traduce la identidad definida en §1 y §6 sin depender de contexto adicional, y funciona tanto para un público técnico como, con una línea de apoyo breve, para uno no técnico. Como alternativa de campaña/landing (más emocional, menos institucional) se recomienda la opción 7, *"Deja de perseguir tu marketing. Empieza a verlo."*, para piezas de marketing dirigidas directamente al dolor del cliente potencial.

---

## 14. Criterios para Tomar Decisiones

Antes de implementar cualquier funcionalidad nueva, quien la construya (humano o asistente de IA) debe poder responder que sí a estas preguntas — o justificar explícitamente por qué no:

1. ¿Genera valor real y verificable para quien usa MAHP, no solo "se ve bien tenerlo"?
2. ¿Respeta la simplicidad — o agrega complejidad que no resuelve un problema de hoy?
3. ¿Es compatible con lo que ya existe, sin romper ningún módulo construido (`MODULOS.md`)?
4. ¿La seguridad de esta funcionalidad vive en RLS, no solo en la interfaz?
5. ¿Es escalable a más empresas, más datos, sin rediseñar la base?
6. ¿Es reutilizable — sigue el patrón modular de `js/shared/` en vez de duplicar lógica?
7. ¿Mejora la colaboración entre roles, o al menos no la entorpece?
8. ¿Está alineada con la visión y los principios de este documento?
9. Si usa IA, ¿hay una persona revisando antes de que algo se publique como dato real?
10. ¿Puede mantenerse fácilmente por alguien que no la construyó, leyendo la documentación?
11. ¿Quedará documentada en el mismo cambio (`MODULOS.md`/`DATABASE.md`/`CHANGELOG.md`), no "después"?
12. ¿Se verificó contra el código y el esquema reales, en vez de asumir que algo existe o funciona de cierta forma?

---

## 15. Conclusión

Este documento no es un ejercicio de branding — es la brújula que decide qué construir y qué rechazar a medida que Marketing Activity Hub Pro crece. Cada capítulo anterior existe para que una pregunta como *"¿deberíamos construir esto?"* tenga una respuesta que no dependa del humor del día ni de qué tan interesante sea la tecnología de moda, sino de si esa decisión acerca al producto a lo que dice ser: no un calendario, no un gestor de tareas, no un CRM — el sistema operativo donde el marketing de una empresa realmente sucede, con inteligencia artificial ayudando a que suceda mejor.

A medida que MAHP evolucione — más empresas cliente, más roles, más mercados (§9) — este documento debe revisarse, no reescribirse desde cero. La identidad no cambia porque el producto crezca; el producto crece *dentro* de esta identidad.
