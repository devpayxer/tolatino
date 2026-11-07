/* Pedir visita, prueba de manejo, cita, precalificación u oferta (Fase 4 · 4ie · fase4-iglesias-inmuebles-autos.md §3 y §4ie). Tipos y
   textos que también usa el navegador (sin consultas). El vocabulario sale de VOCS (neg-edu-flow.js L18–19: inm y dealer con visit) y los
   estados de citaVals (L66–71). Nada de esto mueve dinero: hoy $0 siempre (todayOf L24, cobro L33). */
import { fechaCorta, horaInsc, type Bi } from "./inscripciones-comun";
import { SIN_NUMEROS } from "./inmuebles-comun";

export type { Bi };
export type RubroVis = "inm" | "dealer";
export type QueVis = "visita" | "prueba" | "cita" | "precal" | "oferta";
export const NUM_P = /^D-\d{1,10}$/; // D-8101…: «P-» ya es de los pre-estimados de Auto y Hogar

/* Lo que se pide (btnOf inm L90, dealer L106). «Precalificación» y «oferta» son solo día y hora para que llamen: ningún dato de dinero. */
export const QUE: Record<QueVis, { t: Bi; num: Bi; dia: Bi; pedir: Bi; paso: Bi; gratis: Bi }> = {
  visita: { t: { es: "Visita", en: "Visit" }, num: { es: "VISITA #", en: "VISIT #" }, dia: { es: "Día de la visita", en: "Visit day" }, pedir: { es: "Pedir visita", en: "Request visit" }, paso: { es: "Pasó la visita", en: "Visit happened" }, gratis: { es: "Ver la propiedad es gratis.", en: "Viewing is free." } },
  prueba: { t: { es: "Prueba de manejo", en: "Test drive" }, num: { es: "PRUEBA DE MANEJO #", en: "TEST DRIVE #" }, dia: { es: "Día de la prueba", en: "Test drive day" }, pedir: { es: "Prueba de manejo", en: "Test drive" }, paso: { es: "Pasó la prueba", en: "Test drive happened" }, gratis: { es: "La prueba de manejo es gratis.", en: "The test drive is free." } },
  cita: { t: { es: "Cita", en: "Appointment" }, num: { es: "CITA #", en: "APPOINTMENT #" }, dia: { es: "Día de la cita", en: "Appointment day" }, pedir: { es: "Pedir cita", en: "Book" }, paso: { es: "Pasó la cita", en: "Appointment happened" }, gratis: { es: "Pedir la cita es gratis.", en: "Booking is free." } },
  precal: { t: { es: "Precalificación", en: "Pre-qualification" }, num: { es: "PRECALIFICACIÓN #", en: "PRE-QUALIFICATION #" }, dia: { es: "Cuándo te llaman", en: "When they call you" }, pedir: { es: "Pedir precalificación", en: "Get pre-qualified" }, paso: { es: "Pasó la llamada", en: "Call happened" }, gratis: { es: "Precalificar es gratis y no te compromete.", en: "Pre-qualifying is free and commits you to nothing." } },
  oferta: { t: { es: "Oferta en efectivo", en: "Cash offer" }, num: { es: "OFERTA #", en: "OFFER #" }, dia: { es: "Cuándo te llaman", en: "When they call you" }, pedir: { es: "Pedir oferta", en: "Get an offer" }, paso: { es: "Pasó la llamada", en: "Call happened" }, gratis: { es: "La oferta es gratis y no te compromete.", en: "The offer is free and commits you to nothing." } },
};
/* Quién responde (VOCS who). */
export const QUIEN: Record<RubroVis, Bi> = { inm: { es: "la agencia", en: "the agency" }, dealer: { es: "el dealer", en: "the dealer" } };
/* Solo día y hora para que llamen (§4ie): nada de dinero, ni ingresos, ni crédito. */
export const soloLlamada = (q: QueVis) => q === "precal" || q === "oferta";
export const AVISO_NOTA = SIN_NUMEROS;
/* «Trae tu licencia de conducir» (flow L65): se marca que la tiene; NUNCA se pide el número ni una foto. */
export const LICENCIA: Bi = { es: "Trae tu licencia de conducir.", en: "Bring your driver’s license." };
export const TENGO_LICENCIA: Bi = { es: "Sí, tengo licencia vigente.", en: "Yes, I have a valid license." };

/* El filtro de la nota (§3): se tapan los números de seguro social o ITIN (9 cifras, con o sin guiones) y los de tarjeta o cuenta
   (13 a 19 cifras) ANTES de guardar. La base lo vuelve a comprobar (check operations_nota_sin_numeros, 0094): mismas expresiones. */
export const NUM_TARJETA = /(\d[ -]?){12,18}\d/g;
export const NUM_SSN = /(^|\D)\d{3}[ -]?\d{2}[ -]?\d{4}(?=\D|$)/g;
export function taparNumeros(t: string): { texto: string; tapado: boolean } {
  let tapado = false;
  const a = t.replace(NUM_TARJETA, () => { tapado = true; return "••••"; });
  const b = a.replace(NUM_SSN, (_m, pre: string) => { tapado = true; return `${pre}•••-••-••••`; });
  return { texto: b, tapado };
}
export const TEL = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;

/* «sáb 14 nov · 5 PM» (fecha del calendario de la ciudad, sin zona del navegador). */
const DOW: [string, string][] = [["dom", "Sun"], ["lun", "Mon"], ["mar", "Tue"], ["mié", "Wed"], ["jue", "Thu"], ["vie", "Fri"], ["sáb", "Sat"]];
export const diaVis = (ymd: string, es: boolean) => `${DOW[new Date(`${ymd}T12:00:00Z`).getUTCDay()]![es ? 0 : 1]} ${fechaCorta(ymd, es)}`;
export const cuandoVis = (ymd: string, min: number, es: boolean) => `${diaVis(ymd, es)} · ${horaInsc(min)}`;
export const horaVis = horaInsc;

/* Una hora que se puede pedir: un grupo de un día (visita o prueba, con cupo) o una hora del horario del negocio (cita, precalificación
   u oferta; sin cupo: el negocio confirma). */
export type HoraVis = { id: string; dia: string; min: number; libres: number | null };
export const slotDe = (dia: string, min: number) => `${dia}|${min}`;

/* El carro a cambio (opcional; flow «carro a cambio»): año, marca, modelo y millas. Nada más. */
export type TradeIn = { year: number; make: string; model: string; miles: number | null };

/* Estados (citaVals L66–71 con visit): PENDIENTE → CONFIRMADA → PASÓ | TE PROPONEN UN CAMBIO | NO PUDO | SIN RESPUESTA | CANCELADA. */
export const ESTADO_VIS: Record<string, Bi> = {
  pending: { es: "PENDIENTE", en: "PENDING" }, change_proposed: { es: "TE PROPONEN UN CAMBIO", en: "THEY PROPOSE A CHANGE" }, confirmed: { es: "CONFIRMADA", en: "CONFIRMED" },
  declined: { es: "NO PUDO", en: "COULD NOT" }, expired: { es: "SIN RESPUESTA", en: "NO REPLY" }, cancelled: { es: "CANCELADA", en: "CANCELLED" }, done: { es: "PASÓ", en: "HAPPENED" },
};

/* Iglesias · «Pedir fecha» (§4ie): la fecha deseada y la franja. La oficina confirma, propone otra o dice que no hay. */
export type Franja = "manana" | "tarde" | "noche";
export const FRANJAS: [Franja, string, string, number][] = [["manana", "En la mañana", "Morning", 540], ["tarde", "En la tarde", "Afternoon", 840], ["noche", "En la noche", "Evening", 1080]];
export const franjaL = (f: string | null | undefined, es: boolean) => { const x = FRANJAS.find((z) => z[0] === f); return x ? (es ? x[1] : x[2]) : ""; };
