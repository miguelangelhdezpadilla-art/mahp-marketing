# DESIGN TOKENS — Marketing Activity Hub Pro

> MDS-005, Documento 2 de 5. Valores exactos que respaldan `04-DESIGN-SYSTEM.md`.
> Donde el token ya existe en el código, se cita tal cual (no se reinventa);
> donde es una brecha detectada, se marca **[NUEVO]** y se define aquí por
> primera vez como estándar a adoptar progresivamente (`04-DESIGN-SYSTEM.md` §7).
>
> Última actualización: 2026-07-09.

---

## 1. Colores

**App autenticada** (`assets/styles.css`) — capa cruda + capa semántica (`UI-UX.md` §2):

| Token crudo | Valor | Alias semántico | Uso |
|---|---|---|---|
| `--slate-900` | `#0F172A` | `--text-primary` | Texto principal, títulos |
| `--slate-700` | `#334155` | — | Texto de cuerpo (`body`) |
| `--slate-500` | `#64748B` | `--text-secondary` / `--text-muted` | Texto secundario/apagado |
| `--slate-300` | `#CBD5E1` | — | Bordes claros, texto deshabilitado |
| `--slate-100` | `#F1F5F9` | — | Fondos sutiles |
| `--bg` | `#F1F5F9` | — | Fondo general de página |
| `--surface` | `#FFFFFF` | `--surface-1` | Tarjetas, superficies elevadas |
| `--surface-2` | `#F8FAFC` | — | Superficies secundarias (headers de tabla, sidebars internos) |
| `--border` | `#E2E8F0` | — | Bordes de contenedor |
| `--indigo` | `#6366F1` | — | Acento de marca primario |
| `--indigo-dark` | `#4F46E5` | — | Hover de acento primario |
| `--indigo-light` | `#EEF2FF` | — | Fondos tintados de acento |
| `--green` / `-light` | `#10B981` / `#ECFDF5` | — | Estado positivo (semáforo) |
| `--amber` / `-light` | `#F59E0B` / `#FFFBEB` | — | Estado de atención (semáforo) |
| `--red` / `-light` | `#EF4444` / `#FEF2F2` | — | Estado negativo/error (semáforo) |
| `--blue` / `-light` | `#3B82F6` / `#EFF6FF` | — | Información neutra, acento secundario |

**Landing pública** (`assets/landing.css`, namespace `--lp-*`, aislado a propósito):

| Token | Valor |
|---|---|
| `--lp-bg` | `#ffffff` |
| `--lp-surface` | `#f8fafc` |
| `--lp-border` | `#e2e8f0` |
| `--lp-text` | `#0f172a` |
| `--lp-text-muted` | `#64748b` |
| `--lp-accent` | `#6366f1` *(mismo indigo de marca)* |
| `--lp-accent-dark` | `#4f46e5` |

**Colores de gamificación/podio** (`gamificacion.js`, no tokenizados hoy — **[NUEVO]** candidatos a promoverse a variables): `#6366f1` / `#8b5cf6` / `#a78bfa` (1º/2º/3º lugar).

**Regla de uso**: código nuevo en la app usa siempre el alias semántico (`--text-primary`, no `--slate-900`); estado (verde/ámbar/rojo/azul) nunca se usa decorativamente, solo con significado de semáforo (`04-DESIGN-SYSTEM.md` §3).

---

## 2. Tipografía

| Token | Valor | Uso |
|---|---|---|
| `--font-display` | `'Poppins', var(--font-sans)` | `h1`–`h4`, títulos de sección |
| `--font-sans` | `'Inter', system-ui, sans-serif` | Todo lo demás |

**Escala real observada** (no tokenizada formalmente hoy — **[NUEVO]** consolidación propuesta):

| Nivel | Tamaño | Peso | Ejemplo real |
|---|---|---|---|
| Display (hero) | `clamp(2rem, 4vw+1rem, 3.25rem)` | 700 | `.hero-titulo` |
| Título de sección | `clamp(1.75rem, 2.5vw+1rem, 2.5rem)` | 700 | `.section-titulo` |
| Título de tarjeta/componente | `15–19px` | 600 | `.plan-nombre`, `.modulo-card h3` |
| Cuerpo | `14px` (app) / `16–17px` (landing) | 400 | `body`, `.hero-subtitulo` |
| Secundario/meta | `11–13px` | 400–500 | `.ranking-detalle`, `.meta-vals` |
| Eyebrow/etiqueta | `13px` | 600 | `.section-eyebrow` |

---

## 3. Espaciados **[NUEVO — brecha cerrada por primera vez aquí]**

No existe una escala formal hoy (`04-DESIGN-SYSTEM.md` §7). Se define:

| Token | Valor | Uso previsto |
|---|---|---|
| `--space-1` | `4px` | Separación mínima (ícono-texto) |
| `--space-2` | `8px` | Gap entre elementos relacionados |
| `--space-3` | `12px` | Padding interno de componentes pequeños |
| `--space-4` | `16px` | Padding estándar de tarjeta |
| `--space-5` | `24px` | Separación entre bloques dentro de una sección |
| `--space-6` | `40px` | Separación entre secciones |

Adopción progresiva por componente, no retroactiva de golpe (`04-DESIGN-SYSTEM.md` §7).

---

## 4. Radios

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | `8px` | Botones, inputs, badges pequeños |
| `--radius` | `12px` | Tarjetas estándar |
| *(sin token, valor directo)* | `14px`–`16px` | Tarjetas grandes / mockups (landing) |
| *(sin token)* | `99px` / `999px` | Píldoras (`.canal-tag`, `.hero-eyebrow`, badges circulares) |

**[NUEVO]** Consolidar `14px`/`16px` en `--radius-lg` la próxima vez que se toque `landing.css` o se cree un componente de tarjeta grande nuevo en la app.

---

## 5. Breakpoints

**Uso real actual (inconsistente entre archivos — brecha ya señalada en `UI-UX.md`)**: la app usa mayormente `600px`/`900px`; la landing usa una progresión más granular (`460/560/700/800/900/1000/1100/1200px`).

**[NUEVO] Escala consolidada propuesta**, a seguir en todo componente nuevo de aquí en adelante:

| Token | Valor | Equivale a |
|---|---|---|
| `--bp-sm` | `480px` | Móvil pequeño |
| `--bp-md` | `700px` | Móvil grande / tablet chica |
| `--bp-lg` | `900px` | Tablet / punto de quiebre de navegación |
| `--bp-xl` | `1100px` | Desktop, ancho de contenido máximo |

No se retro-aplica a breakpoints existentes que ya funcionan correctamente — se usa en grids/layouts nuevos.

---

## 6. Z-Index **[NUEVO — escala formal, antes ad-hoc]**

Valores reales encontrados en el código: `100` (topbar/bottom-nav), `200`/`250`/`300` (capas de UI intermedias sin documentar su propósito exacto), `1000` (modales de la app, header fijo de landing), `2000` (skip-link en foco). Se formaliza como escala:

| Token | Valor | Uso |
|---|---|---|
| `--z-nav` | `100` | Barras de navegación fijas (topbar, bottom-nav, header de landing) |
| `--z-dropdown` | `200` | Menús desplegables, paneles flotantes (notificaciones) |
| `--z-sticky` | `300` | Elementos sticky dentro del flujo de contenido |
| `--z-modal` | `1000` | Overlays y modales |
| `--z-toast` | `1500` | Notificaciones toast — deben verse por encima de un modal abierto |
| `--z-skip-link` | `2000` | Skip-link en estado `:focus` |

---

## 7. Sombras

| Token | Valor | Uso |
|---|---|---|
| `--shadow` | `0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05)` | Elevación sutil por defecto |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,.08)` | Hover de tarjetas |
| *(landing, sin tokenizar)* | `0 8px 20px rgba(99,102,241,.35)` | CTA primario (sombra tintada de marca) |
| *(landing, sin tokenizar)* | `0 20px 40px -16px rgba(15,23,42,.18–.28)` | Tarjetas grandes (planes, capturas) al hacer hover |

---

## 8. Opacidades

Sin tokens formales hoy — valores puntuales: `.04`–`.18` (fondos tintados sutiles, glassmorphism de la sección IA), `.25`–`.65` (textos secundarios sobre fondo oscuro), `.92` (header con blur de la landing). **[NUEVO]** No se propone una escala rígida — la opacidad en este sistema es contextual (depende del fondo), a diferencia de color/espaciado que sí se benefician de una escala fija.

---

## 9. Tamaños (íconos y avatares)

| Contexto | Tamaño |
|---|---|
| Ícono en línea con texto/botón | `14–16px` |
| Ícono de badge/insignia | `18–22px` |
| Avatar circular (ranking) | `36px` (lista) / `44–56px` (podio) |
| Ícono de módulo (badge con degradado) | `44–52px` contenedor, `17–22px` glifo |
| Logo de topbar | `32px` |

---

## 10. Duraciones de animación

| Token | Valor | Uso |
|---|---|---|
| `--duration-fast` | `150ms` | Hover, focus, toggles |
| `--duration-base` | `200–250ms` | Transiciones de tarjeta (elevación, transform) |
| `--duration-slow` | `600–700ms` | Entrada de contenido (`lp-fade-up`, revelado por scroll) |
| *(fuera de escala, intencional)* | `5–7s` | Animaciones ambientales continuas (`lp-float`, `lp-pulse`) — no son feedback de interacción, son atmósfera |

---

## 11. Escalas resumen

Todas las escalas de este documento en una tabla de referencia rápida:

| Escala | Valores |
|---|---|
| Espaciado | 4 · 8 · 12 · 16 · 24 · 40 |
| Radio | 8 · 12 · 14 · 16 · 999 (píldora) |
| Breakpoint | 480 · 700 · 900 · 1100 |
| Z-index | 100 · 200 · 300 · 1000 · 1500 · 2000 |
| Duración | 150 · 200–250 · 600–700 ms |
