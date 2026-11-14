"use client";
/* 9h · APP-LANDING-PRE · la landing de acceso anticipado (fase9-apertura.md §4 9h, §5 «Landing», §6 #14; memoria del diseño, Coming Soon v3 — su .dc.html no
   está en el repo: hueco #1, compuesta con piezas del sistema y anotada en docs/REVISION.md). Móvil primero, fondo claro, una sola acción arriba (código
   postal + teléfono) y la barra fija abajo en el teléfono cuando el formulario no se ve; sin cuenta regresiva ni fecha (v3). En escritorio la vitrina va a
   la derecha. Las dos frases de §1c son líneas fijas (textos-fijas, con candado); lo demás sale del CMS (APP-LANDING-PRE). Estados: sin señal (el envío
   falla y lo dice), ya anotada, código vencido o incorrecto, de fuera de las cinco («Pide tu ciudad»), con negocio («Publica tu negocio»). */
import * as UI from "@tolatino/ui";
import { Wordmark } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { MODOS, type Modo } from "@/lib/crecimiento/comun";
import type { Lugar } from "@/lib/crecimiento/lista";
import { cambiarIdioma } from "../(app)/acciones";
import { PieLegal } from "../(app)/_legal/PieLegal";
import { listaCodigo, listaConSesion, listaEntrar, listaQuitar } from "./acciones";
import type { DatosLanding } from "./datos";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Button, Chip, Icon, Tag, BusinessCard, Eyebrow, InfoCard } = UI as unknown as Record<"Button" | "Chip" | "Icon" | "Tag" | "BusinessCard" | "Eyebrow" | "InfoCard", ComponentType<any>>;
const fmt = (d: string) => { d = d.replace(/\D/g, "").slice(0, 10); return d.length < 4 ? d : d.length < 7 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`; };
const pon = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => (v[k] != null ? String(v[k]) : `{${k}}`));
const MODO_T: Record<Modo, string> = { local: "t0", casa: "t1", domicilio: "t2", encargo: "t3", tiempo_libre: "t4" };

function useDesk() {
  const [d, setD] = useState(false);
  useEffect(() => { const m = window.matchMedia("(min-width: 1024px)"); const f = () => setD(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  return d;
}
const Clave = ({ children }: { children: ReactNode }) => <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-text-muted">{children}</span>;
const Titulo = ({ children, id }: { children: ReactNode; id?: string }) => <h2 id={id} className="font-display text-[24px] font-extrabold leading-[1.15] tracking-[-0.035em] lg:text-[30px]">{children}</h2>;

export function Landing({ d }: { d: DatosLanding }) {
  const router = useRouter(), desk = useDesk(), t = d.t, en = d.lang === "en";
  const [zip, setZip] = useState(d.lugar?.zip ?? ""), [tel, setTel] = useState(""), [codigo, setCodigo] = useState("");
  const [enviado, setEnviado] = useState(false), [prueba, setPrueba] = useState<string | null>(null), [reenvios, setReenvios] = useState(0);
  const [neg, setNeg] = useState(false), [modo, setModo] = useState<Modo | null>(null), [nombre, setNombre] = useState("");
  const [lugar, setLugar] = useState<Lugar | null>(d.lugar), [ya, setYa] = useState(!!d.lugar), [quitado, setQuitado] = useState(false);
  const [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false), [toast, setToast] = useState<string | null>(null);
  const [caso, setCaso] = useState(0), [fijo, setFijo] = useState(false), [verForm, setVerForm] = useState(true);
  const form = useRefDiv(), refCodigo = useRef<HTMLInputElement>(null);
  const msg = (m: { es: string; en: string }) => (en ? m.en : m.es);

  // La vitrina rota cada 3,8 s (Coming Soon v3) hasta que la persona elige un caso.
  useEffect(() => { if (fijo) return; const x = setInterval(() => setCaso((c) => (c + 1) % 6), 3800); return () => clearInterval(x); }, [fijo]);
  // La barra fija del teléfono sale cuando el formulario no se ve.
  const nodoForm = form.current;
  useEffect(() => {
    if (!nodoForm || typeof IntersectionObserver === "undefined") return;
    const o = new IntersectionObserver(([e]) => setVerForm(!!e?.isIntersecting), { threshold: 0.05 }); o.observe(nodoForm); return () => o.disconnect();
  }, [nodoForm]);
  useEffect(() => { if (!toast) return; const x = setTimeout(() => setToast(null), 2600); return () => clearTimeout(x); }, [toast]);
  useEffect(() => { if (enviado) refCodigo.current?.focus(); }, [enviado]);

  const irForm = () => form.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  const negocio = () => (neg ? { modo, nombre: nombre.trim() || null } : null);
  const zipOk = /^\d{5}$/.test(zip), telOk = tel.length === 10;
  const correr = async (f: () => Promise<void>) => { if (busy) return; setBusy(true); setErr(null); try { await f(); } catch { setErr(en ? "No connection. Check your signal and try again." : "Sin conexión. Revisa tu señal e inténtalo otra vez."); } finally { setBusy(false); } };
  const pedir = (otra = false) => correr(async () => {
    if (!zipOk) { setErr(t.errZip!); return; }
    if (!telOk) { setErr(t.errTel!); return; }
    const r = await listaCodigo(zip, tel);
    if (!r.ok) { setErr(msg(r.msg)); return; }
    setEnviado(true); setPrueba(("codigoPrueba" in r ? r.codigoPrueba : null) ?? null); if (otra) setReenvios((n) => n + 1);
  });
  const entrar = () => correr(async () => {
    const r = await listaEntrar({ zip, tel, codigo, negocio: negocio(), lang: d.lang });
    if (!r.ok) { setErr(msg(r.msg)); return; }
    setLugar(r.lugar ?? null); setYa(!!r.ya); setQuitado(false); router.refresh();
  });
  const conSesion = () => correr(async () => {
    if (!zipOk) { setErr(t.errZip!); return; }
    const r = await listaConSesion({ zip, negocio: negocio(), lang: d.lang });
    if (!r.ok) { setErr(msg(r.msg)); return; }
    setLugar(r.lugar ?? null); setYa(!!r.ya); setQuitado(false);
  });
  const quitar = () => correr(async () => { const r = await listaQuitar(); if (!r.ok) { setErr(msg(r.msg)); return; } setLugar(null); setYa(false); setQuitado(true); setEnviado(false); setCodigo(""); });
  const idioma = async (l: "es" | "en") => { await cambiarIdioma(l); router.refresh(); };
  const copiar = async () => { try { await navigator.clipboard.writeText(d.url); setToast(t.copiado!); } catch { setToast(d.url); } };

  /* ── El formulario (o el lugar en la lista) ── */
  const resultado = lugar ? (
    <div data-lista-lugar={lugar.n} className="flex flex-col gap-3">
      <Tag tone="signal">{lugar.ciudad ? lugar.ciudad.name.toUpperCase() : `CP ${lugar.zip}`}</Tag>
      <h2 className="font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em]">{pon(ya ? t.listaYa! : t.listaT!, { n: lugar.n })}</h2>
      {lugar.ciudad ? <p className="text-[14px] font-medium leading-normal text-text-2">{pon(t.listaCiudad!, { ciudad: lugar.ciudad.name })}</p>
        : <><p className="text-[15px] font-bold">{pon(t.fueraT!, { zip: lugar.zip })}</p><p className="text-[14px] font-medium leading-normal text-text-2">{t.fuera}</p></>}
      {lugar.ciudad && lugar.fundadorVecino ? <p data-fundador={lugar.fundadorVecino} className="flex items-center gap-2 text-[13.5px] font-bold"><Icon name="star" size={16} />{pon(t.fundador!, { n: lugar.fundadorVecino, meta: lugar.metaVecinos, ciudad: lugar.ciudad.name })}</p> : null}
      {lugar.ciudad && lugar.tieneNegocio ? (
        <div data-lista-negocio className="flex flex-col gap-2.5 rounded-[16px] border border-line bg-paper p-3.5">
          {lugar.fundadorNegocio ? <p className="text-[13.5px] font-bold">{pon(t.fundadorNeg!, { n: lugar.fundadorNegocio, meta: lugar.metaNegocios, ciudad: lugar.ciudad.name })}</p> : null}
          <p className="text-[13.5px] font-medium leading-normal text-text-2">{pon(lugar.nombreNegocio ? t.negocioListo! : t.negocioListoSin!, { nombre: lugar.nombreNegocio ?? "", ciudad: lugar.ciudad.name })}</p>
          <div className="flex"><Button icon="store" onClick={() => router.push("/publica")}>{t.publicar}</Button></div>
        </div>) : null}
      <button type="button" onClick={() => void quitar()} className="self-start text-[13px] font-bold text-text-3 underline">{t.quitar}</button>
    </div>
  ) : null;

  const formulario = (
    <div className="flex flex-col gap-3.5">
      <Clave>{t.formK}</Clave>
      {quitado ? <p role="status" className="text-[13.5px] font-semibold text-text-2">{t.quitado}</p> : null}
      <label className="flex flex-col gap-[7px]">
        <Clave>{t.zipK}</Clave>
        <input value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" autoComplete="postal-code" placeholder="18201" readOnly={enviado} aria-label={t.zipK}
          className={`h-[52px] rounded-input border-[1.5px] bg-white px-3.5 text-[16px] font-semibold text-ink outline-none ${zipOk ? "border-ink" : "border-line-strong"}`} />
      </label>
      {!d.conSesion ? (
        <label className="flex flex-col gap-[7px]">
          <Clave>{t.telK}</Clave>
          <div className={`flex h-[52px] items-center gap-2.5 rounded-input border-[1.5px] bg-white px-3.5 ${!enviado && telOk ? "border-ink" : "border-line-strong"}`}>
            <span className="text-[15px] font-bold text-text-3">+1</span>
            <input value={fmt(tel)} onChange={(e) => setTel(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" autoComplete="tel-national" placeholder="(570) 555-0134" readOnly={enviado} aria-label={t.telK}
              className="min-w-0 flex-1 border-0 bg-transparent text-[16px] font-semibold text-ink outline-none" />
            {enviado ? <button type="button" onClick={() => { setEnviado(false); setCodigo(""); setPrueba(null); }} className="text-[13px] font-bold text-action">{t.cambiar}</button> : null}
          </div>
          <span data-linea-fija="landingTel" className="text-[12.5px] font-semibold leading-normal text-text-2">{d.fijas.landingTel}</span>
        </label>) : null}
      <div role="switch" aria-checked={neg} tabIndex={0} onClick={() => setNeg(!neg)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setNeg(!neg); } }}
        className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-line bg-white px-3.5 py-3">
        <Icon name="store" size={18} />
        <span className="flex min-w-0 flex-1 flex-col"><b className="text-[14px]">{t.negocioTg}</b><span className="text-[12.5px] font-medium text-text-3">{t.negocioSub}</span></span>
        <span aria-hidden style={{ width: 42, height: 24, borderRadius: 99, background: neg ? "var(--tl-ink)" : "rgba(11,14,18,.18)", position: "relative", flex: "none" }}>
          <span style={{ position: "absolute", top: 3, left: 3, width: 18, height: 18, borderRadius: 99, background: "var(--tl-white)", transform: `translateX(${neg ? 18 : 0}px)`, transition: "transform .2s" }} /></span>
      </div>
      {neg ? (
        <div data-landing-negocio className="flex flex-col gap-2.5">
          <Clave>{t.comoK}</Clave>
          <div className="flex flex-wrap gap-1.5">{MODOS.map((m) => <Chip key={m} variant={modo === m ? "selected" : "filter"} onClick={() => setModo(modo === m ? null : m)}>{t[MODO_T[m]]}</Chip>)}</div>
          <label className="flex flex-col gap-[7px]"><Clave>{t.nombreK}</Clave>
            <input value={nombre} onChange={(e) => setNombre(e.target.value.slice(0, 60))} aria-label={t.nombreK} className="h-[48px] rounded-input border-[1.5px] border-line-strong bg-white px-3.5 text-[15px] font-semibold text-ink outline-none" /></label>
        </div>) : null}
      {enviado && !d.conSesion ? (
        <label className="flex flex-col gap-[7px]">
          <Clave>{t.codigoK}</Clave>
          <input ref={refCodigo} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="······" aria-label={t.codigoK}
            className={`h-14 w-full rounded-input border-[1.5px] bg-white px-[18px] font-display text-[24px] font-extrabold tracking-[0.5em] text-ink outline-none ${codigo.length === 6 ? "border-ink" : "border-action"}`} />
          <div className="flex justify-between gap-2.5 text-[12.5px] font-semibold text-text-3">
            <span>{pon(t.enviado!, { tel: fmt(tel) })}</span>
            <button type="button" onClick={() => void pedir(true)} className="font-bold text-action">{reenvios ? `${t.reenviar} · ${reenvios}` : t.reenviar}</button>
          </div>
          {prueba ? (
            <div data-modo-pruebas className="mt-1 flex items-center gap-2 rounded-sm border border-dashed border-danger bg-danger-tint px-3 py-2">
              <Tag tone="danger">{t.pruebas}</Tag><span className="text-[12.5px] font-semibold text-ink">{t.tuCodigo} <b className="font-mono tracking-[0.2em]">{prueba}</b></span>
            </div>) : null}
        </label>) : null}
      {err ? <p role="alert" className="text-[13px] font-semibold text-danger">{err}</p> : null}
      <div className="flex">
        {d.conSesion ? <Button block icon="bell" disabled={!zipOk || busy} onClick={() => void conSesion()}>{t.anotarmeYa}</Button>
          : enviado ? <Button block icon="check" disabled={codigo.length !== 6 || busy} onClick={() => void entrar()}>{t.anotarme}</Button>
            : <Button block icon="phone" disabled={!zipOk || !telOk || busy} onClick={() => void pedir()}>{t.pedir}</Button>}
      </div>
      <p className="text-[12px] font-medium leading-normal text-text-3">{t.legal}</p>
    </div>
  );

  /* ── La vitrina que rota ── */
  const vitrina = (
    <div data-vitrina={caso} className="flex flex-col gap-3">
      <Eyebrow>{t.vitrinaK}</Eyebrow>
      <p className="font-display text-[22px] font-extrabold leading-[1.2] tracking-[-0.03em]" aria-live="polite">{t[`q${caso}`]}</p>
      <BusinessCard plan="free" name={t[`n${caso}`]} meta={t[`m${caso}`]} rating="" reviews={0} reviewsNote={t.ejemplo} contactLabel={t.avisame} contactIcon="bell" onContact={irForm} />
      <div className="flex flex-wrap gap-1.5">{[0, 1, 2, 3, 4, 5].map((i) => <Chip key={i} variant={caso === i ? "selected" : "filter"} onClick={() => { setCaso(i); setFijo(true); }}>{t[`n${i}`]}</Chip>)}</div>
    </div>
  );

  const seccion = "mx-auto w-full max-w-[1180px] px-5 lg:px-8";
  return (
    <div data-pantalla="APP-LANDING-PRE" data-screen-label="APP-LANDING-PRE" className="min-h-dvh bg-white text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className={`${seccion} flex h-[60px] items-center justify-between gap-3`}>
          <Wordmark size={desk ? 24 : 21} />
          <div className="flex items-center gap-2">
            {desk ? <Button size="md" variant="secondary" icon="bell" onClick={irForm}>{t.avisame}</Button> : null}
            <div className="flex gap-0.5 rounded-[11px] bg-paper p-[3px]">
              {(["es", "en"] as const).map((k) => (
                <button key={k} type="button" onClick={() => void idioma(k)} aria-pressed={d.lang === k}
                  className={`rounded-[9px] px-[11px] py-[6px] text-[12px] ${d.lang === k ? "bg-white font-extrabold text-ink shadow-[0_1px_3px_rgba(11,14,18,.12)]" : "font-bold text-text-3"}`}>{k === "es" ? "Español" : "English"}</button>))}
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className={`${seccion} grid gap-8 pb-10 pt-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] lg:gap-14 lg:pb-16 lg:pt-14`}>
          <div className="flex flex-col gap-5">
            <Eyebrow>{d.abre ? pon(t.abre!, { fecha: d.abre.toUpperCase() }) : t.eyebrow}</Eyebrow>
            <h1 data-linea-fija="landing" className="font-display text-[34px] font-extrabold leading-[1.06] tracking-[-0.045em] lg:text-[52px]">{d.fijas.landing}</h1>
            <p className="max-w-[560px] text-[15.5px] font-medium leading-[1.55] text-text-2">{t.sub}</p>
            <div className="flex flex-wrap gap-1.5">{["t0", "t1", "t2", "t3", "t4"].map((k) => <Chip key={k}>{t[k]}</Chip>)}</div>
            <div ref={form.set} id="avisame" data-landing-form className="rounded-[22px] border border-line bg-white p-4 shadow-[0_18px_40px_-30px_rgba(11,14,18,.5)] lg:p-5">
              {resultado ?? formulario}
            </div>
            {d.total > 0 ? <p className="flex items-center gap-2 text-[13px] font-bold text-text-2"><Icon name="users" size={16} />{pon(t.esperan!, { n: d.total.toLocaleString(en ? "en-US" : "es-US") })}</p> : null}
          </div>
          <div className="flex flex-col gap-4 lg:pt-10">{vitrina}</div>
        </section>

        <section className="bg-paper py-10 lg:py-14">
          <div className={`${seccion} flex flex-col gap-4`}>
            <Titulo>{t.cabeT}</Titulo>
            <p className="max-w-[640px] text-[15px] font-medium leading-[1.55] text-text-2">{t.cabeS}</p>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">{["t0", "t1", "t2", "t3", "t4", "t5"].map((k) => <InfoCard key={k} padding="14px 13px"><b className="text-[14px]">{t[k]}</b></InfoCard>)}</div>
            <Clave>{t.buscasK}</Clave>
            <div className="flex flex-wrap gap-1.5">{Array.from({ length: 12 }, (_, i) => <Chip key={i}>{t[`b${i}`]}</Chip>)}</div>
          </div>
        </section>

        <section className={`${seccion} flex flex-col gap-4 py-10 lg:py-14`}>
          <Titulo>{t.vieneT}</Titulo>
          <div className="grid gap-2.5 lg:grid-cols-3">
            {(["bag", "calendar", "ticket", "chat", "language", "shield"] as const).map((ic, i) => (
              <InfoCard key={i}><div className="flex items-start gap-3"><Icon name={ic} size={20} /><span className="flex flex-col gap-1"><b className="text-[14.5px]">{t[`v${i}`]}</b><span className="text-[13px] font-medium leading-normal text-text-2">{t[`v${i}s`]}</span></span></div></InfoCard>))}
          </div>
        </section>

        <section className="bg-paper py-10 lg:py-14">
          <div className={`${seccion} flex flex-col gap-4`}>
            <Titulo>{t.llegaT}</Titulo>
            <ol className="grid gap-2.5 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <li key={i}><InfoCard><div className="flex items-start gap-3"><span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-ink text-[13px] font-extrabold text-white">{i + 1}</span>
                  <span className="flex flex-col gap-1"><b className="text-[14.5px]">{t[`l${i}`]}</b><span className="text-[13px] font-medium leading-normal text-text-2">{t[`l${i}s`]}</span></span></div></InfoCard></li>))}
            </ol>
          </div>
        </section>

        <section className={`${seccion} flex flex-col gap-4 py-10 lg:py-14`}>
          <Titulo>{t.negT}</Titulo>
          <p className="max-w-[640px] text-[15px] font-medium leading-[1.55] text-text-2">{t.negS}</p>
          <div className="grid gap-2.5 lg:grid-cols-3">
            {[["freeT", "freeS"], ["proT", "proS"], ["fundT", "fundS"]].map(([k, s]) => (
              <InfoCard key={k}><b className="font-display text-[18px]">{t[k!]}</b><p className="mt-1.5 text-[13.5px] font-medium leading-normal text-text-2">{pon(t[s!]!, { dias: d.dias, precio: d.precio, meta: d.metaNegocios })}</p></InfoCard>))}
          </div>
          <div className="flex"><Button icon="store" onClick={() => { setNeg(true); irForm(); }}>{t.apartar}</Button></div>
        </section>

        <section className="bg-paper py-10 lg:py-14">
          <div className={`${seccion} flex flex-col gap-3`}>
            <Titulo>{t.faqT}</Titulo>
            {Array.from({ length: 8 }, (_, i) => (
              <details key={i} className="rounded-[16px] border border-line bg-white px-4 py-3.5">
                <summary className="cursor-pointer text-[14.5px] font-bold">{t[`p${i}`]}</summary>
                <p className="mt-2 text-[13.5px] font-medium leading-normal text-text-2">{t[`r${i}`]}</p>
              </details>))}
          </div>
        </section>

        <section className={`${seccion} flex flex-col gap-4 py-10 lg:py-14`}>
          <Titulo>{t.comparteT}</Titulo>
          <p className="max-w-[640px] text-[15px] font-medium leading-[1.55] text-text-2">{t.comparteS}</p>
          <div className="flex flex-wrap gap-2.5">
            <a href={`https://wa.me/?text=${encodeURIComponent(`${t.mensaje} ${d.url}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex"><Button variant="secondary" icon="chat">{t.whatsapp}</Button></a>
            <Button variant="secondary" icon="share" onClick={() => void copiar()}>{t.copiar}</Button>
          </div>
        </section>
      </main>

      <PieLegal en={en} ciudad="Hazleton, PA" paginas={d.paginas} />
      {!desk && !verForm && !lugar ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur" data-barra-avisame>
          <Button block icon="bell" onClick={irForm}>{t.avisame}</Button>
        </div>) : null}
      {toast ? <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-[15px] bg-ink px-[18px] py-3.5 text-[13px] font-bold text-white">{toast}</div> : null}
    </div>
  );
}

/* Un ref que también avisa cuando el nodo aparece (el observador de la barra fija lo necesita después del primer render). */
function useRefDiv() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  return { current: el, set: setEl } as { current: HTMLDivElement | null; set: (e: HTMLDivElement | null) => void };
}
