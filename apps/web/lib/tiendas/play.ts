import "server-only";
import { createHash, createPrivateKey, sign as firmar } from "node:crypto";

/* 8h · La API de Google Play (Android Publisher v3), lo que usa la tubería (fase8-apps.md §3.5, §4 8h). Según el documento de descubrimiento
   OFICIAL (googleapis, fijado a un commit en scripts/contrato-tiendas/correr.sh; el simulador scripts/tiendas-sim/play.cjs valida cada pedido
   contra él: ruta, método, parámetros y cuerpo):
   - OAuth 2 de cuenta de servicio: un JWT RS256 firmado con la llave de la cuenta (del llavero, play_service_account) → token de acceso con el
     alcance androidpublisher (una hora; se reusa 50 min).
   - Subir un build a Play INTERNO: edits.insert → edits.bundles.upload (el .aab, uploadType=media) → edits.tracks.update «internal» con ese
     versionCode (status completed) → edits.commit. Si algo falla en el medio, la edición queda sin confirmar y Google la descarta sola.
   - La huella del APK que firma Google (Play App Signing) para assetlinks y para el origen de las llaves de acceso: generatedapks.list.
   - Crear la app en Play Console NO existe en la API (paso del fundador, §10 Paquete 8-2).
   Módulo autocontenido (sin la base): lo compila aparte el contrato (scripts/contrato-tiendas) y lo corre contra el simulador. */
export type CuentaPlay = { client_email: string; private_key: string; token_uri?: string };
export type Res = { status: number; json: Record<string, unknown> | null };
export const ALCANCE = "https://www.googleapis.com/auth/androidpublisher";

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");
let tok: { k: string; t: string; at: number } | null = null;
export function asercion(c: CuentaPlay, aud: string, ahoraMs = Date.now()): string {
  const iat = Math.floor(ahoraMs / 1000);
  const h = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" })), p = b64u(JSON.stringify({ iss: c.client_email, scope: ALCANCE, aud, iat, exp: iat + 3600 }));
  return `${h}.${p}.${b64u(firmar("sha256", Buffer.from(`${h}.${p}`), createPrivateKey(c.private_key)))}`;
}
export async function tokenPlay(oauth: string, c: CuentaPlay, ahoraMs = Date.now()): Promise<string | null> {
  // 8i · La llave también es parte de la clave: si la cuenta de servicio se rota (mismo correo, otra llave), no se reusa el token viejo.
  const k = `${oauth}|${c.client_email}|${createHash("sha256").update(c.private_key).digest("hex").slice(0, 16)}`;
  if (tok && tok.k === k && ahoraMs - tok.at < 50 * 60_000) return tok.t;
  const r = await fetch(oauth, { method: "POST", signal: AbortSignal.timeout(15_000), headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: asercion(c, oauth, ahoraMs) }).toString() });
  const j = (await r.json().catch(() => null)) as { access_token?: unknown } | null;
  if (!r.ok || typeof j?.access_token !== "string") return null;
  tok = { k, t: j.access_token, at: ahoraMs };
  return tok.t;
}
export const olvidarTokenPlay = () => { tok = null; };

async function pedir(base: string, token: string, metodo: "GET" | "POST" | "PUT" | "DELETE", ruta: string, cuerpo?: unknown, binario?: Buffer, timeoutMs = 30_000, tipoBinario = "application/octet-stream"): Promise<Res> {
  const r = await fetch(base.replace(/\/$/, "") + ruta, {
    method: metodo, signal: AbortSignal.timeout(binario ? 600_000 : timeoutMs),
    headers: { authorization: `Bearer ${token}`, accept: "application/json", ...(binario ? { "content-type": tipoBinario } : cuerpo !== undefined ? { "content-type": "application/json" } : {}) },
    body: binario ? new Uint8Array(binario) : cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  const t = await r.text();
  let json: Record<string, unknown> | null = null;
  try { json = t ? (JSON.parse(t) as Record<string, unknown>) : null; } catch { json = null; }
  return { status: r.status, json };
}
const ap = (pkg: string) => `/androidpublisher/v3/applications/${encodeURIComponent(pkg)}`;
/* El primer error de Google, corto (nunca el cuerpo entero). */
export const errorDe = (r: Res) => {
  const e = r.json?.error as { status?: string; message?: string } | undefined;
  return `${r.status}${e?.status ? ` ${String(e.status).slice(0, 40)}` : ""}${e?.message ? ` · ${String(e.message).slice(0, 120)}` : ""}`;
};

export async function nuevaEdicion(base: string, token: string, pkg: string): Promise<{ id: string | null; r: Res }> {
  const r = await pedir(base, token, "POST", `${ap(pkg)}/edits`, {});
  return { id: r.status === 200 && typeof r.json?.id === "string" ? r.json.id : null, r };
}
export async function subirBundle(base: string, token: string, pkg: string, edicion: string, aab: Buffer): Promise<{ versionCode: number | null; sha256: string | null; r: Res }> {
  const r = await pedir(base, token, "POST", `/upload${ap(pkg)}/edits/${encodeURIComponent(edicion)}/bundles?uploadType=media`, undefined, aab);
  const vc = Number(r.json?.versionCode);
  return { versionCode: r.status === 200 && Number.isInteger(vc) && vc > 0 ? vc : null, sha256: typeof r.json?.sha256 === "string" ? r.json.sha256 : null, r };
}
export const pistaInterna = (base: string, token: string, pkg: string, edicion: string, versionCode: number, nombre: string) =>
  pedir(base, token, "PUT", `${ap(pkg)}/edits/${encodeURIComponent(edicion)}/tracks/internal`,
    { track: "internal", releases: [{ name: nombre.slice(0, 50), versionCodes: [String(versionCode)], status: "completed" }] });
export const confirmar = (base: string, token: string, pkg: string, edicion: string) => pedir(base, token, "POST", `${ap(pkg)}/edits/${encodeURIComponent(edicion)}:commit`);

/* Subir un .aab a Play interno de punta a punta. Devuelve el versionCode que Google aceptó o el error (corto). */
export async function aPlayInterno(base: string, token: string, x: { pkg: string; aab: Buffer; nombre: string; build: number }): Promise<{ ok: true; versionCode: number } | { ok: false; error: string }> {
  const e = await nuevaEdicion(base, token, x.pkg);
  if (!e.id) return { ok: false, error: `edits.insert ${errorDe(e.r)}` };
  const b = await subirBundle(base, token, x.pkg, e.id, x.aab);
  if (!b.versionCode) return { ok: false, error: `bundles.upload ${errorDe(b.r)}` };
  if (b.versionCode !== x.build) return { ok: false, error: `bundles.upload: Google dice versionCode ${b.versionCode} y el build es ${x.build}` };
  const t = await pistaInterna(base, token, x.pkg, e.id, b.versionCode, x.nombre);
  if (t.status !== 200) return { ok: false, error: `tracks.update ${errorDe(t)}` };
  const c = await confirmar(base, token, x.pkg, e.id);
  if (c.status !== 200) return { ok: false, error: `edits.commit ${errorDe(c)}` };
  return { ok: true, versionCode: b.versionCode };
}

/* La huella SHA-256 del certificado con el que Google firma lo que instala (Play App Signing): para assetlinks y para el origen
   android:apk-key-hash de las llaves de acceso. null si Google todavía no generó los APK de ese build. */
export async function huellaFirmaGoogle(base: string, token: string, pkg: string, versionCode: number): Promise<string | null> {
  const r = await pedir(base, token, "GET", `${ap(pkg)}/generatedApks/${versionCode}`);
  const g = Array.isArray(r.json?.generatedApks) ? (r.json!.generatedApks as { certificateSha256Hash?: unknown }[]) : [];
  const h = g.map((x) => x.certificateSha256Hash).find((x): x is string => typeof x === "string" && /^[A-Fa-f0-9:]{64,95}$/.test(x));
  return r.status === 200 && h ? h.replace(/:/g, "").toLowerCase() : null;
}

/* ── 8i · La ficha de Google Play como BORRADOR (fase8-apps.md §4 8i): en una edición, cada idioma (título, descripción corta y completa) y sus
   capturas de teléfono (se quitan las del borrador y se suben estas, en orden), y se confirma con changesNotSentForReview=true: Google NO lo manda a
   revisión (eso es de la Fase 9). Las «Novedades» de Google van con cada lanzamiento (notas de la versión), no con la ficha. ── */
export type FichaPlay = { language: string; title: string; shortDescription: string; fullDescription: string };
const e = encodeURIComponent;
export async function subirFichasPlay(base: string, token: string, x: { pkg: string; fichas: FichaPlay[]; capturas: { language: string; archivos: Buffer[] }[] }): Promise<{ ok: true; edicion: string } | { ok: false; error: string }> {
  const ed = await nuevaEdicion(base, token, x.pkg);
  if (!ed.id) return { ok: false, error: `edits.insert ${errorDe(ed.r)}` };
  const E = `${ap(x.pkg)}/edits/${e(ed.id)}`;
  for (const f of x.fichas) {
    const r = await pedir(base, token, "PUT", `${E}/listings/${e(f.language)}`, f);
    if (r.status !== 200) return { ok: false, error: `listings.update ${f.language} ${errorDe(r)}` };
  }
  for (const c of x.capturas) {
    if (!c.archivos.length) continue;
    const d = await pedir(base, token, "DELETE", `${E}/listings/${e(c.language)}/phoneScreenshots`);
    if (d.status !== 200 && d.status !== 204) return { ok: false, error: `images.deleteall ${c.language} ${errorDe(d)}` };
    for (const png of c.archivos) {
      const u = await pedir(base, token, "POST", `/upload${E}/listings/${e(c.language)}/phoneScreenshots?uploadType=media`, undefined, png, 30_000, "image/png");
      if (u.status !== 200) return { ok: false, error: `images.upload ${c.language} ${errorDe(u)}` };
    }
  }
  const k = await pedir(base, token, "POST", `${E}:commit?changesNotSentForReview=true`);
  if (k.status !== 200) return { ok: false, error: `edits.commit ${errorDe(k)}` };
  return { ok: true, edicion: ed.id };
}

/* 8i · Data safety por la API (applications.dataSafety: el MISMO CSV que se importa en Play Console). Es una declaración legal del dueño de la
   cuenta: el servidor NO la manda sola; queda lista para cuando el fundador dé su OK (REVISION 8i). */
export const subirDataSafety = (base: string, token: string, pkg: string, csv: string) => pedir(base, token, "POST", `${ap(pkg)}/dataSafety`, { safetyLabels: csv });
