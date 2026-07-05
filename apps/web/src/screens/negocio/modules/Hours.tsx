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
import { CalendarDays, Clock, Loader2, Plus, Store, Trash2, X } from 'lucide-react';
import { useBizAdmin } from '@/lib/bizAdmin';
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
  const { L, es } = ctx;
  const admin = useBizAdmin();
  const router = useRouter();
  const real = admin.active;

  const [mode, setMode] = useState<'weekly' | 'holidays'>('weekly');
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
      <div className="flex items-center justify-center rounded-card border border-hair bg-white py-16 text-muted shadow-card">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!real) {
    return (
      <div className="mx-auto max-w-[440px] rounded-card border border-hair bg-white p-6 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lilac">
          <Store size={24} className="text-primary" strokeWidth={2.2} />
        </span>
        <h3 className="mt-4 text-[17px] font-extrabold text-ink">{L('Conecta tu negocio', 'Connect your business')}</h3>
        <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] font-semibold leading-relaxed text-muted">
          {L('Publica tu negocio para definir tu horario de atención.', 'Publish your business to set its opening hours.')}
        </p>
        <button onClick={() => router.push('/negocio/publicar')} className="mt-5 cursor-pointer rounded-btn bg-primary px-5 py-2.5 text-[13px] font-extrabold text-white shadow-cta-sm">
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
    `flex-1 cursor-pointer rounded-full py-2 text-center text-[12px] font-extrabold transition-colors ${on ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`;

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
  const upcoming = [...exceptions].filter((e) => (e.end || e.date) >= todayISO());

  return (
    <>
      <div className="mx-auto max-w-[640px]">
        <div className="rounded-card border border-hair bg-white p-4 shadow-card md:p-5">
          <div className="mb-1 flex items-center gap-2 text-[13px] font-extrabold text-ink">
            <Clock size={16} strokeWidth={2.2} className="text-primary-dark" />
            {L('Horario de atención', 'Opening hours')}
          </div>
          <p className="mb-3.5 text-[12px] font-medium leading-relaxed text-muted">
            {L('Tu listado muestra el estado en vivo (Abierto / cierra pronto / Cerrado) a partir de este horario.', 'Your listing shows a live status (Open / closing soon / Closed) from this schedule.')}
          </p>

          {/* mode: weekly schedule vs holidays & special days */}
          <div className="mb-4 flex rounded-full bg-lilac-2 p-0.5">
            <button type="button" onClick={() => setMode('weekly')} className={seg(mode === 'weekly')}>
              {L('Horario semanal', 'Weekly schedule')}
            </button>
            <button type="button" onClick={() => setMode('holidays')} className={seg(mode === 'holidays')}>
              {L('Feriados y más', 'Holidays & more')}
              {upcoming.length > 0 && <span className="ml-1.5 rounded-full bg-lilac px-1.5 text-[10px] text-primary-dark">{upcoming.length}</span>}
            </button>
          </div>

          {mode === 'weekly' ? (
            <HoursEditor week={week} onChange={setWeek} L={L} />
          ) : (
            <div>
              <p className="mb-3 text-[12px] font-medium leading-relaxed text-muted">
                {L('Programa días festivos, vacaciones o cierres por clima. Anulan tu horario semanal solo en esas fechas.', 'Set holidays, vacations or weather closures. They override your weekly schedule on those dates only.')}
              </p>

              {/* list of exceptions */}
              {exceptions.length === 0 ? (
                <div className="rounded-field border-[1.5px] border-dashed border-lilac-line bg-app px-4 py-6 text-center">
                  <CalendarDays size={22} strokeWidth={2} className="mx-auto text-primary-dark" />
                  <div className="mt-2 text-[13px] font-extrabold text-ink">{L('Aún no hay días especiales', 'No special days yet')}</div>
                  <div className="mt-0.5 text-[11.5px] font-semibold text-muted">{L('Agrega feriados, vacaciones o cierres.', 'Add holidays, vacations or closures.')}</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {exceptions.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-field border border-hair bg-white p-3">
                      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-btn ${e.closed ? 'bg-pink-bg text-pink-dark' : 'bg-green-bg text-green-dark'}`}>
                        <CalendarDays size={16} strokeWidth={2.2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 text-[12.5px] font-extrabold text-ink">
                          {exWhen(e)}
                          {e.label && <span className="rounded bg-lilac-2 px-1.5 py-0.5 text-[10px] font-bold text-ink-2">{e.label}</span>}
                        </span>
                        <span className={`mt-0.5 block text-[11.5px] font-bold ${e.closed ? 'text-pink-dark' : 'text-green-dark'}`}>{exWhat(e)}</span>
                      </span>
                      <button onClick={() => removeException(e.id)} aria-label={L('Eliminar', 'Delete')} className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-btn text-pink-dark">
                        <Trash2 size={14} strokeWidth={2.2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* add form / trigger */}
              {adding ? (
                <div className="mt-3 rounded-field border border-hair bg-app p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[12.5px] font-extrabold text-ink">{L('Nuevo día especial', 'New special day')}</span>
                    <button onClick={() => setAdding(false)} aria-label={L('Cerrar', 'Close')} className="cursor-pointer text-muted-2"><X size={15} strokeWidth={2.4} /></button>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <label className="block">
                      <span className="mb-1 block text-[11.5px] font-extrabold text-ink">{fRange ? L('Desde', 'From') : L('Fecha', 'Date')}</span>
                      <input type="date" value={fDate} min={todayISO()} onChange={(e) => setFDate(e.target.value)} className={fieldCls} />
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={fRange} onChange={(e) => setFRange(e.target.checked)} className="h-4 w-4 accent-[#7B61FF]" />
                      <span className="text-[12px] font-bold text-ink-soft">{L('Varios días (vacaciones)', 'Multiple days (vacation)')}</span>
                    </label>
                    {fRange && (
                      <label className="block">
                        <span className="mb-1 block text-[11.5px] font-extrabold text-ink">{L('Hasta', 'To')}</span>
                        <input type="date" value={fEnd} min={fDate || todayISO()} onChange={(e) => setFEnd(e.target.value)} className={fieldCls} />
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
                          <input type="time" value={fOpen} onChange={(e) => setFOpen(e.target.value)} className={fieldCls} />
                        </label>
                        <label className="block flex-1">
                          <span className="mb-1 block text-[11.5px] font-extrabold text-ink">{L('Cierra', 'Closes')}</span>
                          <input type="time" value={fClose} onChange={(e) => setFClose(e.target.value)} className={fieldCls} />
                        </label>
                      </div>
                    )}
                    <button onClick={addException} className="mt-1 cursor-pointer rounded-btn bg-primary py-2.5 text-[12.5px] font-extrabold text-white shadow-cta-sm">
                      {L('Agregar día', 'Add day')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAdding(true); setFDate(todayISO()); }}
                  className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-field border-[1.5px] border-dashed border-lilac-line bg-white py-3 text-[12.5px] font-extrabold text-primary-dark"
                >
                  <Plus size={15} strokeWidth={2.6} />
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
