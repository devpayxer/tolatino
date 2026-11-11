import { NextResponse } from "next/server";
import { yo } from "@/lib/cuenta";
import { pkpassDe, verificarEnlace } from "@/lib/pases/pases";

/* 8g · «Agregar a Apple Wallet» (el boleto, /cuenta/boletos/[codigo]): el .pkpass de ESE boleto para quien lo tiene, con su sesión. Lo decide
   el servidor (lib/pases/pases.ts): boleto vivo, sin transferencia pendiente, interruptor app.wallet.apple encendido y certificado en el
   llavero. Dentro de la app, el enlace firmado de 10 minutos (la vista de Safari no tiene la sesión). Sin sesión → a entrar; de otra persona o que ya no vale → la página del boleto con el aviso. Volver a pedirlo da el mismo pase. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params, code = decodeURIComponent(codigo).toUpperCase(), base = new URL(req.url);
  // En la app: el enlace firmado de 10 minutos para esta persona y este boleto (walletAppleEnlace); en la web, la sesión.
  const u = (await yo()) ?? ((x) => (x ? { id: x } : null))(verificarEnlace(code, base.searchParams));
  if (!u) return NextResponse.redirect(new URL(`/entrar?volver=${encodeURIComponent(`/cuenta/boletos/${code}`)}`, base), 303);
  const r = await pkpassDe(u.id, code);
  if (!r.ok) return NextResponse.redirect(new URL(`/cuenta/boletos/${encodeURIComponent(code)}?wallet=no`, base), 303);
  return new NextResponse(new Uint8Array(r.archivo), { headers: { "content-type": "application/vnd.apple.pkpass", "content-disposition": `attachment; filename="${r.nombre}"`, "cache-control": "no-store" } });
}
