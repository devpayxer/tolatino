# Super Admin: Catálogo · Super Admin: Catalog

_Pantallas: ADM-CAT (`/admin/catalogo`), teléfono y escritorio. Para el equipo de To'Latino (y El Compa como copiloto del equipo). Versión: 6 nov
2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Categorías:** las 17, con su clave, subcategorías, negocios, cuántos son Pro, el tipo de transacción y la línea fija
  (la frase que nunca se suaviza, p. ej. «Nadie te garantiza un resultado»). El detalle de cada categoría muestra sus
  subcategorías con cuántos negocios tiene cada una («SIN OFERTA» si ninguno), las quitadas y sus negocios.
  - **Agregar subcategoría:** nombre en español y, después de «/», en inglés. Toma el código siguiente
    (`NEG-<CAT>-<NN>`), entra al final del listado y Buscar la conoce.
  - **Quitar:** pide motivo y dice a cuántos negocios afecta. Los negocios **pierden la etiqueta, no la ficha**: deja de
    salir en la página de la categoría, en tarjetas, ficha, mapa y Buscar. **Restaurar** la devuelve igual que estaba.
- **Sinónimos:** lo que el vecino escribe (izquierda) se busca también como lo de la derecha. Agregar (formato
  `palabra → sinónimo1, sinónimo2`, sin acentos), apagar y encender. Buscar los usa en menos de un minuto.
- **Búsquedas sin oferta:** lo que los vecinos buscaron y no existe en tus ciudades, contando a quienes pidieron
  «Avísame cuando haya» (30 días). Es la lista de reclutamiento; no crea semillas.
- **Familias de filtros:** por categoría, cada filtro con su interruptor y cuántos negocios lo tienen («RÁPIDO» = sale
  arriba en la página). Lo que apagas deja de salir al instante en la hoja de filtros y en los rápidos. «Encender todos».
- **Módulos y Free/Pro:** qué módulo puede usar cada categoría y qué ve Free y qué ve Pro. Solo lectura.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Tu rol no es Admin | Ves todo; no editas (permiso cat · editar). |
| Nombre repetido en la categoría | «Ya existe una subcategoría con ese nombre en esta categoría.» |
| Quitar una subcategoría con negocios | Pide confirmar: «Afecta a N negocios: pierden la etiqueta, no la ficha.» |
| Sinónimo con formato equivocado | «Usa el formato palabra → sinónimos.» |
| Lo que trae el sistema | Las semillas nunca vuelven a encender lo que el equipo apagó ni pisan lo que agregó. |
| Agregas o quitas una subcategoría | También cambia en «Publica tu negocio»: la nueva sale al buscar «¿Qué haces?» y en «Ver más» de su categoría; la quitada deja de salir. |

Todo queda en el historial de cada pestaña y en la auditoría. Nada se borra.

## Preguntas frecuentes
**¿Una subcategoría nueva sale en «Publica tu negocio»?** Todavía no: Publica usa la lista del diseño. Sale en la
categoría, en Buscar y en el admin.

**¿Por qué Buscar tarda hasta un minuto?** Guarda los sinónimos en memoria 60 segundos para responder rápido.

## English

### What it does
- **Categories:** all 17, with their key, subcategories, businesses, how many are Pro, the transaction type and the fixed line (the phrase that is never
  softened, e.g. «No one can guarantee you a result.»). Each category's detail shows its subcategories with how many businesses each has («NO LISTINGS» if
  none), the removed ones and their businesses.
  - **Add a subcategory:** name in Spanish and, after «/», in English. It takes the next code (`NEG-<CAT>-<NN>`), goes at the end of the list and Search knows it.
  - **Remove:** asks for a reason and says how many businesses it affects. The businesses **lose the label, not their page**: it stops showing on the
    category page, in cards, on the business page, on the map and in Search. **Restore** brings it back exactly as it was.
- **Synonyms:** what the neighbor types (left) is also searched as what is on the right. Add (format `word → synonym1, synonym2`, no accents), turn off and
  turn on. Search uses them in under a minute.
- **Searches without supply:** what neighbors searched for that does not exist in your cities, counting those who asked «Notify me» (30 days). It is the
  recruiting list; it does not create seeds.
- **Filter families:** per category, each filter with its switch and how many businesses have it («QUICK» = shows at the top of the page). What you turn off
  stops showing at once in the filter sheet and in the quick filters. «Turn all on».
- **Modules and Free/Pro:** which module each category can use and what Free sees and what Pro sees. Read only.

### What happens in each case
| Case | What happens |
|---|---|
| Your role is not Admin | You see everything; you cannot edit (permission cat · edit). |
| Repeated name in the category | «A subcategory with that name already exists in this category.» |
| Removing a subcategory that has businesses | It asks you to confirm: «Affects N businesses: they lose the label, not their page.» |
| Synonym with the wrong format | «Use the format word → synonyms.» |
| What the system brings | Seeds never turn back on what the team turned off and never overwrite what the team added. |
| You add or remove a subcategory | It also changes in «LIST YOUR BUSINESS»: the new one shows when searching «What do you do?» and under «See more» in its category; the removed one stops showing. |

Everything is recorded in each tab's history and in the audit log. Nothing is deleted.

### FAQ
**Does a new subcategory show in «LIST YOUR BUSINESS»?** Not yet: that flow uses the list from the design. It shows in the category, in Search and in the admin.

**Why does Search take up to a minute?** It keeps the synonyms in memory for 60 seconds to answer fast.
