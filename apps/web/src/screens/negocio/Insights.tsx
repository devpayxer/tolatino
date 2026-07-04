'use client';

// Resumen (Insights) — the panel home. Verified/Premium: live revenue, KPIs
// with sparklines, week chart, channel mix, live order queue, top sellers,
// customer pulse, module health, activity, "needs attention". Free: limited
// KPIs, verification checklist and plan comparison.

import { useState } from 'react';
import { Calendar, Check, Eye, Lock, ShoppingBag, Star, Ticket, Truck, User, Utensils, DollarSign } from 'lucide-react';
import { BigChart, Donut, HourBar, Spark } from '@/components/charts';
import type { PanelCtx } from '@/screens/negocio/tabs';

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';

export function InsightsPaid({ ctx }: { ctx: PanelCtx }) {
  const { L, es, isPremium } = ctx;
  const [metric, setMetric] = useState<'revenue' | 'orders' | 'ticket'>('revenue');

  const kpis = [
    { Icon: ShoppingBag, c: '#7B61FF', bg: '#F1EFFA', label: L('Ingresos · 7 días', 'Revenue · 7 days'), value: '$12,432', delta: '▲ 18%', spark: [820, 1140, 980, 1320, 1480, 1840, 1280] },
    { Icon: Utensils, c: '#F0466E', bg: '#FDE7EF', label: L('Pedidos · 7 días', 'Orders · 7 days'), value: '412', delta: '▲ 11%', spark: [42, 58, 49, 66, 72, 84, 61] },
    { Icon: Calendar, c: '#1F9D57', bg: '#E3F5EA', label: L('Reservas · 7 días', 'Reservations'), value: '38', delta: '▲ 22%', spark: [3, 4, 4, 5, 5, 6, 6] },
    { Icon: Eye, c: '#F4B740', bg: '#FCEFD6', label: L('Vistas del listado', 'Listing views'), value: '8,124', delta: '▲ 31%', spark: [820, 940, 1100, 980, 1280, 1480, 1620] },
  ];

  const series = {
    revenue: { t: [820, 1140, 980, 1320, 1480, 1840, 1280], l: [760, 980, 890, 1180, 1240, 1620, 1150], c: '#7B61FF' },
    orders: { t: [42, 58, 49, 66, 72, 84, 61], l: [38, 49, 44, 59, 62, 72, 55], c: '#F0466E' },
    ticket: { t: [19, 20, 20.4, 20.2, 21, 22, 21], l: [18, 19, 19.2, 19.4, 20, 21, 20], c: '#1F9D57' },
  } as const;
  const days = es ? ['Mié', 'Jue', 'Vie', 'Sáb', 'Dom', 'Lun', 'Mar'] : ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];

  const channels: [string, string, string][] = [
    ['#7B61FF', L('Mostrador', 'Dine-in'), '42%'],
    ['#F0466E', L('Recoger', 'Pickup'), '24%'],
    ['#1F9D57', L('Entrega', 'Delivery'), '22%'],
    ['#F4B740', 'Catering', '12%'],
  ];

  const todos = [
    { done: false, nm: L('3 reseñas necesitan respuesta', '3 reviews need a reply'), mt: L('Promedio bajó a 4.6 · responde en 24h', 'Avg dropped to 4.6 · respond within 24h'), btn: L('Abrir', 'Open') },
    { done: false, nm: L('Quesabirria casi agotada', 'Quesabirria running low'), mt: L('Solo 14 para mañana · se pausa en 0', 'Only 14 left for tomorrow · auto-paused at 0'), btn: L('Reabastecer', 'Restock') },
    { done: true, nm: L('Catering del viernes confirmado', "Friday's catering confirmed"), mt: L('Bellaire Tech · 80 personas · asignado a Marco', 'Bellaire Tech · 80 ppl · assigned to Marco'), btn: null },
    { done: false, nm: L('Menú de Halloween — borrador', 'Halloween menu — draft'), mt: L('5 platillos · lanza el viernes', '5 dishes · launch Friday'), btn: L('Continuar', 'Continue') },
  ];

  const queue = [
    { label: L('Nuevos', 'New'), n: '3', dot: '#F0466E', cards: [{ id: '#2487', who: 'María L.', what: `2× Quesabirria, Horchata`, price: '$48.20', mode: L('Entrega', 'Delivery'), time: L('ahora', 'now'), timeC: '#F0466E' }, { id: '#2486', who: L('Mesa 7', 'Table 7'), what: '3× Tacos al pastor', price: '$72.50', mode: L('Mostrador', 'Dine-in'), time: '2m', timeC: '#9A96AE' }] },
    { label: L('Preparando', 'Preparing'), n: '5', dot: '#F4B740', cards: [{ id: '#2484', who: 'James T.', what: '2× Tortas, 1× Gringa', price: '$36.40', mode: L('Entrega', 'Delivery'), time: '8m', timeC: '#9A96AE' }, { id: '#2483', who: L('Mesa 12', 'Table 12'), what: L('Degustación · plato 2/5', 'Tasting · course 2/5'), price: '$280', mode: L('Mostrador', 'Dine-in'), time: '12m', timeC: '#F4B740' }] },
    { label: L('Listos', 'Ready'), n: '2', dot: '#1F9D57', cards: [{ id: '#2481', who: 'Carlos · Reparto', what: '1× Torta ahogada, 2× Tacos', price: '$24.50', mode: L('Repartidor', 'Driver'), time: L('listo 3m', 'ready 3m'), timeC: '#1F9D57' }] },
    { label: L('Completados', 'Completed'), n: L('68 hoy', '68 today'), dot: '#9A96AE', cards: [{ id: '#2479', who: L('Mesa 5', 'Table 5'), what: L('Cena para 4', 'Dinner for 4'), price: '$186', mode: L('Pagado', 'Paid'), time: '8m', timeC: '#9A96AE' }] },
  ];

  const sellers = [
    { nm: 'Taco al Pastor', meta: L('Tacos · 184 vendidos', 'Tacos · sold 184'), rev: '$1,840', img: '#F3E2CE 0 7px,#ECD3B4 7px 14px', barC: '#7B61FF', bar: '100%' },
    { nm: 'Quesabirria', meta: L('Especialidad · 142 vendidos', 'Specialty · sold 142'), rev: '$1,704', img: '#FCE3DC 0 7px,#F6CEC2 7px 14px', barC: '#9579FF', bar: '82%' },
    { nm: 'Horchata', meta: L('Bebidas · 126', 'Drinks · 126'), rev: '$630', img: '#FBEFD3 0 7px,#F5E1B0 7px 14px', barC: '#B9A6FF', bar: '64%' },
    { nm: L('Menú Catering', 'Catering menu'), meta: L('Por encargo · 42', 'Custom · 42'), rev: '$4,200', img: '#EAE2F8 0 7px,#DCCEF2 7px 14px', barC: '#F4B740', bar: '48%' },
  ];

  const pulse = [
    { l: L('Nuevos/sem', 'New this week'), v: '62', d: '▲ 28%', dC: '#1F9D57' },
    { l: L('Recurrentes', 'Returning'), v: '72%', d: '▲ 4pp', dC: '#1F9D57' },
    { l: L('LTV prom.', 'Avg LTV'), v: '$184', d: '▲ 9%', dC: '#1F9D57' },
    { l: L('Reseñas', 'Reviews avg'), v: '4.8★', d: '▼ 0.1', dC: '#F0466E' },
  ];

  const modHealth = [
    { nm: L('Menú', 'Food menu'), sub: L('68 items · 3 bajo stock', '68 items · 3 low'), bg: '#FCEFD6', Icon: Utensils, c: '#B5791A', stat: '$8.4k', delta: '▲ 12%' },
    { nm: L('Reservas', 'Bookings'), sub: L('24 próximas · 96%', '24 upcoming · 96%'), bg: '#E4ECFB', Icon: Calendar, c: '#2A5C8A', stat: '24', delta: '▲ 22%' },
    { nm: L('Entrega', 'Delivery'), sub: L('142 pedidos · 3 activos', '142 orders · 3 active'), bg: '#E3F5EA', Icon: Truck, c: '#1F8A4C', stat: '142', delta: '▲ 18%' },
  ];

  const activity = [
    { Icon: ShoppingBag, bg: '#F1EFFA', c: '#6D4DF6', line: L('María L. hizo un pedido de entrega — 2× Quesabirria, Horchata.', 'María L. placed a delivery order — 2× Quesabirria, Horchata.'), meta: L('hace 2 min · #2487', '2 min ago · #2487'), right: '$48.20', rs: 'bg-pink-bg text-pink-dark' },
    { Icon: Star, bg: '#FCEFD6', c: '#B5791A', line: L('James T. dejó una reseña de 4 estrellas.', 'James T. left a 4-star review.'), meta: L('hace 14 min', '14 min ago'), right: L('Responder', 'Reply'), rs: 'bg-lilac-2 text-primary-dark' },
    { Icon: Calendar, bg: '#E4ECFB', c: '#2A5C8A', line: L('Daniel K. reservó el menú degustación para 2 el viernes.', 'Daniel K. booked the tasting menu for 2 on Friday.'), meta: L('hace 32 min', '32 min ago'), right: L('Confirmado', 'Confirmed'), rs: 'bg-lilac-2 text-primary-dark' },
    { Icon: DollarSign, bg: '#E3F5EA', c: '#1F8A4C', line: L('Pago de $4,184.20 enviado a tu cuenta — liquida 16 jul.', 'Payout of $4,184.20 sent — settles Jul 16.'), meta: L('hace 2h · Chase ••4421', '2h ago · Chase ••4421'), right: L('Pagado', 'Paid'), rs: 'bg-green-bg text-green-dark' },
    { Icon: Ticket, bg: '#FDE7EF', c: '#D6336C', line: L('3 boletos vendidos para Cena de Halloween · 32/48.', '3 tickets sold for Halloween dinner · 32/48.'), meta: L('hace 3h', '3h ago'), right: '+$420', rs: 'text-muted-2' },
  ];

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* live revenue + hours + needs attention */}
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-card-sm bg-ink p-5 text-white shadow-card-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-[.05em] text-[rgba(255,255,255,.6)]">{L('Ingresos de hoy · en vivo', "Today's revenue · live")}</span>
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-[rgba(255,255,255,.5)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green" />
              {L('hace 12 seg', 'updated 12s ago')}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <span className="text-[38px] font-extrabold tracking-[-.02em]">$1,847</span>
            <span className="rounded-lg bg-[rgba(31,157,87,.25)] px-2 py-1 text-[11.5px] font-extrabold text-[#7BE0A8]">▲ 12% {L('vs. martes promedio', 'vs avg Tuesday')}</span>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[10.5px] font-bold text-[rgba(255,255,255,.5)]">
              <span>{L('meta', 'goal')} $2,500</span>
              <span>74%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,.14)]">
              <div className="h-full rounded-full bg-primary" style={{ width: '74%' }} />
            </div>
          </div>
          <div className="mt-4">
            <HourBar />
            <div className="mt-1 flex justify-between text-[9.5px] font-bold text-[rgba(255,255,255,.4)]">
              <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
            </div>
          </div>
          {/* handoff stats row: pedidos / ticket prom. / nuevos */}
          <div className="mt-3.5 flex gap-7 border-t border-[rgba(255,255,255,.12)] pt-3.5">
            {(
              [
                [L('pedidos', 'orders'), '68'],
                [L('ticket prom.', 'avg ticket'), '$27.16'],
                [L('Nuevos', 'New'), '14'],
              ] as const
            ).map(([l, v]) => (
              <span key={l}>
                <span className="block text-[10px] font-semibold text-[rgba(255,255,255,.55)]">{l}</span>
                <span className="block text-[16px] font-extrabold">{v}</span>
              </span>
            ))}
          </div>
        </div>

        <div className={`${cardCls} p-4`}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[14px] font-extrabold text-ink">{L('Requiere tu atención', 'Needs attention')}</span>
            <span className="rounded-full bg-amber-bg px-2 py-0.5 text-[10.5px] font-extrabold text-amber-ink">
              {todos.filter((t) => !t.done).length} {L('pendientes', 'items')}
            </span>
          </div>
          {todos.map((t, i) => (
            <div key={t.nm} className={`flex items-center gap-3 py-2.5 ${i < todos.length - 1 ? 'border-b border-hair' : ''}`}>
              <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${t.done ? 'border-green bg-green' : 'border-[#D8D2E6] bg-white'}`}>
                {t.done && <Check size={11} strokeWidth={3.6} className="text-white" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[12.5px] font-extrabold ${t.done ? 'text-muted line-through' : 'text-ink'}`}>{t.nm}</span>
                <span className="block text-[10.5px] font-semibold text-muted-2">{t.mt}</span>
              </span>
              {t.btn && <button className="flex-none cursor-pointer rounded-[9px] bg-lilac-2 px-2.5 py-1.5 text-[10.5px] font-extrabold text-primary-dark">{t.btn}</button>}
            </div>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${cardCls} p-3.5`}>
            <div className="flex items-start justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: k.bg }}>
                <k.Icon size={15} strokeWidth={2.2} style={{ color: k.c }} />
              </span>
              <Spark pts={k.spark} color={k.c} />
            </div>
            <div className="mt-2 text-[11px] font-bold text-muted">{k.label}</div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-[19px] font-extrabold text-ink">{k.value}</span>
              <span className="text-[10.5px] font-extrabold text-green">{k.delta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* revenue chart + channel mix */}
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className={`${cardCls} p-4 md:p-5`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[14px] font-extrabold text-ink">{L('Ingresos', 'Revenue')}</span>
            <span className="inline-flex gap-1 rounded-[9px] bg-lilac-2 p-1">
              {(
                [
                  ['revenue', L('Ingresos', 'Revenue')],
                  ['orders', L('Pedidos', 'Orders')],
                  ['ticket', L('Ticket', 'Avg ticket')],
                ] as const
              ).map(([k, lab]) => (
                <button key={k} onClick={() => setMetric(k)} className={`cursor-pointer rounded-[7px] px-2.5 py-1 text-[10.5px] font-extrabold ${metric === k ? 'bg-white text-primary-dark shadow-sm' : 'text-muted-2'}`}>
                  {lab}
                </button>
              ))}
            </span>
          </div>
          <BigChart thisW={[...series[metric].t]} lastW={[...series[metric].l]} days={days} color={series[metric].c} />
        </div>
        <div className={`${cardCls} p-4 md:p-5`}>
          <div className="mb-3 text-[14px] font-extrabold text-ink">{L('Mezcla de canales', 'Channel mix')}</div>
          <div className="flex items-center gap-4">
            <Donut centerLabel="$12.4k" subLabel={L('ESTA SEM', 'THIS WK')} />
            <div className="flex flex-1 flex-col gap-2">
              {channels.map(([c, label, pct]) => (
                <div key={label} className="flex items-center gap-2 text-[12px] font-bold text-ink-soft">
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: c }} />
                  <span className="flex-1">{label}</span>
                  <span className="font-extrabold text-ink">{pct}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 rounded-btn-lg bg-lilac-2 p-3">
            <div className="text-[12px] font-extrabold text-primary-dark">📈 {L('Catering subió 38% este mes', 'Catering up 38% this month')}</div>
            <div className="mt-0.5 text-[11px] font-semibold text-ink-3">{L('Agrega el menú degustación para grupos.', 'Add the tasting menu for groups.')}</div>
          </div>
        </div>
      </div>

      {/* live order queue */}
      <div className={`${cardCls} p-4 md:p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[14px] font-extrabold text-ink">
            {L('Cola de pedidos en vivo', 'Live order queue')} <span className="text-[11.5px] font-bold text-muted">· 10 {L('en curso', 'in flight')}</span>
          </span>
          <button onClick={() => ctx.go('orders')} className="cursor-pointer text-[12px] font-extrabold text-primary-dark">{L('Abrir cola', 'Open queue')} →</button>
        </div>
        {/* horizontal scroll columns on mobile (handoff); grid at md+ */}
        <div className="no-scrollbar -mx-4 flex min-w-0 gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-2 md:px-0 xl:grid-cols-4">
          {queue.map((col) => (
            <div key={col.label} className="w-[218px] flex-none rounded-btn-lg bg-app p-3 md:w-auto">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[.04em] text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
                {col.label} · {col.n}
              </div>
              <div className="flex flex-col gap-2">
                {col.cards.map((c) => (
                  <div key={c.id} className="rounded-[10px] border border-hair bg-white p-2.5">
                    <div className="flex items-center justify-between text-[11.5px] font-extrabold text-ink">
                      <span>{c.id} · {c.who}</span>
                      <span style={{ color: c.timeC }}>{c.time}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] font-semibold text-muted">{c.what}</div>
                    <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
                      <span className="text-muted-2">{c.mode}</span>
                      <span className="font-extrabold text-ink">{c.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* sellers + pulse + module health */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className={`${cardCls} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[14px] font-extrabold text-ink">{L('Más vendidos · semana', 'Top sellers · week')}</span>
            <button onClick={() => ctx.go('menu')} className="cursor-pointer text-[11.5px] font-extrabold text-primary-dark">{L('Gestionar menú', 'Manage menu')}</button>
          </div>
          <div className="flex flex-col gap-3">
            {sellers.map((s) => (
              <div key={s.nm} className="flex items-center gap-2.5">
                <span className="h-9 w-9 flex-none rounded-[9px]" style={{ background: `repeating-linear-gradient(135deg,${s.img})` }} />
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between text-[12px] font-extrabold text-ink">
                    <span className="truncate">{s.nm}</span>
                    <span>{s.rev}</span>
                  </span>
                  <span className="block text-[10.5px] font-semibold text-muted-2">{s.meta}</span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-lilac-2">
                    <span className="block h-full rounded-full" style={{ width: s.bar, background: s.barC }} />
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className={`${cardCls} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[14px] font-extrabold text-ink">{L('Pulso de clientes', 'Customer pulse')}</span>
            <button onClick={() => ctx.go('customers')} className="cursor-pointer text-[11.5px] font-extrabold text-primary-dark">{L('Ver todo', 'See all')}</button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {pulse.map((p) => (
              <div key={p.l} className="rounded-btn-lg bg-app p-3">
                <div className="text-[10.5px] font-bold text-muted">{p.l}</div>
                <div className="mt-0.5 text-[18px] font-extrabold text-ink">{p.v}</div>
                <div className="text-[10.5px] font-extrabold" style={{ color: p.dC }}>{p.d}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={`${cardCls} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[14px] font-extrabold text-ink">{L('Salud de módulos', 'Module health')}</span>
            <button onClick={() => ctx.go('modules')} className="cursor-pointer text-[11.5px] font-extrabold text-primary-dark">{L('Gestionar', 'Manage')}</button>
          </div>
          <div className="flex flex-col gap-2.5">
            {modHealth.map((m) => (
              <div key={m.nm} className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[9px]" style={{ background: m.bg }}>
                  <m.Icon size={16} strokeWidth={2.2} style={{ color: m.c }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-extrabold text-ink">{m.nm}</span>
                  <span className="block text-[10.5px] font-semibold text-muted-2">{m.sub}</span>
                </span>
                <span className="text-right">
                  <span className="block text-[13px] font-extrabold text-ink">{m.stat}</span>
                  <span className="block text-[10px] font-extrabold text-green">{m.delta}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* activity */}
      <div className={`${cardCls} p-4 md:p-5`}>
        <div className="mb-2 text-[14px] font-extrabold text-ink">{L('Actividad reciente', 'Recent activity')}</div>
        {activity.map((a, i) => (
          <div key={i} className={`flex items-center gap-3 py-2.5 ${i < activity.length - 1 ? 'border-b border-hair' : ''}`}>
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px]" style={{ background: a.bg }}>
              <a.Icon size={14} strokeWidth={2.2} style={{ color: a.c }} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-bold leading-snug text-ink">{a.line}</span>
              <span className="block text-[10.5px] font-semibold text-muted-2">{a.meta}</span>
            </span>
            <span className={`flex-none rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${a.rs}`}>{a.right}</span>
          </div>
        ))}
      </div>

      {/* premium teaser (verified only) */}
      {!isPremium && (
        <div className="rounded-card-sm p-4 text-white shadow-band md:flex md:items-center md:gap-4 md:p-5" style={{ background: 'linear-gradient(140deg,#1E1B2E,#3A2E6E)' }}>
          <span className="text-[10px] font-extrabold uppercase tracking-[.06em] text-amber md:hidden">✦ Premium</span>
          <span className="hidden h-11 w-11 flex-none items-center justify-center rounded-btn bg-[rgba(244,183,64,.2)] text-[20px] md:flex">✦</span>
          <span className="mt-1.5 block min-w-0 md:mt-0 md:flex-1">
            <span className="block text-[15px] font-extrabold">{L('Insights AI + posición destacada', 'Insights AI + featured placement')}</span>
            <span className="mt-1 block max-w-[560px] text-[12px] font-semibold leading-relaxed text-[rgba(255,255,255,.7)]">
              {L('Resúmenes con IA de tendencias, lugares destacados en el feed de descubrimiento y soporte prioritario. $49/mes.', 'AI summaries of trends, featured discovery slots, priority support. $49/mo.')}
            </span>
          </span>
          <button onClick={() => ctx.go('billing')} className="mt-3.5 w-full flex-none cursor-pointer rounded-btn bg-amber px-4 py-3 text-[12.5px] font-extrabold text-ink md:mt-0 md:w-auto md:py-2.5">
            {L('Mejorar a Premium', 'Upgrade to Premium')}
          </button>
        </div>
      )}
    </div>
  );
}

export function InsightsFree({ ctx }: { ctx: PanelCtx }) {
  const { L } = ctx;
  const kpis = [
    { Icon: Eye, c: '#F4B740', bg: '#FCEFD6', label: L('Vistas', 'Views'), value: '108', note: L('Bajo el promedio', 'Below avg'), locked: false },
    { Icon: User, c: '#7B61FF', bg: '#F1EFFA', label: L('Visitas al perfil', 'Profile visits'), value: '12', note: L('Agrega un logo', 'Add a logo'), locked: false },
    { Icon: ShoppingBag, c: '#F0466E', bg: '#FDE7EF', label: L('Pedidos', 'Orders'), value: '—', note: L('Plan Verified', 'Verified plan'), locked: true },
    { Icon: Calendar, c: '#1F9D57', bg: '#E3F5EA', label: L('Reservas', 'Bookings'), value: '—', note: L('Plan Verified', 'Verified plan'), locked: true },
  ];
  const checklist: [boolean, string, string][] = [
    [true, L('Información básica', 'Add basic info'), L('Nombre, categoría, dirección', 'Name, category, address')],
    [true, L('Horario', 'Set hours'), L('Mar–Dom, 7AM–7PM', 'Tue–Sun, 7AM–7PM')],
    [true, L('1 foto de portada', '1 cover photo'), L('1 de 5 mínimo', '1 of 5 minimum')],
    [false, L('4 fotos más', '4 more photos'), L('Frente, interior, productos', 'Front, interior, products')],
    [false, L('Agregar logo', 'Add a logo'), L('PNG o SVG cuadrado', 'PNG or SVG, square')],
    [false, L('Verificar teléfono', 'Verify phone'), L('Requerido para verificar', 'Required for verification')],
  ];
  const Y = '✓';
  const N = '—';
  const compare: [string, string, string, string][] = [
    [L('Listado básico', 'Basic listing'), Y, Y, Y],
    [L('Fotos', 'Photos'), L('1 foto', '1 photo'), L('Ilimitadas', 'Unlimited'), L('+ Video', '+ Video')],
    [L('Insignia verificada', 'Verified badge'), N, Y, Y],
    [L('Menú de comida', 'Food menu'), N, Y, Y],
    [L('Reservas', 'Bookings'), N, Y, Y],
    [L('Pedidos y entrega', 'Orders & delivery'), N, Y, L('+ Repartidores', '+ Own drivers')],
    [L('Eventos y boletos', 'Events & tickets'), N, Y, Y],
    [L('Posición destacada', 'Featured placement'), N, N, Y],
    ['Insights AI', N, N, Y],
  ];
  const done = checklist.filter((c) => c[0]).length;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-center gap-4 rounded-card-sm bg-amber-bg p-4">
        <span className="text-[22px]">⚠️</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-extrabold text-ink">{L('Tu listado no está verificado.', 'Your listing is unverified.')}</span>
          <span className="block text-[12px] font-semibold text-amber-ink">
            {L('Agrega 5+ fotos, logo, horario y completa la lista para solicitar la insignia — gratis.', 'Add 5+ photos, a logo, hours and complete the checklist to apply for the badge — free.')}
          </span>
        </span>
        <button className="flex-none cursor-pointer rounded-[10px] bg-ink px-3.5 py-2 text-[12px] font-extrabold text-white">
          {L('Abrir lista', 'Open checklist')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${cardCls} p-3.5`} style={{ opacity: k.locked ? 0.55 : 1 }}>
            <div className="flex items-start justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: k.bg }}>
                <k.Icon size={15} strokeWidth={2.2} style={{ color: k.c }} />
              </span>
              {k.locked && <Lock size={13} className="text-muted-faint" strokeWidth={2.4} />}
            </div>
            <div className="mt-2 text-[11px] font-bold text-muted">{k.label}</div>
            <div className="mt-0.5 text-[19px] font-extrabold" style={{ color: k.locked ? '#B7B3C6' : '#1E1B2E' }}>{k.value}</div>
            <div className="text-[10.5px] font-bold text-muted-2">{k.note}</div>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className={`${cardCls} p-4 md:p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[14px] font-extrabold text-ink">{L('Completar listado', 'Listing completion')}</span>
            <span className="text-[11.5px] font-extrabold text-primary-dark">{done}/6 {L('pasos hechos', 'steps done')}</span>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-lilac-line">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((done / 6) * 100)}%` }} />
          </div>
          <div className="flex flex-col gap-2">
            {checklist.map(([ok, t, d]) => (
              <div key={t} className={`flex items-center gap-3 rounded-btn-lg border p-3 ${ok ? 'border-[#A7E3C0] bg-[#ECFBF2]' : 'border-hair bg-white'}`}>
                <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 ${ok ? 'border-green bg-green' : 'border-[#D8D2E6] bg-white'}`}>
                  {ok && <Check size={11} strokeWidth={3.6} className="text-white" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[12.5px] font-extrabold ${ok ? 'text-[#176B3A]' : 'text-ink'}`}>{t}</span>
                  <span className={`block text-[10.5px] font-semibold ${ok ? 'text-[#3E8B5F]' : 'text-muted-2'}`}>{d}</span>
                </span>
                {!ok && <button className="flex-none cursor-pointer rounded-[9px] bg-lilac-2 px-2.5 py-1.5 text-[10.5px] font-extrabold text-primary-dark">{L('Hacer', 'Do')}</button>}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-card-sm p-5 text-white shadow-band" style={{ background: 'linear-gradient(140deg,#6743E2,#8268FF)' }}>
            <div className="text-[15px] font-extrabold">{L('Desbloquea todo el kit', 'Unlock the full toolkit')}</div>
            <div className="mt-1 text-[12px] font-semibold leading-snug text-[rgba(255,255,255,.85)]">
              {L('Los listados verificados tienen menú, reservas, pedidos, entregas, eventos y fotos ilimitadas. Más la insignia y 5× más descubrimiento.', 'Verified listings get menu, bookings, orders, delivery, events and unlimited photos. Plus the badge and 5× discovery.')}
            </div>
            <button onClick={() => ctx.go('billing')} className="mt-3 cursor-pointer rounded-[10px] bg-white px-4 py-2.5 text-[12.5px] font-extrabold text-primary-press">
              {L('Iniciar verificación', 'Start verification')}
            </button>
          </div>
          <div className={`${cardCls} overflow-hidden`}>
            <div className="px-4 pb-2 pt-4 text-[14px] font-extrabold text-ink">{L('Compara los planes', 'Compare plans')}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="text-left text-[10px] font-extrabold uppercase tracking-[.04em] text-muted">
                    <th className="px-4 py-2">{L('Función', 'Feature')}</th>
                    <th className="px-2 py-2">Free</th>
                    <th className="px-2 py-2 text-primary-dark">Verified</th>
                    <th className="px-2 py-2">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.map((r) => (
                    <tr key={r[0]} className="border-t border-hair font-bold text-ink-soft">
                      <td className="px-4 py-2">{r[0]}</td>
                      <td className="px-2 py-2 text-muted">{r[1]}</td>
                      <td className="px-2 py-2 font-extrabold text-primary-dark">{r[2]}</td>
                      <td className="px-2 py-2">{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
