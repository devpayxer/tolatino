import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { pantallaBoletos } from "@/lib/boletos";
import { idioma } from "@/lib/idioma";
import { Boletos } from "./Boletos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Boletos · To'Latino", robots: { index: false } };

/* APP-EVT-BOLETOS (prototipo tkVals L1289): tipos con cantidad, una mesa por orden, extras, código y «Continuar» (aparta). Ver no pide
   cuenta; continuar sí (vuelve aquí con lo elegido). Lo que se vende y cuánto queda lo dice el servidor. */
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ fecha?: string; t?: string; m?: string; a?: string }> }) {
  const [{ slug }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  if (!sp.fecha || !/^\d{1,18}$/.test(sp.fecha)) notFound();
  const p = await pantallaBoletos(sp.fecha, u?.id ?? null, lang === "es");
  if (!p || p.evento.slug !== slug) notFound();
  if (p.estado !== "abierta") redirect(`/eventos/${slug}?fecha=${sp.fecha}`);
  // Lo elegido antes de entrar vuelve en la URL (?t=id:q,id:q&m=id&a=id,id): solo ids y cantidades.
  const ini = {
    t: Object.fromEntries(String(sp.t ?? "").split(",").map((x) => x.split(":")).filter((x) => x.length === 2 && /^\d{1,18}$/.test(x[0]!) && /^\d{1,2}$/.test(x[1]!)).map((x) => [x[0]!, Number(x[1])])),
    m: sp.m && /^\d{1,18}$/.test(sp.m) ? sp.m : null,
    a: String(sp.a ?? "").split(",").filter((x) => /^\d{1,18}$/.test(x)),
  };
  return <Boletos p={p} es={lang === "es"} yo={!!u} ini={ini} />;
}
