# Super Admin: Configuración · Super Admin: Settings

_Pantallas: **Super Admin › Sistema › Configuración** (`/admin/sistema/configuracion`; pestañas Equipo y permisos · Configuración). Teléfono y
escritorio. Ver: permiso de Sistema. Cambiar: **solo un Admin**. Versión: 11 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- Junta en un solo lugar los **plazos y límites de la plataforma** que antes vivían escritos en el código: los de la Comunidad y los de
  Doctores, Profesionales, Noche, Educación, Niños, Deporte, Iglesias, Bienes Raíces y Autos. Cada valor tiene **unidad**, **valor de fábrica**, **mínimo y máximo**, y quién lo cambió por última vez.
- Por sección: **Comunidad** (publicaciones, comentarios, votos, conversaciones nuevas y reportes por persona al día; minutos para editar una
  publicación; días para apelar; lo más que dura una encuesta; «Ver traducción» por hora; hora del resumen diario; días que se proponen para
  un cupón) · **Gamification** (tope de puntos al día) · **Doctores y Profesionales** · **Noche** · **Educación · Niños · Deporte** ·
  **Iglesias · Bienes Raíces · Autos** · **Eventos** (evento privado: depósito de fábrica 25 %, cancelar gratis 72 h, el restaurante responde
  en 24 h, una propuesta vale 24 h, anticipación mínima 3 días, hasta 180 días adelante, 3 solicitudes abiertas por persona, 10 propuestas y
  3 «pedir un cambio» por solicitud; el plazo para cancelar queda escrito en cada propuesta al mandarla).
- **CAMBIADO**: el valor ya no es el de fábrica.
- **SOLO LECTURA**: el valor ya se lee de aquí, pero todavía no se cambia porque algún texto que ve la persona dice el número (por ejemplo
  «24 h»). La fila dice cuál. Se abre cuando ese texto lea el valor (anotado en LAUNCH-CHECKLIST).
- **Se cambia en su pantalla**: el tope del cargo del dealer va a Catálogo › Cargo del dealer (al bajarlo, baja a los dealers que lo pasan).
- **Auto-ocultar por reportes** se ve aquí y se cambia en Contenido › Auto-moderación, junto con el interruptor de su regla.

## Cómo se usa
1. Toca el valor. 2. Escribe el valor nuevo (número entero). 3. Elige o escribe el motivo. 4. **Guardar**.
- Aplica **desde ahora en todas las ciudades**. Lo que ya pasó no cambia (una publicación editada sigue editada).
- Queda en la auditoría con **antes → después**, quién y el motivo.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Valor dentro de sus límites | Se guarda, aplica al instante y queda en la auditoría. |
| Fuera de sus límites (p. ej. 2 min para editar, mínimo 5) | «Entre 5 min y 1,440 min.» No se guarda. La base también lo rechaza. |
| No es un número entero | «Escribe un número entero.» |
| El mismo valor | «Ya tiene ese valor.» |
| Fila SOLO LECTURA | «Todavía no se cambia aquí: …» con el motivo. |
| No eres Admin | Ves los valores; «Solo un Admin cambia la configuración.» |
| Límites del día y traducciones | También se cambian en Contenido › Auto-moderación: es el mismo valor y la misma auditoría. |
| Varios servidores | Cada uno ve el valor nuevo en 15 segundos como mucho. |

## Preguntas frecuentes
- **¿Bajar los minutos para editar afecta lo ya publicado?** Desde ese momento, solo se edita lo que esté dentro del plazo nuevo.
- **¿Cómo vuelvo al valor de fábrica?** Escribe el valor de fábrica que dice la fila (motivo «Volver al de fábrica»).
- **¿Por qué hay valores que no puedo cambiar?** Porque una pantalla le dice el número a la persona; cambiarlo aquí haría falso ese texto.

## Soporte
La sección **Soporte**: horas hábiles para la primera respuesta de un caso (8), días que atiende el equipo (5 = lunes a viernes; 6 hasta el
sábado; 7 todos los días), hora en que empieza (9) y termina (18), casos que una persona abre al día (5; uno de seguridad nunca se frena),
**tope de devolución del rol Soporte** por caso (5000 centavos = $50; más lo devuelven Finanzas o un Admin) y días para reabrir un caso resuelto
(7). Las pantallas de Soporte, Mi cuenta (también Avisos › Soporte), el panel y El Compa dicen el horario con estos valores (arriba de la
sección sale cómo lo dicen: «El equipo atiende lunes a viernes, de 9 AM a 6 PM»); el plazo de cada caso lo calcula la base con ellos, y el
tope lo lee la base en el momento de devolver.

**English:** the **Support** section: business hours to first reply (8), days the team works (5 = Mon–Fri), start (9) and end (18) hour, cases
per person per day (5; safety cases are never blocked), the **Support role refund cap** per case (5000 cents = $50; Finance or an Admin refund
more) and days to reopen a resolved case (7). Screens read the hours from here; the database computes each case deadline and reads the cap at
refund time.

## El Compa
La sección **El Compa**: tope de gasto del mes (10000 centavos = $100; 0 = sin IA), aviso antes del tope (80 %), espera máxima de la IA (8000
ms; pasado eso contestan las reglas fijas), respuesta más larga, mensajes por persona en una hora (20) y en un día (60), turnos por conversación
(20), cierre de una conversación (24 h), vencimiento de una acción preparada (15 min), operaciones de la persona que ve El Compa (10),
**cuánto se guardan las conversaciones (12 meses; después solo cifras)**, los límites de las respuestas automáticas, del copiloto y de WhatsApp y
SMS (enlace de un uso, mensajes al día, retención del registro de entrada), y la ayuda que lee (trozos y umbral). Abajo, **MODELO DE CADA
PAPEL**: el modelo de vecinos, panel y respuestas (Claude Haiku 5.5) y el del copiloto del equipo (Claude Sonnet 5.5). Se elige entre los
modelos encendidos de la lista de precios (el simulador nunca); un modelo no tiene dos papeles; el precio de cada uno no se escribe en el
código. Solo un Admin, con motivo y auditoría; vale desde la llamada siguiente. «Si no contestas en» de las respuestas automáticas sigue en
**SOLO LECTURA** (hoy solo contestan fuera del horario del negocio).

**English:** the **El Compa** section: monthly cap ($100), warning (80 %), maximum AI wait, longest answer, messages per person per hour and per
day, turns, closing, action expiry, operations it sees, **how long conversations are kept (12 months; then numbers only)**, auto-reply, copilot
and WhatsApp/SMS limits, and the help it reads. **MODEL FOR EACH ROLE** picks the everyday model and the copilot model among the models turned on
in the price list (never the simulator; one role each); Admin only, with a reason and audit.

## Para El Compa
<!-- solo-equipo -->
- Explica qué hace cada valor y su valor actual (la pantalla lo dice); nunca cambies un valor por alguien: solo un Admin, con motivo.

## Eventos
La sección **Eventos** va en subgrupos: **Publicar y revisar** (revisión 24 h, fechas de una serie 52, días hacia adelante 180, fotos 6, días
seguidos 30) · **RSVP y venta** (el RSVP guarda el lugar 30 min, boletos guardados mientras pagas 8 min, 10 por orden, 20 por persona y fecha,
intentos de código, apartados a la vez) · **Después de comprar** (transferir hasta 2 h antes, cancelar con devolución hasta 24 h antes, 30 min para
pagar el lugar de la lista de espera, 50 cortesías por fecha, 10 transferencias al día) · **Cambios y pago al organizador** (3 avisos por fecha,
día de pago, retener el primer evento desde $2,000, cancelaciones que abren un caso y su plazo, ajuste, devoluciones al momento) · **Avisos y
recordatorios** (hora del recordatorio del día antes, 10 AM; aviso de vendido al organizador, 90 %) · **La puerta** · **Evento privado** ·
**Confianza** (órdenes desde un mismo dispositivo y en cuántos minutos; boletos recibidos y pasados a otro). Cada texto que ve la persona lee el
valor (por ejemplo «te guardamos boletos y mesa por 8 minutos», «se activa 2 horas antes»). **Día de pago de eventos** está en **SOLO LECTURA**:
el panel, Publica tu evento y la ayuda dicen «el martes después del evento»; se abre cuando esos textos lean el valor.

**English:** the **Events** section is grouped (publish and review, RSVP and sales, after purchase, changes and organizer payouts, notices and
reminders, the door, private events, trust). Every customer-facing text reads the value. **Event payout day** is read-only until the dashboard
and help texts that say «Tuesday» read it.

## Apps
La sección **Apps** muestra el build mínimo y el de aviso de cada app y plataforma (To'Latino, Negocios, Repartidor y Puerta, en iPhone y
Android). Se cambian en **Sistema › Apps** (fila «Se cambia en su pantalla»), porque allí además se revisa que el aviso quede por encima del
mínimo. Ver la ayuda «Super Admin: Apps».

También en **Apps**, la **ubicación del repartidor durante la entrega**: cada cuánto manda su posición (5–60 s, 10 por defecto), la distancia
mínima (25 m), los **días que se guarda** (1–90, **14**: para aclarar un reclamo; después solo queda la distancia y el tiempo), si **el cliente ve
el mapa** desde «Recogí» (1) o nunca (0), la **velocidad imposible** (una posición más rápida se rechaza) y cuándo una posición es **vieja**. El
recorrido de una entrega se ve en **Transacciones › Ver recorrido**, solo escribiendo el motivo, que queda en la auditoría.

**English:** the **Apps** section shows each app's minimum and notice build per platform; they are changed in **System › Apps**, which also
checks that the notice build stays above the minimum. Also in **Apps**: the **driver location during a delivery** (how often, minimum distance, **days kept** — 14 by default, max 90 —, whether the
**customer sees the map** from pickup, the **impossible speed** and when a position is stale). A delivery route is opened in **Transactions ›
View route** only with a written reason, which is audited.

## English

- **What it does:** platform deadlines and limits in one place (Community limits per day, minutes to edit a post, days to appeal, longest
  poll, translations per hour, daily digest hour, proposed coupon days; points cap; the deadlines of clinics, professionals, nightlife, education, kids, sports, churches, real estate and cars). Each has a unit, a factory value,
  a minimum and a maximum, and who changed it last. **CHANGED** = not the factory value. **READ ONLY** = read from here but not editable yet
  because a screen tells people the number. The dealer fee cap is changed in Catalog (it also lowers dealers above it).
- **How to use:** tap the value → new whole number → reason → **Save**. Applies now in every city; logged before → after with the reason.
- **Each case:** out of bounds → refused («Between 5 min and 1,440 min»), the database also refuses it; not a whole number → refused;
  read only → says why; not Admin → view only. Other servers see the change within 15 seconds.
- **FAQ:** lowering the edit minutes applies from now on; to go back, type the factory value.
