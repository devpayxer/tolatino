# Super Admin: El Compa · Super Admin: El Compa

_Pantallas: **Super Admin › El Compa · IA** (`/admin/compa`: «Interruptores y tope» y «Conversaciones»), la alerta del tope en Super Admin ›
Inicio y Sistema › Configuración › El Compa. Permisos (sección «El Compa · IA»): ver = la pantalla y las cifras; aprobar = interruptores, pausas
y tope (Admin de fábrica); Soporte y Solo lectura ven. También Super Admin › Negocios › un negocio › **El Compa**. Teléfono y escritorio.
Versión: 11 nov 2026. Audiencia: equipo. Tema: equipo._

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
- **Conversaciones:** cifras de 7 días (cuántas, resolvió solo, a una persona, acciones confirmadas; con un DÓNDE elegido, las de ese nivel) y
  cuántas por nivel (**VECINOS · 7 D**, **PANEL DEL NEGOCIO · 7 D**…), filtros **DÓNDE · RESULTADO · CANAL**, la búsqueda por número **CP-** y la
  lista (número, nivel, dónde —Soporte, hoja de ayuda o Panel—, canal, mensajes, ciudad, resultado, motivo y si contestó sin IA), sin el texto.
  **DÓNDE › Panel del negocio** son las conversaciones del asistente del panel (dueños y su equipo). Al tocar una, **la ficha**: QUIÉN · NEGOCIO · CANAL · RESULTADO · MOTIVO · CASO EN SOPORTE · DÓNDE, el hilo tal
  como se guardó (tapado), «Contestó sin IA (reglas fijas)» si pasó, las acciones que preparó y en qué quedaron, y **QUIÉN LA LEYÓ**. La ficha
  la abren **Admin y Soporte**; **cada apertura queda anotada** (quién y cuándo) antes de mostrar el hilo y esa lista no se borra. Solo lectura
  ve las cifras, no el hilo. «Marcar respuesta incorrecta» llega con el Super Admin completo de El Compa.

- **Negocios › un negocio › El Compa:** las cifras de 30 días del asistente en el panel de ese negocio (conversaciones, «Ir a …» que tocaron,
  casos que pasaron a Soporte, contestadas sin IA, por resultado) y si El Compa está en pausa ahí. Sin texto ni personas; el hilo, en
  Conversaciones (lectura anotada). Y **RESPUESTAS AUTOMÁTICAS** (Pro): si el negocio las encendió, lo que contestó y lo que pasó al negocio en
  30 días, los reportes «Una respuesta de El Compa» y **Apagar El Compa aquí** (con motivo; aviso al dueño, que apela por Soporte) o **Volver a
  permitirlas**.
- **Pestaña Negocios:** dónde están encendidas las respuestas automáticas y dónde las apagó To'Latino, con sus cifras de 30 días; cada fila lleva
  a la ficha del negocio. **DÓNDE › Respuestas automáticas** en Conversaciones muestra sus conversaciones (la ficha con el hilo, anotada).
- **Colas › Mensajes reportados:** si en la conversación contestó El Compa, sus mensajes salen marcados **EL COMPA** y el caso ofrece **Apagar El
  Compa aquí** (solo en esa conversación; el negocio la sigue viendo y contestando) y **El Compa en el negocio**.

## Cómo se usa
1. **Pausar un nivel o un canal:** toca su interruptor, elige o escribe el motivo y **Poner en pausa**. Para volver: el interruptor, motivo y
   **Encender**. Vale desde el mensaje siguiente.
2. **Pausar en una ciudad:** **Pausar aquí**, elige qué se pausa (todo o un nivel) y el motivo. **Levantar** la vuelve a encender.
3. **Pausar en un negocio:** **Pausar en un negocio**, escribe su id o su nombre exacto, elige qué se pausa y el motivo.
4. **Cambiar el tope:** **Cambiar el tope**, el monto en dólares (entre $0 y $10,000; $0 = sin IA) y el motivo. Vale desde la llamada siguiente.
   También está en Configuración › El Compa, con el aviso, la espera máxima, los límites por persona y el vencimiento de las acciones.
5. **Conversaciones:** filtra por DÓNDE, RESULTADO y CANAL o busca un **CP-**; **Siguientes** para ver más. Toca una para abrir su ficha (tu
   lectura queda anotada); desde ahí, **Ver TK-… en Soporte** y **Ver a la persona**.

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
| Pausas «Panel del negocio» (o el negocio, o su ciudad) | En el panel, la sección El Compa dice «El Compa no está disponible ahora» y lleva a Ayuda y Soporte; el resto del panel sigue igual. Igual al tope. |
| Alguien del equipo de un negocio pregunta por una parte del panel que no tiene | El Compa contesta «Eso lo ve el dueño del negocio», sin enlace; nada de esa parte le llega a la IA. |
| Apagas las respuestas automáticas de un negocio | Sus clientes vuelven a la respuesta fija de siempre (si el negocio la tiene); el dueño ve el motivo y no las puede encender. |
| Un cliente reporta una respuesta de El Compa | Caso en Mensajes reportados con el motivo «Una respuesta de El Compa»; ahí se apaga en esa conversación o se va al negocio. |
| Pausas «Respuestas automáticas», el canal, la ciudad o llega al tope | Mensajes funciona exactamente como antes: la respuesta fija de siempre, si el negocio la tiene. |

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
rules cannot be turned off. **Conversations** (filters WHERE · OUTCOME · CHANNEL and a CP- search; tapping one opens its record with who,
business, channel, outcome, reason, Support case, the stored (covered) thread, actions and **WHO READ IT** — only Admin and Support open it, and
every opening is logged before the thread shows; Read-only sees numbers only) shows 7-day numbers and the list (CP- number, level, channel, messages, city, outcome, reason,
answered without AI) without any text; it also counts conversations per level (neighbors, business dashboard…). **WHERE › Business dashboard**
are the dashboard assistant's conversations. Businesses › a business › **El Compa** shows that business's 30-day dashboard numbers (conversations,
«Go to …» taps, cases passed to Support, answered without AI) and whether El Compa is paused there, without text or people.

### How to use it
Tap a switch, pick or write a reason, then **Pause** or **Turn on**. **Pause here** on a city or **Pause in a business** (id or exact name),
choosing all or one level; **Lift** turns it back on. **Change the cap** in dollars ($0 to $10,000; $0 = no AI) with a reason. Everything is
logged with who, when and why.

### What happens in each case
At the warning, the Admin team is notified once a month and Home shows an alert; at the cap, a «reached the cap» notice and a red alert, and the
fixed rules answer until next month or a higher cap. A slow (over 8 s) or failing AI falls back to the rules; a timeout counts the reserved cost.
The output checker blocks answers without a source, invented prices or terms, «I already cancelled it», phone numbers, covered data, outside
links and emoji. After 20 messages an hour (60 a day) it offers a person without calling the AI. Non-Admin roles see everything but cannot
change switches. In production El Compa stays off until everything is turned on. With «Business dashboard» paused (or the business, or its city)
or at the cap, the dashboard's El Compa section says it is not available and links to Help and Support; the rest of the dashboard is unchanged. A
team member asking about a part they don't have gets «The business owner handles that», with no link. **Auto-replies (Pro):** a business's card (Businesses ›
a business › El Compa) shows whether it turned them on, 30-day counts and reports, and **Turn off El Compa here** (with a reason; the owner is
notified and appeals through Support) or **Allow them again**; the **Businesses** tab lists where they are on or turned off by To'Latino. In
Queues › Reported messages, El Compa's replies are marked and the case offers **Turn off El Compa here** for that conversation only. With
auto-replies paused at any level or at the cap, Messages works exactly as before (the business's fixed reply, if it has one).

### FAQ
- **Can El Compa charge or refund?** No. It only prepares: cancel a pending free request, open a screen, or go to a panel section; the person
  confirms and the usual function and permissions apply.
- **What does the AI see?** The minimum about that person, covered. Never anyone else, Health, Professionals, Kids, private messages or Super
  Admin data.
- **Where does the Anthropic key go?** In the server secrets, never in the repo or chat. Without it, the simulator runs on the test server and
  the fixed rules in production.
