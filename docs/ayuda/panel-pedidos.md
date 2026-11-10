# Panel: Pedidos · Dashboard: Orders

_Pantallas: `/panel/{negocio}/hoy` (Hoy), `/panel/{negocio}/clientes` (Clientes), `?det=ped:{número}` (detalle de un pedido) y
`/panel/{negocio}/vendes/pedidos` (Lo que vendes › Pedidos en línea). Teléfono y escritorio. Comida y Bebidas: pickup con pago en el local y delivery
con efectivo al entregar. Versión: 6 nov 2026. Audiencia: negocio. Tema: panel._

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
| Rechazas | El cliente ve «No pudieron tomar tu pedido · no se cobró nada». El inventario vuelve. |
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

Today shows four figures (awaiting your reply, today's agenda, sold today, views today), the Free plan notice, orders
awaiting your reply with Accept and Decline, and today's agenda (accepted and ready). The order detail shows the client,
promised time, payment (at the store), client note, each item with options and kitchen instructions, total, a history
timeline and the next step: Accept / Decline → Ready for pickup → Delivered. Clients › Orders lists every order with
filters, search by name or number and "See more". Online orders lets you turn ordering on or off and set prep time,
scheduled orders, instant accept and how they pay (cash at pickup; card once payouts are connected), with a preview of
what the client sees. If you do not reply within 10 minutes the order shows NO REPLY and its stock returns; declined and
client-cancelled orders also return stock. Every step is recorded in the order history and the audit log.
**Delivery:** today's agenda also keeps orders that are on the way. A delivery's detail shows the address with ZIP and
distance, Directions and Call, how the client wants it (hand it to me or leave at door, bell, note), the total with
delivery fee and tip, and the steps Accept → Out for delivery → Delivered (paid in cash). With an external app, paste
the tracking link (https://…) and the client sees "Track on DoorDash".
