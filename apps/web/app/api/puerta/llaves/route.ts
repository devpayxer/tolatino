import { NextResponse } from "next/server";
import { llavesPublicas } from "@/lib/boletos-qr";

/* 6h · GET /api/puerta/llaves: las llaves PÚBLICAS Ed25519 vigentes (kid → llave). Con ellas To'Latino Puerta verifica sin señal la firma de
   cada QR y del paquete; no sirven para firmar nada. Públicas: sin cuenta ni datos de nadie. */
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ ok: true, llaves: await llavesPublicas() }, { headers: { "cache-control": "public, max-age=300" } });
}
