import { requerir } from "@/lib/admin";
import { idioma } from "@/lib/idioma";
import { saludAdmin } from "@/lib/sistema/salud";
import { SistemaSalud } from "../../SistemaSalud";

/* 9j · Super Admin › Sistema › Salud: ver sys:ver · programar o cancelar un mantenimiento sys:editar (lo revisa cada acción). */
export const dynamic = "force-dynamic";
export default async function Page() {
  const s = await requerir("sys", "ver");
  const [d, l] = await Promise.all([saludAdmin(), idioma()]);
  return <SistemaSalud d={d} l={l} editar={s.puede("sys", "editar")} />;
}
