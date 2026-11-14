# Pagar con tarjeta · Paying by card

_Pantallas: Finalizar pedido (APP-NEG-CHECKOUT · PAGO y la hoja «Método de pago»), la página del pedido, Panel › Cobros (DASH-COBROS), Panel › Lo que
vendes › Pedidos (Tarjeta en la app), el detalle del pedido en el panel («Devolver dinero») y Super Admin › Transacciones, la hoja «Tu banco pide confirmar» (3-D Secure) y Mi cuenta › Ajustes › Pagos. Versión: 14 nov 2026.
Audiencia: vecino. Tema: pedidos._

## Qué hace
- **El cliente** elige **Tarjeta** o **Pagas en el local / Efectivo al recibir**. Con tarjeta elige una guardada o agrega
  una (número, vence, CVC, código postal, nombre; «Guardar para la próxima»). To'Latino nunca ve el número completo: lo
  toma Stripe; solo guardamos la marca y los últimos 4.
- Al enviar, **se retiene el total** en la tarjeta. **Se cobra cuando el negocio acepta**; si no lo acepta en 10 minutos, lo
  rechaza o el cliente lo cancela antes, **se libera completo**. Si el negocio acepta pedidos al instante, se cobra al
  enviar. El pedido muestra RETENIDO, PAGADO, LIBERADO o DEVUELTO.
- **El negocio** conecta su cuenta de cobro en **Cobros › Conectar con Stripe** (tus datos, datos fiscales, tu banco,
  verificación: todo en la página de Stripe). Con la cuenta lista enciende **Tarjeta en la app** en Pedidos. En Cobros ve
  lo de la semana (cobrado, comisión, devuelto, **te llega el martes**) y cada cobro.
- **Comisión:** en pedidos pagados con tarjeta, To'Latino se queda con el **10 % del subtotal**; el envío y la propina van
  completos al negocio; el cargo de la tarjeta sale de esa comisión. En efectivo o en el local, nada.
- **Devolver dinero:** el dueño, desde el pedido (total o parcial, con motivo); To'Latino, desde Transacciones. La
  comisión baja en proporción. El cliente recibe el aviso; llega a su tarjeta en 3 a 5 días hábiles.

- **Boletos de eventos:** el cobro se **autoriza y se captura al pagar** (no espera al negocio) y queda en To'Latino; al organizador se le
  transfiere después de la fecha, neto de la comisión de boletos (5 % + $1 por boleto, de Planes › Comisiones). El precio que ve el cliente ya
  incluye los cargos. Si la captura falla, los boletos se anulan y la autorización se libera. Ver `comprar-boletos`.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| El banco rechaza la tarjeta | «Tu banco la rechazó. Prueba con otra tarjeta.» No se crea el pedido. |
| Sin fondos / vencida / código mal | El mensaje lo dice; no hay pedido ni cargo. |
| El banco pide verificación extra (3-D Secure) | Se abre la hoja **«Tu banco pide confirmar»**: toca **Confirmar con mi banco** y confirma en la ventana de tu banco (aquí mismo; To'Latino no ve lo que escribes). Después el pedido sale solo, con la misma retención: nunca se cobra dos veces. Si cierras sin confirmar, no hay pedido y lo retenido se suelta solo. Vale para pedidos, el mercado, los apartados y envíos de las tiendas, el pago del plan de apartado y los boletos. |
| Tu banco no confirma («No fui yo») | No hay pedido ni cobro: prueba con otra tarjeta. |
| Se envía dos veces el mismo pedido (doble toque) | Una sola retención: cada intento tiene su clave. |
| Cambias de tarjeta después de un rechazo | Es un intento nuevo con la otra tarjeta. |
| El negocio no tiene cuenta de cobro o la apagó | No sale «Tarjeta»: solo pago en el local. |
| Stripe pide un dato más al negocio | Cobros dice «Stripe necesita un dato más» con «Completar en Stripe». |
| To'Latino retiene los pagos al negocio | Cobros lo dice con el motivo; no se pierde nada. |
| Devolución mayor a lo que queda | No deja: «Puedes devolver hasta $X». |
| Sandbox (pruebas) | Todo corre contra el simulador de To'Latino: 4242 4242 4242 4242 aprueba, 4000 0000 0000 0002 rechaza, 4000 0000 0000 9995 sin fondos, 4000 0027 6000 3184 pide confirmar (el «banco» de pruebas contesta en la hoja). Nada real se cobra. |

## Preguntas frecuentes
**¿Por qué me aparece un cargo si el pedido no se dio?** Es una retención, no un cobro: se libera completa y tu banco la
quita en 1 a 5 días.
**¿Dónde veo mis tarjetas?** En la hoja «Método de pago» al pagar y en **Mi cuenta › Ajustes › Pagos**; la última que pagó queda como predeterminada.
**¿Cómo quito una tarjeta?** En **Mi cuenta › Ajustes › Pagos**, toca **Quitar** y confirma. Deja de salir al pagar; lo que ya pagaste no cambia y las
devoluciones siguen llegando a esa tarjeta. La que paga el Pro de tu negocio se cambia primero en el panel.
**¿Cuándo le llega el dinero al negocio?** Cada martes, lo cobrado de lunes a domingo.

## English

### What it does
- The customer picks **Card** or **Pay at the store / Cash on delivery**. With card: a saved one or a new one. To'Latino
  never sees the full number; only brand and last 4 are kept.
- On send, **the total is held**. **It is charged when the business accepts**; if not accepted within 10 minutes,
  declined or cancelled first, **it is fully released**. Instant-accept businesses charge on send.
- **The business** connects a payout account in **Payouts › Connect with Stripe**, then turns on **Card in the app** in
  Orders. Payouts shows this week (taken, fee, refunded, **you get it on Tuesday**) and each charge.
- **Fee:** 10% of the subtotal on card orders; delivery fee and tip go in full; card processing comes out of the fee.
- **Refunds:** the owner from the order, To'Latino from Transactions; the fee drops proportionally; 3–5 business days.

- **3-D Secure:** if your bank asks to confirm, the «Your bank asks you to confirm» sheet opens; tap «Confirm with my bank» and confirm in your bank's
  window. The order then goes through with the same hold: never charged twice. Closing without confirming means no order and the hold is released.
- **Saved cards:** see and remove them in **My account › Settings › Payments**.

### FAQ
**Why do I see a charge if the order did not happen?** It is a hold, not a charge: fully released, your bank removes it in
1–5 days.
