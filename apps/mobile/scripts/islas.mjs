#!/usr/bin/env node
/* 8a · Las islas locales (fase8-apps.md §3.1 «Islas locales»): las páginas estáticas que funcionan sin servidor se copian del build de Next al
   paquete de cada cáscara, con lo que cargan (/_next/static, fuentes, logos y el lector de QR de la Puerta).
   - /app/sin-senal → index.html: la página local de cada cáscara (server.errorPath y la de arranque si no hay red).
   - Cada isla de apps.json (Puerta, Mis boletos, Repartidor) → {ruta}.html (el servidor local de Capacitor manda toda ruta sin extensión a
     index.html; por eso las islas se abren con .html).
   Corre después de `pnpm --filter @tolatino/web build`. Falla si una isla no salió estática (guardián islaCoherente). */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = join(RAIZ, "../web"), NEXT = join(WEB, ".next");
const A = JSON.parse(readFileSync(join(RAIZ, "apps.json"), "utf8"));
const html = (ruta) => join(NEXT, "server/app", `${ruta.replace(/^\//, "")}.html`);
const ISLAS = ["/app/sin-senal", ...new Set(A.apps.flatMap((a) => a.islas))];
for (const r of ISLAS) if (!existsSync(html(r))) { console.error(`✗ ${r} no salió estática del build de Next (¿falta force-static o el build?)`); process.exit(1); }

const D = join(RAIZ, "www/comun");
rmSync(join(RAIZ, "www"), { recursive: true, force: true });
mkdirSync(D, { recursive: true });
writeFileSync(join(D, "index.html"), readFileSync(html("/app/sin-senal")));
for (const r of ISLAS.slice(1)) { mkdirSync(dirname(join(D, `${r}.html`)), { recursive: true }); writeFileSync(join(D, `${r}.html`), readFileSync(html(r))); }
cpSync(join(NEXT, "static"), join(D, "_next/static"), { recursive: true });
for (const x of ["fuentes", "assets"]) cpSync(join(WEB, "public", x), join(D, x), { recursive: true });
// La Puerta lee el QR con jsQR en un Worker (/puerta/lector.js) donde no hay BarcodeDetector (iOS): va con la isla. Nada del service worker.
mkdirSync(join(D, "puerta"), { recursive: true });
for (const f of readdirSync(join(WEB, "public/puerta"))) if (/\.(js|txt)$/.test(f) && f !== "sw.js") cpSync(join(WEB, "public/puerta", f), join(D, "puerta", f));
let n = 0, b = 0;
const contar = (d) => { for (const f of readdirSync(d)) { const p = join(d, f), s = statSync(p); if (s.isDirectory()) contar(p); else { n++; b += s.size; } } };
contar(D);
console.log(`✓ islas: ${ISLAS.join(", ")} · ${n} archivos · ${(b / 1048576).toFixed(1)} MB en apps/mobile/www/comun`);
