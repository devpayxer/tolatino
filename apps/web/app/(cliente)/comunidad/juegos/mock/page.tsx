'use client';
// MAQUETA para aprobar el diseño. No se conecta a nada y no se publica.
import { TableroParchis, dondeVa, type FichaParchis } from '@/components/TableroParchis';
import { Display, Eyebrow, PrimaryBtn } from '@/components/ui';
import { useLang } from '@/lib/i18n';

const FICHAS: FichaParchis[] = [
  { color: 'rojo', paso: 12 }, { color: 'rojo', paso: 12 }, { color: 'rojo', paso: null }, { color: 'rojo', paso: 70 },
  { color: 'azul', paso: 34 }, { color: 'azul', paso: null }, { color: 'azul', paso: null }, { color: 'azul', paso: 5 },
  { color: 'amarillo', paso: 51 }, { color: 'amarillo', paso: null }, { color: 'amarillo', paso: null }, { color: 'amarillo', paso: 75 },
  { color: 'verde', paso: 8 }, { color: 'verde', paso: 25 }, { color: 'verde', paso: null }, { color: 'verde', paso: null },
];

export default function Mock() {
  const { L } = useLang();
  const mias = FICHAS.filter((f) => f.color === 'rojo');
  return (
    <div className="pb-6">
      <div className="mb-3 flex items-center gap-2.5 rounded-card border border-line bg-white px-3.5 py-2.5">
        <span className="h-9 w-9 flex-none rounded-full bg-error" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-extrabold text-ink">Te toca a ti</span>
          <Eyebrow className="text-[10px]">Juegas con las rojas</Eyebrow>
        </span>
        <span className="font-mono text-[11px] tabular-nums text-muted">0:52</span>
      </div>

      <TableroParchis fichas={FICHAS} />

      <div className="mt-3 rounded-card border border-line bg-white p-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 flex-none items-center justify-center rounded-plate border-[1.5px] border-line bg-white font-display text-[26px] font-bold text-ink">5</span>
          <p className="flex-1 text-[12.5px] font-semibold leading-snug text-muted">
            {L('Sacaste 5: puedes sacar una ficha de casa o avanzar 5.', 'You rolled a 5.')}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {mias.map((f, i) => (
            <button key={i}
              className={`tap flex min-h-[52px] cursor-pointer items-center gap-2 rounded-btn border-[1.5px] px-3 py-2.5 text-left ${i === 2 ? 'border-primary bg-tint-pink' : 'border-sys-line-strong bg-white'}`}>
              <span className="h-4 w-4 flex-none rounded-full border border-white bg-error" />
              <span className="min-w-0">
                <span className="block text-[12.5px] font-extrabold text-ink">{L(`Ficha ${i + 1}`, `Piece ${i + 1}`)}</span>
                <span className="block truncate text-[11px] font-semibold text-muted">{dondeVa('rojo', f.paso, L)}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <PrimaryBtn onClick={() => {}}>{L('Tirar el dado', 'Roll the die')}</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}
