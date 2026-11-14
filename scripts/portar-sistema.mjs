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
// PORTAR_DESTINO / PORTAR_TOKENS: escribir en otra carpeta (el guardián sistemaSincronizado lo corre así y compara con el repo).
const DESTINO = process.env.PORTAR_DESTINO || join(RAIZ, "packages/ui/src/ds");
const TOKENS = join(RAIZ, "packages/ui/src/tokens.css");
const TOKENS_SALIDA = process.env.PORTAR_TOKENS || TOKENS;

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

// ── 9c · Accesibilidad de los clics mudos ──────────────────────────────────────────────────────────────────────────────────
// El sistema exportado trae ~190 <div>/<span> con onClick y nada más: ni rol, ni foco, ni teclado, ni nombre. En vez de ~190 parches a
// mano, un solo motor (`accesibilizar`) recorre cada módulo y, a cada <div>/<span> con onClick, le agrega con `__ds_scope.__btn(...)`:
// role="button", tabIndex 0, Enter/Espacio (solo cuando el foco está en el propio elemento) y, si no hay texto que lo nombre, su nombre
// (aria-label) en un prop nuevo con valor por defecto ES/EN. Se ve igual: no cambia ni un estilo ni la estructura.
// La tabla dice, por módulo y EN ORDEN de aparición, qué es cada clic; la pista `h` es un trozo de la expresión del onClick y el motor
// se detiene si no coincide (si el origen cambia, se revisa aquí, no se adivina). Tipos:
//   b  botón (el texto de dentro lo nombra) · bl botón sin texto: nombre en un prop nuevo `props: [[prop, ES, EN]]`, `le` = expresión
//   p  decorativo o duplicado de otro control (fondo de hoja, zona de toque, foto repetida): role=presentation y aria-hidden
//   w  envoltura que solo detiene el clic (ya tiene controles de verdad dentro): role=presentation
//   n  contenedor clicable con controles dentro (no puede ser role=button: «interactivo anidado»): presentation solo si `inner`
//   k  ya tiene su rol (tab, option): solo foco y teclado · sw interruptor · cb casilla
const bl = (h, props, le, x) => ({ h, t: "bl", props, le, x });
const b = (h, x) => ({ h, t: "b", x });
const P = (h) => ({ h, t: "p" });
const W = (h) => ({ h, t: "w" });
const N = (h, inner) => ({ h, t: "n", inner });
const K = (h, fnx) => ({ h, t: "k", fnx });
const SW = (h, chk, le, props) => ({ h, t: "sw", chk, le, props });
const CB = (h, chk, le, props) => ({ h, t: "cb", chk, le, props });
const BACK = ["backLabel", "Volver", "Back"], CLOSE = ["closeLabel", "Cerrar", "Close"], SEARCH = ["searchLabel", "Buscar", "Search"];
const A11Y = {
  "account/NeighborCard.js": [b("onProfile"), b("c.onClick"), b("x.onClick : undefined"), b("x.onClick")],
  "admin/AdminBar.js": [b("onCta"), b("onHome"), b("onSearch"), b("o.onClick"), bl("onSearch", [SEARCH], "searchLabel"), bl("onBell", [["bellLabel", "Notificaciones", "Notifications"]], "bellLabel"),
    bl("onMe", [["meLabel", "Mi cuenta", "My account"]], "meLabel"), b("n.onClick"), b("on ? f"), b("r.onClick"), N("onClick", "toggle != null"),
    SW("onToggle", "!!toggle", "title", []), b("onLink"), b("onClick"), b("onClick"), CB("f || undefined", "on", "r.label", []), b("onClick"), bl("onBack", [BACK], "backLabel")],
  "booking/PartyPicker.js": [b("onClick")],
  "booking/PaymentSummary.js": [b("card.onClick")],
  "booking/StaffPicker.js": [b("onClick"), b("onCta")],
  "cards/BusinessCard.js": [N("onOpen", "true"), N("onOpen", "true")],
  "cards/BusinessRow.js": [b("onClick")],
  "cards/EventCard.js": [b("onClick")],
  "cards/EventPromo.js": [b("onPrimary"), b("onSecondary")],
  "cards/StoryCard.js": [bl("dir < 0", [["prevLabel", "Anterior", "Previous"], ["nextLabel", "Siguiente", "Next"]], "dir < 0 ? prevLabel : nextLabel"), P("back"), P("fwd")],
  "city/RadiusMap.js": [b("r.onClick"), b("recommend.onClick")],
  "community/FeedPost.js": [b("answer.onOpen")],
  "community/Patio.js": [bl("onClick", [["tileLabel", "Ficha", "Tile"]], "tileLabel"), b("x.onClick"), bl("p.onClick", [["pieceLabel", "Pieza", "Piece"]], "pieceLabel"), b("o.onClick")],
  "community/PostCard.js": [b("t.onClick"), b("o.onClick"), P("onAuthor"), b("onAuthor"), b("onOpen")],
  "community/Thread.js": [b("t.onClick"), P("onAuthor"), b("onAuthor"), bl("vote.onUp", [["upLabel", "Votar a favor", "Upvote"]], "upLabel"), bl("vote.onDown", [["downLabel", "Votar en contra", "Downvote"]], "downLabel"),
    b("onReply"), b("solve.onClick"), N("business.onOpen", "true"), bl("r.vote", [["upLabel", "Votar a favor", "Upvote"]], "upLabel"), b("r.onReply"), b("onToggle"), b("onToggle"),
    P("b.onOpen"), b("b.onOpen"), bl("b.onVote", [["voteLabel", "Votar", "Vote"]], "voteLabel")],
  "compa/CompaFrame.js": [P("onClose"), bl("onClose", [CLOSE], "closeLabel"), bl("onBack", [BACK], "backLabel"), b("onPerson"), b("onPerson"), bl("onSend", [["sendLabel", "Enviar", "Send"]], "sendLabel")],
  "core/SearchBar.js": [b("onClick")],
  "core/SearchSelect.js": [K("onPick"), b("other.onClick")],
  "core/SectionHeader.js": [b("onAction")],
  "home/ModuleGrid.js": [b("onClick")],
  "layout/AppHeader.js": [b("onLang"), b("onLang")],
  "layout/CategoryHero.js": [bl("onBack", [BACK], "backLabel"), bl("onBack", [BACK], "backLabel"), N("onSearch", "d"), b("t.onClick"), b("t.onClick")],
  "layout/SiteFooter.js": [b("l.onClick"), b("s.onClick"), b("l.onClick"), b("setOpen", "'aria-expanded': open === i"), b("l.onClick"), b("onLang"), b("onCity"), b("l.onClick")],
  "layout/SiteHeader.js": [bl("onClick", [["avatarLabel", "Mi cuenta", "My account"]], "avatarLabel"), bl("onClick", [], "'Idioma: ' + lang"), bl("onHome", [], "\"To\\u2019Latino\""), N("onSearch", "!!onCity"), b("stop(onCity)"),
    bl("onHome", [], "\"To\\u2019Latino\""), N("onSearch", "!!onCity"), b("stop(onCity)"), b("onTab")],
  "listing/BusinessPreview.js": [b("o.onClick"), b("onOpen")],
  "listing/OwnerCard.js": [bl("onTeam", [["teamLabel", "Ver el equipo", "View the team"]], "teamLabel"), b("onLink")],
  "listing/ReviewCard.js": [b("t.onClick"), bl("p.onClick", [["photoLabel", "Foto", "Photo"]], "photoLabel"), bl("helpful.onClick", [["helpfulLabel", "Útil", "Helpful"]], "helpfulLabel"), b("edit.onClick"), b("report.onClick")],
  "menu/MenuItemRow.js": [N("off ? undefined", "true"), W("st"), K("left", "x ? left : undefined"), K("right"), N("onOpen", "true"), bl("onDec", [["decLabel", "Uno menos", "One less"]], "decLabel"), bl("onInc", [["incLabel", "Uno más", "One more"]], "incLabel"), b("onClick"), P("onEdit"), b("onEdit")],
  "navigation/BottomNav.js": [b("it.id", "'aria-current': it.id === active ? 'page' : undefined")],
  "navigation/DesktopTabs.js": [b("t.id", "'aria-current': on ? 'page' : undefined")],
  "navigation/ModuleSwitcher.js": [b("k", "'aria-current': on ? 'page' : undefined")],
  "navigation/Tabs.js": [K("t.id")],
  "onboarding/OnbTopBar.js": [bl("onBack", [BACK], "backLabel"), bl("onExit", [["exitLabel", "Salir", "Exit"]], "exitLabel"), b("f.onClick"), b("onExit"), b("onClick"), b("back.onClick")],
  "order/DeliveryPrefs.js": [b("o.onClick"), b("onSave"), b("x.onClick"), b("r.onClick"), b("onClick"), bl("onClose", [CLOSE], "closeLabel"), b("onChange")],
  "panel/SelectionBar.js": [b("onAll"), bl("onClose", [CLOSE], "closeLabel"), b("a.onClick"), b("a.onClick"), CB("onClick", "on", "selectLabel", [["selectLabel", "Seleccionar", "Select"]])],
  "patterns/HoursPro.js": [b("setOpen", "'aria-expanded': !!open")],
  "rides/RideCard.js": [b("onCta")],
  "rides/RideSearch.js": [b("onSearch")],
  "search/SearchResultRow.js": [b("onClick")],
};
const usadas = new Set();

// Agrega `name = <ES/EN>` al FINAL de los parámetros desestructurados del componente (así `lang`, si existe, ya está ligado).
function agregarProp(t, comp, name, es, en) {
  const m = new RegExp(`(?:function ${comp}\\(|const ${comp} = \\()\\{\\n`).exec(t);
  if (!m) throw new Error(`accesibilidad: no encuentro los parámetros de ${comp}`);
  const ini = m.index + m[0].length, fin = t.indexOf("\n}) ", ini);
  if (fin < 0) throw new Error(`accesibilidad: no encuentro el cierre de los parámetros de ${comp}`);
  if (new RegExp(`(^|\\n)  ${name}\\b`).test(t.slice(ini - 1, fin + 1))) return t;
  const def = `typeof lang !== 'undefined' && lang === 'EN' ? ${JSON.stringify(en)} : ${JSON.stringify(es)}`;
  return t.slice(0, fin) + `,\n  ${name} = ${def}` + t.slice(fin);
}

function accesibilizar(t, rel) {
  const spec = A11Y[rel];
  let L = t.split("\n");
  const pendientes = []; // [línea del onClick, spec, componente]
  let k = 0;
  for (let i = 0; i < L.length; i++) {
    const m = /^(\s*)onClick: (.+?),?$/.exec(L[i]);
    if (!m) continue;
    let a = i;
    while (a >= 0 && !/createElement\(/.test(L[a])) a--;
    if (!/^createElement\("(div|span)"/.test(L[a].slice(L[a].lastIndexOf("createElement(")))) continue;
    let e = i;
    while (e < L.length && !(L[e].match(/^\s*/)[0].length === m[1].length - 2 && /^\s*\}/.test(L[e]))) e++;
    const bloque = L.slice(a, e + 1).join("\n");
    if (/\.\.\.btn\(/.test(bloque) || (/\brole:/.test(bloque) && /tabIndex/.test(bloque))) continue; // ya accesible (parches de 2l a 6c)
    const s = spec && spec[k++];
    if (!s) throw new Error(`accesibilidad: ${rel}:${i + 1} (${m[2]}) no está en la tabla de scripts/portar-sistema.mjs`);
    if (!m[2].includes(s.h)) throw new Error(`accesibilidad: ${rel}:${i + 1} esperaba «${s.h}» y el onClick es «${m[2]}» (el origen cambió: revisar la tabla)`);
    let c = i;
    while (c >= 0 && !/^(?:function (\w+)\(|const (\w+) = \()/.test(L[c])) c--;
    const cm = /^(?:function (\w+)\(|const (\w+) = \()/.exec(L[c] || "");
    pendientes.push({ i, s, m, comp: cm && (cm[1] || cm[2]), ind: m[1] });
  }
  if (spec && k !== spec.length) throw new Error(`accesibilidad: ${rel} tiene ${k} clics mudos y la tabla ${spec.length}`);
  if (spec) usadas.add(rel);
  const props = [];
  for (const { i, s, m, comp, ind } of [...pendientes].reverse()) {
    const fn = m[2];
    for (const [n, es, en] of [...(s.props || [])]) props.push([comp, n, es, en]);
    let linea;
    if (s.t === "p") linea = `${ind}role: 'presentation',\n${ind}'aria-hidden': true,`;
    else if (s.t === "w") linea = `${ind}role: 'presentation',`;
    else if (s.t === "k") linea = `${ind}...__ds_scope.__key(${s.fnx || fn}),`;
    else {
      const x = s.t === "sw" ? `{ role: 'switch', 'aria-checked': ${s.chk}${s.x ? ", " + s.x : ""} }` : s.t === "cb" ? `{ role: 'checkbox', 'aria-checked': !!${s.chk}${s.x ? ", " + s.x : ""} }` : s.x ? `{ ${s.x} }` : "undefined";
      const lab = s.le || "undefined";
      linea = s.t === "n" ? `${ind}...__ds_scope.__btn(${fn}, undefined, undefined, ${s.inner}),` : `${ind}...__ds_scope.__btn(${fn}, ${lab}, ${x}),`;
    }
    L.splice(i + 1, 0, ...linea.split("\n"));
  }
  t = L.join("\n");
  for (const [comp, n, es, en] of props) t = agregarProp(t, comp, n, es, en);
  return t;
}

// Lo que el motor no puede decidir solo: en un contenedor clicable con controles de verdad dentro (tarjetas, el buscador con su ciudad),
// el teclado entra por el nombre / el texto —un <span> role=button dentro—; el clic del ratón sigue subiendo al contenedor.
function parchesAccesibilidad(t, rel) {
  const cambia = (de, a, todas) => {
    if (!t.includes(de)) throw new Error(`accesibilidad (${rel}): el origen cambió, no encuentro «${de.slice(0, 60)}»`);
    t = todas ? t.replaceAll(de, a) : t.replace(de, a);
  };
  const btnSpan = (fn, cond, hijo) => `/*#__PURE__*/React.createElement("span", {\n    ...${cond ? `(${cond} ? __ds_scope.__btn(${fn}) : {})` : `__ds_scope.__btn(${fn})`}\n  }, ${hijo})`;
  if (rel === "cards/BusinessCard.js") {
    cambia("  }, name), meta ? ", `  }, ${btnSpan("onOpen", "", "name")}), meta ? `);
    cambia("  }, name), verified ? ", `  }, ${btnSpan("onOpen", "", "name")}), verified ? `);
  }
  if (rel === "community/Thread.js") cambia("  }, business.name), business.verified", `  }, ${btnSpan("business.onOpen", "", "business.name")}), business.verified`);
  if (rel === "admin/AdminBar.js") cambia("  }, title), has(sub) ?", `  }, ${btnSpan("onClick", "toggle != null", "title")}), has(sub) ?`);
  if (rel === "layout/SiteHeader.js") {
    cambia("  }, searchPlaceholder || 'Buscar en ' + cityShort),", `  }, ${btnSpan("onSearch", "onCity", "searchPlaceholder || 'Buscar en ' + cityShort")}),`);
    cambia("  }, searchPlaceholder || 'Buscar negocios, eventos y más en ' + cityShort),", `  }, ${btnSpan("onSearch", "onCity", "searchPlaceholder || 'Buscar negocios, eventos y más en ' + cityShort")}),`);
    cambia("'Idioma: ' + lang", "(lang === 'EN' ? 'Language: ' : 'Idioma: ') + lang");
    cambia("    initials: initials,\n    onClick: onAvatar\n", "    initials: initials,\n    onClick: onAvatar,\n    avatarLabel: lang === 'EN' ? 'My account' : 'Mi cuenta'\n");
  }
  // AuthSheet (9c): los errores se anuncian (una región role="alert" siempre presente, vacía y sin altura mientras no hay error), los
  // campos tienen nombre y se marcan inválidos / descritos por el error. `error` llega del servidor: la hoja solo lo muestra.
  if (rel === "order/DeliveryPrefs.js") {
    cambia("  terms,\n  desktop,\n", "  terms,\n  desktop,\n  error,\n  phoneLabel = 'Tu teléfono',\n  codeLabel = 'Código de 6 dígitos',\n");
    cambia("    placeholder: \"(570) 555-0142\",\n    inputMode: \"tel\",\n", "    placeholder: \"(570) 555-0142\",\n    inputMode: \"tel\",\n    autoComplete: \"tel\",\n    \"aria-label\": phoneLabel,\n    \"aria-invalid\": error ? true : undefined,\n    \"aria-describedby\": error ? 'tl-auth-error' : undefined,\n");
    cambia("    placeholder: \"\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\",\n    inputMode: \"numeric\",\n", "    placeholder: \"\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\",\n    inputMode: \"numeric\",\n    autoComplete: \"one-time-code\",\n    \"aria-label\": codeLabel,\n    \"aria-invalid\": error ? true : undefined,\n    \"aria-describedby\": error ? 'tl-auth-error' : undefined,\n");
    cambia("  }))), step === 'phone' ? /*#__PURE__*/React.createElement(React.Fragment, null,", "  }))), /*#__PURE__*/React.createElement(\"div\", {\n    id: 'tl-auth-error',\n    role: 'alert',\n    'aria-live': 'assertive',\n    style: error ? {\n      font: '600 12.5px/1.4 Manrope,sans-serif',\n      color: 'var(--tl-danger)',\n      margin: '12px 0 0'\n    } : undefined\n  }, error || null), step === 'phone' ? /*#__PURE__*/React.createElement(React.Fragment, null,");
  }
  // QtyStepper y el «+ / −» del menú: los nombres que estaban fijos en español ahora son props (ES/EN con `lang`).
  if (rel === "menu/MenuItemRow.js") {
    // La fila y la tarjeta del plato llevan el «+» (un botón) dentro: el teclado entra por el nombre del plato.
    cambia("  }, name), desc ? ", `  }, ${btnSpan("off ? undefined : onOpen", "", "name")}), desc ? `);
    cambia("  }, name), /*#__PURE__*/React.createElement(\"div\", {", `  }, ${btnSpan("onOpen", "", "name")}), /*#__PURE__*/React.createElement("div", {`);
    cambia("qty === 1 ? 'Quitar' : 'Uno menos'", "qty === 1 ? removeLabel : decLabel");
    cambia("qty === 0 || x ? 'Agregar' : 'Cantidad: ' + qty", "qty === 0 || x ? addLabel : qtyLabel + ': ' + qty");
    for (const c of ["AddPill", "MenuItemRow", "MenuTile"]) {
      const m = new RegExp(`function ${c}\\(\\{\\n`).exec(t), fin = t.indexOf("\n}) ", m.index);
      t = t.slice(0, fin) + ",\n  lang" + t.slice(fin);
    }
    cambia("React.createElement(AddPill, {\n", "React.createElement(AddPill, {\n    lang: lang,\n", true);
    for (const [n, es, en] of [["removeLabel", "Quitar", "Remove"], ["decLabel", "Uno menos", "One less"], ["addLabel", "Agregar", "Add"], ["qtyLabel", "Cantidad", "Quantity"]]) t = agregarProp(t, "AddPill", n, es, en);
  }
  return t;
}

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

  // IconButton: igual que Button (6 nov, 2p: corazón, compartir y mensaje de la ficha eran <div> mudos). Rol, foco, teclado,
  // aria-pressed cuando está activo y un nombre: `label` (en el idioma de la pantalla) o, si no llega, el del ícono en ES.
  if (rel.endsWith("core/IconButton.js")) {
    const antes = t;
    t = t.replace("function IconButton({\n  icon,\n  size = 50,\n  active,\n  onClick,\n  style\n}) {",
      "const LBL = { heart: 'Guardar', share: 'Compartir', chat: 'Mensaje', phone: 'Llamar', close: 'Cerrar', search: 'Buscar', filter: 'Filtros', map: 'Mapa', pin: 'Cómo llegar', bell: 'Avisos' };\nfunction IconButton({\n  icon,\n  size = 50,\n  active,\n  onClick,\n  label,\n  style\n}) {");
    t = t.replace("  return /*#__PURE__*/React.createElement(\"div\", {\n    onClick: onClick,\n    style: {",
      "  return /*#__PURE__*/React.createElement(\"div\", {\n    onClick: onClick,\n    role: \"button\",\n    tabIndex: 0,\n    \"aria-label\": label || LBL[icon] || icon,\n    \"aria-pressed\": active === undefined ? undefined : !!active,\n    onKeyDown: !onClick ? undefined : e => {\n      if (e.key === 'Enter' || e.key === ' ') {\n        e.preventDefault();\n        onClick(e);\n      }\n    },\n    style: {");
    if (t === antes || !t.includes('role: "button"') || !t.includes("label,")) throw new Error("parche IconButton: el origen cambió, revisar");
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
    // El «⋯» de la publicación (6c, 10 nov): también botón accesible, con su nombre (`menuLabel`, ES por defecto).
    t = t.replace("  onMenu,\n  chip,", "  onMenu,\n  menuLabel = 'Opciones',\n  chip,");
    t = t.replace("    onClick: onMenu,\n", "    onClick: onMenu,\n    ...btn(onMenu, menuLabel),\n");
    if (t === antes || (t.match(/\.\.\.btn\(/g) || []).length !== 6 || !t.includes("menuLabel = 'Opciones'")) throw new Error("parche PostCard: el origen cambió, revisar");
    // 9b-1 · La fila de etiquetas (rango · lugar · resuelto · etiquetas · editado) se envuelve cuando no cabe: con FIJADO · OFERTA ·
    // «EN HOY EN EL BARRIO · QUEDAN 22 H» medía 429 px en un teléfono de 390 y la página entera se corría de lado (nov2g; guardián
    // etiquetasSeEnvuelven). Cada etiqueta sigue en una sola línea.
    const fila = "  })) : null), parts.length ? /*#__PURE__*/React.createElement(\"div\", {\n    style: {\n      display: 'flex',\n      alignItems: 'center',\n      gap: 5,\n      minWidth: 0,";
    if (!t.includes(fila)) throw new Error("parche PostCard (fila de etiquetas): el origen cambió, revisar");
    t = t.replace(fila, "  })) : null), parts.length ? /*#__PURE__*/React.createElement(\"div\", {\n    style: {\n      display: 'flex',\n      flexWrap: 'wrap',\n      alignItems: 'center',\n      gap: 5,\n      rowGap: 6,\n      minWidth: 0,");
  }

  // Thread: el «⋯» de un comentario y de una respuesta era <span> con onClick, sin rol ni teclado (arreglado a mano en 5b; 6c
  // encontró que correr este script lo deshacía). Aquí se vuelven botones accesibles con su nombre (`menuLabel`, ES por defecto).
  if (rel.endsWith("community/Thread.js")) {
    const antes = t;
    const tecla = (fn) => `onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ${fn}(e); } },`;
    t = t.replace("  solve,\n  onMenu\n}) {", "  solve,\n  onMenu,\n  menuLabel = 'Opciones'\n}) {");
    t = t.replace("    onClick: onMenu,\n", `    onClick: onMenu,\n    role: 'button',\n    tabIndex: 0,\n    'aria-label': menuLabel,\n    ${tecla("onMenu")}\n`);
    t = t.replace("  onClick: r.onMenu,\n", `  onClick: r.onMenu,\n  role: 'button',\n  tabIndex: 0,\n  'aria-label': r.menuLabel || 'Opciones',\n  ${tecla("r.onMenu")}\n`);
    if (t === antes || (t.match(/role: 'button'/g) || []).length < 2 || !t.includes("menuLabel = 'Opciones'")) throw new Error("parche Thread: el origen cambió, revisar");
  }

  // Reserva (Booking de citas y de mesas) y Chip: las opciones eran <div>/<span> con onClick, sin rol, sin foco y sin
  // teclado (6 nov, 3b: ni un lector de pantalla ni el teclado podían elegir día, hora, persona, opción o extra). Aquí cada
  // una dice qué es (radio, casilla o botón), si está elegida o no se puede, y responde a Enter/Espacio. Se ven igual.
  if (rel.endsWith("core/Chip.js")) {
    const antes = t;
    t = t.replace("  return /*#__PURE__*/React.createElement(\"span\", {\n    onClick: onClick,\n    style: {\n      ...V[variant],",
      "  return /*#__PURE__*/React.createElement(\"span\", {\n    onClick: onClick,\n    ...(onClick ? { role: 'button', tabIndex: 0, 'aria-pressed': variant === 'selected' ? true : undefined, onKeyDown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onClick(e); } } } : {}),\n    style: {\n      ...V[variant],");
    if (t === antes) throw new Error("parche Chip: el origen cambió, revisar");
  }
  if (rel.endsWith("booking/StaffPicker.js")) {
    const antes = t, n0 = (t.match(/role: '/g) || []).length;
    t = t.replace("      key: p.id,\n      onClick: () => onSelect && onSelect(p.id),\n",
      "      key: p.id,\n      onClick: () => onSelect && onSelect(p.id),\n      role: 'radio', 'aria-checked': on, 'aria-label': p.name, tabIndex: 0, onKeyDown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onSelect && onSelect(p.id); } },\n");
    t = t.replace("  }), anyoneLabel ? /*#__PURE__*/React.createElement(\"div\", {\n    onClick: () => onSelect && onSelect('any'),\n",
      "  }), anyoneLabel ? /*#__PURE__*/React.createElement(\"div\", {\n    onClick: () => onSelect && onSelect('any'),\n    role: 'radio', 'aria-checked': selected === 'any', 'aria-label': anyoneLabel, tabIndex: 0, onKeyDown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onSelect && onSelect('any'); } },\n");
    t = t.replace("      key: d.id,\n      onClick: () => !d.off && onSelect && onSelect(d.id),\n",
      "      key: d.id,\n      onClick: () => !d.off && onSelect && onSelect(d.id),\n      role: 'radio', 'aria-checked': on, 'aria-disabled': d.off ? true : undefined, 'aria-label': d.dow + ' ' + d.num, tabIndex: d.off ? -1 : 0, onKeyDown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); !d.off && onSelect && onSelect(d.id); } },\n");
    t = t.replace("      key: s.t,\n      onClick: () => !s.taken && onSelect && onSelect(s.t),\n",
      "      key: s.t,\n      onClick: () => !s.taken && onSelect && onSelect(s.t),\n      role: 'radio', 'aria-checked': on, 'aria-disabled': s.taken ? true : undefined, 'aria-label': s.t, tabIndex: s.taken ? -1 : 0, onKeyDown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); !s.taken && onSelect && onSelect(s.t); } },\n");
    t = t.replace("  return /*#__PURE__*/React.createElement(\"div\", {\n    onClick: onToggle,\n    style: {\n      padding: '13px 14px',",
      "  return /*#__PURE__*/React.createElement(\"div\", {\n    onClick: onToggle,\n    role: 'checkbox', 'aria-checked': !!checked, 'aria-label': label + (price ? ' ' + price : ''), tabIndex: 0, onKeyDown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onToggle && onToggle(e); } },\n    style: {\n      padding: '13px 14px',");
    t = t.replace("  }, /*#__PURE__*/React.createElement(\"span\", {\n    onClick: onBack,\n    style: {\n      transform: 'rotate(180deg)',",
      "  }, /*#__PURE__*/React.createElement(\"span\", {\n    onClick: onBack,\n    ...(onBack ? { role: 'button', tabIndex: 0, 'aria-label': backLabel, onKeyDown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onBack(e); } } } : {}),\n    style: {\n      transform: 'rotate(180deg)',");
    t = t.replace("function StepHeader({\n  title,\n  step,\n  total,\n  onBack\n}) {", "function StepHeader({\n  title,\n  step,\n  total,\n  onBack,\n  backLabel = 'Volver'\n}) {");
    if (t === antes || (t.match(/role: '/g) || []).length - n0 !== 6 || !t.includes("backLabel = 'Volver'")) throw new Error("parche StaffPicker/DateStrip/TimeSlots/AddOnRow/StepHeader: el origen cambió, revisar");
  }
  if (rel.endsWith("menu/MenuItemRow.js")) {
    const antes = t;
    t = t.replace("      key: i,\n      onClick: () => onToggle && onToggle(i),\n",
      "      key: i,\n      onClick: () => onToggle && onToggle(i),\n      role: multi ? 'checkbox' : 'radio', 'aria-checked': on, 'aria-disabled': o.disabled ? true : undefined, tabIndex: o.disabled ? -1 : 0, onKeyDown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); !o.disabled && onToggle && onToggle(i); } },\n");
    if (t === antes) throw new Error("parche OptionGroup: el origen cambió, revisar");
  }

  // Tag: un tono que no existe (p. ej. «warn») dejaba la etiqueta sin colores y rompía la pantalla (6 nov, 3c: «LLEGA 10 MIN
  // TARDE» en Hoy). Con un tono desconocido usa el neutro.
  if (rel.endsWith("core/Tag.js")) {
    const antes = t;
    t = t.replace("  const [bg, fg] = T[tone];", "  const [bg, fg] = T[tone] || T.neutral;");
    if (t === antes) throw new Error("parche Tag: el origen cambió, revisar");
  }

  // TicketQR / QrCode (6c): el QR de muestra (dibujado al azar desde `seed`) se cambia por la matriz REAL que manda el servidor
  // (lib/boletos-qr.ts: texto firmado Ed25519 → generador abierto de Project Nayuki). Sin matriz no se dibuja nada falso: solo el
  // cuadro blanco. 4 módulos de margen (zona de silencio del estándar) y módulos sin separación para que cualquier lector lo lea.
  if (rel.endsWith("cards/TicketQR.js")) {
    const antes = t, i = t.indexOf("function QrCode({"), j = t.indexOf("finder(0, 0), finder(0, N - 7), finder(N - 7, 0));\n}", i);
    if (i < 0 || j < 0) throw new Error("parche TicketQR: el origen cambió, revisar");
    t = t.slice(0, i) + `function QrCode({
  matrix,
  size = 148,
  faded,
  label
}) {
  const N = matrix && matrix.length ? matrix.length : 21,
    pad = 4,
    sz = N + pad * 2,
    d = [];
  if (matrix) for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (matrix[r][c]) d.push('M' + (c + pad) + ' ' + (r + pad) + 'h1v1h-1z');
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: '0 0 ' + sz + ' ' + sz,
    role: 'img',
    'aria-label': label || 'QR',
    shapeRendering: 'crispEdges',
    style: {
      display: 'block',
      opacity: faded ? .28 : 1
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: 0,
    y: 0,
    width: sz,
    height: sz,
    fill: "#FFFFFF"
  }), d.length ? /*#__PURE__*/React.createElement("path", {
    d: d.join(''),
    fill: "#0B0E12"
  }) : null);
}` + t.slice(j + "finder(0, 0), finder(0, N - 7), finder(N - 7, 0));\n}".length);
    t = t.replace("  seed,\n  used,", "  matrix,\n  qrSize,\n  qrLabel,\n  used,");
    t = t.replace("React.createElement(QrCode, {\n    seed: seed,\n    faded: used\n  })", "React.createElement(QrCode, {\n    matrix: matrix,\n    size: qrSize,\n    label: qrLabel,\n    faded: used\n  })");
    t = t.replace("El QR de muestra se dibuja desde seed (siempre el mismo para el mismo boleto).", "El QR es la matriz real que manda el servidor (texto firmado; 6c).");
    if (t === antes || !t.includes("matrix: matrix") || !t.includes("  matrix,\n  qrSize,") || /seed/.test(t)) throw new Error("parche TicketQR: el origen cambió, revisar");
  }

  // 9c: clics mudos → botones accesibles (tabla A11Y arriba).
  t = accesibilizar(t, rel);
  t = parchesAccesibilidad(t, rel);

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

/* 9c · Accesibilidad de lo que era un <div>/<span> con onClick (scripts/portar-sistema.mjs, tabla A11Y). \`__btn(clic, nombre, extra, dentro)\` devuelve
   role="button", tabIndex 0, Enter/Espacio (solo con el foco en el propio elemento, para no robarle la tecla a un campo de dentro) y el nombre
   si no hay texto que lo dé; sin clic no devuelve nada (un elemento sin acción no es un botón). \`dentro\`: el elemento lleva controles de verdad
   dentro, así que no puede ser un botón (interactivo anidado) y solo queda como zona de clic para el ratón. \`__key\`: lo mismo para quien ya
   trae su rol (tab, option). */
const tecla = (fn) => (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
    e.preventDefault();
    fn(e);
  }
};
__ds_scope.__btn = (fn, label, extra, dentro) =>
  !fn ? {} : dentro ? { role: "presentation" } : { role: "button", tabIndex: 0, ...(label ? { "aria-label": label } : null), ...extra, onKeyDown: tecla(fn) };
__ds_scope.__key = (fn) => (fn ? { tabIndex: 0, onKeyDown: tecla(fn) } : {});
`);

for (const rel of Object.keys(A11Y)) if (!usadas.has(rel)) throw new Error(`accesibilidad: ${rel} está en la tabla y el origen no tiene ese módulo`);
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
writeFileSync(TOKENS_SALIDA, tok);

console.log(`portados ${modulos.length} módulos · ${unicos.length} exportaciones · ${puntuales.size} tokens puntuales`);
