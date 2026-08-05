// Servir cada imagen al tamaño que de verdad se pinta.
//
// ════════════════════════════════════════════════════════════════════════════
// EL PROBLEMA QUE RESUELVE (medido, 2026-08-05)
// ════════════════════════════════════════════════════════════════════════════
// El fundador preguntó por qué las fotos tardan, y si no teníamos ya un
// conversor a WebP. Lo teníamos —`lib/image.ts` convierte al SUBIR— pero
// guardaba UN archivo de 1600 px y ese mismo archivo se servía al avatar de
// 44 px, a la tarjeta de 374 y a la galería a pantalla completa. El formato
// estaba bien; el tamaño estaba mal en todas partes menos en la galería.
//
// Medido en la ficha de un negocio a 402 px de ancho: 6 imágenes, 710 KB.
// Del MISMO archivo, pidiendo el tamaño correcto: 123.736 → 25.614 bytes.
//
// ════════════════════════════════════════════════════════════════════════════
// LAS DOS VÍAS, Y POR QUÉ HAY DOS (decisión del fundador, 2026-08-05)
// ════════════════════════════════════════════════════════════════════════════
// 1. **Lo que subimos desde hoy** guarda además dos copias pequeñas (400 y 800)
//    junto a la grande, en la carpeta `r/`. Servirlas es gratis y no depende de
//    nadie: el día que nos auto-alojemos, siguen ahí. Es la vía por defecto.
// 2. **Todo lo subido ANTES** no tiene esas copias, y reprocesarlo sería una
//    migración por cada archivo. Para eso está el transformador de Supabase
//    (`/render/image/…`), que redimensiona al vuelo. Es función de plan de pago
//    y se factura, así que se usa solo como red — no para lo nuevo.
// 3. **Las fotos del demo** son enlaces directos a Unsplash y no pasan por
//    ninguna de las dos: ahí basta con pedirle a Unsplash el ancho correcto y
//    `fm=webp`, que es gratis y suyo.
//
// Todo eso vive AQUÍ, en una función, y no repartido por 70 `<img>`. Quien
// pinta una imagen solo dice a qué ancho la va a pintar.

/** Calidad por tamaño: cuanto más pequeño se pinta, menos se nota bajarla. */
function calidad(ancho: number): number {
  if (ancho <= 200) return 68;
  if (ancho <= 400) return 70;
  if (ancho <= 800) return 75;
  return 80;
}

/**
 * Los tamaños que guardamos al subir. La grande no lleva sufijo.
 *
 * 200 está por los avatares y los logos: se pintan a 44–56 px, así que incluso
 * un archivo de 400 es cuatro veces más de lo que hace falta, y son las imágenes
 * que más veces aparecen por pantalla.
 */
export const VARIANTES = [200, 400, 800] as const;

/** Carpeta que marca «este archivo tiene copias pequeñas al lado». */
export const CARPETA_RESP = 'r';

const RE_SUPABASE = /^(https?:\/\/[^/]+)\/storage\/v1\/object\/public\/(.+)$/;
// `<carpeta>/r/<nombre>.<ext>` — y el nombre NO puede llevar ya un sufijo de
// tamaño, o construiríamos `foto.400.400.webp`.
const RE_RESPONSIVA = /^(.*\/r\/[^/]+)\.(webp|jpg|jpeg|png)$/i;
const RE_YA_VARIANTE = /\.(\d{3,4})\.(webp|jpg|jpeg|png)$/i;

/**
 * Devuelve la URL de `url` en el tamaño pedido.
 *
 * **`ancho` es el ancho del ARCHIVO, no el del hueco.** Se elige como el doble
 * de lo que se pinta —porque en un móvil casi no hay pantallas de un píxel por
 * punto— redondeado hacia arriba a 200 · 400 · 800 · 1600. Así, un avatar de
 * 44 px pide 200; una tarjeta de 120, 400; una portada a lo ancho, 800.
 *
 * Se dice el número final a propósito, en vez de calcularlo aquí a partir del
 * tamaño pintado: el que escribe el `<img>` es el único que sabe de verdad a qué
 * tamaño se ve en cada corte, y una fórmula escondida se equivoca en silencio.
 *
 * Nunca rompe nada: una URL que no reconoce (blob de una vista previa, data:,
 * un dominio ajeno) se devuelve tal cual.
 */
export function imgUrl(url: string | null | undefined, ancho: number): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // ── Unsplash (fotos del demo) ────────────────────────────────────────────
  if (url.includes('images.unsplash.com')) {
    try {
      const u = new URL(url);
      const antesW = Number(u.searchParams.get('w'));
      const antesH = Number(u.searchParams.get('h'));
      // Si traía alto, se conserva la PROPORCIÓN: `fit=crop` recorta a w×h, y
      // cambiar solo el ancho deformaría el encuadre.
      if (antesW > 0 && antesH > 0) u.searchParams.set('h', String(Math.round((antesH / antesW) * ancho)));
      u.searchParams.set('w', String(ancho));
      u.searchParams.set('q', String(calidad(ancho)));
      u.searchParams.set('fm', 'webp');
      return u.toString();
    } catch { return url; }
  }

  // ── lo nuestro, en Supabase Storage ──────────────────────────────────────
  const m = RE_SUPABASE.exec(url);
  if (!m) return url;
  const [, origen, ruta] = m;

  // (1) ¿tiene copias pequeñas al lado? Entonces gratis y sin transformador.
  if (!RE_YA_VARIANTE.test(ruta)) {
    const r = RE_RESPONSIVA.exec(ruta);
    if (r) {
      const talla = VARIANTES.find((v) => ancho <= v);
      if (talla) return `${origen}/storage/v1/object/public/${r[1]}.${talla}.${r[2]}`;
      return url; // se pinta grande: la original ya es la correcta
    }
  }

  // (2) archivo antiguo, sin copias: red de seguridad del transformador.
  return `${origen}/storage/v1/render/image/public/${ruta}${ruta.includes('?') ? '&' : '?'}width=${ancho}&quality=${calidad(ancho)}`;
}

/** Atajos, para que en el `<img>` se lea el hueco y no un número suelto. */
export const ANCHO = {
  /** Avatares, logos, iconos de negocio: se pintan a 32–56 px. */
  icono: 200,
  /** Miniaturas y tarjetas de catálogo: 80–200 px pintados. */
  tarjeta: 400,
  /** Portadas, fotos a lo ancho de la pantalla, galerías. */
  ancha: 800,
  /** Visor a pantalla completa: aquí sí se quiere el original. */
  original: 1600,
} as const;
