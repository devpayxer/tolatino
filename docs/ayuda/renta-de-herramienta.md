# Renta de herramienta · Tool rental

_Pantallas: ficha › pestaña **Tienda** (`/n/{negocio}?tab=shop`), `/n/{negocio}/rentar?a={artículo}`, tu renta `/renta/{T-…}`, Panel › Hoy › «Rentas»
y su detalle, Panel › Lo que vendes › Tu herramienta › «Renta de herramienta», la hoja «Tu banco pide confirmar» (`/pago/verificar?pi=…`), Super Admin › Colas ›
«Daños de rentas» y Super Admin › Transacciones (pestaña Rentas). Versión: 28 nov 2026.
Audiencia: vecino. Tema: pedidos._

## Qué hace
Algunos negocios del hogar rentan herramienta por día (culebra de drenaje, escalera, lavadora a presión, máquina de
alfombras). En la pestaña **Tienda** ves el precio por día, el depósito y cuántas quedan.
- **Apartar:** eliges cuántos días (1, 2, 3 o la semana, que **paga 5 días**), qué día pasas a recoger (hoy si sigue
  abierto, mañana, el sábado) y la tarjeta. **Hoy no se cobra nada**; te la guardan **48 horas** desde el día de recoger.
- **Al recogerla** (el negocio toca «La recogió»): se cobra la renta y se **retiene** el depósito en tu tarjeta. Lo
  retenido no es un cobro: vuelve a tu tarjeta al devolverla.
- **Un día más:** mientras la tienes, desde tu renta; se cobra un día y se corre la fecha de devolver.
- **Al devolverla** (el negocio toca «La devolvió»): se libera el depósito.
- **Ya no la necesito:** mientras está apartada; no se cobra nada y vuelve a la tienda.

### Para el negocio
- Hoy › **Rentas**: apartadas (con el día que recogen), las que tiene la gente (con el día que devuelven y si van tarde) y
  las devueltas con algo pendiente. En el detalle: **La recogió**, **La devolvió**, **La devolvió con un daño** y
  **Cancelar el apartado**.
- Tu herramienta › **Lo que rentas**: cada artículo abre su editor: fotos (hasta 4; la primera sale en tu Tienda), nombre,
  qué incluye, **precio por día** (dólares enteros; la semana cuesta 5 días), **depósito** (de 5 en 5) y **cuántas tienes**.
  En Transporte, también las millas incluidas por día y la milla de más. **Sale en tu Tienda** lo enciende o lo apaga
  (apagado = no se aparta; lo ya apartado sigue). **Agregar algo para rentar** abre uno nuevo. **Quitar de la lista** lo
  saca (queda en tu historial) y solo se puede cuando nadie lo tiene apartado ni rentado. No puedes bajar las unidades por
  debajo de las que la gente tiene ahora. También están ahí tus planes con su interruptor.
- Para rentar en la app necesitas tu cuenta de cobro conectada (Cobros y plan). La comisión de To'Latino es la de rentas.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Pasan las 48 horas y no la recoges | El apartado vence, vuelve a la tienda y te avisamos. No se cobra nada. |
| No quedan unidades | La Tienda dice «Rentadas hoy» y no deja apartar. Dos personas a la vez por la última: una se la lleva. |
| Ya la tienes apartada o rentada | No deja apartar la misma herramienta dos veces. |
| Tu banco no deja cobrar al recoger | No se cobra ni se retiene nada; sigue apartada. Te avisamos para que cambies la tarjeta en tu renta; al negocio le avisamos cuando lo hagas. |
| Tu banco pide confirmar el depósito al recogerla (3-D Secure) | No se cobra nada todavía y no se te pide otra tarjeta: te llega el aviso **«Tu banco pide confirmar el depósito»** con el enlace a la hoja (también el botón **Confirmar con mi banco** en tu renta). Confírmalo con tu banco y la renta sigue sola: se retiene el depósito (ese mismo, nunca dos) y se cobra la renta; al negocio le avisamos que ya puede entregarla. Tienes el tiempo de Configuración › Dinero › «Verificación del banco · dura» (hoy 30 minutos). Mientras tanto sigue apartada, no se cancela ni vence, y el negocio ve **«Espera su banco»** con lo que te queda. Si no la confirmas a tiempo o tu banco dice que no, se suelta, no se cobra nada y pasa lo de una tarjeta que no pasa (cambia la tarjeta). Si el negocio toca «La recogió» otra vez o la abres en dos pestañas, es la misma verificación: un solo aviso, un solo depósito. |
| Tu banco pide confirmar el **cobro de la renta** al recogerla (3-D Secure) | Pasa después de retener el depósito (también justo después de que confirmaste el depósito). No es un «no» del banco: no se cobra la renta todavía, no se te pide otra tarjeta y **el depósito sigue retenido** mientras tanto. Te llega el aviso **«Tu banco pide confirmar el cobro de la renta»** con el enlace a la hoja (también **Confirmar con mi banco** en tu renta); si estabas confirmando el depósito, la hoja sigue sola con el cobro. Confírmalo y la renta queda cobrada (ese mismo cobro, nunca dos) y al negocio le avisamos que ya puede entregarla. Tienes el mismo tiempo de «Verificación del banco · dura». Si tu banco dice que no o no lo confirmas a tiempo, ese cobro se cancela (ya nadie lo puede confirmar), **el depósito se suelta una vez**, no se cobra nada y pasa lo de una tarjeta que no pasa (cambia la tarjeta). Si lo confirmas en el último momento, cuenta: miramos en Stripe antes de soltar nada. El negocio ve **«Espera su banco»** con lo que te queda; si toca «La recogió» otra vez, o el aviso del banco llega a la vez que la hoja, es el mismo cobro: un solo aviso, un solo cobro. |
| Stripe no contesta al cobrar (al recoger, un día más o los días tarde) | El cobro queda en camino y se termina solo en unos minutos: la renta no cambia por eso (sigue apartada, o el día de devolver sigue igual) y no se pide otra tarjeta. Quien tocó lee «quedó en camino, no lo repitas»; si toca otra vez, termina ese mismo cobro (nunca dos). Mientras va en camino, el apartado no se cancela ni vence. Al recoger, al negocio le avisamos cuando se cobra. |
| Tocas «Un día más» y se corta la red (no ves la respuesta) | Vuelve a tocar: si el día ya se cobró, ves «listo» y **no** se cobra otro; si quedó en camino, se termina ese mismo cobro. Cada vez que de verdad pides otro día (después de ver la respuesta), es otro día. |
| Pasa un día y Stripe sigue sin contestar | To'Latino le pregunta a Stripe qué pasó: si el cobro salió, queda hecho (una vez); si nunca llegó, no se cobró nada, el depósito se suelta y al negocio le avisamos para que vuelva a tocar «La recogió» (o la renta apartada ya se puede cancelar). |
| La devuelves tarde | El día siguiente al de devolver te avisamos una vez. Al devolverla, cada día tarde se descuenta del depósito (hasta el depósito) y el resto se libera. Sin depósito, los días tarde se cobran a la tarjeta; si tu banco no deja, se arregla en el local. |
| Llega dañada | El negocio te enseña el daño **con foto y monto** (hasta lo que queda del depósito). Tú decides: **Está bien** (se descuenta, lo demás vuelve) o **No estoy de acuerdo** (lo revisa To'Latino). Si no respondes en 72 h, también lo revisa To'Latino. El depósito sigue retenido mientras tanto. |
| La tienes más de 7 días | La tarjeta suelta las retenciones a los 7 días: el depósito se renueva solo a los 6 días y 20 horas. Si el banco ya no deja, se le avisa al negocio. |
| Stripe no contesta al renovar el depósito | No se suelta el depósito ni se avisa nada mientras se averigua: se reintenta y después se le pregunta a Stripe. Si la renovación no salió y no fue el banco, el negocio lee «no se pudo renovar» (sin culpar al banco). |
| Al renovar (o al no poder renovar), Stripe no suelta el depósito viejo o ya lo había cobrado | El depósito viejo ya no cuenta, pero no se da por soltado hasta que Stripe lo suelta: el barrido lo sigue soltando y el equipo de To'Latino tiene el aviso. Si Stripe ya lo había cobrado, queda cobrado con lo que Stripe cobró. El negocio lee eso, nunca «ya no hay depósito retenido» si no se soltó. |
| El negocio cancela el apartado | Te avisamos. No se cobra nada. |
| El negocio no cobra en la app | No se puede apartar en la app: hay que llamarlo. |

## FAQ
- **¿Me cobran algo al apartar?** No. Se cobra al recogerla.
- **¿El depósito es un cobro?** No, es una retención: el dinero no sale de tu cuenta y se libera al devolverla.
- **¿Puedo quedármela más días?** Sí: «Un día más» en tu renta, o llama al negocio.
- **¿Quién decide si hubo daño?** Primero tú, viendo la foto. Si no estás de acuerdo, To'Latino lo revisa con los dos.
- **¿Por qué mi banco me pidió confirmar el depósito al recogerla?** Algunos bancos piden confirmar un cobro aunque no estés pagando en la app (3-D Secure). Ábrelo desde el aviso o desde tu renta y confírmalo; si no lo haces, no se cobra nada.
- **Confirmé el depósito y mi banco me pide confirmar otra vez: ¿es un error?** No. El depósito (una retención) y la renta (un cobro) son dos movimientos y algunos bancos piden confirmar cada uno. La hoja sigue sola con el de la renta; confírmalo y te la entregan. Si no lo confirmas, no se cobra la renta y el depósito se suelta.
- **(Negocio) Dice «Espera su banco»: ¿la entrego?** Todavía no. Cuando el cliente lo confirma, la renta se cobra sola y te avisamos «ya puedes entregarla». Si no lo confirma, te avisamos y queda como tarjeta que no pasó. El detalle dice si espera el depósito o el cobro de la renta (con el depósito ya retenido).
- **(Equipo) ¿Dónde lo veo?** Super Admin › Transacciones › Rentas: la renta dice si el depósito (o el cobro de la renta: «renta: …») espera que el cliente confirme con su banco, si lo confirmó, si venció o si su banco no lo confirmó; la línea de tiempo de la operación guarda cuándo se pidió cada uno.

## English

### What it does
Some home-service businesses rent tools by the day (drain snake, ladder, pressure washer, carpet machine). In the **Store** tab you see the
price per day, the deposit and how many are left.
- **Reserve:** you choose how many days (1, 2, 3 or the week, which **pays 5 days**), what day you come to pick it up (today if it is still
  open, tomorrow, Saturday) and the card. **Nothing is charged today**; they hold it for you for **48 hours** from the pickup day.
- **When you pick it up** (the business taps «Picked up»): the rental is charged and the deposit is **held** on your card. What is held is not
  a charge: it goes back to your card when you return it.
- **One more day:** while you have it, from your rental; one day is charged and the return date moves.
- **When you return it** (the business taps «Returned»): the deposit is released.
- **No longer needed:** while it is reserved; nothing is charged and it goes back to the store.

#### For the business
- Today › **Rentals**: reserved ones (with the day they pick up), the ones people have (with the day they return and whether they are late)
  and returned ones with something pending. In the detail: **Picked up**, **Returned**, **Returned with damage** and **Cancel the reservation**.
- Your tool › **What you rent**: each item opens its editor: photos (up to 4; the first shows in your Store), name, what it includes,
  **price per day** (whole dollars; the week costs 5 days), **deposit** (in steps of 5) and **how many you have**. In Transportation, also the
  miles included per day and the extra mile. **Shows in your Store** turns it on or off (off = it cannot be reserved; what is already reserved
  stays). **Add something to rent** opens a new one. **Remove from the list** takes it off (it stays in your history) and can only be done
  when nobody has it reserved or rented. You cannot lower the units below those people have now. Your plans with their switch are there too.
- To rent in the app you need your payout account connected (Payouts and plan). To'Latino's fee is the rentals fee.

### What happens in each case
| Case | What happens |
|---|---|
| The 48 hours pass and you do not pick it up | The reservation expires, goes back to the store and we notify you. Nothing is charged. |
| No units left | The Store says «Rented today» and does not let you reserve. Two people at once for the last one: one of them gets it. |
| You already have it reserved or rented | It does not let you reserve the same tool twice. |
| Your bank does not allow the charge at pickup | Nothing is charged or held; it stays reserved. We notify you so you change the card in your rental; we notify the business when you do. |
| Your bank asks you to confirm the deposit at pickup (3D Secure) | Nothing is charged yet and you are not asked for another card: you get the **«Your bank asks you to confirm the deposit»** notice with the link to the sheet (also the **Confirm with my bank** button in your rental). Confirm it with your bank and the rental continues on its own: the deposit is held (that same one, never two) and the rent is charged; we tell the business it can hand it over. You have the time in Settings › Money › «Bank verification · lasts» (30 minutes today). Meanwhile it stays reserved, cannot be cancelled and does not expire, and the business sees **«Awaiting their bank»** with the time you have left. If you do not confirm in time or your bank says no, it is released, nothing is charged and it works like a card that did not go through (change the card). If the business taps «Picked up» again or you open it in two tabs, it is the same verification: one notice, one deposit. |
| Your bank asks you to confirm the **rent charge** at pickup (3D Secure) | It happens after the deposit is held (also right after you confirmed the deposit). It is not a «no» from the bank: the rent is not charged yet, you are not asked for another card and **the deposit stays held** meanwhile. You get the **«Your bank asks you to confirm the rental charge»** notice with the link to the sheet (also **Confirm with my bank** in your rental); if you were confirming the deposit, the sheet continues with the charge on its own. Confirm it and the rent is charged (that same charge, never two) and we tell the business it can hand it over. You have the same «Bank verification · lasts» time. If your bank says no or you do not confirm in time, that charge is cancelled (nobody can confirm it anymore), **the deposit is released once**, nothing is charged and it works like a card that did not go through (change the card). If you confirm at the last moment, it counts: we check Stripe before releasing anything. The business sees **«Awaiting their bank»** with the time you have left; if it taps «Picked up» again, or the bank's notice arrives at the same time as the sheet, it is the same charge: one notice, one charge. |
| Stripe does not answer when charging (at pickup, one more day or late days) | The charge is on its way and finishes by itself in a few minutes: the rental does not change because of it (it stays reserved, or the return day stays the same) and no other card is requested. Whoever tapped reads «it is on its way, do not repeat it»; tapping again finishes that same charge (never two). While it is on its way, the reservation cannot be cancelled and does not expire. At pickup, we notify the business once it is charged. |
| You tap «One more day» and the connection drops (you do not see the answer) | Tap again: if the day was already charged, you see «done» and **no** other day is charged; if it was on its way, that same charge is finished. Each time you really ask for another day (after seeing the answer), it is another day. |
| A day passes and Stripe still has not answered | To'Latino asks Stripe what happened: if the charge went through, it is done (once); if it never arrived, nothing was charged, the deposit is released and we notify the business to tap «Picked up» again (or the held rental can now be cancelled). |
| You return it late | The day after the return day we notify you once. When you return it, each late day is deducted from the deposit (up to the deposit) and the rest is released. Without a deposit, the late days are charged to the card; if your bank does not allow it, it is settled in person. |
| It comes back damaged | The business shows you the damage **with a photo and an amount** (up to what is left of the deposit). You decide: **It's fine** (it is deducted, the rest goes back) or **I disagree** (To'Latino reviews it). If you do not respond in 72 hours, To'Latino reviews it too. The deposit stays held meanwhile. |
| You have it more than 7 days | The card releases holds after 7 days: the deposit renews itself at 6 days and 20 hours. If the bank no longer allows it, the business is notified. |
| When renewing (or failing to renew), Stripe does not release the old deposit or had already charged it | The old deposit no longer counts, but it is not treated as released until Stripe releases it: the sweep keeps releasing it and the To'Latino team has the alert. If Stripe had already charged it, it stays charged with what Stripe charged. The business reads that, never «there is no deposit held anymore» if it was not released. |
| Stripe does not answer when renewing the deposit | The deposit is not released and nothing is sent while it is checked: it is retried and then Stripe is asked. If the renewal did not go through and it was not the bank, the business reads «it could not be renewed» (without blaming the bank). |
| The business cancels the reservation | We notify you. Nothing is charged. |
| The business does not charge in the app | It cannot be reserved in the app: you have to call. |

### FAQ
- **Do you charge me anything when I reserve?** No. It is charged when you pick it up.
- **Is the deposit a charge?** No, it is a hold: the money does not leave your account and is released when you return it.
- **Can I keep it more days?** Yes: «One more day» in your rental, or call the business.
- **Who decides whether there was damage?** First you, looking at the photo. If you disagree, To'Latino reviews it with both of you.
- **Why did my bank ask me to confirm the deposit at pickup?** Some banks ask to confirm a charge even when you are not paying in the app (3D Secure). Open it from the notice or from your rental and confirm it; if you do not, nothing is charged.
- **I confirmed the deposit and my bank asks me to confirm again: is it a mistake?** No. The deposit (a hold) and the rent (a charge) are two movements and some banks ask to confirm each one. The sheet continues with the rent on its own; confirm it and they hand it to you. If you do not confirm it, the rent is not charged and the deposit is released.
- **(Business) It says «Awaiting their bank»: do I hand it over?** Not yet. When the customer confirms, the rent is charged on its own and we tell you «you can hand it over now». If they do not confirm, we let you know and it works like a card that did not go through. The detail says whether it is waiting for the deposit or for the rent charge (with the deposit already held).
- **(Team) Where do I see it?** Super Admin › Transactions › Rentals: the rental says whether the deposit (or the rent charge: «rent: …») is waiting for the customer to confirm with their bank, whether they confirmed it, whether it expired or whether their bank did not confirm it; the operation timeline keeps when it was requested.
