import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { correoDe } from "@/lib/admin-notif";
import { VerCorreo } from "./VerCorreo";

/* ADM-NOTIF › Correos › un correo, como le llegó a la persona (para revisar el sandbox y responder a soporte). El correo de
   la persona sale enmascarado y el enlace de «Confirma tu correo» tapado. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerir("notif", "ver");
  const { id } = await params;
  const c = await correoDe(s, id);
  if (!c) notFound();
  return <VerCorreo c={c} />;
}
