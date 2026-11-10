import { NextResponse } from "next/server";
import { dispositivo, mismoOrigen, yo } from "@/lib/cuenta";
import { accesoPuerta } from "@/lib/puerta";
import { armarPaquete } from "@/lib/puerta-paquete";

/* 6h · POST /api/puerta/paquete: el paquete sin conexión de UNA puerta abierta ({ sesion }) o sus cambios desde un cursor ({ sesion, desde }).
   Mismo origen, la cuenta, accesoPuerta (la base: sesión abierta, portero activo con ese evento, ventana del día) y el teléfono que abrió la
   puerta. Sale firmado y cifrado con la llave de esa sesión (lib/puerta-paquete.ts); la llave solo con { llave: true }. Nada se guarda en
   caché (el service worker de la puerta nunca toca /api/). Sin acceso: 403 { cerrada } y el teléfono borra el paquete, la llave y la cola. */
export const dynamic = "force-dynamic";
const H = { "cache-control": "no-store, private" };
const NO = (es: string, en: string, status: number, extra: Record<string, unknown> = {}) => NextResponse.json({ ok: false, msg: { es, en }, ...extra }, { status, headers: H });

export async function POST(req: Request) {
  if (!(await mismoOrigen())) return NO("Petición no permitida.", "Request not allowed.", 403);
  const u = await yo();
  if (!u) return NO("Tu sesión terminó. Entra otra vez.", "Your session ended. Sign in again.", 401, { cerrada: true });
  let b: Record<string, unknown>;
  try { b = (await req.json()) as Record<string, unknown>; } catch { return NO("Petición mal formada.", "Malformed request.", 400); }
  const ctx = await accesoPuerta(u.id, String(b?.sesion ?? ""));
  if (!ctx) return NO("Ya no tienes acceso a esta puerta.", "You no longer have access to this door.", 403, { cerrada: true });
  const r = await armarPaquete(ctx, await dispositivo(false), typeof b.desde === "string" ? b.desde.slice(0, 40) : null, b.llave === true, b.gz !== false);
  return NextResponse.json(r, { status: r.ok ? 200 : "cerrada" in r && r.cerrada ? 403 : 409, headers: H });
}
