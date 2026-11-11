import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { leerEnlace } from "@/lib/compa/enlace";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { EnlaceCompa } from "./EnlaceCompa";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "El Compa · To'Latino", robots: { index: false, follow: false }, referrer: "no-referrer" };

/* 7h · El enlace de un uso de WhatsApp y SMS (fase7-compa.md §1b #6: la hoja 2as con la acción ya preparada, «Así queda» y la barra de
   confirmar). Abrir el enlace NUNCA entra a nadie: sin sesión va a Entrar (el código de siempre) y vuelve aquí; abrirlo no lo gasta (los
   robots de vista previa no ven ni gastan nada). Con sesión, solo LA cuenta del enlace ve la acción; otra cuenta ve «es de otra cuenta», sin
   datos. Usado o vencido: lo dice, sin datos. Confirmar o dejarla es otra petición (acciones.ts), una sola vez. */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = /^[A-Za-z0-9_-]{32}$/.test(String(token ?? "")) ? token : "";
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(`/compa/e/${t}`)}`);
  const e = t ? await leerEnlace(u.id, t) : ({ k: "no" } as const);
  return <EnlaceCompa es={lang === "es"} token={t} nombre={u.first_name} e={e} />;
}
