# Super Admin: Privacidad y datos · Super Admin: Privacy and data

_Pantallas: **Usuarios 360° › Privacidad** (`/admin/usuarios/{id}?tab=privacidad`), **Colas › Cambios sensibles** (Fusionar cuentas) y **Sistema ›
Configuración › Retención**. Teléfono y escritorio. Para el equipo de To'Latino (y El Compa como copiloto del equipo). Versión: 14 nov 2026.
Audiencia: equipo. Tema: equipo._

## Qué hace
- **Un solo mapa de datos** dice, tabla por tabla, qué es de cada persona y qué pasa con ello: qué sale en su archivo, qué se borra a los 30 días, qué
  se vacía (la fila queda sin lo que escribió), qué se seudonimiza («Cuenta borrada», porque la ley o el dinero piden guardarlo) y qué se guarda y
  por qué (auditoría, seguridad, dinero). Lo mismo dicen Privacidad y las tiendas.
- **Usuarios 360° › Privacidad** trae, de una persona:
  - **Sus archivos (Descargar mis datos)**: cada pedido, si lo pidió ella o alguien del equipo, cuánto pesó y si lo bajó. Nunca el contenido.
    **«Exportar sus datos»** (rol con «exportar») baja el MISMO archivo que la persona pide en Mi cuenta, para un pedido que llegó por Soporte; el
    motivo queda en la auditoría.
  - **Borrado a los 30 días**: si hay un borrado programado, la fecha y quién lo pidió; cuando ya corrió, **la purga**: cuándo, si quedó completa,
    cuántas filas, cuántas tablas se revisaron, cuántos negocios quedaron sin dueño, cuántas fotos salieron del almacenamiento y **cada tabla** con
    sus filas borradas, vaciadas o seudonimizadas.
  - **Ver como (solo lectura)**: lo mismo que trae su archivo, las primeras filas de cada parte, sin poder cambiar nada. Pide motivo y queda en la
    auditoría **antes** de ver.
  - **Términos que aceptó**, con versión y fecha.
  - **Avisos que recibe**: los que apagó y si respeta las horas de silencio.
  - **Fusionar cuentas**: ver abajo.
- **Fusionar cuentas** (una persona con dos cuentas, por ejemplo porque cambió de número): con **«Fusionar con otra cuenta»** escribes el teléfono
  de la cuenta que se queda y el motivo; el pedido entra a **Colas › Cambios sensibles** y lo aplica **otra persona del equipo** (quien lo pidió ve
  «Lo pediste tú»; la base tampoco deja que una sola persona lo pida y lo apruebe). Al aplicarlo, sus pedidos, cobros, direcciones, guardados,
  reseñas y publicaciones pasan a la otra cuenta; lo que no se mueve (puntos, monedas, boletos, mensajes, sesiones) queda en la fusionada con su
  porqué; la fusionada ya no entra y su teléfono queda libre. Queda anotado quién lo pidió y quién lo aprobó.
- **Sistema › Configuración › Retención** junta todo lo que dice cuánto se guarda algo, cada valor con sus límites, su valor de fábrica y la
  auditoría al cambiarlo: el archivo (uno cada 7 días; el enlace vale 24 horas), las filas por pasada de la purga, los escaneos de la puerta (13
  meses con detalle, luego solo cifras), la foto del documento de un reclamo (90 días después de decidido), las sesiones viejas (400 días), las
  búsquedas (90 días), los códigos de entrada (7 días), y las que ya corrían en su sección (El Compa, errores, la ruta del repartidor, la
  analítica, notas privadas…).

## Cómo se usa
- Un pedido de datos por Soporte: Usuarios 360° de la persona › Privacidad › **Exportar sus datos**, motivo, «Descargar».
- Un pedido de borrado por Soporte: Usuarios 360° › Resumen › **Borrar datos** → Cambios sensibles → lo aplica otra persona; 30 días de gracia
  (un Admin puede **Restaurar**); después la purga corre sola y su resultado sale en Privacidad.
- Dos cuentas de la misma persona: en la cuenta que se va, Privacidad › **Fusionar con otra cuenta**; otra persona lo aplica en Cambios sensibles.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| La persona pidió borrar y entra antes de los 30 días | Se cancela. Si lo pidió To'Latino, no se cancela al entrar. |
| Pasaron los 30 días | El barrido la purga en el minuto siguiente, por el mapa; Privacidad muestra cada tabla. |
| La purga dice «Faltan N filas» | Algo no se pudo vaciar todavía (por ejemplo una conversación de El Compa abierta: se cierra a las 24 h y se vacía en la pasada siguiente). Se reintenta sola. |
| Quien pidió la fusión intenta aplicarla | No puede: «Lo pediste tú: lo aplica otra persona del equipo.» |
| Fusionar una cuenta del equipo | No se puede: primero se le quita el rol en Sistema › Equipo. |
| Alguien quiere el archivo de otra persona | No existe para él: cada archivo lo baja solo quien lo pidió. |
| Un negocio cuyo único dueño se borró | Queda sin dueño («sin reclamar»), su Pro termina y se puede reclamar. |

## Preguntas frecuentes
- **¿Se borra la auditoría de una cuenta borrada?** No: el id queda, el nombre y el teléfono no.
- **¿El negocio ve el nombre de alguien que se borró?** No: ve «Cuenta borrada» en sus pedidos y cobros.
- **¿Puedo cambiar cuánto se guarda algo?** Sí, en Sistema › Configuración › Retención, dentro de sus límites. Si cambias lo que dicen las
  tiendas o la ayuda (13 meses, 90 días, 24 horas, 7 días), cambia también ese texto.

## English
### What it does
- **A single data map** says, table by table, what belongs to each person and what happens to it: what goes into their file, what is deleted after
  30 days, what is emptied (the row stays without what they wrote), what is pseudonymized ("Cuenta borrada", because the law or money requires
  keeping it) and what is kept and why (audit, safety, money). Privacy and the app stores say the same.
- **Users 360° › Privacy** shows, for a person:
  - **Their files (Download my data)**: each request, whether they or a team member requested it, its size and whether it was downloaded. Never
    the content. **"Export their data"** (a role with "export") downloads the SAME file the person requests in My account, for a request that came
    through Support; the reason goes into the audit log.
  - **Deletion after 30 days**: if a deletion is scheduled, the date and who requested it; once it ran, **the purge**: when, whether it was complete,
    how many rows, how many tables were checked, how many businesses were left without an owner, how many photos left storage and **each table**
    with its deleted, emptied or pseudonymized rows.
  - **View as (read-only)**: the same as their file, the first rows of each part, without being able to change anything. It asks for a reason that
    goes into the audit log **before** viewing.
  - **Terms they accepted**, with version and date.
  - **Notifications they get**: the ones they turned off and whether quiet hours apply.
  - **Merge accounts**: see below.
- **Merge accounts** (one person with two accounts, for example after changing numbers): with **"Merge with another account"** you enter the phone of
  the account that stays and the reason; the request goes to **Queues › Sensitive changes** and **another team member** applies it (the requester
  sees "You requested it"; the database does not let one person request and approve it either). When applied, their orders, payments, addresses,
  saved items, reviews and posts move to the other account; what does not move (points, coins, tickets, messages, sessions) stays on the merged one
  with its reason; the merged account can no longer sign in and its phone is freed. Who requested and who approved are recorded.
- **System › Settings › Retention** gathers everything that says how long something is kept, each value with its limits, its factory value and the
  audit log on change: the file (one every 7 days; the link is valid for 24 hours), rows per purge pass, door scans (13 months with detail, then
  numbers only), the photo of a claim document (90 days after the decision), old sessions (400 days), searches (90 days), sign-in codes (7 days),
  and the ones that already ran in their own section (El Compa, errors, the driver's route, analytics, private notes…).

### How to use it
- A data request through Support: the person's Users 360° › Privacy › **Export their data**, reason, "Download".
- A deletion request through Support: Users 360° › Summary › **Delete data** → Sensitive changes → another person applies it; 30 days of grace (an
  Admin can **Restore**); after that the purge runs on its own and its result shows in Privacy.
- Two accounts of the same person: on the account that goes away, Privacy › **Merge with another account**; another person applies it in Sensitive changes.

### What happens in each case
| Case | What happens |
|---|---|
| The person asked to delete and signs in before 30 days | It is cancelled. If To'Latino requested it, signing in does not cancel it. |
| 30 days passed | The sweep purges it the next minute, by the map; Privacy shows each table. |
| The purge says "N rows missing" | Something could not be emptied yet (for example an open El Compa conversation: it closes after 24 h and is emptied on the next pass). It retries on its own. |
| The requester tries to apply the merge | They cannot: "You requested it: another team member applies it." |
| Merging a team account | Not allowed: first remove their role in System › Team. |
| Someone wants another person's file | It does not exist for them: each file is downloaded only by whoever requested it. |
| A business whose only owner was deleted | It is left without an owner ("unclaimed"), its Pro ends and it can be claimed. |

### FAQ
- **Is the audit log of a deleted account erased?** No: the ID stays, the name and phone do not.
- **Does the business see the name of someone who was deleted?** No: it sees "Cuenta borrada" on its orders and payments.
- **Can I change how long something is kept?** Yes, in System › Settings › Retention, within its limits. If you change what the stores or the help
  say (13 months, 90 days, 24 hours, 7 days), change that text too.
