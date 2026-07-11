'use client';

// "Publica tu negocio" onboarding (Handoff v2): auth → categoría → servicios
// → info → plan (Básico / Verified Pro $4.99) → pago → panel inicial con
// stats, completar perfil, acciones y upsell. Full-screen flow.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconCamera as Camera, IconCheck as Check, IconChevronLeft as ChevronLeft, IconEye as Eye, IconPhotoPlus as ImagePlus, IconLock as Lock, IconPencil as Pencil, IconTag as Tag, IconX as X } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { PrimaryBtn, VerifiedBadge, Wordmark } from '@/components/ui';
import { LangToggle } from '@/components/AppHeader';
import { ONB_CATS, ONB_SUBS } from '@/data/onboarding';
import { VIEW_PATH } from '@/data/fixtures';

type Step = 'auth' | 'category' | 'subcategory' | 'info' | 'plan' | 'checkout' | 'dashboard';
const ORDER: Step[] = ['auth', 'category', 'subcategory', 'info', 'plan', 'checkout'];

export function BizOnboardingScreen() {
  const { L } = useLang();
  const app = useApp();
  const router = useRouter();

  const [step, setStep] = useState<Step>(app.biz ? 'dashboard' : 'auth');
  const [cat, setCat] = useState<string | null>(app.biz?.cat ?? null);
  const [subs, setSubs] = useState<number[]>([]);
  const [plan, setPlan] = useState<'free' | 'pro'>(app.biz?.plan ?? 'pro');
  const [form, setForm] = useState({ phone: '', name: app.biz?.name ?? '', bphone: '', addr: '', desc: '', card: '', exp: '', cvc: '', cardName: '' });

  const isPro = plan === 'pro';
  const idx = ORDER.indexOf(step as (typeof ORDER)[number]);
  const isDashboard = step === 'dashboard';
  const progressPct = isDashboard ? 100 : Math.round(((idx + 1) / ORDER.length) * 100);

  const canNext =
    step === 'category' ? !!cat : step === 'subcategory' ? subs.length > 0 : step === 'info' ? form.name.trim().length > 0 : true;

  const finish = () => {
    const c = ONB_CATS.find((x) => x.k === cat);
    app.setBiz({ name: form.name.trim() || L('Tu Negocio', 'Your Business'), plan, cat: cat ?? 'comida', catLabel: c ? [c.es, c.en] : ['Comida y Bebidas', 'Food & Drinks'] });
    setStep('dashboard');
  };

  const next = () => {
    if (step === 'auth') return setStep('category');
    if (step === 'category' && cat) return setStep('subcategory');
    if (step === 'subcategory' && subs.length) return setStep('info');
    if (step === 'info' && form.name.trim()) return setStep('plan');
    if (step === 'plan') return plan === 'pro' ? setStep('checkout') : finish();
    if (step === 'checkout') return finish();
  };
  const back = () => {
    const map: Partial<Record<Step, Step>> = { category: 'auth', subcategory: 'category', info: 'subcategory', plan: 'info', checkout: 'plan' };
    if (map[step]) setStep(map[step]!);
  };

  const nextLabel =
    step === 'plan'
      ? isPro
        ? L('Continuar al pago', 'Continue to payment')
        : L('Crear listado gratis', 'Create free listing')
      : step === 'checkout'
        ? L('Pagar $4.99', 'Pay $4.99')
        : L('Continuar', 'Continue');

  const inputCls =
    'w-full rounded-field border-[1.5px] border-[#ECE9F6] bg-white px-3.5 py-3 text-[13.5px] font-medium text-ink outline-none placeholder:text-muted focus:border-primary';
  const field = (label: string, input: React.ReactNode) => (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-extrabold text-ink">{label}</span>
      {input}
    </label>
  );
  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const stat = app.biz?.plan === 'pro' || isPro ? { views: '128', calls: '14', saves: '32' } : { views: '12', calls: '1', saves: '3' };
  const bizName = app.biz?.name ?? (form.name.trim() || L('Tu Negocio', 'Your Business'));
  const bizIsPro = (app.biz?.plan ?? plan) === 'pro';

  return (
    <div className="flex min-h-screen flex-col bg-[#FBFAFE]">
      {/* top bar */}
      {!isDashboard && (
        <div className="sticky top-0 z-20 border-b border-hair bg-[rgba(255,255,255,.94)] backdrop-blur-[8px]">
          <div className="mx-auto flex max-w-[560px] items-center gap-2.5 px-4 py-3">
            {step !== 'auth' ? (
              <button onClick={back} className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2" aria-label={L('Volver', 'Back')}>
                <ChevronLeft size={16} stroke={2.4} className="text-ink" />
              </button>
            ) : (
              <Wordmark size="sm" />
            )}
            <span className="text-[11.5px] font-extrabold uppercase tracking-[.05em] text-muted">
              {L('Paso ', 'Step ')}{idx + 1}{L(' de ', ' of ')}{ORDER.length}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <LangToggle mini />
              <button onClick={() => router.push(VIEW_PATH.comunidad)} className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink-2" aria-label={L('Salir', 'Exit')}>
                <X size={14} stroke={2.8} />
              </button>
            </div>
          </div>
          <div className="h-1 bg-lilac-line">
            <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[560px] flex-1 px-4 py-6">
        {/* AUTH */}
        {step === 'auth' && (
          <div className="pt-6 text-center">
            <Wordmark size="lg" />
            <h1 className="mt-5 text-[24px] font-extrabold tracking-[-.02em] text-ink text-balance">
              {L('Publica tu negocio en ToLatino', 'List your business on ToLatino')}
            </h1>
            <p className="mx-auto mt-2 max-w-[360px] text-[13.5px] font-medium leading-[1.55] text-ink-3">
              {L('Crea tu cuenta de negocio y llega a miles de clientes latinos.', 'Create your business account and reach thousands of Latino customers.')}
            </p>
            <div className="mx-auto mt-7 max-w-[380px] text-left">
              <input value={form.phone} onChange={setF('phone')} placeholder={L('Número de teléfono', 'Phone number')} className={inputCls} />
              <PrimaryBtn className="mt-3" onClick={next}>{L('Continuar con SMS', 'Continue with SMS')}</PrimaryBtn>
              <div className="my-4 flex items-center gap-3 text-[11px] font-bold uppercase text-muted-faint">
                <span className="h-px flex-1 bg-lilac-line" />
                {L('o', 'or')}
                <span className="h-px flex-1 bg-lilac-line" />
              </div>
              <button onClick={next} className="w-full cursor-pointer rounded-btn-lg border-[1.5px] border-[#D8D2EC] bg-white p-[13px] text-[14px] font-extrabold text-ink-soft">
                {L('Continuar con correo', 'Continue with email')}
              </button>
              <div className="mt-5 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-muted">
                <Lock size={12} stroke={2.4} />
                {L('Gratis para empezar. Sin tarjeta para el listado básico.', 'Free to start. No card needed for the basic listing.')}
              </div>
              <div className="mt-2 text-center text-[12px] font-semibold text-muted">
                {L('¿Ya tienes cuenta?', 'Already have an account?')}{' '}
                <button onClick={next} className="cursor-pointer font-extrabold text-primary-dark">{L('Inicia sesión', 'Sign in')}</button>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY */}
        {step === 'category' && (
          <>
            <h1 className="text-[22px] font-extrabold tracking-[-.02em] text-ink">{L('¿Qué tipo de negocio tienes?', 'What kind of business is it?')}</h1>
            <p className="mt-1 text-[13px] font-medium text-muted">{L('Elige la categoría principal.', 'Pick the main category.')}</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {ONB_CATS.map((c) => {
                const sel = cat === c.k;
                return (
                  <button
                    key={c.k}
                    onClick={() => {
                      setCat(c.k);
                      if (cat !== c.k) setSubs([]);
                    }}
                    className={`cursor-pointer rounded-tile border-[1.5px] bg-white p-3.5 text-left text-[13px] font-extrabold ${
                      sel ? 'border-primary text-ink' : 'border-[#ECE8F4] text-ink-soft'
                    }`}
                  >
                    {L(c.es, c.en)}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* SUBCATEGORY */}
        {step === 'subcategory' && (
          <>
            <h1 className="text-[22px] font-extrabold tracking-[-.02em] text-ink">{L('Elige tus servicios', 'Choose your services')}</h1>
            <p className="mt-1 text-[13px] font-medium text-muted">{L('Selecciona uno o más. Puedes cambiarlo después.', 'Select one or more. You can change it later.')}</p>
            <div className="mt-5 flex flex-col gap-2.5">
              {(ONB_SUBS[cat ?? ''] ?? []).map((pair, i) => {
                const sel = subs.includes(i);
                return (
                  <button
                    key={pair[0]}
                    onClick={() => setSubs(sel ? subs.filter((x) => x !== i) : [...subs, i])}
                    className={`flex cursor-pointer items-center gap-3 rounded-tile border-[1.5px] bg-white p-3.5 text-left ${
                      sel ? 'border-primary' : 'border-[#ECE8F4]'
                    }`}
                  >
                    <span className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] ${sel ? 'bg-primary text-white' : 'border-2 border-[#D9D5E6]'}`}>
                      {sel && <Check size={13} stroke={3.4} />}
                    </span>
                    <span className="text-[13.5px] font-extrabold text-ink">{L(pair[0], pair[1])}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* INFO */}
        {step === 'info' && (
          <>
            <h1 className="text-[22px] font-extrabold tracking-[-.02em] text-ink">{L('Información del negocio', 'Business information')}</h1>
            <p className="mt-1 text-[13px] font-medium text-muted">{L('Así te verán tus clientes.', 'This is what customers will see.')}</p>
            <button className="mt-5 flex w-full cursor-pointer items-center gap-3 rounded-tile border-[1.5px] border-dashed border-[#D8D2EC] bg-white p-3.5 text-left">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-btn bg-lilac">
                <Camera size={19} stroke={2.2} className="text-primary-dark" />
              </span>
              <span>
                <span className="block text-[13px] font-extrabold text-ink">{L('Agregar logo o foto', 'Add logo or photo')}</span>
                <span className="block text-[11.5px] font-semibold text-muted">{L('JPG o PNG · opcional', 'JPG or PNG · optional')}</span>
              </span>
            </button>
            <div className="mt-4 flex flex-col gap-3.5">
              {field(L('Nombre del negocio', 'Business name'), <input value={form.name} onChange={setF('name')} placeholder={L('Ej. Taquería La Esperanza', 'e.g. Taquería La Esperanza')} className={inputCls} />)}
              {field(L('Teléfono del negocio', 'Business phone'), <input value={form.bphone} onChange={setF('bphone')} placeholder="(713) 555-0100" className={inputCls} />)}
              {field(L('Dirección', 'Address'), <input value={form.addr} onChange={setF('addr')} placeholder={L('Calle, ciudad', 'Street, city')} className={inputCls} />)}
              {field(L('Descripción', 'Description'), <textarea value={form.desc} onChange={setF('desc')} rows={3} placeholder={L('Cuéntale a tus clientes qué ofreces…', 'Tell customers what you offer…')} className={`${inputCls} resize-none`} />)}
            </div>
          </>
        )}

        {/* PLAN */}
        {step === 'plan' && (
          <>
            <h1 className="text-[22px] font-extrabold tracking-[-.02em] text-ink">{L('Elige tu plan', 'Choose your plan')}</h1>
            <p className="mt-1 text-[13px] font-medium text-muted">{L('Empieza gratis o destaca con Verified Pro.', 'Start free or stand out with Verified Pro.')}</p>

            <button onClick={() => setPlan('pro')} className={`relative mt-5 w-full cursor-pointer rounded-card border-2 bg-white p-5 text-left ${isPro ? 'border-primary shadow-cta-sm' : 'border-[#ECE8F4]'}`}>
              <span className="absolute -top-2.5 left-5 rounded-full bg-amber px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[.04em] text-ink">
                {L('Recomendado', 'Recommended')}
              </span>
              <div className="flex items-center gap-2">
                <VerifiedBadge size={20} />
                <span className="text-[16px] font-extrabold text-ink">Verified Pro</span>
                <span className="ml-auto text-[18px] font-extrabold text-ink">
                  $4.99<span className="text-[11px] font-bold text-muted">/{L('mes', 'mo')}</span>
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                {[
                  L('Insignia verificada', 'Verified badge'),
                  L('Fotos y menú ilimitados', 'Unlimited photos & menu'),
                  L('Responde reseñas', 'Reply to reviews'),
                  L('Destacado en búsquedas', 'Featured in search'),
                  L('Estadísticas y ofertas', 'Analytics & offers'),
                ].map((f) => (
                  <span key={f} className="flex items-center gap-2 text-[12.5px] font-bold text-ink-soft">
                    <Check size={13} stroke={3.2} className="text-green" />
                    {f}
                  </span>
                ))}
              </div>
            </button>

            <button onClick={() => setPlan('free')} className={`mt-3 w-full cursor-pointer rounded-card border-2 bg-white p-5 text-left ${!isPro ? 'border-primary shadow-cta-sm' : 'border-[#ECE8F4]'}`}>
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-extrabold text-ink">{L('Listado Básico', 'Basic Listing')}</span>
                <span className="ml-auto text-[18px] font-extrabold text-ink">$0</span>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                {[
                  [L('Apareces en búsquedas', 'Appear in search'), true],
                  [L('Info básica y 1 foto', 'Basic info & 1 photo'), true],
                  [L('Insignia verificada', 'Verified badge'), false],
                ].map(([f, ok]) => (
                  <span key={f as string} className={`flex items-center gap-2 text-[12.5px] font-bold ${ok ? 'text-ink-soft' : 'text-muted-faint line-through'}`}>
                    {ok ? <Check size={13} stroke={3.2} className="text-green" /> : <X size={13} stroke={3.2} className="text-muted-faint" />}
                    {f}
                  </span>
                ))}
              </div>
            </button>
          </>
        )}

        {/* CHECKOUT */}
        {step === 'checkout' && (
          <>
            <h1 className="text-[22px] font-extrabold tracking-[-.02em] text-ink">{L('Pago seguro', 'Secure checkout')}</h1>
            <p className="mt-1 text-[13px] font-medium text-muted">{L('Activa Verified Pro hoy.', 'Activate Verified Pro today.')}</p>
            <div className="mt-5 flex items-center gap-3 rounded-tile bg-lilac-2 p-3.5">
              <VerifiedBadge size={22} />
              <span className="min-w-0">
                <span className="block text-[13.5px] font-extrabold text-ink">Verified Pro · $4.99/{L('mes', 'mo')}</span>
                <span className="block text-[11.5px] font-semibold text-muted">{L('Plan mensual · cancela cuando quieras', 'Monthly plan · cancel anytime')}</span>
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-3.5">
              {field(L('Número de tarjeta', 'Card number'), <input value={form.card} onChange={setF('card')} placeholder="4242 4242 4242 4242" className={inputCls} />)}
              <div className="grid grid-cols-2 gap-3">
                {field(L('Vence', 'Expires'), <input value={form.exp} onChange={setF('exp')} placeholder="MM/AA" className={inputCls} />)}
                {field('CVC', <input value={form.cvc} onChange={setF('cvc')} placeholder="123" className={inputCls} />)}
              </div>
              {field(L('Nombre en la tarjeta', 'Name on card'), <input value={form.cardName} onChange={setF('cardName')} placeholder={L('Nombre completo', 'Full name')} className={inputCls} />)}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-tile bg-white p-3.5 shadow-card">
              <span className="text-[13px] font-extrabold text-ink">{L('Total hoy', 'Total today')}</span>
              <span className="text-[16px] font-extrabold text-ink">$4.99</span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-muted">
              <Lock size={12} stroke={2.4} />
              {L('Pago cifrado y seguro', 'Encrypted, secure payment')}
            </div>
          </>
        )}

        {/* DASHBOARD (mini panel) */}
        {isDashboard && (
          <>
            <div className="flex items-center gap-2.5 pb-2 pt-1">
              <Wordmark size="sm" />
              <span className="rounded-full bg-lilac px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.04em] text-primary-dark">
                {L('Negocios', 'Business')}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <LangToggle mini />
                <button onClick={() => router.push(VIEW_PATH.comunidad)} className="cursor-pointer text-[12px] font-extrabold text-muted">
                  {L('Salir', 'Exit')}
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2.5 rounded-tile bg-green-bg p-3.5 text-[13px] font-extrabold text-green-dark">
              <Check size={17} stroke={3} />
              {L('¡Tu listado está activo! Ya apareces en ToLatino.', 'Your listing is live! You now appear on ToLatino.')}
            </div>

            <div className="mt-4 rounded-card border border-hair bg-white p-5 shadow-card">
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-extrabold text-ink">{bizName}</span>
                {bizIsPro && <VerifiedBadge size={18} />}
                <span className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.04em] ${bizIsPro ? 'bg-lilac text-primary-dark' : 'bg-lilac-2 text-muted'}`}>
                  {bizIsPro ? 'Verified Pro' : L('Listado básico', 'Basic listing')}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {[
                  [stat.views, L('Vistas', 'Views')],
                  [stat.calls, L('Llamadas', 'Calls')],
                  [stat.saves, L('Guardados', 'Saves')],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-tile bg-app p-3 text-center">
                    <div className="text-[20px] font-extrabold text-ink">{v}</div>
                    <div className="text-[11px] font-bold text-muted">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3.5 rounded-card border border-hair bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-extrabold text-ink">{L('Completa tu perfil', 'Complete your profile')}</span>
                <span className="text-[12.5px] font-extrabold text-primary-dark">{bizIsPro ? '75%' : '60%'}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-lilac-line">
                <div className="h-full rounded-full bg-primary" style={{ width: bizIsPro ? '75%' : '60%' }} />
              </div>
              <div className="mt-2 text-[12px] font-semibold text-muted">
                {bizIsPro
                  ? L('Agrega fotos y tu menú para atraer más clientes.', 'Add photos and your menu to attract more customers.')
                  : L('Sube fotos y horario para subir al 100%.', 'Add photos and hours to reach 100%.')}
              </div>
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-2.5">
              {[
                { Icon: Pencil, label: L('Editar info', 'Edit info') },
                { Icon: ImagePlus, label: L('Agregar fotos', 'Add photos') },
                { Icon: Tag, label: L('Publicar oferta', 'Post offer') },
                { Icon: Eye, label: L('Ver como cliente', 'View as customer') },
              ].map(({ Icon, label }) => (
                <button key={label} className="flex cursor-pointer items-center gap-2.5 rounded-tile border border-hair bg-white p-3.5 text-left text-[13px] font-extrabold text-ink shadow-card">
                  <Icon size={16} strokeWidth={2.2} className="text-primary-dark" />
                  {label}
                </button>
              ))}
            </div>

            {!bizIsPro ? (
              <div className="mt-3.5 rounded-card p-5 text-white shadow-band" style={{ background: 'linear-gradient(150deg,#6743E2,#8268FF)' }}>
                <div className="text-[15px] font-extrabold">{L('Hazte Verified Pro', 'Go Verified Pro')}</div>
                <div className="mt-1 text-[12.5px] font-medium leading-[1.5] text-[rgba(255,255,255,.85)]">
                  {L('Insignia verificada, fotos ilimitadas y el doble de vistas por $4.99/mes.', 'Verified badge, unlimited photos and 2× views for $4.99/mo.')}
                </div>
                <button
                  onClick={() => {
                    setPlan('pro');
                    setStep('checkout');
                  }}
                  className="mt-3 cursor-pointer rounded-btn bg-white px-4 py-2.5 text-[12.5px] font-extrabold text-primary-press"
                >
                  {L('Mejorar por $4.99/mes', 'Upgrade for $4.99/mo')}
                </button>
              </div>
            ) : (
              <div className="mt-3.5 flex items-center gap-2.5 rounded-card border border-hair bg-white p-4 shadow-card">
                <VerifiedBadge size={20} />
                <span>
                  <span className="block text-[13.5px] font-extrabold text-ink">{L('Verified Pro activo', 'Verified Pro active')}</span>
                  <span className="block text-[12px] font-semibold text-muted">{L('Tu negocio está destacado y verificado.', 'Your business is featured and verified.')}</span>
                </span>
              </div>
            )}

            <button
              onClick={() => router.push('/negocio')}
              className="mt-5 w-full cursor-pointer rounded-btn-lg bg-primary p-[13px] text-[14px] font-extrabold text-white shadow-cta"
            >
              {L('Ir a mi panel completo →', 'Go to my full dashboard →')}
            </button>
          </>
        )}
      </div>

      {/* footer CTA */}
      {!isDashboard && step !== 'auth' && (
        <div className="sticky bottom-0 border-t border-hair bg-[rgba(255,255,255,.96)] px-4 py-3 backdrop-blur-[8px]">
          <div className="mx-auto max-w-[560px]">
            <PrimaryBtn disabled={!canNext} onClick={next}>
              {nextLabel}
            </PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  );
}
