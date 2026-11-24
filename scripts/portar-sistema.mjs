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
  // 9c · Sin `lang` entre los parámetros, el EN nunca salía (lang no existía): se agrega `lang` («EN» | «ES»), antes de los nombres.
  const conLang = /(^|\n)  lang\b/.test(t.slice(ini - 1, fin + 1)) ? "" : ",\n  lang";
  return t.slice(0, fin) + `${conLang},\n  ${name} = ${def}` + t.slice(fin);
}

/* 9c · Contraste AA (4,5:1): el texto gris del sistema (ink al 40–55 %) no llegaba (2,8–4,3:1 sobre blanco y papel). Pasa a ink al 60 %
   (5,1:1 sobre blanco, 5,0:1 sobre papel), el mismo gris de --tl-text-3. No toca sombras, bordes ni fondos (no son texto), ni el 30–35 %
   (deshabilitado, flechas decorativas: axe no los exige; el 34 % sí: las pestañas inactivas de BottomNav). Una sola regla para los 132 componentes: lo mismo al volver a portar. */
export const GRIS_AA = "rgba(11,14,18,.6)";
function contraste(t) {
  return t.split("\n").map((l) => l.replace(/rgba\(11,14,18,\.(34|4|42|45|5|55)\)/g, (m, a, i) =>
    /(boxShadow|border\w*|background\w*|outline|stroke|fill|textShadow)\s*:/.test(l.slice(0, i)) ? m : GRIS_AA)).join("\n");
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
    // 9m · Bilingüe (L240, L1538): los textos fijos en español pasan a props con su valor de siempre (la pantalla manda el inglés).
    cambia("  codeLabel = 'Código de 6 dígitos',\n", "  codeLabel = 'Código de 6 dígitos',\n  phoneKicker = 'TU TELÉFONO',\n  codeKicker = 'CÓDIGO DE 6 DÍGITOS',\n  sendLabel = 'Enviar código',\n  verifyLabel = 'Verificar y seguir',\n  changeLabel = 'Cambiar número',\n  resendLabel = 'REENVIAR EN 30 S',\n");
    cambia("  }, \"TU TEL\\xC9FONO\"), ", "  }, phoneKicker), ");
    cambia("  }, \"Enviar c\\xF3digo\")), ", "  }, sendLabel)), ");
    cambia("  }, \"C\\xD3DIGO DE 6 D\\xCDGITOS\"), ", "  }, codeKicker), ");
    cambia("  }, \"Verificar y seguir\")), ", "  }, verifyLabel)), ");
    cambia("  }, \"Cambiar n\\xFAmero\"), ", "  }, changeLabel), ");
    cambia("  }, \"REENVIAR EN 30 S\"))));", "  }, resendLabel))));");
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

/* 9t (19 nov) · Objetivos táctiles de 44 px, DE VERDAD (decisión del fundador, 19 nov: «agrandar solo lo que lo necesita»). Dos intentos
   anteriores se revirtieron: un ::after invisible fuera de la caja tapaba a vecinos de otros contenedores (menu2b, rsv2e, apt4f, apt4q,
   fic4id, avisos2j) y un área «decidida al tocar» no pasó a11y9c en el CI. Aquí la CAJA de cada control mide ≥ 44 × 44:
   - los botones de solo ícono (30–40 px) pasan a 44 × 44; donde el sistema dibuja un cuadrito sobre una foto (el + del plato), el dibujo
     queda de su tamaño en la esquina de una caja de 44 que no sale de la foto;
   - botones, chips, pestañas, segmentos y filas compactas suben a 44 de alto;
   - los NOMBRES que son botón (plato, negocio, autor) crecen hacia arriba y hacia abajo con relleno y margen negativo DENTRO de su propia
     fila o tarjeta, que al tocarla hace lo mismo: el diseño no se mueve y la caja no pisa a ningún otro control (a11y9c lo mide: «pisan»).
   Lo mide y lo exige pruebas/e2e/a11y9c.cjs (pruebas/lib/tactil.cjs) a 390 y a 320 con letra grande; guardián objetivosTactiles. */
const T44 = 44, T24 = 24; // T24: el mínimo de WCAG 2.2 AA 2.5.8 en el escritorio (con el ratón)
const TACTIL = {
  // 24 nov (a11y9c, con el pie encendido en todas las pantallas, decisión AT): los enlaces del pie medían 14–18 de alto; ninguno baja de 24 (AA 2.5.8).
  // Guardián pieObjetivos24.
  "layout/SiteFooter.js": [
    ["      display: 'flex',\n      alignItems: 'center',\n      gap: 8,\n      font: '500 ' + size", "      display: 'flex',\n      alignItems: 'center',\n      minHeight: 24,\n      gap: 8,\n      font: '500 ' + size"],
    ["    style: {\n      font: '700 13px Manrope,sans-serif',\n      cursor: 'pointer'\n    }", "    style: {\n      display: 'inline-flex',\n      alignItems: 'center',\n      minHeight: 24,\n      font: '700 13px Manrope,sans-serif',\n      cursor: 'pointer'\n    }"],
    ["    style: {\n      color: 'rgba(255,255,255,.62)',\n      cursor: 'pointer'\n    }", "    style: {\n      display: 'inline-flex',\n      alignItems: 'center',\n      minHeight: 24,\n      color: 'rgba(255,255,255,.62)',\n      cursor: 'pointer'\n    }"],
  ],
  // 20 nov (confirmación 44637101290): «Volver» y «Salir» de la bienvenida (Entrar › Comunidad) medían 36 × 36.
  // 20 nov · Reseñas: «Útil» (32 de alto), «Editar» y «Reportar» (texto de 12 px: 17 de alto) a 44 — se tocan en el teléfono (la pestaña Reseñas)
  // y en el escritorio no bajan de 24 (AA 2.5.8).
  "listing/ReviewCard.js": [
    ["      gap: 6,\n      height: 32,\n      boxSizing: 'border-box',\n      padding: '0 12px',\n      borderRadius: 999,", `      gap: 6,\n      height: ${T44},\n      boxSizing: 'border-box',\n      padding: '0 14px',\n      borderRadius: 999,`],
    ["    ...__ds_scope.__btn(edit.onClick, undefined, undefined),\n    style: {\n", `    ...__ds_scope.__btn(edit.onClick, undefined, undefined),\n    style: {\n      display: 'inline-flex',\n      alignItems: 'center',\n      minHeight: ${T44},\n`],
    ["    ...__ds_scope.__btn(report.onClick, undefined, undefined),\n    style: {\n", `    ...__ds_scope.__btn(report.onClick, undefined, undefined),\n    style: {\n      display: 'inline-flex',\n      alignItems: 'center',\n      minHeight: ${T44},\n`],
  ],
  "onboarding/OnbTopBar.js": [
    ["  const btn = {\n    width: 36,\n    height: 36,", `  const btn = {\n    width: ${T44},\n    height: ${T44},`],
    // 20 nov (confirmación 44658035571): con los botones a 44, el texto del progreso sin cortar hacía que la barra pidiera 405 px dentro de una
    // celda de grid (Entrar): la página se ensanchaba y «Continuar» (fija abajo) quedaba fuera de la vista. La barra nunca pide más que su sitio.
    ["      borderBottom: '1px solid rgba(11,14,18,.07)',\n      padding: '10px 16px 12px',\n      display: 'flex',", "      borderBottom: '1px solid rgba(11,14,18,.07)',\n      padding: '10px 16px 12px',\n      minWidth: 0,\n      boxSizing: 'border-box',\n      display: 'flex',"],
  ],
  "core/Button.js": [
    ["  md: {\n    height: 40,", `  md: {\n    height: ${T44},`],
    ["  sm: {\n    height: 34,", `  sm: {\n    height: ${T44},`],
  ],
  "core/IconButton.js": [
    ["  const r = size >= 50 ? 15 : size >= 42 ? 13 : 12;", `  const z = Math.max(size, ${T44}),\n    r = z >= 50 ? 15 : z >= 42 ? 13 : 12;`],
    ["      width: size,\n      height: size,\n      borderRadius: r,", "      width: z,\n      height: z,\n      borderRadius: r,"],
  ],
  "core/Chip.js": [
    ["      whiteSpace: 'nowrap',\n      flex: 'none',\n      ...style\n    }", `      whiteSpace: 'nowrap',\n      flex: 'none',\n      ...style,\n      ...(onClick ? {\n        minHeight: ${T44},\n        minWidth: ${T44},\n        justifyContent: 'center',\n        boxSizing: 'border-box'\n      } : null)\n    }`],
  ],
  "core/SectionHeader.js": [
    ["    ...__ds_scope.__btn(onAction, undefined, undefined),\n    style: {\n      font: '700 12px Manrope,sans-serif',\n      color: 'var(--tl-action)',\n      cursor: 'pointer'\n    }",
      `    ...__ds_scope.__btn(onAction, undefined, undefined),\n    style: {\n      display: 'inline-flex',\n      alignItems: 'center',\n      justifyContent: 'flex-end',\n      minHeight: ${T44},\n      minWidth: ${T44},\n      flex: 'none',\n      font: '700 12px Manrope,sans-serif',\n      color: 'var(--tl-action)',\n      cursor: 'pointer'\n    }`],
  ],
  "navigation/Tabs.js": [
    ["        borderBottom: '2.5px solid ' + (on ? 'var(--tl-action)' : 'transparent'),\n        cursor: 'pointer',", `        borderBottom: '2.5px solid ' + (on ? 'var(--tl-action)' : 'transparent'),\n        minHeight: ${T44},\n        boxSizing: 'border-box',\n        cursor: 'pointer',`],
    ["        borderBottom: '2.5px solid ' + (on ? 'var(--tl-ink)' : 'transparent'),\n        cursor: 'pointer',", `        borderBottom: '2.5px solid ' + (on ? 'var(--tl-ink)' : 'transparent'),\n        minHeight: ${T44},\n        minWidth: ${T44},\n        boxSizing: 'border-box',\n        cursor: 'pointer',`],
  ],
  "layout/SiteHeader.js": [
    // Campana y avatar: 40 → 44 (el punto de «sin leer» sigue en su esquina).
    ["      position: 'relative',\n      width: 40,\n      height: 40,\n      borderRadius: 13,", `      position: 'relative',\n      width: ${T44},\n      height: ${T44},\n      borderRadius: 13,`],
    ["      top: 9,\n      right: 10,\n      width: 7,", "      top: 11,\n      right: 12,\n      width: 7,"],
    ["    ...__ds_scope.__btn(onClick, avatarLabel, undefined),\n    style: {\n      width: 40,\n      height: 40,", `    ...__ds_scope.__btn(onClick, avatarLabel, undefined),\n    style: {\n      width: ${T44},\n      height: ${T44},`],
    // Idioma: la pastilla «ES» pasa a 44 × 44.
    ["      padding: '8px 10px',\n      borderRadius: 11,\n      border: '1px solid rgba(11,14,18,.12)',\n      font: '700 11px ' + mono,\n      cursor: 'pointer',\n      flex: 'none'",
      `      padding: '8px 10px',\n      minWidth: ${T44},\n      minHeight: ${T44},\n      boxSizing: 'border-box',\n      display: 'grid',\n      placeItems: 'center',\n      borderRadius: 13,\n      border: '1px solid rgba(11,14,18,.12)',\n      font: '700 11px ' + mono,\n      cursor: 'pointer',\n      flex: 'none'`],
    // El logo (Inicio) del teléfono: 44 de alto. Con idioma, campana y cuenta a 44, a 320 el nombre «To’Latino» (23 px) no cabía y se
    // dibujaba encima de «ES» (14 px; 54 con letra grande): el nombre se ajusta a lo que queda (unidades del contenedor, de 15 a 23 px) y,
    // si ni así cabe, solo queda el logo (apps/web/app/globals.css, [data-marca]); su nombre accesible sigue siendo «To’Latino».
    ["      flex: 1,\n      minWidth: 0,\n      display: 'flex',\n      alignItems: 'center',\n      gap: 9,\n      cursor: 'pointer'\n    }", `      flex: 1,\n      minWidth: 0,\n      minHeight: ${T44},\n      containerType: 'inline-size',\n      display: 'flex',\n      alignItems: 'center',\n      gap: 9,\n      cursor: 'pointer'\n    }`],
    ["  }, /*#__PURE__*/React.createElement(Logo, {\n    size: 28,\n    font: 23,\n", "  }, /*#__PURE__*/React.createElement(Logo, {\n    size: 28,\n    font: 'clamp(15px, calc((100cqi - 37px) / 4.4), 23px)',\n"],
    ["}), /*#__PURE__*/React.createElement(\"span\", {\n  style: {\n    font: '800 ' + font + 'px/1 Sora,sans-serif',", "}), /*#__PURE__*/React.createElement(\"span\", {\n  'data-marca': '',\n  style: {\n    whiteSpace: 'nowrap',\n    font: '800 ' + (typeof font === 'number' ? font + 'px' : font) + '/1 Sora,sans-serif',"],
    // El buscador del teléfono: el texto (el botón del teclado) toma los 44 de alto de la barra (antes 12 de relleno arriba y abajo).
    ["      marginTop: 12,\n      display: 'flex',\n      alignItems: 'center',\n      gap: 10,\n      padding: '12px 14px',", "      marginTop: 12,\n      display: 'flex',\n      alignItems: 'center',\n      gap: 10,\n      padding: '0 14px',"],
    ["      font: '500 14px Manrope,sans-serif',\n      color: 'rgba(11,14,18,.6)',\n      whiteSpace: 'nowrap',\n      overflow: 'hidden',\n      textOverflow: 'ellipsis'\n    }\n  }, /*#__PURE__*/React.createElement(\"span\", {\n    ...(onCity ? __ds_scope.__btn(onSearch) : {})\n  }, searchPlaceholder || 'Buscar en ' + cityShort)",
      `      font: '500 14px Manrope,sans-serif',\n      lineHeight: '${T44}px',\n      color: 'rgba(11,14,18,.6)',\n      whiteSpace: 'nowrap',\n      overflow: 'hidden',\n      textOverflow: 'ellipsis'\n    }\n  }, /*#__PURE__*/React.createElement("span", {\n    ...(onCity ? __ds_scope.__btn(onSearch) : {}),\n    style: {\n      display: 'block',\n      overflow: 'hidden',\n      textOverflow: 'ellipsis'\n    }\n  }, searchPlaceholder || 'Buscar en ' + cityShort)`],
    // 20 nov · AA 2.5.8 en el escritorio: el texto del buscador (el botón del teclado) medía 19 de alto; toma 24 (el relleno de 12 se queda:
    // AppShell lo usa para ubicar el desplegable).
    [`  }), /*#__PURE__*/React.createElement("span", {\n    style: {\n      flex: 1,\n      minWidth: 0,\n      font: '500 14px Manrope,sans-serif',\n      color: 'rgba(11,14,18,.6)',\n      whiteSpace: 'nowrap',\n      overflow: 'hidden',\n      textOverflow: 'ellipsis'\n    }\n  }, /*#__PURE__*/React.createElement("span", {\n    ...(onCity ? __ds_scope.__btn(onSearch) : {})\n  }, searchPlaceholder || 'Buscar negocios, eventos y más en '`, `  }), /*#__PURE__*/React.createElement("span", {\n    style: {\n      flex: 1,\n      minWidth: 0,\n      font: '500 14px Manrope,sans-serif',\n      lineHeight: '${T24}px',\n      color: 'rgba(11,14,18,.6)',\n      whiteSpace: 'nowrap',\n      overflow: 'hidden',\n      textOverflow: 'ellipsis'\n    }\n  }, /*#__PURE__*/React.createElement("span", {\n    ...(onCity ? __ds_scope.__btn(onSearch) : {}),\n    style: {\n      display: 'block',\n      overflow: 'hidden',\n      textOverflow: 'ellipsis'\n    }\n  }, searchPlaceholder || 'Buscar negocios, eventos y más en '`],
    // La ciudad («5 MI»): caja de 44 de alto; la pastilla se dibuja igual dentro.
    ["    onClick: stop(onCity),\n    ...__ds_scope.__btn(stop(onCity), undefined, undefined),\n    style: {\n      display: 'flex',\n      alignItems: 'center',\n      gap: 4,\n      padding: '6px 9px',",
      `    onClick: stop(onCity),\n    ...__ds_scope.__btn(stop(onCity), undefined, undefined),\n    style: {\n      display: 'flex',\n      alignItems: 'center',\n      alignSelf: 'stretch',\n      minHeight: ${T44},\n      minWidth: ${T44},\n      flex: 'none',\n      cursor: 'pointer'\n    }\n  }, /*#__PURE__*/React.createElement("span", {\n    style: {\n      display: 'flex',\n      alignItems: 'center',\n      gap: 4,\n      padding: '6px 9px',`, 1, "radius.toUpperCase())));\n  return", "radius.toUpperCase()))));\n  return"],
  ],
  "menu/MenuItemRow.js": [
    // El nombre del plato (fila y tarjeta): 13 px de relleno arriba y abajo con margen negativo igual — la fila no se mueve y la caja
    // (≥ 44) queda dentro de la misma fila, que al tocarla abre el mismo plato.
    ["  }, /*#__PURE__*/React.createElement(\"span\", {\n    ...__ds_scope.__btn(off ? undefined : onOpen)\n  }, name)), desc ?",
      "  }, /*#__PURE__*/React.createElement(\"span\", {\n    ...__ds_scope.__btn(off ? undefined : onOpen),\n    'data-toque': 'nombre',\n    style: {\n      display: 'block',\n      padding: '13px 0',\n      margin: '-13px 0'\n    }\n  }, name)), desc ?"],
    ["  }, /*#__PURE__*/React.createElement(\"span\", {\n    ...__ds_scope.__btn(onOpen)\n  }, name)), /*#__PURE__*/React.createElement(\"div\", {\n    style: {\n      marginTop: 4,",
      "  }, /*#__PURE__*/React.createElement(\"span\", {\n    ...__ds_scope.__btn(onOpen),\n    'data-toque': 'nombre',\n    style: {\n      display: 'block',\n      padding: '14px 0',\n      margin: '-14px 0'\n    }\n  }, name)), /*#__PURE__*/React.createElement(\"div\", {\n    style: {\n      marginTop: 4,"],
    // «Editar» de una línea del pedido (CartLine): 44 de alto (antes 17), y el − n + justo debajo.
    ["    ...__ds_scope.__btn(onEdit, undefined, undefined),\n    style: {\n      display: 'inline-block',\n      marginTop: 4,\n      font: '700 12px Manrope,sans-serif',", `    ...__ds_scope.__btn(onEdit, undefined, undefined),\n    style: {\n      display: 'inline-flex',\n      alignItems: 'center',\n      minHeight: ${T44},\n      minWidth: ${T44},\n      marginTop: 0,\n      font: '700 12px Manrope,sans-serif',`],
    ["  }, editLabel) : null, /*#__PURE__*/React.createElement(\"div\", {\n    style: {\n      marginTop: 8\n    }", "  }, editLabel) : null, /*#__PURE__*/React.createElement(\"div\", {\n    style: {\n      marginTop: onEdit ? 0 : 8\n    }"],
    // QtyStepper: cada botón 44 × 44 (md: 50 de alto como antes; sm: 46).
    ["    h = md ? 50 : 30,\n    w = md ? 34 : 30;", `    h = md ? 50 : ${T44 + 2},\n    w = ${T44};`],
    ["    width: w,\n    height: h - (md ? 6 : 2),", `    width: w,\n    height: ${T44},`],
  ],
  "cards/BusinessCard.js": [
    ["  }, /*#__PURE__*/React.createElement(\"span\", {\n    ...__ds_scope.__btn(onOpen)\n  }, name)), meta ?",
      "  }, /*#__PURE__*/React.createElement(\"span\", {\n    ...__ds_scope.__btn(onOpen),\n    'data-toque': 'nombre',\n    style: {\n      display: 'inline-block',\n      minWidth: 44,\n      padding: '13px 0',\n      margin: '-13px 0'\n    }\n  }, name)), meta ?"],
    ["  }, /*#__PURE__*/React.createElement(\"span\", {\n    ...__ds_scope.__btn(onOpen)\n  }, name)), verified ?",
      "  }, /*#__PURE__*/React.createElement(\"span\", {\n    ...__ds_scope.__btn(onOpen),\n    'data-toque': 'nombre',\n    style: {\n      display: 'inline-block',\n      minWidth: 44,\n      padding: '12px 0',\n      margin: '-12px 0'\n    }\n  }, name)), verified ?"],
  ],
  "cards/BusinessRow.js": [
    // «Abierto ahora» (Inicio) a 320 con letra grande: la fila medía 303 px en 275 (se salía; a11y9c lo cazó al medir allí). Ahora se encoge
    // y, si no cabe, la etiqueta («Pickup 25 min») baja a otra línea; el texto no se aplasta por debajo de 130 px.
    ["      display: 'flex',\n      gap: 12,\n      alignItems: 'center',\n      padding: 12,\n      borderRadius: 18,", "      display: 'flex',\n      flexWrap: 'wrap',\n      gap: 12,\n      rowGap: 10,\n      alignItems: 'center',\n      padding: 12,\n      borderRadius: 18,"],
    ["  }), /*#__PURE__*/React.createElement(\"div\", {\n    style: {\n      flex: 1,\n      minWidth: 0\n    }", "  }), /*#__PURE__*/React.createElement(\"div\", {\n    style: {\n      flex: '1 1 130px',\n      minWidth: 0\n    }"],
    ["  }, meta)), slot ? /*#__PURE__*/React.createElement(\"div\", {\n    style: {\n      padding: '9px 13px',", "  }, meta)), slot ? /*#__PURE__*/React.createElement(\"div\", {\n    style: {\n      flex: 'none',\n      padding: '9px 13px',"],
  ],
  "community/PostCard.js": [
    ["  const circ = {\n    width: 36,\n    height: 36,", `  const circ = {\n    width: ${T44},\n    height: ${T44},`],
    // La fila se envuelve cuando no cabe (a 320 con letra grande «Compartir» se salía ya antes): guardar y compartir van juntos a la derecha.
    ["      marginTop: 12,\n      display: 'flex',\n      alignItems: 'center',\n      gap: 8,\n      ...style", "      marginTop: 12,\n      display: 'flex',\n      flexWrap: 'wrap',\n      alignItems: 'center',\n      gap: 8,\n      ...style"],
    ["  }), comments) : null, /*#__PURE__*/React.createElement(\"span\", {\n    style: {\n      flex: 1\n    }\n  }), onSave ? ", "  }), comments) : null, /*#__PURE__*/React.createElement(\"span\", {\n    style: {\n      display: 'flex',\n      gap: 8,\n      marginLeft: 'auto'\n    }\n  }, onSave ? ", 1,
      "  })) : null);\n}\nVoteBar.tlv = 27;", "  })) : null));\n}\nVoteBar.tlv = 27;"],
    // Votar: la pastilla 44 de alto y del mismo ancho (90); ▲ y ▼ 44 × 44 (sobre el borde de 1 px) y el número encima, en el medio, sin toque.
    ["  }, /*#__PURE__*/React.createElement(\"span\", {\n    style: {\n      height: 36,\n      boxSizing: 'border-box',\n      padding: '0 3px',", `  }, /*#__PURE__*/React.createElement("span", {\n    style: {\n      position: 'relative',\n      height: ${T44},\n      boxSizing: 'border-box',\n      padding: 0,`],
    ["      width: 32,\n      height: 34,\n      display: 'grid',\n      placeItems: 'center',\n      cursor: onUp ? 'pointer' : 'default'", `      width: ${T44},\n      height: ${T44},\n      margin: '-1px 0',\n      display: 'grid',\n      placeItems: 'center',\n      cursor: onUp ? 'pointer' : 'default'`],
    ["      width: 32,\n      height: 34,\n      display: 'grid',\n      placeItems: 'center',\n      cursor: onDown ? 'pointer' : 'default',", `      width: ${T44},\n      height: ${T44},\n      margin: '-1px 0',\n      display: 'grid',\n      placeItems: 'center',\n      cursor: onDown ? 'pointer' : 'default',`],
    ["    style: {\n      minWidth: 20,\n      textAlign: 'center',\n      font: '800 13px Sora,sans-serif',", "    style: {\n      position: 'absolute',\n      inset: 0,\n      display: 'grid',\n      placeItems: 'center',\n      pointerEvents: 'none',\n      font: '800 13px Sora,sans-serif',"],
    ["    style: {\n      height: 36,\n      boxSizing: 'border-box',\n      padding: '0 14px 0 12px',", `    style: {\n      height: ${T44},\n      minWidth: ${T44},\n      boxSizing: 'border-box',\n      padding: '0 14px 0 12px',`],
    // El nombre del autor: crece arriba y abajo dentro de su encabezado (la fila no se mueve).
    ["    ...__ds_scope.__btn(onAuthor, undefined, undefined),\n    style: {\n      minWidth: 0,", "    ...__ds_scope.__btn(onAuthor, undefined, undefined),\n    'data-toque': onAuthor ? 'nombre' : undefined,\n    style: {\n      minWidth: 0,\n      padding: onAuthor ? '13px 0' : 0,\n      margin: onAuthor ? '-13px 0' : 0,"],
    // El texto de la publicación (abre el hilo): con una sola línea medía 23 de alto (en una tableta o un teléfono ancho); ahora 44 como mínimo.
    ["    ...__ds_scope.__btn(onOpen, undefined, undefined),\n    style: {\n      marginTop: bodyGap,\n      font: bodyFont + ' Manrope,sans-serif',", `    ...__ds_scope.__btn(onOpen, undefined, undefined),\n    style: {\n      marginTop: bodyGap,\n      minHeight: onOpen ? ${T44} : undefined,\n      font: bodyFont + ' Manrope,sans-serif',`],
    // «⋯»: 44 × 44 dentro de su fila (antes salía 9 px hacia la esquina con margen negativo: ya no se sale de su caja); el ícono, a la derecha.
    ["      width: 32,\n      height: 32,\n      margin: '-8px -9px -8px 0',\n      display: 'grid',\n      placeItems: 'center',", `      width: ${T44},\n      height: ${T44},\n      margin: '-14px 0',\n      display: 'grid',\n      placeItems: 'center end',`],
  ],
  "account/NeighborCard.js": [
    // «Completa tu cuenta»: cada fila con clic, 44 de alto.
    ["      gap: 10,\n      alignItems: 'center',\n      padding: '10px 0',\n      borderTop: i ? '1px solid rgba(11,14,18,.07)' : 'none',", `      gap: 10,\n      alignItems: 'center',\n      padding: '10px 0',\n      minHeight: ${T44},\n      boxSizing: 'border-box',\n      borderTop: i ? '1px solid rgba(11,14,18,.07)' : 'none',`],
  ],
  "admin/AdminBar.js": [
    ["    segH = desk ? 28 : 26,\n    btn = desk ? 38 : 36;", `    segH = ${T44},\n    btn = ${T44};`],
    // En el teléfono, con todo a 44, la ciudad no cabía junto al logo y los tres botones (a 390 «Ciudad…» quedaba en 43 px y a 320 en 20):
    // la barra se envuelve y la ciudad va en su propia fila, a lo ancho, con las opciones repartidas.
    ["      padding: desk ? '10px 24px' : '10px 14px',\n      display: 'flex',\n      alignItems: 'center',\n      gap: 10\n    }", "      padding: desk ? '10px 24px' : '10px 14px',\n      display: 'flex',\n      flexWrap: desk ? undefined : 'wrap',\n      alignItems: 'center',\n      gap: 10,\n      rowGap: 8\n    }"],
    ["      flex: desk ? 'none' : '0 1 auto',\n      minWidth: 0\n    }\n  }, cities.map(", "      flex: desk ? 'none' : '1 0 100%',\n      order: desk ? undefined : 1,\n      minWidth: 0\n    }\n  }, cities.map("],
    ["      flex: desk || i < cities.length - 1 ? 'none' : '0 1 auto'\n", "      flex: desk ? 'none' : '1 1 0'\n"],
    ["      display: 'flex',\n      alignItems: 'center',\n      gap: 8,\n      cursor: onHome ? 'pointer' : 'default',\n      flex: 'none'", `      display: 'flex',\n      alignItems: 'center',\n      gap: 8,\n      minHeight: ${T44},\n      cursor: onHome ? 'pointer' : 'default',\n      flex: 'none'`],
    ["      display: 'flex',\n      gap: 3,\n      padding: 3,\n      borderRadius: 10,", "      display: 'flex',\n      gap: 2,\n      padding: 0,\n      borderRadius: 10,"],
    ["      height: segH,\n      padding: '0 10px',\n      borderRadius: 8,", "      height: segH,\n      padding: '0 10px',\n      borderRadius: 10,"],
    ["    ...__ds_scope.__btn(onSearch, searchLabel, undefined),\n    style: {\n      width: 36,\n      height: 36,", `    ...__ds_scope.__btn(onSearch, searchLabel, undefined),\n    style: {\n      width: ${T44},\n      height: ${T44},`],
    ["      gap: 8,\n      padding: 3,\n      paddingRight: desk ? 10 : 3,\n      borderRadius: 12,", "      gap: 8,\n      padding: 6,\n      paddingRight: desk ? 10 : 6,\n      borderRadius: 13,"],
    // Fila del admin en el teléfono (AdminRow) con clic: 44 de alto.
    ["    ...__ds_scope.__btn(onClick, undefined, undefined, toggle != null),\n    style: {\n      display: 'flex',\n      alignItems: 'center',\n      gap: 12,\n      cursor: onClick ? 'pointer' : 'default'", `    ...__ds_scope.__btn(onClick, undefined, undefined, toggle != null),\n    style: {\n      display: 'flex',\n      alignItems: 'center',\n      gap: 12,\n      minHeight: onClick ? ${T44} : undefined,\n      cursor: onClick ? 'pointer' : 'default'`],
  ],
};
// El + del plato (AddPill): cerrado, una caja de 44 × 44 que no sale de la foto más que antes (el cuadrito de siempre en su esquina de abajo
// a la derecha); abierto, la pastilla «− n +» de 44 de alto con − y + de 44 × 44 (la cantidad, encima y sin toque, en el medio).
const ADDPILL_NUEVO = `  const box = dark ? {
    position: 'absolute',
    right: -6,
    bottom: -6,
    height: ${T44},
    width: x ? ${T44 * 2} : ${T44},
    borderRadius: 12,
    background: x ? 'var(--tl-ink)' : 'transparent',
    boxShadow: x ? 'inset 0 0 0 2.5px var(--tl-white)' : 'none'
  } : {
    position: 'absolute',
    right: 8,
    bottom: 8,
    height: ${T44},
    width: x ? ${T44 * 2} : ${T44},
    borderRadius: 11,
    background: x ? 'var(--tl-white)' : 'transparent',
    boxShadow: x ? '0 6px 14px -6px rgba(11,14,18,.5)' : 'none'
  };
  const vis = dark ? {
    width: 31,
    height: 31,
    boxSizing: 'border-box',
    borderRadius: 12,
    background: 'var(--tl-ink)',
    border: '2.5px solid var(--tl-white)'
  } : {
    width: 32,
    height: 34,
    borderRadius: 11,
    background: 'var(--tl-white)',
    boxShadow: '0 6px 14px -6px rgba(11,14,18,.5)'
  };
  const mas = /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "plus",
    size: dark ? 14 : 16,
    color: fg,
    strokeWidth: 2.4
  });
  return /*#__PURE__*/React.createElement("div", {
    onClick: st,
    role: 'presentation',
    'data-toque': 'agregar',
    style: {
      ...box,
      overflow: 'hidden',
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      color: fg,
      transition: 'width .2s ease'
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: left,
    ...__ds_scope.__key(x ? left : undefined),
    role: "button",
    "aria-label": qty === 1 ? removeLabel : decLabel,
    "aria-hidden": !x,
    style: {
      width: ${T44},
      height: '100%',
      flex: 'none',
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: qty === 1 ? 'trash' : 'minus',
    size: 16,
    color: qty === 1 && !dark ? 'var(--tl-danger)' : fg,
    strokeWidth: 2
  })), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": !x,
    style: {
      position: 'absolute',
      inset: 0,
      display: x ? 'grid' : 'none',
      placeItems: 'center',
      pointerEvents: 'none',
      font: '800 13.5px/1 Sora,sans-serif'
    }
  }, qty), /*#__PURE__*/React.createElement("span", {
    onClick: right,
    ...__ds_scope.__key(right),
    role: "button",
    "aria-label": qty === 0 || x ? addLabel : qtyLabel + ': ' + qty,
    style: {
      width: ${T44},
      height: '100%',
      flex: 'none',
      display: 'grid',
      placeItems: x ? 'center' : 'end',
      cursor: 'pointer',
      font: '800 12.5px/1 Sora,sans-serif'
    }
  }, x ? mas : /*#__PURE__*/React.createElement("span", {
    style: {
      ...vis,
      display: 'grid',
      placeItems: 'center'
    }
  }, qty === 0 ? mas : qty)));
}
`;
function tactiles(t, rel) {
  for (const [de, a, veces = 1, de2, a2] of TACTIL[rel] || []) {
    const n = t.split(de).length - 1;
    if (n !== veces) throw new Error(`9t táctil (${rel}): esperaba ${veces} vez/veces «${de.slice(0, 70)}» y hay ${n} (el origen cambió, revisar)`);
    t = t.replaceAll(de, a);
    if (de2) { if (!t.includes(de2)) throw new Error(`9t táctil (${rel}): no encuentro el cierre «${de2.slice(0, 50)}»`); t = t.replace(de2, a2); }
  }
  if (rel === "menu/MenuItemRow.js") {
    const i = t.indexOf("  const box = dark ? {\n    position: 'absolute',\n    right: -6,"), j = t.indexOf("/* Tarjeta de \"Populares\"", i);
    if (i < 0 || j < 0 || !t.slice(i, j).includes("  }) : qty));\n}\n")) throw new Error("9t táctil (AddPill): el origen cambió, revisar");
    t = t.slice(0, i) + ADDPILL_NUEVO + t.slice(j);
  }
  return t;
}
/* Fotos a la medida (F2a, 20 nov) · Cada foto que el sistema pinta pide la variante que le toca a SU caja (packages/ui/src/foto.ts: 320 / 640 / 1080 /
   1600 px, WebP; lo que no es una foto nuestra pasa igual). `__ds_scope.__fondo(url, caja)` arma el `url("…")` de una dirección suelta y
   `__ds_scope.__fondoCss(valor, caja)` cambia los url(…) de un fondo que la pantalla ya trae armado (avatares, degradados, `url(x)` envueltos).
   `caja` = el ancho en px CSS de la caja; en las portadas de ancho completo, 540 (la variante de 1080) en el teléfono y 800 (la de 1600) en el escritorio.
   Misma forma que TACTIL: [texto del origen, texto nuevo, veces]; si el origen cambia, el script se detiene en vez de perder el parche.
   Lo vigila el guardián fotoPorLaPieza (pinta una foto de datos sin pasar por aquí = falla). */
const FOTO = {
  "core/Placeholder.js": [
    ["background: image ? 'center/cover url(' + image + ')' :", "background: image ? 'center/cover ' + __ds_scope.__fondo(image, typeof width === 'number' ? width : 540) :"],
  ],
  "cards/BusinessCard.js": [
    ["const bg = p => p ? {\n  backgroundImage: 'url(' + p + ')',", "const bg = (p, w) => p ? {\n  backgroundImage: __ds_scope.__fondo(p, w),"],
    ["      background: 'var(--tl-photo-bg)',\n      ...bg(photos[0])", "      background: 'var(--tl-photo-bg)',\n      ...bg(photos[0], 64)"],
    ["      overflow: 'hidden',\n      ...bg(photos[0])", "      overflow: 'hidden',\n      ...bg(photos[0], 540)"],
    ["...bg(ring)", "...bg(ring, 54)"],
  ],
  "cards/StoryCard.js": [
    ["const bg = u => u ? `center/cover url(${u})` :", "const bg = (u, w) => u ? `center/cover ${__ds_scope.__fondo(u, w)}` :"],
    ["background: bg(p.image)", "background: bg(p.image, width)"],
    ["background: bg(logo)", "background: bg(logo, 26)"],
  ],
  "layout/CategoryHero.js": [
    ["background: image ? `center/cover url(${image})` :", "background: image ? `center/cover ${__ds_scope.__fondo(image, d ? 800 : 540)}` :"],
    ["borderRadius: 999,\n      background: t.image ? `center/cover url(${t.image})`", "borderRadius: 999,\n      background: t.image ? `center/cover ${__ds_scope.__fondo(t.image, d ? 84 : 66)}`"],
    ["background: `center/cover url(${t.flag})`", "background: `center/cover ${__ds_scope.__fondo(t.flag, d ? 26 : 22)}`"],
    ["borderRadius: d ? 14 : 13,\n        background: t.image ? `center/cover url(${t.image})`", "borderRadius: d ? 14 : 13,\n        background: t.image ? `center/cover ${__ds_scope.__fondo(t.image, d ? 112 : 84)}`"],
  ],
  "listing/OwnerCard.js": [
    ["marginLeft: -6,\n      borderRadius: 99,\n      border: '2px solid var(--tl-white)',\n      background: 'center 25%/cover url(' + p + ')'", "marginLeft: -6,\n      borderRadius: 99,\n      border: '2px solid var(--tl-white)',\n      background: 'center 25%/cover ' + __ds_scope.__fondo(p, desktop ? 34 : 30)"],
    ["minHeight: 250,\n      background: 'center 25%/cover url(' + photo + ')'", "minHeight: 250,\n      background: 'center 25%/cover ' + __ds_scope.__fondo(photo, 220)"],
    ["flex: 'none',\n      background: 'center 25%/cover url(' + photo + ')'", "flex: 'none',\n      background: 'center 25%/cover ' + __ds_scope.__fondo(photo, 64)"],
  ],
  "menu/MenuItemRow.js": [
    ["      height: size,\n      borderRadius: 16,\n      flex: 'none',\n      background: image ? 'center/cover url(' + image + ')' :", "      height: size,\n      borderRadius: 16,\n      flex: 'none',\n      background: image ? 'center/cover ' + __ds_scope.__fondo(image, size) :"],
    ["      height,\n      borderRadius: 16,\n      background: image ? 'center/cover url(' + image + ')' :", "      height,\n      borderRadius: 16,\n      background: image ? 'center/cover ' + __ds_scope.__fondo(image, width) :"],
    ["      height: 48,\n      borderRadius: 12,\n      background: image ? 'center/cover url(' + image + ')' :", "      height: 48,\n      borderRadius: 12,\n      background: image ? 'center/cover ' + __ds_scope.__fondo(image, 48) :"],
  ],
  "order/DeliveryPrefs.js": [
    ["background: item.image ? 'center/cover url(' + item.image + ')' :", "background: item.image ? 'center/cover ' + __ds_scope.__fondo(item.image, 48) :"],
  ],
  "booking/StaffPicker.js": [
    ["background: p.image ? 'center/cover url(' + p.image + ')' :", "background: p.image ? 'center/cover ' + __ds_scope.__fondo(p.image, 66) :"],
  ],
  "account/NeighborCard.js": [
    ["background: photo ? `url(${photo}) center/cover` :", "background: photo ? __ds_scope.__fondo(photo, 66) + ' center/cover' :"],
  ],
  "listing/ReviewCard.js": [
    ["background: p.image ? p.image + ' center/cover' :", "background: p.image ? __ds_scope.__fondoCss(p.image, S ? 64 : 76) + ' center/cover' :"],
  ],
  "community/Thread.js": [
    ["    background: avatar || avatarColor,", "    background: __ds_scope.__fondoCss(avatar || avatarColor, size),"],
    ["background: business.image ? business.image + ' center/cover' :", "background: business.image ? __ds_scope.__fondoCss(business.image, 54) + ' center/cover' :"],
    ["background: f.image || 'var(--tl-photo-bg-2)',", "background: __ds_scope.__fondoCss(f.image, 22) || 'var(--tl-photo-bg-2)',"],
    ["background: b.image ? b.image + ' center/cover' :", "background: b.image ? __ds_scope.__fondoCss(b.image, 36) + ' center/cover' :"],
  ],
  "community/PostCard.js": [
    ["      background: avatar || avatarColor,", "      background: __ds_scope.__fondoCss(avatar || avatarColor, 40),"],
  ],
  "search/SearchResultRow.js": [
    ["const bgImg = s => !s ? {} : {\n  backgroundImage: /^url\\(/.test(s) ? s : 'url(' + s + ')',", "const bgImg = (s, w) => !s ? {} : {\n  backgroundImage: __ds_scope.__fondoCss(/^url\\(/.test(s) ? s : 'url(' + s + ')', w),"],
    ["...bgImg(image)", "...bgImg(image, S)"],
  ],
  "admin/AdminBar.js": [
    ["const bgImg = s => !s || s === 'none' ? {} : {\n  backgroundImage: /^url\\(/.test(s) ? s : 'url(' + s + ')',", "const bgImg = (s, w = 64) => !s || s === 'none' ? {} : {\n  backgroundImage: __ds_scope.__fondoCss(/^url\\(/.test(s) ? s : 'url(' + s + ')', w),"],
    ["      borderRadius: px(imageRadius),\n      ...bgImg(image),", "      borderRadius: px(imageRadius),\n      ...bgImg(image, parseInt(imageSize) || 64),"],
  ],
  "listing/BusinessPreview.js": [
    ["const bgc = (img, c) => ({\n  background: img ? img + ' center/cover' : c,", "const bgc = (img, c, w) => ({\n  background: img ? __ds_scope.__fondoCss(img, w) + ' center/cover' : c,"],
    ["...bgc(P.logoBg, P.logoC),\n      color: 'var(--tl-white)',\n      display: 'grid',\n      placeItems: 'center',\n      font: '800 14px/1 Sora,sans-serif'", "...bgc(P.logoBg, P.logoC, 40),\n      color: 'var(--tl-white)',\n      display: 'grid',\n      placeItems: 'center',\n      font: '800 14px/1 Sora,sans-serif'"],
    ["...bgc(P.logoBg, P.logoC),\n      color: 'var(--tl-white)',\n      display: 'grid',\n      placeItems: 'center',\n      font: '800 19px/1 Sora,sans-serif'", "...bgc(P.logoBg, P.logoC, 62),\n      color: 'var(--tl-white)',\n      display: 'grid',\n      placeItems: 'center',\n      font: '800 19px/1 Sora,sans-serif'"],
    ["      height: 150,\n      ...bgc(P.cover, 'var(--tl-photo-bg)'),", "      height: 150,\n      ...bgc(P.cover, 'var(--tl-photo-bg)', 540),"],
    ["      borderRadius: 14,\n      flex: 'none',\n      ...bgc(P.cover, 'var(--tl-photo-bg)')\n", "      borderRadius: 14,\n      flex: 'none',\n      ...bgc(P.cover, 'var(--tl-photo-bg)', 64)\n"],
    ["      height: 190,\n      ...bgc(P.cover, 'var(--tl-photo-bg-2)'),", "      height: 190,\n      ...bgc(P.cover, 'var(--tl-photo-bg-2)', 540),"],
    ["...bgc(bg, 'var(--tl-photo-bg)')", "...bgc(bg, 'var(--tl-photo-bg)', 120)"],
    ["      ...bgc(p.bg, 'var(--tl-photo-bg)'),\n      flex: 'none'", "      ...bgc(p.bg, 'var(--tl-photo-bg)', 42),\n      flex: 'none'"],
    ["      aspectRatio: '1',\n      ...bgc(p.bg, 'var(--tl-photo-bg)'),", "      aspectRatio: '1',\n      ...bgc(p.bg, 'var(--tl-photo-bg)', 200),"],
  ],
};
function fotos(t, rel) {
  for (const [de, a, veces = 1] of FOTO[rel] || []) {
    const n = t.split(de).length - 1;
    if (n !== veces) throw new Error(`fotos a la medida (${rel}): esperaba ${veces} vez/veces «${de.slice(0, 70)}» y hay ${n} (el origen cambió, revisar)`);
    t = t.replaceAll(de, a);
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
    // 9m · Chips largos (L79: «Coordinación del día $900 · boda completa…» se cortaba en el borde): el chip se parte en DOS líneas como máximo
    // dentro de la tarjeta (sin salirse) y lo que sobra termina en «…». Los cortos se ven igual que antes.
    const a2 = t;
    t = t.replace(/chips\.map\(\(c, i\) => \/\*#__PURE__\*\/React\.createElement\(__ds_scope\.Chip, \{\n(\s*)key: i,\n(\s*)variant: c\.variant \|\| \(i === 0 \? 'slot' : 'feature'\)\n(\s*)\}, c\.label\)\)/,
      "chips.map((c, i) => /*#__PURE__*/React.createElement(__ds_scope.Chip, {\n$1key: i,\n$2variant: c.variant || (i === 0 ? 'slot' : 'feature'),\n$2style: {\n$2  whiteSpace: 'normal',\n$2  maxWidth: '100%',\n$2  flex: '0 1 auto',\n$2  minWidth: 0\n$2}\n$3}, /*#__PURE__*/React.createElement(\"span\", {\n$3  style: {\n$3    display: '-webkit-box',\n$3    WebkitLineClamp: 2,\n$3    WebkitBoxOrient: 'vertical',\n$3    overflow: 'hidden',\n$3    lineHeight: 1.3,\n$3    overflowWrap: 'anywhere'\n$3  }\n$3}, c.label)))");
    if (t === a2) throw new Error("parche BusinessCard (chips en dos líneas): el origen cambió, revisar");
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
    // 23 nov · El botón no pasaba aria-haspopup, aria-expanded ni data-*: «Contactar» (ficha) los ponía a mano con un ref. Ahora deja pasar los atributos
    // aria-* y data-* (solo esos: ni onClick, ni role, ni style) para que lectores de pantalla y pruebas los lean donde se usa el botón.
    const sig = "  disabled,\n  onClick,\n  children,\n  style\n}) {\n  const v = V[disabled ? 'disabled' : variant];\n";
    if (!t.includes(sig)) throw new Error("parche Button (aria/data): el origen cambió, revisar");
    t = t.replace(sig, "  disabled,\n  onClick,\n  children,\n  style,\n  ...resto\n}) {\n  const v = V[disabled ? 'disabled' : variant];\n  const extra = {};\n  for (const k in resto) if (/^(aria|data)-/.test(k)) extra[k] = resto[k];\n");
    const ky = "        onClick(e);\n      }\n    },\n    style: {\n      ...S[size],";
    if (!t.includes(ky)) throw new Error("parche Button (aria/data): el origen cambió, revisar");
    t = t.replace(ky, "        onClick(e);\n      }\n    },\n    ...extra,\n    style: {\n      ...S[size],");
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

  // C-001 (16 nov) · Video de presentación + anillo en la tarjeta Pro (canvas tolatino-master+, «Tarjeta · video y anillo (C-001)»). La zona
  // de la foto (170) pasa a ser una capa: `media` (el <video> con su chip y su barra, lo pone la app: solo se mueve la del centro) encima de la
  // portada, y el anillo (54, morado, 3 + 3 de borde blanco, 24 px por debajo del borde de la foto) con el logo, que abre «Hoy en el barrio».
  // Con anillo, el cuerpo arranca a 32 (no a 14). Free no cambia.
  if (rel === "cards/BusinessCard.js") {
    const antes = t;
    t = t.replace("  onSave,\n  onContact\n}) {", "  onSave,\n  onContact,\n  media,\n  ring,\n  onRing,\n  ringLabel = 'Hoy en el barrio'\n}) {");
    t = t.replace("  }, /*#__PURE__*/React.createElement(\"div\", {\n    style: {\n      height: 170,\n      background: '#E4E1DA',\n      ...bg(photos[0])\n    }\n  }), ",
      "  }, /*#__PURE__*/React.createElement(\"div\", {\n    style: {\n      position: 'relative',\n      height: 170,\n      background: '#E4E1DA'\n    }\n  }, /*#__PURE__*/React.createElement(\"div\", {\n    style: {\n      position: 'absolute',\n      inset: 0,\n      overflow: 'hidden',\n      ...bg(photos[0])\n    }\n  }, media || null), ring ? /*#__PURE__*/React.createElement(\"button\", {\n    type: 'button',\n    'aria-label': ringLabel,\n    'data-anillo': '',\n    onClick: stop(onRing),\n    style: {\n      position: 'absolute',\n      left: 14,\n      bottom: -24,\n      width: 54,\n      height: 54,\n      boxSizing: 'border-box',\n      borderRadius: 99,\n      padding: 3,\n      border: 0,\n      margin: 0,\n      background: '#4B37F5',\n      cursor: 'pointer',\n      zIndex: 1\n    }\n  }, /*#__PURE__*/React.createElement(\"span\", {\n    style: {\n      display: 'block',\n      width: '100%',\n      height: '100%',\n      boxSizing: 'border-box',\n      borderRadius: 99,\n      border: '3px solid #fff',\n      backgroundColor: '#E4E1DA',\n      ...bg(ring)\n    }\n  })) : null), ");
    t = t.replace("      padding: '14px 15px 15px'\n", "      padding: ring ? '32px 15px 15px' : '14px 15px 15px'\n");
    if (!t.includes("ringLabel = 'Hoy en el barrio'\n}) {") || !t.includes("'data-anillo': ''") || !t.includes("padding: ring ? '32px 15px 15px'")) throw new Error("parche BusinessCard (C-001 video y anillo): el origen cambió, revisar");
    if (t === antes) throw new Error("parche BusinessCard (C-001): sin cambios");
  }

  // AdminBar (anchos, 16 nov): en el teléfono la barra es logo + ADMIN + ciudades + buscar + campana + yo, todo fijo. A 375 (iPhone SE) se
  // salía 9 px y con una ciudad larga («Wilkes-Barre») también a 390. En el teléfono el selector de ciudad cede: la última opción se
  // encoge y corta su nombre con «…»; en escritorio todo queda igual.
  if (rel === "admin/AdminBar.js") {
    const antes = t;
    t = t.replace("      background: 'rgba(11,14,18,.06)',\n      flex: 'none'\n    }\n  }, cities.map(", "      background: 'rgba(11,14,18,.06)',\n      flex: desk ? 'none' : '0 1 auto',\n      minWidth: 0\n    }\n  }, cities.map(");
    t = t.replace("      display: 'grid',\n      placeItems: 'center',\n      font: '700 11px Manrope,sans-serif',\n      cursor: 'pointer',\n      whiteSpace: 'nowrap'\n    }\n  }, o.label)",
      "      display: desk ? 'grid' : 'block',\n      placeItems: 'center',\n      font: '700 11px Manrope,sans-serif',\n      lineHeight: desk ? undefined : segH + 'px',\n      textAlign: 'center',\n      cursor: 'pointer',\n      whiteSpace: 'nowrap',\n      overflow: 'hidden',\n      textOverflow: 'ellipsis',\n      minWidth: 0,\n      flex: desk || i < cities.length - 1 ? 'none' : '0 1 auto'\n    }\n  }, o.label)");
    if ((t.match(/flex: desk \? 'none' : '0 1 auto'/g) || []).length !== 1 || !t.includes("textOverflow: 'ellipsis',\n      minWidth: 0,\n      flex: desk || i <")) throw new Error("parche AdminBar (ciudades en el teléfono): el origen cambió, revisar");
    if (t === antes) throw new Error("parche AdminBar: sin cambios");
  }

  // AdminBar (9t6c, 21 nov): ningún texto que viene de los datos ensancha la pantalla. En Planes › Ingresos el detalle de una alerta traía una llave o
  // un id largo sin espacios (60 caracteres) y la página del teléfono pasaba de 390 a 459 (se arrastraba a los lados); la ficha de plantilla de la hoja
  // de confirmar («El monto no es el de la intención: devolver y cobrar otra vez.») no se partía y la dejaba en 397. Ahora el título, el texto secundario
  // y el meta de AdminRow parten la cadena larga (overflowWrap: anywhere; el contenedor ya tenía minWidth 0) y las fichas de ChipGroup (las plantillas y las
  // opciones de elegir de ReasonConfirm) ocupan más de una línea sin salirse. Lo mismo el texto de AdminNote y las líneas de AuditRow (quién y qué,
  // antes → después, motivo). QueueCard y AdminList no necesitan nada: la primera corta con «…» y la segunda arma sus filas con AdminRow. Cuando el texto cabe se ve igual (misma tipografía; el táctil de 44 px del Chip
  // se conserva). Guardián textosLargos.
  if (rel === "admin/AdminBar.js") {
    const cambios = [
      [`      font: '700 14px/1.3 Manrope,sans-serif',\n      color: titleColor\n    }`, `      font: '700 14px/1.3 Manrope,sans-serif',\n      color: titleColor,\n      overflowWrap: 'anywhere'\n    }`, "AdminRow (título)"],
      [`      font: '500 12.5px/1.4 Manrope,sans-serif',\n      color: 'rgba(11,14,18,.6)'\n    }\n  }, sub) : null, has(meta)`, `      font: '500 12.5px/1.4 Manrope,sans-serif',\n      color: 'rgba(11,14,18,.6)',\n      overflowWrap: 'anywhere'\n    }\n  }, sub) : null, has(meta)`, "AdminRow (texto secundario)"],
      [`      letterSpacing: '.06em',\n      color: metaColor\n    }\n  }, meta)`, `      letterSpacing: '.06em',\n      color: metaColor,\n      overflowWrap: 'anywhere'\n    }\n  }, meta)`, "AdminRow (meta)"],
      [`      font: '600 13px/1.45 Manrope,sans-serif',\n      textWrap: 'pretty'\n    }\n  }, children)`, `      font: '600 13px/1.45 Manrope,sans-serif',\n      textWrap: 'pretty',\n      overflowWrap: 'anywhere'\n    }\n  }, children)`, "AdminNote"],
      [`      font: '500 13px/1.4 Manrope,sans-serif'\n    }\n  }, /*#__PURE__*/React.createElement("span", {\n    style: {\n      fontWeight: 800\n    }\n  }, who), " ", action)`, `      font: '500 13px/1.4 Manrope,sans-serif',\n      overflowWrap: 'anywhere'\n    }\n  }, /*#__PURE__*/React.createElement("span", {\n    style: {\n      fontWeight: 800\n    }\n  }, who), " ", action)`, "AuditRow (quién y qué)"],
      [`      gap: 6,\n      font: '600 10px ' + mono,\n      letterSpacing: '.04em'\n    }`, `      gap: 6,\n      font: '600 10px ' + mono,\n      letterSpacing: '.04em',\n      overflowWrap: 'anywhere'\n    }`, "AuditRow (antes → después)"],
      [`      font: '500 12px/1.4 Manrope,sans-serif',\n      color: 'rgba(11,14,18,.6)'\n    }\n  }, why)`, `      font: '500 12px/1.4 Manrope,sans-serif',\n      color: 'rgba(11,14,18,.6)',\n      overflowWrap: 'anywhere'\n    }\n  }, why)`, "AuditRow (motivo)"],
      [`}, items.map((x, i) => /*#__PURE__*/React.createElement("span", {\n  key: i,\n  style: {\n    flex: 'none'\n  }\n}, /*#__PURE__*/React.createElement(__ds_scope.Chip, {\n  variant: x.on ? 'selected' : 'filter',\n  onClick: x.onClick\n}, x.label)))));`,
       `}, items.map((x, i) => /*#__PURE__*/React.createElement("span", {\n  key: i,\n  style: {\n    display: 'flex',\n    flex: '0 1 auto',\n    minWidth: 0,\n    maxWidth: '100%'\n  }\n}, /*#__PURE__*/React.createElement(__ds_scope.Chip, {\n  variant: x.on ? 'selected' : 'filter',\n  onClick: x.onClick,\n  style: {\n    whiteSpace: 'normal',\n    overflowWrap: 'anywhere',\n    textAlign: 'left',\n    flex: '0 1 auto',\n    minWidth: 0\n  }\n}, x.label)))));`, "ChipGroup (fichas en varias líneas)"],
    ];
    for (const [de, a, que] of cambios) {
      if (t.split(de).length - 1 !== 1) throw new Error(`parche AdminBar (9t6c, ${que}): el origen cambió, revisar`);
      t = t.replace(de, () => a);
    }
  }

  // MenuItemRow «no disponible hoy» (17 nov, axe color-contrast): atenuaba TODA la fila con opacity .45 y el nombre, el precio y las etiquetas
  // quedaban a 1,9–3,1:1. Ahora se atenúa solo la foto; el texto va en el gris AA (ink al 60 %) y las etiquetas conservan su tono. Se ve apagada igual.
  if (rel === "menu/MenuItemRow.js") {
    const antes = t;
    t = t.replace("      opacity: off ? .45 : 1,\n      cursor: off ? 'default' : 'pointer',\n      background: '#fff'\n",
      "      color: off ? 'rgba(11,14,18,.6)' : undefined,\n      cursor: off ? 'default' : 'pointer',\n      background: '#fff'\n");
    t = t.replace("      backgroundColor: '#E4E1DA',\n      boxShadow: card ? 'none' : ring\n",
      "      backgroundColor: '#E4E1DA',\n      opacity: off ? .45 : 1,\n      boxShadow: card ? 'none' : ring\n");
    if (t === antes || t.includes("opacity: off ? .45 : 1,\n      cursor") || (t.match(/opacity: off \? \.45 : 1/g) || []).length !== 1) throw new Error("parche MenuItemRow (no disponible, contraste): el origen cambió, revisar");
  }

  // 9c: clics mudos → botones accesibles (tabla A11Y arriba).
  t = accesibilizar(t, rel);
  t = parchesAccesibilidad(t, rel);
  t = contraste(t);
  // 9c-5 · ReplyThread pasa el idioma a cada respuesta (ReplyBody nombra su voto con lang).
  if (rel === "community/Thread.js") {
    const antes = t;
    t = t.replace("  replies = [],\n  screenLabel = 'Comentario · respuestas'\n}) {", "  replies = [],\n  screenLabel = 'Comentario · respuestas',\n  lang\n}) {")
      .replace("React.createElement(ReplyBody, {\n    r: r,\n", "React.createElement(ReplyBody, {\n    lang: lang,\n    r: r,\n")
      .replace("React.createElement(ReplyBody, {\n    r: k,\n", "React.createElement(ReplyBody, {\n    lang: lang,\n    r: k,\n");
    if ((t.match(/lang: lang,\n    r: [rk],/g) || []).length !== 2 || !t.includes("screenLabel = 'Comentario · respuestas',\n  lang\n}) {")) throw new Error("parche ReplyThread (lang): el origen cambió, revisar");
    if (t === antes) throw new Error("parche ReplyThread (lang): sin cambios");
  }
  if (rel === "navigation/Tabs.js") {
    const antes = t;
    t = t.replace('    role: "tablist",\n', '    role: "tablist",\n    onKeyDown: __ds_scope.__flechas,\n');
    if (t === antes) throw new Error("parche Tabs (flechas): el origen cambió, revisar");
  }

  // Hex → token.
  t = t.replace(/#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g, (m, h) => {
    const H = h.toUpperCase();
    if (TOKEN_DE[H]) return `var(${TOKEN_DE[H]})`;
    const nombre = `--tl-ds-${H.toLowerCase()}`;
    puntuales.set(nombre, `#${H}`);
    return `var(${nombre})`;
  });

  // C-002 (16 nov) · La tarjeta Pro de la página de categoría (canvas tolatino-master+, «Página de categoría (variantes)», sección D, aprobada por
  // Henry): `oneLine` = foto de 150, UNA línea de datos (★ reseñas · lo que es y la distancia · abierto/cerrado, la del medio se corta con «…»),
  // sin chips y UN botón (sin el corazón: se guarda desde la página del negocio). La oferta de hoy sigue igual (solo si la app la manda). Sin
  // `oneLine`, la tarjeta es la de siempre (Inicio, Buscar, Mapa…). Va después de los tokens: compara con el texto ya portado.
  if (rel === "cards/BusinessCard.js") {
    const antes = t;
    t = t.replace("  ringLabel = 'Hoy en el barrio'\n}) {", "  ringLabel = 'Hoy en el barrio',\n  oneLine\n}) {");
    t = t.replace("      position: 'relative',\n      height: 170,", "      position: 'relative',\n      height: oneLine ? 150 : 170,");
    t = t.replace("verified ? /*#__PURE__*/React.createElement(Check, null) : null), meta ? /*#__PURE__*/React.createElement(\"div\", {", "verified ? /*#__PURE__*/React.createElement(Check, null) : null), meta && !oneLine ? /*#__PURE__*/React.createElement(\"div\", {");
    t = t.replace("    note: reviewsNote\n  }), status ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(\"span\", {",
      "    note: reviewsNote\n  }), oneLine && meta ? /*#__PURE__*/React.createElement(\"span\", {\n    'data-una-linea': '',\n    style: {\n      flex: '0 1 auto',\n      minWidth: 0,\n      overflow: 'hidden',\n      textOverflow: 'ellipsis',\n      whiteSpace: 'nowrap',\n      font: '600 12.5px Manrope,sans-serif',\n      color: 'rgba(11,14,18,.6)'\n    }\n  }, meta) : null, status ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(\"span\", {");
    t = t.replace("      minWidth: 0,\n      font: '700 12.5px Manrope,sans-serif',\n      color: open ? 'var(--tl-open-text)' : 'var(--tl-danger)'\n    }\n  }, status)) : null), chips.length ? ",
      "      minWidth: 0,\n      flex: oneLine ? 'none' : undefined,\n      whiteSpace: oneLine ? 'nowrap' : undefined,\n      font: '700 12.5px Manrope,sans-serif',\n      color: open ? 'var(--tl-open-text)' : 'var(--tl-danger)'\n    }\n  }, status)) : null), chips.length && !oneLine ? ");
    t = t.replace("  }, cta)), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {\n    icon: \"heart\",", "  }, cta)), oneLine ? null : /*#__PURE__*/React.createElement(__ds_scope.IconButton, {\n    icon: \"heart\",");
    if (t === antes) throw new Error("parche BusinessCard (C-002): sin cambios");
    for (const x of ["  oneLine\n}) {", "height: oneLine ? 150 : 170", "meta && !oneLine ?", "'data-una-linea': ''", "chips.length && !oneLine ?", "oneLine ? null : /*#__PURE__*/React.createElement(__ds_scope.IconButton"])
      if (!t.includes(x)) throw new Error(`parche BusinessCard (C-002 una línea): el origen cambió, revisar (${x})`);
  }
  t = tactiles(t, rel);
  t = fotos(t, rel);

  const m =[...t.matchAll(/Object\.assign\(__ds_scope, \{([^}]*)\}\);/g)];
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
import { fotoCss, fotoFondo } from "../foto";
export const __ds_scope = {};

/* Fotos a la medida (F2a, scripts/portar-sistema.mjs, tabla FOTO): \`__fondo(url, caja)\` = el url("…") de la variante que le toca a una caja de ese
   ancho en px; \`__fondoCss(valor, caja)\` = lo mismo para un fondo que ya trae sus url(…) (o un color o degradado, que quedan igual). */
__ds_scope.__fondo = fotoFondo;
__ds_scope.__fondoCss = fotoCss;

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
/* 9c · Las flechas entre pestañas (WAI-ARIA tabs): ← → mueven el foco a la anterior / siguiente (en círculo), Inicio y Fin a la primera y la
   última; Enter o Espacio la eligen (activación manual: moverse no cambia de pestaña). Cada pestaña sigue en el orden de Tab. */
__ds_scope.__flechas = (e) => {
  const k = e.key;
  if (k !== "ArrowRight" && k !== "ArrowLeft" && k !== "Home" && k !== "End") return;
  const L = [...e.currentTarget.querySelectorAll('[role="tab"]')], i = L.indexOf(document.activeElement);
  if (i < 0 || !L.length) return;
  e.preventDefault();
  const j = k === "Home" ? 0 : k === "End" ? L.length - 1 : (i + (k === "ArrowRight" ? 1 : -1) + L.length) % L.length;
  L[j].focus();
  L[j].scrollIntoView?.({ block: "nearest", inline: "nearest" });
};
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
