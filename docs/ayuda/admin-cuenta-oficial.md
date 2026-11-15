# Super Admin: Cuenta oficial · Super Admin: Official account

_Pantallas: **Super Admin › Contenido › Cuenta oficial** (`/admin/contenido?tab=off`). Escritorio y teléfono. Escriben **Admin** y **Ciudad manager**
(en sus ciudades); los demás roles con acceso a Contenido solo ven. Versión: 7 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué es
Cada ciudad tiene su cuenta **«To'Latino {Ciudad}»** (Hazleton, Allentown, Wilkes-Barre, Scranton, Reading). La escribe el equipo:
**pregunta de la semana**, **encuesta de la semana** y **avisos** de la ciudad. Sale en el muro con el **sello de To'Latino** y la
marca «Cuenta oficial», y lo que tiene arriba sale también en **Inicio › Comunidad** (para todos, con sus cifras reales).

**No es una persona:** no tiene teléfono ni fila de usuario, no gana puntos, no sale en la Tabla del Barrio, nadie la sigue ni le
escribe, y tocar su nombre no abre un perfil (guardián `oficialNoEsPersona`). Queda guardado quién del equipo escribió cada una.

## Cómo se usa
1. **Nueva publicación** → si tienes varias ciudades, elige la ciudad.
2. **Qué es:** Pregunta de la semana (con tema), Encuesta de la semana (2 a 4 opciones; dura 1, 3 o 7 días) o Aviso.
3. **El texto** (10 a 1,000 letras) y su **idioma**. Las mismas reglas que los vecinos: nada de teléfonos ni datos de nadie.
4. **Cuándo sale:** **Ahora** o **Programar** con fecha y hora **de la ciudad** («2026-11-09 09:00»), hasta 30 días adelante.
   Sale sola a esa hora; antes no la ve nadie. En la lista dice **PROGRAMADA** y cuándo sale.
5. **Fijada arriba del muro:** No · 1 · 3 · 7 días, contados desde que sale. **Una a la vez por ciudad:** al salir, la anterior
   se desfija sola.
6. **Publicar / Programar como To'Latino {Ciudad}**.
- En la lista: cada publicación con su tipo, cuándo salió (o sale), votos, comentarios, votos de la encuesta, hasta cuándo está
  fijada y quién la escribió. **Fijar 7 días** / **Desfijar** piden motivo. **Ver** la abre como la ve un vecino.
- Ocultarla (por ejemplo, un error) se hace desde **Contenido › Publicaciones** con motivo, como cualquier publicación.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Programas una fijada para el lunes 9 AM y hay otra fijada | El lunes a las 9 sale arriba; la otra deja de estar fijada |
| La hora para programar ya pasó | No se guarda: «La hora para programar ya pasó.» |
| Un moderador intenta escribir | No puede: solo Admin y Ciudad manager |
| Ciudad manager de Hazleton intenta escribir para Reading | No puede: no es su ciudad |
| El texto tiene un teléfono | No se guarda: «No publiques teléfonos ni datos de nadie.» |

Todo queda en la auditoría: `com.oficial.publicar`, `com.oficial.programar`, `com.oficial.fijar`, `com.oficial.desfijar`.

## Preguntas
- **¿La cuenta oficial compite en votos?** No. Se fija arriba y se ve como cuenta oficial; el orden del resto lo ponen los votos.
- **¿Puede recomendar un negocio?** No. La cuenta oficial no recomienda negocios.

## English

### What it is
Each city has its **"To'Latino {City}"** account (Hazleton, Allentown, Wilkes-Barre, Scranton, Reading). The team writes it: **question of the
week**, **poll of the week** and city **notices**. It shows on the wall with the **To'Latino seal** and the "Official account" mark, and
whatever it has pinned also shows on **Home › Community** (for everyone, with its real numbers).

**It is not a person:** it has no phone and no user row, it earns no points, it is not on the Neighborhood Board, nobody follows it or
messages it, and tapping its name does not open a profile (guardian `oficialNoEsPersona`). The system records which team member wrote each post.

### How to use it
1. **New post** → if you have several cities, pick the city.
2. **What it is:** Question of the week (with a topic), Poll of the week (2 to 4 options; lasts 1, 3 or 7 days) or Notice.
3. **The text** (10 to 1,000 characters) and its **language**. The same rules as neighbors: no phone numbers and no one's personal data.
4. **When it goes out:** **Now** or **Schedule** with a date and time **in the city's time** ("2026-11-09 09:00"), up to 30 days ahead.
   It goes out by itself at that time; before then nobody sees it. In the list it says **SCHEDULED** and when it goes out.
5. **Pinned to the top of the wall:** No · 1 · 3 · 7 days, counted from when it goes out. **One at a time per city:** when a new one goes out,
   the previous one is unpinned by itself.
6. **Publish / Schedule as To'Latino {City}**.
- In the list: each post with its type, when it went out (or goes out), votes, comments, poll votes, how long it stays pinned and who wrote
  it. **Pin 7 days** / **Unpin** ask for a reason. **View** opens it the way a neighbor sees it.
- Hiding a post (for example, a mistake) is done from **Content › Posts** with a reason, like any post.

### What happens in each case
| Case | What happens |
|---|---|
| You schedule a pinned post for Monday 9 AM and another one is pinned | On Monday at 9 it goes to the top; the other one stops being pinned |
| The time to schedule has already passed | It is not saved: "The time to schedule has already passed." |
| A moderator tries to write | They cannot: only Admin and City manager |
| A Hazleton City manager tries to write for Reading | They cannot: it is not their city |
| The text has a phone number | It is not saved: "Do not post phone numbers or anyone's personal data." |

Everything is recorded in the audit log: `com.oficial.publicar`, `com.oficial.programar`, `com.oficial.fijar`, `com.oficial.desfijar`.

### FAQ
- **Does the official account compete for votes?** No. It is pinned to the top and shown as an official account; the order of the rest is set by votes.
- **Can it recommend a business?** No. The official account does not recommend businesses.
