# Panel · Lo que vendes › Menú · Dashboard · What you sell › Menu

_Pantallas: `/panel/{negocio}/vendes` y `/panel/{negocio}/vendes/menu` (Panel negocio v2 · DASH-MODULOS y Menú),
teléfono y escritorio. Versión: Fase 2 · bloque 2b (6 nov 2026). Comida y Bebidas. Lo que ve el cliente y cómo pide:
`docs/ayuda/pedir-comida.md`._

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
| Llega un pedido | Sale en **Hoy · Esperan tu respuesta** con el número, quién, cuántos artículos, total y «antes de las X». Aceptar y rechazar llegan en el bloque 2c; si nadie contesta en 10 min, queda SIN RESPUESTA y no se cobra nada. |
| Un pedido descuenta inventario | La cuenta del día o el stock bajan al enviar el pedido; en 0 el plato se agota solo. |

Cada cambio queda en la auditoría.

## Preguntas frecuentes
**¿Cambiar un precio cambia los pedidos que ya tengo?** No. Cada pedido guarda el precio con el que se hizo.

**¿Me llega el SMS de «quedan pocos»?** La preferencia queda guardada; el SMS llega con las notificaciones.

**¿Y la traducción con El Compa?** Llega con El Compa (Fase 7). Mientras, escribe el inglés o déjalo vacío (se ve el
español).

---

## English
What you sell › Menu lets the owner build the menu: items (search, filters, available switch with "sold out today" or
"until I turn it on", reorder, bulk select to sell out, turn on, move, change price, set delivery/pickup or remove),
categories (order, show/hide, own hours, remove moving items to another), option groups (required or optional, how
many, price add-ons, which items use them, sold-out options), stock (sold out now, daily counts that reset at 6 AM or
stock quantities, −/+ and auto sold out at 0, low-stock alert preference) and hours (pause online orders, busy extra
time, last online order). Each item has a live preview, up to 5 photos, Spanish and English name and description,
category, price, tax (6% prepared food or exempt), options, availability, stock, max per order, delivery/pickup,
allergens, extra kitchen time and "Pin to Popular". Nothing is deleted; past orders keep their copy; To'Latino can
hide an item or pause the Menu or online orders with a reason the owner sees. The menu tab on the business page and
ordering are described in pedir-comida.md. New orders show in Today › Awaiting your reply (accept and decline arrive in
block 2c) and decrease daily counts or stock when sent.
