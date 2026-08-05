'use client';

// Columna derecha de Comunidad en escritorio (≥1180px). Decisión del fundador
// (2026-08-04): en lugar de sugerir vecinos, esta columna trabaja para el
// negocio — que es de lo que vive la app:
//   1. «Negocios destacados» + la invitación a publicar el tuyo.
//   2. «Eventos próximos» de la comunidad.
//
// Las dos tarjetas leen datos que la pantalla YA tiene en memoria (`useLiveData`
// carga negocios y eventos del radio de la ciudad elegida), así que no añaden ni
// una consulta. Nada aquí es inventado: si no hay negocios o no hay eventos, se
// dice, no se rellena.
//
// El aspecto sale del prototipo (`To'Latino Studio.dc.html`, riel derecho):
// tarjeta blanca de 17px de relleno, título en 13.5/800, filas separadas 12px.

import { useRouter } from 'next/navigation';
import { IconMapPin as MapPin, IconStar as Star } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { BizLogo, Card } from '@/components/ui';
import { bizTile, type Business, type EventItem } from '@/data/fixtures';
import { CAT } from '@/lib/tiles';

const MAX_NEGOCIOS = 3;
const MAX_EVENTOS = 3;

/**
 * «Destacado» tiene una definición CONCRETA, no un ranking a ojo. En orden:
 *   1. Verificados primero (`tier <> 'free'`: el dueño validó su plan).
 *   2. Dentro de cada grupo, quien TIENE reseñas antes que quien no.
 *   3. Después, mejor calificación; a igualdad, más reseñas.
 *
 * El punto 2 no es un detalle: sin él, un negocio recién dado de alta con cero
 * reseñas encabezaba la lista por una calificación que nadie le ha puesto, por
 * encima de uno con 4.9 y 210 reseñas. Destacar eso quema justo lo que esta
 * tarjeta debe construir — la confianza de quien la lee.
 *
 * Todo sale de datos reales del negocio; no hay un campo «featured» que alguien
 * ponga a mano ni un puesto que se pueda comprar hoy.
 */
function destacados(lista: Business[]): Business[] {
  return [...lista]
    .sort((a, b) => {
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      const ca = a.reviews > 0;
      const cb = b.reviews > 0;
      if (ca !== cb) return ca ? -1 : 1;
      const ra = ca ? Number(a.rating) || 0 : 0;
      const rb = cb ? Number(b.rating) || 0 : 0;
      if (ra !== rb) return rb - ra;
      return b.reviews - a.reviews;
    })
    .slice(0, MAX_NEGOCIOS);
}

function NegocioFila({ b, onOpen }: { b: Business; onOpen: () => void }) {
  const { L } = useLang();
  return (
    <button onClick={onOpen} className="flex w-full cursor-pointer items-center gap-2.5 text-left">
      {/* El logo si lo subió; si no, el monograma con sus iniciales sobre el
          color de su rubro — el mismo que usa el listado de Negocios. */}
      <BizLogo name={b.name} logoUrl={b.logoUrl} color={CAT[b.cat].dot} size={36} radius={10} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className="min-w-0 truncate text-[12.5px] font-extrabold text-ink">{b.name}</span>
          {b.verified && (
            <span className="flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full bg-primary text-[8px] font-extrabold text-white">
              ✓
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 text-[10.5px] font-semibold text-muted-2">
          {/* Sin reseñas todavía no se finge un 0.0: se dice que es nuevo. */}
          {b.reviews > 0 ? (
            <>
              <Star size={10} stroke={2.6} className="flex-none text-amber" />
              {b.rating} · {b.reviews} {L('reseñas', 'reviews')}
            </>
          ) : (
            L('Nuevo por aquí', 'New around here')
          )}
          {b.dist !== '— mi' && <span className="truncate"> · {b.dist}</span>}
        </span>
      </span>
    </button>
  );
}

export function NegociosDestacados({ negocios }: { negocios: Business[] }) {
  const { L } = useLang();
  const router = useRouter();
  const lista = destacados(negocios);

  return (
    <Card className="p-[17px]">
      <div className="mb-3 text-[13.5px] font-extrabold text-ink">{L('Negocios destacados', 'Featured businesses')}</div>

      {lista.length > 0 ? (
        <div className="flex flex-col gap-3">
          {lista.map((b) => (
            <NegocioFila key={b.slug} b={b} onOpen={() => router.push(`/negocios/?b=${encodeURIComponent(b.slug)}`)} />
          ))}
        </div>
      ) : (
        // Vacío honesto: sin negocios en el radio no se inventa ninguno. Y aquí
        // la invitación de abajo vale todavía más — no hay nadie aún.
        <div className="text-[12px] font-semibold leading-[1.5] text-muted-2">
          {L('Todavía no hay negocios registrados por aquí.', 'No businesses registered around here yet.')}
        </div>
      )}

      {/* La invitación a la comunidad: quien tenga un negocio, que lo publique.
          Es la puerta de entrada del lado vendedor, y en Comunidad es donde está
          la gente del barrio. */}
      <div className="mt-3.5 border-t border-hair pt-3.5">
        <div className="text-[12px] font-extrabold leading-[1.45] text-ink">
          {L('¿Tienes un negocio?', 'Do you own a business?')}
        </div>
        <div className="mt-0.5 text-[11px] font-semibold leading-[1.45] text-muted-2">
          {L('Publícalo gratis y deja que tu barrio te encuentre.', 'List it for free and let your neighborhood find you.')}
        </div>
        <button
          onClick={() => router.push('/negocio/publicar')}
          className="tap-y mt-2.5 w-full cursor-pointer rounded-btn bg-primary px-3 py-2 text-[12px] font-extrabold text-white shadow-cta-sm"
        >
          {L('Publicar mi negocio', 'List my business')}
        </button>
      </div>
    </Card>
  );
}

export function EventosProximos({ eventos }: { eventos: EventItem[] }) {
  const { L } = useLang();
  const router = useRouter();
  // `events_near` ya devuelve SOLO lo que no ha terminado y ordenado por fecha
  // ascendente, así que «los próximos» son literalmente los primeros.
  const lista = eventos.slice(0, MAX_EVENTOS);

  // Sin eventos no se pinta la tarjeta: a diferencia de los negocios, aquí no
  // hay nada que pedirle al vecino — un «no hay eventos» permanente es ruido.
  if (lista.length === 0) return null;

  return (
    <Card className="p-[17px]">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-[13.5px] font-extrabold text-ink">{L('Eventos próximos', 'Upcoming events')}</span>
        <button
          onClick={() => router.push('/eventos/')}
          className="flex-none cursor-pointer text-[11px] font-extrabold text-primary-dark"
        >
          {L('Ver todos', 'See all')}
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {lista.map((e) => (
          <button
            key={e.slug ?? e.id}
            onClick={() => router.push(e.slug ? `/eventos/?e=${encodeURIComponent(e.slug)}` : '/eventos/')}
            className="flex w-full cursor-pointer items-center gap-2.5 text-left"
          >
            <span className="flex h-9 w-9 flex-none flex-col items-center justify-center rounded-[10px] bg-lilac-3">
              <span className="text-[8.5px] font-extrabold uppercase leading-none text-primary-dark">{e.dEs}</span>
              <span className="text-[14px] font-extrabold leading-none text-ink">{e.day}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-extrabold text-ink">{L(e.tEs, e.tEn)}</span>
              <span className="flex items-center gap-1 text-[10.5px] font-semibold text-muted-2">
                <MapPin size={10} stroke={2.6} className="flex-none" />
                <span className="truncate">{L(e.lEs, e.lEn)}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
