/* 6a · Eventos: lo común al cliente y al servidor (fase6-eventos.md §4 6a; prototipo TLEvP en dash2-evt.js y evEdit / evMiss del
   Panel v2). El formato (noche · comida · clase · fe · comunidad) vive en la base (event_formats) y llega aquí como FormatoEvt: el
   editor muestra solo sus campos y sus palabras, y el servidor valida con las mismas reglas (faltaEvt) antes de guardar. Nada de
   esto decide: el servidor vuelve a revisar todo (lib/evt.ts). Dinero en centavos; horas en minutos desde la medianoche local
   (la 1 AM de una fiesta que empieza a las 10 PM = 1500). */
export type Bi = { es: string; en: string };
export type FormatoKey = "noche" | "comida" | "clase" | "fe" | "comunidad";
export type Entrada = "free" | "rsvp" | "tickets";
export type EstadoEvt = "draft" | "review" | "changes" | "live" | "paused" | "cancelled" | "rejected" | "done";
export type FormatoEvt = {
  key: FormatoKey; label: Bi; sub: Bi; icon: string; dark: boolean; ages: number[];
  /* 6j · false = el Super Admin lo apagó (Catálogo): no se ofrece para crear, pero los eventos que ya lo tienen se siguen editando. */
  ofrece?: boolean;
  f: {
    entry: Entrada; age0: number; mesas: boolean; adds: boolean; gen: boolean; dress: boolean; party: boolean; kids: "fam" | "care" | null; payAt: boolean;
    h0: number; len: number; dr: 0 | 30 | 60; luL: Bi; luWho: Bi; luRole: Bi; tkL: Bi; cntL: Bi; tk1: Bi; tixL: Bi; freeL: Bi; galL: Bi; cta: Bi; tk0: Bi; p0: number; c0: number; ph: Bi;
  };
};
/* 6f · dy: «Vale para» un día de un evento de varios días (0 = el primero); null o ausente = pase de todos los días. */
export type Boleto = { id: string; n: Bi; s: Bi; p: number; cap: number; off: boolean; dy?: number | null };
export type Mesa = { id: string; z: Bi; seats: number; min: number; dep: number; cap: number };
export type ExtraKind = "detalle" | "material" | "servicio" | "otro";
export type Extra = { id: string; n: Bi; s: Bi; p: number; kind: ExtraKind; mesa: boolean };
export type Linea = { h: number; who: string; role: Bi; dy?: number };
/* 6f · Se repite (TLEvP.occ): k none | w (cada semana) | 2w (cada 2 semanas) | m (el mismo día de cada mes, o «el último»); days: los días de
   la semana (0 = domingo; el de la primera fecha va siempre); n: cuántas fechas; skip: las fechas saltadas (YYYY-MM-DD). */
export type Repite = { k: "none" | "w" | "2w" | "m"; days: number[]; n: number; skip: string[] };
export type HorarioDia = { h0: number; h1: number };
export type Foto = { id: string; url: string };
export type BorradorEvt = {
  fmt: FormatoKey; ti: Bi; desc: Bi; fotos: Foto[];
  dia: string; h0: number; h1: number; puertas: 0 | 30 | 60;
  donde: "own" | "other"; lugar: string; dir: string; cp: string;
  entrada: Entrada; cupo: number; personas: number; contar: boolean;
  boletos: Boleto[]; mesas: Mesa[]; extras: Extra[]; maxP: number; hasta: "start" | "doors" | "day_before";
  lu: Linea[]; gen: string[]; edad: number; pideId: boolean; vest: Bi; ninos: boolean; comidaLocal: boolean; antes: Bi[];
  /* 6f · Duración: una fecha, una serie (rep) o varios días seguidos (span 2–30, con horario por día dh y aforo por día dcap). */
  rep: Repite; span: number; dh: HorarioDia[] | null; dcap: number;
};

/* Límites que la base también impone (0106): nombres, textos, cuántos de cada cosa. */
export const LIM = { titulo: 70, desc: 400, lugar: 60, dir: 100, boletoN: 40, boletoS: 80, mesaZ: 40, extraN: 40, extraS: 80, quien: 60, rol: 60, vest: 80, antes: 120, antesN: 4, lu: 8, gen: 3, boletos: 6, boletosDias: 16, mesas: 12, extras: 12, luDias: 16, diasMax: 30 } as const;
export const EXTRA_KINDS: ExtraKind[] = ["detalle", "material", "servicio", "otro"];
export const EXTRA_KIND_L: Record<ExtraKind, Bi> = { detalle: { es: "Detalle", en: "Special touch" }, material: { es: "Material", en: "Materials" }, servicio: { es: "Servicio", en: "Service" }, otro: { es: "Otro", en: "Other" } };
/* La app no vende alcohol, botellas ni hookah (fase4-noche L66/L108; fase6 §3 y §6 #4). La misma lista la impone la base (evt_extras_ok). */
export const ALCOHOL = /(botell|bottle|hookah|huka|cachimba|narguil|trago|shot|cerveza|beer|licor|liquor|whisk|vodka|tequila|ron |rum |brandy|champ[aá]n|champagne|vino|wine|alcohol|cubeta|bucket|open bar|barra libre)/;
export const esAlcohol = (x: Extra) => ALCOHOL.test(`${x.n.es} ${x.n.en} ${x.s.es} ${x.s.en}`.toLowerCase());
/* Lo que importa: cambiarlo en un evento publicado de un organizador sin verificar vuelve a revisión (la versión anterior sigue en vivo). */
export const IMPORTA = ["dia", "h0", "h1", "puertas", "donde", "lugar", "dir", "cp", "edad", "entrada", "boletos", "mesas", "extras", "rep", "span", "dh", "dcap"] as const;

const t = (x: string | undefined | null) => (x ?? "").trim();
export const bi = (x: Bi, es: boolean) => (es ? x.es : t(x.en) || x.es);

/* Hora: 1320 → «10 PM», 1530 → «1:30 AM». */
export function hora(m: number) {
  const x = ((m % 1440) + 1440) % 1440, h = Math.floor(x / 60), mm = x % 60;
  return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}
/* «sáb 14 nov» / «Sat Nov 14» desde YYYY-MM-DD (fecha local de la ciudad, sin zona). */
const DS: [string, string][] = [["dom", "Sun"], ["lun", "Mon"], ["mar", "Tue"], ["mié", "Wed"], ["jue", "Thu"], ["vie", "Fri"], ["sáb", "Sat"]];
const MS: [string, string][] = [["ene", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["abr", "Apr"], ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["ago", "Aug"], ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dic", "Dec"]];
export function diaCorto(iso: string, es: boolean) {
  const [y, m, d] = iso.split("-").map(Number); const w = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  return es ? `${DS[w]![0]} ${d} ${MS[m! - 1]![0]}` : `${DS[w]![1]} ${MS[m! - 1]![1]} ${d}`;
}
export const mesCorto = (iso: string, es: boolean) => { const m = Number(iso.slice(5, 7)); return (es ? MS[m - 1]![0] : MS[m - 1]![1]).toUpperCase(); };
export const dinero = (c: number) => { const p = (Number(c) || 0) / 100; return "$" + (p % 1 ? p.toFixed(2) : String(p)); };
export const sumarDias = (iso: string, n: number) => { const [y, m, d] = iso.split("-").map(Number); const x = new Date(Date.UTC(y!, m! - 1, d! + n)); return x.toISOString().slice(0, 10); };

/* Un evento nuevo de un formato (TLEvP.fresh): el día es pasado mañana en la ciudad. */
export function nuevoBorrador(F: FormatoEvt, hoyIso: string): BorradorEvt {
  return {
    fmt: F.key, ti: { es: "", en: "" }, desc: { es: "", en: "" }, fotos: [], dia: sumarDias(hoyIso, 2), h0: F.f.h0, h1: F.f.h0 + F.f.len, puertas: F.f.dr,
    donde: "own", lugar: "", dir: "", cp: "", entrada: F.f.entry, cupo: 0, personas: F.f.party ? 6 : 1, contar: false,
    boletos: F.f.entry === "tickets" ? [{ id: "t1", n: { ...F.f.tk0 }, s: { es: "", en: "" }, p: F.f.p0, cap: F.f.c0, off: false }] : [], mesas: [], extras: [], maxP: 0, hasta: "start",
    lu: [], gen: [], edad: F.f.age0, pideId: F.f.age0 > 0, vest: { es: "", en: "" }, ninos: F.f.kids === "care", comidaLocal: F.f.payAt, antes: [],
    rep: { k: "none", days: [], n: 8, skip: [] }, span: 1, dh: null, dcap: 0,
  };
}

/* «Para guardar falta:» (evMiss) — lo mismo que exige el servidor para enviar a revisión. Un borrador se guarda con nombre y fecha. */
export function faltaEvt(d: BorradorEvt, F: FormatoEvt, o: { enviar: boolean }): Bi[] {
  const m: Bi[] = [];
  if (t(d.ti.es).length < 3) m.push({ es: "el nombre", en: "the name" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dia)) m.push({ es: "el día", en: "the day" });
  if (!o.enviar) return m;
  if (!d.fotos.length) m.push({ es: "el cartel", en: "the poster" });
  if (d.donde === "other" && (t(d.lugar).length < 2 || t(d.dir).length < 4)) m.push({ es: "el lugar y la dirección", en: "the place and address" });
  // 6b · El código postal del otro lugar: con él se ubica en el mapa (geocodificador propio) y se mide la distancia.
  if (d.donde === "other" && !/^\d{5}$/.test(t(d.cp))) m.push({ es: "el código postal del lugar", en: "the venue ZIP code" });
  if (d.entrada === "tickets") {
    if (!d.boletos.length || d.boletos.some((b) => !t(b.n.es) || !(b.p >= 100) || !(b.cap > 0))) m.push({ es: `nombre, precio y cantidad de cada ${F.f.tk1.es.toLowerCase()}`, en: `name, price and quantity for each ${F.f.tk1.en.toLowerCase()}` });
    if (F.f.mesas && d.mesas.some((x) => !t(x.z.es))) m.push({ es: "la zona de cada mesa", en: "the area of each table" });
    if (F.f.adds && d.extras.some((x) => !t(x.n.es))) m.push({ es: "el nombre de cada extra", en: "the name of each extra" });
  }
  if (d.lu.some((l) => !t(l.who))) m.push({ es: `quién o qué en cada línea del ${F.f.luL.es.toLowerCase()}`, en: `who or what on each line of the ${F.f.luL.en.toLowerCase()}` });
  return m;
}

/* Lo que cambió y vuelve a revisión (comparar con lo publicado). Saltar una fecha de la serie no es un cambio que importa (se hace desde
   la ficha, sin revisión: quita una fecha sin gente). */
export function cambiosQueImportan(a: BorradorEvt, b: BorradorEvt): string[] {
  const v = (d: BorradorEvt, k: (typeof IMPORTA)[number]) => JSON.stringify(k === "rep" ? { ...(d.rep ?? {}), skip: [] } : d[k] ?? null);
  return IMPORTA.filter((k) => v(a, k) !== v(b, k));
}

/* ── 6f · Series y varios días (TLEvP.occ / repL / spanL / dayH). La base genera las fechas de verdad (evt_generar_fechas en 0111): esto
   es la misma regla para mostrarla en el editor y en las pantallas. ── */
const DN: [string, string][] = [["domingo", "Sunday"], ["lunes", "Monday"], ["martes", "Tuesday"], ["miércoles", "Wednesday"], ["jueves", "Thursday"], ["viernes", "Friday"], ["sábado", "Saturday"]];
const NTH: [string, string][] = [["primer", "first"], ["segundo", "second"], ["tercer", "third"], ["cuarto", "fourth"]];
export const dowDe = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay(); };
const diasMes = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
/* El «n-ésimo» día de la semana del mes (1–4) o 5 = el último (si la fecha es la última de su mes desde la cuarta). */
export function nthDe(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number), n = Math.ceil(d! / 7);
  return d! + 7 > diasMes(y!, m! - 1) && n >= 4 ? 5 : Math.min(4, n);
}
export const diasDeRegla = (dia: string, r: Repite) => [...new Set([...(r.days ?? []), dowDe(dia)])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
/* Los días de la regla desde la primera fecha, hasta n y hasta `hasta` (incluido). La misma regla que evt_generar_fechas. */
export function fechasSerie(dia: string, r: Repite, n: number, hasta: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || r.k === "none") return dia ? [dia] : [];
  const out: string[] = [];
  if (r.k === "m") {
    const [y, m] = dia.split("-").map(Number), dw = dowDe(dia), nth = nthDe(dia);
    for (let i = 0; i < n; i++) {
      const yy = y! + Math.floor((m! - 1 + i) / 12), mm = (m! - 1 + i) % 12, dim = diasMes(yy, mm), first = new Date(Date.UTC(yy, mm, 1)).getUTCDay();
      const dd = nth === 5 ? dim - ((new Date(Date.UTC(yy, mm, dim)).getUTCDay() - dw + 7) % 7) : 1 + ((dw - first + 7) % 7) + (nth - 1) * 7;
      if (dd > dim) continue;
      const x = `${yy}-${String(mm + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      if (x < dia) continue;
      if (x > hasta) break;
      out.push(x);
    }
    return out;
  }
  const step = r.k === "2w" ? 2 : 1, D = diasDeRegla(dia, r), ws = sumarDias(dia, -dowDe(dia));
  for (let x = dia; out.length < n && x <= hasta; x = sumarDias(x, 1)) {
    const sem = Math.floor((Date.parse(`${x}T00:00:00Z`) - Date.parse(`${ws}T00:00:00Z`)) / 864e5 / 7);
    if (D.includes(dowDe(x)) && sem % step === 0) out.push(x);
  }
  return out;
}
const juntar = (a: string[], es: boolean) => (a.length > 1 ? `${a.slice(0, -1).join(", ")}${es ? " y " : " and "}${a[a.length - 1]}` : a[0] ?? "");
/* «Cada jueves y sábado» · «Cada 2 semanas · jueves» · «El último viernes de cada mes». */
export function repL(dia: string, r: Repite | null | undefined, es: boolean): string {
  if (!r || r.k === "none" || !dia) return "";
  if (r.k === "m") { const n = nthDe(dia), d = DN[dowDe(dia)]!; return es ? `El ${n === 5 ? "último" : NTH[n - 1]![0]} ${d[0]} de cada mes` : `The ${n === 5 ? "last" : NTH[n - 1]![1]} ${d[1]} of every month`; }
  const ds = juntar(diasDeRegla(dia, r).map((i) => DN[i]![es ? 0 : 1]!), es);
  return r.k === "w" ? (es ? `Cada ${ds}` : `Every ${ds}`) : es ? `Cada 2 semanas · ${ds}` : `Every 2 weeks · ${ds}`;
}
/* «vie 20 nov – dom 22 nov». */
export const spanL = (dia: string, span: number, es: boolean) => `${diaCorto(dia, es)} – ${diaCorto(sumarDias(dia, Math.max(1, span) - 1), es)}`;
export const horarioDia = (d: Pick<BorradorEvt, "h0" | "h1" | "dh">, j: number): HorarioDia => (j > 0 && d.dh?.[j] ? d.dh[j]! : { h0: d.h0, h1: d.h1 });
/* «Vale solo el sáb 21 nov» / «Vale los 3 días · entras una vez cada día». */
export function valeL(dy: number | null | undefined, dia: string, span: number, es: boolean): string {
  if (span < 2) return "";
  return dy == null ? (es ? `Vale los ${span} días · entras una vez cada día` : `Valid all ${span} days · one entry per day`) : es ? `Vale solo el ${diaCorto(sumarDias(dia, dy), true)}` : `Valid only on ${diaCorto(sumarDias(dia, dy), false)}`;
}

/* Estado para el negocio (evTag): la etiqueta y su tono. */
export function etiquetaEvt(e: { status: EstadoEvt; hidden: boolean; pending: "review" | "changes" | "rejected" | null; hoy: boolean }, es: boolean): [string, string] {
  const E2 = (a: string, b: string) => (es ? a : b);
  if (e.hidden) return [E2("OCULTO POR TO’LATINO", "HIDDEN BY TO’LATINO"), "danger"];
  if (e.status === "cancelled") return [E2("CANCELADO", "CANCELLED"), "danger"];
  if (e.status === "rejected") return [E2("NO APROBADO", "NOT APPROVED"), "danger"];
  if (e.status === "review") return [E2("EN REVISIÓN", "UNDER REVIEW"), "action"];
  if (e.status === "changes") return [E2("CAMBIOS PEDIDOS", "CHANGES REQUESTED"), "neutral"];
  if (e.status === "draft") return [E2("BORRADOR", "DRAFT"), "neutral"];
  if (e.status === "done") return [E2("TERMINÓ", "ENDED"), "neutral"];
  if (e.pending === "review") return [E2("CAMBIO EN REVISIÓN", "CHANGE UNDER REVIEW"), "action"];
  if (e.status === "paused") return [E2("VENTA PAUSADA", "SALES PAUSED"), "neutral"];
  if (e.hoy) return [E2("HOY", "TODAY"), "action"];
  return [E2("PUBLICADO", "LIVE"), "signal"];
}

/* Motivos para no aprobar o pedir cambios (adm-data.js TPL.evtNo) + «otro» con nota. */
export const EVT_NO: { k: string; es: string; en: string }[] = [
  { k: "edad", es: "Falta la edad mínima", en: "Minimum age is missing" },
  { k: "aforo", es: "La capacidad supera el aforo del local", en: "Capacity exceeds the venue limit" },
  { k: "promesa", es: "La descripción promete algo que no se puede garantizar", en: "The description promises something that cannot be guaranteed" },
  { k: "foto", es: "La foto no corresponde al evento", en: "The photo does not match the event" },
  { k: "otro", es: "Otro motivo", en: "Other reason" },
];

/* 6j · Las señales de Eventos para Confianza › Fraude (evt_senales): cómo se nombran. */
export const SENAL_L_UI: Record<string, { t: string; s: (n: number) => string }> = {
  rafaga: { t: "Órdenes en ráfaga", s: (n) => `${n} ${n === 1 ? "orden" : "órdenes"} desde un dispositivo que compró muchas veces en minutos` },
  cadena: { t: "Transferencias en cadena", s: (n) => `${n} ${n === 1 ? "boleto recibido y pasado" : "boletos recibidos y pasados"} a otra persona` },
  duplicado: { t: "Entró dos veces", s: (n) => `${n} ${n === 1 ? "entrada duplicada" : "entradas duplicadas"} en la puerta (sin conexión)` },
  contracargo: { t: "Contracargos de boletos", s: (n) => `${n} ${n === 1 ? "contracargo" : "contracargos"} en 90 días` },
};
