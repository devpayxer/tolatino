# Panel › Eventos: series y eventos de varios días · Recurring and multi-day events

_Pantallas: **Panel › Eventos › Crear / Editar** (CUÁNDO · DURACIÓN) y **Panel › Eventos › la ficha** (`/panel/{negocio}/eventos?det=evt:…`), parte
«Eventos» del equipo (cancelar con devolución pide también «Cobros»). Del lado del cliente: la lista de Eventos, la página del evento y la
pantalla de boletos. Teléfono y escritorio. Versión: Fase 6 · bloque 6f (10 nov 2026)._

## Qué hace
- **DURACIÓN** en el editor: **Un día** · **Varios días seguidos** · **Se repite**.
- **Se repite**: **cada semana** (eliges **QUÉ DÍAS**: el de la primera fecha va siempre; puedes sumar otros), **cada 2 semanas** o **cada mes**
  (el mismo día de la semana del mes: «el segundo jueves», o **«el último viernes»** si la primera fecha es la última de su mes). **CUÁNTAS FECHAS**
  (4, 6, 8, 12, 26; cada mes: 3, 4, 6, 12; el tope lo pone Configuración › Eventos, hoy 52). El calendario marca las fechas de la serie; antes de
  publicar puedes tocar una para **saltarla**.
- **Las fechas las crea To'Latino**: se crean hasta donde se puede publicar (hoy 180 días, Configuración); las que quedan más lejos **se crean
  solas** cuando llegan. **Cada fecha tiene sus propios boletos** (los mismos tipos y cantidades) y **su propio cupo** de RSVP: el cliente elige
  la fecha.
- **Varios días seguidos** (2 a 30): **CUÁNTOS DÍAS**, **Horario distinto cada día** (el día 1 usa el horario de arriba) y, con boletos,
  **«Crear un boleto por cada día + pase»** (un pase de todos los días con 20 % menos —lo cambias— y un boleto por día). Cada boleto dice **VALE
  PARA**: un día o **todos los días · pase** (entra una vez cada día). **Aforo por día**: lo más que entra cada día, contando pases y boletos de
  ese día (0 = sin límite). Un evento de varios días **no vende mesas** (una mesa es de una noche: hazlo como serie). Con RSVP, el cliente dice a
  qué día va y cada día tiene su cupo.
- **La ficha de una serie**: arriba, **FECHA QUE ESTÁS VIENDO** (toca una fecha: todo lo de abajo —lo vendido, compradores, «Cambiar», «Cancelar»—
  es de esa fecha). **FECHAS · CADA JUEVES**: cada fecha con lo vendido; **Saltar** (solo si nadie ha comprado ni dicho que va) y **Volver a
  ponerla**; las canceladas dicen CANCELADA. **QUIÉN SE PRESENTA · SOLO ESTA FECHA**: **Cambiar artista solo esta fecha** (les avisamos en la
  app a los que van a esa fecha) y **Volver al de siempre**. **VENDIDOS POR DÍA** de esa fecha en los últimos 7 días.
- **La ficha de varios días**: **POR DÍA · CUÁNTOS VAN** (con el aforo y LLENO cuando se llena).
- **Cambiar**: **todas las fechas que vienen** = Editar (la hora, los días, cuántas fechas). **Solo una fecha** = «Cambiar el {fecha}» en la
  ficha (como un evento de un día: avisamos por SMS a los que van y quien compró elige quedarse o la devolución total).
- **Cancelar**: **QUÉ CANCELAS · Solo el {fecha}** (devuelve el 100 % solo a quien compró ESA fecha) o **Toda la serie**. Un evento de varios
  días se cancela entero.
- **Lo que ve el cliente**: la lista muestra la serie **una vez** (su próxima fecha) con «CADA JUEVES · +7 FECHAS»; la página dice **FECHAS ·
  CADA JUEVES** con las fechas y «Cada fecha tiene sus boletos.»; un evento de varios días dice «VIE 20 NOV – DOM 22 NOV · 3 DÍAS», **DÍAS Y
  HORARIO** y en cada boleto «Vale solo el sáb 21 nov» o «Vale los 3 días».
- **Tu dinero**: se paga **por fecha**, el martes después de cada fecha. En varios días, todo se paga el martes después del **último día**.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Cambias la hora de la serie y no eres organizador verificado | El cambio va a revisión de To'Latino; mientras, siguen las fechas como estaban. |
| Cambias la hora de la serie y una fecha ya tiene boletos o RSVP | Esa fecha se queda a su hora; las demás cambian. Cámbiala sola con «Cambiar el {fecha}» (con aviso). |
| Cambias los días o cuántas fechas y una fecha con gente saldría de la serie | No deja guardar: cancela esa fecha con devolución o muévela primero. |
| Quieres saltar una fecha con boletos o RSVP | No se puede saltar: se cancela con devolución. |
| Quieres saltar la primera fecha | Cambia la primera fecha en el editor. |
| Mueves una fecha y luego editas la serie | La fecha movida se queda donde la pusiste. |
| Un día de un evento de varios días se llena | El boleto de ese día y el pase salen AGOTADO; los otros días siguen a la venta. |
| Ya vendiste en un evento de varios días | Los días y la duración ya no cambian (cancela y crea otro si hace falta). |
| Un boleto de un día ya se vendió | El día para el que vale ya no cambia. |
| Pasa una fecha de la serie | Queda como «pasó»; las siguientes siguen saliendo. |

## Preguntas frecuentes
- **¿Hasta cuántas fechas?** Las que pone Configuración › Eventos (hoy 52). Si no caben en los días que se pueden publicar, las demás se crean
  solas cuando llegan.
- **¿El pase se vende hasta cuándo?** Hasta el corte del primer día (al empezar, al abrir puertas o un día antes, como elegiste). Cada boleto de
  un día, hasta el corte de su día.
- **¿El portero sabe para qué día vale un boleto?** Sí: cada boleto guarda sus días; el pase entra una vez cada día (llega con la Puerta).
- **¿Puedo cambiar el artista de una sola fecha?** Sí, en la ficha: «Cambiar artista solo esta fecha». Les avisamos en la app a los que van.

---

## What it does (English)
**DURATION** in the editor: **One day** · **Several days in a row** · **Repeats**. **Repeats**: every week (pick **WHICH DAYS**; the first date’s day
is always on), every 2 weeks, or every month (the same weekday of the month, or **the last** one). **HOW MANY DATES** is capped by Settings (52
today). To'Latino creates the dates up to the publishing window (180 days today) and the rest are created automatically as they come. **Each date
has its own tickets and its own RSVP spots.** **Several days in a row** (2–30): different hours each day, **Create one ticket per day + pass**
(an all-days pass at 20 % off, editable), **VALID FOR** one day or every day (one entry per day), and a **daily capacity** that counts passes and
that day’s tickets; multi-day events do not sell tables. On the event page: **DATE YOU ARE VIEWING** (everything below is for that date), **DATES**
with **Skip** (only with nobody in) / **Add it back**, **WHO PERFORMS · THIS DATE ONLY**, **SOLD PER DAY**, and for multi-day events **BY DAY ·
HOW MANY ARE GOING**. To change every upcoming date, use Edit (an unverified organizer’s change goes to review; dates with people keep their
time); to change one date, use “Change {date}” (attendees get a text and buyers choose to keep it or get a full refund). Cancel **only that
date** (refunds only that date’s buyers) or **the whole series**; a multi-day event is cancelled as a whole. Clients see a series once in lists
(“EVERY THURSDAY · +7 DATES”), the dates on the page, and on multi-day events the days, hours and “Valid only on …”. Payouts stay per date, the
Tuesday after each date (multi-day: after the last day).
