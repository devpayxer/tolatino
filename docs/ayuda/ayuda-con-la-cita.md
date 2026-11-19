# Ayuda con la cita · Appointment help

_Pantallas: la cita (`/cita/{n}`, botón **Ayuda con la cita** y aviso de la solicitud), `/cita/{n}/ayuda` (APP-NEG-CITA-AYUDA y su estado), Panel ›
Hoy («Ayuda con citas · responde en 24 h») y el detalle de la cita, Super Admin › Colas › **Ayuda con pedidos y citas** y Super Admin › Transacciones
› **Citas**. Versión: 10 nov 2026. Audiencia: vecino. Tema: citas._

## Qué hace
- **Primero El Compa:** al tocar **Ayuda** se abre la hoja de **El Compa** (el asistente de IA de To'Latino) sobre tu operación, con opciones
  fijas; **Algo no salió bien** (en boletos, **Un problema con el pago**) te trae a este formulario de siempre. Si El Compa está apagado o en
  pausa, si To'Latino llegó al tope del mes de la IA o si ya abriste una ayuda, llegas directo aquí. Ver `el-compa.md`.
- **La persona** pide ayuda con una cita que ya pasó (hasta 7 días). Elige el motivo: *Cobraron más del precio publicado*,
  *No me atendió quien reservé*, *No quedó como lo pedí*, *Esperé mucho a pesar de la cita*, *No me devolvieron el
  depósito* u *Otra cosa*; cuenta qué pasó (15 letras o más), agrega fotos (obligatorias si es un cobro o si no quedó como
  lo pidió; hasta 4) y dice qué quiere: **que se lo arreglen sin cargo** (otra cita), **que le devuelvan** (con el monto,
  opcional, si es un cobro) o **solo avisar**.
- **El negocio** responde en 24 horas desde Hoy o el detalle de la cita: **Tiene razón** (acepta), **Proponer otra cosa**
  (un monto a devolver) o **No puedo**, siempre con un mensaje que la persona lee.
- **El dinero:** lo único que se pagó en la app es el **depósito**. Lo que vuelve a la tarjeta sale de ahí (hasta lo que
  queda del depósito); lo pagado en el local se arregla en el local. Si el negocio acepta una devolución, se hace al
  momento; si propone un monto, se devuelve cuando la persona lo acepta. Devolver dinero solo lo puede el dueño (Cobros).
- **To'Latino** revisa en 48 horas si el negocio no respondió en 24 horas o si la persona no está de acuerdo («Pedir
  revisión a To'Latino»). Resuelve con un mensaje y, si hace falta, devuelve el depósito a la tarjeta (solo quien aprueba
  dinero en Transacciones).
- **Transacciones › Citas** muestra cada cita con su servicio, total, depósito, estado del cobro, lo devuelto y la
  comisión de To'Latino (8 % sobre el depósito).

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| La cita todavía no pasa | «La ayuda se pide cuando la cita ya pasó.» |
| Pasaron más de 7 días | «La ayuda con una cita se pide hasta 7 días después.» |
| Cita cancelada, vencida o no llegó, con depósito | Solo se puede preguntar por el depósito u otra cosa. |
| Cita cancelada sin depósito | No hay ayuda (no hubo cita ni cobro): Mensaje o Llamar. |
| Ya hay una solicitud | La página muestra su estado; una por cita. |
| Más de 5 solicitudes en 24 horas (To’Latino puede ajustar ese número; un reporte de seguridad nunca se frena) | «Abriste muchas solicitudes hoy. Prueba mañana.» |
| El negocio acepta una devolución sin depósito pagado | Se arregla en el local; la persona lo ve así. |
| El negocio propone más que el depósito | No deja: «A su tarjeta puedes devolver hasta $X (el depósito)». |
| Responde alguien del equipo sin permiso de Cobros y hay que devolver | «Solo el dueño puede devolver dinero.» |
| Pasan 24 h sin respuesta | Pasa a To'Latino (cola Ayuda con pedidos y citas) y la persona lo ve. |
| Stripe no puede devolver | La respuesta no se guarda; se puede intentar de nuevo. |

## Preguntas frecuentes
**¿Me devuelven todo lo que pagué?** A la tarjeta vuelve, como mucho, el depósito que pagaste en la app. Lo que pagaste en
el local te lo devuelve el negocio en el local.
**¿Cuándo llega el dinero?** De 3 a 5 días hábiles a tu tarjeta. Te avisamos en Avisos.
**¿Quién ve mis fotos?** El negocio de esa cita y To'Latino.
**¿La reseña sirve para pedir un reembolso?** No: la reseña cuenta tu experiencia; para arreglos y devoluciones está Ayuda
con la cita.

## English

### What it does
- **El Compa first:** tapping **Help** opens the sheet of **El Compa** (To'Latino's AI assistant) over your item, with fixed options; **Something went wrong**
  (on tickets, **A payment problem**) brings you to this usual form. If El Compa is off or paused, if To'Latino reached the monthly AI cap or if you already
  opened a request, you come straight here. See `el-compa.md`.
- **The client** asks for help with an appointment that already happened (up to 7 days). Pick the reason: *They charged more than the posted price*, *The
  person I booked did not see me*, *It did not turn out as I asked*, *I waited a long time despite the appointment*, *They did not refund my deposit* or
  *Something else*; tell what happened (15 characters or more), add photos (required if it is a charge or if it did not turn out as asked; up to 4) and say
  what you want: **that they fix it at no charge** (another appointment), **that they refund you** (with the amount, optional, if it is a charge) or **just
  let them know**.
- **The business** replies within 24 hours from Today or the appointment detail: **You are right** (accepts), **Propose something else** (an amount to
  refund) or **I can't**, always with a message the client reads.
- **The money:** the only thing paid in the app is the **deposit**. What goes back to the card comes from there (up to what is left of the deposit); what was
  paid at the business is settled at the business. If the business accepts a refund, it is made right away; if it proposes an amount, it is refunded when the
  client accepts it. Only the owner can refund money (Charges).
- **To'Latino** reviews within 48 hours if the business did not reply within 24 hours or if the client disagrees («Ask To'Latino to review»). It resolves with
  a message and, if needed, refunds the deposit to the card (only whoever approves money in Transactions).
- **Transactions › Appointments** shows each appointment with its service, total, deposit, charge status, what was refunded and To'Latino's commission (8 % on
  the deposit).

### What happens in each case
| Case | What happens |
|---|---|
| The appointment has not happened yet | «Help can be asked once the booking is over.» |
| More than 7 days have passed | «Booking help can be asked up to 7 days after.» |
| Appointment canceled, expired or no-show, with a deposit | You can only ask about the deposit or something else. |
| Appointment canceled with no deposit | No help (there was no appointment or charge): Message or Call. |
| There is already a request | The page shows its status; one per appointment. |
| More than 5 requests in 24 hours (To’Latino can adjust that number; a safety report is never blocked) | «You opened many requests today. Try tomorrow.» |
| The business accepts a refund with no deposit paid | It is settled at the business; the client sees it that way. |
| The business proposes more than the deposit | It will not let it: «You can refund up to $X (the deposit) to their card». |
| Someone on the team without Charges permission replies and a refund is needed | «Only the owner can refund money.» |
| 24 h pass with no reply | It goes to To'Latino (Order and appointment help queue) and the client sees it. |
| Stripe cannot refund | The reply is not saved; you can try again. |

### FAQ
**Do I get back everything I paid?** At most, the deposit you paid in the app goes back to the card. What you paid at the business, the business refunds at
the business.
**When does the money arrive?** 3 to 5 business days to your card. We notify you in Notices.
**Who sees my photos?** The business of that appointment and To'Latino.
**Does a review work to ask for a refund?** No: the review tells your experience; for fixes and refunds there is Appointment help.
