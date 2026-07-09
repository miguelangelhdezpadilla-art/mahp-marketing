# PRODUCT BLUEPRINT — Especificación Funcional Oficial de MAHP

> MDS-007, Documento principal (1 de 11). Comportamiento funcional completo
> del producto: qué hace cada módulo, quién lo usa, cómo se relaciona con el
> resto. Toda funcionalidad nueva debe ubicarse aquí antes de implementarse.
>
> **Convención de estado, aplicada en los 11 documentos de esta fase**:
> **[EXISTE]** = construido y verificado contra el código real (`MODULOS.md`,
> `DATABASE.md`). **[FUTURO]** = diseño, no implementado. **[PARCIAL]** =
> existe una versión reducida de lo descrito. Ningún módulo se presenta como
> construido si no lo está — mismo criterio que todo `/docs` (`CLAUDE.md` §2).
>
> Última actualización: 2026-07-09.

---

## 1. Visión Funcional del Producto

MAHP funciona como una pirámide de 3 capas: **Core** (identidad, usuarios, permisos — sin esto nada más opera), **Módulos operativos** (Marketing, Operaciones, Analytics — el trabajo diario), y **Capacidades transversales** (IA, Integraciones, Configuración — potencian a los módulos operativos sin ser un fin en sí mismas). Ningún módulo operativo funciona sin el Core; ninguna capacidad transversal tiene sentido sin al menos un módulo operativo al que aplicarse — la IA no genera nada si no hay Campañas ni Calendario donde publicarlo.

## 2. Catálogo General de Módulos

| Categoría | Documento | Módulos incluidos | Construidos hoy |
|---|---|---|---|
| Core | `06A-CORE-MODULES.md` | Empresas, Sucursales, Usuarios, Roles, Permisos, Configuración, Notificaciones, Auditoría | 6 de 8 |
| Marketing | `06B-MARKETING-MODULES.md` | Campañas, Calendario, Actividades, Contenido, Redes Sociales, Influencers, Presupuestos, Activos Digitales | 4 de 8 |
| Operaciones | `06C-OPERATIONS-MODULES.md` | Tareas, Checklists, Procesos, Evidencias, Incidencias | 2 de 5 |
| Analytics | `06D-ANALYTICS-MODULES.md` | KPIs, Dashboards, Reportes, Objetivos, Tendencias | 3 de 5 (2 parciales) |
| Inteligencia Artificial | `06E-AI-MODULES.md` | Centro de IA, Agentes, Automatizaciones, Recomendaciones, Asistentes | 0 de 5 completos (automatizaciones parcial vía triggers) |
| Integraciones | `06F-INTEGRATIONS.md` | Meta, Google, WhatsApp, TikTok, APIs, Webhooks | 0 de 6 |
| Configuración | *(cubierto en `06A` §6, no amerita archivo propio — ver nota)* | Empresa, Branding, Seguridad, Suscripción, Facturación, Preferencias | 0 de 6 como pantalla dedicada (ajustes repartidos hoy) |
| Futuro (fuera de alcance actual) | `06J-FUTURE-MODULES.md` | CRM, Inventario, Ventas, Compras, Finanzas, RH, Franquicias, BI, App Móvil, Marketplace | 0 de 10 |

**Total: 53 módulos catalogados** (incluyendo los 10 de "Futuro" y los 6 de Configuración) — 15 construidos, 2 parciales, 36 en diseño puro. La proporción real refleja honestamente que MAHP hoy es la base Core+Marketing+parte de Operaciones/Analytics, con un ecosistema de expansión ya diseñado pero no construido.

## 3. Relación entre Módulos

```
                    ┌─────────────────────────┐
                    │          CORE             │
                    │ Empresas·Usuarios·Roles·  │
                    │ Permisos·Notificaciones·  │
                    │ Auditoría·Configuración   │
                    └────────────┬─────────────┘
        ┌───────────────┬────────┴────────┬───────────────┐
        ▼                ▼                 ▼               ▼
   MARKETING        OPERACIONES        ANALYTICS      INTEGRACIONES
   Campañas·         Tareas·           KPIs·           Meta·Google·
   Calendario·       Checklists·       Dashboards·     WhatsApp·
   Actividades·      Procesos·         Reportes·       TikTok·APIs
   Contenido·        Evidencias·       Objetivos·
   Redes·            Incidencias       Tendencias
   Influencers·
   Presupuestos
        │                │                 │
        └────────────────┴────────┬────────┘
                                    ▼
                    ┌─────────────────────────┐
                    │  INTELIGENCIA ARTIFICIAL  │
                    │ Centro IA · Agentes ·     │
                    │ Automatizaciones ·        │
                    │ Recomendaciones           │
                    │ (ver docs 05-AI-*)        │
                    └─────────────────────────┘
```

Regla de dependencia (heredada de `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §6): un módulo operativo nunca depende directamente de otro módulo operativo de otra categoría — solo del Core. La IA depende de los módulos operativos (lee sus datos), nunca al revés.

## 4. Mapa Funcional del Sistema

**Flujo general del producto:**
```
Empresa se da de alta (Core)
        │
        ▼
Se invita al equipo, se asignan roles (Core)
        │
        ▼
Se define una campaña con objetivos (Marketing)
        │
        ▼
Se planean actividades — manual o con IA (Marketing + IA)
        │
        ▼
El equipo ejecuta — reporta avance, sube evidencia (Operaciones)
        │
        ▼
El sistema mide — KPIs, dashboards (Analytics)
        │
        ▼
Dirección revisa — reportes, IA explica el porqué (Analytics + IA)
```

**Flujo de creación de campañas** — ver `06B-MARKETING-MODULES.md` (módulo Campañas) y `05B-AI-WORKFLOWS.md` §1 para la versión asistida por IA.

**Flujo de colaboración entre usuarios:**
```
company_admin crea actividad → asigna a collaborator
        │
        ▼
collaborator ve en "Mis tareas" → reporta avance + evidencia
        │
        ▼
trigger sincroniza estado → notifica → otorga puntos (gamificación)
        │
        ▼
director/company_admin ven avance agregado (sin acción manual)
```
*(Ya construido — `FASES-APP.md` Fase 4, `MODULOS.md` #11-13)*

**Flujo de IA** — ver `05-AI-ECOSYSTEM.md` §3 (diagrama completo de arquitectura del ecosistema).

**Flujo de reportes**: actividad completada → datos ya en `activity_updates`/`evidencias` → Business Analyst (IA, futuro) o revisión manual (hoy) → resumen ejecutivo.

**Flujo de notificaciones**: evento de dominio (asignación, avance, KPI atrasado) → trigger de base de datos → tabla `notifications` → campanita en topbar (`MODULOS.md` #20). Ningún flujo de notificación pasa por IA en la V1 — la IA puede generar el *contenido* de una alerta (KPI Advisor), pero el *disparo* sigue siendo un trigger determinista (`05-AI-ECOSYSTEM.md` §5).

**Flujo de automatizaciones**: ver `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §13 (motor propuesto) y `05B-AI-WORKFLOWS.md` §7.

## 5. Flujo Principal del Usuario

El recorrido más corto y más frecuente del sistema completo: **colaborador reporta avance** (abrir app → ver tarea → deslizar % → guardar). Es el flujo contra el que se mide la fricción de cualquier flujo nuevo (`04C-UX-GUIDELINES.md` §1). El segundo más frecuente: **admin revisa el estado general** (abrir `empresa.html` → ver resumen ejecutivo → sin necesidad de entrar a ningún detalle si todo está en verde).

## 6. Flujo del Negocio

MAHP como negocio SaaS: una empresa se da de alta (hoy, manualmente por `super_admin`; futuro, autoservicio — `02-ARCHITECTURE` §4) → opera con un plan (hoy sin diferenciación de plan real; futuro, límites por `plans`) → genera valor medible (adopción de módulos, tiempo ahorrado) → eventualmente paga una suscripción (`06A-CORE-MODULES.md`, módulo Configuración/Suscripción, **[FUTURO]**).

## 7. Principios Funcionales

1. Todo módulo resuelve un problema real ya identificado, nunca se construye "porque otros productos lo tienen".
2. Todo módulo se integra con el Core desde el diseño — ningún módulo nuevo reinventa autenticación, permisos o notificaciones.
3. Todo módulo es reutilizable entre roles cuando el dato lo permite (mismo componente, distinta vista según permiso — `04-DESIGN-SYSTEM.md` §4).
4. Ningún módulo rompe otro al evolucionar — compatibilidad hacia atrás no negociable (`03-ENGINEERING-STANDARDS.md` §3).
5. Todo módulo tiene un criterio de éxito medible desde su diseño, no agregado después.

## 8. Objetivos de Cada Área

| Área | Objetivo funcional |
|---|---|
| Core | Que la plataforma sea confiable, segura y aislada por empresa — la base que todo lo demás da por sentada |
| Marketing | Que planear y ejecutar contenido tome minutos, no horas |
| Operaciones | Que el trabajo del día a día quede registrado sin fricción para quien lo hace |
| Analytics | Que nadie tenga que armar un reporte a mano para saber cómo va su empresa |
| IA | Que la plataforma anticipe necesidades en vez de solo responder a comandos |
| Integraciones | Que MAHP viva donde el cliente ya opera (sus redes, su correo), no que lo obligue a salir de MAHP para todo |
| Configuración | Que cada empresa pueda adaptar el sistema a su realidad sin pedir ayuda técnica |

## 9. Modelo Operativo del Producto

MAHP opera con **un solo código base multiempresa** (no una instancia por cliente) — toda mejora beneficia a todas las empresas cliente simultáneamente, y todo aislamiento de datos vive en RLS, no en infraestructura separada (`02-ARCHITECTURE` §4). El ciclo operativo de desarrollo sigue el flujo ya formalizado en `03-ENGINEERING-STANDARDS.md` §2 (documentar primero, con este Product Blueprint como la capa funcional que se revisa antes que el diseño técnico).

## 10. Estrategia de Evolución Funcional

Ver el resumen ejecutivo al final de esta fase (backlog priorizado) y `06J-FUTURE-MODULES.md` para los módulos fuera del alcance actual del producto. Regla general: un módulo pasa de `06J` (Futuro) a una categoría operativa real solo cuando (a) resuelve un problema ya validado por clientes reales de MAHP, no especulativo, y (b) no introduce una dependencia que rompa Simplicidad Progresiva (`02-ARCHITECTURE` §2.6).
