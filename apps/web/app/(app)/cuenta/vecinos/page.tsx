import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { enComunidad } from "@/lib/comunidad";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { bloqueadosYSilenciados, seguidores, siguiendo } from "@/lib/vecinos";
import { yoMarco } from "../yo";
import { Vecinos } from "./Vecinos";

export const metadata: Metadata = { title: "Vecinos · To'Latino", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/* Mi cuenta › Vecinos: Siguiendo (en cualquier ciudad, con su ciudad a la vista) · Seguidores · Bloqueados y silenciados (con
   Deshacer). ?l= la lista, ?c= el cursor. Quien no ha entrado a la Comunidad ve cómo entrar. */
export default async function Page({ searchParams }: { searchParams: Promise<{ l?: string; c?: string }> }) {
  const [u, lang, sp] = await Promise.all([yo(), idioma(), searchParams]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/vecinos")}`);
  const es = lang === "es", l = sp.l === "seguidores" ? "seguidores" : sp.l === "bloqueados" ? "bloqueados" : "siguiendo";
  const [e, me] = await Promise.all([enComunidad(u.id), yoMarco(u, es)]);
  if (!e.ok) return <Vecinos es={es} yo={me} l={l} d={null} menor={e.menor} pagina={false} />;
  const c = sp.c ? String(sp.c).slice(0, 80) : null;
  const d = l === "bloqueados" ? await bloqueadosYSilenciados(u.id, c, es) : await (l === "seguidores" ? seguidores : siguiendo)(u.id, c, es);
  return <Vecinos es={es} yo={me} l={l} d={d} menor={false} pagina={!!c} />;
}
