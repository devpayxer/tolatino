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
**Transfer** a ticket to someone else by phone: pick which, type the phone, **Send ticket**. **THE OLD QR IS VOIDED** right away: while it is
pending no QR of that ticket gets in. **Undo** until someone receives it (it comes back with a new QR). They get a notice with a link (in
To'Latino if they have an account; by text once the SMS provider is connected), **sign in with that phone** and tap **Get ticket**: it goes to
their account with their own QR. **Only the account with that phone** can receive it — never the sender. **Change a name** for free. Deadlines
come from Settings: up to **2 h before** the event; up to **10 transfers a day**.

### Cases and FAQ (English)
Received → you get «Your ticket was received» and it shows **TRANSFERRED**. Nobody receives it in time → it expires and comes back with a new QR.
Less than 2 h → no transfers or name changes. Your own phone → refused. The link reaches someone else → they cannot receive it; the phone is never
shown. No reselling in the app. The receiver cannot cancel for a refund (the money belongs to the payer); they can transfer it again.
