# Super Admin: Sistema (Flags, Salud, Respaldos y Estados) · Super Admin: System (Flags, Health, Backups and States)

_Pantallas: **Super Admin › Sistema** con sus pestañas **Flags** (`/admin/sistema/flags`), **Salud** (`/admin/sistema/salud`), **Respaldos** (`/admin/sistema/respaldos`) y **Estados** (`/admin/sistema/estados`), junto a Equipo y permisos, Configuración, Apps e Integraciones. Ver: Sistema · ver. Cambiar un interruptor y programar o cancelar un mantenimiento: Sistema · editar. Ver las fotos de una ayuda de Salud: Colas, con motivo. Teléfono y escritorio. Versión: 14 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Flags:** cada interruptor de la plataforma, si está encendido, **dónde** (todas las ciudades, unas ciudades o un porcentaje de personas) y quién lo
  cambió y cuándo. Los que tienen su propia pantalla (El Compa, las apps, Push, las fichas de las tiendas, el pie de la web) se cambian ahí; aquí llevan a
  su sección. Por ciudad o por porcentaje solo los que el código lee persona por persona (hoy: **Reportar un problema**); los demás son todo o nada y la
  base no deja acotarlos. El porcentaje es estable: la misma persona cae siempre del mismo lado.
- **Salud:** cómo está la plataforma ahora. Disponibilidad y tiempo de la base, errores de las últimas 24 horas (del servidor, la web y las apps), una
  fila por servicio (la base, los trabajos del barrido, la cola de los avisos push, el disco y los errores) con lo último que se midió (cada 5 minutos),
  las tareas del barrido con error, las llaves y certificados que vencen y el **mantenimiento programado**.
- **Velocidad en teléfonos reales (Salud):** lo que siente quien usa To'Latino, medido en su propio teléfono o computadora, de los últimos 7 días
  y por pantalla: **LCP** (cuánto tarda en salir lo grande), **INP** (cuánto tarda en responder a un toque) y **CLS** (cuánto se mueve sola la
  pantalla), en % de mediciones buenas. **BIEN** si 75 % o más son buenas en las tres; **REVISAR** si más de 25 % son malas en alguna. Solo cifras
  por día y pantalla (el nombre del negocio o el número de un pedido se vuelve «:x»): nunca quién, ni su teléfono, ni la dirección. Se apaga con el
  flag **app.vitals**.
- **Cambios al instante (Salud):** si este servidor está escuchando los cambios que se guardan en el Super Admin (Configuración, interruptores,
  ciudades, textos), desde cuándo, el último aviso que recibió y cuántos. **VIVA:** lo que cambias se ve al momento. **REVISAR:** el servidor se
  está reconectando (cada 5 segundos) y un cambio puede tardar hasta 15 segundos en verse (60 las ciudades).
- **Respaldos:** lo que importa es que se puede restaurar: arriba la **restauración de prueba** (si restauró, cuánto tardó, el punto en el tiempo y las
  filas que contó), y después lo último de cada tipo (base completa, registro continuo, fotos y el sobre de llaves de recuperación) y la lista. Avisa si
  el respaldo de la base pasó de 26 horas, si la última restauración falló o si no hubo una buena en 8 días.
- **Estados:** cómo se ve cada estado de una pantalla del admin (carga, vacío, sin resultados, error, sin permiso, lo está viendo otra persona, acción
  irreversible, acción en lote y dato desactualizado) y los de Sistema. Sus botones son de ejemplo: no cambian nada.
- **Errores del servidor:** si una página, una acción o una ruta se cae, el error llega solo, **tapado** (sin teléfonos, correos, tarjetas ni valores de
  campos) y agrupado con los demás iguales. Se ven en Salud y en Sistema › Apps › Salud, y «Errores en vivo» avisa a los Admins.
- **Llaves que vencen:** toda llave del llavero con fecha (certificados y tokens) avisa a los Admins **30 días antes**, a los 7 y cuando vence; cada
  reemplazo queda anotado con la huella vieja y la nueva.
- **Fotos de Salud («vidrio roto»):** la foto de una ayuda con un consultorio solo se le muestra al equipo después de escribir **por qué** la necesita.
  El motivo queda en la auditoría y la foto se abre solo a esa persona durante 10 minutos.

## Cómo se usa
- **Acotar un interruptor:** Flags → tócalo → **Por ciudad** (elige ciudades) o **Por porcentaje** (las ciudades y el porcentaje, de 1 a 99) → **Guardar**
  → motivo. Para volver: **Todas las ciudades**. Los de todo o nada se encienden o apagan con su interruptor, con motivo.
- **Programar un mantenimiento:** Salud → desde y hasta (hora de Hazleton, 6 horas como máximo, con una hora de anticipación) y el aviso en español e
  inglés → **Programar** → motivo. No se edita: se **cancela** con motivo y se programa otro.
- **Ver una foto de Salud:** en la ayuda (Colas) → **Ver con motivo** → el motivo (10 letras o más).

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Un interruptor al 10 % en una ciudad | Lo tienen las personas de esa ciudad que caen en su 10 %; nadie de otra ciudad. Quien no tiene cuenta, no. |
| Subes de 10 a 20 % | Se suman personas; las que ya lo tenían lo siguen teniendo. |
| Quieres acotar uno de todo o nada | «Este interruptor se lee todo o nada.» La base tampoco lo deja. |
| Un servicio no responde bien | Su fila dice **REVISAR** y arriba sale cuántos hay para revisar. |
| Una tarea del barrido dice «N de M fallaron (…)» | De los M elementos que recorrió (planes, patrocinios, cobros, devoluciones…), N lanzaron un error; los demás sí se hicieron. Entre paréntesis van los que fallaron: se vuelven a intentar cada minuto y la tarea sigue en rojo hasta que se arreglen. |
| Dos mantenimientos a la misma hora | «Ya hay un mantenimiento a esa hora.» |
| El respaldo de la base pasó de 26 horas | Respaldos lo dice arriba en rojo. |
| Un error del servidor con un teléfono en el mensaje | Se guarda con «[tel]» en su lugar, en el grupo de los iguales. |
| Una llave vence en 30 días | Cada Admin recibe un aviso (una vez por etapa). |
| Una foto de Salud sin motivo | No se muestra (ni por la dirección de la foto). |
| La escucha de cambios se cae | Salud dice **REVISAR** en «Cambios al instante»; los cambios tardan hasta 15 segundos (60 las ciudades) y se reconecta sola cada 5 segundos. |

## Preguntas frecuentes
- **¿Puedo borrar un respaldo, un mantenimiento o un motivo?** No: nada de esto se borra; un mantenimiento se cancela.
- **¿Quién puede cambiar los interruptores?** Solo quien tiene Sistema · editar (el Admin), y cada cambio queda en la auditoría con antes y después.
- **¿La velocidad en teléfonos reales sabe quién es cada uno?** No. Cada página manda tres números al cerrarse (y la pantalla, ya sin nombres ni números);
  se suman por día. Si alguien manda de más desde la misma conexión, el resto se descarta.

## Lo que todavía no está
<!-- solo-equipo -->
En el sandbox, **Respaldos** muestra la semilla de pruebas: los respaldos reales, la restauración de prueba de cada semana, los despliegues con su
vuelta atrás y la página de mantenimiento ya están como código (9o; ver «Despliegues, respaldos y la vuelta atrás») y empiezan a correr cuando se encienda
producción (9t). Simbolizar los cierres nativos con los dSYM queda para cuando haya builds reales (9r).

## Flags por ciudad o porcentaje
- Además de `app.reportar`, **`app.ubicacion_vivo`** (la ruta en vivo del repartidor) se puede abrir solo en unas ciudades o a un porcentaje de repartidores; se decide por quien comparte su ubicación (la base no deja acotar un interruptor que se lee todo o nada).

## English

### What it does
- **Flags:** every platform switch, whether it is on, **where** (all cities, some cities or a percentage of people) and who changed it and when. Those with
  their own screen (El Compa, the apps, Push, the store listings, the web footer) are changed there; here they link to their section. By city or by
  percentage only those the code reads person by person (today: **Report a problem**); the rest are all-or-nothing and the database will not let them be
  limited. The percentage is stable: the same person always lands on the same side.
- **Health:** how the platform is doing now. Database uptime and timing, errors in the last 24 hours (server, web and apps), one row per service (the
  database, the sweep jobs, the push queue, the disk and errors) with the latest measurement (every 5 minutes), sweep tasks with errors, keys and
  certificates that expire and **scheduled maintenance**.
- **Instant changes (Health):** whether this server is listening for changes saved in the Super Admin (Settings, flags, cities, texts), since when,
  the last notice it received and how many. **LIVE:** what you change shows at once. **CHECK:** the server is reconnecting (every 5 seconds) and a
  change can take up to 15 seconds to show (60 for cities).
- **Backups:** what matters is that it can be restored: the **test restore** comes first (whether it restored, how long it took, the point in time and the
  rows it counted), then the latest of each kind (full database, continuous log, photos and the recovery key envelope) and the list. It warns if the
  database backup is older than 26 hours, if the latest restore failed or if there was no good one in 8 days.
- **States:** how each state of an admin screen looks (loading, empty, no results, error, no permission, someone else is on it, irreversible action, bulk
  action and stale data) and the System ones. Their buttons are examples: they change nothing.
- **Server errors:** if a page, an action or a route fails, the error arrives on its own, **masked** (no phones, emails, cards or field values) and grouped
  with identical ones. They show in Health and in System › Apps › Health, and «Live errors» notifies the Admins.
- **Keys that expire:** every keychain key with a date (certificates and tokens) notifies the Admins **30 days before**, at 7 days and when it expires; every
  replacement is logged with the old and new fingerprint.
- **Health photos («break glass»):** the photo of a help request with a clinic is shown to the team only after writing **why** it is needed. The reason goes
  to the audit log and the photo opens only for that person for 10 minutes.

### How to use it
- **Limit a flag:** Flags → tap it → **By city** (pick cities) or **By percentage** (cities and the percentage, 1 to 99) → **Save** → reason. To go back:
  **All cities**. All-or-nothing flags are turned on or off with their switch, with a reason.
- **Schedule maintenance:** Health → from and until (Hazleton time, 6 hours at most, at least one hour ahead) and the notice in Spanish and English →
  **Schedule** → reason. It is not edited: **cancel** it with a reason and schedule another.
- **See a Health photo:** in the help request (Queues) → **See with reason** → the reason (10 letters or more).

### What happens in each case
A flag at 10% in a city: people in that city who fall in its 10% have it; nobody from another city, nobody without an account. Going from 10 to 20%: people
are added; those who had it keep it. Limiting an all-or-nothing flag: «This flag is read all-or-nothing», and the database refuses too. A service not doing
well: its row says **CHECK** and the top says how many to check. A sweep task that says «N de M fallaron (…)» (N of M failed): of the M items it went
through (plans, sponsorships, charges, refunds…), N threw an error and the rest were done; the ones in parentheses are retried every minute and the task
stays red until they are fixed. Two maintenance windows at the same time: «There is already maintenance at that time.» The
database backup older than 26 hours: Backups says so at the top in red. A server error with a phone in the message: stored with «[tel]» instead, in the group
of identical ones. A key expiring in 30 days: each Admin gets one notice per stage. A Health photo without a reason: it is not shown (not even by its address).

### FAQ
- **Can I delete a backup, a maintenance window or a reason?** No: none of this is deleted; maintenance is cancelled.
- **Who can change flags?** Only those with System · edit (the Admin), and every change goes to the audit log with before and after.
- **Speed on real phones (Health):** LCP, INP and CLS measured on people's own phones and computers, last 7 days per screen, as % of good
  measurements (GOOD if 75 % or more are good in all three; CHECK if more than 25 % are poor in one). Only numbers per day and screen (business names
  and order numbers become «:x»): never who, their phone or their address. Flag **app.vitals** turns it off.

### What is not here yet
<!-- solo-equipo -->
In the sandbox, **Backups** shows the test seed: real backups, the weekly test restore, deploys with rollback and the maintenance page are already code
(9o; see «Deploys, backups and rollback») and start running when production is turned on (9t). Symbolicating native crashes with dSYMs waits for real
builds (9r).

### Flags by city or percentage
- Besides `app.reportar`, **`app.ubicacion_vivo`** (the driver's live route) can be opened only in some cities or to a percentage of drivers; it is decided by the person sharing their location (the database does not let you limit a flag that is read all-or-nothing).
