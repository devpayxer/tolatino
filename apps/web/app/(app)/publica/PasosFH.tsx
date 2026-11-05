"use client";
/* Publica tu negocio v2 · paso 5 (ONB-NEG-F1 · tu foto y tu página) y «publicada» (ONB-NEG-H1). Tal cual el diseño.
   Las fotos son reales: se toman o se eligen del teléfono, se reducen aquí y el servidor las limpia y las guarda
   (/api/medios). «Elegir de tus fotos» abre las fotos del teléfono (el prototipo mostraba un carrete de ejemplo). */
import { reducir } from "@/lib/subir-foto";
import * as UI from "@tolatino/ui";
import { useRef, useState, type ComponentType } from "react";
import { probarPromo } from "./acciones";
import { derive, items, opOf, own, X, type Borrador } from "./logica";
import { K } from "./PasosBC";

type N = "Icon" | "Button" | "Chip" | "Tag" | "BusinessPreview";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, Tag, BusinessPreview } = UI as unknown as Record<N, ComponentType<any>>;
type Up = (p: Partial<Borrador> | ((d: Borrador) => Partial<Borrador>)) => void;
export type Publicado = { id: string; nombre: string; minutos: number; hasta: string; items: number; fotos: number };

/* URL pública de una foto subida (nginx /medios → el bucket). */
export const foto = (id: string, _h?: number) => (/^[0-9a-f-]{36}$/.test(id) ? `/medios/n/${id}.jpg` : id);
const MES = [["ene", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["abr", "Apr"], ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["ago", "Aug"], ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dic", "Dec"]];
export function fechasPrueba(len: number, es: boolean) {
  const f = (ms: number) => { const d = new Date(ms); return es ? `${d.getDate()} ${MES[d.getMonth()]![0]}` : `${MES[d.getMonth()]![1]} ${d.getDate()}`; };
  const t0 = Date.now();
  return { fin: f(t0 + len * 864e5), aviso: f(t0 + (len - 5) * 864e5) };
}

/* Lo que trae Pro con SU negocio (proRows del diseño). */
function proRows(d: Borrador, es: boolean) {
  const E2 = (a: string, b: string) => (es ? a : b), c = d.cat ? X.CFG[d.cat] : null;
  const iwP: [string, string] | null = ({ "NEG-NOCHE": ["opciones", "options"], "NEG-FIESTA": ["paquetes y artículos", "packages and items"] } as Record<string, [string, string]>)[d.cat ?? ""] || (c && c.items);
  const iw = iwP ? E2(iwP[0], iwP[1]) : E2("servicios", "services"), n = items(d).length, ph = [d.cover].concat(d.gallery || []).filter(Boolean).length;
  const FI = X.FREE_ITEMS || 5, FP = X.FREE_PHOTOS || 3, dv = derive(d), o = own(d), k = d.cat ? X.cat(d.cat) : null, out: { icon: string; t: string; f: string }[] = [];
  out.push(n > FI ? { icon: "grid", t: E2(`Tus ${n} ${iw} en tu página`, `Your ${n} ${iw} on your page`), f: E2(`FREE MUESTRA ${FI}`, `FREE SHOWS ${FI}`) } : { icon: "grid", t: E2(`Tus ${iw}, con su propia pestaña`, `Your ${iw}, with their own tab`), f: E2("FREE: UNA SOLA PÁGINA", "FREE: ONE PAGE") });
  out.push({ icon: "image", t: ph > FP ? E2(`Tus ${ph} fotos`, `Your ${ph} photos`) : E2("Todas las fotos que subas", "Every photo you upload"), f: E2(`FREE MUESTRA ${FP}`, `FREE SHOWS ${FP}`) });
  if (d.cat === "NEG-BELL" && o.team && o.team !== "solo" && opOf(d) !== "rento") out.push({ icon: "users", t: E2(`Tus ${o.seats || 4} sillas, cada una con su agenda`, `Your ${o.seats || 4} chairs, each with its own schedule`), f: E2("FREE: SIN TU EQUIPO", "FREE: NO TEAM") });
  out.push({ icon: "users", t: E2("Tú en tu página: tu foto y tus palabras", "You on your page: your photo and your words"), f: E2("FREE: NO SALE", "FREE: HIDDEN") });
  out.push({ icon: "search", t: E2(`Sales primero en ${k ? k[1] : ""}`, `You show first in ${k ? k[2] : ""}`), f: E2("FREE: DESPUÉS DE LOS PRO", "FREE: AFTER PRO") });
  Object.keys(dv.mods || {}).filter((m) => ["rsv", "cot", "renta"].includes(m) && !X.freeOk(d.cat, m)).slice(0, 1).forEach((m) => { const L = (c && c.lbl && c.lbl[m]) || X.MOD[m]; out.push({ icon: X.MOD[m][2], t: E2(L[0], L[1]), f: E2("SOLO PRO", "PRO ONLY") }); });
  const mods = (dv.mods || {}) as Record<string, unknown>, opn = mods.citas ? E2("Citas", "Bookings") : mods.pedidos ? E2("Pedidos", "Orders") : null;
  if (opn) out.push({ icon: "calendar", t: E2(`${opn} en línea, sin tope`, `Online ${opn.toLowerCase()}, no cap`), f: E2("FREE: 10 AL MES", "FREE: 10 A MONTH") });
  out.push({ icon: "chat", t: E2("Respondes tus reseñas", "You reply to reviews"), f: E2("FREE: NO", "FREE: NO") });
  return out.slice(0, 6);
}

export function PasoF1({ d, up, es, desk, dw, pv, fechas, len, toast }: {
  d: Borrador; up: Up; es: boolean; desk: boolean; dw: number; pv: unknown; fechas: { fin: string; aviso: string }; len: number; toast: (t: string) => void;
}) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const cam = useRef<HTMLInputElement>(null), rollo = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(0), [full, setFull] = useState(false);
  const [promo, setPromo] = useState<{ open: boolean; v: string; err: boolean }>({ open: false, v: "", err: false });
  const todas = [d.cover, ...(d.gallery || [])].filter((x): x is string => !!x);
  const subir = async (files: FileList | null) => {
    if (!files?.length) return;
    const lista = Array.from(files).slice(0, Math.max(0, 13 - todas.length));
    setSubiendo(lista.length);
    for (const f of lista) {
      const fd = new FormData(); fd.append("foto", await reducir(f), "foto.jpg");
      const r = await fetch("/api/medios", { method: "POST", body: fd }).then((x) => x.json()).catch(() => null) as { ok: boolean; id?: string; mensaje?: { es: string; en: string } } | null;
      setSubiendo((n) => n - 1);
      if (!r?.ok || !r.id) { toast(r?.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo subir la foto. Prueba otra vez.", "Couldn’t upload the photo. Try again.")); continue; }
      const id = r.id;
      up((z) => (z.cover ? { gallery: (z.gallery || []).concat([id]).slice(0, 12) } : { cover: id }));
    }
  };
  const portada = (id: string) => up((z) => { const t = [z.cover, ...(z.gallery || [])].filter((x): x is string => !!x && x !== id); return { cover: id, gallery: t }; });
  const quitar = (id: string) => up((z) => { const t = [z.cover, ...(z.gallery || [])].filter((x): x is string => !!x && x !== id); return { cover: t[0] ?? null, gallery: t.slice(1) }; });
  const aplicar = async () => { const r = await probarPromo(promo.v); if (r.ok) { up({ promo: promo.v.toUpperCase(), promoOk: true }); setPromo({ open: false, v: "", err: false }); } else setPromo({ ...promo, err: true }); };
  return (
    <div data-screen-label="ONB-NEG-F1 · tu foto y tu página" style={{ display: "flex", flexDirection: "column", gap: 14, animation: "oFade .2s ease-out" }}>
      <input ref={cam} type="file" accept="image/*" capture="environment" onChange={(e) => { void subir(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
      <input ref={rollo} type="file" accept="image/*" multiple onChange={(e) => { void subir(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
      <div style={{ position: "relative", aspectRatio: "16 / 10", borderRadius: 20, overflow: "hidden", background: d.cover ? `url("${foto(d.cover, 600)}") center/cover, var(--tl-photo-bg)` : "repeating-linear-gradient(135deg,var(--tl-ds-e7e5e0, var(--tl-photo-bg)) 0 10px,var(--tl-desk) 10px 20px)", display: "grid", placeItems: "center" }}>
        {!d.cover ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><Icon name="image" size={26} color="rgba(11,14,18,.4)" /><span style={K}>{subiendo ? E2("SUBIENDO…", "UPLOADING…") : E2("TU PORTADA", "YOUR COVER")}</span></div>
          : <div style={{ position: "absolute", left: 12, bottom: 12, display: "flex" }}><Tag tone="ink">{E2("PORTADA", "COVER")}{(d.gallery || []).length ? ` · +${(d.gallery || []).length}` : ""}</Tag></div>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex" }}><Button variant="primary" size="md" icon="image" block disabled={subiendo > 0} onClick={() => cam.current?.click()}>{d.cover ? E2("Otra foto", "Another photo") : E2("Tomar foto", "Take a photo")}</Button></div>
        <div style={{ flex: 1, minWidth: 0, display: "flex" }}><Button variant="secondary" size="md" block disabled={subiendo > 0} onClick={() => rollo.current?.click()}>{E2("Elegir de tus fotos", "Choose from photos")}</Button></div>
      </div>
      {todas.length > 1 || subiendo ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={K}>{E2("TUS FOTOS · LA PRIMERA ES LA PORTADA", "YOUR PHOTOS · THE FIRST ONE IS THE COVER")}</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
            {todas.map((id, i) => (
              <div key={id} role="button" aria-label={i ? E2("Usar de portada", "Use as cover") : E2("Portada", "Cover")} onClick={() => (i ? portada(id) : undefined)} style={{ position: "relative", aspectRatio: "1", borderRadius: 12, background: `url("${foto(id, 240)}") center/cover`, backgroundColor: "var(--tl-photo-bg)", cursor: i ? "pointer" : "default", boxShadow: i ? "none" : "0 0 0 2.5px var(--tl-ink)" }}>
                <span style={{ position: "absolute", top: 6, left: 6, minWidth: 22, height: 22, padding: "0 7px", boxSizing: "border-box", borderRadius: 99, background: "var(--tl-ink)", color: "var(--tl-white)", display: "grid", placeItems: "center", font: "800 9.5px 'JetBrains Mono',monospace", letterSpacing: ".06em" }}>{i ? String(i + 1) : E2("PORTADA", "COVER")}</span>
                <span role="button" aria-label={E2("Quitar foto", "Remove photo")} onClick={(e) => { e.stopPropagation(); quitar(id); }} style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 99, background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icon name="close" size={12} strokeWidth={2.2} /></span>
              </div>
            ))}
            {Array.from({ length: subiendo }).map((_, i) => <div key={"s" + i} style={{ aspectRatio: "1", borderRadius: 12, background: "var(--tl-photo-bg)", animation: "pvFade 1s ease-in-out infinite alternate" }} />)}
          </div>
        </div>
      ) : null}
      {!desk || dw < 960 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><span style={K}>{E2("ASÍ TE VEN LOS VECINOS", "HOW NEIGHBORS SEE YOU")}</span><Chip variant="pro">PRO</Chip></div>
          <div className="ohs" style={{ maxHeight: full ? "none" : 460, overflowY: "auto", borderRadius: 22, border: "1px solid rgba(11,14,18,.1)", background: "var(--tl-white)" }}><BusinessPreview pv={pv} mode="page" view="pro" lang={es ? "es" : "en"} /></div>
          <span role="button" onClick={() => setFull(!full)} style={{ alignSelf: "center", font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{full ? E2("Ver menos", "Show less") : E2("Ver tu página completa", "See your whole page")}</span>
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", marginTop: 4 }}>
        <span style={{ ...K, marginBottom: 4 }}>{E2("CON PRO, TU PÁGINA TIENE", "WITH PRO, YOUR PAGE HAS")}</span>
        {proRows(d, es).map((x) => (
          <div key={x.t} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: "1px solid rgba(11,14,18,.07)" }}>
            <span style={{ width: 30, height: 30, borderRadius: 10, background: "rgba(0,229,196,.14)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={x.icon} size={15} color="var(--tl-open-text)" /></span>
            <span style={{ flex: 1, minWidth: 0, font: "700 13.5px/1.35 Manrope,sans-serif" }}>{x.t}</span>
            <span style={{ flex: "none", maxWidth: "40%", font: "700 9px/1.4 'JetBrains Mono',monospace", letterSpacing: ".08em", color: "rgba(11,14,18,.5)", textAlign: "right" }}>{x.f}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(0,229,196,.12)", font: "600 12.5px/1.5 Manrope,sans-serif", color: "var(--tl-open-text)" }}>{E2(`Hoy no se cobra nada. El ${fechas.aviso} te avisamos; si no sigues, el ${fechas.fin} tu página pasa a Free y no se borra nada.`, `Nothing is charged today. On ${fechas.aviso} we remind you; if you don’t continue, on ${fechas.fin} your page moves to Free and nothing is deleted.`)}</div>
      {!promo.open && !d.promoOk ? <span role="button" onClick={() => setPromo({ ...promo, open: true })} style={{ alignSelf: "flex-start", font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{E2("¿Tienes un código de promotor?", "Have a promoter code?")}</span> : null}
      {promo.open && !d.promoOk ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={promo.v} onChange={(e) => setPromo({ ...promo, v: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12), err: false })} placeholder="HZL30" aria-label={E2("Código de promotor", "Promoter code")} style={{ flex: 1, minWidth: 0, height: 46, boxSizing: "border-box", borderRadius: 13, border: `1.5px solid ${promo.err ? "var(--tl-danger)" : "rgba(11,14,18,.14)"}`, background: "var(--tl-white)", padding: "0 14px", outline: "none", font: "700 15px 'JetBrains Mono',monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--tl-ink)" }} />
            <Button variant="secondary" size="md" onClick={() => void aplicar()}>{E2("Aplicar", "Apply")}</Button>
          </div>
          {promo.err ? <span role="alert" style={{ font: "600 12.5px Manrope,sans-serif", color: "var(--tl-danger)" }}>{E2("Ese código no existe o ya venció.", "That code does not exist or has expired.")}</span> : null}
        </div>
      ) : null}
      {d.promoOk ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 14, background: "rgba(255,176,32,.14)" }}>
          <Icon name="star" size={16} color="var(--tl-pro-ink)" /><span style={{ flex: 1, minWidth: 0, font: "700 13px/1.4 Manrope,sans-serif" }}>{E2(`Con ${d.promo} tienes ${len} días de Pro gratis.`, `With ${d.promo} you get ${len} days of Pro free.`)}</span>
          <span role="button" onClick={() => up({ promo: "", promoOk: false })} style={{ flex: "none", font: "700 12.5px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{E2("Quitar", "Remove")}</span>
        </div>
      ) : null}
    </div>
  );
}

/* Fuerza del perfil (strength del diseño) con lo que el negocio ya tiene recién publicado. */
function fuerza(d: Borrador, p: Publicado, es: boolean) {
  const E2 = (a: string, b: string) => (es ? a : b), c = d.cat ? X.CFG[d.cat] : null, iw = c ? E2(c.items[0], c.items[1]) : E2("servicios", "services");
  const T: [boolean, number, string, string, string][] = [
    [p.items >= 3, 12, E2(`Agrega 3 o más ${iw}`, `Add 3 or more ${iw}`), E2("Con 3 o más, la gente compara y se decide.", "With 3 or more, people compare and decide."), "grid"],
    [p.fotos >= 5, 10, E2("Sube 5 fotos de tu trabajo", "Upload 5 photos of your work"), "", "image"],
    [false, 8, E2("Cuenta quiénes son", "Say who you are"), E2("La gente elige a quien conoce.", "People choose who they know."), "users"],
    [false, 4, E2("Pon tu logo", "Add your logo"), E2("Así te reconocen en la lista.", "So people recognize you in the list."), "store"],
    [false, 6, E2("Pide el sello Verificado", "Request the Verified badge"), E2("El check junto a tu nombre.", "The check next to your name."), "verified"],
    [false, 4, E2("Verifica tu correo", "Verify your email"), E2("Para recibos y recuperar tu cuenta.", "For receipts and account recovery."), "check"],
    [false, 4, E2("Responde 2 preguntas frecuentes", "Answer 2 FAQs"), E2("Ahorras llamadas que preguntan lo mismo.", "Fewer calls asking the same thing."), "help"],
    [true, 6, "", "", "star"],
    [opOf(d) === "casa", 4, E2("Agrega a tu equipo", "Add your team"), E2("Cada persona con su perfil.", "Each person with a profile."), "users"],
    [true, 8, "", "", "clock"],
    [false, 4, E2("Marca lo que hay en tu negocio", "Mark what your place offers"), E2("Estacionamiento, tarjeta, para niños…", "Parking, cards, kid friendly…"), "grid"],
  ];
  // A qué apartado del panel lleva cada tarea (strength del diseño: part). Las de apartados que aún no existen no llevan a ninguno.
  const PART = ["", "fotos", "about", "fotos", "", "", "", "", "equipo", "hor", "about"];
  const got = T.reduce((a, t) => a + (t[0] ? t[1] : 0), 0), max = T.reduce((a, t) => a + t[1], 0);
  return { sc: Math.round(30 + (70 * got) / max), tasks: T.map((t, i) => ({ ok: t[0], p: t[1], t: t[2], g: t[3], icon: t[4], part: PART[i] ?? "" })).filter((t) => !t.ok) };
}

export function PasoH1({ p, d, es, pv, toast }: { p: Publicado; d: Borrador; es: boolean; pv: unknown; toast: (t: string) => void }) {
  const E2 = (a: string, b: string) => (es ? a : b), S = fuerza(d, p, es);
  const ver = () => { window.location.href = `/n/${p.id}`; };
  const compartir = async () => {
    const url = `${window.location.origin}/n/${p.id}`;
    try { if (navigator.share) { await navigator.share({ title: p.nombre, url }); return; } await navigator.clipboard.writeText(url); toast(E2("Link copiado · ", "Link copied · ") + url.replace(/^https?:\/\//, "")); }
    catch { /* cancelado */ }
  };
  return (
    <div data-screen-label="ONB-NEG-H1 · publicada" style={{ display: "flex", flexDirection: "column", gap: 14, animation: "oFade .2s ease-out" }}>
      <div style={{ display: "grid" }}><BusinessPreview pv={pv} mode="mini" view="pro" lang={es ? "es" : "en"} onOpen={ver} /></div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex" }}><Button variant="secondary" size="md" icon="store" block onClick={ver}>{E2("Ver como cliente", "View as client")}</Button></div>
        <div style={{ flex: 1, minWidth: 0, display: "flex" }}><Button variant="secondary" size="md" icon="share" block onClick={() => void compartir()}>{E2("Compartir", "Share")}</Button></div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginTop: 8 }}><span style={K}>{E2("LO QUE SIGUE EN TU PANEL", "WHAT’S NEXT IN YOUR DASHBOARD")}</span><span style={{ font: "800 16px Sora,sans-serif", letterSpacing: "-.02em" }}>{S.sc} %</span></div>
      <div style={{ height: 6, borderRadius: 99, background: "rgba(11,14,18,.08)", overflow: "hidden" }}><div style={{ width: `${S.sc}%`, height: "100%", borderRadius: 99, background: "var(--tl-action)" }} /></div>
      <div>
        {S.tasks.slice(0, 6).map((x) => (
          <div key={x.t} role={x.part ? "link" : undefined} onClick={x.part ? () => { window.location.href = `/panel/${p.id}/pagina/${x.part}`; } : undefined} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderBottom: "1px solid rgba(11,14,18,.08)", cursor: x.part ? "pointer" : "default" }}>
            <span style={{ width: 34, height: 34, borderRadius: 11, background: "var(--tl-paper)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={x.icon} size={16} /></span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 13.5px/1.3 Manrope,sans-serif" }}>{x.t}</div>{x.g ? <div style={{ marginTop: 2, font: "500 12px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.58)" }}>{x.g}</div> : null}</div>
            <span style={{ flex: "none", font: "700 10px 'JetBrains Mono',monospace", letterSpacing: ".06em", color: "var(--tl-action)" }}>+{x.p} %</span>
          </div>
        ))}
      </div>
    </div>
  );
}
