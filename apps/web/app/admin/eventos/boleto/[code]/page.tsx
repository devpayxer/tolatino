import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { boletoAdmin } from "@/lib/boletos-admin";
import { BoletoAdmin } from "../../../BoletoAdmin";

/* ADM-EVT · Buscar boleto › el boleto (6c): estado, evento, orden con su línea de tiempo, pago (simulado o real), lo que pasó con el boleto
   y Reenviar · Reemitir · Anular con motivo. Solo en las ciudades del equipo. */
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const s = await requerir("evt", "ver");
  const b = await boletoAdmin(s, decodeURIComponent((await params).code).toUpperCase());
  if (!b) notFound();
  return <BoletoAdmin b={b} puede={{ editar: s.puede("evt", "editar"), retirar: s.puede("evt", "retirar") }} />;
}
