import { requerir } from "@/lib/admin";
import { leerFiltrosEvt, listaEventosAdmin, organizadoresAdmin } from "@/lib/evt-revision";
import { EventosAdmin } from "../EventosAdmin";

/* ADM-EVT · Eventos y boletos (6a): ?tab=org Organizadores · ?q · ?f=rev,hoy,paid,free,hid · ?antes = cursor. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("evt", "ver");
  const f = leerFiltrosEvt(await searchParams);
  const [r, orgs] = await Promise.all([listaEventosAdmin(s, f), organizadoresAdmin(s, f.tab === "org" ? f.q : "")]);
  return <EventosAdmin f={f} filas={r.filas} total={r.total} cab={r.cab} siguiente={r.siguiente} sla={r.sla} orgs={orgs} puede={{ aprobar: s.puede("evt", "aprobar"), retirar: s.puede("evt", "retirar") }} />;
}
