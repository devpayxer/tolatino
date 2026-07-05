'use client';

// Dashboard home heads-up: holidays / vacations / special days are programmed
// ahead of time, so we remind the owner the day BEFORE (and the day of) each
// one starts — across ALL their businesses. Reads businesses.hours_exceptions
// (no server infra); dismissals are remembered locally so it never nags twice.
// When the real notification system lands (Web Push VAPID) this same window
// drives a scheduled push — see docs/LAUNCH-CHECKLIST.md.

import { useMemo, useState } from 'react';
import { CalendarClock, ChevronRight, X } from 'lucide-react';
import type { BizRow } from '@/lib/bizAdmin';
import type { Lx } from '@/screens/negocio/tabs';
import { fmtLong, upcomingExceptionReminders, type HoursException } from '@/lib/hours';
import { useNow } from '@/lib/useNow';

const STORE = 'tl_hours_reminders_dismissed';
const rmKey = (bizId: string, ex: HoursException) => `${bizId}:${ex.id}:${ex.date}`;

function loadDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(STORE);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function HoursReminders({
  businesses,
  L,
  es,
  onOpenHours,
}: {
  businesses: BizRow[];
  L: Lx;
  es: boolean;
  onOpenHours: (bizId: string) => void;
}) {
  const now = useNow();
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);

  const dismiss = (key: string) =>
    setDismissed((prev) => {
      const next = new Set(prev).add(key);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORE, JSON.stringify([...next]));
        } catch {
          /* storage unavailable — keep in-memory only */
        }
      }
      return next;
    });

  // Flatten each business's imminent (today/tomorrow) exceptions into one list.
  const items = useMemo(() => {
    if (!now) return [];
    return businesses.flatMap((b) =>
      upcomingExceptionReminders(b.hours_exceptions ?? undefined, now).map(({ ex, daysUntil }) => ({
        key: rmKey(b.id, ex),
        bizId: b.id,
        bizName: b.name,
        multi: businesses.length > 1,
        ex,
        daysUntil,
      })),
    );
  }, [businesses, now]);

  const visible = items.filter((it) => !dismissed.has(it.key));
  if (visible.length === 0) return null;

  const fmtDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(es ? 'es-US' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="mb-3.5 flex flex-col gap-2">
      {visible.map((it) => {
        const { ex } = it;
        const when = it.daysUntil === 0 ? L('Hoy', 'Today') : L('Mañana', 'Tomorrow');
        const isRange = !!ex.end && ex.end !== ex.date;
        const isClosed = ex.closed || ex.open == null || ex.close == null;
        const what = isRange
          ? isClosed
            ? L('empieza un cierre programado', 'a programmed closure starts')
            : L('empieza un horario especial', 'special hours start')
          : isClosed
            ? L('Cerrará ese día', 'Closed that day')
            : `${L('Horario especial', 'Special hours')} · ${fmtLong(ex.open!)} – ${fmtLong(ex.close!)}`;
        return (
          <div key={it.key} className="flex items-start gap-3 rounded-card-sm border border-amber/40 bg-amber-bg/60 p-3 shadow-card">
            <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-amber-bg text-amber-ink">
              <CalendarClock size={17} strokeWidth={2.2} />
            </span>
            <button onClick={() => onOpenHours(it.bizId)} className="min-w-0 flex-1 cursor-pointer text-left" aria-label={L('Ver horario', 'View hours')}>
              <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] font-extrabold text-ink">
                <span className="text-amber-ink">{when}</span>
                <span className="text-ink">· {what}</span>
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] font-semibold text-muted">
                {it.multi && <span className="font-extrabold text-ink-soft">{it.bizName} ·</span>}
                <span>{isRange ? `${fmtDate(ex.date)} – ${fmtDate(ex.end!)}` : fmtDate(ex.date)}</span>
                {ex.label && <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-bold text-ink-2">{ex.label}</span>}
                {isRange && !ex.closed && ex.open != null && ex.close != null && (
                  <span className="text-muted-2">· {fmtLong(ex.open)} – {fmtLong(ex.close)}</span>
                )}
              </span>
              <span className="mt-1 inline-flex items-center gap-0.5 text-[11.5px] font-extrabold text-primary-dark">
                {L('Ver u editar horario', 'View or edit hours')}
                <ChevronRight size={13} strokeWidth={2.6} />
              </span>
            </button>
            <button
              onClick={() => dismiss(it.key)}
              aria-label={L('Descartar recordatorio', 'Dismiss reminder')}
              className="flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-btn text-muted-2 hover:bg-white/60"
            >
              <X size={15} strokeWidth={2.4} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
