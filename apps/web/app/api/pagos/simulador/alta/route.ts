import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { pasarela } from "@/lib/pagos/pasarela";
import { accesoPanel } from "@/lib/panel";
import { yo } from "@/lib/cuenta";
import { simularAltaSilla } from "@/lib/sillas";

/* Simulador del sandbox: «completar el alta en Stripe». Solo existe sin clave de Stripe y fuera de producción; solo el dueño
   de esa cuenta simulada la completa. Deja la cuenta habilitada con un banco de prueba y vuelve al panel. */
export async function GET(req: NextRequest) {
  if (pasarela.modo() !== "simulador") return new NextResponse("No disponible", { status: 404 });
  const cuenta = req.nextUrl.searchParams.get("cuenta") ?? "", volver = req.nextUrl.searchParams.get("volver") ?? "";
  // La cuenta propia de una silla rentada (3d): solo el barbero de esa silla la completa.
  if (cuenta.startsWith("acct_sim_m-")) {
    const u = await yo();
    if (!u) return new NextResponse("Sin acceso", { status: 403 });
    const a = await simularAltaSilla(u.id, cuenta);
    return a ? new NextResponse(null, { status: 303, headers: { location: a } }) : new NextResponse("Enlace no válido", { status: 400 });
  }
  const m = /^acct_sim_([a-z0-9-]{1,80})$/.exec(cuenta);
  if (!m || !/^\/panel\/[a-z0-9-]{1,80}\/cobros\?vuelta=1$/.test(volver)) return new NextResponse("Enlace no válido", { status: 400 });
  const a = await accesoPanel(m[1]!, "pay");
  if (!a) return new NextResponse("Sin acceso", { status: 403 });
  const u = await db().query(`update stripe_accounts set status = 'enabled', charges_enabled = true, payouts_enabled = true, requirements = '[]'::jsonb, bank_last4 = '6789', updated_at = now()
                               where business_id = $1 and stripe_account_id = $2 and simulated and not charges_enabled returning business_id`, [a.negocio.id, cuenta]);
  if (u.rowCount) {
    await db().query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, 'cobros.activos', 'business', $2, $3, '{"modo":"simulador"}'::jsonb)`, [a.yo.id, a.negocio.id, a.negocio.city_id]);
    await (await import("@/lib/avisos")).avisarNegocio(a.negocio.id, "biz_stripe_on", {}, { href: `/panel/${a.negocio.id}/vendes/pedidos` });
  }
  return new NextResponse(null, { status: 303, headers: { location: volver } }); // relativa: sirve detrás del proxy
}
