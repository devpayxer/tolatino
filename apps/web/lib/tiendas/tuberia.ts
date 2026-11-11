import "server-only";
import { createHash } from "node:crypto";
import { auditar, type Staff } from "../admin";
import { CLAVES_APP, defApp, type ClaveApp } from "../app-nativa-comun";
import { valor } from "../config";
import { db, tx } from "../db";
import { ENTORNO } from "../entorno";
import * as asc from "./asc";
import { URL_ASC, URL_GITHUB, URL_JWKS, URL_PLAY, URL_PLAY_OAUTH } from "./direcciones";
import { lanzar } from "./github";
import { claveAlmacen, leer, type TipoLlave } from "./llavero";
import { llavesDe, REPO, verificar, type Claims, type Motivo } from "./oidc";
import * as play from "./play";

/* 8h · La tubería de las tiendas (fase8-apps.md §3.5, §4 8h; §6 #10–#12). El job de GitHub Actions no guarda ninguna llave: se identifica con su
   token OIDC (lib/tiendas/oidc.ts lo revisa entero) y el servidor le da SOLO lo que ese job necesita, anotando cada lectura. Con el mismo token
   (uno nuevo por pedido: cada jti entra una vez) registra y avanza sus builds en app_builds y sube el APK propio, el .aab y los símbolos.
   - HTTPS o nada: nginx escribe X-Forwarded-Proto con el esquema real (pisa lo que mande el cliente; la app solo escucha en 127.0.0.1). Por HTTP no
     se acepta ningún token (y el CI no lo manda: scripts/tiendas/ci.mjs exige https). Sin modo de prueba que lo salte.
   - Cada intento queda en ci_oidc_log (solo inserción) con su motivo; lo que dice el token se anota SOLO si su firma verificó.
   - Más de tiendas_oidc_fallos_min rechazos en un minuto → 429 sin revisar ni anotar (protege la base de un aluvión).
   - El jti se gasta en UNA inserción (on conflict do nothing): dos pedidos con el mismo token, uno solo entra.
   - El servidor decide: el CI solo dice «compilando», «subido» o «falló»; «procesando» y «disponible» los pone el servidor cuando Apple o
     Google contestan (o, en el APK propio, cuando el archivo llegó y su sha256 coincide). Un run solo toca los builds que él creó.
   - Envíos públicos (revisión, lanzamiento) y el sabor de producción: la base los rechaza mientras app.tiendas.publico esté apagado (Fase 9). */
const PROD = ENTORNO === "produccion";
export type Para = "llaves" | "build" | "archivo";
type MotivoLog = Motivo | "ok" | "sin_https" | "sin_token" | "jti_repetido" | "limite" | "apagado" | "pedido_invalido" | "build_ajeno" | "sin_llave" | "error";
const ISO = (c: string) => `to_char((${c}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const encendido = async (k: string) => (await db().query<{ enabled: boolean }>(`select enabled from feature_flags where key = $1`, [k])).rows[0]?.enabled === true;

/* Las ramas que pueden pedir llaves: el sandbox SOLO pruebas; producción SOLO produccion y solo con app.tiendas.publico (Fase 9). */
export async function ramasPermitidas(): Promise<string[]> {
  if (!PROD) return ["refs/heads/pruebas"];
  return (await encendido("app.tiendas.publico")) ? ["refs/heads/produccion"] : [];
}
/* ¿Llegó por HTTPS? Lo dice nginx (o Cloudflare → nginx en 443). */
export const llegoPorHttps = (req: Request) => (req.headers.get("x-forwarded-proto") ?? "").split(",")[0]!.trim().toLowerCase() === "https";

const runDe = (c: Claims) => `https://github.com/${c.repository}/actions/runs/${c.run_id}`;
async function anotar(ok: boolean, motivo: MotivoLog, para: Para, c?: Claims, detalle?: string) {
  const v = (x: unknown, re: RegExp, max: number) => (typeof x === "string" && re.test(x) ? x.slice(0, max) : null);
  await db().query(`insert into ci_oidc_log (ok, motivo, para, repo, ref, environment, event_name, run_id, sha, detalle) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [ok, motivo, para, v(c?.repository, /^[\w.-]+\/[\w.-]+$/, 140), v(c?.ref, /^refs\/[\w./-]+$/, 200), v(c?.environment, /^[\w.-]+$/, 80), v(c?.event_name, /^[a-z_]+$/, 40),
      v(c ? String(c.run_id) : null, /^[0-9]{1,20}$/, 20), v(c?.sha, /^[a-f0-9]{40}$/, 40), detalle ? detalle.replace(/[^\w .,:;/()·«»áéíóúñü-]/gi, "").slice(0, 200) : null]).catch(() => undefined);
}

export type Auth = { ok: true; c: Claims } | { ok: false; status: number; motivo: MotivoLog };
const STATUS: Partial<Record<MotivoLog, number>> = { sin_https: 403, limite: 429, apagado: 503, jwks: 503 };
/* La puerta de la tubería: TODA ruta de /api/tiendas pasa por aquí antes de hacer nada. */
export async function autenticar(req: Request, para: Para): Promise<Auth> {
  const no = async (motivo: MotivoLog, c?: Claims): Promise<Auth> => {
    if (motivo !== "limite") await anotar(false, motivo, para, c);
    return { ok: false, status: STATUS[motivo] ?? 401, motivo };
  };
  const tope = await valor("tiendas_oidc_fallos_min");
  const fallos = (await db().query<{ n: number }>(`select count(*)::int as n from ci_oidc_log where not ok and at > now() - interval '1 minute'`)).rows[0]?.n ?? 0;
  if (fallos >= tope) return no("limite");
  if (!llegoPorHttps(req)) return no("sin_https");
  if (!(await encendido("app.tiendas.tuberia"))) return no("apagado");
  const token = /^Bearer ([A-Za-z0-9._-]{20,8192})$/.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!token) return no("sin_token");
  const r = await verificar(token, llavesDe(URL_JWKS()), { ramas: await ramasPermitidas() });
  // Lo que dice el token solo se anota si su firma verificó (r.c existe solo entonces).
  if (!r.ok) return no(r.motivo, r.c);
  const c = r.c;
  // El mismo token NO entra dos veces: la inserción del jti es la prueba (atómica).
  const nuevo = (await db().query(`insert into ci_oidc_jti (jti, exp, run_id, para) values ($1, to_timestamp($2), $3, $4) on conflict (jti) do nothing returning jti`,
    [c.jti, c.exp, String(c.run_id), para])).rowCount;
  if (!nuevo) return no("jti_repetido", c);
  await anotar(true, "ok", para, c);
  return { ok: true, c };
}

/* ── Las llaves de cada job (solo esas; nunca APNs, Firebase, Play, Wallet ni el token de GitHub: esas se quedan en el servidor) ── */
export const DEL_JOB = { ios: ["asc_api_key", "ios_dist_cert"], android: ["android_upload_keystore"] } as const satisfies Record<string, readonly TipoLlave[]>;
export type Job = keyof typeof DEL_JOB;
export async function llavesDelJob(c: Claims, b: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const x = (b ?? {}) as { job?: unknown; app?: unknown };
  if ((x.job !== "ios" && x.job !== "android") || !CLAVES_APP.includes(x.app as ClaveApp)) {
    await anotar(false, "pedido_invalido", "llaves", c);
    return { status: 400, json: { ok: false, msg: "job (ios | android) y app" } };
  }
  const job = x.job as Job, app = x.app as ClaveApp, llaves: { tipo: string; archivo: string; huella: string; meta: Record<string, string>; clave?: string }[] = [], faltan: string[] = [];
  for (const tipo of DEL_JOB[job]) {
    const m = (await db().query<{ meta: Record<string, string>; fingerprint: string; version: number }>(`select meta, fingerprint, version from store_secrets where kind = $1 and retired_at is null`, [tipo])).rows[0];
    const contenido = m ? await leer(tipo, `CI ${job} · ${app} · run ${c.run_id}`, { run: String(c.run_id), sha: c.sha }) : null;
    if (!m || !contenido) { faltan.push(tipo); continue; }
    // Un almacén PKCS12 va con su contraseña, derivada del entorno (nunca guardada).
    const clave = tipo === "android_upload_keystore" || tipo === "ios_dist_cert" ? claveAlmacen(tipo, m.version) ?? undefined : undefined;
    llaves.push({ tipo, archivo: contenido.toString("base64"), huella: m.fingerprint, meta: m.meta, ...(clave ? { clave } : {}) });
    contenido.fill(0);
  }
  // iOS firma con el Team ID de Apple: un dato PÚBLICO de la llave de APNs (su meta), nunca la llave.
  const equipo = job === "ios" ? (await db().query<{ e: string | null }>(`select meta->>'equipo' as e from store_secrets where kind = 'apns_key' and retired_at is null`)).rows[0]?.e ?? null : null;
  return { status: 200, json: { ok: true, llaves, faltan, ...(equipo && /^[A-Z0-9]{10}$/.test(equipo) ? { equipo } : {}) } };
}

/* ── Registrar y avanzar un build (el CI dice compilando, subido o fallo; lo demás lo decide el servidor) ── */
const CANAL_DE = { testflight_interno: "ios", play_interno: "android", apk_propio: "android" } as const;
type Canal = keyof typeof CANAL_DE;
type FilaB = { id: string; status: string; run: string | null; commit: string | null; channel: Canal; app: ClaveApp; platform: string; version: string; build: number; request_id: string | null };
export async function registrarBuild(c: Claims, b: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const x = (b ?? {}) as Record<string, unknown>;
  const app = x.app as ClaveApp, canal = x.canal as Canal, plat = x.plataforma, estado = x.estado, version = x.version, build = x.build;
  const motivo = typeof x.motivo === "string" ? x.motivo.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 200) : "";
  const pedido = x.pedido === undefined || x.pedido === null || x.pedido === "" ? null : String(x.pedido);
  if (!CLAVES_APP.includes(app) || !Object.hasOwn(CANAL_DE, String(canal)) || CANAL_DE[canal] !== plat || typeof version !== "string" || !/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(version)
      || typeof build !== "number" || !Number.isInteger(build) || build < 1 || build > 999999999 || !["compilando", "subido", "fallo"].includes(String(estado))
      || (estado === "fallo" && motivo.length < 3) || (pedido !== null && !/^\d{1,18}$/.test(pedido)) || (x.sabor !== undefined && x.sabor !== "pruebas" && x.sabor !== "produccion")) {
    await anotar(false, "pedido_invalido", "build", c);
    return { status: 400, json: { ok: false, msg: "app, plataforma, canal, versión, build y estado (compilando | subido | fallo; fallo con motivo)" } };
  }
  const run = runDe(c), sabor = (x.sabor as string | undefined) ?? (PROD ? "produccion" : "pruebas");
  const r = await avanzar(c, { app, plat: plat as string, canal, version, build, estado: estado as string, motivo, pedido, run, sabor });
  if (r.json.ajeno) await anotar(false, "build_ajeno", "build", c);
  return r;
}
async function avanzar(c: Claims, x: { app: ClaveApp; plat: string; canal: Canal; version: string; build: number; estado: string; motivo: string; pedido: string | null; run: string; sabor: string }): Promise<{ status: number; json: Record<string, unknown> }> {
  const { app, plat, canal, version, build, estado, motivo, pedido, run, sabor } = x;
  try {
    return await tx(async (cx) => {
      await cx.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`build:${app}:${plat}:${canal}`]);
      const f = (await cx.query<FilaB>(`select id::text, status, ci_run_url as run, commit_sha as commit, channel, app, platform, version, build, request_id::text from app_builds
          where app = $1 and platform = $2 and channel = $3 and build = $4 for update`, [app, plat, canal, build])).rows[0];
      if (!f) {
        if (estado !== "compilando") return { status: 404, json: { ok: false, msg: "Ese build no existe: primero «compilando»." } };
        let req: string | null = null;
        if (pedido) {
          const p = (await cx.query<{ id: string; app: string; platform: string; status: string }>(`select id::text, app, platform, status from build_requests where id = $1::bigint for update`, [pedido])).rows[0];
          if (!p || !["enviado", "corriendo"].includes(p.status) || (p.app !== "todas" && p.app !== app) || (p.platform !== "ambas" && p.platform !== plat)) return { status: 409, json: { ok: false, msg: "Ese pedido no es de este build." } };
          if (p.status === "enviado") await cx.query(`update build_requests set status = 'corriendo' where id = $1::bigint`, [p.id]);
          req = p.id;
        }
        const id = (await cx.query<{ id: string }>(`insert into app_builds (app, platform, version, build, commit_sha, flavor, channel, status, ci_run_url, request_id)
            values ($1, $2, $3, $4, $5, $6, $7, 'compilando', $8, $9::bigint) returning id::text`, [app, plat, version, build, c.sha, sabor, canal, run, req])).rows[0]!.id;
        return { status: 201, json: { ok: true, id, estado: "compilando" } };
      }
      // Un run solo toca sus builds (el que lo creó: mismo run y mismo commit).
      if (f.run !== run || f.commit !== c.sha || f.version !== version) return { status: 403, json: { ok: false, msg: "Ese build es de otro run.", ajeno: true } };
      if (f.status === estado) return { status: 200, json: { ok: true, id: f.id, estado } };
      await cx.query(`update app_builds set status = $2, fail_reason = $3 where id = $1::bigint`, [f.id, estado, estado === "fallo" ? motivo : null]);
      if (estado === "subido" && canal === "testflight_interno") await cx.query(`insert into store_submissions (build_id, kind, by_kind, result, detail) values ($1::bigint, 'testflight', 'ci', 'enviado', $2)`, [f.id, `run ${c.run_id}`]);
      return { status: 200, json: { ok: true, id: f.id, estado } };
    });
  } catch (e) {
    const m = String((e as Error)?.message ?? e);
    if (/build_no_creciente/.test(m)) return { status: 409, json: { ok: false, msg: m.replace(/^.*build_no_creciente: /, "El build no es creciente: ").slice(0, 200) } };
    if (/tienda_solo_produccion/.test(m)) return { status: 403, json: { ok: false, msg: "El sabor de producción y la tienda pública esperan la Fase 9." } };
    if (/estado solo avanza|ya no cambia|solo se retira/.test(m)) return { status: 409, json: { ok: false, msg: m.replace(/^.*app_builds: /, "").slice(0, 200) } };
    throw e;
  }
}

/* ── Archivos del CI: el APK propio, el .aab (→ Play interno) y los símbolos (dSYM / mapping.txt), al almacén PRIVADO ── */
export type TipoArchivo = "apk" | "aab" | "simbolos";
const ZIP = (b: Buffer) => b.length > 30 && b.readUInt32LE(0) === 0x04034b50;
export async function guardarArchivo(c: Claims, q: URLSearchParams, cuerpo: Buffer, shaDicho: string | null): Promise<{ status: number; json: Record<string, unknown> }> {
  const tipo = q.get("tipo") as TipoArchivo, app = q.get("app") as ClaveApp, canal = q.get("canal") as Canal, build = Number(q.get("build"));
  if (!["apk", "aab", "simbolos"].includes(tipo) || !CLAVES_APP.includes(app) || !Object.hasOwn(CANAL_DE, String(canal)) || !Number.isInteger(build) || build < 1
      || (tipo === "apk" && canal !== "apk_propio") || (tipo === "aab" && canal !== "play_interno") || !shaDicho || !/^[a-f0-9]{64}$/.test(shaDicho)) {
    await anotar(false, "pedido_invalido", "archivo", c);
    return { status: 400, json: { ok: false, msg: "tipo (apk | aab | simbolos), app, canal, build y la cabecera x-tl-sha256" } };
  }
  const sha = createHash("sha256").update(cuerpo).digest("hex");
  if (sha !== shaDicho) return { status: 422, json: { ok: false, msg: "El sha256 del archivo no coincide con el que dijo el CI." } };
  const esTexto = tipo === "simbolos" && !ZIP(cuerpo);
  if ((tipo !== "simbolos" && !ZIP(cuerpo)) || (esTexto && /[\u0000]/.test(cuerpo.subarray(0, 4096).toString("latin1")))) return { status: 422, json: { ok: false, msg: tipo === "simbolos" ? "Los símbolos son un .zip (dSYM) o un mapping.txt." : `No es un .${tipo}.` } };
  const f = (await db().query<FilaB>(`select id::text, status, ci_run_url as run, commit_sha as commit, channel, app, platform, version, build, request_id::text from app_builds
      where app = $1 and platform = $2 and channel = $3 and build = $4`, [app, CANAL_DE[canal], canal, build])).rows[0];
  if (!f) return { status: 404, json: { ok: false, msg: "Ese build no existe." } };
  if (f.run !== runDe(c) || f.commit !== c.sha) { await anotar(false, "build_ajeno", "archivo", c); return { status: 403, json: { ok: false, msg: "Ese build es de otro run." } }; }
  if (f.status === "fallo" || f.status === "retirado") return { status: 409, json: { ok: false, msg: `Ese build está ${f.status === "fallo" ? "fallado" : "retirado"}.` } };
  const { guardarObjeto, mediosListos } = await import("../medios");
  if (!mediosListos()) return { status: 503, json: { ok: false, msg: "El almacén no está listo." } };
  const nombre = `${defApp(app).android.split(".").pop()}-${f.version.replace(/\./g, "-")}-${build}`;
  const clave = tipo === "apk" ? `privado/apk/${nombre}.apk` : tipo === "aab" ? `privado/aab/${nombre}.aab` : `privado/simbolos/${app}-${f.platform}-${canal.replace(/_/g, "-")}-${build}.${esTexto ? "txt" : "zip"}`;
  await guardarObjeto(clave, cuerpo, tipo === "apk" ? "application/vnd.android.package-archive" : esTexto ? "text/plain" : "application/octet-stream");
  try {
    if (tipo === "apk") await db().query(`update app_builds set artifact_key = $2, sha256 = $3, size_bytes = $4, status = 'disponible' where id = $1::bigint`, [f.id, clave, sha, cuerpo.length]);
    else if (tipo === "aab") await db().query(`update app_builds set bundle_key = $2, sha256 = $3, size_bytes = $4, status = case when status = 'compilando' then 'subido' else status end where id = $1::bigint`, [f.id, clave, sha, cuerpo.length]);
    else await db().query(`update app_builds set symbols_key = $2 where id = $1::bigint`, [f.id, clave]);
  } catch (e) {
    if (/no cambian/.test(String((e as Error)?.message))) return { status: 409, json: { ok: false, msg: "Ese build ya tiene su archivo." } };
    throw e;
  }
  const play = tipo === "aab" ? await aPlay(f.id) : null;
  return { status: 200, json: { ok: true, clave: clave.replace(/^privado\//, ""), sha256: sha, ...(play ? { play } : {}) } };
}

/* ── Play interno: el servidor sube el .aab con la cuenta de servicio (la llave NUNCA sale al CI). Sin la cuenta (Paquete 8-2) el build espera
   «subido»; el barrido lo reintenta. Tres errores de Google → fallo. ── */
export async function aPlay(id: string): Promise<"ok" | "sin_llave" | "espera" | "error"> {
  const b = (await db().query<{ app: ClaveApp; version: string; build: number; status: string; bundle_key: string | null; errores: number }>(
    `select app, version, build, status, bundle_key, (select count(*)::int from store_submissions s where s.build_id = b.id and s.kind = 'play_interno' and s.result = 'error') as errores
       from app_builds b where id = $1::bigint and channel = 'play_interno'`, [id])).rows[0];
  if (!b || !b.bundle_key || !["compilando", "subido"].includes(b.status)) return "espera";
  const sa = await leer("play_service_account", `Play interno · build ${b.build}`).catch(() => null);
  if (!sa) return "sin_llave";
  try {
    const cuenta = JSON.parse(sa.toString("utf8")) as play.CuentaPlay;
    sa.fill(0);
    const token = await play.tokenPlay(URL_PLAY_OAUTH(), cuenta);
    if (!token) throw new Error("OAuth de Google no dio token");
    const { leerObjeto } = await import("../medios");
    const aab = await leerObjeto(b.bundle_key);
    const r = await play.aPlayInterno(URL_PLAY(), token, { pkg: defApp(b.app).android, aab, nombre: `${b.version} (${b.build})`, build: b.build });
    if (!r.ok) throw new Error(r.error);
    await tx(async (c) => {
      await c.query(`update app_builds set status = 'disponible' where id = $1::bigint`, [id]);
      await c.query(`insert into store_submissions (build_id, kind, by_kind, result, detail) values ($1::bigint, 'play_interno', 'servidor', 'aceptado', $2)`, [id, `versionCode ${r.versionCode} · pista interna`]);
    });
    return "ok";
  } catch (e) {
    const m = String((e as Error)?.message ?? e).slice(0, 280);
    await tx(async (c) => {
      await c.query(`insert into store_submissions (build_id, kind, by_kind, result, detail) values ($1::bigint, 'play_interno', 'servidor', 'error', $2)`, [id, m]);
      if (b.errores + 1 >= 3) await c.query(`update app_builds set status = 'fallo', fail_reason = $2 where id = $1::bigint`, [id, `Google Play: ${m}`.slice(0, 200)]);
    });
    return "error";
  }
}

/* ── TestFlight interno: Apple procesa lo que subió el CI; el barrido pregunta y, VALID, lo suma al grupo interno ── */
async function credAsc(): Promise<asc.CredAsc | null> {
  const m = (await db().query<{ meta: Record<string, string> }>(`select meta from store_secrets where kind = 'asc_api_key' and retired_at is null`)).rows[0]?.meta;
  if (!m?.id_llave || !m.emisor) return null;
  const b = await leer("asc_api_key", "tubería · procesamiento de TestFlight").catch(() => null);
  return b ? { llavePem: b.toString("utf8"), idLlave: m.id_llave, emisor: m.emisor } : null;
}
export async function revisarTestflight(lim = 10): Promise<number> {
  const L = (await db().query<{ id: string; app: ClaveApp; version: string; build: number; status: string }>(
    `select id::text, app, version, build, status from app_builds where channel = 'testflight_interno' and status in ('subido', 'procesando') and updated_at < now() - interval '1 minute'
      order by updated_at limit $1`, [lim])).rows;
  if (!L.length) return 0;
  const c = await credAsc();
  if (!c) return 0;
  const base = URL_ASC();
  let n = 0;
  for (const b of L) {
    const appId = await asc.appPorBundle(base, c, defApp(b.app).ios).catch(() => null);
    if (!appId) continue;
    const r = await asc.buildEnAsc(base, c, { appId, version: b.version, build: b.build }).catch(() => "error" as const);
    if (r === "error" || r === null) { await db().query(`update app_builds set updated_at = now() where id = $1::bigint`, [b.id]); continue; }
    if (r.estado === "PROCESSING") { if (b.status === "subido") await db().query(`update app_builds set status = 'procesando', store_build_id = coalesce(store_build_id, $2) where id = $1::bigint`, [b.id, r.id]); else await db().query(`update app_builds set updated_at = now() where id = $1::bigint`, [b.id]); n++; continue; }
    if (r.estado === "VALID") {
      const grupo = await asc.grupoInterno(base, c, appId).catch(() => null);
      const g = grupo ? await asc.buildAlGrupo(base, c, grupo, r.id).catch(() => null) : null;
      if (!g || (g.status !== 204 && g.status !== 409)) { await db().query(`update app_builds set updated_at = now(), store_build_id = coalesce(store_build_id, $2) where id = $1::bigint`, [b.id, r.id]); continue; }
      await tx(async (cx) => {
        await cx.query(`update app_builds set status = 'disponible', store_build_id = coalesce(store_build_id, $2) where id = $1::bigint`, [b.id, r.id]);
        await cx.query(`insert into store_submissions (build_id, kind, by_kind, result, detail) values ($1::bigint, 'testflight', 'servidor', 'aceptado', 'Apple lo procesó; en el grupo interno')`, [b.id]);
      });
      n++; continue;
    }
    // FAILED / INVALID: Apple no lo aceptó.
    await tx(async (cx) => {
      await cx.query(`update app_builds set status = 'fallo', fail_reason = $2, store_build_id = coalesce(store_build_id, $3) where id = $1::bigint`, [b.id, `Apple: ${r.estado}`, r.id]);
      await cx.query(`insert into store_submissions (build_id, kind, by_kind, result, detail) values ($1::bigint, 'testflight', 'servidor', 'rechazado', $2)`, [b.id, `processingState ${r.estado}`]);
    });
    n++;
  }
  return n;
}

/* El barrido: TestFlight, Play interno pendiente, pedidos que terminaron y los jti vencidos. */
export async function barrerTiendas(): Promise<{ testflight: number; play: number; pedidos: number; jti: number }> {
  const testflight = await revisarTestflight();
  let pl = 0;
  for (const r of (await db().query<{ id: string }>(`select id::text from app_builds where channel = 'play_interno' and status = 'subido' and bundle_key is not null and updated_at < now() - interval '2 minutes' order by updated_at limit 5`)).rows) {
    if ((await aPlay(r.id)) === "ok") pl++;
    else await db().query(`update app_builds set updated_at = now() where id = $1::bigint and status = 'subido'`, [r.id]);
  }
  const pedidos = (await db().query(`update build_requests r set status = 'terminado' where status = 'corriendo'
      and not exists (select 1 from app_builds b where b.request_id = r.id and b.status in ('compilando', 'subido', 'procesando'))
      and coalesce((select max(b.updated_at) from app_builds b where b.request_id = r.id), r.at) < now() - interval '30 minutes'`)).rowCount ?? 0;
  const jti = (await db().query<{ n: number }>(`select ci_oidc_purgar() as n`)).rows[0]?.n ?? 0;
  return { testflight, play: pl, pedidos, jti };
}

/* ── «Pedir un build» (Super Admin › Sistema › Apps › Versiones; solo un Admin con apps:editar, motivo y auditoría) ── */
export async function pedirBuild(s: Staff, x: { app: string; plataforma: string; motivo: string }): Promise<{ ok: boolean; msg: string }> {
  const app = x.app, plat = x.plataforma, motivo = x.motivo.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 300);
  if (!["todas", ...CLAVES_APP].includes(app) || !["ambas", "ios", "android"].includes(plat)) return { ok: false, msg: "Elige la app y la plataforma." };
  if (motivo.length < 3) return { ok: false, msg: "Escribe el motivo: queda en la auditoría." };
  const tope = await valor("tiendas_pedidos_hora");
  const r = await tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtextextended('tiendas:pedir', 0))`);
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from build_requests where at > now() - interval '1 hour'`)).rows[0]?.n ?? 0;
    if (n >= tope) return null;
    const id = (await c.query<{ id: string }>(`insert into build_requests (app, platform, ref, reason, requested_by, is_test) values ($1, $2, $3, $4, $5, $6) returning id::text`,
      [app, plat, PROD ? "produccion" : "pruebas", motivo, s.id, !PROD])).rows[0]!.id;
    await auditar(c, { actor: s.id, action: "tiendas.pedir_build", targetKind: "build_request", targetId: id, after: { app, plataforma: plat, rama: PROD ? "produccion" : "pruebas" }, reason: motivo });
    return id;
  });
  if (!r) return { ok: false, msg: `Ya se pidieron ${tope} builds en la última hora: espera un poco.` };
  const token = await leer("github_token", `Pedir un build · pedido ${r}`).catch(() => null);
  if (!token) {
    await db().query(`update build_requests set status = 'sin_llave', result = 'Falta el token de GitHub en el llavero' where id = $1::bigint`, [r]);
    return { ok: false, msg: "Quedó anotado, pero falta el token de GitHub en Integraciones › Llaves: no se lanzó nada." };
  }
  try {
    const g = await lanzar(URL_GITHUB(), token.toString("utf8").trim(), { repo: REPO.nombre, flujo: "tiendas.yml", ref: PROD ? "produccion" : "pruebas", inputs: { apps: app, plataforma: plat, pedido: r } });
    token.fill(0);
    if (g.status !== 204) {
      await db().query(`update build_requests set status = 'error', result = $2 where id = $1::bigint`, [r, `GitHub: ${g.error}`.slice(0, 200)]);
      return { ok: false, msg: `GitHub no lo aceptó (${g.error}).` };
    }
    await db().query(`update build_requests set status = 'enviado', result = 'GitHub lo aceptó' where id = $1::bigint`, [r]);
    return { ok: true, msg: "Pedido. GitHub empieza el build en un momento: lo ves aquí en vivo." };
  } catch (e) {
    await db().query(`update build_requests set status = 'error', result = $2 where id = $1::bigint`, [r, `Sin respuesta de GitHub: ${String((e as Error)?.message ?? e)}`.slice(0, 200)]);
    return { ok: false, msg: "GitHub no contestó: prueba otra vez en un rato." };
  }
}

/* ── Lo que ve el Super Admin ── */
export type FilaPedido = { id: string; app: string; plat: string; motivo: string; quien: string | null; at: string; estado: string; resultado: string | null; builds: number };
export type EstadoTuberia = { pedidos: FilaPedido[]; llaves: Record<string, boolean>; enCurso: number; ultimaCi: string | null };
export async function estadoTuberia(): Promise<EstadoTuberia> {
  const [p, l, e] = await Promise.all([
    db().query<FilaPedido>(`select r.id::text, r.app, r.platform as plat, r.reason as motivo,
        nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien, ${ISO("r.at")} as at, r.status as estado, r.result as resultado,
        (select count(*)::int from app_builds b where b.request_id = r.id) as builds
       from build_requests r left join users u on u.id = r.requested_by order by r.at desc limit 10`),
    db().query<{ kind: string }>(`select kind from store_secrets where retired_at is null and kind in ('asc_api_key', 'android_upload_keystore', 'play_service_account', 'github_token')`),
    db().query<{ n: number; ultima: string | null }>(`select (select count(*)::int from app_builds where status in ('compilando', 'subido', 'procesando')) as n,
        (select ${ISO("max(at)")} from ci_oidc_log where ok) as ultima`),
  ]);
  const vivas = new Set(l.rows.map((x) => x.kind));
  return { pedidos: p.rows, llaves: { asc_api_key: vivas.has("asc_api_key"), android_upload_keystore: vivas.has("android_upload_keystore"), play_service_account: vivas.has("play_service_account"), github_token: vivas.has("github_token") },
    enCurso: e.rows[0]?.n ?? 0, ultimaCi: e.rows[0]?.ultima ?? null };
}
/* Integraciones › Llaves: cada lectura del CI (con su run) y los intentos rechazados. */
export type LecturaCi = { tipo: string; run: string | null; sha: string | null; para: string; ok: boolean; at: string };
export type IntentoCi = { at: string; ok: boolean; motivo: string; para: string; run: string | null; ref: string | null; detalle: string | null };
export async function lecturasCi(): Promise<{ lecturas: LecturaCi[]; intentos: IntentoCi[] }> {
  const [a, b] = await Promise.all([
    db().query<LecturaCi>(`select s.kind as tipo, r.ci_run as run, r.ci_sha as sha, r.purpose as para, r.ok, ${ISO("r.at")} as at
       from store_secret_reads r join store_secrets s on s.id = r.secret_id where r.by = 'ci' order by r.at desc limit 30`),
    // Los rechazados (lo que hay que mirar) y los últimos que entraron.
    db().query<IntentoCi>(`select ${ISO("at")} as at, ok, motivo, para, run_id as run, ref, detalle from (
        (select * from ci_oidc_log where not ok order by at desc, id desc limit 40) union all (select * from ci_oidc_log where ok order by at desc, id desc limit 10)) x
       order by x.at desc, x.id desc`),
  ]);
  return { lecturas: a.rows, intentos: b.rows };
}
