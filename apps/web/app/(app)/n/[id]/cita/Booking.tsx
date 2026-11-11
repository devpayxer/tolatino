"use client";
/* APP-NEG-BOOKING · móvil y · desktop (prototipo bookVals): Día y hora → Detalles → Revisa y envía. En el teléfono, un
   paso a la vez con la barra «Booking · barra»; en escritorio, todo en una página con la columna de pago. Las horas las
   decide el servidor (horasDeCita) y al enviar vuelve a revisar todo (pedirCita). Compuesto con el sistema de diseño
   (StepHeader, DateStrip, TimeSlots, StaffPicker, Chip, PaymentSummary, DepositOutcomes, Button, Icon). */
import { vibrar } from "@/lib/nativo/haptica";
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import type { CitasPublica, HorasCita } from "@/lib/citas";
import { subirFoto } from "@/lib/subir-foto";
import { MetodoPago, marcaB, tarjetaL, type ModoTarjeta, type Tarjeta } from "../../../pago/MetodoPago";
import { avisameEstado, avisameHora, horasDeCita, pedirCita, proximasHoras } from "../acciones-cita";
import { aprC, aprL, diaS, dinero, durL, horaL, precio } from "../Servicios";
import { uuid } from "@/lib/uuid";

type N = "Icon" | "Button" | "Chip" | "StepHeader" | "DateStrip" | "TimeSlots" | "StaffPicker" | "PaymentSummary" | "DepositOutcomes";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, StepHeader, DateStrip, TimeSlots, StaffPicker, PaymentSummary, DepositOutcomes } = UI as unknown as Record<N, ComponentType<any>>;

const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});
const DOW = { es: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"], en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] };
const DL = { es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
const MO = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
function diaLargo(hoy: string, i: number, es: boolean) {
  const d = new Date(`${hoy}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + i);
  return es ? `${DL.es[d.getUTCDay()]} ${d.getUTCDate()} ${MO.es[d.getUTCMonth()]}` : `${DL.en[d.getUTCDay()]}, ${MO.en[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const telL = (t: string | null) => { const d = (t ?? "").replace(/\D/g, "").slice(-10); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : ""; };
const radio = (on: boolean) => (on ? "border-[1.5px] border-ink" : "border border-ink/10");
const anillo = (on: boolean) => (on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25");

type Pago = { modo: ModoTarjeta; pk: string | null; tarjetas: Tarjeta[] } | null;
export function Booking({ cp, svcId, inicial, es, pago, yo, cambiar }: {
  cp: CitasPublica; svcId: string; inicial: { opts: Record<string, number>; adds: string[]; con: string }; es: boolean; pago: Pago; yo: { nombre: string; tel: string | null } | null;
  cambiar?: { numero: string; st: "pend" | "ok"; dep: number; i: number; m: number } | null; // «Cambiar» desde Tu cita: el depósito pasa a la nueva hora
}) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const s = cp.servicios.find((x) => x.id === svcId)!;
  const silla = cp.model === "chair", w = { uno: nm(cp.w.uno), silla: nm(cp.w.silla) };
  const [paso, setPaso] = useState(0);
  const [con, setCon] = useState(inicial.con);
  const [i, setI] = useState(0);
  const [h, setH] = useState<number | null>(null);
  const [asig, setAsig] = useState<string | null>(null); // con «Cualquiera»: quién queda a esa hora
  const [H, setHoras] = useState<HorasCita | null>(null);
  const [cargando, setCargando] = useState(true);
  const [prox, setProx] = useState<Record<string, { i: number; m: number } | null>>({});
  const [para, setPara] = useState<"me" | "other" | "kid">(/niñ|kid|child/i.test(s.name.es + s.name.en) ? "kid" : "me");
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [fotos, setFotos] = useState<{ id: string; url: string }[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [sms, setSms] = useState(true);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(pago?.tarjetas ?? []);
  const [tarjeta, setTarjeta] = useState<Tarjeta | null>(pago?.tarjetas.find((t) => t.def) ?? pago?.tarjetas[0] ?? null);
  const [hoja, setHoja] = useState(false);
  const [declinada, setDeclinada] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [alerta, setAlerta] = useState(false);
  const clave = useRef<string>("");
  const abierto = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { clave.current = uuid(); }, []);
  useEffect(() => { let vivo = true; void proximasHoras(cp.negocio.id, s.dur).then((x) => { if (vivo) setProx(x); }); return () => { vivo = false; }; }, [cp.negocio.id, s.dur]);
  const q = useMemo(() => ({ svc: s.id, opts: inicial.opts, adds: inicial.adds, con, i }), [s.id, inicial.opts, inicial.adds, con, i]);
  useEffect(() => {
    let vivo = true; setCargando(true);
    void horasDeCita(cp.negocio.id, q, cambiar?.numero).then((x) => {
      if (!vivo) return;
      // Como el prototipo (start: i = próxima hora libre): la primera vez abre en el primer día con horas libres.
      if (!abierto.current) { abierto.current = true; const d = x?.dias.find((z) => !z.off); if (x && d && d.i !== q.i && !x.grupos.some((g) => g.sl.some((z) => z.free))) { setI(d.i); return; } }
      setHoras(x); setCargando(false);
    });
    return () => { vivo = false; };
  }, [cp.negocio.id, q]);
  useEffect(() => {
    if (!yo) return; let vivo = true;
    void avisameEstado(cp.negocio.id, con, i).then((x) => { if (vivo) setAlerta(x); });
    return () => { vivo = false; };
  }, [cp.negocio.id, con, i, yo]);

  // Lo elegido: precio y tiempo con quien atiende (con «Cualquiera», el del local o el de quien queda a esa hora).
  const own = con !== "any" ? con : asig;
  const quien = own ? cp.gente.find((p) => p.id === own) ?? null : null;
  const P = precio(s, cp.extras, { opts: inicial.opts, adds: inicial.adds }, own);
  const dep = Math.min(quien?.dep ?? (silla ? 0 : Math.max(0, ...cp.gente.map((p) => p.dep))), P.cents);
  const auto = quien ? quien.auto : cp.pol.auto;
  const resp = quien ? quien.resp : cp.pol.resp;
  const who1 = silla && quien ? quien.corto : cp.negocio.nombre;
  const ol = s.opts.map((g, gi) => ({ g, o: g.o[inicial.opts[String(gi)]!]! }));
  const al = inicial.adds.map((id) => cp.extras.find((x) => x.id === id)!).filter(Boolean);
  const optL = ol.map((x) => nm(x.o.n)).join(" · "), addL = al.map((a) => nm(a.name)).join(" · ");
  const libre = (m: number) => H?.grupos.some((g) => g.sl.some((x) => x.m === m && x.free));
  const hSel = h != null && libre(h) ? h : null;
  const end = hSel != null ? hSel + P.dur : null;

  // ── Día y hora ──
  const dias = (H?.dias ?? []).map((d) => ({ id: `d${d.i}`, dow: d.i === 0 ? E2("HOY", "TODAY") : DOW[es ? "es" : "en"][d.dow], num: d.num, off: d.off }));
  const grupos = (H?.grupos ?? []).map((g) => ({ k: g.k === "m" ? E2("MAÑANA", "MORNING") : g.k === "t" ? E2("TARDE", "AFTERNOON") : E2("NOCHE", "EVENING"), slots: g.sl.map((x) => ({ t: x.l, taken: !x.free })) }));
  const hayLibres = !!H?.grupos.some((g) => g.sl.some((x) => x.free));
  const onSlot = (t: string) => { const x = H?.grupos.flatMap((g) => g.sl).find((z) => z.l === t && z.free); if (x) { setH(x.m); setAsig(x.who ?? null); setError(null); } };
  const hacen = cp.gente.filter((p) => s.hacen.some((z) => z.id === p.id));
  const people = !silla && cp.pol.pick && hacen.length > 1 ? hacen.map((p) => { const nx = prox[p.id]; return { id: p.id, name: p.corto, image: p.foto ?? undefined, next: nx ? (nx.i === 0 ? horaL(nx.m) : diaS(cp.hoy, nx.i, es)).toUpperCase() : "", soon: nx?.i === 0 }; }) : [];
  const asigN = con === "any" && asig ? cp.gente.find((p) => p.id === asig)?.corto ?? null : null;
  const stfN = !silla && con !== "any" ? cp.gente.find((p) => p.id === con)?.corto ?? null : null;
  const agenda = silla && quien ? E2(`Estas horas son de la agenda de ${quien.corto}. El local puede estar abierto y su ${w.silla.toLowerCase()} ocupada.`, `These times come from ${quien.corto}'s own schedule. The shop can be open while the ${w.silla.toLowerCase()} is busy.`)
    : people.length ? (con === "any" ? E2(`Con «Cualquiera» ves todas las horas del local${asigN ? `. A esa hora te atiende ${asigN}.` : "; te toca quien esté libre."}`, `With "Anyone" you see every time at the shop${asigN ? `. At that time ${asigN} takes you.` : "; whoever is free takes you."}`) : E2(`Horas de la agenda de ${stfN}.`, `Times from ${stfN}'s schedule.`))
      : P.dur >= 180 ? E2(`${who1} atiende a una persona a la vez: solo ves horas en que cabe tu servicio completo.`, `${who1} takes one client at a time: you only see times that fit your full service.`) : "";
  const pFoto = silla && quien ? quien.foto : cp.negocio.foto;
  const whoCard = {
    name: silla && quien ? quien.nombre : cp.negocio.nombre,
    line: (silla && quien ? `${w.silla} ${quien.silla ?? ""} · ${cp.negocio.nombre}` : cp.negocio.direccion ?? "").toUpperCase(),
    apr: aprL({ auto, resp }, es), aprC: aprC({ auto }),
  };

  // ── Detalles ──
  const kidOK = /niñ|kid|child|primer corte/i.test(`${s.name.es} ${s.name.en}`);
  const whos = ([["me", E2("Para mí", "For me"), yo ? `${yo.nombre}${telL(yo.tel) ? ` · ${telL(yo.tel)}` : ""}` : E2("Con los datos de tu cuenta", "With your account details")],
    ["other", E2("Para otra persona", "For someone else"), E2("Tú recibes los avisos", "You get the updates")],
    ...(kidOK ? [["kid", E2("Para un niño o niña", "For a child"), E2("Hasta 12 años · tú lo acompañas", "Up to 12 · you come along")]] : [])] as ["me" | "other" | "kid", string, string][]);
  const whoOk = para === "me" || (nombre.trim().length > 1 && (para === "other" || !!edad));
  const notePh = para === "kid" ? E2("Ej.: es su primer corte y le dan miedo las máquinas", "E.g.: first haircut, scared of clippers") : E2("Ej.: fade bajo, dejar largo arriba, sin diseño", "E.g.: low fade, keep length on top, no design");
  const notaPara = (stfN ?? (silla && quien ? quien.corto : cp.negocio.nombre)).toUpperCase();
  const subir = async (file: File | undefined) => {
    if (!file || fotos.length >= 3) return;
    if (!yo) { router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`); return; }
    setSubiendo(true);
    const r = await subirFoto(file);
    setSubiendo(false);
    if (r.ok && r.id && r.url) setFotos((L) => [...L, { id: r.id!, url: r.url! }]);
    else setError(r.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo subir la foto.", "Could not upload the photo."));
  };

  // ── Revisa y envía ──
  const paraL = para === "me" ? (yo?.nombre ?? E2("Tú", "You")) : para === "kid" ? `${nombre || E2("Tu hijo o hija", "Your child")}${edad ? ` · ${edad}${E2(" años", " yrs")}` : ""}` : nombre || E2("Otra persona", "Someone else");
  const conL = silla && quien ? `${quien.nombre} · ${w.silla.toLowerCase()} ${quien.silla ?? ""}` : stfN ? (cp.gente.find((p) => p.id === con)?.nombre ?? stfN) : people.length ? `${E2("Cualquiera", "Anyone")}${asigN ? ` · ${asigN}` : ""}` : cp.negocio.nombre;
  const restW = silla && quien ? E2(`en la silla de ${quien.corto}`, `at ${quien.corto}'s chair`) : E2("en el local", "at the shop");
  const filas = [[E2("SERVICIO", "SERVICE"), `${nm(s.name)}${optL ? ` · ${optL}` : ""}`], ...(addL ? [[E2("EXTRAS", "EXTRAS"), addL]] : []),
    [E2("CUÁNDO", "WHEN"), hSel != null ? `${cap(diaLargo(cp.hoy, i, es))} · ${horaL(hSel)} – ${horaL(end!)}` : E2("Elige día y hora", "Choose day and time")],
    [E2("CON", "WITH"), conL], [E2("DÓNDE", "WHERE"), cp.negocio.direccion ?? cp.negocio.nombre], [E2("PARA", "FOR"), paraL]];
  const baseCents = (own ? s.hacen.find((z) => z.id === own)?.cents : null) ?? s.cents;
  const optD = ol.reduce((n, x) => n + x.o.p, 0), optG = ol.map((x) => `${nm(x.g.t)}: ${nm(x.o.n).toLowerCase()}`).join(" · ");
  const lineas = [{ label: nm(s.name), sub: optG || undefined, value: dinero(baseCents + optD) }, ...al.map((a) => ({ label: nm(a.name), value: dinero(own ? a.hacen.find((z) => z.id === own)?.cents ?? a.cents : a.cents) }))];
  const rest = P.cents - dep;
  const carry = cambiar ? Math.min(cambiar.dep, dep) : 0, necesitaTarjeta = dep > 0 && !cambiar;
  const pay = {
    screenLabel: "Booking · pago", priceLabel: E2("PRECIO", "PRICE"), lines: lineas, totalLabel: E2("Total del servicio", "Service total"), total: dinero(P.cents), howLabel: E2("CÓMO SE PAGA", "HOW YOU PAY"),
    bar: dep > 0 ? { a: dep, b: Math.max(rest, 1) } : null,
    rows: [carry ? { label: E2("Ya pagado", "Already paid"), sub: E2(`Depósito de tu cita actual. Pasa a la nueva cuando ${who1} confirme; no se cobra otra vez.`, `Deposit from your current booking. It moves to the new one once ${who1} confirms; you are not charged again.`), value: dinero(carry), dot: "var(--tl-open)", color: "var(--tl-open-text)" } : dep ? { label: auto ? E2("Hoy, al confirmar", "Today, on confirmation") : E2("Hoy, al enviar", "Today, when you send"), sub: E2("Depósito. Se descuenta del total.", "Deposit. Taken off the total."), value: dinero(dep), dot: "var(--tl-ink)", color: "var(--tl-ink)" }
      : { label: E2("Hoy", "Today"), sub: E2("No pide depósito. No se cobra nada ahora.", "No deposit. Nothing is charged now."), value: "$0", dot: "rgba(11,14,18,.18)", color: "rgba(11,14,18,.45)" },
      { label: `${hSel != null ? cap(diaLargo(cp.hoy, i, es)) : E2("El día de tu cita", "On the day")}, ${restW}`, sub: silla && quien ? E2(`Efectivo o tarjeta, a ${quien.corto}. No al local.`, `Cash or card, to ${quien.corto}. Not to the shop.`) : E2("Efectivo o tarjeta.", "Cash or card."), value: dinero(rest), dot: dep ? "rgba(11,14,18,.18)" : "var(--tl-ink)", color: "var(--tl-ink)" }],
    card: necesitaTarjeta ? { screenLabel: "Booking · método de pago", kind: yo && tarjeta ? "brand" : "none", brand: tarjeta ? marcaB(tarjeta.marca) : "", label: yo && tarjeta ? tarjetaL(tarjeta) : E2("Tu tarjeta", "Your card"),
      sub: !yo ? E2("ENTRA PARA ELEGIRLA", "SIGN IN TO CHOOSE IT") : declinada && tarjeta?.pm === declinada ? E2("TU BANCO LA RECHAZÓ · CAMBIA DE TARJETA", "YOUR BANK DECLINED IT · CHANGE CARD") : auto ? E2("EL DEPÓSITO SE COBRA AL CONFIRMAR", "DEPOSIT CHARGED ON CONFIRMATION") : E2("EL DEPÓSITO SE RETIENE AL ENVIAR", "DEPOSIT HELD WHEN YOU SEND"),
      change: yo && tarjeta ? E2("Cambiar", "Change") : E2("Elegir", "Choose"), onClick: () => (yo ? setHoja(true) : entrar()) } : null,
  };
  const devuelve = `${E2("Te devolvemos ", "We refund ")}${dinero(dep)}`, GR = "var(--tl-open-text)";
  const salidas = carry ? {
    screenLabel: "Booking · tu depósito", title: `${E2("Tu depósito de ", "Your deposit of ")}${dinero(carry)}`.toUpperCase(),
    rows: [[E2(`${who1} confirma la nueva hora`, `${who1} confirms the new time`), E2("El depósito pasa a la nueva", "The deposit moves over"), "var(--tl-open-text)"], [E2("No la confirma o no contesta", "Not confirmed or no reply"), E2("Sigues con tu cita actual", "You keep your current booking"), "var(--tl-action)"]]
      .map(([label, value, color], k) => ({ label, value, color, top: k ? "1px solid rgba(11,14,18,.07)" : "none" })), foot: "",
  } : dep > 0 && !cambiar ? {
    screenLabel: "Booking · tu depósito", title: `${E2("Tu depósito de ", "Your deposit of ")}${dinero(dep)}`.toUpperCase(),
    rows: [...(auto ? [] : [[E2(`${who1} no puede a esa hora`, `${who1} cannot make that time`), E2("Te propone otra", "Proposes another"), "var(--tl-action)"],
      [E2("No te sirve la otra hora, o no tiene otra", "The new time does not work, or there is none"), devuelve, GR], [E2(`No contesta en ${cp.pol.exp} h`, `No reply in ${cp.pol.exp} h`), devuelve, GR]]),
      [E2(`Cancelas hasta ${cp.pol.cxh} h antes`, `You cancel up to ${cp.pol.cxh} h before`), devuelve, GR], [E2("Cancelas después o no llegas", "You cancel later or do not show"), `${E2("Se queda con ", "Kept by ")}${who1}`, "var(--tl-danger)"]]
      .map(([label, value, color], k) => ({ label, value, color, top: k ? "1px solid rgba(11,14,18,.07)" : "none" })),
    foot: !yo || !tarjeta ? E2("Los reembolsos vuelven a la tarjeta con que pagas, en 3 a 5 días hábiles.", "Refunds go back to the card you pay with, in 3 to 5 business days.") : E2(`Los reembolsos vuelven a tu ${tarjetaL(tarjeta)} en 3 a 5 días hábiles.`, `Refunds go back to your ${tarjetaL(tarjeta)} in 3 to 5 business days.`),
  } : null;
  const pol = [dep ? null : ["clock", E2(`Cancelar: gratis hasta ${cp.pol.cxh} h antes. Después: avísale por aquí.`, `Free cancellation up to ${cp.pol.cxh} h before. After that, let them know here.`)],
    ["users", E2(`Tolerancia: ${cp.pol.tol} min. Más tarde, ${silla && quien ? quien.corto : "el negocio"} puede darte otra hora.`, `Grace period: ${cp.pol.tol} min. Later than that, you may get another time.`)],
    auto ? ["check", E2(`${who1} confirma al instante.`, `${who1} confirms instantly.`)] : ["bell", E2(`${who1} tiene ${cp.pol.exp} h para contestar. Suele tardar ${resp >= 60 ? `${Math.round(resp / 60)} h` : `${resp} min`}.`, `${who1} has ${cp.pol.exp} h to reply. Usually ${resp >= 60 ? `${Math.round(resp / 60)} h` : `${resp} min`}.`)]]
    .filter(Boolean) as [string, string][];
  const listo = hSel != null && whoOk && (!necesitaTarjeta || !!tarjeta);
  const falta = hSel == null ? E2("Elige día y hora", "Choose day and time") : !whoOk ? (para === "kid" && nombre.trim().length > 1 ? E2("Elige la edad", "Choose the age") : E2("Falta el nombre", "Name missing")) : necesitaTarjeta && !tarjeta ? E2("Elige la tarjeta para el depósito", "Choose the card for the deposit") : "";
  const enviarL = cambiar ? (auto || cambiar.st === "pend" ? E2("Cambiar a esta hora", "Move to this time") : E2("Pedir el cambio", "Request the change")) : auto ? E2("Confirmar cita", "Confirm booking") : E2("Enviar solicitud", "Send request");
  const payK = dep ? E2("HOY PAGAS", "TODAY YOU PAY") : "TOTAL", payV = dep ? dinero(dep - carry) : dinero(P.cents);
  const payNote = cambiar && carry ? `${E2("NADA NUEVO HOY · RESTO ", "NOTHING NEW TODAY · REST ")}${dinero(rest)} · ${restW}`.toUpperCase() : dep ? `${E2("RESTO ", "REST ")}${dinero(rest)} · ${restW}`.toUpperCase() : `${E2("NO SE COBRA NADA AHORA · PAGAS ", "NOTHING CHARGED NOW · PAY ")}${restW}`.toUpperCase();

  function entrar() { router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`); }
  const volver = () => router.push(cambiar ? `/cita/${cambiar.numero}` : `/n/${cp.negocio.id}?tab=svc`);
  const enviar = async () => {
    if (!listo || ocupado || hSel == null) return;
    if (!yo) return entrar();
    setOcupado(true); setError(null);
    const r = await pedirCita(cp.negocio.id, {
      svc: s.id, opts: inicial.opts, adds: inicial.adds, con, i, m: hSel, para, nombre, edad: edad ?? undefined, nota, sms, pm: necesitaTarjeta ? tarjeta?.pm ?? null : null, clave: clave.current, fotos: fotos.map((f) => f.id), cambiar: cambiar?.numero ?? null,
    }).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    if (r.ok) { vibrar("hecho"); router.push(`/cita/${r.numero}${"cambio" in r && r.cambio ? "?cambio=1" : ""}`); return; }
    if ("entrar" in r && r.entrar) return entrar();
    setError(es ? r.msg.es : r.msg.en); setOcupado(false);
    if ("tarjeta" in r && r.tarjeta && tarjeta) { setDeclinada(tarjeta.pm); clave.current = uuid(); }
    if ("hora" in r && r.hora) { setH(null); setPaso(0); void horasDeCita(cp.negocio.id, q, cambiar?.numero).then(setHoras); }
  };
  const okPaso = paso === 0 ? hSel != null : paso === 1 ? whoOk : listo;
  const sigue = () => { if (!okPaso) return; if (paso === 2) return void enviar(); setPaso(paso + 1); window.scrollTo({ top: 0 }); };
  const T = [E2("Día y hora", "Day and time"), E2("Detalles", "Details"), E2("Revisa y envía", "Review and send")];

  // ── Bloques (los comparten teléfono y escritorio) ──
  const tarjetaSvc = (
    <div className={`flex items-center gap-[13px] px-[15px] py-3.5 ${caja}`}>
      <span className="h-[54px] w-[54px] flex-none rounded-[15px] bg-photo-bg" style={fondo(s.foto ?? cp.negocio.foto)} />
      <div className="min-w-0 flex-1">
        <div className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{nm(s.name)}</div>
        {(optL || addL || nm(s.desc)) && <div className="mt-[3px] text-[12px] font-medium leading-[1.4] text-ink/60">{optL || addL || nm(s.desc)}</div>}
        <div className="mt-[5px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${durL(P.dur)} · ${dinero(P.cents)}${dep ? ` · ${E2("DEPÓSITO ", "DEPOSIT ")}${dinero(dep)}` : ""}`.toUpperCase()}</div>
      </div>
      <button type="button" onClick={volver} className="flex-none text-[12px] font-bold text-action">{E2("Cambiar", "Change")}</button>
    </div>
  );
  const bloqueHora = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-[46px] w-[46px] flex-none place-items-center rounded-[14px] bg-photo-bg font-display text-[16px] font-extrabold text-ink/40" style={fondo(pFoto)}>{pFoto ? null : whoCard.name.charAt(0)}</span>
        <div className="min-w-0 flex-1"><div className="text-[14px] font-bold">{whoCard.name}</div>{whoCard.line && <div className="mt-1 font-mono text-[9.5px] font-semibold leading-[1.4] tracking-[0.04em] text-ink/50">{whoCard.line}</div>}</div>
        <span className={`flex-none rounded-[7px] px-2 py-1 font-mono text-[8.5px] font-bold tracking-[0.1em] ${whoCard.aprC}`}>{whoCard.apr}</span>
      </div>
      {people.length > 0 && (
        <div className="border-t border-ink/[.07] pt-3.5"><div className={K}>{E2("¿CON QUIÉN?", "WITH WHOM?")}</div>
          <div className="mt-[11px] grid"><StaffPicker people={people} selected={con} onSelect={(id: string) => { setCon(id); setH(null); setAsig(null); }} anyoneLabel={E2("Cualquiera", "Anyone")} /></div></div>
      )}
      <div className="border-t border-ink/[.07] pt-3.5"><div className={K}>{E2("DÍA", "DAY")}</div>
        <div className="mt-[11px] grid min-w-0">{dias.length ? <DateStrip days={dias} selected={`d${i}`} onSelect={(id: string) => { setI(Number(id.slice(1))); setH(null); setAsig(null); }} /> : <div className="h-[66px]" />}</div></div>
      {cargando && !H ? <div className="h-24 animate-pulse rounded-[15px] bg-paper" /> : hayLibres ? (
        <div className="flex flex-col gap-3.5" aria-busy={cargando}>
          {grupos.map((g) => <div key={g.k}><div className={K}>{g.k}</div><div className="mt-[9px] grid"><TimeSlots slots={g.slots} selected={hSel != null ? horaL(hSel) : ""} onSelect={onSlot} /></div></div>)}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-[15px] bg-paper px-[15px] py-3.5">
          <div className="text-[13.5px] font-bold leading-[1.4]">{E2(`No quedan horas el ${diaLargo(cp.hoy, i, es)}`, `No times left on ${diaLargo(cp.hoy, i, es)}`)}</div>
          {H?.sig && <button type="button" onClick={() => { setI(H.sig!.i); setH(null); }} className="text-left text-[12.5px] font-bold text-action">{E2(`Ver el ${diaS(cp.hoy, H.sig.i, es).toLowerCase()} · desde las ${horaL(H.sig.m)}`, `See ${diaS(cp.hoy, H.sig.i, es)} · from ${horaL(H.sig.m)}`)}</button>}
          <button type="button" onClick={async () => { if (!yo) return entrar(); const r = await avisameHora(cp.negocio.id, con, i, !alerta); if (r.ok) setAlerta(r.on); }} className="flex items-center gap-[9px] text-left">
            <Icon name="bell" size={15} color={alerta ? "var(--tl-action)" : "rgba(11,14,18,.6)"} />
            <span className={`text-[12.5px] font-semibold ${alerta ? "text-action" : "text-ink/75"}`}>{alerta ? E2("Te avisamos en Avisos si se libera una hora", "We will notify you in Alerts if a time opens up") : E2("Avísame si se libera una hora", "Tell me if a time opens up")}</span>
          </button>
        </div>
      )}
      {hSel != null && (
        <div className="flex items-center gap-[9px] rounded-[13px] bg-action/[.07] px-[13px] py-[11px]"><Icon name="clock" size={15} color="var(--tl-action)" />
          <span className="text-[12.5px] font-bold leading-[1.4] text-action-hover">{E2(`De ${horaL(hSel)} a ~${horaL(end!)} · ${durL(P.dur)}`, `From ${horaL(hSel)} to ~${horaL(end!)} · ${durL(P.dur)}`)}</span></div>
      )}
      {agenda && <div className="text-pretty text-[11.5px] font-medium leading-[1.5] text-ink/50">{agenda}</div>}
    </div>
  );
  const bloqueDet = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      <div>
        <div className={K}>{E2("¿PARA QUIÉN ES?", "WHO IS IT FOR?")}</div>
        <div className="mt-2.5 flex flex-col gap-2" role="radiogroup">
          {whos.map(([k, l, sub]) => (
            <button key={k} type="button" role="radio" aria-checked={para === k} onClick={() => setPara(k)} className={`flex items-center gap-3 rounded-[14px] bg-white px-3.5 py-[13px] text-left ${radio(para === k)}`}>
              <span className={`box-border h-5 w-5 flex-none rounded-full ${anillo(para === k)}`} />
              <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold leading-[1.35]">{l}</div><div className="mt-[3px] font-mono text-[10px] font-semibold leading-[1.4] tracking-[0.04em] text-ink/50">{sub}</div></div>
            </button>
          ))}
        </div>
        {para !== "me" && (
          <div className="mt-3">
            <label htmlFor="cita-nombre" className={K}>{para === "kid" ? E2("NOMBRE DEL NIÑO O NIÑA", "CHILD'S NAME") : E2("NOMBRE", "NAME")}</label>
            <input id="cita-nombre" value={nombre} onChange={(e) => setNombre(e.target.value.slice(0, 40))} placeholder={E2("Nombre y apellido", "First and last name")}
              className="mt-2 box-border h-[46px] w-full rounded-[13px] border border-ink/[.12] bg-white px-3.5 text-[14px] font-semibold outline-none" />
            {para === "kid" && (
              <>
                <div className={`mt-3 ${K}`}>{E2("EDAD", "AGE")}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{["1–3", "4–7", "8–12"].map((a) => <Chip key={a} variant={edad === a ? "selected" : "filter"} onClick={() => setEdad(a)}>{`${a}${E2(" años", " yrs")}`}</Chip>)}</div>
              </>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-ink/[.07] pt-3.5">
        <label htmlFor="cita-nota" className={K}>{`${E2("NOTA PARA ", "NOTE FOR ")}${notaPara}`}</label>
        <textarea id="cita-nota" value={nota} onChange={(e) => setNota(e.target.value.slice(0, 280))} placeholder={notePh} rows={3}
          className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] outline-none" />
        <div className={`mt-3 ${K}`}>{E2("FOTO DE REFERENCIA · OPCIONAL", "REFERENCE PHOTO · OPTIONAL")}</div>
        <div className="mt-[9px] flex flex-wrap gap-2.5">
          {fotos.map((f) => (
            <span key={f.id} className="relative h-[68px] w-[68px] rounded-[13px] bg-photo-bg" style={fondo(f.url)}>
              <button type="button" aria-label={E2("Quitar foto", "Remove photo")} onClick={() => setFotos((L) => L.filter((z) => z.id !== f.id))} className="absolute -right-1.5 -top-1.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-ink"><Icon name="close" size={10} color="var(--tl-white)" strokeWidth={2.6} /></button>
            </span>
          ))}
          {fotos.length < 3 && (
            <button type="button" disabled={subiendo} onClick={() => fileRef.current?.click()} className="box-border flex h-[68px] w-[68px] flex-col items-center justify-center gap-1 rounded-[13px] border-[1.5px] border-dashed border-ink/[.22] text-ink/55">
              <Icon name="image" size={18} color="rgba(11,14,18,.55)" /><span className="text-[10.5px] font-bold">{subiendo ? "…" : E2("Agregar", "Add")}</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void subir(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </div>
      <div role="switch" aria-checked={sms} aria-label={E2("Recordatorio", "Reminder")} tabIndex={0} onClick={() => setSms(!sms)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setSms(!sms); } }}
        className="flex cursor-pointer items-center gap-3 border-t border-ink/[.07] pt-3.5">
        <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{E2("Recordatorio", "Reminder")}</div><div className="mt-[3px] text-[12px] font-medium text-ink/55">{E2("24 horas y 2 horas antes, en Avisos", "24 hours and 2 hours before, in Alerts")}</div></div>
        <span className={`relative h-6 w-[42px] flex-none rounded-full transition-colors ${sms ? "bg-ink" : "bg-ink/[.18]"}`}><span className={`absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-transform ${sms ? "translate-x-[18px]" : ""}`} /></span>
      </div>
    </div>
  );
  const resumen = (
    <div className={`overflow-hidden ${caja}`}>
      <div className="flex items-center gap-3 border-b border-ink/[.07] px-[15px] py-3.5">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-[14px] bg-photo-bg font-display text-[15px] font-extrabold text-ink/40" style={fondo(pFoto)}>{pFoto ? null : whoCard.name.charAt(0)}</span>
        <div className="min-w-0 flex-1"><div className={K}>{E2("TU CITA", "YOUR BOOKING")}</div><div className="mt-[5px] font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]">{whoCard.name}</div>{whoCard.line && <div className="mt-[3px] font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{whoCard.line}</div>}</div>
      </div>
      <div className="px-[15px] py-0.5">
        {filas.map(([k, v2], n) => (
          <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}>
            <span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v2}</span>
          </div>
        ))}
      </div>
    </div>
  );
  const rechazo = declinada && tarjeta?.pm === declinada ? (
    <div data-screen-label="Booking · tarjeta rechazada" className="flex items-start gap-[11px] rounded-2xl border border-danger/25 bg-danger/[.08] px-[15px] py-3.5">
      <span className="grid flex-none pt-px"><Icon name="warning" size={17} color="var(--tl-danger)" /></span>
      <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold text-danger">{E2("Tu tarjeta fue rechazada", "Your card was declined")}</div><div className="mt-[3px] text-[12.5px] font-medium leading-[1.5] text-ink/70">{E2("No se cobró nada. Usa otra tarjeta para enviar la solicitud.", "Nothing was charged. Use another card to send the request.")}</div>
        <button type="button" onClick={() => setHoja(true)} className="mt-2 text-[12.5px] font-bold text-action">{E2("Cambiar tarjeta", "Change card")}</button></div>
    </div>
  ) : null;
  const politicas = (
    <div className={`p-[15px] ${caja}`}>
      <div className={K}>{E2("ANTES DE ENVIAR", "BEFORE YOU SEND")}</div>
      <div className="mt-2.5 flex flex-col gap-2.5">{pol.map(([ic, l]) => <div key={ic} className="flex items-start gap-2.5"><span className="grid flex-none pt-px"><Icon name={ic} size={15} color="rgba(11,14,18,.55)" /></span><span className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/70">{l}</span></div>)}</div>
    </div>
  );
  const errorBox = error ? <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div> : null;

  return (
    <div className="min-h-[100dvh] bg-paper">
      {/* Teléfono */}
      <div data-screen-label="APP-NEG-BOOKING · móvil" className="pb-[150px] lg:hidden">
        <div className="sticky top-[57px] z-20 grid lg:top-0"><StepHeader title={T[paso]} step={paso + 1} total={3} backLabel={E2("Volver", "Back")} onBack={paso > 0 ? () => { setPaso(paso - 1); window.scrollTo({ top: 0 }); } : volver} /></div>
        <div className="flex flex-col gap-3 px-4 pt-4">
          {paso === 0 && <>{cambiar && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-pro/[.12] px-3.5 py-[13px]">
              <span className="grid flex-none pt-px"><Icon name="edit" size={16} color="var(--tl-pro-ink)" /></span>
              <div className="min-w-0 flex-1"><div className="text-[13px] font-bold leading-[1.4] text-pro-ink">{cambiar.st === "pend" ? E2("Cambiando tu solicitud", "Changing your request") : E2(`Cambiando tu cita de ${diaS(cp.hoy, cambiar.i, es).toLowerCase()} · ${horaL(cambiar.m)}`, `Changing your booking for ${diaS(cp.hoy, cambiar.i, es)} · ${horaL(cambiar.m)}`)}</div>
                <div className="mt-[3px] text-pretty text-[12px] font-medium leading-[1.5] text-pro-ink">{cambiar.st === "pend" ? E2(`Elige la nueva hora. ${who1} todavía no ha respondido.`, `Pick the new time. ${who1} hasn't replied yet.`) : E2(`Tu hora actual sigue tuya hasta que ${who1} confirme la nueva.`, `Your current time stays yours until ${who1} confirms the new one.`)}</div></div>
            </div>
          )}{tarjetaSvc}{bloqueHora}</>}
          {paso === 1 && bloqueDet}
          {paso === 2 && <>{resumen}{rechazo}<PaymentSummary {...pay} />{salidas && <DepositOutcomes {...salidas} />}{politicas}</>}
          {errorBox}
        </div>
        <div data-screen-label="Booking · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex items-center gap-3.5">
            <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{paso === 2 ? payK : durL(P.dur).toUpperCase()}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{paso === 2 ? payV : dinero(P.cents)}</div></div>
            <div className="flex min-w-0 flex-1"><Button block disabled={!okPaso || ocupado} onClick={sigue}>{paso === 2 ? (ocupado ? E2("Enviando…", "Sending…") : enviarL) : E2("Continuar", "Continue")}</Button></div>
          </div>
          {paso === 2 && <div className="mt-[9px] text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-ink/45">{payNote}</div>}
        </div>
      </div>

      {/* Escritorio: todo en una página, el pago en la columna */}
      <div data-screen-label="APP-NEG-BOOKING · desktop" className="mx-auto hidden max-w-[1180px] px-[30px] pb-[60px] pt-[22px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{cp.negocio.nombre}</button>
        <div className="mt-3.5"><h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em]">Booking</h1><div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{`${cp.negocio.nombre} · ${nm(s.name)}`.toUpperCase()}</div></div>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-12 gap-y-8">
          <div className="flex min-w-0 flex-col gap-[26px]">
            <div>{cambiar && (<div className="mb-4">
            <div className="flex items-start gap-2.5 rounded-2xl bg-pro/[.12] px-3.5 py-[13px]">
              <span className="grid flex-none pt-px"><Icon name="edit" size={16} color="var(--tl-pro-ink)" /></span>
              <div className="min-w-0 flex-1"><div className="text-[13px] font-bold leading-[1.4] text-pro-ink">{cambiar.st === "pend" ? E2("Cambiando tu solicitud", "Changing your request") : E2(`Cambiando tu cita de ${diaS(cp.hoy, cambiar.i, es).toLowerCase()} · ${horaL(cambiar.m)}`, `Changing your booking for ${diaS(cp.hoy, cambiar.i, es)} · ${horaL(cambiar.m)}`)}</div>
                <div className="mt-[3px] text-pretty text-[12px] font-medium leading-[1.5] text-pro-ink">{cambiar.st === "pend" ? E2(`Elige la nueva hora. ${who1} todavía no ha respondido.`, `Pick the new time. ${who1} hasn't replied yet.`) : E2(`Tu hora actual sigue tuya hasta que ${who1} confirme la nueva.`, `Your current time stays yours until ${who1} confirms the new one.`)}</div></div>
            </div>
          </div>)}<div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{E2("Servicio", "Service")}</div>{tarjetaSvc}</div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{E2("Día y hora", "Day and time")}</div>{bloqueHora}</div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{E2("Detalles", "Details")}</div>{bloqueDet}</div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{E2("Antes de enviar", "Before you send")}</div><div className="flex flex-col gap-3">{salidas && <DepositOutcomes {...salidas} />}{politicas}</div></div>
          </div>
          <aside className="sticky top-[96px] flex flex-col gap-3">
            {resumen}{rechazo}<PaymentSummary {...pay} />
            <div className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white px-5 py-[18px] shadow-[var(--shadow-float)]">
              {!listo && <div className="text-center text-[12px] font-bold text-pro-ink">{falta}</div>}
              <div className="flex items-center gap-3.5">
                <div className="flex-none pl-0.5"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{payK}</div><div className="mt-1 font-display text-[21px] font-extrabold leading-none tracking-[-0.02em]">{payV}</div></div>
                <div className="flex min-w-0 flex-1"><Button variant="primary" block disabled={!listo || ocupado} onClick={() => void enviar()}>{ocupado ? E2("Enviando…", "Sending…") : enviarL}</Button></div>
              </div>
              <div className="text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-ink/45">{payNote}</div>
              {errorBox}
            </div>
          </aside>
        </div>
      </div>

      {hoja && pago && (
        <MetodoPago es={es} tarjetas={tarjetas} sel={tarjeta?.pm ?? null} declinada={declinada} modo={pago.modo} pk={pago.pk}
          nota={`${E2("PARA TU DEPÓSITO DE ", "FOR YOUR ")}${dinero(dep)}${E2("", " DEPOSIT")} · ${auto ? E2("SE COBRA AL CONFIRMAR", "CHARGED ON CONFIRMATION") : E2("SE RETIENE AL ENVIAR · SE COBRA AL CONFIRMAR", "HELD WHEN YOU SEND · CHARGED ON CONFIRMATION")}`}
          onClose={() => setHoja(false)}
          onUsar={(t, nueva) => { if (nueva && !tarjetas.some((x) => x.pm === nueva.pm)) setTarjetas((L) => [nueva, ...L]); setTarjeta(t); setHoja(false); if (declinada && t.pm !== declinada) setError(null); }} />
      )}
    </div>
  );
}
