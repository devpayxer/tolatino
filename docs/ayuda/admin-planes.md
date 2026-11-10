# Super Admin › Planes y suscripciones · Plans

_Pantallas: `/admin/planes` (ADM-PLAN). Permiso «Planes y suscripciones»: ver; editar (extender prueba, reintentar cobro); aprobar (cortesía y
comisiones). Versión: 6 nov 2026. Audiencia: equipo. Tema: equipo._

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

## Ingresos
Pestaña **Ingresos** en Planes y suscripciones: **comisiones de 8 semanas** (lo que To'Latino se queda de cada cobro con
tarjeta, neto de devoluciones; la semana actual resaltada), **cobros de Pro de 8 semanas** (con el MRR) y **comisión por
categoría en 90 días**. Semanas de lunes a domingo, hora del Este; solo tus ciudades. **Exportar CSV** (permiso de exportar
transacciones) queda en el Historial.

_English:_ **Revenue** tab: 8-week fees (net of refunds), 8-week Pro charges (with MRR) and fees by category over 90
days, for your cities; CSV export is audited.

## English

`/admin/plans`: MRR, trials (ending within 7 days), failed charges and Free at cap. Plans (what Free and Pro include).
Subscriptions per business with actions: extend trial, courtesy Pro, remove courtesy, retry charge — each with a reason
and audited. Fees: current and scheduled; a change applies in 30 days and never touches past sales.
