import type { Metadata } from "next";
import { CompuertaApp } from "@/app/_cascara/Compuerta";
import { MomentoAvisos } from "@/app/_cascara/HojaPermiso";
import { idioma } from "@/lib/idioma";

export const metadata: Metadata = { title: "Panel · To'Latino", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/* El panel del negocio tiene su propio marco (sin el encabezado del sitio): barra del negocio en el teléfono, menú en
   escritorio. Cada página revisa la cuenta y la membresía en el servidor. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  // 8a · Dentro de To'Latino Negocios: «Actualiza la app», la pausa o el aviso suave (en la web, nada).
  const [aviso, lang] = await Promise.all([CompuertaApp(), idioma()]);
  // 8c · En Negocios, al abrir el panel: la hoja previa de los avisos (una vez por teléfono).
  return <>{aviso}{children}<MomentoAvisos es={lang === "es"} /></>;
}
