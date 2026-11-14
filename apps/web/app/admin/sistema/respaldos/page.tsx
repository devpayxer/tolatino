import { requerir } from "@/lib/admin";
import { idioma } from "@/lib/idioma";
import { respaldosAdmin } from "@/lib/sistema/respaldos";
import { SistemaRespaldos } from "../../SistemaRespaldos";

/* 9j · Super Admin › Sistema › Respaldos: solo lectura (sys:ver). Los respaldos y las restauraciones de prueba los escribe la tubería (9o). */
export const dynamic = "force-dynamic";
export default async function Page() {
  await requerir("sys", "ver");
  const [d, l] = await Promise.all([respaldosAdmin(), idioma()]);
  return <SistemaRespaldos d={d} l={l} />;
}
