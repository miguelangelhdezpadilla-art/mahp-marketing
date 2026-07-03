# Estructura de la plataforma de Marketing Multi-Empresa

## 1. Visión del producto

Una plataforma SaaS donde cada **empresa cliente** tiene su propio espacio aislado para planificar y dar seguimiento a sus campañas y actividades de marketing, con roles internos que reflejan cómo trabaja realmente un equipo: quien dirige, quien opera y quien ejecuta.

Tú (el proveedor) administras la plataforma completa: das de alta empresas nuevas, controlas accesos y mantienes la salud del sistema.

---

## 2. Roles del sistema

| Rol | Quién es | Alcance |
|---|---|---|
| **Super Admin** | Tú | Toda la plataforma, todas las empresas |
| **Admin de Empresa** | Dueño/gerente de marketing de la empresa cliente | Su empresa completa |
| **Directivo** | Gerencia/dirección de la empresa cliente | Su empresa, solo lectura/reportes |
| **Colaborador** | Personal operativo de la empresa cliente | Solo las tareas que le asignaron |

---

## 3. Matriz de permisos

| Acción | Super Admin | Admin Empresa | Directivo | Colaborador |
|---|:---:|:---:|:---:|:---:|
| Crear/desactivar empresas | ✅ | ❌ | ❌ | ❌ |
| Crear usuario Admin de una empresa | ✅ | ❌ | ❌ | ❌ |
| Resetear contraseñas dentro de su empresa | ✅ (todas) | ✅ (la suya) | ❌ | ❌ |
| Crear Directivos / Colaboradores | ✅ | ✅ | ❌ | ❌ |
| Crear/editar campañas y calendario | ✅ | ✅ | 👁️ solo ver | ❌ |
| Asignar tareas a colaboradores | ✅ | ✅ | ❌ | ❌ |
| Actualizar progreso de su propia tarea | ✅ | ✅ | ❌ | ✅ |
| Ver dashboard de su empresa | ✅ | ✅ | ✅ | 👁️ vista reducida (sus tareas) |
| Ver dashboards de **todas** las empresas | ✅ | ❌ | ❌ | ❌ |
| Configurar KPIs de su empresa | ✅ | ✅ | 👁️ solo ver | ❌ |
| Exportar reportes de su empresa | ✅ | ✅ | ✅ | ❌ |

---

## 4. Aislamiento entre empresas (multi-tenant)

Cada empresa es un **tenant**. Toda la información operativa (campañas, actividades, KPIs, usuarios) está etiquetada con un `company_id`. La regla de seguridad es simple y se aplica en todos lados:

> Un usuario solo puede leer o escribir filas cuyo `company_id` coincida con el de su propia empresa — excepto el Super Admin, que no tiene esa restricción.

Esto se hace a nivel de base de datos (no solo en la interfaz), así que aunque alguien manipule la app desde el navegador, la base de datos rechaza cualquier intento de ver o tocar datos de otra empresa.

```
Empresa A ──┐
            ├─ company_id = A → solo lo ve gente de A
Empresa B ──┤
            ├─ company_id = B → solo lo ve gente de B
Empresa C ──┘
            └─ company_id = C → solo lo ve gente de C

Super Admin ──→ ve A, B y C (sin restricción de company_id)
```

---

## 5. Modelo de datos (entidades principales)

| Entidad | Descripción | Pertenece a |
|---|---|---|
| `companies` | Empresa cliente (nombre, plan, estado activo) | — |
| `users` (perfil) | Persona del sistema: rol + empresa a la que pertenece | una `company` (o ninguna, si es Super Admin) |
| `campaigns` | Campaña de marketing (objetivo, fechas, estado) | una `company` |
| `activities` | Actividad/tarea dentro de una campaña o del calendario general (título, canal, fecha, categoría, estado, % de avance) | una `company`, opcionalmente una `campaign`, asignada a un `colaborador` |
| `activity_updates` | Historial de avances que reporta un colaborador sobre su tarea | una `activity` |
| `kpis` | Indicador configurable (meta, valor actual, periodo) | una `company` |

El dashboard de cada empresa se calcula a partir de `activities`, `activity_updates` y `kpis` filtrados por su `company_id` — nunca mezclando datos de otra empresa.

---

## 6. Recorrido por rol

**Super Admin (tú):**
Panel de control con la lista de empresas activas, métricas de uso global, botón para "Crear nueva empresa" (esto crea la empresa + su primer usuario Admin), y herramientas de soporte (resetear acceso, desactivar cuenta).

**Admin de Empresa:**
Al entrar ve el calendario/campañas de su empresa. Puede crear campañas, agregar actividades, asignarlas a colaboradores, invitar nuevos colaboradores o directivos, y configurar los KPIs que quiere monitorear.

**Directivo:**
Entra directo a un **dashboard de solo lectura**: avance de campañas activas, cumplimiento de KPIs, desempeño por colaborador, y un botón para exportar el reporte del periodo.

**Colaborador:**
Ve únicamente "Mis tareas asignadas". Puede marcar avance, agregar notas o evidencias. Ese avance se refleja en tiempo real en el dashboard de su Admin/Directivo — no ve nada de otros colaboradores ni de otras campañas.

---

## 7. Seguridad

- **Autenticación real** (login con correo/contraseña, no acceso libre como hoy) — cada usuario inicia sesión con su propia cuenta.
- **Contraseñas seguras**: requisitos mínimos de longitud/complejidad aplicados por el proveedor de autenticación, posibilidad de forzar cambio de contraseña en el primer ingreso.
- **Aislamiento de datos por empresa** aplicado en la base de datos (no solo en la interfaz) — ver sección 4.
- **Acciones privilegiadas protegidas**: crear empresas o usuarios Admin no se hace desde el navegador del cliente directamente, sino a través de una capa intermedia controlada por el Super Admin, para que ninguna clave de alto privilegio quede expuesta en el código de la app.
- **Registro de auditoría** (recomendado): quién creó/editó/eliminó qué y cuándo, por empresa.

---

## 8. Siguientes pasos técnicos (cuando quieras avanzar)

1. Diseño de tablas y políticas de seguridad por fila (RLS) en la base de datos.
2. Sistema de autenticación con perfiles vinculados a `company_id` y `rol`.
3. Pantallas separadas por rol (Super Admin / Admin Empresa / Directivo / Colaborador).
4. Dashboard con KPIs configurables por empresa.

Esto se puede construir de forma incremental sobre la base que ya existe (Supabase), sin necesidad de empezar desde cero.
