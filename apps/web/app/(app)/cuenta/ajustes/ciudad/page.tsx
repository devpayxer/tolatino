import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { ciudadDe } from "@/lib/perfil";
import { yoMarco } from "../../yo";
import { Ciudad } from "./Ciudad";

export const metadata: Metadata = { title: "Mi ciudad · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-CIUDAD (diseño cityV): tu ciudad, desde cuándo, cuándo la puedes cambiar y a cuál (solo las abiertas). */
export default async function Page() {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/ajustes/ciudad")}`);
  const [c, me] = await Promise.all([ciudadDe(u.id), yoMarco(u, lang === "es")]);
  return <Ciudad c={c} es={lang === "es"} yo={me} />;
}
