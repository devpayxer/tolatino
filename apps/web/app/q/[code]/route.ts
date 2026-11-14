import { NextResponse, type NextRequest } from "next/server";
import { CODIGO } from "@/lib/crecimiento/comun";
import { escanear } from "@/lib/crecimiento/enlaces";
import { huella } from "@/lib/cifrado";
import { dentroDelTope } from "@/lib/topes";
import { ciudades, COOKIE_LOC, escribir } from "@/lib/ubicacion";

/* 9h · El QR de calle y el enlace corto: /q/{código} → el escaneo se anota SIN personas (lib/crecimiento/enlaces.ts) → redirige a la ruta PROPIA del enlace
   (nunca a otro origen: guardián enlaceSoloPropio). Si el enlace es de una ciudad, la deja puesta para lo que sigue (Publica tu negocio, la landing): la
   cookie tl_loc de siempre. El código queda 30 días en tl_src para que la lista de la landing sepa de qué QR vino. Un mismo navegador que insiste (más de
   20 por minuto) no suma escaneos: el tope compartido mira una huella de la dirección que nunca se guarda. Un código que no existe o se retiró lleva al Inicio. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params, c = decodeURIComponent(code ?? "").toUpperCase();
  const ip = (req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "").slice(0, 64);
  const contar = CODIGO.test(c) ? await dentroDelTope("qr", huella(`${ip}|${c}`), 20) : false;
  const r = await escanear(c, req.headers.get("user-agent"), contar);
  // Detrás de nginx (y de Cloudflare) el host y el esquema son los del navegador (cabeceras reenviadas), no los de este proceso.
  const proto = (req.headers.get("x-forwarded-proto") ?? "").split(",")[0]!.trim() || req.nextUrl.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const res = NextResponse.redirect(new URL(r.destino, `${proto === "https" ? "https" : "http"}://${host}`), 302);
  res.headers.set("cache-control", "no-store");
  res.headers.set("x-robots-tag", "noindex");
  const seguro = proto === "https";
  if (r.ciudad) {
    const ci = (await ciudades()).find((x) => x.id === r.ciudad);
    if (ci) res.cookies.set(COOKIE_LOC, escribir({ ciudad: ci.id, ctr: "centro", rad: ci.radio }), { path: "/", maxAge: 365 * 86400, sameSite: "lax", httpOnly: true, secure: seguro });
  }
  if (r.code) res.cookies.set("tl_src", r.code, { path: "/", maxAge: 30 * 86400, sameSite: "lax", httpOnly: true, secure: seguro });
  return res;
}
