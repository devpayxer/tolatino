import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { auditar, type Staff } from "./admin";
import { CLAVES_APP, defApp, type ClaveApp } from "./app-nativa-comun";
import { cifrar, descifrar, huella } from "./cifrado";
import { valor } from "./config";
import { normalizarTelefono } from "./cuenta";
import { db, tx } from "./db";
import { ENTORNO } from "./entorno";
import { leer } from "./tiendas/llavero";
import * as asc from "./tiendas/asc";
import { URL_ASC } from "./tiendas/direcciones";

/* 8f · El programa beta (fase8-apps.md §4 8f, §6 #9 y #10): en la Fase 8 SOLO interno, contra el sandbox (el fundador y hasta ~10 personas de
   confianza). Super Admin › Sistema › Apps › Testers (apps:editar, motivo y auditoría; lo revisa cada acción):
   - TestFlight interno (iPhone): por la API de App Store Connect (lib/tiendas/asc.ts) con la llave del llavero. Pide el correo de la cuenta de
     Apple (se guarda CIFRADO; se busca por su huella). Sin la llave subida (Paquete 8-2) queda «sin llave» y sale sola cuando se suba.
   - Play interno (Android): la API de Google Play NO deja agregar un correo (el recurso Testers solo acepta Grupos de Google; el contrato lo
     comprueba): queda «pendiente en Play Console» (paso del fundador, §10) y se marca hecho aquí. Mientras, el APK propio.
   - APK propio (Android): el tester recibe en su campana (y push) un enlace de UN uso a /beta/apk/{ficha}; solo su cuenta lo abre, verlo no lo
     gasta, bajarlo sí, y vence a las apk_enlace_horas. Del enlace solo se guarda la huella.
   Quitar: una vez, con motivo; la API de Apple se pone al día en el barrido si no contestó en el momento. */
type Res = { ok: boolean; msg: string };
const ISO = (c: string) => `to_char((${c}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const PROD = ENTORNO === "produccion";
const CANALES = { testflight: "ios", play_interno: "android", apk_propio: "android" } as const;
type Canal = keyof typeof CANALES;
const esApp = (a: unknown): a is ClaveApp => typeof a === "string" && (CLAVES_APP as string[]).includes(a);
const CANAL_L: Record<Canal, string> = { testflight: "TestFlight interno", play_interno: "Play interno", apk_propio: "APK propio" };
const ESTADO_L: Record<string, string> = { invitado: "Invitado", activo: "Activo", pendiente_consola: "Falta en Play Console", quitado: "Quitado" };
const CORREO = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,180}\.[A-Za-z]{2,24}$/;

/* ── Versiones ── */
export type FilaBuild = { id: string; app: ClaveApp; plat: "ios" | "android"; version: string; build: number; canal: string; estado: string; commit: string | null; ci: string | null;
  size: number | null; sha: string | null; prueba: boolean; at: string; motivo: string | null;
  // 8h · El pedido que lo lanzó, si trae símbolos, el id en App Store Connect, el último envío a la tienda y cuándo cambió.
  pedido: string | null; simbolos: boolean; tienda: string | null; envio: string | null; cambio: string };
export async function versiones(): Promise<FilaBuild[]> {
  return (await db().query<FilaBuild>(
    `select b.id::text, b.app, b.platform as plat, b.version, b.build, b.channel as canal, b.status as estado, b.commit_sha as commit, b.ci_run_url as ci, b.size_bytes::float8 as size, b.sha256 as sha,
            b.is_test as prueba, ${ISO("b.created_at")} as at, coalesce(b.retired_reason, b.fail_reason) as motivo, b.request_id::text as pedido, b.symbols_key is not null as simbolos,
            b.store_build_id as tienda, ${ISO("b.updated_at")} as cambio,
            (select s.result || coalesce(' · ' || s.detail, '') from store_submissions s where s.build_id = b.id order by s.at desc, s.id desc limit 1) as envio
       from app_builds b order by b.app, b.platform, b.created_at desc limit 200`)).rows;
}

/* ── Testers ── */
export type FilaTester = { id: string; nombre: string; tel: string; app: ClaveApp; plat: "ios" | "android"; canal: Canal; estado: string; sync: string; syncError: string | null;
  correo: string | null; quien: string | null; at: string; motivo: string; quitado: string | null; quitadoMotivo: string | null; enlace: { estado: string; vence: string } | null };
const tapaCorreo = (c: string | null) => (c ? c.replace(/^(.)[^@]*(@.).*(\.[a-z]+)$/i, "$1•••$2•••$3") : null);
export async function testers(): Promise<FilaTester[]> {
  const L = (await db().query<Omit<FilaTester, "correo" | "enlace"> & { email_enc: Buffer | null; le: string | null; lv: string | null }>(
    `select t.id::text, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Vecino') as nombre, u.phone as tel,
            t.app, t.platform as plat, t.channel as canal, t.status as estado, t.sync, t.sync_error as "syncError", t.email_enc,
            nullif(trim(coalesce(i.first_name, '') || ' ' || left(coalesce(i.last_name, ''), 1)), '') as quien, ${ISO("t.invited_at")} as at, t.invite_reason as motivo,
            ${ISO("t.removed_at")} as quitado, t.removed_reason as "quitadoMotivo",
            (select case when l.used_at is not null then 'usado' when l.revoked_at is not null then 'anulado' when l.expires_at <= now() then 'vencido' else 'vivo' end
               from apk_links l where l.tester_id = t.id order by l.id desc limit 1) as le,
            (select ${ISO("l.expires_at")} from apk_links l where l.tester_id = t.id order by l.id desc limit 1) as lv
       from beta_testers t join users u on u.id = t.user_id left join users i on i.id = t.invited_by
      order by (t.removed_at is null) desc, t.invited_at desc limit 200`)).rows;
  // El correo se muestra tapado (m•••@g•••.com): lo justo para saber cuál es.
  return L.map(({ email_enc, le, lv, ...x }) => ({ ...x, tel: x.tel.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) •••-$3"), correo: tapaCorreo(descifrar(email_enc)), enlace: le && lv ? { estado: le, vence: lv } : null }));
}

/* La llave de App Store Connect (llavero; cada lectura anotada). Sin llave: null («sin llave»). */
async function credAsc(): Promise<asc.CredAsc | null> {
  const m = (await db().query<{ meta: Record<string, string> }>(`select meta from store_secrets where kind = 'asc_api_key' and retired_at is null`)).rows[0]?.meta;
  if (!m?.id_llave || !m.emisor) return null;
  const b = await leer("asc_api_key", "beta · App Store Connect").catch(() => null);
  return b ? { llavePem: b.toString("utf8"), idLlave: m.id_llave, emisor: m.emisor } : null;
}
const idsAsc = new Map<string, { app: string; grupo: string; at: number }>();
async function appYGrupo(base: string, c: asc.CredAsc, app: ClaveApp) {
  const k = `${base}|${app}`, x = idsAsc.get(k);
  if (x && Date.now() - x.at < 3600_000) return x;
  const id = await asc.appPorBundle(base, c, defApp(app).ios);
  const grupo = id ? await asc.grupoInterno(base, c, id) : null;
  if (!id || !grupo) return null;
  const v = { app: id, grupo, at: Date.now() };
  idsAsc.set(k, v);
  return v;
}

/* Poner al día un tester con Apple: invitar al equipo → (aceptó) → al grupo interno; o, quitado, sacarlo. Nunca lanza. */
export async function sincronizar(id: string): Promise<string> {
  const t = (await db().query<{ id: string; app: ClaveApp; channel: Canal; status: string; email_enc: Buffer | null; inv: string | null; usr: string | null; tst: string | null; fn: string | null; ln: string | null }>(
    `select t.id::text, t.app, t.channel, t.status, t.email_enc, t.asc_invitation_id as inv, t.asc_user_id as usr, t.asc_tester_id as tst, u.first_name as fn, u.last_name as ln
       from beta_testers t join users u on u.id = t.user_id where t.id = $1::bigint`, [id])).rows[0];
  if (!t || t.channel !== "testflight") return "no";
  const guardar = (sync: string, err: string | null, extra: Record<string, string | null> = {}) => {
    const cols = Object.keys(extra), vals = Object.values(extra);
    return db().query(`update beta_testers set sync = $2, sync_error = $3, sync_at = now()${cols.map((k, i) => `, ${k} = $${i + 4}`).join("")} where id = $1::bigint`, [id, sync, err, ...vals]);
  };
  try {
    const c = await credAsc();
    if (!c) { await guardar("sin_llave", null); return "sin_llave"; }
    const base = URL_ASC();
    if (t.status === "quitado") {
      // Al quitar: del grupo; y el usuario que creamos para la prueba (o su invitación pendiente).
      if (t.tst) { const r = await asc.quitarTester(base, c, t.tst); if (r.status !== 204 && r.status !== 404) { await guardar("error", asc.errorDe(r)); return "error"; } }
      if (t.inv && t.usr) { const r = await asc.quitarUsuario(base, c, t.usr); if (r.status !== 204 && r.status !== 404) { await guardar("error", asc.errorDe(r)); return "error"; } }
      else if (t.inv) { const r = await asc.anularInvitacion(base, c, t.inv); if (r.status !== 204 && r.status !== 404) { await guardar("error", asc.errorDe(r)); return "error"; } }
      await guardar("ok", null);
      return "ok";
    }
    const correo = descifrar(t.email_enc);
    if (!correo) { await guardar("error", "sin correo"); return "error"; }
    const ids = await appYGrupo(base, c, t.app);
    if (!ids) { await guardar("error", "La app o su grupo interno de TestFlight no existen todavía en App Store Connect."); return "error"; }
    const nombre = (t.fn ?? "").trim() || "Tester", apellido = (t.ln ?? "").trim() || "To'Latino";
    let usr = t.usr;
    if (!usr) {
      usr = await asc.usuarioPorCorreo(base, c, correo);
      if (!usr) {
        if (t.inv) { await guardar("ok", null); return "esperando"; }   // invitado: falta que acepte el correo de Apple
        const r = await asc.invitarUsuario(base, c, { correo, nombre, apellido, appId: ids.app });
        if (!r.id) { await guardar("error", asc.errorDe(r.r)); return "error"; }
        await guardar("ok", null, { asc_invitation_id: r.id });
        return "invitado";
      }
      await db().query(`update beta_testers set asc_user_id = $2, accepted_at = coalesce(accepted_at, now()) where id = $1::bigint`, [id, usr]);
    }
    if (!t.tst) {
      const r = await asc.agregarTester(base, c, { correo, nombre, apellido, grupoId: ids.grupo });
      if (!r.id) { await guardar("error", asc.errorDe(r.r)); return "error"; }
      await guardar("ok", null, { asc_tester_id: r.id, status: "activo" });
      return "activo";
    }
    await guardar("ok", null);
    return "ok";
  } catch (e) {
    await guardar("error", String((e as Error)?.message ?? e).slice(0, 200)).catch(() => undefined);
    return "error";
  }
}

/* El barrido: los invitados que esperan (cada 10 min), lo que quedó pendiente o con error (cada 2 min) y los quitados que Apple no confirmó. */
export async function barrerBeta(lim = 20): Promise<{ revisados: number }> {
  const L = (await db().query<{ id: string }>(
    `select id::text from beta_testers where channel = 'testflight' and (
        (sync in ('pendiente', 'error', 'sin_llave') and coalesce(sync_at, '-infinity') < now() - interval '2 minutes')
     or (status = 'invitado' and sync = 'ok' and coalesce(sync_at, '-infinity') < now() - interval '10 minutes'))
      order by sync_at nulls first limit $1`, [lim])).rows;
  for (const x of L) await sincronizar(x.id);
  return { revisados: L.length };
}

/* ── Invitar y quitar (Super Admin) ── */
export async function invitar(s: Staff, x: { telefono: string; app: string; canal: string; correo: string; motivo: string }): Promise<Res & { enlace?: boolean }> {
  const canal = x.canal as Canal, m = x.motivo.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 300), correo = x.correo.trim().toLowerCase().slice(0, 254);
  if (!esApp(x.app)) return { ok: false, msg: "Esa app no existe." };
  if (!Object.hasOwn(CANALES, canal)) return { ok: false, msg: "Elige por dónde: TestFlight, Play interno o el APK propio." };
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en la auditoría." };
  const tel = normalizarTelefono(x.telefono);
  if (!tel) return { ok: false, msg: "Escribe el teléfono de su cuenta de To'Latino (10 números)." };
  if (canal === "testflight" && !CORREO.test(correo)) return { ok: false, msg: "TestFlight necesita el correo de su cuenta de Apple: escríbelo aquí." };
  const plat = CANALES[canal];
  const r = await tx(async (c) => {
    const u = (await c.query<{ id: string; city: string | null }>(`select id::text, home_city_id as city from users where phone = $1 and status = 'active'`, [tel])).rows[0];
    if (!u) return { ok: false as const, msg: "No hay una cuenta activa con ese teléfono." };
    const ya = (await c.query(`select 1 from beta_testers where user_id = $1 and app = $2 and platform = $3 and removed_at is null`, [u.id, x.app, plat])).rowCount;
    if (ya) return { ok: false as const, msg: "Esa cuenta ya prueba esa app en ese teléfono." };
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from beta_testers where removed_at is null`)).rows[0]!.n;
    if (n >= 100) return { ok: false as const, msg: "Ya hay 100 testers (el tope de TestFlight interno). Quita a alguien primero." };
    const t = (await c.query<{ id: string }>(
      `insert into beta_testers (user_id, city_id, app, platform, channel, email_enc, email_hash, status, sync, invited_by, invite_reason, is_test)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id::text`,
      [u.id, u.city, x.app, plat, canal, canal === "testflight" ? cifrar(correo) : null, canal === "testflight" ? huella(`beta:${correo}`) : null,
        canal === "testflight" ? "invitado" : canal === "play_interno" ? "pendiente_consola" : "activo", canal === "testflight" ? "pendiente" : "ok", s.id, m, !PROD])).rows[0]!;
    await auditar(c, { actor: s.id, action: "beta.invitar", targetKind: "beta_tester", targetId: t.id, city: u.city, after: { app: defApp(x.app as ClaveApp).nombre.es, plataforma: plat === "ios" ? "iPhone" : "Android", canal: CANAL_L[canal] }, reason: m });
    return { ok: true as const, id: t.id, user: u.id };
  });
  if (!r.ok) return r;
  const { avisar } = await import("./avisos");
  const nombre = defApp(x.app).nombre.es;
  if (canal === "testflight") {
    const e = await sincronizar(r.id);
    await avisar(r.user, "beta_testflight", { app: nombre }, { href: "/cuenta", ref: ["beta", r.id], sinSms: true });
    return { ok: true, msg: e === "sin_llave" ? "Invitado. Falta la llave de App Store Connect (Paquete 8-2): la invitación sale sola cuando se suba." : e === "error" ? "Invitado aquí; Apple no contestó bien. Se reintenta solo (mira el estado)." : "Invitado: Apple le manda el correo para unirse al equipo." };
  }
  if (canal === "play_interno") return { ok: true, msg: "Anotado. Play no deja agregar correos por la API: agrégalo a la lista de Play interno (Paquete 8-2) y marca «Ya está en la lista». Mientras, puede usar el APK propio." };
  const e = await enlace(s, r.id, m);
  return e.ok ? { ok: true, msg: "Invitado: le llegó el enlace de un uso para bajar el APK de prueba.", enlace: true } : { ok: true, msg: `Invitado. ${e.msg}` };
}

/* Un enlace nuevo de un uso al último APK disponible (anula el anterior que siga vivo). Lo recibe el tester en su aviso. */
export async function enlace(s: Staff, testerId: string, motivo?: string): Promise<Res> {
  if (!/^\d{1,18}$/.test(testerId)) return { ok: false, msg: "Ese tester no existe." };
  const ficha = randomBytes(32).toString("base64url"), horas = await valor("apk_enlace_horas");
  const r = await tx(async (c) => {
    const t = (await c.query<{ user_id: string; app: ClaveApp; city: string | null }>(`select user_id::text, app, city_id as city from beta_testers where id = $1::bigint and channel = 'apk_propio' and removed_at is null for update`, [testerId])).rows[0];
    if (!t) return { ok: false as const, msg: "Ese tester ya no está o no usa el APK propio." };
    const b = (await c.query<{ id: string; version: string; build: number }>(
      `select id::text, version, build from app_builds where app = $1 and platform = 'android' and channel = 'apk_propio' and status = 'disponible' order by build desc limit 1`, [t.app])).rows[0];
    if (!b) return { ok: false as const, msg: "Todavía no hay un APK disponible de esa app: el enlace sale cuando el CI suba uno (8h)." };
    await c.query(`update apk_links set revoked_at = now() where tester_id = $1::bigint and used_at is null and revoked_at is null`, [testerId]);
    await c.query(`insert into apk_links (tester_id, build_id, token_hash, created_by, expires_at) values ($1::bigint, $2::bigint, $3, $4, now() + make_interval(hours => $5))`,
      [testerId, b.id, createHash("sha256").update(ficha).digest("hex"), s.id, horas]);
    await auditar(c, { actor: s.id, action: "beta.enlace_apk", targetKind: "beta_tester", targetId: testerId, city: t.city, after: { build: `${b.version} (${b.build})`, horas }, reason: motivo || null });
    return { ok: true as const, user: t.user_id, app: t.app };
  });
  if (!r.ok) return r;
  const { avisar } = await import("./avisos");
  await avisar(r.user, "beta_apk", { app: defApp(r.app).nombre.es, horas }, { href: `/beta/apk/${ficha}`, ref: ["beta", testerId], sinSms: true });
  return { ok: true, msg: "Enlace nuevo enviado: sirve una vez." };
}

export async function marcarEnPlay(s: Staff, testerId: string, motivo: string): Promise<Res> {
  if (!/^\d{1,18}$/.test(testerId)) return { ok: false, msg: "Ese tester no existe." };
  return tx(async (c) => {
    const t = (await c.query<{ city: string | null }>(`select city_id as city from beta_testers where id = $1::bigint and channel = 'play_interno' and status = 'pendiente_consola' for update`, [testerId])).rows[0];
    if (!t) return { ok: false, msg: "Ese tester no está pendiente en Play Console." };
    await c.query(`update beta_testers set status = 'activo', accepted_at = now(), sync_at = now() where id = $1::bigint`, [testerId]);
    await auditar(c, { actor: s.id, action: "beta.en_play", targetKind: "beta_tester", targetId: testerId, city: t.city, after: { estado: "Activo (en la lista de Play)" }, reason: motivo });
    return { ok: true, msg: "Listo: ya está en la lista de Play interno." };
  });
}

export async function quitar(s: Staff, testerId: string, motivo: string): Promise<Res> {
  if (!/^\d{1,18}$/.test(testerId)) return { ok: false, msg: "Ese tester no existe." };
  const m = motivo.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 300);
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en la auditoría." };
  const r = await tx(async (c) => {
    const t = (await c.query<{ user_id: string; app: ClaveApp; channel: Canal; city: string | null; status: string }>(
      `select user_id::text, app, channel, city_id as city, status from beta_testers where id = $1::bigint and removed_at is null for update`, [testerId])).rows[0];
    if (!t) return { ok: false as const, msg: "Ese tester ya no estaba." };
    await c.query(`update beta_testers set status = 'quitado', removed_at = now(), removed_by = $2, removed_reason = $3, sync = case when channel = 'testflight' then 'pendiente' else 'ok' end where id = $1::bigint`, [testerId, s.id, m]);
    await c.query(`update apk_links set revoked_at = now() where tester_id = $1::bigint and used_at is null and revoked_at is null`, [testerId]);
    await auditar(c, { actor: s.id, action: "beta.quitar", targetKind: "beta_tester", targetId: testerId, city: t.city, before: { estado: ESTADO_L[t.status] ?? "—", canal: CANAL_L[t.channel] }, after: { estado: "Quitado" }, reason: m });
    return { ok: true as const, t };
  });
  if (!r.ok) return r;
  let msg = "Quitado.";
  if (r.t.channel === "testflight") { const e = await sincronizar(testerId); msg = e === "ok" ? "Quitado: Apple ya lo sacó de TestFlight." : e === "sin_llave" ? "Quitado aquí. Sin la llave de App Store Connect, Apple se pone al día cuando se suba." : "Quitado aquí; Apple no contestó bien. Se reintenta solo."; }
  if (r.t.channel === "play_interno" && r.t.status === "activo") msg = "Quitado. Sácalo también de la lista de Play interno (Play no lo deja hacer por la API).";
  const { avisar } = await import("./avisos");
  await avisar(r.t.user_id, "beta_quitado", { app: defApp(r.t.app).nombre.es }, { ref: ["beta", testerId], sinSms: true });
  return { ok: true, msg };
}

/* ── El enlace de un uso (/beta/apk/{ficha}) ── */
export type EnlaceApk = { estado: "vivo" | "usado" | "vencido" | "anulado"; app: ClaveApp; version: string; build: number; size: number | null; sha: string | null; vence: string };
const huellaFicha = (f: string) => (/^[A-Za-z0-9_-]{43}$/.test(f) ? createHash("sha256").update(f).digest("hex") : null);
/* Verlo NO lo gasta (una vista previa de un mensajero tampoco). Solo la cuenta del tester; para cualquier otra, no existe. */
export async function verEnlace(ficha: string, userId: string): Promise<EnlaceApk | null> {
  const h = huellaFicha(ficha);
  if (!h) return null;
  return (await db().query<EnlaceApk>(
    `select case when l.used_at is not null then 'usado' when l.revoked_at is not null or t.removed_at is not null then 'anulado' when l.expires_at <= now() then 'vencido' else 'vivo' end as estado,
            b.app, b.version, b.build, b.size_bytes::float8 as size, b.sha256 as sha, ${ISO("l.expires_at")} as vence
       from apk_links l join beta_testers t on t.id = l.tester_id join app_builds b on b.id = l.build_id
      where l.token_hash = $1 and t.user_id = $2`, [h, userId])).rows[0] ?? null;
}
/* Bajarlo SÍ lo gasta: primero se lee el archivo y se comprueba su huella sha256; después se gasta el enlace en UNA escritura condicionada
   (dos descargas a la vez: solo una lo entrega). Si el archivo falla, el enlace sigue vivo. */
export async function bajarApk(ficha: string, userId: string): Promise<{ ok: true; archivo: Buffer; nombre: string } | { ok: false; status: number }> {
  const h = huellaFicha(ficha);
  if (!h) return { ok: false, status: 404 };
  const l = (await db().query<{ id: string; key: string | null; sha: string | null; prueba: boolean; app: ClaveApp; version: string; build: number; vivo: boolean }>(
    `select l.id::text, b.artifact_key as key, b.sha256 as sha, b.is_test as prueba, b.app, b.version, b.build,
            l.used_at is null and l.revoked_at is null and t.removed_at is null and l.expires_at > now() and b.status = 'disponible' as vivo
       from apk_links l join beta_testers t on t.id = l.tester_id join app_builds b on b.id = l.build_id
      where l.token_hash = $1 and t.user_id = $2`, [h, userId])).rows[0];
  if (!l) return { ok: false, status: 404 };
  if (!l.vivo || !l.key || !l.sha) return { ok: false, status: 410 };
  const { guardarObjeto, leerObjeto, mediosListos } = await import("./medios");
  if (!mediosListos()) return { ok: false, status: 503 };
  let b = await leerObjeto(l.key).catch(() => null);
  if (!b && l.prueba && !PROD) {
    const { apkDePrueba } = await import("./tiendas/apk-prueba");
    b = apkDePrueba();
    await guardarObjeto(l.key, b, "application/vnd.android.package-archive").catch(() => undefined);
  }
  if (!b || createHash("sha256").update(b).digest("hex") !== l.sha) return { ok: false, status: 409 };
  const gastado = (await db().query(`update apk_links set used_at = now() where id = $1::bigint and used_at is null and revoked_at is null and expires_at > now()`, [l.id])).rowCount;
  if (!gastado) return { ok: false, status: 410 };
  return { ok: true, archivo: b, nombre: `tolatino-${defApp(l.app).android.split(".").pop()}-${l.version}-${l.build}.apk` };
}
