// La GEOMETRÍA del tablero de parchís. Solo dónde está cada casilla — ninguna
// regla del juego vive aquí (esas van en la base, como en el dominó).
//
// EL TABLERO DE VERDAD, NO UNA VERSIÓN «DE APP». Un latino reconoce el parchís
// de un vistazo: la cruz, las cuatro casas en las esquinas, los pasillos de
// color hacia el centro. Dibujar otra cosa —una pista lineal, un tablero
// «moderno»— sería más fácil de programar y mataría justo lo que hace que
// alguien quiera jugarlo aquí.
//
// LAS CUENTAS, que son las que cuadran el tablero:
//   · El anillo tiene 68 casillas = 4 brazos × 17.
//   · Cada brazo son 17: 8 subiendo por una columna, 1 en la punta, 8 bajando
//     por la otra. Las esquinas entre brazos se tocan en diagonal — por eso son
//     4×17 justos y no hacen falta casillas de esquina.
//   · Cada color tiene 7 casillas de pasillo y luego la meta.
//   · Un recorrido completo son 67 pasos de anillo + 7 de pasillo + la meta.
//
// Todo se apoya en una rejilla de 19×19: 8 (brazo) + 3 (centro) + 8 (brazo).

/** Fila y columna en la rejilla de 19×19. */
export type Celda = { f: number; c: number };

export const LADO = 19;

/** El anillo, en orden de marcha, de la 0 a la 67. */
export const ANILLO: Celda[] = (() => {
  const a: Celda[] = [];
  const p = (f: number, c: number) => a.push({ f, c });

  // Brazo de ARRIBA: sube por la columna 8, punta, baja por la 10.
  for (let f = 7; f >= 0; f--) p(f, 8);
  p(0, 9);
  for (let f = 0; f <= 7; f++) p(f, 10);

  // Brazo de la DERECHA.
  for (let c = 11; c <= 18; c++) p(8, c);
  p(9, 18);
  for (let c = 18; c >= 11; c--) p(10, c);

  // Brazo de ABAJO.
  for (let f = 11; f <= 18; f++) p(f, 10);
  p(18, 9);
  for (let f = 18; f >= 11; f--) p(f, 8);

  // Brazo de la IZQUIERDA.
  for (let c = 7; c >= 0; c--) p(10, c);
  p(9, 0);
  for (let c = 0; c <= 7; c++) p(8, c);

  return a;
})();

/** Los cuatro colores, en el orden en que se sientan. */
export const COLORES = ['rojo', 'azul', 'amarillo', 'verde'] as const;
export type Color = (typeof COLORES)[number];

/** Casilla de salida de cada color, en índices del anillo.
 *
 *  Están separadas 17 (un brazo) a propósito: así cada color sale en su brazo y
 *  la entrada a su pasillo le queda JUSTO ANTES de su salida — que es como está
 *  el tablero de verdad. Se completa la vuelta y se dobla hacia el pasillo. */
export const SALIDA: Record<Color, number> = { rojo: 9, azul: 26, amarillo: 43, verde: 60 };

/** El pasillo de cada color: 7 casillas, de la más lejana a la más pegada al
 *  centro. */
export const PASILLO: Record<Color, Celda[]> = {
  rojo:      Array.from({ length: 7 }, (_, i) => ({ f: 1 + i, c: 9 })),
  azul:      Array.from({ length: 7 }, (_, i) => ({ f: 9, c: 17 - i })),
  amarillo:  Array.from({ length: 7 }, (_, i) => ({ f: 17 - i, c: 9 })),
  verde:     Array.from({ length: 7 }, (_, i) => ({ f: 9, c: 1 + i })),
};

/** La casa (el cuadro de la esquina) de cada color. */
export const CASA: Record<Color, { f: number; c: number }> = {
  rojo:     { f: 0,  c: 11 },  // arriba a la derecha
  azul:     { f: 11, c: 11 },  // abajo a la derecha
  amarillo: { f: 11, c: 0 },   // abajo a la izquierda
  verde:    { f: 0,  c: 0 },   // arriba a la izquierda
};

/** Casillas seguras: no se puede comer en ellas.
 *
 *  Son las 4 salidas, las 4 puntas de los brazos y las 4 bases — doce, repartidas
 *  simétricamente, que es como está el tablero clásico. */
export const SEGUROS = new Set([9, 26, 43, 60, 8, 25, 42, 59, 0, 17, 34, 51]);

/** Un paso del recorrido:
 *    0..67 → anillo (68 casillas: de tu salida a la de justo antes)
 *   68..74 → pasillo (7)
 *       75 → meta
 *
 *  Se cuenta desde la salida del color, no desde una casilla fija del tablero:
 *  cada uno da su vuelta desde donde sale. `null` = todavía en casa.
 *
 *  Ojo con el 68: la vuelta son 68 casillas, no 67. En el paso 67 la ficha está
 *  en la casilla ANTERIOR a su salida —`(salida + 67) % 68 = salida - 1`—, que
 *  es exactamente desde donde se dobla hacia el pasillo. Contar 67 desplazaría
 *  el recorrido entero una casilla y la entrada al pasillo caería en la salida. */
export const ANILLO_PASOS = 68;
export const PASILLO_LARGO = 7;
export const META = ANILLO_PASOS + PASILLO_LARGO; // 75

/** Dónde se pinta una ficha que va por el paso `paso`. */
export function celdaDe(color: Color, paso: number): Celda {
  if (paso >= META) return { f: 9, c: 9 };                 // el centro
  if (paso >= ANILLO_PASOS) return PASILLO[color][paso - ANILLO_PASOS];
  return ANILLO[(SALIDA[color] + paso) % 68];
}

/** Índice de anillo de una ficha, o null si ya va por su pasillo. */
export function anilloDe(color: Color, paso: number): number | null {
  return paso >= ANILLO_PASOS ? null : (SALIDA[color] + paso) % 68;
}
