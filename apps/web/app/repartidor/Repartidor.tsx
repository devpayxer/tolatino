"use client";
/* App To'Latino Repartidor (plan apps-delivery-checkin.md §1.3; sin pantallas en el diseño: compuesta con los bloques del
   sistema y la barra inferior, anotado en REVISION). Botones grandes, un paso a la vez. Sin señal: el paso se guarda en el
   teléfono y se envía solo cuando vuelve la señal (el servidor ignora un paso repetido). */
import * as UI from "@tolatino/ui";
import type { SalidaC } from "@/lib/chofer";
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition, type ComponentType } from "react";
import type { EntregaRep, MiRep, PasoRep } from "@/lib/repartidor";
import { choferAbordoAccion, choferPasoAccion, repAceptar, repEnLinea, repPaso, repProblema, repSalir } from "./acciones";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { BottomNav } = UI as unknown as Record<"BottomNav", ComponentType<any>>;
type Tab = "inicio" | "pedidos" | "ganancias" | "perfil";
type Gan = { dia: string; entregas: number; propinas: number; efectivo: number };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const hora = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "AM" : "PM"}`;
const hoyNY = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const VEH: [string, string, string][] = [["pie", "A pie", "On foot"], ["bici", "Bici", "Bike"], ["moto", "Moto", "Motorbike"], ["auto", "Auto", "Car"], ["camioneta", "Camioneta", "Van"]];
const MOT: [string, string, string][] = [["noresponde", "El cliente no responde", "Customer not answering"], ["direccion", "La dirección está mal", "Wrong address"], ["demora", "El negocio se está tardando", "The business is running late"],
  ["incompleto", "El pedido está incompleto", "Order is incomplete"], ["accidente", "Tuve un accidente o un problema con el vehículo", "Accident or vehicle problem"], ["otro", "Otro problema", "Something else"]];
const AT: Record<string, [string, string]> = { timbre: ["Toca el timbre", "Ring the bell"], noTimbre: ["No toques el timbre", "Don't ring the bell"], llamar: ["Llámame al llegar", "Call me on arrival"], texto: ["Escríbeme al llegar", "Text me on arrival"] };
type Cola = { numero: string; paso: PasoRep; efectivo?: number; at: number }[];
const COLA = "tl-rep-cola-v1";
const leerCola = (): Cola => { try { return JSON.parse(localStorage.getItem(COLA) ?? "[]") as Cola; } catch { return []; } };
const guardarCola = (c: Cola) => { try { localStorage.setItem(COLA, JSON.stringify(c)); } catch { /* sin almacenamiento */ } };

export function Repartidor({ es, t, p, nombre, tel, equipos, entregas, ganancias, salidas, s }: {
  es: boolean; t: Tab; p: string | null; nombre: string; tel: string; equipos: MiRep[]; entregas: EntregaRep[]; ganancias: Gan[]; salidas: SalidaC[]; s: string | null;
}) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), [pend, start] = useTransition();
  const [toast, setToast] = useState(""), [err, setErr] = useState("");
  const [cod, setCod] = useState(""), [veh, setVeh] = useState("moto");
  const [cobro, setCobro] = useState(false), [prob, setProb] = useState(false), [mot, setMot] = useState(""), [nota, setNota] = useState("");
  const [cola, setCola] = useState<Cola>([]);
  const ir = (q: string) => router.push("/repartidor" + q);
  useEffect(() => { if (!toast) return; const x = setTimeout(() => setToast(""), 2600); return () => clearTimeout(x); }, [toast]);
  useEffect(() => { setCobro(false); setProb(false); setErr(""); }, [p]);
  // Sin señal: lo pendiente se envía al volver la señal (y cada 15 s mientras quede algo).
  const enviarCola = useCallback(async () => {
    const c = leerCola();
    if (!c.length || !navigator.onLine) { setCola(c); return; }
    const resto: Cola = [];
    for (const x of c) { try { await repPaso(x.numero, x.paso, x.efectivo); } catch { resto.push(x); } }
    guardarCola(resto); setCola(resto);
    if (resto.length < c.length) router.refresh();
  }, [router]);
  useEffect(() => { void enviarCola(); const on = () => void enviarCola(); window.addEventListener("online", on); const i = setInterval(on, 15000); return () => { window.removeEventListener("online", on); clearInterval(i); }; }, [enviarCola]);

  const run = (f: () => Promise<{ ok: boolean; msg?: { es: string; en: string } }>, ok: string, luego?: () => void) => start(async () => {
    setErr("");
    const r = await f().catch(() => null);
    if (!r) { setErr(E2("No se pudo. Revisa tu señal.", "Could not. Check your signal.")); return; }
    if (!r.ok) { setErr(r.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo.", "Could not.")); return; }
    if (ok) setToast(ok); luego?.(); router.refresh();
  });
  const paso = (numero: string, ps: PasoRep, ok: string, efectivo?: number) => {
    if (!navigator.onLine) { const c = [...leerCola(), { numero, paso: ps, efectivo, at: Date.now() }]; guardarCola(c); setCola(c); setToast(E2("Sin señal: se guardó y se envía solo.", "No signal: saved, it sends on its own.")); return; }
    start(async () => {
      setErr("");
      try {
        const r = await repPaso(numero, ps, efectivo);
        if (!r.ok) { setErr(es ? r.msg.es : r.msg.en); return; }
        setToast(ok); setCobro(false); router.refresh();
      } catch {
        const c = [...leerCola(), { numero, paso: ps, efectivo, at: Date.now() }]; guardarCola(c); setCola(c);
        setToast(E2("Sin señal: se guardó y se envía solo.", "No signal: saved, it sends on its own."));
      }
    });
  };

  const B: Bloque[] = [];
  const eq = equipos[0] ?? null;
  const activas = entregas.filter((x) => x.status === "confirmed"), hechas = entregas.filter((x) => x.status === "done");
  if (cola.length) B.push({ type: "note", tone: "warn", icon: "wifi", t: E2(`Sin señal: ${cola.length} ${cola.length === 1 ? "paso espera" : "pasos esperan"} enviarse. Se envían solos al volver la señal.`, `No signal: ${cola.length} ${cola.length === 1 ? "step is" : "steps are"} waiting. They send on their own when signal returns.`) });
  const TAG: Record<string, [string, string]> = { accepted: [E2("POR RECOGER", "TO PICK UP"), "neutral"], preparing: [E2("EN COCINA", "COOKING"), "neutral"], ready: [E2("LISTO PARA RECOGER", "READY"), "action"], on_the_way: [E2("EN CAMINO", "ON THE WAY"), "action"], delivered: [E2("ENTREGADO", "DELIVERED"), "signal"] };
  const fila = (x: EntregaRep): Fila => ({ key: x.numero, icon: x.status === "done" ? "check" : "truck", t: `#${x.numero} · ${x.calle ?? E2("Sin dirección", "No address")}`,
    s: `${x.negocio.nombre} · ${x.cliente}${x.efectivo != null ? ` · ${E2("cobrar", "collect")} ${money(x.efectivo)}` : x.pagado ? E2(" · pagado", " · paid") : ""}`,
    tag: (TAG[x.status === "done" ? "delivered" : x.stage] ?? TAG.accepted!)[0], tone: (TAG[x.status === "done" ? "delivered" : x.stage] ?? TAG.accepted!)[1], chev: true, onClick: () => ir(`?p=${x.numero}`),
    bd: x.status === "confirmed" ? "1.5px solid var(--tl-ink)" : undefined });

  const det = p ? entregas.find((x) => x.numero === p) ?? null : null;
  const sal = s ? salidas.find((x) => x.run === s) ?? null : null;
  const nmB = (b: { es: string; en: string } | null) => (b ? (es ? b.es : b.en || b.es) : "");
  const filaS = (x: SalidaC): Fila => { const n = x.pasajeros.reduce((a, q) => a + q.adultos + q.ninos, 0), sub = x.pasajeros.filter((q) => q.abordo === "boarded").reduce((a, q) => a + q.adultos + q.ninos, 0);
    return { key: x.run, icon: "truck", t: `${hora(x.m)} · ${nmB(x.svc)}`, s: `${x.negocio} · ${n} ${n === 1 ? E2("pasajero", "passenger") : E2("pasajeros", "passengers")}${sub ? E2(` · ${sub} abordaron`, ` · ${sub} boarded`) : ""}`,
      tag: x.st === "departed" ? E2("EN CAMINO", "ON THE WAY") : x.tarde != null ? E2(`TARDE · ${hora(x.tarde)}`, `LATE · ${hora(x.tarde)}`) : x.dia === hoyNY() ? E2("HOY", "TODAY") : E2("MAÑANA", "TOMORROW"),
      tone: x.st === "departed" ? "signal" : x.tarde != null ? "action" : "neutral", chev: true, onClick: () => ir(`?s=${x.run}`) }; };
  if (sal) {
    // Chofer · la salida: pasajeros con Abordó / No llegó; Va tarde · Salió · Llegó (los mismos pasos del panel).
    const x = sal;
    B.push({ type: "head", eye: `${x.negocio.toUpperCase()} · ${E2("SALIDA", "DEPARTURE")}`, t: `${hora(x.m)} · ${nmB(x.svc)}`, s: [nmB(x.from), nmB(x.to)].filter(Boolean).join(" → "), onBack: () => ir("") });
    if (x.tarde != null) B.push({ type: "note", tone: "warn", icon: "clock", t: E2(`Sale a las ${hora(x.tarde)}: los pasajeros ya lo saben.`, `Leaves at ${hora(x.tarde)}: passengers already know.`) });
    B.push(x.pasajeros.length ? { type: "rows", k: E2("PASAJEROS", "PASSENGERS"), items: x.pasajeros.map((q): Fila => ({ key: q.numero, icon: "users",
      t: `${q.quien} · ${q.adultos + q.ninos}`, s: `${q.numero}${q.ninos ? E2(` · ${q.ninos} niño${q.ninos > 1 ? "s" : ""}`, ` · ${q.ninos} child${q.ninos > 1 ? "ren" : ""}`) : ""}${q.nino ? E2(" · asiento de niño", " · child seat") : ""}${q.maletas ? E2(` · ${q.maletas} maleta extra`, ` · ${q.maletas} extra bag`) : ""}`,
      tag: q.abordo === "boarded" ? E2("ABORDÓ", "BOARDED") : q.abordo === "noshow" ? E2("NO LLEGÓ", "NO-SHOW") : undefined, tone: q.abordo === "boarded" ? "signal" : "danger", chev: false,
      acts: x.st === "scheduled" ? [{ l: E2("Abordó", "Boarded"), v: q.abordo === "boarded" ? "primary" : "secondary", icon: "check", onClick: () => run(() => choferAbordoAccion(x.run, q.numero, true), E2("Abordó.", "Boarded.")) },
        { l: E2("No llegó", "No-show"), v: "secondary", icon: null, onClick: () => run(() => choferAbordoAccion(x.run, q.numero, false), E2("No llegó.", "No-show.")) }] : undefined })) }
      : { type: "empty", icon: "users", t: E2("Sin pasajeros de la app", "No app passengers"), s: E2("Los vendidos en la oficina no salen aquí.", "Office sales do not show here.") });
    if (x.st === "scheduled") {
      B.push({ type: "acts", items: [{ l: E2("Salió", "It left"), v: "primary", icon: "truck", off: pend, onClick: () => run(() => choferPasoAccion(x.run, "salio"), E2("Listo: los pasajeros saben que va en camino.", "Done: passengers know it is on the way.")) }] });
      B.push({ type: "chips", k: E2("¿VA TARDE?", "RUNNING LATE?"), help: E2("A CADA PASAJERO LE LLEGA LA HORA NUEVA", "EVERY PASSENGER GETS THE NEW TIME"), items: [10, 15, 20, 30, 45, 60].map((m) => ({ l: `${m} min`, v: "filter", onClick: () => run(() => choferPasoAccion(x.run, "tarde", m), E2("Avisamos la hora nueva.", "We sent the new time.")) })) });
    }
    if (x.st === "departed") B.push({ type: "acts", items: [{ l: E2("Llegó", "Arrived"), v: "primary", icon: "check", off: pend, onClick: () => run(() => choferPasoAccion(x.run, "llego"), E2("Listo: viaje terminado.", "Done: trip finished."), () => ir("")) }] });
  } else if (!eq && !det) {
    // DLV-ONB: entrar al equipo con el código del negocio.
    B.push({ type: "head", eye: "TO'LATINO REPARTIDOR", t: E2(`Hola, ${nombre}`, `Hi, ${nombre}`), s: E2("Para repartir, entra al equipo del negocio con el código que te dio. Usa este mismo teléfono.", "To deliver, join the business team with the code they gave you. Use this same phone.") });
    B.push({ type: "field", k: E2("CÓDIGO DEL NEGOCIO · 6 LETRAS Y NÚMEROS", "BUSINESS CODE · 6 LETTERS AND NUMBERS"), val: cod, onChange: (v: string) => setCod(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)) });
    B.push({ type: "chips", k: E2("¿CÓMO REPARTES?", "HOW DO YOU DELIVER?"), items: VEH.map(([k, a, b]) => ({ l: es ? a : b, v: veh === k ? "selected" : "filter", onClick: () => setVeh(k) })) });
    B.push({ type: "acts", items: [{ l: pend ? E2("Entrando…", "Joining…") : E2("Entrar al equipo", "Join the team"), v: "primary", icon: "check", off: pend || cod.length !== 6, onClick: () => run(() => repAceptar(cod, veh), E2("Listo: ya eres parte del equipo.", "Done: you are on the team.")) }] });
    B.push({ type: "note", tone: "ink", icon: "shield", t: E2(`Entraste con ${tel.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3")}. El código solo sirve con el teléfono que te invitó el negocio.`, `Signed in as ${tel.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3")}. The code only works with the phone the business invited.`) });
  } else if (det) {
    // DLV-PEDIDOS · detalle con el paso que sigue (botón grande).
    const x = det, cash = x.efectivo != null, vivo = x.status === "confirmed";
    B.push({ type: "head", eye: `${x.negocio.nombre.toUpperCase()} · ${E2("PEDIDO", "ORDER")} #${x.numero}`, t: x.calle ?? E2("Entrega", "Delivery"), s: [x.apto, x.zip, x.mi != null ? `${x.mi} mi` : null].filter(Boolean).join(" · "), onBack: () => ir(t === "inicio" ? "" : `?t=${t}`) });
    B.push({ type: "kv", items: [{ k: E2("CLIENTE", "CUSTOMER"), v: x.cliente }, { k: E2("LLEGA", "ARRIVES"), v: x.llega ?? x.listo ?? "—" },
      { k: E2("COBRO", "PAYMENT"), v: cash ? E2(`Cobrar ${money(x.efectivo!)} en efectivo`, `Collect ${money(x.efectivo!)} cash`) : x.pagado ? E2("Pagado con tarjeta", "Paid by card") : E2("Pagado", "Paid") },
      { k: E2("PROPINA", "TIP"), v: x.propina ? money(x.propina) : "—" }] });
    if (vivo) B.push({ type: "rows", items: [
      { icon: "pin", t: x.calle ?? "—", s: [x.apto, x.zip].filter(Boolean).join(" · ") || undefined, chev: false, compact: true,
        acts: [{ l: E2("Abrir mapa", "Open map"), v: "secondary", icon: "pin", onClick: () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${x.calle ?? ""}, ${x.zip ?? ""}`)}`, "_blank", "noopener") },
          ...(x.telCliente ? [{ l: E2("Llamar", "Call"), v: "secondary", icon: "phone", onClick: () => { location.href = `tel:${x.telCliente}`; } }] : [])] },
      ...(x.entrega ? [{ icon: x.entrega.drop === "puerta" ? "home" : "users", t: x.entrega.drop === "puerta" ? E2("Dejar en la puerta", "Leave at door") : E2("En la mano", "Hand it to them"),
        s: [x.entrega.at.map((k) => (es ? AT[k]?.[0] : AT[k]?.[1])).filter(Boolean).join(" · "), x.entrega.note ? `“${x.entrega.note}”` : ""].filter(Boolean).join(" · ") || undefined, chev: false, compact: true } as Fila] : []),
      { icon: "store", t: E2(`Recoges en ${x.negocio.nombre}`, `Pick up at ${x.negocio.nombre}`), s: x.negocio.direccion ?? undefined, chev: false, compact: true,
        acts: x.negocio.tel ? [{ l: E2("Llamar", "Call"), v: "secondary", icon: "phone", onClick: () => { location.href = `tel:${x.negocio.tel}`; } }] : undefined },
    ] });
    B.push({ type: "rows", k: E2("LO QUE LLEVAS", "WHAT YOU CARRY"), items: x.lineas.map((l, i): Fila => ({ key: String(i), icon: "bag", ibg: "var(--tl-paper)", ifg: "rgba(11,14,18,.6)", t: `${l.q} × ${es ? l.name.es : l.name.en || l.name.es}`, compact: true, chev: false })) });
    const st = x.stage, en = st === "on_the_way";
    B.push({ type: "timeline", k: E2("PASOS", "STEPS"), items: [
      { t: E2("Recogido · en camino", "Picked up · on the way"), s: en || x.status === "done" ? E2("HECHO", "DONE") : E2("AHORA", "NOW"), now: !en && vivo },
      { t: E2("Llegué", "Arrived"), s: x.llegue ? E2("HECHO", "DONE") : "", now: en && !x.llegue, future: !en },
      { t: E2("Entregado", "Delivered"), s: x.status === "done" ? E2("HECHO", "DONE") : "", now: en && x.llegue, future: !en },
    ] as never });
    if (err) B.push({ type: "note", tone: "danger", icon: "warning", t: err });
    if (vivo && !en) B.push({ type: "acts", items: [{ l: E2("Recogí, voy en camino", "Picked up, on my way"), v: "primary", icon: "truck", off: pend, onClick: () => paso(x.numero, "recogi", E2("El cliente ya sabe que vas en camino.", "The customer knows you are on the way.")) }] });
    if (vivo && en && !x.llegue) B.push({ type: "acts", items: [{ l: E2("Llegué", "I'm here"), v: "primary", icon: "pin", off: pend, onClick: () => paso(x.numero, "llegue", E2("Le avisamos al cliente que llegaste.", "We told the customer you arrived.")) }] });
    if (vivo && en && (x.llegue || cobro)) {
      if (cash && !cobro) B.push({ type: "acts", items: [{ l: E2(`Cobrar ${money(x.efectivo!)}`, `Collect ${money(x.efectivo!)}`), v: "primary", icon: "dollar", off: pend, onClick: () => setCobro(true) }] });
      else if (cash && cobro) {
        B.push({ type: "note", tone: "warn", icon: "dollar", t: E2(`Cobra exactamente ${money(x.efectivo!)} en efectivo. Si te dan más, da el cambio. Lo que cobras lo entregas al negocio al cerrar.`, `Collect exactly ${money(x.efectivo!)} in cash. Give change if needed. You hand it to the business at the end.`) });
        B.push({ type: "acts", items: [{ l: E2(`Cobré ${money(x.efectivo!)} · Entregado`, `Collected ${money(x.efectivo!)} · Delivered`), v: "primary", icon: "check", off: pend, onClick: () => paso(x.numero, "entregado", E2("Entregado. Gracias.", "Delivered. Thanks."), x.efectivo!) },
          { l: E2("Volver", "Back"), v: "secondary", onClick: () => setCobro(false) }] });
      } else B.push({ type: "acts", items: [{ l: E2("Entregado", "Delivered"), v: "primary", icon: "check", off: pend, onClick: () => paso(x.numero, "entregado", E2("Entregado. Gracias.", "Delivered. Thanks.")) }] });
    }
    if (vivo && !prob) B.push({ type: "acts", items: [{ l: E2("Reportar un problema", "Report a problem"), v: "secondary", icon: "warning", onClick: () => { setProb(true); setMot(""); setNota(""); } }] });
    if (vivo && prob) {
      B.push({ type: "group", k: E2("¿QUÉ PASÓ? · LE LLEGA AL NEGOCIO", "WHAT HAPPENED? · THE BUSINESS GETS IT") });
      B.push({ type: "chips", items: MOT.map(([k, a, b]) => ({ l: es ? a : b, v: mot === k ? "selected" : "filter", onClick: () => setMot(k) })) });
      B.push({ type: "field", k: E2("DETALLE · OPCIONAL", "DETAIL · OPTIONAL"), val: nota, area: true, rows: 2, max: 200, count: `${nota.length}/200`, onChange: (v: string) => setNota(v.slice(0, 200)) });
      B.push({ type: "acts", items: [{ l: E2("Enviar al negocio", "Send to the business"), v: "primary", icon: "check", off: pend || !mot, onClick: () => run(() => repProblema(x.numero, mot, nota), E2("El negocio ya lo sabe.", "The business knows."), () => setProb(false)) },
        { l: E2("Cancelar", "Cancel"), v: "secondary", onClick: () => setProb(false) }] });
      B.push({ type: "note", tone: "ink", icon: "emergency", t: E2("Si alguien está en peligro, llama al 911 primero.", "If someone is in danger, call 911 first.") });
    }
  } else if (t === "inicio") {
    const hoy = ganancias[0] && ganancias[0].dia === new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }) ? ganancias[0] : { entregas: 0, propinas: 0, efectivo: 0 };
    B.push({ type: "head", eye: `${E2("REPARTES PARA", "DELIVERING FOR")} ${eq!.negocio.nombre.toUpperCase()}`, t: eq!.enLinea ? E2("Estás en línea", "You are online") : E2("Estás fuera de línea", "You are offline"),
      s: eq!.enLinea ? E2("El negocio ve que puedes llevar pedidos.", "The business sees you can take orders.") : E2("Ponte en línea para que el negocio te asigne pedidos.", "Go online so the business can assign you orders.") });
    B.push({ type: "rows", items: [{ icon: "truck", t: E2("En línea", "Online"), s: eq!.enLinea ? E2("Toca para terminar tu turno", "Tap to end your shift") : E2("Toca para empezar tu turno", "Tap to start your shift"), tgOn: eq!.enLinea,
      onTg: () => run(() => repEnLinea(eq!.id, !eq!.enLinea), eq!.enLinea ? E2("Fuera de línea.", "Offline.") : E2("En línea.", "Online.")) }] });
    B.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [
      { k: E2("ENTREGAS HOY", "DELIVERIES TODAY"), v: String(hoy.entregas), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: E2("PROPINAS", "TIPS"), v: money(hoy.propinas) },
      { k: E2("EFECTIVO", "CASH"), v: money(hoy.efectivo), s: E2("se entrega al negocio", "goes to the business") },
    ] });
    // 4y-3b · Chofer de Transporte: sus salidas de hoy y mañana arriba.
    if (salidas.length) B.push({ type: "rows", k: `${E2("TUS SALIDAS", "YOUR DEPARTURES")} · ${salidas.length}`, items: salidas.map(filaS) });
    if (activas.length || !salidas.length) B.push(activas.length ? { type: "rows", k: E2(`AHORA · ${activas.length}`, `NOW · ${activas.length}`), items: activas.map(fila) }
      : { type: "empty", icon: "truck", t: E2("Sin entregas ahora", "No deliveries now"), s: E2("Cuando el negocio te asigne una, sale aquí y te llega un mensaje.", "When the business assigns one, it shows here and you get a message.") });
  } else if (t === "pedidos") {
    B.push({ type: "head", t: E2("Pedidos", "Orders"), s: E2("Tus entregas activas y las de hoy.", "Your active deliveries and today's.") });
    B.push(activas.length ? { type: "rows", k: E2("ACTIVOS", "ACTIVE"), items: activas.map(fila) } : { type: "empty", icon: "truck", t: E2("Sin entregas activas", "No active deliveries"), s: E2("Ponte en línea en Inicio.", "Go online in Home.") });
    if (hechas.length) B.push({ type: "rows", k: E2(`ENTREGADOS HOY · ${hechas.length}`, `DELIVERED TODAY · ${hechas.length}`), items: hechas.map(fila) });
  } else if (t === "ganancias") {
    const tot = ganancias.reduce((a, g) => ({ e: a.e + g.entregas, p: a.p + g.propinas, c: a.c + g.efectivo }), { e: 0, p: 0, c: 0 });
    B.push({ type: "head", t: E2("Ganancias", "Earnings"), s: E2("Tus entregas de los últimos 14 días. El negocio te paga directo; aquí queda el registro.", "Your deliveries in the last 14 days. The business pays you directly; this is the record.") });
    B.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("ENTREGAS", "DELIVERIES"), v: String(tot.e), bg: "var(--tl-ink)", fg: "var(--tl-white)" }, { k: E2("PROPINAS", "TIPS"), v: money(tot.p) }, { k: E2("EFECTIVO COBRADO", "CASH COLLECTED"), v: money(tot.c) }] });
    B.push(ganancias.length ? { type: "rows", items: ganancias.map((g): Fila => ({ key: g.dia, icon: "calendar", t: new Date(`${g.dia}T12:00:00Z`).toLocaleDateString(es ? "es-US" : "en-US", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).replace(/\./g, ""),
      s: `${g.entregas} ${g.entregas === 1 ? E2("entrega", "delivery") : E2("entregas", "deliveries")} · ${E2("propinas", "tips")} ${money(g.propinas)}`, r: money(g.efectivo), chev: false })) }
      : { type: "empty", icon: "wallet", t: E2("Todavía no hay entregas", "No deliveries yet"), s: E2("Aquí ves cada día tus entregas, propinas y el efectivo cobrado.", "Here you see your deliveries, tips and cash collected each day.") });
  } else {
    B.push({ type: "head", t: nombre, s: tel.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3") });
    B.push({ type: "rows", k: E2("TUS EQUIPOS", "YOUR TEAMS"), items: equipos.map((e): Fila => ({ key: e.id, icon: "store", t: e.negocio.nombre, s: `${(VEH.find((v) => v[0] === e.vehiculo) ?? VEH[2]!)[es ? 1 : 2]}${e.enLinea ? E2(" · en línea", " · online") : ""}`, chev: false,
      acts: [{ l: E2("Salir del equipo", "Leave team"), v: "secondary", onClick: () => { if (window.confirm(E2(`¿Salir del equipo de ${e.negocio.nombre}?`, `Leave ${e.negocio.nombre}'s team?`))) run(() => repSalir(e.id), E2("Saliste del equipo.", "You left the team.")); } }] })) });
    B.push({ type: "rows", items: [
      { icon: "language", t: E2("Idioma y cuenta", "Language and account"), s: E2("Mi cuenta de To’Latino", "My To’Latino account"), onClick: () => router.push("/cuenta/ajustes") },
      { icon: "home", t: E2("Ir a To’Latino", "Go to To’Latino"), onClick: () => router.push("/") },
    ] });
  }
  // El error de la última acción, debajo del encabezado (en el detalle va junto a los botones).
  if (err && !det) { const i = B.findIndex((b) => b.type === "head"); B.splice(i + 1, 0, { type: "note", tone: "danger", icon: "warning", t: err }); }
  return (
    <div className="min-h-dvh bg-paper pb-[110px]">
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pt-5">
        <PanelBloques bloques={B} h1={24} />
      </div>
      {toast && <div role="status" className="fixed bottom-[104px] left-1/2 z-[90] w-[calc(100%-40px)] max-w-[380px] -translate-x-1/2 rounded-[14px] bg-ink px-4 py-3 text-center text-[13px] font-bold text-white">{toast}</div>}
      {eq && <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-[14px]">
        <BottomNav items={[{ id: "inicio", label: E2("INICIO", "HOME"), icon: "home" }, { id: "pedidos", label: E2("PEDIDOS", "ORDERS"), icon: "truck" }, { id: "ganancias", label: E2("GANANCIAS", "EARNINGS"), icon: "wallet" }, { id: "perfil", label: E2("PERFIL", "PROFILE"), icon: "users" }]}
          active={p ? "pedidos" : t} onChange={(id: string) => ir(id === "inicio" ? "" : `?t=${id}`)} homeIndicator={false} />
      </div>}
    </div>
  );
}
