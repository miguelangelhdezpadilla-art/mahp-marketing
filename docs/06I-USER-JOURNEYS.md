# USER JOURNEYS — Recorridos Completos de Usuario

> MDS-007, Documento 10 de 11. 8 recorridos. **Administrador, Director,
> Colaborador y Equipo de Marketing son roles/usos reales hoy** — el resto
> son personas conceptuales: "Cliente nuevo"/"Cliente recurrente" son el
> mismo rol (`company_admin`) en dos momentos distintos de madurez de uso;
> "Franquiciatario"/"Consultor" son roles **[FUTURO]** que dependen de
> prerequisitos ya identificados (`06A-CORE-MODULES.md` #2, `05A-AI-AGENTS.md` #20).
>
> Formato: Objetivos · Pantallas · Acciones · Puntos de decisión ·
> Notificaciones · IA involucrada · Resultados esperados.
>
> Última actualización: 2026-07-09.

---

## 1. Administrador (`company_admin`) — **[EXISTE]**

| | |
|---|---|
| Objetivos | Planear, asignar y dar seguimiento al marketing de su empresa sin perder control |
| Pantallas | `empresa.html` completo — Resumen, Calendario, Campañas, Equipo, Estrategias, Seguidores |
| Acciones | Crear campaña → generar/crear actividades → asignar a colaboradores → invitar equipo → revisar avance |
| Puntos de decisión | ¿Genero el calendario con IA o lo armo a mano? · ¿A quién asigno esta actividad? · ¿Publico la propuesta de IA tal cual o la edito primero? |
| Notificaciones | Avance reportado, evidencia subida (vía trigger) |
| IA involucrada | Calendar Planner **[EXISTE]**; futuro — Campaign Planner, Content Creator, KPI Advisor |
| Resultados esperados | Campaña completa, ejecutada y medida sin tener que perseguir a nadie manualmente |

## 2. Director — **[EXISTE]**

| | |
|---|---|
| Objetivos | Saber cómo va la empresa sin operar el sistema |
| Pantallas | `directivo.html` — Resumen, Calendario (solo lectura), KPIs, Desempeño, Estrategias, Ranking |
| Acciones | Revisar dashboard → revisar avance de campañas → reportar seguidores (`v17`) → leer estrategias publicadas |
| Puntos de decisión | ¿Este KPI atrasado requiere intervenir con el admin? |
| Notificaciones | Igual que Administrador, de solo lectura |
| IA involucrada | Ninguna hoy; futuro — KPI Advisor, Business Analyst, Data Analyst (agentes de solo-análisis, `05-AI-ECOSYSTEM.md` §4) |
| Resultados esperados | Entender el estado real de la empresa en minutos, sin pedir un reporte a nadie |

## 3. Colaborador (`collaborator`) — **[EXISTE]**

| | |
|---|---|
| Objetivos | Saber qué le toca hacer y reportarlo sin fricción |
| Pantallas | `colaborador.html` — Mis Tareas, Calendario, Estrategias |
| Acciones | Ver tarea → ejecutar en el mundo real → reportar % de avance + nota → subir evidencia → marcar completada |
| Puntos de decisión | ¿Ya terminé por completo o solo reporto avance parcial? |
| Notificaciones | Tarea nueva asignada |
| IA involucrada | Ninguna directamente en la V1 (`05-AI-ECOSYSTEM.md` §4) — recibe resultados de IA ya revisados por su admin |
| Resultados esperados | Su trabajo queda registrado y reconocido (gamificación) sin tener que escribir un reporte |

## 4. Equipo de Marketing *(uso de `company_admin`, no un rol técnico distinto)* — **[EXISTE]**

| | |
|---|---|
| Objetivos | Ejecutar la estrategia de contenido de forma eficiente |
| Pantallas | Mismas de Administrador, con foco en Calendario/Campañas/Seguidores/IA |
| Acciones | Generar calendario con IA → revisar/editar → publicar → dar seguimiento a seguidores por canal |
| Puntos de decisión | ¿Qué frecuencia de publicación uso? ¿Qué canales incluyo? |
| Notificaciones | Igual que Administrador |
| IA involucrada | Calendar Planner **[EXISTE]**; mayor beneficiario futuro de Content Creator/Copywriter/Creative Director (`05A` grupo 2) |
| Resultados esperados | Calendario del mes listo en minutos en vez de horas |

## 5. Franquiciatario — **[FUTURO, bloqueado]**

| | |
|---|---|
| Objetivos | Ver desempeño consolidado de varias sucursales y replicar lo que funciona |
| Pantallas | Requiere un dashboard multi-sucursal que no existe (`06A-CORE-MODULES.md` #2) |
| Acciones | Comparar sucursales → identificar mejores prácticas → replicarlas |
| Puntos de decisión | ¿Qué sucursal necesita más atención? |
| Notificaciones | Consolidadas de todas sus sucursales — diseño pendiente |
| IA involucrada | Franchise Operations Advisor (`05A` #20) — bloqueado por el mismo prerequisito |
| Resultados esperados | No aplicable hasta construir el módulo de Sucursales |

## 6. Consultor — **[FUTURO]**

| | |
|---|---|
| Objetivos | Operar MAHP en nombre de varias empresas cliente (uso de agencia) |
| Pantallas | Requiere el modelo de "una cuenta, varias empresas" (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §20, inconsistencia 1 ya detectada en MDS-003) |
| Acciones | Cambiar entre empresas gestionadas sin cerrar sesión repetidamente |
| Puntos de decisión | ¿En qué empresa estoy operando ahora mismo? — requiere un indicador de contexto claro (similar al "modo observador" pendiente del `super_admin`, `04C-UX-GUIDELINES.md` §15) |
| Notificaciones | Por empresa gestionada |
| IA involucrada | Todos los agentes de Marketing/Análisis, aplicados por empresa gestionada |
| Resultados esperados | No aplicable hasta resolver el modelo de roles para agencias |

## 7. Cliente Nuevo *(`company_admin` en su primer uso)* — **[PARCIAL — sin onboarding formal]**

| | |
|---|---|
| Objetivos | Entender rápido qué es MAHP y llegar a su primer valor real |
| Pantallas | `login.html` → `empresa.html` vacío |
| Acciones | Crear cuenta (tras invitación) → explorar la interfaz sin guía |
| Puntos de decisión | ¿Por dónde empiezo? — hoy sin respuesta guiada (`04C-UX-GUIDELINES.md` §6, brecha de onboarding) |
| Notificaciones | Ninguna en este momento del recorrido |
| IA involucrada | Podría usar Calendar Planner de inmediato, pero nada se lo sugiere activamente |
| Resultados esperados hoy vs. diseño | Hoy: depende de que alguien más le explique. **[FUTURO]**: checklist de onboarding (`04C-UX-GUIDELINES.md` §6) — "crea tu primera campaña", "invita a tu equipo", "prueba generar un calendario con IA" |

## 8. Cliente Recurrente *(`company_admin` con uso establecido)* — **[EXISTE]**

| | |
|---|---|
| Objetivos | Que su rutina de trabajo semanal/mensual sea rápida y confiable |
| Pantallas | Las mismas que Administrador (§1), con patrones de uso ya establecidos |
| Acciones | Repite el ciclo campaña → calendario → seguimiento → cierre, cada vez más rápido conforme conoce el sistema |
| Puntos de decisión | ¿Este mes reutilizo la estructura de una campaña anterior? — **[FUTURO]**: plantillas reutilizables (`05A-AI-AGENTS.md` #21, Restaurant Marketing Specialist como ejemplo de dominio) |
| Notificaciones | Igual que Administrador, ya interpretadas con fluidez |
| IA involucrada | Mayor beneficiario de memoria persistente futura (`05E-AI-MEMORY-AND-CONTEXT.md` §4) — la IA podría aprender de sus campañas anteriores, algo que hoy no ocurre (cada generación empieza desde cero, `IA.md` §6) |
| Resultados esperados | Menor tiempo de planeación mes a mes — es el usuario donde el ahorro de tiempo de MAHP es más medible y más valioso |
