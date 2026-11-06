import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { citaVista } from "@/lib/citas";
import { vencerCitas } from "@/lib/citas-flujo";
import { Estado } from "./Estado";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu cita · To'Latino" };

/* APP-NEG-CITA (prototipo citaVals): la cita de la persona. Solo la ve quien la pidió. */
export default async function Page({ params, searchParams }: { params: Promise<{ num: string }>; searchParams: Promise<{ cambio?: string }> }) {
  const [{ num }, lang, u, sp] = await Promise.all([params, idioma(), yo(), searchParams]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/cita/${num}`)}`);
  if (/^C-\d{1,10}$/.test(num)) await vencerCitas({ userId: u.id, numero: num });
  const c = await citaVista(u.id, num);
  if (!c) notFound();
  return <Estado c={c} yo={[u.first_name, u.last_name].filter(Boolean).join(" ")} es={lang === "es"} cambio={sp.cambio === "1"} />;
}
