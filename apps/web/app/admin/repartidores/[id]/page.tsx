import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { rep360 } from "@/lib/repartidor-admin";
import { Repartidor360 } from "../../Repartidor360";

/* 9n · ADM-DLV · 360° de un repartidor (por persona): equipos, cifras, entregas con su prueba, incidencias y sanciones. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerir("dlv", "ver");
  const { id } = await params;
  const r = await rep360(s, id);
  if (!r) notFound();
  return <Repartidor360 r={r} puede={{ editar: s.puede("dlv", "editar"), sancionar: s.puede("dlv", "retirar"), banear: s.role === "admin", usuarios: s.puede("usr", "ver") }} />;
}
