# Super Admin: Soporte · Super Admin: Support

_Pantallas: **Super Admin › Soporte** (`/admin/soporte`: cifras, Abiertos · Míos · Escalados · Resueltos · Macros, buscador, chips y la ficha
del caso con `?caso=TK-…`), Colas › «Soporte · casos», Usuarios 360° › Soporte, Negocios 360° › Soporte y Configuración › Soporte.
Permisos (sección «Soporte»): ver; editar = responder, notas, tomar, resolver, unir, ligar, reabrir, pasar a Finanzas y devolver con tope;
aprobar = macros y ocultar un mensaje; «Transacciones › aprobar» devuelve sin tope del rol. Escritorio y teléfono. Versión: 10 nov 2026.
Audiencia: equipo. Tema: equipo._

## Qué hace
- Los casos de vecinos y negocios con To'Latino (TK-…). Cada caso trae su **contexto**: la persona (teléfono, ciudad, idioma, cuántos casos),
  el negocio si lo abrió desde su panel, la operación o la ayuda ligada, lo pagado en la app y el dispositivo y la versión.
- **Plazo:** primera respuesta en las horas hábiles de Configuración (8 de fábrica, lunes a viernes de 9 AM a 6 PM, hora de la ciudad). La base
  pone el plazo y mete el caso en la cola cuando le toca al equipo (nuevo, la persona volvió a escribir, reabierto) y lo saca cuando le toca a la
  persona (respondido, resuelto, unido). Un caso que pasa su plazo sube a prioridad **alta** y avisa a quien lo tiene.
- **Macros** ES/EN con {nombre}: un toque llena la respuesta en el idioma de la persona; tú la revisas y la envías.
- **Notas internas:** solo el equipo las ve; nunca le llegan a la persona (la pantalla de la persona no las recibe).

## Cómo se usa
1. **Tomar el siguiente caso** (el sin asignar más urgente) o abre uno de la lista. Tomarlo le dice a la persona «Lo están viendo».
2. **A la persona:** elige una macro o escribe, y **Enviar** (le llega el aviso; el caso pasa a «Te respondieron»). **Nota interna:** para el
   equipo.
3. **Resolver** con el mensaje para la persona; después ella dice si se resolvió (si dice que no en 7 días, vuelve a la cola).
4. **Resolver y devolver:** el monto y el mensaje. Se devuelve a la tarjeta lo pagado por la operación del caso. Soporte devuelve hasta **$50
   por caso** (Configuración › Soporte, suma lo ya devuelto); más, **Pasar a Finanzas** o un Admin (hasta lo cobrado). La base revisa el tope
   de tu rol al decidir; tocar dos veces devuelve una sola vez.
5. **Ligar a una operación** (1234, C-…, H-…) de esa persona o de su negocio; **Unir a otro caso** (mismo dueño); **Reabrir** un resuelto;
   **Ocultar un mensaje** que trae datos que no se guardan.
6. **Macros:** nueva, editar, apagar o encender (con motivo; queda en la auditoría). Solo texto: sin etiquetas y sin otra llave que {nombre}.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Soporte devuelve más de su tope | «Tu rol devuelve hasta $50 por caso…»: no se llama a la pasarela. Pásalo a Finanzas o a un Admin. |
| Se pide devolver más de lo cobrado | «Puedes devolver hasta $…»: no se mueve nada; el intento queda como fallido con su motivo. |
| El caso no tiene operación pagada | Liga primero la operación; si no hay nada pagado en la app, no se devuelve aquí. |
| Unir casos de personas distintas | No se puede. |
| Tu rol es de una ciudad | Solo ves y trabajas los casos de tus ciudades. |
| Ver una foto del caso | Se abre aparte y queda en la auditoría. |
| La persona escribió una tarjeta o un SSN | Ya llegó tapado; la base rechaza guardarlo sin tapar. |

## Preguntas frecuentes
- **¿Dónde están las ayudas de pedidos y citas que el negocio no respondió?** En Colas › Ayuda con pedidos y citas (el enlace está al pie de
  Abiertos).
- **¿La persona ve quién le respondió?** Ve tu nombre de pila y «To'Latino».
- **¿Se borra algo?** No: los mensajes solo se agregan (el texto se oculta con motivo), los casos cambian de estado y las macros se apagan.

## English

### What it does
Neighbor and business cases with To'Latino (TK-…), each with its **context**: the person (phone, city, language, case count), the business if
opened from its dashboard, the linked operation or help request, what was paid in the app, and device and app version. **Deadline:** first reply
within the business hours set in Configuration (8 by default, Mon–Fri 9 AM–6 PM, city time); the database queues the case when it is the team's
turn and removes it when it is the person's. A case past its deadline becomes **high** priority and notifies its assignee. **Macros** ES/EN with
{name} fill the reply in the person's language. **Internal notes** are team-only and never reach the person.

### How to use it
Take the next case or open one. Reply **To the person** (macro or text) or write an **Internal note**. **Resolve** with a message; the person
then says if it was solved («No» within 7 days reopens it). **Resolve and refund** refunds the case's operation payment to the card: Support up to
**$50 per case** (Configuration › Support, counting what was already refunded); more needs Finance or an Admin (up to what was charged). The
database checks your role's cap at decision time; tapping twice refunds once. **Link** an operation or help request, **Merge** duplicates of the
same person, **Reopen**, **Hide a message**. **Macros:** create, edit, turn off or on, with a reason (audited); plain text only.

### What happens in each case
Over the Support cap: refused before reaching the payment provider. More than charged: refused, nothing moves, the attempt is logged as failed.
No paid operation: link it first. Different people cannot be merged. City-scoped roles only see their cities. Opening a case photo is audited.
Card or SSN numbers arrive covered; the database refuses them uncovered.

### FAQ
- **Where are unanswered order and booking help requests?** Queues › Order and booking help.
- **Does the person see who replied?** Your first name and «To'Latino».
- **Is anything deleted?** No: messages are append-only (text can be hidden with a reason), cases change status, macros are turned off.
