import { metadatos, PaginaLegal } from "../_legal/PaginaLegal";

export const dynamic = "force-dynamic";
/* 9e · /terminos — pública, sin sesión, ES y EN. El texto sale de docs/legal/us/terminos.{es,en}.md (y la adenda del estado); nunca de aquí. */
export const generateMetadata = metadatos("terminos");
export default function Page({ searchParams }: { searchParams: Promise<{ l?: string }> }) {
  return <PaginaLegal clave="terminos" searchParams={searchParams} />;
}
