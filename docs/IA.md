# INTELIGENCIA ARTIFICIAL — Marketing Activity Hub Pro

> Capítulo 15 del `PROJECT-BLUEPRINT.md`. Estado actual de la integración de
> IA y su arquitectura de seguridad. Para la visión de hacia dónde evoluciona,
> ver `VISION.md` (horizonte medio) y `ROADMAP.md` (próximos pasos).
>
> Última actualización: 2026-07-08.

---

## 1. Qué existe hoy

Una sola capacidad de IA, construida y en producción: **generación de calendario de contenido** desde `empresa.html` (sección "✨ Generar calendario con IA", pestaña Calendario). El `company_admin` describe campaña, canales, mes, frecuencia y contexto del negocio; la IA devuelve entre 4 y 31 actividades (según la frecuencia elegida) listas para revisar, asignar a un colaborador y publicar como filas reales en `actividades`.

No hay insights automáticos, no hay detección proactiva de campañas atrasadas, no hay generación de copy/reels por separado — eso es visión futura (`VISION.md`, horizonte medio), no estado actual.

## 2. Arquitectura de la integración

```
Navegador (empresa.html)
    │  fetch con sesión de Supabase
    ▼
Supabase Edge Function "generar-calendario"
    │  1. Valida el token de sesión (auth.getUser())
    │  2. Si es válido, llama a Groq con la clave secreta del servidor
    ▼
Groq API (modelo llama-3.3-70b-versatile)
    │  responde con el JSON del calendario
    ▼
Edge Function reenvía la respuesta tal cual
    ▼
Navegador parsea el JSON y muestra el resultado para revisión
```

**Por qué existe la Edge Function y no una llamada directa a Groq desde el navegador**: es la primera (y única) pieza de "servidor propio" en todo el proyecto, agregada deliberadamente porque la clave de Groq **no puede vivir en código que corre en el navegador** — cualquiera podría abrir "Ver código fuente" y robarla. La función además exige una sesión válida de Supabase antes de llamar a Groq, para que solo usuarios autenticados de MAHP puedan consumir la cuota.

⚠️ **Nota histórica**: en una versión anterior, la clave de Groq estuvo efectivamente hardcodeada en `js/shared/ia.js` del lado del cliente. Se detectó, se revocó esa clave en Groq, se generó una nueva, y se migró a este diseño de Edge Function — es la razón concreta por la que este patrón de seguridad existe y debe mantenerse para cualquier integración de IA futura.

## 3. El prompt

Construido en `generarCalendarioIA()` (`js/shared/ia.js`). Parámetros que el usuario controla:

| Parámetro | Rango | Efecto |
|---|---|---|
| Campaña | Selección de `campaigns` activas, o "Sin campaña" | Se incluye en el prompt y se guarda como `campaign_id` |
| Canales | Multi-selección de `social_channels` de la empresa | Limita a qué canales aplican las actividades |
| Mes | `input type="month"` | Fechas generadas deben caer dentro de ese mes |
| Frecuencia | 1/2/3/5 por semana, o Diario | Determina cuántas actividades pedir (`RANGO_ACTIVIDADES_POR_FRECUENCIA`) |
| Contexto adicional | Texto libre | Se inyecta tal cual en el prompt |

**Contrato de salida exigido**: el prompt pide explícitamente *"responde únicamente con un JSON válido"* con la forma `{ actividades: [{ titulo, canal, fecha, descripcion }] }`. El cliente intenta `JSON.parse()` directo y, si falla, busca el primer bloque `{...}` dentro del texto como respaldo — porque los modelos de lenguaje a veces agregan texto alrededor del JSON pese a la instrucción.

## 4. Flujo completo de usuario

1. `company_admin` llena el formulario y da "Generar calendario".
2. La función muestra un spinner ("Claude está creando tu calendario...") mientras espera la respuesta.
3. Al recibir el resultado, se listan las actividades propuestas **sin guardarlas todavía** — el admin puede "Regenerar" (repite la llamada) o elegir un colaborador y "Publicar al equipo".
4. Publicar hace un `insert` masivo en `actividades` con `status: 'pendiente'`, `progress_pct: 0`, `assigned_to` según lo elegido, y un color por canal (`CANAL_CAL_COLOR`).
5. Desde ahí, el ciclo de vida de esas actividades es idéntico al de cualquier otra creada manualmente (aparece en el calendario del colaborador asignado, dispara notificación, otorga puntos de gamificación al completarse, etc. — ver `MODULOS.md`).

## 5. Seguridad y límites de costo

- La clave de Groq (`GROQ_API_KEY`) vive como secreto de la Edge Function, gestionado con `supabase secrets set` — nunca en un archivo del repositorio ni en el navegador.
- La función rechaza cualquier request sin `Authorization` válido o sin sesión de Supabase activa (401).
- **Disparo manual, no automático**: el usuario debe presionar el botón cada vez — es una decisión deliberada (ver `FASES-APP.md` Fase 6) para que el costo de cada llamada a Groq sea predecible y explícito, no un proceso en segundo plano que se dispare solo.
- No hay límite de tasa (*rate limiting*) implementado del lado de la función — un usuario podría, en teoría, generar calendarios repetidamente sin restricción más allá de estar autenticado. No se ha priorizado porque el costo por llamada es bajo y el uso es manual, pero es una brecha real si el volumen de empresas cliente crece.

## 6. Limitaciones actuales

- Un solo proveedor de modelo (Groq / `llama-3.3-70b-versatile`), sin fallback si el servicio falla o cambia sus términos.
- Sin manejo de reintentos automáticos ante error transitorio de Groq — el usuario debe volver a intentar manualmente.
- El "contexto del negocio" es texto libre sin estructura ni memoria entre generaciones — cada llamada empieza desde cero, no aprende de campañas anteriores de esa empresa.
- Todas las actividades generadas se asignan al **mismo** colaborador (un selector único para todo el lote) — no hay forma de repartir automáticamente entre varios colaboradores en una sola generación.

## 7. Hacia dónde va (referencia)

Ver `VISION.md` (horizonte medio: "la IA deja de limitarse a generar calendarios y empieza a observar la operación y sugerir") y `ROADMAP.md` (Fase 5/6 — el diseño original de "propuestas de calendario" con estado pendiente/aceptada/rechazada nunca se construyó; la generación actual publica directo tras revisión manual, sin ese estado intermedio formal).
