import "server-only";
import { headers } from "next/headers";
import { auditar, type Staff } from "./admin";
import { cambiarConfig, valores, type ClaveConfig } from "./config";
import { db, tx } from "./db";
import { CLAVES_APP, defApp, leerRotulo, type AppNativa, type ClaveApp, type Plataforma } from "./app-nativa-comun";

/* 8a · La app nativa en el servidor (fase8-apps.md §3.1, §4 8a). El servidor decide; la app solo muestra.
   - deLaApp(): qué cáscara hace la petición (rótulo TLApp del user-agent) o null en la web. INFORMATIVO: dice qué entrada abrir, si hay que
     actualizar y qué anotar en la sesión. Nunca autoriza nada (guardián appNoAutoriza: solo lo llaman los archivos de su lista).
   - compuerta(): «Actualiza la app» (build por debajo del mínimo), el aviso suave (por debajo del recomendado) o «Esta app está en pausa»
     (interruptor app.cascara.{app}); lo leen los marcos de cada entrada. Valores con 15 s de caché por proceso (como Configuración).
   - Super Admin › Sistema › Apps: builds mínimo y de aviso por app y plataforma (cambiarConfig: límites + motivo + auditoría) y la pausa. */
export type { AppNativa, ClaveApp, Plataforma } from "./app-nativa-comun";

export async function deLaApp(): Promise<AppNativa | null> {
  try { return leerRotulo((await headers()).get("user-agent")); } catch { return null; }
}

export const PLATAFORMAS: Plataforma[] = ["ios", "android"];
export const claveMin = (a: ClaveApp, p: Plataforma) => `app_min_build_${a}_${p}` as ClaveConfig;
export const claveAviso = (a: ClaveApp, p: Plataforma) => `app_aviso_build_${a}_${p}` as ClaveConfig;
export const flagCascara = (a: ClaveApp) => `app.cascara.${a}`;

let flags: { at: number; m: Map<string, boolean> } | null = null;
async function encendidas(): Promise<Map<string, boolean>> {
  if (flags && Date.now() - flags.at < 15_000) return flags.m;
  const r = await db().query<{ key: string; enabled: boolean }>(`select key, enabled from feature_flags where key like 'app.cascara.%'`);
  flags = { at: Date.now(), m: new Map(r.rows.map((x) => [x.key, x.enabled])) };
  return flags.m;
}

export type Compuerta = { estado: "web" } | { estado: "ok" | "aviso" | "actualizar" | "pausa"; app: AppNativa; nombre: { es: string; en: string }; tienda: string };
/* Dónde se actualiza: la ficha de la tienda cuando exista (Fase 9); antes, TestFlight (iOS) o Play (Android, prueba interna). */
async function tiendaDe(a: AppNativa): Promise<string> {
  const r = (await db().query<{ ios: string | null; android: string | null }>(`select store_ios_id as ios, store_android_url as android from app_clients where key = $1`, [a.app]).catch(() => ({ rows: [] }))).rows[0];
  if (a.plataforma === "ios") return r?.ios ? `https://apps.apple.com/app/id${encodeURIComponent(r.ios)}` : "itms-beta://";
  return r?.android ?? `https://play.google.com/store/apps/details?id=${encodeURIComponent(defApp(a.app).android)}`;
}
export async function compuerta(a?: AppNativa | null): Promise<Compuerta> {
  const app = a === undefined ? await deLaApp() : a;
  if (!app) return { estado: "web" };
  const nombre = defApp(app.app).nombre;
  try {
    // Una bandera que no existe cuenta como apagada (nunca encendido por accidente).
    if (!(await encendidas()).get(flagCascara(app.app))) return { estado: "pausa", app, nombre, tienda: "" };
    const v = await valores(claveMin(app.app, app.plataforma), claveAviso(app.app, app.plataforma));
    const min = v[claveMin(app.app, app.plataforma)], aviso = v[claveAviso(app.app, app.plataforma)];
    if (min > 0 && app.build < min) return { estado: "actualizar", app, nombre, tienda: await tiendaDe(app) };
    if (aviso > 0 && app.build < aviso) return { estado: "aviso", app, nombre, tienda: await tiendaDe(app) };
    return { estado: "ok", app, nombre, tienda: "" };
  } catch {
    return { estado: "ok", app, nombre, tienda: "" }; // la base no contesta: la app sigue (el marco mostrará su propio error)
  }
}

/* ── Super Admin › Sistema › Apps ── */
type Bi = { es: string; en: string };
export type FilaApp = {
  key: ClaveApp; nombre: Bi; ios: string; android: string; entrada: string; on: boolean; nota: string | null; flagAt: string | null;
  builds: { plat: Plataforma; min: number; aviso: number; minMax: number; avisoMax: number; minAt: string | null; avisoAt: string | null }[];
};
export type SesionesApp = { app: ClaveApp; plat: Plataforma; version: string | null; build: number | null; n: number; n7: number }[];
const ISO = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
export async function estadoApps(): Promise<{ apps: FilaApp[]; sesiones: SesionesApp; web: number }> {
  const [A, K, F, S, W] = await Promise.all([
    db().query<{ key: ClaveApp; name: Bi; bundle_ios: string; package_android: string; entry_path: string }>(`select key, name, bundle_ios, package_android, entry_path from app_clients order by sort`),
    db().query<{ key: string; v: number; max: number; at: string | null }>(
      `select k.key, cfg_int(k.key) as v, k.max::int as max,
              (select ${ISO("e.at")} from audit_entries e where e.target_kind = 'platform_config' and e.target_id = k.key order by e.at desc limit 1) as at
         from config_keys k where k.section = 'apps' and (k.key like 'app_min_build_%' or k.key like 'app_aviso_build_%')`),
    db().query<{ key: string; enabled: boolean; note: string | null; at: string }>(`select key, enabled, note, ${ISO("updated_at")} as at from feature_flags where key like 'app.cascara.%'`),
    // Sesiones activas por app, plataforma y versión (vivas, no bloqueadas, vistas en 30 días; las de 7 días aparte). Sin personas.
    db().query<{ app: ClaveApp; plat: Plataforma; version: string | null; build: number | null; n: number; n7: number }>(
      `select s.app, s.platform as plat, s.app_version as version, s.app_build as build, count(*)::int as n,
              count(*) filter (where s.last_seen_at > now() - interval '7 days')::int as n7
         from sessions s
        where s.platform <> 'web' and s.signed_out_at is null and not s.blocked and s.expires_at > now() and s.last_seen_at > now() - interval '30 days'
        group by 1, 2, 3, 4 order by 1, 2, 4 desc nulls last limit 200`),
    db().query<{ n: number }>(`select count(*)::int as n from sessions where platform = 'web' and signed_out_at is null and not blocked and expires_at > now() and last_seen_at > now() - interval '30 days'`),
  ]);
  const k = new Map(K.rows.map((x) => [x.key, x])), f = new Map(F.rows.map((x) => [x.key, x]));
  const apps = A.rows.filter((x) => (CLAVES_APP as string[]).includes(x.key)).map((x): FilaApp => ({
    key: x.key, nombre: x.name, ios: x.bundle_ios, android: x.package_android, entrada: x.entry_path,
    on: !!f.get(flagCascara(x.key))?.enabled, nota: f.get(flagCascara(x.key))?.note ?? null, flagAt: f.get(flagCascara(x.key))?.at ?? null,
    builds: PLATAFORMAS.map((p) => {
      const m = k.get(claveMin(x.key, p)), a = k.get(claveAviso(x.key, p));
      return { plat: p, min: m?.v ?? 0, aviso: a?.v ?? 0, minMax: m?.max ?? 0, avisoMax: a?.max ?? 0, minAt: m?.at ?? null, avisoAt: a?.at ?? null };
    }),
  }));
  return { apps, sesiones: S.rows, web: W.rows[0]?.n ?? 0 };
}

type Res = { ok: true; msg: string } | { ok: false; msg: string };
/* Build mínimo o de aviso de una app en una plataforma (solo Admin con sys:editar; lo revisa la acción). Va por cambiarConfig (límites de la
   clave, motivo, auditoría con antes → después); además, el de aviso nunca queda por debajo del mínimo (lo revisa dentro de la transacción). */
export async function cambiarBuild(s: Staff, app: string, plat: string, tipo: string, valorTxt: string, motivo: string): Promise<Res> {
  if (!(CLAVES_APP as string[]).includes(app) || !(PLATAFORMAS as string[]).includes(plat) || !["min", "aviso"].includes(tipo)) return { ok: false, msg: "Esa app o plataforma no existe." };
  const a = app as ClaveApp, p = plat as Plataforma, k = tipo === "min" ? claveMin(a, p) : claveAviso(a, p), otra = tipo === "min" ? claveAviso(a, p) : claveMin(a, p);
  class Choque extends Error {}
  try {
    const r = await cambiarConfig(s.id, k, valorTxt, motivo, {
      desde: "/admin/sistema/apps",
      tambien: async (c, _antes, v) => {
        const o = (await c.query<{ v: number }>(`select cfg_int($1) as v`, [otra])).rows[0]?.v ?? 0;
        const min = tipo === "min" ? v : o, aviso = tipo === "min" ? o : v;
        if (min > 0 && aviso > 0 && aviso <= min) throw new Choque(`El build de aviso (${aviso}) tiene que ser mayor que el mínimo (${min}); 0 = sin aviso.`);
      },
    });
    if (!r.ok) return { ok: false, msg: r.msg };
    return { ok: true, msg: `${defApp(a).nombre.es} · ${p === "ios" ? "iPhone" : "Android"}: ${tipo === "min" ? "build mínimo" : "build de aviso"} ${r.v || "sin límite"}.` };
  } catch (e) {
    if (e instanceof Choque) return { ok: false, msg: e.message };
    throw e;
  }
}

/* Pausar o volver a abrir una app (solo Admin con sys:editar). La cáscara pausada muestra «Esta app está en pausa · Abrir en la web». */
export async function pausarApp(s: Staff, app: string, encender: boolean, motivo: string): Promise<Res> {
  if (!(CLAVES_APP as string[]).includes(app)) return { ok: false, msg: "Esa app no existe." };
  const m = String(motivo ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 300);
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en la auditoría." };
  const clave = flagCascara(app as ClaveApp), nom = defApp(app as ClaveApp).nombre.es;
  const r = await tx(async (c): Promise<Res> => {
    const a = (await c.query<{ enabled: boolean }>(`select enabled from feature_flags where key = $1 for update`, [clave])).rows[0];
    if (!a) return { ok: false, msg: "Ese interruptor no existe." };
    if (a.enabled === encender) return { ok: false, msg: encender ? "Ya está abierta." : "Ya está en pausa." };
    await c.query(`update feature_flags set enabled = $2, note = $4, updated_at = now(), updated_by = $3 where key = $1`, [clave, encender, s.id, m]);
    await auditar(c, { actor: s.id, action: encender ? "app.abrir" : "app.pausar", targetKind: "feature_flag", targetId: clave,
      before: { [nom]: a.enabled ? "abierta" : "en pausa" }, after: { [nom]: encender ? "abierta" : "en pausa" }, reason: m });
    return { ok: true, msg: encender ? `${nom} está abierta otra vez.` : `${nom} en pausa: la app muestra «Abrir en la web».` };
  });
  flags = null;
  return r;
}
