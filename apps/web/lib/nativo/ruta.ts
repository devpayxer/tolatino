"use client";
/* 8e · La ubicación del repartidor durante una entrega (TLRuta, fase8-apps.md §3.1, §4 8e, §6 #14). El servidor decide cuándo empieza (el token
   llega SOLO con el paso que inicia la entrega o al reanudarla) y cuándo termina (contesta «activa: false»).
   - En To'Latino Repartidor: el plugin nativo TLRuta. Android: un servicio en primer plano de tipo «location» con el aviso fijo («Compartiendo tu
     ubicación con {negocio} y el cliente · Entrega #{num}»), que sigue con la pantalla apagada. iOS: CLLocationManager con
     allowsBackgroundLocationUpdates y el indicador azul del sistema. Permiso «Mientras se usa» (nunca «Siempre»). El nativo manda las posiciones
     SOLO al servidor de la cáscara (nunca a una dirección que diga la página), las guarda sin señal y las sube al volver; se detiene solo si el
     servidor dice que la entrega terminó.
   - En la web: watchPosition mientras la página está abierta (sin pantalla apagada: el navegador no lo permite), con la misma cola y el mismo
     token. En un navegador sin contexto seguro (HTTP) no hay geolocalización: no se comparte y se dice.
   Toda llamada a TLRuta va con .catch o try (guardián pluginViejoNoRompe): una cáscara de antes no lo trae. */
import { plugin } from "./puente";
import { sinRed } from "./senal";

export type TokenRuta = { token: string; numero: string; negocio: string; cadaS: number; minM: number };
export type EstadoRuta = { activo: boolean; entrega: string | null; pendientes: number; ultima: number | null; sinSenal: boolean; via: "app" | "web" | null };
type TLRuta = {
  empezar(o: { token: string; entrega: string; negocio: string; cadaS: number; minM: number; idioma: "es" | "en" }): Promise<{ estado: "ok" | "negado" | "sin_gps" }>;
  detener(): Promise<void>;
  estado(): Promise<{ activo: boolean; entrega?: string; pendientes?: number; ultimaEnviada?: number; sinSenal?: boolean }>;
  permiso(): Promise<{ estado: "concedido" | "negado" | "preguntar" }>;
};

/* ── La web: la misma cola y el mismo token, mientras la página está abierta ── */
type P = { t: number; lat: number; lng: number; acc: number | null; vel: number | null; rumbo: number | null };
let web: { tok: TokenRuta; mira: number; cola: P[]; ultima: number | null; envio: ReturnType<typeof setInterval>; ult: P | null } | null = null;
const MAX_COLA = 600;
const dist = (a: P, b: P) => { const r = (g: number) => (g * Math.PI) / 180, d1 = r(b.lat - a.lat), d2 = r(b.lng - a.lng);
  const h = Math.sin(d1 / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(d2 / 2) ** 2; return 12742017.6 * Math.asin(Math.min(1, Math.sqrt(h))); };

async function subirWeb(): Promise<void> {
  const w = web;
  if (!w || !w.cola.length || sinRed()) return;
  const lote = w.cola.slice(0, 60);
  try {
    const r = await fetch("/api/ruta/posicion", { method: "POST", credentials: "omit", cache: "no-store", headers: { "content-type": "application/json", authorization: `Bearer ${w.tok.token}` }, body: JSON.stringify({ fuente: "web", p: lote }) });
    if (r.status === 429) return;
    const j = (await r.json().catch(() => ({}))) as { activa?: boolean; cadaS?: number; minM?: number };
    if (web !== w) return;
    if (r.status === 401 || r.status === 410 || j.activa === false) { pararWeb(); return; } // terminó: deja de compartir
    w.cola.splice(0, lote.length); w.ultima = Date.now();
  } catch { /* sin señal: queda en la cola */ }
}
function pararWeb() {
  if (!web) return;
  try { navigator.geolocation.clearWatch(web.mira); } catch { /* ya no miraba */ }
  clearInterval(web.envio); web = null;
}
function empezarWeb(t: TokenRuta): "ok" | "sin_gps" {
  if (typeof navigator === "undefined" || !navigator.geolocation || (typeof window !== "undefined" && !window.isSecureContext)) return "sin_gps";
  if (web?.tok.numero === t.numero) { web.tok = t; return "ok"; }
  pararWeb();
  const w = { tok: t, mira: 0, cola: [] as P[], ultima: null as number | null, envio: setInterval(() => void subirWeb(), Math.max(5, t.cadaS) * 1000), ult: null as P | null };
  w.mira = navigator.geolocation.watchPosition((g) => {
    const p: P = { t: g.timestamp || Date.now(), lat: g.coords.latitude, lng: g.coords.longitude, acc: Number.isFinite(g.coords.accuracy) ? Math.min(500, g.coords.accuracy) : null,
      vel: g.coords.speed != null && Number.isFinite(g.coords.speed) ? g.coords.speed : null, rumbo: g.coords.heading != null && Number.isFinite(g.coords.heading) ? g.coords.heading % 360 : null };
    // Cada ubic_cada_s o si se movió ubic_min_m (lo mismo que el nativo).
    if (w.ult && p.t - w.ult.t < w.tok.cadaS * 1000 && dist(w.ult, p) < w.tok.minM) return;
    w.ult = p; w.cola.push(p); if (w.cola.length > MAX_COLA) w.cola.splice(0, w.cola.length - MAX_COLA);
  }, () => undefined, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
  web = w;
  void subirWeb();
  return "ok";
}

/* Empezar a compartir con el token que dio el servidor (después de la hoja previa del permiso). */
export async function compartirRuta(t: TokenRuta, es: boolean): Promise<"ok" | "negado" | "sin_gps"> {
  const n = plugin<TLRuta>("TLRuta");
  if (!n) return empezarWeb(t);
  try { return (await n.empezar({ token: t.token, entrega: t.numero, negocio: t.negocio, cadaS: t.cadaS, minM: t.minM, idioma: es ? "es" : "en" })).estado ?? "ok"; }
  catch { return empezarWeb(t); } // una cáscara de antes sin TLRuta: lo que se pueda desde la página
}
/* Dejar de compartir (al marcar «Entregado», o si el servidor ya no tiene la entrega activa). */
export async function dejarDeCompartir(): Promise<void> {
  pararWeb();
  const n = plugin<TLRuta>("TLRuta");
  if (!n) return;
  await n.detener().catch(() => undefined);
}
export async function estadoRuta(): Promise<EstadoRuta> {
  const n = plugin<TLRuta>("TLRuta");
  if (!n) return estadoWeb();
  try { const e = await n.estado(); return { activo: !!e.activo, entrega: e.entrega ?? null, pendientes: e.pendientes ?? 0, ultima: e.ultimaEnviada ?? null, sinSenal: !!e.sinSenal, via: "app" }; }
  catch { return estadoWeb(); } // una cáscara de antes: lo de la web
}
function estadoWeb(): EstadoRuta {
  return { activo: !!web, entrega: web?.tok.numero ?? null, pendientes: web?.cola.length ?? 0, ultima: web?.ultima ?? null, sinSenal: sinRed(), via: web ? "web" : null };
}
/* El permiso de ubicación del sistema para la app (la hoja previa sale antes de que el sistema pregunte). null = en la web (lo dice el navegador). */
export async function permisoRuta(): Promise<"concedido" | "negado" | "preguntar" | null> {
  const n = plugin<TLRuta>("TLRuta");
  if (!n) return null;
  try { return (await n.permiso()).estado; } catch { return null; }
}
