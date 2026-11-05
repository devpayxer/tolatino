"use client";
/* Panel del negocio v2 (To'Latino Panel negocio v2.dc.html): un marco (barra del negocio y pestañas en el teléfono;
   menú de 264 px, contenido y columna de detalle en escritorio) y un renderizador de bloques (@tolatino/ui · panel).
   Cada sección arma su lista de bloques con los datos que ya calculó el servidor; los cambios van por acciones del
   servidor (acciones.ts) y después se vuelve a leer. Aquí solo se muestra. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelAccion as Accion, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ComponentType, type ReactNode } from "react";
import type { DatosPanel } from "@/lib/panel";
import { aBase, fmtHora, type DiaPanel } from "@/lib/panel-reglas";
import { FOTOS_FREE, ITEMS_FREE, PRECIO_PRO, dinero } from "@/lib/plan";
import { subirFoto } from "@/lib/subir-foto";
import { estado } from "@/lib/tarjeta";
import { aboutGuardar, cerrarPorHoy, fotoQuitar, fotosAgregar, fotosOrden, horarioGuardar, licenciaAgregar, licenciaNumero, licenciaQuitar, logoPoner, noHago, selloCancelar, selloPedir, type Res } from "./acciones";
import { LIC_LEGAL, NO_HAGO } from "@/lib/no-hago";
import { equipoBloques, equipoDetalle } from "./Equipo";

const Icon = UI.Icon as ComponentType<any>;
const Button = UI.Button as ComponentType<any>;
const MONO = "'JetBrains Mono',monospace";

export type Ruta = { sec: "pag" | "hoy"; sub: string | null; det: string | null };
type Bi = [string, string];
/* Apartados de Tu página (PARTS del prototipo). Solo los que ya existen: los demás llegan en sus fases (LAUNCH-CHECKLIST). */
export const PARTS: { k: string; icon: string; l: Bi; s: Bi }[] = [
  { k: "hor", icon: "clock", l: ["Horario", "Hours"], s: ["Tu semana, feriados y vacaciones.", "Your week, holidays and time off."] },
  { k: "fotos", icon: "image", l: ["Fotos y portada", "Photos and cover"], s: ["Portada, logo y galería.", "Cover, logo and gallery."] },
  { k: "about", icon: "quote", l: ["Quiénes somos", "About us"], s: ["Tus palabras y lo que hay en tu negocio.", "Your words and what your place offers."] },
  { k: "equipo", icon: "users", l: ["Equipo", "Team"], s: ["Las personas que salen en tu página.", "The people who show on your page."] },
  { k: "ver", icon: "shield", l: ["Verificación y sello", "Verification and badge"], s: ["Teléfono, correo y el sello Verificado.", "Phone, email and the Verified badge."] },
  { k: "lic", icon: "law", l: ["Tus licencias", "Your licenses"], s: ["Lo que puedes hacer por ley y lo que no haces.", "What you may do by law and what you do not do."] },
];
const HECHOS = new Set(PARTS.map((p) => p.k));
/* «Tus licencias» solo existe para Trámites y profesionales (las que tienen catálogo de licencias). */
const partesDe = (d: DatosPanel) => PARTS.filter((p) => p.k !== "lic" || !!d.lic);
const MES: Bi[] = [["ene", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["abr", "Apr"], ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["ago", "Aug"], ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dic", "Dec"]];
const DIA_L: Bi[] = [["DOMINGO", "SUNDAY"], ["LUNES", "MONDAY"], ["MARTES", "TUESDAY"], ["MIÉRCOLES", "WEDNESDAY"], ["JUEVES", "THURSDAY"], ["VIERNES", "FRIDAY"], ["SÁBADO", "SATURDAY"]];
const DIAS: Bi[] = [["Lunes", "Monday"], ["Martes", "Tuesday"], ["Miércoles", "Wednesday"], ["Jueves", "Thursday"], ["Viernes", "Friday"], ["Sábado", "Saturday"], ["Domingo", "Sunday"]];

function useAncho() {
  const [w, setW] = useState(390);
  useEffect(() => { const f = () => setW(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return w;
}

/* Fecha corta en la zona de la ciudad: «jue 24 sep» / «Thu Sep 24» (prototipo fd). */
export function fechaCorta(iso: string, tz: string, es: boolean) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", day: "numeric", month: "numeric" }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday")), m = Number(g("month")) - 1, d = g("day");
  const dE: Bi[] = [["dom", "Sun"], ["lun", "Mon"], ["mar", "Tue"], ["mié", "Wed"], ["jue", "Thu"], ["vie", "Fri"], ["sáb", "Sat"]];
  return es ? `${dE[dow]![0]} ${d} ${MES[m]![0]}` : `${dE[dow]![1]} ${MES[m]![1]} ${d}`;
}

export type Form<T> = { key: string; d: T; dirty: boolean; set: (p: Partial<T>) => void };
export type Sec = { blocks: (Bloque | null)[]; ed: Editor | null; tail?: (Bloque | null)[] };
export type Editor = { F: Form<any>; l: string; valid: boolean; always?: boolean; apply: (d: any) => Promise<Res>; toast?: string | ((r: any) => string | undefined); onDone?: () => void };
export type Ctx = {
  d: DatosPanel; es: boolean; E2: (a: string, b: string) => string; desk: boolean; w: number; detCol: boolean;
  go: (sec: Ruta["sec"], sub?: string | null) => void; det: (id: string) => void; closeDet: () => void; ruta: Ruta;
  toast: (t: string) => void; run: (f: () => Promise<Res>, ok?: string | ((r: any) => string | undefined), after?: (r: any) => void) => void;
  form: <T>(key: string, base: T) => Form<T>; ui: Record<string, any>; setUi: (p: Record<string, any>) => void; pending: boolean;
  pickFiles: (multi: boolean, cb: (f: File[]) => void) => void; modoPruebas: boolean;
};

export function Panel({ d, lang, ruta, modoPruebas }: { d: DatosPanel; lang: "es" | "en"; ruta: Ruta; modoPruebas: boolean }) {
  const es = lang === "es", E2 = useCallback((a: string, b: string) => (es ? a : b), [es]);
  const router = useRouter(), path = usePathname(), sp = useSearchParams();
  const [pending, start] = useTransition();
  const w = useAncho(), desk = w >= 1024;
  const [forms, setForms] = useState<Record<string, any>>({});
  const [ui, setUiS] = useState<Record<string, any>>({ dayOpen: -1, gSel: -1, sheet: null, allTasks: false });
  const setUi = useCallback((p: Record<string, any>) => setUiS((z) => ({ ...z, ...p })), []);
  const [toastT, setToastT] = useState<string | null>(null);
  const tt = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((t: string) => { if (tt.current) clearTimeout(tt.current); setToastT(t); tt.current = setTimeout(() => setToastT(null), 2600); }, []);
  const base = `/panel/${d.id}`;
  const url = (sec: Ruta["sec"], sub?: string | null) => (sec === "hoy" ? `${base}/hoy` : sub ? `${base}/pagina/${sub}` : base);
  const go = useCallback((sec: Ruta["sec"], sub?: string | null) => {
    setForms({}); setUi({ dayOpen: -1, gSel: -1, sheet: null });
    router.push(url(sec, sub ?? null));
    if (!desk) window.scrollTo({ top: 0 });
  }, [router, desk]); // eslint-disable-line react-hooks/exhaustive-deps
  const det = useCallback((id: string) => { const q = new URLSearchParams(sp.toString()); q.set("det", id); router.push(`${path}?${q}`, { scroll: !desk }); }, [router, path, sp, desk]);
  const closeDet = useCallback(() => { setForms((f) => Object.fromEntries(Object.entries(f).filter(([k]) => !k.startsWith("det:")))); router.push(path, { scroll: false }); }, [router, path]);
  const run = useCallback((f: () => Promise<Res>, ok?: string | ((r: any) => string | undefined), after?: (r: any) => void) => {
    start(async () => {
      const r = await f().catch(() => ({ ok: false as const, mensaje: { es: "No se pudo guardar. Revisa tu conexión.", en: "Couldn’t save. Check your connection." } }));
      if (!r.ok) { toast(r.mensaje[lang]); return; }
      const t = typeof ok === "function" ? ok(r) : ok;
      if (t) toast(t);
      after?.(r);
      router.refresh();
    });
  }, [lang, router, toast]);
  const form = useCallback(<T,>(key: string, b: T): Form<T> => {
    const cur = (forms[key] as T | undefined) ?? b;
    return { key, d: cur, dirty: forms[key] !== undefined && JSON.stringify(cur) !== JSON.stringify(b), set: (p) => setForms((z) => ({ ...z, [key]: { ...((z[key] as T | undefined) ?? b), ...p } })) };
  }, [forms]);
  const fileRef = useRef<HTMLInputElement>(null), fileCb = useRef<((f: File[]) => void) | null>(null);
  const pickFiles = useCallback((multi: boolean, cb: (f: File[]) => void) => { const el = fileRef.current; if (!el) return; el.multiple = multi; el.value = ""; fileCb.current = cb; el.click(); }, []);

  const hasDet = !!ruta.det, detCol = desk && w >= 1200 && hasDet;
  const ctx: Ctx = { d, es, E2, desk, w, detCol, go, det, closeDet, ruta, toast, run, form, ui, setUi, pending, pickFiles, modoPruebas };

  // Secciones → bloques. El editor activo (si hay) pone «Guardar» (acts en escritorio, barra fija en el teléfono).
  const S = useMemo(() => secciones(ctx), [ctx]); // eslint-disable-line react-hooks/exhaustive-deps
  const D = useMemo(() => (ruta.det ? detalle(ctx) : null), [ctx]); // eslint-disable-line react-hooks/exhaustive-deps
  const ed = (D?.ed ?? (desk || !ruta.det ? S.ed : null)) ?? null;
  const commit = (e: Editor | null) => { if (!e) return; const k = e.F.key; run(() => e.apply(e.F.d), e.toast ?? E2("Guardado · ya se ve en tu página", "Saved · it shows on your page now"), () => { setForms((z) => { const n = { ...z }; delete n[k]; return n; }); e.onDone?.(); }); };
  const discard = (e: Editor | null) => { if (!e) return; const k = e.F.key; setForms((z) => { const n = { ...z }; delete n[k]; return n; }); if (!desk && ruta.det) closeDet(); };
  const edActs = (e: Editor | null): Bloque | null => e && desk ? { type: "acts", pt: "6px", items: ([{ l: e.l, v: "primary", icon: "check", off: !(e.F.dirty || e.always) || !e.valid || pending, onClick: () => commit(e) }] as Accion[]).concat(e.F.dirty ? [{ l: E2("Descartar", "Discard"), v: "secondary", icon: null, off: false, onClick: () => discard(e) }] : []) } : null;
  const mainBlocks: (Bloque | null)[] = !desk && ruta.det && D ? [...D.blocks, edActs(D.ed), ...(D.tail ?? [])] : [...S.blocks, edActs(S.ed), ...(S.tail ?? [])];
  const detBlocks: (Bloque | null)[] = D ? [...D.blocks, edActs(D.ed), ...(D.tail ?? [])] : [];
  const showSave = !desk && !!ed && (ed.F.dirty || !!ed.always);
  const modalOpen = ui.sheet === "biz" || (desk && w < 1200 && hasDet && !!D);

  const st = d.st, stFg = st.open ? "var(--tl-open-text)" : "var(--tl-danger)", stDot = st.open ? "var(--tl-open)" : "var(--tl-danger)";
  const bz = { ph: d.ph ? `url("${d.ph}")` : "", ini: d.ph ? "" : d.name.slice(0, 1), stL: st.text.toUpperCase() };
  const kpis = [
    { v: d.kpis.views7.toLocaleString("en-US"), k: E2("VISTAS · 7 D", "VIEWS · 7 D") },
    { v: String(d.kpis.contacts7), k: E2("CONTACTOS", "CONTACTS") },
    { v: String(d.fuerza.sc), k: E2("FUERZA", "STRENGTH"), onClick: () => go("pag") },
  ];
  const sec = ruta.sec, h1 = desk ? 28 : 24;
  const navIt = (on: boolean, icon: string, l: string, onClick: () => void, side = false) => (
    <span role="link" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: side ? 9 : 10, padding: side ? "7px 8px" : "9px 10px", borderRadius: side ? 10 : 11, background: on ? "rgba(75,55,245,.08)" : "transparent", cursor: "pointer" }}>
      <Icon name={icon} size={side ? 15 : 16} color={on ? "var(--tl-ink)" : side ? "rgba(11,14,18,.7)" : "rgba(11,14,18,.66)"} />
      <span style={{ flex: 1, minWidth: 0, font: `${on ? 800 : side ? 600 : 700} ${side ? 12.5 : 13}px Manrope,sans-serif`, color: on ? "var(--tl-ink)" : side ? "rgba(11,14,18,.7)" : "rgba(11,14,18,.66)" }}>{l}</span>
    </span>);
  const mnav = d.sells ? [{ k: "pag", l: E2("Tu página", "Your page"), icon: "store" }, { k: "hoy", l: E2("Hoy", "Today"), icon: "home" }] : [];
  const avatar = (n: number) => <span style={{ width: n, height: n, borderRadius: 12, backgroundImage: bz.ph, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "var(--tl-ink)", color: "var(--tl-white)", display: "grid", placeItems: "center", font: "800 13px/1 Sora,sans-serif", flex: "none" }}>{bz.ini}</span>;
  const estadoL = (sz: number, ls: string) => <span style={{ display: "flex", alignItems: "center", gap: 5, font: `700 ${sz}px ${MONO}`, letterSpacing: ls, color: stFg }}><span style={{ width: 6, height: 6, borderRadius: 99, background: stDot }} />{bz.stL}</span>;

  const bizBlocks: Bloque[] = [
    { type: "head", t: E2("Tus negocios", "Your businesses"), s: E2("Cambia de negocio sin salir del panel.", "Switch business without leaving the dashboard.") },
    { type: "rows", items: d.negocios.map((n): Fila => ({
      img: n.foto ? `url("${n.foto}")` : undefined, imgIni: n.foto ? undefined : n.name.slice(0, 1), t: n.name,
      s: n.trial?.on ? E2(`Pro · prueba · quedan ${n.trial.left} d`, `Pro · trial · ${n.trial.left} d left`) : n.plan === "pro" ? "Pro" : "Free",
      tag: n.id === d.id ? E2("AHORA", "CURRENT") : null, tone: "action", onClick: () => { setUi({ sheet: null }); if (n.id !== d.id) router.push(`/panel/${n.id}`); } })) },
  ];

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--tl-paper)" }}>
      <style>{"@keyframes d2Fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes d2Up{from{transform:translateY(64px);opacity:0}to{transform:none;opacity:1}}.d2hs::-webkit-scrollbar{display:none}"}</style>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); if (f.length) fileCb.current?.(f); }} />
      {!desk ? (
        <div style={{ position: "sticky", top: 0, zIndex: 30, background: "var(--tl-white)", borderBottom: "1px solid rgba(11,14,18,.07)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <div role="button" onClick={() => setUi({ sheet: "biz" })} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            {avatar(38)}
            <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, font: "800 15px/1.1 Sora,sans-serif", letterSpacing: "-.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}<Icon name="chevronDown" size={14} /></span>
              {estadoL(9, ".12em")}
            </span>
          </div>
          {d.sells ? <span role="button" aria-label={E2("Avisos", "Alerts")} onClick={() => go("hoy")} style={{ position: "relative", width: 38, height: 38, borderRadius: 12, background: "rgba(11,14,18,.05)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="bell" size={18} /></span> : null}
        </div>
      ) : null}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: desk ? (detCol ? "264px minmax(0,1fr) 420px" : "264px minmax(0,1fr)") : "minmax(0,1fr)", gap: desk ? 28 : 0, maxWidth: desk ? 1440 : "none", width: "100%", margin: "0 auto", padding: desk ? "28px 32px 64px" : "16px 16px 24px", alignItems: "start", boxSizing: "border-box" }}>
        {desk ? (
          <aside data-screen-label="Panel v2 · menú (2t)" style={{ minWidth: 0, position: "sticky", top: 28 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 17, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div role="button" onClick={() => setUi({ sheet: "biz" })} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  {avatar(40)}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, font: "800 13.5px/1.2 Sora,sans-serif", letterSpacing: "-.02em" }}>{d.name}<Icon name="chevronDown" size={13} color="rgba(11,14,18,.45)" /></span>
                    <span style={{ display: "block", marginTop: 3 }}>{estadoL(9, ".08em")}</span>
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
                  {kpis.map((k) => <span key={k.k} role={k.onClick ? "button" : undefined} onClick={k.onClick} style={{ padding: "7px 6px", borderRadius: 10, background: "var(--tl-paper)", display: "flex", flexDirection: "column", gap: 2, alignItems: "center", cursor: k.onClick ? "pointer" : "default" }}><span style={{ font: "800 14px Sora,sans-serif" }}>{k.v}</span><span style={{ font: `700 7.5px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)", textAlign: "center" }}>{k.k}</span></span>)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {navIt(sec === "pag" && !ruta.sub, "store", E2("Tu página", "Your page"), () => go("pag"), true)}
                  {PARTS.filter((p) => p.k === "hor" || p.k === "fotos").map((p) => <span key={p.k}>{navIt(sec === "pag" && ruta.sub === p.k, p.icon, E2(...p.l), () => go("pag", p.k), true)}</span>)}
                </div>
              </div>
              {d.sells ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "0 2px" }}>
                  <span style={{ padding: "6px 10px", font: `700 9px ${MONO}`, letterSpacing: ".16em", color: "rgba(11,14,18,.45)" }}>{E2("CADA DÍA", "EVERY DAY")}</span>
                  {navIt(sec === "hoy", "home", E2("Hoy", "Today"), () => go("hoy"))}
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}
        <main data-screen-label={`Panel v2 · ${sec}${ruta.sub ? ` · ${ruta.sub}` : ""}`} style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: desk ? 14 : 12, animation: "d2Fade .2s ease-out" }}>
          <PanelBloques bloques={mainBlocks} h1={h1} />
        </main>
        {detCol ? (
          <aside data-screen-label="Panel v2 · detalle" style={{ minWidth: 0, position: "sticky", top: 28 }}>
            <div style={{ padding: 18, borderRadius: 22, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", display: "flex", flexDirection: "column", gap: 14, animation: "d2Fade .2s ease-out" }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}><Cerrar onClick={closeDet} /></div>
              <PanelBloques bloques={detBlocks} h1={22} />
            </div>
          </aside>
        ) : null}
      </div>
      {showSave && ed ? (
        <div style={{ position: "sticky", bottom: 0, zIndex: 40, background: "rgba(247,246,243,.96)", backdropFilter: "blur(14px)", borderTop: "1px solid rgba(11,14,18,.08)", padding: "10px 16px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span role="button" onClick={() => discard(ed)} style={{ font: "700 13.5px Manrope,sans-serif", color: "rgba(11,14,18,.65)", cursor: "pointer", padding: "0 6px" }}>{E2("Descartar", "Discard")}</span>
          <span style={{ flex: 1, minWidth: 0, textAlign: "right", font: `600 9.5px ${MONO}`, letterSpacing: ".08em", color: "var(--tl-pro-ink)" }}>{ed.F.dirty ? E2("CAMBIOS SIN GUARDAR", "UNSAVED CHANGES") : ""}</span>
          <Button size="lg" icon="check" disabled={!(ed.F.dirty || ed.always) || !ed.valid || pending} onClick={() => commit(ed)}>{ed.l}</Button>
        </div>
      ) : !desk && mnav.length > 1 ? (
        <div style={{ position: "sticky", bottom: 0, zIndex: 40, background: "rgba(247,246,243,.96)", backdropFilter: "blur(14px)", borderTop: "1px solid rgba(11,14,18,.08)", padding: "8px 8px 14px", display: "grid", gridTemplateColumns: `repeat(${mnav.length},minmax(0,1fr))` }}>
          {mnav.map((n) => { const on = n.k === sec; return (
            <div key={n.k} role="link" onClick={() => go(n.k as Ruta["sec"])} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0", cursor: "pointer", color: on ? "var(--tl-ink)" : "rgba(11,14,18,.42)" }}>
              <Icon name={n.icon} size={21} color={on ? "var(--tl-ink)" : "rgba(11,14,18,.42)"} /><span style={{ font: "700 10.5px Manrope,sans-serif" }}>{n.l}</span>
            </div>); })}
        </div>
      ) : null}
      {modalOpen ? (
        <div onClick={() => (ui.sheet === "biz" ? setUi({ sheet: null }) : closeDet())} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(11,14,18,.45)", display: "flex", alignItems: desk ? "flex-start" : "flex-end", justifyContent: "center", paddingTop: desk ? 70 : 0, boxSizing: "border-box", animation: "d2Fade .2s ease-out" }}>
          <div onClick={(e) => e.stopPropagation()} className="d2hs" style={{ width: "100%", maxWidth: desk ? 560 : "100%", maxHeight: "88%", overflowY: "auto", background: "var(--tl-white)", borderRadius: desk ? 22 : "26px 26px 0 0", padding: "16px 20px 24px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14, animation: "d2Up .25s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}><Cerrar onClick={() => (ui.sheet === "biz" ? setUi({ sheet: null }) : closeDet())} /></div>
            <PanelBloques bloques={ui.sheet === "biz" ? bizBlocks : detBlocks} h1={22} />
          </div>
        </div>
      ) : null}
      {toastT ? <div role="status" style={{ position: "fixed", left: "50%", bottom: desk ? 28 : 100, transform: "translateX(-50%)", zIndex: 90, maxWidth: 360, width: "calc(100% - 40px)", boxSizing: "border-box", padding: "12px 16px", borderRadius: 14, background: "var(--tl-ink)", color: "var(--tl-white)", font: "700 13px/1.4 Manrope,sans-serif", textAlign: "center", animation: "d2Up .2s ease-out" }}>{toastT}</div> : null}
    </div>
  );
}

function Cerrar({ onClick }: { onClick: () => void }): ReactNode {
  return <span role="button" aria-label="Cerrar" onClick={onClick} style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(11,14,18,.05)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icon name="close" size={15} strokeWidth={2} /></span>;
}

/* ─────────────────────────── Secciones ─────────────────────────── */
function secciones(c: Ctx): Sec {
  if (c.ruta.sec === "hoy") return { blocks: hoy(c), ed: null };
  if (!c.ruta.sub) return { blocks: pagina(c), ed: null };
  const p = PARTS.find((x) => x.k === c.ruta.sub) ?? PARTS[0]!, E2 = c.E2;
  const head: Bloque[] = [
    { type: "head", eye: E2("TU PÁGINA", "YOUR PAGE"), t: E2(...p.l), s: E2(...p.s), onBack: () => c.go("pag"),
      act: p.k === "equipo" ? { l: E2("Invitar", "Invite"), icon: "plus", onClick: () => c.det("stf:new") } : undefined },
    { type: "tabs", items: partesDe(c.d).map((z) => ({ l: E2(...z.l), on: z.k === p.k, onClick: () => c.go("pag", z.k) })) },
  ];
  const r = p.k === "hor" ? horario(c) : p.k === "fotos" ? { blocks: fotos(c), ed: null } : p.k === "about" ? about(c) : p.k === "ver" ? { blocks: verificacion(c), ed: null } : p.k === "lic" ? licencias(c) : { blocks: equipoBloques(c), ed: null };
  return { blocks: [...head, ...r.blocks], ed: r.ed };
}

function detalle(c: Ctx): Sec | null {
  const id = c.ruta.det ?? "";
  if (id.startsWith("stf:")) return equipoDetalle(c, id.slice(4));
  return null;
}

/* Avisos de la prueba Pro (trialHome): en Tu página y en Hoy. Los botones «Tu plan / Decidir» llegan con Cobros y plan. */
function avisosPrueba(c: Ctx, donde: "pag" | "hoy"): Bloque[] {
  const { d, E2, es } = c, t = d.trial;
  if (!t) return [];
  const fin = fechaCorta(t.end, d.hoy.tz, es);
  if (t.phase === "last") return [{ type: "note", tone: "warn", icon: "clock", t: E2(`Mañana termina tu prueba Pro. Ese día tu página pasa a Free: ${d.duerme}. Nada se borra.`, `Your Pro trial ends tomorrow. That day your page goes to Free: ${d.duerme}. Nothing is deleted.`) }];
  if (t.phase === "d25") return [{ type: "note", tone: "warn", icon: "clock", t: E2(`Tu prueba Pro termina el ${fin}. Ese día tu página pasa a Free: ${d.duerme}. Nada se borra.`, `Your Pro trial ends ${fin}. That day your page goes to Free: ${d.duerme}. Nothing is deleted.`) }];
  if (t.phase === "d20") {
    if (donde === "hoy") return [{ type: "note", tone: "ink", icon: "bolt", t: E2(`En ${t.day} días con Pro: ${d.kpis.viewsTrial} vistas y ${d.kpis.contactsTrial} contactos.`, `In ${t.day} days with Pro: ${d.kpis.viewsTrial} views and ${d.kpis.contactsTrial} contacts.`) }];
    return [
      { type: "group", k: E2(`LO QUE PASÓ EN TU PRUEBA · ${t.day} DÍAS`, `WHAT HAPPENED IN YOUR TRIAL · ${t.day} DAYS`), first: true },
      { type: "kpis", cols: c.desk ? "repeat(4,minmax(0,1fr))" : undefined, items: [
        { k: E2("VISTAS", "VIEWS"), v: String(d.kpis.viewsTrial), s: E2("en Destacados y en tu página", "in Featured and on your page") },
        { k: E2("CONTACTOS", "CONTACTS"), v: String(d.kpis.contactsTrial), s: E2("llamadas, WhatsApp y mensajes", "calls, WhatsApp and messages") },
      ] },
      { type: "note", tone: "info", icon: "star", t: E2(`Todo esto sigue por ${dinero(PRECIO_PRO)} al mes. Tu prueba termina el ${fin}.`, `All of this continues for ${dinero(PRECIO_PRO)} a month. Your trial ends ${fin}.`) },
    ];
  }
  if (donde === "hoy") return [];
  return [{ type: "note", tone: "info", icon: "star", t: E2(`Estás construyendo con Pro · quedan ${t.left} días de prueba. Termina el ${fin}.`, `You are building with Pro · ${t.left} trial days left. Ends ${fin}.`) }];
}

function resumen(c: Ctx, k: string) {
  const { d, E2 } = c;
  if (k === "hor") return d.st.text;
  if (k === "fotos") return `${d.fotos.length} ${E2("fotos", "photos")} · ${d.logo ? "logo" : E2("sin logo", "no logo")}`;
  if (k === "about") { const a = d.about?.es ?? ""; return a ? (a.length > 56 ? `${a.slice(0, 56)}…` : a) : E2("Sin escribir", "Not written"); }
  if (k === "ver") return selloL(c).t;
  if (k === "lic") { const f = d.lic?.filas ?? [], ok = f.filter((x) => x.status === "valid").length, rev = f.filter((x) => x.status === "review").length; return f.length ? `${ok} ${ok === 1 ? E2("licencia verificada", "verified license") : E2("licencias verificadas", "verified licenses")}${rev ? E2(` · ${rev} en revisión`, ` · ${rev} in review`) : ""}` : E2("Sin licencias", "No licenses"); }
  const ok = d.equipo.filter((p) => p.st === "ok").length, inv = d.equipo.filter((p) => p.st === "inv").length;
  return `${ok} ${E2("en tu página", "on your page")}${inv ? (inv === 1 ? E2(" · 1 invitación", " · 1 invite") : E2(` · ${inv} invitaciones`, ` · ${inv} invites`)) : ""}`;
}

/* Tu página (DASH-PAGINA, inicio del panel). */
function pagina(c: Ctx): (Bloque | null)[] {
  const { d, E2, es } = c, f = d.fuerza, out: (Bloque | null)[] = [...avisosAdmin(c, "pag")];
  if (d.st.closedToday) out.push({ type: "note", tone: "warn", icon: "clock", t: E2("Cerraste por hoy: tu página dice «Cerrado hoy» y no recibes pedidos ni citas. Mañana abres normal.", "You closed for today: your page says “Closed today” and you get no orders or bookings. Tomorrow you open as usual."), cta: E2("Abrir", "Open"), onCta: () => c.run(() => cerrarPorHoy(d.id, false), E2("Abierto otra vez.", "Open again.")) });
  out.push({
    type: "hero", t: d.name, ini: d.ph ? "" : d.name.slice(0, 1), ph: d.ph ? `url("${d.ph}")` : "", st: d.st.text.toUpperCase(),
    stFg: d.st.open ? "var(--tl-signal)" : "var(--tl-pro)", stDot: d.st.open ? "var(--tl-signal)" : "var(--tl-pro)", plan: d.pro ? "PRO" : "FREE", planV: d.pro ? "pro" : "filter",
    kpis: [
      { v: d.kpis.views7.toLocaleString("en-US"), k: E2("VISTAS · 7 DÍAS", "VIEWS · 7 DAYS"), s: `+${Math.round(d.kpis.views7 / 7)}${E2(" por día", " a day")}` },
      { v: String(d.kpis.contacts7), k: E2("CONTACTOS · 7 DÍAS", "CONTACTS · 7 DAYS"), s: E2("llamadas, WhatsApp, mensajes", "calls, WhatsApp, messages") },
      { v: String(f.sc), k: E2("FUERZA DEL PERFIL", "PROFILE STRENGTH"), s: f.tasks.length ? E2(`faltan ${f.tasks.length} cosas`, `${f.tasks.length} things left`) : E2("completo", "complete"), sFg: f.tasks.length ? "var(--tl-pro)" : "var(--tl-signal)" },
    ],
    acts: [
      { l: E2("Ver como cliente", "View as client"), icon: "store", onClick: () => window.open(`/n/${d.id}`, "_blank") },
      { l: E2("Compartir", "Share"), icon: "share", onClick: () => {
        const u = `${location.origin}/n/${d.id}`;
        if (navigator.share) navigator.share({ title: d.name, url: u }).catch(() => undefined);
        else navigator.clipboard?.writeText(u).then(() => c.toast(`${u.replace(/^https?:\/\//, "")}${E2(" · link copiado", " · link copied")}`)).catch(() => undefined);
      } },
    ],
  });
  out.push(...avisosPrueba(c, "pag"));
  if (f.tasks.length) {
    const todas = d.onb || c.ui.allTasks;
    out.push({
      type: "rows", k: d.onb ? E2(`LO QUE SIGUE · TU PÁGINA AL ${f.sc} %`, `WHAT’S NEXT · YOUR PAGE AT ${f.sc} %`) : E2("LO QUE MÁS TE AYUDA AHORA", "WHAT HELPS MOST NOW"),
      link: f.tasks.length > 2 && !d.onb ? E2(`Ver las ${f.tasks.length}`, `See all ${f.tasks.length}`) : undefined, onLink: () => c.setUi({ allTasks: !c.ui.allTasks }),
      items: f.tasks.slice(0, todas ? 20 : 2).map((t): Fila => ({ icon: "bolt", ibg: "rgba(255,176,32,.14)", ifg: "var(--tl-pro-ink)", t: es ? t.t[0] : t.t[1], s: (es ? t.g[0] : t.g[1]) || undefined, r: `+${t.p}`, compact: true, chev: HECHOS.has(t.part) ? undefined : false, onClick: HECHOS.has(t.part) ? () => c.go("pag", t.part) : undefined })),
    });
  }
  const cols2 = c.desk && c.w >= 1100 && !c.detCol ? "repeat(2,minmax(0,1fr))" : undefined;
  const grp = (k: string, keys: string[]): Bloque => ({ type: "rows", k, cols: cols2, items: keys.map((p) => { const P = PARTS.find((x) => x.k === p)!; return { icon: P.icon, t: E2(...P.l), s: resumen(c, p), onClick: () => c.go("pag", p) }; }) });
  out.push(grp(E2("LO QUE VEN LOS CLIENTES", "WHAT CLIENTS SEE"), ["hor", "fotos", "about"]), grp(E2("CONTENIDO", "CONTENT"), ["equipo"]), grp(E2("CONFIANZA Y NÚMEROS", "TRUST AND NUMBERS"), d.lic ? ["lic", "ver"] : ["ver"]));
  if (!d.pro && !d.trialUsed) out.push({ type: "note", tone: "warn", icon: "star", t: E2(`Con Free tu página es una sola, sin pestañas, y se ven ${FOTOS_FREE} fotos y ${ITEMS_FREE} ${d.itemsW[0]}. Nada se borra.`, `On Free your page is a single page, no tabs, showing ${FOTOS_FREE} photos and ${ITEMS_FREE} ${d.itemsW[1]}. Nothing is deleted.`) });
  return out;
}

/* Hoy (DASH-HOY). Pedidos, citas, mensajes y reseñas llegan en la Fase 2: hasta entonces las cifras reales son cero. */
function hoy(c: Ctx): (Bloque | null)[] {
  const { d, E2, es } = c, out: (Bloque | null)[] = [...avisosAdmin(c, "hoy")];
  if (d.st.closedToday) out.push({ type: "note", tone: "warn", icon: "clock", t: E2("Cerraste por hoy: tu página dice «Cerrado hoy» y no recibes pedidos ni citas. Mañana abres normal.", "You closed for today: your page says “Closed today” and you get no orders or bookings. Tomorrow you open as usual."), cta: E2("Abrir", "Open"), onCta: () => c.run(() => cerrarPorHoy(d.id, false), E2("Abierto otra vez.", "Open again.")) });
  const [y, m, dd] = d.hoy.fecha.split("-").map(Number), hora = fmtHora(Number(d.hoy.hm.slice(0, 2)) + Number(d.hoy.hm.slice(3)) / 60);
  const fecha = es ? `${DIA_L[d.hoy.dow]![0]} ${dd} ${MES[m! - 1]![0].toUpperCase()}` : `${DIA_L[d.hoy.dow]![1]} ${MES[m! - 1]![1].toUpperCase()} ${dd}`;
  void y;
  out.push({ type: "head", eye: `${E2("HOY", "TODAY")} · ${fecha} · ${hora}`, t: `${d.hoy.saludo}, ${d.owner ?? d.name}` });
  out.push(...avisosPrueba(c, "hoy"));
  out.push({ type: "kpis", cols: c.desk ? "repeat(4,minmax(0,1fr))" : undefined, items: [
    { k: E2("ESPERAN TU RESPUESTA", "AWAITING YOU"), v: "0" },
    { k: E2("HOY EN TU AGENDA", "ON TODAY’S AGENDA"), v: "0" },
    { k: E2("VENDIDO HOY", "SOLD TODAY"), v: "$0" },
    { k: E2("VISTAS HOY", "VIEWS TODAY"), v: String(d.kpis.viewsToday) },
  ] });
  if (!d.pro) out.push({ type: "note", tone: "warn", icon: "star", t: E2(`Free: ${d.usadosMes} de ${d.tope} pedidos o citas en línea este mes. Al llegar a ${d.tope}, te contactan por teléfono.`, `Free: ${d.usadosMes} of ${d.tope} online orders or bookings this month. After ${d.tope}, clients call you.`) });
  out.push({ type: "rows", k: E2("ESPERAN TU RESPUESTA", "AWAITING YOUR REPLY"), items: [] });
  out.push({ type: "empty", icon: "check", t: E2("Nada pendiente", "Nothing pending"), s: E2("Te avisamos al instante cuando llegue algo.", "We alert you the moment something arrives.") });
  out.push({ type: "group", k: E2("ACCIONES RÁPIDAS", "QUICK ACTIONS") });
  out.push({ type: "acts", items: [d.st.closedToday
    ? { l: E2("Abrir de nuevo", "Reopen"), icon: "clock", onClick: () => c.run(() => cerrarPorHoy(d.id, false), E2("Abierto otra vez.", "Open again.")) }
    : { l: E2("Cerrar por hoy", "Close for today"), icon: "clock", onClick: () => c.run(() => cerrarPorHoy(d.id, true), E2("Cerrado por hoy. Tu página lo dice.", "Closed for today. Your page says so.")) }] });
  return out;
}

/* Fotos y portada (sub fotos). La portada es la primera foto de la galería. Todo se guarda al instante. */
function fotos(c: Ctx): (Bloque | null)[] {
  const { d, E2 } = c, out: (Bloque | null)[] = [], g: { id: string; url: string }[] = c.ui.orden ?? d.fotos, sel: number = c.ui.gSel ?? -1;
  const subir = (multi: boolean, como: "gallery" | "cover" | "logo") => c.pickFiles(multi, async (files) => {
    const ids: string[] = [];
    for (const f of files.slice(0, 12)) {
      const r = await subirFoto(f);
      if (!r.ok || !r.id) { c.toast(r.mensaje ? (c.es ? r.mensaje.es : r.mensaje.en) : E2("Una foto no se pudo abrir.", "A photo could not be opened.")); continue; }
      ids.push(r.id);
    }
    if (!ids.length) return;
    if (como === "logo") c.run(() => logoPoner(d.id, ids[0]!), E2("Listo. Ya se ve en tu página.", "Done. It shows on your page now."));
    else if (como === "cover") c.run(() => fotosAgregar(d.id, ids.slice(0, 1), true), E2("Listo. Ya se ve en tu página.", "Done. It shows on your page now."), () => c.setUi({ orden: null, gSel: -1 }));
    else c.run(() => fotosAgregar(d.id, ids), ids.length === 1 ? E2("1 foto agregada.", "1 photo added.") : E2(`${ids.length} fotos agregadas.`, `${ids.length} photos added.`), () => c.setUi({ orden: null, gSel: -1 }));
  });
  const mv = (a: number, b: number) => {
    if (a < 0 || b < 0 || b >= g.length) return;
    const n = g.slice(); const [x] = n.splice(a, 1); n.splice(b, 0, x!);
    c.setUi({ orden: n, gSel: b });
    c.run(() => fotosOrden(d.id, n.map((z) => z.id)), b === 0 ? E2("Listo. Ya se ve en tu página.", "Done. It shows on your page now.") : undefined, () => c.setUi({ orden: null }));
  };
  if (d.adm.fotos.length) out.push({ type: "note", tone: "warn", icon: "image", t: E2(`To'Latino quitó ${d.adm.fotos.length === 1 ? "1 foto" : `${d.adm.fotos.length} fotos`} de tu página: ${[...new Set(d.adm.fotos.filter(Boolean))].join(" · ")}. Si crees que es un error, escríbenos desde Ayuda.`, `To'Latino removed ${d.adm.fotos.length === 1 ? "1 photo" : `${d.adm.fotos.length} photos`} from your page: ${[...new Set(d.adm.fotos.filter(Boolean))].join(" · ")}. If you think it is a mistake, write to us from Help.`) });
  if (!d.pro && g.length > FOTOS_FREE) out.push({ type: "note", tone: "warn", icon: "image", t: E2(`Con Free tu página muestra las primeras ${FOTOS_FREE} fotos de tu galería. Las otras ${g.length - FOTOS_FREE} quedan guardadas y salen con Pro.`, `On Free your page shows the first ${FOTOS_FREE} photos of your gallery. The other ${g.length - FOTOS_FREE} stay saved and show with Pro.`) });
  out.push({ type: "rows", k: E2("PORTADA Y LOGO", "COVER AND LOGO"), cols: c.desk && c.w >= 1100 && !c.detCol ? "repeat(2,minmax(0,1fr))" : undefined, items: [
    { img: g[0] ? `url("${g[0].url}")` : undefined, imgIni: g[0] ? undefined : " ", imgW: "56px", t: E2("Portada", "Cover"), s: E2("Lo primero que ven. Es la primera foto de tu galería.", "The first thing people see. It is the first photo of your gallery."), acts: [{ l: E2("Elegir otra", "Choose another"), icon: "image", off: c.pending, onClick: () => subir(false, "cover") }] },
    { img: d.logo ? `url("${d.logo}")` : undefined, imgIni: d.logo ? undefined : d.name.slice(0, 1), imgW: "56px", t: "Logo", s: d.logo ? E2("Se ve junto al nombre.", "Shows next to the name.") : E2("Sin logo: se usa tu inicial.", "No logo: your initial is used."),
      acts: [{ l: d.logo ? E2("Cambiar", "Change") : E2("Subir logo", "Upload logo"), icon: "image", off: c.pending, onClick: () => subir(false, "logo") }].concat(d.logo ? [{ l: E2("Usar inicial", "Use initial"), icon: null as any, off: c.pending, onClick: () => c.run(() => logoPoner(d.id, null), E2("Listo. Ya se ve en tu página.", "Done. It shows on your page now.")) }] : []) },
  ] });
  out.push({
    type: "photos", k: E2("GALERÍA · TOCA UNA PARA MOVERLA", "GALLERY · TAP ONE TO MOVE IT"), count: `${g.length}${E2(" FOTOS", " PHOTOS")}${!d.pro && g.length > FOTOS_FREE ? E2(` · FREE MUESTRA ${FOTOS_FREE}`, ` · FREE SHOWS ${FOTOS_FREE}`) : ""}`, cols: c.desk ? 4 : 3,
    items: g.map((p, i) => ({ key: p.id, bg: `url("${p.url}")`, tag: i === 0 ? E2("PORTADA", "COVER") : !d.pro && i >= FOTOS_FREE ? E2("NO SE VE", "HIDDEN") : "", on: sel === i, onClick: () => c.setUi({ gSel: sel === i ? -1 : i }) })),
    onAdd: () => subir(true, "gallery"), addL: E2("Agregar fotos", "Add photos"),
    selActs: sel >= 0 && sel < g.length ? [
      { l: E2("Antes", "Earlier"), icon: "chevronLeft", off: sel === 0 || c.pending, onClick: () => mv(sel, sel - 1) },
      { l: E2("Después", "Later"), icon: "chevronRight", off: sel === g.length - 1 || c.pending, onClick: () => mv(sel, sel + 1) },
      { l: E2("Usar de portada", "Use as cover"), v: "soft", icon: "image", off: sel === 0 || c.pending, onClick: () => mv(sel, 0) },
      { l: E2("Quitar", "Remove"), icon: "trash", off: g.length <= 1 || c.pending, onClick: () => { const m = g[sel]!; c.run(() => fotoQuitar(d.id, m.id), undefined, () => c.setUi({ gSel: -1, orden: null })); } },
    ] : [],
  });
  out.push({ type: "note", tone: "info", icon: "image", t: E2("Las fotos con gente y comida real reciben más clics que los logos y los carteles.", "Photos with real people and food get more clicks than logos and posters.") });
  return out;
}

/* Horario (sub hor). Free: un tramo por día; Pro: dos. Feriados, vacaciones y temporada llegan después (LAUNCH-CHECKLIST). */
function horario(c: Ctx): { blocks: (Bloque | null)[]; ed: Editor } {
  const { d, E2, es } = c, F = c.form<{ hours: DiaPanel[] }>(`hor:${d.id}`, { hours: d.horas }), out: (Bloque | null)[] = [];
  const mk = (on: boolean, a: number, b: number): DiaPanel => ({ on, a, b, two: false, a2: 17, b2: 21 }), I = [0, 1, 2, 3, 4, 5, 6];
  const TPL: [string, Bi, () => DiaPanel[]][] = [
    ["lv", ["Lun–Vie 9–6", "Mon–Fri 9–6"], () => I.map((i) => mk(i < 5, 9, 18))],
    ["ms", ["Mar–Sáb", "Tue–Sat"], () => I.map((i) => mk(i >= 1 && i <= 5, 9, 19))],
    ["fds", ["Solo fines de semana", "Weekends only"], () => I.map((i) => mk(i >= 5, 10, 18))],
    ["todos", ["Todos los días", "Every day"], () => I.map(() => mk(true, 9, 21))],
    ["cita", ["Por cita", "By appointment"], () => I.map((i) => mk(i < 6, 9, 18))],
  ];
  out.push({ type: "chips", k: E2("EMPIEZA CON UNA PLANTILLA", "START FROM A TEMPLATE"), items: TPL.map(([, l, f]) => ({ l: E2(...l), v: "filter", onClick: () => F.set({ hours: f() }) })) });
  // Cómo se ve hoy, con el borrador (la misma regla que la ficha).
  const filas = aBase(F.d.hours), t = Number(d.hoy.hm.slice(0, 2)) * 60 + Number(d.hoy.hm.slice(3)), mm = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const hoyF = filas.find((x) => x.weekday === d.hoy.dow), ayer = filas.find((x) => x.weekday === (d.hoy.dow + 6) % 7);
  const abierto = !d.st.closedToday && (!!hoyF?.open && hoyF.ranges.some(([a, b]) => mm(a) <= t && (mm(b) > t || mm(b) <= mm(a))) || !!ayer?.open && ayer.ranges.some(([a, b]) => mm(b) <= mm(a) && t < mm(b)));
  const st = estado(filas, d.hoy, abierto, es ? "es" : "en", null, d.st.closedToday);
  out.push({ type: "note", tone: st.open ? "ok" : "warn", icon: "clock", t: E2(`Así se ve hoy: ${st.text}`, `How it looks today: ${st.text}`) });
  const setDay = (i: number, p: Partial<DiaPanel>) => F.set({ hours: F.d.hours.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const todayIdx = (d.hoy.dow + 6) % 7, cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  out.push({
    type: "hours", free: !d.pro, todayL: E2("HOY", "TODAY"), openK: E2("ABRE", "OPENS"), closeK: E2("CIERRA", "CLOSES"), copyL: E2("Copiar a los días abiertos", "Copy to open days"),
    items: DIAS.map((D, i) => {
      const x = F.d.hours[i]!, open = c.ui.dayOpen === i && x.on, stp = (k: keyof DiaPanel, dv: number, lo: number, hi: number) => () => setDay(i, { [k]: cl((x[k] as number) + dv, lo, hi) } as Partial<DiaPanel>);
      return {
        d: E2(...D), today: i === todayIdx, on: x.on, onTg: () => setDay(i, { on: !x.on }),
        h: x.on ? `${fmtHora(x.a)} – ${fmtHora(x.b)}${x.two ? ` · ${fmtHora(x.a2)} – ${fmtHora(x.b2)}` : ""}` : E2("Cerrado", "Closed"), hFg: x.on ? "var(--tl-ink)" : "rgba(11,14,18,.42)",
        open, onOpen: () => { if (x.on) c.setUi({ dayOpen: c.ui.dayOpen === i ? -1 : i }); },
        aL: fmtHora(x.a), bL: fmtHora(x.b), aM: stp("a", -0.5, 5, x.b - 0.5), aP: stp("a", 0.5, 5, x.b - 0.5), bM: stp("b", -0.5, x.a + 0.5, x.two ? x.a2 : 26), bP: stp("b", 0.5, x.a + 0.5, x.two ? x.a2 : 26),
        ...(x.two ? { a2L: fmtHora(x.a2), b2L: fmtHora(x.b2), a2M: stp("a2", -0.5, x.b, x.b2 - 0.5), a2P: stp("a2", 0.5, x.b, x.b2 - 0.5), b2M: stp("b2", -0.5, x.a2 + 0.5, Math.min(26, x.a + 24)), b2P: stp("b2", 0.5, x.a2 + 0.5, Math.min(26, x.a + 24)) } : {}),
        twoL: x.two ? E2("Quitar el segundo horario", "Remove second window") : E2("Otro horario este día", "Another window this day"),
        onTwo: () => { if (!d.pro) { c.toast(E2("Con Free: un horario por día. Los tramos son de Pro.", "On Free: one window per day. Windows are Pro.")); return; } setDay(i, x.two ? { two: false } : { two: true, a2: Math.min(25, x.b + 1), b2: Math.min(26, x.b + 4) }); },
        onCopy: () => { F.set({ hours: F.d.hours.map((y) => (y.on ? { ...y, a: x.a, b: x.b, two: x.two, a2: x.a2, b2: x.b2 } : y)) }); c.toast(E2("Copiado a los días abiertos.", "Copied to open days.")); },
      };
    }),
  });
  if (!d.pro) out.push({ type: "note", tone: "warn", icon: "star", t: E2("Con Free: un horario por día. Los tramos son de Pro.", "On Free: one window per day. Windows are Pro.") });
  return { blocks: out, ed: { F, l: E2("Guardar", "Save"), valid: true, apply: (x) => horarioGuardar(d.id, x.hours), onDone: () => c.setUi({ dayOpen: -1 }) } };
}

/* Quiénes somos (sub about). */
function about(c: Ctx): { blocks: (Bloque | null)[]; ed: Editor } {
  const { d, E2 } = c, F = c.form<{ es: string; en: string; amen: string[] }>(`about:${d.id}`, { es: d.about?.es ?? "", en: d.about?.en ?? "", amen: d.amen }), out: (Bloque | null)[] = [];
  if (d.adm.about) out.push({ type: "note", tone: "warn", icon: "edit", t: E2("To’Latino editó tu «Quiénes somos». Lo que ves aquí es lo que sale. Si lo cambias, se publica lo tuyo.", "To’Latino edited your “About us”. What you see here is what shows. If you change it, yours is published.") });
  out.push({ type: "field", area: true, rows: 5, max: 300, k: E2("QUIÉNES SOMOS", "ABOUT US"), val: F.d.es, count: `${F.d.es.length}/300`, onChange: (v) => F.set({ es: v }),
    ph: E2("Qué haces, desde cuándo y qué te hace distinto.", "What you do, since when and what makes you different."),
    help: E2("Sale en el Resumen de tu página cuando no hay una persona con sus palabras en «Quién está detrás».", "Shows in your page Overview when there is no person with their own words in “Who is behind it”.") });
  const own = d.equipo.find((p) => p.kind === "owner" && p.st === "ok" && p.bio?.es);
  if (own) out.push({ type: "note", tone: "info", icon: "quote", t: E2(`Hoy tu Resumen muestra las palabras de ${own.name} (se editan en Equipo). Este texto sale si las quitas.`, `Your Overview shows ${own.name}’s words today (edited in Team). This text shows if you remove them.`), cta: E2("Equipo", "Team"), onCta: () => c.go("pag", "equipo") });
  const FR: Bi[] = [[`Llevo 10 años en ${d.ciudad}.`, `I have spent 10 years in ${d.ciudad}.`], ["Somos una familia que ", "We are a family that "], ["Lo que más nos piden es ", "What people ask for most is "]];
  out.push({ type: "chips", k: E2("EMPIEZA CON", "START WITH"), items: FR.map((x) => { const s = E2(...x); return { l: s.length > 28 ? `${s.slice(0, 28)}…` : s, v: "filter", onClick: () => F.set({ es: `${F.d.es}${F.d.es && !/\s$/.test(F.d.es) ? " " : ""}${x[0]}`.slice(0, 300) }) }; }) });
  out.push({ type: "group", k: E2("EN INGLÉS · OPCIONAL", "IN ENGLISH · OPTIONAL") });
  out.push({ type: "field", area: true, rows: 4, max: 300, k: E2("QUIÉNES SOMOS EN INGLÉS", "ABOUT US IN ENGLISH"), val: F.d.en, count: `${F.d.en.length}/300`, onChange: (v) => F.set({ en: v }), ph: E2("Si lo dejas vacío, sale en español.", "If you leave it empty, it shows in Spanish.") });
  out.push({ type: "group", k: E2("EN TU NEGOCIO", "AT YOUR PLACE") });
  out.push({ type: "chips", k: E2("MARCA LO QUE HAY · SALE EN «EN EL LOCAL»", "MARK WHAT YOU OFFER · SHOWS UNDER “AT THE PLACE”"),
    items: d.amenAll.map((a) => { const on = F.d.amen.includes(a.key); return { l: a.l, v: on ? "selected" : "filter", onClick: () => F.set({ amen: on ? F.d.amen.filter((k) => k !== a.key) : F.d.amen.concat(a.key) }) }; }) });
  out.push({ type: "kv", items: [{ k: E2("LA PERSONA DETRÁS", "THE PERSON BEHIND IT"), v: d.owner ?? "—" }, { k: E2("SE MUESTRA COMO", "SHOWN AS"), v: E2("Tu nombre, tus palabras y tu equipo", "Your name, your words and your team") }] });
  return { blocks: out, ed: { F, l: E2("Guardar", "Save"), valid: true, apply: (x) => aboutGuardar(d.id, x) } };
}

/* Lo que hizo To'Latino con la página (Super Admin): el dueño ve qué pasó y por qué (Panel v2 tempAdm / nameAdm). */
function avisosAdmin(c: Ctx, donde: "pag" | "hoy"): Bloque[] {
  const { d, E2 } = c, a = d.adm, out: Bloque[] = [];
  const motivo = a.reason ? `: ${a.reason}` : "";
  if (a.status === "hidden") out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`To’Latino ocultó tu página${motivo}. No sale en búsquedas ni en la categoría.`, `To’Latino hid your page${motivo}. It doesn’t show in search or the category.`) });
  else if (a.status === "suspended") out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`To’Latino suspendió tu página${motivo}. No sale en búsquedas ni en la categoría.`, `To’Latino suspended your page${motivo}. It doesn’t show in search or the category.`) });
  else if (a.status === "closed") out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`To’Latino cerró tu negocio en la app${motivo}.`, `To’Latino closed your business on the app${motivo}.`) });
  if (a.tempUntil) out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`To’Latino cerró tu página por unos días${a.tempReason ? `: ${a.tempReason}` : ""}. Los clientes la ven como «cerrado temporalmente».`, `To’Latino closed your page for a few days${a.tempReason ? `: ${a.tempReason}` : ""}. Clients see it as “temporarily closed”.`) });
  if (donde === "pag" && a.nombre) out.push({ type: "note", tone: "warn", icon: "edit", t: E2(`To’Latino corrigió tu nombre en la página: «${d.name}».`, `To’Latino corrected your name on the page: “${d.name}”.`) });
  if (donde === "pag" && d.ver.sello === "revoked") out.push({ type: "note", tone: "danger", icon: "shield", t: E2("To’Latino te quitó el sello Verificado. Puedes pedirlo otra vez cuando lo arregles.", "To’Latino removed your Verified badge. You can request it again once it is fixed."), cta: E2("Ver", "See"), onCta: () => c.go("pag", "ver") });
  return out;
}

function selloL(c: Ctx) {
  const { E2 } = c, s = c.d.ver.sello;
  return s === "ok" ? { t: E2("Tienes el sello", "You have the badge"), tag: E2("VERIFICADO", "VERIFIED"), tone: "signal" }
    : s === "review" ? { t: E2("En revisión · unas 48 h", "In review · about 48 h"), tag: E2("EN REVISIÓN", "IN REVIEW"), tone: "action" }
    : s === "info" ? { t: E2("To’Latino necesita un dato más", "To’Latino needs one more detail"), tag: E2("TE FALTA UN DATO", "ONE MORE DETAIL"), tone: "neutral" }
    : s === "no" ? { t: E2("No se aprobó esta vez", "Not approved this time"), tag: E2("NO APROBADO", "NOT APPROVED"), tone: "danger" }
    : { t: E2("Pide el sello", "Request the badge"), tag: null, tone: "action" };
}

/* Verificación y sello (sub ver, Panel v2 L1385–1390). El correo se verifica con el envío de correos (Fase 2). */
function verificacion(c: Ctx): (Bloque | null)[] {
  const { d, E2 } = c, v = d.ver, s = v.sello, out: (Bloque | null)[] = [];
  if (s === "revoked") out.push({ type: "note", tone: "danger", icon: "shield", t: E2("To’Latino te quitó el sello Verificado. Puedes pedirlo otra vez cuando lo arregles.", "To’Latino removed your Verified badge. You can request it again once it is fixed.") });
  const lvl = 35 + (v.email ? 25 : 0) + (s === "ok" ? 40 : s === "review" ? 10 : 0);
  out.push({ type: "kpis", cols: "repeat(2,minmax(0,1fr))", items: [
    { k: E2("NIVEL DE CONFIANZA", "TRUST LEVEL"), v: lvl < 50 ? E2("Básico", "Basic") : lvl < 80 ? E2("Bueno", "Good") : E2("Alto", "High"), s: `${lvl} / 100` },
    { k: E2("SE VE EN TU PÁGINA", "SHOWS ON YOUR PAGE"), v: s === "ok" ? "✓" : "—", s: s === "ok" ? E2("check azul junto al nombre", "blue check next to the name") : E2("aún sin sello", "no badge yet") },
  ] });
  out.push({ type: "rows", items: [
    { icon: "phone", t: E2("Teléfono", "Phone"), s: v.phone || "—", tag: v.phoneOk ? E2("VERIFICADO", "VERIFIED") : null, tone: "signal" },
    { icon: "chat", t: E2("Correo", "Email"), s: v.email ?? E2("Para recibos y para recuperar tu cuenta.", "For receipts and to recover your account."), tag: v.email ? E2("VERIFICADO", "VERIFIED") : null, tone: "signal" },
  ] });
  const L = selloL(c);
  const acts = s === "none" || s === "no" || s === "revoked" || s === "canceled"
    ? [{ l: s === "no" || s === "revoked" ? E2("Volver a pedir el sello", "Request the badge again") : E2("Solicitar sello", "Request badge"), v: "action", icon: "shield", off: c.pending, onClick: () => c.run(() => selloPedir(d.id), E2("Solicitud enviada.", "Request sent.")) }]
    : s === "info" ? [{ l: E2("Ya lo mandé", "I sent it"), v: "action", icon: "check", off: c.pending, onClick: () => c.run(() => selloPedir(d.id), E2("Gracias. To’Latino sigue con la revisión.", "Thanks. To’Latino continues the review.")) }]
    : s === "review" ? [{ l: E2("Cancelar solicitud", "Cancel request"), off: c.pending, onClick: () => c.run(() => selloCancelar(d.id)) }] : [];
  out.push({ type: "rows", k: E2("SELLO VERIFICADO POR TO'LATINO", "VERIFIED BY TO'LATINO BADGE"), items: [{
    icon: "shield", t: L.t, tag: L.tag, tone: L.tone,
    s: (s === "info" || s === "no") ? (v.selloNote || E2("Revisa tu página y vuelve a pedirlo.", "Check your page and request it again.")) : E2(`El equipo revisa que el negocio existe en ${d.ciudad}, que tú lo representas y que tu página coincide. Nunca se piden documentos.`, `The team checks the business exists in ${d.ciudad}, that you represent it and that your page matches. No documents are ever requested.`),
    acts,
  }] });
  return out;
}

/* Tus licencias (Panel v2 · Lo que vendes › Tu herramienta, dash2-cat.js DC:332-364): cada licencia con su estado, su
   número (lo pide el verificador; un número nuevo vuelve a revisión), agregar del catálogo y «lo que no haces». */
function licencias(c: Ctx): Sec {
  const { d, E2 } = c, L = d.lic!, out: (Bloque | null)[] = [], vivas = L.filas;
  const F = c.form<{ nums: Record<string, string> }>(`lic:${d.id}`, { nums: Object.fromEntries(vivas.map((x) => [x.id, x.number ?? ""])) });
  out.push({ type: "rows", k: E2("TUS LICENCIAS", "YOUR LICENSES"), items: vivas.map((x) => {
    const st = x.status === "valid" ? { s: E2("Verificada por To’Latino · sale en tu página", "Verified by To’Latino · shows on your page"), tag: E2("VERIFICADA", "VERIFIED"), tone: "signal", ibg: "rgba(0,229,196,.14)", ifg: "var(--tl-open-text)" }
      : x.status === "review" ? { s: E2("En revisión · To’Latino la verifica en 72 h", "In review · To’Latino verifies it within 72 h"), tag: E2("EN REVISIÓN", "IN REVIEW"), tone: "action", ibg: "rgba(255,176,32,.14)", ifg: "var(--tl-pro-ink)" }
      : { s: E2("No se pudo verificar · revisa el número", "Could not be verified · check the number"), tag: E2("NO VERIFICADA", "NOT VERIFIED"), tone: "danger", ibg: "rgba(192,57,43,.08)", ifg: "var(--tl-danger)" };
    return { key: x.id, icon: "law", ibg: st.ibg, ifg: st.ifg, t: c.es ? x.title.es : x.title.en || x.title.es, s: st.s, tag: st.tag, tone: st.tone,
      acts: vivas.length > 1 ? [{ l: E2("Quitar", "Remove"), v: "secondary", off: c.pending, onClick: () => c.run(() => licenciaQuitar(d.id, x.id), E2("Licencia quitada.", "License removed.")) }] : undefined };
  }) });
  for (const x of vivas) out.push({ type: "field", k: `${E2("NÚMERO", "NUMBER")} · ${(c.es ? x.title.es : x.title.en || x.title.es).toUpperCase()}`, val: F.d.nums[x.id] ?? "", max: 40, pre: x.label, ph: E2("Como sale en tu licencia", "As it appears on your license"), onChange: (v) => F.set({ nums: { ...F.d.nums, [x.id]: v.replace(/[^A-Za-z0-9 #./-]/g, "") } }), help: E2("Con el número, el equipo la busca en el registro oficial.", "With the number, the team looks it up in the official registry.") });
  const tengo = new Set(vivas.map((x) => x.kind)), libres = L.catalogo.filter((k) => !tengo.has(k.key));
  if (libres.length) out.push({ type: "chips", k: E2("AGREGAR UNA LICENCIA", "ADD A LICENSE"), help: E2("se verifica antes de salir", "verified before it shows"), items: libres.map((k) => ({ l: k.l, v: "filter", onClick: () => c.run(() => licenciaAgregar(d.id, k.key), E2("Enviada. To’Latino la verifica en 72 h.", "Sent. To’Latino verifies it within 72 h.")) })) });
  if (vivas.some((x) => LIC_LEGAL.includes(x.kind))) out.push({ type: "chips", k: E2("LO QUE NO HACES · SALE EN TU PÁGINA", "WHAT YOU DO NOT DO · SHOWN ON YOUR PAGE"), items: NO_HAGO.map((x, i) => ({ l: c.es ? x[0] : x[1], v: L.cant === (c.es ? x[0] : x[1]) ? "selected" : "filter", onClick: () => c.run(() => noHago(d.id, i), E2("Guardado · ya se ve en tu página", "Saved · it shows on your page now")) })) });
  out.push({ type: "note", tone: "ink", icon: "law", t: E2("Nadie te garantiza un resultado. En EE. UU. un notario no es abogado: tu página lo dice.", "No one can guarantee a result. In the U.S. a notary is not a lawyer: your page says so.") });
  return { blocks: out, ed: { F, l: E2("Guardar", "Save"), valid: true, toast: E2("Enviado. To’Latino lo revisa en 72 h.", "Sent. To’Latino checks it within 72 h."),
    apply: async (z: { nums: Record<string, string> }) => { for (const x of vivas) { const v = (z.nums[x.id] ?? "").trim(); if (v && v !== (x.number ?? "")) { const r = await licenciaNumero(d.id, x.id, v); if (!r.ok) return r; } } return { ok: true } as Res; } } };
}
