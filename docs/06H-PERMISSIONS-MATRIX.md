# PERMISSIONS MATRIX — Matriz Funcional de Permisos

> MDS-007, Documento 9 de 11. Qué puede hacer cada rol por módulo. Roles:
> **SA** = `super_admin`, **CA** = `company_admin`, **D** = `director`,
> **C** = `collaborator`. Acciones sin capacidad construida en el sistema hoy
> (Aprobar, Exportar, Automatizar en la mayoría de módulos) se marcan **➖**
> y no se inventan como si ya existieran. Fuente de verdad técnica: `DATABASE.md`
> (políticas RLS reales) — esta matriz es su traducción a lenguaje funcional.
>
> Última actualización: 2026-07-09.

---

## Leyenda

✅ Permitido · 👁️ Solo lectura · ❌ No permitido · ➖ Capacidad no existe en el sistema (ningún rol la tiene, no es un límite de permiso)

---

## Core

| Módulo | Ver | Crear/Editar | Aprobar | Eliminar | Exportar | Automatizar |
|---|---|---|---|---|---|---|
| Empresas | SA: ✅ / CA-D-C: 👁️ (la suya) | SA: ✅ | ➖ | SA: ✅ (desactivar) | ➖ | ➖ |
| Usuarios | Todos: 👁️ (su empresa) | SA: ✅ / CA: ✅ (solo `director`/`collaborator`) | ➖ | SA-CA: ✅ (revocar, reversible) | ➖ | ➖ |
| Roles | Todos: 👁️ (el propio) | SA: ✅ | ➖ | ➖ | ➖ | ➖ |
| Notificaciones | Todos: 👁️ (las propias) | ➖ (generadas por trigger) | ➖ | ❌ nadie borra manualmente | ➖ | ✅ (ya es 100% automático) |
| Auditoría | SA: ✅ | ➖ (generada por trigger) | ➖ | ❌ append-only | ➖ | ✅ (ya es 100% automático) |

## Marketing

| Módulo | Ver | Crear/Editar | Aprobar | Eliminar | Exportar | Automatizar |
|---|---|---|---|---|---|---|
| Campañas | SA-CA-D: ✅ / C: ❌ | SA-CA: ✅ / D: 👁️ | ➖ | SA-CA: ✅ (físico hoy — soft delete no extendido aún a esta tabla, `ROADMAP.md`) | ➖ | ➖ |
| Calendario | Todos según su alcance (§ver Actividades) | SA-CA: ✅ / C: ✅ (lo suyo) / D: 👁️ | ➖ | SA-CA: ✅ (soft delete, `v16`) | ➖ | ➖ |
| Actividades | SA-CA-D: ✅ (empresa) / C: 👁️✏️ (lo suyo) | SA-CA: ✅ / C: ✅ (campos acotados: título/canal/fecha) | ➖ | SA-CA: ✅ (soft delete) / SA: ✅ (físico) | ➖ | ➖ |
| Redes Sociales | Todos: 👁️ (empresa) | SA-CA-D: ✅ / C: ✅ (acotado a tareas asignadas) | ➖ | ➖ | ➖ | ➖ |

## Operaciones

| Módulo | Ver | Crear/Editar | Aprobar | Eliminar | Exportar | Automatizar |
|---|---|---|---|---|---|---|
| Tareas *(= Actividades, vista C)* | C: ✅ (lo suyo) | C: ✅ (avance, título/canal/fecha acotado) | ➖ | ❌ (`FASES-APP.md` Fase 4: nunca borra) | ➖ | ➖ |
| Evidencias | Todos: 👁️ (empresa) | SA-CA-C: ✅ (subir) | ➖ | ➖ (sin función en UI hoy) | ➖ | ✅ (otorga puntos automático) |

## Analytics

| Módulo | Ver | Crear/Editar | Aprobar | Eliminar | Exportar | Automatizar |
|---|---|---|---|---|---|---|
| KPIs / Objetivos | Todos: 👁️ (empresa) | SA-CA: ✅ / D: 👁️ | ➖ | SA-CA: ✅ | ➖ | ➖ |
| Dashboards | SA-CA-D: ✅ | ➖ (calculado, no editable) | ➖ | ➖ | ➖ (**[FUTURO]** PDF/CSV) | ✅ (se recalcula solo) |
| Metas de seguidores | SA-CA-D: 👁️ / C: 👁️ (progreso) | SA-CA-D: ✅ | ➖ | SA-CA: ✅ | ➖ | ➖ |
| Gamificación (ranking) | SA-CA-D: ✅ | ➖ (calculado por trigger) | ➖ | ➖ | ➖ | ✅ (100% automático) |

## Inteligencia Artificial

| Módulo | Ver | Crear/Editar | Aprobar | Eliminar | Exportar | Automatizar |
|---|---|---|---|---|---|---|
| Calendar Planner *(único existente)* | CA: ✅ (generar) | CA: ✅ (editar propuesta antes de publicar) | CA: ✅ (publicar = aprobar) | ➖ | ➖ | ❌ (disparo manual por diseño, `IA.md` §5) |
| Resto de agentes (23) | **[FUTURO]** — permisos definidos individualmente por agente en `05A-AI-AGENTS.md` | | | | | |

## Configuración e Integraciones

Todo **[FUTURO]** — matriz a definir cuando cada módulo se construya, siguiendo el mismo criterio ya aplicado aquí: `company_admin` administra su empresa, `director` solo lectura donde aplique, `collaborator` sin acceso salvo excepción justificada, `super_admin` sin restricción.

---

## Notas de Lectura de esta Matriz

1. **"Aprobar" está vacío (➖) en casi todo el sistema** porque MAHP hoy no tiene un flujo de aprobación formal separado del estado de una tarea — la única excepción real es Calendar Planner, donde "publicar" funciona como aprobación explícita de una propuesta de IA.
2. **"Exportar" está vacío en todo el sistema** — es la brecha funcional más antigua identificada (`06D-ANALYTICS-MODULES.md` #3, ya señalada desde `FASES-APP.md` Fase 2).
3. **"Automatizar" solo aplica hoy a lo que ya corre por trigger** (notificaciones, auditoría, puntos, dashboards recalculados) — no hay automatización configurable por el usuario todavía (`06E-AI-MODULES.md` #3).
4. El `director` es, en toda la matriz, el rol más consistente: **ver todo, editar nada** (salvo Redes Sociales y Metas de seguidores, donde sí puede reportar/configurar — excepción real ya corregida vía `v17`, ver `DATABASE.md` §5).
