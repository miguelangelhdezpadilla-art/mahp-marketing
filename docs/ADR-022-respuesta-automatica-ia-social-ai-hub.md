# ADR-022 — Respuesta automática de IA en Social AI Hub, como excepción acotada a Human in the Loop

Estado: Aceptado
Fecha: 2026-11-15
Decisores: Product Owner

## Contexto

En MAHP, "Human in the Loop" es una regla absoluta: ninguna acción de IA envía, publica ni modifica datos reales sin que una persona la confirme. Está escrita en `PROJECT-BLUEPRINT.md` §5 principio 3, `05C-AI-GOVERNANCE.md` §6, `MPS-002-000` §4 principio 3 (que pone como ejemplo justamente "enviar un mensaje real") y en las consecuencias de `ADR-009`.

`MPS-002-003` pide un **MODO 3 — IA automática**: la IA contesta directamente a los clientes en Messenger e Instagram usando la base de conocimientos de la empresa. Con la regla actual, eso no se puede construir. El caso de negocio es real: un restaurante recibe preguntas repetitivas (horario, ubicación, precios, promociones) fuera de horario o en horas pico, cuando nadie puede contestar a tiempo. Además, la ventana de 24 h de Meta castiga la demora: pasado ese plazo, ya no se puede responder con un mensaje normal.

Los modos 1 (manual) y 2 (asistido) cumplen la regla actual y no necesitan este ADR.

## Decisión

Dentro de **Social AI Hub**, y **solo para contestar mensajes que un cliente envió primero**, la IA puede enviar respuestas sin aprobación humana previa en cada mensaje. La condición es que la empresa lo haya activado de forma explícita y que se cumplan **todas** las salvaguardas de abajo. Cada salvaguarda se aplica en el backend (Edge Function, RLS o restricciones de la base de datos), nunca solo en el cliente ni solo en el prompt.

La aprobación humana deja de ser **por mensaje**: pasa a ser **por política**. Una persona con autoridad decide qué sabe la IA (conocimiento publicado), qué puede contestar (temas permitidos), cuándo (horario) y que el modo está encendido. Esa persona puede apagarlo en cualquier momento.

Fuera de esta excepción, la regla Human in the Loop sigue intacta en todo MAHP. Eso incluye el resto de Social AI Hub: la IA no inicia conversaciones, no envía mensajes promocionales ni de seguimiento, y no hace nada distinto de contestar.

### Salvaguardas obligatorias

**A. Activación**

1. **Apagado por defecto.** `ai_assistants.mode` nace como `'manual'`. Ninguna migración, valor por defecto ni proceso automático lo cambia a `'automatico'`.
2. **Solo un `company_admin` de esa empresa** puede activar el modo automático, y cada activación pide confirmación explícita. El `super_admin` no lo activa en nombre de una empresa: puede apagarlo, no encenderlo.
3. **Requisitos previos, validados en el backend al activar**:
   - una conexión de Meta con `status = 'conectada'`;
   - información general del negocio y horario de atención publicados;
   - mensaje de transferencia a humano configurado;
   - al menos una sesión de "Probar mi asistente" ejecutada después de la última publicación de conocimiento.

   Si falta alguno, la activación se rechaza y se le dice al usuario qué falta.
4. **Despliegue gradual.** No se activa en ninguna empresa real hasta que las Fases 6 y 9 de `MPS-002-003` pasen sus pruebas, empezando por una página de prueba.

**B. Qué puede contestar la IA**

5. **Solo responde; nunca inicia.** Toda respuesta automática está ligada a un mensaje entrante concreto (`ai_responses.trigger_message_id`).
6. **Solo con conocimiento publicado y vigente**: `status = 'publicado'`, sin borrar, dentro de `valid_from` y `valid_until`. El filtro vive en la función de búsqueda, no en el prompt.
7. **Solo informa, no compromete.** La IA **nunca** confirma, por envío automático, reservaciones, pedidos, pagos, cambios, devoluciones, excepciones, descuentos fuera de una promoción publicada, ni nada que requiera verificar un sistema que no puede consultar. En esos casos, escala.
8. **Escalamiento obligatorio** (no envía y transfiere) cuando: no tiene información suficiente, el cliente pide hablar con una persona, hay una queja o un tema delicado, el cliente pide una excepción, el tema está en `escalate_topics` o fuera de `allowed_topics`, o la confianza queda por debajo de `min_confidence`.

**C. Verificación de cada respuesta antes de enviarla**

9. **Validación por código, independiente del modelo.** Toda cifra, precio, porcentaje, hora o fecha que aparezca en la respuesta tiene que estar literalmente en las fuentes recuperadas que la respuesta dice haber usado. Las fuentes citadas tienen que estar entre las recuperadas. Si algo no cuadra, el mensaje se bloquea (`status = 'bloqueada'`, con su motivo) y se escala o queda como propuesta.
10. **Aislamiento estructural.** El modelo no tiene herramientas ni acceso a la base de datos. Recibe solo un contexto ya filtrado por `company_id`, resuelto en el servidor desde la página de Meta, nunca desde el mensaje ni desde el modelo.
11. **Separación de instrucciones.** Las reglas del sistema viven en código versionado. Las instrucciones de la empresa son preferencias de estilo con menor prioridad, y el conocimiento y el mensaje del cliente se tratan como datos (`MPS-002-003` §6.4).

**D. Canal (Meta)**

12. **Solo dentro de la ventana estándar de 24 h** desde el último mensaje del cliente, con `messaging_type: RESPONSE`. **Nunca** con `HUMAN_AGENT` ni con otra etiqueta de mensaje. Fuera de las 24 h la IA no envía nada: queda como propuesta para que una persona la revise.
13. **No envía si la conexión no está autorizada**: el estado tiene que ser `conectada` y el permiso del canal tiene que estar concedido.
14. **Anti-bucle y anti-ráfaga.** Se ignoran los eventos de eco de la propia página. Si el cliente manda varios mensajes seguidos, se contesta una sola vez. Hay un tope de respuestas automáticas por conversación en un periodo (el valor se fija en la Fase 8), y al llegar al tope se escala.

**E. Control humano en todo momento**

15. **Pausa de emergencia por empresa** (`ai_assistants.auto_paused_at`). Pueden pausar el `company_admin` y el `director`; reanudar es solo del `company_admin`. Se vuelve a leer **justo antes de cada envío a Meta**, así que detiene incluso respuestas ya generadas o en cola.
16. **Pausa por conversación** (`conversations.ai_paused`) y **bloqueo por transferencia**: mientras haya un escalamiento abierto, la IA no envía en esa conversación.
17. **Interruptor global de plataforma** (secreto de Edge Function, operado por quien administra MAHP) que apaga el envío automático en todas las empresas sin desplegar código. Sirve para incidentes con el proveedor de IA o con Meta.
18. **Cambio de modo inmediato.** Pasar a `manual` o `asistido` cancela los trabajos automáticos pendientes de esa empresa.

**F. Transparencia y trazabilidad**

19. **Sin autoidentificación obligatoria, pero sin hacerse pasar por persona.** *(Revisada por el Product Owner el 2026-11-15: se eliminó la presentación obligatoria como asistente virtual.)*
    - **Por defecto la IA no se presenta como asistente virtual.** Responde con el nombre y el tono que configure la empresa.
    - **Si el cliente pregunta directamente si habla con una persona o con un bot, la IA no afirma ser humana.** Transfiere la conversación a un colaborador (motivo `pide_humano`) o contesta con honestidad, según lo configure la empresa. Las instrucciones de la empresa no pueden cambiar esto.
    - **La identificación queda disponible como opción por empresa** (`ai_assistants.disclose_ai`, apagada por defecto). La política oficial de Messenger e Instagram de Meta exige avisar que se trata de un servicio automatizado donde la ley local lo pida, y menciona en especial a usuarios de California y Alemania. Si una empresa atiende clientes en jurisdicciones así, debe encenderla. La revisión legal decide si aplica a cada empresa (ver *Consecuencias*).
    - En MAHP, todo mensaje enviado por IA queda marcado `sender_type = 'ia'` y ligado a su fila de `ai_responses`, para que el equipo siempre sepa qué contestó la IA.
20. **Registro completo.** Cada respuesta generada (enviada, bloqueada, escalada o fallida) queda en `ai_responses` con sus fuentes, versión del conocimiento, modelo, tokens, decisión y motivo (`ADR-014`). La activación, la pausa, la reanudación y cada envío automático quedan además en `audit_log`.
21. **Revisión posterior.** La bandeja permite filtrar las conversaciones atendidas por la IA, y las analíticas muestran tasa de escalamiento y de bloqueos, para que la empresa audite lo que se envió en su nombre.

## Alternativas consideradas

- **No construir el modo automático (solo manual y asistido).** Es lo más seguro, pero deja sin resolver el caso de negocio: respuestas fuera de horario y dentro de la ventana de 24 h. Se descarta. Los modos asistido y manual siguen disponibles y el asistido sigue siendo el recomendado.
- **Reemplazar Human in the Loop en todo MAHP.** Es innecesario y riesgoso: el resto de los agentes (calendario, analítica, Community Manager Advisor) no tiene un caso equivalente, y abriría la puerta a que la IA publique o modifique datos de negocio. Se descarta y la excepción se limita a responder mensajes.
- **Automático solo con respuestas predefinidas (plantillas o FAQ exactas, sin modelo generativo).** Es más predecible, pero no entiende contexto ("¿y si pido cinco?") ni variaciones de la pregunta, y no cumple el requerimiento. Queda como **degradación** posible: si la validación de una respuesta generada falla y hay una FAQ publicada que coincide, se puede enviar el texto literal de esa FAQ.
- **Aprobación por muestreo** (la IA envía y una persona revisa una parte después). No sustituye las salvaguardas previas al envío. Se adopta solo como complemento (salvaguarda 21), no como control principal.

## Consecuencias

**Se gana**: las empresas pueden atender preguntas frecuentes al instante y fuera de horario, dentro de la ventana de Meta, con un sistema cuya conducta controlan ellas (conocimiento, temas, horario, pausa). La regla de no inventar información pasa a aplicarse por código y no solo por instrucción al modelo.

**Se sacrifica / queda pendiente**:
- Un mensaje automático puede salir con un error que no sea una cifra (por ejemplo, un matiz mal interpretado). La validación reduce ese riesgo, pero no lo elimina. Mitigaciones: escalamiento conservador, umbral de confianza y revisión posterior.
- Hay más superficie de auditoría y de pruebas: cada salvaguarda necesita su prueba en las Fases 6, 8 y 9 de `MPS-002-003`, y el modo automático no se habilita sin ellas.
- Al no presentarse como asistente virtual por defecto, la empresa asume la responsabilidad de encender `disclose_ai` donde la ley o la política de Meta lo exijan. Si no lo hace, hay riesgo de sanción por parte de Meta o de la autoridad local. MAHP debe mostrar ese aviso al activar el modo automático.
- Esta decisión no cubre requisitos legales de cada país sobre bots y datos personales. `privacidad.html` y los términos con cada empresa deben reflejar las respuestas automáticas y el envío de mensajes a un proveedor de IA. La revisión legal ya pendiente (`docs/legal/`) debe incluir esto.
- Las políticas de mensajería de Meta (ventana de 24 h, etiquetas) se verifican contra la documentación oficial en la Fase 11. Si Meta exige algo más estricto, prevalece Meta.
- Requiere las piezas de datos de `MPS-002-003` §5 (`ai_assistants`, `ai_responses`, `ai_human_handoffs`, `ai_jobs`, columnas nuevas en `conversations`) y corregir antes los hallazgos H1 a H4 de ese documento.

## Relación con otros documentos

- **Acota** (no reemplaza) `MPS-002-000` §4 principio 3 y la sección *Consecuencias* de `ADR-009`, solo para la respuesta automática de Social AI Hub definida aquí. La decisión principal de `ADR-009` (Social AI Hub como módulo nativo) sigue vigente sin cambios.
- **No modifica** `PROJECT-BLUEPRINT.md` §5 principio 3 ni `05C-AI-GOVERNANCE.md` §6 para ningún otro agente o módulo.

## Referencias

`MPS-002-003-AI-CUSTOMER-SERVICE-KNOWLEDGE-CENTER.md` (§5 modelo de datos, §6 motor, §8 D1), `MPS-002-000-PRODUCT-CONSTITUTION.md` §4, `ADR-007`, `ADR-009`, `ADR-014`, `ADR-019`, `05C-AI-GOVERNANCE.md` §6, `supabase/functions/meta-send-message/index.ts` (uso actual de `HUMAN_AGENT`, hallazgo H4).
