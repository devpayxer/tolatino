# Stripe caído

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Lo que cada caso abre queda en `incident_log` (Super Admin › Sistema › Despliegues) con este archivo como `manual_ref`._

**Severidad:** alta · **caso:** `stripe-caido`

## Cómo se nota
- `WebhookStripeCaido` (el webhook no contesta como debe 5 min) o la página de estado de Stripe; los cobros fallan con error de red.

## Qué hace el sistema solo
- Los pedidos con tarjeta quedan esperando (nada se cobra dos veces: cada cobro tiene su llave); **el efectivo sigue**. La conciliación diaria marca lo que no cuadre.

## Qué hace Claude
- Mirar la conciliación del día siguiente (Planes › Ingresos) y las alertas del dinero; si un webhook se perdió, Stripe lo reintenta 3 días.

## Qué se le dice al fundador
- «Stripe estuvo caído N minutos; N pedidos esperaron el cobro y salieron después / se cancelaron sin cobro.»

## Qué se les dice a los vecinos
- En la hoja de pago: «No pudimos cobrar ahora; intenta otra vez o paga en el local» (el texto de siempre).
