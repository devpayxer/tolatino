'use client';

// Servicios / Reservas module (business dashboard). MODE TOGGLE Servicios ·
// Reservas. Servicios: a service catalog grouped by category (each service with
// a bookable↔inquiry toggle + an edit bottom-sheet), an analytics card and
// pending-inquiries list, plus a "Categorías" sub-tab to show/hide categories.
// Reservas: KPIs + sub-tabs Calendario (month grid) / Mesas (floor plan) / Lista
// (booking list + filters) / Reglas (booking rules + custom fields). A 4-step
// "add service" wizard (Detalles → Precio/duración → Disponibilidad → Revisar)
// ends in a success screen that returns to the list. Mobile-first; on desktop
// the analytics/inquiries + day detail move into a sticky side rail and lists go
// multi-column. Real state: mode, sub-tabs, bookable toggles, edit sheet, wizard.

import { useMemo, useState } from 'react';
import {
  CalendarCheck, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight,
  DollarSign, Gift, GraduationCap, Lock, MessageSquare, Plus, Sparkles, Tag,
  Users, Utensils, Wine, Wrench, X, XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';

// ---------- static model ----------
type CatId = 'tastings' | 'classes' | 'private' | 'catering';
type Svc = {
  id: number; cat: CatId; name: string; price: string; dur: string; bookable: boolean;
  es: string; en: string; tile: string; tags: string[];
};

const SVC_CATS: { id: CatId; es: string; en: string; tile: string; Icon: LucideIcon; sEs: string; sEn: string }[] = [
  { id: 'tastings', es: 'Degustaciones', en: 'Tastings', tile: '#F3D9E2 0 8px,#E8BFCD 8px 16px', Icon: Wine, sEs: 'Cena · con reserva', sEn: 'Dinner · by booking' },
  { id: 'classes', es: 'Clases y talleres', en: 'Classes & workshops', tile: '#EFE3D0 0 8px,#E2CFB2 8px 16px', Icon: GraduationCap, sEs: 'Fines de semana', sEn: 'Weekends' },
  { id: 'private', es: 'Eventos privados', en: 'Private events', tile: '#E3F5EA 0 8px,#D6E7D0 8px 16px', Icon: Gift, sEs: 'Bajo cotización', sEn: 'By quote' },
  { id: 'catering', es: 'Catering', en: 'Catering', tile: '#FCE3DC 0 8px,#F6CEC2 8px 16px', Icon: Utensils, sEs: 'Solo consulta', sEn: 'Inquiry only' },
];

const SEED: Svc[] = [
  { id: 1, cat: 'classes', name: 'Sourdough 101', price: '$85', dur: '2h', bookable: true, es: 'Aprende a hornear masa madre desde el fermento inicial. Incluye masa madre para llevar.', en: 'Learn to bake sourdough from the starter. Includes a starter to take home.', tile: '#EFE3D0 0 8px,#E2CFB2 8px 16px', tags: ['Más reservado'] },
  { id: 2, cat: 'classes', name: 'Pizza para familias', price: '$60', dur: '90 min', bookable: true, es: 'Taller práctico de pizza al horno de leña para toda la familia.', en: 'Hands-on wood-fired pizza workshop for the whole family.', tile: '#FCE3DC 0 8px,#F6CEC2 8px 16px', tags: ['Familiar'] },
  { id: 3, cat: 'tastings', name: 'Menú degustación', price: '$140', dur: '5 tiempos', bookable: true, es: '5 tiempos con maridaje de vino opcional. Mar–Dom, solo cena.', en: '5 courses with optional wine pairing. Tue–Sun, dinner only.', tile: '#F3D9E2 0 8px,#E8BFCD 8px 16px', tags: ['Premium'] },
  { id: 4, cat: 'tastings', name: 'Cata de vinos', price: '$45', dur: '75 min', bookable: true, es: 'Cata guiada de vinos de California e Italia con quesos artesanales.', en: 'Guided tasting of California & Italy wines with artisan cheese.', tile: '#F3D9E2 0 8px,#E8BFCD 8px 16px', tags: [] },
  { id: 5, cat: 'private', name: 'Comedor privado', price: 'Cotización', dur: '8–24 pers.', bookable: false, es: 'Reserva nuestra sala trasera para cenas privadas y eventos corporativos.', en: 'Book our back room for private dinners and corporate events.', tile: '#E3F5EA 0 8px,#D6E7D0 8px 16px', tags: [] },
  { id: 6, cat: 'catering', name: 'Catering · entrega', price: 'Desde $12/pers', dur: '20+ pers.', bookable: false, es: 'Catering para oficinas y eventos. Entrega o montaje en sitio.', en: 'Office & event catering. Drop-off or on-site setup.', tile: '#FCE3DC 0 8px,#F6CEC2 8px 16px', tags: [] },
];

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';
const stripe = (stops: string) => `repeating-linear-gradient(135deg,${stops})`;

type Draft = {
  name: string; desc: string; cat: CatId; price: string;
  priceType: 'fijo' | 'persona' | 'cotiza'; dur: string; tags: string[];
  bookable: boolean; deposit: boolean; capacity: string; days: string[];
};
const newDraft = (): Draft => ({ name: '', desc: '', cat: 'classes', price: '', priceType: 'fijo', dur: '60 min', tags: [], bookable: true, deposit: true, capacity: '1', days: ['Vie', 'Sáb', 'Dom'] });

// ---------- small switch ----------
function Switch({ on, onClick, big }: { on: boolean; onClick: () => void; big?: boolean }) {
  const w = big ? 42 : 38;
  const k = big ? 19 : 17;
  return (
    <span
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="relative inline-block flex-none cursor-pointer rounded-full transition-colors"
      style={{ width: w, height: big ? 25 : 23, background: on ? '#7B61FF' : '#D8D2E6' }}
    >
      <span
        className="absolute top-[3px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,.18)] transition-all"
        style={{ width: k, height: k, left: on ? w - k - 3 : 3 }}
      />
    </span>
  );
}

export function ServicesModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, es, isFree, isPremium, ci } = ctx;

  const [mode, setMode] = useState<'services' | 'bookings'>(tab === 'bookings' ? 'bookings' : 'services');
  const [svcSub, setSvcSub] = useState<'catalog' | 'cats'>('catalog');
  const [bookSub, setBookSub] = useState<'calendar' | 'floor' | 'list' | 'rules'>('calendar');
  const [view, setView] = useState<'module' | 'wizard' | 'success'>('module');

  const [services, setServices] = useState<Svc[]>(SEED);
  const [bookable, setBookable] = useState<Record<number, boolean>>(() => Object.fromEntries(SEED.map((s) => [s.id, s.bookable])));
  const [catShow, setCatShow] = useState<Record<CatId, boolean>>({ tastings: true, classes: true, private: true, catering: true });
  const [ruleSt, setRuleSt] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: true, 4: false });
  const [fieldSt, setFieldSt] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: false, 3: false, 4: true });
  const [selDay, setSelDay] = useState(14);
  const [bookFilter, setBookFilter] = useState<'all' | 'reservations' | 'classes' | 'private'>('all');

  const [wizStep, setWizStep] = useState(0);
  const [wizMax, setWizMax] = useState(0);
  const [draft, setDraft] = useState<Draft>(newDraft);

  const [sheetId, setSheetId] = useState<number | null>(null);
  const [edit, setEdit] = useState<Partial<Svc>>({});

  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };

  const upD = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const catOf = (id: CatId) => SVC_CATS.find((c) => c.id === id)!;
  const catName = (id: CatId) => L(catOf(id).es, catOf(id).en);
  const tagLabel = (t: string) => ({ 'Más reservado': L('Más reservado', 'Most booked'), Familiar: L('Familiar', 'Family'), Premium: L('Premium', 'Premium'), Nuevo: L('Nuevo', 'New') }[t] ?? t);

  // ============================ FREE GATE ============================
  // Servicios/Reservas is a Verified+ module. Free listings see the upsell.
  if (isFree) {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 pb-8">
        <div className="flex flex-col items-center rounded-card-sm border border-hair bg-white p-6 text-center shadow-card">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-[16px] bg-lilac-2 text-primary-dark"><Lock size={26} strokeWidth={2.2} /></span>
          <div className="text-[17px] font-extrabold text-ink">{L('Servicios y reservas', 'Services & bookings')}</div>
          <div className="mt-2 max-w-[380px] text-[12.5px] font-medium leading-relaxed text-muted">
            {L(`Publica servicios reservables para ${ci.name}, cobra depósitos y gestiona tu calendario. Disponible en el plan Verified.`, `Publish bookable services for ${ci.name}, take deposits and manage your calendar. Available on the Verified plan.`)}
          </div>
          <button onClick={() => ctx.go('billing')} className="mt-4 rounded-btn-lg bg-primary px-6 py-3 text-[13px] font-extrabold text-white shadow-cta-sm">{L('Iniciar verificación', 'Start verification')}</button>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {([[CalendarCheck, L('Reservas y depósitos', 'Bookings & deposits'), L('Citas con anticipo automático.', 'Appointments with auto-deposits.')], [MessageSquare, L('Consultas y cotizaciones', 'Inquiries & quotes'), L('Recolecta leads para servicios a medida.', 'Collect leads for custom work.')]] as [LucideIcon, string, string][]).map(([Icon, title, sub]) => (
            <div key={title} className="flex items-start gap-3 rounded-card-sm border border-hair bg-white p-3.5 shadow-card">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-lilac-2 text-primary-dark"><Icon size={17} strokeWidth={2.2} /></span>
              <div>
                <div className="text-[12.5px] font-extrabold text-ink">{title}</div>
                <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-muted-2">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================ SUCCESS ============================
  if (view === 'success') {
    const dc = catOf(draft.cat);
    return (
      <div className="mx-auto flex max-w-[440px] flex-col items-center pb-8 pt-4 text-center">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-[18px] bg-green-bg text-green">
          <CheckCircle2 size={34} strokeWidth={2.4} />
        </span>
        <div className="text-[21px] font-extrabold tracking-[-.02em] text-ink">
          {(draft.name || L('Nuevo servicio', 'New service')) + ' ' + L('está activo', 'is live')}
        </div>
        <div className="mt-2 max-w-[300px] text-[13px] font-medium leading-relaxed text-muted">
          {L('Ya aparece en la pestaña de Servicios de tu listado público.', "It now appears on your public listing's Services tab.")}
        </div>
        <div className={`mt-5 w-full overflow-hidden text-left ${cardCls}`}>
          <div className="h-[104px]" style={{ background: stripe(dc.tile) }} />
          <div className="flex items-center justify-between p-3.5">
            <div className="min-w-0">
              <div className="text-[14px] font-extrabold text-ink">{draft.name || L('Nuevo servicio', 'New service')}</div>
              <div className="mt-0.5 text-[11.5px] font-medium text-muted-2">{catName(draft.cat)} · {draft.dur} · {draft.priceType === 'cotiza' ? L('Cotización', 'Quote') : draft.price ? `$${draft.price}` : '$0'}</div>
            </div>
            <span className="flex-none rounded-lg bg-green-bg px-2.5 py-1.5 text-[10.5px] font-extrabold text-green-dark">{draft.bookable ? L('Reservable', 'Bookable') : L('Consulta', 'Inquiry')}</span>
          </div>
        </div>
        <div className="mt-5 flex w-full flex-col gap-2.5">
          <button onClick={() => { setDraft(newDraft()); setWizStep(0); setWizMax(0); setView('wizard'); }} className="flex items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta"><Plus size={16} strokeWidth={2.6} />{L('Agregar otro servicio', 'Add another service')}</button>
          <button onClick={() => { setView('module'); setMode('services'); setSvcSub('catalog'); }} className="rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3.5 text-[13.5px] font-extrabold text-ink">{L('Volver a servicios', 'Back to services')}</button>
        </div>
      </div>
    );
  }

  // ============================ WIZARD ============================
  if (view === 'wizard') {
    const dc = catOf(draft.cat);
    const steps: [string, string][] = [[L('Detalles', 'Details'), L('Detalles del servicio', 'Service details')], [L('Precio', 'Pricing'), L('Precio y duración', 'Pricing & duration')], [L('Disponibilidad', 'Availability'), L('Cómo y cuándo se vende', 'How & when it sells')], [L('Revisar', 'Review'), L('Revisar y publicar', 'Review & publish')]];
    const ready = !!draft.name && (!!draft.price || draft.priceType === 'cotiza');
    const goStep = (n: number) => { if (n <= wizMax) setWizStep(n); };
    const next = () => {
      if (wizStep >= steps.length - 1) {
        if (!ready) return flash(L('Agrega nombre y precio antes de publicar', 'Add a name and price before publishing'));
        const id = Math.max(0, ...services.map((s) => s.id)) + 1;
        const svc: Svc = { id, cat: draft.cat, name: draft.name, price: draft.priceType === 'cotiza' ? 'Cotización' : `$${draft.price || '0'}`, dur: draft.dur, bookable: draft.bookable, es: draft.desc, en: draft.desc, tile: dc.tile, tags: draft.tags };
        setServices((l) => [svc, ...l]);
        setBookable((b) => ({ ...b, [id]: draft.bookable }));
        setView('success');
        return;
      }
      const n = wizStep + 1; setWizStep(n); setWizMax((m) => Math.max(m, n));
    };
    const back = () => { if (wizStep === 0) { setView('module'); return; } setWizStep((s) => s - 1); };

    const label = 'mb-1.5 text-[11px] font-extrabold text-ink-soft';
    const field = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-[13px] font-semibold text-ink outline-none focus:border-primary';
    const chip = (on: boolean) => `flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12px] ${on ? 'bg-primary font-extrabold text-white' : 'bg-lilac-2 font-bold text-ink-soft'}`;
    const seg = (on: boolean) => `flex-none cursor-pointer rounded-lg px-3 py-1.5 text-[10.5px] font-extrabold ${on ? 'bg-primary text-white' : 'bg-lilac-2 text-muted-2'}`;

    const preview = (
      <div className={`overflow-hidden ${cardCls}`}>
        <div className="h-[96px]" style={{ background: stripe(dc.tile) }} />
        <div className="flex items-start justify-between gap-2.5 p-3.5">
          <div className="min-w-0">
            <div className={`text-[14px] font-extrabold ${draft.name ? 'text-ink' : 'text-muted-faint'}`}>{draft.name || L('Nombre del servicio', 'Service name')}</div>
            <div className="mt-0.5 text-[10.5px] font-medium text-muted-2">{catName(draft.cat)} · {draft.dur}</div>
          </div>
          <span className="whitespace-nowrap text-[14px] font-extrabold text-ink">{draft.priceType === 'cotiza' ? L('Cotización', 'Quote') : draft.price ? `$${draft.price}` : '$0'}</span>
        </div>
      </div>
    );

    return (
      <div className="relative pb-8">
        <div className="grid items-start gap-4 xl:grid-cols-[340px_1fr]">
          <div className="flex flex-col gap-3 xl:sticky xl:top-[74px]">
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              {steps.map(([lbl], i) => {
                const active = wizStep === i, done = i < wizMax && i !== wizStep;
                return (
                  <button key={lbl} onClick={() => goStep(i)} className={`flex flex-none items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-extrabold ${active ? 'bg-primary text-white' : done ? 'bg-lilac text-primary-dark' : 'bg-lilac-2 text-muted-2'}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold text-white ${active ? 'bg-white/25' : done ? 'bg-primary' : 'bg-muted-faint'}`}>{done ? '✓' : i + 1}</span>
                    {lbl}
                  </button>
                );
              })}
            </div>
            {preview}
          </div>

          <div className={`${cardCls} p-4 md:p-5`}>
            <div className="mb-4 text-[13.5px] font-extrabold text-ink">{steps[wizStep][1]}</div>

            {wizStep === 0 && (
              <div className="flex flex-col gap-4">
                <div>
                  <div className={label}>{L('Nombre del servicio', 'Service name')} *</div>
                  <input value={draft.name} onChange={(e) => upD({ name: e.target.value })} placeholder={L('Ej. Clase de pan', 'e.g. Bread class')} className={field} />
                </div>
                <div>
                  <div className={label}>{L('Descripción', 'Description')}</div>
                  <textarea value={draft.desc} onChange={(e) => upD({ desc: e.target.value })} rows={3} placeholder={L('Qué incluye, para quién, qué lo hace especial…', 'What it includes, for whom, what makes it special…')} className={`${field} resize-none leading-relaxed`} />
                </div>
                <div>
                  <div className={label}>{L('Categoría', 'Category')} *</div>
                  <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
                    {SVC_CATS.map((c) => <button key={c.id} onClick={() => upD({ cat: c.id })} className={chip(draft.cat === c.id)}>{L(c.es, c.en)}</button>)}
                  </div>
                </div>
                <div>
                  <div className={label}>{L('Etiquetas', 'Tags')}</div>
                  <div className="flex flex-wrap gap-2">
                    {['Más reservado', 'Familiar', 'Premium', 'Nuevo'].map((t) => {
                      const on = draft.tags.includes(t);
                      return <button key={t} onClick={() => upD({ tags: on ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] })} className={chip(on)}>{tagLabel(t)}</button>;
                    })}
                  </div>
                </div>
              </div>
            )}

            {wizStep === 1 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1">
                    <div className={label}>{L('Precio', 'Price')} *</div>
                    <div className="flex items-center rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 focus-within:border-primary">
                      <span className="text-[13px] font-bold text-muted-2">$</span>
                      <input value={draft.price} onChange={(e) => upD({ price: e.target.value })} inputMode="decimal" placeholder="0" className="w-full bg-transparent px-2 py-3 text-[13px] font-semibold text-ink outline-none" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className={label}>{L('Tipo', 'Type')}</div>
                    <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                      {([['fijo', L('Fijo', 'Fixed')], ['persona', L('Por pers.', 'Per person')], ['cotiza', L('Cotizar', 'Quote')]] as const).map(([k, lbl]) => <button key={k} onClick={() => upD({ priceType: k })} className={seg(draft.priceType === k)}>{lbl}</button>)}
                    </div>
                  </div>
                </div>
                <div>
                  <div className={label}>{L('Duración', 'Duration')}</div>
                  <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
                    {['30 min', '60 min', '90 min', '2h', '3h+'].map((d) => <button key={d} onClick={() => upD({ dur: d })} className={chip(draft.dur === d)}>{d}</button>)}
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-btn-lg border border-hair bg-app p-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-bold text-ink">{L('Requiere depósito', 'Require deposit')}</div>
                    <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-muted-2">{L('Cobra un anticipo al reservar.', 'Charge upfront at booking.')}</div>
                  </div>
                  <Switch big on={draft.deposit} onClick={() => upD({ deposit: !draft.deposit })} />
                </div>
              </div>
            )}

            {wizStep === 2 && (
              <div className="flex flex-col gap-4">
                <div>
                  <div className={label}>{L('¿Cómo se vende?', 'How is it sold?')}</div>
                  <div className="flex flex-col gap-2.5">
                    {([['bookable', L('Reservable', 'Bookable'), L('Acepta citas y depósitos', 'Accepts appointments & deposits'), CalendarCheck], ['inquiry', L('Solo consulta', 'Inquiry only'), L('Recolecta leads para cotizar', 'Collects leads to quote'), MessageSquare]] as const).map(([k, lbl, sub, Icon]) => {
                      const on = (k === 'bookable') === draft.bookable;
                      return (
                        <button key={k} onClick={() => upD({ bookable: k === 'bookable' })} className={`flex items-center gap-3 rounded-btn-lg border-[1.5px] p-3 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-lilac text-primary-dark"><Icon size={16} strokeWidth={2.2} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12.5px] font-extrabold text-ink">{lbl}</span>
                            <span className="mt-0.5 block text-[10px] font-semibold text-muted-2">{sub}</span>
                          </span>
                          <span className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-[1.5px] ${on ? 'border-primary' : 'border-muted-faint'}`}>{on && <span className="h-2 w-2 rounded-full bg-primary" />}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {draft.bookable && (
                  <>
                    <div>
                      <div className={label}>{L('Capacidad por sesión', 'Capacity per session')}</div>
                      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
                        {['1', '2–6', '8–16', '20+'].map((c) => <button key={c} onClick={() => upD({ capacity: c })} className={chip(draft.capacity === c)}>{c}</button>)}
                      </div>
                    </div>
                    <div>
                      <div className={label}>{L('Días disponibles', 'Available days')}</div>
                      <div className="flex flex-wrap gap-2">
                        {(es ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((d, i) => {
                          const key = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i];
                          const on = draft.days.includes(key);
                          return <button key={key} onClick={() => upD({ days: on ? draft.days.filter((x) => x !== key) : [...draft.days, key] })} className={`h-9 w-11 flex-none rounded-lg text-[11px] font-extrabold ${on ? 'bg-primary text-white' : 'bg-lilac-2 text-muted-2'}`}>{d}</button>;
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {wizStep === 3 && (
              <div className="flex flex-col gap-4">
                <div className={`flex items-center gap-3 rounded-btn-lg border p-3.5 ${ready ? 'border-[#A7E3C0] bg-green-bg' : 'border-[#FDE68A] bg-amber-bg'}`}>
                  <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-white text-[15px] font-extrabold ${ready ? 'text-green-dark' : 'text-amber-ink'}`}>{ready ? '✓' : '⚠'}</span>
                  <div className="min-w-0">
                    <div className={`text-[12px] font-extrabold ${ready ? 'text-green-dark' : 'text-amber-ink'}`}>{ready ? L('Listo para publicar', 'Ready to publish') : L('Faltan datos', 'A few essentials missing')}</div>
                    <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-ink-3">{ready ? L('Todo en orden. Aparecerá en tu listado al instante.', "All set. It'll appear on your listing instantly.") : L('Agrega nombre y precio antes de publicar.', 'Add a name and price before publishing.')}</div>
                  </div>
                </div>
                <div className="overflow-hidden rounded-btn-lg border border-hair">
                  {([[L('Nombre', 'Name'), draft.name || '—', !!draft.name, 0], [L('Categoría', 'Category'), catName(draft.cat), true, 0], [L('Precio', 'Price'), draft.priceType === 'cotiza' ? L('Cotización', 'By quote') : draft.price ? `$${draft.price}${draft.priceType === 'persona' ? L('/pers', '/person') : ''}` : '—', !!draft.price || draft.priceType === 'cotiza', 1], [L('Duración', 'Duration'), draft.dur, true, 1], [L('Modo', 'Mode'), draft.bookable ? L('Reservable', 'Bookable') : L('Solo consulta', 'Inquiry only'), true, 2]] as [string, string, boolean, number][]).map((r, i, a) => (
                    <div key={r[0]} className={`flex items-center gap-3 px-3.5 py-3 ${i < a.length - 1 ? 'border-b border-hair' : ''}`}>
                      <span className="w-20 flex-none text-[10.5px] font-semibold text-muted-2">{r[0]}</span>
                      <span className={`min-w-0 flex-1 truncate text-[11.5px] font-bold ${r[2] ? 'text-ink' : 'text-muted-faint'}`}>{r[1]}</span>
                      <button onClick={() => goStep(r[3])} className="flex-none cursor-pointer text-[10.5px] font-extrabold text-primary-dark">{L('Editar', 'Edit')}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* wizard footer */}
        <div className="sticky bottom-0 z-20 mt-4 flex items-center gap-3 border-t border-hair bg-white/95 px-1 py-3 backdrop-blur">
          <button onClick={back} className="flex h-11 w-11 flex-none items-center justify-center rounded-btn-lg bg-lilac-2 text-ink"><ChevronLeft size={18} strokeWidth={2.4} /></button>
          <div className="hidden flex-1 text-center text-[11px] font-semibold text-muted-2 sm:block">{L('Paso ', 'Step ')}{wizStep + 1}{L(' de ', ' of ')}{steps.length}</div>
          <button onClick={next} className="flex-1 rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta-sm sm:flex-none sm:px-8">{wizStep >= steps.length - 1 ? L('Publicar servicio', 'Publish service') : L('Continuar', 'Continue')}</button>
        </div>

        {toast && <Toast>{toast}</Toast>}
      </div>
    );
  }

  // ============================ MODULE ============================
  const modeBtn = (on: boolean) => `flex flex-1 items-center justify-center gap-2 rounded-btn py-2.5 text-[12.5px] font-extrabold ${on ? 'bg-ink text-white' : 'bg-lilac-2 text-ink-2'}`;
  const chipCls = (on: boolean) => `flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12.5px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;

  // ---- services · catalog ----
  const groups = SVC_CATS.map((c) => ({ cat: c, list: services.filter((s) => s.cat === c.id) })).filter((g) => g.list.length);

  const analyticsCard = (
    <div className={`${cardCls} p-4`}>
      <div className="mb-3 text-[12.5px] font-extrabold text-ink">{L('Ingresos por servicios · 30 días', 'Service revenue · 30 days')}</div>
      <div className="mb-3 grid grid-cols-3 gap-2.5">
        {[[L('Ingresos', 'Revenue'), '$24.8k', '▲ 38%'], [L('Reservas', 'Bookings'), '128', '▲ 22%'], [L('Conversión', 'Conversion'), '62%', '▲ 8pp']].map((k) => (
          <div key={k[0]} className="rounded-btn-lg bg-app p-2.5">
            <div className="text-[9px] font-semibold text-muted-2">{k[0]}</div>
            <div className="mt-1 text-[16px] font-extrabold text-ink">{k[1]}</div>
            <div className="text-[9px] font-extrabold text-green">{k[2]}</div>
          </div>
        ))}
      </div>
      <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[.05em] text-muted-faint">{L('Mejores ingresos', 'Best earners')}</div>
      {([['Sourdough 101', '48 · $4,080', '100%', '#4F46E5'], ['Comedor privado', '28 · $3,920', '92%', '#7C6BFF'], ['Pizza para familias', '22 · $2,860', '70%', '#A78BFA'], ['Cata de vinos', '18 · $1,440', '55%', '#10B981']] as [string, string, string, string][]).map((b) => (
        <div key={b[0]} className="py-1.5">
          <div className="mb-1 flex justify-between text-[11.5px]"><span className="truncate font-bold text-ink">{b[0]}</span><span className="flex-none pl-2 font-bold text-muted-2">{b[1]}</span></div>
          <span className="block h-[5px] overflow-hidden rounded-full bg-lilac-2"><span className="block h-full rounded-full" style={{ width: b[2], background: b[3] }} /></span>
        </div>
      ))}
    </div>
  );

  const inquiriesCard = (
    <div className={`${cardCls} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink"><MessageSquare size={14} strokeWidth={2.2} className="text-primary-dark" />{L('Consultas pendientes', 'Pending inquiries')}</span>
        <span className="rounded-lg bg-amber-bg px-2 py-0.5 text-[9.5px] font-extrabold text-amber-ink">8</span>
      </div>
      <div className="flex flex-col">
        {([['MV', '#7B61FF', 'Mariana V.', L('Comedor privado · 18 pers.', 'Private dining · 18 ppl'), '9 Nov · 7 PM'], ['MT', '#1F9D57', 'Mission Tech', L('Catering · 80 pers.', 'Catering · 80 ppl'), '18 Oct · 12 PM'], ['SJ', '#E8954A', 'Sarah J.', L('Pastel de boda · cata', 'Wedding cake · tasting'), 'Nov']] as [string, string, string, string, string][]).map((i, idx, a) => (
          <div key={i[2]} className={`flex items-center gap-2.5 py-2.5 ${idx < a.length - 1 ? 'border-b border-hair' : ''}`}>
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[11px] font-extrabold text-white" style={{ background: i[1] }}>{i[0]}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-extrabold text-ink">{i[2]}</div>
              <div className="truncate text-[10px] font-medium text-muted-2">{i[3]} · {i[4]}</div>
            </div>
            <button onClick={() => flash(L('Cotización enviada', 'Quote sent'))} className="flex-none rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-extrabold text-white">{L('Cotizar', 'Quote')}</button>
          </div>
        ))}
      </div>
    </div>
  );

  const catalog = (
    <div className="grid items-start gap-4 xl:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-card-sm bg-lilac-2 p-3">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-primary text-white"><CalendarCheck size={16} strokeWidth={2.2} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-extrabold text-ink">{L('Módulo de reservas activo', 'Bookings module active')}</div>
            <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-ink-3">{L('Los servicios reservables aceptan reservas y depósitos.', 'Bookable services accept bookings & deposits.')}</div>
          </div>
          <button onClick={() => setMode('bookings')} className="flex-none rounded-[9px] bg-white px-2.5 py-2 text-[10.5px] font-extrabold text-primary-dark">{L('Reservas', 'Bookings')} ›</button>
        </div>

        {groups.map((g) => (
          <div key={g.cat.id}>
            <div className="mb-2.5 flex items-center gap-2.5">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-white" style={{ background: stripe(g.cat.tile) }}><g.cat.Icon size={16} strokeWidth={2.2} /></span>
              <div className="min-w-0">
                <div className="text-[13px] font-extrabold text-ink">{L(g.cat.es, g.cat.en)}</div>
                <div className="text-[10px] font-semibold text-muted-2">{g.list.length} {L('servicios', 'services')} · {L(g.cat.sEs, g.cat.sEn)}</div>
              </div>
            </div>
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-1">
              {g.list.map((s) => {
                const bk = bookable[s.id];
                return (
                  <div key={s.id} className={`${cardCls} p-3`}>
                    <button onClick={() => { setSheetId(s.id); setEdit({ ...s, es: s.es }); }} className="flex w-full gap-3 text-left">
                      <span className="h-[60px] w-[60px] flex-none rounded-tile" style={{ background: stripe(s.tile) }} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-[13.5px] font-extrabold text-ink">{s.name}</span>
                          <span className="whitespace-nowrap text-[13.5px] font-extrabold text-ink">{s.price}</span>
                        </span>
                        <span className="mt-0.5 block text-[10.5px] font-semibold text-muted-2">{s.dur} · {bk ? L('reservable', 'bookable') : L('solo consulta', 'inquiry only')}</span>
                        <span className="mt-1.5 line-clamp-2 block text-[11px] font-medium leading-snug text-ink-3">{L(s.es, s.en)}</span>
                      </span>
                    </button>
                    <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-hair pt-2.5">
                      <div className="flex items-center gap-2">
                        <Switch on={bk} onClick={() => setBookable((b) => ({ ...b, [s.id]: !bk }))} />
                        <span className={`text-[10.5px] font-bold ${bk ? 'text-primary-dark' : 'text-muted-2'}`}>{bk ? L('Reservas activas', 'Bookings on') : L('Solo consulta', 'Inquiry only')}</span>
                      </div>
                      <button onClick={() => bk ? setMode('bookings') : flash(L('8 leads sin cotizar', '8 uncontacted leads'))} className="text-[10.5px] font-extrabold text-primary-dark">{bk ? L('Ver reservas', 'View bookings') : L('Leads · 8', 'Leads · 8')} ›</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 xl:sticky xl:top-[74px]">
        {analyticsCard}
        {inquiriesCard}
      </div>
    </div>
  );

  // ---- services · categories ----
  const categories = (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-3 text-[11.5px] font-medium leading-relaxed text-ink-3">{L('Agrupa tus servicios en secciones. Activa/desactiva para mostrar en el listado.', 'Group services into sections. Toggle to show on the listing.')}</div>
      <div className="grid gap-2.5 md:grid-cols-2">
        {SVC_CATS.map((c) => {
          const on = catShow[c.id];
          const n = services.filter((s) => s.cat === c.id).length;
          return (
            <div key={c.id} className={`flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3 shadow-card ${on ? '' : 'opacity-60'}`}>
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[11px] text-white" style={{ background: stripe(c.tile) }}><c.Icon size={18} strokeWidth={2.2} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-extrabold text-ink">{L(c.es, c.en)}</span>
                  {!on && <span className="rounded bg-lilac-2 px-1.5 py-px text-[8.5px] font-extrabold text-muted-2">{L('Oculto', 'Hidden')}</span>}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold text-muted-2">{n} {L('servicios', 'services')} · {L(c.sEs, c.sEn)}</div>
              </div>
              <Switch big on={on} onClick={() => setCatShow((s) => ({ ...s, [c.id]: !on }))} />
            </div>
          );
        })}
      </div>
      <button onClick={() => flash(L('Nueva categoría creada', 'New category created'))} className="mt-3.5 w-full rounded-card-sm border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 py-3.5 text-[12.5px] font-extrabold text-primary-dark">+ {L('Nueva categoría', 'New category')}</button>
    </div>
  );

  // ---- bookings ----
  const kpis = [
    { Icon: CalendarDays, c: '#6D4DF6', bg: '#EFEBFF', label: L('Próximas · 30d', 'Upcoming · 30d'), value: '128', delta: '▲ 22%', dC: 'text-green' },
    { Icon: Users, c: '#2A5C8A', bg: '#E4ECFB', label: L('Tamaño prom.', 'Avg party'), value: '3.4', delta: '▲ 0.4', dC: 'text-green' },
    { Icon: XCircle, c: '#9A6A12', bg: '#FCEFD6', label: L('No-shows', 'No-show rate'), value: '4.2%', delta: '▼ 1.8pp', dC: 'text-green' },
    { Icon: DollarSign, c: '#D6336C', bg: '#FDE7EF', label: L('Depósitos', 'Deposits held'), value: '$2,840', delta: L('8 activos', '8 active'), dC: 'text-muted-2' },
  ];

  const dows = es ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const eventDays: Record<number, string[]> = { 2: ['#D6336C', '#7B61FF'], 5: ['#7B61FF'], 8: ['#D6336C'], 11: ['#1F9D57'], 14: ['#D6336C', '#7B61FF'], 18: ['#D6336C'], 22: ['#7B61FF', '#1F9D57'], 25: ['#D6336C'], 28: ['#1F9D57'], 31: ['#D6336C', '#7B61FF'] };

  const bookingsRaw = useMemo(() => ([
    { time: '7:00 PM', nm: 'Daniel K.', kind: 'reservations', type: L('Reserva · 2 pers.', 'Reservation · party 2'), table: 'T1', deposit: '', vip: false, notes: L('Aniversario — mesa junto a la ventana.', 'Anniversary — window table please.'), st: 'ok' },
    { time: '7:30 PM', nm: 'Anna F.', kind: 'reservations', type: L('Menú degustación · 2', 'Tasting menu · party 2'), table: 'T4', deposit: '$140', vip: true, notes: L('Maridaje de vino. Alergia: marisco.', 'Wine pairing. Allergy: shellfish.'), st: 'ok' },
    { time: '7:45 PM', nm: 'James T.', kind: 'reservations', type: L('Reserva · 6 pers.', 'Reservation · party 6'), table: 'T9', deposit: '$50', vip: false, notes: L('Trae pastel de cumpleaños.', 'Bringing birthday cake.'), st: 'pending' },
    { time: '8:00 PM', nm: 'Sofia R.', kind: 'classes', type: L('Sourdough 101 · clase', 'Sourdough 101 · class'), table: '14/16', deposit: '$85', vip: false, notes: '', st: 'ok' },
    { time: '8:30 PM', nm: 'Mission Tech', kind: 'private', type: L('Comedor privado · 18', 'Private dining · 18'), table: L('Sala', 'Back room'), deposit: '$500', vip: true, notes: L('2 vegetarianos, 1 sin gluten.', '2 vegetarian, 1 GF.'), st: 'ok' },
  ]), [es]);
  const bookingList = bookFilter === 'all' ? bookingsRaw : bookingsRaw.filter((b) => b.kind === bookFilter);

  const filterChip = (on: boolean) => `flex-none cursor-pointer rounded-lg px-2.5 py-1.5 text-[10.5px] font-extrabold ${on ? 'bg-primary text-white' : 'bg-lilac-2 text-muted-2'}`;

  const bookingCards = (
    <div className="flex flex-col gap-2.5">
      {bookingList.map((b) => {
        const dt = b.st === 'pending' ? { bg: '#FDE7EF', c: '#D6336C' } : b.kind === 'private' ? { bg: '#E3F5EA', c: '#1F8A4C' } : { bg: '#EFEBFF', c: '#6D4DF6' };
        return (
          <div key={b.nm + b.time} className={`${cardCls} flex gap-3 p-3`}>
            <div className="w-12 flex-none rounded-btn-lg py-1.5 text-center" style={{ background: dt.bg }}>
              <div className="text-[8.5px] font-bold" style={{ color: dt.c }}>{b.time.split(' ')[1]}</div>
              <div className="text-[14px] font-extrabold leading-none" style={{ color: dt.c }}>{b.time.split(':')[0]}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[12.5px] font-extrabold text-ink">{b.nm}</span>
                {b.vip && <span className="rounded bg-amber-bg px-1.5 py-px text-[8px] font-extrabold text-amber-ink">★ VIP</span>}
              </div>
              <div className="mt-0.5 text-[10.5px] font-semibold text-ink-3">{b.type}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-lilac-2 px-1.5 py-0.5 text-[9px] font-bold text-ink-2">{b.table}</span>
                {b.deposit && <span className="rounded bg-green-bg px-1.5 py-0.5 text-[9px] font-extrabold text-green-dark">{L('Depósito', 'Deposit')} {b.deposit}</span>}
              </div>
              {b.notes && <div className="mt-1.5 rounded-r-md border-l-2 border-lilac-line bg-app px-2 py-1.5 text-[10px] font-medium italic leading-snug text-muted-2">&ldquo;{b.notes}&rdquo;</div>}
            </div>
            <span className={`flex-none self-start rounded-md px-2 py-1 text-[9px] font-extrabold ${b.st === 'pending' ? 'bg-pink-bg text-pink-dark' : 'bg-green-bg text-green-dark'}`}>{b.st === 'pending' ? L('Por confirmar', 'Pending') : L('Confirmada', 'Confirmed')}</span>
          </div>
        );
      })}
    </div>
  );

  const dayHeader = (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <span className="text-[13px] font-extrabold text-ink">{L('Octubre ', 'October ')}{selDay}{L(' · reservas', ' · bookings')}</span>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {([['all', L('Todas', 'All')], ['reservations', L('Reservas', 'Reservations')], ['classes', L('Clases', 'Classes')], ['private', L('Privados', 'Private')]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setBookFilter(k)} className={filterChip(bookFilter === k)}>{lbl}</button>
        ))}
      </div>
    </div>
  );

  const calendarCard = (
    <div className={`${cardCls} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-extrabold text-ink">{L('Octubre', 'October')} 2025</span>
        <div className="flex gap-1.5">
          <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-hair bg-white text-ink-2"><ChevronLeft size={14} strokeWidth={2.4} /></button>
          <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-hair bg-white text-ink-2"><ChevronRight size={14} strokeWidth={2.4} /></button>
        </div>
      </div>
      <div className="mb-1.5 grid grid-cols-7 gap-1 text-center">{dows.map((d, i) => <span key={i} className="text-[9px] font-extrabold text-muted-faint">{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, i) => {
          const dn = i - 1 + 1; const vis = dn >= 1 && dn <= 31;
          const today = dn === 14, sel = dn === selDay;
          const dots = vis && eventDays[dn] ? eventDays[dn] : [];
          return (
            <button key={i} onClick={() => vis && setSelDay(dn)} className={`flex aspect-square flex-col items-center justify-center rounded-lg text-[11px] font-extrabold ${sel ? 'bg-primary text-white' : today ? 'bg-lilac text-primary-dark' : vis ? 'bg-app text-ink' : 'cursor-default bg-transparent text-transparent'}`}>
              <span>{vis ? dn : ''}</span>
              <span className="mt-0.5 flex h-1 gap-0.5">{dots.map((c, j) => <span key={j} className="h-1 w-1 rounded-full" style={{ background: sel ? '#fff' : c }} />)}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 border-t border-hair pt-3">
        {([['#D6336C', L('Reservas', 'Reservations')], ['#7B61FF', L('Clases', 'Classes')], ['#1F9D57', L('Privados', 'Private')]] as [string, string][]).map((l) => (
          <span key={l[1]} className="flex items-center gap-1.5 text-[9.5px] font-bold text-ink-2"><span className="h-2 w-2 rounded-full" style={{ background: l[0] }} />{l[1]}</span>
        ))}
      </div>
    </div>
  );

  const tables = [
    { l: 'T1·2', s: 'free', x: '6%', y: '14%', w: 54, h: 36, r: false }, { l: 'T2·4', s: 'taken', x: '32%', y: '14%', w: 54, h: 36, r: false }, { l: 'T3·4', s: 'taken', x: '58%', y: '14%', w: 54, h: 36, r: false },
    { l: 'T4·6', s: 'held', x: '6%', y: '40%', w: 72, h: 36, r: false }, { l: 'T5·2', s: 'free', x: '44%', y: '40%', w: 54, h: 36, r: false }, { l: 'T6·6', s: 'taken', x: '70%', y: '40%', w: 72, h: 36, r: false },
    { l: 'B1', s: 'free', x: '6%', y: '70%', w: 34, h: 34, r: true }, { l: 'B2', s: 'taken', x: '24%', y: '70%', w: 34, h: 34, r: true }, { l: 'P3·4', s: 'held', x: '58%', y: '70%', w: 64, h: 34, r: false },
  ];
  const tblColor: Record<string, string[]> = { free: ['#BBF7D0', '#22C55E', '#137A3A'], taken: ['#FCA5A5', '#DC2626', '#B91C1C'], held: ['#C7D2FE', '#4F46E5', '#3730A3'] };

  const floorCard = (
    <div className={`${cardCls} p-4`}>
      <div className="mb-3 text-[12.5px] font-extrabold text-ink">{L('Plano de mesas', 'Floor plan')} · 7 PM</div>
      <div className="relative h-[230px] overflow-hidden rounded-btn-lg border border-hair bg-app">
        <span className="absolute left-3 top-2.5 text-[9px] font-extrabold uppercase tracking-[.05em] text-muted-faint">{L('Comedor', 'Main dining')}</span>
        {tables.map((tb) => {
          const c = tblColor[tb.s];
          return <div key={tb.l} className="absolute flex items-center justify-center text-[9px] font-extrabold" style={{ left: tb.x, top: tb.y, width: tb.w, height: tb.h, background: c[0], border: `1.5px solid ${c[1]}`, borderRadius: tb.r ? 99 : 8, color: c[2] }}>{tb.l}</div>;
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        {([['#BBF7D0', '#22C55E', L('Libre', 'Available'), '8'], ['#FCA5A5', '#DC2626', L('Ocupada', 'Seated'), '7'], ['#C7D2FE', '#4F46E5', L('Reservada', 'Reserved'), '4']] as [string, string, string, string][]).map((l) => (
          <span key={l[2]} className="flex items-center gap-1.5 text-[9.5px] font-bold text-ink-2"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: l[0], border: `1.5px solid ${l[1]}` }} />{l[2]} {l[3]}</span>
        ))}
      </div>
      <div className="mt-2 text-[10px] font-semibold text-muted-2">{L('Capacidad', 'Capacity')}: 64 {L('lugares', 'seats')} · 73% {L('uso', 'utilization')}</div>
    </div>
  );

  const rulesCard = (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <div>
        <div className="mb-2.5 text-[12px] font-extrabold text-ink">{L('Reglas de reserva', 'Booking rules')}</div>
        <div className={`${cardCls} px-3.5`}>
          {[L('Reservas con 30 días de anticipación', 'Reservations open 30 days ahead'), L('Depósito de $25 para grupos de 6+', '$25 deposit for parties of 6+'), L('Cancelación con 24h', '24h cancellation policy'), L('Auto-confirmar grupos ≤ 4', 'Auto-confirm parties ≤ 4'), L('Permitir lista de espera', 'Allow waitlist when full')].map((r, i, a) => (
            <div key={i} className={`flex items-center justify-between gap-3 py-3 ${i < a.length - 1 ? 'border-b border-hair' : ''}`}>
              <span className="text-[12px] font-semibold text-ink">{r}</span>
              <Switch big on={!!ruleSt[i]} onClick={() => setRuleSt((s) => ({ ...s, [i]: !s[i] }))} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2.5 text-[12px] font-extrabold text-ink">{L('Campos de reserva', 'Booking fields')}</div>
        <div className={`${cardCls} p-3.5`}>
          <div className="mb-3 flex items-center gap-2.5 rounded-btn-lg bg-lilac-2 p-2.5">
            <Tag size={15} strokeWidth={2} className="flex-none text-primary-dark" />
            <div className="min-w-0">
              <div className="text-[11.5px] font-extrabold text-ink">{L('Campos de reserva · Restaurante', 'Booking fields · Restaurant')}</div>
              <div className="mt-0.5 text-[10px] font-medium leading-snug text-ink-3">{L('Lo que tus clientes llenan. Cambia según la categoría.', 'What guests fill in. Changes by category.')}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {[L('Tamaño del grupo', 'Party size'), L('Fecha y hora', 'Date & time'), L('Preferencia de mesa', 'Seating preference'), L('Restricciones dietéticas', 'Dietary restrictions'), L('Teléfono (recordatorios SMS)', 'Phone (SMS reminders)')].map((f, i) => {
              const req = !!fieldSt[i];
              return (
                <button key={i} onClick={() => setFieldSt((s) => ({ ...s, [i]: !s[i] }))} className="flex items-center gap-2.5 rounded-lg bg-app px-3 py-2.5 text-left">
                  <Tag size={12} strokeWidth={2.2} className="flex-none text-muted-faint" />
                  <span className="flex-1 text-[11.5px] font-semibold text-ink">{f}</span>
                  <span className={`flex-none rounded-md px-2 py-0.5 text-[9px] font-extrabold ${req ? 'bg-pink-bg text-pink-dark' : 'bg-lilac-2 text-muted-2'}`}>{req ? L('Obligatorio', 'Required') : L('Opcional', 'Optional')}</span>
                </button>
              );
            })}
            <button onClick={() => flash(L('Campo personalizado agregado', 'Custom field added'))} className="mt-1 self-start rounded-lg border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 px-3 py-2 text-[10.5px] font-extrabold text-primary-dark">+ {L('Campo personalizado', 'Custom field')}</button>
          </div>
        </div>
      </div>
    </div>
  );

  const bookings = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${cardCls} p-3`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: k.bg }}><k.Icon size={16} strokeWidth={2.2} style={{ color: k.c }} /></span>
            <div className="mt-2 text-[10px] font-semibold text-muted-2">{k.label}</div>
            <div className="mt-0.5 text-[19px] font-extrabold text-ink">{k.value}</div>
            <div className={`text-[9.5px] font-extrabold ${k.dC}`}>{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 rounded-btn border border-hair bg-white p-1">
        {([['calendar', L('Calendario', 'Calendar')], ['floor', L('Mesas', 'Floor')], ['list', L('Lista', 'List')], ['rules', L('Reglas', 'Rules')]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setBookSub(k)} className={`flex-1 rounded-[9px] py-2 text-[11px] font-extrabold ${bookSub === k ? 'bg-primary text-white' : 'text-ink-2'}`}>{lbl}</button>
        ))}
      </div>

      {bookSub === 'calendar' && (
        <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
          {calendarCard}
          <div className="xl:sticky xl:top-[74px]">{dayHeader}{bookingCards}</div>
        </div>
      )}
      {bookSub === 'floor' && (
        <div className="grid items-start gap-4 xl:grid-cols-[1.2fr_1fr]">
          {floorCard}
          <div className="xl:sticky xl:top-[74px]">{dayHeader}{bookingCards}</div>
        </div>
      )}
      {bookSub === 'list' && <div>{dayHeader}<div className="grid gap-2.5 md:grid-cols-2">{bookingList.map((b) => {
        const dt = b.st === 'pending' ? { bg: '#FDE7EF', c: '#D6336C' } : b.kind === 'private' ? { bg: '#E3F5EA', c: '#1F8A4C' } : { bg: '#EFEBFF', c: '#6D4DF6' };
        return (
          <div key={b.nm + b.time} className={`${cardCls} flex gap-3 p-3`}>
            <div className="w-12 flex-none rounded-btn-lg py-1.5 text-center" style={{ background: dt.bg }}>
              <div className="text-[8.5px] font-bold" style={{ color: dt.c }}>{b.time.split(' ')[1]}</div>
              <div className="text-[14px] font-extrabold leading-none" style={{ color: dt.c }}>{b.time.split(':')[0]}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5"><span className="text-[12.5px] font-extrabold text-ink">{b.nm}</span>{b.vip && <span className="rounded bg-amber-bg px-1.5 py-px text-[8px] font-extrabold text-amber-ink">★ VIP</span>}</div>
              <div className="mt-0.5 text-[10.5px] font-semibold text-ink-3">{b.type}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><span className="rounded bg-lilac-2 px-1.5 py-0.5 text-[9px] font-bold text-ink-2">{b.table}</span>{b.deposit && <span className="rounded bg-green-bg px-1.5 py-0.5 text-[9px] font-extrabold text-green-dark">{L('Depósito', 'Deposit')} {b.deposit}</span>}</div>
            </div>
            <span className={`flex-none self-start rounded-md px-2 py-1 text-[9px] font-extrabold ${b.st === 'pending' ? 'bg-pink-bg text-pink-dark' : 'bg-green-bg text-green-dark'}`}>{b.st === 'pending' ? L('Por confirmar', 'Pending') : L('Confirmada', 'Confirmed')}</span>
          </div>
        );
      })}</div></div>}
      {bookSub === 'rules' && rulesCard}
    </div>
  );

  // ---- edit sheet ----
  const sheetSvc = services.find((s) => s.id === sheetId);

  return (
    <div className="relative pb-8">
      {/* mode toggle */}
      <div className="mb-3 flex gap-2">
        <button onClick={() => setMode('services')} className={modeBtn(mode === 'services')}><Wrench size={14} strokeWidth={2} />{L('Servicios', 'Services')}</button>
        <button onClick={() => setMode('bookings')} className={modeBtn(mode === 'bookings')}><CalendarDays size={14} strokeWidth={2} />{L('Reservas', 'Bookings')}{mode === 'bookings' && <span className="rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-extrabold text-white">128</span>}</button>
      </div>

      {/* services sub-tabs */}
      {mode === 'services' && (
        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
          <button onClick={() => setSvcSub('catalog')} className={chipCls(svcSub === 'catalog')}>{L('Catálogo', 'Catalog')}</button>
          <button onClick={() => setSvcSub('cats')} className={chipCls(svcSub === 'cats')}>
            {L('Categorías', 'Categories')}<span className={`ml-1.5 font-extrabold ${svcSub === 'cats' ? 'text-white/80' : 'text-muted-2'}`}>{SVC_CATS.length}</span>
          </button>
        </div>
      )}

      {mode === 'services' ? (svcSub === 'catalog' ? catalog : categories) : bookings}

      {/* add-service CTA (services mode) */}
      {mode === 'services' && (
        <button onClick={() => { setDraft(newDraft()); setWizStep(0); setWizMax(0); setView('wizard'); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[14px] font-extrabold text-white shadow-cta md:w-auto md:px-8">
          <Plus size={16} strokeWidth={2.6} />{L('Nuevo servicio', 'New service')}
        </button>
      )}

      {/* premium teaser (verified only) */}
      {!isPremium && (
        <div className="mt-4 flex flex-wrap items-center gap-3.5 rounded-card-sm p-4 text-white shadow-band" style={{ background: 'linear-gradient(140deg,#1E1B2E,#3A2E6E)' }}>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn bg-[rgba(244,183,64,.2)] text-amber"><Sparkles size={18} strokeWidth={2.2} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-extrabold">{L('Recordatorios SMS y depósitos automáticos', 'SMS reminders & auto-deposits')}</span>
            <span className="mt-0.5 block max-w-[520px] text-[11.5px] font-medium leading-snug text-[rgba(255,255,255,.7)]">{L('Reduce no-shows con recordatorios y cobra anticipos sin esfuerzo. Incluido en Premium.', 'Cut no-shows with reminders and collect deposits hands-free. Included with Premium.')}</span>
          </span>
          <button onClick={() => ctx.go('billing')} className="flex-none rounded-btn bg-amber px-3.5 py-2.5 text-[12px] font-extrabold text-ink">{L('Mejorar a Premium', 'Upgrade to Premium')}</button>
        </div>
      )}

      {/* edit bottom sheet */}
      {sheetSvc && (
        <>
          <div onClick={() => { setSheetId(null); setEdit({}); }} className="fixed inset-0 z-40 bg-[rgba(28,24,46,.5)]" />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88%] max-w-[560px] overflow-y-auto rounded-t-[24px] bg-white shadow-sheet">
            <div className="sticky top-0 flex justify-center bg-white pb-1.5 pt-2.5">
              <span className="h-[5px] w-10 rounded-full bg-lilac-line" />
              <button onClick={() => { setSheetId(null); setEdit({}); }} className="absolute right-3.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-lilac-2 text-ink"><X size={13} strokeWidth={2.6} /></button>
            </div>
            <div className="h-[120px]" style={{ background: stripe(sheetSvc.tile) }} />
            <div className="flex flex-col gap-3.5 p-4">
              <div className="text-[16px] font-extrabold text-ink">{L('Editar servicio', 'Edit service')}</div>
              <div>
                <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Nombre del servicio', 'Service name')}</div>
                <input value={edit.name ?? ''} onChange={(e) => setEdit((x) => ({ ...x, name: e.target.value }))} className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-[13px] font-semibold text-ink outline-none focus:border-primary" />
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Descripción', 'Description')}</div>
                <textarea value={edit.es ?? ''} onChange={(e) => setEdit((x) => ({ ...x, es: e.target.value, en: e.target.value }))} rows={2} className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-[12px] font-medium leading-relaxed text-ink outline-none focus:border-primary" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Precio', 'Price')}</div>
                  <input value={edit.price ?? ''} onChange={(e) => setEdit((x) => ({ ...x, price: e.target.value }))} className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-[13px] font-semibold text-ink outline-none focus:border-primary" />
                </div>
                <div className="flex-1">
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Duración', 'Duration')}</div>
                  <input value={edit.dur ?? ''} onChange={(e) => setEdit((x) => ({ ...x, dur: e.target.value }))} className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-[13px] font-semibold text-ink outline-none focus:border-primary" />
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-btn-lg border border-hair bg-app p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-bold text-ink">{L('Acepta reservas', 'Accept bookings')}</div>
                  <div className="mt-0.5 text-[10px] font-medium leading-snug text-muted-2">{L('Apágalo para solo recibir consultas.', 'Turn off to collect inquiries only.')}</div>
                </div>
                <Switch big on={!!bookable[sheetSvc.id]} onClick={() => setBookable((b) => ({ ...b, [sheetSvc.id]: !b[sheetSvc.id] }))} />
              </div>
              <div className="flex gap-2.5 pt-0.5">
                <button onClick={() => { setServices((l) => l.filter((s) => s.id !== sheetSvc.id)); setSheetId(null); setEdit({}); flash(L('Servicio eliminado', 'Service deleted')); }} className="rounded-btn border-[1.5px] border-[#F0C9D3] bg-white px-4 py-3 text-[12.5px] font-extrabold text-pink-dark">{L('Eliminar', 'Delete')}</button>
                <button onClick={() => { setServices((l) => l.map((s) => s.id === sheetSvc.id ? { ...s, ...edit } as Svc : s)); setSheetId(null); setEdit({}); flash(L('Guardado · listado actualizado', 'Saved · listing updated')); }} className="flex-1 rounded-btn bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm">{L('Guardar cambios', 'Save changes')}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {toast && <Toast>{toast}</Toast>}
    </div>
  );
}

function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-ink px-4 py-3 text-[12.5px] font-bold text-white shadow-modal">
      <Check size={14} strokeWidth={2.6} className="text-[#7BE0A8]" />
      {children}
    </div>
  );
}
