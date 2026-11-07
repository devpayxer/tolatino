"use client";
/* Reseñas en la ficha (prototipo «Resumen · reseñas», «Ficha · reseñas», «Reseñas · reportar», «Reseñas · foto» y sus
   versiones desktop). Cada reseña es la ReviewCard del sistema de diseño. Las cifras, las barras y «lo que importa»
   llegan calculadas del servidor (reseñas visibles); aquí solo se muestran. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import type { ResumenResenas, Tarjeta } from "@/lib/resenas";
import { masResenas, reportarRes, utilResena } from "./acciones-resena";

type N = "Icon" | "Button" | "Chip" | "ReviewCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, ReviewCard } = UI as unknown as Record<N, ComponentType<any>>;

const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const BIEN = "var(--tl-open-text)", MAL = "var(--tl-danger)", NEUTRO = "var(--tl-text-3)";

/* «AHORA», «AYER», «HACE 3 DÍAS», «HACE 2 SEMANAS», «HACE 1 MES»… (revWhen). */
export function revWhen(d: number, es: boolean) {
  if (d <= 0) return es ? "AHORA" : "JUST NOW";
  if (d === 1) return es ? "AYER" : "YESTERDAY";
  if (d < 7) return es ? `HACE ${d} DÍAS` : `${d} DAYS AGO`;
  if (d < 14) return es ? "HACE 1 SEMANA" : "1 WEEK AGO";
  if (d < 30) return es ? `HACE ${Math.floor(d / 7)} SEMANAS` : `${Math.floor(d / 7)} WEEKS AGO`;
  if (d < 60) return es ? "HACE 1 MES" : "1 MONTH AGO";
  return es ? `HACE ${Math.floor(d / 30)} MESES` : `${Math.floor(d / 30)} MONTHS AGO`;
}
const SRC: Record<Tarjeta["src"], [string, string, string]> = {
  dl: ["VERIFICADA · DELIVERY", "VERIFIED · DELIVERY", "signal"], pk: ["VERIFICADA · PICKUP", "VERIFIED · PICKUP", "signal"],
  rsv: ["VERIFICADA · RESERVÓ", "VERIFIED · BOOKED", "signal"], cita: ["VERIFICADA · CON CITA", "VERIFIED · BOOKED", "signal"], vis: ["VISITANTE", "VISITOR", "neutral"],
};

/* Lo que dice la tarjeta de los datos (revCard · Comida): cómo llegó, a tiempo / N min tarde, cuánto esperó, precio. */
function hechos(c: Tarjeta, es: boolean) {
  const E2 = (a: string, b: string) => (es ? a : b), dl = c.src === "dl", ord = c.src === "dl" || c.src === "pk", f: { icon: string; label: string; color: string }[] = [];
  // Hogar y Auto (4g): el dato de la visita (franja, lo cotizado contra lo cobrado, algo extra con su OK) y lo que contestó.
  const A = c.answers, F = c.facts;
  // Noche (4nd · L87–91): cover el publicado / cobraron más, fila como decía / más larga, reglas, seguro, música, trato en la puerta.
  if (["coverOk", "filaOk", "reglas", "segura", "musica"].some((k) => k in A) || F.pax != null) {
    const add = (ok: boolean | null, icon: string, label: string) => f.push({ icon, label, color: ok === null ? NEUTRO : ok ? BIEN : MAL });
    if (A.coverOk != null) add(A.coverOk === 1, "dollar", A.coverOk === 1 ? E2("Cover el publicado", "Posted cover") : E2("Cobraron más cover", "Charged more cover"));
    if (A.filaOk) add(A.filaOk === "a" ? true : A.filaOk === "c" ? false : null, "clock", { a: E2("Fila como decía", "Line as posted"), b: E2("Fila un poco más larga", "Line a bit longer"), c: E2("Fila más larga", "Line much longer") }[A.filaOk]);
    if (A.segura === 0) add(false, "shield", E2("No se sintió seguro", "Did not feel safe"));
    if (A.reglas != null) add(A.reglas === 1, "check", A.reglas === 1 ? E2("Reglas claras", "Clear rules") : E2("Reglas poco claras", "Unclear rules"));
    if (A.musica != null) add(A.musica === 1, "drink", A.musica === 1 ? E2("Música como anunciaron", "Music as announced") : E2("Otra música", "Different music"));
    if (A.trato != null && A.trato !== 0) add(A.trato === 1, "bubble", A.trato === 1 ? E2("Buen trato en la puerta", "Treated well at the door") : E2("Mal trato en la puerta", "Treated badly at the door"));
    return f.slice(0, 6);
  }
  // Fiestas y Transporte (4z): la fecha respetada (del dato), a la hora, lo del paquete / el precio cerrado, fotos, limpieza,
  // salida y llegada, manejo, equipaje, trato.
  if (["llegaron", "fotosOk", "limpio", "fechaOk", "paquete", "cerrado", "salio", "llego", "manejo", "carga"].some((k) => k in A) || F.dia != null) {
    const add = (ok: boolean | null, icon: string, label: string) => f.push({ icon, label, color: ok === null ? NEUTRO : ok ? BIEN : MAL });
    const fiesta = ["llegaron", "fotosOk", "limpio", "fechaOk", "paquete"].some((k) => k in A);
    if (F.dia != null && fiesta) add(true, "calendar", E2("Respetaron la fecha", "Kept the date"));
    else if (A.fechaOk != null) add(A.fechaOk === 1, "calendar", A.fechaOk === 1 ? E2("Respetaron la fecha", "Kept the date") : E2("Cancelaron o cambiaron la fecha", "Cancelled or changed the date"));
    if (A.llegaron) add(A.llegaron === "a" ? true : A.llegaron === "c" ? false : null, "clock", { a: E2("Llegaron a la hora", "Arrived on time"), b: E2("Llegaron un poco tarde", "Arrived a bit late"), c: E2("Llegaron muy tarde", "Arrived very late") }[A.llegaron]);
    if (A.paquete != null) add(A.paquete === 1, "dollar", A.paquete === 1 ? E2("Cobraron lo del paquete", "Charged the package price") : E2("Cobraron más del paquete", "Charged more than the package"));
    if (A.fotosOk != null && A.fotosOk !== 0) add(A.fotosOk === 1, "image", A.fotosOk === 1 ? E2("Quedó como en las fotos", "Looked like the photos") : E2("No quedó como en las fotos", "Did not look like the photos"));
    if (A.limpio != null) add(A.limpio === 1, "check", A.limpio === 1 ? E2("Recogieron y limpiaron", "Picked up and cleaned") : E2("No recogieron", "Did not pick up"));
    if (A.cerrado != null) add(A.cerrado === 1, "dollar", A.cerrado === 1 ? E2("Cobró el precio cerrado", "Charged the fixed price") : E2("Cobró más del precio cerrado", "Charged more than the fixed price"));
    if (A.salio) add(A.salio === "a" ? true : A.salio === "c" ? false : null, "clock", { a: E2("Salió a la hora", "Left on time"), b: E2("Salió hasta 15 min tarde", "Left up to 15 min late"), c: E2("Salió tarde", "Left late") }[A.salio]);
    if (A.llego) add(A.llego === "a" ? true : A.llego === "c" ? false : null, "check", { a: E2("Llegó a la hora", "Arrived on time"), b: E2("Llegó un poco tarde", "Arrived a bit late"), c: E2("Llegó muy tarde", "Arrived very late") }[A.llego]);
    if (A.manejo != null) add(A.manejo === 1, "shield", A.manejo === 1 ? E2("Manejo seguro", "Safe driving") : E2("Manejo inseguro", "Unsafe driving"));
    if (A.carga != null && A.carga !== 0) add(A.carga === 1, "bag", A.carga === 1 ? E2("Equipaje bien", "Luggage fine") : E2("Equipaje dañado o perdido", "Luggage damaged or lost"));
    if (A.trato != null && A.trato !== 0) add(A.trato === 1, "bubble", A.trato === 1 ? E2("Buen trato", "Treated well") : E2("Mal trato", "Treated badly"));
    return f.slice(0, 6);
  }
  // Mercados y Tiendas (4s): foto de cada peso, fresco, precio del estante / de la caja, sustituciones, talla, apartado, cambios.
  if (["fresco", "estante", "sust", "pesaron", "peso", "caja", "tenian", "talla", "guardo", "cambio"].some((k) => k in A) || F.nArt != null) {
    const add = (ok: boolean | null, icon: string, label: string) => f.push({ icon, label, color: ok === null ? NEUTRO : ok ? BIEN : MAL });
    if (F.fotoPeso != null) add(F.fotoPeso, "camera", F.fotoPeso ? E2("Foto de cada peso", "Photo of each weight") : E2("Faltó la foto de algún peso", "A weight photo was missing"));
    if (A.pesaron != null) add(A.pesaron === 1, "check", A.pesaron === 1 ? E2("Pesaron delante", "Weighed in front") : E2("No pesaron delante", "Did not weigh in front"));
    if (A.peso != null) add(A.peso === 1, "dollar", A.peso === 1 ? E2("Cobraron el peso real", "Charged the real weight") : E2("Cobraron más del peso", "Charged over the weight"));
    if (A.estante != null) add(A.estante === 1, "dollar", A.estante === 1 ? E2("La caja cobró el precio del estante", "Register charged the shelf price") : E2("La caja no cobró el precio del estante", "Register did not charge the shelf price"));
    if (A.caja != null) add(A.caja === 1, "dollar", A.caja === 1 ? E2("Precio de la caja = el publicado", "Register price = posted price") : E2("Cobraron más en la caja", "Charged more at the register"));
    if (A.sust) add(A.sust === "ok" ? true : A.sust === "no" ? false : null, "bubble", { ok: E2("Llamaron antes de sustituir", "Called before swapping"), na: E2("No hizo falta sustituir", "No swaps needed"), no: E2("Cambiaron algo sin preguntar", "Swapped without asking") }[A.sust]);
    if (A.fresco != null && A.fresco !== 0) add(A.fresco === 1, "check", A.fresco === 1 ? E2("Todo fresco", "All fresh") : E2("No estaba fresco", "Not fresh"));
    if (A.tenian != null) add(A.tenian === 1, "bag", A.tenian === 1 ? E2("Lo tenían como decía", "Had it as listed") : E2("No lo tenían como decía", "Did not have it as listed"));
    if (A.talla != null && A.talla !== 0) add(A.talla === 1, "check", A.talla === 1 ? E2("La talla correcta", "Right size") : E2("Talla equivocada", "Wrong size"));
    if (A.guardo != null) add(A.guardo === 1, "clock", A.guardo === 1 ? E2("Guardaron el apartado", "Kept the hold") : E2("No guardaron el apartado", "Did not keep the hold"));
    if (A.cambio && A.cambio !== "na") add(A.cambio === "ok", "check", A.cambio === "ok" ? E2("Cambios sin problema", "Exchanges, no problem") : E2("No aceptaron el cambio", "Refused the exchange"));
    if (A.trato != null && A.trato !== 0) add(A.trato === 1, "bubble", A.trato === 1 ? E2("Con respeto", "With respect") : E2("Mal trato", "Treated badly"));
    return f.slice(0, 6);
  }
  // Doctores y Profesionales (4m): seguro aceptado, idioma, espera, explicación, cobro, lo que podía por ley, fecha, trato.
  if (["lengua", "explico", "cobro", "ley", "fecha", "seguro"].some((k) => k in A) || F.seg != null || F.hired != null) {
    const add = (ok: boolean | null, icon: string, label: string) => f.push({ icon, label, color: ok === null ? NEUTRO : ok ? BIEN : MAL });
    if (F.seg) add(!!F.segOk, "shield", F.segOk ? E2("Aceptaron su seguro", "Took their insurance") : E2("No aceptaron su seguro · avisaron antes", "Did not take their insurance · told them first"));
    else if (A.seguro) add(A.seguro === "sin" ? null : A.seguro === "si", "shield", A.seguro === "si" ? E2("Aceptaron su seguro", "Took their insurance") : A.seguro === "no" ? E2("No aceptaron su seguro", "Did not take their insurance") : E2("Fue sin seguro", "Went uninsured"));
    if (F.hired != null && F.tot != null && F.hired) add(true, "dollar", E2(`Total por escrito: $${Math.round(F.tot / 100).toLocaleString("en-US")}`, `Written total: $${Math.round(F.tot / 100).toLocaleString("en-US")}`));
    if (A.lengua) add(A.lengua === "no" ? false : true, "bubble", A.lengua === "es" ? ("ley" in A || "fecha" in A || F.hired != null ? E2("Lo atendieron en español", "Served in Spanish") : E2("El médico habló español", "The doctor spoke Spanish")) : A.lengua === "int" ? E2("Con intérprete", "With an interpreter") : E2("No lo entendieron", "Not understood"));
    if (A.wait) add(A.wait === "a" ? true : A.wait === "c" ? false : null, "clock", { a: E2("Lo atendieron a la hora", "Seen on time"), b: E2("Esperó hasta 30 min", "Waited up to 30 min"), c: E2("Esperó más de 30 min", "Waited over 30 min") }[A.wait]);
    if (A.explico != null && A.explico !== 0) add(A.explico === 1, "check", A.explico === 1 ? E2("Le explicaron todo", "Explained everything") : E2("No le explicaron", "Did not explain"));
    if (A.cobro != null) add(A.cobro === 1, "dollar", A.cobro === 1 ? E2("Cobraron lo que dijeron", "Charged what they said") : E2("Cobraron algo que no dijeron", "Charged something not mentioned"));
    if (A.ley != null) add(A.ley === 1, "law", A.ley === 1 ? E2("Hizo lo que dijo que podía", "Did what they said they could") : E2("Ofreció algo que no podía", "Offered something they could not do"));
    if (A.fecha) add(A.fecha === "a" ? true : A.fecha === "c" ? false : null, "calendar", { a: E2("Cumplió la fecha", "Met the date"), b: E2("Un poco tarde, avisó", "A bit late, with notice"), c: E2("Tarde, sin avisar", "Late, no notice") }[A.fecha]);
    if (A.trato != null && A.trato !== 0) add(A.trato === 1, "bubble", A.trato === 1 ? E2("Buen trato", "Treated well") : E2("Mal trato", "Treated badly"));
    return f.slice(0, 6);
  }
  if (["first", "trato", "clean", "care", "who", "ask", "part", "carro", "precio"].some((k) => k in A) || F.ok != null) {
    const casa = "clean" in A || "care" in A || "who" in A || F.win != null, add = (ok: boolean | null, icon: string, label: string) => f.push({ icon, label, color: ok === null ? NEUTRO : ok ? BIEN : MAL });
    if (F.win != null) add(F.win <= 0, "clock", F.win <= 0 ? E2("Llegó en la franja", "Arrived in the window") : E2(`Llegó ${F.win} min tarde`, `Arrived ${F.win} min late`));
    if (F.ok != null && F.cob != null) add(F.cob <= F.ok, "dollar", F.cob <= F.ok ? (casa ? E2("Cobró lo cotizado", "Charged as quoted") : E2("Cobró lo del estimado", "Charged as estimated")) : E2(`Cobró $${Math.round((F.cob - F.ok) / 100)} más`, `Charged $${Math.round((F.cob - F.ok) / 100)} more`));
    if (F.xtra) add(true, "check", E2("Algo extra con su OK", "Extra work with their OK"));
    if (A.wait) add(A.wait === "a" ? true : A.wait === "c" ? false : null, "clock", casa ? { a: E2("Llegó en la franja", "Arrived in the window"), b: E2("Hasta 30 min tarde", "Up to 30 min late"), c: E2("Llegó más tarde", "Arrived later") }[A.wait] : { a: E2("Listo cuando prometieron", "Ready when promised"), b: E2("Un poco tarde", "A bit late"), c: E2("Mucho más tarde", "Much later") }[A.wait]);
    if (A.precio != null) add(A.precio === 1, "dollar", A.precio === 1 ? E2("Cobró lo que dijo", "Charged what they said") : E2("Cobró más", "Charged more"));
    if (A.first != null) add(A.first === 1 ? true : A.first === -1 ? false : null, "check", A.first === 1 ? E2("Quedó bien a la primera", "Right the first time") : A.first === 0 ? E2("Tuvo que volver", "Had to come back") : E2("Sigue igual", "Still broken"));
    if (A.who != null) add(A.who === 1 ? true : null, "users", A.who === 1 ? E2("Llegó quien reservó", "The booked person came") : E2("Vino otra persona", "Someone else came"));
    if (A.ask != null) add(A.ask === 1, "check", A.ask === 1 ? E2("Pidieron su OK", "Asked for their OK") : E2("No pidieron su OK", "Did not ask for their OK"));
    if (A.part != null && A.part !== 0) add(A.part === 1, "wrench", A.part === 1 ? E2("Le enseñaron la pieza vieja", "Showed the old part") : E2("No le enseñaron la pieza vieja", "Did not show the old part"));
    if (A.clean != null && A.clean !== 0) add(A.clean === 1, "check", A.clean === 1 ? E2("Limpió al terminar", "Cleaned up after") : E2("No limpió", "Did not clean up"));
    if (A.care != null) add(A.care === 1, "home", A.care === 1 ? E2("Cuidó la casa", "Took care of the home") : E2("Dañó algo", "Damaged something"));
    if (A.carro != null) add(A.carro === 1, "check", A.carro === 1 ? E2("Carro limpio", "Car returned clean") : E2("Carro sucio", "Car returned dirty"));
    if (A.trato != null && A.trato !== 0) add(A.trato === 1, "bubble", A.trato === 1 ? E2("Explicó todo", "Explained everything") : E2("Mal trato", "Treated badly"));
    return f.slice(0, 6);
  }
  const h = c.answers.hot;
  if (h === 1) f.push({ icon: "hot", label: dl ? E2("Llegó caliente", "Arrived hot") : E2("Caliente", "Hot"), color: BIEN });
  else if (h === 0) f.push({ icon: "hot", label: E2("Tibio", "Lukewarm"), color: NEUTRO });
  else if (h === -1) f.push({ icon: "hot", label: dl ? E2("Llegó frío", "Arrived cold") : E2("Frío", "Cold"), color: MAL });
  if (ord && typeof c.facts.late === "number")
    f.push(c.facts.late <= 5 ? { icon: "clock", label: dl ? E2("A tiempo", "On time") : E2("Listo a la hora", "Ready on time"), color: BIEN } : { icon: "clock", label: E2(`${c.facts.late} min tarde`, `${c.facts.late} min late`), color: MAL });
  if (!ord && c.answers.wait)
    f.push({ icon: "clock", label: { a: E2("Esperó menos de 15 min", "Waited under 15 min"), b: E2("Esperó 15–30 min", "Waited 15–30 min"), c: E2("Esperó más de 30 min", "Waited over 30 min") }[c.answers.wait], color: c.answers.wait === "c" ? MAL : NEUTRO });
  const v = c.answers.val;
  if (v === 1) f.push({ icon: "dollar", label: E2("Vale lo que cuesta", "Worth the price"), color: BIEN });
  else if (v === 0) f.push({ icon: "dollar", label: E2("Precio: más o menos", "Price: so-so"), color: NEUTRO });
  else if (v === -1) f.push({ icon: "dollar", label: E2("Caro para lo que es", "Pricey for what it is"), color: MAL });
  return f;
}

/* Tarjeta → props de ReviewCard (e1 · rev). summary = forma corta del Resumen; preview = sin pie (estado, vista previa). */
export function propsTarjeta(c: Tarjeta, o: { es: boolean; negocio: string; summary?: boolean; preview?: boolean; helpOn?: boolean; help?: number; reported?: boolean;
  onHelp?: () => void; onRep?: () => void; onEdit?: () => void; onPhoto?: (i: number) => void; padding?: number; bodySize?: number }) {
  const E2 = (a: string, b: string) => (o.es ? a : b), S = !!o.summary, foot = !o.preview && !S;
  const hOn = o.helpOn ?? c.helpOn, hN = o.help ?? c.help, rep = o.reported ?? c.reported;
  // Cita con una persona (3d): «VERIFICADA · CON KELVIN».
  const src: [string, string, string] = c.src === "cita" && c.pro ? [`VERIFICADA · CON ${c.pro.toUpperCase()}`, `VERIFIED · WITH ${c.pro.toUpperCase()}`, "signal"] : SRC[c.src];
  return {
    summary: S, padding: o.padding, bodySize: o.bodySize,
    border: c.mine ? "1.5px solid var(--tl-ink)" : "1px solid rgba(11,14,18,.08)", initials: c.ini, name: c.name, mine: c.mine ? E2("TU RESEÑA", "YOUR REVIEW") : undefined,
    who: `${c.cnt} ${c.cnt === 1 ? E2("RESEÑA", "REVIEW") : E2("RESEÑAS", "REVIEWS")}`,
    starsOn: "★★★★★".slice(0, c.stars), starsOff: "★★★★★".slice(c.stars), when: revWhen(c.d, o.es) + (c.editada ? E2(" · EDITADA", " · EDITED") : ""),
    source: { label: o.es ? src[0] : src[1], tone: src[2] }, facts: hechos(c, o.es), body: c.body,
    photos: c.fotos.map((u, i) => ({ image: `url(${u})`, onClick: o.onPhoto ? () => o.onPhoto!(i) : undefined })),
    recommend: !S && c.rec.length ? { label: E2("Recomienda:", "Recommends:"), text: c.rec.map((x) => (o.es ? x.es : x.en || x.es)).join(" · ") } : null,
    reply: c.reply ? { kicker: `${E2("RESPUESTA DE ", "REPLY FROM ")}${o.negocio} · ${revWhen(c.reply.d, o.es)}`.toUpperCase(), text: c.reply.text } : null,
    helpful: foot ? (!c.mine ? { label: E2("Útil", "Helpful") + (hN ? ` · ${hN}` : ""), bg: hOn ? "var(--tl-action-tint)" : "var(--tl-white)", border: hOn ? "rgba(75,55,245,.35)" : "rgba(11,14,18,.14)", color: hOn ? "var(--tl-action)" : "var(--tl-ink)", onClick: o.onHelp }
      : hN > 0 ? { label: E2("Útil", "Helpful") + ` · ${hN}` } : null) : null,
    edit: foot && c.mine ? { label: E2("Ver y editar", "View and edit"), onClick: o.onEdit } : null,
    report: foot && !c.mine ? { label: rep ? E2("Reportada · en revisión", "Reported · in review") : E2("Reportar", "Report"), color: rep ? "rgba(11,14,18,.42)" : "rgba(11,14,18,.55)", onClick: rep ? undefined : o.onRep } : null,
  };
}

/* Estado compartido de la ficha: Útil y Reportar (piden cuenta), la hoja de reportar y el visor de fotos. */
export function useResenas(r: ResumenResenas | null, negocioId: string, sesion: boolean, es: boolean) {
  const router = useRouter();
  const [util, setUtil] = useState<Record<string, { on: boolean; n: number }>>({});
  const [reportadas, setReportadas] = useState<Record<string, true>>({});
  const [rep, setRep] = useState<{ id: string; name: string; when: string; why: string; note: string; sent: boolean; err: string | null; busy: boolean } | null>(null);
  const [pv, setPv] = useState<{ c: Tarjeta; i: number } | null>(null);
  if (!r) return null;
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(`/n/${negocioId}?tab=rev`)}`);
  const help = async (c: Tarjeta) => {
    if (!sesion) return entrar();
    const cur = util[c.id] ?? { on: c.helpOn, n: c.help };
    setUtil((u) => ({ ...u, [c.id]: { on: !cur.on, n: cur.n + (cur.on ? -1 : 1) } }));
    const x = await utilResena(c.id).catch(() => null);
    if (x?.ok) setUtil((u) => ({ ...u, [c.id]: { on: x.on, n: x.n } }));
    else { setUtil((u) => ({ ...u, [c.id]: cur })); if (x && "entrar" in x && x.entrar) entrar(); }
  };
  const abrirRep = (c: Tarjeta) => { if (!sesion) return entrar(); setRep({ id: c.id, name: c.name, when: revWhen(c.d, es), why: "", note: "", sent: false, err: null, busy: false }); };
  const enviarRep = async () => {
    if (!rep?.why || rep.busy) return;
    setRep({ ...rep, busy: true, err: null });
    const x = await reportarRes(rep.id, rep.why, rep.note).catch(() => null);
    if (x?.ok) { setReportadas((m) => ({ ...m, [rep.id]: true })); setRep({ ...rep, sent: true, busy: false }); }
    else setRep({ ...rep, busy: false, err: x && !x.ok ? (es ? x.msg.es : x.msg.en) : es ? "No se pudo enviar. Revisa tu conexión." : "Could not send. Check your connection." });
  };
  const escribir = () => router.push(r.tengo ? `/n/${negocioId}/resena/tuya` : `/n/${negocioId}/resena`);
  const card = (c: Tarjeta, extra: { summary?: boolean; padding?: number; bodySize?: number } = {}) => propsTarjeta(c, {
    es, negocio: r.negocio.name, ...extra, helpOn: util[c.id]?.on, help: util[c.id]?.n, reported: reportadas[c.id] ?? c.reported,
    onHelp: () => help(c), onRep: () => abrirRep(c), onEdit: () => router.push(`/n/${negocioId}/resena/tuya`), onPhoto: (i) => setPv({ c, i }),
  });
  return { r, es, negocioId, card, escribir, rep, setRep, enviarRep, pv, setPv,
    porEstrellas: (n: number) => router.push(`/n/${negocioId}/resena?pedido=${encodeURIComponent(r.prompt?.numero ?? "")}&e=${n}`) };
}
export type CtlResenas = NonNullable<ReturnType<typeof useResenas>>;

/* Bloques compartidos: cifras grandes (≥ 5), pocas (1–4) o ninguna, «tu pedido de hoy», lo que importa. */
function Cifras({ v, size }: { v: CtlResenas; size: number }) {
  const { r, es } = v, s = Math.round(r.avg ?? 0);
  return (
    <div className="flex items-center gap-3.5">
      <span className="font-display font-extrabold leading-none tracking-[-0.05em]" style={{ fontSize: size }}>{r.avg?.toFixed(1)}</span>
      <div>
        <div className="text-[14px] font-bold leading-none tracking-[1.5px]"><span className="text-[var(--tl-pro)]">{"★★★★★".slice(0, s)}</span><span className="text-ink/[.16]">{"★★★★★".slice(s)}</span></div>
        <div className="mt-[7px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{r.n} {es ? "RESEÑAS" : "REVIEWS"}</div>
      </div>
    </div>
  );
}
function Verif({ v }: { v: CtlResenas }) {
  const { r, es } = v, ok = r.ver > 0;
  return (
    <div className="flex items-start gap-1.5 font-mono text-[9.5px] font-bold leading-[1.4] tracking-[0.08em]" style={{ color: ok ? BIEN : "rgba(11,14,18,.5)" }}>
      <Icon name={ok ? "verified" : "users"} size={13} color={ok ? BIEN : "rgba(11,14,18,.5)"} />
      {ok ? `${r.ver} ${es ? "VERIFICADAS POR PEDIDO O RESERVA" : "VERIFIED BY ORDER OR BOOKING"}` : es ? "RESEÑAS DE VISITANTES · AÚN SIN PEDIDOS VERIFICADOS" : "VISITOR REVIEWS · NO VERIFIED ORDERS YET"}
    </div>
  );
}
function aspectos(v: CtlResenas) {
  const { r, es } = v, a = r.asp, dlv = r.negocio.dlv, E2 = (x: string, y: string) => (es ? x : y);
  const z = r.aspSP;
  if (z) {
    const P = (k: string) => z.v[k] ?? null;
    const L: [string, string, string, string, string][] = z.rub === "edu" ? [
      ["dollar", E2("COBRARON EL TOTAL QUE DIJERON", "CHARGED THE STATED TOTAL"), "totalOk", "rgba(255,176,32,.16)", "var(--tl-pro-ink)"], ["verified", E2("DIERON EL CERTIFICADO", "GAVE THE CERTIFICATE"), "certOk", "rgba(0,229,196,.16)", BIEN],
      ["bubble", E2("LOS MAESTROS EXPLICAN", "TEACHERS EXPLAIN"), "explican", "rgba(75,55,245,.1)", "var(--tl-action)"], ["clock", E2("CUMPLIERON EL HORARIO", "KEPT THE SCHEDULE"), "horarioOk", "rgba(75,55,245,.1)", "var(--tl-action)"],
      ["check", E2("APRENDISTE DE VERDAD", "REALLY LEARNED"), "aprendio", "rgba(0,229,196,.16)", BIEN], ["users", E2("TRATO", "TREATMENT"), "trato", "rgba(11,14,18,.06)", "var(--tl-ink)"],
    ] : z.rub === "ninos" ? [
      ["dollar", E2("COBRARON LO QUE DIJERON", "CHARGED WHAT THEY SAID"), "totalOk", "rgba(255,176,32,.16)", "var(--tl-pro-ink)"], ["shield", E2("LICENCIA A LA VISTA", "LICENSE ON DISPLAY"), "licVista", "rgba(0,229,196,.16)", BIEN],
      ["users", E2("CUIDAN BIEN A LOS NIÑOS", "TAKE GOOD CARE OF KIDS"), "cuidaron", "rgba(0,229,196,.16)", BIEN], ["clock", E2("CUMPLIERON EL HORARIO", "KEPT THE SCHEDULE"), "horarioOk", "rgba(75,55,245,.1)", "var(--tl-action)"],
      ["bubble", E2("TE CUENTAN CÓMO LE VA", "TELL YOU HOW IT GOES"), "contaban", "rgba(75,55,245,.1)", "var(--tl-action)"], ["users", E2("TRATO", "TREATMENT"), "trato", "rgba(11,14,18,.06)", "var(--tl-ink)"],
    ] : z.rub === "dep" ? [
      ["dollar", E2("LA CUOTA FUE LA QUE VISTE", "FEE WAS AS SHOWN"), "totalOk", "rgba(255,176,32,.16)", "var(--tl-pro-ink)"], ["check", E2("CANCELAR FUE COMO DIJERON", "CANCELLING WAS AS STATED"), "salirOk", "rgba(0,229,196,.16)", BIEN],
      ["users", E2("LOS ENTRENADORES AYUDAN", "COACHES HELP"), "entrenan", "rgba(75,55,245,.1)", "var(--tl-action)"], ["clock", E2("CUMPLIERON EL HORARIO", "KEPT THE SCHEDULE"), "horarioOk", "rgba(75,55,245,.1)", "var(--tl-action)"],
      ["star", E2("LIMPIO Y EL EQUIPO FUNCIONA", "CLEAN, EQUIPMENT WORKS"), "limpioEq", "rgba(0,229,196,.16)", BIEN], ["users", E2("TRATO", "TREATMENT"), "trato", "rgba(11,14,18,.06)", "var(--tl-ink)"],
    ] : z.rub === "noche" ? [
      ["dollar", E2("COBRARON EL COVER PUBLICADO", "CHARGED THE POSTED COVER"), "coverOk", "rgba(255,176,32,.16)", "var(--tl-pro-ink)"], ["clock", E2("LA FILA FUE LA QUE DECÍA", "LINE WAS AS POSTED"), "filaOk", "rgba(75,55,245,.1)", "var(--tl-action)"],
      ["check", E2("REGLAS CLARAS", "CLEAR RULES"), "reglas", "rgba(0,229,196,.16)", BIEN], ["shield", E2("TE SENTISTE SEGURO", "FELT SAFE"), "segura", "rgba(0,229,196,.16)", BIEN],
      ["drink", E2("MÚSICA COMO ANUNCIARON", "MUSIC AS ANNOUNCED"), "musica", "rgba(75,55,245,.1)", "var(--tl-action)"], ["users", E2("TRATO EN LA PUERTA", "TREATMENT AT THE DOOR"), "trato", "rgba(11,14,18,.06)", "var(--tl-ink)"],
    ] : z.rub === "fiesta" ? [
      ["calendar", E2("RESPETARON LA FECHA", "KEPT THE DATE"), "fechaOk", "rgba(0,229,196,.16)", BIEN], ["clock", E2("LLEGARON A LA HORA", "ARRIVED ON TIME"), "llegaron", "rgba(75,55,245,.1)", "var(--tl-action)"],
      ["dollar", E2("COBRARON LO DEL PAQUETE", "CHARGED THE PACKAGE PRICE"), "paquete", "rgba(255,176,32,.16)", "var(--tl-pro-ink)"], ["image", E2("QUEDÓ COMO EN LAS FOTOS", "LOOKED LIKE THE PHOTOS"), "fotosOk", "rgba(0,229,196,.16)", BIEN],
      ["check", E2("RECOGIERON Y LIMPIARON", "PICKED UP AND CLEANED"), "limpio", "rgba(75,55,245,.1)", "var(--tl-action)"], ["users", E2("TRATO", "TREATMENT"), "trato", "rgba(11,14,18,.06)", "var(--tl-ink)"],
    ] : z.rub === "trans" ? [
      ["dollar", E2("COBRÓ EL PRECIO CERRADO", "CHARGED THE FIXED PRICE"), "cerrado", "rgba(255,176,32,.16)", "var(--tl-pro-ink)"], ["clock", E2("SALIÓ A LA HORA", "LEFT ON TIME"), "salio", "rgba(75,55,245,.1)", "var(--tl-action)"],
      ["check", E2("LLEGÓ A LA HORA", "ARRIVED ON TIME"), "llego", "rgba(0,229,196,.16)", BIEN], ["shield", E2("MANEJO SEGURO", "SAFE DRIVING"), "manejo", "rgba(0,229,196,.16)", BIEN],
      ["bag", E2("EQUIPAJE O CARGA BIEN", "LUGGAGE OR CARGO OK"), "carga", "rgba(75,55,245,.1)", "var(--tl-action)"], ["users", E2("TRATO", "TREATMENT"), "trato", "rgba(11,14,18,.06)", "var(--tl-ink)"],
    ] : z.rub === "merc" ? [
      ["check", E2("PESARON DELANTE DE TI", "WEIGHED IN FRONT OF YOU"), "pesaron", "rgba(0,229,196,.16)", BIEN], ["dollar", E2("COBRARON EL PESO REAL", "CHARGED THE REAL WEIGHT"), "peso", "rgba(255,176,32,.16)", "var(--tl-pro-ink)"],
      ["check", E2("FRESCO", "FRESH"), "fresco", "rgba(0,229,196,.16)", BIEN], ["dollar", E2("PRECIO DEL ESTANTE = CAJA", "SHELF PRICE = REGISTER"), "estante", "rgba(255,176,32,.16)", "var(--tl-pro-ink)"],
      ["bubble", E2("SUSTITUCIONES CON TU OK", "SWAPS WITH YOUR OK"), "sust", "rgba(75,55,245,.1)", "var(--tl-action)"], ["users", E2("TRATO", "TREATMENT"), "trato", "rgba(11,14,18,.06)", "var(--tl-ink)"],
    ] : z.rub === "tienda" ? [
      ["dollar", E2("PRECIO DE LA CAJA = EL PUBLICADO", "REGISTER = POSTED PRICE"), "caja", "rgba(255,176,32,.16)", "var(--tl-pro-ink)"], ["bag", E2("LO TENÍAN COMO DECÍA", "HAD IT AS LISTED"), "tenian", "rgba(0,229,196,.16)", BIEN],
      ["check", E2("LA TALLA O MEDIDA CORRECTA", "RIGHT SIZE"), "talla", "rgba(0,229,196,.16)", BIEN], ["clock", E2("GUARDARON EL APARTADO", "KEPT THE HOLD"), "guardo", "rgba(75,55,245,.1)", "var(--tl-action)"],
      ["check", E2("CAMBIOS Y DEVOLUCIONES", "EXCHANGES AND RETURNS"), "cambio", "rgba(75,55,245,.1)", "var(--tl-action)"], ["users", E2("TRATO", "TREATMENT"), "trato", "rgba(11,14,18,.06)", "var(--tl-ink)"],
    ] : z.rub === "salud" ? [
      ["shield", E2("ACEPTARON TU SEGURO", "TOOK YOUR INSURANCE"), "seg", "rgba(0,229,196,.16)", BIEN], ["bubble", E2("TE ENTENDIERON EN TU IDIOMA", "UNDERSTOOD YOU IN YOUR LANGUAGE"), "lengua", "rgba(75,55,245,.1)", "var(--tl-action)"],
      ["clock", E2("ESPERASTE LO QUE DIJERON", "WAITED AS SAID"), "wait", "rgba(75,55,245,.1)", "var(--tl-action)"], ["check", E2("TE EXPLICARON", "EXPLAINED"), "explico", "rgba(0,229,196,.16)", BIEN],
      ["dollar", E2("COBRARON LO QUE DIJERON", "CHARGED WHAT THEY SAID"), "cobro", "rgba(255,176,32,.16)", "var(--tl-pro-ink)"], ["users", E2("TRATO", "TREATMENT"), "trato", "rgba(11,14,18,.06)", "var(--tl-ink)"],
    ] : [
      ["dollar", E2("COBRÓ EL TOTAL QUE DIJO", "CHARGED THE STATED TOTAL"), "cobro", "rgba(255,176,32,.16)", "var(--tl-pro-ink)"], ["law", E2("HIZO LO QUE PODÍA POR LEY", "DID WHAT THE LAW ALLOWS"), "ley", "rgba(0,229,196,.16)", BIEN],
      ["check", E2("TE EXPLICÓ", "EXPLAINED"), "explico", "rgba(0,229,196,.16)", BIEN], ["bubble", E2("EN TU IDIOMA", "IN YOUR LANGUAGE"), "lengua", "rgba(75,55,245,.1)", "var(--tl-action)"],
      ["calendar", E2("CUMPLIÓ LA FECHA", "MET THE DATE"), "fecha", "rgba(75,55,245,.1)", "var(--tl-action)"], ["users", E2("TRATO", "TREATMENT"), "trato", "rgba(11,14,18,.06)", "var(--tl-ink)"],
    ];
    return L.filter(([, , k]) => P(k) != null).map(([ic, k, key, bg, fg]) => ({ ic, k, v: `${P(key)}%`, bg, fg }));
  }
  if (!a) return [];
  return ([
    a.hot != null ? ["hot", dlv ? E2("LLEGA CALIENTE", "ARRIVES HOT") : E2("SALE CALIENTE", "SERVED HOT"), `${a.hot}%`, "rgba(0,229,196,.16)", BIEN] : null,
    a.time != null ? ["clock", dlv ? E2("A TIEMPO", "ON TIME") : E2("LISTO A LA HORA", "READY ON TIME"), `${a.time}%`, "rgba(75,55,245,.1)", "var(--tl-action)"] : null,
    a.val != null ? ["dollar", E2("VALE LO QUE CUESTA", "WORTH THE PRICE"), `${a.val}%`, "rgba(255,176,32,.16)", "var(--tl-pro-ink)"] : null,
    a.taste != null ? ["restaurant", E2("SABOR", "FLAVOR"), a.taste.toFixed(1), "rgba(11,14,18,.06)", "var(--tl-ink)"] : null,
  ].filter(Boolean) as [string, string, string, string, string][]).map(([ic, k, val, bg, fg]) => ({ ic, k, v: val, bg, fg }));
}
const aspNota = (v: CtlResenas) => v.r.aspSP?.rub === "edu" || v.r.aspSP?.rub === "ninos" || v.r.aspSP?.rub === "dep" ? (v.es
  ? `De ${v.r.aspSP.n} inscripciones por To'Latino en los últimos 12 meses.`
  : `From ${v.r.aspSP.n} To'Latino enrollments in the last 12 months.`) : v.r.aspSP?.rub === "noche" ? (v.es
  ? `De ${v.r.aspSP.n} noches con lista o mesa por To'Latino en los últimos 90 días.`
  : `From ${v.r.aspSP.n} nights with a To'Latino list or table in the last 90 days.`) : v.r.aspSP?.rub === "fiesta" ? (v.es
  ? `De ${v.r.aspSP.n} reseñas del último año. «Respetaron la fecha» sale de las fiestas reservadas en To'Latino; lo demás es el % que contestó que sí.`
  : `From ${v.r.aspSP.n} reviews in the last year. “Kept the date” comes from parties booked on To'Latino; the rest is the % who answered yes.`) : v.r.aspSP?.rub === "trans" ? (v.es
  ? `De ${v.r.aspSP.n} reseñas de viajes y envíos de los últimos 90 días. Es el % que contestó que sí.`
  : `From ${v.r.aspSP.n} trip and shipment reviews in the last 90 days. It is the % who answered yes.`) : v.r.aspSP?.rub === "merc" || v.r.aspSP?.rub === "tienda" ? (v.es
  ? `De ${v.r.aspSP.n} reseñas del último año (pedidos, apartados y compras calificadas). Es el % que contestó que sí; «pesaron» y «peso real» cuentan la foto de cada peso de los pedidos por To'Latino.`
  : `From ${v.r.aspSP.n} reviews in the last year (rated orders, holds and purchases). It is the % who answered yes; “weighed” and “real weight” count the photo of each weight on To'Latino orders.`) : v.r.aspSP ? (v.es
  ? `De ${v.r.aspSP.n} reseñas del último año. Es el % que contestó que sí. Nunca se publica el motivo de la consulta ni de qué trata un caso.`
  : `From ${v.r.aspSP.n} reviews in the last year. It is the % who answered yes. The reason for a visit or what a case is about is never published.`) : v.es
  ? `De ${v.r.asp?.orders} pedidos calificados en To'Latino en los últimos 90 días. A tiempo = hasta 5 min después de la hora prometida.`
  : `From ${v.r.asp?.orders} rated To'Latino orders in the last 90 days. On time = up to 5 min after the promised time.`;
const aspTit = (v: CtlResenas) => (v.r.aspSP?.rub === "edu" ? (v.es ? "LO QUE IMPORTA EN UN CURSO" : "WHAT MATTERS IN A COURSE") : v.r.aspSP?.rub === "ninos" ? (v.es ? "LO QUE IMPORTA CON LOS NIÑOS" : "WHAT MATTERS WITH KIDS") : v.r.aspSP?.rub === "dep" ? (v.es ? "LO QUE IMPORTA EN DEPORTE" : "WHAT MATTERS IN SPORTS") : v.r.aspSP?.rub === "noche" ? (v.es ? "LO QUE IMPORTA DE NOCHE" : "WHAT MATTERS AT NIGHT") : v.r.aspSP?.rub === "fiesta" ? (v.es ? "LO QUE IMPORTA EN UNA FIESTA" : "WHAT MATTERS AT A PARTY") : v.r.aspSP?.rub === "trans" ? (v.es ? "LO QUE IMPORTA EN UN VIAJE" : "WHAT MATTERS ON A TRIP") : v.r.aspSP?.rub === "merc" ? (v.es ? "LO QUE IMPORTA EN UN MERCADO" : "WHAT MATTERS AT A MARKET") : v.r.aspSP?.rub === "tienda" ? (v.es ? "LO QUE IMPORTA EN UNA TIENDA" : "WHAT MATTERS AT A STORE") : v.r.aspSP?.rub === "salud" ? (v.es ? "LO QUE IMPORTA EN SALUD" : "WHAT MATTERS IN HEALTH") : v.r.aspSP?.rub === "pro" ? (v.es ? "LO QUE IMPORTA EN UN TRÁMITE" : "WHAT MATTERS IN A CASE") : v.es ? "LO QUE IMPORTA EN LA COMIDA" : "WHAT MATTERS IN FOOD");
function Pocas({ v }: { v: CtlResenas }) {
  const { r, es } = v;
  return r.n > 0 ? (
    <div className="flex items-center gap-3.5 rounded-[18px] bg-paper px-4 py-3.5">
      <span className="flex-none font-display text-[34px] font-extrabold leading-none tracking-[-0.05em]">{r.n}</span>
      <div className="min-w-0">
        <div className="text-[13.5px] font-bold leading-[1.3]">{r.n}{es ? " reseñas en To'Latino" : " reviews on To'Latino"}</div>
        <div className="mt-[3px] text-[12px] font-medium leading-[1.45] text-ink/[.58]">{es ? "Con menos de 5 reseñas no mostramos promedio." : "With fewer than 5 reviews we show no average."}</div>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-3.5 rounded-[18px] bg-paper px-4 py-[18px]">
      <span className="grid size-11 flex-none place-items-center rounded-[14px] bg-[rgba(255,176,32,.18)]"><Icon name="star" size={20} color="var(--tl-pro-ink)" /></span>
      <div className="min-w-0">
        <div className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{es ? "Aún sin reseñas" : "No reviews yet"}</div>
        <div className="mt-1 text-[12.5px] font-medium leading-[1.45] text-ink/60">{es ? "¿Ya fuiste? Cuéntanos cómo te fue." : "Been there? Tell us how it went."}</div>
      </div>
    </div>
  );
}
function Prompt({ v }: { v: CtlResenas }) {
  const { r, es } = v;
  if (!r.prompt) return null;
  const mesa = r.prompt.kind === "table";
  return (
    <div data-screen-label="Reseñas · tu pedido" className="rounded-[18px] border-[1.5px] border-ink bg-white p-4">
      <div className={K}>{mesa ? (es ? "TU MESA DE HOY" : "YOUR TABLE TODAY") : es ? "TU PEDIDO DE HOY" : "YOUR ORDER TODAY"}</div>
      <div className="mt-2 font-display text-[18px] font-extrabold leading-[1.2] tracking-[-0.02em]">{es ? "¿Cómo estuvo?" : "How was it?"}</div>
      <div className="mt-1 text-[12.5px] font-medium leading-[1.5] text-ink/60">
        {mesa ? (es ? `Reservación ${r.prompt.numero} · toca las estrellas y sale como reseña verificada.` : `Booking ${r.prompt.numero} · tap the stars and it posts as a verified review.`)
          : es ? `Pedido #${r.prompt.numero} · toca las estrellas y sale como reseña verificada.` : `Order #${r.prompt.numero} · tap the stars and it posts as a verified review.`}
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} ★`} onClick={() => v.porEstrellas(n)} className="grid h-11 place-items-center rounded-[13px] bg-[rgba(255,176,32,.12)]">
            <Icon name="star" size={22} color="var(--tl-pro)" strokeWidth={2} />
          </button>
        ))}
      </div>
    </div>
  );
}
const ctaL = (v: CtlResenas) => (v.r.tengo ? (v.es ? "Ver tu reseña" : "See your review") : v.es ? "Escribir una reseña" : "Write a review");

/* Resumen · «Lo que dicen los vecinos»: cifras (o pocas / ninguna), «tu pedido de hoy», 2 tarjetas (Free: 3) y el botón. */
export function ResResumen({ v, desk, onAll }: { v: CtlResenas; desk: boolean; onAll?: () => void }) {
  const { r, es } = v, rich = r.n >= 5, asp = aspectos(v);
  const titulo = (
    <div className="flex items-baseline justify-between gap-3 lg:items-end lg:gap-5">
      <h2 className="font-display text-[18px] font-extrabold leading-[1.1] tracking-[-0.03em] lg:text-[24px] lg:tracking-[-0.035em]">{es ? "Lo que dicen los vecinos" : "What neighbors say"}</h2>
      {onAll && r.n > 0 && <button type="button" onClick={onAll} className="flex-none text-[12.5px] font-bold text-action lg:text-[13.5px]">{es ? `Ver las ${r.n}` : `See all ${r.n}`}{desk ? " →" : ""}</button>}
    </div>
  );
  const ricas = rich && (
    <div className="rounded-[18px] bg-paper p-4">
      <Cifras v={v} size={desk ? 46 : 40} />
      <div className="mt-[11px]"><Verif v={v} /></div>
      {asp.length > 0 && (
        <>
          <div className={`mt-3.5 grid gap-3 border-t border-ink/[.08] pt-3.5 ${desk ? "grid-cols-1" : "grid-cols-2"}`}>
            {asp.map((a) => (
              <div key={a.k} className="flex min-w-0 items-center gap-[9px]">
                <span className="grid size-[30px] flex-none place-items-center rounded-[10px]" style={{ background: a.bg }}><Icon name={a.ic} size={15} color={a.fg} /></span>
                <div className="min-w-0"><div className="font-display text-[16px] font-extrabold leading-none tracking-[-0.02em]">{a.v}</div><div className="mt-1 font-mono text-[8.5px] font-bold leading-[1.3] tracking-[0.08em] text-ink/50">{a.k}</div></div>
              </div>
            ))}
          </div>
          <div className="mt-[11px] text-[11.5px] font-medium leading-[1.5] text-ink/55">{aspNota(v)}</div>
        </>
      )}
    </div>
  );
  const boton = <div className="flex"><Button variant="secondary" icon={r.tengo ? "star" : "edit"} block onClick={v.escribir}>{ctaL(v)}</Button></div>;
  const tarjetas = r.destacadas.map((c) => <ReviewCard key={c.id} {...v.card(c, desk ? { summary: true, padding: 18, bodySize: 14 } : { summary: true })} />);
  if (desk) return (
    <div data-screen-label="Resumen desktop · reseñas">
      {titulo}
      {r.n === 0 ? (
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-[18px] py-1.5 pr-1.5"><Pocas v={v} />{boton}</div>
      ) : (
        <div className="mt-4 grid grid-cols-[260px_minmax(0,1fr)] items-start gap-4">
          <div className="flex flex-col gap-3">{ricas}{!rich && <Pocas v={v} />}{boton}</div>
          <div className="flex min-w-0 flex-col gap-3"><Prompt v={v} />{tarjetas}</div>
        </div>
      )}
    </div>
  );
  return (
    <div data-screen-label="Resumen · reseñas" className="flex flex-col gap-3">
      {titulo}
      {ricas}{!rich && <Pocas v={v} />}
      <Prompt v={v} />
      {tarjetas}
      {boton}
    </div>
  );
}

/* Pestaña Reseñas (Pro): cifras y barras (tocar una barra filtra), verificadas, lo que importa, tu pedido de hoy, los más
   recomendados, filtros, orden, tarjetas de 6 en 6 y cómo funcionan. */
export function ResTab({ v, desk, onMenu }: { v: CtlResenas; desk: boolean; onMenu: () => void }) {
  const { r, es } = v, E2 = (a: string, b: string) => (es ? a : b);
  const [q, setQ] = useState<{ f: string; star: number; sort: string }>({ f: "all", star: 0, sort: "rec" });
  const [lista, setLista] = useState<{ cards: Tarjeta[]; n: number; cursor: string | null } | null>(null);
  const [cargando, setCargando] = useState(false);
  const pedir = async (nq: typeof q, cursor: string | null) => {
    setCargando(true);
    const x = await masResenas(v.negocioId, { ...nq, cursor, miembro: v.r.miembro }).catch(() => null);
    setCargando(false);
    if (!x) return;
    setLista((l) => (cursor && l ? { cards: [...l.cards, ...x.cards], n: x.n, cursor: x.cursor } : x));
  };
  // Primera carga al abrir la pestaña.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (r.n > 0) void pedir(q, null); }, []);
  const cambiar = (o: Partial<typeof q>) => { const nq = { ...q, ...o }; setQ(nq); void pedir(nq, null); };
  const filt = q.f !== "all" || !!q.star;
  const asp = aspectos(v), rich = r.n >= 5;
  const FL: [string, string][] = [["all", E2("Todas", "All")], ["ver", E2("Verificadas", "Verified")], ["ph", E2("Con fotos", "With photos")], ...(r.negocio.pro ? [["reply", E2("Con respuesta", "Replied")]] as [string, string][] : []), ["crit", E2("Críticas · 1 a 3 ★", "Critical · 1 to 3 ★")]];
  const SO: [string, string][] = [["rec", E2("Más recientes", "Newest")], ["help", E2("Más útiles", "Most helpful")], ["hi", E2("Más altas", "Highest")], ["lo", E2("Más bajas", "Lowest")]];
  const how: [string, string, string][] = [
    ["verified", E2("Verificada:", "Verified:"), E2("pediste, recogiste o reservaste por To'Latino.", "you ordered, picked up or booked on To'Latino.")],
    ["users", E2("Visitante:", "Visitor:"), E2("dice que fue, sin compra en la app. Se marca.", "says they went, with no purchase in the app. It is labeled.")],
    ["shield", r.negocio.pro ? E2("El negocio responde,", "The business can reply,") : E2("El negocio no responde", "The business does not reply"),
      r.negocio.pro ? E2("pero no puede borrarla, cambiarla ni pagar por reseñas.", "but cannot delete, edit or pay for reviews.") : E2("reseñas en To'Latino, ni puede borrarlas.", "to reviews on To'Latino, and cannot delete them.")],
    ["ban", E2("Solo se oculta", "It is only hidden"), E2("lo que rompe las reglas: insultos, datos personales o reseñas falsas.", "if it breaks the rules: insults, personal data or fake reviews.")],
  ];
  const barras = rich && (
    <div className={desk ? "" : "min-w-0 flex-1"}>
      {r.bars.map(([n, p]) => (
        <button key={n} type="button" onClick={() => cambiar({ star: q.star === n ? 0 : n })} className="flex w-full items-center gap-2 py-[3px]">
          <span className="w-2 font-mono text-[10px] font-bold" style={{ color: q.star === n ? "var(--tl-action)" : "rgba(11,14,18,.45)" }}>{n}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-[9px] bg-ink/[.08]"><span className="block h-full" style={{ width: `${p}%`, background: q.star === n ? "var(--tl-action)" : "var(--tl-ink)" }} /></span>
          <span className="w-[30px] text-right font-mono text-[9.5px] font-semibold text-ink/45">{p}%</span>
        </button>
      ))}
    </div>
  );
  const s = Math.round(r.avg ?? 0);
  const cabeza = rich ? (desk ? (
    <div>
      <div className="flex items-end gap-3">
        <span className="font-display text-[52px] font-extrabold leading-none tracking-[-0.05em]">{r.avg?.toFixed(1)}</span>
        <div className="pb-[5px]"><span className="whitespace-nowrap text-[14px] font-bold leading-none tracking-[1.5px]"><span className="text-[var(--tl-pro)]">{"★★★★★".slice(0, s)}</span><span className="text-ink/[.16]">{"★★★★★".slice(s)}</span></span>
          <div className="mt-1.5 font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/45">{r.n} {E2("RESEÑAS", "REVIEWS")}</div></div>
      </div>
      <div className="mt-3"><Verif v={v} /></div>
    </div>
  ) : (
    <div className="flex items-center gap-[18px]">
      <div className="flex-none">
        <div className="font-display text-[44px] font-extrabold leading-none tracking-[-0.05em]">{r.avg?.toFixed(1)}</div>
        <div className="mt-[7px]"><span className="whitespace-nowrap text-[13px] font-bold leading-none tracking-[1.5px]"><span className="text-[var(--tl-pro)]">{"★★★★★".slice(0, s)}</span><span className="text-ink/[.16]">{"★★★★★".slice(s)}</span></span></div>
        <div className="mt-[7px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/45">{r.n} {E2("RESEÑAS", "REVIEWS")}</div>
      </div>
      {barras}
    </div>
  )) : <Pocas v={v} />;
  const aspB = asp.length > 0 && (desk ? (
    <div className="border-t border-ink/[.08] pt-3.5">
      <div className={K}>{aspTit(v)}</div>
      <div className="mt-3 flex flex-col gap-[11px]">
        {asp.map((a) => (
          <div key={a.k} className="flex items-center gap-2.5">
            <span className="grid size-[30px] flex-none place-items-center rounded-[10px]" style={{ background: a.bg }}><Icon name={a.ic} size={15} color={a.fg} /></span>
            <span className="min-w-0 flex-1 font-mono text-[9.5px] font-bold leading-[1.3] tracking-[0.08em] text-ink/55">{a.k}</span>
            <span className="font-display text-[16px] font-extrabold leading-none tracking-[-0.02em]">{a.v}</span>
          </div>
        ))}
      </div>
      <div className="mt-[11px] text-pretty text-[11px] font-medium leading-[1.5] text-ink/50">{aspNota(v)}</div>
    </div>
  ) : (
    <div className="rounded-[18px] border border-ink/[.07] bg-white p-[15px]">
      <div className={K}>{aspTit(v)}</div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3.5">
        {asp.map((a) => (
          <div key={a.k} className="flex min-w-0 items-center gap-[9px]">
            <span className="grid size-[34px] flex-none place-items-center rounded-[11px]" style={{ background: a.bg }}><Icon name={a.ic} size={16} color={a.fg} /></span>
            <div className="min-w-0"><div className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">{a.v}</div><div className="mt-1 font-mono text-[9px] font-bold leading-[1.3] tracking-[0.08em] text-ink/50">{a.k}</div></div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-pretty text-[11.5px] font-medium leading-[1.5] text-ink/55">{aspNota(v)}</div>
    </div>
  ));
  const cta = r.prompt ? <Prompt v={v} /> : <div className="flex"><Button variant="secondary" icon={r.tengo ? "star" : "edit"} block onClick={v.escribir}>{ctaL(v)}</Button></div>;
  const top = r.top.length > 0 && (
    <div>
      <div className={K}>{E2("LOS MÁS RECOMENDADOS", "MOST RECOMMENDED")}</div>
      <div className={desk ? "mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3" : "hs -mx-5 mt-2.5 flex gap-2.5 overflow-x-auto px-5"}>
        {r.top.map((d) => (
          <button key={d.id} type="button" onClick={onMenu} className={desk ? "min-w-0 text-left" : "w-[132px] flex-none text-left"}>
            <div className={`${desk ? "h-24" : "h-[86px]"} rounded-[14px] bg-photo-bg`} style={d.ph ? { backgroundImage: `url(${d.ph})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
            <div className={`mt-[7px] font-bold leading-[1.25] ${desk ? "text-[13px]" : "text-[12.5px]"}`}>{es ? d.name.es : d.name.en || d.name.es}</div>
            <div className="mt-1 flex items-center gap-[5px] font-mono text-[9.5px] font-semibold text-ink/50"><Icon name="like" size={12} color="var(--tl-action)" />{d.n}{E2(" la recomiendan", " recommend it")}</div>
          </button>
        ))}
      </div>
    </div>
  );
  const filtros = r.n > 0 && (
    <>
      <div className={desk ? "flex flex-wrap gap-2" : "hs -mx-5 flex gap-2 overflow-x-auto px-5"}>
        {FL.map(([k, l]) => <Chip key={k} variant={q.f === k ? "selected" : "filter"} onClick={() => cambiar({ f: k })}>{l}</Chip>)}
      </div>
      <div className="flex flex-wrap items-center gap-3.5">
        <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/[.42]">{E2("ORDENAR", "SORT")}</span>
        {SO.map(([k, l]) => (
          <button key={k} type="button" onClick={() => cambiar({ sort: k })} className="border-b-2 pb-[3px] text-[12.5px] font-bold" style={{ color: q.sort === k ? "var(--tl-ink)" : "rgba(11,14,18,.5)", borderColor: q.sort === k ? "var(--tl-ink)" : "transparent" }}>{l}</button>
        ))}
      </div>
      {filt && lista && (
        <div className="flex items-center justify-between gap-2.5">
          <span className="text-[12.5px] font-bold">{lista.n}{lista.n === 1 ? E2(" reseña con estos filtros", " review with these filters") : E2(" reseñas con estos filtros", " reviews with these filters")}</span>
          <button type="button" onClick={() => cambiar({ f: "all", star: 0 })} className="text-[12.5px] font-bold text-action">{E2("Quitar filtros", "Clear filters")}</button>
        </div>
      )}
      <div className="flex flex-col gap-3">{(lista?.cards ?? []).map((c) => <ReviewCard key={c.id} {...v.card(c)} />)}</div>
      {lista && lista.cards.length === 0 && (
        <div className="rounded-[18px] border border-dashed border-ink/[.18] bg-white px-[18px] py-[22px] text-center">
          <div className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{E2("Ninguna reseña con estos filtros", "No reviews with these filters")}</div>
          <div className="mt-1.5 text-[12.5px] font-medium leading-[1.5] text-ink/55">{E2("Prueba con otros o quítalos.", "Try others or clear them.")}</div>
        </div>
      )}
      {lista?.cursor && <div className={desk ? "flex justify-center" : "flex"}><Button variant="secondary" block={!desk} disabled={cargando} onClick={() => pedir(q, lista.cursor)}>{E2("Ver más reseñas", "See more reviews")}</Button></div>}
    </>
  );
  const como = (
    <div className="rounded-[18px] bg-ink/[.04] p-[15px]">
      <div className={K}>{E2("CÓMO FUNCIONAN LAS RESEÑAS", "HOW REVIEWS WORK")}</div>
      <div className="mt-[11px] flex flex-col gap-2.5">
        {how.map(([ic, t, z]) => (
          <div key={ic} className="flex items-start gap-2.5">
            <span className="grid flex-none pt-0.5"><Icon name={ic} size={15} color="rgba(11,14,18,.6)" /></span>
            <span className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/70"><b className="font-extrabold text-ink">{t}</b> {z}</span>
          </div>
        ))}
      </div>
    </div>
  );
  if (desk) return (
    <div data-screen-label="Ficha · reseñas · desktop" className="grid grid-cols-[minmax(240px,270px)_minmax(0,1fr)] items-start gap-9 pt-6">
      <div className="sticky top-[96px] flex flex-col gap-4">{cabeza}{barras}{aspB}{cta}{como}</div>
      <div className="flex min-w-0 flex-col gap-4">{top}{filtros}</div>
    </div>
  );
  return (
    <div data-screen-label="Ficha · reseñas" className="flex flex-col gap-4 px-5 pt-5">
      {cabeza}
      {rich && <Verif v={v} />}
      {aspB}
      {cta}
      {top}
      {filtros}
      {como}
    </div>
  );
}

/* Capas: la hoja «Reportar reseña» y el visor de fotos. En escritorio la hoja va al centro. */
export function ResCapas({ v }: { v: CtlResenas }) {
  const { rep, setRep, pv, setPv, es } = v, E2 = (a: string, b: string) => (es ? a : b);
  const WHY: [string, string][] = [["fake", E2("No fue cliente o es falsa", "Not a real customer, or fake")], ["off", E2("Ofensiva o discriminatoria", "Offensive or discriminatory")],
    ["pii", E2("Tiene datos personales", "Contains personal data")], ["spam", E2("Spam o publicidad", "Spam or advertising")],
    ["coi", E2("La escribió el dueño o la competencia", "Written by the owner or a competitor")], ["otro", E2("Otra cosa", "Something else")]];
  const n = pv ? pv.c.fotos.length : 0, i = pv ? ((pv.i % n) + n) % n : 0;
  return (
    <>
      {rep && (
        <div data-screen-label="Reseñas · reportar" className="fixed inset-0 z-[60]">
          <div onClick={() => setRep(null)} className="absolute inset-0 animate-[tlFade_.2s_ease-out] bg-ink/50" />
          <div role="dialog" aria-modal="true" aria-label={E2("Reportar reseña", "Report review")} className="absolute inset-x-0 bottom-0 flex max-h-[90%] flex-col overflow-hidden rounded-t-[26px] bg-white lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:w-[480px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
            <div className="grid place-items-center pt-2.5 lg:hidden"><span className="h-[5px] w-10 rounded-[9px] bg-ink/15" /></div>
            {!rep.sent ? (
              <>
                <div className="flex items-start gap-3 px-5 pt-3 lg:pt-5">
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[20px] font-extrabold leading-[1.15] tracking-[-0.03em]">{E2("Reportar reseña", "Report review")}</div>
                    <div className="mt-[5px] font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/50">{`${E2("Reseña de ", "Review by ")}${rep.name} · ${rep.when}`.toUpperCase()}</div>
                  </div>
                  <button type="button" aria-label={E2("Cerrar", "Close")} onClick={() => setRep(null)} className="grid p-1"><Icon name="close" size={20} strokeWidth={2} /></button>
                </div>
                <div className="hs flex flex-1 flex-col gap-3 overflow-y-auto px-5 pb-1.5 pt-4">
                  <div className={K}>{E2("¿QUÉ PASA CON ESTA RESEÑA?", "WHAT IS WRONG WITH IT?")}</div>
                  <div role="radiogroup" className="flex flex-col gap-2">
                    {WHY.map(([k, l]) => {
                      const on = rep.why === k;
                      return (
                        <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setRep({ ...rep, why: k })} className={`flex items-center gap-3 rounded-[14px] px-3.5 py-[13px] text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/[.12]"}`}>
                          <span className={`box-border size-5 flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
                          <span className="text-[13.5px] font-semibold leading-[1.35]">{l}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className={`mt-1 ${K}`}>{E2("DETALLE · OPCIONAL", "DETAILS · OPTIONAL")}</div>
                  <textarea value={rep.note} onChange={(e) => setRep({ ...rep, note: e.target.value.slice(0, 300) })} placeholder={E2("Cuéntanos qué viste…", "Tell us what you saw…")} rows={3}
                    aria-label={E2("Detalle", "Details")} className="w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] text-ink outline-none" />
                  <div className="flex items-start gap-[9px]">
                    <span className="grid flex-none pt-px"><Icon name="shield" size={15} color="rgba(11,14,18,.55)" /></span>
                    <span className="text-pretty text-[12px] font-medium leading-[1.5] text-ink/[.62]">{E2("Reportar no la quita: la revisa una persona de To'Latino. Solo se oculta si rompe las reglas.", "Reporting does not remove it: a person at To'Latino reviews it. It is only hidden if it breaks the rules.")}</span>
                  </div>
                  {rep.err && <div role="alert" className="text-[12.5px] font-semibold text-danger">{rep.err}</div>}
                </div>
                <div className="border-t border-ink/[.08] px-5 pb-[22px] pt-3"><div className="flex"><Button block disabled={!rep.why || rep.busy} onClick={v.enviarRep}>{E2("Enviar reporte", "Send report")}</Button></div></div>
              </>
            ) : (
              <div className="flex flex-col gap-3 px-5 pb-6 pt-[22px]">
                <span className="grid size-12 place-items-center rounded-[15px] bg-[rgba(0,229,196,.16)]"><Icon name="check" size={22} color={BIEN} strokeWidth={2.4} /></span>
                <div className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.03em]">{E2("Recibimos tu reporte", "We got your report")}</div>
                <div className="text-pretty text-[13.5px] font-medium leading-[1.55] text-ink/65">{E2("To'Latino la revisa en 48 h. Mientras tanto sigue visible.", "To'Latino reviews it within 48 h. Meanwhile it stays visible.")}</div>
                <div className="mt-1 flex"><Button variant="secondary" block onClick={() => setRep(null)}>{E2("Listo", "Done")}</Button></div>
              </div>
            )}
          </div>
        </div>
      )}
      {pv && n > 0 && (
        <div data-screen-label="Reseñas · foto" role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex animate-[tlFade_.2s_ease-out] flex-col bg-ink">
          <div className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-white">{`${pv.c.name} · ${revWhen(pv.c.d, es).toLowerCase()}`}</div>
              <div className="mt-1 font-mono text-[10px] font-semibold tracking-[0.06em] text-white/60">{`${i + 1} / ${n}`}</div>
            </div>
            <button type="button" aria-label={E2("Cerrar", "Close")} onClick={() => setPv(null)} className="grid size-[38px] place-items-center rounded-[13px] bg-white/[.12]"><Icon name="close" size={16} color="var(--tl-white)" strokeWidth={2.2} /></button>
          </div>
          <div className="flex-1 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${pv.c.fotos[i]})` }} />
          <div className="flex min-h-[46px] items-center justify-between px-4 pb-7 pt-4">
            {n > 1 && (
              <>
                <button type="button" aria-label={E2("Anterior", "Previous")} onClick={() => setPv({ ...pv, i: i - 1 })} className="grid size-[46px] place-items-center rounded-[15px] bg-white/[.12]"><Icon name="chevronLeft" size={18} color="var(--tl-white)" strokeWidth={2} /></button>
                <button type="button" aria-label={E2("Siguiente", "Next")} onClick={() => setPv({ ...pv, i: i + 1 })} className="grid size-[46px] place-items-center rounded-[15px] bg-white/[.12]"><Icon name="chevronRight" size={18} color="var(--tl-white)" strokeWidth={2} /></button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
