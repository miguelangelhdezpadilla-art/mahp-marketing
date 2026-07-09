# FUTURE MODULES — Fuera del Alcance Actual del Producto

> MDS-007, Documento 11 de 11. 10 módulos explícitamente **fuera del alcance
> de MAHP hoy** — no forman parte del roadmap cercano (`ROADMAP.md`), se
> documentan para que, si algún día se consideran, exista un punto de partida
> y sobre todo un criterio claro de **por qué no se han construido**. Ningún
> módulo de este documento se prioriza sin una decisión de negocio explícita
> que redefina qué es MAHP (`01-IDENTIDAD-DEL-PRODUCTO.md` §1: "no es un CRM,
> no es un ERP").
>
> Formato reducido: Objetivo · Por qué está fuera de alcance · Qué lo activaría · Relación con MAHP actual.
>
> Última actualización: 2026-07-09.

---

## 1. CRM

Objetivo: gestionar relación con clientes finales de la empresa cliente (leads, pipeline de ventas). Por qué está fuera de alcance: contradice explícitamente la identidad del producto (`01-IDENTIDAD-DEL-PRODUCTO.md` §1 — "MAHP no es un CRM"); MAHP gestiona la operación interna de marketing, no las relaciones comerciales del cliente final. Qué lo activaría: una decisión estratégica de expandir la categoría de producto completa, no una simple adición de módulo. Relación con MAHP actual: Customer Experience Advisor (`05A-AI-AGENTS.md` #13) roza este espacio sin cruzarlo — analiza patrones internos, no gestiona contactos individuales.

## 2. Inventario

Objetivo: control de existencias de productos/insumos. Por qué está fuera de alcance: sin relación funcional con marketing operativo — es un dominio de operaciones de negocio distinto. Qué lo activaría: solo si MAHP decidiera expandirse a una suite de operación de negocio completa (fuera de la visión actual, `01-IDENTIDAD-DEL-PRODUCTO.md` §4). Relación con MAHP actual: ninguna.

## 3. Ventas

Objetivo: registrar transacciones comerciales. Por qué está fuera de alcance: mismo criterio que CRM — es el dominio comercial, no el operativo de marketing. Qué lo activaría: igual que CRM. Relación con MAHP actual: los KPIs de MAHP podrían algún día *referenciar* datos de ventas (ej. "conversión de campaña a venta") si existiera una integración con un sistema de ventas externo (`06F-INTEGRATIONS.md`) — eso es una integración, no un módulo de Ventas propio dentro de MAHP.

## 4. Compras

Objetivo: gestión de proveedores y órdenes de compra. Por qué está fuera de alcance: mismo criterio que Inventario. Qué lo activaría: igual. Relación con MAHP actual: ninguna — el módulo de Presupuestos (`06B-MARKETING-MODULES.md` #7) cubre el gasto de *marketing*, no de operación general del negocio.

## 5. Finanzas

Objetivo: contabilidad y estados financieros de la empresa cliente. Por qué está fuera de alcance: mismo criterio — dominio de negocio distinto al de marketing operativo. Qué lo activaría: igual. Relación con MAHP actual: el módulo Configuración/Facturación (`06A-CORE-MODULES.md` #6) es la facturación de MAHP *hacia* su cliente (SaaS), no la contabilidad interna del cliente — no deben confundirse.

## 6. Recursos Humanos

Objetivo: gestión de nómina, contratación, evaluación de desempeño general (no solo de marketing). Por qué está fuera de alcance: MAHP ya mide desempeño operativo de colaboradores en el contexto de marketing (`MODULOS.md` #19, gamificación) — expandir a RH completo es un producto distinto. Qué lo activaría: decisión de negocio de expandirse a suite de gestión de equipo completa. Relación con MAHP actual: `profiles` ya modela personas y roles — sería la base técnica reutilizable si algún día se decide expandir, pero hoy deliberadamente acotado a lo necesario para operar MAHP.

## 7. Franquicias *(distinto de "Sucursales", `06A-CORE-MODULES.md` #2)*

Objetivo: gestión integral del modelo de negocio de franquicia (contratos, regalías, estándares de marca a nivel legal/comercial). Por qué está fuera de alcance: **Sucursales** (`06A` #2) es el prerequisito técnico (jerarquía de empresas) que SÍ está en el roadmap cercano de MAHP como plataforma de marketing multi-sucursal — "Franquicias" como módulo de negocio completo (regalías, contratos) es un dominio distinto, fuera de marketing. Qué lo activaría: una vez construido Sucursales, evaluar demanda real de las capacidades de negocio adicionales. Relación con MAHP actual: es la extensión de negocio de Sucursales, no lo mismo.

## 8. Business Intelligence

Objetivo: análisis de datos cruzados, más allá de dashboards y tendencias de un solo dominio. Por qué está fuera de alcance: `06D-ANALYTICS-MODULES.md` (KPIs, Dashboards, Reportes, Tendencias) ya cubre las necesidades de análisis de marketing — un BI completo (cruces arbitrarios de datos, cubos OLAP) es una capacidad de otro nivel de complejidad, contraria a Simplicidad Progresiva sin una necesidad validada. Qué lo activaría: volumen de datos y complejidad de análisis que Analytics ya no pueda cubrir con vistas SQL simples. Relación con MAHP actual: Data Analyst (`05A-AI-AGENTS.md` #16) es el paso intermedio razonable antes de considerar BI completo — responde preguntas puntuales sin requerir infraestructura de BI.

## 9. Aplicación Móvil (nativa)

Objetivo: app nativa iOS/Android en vez de web responsiva. Por qué está fuera de alcance: la app web ya es mobile-first para el rol que más la usaría desde celular (`collaborator`, `04-DESIGN-SYSTEM.md` §5) — una app nativa agrega complejidad de mantenimiento (dos/tres códigos base) sin un problema real sin resolver hoy. Qué lo activaría: necesidad de capacidades que solo una app nativa ofrece (notificaciones push reales, cámara con mejor integración) que la web no pueda cubrir razonablemente. Relación con MAHP actual: si se construye, los tokens de `04A-DESIGN-TOKENS.md` son la fuente de verdad compartida de identidad visual (`04D-DESIGN-PRINCIPLES.md`, estrategia de evolución V10) — no se reinventa la marca por plataforma.

## 10. Marketplace

Objetivo: tienda de plantillas, integraciones o extensiones de terceros para MAHP. Por qué está fuera de alcance: requiere que existan primero APIs públicas y Webhooks (`06F-INTEGRATIONS.md` #5-6, ambos futuros) como plataforma técnica de extensión — un Marketplace sin nada que ofrecer no tiene sentido. Qué lo activaría: ecosistema de integraciones ya maduro + demanda de terceros construyendo sobre MAHP. Relación con MAHP actual: es el escalón final de la Arquitectura de Escalabilidad (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §17, versión V10 — "plataforma distribuida") — no un módulo de producto en el sentido tradicional, sino una capa de ecosistema.

---

## Principio Transversal

Ninguno de estos 10 módulos se prioriza por estar documentado — estar en este archivo significa explícitamente **"fuera de alcance salvo decisión de negocio explícita"**, lo opuesto a los módulos de `06A`–`06F` que sí son extensión natural de lo que MAHP ya es. La prueba de si algo pertenece aquí o en un documento operativo: *¿esto es una nueva forma de hacer marketing mejor, o es un producto de negocio distinto que MAHP tendría que dejar de ser "un sistema operativo de marketing" para incluir?* Si la respuesta es lo segundo, pertenece aquí.
