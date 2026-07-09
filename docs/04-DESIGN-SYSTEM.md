# DESIGN SYSTEM — Marketing Activity Hub Pro

> MDS-005, Documento 1 de 5. Sistema oficial de diseño — referencia
> obligatoria para cualquier interfaz nueva. Complementa `01-IDENTIDAD-DEL-PRODUCTO.md`
> (personalidad de marca, §11) y expande `UI-UX.md` (que documentaba el estado
> actual) hacia un estándar completo y prescriptivo.
>
> Ver también: `04A-DESIGN-TOKENS.md` (valores exactos), `04B-COMPONENT-LIBRARY.md`
> (componentes), `04C-UX-GUIDELINES.md` (flujos y experiencia), `04D-DESIGN-PRINCIPLES.md`
> (principios rectores).
>
> Última actualización: 2026-07-09.

---

## 1. Filosofía del Diseño

MAHP debe transmitir profesionalismo, claridad, rapidez, confianza, inteligencia, simplicidad, elegancia y escalabilidad — en ese orden de prioridad cuando dos se contraponen (ej. entre "elegante" y "rápido de construir", gana rapidez; entre "simple" y "impresionante", gana simplicidad). La interfaz nunca se satura: cada pantalla responde una pregunta principal (`04D-DESIGN-PRINCIPLES.md`), la información crítica siempre está visible sin scroll cuando es razonablemente posible, y cada acción importante requiere el menor número de pasos que la seguridad y la claridad permitan.

## 2. Principios UX

1. **Cada pantalla responde una pregunta principal** — "Mis tareas" responde "¿qué me toca hacer?"; el dashboard responde "¿cómo va mi empresa?". Ninguna pantalla intenta responder dos preguntas no relacionadas a la vez.
2. **La acción más usada por ese rol siempre está a un clic** — ya validado en la práctica (`FASES-APP.md` Fase 7: "reportar avance" es el primer botón que ve el colaborador).
3. **El estado vacío guía, no solo informa** — "Sin tareas asignadas todavía" es insuficiente; el estándar es explicar el siguiente paso posible.
4. **Ningún dato crítico se oculta detrás de una interacción evitable** — semáforos y KPIs en la vista principal, no en un submenú.
5. **La confirmación es proporcional al riesgo** — un cambio reversible (editar un título) no interrumpe; uno irreversible o de alto impacto (eliminar, revocar acceso) siempre pide confirmación explícita (`showConfirm`, ya estándar).

## 3. Principios UI

1. **Color como señal, nunca decoración** — semáforo verde/ámbar/rojo con significado fijo en todo el sistema (`UI-UX.md` §4), reafirmado aquí como regla absoluta.
2. **Jerarquía tipográfica de máximo 4 niveles por pantalla** — título de sección, subtítulo/etiqueta, cuerpo, texto secundario/muted. Introducir un quinto nivel es señal de que la pantalla necesita reestructurarse, no un token nuevo.
3. **Un solo acento de marca (indigo) por vista**, con el resto de la paleta reservada para estado — evita que la interfaz compita visualmente consigo misma.
4. **Los componentes se reconocen por forma antes que por color** — un botón primario y uno secundario deben distinguirse incluso en escala de grises (radio, peso, borde), no solo por el relleno indigo.
5. **Nada se anima sin una razón funcional** (revelar, confirmar, indicar carga) — nunca decorativo puro, ver §14.

## 4. Arquitectura Visual

Dos sistemas visuales deliberadamente aislados (`UI-UX.md` §1): **app autenticada** (`assets/styles.css`, orientada a densidad de información y roles) y **landing pública** (`assets/landing.css`, orientada a conversión y narrativa). Comparten la misma paleta de marca (indigo) y las mismas familias tipográficas (Poppins/Inter), pero no comparten hoja de estilos ni convenciones de espaciado — es una decisión de arquitectura, no una inconsistencia (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §7).

Dentro de la app autenticada, la arquitectura visual sigue un patrón de 3 capas fijo en las 4 páginas con sesión: **topbar** (fija, identidad + acciones globales) → **contenido con pestañas** (una vista a la vez) → **bottom-nav** (fija, navegación entre pestañas). Ninguna pantalla nueva rompe este patrón sin justificación explícita — es lo que hace que el sistema se sienta como un solo producto entre 4 roles distintos.

## 5. Diseño Responsivo

**Mobile-first obligatorio** para cualquier pantalla que use `collaborator` (ya el criterio en `UI-UX.md` §5, dado que es el rol con mayor probabilidad de uso desde celular). Para el resto de roles, diseño desktop-first es aceptable pero debe degradar correctamente en móvil, no solo "no romperse".

**Brecha detectada, ya señalada en `ROADMAP.md`**: las tablas administrativas (`admin.html`, `empresa.html`) no tienen conversión a tarjeta en pantallas angostas — sigue siendo la deuda de responsividad más visible del sistema. Estándar a partir de este documento: toda tabla nueva se diseña con su variante de tarjeta para `< 700px` desde el origen, no como mejora posterior.

## 6. Grid System

No existe hoy un grid formal de 12 columnas — los layouts usan `display: grid`/`flex` ad-hoc por componente (`.kpi-grid`, `.beneficios-grid`, `.modulos-grid`, etc., cada uno con su propio `grid-template-columns`). **Estándar formalizado aquí**: cualquier grid nuevo de tarjetas sigue la progresión `repeat(4,1fr) → repeat(3,1fr) → repeat(2,1fr) → 1fr` en los breakpoints de `04A-DESIGN-TOKENS.md` §5 — ya el patrón de facto seguido en `landing.css` (`beneficios-grid`, `modulos-grid`, `capturas-grid`), formalizado ahora como regla en vez de repetirse por convención tácita.

## 7. Espaciados

**Brecha real, ya identificada en `UI-UX.md` §7**: no existe una escala formal de espaciado — valores puntuales en `rem`/`px` por componente. Este documento la define en `04A-DESIGN-TOKENS.md` §3 (`--space-1` a `--space-6`). Aplicación: código nuevo usa la escala; código existente no se retro-migra de golpe (viola el principio de compatibilidad, `CLAUDE.md` §3) — se adopta la escala nueva componente por componente, la próxima vez que ese componente se toque por otra razón.

## 8. Tipografía

Poppins (`--font-display`) exclusivo de encabezados `h1`–`h4`; Inter (`--font-sans`) para todo lo demás, incluyendo UI de control (botones, inputs, badges). Escala tipográfica real y pesos en `04A-DESIGN-TOKENS.md` §2. Regla: nunca más de 2 familias tipográficas en el sistema — una tercera familia (ej. una monoespaciada para código) no se introduce salvo necesidad real y documentada aquí primero.

## 9. Paleta de Colores

Indigo como acento de marca; verde/ámbar/rojo/azul reservados a significado de estado (semáforo, §3); slate como escala neutra de texto y superficies. Paleta completa y valores exactos en `04A-DESIGN-TOKENS.md` §1. La landing usa la misma ancla de marca (`--lp-accent` = mismo indigo) con su propio namespace de variables — mismo color, tokens separados a propósito (§4).

## 10. Iconografía

Font Awesome 6 (Free, Solid + Brands) es la única librería de íconos del sistema — no se introduce una segunda librería de íconos sin deprecar la primera. Convención: íconos decorativos llevan `aria-hidden="true"`; íconos que son el único contenido de un control interactivo (ej. botón de campanita) requieren `aria-label` en el elemento contenedor. Tamaño estándar: 14–16px en línea con texto de botón, 18–22px en badges/insignias, 32–56px en ilustraciones tipo mockup/módulo (ver `04A-DESIGN-TOKENS.md` §9).

## 11. Sombras

Dos niveles hoy en la app (`--shadow`, `--shadow-md`), usados de forma consistente para elevar tarjetas al hacer hover. La landing usa sombras más pronunciadas y de color (ej. `box-shadow` tintado de indigo en `.btn-hero-primario`) porque su objetivo es destacar CTAs, no solo jerarquía — diferencia intencional entre los dos sistemas visuales (§4). Escala completa en `04A-DESIGN-TOKENS.md` §7.

## 12. Bordes

`1px solid var(--border)` es el borde estándar de toda tarjeta/input en la app; `0.5px` se usa en separadores internos de listas/tablas para una línea visualmente más ligera que el borde de contenedor — distinción ya presente en el código, formalizada aquí como regla: borde de contenedor = 1px, separador interno = 0.5px.

## 13. Elevaciones

No hay un sistema formal de capas hoy más allá de `z-index` puntuales (§4A). Regla nueva: elevación visual (sombra) y elevación de apilamiento (`z-index`) deben subir juntas — un elemento con más sombra que otro casi siempre debe tener `z-index` mayor también, para que la profundidad visual coincida con el orden real de superposición.

## 14. Animaciones

Toda animación en el sistema tiene una función: `lp-fade-up` (revelar contenido al cargar/hacer scroll), `lp-float` (dar vida a un mockup estático sin distraer), `lp-pulse` (glow de fondo en la sección de IA, refuerza "algo inteligente está pasando"), transiciones de hover (`transform: translateY(-Npx)`, feedback de interactividad). Ninguna excede ~700ms de duración perceptible — animaciones largas comunican lentitud, lo opuesto a la filosofía de marca (§1). `prefers-reduced-motion` se respeta sin excepción, ya el estándar en `landing.css`, obligatorio también para cualquier animación nueva en la app.

## 15. Microinteracciones

Hover con elevación + cambio de color en tarjetas clicables (ya el patrón en `.modulo-card`, `.captura-card`, `.plan-card`); focus visible con `:focus-visible` (nunca solo `:focus`, para no romper el indicador de teclado); estado de carga en botones que disparan una acción async (`btn.disabled = true` mientras se espera respuesta, ya el patrón en `ia.js`); confirmación visual inmediata tras una acción exitosa (`showToast`) — ninguna acción del usuario queda sin una respuesta visible en menos de ~300ms, aunque sea un estado "cargando".

## 16. Estados de Componentes

Todo componente interactivo debe definir explícitamente, como mínimo: **default, hover, focus-visible, disabled**, y donde aplique, **loading** (skeleton) y **error**. Estados ya cubiertos consistentemente en botones/inputs de la app; **brecha**: no todos los componentes documentan su estado `disabled` visualmente distinto de `default` — se exige a partir de este documento en cualquier componente nuevo (detalle por componente en `04B-COMPONENT-LIBRARY.md`).

## 17. Accesibilidad (WCAG)

**Nivel objetivo: WCAG 2.1 AA** — no cumplido de forma auditada hoy (brecha honesta, no un logro a reclamar). Ya en buen camino: sanitización segura de texto (`UI-UX.md` §6), semáforo de color siempre acompañado de texto/número (nunca color solo), navegación por teclado no rota en componentes nativos (`<details>`, `<select>`, `<input>`). Pendiente real: contraste no auditado formalmente en toda la paleta, ausencia de skip-link en la app autenticada (sí existe en landing), foco no gestionado explícitamente al abrir un modal (`ui.js`, `crearModalBase`) — el foco debería moverse al modal y devolverse al cerrar. Estas 3 brechas son las primeras candidatas de cierre cuando se priorice accesibilidad como trabajo dedicado.

## 18. Modo Claro

Es el único modo implementado y el modo por defecto — paleta clara (`--bg: #F1F5F9`, `--surface: #FFFFFF`) en toda la app y la landing.

## 19. Modo Oscuro

**No implementado — 100% aspiracional en este documento.** Diseño propuesto para cuando se priorice: duplicar el bloque de `:root` con un selector `[data-theme="dark"]` (mismo mecanismo que ya usan artefactos/paneles con soporte de tema mencionados en convenciones de la plataforma), invirtiendo `--bg`/`--surface` a tonos oscuros de slate y ajustando la opacidad de los tokens de estado (verde/ámbar/rojo) para mantener contraste AA sobre fondo oscuro — nunca reutilizar los mismos valores hex de modo claro sin verificar contraste de nuevo. No se implementa en este documento ni se prioriza en el roadmap sin una decisión de producto explícita — hoy no hay evidencia de que los usuarios de MAHP lo pidan.

## 20. Buenas Prácticas

- Ningún color, medida o duración se hardcodea si ya existe un token equivalente (`04A-DESIGN-TOKENS.md`).
- Ningún componente nuevo se construye sin antes revisar `04B-COMPONENT-LIBRARY.md` — si ya existe algo parecido, se extiende, no se duplica (mismo principio de `03-ENGINEERING-STANDARDS.md` §3).
- Todo texto de interfaz en español simple, sin jerga técnica (`UI-UX.md` §5) — regla de diseño, no solo de copywriting.
- Este documento se revisa en el mismo ritmo que `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` (transiciones de versión) — un sistema de diseño que no evoluciona con el producto deja de ser una referencia útil.
