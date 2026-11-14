import { metadatos, PaginaLegal } from "../_legal/PaginaLegal";

export const dynamic = "force-dynamic";
/* 9e · /vivienda-justa — pública, sin sesión, ES y EN. El texto sale de docs/legal/us/vivienda-justa.{es,en}.md (y la adenda del estado); nunca de aquí. */
export const generateMetadata = metadatos("vivienda-justa");
export default function Page({ searchParams }: { searchParams: Promise<{ l?: string }> }) {
  return <PaginaLegal clave="vivienda-justa" searchParams={searchParams} />;
}
