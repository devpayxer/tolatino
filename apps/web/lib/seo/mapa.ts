import "server-only";
import { audienciasDe, listaAyuda } from "../compa/ayuda-indice";
import { BASE_URL } from "../correo";
import { db } from "../db";
import { slugCat } from "../directorio";
import { ENTORNO } from "../entorno";
import { CLAVES_LEGALES } from "../legal";
import { rutaLegal } from "../legal-rutas";

/* 9h · El mapa del sitio (HERRAMIENTAS #24; LAUNCH «6b · Eventos en el sitemap» y «7a · Centro de ayuda público para buscadores»): SOLO en producción (el
   sandbox no se indexa nunca: robots.ts, guardián sandboxNoSeIndexa) y SIEMPRE calculado al pedirlo (el paquete se construye una vez para los dos
   entornos: nada se decide en el build). Lo público de las ciudades ABIERTAS: el Inicio, Negocios, Eventos, cada categoría con negocios, la página de cada
   negocio activo, cada evento que sale al público (evt_listable, con fechas por venir), los artículos del Centro de ayuda que ve quien entra sin sesión
   (los de negocio y equipo dicen noindex), las páginas legales y la landing. Escala: cada parte lleva hasta 45 000 direcciones; los negocios se reparten
   por una huella estable del id (sin OFFSET: el mismo negocio cae siempre en la misma parte). */
const POR_PARTE = 45_000;
export type Url = { loc: string; lastmod?: string; freq?: "daily" | "weekly" | "monthly"; prio?: number };

export const mapaActivo = () => ENTORNO === "produccion";

async function partesNegocios(): Promise<number> {
  const n = (await db().query<{ n: number }>(`select count(*)::int as n from businesses b join cities c on c.id = b.city_id where b.status = 'active' and c.status = 'on'`)).rows[0]?.n ?? 0;
  return Math.max(1, Math.ceil(n / POR_PARTE));
}

/* El índice: la parte 0 (lo general) y una parte por cada tanda de negocios. */
export async function partes(): Promise<number[]> {
  if (!mapaActivo()) return [];
  return [0, ...Array.from({ length: await partesNegocios() }, (_, i) => i + 1)];
}

export async function parte(n: number): Promise<Url[]> {
  if (!mapaActivo() || !Number.isInteger(n) || n < 0) return [];
  const B = BASE_URL();
  if (n === 0) {
    // El mapa del sitio es lo que ve quien entra SIN sesión (un buscador): nunca la ayuda de negocios ni la del equipo.
    const u = null as { id: string } | null;
    const [cats, evts, ayuda] = await Promise.all([
      db().query<{ short: string }>(
        `select k.short->>'es' as short from categories k where k.status = 'on'
            and exists (select 1 from businesses b join cities c on c.id = b.city_id where b.category_id = k.id and b.status = 'active' and c.status = 'on') order by k.sort`),
      db().query<{ slug: string; at: string }>(
        `select e.slug, to_char(max(e.updated_at) at time zone 'UTC', 'YYYY-MM-DD') as at from events e join event_dates d on d.event_id = e.id join cities c on c.id = d.city_id
          where d.listable and d.ends_at > now() and c.status = 'on' group by e.slug order by e.slug limit ${POR_PARTE}`),
      listaAyuda(await audienciasDe(u?.id ?? null), "es", null),
    ]);
    return [
      { loc: `${B}/`, freq: "daily", prio: 1 }, { loc: `${B}/negocios`, freq: "daily", prio: 0.9 }, { loc: `${B}/eventos`, freq: "daily", prio: 0.8 },
      { loc: `${B}/acceso`, freq: "weekly", prio: 0.6 }, { loc: `${B}/ayuda`, freq: "weekly", prio: 0.5 },
      ...cats.rows.map((c) => ({ loc: `${B}/c/${slugCat(c.short)}`, freq: "daily" as const, prio: 0.8 })),
      ...evts.rows.map((e) => ({ loc: `${B}/eventos/${encodeURIComponent(e.slug)}`, lastmod: e.at, freq: "daily" as const, prio: 0.7 })),
      ...ayuda.map((a) => ({ loc: `${B}/ayuda/${encodeURIComponent(a.slug)}`, freq: "monthly" as const, prio: 0.4 })),
      ...CLAVES_LEGALES.map((k) => ({ loc: `${B}${rutaLegal(k)}`, freq: "monthly" as const, prio: 0.3 })),
    ];
  }
  const total = await partesNegocios();
  if (n > total) return [];
  return (await db().query<{ id: string; at: string }>(
    `select b.id, to_char(b.updated_at at time zone 'UTC', 'YYYY-MM-DD') as at from businesses b join cities c on c.id = b.city_id
      where b.status = 'active' and c.status = 'on' and mod(abs(hashtext(b.id)), $1::int) = $2::int order by b.id`, [total, n - 1])).rows
    .map((b) => ({ loc: `${B}/n/${encodeURIComponent(b.id)}`, lastmod: b.at, freq: "weekly" as const, prio: 0.7 }));
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const urlset = (L: Url[]) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${L.map((u) =>
  `<url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}${u.freq ? `<changefreq>${u.freq}</changefreq>` : ""}${u.prio != null ? `<priority>${u.prio}</priority>` : ""}</url>`).join("\n")}\n</urlset>\n`;
export const indice = (ps: number[]) => `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ps.map((p) =>
  `<sitemap><loc>${esc(`${BASE_URL()}/mapa-del-sitio/${p}.xml`)}</loc></sitemap>`).join("\n")}\n</sitemapindex>\n`;
