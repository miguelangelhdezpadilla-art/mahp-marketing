# ADR-010 — Meta Graph API es el primer canal de Social AI Hub; el núcleo del módulo es channel-agnostic

Estado: Aceptado
Fecha: 2026-07-12
Decisores: Chief Product Owner

## Contexto

Social AI Hub (`MEM-002-001`) necesita un primer canal real para el MVP, pero el módulo aspira a soportar WhatsApp Business Platform, TikTok, Telegram, Google Business Messages, email y web chat en el futuro (`MPS-002-000` §1). Diseñar el núcleo del módulo asumiendo implícitamente "Meta" en su modelo de datos arriesgaría tener que rediseñarlo por completo al agregar el segundo canal.

## Decisión

Meta Graph API (Facebook Pages, Instagram Business, Messenger) es el único proveedor del alcance de MVP — decisión ya tomada en `MEM-002-001` §11 tras revisión explícita del usuario. El núcleo del módulo (modelo de conversación, mensaje, contacto, asignación) se diseña **channel-agnostic**: no conoce el concepto "Meta", conoce "conversación" y "mensaje" en abstracto. Cada canal, incluido Meta, es un adaptador que traduce hacia ese núcleo — mismo patrón de adaptador aislado por proveedor ya validado en toda la plataforma de integraciones (`08-ENTERPRISE-INTEGRATION-PLATFORM.md` §2, `ADR-008`).

## Alternativas consideradas

- **Diseñar el modelo de datos específicamente para Meta y generalizar después**: más rápido de construir el MVP, pero repite el error que este ADR existe para prevenir — MAHP ya tiene precedente de rediseños evitables cuando se documenta la decisión correcta desde el principio (`ADR-004`, versionado de esquema, existe precisamente por la disciplina de no improvisar sobre la marcha).
- **Soportar dos canales desde el MVP** (Meta + WhatsApp) para validar el modelo channel-agnostic de inmediato: se descartó — contradice el criterio de MVP mínimo ya aprobado explícitamente por el usuario en `MEM-002-001`, y añade una segunda aprobación de proveedor (WhatsApp Business API) al camino crítico del primer lanzamiento sin necesidad.

## Consecuencias

**Se gana**: la promesa central del módulo (`MPS-002-000` §1: "sin rediseñar el módulo" al agregar canales) queda protegida por diseño, no por buena voluntad al momento de construir; reutiliza un patrón arquitectónico ya probado en la plataforma (adaptador aislado), sin inventar uno nuevo.

**Se sacrifica/queda pendiente**: el riesgo real de este ADR es que el modelo channel-agnostic se diseñe mal y solo se descubra al construir el segundo canal — mitigado explícitamente en `MPS-002-000` §10 (riesgo 1): el modelo de datos debe validarse contra un canal hipotético distinto de Meta (ej. WhatsApp) antes de darse por bueno en `MPS-002-001`, no confiarse en que "se ve bien" solo con Meta en mente. Dependencia externa no controlada por MAHP: el proceso de revisión de la app ante Meta for Developers (permisos avanzados de Graph API) puede tardar y no está garantizado, riesgo elevado a crítico en `MEM-002-001` §12 precisamente por ser el único proveedor del MVP.

## Referencias

`MEM-002-001-SOCIAL-AI-HUB-VISION.md` §11/§12, `MPS-002-000-PRODUCT-CONSTITUTION.md` §1/§4 (principio 1)/§10, `08-ENTERPRISE-INTEGRATION-PLATFORM.md` §2, `ADR-008`, `ADR-009`.
