# Super Admin: Negocio 360° › Dinero · Super Admin: Business 360° › Money

_Pantallas: ADM-NEG › pestaña **Dinero** (`/admin/negocios/{id}?tab=din`), teléfono y escritorio. Para el equipo de To'Latino (y El Compa como
copiloto del equipo). Versión: 21 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Cifras de 90 días:** cobrado con tarjeta, retenido ahora (pedidos que el negocio todavía no acepta), devuelto y la
  comisión de To'Latino sobre lo cobrado.
- **Stripe:** estado de la cuenta de cobro (habilitada, falta verificar, restringida o sin conectar), los últimos 4 del
  banco y cómo salen los pagos (cada semana, los martes). Lista de los pagos al banco de las últimas semanas con su estado:
  ENVIADO, PRÓXIMO o EN PAUSA.
- **Pausar pagos / Reanudar pagos** (con motivo): el negocio sigue cobrando, pero nada sale al banco hasta reanudar. Para
  disputas o sospecha de fraude. Con Stripe real, el calendario de pagos de la cuenta pasa a manual y vuelve a semanal.
- **Plan y facturas:** plan, estado (prueba, Pro, cobro fallido, cortesía, Free), próximo cobro y desde cuándo; los cobros de
  Pro, los fallidos y lo que hizo el equipo. Acciones: **Pro de cortesía** (30, 60 o 90 días), **Quitar cortesía**,
  **Extender prueba** (7, 14 o 30 días), **Reintentar cobro** y **Anular suscripción**.
- **Cobros con tarjeta:** los últimos 12 (número, cliente, tarjeta, comisión, devuelto) y «Ver en Transacciones».

## Quién puede
| Acción | Permiso |
|---|---|
| Ver la pestaña Dinero | transacciones · ver |
| Pausar / reanudar pagos | transacciones · aprobar |
| Extender prueba, reintentar cobro | planes · editar |
| Cortesía, quitar cortesía, anular | planes · aprobar |
Solo negocios de tus ciudades. Todo pide motivo y queda en el Historial.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Pausar pagos | La cuenta queda «En pausa por To’Latino» con quién, cuándo y el motivo. El dueño recibe «Pagos al banco en pausa» y lo ve en Cobros. Se sigue cobrando. |
| Reanudar | Lo pendiente sale el próximo martes. El dueño recibe «Pagos al banco reanudados». |
| Stripe no responde al pausar | No cambia nada y lo dice; se intenta otra vez. |
| Tocar dos veces | Si ya estaba así, no se repite el aviso ni la auditoría. |
| Anular con Pro pagado | Sigue en Pro hasta el final del período y luego Free. No se devuelve lo cobrado. |
| Anular en prueba | El último día de la prueba pasa a Free. |
| Anular con cobro fallido | Pasa a Free hoy (ese período no se pagó); el paso a Free, «anulada» en el historial y la auditoría van juntos. |
| Anular con cobro fallido, pero el dueño ya confirmó el cobro en su banco | No se anula: «El banco ya había cobrado este período…» y el plan sigue en Pro hasta el fin del período. Si todavía quieres, toca «Anular» otra vez. |
| Anular mientras el plan se está cobrando | «El plan se está procesando ahora mismo…»: nada cambia; prueba en un minuto. |
| El plan cambió entre que lo abriste y tocaste | «El plan cambió mientras tanto»: nada cambia (tampoco la auditoría); actualiza y decide otra vez. |
| Negocio sin cuenta de cobro | Dice «Sin conectar · no cobra en línea»; no hay pagos que pausar. |
| Sandbox | Todo va contra el simulador: no se mueve dinero real. Los pagos al banco se calculan de lo cobrado. |

## Preguntas frecuentes
**¿Pausar pagos detiene los cobros?** No. El cliente sigue pagando; el dinero espera en Stripe hasta reanudar.
**¿Se borra algo al anular?** No. Lo Pro se duerme y vuelve igual si el negocio regresa a Pro.

## Pagos de eventos
- Los boletos se cobran en To'Latino y se pagan **por fecha, el martes después**, con una transferencia de Stripe a la cuenta del organizador
  (Super Admin › Eventos y boletos › **Liquidaciones**). **Pausar pagos** aquí también retiene los pagos de eventos («RETENIDA · cuenta») hasta
  reanudarlos. Ver «admin-eventos-y-boletos» (Liquidaciones).

**English:** ticket sales are paid per date the Tuesday after through a Stripe transfer; pausing payouts here also holds event payouts until resumed.

## English

### What it does
- **90-day numbers:** charged by card, held now (orders the business has not accepted yet), refunded, and To'Latino's fee on what was charged.
- **Stripe:** status of the payout account (enabled, needs verification, restricted or not connected), the bank's last 4 digits and how payouts
  go out (every week, on Tuesdays). A list of the bank payouts of the last weeks with their status: SENT, NEXT or ON HOLD.
- **Pause payouts / Resume payouts** (with a reason): the business keeps charging, but nothing goes out to the bank until you resume. For
  disputes or suspected fraud. With real Stripe, the account's payout schedule switches to manual and goes back to weekly.
- **Plan and invoices:** plan, status (trial, Pro, failed charge, courtesy, Free), next charge and since when; Pro charges, failed ones and what
  the team did. Actions: **Courtesy Pro** (30, 60 or 90 days), **Remove courtesy**, **Extend trial** (7, 14 or 30 days), **Retry charge** and
  **Cancel subscription**.
- **Card charges:** the last 12 (number, customer, card, fee, refunded) and «View in Transactions».

### Who can
| Action | Permission |
|---|---|
| See the Money tab | transactions · view |
| Pause / resume payouts | transactions · approve |
| Extend trial, retry charge | plans · edit |
| Courtesy, remove courtesy, cancel | plans · approve |
Only businesses in your cities. Everything asks for a reason and goes into the History.

### What happens in each case
| Case | What happens |
|---|---|
| Pause payouts | The account shows «Paused by To'Latino» with who, when and the reason. The owner gets «Bank payouts paused» and sees it in Payouts. Charging continues. |
| Resume | What is pending goes out next Tuesday. The owner gets «Bank payouts resumed». |
| Stripe does not respond when pausing | Nothing changes and it says so; it is tried again. |
| Tapping twice | If it was already that way, the notice and the audit entry are not repeated. |
| Cancel with paid Pro | It stays Pro until the end of the period and then Free. What was charged is not refunded. |
| Cancel during a trial | On the last day of the trial it goes to Free. |
| Cancel with a failed charge | It goes to Free today (that period was not paid); the switch to Free, «cancelled» in the history and the audit entry go together. |
| Cancel with a failed charge, but the owner already confirmed the charge with their bank | It is not cancelled: «The bank had already charged this period…» and the plan stays Pro until the end of the period. If you still want to, tap «Cancel» again. |
| Cancel while the plan is being charged | «The plan is being processed right now…»: nothing changes; try again in a minute. |
| The plan changed between opening it and tapping | «The plan changed meanwhile»: nothing changes (not the audit either); refresh and decide again. |
| Business without a payout account | It says «Not connected · does not charge online»; there are no payouts to pause. |
| Sandbox | Everything goes against the simulator: no real money moves. Bank payouts are calculated from what was charged. |

### FAQ
**Does pausing payouts stop charges?** No. The customer keeps paying; the money waits in Stripe until you resume.
**Is anything deleted when you cancel?** No. What is Pro goes to sleep and comes back the same if the business returns to Pro.

### Event payouts
- Tickets are charged in To'Latino and paid **per date, the Tuesday after**, with a Stripe transfer to the organizer's account
  (Super Admin › Events and tickets › **Settlements**). **Pause payouts** here also holds event payouts («HELD · account») until you
  resume them. See «admin-eventos-y-boletos» (Settlements).

**English:** ticket sales are paid per date the Tuesday after through a Stripe transfer; pausing payouts here also holds event payouts until resumed.
