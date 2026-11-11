import { requerir } from "@/lib/admin";
import { pasarela } from "@/lib/pagos/pasarela";
import { leerFiltrosTx, listaTx, POR_PAGINA_TX } from "@/lib/admin-tx";
import { conRuta } from "@/lib/ruta";
import { Transacciones } from "../Transacciones";

/* ADM-TX · Transacciones: pedidos y reservaciones de 90 días de tus ciudades, con filtros en la URL. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("tx", "ver");
  const sp = await searchParams, f = leerFiltrosTx(sp);
  const r = await listaTx(s, f);
  // 8e · Qué entregas de esta página tienen ruta (solo el número; el recorrido sale con motivo, verRutaTx).
  const rutas = [...(await conRuta(r.filas.filter((x) => x.k === "order" && x.mode === "delivery").map((x) => x.num)))];
  return <Transacciones d={r} f={f} rutas={rutas} porPagina={POR_PAGINA_TX} exportar={s.puede("tx", "exportar")} devolver={s.puede("tx", "aprobar")} sim={pasarela.modo() === "simulador"} />;
}
