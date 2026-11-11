#!/usr/bin/env node
/* 8f · Los mapas de fuente del navegador NUNCA se sirven (fase8-apps.md §4 8f: «simbolizado en el servidor»). `next build` los escribe junto a
   cada archivo de /_next/static (productionBrowserSourceMaps en next.config.ts); este paso, que corre justo después del build (package.json de
   apps/web), los MUEVE fuera de lo que se sirve:
   - .next/static/**.js.map → .next/standalone/apps/web/.next/mapas/static/**.js.map (lo que corre en el servidor y entra a la imagen de Docker)
     y, si no hay standalone, a .next/mapas/. lib/errores/simbolizar.ts los lee de ahí, en el servidor.
   - En .next/static no queda ni un .map: ni Next (que sirve /_next/static de esa carpeta), ni nginx, ni las islas de las cáscaras
     (apps/mobile/scripts/islas.mjs copia .next/static) pueden entregarlos. El comentario sourceMappingURL queda y apunta a un 404.
   Falla (y con ello el build) si después de moverlos queda alguno en .next/static. Guardián mapasPrivados. */
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const WEB = process.argv[2] ?? process.cwd();
const NEXT = join(WEB, ".next"), STATIC = join(NEXT, "static");
if (!existsSync(STATIC)) { console.error(`✗ mapas-privados: no existe ${STATIC} (¿corrió next build?)`); process.exit(1); }
const STANDALONE = join(NEXT, "standalone/apps/web/.next");
const DESTINO = join(existsSync(STANDALONE) ? STANDALONE : NEXT, "mapas");
rmSync(DESTINO, { recursive: true, force: true });
let n = 0, b = 0;
const mover = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f), s = statSync(p);
    if (s.isDirectory()) { mover(p); continue; }
    if (!f.endsWith(".map")) continue;
    const q = join(DESTINO, "static", relative(STATIC, p));
    mkdirSync(dirname(q), { recursive: true });
    renameSync(p, q);
    n++; b += s.size;
  }
};
mover(STATIC);
const quedan = [];
const buscar = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) buscar(p); else if (f.endsWith(".map")) quedan.push(p); } };
buscar(STATIC);
if (quedan.length) { console.error(`✗ mapas-privados: quedaron ${quedan.length} mapas en .next/static (se servirían)`); process.exit(1); }
console.log(`✓ mapas-privados: ${n} mapas (${(b / 1048576).toFixed(1)} MB) fuera de lo que se sirve → ${relative(WEB, DESTINO)}`);
