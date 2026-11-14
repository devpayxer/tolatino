# Super Admin: Textos y páginas · Super Admin: Copy and pages

_Pantallas: **Super Admin › Textos y páginas** (`/admin/textos`) con sus cinco pestañas: **Ayuda**, **Páginas**, **Cadenas** (`/admin/textos/cadenas`), **Rótulos**
(`/admin/textos/rotulos`) y **Home por ciudad** (`/admin/textos/home`, con **Anuncios**). Ver: Textos y páginas · ver. Editar cadenas, rótulos, el Inicio y los
anuncios: Textos y páginas · editar. Marcar el inglés revisado, publicar páginas legales y encender el pie de la web: Textos y páginas · aprobar. Escritorio y
teléfono. Versión: 14 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Cadenas:** cada texto de la interfaz tiene una llave (`ÁREA-MÓDULO-PANTALLA.clave`, por ejemplo `APP-HOME.comunidad`). El código es la fuente; el despliegue
  las indexa. Aquí se ven en español e inglés lado a lado, con su largo máximo y el estado del inglés (**pendiente**, **traducido**, **revisado**). Lo que editas
  lo ve el vecino **al momento**, sin esperar un despliegue y sin cortar nada: si la base no respondiera, la pantalla sale con el texto del código.
  - **Editar** (con motivo): los dos idiomas, hasta el largo máximo de su lugar; las marcas `{n}` o `{c}` se conservan tal cual (el código las llena).
  - **Volver al código:** vuelve a salir el texto que trae el código; tu edición queda en el historial.
  - **Dejar en borrador / Publicar:** se ve el texto del código mientras tu edición espera; publicar la vuelve a mostrar.
  - **Inglés revisado:** alguien leyó el inglés y está bien.
  - **Historial:** cada versión con quién la hizo y por qué (la base lo escribe sola; no se puede cambiar).
  - **Líneas fijas** (el 911 de Salud, «Nadie te garantiza un resultado», la de cada categoría y las frases fijas del plan: exportar mis datos, borrar mi cuenta,
    mantenimiento, la doble verificación del equipo, la landing): llevan **candado**. No se editan desde aquí ni por la base; solo cambian con el código.
- **Rótulos:** el nombre y el nombre corto de cada categoría, en los dos idiomas. El nombre corto en español es la dirección de la categoría (`/c/…`): no se
  cambia. La línea fija de cada categoría se ve con su candado.
- **Home por ciudad:** por ciudad, el **aviso** del Inicio (ES/EN), los **bloques** (categorías, Hoy en el barrio, Abierto ahora, Esta semana, Comunidad,
  Publica tu negocio) encendidos o apagados y su orden, y los **Anuncios**.
  - **Anuncios:** un banner arriba del Inicio de la ciudad **dentro de sus fechas** (desde, hasta; hasta 31 días; hora de la ciudad), para todos o solo para vecinos
    con cuenta. Un anuncio no se edita ni se borra: se **retira** (con motivo) y se crea otro. Vencidos y retirados se quedan en la lista.
  - Un bloque apagado ni se consulta. Sin cambios, el Inicio sale exactamente como antes.
- **Páginas y Ayuda:** como antes (ver «Super Admin: las páginas legales»). Páginas suma el interruptor del **pie de la web**: encendido, Términos, Privacidad, Ayuda y
  Soporte salen al final del Inicio, la ficha del negocio y Buscar (siempre salen en las páginas legales). Nace apagado: encenderlo cambia las capturas aprobadas
  de la tubería, así que primero se revisan las capturas nuevas.
- **Idioma del admin:** **Español / English** arriba de cada pestaña. Esta sección sale completa en los dos idiomas; el resto del Super Admin sigue en español.

## Cómo se usa
1. **Corregir un texto:** Cadenas › busca la llave o el texto › **Editar** › escribe los dos idiomas › el motivo › **Guardar el texto**. Míralo en la web.
2. **Deshacer:** **Volver al código** (o **Dejar en borrador** si lo quieres guardar para después).
3. **Un aviso para una ciudad:** Home por ciudad › elige la ciudad › escribe el aviso o crea un anuncio con sus fechas › **Guardar**.
4. **Apagar un bloque o cambiar su orden:** Home por ciudad › el interruptor del bloque o **Subir / Bajar** › **Guardar el Inicio de la ciudad**.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Quitas o inventas una marca `{n}` | No se guarda: «conserva las marcas». La base también lo rechaza. |
| Te pasas del largo máximo | No se guarda (la pantalla ni deja escribir más). |
| Una línea fija | Sin botón de editar; la base rechaza el cambio. |
| Un despliegue trae un texto nuevo en el código | Lo que no editaste se actualiza; lo que editaste se respeta, salvo que ya no quepa o pierda una marca: entonces vuelve al código. |
| Un anuncio vence o lo retiras | Deja de salir solo; queda en la lista. |
| Un anuncio «solo vecinos» | Sale únicamente con sesión iniciada. |
| Una ciudad que todavía no abre | Su Inicio es «pronto»; lo que dejes aquí se verá cuando abra. |
| Tu rol no tiene Textos y páginas | No entra a ninguna pestaña. |

## Preguntas frecuentes
- **¿Por qué un texto se ve igual si lo edité?** Puede estar en borrador, o ser un texto que todavía no sale por el CMS (hoy salen el Inicio, la ficha del negocio, la galería,
  las categorías, Negocios y el menú de la web; el resto de la interfaz se mueve poco a poco). La lista de Cadenas es la de los que sí.
- **¿Se pierde una edición al desplegar?** No, salvo que ya no quepa en su lugar o pierda una marca.
- **¿Quién puede ver el historial?** Todo el equipo con Textos y páginas · ver.

## English
### What it does
- **Strings:** every interface text has a key (`AREA-MODULE-SCREEN.key`, for example `APP-HOME.comunidad`). The code is the source; the deploy indexes them. Here they
  show in Spanish and English side by side, with their maximum length and the English state (**pending**, **translated**, **reviewed**). What you edit neighbors
  see **right away**, without waiting for a deploy and without breaking anything: if the database did not answer, the screen shows the code's text.
  - **Edit** (with a reason): both languages, up to the maximum length of their spot; marks such as `{n}` or `{c}` are kept exactly (the code fills them in).
  - **Restore code text:** the text the code carries shows again; your edit stays in the history.
  - **Keep as draft / Publish:** the code's text shows while your edit waits; publishing shows it again.
  - **English reviewed:** someone read the English and it is fine.
  - **History:** every version with who made it and why (the database writes it on its own; it cannot be changed).
  - **Fixed lines** (the 911 line for Health, “No one can guarantee you a result”, each category's line and the plan's fixed sentences: export my data, delete my
    account, maintenance, team two-step sign-in, the landing): they carry a **lock**. They are not edited here or in the database; they only change with the code.
- **Labels:** each category's name and short name, in both languages. The short Spanish name is the category address (`/c/…`): it does not change. Each category's
  fixed line shows with its lock.
- **City Home:** per city, the Home **notice** (ES/EN), the **blocks** (categories, Today nearby, Open now, This week, Community, Publish your business) on or off
  and their order, and the **Announcements**.
  - **Announcements:** a banner at the top of the city Home **within its dates** (from, until; up to 31 days; city time), for everyone or only for neighbors with
    an account. An announcement is not edited or deleted: it is **retired** (with a reason) and another is created. Expired and retired ones stay in the list.
  - A block that is off is not even queried. Without changes the Home looks exactly as before.
- **Pages and Help:** as before (see “Super Admin: the legal pages”). Pages adds the **web footer** switch: when on, Terms, Privacy, Help and Support show at the end of
  Home, the business listing and Search (they always show on the legal pages). It starts off: turning it on changes the pipeline's approved screenshots, so the
  new ones are reviewed first.
- **Admin language:** **Español / English** above each tab. This section is fully in both languages; the rest of the Super Admin is still in Spanish.

### How to use it
1. **Fix a text:** Strings › search the key or the text › **Edit** › write both languages › the reason › **Save the text**. Look at it on the web.
2. **Undo:** **Restore code text** (or **Keep as draft** if you want to keep it for later).
3. **A notice for a city:** City Home › choose the city › write the notice or create an announcement with its dates › **Save**.
4. **Turn a block off or change its order:** City Home › the block's switch or **Up / Down** › **Save the city Home**.

### What happens in each case
| Case | What happens |
|---|---|
| You remove or invent a `{n}` mark | It is not saved: “keep the marks”. The database rejects it too. |
| You go over the maximum length | It is not saved (the screen does not even let you type more). |
| A fixed line | No edit button; the database rejects the change. |
| A deploy brings new text in the code | What you did not edit updates; what you edited is kept, unless it no longer fits or loses a mark: then it goes back to the code. |
| An announcement expires or you retire it | It stops showing on its own; it stays in the list. |
| A “neighbors only” announcement | It only shows when signed in. |
| A city that has not opened yet | Its Home is the “soon” screen; what you leave here shows when it opens. |
| Your role does not have Copy and pages | It cannot open any tab. |

### FAQ
- **Why does a text look the same after I edited it?** It may be a draft, or a text that does not go through the CMS yet (today Home, the business listing, the gallery,
  categories, Businesses and the web menu do; the rest of the interface moves over little by little). The Strings list shows the ones that do.
- **Is an edit lost on deploy?** No, unless it no longer fits its spot or loses a mark.
- **Who can see the history?** Everyone on the team with Copy and pages · view.
