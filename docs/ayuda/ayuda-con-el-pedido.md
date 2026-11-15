# Ayuda con el pedido · Order help

_Pantallas: `/pedido/{n}` (botón y estado), `/pedido/{n}/ayuda` (APP-NEG-PEDIDO-AYUDA), Panel › Hoy («Ayuda con pedidos») y el detalle del pedido, y
Super Admin › Soporte (cola «Ayuda con pedidos y citas»). Versión: 14 nov 2026. Audiencia: vecino. Tema: pedidos._

## Qué hace
- **Primero El Compa:** al tocar **Ayuda** se abre la hoja de **El Compa** (el asistente de IA de To'Latino) sobre tu operación, con opciones
  fijas; **Algo no salió bien** (en boletos, **Un problema con el pago**) te trae a este formulario de siempre. Si El Compa está apagado o en
  pausa, si To'Latino llegó al tope del mes de la IA o si ya abriste una ayuda, llegas directo aquí. Ver `el-compa.md`.
- **El cliente**, en un pedido ya recibido (hasta **7 días** después), toca **Ayuda con el pedido** y elige qué pasó: falta
  algo, llegó algo equivocado, frío o mal preparado, dañado o derramado; en delivery también llegó tarde o no llegó; problema
  con el pago u otro. Si es de platos, elige cuáles y cuántos. Luego qué le gustaría: **que se lo repongan** (delivery),
  **que le devuelvan lo de esos platos** o **solo avisar**, y un detalle (300 letras; obligatorio en «otro»).
- Es una **solicitud al negocio**: responde en **24 horas** y el cliente lo ve en su pedido. Si no responde, pasa sola a
  To'Latino. Si el negocio respondió y no se arregló, el cliente toca **Pedir que To'Latino lo revise**.
- **El negocio** la ve en **Hoy** («Ayuda con pedidos · responde en 24 h») y en el detalle del pedido, con qué pasó, los
  platos, qué quiere y su nota, y **Enviar respuesta** (500 letras).
- **To'Latino** (Super Admin › Soporte = cola «Ayuda con pedidos y citas», plazo 24 h): el caso con la solicitud, la respuesta del
  negocio y **Resolver con un mensaje** (plantillas) o, si se pagó con tarjeta, **Resolver y devolver**. El cliente ve «Solicitud resuelta por To'Latino» en su pedido.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Pedido no recibido o de hace más de 7 días | No sale el botón; la pantalla dice que se pide hasta 7 días después. |
| Ya hay una solicitud | Una por pedido: el pedido muestra su estado. |
| Muchas solicitudes | Hasta 5 al día por persona. |
| Pasan 24 h sin respuesta | Pasa a To'Latino (cola Ayuda con pedidos y citas). |
| Devolución | Si pagaste con tarjeta, vuelve a esa tarjeta (la hace el negocio desde el pedido o To'Latino al resolver) y llega en 3 a 5 días hábiles. Si pagaste en el local o al recibir, se arregla con el negocio. |

## Preguntas frecuentes
**¿Me devuelven el dinero solos?** Si pagaste con tarjeta, la devolución vuelve a esa tarjeta cuando el negocio o To'Latino la
hacen (ver `pagar-con-tarjeta.md`). Si pagaste en el local, lo que acuerdes con el negocio se arregla ahí. To'Latino revisa si el negocio
no responde.

## Reponer sin costo
Si pediste **«Que me lo repongan»** (faltó algo, llegó equivocado, frío o dañado, o no te llegó), el negocio puede contestarte con
**Reponer sin costo**: es un **pedido nuevo de $0** con esos platos (o todo el pedido si no te llegó), a la misma dirección o para
recoger. Entra ya aceptado a la cocina y, si es delivery, lo lleva su repartidor como cualquier pedido. Te llega el aviso con el
número del pedido nuevo y lo sigues en Mi cuenta › Pedidos. Si el negocio no responde en 24 horas o pides que To'Latino lo revise,
el equipo puede **resolver y reponer** igual, o **resolver y devolver** a tu tarjeta lo que pagaste en la app.

| Caso | Qué pasa |
|---|---|
| Te reponen el pedido | Un pedido nuevo de $0: no se cobra nada ni se toca tu tarjeta. |
| Ya te lo repusieron | No se repone dos veces la misma solicitud. |
| Pagaste con tarjeta y prefieres el dinero | El negocio lo devuelve desde el pedido o To'Latino con «Resolver y devolver» (3 a 5 días hábiles). |

**¿El pedido repuesto cuesta algo?** No: va en $0, sin envío ni propina.
**¿Cuenta como pedido nuevo?** Sale en tus pedidos con su número, pero no se cobra ni cuenta para el tope del negocio.

## English

### What it does
- **El Compa first:** tapping **Help** opens the **El Compa** sheet (To'Latino's AI assistant) over your item, with fixed options; **Something
  went wrong** (on tickets, **A payment problem**) brings you to this usual form. If El Compa is off or paused, if To'Latino reached the monthly
  AI cap, or if you already opened a help request, you come straight here. See `el-compa.md`.
- **The customer**, on an order already received (up to **7 days** later), taps **Order help** and picks what happened: something is missing,
  the wrong thing arrived, cold or badly prepared, damaged or spilled; on delivery also arrived late or did not arrive; a payment problem or
  other. If it is about dishes, they pick which ones and how many. Then what they would like: **to have it replaced** (delivery), **to be
  refunded for those dishes** or **just let them know**, and a detail (300 characters; required for "other").
- It is a **request to the business**: they reply within **24 hours** and the customer sees it on their order. If they do not reply, it goes to
  To'Latino by itself. If the business replied and it was not fixed, the customer taps **Ask To'Latino to review it**.
- **The business** sees it in **Today** ("Order help · reply within 24 h") and in the order detail, with what happened, the dishes, what the
  customer wants and their note, and **Send reply** (500 characters).
- **To'Latino** (Super Admin › Support = the "Order and booking help" queue, 24-hour deadline): the case with the request, the business's reply
  and **Resolve with a message** (templates) or, if it was paid by card, **Resolve and refund**. The customer sees "Request resolved by
  To'Latino" on their order.

### What happens in each case
| Case | What happens |
|---|---|
| Order not received or from more than 7 days ago | The button does not appear; the screen says help can be requested up to 7 days later. |
| There is already a request | One per order: the order shows its status. |
| Many requests | Up to 5 a day per person. |
| 24 hours pass with no reply | It goes to To'Latino (the Order and booking help queue). |
| Refund | If you paid by card, it goes back to that card (the business does it from the order, or To'Latino when resolving) and arrives in 3 to 5 business days. If you paid at the venue or on receipt, it is settled with the business. |

### FAQ
**Do I get my money back automatically?** If you paid by card, the refund goes back to that card when the business or To'Latino makes it (see
`pagar-con-tarjeta.md`). If you paid at the venue, what you agree with the business is settled there. To'Latino steps in if the business does
not reply.

### Replace at no cost
If you asked **"Replace it"** (something was missing, the wrong thing arrived, cold or damaged, or it did not arrive), the business can answer
you with **Replace at no cost**: it is a **new $0 order** with those dishes (or the whole order if it never arrived), to the same address or for
pickup. It goes to the kitchen already accepted and, if it is delivery, its driver takes it like any order. You get a notice with the new
order's number and you follow it in My account › Orders. If the business does not reply within 24 hours or you ask To'Latino to review it, the
team can **resolve and replace** just the same, or **resolve and refund** to your card what you paid in the app.

| Case | What happens |
|---|---|
| They replace your order | A new $0 order: nothing is charged and your card is not touched. |
| It was already replaced | The same request is not replaced twice. |
| You paid by card and prefer the money | The business refunds it from the order, or To'Latino with "Resolve and refund" (3 to 5 business days). |

**Does the replacement order cost anything?** No: it is $0, with no delivery fee or tip.
**Does it count as a new order?** It shows in your orders with its number, but it is not charged and does not count toward the business's cap.
