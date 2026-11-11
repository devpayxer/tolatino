import { NextResponse } from "next/server";
import { autorizarPase, paseAlDia, permitido } from "@/lib/pases/pases";

/* 8g · Servicio web de Apple Wallet (Apple «Send an Updated Pass»): el pase al día, firmado otra vez, SOLO con el token de ESE pase
   («ApplePass <token>»; guardián tokenDePase) → 401 si no. 304 si no cambió desde If-Modified-Since. Lo mismo que muestra la pantalla del
   boleto: el mismo QR firmado o ninguno (paseMismoQr); anulado = «voided». */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type P = { params: Promise<{ tipo: string; serie: string }> };

export async function GET(req: Request, { params }: P) {
  const ipx = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  if (!(await permitido(ipx))) return new NextResponse(null, { status: 429 });
  const { tipo, serie } = await params;
  const p = await autorizarPase(tipo, serie, req.headers.get("authorization"));
  if (!p) return new NextResponse(null, { status: 401, headers: { "cache-control": "no-store" } });
  const r = await paseAlDia(p, req.headers.get("if-modified-since"));
  if (r.status !== 200) return new NextResponse(null, { status: r.status, headers: { "cache-control": "no-store", ...(r.modificado ? { "last-modified": r.modificado } : {}) } });
  return new NextResponse(new Uint8Array(r.archivo), { headers: { "content-type": "application/vnd.apple.pkpass", "last-modified": r.modificado, "cache-control": "no-store" } });
}
