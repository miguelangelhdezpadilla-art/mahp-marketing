# ADR-012 — Las conversaciones son activos de negocio que alimentan CRM ligero, Analytics y Automatizaciones, respetando permisos y privacidad

Estado: Aceptado
Fecha: 2026-07-12
Decisores: Chief Product Owner

## Contexto

Una conversación capturada por Social AI Hub podía diseñarse como un dato aislado (vive en su propia tabla, sirve solo para responder al cliente) o como un dato de negocio que se conecta al resto de MAHP (campañas, KPIs, automatización) — pero esta segunda opción, sin límites explícitos, corre el riesgo de convertir al módulo en un CRM completo, que `01-IDENTIDAD-DEL-PRODUCTO.md` §1 y `06J-FUTURE-MODULES.md` §1 ya excluyeron explícitamente del alcance de MAHP. También introduce datos de un tercero (el cliente final, no un usuario de MAHP) que requieren tratamiento distinto al resto de los datos de la plataforma.

## Decisión

Toda conversación es un activo de negocio: puede vincularse a una campaña (`campaign_id`), alimentar KPIs agregados (`07A-DOMAIN-MODEL.md` §11), y disparar automatizaciones (`09A`/`09B`) — **pero exclusivamente dentro de los límites ya fijados en `MPS-002-000-PRODUCT-CONSTITUTION.md` §6** (CRM ligero, nunca pipeline de ventas completo) y respetando en todo momento el marco de `CCEC-005-PRIVACY-AND-COMPLIANCE.md` para el dato del cliente final.

## Alternativas consideradas

- **Conversación como dato aislado, sin conexión al resto de MAHP**: más simple y con menor riesgo de privacidad, pero elimina la principal ventaja competitiva del módulo (`MEM-002-001` §9: contexto de campaña/KPI nativo) — convertiría a Social AI Hub en una bandeja de mensajería más, sin diferenciación real frente a la competencia.
- **Conexión sin límites explícitos** (dejar que el dato de conversación alimente cualquier sistema que lo necesite en el futuro, sin fijarlo ahora): se descartó — es exactamente el camino hacia construir un CRM completo por acumulación de decisiones pequeñas, sin haber tomado nunca la decisión estratégica explícita que `06J` §1 exige para ese cambio de categoría de producto.

## Consecuencias

**Se gana**: la ventaja competitiva central del módulo queda preservada y con límites que evitan la erosión silenciosa de la identidad de producto; el dato de terceros queda gobernado desde el primer diseño, no como ajuste posterior a un incidente de privacidad.

**Se sacrifica/queda pendiente**: cada nueva conexión entre una conversación y otro sistema de MAHP (§7 de `MPS-002-000`) debe evaluarse explícitamente contra el límite de CRM (§6) antes de construirse — no es una decisión que se tome una sola vez en este ADR y quede resuelta para siempre, requiere disciplina continua de revisión en `MPS-002-001` y cualquier especificación funcional posterior. El diseño exacto del mecanismo de eliminación a solicitud del cliente final (`CCEC-005` §3, principio 5) sigue sin resolverse — este ADR fija el principio, no el mecanismo.

## Referencias

`MPS-002-000-PRODUCT-CONSTITUTION.md` §6/§7/§8, `MEM-002-001-SOCIAL-AI-HUB-VISION.md` §9, `CCEC-005-PRIVACY-AND-COMPLIANCE.md`, `01-IDENTIDAD-DEL-PRODUCTO.md` §1, `06J-FUTURE-MODULES.md` §1, `07A-DOMAIN-MODEL.md` §11.
