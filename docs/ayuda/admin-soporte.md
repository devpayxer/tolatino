# Super Admin: Soporte · Super Admin: Support

_Pantallas: **Super Admin › Soporte** (`/admin/soporte`: cifras, Abiertos · Míos · Escalados · Resueltos · Macros, buscador, chips y la ficha
del caso con `?caso=TK-…`), Colas › «Soporte · casos», Usuarios 360° › Soporte, Negocios 360° › Soporte y Configuración › Soporte.
Permisos (sección «Soporte»): ver; editar = responder, notas, tomar, resolver, unir, ligar, reabrir, pasar a Finanzas y devolver con tope;
aprobar = macros y ocultar un mensaje; «Transacciones › aprobar» devuelve sin tope del rol. El copiloto de El Compa («Sugerir respuesta con El
Compa») sale a quien puede responder (editar) y en Colas › Ayuda con pedidos y citas a quien resuelve (Colas › aprobar). Escritorio y teléfono.
Versión: 11 nov 2026.
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

## English

### What it does
Neighbor and business cases with To'Latino (TK-…), each with its **context**: the person (phone, city, language, case count), the business if
opened from its dashboard, the linked operation or help request, what was paid in the app, and device and app version. **Deadline:** first reply
within the business hours set in Configuration (8 by default, Mon–Fri 9 AM–6 PM, city time); the database queues the case when it is the team's
turn and removes it when it is the person's. A case past its deadline becomes **high** priority and notifies its assignee. **Macros** ES/EN with
{name} fill the reply in the person's language. **Internal notes** are team-only and never reach the person.

### How to use it
Take the next case or open one. Reply **To the person** (macro or text) or write an **Internal note**. **Resolve** with a message; the person
then says if it was solved («No» within 7 days reopens it). **Resolve and refund** refunds the case's operation payment to the card: Support up to
**$50 per case** (Configuration › Support, counting what was already refunded); more needs Finance or an Admin (up to what was charged). The
database checks your role's cap at decision time; tapping twice refunds once. **Link** an operation or help request, **Merge** duplicates of the
same person, **Reopen**, **Hide a message**. **Macros:** create, edit, turn off or on, with a reason (audited); plain text only.

### What happens in each case
Over the Support cap: refused before reaching the payment provider. More than charged: refused, nothing moves, the attempt is logged as failed.
No paid operation: link it first. Different people cannot be merged. City-scoped roles only see their cities. Opening a case photo is audited.
Card or SSN numbers arrive covered; the database refuses them uncovered.

**The copilot (El Compa):** «Suggest a reply with El Compa» (for people who can reply; in Queues › Order and booking help, for people who can
resolve) leaves a **summary** and **next step** for you and a **draft** in the person's language in the REPLY box (in a help request, in the
«Resolve with a message» text). **Nothing is sent on its own:** you read it, edit it and send it with your own button, under your name. It never
refunds, never changes the case and never promises refunds, amounts, deadlines or sanctions; at most it suggests a macro or points to «Resolve
and refund», which you decide. «Another draft» discards the previous one; a macro replaces it; unused drafts are marked discarded after a day.
«(no AI: rules draft)» means a fixed draft (the AI was late or its answer broke a rule). Copilot off (level, channel, city, business) or El Compa
at its cap: no button, the case looks as before. Health, Professionals, kids' enrollments and private-data operations are never read. The AI sees
what you see in that case, covered (no phone, email, card, passwords or ids); internal notes are marked and never reach the draft. Daily limit:
200 drafts per team member (Configuration › El Compa).

### FAQ
- **Where are unanswered order and booking help requests?** Queues › Order and booking help.
- **Does the person see who replied?** Your first name and «To'Latino».
- **Is anything deleted?** No: messages are append-only (text can be hidden with a reason), cases change status, macros are turned off.

### The 30-day deadline
Under the numbers: **DEADLINE MET · 30 D**, **PAST DEADLINE · 30 D** and **FROM EL COMPA** (30 days); by topic and city in Analytics › El Compa
and Support. If the person's account was deleted more than 30 days ago, the case messages say so and the case keeps its status and topic.
