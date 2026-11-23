/* La firma AWS SigV4 de apps/web/lib/correo/ses.ts contra el vector oficial de AWS («get-vanilla» del aws-sig-v4-test-suite).
   Si la firma cambia, el correo no sale en producción: esta prueba lo caza antes. Uso: node scripts/prueba-firma-ses/prueba.mjs */
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const T = mkdtempSync(join(tmpdir(), "firma-"));
mkdirSync(join(T, "node_modules/server-only"), { recursive: true });
writeFileSync(join(T, "node_modules/server-only/index.js"), "module.exports = {};");
// 23 nov · El lector de las llaves (lib/llaves-proveedores.ts) no entra en esta prueba (solo la firma): un doble que lee el entorno, junto a ses.ts.
writeFileSync(join(T, "llaves-proveedores.ts"), 'export const llaveYa = (n: string): string | null => (process.env[n] ?? "").trim() || null;\nexport const llave = async (n: string): Promise<string | null> => llaveYa(n);\n');
// 23 nov · LA regla de las direcciones de pruebas (lib/origen-pruebas.ts) va real, junto a ses.ts.
writeFileSync(join(T, "origen-pruebas.ts"), readFileSync("apps/web/lib/origen-pruebas.ts", "utf8"));
writeFileSync(join(T, "ses.ts"), readFileSync("apps/web/lib/correo/ses.ts", "utf8").replace('from "../llaves-proveedores"', 'from "./llaves-proveedores"').replace('from "../origen-pruebas"', 'from "./origen-pruebas"'));
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

/* 23 nov · Las direcciones de pruebas (SES_API_BASE en ses.ts, ANTHROPIC_API_BASE en modelo-claude.ts): cambian SOLO el origen, solo con
   TOLATINO_ENTORNO=pruebas y solo hacia 127.0.0.1 / localhost; en producción (y en cualquier otro entorno) no tienen efecto aunque existan. Y, contra el
   simulador de las pruebas (scripts/proveedores-sim, que RECALCULA la firma), la firma de ses.ts hecha para el host usado sirve y la de otra llave no. */
const TS = createRequire(import.meta.url)("../../pruebas/lib/ts-servidor.cjs");
const SIMP = createRequire(import.meta.url)("../proveedores-sim/sim.cjs");
let fallos = 0;
const comprueba = (x, m) => { if (!x) fallos++; console.log(`${x ? "✓" : "✗"} ${m}`); };
const conEntorno = async (vars, fn) => {
  const antes = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  try { return await fn(); } finally { for (const [k, v] of Object.entries(antes)) if (v === undefined) delete process.env[k]; else process.env[k] = v; }
};
const SES = TS.cargar("apps/web/lib/correo/ses.ts");
class ErrorModelo extends Error { constructor(tipo, cobrar, msg) { super(msg); this.tipo = tipo; this.cobrar = cobrar; } }
const MC = TS.cargar("apps/web/lib/compa/modelo-claude.ts", { "./modelo": { ErrorModelo, bloques: () => ["x"], ESQUEMA: {} } });
const ORIGEN_IA = new URL(/const URL_API = "([^"]+)";/.exec(readFileSync("apps/web/lib/compa/modelo-claude.ts", "utf8"))[1]).origin;
const REAL_SES = { origen: "https://email.us-east-1.amazonaws.com", host: "email.us-east-1.amazonaws.com" };
const libre = async () => { const net = await import("node:net"); return new Promise((ok) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); }); };
const pSes = await libre(), pIa = await libre(), LOCAL_SES = `http://127.0.0.1:${pSes}`, LOCAL_IA = `http://127.0.0.1:${pIa}`;
for (const [ent, dir, debe, que] of [
  [undefined, undefined, "real", "sin variables"],
  ["produccion", LOCAL_SES, "real", "en producción, con la variable puesta"],
  ["ensayo", LOCAL_SES, "real", "en el ensayo"],
  [undefined, LOCAL_SES, "real", "sin TOLATINO_ENTORNO (local)"],
  ["pruebas", "http://127.0.0.1:1/v2/otra", "real", "en pruebas, con una ruta (no cambia la ruta: se ignora)"],
  ["pruebas", "https://email.example.com", "real", "en pruebas, hacia otro servidor que no es local"],
  ["pruebas", "http://usuario:clave@127.0.0.1:1", "real", "en pruebas, con usuario en la dirección"],
  ["pruebas", LOCAL_SES, "local", "en pruebas, hacia el simulador local"],
]) {
  await conEntorno({ TOLATINO_ENTORNO: ent, SES_API_BASE: dir, ANTHROPIC_API_BASE: dir === LOCAL_SES ? LOCAL_IA : dir }, async () => {
    const d = SES.destinoSes("us-east-1"), ia = MC.direccionApi("/v1/models?limit=1");
    if (debe === "real") comprueba(JSON.stringify(d) === JSON.stringify(REAL_SES) && ia === `${ORIGEN_IA}/v1/models?limit=1`, `${que}: SES y el modelo van al proveedor real (${d.host}; ${new URL(ia).host})`);
    else comprueba(d.origen === LOCAL_SES && d.host === `127.0.0.1:${pSes}` && ia === `${LOCAL_IA}/v1/models?limit=1`, `${que}: SES a ${d.origen} (firma para ${d.host}) y el modelo a ${new URL(ia).origin}, la ruta intacta`);
  });
}
const sim = await SIMP.iniciar({ ses: pSes, anthropic: pIa });
const al = (n, abc) => Array.from({ length: n }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
const ID = "AKIA" + al(16, "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"), SEC = al(40, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+"), IA = "sk-" + "ant-" + al(40, "abcdefghijklmnopqrstuvwxyz0123456789");
sim.aceptar("ses", ID, { secreto: SEC }); sim.aceptar("anthropic", IA);
try {
  await conEntorno({ TOLATINO_ENTORNO: "pruebas", SES_API_BASE: LOCAL_SES, ANTHROPIC_API_BASE: LOCAL_IA, SES_ACCESS_KEY_ID: ID, SES_SECRET_ACCESS_KEY: SEC, ANTHROPIC_API_KEY: IA }, async () => {
    comprueba((await SES.probarSes()).resultado === "sirve" && sim.llamadas("ses", sim.huella(ID)).at(-1)?.estado === 200, "SES: el par bueno, firmado para el host del simulador → «sirve» (el simulador recalculó la firma: 200)");
    process.env.SES_SECRET_ACCESS_KEY = SEC.slice(0, -1) + (SEC.endsWith("a") ? "b" : "a");
    comprueba((await SES.probarSes()).resultado === "rechazada" && sim.llamadas("ses", sim.huella(ID)).at(-1)?.estado === 403, "SES: el mismo ID con otra llave secreta → «rechazada» (SignatureDoesNotMatch, 403)");
    process.env.SES_SECRET_ACCESS_KEY = SEC;
    // Firmar para un host y llamar a otro: la firma no cuadra (por eso ses.ts firma para el host de la dirección que usa).
    const f = SES.firmarV4({ method: "GET", host: REAL_SES.host, path: "/v2/email/account", headers: {}, body: "", region: "us-east-1", service: "ses", key: ID, secret: SEC, date: new Date() });
    const r = await fetch(`${LOCAL_SES}/v2/email/account`, { headers: { "x-amz-date": f.amzDate, authorization: f.authorization } });
    comprueba(r.status === 403 && r.headers.get("x-amzn-errortype") === "SignatureDoesNotMatch", "SES: una firma hecha para otro host → 403 SignatureDoesNotMatch");
    comprueba((await MC.probarClave()).resultado === "sirve" && sim.llamadas("anthropic", sim.huella(IA)).at(-1)?.estado === 200, "modelo: la llave buena → «sirve» en el simulador (GET /v1/models)");
    let e = null; try { await MC.claude.responder({ modelo: "m", maxTokens: 10, sistema: "s", esperaMs: 3000 }); } catch (x) { e = x; }
    comprueba(e instanceof ErrorModelo && /proveedor 404/.test(e.message) && sim.llamadas("anthropic").at(-1)?.ruta === "/v1/messages", "modelo: los mensajes también van a la dirección de pruebas (el simulador no los simula: 404)");
    process.env.ANTHROPIC_API_KEY = IA + "x";
    comprueba((await MC.probarClave()).resultado === "rechazada", "modelo: otra llave → «rechazada» (401)");
  });
  comprueba(!JSON.stringify(sim.registro).includes(SEC) && !JSON.stringify(sim.registro).includes(IA), "el simulador anotó huellas, nunca una llave");
} finally { await sim.cerrar(); }

/* 23 nov (2) · Las cuatro direcciones viejas (STRIPE_API_BASE, STRIPE_FILES_BASE en pagos/stripe.ts; TELNYX_API_BASE, WHATSAPP_API_BASE en
   compa/canales-proveedor.ts) con LA MISMA regla (lib/origen-pruebas.ts), EN EJECUCIÓN: fuera de pruebas, o hacia un servidor que no es local, o con
   ruta, usuario, consulta o ancla, los cobros, los SMS y WhatsApp van al proveedor real; solo en pruebas y local van al simulador, con la ruta intacta.
   Sin llamar a nadie: fetch se intercepta y solo se anota a dónde iba. */
const ST = TS.cargar("apps/web/lib/pagos/stripe.ts"), CP = TS.cargar("apps/web/lib/compa/canales-proveedor.ts");
const fetchReal = globalThis.fetch, vistas = [];
globalThis.fetch = async (u) => { vistas.push(new URL(String(u))); return new Response('{"id":"file_prueba"}', { status: 200, headers: { "content-type": "application/json" } }); };
const LOCAL = "http://127.0.0.1:4411";
const llamar = async () => {
  vistas.length = 0;
  await ST.stripe("POST", "/v1/payment_intents", { amount: 100 }, { idem: "k1" });
  await ST.probarStripe();
  await ST.stripeArchivo({ cuerpo: Buffer.from("x"), nombre: "a.png", tipo: "image/png", idem: "k2" });
  await CP.mandar("telnyx", "+15705550100", "+15705550101", "hola");
  await CP.mandar("whatsapp", "1234567", "+15705550101", "hola");
  await CP.probarTelnyx(); await CP.probarMeta();
  return vistas.map((u) => `${u.origin}${u.pathname}`);
};
const REALES = ["https://api.stripe.com/v1/payment_intents", "https://api.stripe.com/v1/balance", "https://files.stripe.com/v1/files", "https://api.telnyx.com/v2/messages",
  "https://graph.facebook.com/v23.0/1234567/messages", "https://api.telnyx.com/v2/balance", "https://graph.facebook.com/v23.0/9876543"];
try {
  for (const [ent, dir, que] of [
    ["produccion", LOCAL, "en producción, con las cuatro puestas"], ["ensayo", LOCAL, "en el ensayo"], ["local", LOCAL, "con TOLATINO_ENTORNO=local"], [undefined, LOCAL, "sin TOLATINO_ENTORNO"],
    ["pruebas", "https://pagos.example.com", "en pruebas, hacia un servidor que no es local"], ["pruebas", `${LOCAL}/v1`, "en pruebas, con una ruta"],
    ["pruebas", "http://u:c@127.0.0.1:4411", "en pruebas, con usuario en la dirección"], ["pruebas", `${LOCAL}/?x=1`, "en pruebas, con consulta"], ["pruebas", `${LOCAL}/#a`, "en pruebas, con ancla"],
  ]) {
    await conEntorno({ TOLATINO_ENTORNO: ent, STRIPE_API_BASE: dir, STRIPE_FILES_BASE: dir, TELNYX_API_BASE: dir, WHATSAPP_API_BASE: dir, STRIPE_SECRET_KEY: "sk_test_prueba",
      TELNYX_API_KEY: "KEY_PRUEBA", TOLATINO_SMS_MODO: "telnyx", WHATSAPP_TOKEN: "EAAPRUEBA", WHATSAPP_WABA_ID: "9876543" }, async () => {
      const r = await llamar();
      comprueba(JSON.stringify(r) === JSON.stringify(REALES), `${que}: Stripe (cobro, Probar, archivos), Telnyx y WhatsApp van al proveedor real (${[...new Set(r.map((x) => new URL(x).host))].join(", ")})`);
    });
  }
  await conEntorno({ TOLATINO_ENTORNO: "pruebas", STRIPE_API_BASE: LOCAL, STRIPE_FILES_BASE: undefined, TELNYX_API_BASE: LOCAL, WHATSAPP_API_BASE: `${LOCAL}/`, STRIPE_SECRET_KEY: "sk_test_prueba",
    TELNYX_API_KEY: "KEY_PRUEBA", TOLATINO_SMS_MODO: "telnyx", WHATSAPP_TOKEN: "EAAPRUEBA", WHATSAPP_WABA_ID: "9876543" }, async () => {
    const r = await llamar();
    comprueba(JSON.stringify(r) === JSON.stringify(REALES.map((x) => LOCAL + new URL(x).pathname)), `en pruebas, hacia el simulador local: las siete llamadas a ${LOCAL}, la ruta intacta (los archivos de Stripe, sin STRIPE_FILES_BASE, por STRIPE_API_BASE)`);
  });
} finally { globalThis.fetch = fetchReal; }
if (fallos) { console.error(`✗ ${fallos} comprobación(es) de las direcciones de pruebas`); process.exit(1); }
