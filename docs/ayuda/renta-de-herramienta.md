# Renta de herramienta · Tool rental

_Pantallas: ficha › pestaña **Tienda** (`/n/{negocio}?tab=shop`), `/n/{negocio}/rentar?a={artículo}`, tu renta `/renta/{T-…}`, Panel › Hoy › «Rentas»
y su detalle, Panel › Lo que vendes › Tu herramienta › «Renta de herramienta», Super Admin › Colas › «Daños de rentas». Versión: 21 nov 2026.
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
| Stripe no contesta al cobrar (al recoger, un día más o los días tarde) | El cobro queda en camino y se termina solo en unos minutos: la renta no cambia por eso (sigue apartada, o el día de devolver sigue igual) y no se pide otra tarjeta. Quien tocó lee «quedó en camino, no lo repitas»; si toca otra vez, termina ese mismo cobro (nunca dos). Mientras va en camino, el apartado no se cancela ni vence. Al recoger, al negocio le avisamos cuando se cobra. |
| Pasa un día y Stripe sigue sin contestar | To'Latino le pregunta a Stripe qué pasó: si el cobro salió, queda hecho (una vez); si nunca llegó, no se cobró nada, el depósito se suelta y al negocio le avisamos para que vuelva a tocar «La recogió» (o la renta apartada ya se puede cancelar). |
| La devuelves tarde | El día siguiente al de devolver te avisamos una vez. Al devolverla, cada día tarde se descuenta del depósito (hasta el depósito) y el resto se libera. Sin depósito, los días tarde se cobran a la tarjeta; si tu banco no deja, se arregla en el local. |
| Llega dañada | El negocio te enseña el daño **con foto y monto** (hasta lo que queda del depósito). Tú decides: **Está bien** (se descuenta, lo demás vuelve) o **No estoy de acuerdo** (lo revisa To'Latino). Si no respondes en 72 h, también lo revisa To'Latino. El depósito sigue retenido mientras tanto. |
| La tienes más de 7 días | La tarjeta suelta las retenciones a los 7 días: el depósito se renueva solo a los 6 días y 20 horas. Si el banco ya no deja, se le avisa al negocio. |
| El negocio cancela el apartado | Te avisamos. No se cobra nada. |
| El negocio no cobra en la app | No se puede apartar en la app: hay que llamarlo. |

## FAQ
- **¿Me cobran algo al apartar?** No. Se cobra al recogerla.
- **¿El depósito es un cobro?** No, es una retención: el dinero no sale de tu cuenta y se libera al devolverla.
- **¿Puedo quedármela más días?** Sí: «Un día más» en tu renta, o llama al negocio.
- **¿Quién decide si hubo daño?** Primero tú, viendo la foto. Si no estás de acuerdo, To'Latino lo revisa con los dos.

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
| Stripe does not answer when charging (at pickup, one more day or late days) | The charge is on its way and finishes by itself in a few minutes: the rental does not change because of it (it stays reserved, or the return day stays the same) and no other card is requested. Whoever tapped reads «it is on its way, do not repeat it»; tapping again finishes that same charge (never two). While it is on its way, the reservation cannot be cancelled and does not expire. At pickup, we notify the business once it is charged. |
| A day passes and Stripe still has not answered | To'Latino asks Stripe what happened: if the charge went through, it is done (once); if it never arrived, nothing was charged, the deposit is released and we notify the business to tap «Picked up» again (or the held rental can now be cancelled). |
| You return it late | The day after the return day we notify you once. When you return it, each late day is deducted from the deposit (up to the deposit) and the rest is released. Without a deposit, the late days are charged to the card; if your bank does not allow it, it is settled in person. |
| It comes back damaged | The business shows you the damage **with a photo and an amount** (up to what is left of the deposit). You decide: **It's fine** (it is deducted, the rest goes back) or **I disagree** (To'Latino reviews it). If you do not respond in 72 hours, To'Latino reviews it too. The deposit stays held meanwhile. |
| You have it more than 7 days | The card releases holds after 7 days: the deposit renews itself at 6 days and 20 hours. If the bank no longer allows it, the business is notified. |
| The business cancels the reservation | We notify you. Nothing is charged. |
| The business does not charge in the app | It cannot be reserved in the app: you have to call. |

### FAQ
- **Do you charge me anything when I reserve?** No. It is charged when you pick it up.
- **Is the deposit a charge?** No, it is a hold: the money does not leave your account and is released when you return it.
- **Can I keep it more days?** Yes: «One more day» in your rental, or call the business.
- **Who decides whether there was damage?** First you, looking at the photo. If you disagree, To'Latino reviews it with both of you.
