"use client";
/* APP-NEG-RESENA (prototipo «APP-NEG-RESENA · móvil / · desktop», revWVals): sobre qué visita (verificada si hay un pedido
   o una mesa terminada; si no, visitante), estrellas, lo que importa (Comida), qué recomiendas, el texto (20 a 1000 letras,
   sin teléfonos ni correos), hasta 6 fotos y las reglas. En escritorio, «Así la van a ver» con la ReviewCard real. */
import { primerNombre } from "@/lib/nombre";
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import type { ParaEscribir, Respuestas, Tarjeta } from "@/lib/resenas";
import { subirFoto } from "@/lib/subir-foto";
import { publicarResena } from "../acciones-resena";
import { propsTarjeta } from "../Resenas";

type N = "Icon" | "Button" | "Chip" | "Tag" | "ReviewCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, Tag, ReviewCard } = UI as unknown as Record<N, ComponentType<any>>;

const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white p-[15px]";
import { PII, PRIVADO } from "@/lib/resenas-filtro";
type Foto = { id: string; url: string };

export function Escribir({ d, es, nombre, estrellas }: { d: ParaEscribir; es: boolean; nombre: string; estrellas: number }) {
  const router = useRouter();
  const E2 = (a: string, b: string) => (es ? a : b);
  const m = d.mia, b = d.negocio, editar = !!m;
  const [src, setSrc] = useState<"op" | "vis">(m ? (m.src === "vis" ? "vis" : "op") : d.op ? "op" : "vis");
  const [stars, setStars] = useState(m?.stars ?? estrellas);
  const [ans, setAns] = useState<Respuestas>(m?.answers ?? {});
  const [rec, setRec] = useState<string[]>([]);
  const [text, setText] = useState(m?.body ?? "");
  const [fotos, setFotos] = useState<Foto[]>(m?.fotoIds ?? []);
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  // Recomendaciones ya elegidas al editar (vienen como nombres; se marcan por id del menú del pedido).
  const [recIni] = useState(() => (m ? d.pool.filter((p) => m.rec.some((x) => x.es === p.name.es)).map((p) => p.id) : []));
  const recSel = rec.length || !m ? rec : recIni;

  const opSrc = m ? m.src : d.op?.src ?? "vis", isOrd = src === "op" && (opSrc === "dl" || opSrc === "pk"), dl = src === "op" && opSrc === "dl";
  const len = text.trim().length, pii = PII.test(text), priv = PRIVADO.test(text);
  const miss = !stars ? E2("TU CALIFICACIÓN", "YOUR RATING") : len < 20 ? E2("ESCRIBIR AL MENOS 20 LETRAS", "WRITE AT LEAST 20 CHARACTERS") : pii ? E2("QUITAR TELÉFONOS O CORREOS", "REMOVE PHONES OR EMAILS") : priv ? E2("QUITAR DATOS DE SALUD O DE TU CASO", "REMOVE HEALTH OR CASE DETAILS") : "";
  const numeroOp = m?.numero ?? d.op?.numero ?? null, mesa = (m ? m.src === "rsv" : d.op?.kind === "table"), cita = (m ? m.src === "cita" : d.op?.kind === "appointment" || d.op?.kind === "party" || d.op?.kind === "trip");
  const title = editar ? E2("Editar reseña", "Edit review") : E2("Escribir reseña", "Write a review");
  const meta = `${b.name}${src === "op" && numeroOp ? (mesa || cita ? ` · ${numeroOp}` : E2(` · PEDIDO #${numeroOp}`, ` · ORDER #${numeroOp}`)) : ""}`.toUpperCase();
  const volver = () => router.push(editar ? `/n/${b.id}/resena/tuya` : `/n/${b.id}${b.pro ? "?tab=rev" : ""}`);

  // ¿Sobre qué visita? La verificada solo si el servidor encontró un pedido o una mesa terminada.
  const srcs: { k: "op" | "vis"; t: string; s: string; tag: string; tone: string }[] = [];
  if (m ? m.src !== "vis" : d.op) {
    const lin = (d.op?.lineas ?? []).slice(0, 2).join(", ");
    const sv = d.cita?.svc ? ` · ${es ? d.cita.svc : d.cita.svcEn || d.cita.svc}` : "";
    srcs.push({ k: "op", t: b.rubro === "fiesta" ? E2(`Fiesta ${numeroOp}`, `Party ${numeroOp}`) : b.rubro === "trans" ? E2(`Viaje ${numeroOp}`, `Trip ${numeroOp}`) : b.rubro === "merc" ? E2(`Pedido ${numeroOp} · ${dl ? "envío" : "pickup"}`, `Order ${numeroOp} · ${dl ? "delivery" : "pickup"}`) : b.rubro === "tienda" ? E2(`Apartado ${numeroOp}`, `Hold ${numeroOp}`) : cita && b.rubro === "salud" ? `${E2("Cita ", "Appointment ")}${numeroOp}${sv}` : cita && b.rubro === "pro" ? `${E2("Consulta ", "Consultation ")}${numeroOp}${sv}` : cita && b.rubro === "hogar" ? `${E2("Visita ", "Visit ")}${numeroOp}${d.cita?.svc ? ` · ${es ? d.cita.svc : d.cita.svcEn || d.cita.svc}` : ""}` : cita && b.rubro === "auto" ? `${E2("Cita ", "Appointment ")}${numeroOp}${d.cita?.svc ? ` · ${es ? d.cita.svc : d.cita.svcEn || d.cita.svc}` : ""}` : cita ? E2(`Cita ${numeroOp}`, `Booking ${numeroOp}`) : mesa ? E2(`Reservación ${numeroOp} · mesa`, `Booking ${numeroOp} · table`) : E2(`Pedido #${numeroOp} · ${dl ? "delivery" : "pickup"}`, `Order #${numeroOp} · ${dl ? "delivery" : "pickup"}`),
      s: lin || (cita ? E2("Fuiste con tu cita", "You went with your booking") : mesa ? E2("Fuiste con tu reservación", "You went with your booking") : ""), tag: E2("VERIFICADA", "VERIFIED"), tone: "signal" });
  }
  if (!m || m.src === "vis") srcs.push({ k: "vis", t: b.rubro === "fiesta" ? E2("Contraté sin reservar por To'Latino", "I hired them without a To'Latino booking") : b.rubro === "trans" ? E2("Viajé sin reservar por To'Latino", "I traveled without a To'Latino booking") : b.rubro === "hogar" ? E2("Me atendieron sin reservar por To'Latino", "They came without a To'Latino booking") : b.rubro === "auto" ? E2("Fui sin reservar por To'Latino", "I went without a To'Latino booking") : b.rubro === "salud" || b.rubro === "pro" ? E2("Fui sin cita por To'Latino", "I went without a To'Latino appointment") : b.rubro === "merc" ? E2("Compré sin pedir por To'Latino", "I bought without ordering on To'Latino") : b.rubro === "tienda" ? E2("Compré sin apartar por To'Latino", "I bought without a To'Latino hold") : E2("Fui sin pedir por To'Latino", "I went without ordering on To'Latino"), s: E2("En el local, por teléfono o hace tiempo", "In person, by phone or a while ago"), tag: E2("VISITANTE", "VISITOR"), tone: "neutral" });

  const SL = [E2("Toca una estrella", "Tap a star"), E2("Malo", "Bad"), E2("Regular", "Fair"), E2("Bien", "Good"), E2("Muy bien", "Very good"), E2("Excelente", "Excellent")];
  type G = { k: string; key: keyof Respuestas; opts: [string | number, string][] };
  // Hogar y Auto (4g · neg-hogar-rev.js groups / TLAutoRev.groups): con la visita, lo que pasó; el resto sale del dato.
  const rub = b.rubro, conCita = src === "op" && cita, quien = primerNombre(d.cita?.quien);
  const gH: G[] = rub === "hogar" ? [
    ...(conCita ? [] : [{ k: E2("¿LLEGÓ EN LA FRANJA?", "DID THEY ARRIVE IN THE WINDOW?"), key: "wait" as const, opts: [["a", E2("Sí", "Yes")], ["b", E2("Hasta 30 min tarde", "Up to 30 min late")], ["c", E2("Más tarde o no avisó", "Later or no notice")]] as [string, string][] },
      { k: E2("¿COBRÓ LO QUE DIJO?", "DID THEY CHARGE WHAT THEY SAID?"), key: "precio" as const, opts: [[1, E2("Sí", "Yes")], [0, E2("Cobró más", "Charged more")]] as [number, string][] }]),
    { k: E2("¿QUEDÓ BIEN A LA PRIMERA?", "RIGHT THE FIRST TIME?"), key: "first", opts: [[1, E2("Sí", "Yes")], [0, E2("Tuvo que volver", "Had to come back")], [-1, E2("Sigue igual", "Still broken")]] },
    ...(conCita && quien ? [{ k: E2(`¿LLEGÓ ${quien.toUpperCase()}?`, `DID ${quien.toUpperCase()} COME?`), key: "who" as const, opts: [[1, E2("Sí", "Yes")], [0, E2("Otra persona", "Someone else")]] as [number, string][] }] : []),
    { k: E2("¿LIMPIÓ AL TERMINAR?", "CLEANED UP AFTER?"), key: "clean", opts: [[1, E2("Sí", "Yes")], [0, E2("Más o menos", "Sort of")], [-1, E2("No", "No")]] },
    { k: E2("¿CUIDÓ TU CASA?", "TOOK CARE OF YOUR HOME?"), key: "care", opts: [[1, E2("Sí", "Yes")], [-1, E2("Dañó algo", "Damaged something")]] },
    { k: E2("TRATO Y EXPLICACIÓN", "CARE AND EXPLANATION"), key: "trato", opts: [[1, E2("Te explicó todo", "Explained everything")], [0, E2("Normal", "Okay")], [-1, E2("Mal trato", "Treated badly")]] },
  ] : rub === "auto" ? [
    ...(conCita ? [] : [{ k: E2("¿COBRARON LO DEL ESTIMADO?", "CHARGED WHAT THE ESTIMATE SAID?"), key: "precio" as const, opts: [[1, E2("Sí", "Yes")], [0, E2("Cobraron más", "Charged more")]] as [number, string][] },
      { k: E2("¿ESTUVO LISTO CUANDO PROMETIERON?", "READY WHEN PROMISED?"), key: "wait" as const, opts: [["a", E2("Sí", "Yes")], ["b", E2("Un poco tarde", "A bit late")], ["c", E2("Mucho más tarde", "Much later")]] as [string, string][] }]),
    { k: E2("¿QUEDÓ ARREGLADO A LA PRIMERA?", "FIXED THE FIRST TIME?"), key: "first", opts: [[1, E2("Sí", "Yes")], [0, E2("Tuve que volver", "Had to go back")], [-1, E2("Sigue igual", "Still broken")]] },
    { k: E2("¿PIDIERON TU OK ANTES DE ALGO EXTRA?", "ASKED YOUR OK BEFORE EXTRA WORK?"), key: "ask", opts: [[1, E2("Sí", "Yes")], [0, E2("No", "No")]] },
    { k: E2("¿TE ENSEÑARON LA PIEZA VIEJA?", "SHOWED YOU THE OLD PART?"), key: "part", opts: [[1, E2("Sí", "Yes")], [0, E2("No hizo falta", "Not needed")], [-1, E2("No", "No")]] },
    { k: E2("¿TE DEVOLVIERON EL CARRO LIMPIO?", "CAR RETURNED CLEAN?"), key: "carro", opts: [[1, E2("Sí", "Yes")], [-1, E2("No", "No")]] },
    { k: E2("TRATO Y EXPLICACIÓN", "CARE AND EXPLANATION"), key: "trato", opts: [[1, E2("Te explicaron sin enredos", "Explained clearly")], [0, E2("Normal", "Okay")], [-1, E2("Mal trato", "Treated badly")]] },
  ] : rub === "salud" ? [
    { k: E2("¿TE ENTENDIERON EN TU IDIOMA?", "DID THEY UNDERSTAND YOU IN YOUR LANGUAGE?"), key: "lengua", opts: [["es", E2("El médico habló español", "The doctor spoke Spanish")], ["int", E2("Con intérprete", "With an interpreter")], ["no", E2("No me entendieron", "They did not understand me")]] },
    { k: E2("¿ESPERASTE LO QUE DIJERON?", "DID YOU WAIT AS LONG AS THEY SAID?"), key: "wait", opts: [["a", E2("A la hora", "On time")], ["b", E2("Hasta 30 min", "Up to 30 min")], ["c", E2("Más de 30 min", "Over 30 min")]] },
    { k: E2("¿TE EXPLICARON?", "DID THEY EXPLAIN?"), key: "explico", opts: [[1, E2("Sí, todo", "Yes, everything")], [0, E2("Más o menos", "Sort of")], [-1, E2("No", "No")]] },
    { k: E2("¿COBRARON LO QUE DIJERON?", "DID THEY CHARGE WHAT THEY SAID?"), key: "cobro", opts: [[1, E2("Sí", "Yes")], [0, E2("Cobraron algo más", "Charged something extra")]] },
    ...(conCita ? [] : [{ k: E2("¿ACEPTARON TU SEGURO?", "DID THEY TAKE YOUR INSURANCE?"), key: "seguro" as const, opts: [["si", E2("Sí", "Yes")], ["no", E2("No", "No")], ["sin", E2("Fui sin seguro", "I went uninsured")]] as [string, string][] }]),
    { k: E2("TRATO", "HOW THEY TREATED YOU"), key: "trato", opts: [[1, E2("Buen trato", "Treated well")], [0, E2("Normal", "Okay")], [-1, E2("Mal trato", "Treated badly")]] },
  ] : rub === "merc" ? [
    ...(src === "op" ? [] : [{ k: E2("¿PESARON DELANTE DE TI?", "DID THEY WEIGH IN FRONT OF YOU?"), key: "pesaron" as const, opts: [[1, E2("Sí", "Yes")], [0, E2("No", "No")]] as [number, string][] },
      { k: E2("¿COBRARON EL PESO REAL?", "DID THEY CHARGE THE REAL WEIGHT?"), key: "peso" as const, opts: [[1, E2("Sí", "Yes")], [0, E2("Cobraron más", "Charged more")]] as [number, string][] }]),
    { k: E2("¿ESTABA FRESCO?", "WAS IT FRESH?"), key: "fresco", opts: [[1, E2("Todo fresco", "All fresh")], [0, E2("Algo no", "Something was not")], [-1, E2("No estaba fresco", "Not fresh")]] },
    { k: E2("¿LA CAJA COBRÓ EL PRECIO DEL ESTANTE?", "DID THE REGISTER CHARGE THE SHELF PRICE?"), key: "estante", opts: [[1, E2("Sí", "Yes")], [0, E2("Cobraron más", "Charged more")]] },
    { k: E2("SI ALGO NO HABÍA", "IF SOMETHING WAS OUT"), key: "sust", opts: [["ok", E2("Me preguntaron", "They asked me")], ["na", E2("No hizo falta", "Not needed")], ["no", E2("Cambiaron sin preguntar", "Swapped without asking")]] },
    { k: E2("TRATO", "HOW THEY TREATED YOU"), key: "trato", opts: [[1, E2("Con respeto", "With respect")], [0, E2("Normal", "Okay")], [-1, E2("Mal trato", "Treated badly")]] },
  ] : rub === "tienda" ? [
    { k: E2("¿EL PRECIO DE LA CAJA FUE EL PUBLICADO?", "WAS THE REGISTER PRICE THE POSTED ONE?"), key: "caja", opts: [[1, E2("Sí", "Yes")], [0, E2("Cobraron más", "Charged more")]] },
    { k: E2("¿LO TENÍAN COMO DECÍA?", "DID THEY HAVE IT AS LISTED?"), key: "tenian", opts: [[1, E2("Sí", "Yes")], [0, E2("No", "No")]] },
    { k: E2("¿LA TALLA O MEDIDA CORRECTA?", "THE RIGHT SIZE?"), key: "talla", opts: [[1, E2("Sí", "Yes")], [0, E2("Más o menos", "Sort of")], [-1, E2("No", "No")]] },
    { k: E2("¿TE GUARDARON EL APARTADO?", "DID THEY KEEP YOUR HOLD?"), key: "guardo", opts: [[1, E2("Sí", "Yes")], [0, E2("No", "No")]] },
    { k: E2("CAMBIOS Y DEVOLUCIONES", "EXCHANGES AND RETURNS"), key: "cambio", opts: [["ok", E2("Sin problema", "No problem")], ["na", E2("No hizo falta", "Not needed")], ["no", E2("No quisieron", "They refused")]] },
    { k: E2("TRATO", "HOW THEY TREATED YOU"), key: "trato", opts: [[1, E2("Con respeto", "With respect")], [0, E2("Normal", "Okay")], [-1, E2("Mal trato", "Treated badly")]] },
  ] : rub === "fiesta" ? [
    ...(conCita ? [] : [{ k: E2("¿RESPETARON LA FECHA?", "DID THEY KEEP THE DATE?"), key: "fechaOk" as const, opts: [[1, E2("Sí", "Yes")], [0, E2("La cancelaron o la cambiaron", "Cancelled or changed it")]] as [number, string][] }]),
    { k: E2("¿LLEGARON A LA HORA?", "DID THEY ARRIVE ON TIME?"), key: "llegaron", opts: [["a", E2("Sí", "Yes")], ["b", E2("Un poco tarde", "A bit late")], ["c", E2("Muy tarde", "Very late")]] },
    { k: E2("¿QUEDÓ COMO EN LAS FOTOS?", "DID IT LOOK LIKE THE PHOTOS?"), key: "fotosOk", opts: [[1, E2("Igual o mejor", "Same or better")], [0, E2("Más o menos", "Sort of")], [-1, E2("No", "No")]] },
    { k: E2("¿COBRARON LO DEL PAQUETE?", "DID THEY CHARGE THE PACKAGE PRICE?"), key: "paquete", opts: [[1, E2("Sí", "Yes")], [0, E2("Cobraron más", "Charged more")]] },
    { k: E2("¿RECOGIERON Y LIMPIARON?", "DID THEY PICK UP AND CLEAN?"), key: "limpio", opts: [[1, E2("Sí", "Yes")], [0, E2("No", "No")]] },
    { k: E2("TRATO", "HOW THEY TREATED YOU"), key: "trato", opts: [[1, E2("Buen trato", "Treated well")], [0, E2("Normal", "Okay")], [-1, E2("Mal trato", "Treated badly")]] },
  ] : rub === "trans" ? [
    { k: E2("¿COBRÓ EL PRECIO CERRADO?", "DID THEY CHARGE THE FIXED PRICE?"), key: "cerrado", opts: [[1, E2("Sí", "Yes")], [0, E2("Cobró más", "Charged more")]] },
    { k: E2("¿SALIÓ A LA HORA?", "DID IT LEAVE ON TIME?"), key: "salio", opts: [["a", E2("Sí", "Yes")], ["b", E2("Hasta 15 min tarde", "Up to 15 min late")], ["c", E2("Más tarde", "Later")]] },
    { k: E2("¿LLEGÓ A LA HORA?", "DID IT ARRIVE ON TIME?"), key: "llego", opts: [["a", E2("Sí", "Yes")], ["b", E2("Un poco tarde", "A bit late")], ["c", E2("Muy tarde", "Very late")]] },
    { k: E2("¿MANEJO SEGURO?", "SAFE DRIVING?"), key: "manejo", opts: [[1, E2("Sí", "Yes")], [0, E2("No", "No")]] },
    { k: E2("¿EQUIPAJE O CARGA BIEN?", "LUGGAGE OR CARGO OK?"), key: "carga", opts: [[1, E2("Todo bien", "All good")], [0, E2("No llevé", "Had none")], [-1, E2("Se dañó o se perdió", "Damaged or lost")]] },
    { k: E2("TRATO", "HOW THEY TREATED YOU"), key: "trato", opts: [[1, E2("Buen trato", "Treated well")], [0, E2("Normal", "Okay")], [-1, E2("Mal trato", "Treated badly")]] },
  ] : rub === "pro" ? [
    { k: E2("¿COBRÓ EL TOTAL QUE DIJO?", "DID THEY CHARGE THE TOTAL THEY SAID?"), key: "cobro", opts: [[1, E2("Sí", "Yes")], [0, E2("Cobró más", "Charged more")]] },
    { k: E2("¿HIZO LO QUE DIJO QUE PODÍA?", "DID THEY DO WHAT THEY SAID THEY COULD?"), key: "ley", opts: [[1, E2("Sí", "Yes")], [0, E2("Ofreció algo que no podía", "Offered something they could not do")]] },
    { k: E2("¿TE EXPLICÓ?", "DID THEY EXPLAIN?"), key: "explico", opts: [[1, E2("Sí, todo", "Yes, everything")], [0, E2("Más o menos", "Sort of")], [-1, E2("No", "No")]] },
    { k: E2("¿EN TU IDIOMA?", "IN YOUR LANGUAGE?"), key: "lengua", opts: [["es", E2("En español", "In Spanish")], ["int", E2("Con intérprete", "With an interpreter")], ["no", E2("No me entendieron", "They did not understand me")]] },
    { k: E2("¿CUMPLIÓ LA FECHA?", "DID THEY MEET THE DATE?"), key: "fecha", opts: [["a", E2("Sí", "Yes")], ["b", E2("Un poco tarde, avisó", "A bit late, with notice")], ["c", E2("Tarde, sin avisar", "Late, no notice")]] },
    { k: E2("TRATO", "HOW THEY TREATED YOU"), key: "trato", opts: [[1, E2("Buen trato", "Treated well")], [0, E2("Normal", "Okay")], [-1, E2("Mal trato", "Treated badly")]] },
  ] : [];
  const grupos: G[] = rub ? gH : !b.food ? [] : [
    { k: E2("SABOR", "FLAVOR"), key: "taste", opts: [[1, E2("Muy bueno", "Great")], [0, E2("Normal", "Okay")], [-1, E2("No me gustó", "Did not like it")]] },
    { k: dl ? E2("CÓMO LLEGÓ", "HOW IT ARRIVED") : E2("TEMPERATURA", "TEMPERATURE"), key: "hot", opts: [[1, E2("Caliente", "Hot")], [0, E2("Tibio", "Lukewarm")], [-1, E2("Frío", "Cold")]] },
    ...(isOrd ? [] : [{ k: E2("CUÁNTO ESPERASTE", "HOW LONG YOU WAITED"), key: "wait" as const, opts: [["a", E2("Menos de 15 min", "Under 15 min")], ["b", E2("15 a 30 min", "15 to 30 min")], ["c", E2("Más de 30 min", "Over 30 min")]] as [string, string][] }]),
    { k: E2("PRECIO", "PRICE"), key: "val", opts: [[1, E2("Vale lo que cuesta", "Worth it")], [0, E2("Más o menos", "So-so")], [-1, E2("Caro para lo que es", "Pricey for what it is")]] },
  ];
  const dinero = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
  // «Tu visita · dato de la visita» (Hogar) / «Tu cita · dato de la cita» (Auto): no se edita.
  const Hs = d.hechos, svcV = d.cita?.svc ? [{ k: E2("SERVICIO", "SERVICE"), v: es ? d.cita.svc : d.cita.svcEn || d.cita.svc, fg: "var(--tl-ink)" }] : [];
  const conV = d.cita?.quien ? [{ k: E2("CON", "WITH"), v: d.cita.quien, fg: "var(--tl-ink)" }] : [];
  const tmC = rub === "salud" && conCita ? [...svcV,
    { k: E2("SEGURO", "INSURANCE"), v: Hs.seg ? (Hs.segOk ? E2("Aceptado", "Accepted") : E2("No lo aceptaron", "Not accepted")) : E2("Sin seguro", "Uninsured"), fg: Hs.seg && !Hs.segOk ? "var(--tl-danger)" : Hs.seg ? "var(--tl-open-text)" : "var(--tl-ink)" },
    ...(Hs.pago ? [{ k: E2("PAGASTE", "YOU PAID"), v: es ? Hs.pago.es : Hs.pago.en, fg: "var(--tl-ink)" }] : []), ...conV,
  ] : rub === "pro" && conCita ? [...svcV,
    Hs.tot != null && Hs.hired ? { k: E2("TOTAL POR ESCRITO", "WRITTEN TOTAL"), v: `${dinero(Hs.tot)} · ${E2("lo que dijo", "as stated")}`, fg: "var(--tl-open-text)" } : { k: E2("TOTAL POR ESCRITO", "WRITTEN TOTAL"), v: E2("No contrataste", "You did not hire"), fg: "var(--tl-ink)" }, ...conV,
  ] : rub && conCita && d.hechos.ok != null ? [
    ...(d.cita?.svc ? [{ k: E2("SERVICIO", "SERVICE"), v: es ? d.cita.svc : d.cita.svcEn || d.cita.svc, fg: "var(--tl-ink)" }] : []),
    ...(rub === "auto" && d.cita?.veh ? [{ k: E2("VEHÍCULO", "VEHICLE"), v: d.cita.veh, fg: "var(--tl-ink)" }] : []),
    ...(rub === "hogar" && d.hechos.win != null ? [{ k: E2("LLEGÓ", "ARRIVED"), v: d.hechos.win <= 0 ? E2("En la franja", "In the window") : E2(`${d.hechos.win} min tarde`, `${d.hechos.win} min late`), fg: d.hechos.win <= 0 ? "var(--tl-open-text)" : "var(--tl-danger)" }] : []),
    { k: E2("APROBASTE", "YOU APPROVED"), v: dinero(d.hechos.ok ?? 0), fg: "var(--tl-ink)" },
    { k: E2("COBRADO", "CHARGED"), v: `${dinero(d.hechos.cob ?? 0)}${(d.hechos.cob ?? 0) <= (d.hechos.ok ?? 0) ? (rub === "auto" ? E2(" · lo del estimado", " · as estimated") : E2(" · lo cotizado", " · as quoted")) : ""}`, fg: (d.hechos.cob ?? 0) <= (d.hechos.ok ?? 0) ? "var(--tl-open-text)" : "var(--tl-danger)" },
    ...(d.hechos.xtra ? [{ k: E2("ALGO EXTRA", "EXTRA WORK"), v: E2("Con tu OK", "With your OK"), fg: "var(--tl-open-text)" }] : []),
  ] : [];
  // Mercado / Tienda: el dato del pedido o del apartado (no se edita).
  const tmM = rub === "merc" && src === "op" && d.hechos.nArt != null ? [
    { k: E2("ARTÍCULOS", "ITEMS"), v: String(d.hechos.nArt), fg: "var(--tl-ink)" },
    ...(d.hechos.pesado ? [{ k: E2("FOTO DE CADA PESO", "PHOTO OF EACH WEIGHT"), v: d.hechos.fotoPeso ? E2("Sí", "Yes") : E2("Faltó alguna", "Some missing"), fg: d.hechos.fotoPeso ? "var(--tl-open-text)" : "var(--tl-danger)" }] : []),
    { k: d.hechos.pesado ? E2("PESO REAL · COBRADO", "REAL WEIGHT · CHARGED") : E2("COBRADO", "CHARGED"), v: dinero(d.hechos.cob ?? 0), fg: "var(--tl-ink)" },
  ] : rub === "tienda" && src === "op" && d.hechos.nArt != null ? [
    { k: E2("APARTADO", "HOLD"), v: `#${d.hechos.apartado ?? numeroOp ?? ""}`, fg: "var(--tl-ink)" },
    { k: E2("ARTÍCULOS", "ITEMS"), v: String(d.hechos.nArt), fg: "var(--tl-ink)" },
    { k: E2("PAGASTE", "YOU PAID"), v: dinero(d.hechos.cob ?? 0), fg: "var(--tl-ink)" },
  ] : [];
  // Fiesta / viaje (4z): el día y lo pagado, de la reserva (no se edita).
  const fechaL = (ymd?: string) => { if (!ymd) return "—"; const z = new Date(`${ymd}T12:00:00Z`); return z.toLocaleDateString(es ? "es-US" : "en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }); };
  const tmF = (rub === "fiesta" || rub === "trans") && conCita && d.hechos.dia ? [
    { k: rub === "fiesta" ? E2("FECHA", "DATE") : E2("VIAJE", "TRIP"), v: `${fechaL(d.hechos.dia)}${rub === "fiesta" ? E2(" · respetada", " · kept") : ""}`, fg: rub === "fiesta" ? "var(--tl-open-text)" : "var(--tl-ink)" },
    { k: E2("PAGASTE", "YOU PAID"), v: `${dinero(d.hechos.tot ?? 0)}${rub === "trans" ? E2(" · precio cerrado", " · fixed price") : ""}`, fg: "var(--tl-ink)" },
  ] : [];
  const H = d.hechos, tm = rub === "merc" || rub === "tienda" ? tmM : rub === "fiesta" || rub === "trans" ? tmF : rub ? tmC : isOrd && typeof H.late === "number" ? [
    { k: E2("PROMETIDO", "PROMISED"), v: H.promised ?? "—", fg: "var(--tl-ink)" },
    { k: dl ? E2("LLEGÓ", "ARRIVED") : E2("LISTO", "READY"), v: H.done ?? "—", fg: "var(--tl-ink)" },
    { k: E2("RESULTADO", "RESULT"), v: H.late <= 5 ? (dl ? E2("A tiempo", "On time") : E2("Listo a la hora", "Ready on time")) : E2(`${H.late} min tarde`, `${H.late} min late`), fg: H.late <= 5 ? "var(--tl-open-text)" : "var(--tl-danger)" },
  ] : [];

  const subir = async (fl: FileList | null) => {
    if (!fl?.length) return;
    setSubiendo(true); setError(null);
    for (const f of Array.from(fl).slice(0, 6 - fotos.length)) {
      const r = await subirFoto(f).catch(() => null);
      if (r?.ok && r.id && r.url) setFotos((x) => (x.length < 6 ? [...x, { id: r.id!, url: r.url! }] : x));
      else { setError(r?.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo subir la foto.", "Could not upload the photo.")); break; }
    }
    setSubiendo(false);
    if (file.current) file.current.value = "";
  };
  const publicar = async () => {
    if (miss || enviando || subiendo) return;
    setEnviando(true); setError(null);
    const r = await publicarResena({ negocio: b.id, numero: src === "op" ? numeroOp : null, visitante: src === "vis", stars, answers: ans, rec: recSel, body: text, fotos: fotos.map((f) => f.id) })
      .catch(() => ({ ok: false as const, msg: { es: "No se pudo publicar. Revisa tu conexión.", en: "Could not post. Check your connection." } }));
    if (r.ok) { router.push(`/n/${b.id}/resena/tuya?ok=${editar ? 2 : 1}`); router.refresh(); return; }
    if ("entrar" in r && r.entrar) { router.push(`/entrar?volver=${encodeURIComponent(`/n/${b.id}/resena`)}`); return; }
    setError(es ? r.msg.es : r.msg.en); setEnviando(false);
  };

  // «Así la van a ver»: la misma tarjeta de la ficha con lo que lleva escrito.
  const borrador: Tarjeta = {
    id: "draft", name: nombre, ini: nombre.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase(), mine: true, cnt: m?.cnt ?? 1, d: 0, editada: editar,
    src: src === "op" ? (opSrc as Tarjeta["src"]) : "vis", stars, answers: isOrd ? { ...ans, wait: undefined } : ans, facts: isOrd ? H : {},
    body: text.trim() || E2("Tu reseña aparece aquí, así como la ven los vecinos.", "Your review shows here, the way neighbors see it."), fotos: fotos.map((f) => f.url),
    rec: d.pool.filter((p) => recSel.includes(p.id)).map((p) => p.name), reply: m?.reply ?? null, help: 0, helpOn: false, reported: false,
  };
  const low = stars > 0 && stars <= 2;
  const reglas = E2(`Se publica al instante como ${nombre}${/\.$/.test(nombre) ? " " : ". "}${b.name}${b.pro ? " puede responder, pero no borrarla ni cambiarla." : " no puede borrarla ni cambiarla."} Puedes editarla durante 48 h.`,
    `Posts instantly as ${nombre}${/\.$/.test(nombre) ? " " : ". "}${b.name}${b.pro ? " can reply, but cannot delete or change it." : " cannot delete or change it."} You can edit it for 48 h.`);

  const negocio = (
    <div className={caja}>
      <div className="flex items-center gap-[11px]">
        <span className="size-[42px] flex-none rounded-xl bg-photo-bg" style={b.logo ? { backgroundImage: `url(${b.logo})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
        <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{b.name}</div><div className="mt-[3px] font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{b.meta.toUpperCase()}</div></div>
      </div>
      <div className={`mt-4 ${K}`}>{E2("¿SOBRE QUÉ VISITA?", "WHICH VISIT?")}</div>
      <div role="radiogroup" className="mt-2.5 flex flex-col gap-2">
        {srcs.map((x) => {
          const on = src === x.k;
          return (
            <button key={x.k} type="button" role="radio" aria-checked={on} disabled={editar} onClick={() => setSrc(x.k)} className={`flex items-center gap-3 rounded-[14px] px-3.5 py-[13px] text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/[.12]"}`}>
              <span className={`box-border size-5 flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
              <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold leading-[1.3]">{x.t}</div>{x.s && <div className="mt-[3px] text-[12px] font-medium leading-[1.4] text-ink/55">{x.s}</div>}</div>
              <Tag tone={x.tone}>{x.tag}</Tag>
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 text-pretty text-[11.5px] font-medium leading-[1.5] text-ink/55">{rub === "fiesta" ? E2("Solo sale verificada si la fiesta fue por To'Latino.", "It only shows as verified if the party was booked on To'Latino.") : rub === "trans" ? E2("Solo sale verificada si el viaje fue por To'Latino.", "It only shows as verified if the trip was booked on To'Latino.") : rub === "merc" ? E2("Solo sale verificada si pediste por To'Latino.", "It only shows as verified if you ordered on To'Latino.") : rub === "tienda" ? E2("Solo sale verificada si apartaste por To'Latino.", "It only shows as verified if you held it on To'Latino.") : rub === "hogar" ? E2("Solo sale verificada si la visita fue por To'Latino.", "It only shows as verified if the visit was through To'Latino.") : rub === "auto" || rub === "salud" || rub === "pro" ? E2("Solo sale verificada si la cita fue por To'Latino.", "It only shows as verified if the booking was through To'Latino.") : E2("Solo sale verificada si pediste, recogiste o reservaste por To'Latino.", "It only shows as verified if you ordered, picked up or booked on To'Latino.")}</div>
    </div>
  );
  const estrellasB = (
    <div data-screen-label="Reseña · estrellas" className={caja}>
      <div className={K}>{E2("TU CALIFICACIÓN", "YOUR RATING")}</div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} ★`} aria-pressed={n <= stars} onClick={() => setStars(n)} className="grid h-[54px] place-items-center rounded-[15px]" style={{ background: n <= stars ? "rgba(255,176,32,.14)" : "rgba(11,14,18,.04)" }}>
            <Icon name="star" size={26} color={n <= stars ? "var(--tl-pro)" : "rgba(11,14,18,.22)"} strokeWidth={2} />
          </button>
        ))}
      </div>
      <div className="mt-2.5 text-center font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]" style={{ color: stars ? "var(--tl-ink)" : "rgba(11,14,18,.45)" }}>{SL[stars]}</div>
    </div>
  );
  const importa = grupos.length > 0 && (
    <div data-screen-label="Reseña · lo que importa" className={caja}>
      <div className="flex justify-between gap-2.5"><span className={K}>{rub === "fiesta" ? E2("LO QUE IMPORTA EN UNA FIESTA", "WHAT MATTERS AT A PARTY") : rub === "trans" ? E2("LO QUE IMPORTA EN UN VIAJE", "WHAT MATTERS ON A TRIP") : rub === "merc" ? E2("LO QUE IMPORTA EN UN MERCADO", "WHAT MATTERS AT A MARKET") : rub === "tienda" ? E2("LO QUE IMPORTA EN UNA TIENDA", "WHAT MATTERS AT A STORE") : rub === "hogar" ? E2("LO QUE IMPORTA EN EL HOGAR", "WHAT MATTERS AT HOME") : rub === "salud" ? E2("LO QUE IMPORTA EN SALUD", "WHAT MATTERS IN HEALTH") : rub === "pro" ? E2("LO QUE IMPORTA EN UN TRÁMITE", "WHAT MATTERS IN A CASE") : rub === "auto" ? E2("LO QUE IMPORTA EN AUTOS", "WHAT MATTERS WITH CARS") : E2("LO QUE IMPORTA EN LA COMIDA", "WHAT MATTERS IN FOOD")}</span><span className="font-mono text-[9.5px] font-semibold tracking-[0.1em] text-ink/[.42]">{E2("OPCIONAL", "OPTIONAL")}</span></div>
      <div className="mt-0.5 flex flex-col">
        {grupos.map((g) => (
          <div key={g.key} className="border-b border-ink/[.06] py-[13px]">
            <div className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/50">{g.k}</div>
            <div className="mt-[9px] flex flex-wrap gap-[7px]">
              {g.opts.map(([v, l]) => <Chip key={String(v)} variant={ans[g.key] === v ? "selected" : "filter"} onClick={() => setAns((a) => ({ ...a, [g.key]: a[g.key] === v ? undefined : v }))}>{l}</Chip>)}
            </div>
          </div>
        ))}
      </div>
      {tm.length > 0 && (
        <div className="mt-[13px] rounded-[14px] border border-ink/[.06] bg-paper px-3.5 py-[13px]">
          <div className="flex items-center gap-[7px] font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/50"><Icon name="lock" size={12} color="rgba(11,14,18,.5)" />{rub === "fiesta" ? E2("TU FIESTA · DATO DE LA RESERVA", "YOUR PARTY · FROM THE BOOKING") : rub === "trans" ? E2("TU VIAJE · DATO DE LA RESERVA", "YOUR TRIP · FROM THE BOOKING") : rub === "merc" ? E2("TU PEDIDO · DATO DEL PEDIDO", "YOUR ORDER · FROM THE ORDER") : rub === "tienda" ? E2("TU APARTADO · DATO DEL APARTADO", "YOUR HOLD · FROM THE HOLD") : rub === "hogar" ? E2("TU VISITA · DATO DE LA VISITA", "YOUR VISIT · FROM THE BOOKING") : rub === "pro" ? E2("TU CONSULTA · DATO DE LA CONSULTA", "YOUR CONSULTATION · FROM THE BOOKING") : rub === "auto" || rub === "salud" ? E2("TU CITA · DATO DE LA CITA", "YOUR APPOINTMENT · FROM THE BOOKING") : dl ? E2("HORA DE ENTREGA · DATO DEL PEDIDO", "DELIVERY TIME · FROM THE ORDER") : E2("PICKUP · DATO DEL PEDIDO", "PICKUP · FROM THE ORDER")}</div>
          <div className="mt-2.5 grid grid-cols-3 gap-2.5">
            {tm.map((x) => <div key={x.k} className="min-w-0"><div className="font-mono text-[9px] font-bold tracking-[0.12em] text-ink/45">{x.k}</div><div className="mt-1 text-[13.5px] font-bold leading-[1.3]" style={{ color: x.fg }}>{x.v}</div></div>)}
          </div>
          <div className="mt-[9px] text-pretty text-[11.5px] font-medium leading-[1.45] text-ink/55">{rub === "fiesta" ? E2("La fecha y lo que pagaste salen de tu reserva en To'Latino. No se editan.", "The date and what you paid come from your To'Latino booking. They cannot be edited.") : rub === "trans" ? E2("El viaje y el precio cerrado salen de tu reserva en To'Latino. No se editan.", "The trip and fixed price come from your To'Latino booking. They cannot be edited.") : rub === "merc" ? E2("Los artículos, la foto de cada peso y lo cobrado salen de tu pedido. No se editan.", "Items, the photo of each weight and the charge come from your order. They cannot be edited.") : rub === "tienda" ? E2("El apartado y lo que pagaste salen de To'Latino. No se editan.", "The hold and what you paid come from To'Latino. They cannot be edited.") : rub === "hogar" ? E2("La franja y lo cotizado contra lo cobrado salen de tu visita en To'Latino. No se editan.", "The window and quoted vs. charged come from your To'Latino visit. They cannot be edited.") : rub === "salud" ? E2("El seguro y lo que pagaste salen de tu cita. Nunca se publica el motivo de la consulta.", "Insurance and what you paid come from your appointment. The reason for the visit is never published.") : rub === "pro" ? E2("El total por escrito sale de tu consulta. Nunca se publica de qué trata tu caso.", "The written total comes from your consultation. What your case is about is never published.") : rub === "auto" ? E2("Lo aprobado contra lo cobrado sale de tu cita en To'Latino. No se edita.", "Approved vs. charged comes from your To'Latino booking. It cannot be edited.") : E2("Sale de la hora prometida y la hora real del pedido. No se edita.", "Taken from the promised and actual order times. It cannot be edited.")}</div>
        </div>
      )}
    </div>
  );
  const recs = b.food && d.pool.length > 0 && (
    <div className={caja}>
      <div className="flex justify-between gap-2.5"><span className={K}>{E2("¿QUÉ RECOMIENDAS?", "WHAT DO YOU RECOMMEND?")}</span><span className="font-mono text-[9.5px] font-semibold tracking-[0.1em] text-ink/[.42]">{E2("OPCIONAL", "OPTIONAL")}</span></div>
      <div className="mt-[5px] text-[12px] font-medium leading-[1.45] text-ink/55">{E2('Sale en tu reseña y en "Los más recomendados".', 'Shows in your review and in "Most recommended".')}</div>
      <div className="mt-[11px] flex flex-wrap gap-[7px]">
        {d.pool.map((p) => { const on = recSel.includes(p.id); return <Chip key={p.id} variant={on ? "selected" : "filter"} onClick={() => setRec(on ? recSel.filter((z) => z !== p.id) : [...recSel, p.id])}>{es ? p.name.es : p.name.en || p.name.es}</Chip>; })}
      </div>
    </div>
  );
  const texto = (
    <div data-screen-label="Reseña · texto" className={caja}>
      <div className="flex justify-between gap-2.5">
        <span className={K}>{E2(`CUÉNTALE A ${b.ciudad.toUpperCase()}`, `TELL ${b.ciudad.toUpperCase()}`)}</span>
        <span className="font-mono text-[9.5px] font-semibold" style={{ color: len < 20 ? "rgba(11,14,18,.42)" : "var(--tl-open-text)" }}>{len < 20 ? `${len} / 20 MÍN.` : `${len} / 1000`}</span>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} rows={5} aria-label={E2("Tu reseña", "Your review")} placeholder={rub === "salud" ? E2("No escribas diagnósticos, medicinas ni resultados. Cuenta cómo te atendieron.", "Do not write diagnoses, medicines or results. Say how they treated you.") : rub === "pro" ? E2("No escribas datos de tu caso, números de expediente ni documentos. Cuenta cómo te atendieron.", "Do not write case details, file numbers or documents. Say how they treated you.") : rub === "hogar" ? E2("Qué te hicieron, cómo quedó, si los volverías a llamar…", "What they did, how it came out, whether you would call them again…") : rub === "auto" ? E2("Qué le hicieron, cómo quedó, si lo volverías a llevar…", "What they did, how it came out, whether you would go back…") : E2("Qué pediste, cómo llegó, si volverías…", "What you ordered, how it arrived, whether you would go back…")}
        className="mt-2.5 w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-3 text-[13.5px] font-medium leading-[1.55] text-ink outline-none" />
      {pii && (
        <div className="mt-[9px] flex items-start gap-2">
          <span className="grid flex-none pt-px"><Icon name="warning" size={14} color="var(--tl-danger)" /></span>
          <span className="text-[12px] font-semibold leading-[1.45] text-danger">{E2("Quita teléfonos y correos: por seguridad, la reseña no se publica con ellos.", "Remove phones and emails: for safety, reviews cannot include them.")}</span>
        </div>
      )}
    </div>
  );
  const fotosB = (
    <div className={caja}>
      <div className="flex justify-between gap-2.5"><span className={K}>{E2("FOTOS · OPCIONAL", "PHOTOS · OPTIONAL")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{fotos.length} / 6</span></div>
      <div className="mt-[11px] flex flex-wrap gap-2">
        {fotos.map((p) => (
          <div key={p.id} className="relative size-[76px] rounded-xl bg-photo-bg" style={{ backgroundImage: `url(${p.url})`, backgroundSize: "cover", backgroundPosition: "center" }}>
            <button type="button" aria-label={E2("Quitar foto", "Remove photo")} onClick={() => setFotos((x) => x.filter((z) => z.id !== p.id))} className="absolute right-1 top-1 grid size-6 place-items-center rounded-lg bg-ink/[.72]"><Icon name="close" size={11} color="var(--tl-white)" strokeWidth={2.6} /></button>
          </div>
        ))}
        {fotos.length < 6 && (
          <button type="button" disabled={subiendo} onClick={() => file.current?.click()} className="box-border flex size-[76px] flex-col items-center justify-center gap-[5px] rounded-xl border-[1.5px] border-dashed border-ink/25">
            <Icon name="image" size={18} color="rgba(11,14,18,.6)" /><span className="text-[10px] font-bold text-ink/60">{subiendo ? E2("Subiendo…", "Uploading…") : E2("Agregar", "Add")}</span>
          </button>
        )}
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => subir(e.target.files)} />
      </div>
    </div>
  );
  const bajo = low && (
    <div data-screen-label="Reseña · calificación baja" className="flex items-start gap-2.5 rounded-[14px] bg-[rgba(192,57,43,.07)] px-3.5 py-[13px]">
      <span className="grid flex-none pt-px"><Icon name="help" size={16} color="var(--tl-danger)" /></span>
      <div className="min-w-0 flex-1 text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/80">{rub ? (rub === "fiesta" ? E2("La reseña no devuelve dinero. Si faltó algo del paquete, llegaron tarde o cobraron más, pídelo en Ayuda con la fiesta.", "A review does not refund money. If something in the package was missing, they were late or charged more, ask in Party help.")
          : rub === "trans" ? E2("La reseña no devuelve dinero. Si cobró más del precio cerrado, salió muy tarde o se dañó tu equipaje, pídelo en Ayuda con el viaje.", "A review does not refund money. If they charged more than the fixed price, left very late or your luggage was damaged, ask in Trip help.")
          : rub === "merc" ? E2("La reseña no devuelve dinero. Si el peso no cuadra, faltó algo o no estaba fresco, pídelo en Ayuda con el pedido.", "A review does not refund money. If the weight is off, something was missing or not fresh, ask in Order help.")
          : rub === "tienda" ? E2("La reseña no devuelve dinero. Si en la caja cobraron más o no guardaron tu apartado, pídelo en Ayuda con la compra.", "A review does not refund money. If the register charged more or they did not keep your hold, ask in Purchase help.")
          : rub === "pro" ? E2(`La reseña no devuelve dinero ni cambia tu trámite. Si algo quedó mal, pídelo en Ayuda con el trámite: ${b.name} responde en 24 h.`, `A review does not refund money or change your case. If something is wrong, ask in Case help: ${b.name} replies within 24 h.`)
          : rub === "salud" ? E2(`La reseña no devuelve dinero ni corrige un cobro. Si algo quedó mal, pídelo en Ayuda con la cita: ${b.name} responde en 24 h.`, `A review does not refund money or fix a charge. If something is wrong, ask in Appointment help: ${b.name} replies within 24 h.`)
          : rub === "hogar" ? E2(`La reseña no devuelve dinero ni pide que vuelvan. Si algo quedó mal, pídelo en Ayuda con la visita: ${b.name} responde en 24 h.`, `A review does not refund money or request a return visit. If something is wrong, ask in Visit help: ${b.name} replies within 24 h.`)
        : E2(`La reseña no devuelve dinero ni pide que lo revisen. Si algo quedó mal, pídelo en Ayuda con la cita: ${b.name} responde en 24 h.`, `A review does not refund money or request a recheck. If something is wrong, ask in Appointment help: ${b.name} replies within 24 h.`))
        : E2("Cuenta qué pasó, sin insultos ni datos personales. Así el negocio puede responder y los vecinos entienden.", "Say what happened, without insults or personal data. That way the business can reply and neighbors understand.")}
        {(rub === "merc" || rub === "tienda") && src === "op" && numeroOp && <div className="mt-2 flex"><Button variant="secondary" size="sm" icon="help" onClick={() => router.push(rub === "merc" ? `/mercado/${numeroOp}/ayuda` : `/apartado/${numeroOp}/ayuda`)}>{rub === "merc" ? E2("Ir a Ayuda con el pedido", "Go to Order help") : E2("Ir a Ayuda con la compra", "Go to Purchase help")}</Button></div>}
        {rub && rub !== "fiesta" && rub !== "trans" && conCita && numeroOp && <div className="mt-2 flex"><Button variant="secondary" size="sm" icon="help" onClick={() => router.push(`/cita/${numeroOp}/ayuda`)}>{rub === "hogar" ? E2("Ir a Ayuda con la visita", "Go to Visit help") : rub === "pro" ? E2("Ir a Ayuda con el trámite", "Go to Case help") : E2("Ir a Ayuda con la cita", "Go to Appointment help")}</Button></div>}</div>
    </div>
  );
  const reglasB = (
    <div className="flex items-start gap-2.5 rounded-[14px] bg-ink/[.04] px-3.5 py-3">
      <span className="grid flex-none pt-px"><Icon name="lock" size={15} color="rgba(11,14,18,.6)" /></span>
      <span className="text-pretty text-[12px] font-medium leading-[1.55] text-ink/[.68]">{reglas}</span>
    </div>
  );
  const fallo = error && <div role="alert" className="rounded-[14px] bg-[rgba(192,57,43,.07)] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>;
  const boton = <Button variant="primary" block disabled={!!miss || enviando || subiendo} onClick={publicar}>{editar ? E2("Guardar cambios", "Save changes") : E2("Publicar reseña", "Post review")}</Button>;
  const nota = <div className="text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-ink/45">{miss ? `${E2("FALTA: ", "MISSING: ")}${miss}` : E2("SE PUBLICA AL INSTANTE", "POSTS INSTANTLY")}</div>;
  const cuerpo = <>{fallo}{negocio}{estrellasB}{importa}{recs}{texto}{fotosB}{bajo}{reglasB}</>;

  return (
    <div data-pantalla="APP-NEG-RESENA" className="min-h-dvh bg-paper pb-[130px] lg:px-[30px] lg:pb-[60px] lg:pt-[22px]">
      <div data-screen-label="APP-NEG-RESENA · móvil" className="lg:hidden">
        <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3">
          <button type="button" aria-label={E2("Volver", "Back")} onClick={volver} className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
          <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{title}</div><div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{meta}</div></div>
        </div>
        <div className="flex flex-col gap-3 px-4 pt-4">{cuerpo}</div>
        <div data-screen-label="Reseña · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex">{boton}</div><div className="mt-[9px]">{nota}</div>
        </div>
      </div>
      <div data-screen-label="APP-NEG-RESENA · desktop" className="mx-auto hidden max-w-[1080px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{E2("Volver", "Back")}</button>
        <div className="mt-4 font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{meta}</div>
        <h1 className="mt-1.5 font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.04em]">{title}</h1>
        <div className="mt-[18px] grid items-start gap-x-12 gap-y-8 min-[1100px]:grid-cols-[minmax(0,1fr)_372px]">
          <div className="flex min-w-0 flex-col gap-3.5">{cuerpo}</div>
          <div className="flex flex-col gap-3.5 min-[1100px]:sticky min-[1100px]:top-[96px]">
            <div className={K}>{E2("ASÍ LA VAN A VER", "HOW OTHERS WILL SEE IT")}</div>
            <ReviewCard {...propsTarjeta(borrador, { es, negocio: b.name, preview: true })} />
            <div className="flex">{boton}</div>{nota}
          </div>
        </div>
      </div>
    </div>
  );
}
