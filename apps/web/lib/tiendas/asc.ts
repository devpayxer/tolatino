import "server-only";
import { createHash, createPrivateKey, sign as firmar } from "node:crypto";

/* 8f · La API de App Store Connect, lo que usa el programa beta (fase8-apps.md §4 8f; 8h suma builds, capacidades y la ficha). Según la
   especificación OpenAPI publicada por Apple (v4.6, fijada en scripts/contrato-tiendas/asc.json con su sha256; el contrato valida cada pedido):
   - JWT ES256 con la llave .p8 del llavero: cabecera {alg ES256, kid, typ JWT}; cuerpo {iss (emisor), iat, exp ≤ 20 min, aud appstoreconnect-v1}.
   - TestFlight INTERNO (§6 #9: en la Fase 8 no hay externo): el tester tiene que ser del equipo de App Store Connect. Se le invita con un rol
     mínimo (DEVELOPER sin aprovisionamiento y solo esa app; «(a verificar)» en REVISION) y, cuando acepta, se suma al grupo interno de la app.
   - Quitar: se saca del grupo (DELETE betaTesters), se anula la invitación pendiente o se quita el usuario que creamos para la prueba.
   Módulo autocontenido (sin la base): lo compila aparte el contrato (scripts/contrato-tiendas) y lo corre contra el simulador. */
export type CredAsc = { llavePem: string; idLlave: string; emisor: string };
export type Res = { status: number; json: Record<string, unknown> | null };

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");
let jwt: { k: string; t: string; at: number } | null = null;
export function jwtAsc(c: CredAsc, ahoraMs = Date.now()): string {
  const k = `${c.emisor}.${c.idLlave}.${createHash("sha256").update(c.llavePem).digest("hex").slice(0, 16)}`;
  if (jwt && jwt.k === k && ahoraMs - jwt.at < 15 * 60_000) return jwt.t;
  const iat = Math.floor(ahoraMs / 1000);
  const h = b64u(JSON.stringify({ alg: "ES256", kid: c.idLlave, typ: "JWT" })), p = b64u(JSON.stringify({ iss: c.emisor, iat, exp: iat + 19 * 60, aud: "appstoreconnect-v1" }));
  const f = firmar("sha256", Buffer.from(`${h}.${p}`), { key: createPrivateKey(c.llavePem), dsaEncoding: "ieee-p1363" });
  jwt = { k, t: `${h}.${p}.${b64u(f)}`, at: ahoraMs };
  return jwt.t;
}
export const olvidarJwtAsc = () => { jwt = null; };

export async function pedir(base: string, c: CredAsc, metodo: "GET" | "POST" | "PATCH" | "DELETE", ruta: string, cuerpo?: unknown, timeoutMs = 15_000): Promise<Res> {
  const r = await fetch(base.replace(/\/$/, "") + ruta, {
    method: metodo, signal: AbortSignal.timeout(timeoutMs),
    headers: { authorization: `Bearer ${jwtAsc(c)}`, accept: "application/json", ...(cuerpo ? { "content-type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const t = await r.text();
  let json: Record<string, unknown> | null = null;
  try { json = t ? (JSON.parse(t) as Record<string, unknown>) : null; } catch { json = null; }
  return { status: r.status, json };
}
const q = (k: string, v: string) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
type Dato = { id?: string; attributes?: Record<string, unknown> };
const datos = (r: Res): Dato[] => (Array.isArray(r.json?.data) ? (r.json!.data as Dato[]) : r.json?.data ? [r.json.data as Dato] : []);
/* El primer error de la respuesta, corto (para sync_error; nunca el cuerpo entero). */
export const errorDe = (r: Res) => {
  const e = Array.isArray(r.json?.errors) ? (r.json!.errors as { code?: string; title?: string }[])[0] : null;
  return `${r.status}${e?.code ? ` ${String(e.code).slice(0, 60)}` : ""}${e?.title ? ` · ${String(e.title).slice(0, 100)}` : ""}`;
};

export async function appPorBundle(base: string, c: CredAsc, bundle: string): Promise<string | null> {
  const r = await pedir(base, c, "GET", `/v1/apps?${q("filter[bundleId]", bundle)}&${q("fields[apps]", "bundleId")}&limit=1`);
  return r.status === 200 ? (datos(r).find((d) => d.attributes?.bundleId === bundle)?.id ?? null) : null;
}
export async function grupoInterno(base: string, c: CredAsc, appId: string): Promise<string | null> {
  const r = await pedir(base, c, "GET", `/v1/apps/${encodeURIComponent(appId)}/betaGroups?${q("fields[betaGroups]", "name,isInternalGroup")}&limit=50`);
  return r.status === 200 ? (datos(r).find((d) => d.attributes?.isInternalGroup === true)?.id ?? null) : null;
}
export async function usuarioPorCorreo(base: string, c: CredAsc, correo: string): Promise<string | null> {
  const r = await pedir(base, c, "GET", `/v1/users?${q("filter[username]", correo)}&limit=1`);
  return r.status === 200 ? (datos(r)[0]?.id ?? null) : null;
}
export async function invitarUsuario(base: string, c: CredAsc, x: { correo: string; nombre: string; apellido: string; appId: string }): Promise<{ id: string | null; r: Res }> {
  const r = await pedir(base, c, "POST", "/v1/userInvitations", { data: { type: "userInvitations",
    attributes: { email: x.correo, firstName: x.nombre, lastName: x.apellido, roles: ["DEVELOPER"], allAppsVisible: false, provisioningAllowed: false },
    relationships: { visibleApps: { data: [{ type: "apps", id: x.appId }] } } } });
  return { id: r.status === 201 ? (datos(r)[0]?.id ?? null) : null, r };
}
export async function agregarTester(base: string, c: CredAsc, x: { correo: string; nombre: string; apellido: string; grupoId: string }): Promise<{ id: string | null; r: Res }> {
  const r = await pedir(base, c, "POST", "/v1/betaTesters", { data: { type: "betaTesters",
    attributes: { email: x.correo, firstName: x.nombre, lastName: x.apellido },
    relationships: { betaGroups: { data: [{ type: "betaGroups", id: x.grupoId }] } } } });
  return { id: r.status === 201 ? (datos(r)[0]?.id ?? null) : null, r };
}
export const quitarTester = (base: string, c: CredAsc, id: string) => pedir(base, c, "DELETE", `/v1/betaTesters/${encodeURIComponent(id)}`);
export const anularInvitacion = (base: string, c: CredAsc, id: string) => pedir(base, c, "DELETE", `/v1/userInvitations/${encodeURIComponent(id)}`);
export const quitarUsuario = (base: string, c: CredAsc, id: string) => pedir(base, c, "DELETE", `/v1/users/${encodeURIComponent(id)}`);

/* 8h · Los builds que sube el CI (xcodebuild con la llave de la API): Apple los procesa (PROCESSING) y quedan VALID, o FAILED / INVALID. El
   barrido pregunta por el build de ESA app, versión y número; cuando está VALID lo suma al grupo interno (TestFlight interno; §6 #9). */
export type BuildAsc = { id: string; estado: string };
export async function buildEnAsc(base: string, c: CredAsc, x: { appId: string; version: string; build: number }): Promise<BuildAsc | null | "error"> {
  const r = await pedir(base, c, "GET", `/v1/builds?${q("filter[app]", x.appId)}&${q("filter[version]", String(x.build))}&${q("filter[preReleaseVersion.version]", x.version)}&${q("fields[builds]", "version,processingState")}&limit=1`);
  if (r.status !== 200) return "error";
  const d = datos(r)[0];
  return d?.id ? { id: d.id, estado: String(d.attributes?.processingState ?? "") } : null;
}
export const buildAlGrupo = (base: string, c: CredAsc, grupoId: string, buildId: string) =>
  pedir(base, c, "POST", `/v1/betaGroups/${encodeURIComponent(grupoId)}/relationships/builds`, { data: [{ type: "builds", id: buildId }] });

/* ── 8i · La ficha como BORRADOR (fase8-apps.md §4 8i). Solo la versión que se prepara para enviar (PREPARE_FOR_SUBMISSION): nada de aquí la
   manda a revisión (eso es de la Fase 9, con el OK del fundador). Si la tienda no tiene una versión en preparación, no se toca nada. ── */
const enc = encodeURIComponent;
export type FichaAsc = { locale: string; name: string; subtitle: string; privacyPolicyUrl: string; description: string; keywords: string; promotionalText: string; whatsNew: string; supportUrl: string };
export async function versionEnPreparacion(base: string, c: CredAsc, appId: string): Promise<string | null | "error"> {
  const r = await pedir(base, c, "GET", `/v1/apps/${enc(appId)}/appStoreVersions?${q("filter[appStoreState]", "PREPARE_FOR_SUBMISSION")}&${q("filter[platform]", "IOS")}&limit=1`);
  return r.status !== 200 ? "error" : (datos(r)[0]?.id ?? null);
}
async function ponerLoc(base: string, c: CredAsc, lista: string, tipo: string, rel: string, relTipo: string, padre: string, locale: string, attrs: Record<string, string>): Promise<Res> {
  const L = await pedir(base, c, "GET", `${lista}?limit=50`);
  if (L.status !== 200) return L;
  const ya = datos(L).find((d) => d.attributes?.locale === locale);
  if (ya?.id) return pedir(base, c, "PATCH", `/v1/${tipo}/${enc(ya.id)}`, { data: { type: tipo, id: ya.id, attributes: attrs } });
  return pedir(base, c, "POST", `/v1/${tipo}`, { data: { type: tipo, attributes: { locale, ...attrs }, relationships: { [rel]: { data: { type: relTipo, id: padre } } } } });
}
/* Lo de la versión (descripción, palabras clave, texto promocional, novedades, soporte) y lo de la app (nombre, subtítulo, privacidad). */
export async function subirFichaAsc(base: string, c: CredAsc, x: { appId: string; versionId: string; ficha: FichaAsc }): Promise<{ ok: true } | { ok: false; error: string }> {
  const f = x.ficha;
  const v = await ponerLoc(base, c, `/v1/appStoreVersions/${enc(x.versionId)}/appStoreVersionLocalizations`, "appStoreVersionLocalizations", "appStoreVersion", "appStoreVersions", x.versionId, f.locale,
    { description: f.description, keywords: f.keywords, promotionalText: f.promotionalText, whatsNew: f.whatsNew, supportUrl: f.supportUrl });
  if (v.status !== 200 && v.status !== 201) return { ok: false, error: `versión ${f.locale}: ${errorDe(v)}` };
  const I = await pedir(base, c, "GET", `/v1/apps/${enc(x.appId)}/appInfos?limit=10`);
  // La información de la app que se puede editar: la que no está ya publicada.
  const info = datos(I).find((d) => !["READY_FOR_DISTRIBUTION", "READY_FOR_SALE"].includes(String(d.attributes?.state ?? d.attributes?.appStoreState ?? ""))) ?? datos(I)[0];
  if (I.status !== 200 || !info?.id) return { ok: false, error: `appInfos: ${errorDe(I)}` };
  const a = await ponerLoc(base, c, `/v1/appInfos/${enc(info.id)}/appInfoLocalizations`, "appInfoLocalizations", "appInfo", "appInfos", info.id, f.locale,
    { name: f.name, subtitle: f.subtitle, privacyPolicyUrl: f.privacyPolicyUrl });
  if (a.status !== 200 && a.status !== 201) return { ok: false, error: `app ${f.locale}: ${errorDe(a)}` };
  return { ok: true };
}
/* La clasificación por edad: las respuestas del cuestionario de Apple, con la verdad (§6 #20). */
export async function ponerEdadAsc(base: string, c: CredAsc, appId: string, respuestas: Record<string, string | boolean>): Promise<Res> {
  const I = await pedir(base, c, "GET", `/v1/apps/${enc(appId)}/appInfos?limit=10`);
  const info = datos(I)[0];
  if (!info?.id) return I;
  const D = await pedir(base, c, "GET", `/v1/appInfos/${enc(info.id)}/ageRatingDeclaration`);
  const id = datos(D)[0]?.id;
  if (!id) return D;
  return pedir(base, c, "PATCH", `/v1/ageRatingDeclarations/${enc(id)}`, { data: { type: "ageRatingDeclarations", id, attributes: respuestas } });
}
/* Las notas para la revisión y la cuenta de revisión (el número y su código fijo van SOLO a Apple, por la API; nunca se muestran). */
export async function ponerRevisionAsc(base: string, c: CredAsc, versionId: string, x: { notas: string; cuenta: string | null; codigo: string | null }): Promise<Res> {
  const D = await pedir(base, c, "GET", `/v1/appStoreVersions/${enc(versionId)}/appStoreReviewDetail`);
  const id = D.status === 200 ? datos(D)[0]?.id : undefined;
  const attrs = { notes: x.notas.slice(0, 4000), demoAccountRequired: !!(x.cuenta && x.codigo), ...(x.cuenta && x.codigo ? { demoAccountName: x.cuenta, demoAccountPassword: x.codigo } : {}) };
  if (id) return pedir(base, c, "PATCH", `/v1/appStoreReviewDetails/${enc(id)}`, { data: { type: "appStoreReviewDetails", id, attributes: attrs } });
  return pedir(base, c, "POST", "/v1/appStoreReviewDetails", { data: { type: "appStoreReviewDetails", attributes: attrs, relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: versionId } } } } });
}
/* Las capturas de un idioma y un tamaño: si ya están las mismas (por su checksum, en orden) no se toca nada; si no, se quitan las del borrador y
   se suben estas (reservar → subir cada parte a la dirección que da Apple → confirmar con el MD5). Devuelve los ids de Apple. */
export async function subirCapturasAsc(base: string, c: CredAsc, x: { versionId: string; locale: string; tipo: string; archivos: { nombre: string; datos: Buffer }[] }): Promise<{ ok: true; ids: string[]; igual: boolean } | { ok: false; error: string }> {
  const L = await pedir(base, c, "GET", `/v1/appStoreVersions/${enc(x.versionId)}/appStoreVersionLocalizations?limit=50`);
  const loc = datos(L).find((d) => d.attributes?.locale === x.locale)?.id;
  if (!loc) return { ok: false, error: `sin la localización ${x.locale} (sube la ficha primero)` };
  const S = await pedir(base, c, "GET", `/v1/appStoreVersionLocalizations/${enc(loc)}/appScreenshotSets?${q("filter[screenshotDisplayType]", x.tipo)}&limit=10`);
  let set = datos(S)[0]?.id;
  if (!set) {
    const n = await pedir(base, c, "POST", "/v1/appScreenshotSets", { data: { type: "appScreenshotSets", attributes: { screenshotDisplayType: x.tipo }, relationships: { appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: loc } } } } });
    set = datos(n)[0]?.id;
    if (n.status !== 201 || !set) return { ok: false, error: `appScreenshotSets: ${errorDe(n)}` };
  }
  const md5 = (b: Buffer) => createHash("md5").update(b).digest("hex");
  const ya = datos(await pedir(base, c, "GET", `/v1/appScreenshotSets/${enc(set)}/appScreenshots?limit=10`));
  if (ya.length === x.archivos.length && ya.every((d, i) => d.attributes?.sourceFileChecksum === md5(x.archivos[i]!.datos))) return { ok: true, ids: ya.map((d) => d.id!), igual: true };
  for (const d of ya) { const r = await pedir(base, c, "DELETE", `/v1/appScreenshots/${enc(d.id!)}`); if (r.status !== 204 && r.status !== 404) return { ok: false, error: `quitar ${d.id}: ${errorDe(r)}` }; }
  const ids: string[] = [];
  for (const f of x.archivos) {
    const r = await pedir(base, c, "POST", "/v1/appScreenshots", { data: { type: "appScreenshots", attributes: { fileName: f.nombre, fileSize: f.datos.length }, relationships: { appScreenshotSet: { data: { type: "appScreenshotSets", id: set } } } } });
    const d = datos(r)[0], ops = (d?.attributes?.uploadOperations ?? []) as { method: string; url: string; offset: number; length: number; requestHeaders?: { name: string; value: string }[] }[];
    if (r.status !== 201 || !d?.id || !ops.length) return { ok: false, error: `reservar ${f.nombre}: ${errorDe(r)}` };
    for (const o of ops) {
      const up = await fetch(o.url, { method: o.method, signal: AbortSignal.timeout(60_000), headers: Object.fromEntries((o.requestHeaders ?? []).map((h) => [h.name, h.value])), body: new Uint8Array(f.datos.subarray(o.offset, o.offset + o.length)) });
      if (!up.ok) return { ok: false, error: `subir ${f.nombre}: ${up.status}` };
    }
    const k = await pedir(base, c, "PATCH", `/v1/appScreenshots/${enc(d.id)}`, { data: { type: "appScreenshots", id: d.id, attributes: { uploaded: true, sourceFileChecksum: md5(f.datos) } } });
    if (k.status !== 200) return { ok: false, error: `confirmar ${f.nombre}: ${errorDe(k)}` };
    ids.push(d.id);
  }
  return { ok: true, ids, igual: false };
}
