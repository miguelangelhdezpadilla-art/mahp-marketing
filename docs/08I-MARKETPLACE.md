# MARKETPLACE — Marketplace de Integraciones

> MDS-009, Documento 10 de 10. Apps oficiales, apps de terceros, plugins,
> conectores, publicación, certificación, actualizaciones y moderación.
> Cierra la fase MDS-009.
>
> **Estado: [FUTURO], el más lejano de toda esta fase** — depende de que
> existan primero API pública (§5), webhooks (`08B`) y al menos un puñado
> de integraciones reales en uso (`08C-INTEGRATIONS-CATALOG.md`). Sin eso,
> un Marketplace no tiene qué listar.
>
> Última actualización: 2026-07-12.

---

## 1. Condición de activación

Mismo principio que todo MDS-009: no se construye por anticipación. El Marketplace se activa cuando exista evidencia de al menos una de estas dos señales: (a) varios clientes ya usan integraciones de terceros vía la API pública/n8n-Zapier-Make de forma recurrente (`08C-INTEGRATIONS-CATALOG.md`, sección n8n/Zapier/Make) y un catálogo central les ahorraría reconfigurar lo mismo cada vez, o (b) un socio externo pide explícitamente publicar una integración oficial para MAHP. Ninguna de las dos condiciones existe hoy.

## 2. Apps oficiales

Integraciones construidas y mantenidas por MAHP mismo — los adaptadores de `08C-INTEGRATIONS-CATALOG.md` (Meta, Google, WhatsApp, etc.) una vez construidos, listados en el Marketplace como "primera parte", con el mismo nivel de confianza que el resto del producto.

## 3. Apps de terceros

Integraciones construidas por un socio externo, no por MAHP, que se conectan vía la API pública (`08-ENTERPRISE-INTEGRATION-PLATFORM.md` §5) y se listan para que otras empresas cliente las descubran e instalen. Requiere que la API pública ya tenga scopes granulares (`08E-SECURITY.md` §3) para que una empresa cliente pueda otorgar acceso limitado a una app de terceros sin darle acceso completo a su cuenta.

## 4. Plugins y conectores

Distinción propuesta: un **conector** solo mueve datos (lee/escribe vía la API pública, ej. una integración con n8n) — un **plugin** además modifica o extiende comportamiento dentro de la interfaz de MAHP (ej. un panel adicional dentro de `empresa.html`). MAHP hoy no tiene arquitectura de extensión de interfaz de ningún tipo (`04-DESIGN-SYSTEM.md`, sin sistema de plugins de UI diseñado) — los plugins de interfaz son, por tanto, un horizonte más lejano que los conectores de datos, y no se diseñan en profundidad en este documento porque dependen de una decisión de arquitectura de frontend que MAHP no ha tomado (introducir algún mecanismo de extensión en un frontend hoy vanilla JS sin framework, `PROJECT-BLUEPRINT.md` §5 principio 5).

## 5. Publicación

Flujo propuesto para cuando exista:

```
Desarrollador de la app construye contra la API pública (con su propio api_key
de desarrollo, vía Developer Portal — 08D-DEVELOPER-PORTAL.md)
        │
        ▼
Envía la app para revisión (§6, Certificación)
        │
        ▼
MAHP revisa: scopes solicitados son razonables, no hay comportamiento
malicioso evidente, cumple lineamientos de marca/UX si aplica
        │
        ▼
App publicada, visible para empresas cliente en el catálogo
        │
        ▼
Empresa cliente instala → autoriza scopes específicos (mismo patrón
de OAuth de 08E-SECURITY.md §2, la empresa cliente es quien otorga
permiso, no MAHP en su nombre)
```

## 6. Certificación

Nivel mínimo antes de listar cualquier app de terceros: verificación de que los scopes solicitados coinciden con lo que la app dice necesitar (una app de "solo lectura de reportes" pidiendo `write:actividades` es una señal de alerta automática), y una revisión manual antes de la primera publicación. No se diseña aquí un proceso de certificación exhaustivo (ej. auditoría de seguridad completa del código del tercero) — es una decisión de cuánto recurso MAHP invertirá en esto, proporcional al riesgo real cuando exista el primer caso.

## 7. Actualizaciones

Una app de terceros que cambia sus scopes solicitados requiere nueva autorización explícita de cada empresa cliente que la tenga instalada — nunca una ampliación de permisos silenciosa. Mismo principio de scope mínimo y consentimiento explícito ya fijado en `08E-SECURITY.md` §2.

## 8. Moderación

**[FUTURO]**: mecanismo de reporte (una empresa cliente reporta que una app de terceros se comporta mal) + capacidad de MAHP de revocar el acceso de una app específica a nivel de plataforma (no solo que cada empresa la desinstale una por una) — es una salvaguarda de plataforma, similar en espíritu a cómo `super_admin` puede revocar acceso de un usuario individual hoy (`profiles.active`), extendida a nivel de integración de terceros.

---

## KPIs

| KPI | Definición |
|---|---|
| Apps publicadas | Total activo en el catálogo, oficiales + terceros |
| Adopción del Marketplace | % de empresas cliente con al menos una app instalada |
| Tiempo de revisión | Desde envío hasta publicación/rechazo de una app nueva |
| Apps reportadas/revocadas | Señal de salud del proceso de certificación (§6) |

---

## Cierre de MDS-009

Con este documento se completan los 10 entregables de la fase (`08` + `08A`–`08I`). Ver `08-ENTERPRISE-INTEGRATION-PLATFORM.md`, sección "Entregable Final", para el resumen ejecutivo, priorización de integraciones críticas, hoja de ruta por fases y verificación de coherencia con MDS-001 a MDS-008 requeridos por el documento de fase.
