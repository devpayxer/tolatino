import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misNegocios } from "@/lib/panel";
import { ciudadDe } from "@/lib/perfil";
import { yoMarco } from "../yo";
import { Ajustes } from "./Ajustes";

export const metadata: Metadata = { title: "Ajustes · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-AJUSTES (diseño setV): idioma, mi ciudad, avisos, privacidad, tu negocio, cerrar sesión y borrar. */
export default async function Page() {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/ajustes")}`);
  const [c, me, negs] = await Promise.all([ciudadDe(u.id), yoMarco(u, lang === "es"), misNegocios(u.id)]);
  return <Ajustes es={lang === "es"} yo={me} ciudad={c.name} negocio={negs[0] ? { id: negs[0].id, name: negs[0].name } : null} />;
}
