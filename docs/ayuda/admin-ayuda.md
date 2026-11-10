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
Super Admin › Texts and pages › **Help** shows the help in `docs/ayuda/` **as deployed**: each article with its audience (neighbors · businesses
· door staff · team), version, fingerprint (sha256), when it was deployed, how many search chunks it has and how many are team-only. **The repo
is the source:** text is fixed in `docs/ayuda/` and the next deploy re-indexes it (unchanged files stay the same); files no longer in the repo
show as **Retired**. **Pause** (with a reason) removes an article from the Help center (list, search and link; neighbors see «This article is
being reviewed») and El Compa will not use it; **Use again** (with a reason) brings it back. Both go to the append-only history and the audit log.

### How to use it
Filter by audience or status, or search by slug or title. **See** opens the article as people see it (you also see team-only sections). Pause
an article that says something no longer true and note what is missing; once the fix is deployed, use it again.

### What happens in each case
A deploy with no help changes changes nothing. A changed article gets its chunks rebuilt and a «Deployed · old sha → new» line; a paused
article stays paused. A file removed from the repo becomes Retired (nothing is deleted). An `admin-*` file is always team-only (the database
enforces it). A `<!-- solo-equipo -->` section is stored as team-only. Without «edit» on Texts and pages you only see the list and history.
