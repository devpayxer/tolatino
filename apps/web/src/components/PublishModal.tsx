'use client';

// Publish flow (Handoff v2): FAB/"Publicar" → chooser (Publicación / Negocio /
// Evento) → per-type form → success. Community posts are inserted into
// Supabase with the author's identity + location, so neighbors within 30
// miles really see them. Guests hit a sign-in gate. Falls back to the local
// in-memory feed when Supabase is unavailable.
// Post form is 3 steps: type → write (photos / tag business / poll options) →
// preview.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconCalendar as Calendar, IconClock as Clock, IconHelpCircle as HelpCircle, IconHeart as Heart, IconPhotoPlus as ImagePlus, IconLogin as LogIn, IconMessageCircle as MessageCircle, IconPlus as Plus, IconBuildingStore as Store, IconTag as Tag, IconX as X, IconChartBar as BarChart3, IconCheck as Check } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp, type PostType } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { useLiveData } from '@/lib/live';
import { supabase } from '@/lib/supabase';
import { uploadPostImages } from '@/lib/image';
import { getBrowserLocation } from '@/lib/geo';
import { formatPhone } from '@/lib/phone';
import { CAT, CAT_KEYS, type CatKey } from '@/lib/tiles';
import type { WeekHours } from '@/lib/hours';
import { Overlay, OverlayTitle, PrimaryBtn } from '@/components/ui';
import { FEATURES_BY_CAT, FEATURES_COMMON, SUBCATS, VIEW_PATH, hoodsForCity } from '@/data/fixtures';
import { PostCard, type FeedPost } from '@/components/PostCard';
import { HoursEditor, defaultWeek } from '@/components/HoursEditor';

// Canonical (es) labels of the universal "Sugeridos" features — kept across a
// category switch (unlike the per-rubro ones, which wouldn't match a new rubro).
const COMMON_SET = new Set(FEATURES_COMMON.map(([es]) => es));

const MAX_PHOTOS = 3;
type Photo = { file: File; url: string };

export function PublishModal() {
  const { L } = useLang();
  const app = useApp();
  const auth = useAuth();
  const live = useLiveData();
  // Nombres de negocios REALES cercanos para el selector de "Etiquetar negocio".
  const taggableBiz = useMemo(() => live.businesses.slice(0, 12).map((b) => b.name), [live.businesses]);
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [postType, setPostType] = useState<PostType>('ask');
  const [text, setText] = useState('');
  const [hood, setHood] = useState('');

  // Neighborhoods follow the selected city. Known cities show chips; unknown
  // ones (any of the 6,978 gazetteer cities) get a free-text field. The barrio
  // is OPTIONAL — default to none ("Toda la ciudad") and reset on city change.
  const cityHoods = hoodsForCity(app.cityShort);
  useEffect(() => {
    setHood('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.cityShort]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [taggedBiz, setTaggedBiz] = useState<string | null>(null);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [posting, setPosting] = useState(false);
  const [postErr, setPostErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // ── business publish form ──
  const [bizName, setBizName] = useState('');
  const [bizCat, setBizCat] = useState<CatKey | null>(null);
  const [bizSubs, setBizSubs] = useState<string[]>([]);
  const [bizFeatures, setBizFeatures] = useState<string[]>([]);
  const [bizPrice, setBizPrice] = useState<string | null>(null);
  const [bizPhone, setBizPhone] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizAbout, setBizAbout] = useState('');
  const [bizGps, setBizGps] = useState<{ lat: number; lng: number } | null>(null);
  const [bizLocating, setBizLocating] = useState(false);
  // Weekly schedule is OPTIONAL: null = don't send hours (listing falls back to
  // the is_open flag). Enabling it seeds a common schedule the owner can adjust.
  const [bizHours, setBizHours] = useState<WeekHours | null>(null);
  const [bizBusy, setBizBusy] = useState(false);
  const [bizErr, setBizErr] = useState<string | null>(null);

  // Switching category drops the per-rubro feature picks (they wouldn't match a
  // different rubro); the universal "Sugeridos" ones are kept.
  const pickBizCat = (k: CatKey) => {
    setBizCat(k);
    setBizSubs([]);
    setBizFeatures((prev) => prev.filter((x) => COMMON_SET.has(x) || FEATURES_BY_CAT[k].some(([es]) => es === x)));
  };
  const toggleFeature = (es: string) =>
    setBizFeatures((prev) => (prev.includes(es) ? prev.filter((x) => x !== es) : [...prev, es]));

  const resetBiz = () => {
    setBizName('');
    setBizCat(null);
    setBizSubs([]);
    setBizFeatures([]);
    setBizPrice(null);
    setBizPhone('');
    setBizAddress('');
    setBizAbout('');
    setBizGps(null);
    setBizLocating(false); // clear "Ubicando…" so a hung geolocation prompt can't survive close/reopen
    setBizHours(null);
    setBizBusy(false);
    setBizErr(null);
  };

  const useMyLocationForBiz = async () => {
    setBizLocating(true);
    try {
      const loc = await getBrowserLocation();
      if (loc) setBizGps({ lat: loc.lat, lng: loc.lng });
    } catch {
      /* denied / unavailable — keep the city center */
    }
    setBizLocating(false);
  };

  const submitBiz = async () => {
    if (!bizName.trim() || !bizCat || bizBusy) return;
    setBizErr(null);
    // publishing a business requires an account (owner)
    if (supabase && !auth.user) {
      close();
      router.push('/entrar');
      return;
    }
    if (supabase && auth.user) {
      setBizBusy(true);
      const subTuple = SUBCATS[bizCat].find(([es]) => es === bizSubs[0]);
      const coords = bizGps ?? app.coords;
      const { error } = await supabase.rpc('create_business', {
        p_name: bizName.trim(),
        p_category: bizCat,
        p_subcats: bizSubs,
        p_price: bizPrice,
        p_phone: bizPhone.trim(),
        p_address: bizAddress.trim(),
        p_city: app.city,
        p_about: bizAbout.trim(),
        p_specialty_es: subTuple?.[0] ?? '',
        p_specialty_en: subTuple?.[1] ?? '',
        p_tile_a: CAT[bizCat].bg,
        p_tile_b: CAT[bizCat].dot,
        p_lat: coords.lat,
        p_lng: coords.lng,
        p_features: bizFeatures,
        // null = no schedule (falls back to is_open). A non-null week is a
        // deliberate schedule and is stored as-is — even "all days closed", so a
        // business set to closed all week never renders as "Abierto".
        p_hours: bizHours,
      });
      setBizBusy(false);
      if (error) {
        setBizErr(L('No pudimos publicar el negocio. Intenta de nuevo.', "We couldn't publish the business. Try again."));
        return;
      }
      live.refresh(); // the new listing shows up in Negocios for everyone nearby
      setDone(true);
      return;
    }
    // demo / not configured
    setDone(true);
  };

  const clearPhotos = () => setPhotos((list) => (list.forEach((p) => URL.revokeObjectURL(p.url)), []));

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    setPhotos((list) => [...list, ...picked.slice(0, MAX_PHOTOS - list.length).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    e.target.value = ''; // allow re-picking the same file
  };

  const removePhoto = (i: number) =>
    setPhotos((list) => {
      URL.revokeObjectURL(list[i].url);
      return list.filter((_, j) => j !== i);
    });

  const reset = () => {
    setStep(1);
    setDone(false);
    setText('');
    clearPhotos();
    setTaggedBiz(null);
    setPollOptions(['', '']);
    setPosting(false);
    setPostErr(null);
    resetBiz();
  };
  const close = () => {
    app.closePub();
    reset();
  };

  const type = app.pubType;
  const isChooser = app.pubOpen && !type && !done;
  const isPoll = postType === 'poll';
  const pollFilled = pollOptions.filter((o) => o.trim()).length;
  const canPost = isPoll ? text.trim().length > 0 && pollFilled >= 2 : text.trim().length > 0;

  const typeDefs: { key: PostType; Icon: typeof HelpCircle; color: string; bg: string; labEs: string; labEn: string; dEs: string; dEn: string }[] = [
    { key: 'ask', Icon: HelpCircle, color: '#6D4DF6', bg: '#EFEBFF', labEs: 'Pregunta', labEn: 'Ask', dEs: 'Pide una recomendación o ayuda a tus vecinos.', dEn: 'Ask neighbors for a rec or help.' },
    { key: 'rec', Icon: Heart, color: '#1F9D57', bg: '#E3F5EA', labEs: 'Recomendación', labEn: 'Recommendation', dEs: 'Comparte un negocio o servicio que te encantó.', dEn: 'Share a business or service you loved.' },
    { key: 'local', Icon: MessageCircle, color: '#2F6FED', bg: '#E5EFFB', labEs: 'Aviso del barrio', labEn: 'Neighborhood update', dEs: 'Cuenta algo que está pasando cerca de ti.', dEn: 'Share something happening nearby.' },
    { key: 'sale', Icon: Tag, color: '#B26A00', bg: '#FCEFD6', labEs: 'Compra y venta', labEn: 'Buy & sell', dEs: 'Ofrece o busca algo en tu comunidad.', dEn: 'Offer or look for something locally.' },
    { key: 'poll', Icon: BarChart3, color: '#0E9384', bg: '#D6F3EF', labEs: 'Encuesta', labEn: 'Poll', dEs: 'Haz una pregunta con opciones para votar.', dEn: 'Ask a question with options to vote on.' },
  ];

  // Local fallback: keeps the app working when Supabase is unreachable.
  const addLocalPost = (txt: string, opts: string[]) => {
    app.addPost({
      type: postType,
      initials: auth.profile?.initials ?? 'TÚ',
      color: auth.profile?.avatar_color ?? '#7B61FF',
      name: auth.profile?.display_name ?? L('Tú', 'You'),
      authorId: auth.user?.id,
      hoodEs: hood,
      city: app.city,
      timeEs: 'ahora',
      timeEn: 'now',
      recommends: 0,
      business: taggedBiz ?? undefined,
      bizRating: undefined, // never fabricate a rating for a tagged business
      poll: isPoll ? opts : undefined,
      pollBase: isPoll ? opts.map(() => 0) : undefined,
      images: photos.length ? photos.map((p) => p.url) : undefined,
      es: txt,
      en: txt,
    });
  };

  const submitPost = async () => {
    const txt = text.trim();
    if (!txt || posting) return;
    const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (isPoll && opts.length < 2) return;
    setPostErr(null);

    // Real publish: insert into Supabase with the author's identity + location.
    if (supabase && auth.user && auth.profile) {
      setPosting(true);

      // Compress + upload any photos first (client-side WebP, see lib/image).
      let images: string[] = [];
      if (photos.length) {
        try {
          images = await uploadPostImages(
            photos.map((p) => p.file),
            auth.user.id,
          );
        } catch {
          setPosting(false);
          setPostErr(L('No pudimos subir las fotos. Intenta de nuevo.', "We couldn't upload the photos. Try again."));
          return;
        }
      }

      const { error } = await supabase.from('posts').insert({
        type: postType,
        author_id: auth.user.id,
        author_name: auth.profile.display_name,
        author_initials: auth.profile.initials,
        author_color: auth.profile.avatar_color,
        hood: hood.trim() || null,
        city: app.city,
        lat: app.coords.lat,
        lng: app.coords.lng,
        body_es: txt,
        body_en: txt,
        business_name: taggedBiz,
        business_rating: null, // never fabricate a rating (rule #8)
        poll_options: isPoll ? opts : null,
        poll_votes: isPoll ? opts.map(() => 0) : null,
        images: images.length ? images : null,
      });
      setPosting(false);
      if (error) {
        setPostErr(L('No pudimos publicar. Revisa tu conexión e intenta de nuevo.', "We couldn't publish. Check your connection and try again."));
        return;
      }
      live.refresh(); // the new post arrives from the DB for everyone nearby
      setDone(true);
      return;
    }

    // Signed in with a backend but the profile row didn't load: don't silently
    // fall through to a local-only post and fake a success — surface the problem.
    if (supabase && auth.user && !auth.profile) {
      setPostErr(L('No pudimos cargar tu perfil. Recarga la página e intenta de nuevo.', "We couldn't load your profile. Reload the page and try again."));
      return;
    }

    // No backend (or demo mode): local-only post.
    addLocalPost(txt, opts);
    setDone(true);
  };

  const finishView = type === 'negocio' ? 'negocios' : type === 'evento' ? 'eventos' : 'comunidad';
  const success = {
    post: { t: L('¡Publicado!', 'Posted!'), s: L('Tu publicación ya está en el feed de tu barrio.', 'Your post is now in your neighborhood feed.'), c: L('Ver en Comunidad', 'View in Community') },
    negocio: { t: L('¡Negocio publicado!', 'Business published!'), s: L('Tu negocio ya está en el directorio de tu zona.', 'Your business is now in your local directory.'), c: L('Ir a Negocios', 'Go to Business') },
    evento: { t: L('¡Evento creado!', 'Event created!'), s: L('Tu evento ya está publicado para la comunidad.', 'Your event is now live for the community.'), c: L('Ir a Eventos', 'Go to Events') },
  }[type ?? 'post'];

  const title = isChooser
    ? L('¿Qué quieres publicar?', 'What do you want to post?')
    : type === 'post'
      ? step === 1
        ? L('Nueva publicación', 'New post')
        : step === 2
          ? L('Escribe tu publicación', 'Write your post')
          : L('Vista previa', 'Preview')
      : type === 'negocio'
        ? L('Publicar negocio', 'List business')
        : L('Crear evento', 'Create event');

  const chip = (on: boolean) =>
    `flex-none cursor-pointer whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-extrabold ${on ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-2'}`;

  const field = (label: string, input: React.ReactNode) => (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-extrabold text-ink">{label}</span>
      {input}
    </label>
  );
  const inputCls =
    'w-full rounded-field border-[1.5px] border-[#ECE9F6] bg-app px-3.5 py-3 text-[13.5px] font-medium text-ink outline-none placeholder:text-muted focus:border-primary';

  const previewPost: FeedPost = {
    id: 'preview',
    type: postType,
    initials: auth.profile?.initials ?? 'TÚ',
    color: auth.profile?.avatar_color ?? '#7B61FF',
    name: auth.profile?.display_name ?? L('Tú', 'You'),
    authorId: auth.user?.id,
    hoodEs: hood,
    city: app.city,
    timeEs: 'ahora',
    timeEn: 'now',
    recommends: 0,
    business: taggedBiz ?? undefined,
    bizRating: undefined, // never fabricate a rating for a tagged business
    poll: isPoll ? pollOptions.map((o) => o.trim()).filter(Boolean) : undefined,
    pollBase: isPoll ? pollOptions.map(() => 0) : undefined,
    images: photos.length ? photos.map((p) => p.url) : undefined,
    es: text.trim() || L('Tu publicación aparecerá aquí…', 'Your post will appear here…'),
    en: text.trim() || L('Tu publicación aparecerá aquí…', 'Your post will appear here…'),
  };

  if (!app.pubOpen) return null;

  return (
    <Overlay open onClose={close} width={460}>
      {!done && (
        <OverlayTitle
          title={title}
          onClose={close}
          onBack={type === 'post' && step > 1 ? () => setStep(step - 1) : type ? () => { app.setPubType(null); setStep(1); } : undefined}
        />
      )}

      {/* chooser */}
      {isChooser && (
        <div className="flex flex-col gap-2.5">
          {(
            [
              { key: 'post', Icon: MessageCircle, color: '#6D4DF6', bg: '#EFEBFF', lab: L('Crear publicación', 'Create post'), d: L('Pregunta, recomienda o comparte con tu barrio.', 'Ask, recommend or share with your neighborhood.') },
              { key: 'negocio', Icon: Store, color: '#1F9D57', bg: '#E3F5EA', lab: L('Publicar mi negocio', 'List my business'), d: L('Aparece en el directorio y llega a miles de clientes.', 'Get in the directory and reach thousands of customers.') },
              { key: 'evento', Icon: Calendar, color: '#2F6FED', bg: '#E5EFFB', lab: L('Crear evento', 'Create event'), d: L('Organiza y vende boletos para tu comunidad.', 'Organize and sell tickets for your community.') },
            ] as const
          ).map((o) => (
            <button
              key={o.key}
              onClick={() => app.setPubType(o.key)}
              className="flex w-full cursor-pointer items-center gap-3.5 rounded-tile border-[1.5px] border-hair bg-white p-3.5 text-left hover:border-primary"
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-btn" style={{ background: o.bg }}>
                <o.Icon size={22} strokeWidth={2.2} style={{ color: o.color }} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-extrabold text-ink">{o.lab}</span>
                <span className="mt-0.5 block text-[12px] font-semibold leading-snug text-muted">{o.d}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* sign-in gate: publishing to the community requires an account */}
      {type === 'post' && !done && !auth.user && auth.configured && (
        <div className="flex flex-col items-center px-2 py-5 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lilac">
            <LogIn size={24} className="text-primary" stroke={2.2} />
          </span>
          <div className="mt-4 text-[19px] font-extrabold tracking-[-.02em] text-ink">
            {L('Únete para publicar', 'Join to post')}
          </div>
          <p className="mt-1.5 max-w-[300px] text-[13px] font-semibold leading-relaxed text-muted">
            {L('Crea tu cuenta gratis para compartir con los vecinos a 30 millas a la redonda.', 'Create your free account to share with neighbors within 30 miles.')}
          </p>
          <PrimaryBtn
            className="mt-5"
            onClick={() => {
              close();
              router.push('/entrar');
            }}
          >
            {L('Crear cuenta o iniciar sesión', 'Create account or sign in')}
          </PrimaryBtn>
          <button onClick={close} className="mt-3 cursor-pointer text-[12.5px] font-extrabold text-muted">
            {L('Ahora no', 'Not now')}
          </button>
        </div>
      )}

      {/* post flow */}
      {type === 'post' && !done && (auth.user || !auth.configured) && (
        <>
          <div className="mb-4 flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <span key={n} className={`h-[5px] flex-1 rounded-[3px] ${n <= step ? 'bg-primary' : 'bg-lilac-line'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="flex flex-col gap-2.5">
              <div className="text-[12.5px] font-semibold text-muted">{L('Elige el tipo de publicación.', 'Choose the kind of post.')}</div>
              {typeDefs.map((o) => (
                <button
                  key={o.key}
                  onClick={() => {
                    setPostType(o.key);
                    setStep(2);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-3.5 rounded-tile border-[1.5px] p-3.5 text-left ${
                    postType === o.key ? 'border-primary bg-[#FAF9FE]' : 'border-hair bg-white'
                  }`}
                >
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn" style={{ background: o.bg }}>
                    <o.Icon size={20} strokeWidth={2.2} style={{ color: o.color }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-extrabold text-ink">{L(o.labEs, o.labEn)}</span>
                    <span className="mt-0.5 block text-[11.5px] font-semibold leading-snug text-muted">{L(o.dEs, o.dEn)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder={
                  isPoll
                    ? L('Escribe tu pregunta…', 'Write your question…')
                    : L('¿Qué quieres compartir con tu barrio?', 'What do you want to share with your neighborhood?')
                }
                className={`${inputCls} resize-none`}
              />

              {isPoll && (
                <div>
                  <div className="mb-1.5 text-[12px] font-extrabold text-ink">{L('Opciones de la encuesta', 'Poll options')}</div>
                  <div className="flex flex-col gap-2">
                    {pollOptions.map((v, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={v}
                          onChange={(e) => setPollOptions(pollOptions.map((o, j) => (j === i ? e.target.value : o)))}
                          placeholder={`${L('Opción', 'Option')} ${i + 1}`}
                          className={inputCls}
                        />
                        {pollOptions.length > 2 && (
                          <button
                            onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                            className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink-2"
                          >
                            <X size={13} stroke={2.6} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {pollOptions.length < 4 && (
                    <button
                      onClick={() => setPollOptions([...pollOptions, ''])}
                      className="mt-2 flex cursor-pointer items-center gap-1.5 text-[12.5px] font-extrabold text-primary-dark"
                    >
                      <Plus size={14} stroke={2.6} />
                      {L('Añadir opción', 'Add option')}
                    </button>
                  )}
                </div>
              )}

              {!isPoll && (
                <div>
                  <div className="mb-1.5 text-[12px] font-extrabold text-ink">{L('Fotos (opcional)', 'Photos (optional)')}</div>
                  <input ref={fileInput} type="file" accept="image/*" multiple onChange={onPickFiles} className="hidden" />
                  <div className="flex flex-wrap gap-2">
                    {photos.map((p, i) => (
                      <span key={p.url} className="relative h-[68px] w-[68px] overflow-hidden rounded-btn bg-app">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt="" className="h-full w-full object-cover" />
                        <button
                          onClick={() => removePhoto(i)}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-ink text-white"
                          aria-label={L('Quitar foto', 'Remove photo')}
                        >
                          <X size={10} stroke={3} />
                        </button>
                      </span>
                    ))}
                    {photos.length < MAX_PHOTOS && (
                      <button
                        onClick={() => fileInput.current?.click()}
                        className="flex h-[68px] w-[68px] cursor-pointer flex-col items-center justify-center gap-1 rounded-btn border-[1.5px] border-dashed border-lilac-line text-[11px] font-extrabold text-primary-dark"
                      >
                        <ImagePlus size={16} stroke={2.4} />
                        {L('Añadir', 'Add')}
                      </button>
                    )}
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold text-muted">
                    {L('Se optimizan en tu teléfono antes de subir.', 'Optimized on your phone before upload.')}
                  </div>
                </div>
              )}

              {postType === 'rec' && (
                <div>
                  <div className="mb-1.5 text-[12px] font-extrabold text-ink">{L('Etiquetar negocio', 'Tag a business')}</div>
                  {/* Negocios REALES cercanos (2026-07-29). Antes salían TAG_BIZ_NAMES:
                      4 nombres inventados (Taquería La Esperanza, Salón Glamour,
                      Taller Don Beto, Panadería Dulce Hogar) → un vecino podía
                      publicar una recomendación etiquetando un negocio que NO
                      existe. Ahora se ofrecen los del feed real; si aún no hay
                      ninguno cerca, no se ofrece nada (regla #8). */}
                  {taggableBiz.length > 0 ? (
                    <div className="no-scrollbar flex gap-2 overflow-x-auto">
                      {taggableBiz.map((b) => (
                        <button key={b} onClick={() => setTaggedBiz(taggedBiz === b ? null : b)} className={chip(taggedBiz === b)}>
                          {b}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11.5px] font-semibold text-muted">
                      {L('Aún no hay negocios cerca para etiquetar.', 'No nearby businesses to tag yet.')}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="mb-1.5 text-[12px] font-extrabold text-ink">
                  {L('Barrio', 'Neighborhood')} <span className="font-semibold text-muted">· {L('opcional', 'optional')}</span>
                </div>
                {cityHoods.length > 0 ? (
                  <div className="no-scrollbar flex gap-2 overflow-x-auto">
                    {/* "Whole city" = no specific barrio; only the city shows on the post */}
                    <button onClick={() => setHood('')} className={chip(hood === '')}>
                      {L(`Todo ${app.cityShort}`, `All ${app.cityShort}`)}
                    </button>
                    {cityHoods.map((h) => (
                      <button key={h} onClick={() => setHood(hood === h ? '' : h)} className={chip(hood === h)}>
                        {h}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    value={hood}
                    onChange={(e) => setHood(e.target.value)}
                    placeholder={L('Tu barrio o zona (opcional)', 'Your neighborhood or area (optional)')}
                    className={inputCls}
                  />
                )}
              </div>

              <PrimaryBtn disabled={!canPost} onClick={() => canPost && setStep(3)}>
                {L('Continuar', 'Continue')}
              </PrimaryBtn>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mb-3 text-[12.5px] font-semibold text-muted">
                {L('Así se verá en el feed de tu barrio:', "Here's how it'll look in your feed:")}
              </div>
              <PostCard post={previewPost} preview />
              {postErr && (
                <div className="mt-3 rounded-btn bg-pink-bg px-3 py-2 text-[12px] font-semibold text-pink-dark">{postErr}</div>
              )}
              <PrimaryBtn className="mt-4" disabled={posting} onClick={submitPost}>
                {posting
                  ? photos.length
                    ? L('Subiendo fotos…', 'Uploading photos…')
                    : L('Publicando…', 'Posting…')
                  : L('Publicar', 'Post')}
              </PrimaryBtn>
            </div>
          )}
        </>
      )}

      {/* business form */}
      {type === 'negocio' && !done && (
        <div className="flex flex-col gap-3.5">
          {field(
            L('Nombre del negocio', 'Business name'),
            <input value={bizName} onChange={(e) => setBizName(e.target.value)} className={inputCls} placeholder={L('Ej. Panadería del barrio', 'e.g. Neighborhood bakery')} />,
          )}

          <div>
            <div className="mb-1.5 text-[12px] font-extrabold text-ink">{L('Categoría', 'Category')}</div>
            <div className="flex flex-wrap gap-2">
              {CAT_KEYS.map((k) => (
                <button key={k} onClick={() => pickBizCat(k)} className={chip(bizCat === k)}>
                  {L(CAT[k].es, CAT[k].en)}
                </button>
              ))}
            </div>
          </div>

          {bizCat && (
            <div>
              <div className="mb-1.5 text-[12px] font-extrabold text-ink">
                {L('Subcategorías', 'Subcategories')} <span className="font-semibold text-muted">· {L('elige las que apliquen', 'pick any that apply')}</span>
              </div>
              <div className="flex max-h-[164px] flex-wrap gap-2 overflow-y-auto">
                {SUBCATS[bizCat].map(([es, en]) => {
                  const on = bizSubs.includes(es);
                  return (
                    <button
                      key={es}
                      onClick={() => setBizSubs((s) => (on ? s.filter((x) => x !== es) : [...s, es]))}
                      className={chip(on)}
                    >
                      {L(es, en)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Características — Sugeridos (universales) siempre; las del rubro al elegir categoría */}
          <div>
            <div className="mb-1.5 text-[12px] font-extrabold text-ink">
              {L('Características', 'Features')} <span className="font-semibold text-muted">· {L('opcional', 'optional')}</span>
            </div>
            <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[.04em] text-muted">{L('Sugeridos', 'Suggested')}</div>
            <div className="flex flex-wrap gap-2">
              {FEATURES_COMMON.map(([es, en]) => (
                <button key={es} onClick={() => toggleFeature(es)} className={chip(bizFeatures.includes(es))}>
                  {L(es, en)}
                </button>
              ))}
            </div>
            {bizCat && (
              <>
                <div className="mb-1.5 mt-3 text-[11px] font-extrabold uppercase tracking-[.04em] text-muted">{L(CAT[bizCat].es, CAT[bizCat].en)}</div>
                <div className="flex flex-wrap gap-2">
                  {FEATURES_BY_CAT[bizCat]
                    .filter(([es]) => !COMMON_SET.has(es))
                    .map(([es, en]) => (
                      <button key={es} onClick={() => toggleFeature(es)} className={chip(bizFeatures.includes(es))}>
                        {L(es, en)}
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>

          <div>
            <div className="mb-1.5 text-[12px] font-extrabold text-ink">{L('Precio', 'Price')} <span className="font-semibold text-muted">· {L('opcional', 'optional')}</span></div>
            <div className="flex gap-2">
              {['$', '$$', '$$$'].map((p) => (
                <button key={p} onClick={() => setBizPrice(bizPrice === p ? null : p)} className={chip(bizPrice === p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {field(L('Teléfono', 'Phone'), <input value={bizPhone} onChange={(e) => setBizPhone(formatPhone(e.target.value))} className={inputCls} placeholder="(713) 555-0100" inputMode="tel" autoComplete="tel" />)}
          {field(L('Dirección', 'Address'), <input value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} className={inputCls} placeholder={L('Calle y número (opcional)', 'Street address (optional)')} />)}
          {field(
            L('Descripción', 'Description'),
            <textarea value={bizAbout} onChange={(e) => setBizAbout(e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder={L('Cuéntale a la comunidad qué ofreces…', 'Tell the community what you offer…')} />,
          )}

          <div>
            <div className="mb-1.5 text-[12px] font-extrabold text-ink">{L('Ubicación', 'Location')}</div>
            <button
              onClick={useMyLocationForBiz}
              disabled={bizLocating}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-field border-[1.5px] border-lilac-line bg-white py-2.5 text-[12.5px] font-extrabold text-primary-dark disabled:opacity-60"
            >
              {bizLocating ? L('Ubicando…', 'Locating…') : bizGps ? L('Ubicación fijada ✓', 'Location set ✓') : L('Usar mi ubicación actual', 'Use my current location')}
            </button>
            <div className="mt-1 text-[11px] font-semibold text-muted">
              {bizGps ? L('Usaremos tu ubicación exacta.', "We'll use your exact location.") : L(`Si no, aparecerá en ${app.cityShort}.`, `Otherwise it'll show in ${app.cityShort}.`)}
            </div>
          </div>

          {/* Horario de atención — opcional; alimenta el estado abierto/cerrado en vivo */}
          <div>
            <div className="mb-1.5 text-[12px] font-extrabold text-ink">
              {L('Horario de atención', 'Opening hours')} <span className="font-semibold text-muted">· {L('opcional', 'optional')}</span>
            </div>
            {bizHours ? (
              <>
                <HoursEditor week={bizHours} onChange={setBizHours} L={L} />
                <button onClick={() => setBizHours(null)} className="mt-2 cursor-pointer text-[11.5px] font-extrabold text-muted">
                  {L('Quitar horario', 'Remove hours')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setBizHours(defaultWeek())}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-field border-[1.5px] border-lilac-line bg-white py-2.5 text-[12.5px] font-extrabold text-primary-dark"
                >
                  <Clock size={15} stroke={2.4} />
                  {L('Agregar horario de atención', 'Add opening hours')}
                </button>
                <div className="mt-1 text-[11px] font-semibold text-muted">
                  {L('Sin horario, tu negocio aparece como “Abierto”.', 'Without hours, your business shows as “Open”.')}
                </div>
              </>
            )}
          </div>

          {bizErr && <div className="rounded-btn bg-pink-bg px-3 py-2 text-[12px] font-semibold text-pink-dark">{bizErr}</div>}

          <PrimaryBtn disabled={!bizName.trim() || !bizCat || bizBusy} onClick={submitBiz}>
            {bizBusy ? L('Publicando…', 'Publishing…') : L('Publicar negocio', 'Publish business')}
          </PrimaryBtn>
          <button
            onClick={() => {
              close();
              router.push('/negocio/publicar');
            }}
            className="cursor-pointer text-center text-[12.5px] font-extrabold text-primary-dark"
          >
            {L('¿Quieres el onboarding completo con planes? →', 'Want the full onboarding with plans? →')}
          </button>
        </div>
      )}

      {/* event creation routes to the REAL panel flow — no fake-success stub.
          Events are created by a business (panel → Eventos: tiers, tickets,
          QR check-in). A consumer publishes a business first. */}
      {type === 'evento' && !done && (
        <div className="flex flex-col items-center px-2 py-5 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E5EFFB]">
            <Calendar size={24} className="text-[#2F6FED]" stroke={2.2} />
          </span>
          <div className="mt-4 text-[18px] font-extrabold tracking-[-.02em] text-ink">
            {L('Los eventos se crean desde tu Panel', 'Events are created from your Panel')}
          </div>
          <p className="mt-1.5 max-w-[320px] text-[13px] font-semibold leading-relaxed text-muted">
            {L('Desde tu Panel de negocio creas el evento, defines boletos y precios, y validas la entrada en la puerta con QR.', 'From your Business panel you create the event, set ticket tiers and prices, and check people in at the door with QR.')}
          </p>
          <PrimaryBtn className="mt-5 w-full" onClick={() => { close(); router.push('/negocio'); }}>
            {L('Ir a mi Panel de negocio', 'Go to my Business panel')}
          </PrimaryBtn>
          <button onClick={() => app.setPubType('negocio')} className="mt-3 cursor-pointer text-[12.5px] font-extrabold text-primary-dark">
            {L('Aún no tengo negocio · Publicar negocio →', "I don't have a business yet · List one →")}
          </button>
        </div>
      )}

      {/* success */}
      {done && (
        <div className="flex flex-col items-center px-2 py-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg">
            <Check size={28} stroke={3} className="text-green" />
          </span>
          <div className="mt-4 text-[19px] font-extrabold tracking-[-.02em] text-ink">{success.t}</div>
          <div className="mt-1.5 max-w-[300px] text-[13px] font-semibold leading-relaxed text-muted">{success.s}</div>
          <PrimaryBtn
            className="mt-5"
            onClick={() => {
              close();
              router.push(VIEW_PATH[finishView]);
            }}
          >
            {success.c}
          </PrimaryBtn>
        </div>
      )}
    </Overlay>
  );
}
