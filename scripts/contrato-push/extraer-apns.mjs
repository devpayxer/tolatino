#!/usr/bin/env node
/* 8c · Apple no publica una especificación legible por máquina de APNs: publica su documentación (DocC JSON). Este script baja las tres páginas
   que mandan («Sending notification requests to APNs», «Handling notification responses from APNs», «Generating a remote notification»),
   saca de ellas las tablas normativas (cabeceras obligatorias, valores de apns-push-type y apns-priority, tope del collapse-id y del cuerpo,
   niveles de interruption-level, motivos de error por estado y los que no se reintentan) y escribe scripts/contrato-push/apns.json con la
   huella sha256 de cada página y la fecha. El contrato (prueba.cjs) valida cada pedido de lib/push/apns.ts contra ese archivo fijo.
   Uso: node scripts/contrato-push/extraer-apns.mjs [carpeta con los .json ya bajados]   (sin carpeta, los baja de developer.apple.com) */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://developer.apple.com/tutorials/data/documentation/usernotifications/";
const PAGINAS = ["sending-notification-requests-to-apns", "handling-notification-responses-from-apns", "generating-a-remote-notification"];
const dir = process.argv[2];
const texto = (n, out = []) => { if (Array.isArray(n)) n.forEach((x) => texto(x, out)); else if (n && typeof n === "object") { if (n.type === "text" && typeof n.text === "string") out.push(n.text); if (n.type === "codeVoice") out.push("`" + n.code + "`"); Object.values(n).forEach((x) => texto(x, out)); } return out; };
const P = {};
for (const p of PAGINAS) {
  const f = dir ? join(dir, `apns-${p}.json`) : null;
  const crudo = f && existsSync(f) ? readFileSync(f) : Buffer.from(await (await fetch(BASE + p + ".json")).arrayBuffer());
  P[p] = { sha256: createHash("sha256").update(crudo).digest("hex"), t: texto(JSON.parse(crudo.toString("utf8")).primaryContentSections).join(" ").replace(/\s+/g, " ") };
}
const S = P["sending-notification-requests-to-apns"].t, R = P["handling-notification-responses-from-apns"].t, G = P["generating-a-remote-notification"].t;
const falta = (c, m) => { if (!c) { console.error("✗ " + m); process.exit(1); } };
// Cabeceras: «`nombre` Required …» en la tabla de la petición.
const obligatorias = [...S.matchAll(/`(:?[a-z-]+)` Required/g)].map((m) => m[1]);
falta(obligatorias.includes(":method") && obligatorias.includes(":path") && obligatorias.includes("apns-topic"), "no encuentro las cabeceras obligatorias");
const tipos = [...new Set([...S.slice(S.indexOf("has the following valid values")).matchAll(/ `([a-z]+)` The push type| `([a-z]+)` (?=The push type|$)/g)].map((m) => m[1] ?? m[2]))];
const tipos2 = [...S.slice(S.indexOf("has the following valid values")).matchAll(/`([a-z]+)` (?:The push type|$)/g)].map((m) => m[1]);
const pushTypes = [...new Set([...tipos, ...tipos2])].filter((x) => !/^(apns|alert-)/.test(x) || x === "alert");
falta(pushTypes.includes("alert") && pushTypes.includes("background"), "no encuentro los valores de apns-push-type");
const prioridades = [10, 5, 1].filter((n) => new RegExp(`Specify \`?${n}\`? to`).test(S));
falta(prioridades.includes(10) && prioridades.includes(5), "no encuentro las prioridades");
const collapse = Number(/apns-collapse-id` Optional[\s\S]{0,400}?must not exceed (\d+) bytes/.exec(S)?.[1]);
const cuerpo = Number(/maximum size of 4 KB \((\d+) bytes\)/.exec(S)?.[1]);
falta(collapse === 64 && cuerpo === 4096, "no encuentro los topes del collapse-id y del cuerpo");
const niveles = [...(/`interruption-level` String[\s\S]{0,200}?The string values (.*?) correspond/.exec(G)?.[1] ?? "").matchAll(/[“"`]+\s*`?([a-z-]+)[”"`]/g)].map((m) => m[1]);
falta(niveles.includes("active") && niveles.includes("time-sensitive") && niveles.includes("critical"), "no encuentro interruption-level");
const errores = {};
for (const m of R.matchAll(/`(\d{3})` `([A-Za-z]+)`/g)) (errores[m[1]] ??= []).push(m[2]);
falta(errores["410"]?.includes("Unregistered") && errores["400"]?.includes("BadDeviceToken"), "no encuentro la tabla de errores");
const noReintentar = [...(/Don’t retry notification responses with the error code (.*?)\. You can retry/.exec(R)?.[1] ?? "").matchAll(/`([A-Za-z]+)`/g)].map((m) => m[1]);
falta(noReintentar.includes("Unregistered"), "no encuentro los que no se reintentan");
const out = { fuente: PAGINAS.map((p) => BASE + p + ".json"), extraido: new Date().toISOString().slice(0, 10), sha256: Object.fromEntries(PAGINAS.map((p) => [p, P[p].sha256])),
  servidores: { desarrollo: "https://api.sandbox.push.apple.com", produccion: "https://api.push.apple.com" }, ruta: "/3/device/{token}", metodo: "POST",
  obligatorias, pushTypes, prioridades, collapseIdMaxBytes: collapse, cuerpoMaxBytes: cuerpo, interruptionLevels: niveles, errores, noReintentar };
const destino = join(dirname(fileURLToPath(import.meta.url)), "apns.json");
writeFileSync(destino, JSON.stringify(out, null, 2) + "\n");
console.log(`✓ ${destino}: ${obligatorias.length} cabeceras obligatorias, ${pushTypes.length} tipos, ${Object.values(errores).flat().length} motivos de error`);
