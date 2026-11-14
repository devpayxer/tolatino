import { escalarVencidas } from "@/lib/ayuda";
import { requerir } from "@/lib/admin";
import { ajustesColas, caso as leerCaso, colasVisibles, listaCasos, slasColas } from "@/lib/admin-colas";
import type { Cola } from "@/lib/colas";
import { Colas } from "../Colas";
import { valor, valores } from "@/lib/config";

/* ADM-COLAS: ?cola= una cola · ?f=mios|sin|venc · ?caso= abre el detalle. */
export default async function Page({ searchParams }: { searchParams: Promise<{ cola?: string; f?: string; caso?: string; ajustes?: string; pag?: string }> }) {
  const s = await requerir("colas", "ver");
  const sp = await searchParams;
  await escalarVencidas();
  const vis = colasVisibles(s);
  const cola = vis.includes(sp.cola as Cola) ? (sp.cola as Cola) : null;
  const [l, c, apelarDias, slas] = await Promise.all([
    listaCasos(s, { cola, mios: sp.f === "mios", sinAsignar: sp.f === "sin", vencidos: sp.f === "venc", pag: Number(sp.pag) || 1 }),
    sp.caso ? leerCaso(s, sp.caso) : Promise.resolve(null),
    valor("com_apelar_dias"),
    slasColas(),
  ]);
  // 9n · Colas › Ajustes (solo un Admin): quién ve cada cola y los feriados del equipo.
  const aj = sp.ajustes === "1" && s.role === "admin" ? await ajustesColas() : null;
  // 9n · Los valores de Configuración que dicen las reglas de las colas («3 grupos en 90 días»): se editan en Configuración y aquí se leen.
  const cfgTxt = await valores("insc_grupos_n", "insc_grupos_dias");
  return <Colas cfgTxt={cfgTxt} esAdmin={s.role === "admin"} ajustes={aj} puedeRepartir={s.puede("colas", "editar")} casos={l.casos} hay={l.hay} pag={l.pag} porPagina={l.porPagina} conteo={l.conteo} vencidos={l.vencidos} total={l.total} visibles={vis} caso={c} puedeAprobar={s.puede("colas", "aprobar")} apelarDias={apelarDias} slas={slas} />;
}
