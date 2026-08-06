'use client';

// "Publica tu negocio" — onboarding del dueño (handoff "Business Onboarding",
// 2026-08). 7 pasos + 2 estados finales:
//   categoría → subcategorías → datos → logo y fotos → horarios → plan → pago
//   → publicando → listo
//
// QUÉ CAMBIÓ Y POR QUÉ. La versión anterior de esta pantalla era un DEMO: al
// terminar solo hacía `app.setBiz(...)` en memoria y pintaba un panelito con
// cifras inventadas (128 vistas, 14 llamadas). El negocio nunca llegaba a la
// base. Ahora el flujo publica DE VERDAD, reusando el mismo camino que ya
// funcionaba en `PublishModal`: `create_business` → subir imágenes → provisionar
// el módulo del panel. Nada de esto es nuevo backend; es el cableado que
// faltaba.
//
// TAXONOMÍA. Se usan las 17 categorías reales de `@/lib/tiles` — las que
// `create_business` valida contra la tabla `categories` y las que usan la
// búsqueda, el directorio y los negocios ya publicados. El handoff propone 10
// categorías propias; se descartó esa lista (decisión del fundador, 2026-08-05)
// porque habría obligado a remapear todo lo existente. Lo que SÍ se adopta del
// handoff es su modelo de HERRAMIENTAS (`@/data/onboarding-tools`), sus pasos
// nuevos (fotos, horarios), y su UX de plan/pago/éxito.
//
// AUTOGUARDADO (petición del fundador). Un flujo de 7 pasos pierde gente a la
// mitad. Cada cambio se guarda en el teléfono (`draftStore`, el mismo helper que
// usan los módulos del panel) y al volver se retoma donde se quedó. Esto además
// resuelve el problema de la sesión: se puede llenar TODO sin cuenta, y solo al
// publicar se pide entrar — el borrador sobrevive al viaje a `/entrar`.
// Las FOTOS no caben en el borrador (son `File`, no serializables): eso se dice
// en pantalla en vez de fingir que quedaron guardadas.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { imgUrl, ANCHO } from '@/lib/img';
import { useRouter } from 'next/navigation';
import {
  IconArrowRight as ArrowRight, IconCamera as Camera, IconCheck as Check,
  IconChevronLeft as ChevronLeft, IconInfoCircle as Info,
  IconLock as Lock, IconPlus as Plus, IconShieldCheck as ShieldCheck,
  IconStar as Star, IconTrash as Trash, IconTrendingUp as TrendingUp,
  IconShoppingBag as ShoppingBag, IconChartBar as ChartBar, IconX as X,
} from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { DireccionForm, DIRECCION_VACIA, direccionCompleta, type DireccionNegocio } from '@/components/DireccionForm';
import { useAuth } from '@/lib/auth';
import { useLiveData } from '@/lib/live';
import { useBizAdmin } from '@/lib/bizAdmin';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/image';
import { formatPhone } from '@/lib/phone';
import { CAT, CAT_KEYS, tile, type CatKey } from '@/lib/tiles';
import { clearDraft, loadDraft, saveDraft } from '@/lib/draftStore';
import type { WeekHours } from '@/lib/hours';
import { PrimaryBtn, VerifiedBadge, Wordmark } from '@/components/ui';
import { CheckoutSheet } from '@/components/CheckoutSheet';
import { startSubscription } from '@/lib/stripe';
import { LangToggle } from '@/components/AppHeader';
import { HoursEditor, defaultWeek } from '@/components/HoursEditor';
import { FEATURES_BY_CAT, FEATURES_COMMON, SUBCATS, VIEW_PATH } from '@/data/fixtures';
import { toolForCat } from '@/data/onboarding-tools';

/** Los 7 pasos que cuentan para "PASO n DE 7" y la barra de progreso. */
type FlowStep = 'cat' | 'sub' | 'info' | 'media' | 'hours' | 'plan' | 'pay';
/** …más los estados finales, que no cuentan como paso. `paying` existe porque
 *  el fundador reportó (2026-08-05) que con Verified «fue aprobado primero
 *  antes de pagar»: la celebración salía antes que la tarjeta. Ahora el orden
 *  es guardar → COBRAR → celebrar, y `paying` es la sala de espera del cobro —
 *  con el negocio ya a salvo en plan Free si el pago no se completa. */
type Step = FlowStep | 'publishing' | 'paying' | 'done';
const FLOW: FlowStep[] = ['cat', 'sub', 'info', 'media', 'hours', 'plan', 'pay'];
const BACK: Partial<Record<Step, Step>> = {
  sub: 'cat', info: 'sub', media: 'info', hours: 'media', plan: 'hours', pay: 'plan',
};

/** Nombre y pista de cada paso (rail de escritorio + etiqueta del encabezado). */
const STEP_META: Record<FlowStep, { es: string; en: string; hintEs: string; hintEn: string }> = {
  cat: { es: 'Categoría principal', en: 'Main category', hintEs: '¿A qué se dedica tu negocio?', hintEn: 'What does your business do?' },
  sub: { es: 'Subcategorías', en: 'Subcategories', hintEs: 'Para darte las herramientas correctas', hintEn: 'So we give you the right tools' },
  info: { es: 'Datos del negocio', en: 'Business details', hintEs: 'Nombre, contacto y dirección', hintEn: 'Name, contact and address' },
  media: { es: 'Logo y fotos', en: 'Logo & photos', hintEs: 'Así te van a ver', hintEn: 'This is how they see you' },
  hours: { es: 'Horarios', en: 'Hours', hintEs: 'Cuándo estás abierto', hintEn: "When you're open" },
  plan: { es: 'Elige tu plan', en: 'Choose your plan', hintEs: 'Free o Verified, tú decides', hintEn: 'Free or Verified, you decide' },
  pay: { es: 'Publicación', en: 'Publish', hintEs: 'Último paso', hintEn: 'Last step' },
};

const VERIFIED_PRICE = 14.99;
const MAX_GALLERY = 6;
const SUBS_VISIBLE = 8;   // el resto tras "Ver todas" — mismo patrón que las etiquetas
const DRAFT_KEY = 'tl_biz_onboarding_v1';

/** Lo que SÍ cabe en el borrador (todo serializable; las fotos no van aquí). */
type Draft = {
  step: Step; cat: CatKey | null; subs: string[];
  name: string; desc: string; phone: string; wa: string; noAddr: boolean;
  /** Dirección en piezas (0153). Los borradores viejos traían `addr` suelto y se
   *  migran al leerlos: no vale tirar el trabajo de alguien por cambiar el tipo. */
  dir: DireccionNegocio; addr?: string;
  features: string[]; hours: WeekHours | null; plan: 'free' | 'verified'; terms: boolean;
  /** ¿El dueño ya ELIGIÓ plan (paso 6)? Antes de eso, Verified es solo la
   *  preselección de venta y no desbloquea nada. */
  planPicked?: boolean;
  /** Si el negocio YA se creó (flujo Verified, esperando el pago), aquí queda
   *  su id: al volver —recarga, redirect de Stripe— NO se crea otro. */
  bizId?: string | null;
  newSlug?: string | null;
};

type Photo = { file: File; url: string };

export function BizOnboardingScreen() {
  const { L } = useLang();
  const app = useApp();
  const auth = useAuth();
  const live = useLiveData();
  // El panel vive en el MISMO layout que esta pantalla, así que su lista de
  // negocios no se recarga sola al terminar. Se le avisa aquí además de la
  // revalidación por ruta: así el panel ya tiene el negocio ANTES de llegar.
  const admin = useBizAdmin();
  const router = useRouter();

  const [step, setStep] = useState<Step>('cat');
  const [cat, setCat] = useState<CatKey | null>(null);
  const [subSecret, setSubSecret] = useState<string | null>(null);   // hoja de pago de Verified
  const [payAmount, setPayAmount] = useState(Math.round(14.99 * 100));
  const [subs, setSubs] = useState<string[]>([]);
  const [allSubs, setAllSubs] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [phone, setPhone] = useState('');
  const [wa, setWa] = useState('');
  const [dir, setDir] = useState<DireccionNegocio>(DIRECCION_VACIA);
  /** La dirección en una línea, para el resumen final. */
  const dirResumen = [dir.line1, dir.line2, dir.city, [dir.state, dir.postal].filter(Boolean).join(' ')]
    .map((x) => x.trim()).filter(Boolean).join(', ');
  const [noAddr, setNoAddr] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);
  const [hours, setHours] = useState<WeekHours | null>(null);
  const [plan, setPlan] = useState<'free' | 'verified'>('verified');
  const [planPicked, setPlanPicked] = useState(false);
  const [terms, setTerms] = useState(false);
  const [createdBizId, setCreatedBizId] = useState<string | null>(null);
  // `paid` = volvimos del redirect de Stripe con el pago hecho. Cambia el tono
  // de la pantalla final (celebrar Verified, no venderlo).
  const [paid, setPaid] = useState(false);
  // Imágenes: viven solo en memoria (son `File`), nunca en el borrador.
  const [logo, setLogo] = useState<Photo | null>(null);
  const [gallery, setGallery] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [newSlug, setNewSlug] = useState<string | null>(null);
  const hydrated = useRef(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const flash = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? null : t)), 2200);
  }, []);

  // ── Borrador: cargar al entrar, guardar en cada cambio ────────────────────
  useEffect(() => {
    const d = loadDraft<Draft>(DRAFT_KEY);
    hydrated.current = true;
    if (!d) {
      // Pagó y volvió… sin borrador (localStorage lleno o deshabilitado: el
      // guardado es best-effort). Reconocer el pago con lo que hay — nunca
      // plantarle el paso 1 vacío a alguien que acaba de pagar $14.99.
      const q = new URLSearchParams(window.location.search);
      if (q.get('sub') === 'success' && (q.get('redirect_status') ?? 'succeeded') !== 'failed') {
        setPaid(true);
        setStep('done');
        window.history.replaceState(null, '', window.location.pathname);
      }
      return;
    }
    setCat(d.cat); setSubs(d.subs ?? []); setName(d.name ?? ''); setDesc(d.desc ?? '');
    setPhone(d.phone ?? ''); setWa(d.wa ?? ''); setNoAddr(!!d.noAddr);
    // Borrador viejo: la calle iba en `addr` y no había piezas ni coordenada.
    setDir(d.dir ?? (d.addr ? { ...DIRECCION_VACIA, line1: d.addr } : DIRECCION_VACIA));
    setFeatures(d.features ?? []); setHours(d.hours ?? null); setPlan(d.plan ?? 'verified');
    setPlanPicked(!!d.planPicked);
    setTerms(!!d.terms);
    setCreatedBizId(d.bizId ?? null);
    setNewSlug(d.newSlug ?? null);

    // ¿Volvemos del redirect de Stripe? OJO (auditoría 2026-08-05): el
    // `?sub=success` de la URL lo pusimos NOSOTROS al armar el return_url,
    // ANTES de saber el resultado. El resultado real viene en
    // `redirect_status`, que añade Stripe: `failed` significa que el método
    // con redirección (Cash App, etc.) NO cobró — celebrar ahí era mentirle
    // al dueño («Pago recibido») mientras seguía en Free. Con tarjeta ya ni se
    // llega aquí: el resultado se resuelve en la página, sin redirect.
    const params = new URLSearchParams(window.location.search);
    const rs = params.get('redirect_status');
    const volvioDeStripe = params.get('sub') === 'success';
    const pagado = volvioDeStripe && (rs === null || rs === 'succeeded' || rs === 'processing');
    if (d.step === 'paying' && d.bizId) {
      if (pagado) {
        clearDraft(DRAFT_KEY);
        setPaid(true);
        setStep('done');
        // Sin esto, recargar la página «re-celebraría» un pago viejo.
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        // Cerró, recargó, o el redirect volvió con `failed`: el negocio existe
        // (Free) y se retoma el COBRO — nunca se crea otro negocio.
        setStep('paying');
        if (volvioDeStripe) {
          setErr(L('El pago no se completó. Intenta de nuevo.', "The payment didn't complete. Try again."));
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
      return;
    }
    // `publishing` nunca se restaura: una publicación a medias no se reanuda sola.
    setStep(d.step === 'publishing' || d.step === 'done' || d.step === 'paying' ? 'pay' : (d.step ?? 'cat'));
  }, []);

  useEffect(() => {
    if (!hydrated.current || step === 'done') return;
    saveDraft<Draft>(DRAFT_KEY, {
      step, cat, subs, name, desc, phone, wa, dir, noAddr, features, hours,
      plan, planPicked, terms, bizId: createdBizId, newSlug,
    });
  }, [step, cat, subs, name, desc, phone, wa, dir, noAddr, features, hours, plan, planPicked, terms, createdBizId, newSlug]);

  // ── Derivados ─────────────────────────────────────────────────────────────
  const catInfo = cat ? CAT[cat] : null;
  const tool = cat ? toolForCat(cat) : null;
  const idx = FLOW.indexOf(step as FlowStep);
  const isTerminal = step === 'publishing' || step === 'paying' || step === 'done';
  const pct = isTerminal ? 100 : Math.round(((idx + 1) / FLOW.length) * 100);
  const isVerified = plan === 'verified';
  // Verified DESBLOQUEA cosas (más fotos, franjas de horario) solo cuando el
  // dueño lo ELIGIÓ en el paso Plan — no por venir preseleccionado. Los pasos
  // de fotos y horarios van ANTES que el de plan, así que en la primera pasada
  // todo el mundo ve el límite Free con el desbloqueo anunciado.
  const verifiedElegido = planPicked && isVerified;
  /** Free: 1 foto (la portada). Verified: hasta MAX_GALLERY. Regla del
   *  fundador, 2026-08-05: «debe aceptar 1 logo y 1 imagen feature; si cruza
   *  el premium se le permite agregar más». */
  const topeFotos = verifiedElegido ? MAX_GALLERY : 1;
  // La ciudad de la app, memoizada: si este objeto se recrea en cada render,
  // el autocompletado de dirección se relanza solo (fue el bug del popup).
  const cerca = useMemo(
    () => ({ lat: app.coords.lat, lng: app.coords.lng, city: app.city }),
    [app.coords.lat, app.coords.lng, app.city],
  );
  const initials = (name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2) || 'TN').toUpperCase();
  const subList = cat ? SUBCATS[cat] : [];
  const featList = useMemo(
    () => (cat ? [...FEATURES_COMMON, ...FEATURES_BY_CAT[cat].slice(0, 6)] : FEATURES_COMMON),
    [cat],
  );

  const canNext =
    step === 'cat' ? !!cat
      : step === 'sub' ? subs.length > 0
        : step === 'info' ? name.trim().length > 0 && phone.trim().length > 0
          // Con local, la dirección es obligatoria: es de donde sale el punto
          // del negocio en el mapa y en las búsquedas por cercanía. Sin local no
          // se pide nada — ese camino usa la ciudad a propósito.
          && (noAddr || direccionCompleta(dir))
          : step === 'pay' ? terms
            : true;

  const invalidMsg = () =>
    step === 'cat' ? L('Elige una categoría', 'Pick a category')
      : step === 'sub' ? L('Elige al menos una subcategoría', 'Pick at least one subcategory')
        : step === 'info'
          ? (name.trim().length > 0 && phone.trim().length > 0
              ? L('Falta la dirección: calle y ciudad', 'Address is missing: street and city')
              : L('Falta el nombre y el teléfono', 'Name and phone are required'))
          : L('Acepta los términos para publicar', 'Accept the terms to publish');

  // ── Publicar de verdad ────────────────────────────────────────────────────
  // Mismo camino que `PublishModal` (probado): create_business → imágenes →
  // módulo del panel. Si algo secundario falla (una foto), el negocio YA quedó
  // publicado: se avisa, no se tira todo.
  const publish = async () => {
    if (!cat || busy) return;
    setErr(null);

    // Publicar exige cuenta. El borrador ya está guardado, así que el viaje a
    // /entrar no cuesta nada: al volver se retoma en este mismo paso.
    if (supabase && !auth.user) {
      router.push('/entrar');
      return;
    }
    if (!supabase || !auth.user) return;

    setBusy(true);

    // ¿El negocio YA existe? Pasa al reintentar un pago de Verified (recarga,
    // hoja cerrada). Entonces NO se crea otro: se va directo al cobro.
    let bizId = createdBizId;

    if (!bizId) {
      setStep('publishing');
      const sub0 = subList.find(([es]) => es === subs[0]);
      const { data: slug, error } = await supabase.rpc('create_business', {
        p_name: name.trim(),
        p_category: cat,
        p_subcats: subs,
        p_price: null,
        p_phone: phone.trim(),
        p_address: noAddr ? '' : dir.line1.trim(),
        // Sin local NO se guarda dirección y la ciudad es la de la app: es lo que
        // el alta promete por escrito («mostramos tu zona, no tu dirección»).
        p_city: noAddr ? app.city : (dir.city.trim() || app.city),
        p_about: desc.trim(),
        p_specialty_es: sub0?.[0] ?? '',
        p_specialty_en: sub0?.[1] ?? '',
        p_tile_a: CAT[cat].bg,
        p_tile_b: CAT[cat].dot,
        // LA COORDENADA DEL NEGOCIO, no la de la ciudad que el dueño tuviera
        // elegida — que es lo que se guardaba antes y dejaba a todos los pines en
        // el centro del pueblo. Si no se pudo geocodificar, el centro de la ciudad
        // es un respaldo honesto y el dueño puede corregirlo desde el panel.
        p_lat: noAddr ? app.coords.lat : (dir.lat ?? app.coords.lat),
        p_lng: noAddr ? app.coords.lng : (dir.lng ?? app.coords.lng),
        p_features: features,
        p_hours: hours,
        p_address_line2: noAddr ? null : (dir.line2.trim() || null),
        p_state: noAddr ? null : (dir.state || null),
        p_postal: noAddr ? null : (dir.postal.trim() || null),
      });

      if (error || !slug) {
        setBusy(false);
        setStep('pay');
        setErr(L('No pudimos publicar el negocio. Intenta de nuevo.', "We couldn't publish the business. Try again."));
        return;
      }

      // El RPC devuelve el slug; hace falta el id para las fotos y el módulo.
      // CON REINTENTOS: es un GET justo después de un INSERT que acaba de
      // funcionar — si falla es un parpadeo de red, y rendirse a la primera
      // mandaba el alta Verified por la salida Free sin cobrar ni avisar.
      for (let intento = 0; intento < 3 && !bizId; intento++) {
        if (intento) await new Promise((r) => setTimeout(r, 400 * intento));
        const { data: row } = await supabase.from('businesses').select('id').eq('slug', slug).maybeSingle();
        bizId = (row?.id as string | undefined) ?? null;
      }

      // El negocio EXISTE desde ya: al borrador, antes de cualquier subida.
      // Si el dueño cierra a mitad de las fotos, la vuelta retoma con este id
      // en vez de crear un negocio duplicado.
      setCreatedBizId(bizId);
      setNewSlug(String(slug));
      saveDraft<Draft>(DRAFT_KEY, {
        step, cat, subs, name, desc, phone, wa, dir, noAddr, features, hours,
        plan, planPicked, terms, bizId, newSlug: String(slug),
      });

      if (bizId) {
        const patch: Record<string, unknown> = {};
        // Módulo del panel según la herramienta de la categoría (handoff). El
        // dueño lo afina después desde "Módulos".
        if (tool) patch.modules = { [tool.module]: true, updates: true };
        try {
          if (logo) patch.logo_url = await uploadImage(logo.file, auth.user.id);
        } catch {
          flash(L('El logo no se pudo subir; súbelo desde tu panel.', "Logo upload failed; add it from your dashboard."));
        }
        if (Object.keys(patch).length) {
          // supabase-js NO lanza: devuelve {error}. Sin leerlo, un fallo aquí
          // perdía el logo recién subido y el módulo prometido, en silencio.
          const { error: ePatch } = await supabase.from('businesses').update(patch).eq('id', bizId);
          if (ePatch) flash(L('No se pudo guardar todo; revísalo en tu panel.', "Some details didn't save; check your dashboard."));
        }

        // ANTES del pago solo se publica LA PORTADA — también con Verified.
        // Las demás suben cuando el cobro se confirma (subirFotosExtra): si el
        // pago se abandona, el negocio queda en Free con 1 foto, que es
        // exactamente lo que Free incluye. Publicar las 6 aquí era regalar el
        // beneficio de Verified a quien no llegó a pagar.
        const fotos = gallery.slice(0, 1);
        if (fotos.length) {
          try {
            const urls = await Promise.all(fotos.map((p) => uploadImage(p.file, auth.user!.id)));
            const { error: eIns } = await supabase.from('business_photos').insert(
              urls.map((url, i) => ({ business_id: bizId, url, is_cover: i === 0, sort: i })),
            );
            if (eIns) flash(L('La foto no se pudo guardar; agrégala desde tu panel.', "The photo didn't save; add it from your dashboard."));
          } catch {
            flash(L('La foto no subió; agrégala desde tu panel.', "The photo didn't upload; add it from your dashboard."));
          }
        }
      }

      live.refresh();      // el listado nuevo aparece para todos los vecinos
      admin.refresh();     // …y el panel del dueño deja de creer que no tiene nada
    }

    // ── Free: no hay cobro. Publicado = terminado. ──
    if (!isVerified) {
      clearDraft(DRAFT_KEY);
      setBusy(false);
      setStep('done');
      return;
    }
    // Verified pero el id no se pudo leer ni con reintentos: el negocio quedó
    // publicado (Free) y el cobro no puede arrancar. Se DICE — antes esta rama
    // salía por la puerta Free en silencio y hasta le re-vendía Verified al
    // dueño que acababa de pulsar «Pagar y publicar».
    if (!bizId) {
      clearDraft(DRAFT_KEY);
      setBusy(false);
      setStep('done');
      flash(L('Tu negocio quedó publicado, pero no pudimos iniciar el cobro. Activa Verified desde tu panel, en Facturación.',
              "Your business is live, but we couldn't start the charge. Activate Verified from your dashboard, under Billing."));
      return;
    }

    // ── Verified: EL PAGO VA ANTES DE LA CELEBRACIÓN. ──
    // El negocio queda a salvo (plan Free) y el borrador conserva su id: si el
    // dueño cierra la hoja, recarga o vuelve del redirect de Stripe, se retoma
    // el COBRO — jamás se crea un segundo negocio ni se enseña el confeti sin
    // haber pagado (eso fue exactamente lo que el fundador reportó).
    setStep('paying');
    await obtenerCobro(bizId);
    setBusy(false);
  };

  /** Pide (o re-pide) el cobro de Verified y abre nuestra hoja de pago. */
  const obtenerCobro = async (bizId: string) => {
    setErr(null);
    const r = await startSubscription('verified', bizId);
    if (r.alreadyActive) {
      // Ya paga (p. ej. pagó y recargó antes del redirect): nada que cobrar.
      clearDraft(DRAFT_KEY);
      setPaid(true);
      setStep('done');
      return;
    }
    if (r.clientSecret) {
      setPayAmount(r.amount ?? Math.round(VERIFIED_PRICE * 100));
      setSubSecret(r.clientSecret);
      return;
    }
    setErr(L('No pudimos iniciar el cobro. Intenta de nuevo, o continúa con Free y activa Verified desde tu panel.',
             "We couldn't start the charge. Try again, or continue on Free and activate Verified from your dashboard."));
  };

  /** Reintentar el pago desde la sala de espera. */
  const reintentarPago = async () => {
    if (busy || !createdBizId) return;
    setBusy(true);
    await obtenerCobro(createdBizId);
    setBusy(false);
  };

  /** Quedarse en Free por ahora: el negocio ya está publicado. */
  const continuarConFree = () => {
    clearDraft(DRAFT_KEY);
    setSubSecret(null);
    setStep('done');
  };

  /** Pago con TARJETA confirmado en la página (sin redirect): las fotos siguen
   *  vivas en memoria, así que AHORA suben las que Verified desbloquea — al
   *  publicar solo subió la portada, para no regalar el beneficio a un pago
   *  que nunca llegara. Luego, la celebración de verdad. */
  const alPagarEnPagina = async () => {
    setSubSecret(null);
    const extras = gallery.slice(1);
    if (supabase && auth.user && createdBizId && extras.length) {
      try {
        const urls = await Promise.all(extras.map((p) => uploadImage(p.file, auth.user!.id)));
        const { error: e } = await supabase.from('business_photos').insert(
          urls.map((url, i) => ({ business_id: createdBizId, url, is_cover: false, sort: i + 1 })),
        );
        if (e) flash(L('Algunas fotos no se guardaron; agrégalas desde tu panel.', "Some photos didn't save; add them from your dashboard."));
      } catch {
        flash(L('Algunas fotos no subieron; agrégalas desde tu panel.', "Some photos didn't upload; add them from your dashboard."));
      }
    }
    clearDraft(DRAFT_KEY);
    setPaid(true);
    setStep('done');
  };

  const next = () => {
    if (!canNext) return flash(invalidMsg());
    if (step === 'pay') return void publish();
    // Continuar desde el paso Plan cuenta como elegirlo: vio las dos opciones y
    // siguió. Esto desbloquea lo que Verified promete (fotos, franjas).
    if (step === 'plan') setPlanPicked(true);
    const i = FLOW.indexOf(step as FlowStep);
    if (i >= 0 && i < FLOW.length - 1) setStep(FLOW[i + 1]);
  };
  const back = () => { const b = BACK[step]; if (b) setStep(b); };

  // ── Imágenes ──────────────────────────────────────────────────────────────
  const pickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = Array.from(e.target.files ?? []).find((x) => x.type.startsWith('image/'));
    if (f) { if (logo) URL.revokeObjectURL(logo.url); setLogo({ file: f, url: URL.createObjectURL(f) }); }
    e.target.value = '';
  };
  const pickGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).filter((x) => x.type.startsWith('image/'));
    setGallery((l) => [...l, ...picked.slice(0, Math.max(0, topeFotos - l.length)).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    e.target.value = '';
  };
  const dropPhoto = (i: number) =>
    setGallery((l) => (URL.revokeObjectURL(l[i].url), l.filter((_, k) => k !== i)));

  // ── Estilos compartidos (tokens, nada de hex suelto) ──────────────────────
  const inputCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-[13.5px] font-semibold text-ink outline-none placeholder:font-medium placeholder:text-muted focus:border-primary';
  const field = (label: string, input: React.ReactNode, hint?: string) => (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-extrabold text-home-ink">{label}</span>
      {input}
      {hint && <span className="mt-1.5 block text-[10.5px] font-semibold text-muted-faint">{hint}</span>}
    </label>
  );
  const H1 = ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-[22px] font-extrabold leading-[1.2] tracking-[-.03em] text-ink md:text-[25px]">{children}</h1>
  );
  const Sub = ({ children }: { children: React.ReactNode }) => (
    <p className="mt-2 text-[13px] font-medium leading-[1.6] text-home-mute">{children}</p>
  );

  return (
    <div className="flex min-h-screen flex-col bg-canvas min-[1000px]:items-center min-[1000px]:justify-center min-[1000px]:p-8">
      <div className="flex w-full flex-1 flex-col overflow-hidden min-[1000px]:max-w-[1120px] min-[1000px]:flex-none min-[1000px]:flex-row min-[1000px]:rounded-[26px] min-[1000px]:shadow-pop">

        {/* ══ Riel de pasos — solo escritorio (el handoff lo oculta ≤1000px) ══ */}
        <aside
          className="hidden flex-col p-8 min-[1000px]:flex min-[1000px]:w-[360px] min-[1000px]:flex-none"
          style={{ background: 'linear-gradient(158deg,#2A2440,#171426 62%,#1E1B2E)' }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[22px] font-extrabold tracking-[-.03em] text-white">To&rsquo;</span>
            <span className="text-[22px] font-extrabold tracking-[-.03em] text-primary-on-dark">Latino</span>
            <span className="ml-1 h-1.5 w-1.5 rotate-45 bg-amber" />
          </div>
          <span className="mt-1 text-[8.5px] font-extrabold uppercase tracking-[.1em] text-white/50">
            {L('Para negocios', 'For business')}
          </span>

          <div className="mt-8 flex flex-col">
            {FLOW.map((s, i) => {
              const done = idx > i || isTerminal;
              const active = step === s;
              return (
                <div key={s} className="flex gap-3">
                  <div className="flex flex-none flex-col items-center">
                    <span
                      className={`flex h-[26px] w-[26px] items-center justify-center rounded-[9px] border-[1.5px] text-[11px] font-extrabold ${
                        done ? 'border-primary bg-primary text-white'
                          : active ? 'border-primary bg-primary/20 text-white'
                            : 'border-white/10 bg-white/[.06] text-white/50'
                      }`}
                    >
                      {done ? <Check size={13} stroke={3.2} /> : i + 1}
                    </span>
                    {i < FLOW.length - 1 && <span className={`h-[26px] w-[2px] ${done ? 'bg-primary/50' : 'bg-white/10'}`} />}
                  </div>
                  <div className="pb-1">
                    <span className={`block text-[12.5px] ${active ? 'font-extrabold text-white' : done ? 'font-semibold text-white/70' : 'font-semibold text-white/40'}`}>
                      {L(STEP_META[s].es, STEP_META[s].en)}
                    </span>
                    {active && (
                      <span className="block text-[10.5px] font-semibold text-white/40">
                        {L(STEP_META[s].hintEs, STEP_META[s].hintEn)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto border-t border-white/10 pt-4">
            <div className="flex items-start gap-2">
              <ShieldCheck size={15} stroke={2.2} className="mt-px flex-none text-mint" />
              <span className="text-[11px] font-semibold leading-[1.5] text-white/60">
                {L('Publicar es gratis. Verified cuesta $14.99 al mes, cancela cuando quieras.',
                   'Listing is free. Verified is $14.99 a month, cancel anytime.')}
              </span>
            </div>
          </div>
        </aside>

        {/* ══ Tarjeta ══ */}
        <div className="flex min-h-screen flex-1 flex-col bg-white min-[1000px]:min-h-[660px]">
          {/* Encabezado */}
          {!isTerminal && (
            <div className="sticky top-0 z-20 border-b border-hair bg-white/95 px-4 pt-3 backdrop-blur-[8px] min-[1000px]:static min-[1000px]:border-0 min-[1000px]:px-8 min-[1000px]:pt-5">
              <div className="flex items-center gap-2.5">
                {BACK[step] ? (
                  <button onClick={back} aria-label={L('Volver', 'Volver')} className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-[11px] bg-app">
                    <ChevronLeft size={17} stroke={2.4} className="text-ink" />
                  </button>
                ) : (
                  <span className="min-[1000px]:hidden"><Wordmark size="sm" /></span>
                )}
                <span className="truncate text-[10px] font-extrabold uppercase tracking-[.09em] text-muted-2">
                  {L('Paso ', 'Step ')}{idx + 1}{L(' de ', ' of ')}{FLOW.length} · {L(STEP_META[FLOW[idx]].es, STEP_META[FLOW[idx]].en)}
                </span>
                <div className="ml-auto flex flex-none items-center gap-2">
                  <LangToggle mini />
                  <button onClick={() => router.push(VIEW_PATH.comunidad)} aria-label={L('Salir', 'Exit')} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-app text-ink-2">
                    <X size={14} stroke={2.8} />
                  </button>
                </div>
              </div>
              <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-lilac-line">
                <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#7B61FF,#B0357E)' }} />
              </div>
            </div>
          )}

          {/* Cuerpo */}
          <div className="flex-1 px-4 py-5 min-[1000px]:overflow-y-auto min-[1000px]:px-8">
            {/* ─── 1 · Categoría ─── */}
            {step === 'cat' && (
              <div className="tl-pop">
                <H1>{L('¿A qué se dedica tu negocio?', 'What does your business do?')}</H1>
                <Sub>{L('Elige la categoría principal. Con esto sabemos dónde mostrarte cuando tu comunidad busque.',
                        'Pick the main category. This is how we know where to show you when your community searches.')}</Sub>
                <div className="mt-5 grid grid-cols-1 gap-2.5 min-[440px]:grid-cols-2">
                  {CAT_KEYS.map((k) => {
                    const c = CAT[k];
                    const sel = cat === k;
                    return (
                      <button
                        key={k}
                        onClick={() => { if (cat !== k) setSubs([]); setCat(k); }}
                        className={`flex cursor-pointer items-center gap-3 rounded-tile border-[1.5px] p-3.5 text-left ${sel ? 'border-primary bg-home-tint' : 'border-lilac-line bg-white'}`}
                      >
                        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[13px]" style={{ background: sel ? c.bg : undefined }}>
                          <span className="h-4 w-4 rounded-full" style={{ background: sel ? c.dot : '#C9C2E6' }} />
                        </span>
                        <span className="min-w-0 flex-1 text-[13px] font-extrabold text-ink">{L(c.es, c.en)}</span>
                        {sel && (
                          <span className="flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full bg-primary">
                            <Check size={12} stroke={3.4} className="text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── 2 · Subcategorías (multi) ─── */}
            {step === 'sub' && catInfo && (
              <div className="tl-pop">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: catInfo.bg }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: catInfo.dot }} />
                  <span className="text-[10.5px] font-extrabold" style={{ color: catInfo.dot }}>{L(catInfo.es, catInfo.en)}</span>
                </span>
                <div className="mt-3"><H1>{L('¿Qué tipo exactamente?', 'What type exactly?')}</H1></div>
                <Sub>{L('Elige todas las que apliquen. Cada una ayuda a que te encuentren por lo que de verdad haces.',
                        'Pick all that apply. Each one helps people find you for what you actually do.')}</Sub>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-home-ink">{L('Elige una o varias', 'Pick one or more')}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${subs.length ? 'bg-lilac text-primary-dark' : 'bg-app text-muted-2'}`}>
                    {subs.length ? `${subs.length} ${L('elegidas', 'selected')}` : L('Ninguna', 'None')}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-col gap-2">
                  {(allSubs ? subList : subList.slice(0, SUBS_VISIBLE)).map(([es, en]) => {
                    const sel = subs.includes(es);
                    return (
                      <button
                        key={es}
                        onClick={() => setSubs(sel ? subs.filter((x) => x !== es) : [...subs, es])}
                        className={`flex cursor-pointer items-center gap-3 rounded-tile border-[1.5px] p-3.5 text-left ${sel ? 'border-primary bg-home-tint' : 'border-lilac-line bg-white'}`}
                      >
                        <span className={`flex h-[21px] w-[21px] flex-none items-center justify-center rounded-[7px] border-[1.5px] ${sel ? 'border-primary bg-primary' : 'border-muted-faint bg-white'}`}>
                          {sel && <Check size={12} stroke={3.4} className="text-white" />}
                        </span>
                        <span className="text-[13px] font-extrabold text-ink">{L(es, en)}</span>
                      </button>
                    );
                  })}
                </div>
                {subList.length > SUBS_VISIBLE && (
                  <button onClick={() => setAllSubs((v) => !v)} className="mt-3 cursor-pointer text-[12px] font-extrabold text-primary-dark">
                    {allSubs ? L('Ver menos', 'Show less') : `${L('Ver todas', 'Show all')} (${subList.length})`}
                  </button>
                )}

                {tool && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-[12px] bg-lilac-2 p-3">
                    <Info size={15} stroke={2.2} className="mt-px flex-none text-primary-dark" />
                    <span className="text-[11px] font-semibold leading-[1.45] text-home-badge">
                      {subs.length
                        ? <>{L('Activaremos:', "We'll turn on:")} <strong className="font-extrabold">{L(tool.es, tool.en)}</strong></>
                        : L('Elige los tipos que más se parezcan a lo que haces. Puedes marcar varios.',
                             'Pick the types closest to what you do. You can choose several.')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ─── 3 · Datos ─── */}
            {step === 'info' && (
              <div className="tl-pop">
                <H1>{L('Cuéntanos de tu negocio', 'Tell us about your business')}</H1>
                <Sub>{L('Esto es lo que van a ver tus clientes cuando te encuentren.', "This is what customers see when they find you.")}</Sub>
                <div className="mt-5 flex flex-col gap-3.5">
                  {field(L('Nombre del negocio *', 'Business name *'),
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('Ej: Tamales Doña Lupe', 'e.g. Tamales Doña Lupe')} className={inputCls} />)}
                  {field(L('¿Qué ofreces?', 'What do you offer?'),
                    <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
                      placeholder={L('Cuéntale a tus clientes qué haces y qué te hace especial…', 'Tell customers what you do and what makes you special…')}
                      className={`${inputCls} resize-none leading-[1.55]`} />,
                    L('Se traduce automáticamente al inglés.', 'Automatically translated to English.'))}
                  <div className="grid grid-cols-1 gap-3.5 min-[520px]:grid-cols-2">
                    {field(L('Teléfono *', 'Phone *'),
                      <input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="tel" placeholder="(713) 555-0142" className={inputCls} />)}
                    {field(L('WhatsApp (si es otro)', 'WhatsApp (if different)'),
                      <input value={wa} onChange={(e) => setWa(formatPhone(e.target.value))} inputMode="tel" placeholder={L('Opcional', 'Optional')} className={inputCls} />)}
                  </div>
                  {!noAddr && (
                    <DireccionForm valor={dir} onChange={setDir} cerca={cerca} inputCls={inputCls} />
                  )}

                  <button
                    onClick={() => setNoAddr((v) => !v)}
                    className={`flex cursor-pointer items-start gap-3 rounded-[12px] border-[1.5px] bg-page p-3 text-left ${noAddr ? 'border-primary' : 'border-hair'}`}
                  >
                    <span className={`mt-px flex h-5 w-5 flex-none items-center justify-center rounded-[6px] border-[1.5px] ${noAddr ? 'border-primary bg-primary' : 'border-muted-faint bg-white'}`}>
                      {noAddr && <Check size={11} stroke={3.4} className="text-white" />}
                    </span>
                    <span>
                      <span className="block text-[12.5px] font-extrabold text-ink">{L('No tengo local — trabajo desde casa o a domicilio', "No storefront — I work from home or on-site")}</span>
                      <span className="block text-[10.5px] font-semibold text-muted-2">{L('Mostramos tu zona de servicio, no tu dirección exacta.', 'We show your service area, not your exact address.')}</span>
                    </span>
                  </button>

                  <div>
                    <span className="mb-2 block text-[11.5px] font-extrabold text-home-ink">{L('Etiquetas que te describen', 'Tags that describe you')}</span>
                    <div className="flex flex-wrap gap-2">
                      {featList.map(([es, en]) => {
                        const on = features.includes(es);
                        return (
                          <button
                            key={es}
                            onClick={() => setFeatures(on ? features.filter((f) => f !== es) : [...features, es])}
                            className={`cursor-pointer rounded-full border-[1.5px] px-3 py-2 text-[11.5px] font-bold ${on ? 'border-primary bg-home-tint text-primary-dark' : 'border-lilac-line bg-white text-ink-soft'}`}
                          >
                            {L(es, en)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── 4 · Logo y fotos ─── */}
            {step === 'media' && (
              <div className="tl-pop">
                <H1>{L('Logo y fotos', 'Logo & photos')}</H1>
                <Sub>{L('Los negocios con fotos reciben muchos más mensajes. Con el celular basta.',
                        'Businesses with photos get far more messages. Your phone is enough.')}</Sub>

                <input ref={logoInput} type="file" accept="image/*" onChange={pickLogo} className="hidden" />
                <input ref={galleryInput} type="file" accept="image/*" multiple onChange={pickGallery} className="hidden" />

                <span className="mt-5 block text-[11.5px] font-extrabold text-home-ink">{L('Logo', 'Logo')}</span>
                <div className="mt-2 flex items-center gap-3">
                  <span
                    className="flex h-[74px] w-[74px] flex-none items-center justify-center overflow-hidden rounded-[20px] text-[22px] font-extrabold text-white"
                    style={{ background: `linear-gradient(140deg, ${catInfo?.dot ?? '#7B61FF'}, #7B61FF)` }}
                  >
                    {logo ? <img src={imgUrl(logo.url, ANCHO.icono)} alt="" className="h-full w-full object-cover" /> : initials}
                  </span>
                  <div className="min-w-0">
                    <button onClick={() => logoInput.current?.click()} className="cursor-pointer rounded-[13px] border-[1.5px] border-dashed border-lilac-ring bg-page px-4 py-3 text-[12px] font-extrabold text-primary-dark">
                      {logo ? L('Cambiar logo', 'Change logo') : L('Subir logo', 'Upload logo')}
                    </button>
                    <span className="mt-1.5 block text-[10.5px] font-semibold text-muted-2">
                      {L('Si no tienes logo, usamos las iniciales de tu negocio.', "No logo? We'll use your business initials.")}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[11.5px] font-extrabold text-home-ink">
                    {topeFotos === 1 ? L('Foto de portada', 'Cover photo') : L('Fotos', 'Photos')}
                  </span>
                  <span data-fotos-contador className={`text-[11px] font-extrabold ${gallery.length >= topeFotos ? 'text-green-dark' : 'text-muted-2'}`}>{gallery.length}/{topeFotos}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {gallery.map((p, i) => (
                    <span key={p.url} className="relative aspect-square overflow-hidden rounded-[13px]">
                      <img src={imgUrl(p.url, ANCHO.tarjeta)} alt="" className="h-full w-full object-cover" />
                      {i === 0 && (
                        <span className="absolute left-1 top-1 rounded-full bg-green px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase text-white">
                          {L('Portada', 'Cover')}
                        </span>
                      )}
                      <button onClick={() => dropPhoto(i)} aria-label={L('Quitar', 'Remove')} className="absolute bottom-1 right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-ink/70">
                        <Trash size={12} stroke={2.4} className="text-white" />
                      </button>
                    </span>
                  ))}
                  {gallery.length < topeFotos && (
                    <button onClick={() => galleryInput.current?.click()} aria-label={L('Agregar foto', 'Add photo')} className="flex aspect-square cursor-pointer items-center justify-center rounded-[13px] border-[1.5px] border-dashed border-muted-faint bg-page">
                      <Plus size={18} stroke={2.4} className="text-lilac-ring" />
                    </button>
                  )}
                  {/* Los espacios que Verified desbloquea se VEN, cerrados: así el
                      límite de Free no parece un fallo sino un plan. Tocarlos
                      lleva al paso Plan, que es donde se decide. */}
                  {/* La cuadrícula SIEMPRE suma 6: fotos + (botón de agregar) +
                      candados. Así el límite de Free se ve como lo que es — 5
                      espacios que Verified abre — y no como una cuadrícula rota. */}
                  {!verifiedElegido && Array.from({ length: Math.max(0, MAX_GALLERY - gallery.length - (gallery.length < topeFotos ? 1 : 0)) }).map((_, i) => (
                    <button
                      key={`lock-${i}`}
                      data-foto-bloqueada
                      onClick={() => { flash(L('Hasta 6 fotos con Verified — elígelo en el paso Plan.', 'Up to 6 photos with Verified — pick it at the Plan step.')); }}
                      className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[13px] border-[1.5px] border-dashed border-lilac-line bg-lilac-3"
                    >
                      <Lock size={13} stroke={2.4} className="text-lilac-ring" />
                      <span className="text-[8px] font-extrabold uppercase tracking-[.05em] text-primary-dark">Verified</span>
                    </button>
                  ))}
                </div>
                {topeFotos === 1 && (
                  <p className="mt-2 text-[10.5px] font-semibold leading-[1.5] text-muted-2">
                    {L('Tu portada es lo primero que ven tus clientes. Con Verified subes hasta 6 fotos: tu local, tus productos, tu equipo.',
                       'Your cover is the first thing customers see. With Verified you upload up to 6 photos: your place, products, team.')}
                  </p>
                )}

                <div className="mt-4 flex items-start gap-2.5 rounded-[12px] bg-green-bg2 p-3">
                  <Camera size={15} stroke={2.2} className="mt-px flex-none text-green" />
                  <span className="text-[11px] font-semibold leading-[1.45] text-green-ink">
                    {L('Sube tus productos, tu local y a ti trabajando. Nada de fotos de internet.',
                       'Show your products, your place and you at work. No stock photos.')}
                  </span>
                </div>
                <div className="mt-2.5 flex items-start gap-2.5 rounded-[12px] bg-amber-bg p-3">
                  <Info size={15} stroke={2.2} className="mt-px flex-none text-amber" />
                  <span className="text-[11px] font-semibold leading-[1.45] text-amber-ink">
                    {L('Las fotos se suben al publicar. Si sales y vuelves, tus datos siguen aquí — las fotos hay que elegirlas otra vez.',
                       'Photos upload when you publish. If you leave and come back your details stay — photos need picking again.')}
                  </span>
                </div>
              </div>
            )}

            {/* ─── 5 · Horarios ─── */}
            {step === 'hours' && (
              <div className="tl-pop">
                <H1>{L('¿Cuándo estás abierto?', "When are you open?")}</H1>
                <Sub>{L('Tu comunidad ve «abierto ahora» en tiempo real. Si vas a domicilio, marca cuándo tomas trabajos.',
                        'Your community sees "open now" in real time. If you work on-site, mark when you take jobs.')}</Sub>
                {hours ? (
                  <div className="mt-5">
                    <HoursEditor week={hours} onChange={setHours} L={L} proSlots={verifiedElegido} onUpgrade={() => setStep('plan')} />
                    <button onClick={() => setHours(null)} className="mt-3 cursor-pointer text-[12px] font-extrabold text-muted">
                      {L('Quitar horario', 'Remove hours')}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setHours(defaultWeek())} className="mt-5 flex w-full cursor-pointer items-center gap-3 rounded-tile border-[1.5px] border-dashed border-lilac-ring bg-page p-4 text-left">
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-btn bg-lilac">
                      <Plus size={19} stroke={2.4} className="text-primary-dark" />
                    </span>
                    <span>
                      <span className="block text-[13px] font-extrabold text-ink">{L('Agregar mi horario', 'Add my hours')}</span>
                      <span className="block text-[11.5px] font-semibold text-muted">{L('Empezamos con L–V 9–6, Sáb 9–2. Lo ajustas a tu gusto.', 'We start with Mon–Fri 9–6, Sat 9–2. Adjust as you like.')}</span>
                    </span>
                  </button>
                )}
                {/* Pedido del fundador (2026-08-05): decir aquí que esto es lo
                    básico y que el panel trae el resto — feriados, cierres,
                    excepciones. Evita que alguien se atore buscando opciones
                    que viven en otro sitio. */}
                <div className="mt-4 flex items-start gap-2.5 rounded-[12px] bg-lilac-2 p-3">
                  <Info size={15} stroke={2.2} className="mt-px flex-none text-primary-dark" />
                  <span className="text-[11px] font-semibold leading-[1.45] text-home-badge">
                    {L('Esto es lo básico para abrir. En tu panel tendrás más opciones: feriados, cierres por vacaciones y horarios especiales.',
                       "This covers the basics. Your dashboard has more: holidays, vacation closures and special hours.")}
                  </span>
                </div>
              </div>
            )}

            {/* ─── 6 · Plan ─── */}
            {step === 'plan' && (
              <div className="tl-pop">
                <H1>{L('Elige tu plan', 'Choose your plan')}</H1>
                <Sub>{L('Publicar es gratis para siempre. Verified agrega insignia, prioridad y herramientas de venta.',
                        'Listing is free forever. Verified adds the badge, priority and selling tools.')}</Sub>

                <button onClick={() => { setPlan('verified'); setPlanPicked(true); }} className={`mt-5 w-full cursor-pointer rounded-[16px] border-[1.5px] p-4 text-left ${isVerified ? 'border-primary bg-home-tint' : 'border-lilac-line bg-white'}`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full border-2 ${isVerified ? 'border-primary' : 'border-muted-faint'}`}>
                      {isVerified && <span className="h-[9px] w-[9px] rounded-full bg-primary" />}
                    </span>
                    <span className="text-[14.5px] font-extrabold text-ink">Verified</span>
                    <span className="rounded-full bg-amber px-2 py-1 text-[8.5px] font-extrabold uppercase tracking-[.06em] text-ink">{L('Recomendado', 'Recommended')}</span>
                    <span className="ml-auto text-right">
                      <span className="block text-[17px] font-extrabold text-ink">${VERIFIED_PRICE}</span>
                      <span className="block text-[10px] font-semibold text-muted-2">/{L('mes', 'mo')}</span>
                    </span>
                  </div>
                  <p className="mt-2 text-[11.5px] font-semibold leading-[1.5] text-home-mute">
                    {L('Insignia morada, prioridad en búsqueda, herramientas de venta y analíticas.',
                       'Purple badge, search priority, selling tools and analytics.')}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {[L('Insignia verificada', 'Verified badge'), tool ? L(tool.es, tool.en) : '', L('Analíticas', 'Analytics')].filter(Boolean).map((c) => (
                      <span key={c} className={`rounded-[7px] px-2 py-1 text-[10.5px] font-bold ${isVerified ? 'bg-lilac text-primary-dark' : 'bg-app text-ink-2'}`}>{c}</span>
                    ))}
                  </div>
                </button>

                {isVerified && (
                  <div className="mt-3 overflow-hidden rounded-[18px] border-[1.5px] border-lilac-line bg-white">
                    <div className="flex items-center gap-2.5 bg-home-tint px-4 py-3.5">
                      <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[11px] bg-primary">
                        <Check size={17} stroke={3} className="text-white" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-extrabold text-ink">{L('Todo lo que incluye Verified', "Everything Verified includes")}</span>
                        <span className="block text-[10.5px] font-medium text-home-mute">{L('Activo desde el primer día.', 'Active from day one.')}</span>
                      </span>
                    </div>
                    {[
                      { t: L('Confianza', 'Trust'), c: 'text-primary-dark', bg: 'bg-lilac', Icon: ShieldCheck, items: [
                        L('Insignia morada verificada en tu perfil y en las búsquedas', 'Verified purple badge on your profile and in search'),
                        L('Identidad y negocio revisados por nuestro equipo', 'Identity and business reviewed by our team'),
                        L('Respondes reseñas como dueño verificado', 'Reply to reviews as a verified owner'),
                      ] },
                      { t: L('Más clientes', 'More customers'), c: 'text-green', bg: 'bg-green-bg', Icon: TrendingUp, items: [
                        L('Prioridad arriba de los negocios sin verificar', 'Priority above unverified businesses'),
                        L('Apareces en el mapa y en «cerca de ti»', 'You appear on the map and in "near you"'),
                        L('Hasta 6 fotos en tu galería y varias franjas de horario', 'Up to 6 gallery photos and multiple hour slots'),
                        L('Publicaciones y ofertas en el feed de tu colonia', 'Posts and offers in your neighborhood feed'),
                      ] },
                      { t: L('Vender en línea', 'Sell online'), c: 'text-clay', bg: 'bg-clay-bg', Icon: ShoppingBag, items: [
                        tool ? `${L(tool.es, tool.en)} ${L('activado', 'enabled')}` : '',
                        L('Cobros con tarjeta y en efectivo', 'Card and cash payments'),
                        L('Cupones y promociones con seguimiento', 'Coupons and promos with tracking'),
                      ].filter(Boolean) },
                      { t: L('Tu panel', 'Your dashboard'), c: 'text-ocean', bg: 'bg-ocean-bg', Icon: ChartBar, items: [
                        L('Analíticas de visitas, llamadas y conversión', 'Analytics for views, calls and conversion'),
                        L('Mensajes y WhatsApp en una sola bandeja', 'Messages and WhatsApp in one inbox'),
                        L('Soporte prioritario en español', 'Priority support in Spanish'),
                      ] },
                    ].map((g) => (
                      <div key={g.t} className="border-t border-hair px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-[8px] ${g.bg}`}>
                            <g.Icon size={12} stroke={2.4} className={g.c} />
                          </span>
                          <span className="text-[11.5px] font-extrabold text-ink">{g.t}</span>
                        </div>
                        <div className="mt-2 flex flex-col gap-1.5">
                          {g.items.map((it) => (
                            <span key={it} className="flex items-start gap-2">
                              <Check size={13} stroke={3} className="mt-px flex-none text-green" />
                              <span className="text-[11.5px] font-semibold leading-[1.45] text-ink-soft">{it}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => { setPlan('free'); setPlanPicked(true); }} className={`mt-3 w-full cursor-pointer rounded-[16px] border-[1.5px] p-4 text-left ${!isVerified ? 'border-primary bg-home-tint' : 'border-lilac-line bg-white'}`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full border-2 ${!isVerified ? 'border-primary' : 'border-muted-faint'}`}>
                      {!isVerified && <span className="h-[9px] w-[9px] rounded-full bg-primary" />}
                    </span>
                    <span className="text-[14.5px] font-extrabold text-ink">Free</span>
                    <span className="ml-auto text-right">
                      <span className="block text-[17px] font-extrabold text-ink">$0</span>
                      <span className="block text-[10px] font-semibold text-muted-2">{L('para siempre', 'forever')}</span>
                    </span>
                  </div>
                  <p className="mt-2 text-[11.5px] font-semibold leading-[1.5] text-home-mute">
                    {L('Perfil, foto de portada, horarios, chat y reseñas. Sin insignia ni prioridad.',
                       'Profile, cover photo, hours, chat and reviews. No badge or priority.')}
                  </p>
                  {!isVerified && gallery.length > 1 && (
                    <p className="mt-2 rounded-[9px] bg-amber-bg px-2.5 py-2 text-[10.5px] font-bold leading-[1.45] text-amber-ink">
                      {L(`Elegiste ${gallery.length} fotos. Con Free se publica solo tu portada; las demás se activan al pasar a Verified.`,
                         `You picked ${gallery.length} photos. Free publishes only your cover; the rest unlock when you upgrade to Verified.`)}
                    </p>
                  )}
                </button>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
                  {[L('Cancela cuando quieras', 'Cancel anytime'), L('Sin contratos', 'No contracts'), L('Soporte en español', 'Support in Spanish')].map((t) => (
                    <span key={t} className="flex items-center gap-1.5 text-[11px] font-bold text-muted-2">
                      <Check size={12} stroke={3} className="text-green" />{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ─── 7 · Revisar y publicar ─── */}
            {step === 'pay' && (
              <div className="tl-pop">
                <H1>{isVerified ? L('Confirma y publica', 'Confirm and publish') : L('Revisa y publica', 'Review and publish')}</H1>
                <Sub>{L('Así se va a ver tu negocio en To’Latino. Puedes editar cualquier cosa después.',
                        "This is how your business will look on To'Latino. You can edit anything later.")}</Sub>

                {/* Vista previa del listado */}
                <div className="mt-5 overflow-hidden rounded-[18px] border border-hair bg-white shadow-card">
                  <div className="h-[96px] w-full" style={{ background: gallery[0] ? undefined : tile(catInfo?.bg ?? '#EFEBFF', catInfo?.dot ?? '#7B61FF', 12) }}>
                    {gallery[0] && <img src={imgUrl(gallery[0].url, ANCHO.tarjeta)} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="px-4 pb-4">
                    <span className="-mt-7 mb-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-[16px] border-[3px] border-white text-[16px] font-extrabold text-white"
                      style={{ background: `linear-gradient(140deg, ${catInfo?.dot ?? '#7B61FF'}, #7B61FF)` }}>
                      {logo ? <img src={imgUrl(logo.url, ANCHO.icono)} alt="" className="h-full w-full object-cover" /> : initials}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[15px] font-extrabold text-ink">{name.trim() || L('Tu negocio', 'Your business')}</span>
                      {isVerified && <VerifiedBadge size={15} />}
                    </div>
                    <span className="mt-0.5 block truncate text-[11.5px] font-semibold text-muted-2">
                      {[catInfo ? L(catInfo.es, catInfo.en) : '', ...subs.slice(0, 2)].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </div>

                {/* Resumen editable */}
                <div className="mt-4 rounded-[15px] border border-hair bg-page px-3.5">
                  {([
                    [L('Categoría', 'Category'), catInfo ? L(catInfo.es, catInfo.en) : '—', 'cat'],
                    [L('Tipos', 'Types'), subs.length ? subs.slice(0, 3).join(', ') + (subs.length > 3 ? '…' : '') : '—', 'sub'],
                    [L('Herramienta', 'Tool'), tool ? L(tool.es, tool.en) : '—', 'sub'],
                    [L('Contacto', 'Contact'), phone || '—', 'info'],
                    [L('Dirección', 'Address'), noAddr ? L('A domicilio', 'On-site') : (dirResumen || '—'), 'info'],
                    [L('Fotos', 'Photos'), gallery.length ? `${gallery.length} ${L('fotos', 'photos')}` : L('Sin fotos', 'No photos'), 'media'],
                    [L('Horario', 'Hours'), hours ? L('Configurado', 'Set') : L('Sin horario', 'Not set'), 'hours'],
                    [L('Plan', 'Plan'), isVerified ? `Verified · $${VERIFIED_PRICE}/${L('mes', 'mo')}` : 'Free · $0', 'plan'],
                  ] as [string, string, Step][]).map(([k, v, to], i) => (
                    <div key={k} className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-hair' : ''}`}>
                      <span className="w-[86px] flex-none text-[11.5px] font-semibold text-muted-2">{k}</span>
                      <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-ink-soft">{v}</span>
                      <button onClick={() => setStep(to)} className="flex-none cursor-pointer text-[11px] font-extrabold text-primary-dark">{L('Editar', 'Edit')}</button>
                    </div>
                  ))}
                </div>

                {/* Plan / cobro */}
                {isVerified ? (
                  <div className="mt-4 rounded-[16px] border-[1.5px] border-lilac-line p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] bg-lilac">
                        <ShieldCheck size={17} stroke={2.2} className="text-primary-dark" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-extrabold text-ink">Verified</span>
                        <span className="block text-[11px] font-medium text-muted-2">{L('Suscripción mensual', 'Monthly subscription')}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[16px] font-extrabold text-ink">${VERIFIED_PRICE}</span>
                        <span className="block text-[10px] font-semibold text-muted-2">/{L('mes', 'mo')}</span>
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-hair pt-3">
                      <span className="text-[12.5px] font-extrabold text-ink">{L('Total hoy', 'Total today')}</span>
                      <span className="text-[15px] font-extrabold text-ink">${VERIFIED_PRICE}</span>
                    </div>
                    <p className="mt-2.5 text-[11px] font-semibold leading-[1.45] text-muted">
                      {L('El pago es hoy, con tarjeta y dentro de To’Latino — nunca sales a otra página. Tu insignia se activa al confirmarse el pago.',
                         "You pay today, by card, inside To'Latino — you never leave to another page. Your badge activates once the payment is confirmed.")}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 flex items-start gap-2.5 rounded-[12px] bg-green-bg2 p-3.5">
                    <Check size={16} stroke={3} className="mt-px flex-none text-green" />
                    <span className="text-[11.5px] font-semibold leading-[1.45] text-green-ink">
                      {L('Hoy no pagas nada. Puedes subir a Verified desde tu panel cuando quieras.',
                         "You pay nothing today. You can upgrade to Verified from your dashboard anytime.")}
                    </span>
                  </div>
                )}

                {/* Términos */}
                <button onClick={() => setTerms((v) => !v)} className="mt-4 flex w-full cursor-pointer items-start gap-3 text-left">
                  <span className={`mt-px flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] border-[1.5px] ${terms ? 'border-primary bg-primary' : 'border-muted-faint bg-white'}`}>
                    {terms && <Check size={12} stroke={3.4} className="text-white" />}
                  </span>
                  <span className="text-[11.5px] font-medium leading-[1.5] text-home-ink">
                    {L('Confirmo que la información es verdadera y acepto los Términos para negocios y el Aviso de privacidad de To’Latino.',
                       "I confirm the information is true and accept To'Latino's business Terms and Privacy Notice.")}
                  </span>
                </button>

                {err && (
                  <div className="mt-3 rounded-[12px] bg-pink-bg px-3.5 py-3 text-[11.5px] font-bold text-pink-dark" role="alert">{err}</div>
                )}
              </div>
            )}

            {/* ─── Esperando el pago de Verified ───
                El negocio YA existe (plan Free) y este estado lo dice sin
                rodeos. De aquí se sale pagando, o quedándose en Free — nunca
                con un confeti sin haber pagado. */}
            {step === 'paying' && (
              <div className="tl-pop flex flex-col items-center py-10 text-center">
                <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-lilac">
                  <ShieldCheck size={34} stroke={2.2} className="text-primary-dark" />
                </span>
                <h2 className="mt-5 text-[22px] font-extrabold leading-[1.2] tracking-[-.03em] text-ink">
                  {L('Un paso más: activa Verified', 'One more step: activate Verified')}
                </h2>
                <p className="mt-2 max-w-[400px] text-[13px] font-medium leading-[1.6] text-home-mute">
                  <strong className="font-extrabold text-ink-soft">{name.trim()}</strong>{' '}
                  {L('ya está guardado y publicado en el plan Free. Completa el pago para encender tu insignia, la prioridad en búsquedas y tus herramientas de venta.',
                     'is already saved and live on the Free plan. Complete the payment to turn on your badge, search priority and selling tools.')}
                </p>
                {err && (
                  <div className="mt-4 w-full max-w-[400px] rounded-[12px] bg-pink-bg px-3.5 py-3 text-[11.5px] font-bold text-pink-dark" role="alert">{err}</div>
                )}
                <PrimaryBtn className="mt-6 max-w-[400px]" disabled={busy} onClick={reintentarPago}>
                  {busy ? L('Preparando el cobro…', 'Preparing checkout…') : `${L('Pagar', 'Pay')} $${VERIFIED_PRICE}/${L('mes', 'mo')} ${L('y activar', 'and activate')}`}
                </PrimaryBtn>
                <button onClick={continuarConFree} className="mt-3 cursor-pointer py-2 text-[12.5px] font-extrabold text-home-mute">
                  {L('Continuar con el plan Free por ahora', 'Continue on the Free plan for now')}
                </button>
              </div>
            )}

            {/* ─── Publicando ─── */}
            {step === 'publishing' && (
              <div className="flex flex-col items-center py-16 text-center">
                <span className="h-[52px] w-[52px] animate-spin rounded-full border-4 border-lilac-line border-t-primary" />
                <h2 className="mt-5 text-[22px] font-extrabold text-ink">{L('Publicando tu negocio…', 'Publishing your business…')}</h2>
                <p className="mt-2 text-[13px] font-medium text-home-mute">{L('Estamos activando tus herramientas y tu perfil.', 'We are activating your tools and profile.')}</p>
              </div>
            )}

            {/* ─── Listo ─── */}
            {step === 'done' && (
              <div className="tl-pop flex flex-col items-center py-8 text-center">
                <span className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-green shadow-cta-sm">
                  <Check size={40} stroke={3} className="text-white" />
                </span>
                <h2 className="mt-5 text-[24px] font-extrabold leading-[1.2] tracking-[-.03em] text-ink">{L('¡Tu negocio ya está publicado!', 'Your business is live!')}</h2>
                {paid && (
                  <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-lilac px-3 py-1.5">
                    <VerifiedBadge size={14} />
                    <span className="text-[11px] font-extrabold text-primary-dark">
                      {L('Pago recibido — tu insignia Verified se activa en un momento', 'Payment received — your Verified badge activates in a moment')}
                    </span>
                  </span>
                )}
                <p className="mt-2 max-w-[380px] text-[13px] font-medium leading-[1.6] text-home-mute">
                  <strong className="font-extrabold text-ink-soft">{name.trim()}</strong>{' '}
                  {L('ya aparece cuando tu comunidad busque', 'now shows up when your community searches for')}{' '}
                  {catInfo ? L(catInfo.es, catInfo.en).toLowerCase() : ''} {L('cerca de ti.', 'near you.')}
                </p>

                <div className="mt-6 w-full rounded-[17px] border border-hair bg-page p-4 text-left">
                  <div className="flex flex-col gap-3">
                    {[
                      tool ? { bg: 'bg-lilac', c: 'text-primary-dark', t: L(tool.es, tool.en), d: L(tool.descEs, tool.descEn) } : null,
                      // A quien acaba de PAGAR Verified no se le vende Verified.
                      paid ? null : { bg: 'bg-green-bg', c: 'text-green', t: L('Sube a Verified cuando quieras', 'Upgrade to Verified anytime'),
                        d: L('$14.99 al mes: insignia, prioridad en búsqueda y analíticas.', '$14.99/mo: badge, search priority and analytics.') },
                      { bg: 'bg-clay-bg', c: 'text-clay', t: L('Publica tu primera oferta', 'Post your first offer'),
                        d: L('Aparece en el feed de tu colonia, gratis.', 'Show up in your neighborhood feed, free.') },
                    ].filter(Boolean).map((r) => {
                      const row = r as { bg: string; c: string; t: string; d: string };
                      return (
                        <div key={row.t} className="flex items-start gap-3">
                          <span className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[11px] ${row.bg}`}>
                            <Star size={16} stroke={2.2} className={row.c} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[12.5px] font-extrabold text-ink">{row.t}</span>
                            <span className="block text-[11px] font-medium leading-[1.45] text-muted-2">{row.d}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <PrimaryBtn className="mt-6" onClick={() => router.push('/negocio')}>
                  <span className="flex items-center justify-center gap-2">{L('Entrar a mi panel', 'Go to my dashboard')}<ArrowRight size={17} stroke={2.4} /></span>
                </PrimaryBtn>
                {newSlug && (
                  <button onClick={() => router.push(`${VIEW_PATH.negocios}?b=${newSlug}`)} className="mt-3 cursor-pointer text-[12.5px] font-extrabold text-muted">
                    {L('Ver mi negocio como cliente', 'View my business as a customer')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CTA */}
          {!isTerminal && (
            <div className="sticky bottom-0 border-t border-hair bg-white/96 px-4 py-3 backdrop-blur-[8px] min-[1000px]:static min-[1000px]:border-0 min-[1000px]:px-8 min-[1000px]:pb-6">
              <PrimaryBtn disabled={busy} className={!canNext ? '!bg-lilac-line !shadow-none' : ''} onClick={next}>
                {step === 'pay'
                  ? busy ? L('Publicando…', 'Publishing…')
                    : isVerified ? `${L('Pagar', 'Pay')} $${VERIFIED_PRICE} ${L('y publicar', 'and publish')}`
                      : L('Publicar mi negocio', 'Publish my business')
                  : L('Continuar', 'Continue')}
              </PrimaryBtn>
              {step === 'media' && (
                <button onClick={next} className="mt-2 w-full cursor-pointer py-2 text-[12.5px] font-extrabold text-home-mute">
                  {L('Subir fotos después', 'Add photos later')}
                </button>
              )}
              {step === 'hours' && !hours && (
                <button onClick={next} className="mt-2 w-full cursor-pointer py-2 text-[12.5px] font-extrabold text-home-mute">
                  {L('Definir horario después', 'Set hours later')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cobro de Verified — nuestra hoja, con el Payment Element de Stripe.
          Se abre encima de la sala de espera (`paying`). Al pagar, Stripe
          recarga el navegador en `returnPath?sub=success`: por eso vuelve AQUÍ,
          al flujo — que restaura el borrador y muestra la celebración con el
          pago ya hecho. Cerrarla sin pagar deja la sala de espera, que ofrece
          reintentar o quedarse en Free. */}
      <CheckoutSheet
        open={!!subSecret && step === 'paying'}
        clientSecret={subSecret}
        amount={payAmount}
        returnPath="/negocio/publicar/"
        subscription
        onClose={() => setSubSecret(null)}
        onSuccess={() => void alPagarEnPagina()}
      />

      {/* Toast */}
      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-[13px] bg-ink px-5 py-3 shadow-pop">
          <Check size={14} stroke={3} className="flex-none text-mint" />
          <span className="text-[12.5px] font-bold text-white">{toast}</span>
        </div>
      )}
    </div>
  );
}
