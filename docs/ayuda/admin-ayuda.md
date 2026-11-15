# Super Admin: Textos y páginas, Ayuda · Super Admin: Texts and pages, Help

_Pantallas: **Super Admin › Textos y páginas › Ayuda** (`/admin/textos`: cifras, filtros por audiencia y estado, buscador, la lista y el historial).
Ver: permiso «Textos y páginas» (ver); pausar y volver a usar: «Textos y páginas» (editar; Admin por defecto). Escritorio y teléfono. Versión:
10 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- Enseña la ayuda de `docs/ayuda/` **tal como está desplegada**: cada artículo con su audiencia (vecinos · negocios · porteros · equipo), su
  versión, su huella (sha256) y cuándo se desplegó, cuántos trozos tiene para la búsqueda y cuántos son «solo equipo».
- **El repo es la fuente.** El texto no se edita aquí: se corrige en `docs/ayuda/` y el siguiente despliegue lo vuelve a indexar (lo que no
  cambió queda igual). Lo que ya no está en el repo sale como **Retirado**.
- **Pausar** (con motivo): el artículo deja de salir en el Centro de ayuda (lista, búsqueda y enlace; el vecino ve «Este artículo se está
  revisando») y El Compa no lo usará. **Volver a usar** (con motivo) lo devuelve. Los dos quedan en el **historial** (solo se agrega) y en la
  auditoría.

## Cómo se usa
1. Filtra por audiencia (Todas · Vecinos · Negocios · Porteros · Equipo) o por estado (En uso y pausados · Pausados · Retirados), o busca por
   slug o título.
2. **Ver** abre el artículo como lo ve la gente (tú ves también las secciones «solo equipo»).
3. **Pausar** cuando un artículo dice algo que ya no es cierto; anota qué falta. Cuando la corrección esté desplegada, **Volver a usar**.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Se despliega sin cambios en la ayuda | Nada cambia (mismo sha256). El historial no suma nada. |
| Se despliega con un artículo cambiado | Se rehacen sus trozos y el historial dice «Desplegado · sha viejo → nuevo». Si estaba pausado, sigue pausado. |
| Un archivo sale del repo | Queda **Retirado** (nada se borra); si vuelve, vuelve a estar en uso. |
| Un archivo `admin-*` | Siempre es del equipo: la base no deja que sea de vecinos o negocios. |
| Una sección marcada `<!-- solo-equipo -->` | Se guarda como «equipo»: un vecino, un negocio o un portero nunca la ven. |
| Tu rol no tiene «editar» en Textos y páginas | Ves la lista y el historial; no pausas. |

## Preguntas frecuentes
- **¿Por qué no puedo editar el texto aquí?** Porque la ayuda va versionada con la app: lo que dice tiene que coincidir con lo desplegado. El
  editor de textos completo llega con el CMS.
- **¿Qué ve un vecino de un artículo pausado?** Que se está revisando, sin el texto ni el motivo.
- **¿Cómo sé qué lee El Compa?** Los artículos en uso de la audiencia de cada persona, sin lo pausado ni lo «solo equipo» (para vecinos y
  negocios).

## English

### What it does
- Shows the help in `docs/ayuda/` **exactly as deployed**: each article with its audience (neighbors · businesses · door staff · team), its
  version, its fingerprint (sha256) and when it was deployed, how many chunks it has for search and how many of them are «team only».
- **The repo is the source.** Text is not edited here: it is fixed in `docs/ayuda/` and the next deploy indexes it again (anything that did not
  change stays the same). What is no longer in the repo shows as **Retired**.
- **Pause** (with a reason): the article stops showing in the Help center (list, search and link; the neighbor sees «This article is being
  reviewed») and El Compa will not use it. **Use again** (with a reason) brings it back. Both go to the **history** (append-only) and to the
  audit log.

### How to use it
1. Filter by audience (All · Neighbors · Businesses · Door staff · Team) or by status (In use and paused · Paused · Retired), or search by slug
   or title.
2. **See** opens the article as people see it (you also see the «team only» sections).
3. **Pause** when an article says something that is no longer true; note what is missing. Once the fix is deployed, **Use again**.

### What happens in each case
| Case | What happens |
|---|---|
| A deploy with no changes to the help | Nothing changes (same sha256). The history adds nothing. |
| A deploy with a changed article | Its chunks are rebuilt and the history says «Deployed · old sha → new». If it was paused, it stays paused. |
| A file leaves the repo | It becomes **Retired** (nothing is deleted); if it comes back, it is in use again. |
| An `admin-*` file | It is always team-only: the database does not let it be for neighbors or businesses. |
| A section marked `<!-- solo-equipo -->` | It is stored as «team»: a neighbor, a business or door staff never see it. |
| Your role does not have «edit» on Texts and pages | You see the list and the history; you cannot pause. |

### FAQ
- **Why can't I edit the text here?** Because the help is versioned with the app: what it says has to match what is deployed. The full text
  editor arrives with the CMS.
- **What does a neighbor see of a paused article?** That it is being reviewed, without the text or the reason.
- **How do I know what El Compa reads?** The articles in use for each person's audience, leaving out what is paused and what is «team only»
  (for neighbors and businesses).
