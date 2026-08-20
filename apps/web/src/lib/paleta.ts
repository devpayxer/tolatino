// paleta.ts — LA PALETA DEL SISTEMA EN JAVASCRIPT.
//
// ════════════════════════════════════════════════════════════════════════════
// PASO 2 DE LA MIGRACIÓN AL «Sistema To'Latino» (handoff 2026-08-20).
// ════════════════════════════════════════════════════════════════════════════
// El paso 1 reapuntó los tokens de Tailwind y con eso cambiaron 6.700 clases de
// golpe. Pero al medir quedaban **1.263 hex crudos** repartidos en 69 archivos
// que ningún token alcanza, porque no son clases: son VALORES que viajan por
// JavaScript hasta un `style={{…}}` o un atributo de SVG —colores de avatar,
// puntos de categoría, iconos de aviso, degradados a rayas de las fotos que
// aún no existen, series de las gráficas.
//
// Este archivo es dónde viven ahora. Regla: **un color que se escribe en JS se
// escribe AQUÍ y se importa**. Lo vigila `verify-build.mjs`, que no exige que
// no haya hex en el código —sería imposible con SVG y con Stripe— sino algo
// más útil: que **todo hex que aparezca sea uno de los del sistema**. Inventar
// un color rompe el build y el mensaje dice cuál es el que tocaba.
//
// DE DÓNDE SALEN LOS VALORES: `design_handoff_tolatino/tokens.css` y la tabla
// de color de `DESIGN_SYSTEM.md`. Lo único que NO viene de ahí son los 17
// colores de rubro (el sistema define 7 módulos, nosotros tenemos 17
// categorías de negocio): se generaron **armonizados en OKLCH** sobre los 7
// acentos, que es exactamente lo que el handoff manda hacer cuando hacen falta
// colores nuevos («New colors only via oklch harmonized to this palette —
// never invented from scratch»). Cada uno lleva anotado su tono y su contraste.

/** Tintas. La escala del handoff (#16112E · #625B7D · #9A93B3) con los
 *  intermedios interpolados dentro de su familia violeta-gris. */
export const TINTA = {
  fuerte: '#16112E', // titulares, botones oscuros
  cuerpo: '#342F4E', // cuerpo de publicación
  suave: '#403A5A', // etiquetas de tono medio
  parrafo: '#4B4565',
  segundo: '#625B7D', // texto secundario
  apagado: '#6F6889', // metadatos (AA sobre blanco: 5.2)
  apagado2: '#706987', // texto secundario (AA: 5.2)
  apagado3: '#9A93B3', // (valor del handoff) iconos y decoración, nunca texto
  tenue: '#B3ADC7', // deshabilitado, contadores
} as const;

/** El acento de marca. `texto` es el que cumple AA sobre blanco (5.9); el
 *  `DEFAULT` da 3.6 y solo vale para rellenos. */
export const ACENTO = {
  // El rosa AA (ver el comentario largo en `tailwind.config.ts` → primary):
  // el literal del handoff, #FF2D6F, da 3.59 con texto blanco encima. Éste es
  // el mismo tono y la misma saturación, 6% menos claro → 4.54.
  marca: '#E9005E',
  texto: '#C4144C',
  pulsado: '#A80F40',
  suave: '#FF7A9E',
} as const;

/** Acentos por módulo. En el sistema nuevo el color es de la SECCIÓN. */
export const MODULO = {
  comunidad: '#FF2D6F',
  negocios: '#FF7A1A',
  eventos: '#7C3AED',
  transporte: '#0EA5E9',
  bienes: '#00C48C',
  autos: '#FFB020',
  trabajos: '#4F46E5',
} as const;

/** Las 8 superficies teñidas del sistema. */
export const TINTE = {
  rosa: '#FFECF2',
  naranja: '#FFF1E5',
  morado: '#F3EEFF',
  azul: '#E8F5FF',
  verde: '#E6FAF3',
  indigo: '#EEEDFC',
  lila: '#F1EEFA',
  blanco: '#FCFBFF',
} as const;

/** Estado. `fg` es SIEMPRE legible sobre su `bg` y sobre blanco.
 *  Ojo con `exito`/`aviso`: los valores de acento del handoff (#00A878,
 *  #E08A00) son para rellenos e iconos; para TEXTO se usan `fgTexto`, que es
 *  el mismo tono bajado hasta cumplir AA. */
export const ESTADO = {
  exito: { fg: '#00A878', fgTexto: '#007A57', bg: '#E6FAF3' },
  aviso: { fg: '#E08A00', fgTexto: '#8A5A00', bg: '#FFF6E3' },
  error: { fg: '#E11D48', fgTexto: '#C4144C', bg: '#FFECEF' },
  info: { fg: '#0284C7', fgTexto: '#0369A1', bg: '#E8F5FF' },
  verificado: { fg: '#7C3AED', fgTexto: '#6D28D9', bg: '#F3EEFF' },
  marca: { fg: ACENTO.marca, fgTexto: ACENTO.texto, bg: TINTE.rosa },
  neutro: { fg: TINTA.segundo, fgTexto: TINTA.parrafo, bg: TINTE.lila },
} as const;

/** Estado sobre superficie OSCURA. Existe por una pantalla concreta: el
 *  resultado de escanear un boleto (`Events`), que se lee a oscuras en la
 *  puerta de un evento y necesita verde/ámbar/rojo que funcionen ahí. Mismos
 *  tonos que `ESTADO`, bajados a L 0.30 en OKLCH. */
export const ESTADO_OSCURO = {
  exito: '#003825',
  aviso: '#432601',
  error: '#491F21',
  info: '#07314B',
  marca: '#491E26',
} as const;

/** MARCAS QUE NO SON NUESTRAS. No se migran nunca: son la identidad de otro y
 *  cambiarlas hace que el usuario no reconozca lo que está mirando. El botón
 *  de Compartir de iOS tiene que ser el azul de Apple para que se encuentre en
 *  un menú de veinte opciones; una tarjeta Visa que no sea azul Visa parece
 *  falsa. El guardián de `verify-build.mjs` también las admite. */
export const MARCA_AJENA = {
  appleAzul: '#0A84FF', // icono Compartir de iOS
  visaAzul: '#1A1F71',
  visaAzul2: '#3B4F9F',
  doordash: '#FF3008',
  rappi: '#FF441F',
} as const;

/** Superficies y contornos. */
export const SUPERFICIE = {
  papel: '#F6F4FF', // el lienzo (= token `canvas`)
  blanco: '#FFFFFF',
  pozo: '#F1EEFA', // relleno de campos sobre blanco (= token `app`)
  linea: '#EAE6F5', // contorno del sistema
  lineaFuerte: '#E4DFF2',
} as const;

/** Los dos degradados de marca. Solo héroe / splash / CTA. */
export const DEGRADADO = {
  calor: 'linear-gradient(112deg, #E9005E, #FF7A1A, #FFB020)',
  senal: 'linear-gradient(112deg, #7C3AED, #0EA5E9, #00C48C)',
} as const;

/** Superficies oscuras (portada, paneles de marca). El sistema es «light,
 *  never dark», pero la portada tiene secciones inmersivas ya aprobadas. */
export const OSCURO = {
  fondo: '#16112E',
  banda: '#1C1638',
  panel: '#241C46',
  acento: '#FF7A9E', // el rosa no contrasta sobre oscuro; éste sí
  pale: '#FFC2D3',
} as const;

/** Los 17 rubros de negocio.
 *
 *  El sistema define 7 acentos de módulo y nosotros necesitamos 17 puntos
 *  distinguibles. Se generaron en OKLCH repartiendo el círculo entre los tonos
 *  de esos 7 acentos, con croma FIJO (0.155) y bajando la luminosidad de cada
 *  uno solo lo justo para cumplir AA sobre blanco. Por eso se ven como una
 *  familia y no como 17 colores sueltos — y por eso ninguno queda apagado:
 *  se sacrifica luminosidad, nunca saturación.
 *
 *  `fg` = el punto y el texto del rubro · `bg` = su superficie teñida.
 *
 *  El umbral de `fg` es 4.5 contra SU PROPIO TINTE, no contra blanco — que es
 *  más exigente y es el caso real: la etiqueta del rubro se pinta sobre su
 *  color, no sobre la página. Con el umbral puesto en blanco, esas etiquetas
 *  salían a 3.97–4.25 (lo midió el arnés). */
export const CAT_COLOR = {
  AutoServices: { fg: '#5A61C6', bg: '#EBEFFF' }, // oklch h 277 · contraste 4.55
  BeautyHealth: { fg: '#B9415D', bg: '#FFE8EB' }, // oklch h 10 · contraste 4.56
  FoodDrinks: { fg: '#B44D00', bg: '#FFEBDF' }, // oklch h 49 · contraste 4.56
  HomeServices: { fg: '#A15D00', bg: '#FCEEDB' }, // oklch h 75 · contraste 4.53
  NightLife: { fg: '#765AC1', bg: '#F0EDFF' }, // oklch h 293 · contraste 4.55
  Grocery: { fg: '#007E4C', bg: '#DFF7EB' }, // oklch h 164 · contraste 4.57
  Party: { fg: '#A3499A', bg: '#FDE9F9' }, // oklch h 331 · contraste 4.55
  HealthMedicine: { fg: '#007A7E', bg: '#DAF7F7' }, // oklch h 196 · contraste 4.50
  ProServices: { fg: '#0072B6', bg: '#DEF4FF' }, // oklch h 237 · contraste 4.51
  Shops: { fg: '#B44271', bg: '#FFE8F0' }, // oklch h 358 · contraste 4.57
  Transportation: { fg: '#0073AB', bg: '#DCF5FF' }, // oklch h 228 · contraste 4.51
  Education: { fg: '#AC5300', bg: '#FFECDC' }, // oklch h 61 · contraste 4.56
  Children: { fg: '#016FC3', bg: '#E2F2FF' }, // oklch h 251 · contraste 4.56
  Sports: { fg: '#267F1F', bg: '#E5F6E3' }, // oklch h 142 · contraste 4.55
  Churches: { fg: '#8A54B7', bg: '#F5EBFF' }, // oklch h 307 · contraste 4.59
  RealEstate: { fg: '#3C69C7', bg: '#E6F1FF' }, // oklch h 263 · contraste 4.57
  CarDealer: { fg: '#007698', bg: '#DAF6FD' }, // oklch h 214 · contraste 4.61
} as const;

/** Las dos rayas del marcador de posición de foto.
 *
 *  El handoff manda que, mientras no haya foto real, el hueco se llene con un
 *  degradado a rayas del color de la categoría —nunca con una foto genérica ni
 *  con un gris—. Cada par es el MISMO tono del rubro a dos luminosidades
 *  (0.955 y 0.905), generado en OKLCH igual que `CAT_COLOR`: por eso las rayas
 *  se leen como una textura y no como dos colores peleándose. */
export const TIRA = {
  AutoServices: { a: '#EBEFFF', b: '#D6DDFF' },
  BeautyHealth: { a: '#FFE8EB', b: '#FFD2D8' },
  FoodDrinks: { a: '#FFEBDF', b: '#FED6C2' },
  HomeServices: { a: '#FCEEDB', b: '#F4DBBA' },
  NightLife: { a: '#F0EDFF', b: '#E0DAFF' },
  Grocery: { a: '#DFF7EB', b: '#C1EBD6' },
  Party: { a: '#FDE9F9', b: '#F5D4F0' },
  HealthMedicine: { a: '#DAF7F7', b: '#B8EBEB' },
  ProServices: { a: '#DEF4FF', b: '#C0E6FF' },
  Shops: { a: '#FFE8F0', b: '#FED2DF' },
  Transportation: { a: '#DCF5FF', b: '#BDE7FB' },
  Education: { a: '#FFECDC', b: '#FAD9BD' },
  Children: { a: '#E2F2FF', b: '#C7E3FF' },
  Sports: { a: '#E5F6E3', b: '#CDE9C9' },
  Churches: { a: '#F5EBFF', b: '#E9D7FB' },
  RealEstate: { a: '#E6F1FF', b: '#CEE0FF' },
  CarDealer: { a: '#DAF6FD', b: '#B9E9F5' },
} as const;

/** Rotación de avatares. Se recorre por el hash del nombre, así que la misma
 *  persona sale siempre del mismo color. Son acentos de módulo + rubros, no
 *  colores sueltos. */
export const AVATAR = [
  MODULO.comunidad,
  MODULO.trabajos,
  MODULO.negocios,
  CAT_COLOR.Grocery.fg,
  MODULO.eventos,
  CAT_COLOR.ProServices.fg,
  CAT_COLOR.Party.fg,
  CAT_COLOR.HealthMedicine.fg,
] as const;

/** Series de las gráficas del panel, en orden. Mismo criterio: acentos del
 *  sistema, nunca una rampa inventada. */
export const SERIE = [
  MODULO.comunidad,
  MODULO.transporte,
  MODULO.bienes,
  MODULO.autos,
  MODULO.eventos,
  MODULO.negocios,
  MODULO.trabajos,
] as const;

/** Qué tinta poner ENCIMA de un color de fondo cualquiera.
 *
 *  De dónde sale: el arnés de contraste del paso 3 (2026-08-20) encontró
 *  iniciales de avatar en BLANCO sobre el ámbar del sistema — 1.8 de contraste,
 *  ilegible. No es un descuido de una pantalla: los avatares se colorean con un
 *  color que llega de la BASE DE DATOS (`profiles.avatar_color`), así que
 *  ninguna clase fija puede resolverlo. Se decide al pintar.
 *
 *  Devuelve blanco o la tinta fuerte, la que más contraste dé. */
export function textoSobre(fondo: string): string {
  const hex = fondo.trim().replace('#', '');
  if (hex.length !== 6) return '#FFFFFF';
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Contra blanco (L=1) vs contra la tinta fuerte (#16112E, L≈0.0126).
  const conBlanco = 1.05 / (Y + 0.05);
  const conTinta = (Y + 0.05) / (0.0126 + 0.05);
  return conBlanco >= conTinta ? '#FFFFFF' : TINTA.fuerte;
}

/** TODO hex que el sistema admite, en un solo conjunto. Lo lee el guardián de
 *  `verify-build.mjs` para rechazar cualquier color inventado. Se construye
 *  recorriendo lo de arriba, así que no se puede olvidar actualizarlo. */
export const PALETA_HEX: readonly string[] = Array.from(
  new Set(
    [
      ...Object.values(TINTA),
      ...Object.values(ACENTO),
      ...Object.values(MODULO),
      ...Object.values(TINTE),
      ...Object.values(SUPERFICIE),
      ...Object.values(OSCURO),
      ...Object.values(ESTADO_OSCURO),
      ...Object.values(MARCA_AJENA),
      ...Object.values(ESTADO).flatMap((e) => Object.values(e)),
      ...Object.values(CAT_COLOR).flatMap((c) => Object.values(c)),
      ...Object.values(TIRA).flatMap((t) => Object.values(t)),
      ...AVATAR,
      ...SERIE,
      '#FFFFFF',
      '#000000',
    ].map((h) => h.toUpperCase()),
  ),
);
