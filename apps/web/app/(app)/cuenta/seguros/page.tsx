import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misSeguros, opcionesSeguro } from "@/lib/mis-seguros";
import { yoMarco } from "../yo";
import { Seguros } from "./Seguros";

export const metadata: Metadata = { title: "Mis seguros · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-SEGUROS (Mi cuenta › Mis seguros; hueco #6 del plan de Doctores): ver, agregar, elegir el principal y quitar. */
export default async function Page() {
  const u = await yo();
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/seguros")}`);
  const es = (await idioma()) === "es";
  const [L, O, me] = await Promise.all([misSeguros(u.id), opcionesSeguro(), yoMarco(u, es)]);
  return <Seguros es={es} yo={me} seguros={L} op={O} />;
}
