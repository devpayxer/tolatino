'use client';

// La ficha de dominó, dibujada.
//
// POR QUÉ DIBUJADA Y NO UN EMOJI O UNA IMAGEN: el sistema de diseño prohíbe los
// emoji, y además 🁫 se ve distinto en cada teléfono y no se puede colorear ni
// escalar. Esto es HTML puro: hereda el color, se escala al tamaño que haga
// falta y pesa cero peticiones.
//
// Detalle que hace que se lea como dominó de verdad: **un doble se pone
// atravesado** en la mesa, como en la mesa de casa.

import type { Ficha as FichaTipo } from '@/lib/domino';

/** Posición de los puntos de cada cara, en rejilla 3×3 (fila, columna). */
const PUNTOS: Record<number, [number, number][]> = {
  0: [],
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function Cara({ n, px }: { n: number; px: number }) {
  return (
    <span className="relative block" style={{ width: px, height: px }}>
      {(PUNTOS[n] ?? []).map(([r, c], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-current"
          style={{
            width: px * 0.17, height: px * 0.17,
            left: c * 0.5 * (px * 0.62) + px * 0.12,
            top: r * 0.5 * (px * 0.62) + px * 0.12,
          }}
        />
      ))}
    </span>
  );
}

export function Ficha({
  ficha, dir = 'v', px = 38, estado = 'normal', onClick, seleccionada,
}: {
  ficha: FichaTipo;
  /** 'h' = tumbada (en la mesa) · 'v' = de pie (en tu mano). */
  dir?: 'h' | 'v';
  px?: number;
  /** `apagada` = no encaja en ningún extremo. */
  estado?: 'normal' | 'jugable' | 'apagada';
  onClick?: () => void;
  seleccionada?: boolean;
}) {
  const [a, b] = ficha;
  const doble = a === b;
  // En la mesa, el doble va atravesado.
  const tumbada = dir === 'h' && !doble;

  const borde = seleccionada ? 'border-primary ring-2 ring-primary/25'
    : estado === 'jugable' ? 'border-primary'
    : 'border-line';
  const apagada = estado === 'apagada' ? 'opacity-45' : '';
  const Etiqueta = onClick ? 'button' : 'span';

  return (
    <Etiqueta
      onClick={onClick}
      aria-label={`Ficha ${a} y ${b}`}
      className={`flex flex-none items-center overflow-hidden rounded-tile border-[1.5px] bg-white text-ink shadow-card ${
        tumbada ? 'flex-row' : 'flex-col'
      } ${borde} ${apagada} ${onClick ? 'tap cursor-pointer' : ''}`}
    >
      <span className="flex items-center justify-center p-[3px]"><Cara n={a} px={px} /></span>
      <span className={`${tumbada ? 'h-[76%] w-[2px]' : 'h-[2px] w-[76%]'} flex-none rounded-full bg-ink/25`} />
      <span className="flex items-center justify-center p-[3px]"><Cara n={b} px={px} /></span>
    </Etiqueta>
  );
}
