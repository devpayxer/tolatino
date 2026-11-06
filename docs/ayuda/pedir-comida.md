# Pedir comida · Ordering food

_Pantallas: pestaña **Menú** de la página del negocio (`/n/{negocio}?tab=menu`), **Finalizar pedido**
(`/n/{negocio}/pagar`) y **Tu pedido** (`/pedido/{número}`), teléfono y escritorio. Versión: Fase 2 · bloque 2b
(6 nov 2026), con lo del 2c (estados reales, cancelar, volver a pedir) y el delivery del 2f. Comida y Bebidas. Pickup con
pago en el local; delivery con efectivo al recibir; tarjeta (2d) y Ayuda con el pedido llegan en sus bloques._

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
  hoy cada 30 minutos), cómo pagas (en el local) y el resumen. **Enviar pedido**.
- **Finalizar pedido con delivery:** **Entrega** (tu dirección predeterminada de Mis direcciones; **Cambiar** te lleva a
  elegir otra o agregar una y vuelve al pago), cuándo llega, **Cómo te lo entregamos** (en la mano o dejar en la puerta),
  **Al llegar** (toca el timbre, no toques el timbre, llámame, escríbeme), instrucciones para el repartidor (200 letras),
  **Guardar para Casa** (la próxima vez sale igual), **Propina al repartidor** (15, 18, 20 % u otra; va completa a quien
  entrega) y el resumen con envío y propina. Pagas en efectivo al recibir.
- **Tu pedido enviado:** número, estado (enviado → aceptado → en la cocina → listo → recogido, con la hora real de cada
  paso), a qué hora está listo, cuánto pagas en el local, dónde recoges y lo que pediste. Llamar al negocio. Se
  actualiza solo mientras está en curso.
- **Tu pedido con delivery:** enviado → preparando → en camino → entregado, **LLEGA** entre tal y tal hora, «Pagas $X en
  efectivo al recibir», a dónde se entrega y cómo, envío y propina. Si el negocio usa una app externa (DoorDash, Uber
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

## Preguntas frecuentes
**¿Me cobran algo en la app?** No. Pagas en el local cuando recoges. El pago con tarjeta llega más adelante.

**¿Puedo cancelar?** Sí, gratis, mientras el negocio no lo acepte («Cancelar pedido» en tu pedido). Después, llama al
negocio.

**¿Por qué no veo delivery?** Ese negocio no lleva a domicilio, tu dirección queda fuera de su zona, ya pasó su último
delivery de hoy o lo tiene en pausa. Pickup sigue disponible.

**¿La propina es obligatoria?** No. Puedes elegir 15, 18, 20 % u otra cantidad, incluso $0. Va completa a quien entrega.

**¿Cómo pago el delivery?** En efectivo al recibir. El pago con tarjeta llega más adelante.

**¿Y si cambian el precio después de pedir?** Tu pedido guarda el precio con el que lo hiciste.

---

## English
The **Menu** tab shows categories (sticky), Popular, and each dish with photo, price and tags (sold out today, in store
only, only N left, popular, its own hours, takes N min). The + adds dishes without options directly and stretches into
− qty +; dishes with options open a sheet that marks what is required, adds option prices and takes kitchen
instructions. Tapping + again asks "same again or with changes"; − asks which one when you have several versions. Your
order (bottom bar on phones, right card on desktop) lets you edit, change quantities and see subtotal, 6% tax and total;
it is kept on your phone for 24 hours per business. **Checkout** shows where you pick up (address, the business's note,
directions), when (as soon as possible or a time today every 30 minutes), how you pay (at the store) and the summary.
**Your order** shows its number and status (sent → accepted → in the kitchen → ready → picked up), ready time, what you
pay at the store, pickup address and items, with Call the business; it refreshes while waiting. The server recalculates
prices, options, stock, hours and the Free monthly cap on every order; a double tap creates only one order; with three
orders waiting you must wait for a reply; if the business does not answer within 10 minutes the order shows NO REPLY and
nothing is charged. Free businesses show 5 dishes and take up to 10 online orders a month, then show the list and Call.
You can cancel for free until the business accepts (Cancel order), and Order again puts the same items back in your
cart. **Delivery:** when the business delivers, choose Delivery or Pickup above the menu (remembered). Delivery shows the
arrival window, PICKUP ONLY / DELIVERY ONLY tags, the delivery fee, the free-delivery bar and the delivery minimum.
Checkout uses your default address from My addresses (Change goes there and back), when it arrives, hand it to me or
leave at door, on-arrival options, driver notes, Save for this address, and a 15/18/20 % or custom tip that goes fully to
the driver; you pay cash on delivery. Your order shows sent → preparing → on the way → delivered, the arrival window,
where and how it is delivered, fee and tip, and Track on DoorDash when the business uses an external app and pastes the
link. Out-of-zone addresses, minimums and fees are checked again by the server. Card payment and order help arrive in
later blocks.
