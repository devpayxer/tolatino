import "server-only";
import { createPublicKey, verify, type KeyObject } from "node:crypto";

/* 8h · El token OIDC de GitHub Actions: así se identifica el job de las tiendas (fase8-apps.md §3.5; §6 #11): sin token guardado en ningún lado,
   el job pide a GitHub un JWT con audience «tolatino-tiendas» y el servidor lo revisa aquí, ENTERO, antes de darle nada:
   - forma: tres partes base64url; cabecera con alg EXACTAMENTE RS256 (nunca «none», nunca HS256 con la llave pública como secreto, nunca
     otra), typ JWT si viene, sin crit ni llaves incrustadas (jku, jwk, x5u, x5c: la llave sale SOLO del JWKS de GitHub);
   - kid: tiene que estar en el JWKS de GitHub (RSA de 2048 bits o más); la firma RSASSA-PKCS1-v1_5 con SHA-256 verifica con esa llave;
   - lo que dice: iss = token.actions.githubusercontent.com, aud = tolatino-tiendas, el repositorio, su id numérico y su dueño (si alguien
     borra el repo y crea otro con el mismo nombre, el id cambia), sub del entorno, environment «tiendas», la rama permitida (ref_type branch),
     el evento push o workflow_dispatch, el flujo tiendas.yml de ESA rama (job_workflow_ref y workflow_ref), un runner de GitHub (no uno
     propio), nada de un pull request (head_ref / base_ref vacíos), y los tiempos (exp, nbf, iat con una holgura chica; vida ≤ 1 h).
   - El jti NO se revisa aquí: lo gasta lib/tiendas/tuberia.ts en UNA inserción atómica (el mismo token no entra dos veces).
   Módulo autocontenido (sin la base): lo compila aparte el contrato (scripts/contrato-oidc) y lo corre con tokens de prueba y, en el CI de las
   tiendas, con el token real de GitHub contra su JWKS real (sin que el token salga del runner). */
export const EMISOR = "https://token.actions.githubusercontent.com";
export const AUDIENCIA = "tolatino-tiendas";
export const JWKS_GITHUB = `${EMISOR}/.well-known/jwks`;
/* El repositorio (público) y sus ids numéricos: si el repo se borra y alguien crea otro con el mismo nombre, el id ya no coincide. */
export const REPO = { nombre: "devpayxer/tolatino", id: "1283030677", dueno: "devpayxer", duenoId: "281237548", entorno: "tiendas", flujo: ".github/workflows/tiendas.yml" } as const;
export const EVENTOS = ["push", "workflow_dispatch"] as const;
export const HOLGURA_S = 60;
const VIDA_MAX_S = 3600;

export type Motivo = "mal_formado" | "alg" | "kid" | "firma" | "jwks" | "iss" | "aud" | "sub" | "repo" | "dueno" | "entorno" | "rama" | "evento" | "flujo"
  | "runner" | "pr" | "vencido" | "antes_de_tiempo" | "vida" | "jti";
export type Claims = {
  jti: string; exp: number; iat: number; nbf?: number; iss: string; aud: string | string[]; sub: string;
  repository: string; repository_id: string; repository_owner: string; repository_owner_id: string; environment?: string;
  ref: string; ref_type: string; event_name: string; sha: string; run_id: string; run_attempt?: string; workflow_ref?: string; job_workflow_ref?: string;
  runner_environment?: string; head_ref?: string; base_ref?: string; actor?: string;
};
export type Esperado = { ramas: readonly string[] };
export type Resultado = { ok: true; c: Claims } | { ok: false; motivo: Motivo; c?: Claims };
/* La llave pública de un kid (del JWKS de GitHub). null = ese kid no está. Lanza si el JWKS no se pudo traer. */
export type Llaves = (kid: string) => Promise<KeyObject | null>;

const B64U = /^[A-Za-z0-9_-]+$/;
const json = (s: string): Record<string, unknown> | null => {
  try { const v = JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as unknown; return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null; } catch { return null; }
};
const texto = (v: unknown) => (typeof v === "string" ? v : null);
const entero = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : null);

export async function verificar(token: unknown, llaves: Llaves, esperado: Esperado, ahoraMs = Date.now()): Promise<Resultado> {
  if (typeof token !== "string" || token.length > 8192) return { ok: false, motivo: "mal_formado" };
  const p = token.split(".");
  if (p.length !== 3 || !p.every((x) => B64U.test(x))) return { ok: false, motivo: "mal_formado" };
  const h = json(p[0]!);
  if (!h) return { ok: false, motivo: "mal_formado" };
  // El algoritmo: SOLO RS256. Ni «none», ni HS256 (que usaría la llave pública como secreto), ni RS512, ni ES256: lo que firma GitHub.
  if (h.alg !== "RS256") return { ok: false, motivo: "alg" };
  if (h.typ !== undefined && h.typ !== "JWT") return { ok: false, motivo: "alg" };
  if ("crit" in h || "jku" in h || "jwk" in h || "x5u" in h || "x5c" in h) return { ok: false, motivo: "alg" };
  const kid = texto(h.kid);
  if (!kid || !/^[A-Za-z0-9_-]{1,128}$/.test(kid)) return { ok: false, motivo: "kid" };
  let llave: KeyObject | null;
  try { llave = await llaves(kid); } catch { return { ok: false, motivo: "jwks" }; }
  if (!llave) return { ok: false, motivo: "kid" };
  const bits = llave.asymmetricKeyDetails?.modulusLength ?? 0;
  if (llave.type !== "public" || llave.asymmetricKeyType !== "rsa" || bits < 2048) return { ok: false, motivo: "kid" };
  const firma = Buffer.from(p[2]!, "base64url");
  if (firma.length !== bits / 8 || !verify("sha256", Buffer.from(`${p[0]}.${p[1]}`), llave, firma)) return { ok: false, motivo: "firma" };

  const c = json(p[1]!) as Claims | null;
  if (!c) return { ok: false, motivo: "mal_formado" };
  const ahora = Math.floor(ahoraMs / 1000);
  if (c.iss !== EMISOR) return { ok: false, motivo: "iss", c };
  if (c.aud !== AUDIENCIA && !(Array.isArray(c.aud) && c.aud.length === 1 && c.aud[0] === AUDIENCIA)) return { ok: false, motivo: "aud", c };
  const exp = entero(c.exp), iat = entero(c.iat), nbf = c.nbf === undefined ? null : entero(c.nbf);
  if (exp === null || iat === null || (c.nbf !== undefined && nbf === null)) return { ok: false, motivo: "vida", c };
  if (ahora > exp + HOLGURA_S) return { ok: false, motivo: "vencido", c };
  if ((nbf !== null && ahora + HOLGURA_S < nbf) || iat > ahora + HOLGURA_S) return { ok: false, motivo: "antes_de_tiempo", c };
  if (exp - iat > VIDA_MAX_S || ahora - iat > VIDA_MAX_S) return { ok: false, motivo: "vida", c };
  if (c.repository !== REPO.nombre || String(c.repository_id) !== REPO.id) return { ok: false, motivo: "repo", c };
  if (c.repository_owner !== REPO.dueno || String(c.repository_owner_id) !== REPO.duenoId) return { ok: false, motivo: "dueno", c };
  if (c.environment !== REPO.entorno) return { ok: false, motivo: "entorno", c };
  if (c.sub !== `repo:${REPO.nombre}:environment:${REPO.entorno}`) return { ok: false, motivo: "sub", c };
  if (c.ref_type !== "branch" || !esperado.ramas.includes(c.ref)) return { ok: false, motivo: "rama", c };
  if (!(EVENTOS as readonly string[]).includes(c.event_name)) return { ok: false, motivo: "evento", c };
  const flujo = `${REPO.nombre}/${REPO.flujo}@${c.ref}`;
  if (c.job_workflow_ref !== flujo || c.workflow_ref !== flujo) return { ok: false, motivo: "flujo", c };
  if (c.runner_environment !== "github-hosted") return { ok: false, motivo: "runner", c };
  if (c.head_ref || c.base_ref) return { ok: false, motivo: "pr", c };
  if (typeof c.jti !== "string" || !/^[A-Za-z0-9._:-]{8,200}$/.test(c.jti) || !/^[a-f0-9]{40}$/.test(String(c.sha)) || !/^[0-9]{1,20}$/.test(String(c.run_id))) return { ok: false, motivo: "jti", c };
  return { ok: true, c };
}

/* El JWKS de GitHub, guardado una hora. Un kid desconocido vuelve a traerlo (GitHub rota llaves), como mucho una vez por minuto: un token con
   un kid inventado no hace que el servidor golpee a GitHub en cada intento. Respuesta acotada (64 KB) y con tiempo (5 s). Solo llaves RSA de
   firma (kty RSA; use «sig» y alg RS256 si vienen). */
type Cache = { url: string; at: number; intento: number; llaves: Map<string, KeyObject> };
let cache: Cache | null = null;
export function llavesDe(url: string, traer: (u: string) => Promise<unknown> = traerJson): Llaves {
  return async (kid) => {
    const ahora = Date.now();
    const vieja = !cache || cache.url !== url || ahora - cache.at > 3600_000;
    if (vieja || (!cache!.llaves.has(kid) && ahora - cache!.intento > 60_000)) {
      if (cache && cache.url === url) cache.intento = ahora;
      try {
        const j = (await traer(url)) as { keys?: unknown };
        const m = new Map<string, KeyObject>();
        for (const k of Array.isArray(j?.keys) ? (j.keys as Record<string, unknown>[]) : []) {
          if (k.kty !== "RSA" || typeof k.kid !== "string" || (k.use !== undefined && k.use !== "sig") || (k.alg !== undefined && k.alg !== "RS256")) continue;
          try { m.set(k.kid, createPublicKey({ key: { kty: "RSA", n: String(k.n), e: String(k.e) }, format: "jwk" })); } catch { /* una llave rota no tumba las demás */ }
        }
        if (m.size) cache = { url, at: ahora, intento: ahora, llaves: m };
        else if (vieja) throw new Error("jwks vacío");
      } catch (e) { if (vieja) throw e; }
    }
    return cache?.url === url ? cache.llaves.get(kid) ?? null : null;
  };
}
export const olvidarJwks = () => { cache = null; };
async function traerJson(u: string): Promise<unknown> {
  const r = await fetch(u, { signal: AbortSignal.timeout(5000), headers: { accept: "application/json" }, redirect: "error" });
  if (!r.ok) throw new Error(`jwks ${r.status}`);
  const t = await r.text();
  if (t.length > 65536) throw new Error("jwks demasiado grande");
  return JSON.parse(t) as unknown;
}
