import { NextResponse } from "next/server";
import { staff } from "@/lib/admin";
import { consumirCodigo, mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { esTipo, guardar, llaveroListo, MAX_BYTES, revisarArchivo, TIPOS } from "@/lib/tiendas/llavero";

/* 8a · Subir una llave al llavero de las tiendas (Super Admin › Sistema › Integraciones › Llaves de las tiendas). Solo un Admin con
   integ:editar, desde nuestra página, con el código que acaba de pedir (propósito «llavero», un uso) — todo revisado AQUÍ, en el servidor.
   La respuesta dice la huella y la versión; NUNCA el contenido (ni lo repite en un error). Cualquier otro rol: 403. */
export const dynamic = "force-dynamic";
const no = (msg: string, status: number) => NextResponse.json({ ok: false, msg }, { status, headers: { "cache-control": "no-store" } });
const limpio = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max) : "");

export async function POST(req: Request) {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("integ", "editar") || !(await mismoOrigen())) return no("Solo un Admin sube llaves.", 403);
  if (!llaveroListo()) return no("Falta la llave del llavero en los secretos del entorno: no se guarda nada.", 503);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 16_384) return no("El archivo es demasiado grande (64 KB).", 413);
  let f: FormData;
  try { f = await req.formData(); } catch { return no("No llegó el archivo.", 400); }
  const tipo = f.get("tipo"), codigo = limpio(f.get("codigo"), 6), motivo = limpio(f.get("motivo"), 300), vence = limpio(f.get("vence"), 10), archivo = f.get("archivo");
  if (!esTipo(tipo)) return no("Ese tipo de llave no existe.", 400);
  if (!(archivo instanceof File)) return no("Elige el archivo de la llave.", 400);
  if (motivo.length < 3) return no("Escribe el motivo: queda en la auditoría.", 400);
  if (vence && !/^\d{4}-\d{2}-\d{2}$/.test(vence)) return no("La fecha de vencimiento es AAAA-MM-DD.", 400);
  if (archivo.size > MAX_BYTES) return no("El archivo es demasiado grande (64 KB).", 413);
  const b = Buffer.from(await archivo.arrayBuffer());
  const extra: Record<string, string> = {};
  for (const k of ["equipo", "emisor", "alias"]) { const v = limpio(f.get(k), 80); if (v) extra[k] = v; }
  const rev = revisarArchivo(tipo, archivo.name, b, extra);
  if (!rev.ok) { b.fill(0); return no(rev.msg, 400); }
  const r = await tx(async (c) => {
    const cod = await consumirCodigo(c, s.phone, "llavero", codigo);
    if (cod !== "ok") return { error: cod };
    return guardar(c, { tipo, contenido: b, meta: rev.meta, vence: vence || null, actor: s.id, motivo });
  });
  b.fill(0);
  if ("error" in r) return no(r.error === "codigo_vencido" ? "El código venció: pide otro." : r.error === "demasiados" ? "Demasiados intentos: pide otro código." : "El código no es correcto.", 403);
  return NextResponse.json({ ok: true, huella: r.huella, version: r.version, msg: `${TIPOS[tipo].es}: versión ${r.version} guardada.` }, { headers: { "cache-control": "no-store" } });
}
