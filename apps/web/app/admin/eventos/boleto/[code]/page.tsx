import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { boletoAdmin } from "@/lib/boletos-admin";
import { escaneosBoleto } from "@/lib/puerta-admin";
import { BoletoAdmin } from "../../../BoletoAdmin";

/* ADM-EVT · Buscar boleto › el boleto (6c): estado, evento, orden con su línea de tiempo, pago (simulado o real), lo que pasó con el boleto
   y Reenviar · Reemitir · Anular con motivo. Solo en las ciudades del equipo. */
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const s = await requerir("evt", "ver");
  const code = decodeURIComponent((await params).code).toUpperCase();
  const [b, esc, pases] = await Promise.all([boletoAdmin(s, code), escaneosBoleto(s, code), (await import("@/lib/pases/admin")).pasesDeBoleto(s, code)]);
  if (!b) notFound();
  // 6g · ESCANEOS: cada vez que pasó por la puerta (auditoría de check-ins: quién, en qué puerta y a qué hora).
  // 8g · WALLET: los pases de Apple y Google de este boleto y su estado.
  return <BoletoAdmin b={b} escaneos={esc} pases={pases} puede={{ editar: s.puede("evt", "editar"), retirar: s.puede("evt", "retirar") }} />;
}
