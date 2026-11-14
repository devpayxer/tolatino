import { metadatos, PaginaLegal } from "../_legal/PaginaLegal";

export const dynamic = "force-dynamic";
/* 9e · /votos — pública, sin sesión, ES y EN. El texto sale de docs/legal/us/votos.{es,en}.md (y la adenda del estado); nunca de aquí. */
export const generateMetadata = metadatos("votos");
export default function Page({ searchParams }: { searchParams: Promise<{ l?: string }> }) {
  return <PaginaLegal clave="votos" searchParams={searchParams} />;
}
