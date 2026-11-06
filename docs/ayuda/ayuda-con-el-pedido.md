# Ayuda con el pedido · Order help

_Pantallas: `/pedido/{n}` (botón y estado), `/pedido/{n}/ayuda` (APP-NEG-PEDIDO-AYUDA), Panel › Hoy («Ayuda con pedidos») y el
detalle del pedido, y Super Admin › Soporte (cola «Ayuda con pedidos»). Versión: Fase 2 · bloque 2i (6 nov 2026)._

## Qué hace
- **El cliente**, en un pedido ya recibido (hasta **7 días** después), toca **Ayuda con el pedido** y elige qué pasó: falta
  algo, llegó algo equivocado, frío o mal preparado, dañado o derramado; en delivery también llegó tarde o no llegó; problema
  con el pago u otro. Si es de platos, elige cuáles y cuántos. Luego qué le gustaría: **que se lo repongan** (delivery),
  **que le devuelvan lo de esos platos** o **solo avisar**, y un detalle (300 letras; obligatorio en «otro»).
- Es una **solicitud al negocio**: responde en **24 horas** y el cliente lo ve en su pedido. Si no responde, pasa sola a
  To'Latino. Si el negocio respondió y no se arregló, el cliente toca **Pedir que To'Latino lo revise**.
- **El negocio** la ve en **Hoy** («Ayuda con pedidos · responde en 24 h») y en el detalle del pedido, con qué pasó, los
  platos, qué quiere y su nota, y **Enviar respuesta** (500 letras).
- **To'Latino** (Super Admin › Soporte = cola «Ayuda con pedidos», plazo 24 h): el caso con la solicitud, la respuesta del
  negocio y **Resolver con un mensaje** (plantillas). El cliente ve «Solicitud resuelta por To'Latino» en su pedido.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Pedido no recibido o de hace más de 7 días | No sale el botón; la pantalla dice que se pide hasta 7 días después. |
| Ya hay una solicitud | Una por pedido: el pedido muestra su estado. |
| Muchas solicitudes | Hasta 5 al día por persona. |
| Pasan 24 h sin respuesta | Pasa a To'Latino (cola Ayuda con pedidos). |
| Devolución | Hoy se paga en el local o al recibir: la devolución se arregla con el negocio. Con Stripe será a la tarjeta. |

## Preguntas frecuentes
**¿Me devuelven el dinero solos?** Todavía no hay pagos con tarjeta en To'Latino: lo que acuerdes con el negocio se arregla
en el local. To'Latino revisa si el negocio no responde.

---

## English
After receiving an order (up to 7 days), the customer opens an order-help request: what happened, which dishes, what they
want (replacement on delivery, refund of those dishes settled with the business, or just letting them know) and details. The
business replies within 24 hours from Today or the order detail; otherwise, or if the customer asks after the reply, it goes to
To'Latino's Order help queue, where staff resolve it with a message the customer sees on the order. Card refunds arrive with Stripe.
