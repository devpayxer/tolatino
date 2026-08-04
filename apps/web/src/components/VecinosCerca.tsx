'use client';

// Tarjeta «Vecinos cerca de ti» — columna derecha de Comunidad en escritorio.
// El diseño sale del prototipo (`To'Latino Studio.dc.html`, rail derecho):
// avatar de 36px, nombre en 12.5/800, línea secundaria en 10.5/600 y una
// pastilla Seguir a la derecha. Lo único que cambia respecto al prototipo es de
// dónde salen los datos: allí eran tres personas inventadas, aquí es el RPC
// `neighbors_nearby`. Si no hay nadie real que sugerir, la tarjeta no se pinta.

import { useLang } from '@/lib/i18n';
import { useAvatar } from '@/lib/avatars';
import { useFollows } from '@/lib/follows';
import { Avatar, Card } from '@/components/ui';
import type { Vecino } from '@/lib/vecinos';

function Fila({ v, onOpen }: { v: Vecino; onOpen: (id: string) => void }) {
  const { L } = useLang();
  const follows = useFollows();
  const foto = useAvatar(v.id);
  const siguiendo = follows.isFollowing(v.id);

  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={() => onOpen(v.id)}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
      >
        <Avatar initials={v.initials} color={v.color} src={foto} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-extrabold text-ink">{v.name}</span>
          <span className="block truncate text-[10.5px] font-semibold text-muted-2">
            {v.hood
              ? v.hood
              : v.posts === 1
                ? L('1 publicación', '1 post')
                : L(`${v.posts} publicaciones`, `${v.posts} posts`)}
          </span>
        </span>
      </button>
      <button
        onClick={() => follows.toggleFollow(v.id)}
        className={`tap-y flex-none cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-extrabold ${
          siguiendo ? 'bg-lilac text-primary-dark' : 'bg-primary text-white'
        }`}
      >
        {siguiendo ? L('Siguiendo', 'Following') : L('Seguir', 'Follow')}
      </button>
    </div>
  );
}

export function VecinosCerca({ vecinos, onOpen }: { vecinos: Vecino[]; onOpen: (id: string) => void }) {
  const { L } = useLang();
  if (vecinos.length === 0) return null;
  return (
    <Card className="p-[17px]">
      <div className="mb-3 text-[13.5px] font-extrabold text-ink">{L('Vecinos cerca de ti', 'Neighbors near you')}</div>
      <div className="flex flex-col gap-3">
        {vecinos.map((v) => (
          <Fila key={v.id} v={v} onOpen={onOpen} />
        ))}
      </div>
    </Card>
  );
}
