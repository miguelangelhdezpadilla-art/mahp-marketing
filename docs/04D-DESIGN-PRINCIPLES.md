# DESIGN PRINCIPLES — Marketing Activity Hub Pro

> MDS-005, Documento 5 de 5. Principios oficiales de diseño — la prueba
> rápida contra la que se evalúa cualquier decisión visual o de interacción
> antes de construirla. Deriva de `01-IDENTIDAD-DEL-PRODUCTO.md` (identidad
> del producto) y se apoya en `04-DESIGN-SYSTEM.md`/`04C-UX-GUIDELINES.md`
> para el detalle de implementación de cada uno.
>
> Última actualización: 2026-07-09.

---

## Los Principios

1. **La simplicidad comunica inteligencia.** Una pantalla que se explica sola transmite más competencia que una con más funciones visibles a la vez. MAHP nunca añade un control solo porque técnicamente es posible.

2. **Los datos importantes siempre destacan.** Un número de negocio (KPI, cumplimiento, avance) es siempre el elemento visualmente más prominente de su contenedor — nunca compite en jerarquía con un título decorativo o un ícono.

3. **La IA debe asistir sin distraer.** Ninguna sugerencia de IA se impone sobre el flujo del usuario — aparece cuando se pide, se marca claramente como propuesta mientras lo es, y desaparece de esa condición en cuanto el usuario decide (`04C-UX-GUIDELINES.md` §14).

4. **Una pantalla debe responder una pregunta principal.** Si una pantalla intenta responder dos preguntas no relacionadas, es candidata a dividirse en dos pestañas — nunca se resuelve agregando más densidad a la misma vista.

5. **Cada clic debe aportar valor.** Ningún paso intermedio existe solo por convención — si un flujo tiene un paso que no cambia el resultado ni da información nueva, se elimina.

6. **La consistencia genera confianza.** El mismo componente se ve y se comporta igual sin importar en qué rol o página aparece — un botón primario es reconocible como tal en `admin.html` igual que en la landing pública, aunque el contexto visual general sea distinto.

7. **El color siempre significa algo.** Verde/ámbar/rojo/azul son semáforo, nunca decoración — un color mal usado rompe la confianza que el sistema construyó al usarlo bien en todos los demás lugares.

8. **Lo irreversible se siente irreversible.** Cualquier acción que destruye o revoca algo de forma permanente requiere una confirmación explícita, proporcional al riesgo real (`04C-UX-GUIDELINES.md` §9) — nunca al mismo nivel de fricción que guardar un cambio reversible.

9. **El sistema habla el idioma del usuario, no el de la base de datos.** Ningún término técnico (RLS, trigger, `company_id`) aparece jamás en una pantalla — vive exclusivamente en `/docs`.

10. **Lo que no existe no se simula.** Un estado vacío se ve como estado vacío; un dato que no se puede calcular todavía se dice explícitamente ("—" o "Sin datos"), nunca se inventa un cero o un placeholder que parezca un valor real.

11. **La velocidad percibida es tan real como la velocidad medida.** Un skeleton con la forma correcta que carga en 400ms se siente más rápido que un spinner genérico que carga en 250ms — se diseña para la percepción, no solo para el milisegundo.

12. **Cada rol ve exactamente lo que necesita, ni más ni menos.** No hay una sola pantalla universal con partes ocultas por permiso — cada rol tiene su propia experiencia, aunque comparta componentes con las demás (`01-IDENTIDAD-DEL-PRODUCTO.md` §6).

13. **La accesibilidad no es una fase posterior.** Un componente nuevo se diseña con teclado, lector de pantalla y contraste en mente desde el boceto — no se audita "después" (`04-DESIGN-SYSTEM.md` §17).

14. **La elegancia es funcional, no decorativa.** Una animación, una sombra o un degradado existen porque comunican algo (jerarquía, estado, dirección de atención) — nunca porque "se ve bien" sin razón.

15. **El sistema de diseño evoluciona con el producto, nunca al revés.** Ningún componente nuevo se fuerza a encajar en un token viejo que ya no describe la necesidad real — se actualiza el sistema, documentado, antes de romper la consistencia con un caso especial silencioso.

---

## Sistema Visual: Evolución sin Perder Consistencia

**Cómo evoluciona el diseño en los próximos años sin fragmentarse**, alineado con el roadmap arquitectónico (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §17):

- **V1–V2** (consolidación, tiempo real): ningún cambio visual estructural — se cierran las brechas de accesibilidad ya identificadas (foco de modal, `aria-*` de tabs/notificaciones) y se formaliza la escala de espaciado (`04A-DESIGN-TOKENS.md` §3) componente por componente.
- **V3** (multi-tenancy comercial): la pantalla de Planes/Facturación nueva se construye **exclusivamente** con componentes de `04B-COMPONENT-LIBRARY.md` ya existentes (Cards, Badges, Botones) — ninguna pieza visual nueva se introduce solo para esa función si algo ya cubre la necesidad.
- **V5** (integraciones, IA expandida): los nuevos especialistas de IA (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §11) reutilizan el patrón visual ya establecido para IA (spinner con mensaje contextual, resultado marcado como propuesta, §14 de este documento) — no se inventa un lenguaje visual de IA distinto por especialista.
- **V10** (plataforma distribuida, posible app móvil nativa): si se construye una app móvil nativa, **los tokens de `04A-DESIGN-TOKENS.md` son la fuente de verdad compartida** (colores, tipografía, espaciado) aunque la implementación de componentes sea nativa y no HTML/CSS — la identidad visual no se reinventa por plataforma.

**Regla de oro para incorporar módulos nuevos sin perder identidad**: todo módulo nuevo pasa primero por `04B-COMPONENT-LIBRARY.md` — si el componente que necesita ya existe, se usa tal cual; si existe algo parecido, se extiende (nueva variante, no un componente paralelo); solo si genuinamente no hay nada parecido se documenta un componente nuevo aquí antes de construirlo, siguiendo el mismo flujo que cualquier otro cambio de arquitectura (`03-ENGINEERING-STANDARDS.md` §2).
