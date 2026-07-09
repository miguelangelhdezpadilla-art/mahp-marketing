# CORE MODULES — Especificación Funcional

> MDS-007, Documento 2 de 11. Los 8 módulos base sin los cuales ningún otro
> módulo del sistema puede operar. Formato por módulo: estado, objetivo,
> problema/valor, usuarios y permisos, flujo (entradas→proceso→salidas),
> reglas de negocio, KPIs/criterios de éxito, automatización e IA
> involucrada, dependencias/relaciones/integraciones, notificaciones y
> reportes, escalabilidad y evolución futura — los 22 campos requeridos,
> combinados donde son naturalmente la misma respuesta.
>
> Última actualización: 2026-07-09.

---

## 1. Empresas — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Ser el ancla de aislamiento multiempresa (`company_id`) de todo dato operativo |
| Problema / Valor | Sin este módulo no hay SaaS multiempresa posible — resuelve "cómo separar los datos de un cliente de otro" con garantía real, no solo de interfaz |
| Usuarios / Roles / Permisos | Creado y gestionado solo por `super_admin`; visible (nombre) para todos los roles de esa empresa |
| Entradas → Proceso → Salidas | Nombre de empresa → `insert` en `companies` → empresa lista para invitar a su primer `company_admin` |
| Reglas de negocio | Ver `06G-BUSINESS-RULES.md` §8 |
| KPIs / Criterios de éxito | Número de empresas activas en la plataforma; tiempo desde alta hasta primer uso real |
| Automatización / IA | Ninguna hoy — candidato futuro: alta autoservicio sin intervención de `super_admin` |
| Dependencias / Relaciones / Integraciones | Es la raíz de la que dependen todos los demás módulos (`company_id` en cascada) |
| Notificaciones / Reportes | Evento "empresa creada" registrado en Auditoría (§8) |
| Escalabilidad / Evolución | Sostiene miles de empresas sin cambio estructural (`02-ARCHITECTURE` §14); evolución futura: jerarquía padre/hijo para franquicias/agencias |

## 2. Sucursales — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Permitir que una empresa cliente opere varias ubicaciones físicas bajo la misma cuenta |
| Problema / Valor | Un restaurante con 3 sucursales hoy tendría que ser 3 empresas separadas en MAHP, sin vista consolidada — resuelve la fragmentación |
| Usuarios / Roles / Permisos | `company_admin` gestiona sucursales de su empresa; requiere decidir si un `collaborator`/`director` se asocia a una sucursal específica o a toda la empresa |
| Entradas → Proceso → Salidas | Requiere `companies.parent_company_id` o una tabla `branches` nueva — decisión de modelo de datos pendiente, no tomada en este documento |
| Reglas de negocio | Actividades/campañas podrían filtrarse por sucursal además de por empresa |
| KPIs / Criterios de éxito | Adopción por empresas con más de una ubicación real |
| Automatización / IA | Franchise Operations Advisor (`05A-AI-AGENTS.md` #20) depende directamente de este módulo |
| Dependencias / Relaciones / Integraciones | Bloqueado hasta decidir el modelo de datos (mismo bloqueo ya señalado en `02-ARCHITECTURE` §4/§20 y `04C-UX-GUIDELINES.md` §16) |
| Notificaciones / Reportes | N/A hasta construirse |
| Escalabilidad / Evolución | Prerequisito directo del mercado "Franquicias" (`01-IDENTIDAD-DEL-PRODUCTO.md` §9) |

## 3. Usuarios — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Representar a cada persona con acceso a MAHP, vinculada a una empresa y un rol |
| Problema / Valor | Sin identidad individual no hay trazabilidad ni permisos diferenciados |
| Usuarios / Roles / Permisos | Todos — es la tabla (`profiles`) que define quién es cada quien |
| Entradas → Proceso → Salidas | Invitación (`invites`) → registro en `login.html` → `profiles` vinculado automáticamente a empresa+rol (`FASES-APP.md` Fase 4) |
| Reglas de negocio | Ver `06G-BUSINESS-RULES.md` §9 |
| KPIs / Criterios de éxito | Usuarios activos por empresa; tasa de aceptación de invitación |
| Automatización / IA | Ninguna — flujo 100% determinista por diseño (seguridad, `FASES-APP.md` Fase 4) |
| Dependencias / Relaciones / Integraciones | Depende de Empresas; toda tabla operativa depende de Usuarios vía `assigned_to`/`created_by`/etc. |
| Notificaciones / Reportes | — |
| Escalabilidad / Evolución | Sostiene el volumen esperado sin cambio; evolución futura: perfil enriquecido (foto, preferencias — ver `05E-AI-MEMORY-AND-CONTEXT.md` §5) |

## 4. Roles — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Definir 4 conjuntos fijos de capacidades (`super_admin`/`company_admin`/`director`/`collaborator`) |
| Problema / Valor | Modela cómo trabaja realmente un equipo de marketing, no un esquema de permisos genérico |
| Usuarios / Roles / Permisos | Es en sí mismo la definición de permisos — ver `06H-PERMISSIONS-MATRIX.md` |
| Entradas → Proceso → Salidas | Asignado al invitar (§3); inmutable después salvo por `super_admin` |
| Reglas de negocio | `company_admin` nunca puede crear otro `company_admin` (`FASES-APP.md` Fase 1) |
| KPIs / Criterios de éxito | Distribución de roles por empresa (saludable: pocos admins, más colaboradores) |
| Automatización / IA | Ninguna |
| Dependencias / Relaciones / Integraciones | Toda política RLS del sistema depende de `my_role()` |
| Notificaciones / Reportes | — |
| Escalabilidad / Evolución | **[FUTURO]** permisos granulares por empresa además de los 4 roles fijos (`02-ARCHITECTURE` §10) — para clientes grandes que necesiten un quinto rol tipo "supervisor de área" |

## 5. Permisos — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Garantizar que cada operación de lectura/escritura respete rol + empresa, a nivel de base de datos |
| Problema / Valor | Elimina la posibilidad de fuga de datos entre empresas incluso si la interfaz tuviera un bug |
| Usuarios / Roles / Permisos | RLS aplica a los 4 roles sin excepción, incluido `super_admin` (con `company_id` sin restricción) |
| Entradas → Proceso → Salidas | Cada `select`/`insert`/`update`/`delete` pasa por su política correspondiente (`DATABASE.md` §1) |
| Reglas de negocio | Una política explícita por operación y tabla — nunca `for all` genérico salvo decisión consciente (`03-ENGINEERING-STANDARDS.md` §9) |
| KPIs / Criterios de éxito | Cero incidentes de fuga de datos entre empresas (objetivo absoluto, no aspiracional) |
| Automatización / IA | N/A — este módulo es en sí una restricción sobre lo que la IA puede hacer (`05C-AI-GOVERNANCE.md` §3) |
| Dependencias / Relaciones / Integraciones | Transversal a todos los módulos |
| Notificaciones / Reportes | — |
| Escalabilidad / Evolución | Ver Roles (§4) — permisos granulares es la evolución natural |

## 6. Configuración — **[FUTURO]**

| Campo | Detalle |
|---|---|
| Objetivo | Centralizar los ajustes de una empresa (Branding, Seguridad, Suscripción, Facturación, Preferencias) en un solo lugar |
| Problema / Valor | Hoy los ajustes están repartidos por página (ej. gestión de canales dentro de la pestaña de seguidores) sin una pantalla única — brecha ya identificada en `04B-COMPONENT-LIBRARY.md` §7 (Dashboard de Configuración marcado `[FUTURO]`) |
| Usuarios / Roles / Permisos | `company_admin` (su empresa), `super_admin` (cualquiera) |
| Entradas → Proceso → Salidas | Formularios de ajuste → `update` en `companies`/tablas relacionadas |
| Sub-módulos | **Branding** (logo, colores de marca por empresa — hoy MAHP usa una sola identidad visual para todos los clientes); **Seguridad** (política de contraseña, activar 2FA); **Suscripción/Facturación** (ver `02-ARCHITECTURE` §4, no construido); **Preferencias** (idioma, notificaciones — ver `05E-AI-MEMORY-AND-CONTEXT.md` §5) |
| KPIs / Criterios de éxito | Reducción de solicitudes de soporte relacionadas a ajustes |
| Automatización / IA | Ninguna |
| Dependencias / Relaciones / Integraciones | Depende de Empresas; Facturación depende de Integraciones de pago (`06F`) |
| Escalabilidad / Evolución | Se vuelve crítico en cuanto exista un modelo de planes/suscripción real |

## 7. Notificaciones — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Avisar a un usuario de eventos relevantes sin que tenga que buscarlos |
| Problema / Valor | Elimina la necesidad de "revisar todo por si acaso" |
| Usuarios / Roles / Permisos | Cada usuario ve solo las suyas (`recipient_id = auth.uid()`) |
| Entradas → Proceso → Salidas | Evento de dominio → trigger → `insert` en `notifications` → campanita en topbar |
| Reglas de negocio | Se marcan como leídas al abrir el panel, no antes |
| KPIs / Criterios de éxito | Tiempo entre evento y que el usuario lo vea |
| Automatización / IA | 100% generado por trigger determinista hoy; futuro — contenido de la notificación redactado por un agente (`05-AI-ECOSYSTEM.md` §5) |
| Dependencias / Relaciones / Integraciones | Depende de Usuarios; disparada por eventos de Marketing/Operaciones |
| Escalabilidad / Evolución | **[FUTURO]** canal externo (correo, WhatsApp) más allá de in-app — depende de `06F-INTEGRATIONS.md` |

## 8. Auditoría — **[EXISTE]**

| Campo | Detalle |
|---|---|
| Objetivo | Registrar quién hizo qué, cuándo, en qué empresa — sin depender de que el código "se acuerde" de registrarlo |
| Problema / Valor | Trazabilidad para soporte y para cumplimiento futuro (`05C-AI-GOVERNANCE.md` §11) |
| Usuarios / Roles / Permisos | Visible para `super_admin` (todo) — hoy no expuesto a `company_admin` para su propia empresa (brecha menor, no priorizada) |
| Entradas → Proceso → Salidas | Evento administrativo (empresa creada, invitación, acceso revocado) → trigger → `audit_log` |
| Reglas de negocio | Append-only — nunca editable ni borrable desde la app (`DATABASE.md` §1) |
| KPIs / Criterios de éxito | Cobertura de eventos auditables vs. eventos reales del sistema |
| Automatización / IA | N/A — es la fuente de verdad que un futuro agente de auditoría/seguridad podría analizar |
| Dependencias / Relaciones / Integraciones | Depende de Usuarios y Empresas |
| Escalabilidad / Evolución | Extender cobertura a eventos de IA (`05C-AI-GOVERNANCE.md` §7-8, hoy no implementado) |
