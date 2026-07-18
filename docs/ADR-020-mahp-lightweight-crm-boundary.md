# ADR-020 — MAHP Lightweight CRM Boundary: límite funcional permanente del CRM ligero

Estado: Aceptado
Fecha: 2026-07-12
Decisores: Chief Product Owner

## Contexto

El límite "MAHP no es un CRM" se ha reforzado, cada vez dentro de otro documento y nunca como su propia decisión permanente, en al menos cuatro lugares: `01-IDENTIDAD-DEL-PRODUCTO.md` §1 (identidad original del producto), `06J-FUTURE-MODULES.md` §1 (CRM catalogado explícitamente fuera de alcance), `MPS-002-000-PRODUCT-CONSTITUTION.md` §6 (límite frente a Social AI Hub específicamente) y `MPS-002-002-FUNCTIONAL-SPECIFICATION.md` (verificado módulo por módulo en los 15 módulos funcionales, particularmente 2.4/2.5/2.10). El Product Owner identificó que este principio, por su importancia para proteger el alcance del producto a largo plazo, merece ser una decisión arquitectónica permanente por derecho propio, no solo una regla repetida dentro de otros documentos.

## Decisión

MAHP incluye una capacidad de **CRM ligero** — suficiente para ejecutar sus propios procesos (identificar un contacto, mantener su historial de conversación vía Social AI Hub, aplicar etiquetas básicas, vincular a campañas) — pero **explícitamente no reemplaza** Salesforce, HubSpot, Microsoft Dynamics, ni ninguna plataforma de CRM dedicada. Solo almacena la información estrictamente necesaria para los procesos propios de marketing/comunicación de MAHP. Este límite es **permanente** — no se erosiona por acumulación de decisiones pequeñas (agregar "solo un campo más" en un módulo futuro) — y solo puede levantarse mediante una decisión estratégica explícita y documentada de expandir la categoría completa del producto, con el mismo umbral ya fijado en `06J-FUTURE-MODULES.md` §1: "una decisión estratégica de expandir la categoría de producto completo, no una simple adición de módulo".

## Alternativas consideradas

- **Dejar que el CRM ligero crezca orgánicamente, feature por feature, según lo pida cada cliente**: se descartó explícitamente — es exactamente el riesgo de "erosión silenciosa de la identidad de producto" ya señalado en `ADR-012` como motivo para fijar límites por adelantado en vez de decidir caso por caso bajo presión comercial.
- **Construir un CRM completo ahora**, dado que ya existe demanda de funcionalidad de cliente (leads, historial, etiquetas): se descartó — contradice directamente `01-IDENTIDAD-DEL-PRODUCTO.md` §1 y requeriría el mismo proceso de decisión estratégica que este ADR exige para el futuro, no una decisión tomada de paso al especificar un módulo de comunicación.

## Consecuencias

**Se gana**: un criterio de decisión permanente y citable para cualquier solicitud futura de funcionalidad de cliente — "¿esto es CRM ligero (ejecuta un proceso propio de MAHP) o es CRM completo (gestión de relación comercial por sí misma)? Si es lo segundo, requiere su propia decisión estratégica, no se agrega aquí." Protege a Social AI Hub y a cualquier módulo futuro de convertirse, sin decisión consciente, en un producto distinto al que MAHP declaró ser.

**Se sacrifica/queda pendiente**: este ADR **supersede y absorbe** la propuesta más estrecha señalada en el Enterprise Architecture Review de `MPS-002-002` §13 ("ADR-017 propuesto: catálogo cerrado de campos de CRM ligero") — ese catálogo exacto de campos permitidos sigue sin definirse formalmente; es un detalle de implementación que se resuelve en `MPS-002-003`/diseño de datos, ahora bajo el principio más amplio que este ADR ya fija. Puede generar fricción comercial real: un cliente que pida una funcionalidad tipo CRM completo recibirá un "no" de producto, no un "sí" técnico — tradeoff aceptado conscientemente, no un descuido.

## Referencias

`01-IDENTIDAD-DEL-PRODUCTO.md` §1, `06J-FUTURE-MODULES.md` §1, `MPS-002-000-PRODUCT-CONSTITUTION.md` §6, `MPS-002-002-FUNCTIONAL-SPECIFICATION.md` (15 módulos, límite verificado), `ADR-012`, `ADR-017`.
