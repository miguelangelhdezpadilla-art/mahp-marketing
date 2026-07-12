# SDK STRATEGY — Estrategia de SDKs Oficiales

> MDS-009, Documento 8 de 10. Estrategia para SDKs oficiales — Web,
> JavaScript, TypeScript, Flutter, React Native, Node.js, Python y futuras
> plataformas.
>
> **Estado: [FUTURO] en su totalidad.** MAHP hoy usa directamente el SDK de
> `supabase-js` desde el navegador (`API.md` §2) — no tiene un SDK propio
> porque no tiene todavía consumidores externos que lo necesiten.
>
> Última actualización: 2026-07-12.

---

## 1. Condición de activación

Un SDK oficial de MAHP solo tiene sentido una vez exista la API pública (`08-ENTERPRISE-INTEGRATION-PLATFORM.md` §5) con uso externo real — un SDK sin API pública detrás es documentación disfrazada de código. Este documento fija el orden y el diseño para cuando esa condición se cumpla, no antes.

## 2. Por qué MAHP no necesita un SDK propio hoy

El propio frontend de MAHP ya usa el SDK de Supabase directamente, y ese es, hoy, el 100% del consumo de la "API" de MAHP. Un SDK propio de MAHP solo agrega valor cuando envuelve lógica *específica de MAHP* (autenticación con `api_key`, manejo del contrato de error de `08A-API-STANDARDS.md`, tipos de las entidades de `07E-ENTITY-CATALOG.md`) que un desarrollador externo, si no existiera el SDK, tendría que reimplementar por su cuenta contra PostgREST crudo.

## 3. Prioridad de lenguajes/plataformas

| Prioridad | SDK | Justificación |
|---|---|---|
| 1 | **JavaScript/TypeScript (Node.js y navegador)** | Todo el stack de MAHP ya es JS — es el lenguaje donde el equipo tiene experiencia directa y donde vive el mayor volumen esperado de integraciones (n8n/Zapier/Make ya hablan JS internamente, `08C-INTEGRATIONS-CATALOG.md`) |
| 2 | **Python** | Lenguaje dominante para integraciones de BI/análisis de datos — casos de uso de "cliente conecta su propio BI" (`08D-DEVELOPER-PORTAL.md` §7) |
| 3 | **Web (script embebible, sin build)** | Para clientes con sitios estáticos que quieran mostrar datos de MAHP (ej. un widget de "próximos eventos de marketing") sin un pipeline de build propio |
| 4 | **Flutter / React Native** | Solo relevante si/cuando exista una app móvil de MAHP o de un cliente que la construya — hoy no hay app móvil (`06J-FUTURE-MODULES.md`), así que este SDK depende de esa decisión de producto, no solo de demanda de API |
| — | **Futuras plataformas** | Se evalúan una por una cuando exista demanda concreta, mismo criterio que toda esta fase |

Este orden no es arbitrario: refleja dónde ya existe capacidad interna (JS/TS) antes que dónde existe demanda especulativa (móvil).

## 4. Qué envuelve cada SDK

- Autenticación con `api_key` (header correcto, manejo de scopes — `08E-SECURITY.md` §3).
- Tipos/interfaces generados desde el esquema real (`07E-ENTITY-CATALOG.md`), no mantenidos a mano por separado — evita que el SDK se desincronice del esquema real, mismo riesgo que ya se identificó y corrigió para la documentación interna (`CLAUDE.md` §2, punto 1).
- Manejo de paginación/filtros siguiendo la sintaxis heredada de PostgREST (`08A-API-STANDARDS.md` §7–8) — el SDK no reinventa una sintaxis propia.
- Suscripción a webhooks (verificación de firma incluida, `08B-WEBHOOKS.md` §3) — para que un desarrollador externo no tenga que implementar HMAC a mano.
- Manejo de errores mapeado 1:1 al contrato de `08A-API-STANDARDS.md` §6.

## 5. Distribución

Paquetes públicos en los registros estándar de cada ecosistema (npm para JS/TS, PyPI para Python) bajo un scope/nombre oficial (`@mahp/sdk` o equivalente — nombre exacto no decidido, no se fabrica aquí sin confirmar disponibilidad real del nombre). Código fuente abierto o cerrado es una decisión de negocio pendiente, no técnica — no se resuelve en este documento.

## 6. Versionado del SDK

Sigue semver estándar (`MAJOR.MINOR.PATCH`), alineado pero no necesariamente idéntico al versionado de la API (`08H-VERSIONING.md`) — un SDK puede tener un `PATCH` nuevo (corrección de bug del propio SDK) sin que la API subyacente haya cambiado de versión.

## 7. Mantenimiento

Cada SDK nuevo agrega superficie de mantenimiento continuo (la API cambia → todos los SDKs deben actualizarse) — es la razón por la que este documento prioriza fuertemente empezar con **uno solo** (JS/TS) y confirmar que el patrón de generación de tipos/documentación funciona antes de multiplicar a más lenguajes, en vez de lanzar varios SDKs a la vez.

---

## KPIs

| KPI | Definición |
|---|---|
| Adopción por SDK | Instalaciones/descargas por paquete |
| Tiempo de actualización | Cuánto tarda un SDK en reflejar un cambio de API tras publicarse |
| Cobertura de la API pública | % de endpoints/scopes cubiertos por el SDK vs. disponibles crudos |
