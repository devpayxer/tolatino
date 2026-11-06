import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { rsvDe, rsvHoras } from "@/lib/reservas";
import { Estado } from "./Estado";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu reservación · To'Latino" };

/* APP-NEG-RESERVA-ESTADO (prototipo rsvStVals): la reservación de la persona. Solo la ve quien la hizo. Si no se pudo,
   las horas con mesa de ese día para elegir otra. */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/reserva/${num}`)}`);
  const r = await rsvDe(u.id, num);
  if (!r) notFound();
  const otras = (r.st === "no" || r.st === "exp") && r.dia >= 0
    ? (await rsvHoras(r.negocio.id, r.dia, r.p, "")).grupos.flatMap((g) => g.sl).filter((s) => s.free && s.h !== r.h).slice(0, 6).map((s) => s.h)
    : [];
  return <Estado r={r} otras={otras} telefono={u.phone} es={lang === "es"} />;
}
