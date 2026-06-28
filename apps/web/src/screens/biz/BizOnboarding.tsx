"use client";

import { useState } from "react";
import { ChevronLeft, Store, Check, MessageSquare } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { useBiz, CATEGORY_LABELS, TIER_CAPS, type Category, type Tier } from "../../lib/biz";
import { CATEGORY_META } from "../../lib/categoryMeta";
import { PhoneFrame, PrimaryButton, GhostButton, EmptyState } from "../../components/primitives";

/**
 * Business onboarding wizard — "Alta de negocio". Matches
 * reference/screenshots/business-01-onboarding.png + business-02-onboarding-categories.png.
 * Sets `category` + `tier` in BizProvider as the owner chooses; ends in a
 * confirmation that opens the business dashboard.
 */
const STEPS = 4; // intro · category · details · plan (then confirmation)

export function BizOnboarding({ onExit, onDone }: { onExit: () => void; onDone: () => void }) {
  const { L, lang, setLang } = useI18n();
  const { category, setCategory, setTier } = useBiz();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [done, setDone] = useState(false);

  const back = () => (step === 0 ? onExit() : setStep((s) => s - 1));
  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));

  if (done) {
    return (
      <PhoneFrame>
        <Header progress={1} lang={lang} setLang={setLang} onBack={undefined} />
        <EmptyState
          title={L("¡Tu negocio está listo!", "Your business is ready!")}
          sub={L("Ya puedes administrar tu panel y empezar a vender.", "You can now manage your dashboard and start selling.")}
        />
        <div className="px-4">
          <PrimaryButton className="w-full" onClick={onDone}>
            {L("Ir a mi panel", "Go to my dashboard")}
          </PrimaryButton>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <Header progress={(step + 1) / STEPS} lang={lang} setLang={setLang} onBack={back} />
      <div className="px-4 pb-6 pt-2">
        <div className="mb-4 text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">
          {L("Alta de negocio", "Business signup")} · {L("Paso", "Step")} {step + 1} {L("de", "of")} {STEPS}
        </div>

        {step === 0 && (
          <div>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-ink text-gold">
              <Store size={26} />
            </div>
            <h1 className="text-[24px] font-extrabold leading-tight tracking-tight text-ink">
              {L("Publica tu negocio en To'Latino", "List your business on To'Latino")}
            </h1>
            <p className="mt-2 text-[13px] font-semibold leading-snug text-muted">
              {L("Crea tu cuenta de negocio y llega a miles de clientes latinos.", "Create your business account and reach thousands of Latino customers.")}
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-[14px] border border-line bg-surface px-3.5 py-3">
              <span className="text-[12px] font-extrabold text-muted">US +1</span>
              <input
                inputMode="tel"
                placeholder={L("Número de teléfono", "Phone number")}
                className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-ink outline-none placeholder:text-muted-soft"
              />
            </div>
            <PrimaryButton className="mt-3 flex w-full items-center justify-center gap-2" onClick={next}>
              <MessageSquare size={16} /> {L("Continuar con SMS", "Continue with SMS")}
            </PrimaryButton>
            <GhostButton className="mt-2 w-full" onClick={next}>
              {L("Continuar con correo", "Continue with email")}
            </GhostButton>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="text-[20px] font-extrabold tracking-tight text-ink">{L("¿Qué tipo de negocio tienes?", "What kind of business is it?")}</h1>
            <p className="mt-1 text-[12.5px] font-semibold text-muted">{L("Elige la categoría principal.", "Pick the main category.")}</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => {
                const meta = CATEGORY_META[c];
                const Icon = meta.icon;
                const on = category === c;
                return (
                  <button
                    key={c}
                    onClick={() => {
                      setCategory(c);
                      next();
                    }}
                    className={`rounded-card border bg-surface p-3 text-left ${on ? "border-primary ring-1 ring-primary" : "border-hair"}`}
                  >
                    <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-tile ${meta.tint}`}>
                      <Icon size={18} className={meta.fg} />
                    </div>
                    <div className="text-[12.5px] font-extrabold leading-tight text-ink">{L(CATEGORY_LABELS[c].es, CATEGORY_LABELS[c].en)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-[20px] font-extrabold tracking-tight text-ink">{L("Cuéntanos de tu negocio", "Tell us about your business")}</h1>
            <p className="mt-1 text-[12.5px] font-semibold text-muted">{L("Así te verán los clientes.", "This is what customers will see.")}</p>
            <label className="mt-4 block text-[12px] font-extrabold text-ink">{L("Nombre del negocio", "Business name")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={L("Ej. Taquería La Esperanza", "e.g. Taquería La Esperanza")}
              className="mt-1.5 w-full rounded-[14px] border border-line bg-surface px-3.5 py-3 text-[14px] font-semibold text-ink outline-none placeholder:text-muted-soft"
            />
            <label className="mt-4 block text-[12px] font-extrabold text-ink">{L("Descripción corta", "Short description")}</label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder={L("Ej. Tacos al pastor y birria", "e.g. Al pastor tacos & birria")}
              className="mt-1.5 w-full rounded-[14px] border border-line bg-surface px-3.5 py-3 text-[14px] font-semibold text-ink outline-none placeholder:text-muted-soft"
            />
            <PrimaryButton className="mt-5 w-full" onClick={next} disabled={!name.trim()}>
              {L("Continuar", "Continue")}
            </PrimaryButton>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-[20px] font-extrabold tracking-tight text-ink">{L("Elige tu plan", "Choose your plan")}</h1>
            <p className="mt-1 text-[12.5px] font-semibold text-muted">{L("Puedes cambiarlo cuando quieras.", "You can change it anytime.")}</p>
            <div className="mt-4 space-y-2.5">
              {(["free", "verified", "premium"] as Tier[]).map((t) => (
                <PlanCard
                  key={t}
                  tier={t}
                  onChoose={() => {
                    setTier(t);
                    setDone(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}

function Header({
  progress,
  lang,
  setLang,
  onBack,
}: {
  progress: number;
  lang: "es" | "en";
  setLang: (l: "es" | "en") => void;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 pb-2 pt-1">
      {onBack ? (
        <button onClick={onBack} className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-canvas text-ink" aria-label="Back">
          <ChevronLeft size={18} />
        </button>
      ) : null}
      <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-canvas">
        <div className="h-full rounded-pill bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <div className="flex flex-none overflow-hidden rounded-pill bg-canvas text-[11px] font-extrabold">
        <button onClick={() => setLang("es")} className={`px-2 py-1 ${lang === "es" ? "bg-primary text-white" : "text-muted"}`}>ES</button>
        <button onClick={() => setLang("en")} className={`px-2 py-1 ${lang === "en" ? "bg-primary text-white" : "text-muted"}`}>EN</button>
      </div>
    </div>
  );
}

function PlanCard({ tier, onChoose }: { tier: Tier; onChoose: () => void }) {
  const { L } = useI18n();
  const caps = TIER_CAPS[tier];
  const price = tier === "free" ? L("Gratis", "Free") : tier === "verified" ? "$19/mo" : "$49/mo";
  const perks =
    tier === "free"
      ? L("Listado básico · 3 fotos", "Basic listing · 3 photos")
      : tier === "verified"
        ? L("Insignia · módulos · 30 fotos", "Badge · modules · 30 photos")
        : L("Destacado · todo ilimitado", "Featured · everything unlimited");
  return (
    <button
      onClick={onChoose}
      className={`flex w-full items-center gap-3 rounded-card border bg-surface p-3.5 text-left ${tier === "premium" ? "border-primary" : "border-hair"}`}
    >
      <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-tile ${tier === "free" ? "bg-canvas text-muted" : "bg-primary/10 text-primary"}`}>
        <Check size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-extrabold text-ink">{L(caps.label.es, caps.label.en)}</span>
          {tier === "premium" ? <span className="rounded-pill bg-gold px-1.5 py-0.5 text-[9px] font-extrabold text-ink">PRO</span> : null}
        </div>
        <div className="text-[11.5px] font-semibold text-muted">{perks}</div>
      </div>
      <span className="flex-none text-[13px] font-extrabold text-ink">{price}</span>
    </button>
  );
}
