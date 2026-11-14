import type { Metadata } from "next";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { buscarCarros, buscarCasas } from "@/lib/inventario-buscar";
import { ubicacion } from "@/lib/ubicacion";
import { PantallaPronto } from "../../PantallaPronto";
import { Inventario } from "./Inventario";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Buscar casa o carro · To'Latino" };

type SP = { t?: string; modo?: string; rec?: string; max?: string; desde?: string; millas?: string; marca?: string; c?: string };
const num = (x: unknown, min: number, max: number) => { const n = Number(x); return x != null && x !== "" && Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : null; };

/* 9m · APP-BUSCAR-INVENTARIO (L559): buscar por propiedad (renta o venta, recámaras, precio) o por carro (año, millas, precio, marca) en la ciudad
   que se ve. Los filtros van en la dirección; el servidor busca con los índices de cada uno y pagina por cursor. */
export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, lang, u] = await Promise.all([searchParams, idioma(), yo()]);
  const loc = await ubicacion(u);
  if (loc.c.status !== "on") return <PantallaPronto loc={loc} lang={lang} userId={u?.id ?? null} />;
  const t = sp.t === "carro" ? "carro" : "casa";
  const cursor = typeof sp.c === "string" && /^\d{1,9}\|\d{1,18}$/.test(sp.c) ? sp.c : null;
  if (t === "casa") {
    const f = { modo: sp.modo === "venta" ? "venta" as const : "renta" as const, recamaras: num(sp.rec, 0, 6) ?? 0, max: num(sp.max, 1, 10_000_000) };
    const r = await buscarCasas(loc.c.id, { ...f, max: f.max != null ? f.max * 100 : null }, cursor);
    return <Inventario lang={lang} ciudad={loc.c.name} t="casa" casa={f} carro={null} r={r} />;
  }
  const f = { desde: num(sp.desde, 1980, 2100), millas: num(sp.millas, 0, 1_000_000), max: num(sp.max, 1, 10_000_000), marca: typeof sp.marca === "string" ? sp.marca.slice(0, 30) : null };
  const r = await buscarCarros(loc.c.id, { ...f, max: f.max != null ? f.max * 100 : null }, cursor);
  return <Inventario lang={lang} ciudad={loc.c.name} t="carro" casa={null} carro={f} r={r} />;
}
