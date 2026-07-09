# UI/UX — Marketing Activity Hub Pro

> Capítulo 16 del `PROJECT-BLUEPRINT.md`. Describe el sistema visual y los
> patrones de interfaz ya construidos — no propone un rediseño, documenta lo
> que existe para que todo módulo nuevo encaje sin fricción.
>
> Última actualización: 2026-07-08.

---

## 1. Dos sistemas visuales, deliberadamente separados

| | App autenticada | Landing pública |
|---|---|---|
| Hoja de estilos | `assets/styles.css` (2084 líneas) | `assets/landing.css` (aislado) |
| Prefijo de variables | `--slate-*`, `--indigo`, `--text-*` | `--lp-*` |
| Público | Los 4 roles con sesión | Visitantes sin cuenta |

No comparten CSS a propósito — iterar la landing nunca debe arriesgar la app operativa, y viceversa. Cualquier componente nuevo debe respetar esta frontera.

## 2. Tokens de diseño (app autenticada)

`assets/styles.css` tiene **dos capas de tokens**, producto de la evolución del proyecto:

**Capa 1 — tokens crudos** (desde el origen del proyecto):
`--slate-900/700/500/300/100`, `--indigo`/`--indigo-dark`/`--indigo-light`, `--green`/`--amber`/`--red`/`--blue` (cada uno con su variante `-light`), `--bg`, `--surface`, `--surface-2`, `--border`.

**Capa 2 — alias semánticos** (agregados después, conviven con la capa 1):
`--text-primary` (= `--slate-900`), `--text-secondary`/`--text-muted` (= `--slate-500`), `--surface-1` (= `--surface`).

**Convención a seguir en código nuevo**: usar los alias semánticos (`--text-primary`, `--text-muted`, `--surface-1`) en vez de los tokens crudos — es lo que ya hacen todos los módulos construidos desde la Fase de metas de seguidores en adelante. Componentes más antiguos (topbar, kpi-card original) todavía usan `--slate-900` directo; no hace falta migrarlos, pero no se debe repetir el patrón antiguo en código nuevo.

Otros tokens: `--radius` (12px) / `--radius-sm` (8px), `--shadow` / `--shadow-md`, `--font-sans` (Inter), `--font-display` (Poppins, para títulos), `--topbar-h` (56px) / `--bottomnav-h` (64px).

## 3. Estructura de página compartida

Las 4 páginas con sesión (`admin.html`, `empresa.html`, `directivo.html`, `colaborador.html`) siguen el mismo esqueleto:

```
.topbar (fija, fondo oscuro slate-900)
  └─ logo + título · campanita de notificaciones · botón "Salir"
.contenido.con-bottom-nav
  └─ N × .tab-panel (uno visible a la vez, clase .activo)
.bottom-nav (fija, abajo)
  └─ N × <button onclick="cambiarTab('nombre')">
```

`configurarTabs()` (`js/ui.js`) define el manejador genérico de pestañas una sola vez; cada página solo define sus propios `id="tab-X"` / `id="navbtn-X"`. Una pestaña nueva no requiere JS adicional, solo seguir esa convención de IDs.

## 4. Componentes reutilizables (inventario)

| Componente | Clase(s) CSS | De dónde viene |
|---|---|---|
| Tarjeta genérica | `.card`, `.card-estrecha` | Base del sistema |
| Tarjeta de KPI con barra de progreso | `.kpi-card`, `.kpi-bar-fill` | `js/shared/kpis.js` |
| Badge de estado | `.badge` + `.badge-green/amber/slate` | `claseBadgeEstado()` en `js/ui.js` |
| Carga / esqueleto | `.skeleton`, `.skeleton-line`, `.skeleton-stat` | Usado en casi todo módulo async |
| Estado vacío | `.empty-state` (ícono + texto) | Patrón repetido en todos los módulos |
| Notificación flotante | `.toast`, `.toast-ok/error` | `showToast()` en `js/ui.js` |
| Modal propio (confirmar/prompt/info) | `.modal-overlay`, `.modal-caja` | `showConfirm()`/`showPrompt()`/`showInfo()` — reemplazan `alert()`/`confirm()`/`prompt()` nativos para poder estilizarlos |
| Tarjeta de tarea (colaborador) | `.det-card`, `.seg-tarea-section`, `.completar-section` | `js/shared/detalleTarea.js`, `js/colaborador.js` |
| Historial expandible | `.historial-card`, `.historial-body` | `js/shared/historialTareas.js` |
| Metas de seguidores | `.meta-item`, `.seg-meta-row`, `.seg-pbar` | `js/shared/metasSeguidores.js` |
| Ranking / gamificación | `.podio`, `.ranking-item`, `.badge-logro` | `js/shared/gamificacion.js` |

**Patrón de color semáforo**: cualquier indicador de "qué tan bien va algo" (cumplimiento, avance hacia una meta, podio) usa la misma escala: verde ≥90%, azul/ámbar en rango medio, ámbar/rojo cuando necesita atención — nunca color como decoración, siempre como señal.

## 5. Convenciones por rol

- **Colaborador**: pensado primero para celular (según Fase 7 de `FASES-APP.md`) — tarjetas apiladas en vez de tablas, acción principal (reportar avance) siempre visible sin scroll excesivo.
- **Admin de empresa**: la pantalla con más densidad de información (calendario + formularios + tablas de gestión) — organizado en pestañas para no abrumar de una vez.
- **Directivo**: mismas pantallas que el admin pero en modo solo-lectura (calendario `editable:false`, sin botones de creación/edición) — mismo lenguaje visual para que ambos "hablen el mismo idioma" al revisar juntos.
- **Super Admin**: interfaz más utilitaria (tablas administrativas), es la única persona que ve datos de más de una empresa a la vez.

## 6. Sanitización y accesibilidad

- Todo texto libre escrito por usuarios pasa por `sHtml()` (`js/ui.js`) antes de insertarse con `innerHTML`. Si `DOMPurify` está cargado en la página, permite un set acotado de tags seguros (negritas, listas, saltos de línea); si no, degrada a texto plano escapado — nunca deja la página expuesta a XSS por faltar una dependencia opcional.
- `DOMPurify` solo se carga hoy en `empresa.html` y `colaborador.html` — en `admin.html`/`directivo.html` el texto rico se ve como texto plano (degradación segura, inconsistencia de presentación, no vulnerabilidad).
- La landing pública sí implementa accesibilidad explícita: skip-link ("Saltar al contenido"), `aria-label`/`aria-expanded` en el menú móvil, `prefers-reduced-motion` respetado en todas las animaciones. La app autenticada no tiene un skip-link equivalente.

## 7. Oportunidades detectadas (documentar, no corregir sin aprobación)

- El comentario de cabecera de `assets/styles.css` dice *"DUNI HUB — Design System, Sprint 3"* — nombre de marca anterior a "Marketing Activity Hub Pro", sin efecto funcional pero confuso para alguien nuevo leyendo el archivo.
- Tablas administrativas (`admin.html`, `empresa.html`) no tienen una versión de tarjeta para móvil — identificado también en `ROADMAP.md` como pendiente de la Fase 7.
- Ningún skip-link en la app autenticada (sí existe en la landing) — inconsistencia de accesibilidad entre ambos sistemas visuales.
