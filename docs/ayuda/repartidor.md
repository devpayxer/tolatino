# To'Latino Repartidor · Driver app

_Pantallas: `/repartidor` (Inicio · Pedidos · Ganancias · Perfil y el detalle de cada entrega), Panel › Entrega › Tus
repartidores y el cuadre de efectivo, y el detalle del pedido en el panel («¿Quién lo lleva?»). Versión: Fase 2 · bloque 2l
(6 nov 2026). v1.0 = el repartidor del propio negocio; los repartidores de To'Latino llegan más adelante._

## Qué hace
- **El negocio** (Entrega, con «Mi equipo») toca **Invitar repartidor**: nombre y teléfono → To'Latino crea un **código de
  6 letras y números** (vence en 7 días). Se lo da a su repartidor.
- **El repartidor** abre `tolatino.com/repartidor`, entra con **ese mismo teléfono**, escribe el código y elige cómo
  reparte (a pie, bici, moto, auto, camioneta). Desde Inicio se pone **En línea**.
- **El negocio** acepta un delivery y en el detalle del pedido elige **¿Quién lo lleva?** → Asignar. Al repartidor le llega
  «Tienes una entrega».
- **El repartidor** abre la entrega: dirección (Abrir mapa, Llamar), cómo entregar, lo que lleva, cuánto cobrar, y un
  botón grande por paso: **Recogí, voy en camino** → **Llegué** → (**Cobrar $X** → **Cobré $X · Entregado**) o
  **Entregado** si ya está pagado. El cliente ve cada paso («Juan llegó con tu pedido») y recibe el aviso.
- **Reportar un problema**: el cliente no responde, dirección mal, el negocio se tarda, incompleto, accidente u otro; le
  llega al negocio.
- **Ganancias**: entregas, propinas y efectivo cobrado por día (14 días). El negocio le paga directo.
- **Cuadre de efectivo**: en Entrega, «Efectivo de hoy» por repartidor.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Otra persona usa el código | No sirve: el código es solo para el teléfono invitado. |
| Muchos intentos con códigos malos | Se frena una hora. |
| El código venció | Pídele al negocio uno nuevo (Cancelar y volver a invitar). |
| Sin señal | El paso se guarda en el teléfono y se envía solo al volver la señal; no se repite. |
| Cobro en efectivo | Hay que confirmar el monto exacto antes de marcar entregado; queda en el cuadre. |
| Pagado con tarjeta | No se cobra nada: dice «Pagado con tarjeta». |
| El negocio quita al repartidor | Lo que tenía asignado queda sin repartidor para dárselo a otro. |
| El repartidor sale del equipo | No puede si tiene entregas activas. |
| El negocio entrega con una app externa | No hay despacho: se pega el enlace de seguimiento. |

## Preguntas frecuentes
**¿Necesito otra cuenta?** No: la misma cuenta de To'Latino; una persona puede ser cliente, negocio y repartidor.
**¿To'Latino me paga?** No en la v1: el negocio paga a su repartidor. To'Latino no cobra comisión por el efectivo.

---

## English
The business invites a driver from Delivery (name + phone → a 6-character code, valid 7 days). The driver opens
`tolatino.com/repartidor`, signs in with that same phone, enters the code and picks a vehicle, then goes **Online**. The
business assigns accepted deliveries from the order detail. The driver taps one big step at a time: **Picked up, on my
way** → **I'm here** → **Collect $X / Collected · Delivered** or **Delivered** if paid by card. The customer sees each step.
Problems go to the business. Earnings show deliveries, tips and cash per day. Without signal, steps are saved on the
phone and sent automatically. The business sees today's cash per driver.
