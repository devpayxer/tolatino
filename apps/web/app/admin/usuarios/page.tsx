import { requerir } from "@/lib/admin";
import { leerFiltros, listaUsuarios, POR_PAGINA } from "@/lib/admin-usuarios";
import { Usuarios } from "../Usuarios";

/* ADM-USR · Usuarios: todas las cuentas de tus ciudades, con filtros en la URL. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("usr", "ver");
  const f = leerFiltros(await searchParams);
  const r = await listaUsuarios(s, f);
  return <Usuarios filas={r.filas} total={r.total} cab={r.cab} f={f} porPagina={POR_PAGINA} />;
}
