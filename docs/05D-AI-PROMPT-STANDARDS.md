# AI PROMPT STANDARDS — Estándar Oficial de Prompts

> MDS-006, Documento 5 de 6. Estructura obligatoria para todo prompt de
> cualquier agente del catálogo (`05A-AI-AGENTS.md`). **Basado en el patrón
> real ya en producción** (Calendar Planner, `js/shared/ia.js`, documentado
> en `IA.md` §3) — formalizado aquí como estándar para los 23 agentes
> restantes, no inventado desde cero.
>
> Última actualización: 2026-07-09.

---

## 1. Estructura Obligatoria de un Prompt

Todo prompt de MAHP sigue 5 bloques, en este orden fijo:

```
1. ROL         — "Eres un experto en [especialidad del agente]."
2. TAREA       — Qué debe producir, en una frase clara.
3. CONTEXTO    — Los datos específicos de esta invocación (empresa,
                 campaña, canales, etc. — nunca genérico).
4. RESTRICCIONES — Qué NO debe hacer / límites de formato.
5. FORMATO DE SALIDA — Contrato exacto esperado (JSON con schema
                 explícito, o texto con estructura definida).
```

**Ejemplo real que ya sigue este patrón** (Calendar Planner, `IA.md` §3):
```
Eres un experto en marketing digital.                        ← ROL
Genera un calendario de actividades para el mes de X...      ← TAREA
Canales seleccionados: ... / Frecuencia: ... / Contexto: ...  ← CONTEXTO
Responde ÚNICAMENTE con un JSON válido, sin texto adicional... ← RESTRICCIONES
{ "actividades": [{ "titulo", "canal", "fecha", "descripcion" }] } ← FORMATO
```

## 2. Contexto

El bloque de contexto **nunca es genérico** — siempre incluye los datos reales de esa invocación específica (empresa, campaña, canales, fecha), consistente con el aislamiento multiempresa (`05C-AI-GOVERNANCE.md` §2). Ningún prompt de MAHP se construye con placeholders sin rellenar ni con datos de ejemplo en producción.

## 3. Objetivo

Cada prompt tiene **un solo objetivo por invocación** — un agente que necesita producir dos cosas distintas (ej. copy + sugerencia de formato visual) hace dos invocaciones (una a Content Creator, otra a Graphic & Creative Director), no un prompt combinado que intenta ambas a la vez. Consistente con el principio de agentes especializados (`05-AI-ECOSYSTEM.md` §1) sobre un asistente genérico.

## 4. Restricciones

Toda restricción de negocio o de formato se declara explícitamente en el prompt, nunca se asume que el modelo la va a inferir:
- Formato de salida exacto (JSON con schema, o límite de longitud de texto).
- Límites de contenido (ej. "no inventes precios", "no generes nombres de personas reales" — extensión directa de `CLAUDE.md` §6 al contenido generado por IA).
- Tono/personalidad de marca cuando aplica (Content Creator, Copywriter).

## 5. Formato Esperado

**Salida estructurada (JSON)** cuando el resultado se va a insertar directo en una tabla (Calendar Planner es el ejemplo de referencia) — siempre con manejo de fallback si el modelo agrega texto extra alrededor del JSON (ya el patrón en `ia.js`: intento de `JSON.parse()` directo, luego búsqueda del primer bloque `{...}` como respaldo).

**Salida en texto libre estructurado** cuando el resultado es para lectura humana directa (KPI Advisor, Business Analyst) — con una estructura mínima esperada (ej. "hallazgo + causa probable + dato de soporte"), no texto completamente libre sin forma.

## 6. Buenas Prácticas

- El prompt nunca contiene un secreto o dato sensible que no sea estrictamente necesario para la tarea (`05C-AI-GOVERNANCE.md` §2).
- El prompt es lo más corto posible mientras siga siendo inequívoco — menos tokens, menor costo, menor latencia (alineado con `05-AI-ECOSYSTEM.md` §10, control de costo).
- Nunca se le pide al modelo que "sea creativo con los datos" cuando la tarea requiere precisión (ej. fechas, cifras) — la creatividad se reserva a los agentes de contenido (Content Creator, Copywriter, Innovation Advisor), nunca a los analíticos (KPI Advisor, Data Analyst).

## 7. Versionado

Un cambio al prompt de un agente que **altera su contrato de salida** es una nueva versión de ese agente (`05-AI-ECOSYSTEM.md` §11) — no un reemplazo silencioso. Un ajuste de redacción que no cambia el contrato de salida no requiere versionado formal, solo se documenta en `CHANGELOG.md` como cualquier otro cambio (`03-ENGINEERING-STANDARDS.md` §12).

## 8. Reutilización

Los bloques de ROL y RESTRICCIONES de agentes de la misma familia (ej. todos los agentes de Contenido, Grupo 2 de `05A-AI-AGENTS.md`) comparten una base común de tono/personalidad de marca — no se redacta la personalidad de marca desde cero en cada uno de los 24 agentes; vive en un fragmento reutilizable, insertado en el bloque de CONTEXTO de cada prompt.

## 9. Biblioteca de Plantillas

**Plantilla base por tipo de agente** (a completar por cada uno de los 24 al implementarse — el prompt real de Calendar Planner ya existe en `js/shared/ia.js` como referencia viva):

```
Eres un experto en {especialidad}.

{tarea específica en una frase}

{contexto real de esta invocación: empresa, campaña, canal, etc.}

{restricciones explícitas de formato y de contenido}

{formato de salida exacto — JSON con schema, o estructura de texto}
```

## 10. Ejemplos por Agente (muestra representativa, no las 24 plantillas completas)

**Calendar Planner** — **[EXISTE]**, ver prompt real completo en `IA.md` §3.

**KPI Advisor** (diseño, no implementado):
```
Eres un analista de KPIs de marketing.

Identifica qué KPIs de esta empresa están atrasados respecto a su meta,
ajustando por el tiempo transcurrido del periodo, y explica la causa
más probable usando los datos de actividades relacionadas.

KPIs activos: {lista con target_value, current_value, period}
Actividades relacionadas al periodo: {resumen}

No afirmes la causa como un hecho certero — usa lenguaje de hipótesis
("esto sugiere que..."). No inventes datos que no estén en el contexto.

Responde en JSON: { "alertas": [{ "kpi", "pct_avance", "causa_probable" }] }
```

**Content Creator** (diseño, no implementado):
```
Eres un redactor de contenido de marketing para {nombre_empresa}.

Redacta 3 variantes cortas de copy para esta actividad, en el tono de
marca de la empresa.

Actividad: {titulo}, canal: {canal}
Tono de marca: {resumen de personalidad, si la empresa la definió}

Máximo 280 caracteres por variante. No inventes precios, promociones
o datos que no estén en el contexto proporcionado.

Responde en JSON: { "variantes": ["texto1", "texto2", "texto3"] }
```

Estas dos plantillas ilustran el patrón — las 22 restantes se redactan siguiendo la misma estructura de 5 bloques al momento de implementar cada agente, no antes (consistente con Simplicidad Progresiva, `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §2.6: no se escriben 24 prompts de producción para agentes que no existen todavía).
