# Super Admin: fotos a la medida · Super Admin: photos sized to fit

_Pantallas: Super Admin › **Contenido › Auto-moderación** (`/admin/contenido?tab=auto`, bloque «Fotos a la medida»). Solo lectura. Escritorio y teléfono. Versión: 21 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Cada foto que se sube se guarda en varios tamaños.** La original (hasta 1600 px, sin los datos del teléfono) no se toca; de ella salen
  versiones WebP en 320, 640, 1080 y 1600 px de ancho (nunca más anchas que la original). Cada pantalla pide el tamaño de su caja, así una
  tarjeta no baja la foto entera.
- **Las fotos de antes las convierte el barrido, por tandas.** Mientras una foto no tiene sus tamaños, se ve la original: nunca una foto rota.
- **Este bloque enseña cómo va todo eso**, con números de la base en el momento de abrir la pantalla. No tiene botones: no cambia nada.
- **Lo ve quien ya puede ver Contenido** en el Super Admin; no hay permiso nuevo.

## Cómo se lee cada cifra
Fotos públicas (las de nuestro almacén que se ven; una por archivo, una copia no cuenta dos veces):
- **Fotos públicas:** cuántas hay visibles.
- **Con sus tamaños:** las que ya tienen sus versiones WebP.
- **Faltan:** las que todavía esperan al barrido. En régimen debe ser casi cero; una subida reciente tarda un par de minutos en entrar.
- **Sin archivo:** las que el barrido no pudo convertir porque su original ya no está en el almacén. No bajan solas: se ven con lo que
  haya; avisa a quien administra el almacén si el número crece.
- **Peso de las originales:** lo que pesan juntas las originales con peso anotado (MB; 1 MB = 1 048 576 bytes). Las fotos de antes sin peso
  anotado no suman hasta que el barrido las lee.
- **Peso de los tamaños:** lo que pesan juntas todas las versiones WebP generadas.
- **Ahorro a 640:** lo que se ahorra al servir una foto convertida en una caja de 640 px (el caso de una tarjeta): el porcentaje y, debajo,
  las originales contra las versiones de 640 en MB. Solo cuenta fotos ya convertidas.

Fotos privadas (solo números; las de una cita, visita, ayuda, entrega o reclamo no tienen dirección pública y nunca se enseñan aquí):
- **Privadas, con sus tamaños, que faltan, sin archivo:** igual que arriba, para las de destino privado. Debajo de «Privadas» va el peso de
  sus originales y de sus tamaños.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| «Faltan» baja con los minutos | Es el barrido convirtiendo las de antes; es lo normal tras una subida grande. |
| «Faltan» no baja en un buen rato | El barrido o el almacén no responden: mira Sistema › Salud y los despliegues. |
| «Sin archivo» mayor que cero | Esa foto se queda con su original, sin tamaños; nadie ve una foto rota. |
| «Ahorro a 640» en 0 % | Todavía no hay fotos convertidas o ninguna pesa menos servida a 640. |
| Una foto se oculta, se rechaza o se purga | Deja de contar: solo cuentan las que se ven. |
| Una persona sin permiso de Contenido | No ve la pantalla. |

## Preguntas frecuentes
- **¿Puedo convertir una foto desde aquí?** No: es solo lectura; las convierte el barrido solo.
- **¿Por qué «Peso de los tamaños» es mayor que el de las originales?** Suma las cuatro versiones de cada foto; lo que ahorra una pantalla
  es una sola, y eso lo dice «Ahorro a 640».
- **¿Las cifras están en vivo?** Son de la base al abrir o refrescar la pantalla.
- **¿Se ven aquí las fotos privadas?** No: solo cuántas son y cuántas están convertidas.

## English

### What it does
- **Every uploaded photo is stored in several sizes.** The original (up to 1600 px, without the phone's metadata) is not touched; WebP
  versions at 320, 640, 1080 and 1600 px wide are made from it (never wider than the original). Each screen asks for the size of its box,
  so a card does not download the whole photo.
- **Older photos are converted by the sweep, in batches.** While a photo has no sizes, the original shows: never a broken photo.
- **This block shows how that is going**, with the database's numbers at the moment you open the screen. It has no buttons: it changes nothing.
- **Whoever can already see Content** in the Super Admin sees it; there is no new permission.

### How to read each number
Public photos (those in our storage that are visible; one per file, a copy is not counted twice):
- **Public photos:** how many are visible.
- **With their sizes:** those that already have their WebP versions.
- **Pending:** those still waiting for the sweep. In steady state it should be close to zero; a recent upload takes a couple of minutes to enter.
- **No file:** those the sweep could not convert because their original is no longer in storage. They do not download on their own: they
  show with what there is; tell whoever manages storage if the number grows.
- **Weight of the originals:** what the originals with a recorded weight weigh together (MB; 1 MB = 1,048,576 bytes). Older photos with no
  recorded weight do not add up until the sweep reads them.
- **Weight of the sizes:** what all the generated WebP versions weigh together.
- **Saving at 640:** what is saved when a converted photo is served in a 640 px box (a card's case): the percentage and, below, the
  originals against the 640 versions in MB. It only counts photos already converted.

Private photos (numbers only; those of an appointment, visit, help, delivery or claim have no public address and are never shown here):
- **Private, with sizes, pending, no file:** same as above, for private-destination photos. Under “Private” goes the weight of their
  originals and of their sizes.

### What happens in each case
| Case | What happens |
|---|---|
| “Pending” drops over the minutes | It is the sweep converting the older ones; normal after a big upload. |
| “Pending” does not drop for a good while | The sweep or the storage is not answering: check System › Health and deployments. |
| “No file” above zero | That photo keeps its original, with no sizes; nobody sees a broken photo. |
| “Saving at 640” at 0 % | There are no converted photos yet, or none weighs less served at 640. |
| A photo is hidden, rejected or purged | It stops counting: only photos that show count. |
| A person without Content permission | They do not see the screen. |

### Frequently asked questions
- **Can I convert a photo from here?** No: it is read-only; the sweep converts them on its own.
- **Why is “Weight of the sizes” greater than the originals'?** It adds the four versions of each photo; what one screen saves is just
  one of them, and that is what “Saving at 640” says.
- **Are the numbers live?** They are the database's when you open or refresh the screen.
- **Are private photos shown here?** No: only how many there are and how many are converted.
