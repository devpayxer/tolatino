'use client';

// Listado → Horario. Two tabs:
//  • Horario semanal — the weekly opening hours (businesses.hours jsonb), the
//    base schedule the public listing reads for its live "Abierto / cierra en
//    30 min / Cerrado" status. Reuses the publish-flow HoursEditor.
//  • Feriados y más — date-specific overrides (businesses.hours_exceptions):
//    holidays closed / special hours, vacations, weather closures, etc. These
//    win over the weekly schedule on those dates.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconCalendar as CalendarDays, IconClock as Clock, IconLoader2 as Loader2, IconLock as Lock, IconPlus as Plus, IconBuildingStore as Store, IconTrash as Trash2, IconX as X } from '@tabler/icons-react';
import { useBizAdmin } from '@/lib/bizAdmin';
import { useUrlTab } from '@/lib/urlView';
import { HoursEditor, defaultWeek } from '@/components/HoursEditor';
import { fmtLong, type HoursException, type WeekHours } from '@/lib/hours';
import type { PanelCtx } from '@/screens/negocio/tabs';
import { Toast } from '@/screens/negocio/modules/_page';

const sameJSON = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const validWeek = (h: unknown): h is WeekHours => Array.isArray(h) && h.length === 7;
const timeToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const minToTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const parseISO = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `x${Date.now()}${Math.round(Math.random() * 1e6)}`);
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function HoursModule({ ctx }: { ctx: PanelCtx }) {
  const { L, es, isFree, go } = ctx;
  const admin = useBizAdmin();
  const router = useRouter();
  const real = admin.active;

  // Weekly / holidays toggle mirrored to ?sub= (refresh-safe).
  const [mode, setMode] = useUrlTab<'weekly' | 'holidays'>('sub', 'weekly', (v) => ['weekly', 'holidays'].includes(v));
  const [week, setWeek] = useState<WeekHours>(defaultWeek());
  const [exceptions, setExceptions] = useState<HoursException[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // add-a-special-day form
  const [adding, setAdding] = useState(false);
  const [fDate, setFDate] = useState('');
  const [fEnd, setFEnd] = useState('');
  const [fRange, setFRange] = useState(false);
  const [fLabel, setFLabel] = useState('');
  const [fClosed, setFClosed] = useState(true);
  const [fOpen, setFOpen] = useState('09:00');
  const [fClose, setFClose] = useState('17:00');

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };

  useEffect(() => {
    if (!real) return;
    setWeek(validWeek(real.hours) ? real.hours : defaultWeek());
    setExceptions(Array.isArray(real.hours_exceptions) ? real.hours_exceptions : []);
    setAdding(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id]);

  if (admin.loading) {
    return (
      <div className="flex items-center justify-center rounded-card border border-line bg-white py-16 text-muted">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!real) {
    return (
      <div className="mx-auto max-w-[440px] rounded-card border border-line bg-white p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lilac">
          <Store size={24} className="text-primary" stroke={2.2} />
        </span>
        <h3 className="mt-4 text-[17px] font-extrabold text-ink">{L('Conecta tu negocio', 'Connect your business')}</h3>
        <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] font-semibold leading-relaxed text-muted">
          {L('Publica tu negocio para definir tu horario de atención.', 'Publish your business to set its opening hours.')}
        </p>
        <button onClick={() => router.push('/negocio/publicar')} className="tap-y mt-5 cursor-pointer rounded-btn bg-primary px-5 py-2.5 text-[13px] font-extrabold text-white shadow-cta-sm">
          {L('Publicar negocio', 'Publish business')}
        </button>
      </div>
    );
  }

  const weekBaseline = validWeek(real.hours) ? real.hours : defaultWeek();
  const storedEx = Array.isArray(real.hours_exceptions) ? real.hours_exceptions : [];
  const dirty = !sameJSON(week, weekBaseline) || !sameJSON(exceptions, storedEx);

  const save = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    const { error } = await admin.update({ hours: week, is_open: true, hours_exceptions: exceptions });
    setSaving(false);
    flash(error ? L('No se pudo guardar. Intenta de nuevo.', "Couldn't save. Try again.") : L('Horario guardado', 'Hours saved'));
  };

  const seg = (on: boolean) =>
    `tap-y flex-1 cursor-pointer rounded-full py-2 text-center text-[12px] font-extrabold transition-colors ${on ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`;

  const addException = () => {
    if (!fDate) { flash(L('Elige una fecha.', 'Pick a date.')); return; }
    const end = fRange && fEnd && fEnd >= fDate ? fEnd : undefined;
    if (!fClosed && timeToMin(fClose) <= timeToMin(fOpen)) { flash(L('La hora de cierre debe ser mayor.', 'Close time must be later.')); return; }
    const ex: HoursException = fClosed
      ? { id: newId(), date: fDate, end, closed: true, label: fLabel.trim() || undefined }
      : { id: newId(), date: fDate, end, closed: false, open: timeToMin(fOpen), close: timeToMin(fClose), label: fLabel.trim() || undefined };
    setExceptions((xs) => [...xs, ex].sort((a, b) => a.date.localeCompare(b.date)));
    setAdding(false);
    setFDate(''); setFEnd(''); setFRange(false); setFLabel(''); setFClosed(true); setFOpen('09:00'); setFClose('17:00');
  };
  const removeException = (id: string) => setExceptions((xs) => xs.filter((x) => x.id !== id));

  const fmtDate = (iso: string) => parseISO(iso).toLocaleDateString(es ? 'es-US' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const exWhen = (e: HoursException) => (e.end && e.end !== e.date ? `${fmtDate(e.date)} – ${fmtDate(e.end)}` : fmtDate(e.date));
  const exWhat = (e: HoursException) => (e.closed || e.open == null || e.close == null ? L('Cerrado', 'Closed') : `${fmtLong(e.open)} – ${fmtLong(e.close)}`);

  const fieldCls =
    'w-full rounded-field border-[1.5px] border-lilac-line bg-app px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary';
  // Native date/time inputs on iOS Safari CENTER their value (and ignore the
  // input's text-align), so the picked day looked misaligned vs the left-aligned
  // labels. Left-align the value pseudo-elements so it lines up like every other
  // field. (No-op on desktop Chromium, which already left-aligns.)
  const dateFieldCls =
    `${fieldCls} text-left [&::-webkit-date-and-time-value]:text-left [&::-webkit-datetime-edit]:text-left [&::-webkit-datetime-edit-fields-wrapper]:text-left`;
  const upcoming = [...exceptions].filter((e) => (e.end || e.date) >= todayISO());

  return (
    <>
      <div className="mx-auto max-w-[640px]">
        <div className="rounded-card border border-line bg-white p-4 md:p-5">
          <div className="mb-1 flex items-center gap-2 text-[13px] font-extrabold text-ink">
            <Clock size={16} stroke={2.2} className="text-primary-dark" />
            {L('Horario de atención', 'Opening hours')}
          </div>
          <p className="mb-3.5 text-[12px] font-medium leading-relaxed text-muted">
            {L('Tu listado muestra el estado en vivo (Abierto / cierra pronto / Cerrado) a partir de este horario.', 'Your listing shows a live status (Open / closing soon / Closed) from this schedule.')}
          </p>

          {/* Free plan → upgrade band: split slots + Feriados y más are Pro */}
          {isFree && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card-sm p-3.5 text-white" style={{ background: 'linear-gradient(140deg,#16112E,#241C46)' }}>
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-[rgba(244,183,64,.2)] text-[15px]">✦</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-extrabold">{L('Horario en el plan Gratis', 'Hours on the Free plan')}</span>
                <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-[rgba(255,255,255,.7)]">
                  {L('Con Pro divides el día en varias franjas y programas feriados, vacaciones y cierres especiales.', 'With Pro you split the day into multiple slots and schedule holidays, vacations and special closures.')}
                </span>
              </span>
              <button onClick={() => go('billing')} className="tap-y flex-none cursor-pointer rounded-btn bg-amber px-3.5 py-2 text-[11.5px] font-extrabold text-ink">
                {L('Mejorar a Pro', 'Upgrade to Pro')}
              </button>
            </div>
          )}

          {/* mode: weekly schedule vs holidays & special days (Pro) */}
          <div className="mb-4 flex rounded-full bg-lilac-2 p-0.5">
            <button type="button" onClick={() => setMode('weekly')} className={seg(mode === 'weekly')}>
              {L('Horario semanal', 'Weekly schedule')}
            </button>
            <button type="button" onClick={() => setMode('holidays')} className={seg(mode === 'holidays')}>
              {isFree && <Lock size={11} stroke={2.6} className="-mt-0.5 mr-1 inline-block align-middle" />}
              {L('Feriados y más', 'Holidays & more')}
              {!isFree && upcoming.length > 0 && <span className="ml-1.5 rounded-full bg-lilac px-1.5 text-[10px] text-primary-dark">{upcoming.length}</span>}
            </button>
          </div>

          {mode === 'weekly' ? (
            <HoursEditor week={week} onChange={setWeek} L={L} proSlots={!isFree} onUpgrade={() => go('billing')} />
          ) : isFree ? (
            /* Feriados y más is Pro — show what it unlocks + upgrade CTA */
            <div className="rounded-field border-[1.5px] border-dashed border-lilac-line bg-lilac-3 px-4 py-6 text-center">
              <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white">
                <CalendarDays size={22} stroke={2.2} className="text-primary-dark" />
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-lilac-3 bg-amber">
                  <Lock size={9} stroke={2.8} className="text-ink" />
                </span>
              </span>
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <span className="text-[15px] font-extrabold text-ink">{L('Feriados y más', 'Holidays & more')}</span>
                <span className="rounded bg-amber px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-[.04em] text-ink">Pro</span>
              </div>
              <p className="mx-auto mt-1.5 max-w-[320px] text-[12px] font-semibold leading-relaxed text-muted">
                {L('Programa días festivos, vacaciones y cierres por clima. Anulan tu horario semanal solo en esas fechas — y avisan a tus clientes en tu ficha.', 'Schedule holidays, vacations and weather closures. They override your weekly schedule on those dates only — and inform your customers on your listing.')}
              </p>
              <button
                onClick={() => go('billing')}
                className="tap-y mt-4 cursor-pointer rounded-btn bg-primary px-5 py-2.5 text-[12.5px] font-extrabold text-white shadow-cta-sm"
              >
                {L('Mejorar a Pro', 'Upgrade to Pro')}
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-[12px] font-medium leading-relaxed text-muted">
                {L('Programa días festivos, vacaciones o cierres por clima. Anulan tu horario semanal solo en esas fechas.', 'Set holidays, vacations or weather closures. They override your weekly schedule on those dates only.')}
              </p>

              {/* list of exceptions */}
              {exceptions.length === 0 ? (
                <div className="rounded-field border-[1.5px] border-dashed border-lilac-line bg-app px-4 py-6 text-center">
                  <CalendarDays size={22} stroke={2} className="mx-auto text-primary-dark" />
                  <div className="mt-2 text-[13px] font-extrabold text-ink">{L('Aún no hay días especiales', 'No special days yet')}</div>
                  <div className="mt-0.5 text-[11.5px] font-semibold text-muted">{L('Agrega feriados, vacaciones o cierres.', 'Add holidays, vacations or closures.')}</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {exceptions.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-field border border-line bg-white p-3">
                      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-btn ${e.closed ? 'bg-pink-bg text-pink-dark' : 'bg-green-bg text-green-ink'}`}>
                        <CalendarDays size={16} stroke={2.2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 text-[12.5px] font-extrabold text-ink">
                          {exWhen(e)}
                          {e.label && <span className="rounded bg-lilac-2 px-1.5 py-0.5 text-[10px] font-bold text-ink-2">{e.label}</span>}
                        </span>
                        <span className={`mt-0.5 block text-[11.5px] font-bold ${e.closed ? 'text-pink-dark' : 'text-green-ink'}`}>{exWhat(e)}</span>
                      </span>
                      <button onClick={() => removeException(e.id)} aria-label={L('Eliminar', 'Delete')} className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-btn text-pink-dark">
                        <Trash2 size={14} stroke={2.2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* add form / trigger */}
              {adding ? (
                <div className="mt-3 rounded-field border border-line bg-app p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[12.5px] font-extrabold text-ink">{L('Nuevo día especial', 'New special day')}</span>
                    <button onClick={() => setAdding(false)} aria-label={L('Cerrar', 'Close')} className="cursor-pointer text-muted-2"><X size={15} stroke={2.4} /></button>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <label className="block">
                      <span className="mb-1 block text-[11.5px] font-extrabold text-ink">{fRange ? L('Desde', 'From') : L('Fecha', 'Date')}</span>
                      <input type="date" value={fDate} min={todayISO()} onChange={(e) => setFDate(e.target.value)} className={dateFieldCls} />
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={fRange} onChange={(e) => setFRange(e.target.checked)} className="h-4 w-4 accent-primary" />
                      <span className="text-[12px] font-bold text-ink-soft">{L('Varios días (vacaciones)', 'Multiple days (vacation)')}</span>
                    </label>
                    {fRange && (
                      <label className="block">
                        <span className="mb-1 block text-[11.5px] font-extrabold text-ink">{L('Hasta', 'To')}</span>
                        <input type="date" value={fEnd} min={fDate || todayISO()} onChange={(e) => setFEnd(e.target.value)} className={dateFieldCls} />
                      </label>
                    )}
                    <label className="block">
                      <span className="mb-1 block text-[11.5px] font-extrabold text-ink">{L('Motivo', 'Reason')} <span className="font-semibold text-muted">· {L('opcional', 'optional')}</span></span>
                      <input value={fLabel} onChange={(e) => setFLabel(e.target.value)} maxLength={40} placeholder={L('Ej. Navidad, Vacaciones, Por clima', 'e.g. Christmas, Vacation, Weather')} className={fieldCls} />
                    </label>
                    <div>
                      <span className="mb-1 block text-[11.5px] font-extrabold text-ink">{L('Ese día', 'That day')}</span>
                      <div className="flex rounded-full bg-lilac-2 p-0.5">
                        <button type="button" onClick={() => setFClosed(true)} className={seg(fClosed)}>{L('Cerrado', 'Closed')}</button>
                        <button type="button" onClick={() => setFClosed(false)} className={seg(!fClosed)}>{L('Horario especial', 'Special hours')}</button>
                      </div>
                    </div>
                    {!fClosed && (
                      <div className="flex gap-2.5">
                        <label className="block flex-1">
                          <span className="mb-1 block text-[11.5px] font-extrabold text-ink">{L('Abre', 'Opens')}</span>
                          <input type="time" value={fOpen} onChange={(e) => setFOpen(e.target.value)} className={dateFieldCls} />
                        </label>
                        <label className="block flex-1">
                          <span className="mb-1 block text-[11.5px] font-extrabold text-ink">{L('Cierra', 'Closes')}</span>
                          <input type="time" value={fClose} onChange={(e) => setFClose(e.target.value)} className={dateFieldCls} />
                        </label>
                      </div>
                    )}
                    <button onClick={addException} className="tap-y mt-1 cursor-pointer rounded-btn bg-primary py-2.5 text-[12.5px] font-extrabold text-white shadow-cta-sm">
                      {L('Agregar día', 'Add day')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAdding(true); setFDate(todayISO()); }}
                  className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-field border-[1.5px] border-dashed border-lilac-line bg-white py-3 text-[12.5px] font-extrabold text-primary-dark"
                >
                  <Plus size={15} stroke={2.6} />
                  {L('Agregar día especial', 'Add a special day')}
                </button>
              )}
            </div>
          )}

          <button
            onClick={save}
            disabled={!dirty || saving}
            className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn bg-primary py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm disabled:opacity-50"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? L('Guardando…', 'Saving…') : dirty ? L('Guardar horario', 'Save hours') : L('Guardado', 'Saved')}
          </button>
        </div>
      </div>
      <Toast msg={toast} />
    </>
  );
}
