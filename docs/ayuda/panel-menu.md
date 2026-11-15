# Panel: Lo que vendes › Menú · Dashboard: What you sell › Menu

_Pantallas: `/panel/{negocio}/vendes` y `/panel/{negocio}/vendes/menu` (Panel negocio v2 · DASH-MODULOS y Menú), teléfono y escritorio. Comida y
Bebidas. Lo que ve el cliente y cómo pide: `docs/ayuda/pedir-comida.md`. Versión: 6 nov 2026. Audiencia: negocio. Tema: panel._

## Qué hace
El dueño (o quien tenga acceso a «Lo que vendes») arma su carta:
- **Platos:** buscar, filtrar (todos, agotados, solo catálogo, para completar), interruptor de disponible en cada plato
  («Agotado hoy · vuelve mañana» o «Hasta que lo active»), ordenar dentro de la categoría y **Seleccionar** varios para
  agotar hoy, activar, mover de categoría, cambiar el precio (+5 %, +10 %, +$0.50, +$1, −$1; redondea a $0.25), dónde se
  pide (delivery y pickup, solo pickup, solo catálogo) o quitar.
- **Categorías:** en el orden del menú, mostrar u ocultar (sus platos no se borran), horario propio (p. ej. Almuerzo
  11 AM–4 PM), quitar (sus platos pasan a otra).
- **Opciones:** grupos reutilizables (Elige la carne, Tamaño, Agrégale): obligatorio u opcional, hasta cuántas, cuánto
  suma cada opción, en qué platos se usa, agotar una opción.
- **Inventario:** lo agotado ahora (platos y opciones), lo que se cuenta («cuenta del día» que vuelve cada mañana a las
  6 AM, o «cantidad en stock»), − / + y al llegar a 0 se agota solo, y el aviso de pocos.
- **Horarios:** pausar pedidos en línea (15 min, 30 min, 1 hora, resto del día), tiempo extra de cocina, último pedido
  antes de cerrar y lo que tiene horario propio.
- **Cada plato:** vista previa «Así se ve en tu menú», hasta 5 fotos (subir o elegir de la galería), nombre y
  descripción en español e inglés, categoría, precio, impuesto (6 % comida preparada o exento), opciones,
  disponibilidad, inventario, máximo por pedido, delivery / pickup, alergias (picante, vegetariano, sin gluten,
  pescado o mariscos, lácteos, huevo, maní o nueces), tiempo extra de cocina y «Fijar en Populares». Duplicar o quitar.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| «Agotado hoy» | Vuelve solo a las 6 AM del día siguiente. «Hasta el viernes»: el viernes a las 6 AM. «Hasta que lo actives»: hasta que lo actives. |
| Cuenta del día llega a 0 | Se agota solo; a las 6 AM vuelve a su número. |
| Quitar un plato o una categoría | No se borra: deja de salir. Los pedidos ya hechos conservan su copia. |
| To’Latino oculta un plato o pausa el Menú o los pedidos | El dueño ve el aviso con el motivo arriba del menú y la etiqueta «OCULTO POR TO’LATINO» en el plato. |
| Free | Se ven 5 platos en la página y hasta 10 pedidos en línea al mes. |
| Sin acceso a «Lo que vendes» | «Sin acceso a esta área». |
| El Menú tiene platos y está encendido | El módulo dice «EN TU PÁGINA»: la pestaña Menú sale en tu página (Pro) o 5 platos en el Resumen (Free). |
| Llega un pedido | Sale en **Hoy · Esperan tu respuesta** con el número, quién, cuántos artículos, total y «antes de las X». Lo aceptas o lo rechazas desde ahí (ver `panel-pedidos.md`); si nadie contesta en 10 min, queda SIN RESPUESTA y no se cobra nada. |
| Un pedido descuenta inventario | La cuenta del día o el stock bajan al enviar el pedido; en 0 el plato se agota solo. |

Cada cambio queda en la auditoría.

**El techo de Free** (los 10 pedidos, citas o solicitudes en línea al mes) es el de hoy: To'Latino lo fija en su Configuración y la pantalla siempre dice el que vale en ese momento.

## Preguntas frecuentes
**¿Cambiar un precio cambia los pedidos que ya tengo?** No. Cada pedido guarda el precio con el que se hizo.

**¿Me llega el SMS de «quedan pocos»?** La preferencia queda guardada; el SMS llega con las notificaciones.

**¿Hay un botón para traducir el menú?** No: escribe el inglés tú o déjalo vacío (en inglés se ve el español).

## English

### What it does
The owner (or whoever has access to «What you sell») builds their menu:
- **Items:** search, filter (all, sold out, catalog only, to complete), an available switch on each item («Sold out today · back tomorrow» or
  «Until I turn it on»), reorder within the category, and **Select** several to sell out today, turn on, move to a category, change the price (+5 %,
  +10 %, +$0.50, +$1, −$1; rounds to $0.25), where it is ordered (delivery and pickup, pickup only, catalog only) or remove.
- **Categories:** in menu order, show or hide (their items are not deleted), their own hours (e.g. Lunch 11 AM–4 PM), remove (their items move to
  another).
- **Options:** reusable groups (Choose the meat, Size, Add-ons): required or optional, up to how many, how much each option adds, which items use
  it, sell out an option.
- **Stock:** what is sold out now (items and options), what is counted («daily count» that comes back every morning at 6 AM, or «stock quantity»),
  − / + and at 0 it sells out by itself, and the low-stock notice.
- **Hours:** pause online orders (15 min, 30 min, 1 hour, rest of the day), extra kitchen time, last order before closing and whatever has its own
  hours.
- **Each item:** a «This is how it looks on your menu» preview, up to 5 photos (upload or pick from the gallery), name and description in Spanish
  and English, category, price, tax (6 % prepared food or exempt), options, availability, stock, maximum per order, delivery / pickup, allergens
  (spicy, vegetarian, gluten-free, fish or shellfish, dairy, egg, peanuts or tree nuts), extra kitchen time and «Pin to Popular». Duplicate or
  remove.

### What happens in each case
| Case | What happens |
|---|---|
| «Sold out today» | It comes back by itself at 6 AM the next day. «Until Friday»: Friday at 6 AM. «Until you turn it on»: until you turn it on. |
| The daily count reaches 0 | It sells out by itself; at 6 AM it goes back to its number. |
| Remove an item or a category | It isn't deleted: it stops showing. Orders already placed keep their copy. |
| To'Latino hides an item or pauses the Menu or orders | The owner sees the notice with the reason above the menu and the label «HIDDEN BY TO'LATINO» on the item. |
| Free | 5 items show on the page and up to 10 online orders a month. |
| No access to «What you sell» | «No access to this area». |
| The Menu has items and is on | The module says «ON YOUR PAGE»: the Menu tab shows on your page (Pro) or 5 items in the Overview (Free). |
| An order arrives | It shows in **Today · Awaiting you** with the number, who, how many items, total and «before X». You accept or decline it from there (see `panel-pedidos.md`); if nobody answers in 10 min, it becomes NO ANSWER and nothing is charged. |
| An order deducts stock | The daily count or the stock goes down when the order is sent; at 0 the item sells out by itself. |

Every change is recorded in the audit.

**The Free ceiling** (the 10 orders, appointments or requests online a month) is today's: To'Latino sets it in its Settings and the screen always
shows the one in force at that moment.

### FAQ
**Does changing a price change the orders I already have?** No. Each order keeps the price it was made with.

**Do I get the «running low» SMS?** The preference is saved; the SMS arrives with notifications.

**Is there a button to translate the menu?** No: write the English yourself or leave it empty (in English the Spanish shows).
