# Pagar con tarjeta · Paying by card

_Pantallas: Finalizar pedido (APP-NEG-CHECKOUT · PAGO y la hoja «Método de pago»), la página del pedido, Panel › Cobros (DASH-COBROS), Panel › Lo que
vendes › Pedidos (Tarjeta en la app), el detalle del pedido en el panel («Devolver dinero») y Super Admin › Transacciones, la hoja «Tu banco pide confirmar» (3-D Secure) y Mi cuenta › Ajustes › Pagos. Versión: 27 nov 2026.
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
| El banco pide verificación extra (3-D Secure) | Se abre la hoja **«Tu banco pide confirmar»**: toca **Confirmar con mi banco** y confirma en la ventana de tu banco (aquí mismo; To'Latino no ve lo que escribes). Después el pedido sale solo, con la misma retención: nunca se cobra dos veces. Si cierras sin confirmar, no hay pedido y lo retenido se suelta solo. Vale para **todo lo que pagas con tarjeta en la app**: pedidos, el mercado (también el OK por más), los apartados y envíos de las tiendas, el plan de apartado, los boletos, el depósito de una cita o una visita (taller y hogar), la fecha de la fiesta, la mesa de Noche, el viaje, la matrícula de una inscripción, el evento privado, la mudanza y el estimado (y «algo más») del taller o del hogar. La **renta de herramienta** se cobra al recogerla, sin que estés en la app: si tu banco pide confirmar el depósito, te llega el aviso con el enlace a esta misma hoja (ver Renta de herramienta). |
| El banco pide confirmar al renovar algo que no ves en la app (Pro, la renta de herramientas al recogerla) | Pro: te llega el aviso con el enlace a la hoja. La renta: se cobra al recogerla, sin ti en la app; si tu banco pide confirmar, te pedimos cambiar la tarjeta. |
| Tu banco no confirma («No fui yo») | No hay pedido ni cobro: prueba con otra tarjeta. |
| Se envía dos veces el mismo pedido (doble toque) | Una sola retención: cada intento tiene su clave. |
| Cambias de tarjeta después de un rechazo | Es un intento nuevo con la otra tarjeta. |
| El negocio no tiene cuenta de cobro o la apagó | No sale «Tarjeta»: solo pago en el local. |
| Stripe pide un dato más al negocio | Cobros dice «Stripe necesita un dato más» con «Completar en Stripe». |
| To'Latino retiene los pagos al negocio | Cobros lo dice con el motivo; no se pierde nada. |
| Devolución mayor a lo que queda | No deja: «Puedes devolver hasta $X». |
| Stripe no contesta al devolver | La devolución queda **en camino** y se termina sola en unos minutos con la misma llave (nunca sale dos veces): «Stripe no contestó… no la repitas». Si Stripe dice que no, queda fallida y se puede intentar otra vez. |
| Otra devolución de ese cobro va en camino | Espera a que termine: «Hay una devolución de $X en camino para este cobro». |
| Sandbox (pruebas) | Todo corre contra el simulador de To'Latino: 4242 4242 4242 4242 aprueba, 4000 0000 0000 0002 rechaza, 4000 0000 0000 9995 sin fondos, 4000 0027 6000 3184 pide confirmar (el «banco» de pruebas contesta en la hoja). Nada real se cobra. |

## Preguntas frecuentes
**¿Por qué me aparece un cargo si el pedido no se dio?** Es una retención, no un cobro: se libera completa y tu banco la
quita en 1 a 5 días.
**¿Dónde veo mis tarjetas?** En la hoja «Método de pago» al pagar y en **Mi cuenta › Ajustes › Pagos**; la última que pagó queda como predeterminada.
**¿Cómo quito una tarjeta?** En **Mi cuenta › Ajustes › Pagos**, toca **Quitar** y confirma. Deja de salir al pagar; lo que ya pagaste no cambia y las
devoluciones siguen llegando a esa tarjeta. La que paga el Pro de tu negocio se cambia primero en el panel.
**¿Cuándo le llega el dinero al negocio?** Cada martes, lo cobrado de lunes a domingo.
**¿Por qué mi banco me pidió confirmar al pagar el depósito de mi cita?** Algunos bancos piden confirmar cualquier pago en línea (3-D Secure). Confírmalo en la hoja y la cita sale con ese mismo depósito; si dices «No fui yo», no hay cita ni cobro.

## English

### What it does
- **The customer** picks **Card** or **Pay at the store / Cash on delivery**. With a card they pick a saved one or add one (number, expiry, CVC,
  ZIP code, name; «Save for next time»). To'Latino never sees the full number: Stripe takes it; we only keep the brand and the last 4 digits.
- When you send, **the total is held** on the card. **It is charged when the business accepts**; if the business doesn't accept it within 10
  minutes, declines it, or the customer cancels before, **it is released in full**. If the business accepts orders instantly, it is charged on
  send. The order shows HELD, PAID, RELEASED or REFUNDED.
- **The business** connects its payout account in **Payouts › Connect with Stripe** (your details, tax information, your bank, verification: all
  on Stripe's page). With the account ready, turn on **Card in the app** in Orders. In Payouts you see the week's numbers (charged, fee,
  refunded, **you get it on Tuesday**) and each charge.
- **Fee:** on orders paid by card, To'Latino keeps **10 % of the subtotal**; delivery and tip go in full to the business; the card's processing
  charge comes out of that fee. On cash or in-store payments, nothing.
- **Refunds:** the owner, from the order (full or partial, with a reason); To'Latino, from Transactions. The fee goes down in proportion. The
  customer gets the notice; it reaches their card in 3 to 5 business days.

- **Event tickets:** the charge is **authorized and captured at payment** (it doesn't wait for the business) and stays with To'Latino; the
  organizer is transferred the money after the date, net of the ticket fee (5 % + $1 per ticket, from Plans › Fees). The price the customer sees
  already includes the charges. If the capture fails, the tickets are voided and the authorization is released. See `comprar-boletos`.

### What happens in each case
| Case | What happens |
|---|---|
| The bank declines the card | «Your bank declined it. Try another card.» No order is created. |
| Insufficient funds / expired / wrong code | The message says so; there is no order and no charge. |
| The bank asks for extra verification (3D Secure) | The **«Your bank asks you to confirm»** sheet opens: tap **Confirm with my bank** and confirm in your bank's window (right here; To'Latino doesn't see what you type). Afterward the order goes through on its own, with the same hold: you are never charged twice. If you close without confirming, there is no order and what was held is released by itself. It applies to **everything you pay by card in the app**: orders, the market (also the OK for more), store holds and shipments, the layaway plan, tickets, the deposit for a booking or a visit (shop and home), the party date, the Noche table, the trip, an enrollment fee, the private event, the move and the estimate (and «something else») from the shop or the home service. A **tool rental** is charged when you pick it up, without you in the app: if your bank asks you to confirm the deposit, you get the notice with the link to this same sheet (see Tool rental). |
| The bank asks to confirm when renewing something you don't see in the app (Pro, tool rental at pickup) | Pro: you get the notice with the link to the sheet. The rental: it is charged at pickup, without you in the app; if your bank asks to confirm, we ask you to change the card. |
| Your bank doesn't confirm («It wasn't me») | There is no order and no charge: try another card. |
| The same order is sent twice (double tap) | Only one hold: each attempt has its own key. |
| You change cards after a decline | It is a new attempt with the other card. |
| The business has no payout account or turned it off | «Card» doesn't show: only in-store payment. |
| Stripe asks the business for one more piece of information | Payouts says «Stripe needs one more piece of information» with «Complete in Stripe». |
| To'Latino holds payouts to the business | Payouts says so with the reason; nothing is lost. |
| Refund larger than what remains | It doesn't allow it: «You can refund up to $X». |
| Stripe does not answer a refund | The refund stays **on its way** and finishes by itself in a few minutes with the same key (it never goes out twice): «Stripe did not answer… do not repeat it». If Stripe says no, it is marked failed and can be tried again. |
| Another refund of that charge is on its way | Wait for it to finish: «A $X refund is on its way for this charge». |
| Sandbox (testing) | Everything runs against To'Latino's simulator: 4242 4242 4242 4242 approves, 4000 0000 0000 0002 declines, 4000 0000 0000 9995 insufficient funds, 4000 0027 6000 3184 asks to confirm (the test «bank» answers in the sheet). Nothing real is charged. |

### FAQ
**Why do I see a charge if the order didn't happen?** It is a hold, not a charge: it is released in full and your bank removes it in 1 to 5 days.
**Where do I see my cards?** In the «Payment method» sheet when you pay and in **My account › Settings › Payments**; the last one that paid stays as the default.
**How do I remove a card?** In **My account › Settings › Payments**, tap **Remove** and confirm. It stops showing when you pay; what you already paid
doesn't change and refunds keep arriving on that card. The card that pays for your business's Pro is changed first in the dashboard.
**When does the money reach the business?** Every Tuesday, what was charged from Monday to Sunday.
**Why did my bank ask me to confirm when I paid my booking deposit?** Some banks ask to confirm any online payment (3D Secure). Confirm it in the
sheet and the booking goes through with that same deposit; if you say «It wasn't me», there is no booking and no charge.
