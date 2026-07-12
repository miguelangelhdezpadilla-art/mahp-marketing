# SUBSCRIPTION AND LICENSING — Planes, Licencias y Suscripciones

> MDS-011, Documento 3 de 10. Planes, límites, facturación, renovaciones,
> pruebas gratuitas, upgrade/downgrade, add-ons, gestión de consumo.
> Construye directamente sobre el diseño conceptual ya existente en
> `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §4 — no lo redefine, lo completa.
>
> **Estado: [FUTURO] en su totalidad.** MAHP hoy no cobra por suscripción
> de forma automatizada — la única empresa activa opera sin plan
> diferenciado.
>
> Última actualización: 2026-07-12.

---

## 1. Punto de partida — lo ya diseñado en MDS-003

```
plans (id, name, price, limits jsonb)
        │
        ▼
companies.plan_id (FK) — cada empresa tiene un plan activo
        │
        ▼
Función security definer valida el límite antes de un insert crítico
(mismo patrón que my_role()/my_company_id())
```

Este documento no cambia esta estructura — la completa con el ciclo de negocio completo alrededor de ella.

## 2. Planes

Estructura propuesta de `limits` (jsonb), sin fabricar precios reales (`CLAUDE.md` §6 — ningún número de este documento es un precio real, todos son placeholders de estructura):

```json
{
  "max_colaboradores": 10,
  "max_actividades_mes": 200,
  "acceso_ia": true,
  "acceso_integraciones": false,
  "acceso_automatizacion": false
}
```

Los límites mapean directamente a capacidades ya construidas (colaboradores, actividades) y a las de MDS-009/010 (integraciones, automatización) — un plan básico podría no incluir acceso a la plataforma de integraciones/automatización en absoluto, no solo limitarla en volumen.

## 3. Límites — aplicación técnica

Extiende el patrón ya anticipado: una función `security definer` (`plan_permite(company_id, capacidad)`) consultada por RLS o por el cliente antes de una acción — ej. `invites_insert` ganaría una condición adicional `AND plan_permite(company_id, 'colaborador_adicional')`. Mismo principio de `07C-DATABASE-STANDARDS.md` §3: la autorización real vive en la base de datos, nunca solo en la interfaz — un límite de plan no es distinto, en términos de arquitectura, de un límite de rol.

## 4. Facturación

Ver `08C-INTEGRATIONS-CATALOG.md`, secciones Stripe/Mercado Pago, y `08B-WEBHOOKS.md` §2 (webhook entrante de pago) — este documento no rediseña esa integración, la consume: un evento `pago.recibido`/`pago.fallido` (`09C-EVENT-CATALOG.md`) actualiza el estado de la suscripción.

## 5. Renovaciones

Automáticas por defecto (modelo SaaS estándar), gestionadas del lado del proveedor de pago (Stripe/Mercado Pago ya manejan ciclos de facturación recurrente nativamente) — MAHP solo reacciona al webhook de resultado, no gestiona el cálculo de fechas de renovación por su cuenta.

## 6. Upgrade y downgrade

- **Upgrade**: efecto inmediato (el cliente paga más, obtiene más de inmediato) — sin fricción operativa.
- **Downgrade**: efecto al finalizar el ciclo de facturación actual (evita el caso de que un downgrade deje a una empresa con más colaboradores activos de los que su nuevo plan permite, en medio del mes ya pagado) — regla de negocio propuesta, no una decisión ya tomada por el usuario, señalada explícitamente como tal.

## 7. Pruebas gratuitas

**[FUTURO]**: `companies.trial_ends_at` (nullable) — durante el periodo de prueba, plan con límites generosos pero temporal; al vencer sin conversión a pago, transición a plan gratuito muy limitado o suspensión, no eliminación de datos (mismo principio de soft delete y de que "nada crítico se pierde" — `07D-DATA-LIFECYCLE.md`, `PROJECT-BLUEPRINT.md` §5 principio 4).

## 8. Add-ons

**[FUTURO]**: capacidades que se compran fuera del plan base (ej. "paquete adicional de generación de IA", "sucursal adicional" una vez exista el modelo de organización — `10C-ORGANIZATION-MODEL.md`). Estructura propuesta: tabla `company_addons` (`company_id`, `addon_type`, `active_since`, `expires_at` nullable) — aditiva, no requiere tocar `plans`.

## 9. Gestión de consumo

Requiere observabilidad de uso real por empresa (cuántas actividades creó este mes, cuántas invocaciones de IA usó) — **se apoya en `CCEC-004A-METRICS-AND-DASHBOARDS.md`**, no se redefine aquí un mecanismo de medición propio. Este documento solo agrega qué métricas de consumo son relevantes para negocio (no solo para salud técnica): uso vs. límite del plan, por empresa, como entrada directa para sugerir upgrade.

## 10. Eventos de auditoría de esta capacidad

Se agregan a `CCEC-001A-AUDIT-EVENT-CATALOG.md` (no se redefinen aquí, siguiendo la instrucción explícita de esta fase): `suscripcion_creada`, `plan_cambiado` (upgrade/downgrade), `cuenta_suspendida_por_impago`, `prueba_gratuita_iniciada`/`vencida`.

---

## KPIs

| KPI | Definición |
|---|---|
| Distribución de empresas por plan | Cuántas empresas en cada nivel |
| Tasa de conversión de prueba gratuita | % que pasa a plan pagado |
| Tasa de upgrade/downgrade | Movimiento entre planes por periodo |
| Empresas cerca del límite de su plan | Señal de oportunidad de upgrade — consume `CCEC-004A` |
| Suspensiones por impago | Volumen y tiempo hasta reactivación |
