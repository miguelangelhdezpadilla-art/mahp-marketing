# ADR-001 — Multi-tenancy por columna (`company_id`) + RLS, no schema/DB por empresa

Estado: Aceptado
Fecha: (retroactivo — decisión original en `v2`, formalizado como ADR el 2026-07-12)
Decisores: Chief Product Owner

## Contexto

MAHP nació como un archivo único (`mahp.html`) sin concepto multiempresa (`DATABASE.md` §2). Al convertirse en SaaS, había que decidir cómo aislar los datos de una empresa cliente de otra, sabiendo que el producto debía poder crecer a cientos o miles de empresas sin rediseño.

## Decisión

Aislamiento multiempresa **por columna** (`company_id bigint references companies(id)` en cada tabla operativa), un solo cluster de Postgres compartido por todas las empresas, con Row Level Security como única frontera real de autorización — nunca confiando en que el cliente filtre correctamente.

## Alternativas consideradas

- **Un schema de Postgres por empresa**: mayor aislamiento lógico, pero cientos/miles de schemas son más difíciles de migrar en conjunto y de mantener performantes — cada `ALTER TABLE` tendría que replicarse N veces.
- **Una base de datos separada por empresa**: aislamiento físico total, pero multiplica el costo operativo y de infraestructura por cada cliente nuevo — inviable para el volumen de PyMEs que es el mercado inicial (`01-IDENTIDAD-DEL-PRODUCTO.md` §9).

## Consecuencias

**Se gana**: una sola migración de esquema (`supabase_schema_vN.sql`) actualiza a todas las empresas a la vez; el costo operativo no crece linealmente con el número de empresas; RLS ya demostró sostener el aislamiento de forma segura en producción.

**Se sacrifica/queda pendiente**: un cliente "ballena" con volumen desproporcionado podría eventualmente requerir aislarse a su propio proyecto Supabase (posible sin rediseño, dado que el aislamiento por `company_id` ya hace la migración de datos acotada — `07H-MULTI-TENANT-DESIGN.md` §7); residencia de datos por país (si se exige regulatoriamente) sí requeriría revisar esta decisión (`11C-MARKET-EXPANSION.md` §4, riesgo ya señalado y no resuelto).

## Referencias

`07H-MULTI-TENANT-DESIGN.md`, `DATABASE.md` §1, `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §4, `10A-MULTI-TENANT-MODEL.md`.
