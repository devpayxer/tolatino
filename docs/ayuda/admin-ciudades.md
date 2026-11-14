# Super Admin: Ciudades · Super Admin: Cities

_Pantallas: **Super Admin › Ciudades** (`/admin/ciudades`) y el detalle de cada ciudad (`/admin/ciudades/{id}`): estado, regla de apertura, el **asistente de
apertura** de 7 pasos, la beta y sus invitaciones, los barrios, la zona horaria, el impuesto, el radio por defecto, la cuenta oficial, el equipo local, el
aviso a la lista de espera, el cierre y el historial. En el Inicio del Super Admin, la cifra **«LISTA DE ESPERA»** y el aviso **«CIERRE DE CIUDAD POR
APROBAR»**. Ver: Ciudades · ver. Barrios y radio: Ciudades · editar. Asistente, beta, invitaciones y cierres: Ciudades · aprobar. Abrir la ciudad (paso
7), «Abrir igual», la regla, la zona horaria y el impuesto: solo un Admin. Escritorio y teléfono. Versión: 14 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **El listado**: las cinco ciudades con su estado (**ABIERTA**, **BETA**, **PRÓXIMAMENTE**, **CERRADA**), cuántos esperan, los negocios listos contra la
  meta, el % de la regla y en qué paso va su asistente. Abajo, la fecha de apertura de la landing (se cambia en Crecimiento) y **«Pide tu ciudad»**.
- **La regla de apertura** de cada ciudad: cumple si llega a los **negocios listos** (30 de fábrica) **o** a las **personas en la lista** (300 de
  fábrica), **y** tiene al menos lo mínimo en cada **categoría clave**: comida, belleza, hogar, fiestas e iglesias (1 de fábrica). La cambia un Admin con
  motivo.
- **El asistente de apertura**: 1 Ciudad y centro · 2 Radio y barrios · 3 Categorías de arranque · 4 Equipo local · 5 Negocios listos · 6 Comprobar
  (la regla, las líneas pendientes de la lista de lanzamiento de esa ciudad y el commit que corre) · 7 Avisar a la lista de espera. Cada paso muestra
  lo que el servidor ve en ese momento; al confirmarlo se guarda tal cual (la **evidencia**), con tu nombre y tu motivo. **Solo avanza**, un paso a la
  vez; no se cambia ni se borra. En el teléfono se ve un paso por pantalla; en escritorio, los 7.
- **Abrir** (paso 7, un Admin): la ciudad pasa a **ABIERTA** y en el mismo momento deja de verse «próximamente» en la app, en todos los servidores. Su
  lista de espera recibe **un solo aviso** por persona: en la app y push; SMS solo a quien no tiene la app; correo si lo tiene verificado. Sale por
  partes y solo de 9 AM a 9 PM de la ciudad. Quien pidió la ciudad sin cuenta (un teléfono sin confirmar) no recibe nada.
- **«Abrir igual»** (paso 6, un Admin): si la regla no se cumple, se puede seguir con motivo; queda anotado que se decidió abrir igual. Las líneas
  pendientes de la lista de lanzamiento de la ciudad, en producción, no se saltan.
- **Beta**: una ciudad próximamente puede pasar a **BETA**: la ven abierta solo las cuentas **invitadas** (por teléfono; la persona tiene que tener
  cuenta) y las cuentas de revisión de Apple y Google activas; para todos los demás sigue «próximamente». Una invitación se quita con motivo.
- **Cerrar** (o bajar una ciudad abierta a beta o a próximamente): una persona lo **pide** con motivo y **otra** lo **aprueba**. Mientras, la ciudad sigue
  como está. Quien lo pidió puede retirarlo.
- **Barrios**: el centro (desde donde se mide) y los barrios, con sus calles de referencia y su punto. Se agregan, se corrigen o se **retiran** (nada se
  borra; quien medía desde un barrio retirado pasa al centro). El centro se corrige, no se retira. El selector de ciudad lo muestra al momento.
- **Ajustes**: radio por defecto para quien llega nuevo; zona horaria (cambia las horas de la ciudad: silencio, avisos, «hoy») e impuesto (vale para lo
  que se cobre desde ahora), estos dos de un Admin.
- **Historial**: cada cambio de estado con quién, por dónde (con el asistente, cierre aprobado, el equipo) y el motivo. Todo queda además en la auditoría.

## Cómo se usa
1. Entra a **Super Admin › Ciudades** y toca la ciudad.
2. **Asistente**: lee la evidencia del paso, toca **«Confirmar paso N: …»** y escribe el motivo. Si el botón está apagado, la nota de arriba dice qué
   falta (por ejemplo, un Ciudad manager de esa ciudad en Sistema › Equipo).
3. **Abrir**: en el paso 7, **«Abrir {ciudad}»** y el motivo.
4. **Beta**: **«Pasar a beta (solo invitados)»**; luego **«Invitar»** con el teléfono de cada persona.
5. **Cerrar**: **«Pedir cierre»**, elige a qué pasa y el motivo. Otra persona entra a la misma ciudad y toca **«Aprobar el cierre»** o **«Rechazar»**.
6. **Barrios**: **«Agregar barrio»**, o toca un barrio para corregirlo o retirarlo.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Quieres confirmar un paso que no toca | No se puede: el asistente solo avanza, de uno en uno. |
| Falta el Ciudad manager de esa ciudad | El paso 4 no se confirma hasta que esté en Sistema › Equipo con esa ciudad. |
| La regla no se cumple | «Comprobar» no se confirma; un Admin puede «Abrir igual» con motivo. |
| Hay líneas pendientes de la lista de lanzamiento que nombran a la ciudad | En producción, «Comprobar» no pasa. En el sandbox se anotan y no frenan. |
| Te equivocaste en un paso | No se cambia: **«Cancelar asistente»** con motivo y empieza otro desde el paso 1 (lo hecho queda en el historial). |
| Es de noche en la ciudad cuando abre | El aviso a la lista espera a las 9 AM de allá. |
| Alguien está en la lista dos veces | Recibe un solo aviso. |
| Pediste un cierre y quieres aprobarlo tú | No se puede: lo aprueba otra persona del equipo. |
| La ciudad cambió desde que se pidió el cierre | El pedido se cierra solo; se pide otra vez si hace falta. |
| Invitas un teléfono sin cuenta | No se puede: la persona entra una vez con su teléfono y la invitas. |
| Un barrio queda a más de 15 millas de la ciudad | No se guarda: revisa el punto. |
| Tu rol no tiene Ciudades · aprobar | Ves todo, pero no confirmas pasos, ni invitas, ni cierras. |

## Preguntas frecuentes
- **¿Por qué no hay un botón para abrir directo?** Porque una ciudad abierta mueve dinero, avisos y la lista de espera: se abre con el asistente, con la
  evidencia de cada paso. La base no deja abrirla de otra forma.
- **¿Qué ve una persona invitada a la beta?** La ciudad como abierta (Inicio, Negocios, Buscar, Eventos, Comunidad). Las demás ven «próximamente».
- **¿Se puede volver a abrir una ciudad cerrada?** Sí, con un asistente nuevo. Quien ya recibió el aviso de esa ciudad no lo recibe otra vez.
- **¿De dónde salen los barrios de Allentown, Wilkes-Barre, Scranton y Reading?** De una primera lista con puntos aproximados: el equipo local los revisa
  aquí antes de abrir. Lo que corrige el equipo ya no lo cambia ninguna actualización.

## English
### What it does
- **The list**: the five cities with their status (**OPEN**, **BETA**, **COMING SOON**, **CLOSED**), how many are waiting, businesses ready against the
  goal, the % of the rule and which step their wizard is on. Below, the landing's opening date (changed in Growth) and **"Ask for your city"**.
- **The opening rule** of each city: it is met if it reaches the **businesses ready** (30 by default) **or** the **people on the waitlist** (300 by
  default), **and** it has the minimum in each **key category**: food, beauty, home, parties and churches (1 by default). An Admin changes it with a reason.
- **The opening wizard**: 1 City and center · 2 Radius and neighborhoods · 3 Starting categories · 4 Local team · 5 Businesses ready · 6 Check (the rule,
  the city's pending launch checklist lines and the running commit) · 7 Notify the waitlist. Each step shows what the server sees at that moment; when
  confirmed it is saved as is (the **evidence**), with your name and reason. **It only moves forward**, one step at a time; it is not changed or deleted.
  On the phone you see one step per screen; on desktop, all 7.
- **Open** (step 7, an Admin): the city becomes **OPEN** and at that moment stops showing "coming soon" in the app, on every server. Its waitlist gets
  **just one notice** per person: in the app and push; SMS only to those without the app; email if verified. It goes out in parts and only from 9 AM to
  9 PM city time. Whoever asked for the city without an account (an unconfirmed phone) gets nothing.
- **"Open anyway"** (step 6, an Admin): if the rule is not met, you can continue with a reason; it is recorded that the decision was to open anyway. The
  city's pending launch checklist lines, in production, are not skipped.
- **Beta**: a coming-soon city can go to **BETA**: only **invited** accounts (by phone; the person must have an account) and active Apple and Google
  review accounts see it open; for everyone else it stays "coming soon". An invitation is removed with a reason.
- **Close** (or move an open city down to beta or coming soon): one person **requests** it with a reason and **another** person **approves** it.
  Meanwhile the city stays as it is. Whoever requested it can withdraw it.
- **Neighborhoods**: downtown (where distance is measured from) and the neighborhoods, with their reference streets and point. They are added, edited or
  **retired** (nothing is deleted; whoever measured from a retired neighborhood moves to downtown). Downtown is edited, not retired. The city selector
  shows it right away.
- **Settings**: default radius for newcomers; time zone (changes the city's hours: quiet hours, notices, "today") and tax (applies to what is charged from
  now on), these two by an Admin.
- **History**: each status change with who, how (with the wizard, approved close, the team) and the reason. Everything also goes in the audit log.

### How to use it
1. Go to **Super Admin › Cities** and tap the city.
2. **Wizard**: read the step's evidence, tap **"Confirm step N: …"** and write the reason. If the button is off, the note above says what is missing (for
   example, a City manager for that city in System › Team).
3. **Open**: on step 7, **"Open {city}"** and the reason.
4. **Beta**: **"Move to beta (invited only)"**; then **"Invite"** with each person's phone.
5. **Close**: **"Request close"**, pick what it goes to and the reason. Another person opens the same city and taps **"Approve the close"** or
   **"Reject"**.
6. **Neighborhoods**: **"Add neighborhood"**, or tap a neighborhood to edit or retire it.

### What happens in each case
| Case | What happens |
|---|---|
| You want to confirm a step that is not next | You cannot: the wizard only moves forward, one at a time. |
| The city's City manager is missing | Step 4 is not confirmed until they are in System › Team with that city. |
| The rule is not met | "Check" is not confirmed; an Admin can "Open anyway" with a reason. |
| There are pending launch checklist lines naming the city | In production, "Check" does not pass. In the sandbox they are recorded and do not block. |
| You made a mistake on a step | It is not changed: **"Cancel wizard"** with a reason and start another from step 1 (what was done stays in the history). |
| It is night in the city when it opens | The waitlist notice waits until 9 AM there. |
| Someone is on the list twice | They get a single notice. |
| You requested a close and want to approve it yourself | You cannot: another team member approves it. |
| The city changed since the close was requested | The request closes on its own; request again if needed. |
| You invite a phone without an account | You cannot: the person signs in once with their phone and you invite them. |
| A neighborhood is more than 15 miles from the city | It is not saved: check the point. |
| Your role has no Cities · approve | You see everything, but you cannot confirm steps, invite or close. |

### FAQ
- **Why is there no button to open directly?** Because an open city moves money, notices and the waitlist: it opens with the wizard, with the evidence
  of each step. The database does not let it open any other way.
- **What does a person invited to the beta see?** The city as open (Home, Businesses, Search, Events, Community). Others see "coming soon".
- **Can a closed city open again?** Yes, with a new wizard. Whoever already got that city's notice does not get it again.
- **Where do the Allentown, Wilkes-Barre, Scranton and Reading neighborhoods come from?** From a first list with approximate points: the local team
  reviews them here before opening. What the team corrects is no longer changed by any update.
