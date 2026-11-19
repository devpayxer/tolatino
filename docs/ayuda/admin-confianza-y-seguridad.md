# Super Admin: Confianza y seguridad, Auto-moderación y casos de la Comunidad · Super Admin: Trust & safety, auto-moderation and Community cases

_Pantallas: **Confianza y seguridad** (`/admin/confianza`: Resumen · Catálogo de sanciones · Sancionados · Apelaciones · Fraude y bloqueos ·
Privacidad), **Contenido › Auto-moderación** (`/admin/contenido?tab=auto`) y **Colas** (Reportes de contenido, Reportes de usuario, Mensajes
reportados, Medios marcados, Apelaciones). Permisos: Colas pide colas:aprobar; Auto-moderación pide cont:editar; Confianza pide conf:ver; banear, solo
un Admin. Versión: 7 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Resumen:** reportes abiertos, apelaciones, sanciones activas y fraude de 30 días; lo que espera en cada cola (con lo que va fuera de
  plazo) y cómo funciona: reporte o regla → una persona decide con motivo → aviso a la persona + apelación 14 días → otra persona revisa.
- **Colas › Reportes de contenido (publicación o comentario de la Comunidad):** el texto, las fotos, el estado (visible mientras decides;
  «Oculta por reportes» si se ocultó sola), los reportes (motivo, nota, quién, rango) y lo que marcaron las reglas. **Se queda** (si estaba
  auto-oculta, vuelve y su autor recibe el aviso) u **Ocultar** con motivo y sanción opcional. Quienes reportaron reciben el resultado.
- **Colas › Reportes de usuario:** la persona (360°), sus cifras (publicaciones, ocultos, reseñas sin transacción en 24 h, dispositivos y
  otras cuentas en ellos), los reportes, lo que marcaron rev5 y la red de cuentas, y su historial. **Sin acción** o **Sancionar**.
- **Colas › Medios marcados (fotos de la Comunidad):** la foto que el modelo propio marcó o no pudo revisar. **No se ve** hasta que decides:
  «Está bien» la publica; «Quitar foto» avisa con el motivo y abre la apelación.
- **Colas › Medios marcados · Foto de Mensajes:** la foto de un mensaje entre un vecino y un negocio que el modelo marcó o no pudo revisar.
  Es privada: la ves solo por este caso (o por una conversación reportada) y cada vez queda en la auditoría («mensajes.foto.ver»); el texto
  de la conversación no se lee desde aquí. «Está bien» → la otra persona la ve (en vivo si tiene la conversación abierta); «Quitar foto» → en la
  conversación sale «Foto quitada por To'Latino» y quien la mandó recibe el motivo. En **Mensajes reportados** cada mensaje con foto muestra la
  foto (y «FOTO EN REVISIÓN» si todavía espera).
- **Colas › Medios marcados · Foto de Mensajes entre vecinos** (19 nov): lo mismo para la foto de un mensaje entre dos vecinos (Comunidad ›
  Mensajes). Ves solo la foto y quién la mandó: ni el texto ni la otra persona (los mensajes entre vecinos solo se leen con un reporte abierto,
  en **Mensajes entre vecinos** reportados, donde cada mensaje con foto también la muestra). Verla queda en la auditoría («mensajes.foto.ver»);
  «Está bien» / «Quitar foto» como arriba.
- **Colas › Apelaciones:** quién apela, qué, el motivo que recibió, lo que escribió, lo apelado y su historial. **Levantar** (vuelve el
  contenido o termina la sanción; los casos abiertos de ese contenido se cierran) o **Mantener** (final). **Si tú lo ocultaste o sancionaste,
  ves un candado y no la puedes decidir** (la base tampoco lo permite).
- **Catálogo de sanciones** con su efecto en la Comunidad: advertencia (nada), silencio 7 días (no publica, comenta ni escribe; sí lee,
  vota, reporta), bloquear publicación 30 días (no publica; sí comenta), suspender 14 días y banear (no entra; banear, solo Admin).
- **Fraude y bloqueos:** redes de votos y de seguidores desde un mismo dispositivo, reseñas en ráfaga (30 días), dispositivos con 3 cuentas o
  más (90 días) y cuántos dispositivos están bloqueados (se bloquean en Usuarios › 360°).
- **Privacidad:** solo lectura.
- **Contenido › Auto-moderación:** las reglas con su interruptor y su texto: Teléfonos (siempre activa: la impone la base), Direcciones de
  personas, Enlaces y ventas repetidas (3 en 24 h), Lenguaje discriminatorio (listas), Reseñas en ráfaga (5 en 10 min), Fotos (modelo
  propio; dice si **responde** y, si está apagada o no responde, qué pasa con las fotos) y Auto-ocultar por reportes (5 personas distintas
  en 24 h, cuentas de más de 72 h). «Cambiar valores» edita sus números. **Listas de términos** ES/EN (Odio · Estafa · Inmigración ·
  Autolesión): agregar o apagar (no se borran). **Límites del día** (publicaciones, comentarios, votos, conversaciones nuevas, reportes).
  Todo con motivo y auditoría.
- **Contenido › Auto-moderación › Ver traducción (traductor propio)**: si el traductor propio (español ↔ inglés, en nuestro servidor)
  **responde** y en cuánto, o por qué no («no está configurado aquí», «no responde», o «dejó de llamarlo un minuto» tras varias fallas);
  y el **tope de traducciones por persona en una hora** (de fábrica 60; «Cambiar» con motivo y auditoría). El Super Admin **ve siempre el
  original**: aquí no hay «Ver traducción» (ver `ver-traduccion.md`).

## Qué pasa en cada caso
- **Cinco cuentas del mismo teléfono reportan:** cuentan como una persona; no se oculta. Si son de un mismo dispositivo y votan a favor de
  alguien, los votos no cuentan y el barrido abre «Posible red de cuentas».
- **La regla de fotos está encendida y el servicio no responde:** cada foto nueva espera en Medios marcados (cerrado, nunca publicado sin
  revisar). La pantalla lo dice.
- **Ocultas algo que ya estaba auto-oculto:** ahora lo decidiste tú; la apelación la decide otra persona.
- **Autolesión:** caso con prioridad; la persona ya vio la línea del 988. Escríbele con cuidado.
- **Inmigración:** prioridad. Los avisos de operativos se permiten sin fotos de personas, placas ni direcciones; señalar el estatus de
  alguien se oculta.
- **Una sanción a alguien del equipo:** no se aplica desde aquí (Sistema › Equipo).

## Preguntas frecuentes
- **¿Puedo leer los mensajes de dos vecinos?** Solo con un reporte abierto de esa conversación, o el mensaje apelado mientras la apelación
  está abierta.
- **¿Por qué no puedo decidir una apelación?** Porque tú ocultaste o sancionaste eso; la decide otra persona.
- **¿Se puede borrar una marca o una apelación?** No: son de solo inserción.

## Para El Compa
<!-- solo-equipo -->
- Nunca digas quién reportó. Nunca prometas el resultado de una apelación.
- La apelación la decide otra persona del equipo, en 72 h, una vez.

### Configuración
- Los **límites del día** y **«Ver traducción» por hora** de Contenido › Auto-moderación son valores de **Sistema › Configuración**: se
  cambian en cualquiera de las dos pantallas, siempre dentro de sus límites y con la auditoría antes → después. Los **días para apelar**
  (14 de fábrica) también; Colas y Confianza dicen el valor vigente.

## Eventos y boletos
**Fraude › EVENTOS Y BOLETOS · 30 DÍAS:** órdenes en ráfaga desde un mismo dispositivo (cuántas y en cuántos minutos: Configuración › Eventos ›
Confianza), boletos recibidos por transferencia y pasados a otra persona (transferencias en cadena: posible reventa), entradas duplicadas en la
puerta (dos porteros sin conexión) y contracargos de boletos (90 días). La señal no sanciona sola: **Abrir caso** (quien edita personas) lo manda a
Colas › Reportes de usuario con la marca «Señal de Eventos»; lo decide una persona con la escalera de sanciones, el aviso y la apelación. La misma
tarjeta en varias cuentas necesita la huella de la tarjeta de Stripe (LAUNCH-CHECKLIST).
**English:** Fraud › EVENTS AND TICKETS lists burst orders from one device, chain transfers, duplicate door entries and ticket chargebacks; **Open
case** sends it to Queues › User reports.

## English

### What it does
- **Overview:** open reports, appeals, active sanctions and 30-day fraud; what waits in each queue (including what is past its deadline) and how it
  works: a report or a rule → a person decides with a reason → the person is notified + a 14-day appeal → another person reviews it.
- **Queues › Content reports (a Community post or comment):** the text, the photos, the status (visible while you decide; «Hidden by reports
  (auto)» if it hid itself), the reports (reason, note, who, rank) and what the rules flagged. **Keep** (if it was auto-hidden, it comes back
  and its author gets the notice) or **Hide** with a reason and an optional sanction. The people who reported get the result.
- **Queues › User reports:** the person (360°), their numbers (posts, hidden items, reviews with no transaction in 24 hours, devices and
  other accounts on them), the reports, what rev5 and the account network flagged, and their history. **No action** or **Sanction**.
- **Queues › Flagged media (Community photos):** the photo that our own model flagged or could not check. It is **not shown** until you
  decide: «It's fine» publishes it; «Remove photo» notifies the person with the reason and opens the appeal.
- **Queues › Flagged media · Messages photo:** the photo in a message between a neighbor and a business that the model flagged or could not
  check. It is private: you see it only through this case (or a reported conversation) and every view is logged («mensajes.foto.ver»); the
  conversation text is not readable from here. «It's fine» → the other person sees it (live if they have the conversation open); «Remove photo» →
  the conversation shows «Photo removed by To'Latino» and the sender gets the reason. In **Reported messages** each message with a photo shows
  it (and «PHOTO IN REVIEW» if it is still waiting).
- **Queues › Flagged media · Neighbor messages photo** (Nov 19): the same for the photo in a message between two neighbors (Community ›
  Messages). You only see the photo and who sent it: not the text or the other person (messages between neighbors are only readable with an open
  report, in reported **Messages between neighbors**, where each message with a photo also shows it). Viewing it is logged («mensajes.foto.ver»);
  «It's fine» / «Remove photo» as above.
- **Queues › Appeals:** who is appealing, what, the reason they were given, what they wrote, what is being appealed and their history.
  **Lift** (the content comes back or the sanction ends; open cases on that content are closed) or **Uphold** (final). **If you hid or
  sanctioned it, you see a lock and cannot decide it** (the database does not allow it either).
- **Sanction catalog** with the effect of each on the Community: warning (nothing), silence for 7 days (cannot post, comment or write; can
  still read, vote and report), block posting for 30 days (cannot post; can still comment), suspend for 14 days and ban (cannot get in; only an
  Admin can ban).
- **Fraud and blocks:** vote and follower rings from one device, review bursts (30 days), devices with 3 or more accounts (90 days) and how
  many devices are blocked (they are blocked in Users › 360°).
- **Privacy:** read-only.
- **Content › Auto-moderation:** the rules with their switch and their text: Phones (always on: the database enforces it), Addresses of
  people, Repeated links and sales (3 in 24 hours), Discriminatory language (lists), Review bursts (5 in 10 minutes), Photos (our own model;
  it says whether it **responds** and, if it is off or not responding, what happens to photos) and Auto-hide by reports (5 different people
  in 24 hours, accounts older than 72 hours). «Change values» edits their numbers. **Term lists** ES/EN (Hate · Scam · Immigration ·
  Self-harm): add or turn off (they are never deleted). **Daily limits** (posts, comments, votes, new conversations, reports). Everything
  with a reason and an audit trail.
- **Content › Auto-moderation › See translation (our own translator)**: whether our own translator (Spanish ↔ English, on our server)
  **responds** and how fast, or why not («not configured here», «not responding», or «stopped calling it for a minute» after several
  failures); and the **cap on translations per person per hour** (default 60; «Change» with a reason and an audit trail). The Super Admin
  **always sees the original**: there is no «See translation» here (see `ver-traduccion.md`).

### What happens in each case
- **Five accounts on the same phone report:** they count as one person; nothing is hidden. If they come from one device and vote for
  someone, the votes do not count and the sweep opens «Possible account network».
- **The photo rule is on and the service does not respond:** each new photo waits in Flagged media (closed, never published without
  review). The screen says so.
- **You hide something that was already auto-hidden:** now you decided it; another person decides the appeal.
- **Self-harm:** priority case; the person already saw the 988 line. Write to them with care.
- **Immigration:** priority. Warnings about enforcement operations are allowed without photos of people, license plates or addresses;
  pointing out someone's status gets hidden.
- **A sanction on someone on the team:** it is not applied from here (System › Team).

### FAQ
- **Can I read the messages between two neighbors?** Only with an open report on that conversation, or the appealed message while the appeal
  is open.
- **Why can't I decide an appeal?** Because you hid or sanctioned that item; another person decides it.
- **Can a flag or an appeal be deleted?** No: they are insert-only.

### For El Compa
<!-- solo-equipo -->
- Never say who reported. Never promise the result of an appeal.
- The appeal is decided by another person on the team, within 72 hours, once.

#### Settings
- The **daily limits** and the **hourly «See translation» cap** in Content › Auto-moderation are values from **System › Settings**: you change
  them on either screen, always within their limits and with the before → after audit trail. The **days to appeal** (14 by default) are too;
  Queues and Trust & safety show the current value.

### Events and tickets
**Fraud › EVENTS AND TICKETS · 30 DAYS:** burst orders from one device (how many and in how many minutes: Settings › Events › Trust),
tickets received by transfer and passed on to someone else (chain transfers: possible scalping), duplicate entries at the door (two offline
door staff) and ticket chargebacks (90 days). The signal does not sanction on its own: **Open case** (whoever edits people) sends it to
Queues › User reports with the «Events signal» flag; a person decides it with the sanction ladder, the notice and the appeal. The same card on
several accounts needs the Stripe card fingerprint (LAUNCH-CHECKLIST).
