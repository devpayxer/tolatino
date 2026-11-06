"use client";
/* Panel v2 · Lo que vendes › Menú (To'Latino Panel negocio v2.dc.html menuBlocks, mItemsV, mCatsV, mGrpsV, mInvV, mHrsV,
   menuItemDet, menuCatDet, menuGrpDet): platos, categorías, opciones, inventario y horarios, con sus editores. Los datos
   los calcula el servidor (lib/menu.ts) y los cambios van por acciones-menu.ts. «Traducir con El Compa» llega con El
   Compa (Fase 7); las cifras de los últimos 30 días, con los pedidos. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { MenuPanel, MGrp, MItem, MSec, Av } from "@/lib/menu";
import { subirFoto } from "@/lib/subir-foto";
import { ITEMS_FREE, TOPE_FREE } from "@/lib/plan";
import { categoriaGuardar, categoriaMover, categoriaQuitar, categoriaVisible, grupoDuplicar, grupoGuardar, grupoOpcion, grupoQuitar, menuAjustes, platoAgotar, platoCuenta, platoDuplicar, platoGuardar, platoMover, platosLote, type PlatoIn } from "./acciones-menu";
import { pedLine } from "./Pedidos";
import { rsvLine } from "./Reservas";
import { vendesCitas } from "./Servicios";
import type { Ctx, Sec } from "./Panel";

type Bi = [string, string];
const MTAGS: [string, string, string][] = [["pica", "Picante", "Spicy"], ["veg", "Vegetariano", "Vegetarian"], ["sg", "Sin gluten", "Gluten-free"], ["mar", "Pescado o mariscos", "Fish or shellfish"], ["lac", "Lácteos", "Dairy"], ["hue", "Huevo", "Egg"], ["nuez", "Maní o nueces", "Peanuts or nuts"]];
const MAGO: Record<string, Bi> = { hoy: ["Vuelve mañana", "Back tomorrow"], vie: ["Hasta el viernes", "Until Friday"], manual: ["Hasta que lo actives", "Until you turn it on"] };
const MDAY: Bi[] = [["Dom", "Sun"], ["Lun", "Mon"], ["Mar", "Tue"], ["Mié", "Wed"], ["Jue", "Thu"], ["Vie", "Fri"], ["Sáb", "Sat"]];
export const fp = (cents: number) => { const p = (Number(cents) || 0) / 100; return "$" + (p % 1 ? p.toFixed(2) : String(p)); };
const norm = (t: string) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const tl = (m: number) => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return (h % 12 || 12) + (mm ? ":" + String(mm).padStart(2, "0") : "") + (h < 12 ? " AM" : " PM"); };
const fmtH = (x: number) => tl(Math.round(x * 60));

export function avL(c: Ctx, k: string, short: boolean, av: Av | null) {
  const es = c.es;
  if (k === "own" && av) {
    const S = av.d.slice().sort().join(), dl = S === "0,1,2,3,4,5,6" ? "" : S === "1,2,3,4,5" ? (es ? "Lun–Vie" : "Mon–Fri") : S === "0,6" ? (es ? "Sáb y dom" : "Sat and Sun") : [1, 2, 3, 4, 5, 6, 0].filter((z) => av.d.includes(z)).map((z) => MDAY[z]![es ? 0 : 1]).join(" · ");
    const r = [dl, `${tl(av.f)}–${tl(av.t)}`].filter(Boolean).join(" · ");
    return short ? r.toUpperCase() : r;
  }
  return short ? "" : es ? "Todo el horario" : "All hours";
}
const agoL = (c: Ctx, k: string) => c.E2(...(MAGO[k] ?? MAGO.hoy!));
const grpRule = (c: Ctx, g: { required: boolean; max: number }) => (g.required ? (g.max > 1 ? c.E2(`Obligatorio · hasta ${g.max}`, `Required · up to ${g.max}`) : c.E2("Obligatorio · elige 1", "Required · pick 1")) : c.E2(`Opcional · hasta ${g.max}`, `Optional · up to ${g.max}`));
const nm = (c: Ctx, x: { es: string; en: string }) => (c.es ? x.es : x.en || x.es);
const fix = (i: MItem) => !i.photos.length || !i.name.en || !i.desc.es;
const img = (i: MItem): Partial<Fila> => (i.photos[0] ? { img: `url("${i.photos[0]}")` } : { imgIni: i.name.es.slice(0, 1) || "·" });
/* Horario por defecto de un horario propio: lo que abre el negocio (mAvDef). */
const avDef = (c: Ctx): Av => { const h = c.d.horas.find((z) => z.on), f = h ? Math.round(h.a * 60) : 660, t = h ? Math.round((h.two ? h.b2 : h.b) * 60) : 1260; return { f, t: t > f ? t : f + 60, d: [0, 1, 2, 3, 4, 5, 6] }; };
const usos = (M: MenuPanel, gid: string) => M.items.filter((i) => i.grp.includes(gid));
const N = (c: Ctx) => c.menu!;
/* La pestaña Menú de la ficha (con carrito) está desde el bloque 2b: el módulo dice «EN TU PÁGINA». */
const MENU_EN_FICHA = true;

/* ── Lo que vendes (secBlocks mod): por ahora el módulo Menú; los demás llegan con sus fases. ── */
export function vendesBloques(c: Ctx): (Bloque | null)[] {
  const { E2, d } = c, M = c.menu;
  const items = M?.items ?? [], nOn = items.filter((i) => i.sell).length, nAgo = items.filter((i) => i.ago).length, nAll = items.length;
  const tiene = nAll > 0, permitido = d.cat === "NEG-FOOD";
  // Jobs (Pro, cualquier categoría): vacantes con pago real por hora.
  const J = c.jobs?.lista, nV = J ? J.filas.filter((j) => j.st === "live").length : 0, nP = J ? J.filas.reduce((n, j) => n + j.pend, 0) : 0;
  const jobs: Fila = { icon: "brief", t: "Jobs", s: !d.pro ? E2("Vacantes con pago real por hora · con Pro", "Openings with real hourly pay · with Pro") : nV ? E2(`${nV} ${nV === 1 ? "vacante abierta" : "vacantes abiertas"}${nP ? ` · ${nP} por responder` : ""}`, `${nV} ${nV === 1 ? "opening" : "openings"} live${nP ? ` · ${nP} to answer` : ""}`) : E2("Sin vacantes abiertas", "No openings live"),
    ...(J?.pausa ? { m: E2("PAUSADO POR TO’LATINO · NO SALE EN TU PÁGINA", "PAUSED BY TO’LATINO · NOT ON YOUR PAGE"), mFg: "var(--tl-danger)" } : {}),
    lock: !d.pro, tag: !d.pro ? "PRO" : nP ? E2("POR RESPONDER", "TO ANSWER") : nV && J?.on && !J.pausa ? E2("EN TU PÁGINA", "LIVE") : null, tone: !d.pro ? "pro" : nP ? "action" : "signal", chev: true, onClick: () => c.go("mod", "jobs") };
  if (!permitido && c.svc) return [
    { type: "head", t: E2("Lo que vendes", "What you sell"), s: E2("Cada módulo sale en tu página solo cuando tiene algo.", "Each module shows on your page only when it has something.") },
    { type: "rows", k: E2("MÓDULOS", "MODULES"), items: [...vendesCitas(c), jobs] },
  ];
  if (!permitido) return [
    { type: "head", t: E2("Lo que vendes", "What you sell"), s: E2("Cada módulo sale en tu página solo cuando tiene algo.", "Each module shows on your page only when it has something.") },
    { type: "rows", k: E2("MÓDULOS", "MODULES"), items: [jobs] },
    { type: "note", tone: "info", t: E2("Los demás módulos de tu categoría llegan en sus fases. Mientras, tu página muestra lo que pusiste al publicar.", "Your category’s other modules arrive in their phases. Meanwhile your page shows what you added when you published.") },
  ];
  return [
    { type: "head", t: E2("Lo que vendes", "What you sell"), s: E2("Cada módulo sale en tu página solo cuando tiene algo. Tú decides qué se pide en línea y qué es solo catálogo.", "Each module shows on your page only when it has something. You decide what is ordered online and what is catalog only.") },
    { type: "kpis", cols: c.desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E2("EN TU PÁGINA", "ON YOUR PAGE"), v: String(d.pro ? nAll : Math.min(nAll, ITEMS_FREE)), s: !d.pro && nAll > ITEMS_FREE ? E2(`de ${nAll} · Free muestra ${ITEMS_FREE}`, `of ${nAll} · Free shows ${ITEMS_FREE}`) : E2("platos", "items"), onClick: () => c.go("mod", "menu") },
      { k: E2("SE PIDEN EN LÍNEA", "ORDERED ONLINE"), v: String(nOn) }, { k: E2("SOLO CATÁLOGO", "CATALOG ONLY"), v: String(nAll - nOn) },
      { k: E2("AGOTADOS HOY", "SOLD OUT TODAY"), v: String(nAgo), fg: nAgo ? "var(--tl-danger)" : undefined },
    ] },
    { type: "rows", k: tiene ? (MENU_EN_FICHA ? E2("CON CONTENIDO · SALEN EN TU PÁGINA", "WITH CONTENT · SHOWING") : E2("CON CONTENIDO", "WITH CONTENT")) : E2("ACTIVADOS, SIN CONTENIDO", "ON, NO CONTENT YET"), items: [{
      icon: "restaurant", t: E2("Menú", "Menu"), s: tiene ? E2(`${nAll} platos · ${nOn} en línea`, `${nAll} items · ${nOn} online`) : E2("Activado · no sale hasta que agregues algo", "On · hidden until you add something"),
      ...(M?.off.menu ? { m: E2("PAUSADO POR TO’LATINO · NO SALE EN TU PÁGINA", "PAUSED BY TO’LATINO · NOT ON YOUR PAGE"), mFg: "var(--tl-danger)" } : {}),
      tag: MENU_EN_FICHA && tiene && d.mods.includes("menu") && !M?.off.menu ? E2("EN TU PÁGINA", "LIVE") : null, tone: "signal", chev: true, onClick: () => c.go("mod", "menu") },
      // Pedidos en línea (pedLine): cómo te piden por la app.
      { icon: "bag", t: E2("Pedidos en línea", "Online orders"), s: pedLine(c), tag: c.ped?.aj?.on && !c.ped.aj.admOff && c.ped.aj.cashP ? E2("ENCENDIDO", "ON") : null, tone: "signal", chev: true, onClick: () => c.go("mod", "pedidos") },
      // Reservaciones (Pro): mesas, turnos y reglas.
      ...(c.rsv?.aj ? [{ icon: "calendar", t: E2("Reservaciones", "Reservations"), s: rsvLine(c), lock: !c.rsv.aj.pro, tag: c.rsv.aj.pro && c.rsv.aj.on && !c.rsv.aj.admOff ? E2("ENCENDIDO", "ON") : !c.rsv.aj.pro ? "PRO" : null, tone: c.rsv.aj.pro ? "signal" : "pro", chev: true, onClick: () => c.go("mod", "reservaciones") }] : []),
      jobs] },
  ];
}

/* ── Menú: las cinco vistas ── */
export function menuBloques(c: Ctx): Sec {
  const { E2, ui } = c, M = N(c), v = ui.mv || "items";
  const nAgo = M.items.filter((i) => i.ago).length, nOff = M.groups.reduce((a, g) => a + g.options.filter((o) => !o.on).length, 0);
  const act = { items: { l: E2("Agregar plato", "Add item"), icon: "plus", onClick: () => { c.setUi({ mNewCat: null, mMore: false }); c.det("item:new"); } },
    cats: { l: E2("Nueva categoría", "New category"), icon: "plus", onClick: () => c.det("mcat:new") }, grps: { l: E2("Nuevo grupo", "New group"), icon: "plus", onClick: () => c.det("mgrp:new") } }[v as "items"] ?? undefined;
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES", "WHAT YOU SELL"), t: E2("Menú", "Menu"), onBack: () => c.go("mod"), act }];
  const nH = M.items.filter((i) => i.hidden).length;
  if (M.off.menu || M.off.pedidos) out.push({ type: "note", tone: "danger", icon: "warning", t: M.off.menu ? E2(`To’Latino pausó tu Menú: la pestaña no sale en tu página. Motivo: ${M.off.menu}`, `To’Latino paused your Menu: the tab does not show on your page. Reason: ${M.off.menu}`) : E2(`To’Latino pausó tus pedidos en línea: tu menú se ve, pero no se puede pedir. Motivo: ${M.off.pedidos}`, `To’Latino paused your online orders: your menu shows but cannot be ordered. Reason: ${M.off.pedidos}`) });
  if (nH) out.push({ type: "note", tone: "danger", icon: "ban", t: nH === 1 ? E2("1 plato lo ocultó To’Latino: no sale en tu menú.", "1 item was hidden by To’Latino: it is not on your menu.") : E2(`${nH} platos los ocultó To’Latino: no salen en tu menú.`, `${nH} items were hidden by To’Latino: they are not on your menu.`) });
  if (M.cfg.pause) out.push({ type: "note", tone: "ink", icon: "clock", t: E2(`Pedidos en línea en pausa hasta ${horaLocal(c, M.cfg.pause)}. Tu menú se sigue viendo.`, `Online orders paused until ${horaLocal(c, M.cfg.pause)}. Your menu still shows.`), cta: E2("Reanudar", "Resume"), onCta: () => c.run(() => menuAjustes(c.d.id, { pause: null }), E2("Recibes pedidos otra vez.", "Taking orders again.")) });
  const V: [string, string, number, string][] = [["items", E2("Platos", "Items"), M.items.length, "restaurant"], ["cats", E2("Categorías", "Categories"), M.sections.length, "grid"], ["grps", E2("Opciones", "Options"), M.groups.length, "filter"], ["inv", E2("Inventario", "Stock"), nAgo + nOff, "bag"], ["hrs", E2("Horarios", "Hours"), 0, "clock"]];
  out.push({ type: "utabs", wrap: c.desk, items: V.map(([k, l, n, icon]) => ({ l, icon, n: k === "hrs" ? undefined : String(n), warn: k === "inv" && n > 0, on: v === k, onClick: () => c.setUi({ mv: k, msel: null, mAsk: null, mBulk: null, mq: "", mInvAdd: false, mOrd: false, mOrdC: null }) })) });
  const body = v === "cats" ? catsV(c, M) : v === "grps" ? grpsV(c, M) : v === "inv" ? invV(c, M) : v === "hrs" ? hrsV(c, M) : itemsV(c, M);
  return { blocks: [...out, ...body], ed: null };
}

function horaLocal(c: Ctx, iso: string) {
  const d = new Date(iso), h = Number(new Intl.DateTimeFormat("en-US", { timeZone: c.d.hoy.tz, hour: "numeric", hour12: false }).format(d)) % 24, m = Number(new Intl.DateTimeFormat("en-US", { timeZone: c.d.hoy.tz, minute: "numeric" }).format(d));
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: c.d.hoy.tz }).format(new Date()), dia = new Intl.DateTimeFormat("en-CA", { timeZone: c.d.hoy.tz }).format(d);
  return dia !== hoy && h === 6 && m === 0 ? c.E2("mañana", "tomorrow") : tl(h * 60 + m);
}

function mRow(c: Ctx, M: MenuPanel, i: MItem): Fila {
  const { E2, ui } = c, sel: string[] | null = ui.msel ?? null, on = !!sel && sel.includes(i.id), low = M.cfg.low;
  const offO = i.grp.reduce((a, k) => a + (M.groups.find((g) => g.id === k)?.options.filter((x) => !x.on).length ?? 0), 0);
  const isLow = i.stk !== "none" && !i.ago && low > 0 && i.left <= low;
  const meta = [i.ago ? agoL(c, i.agoU).toUpperCase() : null, offO ? (offO > 1 ? E2(`${offO} OPCIONES AGOTADAS`, `${offO} OPTIONS OUT`) : E2("1 OPCIÓN AGOTADA", "1 OPTION OUT")) : null,
    i.stk === "day" && !i.ago && !isLow ? E2(`QUEDAN ${i.left} DE ${i.par}`, `${i.left} OF ${i.par} LEFT`) : null, i.stk === "qty" && !i.ago && !isLow ? E2(`${i.left} EN STOCK`, `${i.left} IN STOCK`) : null,
    i.avail === "own" ? avL(c, "own", true, i.av) || null : null, i.sell && i.ch.length === 1 ? (i.ch[0] === "pick" ? E2("SOLO PICKUP", "PICKUP ONLY") : E2("SOLO DELIVERY", "DELIVERY ONLY")) : null,
    i.maxQ ? E2(`MÁX. ${i.maxQ} POR PEDIDO`, `MAX ${i.maxQ} PER ORDER`) : null].filter(Boolean).join(" · ");
  const tag = i.hidden ? E2("OCULTO POR TO’LATINO", "HIDDEN BY TO’LATINO") : i.ago ? E2("AGOTADO", "SOLD OUT") : !i.sell ? E2("SOLO CATÁLOGO", "CATALOG ONLY") : isLow ? E2(`QUEDAN ${i.left}`, `${i.left} LEFT`) : null;
  const o: Fila = { key: i.id, ...img(i), imgW: "56px", t: i.name.es, s: i.desc.es || E2("Sin descripción", "No description"), m: meta || undefined, mFg: i.ago ? "var(--tl-danger)" : undefined, r: fp(i.cents), tag, tone: i.hidden || i.ago ? "danger" : isLow ? "ink" : "neutral", dim: (i.ago || i.hidden) && !sel };
  if (sel) { const tgl = () => c.setUi({ msel: on ? sel.filter((x) => x !== i.id) : [...sel, i.id] }); return { ...o, sel: { on, onClick: tgl }, onClick: tgl, chev: false, ...(on ? { bd: "1.5px solid var(--tl-ink)" } : {}) }; }
  const ask = ui.mAsk === i.id;
  return { ...o, tgOn: !i.ago, onTg: () => (i.ago ? c.run(() => platoAgotar(c.d.id, i.id, false, "hoy"), E2(`«${i.name.es}» se puede pedir otra vez.`, `“${i.name.es}” can be ordered again.`)) : c.setUi({ mAsk: ask ? null : i.id })),
    onClick: () => c.det(`item:${i.id}`),
    acts: ask ? [{ l: E2("Agotado hoy · vuelve mañana", "Sold out today · back tomorrow"), v: "primary", icon: "ban", onClick: () => { c.setUi({ mAsk: null }); c.run(() => platoAgotar(c.d.id, i.id, true, "hoy"), E2(`«${i.name.es}» agotado · vuelve mañana.`, `“${i.name.es}” sold out · back tomorrow.`)); } },
      { l: E2("Hasta que lo active", "Until I turn it on"), onClick: () => { c.setUi({ mAsk: null }); c.run(() => platoAgotar(c.d.id, i.id, true, "manual"), E2(`«${i.name.es}» agotado · hasta que lo actives.`, `“${i.name.es}” sold out · until you turn it on.`)); } },
      { l: E2("Cancelar", "Cancel"), v: "soft", onClick: () => c.setUi({ mAsk: null }) }] : undefined };
}

function itemsV(c: Ctx, M: MenuPanel): (Bloque | null)[] {
  const { E2, ui, d } = c, q = norm(ui.mq || ""), f = ui.mf || "all", sel: string[] | null = ui.msel ?? null, out: (Bloque | null)[] = [];
  const nFix = M.items.filter(fix).length;
  if (nFix && f !== "fix" && !sel) { const np = M.items.filter((i) => !i.photos.length).length, ne = M.items.filter((i) => !i.name.en).length, nd = M.items.filter((i) => !i.desc.es).length;
    out.push({ type: "note", tone: "info", icon: "image", t: [np ? E2(`${np} sin foto`, `${np} without photo`) : null, ne ? E2(`${ne} sin nombre en inglés`, `${ne} without English name`) : null, nd ? E2(`${nd} sin descripción`, `${nd} without description`) : null].filter(Boolean).join(" · ") + E2(". Con foto y descripción se piden más.", ". With a photo and description they sell more."), cta: E2("Ver", "See"), onCta: () => c.setUi({ mf: "fix" }) }); }
  out.push({ type: "search", val: ui.mq || "", ph: E2("Buscar en tu menú", "Search your menu"), onChange: (x) => c.setUi({ mq: x }), onClear: () => c.setUi({ mq: "" }), link: sel ? E2("Listo", "Done") : E2("Seleccionar", "Select"), linkOn: !!sel, onLink: () => c.setUi({ msel: sel ? null : [], mAsk: null, mBulk: null, mOrdC: null }) });
  const FL: [string, string, number][] = ([["all", E2("Todos", "All"), M.items.length], ["ago", E2("Agotados", "Sold out"), M.items.filter((i) => i.ago).length], ["cat", E2("Solo catálogo", "Catalog only"), M.items.filter((i) => !i.sell).length], ["fix", E2("Para completar", "To complete"), nFix]] as [string, string, number][]).filter((x) => x[0] === "all" || x[2] > 0 || f === x[0]);
  if (FL.length > 1) out.push({ type: "chips", items: FL.map(([k, l, n]) => ({ l: `${l} · ${n}`, v: f === k ? "selected" : "filter", onClick: () => c.setUi({ mf: k }) })) });
  const match = (i: MItem) => (!q || norm(`${i.name.es} ${i.name.en} ${i.desc.es}`).includes(q)) && (f === "all" || (f === "ago" ? i.ago : f === "cat" ? !i.sell : fix(i)));
  const vis = M.items.filter(match);
  if (sel) out.push(bulkB(c, M, vis));
  let first = true, any = false;
  for (const s of M.sections) {
    const L = M.items.filter((i) => i.sec === s.id && match(i));
    if (!L.length && (q || f !== "all")) continue;
    any = true;
    const k = [s.name.es.toUpperCase(), String(L.length), s.avail === "own" ? avL(c, "own", true, s.av) : null, s.visible ? null : E2("OCULTA", "HIDDEN")].filter(Boolean).join(" · ");
    const plain = !sel && !q && f === "all", ord = plain && ui.mOrdC === s.id;
    out.push({ type: "group", k, first, link: sel ? undefined : ord ? E2("Listo", "Done") : E2("Editar", "Edit"), onLink: () => (ord ? c.setUi({ mOrdC: null }) : c.det(`mcat:${s.id}`)), link2: plain && !ord && L.length > 1 ? E2("Ordenar", "Reorder") : undefined, onLink2: () => c.setUi({ mOrdC: s.id, mAsk: null }) });
    first = false;
    out.push(L.length ? { type: "rows", items: L.map((i, j) => (ord ? { key: i.id, ...img(i), imgW: "44px", compact: true, t: i.name.es, s: fp(i.cents), bd: "1.5px solid rgba(11,14,18,.14)", chev: false,
      acts: [j > 0 ? { l: E2("Subir", "Move up"), v: "soft", onClick: () => c.run(() => platoMover(c.d.id, i.id, -1)) } : null, j < L.length - 1 ? { l: E2("Bajar", "Move down"), v: "soft", onClick: () => c.run(() => platoMover(c.d.id, i.id, 1)) } : null].filter(Boolean) as Fila["acts"] } : mRow(c, M, i))) }
      : { type: "rows", items: [{ icon: "plus", t: E2("Sin platos todavía", "No items yet"), s: E2(`Agrega el primero de ${s.name.es}.`, `Add the first one to ${s.name.es}.`), onClick: () => { c.setUi({ mNewCat: s.id, mMore: false }); c.det("item:new"); } }] });
  }
  if (!M.sections.length) out.push({ type: "empty", icon: "restaurant", t: E2("Tu menú está vacío", "Your menu is empty"), s: E2("Crea una categoría (ej. Almuerzo) y agrega tu primer plato.", "Create a category (e.g. Lunch) and add your first item."), cta: E2("Nueva categoría", "New category"), onCta: () => c.det("mcat:new") });
  else if (!any) out.push({ type: "empty", icon: "search", t: E2("Nada con esa búsqueda", "Nothing matches"), s: "", cta: E2("Ver todo", "Show all"), onCta: () => c.setUi({ mq: "", mf: "all" }) });
  if (!d.pro) out.push({ type: "note", tone: "warn", t: E2(`Con Free se ven ${ITEMS_FREE} platos en tu página y hasta ${TOPE_FREE} pedidos en línea al mes.`, `On Free, ${ITEMS_FREE} items show on your page and up to ${TOPE_FREE} online orders a month.`) });
  return out;
}

function bulkB(c: Ctx, M: MenuPanel, vis: MItem[]): Bloque {
  const { E2, ui } = c, sel: string[] = ui.msel ?? [], n = sel.length, mb: string | null = ui.mBulk ?? null;
  const done = (t: string) => () => c.setUi({ msel: [], mBulk: null });
  const lote = (op: string, val: string | undefined, t: string) => c.run(() => platosLote(c.d.id, sel, op, val), t, done(t));
  const A = (k: string, l: string, icon: string, fn: () => void) => ({ l, icon, on: mb === k, off: !n, onClick: () => { if (n) fn(); } });
  const tog = (k: string) => () => c.setUi({ mBulk: mb === k ? null : k });
  let sub: { l: string; danger?: boolean; onClick: () => void }[] = [], subK = "";
  if (mb === "move") { subK = E2("MOVER A", "MOVE TO"); sub = M.sections.map((s) => ({ l: s.name.es, onClick: () => lote("move", s.id, E2(`${n} movidos a ${s.name.es}.`, `${n} moved to ${s.name.es}.`)) })); }
  if (mb === "price") { subK = E2("CAMBIAR PRECIO · REDONDEA A $0.25", "CHANGE PRICE · ROUNDS TO $0.25"); sub = [["p5", "+5 %"], ["p10", "+10 %"], ["a50", "+$0.50"], ["a100", "+$1"], ["m100", "−$1"]].map(([k, l]) => ({ l: l!, onClick: () => lote("price", k, E2(`Precio nuevo en ${n} platos. Los pedidos ya hechos no cambian.`, `New price on ${n} items. Orders already placed do not change.`)) })); }
  if (mb === "ch") { subK = E2("SE PIDEN", "ORDERED"); sub = [["ambos", E2("Delivery y pickup", "Delivery and pickup")], ["pick", E2("Solo pickup", "Pickup only")], ["cat", E2("Solo catálogo", "Catalog only")]].map(([k, l]) => ({ l: l!, onClick: () => lote("ch", k, E2(`Listo: ${l!.toLowerCase()} · ${n} platos.`, `Done: ${l!.toLowerCase()} · ${n} items.`)) })); }
  if (mb === "del") { subK = E2(`¿QUITAR ${n} DEL MENÚ? LOS PEDIDOS YA HECHOS LOS CONSERVAN.`, `REMOVE ${n} FROM THE MENU? PAST ORDERS KEEP THEM.`); sub = [{ l: E2(`Sí, quitar ${n}`, `Yes, remove ${n}`), danger: true, onClick: () => lote("del", undefined, E2(`${n} quitados del menú.`, `${n} removed from the menu.`)) }, { l: E2("Cancelar", "Cancel"), onClick: tog("del") }]; }
  const allOn = vis.length > 0 && vis.every((i) => sel.includes(i.id));
  void done;
  return { type: "bulk", t: n ? (n === 1 ? E2("1 seleccionado", "1 selected") : E2(`${n} seleccionados`, `${n} selected`)) : E2("Toca los platos que quieres cambiar", "Tap the items to change"),
    allL: allOn ? E2("Ninguno", "None") : E2("Todos", "All"), onAll: () => c.setUi({ msel: allOn ? [] : vis.map((i) => i.id) }), onClose: () => c.setUi({ msel: null, mBulk: null }), top: c.desk ? "12px" : "66px",
    acts: [A("ago", E2("Agotar hoy", "Sold out today"), "ban", () => lote("ago", undefined, E2(`${n} agotados hasta mañana.`, `${n} sold out until tomorrow.`))), A("on", E2("Activar", "Turn on"), "check", () => lote("on", undefined, E2(`${n} se pueden pedir otra vez.`, `${n} can be ordered again.`))),
      A("move", E2("Mover a…", "Move to…"), "grid", tog("move")), A("price", E2("Precio", "Price"), "dollar", tog("price")), A("ch", E2("Dónde se pide", "Where ordered"), "bag", tog("ch")), A("del", E2("Quitar", "Remove"), "trash", tog("del"))],
    sub, subK };
}

function catsV(c: Ctx, M: MenuPanel): (Bloque | null)[] {
  const { E2, ui } = c, many = M.sections.length > 1, ord = !!ui.mOrd && many;
  if (!M.sections.length) return [{ type: "empty", icon: "grid", t: E2("Sin categorías", "No categories"), s: E2("Ej. Desayunos, Almuerzo, Bebidas.", "e.g. Breakfast, Lunch, Drinks."), cta: E2("Nueva categoría", "New category"), onCta: () => c.det("mcat:new") }];
  return [{ type: "rows", k: E2("EN TU MENÚ, EN ESTE ORDEN", "ON YOUR MENU, IN THIS ORDER"), link: many ? (ord ? E2("Listo", "Done") : E2("Ordenar", "Reorder")) : undefined, onLink: () => c.setUi({ mOrd: !ord }), items: M.sections.map((s, i) => {
    const its = M.items.filter((x) => x.sec === s.id), n = its.length, ph = its.find((z) => z.photos.length);
    const o: Fila = { key: s.id, ...(ph ? { ...img(ph), imgW: "44px" } : { icon: n ? "grid" : "plus", ibg: "rgba(11,14,18,.05)", ifg: "rgba(11,14,18,.45)" }), t: s.name.es, s: n ? (n === 1 ? E2("1 plato", "1 item") : E2(`${n} platos`, `${n} items`)) : E2("Sin platos", "No items"),
      m: [n ? null : E2("VACÍA · NO SALE EN TU MENÚ", "EMPTY · NOT ON YOUR MENU"), s.visible ? null : E2("OCULTA", "HIDDEN"), s.avail === "own" ? avL(c, "own", true, s.av) : null].filter(Boolean).join(" · ") || undefined, dim: !s.visible };
    if (ord) return { ...o, chev: false, bd: "1.5px solid rgba(11,14,18,.14)", acts: [i > 0 ? { l: E2("Subir", "Move up"), v: "soft", onClick: () => c.run(() => categoriaMover(c.d.id, s.id, -1)) } : null, i < M.sections.length - 1 ? { l: E2("Bajar", "Move down"), v: "soft", onClick: () => c.run(() => categoriaMover(c.d.id, s.id, 1)) } : null].filter(Boolean) as Fila["acts"] };
    return { ...o, tgOn: s.visible, onTg: () => c.run(() => categoriaVisible(c.d.id, s.id, !s.visible), s.visible ? E2(`${s.name.es} oculta. Sus platos no se borran.`, `${s.name.es} hidden. Its items are kept.`) : E2(`${s.name.es} se ve otra vez.`, `${s.name.es} shows again.`)), onClick: () => c.det(`mcat:${s.id}`) };
  }) }];
}

function grpsV(c: Ctx, M: MenuPanel): (Bloque | null)[] {
  const { E2 } = c;
  if (!M.groups.length) return [{ type: "empty", icon: "filter", t: E2("Sin grupos de opciones", "No option groups"), s: E2("Un grupo se arma una vez y se usa en varios platos. Ej. Elige la carne, Tamaño, Agrégale.", "Build a group once and use it on many items. e.g. Choose the meat, Size, Add-ons."), cta: E2("Crear grupo", "Create group"), onCta: () => c.det("mgrp:new") }];
  return [{ type: "rows", items: M.groups.map((g) => { const u = usos(M, g.id).length, off = g.options.filter((o) => !o.on).length, all = off && off === g.options.length;
    return { key: g.id, icon: "filter", t: g.name.es, s: g.options.slice(0, 3).map((o) => o.es + (o.cents ? ` +${fp(o.cents)}` : "")).join(", ") + (g.options.length > 3 ? E2(` y ${g.options.length - 3} más`, ` and ${g.options.length - 3} more`) : ""),
      m: [grpRule(c, g).toUpperCase(), u ? (u === 1 ? E2("EN 1 PLATO", "ON 1 ITEM") : E2(`EN ${u} PLATOS`, `ON ${u} ITEMS`)) : null].filter(Boolean).join(" · "),
      tag: all ? E2("TODAS AGOTADAS", "ALL SOLD OUT") : off ? (off > 1 ? E2(`${off} AGOTADAS`, `${off} OUT`) : E2("1 AGOTADA", "1 OUT")) : !u ? E2("SIN USAR", "UNUSED") : null, tone: off ? "danger" : "neutral", onClick: () => c.det(`mgrp:${g.id}`) }; }) }];
}

function invV(c: Ctx, M: MenuPanel): (Bloque | null)[] {
  const { E2, ui } = c, q = norm(ui.mq || ""), low = M.cfg.low, out: (Bloque | null)[] = [], secN = (i: MItem) => M.sections.find((s) => s.id === i.sec)?.name.es ?? "";
  const qch = (i: MItem, dd: number) => c.run(() => platoCuenta(c.d.id, i.id, dd), (i.left + dd) <= 0 ? E2(`Se acabó «${i.name.es}»: agotado hasta mañana.`, `“${i.name.es}” ran out: sold out until tomorrow.`) : undefined);
  const offRow = (i: MItem): Fila => ({ key: i.id, ...img(i), imgW: "44px", compact: true, t: i.name.es, s: `${agoL(c, i.agoU)} · ${secN(i)}`, tag: E2("AGOTADO", "SOLD OUT"), tone: "danger", acts: [{ l: E2("Ya hay · activar", "Back · turn on"), icon: "check", onClick: () => c.run(() => platoAgotar(c.d.id, i.id, false, "hoy"), E2(`«${i.name.es}» se puede pedir otra vez.`, `“${i.name.es}” can be ordered again.`)) }] });
  const onRow = (i: MItem): Fila => ({ key: i.id, ...img(i), imgW: "44px", compact: true, t: i.name.es, s: secN(i), acts: [{ l: E2("Agotado hoy", "Sold out today"), icon: "ban", onClick: () => c.run(() => platoAgotar(c.d.id, i.id, true, "hoy"), E2(`«${i.name.es}» agotado · vuelve mañana.`, `“${i.name.es}” sold out · back tomorrow.`)) }, { l: E2("Hasta que lo active", "Until I turn it on"), onClick: () => c.run(() => platoAgotar(c.d.id, i.id, true, "manual"), E2(`«${i.name.es}» agotado · hasta que lo actives.`, `“${i.name.es}” sold out · until you turn it on.`)) }] });
  const optRows = (flt: (o: MGrp["options"][number]) => boolean): Fila[] => M.groups.flatMap((g) => { const u = usos(M, g.id).length; return g.options.map((o, j) => ({ o, j })).filter(({ o }) => flt(o)).map(({ o, j }) => ({
    key: `${g.id}:${j}`, icon: "filter", ...(o.on ? {} : { ibg: "rgba(192,57,43,.08)", ifg: "var(--tl-danger)" }), compact: true, t: o.es, s: E2(`Opción de «${g.name.es}» · en ${u} ${u === 1 ? "plato" : "platos"}`, `Option in “${g.name.es}” · on ${u} ${u === 1 ? "item" : "items"}`),
    tag: o.on ? null : E2("AGOTADA", "SOLD OUT"), tone: "danger",
    acts: [o.on ? { l: E2("Agotar", "Sold out"), icon: "ban", onClick: () => c.run(() => grupoOpcion(c.d.id, g.id, j, false), E2(`«${o.es}» agotada en ${u} platos.`, `“${o.es}” sold out on ${u} items.`)) } : { l: E2("Ya hay · activar", "Back · turn on"), icon: "check", onClick: () => c.run(() => grupoOpcion(c.d.id, g.id, j, true), E2(`«${o.es}» se puede elegir otra vez.`, `“${o.es}” can be picked again.`)) }] })); });
  out.push({ type: "search", val: ui.mq || "", ph: E2("¿Qué se acabó? Busca plato u opción", "What ran out? Search item or option"), onChange: (x) => c.setUi({ mq: x }), onClear: () => c.setUi({ mq: "" }) });
  if (q) {
    const its = M.items.filter((i) => norm(`${i.name.es} ${i.name.en}`).includes(q)), ops = optRows((o) => norm(`${o.es} ${o.en}`).includes(q));
    if (!its.length && !ops.length) out.push({ type: "empty", icon: "search", t: E2("Nada con ese nombre", "Nothing with that name"), s: "" });
    if (its.length) out.push({ type: "rows", k: E2("PLATOS", "ITEMS"), items: its.map((i) => (i.ago ? offRow(i) : onRow(i))) });
    if (ops.length) out.push({ type: "rows", k: E2("OPCIONES", "OPTIONS"), items: ops });
    return out;
  }
  const offI = M.items.filter((i) => i.ago), offO = optRows((o) => !o.on);
  out.push({ type: "group", k: E2(`AGOTADO AHORA · ${offI.length + offO.length}`, `SOLD OUT NOW · ${offI.length + offO.length}`), first: true });
  if (!offI.length && !offO.length) out.push({ type: "note", tone: "ok", t: E2("Todo tu menú se puede pedir.", "Your whole menu can be ordered.") });
  if (offI.length) out.push({ type: "rows", items: offI.map(offRow) });
  if (offO.length) out.push({ type: "rows", k: offI.length ? E2("OPCIONES", "OPTIONS") : undefined, items: offO });
  const cnt = M.items.filter((i) => i.stk !== "none"), add = !!ui.mInvAdd;
  out.push({ type: "group", k: E2("LO QUE CUENTAS", "WHAT YOU COUNT"), link: add ? E2("Listo", "Done") : E2("Contar otro plato", "Count another item"), onLink: () => c.setUi({ mInvAdd: !add }) });
  out.push(cnt.length ? { type: "rows", items: cnt.map((i) => { const isLow = !i.ago && low > 0 && i.left <= low; return { key: i.id, ...img(i), imgW: "44px", compact: true, t: i.name.es,
    s: i.stk === "day" ? E2(`De ${i.par} · vuelve a ${i.par} a las 6 AM`, `Of ${i.par} · back to ${i.par} at 6 AM`) : E2("En stock · vuelve cuando repongas", "In stock · back when you restock"),
    tag: i.ago ? E2("AGOTADO", "SOLD OUT") : isLow ? E2("QUEDAN POCOS", "RUNNING LOW") : null, tone: i.ago ? "danger" : "ink", qv: i.left, onQm: () => qch(i, -1), onQp: () => qch(i, 1), onClick: () => c.det(`item:${i.id}`), chev: false }; }) }
    : { type: "note", tone: "info", t: E2("Cuenta lo que preparas por tanda (ej. 30 sancochos). Al llegar a 0 se agota solo.", "Count what you make in batches (e.g. 30 sancochos). At 0 it sells out on its own.") });
  if (add) out.push({ type: "rows", items: M.items.filter((i) => i.stk === "none").map((i) => ({ key: i.id, ...img(i), imgW: "40px", compact: true, t: i.name.es, s: secN(i),
    acts: [{ l: E2("Por día", "Per day"), icon: "plus", onClick: () => c.run(() => platoCuenta(c.d.id, i.id, 0, "day"), E2(`«${i.name.es}»: 20 por día. Cámbialo con − y +.`, `“${i.name.es}”: 20 per day. Change it with − and +.`)) },
      { l: E2("En stock", "In stock"), icon: "plus", onClick: () => c.run(() => platoCuenta(c.d.id, i.id, 0, "qty"), E2(`«${i.name.es}»: 10 en stock. Cámbialo con − y +.`, `“${i.name.es}”: 10 in stock. Change it with − and +.`)) }] })) });
  out.push({ type: "chips", k: E2("AVÍSAME POR SMS CUANDO QUEDEN", "TEXT ME WHEN THERE ARE"), items: ([[2, "2"], [3, "3"], [5, "5"], [0, E2("No avisar", "Do not alert")]] as [number, string][]).map(([v2, l]) => ({ l, v: M.cfg.low === v2 ? "selected" : "filter", onClick: () => c.run(() => menuAjustes(c.d.id, { low: v2 })) })) });
  return out;
}

function hrsV(c: Ctx, M: MenuPanel): (Bloque | null)[] {
  const { E2, d } = c, cf = M.cfg, ti = (d.hoy.dow + 6) % 7, x = d.horas[ti], cl = x && x.on ? (x.two ? x.b2 : x.b) : null, prep = 25;
  const ch = (k: string, prop: "busy" | "last", opts: [number, string][], help: string): Bloque => ({ type: "chips", k, help, items: opts.map(([v2, l]) => ({ l, v: cf[prop] === v2 ? "selected" : "filter", onClick: () => c.run(() => menuAjustes(c.d.id, { [prop]: v2 })) })) });
  const out: (Bloque | null)[] = [{ type: "group", k: E2("HOY", "TODAY"), first: true },
    { type: "chips", k: E2("PAUSAR PEDIDOS EN LÍNEA", "PAUSE ONLINE ORDERS"), help: cf.pause ? E2(`HASTA ${horaLocal(c, cf.pause).toUpperCase()}`, `UNTIL ${horaLocal(c, cf.pause).toUpperCase()}`) : "",
      items: [...(cf.pause ? [{ l: E2("Reanudar ahora", "Resume now"), v: "filter", onClick: () => c.run(() => menuAjustes(c.d.id, { pause: null }), E2("Recibes pedidos otra vez.", "Taking orders again.")) }] : []),
        ...([["15", "15 min"], ["30", "30 min"], ["60", E2("1 hora", "1 hour")], ["dia", E2("Resto del día", "Rest of the day")]] as [string, string][]).map(([k, l]) => ({ l, v: cf.pause && cf.pauseKind === k ? "selected" : "filter",
          onClick: () => (cf.pause && cf.pauseKind === k ? c.run(() => menuAjustes(c.d.id, { pause: null })) : c.run(() => menuAjustes(c.d.id, { pause: k }), E2("En pausa. Los pedidos que ya tienes siguen igual.", "Paused. Orders you already have stay the same."))) }))] },
    ch(E2("MUCHO TRABAJO · TIEMPO EXTRA", "BUSY · EXTRA TIME"), "busy", [[0, E2("Normal", "Normal")], [10, "+10 min"], [20, "+20 min"], [30, "+30 min"]], E2(`LISTO EN ${prep + cf.busy} MIN`, `READY IN ${prep + cf.busy} MIN`)),
    { type: "group", k: E2("CUÁNDO SE PIDE", "WHEN PEOPLE CAN ORDER") },
    { type: "rows", items: [{ icon: "clock", t: E2("Tu horario", "Your hours"), s: x && x.on ? E2(`Hoy ${fmtH(x.a)}–${fmtH(x.b)}${x.two ? ` · ${fmtH(x.a2)}–${fmtH(x.b2)}` : ""}`, `Today ${fmtH(x.a)}–${fmtH(x.b)}${x.two ? ` · ${fmtH(x.a2)}–${fmtH(x.b2)}` : ""}`) : E2("Hoy cerrado", "Closed today"), onClick: () => c.go("pag", "hor") }] },
    ch(E2("ÚLTIMO PEDIDO EN LÍNEA", "LAST ONLINE ORDER"), "last", [[0, E2("Hasta que cierras", "Until closing")], [15, E2("15 min antes", "15 min before")], [30, E2("30 min antes", "30 min before")], [45, E2("45 min antes", "45 min before")]], cl != null ? E2(`HOY HASTA ${fmtH(cl - cf.last / 60)}`, `TODAY UNTIL ${fmtH(cl - cf.last / 60)}`) : "")];
  const cs = M.sections.filter((s) => s.avail === "own"), is = M.items.filter((i) => i.avail === "own");
  if (cs.length || is.length) out.push({ type: "group", k: E2("CON HORARIO PROPIO", "WITH THEIR OWN HOURS") }, { type: "rows", items: [
    ...cs.map((s): Fila => { const n = M.items.filter((i) => i.sec === s.id).length; return { key: `s${s.id}`, icon: "grid", t: s.name.es, s: `${avL(c, "own", false, s.av)} · ${n === 1 ? E2("1 plato", "1 item") : E2(`${n} platos`, `${n} items`)}`, onClick: () => c.det(`mcat:${s.id}`) }; }),
    ...is.map((i): Fila => ({ key: `i${i.id}`, ...img(i), imgW: "44px", t: i.name.es, s: avL(c, "own", false, i.av), onClick: () => c.det(`item:${i.id}`) }))] });
  return out;
}

/* Bloques de «Cuándo se ofrece» (mAvB). */
function avB(c: Ctx, F: { d: { avail: string; av: Av | null }; set: (p: Partial<{ avail: string; av: Av | null }>) => void }, sec: MSec | null): (Bloque | null)[] {
  const { E2 } = c, d = F.d, out: (Bloque | null)[] = [];
  const opts: [string, string][] = [...(sec ? [["cat", E2("Como su categoría", "Same as its category")] as [string, string]] : []), ["siempre", E2("Todo el horario", "All hours")], ["own", E2("Horario propio", "Own hours")]];
  out.push({ type: "chips", k: sec ? E2("CUÁNDO SE OFRECE", "WHEN IT IS OFFERED") : E2("CUÁNDO SE PIDE", "WHEN IT CAN BE ORDERED"), help: sec && d.avail === "cat" ? (avL(c, sec.avail, true, sec.av) || E2("TODO EL HORARIO", "ALL HOURS")) : "",
    items: opts.map(([v, l]) => ({ l, v: d.avail === v ? "selected" : "filter", onClick: () => F.set(v === "own" && !d.av ? { avail: v, av: avDef(c) } : { avail: v }) })) });
  if (d.avail === "own" && d.av) { const a = d.av, set = (p: Partial<Av>) => F.set({ av: { ...a, ...p } });
    out.push({ type: "step", t: E2("Desde", "From"), v: tl(a.f), onM: () => set({ f: Math.max(0, a.f - 30) }), onP: () => set({ f: Math.min(a.t - 30, a.f + 30) }) }, { type: "step", t: E2("Hasta", "Until"), v: tl(a.t), onM: () => set({ t: Math.max(a.f + 30, a.t - 30) }), onP: () => set({ t: Math.min(1440, a.t + 30) }) });
    out.push({ type: "chips", k: E2("DÍAS", "DAYS"), items: [1, 2, 3, 4, 5, 6, 0].map((z) => ({ l: MDAY[z]![c.es ? 0 : 1], v: a.d.includes(z) ? "selected" : "filter", onClick: () => set({ d: a.d.includes(z) ? a.d.filter((y) => y !== z) : [...a.d, z] }) })) });
    out.push(a.d.length ? { type: "note", tone: "info", icon: "clock", t: E2("Fuera de ese horario se ve en tu menú, pero no se puede pedir.", "Outside those hours it shows on your menu but cannot be ordered.") } : { type: "note", tone: "warn", t: E2("Elige al menos un día.", "Pick at least one day.") }); }
  return out;
}

/* ── Detalle: plato, categoría, grupo ── */
export function menuDetalle(c: Ctx, id: string): Sec | null {
  if (!c.menu) return null;
  if (id.startsWith("item:")) return platoDet(c, id.slice(5));
  if (id.startsWith("mcat:")) return catDet(c, id.slice(5));
  if (id.startsWith("mgrp:")) return grpDet(c, id.slice(5));
  return null;
}

type FPlato = Omit<PlatoIn, "av"> & { av: Av | null };
function platoDet(c: Ctx, iid: string): Sec {
  const { E2, ui, es } = c, M = N(c), isNew = iid === "new", it0 = M.items.find((y) => y.id === iid);
  const back = () => c.closeDet(), head = (o: Partial<Extract<Bloque, { type: "head" }>>): Bloque => ({ type: "head", t: "", onBack: back, ...o });
  if (!it0 && !isNew) return { blocks: [head({ t: E2("Ya no está en tu menú", "No longer on your menu") })], ed: null };
  const sec0 = ui.mNewCat || M.sections[0]?.id || "";
  const base: FPlato = it0 ? { name: it0.name.es, en: it0.name.en, desc: it0.desc.es, descEn: it0.desc.en, price: String(it0.cents / 100), sec: it0.sec ?? sec0, tax: it0.tax, photos: it0.photos, sell: it0.sell, ch: it0.ch, ago: it0.ago, agoU: it0.agoU, stk: it0.stk, left: it0.left, par: it0.par, maxQ: it0.maxQ, tags: it0.tags, extra: it0.extra, feat: it0.feat, avail: it0.avail, av: it0.av, grp: it0.grp }
    : { name: "", en: "", desc: "", descEn: "", price: "", sec: sec0, tax: 6, photos: [], sell: true, ch: ["dlv", "pick"], ago: false, agoU: "hoy", stk: "none", left: 10, par: 10, maxQ: 0, tags: [], extra: 0, feat: false, avail: "cat", av: null, grp: [] };
  const F = c.form<FPlato>(`det:mi:${iid}`, base), d = F.d, setF = F.set, pr = parseFloat(d.price) || 0, sec = M.sections.find((s) => s.id === d.sec) ?? null;
  const more = !isNew || ui.mMore === true, out: (Bloque | null)[] = [];
  if (it0?.hidden) out.push({ type: "note", tone: "danger", icon: "ban", t: E2(`To’Latino ocultó este plato: no sale en tu menú. Motivo: ${it0.hiddenReason ?? ""}`, `To’Latino hid this item: it is not on your menu. Reason: ${it0.hiddenReason ?? ""}`) });
  out.push(head({ eye: E2("MENÚ", "MENU") + (sec ? ` · ${sec.name.es.toUpperCase()}` : ""), t: isNew ? E2("Nuevo plato", "New item") : it0!.name.es, s: isNew ? E2("Con nombre, precio y categoría ya se puede pedir. Lo demás, cuando puedas.", "Name, price and category are enough to sell. The rest whenever you can.") : undefined }));
  const ptags = [...(d.ago ? [{ label: E2("AGOTADO HOY", "SOLD OUT TODAY"), tone: "danger" }] : []), ...(d.feat ? [{ label: "POPULAR", tone: "action" }] : []), ...d.tags.slice(0, 2).map((t) => { const T = MTAGS.find((z) => z[0] === t) ?? [t, t, t]; return { label: (es ? T[1] : T[2]).toUpperCase(), tone: "neutral" }; })];
  out.push({ type: "mprev", k: E2("ASÍ SE VE EN TU MENÚ", "HOW IT LOOKS ON YOUR MENU"), name: (es ? d.name : d.en || d.name) || E2("Nombre del plato", "Item name"), desc: (es ? d.desc : d.descEn || d.desc) || "", price: fp(Math.round(pr * 100)), tags: ptags, image: d.photos[0] ?? "", off: d.ago });
  const sp: number | null = ui.mph && ui.mph.id === iid ? ui.mph.i : null;
  out.push({ type: "photos", k: E2("FOTOS · LA PRIMERA ES LA PRINCIPAL", "PHOTOS · THE FIRST IS THE MAIN ONE"), count: `${d.photos.length}/5`, cols: 3, items: d.photos.map((p, i) => ({ key: p, bg: `url("${p}")`, tag: i === 0 ? E2("PRINCIPAL", "MAIN") : undefined, on: sp === i, onClick: () => c.setUi({ mph: sp === i ? null : { id: iid, i } }) })),
    addL: E2("Subir foto", "Upload photo"), onAdd: d.photos.length < 5 ? () => c.pickFiles(false, async (fs) => { const r = await subirFoto(fs[0]!); if (r.ok && r.url) setF({ photos: [...F.d.photos, r.url].slice(0, 5) }); else c.toast(r.mensaje ? r.mensaje[es ? "es" : "en"] : E2("No se pudo subir la foto.", "Couldn’t upload the photo.")); }) : undefined,
    selActs: sp != null && d.photos[sp] ? [...(sp > 0 ? [{ l: E2("Hacer principal", "Make main"), icon: "star", onClick: () => { const a = d.photos.slice(), t = a.splice(sp, 1)[0]!; a.unshift(t); setF({ photos: a }); c.setUi({ mph: { id: iid, i: 0 } }); } }] : []), { l: E2("Quitar foto", "Remove photo"), icon: "trash", onClick: () => { setF({ photos: d.photos.filter((_, j) => j !== sp) }); c.setUi({ mph: null }); } }] : [] });
  const gal = c.d.fotos.map((x) => x.url);
  if (gal.length) { out.push({ type: "acts", items: [{ l: ui.mGal ? E2("Cerrar tu galería", "Close your gallery") : E2("Elegir de tu galería", "Pick from your gallery"), icon: "image", onClick: () => c.setUi({ mGal: !ui.mGal }) }] });
    if (ui.mGal) out.push({ type: "photos", cols: 4, items: gal.slice(0, 16).map((ph) => { const on = d.photos.includes(ph); return { key: ph, bg: `url("${ph}")`, on, tag: on ? E2("ELEGIDA", "PICKED") : undefined, onClick: () => { if (on) setF({ photos: d.photos.filter((z) => z !== ph) }); else if (d.photos.length < 5) setF({ photos: [...d.photos, ph] }); else c.toast(E2("Ya tienes 5. Quita una primero.", "You have 5. Remove one first.")); } }; }) }); }
  const fld = (k: string, prop: "name" | "en" | "desc" | "descEn" | "price", o: { max: number; area?: boolean; ph?: string; help?: string; pre?: string; num?: boolean }): Bloque => ({ type: "field", k, val: String(d[prop] ?? ""), area: o.area, rows: 2, max: o.max, ph: o.ph, help: o.help, pre: o.pre, im: o.num ? "decimal" : "text",
    count: o.num ? undefined : `${String(d[prop] ?? "").length}/${o.max}`, onChange: (v) => setF({ [prop]: o.num ? v.replace(/[^0-9.]/g, "").slice(0, 8) : v } as Partial<FPlato>) });
  out.push({ type: "group", k: E2("NOMBRE Y DESCRIPCIÓN", "NAME AND DESCRIPTION") }, fld(E2("NOMBRE", "NAME"), "name", { max: 60, ph: E2("Ej. La bandera", "e.g. La bandera") }), fld(E2("DESCRIPCIÓN", "DESCRIPTION"), "desc", { max: 140, area: true, ph: E2("Qué lleva. Ej. Cuarto de pollo frito con tostones.", "What it comes with. e.g. Quarter fried chicken with tostones.") }));
  if (more) out.push({ type: "group", k: E2("EN INGLÉS", "IN ENGLISH") }, fld(E2("NOMBRE", "NAME"), "en", { max: 60, help: E2("Si lo dejas vacío, en inglés se ve el nombre en español.", "If empty, the Spanish name shows in English.") }), fld(E2("DESCRIPCIÓN", "DESCRIPTION"), "descEn", { max: 140, area: true }));
  const req = d.grp.map((k) => M.groups.find((g) => g.id === k)).filter((g): g is MGrp => !!g && g.required && g.options.length > 0);
  const lo = pr + req.reduce((a, g) => a + Math.min(...g.options.map((o) => o.cents)) / 100, 0), hi = pr + req.reduce((a, g) => a + Math.max(...g.options.map((o) => o.cents)) / 100, 0);
  out.push({ type: "group", k: E2("CATEGORÍA Y PRECIO", "CATEGORY AND PRICE"), link: E2("Nueva categoría", "New category"), onLink: () => c.det("mcat:new") },
    { type: "chips", items: M.sections.map((s) => ({ l: s.name.es, v: d.sec === s.id ? "selected" : "filter", onClick: () => setF({ sec: s.id }) })) },
    fld(E2("PRECIO", "PRICE"), "price", { max: 8, pre: "$", num: true, ph: "0.00", help: pr && hi > lo ? E2(`Con sus opciones obligatorias va de ${fp(Math.round(lo * 100))} a ${fp(Math.round(hi * 100))}.`, `With its required options it goes from ${fp(Math.round(lo * 100))} to ${fp(Math.round(hi * 100))}.`) : undefined }),
    { type: "chips", k: E2("IMPUESTO", "TAX"), items: ([[6, E2("6 % · comida preparada", "6% · prepared food")], [0, E2("Exento", "Exempt")]] as [number, string][]).map(([v, l]) => ({ l, v: d.tax === v ? "selected" : "filter", onClick: () => setF({ tax: v }) })) });
  if (!more) out.push({ type: "rows", items: [{ icon: "more", t: E2("Más ajustes", "More settings"), s: E2("En inglés, opciones, inventario, delivery o pickup y alergias. Puedes hacerlo después.", "English, options, stock, delivery or pickup and allergens. You can do it later."), onClick: () => c.setUi({ mMore: true }) }] });
  if (more) {
    const free = M.groups.filter((g) => !d.grp.includes(g.id));
    out.push({ type: "group", k: E2("OPCIONES DEL CLIENTE", "CUSTOMER OPTIONS"), link: E2("Crear grupo", "Create group"), onLink: () => c.det("mgrp:new") });
    out.push(d.grp.length ? { type: "rows", items: d.grp.map((k, j) => { const g = M.groups.find((x) => x.id === k); if (!g) return null; const off = g.options.filter((o) => !o.on).length;
      return { key: k, icon: g.required ? "check" : "plus", compact: true, t: g.name.es, s: `${grpRule(c, g)} · ${g.options.length} ${E2("opciones", "options")}`, tag: off ? (off > 1 ? E2(`${off} AGOTADAS`, `${off} OUT`) : E2("1 AGOTADA", "1 OUT")) : null, tone: "danger",
        acts: [...(j > 0 ? [{ l: E2("Subir", "Move up"), v: "soft", onClick: () => { const a = d.grp.slice(); a[j] = a[j - 1]!; a[j - 1] = k; setF({ grp: a }); } }] : []), { l: E2("Quitar de este plato", "Remove from this item"), v: "soft", icon: "trash", onClick: () => setF({ grp: d.grp.filter((x) => x !== k) }) }] }; }).filter(Boolean) as Fila[] }
      : { type: "note", tone: "info", t: E2("Sin opciones: el cliente lo agrega directo con el +.", "No options: the client adds it straight with +.") });
    if (free.length) out.push({ type: "chips", k: E2("AGREGAR UN GRUPO QUE YA TIENES", "ADD A GROUP YOU ALREADY HAVE"), items: free.map((g) => ({ l: `+ ${g.name.es}`, v: "filter", onClick: () => setF({ grp: [...d.grp, g.id] }) })) });
    out.push({ type: "group", k: E2("DISPONIBILIDAD", "AVAILABILITY") }, { type: "rows", items: [{ icon: "check", t: E2("Disponible", "Available"), s: d.ago ? E2("Agotado: se ve atenuado y no se puede pedir.", "Sold out: shows dimmed and cannot be ordered.") : E2("Se puede pedir ahora.", "Can be ordered now."), tgOn: !d.ago, onTg: () => setF({ ago: !d.ago, agoU: "hoy" }) }] });
    if (d.ago) out.push({ type: "chips", k: E2("¿HASTA CUÁNDO?", "UNTIL WHEN?"), items: Object.keys(MAGO).map((k) => ({ l: agoL(c, k), v: d.agoU === k ? "selected" : "filter", onClick: () => setF({ agoU: k }) })) });
    out.push(...avB(c, { d: { avail: d.avail, av: d.av }, set: (p) => setF(p as Partial<FPlato>) }, sec ?? { id: "", name: { es: "", en: "" }, visible: true, avail: "siempre", av: null, sort: 0 }));
    out.push({ type: "group", k: E2("INVENTARIO", "STOCK") }, { type: "chips", k: E2("CÓMO LO CUENTAS", "HOW YOU COUNT IT"), items: ([["none", E2("Sin límite", "No limit")], ["day", E2("Cuenta del día", "Daily count")], ["qty", E2("Cantidad en stock", "Stock quantity")]] as [string, string][]).map(([v, l]) => ({ l, v: d.stk === v ? "selected" : "filter", onClick: () => setF({ stk: v }) })) });
    if (d.stk === "day") out.push({ type: "step", t: E2("Preparas cada día", "You make each day"), s: E2("Cada mañana vuelve a esta cuenta.", "Resets to this every morning."), v: E2(`${d.par} porciones`, `${d.par} portions`), onM: () => setF({ par: Math.max(1, d.par - 1) }), onP: () => setF({ par: Math.min(300, d.par + 1) }) },
      { type: "step", t: E2("Quedan hoy", "Left today"), s: E2("Baja con cada pedido. En 0 se agota solo.", "Goes down with each order. At 0 it sells out."), v: String(d.left), onM: () => setF({ left: Math.max(0, d.left - 1) }), onP: () => setF({ left: Math.min(300, d.left + 1) }) });
    if (d.stk === "qty") out.push({ type: "step", t: E2("En stock", "In stock"), s: E2("Baja con cada pedido. En 0 se agota hasta que repongas.", "Goes down with each order. At 0 it sells out until you restock."), v: String(d.left), onM: () => setF({ left: Math.max(0, d.left - 1) }), onP: () => setF({ left: Math.min(999, d.left + 1) }) });
    const lim = d.maxQ > 0;
    out.push({ type: "chips", k: E2("MÁXIMO POR PEDIDO", "MAX PER ORDER"), items: [{ l: E2("Sin tope", "No limit"), v: lim ? "filter" : "selected", onClick: () => setF({ maxQ: 0 }) }, { l: E2("Con tope", "Set a limit"), v: lim ? "selected" : "filter", onClick: () => { if (!lim) setF({ maxQ: 3 }); } }] });
    if (lim) out.push({ type: "step", t: E2("Hasta", "Up to"), s: E2("Un cliente no puede pedir más de esta cantidad en un mismo pedido.", "A client cannot order more than this in one order."), v: E2(`${d.maxQ} por pedido`, `${d.maxQ} per order`), onM: () => setF({ maxQ: Math.max(1, d.maxQ - 1) }), onP: () => setF({ maxQ: Math.min(99, d.maxQ + 1) }) });
    out.push({ type: "group", k: E2("DÓNDE SE PIDE", "WHERE IT IS ORDERED") }, { type: "rows", items: [{ icon: "bag", t: E2("Se pide en línea", "Ordered online"), s: E2("Apagado = solo catálogo: se ve con su precio, no se pide.", "Off = catalog only: shows with its price, cannot be ordered."), tgOn: d.sell, onTg: () => setF({ sell: !d.sell }) }] });
    if (d.sell) { const tgc = (k: string) => setF({ ch: d.ch.includes(k) ? d.ch.filter((x) => x !== k) : [...d.ch, k] });
      out.push({ type: "rows", items: [{ icon: "truck", t: "Delivery", s: d.ch.includes("dlv") ? E2("Se lo llevan a casa.", "Brought to their home.") : E2("En tu menú sale «Solo pickup».", "Your menu says “Pickup only”."), tgOn: d.ch.includes("dlv"), onTg: () => tgc("dlv") },
        { icon: "store", t: "Pickup", s: d.ch.includes("pick") ? E2("Lo recogen en tu local.", "Picked up at your place.") : E2("En tu menú sale «Solo delivery».", "Your menu says “Delivery only”."), tgOn: d.ch.includes("pick"), onTg: () => tgc("pick") }] }); }
    if (d.sell && !d.ch.length) out.push({ type: "note", tone: "warn", t: E2("Con los dos apagados no se puede pedir. Enciende al menos uno o apaga «Se pide en línea».", "With both off it cannot be ordered. Turn one on or turn off “Ordered online”.") });
    out.push({ type: "group", k: E2("PARA EL CLIENTE", "FOR THE CLIENT") }, { type: "chips", k: E2("LLEVA O ES", "CONTAINS OR IS"), help: E2("AYUDA CON ALERGIAS", "HELPS WITH ALLERGIES"), items: MTAGS.map((t) => ({ l: es ? t[1] : t[2], v: d.tags.includes(t[0]) ? "selected" : "filter", onClick: () => setF({ tags: d.tags.includes(t[0]) ? d.tags.filter((x) => x !== t[0]) : [...d.tags, t[0]] }) })) },
      { type: "step", t: E2("Tiempo extra de cocina", "Extra kitchen time"), s: E2("Se suma a tu tiempo de preparación cuando lo piden.", "Added to your prep time when ordered."), v: d.extra ? `+${d.extra} min` : E2("Ninguno", "None"), onM: () => setF({ extra: Math.max(0, d.extra - 5) }), onP: () => setF({ extra: Math.min(60, d.extra + 5) }) },
      { type: "rows", items: [{ icon: "star", t: E2("Fijar en Populares", "Pin to Popular"), s: E2("Sale arriba en tu menú. Si no, Populares se arma con lo más pedido.", "Shows at the top of your menu. Otherwise Popular uses your best sellers."), tgOn: d.feat, onTg: () => setF({ feat: !d.feat }) }] });
  }
  const miss = [d.name.trim().length < 2 ? E2("nombre", "name") : null, pr > 0 ? null : E2("precio", "price"), d.sec ? null : E2("categoría", "category"), d.sell && !d.ch.length ? E2("delivery o pickup", "delivery or pickup") : null, d.avail === "own" && d.av && !d.av.d.length ? E2("días de su horario", "days for its hours") : null].filter(Boolean), valid = !miss.length;
  if (miss.length && F.dirty) out.push({ type: "note", tone: "warn", t: E2(`Para guardar falta: ${miss.join(" · ")}.`, `To save, add: ${miss.join(" · ")}.`) });
  const askDel = !isNew && ui.mDel === iid;
  if (askDel) out.push({ type: "note", tone: "danger", icon: "trash", t: E2(`¿Quitar «${it0!.name.es}» del menú? Los pedidos ya hechos lo conservan. Si solo se acabó, mejor márcalo agotado.`, `Remove “${it0!.name.es}” from the menu? Past orders keep it. If it just ran out, mark it sold out instead.`) });
  const extra = isNew ? [] : askDel ? [{ l: E2("Sí, quitar", "Yes, remove"), v: "danger", icon: "trash", onClick: () => { c.setUi({ mDel: null }); c.run(() => platosLote(c.d.id, [iid], "del"), E2("Quitado del menú. Los pedidos ya hechos lo conservan.", "Removed from the menu. Past orders keep it."), back); } }, { l: E2("Cancelar", "Cancel"), v: "soft", onClick: () => c.setUi({ mDel: null }) }]
    : [{ l: E2("Duplicar", "Duplicate"), onClick: () => c.run(() => platoDuplicar(c.d.id, iid), E2("Copia creada. Cámbiale el nombre y lo que haga falta.", "Copy created. Rename it and change what you need."), (r) => r.id && c.det(`item:${r.id}`)) }, { l: E2("Quitar", "Remove"), icon: "trash", onClick: () => c.setUi({ mDel: iid }) }];
  return { blocks: out, tail: extra.length ? [{ type: "acts", items: extra }] : [],
    ed: { F, l: isNew ? E2("Agregar al menú", "Add to menu") : E2("Guardar", "Save"), valid, always: isNew, apply: (x: FPlato) => platoGuardar(c.d.id, iid, { ...x, av: x.av }), onDone: back } };
}

function catDet(c: Ctx, key: string): Sec {
  const { E2, ui } = c, M = N(c), isNew = key === "new", s0 = M.sections.find((s) => s.id === key);
  const back = () => c.closeDet();
  if (!s0 && !isNew) return { blocks: [{ type: "head", t: E2("Esa categoría ya no existe", "That category no longer exists"), onBack: back }], ed: null };
  const F = c.form<{ name: string; en: string; avail: string; av: Av | null; visible: boolean }>(`det:mc:${key}`, s0 ? { name: s0.name.es, en: s0.name.en, avail: s0.avail, av: s0.av, visible: s0.visible } : { name: "", en: "", avail: "siempre", av: null, visible: true }), d = F.d;
  const its = s0 ? M.items.filter((i) => i.sec === s0.id) : [], out: (Bloque | null)[] = [];
  out.push({ type: "head", eye: E2("MENÚ · CATEGORÍA", "MENU · CATEGORY"), t: isNew ? E2("Nueva categoría", "New category") : s0!.name.es, onBack: back });
  out.push({ type: "field", k: E2("NOMBRE", "NAME"), val: d.name, max: 40, count: `${d.name.length}/40`, ph: E2("Ej. Desayunos, Mariscos, Para compartir", "e.g. Breakfast, Seafood, To share"), onChange: (v) => F.set({ name: v }) });
  out.push({ type: "group", k: E2("EN INGLÉS", "IN ENGLISH") }, { type: "field", k: E2("NOMBRE", "NAME"), val: d.en, max: 40, count: `${d.en.length}/40`, help: E2("Si lo dejas vacío, en inglés se ve el nombre en español.", "If empty, the Spanish name shows in English."), onChange: (v) => F.set({ en: v }) });
  out.push({ type: "group", k: E2("EN TU MENÚ", "ON YOUR MENU") }, ...avB(c, { d: { avail: d.avail, av: d.av }, set: (p) => F.set(p) }, null),
    { type: "rows", items: [{ icon: "store", t: E2("Se ve en tu página", "Shows on your page"), s: E2("Apagada, sus platos no se ven ni se piden. No se borran.", "Off, its items are hidden and cannot be ordered. Nothing is deleted."), tgOn: d.visible, onTg: () => F.set({ visible: !d.visible }) }] });
  if (s0) out.push({ type: "rows", k: E2(`SUS PLATOS · ${its.length}`, `ITS ITEMS · ${its.length}`), link: its.length ? E2("Agregar plato", "Add item") : undefined, onLink: () => { c.setUi({ mNewCat: s0.id, mMore: false }); c.det("item:new"); },
    items: its.length ? its.map((i) => ({ key: i.id, ...img(i), imgW: "40px", compact: true, t: i.name.es, s: fp(i.cents) + (i.ago ? E2(" · agotado", " · sold out") : ""), onClick: () => c.det(`item:${i.id}`) }))
      : [{ icon: "plus", t: E2("Agregar el primer plato", "Add the first item"), s: E2("Sin platos no sale en tu menú.", "Without items it does not show on your menu."), onClick: () => { c.setUi({ mNewCat: s0.id, mMore: false }); c.det("item:new"); } }] });
  const nm2 = d.name.trim(), dupe = M.sections.some((s) => s.name.es.toLowerCase() === nm2.toLowerCase() && s.id !== key), noDay = d.avail === "own" && !!d.av && !d.av.d.length, valid = nm2.length >= 2 && !dupe && !noDay;
  if (dupe) out.push({ type: "note", tone: "warn", t: E2("Ya tienes una categoría con ese nombre.", "You already have a category with that name.") });
  const others = M.sections.filter((s) => s.id !== key), nI = its.length, askDel = !isNew && ui.mCDel === key, to: string = ui.mCTo && others.some((s) => s.id === ui.mCTo) ? ui.mCTo : others[0]?.id ?? "", stuck = nI > 0 && !others.length;
  if (askDel) { if (stuck) out.push({ type: "note", tone: "danger", icon: "trash", t: E2("Es tu única categoría y tiene platos. Crea otra primero para pasarlos ahí.", "It is your only category and it has items. Create another one first to move them there.") });
    else { out.push({ type: "note", tone: "danger", icon: "trash", t: nI ? E2(`¿Quitar «${s0!.name.es}»? Sus ${nI} ${nI === 1 ? "plato pasa a:" : "platos pasan a:"}`, `Remove “${s0!.name.es}”? Its ${nI} ${nI === 1 ? "item moves to:" : "items move to:"}`) : E2(`¿Quitar «${s0!.name.es}»? No tiene platos.`, `Remove “${s0!.name.es}”? It has no items.`) });
      if (nI) out.push({ type: "chips", items: others.map((s) => ({ l: s.name.es, v: to === s.id ? "selected" : "filter", onClick: () => c.setUi({ mCTo: s.id }) })) }); } }
  const toN = others.find((s) => s.id === to)?.name.es ?? "";
  const extra = isNew ? [] : askDel ? [...(stuck ? [] : [{ l: nI ? E2("Sí, quitar y pasar", "Yes, remove and move") : E2("Sí, quitar", "Yes, remove"), v: "danger", icon: "trash", onClick: () => c.run(() => categoriaQuitar(c.d.id, key, nI ? to : null), nI ? E2(`Categoría quitada. Sus ${nI} ${nI === 1 ? "plato pasó" : "platos pasaron"} a ${toN}.`, `Category removed. Its ${nI} ${nI === 1 ? "item moved" : "items moved"} to ${toN}.`) : E2("Categoría quitada.", "Category removed."), () => { c.setUi({ mCDel: null, mCTo: null }); back(); }) }]), { l: E2("Cancelar", "Cancel"), v: "soft", onClick: () => c.setUi({ mCDel: null }) }]
    : [{ l: E2("Quitar categoría", "Remove category"), icon: "trash", onClick: () => c.setUi({ mCDel: key, mCTo: null }) }];
  return { blocks: out, tail: extra.length ? [{ type: "acts", items: extra }] : [],
    ed: { F, l: isNew ? E2("Crear categoría", "Create category") : E2("Guardar", "Save"), valid, always: isNew, apply: (x) => categoriaGuardar(c.d.id, key, x), onDone: back } };
}

function grpDet(c: Ctx, key: string): Sec {
  const { E2, ui, es } = c, M = N(c), isNew = key === "new", g0 = M.groups.find((g) => g.id === key);
  const back = () => c.closeDet();
  if (!g0 && !isNew) return { blocks: [{ type: "head", t: E2("Ese grupo ya no existe", "That group no longer exists"), onBack: back }], ed: null };
  type O = { es: string; en: string; p: string; on: boolean };
  const F = c.form<{ es: string; en: string; req: boolean; max: number; o: O[]; use: string[] }>(`det:mg:${key}`, g0 ? { es: g0.name.es, en: g0.name.en, req: g0.required, max: g0.max, o: g0.options.map((o) => ({ es: o.es, en: o.en, p: String(o.cents / 100), on: o.on })), use: usos(M, key).map((i) => i.id) }
    : { es: "", en: "", req: true, max: 1, o: [{ es: "", en: "", p: "0", on: true }], use: [] }), d = F.d, setF = F.set;
  const sel: number | null = ui.mopt && ui.mopt.k === key ? ui.mopt.i : isNew && !ui.mopt ? 0 : null, setO = (i: number, p: Partial<O>) => setF({ o: d.o.map((o, j) => (j === i ? { ...o, ...p } : o)) });
  const nO = d.o.filter((o) => o.es.trim()).length, mx = d.max || 1, out: (Bloque | null)[] = [];
  const addO = () => { setF({ o: [...d.o, { es: "", en: "", p: "0", on: true }] }); c.setUi({ mopt: { k: key, i: d.o.length } }); };
  const swap = (i: number, j: number) => { const a = d.o.slice(); [a[i], a[j]] = [a[j]!, a[i]!]; setF({ o: a }); c.setUi({ mopt: { k: key, i: j } }); };
  out.push({ type: "head", eye: E2("MENÚ · OPCIONES", "MENU · OPTIONS"), t: isNew ? E2("Nuevo grupo de opciones", "New option group") : g0!.name.es, onBack: back });
  out.push({ type: "gprev", k: E2("ASÍ LO VE EL CLIENTE", "HOW THE CLIENT SEES IT"), title: (es ? d.es : d.en || d.es) || E2("Nombre del grupo", "Group name"), meta: d.req ? (mx > 1 ? E2(`Elige hasta ${mx}`, `Pick up to ${mx}`) : E2("Elige 1", "Pick 1")) : E2(`Opcional · hasta ${mx}`, `Optional · up to ${mx}`),
    req: d.req, reqL: E2("OBLIGATORIO", "REQUIRED"), multi: mx > 1, options: d.o.filter((o) => o.es).map((o) => ({ label: (es ? o.es : o.en || o.es) + (o.on ? "" : E2(" · agotada", " · sold out")), price: parseFloat(o.p) ? `+${fp(Math.round(parseFloat(o.p) * 100))}` : "", disabled: !o.on })) });
  out.push({ type: "field", k: E2("NOMBRE DEL GRUPO", "GROUP NAME"), val: d.es, max: 40, count: `${d.es.length}/40`, ph: E2("Ej. Elige la carne, Tamaño, Agrégale", "e.g. Choose the meat, Size, Add-ons"), onChange: (v) => setF({ es: v }) });
  out.push({ type: "group", k: E2("REGLAS", "RULES") }, { type: "rows", items: [{ icon: "check", t: E2("Obligatorio", "Required"), s: d.req ? E2("Tiene que elegir antes de agregar el plato.", "They must choose before adding the item.") : E2("Puede agregar el plato sin elegir.", "They can add the item without choosing."), tgOn: d.req, onTg: () => setF({ req: !d.req }) }] },
    { type: "step", t: E2("Puede elegir hasta", "Can pick up to"), s: mx > 1 ? E2("Casillas: marca varias.", "Checkboxes: pick several.") : E2("Círculos: elige una sola.", "Circles: pick only one."), v: E2(`${mx} de ${Math.max(1, nO)}`, `${mx} of ${Math.max(1, nO)}`), onM: () => setF({ max: Math.max(1, mx - 1) }), onP: () => setF({ max: Math.min(Math.max(1, nO), mx + 1) }) });
  out.push({ type: "group", k: E2(`OPCIONES · ${nO}`, `OPTIONS · ${nO}`), link: E2("Agregar opción", "Add option"), onLink: addO });
  d.o.forEach((o, i) => { const open = sel === i;
    out.push({ type: "rows", items: [{ key: `o${i}`, compact: true, t: o.es || E2("Opción sin nombre", "Unnamed option"), tFg: o.es ? undefined : "rgba(11,14,18,.45)", r: parseFloat(o.p) ? `+${fp(Math.round(parseFloat(o.p) * 100))}` : undefined, tgOn: o.on, onTg: () => setO(i, { on: !o.on }), onClick: () => c.setUi({ mopt: open ? { k: key, i: -1 } : { k: key, i } }), chev: false,
      ...(o.on ? {} : { m: E2("AGOTADA · NO SE PUEDE ELEGIR", "SOLD OUT · CANNOT BE PICKED"), mFg: "var(--tl-danger)" }), ...(open ? { bd: "1.5px solid var(--tl-ink)" } : {}) }] });
    if (open) {
      out.push({ type: "field", k: E2("OPCIÓN", "OPTION"), val: o.es, max: 40, ph: E2("Ej. Res guisada", "e.g. Stewed beef"), onChange: (v) => setO(i, { es: v.slice(0, 40) }) },
        { type: "field", k: E2("CUÁNTO SUMA AL PRECIO", "ADDS TO THE PRICE"), val: o.p, pre: "+$", im: "decimal", ph: "0", onChange: (v) => setO(i, { p: v.replace(/[^0-9.]/g, "").slice(0, 6) }) },
        { type: "field", k: E2("EN INGLÉS", "IN ENGLISH"), val: o.en, max: 40, ph: o.es, onChange: (v) => setO(i, { en: v.slice(0, 40) }) });
      out.push({ type: "acts", items: [{ l: E2("Listo", "Done"), v: "soft", icon: "check", onClick: () => c.setUi({ mopt: { k: key, i: -1 } }) }, ...(i === d.o.length - 1 && o.es.trim() ? [{ l: E2("Agregar otra", "Add another"), icon: "plus", onClick: addO }] : []),
        ...(i > 0 ? [{ l: E2("Subir", "Move up"), onClick: () => swap(i, i - 1) }] : []), ...(i < d.o.length - 1 ? [{ l: E2("Bajar", "Move down"), onClick: () => swap(i, i + 1) }] : []),
        ...(d.o.length > 1 ? [{ l: E2("Quitar", "Remove"), icon: "trash", onClick: () => { setF({ o: d.o.filter((_, j) => j !== i) }); c.setUi({ mopt: { k: key, i: -1 } }); } }] : [])] });
    } });
  out.push({ type: "group", k: E2("EN INGLÉS", "IN ENGLISH") }, { type: "field", k: E2("NOMBRE DEL GRUPO", "GROUP NAME"), val: d.en, max: 40, count: `${d.en.length}/40`, help: E2("Cada opción tiene su nombre en inglés al abrirla. Si lo dejas vacío, se ve en español.", "Each option has its English name when you open it. If empty, it shows in Spanish."), onChange: (v) => setF({ en: v }) });
  out.push({ type: "group", k: E2(`SE USA EN · ${d.use.length} ${d.use.length === 1 ? "PLATO" : "PLATOS"}`, `USED ON · ${d.use.length} ${d.use.length === 1 ? "ITEM" : "ITEMS"}`) });
  for (const s of M.sections) { const its = M.items.filter((i) => i.sec === s.id); if (!its.length) continue;
    out.push({ type: "chips", k: s.name.es.toUpperCase(), items: its.map((i) => { const on = d.use.includes(i.id); return { l: i.name.es, v: on ? "selected" : "filter", onClick: () => setF({ use: on ? d.use.filter((x) => x !== i.id) : [...d.use, i.id] }) }; }) }); }
  if (!d.use.length) out.push({ type: "note", tone: "info", t: E2("En ningún plato todavía: el cliente no lo ve.", "Not on any item yet: clients do not see it.") });
  const offN = d.o.filter((o) => o.es.trim() && !o.on).length;
  if (d.req && nO && offN === nO) out.push({ type: "note", tone: "danger", t: E2("Todas agotadas y es obligatorio: los platos que lo usan no se pueden pedir.", "All sold out and it is required: items using it cannot be ordered.") });
  else if (offN && d.use.length) out.push({ type: "note", tone: "warn", t: E2(`${offN} ${offN > 1 ? "agotadas: no se pueden elegir" : "agotada: no se puede elegir"} en los ${d.use.length} platos que usan este grupo.`, `${offN} sold out: cannot be picked on the ${d.use.length} items using this group.`) });
  const miss = [d.es.trim().length < 2 ? E2("nombre del grupo", "group name") : null, nO ? null : E2("al menos una opción con nombre", "at least one named option")].filter(Boolean), valid = !miss.length;
  if (miss.length && F.dirty) out.push({ type: "note", tone: "warn", t: E2(`Para guardar falta: ${miss.join(" · ")}.`, `To save, add: ${miss.join(" · ")}.`) });
  const askG = !isNew && ui.mGDel === key, nU = isNew ? 0 : usos(M, key).length;
  if (askG) out.push({ type: "note", tone: "danger", icon: "trash", t: nU ? E2(`¿Quitar «${g0!.name.es}»? Se quita de ${nU} ${nU === 1 ? "plato" : "platos"} y el cliente ya no lo elige. Los pedidos ya hechos no cambian.`, `Remove “${g0!.name.es}”? It comes off ${nU} ${nU === 1 ? "item" : "items"} and clients can no longer pick it. Past orders do not change.`) : E2(`¿Quitar «${g0!.name.es}»? No se usa en ningún plato.`, `Remove “${g0!.name.es}”? It is not used on any item.`) });
  const extra = isNew ? [] : askG ? [{ l: E2("Sí, quitar", "Yes, remove"), v: "danger", icon: "trash", onClick: () => { c.setUi({ mGDel: null }); c.run(() => grupoQuitar(c.d.id, key), E2("Grupo quitado de tu menú.", "Group removed from your menu."), back); } }, { l: E2("Cancelar", "Cancel"), v: "soft", onClick: () => c.setUi({ mGDel: null }) }]
    : [{ l: E2("Duplicar", "Duplicate"), onClick: () => c.run(() => grupoDuplicar(c.d.id, key), E2("Copia creada, sin platos. Cámbiale el nombre y elige dónde se usa.", "Copy created, on no items. Rename it and pick where it is used."), (r) => r.id && c.det(`mgrp:${r.id}`)) }, { l: E2("Quitar grupo", "Remove group"), icon: "trash", onClick: () => c.setUi({ mGDel: key }) }];
  return { blocks: out, tail: extra.length ? [{ type: "acts", items: extra }] : [],
    ed: { F, l: isNew ? E2("Crear grupo", "Create group") : E2("Guardar", "Save"), valid, always: isNew, apply: (x) => grupoGuardar(c.d.id, key, x), onDone: () => { c.setUi({ mopt: null }); back(); } } };
}
