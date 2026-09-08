'use client';

// La mesa de dominó. Aprobada por captura el 2026-09-08.
//
// QUÉ DECIDE ESTA PANTALLA: nada. Pinta lo que devuelve `domino_estado()` y
// manda intenciones. Las reglas, el reparto, el turno y el reloj viven en la
// base (migraciones 0160 y 0161) — si vivieran aquí, se cambiarían desde las
// herramientas del navegador.
//
// LO QUE NO SE PUEDE VER: la mano del rival. No es que no se pinte; es que no
// llega. La tabla de manos no tiene ninguna política de lectura y el canal de
// tiempo real no la publica. De ahí solo llega «cuántas fichas le quedan».

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconChevronLeft as Atras } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { Avatar, Display, Eyebrow, NivelChip, PrimaryBtn, TertiaryBtn } from '@/components/ui';
import { Ficha } from '@/components/Ficha';
import {
  estadoMesa, ponerFicha, robar, pasar, encajaEn, escucharMesa,
  type EstadoMesa, type Ficha as FichaTipo,
} from '@/lib/domino';


export function DominoMesaScreen() {
  const { L } = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const auth = useAuth();
  const partida = params?.get('p') ?? '';

  const [st, setSt] = useState<EstadoMesa | null>(null);
  const [elegida, setElegida] = useState<FichaTipo | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [reloj, setReloj] = useState(0);

  const refrescar = useCallback(async () => {
    const s = await estadoMesa(partida);
    setSt(s);
    if (s?.segundos != null) setReloj(s.segundos);
  }, [partida]);

  // Primera carga + tiempo real. El canal solo avisa de que algo cambió; la
  // verdad se vuelve a pedir al servidor, que es quien filtra.
  useEffect(() => {
    if (!partida) return;
    void refrescar();
    const off = escucharMesa(partida, () => { void refrescar(); });
    // Red de seguridad: si el canal se cae (móvil que cambia de red), se
    // consulta igual cada 8 s. Sin esto, una partida se queda muda y parece
    // rota cuando solo se perdió el socket.
    const t = window.setInterval(() => { void refrescar(); }, 8000);
    return () => { off(); window.clearInterval(t); };
  }, [partida, refrescar]);


  // Cuenta atrás DECORATIVA sobre el número del servidor. Quien decide si el
  // turno venció es Postgres; esto solo hace que el número baje en pantalla.
  useEffect(() => {
    if (!st || st.estado !== 'jugando') return;
    const t = window.setInterval(() => setReloj((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [st?.estado, st?.meToca]);

  // Al llegar a cero, se pregunta al servidor: es él quien aplica el
  // vencimiento (lo hace dentro de `domino_estado`).
  const cero = useRef(false);
  useEffect(() => {
    if (reloj === 0 && !cero.current && st?.estado === 'jugando') {
      cero.current = true;
      void refrescar().then(() => { cero.current = false; });
    }
  }, [reloj, st?.estado, refrescar]);

  const jugar = async (f: FichaTipo, lado: 'izq' | 'der') => {
    if (enviando) return;
    setEnviando(true);
    const ok = await ponerFicha(partida, f, lado);
    setEnviando(false);
    setElegida(null);
    if (ok) await refrescar();
  };

  const tocar = (f: FichaTipo) => {
    if (!st?.meToca || enviando) return;
    const lados = encajaEn(f, st.izq, st.der);
    if (lados.length === 0) return;
    // Si solo cabe de un lado, se pone sola: un toque menos en la mayoría de
    // las jugadas. Solo se pregunta cuando de verdad hay que elegir.
    if (lados.length === 1) void jugar(f, lados[0]);
    else setElegida(f);
  };

  if (!partida) return null;

  if (!st) {
    return (
      <div className="px-3.5 py-10 text-center text-[13.5px] font-bold text-muted">
        {L('Abriendo la mesa…', 'Opening the table…')}
      </div>
    );
  }

  // ── Esperando rival ───────────────────────────────────────────────────────
  if (st.estado === 'esperando') {
    return (
      <div className="px-3.5 py-6">
        <Volver router={router} />
        <div className="mt-4 rounded-card border border-dashed border-lilac-ring bg-white p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 animate-shine items-center justify-center rounded-tile bg-[linear-gradient(90deg,#F1EEFA_0%,#FCFBFF_50%,#F1EEFA_100%)] bg-[length:200%_100%]" />
          <Display level={3} as="h1">{L('Esperando rival', 'Waiting for a rival')}</Display>
          <p className="mt-1.5 text-[12.5px] font-semibold text-muted">
            {L('Tu mesa ya está abierta. En cuanto entre alguien de tu ciudad, empiezan.',
               'Your table is open. As soon as someone from your city sits down, you start.')}
          </p>
        </div>
      </div>
    );
  }

  // ── Terminada ─────────────────────────────────────────────────────────────
  if (st.estado === 'terminada') {
    const gane = st.ganador === auth.user?.id;
    const motivo = st.motivoFin === 'domino' ? L('¡Dominó!', 'Dominoes!')
      : st.motivoFin === 'tranque' ? L('Se trancó', 'Blocked game')
      : L('El otro no volvió', 'The other player didn’t come back');
    return (
      <div className="px-3.5 py-6">
        <Volver router={router} />
        <div className={`mt-4 rounded-card border p-8 text-center ${gane ? 'border-primary bg-tint-pink' : 'border-line bg-white'}`}>
          <Eyebrow>{motivo}</Eyebrow>
          <Display level={2} as="h1" className="mt-1.5">
            {gane ? L('Ganaste', 'You won') : L('Perdiste', 'You lost')}
          </Display>
          {gane && (
            <p className="mt-2 text-[13px] font-extrabold text-primary-dark">{L('+25 puntos', '+25 points')}</p>
          )}
          <div className="mt-5 flex flex-col gap-2">
            <PrimaryBtn onClick={() => router.push('/comunidad/juegos/')}>
              {L('Otra partida', 'Another game')}
            </PrimaryBtn>
            <TertiaryBtn onClick={() => router.push('/comunidad/')}>
              {L('Volver al muro', 'Back to the feed')}
            </TertiaryBtn>
          </div>
        </div>
      </div>
    );
  }

  // ── Jugando ───────────────────────────────────────────────────────────────
  const lados = elegida ? encajaEn(elegida, st.izq, st.der) : [];
  const puedeRobar = st.meToca && !st.puedoJugar && st.pozo > 0;
  const puedePasar = st.meToca && !st.puedoJugar && st.pozo === 0;

  return (
    <div className="pb-6">
      {/* Cabecera: el rival y el pozo */}
      <div id="cabecera-mesa" className="sticky top-0 z-10 border-b border-hair bg-white/90 px-3 py-2.5 backdrop-blur-[18px]">
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.push('/comunidad/juegos/')}
            aria-label={L('Salir', 'Leave')}
            className="tap flex h-9 w-9 flex-none items-center justify-center rounded-icon text-ink">
            <Atras size={19} stroke={2.4} />
          </button>
          <Avatar initials={st.rivalIniciales || '?'} color={st.rivalColor || undefined} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-extrabold text-ink">
              {st.rivalNombre || L('Tu rival', 'Your rival')}
            </span>
            <Eyebrow className="text-[10px]">
              {st.fichasRival === 1 ? L('le queda 1 ficha', '1 tile left') : L(`${st.fichasRival} fichas`, `${st.fichasRival} tiles`)}
            </Eyebrow>
          </span>
          <span className="flex flex-none flex-col items-end">
            <span className="font-display text-[15px] font-bold leading-none tabular-nums text-ink">{st.pozo}</span>
            <Eyebrow className="text-[9px]">{L('pozo', 'boneyard')}</Eyebrow>
          </span>
        </div>
      </div>

      {/* La mesa */}
      <div className="px-3 pt-3">
        <div className="rounded-card border border-line bg-app p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <Eyebrow className="text-[10px]">{L('La mesa', 'The table')}</Eyebrow>
            <Eyebrow className="text-[10px]">
              {st.mesa.length === 1 ? L('1 puesta', '1 played') : L(`${st.mesa.length} puestas`, `${st.mesa.length} played`)}
            </Eyebrow>
          </div>

          {/* Los extremos abiertos, SIEMPRE visibles. La cadena se sale de la
              pantalla y el número del final quedaba escondido: sin ver los dos
              números no sabes qué te encaja, que es la única pregunta del juego. */}
          {st.izq != null && (
            <div className="mb-2.5 flex items-center gap-2 rounded-field bg-white px-3 py-2">
              <Eyebrow className="text-[9.5px]">{L('Abiertos', 'Open ends')}</Eyebrow>
              <span className="flex flex-1 items-center justify-center gap-2">
                <span className="flex h-8 min-w-8 items-center justify-center rounded-tile bg-ink px-2 font-display text-[15px] font-bold text-white">{st.izq}</span>
                <span className="text-[11px] font-extrabold text-muted-2">{L('y', 'and')}</span>
                <span className="flex h-8 min-w-8 items-center justify-center rounded-tile bg-ink px-2 font-display text-[15px] font-bold text-white">{st.der}</span>
              </span>
            </div>
          )}

          <CadenaMesa fichas={st.mesa} />
        </div>
      </div>

      {/* Turno y reloj */}
      <div className="px-3 pt-3">
        <div className="flex items-center gap-2.5 rounded-card border border-line bg-white px-3.5 py-3">
          <span className={`h-2.5 w-2.5 flex-none rounded-full ${st.meToca ? 'bg-primary' : 'bg-muted-faint'}`} />
          <span className="flex-1 text-[13.5px] font-extrabold text-ink">
            {st.meToca
              ? (st.puedoJugar ? L('Te toca — pon una ficha', 'Your turn — play a tile')
                 : st.pozo > 0 ? L('No tienes ficha: roba del pozo', 'Nothing fits: draw from the boneyard')
                 : L('No tienes ficha: pasa', 'Nothing fits: pass'))
              : L('Espera a tu rival', 'Waiting for your rival')}
          </span>
          <span className="font-mono text-[11px] tabular-nums tracking-[.08em] text-muted">
            0:{String(reloj).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Elegir extremo — solo cuando la ficha encaja en los dos */}
      {elegida && lados.length > 1 && (
        <div className="px-3 pt-2.5">
          <div className="rounded-card border-[1.5px] border-primary bg-tint-pink px-3.5 py-3">
            <div className="text-[12.5px] font-extrabold text-primary-dark">{L('¿De qué lado la pones?', 'Which end?')}</div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => void jugar(elegida, 'izq')}
                className="tap flex-1 cursor-pointer rounded-btn border-[1.5px] border-sys-line-strong bg-white px-3 py-2.5 text-[13px] font-extrabold text-ink">
                {L('Izquierda', 'Left')} <span className="font-mono text-[11px] text-muted">· {st.izq}</span>
              </button>
              <button onClick={() => void jugar(elegida, 'der')}
                className="tap flex-1 cursor-pointer rounded-btn border-[1.5px] border-sys-line-strong bg-white px-3 py-2.5 text-[13px] font-extrabold text-ink">
                {L('Derecha', 'Right')} <span className="font-mono text-[11px] text-muted">· {st.der}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mi mano */}
      <div className="px-3 pt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <Eyebrow className="text-[10px]">{L('Tu mano', 'Your hand')}</Eyebrow>
          <span className="text-[11.5px] font-extrabold text-muted">
            {L('Las que puedes poner se ven encendidas', 'Playable tiles are lit up')}
          </span>
        </div>
        <div id="mi-mano" className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {st.miMano.map((f, i) => {
            const cabe = encajaEn(f, st.izq, st.der).length > 0;
            return (
              <Ficha
                key={`${f[0]}-${f[1]}-${i}`}
                ficha={f}
                dir="v"
                px={38}
                estado={st.meToca && cabe ? 'jugable' : st.meToca ? 'apagada' : 'normal'}
                seleccionada={!!elegida && elegida[0] === f[0] && elegida[1] === f[1]}
                onClick={() => tocar(f)}
              />
            );
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={() => { void robar(partida).then(refrescar); }} disabled={!puedeRobar}
            className="tap flex-1 cursor-pointer rounded-btn border-[1.5px] border-sys-line-strong bg-white px-4 py-3 text-[13px] font-extrabold text-ink disabled:cursor-not-allowed disabled:text-muted-2">
            {L('Robar del pozo', 'Draw a tile')}
          </button>
          <button onClick={() => { void pasar(partida).then(refrescar); }} disabled={!puedePasar}
            className="tap flex-1 cursor-pointer rounded-btn border-[1.5px] border-sys-line-strong bg-white px-4 py-3 text-[13px] font-extrabold text-ink disabled:cursor-not-allowed disabled:text-muted-2">
            {L('Pasar', 'Pass')}
          </button>
        </div>
        <p className="mt-2.5 text-[11.5px] font-semibold leading-snug text-muted">
          {L('Solo puedes robar o pasar cuando no tengas ninguna ficha que encaje.',
             'You can only draw or pass when nothing in your hand fits.')}
        </p>
      </div>
    </div>
  );
}

/** La cadena. Arranca mostrando el FINAL, que es donde acaba de jugar el rival
 *  y donde vas a jugar tú — empezar por el principio obliga a arrastrar en cada
 *  turno. */
function CadenaMesa({ fichas }: { fichas: FichaTipo[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [fichas.length]);
  return (
    <div id="cadena-mesa" ref={ref} className="no-scrollbar flex min-h-[92px] items-center gap-1 overflow-x-auto">
      {fichas.map((f, i) => <Ficha key={i} ficha={f} dir="h" px={26} />)}
    </div>
  );
}

function Volver({ router }: { router: ReturnType<typeof useRouter> }) {
  const { L } = useLang();
  return (
    <button onClick={() => router.push('/comunidad/juegos/')}
      className="tap flex cursor-pointer items-center gap-1.5 text-[13px] font-extrabold text-ink">
      <Atras size={17} stroke={2.4} />
      {L('Sala de juegos', 'Game room')}
    </button>
  );
}
