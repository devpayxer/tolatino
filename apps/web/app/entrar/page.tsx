import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { Entrar } from "./Entrar";

export const metadata: Metadata = { title: "Entra · To'Latino" };
export const dynamic = "force-dynamic";

/* ?volver=/c/comida → al terminar regresa ahí. Solo rutas del mismo sitio (nada de «//otro.com» ni «/\\»). */
const destinoSeguro = (v: unknown) => (typeof v === "string" && /^\/(?![/\\])[\w\-./?=&%,+]*$/.test(v) && v.length <= 300 ? v : "/cuenta");

export default async function Page({ searchParams }: { searchParams: Promise<{ volver?: string }> }) {
  const [u, sp] = await Promise.all([yo(), searchParams]);
  const destino = destinoSeguro(sp.volver);
  if (u?.first_name) redirect(destino);
  return <Entrar destino={destino} inicial={u ? { paso: 2, telefono: u.phone } : { paso: 1 }} />;
}
