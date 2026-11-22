import { NextResponse, type NextRequest } from "next/server";
import { contarToque, contarToqueSemilla } from "@/lib/toques";
import { entroPatrocinado } from "@/lib/patrocinio-entrada";

/* Toque de contacto (llamar, cómo llegar, compartir, escribir): la puerta que usa lib/contar-toque.ts con sendBeacon o fetch keepalive, para que
   el toque llegue aunque la página se vaya en el mismo instante (tel:, el mapa del teléfono, compartir). Las reglas son las de lib/toques.ts, que
   también revisa el mismo origen; aquí solo se acota el cuerpo (512 bytes, cortado ANTES de leerlo entero) y se aceptan exactamente tres
   pedidos: { id, kind, origen } (un negocio) o { semilla, origen } (una semilla, siempre «call»), y { entro, patrocinio } (el «entraron» de un
   patrocinio, C-002 / C-003, que antes era una acción del servidor y se perdía igual; sus reglas, las de lib/patrocinio-entrada.ts · entroPatrocinado).
   La respuesta no dice si se contó (204 siempre); solo confirma que llegó: la bandeja de lib/contar-toque.ts deja de reintentar con ese 204.
   Si la base falla, la ruta falla (500) y la bandeja reintenta. Sin GET. */
export const dynamic = "force-dynamic";
const MAX = 512;
const nada = () => new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });

async function leer(req: NextRequest): Promise<string | null> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX) return null;
  const r = req.body?.getReader();
  if (!r) return null;
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
  const t = await leer(req).catch(() => null);
  let c: unknown = null;
  try { c = t ? JSON.parse(t) : null; } catch { c = null; }
  if (!c || typeof c !== "object" || Array.isArray(c)) return nada();
  const x = c as Record<string, unknown>, claves = Object.keys(x).sort().join(",");
  if (claves === "id,kind,origen" && typeof x.origen === "string" && typeof x.id === "string" && typeof x.kind === "string") await contarToque(x.id, x.kind, x.origen);
  else if (claves === "origen,semilla" && typeof x.origen === "string" && typeof x.semilla === "string") await contarToqueSemilla(x.semilla, x.origen);
  else if (claves === "entro,patrocinio" && (x.entro === "negocio" || x.entro === "evento") && typeof x.patrocinio === "string") await entroPatrocinado(x.entro, x.patrocinio);
  return nada();
}
