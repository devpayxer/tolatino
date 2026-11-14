import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { CODIGO_EQ, verInvitacion } from "@/lib/equipo-invitacion";
import { AceptarEquipo } from "./AceptarEquipo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invitación al equipo", robots: { index: false, follow: false } };

/* 9n-2 · /e/{código}: la invitación al equipo de un negocio (L101). Solo con cuenta (el teléfono invitado); el servidor revisa el código, que vence a los
   7 días y se usa una sola vez. Un código malo o de otro teléfono nunca dice a qué negocio pertenece. Compuesta con las piezas del sistema (como entrar al
   equipo del Repartidor): foto, palabras e idiomas, y «Aceptar». */
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const [{ code }, lang, u] = await Promise.all([params, idioma(), yo()]);
  const k = decodeURIComponent(code ?? "");
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(`/e/${CODIGO_EQ.test(k) ? k : "x"}`)}`);
  const r = await verInvitacion(u.id, u.phone, k);
  return <AceptarEquipo es={lang === "es"} codigo={k} tel={u.phone} nombre={u.first_name} v={r.ok ? r.v : null} error={r.ok ? null : r.mensaje} />;
}
