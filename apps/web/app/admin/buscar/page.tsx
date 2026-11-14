import { requerir } from "@/lib/admin";
import { buscarTodo } from "@/lib/admin-buscar";
import { Buscar } from "../Buscar";

/* El buscador global (⌘K): ?q= — negocios, usuarios, # de operación y secciones. Cualquiera del equipo con acceso al Super Admin; cada grupo pide su `ver`. */
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const s = await requerir("home", "ver");
  const r = await buscarTodo(s, (await searchParams).q ?? "");
  return <Buscar r={r} />;
}
