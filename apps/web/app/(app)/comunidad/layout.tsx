import type { Metadata } from "next";

/* Comunidad: lo de los vecinos nunca sale en buscadores (noindex en todo /comunidad; §6 #13). */
export const metadata: Metadata = { title: "Comunidad · To'Latino", robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
