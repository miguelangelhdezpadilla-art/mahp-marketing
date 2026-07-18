# ADR-017 — Unified Customer Identity Model: un cliente, múltiples identidades digitales

Estado: Aceptado
Fecha: 2026-07-12
Decisores: Chief Product Owner

## Contexto

`MPS-002-002-FUNCTIONAL-SPECIFICATION.md` (CU-06, y heredado de la decisión pendiente #1 de `MPS-002-001` §14) dejó explícitamente sin resolver si un mismo cliente escribiendo desde Instagram y desde Facebook debía tratarse como uno o dos contactos dentro del CRM ligero (`MPS-002-000` §6).

## Decisión

Un cliente es una **entidad única** dentro de MAHP. Puede estar asociado a **múltiples identidades digitales** provenientes de distintos canales (Instagram, Facebook, Messenger, y en el futuro WhatsApp, correo, TikTok — `MPS-002-000` §1). La entidad principal es el Cliente; cada cuenta/canal es una identidad vinculada a él. Nunca se duplica un cliente por tener más de una identidad — el modelo cliente-identidad es el estándar ya usado por plataformas de CRM maduras para este mismo problema.

## Alternativas consideradas

- **Un contacto por canal** (más simple de implementar: cada identidad de Meta genera su propio registro): se descartó — fragmenta el historial de conversación de la misma persona, contradice directamente el principio "Context Aware" (`MPS-002-001` §3, principio 4) y elimina el valor central del Perfil Unificado del Cliente (`MPS-002-002` §2.5).
- **Fusión manual únicamente** (cada identidad se crea por separado, un humano las fusiona si detecta que son la misma persona): se descartó como mecanismo *primario* — deja la fragmentación como comportamiento por defecto en vez de excepcional; queda como mecanismo de respaldo cuando el sistema no pueda vincular automáticamente dos identidades a un mismo cliente (ver Consecuencias).

## Consecuencias

**Se gana**: el Perfil Unificado del Cliente (`MPS-002-002` §2.5) refleja de verdad "todo lo que MAHP sabe de un contacto", sin importar por qué canal escribió cada vez; la conversión de conversación a lead/venta (CU-04) se atribuye al cliente real, no a una identidad parcial.

**Se sacrifica/queda pendiente**: este ADR fija el principio, no el mecanismo técnico de vinculación — cómo se detecta automáticamente que una identidad nueva de Instagram corresponde a un cliente que ya existía por Facebook (¿mismo nombre?, ¿el cliente lo confirma?, ¿fusión manual como respaldo cuando el sistema no está seguro?) es una decisión de modelo de datos que corresponde a `MPS-002-003`/diseño técnico, no a esta especificación funcional. El límite de CRM ligero (`ADR-020`) sigue aplicando sin excepción: la identidad es "cliente + sus identidades de canal", nunca una ficha comercial extendida.

## Referencias

`MPS-002-002-FUNCTIONAL-SPECIFICATION.md` §2.4, §2.5, CU-06; `MPS-002-001-CONVERSATION-INTELLIGENCE-ENGINE.md` §14 (decisión pendiente #1, resuelta por este ADR); `MPS-002-000-PRODUCT-CONSTITUTION.md` §6; `ADR-020`.
