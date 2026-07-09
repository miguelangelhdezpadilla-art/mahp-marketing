# UX GUIDELINES — Marketing Activity Hub Pro

> MDS-005, Documento 4 de 5. Guías de experiencia de usuario: flujos,
> jerarquía, carga cognitiva, y la experiencia diferenciada por rol.
> Complementa `04-DESIGN-SYSTEM.md` (principios visuales) con el
> **comportamiento** esperado del sistema frente al usuario.
>
> Última actualización: 2026-07-09.

---

## 1. Flujos de Navegación

Todo flujo de MAHP sigue el patrón **entrar → orientarse → actuar → confirmar**, nunca más de 2 niveles de profundidad antes de llegar a una acción (página → pestaña → acción — nunca página → pestaña → sub-pestaña → acción). El flujo más corto del sistema (colaborador reportando avance: abrir app → ver tarea → deslizar avance → guardar) es el estándar de referencia — cualquier flujo nuevo se mide contra esa brevedad.

## 2. Jerarquía Visual

Orden de lectura esperado en toda pantalla: **identidad de marca (topbar) → estado global (resumen ejecutivo, si aplica) → acción principal disponible → detalle/lista**. El elemento tipográficamente más grande de cualquier vista es siempre un número o dato de negocio (KPI, cumplimiento), nunca un título decorativo — refuerza el principio "los datos importantes siempre destacan" (`04D-DESIGN-PRINCIPLES.md`).

## 3. Carga Cognitiva

Máximo de opciones simultáneas visibles antes de agrupar: **~7 acciones por pantalla** (regla heurística estándar de UX, ya respetada implícitamente por el sistema de pestañas). Ningún formulario nuevo debe pedir más de lo estrictamente necesario para completar la acción — el formulario de generación de IA (`ia.js`) es el ejemplo de referencia: 5 campos, todos con valor por defecto razonable salvo el que realmente requiere decisión humana (canales).

## 4. Experiencia Móvil

Estándar ya definido en `04-DESIGN-SYSTEM.md` §5 — mobile-first obligatorio para cualquier pantalla de `collaborator`. Objetivo táctil mínimo 44×44px (`04B-COMPONENT-LIBRARY.md` §1). El bottom-nav (no un menú hamburguesa) es el patrón de navegación móvil del sistema — no se introduce un segundo patrón de navegación móvil sin deprecar el primero.

## 5. Experiencia de Escritorio

Los roles `company_admin`/`director`/`super_admin` operan predominantemente desde escritorio (paneles con más densidad de información — tablas, calendario completo). El sistema no oculta funcionalidad en escritorio "porque ya está en móvil" — ambos son first-class, pero la densidad de información permitida es mayor en escritorio.

## 6. Onboarding — **[FUTURO, brecha real]**

No existe un flujo de onboarding hoy — un usuario nuevo llega a `login.html`, crea cuenta, y depende de que alguien ya lo haya invitado con el rol correcto para tener contenido que ver. **Riesgo de UX real para el crecimiento del producto** (`01-IDENTIDAD-DEL-PRODUCTO.md` §9, mercados futuros): una empresa nueva dándose de alta sin guía perderá el primer momento de valor. Diseño propuesto para cuando se priorice: tras el primer login de un `company_admin` recién invitado, un checklist breve ("crea tu primera campaña", "invita a tu equipo", "prueba generar un calendario con IA") en vez de una pantalla vacía.

## 7. Estados Vacíos

Ya estándar en el sistema (`.empty-state`, ícono + mensaje) — regla reforzada aquí: todo estado vacío nuevo debe, además de informar, sugerir la siguiente acción posible cuando exista una (`04-DESIGN-SYSTEM.md` §2, principio 3). "Sin campañas todavía" es insuficiente por sí solo; "Sin campañas todavía — crea la primera arriba ↑" es el estándar.

## 8. Errores

Mensaje humano siempre, nunca la traza técnica cruda (`03-ENGINEERING-STANDARDS.md` §16). Estructura estándar: qué pasó + (si aplica) qué puede hacer el usuario al respecto. Ya el patrón consistente en todo el sistema (`'Error al eliminar: ' + error.message` — nota: el mensaje de Supabase se concatena porque ya es razonablemente humano, no un código; si algún día un mensaje de error deja de serlo, no se muestra crudo).

## 9. Confirmaciones

Proporcional al riesgo (`04-DESIGN-SYSTEM.md` §2, principio 5): acción reversible → sin confirmación (editar texto); acción de alto impacto o irreversible → modal de confirmación explícito (`showConfirm`, ya estándar); acción de máximo riesgo (autorizar edición de un avance ya reportado) → confirmación reforzada con credenciales, no solo un "¿estás seguro?" (`modal-autorizacion`, ya construido).

## 10. Mensajes

Español simple, sin jerga técnica, en segunda persona informal ("tú"), consistente en todo el sistema (`UI-UX.md` §5). Nunca un mensaje de sistema suena distinto entre `empresa.html` y `colaborador.html` — mismo tono, ajustado solo en qué tan técnico es el contexto (el colaborador nunca ve un mensaje que mencione "políticas RLS" o "trigger").

## 11. Notificaciones

Ver `04B-COMPONENT-LIBRARY.md` §13 para el componente. Regla de UX: una notificación nunca duplica lo que un toast ya mostró en la misma sesión al mismo usuario (ej. si el propio usuario acaba de completar una tarea, no necesita además una notificación persistente de ese mismo evento — las notificaciones son para eventos que **otro** generó).

## 12. Feedback

Ninguna acción del usuario queda sin respuesta visible en menos de ~300ms (`04-DESIGN-SYSTEM.md` §15) — como mínimo un estado de carga (`disabled` + texto, o skeleton). Toda acción async exitosa termina en un toast o en un cambio visible de estado (ej. la actividad desaparece del calendario al eliminarse) — nunca un silencio que obligue al usuario a adivinar si funcionó.

## 13. Velocidad Percibida

Skeletons con la forma del contenido real (`04B-COMPONENT-LIBRARY.md` §23) en vez de un spinner genérico — comunica progreso, no solo espera. `Promise.all` para consultas independientes (`03-ENGINEERING-STANDARDS.md` §8) es también una decisión de UX, no solo de rendimiento: reduce el tiempo real hasta que la pantalla se siente completa.

## 14. Experiencia con IA

La IA nunca actúa a espaldas del usuario (`01-IDENTIDAD-DEL-PRODUCTO.md` §7, principio 3) — el flujo siempre es generar → mostrar resultado explícitamente marcado como propuesta → el usuario decide (regenerar, ajustar, publicar). Visualmente, el resultado de IA se distingue del contenido ya confirmado (hoy: vive en su propia sección `#resultadoIA`, con su propio spinner de "Claude está creando tu calendario..." — nunca se mezcla silenciosamente con datos reales antes de publicarse). Regla para futuros especialistas de IA (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §11): todo output de IA lleva una marca visual (ej. ícono ✨) mientras es una sugerencia, que desaparece una vez que el usuario lo confirma y se vuelve un dato real del sistema.

## 15. Experiencia Multiempresa

El `super_admin` operando dentro del panel de una empresa cliente (vía `?company_id=`) ve **exactamente la misma interfaz** que el `company_admin` de esa empresa — sin distinción visual hoy de que está en "modo soporte" (brecha ya señalada en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §16/§10, riesgo de edición accidental). **Estándar de UX definido aquí**: cuando se cierre esa brecha, el indicador debe ser persistente y difícil de ignorar (ej. una barra de color distintivo en el topbar con el nombre de la empresa y un botón "Salir del modo soporte"), no un badge pequeño que se pierde entre otros elementos.

---

## 16. Experiencia de Usuario por Rol

| Rol | Cómo cambia la interfaz | Densidad de información | Acciones principales a un clic |
|---|---|---|---|
| **`super_admin`** (Administrador de plataforma) | Panel utilitario propio (`admin.html`), tablas de gestión global, sin calendario propio | Alta | Crear empresa, invitar admin, revocar acceso |
| **`director`** | Mismas pantallas que `company_admin`, en modo solo-lectura (sin botones de creación/edición); calendario `editable:false` | Alta, pero sin controles de edición | Ver resumen, ver ranking, reportar seguidores (`v17`) |
| **`collaborator`** | Vista reducida, mobile-first, solo lo que le corresponde a él | Baja — una tarea a la vez | Reportar avance, marcar completada, subir evidencia |
| **"Marketing"** *(no es un rol técnico separado — es el uso predominante de `company_admin`)* | Mismas pantallas de `company_admin`, con foco en las secciones de Campañas/Seguidores/IA | Alta | Generar calendario con IA, publicar estrategia |
| **Franquiciatario** — **[FUTURO]** | No existe hoy como rol distinto. Requeriría el modelo de "empresa padre / empresas hijas" (candidato de diseño: `companies.parent_company_id` opcional) para que un franquiciatario vea agregados de varias sucursales sin ser `super_admin` | — | — |
| **Cliente futuro (agencia multi-marca)** — **[FUTURO]** | Requiere el rediseño de roles ya identificado en `02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §4/§20 (resumen, inconsistencia 1) — una cuenta operando varias `companies` a la vez, hoy no soportado | — | — |

**Principio rector de esta tabla**: los roles "Marketing" y "Franquiciatario"/"Cliente futuro" no son variaciones cosméticas de interfaz — dos son simplemente un uso particular de un rol que ya existe, y dos requieren cambios de modelo de datos reales antes de poder tener una experiencia propia. No se diseña la interfaz de un rol que no puede existir todavía en el modelo de permisos actual.
