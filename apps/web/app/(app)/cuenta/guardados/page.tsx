import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misGuardados } from "@/lib/mi-cuenta";
import { yoMarco } from "../yo";
import { Guardados } from "./Guardados";

export const metadata: Metadata = { title: "Guardados · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-FAVORITOS (diseño favV): negocios que guardas o sigues, vacantes y novedades guardadas. */
export default async function Page({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const [u, lang, sp] = await Promise.all([yo(), idioma(), searchParams]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/guardados")}`);
  const [d, me] = await Promise.all([misGuardados(u.id), yoMarco(u, lang === "es")]);
  const f = sp.f === "vac" || sp.f === "nov" ? sp.f : "biz";
  return <Guardados d={d} f={f} es={lang === "es"} yo={me} />;
}
