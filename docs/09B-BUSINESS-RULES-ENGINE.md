# BUSINESS RULES ENGINE — Motor de Reglas de Negocio

> MDS-010, Documento 3 de 10. SI ocurre un evento Y se cumplen condiciones
> ENTONCES ejecutar una o varias acciones. Prioridades, conflictos,
> dependencias, excepciones, validaciones.
>
> **Estado: [FUTURO]** — corresponde a la tabla `automation_rules` ya
> reservada en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §13.
>
> Última actualización: 2026-07-12.

---

## 1. Estructura de una regla

```
SI ocurre [evento del catálogo, 09C-EVENT-CATALOG.md]
Y se cumplen [condiciones sobre los datos del evento]
ENTONCES ejecutar [uno o varios workflows, 09A-WORKFLOW-ENGINE.md]
```

Separación deliberada de responsabilidades frente al Workflow Engine: la regla decide **si** actuar, el workflow decide **cómo**. Esto permite que una misma condición ("actividad vencida hace más de 2 días") dispare workflows distintos en empresas distintas (una notifica por correo, otra por WhatsApp) sin duplicar la lógica de detección del evento.

## 2. Prioridades

Cuando más de una regla de la misma empresa aplica al mismo evento, se ejecutan **todas**, no solo la de mayor prioridad — una regla no "gana" sobre otra por defecto, porque normalmente representan necesidades independientes (una regla notifica, otra actualiza un KPI; ambas deben pasar). La única prioridad que importa es el **orden de ejecución** cuando dos reglas escriben al mismo dato: se ejecutan en el orden en que se crearon (FIFO), sin un campo de prioridad configurable en la V1 — evita la complejidad de que un `company_admin` tenga que razonar sobre prioridades numéricas para casos que, en la práctica, rara vez colisionan.

## 3. Conflictos

Un conflicto real ocurre solo cuando dos reglas intentan una acción mutuamente excluyente sobre el mismo dato en la misma ejecución (ej. una regla marca una actividad como completada, otra la reasigna a otro colaborador, ambas disparadas por el mismo evento). Mitigación de diseño: cada acción se ejecuta como una escritura normal sujeta a RLS y constraints de Postgres (`07C-DATABASE-STANDARDS.md`) — si dos acciones son incompatibles a nivel de datos, la segunda falla con el mismo error que fallaría un usuario humano intentando lo mismo, y ese fallo se registra (`09A-WORKFLOW-ENGINE.md` §8), no se oculta.

## 4. Dependencias

Una regla puede depender de que otra ya haya actuado — por ejemplo, "notificar meta alcanzada" depende de que el evento `seguidores.meta_alcanzada` (`09C-EVENT-CATALOG.md`) ya se haya calculado. En la V1, las dependencias entre reglas no se declaran explícitamente entre sí — se ordenan naturalmente porque cada regla reacciona a un evento distinto y los eventos ya tienen su propio orden causal (uno produce datos que hacen posible el siguiente). Declarar dependencias explícitas entre reglas es un candidato de V3 si la complejidad real lo justifica.

## 5. Excepciones

Un `company_admin` puede desactivar una regla para una actividad/campaña específica sin desactivarla para toda la empresa (ej. "no me recuerdes esta campaña en particular") — **[FUTURO, V3]**, no en la primera versión. En la V1, una regla aplica a toda la empresa o no aplica; el control granular por excepción se agrega solo si la demanda real de clientes lo pide, mismo criterio de activación por demanda de toda la plataforma de automatización.

## 6. Validaciones

Antes de guardar una regla nueva:

- El evento referenciado debe existir en el catálogo (`09C-EVENT-CATALOG.md`) — no se permiten eventos inventados por el cliente en la V1.
- Las condiciones deben referenciar campos reales de la entidad del evento (mismo principio de `07B-DATA-GOVERNANCE.md` §4: validar en el punto de entrada).
- El/los workflow(s) referenciados deben existir y pertenecer a la misma empresa — nunca una regla de la Empresa A puede disparar un workflow de la Empresa B (mismo aislamiento multiempresa de siempre, `07H-MULTI-TENANT-DESIGN.md`).
- Una regla no puede referenciarse a sí misma como acción (previene el caso trivial de recursión infinita, complementario al límite de pasos ya fijado en `09A-WORKFLOW-ENGINE.md` §7).

---

## KPIs

| KPI | Definición |
|---|---|
| Reglas activas | Total configurado por empresa |
| Eventos sin regla asociada | Señal de qué eventos del catálogo tienen baja adopción |
| Conflictos detectados | Ejecuciones donde una acción falló por incompatibilidad con otra regla (§3) |
