import { NextResponse, type NextRequest } from "next/server";
import { recibirVital } from "@/lib/vitales";

/* 9j-2 · Web Vitals de teléfonos reales (L1629). Sin sesión, como /api/errores: el cuerpo se corta a 2 KB ANTES de leerlo entero, solo desde una
   página nuestra (mismo host o el origen local de una cáscara), y lib/vitales.ts pone el tope y guarda solo cifras (sin persona ni URL).
   La respuesta no dice nada (204); un 429 si se pasó del tope. La conexión solo sirve para el tope (su huella, en lib/topes.ts). */
export const dynamic = "force-dynamic";
const MAX = 2 * 1024;
const LOCAL = new Set(["capacitor://localhost", "https://localhost", "http://localhost"]);
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
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const r = await recibirVital({ ip: ip && /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : null, cuerpo }).catch(() => ({ ok: false as const, por: "invalido" as const }));
  if (!r.ok && r.por === "limite") return nada(429);
  return nada(r.ok || r.por === "apagado" ? 204 : 400);
}
