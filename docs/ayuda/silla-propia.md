# Silla propia (quien renta una silla) · Renting a chair

_Pantallas: la página de cada silla (`/n/{negocio}/silla/{n}`), **Por barbero › Ver su página**, Panel › Lo que vendes › **Sillas** (cuenta de cobro
de cada barbero) y **Tu cuenta de cobro** del barbero (`/cuenta/silla/{id}`). Versión: 6 nov 2026. Audiencia: vecino. Tema: citas._

## Qué hace
- **La página de la silla:** el barbero como su propio negocio dentro del local: «Barbero · Silla 2 en Barbería El
  Primo», la tarjeta **SILLA 2 · DESDE 2019** que lleva al local, sus servicios con sus precios, si confirma al instante
  o cuánto tarda, su depósito, su próxima hora y sus reseñas (solo las de citas con él: «VERIFICADA · CON KELVIN»).
- **Su cuenta de cobro:** con sillas rentadas, el depósito de las citas de un barbero va a **su** banco, no al del
  local. El dueño, en Panel › Sillas, toca **Pedirle a Kelvin que la conecte**; a Kelvin le llega el aviso y la conecta
  desde su cuenta (sus datos y su banco los pone en Stripe; To'Latino no los ve). Al conectarla, al dueño le llega el
  aviso y la silla empieza a pedir el depósito que tiene puesto.
- **Quién decide qué:** el dueño ajusta en su panel los precios, la agenda, si confirma al instante y el depósito de
  cada silla («lo decide cada silla»); el barbero solo conecta su cuenta de cobro.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| La silla tiene depósito pero no conectó su cuenta | No pide depósito en línea (nunca va su dinero a la cuenta del local). |
| El barbero no tiene cuenta en To'Latino | El panel dice que lo invites primero desde Tu página › Equipo con su teléfono. |
| Empezó a conectarla y no terminó | Panel: «falta terminar en Stripe»; su página: «Terminar de conectar». |
| Otra persona abre el enlace de cobro | No lo ve: solo el barbero de esa silla. |
| La silla no hace un servicio | No sale en su página ni en su lista. |

## Preguntas frecuentes
**¿El local ve el banco del barbero?** Solo los últimos 4 números, para saber que está conectada.
**¿Cobra To'Latino comisión?** Sí, la de citas (8 %) sobre el depósito; el resto llega al barbero.

## English

### What it does
- **The chair page:** the barber as their own business inside the shop: «Barber · Chair 2 at Barbería El Primo», the card **CHAIR 2 · SINCE 2019** that leads to
  the shop, their services with their prices, whether they confirm instantly or how long they take, their deposit, their next time slot and their reviews (only
  those from appointments with them: «VERIFIED · WITH KELVIN»).
- **Their payout account:** with rented chairs, the deposit for a barber's appointments goes to **their** bank, not the shop's. The owner, in Panel › Chairs,
  taps **Ask Kelvin to connect it**; Kelvin gets the notice and connects it from his account (he enters his details and bank in Stripe; To'Latino does not see
  them). When it is connected, the owner gets the notice and the chair starts asking for the deposit it has set.
- **Who decides what:** the owner adjusts in their panel the prices, the schedule, whether it confirms instantly and the deposit of each chair («each chair
  decides»); the barber only connects their payout account.

### What happens in each case
| Case | What happens |
|---|---|
| The chair has a deposit but has not connected its account | It does not ask for an online deposit (their money never goes to the shop's account). |
| The barber does not have an account on To'Latino | The panel says to invite them first from Your page › Team with their phone. |
| They started connecting it and did not finish | Panel: «still needs to finish in Stripe»; their page: «Finish connecting». |
| Someone else opens the payout link | They do not see it: only the barber of that chair. |
| The chair does not do a service | It does not show on their page or in their list. |

### FAQ
**Does the shop see the barber's bank?** Only the last 4 digits, to know it is connected.
**Does To'Latino charge a commission?** Yes, the appointments one (8 %) on the deposit; the rest reaches the barber.
