import type { Metadata } from "next";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { categorias } from "@/lib/directorio";
import { nombresSub } from "@/lib/categoria";
import { armarTarjetas } from "@/lib/tarjetas";
import { dominante, ejemplos, entender, negocios, N, registrar, resaltar, sugerirCatalogo, tendencias, tsq, type Entendido } from "@/lib/buscar";
import { buscarVecinos } from "@/lib/comunidad-portada";
import { filaVecino } from "./vecinos";
import { Buscar, type VistaBuscar } from "./Buscar";
import DATOS from "@/lib/busqueda-datos.json";
import { ubicacion } from "@/lib/ubicacion";
import { PantallaPronto } from "../PantallaPronto";
import { buscarEventos } from "@/lib/evt-publico";
import { contexto, evento } from "@/lib/eventos";
import { after } from "next/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Buscar · To'Latino" };
const FILTRABLES = new Set(["open", "near", "ver", "dlv", "pk", "walk", "casa", "h24", "esp", "medicaid", "medicare", "chip", "sinseg", "sinssn", "free"]);
// Filtros rápidos según la categoría dominante (prototipo QK).
const RAPIDOS: Record<string, string[]> = { "NEG-FOOD": ["dlv", "pk"], "NEG-BELL": ["walk", "casa"], "NEG-SALUD": ["medicaid", "medicare", "sinseg", "esp"], "NEG-HOGAR": ["h24", "casa"], "NEG-AUTO": ["walk", "h24"], "NEG-NOCHE": ["free"], "NEG-PRO": ["esp"], "NEG-INMUEBLE": ["sinssn"], "NEG-MERC": ["dlv", "pk"] };

type SP = { q?: string; cat?: string; f?: string; orden?: string; p?: string; tab?: string; vc?: string; ef?: string };

/* Quita una frase de la búsqueda («barbería abierta ahora» − «abierta ahora»): así se quita una intención. */
function sinFrase(q: string, frase: string) {
  const n = N(q), re = new RegExp(`(^|[^a-z0-9])${frase.replace(/[^a-z0-9 ]/g, ".").replace(/ /g, "[^a-z0-9]+")}(?=$|[^a-z0-9])`);
  const m = re.exec(n);
  if (!m) return q;
  const i = m.index + m[1]!.length;
  return (q.slice(0, i) + q.slice(i + m[0].length - m[1]!.length)).replace(/\s+/g, " ").trim();
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, lang, u] = await Promise.all([searchParams, idioma(), yo()]);
  const es = lang === "es", L = (a: string, b: string) => (es ? a : b);
  const loc = await ubicacion(u);
  if (loc.c.status !== "on") return <PantallaPronto loc={loc} lang={lang} userId={u?.id ?? null} />;
  const CIUDAD = loc.ciudad;
  const cats = await categorias(lang);
  const nomCiudad = loc.c.name;
  const q = String(sp.q ?? "").slice(0, 120).trim();
  const catSel = cats.find((c) => c.slug === sp.cat) ?? null;
  const extra = String(sp.f ?? "").split(",").filter((k) => FILTRABLES.has(k));
  const orden = (["rel", "near", "best"] as const).find((o) => o === sp.orden);
  const pagina = Math.max(0, (parseInt(String(sp.p ?? "1"), 10) || 1) - 1);
  // 5e · «Vecinos» (lo que dicen los vecinos en la Comunidad) solo con cuenta: sin sesión la pestaña no existe y no se lee nada.
  const tab = sp.tab === "biz" ? "biz" : sp.tab === "vec" && u ? "vec" : sp.tab === "evt" ? "evt" : "all";
  // 6b · Eventos (prototipo Buscar EVF): Todos · Hoy · Este fin de semana · Gratis.
  const ef = (["all", "d0", "wk", "free"] as const).find((x) => x === sp.ef) ?? "all";
  const base: Omit<VistaBuscar, "res"> = {
    lang, q, cat: catSel ? { slug: catSel.slug, label: catSel.label, name: catSel.name } : null, ciudad: nomCiudad,
    explorar: null, conSesion: !!u,
  };

  // ── Explorar (sin búsqueda): ejemplos con lo que entendemos, lo más buscado de verdad, categorías. ──
  if (!q && !catSel) {
    const [trend, exs] = await Promise.all([
      tendencias(CIUDAD, lang),
      Promise.all(ejemplos.map(async (x) => {
        const t = es ? x.es : x.en, E = await entender(t);
        return { t, chips: [...E.grupos.map((g) => ({ l: (resaltar(t, [{ w: g.w, a: [g.w] }])[1] || g.w).toUpperCase(), tone: "neutral" })), ...E.intenciones.map((i) => ({ l: (es ? i.label.es : i.label.en).toUpperCase(), tone: "signal" }))] };
      })),
    ]);
    return <Buscar v={{ ...base, explorar: { ejemplos: exs, tendencias: trend, cats: cats.map((c) => ({ slug: c.slug, l: c.label, full: c.name, icon: c.icon })), subs: [] }, res: null }} />;
  }

  // ── Resultados ──
  const E: Entendido = await entender(q);
  for (const k of extra) if (!E.intenciones.some((i) => i.k === k)) {
    const it = DATOS.intenciones.find((i) => i.key === k);
    if (it) E.intenciones.push({ k, frase: "", label: it.label, tipo: it.tipo });
  }
  const limite = tab === "biz" ? 10 : 5;
  const [r, C, V, EV] = await Promise.all([
    negocios(E, { punto: loc, cat: catSel?.id ?? null, orden, pagina: tab === "biz" ? pagina : 0, limite }),
    sugerirCatalogo(E, CIUDAD, catSel?.id ?? null),
    u && E.grupos.length && !catSel ? buscarVecinos(u.id, CIUDAD, tsq(E.grupos, true), tab === "vec" ? String(sp.vc ?? "") || null : null, tab === "vec" ? 10 : 2) : null,
    E.grupos.length && !catSel ? buscarEventos(tsq(E.grupos, true), loc, tab === "evt" ? ef : "all", u?.id ?? null, es, tab === "evt" ? 40 : 4) : null,
  ]);
  const vaciaPrimero = !!C.vacias[0] && (!C.subs[0] || C.vacias[0].score > C.subs[0].score);
  const dom = catSel?.id ?? dominante(r.items, C.subs, C.vacias, C.cats, vaciaPrimero);
  const nada = r.total === 0;
  const dym = nada && E.grupos.some((g) => g.corregida) ? E.palabras.map((w) => E.grupos.find((g) => g.w === w)?.corregida ?? w).join(" ") : null;
  if (q && pagina === 0 && tab === "all") {
    await registrar(CIUDAD, u?.id ?? null, q, E, dom, r.total);
    const ctx = await contexto();
    after(() => evento("buscar", { ciudad: CIUDAD, userId: u?.id ?? null, props: { resultados: r.total, cat: dom } }, ctx));
  }

  const [tarjetas, nom] = await Promise.all([
    armarTarjetas(CIUDAD, r.items, lang, u?.id ?? null),
    nombresSub([...new Set(r.items.flatMap((x) => x.subs.slice(0, 1)))], lang),
  ]);
  const catDe = (id: string) => cats.find((c) => c.id === id);
  const s0 = C.subs[0], c0 = C.cats[0];
  const tileHref = (subNombre: string, catId: string) => `/buscar?q=${encodeURIComponent(subNombre)}&cat=${catDe(catId)?.slug ?? ""}`;
  const top = E.grupos.length && s0
    ? { img: s0.foto ?? r.items.find((x) => x.subs.includes(s0.id))?.photo ?? r.items[0]?.photo ?? null, eb: `${L("CATEGORÍA · ", "CATEGORY · ")}${(es ? s0.catEs : s0.catEn).toUpperCase()}`, t: es ? s0.es : s0.en, meta: `${s0.n} ${s0.n === 1 ? L(`negocio en ${nomCiudad}`, `business in ${nomCiudad}`) : L(`negocios en ${nomCiudad}`, `businesses in ${nomCiudad}`)}`, href: tileHref(es ? s0.es : s0.en, s0.cat) }
    : c0 ? { img: r.items.find((x) => x.cat === c0.cat)?.photo ?? null, eb: L("CATEGORÍA", "CATEGORY"), t: es ? c0.catEs : c0.catEn, meta: "", href: `/c/${catDe(c0.cat)?.slug ?? ""}` } : null;
  const v0 = C.vacias[0];
  const intenciones = E.intenciones.map((i) => {
    const sinEsta = i.frase ? sinFrase(q, i.frase) : q;
    const resto = extra.filter((k) => k !== i.k);
    const qs = new URLSearchParams();
    if (sinEsta) qs.set("q", sinEsta);
    if (catSel) qs.set("cat", catSel.slug);
    if (resto.length) qs.set("f", resto.join(","));
    return { k: i.k, label: es ? i.label.es : i.label.en, quitar: `/buscar?${qs}` };
  });
  const rapidos = ["open", "near", "ver", ...(dom ? RAPIDOS[dom] ?? [] : [])].map((k) => {
    const it = DATOS.intenciones.find((i) => i.key === k)!;
    const on = E.intenciones.some((i) => i.k === k);
    return { k, l: es ? it.label.es : it.label.en, on, href: on ? intenciones.find((i) => i.k === k)?.quitar ?? "/buscar" : (() => { const qs = new URLSearchParams(); if (q) qs.set("q", q); if (catSel) qs.set("cat", catSel.slug); qs.set("f", [...extra, k].join(",")); return `/buscar?${qs}`; })() };
  });
  const filas = r.items.slice(0, 5).map((b) => ({
    id: b.id, pro: b.pro, parts: resaltar(b.name, E.grupos), image: b.photo,
    meta: `${(nom.get(b.subs[0] ?? "") ?? "").toUpperCase()}${b.mi != null ? ` · ${b.mi} MI` : ""}`,
    status: b.open ? L("Abierto", "Open") : L("Cerrado", "Closed"), statusColor: b.open ? "var(--tl-open-text)" : "var(--tl-danger)",
  }));

  return (
    <Buscar v={{
      ...base,
      res: {
        tab, total: r.total, parcial: r.parcial, nada, pagina, paginas: Math.max(1, Math.ceil(r.total / 10)), orden: orden ?? "rel",
        titulo: E.grupos.length ? `«${q}»` : intenciones.map((i) => i.label).join(" · ") || catSel?.name || q,
        eb: `${L("BÚSQUEDA · ", "SEARCH · ")}${nomCiudad.toUpperCase()}${catSel ? ` · ${catSel.label.toUpperCase()}` : ""}`,
        palabras: E.grupos.map((g) => resaltar(q, [{ w: g.w, a: [g.w] }])[1] || g.w), mostrarEntendido: intenciones.length > 0 || E.grupos.some((g) => g.a.length > 1),
        intenciones, rapidos,
        top, notYet: v0 && !nada ? { t: L(`${v0.es} en ${nomCiudad}`, `${v0.en} in ${nomCiudad}`), primero: vaciaPrimero } : null,
        nadaT: v0 ? L(`Aún no hay ${v0.es} en ${nomCiudad}`, `No ${v0.en} in ${nomCiudad} yet`) : L(`No encontramos «${q}» en ${nomCiudad}`, `We found nothing for “${q}” in ${nomCiudad}`),
        dym, tarjetas, filas,
        subsLado: C.subs.slice(0, 6).map((s) => ({ l: es ? s.es : s.en, m: `${(es ? s.catCorto : s.catCortoEn).toUpperCase()} · ${s.n}`, href: tileHref(es ? s.es : s.en, s.cat) })),
        probar: cats.slice(0, 8).map((c) => ({ l: c.label, slug: c.slug })),
        catDominante: dom,
        vecinos: V ? { total: V.total, mas: V.mas, items: V.items.map((x) => filaVecino(x, E, es)) } : null,
        eventos: EV && EV.total ? { total: EV.total, f: ef, items: EV.items } : null,
      },
    }} />
  );
}
