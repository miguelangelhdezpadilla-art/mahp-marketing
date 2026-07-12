# CCEC-001C — Guía de Integración con la Plataforma de Auditoría

> Cómo un MDS futuro (MDS-012 en adelante) se conecta a esta CCEC en vez de
> redefinir auditoría. Este es el documento que MDS-011 y cualquier fase
> posterior debe citar en vez de volver a diseñar el concepto.
>
> Última actualización: 2026-07-12.

---

## 1. Regla de una línea

**Si tu dominio nuevo produce un evento que un humano preguntaría "¿quién hizo esto y cuándo?", va a `audit_log` — consulta primero si ya está en `CCEC-001A-AUDIT-EVENT-CATALOG.md`, y si no está, agrégalo ahí en el mismo cambio.**

## 2. Pasos para integrar un dominio nuevo

1. Identificar qué acciones de tu dominio son administrativas o de seguridad (no son: historial de negocio de solo-inserción como `activity_updates`/`points_log`, que ya tienen su propia trazabilidad — `CCEC-001` §6).
2. Verificar en `CCEC-001A` si el evento ya existe con ese nombre.
3. Si no existe, agregarlo a `CCEC-001A` siguiendo el formato ya establecido (`action` en `snake_case` español, `target_type`, detalle mínimo).
4. Implementar (cuando llegue la fase de construcción, no en documentación) el `insert` a `audit_log` dentro del mismo trigger `security definer` que ya produce el efecto principal — nunca un mecanismo aparte.
5. Verificar el alcance de lectura contra `CCEC-001B` — ¿es un evento que `company_admin` debería poder ver, o solo `super_admin` (como impersonación)?

## 3. Qué NO hacer

- No crear una tabla de auditoría propia por dominio ("`integration_audit_log`", "`automation_audit_log`") — es exactamente la fragmentación que esta CCEC existe para prevenir.
- No auditar historial de negocio que ya es append-only por diseño (`07D-DATA-LIFECYCLE.md` §5) — sería redundante.
- No inventar un formato de `action` distinto al ya establecido en `CCEC-001A` §"Regla de formato".

## 4. Ejemplo de aplicación — cómo MDS-011 debería usar esta guía

MDS-011 (Enterprise SaaS Platform) probablemente introduce eventos de ciclo de vida de cliente (suscripción creada, plan cambiado, cuenta suspendida por falta de pago) — estos son auditables por definición (§1). En vez de que `10-ENTERPRISE-SAAS-PLATFORM.md` redefina cómo se auditan, debe: (a) agregarlos a `CCEC-001A` como una nueva sección "SaaS / Suscripciones", y (b) referenciar este documento como el mecanismo, exactamente como su propio documento de fase ya instruye ("no redefinas auditoría... refiérete a los documentos CCEC").

## 5. Mantenimiento de esta CCEC

Esta CCEC no tiene "versión final" — crece con cada dominio nuevo que la usa correctamente. Su señal de salud no es que deje de cambiar, es que **ningún MDS futuro vuelva a reportar "encontramos un gap de auditoría" como hallazgo nuevo** — si eso vuelve a pasar, es señal de que esta guía no se está consultando, no de que la capacidad esté mal diseñada.
