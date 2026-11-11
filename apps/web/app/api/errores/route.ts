import { NextResponse, type NextRequest } from "next/server";
import { recibirError } from "@/lib/errores/ingesta";

/* 8f · Errores de la web y de las apps, y cierres nativos de la vez anterior (fase8-apps.md §4 8f). Sin sesión: cualquiera puede llamar, así que
   el cuerpo se corta a 32 KB ANTES de leerlo entero, solo desde una página nuestra (mismo host o el origen local de una cáscara), y lib/errores/
   ingesta.ts pone el límite por minuto, tapa todo y descarta lo demás. La respuesta no dice nada de lo guardado (204); un 429 si se pasó del tope. */
export const dynamic = "force-dynamic";
const MAX = 32 * 1024;
const LOCAL = new Set(["capacitor://localhost", "https://localhost", "http://localhost"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const nada = (status: number) => new NextResponse(null, { status, headers: { "cache-control": "no-store" } });

async function leer(req: NextRequest): Promise<string | null> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX) return null;
  const r = req.body?.getReader();
  if (!r) return "";
  const partes: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await r.read();
    if (done) break;
    n += value.byteLength;
    if (n > MAX) { await r.cancel().catch(() => undefined); return null; }
    partes.push(value);
  }
  return Buffer.concat(partes).toString("utf8");
}

export async function POST(req: NextRequest) {
  const origen = req.headers.get("origin"), host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let mio = false;
  try { mio = !!origen && (LOCAL.has(origen) || new URL(origen).host === host); } catch { mio = false; }
  if (!mio) return nada(403);
  const t = await leer(req).catch(() => null);
  if (t === null) return nada(413);
  let cuerpo: unknown;
  try { cuerpo = JSON.parse(t); } catch { return nada(400); }
  const dev = req.cookies.get("tl_dev")?.value ?? null, ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const r = await recibirError({ ua: req.headers.get("user-agent"), dev: dev && UUID.test(dev) ? dev : null, ip: ip && /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : null, cuerpo });
  if (!r.ok && r.por === "limite") return nada(429);
  return nada(r.ok || r.por === "apagado" ? 204 : 400);
}
