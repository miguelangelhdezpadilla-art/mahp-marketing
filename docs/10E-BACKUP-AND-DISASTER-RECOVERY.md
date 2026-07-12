# BACKUP AND DISASTER RECOVERY — Respaldo y Recuperación ante Desastres

> MDS-011, Documento 6 de 10. Continuidad del negocio y recuperación ante
> desastres a nivel de datos e infraestructura — complementa
> `07D-DATA-LIFECYCLE.md` (que cubre recuperación de un dato individual
> soft-eliminado, no de una pérdida catastrófica de infraestructura).
>
> **Brecha real, señalada desde MDS-003, confirmada el 2026-07-12**
> (`02-ENTERPRISE-SYSTEM-ARCHITECTURE.md` §10): el proyecto de Supabase de
> MAHP está en **plan Free**, con **Point in Time Recovery deshabilitado**
> (confirmado directamente en Project Settings → Database del proyecto
> real). En el plan Free, Supabase **no garantiza backups automáticos** —
> a diferencia de lo que este documento asumía antes de verificarlo. Esta
> es la brecha operativa más seria identificada en toda la documentación
> `/docs` hasta ahora: hay una empresa cliente con datos reales en
> producción, sin red de seguridad de backup gestionado por la
> plataforma.
>
> Última actualización: 2026-07-12.

---

## 1. Qué hace Supabase hoy — confirmado, no inferido

**Plan contratado: Free. PITR: deshabilitado** (verificado en pantalla real del proyecto, 2026-07-12). El plan Free de Supabase no incluye backups automáticos gestionados con garantía de restauración — a diferencia de los planes Pro en adelante, que sí incluyen backups diarios (7 días de retención) como mínimo, con PITR disponible como add-on de pago adicional. **MAHP hoy no tiene ninguna de las dos capas.**

Esto significa, en términos concretos: si se corrompe una tabla, si un `UPDATE` mal escrito sobreescribe datos reales, o si ocurre cualquier incidente que el soft delete (`07D-DATA-LIFECYCLE.md` §7) no cubra (por ejemplo, no protege contra un `UPDATE` que cambia valores sin tocar `deleted_at`), **hoy no existe un backup gestionado por Supabase al cual recurrir**.

## 2. Acción recomendada — ya no es solo "verificar", es una decisión de negocio pendiente

Con el dato confirmado, la pregunta ya no es "¿qué nivel tenemos?" sino **"¿upgradeamos a Pro para tener backups reales?"** — es una decisión de costo/riesgo que le corresponde al usuario, no algo que este documento resuelva unilateralmente. Consideraciones para esa decisión:

- El plan Pro de Supabase incluye backups diarios automáticos por defecto, y habilita PITR como opción adicional si se necesita.
- El costo es mensual, aplica a partir del momento en que se activa — no es retroactivo (los datos ya escritos sin haber tenido backup no se pueden proteger retroactivamente).
- Mientras haya una sola empresa cliente en producción con datos reales de negocio (avances de tareas, evidencias, gamificación), el riesgo de pérdida total sin backup es real, no teórico.

## 3. Qué SÍ se puede diseñar sin ese dato: la estrategia alrededor del backup

| Capa | Qué cubre | Responsable |
|---|---|---|
| Backup de base de datos | Todo el contenido de Postgres (todas las tablas, todas las empresas) | Supabase (gestionado) |
| Backup de archivos (Storage) | Evidencias subidas (bucket `evidencias`, `07E-ENTITY-CATALOG.md`) | Supabase (gestionado) — confirmar si Storage tiene el mismo nivel de backup que la base de datos, no se puede asumir que es automático por defecto |
| Backup de código/esquema | `supabase_schema_vN.sql` en el repositorio Git | Ya cubierto — el repositorio ES el backup del historial de esquema (`07C-DATABASE-STANDARDS.md` §2) |
| Backup de configuración de Edge Functions/secretos | Código en Git; secretos NO están en Git (`CLAUDE.md` §5) | Secretos viven solo en Supabase — su pérdida requeriría regenerarlos desde el proveedor original (ej. rotar clave de Groq), no hay backup de secretos por diseño de seguridad |

## 4. Recovery Point Objective (RPO) y Recovery Time Objective (RTO)

Con el plan confirmado, el número real no es "hasta 24 horas de datos en riesgo" (lo que tendría un plan con backup diario) — es **sin límite superior**: sin backup gestionado, el RPO real hoy es "todo lo escrito desde el último respaldo manual, si existe alguno" y el RTO depende enteramente de si existe una copia manual de los datos en algún lado. No se documenta un número optimista que no corresponde a la realidad confirmada (`CLAUDE.md` §6).

## 5. Escenarios de desastre y su plan de respuesta — actualizado con el plan Free confirmado

| Escenario | Impacto | Respuesta real hoy |
|---|---|---|
| Fallo de Supabase (interrupción del proveedor) | Todo MAHP inaccesible | Fuera del control de MAHP — monitoreo de status de Supabase, comunicación al cliente (`10D-OPERATIONAL-EXCELLENCE.md` §5) |
| Corrupción de datos por un bug de aplicación | Datos incorrectos escritos, plataforma sigue funcionando | **Sin PITR, no hay forma de restaurar al punto anterior al bug** — la única defensa es que el bug se detecte rápido y se corrija hacia adelante (nuevo `UPDATE` que arregle el dato), no hacia atrás |
| Borrado accidental de datos por un usuario con privilegios (ej. `super_admin` vía SQL Editor) | Pérdida de datos específicos | Primera línea de defensa: soft delete como comportamiento por defecto (`07D-DATA-LIFECYCLE.md` §7) cubre la mayoría de los casos reales sin necesitar backup — pero **un `DELETE` real o un `UPDATE` destructivo directo en SQL Editor no tiene red de seguridad hoy** |
| Pérdida del repositorio Git (ej. cuenta de GitHub comprometida) | Pérdida de historial de código/esquema, no de datos de producción | Mitigación: repositorio con más de un colaborador con acceso, o clon local actualizado — no resuelto formalmente en este documento, señalado como riesgo |
| **Pérdida/corrupción de datos sin cobertura de soft delete** (nuevo, confirmado) | Pérdida real, potencialmente permanente | **Sin mitigación hoy.** Es el escenario que justifica evaluar upgrade a plan Pro (§2) o, como medida inmediata de menor costo, un respaldo manual periódico (§6) mientras se decide |

## 6. Medida provisional de bajo costo — implementada el 2026-07-12

No requiere esperar a la decisión de negocio de §2: se implementó un respaldo semanal automatizado que corre en el equipo local del usuario, fuera de Supabase — reduce el riesgo de "cero backups" a "backup semanal con retención de 15 días". No reemplaza un backup gestionado real (no cubre point-in-time recovery, no está geográficamente separado de la máquina del usuario), pero cubre el hueco mientras se decide el upgrade a plan Pro.

**Cómo funciona**:
- Script Python (`C:\Users\MIGUEL\Supabase-Backups\backup_mahp.py`) conecta directo a Postgres (`psycopg2`) y exporta cada tabla del schema `public` a CSV (`COPY ... TO STDOUT WITH CSV HEADER`) — sin depender de `pg_dump`/Docker, que no están disponibles en este equipo.
- Solo respalda **datos** (filas) — la estructura de tablas, políticas RLS y funciones ya vive versionada en `supabase_schema_vN.sql` dentro del repositorio de git, así que no hace falta duplicarla aquí.
- Guardado en `C:\Users\MIGUEL\Supabase-Backups\mahp\` — **deliberadamente fuera del repositorio de git** de MAHP, para que un respaldo con datos reales de clientes nunca termine subido a GitHub Pages (público).
- Tarea programada de Windows (`MAHP_Backup_Semanal`) ejecuta el script todos los lunes a las 9am automáticamente; el mismo script borra carpetas de respaldo con más de 15 días en cada corrida.
- Primer respaldo verificado exitosamente: 15 tablas exportadas sin error.

**Limitaciones reconocidas de esta medida**: depende de que el equipo del usuario esté encendido a la hora programada (si no, Windows Task Scheduler la corre en el siguiente arranque gracias a `StartWhenAvailable`, no la salta silenciosamente); el respaldo vive en un solo lugar físico (la propia máquina), sin redundancia geográfica; requiere que la contraseña de la base de datos, embebida en el script local, se mantenga segura en ese equipo.

## 7. Relación con Auditoría y Observabilidad

Un evento de restauración desde backup es, por definición, auditable (`CCEC-001A`, candidato a agregarse: `restauracion_desde_backup_ejecutada`) y su necesidad debería surgir de una alerta de observabilidad (`CCEC-004C`) o de un reporte de incidente (`10D` §2) — este documento no redefine ninguno de los dos mecanismos, los referencia.

---

## KPIs

| KPI | Definición | Estado |
|---|---|---|
| RPO real | Máxima pérdida de datos aceptable/posible | **Confirmado: sin límite superior** (sin backup gestionado) hasta que se decida §2 o se active §6 |
| RTO real | Tiempo máximo para restaurar servicio | **Confirmado: indefinido** — no hay backup gestionado del cual restaurar |
| Simulacros de recuperación realizados | Frecuencia con la que se prueba que el backup realmente restaura (no solo que existe) | [FUTURO] — no aplica todavía, no hay backup que probar |

---

## Nota de cierre

**Verificado directamente el 2026-07-12**: plan Free, PITR deshabilitado, sin backups automáticos gestionados. De los 10 documentos de MDS-011, este es el único con un riesgo confirmado y activo, no solo un escenario de diseño para cuando el negocio crezca. Recomendación explícita: decidir entre (a) upgrade a plan Pro de Supabase, o (b) al menos activar el respaldo manual provisional de §6, antes de que ocurra un incidente que dependa de un backup que hoy no existe.
