# DEVELOPER PORTAL — Portal para Desarrolladores

> MDS-009, Documento 5 de 10. Diseño del portal donde un tercero (cliente
> con su propio equipo técnico, o un socio de integración) aprende a
> conectarse con MAHP: documentación, sandbox, ejemplos, SDK, autenticación,
> tutoriales, versionado y soporte.
>
> **Estado: [FUTURO] en su totalidad** — no existe hoy audiencia externa que
> lo necesite (el único consumidor de la API es el propio frontend de
> MAHP, `API.md` §1). Se diseña para no construirlo mal cuando la demanda
> exista, no porque sea urgente.
>
> Última actualización: 2026-07-12.

---

## 1. Condición de activación

Este portal no se construye hasta que exista al menos una de estas dos condiciones: (a) un cliente pide explícitamente integrar su propio sistema con MAHP vía API pública, o (b) MAHP decide activamente vender la API pública como parte de la propuesta de valor a un segmento (ej. agencias que quieren su propio dashboard sobre datos de MAHP). Construirlo antes sería documentar una API sin usuarios reales que la lean — trabajo especulativo que este documento evita, consistente con `PROJECT-BLUEPRINT.md` §5 principio 5.

## 2. Estructura del portal

```
developers.mahp.app  [FUTURO — subdominio no reservado aún]
├── Inicio               → qué es la API, para quién es
├── Autenticación         → cómo obtener y usar un api_key (08E-SECURITY.md §3)
├── Referencia de API     → generado desde el propio esquema PostgREST + Edge Functions documentadas
├── Webhooks              → cómo suscribirse, formato de payload (08B-WEBHOOKS.md)
├── SDKs                  → enlaces a paquetes oficiales (08G-SDK-STRATEGY.md)
├── Sandbox               → entorno de prueba sin afectar datos reales (§4)
├── Tutoriales            → casos de uso guiados paso a paso
├── Changelog de API      → versión por versión (08H-VERSIONING.md)
└── Soporte               → canal de contacto para desarrolladores externos
```

## 3. Documentación

Generada, no escrita a mano donde sea posible: la referencia de tablas/columnas ya vive verificada en `DATABASE.md`/`07E-ENTITY-CATALOG.md` — el portal traduce esa fuente interna a lenguaje orientado a integrador externo (qué puede leer/escribir según su scope, no la arquitectura interna completa). Las Edge Functions públicas se documentan siguiendo el formato ya usado en `API.md` §3 (endpoint, headers, request, responses) — mismo formato, audiencia distinta.

## 4. Sandbox

**[FUTURO]**: una empresa de prueba dedicada (`company_id` reservado, ej. `sandbox`) donde un desarrollador externo puede probar llamadas de API sin riesgo de afectar datos reales de un cliente. Requiere decidir si el sandbox usa el mismo proyecto Supabase (aislado por `company_id`, más simple) o un proyecto separado (más aislado, más costo operativo) — no se decide en este documento, se señala como decisión pendiente de arquitectura cuando se active.

## 5. Ejemplos

Snippets mínimos por lenguaje/SDK (§/`08G-SDK-STRATEGY.md`), cada uno mostrando: autenticación, una lectura simple, una escritura simple, manejo de un webhook. No se generan ejemplos para SDKs que no existen todavía — se agregan en el mismo cambio que se publica cada SDK.

## 6. Autenticación

El portal enseña el mismo mecanismo que ya diseña `08E-SECURITY.md` §3 (`api_keys` con scopes) — el portal no inventa su propio esquema de autenticación, documenta el real.

## 7. Tutoriales

Casos de uso guiados, no exhaustivos: "conecta tu BI a MAHP", "recibe una notificación cuando se complete una tarea", "publica una actividad desde tu sistema externo vía n8n" (`08C-INTEGRATIONS-CATALOG.md`, sección n8n/Zapier/Make). Se priorizan los casos de uso ya identificados en el catálogo de integraciones como de mayor demanda esperada.

## 8. Versionado

El portal siempre documenta la versión vigente y mantiene accesible el changelog de versiones anteriores mientras estén soportadas (`08H-VERSIONING.md` §4) — nunca borra documentación de una versión todavía activa, aunque ya no sea la recomendada.

## 9. Soporte

**[FUTURO]**: canal de soporte técnico para desarrolladores externos, separado del soporte de producto a usuarios finales de la empresa cliente — un `company_admin` con un problema de interfaz y un desarrollador externo con un problema de integración de API tienen necesidades y niveles de detalle técnico distintos, no deberían compartir el mismo canal de primera línea.

---

## KPIs

| KPI | Definición |
|---|---|
| Desarrolladores activos | Cuentas con al menos un `api_key` usado en los últimos 30 días |
| Time-to-first-call | Tiempo entre registro y primera llamada exitosa a la API |
| Cobertura de documentación | % de endpoints públicos con ejemplo funcional |
| Tickets de soporte por integración | Señal de qué integración necesita mejor documentación |
