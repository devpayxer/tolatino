# Super Admin: Configuración · Super Admin: Settings

_Pantallas: **Super Admin › Sistema › Configuración** (`/admin/sistema/configuracion`; pestañas Equipo y permisos · Configuración). Teléfono y
escritorio. Ver: permiso de Sistema. Cambiar: **solo un Admin**. Versión: 14 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- Junta en un solo lugar los **plazos y límites de la plataforma** que antes vivían escritos en el código: los de la Comunidad y los de
  Doctores, Profesionales, Noche, Educación, Niños, Deporte, Iglesias, Bienes Raíces y Autos. Cada valor tiene **unidad**, **valor de fábrica**, **mínimo y máximo**, y quién lo cambió por última vez.
- Por sección: **Comunidad** (publicaciones, comentarios, votos, conversaciones nuevas y reportes por persona al día; minutos para editar una
  publicación; días para apelar; lo más que dura una encuesta; «Ver traducción» por hora; hora del resumen diario; días que se proponen para
  un cupón) · **Gamification** (tope de puntos al día) · **Doctores y Profesionales** · **Noche** · **Educación · Niños · Deporte** ·
  **Iglesias · Bienes Raíces · Autos** · **Eventos** (evento privado: depósito de fábrica 25 %, cancelar gratis 72 h, el restaurante responde
  en 24 h, una propuesta vale 24 h, anticipación mínima 3 días, hasta 180 días adelante, 3 solicitudes abiertas por persona, 10 propuestas y
  3 «pedir un cambio» por solicitud; el plazo para cancelar queda escrito en cada propuesta al mandarla).
- **CAMBIADO**: el valor ya no es el de fábrica.
- **SOLO LECTURA**: el valor ya se lee de aquí, pero todavía no se cambia porque algún texto que ve la persona dice el número (por ejemplo
  «24 h»). La fila dice cuál. Se abre cuando ese texto lea el valor (anotado en LAUNCH-CHECKLIST).
- **Se cambia en su pantalla**: el tope del cargo del dealer va a Catálogo › Cargo del dealer (al bajarlo, baja a los dealers que lo pasan).
- **Auto-ocultar por reportes** se ve aquí y se cambia en Contenido › Auto-moderación, junto con el interruptor de su regla.

## Cómo se usa
1. Toca el valor. 2. Escribe el valor nuevo (número entero). 3. Elige o escribe el motivo. 4. **Guardar**.
- Aplica **desde ahora en todas las ciudades**. Lo que ya pasó no cambia (una publicación editada sigue editada).
- Queda en la auditoría con **antes → después**, quién y el motivo.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Valor dentro de sus límites | Se guarda, aplica al instante y queda en la auditoría. |
| Fuera de sus límites (p. ej. 2 min para editar, mínimo 5) | «Entre 5 min y 1,440 min.» No se guarda. La base también lo rechaza. |
| No es un número entero | «Escribe un número entero.» |
| El mismo valor | «Ya tiene ese valor.» |
| Fila SOLO LECTURA | «Todavía no se cambia aquí: …» con el motivo. |
| No eres Admin | Ves los valores; «Solo un Admin cambia la configuración.» |
| Límites del día y traducciones | También se cambian en Contenido › Auto-moderación: es el mismo valor y la misma auditoría. |
| Varios servidores | Todos ven el valor nuevo al momento: la base les avisa del cambio. Si un servidor perdió ese aviso (se reinició la conexión), lo ve en 15 segundos como mucho. |
| Topes por minuto (errores, Wallet, la posición del repartidor) | Se cuentan entre todos los servidores juntos: un tope de 600 por minuto son 600 en total, no 600 en cada servidor. |

## Preguntas frecuentes
- **¿Bajar los minutos para editar afecta lo ya publicado?** Desde ese momento, solo se edita lo que esté dentro del plazo nuevo.
- **¿Cómo vuelvo al valor de fábrica?** Escribe el valor de fábrica que dice la fila (motivo «Volver al de fábrica»).
- **¿Por qué hay valores que no puedo cambiar?** Porque una pantalla le dice el número a la persona; cambiarlo aquí haría falso ese texto.

## Soporte
La sección **Soporte**: horas hábiles para la primera respuesta de un caso (8), días que atiende el equipo (5 = lunes a viernes; 6 hasta el
sábado; 7 todos los días), hora en que empieza (9) y termina (18), casos que una persona abre al día (5; uno de seguridad nunca se frena),
**tope de devolución del rol Soporte** por caso (5000 centavos = $50; más lo devuelven Finanzas o un Admin) y días para reabrir un caso resuelto
(7). Las pantallas de Soporte, Mi cuenta (también Avisos › Soporte), el panel y El Compa dicen el horario con estos valores (arriba de la
sección sale cómo lo dicen: «El equipo atiende lunes a viernes, de 9 AM a 6 PM»); el plazo de cada caso lo calcula la base con ellos, y el
tope lo lee la base en el momento de devolver.

**English:** the **Support** section: business hours to first reply (8), days the team works (5 = Mon–Fri), start (9) and end (18) hour, cases
per person per day (5; safety cases are never blocked), the **Support role refund cap** per case (5000 cents = $50; Finance or an Admin refund
more) and days to reopen a resolved case (7). Screens read the hours from here; the database computes each case deadline and reads the cap at
refund time.

## El Compa
La sección **El Compa**: tope de gasto del mes (10000 centavos = $100; 0 = sin IA), aviso antes del tope (80 %), espera máxima de la IA (8000
ms; pasado eso contestan las reglas fijas), respuesta más larga, mensajes por persona en una hora (20) y en un día (60), turnos por conversación
(20), cierre de una conversación (24 h), vencimiento de una acción preparada (15 min), operaciones de la persona que ve El Compa (10),
**cuánto se guardan las conversaciones (12 meses; después solo cifras)**, los límites de las respuestas automáticas, del copiloto y de WhatsApp y
SMS (enlace de un uso, mensajes al día, retención del registro de entrada), y la ayuda que lee (trozos y umbral). Abajo, **MODELO DE CADA
PAPEL**: el modelo de vecinos, panel y respuestas (Claude Haiku 5.5) y el del copiloto del equipo (Claude Sonnet 5.5). Se elige entre los
modelos encendidos de la lista de precios (el simulador nunca); un modelo no tiene dos papeles; el precio de cada uno no se escribe en el
código. Solo un Admin, con motivo y auditoría; vale desde la llamada siguiente. «Si no contestas en» de las respuestas automáticas sigue en
**SOLO LECTURA** (hoy solo contestan fuera del horario del negocio).

**English:** the **El Compa** section: monthly cap ($100), warning (80 %), maximum AI wait, longest answer, messages per person per hour and per
day, turns, closing, action expiry, operations it sees, **how long conversations are kept (12 months; then numbers only)**, auto-reply, copilot
and WhatsApp/SMS limits, and the help it reads. **MODEL FOR EACH ROLE** picks the everyday model and the copilot model among the models turned on
in the price list (never the simulator; one role each); Admin only, with a reason and audit.

## Para El Compa
<!-- solo-equipo -->
- Explica qué hace cada valor y su valor actual (la pantalla lo dice); nunca cambies un valor por alguien: solo un Admin, con motivo.

## Eventos
La sección **Eventos** va en subgrupos: **Publicar y revisar** (revisión 24 h, fechas de una serie 52, días hacia adelante 180, fotos 6, días
seguidos 30) · **RSVP y venta** (el RSVP guarda el lugar 30 min, boletos guardados mientras pagas 8 min, 10 por orden, 20 por persona y fecha,
intentos de código, apartados a la vez) · **Después de comprar** (transferir hasta 2 h antes, cancelar con devolución hasta 24 h antes, 30 min para
pagar el lugar de la lista de espera, 50 cortesías por fecha, 10 transferencias al día) · **Cambios y pago al organizador** (3 avisos por fecha,
día de pago, retener el primer evento desde $2,000, cancelaciones que abren un caso y su plazo, ajuste, devoluciones al momento) · **Avisos y
recordatorios** (hora del recordatorio del día antes, 10 AM; aviso de vendido al organizador, 90 %) · **La puerta** · **Evento privado** ·
**Confianza** (órdenes desde un mismo dispositivo y en cuántos minutos; boletos recibidos y pasados a otro). Cada texto que ve la persona lee el
valor (por ejemplo «te guardamos boletos y mesa por 8 minutos», «se activa 2 horas antes»). **Día de pago de eventos** (1 = lunes … 7 =
domingo; de fábrica 2 = martes) ya se cambia aquí: el panel (Eventos y Cobros), Liquidaciones y la ayuda dicen el día de la clave («te llega
el martes después del evento»). **Pagos al banco · el día** sigue fijo (los martes, decisión del fundador).

**English:** the **Events** section is grouped (publish and review, RSVP and sales, after purchase, changes and organizer payouts, notices and
reminders, the door, private events, trust). Every customer-facing text reads the value. **Event payout day** (1 = Monday … 7 = Sunday;
factory 2 = Tuesday) can now be changed here: the dashboard (Events and Payouts), Settlements and help say that day. **Bank payouts · the day**
stays fixed (Tuesdays, founder decision). The Education, Kids and Sports limits (reply, waitlist offer, membership cancellation, deleting a child's data) and the Visits and
Churches limits (reply, «It happened», deleting private data) can now be changed here too: their screens and notices show this value.

## Apps
La sección **Apps** muestra el build mínimo y el de aviso de cada app y plataforma (To'Latino, Negocios, Repartidor y Puerta, en iPhone y
Android). Se cambian en **Sistema › Apps** (fila «Se cambia en su pantalla»), porque allí además se revisa que el aviso quede por encima del
mínimo. Ver la ayuda «Super Admin: Apps».

También en **Apps**, la **ubicación del repartidor durante la entrega**: cada cuánto manda su posición (5–60 s, 10 por defecto), la distancia
mínima (25 m), los **días que se guarda** (1–90, **14**: para aclarar un reclamo; después solo queda la distancia y el tiempo), si **el cliente ve
el mapa** desde «Recogí» (1) o nunca (0), la **velocidad imposible** (una posición más rápida se rechaza) y cuándo una posición es **vieja**. El
recorrido de una entrega se ve en **Transacciones › Ver recorrido**, solo escribiendo el motivo, que queda en la auditoría.

Y la **tubería de las apps**: cuántas veces por hora el equipo puede **pedir un build** (1–20, **4**), cuántos **intentos rechazados por
minuto** aguanta antes de contestar «espera» sin revisar más (10–1000, **60**) y el **tamaño máximo** de un archivo que sube el CI (10–500 MB,
**200**). Ver «Super Admin: la tubería de las apps».

Y las **fichas y cuentas de revisión**: cuántas veces por hora una cuenta de revisión puede pedir su código fijo (1–30, **10**) y cuántas veces por día
se pueden subir las fichas como borrador a las tiendas (1–20, **6**). Ver «Super Admin: fichas de las tiendas y cuentas de revisión».

Y la **analítica**: cuántos **meses se guarda cada evento** (1–36, **13**, lo que dicen las fichas de las tiendas). Pasado ese tiempo el barrido
resume el mes por día y ciudad y suelta los eventos uno por uno: las cifras de Analítica siguen, lo de cada persona no. Si lo cambias, cambia
también el inventario de datos de las tiendas (Sistema › Apps).

Los **topes por minuto** de esta sección (errores por minuto y por teléfono, pedidos de Wallet por dirección) se cuentan **entre todos los
servidores juntos**, y lo descartado por el tope de errores se cuenta en las últimas 24 horas (Sistema › Apps).

**English:** the **Apps** section shows each app's minimum and notice build per platform; they are changed in **System › Apps**, which also
checks that the notice build stays above the minimum. Also in **Apps**: the **driver location during a delivery** (how often, minimum distance, **days kept** — 14 by default, max 90 —, whether the
**customer sees the map** from pickup, the **impossible speed** and when a position is stale). A delivery route is opened in **Transactions ›
View route** only with a written reason, which is audited. And the **app pipeline**: how many builds per hour the team can **request** (4), how
many **rejected attempts per minute** it takes before answering «wait» (60) and the **max size** of a file the CI uploads (200 MB).

## Noche: plazos y el corte de las 6 PM
- **Noche** ya se cambia aquí: cuánto responde el local una mesa (`noche_responder_min`), cuánto se guarda la mesa (`noche_mesa_guardada_min`), cuánto dura la fila «ahora» (`noche_fila_viva_min`) y el **corte para cancelar gratis** (`noche_corte_min`, 360 = 6 PM; nunca cae a menos de 2 h antes de la llegada).
- Cada reserva copia el corte al reservar: un cambio solo toca las nuevas. La reserva dice los minutos de verdad que le quedan al local.

**¿Por qué otros plazos siguen en «solo lectura»?** Porque sus textos en pantalla todavía dicen el número escrito («24 h», «30 días»); se abren cuando cada texto lee el valor. Ya se cambian aquí también los de Educación, Niños y Deporte (responder, la oferta de la lista de espera, la baja de una membresía, el borrado de los datos del niño) y los de Visitas e Iglesias (responder, «Pasó», el borrado de lo privado): sus pantallas y avisos dicen el valor de aquí.

## Claves nuevas: el Repartidor y «Me lo devolvieron»
- **Repartidor › Ofrecer solo · ofertas antes de avisar al negocio** (`rep_auto_intentos`, 3; 1–10).
- **Repartidor › Pedido programado · se ofrece y se avisa antes de estar listo** (`rep_programado_min`, 30 min; 10–120).
- **Iglesias, Bienes Raíces y Autos › «Me lo devolvieron» se cierra sola si nadie contesta en** (`ayuda_devuelto_dias`, 14 días; 7–60).

## Hogar y Auto, y el techo de Free
- **Hogar y Auto** (sección nueva): **Pre-estimado con fotos · horas para responder** (`sol_pre_h`, 24 h; 2–72), **Presupuesto a hasta 3 ·
  horas para responder** (`sol_pq_h`, 48 h; 12–120), **Emergencia 24/7 · minutos para que alguien acepte** (`sol_em_min`, 15 min; 5–60) y
  **Apartado en Auto y Hogar · horas que se guarda** (`apartado_h`, 48 h; 12–168; las Tiendas eligen las suyas en su herramienta). Cada
  solicitud y cada apartado guardan el plazo con que se enviaron: un cambio solo toca los nuevos. Las pantallas y los avisos dicen el valor.
- **Dinero › Plan Free · pedidos o citas en línea al mes** (`free_ops_cap`, 10; 0–1000): el techo de un negocio Free (pedidos, citas,
  reservas y solicitudes en línea, por mes de su ciudad). Al llegar, su página muestra Llamar. El panel (Plan, Menú, Servicios) y el Super
  Admin (Planes, Catálogo) dicen el valor.
- **Licencias:** el aviso de revisión (`lic_aviso_dias`, 14 días) también lo dice Analítica («POR VENCER EN 14 DÍAS»).

## English

### What it does
- It gathers in one place the **deadlines and limits of the platform** that used to be written into the code: those of the Community and those
  of Doctors, Professionals, Night, Education, Kids, Sports, Churches, Real Estate and Cars. Each value has a **unit**, a **factory value**, a
  **minimum and maximum**, and who changed it last.
- By section: **Community** (posts, comments, votes, new conversations and reports per person per day; minutes to edit a post; days to
  appeal; the longest a poll can last; «See translation» per hour; time of the daily summary; days proposed for a coupon) · **Gamification**
  (daily points cap) · **Doctors and Professionals** · **Night** · **Education · Kids · Sports** · **Churches · Real Estate · Cars** ·
  **Events** (private event: factory deposit 25 %, free cancellation 72 hours, the restaurant replies within 24 hours, a proposal is valid for 24
  hours, minimum notice 3 days, up to 180 days ahead, 3 open requests per person, 10 proposals and 3 «ask for a change» per request; the
  cancellation deadline is written on each proposal when it is sent).
- **CHANGED**: the value is no longer the factory one.
- **READ-ONLY**: the value is already read from here, but it cannot be changed yet because some text the person sees states the number (for
  example «24 h»). The row says which one. It opens once that text reads the value (noted in LAUNCH-CHECKLIST).
- **Changed on its own screen**: the dealer fee cap goes to Catalog › Dealer fee (lowering it lowers the dealers who are above it).
- **Auto-hide by reports** shows here and is changed in Content › Auto-moderation, together with the switch of its rule.

### How to use it
1. Tap the value. 2. Type the new value (a whole number). 3. Choose or type the reason. 4. **Save**.
- It applies **from now on in all cities**. What already happened does not change (an edited post stays edited).
- It goes into the audit trail with **before → after**, who and the reason.

### What happens in each case
| Case | What happens |
|---|---|
| Value within its limits | It is saved, applies at once and goes into the audit trail. |
| Outside its limits (e.g. 2 min to edit, minimum 5) | «Between 5 min and 1,440 min.» It is not saved. The database rejects it too. |
| Not a whole number | «Type a whole number.» |
| The same value | «It already has that value.» |
| READ-ONLY row | «It cannot be changed here yet: …» with the reason. |
| You are not an Admin | You see the values; «Only an Admin changes settings.» |
| Daily limits and translations | They are also changed in Content › Auto-moderation: it is the same value and the same audit trail. |
| Several servers | All of them see the new value right away: the database tells them about the change. If a server missed that notice (its connection restarted), it sees the value within 15 seconds at most. |
| Per-minute caps (errors, Wallet, the driver's position) | They are counted across all servers together: a cap of 600 per minute is 600 in total, not 600 on each server. |

### FAQ
- **Does lowering the minutes to edit affect what is already posted?** From that moment on, only what is within the new deadline can be edited.
- **How do I go back to the factory value?** Type the factory value shown in the row (reason «Back to default»).
- **Why are there values I cannot change?** Because a screen tells the person the number; changing it here would make that text false.

### Support
The **Support** section: business hours for the first reply to a case (8), days the team works (5 = Monday to Friday; 6 up to Saturday; 7
every day), the hour it starts (9) and ends (18), cases one person opens per day (5; a safety case is never held back), the **Support role
refund cap** per case (5000 cents = $50; Finance or an Admin refund more) and days to reopen a resolved case (7). The Support screens, My
account (also Notifications › Support), the dashboard and El Compa state the hours with these values (at the top of the section it shows how
they say it: «The team is available Monday to Friday, 9 AM to 6 PM»); the database computes each case's deadline with them, and it reads the
cap at the moment of the refund.

### El Compa
The **El Compa** section: the monthly spending cap (10000 cents = $100; 0 = no AI), the warning before the cap (80 %), the longest wait for
the AI (8000 ms; after that the fixed rules answer), the longest reply, messages per person per hour (20) and per day (60), turns per
conversation (20), closing a conversation (24 hours), expiry of a prepared action (15 minutes), operations of the person that El Compa sees
(10), **how long conversations are kept (12 months; after that, numbers only)**, the limits for auto-replies, for the copilot and for WhatsApp
and SMS (one-use link, messages per day, retention of the incoming log), and the help it reads (chunks and threshold). Below, **MODEL FOR EACH
ROLE**: the model for neighbors, dashboard and replies (Claude Haiku 5.5) and the team copilot's model (Claude Sonnet 5.5). You choose among
the models turned on in the price list (never the simulator); a model does not have two roles; each one's price is not written in the code.
Only an Admin, with a reason and an audit trail; it applies from the next call. «If you do not reply in» for auto-replies is still
**READ-ONLY** (today they only answer outside the business's hours).

### For El Compa
<!-- solo-equipo -->
- Explain what each value does and its current value (the screen says it); never change a value for someone: only an Admin, with a reason.

### Events
The **Events** section is in subgroups: **Publish and review** (24-hour review, dates in a series 52, days ahead 180, photos 6, consecutive
days 30) · **RSVP and sales** (an RSVP holds the spot for 30 minutes, tickets held while you pay 8 minutes, 10 per order, 20 per person and
date, code attempts, holds at the same time) · **After purchase** (transfer up to 2 hours before, cancel with a refund up to 24 hours before,
30 minutes to pay for the waitlist spot, 50 comps per date, 10 transfers per day) · **Changes and payment to the organizer** (3 notices per
date, payout day, holding the first event from $2,000, cancellations that open a case and their deadline, adjustment, instant refunds) ·
**Notices and reminders** (time of the day-before reminder, 10 AM; sold-out notice to the organizer, 90 %) · **The door** · **Private event** ·
**Trust** (orders from one device and in how many minutes; tickets received and passed on to someone else). Each text the person sees reads
the value (for example «we hold tickets and a table for 8 minutes», «it turns on 2 hours before»). **Event payout day** (1 = Monday … 7 =
Sunday; factory 2 = Tuesday) can now be changed here: the dashboard (Events and Payouts), Settlements and the help state the day of the key
(«it reaches you on Tuesday after the event»). **Bank payouts · the day** stays fixed (Tuesdays, a founder decision). The Education, Kids and
Sports limits (reply, waitlist offer, membership cancellation, deleting a child's data) and the Visits and Churches limits (reply, «It
happened», deleting private data) can now be changed here too: their screens and notices show this value.

### Apps
The **Apps** section shows each app's minimum build and notice build for every platform (To'Latino, Business, Driver and Door, on iPhone and
Android). They are changed in **System › Apps** (row «Changed on its own screen»), because there it is also checked that the notice build
stays above the minimum. See the help «Super Admin: Apps».

Also in **Apps**, the **driver's location during delivery**: how often they send their position (5–60 s, 10 by default), the minimum distance
(25 m), the **days it is kept** (1–90, **14**: to settle a claim; after that only the distance and the time remain), whether **the customer
sees the map** from «Picked up, on my way» (1) or never (0), the **impossible speed** (a faster position is rejected) and when a position is
**stale**. The route of a delivery is seen in **Transactions › See route**, only by writing the reason, which goes into the audit trail.

And the **app pipeline**: how many times per hour the team can **request a build** (1–20, **4**), how many **rejected attempts per minute** it
takes before answering «wait» without checking further (10–1000, **60**) and the **maximum size** of a file the CI uploads (10–500 MB,
**200**). See «Super Admin: the app pipeline».

And the **store listings and review accounts**: how many times per hour a review account can ask for its fixed code (1–30, **10**) and how
many times per day the listings can be uploaded as drafts to the stores (1–20, **6**). See «Super Admin: store listings and review accounts».

And **analytics**: how many **months each event is kept** (1–36, **13**, what the store listings say). After that time the sweep summarizes
the month by day and city and drops the events one by one: the Analytics figures stay, what belongs to each person does not. If you change
it, the stores' data inventory (System › Apps) changes too.

The **per-minute caps** of this section (errors per minute and per phone, Wallet requests per address) are counted **across all servers
together**, and what the error cap discards is counted over the last 24 hours (System › Apps).

### Night: deadlines and the 6 PM cutoff
- **Night** can now be changed here: how long the venue has to answer a table request (`noche_responder_min`), how long the table is held
  (`noche_mesa_guardada_min`), how long the «now» queue lasts (`noche_fila_viva_min`) and the **cutoff for free cancellation**
  (`noche_corte_min`, 360 = 6 PM; it never falls below 2 hours before arrival).
- Each reservation copies the cutoff when it is booked: a change only affects new ones. The reservation shows the minutes the venue really has left.

**Why do other deadlines remain «read-only»?** Because their on-screen texts still state the number written out («24 h», «30 days»); they open
once each text reads the value. The ones for Education, Kids and Sports (replying, the waitlist offer, ending a membership, deleting the
child's data) and for Visits and Churches (replying, «It happened», deleting private data) can already be changed here too: their screens and
notices show the value from here.

### New keys: the Driver and «They refunded me»
- **Driver › Offer only · offers before notifying the business** (`rep_auto_intentos`, 3; 1–10).
- **Driver › Scheduled order · offered and announced before it is ready** (`rep_programado_min`, 30 minutes; 10–120).
- **Churches, Real Estate and Cars › «They refunded me» closes by itself if nobody answers within** (`ayuda_devuelto_dias`, 14 days; 7–60).

### Home and Auto, and the Free ceiling
- **Home and Auto** (new section): **Pre-estimate with photos · hours to reply** (`sol_pre_h`, 24 hours; 2–72), **Quote from up to 3 · hours
  to reply** (`sol_pq_h`, 48 hours; 12–120), **24/7 emergency · minutes for someone to accept** (`sol_em_min`, 15 minutes; 5–60) and **Hold in
  Auto and Home · hours it is held** (`apartado_h`, 48 hours; 12–168; Stores choose their own in their tool). Each request and each hold keep
  the deadline they were sent with: a change only affects new ones. The screens and notices state the value.
- **Money › Free plan · online orders or appointments per month** (`free_ops_cap`, 10; 0–1000): the ceiling for a Free business (online
  orders, appointments, reservations and requests, per month of its city). When it is reached, its page shows Call. The dashboard (Plan, Menu,
  Services) and the Super Admin (Plans, Catalog) state the value.
- **Licenses:** the review notice (`lic_aviso_dias`, 14 days) is also stated by Analytics («EXPIRING IN 14 DAYS»).
