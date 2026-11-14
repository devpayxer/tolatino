# Super Admin: Analítica · Super Admin: Analytics

_Pantallas: ADM-ANALIT (`/admin/analitica`), teléfono y escritorio. Para el equipo de To'Latino (y El Compa como copiloto del equipo). Versión: 14 nov
2026. Audiencia: equipo. Tema: equipo._

## Qué hace
Muestra lo que pasa en la plataforma con **datos propios**: nada sale a Google, Meta ni a otra empresa. Período de 7, 30
o 90 días, solo de tus ciudades.
- **Resumen:** el embudo del directorio, contado en personas (cuenta o dispositivo): cuántas buscaron o abrieron una
  categoría → cuántas abrieron una ficha → cuántas tocaron Llamar, WhatsApp o Cómo llegar.
- **Gente y negocios:** vecinos con cuenta y nuevos del período, % activos (entraron en el período), negocios Pro y
  Free, % verificados, retención de las cuentas nuevas (vuelven el día 1, 7 y 30) y negocios por categoría.
- **Soporte y confianza:** vecinos con sanción activa, % de casos de las colas decididos dentro de su plazo, las colas
  abiertas con su plazo, **reportes por cada 1,000 operaciones** y los **casos de Soporte** del período.
- **Doctores y Profesionales · Mercados y Tiendas · Fiestas y Transporte:** solo cifras de cada grupo.
- **Noche:** mesas y VIP pedidas, **% confirmadas en 60 minutos**, % vencidas sin respuesta, **mesas no respetadas**
  (el local canceló una mesa ya confirmada o el cliente pidió ayuda porque no le respetaron la mesa o la lista), depósitos
  (cobrado, retenido, devuelto y lo que **se quedó con el local**), **% de la lista que entró** (de las noches ya cerradas),
  **veces que el cover subió después de publicado** esa misma noche (sale del historial «Esta noche», que nunca se borra),
  **% «la fila, como decía»** en las reseñas, ayudas **«cobraron más cover» por cada 100 noches** y **licencias de licor
  vencidas** (PLCB). Debajo, los motivos de ayuda de la noche.
- **Educación · Niños · Deporte:** inscripciones pedidas por rubro, **% confirmadas en 24 h**, % vencidas, **grupos que no
  abrieron**, **ocupación de los grupos**, matrículas (cobrado, retenido, devuelto y lo que **se quedó con el lugar**), gente en **lista
  de espera** y días en promedio, **bajas de membresía** pedidas y confirmadas en 72 h, % «cobraron el total» y «certificado prometido»
  en las reseñas, **ayudas por cada 100 inscripciones** y **guarderías con licencia DHS vigente**. Nunca datos de un niño ni de un inscrito.
- **Iglesias · Bienes Raíces · Autos:** solicitudes de visita (y **cuántas por propiedad**), pruebas de manejo y citas (y **cuántas
  por carro**), **% confirmadas a tiempo** (antes de que venciera su plazo de 4 horas hábiles; el servidor no deja confirmar después),
  % vencidas sin respuesta, **plantones** («No vino»), **días hasta rentar**, **hasta vender una casa** y **hasta vender un carro**,
  **propiedades y carros a la vista hoy por ciudad**, **% «el total fue el que vi»** en las reseñas («Para mudarte» y «En la puerta»),
  **ayudas por cada 100 visitas**, **anuncios pausados por posible estafa** (en el período, en pausa hoy y sancionados), **textos frenados**
  por la lista de vivienda justa, declaraciones de **mayores de 62 por revisar**, en Iglesias las **fechas y catecismo pedidos** y **%
  respondidas en 48 h**, y **licencias** de las tres (vigentes, por vencer en 14 días, vencidas y en revisión). Debajo, los motivos de ayuda.
  **Nunca personas por religión** (ni la denominación ni quién va a qué iglesia) **ni datos de crédito** (la app no los pide ni los guarda).
- **Búsquedas sin oferta:** lo que buscaron y no había (pidieron aviso), con enlace a Catálogo.
- **Dinero, Hogar y Auto y Reportes:** ver abajo.
- **Exportar:** Negocios, Historial y Búsquedas sin oferta en CSV (abre en Excel o Sheets). Permiso analit · exportar;
  cada descarga queda en la auditoría.

### Comunidad
Pestaña **Comunidad** (7 · 30 · 90 días; días locales de cada ciudad): **publicaciones** y **comentarios**, **% de preguntas resueltas** (con
«Me sirvió»), **tiempo a la primera respuesta** (promedio, de otra persona), **reportes por cada 1,000 publicaciones**, **apelaciones
levantadas** (de las decididas), **monedas emitidas** (bienvenida y premios) y **canjeadas** (y las devueltas por códigos vencidos),
**canjes** y **canjes por negocio**, **vecinos activos por rango** (publicaron, comentaron o votaron) y **por ciudad**. Solo cifras: sale
de vistas por ciudad y día que no tienen personas; nunca quién publicó, votó o canjeó. Lo de la cuenta oficial no cuenta como publicación
de vecinos. **Las cifras se ponen al día cada 10 minutos** (un resumen por ciudad y día que el sistema rehace solo para los últimos 40 días; lo
que pasó hace más tiempo ya no cambia): algo que se publicó hace un momento puede tardar hasta 10 minutos en sumarse.

## Qué se cuenta y qué no
| Se guarda | No se guarda |
|---|---|
| El evento (ver categoría, ver ficha, buscar, contactar, entrar, registrarse, publicar negocio, recomendar, reclamar, reportar foto, pedir aviso), la cuenta o el dispositivo, la ciudad y datos del evento (p. ej. cuántos resultados tuvo una búsqueda) | Nombre, teléfono, correo, IP ni lo que la persona escribe en un formulario |
| Un día activo por cuenta y por dispositivo | Robots y buscadores (no cuentan) |

El dispositivo es un número al azar en una cookie que solo lee el servidor de To'Latino; si la persona borra las
cookies, cuenta como dispositivo nuevo.

## Preguntas frecuentes
**¿Por qué la retención dice que todavía no hay datos?** Hacen falta cuentas nuevas con al menos 1, 7 o 30 días de edad.

**¿Por qué «el cover subió» cuenta solo subidas?** Bajar el cover en la noche es a favor del cliente. Cada subida queda
con su hora en el historial del local (Negocios 360° › Esta noche) y a los que estaban en la lista les llega el aviso.

**¿«Mesas no respetadas» es lo mismo que la cola?** Es el total del período. La cola «Mesas no respetadas» se abre sola
cuando un mismo local llega a 3 en 30 noches.

**¿Por qué Iglesias no se separa por denominación?** Porque Analítica cuenta lo que pasa en la app, no lo que cree la gente. Ninguna
cifra dice cuántas personas van a una iglesia católica, evangélica o de otra fe (guardián `analiticaSinCreencias`).

**¿«Confirmadas a tiempo» de dónde sale?** De las visitas y pruebas que el negocio confirmó: el servidor solo deja confirmar antes de que
venza el plazo (4 horas hábiles, nunca después de la hora − 1 h); las que vencieron se cuentan aparte.

**¿Una licencia «vencida» pierde el sello sola?** No: «vencida» aquí es que pasó su fecha de revisión. Vuelve a Colas › Licencias con
prioridad y una persona la mira en el registro oficial; el sello cambia cuando decide.

**¿Dónde están vendido, comisión y operaciones?** En la pestaña **Dinero**; los rangos y lo de la comunidad, en **Comunidad**.

**¿Por qué una cifra no cambió al momento?** Dinero, Eventos, El Compa y Soporte, la retención y la Comunidad se ponen al día cada 10 minutos.

## Eventos
- **De ver a ir:** vistas de eventos, guardados, RSVP (y personas), órdenes de boletos, boletos y cortesías, lista de espera y cuántos compraron.
  El «% de las vistas» sale solo cuando tiene sentido (las vistas se cuentan desde que existe la ficha).
- **Dinero de boletos:** bruto (cobrado: boletos, mesa y extras, cargos incluidos), comisión (regla «bol») y devuelto.
- **En la puerta · fechas que ya pasaron:** asistencia (entraron / tenían boleto), no vinieron, RSVP que llegaron, incidencias por cada 1,000
  entradas (de esas mismas fechas).
- **Evento privado:** pedidas, con propuesta, sin respuesta, aceptadas, depósitos, canceladas a tiempo · tarde · por el restaurante.
- **Por formato, por ciudad y por organizador** (un negocio, no una persona).
- **Sin personas:** solo cifras por ciudad, día local y formato (tablas por ciudad y día que rehace el sistema cada 10 minutos); nunca quién compró, fue o entró. Guardián `analiticaSinPersonas`.

**English:** **Events** analytics: from views to going (views, saves, RSVPs, ticket orders, comps, waitlist conversions), ticket money (gross, fee,
refunded), at the door for past dates (attendance, no-shows, RSVPs that arrived, incidents per 1,000 entries), private events (requested, quoted,
accepted, deposits, cancelled on time / late / by the restaurant), by format, city and organizer. Only figures by city, local day and format: never people.

## El Compa y Soporte
La pestaña **El Compa y Soporte** (7, 30 o 90 días) sale de dos vistas sin personas, por ciudad, día, nivel, canal y tema:
- **El Compa:** conversaciones (con IA y con reglas fijas), resolvió solo (y acciones confirmadas), a una persona (y al dueño), **gasto de IA**
  (y cuántas veces no llamó por el tope, apagado o el límite), **espera de la IA** (promedio del período y el p95 del peor día: los percentiles de
  cada día no se suman), a reglas (lenta, error, rechazo o salida que no pasó el verificador), **no supo** y **marcadas**. Barras **POR QUÉ PASÓ A
  UNA PERSONA** y filas **DÓNDE CONTESTA** (vecinos, panel, respuestas automáticas, copiloto) y **POR DÓNDE ESCRIBEN**.
- **Soporte:** casos (desde El Compa, de negocios, prioridad alta), **plazo cumplido** (primera respuesta dentro de las horas hábiles del plazo
  vigente del caso), fuera de plazo, **1.ª respuesta** (promedio y p90 del peor día), **¿Se resolvió?** (sí/no) y **POR TEMA** y **POR CIUDAD**.
- Nunca quién habló con El Compa ni quién abrió un caso: ni nombres, ni teléfonos, ni números CP- o TK-, ni el texto. Para una conversación o un
  caso, El Compa › Conversaciones o Soporte (con su permiso; la lectura del hilo queda anotada).

## Dinero
La pestaña **Dinero** (7 · 30 · 90 días; días de cada ciudad) sale de las cifras diarias que el sistema rehace solo (cada 10 minutos los últimos 40
días y toda la historia una vez al día, de madrugada):
- **Vendido en línea** (lo cobrado con tarjeta en la app), **comisión** de To'Latino, **operaciones cobradas**, **devoluciones** (% y monto) y
  **ticket promedio** (vendido ÷ operaciones), cada uno contra el período anterior.
- **No llegaron:** de las citas, mesas, noches y visitas cuya hora ya pasó, cuántas terminaron en «no llegó».
- **Vendido por semana · 8 semanas:** lo cobrado menos lo devuelto; la última barra es la semana en curso.
- **Ticket promedio por tipo** y **por tipo de operación** (pedido, cita, mesa, boletos, evento privado…).
- **Pro:** **MRR** (lo que pagan cada mes los negocios Pro; el plan anual cuenta su doceava parte), **Pro pagando**, **conversión a Pro** (de las pruebas
  que terminaron en el período, cuántas pasaron a pagar), **en prueba**, las que pasaron a Free y lo cobrado de Pro, con el embudo **prueba Pro →
  dejaron su tarjeta → primer cobro**.
- **Dinero por estado:** de los cobros creados en el período, cuánto está cobrado, retenido, liberado o devuelto.
- La **conciliación diaria con Stripe** (lo cobrado aquí contra lo que dice Stripe) todavía no sale: cuando esté, sale aquí y en el reporte diario.
- Solo cifras por ciudad, día y tipo: nunca quién pagó.

## Gente: retención por cohorte y embudos
- **Retención por cohorte:** los vecinos que se registraron cada semana (de lunes a domingo, hora de su ciudad) y, de los que ya tienen la edad, cuántos
  volvieron **el día 1, 7 y 30**. «—» quiere decir que esa semana todavía no tiene la edad. Las cuentas de prueba no cuentan.
- **Embudo de vecinos nuevos:** se registraron → buscaron o abrieron una ficha → contactaron o pidieron → volvieron otro día.
- **Embudo de Publica tu negocio, paso a paso:** de los borradores que empezaron en el período, cuántos llegaron a cada paso (tipo de negocio, lo que
  hacen, lo que venden y sus precios, dónde y cuándo, revisar y publicar) y cuántos publicaron.

## Resumen: de buscar a aceptado, semillas y vistas
- **Embudo de buscar a aceptado:** buscaron o abrieron una categoría → abrieron una ficha → contactaron → enviaron un pedido o una cita → el negocio
  aceptó (personas distintas). Los cobros de un plan ya contratado no cuentan como un pedido nuevo.
- **Vistas de fichas** y **sin repetidos** (una vez por persona o teléfono y día; el sistema guarda solo una huella que cambia cada día y la suelta a
  los 2 días). Los robots y la gente del propio negocio no cuentan.
- **«Llamar» en una semilla:** cuántas veces tocaron Llamar en un negocio que un vecino recomendó y que todavía no reclamó su página, en cuántas semillas,
  las reclamadas del período y **las semillas que más llaman** (para salir a buscarlas).

## Búsquedas sin resultado
En **Búsquedas sin oferta**, además de los avisos pedidos, sale lo que se **buscó y no encontró nada** en 30 días, en personas distintas. Solo lo que
buscaron **2 o más personas** (la búsqueda de una sola persona puede ser un nombre y no sale). Todas las búsquedas sin cuenta cuentan como una sola
persona.

## Hogar y Auto
Pre-estimados y presupuestos **que terminan en cita**, emergencias atendidas y **tiempo de respuesta a una emergencia**, **% que llegó en la franja**
(Hogar: «Llegué» antes de que termine la franja de 2 horas), clientes que no llegaron, citas de Auto y, de los trabajos terminados con estimado,
**aprobado contra cobrado** (nunca se cobra más de lo aprobado) y los extras que el cliente aprobó. Nunca la casa, el carro ni quién pidió.

## Reportes
- **Reportes programados:** con permiso de exportar, cada pestaña (Resumen, Dinero, Gente y negocios, Búsquedas sin resultado, Eventos, El Compa y
  Soporte, Negocios) se programa **cada día, cada lunes o el día 1**, a las 8:00 AM de Hazleton, a tu correo y en tu idioma, con las cifras de tus
  ciudades (los últimos 7 días; el mensual, 30). Se pausa con el mismo interruptor; nunca se borra. Cada cambio queda en la auditoría. Si dejas el equipo
  o pierdes el permiso de Analítica, deja de salir. Sin correo en tu cuenta, no sale.
- **Reporte diario al fundador:** ver el artículo «Reporte diario». Lo ven los Admins; **Mándamelo ahora** te manda el de hoy a tu correo y como aviso.

## Las cifras al día y la base de análisis
Eventos, El Compa y Soporte, Dinero, la retención y la Comunidad salen de **tablas de cifras que solo escribe el sistema** (nadie del equipo las puede
cambiar; la base lo impide). Se ponen al día cada 10 minutos (los últimos 40 días) y una vez al día con toda la historia: algo que pasó hace un momento
puede tardar hasta 10 minutos en sumarse. En producción, Analítica lee de una **base de análisis** (una copia de solo lectura): una consulta pesada nunca
frena un pedido.

## English

Community: posts, comments, % of questions solved, time to first answer, reports per 1,000 posts, appeals lifted, coins issued and
redeemed, redemptions per business, active neighbors by rank and by city. Figures only, from per-city, per-day views with no people.

Analytics shows what happens on the platform with first-party data only (nothing goes to third parties), for 7, 30 or
90 days in your cities: the directory funnel (search or open a category → open a business page → tap Call, WhatsApp
or Directions, counted in people), people and businesses (neighbors, new, % active, Pro/Free, % verified, new-account
retention on day 1/7/30, businesses by category), support and trust (sanctioned, % of queue cases decided within SLA,
open queues), searches without supply, and CSV exports (businesses, history, searches without supply; audited). Events
store the account or a random device id, the city and event data — never name, phone, email, IP or form text; bots
are not counted.

Per-category tabs show numbers only. **Night:** table and VIP requests, % confirmed within 60 minutes, % expired
without a reply, tables not honored (the venue cancelled a confirmed table or the customer asked for help because the
table or list spot was not honored), deposits (charged, held, refunded and kept by the venue), % of the guest list that
got in, times the cover went up after it was posted that same night (from the append-only «Tonight» history), % of
reviews saying «the line was as posted», «charged more cover» help requests per 100 nights and expired liquor licenses
(PLCB), plus the night's help reasons. **Churches · Real estate · Cars:** viewing requests (and per property), test drives and
appointments (and per car), % confirmed on time (before the 4 business-hour deadline expired), % expired, no-shows, days to rent, to sell a
house and to sell a car, properties and cars live today by city, % of reviews saying «the total was what I saw», help requests per 100
visits, listings paused for a possible scam, texts blocked by the fair housing list, 62-and-over declarations to review, church dates and
catechism requested and % answered within 48 h, and licenses of the three (valid, due within 14 days, past review, in review). Never people
by religion and never credit data.

### El Compa and Support
The **El Compa and Support** tab (7, 30 or 90 days) reads two views without people, by city, day, level, channel and topic: El Compa
conversations, solved alone, to a person, AI spend, AI wait (period average and the worst day's p95), fallbacks to the rules, didn't know and
flagged; Support cases, deadline met, first reply (average and the worst day's p90), «Was it solved?», by topic and by city. Never names, phones,
CP- or TK- numbers or text.
- **Community** numbers are refreshed every 10 minutes (a per-city, per-day summary the system rebuilds for the last 40 days; older days no longer change): something posted a moment ago can take up to 10 minutes to count.

### Money
The **Money** tab (7 · 30 · 90 days; each city's days) comes from daily figures the system rebuilds on its own (every 10 minutes for the last 40 days,
and the whole history once a day, overnight): **sold online** (charged by card in the app), To'Latino's **commission**, **paid transactions**,
**refunds** (% and amount) and **average ticket**, each against the previous period; **no-shows** (bookings, tables, nights and visits whose time has
passed); **sold per week · 8 weeks** (charged minus refunded); average ticket **by type** and **by transaction type**; **Pro**: **MRR** (what Pro
businesses pay each month; a yearly plan counts as a twelfth), **paying Pro**, **Pro conversion** (of the trials that ended in the period, how many
started paying), **on trial**, those that went to Free and Pro charged, with the funnel **Pro trial → left their card → first charge**; and **money by
state** (charged, held, released, refunded). The daily **Stripe reconciliation** does not show yet: when it is ready, it shows here and in the daily
report. Figures only: never who paid.

### People: retention by cohort and funnels
**Retention by cohort:** the neighbors who signed up each week and, of those old enough, how many came back on **day 1, 7 and 30** («—» = not that old
yet; test accounts do not count). **New neighbors funnel:** signed up → searched or opened a page → contacted or ordered → came back another day.
**List your business, step by step:** of the drafts started in the period, how many reached each step and how many published.

### Overview: from search to accepted, seeds and views
The funnel goes from searching to **the business accepted** (distinct people; charges of a plan already signed do not count as a new order). **Business
page views** and **unique views** (once per person or phone a day; the system keeps only a fingerprint that changes every day and drops it after 2 days;
bots and the business's own people do not count). **«Call» on a seed:** taps on Call for a business a neighbor recommended that has not claimed its page
yet, the seeds claimed in the period and the **most called seeds**.

### Searches with no results
Under **Searches without supply**, what was searched and found nothing in 30 days, in distinct people, only when **2 or more people** searched it (one
person's search can be a name and does not show). All searches without an account count as one person.

### Home and Auto
Pre-estimates and quotes that **end in a booking**, emergencies answered and **emergency response time**, **% arrived in the window** (Home: «Arrived»
before the 2-hour window ends), customer no-shows, Auto bookings and, for finished jobs with an estimate, **approved vs. charged** (never more than
approved) and extras the customer approved. Never the home, the car or who asked.

### Reports
With export permission, each tab can be scheduled **every day, every Monday or on the first day of the month** at 8:00 AM Hazleton time, to your email and in your
language, with your cities' figures (last 7 days; monthly, 30). Pause it with the same switch; it is never deleted; every change is audited. It stops if
you leave the team or lose Analytics access, and it does not go out without an email on your account. The **daily report to the founder** has its own
article; Admins see it, and **Send it to me now** sends today's to your email and as a notification.

### Figures up to date and the analysis database
Events, El Compa and Support, Money, retention and Community come from **figure tables only the system writes** (nobody on the team can change them; the
database prevents it). They refresh every 10 minutes (last 40 days) and once a day with the whole history. In production, Analytics reads from an
**analysis database** (a read-only copy): a heavy query never slows down an order.
