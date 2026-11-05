import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { idioma } from "@/lib/idioma";
import { T } from "@/lib/textos";
import { foto } from "@/lib/directorio";
import { categoriaPorSlug, cifras, filtros, mosaicos, ORDENES, resultados, type Orden } from "@/lib/categoria";
import { armarTarjetas } from "@/lib/tarjetas";
import { Categoria, type Vista } from "./Categoria";

export const dynamic = "force-dynamic";
const CIUDAD = "hzl"; // el selector de ciudad llega en el bloque 1f; hoy todo es Hazleton (como el prototipo)

type SP = { sub?: string; f?: string; orden?: string; p?: string };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, lang] = await Promise.all([params, idioma()]);
  const c = await categoriaPorSlug(slug);
  return { title: c ? `${c.page.title[lang]} · To'Latino` : "To'Latino" };
}

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const [{ slug }, sp, lang] = await Promise.all([params, searchParams, idioma()]);
  const c = await categoriaPorSlug(slug);
  if (!c) notFound();
  const t = T[lang], P = c.page, L = (b: { es: string; en: string }) => b[lang];

  // Lo que pide la URL, validado contra lo que la categoría ofrece de verdad.
  const fs = await filtros(c.id, lang);
  const validos = new Set(fs.map((f) => f.key));
  const reglas = mosaicos(P);
  const sub = typeof sp.sub === "string" && reglas.has(sp.sub) ? sp.sub : null;
  const elegidos = [...new Set(String(sp.f ?? "").split(",").filter((k) => validos.has(k)))];
  const orden: Orden = (ORDENES as readonly string[]).includes(sp.orden ?? "") ? (sp.orden as Orden) : "rel";
  const pagina = Math.max(0, (parseInt(String(sp.p ?? "1"), 10) || 1) - 1);

  const [res, cf, ciudad, u] = await Promise.all([
    resultados({ ciudad: CIUDAD, cat: c.id, sub: sub ? reglas.get(sub)! : null, filtros: elegidos, orden, pagina }),
    cifras(CIUDAD, c.id, P.stats_tag),
    db().query<{ name: string; state: string }>("select name, state from cities where id = $1", [CIUDAD]).then((r) => r.rows[0]),
    yo(),
  ]);
  const tarjetas = await armarTarjetas(CIUDAD, res.items, lang, u?.id ?? null);
  const lugar = ciudad ? `${ciudad.name.toUpperCase()}, ${ciudad.state}` : "";
  const nombreCiudad = ciudad?.name ?? "";

  const tile = (x: { key: string; label: { es: string; en: string }; photo: string | null; flag: string | null }) => ({ key: x.key, label: L(x.label), photo: foto(x.photo, 200), flag: x.flag });
  const nombreSub = (k: string | null) => {
    if (!k) return null;
    for (const r of P.rows) for (const x of [...r.items, ...r.more]) if (x.key === k) return L(x.label);
    for (const g of P.chapters) for (const x of g.items) if (x.key === k) return L(x.label);
    return k;
  };
  const filtroLabel = new Map(fs.map((f) => [f.key, f.label]));
  const grupos: { key: string; title: string; options: { key: string; label: string }[] }[] = [];
  for (const f of fs) {
    let g = grupos.find((x) => x.key === f.group);
    if (!g) grupos.push((g = { key: f.group, title: f.groupLabel, options: [] }));
    g.options.push({ key: f.key, label: f.label });
  }
  const n = res.total;
  const vista: Vista = {
    slug, cat: c.id, ciudad: CIUDAD, lang,
    titulo: L(P.title), hero: foto(P.hero, 650), buscador: L(P.search_ph),
    cifrasCorta: `${cf.total} ${t.statsBiz} · ${cf.abiertos} ${t.statsOpen}`,
    cifrasLarga: `${cf.total} ${t.statsBiz} · ${cf.abiertos} ${t.statsOpen} · ${cf.con} ${L(P.stats_label)} · ${lugar}`,
    banda: P.band && P.band.sub_key ? { titulo: L(P.band.title), sub: L(P.band.sub), cta: L(P.band.cta), key: P.band.sub_key } : null,
    filas: P.rows.map((r, i) => ({
      key: r.key, titulo: L(r.title), tipo: r.kind,
      items: [...(i === 0 && r.all_first ? [{ key: "", label: t.all, photo: foto(r.all_photo, 200), flag: null }] : []), ...r.items.map(tile)],
      mas: r.more.map(tile), masLabel: r.more.length ? `${r.more_label ? L(r.more_label) : t.seeAllN} · ${r.more.length}` : null,
    })),
    antojo: L(P.craving),
    capitulos: P.chapters.map((g) => ({ key: g.key, titulo: L(g.title).toUpperCase(), items: g.items.map(tile) })),
    rapidos: P.quick5.filter((q) => validos.has(q.key)).map((q) => ({ key: q.key, icon: q.icon, label: filtroLabel.get(q.key) ?? q.key })),
    grupos: [{ key: "orden", title: t.sortGroup, options: ORDENES.map((o) => ({ key: o, label: t.sorts[o] })) }, ...grupos],
    sub, filtros: elegidos, orden, pagina: res.pagina, paginas: res.paginas, total: n,
    textos: {
      resultados: `${n} ${n === 1 ? t.result : t.results}`, orden: t.sorts[orden], ordenLargo: t.sortBy + t.sorts[orden],
      filtros: t.filters + (elegidos.length ? ` · ${elegidos.length}` : ""), filtrosTitulo: t.filters, limpiar: t.clear,
      verN: t.seeN.replace("{n}", String(n)), pagina: t.page.replace("{p}", String(res.pagina + 1)).replace("{n}", String(res.paginas)),
      anterior: t.prev, siguiente: t.next, buscar: t.searchBtn, mapa: t.mapBtn, volver: t.allCatsTitle, llamar: t.call, hoy: t.todayTag,
      vacioLabel: t.emptyLabel, vacioBody: t.emptyBody, invitar: t.invite, avisame: t.notify, avisado: t.notified,
      vacioTitulo: elegidos.length ? t.emptyFilters : t.emptyNone.replace("{x}", (nombreSub(sub) ?? L(P.title)).toLowerCase()).replace("{c}", nombreCiudad),
      cerrar: lang === "es" ? "Cerrar" : "Close", freeTitulo: t.freeTitle.replace("{c}", nombreCiudad), freeSub: t.freeSub, ddPh: t.ddPh, ddNone: t.ddNone,
    },
    tarjetas,
  };
  return <Categoria v={vista} />;
}
