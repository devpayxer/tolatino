# Super Admin: El Compa · Super Admin: El Compa

_Pantallas: **Super Admin › El Compa · IA** (`/admin/compa`: «Resumen», «Conversaciones», «Negocios», «Interruptores y tope» y «Canales»), la alerta del tope en Super Admin ›
Inicio y Sistema › Configuración › El Compa. Permisos (sección «El Compa · IA»): ver = la pantalla y las cifras; editar = leer el hilo, marcar y la lista de «lo que no supo»
(Admin y Soporte); aprobar = interruptores, pausas y tope (Admin de fábrica); Solo lectura ve cifras. Cada quien ve las conversaciones de sus ciudades. También Super Admin › Negocios › un negocio › **El Compa**. Teléfono y escritorio.
Versión: 11 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Resumen** (lo primero que se ve): las cifras de 7 días (**CONVERSACIONES**, **RESOLVIÓ SOLO**, **A UNA PERSONA** —con caso en Soporte o al
  dueño—, **ACCIONES CONFIRMADAS**), tres barras (**POR QUÉ PASÓ A UNA PERSONA**: dinero, su cuenta, seguridad, pidió una persona, no supo, al
  dueño; **DÓNDE CONTESTA**: vecinos, panel, respuestas automáticas, copiloto; **POR DÓNDE ESCRIBEN**: chat de To'Latino, WhatsApp, SMS),
  **COPILOTO EN SOPORTE** (borradores de 30 días y qué se hizo con ellos), **MARCADAS POR EL EQUIPO** y **PERSONAS DEL EQUIPO** (el horario de
  Configuración › Soporte). Y **LO QUE EL COMPA NO SUPO · PARA EL CENTRO DE AYUDA**: cada vez que contesta «No tengo ese dato», la pregunta
  —tapada, sin la persona— con su audiencia (vecino o negocio), idioma, ciudad y la conversación CP-. Se marca **Anotado** (con motivo) o
  **Corregido en {artículo}** (un artículo del Centro de ayuda); el estado solo avanza (Abiertas → Anotadas → Corregidas). El texto del
  artículo se corrige en el repo y sale con el siguiente despliegue; aquí queda anotado. La pregunta la ven Admin y Soporte; Solo lectura ve
  «Pregunta de un vecino» y las cifras.
- **Marcar respuesta incorrecta** (en la ficha de una conversación): eliges qué estuvo mal (Dato equivocado · Debía pasar a una persona · El
  tono · El idioma · Otra cosa) y escribes el motivo. La ficha dice «Marcada por {quién} · {motivo}: {nota}», sale en **RESULTADO › Marcadas** y en
  Resumen. **Quitar la marca** pide motivo. Una marca viva por conversación; no se borra (queda quién la quitó y por qué). Todo sale en el
  **HISTORIAL** de la ficha. Al vecino no le llega nada.
- **Retención:** pasados los meses de Configuración › El Compa (12 de fábrica), el barrido vacía el texto de una conversación cerrada (lo que
  dijo la persona, lo que contestó El Compa, el resumen al pasar a una persona, la pregunta de «no supo», la nota de una marca, los borradores
  del copiloto y el teléfono cifrado) y deja las cifras: resultado, motivo, uso, gasto. La ficha dice «El texto se borró el {día}…» y ya no se
  marca. A los 30 días de que alguien pide borrar su cuenta, igual con sus conversaciones y sus casos de Soporte (y las fotos de esos casos).
- **El gasto del mes:** cuánto lleva El Compa en IA (precios de la API con el recargo de EE. UU.), el **tope** ($100 al mes de fábrica), el
  **aviso** (80 %) y lo que está en curso. Cada llamada a la IA **reserva** su costo máximo antes de salir y se liquida con lo que de verdad
  costó; si no cabe en el tope, no se llama: contestan las reglas fijas y la persona tiene «Con una persona». Muchas llamadas a la vez nunca
  pasan del tope.
- **Interruptores POR NIVEL** (vecinos, panel del negocio, respuestas automáticas, copiloto) y **POR CANAL** (chat de To'Latino, WhatsApp, SMS).
  Apagado = el camino de siempre: la ayuda abre el formulario, Soporte dice «Escríbenos», el panel avisa, no hay respuestas automáticas y el
  copiloto no sale. **POR CIUDAD** y **POR NEGOCIO**: pausar todo El Compa o un nivel en un solo lugar.
- **Modelo:** Claude Haiku 5.5 para vecinos, panel y respuestas automáticas; Claude Sonnet 5.5 solo para el copiloto del equipo. «Contesta
  ahora» dice si corre Claude (con la llave), el simulador del servidor de pruebas (sin llave) o las reglas fijas.
- **Reglas fijas (no se apagan):** siempre dice que es IA, nunca mueve dinero ni cambia la cuenta, nunca pide tarjeta, contraseñas, SSN ni
  estatus, no da consejo legal, médico ni de inmigración y contesta en el idioma de la persona.
- **Conversaciones:** cifras de 7 días (cuántas, resolvió solo, a una persona, acciones confirmadas; con un DÓNDE elegido, las de ese nivel) y
  cuántas por nivel (**VECINOS · 7 D**, **PANEL DEL NEGOCIO · 7 D**…), filtros **DÓNDE · RESULTADO · CANAL**, la búsqueda por número **CP-** y la
  lista (número, nivel, dónde —Soporte, hoja de ayuda o Panel—, canal, mensajes, ciudad, resultado, motivo y si contestó sin IA), sin el texto.
  **DÓNDE › Panel del negocio** son las conversaciones del asistente del panel (dueños y su equipo). Al tocar una, **la ficha**: QUIÉN · NEGOCIO · CANAL · RESULTADO · MOTIVO · CASO EN SOPORTE · DÓNDE, el hilo tal
  como se guardó (tapado), «Contestó sin IA (reglas fijas)» si pasó, las acciones que preparó y en qué quedaron, y **QUIÉN LA LEYÓ**. La ficha
  la abren **Admin y Soporte**; **cada apertura queda anotada** (quién y cuándo) antes de mostrar el hilo y esa lista no se borra. Solo lectura
  ve las cifras, no el hilo.

- **COPILOTO EN SOPORTE · 30 D** (Conversaciones): cuántos borradores pidió el equipo (en casos y en ayudas escaladas) y qué se hizo con ellos:
  **enviados tal cual**, **editados**, **descartados** (pidieron otro, eligieron una macro o nadie lo envió en un día) y cuántos sin IA (reglas).
  Sin personas ni texto. En **POR NIVEL**, la fila **Copiloto** dice lo que gastó este mes (usa Claude Sonnet) y sus llamadas; en **DÓNDE ›
  Copiloto**, sus conversaciones (una por caso y por persona del equipo; la ficha con el borrador, lectura anotada). El copiloto se explica en la
  ayuda de Soporte.
- **Negocios › un negocio › El Compa:** las cifras de 30 días del asistente en el panel de ese negocio (conversaciones, «Ir a …» que tocaron,
  casos que pasaron a Soporte, contestadas sin IA, por resultado) y si El Compa está en pausa ahí. Sin texto ni personas; el hilo, en
  Conversaciones (lectura anotada). Y **RESPUESTAS AUTOMÁTICAS** (Pro): si el negocio las encendió, lo que contestó y lo que pasó al negocio en
  30 días, los reportes «Una respuesta de El Compa» y **Apagar El Compa aquí** (con motivo; aviso al dueño, que apela por Soporte) o **Volver a
  permitirlas**.
- **Pestaña Negocios:** dónde están encendidas las respuestas automáticas y dónde las apagó To'Latino, con sus cifras de 30 días; cada fila lleva
  a la ficha del negocio. **DÓNDE › Respuestas automáticas** en Conversaciones muestra sus conversaciones (la ficha con el hilo, anotada).
- **Pestaña Canales (WhatsApp y SMS):** cifras (ENTRADAS · 24 H con firma buena, RECHAZADAS · 24 H por firma, hora o tamaño, RESPUESTAS · 24 H,
  STOP · 30 D y los enlaces de un uso de 7 días), el **modo** de cada canal (simulador del sandbox, proveedor real o apagado), los **NÚMEROS QUE
  RECIBEN** (el de To'Latino = El Compa de los vecinos; el de un negocio = sus respuestas automáticas) con **Conectar un número** y **Retirar**
  (Admin, con motivo y auditoría), el **REGISTRO DE ENTRADA** sin texto ni teléfono (una huella corta para ver que es el mismo teléfono, si era
  una cuenta, a qué número, qué pasó, qué salió y la conversación CP-) y, solo en el sandbox, el **SIMULADOR** (manda un mensaje como un
  teléfono y muestra lo que El Compa contestó, con el enlace real; queda en la auditoría con solo los 4 últimos números).
- **Colas › Mensajes reportados:** si en la conversación contestó El Compa, sus mensajes salen marcados **EL COMPA** y el caso ofrece **Apagar El
  Compa aquí** (solo en esa conversación; el negocio la sigue viendo y contestando) y **El Compa en el negocio**.

## Cómo se usa
1. **Pausar un nivel o un canal:** toca su interruptor, elige o escribe el motivo y **Poner en pausa**. Para volver: el interruptor, motivo y
   **Encender**. Vale desde el mensaje siguiente.
2. **Pausar en una ciudad:** **Pausar aquí**, elige qué se pausa (todo o un nivel) y el motivo. **Levantar** la vuelve a encender.
3. **Pausar en un negocio:** **Pausar en un negocio**, escribe su id o su nombre exacto, elige qué se pausa y el motivo.
4. **Cambiar el tope:** **Cambiar el tope**, el monto en dólares (entre $0 y $10,000; $0 = sin IA) y el motivo. Vale desde la llamada siguiente.
   También está en Configuración › El Compa, con el aviso, la espera máxima, los límites por persona y el vencimiento de las acciones.
5. **Canales › Conectar un número:** elige el canal (WhatsApp · Meta o SMS · Telnyx; en el sandbox también «de prueba»), escribe el número (SMS:
   10 dígitos; WhatsApp: el phone_number_id de Meta) y, si es de un negocio, su id después de una coma («100200300401, sabor-dominicano»), y el
   motivo. **Retirar** lo deja sin recibir (no se borra). El **simulador**: elige el número, el teléfono desde el que «escribes» y el mensaje.
6. **Lo que no supo:** en Resumen, **Anotado** (elige o escribe el motivo) o **Corregido en…** (elige el artículo y el motivo); **Ver
   conversación** abre su ficha (tu lectura queda anotada). Los chips **Abiertas · Anotadas · Corregidas** cambian la lista.
7. **Marcar:** en la ficha, **Marcar respuesta incorrecta** → qué estuvo mal → motivo → **Marcar**. Para deshacerlo, **Quitar la marca** con motivo.
8. **Conversaciones:** filtra por DÓNDE, RESULTADO y CANAL o busca un **CP-**; **Siguientes** para ver más. Toca una para abrir su ficha (tu
   lectura queda anotada); desde ahí, **Ver TK-… en Soporte** y **Ver a la persona**.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| El gasto pasa el aviso (80 %) | Aviso al equipo Admin (una vez al mes) y la alerta en Super Admin › Inicio. |
| Llega al tope | Aviso «llegó al tope» al equipo Admin (una vez) y alerta roja en Inicio. Hasta el mes siguiente (o hasta subir el tope) contestan las reglas fijas. |
| La IA tarda más que la espera máxima (8 s) o falla | Contestan las reglas fijas; la conversación queda «contestó sin IA». Un tiempo agotado cuenta lo reservado. |
| La IA contesta algo que no se puede decir | El verificador lo frena (sin fuente, un precio o plazo inventado, «ya lo cancelé», un teléfono, un dato tapado, un enlace de afuera, emoji) y contestan las reglas. |
| Alguien escribe muchos mensajes | Después de 20 en una hora (o 60 en un día) El Compa ofrece «Con una persona» sin llamar a la IA. |
| Tu rol no es Admin | Ves todo; al tocar un interruptor: «Tu rol no cambia interruptores.» |
| Servidor de producción | El Compa queda apagado hasta que se enciende todo, aunque los interruptores digan otra cosa. |
| Pausas «Panel del negocio» (o el negocio, o su ciudad) | En el panel, la sección El Compa dice «El Compa no está disponible ahora» y lleva a Ayuda y Soporte; el resto del panel sigue igual. Igual al tope. |
| Alguien del equipo de un negocio pregunta por una parte del panel que no tiene | El Compa contesta «Eso lo ve el dueño del negocio», sin enlace; nada de esa parte le llega a la IA. |
| Apagas las respuestas automáticas de un negocio | Sus clientes vuelven a la respuesta fija de siempre (si el negocio la tiene); el dueño ve el motivo y no las puede encender. |
| Un cliente reporta una respuesta de El Compa | Caso en Mensajes reportados con el motivo «Una respuesta de El Compa»; ahí se apaga en esa conversación o se va al negocio. |
| Pausas «Respuestas automáticas», el canal, la ciudad o llega al tope | Mensajes funciona exactamente como antes: la respuesta fija de siempre, si el negocio la tiene. |
| Pausas el canal WhatsApp o SMS | No sale nada por ese canal (ni la respuesta fija); un STOP se anota igual. La app sigue igual. |
| Llega una entrada sin firma, con firma mala o con la hora fuera de la ventana | Se rechaza (401) sin guardar nada; solo se cuenta en RECHAZADAS. |
| El mismo mensaje llega dos veces (el proveedor reintenta) | Una sola entrada y una sola respuesta. |
| Escribe un número sin cuenta o una cuenta que no encendió el canal | La misma respuesta fija (cómo entrar y dónde encenderlo); nada de ninguna cuenta. |
| Quieres marcar una conversación ya marcada | «Ya está marcada»: primero se quita la marca. |
| Solo lectura o Soporte de otra ciudad intenta marcar o abrir un hilo | «Tu rol ve las cifras…» o «Esa conversación no existe»; no queda lectura. |
| Una conversación cerró hace más de 12 meses | El barrido vacía su texto; quedan las cifras y la analítica cuenta lo mismo. |
| Alguien borró su cuenta hace 30 días | Sus casos de Soporte y conversaciones cerradas quedan sin texto (y sin fotos); el caso sigue con su estado y tema. |
| Pausas «Copiloto», el canal o la ciudad, o llega al tope | En Soporte y en Colas › Ayuda con pedidos y citas no sale «Sugerir respuesta con El Compa»: todo como antes (macros, Enviar, Resolver). |

## Preguntas frecuentes
- **¿El Compa puede cobrar o devolver?** No. Solo prepara: cancelar una solicitud pendiente y gratis, abrir una pantalla o ir a una sección del
  panel. La persona confirma con un toque y la acción pasa por la misma función y los mismos permisos de siempre.
- **¿Qué ve la IA?** Lo mínimo de esa persona, tapado: sus operaciones recientes y la ayuda de su audiencia. Nunca de otra persona, ni Salud,
  Profesionales, Niños, mensajes privados o algo del Super Admin.
- **¿Se guarda lo que dijo la gente?** Las conversaciones se guardan tapadas; el libro de uso (tokens, costo, modelo, espera) no guarda texto.
  Pasados los meses de retención (12) solo quedan las cifras.
- **¿Lo que no supo se corrige solo?** No: alguien lo anota y el artículo se corrige en el repo; «Corregido en …» dice dónde quedó.
- **¿Qué prueba la firma del proveedor?** Que el mensaje lo mandó Meta o Telnyx, no quién lo escribió. Por eso El Compa solo contesta a ese
  teléfono, solo a una cuenta que lo encendió en Mi cuenta › Avisos, y nunca hace nada por mensaje: manda un enlace de un uso que se confirma en
  la app después de entrar con el código.
- **¿Dónde se pone la llave de Anthropic?** En los secretos del servidor, nunca en el repo ni en el chat. Sin llave, corre el simulador en el
  servidor de pruebas y las reglas fijas en producción.

## English

### What it does
- **Overview** (the first thing you see): the 7-day numbers (**CONVERSATIONS**, **RESOLVED ON ITS OWN**, **TO A PERSON** —with a Support case or sent
  to the owner—, **ACTIONS CONFIRMED**), three bars (**WHY IT WENT TO A PERSON**: money, their account, security, asked for a person, didn't
  know, to the owner; **WHERE IT ANSWERS**: neighbors, dashboard, auto-replies, copilot; **WHERE THEY WRITE FROM**: To'Latino chat, WhatsApp, SMS),
  **COPILOT IN SUPPORT** (30-day drafts and what was done with them), **FLAGGED BY THE TEAM** and **TEAM MEMBERS** (the hours from
  Settings › Support). And **WHAT EL COMPA DIDN'T KNOW · FOR THE HELP CENTER**: every time it answers «I don't have that information», the
  question —covered, without the person— with its audience (neighbor or business), language, city and the CP- conversation. Mark it **Noted**
  (with a reason) or **Fixed in {article}** (a Help Center article); the status only moves forward (Open → Noted → Fixed). The article text is
  fixed in the repo and goes out with the next release; here it is only noted. Admin and Support see the question; Read-only sees
  «A neighbor's question» and the numbers.
- **Flag wrong answer** (in a conversation record): you pick what went wrong (Wrong information · Should have handed off to a person · Tone ·
  Language · Something else) and write the reason. The record says «Flagged by {who} · {reason}: {note}», and it shows up in **OUTCOME › Flagged**
  and in Overview. **Remove the flag** asks for a reason. One live flag per conversation; it is never deleted (it keeps who removed it and why).
  Everything shows in the record's **HISTORY**. The neighbor gets nothing.
- **Retention:** after the months set in Settings › El Compa (12 by default), the sweep empties the text of a closed conversation (what the person
  said, what El Compa answered, the summary when it handed off to a person, the «didn't know» question, a flag's note, the copilot's drafts and
  the encrypted phone) and keeps the numbers: outcome, reason, usage, spend. The record says «The text was deleted on {day}…» and can no longer be
  flagged. 30 days after someone asks to delete their account, the same happens to their conversations and their Support cases (and those cases'
  photos).
- **The month's spend:** how much El Compa has used in AI (API prices plus the U.S. surcharge), the **cap** ($100 a month by default), the
  **warning** (80 %) and what is in flight. Every AI call **reserves** its maximum cost before going out and settles with what it really
  cost; if it does not fit under the cap, the AI is not called: the fixed rules answer and the person has «Talk to a person». Many calls at once
  never go over the cap.
- **Switches BY LEVEL** (neighbors, business dashboard, auto-replies, copilot) and **BY CHANNEL** (To'Latino chat, WhatsApp, SMS). Off = the usual
  path: Help opens the form, Support says «Write to us», the dashboard shows a notice, there are no auto-replies and the copilot does not appear.
  **BY CITY** and **BY BUSINESS**: pause all of El Compa or one level in one place.
- **Model:** Claude Haiku 5.5 for neighbors, the dashboard and auto-replies; Claude Sonnet 5.5 only for the team copilot. «Answers now» says
  whether Claude is running (with the key), the test-server simulator (without a key) or the fixed rules.
- **Fixed rules (they cannot be turned off):** it always says it is AI, never moves money or changes the account, never asks for a card,
  passwords, SSN or status, gives no legal, medical or immigration advice, and answers in the person's language.
- **Conversations:** 7-day numbers (how many, resolved on its own, to a person, confirmed actions; with a WHERE selected, those of that level) and
  how many per level (**NEIGHBORS · 7 D**, **BUSINESS DASHBOARD · 7 D**…), the filters **WHERE · OUTCOME · CHANNEL**, the search by **CP-** number
  and the list (number, level, where —Support, help sheet or Dashboard—, channel, messages, city, outcome, reason and whether it answered without
  AI), without the text. **WHERE › Business dashboard** are the dashboard assistant's conversations (owners and their team). Tapping one opens
  **the record**: WHO · BUSINESS · CHANNEL · OUTCOME · REASON · SUPPORT CASE · WHERE, the thread as it was stored (covered), «Replied without AI
  (fixed rules)» if that happened, the actions it prepared and how they ended, and **WHO READ IT**. **Admin and Support** open the record;
  **every opening is logged** (who and when) before the thread is shown, and that list is never deleted. Read-only sees the numbers, not the
  thread.
- **COPILOT IN SUPPORT · 30 D** (Conversations): how many drafts the team asked for (in cases and in escalated help requests) and what was done
  with them: **sent as is**, **edited**, **discarded** (they asked for another, picked a macro, or nobody sent it within a day) and how many
  without AI (rules). No people and no text. In **BY LEVEL**, the **Copilot** row shows what it spent this month (it uses Claude Sonnet) and its
  calls; in **WHERE › Copilot**, its conversations (one per case and per team member; the record with the draft, reading logged). The copilot is
  explained in the Support help.
- **Businesses › a business › El Compa:** the 30-day numbers of the assistant in that business's dashboard (conversations, the «Go to …» links
  they tapped, cases passed to Support, answered without AI, by outcome) and whether El Compa is paused there. No text or people; the thread is in
  Conversations (reading logged). And **AUTOMATIC REPLIES** (Pro): whether the business turned them on, what it answered and what was passed to
  the business in 30 days, the «An El Compa reply» reports, and **Turn off El Compa here** (with a reason; the owner is notified and appeals through
  Support) or **Allow them again**.
- **Businesses tab:** where auto-replies are on and where To'Latino turned them off, with their 30-day numbers; each row leads to the business's
  record. **WHERE › Auto-replies** in Conversations shows their conversations (the record with the thread, logged).
- **Channels tab (WhatsApp and SMS):** numbers (ENTRIES · 24 H with a good signature, REJECTED · 24 H for signature, time or size, REPLIES · 24 H,
  STOP · 30 D and the one-use links of 7 days), each channel's **mode** (sandbox simulator, real provider or off), the **NUMBERS THAT RECEIVE**
  (To'Latino's = El Compa for neighbors; a business's = its auto-replies) with **Connect a number** and **Retire** (Admin, with a reason and
  audit), the **INBOUND LOG** without text or phone (a short fingerprint to see it is the same phone, whether it was an account, to which number,
  what happened, what went out and the CP- conversation) and, in the sandbox only, the **SIMULATOR** (it sends a message as a phone and shows what
  El Compa answered, with the real link; it is logged in the audit with only the last 4 digits).
- **Queues › Reported messages:** if El Compa answered in the conversation, its messages are marked **EL COMPA** and the case offers **Turn off
  El Compa here** (only in that conversation; the business still sees it and keeps answering) and **El Compa in the business**.

### How to use it
1. **Pause a level or a channel:** tap its switch, pick or write the reason and **Pause**. To come back: the switch, a reason and **Turn on**. It
   applies from the next message.
2. **Pause in a city:** **Pause here**, pick what is paused (all or one level) and the reason. **Lift** turns it back on.
3. **Pause in a business:** **Pause for a business**, write its id or exact name, pick what is paused and the reason.
4. **Change the cap:** **Change the cap**, the amount in dollars (between $0 and $10,000; $0 = no AI) and the reason. It applies from the next
   call. It is also in Settings › El Compa, with the warning, the maximum wait, the per-person limits and the expiry of actions.
5. **Channels › Connect a number:** pick the channel (WhatsApp · Meta or SMS · Telnyx; in the sandbox also «test»), write the number (SMS: 10
   digits; WhatsApp: Meta's phone_number_id) and, if it belongs to a business, its id after a comma («100200300401, sabor-dominicano»), and the
   reason. **Retire** leaves it not receiving (it is not deleted). The **simulator**: pick the number, the phone you «write» from and the message.
6. **What it didn't know:** in Overview, **Noted** (pick or write the reason) or **Fixed in…** (pick the article and the reason); **View
   conversation** opens its record (your reading is logged). The chips **Open · Noted · Fixed** change the list.
7. **Flag:** in the record, **Flag wrong answer** → what went wrong → reason → **Flag**. To undo it, **Remove the flag** with a reason.
8. **Conversations:** filter by WHERE, OUTCOME and CHANNEL or search a **CP-**; **Next** to see more. Tap one to open its record (your reading is
   logged); from there, **View TK-… in Support** and **View the person**.

### What happens in each case
| Case | What happens |
|---|---|
| Spend passes the warning (80 %) | Notice to the Admin team (once a month) and the alert in Super Admin › Home. |
| It reaches the cap | «Reached the cap» notice to the Admin team (once) and a red alert in Home. Until next month (or until the cap is raised) the fixed rules answer. |
| The AI takes longer than the maximum wait (8 s) or fails | The fixed rules answer; the conversation is marked «replied without AI». A timeout counts what was reserved. |
| The AI answers something that cannot be said | The checker stops it (no source, an invented price or deadline, «I already cancelled it», a phone number, covered data, an outside link, emoji) and the rules answer. |
| Someone writes many messages | After 20 in an hour (or 60 in a day) El Compa offers «Talk to a person» without calling the AI. |
| Your role is not Admin | You see everything; when you tap a switch: «Your role can't change switches.» |
| Production server | El Compa stays off until everything is turned on, even if the switches say otherwise. |
| You pause «Business dashboard» (or the business, or its city) | In the dashboard, the El Compa section says «El Compa isn't available right now» and leads to Help and Support; the rest of the dashboard stays the same. Same at the cap. |
| A business team member asks about a part of the dashboard they don't have | El Compa answers «The business owner handles that», with no link; nothing from that part reaches the AI. |
| You turn off a business's auto-replies | Its customers go back to the usual fixed reply (if the business has one); the owner sees the reason and cannot turn them on. |
| A customer reports an El Compa reply | A case in Reported messages with the reason «An El Compa reply»; there you turn it off in that conversation or go to the business. |
| You pause «Auto-replies», the channel or the city, or it reaches the cap | Messages works exactly as before: the usual fixed reply, if the business has one. |
| You pause the WhatsApp or SMS channel | Nothing goes out through that channel (not even the fixed reply); a STOP is still recorded. The app stays the same. |
| An entry arrives with no signature, a bad signature or a time outside the window | It is rejected (401) without saving anything; it is only counted in REJECTED. |
| The same message arrives twice (the provider retries) | One entry and one reply. |
| A number without an account, or an account that did not turn the channel on, writes | The same fixed reply (how to sign in and where to turn it on); nothing from any account. |
| You want to flag a conversation that is already flagged | «It is already flagged»: remove the flag first. |
| Read-only, or Support from another city, tries to flag or open a thread | «Your role sees the numbers…» or «That conversation doesn't exist»; no reading is logged. |
| A conversation closed more than 12 months ago | The sweep empties its text; the numbers stay and analytics counts the same. |
| Someone deleted their account 30 days ago | Their Support cases and closed conversations are left without text (and without photos); the case keeps its status and topic. |
| You pause «Copilot», the channel or the city, or it reaches the cap | In Support and in Queues › Help with orders and appointments, «Suggest a reply with El Compa» does not appear: everything as before (macros, Send, Resolve). |

### FAQ
- **Can El Compa charge or refund?** No. It only prepares: cancel a pending free request, open a screen or go to a dashboard section. The person
  confirms with a tap and the action goes through the same function and the same permissions as always.
- **What does the AI see?** The minimum about that person, covered: their recent operations and the help for their audience. Never about another
  person, nor Health, Professionals, Kids, private messages or anything from Super Admin.
- **Is what people said stored?** Conversations are stored covered; the usage ledger (tokens, cost, model, wait) stores no text. After the
  retention months (12) only the numbers remain.
- **Does what it didn't know get fixed by itself?** No: someone notes it and the article is fixed in the repo; «Fixed in …» says where it landed.
- **What does the provider's signature prove?** That Meta or Telnyx sent the message, not who wrote it. That is why El Compa only answers that
  phone, only an account that turned it on in My account › Notices, and never does anything by message: it sends a one-use link that is
  confirmed in the app after signing in with the code.
- **Where does the Anthropic key go?** In the server secrets, never in the repo or in chat. Without a key, the simulator runs on the test server
  and the fixed rules in production.
