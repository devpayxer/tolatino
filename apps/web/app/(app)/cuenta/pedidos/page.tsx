import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misPedidos, type FiltroPed } from "@/lib/mi-cuenta";
import { apartadosActivos } from "@/lib/apartados";
import { yoMarco } from "../yo";
import { Pedidos } from "./Pedidos";

export const metadata: Metadata = { title: "Pedidos · To'Latino" };
export const dynamic = "force-dynamic";
const F = new Set(["todo", "curso", "hechos", "cx"]);

/* USR-PEDIDOS (diseño ordersV): todos tus pedidos por mes, con filtro y «Ver más» por cursor. Cada uno abre su página.
   9t · En «Todos» (la primera página), arriba, los Apartados que siguen vivos (lib/apartados.ts apartadosActivos). */
export default async function Page({ searchParams }: { searchParams: Promise<{ f?: string; antes?: string }> }) {
  const [u, lang, sp] = await Promise.all([yo(), idioma(), searchParams]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/pedidos")}`);
  const f = (F.has(sp.f ?? "") ? sp.f : "todo") as FiltroPed;
  const [d, me, apt] = await Promise.all([misPedidos(u.id, f, typeof sp.antes === "string" ? sp.antes : null, lang), yoMarco(u, lang === "es"),
    f === "todo" && !sp.antes ? apartadosActivos(u.id, lang) : Promise.resolve([])]);
  return <Pedidos d={d} f={f} es={lang === "es"} yo={me} pagina={!!sp.antes} apartados={apt} />;
}
