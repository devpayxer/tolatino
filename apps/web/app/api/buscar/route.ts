import { NextResponse, type NextRequest } from "next/server";
import { ejemplos, entender, negocios, resaltar, sugerirCatalogo, tendencias, tsq } from "@/lib/buscar";
import { platos, porQue } from "@/lib/buscar-platos";
import { categorias } from "@/lib/directorio";
import { idioma } from "@/lib/idioma";
import { yo } from "@/lib/cuenta";
import { ubicacion } from "@/lib/ubicacion";
import { db } from "@/lib/db";
import { textosT } from "@/lib/cms";
import { buscarEventos, type TarjetaEvt } from "@/lib/evt-publico";
import { armarTarjetas } from "@/lib/tarjetas";
import type { Tarjeta } from "@/lib/tarjeta";
import { filaPlato, textoRazon } from "@/app/(app)/buscar/platos";
import { dosIdiomas } from "@/lib/dos-idiomas";

/* Sugerencias mientras se escribe (APP-BUSCAR · sugerencias y el desplegable del encabezado en escritorio): solo lectura, no se registra.
   9t · Suma «Platos y servicios» (lib/buscar-platos.ts: lo que la ficha muestra) y «Eventos» (lo que sale al público), como el prototipo
   (sugVals). Con `drop=1` (el desplegable de escritorio) cada fila trae su vista previa (pvVals: la tarjeta del negocio, el plato con su
   precio, la subcategoría con sus negocios, el evento) y los conteos de «Enter» (negocios, platos y servicios, eventos: lo que dicen los
   vecinos no se lee mientras se escribe, guardián buscarVecinosConSesion; sale en la página de resultados con cuenta). Con `explorar=1`, lo que se ve antes de escribir
   (recientes en el teléfono; ejemplos, lo más buscado y las categorías del servidor). */
export const dynamic = "force-dynamic";

export type PvBuscar =
  | { k: "biz"; i: number }
  | { k: "item"; img: string | null; eb: string; t: string; d: string; price: string; st: string; open: boolean; biz2: string }
  | { k: "sub"; img: string | null; eb: string; t: string; n: string; names: string[] }
  | { k: "evt"; evt: TarjetaEvt };
export type FilaSug = { seccion: string; kind: "sub" | "cat" | "none" | "biz" | "item" | "evt"; parts: [string, string, string]; image: string | null; icon: string | null; meta: string; right: string | null; rightColor: string | null; href: string; pv?: PvBuscar };
export type SugBuscar = {
  filas: FilaSug[]; total: number; parcial?: boolean; intenciones: string[];
  conteos?: { biz: number; items: number; evts: number }; tarjetas?: Tarjeta[]; textos?: { hoy: string; llamar: string };
};
/* 9t-2 · `voz`: el micrófono del desplegable (lo que la persona contestó al aviso o eligió en Privacidad, users.voice_search; null = sale el
   aviso; false = no hay micrófono) y sus textos del CMS (WEB-BUSCAR, los mismos de la página de Buscar). */
export type VozBuscar = { on: boolean | null; sesion: boolean; t: string; sub: string; no: string; cancel: string };
export type ExplorarBuscar = { ejemplos: { t: string; chips: { l: string; tone: string }[] }[]; tendencias: { q: string; cat: string | null }[]; cats: { slug: string; l: string; icon: string }[]; voz?: VozBuscar };
const vacio: SugBuscar = { filas: [], intenciones: [], total: 0 };
const H = { headers: { "Cache-Control": "no-store" } };

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const catParam = req.nextUrl.searchParams.get("cat");
  const drop = req.nextUrl.searchParams.get("drop") === "1";
  const [lang, u] = await Promise.all([idioma(), yo()]);
  const loc = await ubicacion(u);
  const es = lang === "es", L = (a: string, b: string) => dosIdiomas(es, a, b);
  if (req.nextUrl.searchParams.get("explorar") === "1") {
    const vozP = Promise.all([u ? db().query<{ v: boolean | null }>(`select voice_search as v from users where id = $1`, [u.id]).then((x) => x.rows[0]?.v ?? null) : null, textosT(lang)])
      .then(([on, TX]): VozBuscar => ({ on, sesion: !!u, t: TX.buscar.voz, sub: TX.buscar.vozSub, no: TX.buscar.vozNo, cancel: TX.buscar.cancel }));
    if (loc.c.status !== "on") return NextResponse.json({ ejemplos: [], tendencias: [], cats: [], voz: await vozP } satisfies ExplorarBuscar, H);
    const [cats, trend, exs, voz] = await Promise.all([
      categorias(lang, loc.ciudad), tendencias(loc.ciudad, lang),
      Promise.all(ejemplos.map(async (x) => {
        const t = es ? x.es : x.en, E = await entender(t);
        return { t, chips: [...E.grupos.map((g) => ({ l: (resaltar(t, [{ w: g.w, a: [g.w] }])[1] || g.w).toUpperCase(), tone: "neutral" })), ...E.intenciones.map((i) => ({ l: (es ? i.label.es : i.label.en).toUpperCase(), tone: "signal" }))] };
      })),
      vozP,
    ]);
    return NextResponse.json({ ejemplos: exs, tendencias: trend.slice(0, 6), cats: cats.map((c) => ({ slug: c.slug, l: c.label, icon: c.icon })), voz } satisfies ExplorarBuscar, H);
  }
  if (loc.c.status !== "on" || !q.trim()) return NextResponse.json(vacio, H);
  const CIUDAD = loc.ciudad;
  const cats = await categorias(lang, CIUDAD); // 9n · sin las apagadas en la ciudad
  const cat = cats.find((c) => c.slug === catParam)?.id ?? null;
  const E = await entender(q, true);
  const G = E.grupos;
  const [r, C, P, EV] = await Promise.all([
    negocios(E, { punto: loc, cat, limite: 4, vivo: true }), sugerirCatalogo(E, CIUDAD, cat),
    platos(E, { punto: loc, cat, limite: 3, vivo: true, userId: u?.id ?? null }),
    G.length && !cat ? buscarEventos(tsq(G, true, true), loc, "all", u?.id ?? null, es, 2) : Promise.resolve({ items: [] as TarjetaEvt[], total: 0 }),
  ]);
  const catSlug = (id: string) => cats.find((c) => c.id === id)?.slug ?? "";
  const filas: FilaSug[] = [];
  const subs = C.subs.slice(0, 3);
  // 9t-2 · La razón de cada negocio (una consulta, a la par de la de las subcategorías).
  const RZp = porQue(E, { punto: loc, ids: r.items.map((b) => b.id), userId: u?.id ?? null, vivo: true });
  // La vista previa de una subcategoría nombra sus negocios (Pro primero, luego los mejor calificados), en la ciudad que se ve.
  const nombres = drop && subs.length ? new Map((await db().query<{ sub: string; names: string[] }>(
    `select s.sub, coalesce((select array_agg(z.name) from (select b.name from businesses b join business_stats_cache st on st.business_id = b.id
        where b.city_id = $1 and b.status = 'active' and s.sub = any(b.subcategory_ids) order by st.plan = 'pro' desc, st.rating_avg desc nulls last, b.id limit 3) z), '{}') as names
       from unnest($2::text[]) s(sub)`, [CIUDAD, subs.map((s) => s.id)])).rows.map((x) => [x.sub, x.names])) : null;
  for (const s of subs) {
    const n = `${s.n} ${s.n === 1 ? L(`negocio en ${loc.c.name}`, `business in ${loc.c.name}`) : L(`negocios en ${loc.c.name}`, `businesses in ${loc.c.name}`)}`;
    filas.push({ seccion: L("CATEGORÍAS", "CATEGORIES"), kind: "sub", parts: resaltar(es ? s.es : s.en, G), image: s.foto, icon: s.icon, meta: `${(es ? s.catEs : s.catEn).toUpperCase()} · ${s.n} ${s.n === 1 ? L("NEGOCIO", "BUSINESS") : L("NEGOCIOS", "BUSINESSES")}`, right: null, rightColor: null, href: `/buscar?q=${encodeURIComponent(es ? s.es : s.en)}&cat=${catSlug(s.cat)}`,
      pv: nombres ? { k: "sub", img: s.foto, eb: (es ? s.catEs : s.catEn).toUpperCase(), t: es ? s.es : s.en, n, names: nombres.get(s.id) ?? [] } : undefined });
  }
  for (const c of C.cats.slice(0, 1)) filas.push({ seccion: L("CATEGORÍAS", "CATEGORIES"), kind: "cat", parts: resaltar(es ? c.catEs : c.catEn, G), image: null, icon: c.icon, meta: L("CATEGORÍA", "CATEGORY"), right: null, rightColor: null, href: `/c/${catSlug(c.cat)}` });
  if (!C.subs.length) for (const s of C.vacias.slice(0, 1)) filas.push({ seccion: L("CATEGORÍAS", "CATEGORIES"), kind: "none", parts: resaltar(es ? s.es : s.en, G), image: null, icon: s.icon, meta: L(`AÚN NO HAY EN ${loc.c.name.toUpperCase()}`, `NONE IN ${loc.c.name.toUpperCase()} YET`), right: null, rightColor: null, href: `/buscar?q=${encodeURIComponent(q)}` });
  // 9t-2 · La razón del negocio que encajó por lo que vende va en su línea (prototipo sugVals: «TIENE MOFONGO DE CHICHARRÓN · 0.3 MI»).
  const RZ = await RZp;
  const razon = new Map(r.items.map((b) => [b.id, textoRazon(b.name, RZ.get(b.id), E, es, { sinPrecio: true, vivo: true })]));
  const razonCard = new Map(r.items.map((b) => [b.id, textoRazon(b.name, RZ.get(b.id), E, es, { vivo: true })]));
  r.items.forEach((b, i) => filas.push({ seccion: L("NEGOCIOS", "BUSINESSES"), kind: "biz", parts: resaltar(b.name, G), image: b.photo, icon: null, meta: [razon.get(b.id), b.mi != null ? `${b.mi} MI` : ""].filter(Boolean).join(" · ").toUpperCase(), right: b.open ? L("Abierto", "Open") : L("Cerrado", "Closed"), rightColor: b.open ? "var(--tl-open-text)" : "var(--tl-danger)", href: `/n/${b.id}`, pv: drop ? { k: "biz", i } : undefined }));
  for (const x of P.items) {
    const f = filaPlato(x, E, es);
    filas.push({ seccion: L("PLATOS Y SERVICIOS", "DISHES & SERVICES"), kind: "item", parts: f.parts, image: f.img, icon: f.img ? null : x.plato ? "restaurant" : "calendar", meta: `${f.bname}${f.dist ? ` · ${f.dist}` : ""}`.toUpperCase(), right: f.precio, rightColor: "var(--tl-ink)", href: f.href,
      pv: drop ? { k: "item", img: f.img, eb: f.sec.toUpperCase(), t: f.nombre, d: f.desc, price: f.precio, st: f.abierto ? L("Abierto", "Open") : L("Cerrado", "Closed"), open: f.abierto, biz2: `${f.bname}${f.dist ? ` · ${f.dist.toLowerCase()}` : ""}` } : undefined });
  }
  for (const e of EV.items) filas.push({ seccion: L("EVENTOS", "EVENTS"), kind: "evt", parts: resaltar(e.title, G), image: e.img, icon: e.img ? null : "ticket", meta: `${e.cuando}${e.venue ? ` · ${e.venue}` : ""}`.toUpperCase(), right: null, rightColor: null, href: e.href, pv: drop ? { k: "evt", evt: e } : undefined });
  const out: SugBuscar = { filas, total: r.total, parcial: r.parcial, intenciones: E.intenciones.map((i) => (es ? i.label.es : i.label.en).toUpperCase()),
    conteos: { biz: r.total, items: P.total, evts: EV.total } };
  if (drop) {
    const [tarjetas, TX] = await Promise.all([armarTarjetas(CIUDAD, r.items, lang, u?.id ?? null), textosT(lang)]);
    // La vista previa del negocio lleva la misma razón como primer chip (como la tarjeta de los resultados).
    out.tarjetas = tarjetas.map((t) => { const w = razonCard.get(t.id); return w ? { ...t, chips: [{ variant: "verified", label: w }, ...t.chips].slice(0, 3) } : t; });
    out.textos = { hoy: TX.todayTag, llamar: TX.call };
  }
  return NextResponse.json(out, H);
}
