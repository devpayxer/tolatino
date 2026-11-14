import type { Metadata } from "next";
import { BASE_URL } from "@/lib/correo";
import { idioma } from "@/lib/idioma";
import { FIJAS } from "@/lib/textos-fijas";
import { datosLanding } from "./datos";
import { Landing } from "./Landing";

export const dynamic = "force-dynamic";

/* 9h · /acceso: la landing de acceso anticipado por su ruta (siempre; en el sandbox se prueba aquí). Con el interruptor growth.landing encendido, «/» muestra
   lo mismo (producción en acceso anticipado, 9t, OK-1). ?l=es|en: el idioma del pie (como las páginas legales). */
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const [sp, l0] = await Promise.all([searchParams, idioma()]), l = sp.l === "en" || sp.l === "es" ? sp.l : l0;
  const t = FIJAS[l].landing;
  return { title: "To'Latino", description: t, alternates: { canonical: `${BASE_URL()}/acceso` },
    openGraph: { title: "To'Latino", description: t, type: "website", url: `${BASE_URL()}/acceso`, locale: l === "en" ? "en_US" : "es_US" } };
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [sp, l0] = await Promise.all([searchParams, idioma()]), l = sp.l === "en" || sp.l === "es" ? sp.l : l0;
  return <Landing d={await datosLanding(l)} />;
}
