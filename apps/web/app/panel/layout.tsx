import type { Metadata } from "next";

export const metadata: Metadata = { title: "Panel · To'Latino", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/* El panel del negocio tiene su propio marco (sin el encabezado del sitio): barra del negocio en el teléfono, menú en
   escritorio. Cada página revisa la cuenta y la membresía en el servidor. */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
