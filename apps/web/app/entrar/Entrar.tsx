"use client";
/* ONB-USR-1 · Entra, ONB-USR-2 · Tú y, en 5c, ONB-USR-3 · Tu zona, ONB-USR-4 · Lo que te gusta, ONB-USR-5 · El barrio y la bienvenida
   (= APP-COM-BIENVENIDA) — patrón aprobado 2au (To'Latino Onboarding vecino.dc.html, variante 1a «Pasos»). Textos 1:1 del diseño.
   Los pasos 3–5 los hace quien va a Mi cuenta o a la Comunidad; quien venía de un pedido o una cita termina en el 2 («solo el
   nombre» del prototipo) y los hace cuando entre a la Comunidad. El paso 5 pide aceptar las reglas y declarar «Tengo 18 años o
   más» (nunca una fecha de nacimiento); quien declara ser menor no entra a la Comunidad. Las 100 monedas de bienvenida las acredita el libro de monedas (5g) en el paso 5. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import type { DatosBienvenida } from "@/lib/vecinos";
import { bvDatos, bvPaso } from "./acciones";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { OnbTopBar, OnbActionBar, Icon, Tag, Chip, Button } = UI as unknown as Record<"OnbTopBar" | "OnbActionBar" | "Icon" | "Tag" | "Chip" | "Button", ComponentType<any>>;
type Paso = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/* Paso 4: las 17 categorías (como en el prototipo, cortas) y lo que interesa de la Comunidad (sin El Patio: decisión G). */
const CATS: [string, string, string][] = [["NEG-FOOD", "Comida", "Food"], ["NEG-BELL", "Belleza", "Beauty"], ["NEG-AUTO", "Auto", "Auto"], ["NEG-HOGAR", "Hogar", "Home"], ["NEG-NOCHE", "Noche", "Nightlife"],
  ["NEG-MERC", "Mercados", "Markets"], ["NEG-FIESTA", "Fiestas", "Parties"], ["NEG-SALUD", "Doctores", "Doctors"], ["NEG-PRO", "Profesionales", "Professionals"], ["NEG-TIENDA", "Tiendas", "Shops"],
  ["NEG-TRANS", "Transporte", "Transport"], ["NEG-EDU", "Educación", "Education"], ["NEG-NINOS", "Niños", "Kids"], ["NEG-DEPORTE", "Deporte", "Sports"], ["NEG-FE", "Iglesias", "Churches"],
  ["NEG-INMUEBLE", "Bienes raíces", "Real estate"], ["NEG-DEALER", "Venta de autos", "Car dealers"]];
const COMS: [string, string, string][] = [["preg", "Preguntas del barrio", "Neighborhood questions"], ["rec", "Recomendaciones", "Recommendations"], ["evt", "Eventos", "Events"],
  ["nov", "Novedades de negocios", "Business updates"], ["avisos", "Avisos de la ciudad", "City notices"]];
const reglasDe = (c: string): [string, string][] => [[`Habla de ${c} y de lo que pasa aquí.`, `Talk about ${c} and what happens here.`],
  ["Recomienda por experiencia, nunca tu propio negocio. Tu negocio publica en sus Novedades.", "Recommend from experience, never your own business. Your business posts in its Updates."],
  ["Nada de ventas, rifas ni cadenas.", "No sales, raffles or chain messages."], ["No publiques teléfonos, direcciones ni fotos de otras personas sin su permiso.", "Don't post other people's phones, addresses or photos without permission."],
  ["Respeto siempre: sin insultos ni acoso.", "Respect always: no insults or harassment."], ["Una emergencia no se pregunta aquí: llama al 911.", "An emergency isn't asked here: call 911."]];
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

export function Entrar({ inicial, destino = "/cuenta", lang0 = "es", bv }: { inicial: { paso: 1 | 2 | 3 | 7; telefono?: string }; destino?: string; lang0?: L; bv?: DatosBienvenida }) {
  const router = useRouter();
  const [lang, setLang] = useState<L>(lang0);
  const E2 = (es: string, en: string) => (lang === "es" ? es : en);
  const [paso, setPaso] = useState<Paso>(inicial.paso);
  const [desde3] = useState(inicial.paso === 3);
  const [d, setD] = useState<DatosBienvenida | null>(bv ?? null);
  const [zona, setZona] = useState<string | null>(bv?.zona ?? null);
  const [fueraOn, setFueraOn] = useState(false);
  const [fuera, setFuera] = useState(bv?.fuera ?? "");
  const [cats, setCats] = useState<string[]>(bv?.cats ?? []);
  const [coms, setComs] = useState<string[]>(bv?.com ?? []);
  const [reglasOk, setReglasOk] = useState(false);
  const [mayor, setMayor] = useState(false);
  const [sigo, setSigo] = useState<string[]>([]);
  const [confMenor, setConfMenor] = useState(false);
  const [fin, setFin] = useState<{ numero: number; fundador: boolean; monedas: number } | null>(null);
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
    if (!r.ok) { setOcupado(false); return msg(r); }
    // Quien venía de un pedido, una cita u otra compra sigue ahí («solo el nombre»); los demás siguen con los pasos 3–5.
    if (!(destino === "/cuenta" || destino.startsWith("/comunidad"))) return router.replace(destino);
    const x = await bvDatos().catch(() => null);
    setOcupado(false);
    if (!x || !x.ok || !("d" in x)) return router.replace(destino);
    setD(x.d); setZona(x.d.zona); setCats(x.d.cats); setComs(x.d.com); setPaso(3);
  }
  const bi = (r: { msg?: { es: string; en: string } }) => setError(r.msg ? r.msg[lang] : E2("Algo falló.", "Something failed."));
  async function paso3() {
    setOcupado(true); setError(null);
    const r = await bvPaso({ paso: 3, zona: fueraOn ? null : zona, ciudad: d?.tieneCiudad ? null : d?.ciudad?.id, fuera: fueraOn ? fuera : "" }).catch(() => null);
    setOcupado(false);
    if (!r?.ok) return bi(r ?? {});
    setPaso(4);
  }
  async function paso4() {
    setOcupado(true); setError(null);
    const r = await bvPaso({ paso: 4, cats, com: coms }).catch(() => null);
    setOcupado(false);
    if (!r?.ok) return bi(r ?? {});
    setPaso(5);
  }
  async function paso5(adulto: boolean) {
    setOcupado(true); setError(null);
    const r = await bvPaso({ paso: 5, reglas: true, adulto, seguir: adulto ? sigo : [] }).catch(() => null);
    setOcupado(false);
    if (!r?.ok) return bi(r ?? {});
    if ("menor" in r && r.menor) return setPaso(7);
    setFin({ numero: ("numero" in r && r.numero) || d?.numero || 1, fundador: ("fundador" in r && !!r.fundador) || !!d?.fundador, monedas: ("monedas" in r && r.monedas) || 0 });
    setPaso(6);
  }
  const tg = (L: string[], k: string) => (L.includes(k) ? L.filter((x) => x !== k) : [...L, k]);
  const ciudadN = d?.ciudad ? `${d.ciudad.name}, ${d.ciudad.state}` : "";
  const nn = (n: number) => (n ? `${n} ${n === 1 ? E2("ELEGIDO", "PICKED") : E2("ELEGIDOS", "PICKED")}` : "");
  const aCom = destino.startsWith("/comunidad");

  const top =
    paso === 1
      ? { label: E2("ENTRA O CREA TU CUENTA", "SIGN IN OR SIGN UP"), saved: "", segments: [] }
      : paso >= 6
        ? { label: paso === 6 ? E2("BIENVENIDA", "WELCOME") : E2("COMUNIDAD", "COMMUNITY"), saved: "", segments: [] }
        : {
            label: `${E2("PASO ", "STEP ")}${paso}${E2(" DE 5 · ", " OF 5 · ")}${NOMBRES[lang][paso - 1]}`,
            saved: E2("GUARDADO", "SAVED"),
            segments: [1, 2, 3, 4, 5].map((i) => (i < paso ? "done" : i === paso ? "cur" : "next")),
          };
  const go =
    paso === 1
      ? enviado
        ? { label: E2("Verificar", "Verify"), disabled: codigo.length !== 6 || ocupado, onClick: () => codigo.length === 6 && verificar() }
        : { label: E2("Enviarme el código", "Text me the code"), disabled: tel.length !== 10 || ocupado, onClick: () => tel.length === 10 && pedir() }
      : paso === 2
        ? { label: E2("Continuar", "Continue"), disabled: !nombre.trim() || !apellido.trim() || ocupado, onClick: () => guardar() }
        : paso === 3
          ? fueraOn
            ? { label: E2("Avísame cuando lleguen", "Let me know when you arrive"), disabled: fuera.trim().length < 3 || ocupado, onClick: () => fuera.trim().length >= 3 && paso3() }
            : { label: E2("Continuar", "Continue"), disabled: ocupado, onClick: () => paso3() }
          : paso === 4
            ? { label: E2("Continuar", "Continue"), disabled: ocupado, onClick: () => paso4() }
            : paso === 5
              ? { label: E2("Entrar a To'Latino", "Enter To'Latino"), disabled: !reglasOk || !mayor || ocupado, onClick: () => reglasOk && mayor && paso5(true) }
              : paso === 6
                ? { label: aCom ? E2("Entrar a Comunidad", "Go to Community") : E2("Ir a Mi cuenta", "Go to My account"), disabled: false, onClick: () => router.replace(destino) }
                : { label: E2("Ir a Mi cuenta", "Go to My account"), disabled: false, onClick: () => router.replace("/cuenta") };
  const alt = paso === 3 && fueraOn ? { label: E2("Seguir con ", "Continue with ") + (d?.ciudad?.name ?? ""), onClick: () => setFueraOn(false) }
    : paso === 3 || paso === 4 ? { label: E2("Saltar por ahora", "Skip for now"), onClick: () => setPaso((paso + 1) as Paso) } : undefined;
  const atras = () => {
    if (paso === 1 && enviado) return (setEnviado(false), setCodigo(""));
    if (paso === 3 && fueraOn) return setFueraOn(false);
    if (paso === 4 || paso === 5) return setPaso((paso - 1) as Paso);
    if (paso === 3 && desde3) return router.push("/");
    if (paso === 3) return router.replace(destino);
    router.push("/");
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-white">
      <div className="grid flex-none">
        <OnbTopBar
          label={top.label}
          saved={top.saved}
          segments={top.segments}
          onBack={atras}
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

        {paso === 3 && d && !fueraOn && (
          <div data-pantalla="ONB-USR-3" className="flex flex-col">
            <div className="mt-[22px] flex flex-col gap-1.5">
              <h1 className="font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em]">{E2("¿Por dónde vives?", "Where do you live?")}</h1>
              <p className="text-[14px] font-medium leading-normal text-text-2">{E2("Te mostramos primero lo que está cerca.", "We'll show you what's close first.")}</p>
            </div>
            <div className="mt-[18px] flex items-center gap-3 rounded-[16px] bg-paper p-3.5">
              <span className="grid size-10 flex-none place-items-center rounded-[12px] bg-ink"><Icon name="pin" size={18} color="var(--tl-white)" /></span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[16px] font-extrabold tracking-[-0.02em]">{ciudadN}</div>
                <div className="mt-[3px] text-[12.5px] font-medium text-text-3">{E2("Tu ciudad · se cambia cada 30 días", "Your city · changes every 30 days")}</div>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2.5">
              <Clave>{zona ? `${E2("TU ZONA · ", "YOUR AREA · ")}${(d.zonas.find((z) => z.id === zona)?.name[lang] ?? "").toUpperCase()}` : E2("ELIGE TU ZONA", "PICK YOUR AREA")}</Clave>
              <div className="flex flex-wrap gap-[7px]">
                {d.zonas.map((z) => <Chip key={z.id} variant={zona === z.id ? "selected" : "filter"} onClick={() => setZona(zona === z.id ? null : z.id)}>{z.name[lang]}</Chip>)}
              </div>
              <p className="text-[12px] font-medium leading-normal text-text-3">{E2("En la Comunidad tus publicaciones dicen tu zona, nunca tu dirección.", "In the Community your posts show your area, never your address.")}</p>
            </div>
            <button type="button" onClick={() => setFueraOn(true)} className="mt-[18px] flex items-center gap-1.5 self-start text-[13.5px] font-bold text-action">
              {E2(`No vivo en ${d.ciudad?.name ?? ""}`, `I don't live in ${d.ciudad?.name ?? ""}`)}<Icon name="chevronRight" size={14} color="var(--tl-action)" strokeWidth={2} />
            </button>
          </div>
        )}
        {paso === 3 && d && fueraOn && (
          <div data-pantalla="ONB-USR-3 · fuera" className="flex flex-col">
            <div className="mt-[22px] flex flex-col gap-1.5">
              <h1 className="font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em]">{E2("Aún no llegamos a tu ciudad", "We're not in your city yet")}</h1>
              <p className="text-[14px] font-medium leading-normal text-text-2">{E2(`Dinos dónde vives y te avisamos cuando abramos ahí. Mientras, puedes usar ${d.ciudad?.name ?? ""}.`, `Tell us where you live and we'll let you know when we open there. Meanwhile, you can use ${d.ciudad?.name ?? ""}.`)}</p>
            </div>
            <label className="mt-[18px] flex flex-col gap-[7px]">
              <Clave>{E2("TU CIUDAD", "YOUR CITY")}</Clave>
              <input value={fuera} onChange={(e) => setFuera(e.target.value.slice(0, 40))} placeholder="Allentown, PA" aria-label={E2("Tu ciudad", "Your city")}
                className="h-[52px] w-full rounded-input border-[1.5px] border-line-strong bg-white px-3.5 text-[16px] font-semibold text-ink outline-none focus:border-ink" />
            </label>
          </div>
        )}
        {paso === 4 && (
          <div data-pantalla="ONB-USR-4" className="flex flex-col">
            <div className="mt-[22px] flex flex-col gap-1.5">
              <h1 className="font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em]">{E2("¿Qué te gusta?", "What do you like?")}</h1>
              <p className="text-[14px] font-medium leading-normal text-text-2">{E2("Elige lo que quieras. Con esto armamos tu inicio.", "Pick anything. We'll build your home with it.")}</p>
            </div>
            <div className="mt-[18px] flex flex-col gap-2.5">
              <div className="flex justify-between"><Clave>{E2("NEGOCIOS", "BUSINESSES")}</Clave><span className="font-mono text-[10px] font-bold tracking-[0.14em] text-action">{nn(cats.length)}</span></div>
              <div className="flex flex-wrap gap-[7px]">{CATS.map(([k, es, en]) => <Chip key={k} variant={cats.includes(k) ? "selected" : "filter"} onClick={() => setCats(tg(cats, k))}>{lang === "es" ? es : en}</Chip>)}</div>
            </div>
            <div className="mt-5 flex flex-col gap-2.5">
              <div className="flex justify-between"><Clave>{E2("EN COMUNIDAD", "IN COMMUNITY")}</Clave><span className="font-mono text-[10px] font-bold tracking-[0.14em] text-action">{nn(coms.length)}</span></div>
              <div className="flex flex-wrap gap-[7px]">{COMS.map(([k, es, en]) => <Chip key={k} variant={coms.includes(k) ? "selected" : "filter"} onClick={() => setComs(tg(coms, k))}>{lang === "es" ? es : en}</Chip>)}</div>
            </div>
          </div>
        )}
        {paso === 5 && d && (
          <div data-pantalla="ONB-USR-5" className="flex flex-col">
            <h1 className="mt-5 font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em]">{E2("Las reglas del barrio", "Neighborhood rules")}</h1>
            <div className="mt-3 flex flex-col">
              {reglasDe(d.ciudad?.name ?? "").map(([es, en], i) => (
                <div key={i} className={`flex items-start gap-[11px] py-1.5 ${i ? "border-t border-line" : ""}`}>
                  <span className="grid size-[22px] flex-none place-items-center rounded-[8px] bg-paper font-display text-[11px] font-extrabold">{i + 1}</span>
                  <span className="text-[13px] font-semibold leading-[1.45]">{lang === "es" ? es : en}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2.5 rounded-[14px] bg-action-tint px-3 py-[11px]">
              <Icon name="shield" size={18} color="var(--tl-action)" />
              <span className="text-[13px] font-bold leading-[1.4]">{E2("Empiezas como Recluta · ya puedes publicar, comentar y votar.", "You start as Recruit · you can already post, comment and vote.")}</span>
            </div>
            {d.sugeridos.length > 0 && (
              <div className="mt-4 flex flex-col gap-3">
                <Clave>{E2("VECINOS QUE MÁS AYUDAN · OPCIONAL", "NEIGHBORS WHO HELP MOST · OPTIONAL")}</Clave>
                {d.sugeridos.map((v) => (
                  <div key={v.id} className="flex items-center gap-[11px]">
                    <span className="grid size-10 flex-none place-items-center rounded-full font-display text-[13px] font-extrabold" style={{ backgroundColor: "var(--tl-desk)", backgroundImage: v.foto ? `url("${v.foto}")` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>{v.foto ? "" : v.ini}</span>
                    <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{v.nombre}</div><div className="mt-[3px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-text-3">{v.lugar.toUpperCase()}</div></div>
                    <Button variant={sigo.includes(v.id) ? "secondary" : "primary"} size="sm" onClick={() => setSigo(tg(sigo, v.id))}>{sigo.includes(v.id) ? E2("Siguiendo", "Following") : E2("Seguir", "Follow")}</Button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 flex flex-col gap-2.5">
              {([[reglasOk, setReglasOk, E2("Acepto las reglas del barrio", "I accept the neighborhood rules")], [mayor, setMayor, E2("Tengo 18 años o más", "I am 18 or older")]] as [boolean, (b: boolean) => void, string][]).map(([on, set, t]) => (
                <button type="button" key={t} role="checkbox" aria-checked={on} onClick={() => set(!on)} className="flex items-center gap-[11px] text-left">
                  <span className={`grid size-[22px] flex-none place-items-center rounded-[7px] border-[1.5px] ${on ? "border-ink bg-ink" : "border-line-strong bg-white"}`}>{on && <Icon name="check" size={14} color="var(--tl-white)" strokeWidth={2.4} />}</span>
                  <span className="text-[13.5px] font-bold">{t}</span>
                </button>
              ))}
              <p className="text-[12px] font-medium leading-normal text-text-3">{E2("No te pedimos tu fecha de nacimiento: solo que nos digas si tienes 18 años o más. La Comunidad y los mensajes entre vecinos son para personas adultas.", "We don't ask for your date of birth: just tell us if you are 18 or older. The Community and messages between neighbors are for adults.")}</p>
              {!confMenor ? (
                <button type="button" onClick={() => setConfMenor(true)} className="self-start text-[13px] font-bold text-action">{E2("Tengo menos de 18 años", "I am under 18")}</button>
              ) : (
                <div className="flex flex-col gap-2 rounded-[14px] bg-paper p-3">
                  <span className="text-[13px] font-semibold leading-[1.45]">{E2("Si tienes menos de 18 años no puedes entrar a la Comunidad. Puedes usar To'Latino para buscar negocios, pedir y reservar.", "If you are under 18 you can't join the Community. You can use To'Latino to find businesses, order and book.")}</span>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setConfMenor(false)}>{E2("Volver", "Back")}</Button>
                    <Button variant="primary" size="sm" disabled={ocupado || !reglasOk} onClick={() => reglasOk && paso5(false)}>{E2("Confirmar que tengo menos de 18", "Confirm I am under 18")}</Button>
                  </div>
                  {!reglasOk && <span className="text-[12px] font-medium text-text-3">{E2("Primero acepta las reglas del barrio.", "First accept the neighborhood rules.")}</span>}
                </div>
              )}
            </div>
          </div>
        )}
        {paso === 6 && (
          <div data-pantalla="ONB-USR · bienvenida" className="flex flex-col">
            <div className="mt-14 flex flex-col items-start gap-3">
              <span className="grid size-[76px] place-items-center rounded-full border-[2.5px] border-signal bg-ink font-display text-[24px] font-extrabold text-white" style={d?.foto ? { backgroundImage: `url("${d.foto}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>{d?.foto ? "" : d?.ini}</span>
              <span className="rounded-[8px] bg-ink px-2.5 py-1.5 font-mono text-[9.5px] font-bold tracking-[0.14em] text-signal">
                {`${fin?.fundador ? E2("FUNDADORES · #", "FOUNDERS · #") : E2("N.º ", "NO. ")}${(fin?.numero ?? 1).toLocaleString("en-US")}${E2(" · RECLUTA", " · RECRUIT")}`}
              </span>
              <h1 className="font-display text-[28px] font-extrabold leading-[1.12] tracking-[-0.04em]">{E2(`Bienvenida a ${d?.ciudad?.name ?? "To'Latino"}, ${d?.nombre || "vecino"}.`, `Welcome to ${d?.ciudad?.name ?? "To'Latino"}, ${d?.nombre || "neighbor"}.`)}</h1>
              <p className="text-[14px] font-medium leading-normal text-text-2">{fin?.monedas ? E2(`Empiezas como Recluta y con ${fin.monedas} monedas para los cupones de los negocios del barrio. Se ganan, nunca se compran: sin valor en dinero.`, `You start as Recruit with ${fin.monedas} coins for neighborhood business coupons. Earned, never bought: no cash value.`) : E2("Empiezas como Recluta.", "You start as Recruit.")}</p>
            </div>
            <div className="mt-[22px] flex flex-col gap-2">
              <Clave>{E2("PARA EMPEZAR", "TO START")}</Clave>
              {([["bubble", E2("La conversación de tu ciudad", "Your city's conversation"), E2("Pregunta, recomienda y vota", "Ask, recommend and vote"), "/comunidad"],
                ["star", E2("Recomienda un negocio", "Recommend a business"), E2("Cuenta a quién vas y por qué", "Say who you go to and why"), "/comunidad/nuevo?k=recomendacion"],
                ["users", E2("Mi perfil", "My profile"), E2("Agrega tu presentación", "Add your intro"), "/comunidad/v/yo"]] as const).map(([ic, t, sub, h]) => (
                <button type="button" key={h} onClick={() => router.push(h)} className="flex items-center gap-3 rounded-[16px] bg-paper p-3 text-left hover:bg-paper-2">
                  <span className="grid size-10 flex-none place-items-center rounded-[12px] bg-white"><Icon name={ic} size={18} /></span>
                  <div className="min-w-0 flex-1"><div className="text-[14px] font-bold">{t}</div><div className="mt-0.5 text-[12px] font-medium text-text-3">{sub}</div></div>
                  <Icon name="chevronRight" size={15} color="var(--tl-text-muted)" />
                </button>
              ))}
            </div>
          </div>
        )}
        {paso === 7 && (
          <div data-pantalla="ONB-USR · menor" className="flex flex-col">
            <div className="mt-14 flex flex-col items-start gap-3">
              <span className="grid size-14 place-items-center rounded-[16px] bg-paper"><Icon name="shield" size={24} /></span>
              <h1 className="font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em]">{E2("La Comunidad es para personas de 18 años o más", "The Community is for people 18 or older")}</h1>
              <p className="text-[14px] font-medium leading-normal text-text-2">{E2("Nos dijiste que tienes menos de 18 años, así que no verás la Comunidad ni los mensajes entre vecinos. Puedes seguir usando To'Latino para buscar negocios, pedir y reservar.", "You told us you are under 18, so you won't see the Community or messages between neighbors. You can keep using To'Latino to find businesses, order and book.")}</p>
              <p className="text-[12.5px] font-medium leading-normal text-text-3">{E2("Si te equivocaste, escríbenos desde Ayuda en Mi cuenta.", "If you made a mistake, write to us from Help in My account.")}</p>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" data-error className="mt-4 rounded-sm bg-danger-tint px-3 py-2.5 text-[13px] font-semibold text-danger">
            {error}
          </p>
        )}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
      <OnbActionBar fixed go={go} alt={alt} />
    </div>
  );
}
