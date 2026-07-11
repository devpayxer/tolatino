'use client';

// Editor sheets for the Entregas y envíos module's setup: delivery ZONE and own
// DRIVER (repartidor). Mobile bottom-sheets (Overlay) with create + edit + delete
// (confirmed), mirroring ServiceEditors/ProductEditors. They edit a local draft
// and hand the result back via onSave — the module owns persistence (zones +
// drivers live in businesses.settings jsonb). Types live here as the single
// source and are re-imported by Fulfillment.tsx.

import { useEffect, useState } from 'react';
import { IconTrash as Trash2 } from '@tabler/icons-react';
import { Overlay, OverlayTitle } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export type Lx = (es: string, en: string) => string;

// ── shared setup model (businesses.settings jsonb) ──────────────────────────────
export type Zone = { color: string; es: string; en: string; rad: string; time: string; feeEs: string; feeEn: string };
export type OwnDriver = { initials: string; color: string; dot: string; name: string; sEs: string; sEn: string; orderEs: string; orderEn: string; km: string; eta: string; phone?: string };

export const ZONE_COLORS = ['#7B61FF', '#F0466E', '#F4B740'];
export const DRIVER_COLORS = ['#7B61FF', '#2A5C8A', '#E8954A', '#1F9D57', '#D6336C', '#9A96AE'];

// driver status → the derived label/dot stored on the row
export const DRIVER_STATUS = [
  { key: 'available', dot: '#1F9D57', sEs: 'Disponible', sEn: 'Available', orderEs: 'Lista', orderEn: 'Ready next' },
  { key: 'on_delivery', dot: '#6D4DF6', sEs: 'En ruta', sEn: 'On delivery', orderEs: 'En ruta', orderEn: 'On route' },
  { key: 'off', dot: '#9A96AE', sEs: 'Libre hoy', sEn: 'Off today', orderEs: '—', orderEn: '—' },
] as const;
export const driverInitials = (name: string): string =>
  (name || '?').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const fieldLabel = 'mb-1.5 text-[11px] font-extrabold text-ink-soft';
const inputCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary';
const saveBtn = 'flex-1 cursor-pointer rounded-btn bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm disabled:cursor-not-allowed disabled:opacity-50';
const dangerBtn = 'flex-none cursor-pointer rounded-btn border-[1.5px] border-pink-bg bg-white px-4 py-3 text-[12.5px] font-extrabold text-pink-dark';

// ── Zone ────────────────────────────────────────────────────────────────────
export function ZoneEditor({
  open, onClose, L, initial, index, onSave, onDelete,
}: {
  open: boolean; onClose: () => void; L: Lx;
  initial: Zone | null;
  index: number; // 1-based position for the default name of a new zone
  onSave: (z: Zone) => void;
  onDelete: () => void;
}) {
  const [es, setEs] = useState('');
  const [en, setEn] = useState('');
  const [rad, setRad] = useState('');
  const [time, setTime] = useState('');
  const [feeEs, setFeeEs] = useState('');
  const [feeEn, setFeeEn] = useState('');
  const [color, setColor] = useState(ZONE_COLORS[0]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEs(initial?.es ?? '');
    setEn(initial?.en ?? '');
    setRad(initial?.rad && initial.rad !== '—' ? initial.rad : '');
    setTime(initial?.time && initial.time !== '—' ? initial.time : '');
    setFeeEs(initial?.feeEs && initial.feeEs !== '$0' ? initial.feeEs : '');
    setFeeEn(initial?.feeEn && initial.feeEn !== '$0' ? initial.feeEn : '');
    setColor(initial?.color ?? ZONE_COLORS[(index - 1) % ZONE_COLORS.length] ?? ZONE_COLORS[0]);
    setConfirming(false);
  }, [open, initial, index]);

  const save = () => {
    const name = es.trim(); if (!name) return;
    const fe = feeEs.trim() || L('Gratis', 'Free');
    onSave({
      color,
      es: name,
      en: en.trim() || name,
      rad: rad.trim() || '—',
      time: time.trim() || '—',
      feeEs: fe,
      feeEn: feeEn.trim() || fe,
    });
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} width={430}>
      <OverlayTitle title={initial ? L('Editar zona', 'Edit zone') : L('Nueva zona de entrega', 'New delivery zone')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (español)', 'Name (Spanish)')} *</div><input value={es} onChange={(e) => setEs(e.target.value)} placeholder={L('Ej. Zona Centro', 'e.g. Core zone')} className={inputCls} /></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (inglés)', 'Name (English)')}</div><input value={en} onChange={(e) => setEn(e.target.value)} placeholder={L('Opcional', 'Optional')} className={inputCls} /></div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Radio / distancia', 'Radius / distance')}</div><input value={rad} onChange={(e) => setRad(e.target.value)} placeholder={L('Ej. 0–1.2 mi', 'e.g. 0–1.2 mi')} className={inputCls} /></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Tiempo (ETA)', 'Time (ETA)')}</div><input value={time} onChange={(e) => setTime(e.target.value)} placeholder={L('Ej. 30–45 min', 'e.g. 30–45 min')} className={inputCls} /></div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Tarifa', 'Fee')}</div><input value={feeEs} onChange={(e) => setFeeEs(e.target.value)} placeholder={L('Ej. Gratis, $5', 'e.g. Free, $5')} className={inputCls} /></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Tarifa (inglés)', 'Fee (English)')}</div><input value={feeEn} onChange={(e) => setFeeEn(e.target.value)} placeholder={L('Opcional', 'Optional')} className={inputCls} /></div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Color en el mapa', 'Map color')}</div>
          <div className="flex flex-wrap gap-2">
            {ZONE_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label="color"
                className={`h-10 w-10 cursor-pointer rounded-full border-2 ${color === c ? 'border-ink' : 'border-transparent'}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="mt-1 flex gap-2.5">
          {initial && <button onClick={() => setConfirming(true)} aria-label={L('Eliminar', 'Delete')} className={dangerBtn}><Trash2 size={15} stroke={2.2} /></button>}
          <button onClick={save} disabled={!es.trim()} className={saveBtn}>{initial ? L('Guardar cambios', 'Save changes') : L('Crear zona', 'Create zone')}</button>
        </div>
        {initial && (
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onDelete(); onClose(); }}
            title={L('¿Eliminar zona?', 'Delete zone?')}
            message={L(`“${initial.es}” se quitará de tus zonas de entrega. Esta acción no se puede deshacer.`, `“${initial.en}” will be removed from your delivery zones. This can’t be undone.`)}
            confirmLabel={L('Eliminar', 'Delete')}
            cancelLabel={L('Cancelar', 'Cancel')}
          />
        )}
      </div>
    </Overlay>
  );
}

// ── Driver (repartidor propio) ──────────────────────────────────────────────
export function DriverEditor({
  open, onClose, L, initial, onSave, onDelete,
}: {
  open: boolean; onClose: () => void; L: Lx;
  initial: OwnDriver | null;
  onSave: (d: OwnDriver) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [statusKey, setStatusKey] = useState<string>('available');
  const [color, setColor] = useState(DRIVER_COLORS[0]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setPhone(initial?.phone ?? '');
    const st = DRIVER_STATUS.find((s) => s.sEs === initial?.sEs);
    setStatusKey(st?.key ?? 'available');
    setColor(initial?.color ?? DRIVER_COLORS[0]);
    setConfirming(false);
  }, [open, initial]);

  const save = () => {
    const nm = name.trim(); if (!nm) return;
    const st = DRIVER_STATUS.find((s) => s.key === statusKey) ?? DRIVER_STATUS[0];
    // preserve any live route info when editing; otherwise seed from the status
    const keepRoute = initial && initial.sEs === st.sEs;
    onSave({
      initials: driverInitials(nm),
      color,
      dot: st.dot,
      name: nm,
      sEs: st.sEs,
      sEn: st.sEn,
      orderEs: keepRoute ? initial!.orderEs : st.orderEs,
      orderEn: keepRoute ? initial!.orderEn : st.orderEn,
      km: keepRoute ? initial!.km : '—',
      eta: keepRoute ? initial!.eta : '—',
      phone: phone.trim() || undefined,
    });
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} width={430}>
      <OverlayTitle title={initial ? L('Editar repartidor', 'Edit driver') : L('Nuevo repartidor', 'New driver')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-[15px] font-extrabold text-white" style={{ background: color }}>{driverInitials(name)}</span>
          <div className="min-w-0 flex-1"><div className={fieldLabel}>{L('Nombre', 'Name')} *</div><input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('Ej. Marco P.', 'e.g. Marco P.')} className={inputCls} /></div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Teléfono', 'Phone')}</div>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={L('Opcional · (713) 555-0142', 'Optional · (713) 555-0142')} inputMode="tel" className={inputCls} />
        </div>
        <div>
          <div className={fieldLabel}>{L('Estado', 'Status')}</div>
          <div className="flex flex-wrap gap-2">
            {DRIVER_STATUS.map((s) => (
              <button key={s.key} type="button" onClick={() => setStatusKey(s.key)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-extrabold ${statusKey === s.key ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-soft'}`}>
                <span className="h-2 w-2 rounded-full" style={{ background: statusKey === s.key ? '#fff' : s.dot }} />{L(s.sEs, s.sEn)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Color', 'Color')}</div>
          <div className="flex flex-wrap gap-2">
            {DRIVER_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label="color"
                className={`h-10 w-10 cursor-pointer rounded-full border-2 ${color === c ? 'border-ink' : 'border-transparent'}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="mt-1 flex gap-2.5">
          {initial && <button onClick={() => setConfirming(true)} aria-label={L('Eliminar', 'Delete')} className={dangerBtn}><Trash2 size={15} stroke={2.2} /></button>}
          <button onClick={save} disabled={!name.trim()} className={saveBtn}>{initial ? L('Guardar cambios', 'Save changes') : L('Agregar repartidor', 'Add driver')}</button>
        </div>
        {initial && (
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onDelete(); onClose(); }}
            title={L('¿Eliminar repartidor?', 'Delete driver?')}
            message={L(`“${initial.name}” se quitará de tu equipo de reparto. Esta acción no se puede deshacer.`, `“${initial.name}” will be removed from your delivery team. This can’t be undone.`)}
            confirmLabel={L('Eliminar', 'Delete')}
            cancelLabel={L('Cancelar', 'Cancel')}
          />
        )}
      </div>
    </Overlay>
  );
}
