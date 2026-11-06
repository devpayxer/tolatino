# La cita en el taller y la visita a tu casa · Auto shop booking and home visit in progress

_Pantallas: **Tu cita** (`/cita/{número}`) para el cliente; Panel › **Hoy** y el detalle de la cita para el negocio.
Versión: Fase 4 · bloque 4c (6 nov 2026)._

## Qué hace
Cuando la cita de un taller o la visita de un servicio del hogar ya está confirmada, el negocio marca cada paso desde su
panel y el cliente lo ve al momento en Tu cita, con aviso en Avisos.

- **Taller (Auto):** Recibí el carro → Empezar → Listo para recoger → Lo entregué.
  - El cliente ve «Revisando tu CR-V · EN EL TALLER», luego «Arreglando tu CR-V · TRABAJANDO» y al final «Listo para
    recoger», con lo que falta por pagar al recogerlo (el depósito, si hubo, ya está descontado).
  - Cuando lo recoge, el cliente toca **Ya lo recogí** y la cita queda terminada (o el taller toca «Lo entregué»).
- **Hogar:** Voy en camino → Llegué → Empezar → Terminé → Cerrar la visita. También **No había nadie**.
  - El cliente ve «va en camino · llega dentro de tu franja de 12 PM–2 PM», «EN TU CASA», «TRABAJANDO» y
    «Revisa el trabajo antes de pagar». Si todo quedó bien, toca **Todo bien** y la visita queda terminada.
  - En Hogar no aparecen «Cómo llegar» ni «Voy tarde»: es el profesional quien va a la casa.
- **El detalle en el panel** muestra el vehículo y su millaje, si el cliente lo deja o espera, las luces encendidas y si
  quiere las piezas viejas; en Hogar, la casa, si es inquilino con permiso del landlord, la franja, el cuarto y cómo entrar.
- Cada paso queda en el historial de la cita y en la auditoría.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| El negocio toca un paso fuera de orden (por ejemplo, «Listo» sin haber recibido el carro) | El servidor no lo deja; la cita se queda en su paso. |
| No había nadie en la casa | La visita se cierra como «No había nadie». Si hubo depósito, se queda con el negocio (es la regla que el cliente aceptó al pedir); si no, no se cobra nada. |
| El cliente quiere cancelar cuando ya empezó | Ya no puede cancelar desde la app; usa **Ayuda con la cita**. |
| Algo no quedó bien | El cliente toca **Ayuda con la cita** desde Tu cita; el negocio responde y To'Latino revisa si hace falta. |
| El negocio olvida cerrar la cita | Queda abierta en su panel hasta que la cierre, o hasta que el cliente toque «Ya lo recogí» / «Todo bien». |
| La cita es de Belleza | Sigue el flujo de siempre (Llegó · en atención → Terminada). |

## Preguntas frecuentes
**¿Me cobran algo sin que yo lo apruebe?** No. En el taller nada se hace ni se cobra sin tu OK; en casa te dan el precio
completo antes de empezar y, si algo cambia, te preguntan primero.

**¿Cómo sé que ya vienen?** Tu cita cambia a «VA EN CAMINO» y te llega un aviso.

**¿Dónde pago?** Pagas el resto en el taller al recoger tu carro, o al terminar la visita en tu casa.

---

## What it does (EN)
Once an auto shop booking or a home visit is confirmed, the business marks each step from its panel and the customer
sees it right away in Your booking, with a notice in Notifications.

- **Auto:** Car received → Start → Ready for pickup → Handed back. The customer taps **I picked it up** to finish.
- **Home:** On my way → I arrived → Start → Done → Close the visit, or **Nobody home**. The customer taps **All good** to
  finish. Directions and Running late are hidden: the pro comes to the home.
- The panel detail shows the vehicle, mileage, drop-off or wait, warning lights, old parts; for Home, the address,
  renter with landlord's permission, arrival window, room and access.
- Every step goes to the booking history and the audit log.

| Case | What happens |
|---|---|
| A step out of order | The server refuses it. |
| Nobody home | Closed as "Nobody home"; a deposit stays with the business, otherwise nothing is charged. |
| Customer wants to cancel after it started | Not from the app; use **Appointment help**. |
| Something went wrong | **Appointment help** from Your booking. |

**Am I charged without approving?** No. Nothing is done or charged without your OK.
