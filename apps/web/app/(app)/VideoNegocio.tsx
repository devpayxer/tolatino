"use client";
/* C-001 · Video de presentación del negocio + anillo «Hoy en el barrio» (canvas tolatino-master+, sección D y prototipo «Tarjeta · video y
   anillo», «Ficha · portada con video», «Hoy en el barrio · anillo del negocio»).
   - VideoTarjeta: el <video> de la tarjeta Pro. En una lista SOLO se mueve el que queda más cerca del centro de la pantalla; los demás muestran
     su portada quieta con ▶. Con «ahorro de datos» (o movimiento reducido) ninguno se mueve solo: el vecino toca ▶ para verlo.
   - VideoPortada: la portada de la página del negocio (sin sonido, en bucle; «SIN SONIDO · TOCA» activa el sonido).
   - VisorHoy: el anillo abre los avisos de hoy de ESE negocio (barras por aviso, toque izquierda/derecha, «Ver la página»); pantalla
     completa en el teléfono y ventana centrada de 400 × 680 en la computadora. Esc cierra; ← → navegan. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { HOY_T, finHoy, type Historia } from "@/lib/hoy-comun";
import { useAhora } from "@/lib/ahora";
import { fotoFondo } from "@tolatino/ui";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Button, Icon } = UI as unknown as Record<"Button" | "Icon", ComponentType<any>>;
const MONO = "'JetBrains Mono',monospace";

/* ¿El teléfono pide ahorrar datos o menos movimiento? Entonces nada se mueve solo. */
function sinAutoplay(): boolean {
  if (typeof window === "undefined") return true;
  const c = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
  return !!c?.saveData || matchMedia("(prefers-reduced-data: reduce)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* Un solo vigilante para toda la página: de los videos registrados, se mueve el que tiene el centro más cerca del centro de la pantalla
   (y está al menos a la mitad visible). Uno a la vez. */
const vivos = new Set<HTMLVideoElement>();
let marco = 0;
function elegir() {
  marco = 0;
  if (sinAutoplay()) return;
  const h = window.innerHeight, cy = h / 2;
  let mejor: HTMLVideoElement | null = null, dist = Infinity;
  for (const v of vivos) {
    const r = v.getBoundingClientRect();
    const visible = Math.max(0, Math.min(r.bottom, h) - Math.max(r.top, 0));
    if (r.height <= 0 || visible < r.height / 2) continue;
    const d = Math.abs((r.top + r.bottom) / 2 - cy);
    if (d < dist) { dist = d; mejor = v; }
  }
  for (const v of vivos) {
    // data-centro: el elegido (las pruebas lo leen; el navegador de pruebas no reproduce H.264, así que «paused» no dice cuál es).
    if (v === mejor) { v.dataset.centro = "1"; if (v.paused) void v.play().catch(() => undefined); }
    else { delete v.dataset.centro; if (!v.paused && !v.dataset.tocado) v.pause(); }
  }
}
const pedir = () => { if (!marco) marco = requestAnimationFrame(elegir); };
function registrar(v: HTMLVideoElement) {
  vivos.add(v);
  if (vivos.size === 1) { addEventListener("scroll", pedir, { passive: true }); addEventListener("resize", pedir); document.addEventListener("visibilitychange", pedir); }
  pedir();
  return () => {
    vivos.delete(v);
    if (!vivos.size) { removeEventListener("scroll", pedir); removeEventListener("resize", pedir); document.removeEventListener("visibilitychange", pedir); }
  };
}

function Barra({ v, abajo = 0, alto = 3 }: { v: HTMLVideoElement | null; abajo?: number; alto?: number }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!v) return;
    const f = () => setP(v.duration ? v.currentTime / v.duration : 0);
    v.addEventListener("timeupdate", f);
    return () => v.removeEventListener("timeupdate", f);
  }, [v]);
  return <div aria-hidden style={{ position: "absolute", left: 0, bottom: abajo, height: alto, width: `${Math.round(p * 1000) / 10}%`, background: "var(--tl-white)", zIndex: 2, transition: "width .25s linear" }} />;
}

const chip: CSSProperties = { position: "absolute", height: 26, padding: "0 10px", borderRadius: 99, background: "rgba(11,14,18,.6)", color: "var(--tl-white)", display: "flex", alignItems: "center", font: `800 9px ${MONO}`, letterSpacing: ".08em", zIndex: 2 };

/* `solo`: la galería es de una sola foto (la celda grande ocupa todo el ancho): el ▶ y «SIN SONIDO» se apartan del corazón de guardar (Vitrina, AK). */
export function VideoTarjeta({ src, poster, nombre, es, solo = false }: { src: string; poster: string; nombre: string; es: boolean; solo?: boolean }) {
  const der = solo ? 56 : 12;
  const ref = useRef<HTMLVideoElement | null>(null);
  const [el, setEl] = useState<HTMLVideoElement | null>(null);
  const [mueve, setMueve] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    setEl(v);
    const on = () => setMueve(true), off = () => setMueve(false);
    v.addEventListener("play", on); v.addEventListener("pause", off);
    const quitar = registrar(v);
    return () => { quitar(); v.removeEventListener("play", on); v.removeEventListener("pause", off); };
  }, []);
  const tocar = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    v.dataset.tocado = "1";
    for (const o of vivos) if (o !== v && !o.paused) o.pause();
    void v.play().catch(() => undefined);
  };
  return (
    <>
      <video ref={ref} src={src} poster={poster} muted loop playsInline preload="metadata" disablePictureInPicture disableRemotePlayback controls={false}
        aria-label={es ? `Video de ${nombre}` : `${nombre} video`} data-video-tarjeta={mueve ? "mueve" : "quieto"}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {mueve ? (
        <>
          <span style={{ ...chip, right: der, top: 12 }}>{es ? "SIN SONIDO" : "MUTED"}</span>
          <Barra v={el} />
        </>
      ) : (
        // Vitrina (AK): el círculo se ve de 30; la caja del botón mide 44 (objetivos táctiles) y lo lleva dentro.
        <button type="button" onClick={tocar} aria-label={es ? `Ver el video de ${nombre}` : `Play the ${nombre} video`}
          style={{ position: "absolute", right: der - 7, top: 5, width: 44, height: 44, border: 0, padding: 0, margin: 0, background: "none", display: "grid", placeItems: "center", cursor: "pointer", zIndex: 2 }}>
          <span style={{ width: 30, height: 30, borderRadius: 99, background: "rgba(11,14,18,.6)", display: "grid", placeItems: "center" }}>
            <span style={{ marginLeft: 2, width: 0, height: 0, borderLeft: "8px solid var(--tl-white)", borderTop: "5px solid transparent", borderBottom: "5px solid transparent" }} />
          </span>
        </button>
      )}
    </>
  );
}

/* La portada de la página del negocio: sin sonido y en bucle; tocar «SIN SONIDO · TOCA» (o el video en el teléfono) activa el sonido.
   Se pausa cuando sale de la pantalla o la pestaña se esconde. Con ahorro de datos: la portada quieta y ▶. */
export function VideoPortada({ src, poster, es, desk = false, abajo = 0, onClick, chipPos }: { src: string; poster: string; es: boolean; desk?: boolean; abajo?: number; onClick?: () => void; chipPos?: CSSProperties }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [el, setEl] = useState<HTMLVideoElement | null>(null);
  const [mueve, setMueve] = useState(false), [sonido, setSonido] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    setEl(v);
    const on = () => setMueve(true), off = () => setMueve(false);
    v.addEventListener("play", on); v.addEventListener("pause", off);
    const io = new IntersectionObserver(([x]) => { if (x?.isIntersecting && !sinAutoplay() && !document.hidden) void v.play().catch(() => undefined); else v.pause(); }, { threshold: 0.25 });
    io.observe(v);
    const vis = () => { if (document.hidden) v.pause(); };
    document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); v.removeEventListener("play", on); v.removeEventListener("pause", off); };
  }, []);
  const conSonido = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted; setSonido(!v.muted);
    void v.play().catch(() => undefined);
  };
  return (
    <>
      <video ref={ref} src={src} poster={poster} muted loop playsInline preload="metadata" disablePictureInPicture disableRemotePlayback controls={false}
        aria-hidden data-video-portada={mueve ? "mueve" : "quieto"} onClick={desk ? onClick : conSonido}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "pointer" }} />
      <button type="button" onClick={conSonido} aria-pressed={sonido} aria-label={sonido ? (es ? "Quitar el sonido" : "Mute") : (es ? "Activar el sonido" : "Turn on sound")}
        style={{ ...chip, border: 0, cursor: "pointer", height: 32, padding: "0 11px", font: `800 ${desk ? 10 : 9.5}px ${MONO}`, ...(chipPos ?? (desk ? { left: 18, top: 18 } : { right: 16, top: 17 })) }}>
        {sonido ? (es ? "CON SONIDO" : "SOUND ON") : mueve ? (es ? "SIN SONIDO · TOCA" : "MUTED · TAP") : "▶"}
      </button>
      <Barra v={el} abajo={abajo} alto={desk ? 4 : 3} />
    </>
  );
}

/* El visor del anillo (pantalla completa / ventana centrada). */
export function VisorHoy({ h, es, onClose }: { h: Historia; es: boolean; onClose: () => void }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [desk, setDesk] = useState(false);
  const ahora = useAhora();
  const caja = useRef<HTMLDivElement | null>(null);
  const n = h.avisos.length, a = h.avisos[Math.min(i, n - 1)];
  const abrir = () => { onClose(); router.push(finHoy(h)); };
  const atras = () => setI((x) => Math.max(0, x - 1));
  const adelante = () => { if (i < n - 1) setI(i + 1); else abrir(); };
  useEffect(() => {
    setDesk(innerWidth >= 1024);
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowLeft") atras(); else if (e.key === "ArrowRight") adelante(); };
    addEventListener("keydown", k);
    const antes = document.activeElement as HTMLElement | null;
    caja.current?.focus();
    const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { removeEventListener("keydown", k); document.body.style.overflow = o; antes?.focus?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  if (!a || typeof document === "undefined") return null;
  const tipo = `${HOY_T[a.t][es ? "es" : "en"]}${n > 1 ? ` · ${i + 1}/${n}` : ""}`;
  const horas = Math.max(0, Math.floor((ahora - Date.parse(a.at)) / 3_600_000));
  const hace = horas < 1 ? (es ? "AHORA" : "NOW") : es ? `HACE ${horas} H` : `${horas} H AGO`;
  const cuerpo = (
    <div ref={caja} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`${es ? "Hoy en el barrio" : "Today nearby"} · ${h.nombre}`} data-visor-hoy={h.id}
      onClick={(e) => e.stopPropagation()}
      style={{ position: desk ? "absolute" : "fixed", ...(desk ? { left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 400, height: "min(680px, calc(100dvh - 60px))", borderRadius: 26, boxShadow: "0 30px 60px -20px rgba(11,14,18,.6)" } : { inset: 0 }),
        zIndex: 95, overflow: "hidden", background: "var(--tl-ink)", color: "var(--tl-white)", display: "flex", flexDirection: "column", outline: "none" }}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: "var(--tl-ink)", backgroundImage: a.foto ? fotoFondo(a.foto, 540) : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(11,14,18,.65) 0,rgba(11,14,18,0) 26%,rgba(11,14,18,0) 52%,rgba(11,14,18,.88) 100%)" }} />
      <div style={{ position: "relative", padding: "14px 14px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        {n > 1 ? <div style={{ display: "flex", gap: 4 }}>{h.avisos.map((x, j) => <div key={x.id} style={{ flex: 1, height: 3, borderRadius: 99, background: j <= i ? "var(--tl-white)" : "rgba(255,255,255,.35)" }} />)}</div> : null}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 38, height: 38, boxSizing: "border-box", borderRadius: 99, border: "2px solid var(--tl-white)", backgroundColor: "var(--tl-photo-bg)", backgroundImage: h.logo ? fotoFondo(h.logo, 38) : undefined, backgroundSize: "cover", backgroundPosition: "center", flex: "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "800 15px/1.2 Sora,sans-serif", letterSpacing: "-.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.nombre}</div>
            <div style={{ marginTop: 3, font: `700 9px ${MONO}`, letterSpacing: ".08em", color: "rgba(255,255,255,.75)" }}>{tipo} · {hace}</div>
          </div>
          <button type="button" onClick={onClose} aria-label={es ? "Cerrar" : "Close"} style={{ width: 36, height: 36, borderRadius: 12, border: 0, background: "rgba(255,255,255,.18)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}>
            <Icon name="close" size={16} color="var(--tl-white)" strokeWidth={2} />
          </button>
        </div>
      </div>
      <div style={{ position: "relative", flex: 1, display: "flex" }}>
        <button type="button" onClick={atras} aria-label={es ? "Anterior" : "Previous"} style={{ flex: 1, border: 0, background: "transparent", cursor: "pointer" }} />
        <button type="button" onClick={adelante} aria-label={i < n - 1 ? (es ? "Siguiente" : "Next") : (es ? "Ver la página" : "See the page")} style={{ flex: 2, border: 0, background: "transparent", cursor: "pointer" }} />
      </div>
      <div style={{ position: "relative", margin: "0 16px 12px", padding: "14px 15px", borderRadius: 17, background: "rgba(11,14,18,.55)", font: "800 18px/1.3 Sora,sans-serif", letterSpacing: "-.02em", textWrap: "pretty" } as CSSProperties}>{a.texto}</div>
      <div style={{ position: "relative", padding: "4px 16px 28px", display: "flex" }}>
        <Button variant="secondary" size="lg" block onClick={abrir}>{es ? "Ver la página" : "See the page"}</Button>
      </div>
    </div>
  );
  return createPortal(desk
    ? <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 94, background: "rgba(11,14,18,.6)" }}>{cuerpo}</div>
    : cuerpo, document.body);
}
