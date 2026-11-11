#!/usr/bin/env node
/* 8f · La especificación OpenAPI de App Store Connect la publica Apple en un ZIP sin versión en la dirección
   (developer.apple.com/sample-code/app-store-connect/app-store-connect-openapi-specification.zip). Para que el contrato no cambie solo, este script
   saca de ella SOLO lo que usa lib/tiendas/asc.ts — las rutas y métodos, los parámetros de consulta permitidos, los cuerpos (con sus $ref
   resueltos), las respuestas y el esquema de seguridad — y lo escribe en scripts/contrato-tiendas/asc.json con la versión de la especificación
   (info.version) y el sha256 del ZIP y del JSON: eso queda FIJO en el repo. El contrato (prueba.cjs) y el simulador (scripts/tiendas-sim) validan
   contra ese archivo. Para actualizar: correr esto de nuevo y revisar el diff.
   Uso: node scripts/contrato-tiendas/extraer-asc.mjs [ruta del ZIP o del openapi.oas.json ya bajado]   (sin ruta, lo baja de Apple; necesita unzip) */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const URL_ZIP = "https://developer.apple.com/sample-code/app-store-connect/app-store-connect-openapi-specification.zip";
const arg = process.argv[2], d = mkdtempSync(join(tmpdir(), "asc-"));
let zip = null, crudo;
try {
  if (arg && arg.endsWith(".json")) crudo = readFileSync(arg);
  else {
    zip = arg ? readFileSync(arg) : Buffer.from(await (await fetch(URL_ZIP)).arrayBuffer());
    writeFileSync(join(d, "asc.zip"), zip);
    execFileSync("unzip", ["-o", "-q", join(d, "asc.zip"), "-d", d]);
    crudo = readFileSync(join(d, "openapi.oas.json"));
  }
} finally { /* se borra abajo */ }
const S = JSON.parse(crudo.toString("utf8"));
rmSync(d, { recursive: true, force: true });
const falta = (c, m) => { if (!c) { console.error("✗ " + m); process.exit(1); } };

// Un esquema con todos sus $ref resueltos (hasta 6 niveles; los ciclos se cortan).
const resolver = (s, n = 0) => {
  if (!s || typeof s !== "object" || n > 6) return s;
  if (s.$ref) return resolver(S.components.schemas[s.$ref.split("/").pop()], n + 1);
  if (Array.isArray(s)) return s.map((x) => resolver(x, n));
  const o = {};
  for (const [k, v] of Object.entries(s)) if (!["description", "title", "example", "deprecated"].includes(k)) o[k] = resolver(v, n + 1);
  return o;
};
const USADAS = [
  ["GET", "/v1/apps"], ["GET", "/v1/apps/{id}/betaGroups"], ["GET", "/v1/users"], ["DELETE", "/v1/users/{id}"],
  ["POST", "/v1/userInvitations"], ["DELETE", "/v1/userInvitations/{id}"], ["POST", "/v1/betaTesters"], ["DELETE", "/v1/betaTesters/{id}"],
];
const rutas = {};
for (const [m, p] of USADAS) {
  const op = S.paths[p]?.[m.toLowerCase()];
  falta(op, `la especificación ya no tiene ${m} ${p}`);
  const params = [...(S.paths[p].parameters ?? []), ...(op.parameters ?? [])].map((x) => (x.$ref ? S.components.parameters[x.$ref.split("/").pop()] : x));
  const cuerpo = op.requestBody?.content?.["application/json"]?.schema;
  rutas[`${m} ${p}`] = {
    consulta: params.filter((x) => x.in === "query").map((x) => x.name).sort(),
    ...(cuerpo ? { cuerpo: resolver(cuerpo) } : {}),
    respuestas: Object.keys(op.responses).sort(),
  };
}
const out = {
  fuente: URL_ZIP, version: S.info.version, extraido: new Date().toISOString().slice(0, 10),
  sha256: { ...(zip ? { zip: createHash("sha256").update(zip).digest("hex") } : {}), json: createHash("sha256").update(crudo).digest("hex") },
  servidor: S.servers?.[0]?.url ?? "https://api.appstoreconnect.apple.com/",
  seguridad: S.components.securitySchemes,
  // Lo que exige Apple del JWT («Generating Tokens for API Requests»): ES256, kid, typ JWT, iss, iat, exp ≤ 20 min, aud appstoreconnect-v1.
  jwt: { alg: "ES256", aud: "appstoreconnect-v1", maxVidaS: 1200 },
  roles: resolver({ $ref: "#/components/schemas/UserRole" }).enum,
  betaGroup: Object.keys(S.components.schemas.BetaGroup.properties.attributes.properties).sort(),
  feedback: Object.keys(S.paths).filter((p) => /betaFeedback(Screenshot|Crash)Submissions$/.test(p)).sort(),
  rutas,
};
falta(out.roles.includes("DEVELOPER") && out.betaGroup.includes("isInternalGroup"), "faltan roles o isInternalGroup");
const destino = join(dirname(fileURLToPath(import.meta.url)), "asc.json");
writeFileSync(destino, JSON.stringify(out, null, 1) + "\n");
console.log(`✓ ${destino}: App Store Connect API ${out.version}, ${USADAS.length} rutas`);
