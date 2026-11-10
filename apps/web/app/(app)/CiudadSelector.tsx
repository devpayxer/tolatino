"use client";
/* APP-CIUDAD (diseño «To'Latino Ciudad»): hoja en el teléfono (sheet) y ventana bajo el encabezado en escritorio (pop).
   ¿Dónde buscas? Desde dónde medimos (centro, barrio o tu ubicación), qué tan lejos (2 · 5 · 10 · 30 mi, con el mapa del
   radio y lo que entra), dónde ya estamos y lo que sigue, y «Avísame cuando llegue a mi zona». El servidor cuenta y
   guarda; esta pantalla solo pinta lo que el servidor le da. */
import * as UI from "@tolatino/ui";
import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from "react";
import { millas, punto, teselas, vista, type LL } from "@/lib/mapa-geo";
import { abrirSelector, dondeEstoy, elegirUbicacion, lugares, medirBorrador, pedirCiudad, quitarPedido, type DatosSelector } from "./ciudad/acciones";

type N = "Icon" | "Button" | "Chip" | "Tag" | "RadiusMap";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, Tag, RadiusMap } = UI as unknown as Record<N, ComponentType<any>>;

export const KF_CIUDAD = "@keyframes cFade{from{opacity:0}to{opacity:1}}@keyframes cUp{from{transform:translateY(64px);opacity:0}to{transform:none;opacity:1}}@keyframes cDrop{from{transform:translateY(-6px);opacity:0}to{transform:none;opacity:1}}@keyframes cPulse{0%{transform:scale(.5);opacity:.8}100%{transform:scale(2.2);opacity:0}}";
const MONO = "'JetBrains Mono',monospace";
const K: CSSProperties = { font: `800 10px ${MONO}`, letterSpacing: ".14em", color: "rgba(11,14,18,.45)" };

type Dr = { c: string; z: string; r: number; g: [number, number] | null };
type Medida = Awaited<ReturnType<typeof medirBorrador>>;
type Lugar = Awaited<ReturnType<typeof lugares>>[number];
const r1 = (x: number) => Math.round(x * 10) / 10;
const N = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function CiudadSelector({ lang, modo, ancla, pedir, onClose, onAplicada }: {
  lang: "es" | "en"; modo: "sheet" | "pop"; ancla?: { left: number; top: number } | null; pedir?: boolean;
  onClose: () => void; onAplicada: (abierta: boolean) => void;
}) {
  const es = lang === "es", E2 = (a: string, b: string) => (es ? a : b);
  const [d, setD] = useState<DatosSelector | null>(null);
  const [dr, setDr] = useState<Dr | null>(null);
  const [m, setM] = useState<Medida | null>(null);
  const [q, setQ] = useState(""), [qf, setQf] = useState(false), [filas, setFilas] = useState<Lugar[]>([]);
  const [gps, setGps] = useState<"idle" | "loc" | "ok" | "no">("idle");
  const [gi, setGi] = useState<{ ciudad: string; d: number; zona: { es: string; en: string } | null; g: [number, number] } | null>(null);
  const [view, setView] = useState<"main" | "ask">(pedir ? "ask" : "main");
  const [askV, setAskV] = useState(""), [askPh, setAskPh] = useState("");
  const [askDone, setAskDone] = useState<{ c: string; n: number } | null>(null);
  const [mios, setMios] = useState<{ id: string; t: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const pide = useRef(0);

  // Al abrir: lo que hay (ciudades, barrios, lo que ya pediste, la ubicación actual).
  useEffect(() => {
    let vivo = true;
    abrirSelector().then((x) => {
      if (!vivo) return;
      setD(x); setDr({ ...x.actual }); setMios(x.mios);
      if (x.actual.z === "gps" && x.actual.g) { setGps("ok"); setGi({ ciudad: x.actual.c, d: 0, zona: null, g: x.actual.g }); }
    });
    const kd = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", kd);
    return () => { vivo = false; document.removeEventListener("keydown", kd); };
  }, [onClose]);

  // Lo que entra con el borrador (cifras, pueblos, puntos del mapa): lo cuenta el servidor.
  useEffect(() => {
    if (!dr) return;
    const n = ++pide.current;
    const t = setTimeout(() => medirBorrador(dr).then((x) => { if (n === pide.current) setM(x); }), 120);
    return () => clearTimeout(t);
  }, [dr]);

  // Búsqueda de lugar mientras se escribe.
  useEffect(() => {
    const v = q.trim();
    if (!v) { setFilas([]); return; }
    let vivo = true;
    const t = setTimeout(() => lugares(v).then((x) => { if (vivo) setFilas(x); }), 180);
    return () => { vivo = false; clearTimeout(t); };
  }, [q]);

  const city = useMemo(() => (d && dr ? d.ciudades.find((c) => c.id === dr.c) ?? d.ciudades[0]! : null), [d, dr]);
  if (!d || !dr || !city) return modo === "sheet" ? <Fondo onClose={onClose} /> : null;

  const on = city.on, def = d.ciudades.find((c) => c.id === d.defecto.c) ?? d.ciudades[0]!;
  const set = (p: Partial<Dr>) => setDr((x) => ({ ...(x as Dr), ...p }));
  const centroZ = city.zonas.find((z) => z.centro);
  const nombreZ = (z: { es: string; en: string }) => (es ? z.es : z.en);
  const ctrName = (k: string) => k === "gps" ? E2("Tu ubicación", "Your location")
    : nombreZ(city.zonas.find((z) => z.id === k) ?? centroZ ?? { es: `Centro de ${city.corto}`, en: `Downtown ${city.corto}` });

  // ── Encabezado y textos ──
  const L = {
    qPh: E2("Dirección, barrio, ciudad o código postal", "Address, neighborhood, city or ZIP code"), from: E2("DESDE DÓNDE MEDIMOS", "MEASURED FROM"), how: E2("QUÉ TAN LEJOS", "HOW FAR"),
    city: E2("DÓNDE YA ESTAMOS Y LO QUE SIGUE", "WHERE WE ARE AND WHAT’S NEXT"),
    casaNote: E2("Los que van a domicilio salen si llegan hasta tu zona, aunque estén más lejos.", "Businesses that come to you show up if they reach your area, even if they are farther away."),
    askRow: E2("Avísame cuando llegue a mi zona", "Tell me when it reaches my area"), nw: E2("MUY PRONTO EN TODO EE. UU.", "COMING SOON NATIONWIDE"),
    askCity: E2("¿DÓNDE ESTÁS?", "WHERE ARE YOU?"), askPh: E2("Ej. Bethlehem, PA", "E.g. Bethlehem, PA"), askPhone: E2("TU TELÉFONO PARA AVISARTE", "YOUR PHONE SO WE CAN TELL YOU"), askPhone2: E2("Tu teléfono para avisarte", "Your phone so we can tell you"),
    askWhy: E2("Ciudad o código postal. Abrimos cada zona cuando ya hay vecinos pidiéndola y negocios listos. Solo te escribimos para avisarte que llegó.", "City or ZIP code. We open each area once neighbors ask for it and businesses are ready. We only text you when it arrives."),
    askMine: E2("YA PEDISTE", "YOU ASKED FOR"), remove: E2("Quitar", "Remove"), reset: E2(`Volver a ${d.defecto.n} · centro · ${d.defecto.r} mi`, `Back to ${d.defecto.n} · downtown · ${d.defecto.r} mi`), back: E2("Volver", "Back"),
    esc: E2("ESC PARA CERRAR", "ESC TO CLOSE"),
  };
  const head = view === "ask"
    ? { t: E2("Avísame cuando llegue a mi zona", "Tell me when it reaches my area"), s: E2("To’Latino llega a todo EE. UU.; te avisamos cuando tu zona tenga negocios.", "To’Latino is going nationwide; we will tell you when your area has businesses.") }
    : { t: E2("¿Dónde buscas?", "Where are you looking?"), s: E2("Buscamos alrededor de ti. Elige desde dónde y qué tan lejos.", "We search around you. Choose from where and how far.") };

  // ── Búsqueda de lugar ──
  const qRows = filas.map((r) => {
    if (r.k === "city") return { icon: "building", t: r.n, m: r.on ? E2("CIUDAD ACTIVA", "ACTIVE CITY") : E2(`PRÓXIMAMENTE · ${r.espera} EN LA LISTA`, `COMING SOON · ${r.espera} ON THE LIST`), mc: r.on ? "var(--tl-open-text)" : "rgba(11,14,18,.5)",
      onClick: () => { const c = d.ciudades.find((x) => x.id === r.id)!; setQ(""); setDr({ c: c.id, z: "centro", r: c.radios.includes(dr.r) ? dr.r : c.radio, g: null }); } };
    if (r.k === "zone") { const c = d.ciudades.find((x) => x.id === r.ciudad)!; return { icon: "pin", t: es ? r.es : r.en, m: E2(`BARRIO DE ${c.corto.toUpperCase()} · `, `${c.corto.toUpperCase()} NEIGHBORHOOD · `) + (es ? r.calleEs : r.calleEn).toUpperCase(), mc: "rgba(11,14,18,.5)",
      onClick: () => { setQ(""); setDr({ c: c.id, z: r.id, r: c.radios.includes(dr.r) ? dr.r : c.radio, g: null }); } }; }
    if (r.k === "town") { const c = d.ciudades.find((x) => x.id === r.ciudad)!, need = c.radios.find((x) => x >= r.d) ?? c.radios[c.radios.length - 1]!, fits = r.d <= c.radios[c.radios.length - 1]!, CC = c.corto.toUpperCase();
      return { icon: "pin", t: `${r.n}, PA`, m: fits ? E2(`${r1(r.d)} MI DE ${CC} · SE VE CON ${need} MI`, `${r1(r.d)} MI FROM ${CC} · SHOWN WITHIN ${need} MI`) : E2(`${r1(r.d)} MI DE ${CC}`, `${r1(r.d)} MI FROM ${CC}`), mc: "var(--tl-action)",
        onClick: () => { setQ(""); setDr({ c: c.id, z: "centro", r: need, g: null }); } }; }
    return { icon: "plus", t: E2(`Pedir ${r.a}`, `Request ${r.a}`), m: E2("AÚN NO ESTAMOS AHÍ · TE AVISAMOS", "NOT THERE YET · WE WILL LET YOU KNOW"), mc: "rgba(11,14,18,.5)",
      onClick: () => { setQ(""); setView("ask"); setAskV(r.a); setAskDone(null); } };
  });

  // ── Tu ubicación (la del teléfono; no se guarda en el servidor) ──
  const gOn = on && dr.z === "gps";
  const pedirGps = () => {
    if (gps === "ok" && gi) { setDr({ c: gi.ciudad, z: "gps", r: dr.r, g: gi.g }); return; }
    if (!navigator.geolocation) { setGps("no"); return; }
    setGps("loc");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const g: [number, number] = [Number(pos.coords.latitude.toFixed(4)), Number(pos.coords.longitude.toFixed(4))];
      const x = await dondeEstoy(g[0], g[1]);
      if (!x) { setGps("no"); return; }
      if (x.lejos) { setGps("idle"); setView("ask"); setAskDone(null); return; }
      const c = d.ciudades.find((y) => y.id === x.ciudad)!;
      if (!x.abierta) { setGps("idle"); setDr({ c: c.id, z: "centro", r: c.radio, g: null }); return; }
      setGi({ ciudad: x.ciudad, d: x.d, zona: x.zona, g }); setGps("ok");
      setDr({ c: c.id, z: "gps", r: c.radios.includes(dr.r) ? dr.r : c.radio, g });
    }, () => setGps("no"), { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  };
  const giC = gi ? d.ciudades.find((c) => c.id === gi.ciudad) : null;
  const gpsV = {
    on: gOn, bg: gOn ? "rgba(75,55,245,.06)" : "var(--tl-white)", bd: gOn ? "var(--tl-action)" : "rgba(11,14,18,.1)",
    t: gps === "loc" ? E2("Buscando dónde estás…", "Finding where you are…") : gps === "ok" ? E2("Tu ubicación", "Your location") : E2("Usar mi ubicación", "Use my location"),
    s: gps === "ok" && gi && giC ? `${gi.zona ? nombreZ(gi.zona) + ", " : ""}${giC.corto} · ${E2(`a ${gi.d} mi del centro`, `${gi.d} mi from downtown`)}`
      : gps === "no" ? E2("Sin permiso. Elige un barrio o una dirección.", "No permission. Pick a neighborhood or an address.")
      : E2("Medimos desde donde estás. Nunca cambiamos la ciudad sola.", "We measure from where you are. We never switch your city on our own."),
  };

  // ── Desde dónde medimos ──
  const ctrList = [{ k: "centro", t: ctrName("centro"), s: (centroZ ? (es ? centroZ.calleEs : centroZ.calleEn) : "").toUpperCase() }]
    .concat(gps === "ok" && gi && gi.ciudad === city.id ? [{ k: "gps", t: E2("Tu ubicación", "Your location"), s: `${(gi.zona ? nombreZ(gi.zona) : city.corto).toUpperCase()} · ${E2("AHORA", "NOW")}` }] : [])
    .concat(city.zonas.some((z) => z.id === dr.z && !z.centro) ? [(() => { const z = city.zonas.find((x) => x.id === dr.z)!; return { k: z.id, t: nombreZ(z), s: (es ? z.calleEs : z.calleEn).toUpperCase() }; })()] : []);
  const ctrs = ctrList.map((c, i) => { const sel = on && dr.z === c.k; return { ...c, bt: i ? "1px solid rgba(11,14,18,.07)" : "none", bg: sel ? "rgba(75,55,245,.05)" : "var(--tl-white)", bd: sel ? "var(--tl-action)" : "rgba(11,14,18,.1)", ring: sel ? "6px solid var(--tl-action)" : "1.5px solid rgba(11,14,18,.25)", onClick: () => set(c.k === "gps" ? { z: "gps", g: gi?.g ?? null } : { z: c.k, g: null }) }; });
  const zones = city.zonas.filter((z) => !z.centro).map((z) => ({ l: nombreZ(z), v: on && dr.z === z.id ? "selected" : "filter", onClick: () => set({ z: z.id, g: null }) }));

  // ── Qué tan lejos: el mapa del radio con lo que entra ──
  const biz = m?.biz ?? 0, idx = city.radios.indexOf(dr.r), prevR = idx > 0 ? city.radios[idx - 1]! : null;
  const tw = (m?.towns ?? []).map((t) => t.n);
  const twL = tw.length <= 1 ? (tw[0] || city.corto) : tw.length <= 4 ? tw.slice(0, -1).join(", ") + E2(" y ", " and ") + tw[tw.length - 1] : tw.slice(0, 4).join(", ") + E2(` y ${tw.length - 4} pueblos más`, ` and ${tw.length - 4} more towns`);
  const W = modo === "pop" ? 324 : 353, H = modo === "pop" ? 220 : 200, RP = on ? 74 : 58;
  const ctrLL: LL = m ? [m.lat, m.lng] : city.centro;
  const V = vista(ctrLL, on ? dr.r : 5, RP);
  const dots = on && m ? m.dots.map((x) => { const p = punto(ctrLL, [x.lat, x.lng], V.z, V.sc); return { x: Math.round(p.left), y: Math.round(p.top), color: x.dentro ? (x.pro ? "var(--tl-ink)" : "var(--tl-action)") : "rgba(11,14,18,.28)" }; }).filter((p) => Math.abs(p.x) < W / 2 + 6 && Math.abs(p.y) < H / 2 + 6) : [];
  const base = {
    label: L.how, radius: on ? `${dr.r} mi` : undefined, scale: V.sc, tiles: teselas(ctrLL, V.z, W, H, V.sc).map(({ src, left, top }) => ({ src, left, top })), dots, circle: RP * 2,
    place: (on ? ctrName(dr.z) : city.n).toUpperCase(),
    radii: on ? city.radios.map((r) => ({ label: `${r} mi`, on: dr.r === r, onClick: () => set({ r }) })) : [],
    count: on && m ? `${biz} ${biz === 1 ? E2("negocio", "business") : E2("negocios", "businesses")} · ${m.evt} ${m.evt === 1 ? E2("evento", "event") : E2("eventos", "events")}` : undefined,
    towns: on && m ? E2(`Incluye ${twL}.`, `Includes ${twL}.`) : undefined,
    note: on && m && prevR != null && m.prev === biz ? E2(`Entre ${prevR} y ${dr.r} mi todavía no hay negocios en To’Latino. Se ven los mismos.`, `Between ${prevR} and ${dr.r} mi there are no businesses on To’Latino yet. You see the same ones.`) : undefined,
  };

  // ── Dónde ya estamos y lo que sigue ──
  const defC = def.centro;
  const cities = d.ciudades.map((c, i) => { const sel = dr.c === c.id; return {
    id: c.id, t: c.n, tag: c.on ? E2("YA ESTAMOS", "LIVE") : E2("LA SIGUIENTE", "UP NEXT"), tone: c.on ? "signal" : "neutral",
    s: c.on ? `${c.biz} ${E2("NEGOCIOS", "BUSINESSES")}` : `${Math.round(millas(c.centro, defC))} MI · ${c.espera} ${E2("EN LA LISTA", "WAITING")}`,
    bt: i ? "1px solid rgba(11,14,18,.07)" : "none", bg: sel ? "rgba(75,55,245,.05)" : "var(--tl-white)", ring: sel ? "6px solid var(--tl-action)" : "1.5px solid rgba(11,14,18,.25)",
    onClick: () => setDr({ c: c.id, z: "centro", r: c.radios.includes(dr.r) ? dr.r : c.radio, g: null }) }; });

  // ── Botón de abajo ──
  const a = d.actual, same = dr.c === a.c && dr.z === a.z && dr.r === a.r, isDef = dr.c === d.defecto.c && dr.z === "centro" && dr.r === d.defecto.r;
  const aplicar = async () => { const r = await elegirUbicacion(dr); if (r.ok) onAplicada(r.abierta); };
  let foot = { dis: on && !m, icon: on ? "search" : "right",
    l: on ? (same ? E2("Listo · ", "Done · ") : E2("Ver ", "See ")) + `${biz} ${E2("negocios a", "businesses within")} ${dr.r} mi` : E2(`Ver ${city.corto}`, `See ${city.corto}`),
    onClick: same ? onClose : aplicar, reset: !isDef, onReset: () => setDr({ c: d.defecto.c, z: "centro", r: d.defecto.r, g: null }) };

  // ── Avísame cuando llegue a mi zona ──
  const aN = N(askV.trim());
  const cercano = (() => { if (!aN) return null; for (const c of d.ciudades.filter((x) => x.on)) for (const t of c.towns) { if (N(t.n) === N(c.corto)) continue; if (aN.startsWith(N(t.n))) return { c, t: t.n, d: millas([t.lat, t.lng], c.centro) }; } return null; })();
  const askSug = d.sugeridas.filter((s) => !aN || N(s).includes(aN)).filter((s) => s !== askV).slice(0, 6);
  const digitos = askPh.replace(/\D/g, "").length;
  const askDis = !askV.trim() || (!d.sesion && digitos < 10) || enviando;
  const enviar = async () => {
    if (askDis) return;
    setEnviando(true); setError(null);
    const r = await pedirCiudad(askV, askPh);
    setEnviando(false);
    if (r.ok) { setAskDone({ c: r.c, n: r.n }); setAskV(""); setMios(r.mios); }
    else setError(r.error === "telefono" ? E2("Revisa el teléfono: 10 dígitos.", "Check the phone: 10 digits.") : r.error === "muchos" ? E2("Ya recibimos muchos pedidos desde aquí. Prueba en un rato.", "We got many requests from here. Try again later.") : E2("No se pudo guardar. Prueba otra vez.", "Couldn’t save. Try again."));
  };
  const ask = {
    hasSug: askSug.length > 0 && !cercano, near: !!cercano && cercano.d <= 30,
    nearT: cercano ? E2(`${cercano.t} queda a ${r1(cercano.d)} mi de ${cercano.c.corto}: ya la ves si amplías la distancia.`, `${cercano.t} is ${r1(cercano.d)} mi from ${cercano.c.corto}: you already see it if you widen the distance.`) : "",
    widen: cercano ? (cercano.c.radios.find((x) => x >= cercano.d) ?? 30) : 30,
    userT: d.sesion ? E2(`Te avisamos por SMS al ${d.sesion.tel}.`, `We will text ${d.sesion.tel}.`) : "",
    doneT: askDone ? E2(`Anotamos ${askDone.c}`, `${askDone.c} is on the list`) : "",
    doneS: askDone ? (askDone.n > 1 ? E2(`Eres el vecino N.º ${askDone.n} en pedirla. Te escribimos solo cuando abra.`, `You are neighbor #${askDone.n} to ask. We only text you when it opens.`) : E2("Eres el primero en pedirla. Te escribimos solo cuando abra.", "You are the first to ask. We only text you when it opens.")) : "",
  };
  if (view === "ask") foot = { ...foot, l: askDone ? E2("Listo", "Done") : E2("Avísame", "Notify me"), icon: askDone ? "check" : "bell", dis: askDone ? false : askDis, onClick: askDone ? () => { setView("main"); setAskDone(null); } : enviar, reset: false };
  const quitar = async (id: string) => { const r = await quitarPedido(id); if (r.ok) setMios(r.mios); };
  const widen = () => { if (!cercano) return; setView("main"); setDr({ c: cercano.c.id, z: "centro", r: ask.widen, g: null }); };

  // ── Mi ciudad (comunidad) va aparte ──
  const myC = d.miCiudad.n;
  const fecha = d.miCiudad.cambia ? new Date(d.miCiudad.cambia + "T12:00:00").toLocaleDateString(es ? "es-US" : "en-US", { day: "numeric", month: "short" }).replace(".", "") : null;
  const my = {
    t: E2("Esto no cambia Mi ciudad", "This doesn’t change My city"),
    s: E2(`Aquí eliges lo que ves en Negocios, Eventos y Buscar. Tus publicaciones, votos y la Tabla del Barrio siguen en ${myC}${d.sesion && fecha ? ` (puedes cambiarla el ${fecha})` : ""}.`, `Here you choose what you see in Businesses, Events and Search. Your posts, votes and Neighborhood Board stay in ${myC}${d.sesion && fecha ? ` (you can change it on ${fecha})` : ""}.`),
    short: E2(`Esto no cambia Mi ciudad: tus publicaciones y la Tabla del Barrio siguen en ${myC}.`, `This doesn’t change My city: your posts and board stay in ${myC}.`),
    a: d.sesion ? E2("Mi ciudad", "My city") : null,
  };
  const irMiCiudad = () => { window.location.href = "/cuenta"; };

  const inAsk = view === "ask";
  const sheet = modo === "sheet";
  const txt = (f: string, extra?: CSSProperties): CSSProperties => ({ font: f, ...extra });

  // ── Piezas comunes ──
  const buscador = (
    <div style={{ display: "flex", flexDirection: "column", gap: sheet ? 8 : 6 }}>
      <div style={{ height: sheet ? 46 : 44, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 9, padding: "0 6px 0 13px", borderRadius: sheet ? 14 : 13, background: "var(--tl-paper)", border: `1.5px solid ${qf ? "var(--tl-action)" : "transparent"}` }}>
        <Icon name="search" size={sheet ? 17 : 16} color="rgba(11,14,18,.45)" />
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setQf(true)} onBlur={() => setQf(false)} placeholder={L.qPh} autoComplete="off" aria-label={L.qPh}
          style={{ flex: 1, minWidth: 0, height: "100%", border: "none", outline: "none", background: "transparent", padding: 0, font: `600 ${sheet ? 14.5 : 14}px Manrope,sans-serif`, color: "var(--tl-ink)" }} />
        {q ? <span role="button" aria-label={E2("Borrar", "Clear")} onClick={() => setQ("")} style={{ width: sheet ? 30 : 28, height: sheet ? 30 : 28, borderRadius: 99, display: "grid", placeItems: "center", background: "rgba(11,14,18,.07)", cursor: "pointer", flex: "none" }}><Icon name="close" size={sheet ? 12 : 11} strokeWidth={2.2} /></span> : null}
      </div>
      {q ? <div style={{ display: "flex", flexDirection: "column", gap: sheet ? 2 : 0 }}>{qRows.map((r, i) => (
        <div key={i} onClick={r.onClick} style={sheet ? { display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: "1px solid rgba(11,14,18,.06)", cursor: "pointer" } : { display: "flex", alignItems: "center", gap: 12, padding: 8, borderRadius: 12, cursor: "pointer" }} className={sheet ? "" : "hover:bg-[var(--tl-paper)]"}>
          <span style={{ width: sheet ? 38 : 34, height: sheet ? 38 : 34, borderRadius: sheet ? 11 : 10, background: "var(--tl-paper)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={r.icon} size={sheet ? 17 : 16} /></span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={txt(`700 ${sheet ? 14 : 13.5}px Manrope,sans-serif`)}>{r.t}</span><span style={txt(`600 ${sheet ? 10.5 : 10}px ${MONO}`, { letterSpacing: ".04em", color: r.mc })}>{r.m}</span></span>
          {sheet ? <Icon name="chevronRight" size={15} strokeWidth={2} color="rgba(11,14,18,.35)" /> : null}
        </div>))}</div> : null}
    </div>
  );
  const filaGps = (
    <div onClick={pedirGps} role="button" style={{ display: "flex", alignItems: "center", gap: 12, padding: sheet ? "13px 14px" : "11px 12px", borderRadius: sheet ? 16 : 14, background: gpsV.bg, border: `1.5px solid ${gpsV.bd}`, cursor: "pointer" }}>
      <span style={{ position: "relative", width: sheet ? 40 : 36, height: sheet ? 40 : 36, borderRadius: sheet ? 12 : 11, background: "rgba(75,55,245,.1)", display: "grid", placeItems: "center", flex: "none" }}>
        {gps === "loc" ? <span style={{ position: "absolute", inset: 0, borderRadius: 12, background: "rgba(75,55,245,.25)", animation: "cPulse 1.2s ease-out infinite" }} /> : null}
        <Icon name="pin" size={sheet ? 19 : 17} color="var(--tl-action)" />
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={txt(`700 ${sheet ? 14.5 : 13.5}px Manrope,sans-serif`, { color: "var(--tl-action)" })}>{gpsV.t}</span><span style={txt(`500 ${sheet ? 12.5 : 12}px/1.4 Manrope,sans-serif`, { color: "rgba(11,14,18,.6)" })}>{gpsV.s}</span></span>
      {gpsV.on ? <Icon name="check" size={sheet ? 18 : 17} strokeWidth={2.4} color="var(--tl-action)" /> : null}
    </div>
  );
  const desde = on ? (
    <div style={{ display: "flex", flexDirection: "column", gap: sheet ? 10 : 8 }}>
      <span style={K}>{L.from}</span>
      {sheet ? (
        <div style={{ borderRadius: 17, border: "1px solid rgba(11,14,18,.08)", overflow: "hidden" }}>
          {ctrs.map((c) => (
            <div key={c.k} onClick={c.onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: c.bt, background: c.bg, cursor: "pointer" }}>
              <span style={{ width: 20, height: 20, borderRadius: 99, boxSizing: "border-box", border: c.ring, flex: "none" }} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={txt("700 14px Manrope,sans-serif")}>{c.t}</span><span style={txt(`600 10.5px ${MONO}`, { letterSpacing: ".04em", color: "rgba(11,14,18,.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{c.s}</span></span>
            </div>))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 6 }}>
          {ctrs.map((c) => (
            <div key={c.k} onClick={c.onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 11px", borderRadius: 13, border: `1.5px solid ${c.bd}`, background: c.bg, cursor: "pointer" }}>
              <span style={{ width: 16, height: 16, borderRadius: 99, boxSizing: "border-box", border: c.ring, flex: "none" }} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}><span style={txt("700 13px Manrope,sans-serif", { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{c.t}</span><span style={txt(`600 9.5px ${MONO}`, { letterSpacing: ".04em", color: "rgba(11,14,18,.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{c.s}</span></span>
            </div>))}
        </div>
      )}
      {zones.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{zones.map((z) => <Chip key={z.l} variant={z.v} onClick={z.onClick}>{z.l}</Chip>)}</div> : null}
    </div>
  ) : null;
  const lista = (
    <div style={{ display: "flex", flexDirection: "column", gap: sheet ? 10 : 8 }}>
      <span style={K}>{L.city}</span>
      <div style={{ borderRadius: sheet ? 17 : 15, border: "1px solid rgba(11,14,18,.08)", overflow: "hidden" }}>
        {cities.map((c) => sheet ? (
          <div key={c.id} onClick={c.onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: c.bt, background: c.bg, cursor: "pointer" }}>
            <span style={{ width: 20, height: 20, borderRadius: 99, boxSizing: "border-box", border: c.ring, flex: "none" }} />
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={txt("700 14px Manrope,sans-serif")}>{c.t}</span><Tag tone={c.tone}>{c.tag}</Tag></span><span style={txt(`600 10.5px ${MONO}`, { letterSpacing: ".04em", color: "rgba(11,14,18,.5)" })}>{c.s}</span></span>
          </div>
        ) : (
          <div key={c.id} onClick={c.onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderTop: c.bt, background: c.bg, cursor: "pointer" }}>
            <span style={{ width: 16, height: 16, borderRadius: 99, boxSizing: "border-box", border: c.ring, flex: "none" }} />
            <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}><span style={txt("700 13.5px Manrope,sans-serif")}>{c.t}</span><Tag tone={c.tone}>{c.tag}</Tag></span>
            <span style={txt(`600 10px ${MONO}`, { letterSpacing: ".04em", color: "rgba(11,14,18,.5)", whiteSpace: "nowrap" })}>{c.s}</span>
          </div>
        ))}
        <div onClick={() => { setView("ask"); setAskDone(null); }} style={{ display: "flex", alignItems: "center", gap: sheet ? 12 : 10, padding: sheet ? "12px 14px" : "10px 12px", borderTop: "1px solid rgba(11,14,18,.07)", cursor: "pointer" }}>
          <Icon name="plus" size={sheet ? 18 : 16} color="var(--tl-action)" /><span style={txt(`700 ${sheet ? 13.5 : 13}px Manrope,sans-serif`, { flex: sheet ? 1 : undefined, color: "var(--tl-action)" })}>{L.askRow}</span>
        </div>
      </div>
      <span style={{ display: "flex", alignItems: "center", gap: 7, padding: "2px 2px 0", font: `700 10.5px ${MONO}`, letterSpacing: ".1em", color: "rgba(11,14,18,.5)" }}><Icon name="globe" size={14} color="rgba(11,14,18,.5)" />{L.nw}</span>
    </div>
  );
  const entrada: CSSProperties = { height: sheet ? 48 : 46, boxSizing: "border-box", padding: "0 14px", borderRadius: sheet ? 14 : 13, border: "1.5px solid rgba(11,14,18,.14)", outline: "none", font: `600 ${sheet ? 15 : 14.5}px Manrope,sans-serif`, color: "var(--tl-ink)", background: "var(--tl-white)" };
  const misPed = mios.length ? (
    <div style={{ display: "flex", flexDirection: "column", gap: sheet ? 8 : 6 }}><span style={K}>{L.askMine}</span>
      {mios.map((x) => (
        <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: sheet ? "10px 12px" : "9px 12px", borderRadius: sheet ? 13 : 12, border: "1px solid rgba(11,14,18,.08)" }}>
          <Icon name="bell" size={sheet ? 15 : 14} color="var(--tl-action)" /><span style={txt(`700 ${sheet ? 13 : 12.5}px Manrope,sans-serif`, { flex: 1 })}>{x.t}</span>
          <span role="button" onClick={() => quitar(x.id)} style={txt(`700 ${sheet ? 12 : 11.5}px Manrope,sans-serif`, { color: "rgba(11,14,18,.55)", cursor: "pointer" })}>{L.remove}</span>
        </div>))}
    </div>) : null;
  const listo = askDone ? (sheet ? (
    <div style={{ padding: "22px 18px", borderRadius: 20, background: "var(--tl-paper)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", animation: "cFade .25s" }}>
      <span style={{ width: 54, height: 54, borderRadius: 99, background: "var(--tl-open)", display: "grid", placeItems: "center" }}><Icon name="check" size={24} strokeWidth={2.6} color="var(--tl-white)" /></span>
      <span style={txt("800 20px/1.2 Sora,sans-serif", { letterSpacing: "-.03em" })}>{ask.doneT}</span>
      <span style={txt("500 13px/1.55 Manrope,sans-serif", { color: "rgba(11,14,18,.62)", textWrap: "pretty" } as CSSProperties)}>{ask.doneS}</span>
    </div>
  ) : (
    <div style={{ padding: 18, borderRadius: 18, background: "var(--tl-paper)", display: "flex", gap: 12, alignItems: "flex-start", animation: "cFade .25s" }}>
      <span style={{ width: 36, height: 36, borderRadius: 99, background: "var(--tl-open)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="check" size={17} strokeWidth={2.6} color="var(--tl-white)" /></span>
      <span style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={txt("800 16px Sora,sans-serif", { letterSpacing: "-.02em" })}>{ask.doneT}</span><span style={txt("500 12.5px/1.5 Manrope,sans-serif", { color: "rgba(11,14,18,.62)" })}>{ask.doneS}</span></span>
    </div>
  )) : null;
  const formPedir = !askDone ? (
    <div style={{ display: "flex", flexDirection: "column", gap: sheet ? 16 : 12 }}>
      {sheet ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={K}>{L.askCity}</span><input value={askV} onChange={(e) => setAskV(e.target.value)} placeholder={L.askPh} autoComplete="off" aria-label={L.askCity} maxLength={60} style={entrada} /></div>
        : <input value={askV} onChange={(e) => setAskV(e.target.value)} placeholder={L.askPh} autoComplete="off" aria-label={L.askCity} maxLength={60} style={entrada} />}
      {ask.hasSug ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{askSug.map((s) => <Chip key={s} variant="filter" onClick={() => setAskV(s)}>{s}</Chip>)}</div> : null}
      {ask.near ? (
        <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(0,229,196,.12)", display: "flex", flexDirection: sheet ? "column" : "row", alignItems: sheet ? "stretch" : "center", gap: sheet ? 8 : 10, flexWrap: "wrap" }}>
          <span style={txt(`700 ${sheet ? 13 : 12.5}px/1.45 Manrope,sans-serif`, { color: "var(--tl-open-text)", flex: sheet ? undefined : 1, minWidth: sheet ? undefined : 200 })}>{ask.nearT}</span>
          <div style={{ display: "flex" }}><Button size="sm" variant="secondary" onClick={widen}>{E2(`Ampliar a ${ask.widen} mi`, `Widen to ${ask.widen} mi`)}</Button></div>
        </div>) : null}
      {!d.sesion ? (sheet ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={K}>{L.askPhone}</span><input value={askPh} onChange={(e) => setAskPh(e.target.value)} placeholder="(570) 555-0142" inputMode="tel" autoComplete="tel" aria-label={L.askPhone2} maxLength={20} style={entrada} /></div>
        : <input value={askPh} onChange={(e) => setAskPh(e.target.value)} placeholder={L.askPhone2} inputMode="tel" autoComplete="tel" aria-label={L.askPhone2} maxLength={20} style={entrada} />) : null}
      {d.sesion ? <span style={txt(`500 ${sheet ? 13 : 12.5}px/1.5 Manrope,sans-serif`, { color: "rgba(11,14,18,.62)" })}>{ask.userT}</span> : null}
      {error ? <span role="alert" style={txt("700 12.5px/1.5 Manrope,sans-serif", { color: "var(--tl-danger)" })}>{error}</span> : null}
      <span style={txt(`500 ${sheet ? 12.5 : 12}px/1.55 Manrope,sans-serif`, { color: "rgba(11,14,18,.55)", textWrap: "pretty" } as CSSProperties)}>{L.askWhy}</span>
      {!sheet ? <div style={{ display: "flex" }}><Button size="md" icon="bell" disabled={askDis} onClick={enviar}>{E2("Avísame", "Notify me")}</Button></div> : null}
    </div>) : null;
  const pie = (
    <>
      <div style={{ display: "flex" }}><Button block size={sheet ? undefined : "md"} disabled={foot.dis} icon={foot.icon} onClick={foot.onClick}>{foot.l}</Button></div>
      {foot.reset ? <span role="button" onClick={foot.onReset} style={txt(`700 ${sheet ? 12.5 : 12}px Manrope,sans-serif`, { textAlign: "center", color: "rgba(11,14,18,.6)", cursor: "pointer" })}>{L.reset}</span> : null}
    </>
  );

  if (sheet) return (
    <div data-screen-label="APP-CIUDAD · móvil" role="dialog" aria-modal="true" aria-label={head.t} style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <style>{KF_CIUDAD}</style>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(11,14,18,.45)", animation: "cFade .2s ease-out" }} />
      <div style={{ position: "relative", height: "calc(100% - 54px)", background: "var(--tl-white)", borderRadius: "26px 26px 0 0", display: "flex", flexDirection: "column", overflow: "hidden", animation: "cUp .26s ease-out" }}>
        <div style={{ flex: "none", padding: "10px 20px 12px", borderBottom: "1px solid rgba(11,14,18,.07)" }}>
          <div style={{ width: 38, height: 5, borderRadius: 99, background: "rgba(11,14,18,.15)", margin: "0 auto 12px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {inAsk ? <span role="button" aria-label={L.back} onClick={() => { setView("main"); setAskDone(null); }} style={{ width: 36, height: 36, marginLeft: -8, display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="chevronLeft" size={20} strokeWidth={2} /></span> : null}
            <span style={txt("800 22px/1.15 Sora,sans-serif", { flex: 1, minWidth: 0, letterSpacing: "-.035em" })}>{head.t}</span>
            <span role="button" aria-label={E2("Cerrar", "Close")} onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, background: "var(--tl-paper)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="close" size={15} strokeWidth={2.2} /></span>
          </div>
          <span style={txt("500 13px/1.5 Manrope,sans-serif", { display: "block", marginTop: 4, color: "rgba(11,14,18,.6)" })}>{head.s}</span>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", scrollbarWidth: "none" }}>
          {!inAsk ? (
            <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 22 }}>
              {buscador}
              {!q ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                  {filaGps}
                  {desde}
                  <RadiusMap {...base} foot={on ? L.casaNote : undefined} />
                  {lista}
                  <div style={{ padding: 14, borderRadius: 16, background: "var(--tl-paper)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ display: "grid", flex: "none", paddingTop: 2 }}><Icon name="users" size={17} color="rgba(11,14,18,.6)" /></span>
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={txt("700 13px Manrope,sans-serif")}>{my.t}</span>
                      <span style={txt("500 12.5px/1.5 Manrope,sans-serif", { color: "rgba(11,14,18,.62)", textWrap: "pretty" } as CSSProperties)}>{my.s}</span>
                      {my.a ? <span role="button" onClick={irMiCiudad} style={txt("700 12.5px Manrope,sans-serif", { color: "var(--tl-action)", cursor: "pointer" })}>{my.a}</span> : null}
                    </span>
                  </div>
                </div>) : null}
            </div>
          ) : (
            <div style={{ padding: "18px 20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>{formPedir}{listo}{misPed}</div>
          )}
        </div>
        <div style={{ flex: "none", padding: "12px 20px calc(22px + env(safe-area-inset-bottom))", borderTop: "1px solid rgba(11,14,18,.08)", background: "rgba(247,246,243,.96)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", display: "flex", flexDirection: "column", gap: 8 }}>{pie}</div>
      </div>
    </div>
  );

  // Escritorio: ventana bajo el botón de ciudad del encabezado.
  return (
    <>
      <style>{KF_CIUDAD}</style>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(11,14,18,.32)", animation: "cFade .2s ease-out" }} />
      <div data-screen-label="APP-CIUDAD · desktop" role="dialog" aria-modal="true" aria-label={head.t}
        style={{ position: "fixed", top: ancla?.top ?? 80, left: ancla?.left ?? 24, zIndex: 61, width: 780, maxWidth: "calc(100vw - 32px)", background: "var(--tl-white)", borderRadius: 22, border: "1px solid rgba(11,14,18,.08)", boxShadow: "0 30px 70px -24px rgba(11,14,18,.45)", overflow: "hidden", animation: "cDrop .18s ease-out", cursor: "default" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px" }}>
          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18, maxHeight: 560, overflowY: "auto", scrollbarWidth: "thin" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={txt("800 20px Sora,sans-serif", { letterSpacing: "-.03em" })}>{head.t}</span><span style={txt("500 12.5px/1.5 Manrope,sans-serif", { color: "rgba(11,14,18,.6)" })}>{head.s}</span></div>
            {!inAsk ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {buscador}
                {!q ? <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>{filaGps}{desde}{lista}</div> : null}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <span role="button" onClick={() => { setView("main"); setAskDone(null); }} style={txt("700 13px Manrope,sans-serif", { display: "flex", alignItems: "center", gap: 6, color: "var(--tl-action)", cursor: "pointer" })}><Icon name="chevronLeft" size={15} strokeWidth={2} />{L.back}</span>
                {formPedir}{listo}{misPed}
              </div>
            )}
          </div>
          <div style={{ borderLeft: "1px solid rgba(11,14,18,.07)", background: "var(--tl-paper-3)", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <RadiusMap desk {...base} />
            {!on ? <span style={txt("500 12.5px/1.55 Manrope,sans-serif", { color: "rgba(11,14,18,.65)" })}>{E2(`${city.n} aún no tiene negocios publicados. Al elegirla ves lo que falta para abrir y puedes anotarte.`, `${city.n} has no listed businesses yet. Choosing it shows what’s left to open and lets you join the list.`)}</span> : null}
            <div style={{ flex: 1 }} />
            {pie}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 20px", borderTop: "1px solid rgba(11,14,18,.07)", font: "500 12px Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>
          <Icon name="users" size={15} color="rgba(11,14,18,.5)" /><span style={{ flex: 1, minWidth: 0 }}>{my.short}</span>
          {my.a ? <span role="button" onClick={irMiCiudad} style={txt("700 12px Manrope,sans-serif", { color: "var(--tl-action)", cursor: "pointer", whiteSpace: "nowrap" })}>{my.a}</span> : null}
          <span style={txt(`700 9.5px ${MONO}`, { letterSpacing: ".1em", color: "rgba(11,14,18,.42)" })}>{L.esc}</span>
        </div>
      </div>
    </>
  );
}

function Fondo({ onClose }: { onClose: () => void }) {
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(11,14,18,.45)" }}><style>{KF_CIUDAD}</style></div>;
}
