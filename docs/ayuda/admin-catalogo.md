# Super Admin: Catálogo · Super Admin: Catalog

_Pantallas: ADM-CAT (`/admin/catalogo`), teléfono y escritorio. Para el equipo de To'Latino (y El Compa como copiloto del equipo). Versión: 18 nov
2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Categorías:** las 17, con su clave, subcategorías, negocios, cuántos son Pro, el tipo de transacción y la línea fija
  (la frase que nunca se suaviza, p. ej. «Nadie te garantiza un resultado»). El detalle de cada categoría muestra sus
  subcategorías con cuántos negocios tiene cada una («SIN OFERTA» si ninguno), las quitadas, las fusionadas y sus negocios.
  - **Agregar subcategoría:** nombre en español y, después de «/», en inglés. Toma el código siguiente
    (`NEG-<CAT>-<NN>`), entra al final del listado y Buscar la conoce.
  - **Editar:** cambia el nombre (español / inglés). El código no cambia; la página, la ficha, Buscar y «Publica tu negocio»
    la llaman distinto al momento.
  - **Mover:** la pasa a otra categoría. **El código no cambia** (los negocios, los sinónimos y la página la nombran por su
    código). Los negocios que la tienen conservan la etiqueta y su propia categoría. Sale al final de la categoría nueva y en
    «Publica tu negocio» de esa categoría.
  - **Fusionar:** junta una subcategoría con otra de su misma categoría. Los negocios de la primera pasan a la segunda (quien
    ya tenía las dos se queda con la segunda), los sinónimos que llevaban a la primera llevan a la segunda y su nombre queda
    como sinónimo (quien lo busque encuentra lo que ahora es la segunda). La primera queda en **FUSIONADAS**.
  - **Separar:** deshace una fusión: la subcategoría vuelve a los negocios que la tenían y los sinónimos vuelven como estaban.
  - **Quitar:** los negocios **pierden la etiqueta, no la ficha**: deja de salir en la página de la categoría, en tarjetas,
    ficha, mapa y Buscar. **Restaurar** la devuelve igual que estaba.
  - **Activa por ciudad:** un interruptor por ciudad. Apagada en una ciudad, la categoría no se ofrece ahí: no sale en
    Negocios, su página responde «no existe», Buscar no trae sus negocios ni la sugiere, el mapa no la muestra y nadie publica
    un negocio nuevo de esa categoría en esa ciudad. Las fichas de sus negocios se conservan y todo vuelve al encenderla.
  - **Publica tu negocio:** la **plantilla de horario** con la que empieza quien publica un negocio de esta categoría (cada
    día abierto o cerrado, abre y cierra de media en media hora; «Copiar a los días abiertos») y los **ejemplos** que salen
    dentro del campo del nombre del negocio y del nombre de un ítem propio. Iglesias no lleva plantilla: su horario sale de
    los cultos que el negocio elige. Los negocios que ya publicaron no cambian.
- **Sinónimos:** lo que el vecino escribe (izquierda) se busca también como lo de la derecha. Agregar (formato
  `palabra → sinónimo1, sinónimo2`, sin acentos), apagar y encender. Buscar los usa en menos de un minuto.
- **Búsquedas sin oferta:** lo que los vecinos buscaron y no existe en tus ciudades, contando a quienes pidieron
  «Avísame cuando haya» (30 días). Es la lista de reclutamiento; no crea semillas.
- **Familias de filtros:** por categoría, cada filtro con su interruptor y cuántos negocios lo tienen («RÁPIDO» = sale
  arriba en la página). Lo que apagas deja de salir al instante en la hoja de filtros y en los rápidos. «Encender todos».
- **Módulos y Free/Pro:** qué módulo puede usar cada categoría y qué ve Free y qué ve Pro.
  - **Cada módulo, activo por ciudad:** toca un módulo y apágalo en una ciudad. Todos sus negocios de esa ciudad lo tienen
    en pausa (la misma pausa que el equipo pone a un negocio en Negocios 360°: deja de ofrecerse en su página y el dueño ve
    el motivo en su panel), y los que publiquen después también. Al encenderlo se quita solo esa pausa: la que el equipo le
    puso a un negocio por su cuenta se queda. Se apagan por ciudad los 12 módulos, **Cotizaciones y Staff incluidos**:
    - **Cotizaciones apagado:** su página deja de ofrecer lo que el vecino pide para saber el precio (pre-estimado con fotos y «Pedir a hasta 3» en Auto y
      Hogar, «Pedir precio» de una mudanza en Transporte, el total por escrito en Fiestas) y el servidor no recibe pedidos nuevos («Este negocio no recibe
      solicitudes de precio en línea por ahora: llama al negocio.»). Lo ya pedido sigue su camino. Reservar un servicio con precio no cambia.
    - **Staff apagado:** su página deja de presentar al equipo (la pestaña, el riel de personas, «Ver equipo» y «Quién está detrás»). **Reservar un servicio
      no cambia**: elegir con quién sigue siendo de Citas (la política «elegir con quién» del negocio) y la hora sale igual.
    - Negocios 360° también pausa **Cotizaciones** (en Lo que vende, de Auto, Hogar, Transporte y Fiestas) y **Staff** (en Equipo) para **un solo negocio**.
  - **Límites Free y Pro:** ítems que se ven y se piden con Free (Menú, Servicios, Tienda), pedidos o citas en línea al mes
    con Free, fotos de la galería con Free y con Pro, y personas del equipo con Free. **Solo un Admin** los cambia (con
    motivo); son los mismos valores de Sistema › Configuración › Negocios. La página del negocio, los pedidos, el panel y
    «Publica tu negocio» los usan al momento.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Tu rol no edita el catálogo | Ves todo; no editas (permiso cat · editar). Los límites del plan, solo un Admin. |
| Cualquier edición | Antes de confirmar dice a cuántos negocios afecta («Afecta a N negocios…»), pide motivo y queda en el historial y en la auditoría. |
| Nombre repetido en la categoría | «Ya existe una subcategoría con ese nombre en esta categoría.» |
| Mover a una categoría que ya tiene ese nombre | «… ya tiene una subcategoría con ese nombre: fusiónalas en vez de moverla.» |
| Fusionar con una de otra categoría | No se puede: muévela antes y después fusiona. |
| Editar, mover o quitar una fusionada | Primero «Separar». |
| Agregar después de mover una | El código nuevo nunca repite el de la que se movió. |
| Apagar una categoría en una ciudad | Sus negocios conservan la ficha (se puede entrar por su enlace); no salen en listas ni en Buscar. Un borrador de «Publica tu negocio» de esa categoría vuelve a elegir categoría. |
| Cotizaciones apagado y alguien con la pantalla vieja abierta manda un pedido | El servidor lo rechaza con «Este negocio no recibe solicitudes de precio en línea por ahora: llama al negocio.»; en «Pedir a hasta 3» el negocio ya no sale entre los que se pueden elegir. |
| Staff apagado y la persona quiere reservar | Reserva igual: elige día y hora (y con quién, si el negocio lo deja elegir); solo la página deja de presentar al equipo. El dueño ve el motivo en su panel (Equipo). |
| Reanudar en Negocios 360° un módulo apagado en toda la ciudad | No se puede para un solo negocio: «se enciende en Catálogo › Módulos». |
| Un negocio se muda a una ciudad con un módulo apagado | Recibe la pausa de esa ciudad; la de su ciudad anterior se le quita. |
| Un límite fuera de su rango | «Entre X y Y.» (cada límite tiene su mínimo y su máximo). |
| Lo que trae el sistema | Las semillas nunca vuelven a encender lo que el equipo apagó ni pisan lo que agregó. |

Todo queda en el historial de cada pestaña y en la auditoría. Nada se borra.

## Preguntas frecuentes
**¿Una subcategoría nueva, renombrada o movida sale en «Publica tu negocio»?** Sí: sale al buscar «¿Qué haces?» y en
«Ver más» de su categoría; la quitada o fusionada deja de salir.

**¿Por qué Buscar tarda hasta un minuto?** Guarda los sinónimos y las subcategorías de cada ciudad en memoria 60 segundos
para responder rápido. La página de la categoría y Negocios cambian al momento.

**¿Cambiar la plantilla de horario cambia el horario de los negocios?** No. Es el horario con el que empieza quien publica;
cada negocio cambia el suyo en su panel.

**¿Bajar un límite de Free borra algo?** No. Lo que pasa del límite queda guardado y vuelve al subirlo o con Pro.

## English

### What it does
- **Categories:** all 17, with their key, subcategories, businesses, how many are Pro, the transaction type and the fixed line (the phrase that is never
  softened, e.g. «No one can guarantee you a result.»). Each category's detail shows its subcategories with how many businesses each has («NO LISTINGS» if
  none), the removed ones, the merged ones and their businesses.
  - **Add a subcategory:** name in Spanish and, after «/», in English. It takes the next code (`NEG-<CAT>-<NN>`), goes at the end of the list and Search knows it.
  - **Edit:** changes the name (Spanish / English). The code stays; the category page, the business page, Search and «List your business» use the new
    name right away.
  - **Move:** moves it to another category. **The code does not change** (businesses, synonyms and the page refer to it by its code). Businesses that have
    it keep the label and their own category. It shows at the end of the new category and in «List your business» for that category.
  - **Merge:** joins a subcategory into another one of the same category. The first one's businesses move to the second (a business that had both keeps
    the second), synonyms that led to the first lead to the second, and its name stays as a synonym (anyone searching it finds what is now the second).
    The first one goes to **MERGED**.
  - **Split:** undoes a merge: the subcategory goes back to the businesses that had it and the synonyms go back as they were.
  - **Remove:** the businesses **lose the label, not their page**: it stops showing on the category page, in cards, on the business page, on the map and in
    Search. **Restore** brings it back exactly as it was.
  - **On by city:** one switch per city. Off in a city, the category is not offered there: it does not show in Businesses, its page answers «not found»,
    Search neither brings its businesses nor suggests it, the map does not show it and no one can list a new business of that category in that city.
    Its businesses keep their pages and everything comes back when you turn it on.
  - **List your business:** the **hours template** someone listing a business in this category starts with (each day open or closed, opening and closing
    in half hours; «Copy to open days») and the **examples** shown inside the business name field and the own-item name field. Churches have no
    template: their hours come from the services the business picks. Businesses already listed do not change.
- **Synonyms:** what the neighbor types (left) is also searched as what is on the right. Add (format `word → synonym1, synonym2`, no accents), turn off and
  turn on. Search uses them in under a minute.
- **Searches without supply:** what neighbors searched for that does not exist in your cities, counting those who asked «Notify me» (30 days). It is the
  recruiting list; it does not create seeds.
- **Filter families:** per category, each filter with its switch and how many businesses have it («QUICK» = shows at the top of the page). What you turn off
  stops showing at once in the filter sheet and in the quick filters. «Turn all on».
- **Modules and Free/Pro:** which module each category can use and what Free sees and what Pro sees.
  - **Each module, on by city:** tap a module and turn it off in a city. All of that city's businesses have it paused (the same pause the team sets on a
    business in Business 360°: it stops being offered on its page and the owner sees the reason in their panel), and so will anyone who lists later. Turning
    it back on removes only that pause: a pause the team set on a business on its own stays. All 12 modules can be turned off by city, **Quotes and Staff included**:
    - **Quotes off:** its page stops offering what the neighbor asks for to learn the price (photo pre-estimate and «Ask up to 3» in Auto and Home, «Get a price» for
      a move in Transport, the written total in Parties) and the server takes no new requests («This business is not taking price requests online right now:
      call the business.»). What was already requested continues. Booking a priced service does not change.
    - **Staff off:** its page stops presenting the team (the tab, the people rail, «See team» and «Who is behind it»). **Booking a service does not change**:
      choosing who with stays part of Bookings (the business's «choose who with» policy) and the time comes out the same.
    - Business 360° also pauses **Quotes** (under What it sells, for Auto, Home, Transport and Parties) and **Staff** (under Team) for **a single business**.
  - **Free and Pro limits:** items shown and ordered on Free (Menu, Services, Shop), online orders or bookings a month on Free, gallery photos on Free and
    on Pro, and team members on Free. **Only an Admin** changes them (with a reason); they are the same values as System › Settings › Businesses. The
    business page, orders, the panel and «List your business» use them right away.

### What happens in each case
| Case | What happens |
|---|---|
| Your role can't edit the catalog | You see everything; you cannot edit (permission cat · edit). Plan limits: only an Admin. |
| Any edit | Before confirming it says how many businesses it affects («Affects N businesses…»), asks for a reason and stays in the history and the audit log. |
| Repeated name in the category | «A subcategory with that name already exists in this category.» |
| Moving to a category that already has that name | «… already has a subcategory with that name: merge them instead of moving it.» |
| Merging with one from another category | Not allowed: move it first, then merge. |
| Editing, moving or removing a merged one | «Split» first. |
| Adding after moving one | The new code never repeats the moved one's code. |
| Turning a category off in a city | Its businesses keep their page (reachable by its link); they do not show in lists or in Search. A «List your business» draft of that category goes back to choosing a category. |
| Quotes off and someone with the old screen open sends a request | The server rejects it with «This business is not taking price requests online right now: call the business.»; in «Ask up to 3» the business no longer shows among those you can pick. |
| Staff off and the person wants to book | They book as usual: choose day and time (and who with, if the business lets you choose); only the page stops presenting the team. The owner sees the reason in their panel (Team). |
| Resuming in Business 360° a module that is off in the whole city | Not possible for a single business: «turn it on in Catalog › Modules». |
| A business moves to a city with a module off | It gets that city's pause; its previous city's pause is removed. |
| A limit out of range | «Between X and Y.» (each limit has its minimum and maximum). |
| What the system brings | Seeds never turn back on what the team turned off and never overwrite what the team added. |

Everything is recorded in each tab's history and in the audit log. Nothing is deleted.

### FAQ
**Does a new, renamed or moved subcategory show in «List your business»?** Yes: it shows when searching «What do you do?» and under «See more» in its
category; a removed or merged one stops showing.

**Why does Search take up to a minute?** It keeps synonyms and each city's subcategories in memory for 60 seconds to answer fast. The category page and
Businesses change right away.

**Does changing the hours template change businesses' hours?** No. It is the schedule someone listing starts with; each business changes its own in its panel.

**Does lowering a Free limit delete anything?** No. What goes over the limit stays saved and comes back when you raise it or with Pro.
