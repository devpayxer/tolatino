# Transferir boletos · Transfer tickets

_Pantallas: **la orden** (`/eventos/orden/B-…` › **Transferir boletos**), **el boleto** (`/cuenta/boletos/TL-…` › **Transferir este boleto**),
**recibir** (`/eventos/recibir/…`, el enlace del aviso) y **Mi cuenta › Boletos**. Teléfono y escritorio. Versión: 10 nov 2026. Audiencia: vecino.
Tema: eventos._

## Qué hace
- **Pasa un boleto a otra persona** con su teléfono: eliges cuál (si tienes varios), escribes el teléfono y **Enviar boleto**.
- **EL QR ANTERIOR QUEDA ANULADO** en el momento: mientras la otra persona no lo recibe, **ningún QR de ese boleto entra** (ni el tuyo ni
  una captura). En tu orden sale en **ENVIADOS · ESPERANDO QUE LOS RECIBAN** con «A ••23» y hasta cuándo.
- **Deshacer** mientras nadie lo reciba: el boleto vuelve a ti con un **QR nuevo**.
- A esa persona le llega un aviso con el enlace (en To'Latino si ya tiene cuenta; por SMS cuando el proveedor de SMS esté conectado).
  Al abrirlo ve el evento, el tipo de boleto y quién se lo manda (nombre e inicial), **entra con su teléfono** y toca **Recibir boleto**:
  el boleto pasa a **su** Mi cuenta › Boletos con **su propio QR** (otro código de boleto).
- **Solo lo recibe la cuenta con ese teléfono.** Si el enlace llega a otra persona, ve «Este boleto se mandó a otro teléfono» y no puede
  recibirlo. Quien lo manda tampoco.
- **Cambiar un nombre** del boleto es gratis, hasta el mismo plazo. El nombre no va en el QR.
- Plazos (Super Admin › Configuración › Eventos): **transferir y cambiar el nombre hasta 2 h antes** del evento (`bol_transferir_h`);
  **hasta 10 transferencias al día** por persona (`bol_transferencias_dia_max`).

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| La otra persona lo recibe | Te llega «Ya recibieron tu boleto». En tu orden ese boleto dice **TRANSFERIDO** y su QR no entra. |
| Nadie lo recibe antes del plazo | Vence solo: el boleto vuelve a ti con un QR nuevo y te avisamos. |
| Lo deshaces | La transferencia se cae y el boleto vuelve con un QR nuevo. El enlace dice «Quien lo mandó lo deshizo». |
| Faltan menos de 2 h | Ya no se transfiere ni se cambia el nombre: el boleto se queda con quien lo tiene. |
| Escribes tu propio teléfono | «Ese es tu teléfono»: no se manda. |
| Quien lo recibe no tiene cuenta | La crea en un minuto con ese teléfono y lo recibe. |
| El enlace llega a otra persona | No puede recibirlo: se compara con el teléfono al que se mandó. Nunca se muestra ese teléfono. |
| El organizador cancela o devuelve ese boleto | La transferencia se cae; el dinero vuelve a quien pagó. |

## Preguntas frecuentes
- **¿Puedo vender mi boleto?** No: transferir es gratis y sin precio (no hay reventa en la app).
- **¿Quien recibe el boleto puede cancelarlo con devolución?** No: el dinero es de quien pagó. Lo puede transferir otra vez.
- **¿La otra persona ve mi teléfono?** No. Ve tu nombre e inicial. Tú solo ves los últimos 2 números del suyo.

## English

### What it does
- **You pass a ticket to another person** using their phone: you choose which one (if you have several), type the phone number and **Send
  ticket**.
- **THE PREVIOUS QR IS VOIDED** at that moment: while the other person has not received it, **no QR of that ticket gets in** (not yours nor a
  screenshot). In your order it shows under **SENT · WAITING FOR THEM TO RECEIVE** with «To ••23» and until when.
- **Undo** while nobody has received it: the ticket comes back to you with a **new QR**.
- That person gets a notice with the link (in To'Latino if they already have an account; by SMS once the SMS provider is connected). When they
  open it they see the event, the ticket type and who is sending it (name and initial), **sign in with their phone** and tap **Receive
  ticket**: the ticket moves to **their** My account › Tickets with **its own QR** (another ticket code).
- **Only the account with that phone can receive it.** If the link reaches someone else, they see «This ticket was sent to another phone» and
  cannot receive it. The sender cannot either.
- **Changing a name** on the ticket is free, up to the same deadline. The name is not in the QR.
- Deadlines (Super Admin › Settings › Events): **transfer and change the name up to 2 hours before** the event (`bol_transferir_h`); **up to
  10 transfers per day** per person (`bol_transferencias_dia_max`).

### What happens in each case
| Case | What happens |
|---|---|
| The other person receives it | You get «Your ticket was received». In your order that ticket says **TRANSFERRED** and its QR does not get in. |
| Nobody receives it before the deadline | It expires on its own: the ticket comes back to you with a new QR and we notify you. |
| You undo it | The transfer falls through and the ticket comes back with a new QR. The link says «The sender undid it». |
| Less than 2 hours remain | The ticket can no longer be transferred or have its name changed: it stays with whoever has it. |
| You type your own phone | «That is your phone»: it is not sent. |
| The recipient has no account | They create one in a minute with that phone and receive it. |
| The link reaches someone else | They cannot receive it: it is compared with the phone it was sent to. That phone is never shown. |
| The organizer cancels or refunds that ticket | The transfer falls through; the money goes back to whoever paid. |

### FAQ
- **Can I sell my ticket?** No: transferring is free and without a price (there is no resale in the app).
- **Can whoever receives the ticket cancel it for a refund?** No: the money belongs to whoever paid. They can transfer it again.
- **Does the other person see my phone?** No. They see your name and initial. You only see the last 2 digits of theirs.
