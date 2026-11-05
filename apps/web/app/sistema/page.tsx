import type { Metadata } from "next";
import { Catalogo } from "./Catalogo";

export const metadata: Metadata = { title: "Sistema de diseño · To'Latino", robots: { index: false } };

export default function Page() {
  return <Catalogo />;
}
