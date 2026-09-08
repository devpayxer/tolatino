'use client';

// Sala de juegos — el vestíbulo.
//
// DE DÓNDE SALE: el fundador la pidió el 2026-09-08 con su propio razonamiento
// de semanas antes — «se aburren fácil, por eso tantos módulos». Una sala de
// juegos no es un módulo más: es la razón para volver un martes por la noche
// cuando no necesitas nada. Aprobó esta pantalla por captura antes de cablearla.
//
// QUÉ ES REAL Y QUÉ NO, porque importa (regla #7 — nada fabricado como final):
//   · Tu progreso y el ranking del barrio salen de la base (migración 0158).
//     Si no has hecho nada todavía, sale un cero honesto, no un número bonito.
//   · Dominó y parchís **aún no existen**. Se enseñan con la etiqueta PRONTO y
//     un «Avísame» que SÍ guarda (migración 0159) — que es exactamente lo que
//     manda el sistema de diseño: los módulos que no abren se ven, con su
//     etiqueta, nunca escondidos.
//   · NO hay sección de «mesas abiertas». Sin juego no hay mesas, y una lista
//     de mesas inventadas sería mentir sobre lo único que la pantalla promete.

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { Avatar, Display, Eyebrow, NivelChip, SkeletonList } from '@/components/ui';
import { miProgreso, rankingBarrio, apuntarmeLista, esperaConteo, puntosFmt, type Progreso, type FilaRanking } from '@/lib/juegos';

/** Las dos fichas de dominó del icono. Dibujadas, no emoji: el sistema de
 *  diseño los prohíbe y además un emoji se ve distinto en cada teléfono. */
function IconoDomino({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="10" y="4" width="28" height="40" rx="5" fill="#fff" stroke="currentColor" strokeWidth="2.2" />
      <line x1="10" y1="24" x2="38" y2="24" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="19" cy="13" r="2.6" fill="currentColor" /><circle cx="29" cy="13" r="2.6" fill="currentColor" />
      <circle cx="19" cy="30" r="2.6" fill="currentColor" /><circle cx="29" cy="30" r="2.6" fill="currentColor" />
      <circle cx="24" cy="37" r="2.6" fill="currentColor" />
    </svg>
  );
}

function IconoParchis({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="5" y="5" width="16" height="16" rx="4" className="fill-primary" />
      <rect x="27" y="5" width="16" height="16" rx="4" className="fill-mod-autos" />
      <rect x="5" y="27" width="16" height="16" rx="4" className="fill-mod-bienes" />
      <rect x="27" y="27" width="16" height="16" rx="4" className="fill-mod-transporte" />
      <circle cx="24" cy="24" r="6.5" fill="#fff" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

type Juego = {
  clave: string;
  es: string; en: string;
  subEs: string; subEn: string;
  tinte: string; tinta: string; raya: string;
  Icono: (p: { size?: number }) => React.ReactElement;
};

const JUEGOS: Juego[] = [
  {
    clave: 'domino', es: 'Dominó', en: 'Dominoes',
    subEs: 'Parejas o uno contra uno', subEn: 'Pairs or one on one',
    tinte: 'bg-tint-pink', tinta: 'text-ink',
    raya: 'linear-gradient(135deg,#FFECF2 0 9px,#FED2DF 9px 18px)',
    Icono: IconoDomino,
  },
  {
    clave: 'parchis', es: 'Parchís', en: 'Parcheesi',
    subEs: 'Hasta cuatro jugadores', subEn: 'Up to four players',
    tinte: 'bg-tint-blue', tinta: 'text-ink',
    raya: 'linear-gradient(135deg,#E2F2FF 0 9px,#C7E3FF 9px 18px)',
    Icono: IconoParchis,
  },
];

export function JuegosScreen() {
  const { L, lang } = useLang();
  const app = useApp();
  const auth = useAuth();

  const [progreso, setProgreso] = useState<Progreso | null>(null);
  const [ranking, setRanking] = useState<FilaRanking[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setCargando(true);
      const [p, r] = await Promise.all([miProgreso(), rankingBarrio(app.city, 10)]);
      if (!vivo) return;
      setProgreso(p);
      setRanking(r);
      setCargando(false);
    })();
    return () => { vivo = false; };
  }, [app.city, auth.user?.id]);

  const nivel = progreso ? (lang === 'es' ? progreso.nivelEs : progreso.nivelEn) : '';
  const siguiente = progreso ? (lang === 'es' ? progreso.siguienteEs : progreso.siguienteEn) : null;
  // Cuánto llevo recorrido del tramo actual, para la barra.
  const avance = progreso && progreso.siguienteDesde
    ? Math.max(0, Math.min(100, Math.round((progreso.puntos / progreso.siguienteDesde) * 100)))
    : 100;

  return (
    <div className="px-3.5 pb-8 pt-4 md:px-0">
      <Eyebrow>{L('Sala de juegos', 'Game room')}</Eyebrow>
      <Display level={2} as="h1" className="mt-1.5">{L('Juega con tu barrio', 'Play with your neighborhood')}</Display>
      <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-ink-2">
        {L(`Dominó y parchís contra vecinos de ${app.city.split(',')[0]}. Se juega por puntos — nunca por dinero.`,
           `Dominoes and parcheesi against neighbors in ${app.city.split(',')[0]}. You play for points — never for money.`)}
      </p>

      {/* ── Tu progreso ────────────────────────────────────────────────────── */}
      {auth.user ? (
        <section className="mt-4 rounded-card border border-line bg-white p-4">
          {cargando || !progreso ? (
            <div className="h-[86px] animate-shine rounded-field bg-[linear-gradient(90deg,#F1EEFA_0%,#FCFBFF_50%,#F1EEFA_100%)] bg-[length:200%_100%]" />
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Avatar
                  initials={auth.profile?.initials ?? '?'}
                  color={auth.profile?.avatar_color ?? undefined}
                  src={auth.profile?.avatar_url}
                  size={48}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-extrabold text-ink">
                      {auth.profile?.display_name ?? L('Tú', 'You')}
                    </span>
                    <NivelChip nivel={nivel} />
                  </span>
                  <span className="mt-0.5 block text-[12.5px] font-semibold text-muted">
                    {L(`Nivel ${progreso.nivelOrden} de 5`, `Level ${progreso.nivelOrden} of 5`)} · {app.city.split(',')[0]}
                  </span>
                </span>
                <span className="flex-none text-right">
                  <span className="block font-display text-[22px] font-bold leading-none tabular-nums text-ink">
                    {puntosFmt(progreso.puntos)}
                  </span>
                  <Eyebrow className="text-[9.5px]">{L('puntos', 'points')}</Eyebrow>
                </span>
              </div>

              {siguiente && progreso.siguienteDesde ? (
                <div className="mt-3.5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-app">
                    <div className="h-full rounded-full bg-calor" style={{ width: `${avance}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11.5px] font-semibold text-muted">
                    <span>
                      {L(`${puntosFmt(progreso.faltan)} puntos para `, `${puntosFmt(progreso.faltan)} points to `)}
                      <span className="font-extrabold text-ink-2">{siguiente}</span>
                    </span>
                    <span className="font-mono tracking-[.06em]">{progreso.puntos} / {progreso.siguienteDesde}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-3.5 rounded-field bg-tint-pink px-3.5 py-2.5 text-[12px] font-extrabold text-primary-dark">
                  {L('Estás en el nivel más alto. No hay nadie por encima.', 'You’re at the top level. Nobody above you.')}
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        <section className="mt-4 rounded-card border border-dashed border-lilac-ring bg-white p-4 text-center">
          <div className="text-[13.5px] font-bold text-ink-soft">{L('Entra para tener tu nivel', 'Sign in to get your level')}</div>
          <div className="mt-1 text-[12px] font-semibold text-muted">
            {L('Los puntos se ganan recomendando negocios y escribiendo reseñas.', 'You earn points by recommending businesses and writing reviews.')}
          </div>
        </section>
      )}

      {/* ── Los juegos ─────────────────────────────────────────────────────── */}
      <h2 className="mt-5 font-display text-[19px] font-bold tracking-display text-ink">{L('Elige juego', 'Pick a game')}</h2>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        {JUEGOS.map((j) => <TarjetaJuego key={j.clave} juego={j} />)}
      </div>

      {/* ── Ranking ────────────────────────────────────────────────────────── */}
      <div className="mt-5 flex items-baseline justify-between">
        <h2 className="font-display text-[19px] font-bold tracking-display text-ink">{L('Ranking del barrio', 'Neighborhood ranking')}</h2>
        <Eyebrow className="text-[10px]">{app.city.split(',')[0]}</Eyebrow>
      </div>

      {cargando ? (
        <SkeletonList count={3} variant="post" className="mt-2.5 flex flex-col gap-2.5" />
      ) : ranking.length ? (
        <div className="mt-2.5 overflow-hidden rounded-card border border-line bg-white">
          {ranking.map((f, i) => (
            <div key={f.userId}>
              {i > 0 && <div className="mx-3.5 border-t border-hair" />}
              <div className={`flex items-center gap-3 p-3.5 ${f.soyYo ? 'bg-tint-pink' : ''}`}>
                <span className={`w-5 flex-none text-center font-display text-[17px] font-bold tabular-nums ${f.soyYo ? 'text-primary-dark' : 'text-ink'}`}>
                  {f.posicion}
                </span>
                <Avatar initials={f.iniciales} color={f.color} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13.5px] font-extrabold text-ink">
                      {f.soyYo ? L('Tú', 'You') : f.nombre}
                    </span>
                    <NivelChip nivel={lang === 'es' ? f.nivelEs : f.nivelEn} size="sm" />
                  </span>
                </span>
                <span className="flex-none font-display text-[15px] font-bold tabular-nums text-ink">{puntosFmt(f.puntos)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2.5 rounded-card border border-dashed border-lilac-ring bg-white p-8 text-center">
          <div className="text-[13.5px] font-bold text-ink-soft">
            {L('Todavía nadie tiene puntos por aquí', 'Nobody has points around here yet')}
          </div>
          <div className="mt-1 text-[12px] font-semibold text-muted">
            {L('Recomienda un negocio y serás el primero.', 'Recommend a business and you’ll be the first.')}
          </div>
        </div>
      )}

      <p className="mt-4 rounded-field bg-app px-3.5 py-3 text-[11.5px] font-semibold leading-snug text-ink-2">
        {L('Los puntos sirven para tu nivel y el ranking. ', 'Points are for your level and the ranking. ')}
        <span className="font-extrabold text-ink">
          {L('No se cambian por dinero ni por descuentos', 'They can’t be exchanged for money or discounts')}
        </span>
        {L(', y no se puede apostar.', ', and there’s no betting.')}
      </p>
    </div>
  );
}

/** Una tarjeta de juego. Hoy todas llevan PRONTO porque ninguno existe todavía;
 *  el «Avísame» sí es real y guarda en la lista de espera. */
function TarjetaJuego({ juego }: { juego: Juego }) {
  const { L } = useLang();
  const app = useApp();
  const auth = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [email, setEmail] = useState('');
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [cuantos, setCuantos] = useState(0);

  useEffect(() => { void esperaConteo(juego.clave).then(setCuantos); }, [juego.clave, listo]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true); setError('');
    const ok = await apuntarmeLista(juego.clave, email || auth.user?.email || '', app.city);
    setEnviando(false);
    if (ok) { setListo(true); setAbierto(false); }
    else setError(L('Revisa el correo.', 'Check the email.'));
  };

  const { Icono } = juego;
  return (
    <article className="overflow-hidden rounded-card border border-line bg-white">
      <div className={`relative flex h-[104px] items-center justify-center ${juego.tinta}`} style={{ background: juego.raya }}>
        <Icono />
        <span className="absolute right-2 top-2 rounded-full bg-amber-bg px-2 py-0.5 font-mono text-[9px] uppercase tracking-eyebrow text-amber-ink">
          {L('Pronto', 'Soon')}
        </span>
      </div>
      <div className="p-3">
        <h3 className="font-display text-[16px] font-bold tracking-display text-ink">{L(juego.es, juego.en)}</h3>
        <p className="mt-0.5 text-[12px] font-semibold leading-snug text-muted">{L(juego.subEs, juego.subEn)}</p>
        {cuantos > 0 && (
          <p className="mt-1.5 text-[11.5px] font-extrabold text-primary-dark">
            {L(`${cuantos} esperando`, `${cuantos} waiting`)}
          </p>
        )}

        {listo ? (
          <div className="mt-2.5 rounded-field bg-green-bg px-3 py-2.5 text-center text-[12px] font-extrabold text-green-ink">
            {L('Te avisamos', 'We’ll tell you')}
          </div>
        ) : abierto ? (
          <form onSubmit={enviar} className="mt-2.5 flex flex-col gap-1.5">
            <input
              type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={L('Tu correo', 'Your email')}
              className="w-full rounded-field border-[1.5px] border-sys-line-strong bg-white px-3 py-2 text-[12.5px] font-medium text-ink outline-none placeholder:text-muted focus:border-primary"
            />
            <button type="submit" disabled={enviando}
              className="tap w-full cursor-pointer rounded-btn bg-calor px-3 py-2.5 text-[12.5px] font-extrabold text-white shadow-cta disabled:bg-lilac-ring">
              {enviando ? L('Guardando…', 'Saving…') : L('Avísame', 'Notify me')}
            </button>
            {error && <span className="text-[11px] font-bold text-error">{error}</span>}
          </form>
        ) : (
          <button onClick={() => setAbierto(true)}
            className="tap mt-2.5 w-full cursor-pointer rounded-btn border-[1.5px] border-sys-line-strong bg-white px-4 py-2.5 text-[13px] font-extrabold text-ink">
            {L('Avísame', 'Notify me')}
          </button>
        )}
      </div>
    </article>
  );
}
