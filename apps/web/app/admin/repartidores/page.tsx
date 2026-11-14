import { requerir } from "@/lib/admin";
import { incidencias, leerFiltroDlv, listaRepartidores } from "@/lib/repartidor-admin";
import { Repartidores } from "../Repartidores";

/* 9n · ADM-DLV · Super Admin › Repartidores: la lista (filtros y cursor en la URL) y las incidencias de entrega. El servidor filtra por las
   ciudades del rol. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("dlv", "ver");
  const sp = await searchParams, tab = sp.tab === "incid" ? "incid" : "lista";
  const f = leerFiltroDlv(sp);
  const [l, inc] = await Promise.all([tab === "lista" ? listaRepartidores(s, f) : null, tab === "incid" ? incidencias(s, sp.todas !== "1") : null]);
  return <Repartidores tab={tab} f={f} lista={l} incid={inc} todas={sp.todas === "1"} puede={{ editar: s.puede("dlv", "editar"), sancionar: s.puede("dlv", "retirar") }} />;
}
