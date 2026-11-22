import "server-only";
import { cacheConAviso } from "./cache-aviso";
import { db } from "./db";
import type { Lang } from "./idioma";

/* 9f · El Inicio de cada ciudad (fase9-apertura.md §2 «0136», §4 9f): lo que el Super Admin › Textos y páginas › Home por ciudad deja en
   city_home_config (un aviso fijo bajo el lugar y los bloques encendidos y su orden) y los anuncios vivos de la ciudad (announcements: el banner con
   fechas). Sin fila = todo encendido, en el orden de fábrica: nada se ve distinto hasta que alguien lo cambia. Si la base no responde, el Inicio sale
   completo (nunca se corta por esto). Copia de 15 s por ciudad que la base vacía por NOTIFY (canal tl_config). */
export const BLOQUES = ["categorias", "hoy", "abierto", "semana", "comunidad", "publica"] as const;
export type BloqueHome = (typeof BLOQUES)[number];
export type Par = { es: string; en: string };
export type HomeCfg = { aviso: Par | null; bloques: { key: BloqueHome; on: boolean }[] };
export type Anuncio = { id: string; text: string };

/* La lista completa y en orden: lo que dice la fila, más lo que falte (encendido) en su lugar de fábrica; lo desconocido se ignora. */
export function normalizarBloques(guardado: unknown): { key: BloqueHome; on: boolean }[] {
  const lista = Array.isArray(guardado) ? guardado : [];
  const vistos = new Set<string>(), out: { key: BloqueHome; on: boolean }[] = [];
  for (const x of lista) {
    const k = (x as { key?: string })?.key;
    if (typeof k === "string" && (BLOQUES as readonly string[]).includes(k) && !vistos.has(k)) { vistos.add(k); out.push({ key: k as BloqueHome, on: (x as { on?: boolean }).on !== false }); }
  }
  for (const k of BLOQUES) if (!vistos.has(k)) out.push({ key: k, on: true });
  return out;
}
export const porDefecto = (): HomeCfg => ({ aviso: null, bloques: normalizarBloques([]) });

const TTL_MS = 15_000;
/* Copia de 15 s por ciudad que la base olvida por NOTIFY (con la generación de lib/cache-aviso.ts). Sin respuesta de la base: lo de fábrica, 2 s. */
const HOME = cacheConAviso({ ttlMs: TTL_MS, clave: (ciudad: string) => ciudad, siFalla: () => porDefecto(),
  cargar: async (ciudad: string): Promise<HomeCfg> => {
    const r = await db().query<{ notice: Par | null; blocks: unknown }>(`select notice, blocks from city_home_config where city_id = $1`, [ciudad]);
    return r.rows[0] ? { aviso: r.rows[0].notice, bloques: normalizarBloques(r.rows[0].blocks) } : porDefecto();
  } });
export const homeConfig = (ciudad: string): Promise<HomeCfg> => HOME.leer(ciudad);

/* Los anuncios vivos ahora (dentro de sus fechas y sin retirar) para quien mira: «vecinos» solo con cuenta. Máximo 2, el más nuevo primero. */
export async function anunciosVivos(ciudad: string, conSesion: boolean, lang: Lang): Promise<Anuncio[]> {
  try {
    const r = await db().query<{ id: string; text: Par }>(
      `select a.id::text, a.text from announcements a where a.city_id = $1 and a.retired_at is null and a.from_at <= now() and a.to_at > now()
          and (a.audience = 'todos' or ($2::boolean and a.audience = 'vecinos')) order by a.from_at desc, a.id desc limit 2`, [ciudad, conSesion]);
    return r.rows.map((x) => ({ id: x.id, text: x.text[lang] }));
  } catch { return []; }
}

/* El pie de la web en todas las páginas (feature_flags «web.pie_todas»; apagado hasta que el fundador apruebe las capturas nuevas): copia de 15 s que la base
   vacía por NOTIFY. Sin respuesta de la base, apagado. */
const PIE = cacheConAviso({ ttlMs: TTL_MS, siFalla: () => false,
  cargar: async () => (await db().query<{ enabled: boolean }>(`select enabled from feature_flags where key = 'web.pie_todas'`)).rows[0]?.enabled === true });
export const pieEnTodas = (): Promise<boolean> => PIE.leer();
