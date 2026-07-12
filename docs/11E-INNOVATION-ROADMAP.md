# INNOVATION ROADMAP — Hoja de Ruta de Innovación

> MDS-012, Documento 6 de 10. Cómo MAHP decide qué explorar más allá del
> roadmap ya comprometido (`11A-PRODUCT-ROADMAP.md`) — proceso, no lista de
> features.
>
> Última actualización: 2026-07-12.

---

## 1. Innovación con criterio, no con calendario

MAHP no tiene un "laboratorio de innovación" separado del producto — cada capacidad nueva ya pasa por el mismo filtro (`11-ENTERPRISE-PRODUCT-STRATEGY.md` §20: demanda real, no duplicación, diseño antes que código). La innovación en este contexto es explícitamente **explorar antes de comprometerse** — un espacio para probar ideas sin la disciplina completa de un MDS formal, precisamente para no gastar ese proceso pesado en algo que podría no valer la pena.

## 2. Mecanismo propuesto: spike documentado, no prototipo silencioso

**[FUTURO]**: cuando el equipo (hoy una persona) quiera explorar una idea sin comprometerse a construirla, un "spike" — documento corto (no un MDS completo) que responde: ¿qué problema resuelve?, ¿por qué ahora?, ¿con qué evidencia (no solo intuición)?, ¿cuál es el experimento más barato para validarlo? Se descarta la mayoría; las que sobreviven se promueven a un MDS o entran al roadmap (`11A`).

## 3. Fuentes de ideas de innovación

- **Patrones repetidos de uso manual** — mismo criterio ya usado para Automation Expert (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §11): si varios clientes hacen manualmente lo mismo, es señal de automatización o feature potencial, no una idea abstracta de mercado.
- **Preguntas de soporte recurrentes** (`10H-SUPPORT-OPERATIONS.md` §4) — una pregunta que se repite es, muchas veces, una función faltante disfrazada de duda de uso.
- **Brechas ya documentadas y no resueltas** — el propio `/docs` es fuente de innovación: la decisión de organización/sucursales bloqueada (`10C`), por ejemplo, no es solo un vacío, es una oportunidad de diseño esperando la señal correcta para resolverse bien en vez de apresurada.

## 4. Qué NO es innovación en este contexto

- Adoptar tecnología nueva porque es nueva — contradice `PROJECT-BLUEPRINT.md` §5 principio 5 (simplicidad, complejidad solo si resuelve un problema real).
- Construir para un mercado no confirmado — es expansión especulativa, ya descartada explícitamente en `11C-MARKET-EXPANSION.md` §5.

## 5. Relación con IA

La mayoría de la innovación de mediano plazo de MAHP vive en la evolución de IA (`11F-AI-EVOLUTION.md`) — no se trata como una categoría de innovación separada aquí, se remite directamente para no duplicar.

---

## KPIs

| KPI | Definición |
|---|---|
| Spikes documentados vs. promovidos a roadmap | Tasa de conversión de exploración a compromiso real |
| Tiempo de un spike | Desde documentado hasta decisión (promover o descartar) — debe ser corto por diseño |
| Ideas originadas en patrones de soporte/uso vs. especulación | Señal de qué tan basada en evidencia es la innovación real del producto |
