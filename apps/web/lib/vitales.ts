import "server-only";
/* 9j-2 · Web Vitals de teléfonos reales (RUM, L1629). La puerta /api/vitales (sin sesión) trae, una vez por página, el LCP, el INP y el CLS que
   midió el navegador. Aquí: el flag app.vitals, el tope por conexión y en todo el sistema (lib/topes.ts, compartido), la forma (solo esos
   campos, con su rango) y la suma en web_vitals_dia (0167) por día, familia de ruta, perfil y métrica, en tres cubetas con los umbrales de
   Google. Nunca la URL, la persona, el teléfono ni la dirección: la ruta llega ya en familia y aquí se vuelve a reducir. */
import { cacheConAviso } from "./cache-aviso";
import { db } from "./db";
import { dentroDelTope, sumarTope } from "./topes";

export const UMBRAL = { lcp: [2500, 4000], inp: [200, 500], cls: [0.1, 0.25] } as const;
type Metrica = keyof typeof UMBRAL;
const RANGO: Record<Metrica, number> = { lcp: 120_000, inp: 60_000, cls: 50 };
/* Secciones con subpáginas fijas (/cuenta/boletos, /admin/planes): ahí la segunda parte se queda; en las demás, todo lo que sigue es «:x». */
const FIJAS = new Set(["cuenta", "admin", "panel", "comunidad", "ayuda", "soporte", "eventos", "repartidor", "puerta", "legal"]);

export function familiaVital(ruta: unknown): string | null {
  if (typeof ruta !== "string" || !ruta.startsWith("/") || ruta.length > 300) return null;
  const p = ruta.split(/[?#]/)[0]!.split("/").filter(Boolean).slice(0, 3);
  if (!p.length) return "/";
  if (!/^[a-z][a-z-]{0,23}$/.test(p[0]!)) return null;
  const out = [p[0]!];
  if (p[1]) out.push(FIJAS.has(p[0]!) && /^[a-z][a-z-]{1,23}$/.test(p[1]) ? p[1] : ":x");
  if (p[2]) out.push(FIJAS.has(p[0]!) && out[1] !== ":x" && /^[a-z][a-z-]{1,23}$/.test(p[2]) ? p[2] : ":x");
  return "/" + out.join("/");
}
export const cubeta = (m: Metrica, v: number): 0 | 1 | 2 => (v <= UMBRAL[m][0] ? 0 : v <= UMBRAL[m][1] ? 1 : 2);

const FLAG = cacheConAviso({ ttlMs: 30_000,
  cargar: async () => (await db().query<{ enabled: boolean }>(`select enabled from feature_flags where key = 'app.vitals'`).catch(() => ({ rows: [] as { enabled: boolean }[] }))).rows[0]?.enabled === true });
const encendido = (): Promise<boolean> => FLAG.leer();

export type ResVital = { ok: true; n: number } | { ok: false; por: "apagado" | "limite" | "invalido" };
export async function recibirVital(e: { ip: string | null; cuerpo: unknown }): Promise<ResVital> {
  if (!(await encendido())) return { ok: false, por: "apagado" };
  const c = e.cuerpo as Record<string, unknown> | null;
  if (!c || typeof c !== "object" || Array.isArray(c)) return { ok: false, por: "invalido" };
  const familia = familiaVital(c.ruta), perfil = c.perfil === "telefono" || c.perfil === "escritorio" ? c.perfil : null;
  if (!familia || !perfil) return { ok: false, por: "invalido" };
  const filas: [Metrica, 0 | 1 | 2][] = [];
  for (const m of ["lcp", "inp", "cls"] as const) {
    const v = c[m];
    if (v == null) continue;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > RANGO[m]) return { ok: false, por: "invalido" };
    filas.push([m, cubeta(m, v)]);
  }
  if (!filas.length) return { ok: false, por: "invalido" };
  // Primero la conexión (si insiste, sigue afuera); solo lo que pasa eso cuenta para el tope de todo el sistema.
  const ok = await dentroDelTope("vitales_ip", e.ip ?? "?", 30) && await dentroDelTope("vitales", "todo", 20_000);
  if (!ok) { await sumarTope("vitales_descartados", "todo").catch(() => undefined); return { ok: false, por: "limite" }; }
  await db().query(
    `insert into web_vitals_dia (dia, familia, perfil, metrica, n, buenos, medios, malos)
     select (now() at time zone 'America/New_York')::date, $1, $2, x.m, 1, (x.c = 0)::int, (x.c = 1)::int, (x.c = 2)::int
       from unnest($3::text[], $4::int[]) as x(m, c)
     on conflict (dia, familia, perfil, metrica) do update set n = web_vitals_dia.n + 1, buenos = web_vitals_dia.buenos + excluded.buenos,
       medios = web_vitals_dia.medios + excluded.medios, malos = web_vitals_dia.malos + excluded.malos`,
    [familia, perfil, filas.map((f) => f[0]), filas.map((f) => f[1])]);
  return { ok: true, n: filas.length };
}

/* Sistema › Salud: por familia y perfil, las tres métricas de los últimos 7 días (hora del Este): cuántas mediciones, % buenas y % malas.
   Una pantalla está bien en una métrica si 75 % o más de las mediciones son buenas (el criterio de Google: el p75 dentro del umbral). */
export type FilaVital = { familia: string; perfil: string; m: Record<Metrica, { n: number; buenos: number; malos: number } | null>; total: number };
export async function resumenVitales(dias = 7, max = 25): Promise<FilaVital[]> {
  const r = await db().query<{ familia: string; perfil: string; metrica: Metrica; n: number; buenos: number; malos: number }>(
    `select familia, perfil, metrica, sum(n)::int as n, sum(buenos)::int as buenos, sum(malos)::int as malos from web_vitals_dia
      where dia > (now() at time zone 'America/New_York')::date - $1::int group by 1, 2, 3`, [dias]);
  const map = new Map<string, FilaVital>();
  for (const x of r.rows) {
    const k = `${x.familia}|${x.perfil}`;
    const f = map.get(k) ?? { familia: x.familia, perfil: x.perfil, m: { lcp: null, inp: null, cls: null }, total: 0 };
    f.m[x.metrica] = { n: x.n, buenos: x.buenos, malos: x.malos };
    f.total = Math.max(f.total, x.n);
    map.set(k, f);
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, max);
}
