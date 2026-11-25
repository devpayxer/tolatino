# Panel: Pedidos · Dashboard: Orders

_Pantallas: `/panel/{negocio}/hoy` (Hoy), `/panel/{negocio}/clientes` (Clientes), `?det=ped:{número}` (detalle de un pedido) y
`/panel/{negocio}/vendes/pedidos` (Lo que vendes › Pedidos en línea). Teléfono y escritorio. Comida y Bebidas: pickup con pago en el local y delivery
con efectivo al entregar. Versión: 25 nov 2026. Audiencia: negocio. Tema: panel._

## Qué hace
- **Hoy:** cuatro cifras (esperan tu respuesta — en negro cuando hay alguno —, hoy en tu agenda, vendido hoy, vistas
  hoy), el aviso del plan Free (cuántos pedidos van del mes), **Esperan tu respuesta** con **Aceptar** y **Rechazar** en
  cada pedido y **Hoy en tu agenda** con los aceptados, los listos y los que van en camino.
- **Detalle de un delivery:** **Entrega** con la dirección, el código postal y la distancia, **Cómo llegar** y **Llamar**
  al cliente; cómo lo quiere (en la mano o en la puerta, timbre, nota); el total con envío y propina; y lo que sigue:
  Aceptar → **Salió en camino** → **Entregado** (cobrado en efectivo). Con una app externa, el campo **Enlace de
  seguimiento** (https://…): al guardarlo, el cliente ve «Seguir en DoorDash».
- **Detalle del pedido:** cliente, a qué hora se prometió, cómo paga (en el local), la nota del cliente, cada plato con
  sus opciones y las instrucciones para la cocina, el total, el **historial** (llegó por To’Latino, aceptado por Rosa,
  listo, entregado…) y lo que sigue: Aceptar / Rechazar → **Listo para recoger** → **Entregado**.
- **Clientes › Pedidos:** todos los pedidos con filtro (todas, esperan tu respuesta, confirmadas y en curso,
  terminadas, no se pudo), búsqueda por nombre o número y «Ver más».
- **Pedidos en línea:** encender o apagar, cómo va hoy (recibes pedidos, en pausa, cerrado), mucho trabajo y último
  pedido (en Menú › Horarios), **tiempo de preparación** (5–120 min), **pedidos programados**, **aceptar al instante**,
  **cómo te pagan** (efectivo al recoger; tarjeta cuando conectes tus cobros) y «Así lo ve el cliente».

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Aceptas | El cliente ve «En la cocina» y a qué hora está listo. |
| Rechazas | El cliente ve que no pudiste aceptarlo y lo que pasó con su tarjeta: no se cobró nada y se soltó la retención; si la tarjeta no la soltó todavía, lo dice (se sigue soltando sola y el equipo de To'Latino tiene el aviso), y tú lo ves igual al rechazar. El aviso que le llega dice lo mismo. El inventario vuelve. |
| No respondes en 10 minutos | El pedido queda **SIN RESPUESTA**: sale de «Esperan», el cliente lo ve y el inventario vuelve. Ya no se puede aceptar. |
| El cliente cancela antes de que aceptes | Sale como CANCELADO («Lo canceló el cliente»); el inventario vuelve. Después de aceptar ya no puede cancelar desde la app: te llama. |
| Listo para recoger | El cliente ve «Listo para recoger · pasa con tu número de pedido». |
| Entregado | El pedido termina («Entregado · pagó en el local») y cuenta en «Vendido hoy». |
| Delivery · Salió en camino | El cliente ve «En camino»; el pedido sigue en «Hoy en tu agenda» como EN CAMINO hasta que marcas Entregado. |
| Delivery · Entregado | Termina como entregado y cobrado en efectivo; cuenta en «Vendido hoy». |
| Enlace de seguimiento que no empieza con https:// | No se guarda: «Pega el enlace completo (empieza con https://)». |
| Aceptar al instante encendido | Los pedidos entran aceptados mientras estés abierto y sin pausa; igual llegan a Hoy para prepararlos. Los programados siempre los aceptas tú. |
| Efectivo al recoger apagado | No se puede guardar: hoy es la única forma de pago (la tarjeta llega con los cobros). |
| Pedidos en línea apagado o pausado por To’Latino | La página y el menú se ven, pero nadie pide en la app; el motivo sale arriba. |
| Dos personas del equipo responden a la vez | Gana la primera; la otra ve «Este pedido ya cambió». |
| Sin acceso a «Hoy y pedidos» | «Sin acceso a esta área»; el detalle de un pedido no se abre. |

Cada paso queda en el historial del pedido y en la auditoría.

## Preguntas frecuentes
**¿Me avisan cuando llega un pedido?** Hoy lo ves en Hoy (la página del pedido del cliente se actualiza sola). Los avisos
por SMS y en el teléfono llegan con las notificaciones.

**¿Puedo proponer un cambio si falta un plato?** No en un pedido de comida: rechaza el pedido o llama al cliente.

**¿Cuánto cobra To’Latino?** En los pedidos que pagan en tu local, nada.

## English

### What it does
- **Today:** four figures (awaiting your answer — in black when there are any —, today on your agenda, sold today, views today), the Free plan
  notice (how many orders so far this month), **Awaiting you** with **Accept** and **Reject** on each order and **Today on your agenda** with
  the accepted ones, the ready ones and those on the way.
- **A delivery's detail:** **Delivery** with the address, the ZIP code and the distance, **Directions** and **Call** the customer; how they
  want it (in hand or at the door, doorbell, note); the total with delivery fee and tip; and what comes next: Accept → **Out for delivery** →
  **Delivered** (collected in cash). With an outside app, the **Tracking link** field (https://…): once you save it, the customer sees
  «Follow on DoorDash».
- **An order's detail:** customer, what time was promised, how they pay (at the business), the customer's note, each dish with its options
  and the kitchen instructions, the total, the **history** (came in through To’Latino, accepted by Rosa, ready, delivered…) and what comes
  next: Accept / Reject → **Ready for pickup** → **Delivered**.
- **Customers › Orders:** all the orders with a filter (all, awaiting your answer, confirmed and in progress, finished, could not be done),
  search by name or number and «See more».
- **Online orders:** turn on or off, how it is going today (you receive orders, paused, closed), busy and last order (in Menu › Hours),
  **preparation time** (5–120 min), **scheduled orders**, **accept instantly**, **how you get paid** (cash at pickup; card when you connect your
  payouts) and «This is how the customer sees it».

### What happens in each case
| Case | What happens |
|---|---|
| You accept | The customer sees «In the kitchen» and what time it is ready. |
| You reject | The customer sees you could not accept it and what happened with their card: nothing was charged and the hold was released; if the card has not released it yet, it says so (it keeps being released automatically and the To'Latino team has the alert), and you see the same when you reject. The notification they get says the same. The inventory comes back. |
| You do not respond in 10 minutes | The order is left **NO ANSWER**: it leaves «Awaiting», the customer sees it and the inventory comes back. It can no longer be accepted. |
| The customer cancels before you accept | It shows as CANCELED («The customer canceled it»); the inventory comes back. After you accept they can no longer cancel from the app: they call you. |
| Ready for pickup | The customer sees «Ready for pickup · come by with your order number». |
| Delivered | The order ends («Delivered · paid at the business») and counts in «Sold today». |
| Delivery · Out for delivery | The customer sees «On the way»; the order stays in «Today on your agenda» as ON THE WAY until you mark Delivered. |
| Delivery · Delivered | It ends as delivered and collected in cash; it counts in «Sold today». |
| Tracking link that does not start with https:// | It is not saved: «Paste the full link (starts with https://)». |
| Accept instantly turned on | Orders come in accepted while you are open and not paused; they still reach Today so you can prepare them. Scheduled ones you always accept yourself. |
| Cash at pickup turned off | It cannot be saved: today it is the only way to pay (card comes with payouts). |
| Online orders turned off or paused by To’Latino | The page and the menu show, but nobody orders in the app; the reason shows at the top. |
| Two people on the team respond at the same time | The first one wins; the other sees «This order already changed». |
| No access to «Today and orders» | «No access to this area»; an order's detail does not open. |

Every step goes into the order's history and the audit trail.

### FAQ
**Do you notify me when an order comes in?** Today you see it in Today (the customer's order page updates on its own). SMS and phone
notifications come with the notifications.

**Can I propose a change if a dish is missing?** Not on a food order: reject the order or call the customer.

**How much does To’Latino charge?** On orders paid at your business, nothing.
