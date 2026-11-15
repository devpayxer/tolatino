# Pedir comida · Ordering food

_Pantallas: pestaña **Menú** de la página del negocio (`/n/{negocio}?tab=menu`), **Finalizar pedido** (`/n/{negocio}/pagar`) y **Tu pedido**
(`/pedido/{número}`), teléfono y escritorio. Comida y Bebidas. Pickup y delivery, con tarjeta o pago en el local según el negocio. Versión: 14 nov 2026. Audiencia: vecino. Tema: pedidos._

## Qué hace
- **Menú (Pro):** pestaña con las categorías arriba (se pegan al bajar), **Populares**, y cada plato con foto, precio y
  sus etiquetas: AGOTADO HOY, SOLO EN EL LOCAL, QUEDAN 2, POPULAR, su horario (p. ej. HASTA 4 PM o SÁB Y DOM) y TARDA 15 MIN.
- **El +:** un plato sin opciones se agrega directo; el + se estira a − cantidad + (la papelera quita el último). Un
  plato con opciones abre su hoja: lo obligatorio va marcado, el botón dice lo que falta («Elige: relleno, caldo») y
  suma el precio de lo elegido. Instrucciones para la cocina, hasta 200 letras.
- **Otra igual o con cambios:** si ya tienes ese plato, el + pregunta si repites uno igual o empiezas otro con cambios.
  Si tienes el mismo plato de varias formas, el − pregunta cuál quitas.
- **Tu pedido:** la barra negra de abajo (teléfono) o la tarjeta de la derecha (escritorio): editar, − / +, subtotal,
  impuestos (6 % en comida preparada) y total. El pedido se guarda en tu teléfono 24 horas por negocio.
- **Delivery / Pickup:** si el negocio lleva a domicilio, arriba del menú eliges **Delivery** o **Pickup** (la app recuerda
  lo último que elegiste). Delivery dice «Llega entre…» (preparación + camino); un plato que solo se recoge dice SOLO
  PICKUP y uno que solo se lleva SOLO DELIVERY. El carrito muestra el **envío**, la barra «Te faltan $X para envío gratis»
  y el **pedido mínimo** de delivery («Mínimo $15 · faltan $10»).
- **Resumen de la página:** hasta 4 platos para pedir directo y la barra «Desde $X · Pedir». Con delivery, el riel dice
  «Pickup N min · Delivery $X».
- **Finalizar pedido:** dónde recoges (dirección, nota del negocio y Cómo llegar), cuándo (lo antes posible o una hora de
  hoy cada 30 minutos), cómo pagas (**Tarjeta** si el negocio la acepta en la app, o **Pagas en el local**) y el resumen. **Enviar pedido**.
- **Finalizar pedido con delivery:** **Entrega** (tu dirección predeterminada de Mis direcciones; **Cambiar** te lleva a
  elegir otra o agregar una y vuelve al pago), cuándo llega, **Cómo te lo entregamos** (en la mano o dejar en la puerta),
  **Al llegar** (toca el timbre, no toques el timbre, llámame, escríbeme), instrucciones para el repartidor (200 letras),
  **Guardar para Casa** (la próxima vez sale igual), **Propina al repartidor** (15, 18, 20 % u otra; va completa a quien
  entrega) y el resumen con envío y propina. Pagas con tarjeta en la app o en efectivo al recibir, según lo que acepte el negocio.
- **Tu pedido enviado:** número, estado (enviado → aceptado → en la cocina → listo → recogido, con la hora real de cada
  paso), a qué hora está listo, cuánto pagas (o si ya va con tarjeta: RETENIDO o PAGADO), dónde recoges y lo que pediste. Llamar al negocio. Se
  actualiza solo mientras está en curso.
- **Tu pedido con delivery:** enviado → preparando → en camino → entregado, **LLEGA** entre tal y tal hora, «Pagas $X en
  efectivo al recibir» (o lo pagado con tarjeta), a dónde se entrega y cómo, envío y propina. Si el negocio usa una app externa (DoorDash, Uber
  Eats) y pega el enlace, sale **Seguir en DoorDash**.
- **Cancelar pedido** (`/pedido/{número}/cancelar`): gratis mientras el negocio no lo acepta; eliges por qué (opcional).
- **Volver a pedir:** al terminar o si no se pudo, pone los mismos platos con sus opciones en tu carrito.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Sin cuenta | «Ir a pagar» lleva a Entra y vuelve al pago con el pedido igual. Sin nombre, primero se pide el nombre. |
| El negocio está cerrado y abre más tarde hoy | «Abre a las X · Programa tu pedido»: se elige la hora (desde 30 min después de abrir). Si no toma pedidos programados, se ve el menú y se pide cuando abra. |
| Cerrado hoy | Se ve el menú; los pedidos se abren cuando el negocio abra. |
| Pedidos en línea en pausa (el negocio) | Se ve el menú, sin +, con la hora en que vuelve. |
| Después del último pedido en línea (N min antes de cerrar) | «Ya no toma pedidos en línea hoy»: se ve el menú; para pedir, llamar. |
| Un plato tiene horario (p. ej. almuerzo hasta las 4) | Fuera de su horario sale atenuado. Programado: se puede hasta 30 min antes de que termine. |
| Agotado, solo en el local, o la opción obligatoria agotada | Atenuado, sin +. |
| Cuenta del día o stock | No deja pedir más de lo que queda ni más del máximo por pedido. Al enviar, se descuenta; en 0 se agota solo hasta las 6 AM. |
| Algo cambió entre el carrito y el pago (se agotó, cambió una opción, el precio) | El servidor no envía el pedido y dice qué pasó; el precio que vale es el del menú de ese momento. |
| Mismo pedido enviado dos veces (doble toque, se cayó la red) | Queda uno solo. |
| Tres pedidos esperando respuesta | No deja enviar otro hasta que contesten. |
| Negocio Free | Una sola página: se ven 5 platos y se piden desde el Resumen, hasta 10 pedidos en línea al mes (lo fija To'Latino). Al llegar, la página muestra la lista y Llamar. |
| El negocio no contesta en 10 minutos | El pedido queda **SIN RESPUESTA** y no se cobra nada. |
| El negocio rechaza | «No pudieron tomar tu pedido · no se cobró nada». |
| Ya lo aceptaron o está listo | Ya no se cancela desde la app: la pantalla de cancelar lo dice y ofrece volver al pedido. |
| To'Latino pausó el Menú o los Pedidos en línea | Sin pestaña Menú, o se ve el menú sin poder pedir. |
| Delivery: tu dirección queda fuera de la zona del negocio | «No llega a tu dirección · Tu dirección queda a N mi y el negocio lleva hasta 3 mi. Pide pickup.» Cambiando a Pickup se puede pedir. El servidor lo vuelve a medir al enviar. |
| Delivery: no tienes dirección guardada | En el pago sale **Agregar dirección**; al guardarla vuelves al pago. |
| Delivery: no llegas al mínimo | El botón dice cuánto falta; el servidor tampoco lo envía. |
| Delivery: el pedido pasa de «gratis desde» | El envío sale $0.00 («Envío gratis»). |
| Delivery: después del último delivery del día o To'Latino pausó el delivery | Solo se ofrece Pickup. |
| Delivery: el negocio marca «Salió en camino» | Ves «En camino»; ya no se cancela desde la app (llama al negocio). |

**El techo de Free** (los 10 pedidos, citas o solicitudes en línea al mes) es el de hoy: To'Latino lo fija en su Configuración y la pantalla siempre dice el que vale en ese momento.

## Preguntas frecuentes
**¿Me cobran algo en la app?** Solo si pagas con **tarjeta**: se retiene al enviar y se cobra cuando el negocio acepta (ver
`pagar-con-tarjeta.md`). Si eliges pagar en el local, pagas cuando recoges.

**¿Puedo cancelar?** Sí, gratis, mientras el negocio no lo acepte («Cancelar pedido» en tu pedido). Después, llama al
negocio.

**¿Por qué no veo delivery?** Ese negocio no lleva a domicilio, tu dirección queda fuera de su zona, ya pasó su último
delivery de hoy o lo tiene en pausa. Pickup sigue disponible.

**¿La propina es obligatoria?** No. Puedes elegir 15, 18, 20 % u otra cantidad, incluso $0. Va completa a quien entrega.

**¿Cómo pago el delivery?** Con tarjeta en la app o en efectivo al recibir, según lo que acepte el negocio.

**¿Y si cambian el precio después de pedir?** Tu pedido guarda el precio con el que lo hiciste.

**¿Qué es «Lleva o es» en un plato?** Las etiquetas que marcó el negocio en su panel (picante, vegetariano, sin gluten, pescado o mariscos, lácteos, huevo, maní o nueces). Las pone el negocio, no To'Latino: no son una garantía médica. Si tienes una alergia, pregúntale al negocio antes de pedir (Mensaje o Llamar) y escríbelo en las instrucciones del plato.

## Cupón
Si sigues a un negocio y publicó un **cupón para seguidores**, al pagar escribe el código en **Código de cupón** y toca **Aplicar**. Si vale, dice «−$3.00 ·
APLICADO» (o el descuento que sea) y el resumen suma la línea del cupón; el impuesto se calcula sobre lo que queda. Si no vale, te dice por qué: no
existe o venció, es solo para seguidores, ya lo usaste, se terminó o tu pedido no llega a la compra mínima. Lo decide To'Latino al enviar el pedido,
no la pantalla: si algo cambió mientras pagabas, te lo dice y el pedido no sale con un descuento que no vale.

## English

### What it does
- **Menu (Pro):** a tab with the categories at the top (they stick as you scroll), **Popular**, and each dish with photo, price and its labels: SOLD OUT TODAY,
  IN-STORE ONLY, 2 LEFT, POPULAR, its schedule (e.g. UNTIL 4 PM or SAT AND SUN) and TAKES 15 MIN.
- **The +:** a dish without options is added directly; the + stretches into − quantity + (the trash can removes the last one). A dish with options opens its
  sheet: what is required is marked, the button says what is missing («Choose: filling, broth») and adds the price of what you chose. Instructions for the
  kitchen, up to 200 characters.
- **Another one the same or with changes:** if you already have that dish, the + asks whether you repeat one the same or start another with changes. If you have
  the same dish in several ways, the − asks which one you remove.
- **Your order:** the black bar at the bottom (phone) or the card on the right (desktop): edit, − / +, subtotal, taxes (6 % on prepared food) and total. The
  order is saved on your phone for 24 hours per business.
- **Delivery / Pickup:** if the business delivers, at the top of the menu you choose **Delivery** or **Pickup** (the app remembers the last one you chose).
  Delivery says «ARRIVES BETWEEN…» (preparation + travel); a dish that is only picked up says PICKUP ONLY and one that is only delivered says DELIVERY ONLY.
  The cart shows the **delivery fee**, the bar «You need $X more for free delivery» and the delivery **minimum order** («Minimum $15 · $10 to go»).
- **Page summary:** up to 4 dishes to order directly and the bar «From $X · Order». With delivery, the rail says «Pickup N min · Delivery $X».
- **Checkout:** where you pick up (address, the business's note and Directions), when (as soon as possible or a time today every 30 minutes), how you pay
  (**Card** if the business accepts it in the app, or **Pay at the place**) and the summary. **Send order**.
- **Checkout with delivery:** **Delivery** (your default address from My addresses; **Change** takes you to choose another or add one and returns to checkout),
  when it arrives, **How we deliver it** (hand it to me or leave at the door), **On arrival** (ring the bell, do not ring the bell, call me, text me),
  instructions for the courier (200 characters), **Save for Home** (next time it comes out the same), **Courier tip** (15, 18, 20 % or another; all of it goes
  to whoever delivers) and the summary with the delivery fee and tip. You pay by card in the app or in cash on receipt, depending on what the business accepts.
- **Your sent order:** number, status (sent → accepted → in the kitchen → ready → picked up, with the real time of each step), what time it is ready, how much you
  pay (or if it already goes by card: HELD or PAID), where you pick up and what you ordered. Call the business. It updates by itself while it is in progress.
- **Your order with delivery:** sent → preparing → on its way → delivered, **ARRIVES** between such and such time, «You pay $X in cash on receipt» (or what was
  paid by card), where it is delivered and how, delivery fee and tip. If the business uses an outside app (DoorDash, Uber Eats) and pastes the link, **Follow on
  DoorDash** shows.
- **Cancel order** (`/pedido/{número}/cancelar`): free while the business has not accepted it; you choose why (optional).
- **Order again:** when it finishes or if it could not be done, it puts the same dishes with their options in your cart.

### What happens in each case
| Case | What happens |
|---|---|
| No account | «Go to pay» takes you to Sign in and returns to checkout with the order the same. Without a name, the name is asked for first. |
| The business is closed and opens later today | «Opens at X · Schedule your order»: you pick the time (from 30 min after opening). If it does not take scheduled orders, you see the menu and order when it opens. |
| Closed today | You see the menu; orders open when the business opens. |
| Online orders paused (by the business) | You see the menu, without +, with the time it comes back. |
| After the last online order (N min before closing) | «No more online orders today»: you see the menu; to order, call. |
| A dish has a schedule (e.g. lunch until 4) | Outside its schedule it shows dimmed. Scheduled: you can until 30 min before it ends. |
| Sold out, in-store only, or the required option sold out | Dimmed, without +. |
| Daily count or stock | It does not let you order more than what is left or more than the maximum per order. When sent, it is deducted; at 0 it sells out on its own until 6 AM. |
| Something changed between the cart and the payment (it sold out, an option changed, the price) | The server does not send the order and says what happened; the price that counts is the one on the menu at that moment. |
| Same order sent twice (double tap, the network dropped) | Only one remains. |
| Three orders waiting for a reply | It does not let you send another until they reply. |
| Free business | A single page: 5 dishes show and are ordered from the Summary, up to 10 online orders a month (set by To'Latino). When it is reached, the page shows the list and Call. |
| The business does not reply in 10 minutes | The order is left **UNANSWERED** and nothing is charged. |
| The business rejects | «They could not take your order · nothing was charged». |
| It was already accepted or is ready | It can no longer be canceled from the app: the cancel screen says so and offers to go back to the order. |
| To'Latino paused the Menu or Online orders | No Menu tab, or you see the menu without being able to order. |
| Delivery: your address is outside the business's area | «It does not reach your address · Your address is N mi away and the business delivers up to 3 mi. Order pickup.» Switching to Pickup lets you order. The server measures it again when sending. |
| Delivery: you have no saved address | At checkout **Add address** shows; when you save it you return to checkout. |
| Delivery: you do not reach the minimum | The button says how much is missing; the server does not send it either. |
| Delivery: the order goes over «free from» | The delivery fee shows $0.00 («Free delivery»). |
| Delivery: after the day's last delivery or To'Latino paused delivery | Only Pickup is offered. |
| Delivery: the business marks «Out for delivery» | You see «On its way»; it can no longer be canceled from the app (call the business). |

**The Free ceiling** (the 10 online orders, appointments or requests a month) is today's: To'Latino sets it in its Configuration and the screen always says the one
that applies at that moment.

### FAQ
**Do they charge me anything in the app?** Only if you pay by **card**: it is held when you send and charged when the business accepts (see `pagar-con-tarjeta.md`).
If you choose to pay at the place, you pay when you pick up.

**Can I cancel?** Yes, free, while the business has not accepted it («Cancel order» in your order). After that, call the business.

**Why don't I see delivery?** That business does not deliver, your address is outside its area, its last delivery of today already passed or it has it paused.
Pickup is still available.

**Is the tip required?** No. You can choose 15, 18, 20 % or another amount, even $0. All of it goes to whoever delivers.

**How do I pay for delivery?** By card in the app or in cash on receipt, depending on what the business accepts.

**What if they change the price after I order?** Your order keeps the price you made it with.

**What is «CONTAINS OR IS» on a dish?** The labels the business marked in its panel (spicy, vegetarian, gluten-free, fish or shellfish, dairy, egg, peanuts or tree
nuts). The business sets them, not To'Latino: they are not a medical guarantee. If you have an allergy, ask the business before ordering (Message or Call) and
write it in the dish instructions.

### Coupon
If you follow a business and it posted a **follower coupon**, type the code in **Coupon code** at checkout and tap **Apply**. If it works, it says «−$3.00 ·
APPLIED» (or whatever the discount is) and the summary adds the coupon line; tax is calculated on what is left. If it does not work, it tells you why: it
does not exist or expired, it is for followers only, you already used it, it ran out or your order does not reach the minimum. To'Latino decides when the
order is sent, not the screen: if something changed while you were paying, it tells you and the order does not go out with a discount that is not valid.
