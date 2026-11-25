# ADR-023 — Claude (Anthropic) como proveedor de IA, detrás de una capa intercambiable

Estado: Aceptado
Fecha: 2026-11-20
Decisores: Product Owner

## Contexto

MAHP usaba Groq (`llama-3.3-70b-versatile`) en dos Edge Functions: `meta-webhook` (clasificación y borrador de respuesta del Social AI Hub) y `generar-calendario`. La llamada estaba copiada a mano en las dos, y ninguna registraba el consumo ni tenía tope de gasto (`MPS-002-004`, hallazgos H10–H14).

El 2026-11-20, la página oficial de modelos de Groq mostraba ese modelo con precio "Contact sales" (solo plan Enterprise). Con eso dejamos de saber cuánto cuesta y si seguirá disponible con la cuenta actual.

## Decisión

1. **Proveedor**: Claude, mediante la API de Anthropic, con el SDK oficial (`npm:@anthropic-ai/sdk`, versión fija).
2. **Modelos** (los elige el Product Owner):
   - **económico, predeterminado**: `claude-haiku-5-5` ($0.10 / $0.50 por millón de tokens de entrada / salida), con el razonamiento apagado;
   - **avanzado, opcional por empresa**: `claude-opus-5-5` ($4 / $20), solo cuando Haiku devuelve una salida inválida o con confianza baja, y una sola vez por mensaje.
3. **El resto de MAHP nunca conoce al proveedor**:
   - Todo pasa por `supabase/functions/_shared/ai/` (`LlmProvider`, el motor y la contabilidad).
   - Cambiar de modelo es editar una fila de `ai_models` (v28). Cambiar de proveedor es agregar un adaptador.
4. **Secreto**: `ANTHROPIC_API_KEY`, guardado solo en Supabase Secrets. Se mantiene `ADR-007`: ninguna llave llega al navegador.
5. **Presupuesto obligatorio**:
   - Antes de cada llamada se reserva su costo máximo (`ai_reserve`, con candado por empresa) y después se liquida con los tokens reales (`ai_settle`).
   - Si la contabilidad falla, no se llama al modelo.
6. **Groq deja de usarse.** El secreto `GROQ_API_KEY` se puede borrar una vez desplegado y verificado el cambio.

## Consecuencias

- **Costo**:
  - Una respuesta típica (2,500 tokens de entrada y ~300 de salida) cuesta ≈ $0.0004 con Haiku 5.5.
  - Con Opus 5.5 cuesta unas 40 veces más. Por eso el modelo avanzado está apagado por defecto y lo habilita MAHP para cada empresa.
- **Datos personales**: los mensajes de los clientes ahora se envían a Anthropic en lugar de Groq. Hay que actualizar el aviso de privacidad (`privacidad.html`), que ya estaba pendiente de revisión legal en `docs/legal/`. No se redacta texto legal aquí.
- **Documentos históricos**: varios documentos mencionan a Groq (`05-AI-ECOSYSTEM.md`, `IA.md`, `05C-AI-GOVERNANCE.md`, entre otros). Este ADR prevalece sobre ellos en cuanto al proveedor. Se irán corrigiendo cuando cada documento se toque por otra razón.
- **Dependencia nueva**: una cuenta de Anthropic con método de pago. Sin `ANTHROPIC_API_KEY`:
  - las funciones siguen recibiendo y guardando mensajes, pero sin análisis de IA;
  - `generar-calendario` responde 503.

## Relacionados

`ADR-007`, `ADR-014`, `ADR-022`, `MPS-002-004`, `supabase_schema_v28.sql`.
