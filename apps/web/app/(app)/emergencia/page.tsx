import type { Metadata } from "next";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misCasas, oficiosPublico } from "@/lib/oficios-publico";
import { EMER, LINE911, candidatosEm } from "@/lib/solicitudes";
import { Emergencia, type OpcionEm } from "./Emergencia";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Emergencia en casa · To'Latino" };

/* APP-NEG-HOGAR-EMERGENCIA: desde la ficha de un negocio con emergencias 24/7 (?b=negocio&ek=tipo) o sola. Ver no pide
   cuenta; mandar sí. Para cada tipo: cuántos negocios 24/7 llegan a tu casa y el rango de sus salidas (el servidor decide). */
export default async function Page({ searchParams }: { searchParams: Promise<{ b?: string; ek?: string }> }) {
  const [sp, lang, u] = await Promise.all([searchParams, idioma(), yo()]);
  const b = typeof sp.b === "string" && /^[a-z0-9-]{1,80}$/.test(sp.b) ? sp.b : null;
  const op = b ? await oficiosPublico(b, u?.id ?? null) : null;
  const casa = u ? (await misCasas(u.id, op?.rubro === "hogar" ? b : null))[0] ?? null : null;
  const opciones: OpcionEm[] = await Promise.all(Object.entries(EMER).map(async ([ek, [es, en]]) => {
    const L = await candidatosEm(u?.id ?? null, ek), P = L.map((x) => x.salida);
    return { ek, t: { es, en }, n: L.length, lo: P.length ? Math.min(...P) : 0, hi: P.length ? Math.max(...P) : 0 };
  }));
  const ek0 = typeof sp.ek === "string" && EMER[sp.ek] ? sp.ek : null;
  return <Emergencia opciones={opciones} casa={casa} es={lang === "es"} yo={!!u} desde={op?.rubro === "hogar" ? b : null} ek0={ek0} linea911={LINE911} op={op?.rubro === "hogar" ? op : null} />;
}
