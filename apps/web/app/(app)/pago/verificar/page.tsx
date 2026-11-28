import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { pasarela } from "@/lib/pagos/pasarela";
import { verificacionDe } from "@/lib/pagos/verificacion";
import { VerificarCobro } from "./VerificarCobro";
import { llave } from "@/lib/llaves-proveedores";

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
  // 28 nov (LAUNCH 9q) · La verificación del depósito de una renta ya hecha y el banco pide ahora el cobro de la renta: el enlace del primer aviso lleva a la que espera.
  if (v.estado === "verificada" && v.siguiente) redirect(`/pago/verificar?pi=${encodeURIComponent(v.siguiente)}`);
  // key: otra verificación (la siguiente de la misma renta) es otra hoja, sin lo que quedó de la anterior.
  return <VerificarCobro key={v.pi} es={lang === "es"} v={v} estado={v.estado} negocio={v.negocio} rentaNum={v.rentaNum} modo={modo} pk={await llave("STRIPE_PUBLISHABLE_KEY")} />;
}
