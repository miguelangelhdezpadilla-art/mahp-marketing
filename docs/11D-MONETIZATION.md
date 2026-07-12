# MONETIZATION — Estrategia de Monetización

> MDS-012, Documento 5 de 10. Modelo SaaS, planes, licencias, add-ons,
> marketplace, programas para agencias/franquicias/partners. **No
> redefine** `10B-SUBSCRIPTION-AND-LICENSING.md` (MDS-011, ya diseñó
> planes/límites/facturación/upgrade-downgrade/add-ons) — se enfoca en lo
> que MDS-011 dejó fuera de su alcance: programas comerciales específicos
> por tipo de cliente.
>
> Última actualización: 2026-07-12.

---

## 1. Modelo SaaS — referencia, no redefinición

Ver `10B-SUBSCRIPTION-AND-LICENSING.md` completo. Resumen de una línea: suscripción recurrente por plan, límites aplicados vía función `security definer`, sin precios reales fabricados en ningún documento (`CLAUDE.md` §6).

## 2. Planes de suscripción — referencia

Ver `10B` §2. No se agregan niveles nuevos aquí sin evidencia de necesidad — este documento asume la estructura ya diseñada (`plans`/`limits` jsonb).

## 3. Licencias — referencia

Cubierto por el mismo mecanismo de planes (`10B`) — MAHP no tiene un concepto de "licencia" separado de "plan de suscripción" (a diferencia de software on-premise con licencias perpetuas); es SaaS puro, sin modelo híbrido planeado.

## 4. Add-ons — referencia

Ver `10B` §8 (`company_addons`). No se listan add-ons específicos nuevos sin demanda confirmada.

## 5. Marketplace — referencia

Ver `08I-MARKETPLACE.md` completo, incluido su modelo de certificación y publicación de apps de terceros — no se repite ni se agrega una capa de monetización de marketplace (comisión por transacción, etc.) sin que el marketplace mismo exista primero.

## 6. Programa para Agencias

**[FUTURO], nuevo en este documento** — no cubierto antes. Una agencia gestiona marketing de varias marcas/clientes a la vez (`01-IDENTIDAD-DEL-PRODUCTO.md` §9, `11B-BUSINESS-GROWTH.md` §1) — hoy usaría MAHP como varias empresas (`companies`) separadas, sin vista consolidada ni facturación unificada. Depende de la misma decisión de modelo de organización bloqueada desde MDS-003 (`10C-ORGANIZATION-MODEL.md`): una agencia es, en esencia, el mismo problema de "organización con varias empresas hijas" que una franquicia, visto desde el ángulo comercial en vez del operativo. Propuesta de monetización cuando se resuelva el modelo: precio por marca gestionada dentro de la cuenta de agencia, con descuento por volumen — estructura, no números (`CLAUDE.md` §6).

## 7. Programa para Franquicias

**[FUTURO]** — misma dependencia que Agencias (§6), documentada aquí desde el ángulo comercial. Complementa `09D-AUTOMATION-TEMPLATES.md` (plantillas de Franquicias/Restaurantes, ya diseñadas y bloqueadas por la misma razón) con la pregunta de monetización: ¿la matriz paga un plan que cubre todas las sucursales, o cada sucursal factura por separado? Ya se señaló como pregunta abierta en `10C-ORGANIZATION-MODEL.md` §2 — este documento no la resuelve, la reafirma como parte de la misma decisión pendiente.

## 8. Programa para Partners Tecnológicos

**[FUTURO], nuevo en este documento**. Distinto de Marketplace (que es catálogo de apps de terceros dentro de MAHP) — un partner tecnológico integra MAHP *hacia* su propio producto (ej. un ERP que ofrece "gestión de marketing con MAHP" como parte de su oferta). Requiere la API pública y SDK ya diseñados en MDS-009 (`08-ENTERPRISE-INTEGRATION-PLATFORM.md` §5, `08G-SDK-STRATEGY.md`) con un acuerdo comercial adicional (revenue share o licencia por volumen) — estructura, no términos específicos, que corresponden a negociación real, no a este documento.

---

## Resumen de dependencias de monetización futura

```
10B (planes base)  ──▶  ya diseñado, activación por demanda (11A Fase 2)
        │
        ├──▶ Programa Agencias/Franquicias (§6, §7) ──▶ bloqueado por
        │                                                10C (modelo de
        │                                                organización)
        │
        └──▶ Programa Partners (§8) ──▶ bloqueado por 08-* (API pública
                                          real, no solo diseñada)
```

---

## KPIs

Ver `11H-SUCCESS-METRICS.md` para MRR/ARR/churn generales. Específicos de este documento: ingreso por segmento (agencia vs. empresa individual, una vez existan ambos), adopción del programa de partners (integraciones activas originadas por partner vs. directas).
