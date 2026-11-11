import { NextResponse } from "next/server";
import { autorizarPase, darDeBaja, pasesPronto, permitido, registrar } from "@/lib/pases/pases";

/* 8g · Servicio web de Apple Wallet (Apple «Register a Pass for Update Notifications» / «Unregister…», fijado en
   scripts/contrato-wallet/apple.json): POST registra este teléfono para este pase (cuerpo { pushToken }), DELETE lo da de baja.
   SOLO con el token de ESE pase («Authorization: ApplePass <token>»); un token ajeno, uno viejo o un pase que no existe → 401, igual (guardián
   tokenDePase). Límite por dirección (pase_ws_por_minuto) y por teléfono por hora (pase_registros_hora, en la base) → 429. Sin cookies ni sesión. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type P = { params: Promise<{ dispositivo: string; tipo: string; serie: string }> };
const vacio = (status: number) => new NextResponse(null, { status, headers: { "cache-control": "no-store" } });
const ip = (req: Request) => req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

export async function POST(req: Request, { params }: P) {
  if (!(await permitido(ip(req)))) return vacio(429);
  const { dispositivo, tipo, serie } = await params;
  const p = await autorizarPase(tipo, serie, req.headers.get("authorization"));
  if (!p) return vacio(401);
  if (Number(req.headers.get("content-length") ?? 0) > 4096) return vacio(400);
  const st = await registrar(p, dispositivo, await req.json().catch(() => null));
  // Si el pase cambió mientras el teléfono lo bajaba, se le avisa ya.
  if (st === 201) pasesPronto();
  return vacio(st);
}

export async function DELETE(req: Request, { params }: P) {
  if (!(await permitido(ip(req)))) return vacio(429);
  const { dispositivo, tipo, serie } = await params;
  const p = await autorizarPase(tipo, serie, req.headers.get("authorization"));
  if (!p) return vacio(401);
  return vacio(await darDeBaja(p, dispositivo));
}
