"use client";
/* ONB-USR-1 · Entra y ONB-USR-2 · Tú — patrón aprobado 2au (To'Latino Onboarding vecino.dc.html, variante 1a «Pasos»).
   Textos 1:1 del diseño. Pasos 3–5 (Tu zona, Lo que te gusta, El barrio) entran en el siguiente bloque. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { OnbTopBar, OnbActionBar, Icon, Tag } = UI as unknown as Record<"OnbTopBar" | "OnbActionBar" | "Icon" | "Tag", ComponentType<any>>;
type L = "es" | "en";
const NOMBRES: Record<L, string[]> = {
  es: ["Entra", "Tú", "Tu zona", "Lo que te gusta", "El barrio"],
  en: ["Sign in", "You", "Your area", "What you like", "The neighborhood"],
};
const fmt = (d: string) => {
  d = d.replace(/\D/g, "").slice(0, 10);
  return d.length < 4 ? d : d.length < 7 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};
const Clave = ({ children }: { children: ReactNode }) => (
  <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-text-muted">{children}</span>
);

async function enviar(url: string, cuerpo: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
  return (await r.json()) as { ok: boolean; mensaje?: { es: string; en: string }; espera?: number } & Record<string, unknown>;
}

export function Entrar({ inicial, destino = "/cuenta" }: { inicial: { paso: 1 | 2; telefono?: string }; destino?: string }) {
  const router = useRouter();
  const [lang, setLang] = useState<L>("es");
  const E2 = (es: string, en: string) => (lang === "es" ? es : en);
  const [paso, setPaso] = useState<1 | 2>(inicial.paso);
  const [tel, setTel] = useState(inicial.telefono?.replace(/^\+1/, "") ?? "");
  const [enviado, setEnviado] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [prueba, setPrueba] = useState<string | null>(null);
  const [reenvios, setReenvios] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [apodo, setApodo] = useState("");
  const refCodigo = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (enviado) refCodigo.current?.focus();
  }, [enviado]);

  const msg = (r: { mensaje?: { es: string; en: string } }) => setError(r.mensaje ? r.mensaje[lang] : E2("Algo falló.", "Something failed."));

  async function pedir(reenvio = false) {
    setOcupado(true); setError(null);
    const r = await enviar("/api/cuenta/codigo", { telefono: tel });
    setOcupado(false);
    if (!r.ok) return msg(r);
    setEnviado(true); setCodigo("");
    setPrueba((r.codigoPrueba as string) ?? null);
    if (reenvio) setReenvios((n) => n + 1);
  }
  async function verificar() {
    setOcupado(true); setError(null);
    const r = await enviar("/api/cuenta/verificar", { telefono: tel, codigo });
    setOcupado(false);
    if (!r.ok) return msg(r);
    if (r.nombre) return router.replace(destino); // ya tenía cuenta: entra directo
    setPaso(2);
  }
  async function guardar() {
    setOcupado(true); setError(null);
    const r = await enviar("/api/cuenta/perfil", { nombre, apellido, apodo });
    setOcupado(false);
    if (!r.ok) return msg(r);
    router.replace(destino);
  }

  const top =
    paso === 1
      ? { label: E2("ENTRA O CREA TU CUENTA", "SIGN IN OR SIGN UP"), saved: "", segments: [] }
      : {
          label: `${E2("PASO ", "STEP ")}2${E2(" DE 5 · ", " OF 5 · ")}${NOMBRES[lang][1]}`,
          saved: E2("GUARDADO", "SAVED"),
          segments: [1, 2, 3, 4, 5].map((i) => (i < 2 ? "done" : i === 2 ? "cur" : "next")),
        };
  const go =
    paso === 1
      ? enviado
        ? { label: E2("Verificar", "Verify"), disabled: codigo.length !== 6 || ocupado, onClick: () => codigo.length === 6 && verificar() }
        : { label: E2("Enviarme el código", "Text me the code"), disabled: tel.length !== 10 || ocupado, onClick: () => tel.length === 10 && pedir() }
      : { label: E2("Continuar", "Continue"), disabled: !nombre.trim() || !apellido.trim() || ocupado, onClick: () => guardar() };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-white">
      <div className="grid flex-none">
        <OnbTopBar
          label={top.label}
          saved={top.saved}
          segments={top.segments}
          onBack={() => (paso === 1 && enviado ? (setEnviado(false), setCodigo("")) : router.push("/"))}
          onExit={() => router.push("/")}
        />
      </div>
      <form
        className="flex flex-1 flex-col px-5 pb-[18px]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!go.disabled) go.onClick();
        }}
      >
        {paso === 1 && (
          <div data-pantalla="ONB-USR-1" className="flex flex-col">
            <div className="mt-[18px] flex items-center justify-between gap-3">
              <span className="flex items-center gap-[7px]">
                <Icon name="language" size={15} color="var(--tl-text-muted)" />
                <Clave>{E2("IDIOMA", "LANGUAGE")}</Clave>
              </span>
              <div className="flex gap-0.5 rounded-sm bg-fill p-[3px]">
                {(["es", "en"] as const).map((k) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() => setLang(k)}
                    className={`rounded-[9px] px-[13px] py-[7px] text-[12.5px] ${lang === k ? "bg-white font-extrabold text-ink shadow-[0_1px_3px_rgba(11,14,18,.12)]" : "font-bold text-text-3"}`}
                  >
                    {k === "es" ? "Español" : "English"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-[22px] flex flex-col gap-1.5">
              <h1 className="font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em]">{E2("Entra con tu teléfono", "Sign in with your phone")}</h1>
              <p className="text-[14px] font-medium leading-normal text-text-2">
                {E2("Te mandamos un código por texto, sin contraseñas. Si ya tienes cuenta, entras directo.", "We text you a code, no passwords. If you already have an account, you go straight in.")}
              </p>
            </div>
            <label className="mt-[18px] flex flex-col gap-[7px]">
              <Clave>{E2("TU TELÉFONO", "YOUR PHONE")}</Clave>
              <div className={`flex h-[52px] items-center gap-2.5 rounded-input border-[1.5px] bg-white px-3.5 ${!enviado && tel.length === 10 ? "border-ink" : "border-line-strong"}`}>
                <span className="text-[15px] font-bold text-text-3">+1</span>
                <input
                  value={fmt(tel)}
                  onChange={(e) => setTel(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="(570) 555-0134"
                  readOnly={enviado}
                  aria-label={E2("Tu teléfono", "Your phone")}
                  className="min-w-0 flex-1 border-0 bg-transparent text-[16px] font-semibold text-ink outline-none"
                />
                {enviado && (
                  <button type="button" onClick={() => (setEnviado(false), setCodigo(""))} className="text-[13px] font-bold text-action">
                    {E2("Cambiar", "Change")}
                  </button>
                )}
              </div>
            </label>
            {enviado && (
              <label className="mt-4 flex flex-col gap-[7px]">
                <Clave>{E2("CÓDIGO DE 6 NÚMEROS", "6-DIGIT CODE")}</Clave>
                <input
                  ref={refCodigo}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="······"
                  aria-label={E2("Código", "Code")}
                  className={`h-14 w-full rounded-input border-[1.5px] bg-white px-[18px] font-display text-[24px] font-extrabold tracking-[0.5em] text-ink outline-none ${codigo.length === 6 ? "border-ink" : "border-action"}`}
                />
                <div className="flex justify-between gap-2.5 text-[12.5px] font-semibold text-text-3">
                  <span>{E2("Lo mandamos al ", "Sent to ") + fmt(tel)}</span>
                  <button type="button" onClick={() => pedir(true)} className="font-bold text-action">
                    {reenvios ? E2("Reenviado", "Resent") : E2("Reenviar", "Resend")}
                  </button>
                </div>
                {prueba && (
                  <div data-modo-pruebas className="mt-1 flex items-center gap-2 rounded-sm border border-dashed border-danger bg-danger-tint px-3 py-2">
                    <Tag tone="danger">{E2("MODO PRUEBAS", "TEST MODE")}</Tag>
                    <span className="text-[12.5px] font-semibold text-ink">
                      {E2("Tu código es ", "Your code is ")}
                      <b className="font-mono tracking-[0.2em]">{prueba}</b>
                    </span>
                  </div>
                )}
              </label>
            )}
            <p className="mt-4 text-[12px] font-medium leading-normal text-text-3">
              {E2("Al seguir aceptas los Términos y la Privacidad de To'Latino, escritos en palabras claras. Nunca te pedimos tu estatus ni tu seguro social.", "By continuing you accept To'Latino's Terms and Privacy, written in plain words. We never ask for your status or your social security number.")}
            </p>
          </div>
        )}

        {paso === 2 && (
          <div data-pantalla="ONB-USR-2" className="flex flex-col">
            <div className="mt-[22px] flex flex-col gap-1.5">
              <h1 className="font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em]">{E2("¿Cómo te llamas?", "What's your name?")}</h1>
              <p className="text-[14px] font-medium leading-normal text-text-2">{E2("Así te ven los vecinos y los negocios.", "This is how neighbors and businesses see you.")}</p>
            </div>
            <div className="mt-[18px] grid grid-cols-2 gap-2.5">
              {[
                [E2("NOMBRE", "FIRST NAME"), nombre, setNombre, "given-name"],
                [E2("APELLIDO", "LAST NAME"), apellido, setApellido, "family-name"],
              ].map(([k, v, set, ac]) => (
                <label key={k as string} className="flex min-w-0 flex-col gap-[7px]">
                  <Clave>{k as string}</Clave>
                  <input
                    value={v as string}
                    onChange={(e) => (set as (s: string) => void)(e.target.value.slice(0, 60))}
                    autoComplete={ac as string}
                    className="h-[52px] w-full rounded-input border-[1.5px] border-line-strong bg-white px-3.5 text-[16px] font-semibold text-ink outline-none focus:border-ink"
                  />
                </label>
              ))}
            </div>
            <label className="mt-3 flex flex-col gap-[7px]">
              <span className="flex items-center gap-2">
                <Clave>{E2("¿CÓMO TE DICEN?", "WHAT DO PEOPLE CALL YOU?")}</Clave>
                <Tag tone="neutral">{E2("OPCIONAL", "OPTIONAL")}</Tag>
              </span>
              <input
                value={apodo}
                onChange={(e) => setApodo(e.target.value.slice(0, 40))}
                placeholder={E2("Ej.: Anita", "E.g. Anita")}
                autoComplete="nickname"
                className="h-[52px] w-full rounded-input border-[1.5px] border-line-strong bg-white px-3.5 text-[16px] font-semibold text-ink outline-none focus:border-ink"
              />
            </label>
          </div>
        )}

        {error && (
          <p role="alert" data-error className="mt-4 rounded-sm bg-danger-tint px-3 py-2.5 text-[13px] font-semibold text-danger">
            {error}
          </p>
        )}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
      <OnbActionBar fixed go={go} />
    </div>
  );
}
