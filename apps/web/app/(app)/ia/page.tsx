import { metadatos, PaginaLegal } from "../_legal/PaginaLegal";

export const dynamic = "force-dynamic";
/* 9e · /ia — pública, sin sesión, ES y EN. El texto sale de docs/legal/us/ia.{es,en}.md (y la adenda del estado); nunca de aquí. */
export const generateMetadata = metadatos("ia");
export default function Page({ searchParams }: { searchParams: Promise<{ l?: string }> }) {
  return <PaginaLegal clave="ia" searchParams={searchParams} />;
}
