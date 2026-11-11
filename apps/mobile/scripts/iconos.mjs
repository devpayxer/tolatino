/* 8a · Íconos y splash de las cuatro cáscaras (hueco #1 del plan de la Fase 8, §6 #21): el logo de To'Latino (assets del sistema) sobre el
   color de cada app (token de apps.json) y, para Negocios, Repartidor y Puerta, un ícono de los del sistema (Icon.js) en una placa. Nada se
   dibuja a mano: el logo y los trazos salen del sistema de diseño, los colores de tokens.css. Se generan al preparar un build (no van al repo).
   Apple: un PNG de 1024 sin transparencia + el splash (color «Splash» y el logo). Android: adaptativo (frente, fondo y monocromo) y el clásico. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { token } from "./tokens.mjs";

const UI = (r) => join(r, "../../packages/ui/src");
function trazos(raiz, nombre) {
  const t = readFileSync(join(UI(raiz), "ds/core/Icon.js"), "utf8");
  const m = new RegExp(`"${nombre}": (\\[\\[.*?\\]\\]),\\n`).exec(t);
  if (!m) throw new Error(`Icon.js no tiene «${nombre}»`);
  return JSON.parse(m[1]).map((x) => (x[0] === "p" ? `<path d="${x[1]}"/>` : `<circle cx="${x[1]}" cy="${x[2]}" r="${x[3]}"/>`)).join("");
}
function logo(raiz, color) {
  const s = readFileSync(join(UI(raiz), "assets/logo-tolatino-white.svg"), "utf8");
  const d = /<path d="([^"]+)"/.exec(s)[1];
  return `<path d="${d}" fill="${color}"/>`;
}
/* El ícono de una app en un lienzo de `n` px. `frente` = solo el frente (Android adaptativo, fondo transparente). */
function svg(raiz, a, n, o = {}) {
  const fondo = token(a.color), blanco = token("--tl-white"), seguro = o.frente ? n * (72 / 108) : n;
  const L = seguro * 0.52, x = (n - L) / 2, y = (n - L) / 2 - (a.icono ? seguro * 0.04 : 0);
  let placa = "";
  if (a.icono) {
    const P = seguro * 0.3, px = (n + seguro) / 2 - P - seguro * 0.1, py = (n + seguro) / 2 - P - seguro * 0.1;
    placa = `<rect x="${px}" y="${py}" width="${P}" height="${P}" rx="${P * 0.28}" fill="${o.mono ? "none" : blanco}" stroke="${o.mono ? blanco : "none"}" stroke-width="${o.mono ? P * 0.06 : 0}"/>
      <g transform="translate(${px + P * 0.14} ${py + P * 0.14}) scale(${(P * 0.72) / 24})" fill="none" stroke="${o.mono ? blanco : fondo}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${trazos(raiz, a.icono)}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 ${n} ${n}">
    ${o.frente || o.mono ? "" : `<rect width="${n}" height="${n}" fill="${fondo}"/>`}
    <g transform="translate(${x} ${y}) scale(${L / 482})">${logo(raiz, blanco)}</g>${placa}</svg>`;
}

export async function iconos(A, raiz) {
  const sharp = (await import("sharp")).default;
  const png = (s, n) => sharp(Buffer.from(s)).resize(n, n).png().toBuffer();
  for (const a of A.apps) {
    /* iOS */
    const X = join(raiz, `ios/Targets/${a.target}/Assets.xcassets`);
    mkdirSync(join(X, "AppIcon.appiconset"), { recursive: true });
    writeFileSync(join(X, "Contents.json"), JSON.stringify({ info: { author: "tolatino", version: 1 } }));
    writeFileSync(join(X, "AppIcon.appiconset/AppIcon-1024.png"), await sharp(Buffer.from(svg(raiz, a, 1024))).flatten({ background: token(a.color) }).png().toBuffer());
    writeFileSync(join(X, "AppIcon.appiconset/Contents.json"), JSON.stringify({ images: [{ filename: "AppIcon-1024.png", idiom: "universal", platform: "ios", size: "1024x1024" }], info: { author: "tolatino", version: 1 } }));
    const papel = token("--tl-paper"), rgb = (h) => ({ red: `0x${h.slice(1, 3)}`, green: `0x${h.slice(3, 5)}`, blue: `0x${h.slice(5, 7)}` });
    mkdirSync(join(X, "Splash.colorset"), { recursive: true });
    writeFileSync(join(X, "Splash.colorset/Contents.json"), JSON.stringify({ colors: [{ idiom: "universal", color: { "color-space": "srgb", components: { ...rgb(papel), alpha: "1.000" } } }], info: { author: "tolatino", version: 1 } }));
    mkdirSync(join(X, "SplashLogo.imageset"), { recursive: true });
    const tinta = readFileSync(join(UI(raiz), "assets/logo-tolatino-ink.svg"));
    for (const k of [1, 2, 3]) writeFileSync(join(X, `SplashLogo.imageset/logo@${k}x.png`), await sharp(tinta).resize(120 * k, 120 * k).png().toBuffer());
    writeFileSync(join(X, "SplashLogo.imageset/Contents.json"), JSON.stringify({ images: [1, 2, 3].map((k) => ({ filename: `logo@${k}x.png`, idiom: "universal", scale: `${k}x` })), info: { author: "tolatino", version: 1 } }));
    /* Android */
    const R = join(raiz, `android/app/src/${a.sabor}/res`);
    for (const [d, k] of [["mdpi", 1], ["hdpi", 1.5], ["xhdpi", 2], ["xxhdpi", 3], ["xxxhdpi", 4]]) {
      mkdirSync(join(R, `mipmap-${d}`), { recursive: true });
      writeFileSync(join(R, `mipmap-${d}/ic_launcher.png`), await png(svg(raiz, a, 512), Math.round(48 * k)));
      writeFileSync(join(R, `mipmap-${d}/ic_launcher_round.png`), await sharp(await png(svg(raiz, a, 512), Math.round(48 * k)))
        .composite([{ input: Buffer.from(`<svg width="${Math.round(48 * k)}" height="${Math.round(48 * k)}"><circle cx="${24 * k}" cy="${24 * k}" r="${24 * k}"/></svg>`), blend: "dest-in" }]).png().toBuffer());
      writeFileSync(join(R, `mipmap-${d}/ic_launcher_foreground.png`), await png(svg(raiz, a, 432, { frente: true }), Math.round(108 * k)));
      writeFileSync(join(R, `mipmap-${d}/ic_launcher_monochrome.png`), await png(svg(raiz, a, 432, { frente: true, mono: true }), Math.round(108 * k)));
    }
    mkdirSync(join(R, "mipmap-anydpi-v26"), { recursive: true });
    const adapt = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>\n</adaptive-icon>\n`;
    writeFileSync(join(R, "mipmap-anydpi-v26/ic_launcher.xml"), adapt);
    writeFileSync(join(R, "mipmap-anydpi-v26/ic_launcher_round.xml"), adapt);
    mkdirSync(join(R, "values"), { recursive: true });
    writeFileSync(join(R, "values/ic_launcher_background.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${token(a.color)}</color>\n</resources>\n`);
  }
}

/* Para la revisión del fundador: los cuatro íconos lado a lado en un PNG (node apps/mobile/scripts/iconos.mjs <salida.png>). */
if (process.argv[1] && process.argv[1].endsWith("iconos.mjs") && process.argv[2]) {
  const { fileURLToPath } = await import("node:url");
  const raiz = join(fileURLToPath(import.meta.url), "../..");
  const A = JSON.parse(readFileSync(join(raiz, "apps.json"), "utf8"));
  const sharp = (await import("sharp")).default, N = 240, G = 40;
  const capas = await Promise.all(A.apps.map(async (a, i) => ({ input: await sharp(Buffer.from(svg(raiz, a, 1024))).resize(N, N).composite([{ input: Buffer.from(`<svg width="${N}" height="${N}"><rect width="${N}" height="${N}" rx="${N * 0.22}"/></svg>`), blend: "dest-in" }]).png().toBuffer(), left: G + i * (N + G), top: G })));
  await sharp({ create: { width: G + A.apps.length * (N + G), height: N + 2 * G, channels: 4, background: token("--tl-paper") } }).composite(capas).png().toFile(process.argv[2]);
  console.log(`✓ ${process.argv[2]}`);
}
