import "server-only";
import { createHash } from "node:crypto";
import { auditar, type Staff } from "../admin";
import { CLAVES_APP, defApp, type ClaveApp } from "../app-nativa-comun";
import { db, tx } from "../db";
import { ENTORNO } from "../entorno";
import APPS from "../../../mobile/apps.json";
import DECL from "../../../mobile/tiendas/declaraciones.json";
import FICHAS from "../../../mobile/tiendas/fichas.json";
import * as asc from "./asc";
import { URL_ASC, URL_PLAY, URL_PLAY_OAUTH } from "./direcciones";
import { leer } from "./llavero";
import type { Claims } from "./oidc";
import * as play from "./play";
import { codigoFijo, CODE_REF, faseNueve, FLAG_REVISION, revisionEncendida } from "./revision";

/* 8i · Las fichas de las tiendas, sus capturas y las cuentas de revisión, del lado del servidor (fase8-apps.md §4 8i).
   - El repo es la fuente de las fichas (apps/mobile/tiendas/{app}/{es,en}.md → fichas.json); «Subir como borrador» (Super Admin › Sistema ›
     Apps › Fichas y revisión, solo un Admin, con motivo y tope por día) las manda a App Store Connect (la versión EN PREPARACIÓN: localizaciones,
     clasificación por edad y notas para la revisión con la cuenta de revisión) y a Google Play (una edición confirmada con
     changesNotSentForReview=true), y copia lo enviado en store_listings con la huella del .md. NADA se envía a revisión (Fase 9).
   - Sin la llave de la API de Apple o la cuenta de servicio de Google en el llavero: esa tienda queda «SIN LLAVE» y no se toca nada.
   - Las capturas las hace el CI (tiendas.yml, job «capturas») y entran por la tubería con OIDC (/api/tiendas/archivo?tipo=captura) al almacén
     privado (store_screenshots); se suben con la ficha. */
type Bi = { es: string; en: string };
type Ficha = (typeof FICHAS.fichas)[number];
const ISO = (c: string) => `to_char((${c}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
export const TIENDAS = ["apple", "google"] as const;
export type Tienda = (typeof TIENDAS)[number];
export const LOCALES: Record<Tienda, readonly string[]> = { apple: ["es-MX", "en-US"], google: ["es-US", "en-US"] };
export const PANTALLA = { apple: { clase: "iphone_69", tipoAsc: "APP_IPHONE_67", ancho: 1320, alto: 2868 }, google: { clase: "android_phone", ancho: 1080, alto: 2400 } } as const;

/* Las direcciones de privacidad y soporte que se dan a las tiendas (las del servidor de este entorno; producción en la Fase 9). */
export function urlsTienda(): { privacidad: string; soporte: string; borrar: string } {
  const base = (APPS.servidor as Record<string, string>)[ENTORNO === "produccion" ? "produccion" : "pruebas"]!.replace(/\/$/, "");
  return { privacidad: `${base}/privacidad`, soporte: `${base}/soporte`, borrar: `${base}/cuenta/ajustes/borrar` };
}
const fichaDe = (app: ClaveApp, idioma: "es" | "en"): Ficha => FICHAS.fichas.find((f) => f.app === app && f.idioma === idioma)!;

/* ── Lo que ve el Super Admin ── */
export type FilaFicha = { app: ClaveApp; tienda: Tienda; locale: string; idioma: "es" | "en"; sha: string; titulo: string; subido: { sha: string; at: string; result: string; detail: string | null } | null; capturas: number };
export type FilaRevision = { id: string; app: ClaveApp; tel: string; activa: boolean; negocio: string | null; secreto: boolean; codeRef: string; ultimo: { kind: string; motivo: string | null; at: string } | null; entradas7: number };
export type EstadoFichas = { fichas: FilaFicha[]; revision: FilaRevision[]; interruptor: boolean; encendida: boolean; produccion: boolean; llaves: { apple: boolean; google: boolean }; subidasHoy: number; tope: number; urls: ReturnType<typeof urlsTienda> };
export async function estadoFichas(): Promise<EstadoFichas> {
  const [u, cap, rv, fl, ll, hoy, tope] = await Promise.all([
    db().query<{ app: ClaveApp; store: Tienda; locale: string; sha256: string; at: string; result: string; detail: string | null }>(
      `select distinct on (app, store, locale) app, store, locale, sha256, ${ISO("pushed_at")} as at, result, detail from store_listings order by app, store, locale, pushed_at desc`),
    db().query<{ app: string; store: string; locale: string; n: number }>(`select app, store, locale, count(distinct ord)::int as n from store_screenshots group by 1, 2, 3`),
    db().query<{ id: string; app: ClaveApp; phone: string; active: boolean; negocio: string | null; code_ref: string; kind: string | null; motivo: string | null; at: string | null; n7: number }>(
      `select r.id::text, r.app, u.phone, r.active, b.name as negocio, r.code_ref, l.kind, l.motivo, ${ISO("l.at")} as at,
              (select count(*)::int from review_account_log x where x.account_id = r.id and x.kind = 'entro' and x.at > now() - interval '7 days') as n7
         from review_accounts r join users u on u.id = r.user_id left join businesses b on b.id = r.business_id
         left join lateral (select kind, motivo, at from review_account_log x where x.account_id = r.id order by at desc limit 1) l on true order by r.id`),
    db().query<{ enabled: boolean }>(`select enabled from feature_flags where key = $1`, [FLAG_REVISION]),
    db().query<{ kind: string }>(`select kind from store_secrets where retired_at is null and kind in ('asc_api_key', 'play_service_account')`),
    db().query<{ n: number }>(`select count(*)::int as n from audit_entries where action = 'fichas.subir' and at > now() - interval '1 day'`),
    db().query<{ v: number }>(`select cfg_int('fichas_subidas_dia') as v`),
  ]);
  const fichas: FilaFicha[] = [];
  for (const app of CLAVES_APP) for (const tienda of TIENDAS) for (const [i, locale] of LOCALES[tienda].entries()) {
    const idioma = i === 0 ? "es" : "en", f = fichaDe(app, idioma), s = u.rows.find((x) => x.app === app && x.store === tienda && x.locale === locale);
    fichas.push({ app, tienda, locale, idioma, sha: f.sha256, titulo: f.apple.name, subido: s ? { sha: s.sha256, at: s.at, result: s.result, detail: s.detail } : null,
      capturas: cap.rows.find((x) => x.app === app && x.store === tienda && x.locale === locale)?.n ?? 0 });
  }
  return { fichas, interruptor: fl.rows[0]?.enabled === true, encendida: await revisionEncendida(), produccion: ENTORNO === "produccion",
    revision: rv.rows.map((x) => ({ id: x.id, app: x.app, tel: `(•••) •••-${x.phone.slice(-4)}`, activa: x.active, negocio: x.negocio, secreto: !!codigoFijo(x.code_ref), codeRef: x.code_ref,
      ultimo: x.kind ? { kind: x.kind, motivo: x.motivo, at: x.at! } : null, entradas7: x.n7 })),
    llaves: { apple: ll.rows.some((x) => x.kind === "asc_api_key"), google: ll.rows.some((x) => x.kind === "play_service_account") },
    subidasHoy: hoy.rows[0]?.n ?? 0, tope: tope.rows[0]?.v ?? 6, urls: urlsTienda() };
}

/* ── Las capturas que llegan del CI (por la tubería con OIDC; /api/tiendas/archivo?tipo=captura) ── */
const PNG = (b: Buffer) => b.length > 24 && b.readUInt32BE(0) === 0x89504e47 && b.toString("latin1", 12, 16) === "IHDR";
export async function registrarCaptura(c: Claims, q: URLSearchParams, cuerpo: Buffer, shaDicho: string | null): Promise<{ status: number; json: Record<string, unknown> }> {
  const app = q.get("app") as ClaveApp, tienda = q.get("tienda") as Tienda, locale = String(q.get("idioma") ?? ""), ord = Number(q.get("orden"));
  if (!CLAVES_APP.includes(app) || !TIENDAS.includes(tienda) || !LOCALES[tienda]?.includes(locale) || !Number.isInteger(ord) || ord < 1 || ord > 8 || !shaDicho || !/^[a-f0-9]{64}$/.test(shaDicho))
    return { status: 400, json: { ok: false, msg: "app, tienda (apple | google), idioma, orden (1–8) y la cabecera x-tl-sha256" } };
  const sha = createHash("sha256").update(cuerpo).digest("hex");
  if (sha !== shaDicho) return { status: 422, json: { ok: false, msg: "El sha256 de la captura no coincide con el que dijo el CI." } };
  if (!PNG(cuerpo) || cuerpo.length > 8 * 1024 * 1024) return { status: 422, json: { ok: false, msg: "La captura es un PNG de hasta 8 MB." } };
  const ancho = cuerpo.readUInt32BE(16), alto = cuerpo.readUInt32BE(20), P = PANTALLA[tienda];
  if (ancho !== P.ancho || alto !== P.alto) return { status: 422, json: { ok: false, msg: `La captura de ${tienda} mide ${P.ancho}×${P.alto} (llegó ${ancho}×${alto}).` } };
  const { guardarObjeto, mediosListos } = await import("../medios");
  if (!mediosListos()) return { status: 503, json: { ok: false, msg: "El almacén no está listo." } };
  const clave = `privado/capturas/${app}-${tienda}-${locale.toLowerCase()}-${ord}-${sha.slice(0, 16)}.png`;
  const ya = (await db().query(`select 1 from store_screenshots where media_key = $1`, [clave])).rowCount;
  if (!ya) {
    await guardarObjeto(clave, cuerpo, "image/png");
    await db().query(`insert into store_screenshots (app, store, device_class, locale, ord, media_key, sha256, width, height, bytes, commit_sha, run_id, source)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ci') on conflict (media_key) do nothing`,
      [app, tienda, P.clase, locale, ord, clave, sha, ancho, alto, cuerpo.length, /^[a-f0-9]{40}$/.test(c.sha) ? c.sha : null, /^\d{1,20}$/.test(c.run_id) ? c.run_id : null]);
  }
  return { status: 200, json: { ok: true, clave: clave.replace(/^privado\//, ""), nueva: !ya } };
}
/* Las últimas capturas de una app, tienda e idioma, en orden (una por posición: la más nueva). */
async function capturasDe(app: ClaveApp, tienda: Tienda, locale: string): Promise<{ id: string; ord: number; key: string }[]> {
  return (await db().query<{ id: string; ord: number; key: string }>(`select distinct on (ord) id::text, ord, media_key as key from store_screenshots
     where app = $1 and store = $2 and locale = $3 order by ord, created_at desc`, [app, tienda, locale])).rows;
}

/* ── Subir como borrador ── */
async function credAsc(): Promise<asc.CredAsc | null> {
  const m = (await db().query<{ meta: Record<string, string> }>(`select meta from store_secrets where kind = 'asc_api_key' and retired_at is null`)).rows[0]?.meta;
  if (!m?.id_llave || !m.emisor) return null;
  const b = await leer("asc_api_key", "fichas · subir como borrador").catch(() => null);
  return b ? { llavePem: b.toString("utf8"), idLlave: m.id_llave, emisor: m.emisor } : null;
}
async function anotarFicha(app: ClaveApp, tienda: Tienda, f: Ficha, locale: string, by: string, result: "borrador" | "error", detail: string | null) {
  const U = urlsTienda(), A = tienda === "apple";
  await db().query(`insert into store_listings (app, store, locale, title, subtitle, short_desc, description, keywords, promo, whats_new, privacy_url, support_url, sha256, result, detail, pushed_by)
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [app, tienda, locale, f.apple.name, A ? f.apple.subtitle : null, A ? null : f.google.shortDescription, f.apple.description, A ? f.apple.keywords : null, A ? f.apple.promotionalText : null,
      A ? f.apple.whatsNew : f.google.recentChanges, U.privacidad, U.soporte, f.sha256, result, detail?.slice(0, 300) ?? null, by]);
}
/* La cuenta de revisión que se le da a Apple (solo si existe, está activa, con su secreto y las cuentas encendidas; si no, ninguna). */
async function cuentaParaApple(app: ClaveApp): Promise<{ tel: string; codigo: string } | null> {
  const r = (await db().query<{ phone: string; code_ref: string; active: boolean }>(`select u.phone, r.code_ref, r.active from review_accounts r join users u on u.id = r.user_id where r.app = $1 and r.active order by r.id limit 1`, [app])).rows[0];
  const codigo = r && CODE_REF.test(r.code_ref) ? codigoFijo(r.code_ref) : null;
  return r && codigo && (await revisionEncendida()) ? { tel: r.phone.replace(/^\+1/, ""), codigo } : null;
}
export type ResSubir = { ok: boolean; msg: string; detalle: { app: ClaveApp; tienda: Tienda; estado: "borrador" | "sin_llave" | "sin_version" | "error"; nota: string }[] };
export async function subirFichas(s: Staff, x: { app: string; motivo: string }): Promise<ResSubir> {
  const apps = x.app === "todas" ? CLAVES_APP : CLAVES_APP.includes(x.app as ClaveApp) ? [x.app as ClaveApp] : [];
  const motivo = String(x.motivo ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 300);
  if (!apps.length) return { ok: false, msg: "Esa app no existe.", detalle: [] };
  if (motivo.length < 3) return { ok: false, msg: "Escribe el motivo: queda en la auditoría.", detalle: [] };
  const e = await estadoFichas();
  if (e.subidasHoy >= e.tope) return { ok: false, msg: `Ya se subieron las fichas ${e.subidasHoy} veces hoy (tope ${e.tope}, Configuración › Apps).`, detalle: [] };
  await tx((c) => auditar(c, { actor: s.id, action: "fichas.subir", targetKind: "store_listings", targetId: x.app, after: { apps }, reason: motivo }));
  const detalle: ResSubir["detalle"] = [];
  const { leerObjeto } = await import("../medios");
  // Apple: la versión en preparación de cada app.
  const cred = e.llaves.apple ? await credAsc() : null;
  for (const app of apps) {
    if (!cred) { detalle.push({ app, tienda: "apple", estado: "sin_llave", nota: "Falta la llave de la API de App Store Connect (Paquete 8-2)." }); continue; }
    try {
      const appId = await asc.appPorBundle(URL_ASC(), cred, defApp(app).ios);
      if (!appId) { detalle.push({ app, tienda: "apple", estado: "sin_version", nota: "La app no existe en App Store Connect (Paquete 8-2: «Nueva app»)." }); continue; }
      const ver = await asc.versionEnPreparacion(URL_ASC(), cred, appId);
      if (ver === "error" || !ver) { detalle.push({ app, tienda: "apple", estado: ver ? "error" : "sin_version", nota: ver ? "Apple no contestó bien." : "No hay una versión en preparación: no se toca nada." }); continue; }
      const malos: string[] = [];
      for (const [i, locale] of LOCALES.apple.entries()) {
        const f = fichaDe(app, i === 0 ? "es" : "en"), U = urlsTienda();
        const r = await asc.subirFichaAsc(URL_ASC(), cred, { appId, versionId: ver, ficha: { locale, name: f.apple.name, subtitle: f.apple.subtitle, privacyPolicyUrl: U.privacidad, description: f.apple.description,
          keywords: f.apple.keywords, promotionalText: f.apple.promotionalText, whatsNew: f.apple.whatsNew, supportUrl: U.soporte } });
        await anotarFicha(app, "apple", f, locale, s.id, r.ok ? "borrador" : "error", r.ok ? null : r.error);
        if (!r.ok) { malos.push(r.error); continue; }
        const L = await capturasDe(app, "apple", locale);
        if (L.length) {
          const archivos = await Promise.all(L.map(async (k) => ({ nombre: `${app}-${locale}-${k.ord}.png`, datos: await leerObjeto(k.key) })));
          const cs = await asc.subirCapturasAsc(URL_ASC(), cred, { versionId: ver, locale, tipo: PANTALLA.apple.tipoAsc, archivos });
          if (!cs.ok) malos.push(cs.error);
          else if (!cs.igual) for (const [j, k] of L.entries()) await db().query(`update store_screenshots set pushed_at = now(), store_ref = $2 where id = $1::bigint and pushed_at is null`, [k.id, cs.ids[j] ?? null]);
        }
      }
      const edad = (DECL.edadApple as unknown as Record<string, Record<string, string | boolean>>)[app];
      if (edad) { const r = await asc.ponerEdadAsc(URL_ASC(), cred, appId, edad); if (r.status !== 200) malos.push(`clasificación: ${asc.errorDe(r)}`); }
      const cta = await cuentaParaApple(app);
      const rv = await asc.ponerRevisionAsc(URL_ASC(), cred, ver, { notas: (DECL.notas as Record<string, Bi>)[app]!.en, cuenta: cta?.tel ?? null, codigo: cta?.codigo ?? null });
      if (rv.status !== 200 && rv.status !== 201) malos.push(`notas para la revisión: ${asc.errorDe(rv)}`);
      detalle.push({ app, tienda: "apple", estado: malos.length ? "error" : "borrador", nota: malos.length ? malos.join(" · ").slice(0, 200) : `Ficha, capturas, clasificación y notas en la versión en preparación${cta ? " (con la cuenta de revisión)" : ""}.` });
    } catch (err) { detalle.push({ app, tienda: "apple", estado: "error", nota: String((err as Error)?.message ?? err).slice(0, 200) }); }
  }
  // Google: una edición por app, confirmada sin mandarla a revisión.
  const sa = e.llaves.google ? await leer("play_service_account", "fichas · subir como borrador").catch(() => null) : null;
  let token: string | null = null;
  let cuentaTxt: string | null = null;
  if (sa) { try { cuentaTxt = sa.toString("utf8"); sa.fill(0); token = await play.tokenPlay(URL_PLAY_OAUTH(), JSON.parse(cuentaTxt) as play.CuentaPlay); } catch { token = null; } }
  for (const app of apps) {
    if (!token) { detalle.push({ app, tienda: "google", estado: "sin_llave", nota: sa ? "Google no dio token con la cuenta de servicio." : "Falta la cuenta de servicio de Google Play (Paquete 8-2)." }); continue; }
    try {
      const fichas = LOCALES.google.map((language, i) => { const f = fichaDe(app, i === 0 ? "es" : "en"); return { language, title: f.google.title, shortDescription: f.google.shortDescription, fullDescription: f.google.fullDescription }; });
      const caps = await Promise.all(LOCALES.google.map(async (language) => ({ language, L: await capturasDe(app, "google", language) })));
      const datos = { pkg: defApp(app).android, fichas, capturas: await Promise.all(caps.map(async (c) => ({ language: c.language, archivos: await Promise.all(c.L.map((k) => leerObjeto(k.key))) }))) };
      let r = await play.subirFichasPlay(URL_PLAY(), token, datos);
      // Un token que Google ya no acepta (401): se pide otro una vez.
      if (!r.ok && / 401 /.test(r.error) && sa) { play.olvidarTokenPlay(); const t2 = await play.tokenPlay(URL_PLAY_OAUTH(), JSON.parse(cuentaTxt!) as play.CuentaPlay).catch(() => null); if (t2) { token = t2; r = await play.subirFichasPlay(URL_PLAY(), token, datos); } }
      for (const [i, locale] of LOCALES.google.entries()) await anotarFicha(app, "google", fichaDe(app, i === 0 ? "es" : "en"), locale, s.id, r.ok ? "borrador" : "error", r.ok ? null : r.error);
      if (r.ok) for (const c of caps) for (const k of c.L) await db().query(`update store_screenshots set pushed_at = now(), store_ref = $2 where id = $1::bigint and pushed_at is null`, [k.id, `edicion ${r.edicion}`.slice(0, 120)]);
      detalle.push({ app, tienda: "google", estado: r.ok ? "borrador" : "error", nota: r.ok ? "Ficha y capturas confirmadas sin enviar a revisión." : r.error.slice(0, 200) });
    } catch (err) { detalle.push({ app, tienda: "google", estado: "error", nota: String((err as Error)?.message ?? err).slice(0, 200) }); }
  }
  const n = detalle.filter((d) => d.estado === "borrador").length;
  return { ok: true, msg: n ? `Subido como borrador: ${n} de ${detalle.length}. Nada se envió a revisión.` : "No se subió nada: mira el detalle de cada tienda.", detalle };
}

/* ── Las cuentas de revisión: activar o desactivar una y el interruptor (solo un Admin, con motivo y auditoría) ── */
export async function cambiarCuentaRevision(s: Staff, id: string, activar: boolean, motivo: string): Promise<{ ok: boolean; msg: string }> {
  const m = String(motivo ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 300);
  if (!/^\d{1,18}$/.test(String(id))) return { ok: false, msg: "Esa cuenta no existe." };
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en la auditoría." };
  return tx(async (c) => {
    const r = (await c.query<{ id: number; app: string; active: boolean }>(`select id, app, active from review_accounts where id = $1::bigint for update`, [id])).rows[0];
    if (!r) return { ok: false, msg: "Esa cuenta no existe." };
    if (r.active === activar) return { ok: false, msg: activar ? "Ya está activa." : "Ya está desactivada." };
    await c.query(`update review_accounts set active = $2 where id = $1`, [r.id, activar]);
    await c.query(`insert into review_account_log (account_id, kind, motivo, by_user) values ($1, $2, $3, $4)`, [r.id, activar ? "activada" : "desactivada", m.slice(0, 200), s.id]);
    // Desactivar corta también los códigos vigentes (y verificarCodigo lo vuelve a revisar).
    if (!activar) await c.query(`update otp_codes set used_at = now() where channel = 'revision' and used_at is null and phone = (select u.phone from users u join review_accounts x on x.user_id = u.id where x.id = $1)`, [r.id]);
    await auditar(c, { actor: s.id, action: activar ? "revision.activar" : "revision.desactivar", targetKind: "review_account", targetId: String(r.id), before: { activa: r.active }, after: { activa: activar }, reason: m });
    return { ok: true, msg: activar ? "Cuenta de revisión activa." : "Cuenta de revisión desactivada: su código ya no sirve." };
  });
}
export async function cambiarInterruptorRevision(s: Staff, encender: boolean, motivo: string): Promise<{ ok: boolean; msg: string }> {
  const m = String(motivo ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 300);
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en la auditoría." };
  if (encender && ENTORNO === "produccion") {
    if (!(await faseNueve())) return { ok: false, msg: "En producción, las cuentas de revisión esperan la Fase 9 (el envío a revisión pública)." };
  }
  return tx(async (c) => {
    const a = (await c.query<{ enabled: boolean }>(`select enabled from feature_flags where key = $1 for update`, [FLAG_REVISION])).rows[0];
    if (!a) return { ok: false, msg: "Ese interruptor no existe." };
    if (a.enabled === encender) return { ok: false, msg: encender ? "Ya están encendidas." : "Ya están apagadas." };
    await c.query(`update feature_flags set enabled = $2, note = $3, updated_at = now(), updated_by = $4 where key = $1`, [FLAG_REVISION, encender, m, s.id]);
    if (!encender) await c.query(`update otp_codes set used_at = now() where channel = 'revision' and used_at is null`);
    await auditar(c, { actor: s.id, action: encender ? "revision.encender" : "revision.apagar", targetKind: "feature_flag", targetId: FLAG_REVISION, before: { encendidas: a.enabled }, after: { encendidas: encender }, reason: m });
    return { ok: true, msg: encender ? "Cuentas de revisión encendidas: entran con su código fijo." : "Cuentas de revisión apagadas: ningún código fijo sirve." };
  });
}
