/* Niños (Fase 4 · 4eb · fase4-edu-ninos-deporte.md §2, §3 y §4eb). Tipos y textos que también usa el navegador (sin consultas).
   Tipos por subcategoría (neg-ninos-kind.js KS L9–16): cuidado (guardería y cuidado en casa: cupos por edad y licencia del DHS) y
   lo demás (after school, campamentos, clases, terapias, juego, fiestas, familia, servicios) sobre el motor de Educación. Niñera y
   nana (sin local) quedan solo con contacto (§6 #10). */
import type { Bi, HerrEdu } from "./inscripciones-comun";

export type KindNinos = "guard" | "casa" | "ninera" | "after" | "camp" | "clase" | "terapia" | "juego" | "fiesta" | "familia" | "svc";
export const KS_NINOS: [string, KindNinos][] = [["Guardería", "guard"], ["Preescolar", "guard"], ["Programa Pre-K", "guard"], ["Programas subsidiados", "guard"], ["Cuidado infantil en casa", "casa"],
  ["Cuidado de noche y fin de semana", "casa"], ["Niñera por horas", "ninera"], ["Nana de tiempo completo", "ninera"], ["Cuidado después de la escuela", "after"], ["Tutoría para niños", "after"],
  ["Programas bilingües", "after"], ["Campamento de verano", "camp"], ["Campamento de invierno y primavera", "camp"], ["Terapias infantiles", "terapia"], ["Apoyo a necesidades especiales", "terapia"],
  ["Área de juegos techada", "juego"], ["Parque de trampolines", "juego"], ["Entretenimiento de fiestas infantiles", "fiesta"], ["Apoyo de lactancia y recién nacido", "familia"], ["Clases para padres", "familia"],
  ["Ayuda con WIC y asistencia familiar", "familia"], ["Ayuda con inscripción escolar", "familia"], ["Recursos de acogida y adopción", "familia"], ["Cortes de cabello para niños", "svc"],
  ["Fotografía infantil", "svc"], ["Renta de artículos de bebé", "svc"]];
export const KINDS_NINOS: [KindNinos, string][] = [["guard", "Guardería"], ["casa", "Cuidado en casa"], ["ninera", "Niñera o nana"], ["after", "Después de la escuela"], ["camp", "Campamento"], ["clase", "Clases y deporte"],
  ["terapia", "Terapias"], ["juego", "Lugar de juegos"], ["fiesta", "Fiestas infantiles"], ["familia", "Familia y recién nacido"], ["svc", "Servicios para niños"]];
export const kindNinosDe = (subs: string[], override?: string | null): KindNinos => (override && KINDS_NINOS.some((k) => k[0] === override) ? (override as KindNinos) : KS_NINOS.find((x) => subs.includes(x[0]))?.[1] ?? "clase");
/* Los grados que se pueden poner en vez de la edad (lib/ninos-privado.ts los valida en el servidor). */
export const GRADOS = ["Pre-K", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
export const esCuidado = (k: KindNinos) => k === "guard" || k === "casa";
/* Las bandas de edad de la semilla (dash2-cat.js AGES L131). Cada lugar define las suyas dentro de su licencia (§6 #11). */
export const BANDAS_GUARD: { min: number; max: number; label: Bi }[] = [{ min: 2, max: 2, label: { es: "2 años", en: "Age 2" } }, { min: 3, max: 3, label: { es: "3 años", en: "Age 3" } }, { min: 4, max: 5, label: { es: "4 y 5 años", en: "Ages 4 and 5" } }];
export const LINEA_NINOS: Bi = { es: "Toda guardería muestra su licencia del estado; si no la tiene, se dice.", en: "Every daycare shows its state license; if it has none, we say so." };

export type LicNinos = { estado: "valid" | "review" | "expired" | "none"; numero: string | null; vence: string | null };
export type BandaH = { id: string; label: Bi; min: number; max: number; libres: number };
export type HerrNinos = {
  kind: KindNinos; forzado: boolean; cuidado: boolean; edad: [number, number] | null; lic: LicNinos;
  // Cuidado (guardería y en casa): cupos por edad, precio por semana sin subsidio y lo que ofrece.
  bandas: BandaH[]; semana: number | null; ccis: boolean; ext: boolean; comidas: boolean; noche: boolean; casa: boolean;
  // Lo demás: lo que ofrece y la espera de la evaluación (terapias).
  esp: boolean; transporte: boolean; medicaid: boolean; espera: number | null;
  edu: HerrEdu | null; // «Grupos y cupos» sobre el motor de Educación (sin plan de pagos)
  // Puede recibir solicitudes por la app: el cuidado solo con licencia del DHS vigente (§6 #9); niñera y nana nunca (§6 #10).
  recibe: boolean;
};
export const usdN0 = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
export function libresNinos(h: HerrNinos) { return h.bandas.reduce((a, b) => a + b.libres, 0); }
export function edadTexto(e: [number, number] | null, es: boolean) {
  if (!e) return es ? "Todas las edades" : "All ages";
  if (e[0] === 0 && e[1] <= 1) return es ? "Bebés hasta 1 año" : "Babies to age 1";
  if (e[0] === 0) return es ? `Bebés a ${e[1]} años` : `Babies to ${e[1]}`;
  return es ? `${e[0]} a ${e[1]} años` : `Ages ${e[0]}–${e[1]}`;
}
export function tituloNinos(h: Pick<HerrNinos, "cuidado">, es: boolean) { return h.cuidado ? (es ? "Cupos y licencia" : "Openings and license") : (es ? "Grupos y cupos" : "Groups and seats"); }
/* summary L307: «Quedan 3 cupos · acepta CCIS · $235 la semana · turno de noche». */
export function resumenNinos(h: HerrNinos, es: boolean) {
  if (!h.cuidado) return null;
  const tot = libresNinos(h);
  return [tot ? (es ? `Quedan ${tot} cupos` : `${tot} openings left`) : (es ? "Lista de espera" : "Waitlist"), h.ccis ? (es ? "acepta CCIS" : "takes CCIS") : "",
    h.semana ? (es ? `${usdN0(h.semana)} la semana` : `${usdN0(h.semana)} a week`) : "", h.noche ? (es ? "turno de noche" : "night shift") : ""].filter(Boolean).join(" · ");
}
export function licTexto(l: LicNinos, es: boolean) {
  return l.estado === "valid" ? (es ? "Licencia del DHS verificada" : "DHS license verified") : l.estado === "review" ? (es ? "Licencia en trámite" : "License in process")
    : l.estado === "expired" ? (es ? "Licencia vencida" : "License expired") : (es ? "No tiene licencia del estado" : "No state license");
}
