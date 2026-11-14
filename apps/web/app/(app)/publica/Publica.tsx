"use client";
/* ONB-NEG · Publica tu negocio v2 (diseño «To'Latino Publica tu negocio v2»): entrada con teléfono, 5 pasos (tu negocio,
   lo propio de tu categoría, lo que vendes, dónde y cuándo, tu foto y tu página) y «publicada». Teléfono: barra arriba y
   botón fijo abajo. Escritorio: pasos a la izquierda, tu página en vivo a la derecha. El borrador se guarda solo, en el
   servidor (para seguir desde otro teléfono) y en este equipo. */
import * as UI from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { empezarDeNuevo, guardarBorrador, leerBorrador, negocioIgual, publicar } from "./acciones";
import { cap, D0, dig, F, Fl, fmtPh, items, ok, opOf, own, SEQ, subL, X, zoneOf, type Borrador, type Paso } from "./logica";
import { K, PasoB1, PasoC1, type UiB } from "./PasosBC";
import { PasoD1, PasoE1 } from "./PasosDE";
import { fechasPrueba, foto, PasoF1, PasoH1, type Publicado } from "./PasosFH";
import { vista } from "./vista";

import { tec } from "@/lib/tec";
type N = "Icon" | "Button" | "Tag" | "OnbTopBar" | "OnbPhases" | "OnbProgress" | "OnbActionBar" | "BusinessPreview";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Tag, OnbTopBar, OnbPhases, OnbProgress, OnbActionBar, BusinessPreview } = UI as unknown as Record<N, ComponentType<any>>;
const KEY = "tl-onb-neg-v2";
const KF = "@keyframes oFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes pvFade{from{opacity:0}to{opacity:1}}.ohs{scrollbar-width:none}.ohs::-webkit-scrollbar{display:none}";

export type VistaPublica = {
  lang: "es" | "en"; ciudad: string; ciudadId: string;
  usuario: { nombre: string; primero: string } | null;
  inicial: { paso: string; d: Partial<Borrador> } | null; publicado: Publicado | null; prueba: boolean;
};
async function enviar(url: string, cuerpo: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
  return (await r.json()) as { ok: boolean; mensaje?: { es: string; en: string }; codigoPrueba?: string; nombre?: string | null } & Record<string, unknown>;
}
function useAncho() {
  const [w, setW] = useState(0);
  useEffect(() => { const f = () => setW(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return w;
}
const leerLocal = (): Partial<Borrador> | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; } };

export function Publica({ v }: { v: VistaPublica }) {
  const es = v.lang === "es", E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ruta = usePathname(), sp = useSearchParams();
  const dw = useAncho(), desk = dw >= 1024;
  const [usuario, setUsuario] = useState(v.usuario);
  const [d, setD] = useState<Borrador>(() => ({ ...D0(), ...(v.inicial?.d ?? {}) }));
  const [publicado, setPublicado] = useState<Publicado | null>(v.publicado);
  const [ui, setUiState] = useState<UiB & { ph: string; cd: string; codeSent: boolean; sendN: number; back: boolean; bkName: string; needName: boolean; fn: string; ln: string; askNew: boolean; err: string | null; busy: boolean; prueba: string | null }>(
    { q: "", allCats: false, moreSubs: false, dupOk: false, ph: "", cd: "", codeSent: false, sendN: 0, back: false, bkName: "", needName: false, fn: "", ln: "", askNew: false, err: null, busy: false, prueba: null });
  const setUi = useCallback((p: Partial<typeof ui>) => setUiState((x) => ({ ...x, ...p })), []);
  const [toastT, setToastT] = useState<string | null>(null);
  const tt = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((t: string) => { if (tt.current) clearTimeout(tt.current); setToastT(t); tt.current = setTimeout(() => setToastT(null), 2600); }, []);
  const [dup, setDup] = useState<{ id: string; name: string } | null>(null);

  // Sin cuenta: el borrador de este equipo (si dejó algo antes de entrar).
  useEffect(() => { if (!v.usuario && !v.inicial) { const l = leerLocal(); if (l) setD((x) => ({ ...x, ...l })); } }, [v.usuario, v.inicial]);

  // Guardado: en este equipo al instante; en el servidor con una pausa (y solo con cuenta).
  const paso0 = useRef<string>("B1");
  const guardaT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const up = useCallback((p: Partial<Borrador> | ((x: Borrador) => Partial<Borrador>)) => setD((x) => {
    const n = { ...x, ...(typeof p === "function" ? p(x) : p) };
    try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* sin espacio: sigue en el servidor */ }
    return n;
  }), []);
  useEffect(() => {
    if (!usuario || publicado || !d.started) return;
    if (guardaT.current) clearTimeout(guardaT.current);
    guardaT.current = setTimeout(() => { void guardarBorrador(paso0.current, d as unknown as Record<string, unknown>); }, 700);
  }, [d, usuario, publicado]);

  // ¿Ya existe ese nombre en la ciudad? (lo decide el servidor)
  // «Reclámalo gratis» (fila SIN RECLAMAR de una categoría): la semilla viaja en el borrador hasta publicar.
  useEffect(() => { const s0 = sp.get("semilla"); if (s0 && /^\d{1,18}$/.test(s0)) setD((x) => (x.semilla === s0 ? x : { ...x, semilla: s0 })); }, [sp]);
  useEffect(() => { const n = (d.name || "").trim(); if (n.length < 3) { setDup(null); return; } let vivo = true; const t = setTimeout(() => negocioIgual(n).then((r) => { if (vivo) setDup(r); }), 350); return () => { vivo = false; clearTimeout(t); }; }, [d.name]);

  // ── En qué paso estamos (mismas reglas del prototipo) ──
  const pedido = (sp.get("paso") ?? "A1").toUpperCase();
  const st: Paso = useMemo(() => {
    let s = (["A1", "H1", ...SEQ] as string[]).includes(pedido) ? (pedido as Paso) : "A1";
    if (s === "H1") return publicado ? "H1" : !usuario ? "A1" : d.cat ? "F1" : "B1";
    if (publicado) return "A1";
    if (s === "A1") return !usuario || ui.back || (d.started && d.cat) ? "A1" : "B1";
    if (!usuario) return "A1";
    if (s !== "B1" && !d.cat) s = "B1";
    return s;
  }, [pedido, publicado, usuario, ui.back, d.started, d.cat]);
  paso0.current = st;
  const idx = (SEQ as readonly string[]).indexOf(st), flow = idx >= 0;
  const dupPend = !!dup && !ui.dupOk;

  const go = useCallback((s: Paso) => {
    const i = (SEQ as readonly string[]).indexOf(s);
    if (i >= 0 && !publicado) up((x) => ({ last: s, reach: Math.max(x.reach || 0, i), started: true, t0: x.t0 || Date.now() }));
    setUi({ q: "", allCats: false, moreSubs: false, askNew: false });
    router.push(`${ruta}?paso=${s}`, { scroll: true });
  }, [publicado, up, setUi, router, ruta]);
  const salir = () => router.push("/");
  const atras = () => {
    if (st === "A1") { if (ui.needName || ui.codeSent) return setUi({ codeSent: false, cd: "", needName: false, err: null }); return salir(); }
    if (st === "H1" || idx <= 0) return salir();
    go(SEQ[idx - 1]!);
  };
  const siguiente = () => { if (!ok(st, d, dupPend)) return; const i = idx; if (i >= 0 && i < SEQ.length - 1) go(SEQ[i + 1]!); };

  // ── Entrar con el teléfono (las mismas rutas de cuenta que «Entrar») ──
  const tras = useCallback(async (nombre: { nombre: string; primero: string }) => {
    setUsuario(nombre);
    const s = await leerBorrador();
    if (s?.negocio) { router.refresh(); return; }
    const servidor = s && (s.d as Partial<Borrador>)?.started ? (s.d as Partial<Borrador>) : null;
    const local = leerLocal();
    const elegido = servidor ?? local ?? null;
    if (elegido) setD((x) => ({ ...x, ...elegido }));
    setUi({ back: false, needName: false, codeSent: false, cd: "" });
    const last = elegido?.started && SEQ.includes(elegido.last as never) ? (elegido.last as Paso) : "B1";
    go(last);
  }, [go, router, setUi]);
  const pedirCodigo = async (reenvio = false) => {
    setUi({ busy: true, err: null });
    const r = await enviar("/api/cuenta/codigo", { telefono: dig(ui.ph) });
    setUi({ busy: false });
    if (!r.ok) return setUi({ err: r.mensaje ? r.mensaje[v.lang] : E2("Algo falló.", "Something failed.") });
    setUi({ codeSent: true, cd: "", prueba: (r.codigoPrueba as string) ?? null, sendN: reenvio ? ui.sendN + 1 : ui.sendN });
  };
  const verificar = async () => {
    setUi({ busy: true, err: null });
    const r = await enviar("/api/cuenta/verificar", { telefono: dig(ui.ph), codigo: dig(ui.cd) });
    setUi({ busy: false });
    if (!r.ok) return setUi({ err: r.mensaje ? r.mensaje[v.lang] : E2("Algo falló.", "Something failed.") });
    if (r.nombre) { const n = String(r.nombre), p = n.split(" ")[0] ?? n; setUi({ back: true, bkName: p }); setTimeout(() => void tras({ nombre: n, primero: p }), 1500); return; }
    setUi({ needName: true });
  };
  const guardarNombre = async () => {
    const fn = ui.fn.trim(), ln = ui.ln.trim(); if (!fn || !ln) return;
    setUi({ busy: true, err: null });
    const r = await enviar("/api/cuenta/perfil", { nombre: fn, apellido: ln, apodo: "" });
    setUi({ busy: false });
    if (!r.ok) return setUi({ err: r.mensaje ? r.mensaje[v.lang] : E2("Algo falló.", "Something failed.") });
    void tras({ nombre: `${fn} ${ln[0]}.`, primero: fn });
  };
  const reiniciar = async () => { await empezarDeNuevo(); const n = D0(); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* */ } setD(n); setUi({ askNew: false }); go("B1"); };

  // ── Textos de cada paso ──
  const f = F(d), c = d.cat ? X.CFG[d.cat] : null, kc = d.cat ? X.cat(d.cat) : null, o = own(d), op = d.cat ? opOf(d) : "local", its = d.cat ? items(d) : [];
  const IW: Record<string, [string, string]> = { "NEG-NOCHE": ["opciones", "options"], "NEG-FIESTA": ["paquetes y artículos", "packages and items"] };
  const iwP = (d.cat && IW[d.cat]) || (c && c.items), iw = iwP ? E2(iwP[0], iwP[1]) : E2("servicios", "services");
  const sellT = f ? E2(f.sell.t[0], f.sell.t[1]) : E2("Lo que vendes", "What you sell"), ownK = f ? E2(f.own.k[0], f.own.k[1]) : E2("LO PROPIO", "YOUR DETAILS");
  const NAMES = [E2("Tu negocio", "Your business"), cap(ownK.toLowerCase()), sellT, E2("Dónde y cuándo", "Where and when"), E2("Tu página", "Your page")];
  const TOPN = [E2("TU NEGOCIO", "YOUR BUSINESS"), ownK, sellT.replace(/^(Tus?|Tu|Your)\s+/i, "").toUpperCase(), E2("DÓNDE Y CUÁNDO", "WHERE AND WHEN"), E2("TU PÁGINA", "YOUR PAGE")];
  const segs = flow ? SEQ.map((_, i) => (i < idx ? "done" : i === idx ? "cur" : "next")) : [];
  const saved = d.started ? E2("GUARDADO", "SAVED") : "";
  const label = flow ? `${E2("PASO ", "STEP ")}${idx + 1}${E2(" DE 5 · ", " OF 5 · ")}${TOPN[idx]}` : E2("PUBLICA TU NEGOCIO", "LIST YOUR BUSINESS");
  const len = d.promoOk ? 60 : 30;
  const subsDone = [
    d.cat ? ((kc ? (es ? kc[1] : kc[2]) : "") + (d.subs[0] ? " · " + subL(d.cat, d.subs[0], es) : "")).toUpperCase() : "",
    f && Fl.valid(d.cat, d.own, d) && (d.reach || 0) >= 1 ? f.sum(o, es) : "",
    its.length && (d.reach || 0) >= 2 ? its.length + " " + iw.toUpperCase() : "",
    (d.reach || 0) >= 3 ? (op === "casa" ? zoneOf(d) + (es ? " MILLAS" : " MILES") : String(d.addr || "").toUpperCase()) : "",
    E2(`PRO ${len} DÍAS GRATIS`, `PRO FREE FOR ${len} DAYS`),
  ];
  const pv = useMemo(() => vista(d, es, { ciudad: v.ciudad, usuario, foto }), [d, es, v.ciudad, usuario]);

  const H = { show: true, tag: "", eye: desk ? (flow ? `${E2("PASO ", "STEP ")}${idx + 1}${E2(" DE 5", " OF 5")}` : E2("PUBLICA TU NEGOCIO", "LIST YOUR BUSINESS")) : "", t: "", s: "" };
  const goB = { label: E2("Seguir", "Continue"), disabled: false, onClick: siguiente };
  let alt: { label: string; onClick: () => void } | null = null, note = "";
  const ph = dig(ui.ph), cd = dig(ui.cd).slice(0, 6);
  if (st === "A1") {
    if (!usuario && !ui.back) {
      if (ui.needName) { H.t = E2("¿Cómo te llamas?", "What's your name?"); H.s = E2("Es tu cuenta de To'Latino: con ella entras a tu panel y a la app.", "It's your To'Latino account: you use it for your dashboard and the app."); goB.disabled = !ui.fn.trim() || !ui.ln.trim() || ui.busy; goB.onClick = () => void guardarNombre(); }
      else {
        H.t = E2("Publica tu negocio en 5 minutos", "List your business in 5 minutes"); H.s = E2("Entra con tu teléfono: te mandamos un código por texto, sin contraseñas.", "Sign in with your phone: we text you a code, no passwords.");
        if (ui.codeSent) { goB.label = E2("Verificar", "Verify"); goB.disabled = cd.length !== 6 || ui.busy; goB.onClick = () => void verificar(); }
        else { goB.label = E2("Enviarme el código", "Text me the code"); goB.disabled = ph.length !== 10 || ui.busy; goB.onClick = () => void pedirCodigo(); }
      }
    } else if (ui.back) { H.show = false; goB.onClick = () => void tras({ nombre: ui.bkName, primero: ui.bkName }); }
    else if (publicado) {
      H.tag = E2("PUBLICADA", "LIVE"); H.t = publicado.nombre + E2(` ya sale en ${v.ciudad}`, ` is live in ${v.ciudad}`); H.s = E2("Lo demás lo completas en tu panel cuando quieras.", "Finish the rest in your dashboard whenever you want.");
      goB.label = E2("Ir a mi panel", "Go to my dashboard"); goB.onClick = () => router.push(`/panel/${publicado.id}`);
    } else {
      H.t = E2("Sigue donde lo dejaste", "Pick up where you left off"); H.s = E2("Todo lo que llenaste está guardado.", "Everything you filled in is saved.");
      goB.label = E2("Seguir donde lo dejé", "Continue where I left off"); goB.onClick = () => go((SEQ as readonly string[]).includes(d.last) ? (d.last as Paso) : "B1");
      alt = { label: E2("Empezar de nuevo", "Start over"), onClick: () => setUi({ askNew: true }) };
    }
  }
  if (st === "B1") { H.t = E2("¿Qué tipo de negocio tienes?", "What kind of business do you have?"); H.s = E2("Con esto armamos lo demás: tus preguntas, tu lista y tu página.", "Everything else builds from this: your questions, your list and your page.");
    if (!d.cat) note = E2("ELIGE TU CATEGORÍA", "PICK YOUR CATEGORY"); else if (!(d.subs || []).length) note = E2("ELIGE QUÉ HACES", "PICK WHAT YOU DO"); else if ((d.name || "").trim().length < 2) note = E2("FALTA EL NOMBRE", "NAME MISSING"); else if (dupPend) note = E2("DINOS SI ES TUYO", "TELL US IF IT’S YOURS"); }
  if (st === "C1" && f) { const W = f.word ? f.word(d.subs) : null; H.t = E2(f.own.t[0], f.own.t[1]).replace("{w}", W ? E2(W[0], W[1]) : E2("tu negocio", "your business")); H.s = E2(f.own.s[0], f.own.s[1]); if (!Fl.valid(d.cat, d.own, d)) note = E2("RESPONDE LO QUE FALTA", "ANSWER WHAT’S MISSING"); }
  if (st === "D1" && f) { const who = (f.sell.whoF && f.sell.whoF(d.subs)) || f.sell.who, on = its.length; H.t = sellT; H.s = E2(`La lista de ${who[0]} de ${v.ciudad}. Marca lo que haces y ajusta tu precio.`, `The list from ${who[1]} in ${v.ciudad}. Check what you do and set your price.`);
    if (!on) note = E2("MARCA AL MENOS UNO", "CHECK AT LEAST ONE"); else goB.label = on === 1 ? E2("Seguir · 1 marcado", "Continue · 1 checked") : `${E2("Seguir · ", "Continue · ")}${on} ${iw}`; }
  if (st === "E1") { H.t = E2("¿Dónde y cuándo?", "Where and when?"); H.s = E2("Así saben dónde estás y si estás abierto ahora.", "So people know where you are and whether you are open now.");
    if (!ok("E1", d)) note = op === "rento" && !(d.join || d.joinName) ? E2("ELIGE EL NEGOCIO", "PICK THE BUSINESS") : d.addr.trim().length < 4 && op !== "casa" ? E2("FALTA LA DIRECCIÓN", "ADDRESS MISSING") : E2("MARCA AL MENOS UN DÍA", "TURN ON AT LEAST ONE DAY"); }
  if (flow && !ok(st, d, dupPend)) goB.disabled = true;

  // F1 (tu foto y tu página) y H1 (publicada): textos del diseño; publicar lo hace el servidor.
  const [publicando, setPublicando] = useState(false);
  const fechas = fechasPrueba(len, es);
  if (st === "F1") {
    H.t = E2("Una foto y listo", "One photo and done"); H.s = E2("Es la portada de tu página: tu local, tu fachada o tu trabajo. Tómala ahora.", "It’s your page cover: your place, your storefront or your work. Take it now.");
    goB.label = E2(`Publicar · ${len} días de Pro gratis`, `Publish · ${len} days of Pro free`);
    note = d.cover ? E2(`SIN TARJETA · TE AVISAMOS EL ${fechas.aviso.toUpperCase()}`, `NO CARD · WE REMIND YOU ON ${fechas.aviso.toUpperCase()}`) : E2("FALTA TU FOTO", "PHOTO MISSING");
    goB.disabled = !d.cover || publicando;
    goB.onClick = async () => {
      if (!d.cover || publicando) return;
      setPublicando(true);
      const r = await publicar(d);
      setPublicando(false);
      if (!r.ok) { toast(r.mensaje[v.lang]); if (r.paso) go(r.paso as Paso); return; }
      try { localStorage.removeItem(KEY); } catch { /* */ }
      setPublicado(r.negocio); router.push(`${ruta}?paso=H1`);
    };
  }
  if (st === "H1" && publicado) {
    const mins = publicado.minutos;
    H.tag = E2("PUBLICADA", "LIVE"); H.t = publicado.nombre + E2(` ya sale en ${v.ciudad}`, ` is live in ${v.ciudad}`);
    H.s = mins && mins <= 30 ? E2(`Te tomó ${mins} ${mins === 1 ? "minuto" : "minutos"}. Lo demás lo completas en tu panel cuando quieras.`, `It took you ${mins} minute${mins === 1 ? "" : "s"}. Finish the rest in your dashboard whenever you want.`) : E2("Lo demás lo completas en tu panel cuando quieras.", "Finish the rest in your dashboard whenever you want.");
    goB.label = E2("Ir a mi panel", "Go to my dashboard"); goB.onClick = () => router.push(`/panel/${publicado.id}`);
    note = E2(`PRO GRATIS HASTA EL ${publicado.hasta.toUpperCase()} · SIN TARJETA`, `PRO FREE UNTIL ${publicado.hasta.toUpperCase()} · NO CARD`);
  }
  const cuerpoF1 = st === "F1" ? <PasoF1 d={d} up={up} es={es} desk={desk} dw={dw} pv={pv} fechas={fechas} len={len} toast={toast} /> : null;
  const cuerpoH1 = st === "H1" && publicado ? <PasoH1 p={publicado} d={d} es={es} pv={pv} toast={toast} /> : null;

  const pvR = desk && dw >= 960 && (flow || st === "H1"), rail = desk && dw >= 1200 && flow;
  const L = desk
    ? { bg: "var(--tl-paper)", cols: rail ? "232px minmax(0,1fr) 372px" : pvR ? (dw >= 1100 ? "minmax(0,1fr) 372px" : "minmax(0,1fr) 340px") : "minmax(0,1fr)", gap: "36px", maxW: rail ? "1320px" : pvR ? "1060px" : "620px", pad: "32px 32px 72px", mainBg: "var(--tl-white)", mainR: "22px", mainBd: "1px solid rgba(11,14,18,.07)", mainPad: dw >= 1100 ? "32px 36px" : "26px 26px" }
    : { bg: "var(--tl-white)", cols: "minmax(0,1fr)", gap: "0", maxW: "none", pad: "18px 20px 120px", mainBg: "transparent", mainR: "0", mainBd: "none", mainPad: "0" };
  const phases = SEQ.map((x, i) => ({ mark: String(i + 1), title: NAMES[i], sub: subsDone[i] || "", state: i < idx ? "done" : i === idx ? "cur" : "next", onClick: i !== idx && i <= (d.reach || 0) && (i < idx || ok(SEQ[idx]!, d, dupPend)) ? () => go(x) : undefined }));
  const barra = { back: flow || (st === "A1" && (ui.codeSent || ui.needName)) ? { label: E2("Atrás", "Back"), onClick: atras } : null, note, alt, go: goB };

  if (!dw) return <div style={{ minHeight: 600, background: "var(--tl-white)" }} />;
  const a1 = st === "A1";
  return (
    <div data-screen-label={`ONB-NEG-${st}${desk ? " · desktop" : " · móvil"}`} style={{ minHeight: "100%", background: L.bg, fontFamily: "Manrope,system-ui,sans-serif", color: "var(--tl-ink)", boxSizing: "border-box" }}>
      <style>{KF}</style>
      {!desk && st !== "H1" && !(a1 && ui.back) ? <OnbTopBar label={label} saved={saved} segments={segs} onBack={atras} onExit={salir} /> : null}
      <div style={{ display: "grid", gridTemplateColumns: L.cols, gap: L.gap, maxWidth: L.maxW, margin: "0 auto", padding: L.pad, alignItems: "start", boxSizing: "border-box" }}>
        {rail ? <aside data-screen-label="Publica tu negocio · pasos" style={{ minWidth: 0 }}><div style={{ position: "sticky", top: 172 }}><OnbPhases label={E2("PUBLICA TU NEGOCIO", "LIST YOUR BUSINESS")} saved={d.started ? E2("GUARDADO · SIGUES CUANDO QUIERAS", "SAVED · CONTINUE ANYTIME") : ""} exitLabel={E2("Salir y seguir después", "Exit and continue later")} onExit={salir} phases={phases} /></div></aside> : null}
        <main style={{ minWidth: 0, background: L.mainBg, borderRadius: L.mainR, border: L.mainBd, padding: L.mainPad, boxSizing: "border-box" }}>
          {desk && !rail && flow ? <div style={{ marginBottom: 22 }}><OnbProgress label={label} saved={saved} segments={segs} /></div> : null}
          {H.show ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20, animation: "oFade .2s ease-out" }}>
              {H.tag ? <div style={{ display: "flex", marginBottom: 4 }}><Tag tone="signal">{H.tag}</Tag></div> : null}
              {H.eye ? <div style={{ font: "700 10px 'JetBrains Mono',monospace", letterSpacing: ".14em", color: "rgba(11,14,18,.5)" }}>{H.eye}</div> : null}
              <h1 style={{ margin: 0, font: "800 27px/1.12 Sora,sans-serif", letterSpacing: "-.04em" }}>{H.t}</h1>
              {H.s ? <div style={{ font: "500 14px/1.55 Manrope,sans-serif", color: "rgba(11,14,18,.64)" }}>{H.s}</div> : null}
            </div>
          ) : null}

          {a1 ? (
            <div data-screen-label="ONB-NEG-A1 · entrada" style={{ display: "flex", flexDirection: "column", gap: 14, animation: "oFade .2s ease-out" }}>
              {!usuario && !ui.back ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {!ui.codeSent && !ui.needName ? (
                    <div style={{ display: "flex", flexDirection: "column", padding: "4px 14px", borderRadius: 16, background: "var(--tl-paper)" }}>
                      {[["star", E2("Pro 30 días gratis, sin tarjeta", "Pro free for 30 days, no card")], ["clock", E2("Publicas con lo mínimo; lo demás, después", "Publish the basics; finish later")], ["phone", E2("Un solo teléfono para tu cuenta y tu negocio", "One phone for your account and your business")]].map(([icon, t]) => (
                        <div key={icon} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 0" }}><span style={{ width: 30, height: 30, borderRadius: 10, background: "var(--tl-white)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={icon} size={15} color="var(--tl-action)" /></span><span style={{ font: "600 13.5px/1.4 Manrope,sans-serif" }}>{t}</span></div>
                      ))}
                    </div>
                  ) : null}
                  {d.started && d.cat && !ui.needName ? <div style={{ padding: "11px 13px", borderRadius: 14, background: "rgba(75,55,245,.07)", font: "600 13px/1.45 Manrope,sans-serif" }}>{E2(`«${d.name || "Tu negocio"}» está guardado. Entra para seguir donde lo dejaste.`, `“${d.name || "Your business"}” is saved. Sign in to pick up where you left off.`)}</div> : null}
                  {!ui.needName ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      <span style={K}>{E2("TU TELÉFONO", "YOUR PHONE")}</span>
                      <div style={{ height: 52, boxSizing: "border-box", borderRadius: 14, border: `1.5px solid ${!ui.codeSent && ph.length === 10 ? "var(--tl-ink)" : "rgba(11,14,18,.14)"}`, background: "var(--tl-white)", padding: "0 14px", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ font: "700 15px Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>+1</span>
                        <input value={fmtPh(ph)} onChange={(e) => setUi({ ph: dig(e.target.value).slice(0, 10), err: null })} inputMode="numeric" autoComplete="tel" placeholder="(570) 555-0134" readOnly={ui.codeSent} aria-label={E2("Tu teléfono", "Your phone")} style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "none", font: "600 16px Manrope,sans-serif", color: "var(--tl-ink)" }} />
                        {ui.codeSent ? <span role="button" onClick={() => setUi({ codeSent: false, cd: "", err: null })} {...tec(() => setUi({ codeSent: false, cd: "", err: null }))} style={{ font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{E2("Cambiar", "Change")}</span> : null}
                      </div>
                    </div>
                  ) : null}
                  {ui.codeSent && !ui.needName ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      <span style={K}>{E2("CÓDIGO DE 6 NÚMEROS", "6-DIGIT CODE")}</span>
                      <input value={cd} onChange={(e) => setUi({ cd: dig(e.target.value).slice(0, 6), err: null })} inputMode="numeric" autoComplete="one-time-code" placeholder="······" aria-label={E2("Código", "Code")} style={{ height: 56, boxSizing: "border-box", borderRadius: 14, border: `1.5px solid ${cd.length === 6 ? "var(--tl-ink)" : "var(--tl-action)"}`, background: "var(--tl-white)", padding: "0 18px", outline: "none", font: "800 24px Sora,sans-serif", letterSpacing: ".5em", color: "var(--tl-ink)", width: "100%" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, font: "600 12.5px Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}><span>{E2("Lo mandamos al ", "Sent to ")}{fmtPh(ph)}</span><span role="button" onClick={() => void pedirCodigo(true)} {...tec(() => void pedirCodigo(true))} style={{ fontWeight: 700, color: "var(--tl-action)", cursor: "pointer" }}>{ui.sendN ? E2("Reenviado", "Resent") : E2("Reenviar", "Resend")}</span></div>
                      {ui.prueba ? <div data-modo-pruebas style={{ padding: "8px 12px", borderRadius: 10, border: "1px dashed var(--tl-danger)", font: "600 12.5px Manrope,sans-serif" }}>{E2("Sandbox · código: ", "Sandbox · code: ")}<b style={{ fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".2em" }}>{ui.prueba}</b></div> : null}
                    </div>
                  ) : null}
                  {ui.needName ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, font: "700 10px 'JetBrains Mono',monospace", letterSpacing: ".14em", color: "var(--tl-open-text)" }}><Icon name="check" size={14} color="var(--tl-open-text)" strokeWidth={2.2} />{E2("TELÉFONO VERIFICADO · ", "PHONE VERIFIED · ")}{fmtPh(ph)}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                        {([["fn", E2("NOMBRE", "FIRST NAME"), "Rafael", "given-name"], ["ln", E2("APELLIDO", "LAST NAME"), "Núñez", "family-name"]] as const).map(([k, l, ph2, ac]) => (
                          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}><span style={K}>{l}</span><input value={ui[k]} onChange={(e) => setUi({ [k]: e.target.value.slice(0, 24) } as Partial<typeof ui>)} autoComplete={ac} placeholder={ph2} aria-label={l} style={{ height: 50, boxSizing: "border-box", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", padding: "0 14px", outline: "none", font: "600 15px Manrope,sans-serif", color: "var(--tl-ink)", width: "100%", minWidth: 0 }} /></div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {ui.err ? <div role="alert" style={{ font: "700 13px/1.45 Manrope,sans-serif", color: "var(--tl-danger)" }}>{ui.err}</div> : null}
                  {!ui.needName ? <div style={{ font: "500 12px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Al seguir aceptas los Términos y la Privacidad de To'Latino para negocios. Nunca te pedimos tu estatus ni tu seguro social.", "By continuing you accept To'Latino's Terms and Privacy for businesses. We never ask for your status or social security number.")}</div> : null}
                </div>
              ) : null}
              {ui.back ? (
                <div style={{ minHeight: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
                  <span style={{ width: 72, height: 72, boxSizing: "border-box", borderRadius: 99, border: "2.5px solid var(--tl-signal)", background: "var(--tl-ink)", color: "var(--tl-white)", display: "grid", placeItems: "center", font: "800 24px Sora,sans-serif" }}>{(ui.bkName[0] || "T").toUpperCase()}</span>
                  <div style={{ font: "800 24px/1.15 Sora,sans-serif", letterSpacing: "-.035em" }}>{E2("Qué bueno verte de nuevo, ", "Good to see you again, ")}{ui.bkName}.</div>
                  <div style={{ font: "500 14px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.64)" }}>{E2("Entrando…", "Signing in…")}</div>
                </div>
              ) : null}
              {usuario && !ui.back ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid" }}><BusinessPreview pv={pv} mode="mini" view="pro" lang={v.lang} onOpen={() => publicado ? router.push(`/n/${publicado.id}`) : go((SEQ as readonly string[]).includes(d.last) ? (d.last as Paso) : "B1")} /></div>
                  {!publicado ? (
                    <div style={{ display: "flex", flexDirection: "column", padding: "4px 14px", borderRadius: 16, border: "1px solid rgba(11,14,18,.1)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0" }}>
                        <span style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(75,55,245,.08)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="clock" size={16} color="var(--tl-action)" /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 9.5px 'JetBrains Mono',monospace", letterSpacing: ".12em", color: "rgba(11,14,18,.5)" }}>{E2("PASO ", "STEP ")}{Math.max(0, (SEQ as readonly string[]).indexOf(d.last)) + 1}{E2(" DE 5", " OF 5")}</div><div style={{ marginTop: 3, font: "700 13.5px/1.35 Manrope,sans-serif" }}>{NAMES[Math.max(0, (SEQ as readonly string[]).indexOf(d.last))]}</div></div>
                      </div>
                    </div>
                  ) : null}
                  {ui.askNew ? (
                    <div style={{ padding: 14, borderRadius: 16, background: "rgba(192,57,43,.07)", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ font: "700 13.5px/1.45 Manrope,sans-serif" }}>{E2(`Se borra lo que llenaste de «${d.name || "tu negocio"}».`, `What you filled in for “${d.name || "your business"}” is deleted.`)}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><Button variant="danger" size="sm" onClick={() => void reiniciar()}>{E2("Borrar y empezar", "Delete and start over")}</Button><Button variant="ghost" size="sm" onClick={() => setUi({ askNew: false })}>{E2("Cancelar", "Cancel")}</Button></div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {st === "B1" ? <PasoB1 d={d} up={up} ui={ui} setUi={setUi} es={es} desk={desk} dup={dup} toast={toast} onClaim={() => { if (dup) router.push(`/recuperar/${dup.id}?volver=publica`); }} /> : null}
          {st === "C1" ? <PasoC1 d={d} up={up} es={es} /> : null}
          {st === "D1" ? <PasoD1 d={d} up={up} es={es} /> : null}
          {st === "E1" ? <PasoE1 d={d} up={up} es={es} ciudad={v.ciudad} irA={go} /> : null}
          {cuerpoF1}{cuerpoH1}
          {desk && !(a1 && ui.back) ? <div style={{ marginTop: 24 }}><OnbActionBar {...barra} /></div> : null}
        </main>
        {pvR ? (
          <aside data-screen-label="Publica tu negocio · tu página en vivo" style={{ minWidth: 0 }}>
            <div style={{ position: "sticky", top: 172, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><span style={K}>{E2("TU PÁGINA EN VIVO", "YOUR PAGE, LIVE")}</span><span style={{ font: "800 10px 'JetBrains Mono',monospace", letterSpacing: ".12em", padding: "4px 8px", borderRadius: 8, background: "var(--tl-pro)", color: "var(--tl-pro-ink)" }}>PRO</span></div>
              <div className="ohs" style={{ maxHeight: "calc(100vh - 260px)", overflowY: "auto", borderRadius: 22, border: "1px solid rgba(11,14,18,.08)", background: "var(--tl-white)" }}><BusinessPreview pv={pv} mode="page" view="pro" lang={v.lang} /></div>
              <div style={{ font: "500 12px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>{st === "H1" ? E2(`Así la ven hoy los vecinos de ${v.ciudad}.`, `This is how ${v.ciudad} neighbors see it today.`) : E2("Se arma con lo que llenas. Así te verán los vecinos con Pro.", "It builds as you fill it in. This is how neighbors will see you with Pro.")}</div>
            </div>
          </aside>
        ) : null}
      </div>
      {!desk && !(a1 && ui.back) ? <OnbActionBar fixed note={note || undefined} alt={alt} go={goB} /> : null}
      {toastT ? <div role="status" style={{ position: "fixed", left: "50%", bottom: desk ? 28 : 116, transform: "translateX(-50%)", zIndex: 70, padding: "14px 18px", borderRadius: 15, background: "var(--tl-ink)", color: "var(--tl-white)", font: "700 13px Manrope,sans-serif", maxWidth: 340 }}>{toastT}</div> : null}
    </div>
  );
}
