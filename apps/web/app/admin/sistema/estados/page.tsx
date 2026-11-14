import { requerir } from "@/lib/admin";
import { idioma } from "@/lib/idioma";
import { SistemaEstados } from "../../SistemaEstados";

/* 9j · Super Admin › Sistema › Estados: los 9 estados que cubre toda pantalla del admin, con las piezas reales (prototipo secSys «states»). Solo
   lectura (sys:ver): las acciones de ejemplo no cambian nada. */
export const dynamic = "force-dynamic";
export default async function Page() {
  await requerir("sys", "ver");
  return <SistemaEstados l={await idioma()} />;
}
