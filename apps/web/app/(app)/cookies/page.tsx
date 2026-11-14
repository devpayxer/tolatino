import { metadatos, PaginaLegal } from "../_legal/PaginaLegal";

export const dynamic = "force-dynamic";
/* 9e · /cookies — pública, sin sesión, ES y EN. El texto sale de docs/legal/us/cookies.{es,en}.md (y la adenda del estado); nunca de aquí. */
export const generateMetadata = metadatos("cookies");
export default function Page({ searchParams }: { searchParams: Promise<{ l?: string }> }) {
  return <PaginaLegal clave="cookies" searchParams={searchParams} />;
}
