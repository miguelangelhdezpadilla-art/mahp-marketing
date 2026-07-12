# ADR-002 — Supabase como backend completo, sin servidor propio

Estado: Aceptado
Fecha: (retroactivo — decisión original desde el inicio del proyecto multiempresa, formalizado como ADR el 2026-07-12)
Decisores: Chief Product Owner

## Contexto

MAHP necesitaba autenticación, base de datos relacional, almacenamiento de archivos y autorización a nivel de fila, con un equipo de un desarrollador y sin presupuesto para operar infraestructura propia.

## Decisión

Supabase como el 100% del backend: Postgres + RLS + Auth + Storage + Edge Functions. Ningún servidor propio (Node/Express/etc.) — la única pieza de código de servidor escrita a mano es una Edge Function puntual cuando hace falta lógica que no puede vivir en RLS/triggers (`API.md` §1).

## Alternativas consideradas

- **Backend propio (Node/Express + Postgres autogestionado)**: control total, pero requiere mantener servidor, autenticación propia, y toda la lógica de autorización a mano — mucho mayor superficie para un equipo de una persona.
- **Firebase/otro BaaS sin Postgres relacional**: el modelo de datos de MAHP (relaciones, RLS granular por rol) encaja naturalmente en SQL relacional; un modelo NoSQL habría forzado desnormalización que MAHP explícitamente evita (`07B-DATA-GOVERNANCE.md` §3).

## Consecuencias

**Se gana**: cero infraestructura propia que mantener; RLS de Postgres resuelve autorización de forma más robusta que reimplementarla en middleware propio; Edge Functions cubren los pocos casos que sí necesitan lógica de servidor (proxy de IA, futuros adaptadores de integración).

**Se sacrifica/queda pendiente**: dependencia total de las garantías de Supabase — el hallazgo más serio de toda la documentación (`10E-BACKUP-AND-DISASTER-RECOVERY.md`) es consecuencia directa de esta decisión: en plan Free, Supabase no garantiza backups, y MAHP no tiene una capa propia de respaldo gestionado (mitigado con un script local, no con infraestructura propia). Sin control sobre SLA de la plataforma subyacente (`10F-SERVICE-LEVEL-OBJECTIVES.md` §1).

## Referencias

`API.md` §1, `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §9/§10, `10E-BACKUP-AND-DISASTER-RECOVERY.md`, `10G-DEPLOYMENT-STRATEGY.md`.
