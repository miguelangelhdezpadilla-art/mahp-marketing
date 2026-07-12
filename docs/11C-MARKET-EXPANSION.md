# MARKET EXPANSION — Expansión de Mercado

> MDS-012, Documento 4 de 10. Estrategia de internacionalización — completa
> los tres prerrequisitos ya identificados en `10I-GROWTH-STRATEGY.md` §2
> sin repetirlos: internacionalización de interfaz, multi-moneda,
> residencia de datos.
>
> **Estado: [FUTURO] en su totalidad** — MAHP opera hoy exclusivamente en
> español, con un solo cliente en un solo país.
>
> Última actualización: 2026-07-12.

---

## 1. Por qué expansión internacional es Fase 4, no antes

Mismo principio de activación por demanda de toda esta documentación: expandir a otro idioma/país antes de agotar el mercado hispanohablante ya identificado (`01-IDENTIDAD-DEL-PRODUCTO.md` §9: PyMEs de Latinoamérica) sería anticipación sin evidencia — la secuencia correcta es Escalamiento Nacional (`11A` Fase 3) primero.

## 2. Internacionalización de interfaz (i18n)

Estado real: cero — toda la UI está en español fijo, sin capa de traducción (`04-DESIGN-SYSTEM.md`, sin mención de i18n). Diseño mínimo propuesto para cuando se active: extraer todo texto de interfaz a un diccionario de claves (no cadenas fijas en el HTML/JS), consistente con la arquitectura vanilla JS ya existente — no requiere adoptar un framework para lograrlo, sí requiere disciplina de no seguir agregando texto fijo nuevo mientras tanto.

## 3. Multi-moneda

Depende directamente de `10B-SUBSCRIPTION-AND-LICENSING.md` — hoy `plans.price` (diseño conceptual, no construido) no tiene moneda fijada explícitamente. Cuando se active facturación real (`11A` Fase 2), definir moneda base y, para Fase 4, soporte a más de una moneda vía el proveedor de pago (Stripe/Mercado Pago ya manejan multi-moneda nativamente, `08C-INTEGRATIONS-CATALOG.md`) — MAHP no necesita implementar conversión de moneda propia.

## 4. Residencia de datos

El riesgo arquitectónico más serio de todo el roadmap, ya señalado en `07H-MULTI-TENANT-DESIGN.md` §8: el modelo actual es un solo cluster Postgres para todas las empresas, sin importar su país. Algunos mercados (Unión Europea con GDPR, por ejemplo) exigen que los datos de sus ciudadanos/empresas no salgan de una región geográfica específica — esto **sí** requeriría un cambio de arquitectura (no solo de configuración), potencialmente un proyecto Supabase regional adicional por zona de residencia exigida.

**No se resuelve en este documento** — es una decisión que depende del mercado específico al que se expanda, no una que se pueda anticipar en abstracto sin saber cuál. Se documenta como prerrequisito de investigación obligatoria antes de confirmar cualquier mercado con regulación de residencia de datos.

## 5. Mercados candidatos — sin comprometerse a ninguno

No se nombra un país específico como destino confirmado (`CLAUDE.md` §6, evitar afirmaciones de negocio no decididas) — el criterio de selección, cuando llegue el momento, debería priorizar: (a) idioma compartido con el mercado ya validado (reduce el costo de §2), (b) régimen de residencia de datos compatible con la arquitectura actual (evita el riesgo de §4), (c) presencia de los giros ya validados (restaurantes/servicios, `01-IDENTIDAD-DEL-PRODUCTO.md` §9).

## 6. Soporte en expansión

Hereda `10H-SUPPORT-OPERATIONS.md` — un mercado nuevo probablemente exige soporte en su huso horario y, si aplica, su idioma; no se diseña una estructura de soporte regional separada sin volumen que la justifique.

---

## KPIs

| KPI | Definición |
|---|---|
| Mercados activos | Países con al menos un cliente operando establemente |
| Tiempo de activación de un mercado nuevo | Desde decisión hasta primer cliente operando ahí |
| % de interfaz traducida (una vez i18n exista) | Cobertura de traducción por idioma soportado |
