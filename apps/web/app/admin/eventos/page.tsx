import { requerir } from "@/lib/admin";
import { leerFiltrosEvt, listaEventosAdmin, organizadoresAdmin } from "@/lib/evt-revision";
import { buscarBoletosAdmin, kpiBoletosAdmin } from "@/lib/boletos-admin";
import { db } from "@/lib/db";
import { EventosAdmin } from "../EventosAdmin";

/* ADM-EVT · Eventos y boletos (6a): ?tab=org Organizadores · ?q · ?f=rev,hoy,paid,free,hid · ?antes = cursor. 6c: ?tab=bol Buscar boleto
   (código, orden, teléfono, nombre o el texto del QR) y BOLETOS EMITIDOS · BRUTO BOLETOS. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("evt", "ver");
  const f = leerFiltrosEvt(await searchParams);
  // 6j · La alerta viva «evento con sobreventa» y la comisión vigente de boletos (fee_rules «bol», la edita Planes).
  const { sobreventa } = await import("@/lib/evt-admin");
  const [r, orgs, bol, kb, sv, fee] = await Promise.all([listaEventosAdmin(s, f.tab === "bol" ? { ...f, q: "" } : f), organizadoresAdmin(s, f.tab === "org" ? f.q : ""), f.tab === "bol" ? buscarBoletosAdmin(s, f.q) : Promise.resolve(null), kpiBoletosAdmin(s), sobreventa(s),
    db().query<{ bp: number; fixed: number }>(`select rate_bp as bp, fixed_cents as fixed from fee_rules where kind = 'bol' and effective_from <= now() order by effective_from desc, id desc limit 1`)]);
  return <EventosAdmin f={f} filas={r.filas} total={r.total} cab={r.cab} siguiente={r.siguiente} sla={r.sla} orgs={orgs} bol={bol} kb={kb} liq={s.puede("tx", "ver")} sobreventa={sv} fee={fee.rows[0] ?? null} puede={{ aprobar: s.puede("evt", "aprobar"), retirar: s.puede("evt", "retirar") }} />;
}
