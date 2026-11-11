#!/usr/bin/env node
/* 8h · La versión de las cuatro apps (fase8-apps.md §3.5 «Versionado»; guardián versionCoherente). Las cuatro comparten el código nativo (un
   proyecto de Android con sabores, uno de Xcode con targets): UNA versión, en apps/mobile/apps.json («version» = MARKETING_VERSION = versionName).
   El build (número creciente por app y plataforma) lo pone el CI. Regla: cambiar el código nativo exige subir la versión. Para saberlo sin git,
   apps/mobile/versiones.json guarda el historial: cada versión con la HUELLA de lo nativo con que salió (sha256 de los archivos de apps/mobile,
   sin las pruebas de humo, con la versión misma normalizada). El guardián exige: la última versión del historial = la de apps.json, su huella =
   la de hoy, versiones estrictamente crecientes y huellas distintas, y que el historial solo crezca (se compara con el del último commit).
   Uso:
     node apps/mobile/scripts/version.mjs --verificar       falla si lo nativo cambió sin subir la versión (lo corre el CI de las tiendas)
     node apps/mobile/scripts/version.mjs --subir 1.0.1     sube la versión en apps.json, regenera lo nativo y anota la huella nueva */
import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(RAIZ, "../..");
export const HISTORIAL = "apps/mobile/versiones.json";
/* Lo que NO es la app: las pruebas de humo y el cliente de CDP (corren en el CI, no van en el paquete) y el historial mismo. */
const FUERA = [/^apps\/mobile\/scripts\/humo(\/|-)/, /^apps\/mobile\/scripts\/(cdp|version)\.mjs$/, /^apps\/mobile\/versiones\.json$/, /^apps\/mobile\/(www|node_modules)\//];
export const SEMVER = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
export const mayor = (a, b) => { const x = SEMVER.exec(a).slice(1).map(Number), y = SEMVER.exec(b).slice(1).map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };

/* La huella de lo nativo: cada archivo de apps/mobile (los del repo y los nuevos sin ignorar), con la versión normalizada (el rótulo TLApp, el
   MARKETING_VERSION de Xcode y «version» de apps.json), en orden. */
export function huellaNativa(raiz = REPO) {
  const L = execSync("git ls-files --cached --others --exclude-standard -- apps/mobile", { cwd: raiz, encoding: "utf8" }).split("\n")
    .filter((f) => f && existsSync(join(raiz, f)) && !FUERA.some((re) => re.test(f))).sort();
  const h = createHash("sha256");
  for (const f of L) {
    let t = readFileSync(join(raiz, f));
    if (/\.(json|ya?ml|gradle|xml|plist|strings|swift|java|kt|m|h|mjs|js|txt|properties|pro|storyboard|xcprivacy)$/.test(f)) {
      let s = t.toString("utf8").replace(/TLApp\/(\w+)\/(\w+)\/\d{1,3}\.\d{1,3}\.\d{1,3}/g, "TLApp/$1/$2/X.Y.Z").replace(/MARKETING_VERSION: "\d{1,3}\.\d{1,3}\.\d{1,3}"/g, 'MARKETING_VERSION: "X.Y.Z"');
      if (f === "apps/mobile/apps.json") { const j = JSON.parse(s); j.version = "X.Y.Z"; s = JSON.stringify(j); }
      t = Buffer.from(s, "utf8");
    }
    h.update(f).update("\0").update(t).update("\0");
  }
  return { huella: h.digest("hex"), archivos: L.length };
}
export function leerHistorial(raiz = REPO) {
  const p = join(raiz, HISTORIAL);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
}
/* Los problemas (vacío = coherente). Lo usan el guardián versionCoherente y --verificar. */
export function problemas(raiz = REPO) {
  const out = [], H = leerHistorial(raiz), A = JSON.parse(readFileSync(join(raiz, "apps/mobile/apps.json"), "utf8"));
  if (!H || !Array.isArray(H.historial) || !H.historial.length) return [`falta ${HISTORIAL} con el historial de versiones`];
  H.historial.forEach((e, i) => {
    if (!SEMVER.test(e.version ?? "") || !/^[a-f0-9]{64}$/.test(e.huella ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(e.fecha ?? "")) out.push(`la entrada ${i + 1} del historial no tiene versión, huella y fecha`);
    else if (i > 0 && SEMVER.test(H.historial[i - 1].version ?? "") && !mayor(e.version, H.historial[i - 1].version)) out.push(`el historial no crece: ${e.version} después de ${H.historial[i - 1].version}`);
  });
  if (new Set(H.historial.map((e) => e.huella)).size !== H.historial.length) out.push("dos versiones del historial con la misma huella (una versión nueva sin cambio nativo, o una huella copiada)");
  const ult = H.historial[H.historial.length - 1];
  if (ult.version !== A.version) out.push(`la versión de apps.json (${A.version}) no es la última del historial (${ult.version})`);
  const { huella } = huellaNativa(raiz);
  if (ult.huella !== huella) out.push(`cambió el código nativo (apps/mobile) y la versión sigue en ${A.version}: súbela con «node apps/mobile/scripts/version.mjs --subir X.Y.Z»`);
  // Solo crece: lo que había en el último commit sigue igual al principio del historial (nadie re-sella una versión ya publicada).
  try {
    const prev = JSON.parse(execFileSync("git", ["show", `HEAD:${HISTORIAL}`], { cwd: raiz, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
    (prev.historial ?? []).forEach((e, i) => { const x = H.historial[i]; if (!x || x.version !== e.version || x.huella !== e.huella) out.push(`el historial cambió la versión ${e.version} del último commit: solo se agregan versiones`); });
  } catch { /* sin commit anterior con historial: nada que comparar */ }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const i = process.argv.indexOf("--subir");
  if (i > 0) {
    const v = process.argv[i + 1] ?? "", A = JSON.parse(readFileSync(join(RAIZ, "apps.json"), "utf8")), H = leerHistorial() ?? { historial: [] };
    const ult = H.historial[H.historial.length - 1];
    if (!SEMVER.test(v) || (ult && !mayor(v, ult.version))) { console.error(`✗ la versión nueva tiene que ser X.Y.Z y mayor que ${ult?.version ?? "nada"}`); process.exit(2); }
    const j = readFileSync(join(RAIZ, "apps.json"), "utf8").replace(`"version": "${A.version}"`, `"version": "${v}"`);
    writeFileSync(join(RAIZ, "apps.json"), j);
    execFileSync(process.execPath, [join(RAIZ, "scripts/generar.mjs")], { stdio: "inherit" });
    const { huella, archivos } = huellaNativa();
    const out = { $fuente: H.$fuente ?? "Historial de versiones de las cuatro apps (apps/mobile/scripts/version.mjs; guardián versionCoherente). Solo se agrega: cada versión con la huella de lo nativo con que salió.",
      historial: [...H.historial, { version: v, huella, fecha: new Date().toISOString().slice(0, 10) }] };
    writeFileSync(join(REPO, HISTORIAL), JSON.stringify(out, null, 2) + "\n");
    console.log(`✓ versión ${v} · huella ${huella.slice(0, 16)}… (${archivos} archivos de ${relative(REPO, RAIZ)})`);
  } else {
    const p = problemas();
    if (p.length) { for (const x of p) console.error(`✗ ${x}`); process.exit(1); }
    const H = leerHistorial();
    console.log(`✓ versión ${H.historial[H.historial.length - 1].version}: lo nativo coincide con su huella`);
  }
}
