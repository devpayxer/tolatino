/* La firma AWS SigV4 de apps/web/lib/correo/ses.ts contra el vector oficial de AWS («get-vanilla» del aws-sig-v4-test-suite).
   Si la firma cambia, el correo no sale en producción: esta prueba lo caza antes. Uso: node scripts/prueba-firma-ses/prueba.mjs */
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const T = mkdtempSync(join(tmpdir(), "firma-"));
mkdirSync(join(T, "node_modules/server-only"), { recursive: true });
writeFileSync(join(T, "node_modules/server-only/index.js"), "module.exports = {};");
writeFileSync(join(T, "ses.ts"), readFileSync("apps/web/lib/correo/ses.ts", "utf8"));
// tsc emite aunque «server-only» no tipe aquí; lo que se prueba es la firma real.
try { execSync(`npx tsc --outDir ${T}/out --module commonjs --target es2022 --moduleResolution node --skipLibCheck --types node --rootDir ${T} ${T}/ses.ts`, { stdio: "pipe", cwd: "apps/web" }); } catch { /* errores de tipos del entorno de prueba */ }
const { createRequire } = await import("node:module");
const req = createRequire(join(T, "x.js"));
process.env.NODE_PATH = join(T, "node_modules");
const { firmarV4 } = req(join(T, "out/ses.js"));
const f = firmarV4({ method: "GET", host: "example.amazonaws.com", path: "/", headers: {}, body: "", region: "us-east-1", service: "service",
  key: "AKIDEXAMPLE", secret: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", date: new Date("2015-08-30T12:36:00Z") }); // GUARDIAN-OK: llave de ejemplo pública de AWS
const esperado = "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31";
if (f.authorization !== esperado) { console.error("✗ firma SES distinta del vector de AWS\n  ", f.authorization); process.exit(1); }
console.log("✓ firma SigV4 = vector oficial de AWS (get-vanilla)");
