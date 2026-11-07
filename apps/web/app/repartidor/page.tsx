import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misSalidas } from "@/lib/chofer";
import { misEntregas, misEquipos, misGanancias } from "@/lib/repartidor";
import { Repartidor } from "./Repartidor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "To'Latino Repartidor" };

/* /repartidor (DLV · decisión B, una de las 4 apps): Inicio · Pedidos · Ganancias · Perfil y el detalle (?p=número).
   Solo con cuenta; sin equipo, entra con el código que le dio el negocio. Compuesta con el sistema de diseño (REVISION). */
export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string; p?: string; s?: string }> }) {
  const [u, lang, sp] = await Promise.all([yo(), idioma(), searchParams]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/repartidor")}`);
  const t = ["inicio", "pedidos", "ganancias", "perfil"].includes(sp.t ?? "") ? (sp.t as "inicio" | "pedidos" | "ganancias" | "perfil") : "inicio";
  const p = typeof sp.p === "string" && /^\d{1,12}$/.test(sp.p) ? sp.p : null;
  const [equipos, entregas, salidas] = await Promise.all([misEquipos(u.id), misEntregas(u.id), misSalidas(u.id)]);
  const s = typeof sp.s === "string" && /^\d{1,18}$/.test(sp.s) ? sp.s : null;
  const ganancias = t === "ganancias" || t === "inicio" ? await misGanancias(u.id) : [];
  return <Repartidor es={lang === "es"} t={t} p={p} nombre={u.first_name} tel={u.phone} equipos={equipos} entregas={entregas} ganancias={ganancias} salidas={salidas} s={s} />;
}
