'use client';

// Listado → Información general. The FIRST real (Supabase-backed) dashboard
// screen: loads the signed-in owner's active business and edits its public
// listing fields (name, category, tagline, price, phone, address, description),
// persisting to the real `businesses` row via RLS ("update own business"). ES is
// the primary language; EN mirrors it on save (matching create_business). When
// the owner has no business yet it shows a clean "publish first" empty state.

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ExternalLink, Image as ImageIcon, Loader2, Plus, Shield, Store, X } from 'lucide-react';
import { useBizAdmin } from '@/lib/bizAdmin';
import { formatPhone } from '@/lib/phone';
import { listSuggestions, proposeSubcategory, cancelSuggestion, type SubcatSuggestion } from '@/lib/subcatSuggestions';
import { SUBCATS } from '@/data/fixtures';
import { CAT, CAT_KEYS, type CatKey } from '@/lib/tiles';
import { VerifiedBadge } from '@/components/ui';
import type { PanelCtx } from '@/screens/negocio/tabs';
import { Toast } from '@/screens/negocio/modules/_page';

type Draft = {
  name: string;
  category_id: string;
  subcategories: string[]; // canonical (es) labels from SUBCATS[category]
  tagline: string;
  price_level: string;
  phone: string;
  address: string;
  website: string;
  acceptsMessages: boolean;
  messageChannel: string; // 'sms' | 'whatsapp'
  sameNumber: boolean; // use the main phone for messages
  messagePhone: string; // used only when sameNumber = false
  about: string;
};

// Store a clean host (+path): no protocol, no leading www, no trailing slash —
// so the listing can prepend https:// to make it clickable and show this as the
// label. Empty → null. e.g. "https://www.Barberia.com/" → "barberia.com".
const normalizeWebsite = (v: string): string | null => {
  const s = v.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
  return s || null;
};

const draftOf = (b: {
  name: string; category_id: string; tagline_es: string | null; price_level: string | null;
  phone: string | null; address: string | null; website: string | null;
  accepts_messages: boolean; message_channel: string | null; message_phone: string | null;
  subcategories: string[] | null; about_es: string | null;
}): Draft => ({
  name: b.name ?? '',
  category_id: b.category_id ?? 'FoodDrinks',
  subcategories: b.subcategories ?? [],
  tagline: b.tagline_es ?? '',
  price_level: b.price_level ?? '',
  phone: formatPhone(b.phone ?? ''),
  address: b.address ?? '',
  website: b.website ?? '',
  acceptsMessages: b.accepts_messages ?? false,
  messageChannel: b.message_channel ?? 'whatsapp',
  sameNumber: !b.message_phone,
  messagePhone: formatPhone(b.message_phone ?? ''),
  about: b.about_es ?? '',
});

export function ListingModule({ ctx }: { ctx: PanelCtx }) {
  const { L, go } = ctx;
  const admin = useBizAdmin();
  const router = useRouter();
  const real = admin.active;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  // Owner-proposed subcategories (pending admin approval) for the current category.
  const [pending, setPending] = useState<SubcatSuggestion[]>([]);
  const [addingSub, setAddingSub] = useState(false);
  const [newSub, setNewSub] = useState('');
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 1900);
  };

  // Seed (and reseed when switching between the owner's businesses).
  useEffect(() => {
    setDraft(real ? draftOf(real) : null);
    setAddingSub(false);
    setNewSub('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id]);

  // Load the owner's pending suggestions for the selected category (demo: local only).
  const cat = draft?.category_id;
  useEffect(() => {
    if (!real || admin.demo || !cat) { setPending([]); return; }
    let cancelled = false;
    (async () => {
      const rows = await listSuggestions(real.id, cat);
      if (!cancelled) setPending(rows);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, cat, admin.demo]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  // Changing category swaps the valid subcategories → drop any that no longer apply.
  const setCategory = (cat: string) =>
    setDraft((d) => {
      if (!d) return d;
      const valid = new Set((SUBCATS[cat as CatKey] ?? []).map(([es]) => es));
      return { ...d, category_id: cat, subcategories: d.subcategories.filter((s) => valid.has(s)) };
    });
  const toggleSub = (es: string) =>
    setDraft((d) => (d ? { ...d, subcategories: d.subcategories.includes(es) ? d.subcategories.filter((x) => x !== es) : [...d.subcategories, es] } : d));

  // Propose a new subcategory → stored pending (admin approves later). Rejects
  // duplicates of an existing chip or a pending one. Persists immediately (it's
  // independent of the form's Save button).
  const submitNewSub = async () => {
    const labelRaw = newSub.trim();
    if (!labelRaw || !draft) return;
    const lc = labelRaw.toLowerCase();
    const isOfficial = (SUBCATS[draft.category_id as CatKey] ?? []).some(([es, en]) => es.toLowerCase() === lc || en.toLowerCase() === lc);
    const isSelected = draft.subcategories.some((s) => s.toLowerCase() === lc);
    const isPending = pending.some((s) => s.label_es.toLowerCase() === lc);
    setNewSub('');
    setAddingSub(false);
    if (isOfficial || isSelected || isPending) {
      flash(L('Esa subcategoría ya existe.', 'That subcategory already exists.'));
      return;
    }
    if (real && !admin.demo) {
      const row = await proposeSubcategory(real.id, draft.category_id, labelRaw);
      if (row) {
        setPending((p) => [...p, row]);
        flash(L('Enviado para aprobación', 'Sent for approval'));
      } else {
        flash(L('No se pudo enviar. Intenta de nuevo.', "Couldn't send. Try again."));
      }
    } else {
      // demo: optimistic local pending chip so the flow stays explorable
      setPending((p) => [...p, { id: `local-${labelRaw}`, label_es: labelRaw, status: 'pending', category_id: draft.category_id }]);
      flash(L('Enviado para aprobación', 'Sent for approval'));
    }
  };
  const cancelSub = async (id: string) => {
    setPending((p) => p.filter((s) => s.id !== id));
    if (!id.startsWith('local-')) await cancelSuggestion(id);
  };

  const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

  const dirty =
    !!real &&
    !!draft &&
    (draft.name.trim() !== (real.name ?? '') ||
      draft.category_id !== (real.category_id ?? '') ||
      !sameSet(draft.subcategories, real.subcategories ?? []) ||
      draft.tagline.trim() !== (real.tagline_es ?? '') ||
      draft.price_level !== (real.price_level ?? '') ||
      draft.phone.trim() !== (real.phone ?? '') ||
      draft.address.trim() !== (real.address ?? '') ||
      draft.website.trim() !== (real.website ?? '') ||
      draft.acceptsMessages !== (real.accepts_messages ?? false) ||
      draft.messageChannel !== (real.message_channel ?? 'whatsapp') ||
      (draft.acceptsMessages && !draft.sameNumber ? draft.messagePhone.trim() : '') !== (real.message_phone ?? '') ||
      draft.about.trim() !== (real.about_es ?? ''));

  const save = async () => {
    if (!draft || !real || saving || !draft.name.trim()) return;
    setSaving(true);
    const { error } = await admin.update({
      name: draft.name.trim(),
      category_id: draft.category_id,
      subcategories: draft.subcategories,
      tagline_es: draft.tagline.trim() || null,
      tagline_en: draft.tagline.trim() || null,
      price_level: draft.price_level || null,
      phone: draft.phone.trim() || null,
      address: draft.address.trim() || null,
      website: normalizeWebsite(draft.website),
      accepts_messages: draft.acceptsMessages,
      message_channel: draft.acceptsMessages ? (draft.messageChannel || 'whatsapp') : null,
      message_phone: draft.acceptsMessages && !draft.sameNumber ? (draft.messagePhone.trim() || null) : null,
      about_es: draft.about.trim() || null,
      about_en: draft.about.trim() || null,
    });
    setSaving(false);
    flash(error ? L('No se pudo guardar. Intenta de nuevo.', "Couldn't save. Try again.") : L('Cambios guardados', 'Changes saved'));
  };

  // ── loading ──
  if (admin.loading) {
    return (
      <div className="flex items-center justify-center rounded-card border border-hair bg-white py-16 text-muted shadow-card">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  // ── no business yet ──
  if (!real || !draft) {
    return (
      <div className="mx-auto max-w-[440px] rounded-card border border-hair bg-white p-6 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lilac">
          <Store size={24} className="text-primary" strokeWidth={2.2} />
        </span>
        <h3 className="mt-4 text-[17px] font-extrabold text-ink">{L('Conecta tu negocio', 'Connect your business')}</h3>
        <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] font-semibold leading-relaxed text-muted">
          {L('Publica tu negocio para editar aquí tu información general, fotos y horario.', 'Publish your business to edit its general info, photos and hours here.')}
        </p>
        <button
          onClick={() => router.push('/negocio/publicar')}
          className="mt-5 cursor-pointer rounded-btn bg-primary px-5 py-2.5 text-[13px] font-extrabold text-white shadow-cta-sm"
        >
          {L('Publicar negocio', 'Publish business')}
        </button>
      </div>
    );
  }

  const inputCls =
    'w-full rounded-field border-[1.5px] border-lilac-line bg-app px-3.5 py-3 text-[13.5px] font-medium text-ink outline-none placeholder:text-muted focus:border-primary';
  const label = (t: ReactNode) => <span className="mb-1.5 block text-[12px] font-extrabold text-ink">{t}</span>;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* form */}
        <div className="rounded-card border border-hair bg-white p-4 shadow-card md:p-5">
          <div className="mb-3.5 text-[13px] font-extrabold text-ink">{L('Detalles del negocio', 'Business details')}</div>
          <div className="flex flex-col gap-3.5">
            <label className="block">
              {label(L('Nombre del negocio', 'Business name'))}
              <input value={draft.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
            </label>

            <label className="block">
              {label(L('Categoría', 'Category'))}
              <select value={draft.category_id} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} cursor-pointer`}>
                {CAT_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {L(CAT[k as CatKey].es, CAT[k as CatKey].en)}
                  </option>
                ))}
              </select>
            </label>

            {/* Subcategorías del rubro elegido — se despliegan al elegir categoría.
                Incluye las estándar, las personalizadas ya aprobadas, las
                pendientes de aprobación, y un botón para proponer una nueva. */}
            {(SUBCATS[draft.category_id as CatKey]?.length ?? 0) > 0 && (() => {
              const official = SUBCATS[draft.category_id as CatKey];
              const officialSet = new Set(official.map(([es]) => es));
              const customApproved = draft.subcategories.filter((s) => !officialSet.has(s));
              const pendingHere = pending.filter((s) => s.status === 'pending');
              return (
                <div>
                  {label(
                    <>
                      {L('Subcategorías', 'Subcategories')} <span className="font-semibold text-muted">· {L('elige las que apliquen', 'pick any that apply')}</span>
                    </>,
                  )}
                  <div className="flex max-h-[196px] flex-wrap gap-2 overflow-y-auto">
                    {official.map(([es, en]) => {
                      const on = draft.subcategories.includes(es);
                      return (
                        <button
                          key={es}
                          type="button"
                          onClick={() => toggleSub(es)}
                          className={`cursor-pointer rounded-full px-3 py-2 text-[12px] font-extrabold ${on ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-2'}`}
                        >
                          {L(es, en)}
                        </button>
                      );
                    })}
                    {/* personalizadas aprobadas (ya publicadas) — seleccionables */}
                    {customApproved.map((es) => (
                      <button
                        key={`c-${es}`}
                        type="button"
                        onClick={() => toggleSub(es)}
                        className="cursor-pointer rounded-full bg-primary px-3 py-2 text-[12px] font-extrabold text-white"
                      >
                        {es}
                      </button>
                    ))}
                    {/* pendientes de aprobación — no publican aún */}
                    {pendingHere.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-amber bg-amber-bg px-3 py-2 text-[12px] font-extrabold text-amber-ink"
                      >
                        {s.label_es}
                        <span className="rounded bg-white/70 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-[.03em] text-amber-ink">{L('pendiente', 'pending')}</span>
                        <button type="button" onClick={() => cancelSub(s.id)} aria-label={L('Cancelar', 'Cancel')} className="cursor-pointer text-amber-ink/70 hover:text-amber-ink">
                          <X size={12} strokeWidth={2.8} />
                        </button>
                      </span>
                    ))}
                    {!addingSub && (
                      <button
                        type="button"
                        onClick={() => { setAddingSub(true); setNewSub(''); }}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full border-[1.5px] border-dashed border-lilac-line bg-white px-3 py-2 text-[12px] font-extrabold text-primary-dark"
                      >
                        <Plus size={13} strokeWidth={2.8} /> {L('Agregar', 'Add')}
                      </button>
                    )}
                  </div>

                  {addingSub && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        autoFocus
                        value={newSub}
                        onChange={(e) => setNewSub(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); submitNewSub(); }
                          if (e.key === 'Escape') { setAddingSub(false); setNewSub(''); }
                        }}
                        maxLength={40}
                        placeholder={L('Nueva subcategoría…', 'New subcategory…')}
                        className={inputCls}
                      />
                      <button type="button" onClick={submitNewSub} disabled={!newSub.trim()} className="flex-none cursor-pointer rounded-btn bg-primary px-3.5 py-3 text-[12px] font-extrabold text-white shadow-cta-sm disabled:opacity-50">
                        {L('Enviar', 'Send')}
                      </button>
                      <button type="button" onClick={() => { setAddingSub(false); setNewSub(''); }} className="flex-none cursor-pointer rounded-btn bg-lilac-2 px-3.5 py-3 text-[12px] font-extrabold text-ink-2">
                        {L('Cancelar', 'Cancel')}
                      </button>
                    </div>
                  )}

                  <div className="mt-1.5 text-[11px] font-semibold leading-snug text-muted">
                    {L('¿Falta una? Agrégala — se publica tras la aprobación del equipo.', "Missing one? Add it — it goes live after our team approves it.")}
                  </div>
                </div>
              );
            })()}

            <label className="block">
              {label(L('Eslogan', 'Tagline'))}
              <input
                value={draft.tagline}
                onChange={(e) => set('tagline', e.target.value)}
                className={inputCls}
                placeholder={L('Ej. Sabor de casa en el corazón de tu barrio.', 'e.g. Home-style flavor in your neighborhood.')}
              />
            </label>

            <div>
              {label(
                <>
                  {L('Precio', 'Price')} <span className="font-semibold text-muted">· {L('opcional', 'optional')}</span>
                </>,
              )}
              <div className="flex gap-2">
                {['$', '$$', '$$$'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set('price_level', draft.price_level === p ? '' : p)}
                    className={`cursor-pointer rounded-full px-4 py-2 text-[12.5px] font-extrabold ${draft.price_level === p ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-2'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              {label(L('Teléfono', 'Phone'))}
              <input value={draft.phone} onChange={(e) => set('phone', formatPhone(e.target.value))} className={inputCls} placeholder="(713) 555-0100" inputMode="tel" autoComplete="tel" />
            </label>

            {/* Contacto por mensaje: opt-in + channel. Uses the phone above. */}
            <div className="rounded-field border border-hair bg-app p-3.5">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-extrabold text-ink">{L('Contacto por mensaje', 'Contact by message')}</span>
                  <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-muted">{L('Muestra un botón de Mensaje en tu ficha.', 'Show a Message button on your listing.')}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.acceptsMessages}
                  aria-label={L('Contacto por mensaje', 'Contact by message')}
                  onClick={() => set('acceptsMessages', !draft.acceptsMessages)}
                  className={`relative h-[25px] w-[44px] flex-none cursor-pointer rounded-full transition-colors ${draft.acceptsMessages ? 'bg-primary' : 'bg-[#D8D2E6]'}`}
                >
                  <span className={`absolute top-[3px] h-[19px] w-[19px] rounded-full bg-white shadow transition-all ${draft.acceptsMessages ? 'left-[22px]' : 'left-[3px]'}`} />
                </button>
              </div>
              {draft.acceptsMessages && (
                <div className="mt-3 border-t border-hair pt-3">
                  {label(L('¿Por dónde?', 'Which channel?'))}
                  <div className="flex gap-2">
                    {([['whatsapp', 'WhatsApp'], ['sms', L('Mensaje de texto', 'Text message')]] as [string, string][]).map(([val, lab]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => set('messageChannel', val)}
                        className={`flex-1 cursor-pointer rounded-full px-3 py-2 text-[12px] font-extrabold ${draft.messageChannel === val ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-2'}`}
                      >
                        {lab}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3">
                    {label(L('¿Qué número?', 'Which number?'))}
                    <div className="flex gap-2">
                      {([[true, L('Mismo teléfono', 'Same phone')], [false, L('Otro número', 'Other number')]] as [boolean, string][]).map(([val, lab]) => (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() => set('sameNumber', val)}
                          className={`flex-1 cursor-pointer rounded-full px-3 py-2 text-[12px] font-extrabold ${draft.sameNumber === val ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-2'}`}
                        >
                          {lab}
                        </button>
                      ))}
                    </div>
                    {!draft.sameNumber && (
                      <input
                        value={draft.messagePhone}
                        onChange={(e) => set('messagePhone', formatPhone(e.target.value))}
                        className={`${inputCls} mt-2`}
                        placeholder={draft.messageChannel === 'sms' ? L('Número para SMS', 'Number for SMS') : L('Número de WhatsApp', 'WhatsApp number')}
                        inputMode="tel"
                        autoComplete="tel"
                      />
                    )}
                  </div>

                  <div className="mt-2 text-[11px] font-semibold leading-snug text-muted">
                    {(() => {
                      const ch = draft.messageChannel === 'sms' ? L('un mensaje de texto', 'a text message') : 'WhatsApp';
                      const num = draft.sameNumber
                        ? (draft.phone.trim() || L('tu teléfono', 'your phone'))
                        : (draft.messagePhone.trim() || L('el número que pongas', 'the number you enter'));
                      return L(`Abre ${ch} a ${num}.`, `Opens ${ch} to ${num}.`);
                    })()}
                    {draft.sameNumber && !draft.phone.trim() && ` ${L('Agrega tu teléfono arriba.', 'Add your phone above.')}`}
                  </div>
                </div>
              )}
            </div>

            <label className="block">
              {label(L('Dirección', 'Address'))}
              <input value={draft.address} onChange={(e) => set('address', e.target.value)} className={inputCls} placeholder={L('Calle y número', 'Street address')} />
            </label>

            <label className="block">
              {label(L('Sitio web', 'Website'))}
              <input value={draft.website} onChange={(e) => set('website', e.target.value)} className={inputCls} placeholder="barberia.com" inputMode="url" autoCapitalize="none" autoCorrect="off" />
            </label>

            <label className="block">
              {label(L('Descripción', 'Description'))}
              <textarea
                value={draft.about}
                onChange={(e) => set('about', e.target.value)}
                rows={4}
                className={`${inputCls} resize-none`}
                placeholder={L('Cuéntale a la comunidad qué ofreces…', 'Tell the community what you offer…')}
              />
            </label>

            <button
              onClick={save}
              disabled={!dirty || saving || !draft.name.trim()}
              className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-btn bg-primary py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm disabled:opacity-50"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? L('Guardando…', 'Saving…') : dirty ? L('Guardar cambios', 'Save changes') : L('Guardado', 'Saved')}
            </button>
          </div>
        </div>

        {/* side: listing status */}
        <div className="flex flex-col gap-3">
          <div className="rounded-card border border-hair bg-white p-4 shadow-card">
            <div className="mb-3 text-[12px] font-extrabold text-ink">{L('Estado del listado', 'Listing status')}</div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn" style={{ background: real.tier === 'free' ? '#FCEFD6' : '#E3F5EA' }}>
                  <Shield size={16} strokeWidth={2.2} className={real.tier === 'free' ? 'text-amber-ink' : 'text-green-dark'} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink">
                    {real.tier === 'free' ? L('Sin verificar', 'Unverified') : L('Verificado', 'Verified')}
                    {real.tier !== 'free' && <VerifiedBadge size={13} />}
                  </span>
                  <span className="block text-[11px] font-semibold text-muted">{real.tier === 'free' ? L('Mejora para la insignia', 'Upgrade for the badge') : L('Insignia activa', 'Badge active')}</span>
                </span>
              </div>

              <button onClick={() => go('photos')} className="flex cursor-pointer items-center gap-2.5 text-left">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-lilac-2">
                  <ImageIcon size={16} strokeWidth={2.2} className="text-primary-dark" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-extrabold text-ink">{L('Fotos y media', 'Photos & media')}</span>
                  <span className="block text-[11px] font-semibold text-muted">{L('Portada + galería', 'Cover + gallery')}</span>
                </span>
              </button>

              <button onClick={() => go('hours')} className="flex cursor-pointer items-center gap-2.5 text-left">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-lilac-2">
                  <Clock size={16} strokeWidth={2.2} className="text-primary-dark" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-extrabold text-ink">{L('Horario', 'Hours')}</span>
                  <span className="block text-[11px] font-semibold text-muted">{real.hours && real.hours.length ? L('Configurado', 'Set') : L('Sin configurar', 'Not set')}</span>
                </span>
              </button>
            </div>
          </div>

          <button
            onClick={() => router.push(`/negocios?b=${real.slug}`)}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-btn border-[1.5px] border-lilac-line bg-white py-2.5 text-[12.5px] font-extrabold text-primary-dark"
          >
            <ExternalLink size={13} strokeWidth={2.4} />
            {L('Ver listado público', 'View public listing')}
          </button>
        </div>
      </div>
      <Toast msg={toast} />
    </>
  );
}
