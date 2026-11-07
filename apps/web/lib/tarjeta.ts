/* Contenido de la tarjeta de negocio en una lista (prototipo cardItem): línea de datos, estado del horario, chips,
   botón principal. Funciones puras: las usa el servidor para armar la tarjeta; la pantalla solo la pinta. */
import type { Lang } from "./idioma";

type Rango = [string, string];
type Dia = { weekday: number; open: boolean; ranges: Rango[] };
const DIAS = { es: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };

/* «20:00» → «8 PM», «20:30» → «8:30 PM». */
export function hora12(hm: string) {
  const [h = 0, m = 0] = hm.split(":").map(Number);
  const H = h % 24, s = H < 12 ? "AM" : "PM", h12 = H % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${s}` : `${h12} ${s}`;
}
const min = (hm: string) => { const [h = 0, m = 0] = hm.split(":").map(Number); return h * 60 + m; };

/* «Abierto · hasta 8 PM» · «Cerrado · abre 11 AM» · «Cerrado · abre vie 8 AM» · «Abierto · 24 horas». */
export function estado(dias: Dia[], ahora: { dow: number; hm: string }, abierto: boolean, lang: Lang, nota?: { es: string; en: string } | null, cerradoHoy = false, cerradoTemp = false) {
  const es = lang === "es";
  if (cerradoTemp) return { open: false, text: es ? "Cerrado temporalmente" : "Temporarily closed" }; // To'Latino lo cerró unos días
  if (cerradoHoy) {
    // «Cerrar por hoy» (panel · Hoy): hoy no abre; se busca desde mañana.
    for (let k = 1; k <= 7; k++) {
      const d = dias.find((x) => x.weekday === (ahora.dow + k) % 7), a = d?.open ? d.ranges.map(([x]) => x).sort((x, y) => min(x) - min(y))[0] : undefined;
      if (a) return { open: false, text: `${es ? "Cerrado hoy · abre" : "Closed today · opens"} ${k === 1 ? (es ? "mañana" : "tomorrow") : DIAS[lang][(ahora.dow + k) % 7]} ${hora12(a)}` };
    }
    return { open: false, text: es ? "Cerrado hoy" : "Closed today" };
  }
  if (nota) { const x = nota[lang]; return { open: true, text: x.charAt(0).toUpperCase() + x.slice(1) }; }
  const t = min(ahora.hm), de = (d: number) => dias.find((x) => x.weekday === ((d % 7) + 7) % 7);
  if (abierto) {
    const hoy = de(ahora.dow), ayer = de(ahora.dow - 1);
    const r = hoy?.ranges.find(([a, b]) => min(a) <= t && (min(b) > t || min(b) <= min(a)))
      ?? ayer?.ranges.find(([a, b]) => min(b) <= min(a) && t < min(b));
    if (r && r[0] === r[1]) return { open: true, text: es ? "Abierto · 24 horas" : "Open · 24 hours" };
    return { open: true, text: r ? `${es ? "Abierto · hasta" : "Open · until"} ${hora12(r[1])}` : es ? "Abierto" : "Open" };
  }
  const hoy = de(ahora.dow);
  const luego = hoy?.open ? hoy.ranges.map(([a]) => a).filter((a) => min(a) > t).sort((a, b) => min(a) - min(b))[0] : undefined;
  if (luego) return { open: false, text: `${es ? "Cerrado · abre" : "Closed · opens"} ${hora12(luego)}` };
  for (let k = 1; k <= 7; k++) {
    const d = de(ahora.dow + k);
    const a = d?.open ? d.ranges.map(([x]) => x).sort((x, y) => min(x) - min(y))[0] : undefined;
    if (a) return { open: false, text: `${es ? "Cerrado · abre" : "Closed · opens"} ${k === 1 ? (es ? "mañana" : "tomorrow") : DIAS[lang][(ahora.dow + k) % 7]} ${hora12(a)}` };
  }
  return { open: false, text: es ? "Cerrado" : "Closed" };
}

/* Familia de la categoría para el botón principal (prototipo cardItem: b.edu, b.trans, b.tienda…). */
const EDU = new Set(["NEG-EDU", "NEG-NINOS", "NEG-DEPORTE", "NEG-FE", "NEG-INMUEBLE", "NEG-DEALER"]);
const CITA = new Set(["NEG-BELL", "NEG-AUTO", "NEG-HOGAR", "NEG-SALUD", "NEG-PRO", "NEG-FIESTA"]);
export type Accion = "ficha" | "llamar" | "llegar";

export function botonPrincipal(cat: string, pro: boolean, tags: string[], lang: Lang): { label: string; icon: string; accion: Accion } {
  const es = lang === "es", L = (a: string, b: string) => (es ? a : b);
  const llamar = { label: L("Llamar", "Call"), icon: "phone", accion: "llamar" as const };
  const llegar = { label: L("Cómo llegar", "Directions"), icon: "pin", accion: "llegar" as const };
  if (EDU.has(cat)) {
    if (!pro) return llamar;
    if (cat === "NEG-DEALER") return { label: L("Prueba de manejo", "Test drive"), icon: "calendar", accion: "ficha" };
    if (cat === "NEG-INMUEBLE") return { label: L("Pedir visita", "Request a visit"), icon: "calendar", accion: "ficha" };
    // 4id · Iglesias: a misa y al culto no se inscribe nadie (neg-fe-kind.js btnOf L104: «Ver detalles»).
    if (cat === "NEG-FE") return { label: L("Ver detalles", "See details"), icon: "calendar", accion: "ficha" };
    return { label: L("Inscribirme", "Enroll"), icon: "calendar", accion: "ficha" };
  }
  if (cat === "NEG-TRANS") return pro ? { label: L("Reservar", "Book"), icon: "calendar", accion: "ficha" } : llamar;
  if (cat === "NEG-TIENDA") return pro && tags.includes("apartado") ? { label: L("Apartar", "Hold"), icon: "bag", accion: "ficha" } : llegar;
  if (cat === "NEG-NOCHE") return tags.includes("lista") || tags.includes("mesas") ? { label: L("Lista y mesas", "List & tables"), icon: "drink", accion: "ficha" } : llegar;
  if (cat === "NEG-MERC") return tags.includes("pickup") || tags.includes("envio") ? { label: L("Ordenar", "Order"), icon: "bag", accion: "ficha" } : llegar;
  if (["NEG-SALUD", "NEG-PRO", "NEG-FIESTA"].includes(cat) && !tags.includes("cita")) return llegar;
  if (CITA.has(cat)) return { label: "Booking", icon: "calendar", accion: "ficha" };
  return { label: L("Ordenar", "Order"), icon: "bag", accion: "ficha" };
}

type BiOpt = { es?: string; en?: string } | undefined;
/* Chips de la tarjeta: tiempo, costo y el dato verificado propio de cada categoría. */
export function chipsTarjeta(cat: string, pro: boolean, tags: string[], attrs: Record<string, unknown>, lang: Lang) {
  const es = lang === "es", tj = (attrs.tarjeta ?? {}) as { eta?: BiOpt; fee?: BiOpt };
  const out: { variant: string; label: string }[] = [];
  if (tj.eta?.[lang]) out.push({ variant: "slot", label: tj.eta[lang]! });
  if (tj.fee?.[lang]) out.push({ variant: "feature", label: tj.fee[lang]! });
  if (!pro) return out;
  const v = (label: string) => out.push({ variant: "verified", label });
  if (cat === "NEG-SALUD" && tags.includes("medesp")) v(es ? "El médico habla español" : "Doctor speaks Spanish");
  const licL = attrs.licL as [string, string] | undefined;
  // Solo con una licencia VERIFICADA (la marca «lic» la pone el servidor al verificarla: licencias_refrescar).
  if (cat === "NEG-PRO" && licL && tags.includes("lic")) v(licL[es ? 0 : 1]);
  const nt = attrs.nt as { edad?: number; dress?: [string, string] } | undefined;
  if (cat === "NEG-NOCHE" && nt) v(`${es ? "Edad " : "Age "}${nt.edad}+${nt.dress ? " · " + nt.dress[es ? 0 : 1] : ""}`);
  if (cat === "NEG-MERC" && tags.includes("pesa")) v(es ? "Pesan delante de ti" : "Weighed in front of you");
  const edad = attrs.edad as [number, number] | undefined;
  if (cat === "NEG-NINOS" && Array.isArray(edad))
    v(`${es ? "De " : "Ages "}${edad[0]}${es ? " a " : "–"}${edad[1]}${es ? " años" : ""}${tags.includes("lic") ? (es ? " · con licencia" : " · licensed") : ""}`);
  const cap = attrs.cap as number | undefined;
  if (cat === "NEG-FIESTA" && cap) v(`${es ? "Hasta " : "Up to "}${cap}${es ? " invitados" : " guests"}`);
  return out;
}

/* «MOFONGO · COMIDA CRIOLLA · 0.4 MI» (Pro: dos subcategorías; Free: una). Hogar y a domicilio: el radio que cubre. */
export function metaTarjeta(cat: string, pro: boolean, subs: string[], mi: number | null, radius: number | null, fromHome: boolean, lang: Lang) {
  const es = lang === "es";
  const que = (pro ? subs.slice(0, 2) : subs.slice(0, 1)).join(" · ");
  const donde = cat === "NEG-HOGAR" && radius ? `${es ? "HASTA " : "UP TO "}${radius} MI`
    : fromHome && radius ? `${es ? "A DOMICILIO · HASTA " : "AT HOME · UP TO "}${radius} MI`
    : mi != null ? `${mi} MI` : "";
  return [que.toUpperCase(), donde].filter(Boolean).join(" · ");
}

/* Reseñas: con 5 o más, estrellas; con menos, «3 reseñas» o «Nuevo · en To'Latino» (prototipo cardItem). */
export function resenas(rating: number | null, n: number, lang: Lang) {
  const es = lang === "es";
  if (n >= 5) return { rating: rating?.toFixed(1) ?? "", reviews: n, note: undefined };
  if (n > 0) return { rating: `${n} ${es ? "reseñas" : "reviews"}`, reviews: n, note: undefined };
  return { rating: es ? "Nuevo" : "New", reviews: 0, note: es ? "· en To'Latino" : "· on To'Latino" };
}

/* Lo que la pantalla recibe por tarjeta (todo listo para pintar con BusinessCard). */
export type Tarjeta = {
  id: string; plan: "pro" | "free"; name: string; verified: boolean; meta: string; rating: string; reviews: number; reviewsNote?: string;
  status: string; open: boolean; photo: string | null; chips: { variant: string; label: string }[]; offer: string | null;
  cta: string; ctaIcon: string; accion: Accion; saved: boolean; phone: string | null; lat: number | null; lng: number | null;
};
