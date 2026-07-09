# ENGINEERING STANDARDS — Manual Oficial de Ingeniería de MAHP

> Manual técnico oficial para todo desarrollador, colaborador o asistente de
> IA que trabaje en Marketing Activity Hub Pro. Compatible y subordinado a
> `01-IDENTIDAD-DEL-PRODUCTO.md` (por qué) y `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md`
> (cómo se estructura) — este documento define **cómo se escribe y se entrega**
> cada cambio dentro de esa arquitectura.
>
> Todo estándar aquí descrito se contrasta contra el código real del proyecto,
> no contra una convención genérica de la industria — donde la práctica actual
> difiere del ideal, se dice explícitamente (mismo criterio que el resto de
> `/docs`, ver `CLAUDE.md` §2).
>
> Última actualización: 2026-07-09.

---

## 1. Filosofía de Ingeniería

Un desarrollador (o asistente de IA) que trabaja en MAHP piensa así, en este orden:

1. **El código se lee muchas más veces de las que se escribe.** Un nombre de función que explica su intención (`cargarTareas`, `renderRanking`) vale más que un comentario que la describe por fuera.
2. **La simplicidad es la prioridad, no una excusa para hacer menos.** Elegir la solución más simple que resuelve el problema real de hoy — no la más simple posible, no la más "a prueba de futuro" posible (Principio 6 de `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md`, Simplicidad Progresiva).
3. **El software evoluciona sin romper lo que ya funciona.** Cada línea nueva se escribe con la pregunta "¿esto puede romper un módulo que ya está en producción?" ya respondida antes de guardar el archivo.
4. **La documentación es parte del desarrollo, no un paso posterior.** Un cambio que modifica el comportamiento de un módulo documentado no está terminado hasta que esa documentación coincide con el código.
5. **Se verifica, no se asume.** El precedente de este proyecto (funciones y columnas asumidas que nunca existieron, fases marcadas "construidas" sin estarlo — `CLAUDE.md` §2) es la razón concreta de esta regla, no una precaución teórica.

**Flujo rector**, ya declarado por el CTO y vinculante para todo el proyecto:

```
Documentation First → Architecture First → Design First → Development Second
→ Testing Always → Documentation Never Ends
```

---

## 2. Flujo Oficial de Desarrollo (MAHP Development Workflow)

```
   Idea
     │
     ▼
   Análisis ──────────────► ¿Ya existe algo parecido? Revisar MODULOS.md/DATABASE.md
     │
     ▼
   Revisión del PROJECT-BLUEPRINT ─► ¿Encaja en la arquitectura definida (cap. 9–23)?
     │
     ▼
   Revisión del MDS relevante ────► ¿Es compatible con Identidad (01) y Arquitectura (02)?
     │
     ▼
   Diseño Técnico ─────────────────► Qué tablas/RLS, qué módulo de js/shared/, qué UI
     │
     ▼
   Aprobación ──────────────────────► El usuario/CTO confirma alcance antes de código
     │
     ▼
   Desarrollo ───────────────────────► Implementación siguiendo cap. 4–10 de este documento
     │
     ▼
   Pruebas ──────────────────────────► Cap. 15 — mínimo smoke test manual del flujo afectado
     │
     ▼
   Documentación ────────────────────► Cap. 12 — actualizar lo que corresponda en el mismo cambio
     │
     ▼
   Release ──────────────────────────► Commit con mensaje claro; deploy (GitHub Pages / Supabase)
```

**Qué etapas pueden saltarse para un fix pequeño**: "Revisión del MDS" y "Diseño Técnico" formal pueden comprimirse a una frase mental para un ajuste de una línea que no cambia comportamiento — pero **Análisis** (verificar contra el código real) y **Documentación** nunca se saltan, sin importar el tamaño del cambio.

---

## 3. Reglas Generales

1. Nunca duplicar código — si dos módulos necesitan la misma lógica, se sube al Core o se extrae a `js/shared/` (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §6).
2. Nunca eliminar una funcionalidad existente sin autorización explícita del usuario.
3. Un cambio, una responsabilidad — no mezclar un fix de bug con una funcionalidad nueva en el mismo commit.
4. Nunca asumir información: nombre de columna, existencia de una función, comportamiento de una tabla — se verifica leyendo el archivo o el esquema antes de usarlo.
5. Siempre analizar dependencias antes de modificar: ¿qué otro módulo importa esta función?, ¿qué política RLS depende de esta columna?
6. Siempre documentar en el mismo cambio, no "después" (cap. 12).
7. Siempre justificar decisiones no obvias con un comentario breve que explique el porqué, nunca el qué (cap. 8.7).
8. Nunca modificar la base de datos sin un archivo de migración nuevo (cap. 10).
9. Nunca exponer un secreto (API key, token) en código de cliente — siempre `Deno.env` en una Edge Function (cap. 16).
10. Ante ambigüedad de alcance o de negocio, preguntar antes de decidir; ante un detalle de implementación que no cambia el resultado para el usuario, decidir de forma autónoma y razonada (ya establecido en `CLAUDE.md` §8).

---

## 4. Convenciones de Código

| Elemento | Convención | Ejemplo real del proyecto |
|---|---|---|
| Variables | `camelCase` | `companyId`, `miPerfil`, `tareasUserId` |
| Funciones | `camelCase`, verbo + qué hace; español o inglés según el dominio ya establecido en ese archivo (ver nota abajo) | `cargarActividades()`, `renderRanking()`, `toggleCampania()` |
| Constantes fijas | `UPPER_SNAKE_CASE` | `CANAL_COLORS`, `RANGO_ACTIVIDADES_POR_FRECUENCIA`, `COLORES_AVATAR` |
| Archivos JS | `camelCase.js`, sustantivo del dominio que representan | `metasSeguidores.js`, `historialTareas.js`, `gamificacion.js` |
| Archivos HTML | minúsculas, una palabra, el rol que representan | `empresa.html`, `directivo.html` |
| Clases CSS | `kebab-case`, con prefijo de componente | `.seg-meta-row`, `.btn-hero-primario`, `.historial-card` |
| Tablas SQL | `snake_case`, español donde el dominio nació en español, inglés donde nació en inglés (ver cap. 10 — inconsistencia heredada, documentada, no se corrige a mitad de camino) | `actividades`, `points_log`, `follower_goals` |
| Columnas SQL | `snake_case` | `company_id`, `assigned_to`, `progress_pct` |
| Funciones SQL | `snake_case`, verbo + qué hace | `award_tarea_completada()`, `sync_activity_progress()` |
| Eventos/handlers globales | `window.verboSustantivo` | `window.completarTarea`, `window.cambiarRankingTab` |

**Nota sobre español/inglés mixto**: es una característica heredada del proyecto, no un error a corregir de golpe. Regla para código nuevo: el **dominio de negocio** (actividades, campañas, colaboradores) se nombra en español, consistente con el resto de esa capa; conceptos **técnicos genéricos** (log, points, goals) pueden nombrarse en inglés si así ya se estableció en ese módulo. Nunca mezclar los dos idiomas dentro del mismo nombre compuesto (evitar `activity_puntos`).

**Cuándo usar cada estilo de mayúsculas**: `camelCase` para todo identificador de JavaScript que no sea una constante verdaderamente fija; `PascalCase` reservado para si el proyecto adopta clases/componentes en el futuro (hoy no se usa — el proyecto es funcional, sin `class`); `snake_case` exclusivo de SQL; `kebab-case` exclusivo de CSS y de nombres de archivo HTML de más de una palabra; `UPPER_SNAKE_CASE` solo para constantes que nunca cambian en tiempo de ejecución.

---

## 5. Organización del Proyecto

Estructura **actual**, que se mantiene como estándar mientras el proyecto no cruce el umbral de complejidad descrito en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §7:

| Carpeta | Responsabilidad | Qué va aquí |
|---|---|---|
| `js/` | Punto de entrada por página | Un archivo por HTML con sesión (`empresa.js`, `directivo.js`, etc.) — orquesta, no implementa lógica de dominio extensa |
| `js/shared/` | Módulos de dominio reutilizables | Lógica que se usa desde más de un punto de entrada (`kpis.js`, `gamificacion.js`, etc.) — equivalente funcional a `modules/` |
| `assets/` | CSS y estáticos | `styles.css` (app autenticada), `landing.css`/`landing.js` (landing, aislados a propósito), `favicon.svg` |
| `supabase/functions/` | Backend propio (Edge Functions) | Equivalente a `services/` — cada subcarpeta es una función independiente |
| `supabase_schema_vN.sql` (raíz) | Migraciones | Equivalente a `database/` — un archivo por cambio de esquema, nunca editar uno ya aplicado |
| `docs/` | Documentación oficial | Este set de documentos |

**Carpetas que no existen todavía y cuándo se justifican** (no crearlas por anticipación — Principio 6):
- `components/`: el día que el frontend adopte un framework (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §7, umbral de migración) — hoy los "componentes" son funciones que devuelven HTML como string, documentadas en `UI-UX.md` §4.
- `utils/`: hoy `js/ui.js` cumple ese rol (sanitización, formateo) — se separa a `utils/` solo si crece lo suficiente para justificar más de un archivo.
- `config/`: no existe configuración de entorno más allá de las constantes en `supabaseClient.js` — se crea cuando haya más de un entorno (dev/staging/prod).
- `resources/`: no aplica hoy — si se agregan assets de marketing/plantillas descargables en el futuro.

---

## 6. Estándares HTML

- **Semántica primero**: `<header>`, `<main>`, `<nav>`, `<footer>`, `<section>` con `id` — ya el estándar seguido en la landing (`index.html`); las páginas de app autenticada usan `<div class="topbar">`/`<div class="bottom-nav">` por herencia del diseño original — no se retro-migra sin necesidad, pero **todo HTML nuevo usa las etiquetas semánticas correspondientes**.
- **Accesibilidad**: `aria-label` en botones sin texto visible (íconos), `aria-hidden="true"` en íconos decorativos, `aria-expanded`/`aria-controls` en cualquier menú colapsable (patrón ya establecido en `index.html`, pendiente de retro-aplicar a la app autenticada — `UI-UX.md` §6).
- **SEO**: solo relevante en la landing pública — meta description, Open Graph, canonical ya establecidos (`index.html`). La app autenticada no requiere SEO (páginas detrás de login).
- **Orden de etiquetas en `<head>`**: charset → viewport → title → meta descriptivos → preconnect → stylesheets → scripts síncronos de librería → (el script de módulo de la página va al final del `<body>`).
- **Buenas prácticas**: un solo `<h1>` por página; formularios con `<label>` asociado a cada input; ningún `onclick` con lógica inline compleja — siempre una llamada a una función definida en el JS de esa página.

---

## 7. Estándares CSS

- **Variables**: todo color/medida reutilizable pasa por una custom property de `:root` — nunca un valor hardcodeado repetido en más de una regla. Usar los alias semánticos (`--text-primary`, `--text-muted`, `--surface-1`) en código nuevo, no los tokens crudos (`--slate-900`) — `UI-UX.md` §2.
- **Paleta**: indigo (`#6366F1`) como color de marca/acento; verde/ámbar/rojo reservados exclusivamente para semáforo de estado (nunca decorativos) — `UI-UX.md` §4.
- **Espaciados**: no hay una escala formal de espaciado hoy (valores puntuales en `rem`/`px` por componente) — **brecha a cerrar**: definir una escala (`--space-1` a `--space-6`) es la primera mejora recomendada de este capítulo antes de que el CSS crezca más.
- **Tipografía**: `--font-display` (Poppins) exclusivo de títulos (`h1`–`h4`); `--font-sans` (Inter) para todo lo demás.
- **Responsive**: mobile-first para cualquier pantalla usada por `collaborator` (`UI-UX.md` §5); breakpoints por componente, no una grilla global fija — ya el patrón seguido en `landing.css`.
- **Animaciones**: solo con propósito (revelar contenido al hacer scroll, retroalimentación de hover) — nunca decorativas sin función; siempre respetar `prefers-reduced-motion` (ya aplicado en `landing.css`).
- **Estados**: `:hover`, `:focus-visible` (nunca solo `:focus` para no romper accesibilidad de teclado), y clases de estado explícitas (`.activo`, `.top1`, `.reveal.visible`) en vez de estilos inline vía JavaScript.
- **Convenciones y organización**: un bloque de comentario por sección de funcionalidad (`/* ── Nombre ─────── */`, ya el patrón de `styles.css`/`landing.css`); reglas nuevas se agregan **al final del archivo correspondiente**, agrupadas bajo su propio comentario de sección — nunca intercaladas en medio de un bloque existente.
- **Escalabilidad**: mientras el archivo único (`styles.css`) sea manejable, se mantiene así (Principio 6); se divide por dominio (`kpis.css`, `gamificacion.css`, etc.) solo si su tamaño empieza a dificultar encontrar una regla — no antes.

---

## 8. Estándares JavaScript

1. **Funciones**: siempre `async function` (o arrow `async`) para cualquier operación que toque Supabase — nunca mezclar `.then()` con `await` en el mismo bloque.
2. **Asincronía**: `Promise.all([...])` para consultas independientes que se pueden lanzar en paralelo (patrón ya consistente en todo el proyecto, ej. `renderRanking()`) — nunca `await` secuencial cuando las consultas no dependen entre sí.
3. **Manejo de errores**: el patrón establecido es `const { data, error } = await supabase...` seguido de `if (error) { ...; return; }` — nunca ignorar `error` silenciosamente. Para errores de usuario, `showToast(mensaje, 'error')`; para errores de desarrollo/depuración, `console.error('[módulo] contexto:', error.message)` con el nombre del módulo entre corchetes (ya el patrón de `dashboard.js`, `avances.js`).
4. **Eventos**: los manejadores expuestos a HTML (`onclick="..."`) se asignan a `window.nombreFuncion` dentro del módulo que los usa — nunca en el HTML directamente más allá de la llamada.
5. **Modularidad**: cada módulo de `js/shared/` exporta funciones puras respecto a sus dependencias — reciben `supabase`, IDs de contenedor y callbacks como parámetros, nunca asumen variables globales salvo `window` para exponer sus propios handlers.
6. **Separación de responsabilidades**: una función que consulta datos no debería también manejar el evento de submit de un formulario completo — se separan en "cargar/renderizar" vs. "manejar acción del usuario", visibles como funciones distintas incluso si una llama a la otra.
7. **Documentación y comentarios**: sin JSDoc formal (no es el estilo del proyecto) — comentarios de sección (`// ── Nombre ──`) para separar bloques funcionales dentro de un archivo, y comentarios de una línea únicamente cuando explican un **porqué** no evidente (una regla de negocio, una decisión de seguridad) — nunca comentarios que repiten lo que el código ya dice.
8. **Manejo del DOM**: `document.getElementById()` es el patrón establecido (no hay librería de DOM); construir HTML como template strings y asignar con `.innerHTML` una sola vez por render, no mutaciones incrementales del DOM.
9. **Buenas prácticas adicionales**: sanitizar todo texto de base de datos con `sHtml()` antes de insertarlo (`UI-UX.md` §6); nunca `eval()` ni `innerHTML` con contenido no sanitizado; preferir `?.`/`??` sobre verificaciones largas de `if`.

**Ejemplo de patrón correcto** (tomado del código real, `js/shared/kpis.js`):
```js
export async function cargarSeguidoresParaKpis(supabase, companyId) {
  const { data, error } = await supabase
    .from('follower_totals')
    .select('channel_name, channel_icon, total_actual')
    .eq('company_id', companyId);
  if (error) {
    console.error('[kpis] cargarSeguidoresParaKpis:', error.message);
    return [];
  }
  return data ?? [];
}
```

---

## 9. Estándares Supabase

- **Consultas**: siempre filtradas por `company_id` explícitamente en el cliente **además** de confiar en RLS — doble capa intencional (defensa en profundidad), no redundancia inútil.
- **Autenticación**: `requireSession(rolesPermitidos)` al inicio de cada página protegida — ningún módulo de dominio valida sesión por su cuenta, es responsabilidad exclusiva del punto de entrada de la página.
- **Policies/RLS**: una política explícita por operación (`select`/`insert`/`update`/`delete`), nunca `for all` genérico salvo que las cuatro reglas sean idénticas y se declare así intencionalmente. Toda tabla nueva nace con RLS habilitado en el mismo archivo que la crea.
- **Migraciones**: ver cap. 10 — un archivo `.sql` por cambio, nunca editar uno ya aplicado.
- **Triggers**: usar `security definer` únicamente cuando el rol invocador legítimamente no debería tener permiso de escritura directa sobre la tabla de destino (patrón ya usado en gamificación/notificaciones) — nunca como atajo para evitar escribir la política RLS correcta.
- **Storage**: un bucket por dominio de archivo (`evidencias` ya existe); ruta de archivo con prefijo `company_id/` para que el aislamiento sea legible incluso mirando el bucket directamente.
- **Realtime**: no usado hoy (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §3) — cuando se adopte, cada suscripción se limita explícitamente por `company_id`, nunca una suscripción global sin filtro.
- **Funciones (Edge Functions)**: patrón obligatorio ya establecido — validar `Authorization` primero, secretos vía `Deno.env`, contrato de respuesta `{ error }` en fallos (`API.md` §4).
- **Buenas prácticas**: nunca ejecutar SQL directo contra el proyecto del usuario sin su instrucción explícita para esa tarea puntual (`CLAUDE.md` §4); verificar relaciones ambiguas antes de un `.select()` con embed (`DATABASE.md` §4).

---

## 10. Estándares SQL

- **Convención de tablas**: `snake_case`, plural cuando representa una colección de entidades (`actividades`, `campaigns`) — mixto español/inglés heredado, ver cap. 4.
- **Columnas**: `snake_case`; claves foráneas siempre nombradas `<entidad_singular>_id` o, cuando hay más de una FK al mismo destino, un nombre que describa el rol (`assigned_to`, `authorized_by`, `uploaded_by` — todas apuntan a `profiles` pero se distinguen por función, no por número).
- **Índices**: no auditados formalmente hoy (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §9) — estándar a partir de ahora: toda tabla operativa de alto volumen nueva debe evaluar un índice compuesto `(company_id, columna_de_filtro_frecuente)` en el mismo archivo de migración que la crea.
- **Relaciones**: FK explícitas con `on delete cascade`/`on delete set null` según corresponda semánticamente (cascade cuando el hijo no tiene sentido sin el padre, set null cuando sí) — ya el patrón seguido consistentemente en el esquema actual.
- **Migraciones**: `supabase_schema_vN.sql`, siguiente número disponible, nunca reutilizar ni editar uno ya aplicado. Cabecera obligatoria con comentario describiendo qué contiene (patrón ya seguido en todos los archivos existentes). Recomendación de evolución (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §9): migrar a `supabase migration new` cuando haya más de un desarrollador o más de un entorno.
- **Versionado**: el número de archivo es la única fuente de verdad de orden de aplicación — nunca asumir que el orden alfabético o de fecha de modificación coincide (ya hay huecos documentados, `DATABASE.md` §8).
- **Soft delete**: no implementado hoy (brecha detectada en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §9) — estándar para tablas nuevas donde la pérdida de un registro sea un riesgo de negocio: columna `deleted_at timestamptz null`, filtrada por defecto en las políticas de `select`.
- **Auditoría**: patrón *append-only* (`activity_updates`, `points_log`, `follower_logs`) para cualquier tabla nueva donde la trazabilidad importe — nunca un `update` que sobrescribe el valor anterior sin dejar rastro.
- **Naming convention resumida**: tabla = sustantivo plural; columna FK = `entidad_id` o rol descriptivo; función = verbo + qué hace; trigger = `trg_` + nombre de la función que ejecuta.

---

## 11. Gestión de Versiones

**Estado actual, documentado con honestidad**: un solo desarrollador (con asistencia de IA), una sola rama (`main`), commits directos, sin tags de versión, sin `CHANGELOG` semántico de releases de software (sí existe `docs/CHANGELOG.md` como bitácora narrativa). Es una práctica **válida y suficiente para el estado actual del proyecto** (Principio 6) — no una deficiencia a corregir de inmediato.

**Estándar a adoptar quando el equipo crezca a más de una persona trabajando en paralelo**:
- **Versionado semántico** (`MAJOR.MINOR.PATCH`) para releases del producto, no del código de cada commit.
- **Branches**: `main` (siempre desplegable), `feature/nombre-corto` para trabajo en curso, `hotfix/nombre-corto` para correcciones urgentes directo desde `main`. No se introduce `develop` como rama intermedia salvo que el ritmo de releases lo justifique — otra aplicación de Simplicidad Progresiva.
- **Tags**: uno por release notable, coincidiendo con una entrada de `CHANGELOG.md`.
- **Mensajes de commit**: ya se sigue implícitamente un buen patrón (verbo en presente, descripción concisa del qué + por qué en el cuerpo cuando no es obvio) — se formaliza como estándar: primera línea ≤ 70 caracteres, cuerpo explicando el porqué si no es evidente por el título.

**Regla vigente ya, sin esperar a que el equipo crezca**: nunca hacer commit de un archivo con secretos (ya hay precedente de una clave expuesta, `CLAUDE.md` §5); nunca forzar push a `main`; nunca hacer commit salvo que el usuario lo pida explícitamente (regla operativa ya vigente para cualquier asistente de IA en este proyecto).

---

## 12. Documentación

Matriz de qué actualizar según el tipo de cambio:

| Tipo de cambio | Documentos a actualizar |
|---|---|
| Tabla o columna nueva | `DATABASE.md` + el `.sql` de migración correspondiente |
| Módulo o funcionalidad nueva | `MODULOS.md` + `CHANGELOG.md` |
| Cambio de arquitectura (nuevo patrón, nueva integración, nuevo dominio) | `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` (la sección correspondiente) |
| Cambio que afecta la identidad/visión del producto | `01-IDENTIDAD-DEL-PRODUCTO.md` — raro, requiere aprobación explícita del CTO |
| Nueva Edge Function o cambio de contrato de una existente | `API.md` |
| Cambio en el flujo de generación/uso de IA | `IA.md` |
| Componente visual nuevo o cambio de convención de UI | `UI-UX.md` |
| Cualquier cambio de producto o de documentación, sin excepción | `CHANGELOG.md` |
| Fase completada, diseñada, o reclasificada de estado | `ROADMAP.md` |
| Nueva regla operativa para asistentes de IA | `CLAUDE.md` |

**Flujo documental**: la documentación se actualiza en el mismo cambio que el código, nunca en un commit "de limpieza" posterior — es la regla más repetida en todo este set de documentos porque es la que más se ha visto romperse en otros proyectos (y ya casi se rompió una vez en este, ver la corrección de la Fase 12 en `ROADMAP.md`).

---

## 13. Estándares de Calidad

| Dimensión | Estándar |
|---|---|
| **Legibilidad** | Un desarrollador nuevo debe poder entender qué hace una función por su nombre y su forma, sin leer su implementación completa |
| **Mantenibilidad** | Ningún archivo de lógica de dominio debería requerir "recordar" contexto no escrito en ningún lado para modificarse con seguridad |
| **Escalabilidad** | Todo módulo nuevo pasa el checklist de `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §19 antes de aprobarse |
| **Complejidad** | Preferir una función más larga y lineal sobre varias funciones pequeñas con flujo de control difícil de rastrear entre ellas — legibilidad por encima de "pureza" de descomposición |
| **Duplicación** | Cero lógica de dominio duplicada entre módulos (cap. 3, regla 1) — duplicación de estructura visual (ej. dos formularios parecidos) es aceptable si no comparten lógica real |
| **Performance** | Se mide antes de optimizar (Principio 8 de arquitectura) — no se especula |
| **Seguridad** | RLS en toda tabla, sanitización en todo texto libre, sin secretos en cliente — no negociable, ver cap. 16 |
| **Accesibilidad** | `aria-*` en controles no textuales, contraste de color con propósito (semáforo), navegación por teclado no rota |
| **Experiencia de usuario** | Lenguaje simple sin jerga técnica en toda interfaz (`UI-UX.md` §5); estado vacío que guía, no solo informa |

---

## 14. Code Review

**Checklist obligatorio antes de considerar un cambio listo:**

1. ¿Se verificó contra el código/esquema real, no se asumió nada? (cap. 1, principio 5)
2. ¿Rompe algún módulo documentado en `MODULOS.md`? Confirmar que no, explícitamente.
3. ¿Sigue las convenciones de nombres del cap. 4?
4. ¿Toda tabla nueva tiene RLS completo (cap. 9)?
5. ¿Hay algún secreto expuesto en código de cliente? (cap. 16)
6. ¿La documentación correspondiente (cap. 12) se actualizó en el mismo cambio?
7. ¿Se probó manualmente el flujo afectado, no solo se asumió que funciona? (cap. 15)
8. ¿El mensaje de commit explica el porqué, no solo el qué?

**Preguntas obligatorias que quien revisa debe poder responder**: ¿qué pasa si esta consulta no encuentra datos (lista vacía)? ¿qué pasa si el usuario no tiene permiso (RLS deniega)? ¿qué pasa si Supabase responde con error de red?

**Buena práctica**: cuando quien revisa es un asistente de IA distinto de quien implementó, debe re-derivar la verificación de forma independiente (releer el código real), no confiar en el resumen de quien implementó — mismo principio que ya rige revisiones de código entre humanos.

---

## 15. Testing

**Estado actual**: sin pruebas automatizadas (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §16, riesgo ya identificado). Es una limitación real, no ignorada — y no se resuelve escribiendo un framework de testing completo de golpe (Principio 6).

**Estrategia por capas, en orden de adopción recomendado:**

1. **Manual, siempre, sin excepción**: todo cambio que toca un flujo de usuario se ejercita en el navegador antes de darse por terminado — no basta con que el código "se vea correcto". Ya es una práctica seguida consistentemente en este proyecto (verificar en `localhost` antes de publicar).
2. **Smoke tests documentados** (siguiente paso, bajo costo): una lista de pasos críticos por rol (login → ver calendario → reportar avance, para `collaborator`; login → crear actividad → asignar, para `company_admin`) que se corre manualmente antes de cada release notable — vive como checklist, no como código todavía.
3. **Regresión**: hoy es manual (recordar qué se rompió antes y volver a probarlo) — se formaliza como checklist creciente a partir del punto 2.
4. **UI automatizada / integración / base de datos / seguridad**: no se adoptan hasta que el equipo o el volumen de usuarios lo justifique (umbral: escalón de 10,000 usuarios de `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §14, o más de un desarrollador tocando el mismo módulo en paralelo). Cuando llegue ese momento, el candidato natural es probar las políticas RLS directamente (son la superficie de seguridad más crítica) antes que UI end-to-end.

---

## 16. Seguridad del Desarrollo

- **Variables sensibles / secrets / tokens / API keys**: nunca en código de cliente, nunca en un archivo versionado del repositorio — exclusivamente como secreto de Edge Function (`Deno.env.get`). Ya hay precedente de una violación de esta regla (clave de Groq expuesta, corregida y rotada) — es la regla de seguridad más importante de este documento.
- **Supabase keys**: la `publishable key` (anon) es segura de exponer en el cliente por diseño (protegida por RLS) — la `service_role key` **nunca**, bajo ninguna circunstancia, en ningún archivo del repositorio ni en una Edge Function salvo que esa función esté explícitamente diseñada para operar con privilegios elevados y revisada por el CTO.
- **Autenticación**: nunca implementar un mecanismo propio de sesión — exclusivamente Supabase Auth.
- **Permisos**: nunca una verificación de rol solo en el cliente sin la política RLS equivalente respaldándola (cap. 9).
- **Logs**: nunca registrar contraseñas, tokens, ni datos personales sensibles en `console.log`/`console.error` — el mensaje de error de Supabase ya es seguro de loguear (no contiene secretos), los valores que el usuario ingresó a veces no lo son.
- **Errores mostrados al usuario**: mensaje humano, nunca la traza técnica completa ni detalles que revelen estructura interna de la base de datos.
- **Ejecución contra el proyecto real del usuario**: regla ya vigente y reforzada aquí — sin ejecutar comandos ni SQL directo contra Supabase del usuario sin su instrucción explícita para esa tarea puntual (`CLAUDE.md` §4).

---

## 17. Desarrollo con Inteligencia Artificial

Protocolo oficial para Claude Code (o cualquier asistente de IA) trabajando en este repositorio — complementa, no reemplaza, `CLAUDE.md`:

**Qué puede hacer**: leer y modificar código siguiendo este manual; proponer y (con aprobación) crear migraciones nuevas; escribir y actualizar documentación; ejecutar comandos de la Supabase CLI ya autenticada cuando el usuario lo pidió explícitamente para esa tarea.

**Qué no puede hacer**: ejecutar SQL directo contra el proyecto de Supabase del usuario sin instrucción explícita puntual; hacer commit o push sin que el usuario lo pida; eliminar una funcionalidad existente sin autorización; fabricar contenido de negocio no confirmado (precios reales, testimonios, texto legal — `CLAUDE.md` §6); asumir que algo existe sin verificarlo.

**Cómo debe analizar**: leyendo el código y el esquema real antes de actuar, nunca basándose solo en lo que un documento anterior afirma sin contrastarlo (ya ocurrió una corrección real de este tipo, `ROADMAP.md` — Fase 12).

**Cómo debe modificar código**: el cambio mínimo necesario, nunca reemplazar un archivo completo cuando se puede editar solo lo que cambia; siguiendo las convenciones de cap. 4–10 de este documento.

**Cómo debe documentar**: en el mismo cambio, usando la matriz de cap. 12 — nunca dejarlo para un cambio posterior "de documentación".

**Cómo debe justificar decisiones**: explicando el porqué cuando la decisión no es obvia, en la respuesta al usuario y, si aplica, en un comentario del código o en el documento correspondiente.

**Cómo debe solicitar aclaraciones**: cuando la ambigüedad es de alcance o de negocio (dónde vive un contenido, qué prioridad tiene una fase) — pregunta antes de decidir. Cuando es un detalle de implementación que no cambia el resultado visible para el usuario, decide de forma autónoma y lo explica al reportar el resultado.

**Cómo debe validar cambios antes de implementarlos**: releyendo el archivo que va a modificar (nunca edita a ciegas basado en memoria de la conversación), y verificando después del cambio que no rompió el balance de etiquetas/sintaxis cuando aplica.

---

## 18. Checklist de Desarrollo

Antes de entregar cualquier funcionalidad:

- [ ] Verificado contra el código/esquema real, no asumido.
- [ ] Sigue las convenciones de nombres (cap. 4) y de organización (cap. 5).
- [ ] No duplica lógica existente en otro módulo.
- [ ] No rompe ningún módulo documentado en `MODULOS.md`.
- [ ] Toda tabla nueva tiene `company_id` + RLS completo.
- [ ] Ningún secreto expuesto en código de cliente.
- [ ] Probado manualmente el flujo afectado en el navegador.
- [ ] Documentación actualizada según la matriz del cap. 12.
- [ ] `CHANGELOG.md` actualizado.
- [ ] Mensaje de commit claro, explica el porqué si no es obvio.

---

## 19. Definition of Done (DoD)

Una tarea se considera terminada solo cuando:

| Dimensión | Criterio |
|---|---|
| Código | Implementado siguiendo cap. 4–10, sin duplicación evitable |
| Pruebas | Flujo afectado ejercitado manualmente en el navegador (cap. 15) |
| Documentación | Actualizada según cap. 12, en el mismo cambio |
| Compatibilidad | No rompe ningún módulo existente (`MODULOS.md` verificado) |
| Seguridad | RLS completo en tablas nuevas; sin secretos expuestos (cap. 16) |
| Rendimiento | Sin regresión evidente; si el cambio afecta una consulta de alto volumen, se consideró el índice correspondiente (cap. 10) |
| UX | Lenguaje simple, estado vacío/error manejado, coherente con `UI-UX.md` |
| Arquitectura | Pasa el checklist de `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §19 si es un módulo significativo |

---

## 20. Manifiesto de Ingeniería MAHP

> No escribimos código para que funcione una vez. Lo escribimos para que alguien más — humano o IA — pueda entenderlo, confiar en él, y construir sobre él sin tener que adivinar por qué se hizo así.
>
> Verificamos antes de asumir. Preferimos preguntar una vez a corregir un error de suposición tres veces.
>
> La simplicidad no es un atajo — es la disciplina de resolver el problema de hoy sin cargar con la complejidad del problema que todavía no existe.
>
> La seguridad no se agrega al final. Vive en cada tabla, en cada política, en cada consulta, desde la primera línea.
>
> Documentar no es el trabajo que queda después del código. Es el mismo trabajo, visto desde el otro lado: si nadie más puede entender por qué se construyó algo, ese algo eventualmente se rompe sin que nadie sepa arreglarlo.
>
> No perseguimos la arquitectura perfecta. Perseguimos la arquitectura correcta para el tamaño real de MAHP hoy, diseñada con la honestidad de saber hacia dónde tiene que crecer mañana.
>
> Esto es ingeniería en MAHP: rigurosa donde importa, simple donde puede serlo, y siempre — siempre — verificada contra la realidad, no contra la suposición.

---

## Resumen para el CTO (tú)

**1. Estándares más importantes de este manual**
- Verificar contra el código real antes de actuar (cap. 1, 17) — el estándar individual más repetido en todo `/docs`, porque es el que más veces se ha visto fallar en la práctica real de este proyecto.
- RLS completo y explícito en toda tabla nueva, sin excepción (cap. 9, 16) — es la regla de seguridad de mayor severidad posible dado el modelo multi-tenant.
- Documentación en el mismo cambio, nunca después (cap. 12) — la disciplina que sostiene que el resto de `/docs` siga siendo confiable con el tiempo.
- Simplicidad Progresiva aplicada también a testing y control de versiones (cap. 11, 15) — evita que este manual se use para exigir infraestructura que el tamaño actual del proyecto no necesita.

**2. Riesgos si estos estándares no se siguen**
- Sin verificación contra el código real: repetición del patrón ya observado de "documentado como construido, nunca implementado" (`ROADMAP.md` — Fase 12) o peor, código nuevo que asume una función/columna inexistente y falla en producción.
- Sin RLS completo en una tabla nueva: fuga de datos entre empresas — el riesgo de mayor severidad posible en este producto, dado que la promesa central de MAHP (`01-IDENTIDAD-DEL-PRODUCTO.md` §7, principio 13) es precisamente que eso nunca ocurra.
- Sin documentación en el mismo cambio: la brecha ya detectada y corregida una vez en `DATABASE.md`/`ROADMAP.md` se repite y se vuelve más difícil de cerrar cuanto más tiempo pasa.
- Sin testing manual mínimo: regresiones silenciosas que solo se detectan cuando un usuario las reporta (mismo riesgo ya señalado en observabilidad, `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §15).

**3. Métricas propuestas para evaluar cumplimiento**
- **Cobertura de documentación**: % de módulos en `MODULOS.md` cuyo estado real coincide con lo documentado (verificable por auditoría periódica, como la que ya se hizo en MDS-001/MDS-003).
- **Duplicación**: número de funciones con lógica equivalente repetida en más de un archivo de `js/shared/` — objetivo: cero, medible por revisión manual dado el tamaño actual del proyecto (no requiere herramienta automatizada todavía).
- **Complejidad**: líneas por archivo como proxy simple (ya usado informalmente en el análisis de MDS-001, ej. detectar que `empresa.js`/`styles.css` son los archivos más grandes) — sin necesidad de una métrica formal tipo complejidad ciclomática mientras el proyecto sea de este tamaño.
- **Tiempos de revisión**: no aplica formalmente con un solo desarrollador — se activa como métrica real cuando haya más de una persona proponiendo cambios en paralelo.
- **Incidentes de seguridad**: número de secretos expuestos detectados en revisión vs. detectados después del hecho — objetivo: siempre en revisión, nunca después (ya hubo un caso histórico de esto último, cap. 16).

**4. Proceso de mejora continua propuesto**
Este manual se revisa en el mismo ritmo que `ROADMAP.md` (§12 de ese documento — evaluado en cada transición de versión arquitectónica, `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §17). Cualquier estándar que se demuestre incorrecto en la práctica (por ejemplo, si el testing manual deja de ser suficiente antes de lo previsto) se corrige aquí de inmediato, con la corrección registrada en `CHANGELOG.md` — el mismo principio de "documentar el cambio en el momento en que se decide" que este manual exige para el resto del proyecto.

**5. Confirmación**
No se implementó ningún cambio de código, HTML, CSS, JavaScript, base de datos ni Supabase durante esta fase. Documento exclusivamente de diseño y estándares, pendiente de tu aprobación.
