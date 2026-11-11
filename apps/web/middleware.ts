import { NextResponse, type NextRequest } from "next/server";
import { destinoEnApp, leerRotulo } from "./lib/app-nativa-comun";

/* Identificador del dispositivo (cookie tl_dev, la misma de lib/cuenta.ts): se crea en la primera visita para que la
   analítica propia cuente visitantes y días activos sin cuenta. Aleatorio, solo lo lee el servidor; nada personal. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/* 6h · La llave de los boletos sin señal (cookie tl_bk, la misma de lib/cuenta.ts): la sesión que entró antes de 6h no la tiene; se pone al
   abrir Mis boletos con la sesión (aleatoria, solo bajo /cuenta/boletos; al salir se borra). */
function llaveBoletos(req: NextRequest, res: NextResponse) {
  if (!req.nextUrl.pathname.startsWith("/cuenta/boletos") || !req.cookies.get("tl_s")?.value || /^[A-Za-z0-9_-]{40,60}$/.test(req.cookies.get("tl_bk")?.value ?? "")) return res;
  const b = new Uint8Array(32); crypto.getRandomValues(b);
  const v = btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  res.cookies.set("tl_bk", v, { path: "/cuenta/boletos", maxAge: 180 * 86400, sameSite: "strict", httpOnly: false, secure: req.headers.get("x-forwarded-proto") === "https" });
  return res;
}
/* 8a · La cáscara de una app (rótulo TLApp en el user-agent) solo abre su alcance (apps/mobile/apps.json; guardián cascaraSoloSuAlcance):
   «/» y Mi cuenta llevan a su entrada; una ruta de otra app (o del Super Admin) va a «Esto se abre en …», que la abre fuera de la cáscara
   (en esa app si está instalada, o en el navegador). Solo GET de páginas; nunca cambia lo que la persona puede hacer (eso lo decide cada
   página con la sesión). Sin el rótulo, la web de siempre. */
function cascara(req: NextRequest): NextResponse | null {
  if (req.method !== "GET" && req.method !== "HEAD") return null;
  const app = leerRotulo(req.headers.get("user-agent"));
  if (!app) return null;
  const d = destinoEnApp(app.app, req.nextUrl.pathname + req.nextUrl.search);
  if (!d) return null;
  // Detrás de nginx (y de Cloudflare) el host y el esquema son los del navegador (cabeceras reenviadas), no los de este proceso.
  const proto = (req.headers.get("x-forwarded-proto") ?? "").split(",")[0]!.trim() || req.nextUrl.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const r = NextResponse.redirect(new URL(d, `${proto === "https" ? "https" : "http"}://${host}`), 307);
  r.headers.set("cache-control", "no-store");
  return r;
}
export function middleware(req: NextRequest) {
  const fuera = cascara(req);
  if (fuera) return fuera;
  if (UUID.test(req.cookies.get("tl_dev")?.value ?? "")) return llaveBoletos(req, NextResponse.next());
  const id = crypto.randomUUID();
  const h = new Headers(req.headers);
  h.set("cookie", `${req.headers.get("cookie") ? `${req.headers.get("cookie")}; ` : ""}tl_dev=${id}`);
  const res = NextResponse.next({ request: { headers: h } });
  res.cookies.set("tl_dev", id, { path: "/", maxAge: 5 * 365 * 86400, sameSite: "lax", httpOnly: true, secure: req.headers.get("x-forwarded-proto") === "https" });
  return llaveBoletos(req, res);
}
export const config = { matcher: ["/((?!_next/|api/|medios/|assets/|favicon|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|json|js|css|woff2?)$).*)"] };
