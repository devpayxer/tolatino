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

Each city has its "To'Latino {City}" account, written by the team (Admin and City manager roles, in their cities): question of
the week, poll of the week and notices. It shows with the To'Latino seal and "Official account", and its pinned post also shows on
Home › Community. It is not a person: no phone or user row, no points, never on the leaderboard, cannot be followed or messaged.
Write it under Content › Official account: type, text and language (same rules as neighbors), post now or schedule at a city-local
time up to 30 days ahead, and pin for 1, 3 or 7 days from when it goes out (one pinned per city: the previous one is unpinned).
Pin/unpin asks for a reason; everything is audited.
