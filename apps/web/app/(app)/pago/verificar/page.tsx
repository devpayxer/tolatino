import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { pasarela } from "@/lib/pagos/pasarela";
import { verificacionDe } from "@/lib/pagos/verificacion";
import { VerificarCobro } from "./VerificarCobro";

export const metadata: Metadata = { title: "Confirmar el pago · To'Latino" };
export const dynamic = "force-dynamic";

/* 9k · 3-D Secure fuera de sesión (L382): el enlace del aviso (/pago/verificar?pi=…) «Tu banco pide confirmar el cobro de Pro». Solo la persona que paga lo abre (otra cuenta:
   no existe); la hoja completa la verificación con su banco y el servidor completa el período. */
export default async function Page({ searchParams }: { searchParams: Promise<{ pi?: string }> }) {
  // El cobro va en la consulta (?pi=…): el id del simulador lleva la hora del período («:» y «.»), que una ruta no deja pasar.
  const [{ pi: crudo }, lang, u] = await Promise.all([searchParams, idioma(), yo()]);
  const pi = String(crudo ?? "");
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/pago/verificar?pi=${encodeURIComponent(pi)}`)}`);
  const v = await verificacionDe(u.id, pi);
  const modo = pasarela.modo();
  if (!v || modo === "apagado") notFound();
  return <VerificarCobro es={lang === "es"} v={v} estado={v.estado} negocio={v.negocio} modo={modo} pk={process.env.STRIPE_PUBLISHABLE_KEY ?? null} />;
}
