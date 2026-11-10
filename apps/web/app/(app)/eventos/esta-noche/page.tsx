import type { Metadata } from "next";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { estaNoche } from "@/lib/evt-publico";
import { ubicacion } from "@/lib/ubicacion";
import { PantallaPronto } from "../../PantallaPronto";
import { EstaNoche } from "./EstaNoche";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Esta noche · Eventos · To'Latino" };

/* APP-EVT-NOCHE (prototipo nvVals L1178): lo de hoy en la ciudad como historias a pantalla completa; flechas en escritorio. */
export default async function Page({ searchParams }: { searchParams: Promise<{ i?: string }> }) {
  const [sp, lang, u] = await Promise.all([searchParams, idioma(), yo()]);
  const loc = await ubicacion(u);
  if (loc.c.status !== "on") return <PantallaPronto loc={loc} lang={lang} userId={u?.id ?? null} />;
  const L = await estaNoche(loc, u?.id ?? null, lang === "es", 24);
  const i = Math.max(0, Math.min(L.length - 1, Number.parseInt(String(sp.i ?? "0"), 10) || 0));
  return <EstaNoche es={lang === "es"} ciudad={loc.c.name} slides={L} inicio={i} />;
}
