'use client';

// Eventos (`/eventos`) — Handoff v2: featured banner (purple band), filter
// chips + date chips, event grid with real "Voy" state, detail + tickets.

import { useMemo, useState } from 'react';
import { Check, MapPin, Ticket } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { Card, Chip, Overlay, OverlayTitle, PrimaryBtn } from '@/components/ui';
import { SearchChip } from '@/components/AppHeader';
import { eventTile, type EventItem } from '@/data/fixtures';
import { useLiveData } from '@/lib/live';

const CAT_LABEL = (L: (a: string, b: string) => string): Record<EventItem['cat'], string> => ({
  musica: L('Vida Nocturna', 'Nightlife'),
  mercado: L('Mercado', 'Market'),
  familia: L('Familia', 'Family'),
  comida: L('Comida', 'Food'),
});

export function EventosScreen() {
  const { L } = useLang();
  const app = useApp();
  const { events: EVENTS } = useLiveData();
  const [cat, setCat] = useState<'all' | 'free' | EventItem['cat']>('all');
  const [date, setDate] = useState<'all' | string>('all');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [ticketQty, setTicketQty] = useState(1);
  const [orderDone, setOrderDone] = useState(false);

  const catLabel = CAT_LABEL(L);
  const sl = app.search.trim().toLowerCase();

  const list = useMemo(() => {
    let l = EVENTS.slice();
    if (sl) l = l.filter((e) => `${e.tEs} ${e.tEn} ${e.lEs} ${e.lEn}`.toLowerCase().includes(sl));
    if (cat === 'free') l = l.filter((e) => e.free);
    else if (cat !== 'all') l = l.filter((e) => e.cat === cat);
    if (date !== 'all') l = l.filter((e) => `${e.dEs}-${e.day}` === date);
    return l;
  }, [sl, cat, date, EVENTS]);

  const dates = useMemo(() => {
    const seen = new Set<string>();
    return EVENTS.filter((e) => {
      const k = `${e.dEs}-${e.day}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).map((e) => ({ key: `${e.dEs}-${e.day}`, dEs: e.dEs, day: e.day }));
  }, [EVENTS]);

  const fe = EVENTS[0];
  const feOn = !!app.going[fe.id];
  const detail = detailId !== null ? EVENTS[detailId] : null;
  const detailOn = detail ? !!app.going[detail.id] : false;
  const priceNum = detail && !detail.free ? parseFloat((detail.price ?? '$0').replace('$', '')) : 0;

  const goingBtn = (e: EventItem, big = false) => {
    const on = !!app.going[e.id];
    return (
      <button
        onClick={(ev) => {
          ev.stopPropagation();
          app.toggleGoing(e.id);
        }}
        className={`flex-none cursor-pointer rounded-full px-4 py-2 text-[12.5px] font-extrabold ${big ? 'px-5' : ''} ${
          on ? 'bg-green-bg text-green-dark' : 'bg-primary text-white shadow-cta-sm'
        }`}
      >
        {on ? L('Voy ✓', 'Going ✓') : L('Voy', 'Going')}
      </button>
    );
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[20px] font-extrabold tracking-[-.02em] text-ink lg:text-[26px]">{L('Eventos en tu zona', 'Events near you')}</h1>
        <div className="mt-0.5 text-[12.5px] font-semibold text-muted">
          {L('Descubre, asiste y compra boletos para eventos de tu comunidad latina.', 'Discover, attend and buy tickets for your Latino community.')}
        </div>
      </div>

      <SearchChip count={list.length} className="mb-3.5" />

      {/* featured */}
      <div
        className="relative mb-[22px] flex cursor-pointer flex-col items-start gap-[18px] overflow-hidden rounded-[22px] p-[22px] shadow-band md:flex-row md:items-center md:gap-[26px] md:p-[28px]"
        style={{ background: 'linear-gradient(150deg,#6743E2,#8268FF)' }}
        onClick={() => {
          setDetailId(0);
          setTicketQty(1);
          setOrderDone(false);
        }}
      >
        <span className="flex h-[68px] w-[68px] flex-none flex-col items-center justify-center rounded-2xl bg-white">
          <span className="text-[10.5px] font-extrabold uppercase text-primary-dark">{fe.dEs}</span>
          <span className="text-[26px] font-extrabold leading-none text-ink">{fe.day}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-1.5 inline-block rounded-full bg-[rgba(255,255,255,.2)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.05em] text-white">
            {L('Destacado', 'Featured')}
          </span>
          <span className="block text-[22px] font-extrabold tracking-[-.02em] text-white md:text-[28px]">{L(fe.tEs, fe.tEn)}</span>
          <span className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-[rgba(255,255,255,.85)]">
            <MapPin size={13} strokeWidth={2.4} />
            {L(fe.lEs, fe.lEn)} · {fe.going + (feOn ? 1 : 0)} {L('asisten', 'going')}
          </span>
        </span>
        <button
          onClick={(ev) => {
            ev.stopPropagation();
            if (feOn) app.toggleGoing(fe.id);
            else {
              setDetailId(0);
              setTicketQty(1);
              setOrderDone(false);
            }
          }}
          className={`relative flex-none cursor-pointer rounded-[13px] px-6 py-[13px] text-[14px] font-extrabold ${
            feOn ? 'bg-[rgba(255,255,255,.22)] text-white' : 'bg-white text-primary-press'
          }`}
        >
          {feOn ? L('Voy ✓', 'Going ✓') : L('Comprar boleto', 'Get ticket')}
        </button>
      </div>

      {/* filter chips */}
      <div className="no-scrollbar -mx-3.5 mb-3 flex gap-2 overflow-x-auto px-3.5">
        {(
          [
            ['all', L('Todos', 'All')],
            ['free', L('Gratis', 'Free')],
            ['musica', catLabel.musica],
            ['comida', catLabel.comida],
            ['familia', catLabel.familia],
            ['mercado', catLabel.mercado],
          ] as const
        ).map(([k, lab]) => (
          <Chip key={k} active={cat === k} onClick={() => setCat(k)}>
            {lab}
          </Chip>
        ))}
      </div>

      {/* date chips */}
      <div className="no-scrollbar -mx-3.5 mb-5 flex gap-2 overflow-x-auto px-3.5">
        <button
          onClick={() => setDate('all')}
          className={`flex min-w-[54px] flex-none cursor-pointer items-center justify-center rounded-tile px-3 py-[9px] text-[12.5px] font-extrabold ${
            date === 'all' ? 'bg-primary text-white shadow-cta-sm' : 'bg-white text-ink-soft shadow-[inset_0_0_0_1px_rgba(30,27,46,.08)]'
          }`}
        >
          {L('Todas', 'All')}
        </button>
        {dates.map((d) => (
          <button
            key={d.key}
            onClick={() => setDate(d.key)}
            className={`flex min-w-[54px] flex-none cursor-pointer flex-col items-center rounded-tile px-3 py-[7px] ${
              date === d.key ? 'bg-primary text-white shadow-cta-sm' : 'bg-white text-ink shadow-[inset_0_0_0_1px_rgba(30,27,46,.08)]'
            }`}
          >
            <span className={`text-[9.5px] font-extrabold uppercase ${date === d.key ? 'text-white/80' : 'text-muted'}`}>{d.dEs}</span>
            <span className="text-[15px] font-extrabold leading-tight">{d.day}</span>
          </button>
        ))}
      </div>

      {/* grid */}
      {list.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-[15px] font-extrabold text-ink">{L('Sin resultados', 'No results')}</div>
          <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Prueba quitar algunos filtros.', 'Try removing some filters.')}</div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <Card
              key={e.id}
              className="overflow-hidden transition-shadow hover:shadow-card-lg"
              onClick={() => {
                setDetailId(e.id);
                setTicketQty(1);
                setOrderDone(false);
              }}
            >
              <div className="relative h-[110px]" style={{ background: eventTile(e) }}>
                <span className="absolute left-3 top-3 flex h-[46px] w-[46px] flex-col items-center justify-center rounded-btn bg-white shadow-card">
                  <span className="text-[9px] font-extrabold uppercase text-primary-dark">{e.dEs}</span>
                  <span className="text-[17px] font-extrabold leading-none text-ink">{e.day}</span>
                </span>
                <span
                  className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold"
                  style={{ background: e.free ? '#E3F5EA' : '#FCEFD6', color: e.free ? '#1F8A4C' : '#9A6A12' }}
                >
                  {e.free ? L('Gratis', 'Free') : e.price}
                </span>
              </div>
              <div className="p-3.5">
                <div className="text-[10px] font-extrabold uppercase tracking-[.05em] text-muted">{catLabel[e.cat]}</div>
                <div className="mt-1 text-[15px] font-extrabold text-ink">{L(e.tEs, e.tEn)}</div>
                <div className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-muted">
                  <MapPin size={12} strokeWidth={2.4} />
                  {L(e.lEs, e.lEn)}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-hair pt-3">
                  <span className="text-[11.5px] font-bold text-muted-2">
                    {e.going + (app.going[e.id] ? 1 : 0)} {L('asisten', 'going')}
                  </span>
                  {goingBtn(e)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* event detail + tickets */}
      <Overlay open={!!detail} onClose={() => setDetailId(null)} width={480}>
        {detail && !orderDone && (
          <>
            <div className="relative -m-4 mb-3 h-[130px] rounded-t-panel md:-m-5 md:mb-3 md:rounded-t-card" style={{ background: eventTile(detail) }}>
              <span className="absolute left-4 top-4 flex h-[52px] w-[52px] flex-col items-center justify-center rounded-btn bg-white shadow-card">
                <span className="text-[9.5px] font-extrabold uppercase text-primary-dark">{detail.dEs}</span>
                <span className="text-[19px] font-extrabold leading-none text-ink">{detail.day}</span>
              </span>
            </div>
            <OverlayTitle title={L(detail.tEs, detail.tEn)} onClose={() => setDetailId(null)} />
            <div className="text-[12.5px] font-bold text-muted">
              {L(detail.timeEs, detail.timeEn)} · {L(detail.lEs, detail.lEn)}
            </div>
            <div className="mt-1 text-[12px] font-bold text-muted-2">
              {detail.going + (detailOn ? 1 : 0)} {L('asisten', 'going')} · {detail.free ? L('Gratis', 'Free') : detail.price}
            </div>
            <div className="mt-3 border-t border-hair pt-3">
              <div className="mb-1.5 text-[13.5px] font-extrabold text-ink">{L('Acerca del evento', 'About the event')}</div>
              <div className="text-[13.5px] font-medium leading-[1.55] text-ink-soft">{L(detail.descEs, detail.descEn)}</div>
            </div>

            {detail.free ? (
              <PrimaryBtn
                className={`mt-5 ${detailOn ? '!bg-green-bg !text-green-dark !shadow-none' : ''}`}
                onClick={() => app.toggleGoing(detail.id)}
              >
                {detailOn ? L('Voy ✓', 'Going ✓') : L('Asistir · Gratis', 'Attend · Free')}
              </PrimaryBtn>
            ) : (
              <div className="mt-5">
                <div className="flex items-center justify-between rounded-btn-lg bg-lilac-2 px-4 py-3">
                  <span className="flex items-center gap-2 text-[13px] font-extrabold text-ink">
                    <Ticket size={16} strokeWidth={2.2} className="text-primary" />
                    {L('Boletos', 'Tickets')} · {detail.price}
                  </span>
                  <span className="flex items-center gap-3 rounded-full bg-white px-2 py-1">
                    <button onClick={() => setTicketQty(Math.max(1, ticketQty - 1))} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-[16px] font-extrabold">−</button>
                    <span className="w-4 text-center text-[14px] font-extrabold">{ticketQty}</span>
                    <button onClick={() => setTicketQty(ticketQty + 1)} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-[16px] font-extrabold">+</button>
                  </span>
                </div>
                <PrimaryBtn className="mt-3" onClick={() => setOrderDone(true)}>
                  {L('Comprar ', 'Buy ')}{ticketQty} · ${(priceNum * ticketQty).toFixed(2)}
                </PrimaryBtn>
              </div>
            )}
          </>
        )}
        {detail && orderDone && (
          <div className="flex flex-col items-center px-2 py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg">
              <Check size={28} strokeWidth={3} className="text-green" />
            </span>
            <div className="mt-4 text-[19px] font-extrabold text-ink">{L('¡Boletos confirmados!', 'Tickets confirmed!')}</div>
            <div className="mt-1.5 max-w-[300px] text-[13px] font-semibold leading-relaxed text-muted">
              {L('Te enviamos los boletos por correo. ¡Nos vemos en el evento!', "We've emailed your tickets. See you at the event!")}
            </div>
            <PrimaryBtn
              className="mt-5"
              onClick={() => {
                if (!detailOn) app.toggleGoing(detail.id);
                setDetailId(null);
                setOrderDone(false);
              }}
            >
              {L('Listo', 'Done')}
            </PrimaryBtn>
          </div>
        )}
      </Overlay>
    </div>
  );
}
