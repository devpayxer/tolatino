# Panel › Cobros: lo que cobras con tarjeta y tu pago al banco · Payouts: card payments and your bank payout

_Pantallas: **Panel › Cobros y plan › Cobros con tarjeta** y **Cobros y plan › Tu plan**; el aviso «Tu banco pide confirmar el cobro de Pro» y su página
`/pago/verificar?pi=…`. Solo el dueño o quien maneja Cobros. Versión: 14 nov 2026. Audiencia: negocio. Tema: panel._

## Qué hace
- **Tu dinero llega los martes.** Stripe paga a tu banco cada martes lo que cobraste con tarjeta de lunes a domingo, menos la comisión y lo devuelto. Tu
  cuenta de cobro nace con ese calendario; si To'Latino pausa tus pagos (con su motivo), al reanudar vuelven al martes.
- **Cobros** muestra lo de la semana (cobrado, comisión, devuelto, lo que te llega el martes) y cada cobro con su estado y, si la hay, su disputa.
- **Disputas:** si un cliente reclama un cobro con su banco, te avisamos y To'Latino responde con la evidencia del pedido (recibo, conversación y
  línea de tiempo). Te avisamos el resultado.
- **Tu plan Pro y la verificación del banco (3-D Secure):** si al renovar Pro tu banco pide confirmar que eres tú, te llega el aviso **«Tu banco pide
  confirmar el cobro de Pro»** con un enlace. Ábrelo, toca **Confirmar con mi banco** y confirma en la ventana de tu banco: el cobro queda hecho y tu Pro
  sigue. Mientras tanto sigues con Pro; si no confirmas, el siguiente intento sale solo (como un cobro fallido: 3 intentos en 7 días).

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Confirmas tarde y otro intento ya cobró | El enlace viejo ya no sirve: nunca se cobra dos veces. |
| Tu banco rechaza la confirmación | No se cobra; el siguiente intento sale solo y te avisamos. |
| Otra persona abre tu enlace | No existe para ella: solo quien paga lo confirma. |
| Un pago al banco falla (cuenta cerrada) | To'Latino recibe la alerta y te escribe; el dinero no se pierde. |
| Sandbox | La tarjeta 4000 0027 6000 3184 siempre pide confirmar; el «banco» de pruebas contesta en la hoja. |

## Preguntas frecuentes
**¿Por qué el martes?** Es el día fijo de pago de To'Latino para todos los negocios.
**¿Dónde veo cuándo llega?** En Cobros, «te llega el martes».

## English

### What it does
- **Your money arrives on Tuesdays.** Stripe pays your bank every Tuesday what you charged by card from Monday to Sunday, minus the commission and what was
  refunded. Your payout account is created with that calendar; if To'Latino pauses your payouts (with its reason), when they resume they go back to Tuesday.
- **Charges** shows the week (charged, commission, refunded, what reaches you on Tuesday) and each charge with its status and, if there is one, its dispute.
- **Disputes:** if a customer disputes a charge with their bank, we notify you and To'Latino responds with the order's evidence (receipt, conversation and
  timeline). We tell you the result.
- **Your Pro plan and the bank verification (3D Secure):** if your bank asks you to confirm it is you when Pro renews, you get the notice **«Your bank asks you
  to confirm the Pro charge»** with a link. Open it, tap **Confirm with my bank** and confirm in your bank's window: the charge is done and your Pro continues.
  Meanwhile you keep Pro; if you do not confirm, the next attempt goes out on its own (like a failed charge: 3 attempts in 7 days).

### What happens in each case
| Case | What happens |
|---|---|
| You confirm late and another attempt already charged | The old link no longer works: you are never charged twice. |
| Your bank rejects the confirmation | Nothing is charged; the next attempt goes out on its own and we notify you. |
| Someone else opens your link | It does not exist for them: only whoever pays confirms it. |
| A bank payout fails (closed account) | To'Latino gets the alert and writes to you; the money is not lost. |
| Sandbox | The card 4000 0027 6000 3184 always asks for confirmation; the test «bank» answers in the sheet. |

### FAQ
**Why Tuesday?** It is To'Latino's fixed payout day for all businesses.
**Where do I see when it arrives?** In Charges, «it reaches you on Tuesday».
