# COMPONENT LIBRARY — Marketing Activity Hub Pro

> MDS-005, Documento 3 de 5. Biblioteca oficial de componentes. Cada uno se
> marca **[EXISTE]** (ya construido, con su selector/archivo real) o
> **[FUTURO]** (no construido — estándar definido para cuando se necesite,
> nunca presentado como si ya existiera). Usa los tokens de
> `04A-DESIGN-TOKENS.md` y las reglas generales de `04-DESIGN-SYSTEM.md`.
>
> Última actualización: 2026-07-09.

---

## 1. Botones — **[EXISTE]**

**Objetivo**: disparar una acción primaria o secundaria de forma clara y consistente.
**Cuándo usarlo**: cualquier acción que el usuario inicia deliberadamente (guardar, publicar, generar, confirmar).
**Cuándo NO usarlo**: para navegación pura entre secciones (usar enlace/pestaña) — un botón implica una acción con efecto, no un cambio de vista.
**Variantes**: primario (`.btn-hero-primario`, fondo indigo sólido — una sola acción primaria visible a la vez por vista), secundario (`.btn-hero-secundario`, borde + texto, sin relleno), destructivo (rojo, reservado a acciones irreversibles o de alto impacto — revocar, eliminar), ícono-only (campanita, con `aria-label` obligatorio).
**Estados**: default, hover (elevación + oscurecer relleno o resaltar borde), `:focus-visible` (anillo visible), `disabled` (opacidad reducida + `cursor: not-allowed`), loading (texto reemplazado o `disabled` mientras se espera una respuesta async, ya el patrón de `ia.js`).
**Comportamiento**: nunca más de un botón primario visible en la misma vista/tarjeta — si hay dos acciones, una es primaria y la otra secundaria (ya el patrón en `.ia-resultado-actions`: "Regenerar" secundario, "Publicar" primario).
**Buenas prácticas**: texto en verbo + objeto ("Guardar meta", no "Guardar"); nunca solo un ícono sin `aria-label` salvo que el contexto sea inequívoco.
**Accesibilidad**: contraste AA en los 3 estados de color; objetivo táctil mínimo 44×44px en vistas móviles (`collaborator`).

---

## 2. Controles de formulario — **[EXISTE]** (Inputs, Selects, Checkbox) / **[FUTURO]** (Switch)

**Objetivo**: capturar datos del usuario de forma predecible.
**Cuándo usarlo**: cualquier entrada de datos estructurada.
**Cuándo NO usarlo**: para una elección binaria on/off de configuración persistente que se aplica inmediatamente — ahí corresponde un **Switch [FUTURO]**, no un checkbox (hoy el proyecto no distingue los dos casos porque no existe switch; todo se resuelve con checkbox, ej. `.ia-canal-chip`).
**Variantes**: texto/email/password/número/fecha/mes (`input`), textarea, `select` nativo, checkbox nativo estilizado como "chip" cuando representa una opción visual (`.ia-canal-chip`).
**Estados**: default, focus (borde indigo), error (borde rojo + mensaje debajo, patrón ya usado en formularios de la app vía `mensaje.style.color = 'var(--red)'`), disabled.
**Comportamiento**: todo input asociado a un `<label>` explícito (`04-DESIGN-SYSTEM.md` §6); validación se muestra al intentar enviar, no de forma agresiva mientras se escribe.
**Buenas prácticas**: placeholder nunca reemplaza al label; mensajes de error en lenguaje humano (`UI-UX.md` §5).
**Accesibilidad**: asociación `label`/`for` o `aria-label`; orden de tabulación lógico (izquierda-derecha, arriba-abajo).

**Switch [FUTURO]**: diseño propuesto — pill horizontal con círculo deslizante, verde cuando activo, gris cuando inactivo, transición `--duration-fast`. Se introduce el día que exista una configuración on/off persistente real (ej. "recibir notificaciones por correo") — no antes.

---

## 3. Cards — **[EXISTE]**

**Objetivo**: agrupar información relacionada en un contenedor visualmente delimitado.
**Cuándo usarlo**: cualquier bloque de contenido autocontenido (una campaña, un plan, un módulo, una captura).
**Cuándo NO usarlo**: para dos datos sueltos sin relación — no todo necesita estar en una tarjeta, un párrafo simple basta a veces.
**Variantes**: `.card`/`.card-estrecha` (app, contenedor genérico), tarjeta de contenido con ícono (`.modulo-card`, `.beneficio-card`), tarjeta de precio (`.plan-card`, con variante destacada `.plan-destacado`), tarjeta de captura (`.captura-card`, con marco tipo navegador).
**Estados**: default, hover (elevación + borde acentuado — ya patrón consistente en toda la landing).
**Comportamiento**: una tarjeta clicable completa (no solo un enlace interno) debe comunicar interactividad con cursor + hover, nunca depender solo de que el usuario "descubra" que se puede hacer clic.
**Buenas prácticas**: máximo un CTA primario por tarjeta.
**Accesibilidad**: si toda la tarjeta es clicable, el área interactiva debe ser accesible por teclado (`tabindex`, `role="button"` si no es un `<a>` nativo) — brecha a revisar en tarjetas clicables actuales que usan solo `onclick`.

---

## 4. Widgets y KPIs — **[EXISTE]**

**Objetivo**: comunicar una métrica de negocio de un vistazo.
**Cuándo usarlo**: cualquier número que el usuario necesita monitorear (cumplimiento, avance de meta, total).
**Cuándo NO usarlo**: para datos que requieren contexto tabular (usar Tabla en su lugar) — un widget muestra una sola cifra protagonista, no una lista de valores.
**Variantes**: tarjeta de estadística simple (`.stat-card`, número + etiqueta), tarjeta de KPI con barra de progreso (`.kpi-card`, meta vs. actual), tarjeta de seguidores (`.kpi-seguidores`).
**Estados**: default, skeleton (mientras carga — `.skeleton-card`, ya estándar).
**Comportamiento**: color de acento por semáforo cuando el widget representa cumplimiento (`04-DESIGN-SYSTEM.md` §3); número siempre el elemento tipográficamente más grande de la tarjeta.
**Buenas prácticas**: máximo 4–6 widgets en una fila de resumen ejecutivo (`UI-UX.md`/`FASES-APP.md` Fase 7) — más que eso, se agrupan en una sección de detalle aparte.
**Accesibilidad**: el significado del color (semáforo) nunca depende solo del color — el número y la etiqueta ya lo comunican en texto.

---

## 5. Tablas — **[EXISTE]**

**Objetivo**: presentar datos estructurados comparables entre filas.
**Cuándo usarlo**: listados administrativos (usuarios, invitaciones, auditoría).
**Cuándo NO usarlo**: en móvil sin adaptación — brecha ya señalada (`04-DESIGN-SYSTEM.md` §5); mientras no exista la variante de tarjeta, evitar tablas con más de 3 columnas en flujos que un `collaborator` pueda alcanzar desde celular.
**Variantes**: tabla simple (`.tabla`), tabla con fila expandible (campañas, con detalle desplegable).
**Estados**: vacío (`.fila-vacia`, "Sin X todavía" — ya estándar), cargando (skeleton).
**Comportamiento**: encabezados siempre visibles; fila expandible indica su estado con un ícono de flecha que rota (ya el patrón en campañas/historial).
**Buenas prácticas**: nunca más de ~7 columnas — si se necesitan más datos, se muestran en un detalle expandido, no comprimiendo columnas.
**Accesibilidad**: `<th>` semánticos (ya el estándar seguido); scroll horizontal contenido dentro de un wrapper con `overflow-x: auto` en vez de romper el layout de la página, cuando la tabla es más ancha que la pantalla.

---

## 6. Calendario — **[EXISTE]**

**Objetivo**: visualizar actividades distribuidas en el tiempo.
**Cuándo usarlo**: cualquier vista donde la fecha es la dimensión principal de organización.
**Cuándo NO usarlo**: para una lista de tareas sin relación temporal relevante (usar lista/tarjetas).
**Variantes**: editable con drag & drop (admin, colaborador), solo lectura (director) — mismo componente (FullCalendar), distinta configuración (`editable: true/false`).
**Estados**: evento normal (color por categoría), evento en progreso (borde naranja adicional, `.fc-event-en-progreso`).
**Comportamiento**: clic en evento abre acción contextual (editar/eliminar/asignar en admin; scroll a la tarjeta correspondiente en colaborador).
**Buenas prácticas**: nunca más de una librería de calendario en el sistema — FullCalendar es la única, cualquier vista de calendario nueva la reutiliza.
**Accesibilidad**: limitación conocida y aceptada de FullCalendar — interacción drag & drop no es accesible por teclado por defecto; mitigación parcial: toda acción de calendario tiene una vía alterna no dependiente del drag (ej. editar fecha desde el formulario).

---

## 7. Dashboards (patrón de composición) — **[PARCIAL: algunos existen, otros FUTURO]**

Un "dashboard" en MAHP no es un componente único — es una composición de Widgets/KPIs (§4) + Tablas (§5) + a veces Calendario (§6), siguiendo siempre el orden: resumen ejecutivo (widgets, arriba) → detalle (tablas/gráficas, abajo). Estado por tipo:

| Dashboard | Estado |
|---|---|
| Ejecutivo (resumen de 4 tarjetas) | **[EXISTE]** — `dashboard.js` |
| KPIs | **[EXISTE]** — `kpis.js` |
| Campañas | **[EXISTE]** — `campanias.js` |
| Actividades (calendario) | **[EXISTE]** — §6 |
| Reportes (historial de tareas completadas) | **[EXISTE]** — `historialTareas.js` |
| Empresa (gestión de equipo/invitaciones) | **[EXISTE]** — `admin.js`/`empresa.js` |
| Marketing (seguidores + metas) | **[EXISTE]** — `seguidores.js`/`metasSeguidores.js` |
| IA | **[EXISTE, parcial]** — hoy es un formulario + resultado, no un "dashboard" de métricas de uso de IA |
| Configuración | **[FUTURO]** — no existe una pantalla de configuración de cuenta/empresa separada hoy (los ajustes viven repartidos por página) |

---

## 8. Navegación: Navbar / Topbar / Bottom-nav — **[EXISTE]**

**Objetivo**: orientar al usuario sobre dónde está y permitirle moverse.
**Variantes**: topbar fija (app, identidad + notificaciones + salir), bottom-nav fija (app, cambio de pestaña), navbar superior (landing, menú + CTA de login).
**Comportamiento**: exactamente un ítem de navegación marcado `.activo` en todo momento; en móvil, la landing colapsa a menú hamburguesa (`04-DESIGN-SYSTEM.md`/`UI-UX.md`), la app **no** colapsa el bottom-nav (ya está optimizado para móvil por diseño — `flex: 1` por botón).
**Buenas prácticas**: máximo ~5–6 ítems en bottom-nav antes de que se sienta apretado en pantallas angostas — si un rol necesita más secciones, se agrupan.
**Accesibilidad**: `aria-current`/clase `.activo` equivalente ya presente; pendiente — agregar `aria-current="page"` real (hoy solo hay indicación visual por clase CSS, no semántica) como mejora de accesibilidad.

---

## 9. Sidebar — **[FUTURO]**

No existe en el sistema — la navegación de la app usa topbar + bottom-nav, sin panel lateral. Se introduce solo si un rol futuro (ej. una vista de "Configuración" con muchas subsecciones, o el dashboard de agencia multi-empresa de `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §4) necesita más de ~6 secciones simultáneas — hasta entonces, agregar una sidebar sería redundante con el bottom-nav ya existente (violaría el principio de "un solo sistema de navegación por vista").

---

## 10. Breadcrumbs — **[FUTURO]**

No existen — la profundidad de navegación actual del sistema es de máximo 2 niveles (página → pestaña), donde un breadcrumb no aporta valor. Se introduce si se agrega un tercer nivel real de profundidad (ej. Campaña → Objetivo → Actividad como rutas navegables independientes, no solo expansión in-line como hoy).

---

## 11. Modales — **[EXISTE]**

**Objetivo**: capturar atención y una decisión puntual sin abandonar el contexto de la página.
**Cuándo usarlo**: confirmación de acción irreversible, formulario corto de una sola pregunta, información que no amerita su propia pantalla.
**Cuándo NO usarlo**: para formularios largos o flujos de varios pasos — eso amerita su propia sección/pestaña.
**Variantes**: confirmar (`showConfirm`), prompt de texto (`showPrompt`), informativo de solo lectura (`showInfo`), de autorización con credenciales (`modal-autorizacion`, caso especial de seguridad).
**Estados**: abierto/cerrado únicamente — no hay estado intermedio.
**Comportamiento**: overlay oscuro de fondo, cierre al hacer clic fuera (donde no es una acción destructiva sin confirmar) o al completar la acción.
**Buenas prácticas**: nunca apilar más de un modal a la vez.
**Accesibilidad — brecha real (`04-DESIGN-SYSTEM.md` §17)**: el foco no se mueve automáticamente al modal al abrirse ni regresa al disparador al cerrarse. Es la mejora de accesibilidad de mayor prioridad de todo este documento.

---

## 12. Toasts — **[EXISTE]**

**Objetivo**: confirmar el resultado de una acción sin interrumpir el flujo.
**Cuándo usarlo**: éxito o error de una acción que el usuario acaba de iniciar.
**Cuándo NO usarlo**: para información que el usuario debe poder consultar después (usar notificación persistente, §13) — el toast desaparece solo y no dejará rastro.
**Variantes**: éxito (`.toast-ok`), error (`.toast-error`).
**Comportamiento**: aparece, permanece ~3s, se retira con transición de salida — ya el patrón exacto de `showToast()`.
**Buenas prácticas**: mensaje corto, en lenguaje humano, nunca un stack trace o código de error técnico (`04-DESIGN-SYSTEM.md` §1, `03-ENGINEERING-STANDARDS.md` §16).
**Accesibilidad**: candidato a `aria-live="polite"` en el contenedor de toasts — no confirmado si ya está implementado, revisar y agregar si falta.

---

## 13. Notificaciones — **[EXISTE]**

**Objetivo**: informar de eventos relevantes que ocurrieron sin que el usuario los haya disparado directamente (le asignaron una tarea, alguien reportó avance).
**Diferencia con Toast**: persistente hasta que se marca como leída, vive en un panel (`#panelNotificaciones`), no desaparece sola.
**Comportamiento**: contador visible en la campanita mientras haya no leídas; se marcan todas como leídas al abrir el panel (ya el patrón en `configurarNotificaciones`).
**Buenas prácticas**: mensaje generado por el sistema (trigger), nunca redactado en el momento por el cliente — consistencia de tono garantizada.
**Accesibilidad**: el contador numérico debe tener equivalente textual para lector de pantalla (`aria-label="N notificaciones sin leer"`) — brecha a verificar/cerrar.

---

## 14. Avatares — **[EXISTE]**

**Objetivo**: representar visualmente a una persona sin depender de una foto real (no hay carga de foto de perfil en el sistema hoy).
**Variantes**: iniciales sobre fondo de color sólido (ranking, `iniciales()` ya la función compartida entre `colaboradores.js` y `gamificacion.js`).
**Comportamiento**: color asignado de una paleta fija rotativa (§1 de `04A-DESIGN-TOKENS.md`), no aleatorio — para que la misma persona tienda a verse con un color reconocible entre sesiones (limitación aceptada: hoy el color depende de la posición en la lista, no de la identidad — mejora futura sería derivar el color de un hash del `user_id`).
**Accesibilidad**: iniciales ya son texto real (no imagen), accesible por defecto.

---

## 15. Badges y Etiquetas — **[EXISTE]**

**Objetivo**: comunicar un estado o categoría de forma compacta.
**Variantes**: badge de estado (`.badge-green/amber/slate`, semáforo — §3), insignia de logro (`.badge-logro` + `.badge-gold/silver/fire/star`, gamificación), etiqueta de categoría/canal (`.canal-tag`, `.act-pill`, `.ia-act-canal`).
**Diferencia badge vs. etiqueta**: un badge comunica **estado** (cambia con el tiempo — pendiente/en progreso/completada); una etiqueta comunica **categoría** (fija — Instagram, Facebook).
**Buenas prácticas**: nunca texto libre dentro de un badge de estado (siempre de un set cerrado de valores) — sí puede serlo en una etiqueta de categoría (nombre de canal configurable por empresa).
**Accesibilidad**: siempre texto, nunca solo color+forma sin contenido textual.

---

## 16. Gráficas — **[FUTURO]**

No existe hoy ninguna librería de gráficas — todo indicador visual es una barra de progreso simple (`.kpi-bar-fill`) o un semáforo de color, no un gráfico de líneas/barras/pastel real. Cuando se introduzca (candidato natural: el futuro **Business Analyst** de IA, `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §11, presentando tendencias), la recomendación es una librería ligera sin dependencias pesadas (ej. renderizado propio con SVG/Canvas para 2–3 tipos de gráfica simples) antes que adoptar una librería completa de charting — consistente con Simplicidad Progresiva.

---

## 17. Tabs — **[EXISTE]**

**Objetivo**: organizar contenido relacionado en la misma pantalla sin recargar.
**Cuándo usarlo**: secciones de una misma página que no ameritan ser páginas separadas (Calendario/Campañas/Equipo dentro de `empresa.html`).
**Cuándo NO usarlo**: para pasos secuenciales de un proceso (usar wizard/flujo lineal, no tabs — las tabs implican que el usuario puede ir en cualquier orden).
**Variantes**: tabs de nivel de página (bottom-nav + `.tab-panel`), tabs internas de un componente (`.det-tabs`, dentro del detalle de una tarea; `.ranking-tabs`, Global/por campaña).
**Comportamiento**: exactamente una pestaña activa a la vez, mecanismo único (`configurarTabs()`) reutilizado — no se inventa un segundo sistema de tabs.
**Accesibilidad**: candidato a `role="tablist"`/`role="tab"`/`aria-selected` — hoy implementado solo con clases CSS, sin semántica ARIA; brecha a cerrar.

---

## 18. Acordeones — **[EXISTE]**

**Objetivo**: ocultar contenido secundario hasta que el usuario pide verlo.
**Variantes**: nativo `<details>/<summary>` (FAQ de landing — accesible por defecto, sin JS), expandible manual (`.historial-card`/`.historial-body`, campañas — con JS propio por necesitar animación/control más fino que el nativo).
**Buenas prácticas**: preferir `<details>` nativo cuando no se necesita animación de entrada — es gratis en accesibilidad y no requiere JS.
**Accesibilidad**: `<details>` ya accesible por defecto; la variante manual con JS debe replicar `aria-expanded` en el elemento que dispara el toggle (verificar consistencia — algunos ya lo hacen, ej. flecha de campañas, otros no explícitamente).

---

## 19. Timeline — **[EXISTE]**

**Objetivo**: comunicar una secuencia de pasos o eventos ordenados en el tiempo (no en un calendario — un flujo conceptual, no fechas reales).
**Variantes**: horizontal con línea conectora (`.timeline`, "Cómo funciona" en landing), vertical en pantallas angostas (mismo componente, responsive).
**Comportamiento**: cada paso con ícono + título + descripción breve; animación de entrada escalonada (§14 de `04-DESIGN-SYSTEM.md`).
**Uso futuro candidato**: historial de estados de una actividad (`pendiente → en_progreso → completada` con fechas reales) — hoy se muestra como tabla/lista, podría adoptar este componente.

---

## 20. Buscadores — **[FUTURO]**

No existe ningún campo de búsqueda en el sistema — todas las listas se muestran completas. Se introduce cuando el volumen de filas de una tabla (usuarios, actividades) empiece a requerir filtrado activo — no antes (Simplicidad Progresiva). Diseño propuesto: input con ícono de lupa, debounce de ~300ms antes de filtrar, sin llamada a servidor si la lista ya está cargada en cliente (filtrado local primero).

---

## 21. Filtros — **[FUTURO]**

No existen filtros dedicados hoy más allá de selects de formulario (que seleccionan, no filtran una lista existente). Se introducen junto con Paginación (§21) cuando el volumen de datos lo justifique.

---

## 22. Paginación — **[FUTURO]**

No existe — toda tabla/lista se renderiza completa (`js/admin.js`, `js/empresa.js`: `.select('*')` sin `.range()`). Riesgo ya identificado indirectamente en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §14 (escalón de 1,000+ usuarios). Diseño propuesto cuando se implemente: paginación por cursor (`created_at`/`id`) en vez de por número de página — más eficiente en Postgres que `OFFSET` para tablas grandes, y evita el problema de páginas que "saltan" si se insertan filas nuevas mientras se pagina.

---

## 23. Skeleton / Estado de Carga — **[EXISTE]** *(no estaba en la lista original, se documenta por ser un componente transversal usado en casi todos los demás)*

**Objetivo**: comunicar que el contenido está cargando sin un salto brusco de layout.
**Variantes**: `.skeleton-line` (texto), `.skeleton-stat`/`.skeleton-card` (widgets).
**Buenas prácticas**: la forma del skeleton debe aproximar la forma real del contenido que va a reemplazar — ya el patrón seguido (skeleton de tarjeta donde va una tarjeta, no un rectángulo genérico).
