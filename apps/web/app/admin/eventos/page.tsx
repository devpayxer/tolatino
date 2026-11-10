import { requerir } from "@/lib/admin";
import { leerFiltrosEvt, listaEventosAdmin, organizadoresAdmin } from "@/lib/evt-revision";
import { buscarBoletosAdmin, kpiBoletosAdmin } from "@/lib/boletos-admin";
import { EventosAdmin } from "../EventosAdmin";

/* ADM-EVT · Eventos y boletos (6a): ?tab=org Organizadores · ?q · ?f=rev,hoy,paid,free,hid · ?antes = cursor. 6c: ?tab=bol Buscar boleto
   (código, orden, teléfono, nombre o el texto del QR) y BOLETOS EMITIDOS · BRUTO BOLETOS. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("evt", "ver");
  const f = leerFiltrosEvt(await searchParams);
  const [r, orgs, bol, kb] = await Promise.all([listaEventosAdmin(s, f.tab === "bol" ? { ...f, q: "" } : f), organizadoresAdmin(s, f.tab === "org" ? f.q : ""), f.tab === "bol" ? buscarBoletosAdmin(s, f.q) : Promise.resolve(null), kpiBoletosAdmin(s)]);
  return <EventosAdmin f={f} filas={r.filas} total={r.total} cab={r.cab} siguiente={r.siguiente} sla={r.sla} orgs={orgs} bol={bol} kb={kb} puede={{ aprobar: s.puede("evt", "aprobar"), retirar: s.puede("evt", "retirar") }} />;
}
