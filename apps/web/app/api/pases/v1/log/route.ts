import { NextResponse } from "next/server";
import { permitido } from "@/lib/pases/pases";

/* 8g · Servicio web de Apple Wallet (Apple «Log a Message»): Wallet manda aquí lo que le salió mal con nuestro servicio (sin token). Se anota en
   el registro del servidor, recortado (hasta 20 líneas de 300 caracteres, sin control), y nada más: no va a la base. Límite por dirección. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const ipx = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  if (!(await permitido(ipx))) return new NextResponse(null, { status: 429 });
  if (Number(req.headers.get("content-length") ?? 0) > 16_384) return new NextResponse(null, { status: 400 });
  const b = (await req.json().catch(() => null)) as { logs?: unknown } | null;
  const L = Array.isArray(b?.logs) ? b!.logs.slice(0, 20).map((x) => String(x).replace(/[\u0000-\u001F\u007F]/g, " ").slice(0, 300)) : [];
  for (const l of L) console.warn("[wallet]", l);
  return new NextResponse(null, { status: 200 });
}
