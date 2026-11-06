import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { numeroVecino } from "@/lib/direcciones";
import { idioma } from "@/lib/idioma";
import { yoMarco } from "../yo";
import { Invitar } from "./Invitar";

export const metadata: Metadata = { title: "Invita vecinos · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-INVITAR (diseño invV): comparte To'Latino con tus vecinos. */
export default async function Page() {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/invitar")}`);
  const [me, nv] = await Promise.all([yoMarco(u, lang === "es"), numeroVecino(u.id)]);
  return <Invitar es={lang === "es"} yo={me} nombre={u.nick || u.first_name} ciudad={nv?.ciudad ?? "Hazleton"} />;
}
