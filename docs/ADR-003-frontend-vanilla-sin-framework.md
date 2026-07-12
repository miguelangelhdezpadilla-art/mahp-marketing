# ADR-003 — Frontend vanilla JS sin framework/bundler + GitHub Pages

Estado: Aceptado
Fecha: (retroactivo — decisión original desde el `mahp.html` de un solo archivo, formalizado como ADR el 2026-07-12)
Decisores: Chief Product Owner

## Contexto

MAHP debía tener un frontend rápido de iterar, sin depender de un pipeline de build, desplegable sin costo de hosting para un producto todavía sin ingresos recurrentes reales.

## Decisión

HTML + JavaScript vanilla (ES modules nativos del navegador), sin framework de componentes (React/Vue/etc.) ni bundler (Webpack/Vite/etc.), organizado en `js/shared/` para módulos reutilizables. Despliegue vía GitHub Pages, sirviendo el contenido estático directamente desde el repositorio.

## Alternativas consideradas

- **Framework de componentes (React/Vue)**: mejor ergonomía para UI compleja y estado compartido, pero requiere build step, aumenta la superficie de dependencias (`node_modules`) y el tiempo de setup — costo no justificado al tamaño actual del producto (`PROJECT-BLUEPRINT.md` §5, principio 5).
- **Hosting con servidor propio (Vercel/Netlify con SSR)**: capacidades adicionales (rutas dinámicas del lado del servidor) que MAHP no necesita siendo una SPA que consume Supabase directamente desde el navegador.

## Consecuencias

**Se gana**: cero tiempo de build, despliegue instantáneo (`git push` → visible), sin costo de hosting, superficie de dependencias mínima (menor riesgo de cadena de suministro).

**Se sacrifica/queda pendiente**: sin CI/CD real, sin entorno de staging (`10G-DEPLOYMENT-STRATEGY.md` §1) — todo cambio se prueba localmente o directo en producción; en algún punto de escala (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §14, umbral ~100,000 usuarios) esta decisión probablemente se revisa hacia un framework de componentes, señalado ahí explícitamente como "umbral cruzado", no como decisión tomada todavía.

## Referencias

`PROJECT-BLUEPRINT.md` §5 (principio 5), §13, `10G-DEPLOYMENT-STRATEGY.md`, `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §7/§14.
