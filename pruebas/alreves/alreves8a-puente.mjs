// Prueba al revés de puenteSoloNuestroOrigen y cascaraArrancaIos: cada caso rompe algo, corre el guardián (debe fallar) y restaura.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
// 9a · Corre desde la raíz del repo (o la que se pase como argumento).
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
process.chdir(process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
const orig = (sha, f) => execSync(`git show ${sha}:${f}`, { encoding: "utf8" });
const casos = [
  ["puenteSoloNuestroOrigen", "a5c4cc4: config de Negocios original (server.url con /panel)", "apps/mobile/android/app/src/negocios/assets/capacitor.config.json", () => orig("a5c4cc4", "apps/mobile/android/app/src/negocios/assets/capacitor.config.json")],
  ["puenteSoloNuestroOrigen", "a5c4cc4: config de Puerta original", "apps/mobile/android/app/src/puerta/assets/capacitor.config.json", () => orig("a5c4cc4", "apps/mobile/android/app/src/puerta/assets/capacitor.config.json")],
  ["puenteSoloNuestroOrigen", "a5c4cc4: MainActivity original (sin quitar objetos Java)", "apps/mobile/android/app/src/main/java/com/tolatino/cascara/MainActivity.java", () => orig("a5c4cc4", "apps/mobile/android/app/src/main/java/com/tolatino/cascara/MainActivity.java")],
  ["puenteSoloNuestroOrigen", "MainActivity sin quitar CapacitorCookiesAndroidInterface", "apps/mobile/android/app/src/main/java/com/tolatino/cascara/MainActivity.java", (t) => t.replace(', "CapacitorCookiesAndroidInterface"', "")],
  ["puenteSoloNuestroOrigen", "addJavascriptInterface en un plugin", "apps/mobile/plugins/tl-local/android/com/tolatino/plugins/TLLocalPlugin.java", (t) => t.replace("public class TLLocalPlugin extends Plugin {", "public class TLLocalPlugin extends Plugin {\n    @Override public void load() { getBridge().getWebView().addJavascriptInterface(this, \"tl\"); }")],
  ["puenteSoloNuestroOrigen", "allowNavigation con comodín", "apps/mobile/android/app/src/cliente/assets/capacitor.config.json", (t) => t.replace('"allowNavigation": [\n      "pruebas.tolatino.com"', '"allowNavigation": [\n      "*.tolatino.com"')],
  ["puenteSoloNuestroOrigen", "useLegacyBridge true", "apps/mobile/android/app/src/repartidor/assets/capacitor.config.json", (t) => t.replace('"useLegacyBridge": false', '"useLegacyBridge": true')],
  ["puenteSoloNuestroOrigen", "CapacitorCookies encendido", "apps/mobile/android/app/src/cliente/assets/capacitor.config.json", (t) => t.replace('"plugins": {', '"plugins": {\n    "CapacitorCookies": { "enabled": true },')],
  ["puenteSoloNuestroOrigen", "portero sin isMainFrame", "apps/mobile/ios/App/TLBridgeViewController.swift", (t) => t.replace("guard message.frameInfo.isMainFrame else { return }", "")],
  ["puenteSoloNuestroOrigen", "otro manejador de mensajes en un plugin de iOS", "apps/mobile/plugins/tl-pantalla/ios/TLPantallaPlugin.swift", (t) => t.replace("override public func load() {", 'override public func load() { bridge?.webView?.configuration.userContentController.add(self as! WKScriptMessageHandler, name: "x")')],
  ["puenteSoloNuestroOrigen", "escena con CAPBridgeViewController", "apps/mobile/ios/App/SceneDelegate.swift", (t) => t.replace("TLBridgeViewController()", "CAPBridgeViewController()")],
  ["puenteSoloNuestroOrigen", "iframe del humo con allow-same-origin", "apps/mobile/scripts/humo/marco-ajeno.js", (t) => t.replace('f.sandbox = "allow-scripts";', 'f.sandbox = "allow-scripts allow-same-origin";')],
  ["puenteSoloNuestroOrigen", "humo que acepta \"true\"", "apps/mobile/scripts/humo-android.sh", (t) => t.replace(`[ "$r" = '"false"' ] || {`, `[ -n "$r" ] || {`)],
  ["puenteSoloNuestroOrigen", "humo sin la isla", "apps/mobile/scripts/humo-android.sh", (t) => t.replace('    marco "$s" "isla"\n', "")],
  ["puenteSoloNuestroOrigen", "a5c4cc4: humo original (lista a mano, sin marco principal)", "apps/mobile/scripts/humo-android.sh", () => orig("a5c4cc4", "apps/mobile/scripts/humo-android.sh")],
  ["cascaraArrancaIos", "a5c4cc4: Info.plist original de Puerta (UILaunchScreen)", "apps/mobile/ios/Targets/ToLatinoPuerta/Info.plist", () => orig("a5c4cc4", "apps/mobile/ios/Targets/ToLatinoPuerta/Info.plist")],
  ["cascaraArrancaIos", "sin el storyboard", "apps/mobile/ios/App/LaunchScreen.storyboard", null],
  ["cascaraArrancaIos", "appStartPath en iOS", "apps/mobile/ios/Targets/ToLatinoNegocios/capacitor.config.json", (t) => t.replace('"url": "https://pruebas.tolatino.com/panel",', '"url": "https://pruebas.tolatino.com",\n    "appStartPath": "/panel",')],
  ["cascaraArrancaIos", "TLLocal sin @objc", "apps/mobile/plugins/tl-local/ios/TLLocalPlugin.swift", (t) => t.replace("@objc(TLLocalPlugin)\n", "")],
  ["cascaraArrancaIos", "a5c4cc4: humo de iOS original (sin registros)", "apps/mobile/scripts/humo-ios.sh", () => orig("a5c4cc4", "apps/mobile/scripts/humo-ios.sh")],
  ["islaCoherente", "a5c4cc4: TLAlcance original (manda la isla al navegador)", "apps/mobile/plugins/tl-alcance/android/com/tolatino/plugins/TLAlcancePlugin.java", () => orig("a5c4cc4", "apps/mobile/plugins/tl-alcance/android/com/tolatino/plugins/TLAlcancePlugin.java")],
  ["islaCoherente", "a5c4cc4: humo original (acepta «Sin señal» en cualquier página)", "apps/mobile/scripts/humo-android.sh", () => orig("a5c4cc4", "apps/mobile/scripts/humo-android.sh")],
  ["islaCoherente", "934c24f: MainActivity sin servir el origen local", "apps/mobile/android/app/src/main/java/com/tolatino/cascara/MainActivity.java", () => orig("934c24f", "apps/mobile/android/app/src/main/java/com/tolatino/cascara/MainActivity.java")],
  ["islaCoherente", "JS de Capacitor inyectado en todos los orígenes", "apps/mobile/android/app/src/main/java/com/tolatino/cascara/MainActivity.java", (t) => t.replace('Collections.singleton(b.getScheme() + "://" + host)', 'Collections.singleton("*")')],
  ["cascaraArrancaIos", "b0c5ee8: humo de iOS con «launchctl list | grep -q» y pipefail", "apps/mobile/scripts/humo-ios.sh", () => orig("b0c5ee8", "apps/mobile/scripts/humo-ios.sh")],
  ["cascaraArrancaIos", "b0c5ee8: humo de Android con «echo | grep -q»", "apps/mobile/scripts/humo-android.sh", () => orig("b0c5ee8", "apps/mobile/scripts/humo-android.sh")],
  ["islaCoherente", "humo sin comprobar TLLocal en la isla", "apps/mobile/scripts/humo-android.sh", (t) => t.replace('    origen_local "$s" "isla"\n', "")],
];
let ok = 0;
for (const [g, que, f, mut] of casos) {
  const antes = readFileSync(f, "utf8");
  if (mut === null) renameSync(f, f + ".x"); else { const d = mut(antes); if (d === antes) { console.log(`?? ${que}: la mutación no cambió nada`); continue; } writeFileSync(f, d); }
  let salida = "", fallo = false;
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { stdio: "pipe" }); } catch (e) { fallo = true; salida = String(e.stderr).split("\n").find((l) => l.includes(`[${g}]`)) ?? ""; }
  if (mut === null) renameSync(f + ".x", f); else writeFileSync(f, antes);
  console.log(`${fallo ? "✓ falla" : "✗ NO FALLA"} · ${que}${salida ? "\n    " + salida.trim() : ""}`);
  if (fallo) ok++;
}
console.log(`${ok}/${casos.length} al revés`);
for (const g of ["puenteSoloNuestroOrigen", "cascaraArrancaIos"]) console.log(execSync(`node guardianes/run.mjs --solo ${g}`, { encoding: "utf8" }).trim());
