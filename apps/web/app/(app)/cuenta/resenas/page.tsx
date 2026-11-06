import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misResenas } from "@/lib/mi-cuenta";
import { yoMarco } from "../yo";
import { Resenas } from "./Resenas";

export const metadata: Metadata = { title: "Reseñas · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-RESENAS (diseño revV): las que escribiste y las que te faltan. */
export default async function Page({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const [u, lang, sp] = await Promise.all([yo(), idioma(), searchParams]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/resenas")}`);
  const [d, me] = await Promise.all([misResenas(u.id), yoMarco(u, lang === "es")]);
  return <Resenas d={d} f={sp.f === "pend" ? "pend" : "hechas"} es={lang === "es"} yo={me} />;
}
