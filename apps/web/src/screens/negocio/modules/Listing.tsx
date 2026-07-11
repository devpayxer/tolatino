'use client';

// Listado → Información general. The FIRST real (Supabase-backed) dashboard
// screen: loads the signed-in owner's active business and edits its public
// listing fields (name, category, tagline, price, phone, address, description),
// persisting to the real `businesses` row via RLS ("update own business"). ES is
// the primary language; EN mirrors it on save (matching create_business). When
// the owner has no business yet it shows a clean "publish first" empty state.

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { IconClock as Clock, IconExternalLink as ExternalLink, IconGlobe as Globe, IconPhoto as ImageIcon, IconChecklist as ListChecks, IconLoader2 as Loader2, IconLock as Lock, IconMessageCircle as MessageCircle, IconShield as Shield, IconStar as Star, IconStarFilled as StarFilled, IconBuildingStore as Store, IconTag as Tag } from '@tabler/icons-react';
import { useBizAdmin } from '@/lib/bizAdmin';
import { formatPhone } from '@/lib/phone';
import { listSuggestions, proposeSuggestion, cancelSuggestion, type Suggestion, type SuggestionTable } from '@/lib/suggestions';
import { TaxonomyPicker } from '@/screens/negocio/modules/TaxonomyPicker';
import { SUBCATS, FEATURES_COMMON, FEATURES_BY_CAT } from '@/data/fixtures';
import { CAT, CAT_KEYS, type CatKey } from '@/lib/tiles';
import { Switch, VerifiedBadge } from '@/components/ui';
import type { PanelCtx } from '@/screens/negocio/tabs';
import { Toast } from '@/screens/negocio/modules/_page';

// es → en lookup for feature labels, so the card-highlight picker + preview show
// bilingual labels; custom (approved) labels fall back to es.
const FEAT_EN: Record<string, string> = {};
for (const [es, en] of FEATURES_COMMON) FEAT_EN[es] = en;
for (const arr of Object.values(FEATURES_BY_CAT)) for (const [es, en] of arr) FEAT_EN[es] = en;

type Draft = {
  name: string;
  category_id: string;
  subcategories: string[]; // canonical (es) labels from SUBCATS[category]
  features: string[]; // canonical (es) labels — "Lo que ofrece"
  cardFeatures: string[]; // ≤3 features highlighted on the search card
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
  subcategories: string[] | null; features: string[] | null; card_features: string[] | null; about_es: string | null;
}): Draft => ({
  name: b.name ?? '',
  category_id: b.category_id ?? 'FoodDrinks',
  subcategories: b.subcategories ?? [],
  features: b.features ?? [],
  // card highlights must be a subset of the selected features
  cardFeatures: (b.card_features ?? []).filter((x) => (b.features ?? []).includes(x)).slice(0, 3),
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
  const { L, go, isFree } = ctx;
  const admin = useBizAdmin();
  const router = useRouter();
  const real = admin.active;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  // Owner-proposed subcategories + features (pending admin approval).
  const [subPending, setSubPending] = useState<Suggestion[]>([]);
  const [featPending, setFeatPending] = useState<Suggestion[]>([]);
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 1900);
  };

  // Seed (and reseed when switching between the owner's businesses).
  useEffect(() => {
    setDraft(real ? draftOf(real) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id]);

  // Load the owner's pending suggestions for the selected category (demo: local only).
  const cat = draft?.category_id;
  useEffect(() => {
    if (!real || admin.demo || !cat || isFree) { setSubPending([]); setFeatPending([]); return; }
    let cancelled = false;
    (async () => {
      const [subs, feats] = await Promise.all([
        listSuggestions('subcategory_suggestions', real.id, cat),
        listSuggestions('feature_suggestions', real.id, cat),
      ]);
      if (!cancelled) { setSubPending(subs); setFeatPending(feats); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, cat, admin.demo, isFree]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  // Changing category swaps the valid subcategories → drop any that no longer apply.
  // Features are kept (many are universal; leftovers show as selected extras).
  const setCategory = (next: string) =>
    setDraft((d) => {
      if (!d) return d;
      const valid = new Set((SUBCATS[next as CatKey] ?? []).map(([es]) => es));
      return { ...d, category_id: next, subcategories: d.subcategories.filter((s) => valid.has(s)) };
    });
  const toggleIn = (key: 'subcategories' | 'features', es: string) =>
    setDraft((d) => {
      if (!d) return d;
      const removing = d[key].includes(es);
      const nextArr = removing ? d[key].filter((x) => x !== es) : [...d[key], es];
      // removing an offering also drops it from the card highlights
      const cardFeatures = key === 'features' && removing ? d.cardFeatures.filter((x) => x !== es) : d.cardFeatures;
      return { ...d, [key]: nextArr, cardFeatures };
    });

  // Pick / unpick a feature to highlight on the search card (max 3).
  const toggleCard = (es: string) => {
    if (!draft) return;
    if (draft.cardFeatures.includes(es)) {
      setDraft((d) => (d ? { ...d, cardFeatures: d.cardFeatures.filter((x) => x !== es) } : d));
      return;
    }
    if (draft.cardFeatures.length >= 3) { flash(L('Máximo 3 para la tarjeta.', 'Up to 3 for the card.')); return; }
    setDraft((d) => (d ? { ...d, cardFeatures: [...d.cardFeatures, es] } : d));
  };

  // Propose a new taxonomy value → stored pending (admin approves later). Rejects
  // duplicates. Persists immediately (independent of the form's Save button).
  const propose = async (
    table: SuggestionTable,
    setPending: React.Dispatch<React.SetStateAction<Suggestion[]>>,
    isDup: (lc: string) => boolean,
    dupMsg: string,
    labelRaw: string,
  ) => {
    if (!labelRaw || !draft) return;
    const lc = labelRaw.toLowerCase();
    if (isDup(lc)) { flash(dupMsg); return; }
    if (real && !admin.demo) {
      const row = await proposeSuggestion(table, real.id, draft.category_id, labelRaw);
      if (row) { setPending((p) => [...p, row]); flash(L('Enviado para aprobación', 'Sent for approval')); }
      else flash(L('No se pudo enviar. Intenta de nuevo.', "Couldn't send. Try again."));
    } else {
      setPending((p) => [...p, { id: `local-${labelRaw}`, label_es: labelRaw, status: 'pending', category_id: draft.category_id }]);
      flash(L('Enviado para aprobación', 'Sent for approval'));
    }
  };
  const cancelPending = (table: SuggestionTable, setPending: React.Dispatch<React.SetStateAction<Suggestion[]>>) => async (id: string) => {
    setPending((p) => p.filter((s) => s.id !== id));
    if (!id.startsWith('local-')) await cancelSuggestion(table, id);
  };

  const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

  // Pro-only fields (Subcategorías, Lo que ofrece, Destacar, Sitio web, Mensaje)
  // count toward dirty — and get saved — only on a paid tier; on Free their
  // sections render locked, so the draft values never change anyway.
  const proDirty =
    !!real && !!draft && !isFree &&
    (!sameSet(draft.subcategories, real.subcategories ?? []) ||
      !sameSet(draft.features, real.features ?? []) ||
      !sameSet(draft.cardFeatures, real.card_features ?? []) ||
      draft.website.trim() !== (real.website ?? '') ||
      draft.acceptsMessages !== (real.accepts_messages ?? false) ||
      draft.messageChannel !== (real.message_channel ?? 'whatsapp') ||
      (draft.acceptsMessages && !draft.sameNumber ? draft.messagePhone.trim() : '') !== (real.message_phone ?? ''));

  const dirty =
    !!real &&
    !!draft &&
    (proDirty ||
      draft.name.trim() !== (real.name ?? '') ||
      draft.category_id !== (real.category_id ?? '') ||
      draft.tagline.trim() !== (real.tagline_es ?? '') ||
      draft.price_level !== (real.price_level ?? '') ||
      draft.phone.trim() !== (real.phone ?? '') ||
      draft.address.trim() !== (real.address ?? '') ||
      draft.about.trim() !== (real.about_es ?? ''));

  const save = async () => {
    if (!draft || !real || saving || !draft.name.trim()) return;
    setSaving(true);
    const { error, skipped } = await admin.update({
      name: draft.name.trim(),
      category_id: draft.category_id,
      tagline_es: draft.tagline.trim() || null,
      tagline_en: draft.tagline.trim() || null,
      price_level: draft.price_level || null,
      phone: draft.phone.trim() || null,
      address: draft.address.trim() || null,
      about_es: draft.about.trim() || null,
      about_en: draft.about.trim() || null,
      // Pro-only fields never leave the client on the Free tier.
      ...(!isFree && {
        subcategories: draft.subcategories,
        features: draft.features,
        card_features: draft.cardFeatures,
        website: normalizeWebsite(draft.website),
        accepts_messages: draft.acceptsMessages,
        message_channel: draft.acceptsMessages ? (draft.messageChannel || 'whatsapp') : null,
        message_phone: draft.acceptsMessages && !draft.sameNumber ? (draft.messagePhone.trim() || null) : null,
      }),
    });
    setSaving(false);
    flash(
      error
        ? L('No se pudo guardar. Intenta de nuevo.', "Couldn't save. Try again.")
        : skipped?.length
          ? L('Guardado — falta una migración para algunos campos', 'Saved — some fields need a pending DB migration')
          : L('Cambios guardados', 'Changes saved'),
    );
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
          <Store size={24} className="text-primary" stroke={2.2} />
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

  // Pro-locked placeholder for a gated section on the Free tier: the option is
  // visible (so the owner knows it exists) but locked, with a one-line benefit
  // and an upgrade action that jumps to Plan y facturación.
  const proLock = (Icon: typeof Globe, title: string, benefit: string) => (
    <button
      type="button"
      onClick={() => go('billing')}
      className="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-field border-[1.5px] border-dashed border-lilac-line bg-lilac-3 px-3.5 py-3 text-left transition-colors hover:bg-lilac-2"
    >
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-white">
        <Lock size={15} stroke={2.2} className="text-primary-dark" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <Icon size={13} strokeWidth={2.4} className="flex-none text-primary-dark" />
          <span className="truncate text-[12.5px] font-extrabold text-ink">{title}</span>
          <span className="flex-none rounded bg-amber px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-[.04em] text-ink">Pro</span>
        </span>
        <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-muted">{benefit}</span>
      </span>
      <span className="flex-none rounded-btn bg-primary px-3 py-2 text-[11px] font-extrabold text-white shadow-cta-sm">{L('Mejorar', 'Upgrade')}</span>
    </button>
  );

  return (
    <>
      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[1fr_300px]">
        {/* form */}
        <div className="rounded-card border border-hair bg-white p-4 shadow-card md:p-5">
          <div className="mb-3.5 text-[13px] font-extrabold text-ink">{L('Detalles del negocio', 'Business details')}</div>

          {/* Free plan → upgrade band (handoff premium-teaser pattern) */}
          {isFree && (
            <div className="mb-3.5 flex flex-wrap items-center gap-3 rounded-card-sm p-3.5 text-white" style={{ background: 'linear-gradient(140deg,#1E1B2E,#3A2E6E)' }}>
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-[rgba(244,183,64,.2)] text-[15px]">✦</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-extrabold">{L('Tu listado está en el plan Gratis', 'Your listing is on the Free plan')}</span>
                <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-[rgba(255,255,255,.7)]">
                  {L('Desbloquea subcategorías, “Lo que ofrece”, destacados en la tarjeta, mensajes y sitio web con Pro.', 'Unlock subcategories, “What it offers”, card highlights, messaging and website with Pro.')}
                </span>
              </span>
              <button onClick={() => go('billing')} className="flex-none cursor-pointer rounded-btn bg-amber px-3.5 py-2 text-[11.5px] font-extrabold text-ink">
                {L('Mejorar a Pro', 'Upgrade to Pro')}
              </button>
            </div>
          )}

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

            {/* Subcategorías del rubro elegido — se despliegan al elegir categoría (Pro) */}
            {isFree ? proLock(Tag, L('Subcategorías', 'Subcategories'), L('Aparece en más búsquedas y filtros de tu rubro.', 'Show up in more searches and filters for your trade.'))
            : (SUBCATS[draft.category_id as CatKey]?.length ?? 0) > 0 && (
              <TaxonomyPicker
                title={L('Subcategorías', 'Subcategories')}
                hint={L('elige las que apliquen', 'pick any that apply')}
                groups={[{ items: SUBCATS[draft.category_id as CatKey] }]}
                selected={draft.subcategories}
                onToggle={(es) => toggleIn('subcategories', es)}
                pending={subPending}
                onPropose={(labelRaw) => {
                  const officialSub = SUBCATS[draft.category_id as CatKey] ?? [];
                  propose('subcategory_suggestions', setSubPending,
                    (lc) => officialSub.some(([es, en]) => es.toLowerCase() === lc || en.toLowerCase() === lc)
                      || draft.subcategories.some((s) => s.toLowerCase() === lc)
                      || subPending.some((s) => s.label_es.toLowerCase() === lc),
                    L('Esa subcategoría ya existe.', 'That subcategory already exists.'), labelRaw);
                }}
                onCancelPending={cancelPending('subcategory_suggestions', setSubPending)}
                addPlaceholder={L('Nueva subcategoría…', 'New subcategory…')}
                note={L('¿Falta una? Agrégala — se publica tras la aprobación del equipo.', "Missing one? Add it — it goes live after our team approves it.")}
                L={L}
                inputCls={inputCls}
              />
            )}

            {/* Lo que ofrece (características): universales + del rubro + propuestas (Pro) */}
            {isFree ? proLock(ListChecks, L('Lo que ofrece', 'What it offers'), L('Muestra tus servicios y comodidades en tu ficha pública.', 'Show your services and amenities on your public listing.'))
            : <TaxonomyPicker
              title={L('Lo que ofrece', 'What it offers')}
              hint={L('elige las que apliquen', 'pick any that apply')}
              groups={[
                { title: L('Sugeridos', 'Suggested'), items: FEATURES_COMMON },
                ...((FEATURES_BY_CAT[draft.category_id as CatKey]?.length ?? 0) > 0
                  ? [{ title: L(CAT[draft.category_id as CatKey].es, CAT[draft.category_id as CatKey].en), items: FEATURES_BY_CAT[draft.category_id as CatKey] }]
                  : []),
              ]}
              selected={draft.features}
              onToggle={(es) => toggleIn('features', es)}
              pending={featPending}
              onPropose={(labelRaw) => {
                const officialFeat = [...FEATURES_COMMON, ...(FEATURES_BY_CAT[draft.category_id as CatKey] ?? [])];
                propose('feature_suggestions', setFeatPending,
                  (lc) => officialFeat.some(([es, en]) => es.toLowerCase() === lc || en.toLowerCase() === lc)
                    || draft.features.some((s) => s.toLowerCase() === lc)
                    || featPending.some((s) => s.label_es.toLowerCase() === lc),
                  L('Esa característica ya existe.', 'That feature already exists.'), labelRaw);
              }}
              onCancelPending={cancelPending('feature_suggestions', setFeatPending)}
              addPlaceholder={L('Nueva característica…', 'New feature…')}
              note={L('¿Falta una? Agrégala — se publica tras la aprobación del equipo.', "Missing one? Add it — it goes live after our team approves it.")}
              L={L}
              inputCls={inputCls}
            />}

            {/* Destacar en la tarjeta: elige hasta 3 de "Lo que ofrece" para la
                tarjeta de búsqueda, con una vista previa de cómo se verá. (Pro) */}
            {isFree ? proLock(Star, L('Destacar en la tarjeta', 'Feature on the card'), L('Elige las 3 que la gente ve en tu tarjeta al buscar.', 'Pick the 3 people see on your card in search.'))
            : <div className="rounded-field border border-hair bg-app p-3.5">
              <div className="flex items-center gap-2">
                <StarFilled size={14} className="flex-none text-amber" />
                <span className="min-w-0 flex-1 text-[12.5px] font-extrabold text-ink">{L('Destacar en la tarjeta', 'Feature on the card')}</span>
                <span className="flex-none rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-ink-2">{draft.cardFeatures.length}/3</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold leading-snug text-muted">
                {L('Elige hasta 3 de “Lo que ofrece” — son las que la gente ve en tu tarjeta al buscar.', 'Pick up to 3 from “What it offers” — these show on your card in search.')}
              </div>

              {draft.features.length === 0 ? (
                <div className="mt-2.5 rounded-field bg-white px-3.5 py-3 text-[12px] font-semibold text-muted-2">
                  {L('Primero elige opciones en “Lo que ofrece” arriba.', 'First pick options in “What it offers” above.')}
                </div>
              ) : (
                <>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {draft.features.map((es) => {
                      const on = draft.cardFeatures.includes(es);
                      return (
                        <button
                          key={es}
                          type="button"
                          onClick={() => toggleCard(es)}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-extrabold ${on ? 'bg-amber text-ink' : 'bg-lilac-2 text-ink-2'}`}
                        >
                          {on ? <StarFilled size={12} /> : <Star size={12} stroke={2.6} />}
                          {L(es, FEAT_EN[es] ?? es)}
                        </button>
                      );
                    })}
                  </div>

                  {/* vista previa de la tarjeta */}
                  {draft.cardFeatures.length > 0 && (
                    <div className="mt-3 rounded-card-sm border border-hair bg-white p-3">
                      <div className="mb-1.5 text-[9.5px] font-extrabold uppercase tracking-[.05em] text-muted-2">{L('Vista previa en la tarjeta', 'Card preview')}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {draft.cardFeatures.map((es) => (
                          <span key={es} className="inline-flex items-center gap-1.5 rounded-full bg-lilac-2 px-2.5 py-1 text-[11px] font-bold text-ink-soft">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {L(es, FEAT_EN[es] ?? es)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>}

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

            {/* Contacto por mensaje: opt-in + channel. Uses the phone above. (Pro) */}
            {isFree ? proLock(MessageCircle, L('Contacto por mensaje', 'Contact by message'), L('Botón de WhatsApp o SMS en tu ficha para recibir clientes.', 'A WhatsApp or SMS button on your listing to receive customers.'))
            : <div className="rounded-field border border-hair bg-app p-3.5">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-extrabold text-ink">{L('Contacto por mensaje', 'Contact by message')}</span>
                  <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-muted">{L('Muestra un botón de Mensaje en tu ficha.', 'Show a Message button on your listing.')}</span>
                </span>
                <Switch
                  on={draft.acceptsMessages}
                  onClick={() => set('acceptsMessages', !draft.acceptsMessages)}
                  label={L('Contacto por mensaje', 'Contact by message')}
                  big
                />
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
            </div>}

            <label className="block">
              {label(L('Dirección', 'Address'))}
              <input value={draft.address} onChange={(e) => set('address', e.target.value)} className={inputCls} placeholder={L('Calle y número', 'Street address')} />
            </label>

            {/* Sitio web (Pro) */}
            {isFree ? proLock(Globe, L('Sitio web', 'Website'), L('Enlaza tu página desde tu ficha pública.', 'Link your website from your public listing.'))
            : <label className="block">
              {label(L('Sitio web', 'Website'))}
              <input value={draft.website} onChange={(e) => set('website', e.target.value)} className={inputCls} placeholder="barberia.com" inputMode="url" autoCapitalize="none" autoCorrect="off" />
            </label>}

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
                  <Shield size={16} stroke={2.2} className={real.tier === 'free' ? 'text-amber-ink' : 'text-green-dark'} />
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
                  <ImageIcon size={16} stroke={2.2} className="text-primary-dark" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-extrabold text-ink">{L('Fotos y media', 'Photos & media')}</span>
                  <span className="block text-[11px] font-semibold text-muted">{L('Portada + galería', 'Cover + gallery')}</span>
                </span>
              </button>

              <button onClick={() => go('hours')} className="flex cursor-pointer items-center gap-2.5 text-left">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-lilac-2">
                  <Clock size={16} stroke={2.2} className="text-primary-dark" />
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
            <ExternalLink size={13} stroke={2.4} />
            {L('Ver listado público', 'View public listing')}
          </button>
        </div>
      </div>
      <Toast msg={toast} />
    </>
  );
}
