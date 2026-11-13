import { NextResponse, type NextRequest } from "next/server";
import { guardarPosiciones } from "@/lib/ruta";
import { dentroDelTope } from "@/lib/topes";

/* 8e · POST /api/ruta/posicion — las posiciones del repartidor durante una entrega (el plugin nativo TLRuta, también con la pantalla apagada, o la
   página del Repartidor en la web). Sin cookies: la única llave es el token de ESA entrega (Authorization: Bearer), que el servidor dio al empezar
   o al reanudar y que guarda solo como huella. El cuerpo se corta a 16 KB antes de leerlo; hasta 60 posiciones por llamada; una llamada por
   segundo por token. lib/ruta.ts decide qué se guarda (entrega activa, de ese repartidor, de esa ciudad, velocidad posible) y la base lo vuelve a
   imponer. Respuesta: { activa, aceptadas, rechazadas, cadaS, minM }; activa:false (o 410) = la entrega terminó: el teléfono deja de compartir. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const MAX = 16 * 1024;
const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "cache-control": "no-store" } });

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
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!token) return json({ activa: false }, 401);
  // Una llamada por segundo por token, en todos los procesos (lib/topes.ts; 9b-3).
  if (!(await dentroDelTope("ruta_pos", token, 1, 1))) return json({ activa: true, aceptadas: 0, rechazadas: 0, espera: 1 }, 429);
  const t = await leer(req).catch(() => null);
  if (t === null) return json({ activa: true, aceptadas: 0, rechazadas: 0 }, 413);
  let cuerpo: unknown;
  try { cuerpo = JSON.parse(t || "{}"); } catch { return json({ activa: true, aceptadas: 0, rechazadas: 0 }, 400); }
  // De dónde viene (solo informativo, nunca autoriza): el plugin nativo manda «fuente: app»; la página, «web».
  const fuente = (cuerpo as { fuente?: unknown })?.fuente === "app" ? "app" : "web";
  const r = await guardarPosiciones(token, cuerpo, fuente);
  if (!r) return json({ activa: false }, 410);
  return json(r, r.activa ? 200 : 410);
}
