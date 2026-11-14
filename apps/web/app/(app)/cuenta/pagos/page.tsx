import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misTarjetas } from "@/lib/cobros";
import { misMovimientos } from "@/lib/movimientos";
import { yoMarco } from "../yo";
import { Pagos } from "./Pagos";

export const metadata: Metadata = { title: "Pagos · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-PAGOS (diseño «To'Latino Mi cuenta» · USR-TARJETAS → USR-PAGOS): tus tarjetas guardadas y quitar una (9k, L360). Las tarjetas se agregan al pagar
   (Método de pago). 9m · Pagos y movimientos (L773, L936): lo que se cobró, retuvo, liberó o devolvió, con su orden; por cursor (?c=). */
export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const [u, lang, sp] = await Promise.all([yo(), idioma(), searchParams]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/pagos")}`);
  const [me, tarjetas, mov] = await Promise.all([yoMarco(u, lang === "es"), misTarjetas(u.id), misMovimientos(u.id, typeof sp.c === "string" ? sp.c.slice(0, 60) : null)]);
  return <Pagos es={lang === "es"} yo={me} tarjetas={tarjetas} mov={mov} pagina={typeof sp.c === "string"} />;
}
