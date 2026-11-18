# Super Admin: Textos y páginas · Super Admin: Copy and pages

_Pantallas: **Super Admin › Textos y páginas** (`/admin/textos`) con sus cinco pestañas: **Ayuda**, **Páginas**, **Cadenas** (`/admin/textos/cadenas`), **Rótulos**
(`/admin/textos/rotulos`) y **Home por ciudad** (`/admin/textos/home`, con **Anuncios**). Ver: Textos y páginas · ver. Editar cadenas, rótulos, el Inicio y los
anuncios: Textos y páginas · editar. Marcar el inglés revisado, publicar páginas legales y encender el pie de la web: Textos y páginas · aprobar. Escritorio y
teléfono. Versión: 18 nov 2026. Audiencia: equipo. Tema: equipo._

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
  - **Los textos de todas las pantallas** (desde el 18 nov): además de las cadenas con llave, Cadenas trae **cada texto escrito en las pantallas** (unos diez mil:
    la ficha, el panel del negocio, Mi cuenta, la Comunidad, Eventos, la Puerta, el Repartidor…). Su llave termina en `.e2-` y un código (por ejemplo
    `NEG-PANEL-MENU.e2-3fa9c01b2d4e`); la parte de adelante dice la pantalla donde más se usa. **Un mismo texto es una sola cadena en todos los lugares donde
    aparece**: «Guardar / Save» se edita una vez y cambia en todas las pantallas que lo dicen. Cada fila dice **en cuántos lugares** está; al editar uno que está
    en varios, la pantalla lo avisa con los archivos antes de guardar; el **Historial** lista todos los lugares.
  - Solo se editan los textos **fijos**. Un texto que se arma con un dato (un nombre, una cantidad, una fecha) sigue saliendo del código.
  - También llevan candado los textos de las pantallas que dicen el 911, «Nadie te garantiza un resultado», que El Compa es una IA, que contienen una línea
    fija, o que una revisión automática exige palabra por palabra (por ejemplo «Hablar con una persona»).
  - **Pantalla:** se recorre por niveles: **APP** (lo del vecino), **NEG** (el panel del negocio), **PUERTA**, **REP** (el repartidor), **LIB** (textos que
    comparten varias pantallas), **WEB**, **FIJAS**… Al elegir una aparecen las de adentro (APP › APP-FICHA › APP-FICHA-MERCADO); **← arriba** vuelve.
  - La búsqueda encuentra un texto por lo que dice ahora **o** por lo que dice el código.
- **Rótulos:** el nombre y el nombre corto de cada categoría, en los dos idiomas. El nombre corto en español es la dirección de la categoría (`/c/…`): no se
  cambia. La línea fija de cada categoría se ve con su candado.
- **Home por ciudad:** por ciudad, el **aviso** del Inicio (ES/EN), los **bloques** (categorías, Hoy en el barrio, Abierto ahora, Esta semana, Comunidad,
  Publica tu negocio) encendidos o apagados y su orden, y los **Anuncios**.
  - **Anuncios:** un banner arriba del Inicio de la ciudad **dentro de sus fechas** (desde, hasta; hasta 31 días; hora de la ciudad), para todos o solo para vecinos
    con cuenta. Con **Negocios** sale en **Hoy del panel** de los negocios de la ciudad (no en el Inicio). Un anuncio no se edita ni se borra: se **retira** (con motivo) y se crea otro. Vencidos y retirados se quedan en la lista.
  - Un bloque apagado ni se consulta. Sin cambios, el Inicio sale exactamente como antes.
- **Ayuda · Editar:** cada artículo de la ayuda se abre por **secciones**, en español o en inglés. **Editar** una sección (con motivo) la cambia **al instante**
  en el Centro de ayuda y para El Compa. Se escribe texto, listas (- …) y **negritas**; no entran encabezados (#), HTML ni lenguaje interno (fases, bloques).
  La sección queda **EDITADA** con quién, cuándo y por qué, y **Deshacer** (con motivo) la vuelve al texto de antes de esa edición. **El repo sigue siendo la
  fuente:** mientras el archivo de la ayuda no cambie, el despliegue no pisa lo editado; cuando cambia, manda el repo y la edición se cierra («Pasó al repo» si
  el archivo ya dice lo editado, o «Lo reemplazó el repo»). Lo editado de vecinos, negocios y porteros se pasa al repo en el siguiente cambio del equipo
  técnico; lo del equipo (artículos admin-* y secciones solo-equipo) nunca sale de la base. Quien solo puede ver Textos y páginas ve las secciones sin editar.
- **Páginas y Ayuda:** como antes (ver «Super Admin: las páginas legales»). Páginas suma el interruptor del **pie de la web**: encendido, Términos, Privacidad, Ayuda y
  Soporte salen al final del Inicio, la ficha del negocio y Buscar (siempre salen en las páginas legales). Nace apagado: encenderlo cambia las capturas aprobadas
  de la tubería, así que primero se revisan las capturas nuevas.
- **Idioma del admin:** **Español / English** arriba de cada pestaña. Esta sección sale completa en los dos idiomas.

## Cómo se usa
1. **Corregir un texto:** Cadenas › busca la llave o el texto › **Editar** › escribe los dos idiomas › el motivo › **Guardar el texto**. Míralo en la web.
   Si la fila dice «en N lugares», el cambio sale en todos: revisa la lista antes de guardar.
2. **Deshacer:** **Volver al código** (o **Dejar en borrador** si lo quieres guardar para después).
3. **Un aviso para una ciudad:** Home por ciudad › elige la ciudad › escribe el aviso o crea un anuncio con sus fechas › **Guardar**.
4. **Apagar un bloque o cambiar su orden:** Home por ciudad › el interruptor del bloque o **Subir / Bajar** › **Guardar el Inicio de la ciudad**.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Quitas o inventas una marca `{n}` | No se guarda: «conserva las marcas». La base también lo rechaza. |
| Te pasas del largo máximo | No se guarda (la pantalla ni deja escribir más). |
| Una línea fija | Sin botón de editar; la base rechaza el cambio. |
| Editas un texto de las pantallas que está en varios lugares | Cambia en todos a la vez (teléfono y computadora, español e inglés); la pantalla avisa en cuántos antes de guardar. |
| El código cambia un texto de las pantallas que editaste | Es otro texto: sale el nuevo del código y tu edición deja de verse (queda en la base y en el historial, sin borrarse; ya no se lista). |
| Un texto que se arma con un dato (un nombre, una fecha) | No está en Cadenas: sigue saliendo del código. |
| Un despliegue trae un texto nuevo en el código | Lo que no editaste se actualiza; lo que editaste se respeta, salvo que ya no quepa o pierda una marca: entonces vuelve al código. |
| Un anuncio vence o lo retiras | Deja de salir solo; queda en la lista. |
| Un anuncio «solo vecinos» | Sale únicamente con sesión iniciada. |
| Una ciudad que todavía no abre | Su Inicio es «pronto»; lo que dejes aquí se verá cuando abra. |
| Tu rol no tiene Textos y páginas | No entra a ninguna pestaña. |

## Preguntas frecuentes
- **¿Por qué un texto se ve igual si lo edité?** Puede estar en borrador, o ser un texto que se arma con un dato (no se edita). Desde el 18 nov **todas las
  pantallas** leen lo editado: la lista de Cadenas es la de lo que se puede editar. Las páginas que funcionan sin señal (las islas guardadas en el teléfono)
  salen con el texto del código hasta el siguiente despliegue.
- **¿Por qué «Guardar» cambió en otra pantalla?** Porque es el mismo texto: una cadena de las pantallas es una sola en todos sus lugares (la fila dice cuántos).
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
  - **The text of every screen** (since Nov 18): besides the keyed strings, Strings brings **every text written in the screens** (about ten thousand: the
    listing, the business dashboard, My account, Community, Events, the Door, the Courier…). Their key ends in `.e2-` and a code (for example
    `NEG-PANEL-MENU.e2-3fa9c01b2d4e`); the front part says the screen where it is used most. **The same text is a single string in every place it appears**:
    “Guardar / Save” is edited once and changes on every screen that says it. Each row says **in how many places** it is; when you edit one that is in several,
    the screen warns you with the files before saving; the **History** lists every place.
  - Only **fixed** texts can be edited. A text built with a piece of data (a name, an amount, a date) keeps coming from the code.
  - Screen texts that mention 911, “No one can guarantee you a result”, that El Compa is an AI, that contain a fixed line, or that an automatic check requires
    word for word (for example “Talk to a person”) are locked too.
  - **Screen:** browse by levels: **APP** (neighbors), **NEG** (business dashboard), **PUERTA** (the Door), **REP** (courier), **LIB** (text shared by several
    screens), **WEB**, **FIJAS**… Choosing one shows the ones inside it (APP › APP-FICHA › APP-FICHA-MERCADO); **← up** goes back.
  - Search finds a text by what it says now **or** by what the code says.
- **Labels:** each category's name and short name, in both languages. The short Spanish name is the category address (`/c/…`): it does not change. Each category's
  fixed line shows with its lock.
- **City Home:** per city, the Home **notice** (ES/EN), the **blocks** (categories, Today nearby, Open now, This week, Community, Publish your business) on or off
  and their order, and the **Announcements**.
  - **Announcements:** a banner at the top of the city Home **within its dates** (from, until; up to 31 days; city time), for everyone or only for neighbors with
    an account. With **Businesses** it shows on **Today in the dashboard** of the city's businesses (not on the Home). An announcement is not edited or deleted: it is **retired** (with a reason) and another is created. Expired and retired ones stay in the list.
  - A block that is off is not even queried. Without changes the Home looks exactly as before.
- **Help · Edit:** each help article opens by **sections**, in Spanish or English. **Edit** a section (with a reason) and it changes **right away** in the Help
  Center and for El Compa. You can write text, lists (- …) and **bold**; headings (#), HTML and internal language (phases, blocks) are not accepted. The
  section shows **EDITED** with who, when and why, and **Undo** (with a reason) puts it back to its text before that edit. **The repo is still the source:**
  while the help file does not change, a deploy does not overwrite the edit; when it changes, the repo wins and the edit closes («Moved to the repo» if the
  file already says the edited text, or «Replaced by the repo or another edit»). Edits for neighbors, businesses and doormen move to the repo in the
  technical team's next change; team content (admin-* articles and team-only sections) never leaves the database. Someone who can only view Copy and pages
  sees the sections without editing.
- **Pages and Help:** as before (see “Super Admin: the legal pages”). Pages adds the **web footer** switch: when on, Terms, Privacy, Help and Support show at the end of
  Home, the business listing and Search (they always show on the legal pages). It starts off: turning it on changes the pipeline's approved screenshots, so the
  new ones are reviewed first.
- **Admin language:** **Español / English** above each tab. This section is fully in both languages.

### How to use it
1. **Fix a text:** Strings › search the key or the text › **Edit** › write both languages › the reason › **Save the text**. Look at it on the web.
   If the row says “in N places”, the change shows in all of them: check the list before saving.
2. **Undo:** **Restore code text** (or **Keep as draft** if you want to keep it for later).
3. **A notice for a city:** City Home › choose the city › write the notice or create an announcement with its dates › **Save**.
4. **Turn a block off or change its order:** City Home › the block's switch or **Up / Down** › **Save the city Home**.

### What happens in each case
| Case | What happens |
|---|---|
| You remove or invent a `{n}` mark | It is not saved: “keep the marks”. The database rejects it too. |
| You go over the maximum length | It is not saved (the screen does not even let you type more). |
| A fixed line | No edit button; the database rejects the change. |
| You edit a screen text that is in several places | It changes in all of them at once (phone and computer, Spanish and English); the screen says how many before saving. |
| The code changes a screen text you edited | It is a different text: the new code text shows and your edit stops showing (it stays in the database and the history, never deleted; it is no longer listed). |
| A text built with a piece of data (a name, a date) | It is not in Strings: it keeps coming from the code. |
| A deploy brings new text in the code | What you did not edit updates; what you edited is kept, unless it no longer fits or loses a mark: then it goes back to the code. |
| An announcement expires or you retire it | It stops showing on its own; it stays in the list. |
| A “neighbors only” announcement | It only shows when signed in. |
| A city that has not opened yet | Its Home is the “soon” screen; what you leave here shows when it opens. |
| Your role does not have Copy and pages | It cannot open any tab. |

### FAQ
- **Why does a text look the same after I edited it?** It may be a draft, or a text built with a piece of data (not editable). Since Nov 18 **every screen**
  reads the edits: the Strings list is what can be edited. Pages that work offline (the islands saved on the phone) show the code's text until the next deploy.
- **Why did “Save” change on another screen?** Because it is the same text: a screen string is one string in all its places (the row says how many).
- **Is an edit lost on deploy?** No, unless it no longer fits its spot or loses a mark.
- **Who can see the history?** Everyone on the team with Copy and pages · view.
