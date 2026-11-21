# Super Admin: revisión automática de las fotos públicas · Super Admin: automatic review of public photos

_Pantallas: Super Admin › **Contenido › Auto-moderación** (`/admin/contenido?tab=auto`, bloque «Fotos públicas · revisión automática»), **Colas › Medios marcados** y **Colas › Apelaciones** (una foto), **Analítica › Reportes** (el bloque «Fotos» del reporte diario) y el reporte diario al fundador (correo y push). Escritorio y teléfono. Versión: 20 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Toda foto que se va a ver en público se revisa sola, en cuatro capas, antes de verse.** A una persona del equipo solo le llegan las
  **apelaciones** y las **fotos reportadas**; lo demás se decide solo y queda en la auditoría (qué capa, puntaje, motivo, modelo y versión;
  solo inserción).
  - **Capa 1 · modelo propio** (el de Mensajes): puntaje de desnudez. Menos del umbral de duda (60 % de fábrica) → se publica al instante;
    desde el umbral de rechazo (85 %) → se rechaza con aviso; entre los dos → pasa a la capa 2.
  - **Capa 2 · segunda opinión** (Claude con visión, la misma conexión de El Compa): recibe la foto reducida (hasta 640 px) y una pauta fija,
    nada de quién la subió. Contesta publicar, rechazar (con uno de los cinco motivos) o no estoy segura. Con tope de gasto al mes ($10 de
    fábrica), un tiempo límite de 8 s al subir y 5 reintentos del barrido. Apagada, sin llave o sin presupuesto: las dudosas **quedan retenidas**.
  - **Capa 3 · reportes**: 3 cuentas distintas (que no sean de menos de 72 h; los reportes desde un mismo dispositivo cuentan como una) → la
    foto se oculta sola, su archivo sale de lo público, el dueño recibe aviso y pasa a la capa 2 para el veredicto.
  - **Capa 4 · confianza ganada**: un negocio verificado, con 10 fotos visibles o más y ninguna quitada en 90 días, publica sus dudosas
    sin la capa 2 (las claras se rechazan igual). Una cuenta de menos de 7 días sube hasta 10 fotos públicas por hora; las de una operación (destino privado) solo tienen el tope general de 60 por hora.
- **Ante la duda se retiene; nunca se publica «por si acaso».** Si un modelo no responde, la capa está apagada o no hay presupuesto, la
  foto queda retenida y el barrido la vuelve a intentar.
- **Nunca sale de casa una foto privada.** A la capa 2 solo van fotos destinadas a lo público. Mensajes, ayuda, entrega y reclamos usan
  solo el modelo propio; una foto que va solo a un negocio (solicitud, cita, estimado, viaje) que sale dudosa queda retenida y no se manda.
- **Una foto que va solo a un negocio no tiene dirección pública** (desde el 21 nov): la ven quien la subió, el cliente y el negocio de esa
  operación, y el equipo **solo con un caso abierto** de esa operación en su cola y su ciudad («Ayuda con…» o el daño de una renta; en una
  ayuda de Salud, con el motivo de «vidrio roto»). Cada vez que alguien del equipo la abre queda en la auditoría (`fotos.privada.ver`). Esa
  foto tampoco se puede poner en algo público (menú, catálogos, galería): el servidor la rechaza.
- **Una foto retenida o rechazada** no se ve en ninguna pantalla y su archivo deja de ser público (vive en una llave privada). Si se
  aprueba, vuelve. Se recuerda por su contenido: lo rechazado se rechaza para cualquiera; lo aprobado por una persona entra directo para
  quien la subió.

## Cómo se usa
1. **Contenido › Auto-moderación** (el bloque «Fotos públicas · revisión automática (4 capas)»):
   - Cada capa tiene su **interruptor** y **Cambiar valores** (umbrales de duda y rechazo, tiempo límite, reintentos, reportes, edad de
     las cuentas que reportan, fotos y días de la confianza, límite de cuentas nuevas). Cada cambio pide motivo y queda en la auditoría.
   - **El tope al mes** de la capa 2 se cambia en **capa 2 › Cambiar valores**, en **centavos** (1000 = $10). En $0 la capa 2 no se llama.
   - Arriba de las cifras ves el **gasto del mes** contra el tope y las **llamadas**. Al tope, las dudosas quedan retenidas con «Pedir
     revisión» y se ven en Colas › Apelaciones.
   - Más abajo: las cifras de **hoy** y de **los últimos 7 días** por capa (publicadas · retenidas · rechazadas · ocultas) y **cinco
     fotos publicadas por los modelos, al azar**, para que las mires. Si una no debió salir, quítala desde la ficha del negocio o de la publicación.
2. **Colas › Apelaciones** (una foto): ves la foto (por el visor privado; cada vez que la abres queda en la auditoría), lo que escribió la
   persona y el motivo que recibió. **Levantar** publica la foto y avisa; **Mantener** la deja rechazada. Decide otra persona, no quien la
   rechazó. La decisión es final.
3. **Colas › Medios marcados** (una foto reportada): si ya se ocultó, el caso dice «Oculta mientras decides»; **Está bien** la publica y
   **Quitar foto** la deja rechazada; quienes reportaron reciben el resultado.
4. **Reporte diario**: trae un bloque «Fotos» con las cifras de ayer por capa, el gasto del mes y cinco fotos al azar con su enlace.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Foto limpia (modelo propio) | Se publica al instante; queda su veredicto en el libro. |
| Foto clara (desnudez) | Se rechaza sola, con aviso y «Pedir revisión». |
| Foto dudosa | Capa 2; si publica, se ve; si rechaza, motivo; si no está segura, retenida. |
| Capa 2 apagada o al tope | Las dudosas quedan retenidas; el barrido las resuelve cuando se enciende o cambia el mes. |
| El modelo propio no responde | La capa 2 decide; nunca se publica sin un «publicar». |
| 3 reportes de cuentas distintas | La foto se oculta, su archivo sale de lo público, aviso al dueño, capa 2. |
| Reportes de cuentas nuevas o del mismo dispositivo | No suman de más. |
| Apelación levantada | Se publica y se recuerda su contenido. |
| Apelación mantenida | Queda rechazada; el contenido se rechaza para cualquiera. |
| El almacén de fotos no responde al decidir | La acción dice «No se pudo mover la foto…» y no cambia nada; se repite. |
| La foto oculta o quitada estaba también en un plato o servicio, era un logo, una foto de perfil o la de alguien del equipo | En el mismo paso (capa 3, **Quitar foto** de Medios marcados o de Negocio 360, rechazo de la revisión, cuenta purgada) sale también de ahí: nadie ve una foto rota. Queda anotado de dónde salió. Las fotos de afuera (las de la semilla) y lo que el dueño quita él mismo no se tocan. |
| Esa foto vuelve a verse (Está bien, apelación levantada, Restaurar) | Vuelve sola a cada lugar del que salió (al mismo lugar entre las fotos del plato), si sigue libre: si el negocio o la persona ya pusieron otra, o el plato tiene 5, se queda lo nuevo. Una foto de destino privado nunca vuelve a un lugar público. |

## Preguntas frecuentes
- **¿Retiene demasiado?** Sube el umbral de duda de la capa 1 (por ejemplo de 60 a 70) y mira las cifras de la semana.
- **¿Rechaza algo bueno?** Revisa las apelaciones levantadas; si hay muchas del mismo motivo, sube el umbral de rechazo.
- **¿Cuánto gasta la capa 2?** Una llamada por foto dudosa que va a lo público; el gasto del mes y las llamadas están en la pantalla.
- **¿Qué ve Claude?** La imagen reducida y la pauta. Nada de quién la subió, ni negocio, ni ciudad.
- **¿Puedo ver una foto retenida sin apelación?** No: solo con un caso abierto de esa foto, en tu ciudad.
- **¿Quién cambia los valores?** Quien puede editar reglas de Contenido.

## English

### What it does
- **Every photo meant to be shown in public is reviewed automatically, in four layers, before it shows.** A team member only gets
  **appeals** and **reported photos**; everything else is decided automatically and recorded in the audit log (which layer, score,
  reason, model and version; insert only).
  - **Layer 1 · own model** (the Messages one): nudity score. Under the doubt threshold (60 % by default) → published instantly; from
    the reject threshold (85 %) → rejected with a notice; in between → goes to layer 2.
  - **Layer 2 · second opinion** (Claude with vision, the same connection as El Compa): it gets the reduced photo (up to 640 px) and a
    fixed guideline, nothing about who uploaded it. It answers publish, reject (with one of five reasons) or not sure. With a monthly
    spending cap ($10 by default), an 8 s limit on upload and 5 sweep retries. Off, with no key or no budget: doubtful photos **are held**.
  - **Layer 3 · reports**: 3 different accounts (none under 72 h old; reports from one device count as one) → the photo hides itself,
    its file leaves public storage, the owner gets a notice and it goes to layer 2 for the verdict.
  - **Layer 4 · earned trust**: a verified business with 10 or more visible photos and none removed in 90 days publishes its doubtful
    photos without layer 2 (clear ones are still rejected). An account under 7 days old uploads up to 10 public photos an hour; photos for an operation (private destination) only have the general cap of 60 an hour.
- **When in doubt it is held; it is never published “just in case”.** If a model does not answer, a layer is off or there is no budget,
  the photo is held and the sweep retries.
- **A private photo never leaves.** Only photos meant to be public go to layer 2. Messages, help, delivery and claims use only the own
  model; a photo that goes only to a business (request, appointment, estimate, trip) that comes out doubtful is held and not sent.
- **A photo that goes only to a business has no public address** (since Nov 21): it is seen by whoever uploaded it, the client and the
  business of that operation, and the team **only with an open case** about that operation in their queue and city (“Help with…” or rental
  damage; for a Health help, with the “break glass” reason). Each time a team member opens it, it is logged (`fotos.privada.ver`). That photo
  cannot be put on anything public either (menu, catalogs, gallery): the server rejects it.
- **A held or rejected photo** shows on no screen and its file stops being public (it lives under a private key). If approved, it comes
  back. It is remembered by its content: what was rejected is rejected for anyone; what a person approved goes straight in for whoever uploaded it.

### How to use it
1. **Content › Auto-moderation** (the “Public photos · automatic review (4 layers)” block):
   - Each layer has its **switch** and **Change values** (doubt and reject thresholds, time limit, retries, reports, age of reporting
     accounts, photos and days of trust, new account limit). Every change asks for a reason and goes into the audit log.
   - **The monthly cap** of layer 2 is changed in **layer 2 › Change values**, in **cents** (1000 = $10). At $0 layer 2 is not called.
   - Above the numbers you see **this month's spend** against the cap and the **calls**. At the cap, doubtful photos are held with “Ask
     for a review” and show up in Queues › Appeals.
   - Further down: the numbers for **today** and **the last 7 days** by layer (published · held · rejected · hidden) and **five photos
     published by the models, at random**, for you to look at. If one should not be out, remove it from the business or the post.
2. **Queues › Appeals** (a photo): you see the photo (through the private viewer; every time you open it, it is in the audit log), what
   the person wrote and the reason they received. **Lift** publishes the photo and notifies; **Keep** leaves it rejected. Someone other
   than whoever rejected it decides. The decision is final.
3. **Queues › Flagged media** (a reported photo): if it is already hidden, the case says “Hidden while you decide”; **It's fine**
   publishes it and **Remove photo** leaves it rejected; people who reported it get the result.
4. **Daily report**: it has a “Photos” block with yesterday's numbers by layer, the month's spend and five random photos with a link.

### What happens in each case
| Case | What happens |
|---|---|
| Clean photo (own model) | Published instantly; its verdict is in the ledger. |
| Clear photo (nudity) | Rejected on its own, with a notice and “Ask for a review”. |
| Doubtful photo | Layer 2; if it publishes, it shows; if it rejects, a reason; if not sure, held. |
| Layer 2 off or at the cap | Doubtful photos are held; the sweep resolves them when it is turned on or the month changes. |
| The own model does not answer | Layer 2 decides; nothing is ever published without a “publish”. |
| 3 reports from different accounts | The photo hides, its file leaves public storage, the owner is notified, layer 2. |
| Reports from new accounts or the same device | They do not add up extra. |
| Appeal lifted | Published and its content is remembered. |
| Appeal kept | Stays rejected; the content is rejected for anyone. |
| The photo store does not answer when deciding | The action says “Could not move the photo…” and nothing changes; try again. |
| The hidden or removed photo was also on a dish or service, was a logo, a profile photo or a team member's photo | In the same step (layer 3, **Remove photo** in Flagged media or Business 360, a rejection by the review, a purged account) it comes off there too: nobody sees a broken photo. Where it came off is recorded. Outside photos (the seed's) and what the owner removes themselves are not touched. |
| That photo shows again (It's fine, appeal lifted, Restore) | It goes back on its own to each place it came off (the same place among the dish's photos), if still free: if the business or the person already put in another one, or the dish has 5, the new one stays. A private-destination photo never goes back to a public place. |

### Frequently asked questions
- **Does it hold too much?** Raise layer 1's doubt threshold (for example from 60 to 70) and watch the week's numbers.
- **Does it reject something good?** Look at the lifted appeals; if many share a reason, raise the reject threshold.
- **How much does layer 2 spend?** One call per doubtful photo headed to the public; the month's spend and calls are on the screen.
- **What does Claude see?** The reduced image and the guideline. Nothing about who uploaded it, the business or the city.
- **Can I see a held photo without an appeal?** No: only with an open case for that photo, in your city.
- **Who changes the values?** Whoever can edit Content rules.
