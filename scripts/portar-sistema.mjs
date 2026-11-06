#!/usr/bin/env node
/* Porta el sistema de diseño exportado (docs/diseno/design-system/components-web, 2 nov 2026)
   a packages/ui/src/ds como módulos ESM. Es determinista: se puede volver a correr y produce lo mismo.

   Qué hace con cada componente:
   1. Lo envuelve como módulo: "use client" + import de React + el registro común (__ds_scope).
   2. Cambia cada color hex por su token (var(--tl-…)). Los hex del sistema que no tenían token
      se registran como tokens puntuales --tl-ds-xxxxxx en packages/ui/src/tokens.css.
   3. Quita lo que es solo del prototipo: window.TLHoursPro (datos de demo con hora fija) y
      assets/icons/icons.js (duplicado de Icon).
   Al final escribe packages/ui/src/ds/index.ts con los 132 nombres exportados. */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";

const RAIZ = new URL("..", import.meta.url).pathname;
const ORIGEN = join(RAIZ, "docs/diseno/design-system/components-web/components");
const DESTINO = join(RAIZ, "packages/ui/src/ds");
const TOKENS = join(RAIZ, "packages/ui/src/tokens.css");

const TOKEN_DE = {
  "0B0E12": "--tl-ink", "7B61FF": "--tl-brand", "4B37F5": "--tl-action", "2E1FD1": "--tl-action-hover",
  "00E5C4": "--tl-signal", "F7F6F3": "--tl-paper", "FFFFFF": "--tl-white", "FFF": "--tl-white",
  "FFB020": "--tl-pro", "EDEBE6": "--tl-desk", "00A88F": "--tl-open", "00695B": "--tl-open-text",
  "C0392B": "--tl-danger", "FF2D7A": "--tl-mod-events", "1E7BFF": "--tl-mod-transport",
  "0FA958": "--tl-mod-realestate", "FF8A1F": "--tl-mod-autos", "C2410C": "--tl-mod-jobs",
  "14181F": "--tl-dark-2", "1C222B": "--tl-dark-3", "E4E1DA": "--tl-photo-bg", "DDD9D1": "--tl-photo-bg-2",
  "F6F7F5": "--tl-paper-2", "E8EDE9": "--tl-mint-soft", "8A5A00": "--tl-pro-ink", "04120F": "--tl-signal-ink",
};
const SOLO_PROTOTIPO = new Set(["patterns/hours-pro.js"]);

const puntuales = new Map();
const nombres = [];
const grupos = {};
const archivos = [];
(function recorrer(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) recorrer(p);
    else if (n.endsWith(".js")) archivos.push(p);
  }
})(ORIGEN);
archivos.sort();

rmSync(DESTINO, { recursive: true, force: true });
for (const src of archivos) {
  const rel = relative(ORIGEN, src);
  if (SOLO_PROTOTIPO.has(rel)) continue;
  let t = readFileSync(src, "utf8");

  // Encabezado del export original fuera; el nuevo dice de dónde viene.
  t = t.replace(/^\/\/ Fuente:.*\n\/\/ Compilado.*\n/, "");

  // Datos de demo del prototipo fuera (regla: lo del prototipo no se construye).
  t = t.replace(/data \|\| \(typeof window !== 'undefined' && window\.TLHoursPro \? window\.TLHoursPro\(\) : (\{[\s\S]*?\})\)/, "data || $1");

  // BusinessCard: con menos de 5 reseñas el prototipo (cardItem) no pinta estrellas sino «3 reseñas» o
  // «Nuevo · en To'Latino» (nota en gris). El componente del sistema no lo traía; se agrega aquí, no a mano.
  if (rel.endsWith("cards/BusinessCard.js")) {
    const antes = t;
    t = t.replace(/const Stars = \(\{\n  r,\n  n,\n  size = 12\.5\n\}\) => /,
      "const Stars = ({\n  r,\n  n,\n  note,\n  size = 12.5\n}) => n != null && n < 5 ? /*#__PURE__*/React.createElement(\"span\", {\n  style: {\n    whiteSpace: 'nowrap',\n    flex: 'none',\n    font: '700 ' + size + 'px Manrope,sans-serif'\n  }\n}, r, note ? /*#__PURE__*/React.createElement(\"span\", {\n  style: {\n    fontWeight: 500,\n    color: 'rgba(11,14,18,.42)'\n  }\n}, \" \", note) : null) : ");
    t = t.replace(/React\.createElement\(Stars, \{\n(\s*)r: rating,\n(\s*)n: reviews/g, "React.createElement(Stars, {\n$1r: rating,\n$2n: reviews,\n$2note: reviewsNote");
    t = t.replace(/  reviews,\n  status,/, "  reviews,\n  reviewsNote,\n  status,");
    if (t === antes || (t.match(/note: reviewsNote/g) || []).length !== 2 || !t.includes("reviewsNote,\n  status")) throw new Error("parche BusinessCard: el origen cambió, revisar");
  }

  // HoursPro: textos fijos en español (AHORA, PRÓXIMOS CAMBIOS, Esta semana) → props para ES/EN; y el estado
  // siempre en verde → `statusColor` (un «Cerrado» va en rojo, como en el resto de la ficha).
  if (rel.endsWith("patterns/HoursPro.js")) {
    const antes = t;
    t = t.replace("  nextLabel,\n", "  nextLabel,\n  nowLabel,\n  changesLabel,\n  weekLabel,\n  statusColor,\n");
    t = t.replace('}, "AHORA")', '}, nowLabel || "AHORA")');
    t = t.replace('}, "PR\\xD3XIMOS CAMBIOS")', '}, changesLabel || "PR\\xD3XIMOS CAMBIOS")');
    t = t.replace('}, "Esta semana")', '}, weekLabel || "Esta semana")');
    t = t.replace(/(letterSpacing: '-\.04em',\n\s*color: )'#00695B'/, "$1statusColor || '#00695B'");
    if (t === antes || !t.includes("nowLabel ||") || !t.includes("changesLabel ||") || !t.includes("weekLabel ||") || !t.includes("statusColor ||"))
      throw new Error("parche HoursPro: el origen cambió, revisar");
  }

  // RadiusMap: las teselas son propias (OpenStreetMap con el esquema OpenMapTiles), ya no de Esri. El crédito que la
  // licencia de los datos exige (ODbL y CC-BY) es el de OpenMapTiles y OpenStreetMap.
  if (rel.endsWith("city/RadiusMap.js")) {
    const antes = t;
    t = t.replace('"\\xA9 Esri \\xB7 OpenStreetMap"', '"\\xA9 OpenMapTiles \\xB7 \\xA9 OpenStreetMap"');
    if (t === antes) throw new Error("parche RadiusMap: el origen cambió, revisar");
  }

  // SiteHeader: el prototipo tiene un encabezado compacto en el teléfono («APP-HEADER · móvil compacto»: logo, idioma,
  // campana y entrar, sin la barra de búsqueda) para Mapa, la ficha, la galería y otras pantallas de detalle. El
  // componente del sistema no lo traía; `compact` lo agrega aquí, no a mano.
  // Button: el botón base era un <div> con onClick, sin rol, sin foco y sin teclado (6 nov, 2l: ningún lector de pantalla ni
  // teclado podía usar los botones de la app). Aquí se vuelve un botón accesible: role, tabIndex (no enfocable si está
  // apagado), aria-disabled y Enter/Espacio. Se ve igual.
  if (rel.endsWith("core/Button.js")) {
    const antes = t;
    t = t.replace("  return /*#__PURE__*/React.createElement(\"div\", {\n    onClick: disabled ? undefined : onClick,\n    style: {",
      "  return /*#__PURE__*/React.createElement(\"div\", {\n    onClick: disabled ? undefined : onClick,\n    role: \"button\",\n    tabIndex: disabled ? -1 : 0,\n    \"aria-disabled\": disabled ? true : undefined,\n    onKeyDown: disabled || !onClick ? undefined : e => {\n      if (e.key === 'Enter' || e.key === ' ') {\n        e.preventDefault();\n        onClick(e);\n      }\n    },\n    style: {");
    if (t === antes || !t.includes('role: "button"')) throw new Error("parche Button: el origen cambió, revisar");
  }

  if (rel.endsWith("layout/SiteHeader.js")) {
    const antes = t;
    t = t.replace("  sticky,\n  style\n}) {", "  sticky,\n  compact,\n  style\n}) {");
    t = t.replace("padding: '6px 20px 14px',", "padding: compact ? '6px 16px 10px' : '6px 20px 14px',");
    t = t.replace('loginLabel)), /*#__PURE__*/React.createElement("div", {\n    onClick: onSearch,', 'loginLabel)), compact ? null : /*#__PURE__*/React.createElement("div", {\n    onClick: onSearch,');
    if (t === antes || !t.includes("  compact,\n") || !t.includes("compact ? '6px 16px 10px'") || !t.includes("compact ? null :")) throw new Error("parche SiteHeader: el origen cambió, revisar");
    // La campana era un <span> con onClick: sin rol, nombre ni teclado (6 nov, 2j: la bandeja de avisos). Botón accesible
    // con su nombre en el idioma del encabezado («Notificaciones, sin leer»), o el que pase la pantalla (`bellLabel`).
    const b0 = t;
    t = t.replace("function Bell({\n  unread,\n  onClick\n}) {\n  return /*#__PURE__*/React.createElement(\"span\", {\n    onClick: onClick,\n",
      "function Bell({\n  unread,\n  onClick,\n  label\n}) {\n  return /*#__PURE__*/React.createElement(\"span\", {\n    onClick: onClick,\n    role: \"button\",\n    tabIndex: 0,\n    \"aria-label\": label,\n    onKeyDown: e => {\n      if (e.key === 'Enter' || e.key === ' ') {\n        e.preventDefault();\n        onClick && onClick();\n      }\n    },\n");
    t = t.replace("  onBell,\n  onLogin,", "  onBell,\n  bellLabel,\n  onLogin,");
    t = t.replaceAll("React.createElement(Bell, {\n    unread: unread,\n    onClick: onBell\n  })", "React.createElement(Bell, {\n    unread: unread,\n    onClick: onBell,\n    label: bellLabel || (lang === 'EN' ? (unread ? 'Notifications, unread' : 'Notifications') : unread ? 'Notificaciones, sin leer' : 'Notificaciones')\n  })");
    if (t === b0 || (t.match(/label: bellLabel/g) || []).length !== 2 || !t.includes('"aria-label": label')) throw new Error("parche SiteHeader (campana): el origen cambió, revisar");
  }

  // PostCard (VoteBar): votar, comentar, guardar y compartir eran <span> con onClick: sin rol ni teclado. Aquí se vuelven
  // botones accesibles (role, tabIndex, Enter/Espacio) con su nombre en el idioma de la pantalla (`labels`, ES por defecto).
  if (rel.endsWith("community/PostCard.js")) {
    const antes = t;
    t = t.replace("function VoteBar({\n  score = 0,", "const btn = (fn, label) => fn ? { role: 'button', tabIndex: 0, 'aria-label': label, onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } } } : {};\nconst LBL = { up: 'Votar a favor', down: 'Votar en contra', comments: 'Comentarios', save: 'Guardar', share: 'Compartir' };\nfunction VoteBar({\n  labels = LBL,\n  score = 0,");
    t = t.replace("    onClick: onUp,\n", "    onClick: onUp,\n    ...btn(onUp, labels.up),\n");
    t = t.replace("    onClick: onDown,\n", "    onClick: onDown,\n    ...btn(onDown, labels.down),\n");
    t = t.replace("    onClick: onComments,\n", "    onClick: onComments,\n    ...btn(onComments, labels.comments),\n");
    t = t.replace("    onClick: onSave,\n", "    onClick: onSave,\n    ...btn(onSave, labels.save),\n");
    t = t.replace("    onClick: onShare,\n", "    onClick: onShare,\n    ...btn(onShare, labels.share),\n");
    if (t === antes || (t.match(/\.\.\.btn\(/g) || []).length !== 5) throw new Error("parche PostCard: el origen cambió, revisar");
  }

  // Hex → token.
  t = t.replace(/#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g, (m, h) => {
    const H = h.toUpperCase();
    if (TOKEN_DE[H]) return `var(${TOKEN_DE[H]})`;
    const nombre = `--tl-ds-${H.toLowerCase()}`;
    puntuales.set(nombre, `#${H}`);
    return `var(${nombre})`;
  });

  const m = [...t.matchAll(/Object\.assign\(__ds_scope, \{([^}]*)\}\);/g)];
  for (const x of m) {
    const ns = x[1].split(",").map((s) => s.trim()).filter(Boolean);
    nombres.push(...ns);
    const g = rel.split("/")[0];
    (grupos[g] ??= []).push(...ns.filter((n) => !/^[A-Z_]+$/.test(n)));
  }

  const profundidad = relative(dirname(join(DESTINO, rel)), DESTINO) || ".";
  const cabecera = `"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/${rel}
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "${profundidad}/scope.js";
`;
  mkdirSync(dirname(join(DESTINO, rel)), { recursive: true });
  writeFileSync(join(DESTINO, rel), cabecera + "\n" + t);
}

writeFileSync(join(DESTINO, "scope.js"), `/* Registro común de los componentes portados: cada módulo se agrega aquí y busca a los demás aquí. */
export const __ds_scope = {};
`);

const modulos = archivos.map((a) => relative(ORIGEN, a)).filter((r) => !SOLO_PROTOTIPO.has(r));
const unicos = [...new Set(nombres)];
writeFileSync(join(DESTINO, "index.ts"), `"use client";
/* Generado por scripts/portar-sistema.mjs — ${unicos.length} exportaciones de ${modulos.length} módulos. */
import type { ComponentType } from "react";
import { __ds_scope } from "./scope.js";
${modulos.map((r) => `import "./${r}";`).join("\n")}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type C = ComponentType<any>;
const S = __ds_scope as Record<string, unknown>;
${unicos.map((n) => (/^[A-Z_]+$/.test(n) ? `export const ${n} = S.${n} as unknown;` : `export const ${n} = S.${n} as C;`)).join("\n")}
`);

writeFileSync(join(DESTINO, "catalogo.ts"), `/* Generado por scripts/portar-sistema.mjs — componentes por grupo, para la página /sistema. */
export const CATALOGO: Record<string, string[]> = ${JSON.stringify(grupos, null, 2)};
`);

// Tokens puntuales del sistema (colores que el sistema usa pero que no tenían nombre).
let tok = readFileSync(TOKENS, "utf8").replace(/\n\/\* ── Puntuales del sistema[\s\S]*$/, "\n");
const lineas = [...puntuales].sort().map(([n, v]) => `  ${n}: ${v};`).join("\n");
tok = tok.trimEnd() + `\n\n/* ── Puntuales del sistema (generado por scripts/portar-sistema.mjs): colores que los componentes
   del sistema usan una o pocas veces y no tenían token. Se nombran por su valor; no se usan en pantallas nuevas. */
:root {\n${lineas}\n}\n`;
writeFileSync(TOKENS, tok);

console.log(`portados ${modulos.length} módulos · ${unicos.length} exportaciones · ${puntuales.size} tokens puntuales`);
