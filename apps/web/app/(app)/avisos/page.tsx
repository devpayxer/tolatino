import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { misAvisos, marcarLeidos } from "@/lib/avisos";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { yoMarco } from "../cuenta/yo";
import { Bandeja } from "./Bandeja";

export const metadata: Metadata = { title: "Notificaciones · To'Latino" };
export const dynamic = "force-dynamic";

/* APP-NOTIF · Centro de notificaciones (el prototipo lo nombra; sin pantalla en el diseño: se compone con el marco de Mi
   cuenta). Abrirla marca todo como leído; lo nuevo sale resaltado esta vez. */
export default async function Page({ searchParams }: { searchParams: Promise<{ antes?: string }> }) {
  const [u, lang, sp] = await Promise.all([yo(), idioma(), searchParams]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/avisos")}`);
  const [d, me] = await Promise.all([misAvisos(u.id, typeof sp.antes === "string" ? sp.antes : null), yoMarco(u, lang === "es")]);
  await marcarLeidos(u.id);
  return <Bandeja d={d} es={lang === "es"} yo={me} pagina={!!sp.antes} />;
}
