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

/** Cuánto se le da a cada proveedor para pintar su primer tile. */
const ESPERA_MS = 3500;

/**
 * Crea el mapa con el estilo vectorial, lo repinta con nuestra paleta y — si no
 * llega a pintarse — cae al raster de siempre; y si tampoco, avisa para que
 * quien lo montó enseñe otra cosa en vez de un rectángulo vacío.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * LO QUE SE MIDE ES **SI SE PINTÓ UN TILE**, no si «cargó el estilo»
 * ════════════════════════════════════════════════════════════════════════════
 * Aquí van dos errores míos seguidos, que es lo que el fundador acabó viendo:
 *
 *  1. La primera versión escuchaba `error` y filtraba el mensaje con una
 *     expresión regular. Si el proveedor no contesta (una red que se traga la
 *     petición, un 404 que no dispara ese evento), no saltaba nada.
 *  2. La segunda puso un cronómetro, pero se daba por satisfecha si el ESTILO
 *     traía capas. Y el estilo es un JSON de otra URL: puede llegar
 *     perfectamente mientras los tiles —que son el mapa— no llegan nunca. Ese
 *     caso da exactamente un RECTÁNGULO VACÍO, porque el mapa cree que va bien.
 *
 * La única señal que no miente es que MapLibre haya recibido un tile: el evento
 * `data` con `dataType === 'source'` y un `tile` dentro. Si a los 3,5 s no ha
 * llegado NI UNO, ese proveedor no sirve, diga lo que diga su JSON.
 *
 * El raster lleva además un filtro CSS que le baja la saturación: el OSM crudo
 * (el que el fundador llamó «antiguo») pasa de amarillo chillón a gris limpio.
 */
export function crearMapa(
  ml: typeof import('maplibre-gl'),
  opciones: {
    container: HTMLElement; center: [number, number]; zoom: number;
    interactive?: boolean;
    /** Se llama si NINGÚN proveedor pintó nada. Para no dejar un hueco gris. */
    onSinMapa?: () => void;
  },
): import('maplibre-gl').Map {
  const { onSinMapa, ...opts } = opciones;
  const map = new ml.Map({ ...opts, style: MAPA_STYLE, attributionControl: false });

  let tiles = 0;          // tiles pintados desde el último cambio de estilo
  let enRaster = false;
  let muerto = false;

  map.on('data', (e: { dataType?: string; tile?: unknown }) => {
    if (e?.dataType === 'source' && e.tile) tiles++;
  });
  map.once('remove', () => { muerto = true; });

  const revisar = () => {
    if (muerto || tiles > 0) return;   // hay mapa: nada que hacer
    if (!enRaster) {
      enRaster = true;
      try {
        map.setStyle(MAPA_RASTER as never);
        const lienzo = map.getCanvasContainer?.();
        if (lienzo) lienzo.style.filter = 'saturate(.72) contrast(1.03) brightness(1.02)';
      } catch { return; }             // el mapa ya se destruyó
      window.setTimeout(revisar, ESPERA_MS);   // segunda oportunidad, ya en raster
      return;
    }
    // Ni vectorial ni raster. Se dice, no se disimula.
    try { onSinMapa?.(); } catch { /* quien escuche verá */ }
  };

  map.on('style.load', () => {
    tiles = 0;                                   // el contador es por estilo
    if (!enRaster) aplicarPaletaToLatino(map as unknown as MapaLike);
  });
  window.setTimeout(revisar, ESPERA_MS);

  return map;
}
