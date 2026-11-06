import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misPlanesRentas, misReservas } from "@/lib/mi-cuenta";
import { yoMarco } from "../yo";
import { Citas } from "./Citas";

export const metadata: Metadata = { title: "Citas y reservas · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-CITAS (diseño citasV): próximas y pasadas. Hoy, las reservaciones de mesa; las citas de belleza, salud y autos
   se suman con sus fases. */
export default async function Page({ searchParams }: { searchParams: Promise<{ f?: string; antes?: string }> }) {
  const [u, lang, sp] = await Promise.all([yo(), idioma(), searchParams]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/citas")}`);
  const f = sp.f === "past" ? "past" : "up";
  const [d, me, otros] = await Promise.all([misReservas(u.id, f, typeof sp.antes === "string" ? sp.antes : null), yoMarco(u, lang === "es"), misPlanesRentas(u.id)]);
  return <Citas d={d} f={f} es={lang === "es"} yo={me} pagina={!!sp.antes} otros={otros.filter((x) => x.abierto === (f === "up"))} />;
}
