import { db } from "@/lib/db";
import type { Metadata } from "next";
import { BASE_URL } from "@/lib/correo";
import { notFound } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { textosT } from "@/lib/cms";
import { foto } from "@/lib/directorio";
import { diaFiesta } from "@/lib/fiestas-comun";
import { categoriaPorSlug, cifras, filtros, mosaicos, ORDENES, resultados, type Orden } from "@/lib/categoria";
import { armarTarjetas } from "@/lib/tarjetas";
import { ubicacion } from "@/lib/ubicacion";
import { PantallaPronto } from "../../PantallaPronto";
import { Categoria, type Vista } from "./Categoria";
import { after } from "next/server";
import { contexto, evento } from "@/lib/eventos";

export const dynamic = "force-dynamic";

type SP = { sub?: string; f?: string; orden?: string; p?: string };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, lang] = await Promise.all([params, idioma()]);
  const c = await categoriaPorSlug(slug);
  // 9h · SEO: canónico de la categoría.
  return c ? { title: `${c.page.title[lang]} · To'Latino`, alternates: { canonical: `${BASE_URL()}/c/${slug}` } } : { title: "To'Latino" };
}

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const [{ slug }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  const c = await categoriaPorSlug(slug);
  if (!c) notFound();
  const loc = await ubicacion(u);
  if (loc.c.status !== "on") return <PantallaPronto loc={loc} lang={lang} userId={u?.id ?? null} />;
  const CIUDAD = loc.ciudad, ciudad = loc.c;
  const ctx = await contexto();
  after(() => evento("ver_categoria", { ref: c.id, ciudad: loc.c.id, userId: u?.id ?? null, props: { filtros: String(sp.f ?? "").slice(0, 80) || null, sub: typeof sp.sub === "string" ? sp.sub.slice(0, 40) : null } }, ctx));
  const t = await textosT(lang), P = c.page, L = (b: { es: string; en: string }) => b[lang];

  // Lo que pide la URL, validado contra lo que la categoría ofrece de verdad.
  const fs = await filtros(c.id, lang);
  const validos = new Set(fs.map((f) => f.key));
  const reglas = mosaicos(P);
  // 4u · Fiestas: «Tu fecha» de la cuenta entra como el primer chip de «¿Está libre tu fecha?» (solo los libres ese día).
  const tuFecha = c.id === "NEG-FIESTA" && u ? (await db().query<{ day: string }>(
    `select p.day::text as day from user_event_plans p join cities ci on ci.id = p.city_id where p.user_id = $1 and p.day >= (now() at time zone ci.timezone)::date`, [u.id])).rows[0]?.day ?? null : null;
  if (tuFecha) reglas.set("tufecha", { dia: tuFecha });
  const sub = typeof sp.sub === "string" && reglas.has(sp.sub) ? sp.sub : null;
  const elegidos = [...new Set(String(sp.f ?? "").split(",").filter((k) => validos.has(k)))];
  const orden: Orden = (ORDENES as readonly string[]).includes(sp.orden ?? "") ? (sp.orden as Orden) : "rel";
  const pagina = Math.max(0, (parseInt(String(sp.p ?? "1"), 10) || 1) - 1);

  const [res, cf] = await Promise.all([
    resultados({ punto: loc, cat: c.id, sub: sub ? reglas.get(sub)! : null, filtros: elegidos, orden, pagina }),
    cifras(loc, c.id, P.stats_tag),
  ]);
  const tarjetas = await armarTarjetas(CIUDAD, res.items, lang, u?.id ?? null);
  // Semillas (negocios no reclamados que recomendó un vecino): al final de «También en {ciudad}», solo en la primera
  // página, sin filtros y con todas las subcategorías (Prototipo seedRows).
  const semillas = pagina === 0 && !elegidos.length && !sub ? (await db().query<{ id: string; name: string; address: string | null; phone: string | null }>(
    `select id::text, name, address, phone from seed_listings where city_id = $1 and category_id = $2 and status = 'shown' order by created_at desc limit 10`, [CIUDAD, c.id])).rows : [];
  const lugar = ciudad ? `${ciudad.name.toUpperCase()}, ${ciudad.state}` : "";
  const nombreCiudad = ciudad?.name ?? "";

  const tile = (x: { key: string; label: { es: string; en: string }; photo: string | null; flag: string | null }) => ({ key: x.key, label: L(x.label), photo: foto(x.photo, 200), flag: x.flag && /^[a-z]{2}$/.test(x.flag) ? x.flag : null });
  const nombreSub = (k: string | null) => {
    if (!k) return null;
    if (k === "tufecha" && tuFecha) return L({ es: `Tu fecha · ${diaFiesta(tuFecha, true)}`, en: `Your date · ${diaFiesta(tuFecha, false)}` });
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
      items: [...(i === 0 && r.all_first ? [{ key: "", label: t.all, photo: foto(r.all_photo, 200), flag: null }] : []),
        ...(r.key === "fecha" && tuFecha ? [{ key: "tufecha", label: L({ es: `Tu fecha · ${diaFiesta(tuFecha, true)}`, en: `Your date · ${diaFiesta(tuFecha, false)}` }), photo: null, flag: null }] : []), ...r.items.map(tile)],
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
      sinReclamar: t.seedUnclaimed, esTuyo: t.seedYours, reclamalo: t.seedClaim,
      cerrar: lang === "es" ? "Cerrar" : "Close", freeTitulo: t.freeTitle.replace("{c}", nombreCiudad), freeSub: t.freeSub, ddPh: t.ddPh, ddNone: t.ddNone,
    },
    tarjetas, semillas,
  };
  return <Categoria v={vista} />;
}
