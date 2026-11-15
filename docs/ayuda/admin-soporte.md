# Super Admin: Soporte · Super Admin: Support

_Pantallas: **Super Admin › Soporte** (`/admin/soporte`: cifras, Abiertos · Míos · Escalados · Resueltos · Macros, buscador, chips y la ficha
del caso con `?caso=TK-…`), Colas › «Soporte · casos», Usuarios 360° › Soporte, Negocios 360° › Soporte y Configuración › Soporte.
Permisos (sección «Soporte»): ver; editar = responder, notas, tomar, resolver, unir, ligar, reabrir, pasar a Finanzas y devolver con tope;
aprobar = macros y ocultar un mensaje; «Transacciones › aprobar» devuelve sin tope del rol. El copiloto de El Compa («Sugerir respuesta con El
Compa») sale a quien puede responder (editar) y en Colas › Ayuda con pedidos y citas a quien resuelve (Colas › aprobar). Escritorio y teléfono.
Versión: 14 nov 2026.
Audiencia: equipo. Tema: equipo._

## Qué hace
- Los casos de vecinos y negocios con To'Latino (TK-…). Cada caso trae su **contexto**: la persona (teléfono, ciudad, idioma, cuántos casos),
  el negocio si lo abrió desde su panel, la operación o la ayuda ligada, lo pagado en la app y el dispositivo y la versión.
- **Plazo:** primera respuesta en las horas hábiles de Configuración (8 de fábrica, lunes a viernes de 9 AM a 6 PM, hora de la ciudad). La base
  pone el plazo y mete el caso en la cola cuando le toca al equipo (nuevo, la persona volvió a escribir, reabierto) y lo saca cuando le toca a la
  persona (respondido, resuelto, unido). Un caso que pasa su plazo sube a prioridad **alta** y avisa a quien lo tiene.
- **Macros** ES/EN con {nombre}: un toque llena la respuesta en el idioma de la persona; tú la revisas y la envías.
- **Notas internas:** solo el equipo las ve; nunca le llegan a la persona (la pantalla de la persona no las recibe).
- **El copiloto (El Compa):** «Sugerir respuesta con El Compa» deja un **resumen** del caso y el **siguiente paso** (para ti) y un **borrador** de
  respuesta en el idioma de la persona, en el campo RESPUESTA. **Nada se envía solo:** lo lees, lo cambias si quieres y lo envías tú con
  **Enviar**; sale con tu nombre. El copiloto nunca devuelve dinero, nunca cambia el estado del caso y nunca promete devoluciones, montos, plazos
  ni sanciones; como mucho te dice qué macro encaja o que, si corresponde devolver, «Resolver y devolver» lo decides tú. También sale en
  **Colas › Ayuda con pedidos y citas** (las ayudas que el negocio no respondió): el borrador va al mensaje de «Resolver con un mensaje».

## Cómo se usa
1. **Tomar el siguiente caso** (el sin asignar más urgente) o abre uno de la lista. Tomarlo le dice a la persona «Lo están viendo».
2. **A la persona:** elige una macro o escribe, y **Enviar** (le llega el aviso; el caso pasa a «Te respondieron»). **Nota interna:** para el
   equipo.
3. **Resolver** con el mensaje para la persona; después ella dice si se resolvió (si dice que no en 7 días, vuelve a la cola).
4. **Resolver y devolver:** el monto y el mensaje. Se devuelve a la tarjeta lo pagado por la operación del caso. Soporte devuelve hasta **$50
   por caso** (Configuración › Soporte, suma lo ya devuelto); más, **Pasar a Finanzas** o un Admin (hasta lo cobrado). La base revisa el tope
   de tu rol al decidir; tocar dos veces devuelve una sola vez.
5. **Ligar a una operación** (1234, C-…, H-…) de esa persona o de su negocio; **Unir a otro caso** (mismo dueño); **Reabrir** un resuelto;
   **Ocultar un mensaje** que trae datos que no se guardan.
6. **Macros:** nueva, editar, apagar o encender (con motivo; queda en la auditoría). Solo texto: sin etiquetas y sin otra llave que {nombre}.
7. **Sugerir respuesta con El Compa** (en «A la persona»): sale la nota «EL COMPA · {resumen} Siguiente paso: …» y el borrador en RESPUESTA.
   Revísalo, cámbialo y **Enviar**. **Otro borrador con El Compa** pide uno nuevo (el anterior queda descartado). Si eliges una macro, reemplaza
   el borrador. Si la nota dice «(sin IA: borrador de reglas)», el borrador es uno fijo (la IA no contestó a tiempo o lo que dijo no pasó las
   reglas): complétalo tú.
8. **En una ayuda escalada** (Colas › Ayuda con pedidos y citas): **Sugerir respuesta con El Compa** → la nota y el BORRADOR; **Resolver con un
   mensaje** abre con el borrador ya escrito. Complétalo con lo que decidiste y **Resolver**.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Soporte devuelve más de su tope | «Tu rol devuelve hasta $50 por caso…»: no se llama a la pasarela. Pásalo a Finanzas o a un Admin. |
| Se pide devolver más de lo cobrado | «Puedes devolver hasta $…»: no se mueve nada; el intento queda como fallido con su motivo. |
| El caso no tiene operación pagada | Liga primero la operación; si no hay nada pagado en la app, no se devuelve aquí. |
| Unir casos de personas distintas | No se puede. |
| Tu rol es de una ciudad | Solo ves y trabajas los casos de tus ciudades. |
| Ver una foto del caso | Se abre aparte y queda en la auditoría. |
| La persona escribió una tarjeta o un SSN | Ya llegó tapado; la base rechaza guardarlo sin tapar. |
| Pides un borrador y no lo envías | No se envía nada ni cambia nada del caso. Al día queda «descartado» en las cifras de El Compa. |
| El copiloto está apagado (nivel «Copiloto», el canal, la ciudad o el negocio) o El Compa llegó al tope | No sale el botón: la ficha y la cola son las de siempre (macros, Enviar, Resolver). |
| El borrador traía algo que no se puede decir (prometer una devolución, un monto que no está en el caso, una nota interna, un teléfono) | No se muestra: sale el borrador de reglas, «(sin IA: borrador de reglas)». |
| Un caso de una operación de Salud, Profesionales, una inscripción de niños o con datos privados | El copiloto no lee esa operación (la nombra como privada); en la cola de ayudas, el botón no sale. |
| Llegas al límite de borradores del día (200, Configuración › El Compa) | «Llegaste al límite de borradores de El Compa por hoy»: escribe tu respuesta; las macros siguen. |
| Tu rol solo ve Soporte (Finanzas) o no lo ve | No sale el botón; si alguien lo intenta igual, el servidor no da nada. |

## Preguntas frecuentes
- **¿Dónde están las ayudas de pedidos y citas que el negocio no respondió?** En Colas › Ayuda con pedidos y citas (el enlace está al pie de
  Abiertos).
- **¿La persona ve quién le respondió?** Ve tu nombre de pila y «To'Latino».
- **¿Se borra algo?** No: los mensajes solo se agregan (el texto se oculta con motivo), los casos cambian de estado y las macros se apagan.
- **¿Qué ve la IA del copiloto?** Lo que tú ves en la ficha de ese caso, tapado: el tema, la conversación, la operación y lo pagado en la app como
  salen en la ficha, el tope de tu rol para devolver, las macros y las notas internas (marcadas: nunca van al borrador). Nunca el teléfono, el
  correo, la tarjeta, contraseñas ni ids. Usa el modelo mayor (Claude Sonnet) y cuenta en el tope de El Compa.
- **¿La persona sabe que lo escribió El Compa?** El mensaje sale con tu nombre: lo revisaste y lo enviaste tú. En la base queda marcado que salió
  de un borrador (tal cual o editado), para las cifras.

## El plazo en 30 días
Debajo de las cifras: **PLAZO CUMPLIDO · 30 D** (de los casos con respuesta, cuántos se contestaron dentro de las horas hábiles del plazo),
**FUERA DE PLAZO · 30 D** y **DESDE EL COMPA** (30 días). Por tema y por ciudad, en Analítica › El Compa y Soporte. Si la cuenta de la persona se
borró hace más de 30 días, los mensajes del caso dicen «(Se borró: la cuenta se cerró hace más de 30 días.)»: el caso queda con su estado y tema.

## Ayuda con un pedido: reponer o devolver
En la cola «Ayuda con pedidos y citas», una ayuda con un **pedido de comida** que pide reposición tiene **Resolver y reponer**:
crea un pedido nuevo de **$0** con esos platos (o todo el pedido si no le llegó), ya aceptado por el negocio y, si es delivery, con
el Repartidor; el caso queda resuelto con tu respuesta y en la auditoría. Si el cliente pagó en la app, **Resolver y devolver**
devuelve a su tarjeta hasta lo cobrado (con el permiso de dinero). Una reposición por solicitud.

## English

### What it does
- Cases from neighbors and businesses with To'Latino (TK-…). Each case comes with its **context**: the person (phone, city, language, how many
  cases), the business if they opened it from their dashboard, the linked operation or help request, what was paid in the app, and the device and version.
- **Deadline:** first reply within the business hours set in Configuration (8 by default, Monday to Friday from 9 AM to 6 PM, city time). The
  database sets the deadline and puts the case in the queue when it is the team's turn (new, the person wrote again, reopened) and takes it out
  when it is the person's turn (answered, resolved, merged). A case that passes its deadline goes up to **high** priority and notifies whoever has it.
- **Macros** ES/EN with {name}: one tap fills the reply in the person's language; you review it and send it.
- **Internal notes:** only the team sees them; they never reach the person (the person's screen does not receive them).
- **The copilot (El Compa):** "Suggest a reply with El Compa" leaves a **summary** of the case and the **next step** (for you) and a **draft**
  reply in the person's language, in the REPLY box. **Nothing is sent on its own:** you read it, change it if you want and send it yourself with
  **Send**; it goes out under your name. The copilot never refunds money, never changes the case status and never promises refunds, amounts,
  deadlines or sanctions; at most it tells you which macro fits or that, if a refund is due, "Resolve and refund" is your decision. It also
  appears in **Queues › Order and booking help** (the help requests the business did not answer): the draft goes into the "Resolve with a message" text.

### How to use it
1. **Take the next case** (the most urgent unassigned one) or open one from the list. Taking it tells the person "They are looking at it."
2. **To the person:** pick a macro or write, and **Send** (they get the notice; the case moves to "They answered you"). **Internal note:** for the
   team.
3. **Resolve** with the message for the person; afterwards they say whether it was solved (if they say no within 7 days, it goes back to the queue).
4. **Resolve and refund:** the amount and the message. What was paid for the case's operation is refunded to the card. Support refunds up to **$50
   per case** (Configuration › Support, counting what was already refunded); more than that, **Escalate to Finance** or an Admin (up to what was
   charged). The database checks your role's cap when deciding; tapping twice refunds only once.
5. **Link to an operation** (1234, C-…, H-…) of that person or their business; **Merge into another case** (same owner); **Reopen** a resolved
   one; **Hide a message** that carries data that is not kept.
6. **Macros:** new, edit, turn off or on (with a reason; it goes in the audit log). Text only: no tags and no key other than {name}.
7. **Suggest a reply with El Compa** (in "To the person"): the note "EL COMPA · {summary} Next step: …" appears and the draft in REPLY.
   Review it, change it and **Send**. **Another draft with El Compa** asks for a new one (the previous one is discarded). If you pick a macro, it
   replaces the draft. If the note says "(no AI: rules draft)", the draft is a fixed one (the AI did not answer in time or what it said did not
   pass the rules): complete it yourself.
8. **In an escalated help request** (Queues › Order and booking help): **Suggest a reply with El Compa** → the note and the DRAFT; **Resolve with
   a message** opens with the draft already written. Complete it with what you decided and **Resolve**.

### What happens in each case
| Case | What happens |
|---|---|
| Support refunds more than its cap | "Your role refunds up to $50 per case…": the payment gateway is not called. Pass it to Finance or an Admin. |
| A refund larger than what was charged is requested | "You can refund up to $…": nothing moves; the attempt is recorded as failed with its reason. |
| The case has no paid operation | Link the operation first; if nothing was paid in the app, nothing is refunded here. |
| Merging cases from different people | Not possible. |
| Your role is for one city | You only see and work the cases of your cities. |
| Viewing a photo from the case | It opens separately and is recorded in the audit log. |
| The person wrote a card number or an SSN | It already arrived covered; the database refuses to save it uncovered. |
| You ask for a draft and do not send it | Nothing is sent and nothing changes in the case. At the end of the day it is counted as "discarded" in El Compa's numbers. |
| The copilot is off ("Copilot" level, the channel, the city or the business) or El Compa reached its cap | The button does not appear: the case view and the queue are as usual (macros, Send, Resolve). |
| The draft contained something that cannot be said (promising a refund, an amount that is not in the case, an internal note, a phone number) | It is not shown: the rules draft appears, "(no AI: rules draft)". |
| A case about a Health or Professionals operation, a kids' enrollment, or private data | The copilot does not read that operation (it calls it private); in the help queue, the button does not appear. |
| You reach the daily draft limit (200, Configuration › El Compa) | "You reached El Compa's draft limit for today": write your reply; macros still work. |
| Your role only sees Support (Finance) or does not see it | The button does not appear; if someone tries anyway, the server gives nothing. |

### FAQ
- **Where are the order and booking help requests the business did not answer?** In Queues › Order and booking help (the link is at the bottom
  of Open).
- **Does the person see who replied?** They see your first name and "To'Latino".
- **Is anything deleted?** No: messages are only added (the text is hidden with a reason), cases change status and macros are turned off.
- **What does the copilot's AI see?** What you see in that case's view, covered: the topic, the conversation, the operation and what was paid in
  the app as they appear in the view, your role's refund cap, the macros and the internal notes (marked: they never go into the draft). Never the
  phone, email, card, passwords or ids. It uses the larger model (Claude Sonnet) and counts toward El Compa's cap.
- **Does the person know El Compa wrote it?** The message goes out under your name: you reviewed it and sent it yourself. The database records
  that it came from a draft (as is or edited), for the numbers.

### The 30-day deadline
Under the numbers: **DEADLINE MET · 30 D** (of the cases with a reply, how many were answered within the deadline's business hours),
**PAST DEADLINE · 30 D** and **FROM EL COMPA** (30 days). By topic and by city, in Analytics › El Compa and Support. If the person's account was
deleted more than 30 days ago, the case messages say "(Deleted: the account was closed more than 30 days ago.)": the case keeps its status and topic.

### Order help: replace or refund
In the "Order and booking help" queue, a help request about a **food order** that asks for a replacement has **Resolve and replace**: it creates
a new **$0** order with those dishes (or the whole order if it never arrived), already accepted by the business and, if it is delivery, with the
Repartidor; the case is resolved with your reply and recorded in the audit log. If the customer paid in the app, **Resolve and refund** refunds
their card up to what was charged (with the money permission). One replacement per request.
