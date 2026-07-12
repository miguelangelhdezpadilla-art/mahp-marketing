# VERSIONING — Estrategia de Versionado

> MDS-009, Documento 9 de 10. Cómo evoluciona el contrato de API/webhooks
> sin romper a quien ya depende de él. Complementa `08A-API-STANDARDS.md`
> §3 y §13 con el detalle completo del mecanismo.
>
> Última actualización: 2026-07-12.

---

## 1. Estado actual: sin versionado

`generar-calendario`, la única Edge Function en producción, no tiene prefijo de versión ni contrato versionado (`API.md` §5) — aceptable porque su único consumidor es el propio frontend de MAHP, desplegado atómicamente junto con cualquier cambio de la función. No hay hoy ningún consumidor externo a quien un cambio de contrato pudiera romper.

## 2. Cuándo empieza a aplicar versionado real

En el momento en que una Edge Function o endpoint tenga **al menos un consumidor que MAHP no controle directamente** (un cliente externo, un SDK publicado, un webhook configurado por un `company_admin`) — antes de eso, versionar es trabajo especulativo. Es la misma lógica de activación por demanda de todo MDS-009 (`08-ENTERPRISE-INTEGRATION-PLATFORM.md` §12).

## 3. Esquema de versionado

- **API pública y Edge Functions públicas**: versión en la ruta (`/v1/actividades`, `/v1/functions/meta-adapter`), no en un header — más explícito y más fácil de depurar para un integrador externo que un header opcional que se puede olvidar.
- **Payloads de webhooks**: campo `schema_version` dentro del propio JSON (`08B-WEBHOOKS.md` §5) — la URL del webhook no cambia por versión de payload, el consumidor decide si soporta la versión nueva leyendo el campo.
- **SDKs**: semver estándar (`08G-SDK-STRATEGY.md` §6), independiente pero alineado a la versión de API que envuelven.

## 4. Ciclo de vida de una versión

```
v1 publicada
        │
        ▼
v2 se necesita (cambio incompatible) ──▶ v2 se publica EN PARALELO a v1
        │                                  (v1 sigue funcionando, sin cambios)
        ▼
Se anuncia fecha de retiro de v1 (ventana mínima: por definir con el
primer caso real — no se fabrica un número sin un caso real que lo
valide, `CLAUDE.md` §6 aplicado a compromisos de producto)
        │
        ▼
v1 se retira solo después de que la ventana anunciada haya pasado
```

Ninguna versión se retira sin aviso previo, sin excepción — es el mismo principio de "nada crítico se pierde" (`PROJECT-BLUEPRINT.md` §5, principio 4) aplicado a compromisos con integradores externos, no solo a datos.

## 5. Qué cuenta como cambio incompatible (requiere nueva versión)

- Eliminar un campo de una respuesta.
- Cambiar el tipo de un campo existente (ej. de string a number).
- Cambiar el significado de un campo sin cambiar su nombre.
- Agregar una validación nueva que rechace peticiones antes válidas.

## 6. Qué NO requiere nueva versión (cambio compatible, aditivo)

- Agregar un campo nuevo opcional a una respuesta.
- Agregar un endpoint nuevo.
- Agregar un scope nuevo de `api_key` (`08E-SECURITY.md` §3) sin cambiar el comportamiento de los existentes.
- Corregir un bug que hacía que la respuesta no siguiera ya el contrato documentado (restaurar el contrato correcto no es "romperlo").

## 7. Versionado del esquema de base de datos vs. versionado de API

**No son lo mismo y no se acoplan 1:1.** `DATABASE.md`/`supabase_schema_vN.sql` versiona el esquema interno (`07C-DATABASE-STANDARDS.md` §2) — puede evolucionar con más libertad porque su único consumidor hoy es el frontend interno, desplegado junto con cada cambio. La API pública (cuando exista) es una capa encima de ese esquema con su propio ciclo de versionado, más conservador, precisamente para poder seguir evolucionando el esquema interno libremente sin arrastrar a cada integrador externo en cada cambio — es la razón de ser de tener una capa de API pública distinta del acceso directo a PostgREST.

---

## KPIs

| KPI | Definición |
|---|---|
| Versiones activas simultáneas | Cuántas versiones de API están soportadas a la vez — objetivo: mantener bajo (idealmente 2) |
| Tiempo de migración de consumidores | Cuánto tardan los integradores en migrar de v1 a v2 tras el anuncio |
| Cambios incompatibles por trimestre | Señal de estabilidad del contrato — objetivo: minimizar |
