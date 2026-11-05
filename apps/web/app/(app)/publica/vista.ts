/* «Tu página en vivo» (pieza BusinessPreview): se arma con lo que la persona llena. Llevado de pvOf() del diseño; la
   ciudad, el día de hoy y la fecha de «en To'Latino desde» son los reales. Pura. */
import { ahora, cap, DAYS, daysOf, derive, F, fmt, items, metaOf, money, needZone, opOf, priceL, status, subL, X, zoneOf, type Borrador } from "./logica";

const MESES = [["ene", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["abr", "Apr"], ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["ago", "Aug"], ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dic", "Dec"]];

export function vista(d: Borrador, es: boolean, o: { ciudad: string; usuario: { nombre: string; primero: string } | null; foto: (id: string, h: number) => string }) {
  const E2 = (a: string, b: string) => (es ? a : b), CIU = o.ciudad.toUpperCase();
  const k = d.cat ? X.cat(d.cat) : null, c = d.cat ? X.CFG[d.cat] : null, f = F(d);
  const name = (d.name || "").trim(), nameOr = name || E2("Tu negocio", "Your business");
  const ini = nameOr.split(/\s+/).filter((w) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(w[0] || "")).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "TL";
  const catL = k ? (es ? k[1] : k[2]) : E2("Tu categoría", "Your category"), subs = (d.subs || []).map((x) => subL(d.cat, x, es));
  const t = ahora(), days = daysOf(d), stt = status(d, es, days, t), op = opOf(d), zone = zoneOf(d);
  const dv = derive(d), mods = (dv.mods || {}) as Record<string, unknown>, its = d.cat ? items(d) : [];
  const sellS = f ? cap(E2(f.sell.t[0], f.sell.t[1]).replace(/^(Tus?|Tu|Your)\s+/i, "")) : E2("Servicios", "Services");
  const lista = its.map((it) => ({ name: it.n[es ? 0 : 1], meta: metaOf(it, false, es), price: priceL(it, es) }));
  const nums = its.filter((it) => !["gratis", "don"].includes(it.u) && Number(it.p) > 0).map((it) => Number(it.p)), chips: { l: string; v: string }[] = [];
  if (nums.length) chips.push({ l: E2("Desde ", "From ") + money(Math.min(...nums)), v: "slot" });
  if (needZone(op)) chips.push({ l: E2("A domicilio · ", "Comes to you · ") + zone + " mi", v: "feature" });
  if (d.cita) chips.push({ l: E2("SOLO CITA", "APPT ONLY"), v: "feature" });
  const im = X.mainMod ? X.mainMod(d.cat) : "svc", tabs: { id: string; label: string; icon: string; kind?: string }[] = [{ id: "res", label: E2("Resumen", "Overview"), icon: "grid" }];
  if (lista.length) tabs.push({ id: im, label: sellS, icon: (X.MOD[im] || [])[2] || "grid", kind: "items" });
  const amenAll = ((c && c.amen) || []).concat(X.AMEN || []);
  const amen = ((dv.amen || []) as string[]).map((a) => amenAll.find((x: string[]) => x[1] === a)).filter(Boolean).map((a: string[]) => ({ icon: a[0], l: es ? a[1] : a[2] }));
  const how = mods.citas ? E2("Pides hora en la app y te confirman.", "Request a time in the app and they confirm.") : mods.pedidos ? E2("Pides en la app; te avisan cuando lo aceptan.", "Order in the app; you hear back when they accept.") : mods.rsv ? E2("Pides mesa en la app; te confirman.", "Request a table in the app; they confirm.") : mods.cot ? E2("Pides cotización con fotos; te responden con el total.", "Ask for a quote with photos; they reply with the total.") : E2("Llama o escribe para pedir.", "Call or message to order.");
  const hours = days.map((x, i) => { const t1 = x.on ? fmt(x.a) + " – " + fmt(x.b) : E2("Cerrado", "Closed"), sx = d.cita && x.on ? E2(" · con cita", " · by appt.") : ""; return { d: es ? DAYS[i]![2] : DAYS[i]![3], hp: t1 + sx, hf: t1 + sx, fw: i === t.hoy ? "800" : "600", fg: i === t.hoy ? "var(--tl-ink)" : "rgba(11,14,18,.65)" }; });
  const street = String(d.addr || "").replace(/^\d+\s*/, ""), tdy = days[t.hoy]!;
  const addr = op === "casa" ? E2("Va a domicilio · hasta ", "Comes to you · up to ") + zone + E2(" millas", " miles") : op === "home" ? `${street || E2("Tu calle", "Your street")}, ${o.ciudad} PA` : d.addr ? `${d.addr}, ${o.ciudad} PA` : E2("Tu dirección", "Your address");
  const addrMeta = op === "home" ? E2("DIRECCIÓN EXACTA AL CONFIRMAR", "EXACT ADDRESS ON CONFIRMATION") : op === "rento" && d.joinName ? (E2("DENTRO DE ", "INSIDE ") + d.joinName).toUpperCase() : op === "truck" ? E2("CAMIÓN · CAMBIA DE LUGAR", "TRUCK · MOVES AROUND") : op === "ambos" ? E2("TAMBIÉN VA A DOMICILIO · ", "ALSO COMES TO YOU · ") + zone + " MI" : String(d.ref || "").toUpperCase();
  const lic = (dv.tool as { lic?: unknown[] })?.lic?.length;
  const hoy = new Date(), mes = MESES[hoy.getMonth()]!, diaN = es ? DAYS[t.hoy]![2].toUpperCase() : DAYS[t.hoy]![3].toUpperCase();
  return {
    name, nameOr, logoBg: "", logoC: "var(--tl-ink)", logoTxt: ini, logoIni: ini.slice(0, 1),
    cover: d.cover ? `url("${o.foto(d.cover, 500)}")` : "", noCover: !d.cover,
    meta: `${subs.length ? subs.slice(0, 2).join(" · ") : catL} · ${op === "casa" ? E2("A DOMICILIO", "MOBILE") : CIU}`.toUpperCase(), metaFree: `${catL} · ${CIU}`.toUpperCase(), subsLine: subs.length ? subs.join(" · ") : catL,
    r: E2("Nuevo · en To'Latino", "New · on To'Latino"), s1: E2("Nuevo", "New"), s1Sub: "EN TO'LATINO", status: stt.s, stLabel: stt.l, stNote: stt.n, stColor: stt.c, stDot: stt.dot,
    dist: op === "casa" ? zone + " MI" : street ? street.split(" ").slice(0, 2).join(" ") : o.ciudad, city: op === "casa" ? E2("A DOMICILIO", "MOBILE") : CIU,
    cta: c ? E2(c.cta[0], c.cta[1]) : "Booking", ctaIc: c ? c.cta[2] : "calendar", chips, hasChips: chips.length > 0, tabs, items: lista, itemsT: sellS, about: "", hasAbout: false, hasOwner: true,
    oc: { name: o.usuario?.nombre || E2("Tu nombre", "Your name"), role: E2("La persona detrás", "The person behind it"), nick: o.usuario?.primero || "", about: "", teamLabel: E2("SU EQUIPO", "THE TEAM") },
    trust: [{ icon: "phone", label: E2("Teléfono verificado", "Verified phone"), tone: "ok" }].concat(lic ? [{ icon: "shield", label: E2("Licencias en revisión", "Licenses in review"), tone: "wait" }] : []).concat([{ icon: "calendar", label: E2(`En To'Latino desde ${mes[0]} ${hoy.getFullYear()}`, `On To'Latino since ${mes[1]} ${hoy.getFullYear()}`), tone: "info" }]),
    tc: { eyebrow: `${E2("HOY · ", "TODAY · ")}${diaN} ${hoy.getDate()} ${(es ? mes[0] : mes[1])!.toUpperCase()}`, title: stt.s, dot: stt.dot, sub: how, cols: [{ k: E2("HOY", "TODAY"), v: tdy.on ? fmt(tdy.a) + " – " + fmt(tdy.b) : E2("Cerrado", "Closed") }, { k: E2("PAGO", "PAYMENT"), v: E2("En el local", "In person") }, { k: E2("IDIOMA", "LANGUAGE"), v: E2("Español", "Spanish") }] },
    hours, sched: [], amen, hasAmen: amen.length > 0, addr, addrMeta, isZone: needZone(op), zoneD: Math.min(128, 36 + zone * 3) + "px", staff: [],
    photos: [d.cover].concat(d.gallery || []).filter(Boolean).map((p) => `url("${o.foto(p as string, 300)}")`), freePhotos: X.FREE_PHOTOS || 3, line: "", hasLine: false, sealPend: false,
    lbl: { blockPro: E2("EN RESULTADOS · DESTACADOS", "IN RESULTS · FEATURED"), blockFree: E2(`EN RESULTADOS · TAMBIÉN EN ${CIU}`, `IN RESULTS · ALSO IN ${CIU}`), call: E2("Llamar", "Call"), coverHere: E2("TU PORTADA VA AQUÍ", "YOUR COVER GOES HERE"), photos: E2("Fotos", "Photos"), hours: E2("Horario", "Hours"), map: op === "casa" ? E2("Zona de servicio", "Service area") : E2("Cómo llegar", "Directions"), about: E2("Quiénes somos", "About us"), team: E2("Equipo", "Team"), holi: E2("FERIADO", "HOLIDAY"), freeCap: E2("FREE MUESTRA 5 · TIENES ", "FREE SHOWS 5 · YOU HAVE ") + lista.length, sealPend: E2("SELLO EN REVISIÓN", "BADGE IN REVIEW") },
  };
}
