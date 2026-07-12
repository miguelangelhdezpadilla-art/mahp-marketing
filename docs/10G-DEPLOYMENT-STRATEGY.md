# DEPLOYMENT STRATEGY — Estrategia de Despliegue

> MDS-011, Documento 8 de 10. Entornos, despliegues y su evolución.
> Describe la realidad actual con precisión antes de proponer cualquier
> cambio — no se presenta infraestructura como existente si no lo está
> (`CLAUDE.md` §2).
>
> Última actualización: 2026-07-12.

---

## 1. Estado real hoy — [EXISTE]

```
git push a main
        │
        ▼
GitHub Pages sirve el contenido estático directamente desde el
repositorio — sin build step, sin bundler (PROJECT-BLUEPRINT.md §5,
principio 5)
        │
        ▼
Cambios visibles casi de inmediato (con el caché de CDN de GitHub
Pages, hasta ~10 minutos de propagación observados en esta misma
sesión de trabajo)
```

Backend (Supabase): sin pipeline de despliegue — cambios de esquema vía SQL Editor manual (`07C-DATABASE-STANDARDS.md` §2), cambios de Edge Functions vía CLI de Supabase cuando se necesita (`CLAUDE.md` §4, excepción ya validada de uso de la CLI).

**No existe**: entorno de staging separado, tests automatizados corriendo en CI antes de desplegar, rollback automatizado, ni versionado de releases con changelog técnico separado del `CHANGELOG.md` narrativo ya existente.

## 2. Por qué esto es válido hoy

Consistente con `PROJECT-BLUEPRINT.md` §5 principio 5 (simplicidad sobre complejidad) y con el tamaño real del proyecto (un desarrollador, una empresa cliente activa): un pipeline de CI/CD, entornos de staging y despliegues canary son complejidad que resuelve problemas que MAHP no tiene todavía (múltiples desarrolladores pisándose cambios, necesidad de probar en un entorno idéntico a producción antes de arriesgar downtime de múltiples clientes).

## 3. Un solo ambiente — implicación real

Todo cambio de código se prueba localmente (o directamente en producción, en la práctica actual) antes de hacer commit — no hay red de seguridad de un ambiente intermedio. Esto es un riesgo real, no solo una simplificación cómoda: un bug de frontend llega a producción en el momento del `git push`. Mitigado hoy por: bajo volumen de cambios, un solo cliente activo, y la práctica ya establecida en esta documentación de pedir confirmación antes de acciones de riesgo (`CLAUDE.md`, sección "Ejecutando acciones con cuidado" del sistema).

## 4. Entornos — propuesta de evolución

| Entorno | Estado | Cuándo se justifica |
|---|---|---|
| Producción (actual) | [EXISTE] | — |
| Staging (réplica de producción para probar antes) | [FUTURO] | Cuando exista más de un cliente activo simultáneo, o más de un desarrollador — el costo de un bug en producción deja de ser aceptable a partir de ahí |
| Desarrollo local con datos de prueba | [FUTURO] | Mismo criterio — hoy el desarrollo ya ocurre contra el proyecto real de Supabase, sin un proyecto de prueba separado |

## 5. CI/CD — propuesta de evolución

**[FUTURO]**: GitHub Actions (nativo del mismo repositorio, sin herramienta externa nueva) ejecutando, como mínimo, verificación de que el sitio estático no tiene errores de sintaxis antes de permitir el merge a `main` — primer paso mínimo antes de considerar tests automatizados más completos, que requerirían primero que existan tests (`03-ENGINEERING-STANDARDS.md`, fuera del alcance de este documento confirmar su estado).

## 6. Rollback

Hoy: revertir un commit en Git + esperar la propagación de GitHub Pages — manual, funcional, sin automatización. Para cambios de esquema de Supabase, no hay rollback automático — la mitigación es la misma disciplina ya en vigor de nunca aplicar un `.sql` sin que el usuario lo revise primero (`CLAUDE.md` §4), lo que ya actúa como una revisión pre-despliegue informal.

## 7. Versionado de releases

Hoy: `CHANGELOG.md` es la única bitácora, mezclando producto y documentación, sin números de versión formales (`v1.2.3`) — suficiente para el volumen actual. **[FUTURO]**: si se activa un modelo de planes con SLA (`10B`, `10F`), versionar releases formalmente ayudaría a comunicar a clientes Enterprise qué cambió y cuándo, con mayor precisión que la narrativa actual.

## 8. Relación con Observabilidad

Todo despliegue debería quedar registrado como evento (`CCEC-004B`, log de `component: deployment`) para poder correlacionar un incidente con el cambio que lo causó — **[FUTURO]**, no redefinido aquí, solo señalado como consumidor natural de `CCEC-004`.

---

## KPIs

| KPI | Definición |
|---|---|
| Frecuencia de despliegue | Cuántos `git push` a `main` por semana/mes |
| Tiempo de propagación | Desde push hasta visible en producción |
| Cambios revertidos | % de despliegues que requirieron rollback — señal de calidad del proceso actual sin CI |
