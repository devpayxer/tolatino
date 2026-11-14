import { NextResponse, type NextRequest } from "next/server";
import { bajaDeUnToque } from "@/lib/correo";

/* 9l · La baja de un toque de las campañas por correo (RFC 8058). POST: el botón «Cancelar suscripción» de Gmail o Yahoo (sin sesión) con el enlace firmado
   de la cabecera List-Unsubscribe → apaga «Novedades de To'Latino». GET (alguien abre el enlace del pie, o lo abre un antivirus): nunca da de baja; lleva a
   Mi cuenta › Avisos, donde está el interruptor. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const ok = await bajaDeUnToque(String(q.get("u") ?? ""), String(q.get("f") ?? ""), "un_toque").catch(() => false);
  return ok ? NextResponse.json({ ok: true }) : new NextResponse(null, { status: 404 });
}
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/cuenta/avisos", req.nextUrl.origin), 303);
}
