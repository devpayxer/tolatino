#!/usr/bin/env node
/* 8g · El formato del pase de Apple Wallet y su servicio web los publica Apple como documentación (developer.apple.com/documentation/walletpasses),
   sin una especificación descargable ni versión en la dirección. Para que el contrato no cambie solo, este script baja los datos de esas páginas
   (el JSON que sirve developer.apple.com/tutorials/data/…) y saca SOLO lo que usa lib/pases/apple.ts, lib/pases/apns-pase.ts y
   app/api/pases/v1/…: las llaves de pass.json (tipo y si son obligatorias), las de un código (Pass.Barcodes, sus formatos), las de un campo
   (PassFieldContent, sus valores permitidos), los grupos de campos, los cinco pedidos del servicio web (método, ruta, si llevan
   «Authorization: ApplePass», respuestas) y lo que dice del aviso de actualización (certificado del pase, cuerpo «{}», solo producción).
   Lo escribe en scripts/contrato-wallet/apple.json con el sha256 de cada página: eso queda FIJO en el repo. El contrato (prueba.cjs) valida
   contra ese archivo. Para actualizar: correr esto de nuevo y revisar el diff.
   Uso: node scripts/contrato-wallet/extraer-apple.mjs   (necesita red hacia developer.apple.com) */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://developer.apple.com/tutorials/data/documentation/walletpasses/";
const PAGINAS = {
  pass: "pass", barcodes: "pass/barcodes-data.dictionary", campo: "passfieldcontent", campos: "passfields", auxiliar: "passfields/auxiliaryfields-data.dictionary",
  registrar: "register-a-pass-for-update-notifications", baja: "unregister-a-pass-for-update-notifications", lista: "get-the-list-of-updatable-passes",
  pase: "send-an-updated-pass", log: "log-a-message", series: "serialnumbers", token: "pushtoken", logs: "logentries", servicio: "adding-a-web-service-to-update-passes",
};
const sha = {}, D = {};
for (const [k, p] of Object.entries(PAGINAS)) {
  const r = await fetch(`${BASE}${p}.json`);
  if (!r.ok) { console.error(`✗ ${p}: HTTP ${r.status}`); process.exit(1); }
  const b = Buffer.from(await r.arrayBuffer());
  sha[k] = createHash("sha256").update(b).digest("hex");
  D[k] = JSON.parse(b.toString("utf8"));
}
const props = (d) => (d.primaryContentSections.find((s) => s.kind === "properties")?.items ?? []).map((it) => ({
  n: it.name, t: (it.type ?? []).map((x) => x.text ?? "").join(""), req: !!it.required, vals: it.attributes?.find((a) => a.kind === "allowedValues")?.values ?? null }));
const tabla = (d) => { const L = props(d); return { propiedades: Object.fromEntries(L.map((x) => [x.n, x.t])), requeridas: L.filter((x) => x.req).map((x) => x.n).sort(), permitidos: Object.fromEntries(L.filter((x) => x.vals).map((x) => [x.n, x.vals])) }; };
const texto = (n) => { const out = []; const w = (x) => { if (Array.isArray(x)) x.forEach(w); else if (x && typeof x === "object") { if (typeof x.text === "string") out.push(x.text); if (x.type === "codeVoice") out.push(x.code); for (const [k, v] of Object.entries(x)) if (k !== "text") w(v); } }; w(n); return out.join(" ").replace(/\s+/g, " "); };
const pedido = (d) => {
  const s = d.primaryContentSections, ep = s.find((x) => x.kind === "restEndpoint"), metodo = ep.tokens.find((t) => t.kind === "method").text;
  const ruta = ep.tokens.filter((t) => t.kind === "path" || t.kind === "parameter").map((t) => t.text).join("").replace(/\?.*$/, "");
  const cab = s.filter((x) => x.kind === "restParameters" && x.source === "header").flatMap((x) => x.items.map((i) => i.name));
  const resp = (s.find((x) => x.kind === "restResponses")?.items ?? []).map((i) => i.status).sort();
  return { metodo, ruta, autorizacion: cab.includes("Authorization"), respuestas: resp };
};
const sv = texto(D.servicio.primaryContentSections);
const out = {
  fuente: BASE, extraido: new Date().toISOString().slice(0, 10), sha256: sha,
  pass: tabla(D.pass), barcodes: tabla(D.barcodes), campo: tabla(D.campo), auxiliar: Object.keys(tabla(D.auxiliar).propiedades),
  grupos: Object.keys(tabla(D.campos).propiedades).sort(),
  servicio: Object.fromEntries(["registrar", "baja", "lista", "pase", "log"].map((k) => { const p = pedido(D[k]); return [`${p.metodo} ${p.ruta}`, { autorizacion: p.autorizacion, respuestas: p.respuestas }]; })),
  cuerpos: { series: Object.keys(tabla(D.series).propiedades).sort(), pushToken: Object.keys(tabla(D.token).propiedades), logs: Object.keys(tabla(D.logs).propiedades) },
  aviso: {
    mismoCertificado: /same certificate and private key that the creator of the pass used to sign/.test(sv),
    cuerpoVacio: /empty JSON dictionary for the payload/.test(sv),
    soloProduccion: /works only in the production environment/.test(sv),
  },
};
for (const [k, v] of Object.entries(out.aviso)) if (!v) { console.error(`✗ la documentación del servicio ya no dice «${k}»`); process.exit(1); }
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "apple.json"), JSON.stringify(out, null, 1) + "\n");
console.log("✓ apple.json", Object.keys(out.pass.propiedades).length, "llaves de pass.json,", Object.keys(out.servicio).length, "pedidos del servicio web");
