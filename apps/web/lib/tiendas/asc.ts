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

export async function pedir(base: string, c: CredAsc, metodo: "GET" | "POST" | "DELETE", ruta: string, cuerpo?: unknown, timeoutMs = 15_000): Promise<Res> {
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
