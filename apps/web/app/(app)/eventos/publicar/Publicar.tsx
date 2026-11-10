"use client";
/* APP-EVT-EDITAR (diseño «To'Latino Publica tu evento», L105–): qué negocio lo organiza (o «Mi negocio no está aquí» → Publica tu
   negocio), el evento (nombre ≤ 70, tipo, cartel, de qué se trata ≤ 400), cuándo y dónde (14 días, horas, puertas, en el negocio o en
   otro lugar), la entrada (libre · gratis con RSVP · boletos en la app; nunca en la puerta, D1), edad, «Si algo cambia», «Te falta»,
   «Así lo ven los vecinos» y, enviado, «Tu evento está en revisión» con sus 3 pasos → el panel. Decisiones del grupo (§6 #1–#2, #5):
   el precio que pones es el que paga el vecino (cargos incluidos, la comisión sale de lo tuyo); la venta abre pronto; Eventos es Pro.
   El borrador vive en este teléfono hasta enviarlo. */
import * as UI from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type CSSProperties } from "react";
import { subirFoto } from "@/lib/subir-foto";
import { bi, diaCorto, hora, sumarDias, type Bi, type FormatoEvt } from "@/lib/evt-comun";
import { publicarEvento } from "./acciones";

type N = "Icon" | "Button" | "Chip" | "OrderTracker" | "EventCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, OrderTracker, EventCard } = UI as unknown as Record<N, ComponentType<any>>;
export type VistaPub = {
  lang: "es" | "en"; ciudad: string; yo: boolean; revisionH: number;
  orgs: { id: string; name: string; cat: string; addr: string | null; foto: string | null; pro: boolean; hoy: string; ciudad: string; formatos: FormatoEvt[]; bloqueado: string | null }[];
};
type F = { org: string | null; fmt: string | null; name: string; desc: string; foto: { id: string; url: string } | null; dia: number; h0: number; h1: number; puertas: 0 | 30 | 60;
  donde: "own" | "other"; lugar: string; dir: string; cp: string; entrada: "free" | "rsvp" | "tickets" | null; precio: string; cupo: string; edad: number };
const F0: F = { org: null, fmt: null, name: "", desc: "", foto: null, dia: 2, h0: 1260, h1: 1500, puertas: 0, donde: "own", lugar: "", dir: "", cp: "", entrada: null, precio: "", cupo: "", edad: 0 };
const DK = "tl-evt-publica-borrador";
const MONO = "'JetBrains Mono',monospace";
const K: CSSProperties = { font: `700 10px ${MONO}`, letterSpacing: ".16em", color: "rgba(11,14,18,.42)" };
const caja: CSSProperties = { padding: 16, borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.07)", display: "flex", flexDirection: "column" };
const entrada: CSSProperties = { height: 48, padding: "0 14px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", font: "600 15px Manrope,sans-serif", color: "var(--tl-ink)", outline: "none", background: "var(--tl-white)", boxSizing: "border-box", width: "100%" };
const HRS = Array.from({ length: 15 }, (_, i) => (12 + i) * 60);
const WD: [string, string][] = [["DOM", "SUN"], ["LUN", "MON"], ["MAR", "TUE"], ["MIÉ", "WED"], ["JUE", "THU"], ["VIE", "FRI"], ["SÁB", "SAT"]];

function useAncho() {
  const [w, setW] = useState(0);
  useEffect(() => { const f = () => setW(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return w;
}
const radio = (on: boolean) => ({ border: on ? "1.5px solid var(--tl-ink)" : "1px solid rgba(11,14,18,.1)", ring: on ? "6px solid var(--tl-ink)" : "1.5px solid rgba(11,14,18,.25)" });
function Opcion({ on, t, s, img, onClick }: { on: boolean; t: string; s: string; img?: string | null; onClick: () => void }) {
  const r = radio(on);
  return (
    <button type="button" onClick={onClick} aria-pressed={on} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 15, border: r.border, background: "var(--tl-white)", cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit", width: "100%" }}>
      {img !== undefined ? <span style={{ width: 40, height: 40, borderRadius: 12, background: img ? `url("${img}") center/cover` : "var(--tl-photo-bg)", flex: "none" }} /> : null}
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", font: "700 14px Manrope,sans-serif" }}>{t}</span><span style={{ display: "block", marginTop: 2, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>{s}</span></span>
      <span style={{ width: 20, height: 20, borderRadius: 99, boxSizing: "border-box", border: r.ring, flex: "none" }} />
    </button>);
}

export function Publicar({ v }: { v: VistaPub }) {
  const es = v.lang === "es", E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ruta = usePathname(), dw = useAncho(), D = dw >= 1024;
  const [f, setF] = useState<F>(F0), [tried, setTried] = useState(false), [enviando, setEnviando] = useState(false), [error, setError] = useState<string | null>(null), [subiendo, setSubiendo] = useState(false);
  const [sent, setSent] = useState<null | { id: string; org: string; f: F; at: string; publicado: boolean }>(null);
  useEffect(() => { let b: Partial<F> = {}; try { b = JSON.parse(localStorage.getItem(DK) ?? "{}") ?? {}; } catch { /* sin almacenamiento */ }
    const org = v.orgs.length === 1 ? v.orgs[0]!.id : b.org && v.orgs.some((o) => o.id === b.org) ? b.org : null; setF({ ...F0, ...b, org }); }, [v.orgs]);
  const up = (o: Partial<F>) => setF((x) => { const n = { ...x, ...o }; try { localStorage.setItem(DK, JSON.stringify(n)); } catch { /* sin almacenamiento */ } return n; });
  const O = v.orgs.find((o) => o.id === f.org) ?? null, Fs = O?.formatos ?? [], F = Fs.find((x) => x.key === f.fmt) ?? null, hoy = O?.hoy ?? new Date().toISOString().slice(0, 10);
  const dia = sumarDias(hoy, f.dia), ages = F?.ages ?? [0, 18, 21];
  const faltan = () => {
    const m: string[] = [];
    if (!f.org) m.push(E2("Elige qué negocio lo organiza", "Pick the business hosting it"));
    if (f.name.trim().length < 3) m.push(E2("Ponle nombre al evento", "Name the event"));
    if (!F) m.push(E2("Elige el tipo", "Pick the type"));
    if (!f.foto) m.push(E2("Sube el cartel", "Upload the poster"));
    if (f.donde === "other" && (f.lugar.trim().length < 2 || f.dir.trim().length < 4)) m.push(E2("Escribe el lugar y la dirección", "Enter the place and address"));
    if (f.donde === "other" && !/^\d{5}$/.test(f.cp)) m.push(E2("Escribe el código postal del lugar", "Enter the venue ZIP code"));
    if (!f.entrada) m.push(E2("Elige cómo se entra", "Pick how people get in"));
    if (f.entrada === "tickets" && !(Number(f.precio) >= 1)) m.push(E2("Pon el precio de la entrada", "Set the ticket price"));
    if ((f.entrada === "rsvp" || f.entrada === "tickets") && !(Number(f.cupo) > 0)) m.push(E2("Pon cuántos caben", "Set the capacity"));
    if (f.h1 <= f.h0) m.push(E2("La hora de terminar va después de la de empezar", "End time must be after start time"));
    return m;
  };
  const miss = tried ? faltan() : [];
  const enviar = async () => {
    if (!v.yo) { router.push(`/entrar?volver=${encodeURIComponent(ruta)}`); return; }
    if (O?.bloqueado) { setError(E2(`No puedes publicar eventos: ${O.bloqueado}`, `You cannot publish events: ${O.bloqueado}`)); return; }
    if (faltan().length) { setTried(true); return; }
    setEnviando(true); setError(null);
    const r = await publicarEvento({ org: f.org!, fmt: f.fmt!, name: f.name, desc: f.desc, foto: f.foto, dia, h0: f.h0, h1: f.h1, puertas: f.puertas, donde: f.donde, lugar: f.lugar, dir: f.dir, cp: f.cp,
      entrada: f.entrada!, precio: Math.round(Number(f.precio) * 100), cupo: Number(f.cupo) || 0, edad: f.edad }).catch(() => ({ ok: false as const, error: "otro" as const, msg: undefined }));
    setEnviando(false);
    if (r.ok) {
      setSent({ id: r.id, org: r.org, f, at: new Date().toLocaleTimeString(es ? "es-US" : "en-US", { hour: "numeric", minute: "2-digit" }), publicado: r.envio === "publicado" });
      setF({ ...F0, org: f.org }); setTried(false); try { localStorage.removeItem(DK); } catch { /* sin almacenamiento */ } window.scrollTo(0, 0);
    } else if (r.error === "entrar") router.push(`/entrar?volver=${encodeURIComponent(ruta)}`);
    else if (r.error === "pro") setError(E2("Eventos es parte de Pro. Empieza la prueba de 30 días (sin tarjeta) en tu panel › Cobros y plan.", "Events is part of Pro. Start the 30-day trial (no card) in your dashboard › Payouts and plan."));
    else setError(r.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo enviar. Prueba otra vez.", "Couldn’t send. Try again."));
  };
  const subir = async (file: File | undefined) => {
    if (!file) return; setSubiendo(true);
    const r = await subirFoto(file).catch(() => null); setSubiendo(false);
    if (r?.ok && r.id && r.url) up({ foto: { id: r.id, url: r.url } }); else setError(r?.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo subir la foto.", "Could not upload the photo."));
  };
  const atras = () => router.push("/eventos");
  const precioC = Math.round(Number(f.precio) * 100) || 0, money = (c: number) => `$${(c / 100) % 1 ? (c / 100).toFixed(2) : c / 100}`;
  const entL = f.entrada === "free" ? E2("Entrada libre", "Free entry") : f.entrada === "rsvp" ? E2("Gratis con RSVP", "Free with RSVP") : f.entrada === "tickets" ? `${precioC ? money(precioC) : "$—"}${E2(" · boletos en la app", " · tickets in the app")}` : "—";
  const whenL = `${diaCorto(dia, es)} · ${hora(f.h0)} – ${hora(f.h1)}`, whereL = f.donde === "other" ? (f.lugar.trim() || E2("Otro lugar", "Another venue")) : O ? O.name : E2("Tu negocio", "Your business");
  const pol = f.entrada === "tickets" ? E2("Si cancelas el evento o cambias la fecha, devolvemos todo a quien compró, sin que tengas que hacer nada. Si el comprador cancela: se devuelve el boleto menos el cargo de servicio.", "If you cancel or move the event, everyone who bought gets everything back automatically. If a buyer cancels: the ticket is refunded minus the service fee.")
    : E2("Si cancelas el evento, avisamos a todos los que dijeron que van.", "If you cancel the event, we let everyone who said they are going know.");
  const lay = D ? { max: "1080px", pad: "28px 32px 70px", cols: dw >= 960 ? "minmax(0,1fr) 360px" : "minmax(0,1fr)", gap: "28px 48px", h1: 32 } : { max: "100%", pad: "16px 16px 0", cols: "minmax(0,1fr)", gap: "14px", h1: 26 };
  const cityK = `${E2("EVENTOS · ", "EVENTS · ")}${O?.ciudad ?? v.ciudad}`.toUpperCase();
  const revS = E2(`To'Latino lo revisa en ${v.revisionH} h. Nada se publica antes.`, `To'Latino reviews it within ${v.revisionH} h. Nothing goes live before.`);
  const ctaL = v.yo ? E2("Enviar a revisión", "Send for review") : E2("Entra para publicar", "Sign in to publish");
  const pv = { title: f.name.trim() || E2("Nombre del evento", "Event name"), meta: `${diaCorto(dia, es)} · ${hora(f.h0)}`.toUpperCase(), tag: f.entrada === "free" || f.entrada === "rsvp" ? E2("GRATIS", "FREE") : "", dark: !!F?.dark, image: f.foto?.url ?? "" };
  const pvRows: [string, string][] = [[E2("Cuándo", "When"), whenL], [E2("Dónde", "Where"), whereL], [E2("Entrada", "Entry"), entL], [E2("Edad", "Age"), f.edad ? `${f.edad}+` : E2("Todas", "All")]];
  const boton = <Button variant="primary" size="lg" block disabled={enviando || subiendo} onClick={enviar}>{enviando ? E2("Enviando…", "Sending…") : ctaL}</Button>;
  const sel: CSSProperties = { height: 44, padding: "0 10px", borderRadius: 13, border: "1.5px solid rgba(11,14,18,.14)", font: "700 14px Manrope,sans-serif", color: "var(--tl-ink)", background: "var(--tl-white)", width: "100%", minWidth: 0 };
  const num: CSSProperties = { ...entrada, height: 44, borderRadius: 13, font: "700 15px Manrope,sans-serif" };

  if (!dw) return <div style={{ minHeight: 600, background: "var(--tl-paper)" }} />;
  return (
    <div data-screen-label={`APP-EVT-EDITAR${sent ? " · en revisión" : ""}${D ? " · desktop" : " · móvil"}`} style={{ minHeight: "100%", background: "var(--tl-paper)", color: "var(--tl-ink)", fontFamily: "Manrope,sans-serif" }}>
      {!D ? (
        <div style={{ position: "sticky", top: 0, zIndex: 20, padding: "12px 16px", background: "var(--tl-white)", borderBottom: "1px solid rgba(11,14,18,.07)", display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" aria-label={E2("Volver a Eventos", "Back to Events")} onClick={atras} style={{ width: 34, height: 34, borderRadius: 11, background: "var(--tl-paper)", border: 0, display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="chevronLeft" size={16} strokeWidth={2} /></button>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 15px/1.2 Sora,sans-serif", letterSpacing: "-.02em" }}>{E2("Publica tu evento", "Publish your event")}</div><div style={{ marginTop: 3, font: `600 9px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.5)" }}>{cityK}</div></div>
        </div>
      ) : null}
      <div style={{ maxWidth: lay.max, margin: "0 auto", padding: lay.pad, display: "grid", gridTemplateColumns: lay.cols, gap: lay.gap, alignItems: "start" }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {D ? <button type="button" onClick={atras} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer", background: "transparent", border: 0, padding: 0 }}><Icon name="chevronLeft" size={15} strokeWidth={2} />{E2("Volver a Eventos", "Back to Events")}</button> : null}
          {!sent ? (<>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={K}>{cityK}</span>
              <h1 style={{ margin: 0, font: `800 ${lay.h1}px/1.08 Sora,sans-serif`, letterSpacing: "-.04em", textWrap: "balance" } as CSSProperties}>{E2("Publica tu evento", "Publish your event")}</h1>
              <p style={{ margin: 0, font: "500 14px/1.55 Manrope,sans-serif", color: "rgba(11,14,18,.65)" }}>{E2("Gratis. To'Latino lo revisa antes de publicarlo y te avisa.", "Free. To'Latino reviews it before it goes live and lets you know.")}</p>
            </div>

            <div data-screen-label="Publica tu evento · quién" style={{ ...caja, gap: 10 }}>
              <span style={K}>{E2("¿QUÉ NEGOCIO LO ORGANIZA?", "WHICH BUSINESS IS HOSTING?")}</span>
              {v.orgs.map((o) => <Opcion key={o.id} on={f.org === o.id} t={o.name} s={`${(o.addr ?? o.ciudad).toUpperCase()}${o.bloqueado ? E2(" · NO PUEDE PUBLICAR", " · CANNOT PUBLISH") : !o.pro ? E2(" · EVENTOS ES PRO", " · EVENTS IS PRO") : ""}`} img={o.foto}
                onClick={() => up({ org: o.id, fmt: o.formatos.some((x) => x.key === f.fmt) ? f.fmt : null })} />)}
              {!v.yo ? <span style={{ font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Entra con tu teléfono para elegir tu negocio.", "Sign in with your phone to pick your business.")}</span> : null}
              <button type="button" onClick={() => router.push("/publica")} style={{ alignSelf: "flex-start", font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer", background: "transparent", border: 0, padding: 0 }}>{E2("Mi negocio no está aquí · Publícalo gratis", "My business isn’t here · List it free")}</button>
            </div>

            <div data-screen-label="Publica tu evento · el evento" style={{ ...caja, gap: 14 }}>
              <span style={K}>{E2("EL EVENTO", "THE EVENT")}</span>
              <label style={{ display: "flex", flexDirection: "column", gap: 7 }}><span style={{ font: "700 13px Manrope,sans-serif" }}>{E2("Nombre", "Name")}</span>
                <input value={f.name} onChange={(e) => up({ name: e.target.value.slice(0, 70) })} placeholder={F ? bi(F.f.ph, es) : E2("Ej.: Noche de merengue en vivo", "E.g. Live merengue night")} style={entrada} /></label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={{ font: "700 13px Manrope,sans-serif" }}>{E2("Tipo", "Type")}</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{(Fs.length ? Fs : []).map((x) => <Chip key={x.key} variant={f.fmt === x.key ? "selected" : "filter"} onClick={() => up({ fmt: x.key, h0: x.f.h0, h1: x.f.h0 + x.f.len, puertas: x.f.dr, edad: x.ages.includes(f.edad) ? f.edad : x.f.age0, entrada: f.entrada ?? x.f.entry })}>{bi(x.label, es)}</Chip>)}
                  {!Fs.length ? <span style={{ font: "500 12.5px Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>{E2("Elige primero el negocio: cada uno publica sus tipos.", "Pick the business first: each one publishes its own types.")}</span> : null}</div></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={{ font: "700 13px Manrope,sans-serif" }}>{E2("Cartel", "Poster")}</span>
                <label style={{ position: "relative", aspectRatio: "4 / 3", maxWidth: 260, borderRadius: 13, background: f.foto ? `url("${f.foto.url}") center/cover` : "var(--tl-paper)", border: f.foto ? "0" : "1.5px dashed rgba(11,14,18,.2)", display: "grid", placeItems: "center", cursor: "pointer" }}>
                  <input type="file" accept="image/*" aria-label={E2("Subir cartel", "Upload poster")} onChange={(e) => subir(e.target.files?.[0])} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                  {!f.foto ? <span style={{ display: "flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}><Icon name="image" size={16} />{subiendo ? E2("Subiendo…", "Uploading…") : E2("Subir cartel", "Upload poster")}</span> : null}
                </label></div>
              <label style={{ display: "flex", flexDirection: "column", gap: 7 }}><span style={{ display: "flex", justifyContent: "space-between", gap: 10, font: "700 13px Manrope,sans-serif" }}><span>{E2("De qué se trata · Opcional", "What it’s about · Optional")}</span><span style={{ font: `600 10px ${MONO}`, color: "rgba(11,14,18,.42)" }}>{f.desc.length} / 400</span></span>
                <textarea value={f.desc} onChange={(e) => up({ desc: e.target.value.slice(0, 400) })} placeholder={E2("Quién toca, qué hay de comer, si hay parqueo…", "Who plays, what food there is, parking…")} rows={3} style={{ padding: "12px 14px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", font: "500 14px/1.5 Manrope,sans-serif", color: "var(--tl-ink)", outline: "none", resize: "none", boxSizing: "border-box", width: "100%" }} /></label>
            </div>

            <div data-screen-label="Publica tu evento · cuándo y dónde" style={{ ...caja, gap: 14 }}>
              <span style={K}>{E2("CUÁNDO Y DÓNDE", "WHEN AND WHERE")}</span>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", margin: "0 -2px", padding: "0 2px" }}>
                {Array.from({ length: 14 }, (_, i) => { const iso = sumarDias(hoy, i), [y, m, dd] = iso.split("-").map(Number), w = new Date(Date.UTC(y!, m! - 1, dd!)).getUTCDay(), on = f.dia === i; return (
                  <button type="button" key={i} aria-pressed={on} aria-label={diaCorto(iso, es)} onClick={() => up({ dia: i })} style={{ flex: "none", width: 56, padding: "9px 0", borderRadius: 13, textAlign: "center", cursor: "pointer", background: on ? "var(--tl-ink)" : "var(--tl-white)", color: on ? "var(--tl-white)" : "var(--tl-ink)", border: `1px solid ${on ? "var(--tl-ink)" : "rgba(11,14,18,.1)"}` }}>
                    <div style={{ font: `700 9px ${MONO}`, letterSpacing: ".08em", opacity: 0.7 }}>{WD[w]![es ? 0 : 1]}</div><div style={{ marginTop: 3, font: "800 17px Sora,sans-serif" }}>{dd}</div></button>); })}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                {([["h0", E2("EMPIEZA", "STARTS")], ["h1", E2("TERMINA", "ENDS")]] as const).map(([k, l]) => (
                  <label key={k} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}><span style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".12em", color: "rgba(11,14,18,.5)" }}>{l}</span>
                    <select value={String(f[k])} onChange={(e) => up({ [k]: Number(e.target.value) } as Partial<F>)} style={sel}>{HRS.map((h) => <option key={h} value={h}>{hora(h)}</option>)}</select></label>))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={{ font: "700 13px Manrope,sans-serif" }}>{E2("Abren puertas", "Doors open")}</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{([[0, E2("Al empezar", "At start")], [30, E2("30 min antes", "30 min before")], [60, E2("1 h antes", "1 h before")]] as const).map(([p, l]) => <Chip key={p} variant={f.puertas === p ? "selected" : "filter"} onClick={() => up({ puertas: p })}>{l}</Chip>)}</div></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={{ font: "700 13px Manrope,sans-serif" }}>{E2("¿Dónde es?", "Where is it?")}</span>
                <Opcion on={f.donde === "own"} t={O ? E2(`En ${O.name}`, `At ${O.name}`) : E2("En tu negocio", "At your business")} s={O ? O.addr ?? O.ciudad : E2("La dirección de tu página", "Your page address")} onClick={() => up({ donde: "own" })} />
                <Opcion on={f.donde === "other"} t={E2("En otro lugar", "Somewhere else")} s={E2("Salón, parque, iglesia…", "Hall, park, church…")} onClick={() => up({ donde: "other" })} />
                {f.donde === "other" ? <><input value={f.lugar} onChange={(e) => up({ lugar: e.target.value.slice(0, 60) })} placeholder={E2("Nombre del lugar", "Venue name")} aria-label={E2("Nombre del lugar", "Venue name")} style={entrada} />
                  <input value={f.dir} onChange={(e) => up({ dir: e.target.value.slice(0, 100) })} placeholder={E2("Dirección", "Address")} aria-label={E2("Dirección", "Address")} style={entrada} />
                  <input value={f.cp} inputMode="numeric" onChange={(e) => up({ cp: e.target.value.replace(/\D/g, "").slice(0, 5) })} placeholder={E2("Código postal", "ZIP code")} aria-label={E2("Código postal", "ZIP code")} style={entrada} /></> : null}
              </div>
            </div>

            <div data-screen-label="Publica tu evento · entrada" style={{ ...caja, gap: 14 }}>
              <span style={K}>{E2("ENTRADA", "ENTRY")}</span>
              <Opcion on={f.entrada === "free"} t={E2("Entrada libre", "Free entry")} s={E2("Sin lista. Llegas y entras.", "No list. Just show up.")} onClick={() => up({ entrada: "free" })} />
              <Opcion on={f.entrada === "rsvp"} t={E2("Gratis con RSVP", "Free with RSVP")} s={E2("Los vecinos apartan su lugar. Tú pones el cupo.", "Neighbors save a spot. You set the capacity.")} onClick={() => up({ entrada: "rsvp" })} />
              <Opcion on={f.entrada === "tickets"} t={E2("Boletos en la app", "Tickets in the app")} s={E2("Pagan con tarjeta y entran con QR. La venta en la app abre pronto: hoy se guarda.", "They pay by card and get in with a QR. In-app sales open soon: for now it is saved.")} onClick={() => up({ entrada: "tickets" })} />
              {f.entrada === "rsvp" || f.entrada === "tickets" ? (
                <div style={{ display: "grid", gridTemplateColumns: f.entrada === "rsvp" ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 8 }}>
                  {f.entrada === "tickets" ? <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}><span style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".12em", color: "rgba(11,14,18,.5)" }}>{E2("PRECIO", "PRICE")}</span>
                    <input value={f.precio} onChange={(e) => up({ precio: e.target.value.replace(/[^\d.]/g, "").slice(0, 6) })} inputMode="decimal" placeholder="15" style={num} /></label> : null}
                  <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}><span style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".12em", color: "rgba(11,14,18,.5)" }}>{E2("CUÁNTOS CABEN", "CAPACITY")}</span>
                    <input value={f.cupo} onChange={(e) => up({ cupo: e.target.value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" placeholder="80" style={num} /></label>
                </div>) : null}
              {f.entrada === "tickets" ? <span style={{ font: "500 12.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2(`El vecino paga ${precioC ? money(precioC) : "$—"}: el precio que ve es el que paga, cargos incluidos. La comisión de To'Latino sale de lo tuyo.`, `Neighbors pay ${precioC ? money(precioC) : "$—"}: the price they see is what they pay, fees included. To'Latino's fee comes out of your side.`)}</span> : null}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={{ font: "700 13px Manrope,sans-serif" }}>{E2("Edad", "Age")}</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{ages.map((a) => <Chip key={a} variant={f.edad === a ? "selected" : "filter"} onClick={() => up({ edad: a })}>{a ? `${a}+` : E2("Todas las edades", "All ages")}</Chip>)}</div></div>
              <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--tl-paper)", display: "flex", flexDirection: "column", gap: 4 }}><span style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".14em", color: "rgba(11,14,18,.5)" }}>{E2("SI ALGO CAMBIA", "IF SOMETHING CHANGES")}</span><span style={{ font: "500 12.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.7)" }}>{pol}</span></div>
            </div>

            {!D ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={K}>{E2("ASÍ LO VEN LOS VECINOS", "HOW NEIGHBORS SEE IT")}</span><div style={{ display: "flex", justifyContent: "center" }}><EventCard {...pv} width={300} /></div></div> : null}
            {miss.length ? <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(11,14,18,.04)", display: "flex", flexDirection: "column", gap: 4 }}><span style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".14em", color: "rgba(11,14,18,.5)" }}>{E2("TE FALTA", "STILL NEEDED")}</span>{miss.map((t) => <span key={t} style={{ font: "600 13px Manrope,sans-serif", color: "rgba(11,14,18,.7)" }}>· {t}</span>)}</div> : null}
            {error ? <span role="alert" style={{ font: "700 13px/1.5 Manrope,sans-serif", color: "var(--tl-danger)" }}>{error}</span> : null}
            {!D ? <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 24 }}><div style={{ display: "flex" }}>{boton}</div><span style={{ textAlign: "center", font: "600 11.5px Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>{revS}</span></div> : null}
          </>) : (
            <div data-screen-label="Publica tu evento · en revisión" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={{ width: 54, height: 54, borderRadius: 18, background: "var(--tl-signal)", display: "grid", placeItems: "center" }}><Icon name="check" size={26} strokeWidth={2.2} /></span>
              <h1 style={{ margin: 0, font: `800 ${lay.h1}px/1.08 Sora,sans-serif`, letterSpacing: "-.04em" }}>{sent.publicado ? E2("Tu evento ya está publicado", "Your event is live") : E2("Tu evento está en revisión", "Your event is under review")}</h1>
              <p style={{ margin: 0, font: "500 14px/1.55 Manrope,sans-serif", color: "rgba(11,14,18,.65)" }}>{sent.publicado ? E2("Eres organizador verificado: ya sale en Eventos y en tu página. Lo manejas desde el panel.", "You are a verified organizer: it already shows in Events and on your page. You manage it from the dashboard.")
                : E2(`To'Latino lo revisa en ${v.revisionH} h y te avisa. Cuando se publique, lo manejas desde el panel.`, `To'Latino reviews it within ${v.revisionH} h and lets you know. Once live, you manage it from the dashboard.`)}</p>
              <div style={{ padding: "16px 18px", borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.07)" }}>
                <OrderTracker steps={[{ label: E2("Enviado", "Sent"), time: sent.at, state: "done" }, { label: E2("Revisión de To'Latino", "To'Latino review"), time: sent.publicado ? E2("Organizador verificado", "Verified organizer") : E2(`Hasta ${v.revisionH} h`, `Up to ${v.revisionH} h`), state: sent.publicado ? "done" : "current" }, { label: E2("Publicado en Eventos", "Live in Events"), time: "", state: sent.publicado ? "current" : "next" }]} />
              </div>
              <div style={{ padding: "6px 16px", borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.07)" }}>
                {([[E2("EVENTO", "EVENT"), sent.f.name], [E2("CUÁNDO", "WHEN"), `${diaCorto(sumarDias(hoy, sent.f.dia), es)} · ${hora(sent.f.h0)} – ${hora(sent.f.h1)}`], [E2("DÓNDE", "WHERE"), sent.f.donde === "other" ? `${sent.f.lugar} · ${sent.f.dir}` : O?.name ?? ""],
                  [E2("ENTRADA", "ENTRY"), sent.f.entrada === "free" ? E2("Entrada libre", "Free entry") : sent.f.entrada === "rsvp" ? E2(`Gratis con RSVP · ${sent.f.cupo}`, `Free with RSVP · ${sent.f.cupo}`) : `$${sent.f.precio} · ${sent.f.cupo}${E2(" boletos", " tickets")}`]] as [string, string][]).map(([k, val]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "11px 0", borderBottom: "1px solid rgba(11,14,18,.06)" }}><span style={{ font: `700 10px ${MONO}`, letterSpacing: ".1em", color: "rgba(11,14,18,.5)", paddingTop: 2 }}>{k}</span><span style={{ font: "600 13.5px/1.4 Manrope,sans-serif", textAlign: "right", minWidth: 0 }}>{val}</span></div>))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, paddingBottom: 24 }}>
                <Button variant="primary" size="md" block onClick={() => router.push(`/panel/${sent.org}/eventos?det=evt:${sent.id}`)}>{E2("Ver en el panel", "See in the panel")}</Button>
                <Button variant="secondary" size="md" block onClick={atras}>{E2("Volver a Eventos", "Back to Events")}</Button>
              </div>
            </div>
          )}
        </div>
        {D ? (
          <div style={{ alignSelf: "stretch" }}><div style={{ position: "sticky", top: 96, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ ...caja, gap: 12 }}>
              <span style={K}>{E2("ASÍ LO VEN LOS VECINOS", "HOW NEIGHBORS SEE IT")}</span>
              <div style={{ display: "flex", justifyContent: "center" }}><EventCard {...pv} width={300} /></div>
              {pvRows.map(([k, val]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, font: "600 12.5px Manrope,sans-serif" }}><span style={{ color: "rgba(11,14,18,.55)" }}>{k}</span><span style={{ textAlign: "right" }}>{val}</span></div>)}
            </div>
            {!sent ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ display: "flex" }}>{boton}</div><span style={{ textAlign: "center", font: "600 11.5px Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>{revS}</span></div> : null}
          </div></div>
        ) : null}
      </div>
    </div>
  );
}
export type { Bi };
