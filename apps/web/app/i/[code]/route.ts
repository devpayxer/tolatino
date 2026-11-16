import type { NextRequest } from "next/server";
import { COOKIE_REF } from "@/lib/invitar";
import { irA } from "@/lib/ir-a";
import { esHttps } from "@/lib/cookie-segura";

/* USR-INVITAR · el enlace de un vecino (/i/RAMON-12): guarda el código 30 días y lleva a crear la cuenta. Si la cuenta se crea con ese
   código, quien invitó lo ve en «Tus invitados» y cuenta para Capitán cuando participa (lib/invitar.ts). Sin dinero ni premios. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params, c = decodeURIComponent(code ?? "").toUpperCase();
  const r = irA("/entrar?volver=%2F", 307);
  if (/^[A-Z]{1,6}-\d{1,7}[A-Z]?$/.test(c)) r.cookies.set(COOKIE_REF, c, { path: "/", maxAge: 30 * 86400, sameSite: "lax", httpOnly: true, secure: esHttps(req.headers) });
  return r;
}
