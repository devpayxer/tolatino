# Super Admin: Negocio 360° › Dinero · Super Admin: Business 360° › Money

_Pantallas: ADM-NEG › pestaña **Dinero** (`/admin/negocios/{id}?tab=din`), teléfono y escritorio. Para el equipo de To'Latino (y El Compa como
copiloto del equipo). Versión: 6 nov 2026. Audiencia: equipo. Tema: equipo._

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
| Anular con cobro fallido | Pasa a Free hoy (ese período no se pagó). |
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

Business 360° › **Money**: 90-day charged / held / refunded / To'Latino fee; Stripe account status, bank last 4 and weekly
Tuesday payouts (SENT, NEXT, ON HOLD). **Pause payouts / Resume payouts** with a reason: charging continues but nothing goes
to the bank until resumed (with real Stripe the payout schedule switches to manual); the owner gets a notice and sees it in
Payouts. **Plan & invoices**: courtesy Pro (30/60/90 days), end courtesy, extend trial (7/14/30 days), retry charge, cancel
subscription (paid Pro runs to period end; trial ends on its last day; failed charge → Free today). Last 12 card charges.
Permissions: transactions·view to see, transactions·approve to pause, plans·edit/approve for plan actions. Everything is
audited with its reason.
