# Super Admin: Usuarios · Super Admin: Users

_Pantallas: ADM-USR (`/admin/usuarios` y `/admin/usuarios/{id}`), teléfono y escritorio. Para el equipo de To'Latino (y El Compa como copiloto del
equipo). Versión: 11 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Lista:** todas las cuentas de tus ciudades (Mi ciudad de la persona; una cuenta sin ciudad solo la ve quien
  trabaja todas). Buscar por nombre, teléfono, correo o id; QUIÉN (dueños de negocio, solo clientes), ESTADO (activo,
  advertido, silenciado, suspendido, baneado, borrado), «Más filtros» (nuevos 30 d, activos 7 d, sin entrar 30 d+,
  varios dispositivos, sin correo) y ORDENAR (última vez, más nuevos). 14 por página.
- **360°** con cuatro pestañas:
  - **Resumen:** teléfono y si está verificado, correo, ciudad, rol, desde cuándo, última vez, dispositivos (en rojo si
    comparte dispositivo con otra cuenta), notas internas, sus negocios y las acciones.
  - **Seguridad:** dispositivos y sesiones (cerrar una, cerrar todas, bloquear o desbloquear un dispositivo), otras
    cuentas que entraron desde el mismo dispositivo, verificación del teléfono (restablecer), cambios de teléfono, y su
    ciudad con el historial y «Cambiar ciudad».
    **Llaves de acceso** (Face ID / huella): cada llave con su dispositivo y la app donde nació, cuándo se agregó, la última vez, cuántas
    entradas y si está sincronizada; las quitadas dicen quién (la persona, el equipo o el sistema) y por qué. **Revocar** pide motivo, le avisa
    a la persona por texto y en la app, y queda en la auditoría. En Verificación salen los cambios de llaves.
    Cada dispositivo dice desde dónde entró: «Web» o la app, su versión y el sistema (por ejemplo «To'Latino Puerta 1.0.0 (12) · iOS 17.5»). Es solo informativo: la app nunca cambia lo que la persona puede hacer.
  - **Confianza:** su estado, cada sanción (vigente, terminó o levantada, con su motivo y quién) y las fotos que reportó.
  - **Privacidad:** exportar sus datos (archivo JSON, para un pedido de privacidad).
  - **Comunidad:** rango, publicaciones y comentarios, votos recibidos, mejores respuestas; seguidores, siguiendo, a quién
    bloqueó y silenció (listas de 50, con «MISMO DISPOSITIVO» en rojo); cuántas conversaciones privadas tiene (**nunca su
    contenido**: solo se lee con un reporte abierto en Colas › Mensajes reportados); su declaración de 18 años o más (sí/no y
    cuándo; nunca una fecha de nacimiento) y su bienvenida. Aviso de **posible red**: seguidores que entraron desde el mismo
    dispositivo que esta cuenta (el caso de red de cuentas se abre desde Colas › Reportes de usuario).
  - Abajo, el historial: quién del equipo hizo qué, antes → después y el motivo.

### Usuarios 360° › Comunidad completo
- **Arriba:** rango, puntos (y del mes), monedas (sin valor en dinero), votos recibidos (+ / −, mejores respuestas), publicaciones y
  comentarios, seguidores y siguiendo, a cuántos bloqueó y silenció, conversaciones privadas (nunca su contenido), 18+ y bienvenida.
- **Posible red:** si un seguidor entró desde el mismo dispositivo que esta cuenta, el aviso trae **«Abrir caso de red de cuentas»**: con
  motivo, abre (o reúsa) el caso en **Colas › Reportes de usuario** con la marca «posible red»; lo decide una persona con la escalera de
  sanciones. Queda en la auditoría.
- **Sub-pestañas:** **Publicaciones** (con su estado y reportes; toca para ver el hilo; «Ver todo en Contenido») · **Comentarios** (abre el
  hilo con el comentario marcado) · **Seguidores y siguiendo** (y bloqueados / silenciados; MISMO DISPOSITIVO) · **Puntos y monedas**
  (movimientos y ajustes con tope por rol) · **Cupones y referidos** (cupones canjeados con su estado y el código tapado; su código de
  invitación, a cuántos invitó y quién la invitó; sin dinero). Sin El Patio (decisión G).
- **Lista de Usuarios › Más filtros:** **Con reportes** (a la persona o a lo que escribió en la Comunidad) y **Rango en la Comunidad**
  (4, 7 o 9 o más).

## Acciones y lo que ve la persona
| Acción | Permiso | Qué pasa |
|---|---|---|
| Nota interna | usr · editar | Solo la ve el equipo. No se borra. |
| Advertencia | usr · retirar | Sin restricción. La ve en Mi cuenta con el motivo hasta que alguien la levante. |
| Silencio 7 días / Bloquear publicación 30 días | usr · retirar | No puede mandar recomendaciones (ni publicar en Comunidad cuando abra). Lo ve en Mi cuenta y al intentar recomendar, con la fecha y el motivo. Se levanta sola. |
| Suspender 14 días | usr · retirar | Se cierran sus sesiones. Al intentar entrar ve «suspendida hasta el {fecha}» y el motivo. Se levanta sola. |
| Banear | usr · retirar y rol Admin | Se cierran sus sesiones; no puede entrar. Ve el motivo al intentar entrar. |
| Levantar | usr · retirar | Termina las sanciones vigentes; la cuenta vuelve a activa. |
| Cerrar sesión / Cerrar todas | usr · editar | Entra otra vez en ese dispositivo (o en todos), con el código por SMS o con su llave de acceso. |
| Revocar una llave de acceso | usr · editar | Esa llave ya no entra; sigue entrando con el código y puede agregar otra. Recibe un aviso (texto y app) con «la quitó el equipo de To'Latino». |
| Bloquear dispositivo | usr · retirar | Ninguna cuenta entra desde ese dispositivo; se cierran todas sus sesiones. No se bloquea el dispositivo desde el que trabajas. |
| Restablecer verificación | usr · editar | Se cierran sus sesiones, **se quitan sus llaves de acceso** y al entrar le pedimos el código otra vez (la llave no lo salta). |
| Cambiar ciudad | usr · editar | Se salta la regla de 30 días. Si la ciudad no ha abierto, queda en su lista de espera. |
| Quitar foto de perfil | usr · editar | Sale la foto; queda el motivo. |
| Borrar datos | usr · editar | Entra a Cambios sensibles. **Otra persona** lo aplica: la cuenta no puede entrar y tiene 30 días de gracia; un Admin la puede restaurar. |
| Exportar sus datos | usr · exportar | Descarga el archivo. Queda en la auditoría. |

Nadie se sanciona ni se borra a sí mismo, y a alguien del equipo de To'Latino primero se le quita el rol (Sistema ›
Equipo). Toda acción pide motivo y queda en la auditoría. Nada se borra: estados.

## Preguntas frecuentes
**¿Le llega un SMS cuando lo sancionan?** No: los avisos de moderación no salen por SMS. Lo ve en la campana y en Mi cuenta ›
Avisos de moderación.

**¿Puede apelar?** Sí: el aviso de la sanción trae «Apelar» (Mi cuenta › Avisos de moderación) y la revisa una persona del
equipo distinta de quien sancionó.

**¿Qué es «comparte dispositivo»?** Que otra cuenta entró desde el mismo teléfono o navegador. Es una señal, no una
prueba: una familia puede compartir teléfono. Si borra las cookies, el dispositivo cambia.

**¿Dónde están pedidos, citas, Wallet, rango y Comunidad?** En las pestañas Actividad, Dinero y Comunidad, que llegan
con sus módulos.

## Actividad
**Usuarios 360° › Actividad:** pedidos, citas y reservaciones de los últimos 90 días, y **BOLETOS DE EVENTOS** (código, tipo, precio o cortesía,
orden, si lo recibió o lo pasó por transferencia, a qué hora entró y su estado: VÁLIDO · USADO · DEVUELTO · ANULADO · TRANSFERIDO) y **RSVP**
(personas, cuántos llegaron). Cada boleto abre Buscar boleto; cada RSVP, la ficha del evento. Nunca el teléfono de otra persona.
**English:** Users 360° › Activity shows 90-day counts and the person's event tickets (status, comp, transfers, entry time) and RSVPs.

## El Compa
**Usuarios 360° › El Compa** (con el permiso de El Compa): lo que esa persona habló con El Compa en 30 días, en cifras (conversaciones por
nivel, resolvió solo, acciones confirmadas, a una persona, sin IA, marcadas y preguntas sin respuesta) y **SUS CONVERSACIONES** por número CP-,
resultado y ciudad, **sin el texto**. Admin y Soporte tocan una para abrir su ficha en El Compa › Conversaciones (la lectura queda anotada);
Solo lectura ve las cifras. Si el texto ya se borró por la retención, la fila lo dice. **Soporte** (al lado) son sus casos.

## Enviar mensaje y el aviso de sanciones por SMS
- **Enviar mensaje** (Resumen): el equipo le escribe a una persona **por la app** (su campana y el push) o **por SMS**. Sin enlaces, hasta 280 letras, con un motivo interno que queda en la auditoría. Tope: 30 mensajes por hora por persona del equipo y 3 al día por destinatario. El SMS pide el teléfono verificado, no sale de noche ni a quien dijo STOP, y en el sandbox no sale a ningún teléfono.
- **Una sanción también avisa por SMS** cuando no hay push que la lleve (quien está suspendido o baneado quizá ya no abre la app); el aviso trae el motivo y cómo apelar.

| Caso | Qué pasa |
|---|---|
| Mandas el mensaje con un enlace | Se rechaza: la persona ve lo que le llega en su cuenta. |
| Ya le llegaron 3 mensajes hoy | Se rechaza hasta mañana. |
| Eliges SMS y su teléfono no está verificado | Se rechaza: mándalo por la app. |
| La persona borra su cuenta | El texto de los mensajes del equipo se vacía a los 30 días; quién, cuándo y el motivo quedan. |

**¿La persona sabe quién le escribió?** Ve «Mensaje de To'Latino», no tu nombre; tu nombre queda en la auditoría.

## Cifras de cada persona y Dinero
- **La lista** tiene las columnas **RANGO** (de la Comunidad) y **ACTIVIDAD** (pedidos · citas; abajo reseñas · posts · reportes). En QUIÉN está **Promotores** (las cuentas marcadas como promotor en Crecimiento) y en ORDENAR **Más compras**, **Más reportes** y **Rango**. En el teléfono, cada fila dice su rango y cuántas compras lleva.
- **Arriba del 360°:** PEDIDOS, CITAS y RANGO.
- **Pestaña Dinero** (solo quien ve Transacciones): lo cobrado en 90 días, lo retenido ahora y lo devuelto; sus tarjetas guardadas (marca y últimos 4) y sus últimos cobros con el negocio y el estado (cada uno abre el Dinero de ese negocio).

| Caso | Qué pasa |
|---|---|
| Alguien reporta a la persona o algo que escribió | La cifra de reportes sube sola (la base la recalcula); la lista la usa para «Con reportes» y «Más reportes». |
| Tu rol no ve Transacciones (p. ej. Moderador) | No ves la pestaña Dinero, ni escribiendo ?tab=din. |
| La persona no guardó tarjeta o no pagó con tarjeta | Lo dice: «Todavía no ha guardado una tarjeta» / «Sin cobros con tarjeta». |

**¿Y el Wallet?** To’Latino no tiene Wallet todavía (solo tarjeta): no sale en la pantalla.
**¿Las cifras cuentan las cuentas de prueba?** En el 360° de esa persona, sí (son sus cifras). Los números de la plataforma (Analítica) las dejan fuera.

## English

### What it does
- **List:** all the accounts of your cities (the person's My city; an account without a city is seen only by whoever works all the cities).
  Search by name, phone, email or id; WHO (business owners, customers only), STATUS (active, warned, muted, suspended, banned, deleted),
  «More filters» (new 30 d, active 7 d, not signed in 30 d+, several devices, no email) and SORT (last seen, newest). 14 per page.
- **360°** with four tabs:
  - **Overview:** phone and whether it is verified, email, city, role, since when, last seen, devices (in red if it shares a device with
    another account), internal notes, their businesses and the actions.
  - **Security:** devices and sessions (close one, close all, block or unblock a device), other accounts that signed in from the same device,
    phone verification (reset), phone changes, and their city with the history and «Change city».
    **Passkeys** (Face ID / fingerprint): each key with its device and the app where it was born, when it was added, the last time, how many
    sign-ins and whether it is synced; removed ones say who (the person, the team or the system) and why. **Revoke** asks for a reason, notifies
    the person by text and in the app, and is logged in the audit. In Verification, passkey changes show up.
    Each device says where it signed in from: «Web» or the app, its version and the system (for example «To'Latino Puerta 1.0.0 (12) · iOS 17.5»).
    It is informational only: the app never changes what the person can do.
  - **Trust:** their status, each sanction (in force, ended or lifted, with its reason and who) and the photos they reported.
  - **Privacy:** export their data (a JSON file, for a privacy request).
  - **Community:** rank, posts and comments, votes received, best answers; followers, following, whom they blocked and muted (lists of 50, with
    «SAME DEVICE» in red); how many private conversations they have (**never their content**: it is read only with an open report in Queues ›
    Reported messages); their declaration of being 18 or older (yes/no and when; never a date of birth) and their welcome. A **possible network**
    notice: followers who signed in from the same device as this account (the account-network case is opened from Queues › User reports).
  - At the bottom, the history: which team member did what, before → after and the reason.

#### Users 360° › Community in full
- **At the top:** rank, points (and the month's), coins (no money value), votes received (+ / −, best answers), posts and comments, followers
  and following, how many they blocked and muted, private conversations (never their content), 18+ and welcome.
- **Possible network:** if a follower signed in from the same device as this account, the notice carries **«Open account-network case»**: with a
  reason, it opens (or reuses) the case in **Queues › User reports** with the «possible network» mark; a person decides it with the sanction
  ladder. It is logged in the audit.
- **Sub-tabs:** **Posts** (with their status and reports; tap to see the thread; «See all in Content») · **Comments** (opens the thread with the
  comment highlighted) · **Followers and following** (and blocked / muted; SAME DEVICE) · **Points and coins** (movements and adjustments with a
  cap by role) · **Coupons and referrals** (redeemed coupons with their status and the code covered; their invitation code, how many they invited
  and who invited them; no money). Without El Patio (decision G).
- **Users list › More filters:** **With reports** (about the person or what they wrote in the Community) and **Community rank** (4, 7 or 9 or
  more).

### Actions and what the person sees
| Action | Permission | What happens |
|---|---|---|
| Internal note | usr · edit | Only the team sees it. It is not deleted. |
| Warning | usr · withdraw | No restriction. They see it in My account with the reason until someone lifts it. |
| Mute 7 days / Block posting 30 days | usr · withdraw | They cannot send recommendations (nor post in the Community when it opens). They see it in My account and when they try to recommend, with the date and the reason. It lifts by itself. |
| Suspend 14 days | usr · withdraw | Their sessions are closed. When they try to sign in they see «suspended until {date}» and the reason. It lifts by itself. |
| Ban | usr · withdraw and Admin role | Their sessions are closed; they cannot sign in. They see the reason when they try to sign in. |
| Lift | usr · withdraw | It ends the sanctions in force; the account goes back to active. |
| Sign out / Sign out all | usr · edit | They sign in again on that device (or on all), with the SMS code or their passkey. |
| Revoke a passkey | usr · edit | That key no longer signs in; they still sign in with the code and can add another. They get a notice (text and app) saying «removed by the To'Latino team». |
| Block device | usr · withdraw | No account signs in from that device; all its sessions are closed. The device you are working from cannot be blocked. |
| Reset verification | usr · edit | Their sessions are closed, **their passkeys are removed** and when they sign in we ask for the code again (the passkey does not skip it). |
| Change city | usr · edit | It skips the 30-day rule. If the city has not opened, they stay on its waitlist. |
| Remove profile photo | usr · edit | The photo is removed; the reason stays. |
| Delete data | usr · edit | It enters Sensitive changes. **Another person** applies it: the account cannot sign in and has a 30-day grace period; an Admin can restore it. |
| Export their data | usr · export | Downloads the file. It is logged in the audit. |

Nobody sanctions or deletes themselves, and a To'Latino team member first has the role removed (System › Team). Every action asks for a reason and
is logged in the audit. Nothing is deleted: statuses.

### FAQ
**Do they get a text when they are sanctioned?** No: moderation notices do not go out by SMS. They see it in the bell and in My account ›
Moderation notices.

**Can they appeal?** Yes: the sanction notice carries «Appeal» (My account › Moderation notices) and a team member other than the one who
sanctioned reviews it.

**What does «shares a device» mean?** That another account signed in from the same phone or browser. It is a signal, not proof: a family can
share a phone. If they clear their cookies, the device changes.

**Where are orders, appointments, Wallet, rank and Community?** In the Activity, Money and Community tabs, each with its own module.

### Activity
**Users 360° › Activity:** orders, appointments and reservations from the last 90 days, and **EVENT TICKETS** (code, type, price or comp, order,
whether they received it or passed it on by transfer, what time it got in and its status: VALID · USED · REFUNDED · VOIDED · TRANSFERRED) and
**RSVPs** (people, how many came). Each ticket opens Find ticket; each RSVP, the event's page. Never another person's phone.
**English:** Users 360° › Activity shows 90-day counts and the person's event tickets (status, comp, transfers, entry time) and RSVPs.

### El Compa
**Users 360° › El Compa** (with the El Compa permission): what that person talked about with El Compa in 30 days, in numbers (conversations by
level, resolved on its own, confirmed actions, to a person, without AI, flagged and unanswered questions) and **THEIR CONVERSATIONS** by CP-
number, outcome and city, **without the text**. Admin and Support tap one to open its record in El Compa › Conversations (the reading is
logged); Read-only sees the numbers. If the text was already deleted by retention, the row says so. **Support** (next to it) are their cases.

### Sending a message and the sanction notice by SMS
- **Send message** (Overview): the team writes to a person **through the app** (their bell and push) or **by SMS**. No links, up to 280
  characters, with an internal reason that goes in the audit. Cap: 30 messages an hour per team member and 3 a day per recipient. SMS requires a
  verified phone, does not go out at night or to someone who said STOP, and in the sandbox it goes to no phone.
- **A sanction also notifies by SMS** when there is no push to carry it (someone suspended or banned may no longer open the app); the notice
  carries the reason and how to appeal.

| Case | What happens |
|---|---|
| You send the message with a link | It is rejected: the person sees what reaches them in their account. |
| They already got 3 messages today | It is rejected until tomorrow. |
| You choose SMS and their phone is not verified | It is rejected: send it through the app. |
| The person deletes their account | The text of the team's messages is emptied after 30 days; who, when and the reason stay. |

**Does the person know who wrote to them?** They see «Message from To'Latino», not your name; your name stays in the audit.

### Each person's numbers and Money
- **The list** has the columns **RANK** (from the Community) and **ACTIVITY** (orders · appointments; below, reviews · posts · reports). In WHO
  there is **Promoters** (the accounts marked as promoter in Growth) and in SORT **Most purchases**, **Most reports** and **Rank**. On the phone,
  each row shows its rank and how many purchases it has.
- **At the top of the 360°:** ORDERS, APPOINTMENTS and RANK.
- **Money tab** (only for those who see Transactions): what was charged in 90 days, what is held now and what was refunded; their saved cards
  (brand and last 4) and their latest charges with the business and the status (each opens that business's Money).

| Case | What happens |
|---|---|
| Someone reports the person or something they wrote | The reports number goes up by itself (the database recalculates it); the list uses it for «With reports» and «Most reports». |
| Your role does not see Transactions (e.g. Moderator) | You do not see the Money tab, not even by typing ?tab=din. |
| The person has not saved a card or has not paid by card | It says so: «Has not saved a card yet» / «No card charges». |

**What about the Wallet?** To'Latino has no Wallet yet (card only): it does not show on the screen.
**Do the numbers count test accounts?** In that person's 360°, yes (they are their numbers). The platform's numbers (Analytics) leave them out.
