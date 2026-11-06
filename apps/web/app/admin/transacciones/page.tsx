import { requerir } from "@/lib/admin";
import { leerFiltrosTx, listaTx, POR_PAGINA_TX } from "@/lib/admin-tx";
import { Transacciones } from "../Transacciones";

/* ADM-TX · Transacciones: pedidos y reservaciones de 90 días de tus ciudades, con filtros en la URL. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("tx", "ver");
  const sp = await searchParams, f = leerFiltrosTx(sp);
  const r = await listaTx(s, f);
  return <Transacciones d={r} f={f} porPagina={POR_PAGINA_TX} exportar={s.puede("tx", "exportar")} />;
}
