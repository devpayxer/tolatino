import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sesionActual, yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { sesionesDe } from "@/lib/perfil";
import { llavesAqui } from "@/lib/llaves/config";
import { misLlaves } from "@/lib/llaves/llaves";
import { yoMarco } from "../../yo";
import { Privacidad } from "./Privacidad";

export const metadata: Metadata = { title: "Privacidad y seguridad · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-PRIVACIDAD (diseño privV): quién te ve, tus llaves de acceso (8d) y tus sesiones abiertas. */
export default async function Page() {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/ajustes/privacidad")}`);
  const [s, me, llaves, rp] = await Promise.all([sesionesDe(u.id, await sesionActual()), yoMarco(u, lang === "es"), misLlaves(u.id), llavesAqui()]);
  // 8d · Llaves de acceso: las suyas siempre (para quitarlas también desde donde no se pueden usar); agregar, solo donde se ofrecen.
  return <Privacidad s={s} es={lang === "es"} yo={me} llaves={llaves} agregar={!!rp} />;
}
