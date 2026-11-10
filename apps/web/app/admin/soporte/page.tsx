import { requerir } from "@/lib/admin";
import { casoEquipo, horario, kpisSoporte, listaMacros, listaSoporte, plazoDicho, type TabSop } from "@/lib/soporte-equipo";
import { TEMAS, horarioEquipo, type Tema } from "@/lib/soporte-comun";
import { SoporteAdmin } from "../SoporteAdmin";

/* 7b · Super Admin › Soporte (ADM-SOP; Super Admin.dc.html secSop + la ficha `ticket`; hueco #5: la sección del menú lleva a esta cola).
   ?tab=open|mine|esc|res|macros · ?q= buscar (TK-…, nombre o negocio) · ?f=alta|venc · ?tema= · ?antes= cursor de Resueltos · ?caso=TK-… la ficha.
   Ver = sop:ver; todo lo demás lo revisa el servidor en cada acción (lib/soporte-equipo.ts). */
const TABS = new Set(["open", "mine", "esc", "res", "macros"]);
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("sop", "ver");
  const sp = await searchParams;
  const tab = (TABS.has(sp.tab ?? "") ? sp.tab : "open") as TabSop | "macros";
  const tema = sp.tema && TEMAS[sp.tema as Tema] ? (sp.tema as Tema) : null;
  const [lista, k, caso, macros, h] = await Promise.all([
    tab === "macros" ? Promise.resolve({ filas: [], sig: null }) : listaSoporte(s, { tab, q: sp.q ?? "", alta: sp.f === "alta", venc: sp.f === "venc", tema, antes: sp.antes ?? null }),
    kpisSoporte(s),
    sp.caso ? casoEquipo(s, String(sp.caso)) : Promise.resolve(null),
    tab === "macros" ? listaMacros(s) : Promise.resolve([]),
    horario(),
  ]);
  const plazo = caso && caso.equipo ? await plazoDicho(caso.due, null) : null;
  return <SoporteAdmin tab={tab} filas={lista.filas} sig={lista.sig} kpis={k} caso={caso} plazo={plazo} macros={macros} q={sp.q ?? ""} f={sp.f ?? null} tema={tema}
    horario={horarioEquipo(h, true)} casoPedido={sp.caso ?? null}
    puede={{ editar: s.puede("sop", "editar"), aprobar: s.puede("sop", "aprobar"), devolver: s.puede("sop", "editar") || s.puede("tx", "aprobar"), usr: s.puede("usr", "ver"), neg: s.puede("neg", "ver"), tx: s.puede("tx", "ver") }} />;
}
