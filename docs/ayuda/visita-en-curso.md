# La cita en el taller y la visita a tu casa · Auto shop booking and home visit in progress

_Pantallas: **Tu cita** (`/cita/{número}`) para el cliente; Panel › **Hoy** y el detalle de la cita para el negocio. Versión: 6 nov 2026. Audiencia:
vecino. Tema: citas._

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

## English

### What it does
When the appointment at a shop or the visit of a home service is already confirmed, the business marks each step from its panel and the client sees it right away
in Your appointment, with a notice in Notices.

- **Shop (Auto):** Car received → Start → Ready for pickup → Handed back.
  - The client sees «Checking your CR-V · AT THE SHOP», then «Fixing your CR-V · IN PROGRESS» and finally «Ready for pickup», with what is left to pay at pickup
    (the deposit, if there was one, is already deducted).
  - When they pick it up, the client taps **I picked it up** and the appointment is finished (or the shop taps «Handed back»).
- **Home:** On my way → I arrived → Start → Done → Close the visit. Also **NOBODY HOME**.
  - The client sees «is on the way · arrives within your window of 12 PM–2 PM», «At your home», «In progress» and «Check the work before paying». If everything
    turned out fine, they tap **All good** and the visit is finished.
  - In Home, «Directions» and «Running late» do not appear: it is the professional who goes to the home.
- **The detail in the panel** shows the vehicle and its mileage, whether the client leaves it or waits, the warning lights on and whether they want the old parts;
  in Home, the home, whether they are a renter with the landlord's permission, the window, the room and how to get in.
- Every step goes in the appointment's history and in the audit log.

### What happens in each case
| Case | What happens |
|---|---|
| The business taps a step out of order (for example, «Ready» without having received the car) | The server does not allow it; the appointment stays at its step. |
| Nobody was home | The visit closes as «Nobody home». If there was a deposit, it stays with the business (it is the rule the client accepted when asking); if not, nothing is charged. |
| The client wants to cancel when it has already started | They can no longer cancel from the app; they use **Appointment help**. |
| Something did not turn out right | The client taps **Appointment help** from Your appointment; the business replies and To'Latino reviews if needed. |
| The business forgets to close the appointment | It stays open in its panel until it closes it, or until the client taps «I picked it up» / «All good». |
| The appointment is Beauty | It follows the usual flow (Arrived · in progress → Done). |

### FAQ
**Do they charge me anything without my approval?** No. At the shop nothing is done or charged without your OK; at home they give you the full price before
starting and, if something changes, they ask you first.

**How do I know they are coming?** Your appointment changes to «On the way» and you get a notice.

**Where do I pay?** You pay the rest at the shop when you pick up your car, or at the end of the visit at your home.
