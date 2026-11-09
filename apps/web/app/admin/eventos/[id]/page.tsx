import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { eventoAdmin } from "@/lib/evt-revision";
import { EventoAdmin } from "../../EventosAdmin";

/* ADM-EVT · la ficha de un evento: lo publicado, el cambio que espera (si hay), revisar, ocultar y el organizador. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerir("evt", "ver");
  const e = await eventoAdmin(s, (await params).id);
  if (!e) notFound();
  return <EventoAdmin e={e} puede={{ aprobar: s.puede("evt", "aprobar"), retirar: s.puede("evt", "retirar") }} />;
}
