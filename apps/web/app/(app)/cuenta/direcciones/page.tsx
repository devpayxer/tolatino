import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { misDirecciones, zonaDe } from "@/lib/direcciones";
import { idioma } from "@/lib/idioma";
import { yoMarco } from "../yo";
import { Direcciones } from "./Direcciones";

export const metadata: Metadata = { title: "Direcciones · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-DIRECCIONES (Mi cuenta › Direcciones): las direcciones de entrega de la persona. */
export default async function Page() {
  const u = await yo();
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/direcciones")}`);
  const es = (await idioma()) === "es";
  const [dirs, zona, me] = await Promise.all([misDirecciones(u.id), zonaDe(u.id), yoMarco(u, es)]);
  return <Direcciones es={es} yo={me} dirs={dirs} zona={zona} />;
}
