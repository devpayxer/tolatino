import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misTarjetas } from "@/lib/cobros";
import { yoMarco } from "../yo";
import { Pagos } from "./Pagos";

export const metadata: Metadata = { title: "Pagos · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-PAGOS (diseño «To'Latino Mi cuenta» · USR-TARJETAS → USR-PAGOS): tus tarjetas guardadas y quitar una (9k, L360). Las tarjetas se agregan al pagar
   (Método de pago). El Wallet y los movimientos de USR-PAGOS llegan con su bloque (LAUNCH). */
export default async function Page() {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/pagos")}`);
  const [me, tarjetas] = await Promise.all([yoMarco(u, lang === "es"), misTarjetas(u.id)]);
  return <Pagos es={lang === "es"} yo={me} tarjetas={tarjetas} />;
}
