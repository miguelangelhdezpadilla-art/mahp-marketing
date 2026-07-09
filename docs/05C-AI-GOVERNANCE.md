# AI GOVERNANCE — Políticas Oficiales de Uso de IA en MAHP

> MDS-006, Documento 4 de 6. Gobernanza aplicable a **todo agente presente
> y futuro** del ecosistema (`05A-AI-AGENTS.md`), incluido el único ya
> construido (Calendar Planner). No reemplaza `CLAUDE.md`/`03-ENGINEERING-STANDARDS.md`
> §16-17 — los extiende específicamente al uso de modelos de IA como
> capacidad de producto, no solo como herramienta de desarrollo.
>
> Última actualización: 2026-07-09.

---

## 1. Principios Éticos

1. **Potenciar, nunca reemplazar el criterio humano** — principio fundacional (`01-IDENTIDAD-DEL-PRODUCTO.md` §7, principio 3), no negociable por ningún agente del catálogo.
2. **Ningún agente decide en nombre del negocio del cliente** — todos sugieren; la decisión de publicar, gastar, o cambiar de estrategia es siempre humana.
3. **Sin sesgos comerciales ocultos** — un agente nunca recomienda un canal, proveedor o integración porque beneficie comercialmente a MAHP sin que el usuario lo sepa explícitamente.
4. **Honestidad sobre las limitaciones** — cada agente en `05A-AI-AGENTS.md` documenta explícitamente lo que NO puede hacer; esa sección no es opcional ni se omite al presentar el agente al usuario.

## 2. Privacidad

- **Aislamiento multiempresa aplica a la IA exactamente igual que al resto del sistema** (`05-AI-ECOSYSTEM.md` §5): ningún agente recibe, procesa, ni "recuerda" (`05E-AI-MEMORY-AND-CONTEXT.md`) datos de una empresa en el contexto de otra.
- Ningún dato personal identificable se envía a un proveedor de IA externo más allá de lo estrictamente necesario para la tarea (ej. el nombre de un colaborador en un resumen de desempeño es necesario; su correo no lo es y no se incluye en el prompt).
- Los datos que salen hacia un proveedor de IA externo (Groq hoy, otros en el futuro — `02-ARCHITECTURE` §11) están sujetos a la política de privacidad de ese proveedor — este documento no puede garantizar cómo un tercero procesa esos datos, solo puede minimizar qué se le envía.

## 3. Seguridad

- Todo agente sigue el patrón de seguridad ya establecido para Edge Functions (`API.md` §4, `03-ENGINEERING-STANDARDS.md` §9): validar sesión antes de ejecutar, secretos nunca en cliente, contrato de error consistente.
- Ningún agente tiene permiso de escritura directa sobre la base de datos más allá de lo que el rol del usuario que lo invoca ya tendría por sí mismo — un agente no es una vía para saltarse RLS.
- Rate limiting por usuario/empresa es **obligatorio antes de activar cualquier agente nuevo del catálogo de 24** (brecha ya señalada como urgente en `IA.md` §5 y `05-AI-ECOSYSTEM.md` §10) — no se expande el ecosistema sin cerrar esto primero.

## 4. Transparencia

- Todo contenido generado por IA se marca visualmente como tal mientras es una propuesta (`04C-UX-GUIDELINES.md` §14) — nunca se mezcla con datos ya confirmados de forma indistinguible.
- El usuario siempre puede saber qué agente generó qué — no hay una "caja negra" de IA genérica sin atribución a un agente específico y su propósito documentado.

## 5. Explicabilidad

- Todo agente que hace una recomendación explica el **porqué** en lenguaje humano, no solo el qué (`05-AI-ECOSYSTEM.md` §1) — ej. KPI Advisor no solo dice "atrasado", explica la causa probable.
- Ningún agente presenta una correlación como una certeza absoluta — el lenguaje usado distingue entre "esto sugiere que..." y una afirmación de hecho, especialmente en agentes analíticos (Business Analyst, Data Analyst, Customer Experience Advisor).

## 6. Control Humano

- Ningún agente publica, envía, gasta, o modifica un dato real de negocio sin confirmación explícita de una persona — regla absoluta de los 24 agentes, sin excepción, incluidos los de solo-análisis (que de por sí no escriben nada, pero tampoco se asume que su lectura es la última palabra).
- El usuario siempre puede ignorar, descartar, o pedir una alternativa a cualquier sugerencia de IA sin fricción — nunca un flujo donde aceptar la sugerencia de IA sea más fácil que rechazarla.

## 7. Auditoría

- Toda invocación de agente se registra (`05-AI-ECOSYSTEM.md` §11 — observabilidad): qué agente, qué empresa, qué usuario, éxito/error, costo aproximado.
- Este registro es la extensión natural de `audit_log` (`DATABASE.md` §7) al dominio de IA — mismo criterio de "quién hizo qué, cuándo", aplicado también a "qué le pidió a la IA".

## 8. Registro de Decisiones

- Cuando la salida de un agente se convierte en un dato real (ej. una actividad generada por Calendar Planner que se publica), el registro debe permitir rastrear que ese dato se originó en IA — no se pierde la trazabilidad de origen humano vs. IA una vez publicado.
- Aplicación práctica hoy: las actividades generadas por Calendar Planner no tienen hoy una marca explícita en `actividades` de que vinieron de IA (brecha real, candidata a una columna `generated_by_ai boolean` o `source` en una futura migración — no implementada en este documento, solo señalada).

## 9. Protección de Datos

- Los mismos estándares de seguridad de datos del resto del sistema aplican sin excepción (`03-ENGINEERING-STANDARDS.md` §16): sin secretos expuestos, sin logs de datos sensibles, RLS como frontera real.
- Ningún agente almacena una copia propia de los datos de una empresa fuera de la base de datos de MAHP — el contexto que recibe es transitorio para esa invocación (ver `05E-AI-MEMORY-AND-CONTEXT.md` para memoria persistente futura, sujeta a las mismas reglas de aislamiento).

## 10. Uso Responsable

- Un agente no se activa para una empresa/usuario más allá de los permisos definidos en su perfil (`05A-AI-AGENTS.md`, campo "Permisos" de cada uno) — verificado en la Edge Function correspondiente, no solo ocultado en la interfaz.
- El costo de cada agente es visible/controlable (§3, rate limiting) — ninguna empresa cliente debe sorprenderse por un costo de IA que no pudo anticipar o limitar.

## 11. Cumplimiento Normativo

- **No se ha realizado una evaluación legal formal de cumplimiento normativo** (ej. GDPR si se expande a mercados europeos, leyes de protección de datos locales de cada país de Latinoamérica donde opere un cliente) — se señala aquí como pendiente explícito, no como resuelto.
- Recomendación: antes de escalar el ecosistema de IA a mercados con regulación estricta de IA (ej. EU AI Act si aplicara por tipo de uso), revisar con asesoría legal específica — este documento cubre gobernanza de producto, no es una opinión legal.
- Principio de diseño ya aplicado que ayuda a cualquier cumplimiento futuro: minimización de datos enviados a terceros (§2) y trazabilidad de decisiones (§8) son controles que la mayoría de marcos regulatorios de IA ya exigen — MAHP parte de una base razonable, no de cero.
