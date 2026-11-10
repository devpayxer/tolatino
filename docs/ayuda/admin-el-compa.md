# Super Admin: El Compa · Super Admin: El Compa

_Pantallas: **Super Admin › El Compa · IA** (`/admin/compa`: «Interruptores y tope» y «Conversaciones»), la alerta del tope en Super Admin ›
Inicio y Sistema › Configuración › El Compa. Permisos (sección «El Compa · IA»): ver = la pantalla y las cifras; aprobar = interruptores, pausas
y tope (Admin de fábrica); Soporte y Solo lectura ven. Teléfono y escritorio. Versión: 10 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **El gasto del mes:** cuánto lleva El Compa en IA (precios de la API con el recargo de EE. UU.), el **tope** ($100 al mes de fábrica), el
  **aviso** (80 %) y lo que está en curso. Cada llamada a la IA **reserva** su costo máximo antes de salir y se liquida con lo que de verdad
  costó; si no cabe en el tope, no se llama: contestan las reglas fijas y la persona tiene «Con una persona». Muchas llamadas a la vez nunca
  pasan del tope.
- **Interruptores POR NIVEL** (vecinos, panel del negocio, respuestas automáticas, copiloto) y **POR CANAL** (chat de To'Latino, WhatsApp, SMS).
  Apagado = el camino de siempre: la ayuda abre el formulario, Soporte dice «Escríbenos», el panel avisa, no hay respuestas automáticas y el
  copiloto no sale. **POR CIUDAD** y **POR NEGOCIO**: pausar todo El Compa o un nivel en un solo lugar.
- **Modelo:** Claude Haiku 5.5 para vecinos, panel y respuestas automáticas; Claude Sonnet 5.5 solo para el copiloto del equipo. «Contesta
  ahora» dice si corre Claude (con la llave), el simulador del servidor de pruebas (sin llave) o las reglas fijas.
- **Reglas fijas (no se apagan):** siempre dice que es IA, nunca mueve dinero ni cambia la cuenta, nunca pide tarjeta, contraseñas, SSN ni
  estatus, no da consejo legal, médico ni de inmigración y contesta en el idioma de la persona.
- **Conversaciones:** cifras de 7 días (cuántas, resolvió solo, a una persona, acciones confirmadas) y la lista (número CP-, nivel, canal,
  mensajes, ciudad, resultado, motivo y si contestó sin IA). **Sin el texto.**

## Cómo se usa
1. **Pausar un nivel o un canal:** toca su interruptor, elige o escribe el motivo y **Poner en pausa**. Para volver: el interruptor, motivo y
   **Encender**. Vale desde el mensaje siguiente.
2. **Pausar en una ciudad:** **Pausar aquí**, elige qué se pausa (todo o un nivel) y el motivo. **Levantar** la vuelve a encender.
3. **Pausar en un negocio:** **Pausar en un negocio**, escribe su id o su nombre exacto, elige qué se pausa y el motivo.
4. **Cambiar el tope:** **Cambiar el tope**, el monto en dólares (entre $0 y $10,000; $0 = sin IA) y el motivo. Vale desde la llamada siguiente.
   También está en Configuración › El Compa, con el aviso, la espera máxima, los límites por persona y el vencimiento de las acciones.
5. **Conversaciones:** filtra por DÓNDE y RESULTADO; **Siguientes** para ver más.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| El gasto pasa el aviso (80 %) | Aviso al equipo Admin (una vez al mes) y la alerta en Super Admin › Inicio. |
| Llega al tope | Aviso «llegó al tope» al equipo Admin (una vez) y alerta roja en Inicio. Hasta el mes siguiente (o hasta subir el tope) contestan las reglas fijas. |
| La IA tarda más que la espera máxima (8 s) o falla | Contestan las reglas fijas; la conversación queda «contestó sin IA». Un tiempo agotado cuenta lo reservado. |
| La IA contesta algo que no se puede decir | El verificador lo frena (sin fuente, un precio o plazo inventado, «ya lo cancelé», un teléfono, un dato tapado, un enlace de afuera, emoji) y contestan las reglas. |
| Alguien escribe muchos mensajes | Después de 20 en una hora (o 60 en un día) El Compa ofrece «Con una persona» sin llamar a la IA. |
| Tu rol no es Admin | Ves todo; al tocar un interruptor: «Tu rol no cambia interruptores.» |
| Servidor de producción | El Compa queda apagado hasta que se enciende todo, aunque los interruptores digan otra cosa. |

## Preguntas frecuentes
- **¿El Compa puede cobrar o devolver?** No. Solo prepara: cancelar una solicitud pendiente y gratis, abrir una pantalla o ir a una sección del
  panel. La persona confirma con un toque y la acción pasa por la misma función y los mismos permisos de siempre.
- **¿Qué ve la IA?** Lo mínimo de esa persona, tapado: sus operaciones recientes y la ayuda de su audiencia. Nunca de otra persona, ni Salud,
  Profesionales, Niños, mensajes privados o algo del Super Admin.
- **¿Se guarda lo que dijo la gente?** Las conversaciones se guardan tapadas; el libro de uso (tokens, costo, modelo, espera) no guarda texto.
- **¿Dónde se pone la llave de Anthropic?** En los secretos del servidor, nunca en el repo ni en el chat. Sin llave, corre el simulador en el
  servidor de pruebas y las reglas fijas en producción.

## English

### What it does
Super Admin › El Compa · AI shows this month's AI spend (API prices plus the U.S. surcharge), the **cap** ($100 a month by default), the
**warning** (80 %) and what is in flight. Every AI call **reserves** its maximum cost before going out and settles with the real cost; if it does
not fit under the cap, the AI is not called: the fixed rules answer and the person keeps «Talk to a person». Many calls at once never go over
the cap. **Switches BY LEVEL** (neighbors, business panel, auto-replies, copilot) and **BY CHANNEL** (To'Latino chat, WhatsApp, SMS): off means
the usual path. **BY CITY** and **BY BUSINESS** pause all of El Compa or one level in one place. Models: Claude Haiku 5.5 for everyday use,
Claude Sonnet 5.5 only for the team copilot; «Answers now» says whether Claude, the test-server simulator or the fixed rules are running. Fixed
rules cannot be turned off. **Conversations** shows 7-day numbers and the list (CP- number, level, channel, messages, city, outcome, reason,
answered without AI) without any text.

### How to use it
Tap a switch, pick or write a reason, then **Pause** or **Turn on**. **Pause here** on a city or **Pause in a business** (id or exact name),
choosing all or one level; **Lift** turns it back on. **Change the cap** in dollars ($0 to $10,000; $0 = no AI) with a reason. Everything is
logged with who, when and why.

### What happens in each case
At the warning, the Admin team is notified once a month and Home shows an alert; at the cap, a «reached the cap» notice and a red alert, and the
fixed rules answer until next month or a higher cap. A slow (over 8 s) or failing AI falls back to the rules; a timeout counts the reserved cost.
The output checker blocks answers without a source, invented prices or terms, «I already cancelled it», phone numbers, covered data, outside
links and emoji. After 20 messages an hour (60 a day) it offers a person without calling the AI. Non-Admin roles see everything but cannot
change switches. In production El Compa stays off until everything is turned on.

### FAQ
- **Can El Compa charge or refund?** No. It only prepares: cancel a pending free request, open a screen, or go to a panel section; the person
  confirms and the usual function and permissions apply.
- **What does the AI see?** The minimum about that person, covered. Never anyone else, Health, Professionals, Kids, private messages or Super
  Admin data.
- **Where does the Anthropic key go?** In the server secrets, never in the repo or chat. Without it, the simulator runs on the test server and
  the fixed rules in production.
