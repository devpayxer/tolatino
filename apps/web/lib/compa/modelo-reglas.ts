import "server-only";
import type { Lang, TrozoModelo } from "./modelo";
import { LINEAS } from "./reglas";

/* 7c · Las reglas fijas del prototipo (datos/compa.js `fallback`), ES/EN, apoyadas en la ayuda: El Compa SIN IA. Contestan cuando el modelo
   no puede (al tope, apagado, lento, con error, rechazo o una salida que no pasó el verificador). Misma forma de salida que el modelo, así
   que la acción que preparen pasa por la misma validación contra la sesión. Nunca dicen que hicieron algo. */
export type SalidaReglas = { respuesta: string; tipo: "respuesta" | "pregunta" | "no_se"; fuente: string; accion: { tipo: string; ref: string; pantalla: string }; persona: string; chips: string[] };

const frases = (t: string, n: number) => t.replace(/(^|\n)\s*[-•]\s+/g, "$1").replace(/[#*_`>|]/g, " ").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim()
  .split(/(?<=[.!?])\s+/).filter((x) => x.length > 3).slice(0, n).join(" ");

// ◆ elegir:inicio
/* 23 nov · LA OPERACIÓN DE LA QUE SE HABLA. Antes, «cancela…» y «abre mi…» tomaban la PRIMERA operación de la lista sin mirar de cuál hablaba la
   persona («cancela mi cita con la barbería» preparaba «¿Cancelar tu pedido?» si el pedido venía primero). Ahora una sola función decide, con reglas
   deterministas y sobre el texto sin tildes ni mayúsculas (ES y EN), y la usan las reglas fijas y el simulador (el modelo real no pasa por aquí):
   1) otra persona («de mi vecino», «someone else's») → ninguna acción; 2) la referencia escrita («R-1042»); 3) el tipo («cita», «pedido», «reserva»,
   «boletos»…); 4) el negocio (una palabra de su nombre, entera; «barbershop» vale por «barbería»); 5) la fecha (día de la semana o día del mes; «hoy» y
   «mañana» solo si quien llama dice qué día es hoy). Cada pista que la persona dio tiene que cumplirse. UNA que coincide: esa. VARIAS: se pregunta
   cuál (con tipo, negocio y fecha, nunca ids ni teléfonos). NINGUNA: se dice que no se encontró. Sin pista alguna: la única cancelable, si es una; si
   hay varias, se pregunta. Una pista que el contexto no puede cotejar (la operación no trae tipo o fecha) no descarta nada. Fronteras de LETRA, nunca
   \b (con tilde o ñ no hay \b): guardián compaFronteraConTilde. Guardián compaEligeLaOperacion y su tabla CASOS_ELEGIR (corre contra este código). */
export type OpCtx = { ref: string; negocio: string; cancelable_gratis: boolean; numero?: string; tipo?: string; kind?: string; cuando?: string };
export type Propuesta = { respuesta: string; tipo: "respuesta" | "pregunta" | "no_se"; fuente: string; accion: { tipo: string; ref: string; pantalla: string }; chips: string[] };
export type Eleccion = { k: "una"; op: OpCtx } | { k: "varias"; ops: OpCtx[] } | { k: "ninguna" } | { k: "sin_pista" } | { k: "otra_persona" };

const LI = "(?<![\\p{L}\\p{N}])", LD = "(?![\\p{L}\\p{N}])";           // frontera de letra, con tilde y ñ
const plano = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const palabra = (alt: string) => new RegExp(`${LI}(?:${alt})${LD}`, "u");

/* Los tipos de operación, con los nombres que el producto usa (contexto-vecino.ts TIPO y acciones.ts BASE): sus kinds y las palabras con que la gente los
   nombra. «reserva» es amplia (cualquier cosa que se reserva); «mesa» es la de restaurante. Una operación sin kind se reconoce por su etiqueta. */
type Grupo = { kinds: string[]; dicenRe: RegExp; etiquetaRe: RegExp };
const GR: Grupo[] = ([
  { kinds: ["appointment"], dicen: "citas?|appointments?", etiqueta: "cita|appointment" },
  { kinds: ["order", "market_order"], dicen: "pedidos?|ordenes|orden|orders?", etiqueta: "pedido|order" },
  { kinds: ["table"], dicen: "mesas?|tables?", etiqueta: "mesa|table" },
  { kinds: ["table", "appointment", "private_event", "visit", "trip", "night", "rental", "tickets", "party"], dicen: "reservas?|reservaciones|reservacion|reservations?|bookings?",
    etiqueta: "reservacion|reservation|cita|appointment|mesa|table|fiesta|party|evento privado|private event|visita|visit|viaje|trip|noche|night|renta|rental|boletos|tickets" },
  { kinds: ["hold"], dicen: "apartados?|layaway|holds?", etiqueta: "apartado|layaway|hold" },
  { kinds: ["quote"], dicen: "presupuestos?|cotizacion(?:es)?|quotes?", etiqueta: "presupuesto|quote" },
  { kinds: ["party"], dicen: "fiestas?|parties|party", etiqueta: "fiesta|party" },
  { kinds: ["private_event"], dicen: "eventos? privados?|private events?", etiqueta: "evento privado|private event" },
  { kinds: ["tickets"], dicen: "boletos?|boletas?|tickets?", etiqueta: "boletos|tickets" },
  { kinds: ["visit"], dicen: "visitas?|visits?", etiqueta: "visita|visit" },
  { kinds: ["trip"], dicen: "viajes?|trips?", etiqueta: "viaje|trip" },
  { kinds: ["rental"], dicen: "rentas?|alquileres|alquiler|rentals?", etiqueta: "renta|rental" },
  { kinds: ["plan"], dicen: "planes? de pagos?|payment plans?", etiqueta: "plan de pagos|payment plan" },
  { kinds: ["night"], dicen: "night out", etiqueta: "noche|night out" },
  { kinds: ["enrollment"], dicen: "inscripcion(?:es)?|matriculas?|enrollments?|clases?|cursos?|classes|class|courses?", etiqueta: "inscripcion|enrollment" },   // no está en el contexto: nombrarla = «no la encontré»
] as { kinds: string[]; dicen: string; etiqueta: string }[]).map((g) => ({ kinds: g.kinds, dicenRe: palabra(g.dicen), etiquetaRe: palabra(g.etiqueta) }));
const delGrupo = (o: OpCtx, g: Grupo) => (o.kind ? g.kinds.includes(o.kind) : o.tipo ? g.etiquetaRe.test(plano(o.tipo)) : null);   // null: no se sabe

/* El negocio: «barbershop» es la «barbería» de su nombre. */
const EQUIV: string[][] = [["barberia", "barbershop", "barber"], ["restaurante", "restaurant"], ["panaderia", "bakery"], ["peluqueria", "hair salon"], ["carniceria", "butcher"],
  ["farmacia", "pharmacy"], ["iglesia", "church"], ["tienda", "store", "shop"], ["taller", "garage"], ["mercado", "market"], ["cafeteria", "cafe", "coffee shop"], ["lavanderia", "laundromat"]];
const SOBRAN = new Set(["para", "with", "from", "that", "this", "unas", "unos", "tienda", "store", "shop"]);
/* Lo que de su nombre dijo la persona (el nombre entero o palabras sueltas; «barbershop» por «barbería»), o [] si no habló de ese negocio. */
function negocioDicho(o: OpCtx, t: string): string[] {
  const n = plano(o.negocio), r: string[] = [];
  if (n.length >= 3 && palabra(escRe(n)).test(t)) return [n];
  for (const w of new Set(n.split(/[^\p{L}\p{N}]+/u).filter((x) => x.length >= 4 && !SOBRAN.has(x)))) {
    for (const a of [w, ...(EQUIV.find((e) => e.includes(w)) ?? [])]) if (palabra(escRe(a)).test(t)) r.push(a);
  }
  return r;
}
/* Un nombre propio tras «en / con / de…» («cancela mi cita en Don Pepe») que no es de ninguna operación suya: la persona habló de otra cosa. */
const NO_ES_NEGOCIO = /^(?:hazleton|allentown|wilkes-?barre|scranton|reading|to'?latino|el compa|compa|hoy|manana|ayer|dios)$|^(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|june|july|august|september|october|november|december)\b/;
function nombresPropios(orig: string): string[] {
  const out: string[] = [];
  for (const m of orig.matchAll(new RegExp(`${LI}(?:en|con|de|del|at|with|from|para|for)\\s+(\\p{Lu}[\\p{L}\\p{N}'’.-]*(?:\\s+(?:(?:de|del|la|el|los|las|y|&)\\s+)?\\p{Lu}[\\p{L}\\p{N}'’.-]*)*)`, "gu"))) {
    const p = plano(m[1] ?? ""); if (p && !NO_ES_NEGOCIO.test(p)) out.push(p);
  }
  return out;
}

/* Otra persona: la operación es de alguien que no es la persona (el contexto solo trae las suyas). La familia no cuenta (puede haberlo reservado ella). */
const OTRA = "vecin[oa]s?|amig[oa]s?|conocid[oa]s?|companer[oa]s?|jef[ea]|otra persona|alguien mas|alguien";
const OTRA_EN = "neighbou?rs?|friends?|acquaintances?|coworkers?|colleagues?|boss|someone else|another person|somebody else|someone|somebody";
const deOtraPersona = (t: string) => new RegExp(`${LI}(?:de|del|para|por)\\s+(?:(?:mi|la|el|un|una|otra)\\s+)?(?:${OTRA})${LD}|${LI}(?:${OTRA_EN})(?:\\s+[\\p{L}]+)?(?:'s|’s|s')${LD}|${LI}(?:for|of|from)\\s+(?:(?:my|a|an)\\s+)?(?:${OTRA_EN})${LD}`, "u").test(t);

const POSESIVO = new RegExp(`${LI}\\p{Lu}\\p{L}+['’]s${LD}`, "u");
/* La referencia: «R-1042», «1042», «#1360». */
const REF = new RegExp(`${LI}(?:[a-z]{1,2}[\\s-]?)?\\d{3,}${LD}`, "gu");
function numeroDicho(o: OpCtx, t: string): boolean {
  const n = plano(o.numero ?? ""); if (!n) return false;
  const partes = n.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (palabra(partes.map(escRe).join("[\\s-]*")).test(t)) return true;
  const dig = partes.find((x) => /^\d{3,}$/.test(x));
  return !!dig && partes.length > 1 && palabra(escRe(dig)).test(t);
}

/* La fecha: «sábado», «el 28», «28 de noviembre», «hoy», «mañana». */
const DIAS = ["domingo|sunday", "lunes|monday", "martes|tuesday", "miercoles|wednesday", "jueves|thursday", "viernes|friday", "sabado|saturday"];
const MESES = ["enero|january", "febrero|february", "marzo|march", "abril|april", "mayo|may", "junio|june", "julio|july", "agosto|august", "septiembre|september|sept", "octubre|october", "noviembre|november", "diciembre|december"];
type Fecha = { semana: number[]; dia: number | null; mes: number | null; abs: string[] };
function fechaDicha(t: string, hoy?: string): Fecha | null {
  const f: Fecha = { semana: [], dia: null, mes: null, abs: [] };
  DIAS.forEach((d, i) => { if (palabra(`(?:${d})s?`).test(t)) f.semana.push(i); });
  const mesRe = MESES.map((m, i) => ({ i, re: m })).map(({ i, re }) => ({ i, re: palabra(re) }));
  const mes = mesRe.find((m) => m.re.test(t));
  const alt = MESES.join("|");
  const a = new RegExp(`${LI}(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:de\\s+|of\\s+)?(?:${alt})${LD}`, "u").exec(t), b = new RegExp(`${LI}(?:${alt})\\s+(\\d{1,2})(?:st|nd|rd|th)?${LD}`, "u").exec(t),
    c = new RegExp(`${LI}(?:el|dia|del|on the|the)\\s+(\\d{1,2})(?:st|nd|rd|th)?${LD}(?!\\s*:)`, "u").exec(t);
  const d = a?.[1] ?? b?.[1] ?? c?.[1];
  if (d && +d >= 1 && +d <= 31) { f.dia = +d; if (mes && (a || b)) f.mes = mes.i + 1; }
  if (hoy && /^\d{4}-\d{2}-\d{2}$/.test(hoy)) {
    const suma = (n: number) => new Date(Date.parse(`${hoy}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
    if (palabra("hoy|today").test(t)) f.abs.push(hoy);
    if (new RegExp(`(?<!${LI}(?:la|esta|por la|en la|de la)\\s)${LI}(?:manana|tomorrow)${LD}`, "u").test(t) && !/tomorrow morning/.test(t)) f.abs.push(suma(1));
  }
  return f.semana.length || f.dia !== null || f.abs.length ? f : null;
}
function enFecha(cuando: string, f: Fecha): boolean | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(cuando); if (!m) return null;
  const dia = +m[3]!, mes = +m[2]!, sem = new Date(Date.UTC(+m[1]!, mes - 1, dia)).getUTCDay();
  if (f.semana.length && !f.semana.includes(sem)) return false;
  if (f.dia !== null && f.dia !== dia) return false;
  if (f.mes !== null && f.mes !== mes) return false;
  if (f.abs.length && !f.abs.includes(m[0])) return false;
  return true;
}
const SEM_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], SEM_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], MES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function cuandoCorto(cuando: string, es: boolean): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}:\d{2}))?/.exec(cuando); if (!m) return "";
  const sem = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!)).getUTCDay(), hora = m[4] ? `, ${m[4]}` : "";
  return es ? `${SEM_ES[sem]} ${+m[3]!} ${MES_ES[+m[2]! - 1]}${hora}` : `${SEM_EN[sem]} ${MES_EN[+m[2]! - 1]} ${+m[3]!}${hora}`;
}

const GENERICO = palabra("solicitud(?:es)?|operacion(?:es)?|requests?|operations?");
export const quiereCancelar = (t: string) => /\b(cancel|cancela|cancelar|cancelo|anular|anula)/.test(plano(t));   // «cancélalo» también: sin tildes
export const quiereAbrir = (t: string) => /\b(ver mi|abre mi|abrir mi|muestrame mi|donde esta mi|show me my|open my)\b/.test(plano(t));

export function elegirOperacion(x: { texto: string; ops: OpCtx[]; hoy?: string }): Eleccion {
  const t = plano(x.texto);
  if (deOtraPersona(t)) return { k: "otra_persona" };
  if (!x.ops.length) return { k: "ninguna" };
  let c = x.ops;
  // 1) La referencia escrita decide por sí sola (si no es de ninguna suya, o el contexto no trae números para cotejar, no hay operación).
  const refs = (t.match(REF) ?? []).filter((r) => !/^(?:19|20)\d{2}$/.test(r.trim()));
  if (refs.length) {
    const por = x.ops.filter((o) => numeroDicho(o, t));
    return por.length === 1 ? { k: "una", op: por[0]! } : por.length ? { k: "varias", ops: por } : { k: "ninguna" };
  }
  // 2) El negocio. Sus palabras no cuentan como tipo ni como fecha («Fiesta Patronal» no es «fiesta»).
  let s = t, pista = false;
  const hit = new Map(x.ops.map((o) => [o, negocioDicho(o, t)] as const).filter(([, w]) => w.length));
  for (const w of [...hit.values()].flat()) s = s.replace(new RegExp(`${LI}${escRe(w)}${LD}`, "gu"), " ");
  if (hit.size) { pista = true; c = c.filter((o) => hit.has(o)); }
  else if (POSESIVO.test(x.texto)) return { k: "otra_persona" };   // «Pedro's appointment» (si no es el nombre de uno de sus negocios: «Tony's Pizza»)
  else if (nombresPropios(x.texto).length) { pista = true; c = []; }
  // 3) El tipo: la operación tiene que ser de TODOS los tipos que nombró (una que no dice su tipo no se descarta).
  const tipos = GR.filter((g) => g.dicenRe.test(s));
  if (tipos.length && x.ops.some((o) => tipos.every((g) => delGrupo(o, g) !== null))) { pista = true; c = c.filter((o) => tipos.every((g) => delGrupo(o, g) !== false)); }
  // 4) La fecha.
  const f = fechaDicha(s, x.hoy);
  if (f && x.ops.some((o) => o.cuando && enFecha(o.cuando, f) !== null)) { pista = true; c = c.filter((o) => !o.cuando || enFecha(o.cuando, f) !== false); }
  if (!pista) return { k: "sin_pista" };
  return c.length === 1 ? { k: "una", op: c[0]! } : c.length ? { k: "varias", ops: c } : { k: "ninguna" };
}

const unir = (l: string[], es: boolean) => (l.length < 2 ? l.join("") : `${l.slice(0, -1).join(", ")} ${es ? "y" : "and"} ${l[l.length - 1]}`);
const nombreDe = (o: OpCtx, es: boolean) => o.tipo || (es ? "solicitud" : "request");
const describir = (o: OpCtx, es: boolean) => `${es ? "tu" : "your"} ${nombreDe(o, es)} ${es ? "en" : "at"} ${o.negocio}${o.cuando && cuandoCorto(o.cuando, es) ? ` (${cuandoCorto(o.cuando, es)})` : ""}`;
/* Un chip es una frase que, al tocarla, vuelve a elegir UNA operación: verbo + tipo + negocio. Si no cabe (40) o se repite, sin chips. */
function chipsDe(ops: OpCtx[], es: boolean, verbo: "cancelar" | "abrir"): string[] {
  if (ops.length > 3) return [];
  const v = verbo === "cancelar" ? (es ? "Cancela mi" : "Cancel my") : (es ? "Abre mi" : "Open my"), en = es ? "en" : "at";
  const hacer = (o: OpCtx, conTipo: boolean) => `${v} ${conTipo ? nombreDe(o, es) : es ? "solicitud" : "request"} ${en} ${o.negocio}`;
  const a = ops.map((o) => hacer(o, true));
  const l = a.every((x) => x.length <= 40) ? a : ops.map((o) => hacer(o, false));
  return l.every((x) => x.length <= 40) && new Set(l).size === l.length ? l : [];
}
const aviso = (es: boolean) => (es ? "No encontré esa operación entre las tuyas." : "I couldn't find that one among yours.");
const OTRA_LINEA = { es: "No puedo preparar nada sobre lo de otra persona: es privado. Solo puedo ayudarte con tus propias solicitudes.", en: "I can't prepare anything for someone else's requests: that is private. I can only help with your own." };
function preguntar(ops: OpCtx[], es: boolean, verbo: "cancelar" | "abrir", noEncontro: boolean): Propuesta {
  const cual = verbo === "cancelar" ? (es ? "¿Cuál quieres cancelar?" : "Which one do you want to cancel?") : (es ? "¿Cuál quieres abrir?" : "Which one do you want to open?");
  if (ops.length === 1) return { respuesta: `${noEncontro ? `${aviso(es)} ` : ""}${es ? `¿Quieres ${verbo} ${describir(ops[0]!, es)}?` : `Do you want to ${verbo === "cancelar" ? "cancel" : "open"} ${describir(ops[0]!, es)}?`}`, tipo: "pregunta", fuente: "cuenta",
    accion: { tipo: "ninguna", ref: "", pantalla: "" }, chips: chipsDe(ops, es, verbo) };
  const lista = ops.slice(0, 4).map((o) => describir(o, es)), mas = ops.length > 4 ? (es ? " y más" : " and more") : "";
  return { respuesta: `${noEncontro ? `${aviso(es)} ` : ""}${cual} ${es ? "Tienes" : "You have"} ${unir(lista, es)}${mas}.`, tipo: "pregunta", fuente: "cuenta", accion: { tipo: "ninguna", ref: "", pantalla: "" },
    chips: chipsDe(ops.slice(0, 4), es, verbo) };
}
const SIN_ACCION = { tipo: "ninguna", ref: "", pantalla: "" };
const noEncontrada = (es: boolean): Propuesta => ({ respuesta: `${aviso(es)} ${es ? "Dime cuál es o, si prefieres, te paso con una persona." : "Tell me which one, or if you prefer, I'll pass you to a person."}`, tipo: "pregunta", fuente: "", accion: SIN_ACCION, chips: [] });
const deOtra = (es: boolean): Propuesta => ({ respuesta: OTRA_LINEA[es ? "es" : "en"], tipo: "no_se", fuente: "", accion: SIN_ACCION, chips: [] });

/* «Cancela…»: la acción solo para UNA operación que se pueda cancelar gratis y de la que la persona habló; null = que siga lo de siempre (la ayuda). */
export function respuestaCancelar(x: { texto: string; lang: Lang; ops: OpCtx[]; hoy?: string }): Propuesta | null {
  const es = x.lang === "es", e = elegirOperacion(x), canc = x.ops.filter((o) => o.cancelable_gratis);
  if (e.k === "otra_persona") return deOtra(es);
  if (e.k === "varias") return preguntar(e.ops, es, "cancelar", false);
  if (e.k === "ninguna") return canc.length ? preguntar(canc, es, "cancelar", true) : noEncontrada(es);
  const p = e.k === "una" ? (e.op.cancelable_gratis ? e.op : null) : canc.length === 1 ? canc[0]! : null;
  if (e.k === "sin_pista" && canc.length > 1) return preguntar(canc, es, "cancelar", false);
  if (!p) return null;
  return { tipo: "respuesta", fuente: "cuenta", chips: [], accion: { tipo: "cancel_request", ref: p.ref, pantalla: "" },
    respuesta: es ? `Te preparé la cancelación de tu solicitud en ${p.negocio}. Como todavía no está confirmada, no pagas nada.` : `I prepared the cancellation of your request at ${p.negocio}. It isn't confirmed yet, so you pay nothing.` };
}
/* «Abre mi…»: solo si la persona dijo cuál (referencia, tipo, negocio, fecha o «mi solicitud»). */
export function respuestaAbrir(x: { texto: string; lang: Lang; ops: OpCtx[]; hoy?: string }): Propuesta | null {
  const es = x.lang === "es", e = elegirOperacion(x);
  if (e.k === "otra_persona") return deOtra(es);
  if (e.k === "varias") return preguntar(e.ops, es, "abrir", false);
  if (e.k === "ninguna") return x.ops.length ? preguntar(x.ops, es, "abrir", true) : noEncontrada(es);
  const o = e.k === "una" ? e.op : GENERICO.test(plano(x.texto)) && x.ops.length === 1 ? x.ops[0]! : null;
  if (e.k === "sin_pista" && GENERICO.test(plano(x.texto)) && x.ops.length > 1) return preguntar(x.ops, es, "abrir", false);
  if (!o) return null;
  return { tipo: "respuesta", fuente: "cuenta", chips: [], accion: { tipo: "open_screen", ref: o.ref, pantalla: "operacion" },
    respuesta: o.numero ? (es ? `Te abro ${o.numero}.` : `Opening ${o.numero}.`) : es ? `Te abro tu ${nombreDe(o, es)} en ${o.negocio}.` : `Opening your ${nombreDe(o, es)} at ${o.negocio}.` };
}

/* La tabla de la elección: frase + contexto → la operación esperada, la pregunta o nada. La corre el guardián compaEligeLaOperacion contra ESTE código
   (y cada respuesta pasa por verificar()); quitar una regla pone un caso en rojo. Solo se añade. Contextos: lo que el servidor trae de cada operación
   (contexto-vecino.ts); «degradado» = solo ref, negocio y si es cancelable (lo que hoy reciben las reglas de conversacion.ts y de la batería). */
type OpTabla = { kind: string; numero: string; negocio: string; tipo: [string, string]; cuando: string; cancelable: boolean };
const T_CITA: [string, string] = ["cita", "appointment"], T_MESA: [string, string] = ["reservación de mesa", "table reservation"], T_PEDIDO: [string, string] = ["pedido", "order"];
export const CONTEXTOS_ELEGIR: Record<string, OpTabla[]> = {
  dos_pendientes: [{ kind: "table", numero: "R-1042", negocio: "Sabor Dominicano", tipo: T_MESA, cuando: "2026-11-27 19:00", cancelable: true },
    { kind: "appointment", numero: "C-2210", negocio: "Barbería Don Luis", tipo: T_CITA, cuando: "2026-11-28 10:30", cancelable: true }],
  cita_y_pedido: [{ kind: "appointment", numero: "C-2210", negocio: "Barbería Don Luis", tipo: T_CITA, cuando: "2026-11-28 10:30", cancelable: true },
    { kind: "order", numero: "1360", negocio: "El Fogón", tipo: T_PEDIDO, cuando: "2026-11-20 13:05", cancelable: false }],
  dos_citas: [{ kind: "appointment", numero: "C-3001", negocio: "Barbería Don Luis", tipo: T_CITA, cuando: "2026-11-28 10:30", cancelable: true },
    { kind: "appointment", numero: "C-3002", negocio: "Salón Gloria", tipo: T_CITA, cuando: "2026-11-30 15:00", cancelable: true },
    { kind: "order", numero: "1360", negocio: "El Fogón", tipo: T_PEDIDO, cuando: "2026-11-20 13:05", cancelable: false }],
  con_tildes: [{ kind: "appointment", numero: "C-4001", negocio: "Peluquería Ñandú", tipo: T_CITA, cuando: "2026-12-02 09:00", cancelable: true },
    { kind: "order", numero: "1400", negocio: "Café Rincón", tipo: T_PEDIDO, cuando: "2026-12-01 12:00", cancelable: false }],
  una_cita: [{ kind: "appointment", numero: "C-2210", negocio: "Barbería Don Luis", tipo: T_CITA, cuando: "2026-11-28 10:30", cancelable: true }],
  boletos: [{ kind: "tickets", numero: "B-7731", negocio: "Fiesta Patronal", tipo: ["boletos", "tickets"], cuando: "2026-12-05 21:00", cancelable: false }],
  negocio_con_posesivo: [{ kind: "order", numero: "1500", negocio: "Tony's Pizza", tipo: T_PEDIDO, cuando: "2026-11-22 20:00", cancelable: false }],
  sin_operaciones: [],
  degradado: [{ kind: "", numero: "", negocio: "Sabor Dominicano", tipo: ["", ""], cuando: "", cancelable: true }, { kind: "", numero: "", negocio: "Barbería Don Luis", tipo: ["", ""], cuando: "", cancelable: true },
    { kind: "", numero: "", negocio: "El Fogón", tipo: ["", ""], cuando: "", cancelable: false }],
};
export const opsDeTabla = (ctx: string, lang: Lang): OpCtx[] => (CONTEXTOS_ELEGIR[ctx] ?? []).map((o, i) => ({ ref: `op${i + 1}`, negocio: o.negocio, cancelable_gratis: o.cancelable,
  ...(o.numero ? { numero: o.numero, kind: o.kind, tipo: o.tipo[lang === "es" ? 0 : 1], cuando: o.cuando } : {}) }));
/* elige: «una:op2» · «varias:op1,op2» · «ninguna» · «sin_pista» · «otra». Con intencion cancelar/abrir, responde: «cancel_request:op2» · «open_screen:op2» ·
   «pregunta» · «no_se» · «nada» (sigue la ayuda de siempre). */
export type CasoElegir = { ctx: string; es: string; en: string; elige: string; intencion?: "cancelar" | "abrir"; responde?: string; hoy?: string };
export const CASOS_ELEGIR: CasoElegir[] = [
  // El fallo de la batería: dos operaciones y la primera no es de la que habla.
  { ctx: "dos_pendientes", es: "Cancela mi cita con la barbería", en: "Cancel my appointment with the barbershop", elige: "una:op2", intencion: "cancelar", responde: "cancel_request:op2" },
  { ctx: "dos_pendientes", es: "Cancela mi reservación de mesa", en: "Cancel my table reservation", elige: "una:op1", intencion: "cancelar", responde: "cancel_request:op1" },
  { ctx: "cita_y_pedido", es: "Cancela mi cita con la barbería", en: "Cancel my appointment with the barbershop", elige: "una:op1", intencion: "cancelar", responde: "cancel_request:op1" },
  { ctx: "cita_y_pedido", es: "Abre mi pedido de El Fogón", en: "Open my El Fogón order", elige: "una:op2", intencion: "abrir", responde: "open_screen:op2" },
  { ctx: "cita_y_pedido", es: "Abre mi cita", en: "Open my appointment", elige: "una:op1", intencion: "abrir", responde: "open_screen:op1" },
  { ctx: "cita_y_pedido", es: "Ver mi pedido", en: "Show me my order", elige: "una:op2", intencion: "abrir", responde: "open_screen:op2" },
  // La referencia escrita (con guion, sin guion o solo el número) y la que no es suya.
  { ctx: "dos_pendientes", es: "Cancela la R-1042", en: "Cancel R-1042", elige: "una:op1", intencion: "cancelar", responde: "cancel_request:op1" },
  { ctx: "dos_pendientes", es: "Cancela la solicitud c2210", en: "Cancel request C2210", elige: "una:op2", intencion: "cancelar", responde: "cancel_request:op2" },
  { ctx: "cita_y_pedido", es: "Abre mi pedido 1360", en: "Open my order 1360", elige: "una:op2", intencion: "abrir", responde: "open_screen:op2" },
  { ctx: "dos_pendientes", es: "Cancela la reservación R-9999", en: "Cancel reservation R-9999", elige: "ninguna", intencion: "cancelar", responde: "pregunta" },
  // Sin pista: la única cancelable, o se pregunta.
  { ctx: "cita_y_pedido", es: "Cancélalo", en: "Cancel it", elige: "sin_pista", intencion: "cancelar", responde: "cancel_request:op1" },
  { ctx: "una_cita", es: "Quiero cancelar", en: "I want to cancel", elige: "sin_pista", intencion: "cancelar", responde: "cancel_request:op1" },
  { ctx: "dos_pendientes", es: "Cancélalo", en: "Cancel it", elige: "sin_pista", intencion: "cancelar", responde: "pregunta" },
  { ctx: "cita_y_pedido", es: "Abre mi solicitud", en: "Open my request", elige: "sin_pista", intencion: "abrir", responde: "pregunta" },
  { ctx: "una_cita", es: "Abre mi solicitud", en: "Open my request", elige: "sin_pista", intencion: "abrir", responde: "open_screen:op1" },
  { ctx: "dos_citas", es: "Abre mi solicitud", en: "Open my request", elige: "sin_pista", intencion: "abrir", responde: "pregunta" },
  { ctx: "cita_y_pedido", es: "Ver mi cuenta", en: "Show me my account", elige: "sin_pista", intencion: "abrir", responde: "nada" },
  // Varias del mismo tipo: se pregunta cuál (y cada chip vuelve a elegir UNA).
  { ctx: "dos_citas", es: "Cancela mi cita", en: "Cancel my appointment", elige: "varias:op1,op2", intencion: "cancelar", responde: "pregunta" },
  { ctx: "dos_pendientes", es: "Cancela mi reserva", en: "Cancel my booking", elige: "varias:op1,op2", intencion: "cancelar", responde: "pregunta" },
  { ctx: "dos_citas", es: "Abre mi cita", en: "Open my appointment", elige: "varias:op1,op2", intencion: "abrir", responde: "pregunta" },
  // El negocio: una palabra de su nombre, entera; con tilde y ñ.
  { ctx: "dos_citas", es: "Cancela mi cita en el salón", en: "Cancel my appointment at the salon", elige: "una:op2", intencion: "cancelar", responde: "cancel_request:op2" },
  { ctx: "con_tildes", es: "Cancela mi cita en la peluquería", en: "Cancel my appointment at the hair salon", elige: "una:op1", intencion: "cancelar", responde: "cancel_request:op1" },
  { ctx: "con_tildes", es: "Cancela mi cita en Ñandú", en: "Cancel my appointment at Ñandú", elige: "una:op1", intencion: "cancelar", responde: "cancel_request:op1" },
  { ctx: "con_tildes", es: "Cancela mi cita en Ñandúes", en: "Cancel my appointment at Ñandúes", elige: "ninguna", intencion: "cancelar", responde: "pregunta" },
  { ctx: "con_tildes", es: "Abre mi pedido del Café Rincón", en: "Open my order from Café Rincón", elige: "una:op2", intencion: "abrir", responde: "open_screen:op2" },
  { ctx: "con_tildes", es: "Cancela mi cita en Rincón", en: "Cancel my appointment at Rincón", elige: "ninguna", intencion: "cancelar", responde: "pregunta" },
  { ctx: "boletos", es: "Cancela mis boletos de la Fiesta Patronal", en: "Cancel my tickets for Fiesta Patronal", elige: "una:op1", intencion: "cancelar", responde: "nada" },
  { ctx: "negocio_con_posesivo", es: "Abre mi pedido de Tony's Pizza", en: "Open my order at Tony's Pizza", elige: "una:op1", intencion: "abrir", responde: "open_screen:op1" },
  // Ninguna coincide con lo dicho.
  { ctx: "dos_pendientes", es: "Cancela mi cita en Don Pepe", en: "Cancel my appointment at Don Pepe", elige: "ninguna", intencion: "cancelar", responde: "pregunta" },
  { ctx: "dos_pendientes", es: "Cancela mi pedido", en: "Cancel my order", elige: "ninguna", intencion: "cancelar", responde: "pregunta" },
  { ctx: "dos_pendientes", es: "Cancela mi inscripción", en: "Cancel my enrollment", elige: "ninguna", intencion: "cancelar", responde: "pregunta" },
  { ctx: "una_cita", es: "Cancela mi pedido", en: "Cancel my order", elige: "ninguna", intencion: "cancelar", responde: "pregunta" },
  { ctx: "sin_operaciones", es: "Cancela mi cita", en: "Cancel my appointment", elige: "ninguna", intencion: "cancelar", responde: "pregunta" },
  { ctx: "sin_operaciones", es: "Abre mi pedido", en: "Open my order", elige: "ninguna", intencion: "abrir", responde: "pregunta" },
  // La fecha: día de la semana, día del mes, «mañana» (solo con el día de hoy), y «por la mañana» no es una fecha.
  { ctx: "dos_pendientes", es: "Cancela la del sábado", en: "Cancel the one on Saturday", elige: "una:op2", intencion: "cancelar", responde: "cancel_request:op2" },
  { ctx: "dos_pendientes", es: "Cancela mi reservación del viernes", en: "Cancel my reservation on Friday", elige: "una:op1", intencion: "cancelar", responde: "cancel_request:op1" },
  { ctx: "dos_pendientes", es: "Cancela mi reservación del domingo", en: "Cancel my reservation on Sunday", elige: "ninguna", intencion: "cancelar", responde: "pregunta" },
  { ctx: "dos_citas", es: "Cancela mi cita del 30 de noviembre", en: "Cancel my appointment on November 30", elige: "una:op2", intencion: "cancelar", responde: "cancel_request:op2" },
  { ctx: "dos_citas", es: "Cancela mi cita del lunes", en: "Cancel my appointment on Monday", elige: "una:op2", intencion: "cancelar", responde: "cancel_request:op2" },
  { ctx: "dos_citas", es: "Cancela mi cita del martes", en: "Cancel my appointment on Tuesday", elige: "ninguna", intencion: "cancelar", responde: "pregunta" },
  { ctx: "dos_pendientes", es: "Cancela la de mañana", en: "Cancel the one tomorrow", elige: "una:op2", intencion: "cancelar", responde: "cancel_request:op2", hoy: "2026-11-27" },
  { ctx: "dos_pendientes", es: "Cancela mi reserva por la mañana", en: "Cancel my booking tomorrow morning", elige: "varias:op1,op2", intencion: "cancelar", responde: "pregunta", hoy: "2026-11-27" },
  // Otra persona: ninguna acción.
  { ctx: "dos_pendientes", es: "Cancela la cita de mi vecino Pedro en la barbería", en: "Cancel my neighbor Pedro's appointment at the barbershop", elige: "otra", intencion: "cancelar", responde: "no_se" },
  { ctx: "cita_y_pedido", es: "Cancela la cita de mi amiga", en: "Cancel my friend's appointment", elige: "otra", intencion: "cancelar", responde: "no_se" },
  { ctx: "cita_y_pedido", es: "Abre mi pedido de mi vecino", en: "Open my neighbor's order", elige: "otra", intencion: "abrir", responde: "no_se" },
  { ctx: "dos_pendientes", es: "Cancela la cita de alguien más", en: "Cancel Maria's appointment", elige: "otra", intencion: "cancelar", responde: "no_se" },
  // Degradado: sin tipo ni número, el negocio sigue sirviendo.
  { ctx: "degradado", es: "Cancela mi cita con la barbería", en: "Cancel my appointment with the barbershop", elige: "una:op2", intencion: "cancelar", responde: "cancel_request:op2" },
  { ctx: "degradado", es: "Abre mi pedido de El Fogón", en: "Open my El Fogón order", elige: "una:op3", intencion: "abrir", responde: "open_screen:op3" },
  { ctx: "degradado", es: "Cancélalo", en: "Cancel it", elige: "sin_pista", intencion: "cancelar", responde: "pregunta" },
  { ctx: "degradado", es: "Cancela la reservación R-9999", en: "Cancel reservation R-9999", elige: "ninguna", intencion: "cancelar", responde: "pregunta" },
];
// ◆ elegir:fin

export function responderConReglas(x: { texto: string; lang: Lang; ops: OpCtx[]; trozos: TrozoModelo[] }): SalidaReglas {
  const es = x.lang === "es", t = x.texto.toLowerCase(), nada = { tipo: "ninguna", ref: "", pantalla: "" };
  // «Cancela…» y «abre mi…»: la operación de la que habla la persona (elegirOperacion); nunca la primera de la lista.
  const e = quiereCancelar(x.texto) ? respuestaCancelar(x) : quiereAbrir(x.texto) ? respuestaAbrir(x) : null;
  if (e) return { ...e, persona: "ninguno" };
  const f = x.trozos[0];
  if (f) {
    const r = frases(f.texto, 2);
    if (r) return { tipo: "respuesta", fuente: f.fuente, persona: "ninguno", chips: [], accion: nada, respuesta: r.length > 400 ? r.slice(0, 397).replace(/\s+\S*$/, "") + "…" : r };
  }
  return { tipo: "pregunta", fuente: "", persona: "ninguno", accion: nada,
    respuesta: es ? "No estoy seguro de entenderte. ¿Es sobre una cita, un pedido o un pago? Si prefieres, te paso con una persona." : "I'm not sure I follow. Is it about a booking, an order or a payment? If you prefer, I'll pass you to a person.",
    chips: es ? ["Una cita", "Un pedido", "Un pago"] : ["A booking", "An order", "A payment"] };
}
export const lineaNoSe = (lang: Lang) => LINEAS.noSe[lang];

/* 7e · Las reglas fijas del PANEL (prototipo `ownFallback`), sin IA: la ayuda de su audiencia (vecino + negocio, sin la de partes que no tiene)
   y, si el servidor reconoció la sección y la persona la puede abrir, «Ir a …» (go_to_panel, que pasa por la misma validación). Si no hay
   nada, una pregunta corta con las secciones que SÍ puede abrir. Nunca dicen que hicieron algo. */
export function responderPanelConReglas(x: { lang: Lang; seccion: { code: string; titulo: string } | null; puede: string[]; trozos: TrozoModelo[] }): SalidaReglas {
  const es = x.lang === "es", nada = { tipo: "ninguna", ref: "", pantalla: "" };
  const ir = x.seccion ? { tipo: "go_to_panel", ref: x.seccion.code, pantalla: "" } : nada;
  const f = x.trozos[0];
  if (f) {
    const r = frases(f.texto, 2);
    if (r) return { tipo: "respuesta", fuente: f.fuente, persona: "ninguno", chips: [], accion: ir, respuesta: r.length > 400 ? r.slice(0, 397).replace(/\s+\S*$/, "") + "…" : r };
  }
  if (x.seccion) return { tipo: "respuesta", fuente: "cuenta", persona: "ninguno", chips: [], accion: ir,
    respuesta: es ? `Eso está en ${x.seccion.titulo}. Te llevo.` : `That is in ${x.seccion.titulo}. I'll take you there.` };
  return { tipo: "pregunta", fuente: "", persona: "ninguno", accion: nada, chips: x.puede.slice(0, 3),
    respuesta: es ? "No estoy seguro de entenderte. ¿Es sobre alguna de estas partes de tu panel? Si prefieres, te paso con una persona." : "I'm not sure I follow. Is it about one of these parts of your dashboard? If you prefer, I'll pass you to a person." };
}

/* 7f · Las reglas fijas de la RESPUESTA AUTOMÁTICA (prototipo autoFallback), sin IA, solo con la página del negocio de los temas encendidos:
   horario y dirección («Ahora estamos cerrados. Abrimos …»), lo que ofrece con su precio (hasta 3, sin agotados), cómo pedir y una pregunta
   frecuente que se parezca. Lo demás: tipo «no_se» (pasa al negocio). Nunca prometen nada; pasan por verificar() y verificarAuto() igual que
   el modelo. `borrador` = para «Sugerir respuesta» (habla el negocio: «Abrimos…», sin presentarse). */
type CtxAuto = { temas: string[]; proxima: string | null; direccion: string | null; horario: string | null; items: { nombre: string; precio: string; agotado: boolean }[];
  comoPedir: string[]; preguntas: { q: string; a: string }[] };
const sinA = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function responderAutoConReglas(x: { texto: string; lang: Lang; ctx: CtxAuto }): SalidaReglas {
  const es = x.lang === "es", t = sinA(x.texto), nada = { tipo: "ninguna", ref: "", pantalla: "" }, c = x.ctx;
  const ok = (respuesta: string): SalidaReglas => ({ tipo: "respuesta", fuente: "cuenta", persona: "ninguno", chips: [], accion: nada, respuesta });
  if (c.temas.includes("hours") && /hora|abre|abren|abrir|cierr|abiert|horario|manana|domingo|sabado|open|close|hour|when|direcc|donde|ubica|llegar|where|address|located/.test(t)) {
    const a = c.proxima ? (es ? `Ahora estamos cerrados. Abrimos ${c.proxima}.` : `We are closed now. We open ${c.proxima}.`) : es ? "Ahora estamos cerrados." : "We are closed now.";
    return ok(`${a}${c.direccion ? (es ? ` Estamos en ${c.direccion}.` : ` We are at ${c.direccion}.`) : ""}`);
  }
  if (c.temas.includes("menu") && /precio|cuanto|cuesta|menu|tienen|hay |venden|servicio|plato|price|how much|cost|menu|have|sell|service/.test(t)) {
    const L = c.items.filter((i) => !i.agotado).slice(0, 3).map((i) => (i.precio ? `${i.nombre} (${i.precio})` : i.nombre));
    if (L.length) return ok(es ? `Algunas cosas que tenemos: ${L.join(", ")}. Todo está en nuestra página de To'Latino.` : `Some of what we have: ${L.join(", ")}. Everything is on our To'Latino page.`);
  }
  if (c.temas.includes("how_to_order") && c.comoPedir.length && /pedir|pido|ordenar|orden|reserv|cita|comprar|delivery|recoger|order|book|appointment|pickup|buy/.test(t))
    return ok(c.comoPedir.slice(0, 2).join(" "));
  if (c.temas.includes("faq")) {
    const pal = (s: string) => new Set(sinA(s).split(/[^a-z0-9ñ]+/).filter((w) => w.length > 3));
    const q = pal(x.texto);
    const f = c.preguntas.map((p) => ({ p, n: [...pal(p.q)].filter((w) => q.has(w)).length })).sort((a, b) => b.n - a.n)[0];
    if (f && f.n >= 2) return ok(f.p.a.length > 380 ? `${f.p.a.slice(0, 377).replace(/\s+\S*$/, "")}…` : f.p.a);
  }
  return { tipo: "no_se", fuente: "", persona: "pidio", chips: [], accion: nada, respuesta: es ? "No tengo ese dato." : "I don't have that information." };
}

/* 7g · El COPILOTO sin IA (prototipo datos/compa.js `copilot`, la parte sin window.claude): «(sin IA: borrador de reglas)». Sale cuando el modelo no
   puede (tiempo, error, rechazo, tope a mitad de camino) o cuando su salida no pasó verificarCopiloto. Solo con lo que el servidor ya sabe del caso
   (el nombre de pila, el tema y la operación como la ve la persona): nunca lo que escribió ella, ni una nota interna, ni montos. Saluda, dice que
   se está revisando y no promete nada; el resumen y el siguiente paso son para el equipo. Pasa por verificarCopiloto igual que el modelo. */
export type CopilotoReglas = { lang: Lang; nombre: string; tema: { es: string; en: string }; ayuda: boolean; op: { tipo: { es: string; en: string }; numero: string; negocio: string } | null;
  dinero: boolean; macro: string; devolver: boolean; eq?: Lang };
export function borradorCopilotoConReglas(x: CopilotoReglas) {
  const es = x.lang === "es", n = x.nombre ? ` ${x.nombre}` : "", op = x.op;
  const sobre = op ? (es ? ` sobre tu ${x.op!.tipo.es} en ${op.negocio}` : ` about your ${op.tipo.en} at ${op.negocio}`) : "";
  // En una ayuda escalada el borrador es el mensaje con el que To'Latino la RESUELVE: no adivina la decisión; la persona del equipo la completa.
  const borrador = x.ayuda ? (es ? `Hola${n}. Revisamos tu solicitud${sobre} y lo que nos contaste.` : `Hi${n}. We reviewed your request${sobre} and what you told us.`) : es
    ? `Hola${n}. Gracias por escribirnos. ${x.dinero ? `Ya estoy revisando el cobro${sobre} y te escribo en cuanto tenga la respuesta.` : `Ya estoy revisando tu caso${sobre} y te escribo en cuanto tenga la respuesta.`}`
    : `Hi${n}. Thanks for writing to us. ${x.dinero ? `I'm reviewing the charge${sobre} and will write to you as soon as I have the answer.` : `I'm reviewing your case${sobre} and will write to you as soon as I have the answer.`}`;
  // Lo del equipo va en el idioma de quien usa el Super Admin (eq; español si no se dice).
  if (x.eq === "en") {
    const resumen = `${x.nombre || "The person"} ${x.ayuda ? "asked for help with" : "writes about"} ${x.tema.en}${op ? ` (${op.tipo.en} ${op.numero} at ${op.negocio})` : ""}.`;
    const siguiente = x.ayuda ? `Complete the message with what you decided before resolving${x.devolver ? "; if a refund is due, «Resolve and refund» is your call" : ""}.` : x.devolver
      ? "Check what was paid in the app; if it applies, «Resolve and refund» is your call." : x.dinero ? "Check the transaction and what was paid in the app before replying." : x.op ? "Check the transaction and reply." : "Reply and wait for their answer.";
    return { resumen, borrador, siguiente, macro: x.macro, fuente: "", sugerir_devolver: x.devolver };
  }
  const resumen = `${x.nombre || "La persona"} ${x.ayuda ? "pidió ayuda con" : "escribe sobre"} ${x.tema.es}${op ? ` (${op.tipo.es} ${op.numero} en ${op.negocio})` : ""}.`;
  const siguiente = x.ayuda ? `Completa el mensaje con lo que decidiste antes de resolver${x.devolver ? "; si corresponde devolver, «Resolver y devolver» lo decides tú" : ""}.` : x.devolver ? "Revisa lo pagado en la app; si corresponde, «Resolver y devolver» lo decides tú." : x.dinero ? "Revisa la operación y lo pagado en la app antes de contestar." : x.op ? "Revisa la operación y contesta." : "Contesta y espera su respuesta.";
  return { resumen, borrador, siguiente, macro: x.macro, fuente: "", sugerir_devolver: x.devolver };
}
