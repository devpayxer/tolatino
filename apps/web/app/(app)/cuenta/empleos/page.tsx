import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misSolicitudes } from "@/lib/mi-cuenta";
import { yoMarco } from "../yo";
import { Empleos } from "./Empleos";

export const metadata: Metadata = { title: "Empleos · To'Latino" };
export const dynamic = "force-dynamic";

/* Mi cuenta · Empleos: tus solicitudes de empleo (J-…), compuesto con las piezas del marco de Mi cuenta. */
export default async function Page() {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/empleos")}`);
  const [d, me] = await Promise.all([misSolicitudes(u.id), yoMarco(u, lang === "es")]);
  return <Empleos d={d} es={lang === "es"} yo={me} />;
}
