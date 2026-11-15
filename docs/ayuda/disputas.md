# Disputas con el banco · Bank disputes

_Pantallas: Super Admin › Colas › **Disputas con el banco**; Transacciones (estado de la disputa en cada cobro; en el sandbox, «Simular disputa» y el
resultado del banco); Negocio 360° › Dinero; Panel › **Cobros** (aviso y etiqueta). Versión: 6 nov 2026. Audiencia: vecino. Tema: pedidos._

## Qué hace
- Cuando un cliente reclama a su banco un cobro con tarjeta hecho en To'Latino (contracargo), Stripe nos avisa. Se abre
  un caso en la cola **Disputas con el banco** (Admin y Finanzas) con: el pedido, el monto, el cliente, el **plazo del
  banco** y el motivo, más **la evidencia que ya tenemos**: lo que pidió, desde qué cuenta, cuándo lo aceptó el negocio,
  cuándo estuvo listo, entregado o recogido, la dirección de entrega, los mensajes y las devoluciones.
- **Responder con evidencia**: el equipo escribe un resumen para el banco (mejor en inglés) y se envía con esa evidencia.
  El banco decide después; el resultado llega solo.
- **Aceptar devolución**: se cierra la disputa y el dinero vuelve al cliente.
- El **negocio** recibe el aviso («Un cliente disputó un cobro…») y lo ve en Cobros con la etiqueta EN DISPUTA; no tiene
  que hacer nada. Al final le llega el resultado (ganada o perdida).

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Llega una disputa | Caso en la cola (prioridad alta), aviso al dueño, el cobro sale «en disputa». |
| Respondida | «El banco revisa». Ya no se puede volver a responder. |
| El banco da la razón al negocio | DISPUTA GANADA; el dinero se queda. Aviso al dueño. |
| El banco da la razón al cliente / se acepta | DISPUTA PERDIDA o ACEPTADA; el dinero vuelve al cliente. |
| Stripe no acepta la respuesta | No cambia nada y lo dice; se intenta otra vez. |
| La misma disputa llega dos veces | Se guarda una sola vez (no abre dos casos ni manda dos avisos). |
| Quién decide | Hace falta permiso de colas y de dinero (Admin, Finanzas). Todo queda en el Historial con el motivo. |
| Sandbox | No hay banco: Transacciones › «Simular disputa» y, ya respondida, «Banco: gana el negocio / gana el cliente». |

## Preguntas frecuentes
**¿El negocio pierde dinero?** Si el banco le da la razón al cliente, ese cobro vuelve al cliente.
**¿Qué puede hacer el negocio?** Nada obligatorio: To'Latino responde con la evidencia. Si tiene algo más (una foto de la
entrega, una conversación), puede escribir a Soporte.

## Disputas de boletos de eventos
- Un contracargo sobre un **cobro de boletos** (el cobro es de To'Latino) entra a la misma cola **Disputas con el banco**. La **evidencia** sale
  del boleto: la orden B-…, el evento, la fecha y el lugar, cada boleto con su estado (válido · usado en la puerta · devuelto · transferido),
  desde qué cuenta se compró y lo ya devuelto (y, si entró, la hora y la puerta del escaneo). Nunca teléfonos.
- **Mientras está abierta**, la liquidación de esa fecha queda **RETENIDA (disputa)** y no se le paga al organizador. Al cerrarse sale sola.
- **Perdida o aceptada**: ese cobro no se le paga al organizador (y To'Latino no cobra su comisión de ese cobro). Si la fecha **ya se había
  pagado**, lo que se le pagó de ese cobro se **descuenta una sola vez** de su siguiente liquidación; sin otra en 14 días (Configuración), se
  revierte de la transferencia. El costo del contracargo de Stripe lo absorbe To'Latino.

**English · ticket disputes:** a chargeback on a ticket charge goes to the same queue with evidence from the tickets (order, event, each
ticket's status, account, refunds). While open, that date's payout is held; lost or accepted, that charge is not paid to the organizer, and if
already paid it is deducted once from the next payout (or reversed after 14 days without one).

## English

### What it does
- When a customer disputes with their bank a card charge made on To'Latino (a chargeback), Stripe tells us. A case opens in the **Bank
  disputes** queue (Admin and Finance) with: the order, the amount, the customer, the **bank's deadline** and the reason, plus **the evidence
  we already have**: what they ordered, from which account, when the business accepted it, when it was ready, delivered or picked up, the
  delivery address, the messages and the refunds.
- **Respond with evidence**: the team writes a summary for the bank (preferably in English) and it is sent with that evidence. The bank decides
  later; the result arrives on its own.
- **Accept refund**: the dispute is closed and the money goes back to the customer.
- The **business** receives the notice («A customer disputed a charge…») and sees it in Payouts with the label IN DISPUTE; it does not have to
  do anything. At the end it gets the result (won or lost).

### What happens in each case
| Case | What happens |
|---|---|
| A dispute arrives | Case in the queue (high priority), notice to the owner, the charge shows «in dispute». |
| Responded | «Bank reviewing». It can no longer be responded to again. |
| The bank sides with the business | DISPUTE WON; the money stays. Notice to the owner. |
| The bank sides with the customer / it is accepted | DISPUTE LOST or ACCEPTED; the money goes back to the customer. |
| Stripe does not accept the response | Nothing changes and it says so; it is tried again. |
| The same dispute arrives twice | It is saved only once (it does not open two cases or send two notices). |
| Who decides | Permission for queues and for money is needed (Admin, Finance). Everything goes in the History with the reason. |
| Sandbox | There is no bank: Transactions › «Simulate dispute» and, once responded, «Bank: business wins / customer wins». |

### FAQ
**Does the business lose money?** If the bank sides with the customer, that charge goes back to the customer.
**What can the business do?** Nothing required: To'Latino responds with the evidence. If it has something more (a photo of the delivery, a
conversation), it can write to Support.

### Event ticket disputes
- A chargeback on a **ticket charge** (the charge belongs to To'Latino) goes into the same **Bank disputes** queue. The **evidence** comes
  from the ticket: the order B-…, the event, the date and the place, each ticket with its status (valid · used at the door · refunded ·
  transferred), from which account it was bought and what was already refunded (and, if it got in, the time and the door of the scan). Never
  phone numbers.
- **While it is open**, the payout for that date stays **HELD (dispute)** and the organizer is not paid. When it closes it is released on its
  own.
- **Lost or accepted**: that charge is not paid to the organizer (and To'Latino does not charge its fee on that charge). If the date **had
  already been paid**, what was paid from that charge is **deducted once** from their next payout; with no other payout in 14 days (Settings),
  it is reversed from the transfer. To'Latino absorbs the cost of the Stripe chargeback.
