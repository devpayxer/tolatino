"use client";
/* APP-NEG-MAPA (diseño «To'Latino Mapa»): mapa con pines + lista, el más cerca primero. Se arrastra y se acerca con + y −;
   el pin morado vuelve al punto. Negro = destacado (Pro), morado = Free, gris = fuera del radio, círculo punteado = trabaja
   desde casa (zona aproximada). Teselas propias (OpenStreetMap, /teselas). Los datos y el radio los decide el servidor. */
import * as UI from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type PointerEvent as PE } from "react";
import { proyectar, TESELAS, vista, type LL } from "@/lib/mapa-geo";
import type { FiltroMapa, Pin } from "@/lib/mapa";
import { registrarToque } from "../acciones";

type N = "Icon" | "Button" | "Chip" | "BusinessRow";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, BusinessRow } = UI as unknown as Record<N, ComponentType<any>>;

export type VistaMapa = {
  lang: "es" | "en"; ciudad: string; rad: number; centro: LL; f: FiltroMapa; ctx: boolean; catSlug: string | null; volver: string | null;
  titulo: string; cats: { slug: string; l: string }[]; total: number; adentro: number; sinPin: number; pins: Pin[];
};

const MONO = "'JetBrains Mono',monospace";
const KF = "@keyframes mpFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}";
// Inversa de proyectar (píxel del mundo → lat/lng), para arrastrar el mapa.
const desproyectar = (x: number, y: number, z: number): LL => { const n = Math.pow(2, z) * 256; return [(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI, (x / n) * 360 - 180]; };

function useAncho() {
  const [w, setW] = useState(0);
  useEffect(() => { const f = () => setW(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return w;
}

export function Mapa({ v }: { v: VistaMapa }) {
  const es = v.lang === "es", E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ruta = usePathname(), sp = useSearchParams();
  const dw = useAncho(), desk = dw >= 1024, wide = desk && dw >= 960;
  const [sel, setSel] = useState<string | null>(null), [hov, setHov] = useState<string | null>(null);
  const [cen, setCen] = useState<LL | null>(null), [dz, setDz] = useState<number | null>(null), [n, setN] = useState(20);
  const [arrastrando, setArrastrando] = useState(false);
  const drag = useRef<{ x: number; y: number; c: [number, number]; z: number; sc: number } | null>(null), movio = useRef(false);

  // Cambia la lista (filtros nuevos del servidor): se cierra lo elegido y se vuelve a 20.
  useEffect(() => { setSel(null); setHov(null); setN(20); }, [v.pins]);

  const W = wide ? Math.max(480, Math.min(dw, 1440) - 60 - 400 - 28) : desk ? dw - 60 : dw || 393, H = wide ? 680 : desk ? 440 : 380;
  const L = desk
    ? { pad: "22px 30px 48px", gap: "18px", topBg: "transparent", topPad: "0", topBd: "none", h1: "28px", chipsM: "0", chipsP: "0", cols: wide ? "400px minmax(0,1fr)" : "minmax(0,1fr)", colGap: wide ? "28px" : "18px", mapOrder: wide ? 2 : 1, listOrder: wide ? 1 : 2, mapPos: wide ? "sticky" : "relative", mapTop: "16px", mapR: "22px", cardR: "auto", cardW: "380px", listMax: wide ? `${H + 30}px` : "none", listOv: wide ? "auto" : "visible", listPad: "2px 4px 2px 2px" }
    : { pad: "0 0 32px", gap: "0", topBg: "var(--tl-white)", topPad: "12px 16px 12px", topBd: "1px solid rgba(11,14,18,.07)", h1: "20px", chipsM: "0 -16px", chipsP: "0 16px", cols: "minmax(0,1fr)", colGap: "16px", mapOrder: 1, listOrder: 2, mapPos: "relative", mapTop: "0", mapR: "0", cardR: "12px", cardW: "auto", listMax: "none", listOv: "visible", listPad: "0 16px" };

  // ── Mapa: zoom para que el radio quepa, desplazamiento y teselas (matemática del prototipo) ──
  const ctr = v.centro, rad = v.rad;
  const dz0 = desk ? 0 : 0.5, d = dz ?? dz0;
  const V = vista(ctr, rad, Math.min(W, H) / 2 - 26);
  const zf = Math.max(3, Math.min(18, V.zf + d)), z = Math.max(3, Math.min(17, Math.floor(zf))), sc = Math.pow(2, zf - z);
  const centro = cen ?? ctr, cw = proyectar(centro, z), hw = W / 2 / sc + 256, hh = H / 2 / sc + 256;
  const tiles: { src: string; left: number; top: number }[] = [];
  for (let x = Math.floor((cw[0] - hw) / 256); x <= Math.floor((cw[0] + hw) / 256); x++)
    for (let y = Math.floor((cw[1] - hh) / 256); y <= Math.floor((cw[1] + hh) / 256); y++)
      tiles.push({ src: `${TESELAS}/${z}/${x}/${y}.png`, left: Math.round(x * 256 - cw[0]), top: Math.round(y * 256 - cw[1]) });
  const scr = (ll: LL) => { const p = proyectar(ll, z); return [(p[0] - cw[0]) * sc, (p[1] - cw[1]) * sc] as const; };
  const rc = scr(ctr), mpp = (156543.03392 * Math.cos((ctr[0] * Math.PI) / 180)) / Math.pow(2, zf), rd = Math.round(((rad * 1609.34) / mpp) * 2);

  const hot = hov ?? sel, seleccion = sel ? v.pins.find((b) => b.id === sel) ?? null : null;
  const conPin = (b: Pin): b is Pin & { lat: number; lng: number } => b.lat != null && b.lng != null;
  const pins = v.pins.filter(conPin).map((b) => {
    const [x, y] = scr([b.lat, b.lng]), on = hot === b.id, ap = b.casa;
    if (Math.abs(x) > W / 2 + 30 || Math.abs(y) > H / 2 + 30) return null;
    const k = d < 0.5 ? 0.85 : 1, s = on ? 22 : ap ? 20 : Math.round((b.pro ? 15 : 11) * k);
    const bg = !b.dentro ? "rgba(11,14,18,.3)" : ap ? "rgba(75,55,245,.14)" : b.pro ? "var(--tl-ink)" : "var(--tl-action)";
    return { id: b.id, name: b.name, x: Math.round(x), y: Math.round(y), s, on, bg: on ? (ap ? "rgba(75,55,245,.3)" : "var(--tl-ink)") : bg,
      bd: ap ? "1.5px dashed var(--tl-action)" : on ? "3px solid var(--tl-white)" : "2px solid var(--tl-white)",
      sh: on ? "0 0 0 5px rgba(11,14,18,.18)" : "0 2px 6px -2px rgba(11,14,18,.45)", z: on ? 30 : b.pro ? 12 : 10 };
  }).filter((p): p is NonNullable<typeof p> => !!p);

  // ── Lista ──
  const meta = (b: Pin) => [b.reviews >= 5 && b.rating ? `★ ${b.rating.toFixed(1)}` : "", conPin(b) ? `${b.mi ?? "—"} MI` : b.domicilio ? E2("A DOMICILIO", "COMES TO YOU") : E2("SIN LOCAL", "NO VENUE"), (b.sub ?? "").toUpperCase()].filter(Boolean).join(" · ");
  const fila = (b: Pin) => ({ name: b.name, meta: meta(b), verified: b.verified, slot: b.eta ?? "", image: b.photo ?? undefined });
  const abrir = (id: string) => router.push(`/n/${id}`);
  const comoLlegar = (b: Pin) => { if (!conPin(b) || b.casa) return; void registrarToque(b.id, "directions", "mapa"); window.open(`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`, "_blank", "noopener"); };

  // ── Filtros: van en la dirección (el servidor vuelve a contar) ──
  const ir = (cambios: Record<string, string | null>) => {
    const q = new URLSearchParams(sp.toString());
    for (const [k, x] of Object.entries(cambios)) { if (x == null) q.delete(k); else q.set(k, x); }
    router.replace(q.size ? `${ruta}?${q}` : ruta, { scroll: false });
  };
  const chips = ([["all", E2("Todos", "All")], ["open", E2("Abierto ahora", "Open now")], ["ver", E2("Verificados", "Verified")], ["pro", E2("Destacados", "Featured")]] as const)
    .map(([k, l]): { key: string; l: string; v: string; onClick: () => void } => ({ key: k, l, v: v.f === k ? "selected" : "filter", onClick: () => ir({ m: k === "all" ? null : k }) }))
    .concat(v.ctx ? [] : v.cats.map((c) => ({ key: `c-${c.slug}`, l: c.l, v: v.catSlug === c.slug ? "selected" : "filter", onClick: () => ir({ cat: v.catSlug === c.slug ? null : c.slug }) })));
  const hayFiltros = v.f !== "all" || (!v.ctx && !!v.catSlug);
  const atras = () => { if (window.history.length > 1) router.back(); else router.push(v.volver ?? "/"); };
  const cambiarRadio = () => ir({ ciudad: "" });

  // ── Arrastrar ──
  const abajo = (e: PE<HTMLDivElement>) => { movio.current = false; drag.current = { x: e.clientX, y: e.clientY, c: proyectar(centro, z), z, sc }; };
  const mover = (e: PE<HTMLDivElement>) => {
    const g = drag.current; if (!g) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!movio.current && Math.abs(dx) + Math.abs(dy) < 5) return;
    if (!movio.current) { movio.current = true; setArrastrando(true); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sin captura */ } }
    setCen(desproyectar(g.c[0] - dx / g.sc, g.c[1] - dy / g.sc, g.z));
  };
  const arriba = () => { if (drag.current) { drag.current = null; setArrastrando(false); } };
  const clicMapa = () => { if (movio.current) { movio.current = false; return; } if (sel) setSel(null); };
  const parar = (e: { stopPropagation: () => void }) => e.stopPropagation();
  const boton: CSSProperties = { width: 38, height: 38, borderRadius: 12, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.1)", display: "grid", placeItems: "center", cursor: "pointer" };

  if (!dw) return <div style={{ minHeight: 600, background: "var(--tl-paper)" }} />;
  const verMas = Math.min(20, v.pins.length - n);
  return (
    <div data-screen-label={`APP-NEG-MAPA · ${desk ? "desktop" : "móvil"}`} style={{ minHeight: "100%", background: "var(--tl-paper)", display: "flex", flexDirection: "column", padding: L.pad, boxSizing: "border-box", gap: L.gap, maxWidth: desk ? 1440 : undefined, margin: desk ? "0 auto" : undefined, width: "100%" }}>
      <style>{KF}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, background: L.topBg, padding: L.topPad, borderBottom: L.topBd }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span role="button" aria-label={E2("Volver", "Back")} onClick={atras} style={{ ...boton, flex: "none" }}><Icon name="chevronLeft" size={18} strokeWidth={2} /></span>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".14em", color: "rgba(11,14,18,.5)" }}>{`${E2("MAPA · ", "MAP · ")}${v.ciudad} · ${rad} MI`.toUpperCase()}</span>
            <h1 style={{ margin: 0, font: `800 ${L.h1}/1.12 Sora,sans-serif`, letterSpacing: "-.035em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.titulo}</h1>
          </div>
          <span role="button" onClick={cambiarRadio} style={{ flex: "none", height: 36, padding: "0 12px", borderRadius: 12, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.12)", display: "flex", alignItems: "center", gap: 7, font: "700 12.5px Manrope,sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}>
            <Icon name="pin" size={15} color="var(--tl-action)" />{desk ? `${rad} mi · ${E2("Cambiar", "Change")}` : `${rad} mi`}
          </span>
        </div>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "none", margin: L.chipsM, padding: L.chipsP }}>
          {chips.map((c) => <span key={c.key} style={{ flex: "none", display: "flex" }}><Chip variant={c.v} onClick={c.onClick}>{c.l}</Chip></span>)}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: L.cols, gap: L.colGap, alignItems: "start" }}>
        <div style={{ order: L.mapOrder, minWidth: 0, position: L.mapPos as CSSProperties["position"], top: L.mapTop }}>
          <div data-screen-label="Mapa · pines" onPointerDown={abajo} onPointerMove={mover} onPointerUp={arriba} onPointerCancel={arriba} onPointerLeave={arriba} onClick={clicMapa}
            style={{ position: "relative", height: H, borderRadius: L.mapR, overflow: "hidden", background: "var(--tl-photo-bg)", border: "1px solid rgba(11,14,18,.08)", touchAction: "none", cursor: arrastrando ? "grabbing" : "grab", userSelect: "none" }}>
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, transform: `scale(${sc})` }}>
              {tiles.map((t) => <span key={t.src} style={{ position: "absolute", left: t.left, top: t.top, width: 256, height: 256, display: "block", pointerEvents: "none", backgroundImage: `url(${t.src})`, backgroundSize: "256px 256px" }} />)}
            </div>
            <div style={{ position: "absolute", left: `calc(50% + ${Math.round(rc[0])}px)`, top: `calc(50% + ${Math.round(rc[1])}px)`, width: rd, height: rd, transform: "translate(-50%,-50%)", borderRadius: 999, border: "2px solid var(--tl-action)", background: "rgba(75,55,245,.07)", boxSizing: "border-box", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: `calc(50% + ${Math.round(rc[0])}px)`, top: `calc(50% + ${Math.round(rc[1])}px)`, width: 12, height: 12, transform: "translate(-50%,-50%)", borderRadius: 99, background: "var(--tl-action)", border: "3px solid var(--tl-white)", boxShadow: "0 0 0 6px rgba(75,55,245,.18)", pointerEvents: "none" }} />
            {pins.map((p) => (
              <div key={p.id} role="button" aria-label={p.name} onClick={(e) => { e.stopPropagation(); if (!movio.current) setSel(p.id); }}
                style={{ position: "absolute", left: `calc(50% + ${p.x}px)`, top: `calc(50% + ${p.y}px)`, width: p.s, height: p.s, transform: "translate(-50%,-50%)", borderRadius: 99, background: p.bg, border: p.bd, boxSizing: "border-box", boxShadow: p.sh, zIndex: p.z, cursor: "pointer" }}>
                {p.on ? <span style={{ position: "absolute", left: "50%", bottom: "calc(100% + 6px)", transform: "translateX(-50%)", padding: "6px 10px", borderRadius: 10, background: "var(--tl-ink)", color: "var(--tl-white)", font: "700 12px Manrope,sans-serif", whiteSpace: "nowrap", boxShadow: "0 10px 22px -12px rgba(11,14,18,.6)" }}>{p.name}</span> : null}
              </div>
            ))}
            <div style={{ position: "absolute", left: 12, top: 12, zIndex: 35, padding: "7px 10px", borderRadius: 10, background: "rgba(255,255,255,.94)", font: `700 10px ${MONO}`, letterSpacing: ".08em", pointerEvents: "none" }}>{`${v.adentro}${E2(` A ${rad} MI`, ` WITHIN ${rad} MI`)}`}</div>
            <div style={{ position: "absolute", right: 12, top: 12, display: "flex", flexDirection: "column", gap: 6, zIndex: 35 }} onPointerDown={parar}>
              <span role="button" aria-label={E2("Acercar", "Zoom in")} onClick={(e) => { e.stopPropagation(); setDz(Math.min(4, d + 1)); }} style={boton}><Icon name="plus" size={16} strokeWidth={2} /></span>
              <span role="button" aria-label={E2("Alejar", "Zoom out")} onClick={(e) => { e.stopPropagation(); setDz(Math.max(-2, d - 1)); }} style={boton}><Icon name="minus" size={16} strokeWidth={2} /></span>
              <span role="button" aria-label={E2("Volver a mi punto", "Back to my point")} onClick={(e) => { e.stopPropagation(); setDz(null); setCen(null); }} style={boton}><Icon name="pin" size={16} color="var(--tl-action)" /></span>
            </div>
            <span style={{ position: "absolute", right: 6, bottom: 4, zIndex: 34, font: "500 9px Manrope,sans-serif", color: "rgba(11,14,18,.6)", pointerEvents: "none" }}>© OpenMapTiles · © OpenStreetMap</span>
            {seleccion ? (
              <div onClick={parar} onPointerDown={parar} style={{ position: "absolute", zIndex: 40, left: 12, right: L.cardR, width: L.cardW, bottom: 12, padding: 12, borderRadius: 17, background: "var(--tl-white)", boxShadow: "0 18px 40px -20px rgba(11,14,18,.55)", display: "flex", flexDirection: "column", gap: 10, animation: "mpFade .2s ease-out", cursor: "default" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0, display: "grid" }}><BusinessRow {...fila(seleccion)} onClick={() => abrir(seleccion.id)} /></div>
                  <span role="button" aria-label={E2("Cerrar", "Close")} onClick={() => setSel(null)} style={{ width: 30, height: 30, borderRadius: 10, background: "rgba(11,14,18,.06)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="close" size={13} strokeWidth={2.2} /></span>
                </div>
                {seleccion.casa ? <span style={{ font: "600 12px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Trabaja desde casa: el pin es la zona. La dirección exacta te llega al confirmar.", "Works from home: the pin is the area. The exact address arrives on confirmation.")}</span> : null}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button variant="primary" size="sm" onClick={() => abrir(seleccion.id)}>{E2("Ver negocio", "See business")}</Button>
                  {!seleccion.casa && conPin(seleccion) ? <Button variant="secondary" size="sm" icon="pin" onClick={() => comoLlegar(seleccion)}>{E2("Cómo llegar", "Directions")}</Button> : null}
                </div>
              </div>
            ) : null}
          </div>
          <span style={{ display: "block", margin: desk ? "8px 0 0" : "8px 16px 14px", font: "600 11px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.5)" }}>{E2("Negro: destacados · morado: Free · círculo punteado: trabaja desde casa, zona aproximada.", "Black: featured · purple: Free · dotted circle: works from home, approximate area.")}</span>
        </div>

        <div style={{ order: L.listOrder, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, maxHeight: L.listMax, overflowY: L.listOv as CSSProperties["overflowY"], padding: L.listPad }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <span style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".14em", color: "rgba(11,14,18,.5)" }}>
              {`${v.total} ${v.total === 1 ? E2("NEGOCIO", "BUSINESS") : E2("NEGOCIOS", "BUSINESSES")}${E2(" · EL MÁS CERCA PRIMERO", " · NEAREST FIRST")}${v.ctx ? E2(" · TUS FILTROS", " · YOUR FILTERS") : ""}`}
            </span>
            {hayFiltros ? <span role="button" onClick={() => ir({ m: null, ...(v.ctx ? {} : { cat: null }) })} style={{ font: "700 12.5px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{E2("Quitar filtros", "Clear filters")}</span> : null}
          </div>
          {!v.pins.length ? (
            <div style={{ padding: "22px 18px", borderRadius: 18, background: "var(--tl-white)", border: "1px dashed rgba(11,14,18,.16)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
              <span style={{ font: "800 15px/1.3 Sora,sans-serif", letterSpacing: "-.02em" }}>{E2("Nada con ese filtro", "Nothing with that filter")}</span>
              <span style={{ font: "500 12.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Quita un filtro o amplía el radio.", "Remove a filter or widen the radius.")}</span>
            </div>
          ) : null}
          {v.pins.slice(0, n).map((b) => (
            <div key={b.id} onMouseEnter={wide ? () => setHov(b.id) : undefined} onMouseLeave={wide ? () => setHov(null) : undefined} style={{ borderRadius: 17, boxShadow: hot === b.id ? "0 0 0 2px var(--tl-ink)" : "none", display: "grid" }}>
              <BusinessRow {...fila(b)} onClick={wide ? () => { setSel(b.id); if (conPin(b)) setCen([b.lat, b.lng]); } : () => abrir(b.id)} />
            </div>
          ))}
          {verMas > 0 ? <div style={{ display: "flex" }}><Button variant="secondary" size="md" block onClick={() => setN(n + 20)}>{E2(`Ver ${verMas} más`, `See ${verMas} more`)}</Button></div> : null}
          {v.sinPin > 0 ? (
            <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(75,55,245,.07)", display: "flex", gap: 10, alignItems: "flex-start", color: "var(--tl-action-ink)" }}>
              <span style={{ display: "grid", flex: "none", paddingTop: 1 }}><Icon name="info" size={16} color="currentColor" /></span>
              <span style={{ font: "600 12.5px/1.5 Manrope,sans-serif", textWrap: "pretty" } as CSSProperties}>{v.sinPin === 1
                ? E2("1 negocio no tiene local (va a domicilio o atiende por teléfono): sale en la lista, no en el mapa.", "1 business has no venue (comes to you or works by phone): it is listed, not pinned.")
                : E2(`${v.sinPin} negocios no tienen local (van a domicilio o atienden por teléfono): salen en la lista, no en el mapa.`, `${v.sinPin} businesses have no venue (they come to you or work by phone): they are listed, not pinned.`)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
