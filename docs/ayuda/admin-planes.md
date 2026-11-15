# Super Admin › Planes y suscripciones · Plans

_Pantallas: `/admin/planes` (ADM-PLAN). Permiso «Planes y suscripciones»: ver; editar (extender prueba, reintentar cobro); aprobar (cortesía,
comisiones e impuestos). Versión: 15 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Cifras:** MRR (Pro activos, anuales prorrateados), en prueba (cuántas terminan en 7 días), cobro fallido y Free al
  techo (negocios Free que ya usaron sus 10 pedidos o citas en línea del mes).
- **Planes:** qué incluye Free y Pro, el precio, la prueba y la regla de cobros fallidos.
- **Suscripciones:** cada negocio de tus ciudades con su estado (en prueba, Pro, pasa a Free, cobro fallido, cortesía,
  Free), cuándo termina o se cobra y el dueño. Acciones con motivo: **Extender prueba** (1 a 60 días), **Cortesía** (Pro sin
  cobro N días), **Quitar cortesía** (pasa a Free; nada se borra), **Reintentar cobro**.
- **Comisiones:** la vigente por tipo (pedidos 10 %, citas 8 %, boletos 5 % + $1, apartados 6 %, reservaciones $0) y las
  programadas. **Programar cambio**: aplica en 30 días; lo ya vendido no cambia.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Extender una prueba que ya terminó | No deja: solo pruebas activas. |
| Cortesía a un negocio en Free | Pasa a Pro hoy; al terminar vuelve a Free con su contenido guardado. |
| Reintentar y el banco rechaza | Lo dice; sigue el conteo de intentos. |
| Comisión fuera de 0–30 % | No deja. |
| Negocio de otra ciudad | No aparece ni se puede tocar. |

Todo queda en la auditoría con el motivo.

**El techo de Free** (los 10 pedidos, citas o solicitudes en línea al mes) es el de hoy: To'Latino lo fija en su Configuración y la pantalla siempre dice el que vale en ese momento.

## Ingresos
Pestaña **Ingresos** en Planes y suscripciones: **comisiones de 8 semanas** (lo que To'Latino se queda de cada cobro con
tarjeta, neto de devoluciones; la semana actual resaltada), **cobros de Pro de 8 semanas** (con el MRR) y **comisión por
categoría en 90 días**. Semanas de lunes a domingo, hora del Este; solo tus ciudades. **Exportar CSV** (permiso de exportar
transacciones) queda en el Historial.

_English:_ **Revenue** tab: 8-week fees (net of refunds), 8-week Pro charges (with MRR) and fees by category over 90
days, for your cities; CSV export is audited.

## Impuestos
Pestaña **Impuestos**: el impuesto de cada ciudad y categoría — Taller (Auto) y Hogar sobre partes o materiales y sobre la mano de obra,
Venta de autos sobre el precio (entra en el total en la puerta) y Comida sobre el consumo de un evento privado — la vigente y las
programadas, con quién y por qué. **Programar cambio** (permiso aprobar): eliges qué cambia (partes / precio o mano de obra) y desde cuándo
(**ahora**, **el 1.º del mes que viene** o **el 1.º de enero**, a medianoche del Este), el porcentaje (0 a 20 %) y el motivo.

| Caso | Qué pasa |
|---|---|
| Programar desde el 1.º de enero | Sale **PROGRAMADA**; hasta esa fecha se cobra la vigente. Ese día entra sola y los totales en la puerta de Venta de autos se recalculan solos. |
| Programar desde ahora | Vale desde ese momento para lo que se cotice o venda después. |
| Un estimado ya enviado, una cita cerrada o un carro ya vendido | No cambian: guardan el porcentaje de su momento. |
| Equivocarse | Una regla nunca se cambia ni se borra: se programa otra con el porcentaje bueno y el motivo. |
| Porcentaje fuera de 0–20 % o sin motivo | No deja. |
| Ciudad que no es de tu rol | No aparece ni se puede tocar. |

Revísalo con el contador antes de cambiarlo (impuesto del estado y local).

_English:_ **Taxes** tab: each city and category's tax (parts or materials and labor for Auto and Home, price for Car sales, food and drink
for private events), current and scheduled, with who and why. **Schedule change** (approve permission): what changes (parts/price or
labor), from when (now, the first day of next month or January 1, midnight Eastern), the percent (0–20 %) and the reason. A rule is never edited
or deleted — schedule a new one; past quotes and sales keep their percent.

## English

### What it does
- **Numbers:** MRR (active Pro, annual plans prorated), in trial (how many end within 7 days), failed charge and Free at the cap (Free
  businesses that have already used their 10 online orders or bookings for the month).
- **Plans:** what Free and Pro include, the price, the trial and the failed-charge rule.
- **Subscriptions:** each business in your cities with its status (in trial, Pro, moving to Free, failed charge, courtesy, Free), when it ends
  or is charged, and the owner. Actions with a reason: **Extend trial** (1 to 60 days), **Courtesy** (Pro with no charge for N days),
  **Remove courtesy** (moves to Free; nothing is deleted), **Retry charge**.
- **Fees:** the current one by type (orders 10 %, bookings 8 %, tickets 5 % + $1, holds 6 %, reservations $0) and the scheduled ones.
  **Schedule change**: applies in 30 days; what was already sold does not change.

### What happens in each case
| Case | What happens |
|---|---|
| Extending a trial that already ended | Not allowed: only active trials. |
| Courtesy for a business on Free | It moves to Pro today; when it ends it goes back to Free with its content saved. |
| Retrying and the bank declines | It says so; the attempt count continues. |
| Fee outside 0–30 % | Not allowed. |
| Business in another city | It does not appear and cannot be touched. |

Everything is recorded in the audit log with the reason.

**The Free cap** (the 10 online orders, bookings or requests a month) is today's: To'Latino sets it in its Configuration and the screen always
shows the one in force at that moment.

### Revenue
**Revenue** tab in Plans and subscriptions: **8-week fees** (what To'Latino keeps from each card charge, net of refunds; the current week
highlighted), **8-week Pro charges** (with the MRR) and **fee by category over 90 days**. Weeks run Monday to Sunday, Eastern time; your
cities only. **Export CSV** (export-transactions permission) is recorded in the History.

### Taxes
**Taxes** tab: the tax of each city and category — Repair shop (Auto) and Home on parts or materials and on labor, Car sales on the price
(it goes into the total at the door) and Food on consumption at a private event — the current one and the scheduled ones, with who and why.
**Schedule change** (approve permission): you choose what changes (parts / price or labor) and from when (**now**, **the first day of next
month** or **January 1**, at midnight Eastern), the percent (0 to 20 %) and the reason.

| Case | What happens |
|---|---|
| Scheduling from January 1 | It shows **SCHEDULED**; until that date the current one is charged. That day it takes effect on its own and the at-the-door totals for Car sales are recalculated on their own. |
| Scheduling from now | It applies from that moment to whatever is quoted or sold afterward. |
| An estimate already sent, a closed appointment or a car already sold | They do not change: they keep the percent of their moment. |
| Making a mistake | A rule is never edited or deleted: you schedule another with the right percent and the reason. |
| Percent outside 0–20 % or no reason | Not allowed. |
| A city that is not in your role | It does not appear and cannot be touched. |

Check it with the accountant before changing it (state and local tax).
