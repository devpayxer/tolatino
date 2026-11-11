import { NextResponse } from "next/server";
import { staff } from "@/lib/admin";
import { consumirCodigo, mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { llaveroListo } from "@/lib/tiendas/llavero";

/* 8g · Super Admin › Sistema › Integraciones › Wallet: la SOLICITUD del certificado del Pass Type ID de Apple (fase8-apps.md §10 Paquete 8-2 (8)).
   POST: genera la llave en el servidor (llavero, pass_type_csr) y devuelve el CSR (público) — solo un Admin con integ:editar, desde nuestra
   página, con el código que acaba de pedir (propósito «llavero», un uso), como subir una llave. El certificado vivo sigue funcionando hasta
   que llegue el nuevo. GET: la misma solicitud otra vez, como archivo para subirla a developer.apple.com (Admin con integ:ver). La llave
   nunca sale de aquí: solo su parte pública. */
export const dynamic = "force-dynamic";
const no = (msg: string, status: number) => NextResponse.json({ ok: false, msg }, { status, headers: { "cache-control": "no-store" } });
const limpio = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max) : "");

export async function POST(req: Request) {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("integ", "editar") || !(await mismoOrigen())) return no("Solo un Admin genera la solicitud.", 403);
  if (!llaveroListo()) return no("Falta la llave del llavero en los secretos del entorno: no se guarda nada.", 503);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const codigo = limpio(b.codigo, 6), motivo = limpio(b.motivo, 300), tipo = limpio(b.tipo, 130) || undefined;
  if (motivo.length < 3) return no("Escribe el motivo: queda en la auditoría.", 400);
  if (tipo && !/^pass\.[A-Za-z0-9.-]{3,120}$/.test(tipo)) return no("El Pass Type ID empieza con «pass.» (por ejemplo pass.com.tolatino.boletos).", 400);
  const { generarSolicitud } = await import("@/lib/pases/certificado");
  const r = await tx(async (c) => {
    const cod = await consumirCodigo(c, s.phone, "llavero", codigo);
    if (cod !== "ok") return { error: cod };
    return generarSolicitud(c, s.id, motivo, tipo);
  });
  if ("error" in r) return no(r.error === "codigo_vencido" ? "El código venció: pide otro." : r.error === "demasiados" ? "Demasiados intentos: pide otro código." : "El código no es correcto.", 403);
  return NextResponse.json({ ok: true, csr: r.csr, msg: "Solicitud lista. Bájala y súbela en developer.apple.com; luego sube aquí el certificado (.cer) que te dé Apple." }, { headers: { "cache-control": "no-store" } });
}

export async function GET() {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("integ", "ver")) return no("Solo un Admin.", 403);
  const csr = await (await import("@/lib/pases/certificado")).solicitudVigente();
  if (!csr) return no("No hay una solicitud vigente.", 404);
  return new NextResponse(csr, { headers: { "content-type": "application/pkcs10", "content-disposition": 'attachment; filename="tolatino-pase.certSigningRequest"', "cache-control": "no-store" } });
}
