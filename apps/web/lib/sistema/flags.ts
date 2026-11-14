import "server-only";
import { auditar, type Staff } from "../admin";
import { db, tx } from "../db";

/* 9j · Super Admin › Sistema › Flags (prototipo secSys «flags»; ADM-SYS «activar funciones por ciudad o por porcentaje»; FeatureFlag de
   modelo-datos.md). Cada interruptor de la plataforma con su estado, su alcance, quién lo cambió y por qué.
   · Los que tienen su pantalla (El Compa, las cáscaras de las apps, Push, las fichas de las tiendas, el pie de la web) se cambian AHÍ, con sus
     reglas: aquí se ven y llevan a su sección.
   · Los demás se encienden o apagan aquí (sys:editar, con motivo y auditoría; la base avisa a todos los procesos al momento).
   · Por ciudad o por porcentaje SOLO los que la base marca «scopable» (su código los lee con flag_para(clave, persona)): la base no deja acotar
     uno que se lee todo o nada. El porcentaje es estable: la misma persona cae siempre en la misma cubeta de esa clave (flag_cubeta). */
type Bi = { es: string; en: string };
export type Alcance = "all" | "city" | "percent";
export type FlagAdm = { key: string; enabled: boolean; scope: Alcance; cities: string[]; percent: number; scopable: boolean; note: string | null; at: string; por: string | null; duenio: { t: Bi; href: string } | null };
export type CiudadFlag = { id: string; name: string; status: string };

const DUENIOS: [RegExp, Bi, string][] = [
  [/^compa\./, { es: "El Compa", en: "El Compa" }, "/admin/compa"],
  [/^app\.cascara\./, { es: "Sistema › Apps", en: "System › Apps" }, "/admin/sistema/apps"],
  [/^push\./, { es: "Sistema › Integraciones › Push", en: "System › Integrations › Push" }, "/admin/sistema/integraciones?tab=push"],
  [/^(app\.revision\.|app\.tiendas\.publico$)/, { es: "Sistema › Apps › Fichas y revisión", en: "System › Apps › Listings and review" }, "/admin/sistema/apps?v=fichas"],
  [/^web\.pie_todas$/, { es: "Textos y páginas", en: "Copy and pages" }, "/admin/textos"],
];
const duenio = (k: string) => { const d = DUENIOS.find(([re]) => re.test(k)); return d ? { t: d[1], href: d[2] } : null; };
const ISO = (c: string) => `to_char((${c}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

export async function flagsAdmin(): Promise<{ flags: FlagAdm[]; ciudades: CiudadFlag[] }> {
  const [f, c] = await Promise.all([
    db().query<Omit<FlagAdm, "duenio">>(
      `select f.key, f.enabled, f.scope, f.cities, f.percent, f.scopable, f.note, ${ISO("f.updated_at")} as at,
              coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), case when f.updated_by is null then null else 'Sistema' end) as por
         from feature_flags f left join users u on u.id::text = f.updated_by
        order by f.key limit 200`),
    db().query<CiudadFlag>(`select id, name, status from cities order by (status = 'on') desc, name`),
  ]);
  return { flags: f.rows.map((x) => ({ ...x, duenio: duenio(x.key) })), ciudades: c.rows };
}

export type Cambio = { enabled: boolean; scope: Alcance; cities: string[]; percent: number };
const mal = (es: string, en: string) => ({ ok: false as const, msg: { es, en } });

/* Cambiar un interruptor (encendido y alcance). sys:editar; con motivo; nunca uno que tiene su propia pantalla; por ciudad o porcentaje solo los
   «scopable». Antes → después en la auditoría. */
export async function cambiarFlag(s: Staff, key: string, c: Cambio, motivo: string): Promise<{ ok: true; msg: Bi } | { ok: false; msg: Bi }> {
  if (!s.puede("sys", "editar")) return mal("Tu rol no cambia los interruptores.", "Your role cannot change flags.");
  const m = String(motivo ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 300);
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  if (duenio(key)) return mal("Este interruptor se cambia en su sección.", "This flag is changed in its own section.");
  if (!["all", "city", "percent"].includes(c.scope)) return mal("Ese alcance no existe.", "That scope does not exist.");
  const pct = Math.round(Number(c.percent));
  const ciudades = [...new Set((Array.isArray(c.cities) ? c.cities : []).map(String))].slice(0, 20);
  if (c.scope === "percent" && !(pct >= 1 && pct <= 99)) return mal("El porcentaje va de 1 a 99 (100 = todos: «Todas las ciudades»).", "The percentage goes from 1 to 99 (100 = everyone: «All cities»).");
  if (c.scope === "city" && !ciudades.length) return mal("Elige al menos una ciudad.", "Pick at least one city.");
  return tx(async (cx) => {
    const a = (await cx.query<{ enabled: boolean; scope: Alcance; cities: string[]; percent: number; scopable: boolean }>(
      `select enabled, scope, cities, percent, scopable from feature_flags where key = $1 for update`, [key])).rows[0];
    if (!a) return mal("Ese interruptor no existe.", "That flag does not exist.");
    if (c.scope !== "all" && !a.scopable) return mal("Este interruptor se lee todo o nada: no se puede acotar por ciudad o porcentaje.", "This flag is read all-or-nothing: it cannot be limited by city or percentage.");
    if (ciudades.length) {
      const n = (await cx.query<{ n: number }>(`select count(*)::int as n from cities where id = any ($1::text[])`, [ciudades])).rows[0]?.n ?? 0;
      if (n !== ciudades.length) return mal("Una de esas ciudades no existe.", "One of those cities does not exist.");
    }
    const nuevo = { enabled: !!c.enabled, scope: c.scope, cities: c.scope === "all" ? [] : ciudades, percent: c.scope === "percent" ? pct : 100 };
    if (a.enabled === nuevo.enabled && a.scope === nuevo.scope && a.percent === nuevo.percent && JSON.stringify([...a.cities].sort()) === JSON.stringify([...nuevo.cities].sort()))
      return mal("No cambiaste nada.", "You did not change anything.");
    await cx.query(`update feature_flags set enabled = $2, scope = $3, cities = $4::text[], percent = $5, updated_at = now(), updated_by = $6 where key = $1`,
      [key, nuevo.enabled, nuevo.scope, nuevo.cities, nuevo.percent, s.id]);
    const leer = (x: { enabled: boolean; scope: Alcance; cities: string[]; percent: number }) => ({
      encendido: x.enabled ? "sí" : "no", alcance: x.scope === "all" ? "todas las ciudades" : x.scope === "city" ? `ciudades: ${x.cities.join(", ")}` : `${x.percent} %${x.cities.length ? ` en ${x.cities.join(", ")}` : ""}` });
    await auditar(cx, { actor: s.id, action: "sistema.flag", targetKind: "feature_flag", targetId: key, before: leer(a), after: leer(nuevo), reason: m });
    return { ok: true as const, msg: { es: `${key}: guardado.`, en: `${key}: saved.` } };
  });
}

/* ¿Está encendido para esta persona? (la ciudad de su cuenta y su cubeta estable). Lo usan los interruptores «scopable»; sin persona, un interruptor
   acotado queda apagado (no se sabe dónde está). */
export async function flagPara(key: string, userId: string | null): Promise<boolean> {
  return (await db().query<{ on: boolean }>(`select flag_para($1, $2::uuid) as on`, [key, userId])).rows[0]?.on === true;
}
