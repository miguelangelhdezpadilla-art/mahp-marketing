# ADR-007 — IA vía Edge Function proxy, nunca API key en el cliente

Estado: Aceptado
Fecha: (retroactivo — decisión tomada tras el incidente de exposición de la clave de Groq, formalizado como ADR el 2026-07-12)
Decisores: Chief Product Owner

## Contexto

La primera implementación de generación de calendario con IA llamaba a la API de Groq directamente desde el navegador, con la API key incluida en el código del cliente — GitHub bloqueó el push por detectar el secreto expuesto.

## Decisión

Toda llamada a un proveedor de IA pasa por una Edge Function de Supabase (`generar-calendario`), que exige sesión de usuario válida antes de actuar y lee la API key desde una variable de entorno del lado del servidor (`Deno.env.get(...)`) — nunca en código que corre en el navegador.

## Alternativas consideradas

- **API key del cliente restringida por dominio/rate limit del lado del proveedor**: algunos proveedores lo permiten, pero sigue exponiendo la clave a inspección directa del navegador, y no todos los proveedores (incluido Groq) ofrecen ese nivel de restricción — se descartó por no ser una mitigación real, solo una reducción parcial de riesgo.
- **Backend propio dedicado a IA**: innecesario — una sola Edge Function cumple el mismo rol sin agregar una pieza de infraestructura nueva (consistente con `ADR-002`).

## Consecuencias

**Se gana**: ningún secreto de proveedor de IA vive en código público; el patrón es intercambiable por diseño — cambiar de Groq a OpenAI/Anthropic (`08C-INTEGRATIONS-CATALOG.md`) no requiere cambiar la arquitectura, solo la Edge Function y la variable de entorno.

**Se sacrifica/queda pendiente**: cada proveedor de IA nuevo requiere su propia Edge Function siguiendo el mismo contrato (`API.md` §4) — no hay hoy abstracción de "múltiples proveedores intercambiables en runtime", es una decisión de código en cada función; sin rate limiting propio todavía (`API.md` §5, riesgo ya identificado).

## Referencias

`IA.md` §2/§5, `API.md` §3/§4, `CLAUDE.md` §5, `08C-INTEGRATIONS-CATALOG.md` (OpenAI/Anthropic).
