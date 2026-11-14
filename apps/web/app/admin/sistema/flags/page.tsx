import { requerir } from "@/lib/admin";
import { idioma } from "@/lib/idioma";
import { flagsAdmin } from "@/lib/sistema/flags";
import { SistemaFlags } from "../../SistemaFlags";

/* 9j · Super Admin › Sistema › Flags: ver sys:ver · cambiar sys:editar (lo revisa cada acción). */
export const dynamic = "force-dynamic";
export default async function Page() {
  const s = await requerir("sys", "ver");
  const [d, l] = await Promise.all([flagsAdmin(), idioma()]);
  return <SistemaFlags flags={d.flags} ciudades={d.ciudades} l={l} editar={s.puede("sys", "editar")} />;
}
