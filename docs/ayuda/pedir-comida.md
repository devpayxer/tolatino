# Pedir comida · Ordering food

_Pantallas: pestaña **Menú** de la página del negocio (`/n/{negocio}?tab=menu`), **Finalizar pedido**
(`/n/{negocio}/pagar`) y **Tu pedido** (`/pedido/{número}`), teléfono y escritorio. Versión: Fase 2 · bloque 2b
(6 nov 2026). Comida y Bebidas. Pickup con pago en el local; tarjeta (2d), delivery (2f), cancelar y ayuda (2c) llegan
en sus bloques._

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
- **Resumen de la página:** hasta 4 platos para pedir directo y la barra «Desde $X · Pedir».
- **Finalizar pedido:** dónde recoges (dirección, nota del negocio y Cómo llegar), cuándo (lo antes posible o una hora de
  hoy cada 30 minutos), cómo pagas (en el local) y el resumen. **Enviar pedido**.
- **Tu pedido enviado:** número, estado (enviado → aceptado → en la cocina → listo → recogido), a qué hora está listo,
  cuánto pagas en el local, dónde recoges y lo que pediste. Llamar al negocio. Se actualiza solo mientras espera.

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
| To'Latino pausó el Menú o los Pedidos en línea | Sin pestaña Menú, o se ve el menú sin poder pedir. |

## Preguntas frecuentes
**¿Me cobran algo en la app?** No. Pagas en el local cuando recoges. El pago con tarjeta llega más adelante.

**¿Puedo cancelar?** Por ahora llama al negocio. Cancelar desde la app llega con el siguiente bloque.

**¿Por qué no veo delivery?** Este bloque es pickup. El delivery llega con su bloque.

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
Card payment, delivery, cancelling and order help arrive in later blocks.
