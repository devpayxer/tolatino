import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { perfilDe } from "@/lib/perfil";
import { yoMarco } from "../yo";
import { Perfil } from "./Perfil";

export const metadata: Metadata = { title: "Perfil · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-PERFIL (diseño profV): nombre, apellido, cómo te dicen, correo, foto; teléfono y mi ciudad. */
export default async function Page() {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/perfil")}`);
  const [p, me] = await Promise.all([perfilDe(u.id), yoMarco(u, lang === "es")]);
  if (!p) redirect("/entrar");
  return <Perfil p={p} es={lang === "es"} yo={me} />;
}
