# Super Admin · Catálogo · Super Admin · Catalog

_Pantalla: ADM-CAT (`/admin/catalogo`), teléfono y escritorio. Versión: Fase 1 · bloque 1m (6 nov 2026). Para el equipo
de To'Latino (y El Compa como copiloto del equipo)._

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

Todo queda en el historial de cada pestaña y en la auditoría. Nada se borra.

## Preguntas frecuentes
**¿Una subcategoría nueva sale en «Publica tu negocio»?** Todavía no: Publica usa la lista del diseño. Sale en la
categoría, en Buscar y en el admin.

**¿Por qué Buscar tarda hasta un minuto?** Guarda los sinónimos en memoria 60 segundos para responder rápido.

---

## English
Catalog shows the 17 categories (key, subcategories, businesses, Pro, transaction type and fixed line). In a category:
add a subcategory ("Spanish name / English name"; next code NEG-<CAT>-<NN>), remove it (asks for a reason and shows how
many businesses it affects: they lose the label, not their page; it disappears from the category page, cards, page,
map and Search) and restore it. Synonyms: add ("word → synonym1, synonym2"), turn off and on; Search uses them within a
minute. Searches without supply: what neighbors searched and asked to be alerted about (30 days); a recruiting list,
not seeds. Filter families: per category, each filter with its switch and how many businesses have it; turning one off
removes it from the filter sheet and quick filters at once. Modules and Free/Pro: read only. Only Admin edits; every
change is audited; seeds never undo the team's changes.
