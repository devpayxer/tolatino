import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sesionActual, yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { sesionesDe } from "@/lib/perfil";
import { yoMarco } from "../../yo";
import { Privacidad } from "./Privacidad";

export const metadata: Metadata = { title: "Privacidad y seguridad · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-PRIVACIDAD (diseño privV): quién te ve y tus sesiones abiertas. */
export default async function Page() {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/ajustes/privacidad")}`);
  const [s, me] = await Promise.all([sesionesDe(u.id, await sesionActual()), yoMarco(u, lang === "es")]);
  return <Privacidad s={s} es={lang === "es"} yo={me} />;
}
