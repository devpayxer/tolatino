/* Inscripciones (motor común de Educación, Niños y Deporte; 4ea · fase4-edu-ninos-deporte.md §2 y §5). Tipos y textos que
   también usa el navegador (sin consultas). Cinco formas de vender (neg-edu-listing.js priceFor L60–65, metaOf L94–99):
   curso (grupo con fecha de inicio, semanas, horas y cupo; la matrícula aparta el cupo y se descuenta del total) · mes · semana ·
   clase · hora. Solo la matrícula de un curso pasa por la app (4ee); lo demás se paga en el lugar. El vocabulario cambia por
   rubro (VOC, neg-edu-flow.js L13–19) para que Iglesias, Bienes Raíces y Venta de Autos lo reusen después. */
export type Bi = { es: string; en: string };
export type RubroInsc = "edu" | "ninos" | "dep";
export type KindInsc = "curso" | "mes" | "semana" | "clase" | "hora";
export const KINDS_INSC: KindInsc[] = ["curso", "mes", "semana", "clase", "hora"];
export const rubroInsc = (cat: string): RubroInsc | null => (cat === "NEG-EDU" ? "edu" : cat === "NEG-NINOS" ? "ninos" : cat === "NEG-DEPORTE" ? "dep" : null);
export const PLANES = [0, 3, 6, 12] as const;

/* Cómo se dice cada forma (editor, herramienta y tarjeta). */
export const FORMA: Record<KindInsc, { t: Bi; por: Bi }> = {
  curso: { t: { es: "Curso completo", en: "Full course" }, por: { es: "el curso", en: "the course" } },
  mes: { t: { es: "Por mes", en: "Per month" }, por: { es: "al mes", en: "a month" } },
  semana: { t: { es: "Por semana", en: "Per week" }, por: { es: "la semana", en: "a week" } },
  clase: { t: { es: "Por clase", en: "Per class" }, por: { es: "la clase", en: "a class" } },
  hora: { t: { es: "Por hora", en: "Per hour" }, por: { es: "la hora", en: "an hour" } },
};
/* El vocabulario de cada rubro (VOC del prototipo). */
export const VOC: Record<RubroInsc, { grupo: Bi; grupos: Bi; mat: Bi; inscribir: Bi }> = {
  edu: { grupo: { es: "grupo", en: "group" }, grupos: { es: "Grupos y cupos", en: "Groups and seats" }, mat: { es: "Matrícula", en: "Registration" }, inscribir: { es: "Inscribirme", en: "Enroll" } },
  ninos: { grupo: { es: "sesión", en: "session" }, grupos: { es: "Cupos y licencia", en: "Openings and license" }, mat: { es: "Inscripción", en: "Signup fee" }, inscribir: { es: "Inscribir", en: "Enroll" } },
  dep: { grupo: { es: "temporada", en: "season" }, grupos: { es: "Membresías y contrato", en: "Memberships and contract" }, mat: { es: "Depósito", en: "Deposit" }, inscribir: { es: "Inscribirme", en: "Sign up" } },
};
/* Las líneas fijas (verbatim; nunca se suavizan). */
export const LINEA_EDU: Bi = { es: "El precio del curso es el total: libros y examen incluidos o dichos aparte.", en: "The course price is the total: books and exam included or listed separately." };

export type GrupoH = { id: string; label: Bi; inicio: string; fin: string | null; dows: number[]; min: number | null; total: number; fuera: number; ocupados: number; libres: number; estado: "open" | "cancelled" | "started" | "finished"; enLinea: boolean };
export type CursoH = { id: string; name: Bi; k: KindInsc; cents: number; mat: number; plan: number; g1: boolean; sem: number | null; hrs: number | null; cert: Bi | null; oficial: boolean; grupos: GrupoH[]; vende: boolean };
export type HerrEdu = { hoy: string; how: { presencial: boolean; linea: boolean; hibrido: boolean; esp: boolean }; cursos: CursoH[]; abiertos: number; libres: number; gratis: number };

export const usdI = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: c % 100 ? 2 : 0, minimumFractionDigits: c % 100 ? 2 : 0 })}`;
const MES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], MES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/* «12 oct» / «Oct 12» (fecha del calendario, sin hora: nunca pasa por la zona del navegador). */
export function fechaCorta(ymd: string, es: boolean) {
  const [, m, d] = ymd.split("-").map(Number);
  return es ? `${d} ${MES_ES[(m ?? 1) - 1]}` : `${MES_EN[(m ?? 1) - 1]} ${d}`;
}
export const DIAS_INSC: [number, string, string][] = [[1, "Lun", "Mon"], [2, "Mar", "Tue"], [3, "Mié", "Wed"], [4, "Jue", "Thu"], [5, "Vie", "Fri"], [6, "Sáb", "Sat"], [0, "Dom", "Sun"]];
export function horaInsc(min: number) { const h = Math.floor(min / 60), m = min % 60, h12 = h % 12 || 12; return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`; }
/* «Lun y Mié 7 PM»: la etiqueta que propone el panel al abrir un grupo (el negocio la puede cambiar). */
export function etiquetaGrupo(dows: number[], min: number | null, es: boolean) {
  const L = DIAS_INSC.filter((d) => dows.includes(d[0])).map((d) => (es ? d[1] : d[2]));
  const dias = L.length <= 1 ? L.join("") : `${L.slice(0, -1).join(", ")} ${es ? "y" : "&"} ${L[L.length - 1]}`;
  return [dias, min != null ? horaInsc(min) : ""].filter(Boolean).join(" ");
}
export function tituloEdu(es: boolean) { return es ? "Grupos y cupos" : "Groups and seats"; }
/* Lo que dice la fila de «Tu herramienta» y el Super Admin (summary L306). */
export function resumenEdu(h: HerrEdu, es: boolean) {
  const how = [h.how.linea ? (es ? "también en línea" : "also online") : "", h.how.hibrido ? (es ? "híbrido" : "hybrid") : ""].filter(Boolean);
  const plan = h.cursos.some((x) => x.k === "curso" && x.plan > 0);
  return [es ? `${h.abiertos} grupos abiertos` : `${h.abiertos} open groups`, es ? `${h.libres} cupos libres` : `${h.libres} seats left`, ...how, plan ? (es ? "con plan de pagos" : "with payment plan") : ""].filter(Boolean).join(" · ");
}
/* «$80 al mes» · «$3,900 el curso». */
export const precioInsc = (cents: number, k: KindInsc, es: boolean) => `${usdI(cents)} ${es ? FORMA[k].por.es : FORMA[k].por.en}`;
/* El plan de pagos sin intereses: «12 pagos de $517». */
export function planTexto(cents: number, mat: number, n: number, es: boolean) {
  if (!n) return es ? "El resto el primer día" : "The rest on day one";
  const cuota = Math.ceil((cents - mat) / n / 100) * 100;
  return es ? `${n} pagos de ${usdI(cuota)} sin intereses` : `${n} payments of ${usdI(cuota)} interest free`;
}
export const sumarDiasI = (ymd: string, n: number) => { const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const dowDe = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay();
