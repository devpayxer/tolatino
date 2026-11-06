import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { rsvHold } from "@/lib/reservas";
import { Detalles } from "./Detalles";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Solicitud de mesa · To'Latino" };

/* APP-NEG-RESERVA (prototipo rsvDetVals): la mesa retenida 5 minutos, a nombre de quién, ocasión, necesidades, nota y SMS.
   Sin sesión → Entra y vuelve a la pestaña. Sin retención (ya se envió o se eligió otra hora) → vuelve a la pestaña. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ hold?: string }> }) {
  const [{ id }, lang, u, sp] = await Promise.all([params, idioma(), yo(), searchParams]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(`/n/${id}?tab=rsv`)}`);
  const h = sp.hold ? await rsvHold(u.id, sp.hold) : null;
  if (!h || h.negocio.id !== id) redirect(`/n/${id}?tab=rsv`);
  return <Detalles h={h} es={lang === "es"} />;
}
