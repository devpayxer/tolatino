import { metadatos, PaginaLegal } from "../_legal/PaginaLegal";

export const dynamic = "force-dynamic";
/* 9e · /reglas — pública, sin sesión, ES y EN. El texto sale de docs/legal/us/reglas.{es,en}.md (y la adenda del estado); nunca de aquí. */
export const generateMetadata = metadatos("reglas");
export default function Page({ searchParams }: { searchParams: Promise<{ l?: string }> }) {
  return <PaginaLegal clave="reglas" searchParams={searchParams} />;
}
