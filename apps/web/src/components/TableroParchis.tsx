'use client';

// El tablero de parchís, dibujado.
//
// SE LEE, NO SE TOCA. En un móvil de 402px cada casilla mide unos 19px: pedirle
// a alguien que acierte ahí con el dedo sería pelear contra la regla de los
// 44px y contra el propio juego. Así que el tablero es para MIRAR — la partida
// se juega con los botones grandes de abajo (el dado y las cuatro fichas). Es
// lo que hacen las apps de parchís que funcionan, y es lo que permite que el
// tablero sea el de verdad y no una versión aguada.
//
// CÓMO ESTÁ MONTADO, y por qué así: la rejilla de 19×19 pinta SOLO el fondo
// (casillas, pasillos, seguros) y las fichas van en una capa ENCIMA, colocadas
// por porcentaje. La primera versión metía las fichas dentro de las celdas y el
// tablero salió torcido: una ficha grande estiraba su fila y las tres filas del
// centro quedaban más altas que las demás. Con las fichas fuera, el tamaño de
// una ficha no puede deformar el tablero — nunca.
//
// Los colores salen de los tokens de estado del sistema (error/info/warning/
// success), que dan justo el rojo, azul, amarillo y verde canónicos del
// parchís. No se inventa ninguno.

import {
  ANILLO, PASILLO, CASA, SALIDA, SEGUROS, COLORES, celdaDe,
  ANILLO_PASOS, META, anilloDe, type Color, type Celda,
} from '@/lib/parchis-tablero';

/** Una ficha en el tablero. `paso` null = todavía en casa. */
export type FichaParchis = { color: Color; paso: number | null };

const PINTA: Record<Color, { punto: string; suave: string }> = {
  rojo:     { punto: 'bg-error',   suave: 'bg-error-bg' },
  azul:     { punto: 'bg-info',    suave: 'bg-info-bg' },
  amarillo: { punto: 'bg-warning', suave: 'bg-warning-bg' },
  verde:    { punto: 'bg-success', suave: 'bg-success-bg' },
};

const SALIDA_DE = new Map<number, Color>(COLORES.map((c) => [SALIDA[c], c]));
const clave = (f: number, c: number) => `${f},${c}`;

/** Una ficha suelta, colocada por porcentaje sobre el tablero. */
function Punto({ celda, color, cuantas, tam = 4.4 }: {
  celda: Celda; color: Color; cuantas: number; tam?: number;
}) {
  return (
    <span
      className={`absolute flex items-center justify-center rounded-full border border-white ${PINTA[color].punto} shadow-card`}
      style={{
        left: `${((celda.c + 0.5) / 19) * 100}%`,
        top: `${((celda.f + 0.5) / 19) * 100}%`,
        width: `${tam}%`, height: `${tam}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Dos fichas juntas son una BARRERA: no se pinta una encima de otra, se
          dice cuántas hay — que es la información que cambia la jugada. */}
      {cuantas > 1 && (
        <span className="font-display text-[7.5px] font-bold leading-none text-white">{cuantas}</span>
      )}
    </span>
  );
}

export function TableroParchis({ fichas }: { fichas: FichaParchis[] }) {
  // Fichas por celda, agrupadas para poder marcar las barreras.
  const ocupadas = new Map<string, { color: Color; cuantas: number }>();
  for (const f of fichas) {
    if (f.paso == null) continue;
    const c = celdaDe(f.color, f.paso);
    const k = clave(c.f, c.c);
    const ya = ocupadas.get(k);
    ocupadas.set(k, { color: ya?.color ?? f.color, cuantas: (ya?.cuantas ?? 0) + 1 });
  }

  const enCasa = Object.fromEntries(
    COLORES.map((c) => [c, fichas.filter((f) => f.color === c && f.paso == null).length]),
  ) as Record<Color, number>;

  const anilloEn = new Map(ANILLO.map((c, i) => [clave(c.f, c.c), i]));
  const pasilloEn = new Map<string, Color>();
  for (const col of COLORES) for (const p of PASILLO[col]) pasilloEn.set(clave(p.f, p.c), col);

  const pct = (n: number) => `${(n / 19) * 100}%`;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[380px] overflow-hidden rounded-card border border-line bg-white">
      {/* ── Fondo: las cuatro casas ─────────────────────────────────────── */}
      {COLORES.map((col) => (
        <div key={col} className={`absolute ${PINTA[col].suave}`}
          style={{ top: pct(CASA[col].f), left: pct(CASA[col].c), width: pct(8), height: pct(8) }} />
      ))}

      {/* ── Fondo: la rejilla del recorrido ─────────────────────────────── */}
      <div className="absolute inset-0 grid"
        style={{ gridTemplateColumns: 'repeat(19, 1fr)', gridTemplateRows: 'repeat(19, 1fr)' }}>
        {Array.from({ length: 19 * 19 }).map((_, i) => {
          const f = Math.floor(i / 19); const c = i % 19;
          const k = clave(f, c);
          const idx = anilloEn.get(k);
          const pas = pasilloEn.get(k);
          if (idx == null && !pas) return <span key={i} className="min-h-0 min-w-0" />;

          const salidaDe = idx != null ? SALIDA_DE.get(idx) : undefined;
          const seguro = idx != null && SEGUROS.has(idx);
          const fondo = salidaDe ? PINTA[salidaDe].suave
            : pas ? PINTA[pas].suave
            : 'bg-white';

          return (
            <span key={i}
              className={`flex min-h-0 min-w-0 items-center justify-center border-[0.5px] border-line ${fondo}`}>
              {/* El seguro se marca, como en el tablero de verdad: es la
                  diferencia entre estar a salvo y que te coman. */}
              {seguro && !salidaDe && <span className="h-[22%] w-[22%] rounded-full bg-muted-3" />}
            </span>
          );
        })}
      </div>

      {/* ── La meta, en el centro ───────────────────────────────────────── */}
      <div className="absolute flex items-center justify-center"
        style={{ top: pct(8), left: pct(8), width: pct(3), height: pct(3) }}>
        <span className="h-[78%] w-[78%] rotate-45 overflow-hidden rounded-[3px] border border-line">
          <span className="grid h-full w-full grid-cols-2 grid-rows-2">
            <span className="bg-error-bg" /><span className="bg-info-bg" />
            <span className="bg-warning-bg" /><span className="bg-success-bg" />
          </span>
        </span>
      </div>

      {/* ── Las fichas que aún no han salido, dentro de su casa ─────────── */}
      {COLORES.map((col) => {
        const n = enCasa[col];
        if (!n) return null;
        // Se reparten CENTRADAS en el cuadro de 8×8, según cuántas queden: con
        // los cuatro huecos fijos, dos fichas se quedaban pegadas arriba y
        // parecía un fallo de dibujo.
        const huecos = n <= 1 ? [[4, 4]]
          : n === 2 ? [[4, 2.6], [4, 5.4]]
          : n === 3 ? [[2.6, 2.6], [2.6, 5.4], [5.4, 4]]
          : [[2.6, 2.6], [2.6, 5.4], [5.4, 2.6], [5.4, 5.4]];
        return huecos.slice(0, n).map(([df, dc], i) => (
          <Punto key={`${col}-casa-${i}`} color={col} cuantas={1} tam={5}
            celda={{ f: CASA[col].f + df - 0.5, c: CASA[col].c + dc - 0.5 }} />
        ));
      })}

      {/* ── Las fichas en juego, encima de todo ─────────────────────────── */}
      {[...ocupadas.entries()].map(([k, v]) => {
        const [f, c] = k.split(',').map(Number);
        const enMeta = f === 9 && c === 9;
        return <Punto key={k} celda={{ f, c }} color={v.color} cuantas={v.cuantas} tam={enMeta ? 6 : 4.4} />;
      })}
    </div>
  );
}

/** Cuánto le queda a una ficha, en texto — para los botones de abajo. */
export function dondeVa(color: Color, paso: number | null, L: (es: string, en: string) => string): string {
  if (paso == null) return L('en casa', 'at home');
  if (paso >= META) return L('¡llegó!', 'home!');
  if (paso >= ANILLO_PASOS) return L(`pasillo ${paso - ANILLO_PASOS + 1} de 7`, `home column ${paso - ANILLO_PASOS + 1} of 7`);
  return L(`casilla ${anilloDe(color, paso)! + 1}`, `square ${anilloDe(color, paso)! + 1}`);
}
