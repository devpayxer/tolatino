/* Deporte (Fase 4 · 4ec · fase4-edu-ninos-deporte.md §2, §4ec y §5). Tipos y textos que también usa el navegador (sin consultas).
   Tipos por subcategoría (neg-deporte-kind.js KS L10–15): membresía (gym · trainer · box · clase · alberca) → «Membresías y contrato»;
   liga y cancha → «Liga e inscripciones»; lo demás (visita, club, tiro, nutri) va por contacto. To'Latino no cobra la membresía ni la
   penalidad del contrato: las dice antes de firmar (§6 #4 y #5). */
import type { Bi, HerrEdu } from "./inscripciones-comun";

export type KindDep = "gym" | "trainer" | "box" | "clase" | "alberca" | "liga" | "cancha" | "visita" | "club" | "tiro" | "nutri";
export const KS_DEP: [string, KindDep][] = [["Gimnasio", "gym"], ["Gimnasio 24 horas", "gym"], ["CrossFit", "gym"], ["Levantamiento de pesas", "gym"], ["Entrenador personal", "trainer"],
  ["Gimnasio de boxeo", "box"], ["MMA y jiu-jitsu", "box"], ["MMA & jiu-jitsu", "box"], ["Karate y taekwondo", "box"], ["Karate & taekwondo", "box"], ["Lucha", "box"],
  ["Zumba y baile fitness", "clase"], ["Clases grupales", "clase"], ["Spinning", "clase"], ["Yoga", "clase"], ["Pilates", "clase"], ["Estiramiento y movilidad", "clase"],
  ["Liga de fútbol", "liga"], ["Fútbol rápido", "liga"], ["Liga de básquetbol", "liga"], ["Voleibol", "liga"], ["Liga de béisbol y softbol", "liga"], ["Flag football", "liga"], ["Renta de canchas", "cancha"],
  ["Boliche", "visita"], ["Golf", "visita"], ["Tenis y pickleball", "visita"], ["Go-karts", "visita"], ["Patinaje sobre hielo", "visita"], ["Parque de patinetas", "visita"], ["Paintball y airsoft", "visita"],
  ["Paintball & airsoft", "visita"], ["Escalada", "visita"], ["Club de corredores", "club"], ["Club ciclista", "club"], ["Senderismo y aire libre", "club"], ["Pesca", "tiro"], ["Cacería y campo de tiro", "tiro"],
  ["Alberca y clases", "alberca"], ["Nutrición deportiva", "nutri"],
  // Subcategorías del catálogo que el prototipo no trae (§6 #20).
  ["Equitación", "visita"], ["Charreada y rodeo", "visita"], ["Centro recreativo", "visita"], ["Entrenadores y árbitros", "trainer"], ["Academia deportiva juvenil", "clase"], ["Organizador de torneos", "liga"]];
export const kindDepDe = (subs: string[], override?: string | null): KindDep => (override && KS_DEP.some((k) => k[1] === override) ? (override as KindDep) : KS_DEP.find((x) => subs.includes(x[0]))?.[1] ?? "gym");
export const esMembresia = (k: KindDep) => k === "gym" || k === "trainer" || k === "box" || k === "clase" || k === "alberca";
export const esLiga = (k: KindDep) => k === "liga" || k === "cancha";
export const LINEA_DEP: Bi = { es: "La cuota es la que ves: sin cargos escondidos, y si hay contrato, se dice.", en: "The fee is what you see: no hidden charges, and if there is a contract, we say so." };

export type HerrDep = {
  kind: KindDep; memb: boolean; liga: boolean;
  // Membresía: el contrato, lo que cuesta salirse antes, la cuota de inscripción, la guardería y los precios de sus ítems.
  contrato: number; salir: number; inscripcion: number; guarderia: boolean; esp: boolean;
  mes: { id: string; cents: number; g1: boolean } | null; dia: { id: string; cents: number } | null;
  // Liga: la temporada (cuota por equipo o por jugador, su depósito, su grupo con cupos), hasta cuándo y si acepta sueltos.
  temporada: { id: string; cents: number; dep: number; team: boolean; sem: number | null; grupo: { id: string; libres: number; inicio: string } | null } | null;
  hasta: string | null; sueltos: boolean; cancha: { id: string; cents: number } | null;
  edu: HerrEdu | null; hoy: string;
};
export const usdD = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
/* conL (deporte-kind L30): lo que dice la ficha de «¿Hay contrato?». */
export function contratoTexto(h: Pick<HerrDep, "contrato" | "salir">, es: boolean) {
  if (!h.contrato) return es ? "Sin contrato: cancelas cuando quieras" : "No contract: cancel any time";
  return (es ? `Contrato de ${h.contrato} meses` : `${h.contrato}-month contract`) + (h.salir ? (es ? ` · cancelar antes cuesta ${usdD(h.salir)}` : ` · cancelling early costs ${usdD(h.salir)}`) : (es ? " · cancelar antes no cuesta" : " · no early cancellation fee"));
}
export function tituloDep(h: Pick<HerrDep, "liga">, es: boolean) { return h.liga ? (es ? "Liga e inscripciones" : "League and signups") : (es ? "Membresías y contrato" : "Memberships and contract"); }
/* summary L308. */
export function resumenDep(h: HerrDep, es: boolean) {
  if (h.liga) {
    const t = h.temporada;
    if (!t) return es ? "Sin temporada abierta" : "No open season";
    const l = t.grupo?.libres ?? 0;
    return [`${usdD(t.cents)} ${t.team ? (es ? "por equipo" : "per team") : (es ? "por jugador" : "per player")}`, t.dep ? (es ? `depósito ${usdD(t.dep)}` : `deposit ${usdD(t.dep)}`) : (es ? "sin depósito" : "no deposit"),
      l ? (es ? `quedan ${l}` : `${l} left`) : (es ? "lista de espera" : "waitlist")].join(" · ");
  }
  return [contratoTexto(h, es), h.mes ? (es ? `${usdD(h.mes.cents)} al mes` : `${usdD(h.mes.cents)} a month`) : "", h.inscripcion ? (es ? `inscripción ${usdD(h.inscripcion)}` : `signup ${usdD(h.inscripcion)}`) : (es ? "sin cuota de inscripción" : "no signup fee")].filter(Boolean).join(" · ");
}
