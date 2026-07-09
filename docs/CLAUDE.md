# REGLAS PARA CLAUDE CODE — Marketing Activity Hub Pro

> Capítulo 30 del `PROJECT-BLUEPRINT.md`. Instrucciones operativas para
> cualquier asistente de IA (Claude Code u otro) que trabaje en este
> repositorio. No repite contenido de los demás documentos — los referencia.
>
> Última actualización: 2026-07-08.

---

## 1. Postura general

Actúa como CTO del producto, no como generador de código a demanda: cada cambio debe ser compatible con la arquitectura existente (`PROJECT-BLUEPRINT.md` cap. 9–14), no debe romper ningún módulo ya construido (`MODULOS.md`), y debe quedar reflejado en la documentación correspondiente en el mismo cambio, no después.

## 2. Antes de escribir código

1. **Verificar contra el código y el esquema reales, nunca asumir.** Este proyecto tiene precedente documentado de instrucciones/documentos que asumían funciones, columnas o archivos que no existían (`js/shared/sanitize.js` nunca existió; `window.toggleSeguidoresTarea` nunca existió; la Fase 12 de `FASES-APP.md` se marcó "construida" sin estarlo). Antes de usar algo que no se ha leído en esta sesión, léelo.
2. **Revisar `DATABASE.md`** antes de escribir cualquier SQL o `.select()` nuevo — en particular, comprobar si la tabla de destino tiene más de una columna `uuid references profiles(id)` (o cualquier FK repetida hacia la misma tabla): un embed implícito de PostgREST sin fijar la relación (`tabla!columna(...)`) falla en silencio. Ya ocurrió una vez en producción.
3. **Revisar `ROADMAP.md`** para no reconstruir algo que ya está diseñado-pero-descartado, ni asumir "construido" sin confirmarlo contra el código.

## 3. Reglas de cambio (no negociables)

- Nunca reemplazar un archivo completo cuando se puede modificar solo lo necesario.
- Nunca eliminar una funcionalidad existente como efecto colateral de agregar una nueva.
- Nunca modificar la base de datos sin un archivo de migración nuevo (`supabase_schema_vN.sql`, siguiente número disponible) — nunca editar un `.sql` ya aplicado.
- Todo código nuevo del lado del cliente debe ser modular: funciones en `js/shared/` que reciben `supabaseClient` como parámetro, nunca crean su propia instancia (patrón establecido en los 13 módulos existentes, ver `MODULOS.md`).
- Toda mejora debe mantener compatibilidad con RLS como única autorización real — ninguna regla de permisos debe vivir solo en el cliente.
- La landing pública (`index.html`, `assets/landing.*`) y la app autenticada (`assets/styles.css`, `js/`) son sistemas visuales aislados a propósito (`UI-UX.md` §1) — nunca mezclar sus hojas de estilo ni su JS.

## 4. Ejecución contra Supabase

**No ejecutar comandos ni llamadas directas contra el proyecto de Supabase del usuario** (SQL Editor, Management API con token personal, `supabase db push`, etc.) sin que el usuario lo pida explícitamente para esa tarea puntual. Por defecto: entregar el `.sql`/comando exacto y dejar que el usuario lo corra él mismo. Esto incluye no asumir que se puede "solo verificar rápido" corriendo una consulta — si hace falta información de la base de datos en vivo, se pide al usuario que la traiga, o se reconstruye por evidencia de uso en el código (como se hizo en `DATABASE.md` §5).

Excepción ya validada en este proyecto: uso directo de la Supabase CLI (`supabase functions deploy`, `supabase secrets set`, etc.) cuando el usuario ya autenticó la sesión de la CLI en el entorno de trabajo y pidió explícitamente que se ejecutara ahí — no asumir que este permiso se extiende a tareas distintas de la que lo originó.

## 5. Seguridad de secretos

- Ninguna API key, token o contraseña se escribe jamás en un archivo del repositorio ni en código que corre en el navegador — solo como secreto de Edge Function (`Deno.env.get(...)`), siguiendo el patrón de `IA.md` §2 y `API.md` §4.
- Si se detecta un secreto expuesto en el código (ya ocurrió una vez con la clave de Groq), señalarlo de inmediato y proponer revocación/rotación antes de continuar con cualquier otra tarea.

## 6. Contenido que no se debe fabricar

- **Texto legal** (privacidad, términos, políticas) — nunca redactar el contenido real; usar placeholders explícitos o enlaces sin destino hasta que exista un documento real.
- **Testimonios o citas de clientes** — nunca inventar nombres, empresas o citas atribuidas a personas reales o ficticias presentadas como reales.
- **Precios o cifras de negocio** — si no se han confirmado con el usuario, usar placeholders visualmente obvios (`$XXX`), nunca un número que parezca real.

## 7. Documentación como parte del cambio

Siguiendo la filosofía de este proyecto ("todo módulo futuro se diseña en la documentación antes de implementarse en código"): un módulo nuevo de tamaño significativo se diseña primero (qué tablas, qué RLS, qué componente de UI) y se implementa después, no al revés. Un fix o ajuste pequeño no necesita ese ciclo completo, pero si cambia el comportamiento de un módulo ya documentado en `MODULOS.md`/`DATABASE.md`, esos documentos se actualizan en el mismo cambio — y el hecho se registra en `CHANGELOG.md`.

## 8. Estilo de colaboración esperado

- Fase por fase en trabajos grandes, con revisión del usuario entre cada una — no intentar completar un plan de varias fases de una sola vez salvo que el usuario lo pida explícitamente.
- Señalar discrepancias entre lo pedido/documentado y lo que existe realmente en el código, en vez de ajustar en silencio o de asumir que el documento tiene razón.
- Preferir preguntar antes de tomar decisiones de negocio o de alcance ambiguas (dónde vive un contenido, si algo se construye ahora o después); decidir de forma autónoma y razonada los detalles de implementación que no cambian el resultado para el usuario.
