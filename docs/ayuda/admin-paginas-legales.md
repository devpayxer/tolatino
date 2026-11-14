# Super Admin: las páginas legales · Super Admin: the legal pages

_Pantallas: **Super Admin › Textos y páginas › Páginas** (`/admin/textos/paginas`; una página: `?k={clave}&j={jurisdicción}`; diferencias:
`&dif={versión}&con={otra}`). Ver: Textos y páginas · ver. Marcar la revisión del abogado: Textos y páginas · editar. Publicar y retirar:
Textos y páginas · aprobar. Escritorio y teléfono. Versión: 14 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **El repo es la fuente.** Los textos viven en `docs/legal/{jurisdicción}/{clave}.{es,en}.md` (us = general; us-pa = lo que aplica en
  Pennsylvania). Cada despliegue los lee: un archivo que cambió es una **versión nueva en borrador**; el texto de una versión nunca cambia.
  Aquí no se escribe texto: se corrige en el repo.
- **Cifras arriba:** versiones publicadas, borradores, revisadas por el abogado sin publicar y aceptaciones (solo cuántas, nunca quiénes).
- **La lista:** cada página con su jurisdicción, la última versión y su estado, la vigente y desde cuándo, si pide aceptar otra vez, quién la
  revisó y cuántas aceptaciones tiene. **Versiones** abre una; **Ver** abre la página pública.
- **Una página:** sus versiones (estado, texto del, sha, aceptaciones, quién la revisó y quién la anotó, quién la publicó y por qué, si pide
  aceptar otra vez, si se retiró), **Diferencias** (renglón por renglón, en español o en inglés) y el **historial** (desplegada, revisada,
  publicada, retirada, con quién y el motivo).
- **Acciones, siempre con motivo:**
  - **Marcar revisada:** el despacho y la fecha de la revisión del abogado. Una vez por versión; no se cambia después.
  - **Publicar:** la versión pasa a ser la que se ve. En Términos y Privacidad se elige si **pide aceptar otra vez**: quien entre después ve la
    hoja «Aceptar los términos nuevos» en su pantalla de inicio (nunca encima de una operación en curso).
  - **Retirar:** deja de verse; si era la publicada, vuelve a verse la publicada anterior (o el aviso «Esta página se está revisando»).

## Cómo se usa
1. Cuando el abogado revisa un texto, el cambio entra al repo y el despliegue crea la versión nueva en borrador.
2. Abre la página, toca **Diferencias con la publicada** y comprueba el cambio.
3. **Marcar revisada** con el despacho y la fecha.
4. **Publicar** con el motivo; para Términos o Privacidad, decide si pide aceptar otra vez (cambios importantes: sí).

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Publicar sin la revisión del abogado en producción | No se puede: la pantalla lo dice y la base lo rechaza. |
| Publicar un borrador en el sandbox | Se puede, para probar. Lo que se publica en el sandbox nunca pasa a producción (solo viaja el código). |
| Nada publicado todavía | En el sandbox se ve el último borrador, marcado BORRADOR. En producción, «Esta página se está revisando». |
| Hay una versión más nueva ya publicada | No se publica una más vieja. |
| Una persona acepta dos veces la misma versión | Cuenta una vez. |
| El archivo deja de estar en el repo | Sus borradores quedan retirados; lo publicado sigue hasta que alguien lo retire. |

## Preguntas frecuentes
- **¿Por qué no puedo corregir una coma aquí?** Porque el texto legal tiene una sola fuente (el repo) y cada versión queda fija: así se sabe qué
  aceptó cada persona.
- **¿Puedo ver quién aceptó?** No desde aquí: solo cuántas aceptaciones tiene cada versión. Lo que aceptó una persona lo ve ella en Mi cuenta y
  el equipo en Usuarios 360° › Privacidad.
- **¿Qué decide qué adenda se ve?** El estado de la persona (el de su ciudad); hoy todas las ciudades están en Pennsylvania.

## English
### What it does
- **The repo is the source.** Texts live in `docs/legal/{jurisdiction}/{key}.{es,en}.md` (us = general; us-pa = what applies in Pennsylvania).
  Every deploy reads them: a file that changed becomes a **new draft version**; a version's text never changes. No text is written here: it is
  fixed in the repo.
- **Numbers on top:** published versions, drafts, versions reviewed by the lawyer but not published, and acceptances (only how many, never who).
- **The list:** each page with its jurisdiction, the latest version and its state, the effective one and since when, whether it asks to accept
  again, who reviewed it and how many acceptances it has. **Versions** opens one; **View** opens the public page.
- **One page:** its versions (state, text date, sha, acceptances, who reviewed it and who recorded it, who published it and why, whether it asks
  to accept again, whether it was retired), **Differences** (line by line, in Spanish or English) and the **history** (deployed, reviewed,
  published, retired, with who and the reason).
- **Actions, always with a reason:**
  - **Mark reviewed:** the firm and the date of the lawyer's review. Once per version; it cannot be changed later.
  - **Publish:** the version becomes the one people see. For Terms and Privacy you choose whether it **asks to accept again**: whoever signs in
    afterwards sees the «Accept the new terms» sheet on their home screen (never on top of something in progress).
  - **Retire:** it stops showing; if it was the published one, the previous published one shows again (or the «This page is being reviewed»
    notice).

### How to use it
1. When the lawyer reviews a text, the change goes into the repo and the deploy creates the new draft version.
2. Open the page, tap **Differences with the published one** and check the change.
3. **Mark reviewed** with the firm and the date.
4. **Publish** with the reason; for Terms or Privacy, decide whether it asks to accept again (important changes: yes).

### What happens in each case
| Case | What happens |
|---|---|
| Publishing without the lawyer's review in production | Not possible: the screen says so and the database rejects it. |
| Publishing a draft in the sandbox | Allowed, for testing. What is published in the sandbox never goes to production (only code travels). |
| Nothing published yet | In the sandbox the latest draft shows, marked DRAFT. In production, «This page is being reviewed». |
| A newer version is already published | An older one cannot be published. |
| A person accepts the same version twice | It counts once. |
| The file is no longer in the repo | Its drafts are retired; what is published stays until someone retires it. |

### FAQ
- **Why can't I fix a comma here?** Because legal text has a single source (the repo) and each version stays fixed: that is how we know what each
  person accepted.
- **Can I see who accepted?** Not from here: only how many acceptances each version has. A person sees what they accepted in My account, and the
  team in Users 360° › Privacy.
- **What decides which addendum shows?** The person's state (that of their city); today every city is in Pennsylvania.
