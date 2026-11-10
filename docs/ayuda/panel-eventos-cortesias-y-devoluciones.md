# Panel › Eventos: cortesías, devoluciones y lista de espera · Comps, refunds and waitlist

_Pantallas: **Panel › Eventos › la ficha del evento** (`/panel/{negocio}/eventos?det=evt:…`), parte «Eventos» del equipo (devolver dinero pide también
la parte «Cobros»). Teléfono y escritorio. Versión: 10 nov 2026. Audiencia: negocio. Tema: panel._

## Qué hace
- **CORTESÍAS · N DE M** (evCompDet): **Dar cortesía** con **nombre**, **teléfono (opcional)** y **cuántas entradas** (1–10); si tienes varios
  boletos, de cuál salen. Entra gratis con su QR y **en la puerta cuenta como un boleto**. Con teléfono, le avisamos con el enlace para
  recibirla en To'Latino; sin teléfono, la puerta la busca por nombre. **Salen de tus boletos** (toman lugar del cupo) y **nunca se venden**.
  Tope por fecha: **50** (`evt_cortesias_max`, Configuración). **Quitar** una cortesía que no se ha usado devuelve su lugar.
- **COMPRADORES › Devolver**: eliges qué boletos de esa orden devuelves y la pantalla dice cuánto vuelve: **el 100 % de lo que pagó** por esos
  boletos (y sus extras si la orden queda sin boletos). **To'Latino no cobra la comisión** de lo que devuelves. Los boletos devueltos dejan de
  entrar y su lugar vuelve a la venta o a la lista de espera. Un boleto **usado no se devuelve**.
- **DEVOLUCIONES · N**: las cancelaciones de los compradores (el boleto menos el cargo de servicio) y las tuyas, con su estado (DEVUELTO · EN
  CAMINO).
- **TRANSFERIDOS** y **EN CAMINO A OTRA PERSONA**: cuántos boletos pasaron de una persona a otra (nunca ves teléfonos).
- **LISTA DE ESPERA · N** con **Avisar a la lista** cuando hay lugar (ver «Lista de espera»).
- **AYUDA CON ÓRDENES**: los problemas con el pago que abrieron tus compradores; los revisa To'Latino.
- **DINERO**: lo devuelto se resta del bruto; la comisión que To'Latino no cobra en tus devoluciones no se cuenta. Te llega el martes después del evento.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Ya diste el tope de cortesías de esa fecha | «Hasta 50 cortesías por fecha (ya diste N)». |
| No quedan boletos de ese tipo | «Sube la cantidad en el editor». |
| Devuelves dos veces la misma orden | Se devuelve una sola vez. |
| Alguien del equipo sin «Cobros» toca Devolver | «Solo quien maneja Cobros puede devolver dinero». |
| El comprador cancela | Te llega «Volvieron boletos a la venta»; ese boleto no se te paga (el cargo de servicio se lo queda To'Latino). |

## Preguntas frecuentes
- **¿Puedo vender cortesías a promotores?** No: las cortesías no se venden. Para promotores, usa códigos de descuento.
- **¿El comprador ve que fui yo quien devolvió?** Sí: le llega «{tu negocio} te devolvió $X».

## English

### What it does
**COMPS**: **Give comp** with name, optional phone and how many entries (1–10); they count at the door like a ticket, come out of your tickets and are
never sold; up to **50 per date** (Settings); **Remove** an unused comp to free its spot. **BUYERS › Refund**: pick which tickets; **100 % of what
they paid** goes back (plus extras if the order is left empty); To'Latino does not charge its fee on what you refund; used tickets are not
refundable; needs the Payouts part. **REFUNDS**, **TRANSFERRED**, **WAITLIST** (with **Notify the list** when there is room) and **ORDER HELP**
(reviewed by To'Latino). Phones are never shown.
