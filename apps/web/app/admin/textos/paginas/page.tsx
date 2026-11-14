import { requerir } from "@/lib/admin";
import { pieEnTodas } from "@/lib/cms-home";
import { idioma } from "@/lib/idioma";
import { diferencias, esClaveLegal, paginasAdmin, versionesAdmin } from "@/lib/legal";
import { TextosPaginas } from "../../TextosPaginas";

/* 9e · Super Admin › Textos y páginas › Páginas (fase9-apertura.md §4 9e): las páginas legales de docs/legal/ indexadas, con sus versiones,
   diferencias, estado, quién revisó, publicar con motivo (y pedir aceptar otra vez), retirar; aceptaciones por versión, solo cifras. Ver:
   cms:ver · marcar la revisión del abogado: cms:editar · publicar y retirar: cms:aprobar. El texto se corrige en el repo. */
const JUR = /^us(-[a-z]{2})?$/, ID = /^\d{1,18}$/;
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("cms", "ver");
  const [sp, adm] = await Promise.all([searchParams, idioma()]);
  const k = sp.k && esClaveLegal(sp.k) ? sp.k : null, j = sp.j && JUR.test(sp.j) ? sp.j : "us";
  const [d, det, pie] = await Promise.all([paginasAdmin(), k ? versionesAdmin(k, j) : Promise.resolve(null), pieEnTodas()]);
  const lang = sp.l === "en" ? "en" : "es";
  const dif = det && sp.dif && ID.test(sp.dif) && sp.con && ID.test(sp.con) ? await diferencias(sp.con, sp.dif, lang) : null;
  return <TextosPaginas d={d} adm={adm} pie={pie} k={k} j={j} det={det} dif={dif ? { a: sp.con!, b: sp.dif!, lang, r: dif } : null}
    editar={s.puede("cms", "editar")} aprobar={s.puede("cms", "aprobar")} />;
}
