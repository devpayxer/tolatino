import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misHilos } from "@/lib/mensajes";
import { yoMarco } from "../yo";
import { Mensajes } from "./Mensajes";

export const metadata: Metadata = { title: "Mensajes · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-MENSAJES (diseño msgsV): las conversaciones con los negocios, la más reciente primero (paginado por cursor). */
export default async function Page({ searchParams }: { searchParams: Promise<{ antes?: string }> }) {
  const [u, lang, sp] = await Promise.all([yo(), idioma(), searchParams]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/mensajes")}`);
  const [d, me] = await Promise.all([misHilos(u.id, sp.antes ?? null), yoMarco(u, lang === "es")]);
  return <Mensajes d={d} es={lang === "es"} yo={me} pagina={!!sp.antes} />;
}
