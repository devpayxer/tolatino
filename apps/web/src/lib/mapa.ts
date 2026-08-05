'use client';

// El mapa de To'Latino: tiles VECTORIALES con nuestra paleta.
//
// DE DÓNDE SALE (fundador, 2026-08-05): «se ve mapbox crudo, antiguo y de mala
// calidad». Tenía razón, y la causa es concreta: los mapas usaban
// `tile.openstreetmap.org`, que sirve IMÁGENES de 256 px con el estilo clásico
// de OSM — carreteras amarillas, etiquetas de todo, y borroso en una pantalla
// retina porque es una foto del mapa, no un vector. Y no se puede personalizar:
// lo que llega ya viene pintado.
//
// LA SOLUCIÓN son tiles vectoriales: el navegador recibe la geometría y la
// pinta con NUESTROS colores. Es lo que hacen Airbnb o Uber — nadie serio usa
// el mapa «de fábrica».
//
// POR QUÉ OPENFREEMAP. Gratis, sin clave que configurar ni que caduque, sin
// límite de peticiones, y —lo que decidió la elección— **el mismo formato se
// puede alojar uno mismo**: el día que queramos dejar de depender de ellos, se
// cambia `NEXT_PUBLIC_MAPA_STYLE` por nuestra URL y no se toca una línea de
// código. Se descartó Google Maps y Mapbox por cobrar por petición (regla #3).
//
// SI EL ESTILO NO CARGA, no se queda en blanco: cae al raster de OSM que había
// antes. Peor que hoy, imposible; mejor, casi siempre.

/** Style vectorial base. Cambiar esta variable = alojarlo nosotros. */
export const MAPA_STYLE =
  process.env.NEXT_PUBLIC_MAPA_STYLE || 'https://tiles.openfreemap.org/styles/positron';

/** El raster de siempre, como red de seguridad. */
export const MAPA_RASTER = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
};

// ── La paleta: tokens del sistema de diseño, no colores nuevos ──────────────
const TIERRA = '#F7F5FB';   // fondo, un pelo más claro que `app` para que las tarjetas floten
const AGUA = '#DDD6F5';     // lila (parientes de `lilac.ring`)
const VERDE = '#E7F3EC';    // parques (`green.bg` aclarado)
const EDIFICIO = '#ECE8F4'; // `lilac.line`
const CALLE = '#FFFFFF';
const CALLE_BORDE = '#E7E3F4';
const VIA_RAPIDA = '#F1EFFA';
const TEXTO = '#6E6A85';    // `ink.2`
const TEXTO_HALO = '#FFFFFF';

type Capa = { id: string; type: string; paint?: Record<string, unknown> };
type MapaLike = {
  getStyle: () => { layers?: Capa[] } | undefined;
  setPaintProperty: (capa: string, prop: string, valor: unknown) => void;
};

const esDe = (id: string, ...palabras: string[]) => {
  const s = id.toLowerCase();
  return palabras.some((p) => s.includes(p));
};

/**
 * Repinta el mapa con la paleta de To'Latino.
 *
 * Actúa por TIPO de capa y por palabras en su nombre, no por una lista fija de
 * capas: así sigue funcionando si el proveedor renombra o añade capas — que es
 * justo lo que rompe a quien escribe un estilo a mano contra un esquema
 * concreto. Cada `setPaintProperty` va en su propio try: una capa que no acepte
 * una propiedad no puede tumbar el resto del repintado.
 */
export function aplicarPaletaToLatino(map: MapaLike): void {
  const capas = map.getStyle()?.layers;
  if (!capas?.length) return;

  const set = (id: string, prop: string, valor: unknown) => {
    try { map.setPaintProperty(id, prop, valor); } catch { /* esa capa no lo admite */ }
  };

  for (const capa of capas) {
    const { id, type } = capa;

    if (type === 'background') { set(id, 'background-color', TIERRA); continue; }

    if (type === 'fill') {
      if (esDe(id, 'water', 'ocean', 'river', 'lake')) set(id, 'fill-color', AGUA);
      else if (esDe(id, 'park', 'wood', 'forest', 'grass', 'green', 'golf', 'pitch', 'cemetery')) set(id, 'fill-color', VERDE);
      else if (esDe(id, 'building')) { set(id, 'fill-color', EDIFICIO); set(id, 'fill-opacity', 0.9); }
      else if (esDe(id, 'landuse', 'landcover', 'residential', 'industrial')) { set(id, 'fill-color', EDIFICIO); set(id, 'fill-opacity', 0.35); }
      else set(id, 'fill-color', TIERRA);
      continue;
    }

    if (type === 'line') {
      if (esDe(id, 'water', 'river', 'stream', 'canal')) { set(id, 'line-color', AGUA); continue; }
      if (esDe(id, 'boundary', 'admin')) { set(id, 'line-color', '#D8D2EC'); continue; }
      if (esDe(id, 'motorway', 'trunk', 'highway')) { set(id, 'line-color', VIA_RAPIDA); continue; }
      if (esDe(id, 'rail', 'transit')) { set(id, 'line-color', '#E4E0F0'); continue; }
      // el resto de calles: blancas con un borde lila muy suave
      set(id, 'line-color', esDe(id, 'casing', 'outline') ? CALLE_BORDE : CALLE);
      continue;
    }

    if (type === 'symbol') {
      set(id, 'text-color', TEXTO);
      set(id, 'text-halo-color', TEXTO_HALO);
      set(id, 'text-halo-width', 1.4);
      continue;
    }
  }
}

/**
 * Crea el mapa con el estilo vectorial y lo repinta; si ese estilo no carga
 * (proveedor caído, red del usuario), reintenta con el raster de siempre.
 * Devuelve el mapa ya listo.
 */
export async function crearMapa(
  ml: typeof import('maplibre-gl'),
  opciones: { container: HTMLElement; center: [number, number]; zoom: number },
): Promise<import('maplibre-gl').Map> {
  const map = new ml.Map({ ...opciones, style: MAPA_STYLE, attributionControl: false });

  map.on('style.load', () => aplicarPaletaToLatino(map as unknown as MapaLike));
  map.once('error', (e: unknown) => {
    // Solo importa el fallo al CARGAR el estilo: un tile suelto que falle no
    // justifica tirar el mapa entero abajo.
    const err = e as { error?: { message?: string } };
    if (!/style|load/i.test(err?.error?.message ?? '')) return;
    try { map.setStyle(MAPA_RASTER as unknown as string); } catch { /* ya está */ }
  });

  return map;
}
