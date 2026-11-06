import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { menuPublico } from "@/lib/pedir";
import { misTarjetas, tarjetaDe } from "@/lib/cobros";
import { pasarela } from "@/lib/pagos/pasarela";
import { Pagar } from "./Pagar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Finalizar pedido · To'Latino" };

/* APP-NEG-CHECKOUT (prototipo ckVals, master 1f · pantalla 3): pickup o delivery, con tarjeta (si el negocio cobra con
   tarjeta) o en el local. Sin sesión → Entra y vuelve. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(`/n/${id}/pagar`)}`);
  const m = await menuPublico(id, lang, u.id);
  if (!m || m.vacio) notFound();
  // Tarjeta en la app: si el negocio cobra con tarjeta, el modo de la pasarela, la llave pública y tus tarjetas guardadas.
  const T = await tarjetaDe(id), modo = pasarela.modo();
  const pago = T.on && modo !== "apagado" ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: await misTarjetas(u.id) } : null;
  return <Pagar m={m} es={lang === "es"} pago={pago} />;
}
