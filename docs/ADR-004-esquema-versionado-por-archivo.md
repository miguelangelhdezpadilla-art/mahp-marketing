# ADR-004 — Esquema versionado por archivo SQL secuencial, sin migraciones automatizadas

Estado: Aceptado
Fecha: (retroactivo — convención vigente desde `v2`, formalizado como ADR el 2026-07-12)
Decisores: Chief Product Owner

## Contexto

Cada cambio de esquema (nueva tabla, columna, política RLS) necesitaba quedar registrado de forma que se pudiera auditar qué cambió y cuándo, sin adoptar una herramienta de migraciones que un equipo de una persona tendría que aprender y mantener.

## Decisión

Un archivo nuevo por cambio (`supabase_schema_vN.sql`, siguiente entero disponible), aplicado manualmente en el SQL Editor de Supabase, en orden, nunca editado una vez aplicado — un error se corrige con un `vN+1` nuevo.

## Alternativas consideradas

- **Herramienta de migraciones automatizada (Prisma Migrate, Supabase CLI `db push` con migraciones versionadas por herramienta)**: mayor automatización y posible rollback, pero introduce una capa de abstracción y estado (tabla de migraciones aplicadas) adicional a mantener, y requiere disciplina de CI que no existe (`10G-DEPLOYMENT-STRATEGY.md` §5).
- **Sin versionado, cambios directos**: se descartó de inmediato — pierde por completo la trazabilidad de qué política/tabla existe por qué razón, contradice el principio de "nada crítico se pierde" aplicado a la historia del propio esquema.

## Consecuencias

**Se gana**: historial legible y auditable directamente en el repositorio de Git, sin dependencia de una herramienta externa; cada archivo puede (y en la práctica ya lo hace, ver `v18`) explicar el *porqué* del cambio, no solo el *qué*.

**Se sacrifica/queda pendiente**: aplicación manual significa riesgo de error humano al copiar/pegar (ya ocurrió dos veces en esta misma sesión de trabajo, encabezados de comentario mal copiados); sin rollback automatizado — revertir un cambio de esquema requiere escribir el `vN+1` inverso a mano. Gap reconocido: `social_channels`/`follower_logs`/`follower_goals` se crearon fuera de este flujo en algún momento sin dejar registro (`DATABASE.md` §9) — es la única violación conocida de este ADR, documentada como pendiente de corregir, no oculta.

## Referencias

`07C-DATABASE-STANDARDS.md` §2, `CLAUDE.md` §3, `DATABASE.md` §9, `10D-OPERATIONAL-EXCELLENCE.md` §3.
