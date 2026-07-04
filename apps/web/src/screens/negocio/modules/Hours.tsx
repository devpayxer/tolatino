'use client';

// Listado → Horario. Real editor for the active business's weekly opening hours
// (businesses.hours jsonb) — the same schedule the public listing reads for its
// live "Abierto / cierra en 30 min / Cerrado" status. Reuses the HoursEditor
// built for the publish flow. When no schedule is set, the listing falls back to
// a manual Abierto/Cerrado flag (businesses.is_open).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Loader2, Store } from 'lucide-react';
import { useBizAdmin } from '@/lib/bizAdmin';
import { HoursEditor, defaultWeek } from '@/components/HoursEditor';
import type { WeekHours } from '@/lib/hours';
import type { PanelCtx } from '@/screens/negocio/tabs';
import { Toast } from '@/screens/negocio/modules/_page';

const sameWeek = (a: WeekHours | null, b: WeekHours | null) => JSON.stringify(a) === JSON.stringify(b);

export function HoursModule({ ctx }: { ctx: PanelCtx }) {
  const { L } = ctx;
  const admin = useBizAdmin();
  const router = useRouter();
  const real = admin.active;

  // hasSchedule: the "weekly hours" mode is on; week: the working draft.
  const [hasSchedule, setHasSchedule] = useState(false);
  const [week, setWeek] = useState<WeekHours>(defaultWeek());
  const [openNow, setOpenNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 1900);
  };

  useEffect(() => {
    if (!real) return;
    const h = (real.hours as WeekHours | null) ?? null;
    const valid = Array.isArray(h) && h.length === 7;
    setHasSchedule(valid);
    setWeek(valid ? (h as WeekHours) : defaultWeek());
    setOpenNow(real.is_open);
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

  const storedWeek = (Array.isArray(real.hours) && real.hours.length === 7 ? (real.hours as WeekHours) : null);
  const dirty = hasSchedule ? !sameWeek(week, storedWeek) : storedWeek != null || openNow !== real.is_open;

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const { error } = hasSchedule
      ? await admin.update({ hours: week, is_open: true })
      : await admin.update({ hours: null, is_open: openNow });
    setSaving(false);
    flash(error ? L('No se pudo guardar. Intenta de nuevo.', "Couldn't save. Try again.") : L('Horario guardado', 'Hours saved'));
  };

  const seg = (on: boolean) =>
    `flex-1 cursor-pointer rounded-full py-2 text-center text-[12px] font-extrabold transition-colors ${on ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`;

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

          {/* mode: weekly schedule vs manual flag */}
          <div className="mb-4 flex rounded-full bg-lilac-2 p-0.5">
            <button type="button" onClick={() => setHasSchedule(true)} className={seg(hasSchedule)}>
              {L('Horario semanal', 'Weekly schedule')}
            </button>
            <button type="button" onClick={() => setHasSchedule(false)} className={seg(!hasSchedule)}>
              {L('Manual', 'Manual')}
            </button>
          </div>

          {hasSchedule ? (
            <HoursEditor week={week} onChange={setWeek} L={L} />
          ) : (
            <div>
              <div className="mb-1.5 text-[12px] font-extrabold text-ink">{L('Estado actual', 'Current status')}</div>
              <div className="flex rounded-full bg-lilac-2 p-0.5">
                <button type="button" onClick={() => setOpenNow(true)} className={seg(openNow)}>
                  {L('Abierto', 'Open')}
                </button>
                <button type="button" onClick={() => setOpenNow(false)} className={seg(!openNow)}>
                  {L('Cerrado', 'Closed')}
                </button>
              </div>
              <p className="mt-2 text-[11px] font-semibold text-muted">
                {L('Sin horario semanal, tu listado muestra solo este estado manual.', 'Without a weekly schedule, your listing shows only this manual status.')}
              </p>
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
