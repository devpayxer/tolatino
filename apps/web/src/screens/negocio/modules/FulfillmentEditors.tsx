'use client';

// Editor sheets for the Entregas y envíos module's setup: delivery ZONE and own
// DRIVER (repartidor). Mobile bottom-sheets (Overlay) with create + edit + delete
// (confirmed), mirroring ServiceEditors/ProductEditors. They edit a local draft
// and hand the result back via onSave — the module owns persistence (zones +
// drivers live in businesses.settings jsonb). Types live here as the single
// source and are re-imported by Fulfillment.tsx.

import { useEffect, useRef, useState } from 'react';
import { imgUrl, ANCHO } from '@/lib/img';
import { IconCamera as Camera, IconLoader2 as Loader2, IconTrash as Trash2, IconX as X } from '@tabler/icons-react';
import { Overlay, OverlayTitle } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatPhone } from '@/lib/phone';

export type Lx = (es: string, en: string) => string;

// ── shared setup model (businesses.settings jsonb) ──────────────────────────────
// A zone is a concentric delivery ring: `toMi` = its OUTER radius in miles (the
// ring runs from the previous zone's radius out to this one), `fee` = the flat
// delivery fee in dollars (0 = free). Numeric + structured so the cart's
// PostGIS gate (delivery_range_check, 0076) can enforce the farthest zone as the
// delivery limit, and so fees format professionally ($X.00) in the UI.
export type Zone = { color: string; es: string; en: string; toMi: number | null; time: string; fee: number };
export type OwnDriver = { initials: string; color: string; dot: string; name: string; sEs: string; sEn: string; orderEs: string; orderEn: string; km: string; eta: string; phone?: string; photo?: string; vehicle?: string };

// Back-compat: older zones stored free-text `rad` ("0–1.2 mi") + `feeEs`/`feeEn`
// ("$5", "Gratis +$25"). Coerce ANY stored shape into the structured numeric
// model so a business saved before this change keeps working (toMi = the ring's
// outer radius = the LAST number in the range; fee = dollars, 0 = free).
export function normalizeZone(z: Record<string, unknown>): Zone {
  const lastNum = (s: unknown): number | null => {
    const m = String(s ?? '').match(/\d+(?:\.\d+)?/g);
    return m && m.length ? Number(m[m.length - 1]) : null;
  };
  const toMi = typeof z.toMi === 'number' ? z.toMi : lastNum(z.rad);
  let fee: number;
  if (typeof z.fee === 'number') fee = z.fee;
  else if (/^\s*(gratis|free)/i.test(String(z.feeEs ?? ''))) fee = 0; // "Gratis…" → free
  else { const m = String(z.feeEs ?? '').match(/\d+(?:\.\d+)?/); fee = m ? Number(m[0]) : 0; }
  const time = z.time && z.time !== '—' ? String(z.time) : '';
  return {
    color: (z.color as string) ?? ZONE_COLORS[0],
    es: (z.es as string) ?? '',
    en: (z.en as string) ?? (z.es as string) ?? '',
    toMi: toMi != null && toMi > 0 ? toMi : null,
    time,
    fee: fee > 0 ? fee : 0,
  };
}

export const ZONE_COLORS = ['#FF2D6F', '#FF2D6F', '#FFB020'];
export const DRIVER_COLORS = ['#FF2D6F', '#0369A1', '#C05702', '#00A878', '#E11D48', '#9A93B3'];

// driver status → the derived label/dot stored on the row
export const DRIVER_STATUS = [
  { key: 'available', dot: '#00A878', sEs: 'Disponible', sEn: 'Available', orderEs: 'Lista', orderEn: 'Ready next' },
  { key: 'on_delivery', dot: '#C4144C', sEs: 'En ruta', sEn: 'On delivery', orderEs: 'En ruta', orderEn: 'On route' },
  { key: 'off', dot: '#9A93B3', sEs: 'Libre hoy', sEn: 'Off today', orderEs: '—', orderEn: '—' },
] as const;
export const driverInitials = (name: string): string =>
  (name || '?').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const fieldLabel = 'mb-1.5 text-[11px] font-extrabold text-ink-soft';
const inputCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary';
const saveBtn = 'flex-1 cursor-pointer rounded-btn bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm disabled:cursor-not-allowed disabled:opacity-50';
const dangerBtn = 'flex-none cursor-pointer rounded-btn border-[1.5px] border-pink-bg bg-white px-4 py-3 text-[12.5px] font-extrabold text-pink-dark';
// professional unit-affixed number field (shows "$" / "mi" so the owner never
// types the unit; digits-only input, money reformats to X.00 on blur)
const affixWrap = 'flex items-center rounded-field border-[1.5px] border-lilac-line bg-white px-3 focus-within:border-primary';
const affixInput = 'min-w-0 flex-1 bg-transparent px-1.5 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted';
const affixUnit = 'flex-none text-[12px] font-extrabold text-muted-2';
const hintCls = 'mt-1 text-[10px] font-medium leading-snug text-muted-2';
const onlyNum = (v: string) => v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

// ── Zone ────────────────────────────────────────────────────────────────────
export function ZoneEditor({
  open, onClose, L, initial, index, fromMi, onSave, onDelete,
}: {
  open: boolean; onClose: () => void; L: Lx;
  initial: Zone | null;
  index: number; // 1-based position for the default name of a new zone
  fromMi?: number; // inner radius (previous zone's outer radius) — for the hint
  onSave: (z: Zone) => void;
  onDelete: () => void;
}) {
  const [es, setEs] = useState('');
  const [en, setEn] = useState('');
  const [toMi, setToMi] = useState(''); // outer radius in miles (string for input)
  const [etaLo, setEtaLo] = useState(''); // ETA range in minutes (structured)
  const [etaHi, setEtaHi] = useState('');
  const [fee, setFee] = useState(''); // delivery fee in dollars (string; '' = free)
  const [color, setColor] = useState(ZONE_COLORS[0]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEs(initial?.es ?? '');
    setEn(initial?.en ?? '');
    setToMi(initial?.toMi != null ? String(initial.toMi) : '');
    // parse the stored "30–45 min" (or "45 min") into the two numeric fields
    const nums = String(initial?.time ?? '').match(/\d+/g) ?? [];
    setEtaLo(nums[0] ?? '');
    setEtaHi(nums[1] ?? '');
    setFee(initial?.fee ? initial.fee.toFixed(2) : '');
    setColor(initial?.color ?? ZONE_COLORS[(index - 1) % ZONE_COLORS.length] ?? ZONE_COLORS[0]);
    setConfirming(false);
  }, [open, initial, index]);

  const save = () => {
    const name = es.trim(); if (!name) return;
    const mi = toMi.trim() === '' ? null : Number(toMi);
    const f = fee.trim() === '' ? 0 : Number(fee);
    const lo = etaLo.trim(), hi = etaHi.trim();
    const time = lo && hi ? `${lo}–${hi} min` : lo || hi ? `${lo || hi} min` : '—';
    onSave({
      color,
      es: name,
      en: en.trim() || name,
      toMi: mi != null && !Number.isNaN(mi) && mi > 0 ? mi : null,
      time,
      fee: !Number.isNaN(f) && f > 0 ? f : 0,
    });
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} width={430}>
      <OverlayTitle title={initial ? L('Editar zona', 'Edit zone') : L('Nueva zona de entrega', 'New delivery zone')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <div className="min-w-0 flex-1"><div className={fieldLabel}>{L('Nombre (español)', 'Name (Spanish)')} *</div><input value={es} onChange={(e) => setEs(e.target.value)} placeholder={L('Ej. Zona Centro', 'e.g. Core zone')} className={inputCls} /></div>
          <div className="min-w-0 flex-1"><div className={fieldLabel}>{L('Nombre (inglés)', 'Name (English)')}</div><input value={en} onChange={(e) => setEn(e.target.value)} placeholder={L('Opcional', 'Optional')} className={inputCls} /></div>
        </div>
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <div className={fieldLabel}>{L('Radio de la zona', 'Zone radius')}</div>
            <div className={affixWrap}>
              <input value={toMi} onChange={(e) => setToMi(onlyNum(e.target.value))} inputMode="decimal" placeholder="0" className={affixInput} />
              <span className={affixUnit}>mi</span>
            </div>
            <div className={hintCls}>{fromMi ? L(`Desde ${fromMi} mi hasta este radio.`, `From ${fromMi} mi out to this radius.`) : L('Distancia máxima desde tu local.', 'Max distance from your location.')}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className={fieldLabel}>{L('Tarifa de entrega', 'Delivery fee')}</div>
            <div className={affixWrap}>
              <span className={affixUnit}>$</span>
              <input value={fee} onChange={(e) => setFee(onlyNum(e.target.value))} onBlur={() => setFee((v) => (v.trim() === '' ? '' : (Number(v) || 0).toFixed(2)))} inputMode="decimal" placeholder="0.00" className={affixInput} />
            </div>
            <div className={hintCls}>{L('Vacío o 0 = Gratis.', 'Empty or 0 = Free.')}</div>
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Tiempo de entrega (ETA)', 'Delivery time (ETA)')}</div>
          <div className="flex items-center gap-2">
            <div className={`${affixWrap} min-w-0 flex-1`}>
              <input value={etaLo} onChange={(e) => setEtaLo(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="30" className={affixInput} />
            </div>
            <span className="flex-none text-[13px] font-extrabold text-muted-2">–</span>
            <div className={`${affixWrap} min-w-0 flex-1`}>
              <input value={etaHi} onChange={(e) => setEtaHi(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="45" className={affixInput} />
              <span className={affixUnit}>min</span>
            </div>
          </div>
          <div className={hintCls}>{L('Rango estimado que verá el cliente.', 'Estimated range the customer sees.')}</div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Color en el mapa', 'Map color')}</div>
          <div className="flex flex-wrap gap-x-2 gap-y-[18px]">
            {ZONE_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={L('Color', 'Color')}
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
  open, onClose, L, initial, onSave, onDelete, onUploadPhoto,
}: {
  open: boolean; onClose: () => void; L: Lx;
  initial: OwnDriver | null;
  onSave: (d: OwnDriver) => void;
  onDelete: () => void;
  // Uploads the file (Supabase Storage) and returns the public URL; the module
  // owns storage/auth so the editor stays presentational. Null = upload failed.
  onUploadPhoto?: (file: File) => Promise<string | null>;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [statusKey, setStatusKey] = useState<string>('available');
  const [color, setColor] = useState(DRIVER_COLORS[0]);
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setPhone(formatPhone(initial?.phone ?? ''));
    setVehicle(initial?.vehicle ?? '');
    setPhoto(initial?.photo ?? '');
    setPhotoBusy(false);
    const st = DRIVER_STATUS.find((s) => s.sEs === initial?.sEs);
    setStatusKey(st?.key ?? 'available');
    setColor(initial?.color ?? DRIVER_COLORS[0]);
    setConfirming(false);
  }, [open, initial]);

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file || !file.type.startsWith('image/') || photoBusy || !onUploadPhoto) return;
    setPhotoBusy(true);
    const url = await onUploadPhoto(file);
    if (url) setPhoto(url);
    setPhotoBusy(false);
  };

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
      photo: photo || undefined,
      vehicle: vehicle.trim() || undefined,
    });
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} width={430}>
      <OverlayTitle title={initial ? L('Editar repartidor', 'Edit driver') : L('Nuevo repartidor', 'New driver')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        {/* photo of the driver or their vehicle — tap the avatar to upload */}
        <div className="flex items-center gap-3.5">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
          <button type="button" onClick={() => fileRef.current?.click()} aria-label={L('Subir foto', 'Upload photo')} className="relative flex-none cursor-pointer">
            <span className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-[1.5px] border-lilac-line" style={{ background: photo ? '#EAE6F5' : color }}>
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgUrl(photo, ANCHO.tarjeta)} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[22px] font-extrabold text-white">{driverInitials(name)}</span>
              )}
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-cta-sm">
              {photoBusy ? <Loader2 size={13} stroke={2.6} className="animate-[spin_.8s_linear_infinite]" /> : <Camera size={13} stroke={2.4} />}
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-extrabold text-ink">{L('Foto', 'Photo')}</div>
            <div className="mt-0.5 text-[11px] font-medium leading-snug text-muted-2">{L('Del repartidor o su vehículo. Ayuda al cliente a identificarlo.', 'Of the driver or their vehicle. Helps the customer recognize them.')}</div>
            {photo && <button type="button" onClick={() => setPhoto('')} className="mt-1 inline-flex items-center gap-1 text-[11px] font-extrabold text-pink-dark"><X size={11} stroke={2.6} />{L('Quitar foto', 'Remove photo')}</button>}
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Nombre', 'Name')} *</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('Ej. Marco P.', 'e.g. Marco P.')} className={inputCls} />
        </div>
        <div>
          <div className={fieldLabel}>{L('Teléfono', 'Phone')}</div>
          <input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(713) 555-0142" inputMode="tel" autoComplete="tel" className={inputCls} />
          <div className={hintCls}>{L('Para llamar o enviar mensaje al asignar entregas.', 'To call or text when assigning deliveries.')}</div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Vehículo', 'Vehicle')}</div>
          <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder={L('Opcional · Honda Civic gris · ABC-1234', 'Optional · Gray Honda Civic · ABC-1234')} className={inputCls} />
        </div>
        <div>
          <div className={fieldLabel}>{L('Estado', 'Status')}</div>
          <div className="flex flex-wrap gap-x-2 gap-y-[18px]">
            {DRIVER_STATUS.map((s) => (
              <button key={s.key} type="button" onClick={() => setStatusKey(s.key)}
                className={`tap-y flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-extrabold ${statusKey === s.key ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-soft'}`}>
                <span className="h-2 w-2 rounded-full" style={{ background: statusKey === s.key ? '#fff' : s.dot }} />{L(s.sEs, s.sEn)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Color', 'Color')}</div>
          <div className="flex flex-wrap gap-x-2 gap-y-[18px]">
            {DRIVER_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={L('Color', 'Color')}
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
