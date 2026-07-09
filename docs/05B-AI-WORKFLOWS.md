# AI WORKFLOWS — Flujos Colaborativos entre Agentes

> MDS-006, Documento 3 de 6. Cómo colaboran los agentes de `05A-AI-AGENTS.md`
> entre sí para escenarios reales. **Todos los flujos aquí son diseño
> futuro** — hoy solo existe el flujo de un único agente (Calendar Planner,
> marcado explícitamente abajo). Cada flujo sigue el patrón de orquestación
> secuencial de `05-AI-ECOSYSTEM.md` §11 (sin comunicación dinámica
> agente-a-agente en la V1) y termina siempre en revisión humana antes de
> publicarse (`05-AI-ECOSYSTEM.md` §1).
>
> Última actualización: 2026-07-09.

---

## 1. Marketing — Nueva Campaña Completa

```
Solicitud del usuario ("quiero una campaña de fin de año")
        │
        ▼
Marketing Strategist (interpreta y orquesta)
        │
        ▼
Campaign Planner (objetivos + estructura)
        │
        ▼
Calendar Planner (actividades) ── [ÚNICO PASO YA CONSTRUIDO HOY]
        │
        ▼
Content Creator (copy por actividad)
        │
        ▼
Graphic & Creative Director (formato visual sugerido)
        │
        ▼
Quality Assurance Advisor (revisión de consistencia)
        │
        ▼
      Revisión humana (company_admin)
        │
        ▼
    Publicación real en MAHP
```

**Hoy**: el usuario hace manualmente los pasos de Campaign Planner, Content Creator, Creative Director y QA — Calendar Planner es el único ya asistido por IA.

---

## 2. Operaciones — Seguimiento y Alertas

```
(disparo periódico, no solicitud del usuario)
        │
        ▼
Project Coordinator (detecta actividades atrasadas)
        │
        ├──► KPI Advisor (¿el atraso afecta algún KPI?)
        │
        ▼
Executive Assistant (consolida en un resumen)
        │
        ▼
Notificación / resumen al abrir sesión (company_admin, director)
```

---

## 3. Restaurantes — Campaña de Temporada

```
Solicitud del usuario ("es temporada de Buen Fin")
        │
        ▼
Restaurant Marketing Specialist (conocimiento de dominio)
        │
        ▼
Campaign Planner (estructura la campaña)
        │
        ▼
Calendar Planner (actividades)
        │
        ▼
Content Creator (copy con tono del giro restaurantero)
        │
        ▼
      Revisión humana
```

**Bloqueo actual**: Restaurant Marketing Specialist depende de que exista el campo "giro de negocio" por empresa y categorías personalizables (`05A-AI-AGENTS.md`, agente 21, limitaciones) — el flujo completo no es viable hasta cerrar esa brecha de datos.

---

## 4. Franquicias — Comparativo Multi-Sucursal

```
Solicitud del Franquiciatario [ROL NO EXISTE TODAVÍA]
        │
        ▼
Franchise Operations Advisor
        │
        ├──► Business Analyst (por cada sucursal)
        │
        ▼
Consolidado comparativo entre sucursales
        │
        ▼
      Revisión humana (Franquiciatario)
```

**Bloqueo actual**: todo el flujo depende del modelo de datos jerárquico "empresa padre / empresas hijas" (`05A-AI-AGENTS.md`, agente 20) — no se puede construir ni probar hasta que ese prerequisito de arquitectura exista.

---

## 5. Reportes — Cierre de Campaña

```
Campaña marcada como cerrada/completada
        │
        ▼
Business Analyst (resumen ejecutivo)
        │
        ├──► KPI Advisor (cumplimiento de objetivos)
        ├──► Data Analyst (datos de soporte específicos)
        │
        ▼
Executive Assistant (consolida en un solo reporte)
        │
        ▼
      Entregado a company_admin / director
```

---

## 6. Contenido — Producción de una Pieza Individual

```
Actividad ya en el calendario (creada manual o por Calendar Planner)
        │
        ▼
Content Creator (copy) ──┬── Video Campaign Advisor (si el canal es video)
                          └── Graphic & Creative Director (formato visual)
        │
        ▼
SEO Specialist (si aplica — contenido de blog/Google Business)
        │
        ▼
Quality Assurance Advisor
        │
        ▼
      Revisión humana → actividad lista para ejecutar
```

---

## 7. Automatizaciones — Detección y Propuesta de Regla

```
(análisis periódico del historial de actividades)
        │
        ▼
Automation Expert (detecta patrón repetido)
        │
        ▼
Workflow Optimizer (evalúa si es un problema de proceso más amplio)
        │
        ▼
Propuesta presentada al company_admin
        │
        ▼
  ¿Aceptada? ──► Sí ──► Regla activa en el motor de automatización
                          (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §13,
                           no construido — bloqueante de este flujo)
              └─► No ──► Descartada, no se repite la misma sugerencia
```

**Bloqueo actual**: sin el motor de automatización con cola (`02-ARCHITECTURE` §13), este flujo termina en "sugerencia informativa" — no puede activarse automáticamente todavía.

---

## Principio Transversal a Todos los Flujos

Ningún flujo termina en una acción real sobre datos de MAHP sin pasar por **revisión humana** — es la única etapa que aparece en los 7 flujos sin excepción, reafirmando `05-AI-ECOSYSTEM.md` §1 y `01-IDENTIDAD-DEL-PRODUCTO.md` §7 principio 3. Los flujos que hoy están bloqueados (Restaurantes, Franquicias, Automatizaciones) lo están por **prerequisitos de arquitectura o de datos ya identificados en documentos anteriores**, no por falta de diseño del flujo de IA en sí — la secuencia de agentes ya está definida y lista para cuando esos prerequisitos se resuelvan.
