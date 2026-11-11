import { NextResponse } from "next/server";
import { permitido, seriesCambiadas } from "@/lib/pases/pases";

/* 8g · Servicio web de Apple Wallet (Apple «Get the List of Updatable Passes»): las series de los pases que ESTE teléfono sigue y cambiaron
   desde la marca (passesUpdatedSince). Apple no manda token en este pedido: solo salen series (nada más del pase) de los registros hechos por
   ese mismo identificador de teléfono, que solo él y nosotros conocemos. 204 si no hay. Límite por dirección (pase_ws_por_minuto). */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type P = { params: Promise<{ dispositivo: string; tipo: string }> };

export async function GET(req: Request, { params }: P) {
  const ipx = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  if (!(await permitido(ipx))) return new NextResponse(null, { status: 429 });
  const { dispositivo, tipo } = await params;
  const r = await seriesCambiadas(dispositivo, tipo, new URL(req.url).searchParams.get("passesUpdatedSince"));
  if (!r) return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
  return NextResponse.json(r, { headers: { "cache-control": "no-store" } });
}
