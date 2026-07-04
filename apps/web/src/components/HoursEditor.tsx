'use client';

// Weekly opening-hours editor for the publish flow. Produces a `WeekHours`
// (7 days, index 0 = Sunday … 6 = Saturday; each day = a list of
// [openMin, closeMin] intervals in minutes from midnight; a close past 1440 runs
// into the next morning; [] = closed) — the exact shape stored in
// `businesses.hours` (migration 0018) and read by `lib/hours` for the live
// "Abierto / cierra en 30 min / Cerrado" status. Mobile-first: every day is a
// stacked card so nothing overflows at 392px; two selects share a row via
// `flex-1 min-w-0`.

import { Plus, X } from 'lucide-react';
import { fmtShort, type Interval, type WeekHours } from '@/lib/hours';

// Storage order: index 0 = Sunday.
const DAY_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const STEP = 30;
const DEFAULT_INTERVAL: Interval = [540, 1080]; // 9:00 am – 6:00 pm
const CLOSE_MAX = 1560; // 2:00 am next day — covers late-night venues
const MAX_FRANJAS = 3;

// Open at every half-hour across the day (0:00–23:30); close from :30 up to 2am+1.
const OPEN_OPTS: number[] = Array.from({ length: 1440 / STEP }, (_, i) => i * STEP);
const CLOSE_OPTS: number[] = Array.from({ length: (CLOSE_MAX - STEP) / STEP + 1 }, (_, i) => STEP + i * STEP);

/** A sensible starting schedule (Mon–Fri 9–6, Sat 9–2, Sun closed). */
export const defaultWeek = (): WeekHours =>
  [[], [[540, 1080]], [[540, 1080]], [[540, 1080]], [[540, 1080]], [[540, 1080]], [[540, 840]]] as WeekHours;

/** True once at least one day has hours (so we know whether to send them). */
export const hasAnyHours = (w: WeekHours): boolean => w.some((d) => d.length > 0);

export function HoursEditor({
  week,
  onChange,
  L,
}: {
  week: WeekHours;
  onChange: (w: WeekHours) => void;
  L: (es: string, en: string) => string;
}) {
  const setDay = (d: number, intervals: Interval[]) =>
    onChange(week.map((x, i) => (i === d ? intervals : x)) as WeekHours);

  const toggleDay = (d: number, open: boolean) =>
    setDay(d, open ? (week[d].length ? week[d] : [[...DEFAULT_INTERVAL]]) : []);

  const setPart = (d: number, idx: number, part: 0 | 1, val: number) =>
    setDay(
      d,
      week[d].map((iv, j) => {
        if (j !== idx) return iv;
        if (part === 0) {
          // keep close strictly after the new open
          const close = iv[1] > val ? iv[1] : Math.min(val + 60, CLOSE_MAX);
          return [val, close] as Interval;
        }
        return [iv[0], val] as Interval;
      }),
    );

  const addFranja = (d: number) => {
    const last = week[d][week[d].length - 1];
    const start = Math.min((last ? last[1] : 540) + 60, 1410);
    setDay(d, [...week[d], [start, Math.min(start + 180, CLOSE_MAX)]]);
  };

  const removeFranja = (d: number, idx: number) => setDay(d, week[d].filter((_, j) => j !== idx));

  const applyToAll = () => {
    const src = week.find((d) => d.length) ?? [];
    onChange(week.map(() => src.map((iv) => [...iv] as Interval)) as WeekHours);
  };

  const optLabel = (m: number): string =>
    m < 1440 ? fmtShort(m) : m === 1440 ? L('medianoche', 'midnight') : `${fmtShort(m)} ${L('(día sig.)', '(next day)')}`;

  const selectCls =
    'h-11 w-full min-w-0 rounded-field border-[1.5px] border-lilac-line bg-app px-2.5 text-[13px] font-bold text-ink outline-none focus:border-primary';
  const seg = (on: boolean) =>
    `flex-1 cursor-pointer rounded-full py-1.5 text-[11.5px] font-extrabold transition-colors ${on ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`;

  return (
    <div className="flex flex-col gap-2.5">
      {hasAnyHours(week) && (
        <button
          type="button"
          onClick={applyToAll}
          className="self-start cursor-pointer text-[11.5px] font-extrabold text-primary-dark"
        >
          {L('Aplicar el primer día a toda la semana', 'Apply the first open day to the whole week')}
        </button>
      )}

      {week.map((day, d) => {
        const open = day.length > 0;
        return (
          <div key={d} className="rounded-tile border-[1.5px] border-hair bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-[13px] font-extrabold text-ink">{L(DAY_ES[d], DAY_EN[d])}</span>
              <div className="flex flex-none rounded-full bg-lilac-2 p-0.5">
                <button type="button" onClick={() => toggleDay(d, true)} className={seg(open)}>
                  <span className="px-2">{L('Abierto', 'Open')}</span>
                </button>
                <button type="button" onClick={() => toggleDay(d, false)} className={seg(!open)}>
                  <span className="px-2">{L('Cerrado', 'Closed')}</span>
                </button>
              </div>
            </div>

            {open && (
              <div className="mt-2.5 flex flex-col gap-2">
                {day.map((iv, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={String(iv[0])}
                      onChange={(e) => setPart(d, idx, 0, Number(e.target.value))}
                      aria-label={L('Hora de apertura', 'Opening time')}
                      className={selectCls}
                    >
                      {OPEN_OPTS.map((m) => (
                        <option key={m} value={m}>
                          {optLabel(m)}
                        </option>
                      ))}
                    </select>
                    <span className="flex-none text-[12px] font-bold text-muted">{L('a', 'to')}</span>
                    <select
                      value={String(iv[1])}
                      onChange={(e) => setPart(d, idx, 1, Number(e.target.value))}
                      aria-label={L('Hora de cierre', 'Closing time')}
                      className={selectCls}
                    >
                      {CLOSE_OPTS.filter((m) => m > iv[0]).map((m) => (
                        <option key={m} value={m}>
                          {optLabel(m)}
                        </option>
                      ))}
                    </select>
                    {day.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFranja(d, idx)}
                        aria-label={L('Quitar franja', 'Remove slot')}
                        className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink-2"
                      >
                        <X size={13} strokeWidth={2.6} />
                      </button>
                    )}
                  </div>
                ))}
                {day.length < MAX_FRANJAS && (
                  <button
                    type="button"
                    onClick={() => addFranja(d)}
                    className="flex cursor-pointer items-center gap-1.5 self-start text-[11.5px] font-extrabold text-primary-dark"
                  >
                    <Plus size={13} strokeWidth={2.6} />
                    {L('Otra franja', 'Add slot')}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
