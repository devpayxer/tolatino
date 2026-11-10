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

Each rented chair has its own page (the person's services and prices, how they confirm, deposit, next opening and their
own verified reviews) and its own payout account: the owner asks the barber to connect it from Panel › Chairs, the barber
connects it from their To'Latino account (bank details go to Stripe only), and from then on the chair's booking deposits go
to the barber's bank. Without a connected account the chair takes no online deposit.
