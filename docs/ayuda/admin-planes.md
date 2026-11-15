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

`/admin/plans`: MRR, trials (ending within 7 days), failed charges and Free at cap. Plans (what Free and Pro include).
Subscriptions per business with actions: extend trial, courtesy Pro, remove courtesy, retry charge — each with a reason
and audited. Fees: current and scheduled; a change applies in 30 days and never touches past sales.

**The Free cap** (10 online orders, bookings or requests a month) is today's: To'Latino sets it in its Configuration and the screen always shows the one in force.
