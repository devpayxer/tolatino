import { NextResponse } from "next/server";
import { staff } from "@/lib/admin";
import { consumirCodigo, mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { ENTORNO } from "@/lib/entorno";
import { olvidarLlaves } from "@/lib/llaves-proveedores";
import { esTipo, esTipoProveedor, guardar, guardarTexto, llaveroListo, MAX_BYTES, revisarArchivo, revisarTexto, TIPOS } from "@/lib/tiendas/llavero";
import { llegoPorHttps } from "@/lib/tiendas/tuberia";
import { leerFormulario } from "@/lib/subida";

/* 8a · Subir una llave al llavero de las tiendas (Super Admin › Sistema › Integraciones › Llaves de las tiendas). Solo un Admin con
   integ:editar, desde nuestra página, con el código que acaba de pedir (propósito «llavero», un uso) — todo revisado AQUÍ, en el servidor.
   La respuesta dice la huella y la versión; NUNCA el contenido (ni lo repite en un error). Cualquier otro rol: 403.
   23 nov · Las llaves de TEXTO de los proveedores (Stripe, Telnyx, WhatsApp, SES, Anthropic) entran por aquí mismo, pegadas en «valor»: el mismo
   permiso, el mismo origen, el mismo código y la misma auditoría; su forma (y que sea del entorno correcto) se revisa aquí. En producción, solo por
   HTTPS (cualquier llave). Los mensajes vienen en los dos idiomas (msg, en). */
export const dynamic = "force-dynamic";
const no = (msg: string, status: number, en?: string) => NextResponse.json({ ok: false, msg, ...(en ? { en } : {}) }, { status, headers: { "cache-control": "no-store" } });
const limpio = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max) : "");

export async function POST(req: Request) {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("integ", "editar") || !(await mismoOrigen())) return no("Solo un Admin sube llaves.", 403);
  if (ENTORNO === "produccion" && !llegoPorHttps(req)) return no("Las llaves solo se guardan por HTTPS.", 403, "Keys are only saved over HTTPS.");
  if (!llaveroListo()) return no("Falta la llave del llavero en los secretos del entorno: no se guarda nada.", 503);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 16_384) return no("El archivo es demasiado grande (64 KB).", 413);
  const lf = await leerFormulario(req, MAX_BYTES + 16_384);
  if (!lf.ok) return lf.grande ? no("El archivo es demasiado grande (64 KB).", 413) : no("No llegó el archivo.", 400);
  const f = lf.fd;
  const tipo = f.get("tipo"), codigo = limpio(f.get("codigo"), 6), motivo = limpio(f.get("motivo"), 300), vence = limpio(f.get("vence"), 10), archivo = f.get("archivo");
  if (!esTipo(tipo)) return no("Ese tipo de llave no existe.", 400);
  if (esTipoProveedor(tipo)) return texto(s, tipo, f.get("valor"), codigo, motivo);
  if (!(archivo instanceof File)) return no("Elige el archivo de la llave.", 400);
  if (motivo.length < 3) return no("Escribe el motivo: queda en la auditoría.", 400);
  if (vence && !/^\d{4}-\d{2}-\d{2}$/.test(vence)) return no("La fecha de vencimiento es AAAA-MM-DD.", 400);
  if (archivo.size > MAX_BYTES) return no("El archivo es demasiado grande (64 KB).", 413);
  const b = Buffer.from(await archivo.arrayBuffer());
  const extra: Record<string, string> = {};
  for (const k of ["equipo", "emisor", "alias"]) { const v = limpio(f.get(k), 80); if (v) extra[k] = v; }
  const rev = revisarArchivo(tipo, archivo.name, b, extra);
  if (!rev.ok) { b.fill(0); return no(rev.msg, 400); }
  // 8g · El certificado del pase: se comprueba contra la solicitud que generó el servidor y se le junta su llave y el intermedio de Apple.
  const cert = tipo === "pass_type_cert" ? await (await import("@/lib/pases/certificado")).revisarCertificado(b) : null;
  if (cert && !cert.ok) { b.fill(0); return no(cert.msg, 400); }
  const r = await tx(async (c) => {
    const cod = await consumirCodigo(c, s.phone, "llavero", codigo);
    if (cod !== "ok") return { error: cod };
    if (cert?.ok) return (await import("@/lib/pases/certificado")).completar(c, cert.x, s.id, motivo);
    return guardar(c, { tipo, contenido: b, meta: rev.meta, vence: vence || null, actor: s.id, motivo });
  });
  b.fill(0);
  // 23 nov · Las copias en memoria de las llaves de push y de Wallet se olvidan aquí mismo (los demás procesos, por el aviso de la base, 0213).
  if (!("error" in r)) { (await import("@/lib/push/llaves")).olvidarLlavesTienda(); (await import("@/lib/pases/credenciales")).olvidarCredenciales(); }
  if ("error" in r) return no(r.error === "codigo_vencido" ? "El código venció: pide otro." : r.error === "demasiados" ? "Demasiados intentos: pide otro código." : "El código no es correcto.", 403);
  return NextResponse.json({ ok: true, huella: r.huella, version: r.version, msg: `${TIPOS[tipo].es}: versión ${r.version} guardada.` }, { headers: { "cache-control": "no-store" } });
}

/* Una llave de texto de un proveedor: la forma (y el entorno) se revisan ANTES de pedir el código; el valor no vuelve en ninguna respuesta. */
async function texto(s: NonNullable<Awaited<ReturnType<typeof staff>>>, tipo: Parameters<typeof revisarTexto>[0], crudo: FormDataEntryValue | null, codigo: string, motivo: string) {
  if (typeof crudo !== "string") return no("Pega la llave.", 400, "Paste the key.");
  if (motivo.length < 3) return no("Escribe el motivo: queda en la auditoría.", 400, "Write the reason: it is kept in the audit log.");
  const rev = revisarTexto(tipo, crudo, ENTORNO);
  if (!rev.ok) return no(rev.msg.es, 400, rev.msg.en);
  const r = await tx(async (c) => {
    const cod = await consumirCodigo(c, s.phone, "llavero", codigo);
    if (cod !== "ok") return { error: cod };
    return guardarTexto(c, { tipo, valor: rev.valor, meta: rev.meta, actor: s.id, motivo });
  });
  if ("error" in r) return r.error === "codigo_vencido" ? no("El código venció: pide otro.", 403, "The code expired: ask for another.") : r.error === "demasiados" ? no("Demasiados intentos: pide otro código.", 403, "Too many tries: ask for another code.") : no("El código no es correcto.", 403, "The code is not right.");
  olvidarLlaves();
  return NextResponse.json({ ok: true, huella: r.huella, version: r.version, msg: `${TIPOS[tipo].es}: versión ${r.version} guardada.`, en: `${TIPOS[tipo].en}: version ${r.version} saved.` }, { headers: { "cache-control": "no-store" } });
}
