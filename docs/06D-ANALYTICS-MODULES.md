# ANALYTICS MODULES — Especificación Funcional

> MDS-007, Documento 5 de 11. Los 5 módulos que convierten datos en
> decisiones. Mismo formato de `06A-CORE-MODULES.md`.
>
> Última actualización: 2026-07-09.

---

## 1. KPIs — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Medir el cumplimiento de una meta de negocio, general o por campaña |
| Problema / Valor | Sin KPI, "cómo va la empresa" es una opinión — con KPI, es un número comparable contra una meta |
| Usuarios / Roles / Permisos | Define `company_admin`; lee todo el equipo de esa empresa |
| Entradas → Proceso → Salidas | Meta + valor actual (manual o calculado) → barra de progreso → alerta si atrasado (futuro, vía IA) |
| Reglas de negocio | Ver `06G-BUSINESS-RULES.md` §3 |
| KPIs / Criterios de éxito | *(meta-nivel)* % de KPIs actualizados regularmente vs. abandonados |
| Automatización / IA | KPI Advisor (`05A` #15) — primer agente candidato de expansión del ecosistema |
| Dependencias / Relaciones / Integraciones | Con `campaign_id` = Objetivos (§4, misma tabla, distinto uso) |
| Escalabilidad / Evolución | Cálculo automático desde actividades **[FUTURO]** (hoy mayormente manual, `FASES-APP.md` Fase 2) |

## 2. Dashboards — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Resumen ejecutivo del estado de la empresa en una sola vista |
| Problema / Valor | Responde "¿cómo va todo?" en 5 segundos, sin entrar a ningún detalle (`FASES-APP.md` Fase 7) |
| Usuarios / Roles / Permisos | `company_admin`/`director` (ambos ven el mismo); `super_admin` por empresa |
| Entradas → Proceso → Salidas | 4 consultas agregadas (`MODULOS.md` #6) → 4 tarjetas con semáforo |
| Reglas de negocio | Máximo 4-6 tarjetas de resumen ejecutivo (`04B-COMPONENT-LIBRARY.md` §4) |
| KPIs / Criterios de éxito | Tiempo que el usuario tarda en entender el estado general al abrir sesión |
| Automatización / IA | Executive Assistant (`05A` #22) — briefing proactivo |
| Dependencias / Relaciones / Integraciones | Agrega datos de Actividades, Campañas, Usuarios |
| Escalabilidad / Evolución | Dashboards especializados por área (Marketing, IA, Configuración — `04B` §7) siguen el mismo patrón de composición |

## 3. Reportes — **[PARCIAL]**

| Campo | Detalle |
|---|---|
| Objetivo | Entregar una "foto" de un periodo/campaña para compartir con dirección o fuera de MAHP |
| Problema / Valor | Hoy existe la información (historial de tareas, tabla de avances) pero no un export formal — `FASES-APP.md` Fase 2 ya señaló "Exportar reporte (PDF/CSV)" como pendiente |
| Usuarios / Roles / Permisos | `company_admin`/`director` |
| Entradas → Proceso → Salidas | Selección de periodo/campaña → **[FUTURO]** generación de PDF/CSV; hoy: solo visualización en pantalla |
| Reglas de negocio | Un reporte no debe recalcular datos — refleja exactamente lo que el dashboard ya muestra, con formato de exportación |
| KPIs / Criterios de éxito | % de usuarios que exportan vs. solo consultan en pantalla |
| Automatización / IA | Business Analyst (`05A` #14) — resumen en lenguaje humano en vez de solo tabla |
| Dependencias / Relaciones / Integraciones | Agrega Historial de tareas, KPIs, Seguidores |
| Escalabilidad / Evolución | Exportación formal (PDF/CSV) es la brecha más antigua sin resolver de todo el catálogo (identificada desde `FASES-APP.md` Fase 2) |

## 4. Objetivos — **[EXISTE]** *(mismo módulo técnico que KPIs, distinta función de negocio)*

| Campo | Detalle |
|---|---|
| Objetivo | La meta medible específica de una campaña (vs. KPI general de empresa) |
| Problema / Valor | Completa la jerarquía Campaña → Objetivo → Actividades → Resultado (`FASES-APP.md` Fase 9) sin inventar una tabla nueva |
| Usuarios / Roles / Permisos | Igual que KPIs (§1) |
| Entradas → Proceso → Salidas | `kpis.campaign_id` con valor → aparece dentro del detalle expandido de esa campaña |
| Reglas de negocio | Un KPI con `campaign_id` vacío es de empresa; con valor, es un Objetivo — misma tabla, sin ambigüedad de datos |
| KPIs / Criterios de éxito | % de campañas con al menos un objetivo definido (mismo indicador que Campañas §1 de `06B`) |
| Automatización / IA | Campaign Planner (`05A` #2) los propone al crear la campaña |
| Dependencias / Relaciones / Integraciones | Depende de Campañas y KPIs — no es una entidad nueva |
| Escalabilidad / Evolución | Ninguna adicional a la de KPIs |

## 5. Tendencias — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Mostrar evolución de una métrica en el tiempo (gráfica de línea), no solo el valor actual |
| Problema / Valor | Hoy todo indicador es un snapshot (barra de progreso, número) — no hay forma de ver "¿va mejorando o empeorando?" sin comparar manualmente |
| Usuarios / Roles / Permisos | `company_admin`/`director` |
| Entradas → Proceso → Salidas | Serie histórica de un KPI/seguidor/cumplimiento → gráfica de línea simple |
| Reglas de negocio | Requiere que existan datos históricos suficientes (ya se registran vía `points_log`/`follower_logs`/`activity_updates` — el dato existe, falta la visualización) |
| KPIs / Criterios de éxito | Adopción de la vista de tendencias vs. la vista de snapshot |
| Automatización / IA | Data Analyst (`05A` #16) podría narrar la tendencia además de graficarla |
| Dependencias / Relaciones / Integraciones | Depende del componente de Gráficas (`04B-COMPONENT-LIBRARY.md` §16, **[FUTURO]**) |
| Escalabilidad / Evolución | Bloqueado hasta que exista el componente de gráficas del sistema de diseño |
