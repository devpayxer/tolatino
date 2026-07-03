// Business hours + live open/closed status.
//
// A week is 7 days (index 0 = Sunday … 6 = Saturday). Each day is a list of
// [openMin, closeMin] intervals in minutes from midnight; a close past 1440
// means it runs into the next morning (a bar open until 2 am → [1200, 1560]).
// An empty list = closed that day. Multiple intervals cover split hours
// (e.g. a kitchen that closes for the afternoon).
//
// `bizStatus` resolves the current state (open / closing soon / closed + when it
// next opens) from the hours and the current time; `statusLabel` turns that into
// a short bilingual line like "Abierto · cierra en 30 min" or
// "Cerrado · abre mañana 9am". Time comes from the shared `useNow` clock.

export type Interval = [number, number]; // [openMin, closeMin]; close may exceed 1440
export type WeekHours = Interval[][]; // length 7, index 0 = Sunday

export type BizStatus =
  | { open: true; soon: boolean; minsToClose: number; closeMin: number; hasHours: boolean }
  | { open: false; nextOpenMin: number | null; nextOpenDay: number; dayOffset: number; hasHours: boolean };

const DAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const validWeek = (h?: WeekHours): h is WeekHours => Array.isArray(h) && h.length === 7;

/** Minutes-from-midnight → compact clock, e.g. 1290 → "9:30pm", 1320 → "10pm". */
export function fmtShort(min: number): string {
  const v = ((Math.round(min) % 1440) + 1440) % 1440;
  let h = Math.floor(v / 60);
  const m = v % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return m === 0 ? `${h}${ap}` : `${h}:${String(m).padStart(2, '0')}${ap}`;
}

/** Minutes-from-midnight → padded clock with a space, e.g. 540 → "9:00 am". */
export function fmtLong(min: number): string {
  const v = ((Math.round(min) % 1440) + 1440) % 1440;
  let h = Math.floor(v / 60);
  const m = v % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

/** One day's intervals → "9:00 am – 10:00 pm" (or the closed label). */
export function fmtDayHours(day: Interval[], closedLabel: string): string {
  if (!day || day.length === 0) return closedLabel;
  return day.map(([o, c]) => `${fmtLong(o)} – ${fmtLong(c)}`).join(', ');
}

/**
 * Resolve the live status. `now == null` (pre-mount) or missing hours →
 * fall back to the stored `open` boolean so the label stays sensible.
 */
export function bizStatus(hours: WeekHours | undefined, now: Date | null, fallbackOpen: boolean): BizStatus {
  if (!validWeek(hours) || now == null) {
    return fallbackOpen
      ? { open: true, soon: false, minsToClose: Infinity, closeMin: -1, hasHours: false }
      : { open: false, nextOpenMin: null, nextOpenDay: 0, dayOffset: 0, hasHours: false };
  }

  const day = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Open because of an interval that started today.
  for (const [o, c] of hours[day]) {
    if (nowMin >= o && nowMin < c) {
      const minsToClose = c - nowMin;
      return { open: true, soon: minsToClose <= 60, minsToClose, closeMin: c, hasHours: true };
    }
  }
  // Open because of yesterday's interval that runs past midnight into now.
  const prev = (day + 6) % 7;
  for (const [o, c] of hours[prev]) {
    if (c > 1440) {
      const shifted = nowMin + 1440;
      if (shifted >= o && shifted < c) {
        const closeToday = c - 1440;
        const minsToClose = closeToday - nowMin;
        return { open: true, soon: minsToClose <= 60, minsToClose, closeMin: closeToday, hasHours: true };
      }
    }
  }
  // Closed → find the next opening within the next 7 days.
  for (let off = 0; off < 8; off++) {
    const d = (day + off) % 7;
    const opens = hours[d].map(([o]) => o).sort((a, b) => a - b);
    for (const o of opens) {
      if (off === 0 && o <= nowMin) continue; // already passed today
      return { open: false, nextOpenMin: o, nextOpenDay: d, dayOffset: off, hasHours: true };
    }
  }
  return { open: false, nextOpenMin: null, nextOpenDay: 0, dayOffset: 0, hasHours: true };
}

/** True if open right now (dynamic when hours exist, else the stored flag). */
export function isOpenNow(hours: WeekHours | undefined, now: Date | null, fallbackOpen: boolean): boolean {
  return bizStatus(hours, now, fallbackOpen).open;
}

export type Tone = 'open' | 'soon' | 'closed';

/** Short status line + tone for coloring. `L` is the app's (es,en) picker. */
export function statusLabel(st: BizStatus, L: (es: string, en: string) => string): { text: string; tone: Tone } {
  if (st.open) {
    if (!st.hasHours || st.closeMin < 0) return { text: L('Abierto', 'Open'), tone: 'open' };
    if (st.soon) {
      const n = st.minsToClose;
      if (n <= 0) return { text: L('Cierra ya', 'Closing now'), tone: 'soon' };
      const t = n < 60 ? L(`cierra en ${n} min`, `closes in ${n} min`) : L('cierra en 1 h', 'closes in 1 h');
      return { text: `${L('Abierto', 'Open')} · ${t}`, tone: 'soon' };
    }
    return { text: L(`Abierto · hasta las ${fmtShort(st.closeMin)}`, `Open · until ${fmtShort(st.closeMin)}`), tone: 'open' };
  }
  if (st.nextOpenMin == null) return { text: L('Cerrado', 'Closed'), tone: 'closed' };
  const t = fmtShort(st.nextOpenMin);
  if (st.dayOffset === 0) return { text: L(`Cerrado · abre a las ${t}`, `Closed · opens ${t}`), tone: 'closed' };
  if (st.dayOffset === 1) return { text: L(`Cerrado · abre mañana ${t}`, `Closed · opens tomorrow ${t}`), tone: 'closed' };
  return { text: L(`Cerrado · abre ${DAYS_ES[st.nextOpenDay]} ${t}`, `Closed · opens ${DAYS_EN[st.nextOpenDay]} ${t}`), tone: 'closed' };
}
