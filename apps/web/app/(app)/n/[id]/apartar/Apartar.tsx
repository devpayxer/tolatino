"use client";
/* APP-NEG-TIENDA-APARTADO (diseño neg-tienda-flow.js › bookVals, sobre la vista del Booking de Auto/Hogar):
   1 Tu apartado (lo que apartaste, nota para la tienda, avisos por SMS) → 2 Cuándo pasas (hoy, mañana o pasado; la hora)
   → 3 Revisa y envía (precio, cómo se paga: hoy $0 · en la caja; bueno saber). En escritorio, todo en una página con el
   resumen al lado. Compuesto con el sistema de diseño. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { OpcionesApartar } from "@/lib/apartados";
import { guardarCarrito, leerCarrito, lineaValida, llaveLinea, type Carrito } from "../Tienda";
import { mandarApartado } from "./acciones";
import { MetodoPago, tarjetaL, type ModoTarjeta, type Tarjeta } from "../../../pago/MetodoPago";
import { useVerificacion } from "../../../pago/Verificacion";
import { cuotas, terminos } from "@/lib/layaway-comun";
import { uuid } from "@/lib/uuid";

type N = "Icon" | "Button" | "StepHeader" | "DateStrip" | "TimeSlots" | "PaymentSummary";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, StepHeader, DateStrip, TimeSlots, PaymentSummary } = UI as unknown as Record<N, ComponentType<any>>;
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const dinero = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const DOW = { es: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"], en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] };
const hL = (m: number) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`; };

export function Apartar({ o, es, yo, pago = null, dir = null }: { o: OpcionesApartar; es: boolean; yo: boolean; pago?: { modo: ModoTarjeta; pk: string | null; tarjetas: Tarjeta[] } | null; dir?: { id: string; label: string; street: string } | null }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter(), nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const [carro, setCarro] = useState<Carrito | null>(null), [paso, setPaso] = useState(0), [nota, setNota] = useState(""), [sms, setSms] = useState(true);
  const [i, setI] = useState(() => Math.max(0, o.dias.findIndex((d) => d.horas.length))), [h, setH] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null);
  // Envío de la tienda (4q-2): ¿cómo lo recibes?, la tarjeta (se retiene hoy, se cobra al enviarlo) y la dirección.
  const puedeEnviar = !!o.envio && !!pago, [como, setComo] = useState<"tienda" | "envio">("tienda");
  const [acepto, setAcepto] = useState(false);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(pago?.tarjetas ?? []), [tarjeta, setTarjeta] = useState<Tarjeta | null>(pago?.tarjetas.find((t) => t.def) ?? pago?.tarjetas[0] ?? null), [hojaT, setHojaT] = useState(false);
  const clave = useRef(uuid());
  useEffect(() => { setCarro(leerCarrito(o.negocio.id).filter((l) => lineaValida(o.arts, l))); }, [o]);
  const H = String(o.horas);
  const volver = () => router.push(`/n/${o.negocio.id}?tab=shop`);
  const L = (carro ?? []).map((l) => { const a = o.arts.find((x) => x.id === l.item)!; return { ...l, a, k: llaveLinea(l), t: a?.tallas.find((z) => z.id === l.v) ?? null }; }).filter((l) => l.a);
  const sub = L.reduce((s, l) => s + l.a.precio * l.qty, 0), n = L.reduce((s, l) => s + l.qty, 0);
  // Layaway (4r): si lo apartado va en plan, el acuerdo por escrito (el mismo texto que guarda el servidor) y la tarjeta del abono.
  const conPlan = !!o.plan && !!pago && L.length > 0 && L.every((l) => l.a.k === "plan"), cu = conPlan ? cuotas(sub, o.plan!) : null, acuerdo = conPlan ? terminos(o.negocio.nombre, sub, o.plan!) : null;
  const envio = como === "envio" && puedeEnviar && !conPlan;
  const fee = envio && o.envio ? (o.envio.free > 0 && sub >= o.envio.free ? 0 : o.envio.fee) : 0, tot = sub + fee;
  const quitar = (k: string) => { const c = (carro ?? []).filter((l) => llaveLinea(l) !== k); setCarro(c); guardarCarrito(o.negocio.id, c); };
  const talla = (l: (typeof L)[number]) => (l.t ? `${l.a.label ? nm(l.a.label) : E2("Talla", "Size")} ${l.t.label} · ` : "");
  const dia = o.dias[i] ?? null, dL = (k: string, f: string) => { const d = new Date(`${f}T12:00:00Z`); return k === "hoy" ? E2("Hoy", "Today") : k === "man" ? E2("Mañana", "Tomorrow") : `${(es ? DOW.es : DOW.en)[d.getUTCDay()]!.charAt(0)}${(es ? DOW.es : DOW.en)[d.getUTCDay()]!.slice(1).toLowerCase()} ${d.getUTCDate()}`; };
  const whenL = dia && h != null ? `${dL(dia.k, dia.f)} · ${hL(h)}` : "—";
  const miss = [!L.length ? E2("Tu apartado está vacío", "Your hold is empty") : null, conPlan ? (!tarjeta ? E2("Tu tarjeta", "Your card") : !acepto ? E2("Acepta el acuerdo del plan", "Accept the plan agreement") : null) : envio ? (!dir ? E2("La dirección del envío", "The shipping address") : !tarjeta ? E2("Tu tarjeta", "Your card") : null) : h == null ? E2("Elige cuándo pasas", "Pick when you come") : null].filter(Boolean) as string[];
  const okPaso = paso === 0 ? L.length > 0 : miss.length === 0;
  // 9k · 3-D Secure: la hoja del banco y, al confirmar, el mismo apartado otra vez con la misma clave.
  const V = useVerificacion(es, pago?.modo, pago?.pk);
  const enviar = async () => {
    if (!yo) return router.push(`/entrar?volver=${encodeURIComponent(location.pathname)}`);
    if (miss.length || ocupado || (!envio && !conPlan && (!dia || h == null))) return;
    setOcupado(true); setError(null);
    const r = await mandarApartado({ negocio: o.negocio.id, lineas: L.map((l) => ({ item: l.item, qty: l.qty, v: l.v ?? null })), dia: envio || conPlan ? "" : dia!.f, hora: envio || conPlan ? 0 : h!, nota, sms, clave: clave.current, envio: envio && tarjeta ? { pm: tarjeta.pm, dir: dir?.id ?? null } : null, plan: conPlan && tarjeta ? { pm: tarjeta.pm, acepto } : null }).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false);
    if (r.ok) { guardarCarrito(o.negocio.id, []); router.push(`/apartado/${r.numero}`); } else if (!V.pide(r, () => { void enviar(); })) setError(es ? r.msg.es : r.msg.en);
  };
  const sigue = () => { if (paso < 2) { setPaso(paso + 1); window.scrollTo({ top: 0 }); } else void enviar(); };
  const LINE = E2("El precio que ves es el que pagas en la caja.", "The price you see is the price you pay at the register.");
  const tarjetaAp = (
    <div className={`flex items-center gap-3 p-4 ${caja}`}>
      <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-ink"><Icon name="bag" size={20} color="var(--tl-white)" /></span>
      <span className="min-w-0 flex-1"><span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{E2("TU APARTADO", "YOUR HOLD")}</span>
        <span className="mt-1 block text-[14.5px] font-bold leading-[1.3]">{`${n} ${n === 1 ? E2("artículo", "item") : E2("artículos", "items")} · ${dinero(sub)}`}</span>
        <span className="mt-1.5 flex items-center gap-[5px] text-[11.5px] font-bold text-open-text"><Icon name="check" size={13} color="currentColor" />{LINE}</span></span>
      <button type="button" onClick={volver} className="flex-none text-[12.5px] font-bold text-action">{E2("Editar", "Edit")}</button>
    </div>
  );
  const lineas = (
    <div className={`flex flex-col gap-2.5 p-4 ${caja}`}>
      {carro && !L.length && <div className="text-[12.5px] font-medium text-ink/60">{E2("No tienes nada apartado en esta tienda.", "You have nothing on hold at this store.")}</div>}
      {L.map((l) => (
        <div key={l.k} className="flex items-center gap-3">
          <span className="h-12 w-12 flex-none rounded-xl bg-photo-bg" style={l.a.foto ? { backgroundImage: `url(${l.a.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
          <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold leading-[1.3]">{nm(l.a.n)}</span><span className="mt-0.5 block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{`${talla(l)}× ${l.qty} · ${dinero(l.a.precio * l.qty)}`}</span></span>
          <button type="button" onClick={() => quitar(l.k)} aria-label={`${E2("Quitar", "Remove")} ${nm(l.a.n)}`} className="flex-none text-[12px] font-bold text-danger">{E2("Quitar", "Remove")}</button>
        </div>))}
    </div>
  );
  const radio = (on: boolean) => `box-border h-5 w-5 flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`;
  const opcion = (on: boolean) => `flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"}`;
  const feeL = o.envio ? (o.envio.fee ? `${dinero(o.envio.fee)}${o.envio.free ? E2(` · gratis desde ${dinero(o.envio.free)}`, ` · free over ${dinero(o.envio.free)}`) : ""}` : E2("Gratis", "Free")) : "";
  const planB = conPlan && cu ? (
    <div data-screen-label="Apartado · tu plan" className={`p-4 ${caja}`}>
      <div className={K}>{E2("TU PLAN", "YOUR PLAN")}</div>
      <div className="mt-2.5 flex flex-col">{([[E2("Abono hoy (se retiene)", "Down payment today (held)"), dinero(cu.abono)], ...cu.pagos.map((p, i) => [`${E2("Pago", "Payment")} ${i + 1} · ${E2(`día ${(i + 1) * o.plan!.cada}`, `day ${(i + 1) * o.plan!.cada}`)}`, dinero(p)]), [E2("Total · sin intereses", "Total · no interest"), dinero(sub)]] as [string, string][]).map(([k, v2], z, arr) =>
        <div key={k} className={`flex justify-between gap-3 py-2 ${z ? "border-t border-ink/[.06]" : ""} ${z === arr.length - 1 ? "font-bold" : ""}`}><span className="text-[13px] font-semibold text-ink/70">{k}</span><span className="text-[13px] font-bold">{v2}</span></div>)}</div>
      <div className="mt-2 text-pretty text-[12px] font-medium leading-[1.45] text-ink/55">{E2("Los días cuentan desde que la tienda confirma que lo tiene. Te lo entregan al terminar de pagar.", "Days count from when the store confirms it has it. You get it when fully paid.")}</div>
    </div>
  ) : null;
  const acuerdoB = conPlan && acuerdo ? (
    <div data-screen-label="Apartado · acuerdo del plan" className={`flex flex-col gap-4 p-4 ${caja}`}>
      <div><div className={K}>{E2("EL ACUERDO, POR ESCRITO", "THE AGREEMENT, IN WRITING")}</div><p className="m-0 mt-2 text-pretty text-[13px] leading-[1.6] text-ink/75">{es ? acuerdo.es : acuerdo.en}</p></div>
      <div><div className={K}>{E2("CON QUÉ PAGAS EL ABONO", "CARD FOR THE DOWN PAYMENT")}</div>
        <div className="mt-2 flex items-center gap-3"><span className="grid h-9 w-9 flex-none place-items-center rounded-[11px] bg-paper"><Icon name="card" size={16} /></span><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{tarjeta ? tarjetaL(tarjeta) : E2("Agrega una tarjeta", "Add a card")}</span><span className="block text-[12px] font-medium text-ink/55">{E2("Se retiene hoy y se cobra cuando confirman.", "Held today, charged when they confirm.")}</span></span><button type="button" onClick={() => setHojaT(true)} className="flex-none text-[12.5px] font-bold text-action">{tarjeta ? E2("Cambiar", "Change") : E2("Agregar", "Add")}</button></div></div>
      <button type="button" role="checkbox" aria-checked={acepto} onClick={() => setAcepto(!acepto)} className="flex items-start gap-3 text-left"><span className={`mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-[6px] ${acepto ? "bg-ink" : "border-[1.5px] border-ink/25"}`}>{acepto && <Icon name="check" size={13} color="var(--tl-white)" strokeWidth={2.6} />}</span><span className="text-[13px] font-semibold leading-[1.45]">{E2("Leí el acuerdo y lo acepto", "I read the agreement and accept it")}</span></button>
    </div>
  ) : null;
  const comoB = puedeEnviar && !conPlan ? (
    <div data-screen-label="Apartado · cómo lo recibes" className={`p-4 ${caja}`}>
      <div className={K}>{E2("¿CÓMO LO RECIBES?", "HOW DO YOU GET IT?")}</div>
      <div role="radiogroup" aria-label={E2("Cómo lo recibes", "How you get it")} className="mt-2.5 flex flex-col gap-2">
        <button type="button" role="radio" aria-checked={!envio} onClick={() => setComo("tienda")} className={opcion(!envio)}><span className={radio(!envio)} /><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{E2("Lo recojo en la tienda", "I pick it up in store")}</span><span className="block text-[12px] font-medium text-ink/55">{E2("Hoy no se cobra nada · pagas en la caja", "Nothing today · pay at the register")}</span></span><span className="text-[12.5px] font-bold">{E2("Gratis", "Free")}</span></button>
        <button type="button" role="radio" aria-checked={envio} onClick={() => setComo("envio")} className={opcion(envio)}><span className={radio(envio)} /><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{E2("Envío a tu casa", "Ship to your home")}</span><span className="block text-[12px] font-medium text-ink/55">{`${E2("Llega en ", "Arrives in ")}${o.envio!.dias} ${E2("días · con tarjeta", "days · by card")}`}</span></span><span className="text-right text-[12.5px] font-bold">{feeL}</span></button>
      </div>
    </div>
  ) : null;
  const adonde = (
    <div data-screen-label="Apartado · envío" className={`flex flex-col gap-4 p-4 ${caja}`}>
      <div><div className={K}>{E2("A DÓNDE", "WHERE TO")}</div>
        {dir ? <div className="mt-2 flex items-center gap-3"><span className="grid h-9 w-9 flex-none place-items-center rounded-[11px] bg-paper"><Icon name="pin" size={16} /></span><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{dir.label}</span><span className="block truncate text-[12px] font-medium text-ink/55">{dir.street}</span></span><button type="button" onClick={() => router.push("/cuenta/direcciones")} className="flex-none text-[12.5px] font-bold text-action">{E2("Cambiar", "Change")}</button></div>
          : <button type="button" onClick={() => router.push("/cuenta/direcciones")} className="mt-2 text-[12.5px] font-bold text-action">{E2("Agrega tu dirección en Mis direcciones", "Add your address in My addresses")}</button>}</div>
      <div><div className={K}>{E2("CÓMO PAGAS", "HOW YOU PAY")}</div>
        <div className="mt-2 flex items-center gap-3"><span className="grid h-9 w-9 flex-none place-items-center rounded-[11px] bg-paper"><Icon name="card" size={16} /></span><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{tarjeta ? tarjetaL(tarjeta) : E2("Agrega una tarjeta", "Add a card")}</span><span className="block text-[12px] font-medium text-ink/55">{E2("Se retiene hoy y se cobra al enviarlo.", "Held today, charged when it ships.")}</span></span><button type="button" onClick={() => setHojaT(true)} className="flex-none text-[12.5px] font-bold text-action">{tarjeta ? E2("Cambiar", "Change") : E2("Agregar", "Add")}</button></div></div>
      <div className="flex items-start gap-2 rounded-[12px] bg-paper px-3 py-2.5"><span className="grid flex-none pt-0.5"><Icon name="clock" size={14} color="var(--tl-open-text)" /></span><span className="text-pretty text-[12px] font-semibold leading-[1.45] text-ink/70">{E2(`La tienda confirma que lo tiene y lo envía; llega en ${o.envio?.dias ?? ""} días después de enviarlo.`, `The store confirms it has it and ships it; it arrives ${o.envio?.dias ?? ""} days after it ships.`)}</span></div>
    </div>
  );
  const notaB = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      <div>
        <div className="flex justify-between gap-2.5"><span className="font-display text-[16px] font-extrabold tracking-[-0.03em]">{E2("Nota para la tienda", "Note for the store")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{nota.length} / 200</span></div>
        <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 200))} rows={2} aria-label={E2("Nota para la tienda", "Note for the store")} placeholder={E2("Ej.: es para regalo…", "E.g. it is a gift…")} className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] outline-none" />
      </div>
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{E2("Avisos por SMS", "Text updates")}</span><span className="mt-0.5 block text-[12px] font-medium text-ink/55">{E2("Cuando esté listo y antes de que venza.", "When it is ready and before it expires.")}</span></span>
        <span role="switch" aria-checked={sms} aria-label={E2("Avisos por SMS", "Text updates")} tabIndex={0} onClick={() => setSms(!sms)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSms(!sms); } }} className="relative h-6 w-[42px] flex-none cursor-pointer rounded-full" style={{ background: sms ? "var(--tl-ink)" : "rgba(11,14,18,.15)" }}><span className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-[left]" style={{ left: sms ? 21 : 3 }} /></span>
      </div>
    </div>
  );
  const dias = o.dias.map((d, k) => ({ id: `d${k}`, dow: d.k === "hoy" ? E2("HOY", "TODAY") : (es ? DOW.es : DOW.en)[new Date(`${d.f}T12:00:00Z`).getUTCDay()], num: String(new Date(`${d.f}T12:00:00Z`).getUTCDate()), off: !d.horas.length }));
  const cuando = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      <div><div className={K}>{E2("DÍA", "DAY")}</div><div className="mt-[11px] grid min-w-0"><DateStrip days={dias} selected={`d${i}`} onSelect={(id: string) => { setI(Number(id.slice(1))); setH(null); }} /></div></div>
      <div><div className={K}>{E2("HORA EN QUE PASAS", "PICKUP TIME")}</div>
        {dia?.horas.length ? <div className="mt-[9px] grid"><TimeSlots slots={dia.horas.map((m) => ({ t: hL(m), taken: false }))} selected={h != null ? hL(h) : ""} onSelect={(t: string) => { const m = dia.horas.find((z) => hL(z) === t); if (m != null) setH(m); }} /></div>
          : <div className="mt-2 text-[12.5px] font-medium text-ink/60">{E2("Cerrado ese día.", "Closed that day.")}</div>}</div>
      <div className="flex items-start gap-2 rounded-[12px] bg-paper px-3 py-2.5"><span className="grid flex-none pt-0.5"><Icon name="clock" size={14} color="var(--tl-open-text)" /></span><span className="text-pretty text-[12px] font-semibold leading-[1.45] text-ink/70">{E2(`Te lo guardan ${H} horas desde esa hora.`, `They keep it ${H} hours from that time.`)}</span></div>
    </div>
  );
  const filas: [string, string][] = conPlan && cu ? [[E2("ARTÍCULOS", "ITEMS"), String(n)], [E2("CÓMO", "HOW"), E2("Plan de pagos · lo recoges al terminar", "Layaway · pick up when paid")], [E2("ABONO", "DOWN PAYMENT"), dinero(cu.abono)], [E2("PAGOS", "PAYMENTS"), `${o.plan!.n} × ${dinero(cu.pagos[0]!)} · ${E2(`cada ${o.plan!.cada} días`, `every ${o.plan!.cada} days`)}`]] : envio ? [[E2("ARTÍCULOS", "ITEMS"), String(n)], [E2("CÓMO", "HOW"), E2("Envío a tu casa", "Ship to your home")], [E2("A DÓNDE", "WHERE TO"), dir ? `${dir.label} · ${dir.street}` : "—"], [E2("LLEGA", "ARRIVES"), E2(`${o.envio?.dias ?? ""} días después de enviarlo`, `${o.envio?.dias ?? ""} days after it ships`)]]
    : [[E2("ARTÍCULOS", "ITEMS"), String(n)], [E2("CÓMO", "HOW"), E2("Recoger en tienda", "Pick up in store")], [E2("CUÁNDO", "WHEN"), whenL], [E2("TE LO GUARDAN", "HELD UNTIL"), E2(`${H} horas`, `${H} hours`)]];
  const resumen = (
    <div className={`overflow-hidden ${caja}`}>
      <div className="border-b border-ink/[.07] px-[15px] py-3.5"><div className={K}>{E2("RESUMEN", "SUMMARY")}</div><div className="mt-[5px] font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]">{E2("Tu apartado", "Your hold")}</div><div className="mt-1 font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{o.negocio.nombre.toUpperCase()}</div></div>
      <div className="px-[15px] py-0.5">{filas.map(([k, v2], z) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${z ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v2}</span></div>)}</div>
    </div>
  );
  const pay = { screenLabel: "Apartado · pago", priceLabel: E2("PRECIO", "PRICE"), lines: L.map((l) => ({ label: `${nm(l.a.n)} · ${talla(l)}× ${l.qty}`, value: dinero(l.a.precio * l.qty) })).concat(envio ? [{ label: E2("Envío", "Shipping"), value: fee ? dinero(fee) : E2("Gratis", "Free") }] : []), totalLabel: envio || conPlan ? E2("Total", "Total") : E2("En la caja", "At the register"), total: dinero(tot), howLabel: E2("CÓMO SE PAGA", "HOW YOU PAY"), bar: null,
    rows: conPlan && cu ? [{ label: E2("Hoy se retiene el abono", "Down payment held today"), sub: E2("Se cobra cuando la tienda confirma que lo tiene.", "Charged when the store confirms it has it."), value: dinero(cu.abono), dot: "var(--tl-ink)", color: "var(--tl-ink)" }, { label: E2(`En ${o.plan!.n} pagos`, `In ${o.plan!.n} payments`), sub: E2("En la app o en la tienda; nada se cobra solo.", "In the app or at the store; nothing is charged automatically."), value: dinero(sub - cu.abono), dot: "rgba(11,14,18,.18)", color: "var(--tl-ink)" }]
      : envio ? [{ label: E2("Hoy se retiene", "Held today"), sub: E2("No se cobra todavía.", "Not charged yet."), value: dinero(tot), dot: "var(--tl-ink)", color: "var(--tl-ink)" }, { label: E2("Al enviarlo", "When it ships"), sub: E2("Se cobra lo que de verdad te envían.", "You pay for what actually ships."), value: dinero(tot), dot: "rgba(11,14,18,.18)", color: "var(--tl-ink)" }]
      : [{ label: E2("Hoy", "Today"), sub: E2("Apartar no cobra nada.", "Holding costs nothing."), value: dinero(0), dot: "var(--tl-ink)", color: "var(--tl-ink)" }, { label: E2("En la caja", "At the register"), sub: E2("Lo mismo que ves aquí.", "The same as you see here."), value: dinero(tot), dot: "rgba(11,14,18,.18)", color: "var(--tl-ink)" }], card: null };
  const bueno = (
    <div className={`p-4 ${caja}`}>
      <div className={K}>{E2("BUENO SABER", "GOOD TO KNOW")}</div>
      <div className="mt-3 flex flex-col gap-2.5">{[LINE, envio ? E2("Si la tienda no lo tiene o no lo envía en 6 días, se libera lo retenido.", "If the store does not have it or does not ship it within 6 days, the hold is released.") : E2(`Si no pasas en ${H} horas, vuelve al estante y no se cobra nada.`, `If you do not come within ${H} hours, it goes back on the shelf and nothing is charged.`), E2("La tienda confirma que lo tiene; si falta algo, tú decides si sigues con lo demás.", "The store confirms it has it; if something is missing, you decide whether to keep the rest.")].map((t, z) => <div key={z} className="flex items-start gap-2.5"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open)" strokeWidth={2.2} /></span><span className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/70">{t}</span></div>)}</div>
    </div>
  );
  const errorBox = error ? <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div> : null;
  const T = [E2("Tu apartado", "Your hold"), conPlan ? E2("El acuerdo y el abono", "Agreement and down payment") : envio ? E2("A dónde y cómo pagas", "Where and how you pay") : E2("Cuándo pasas", "When you come"), E2("Revisa y envía", "Review and send")];
  const hoyL = envio || conPlan ? E2("SE RETIENE", "HELD TODAY") : E2("HOY PAGAS", "TODAY YOU PAY"), hoyV = dinero(conPlan && cu ? cu.abono : envio ? tot : 0);
  const botonL = conPlan ? E2("Aceptar y apartar", "Accept and hold") : E2("Apartar", "Hold");
  return (
    <div className="min-h-[100dvh] bg-paper">
      <div data-screen-label="APP-NEG-TIENDA-APARTADO · móvil" className="pb-[150px] lg:hidden">
        <div className="sticky top-[57px] z-20 grid"><StepHeader title={T[paso]} step={paso + 1} total={3} backLabel={E2("Volver", "Back")} onBack={paso > 0 ? () => { setPaso(paso - 1); window.scrollTo({ top: 0 }); } : volver} /></div>
        <div className="flex flex-col gap-3 px-4 pt-4">
          {paso === 0 && <>{tarjetaAp}{lineas}{planB}{comoB}{notaB}</>}
          {paso === 1 && (conPlan ? acuerdoB : envio ? adonde : cuando)}
          {paso === 2 && <>{resumen}<PaymentSummary {...pay} />{bueno}</>}
          {errorBox}
        </div>
        <div data-screen-label="Apartado · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex items-center gap-3.5">
            <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{hoyL}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{hoyV}</div>
              <div className="mt-1 font-mono text-[8.5px] font-semibold tracking-[0.08em] text-ink/45">{conPlan ? E2("SE COBRA AL CONFIRMAR", "CHARGED ON CONFIRMATION") : envio ? E2("SE COBRA AL ENVIARLO", "CHARGED WHEN IT SHIPS") : `${E2("EN LA CAJA ", "AT THE REGISTER ")}${dinero(tot)}`}</div></div>
            <div className="flex min-w-0 flex-1"><Button block disabled={!okPaso || ocupado} onClick={sigue}>{paso === 2 ? (ocupado ? E2("Apartando…", "Holding…") : botonL) : E2("Continuar", "Continue")}</Button></div>
          </div>
          {!okPaso && miss[0] && <div className="mt-[9px] text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-pro-ink">{(paso === 0 ? miss[0] : miss[miss.length - 1]!).toUpperCase()}</div>}
        </div>
      </div>
      <div data-screen-label="APP-NEG-TIENDA-APARTADO · desktop" className="mx-auto hidden max-w-[1180px] px-[30px] pb-[60px] pt-[22px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{o.negocio.nombre}</button>
        <div className="mt-3.5"><h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em]">{E2("Tu apartado", "Your hold")}</h1><div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{o.negocio.nombre.toUpperCase()}</div></div>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-12 gap-y-8">
          <div className="flex min-w-0 flex-col gap-[26px]">
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{T[0]}</div><div className="flex flex-col gap-3">{tarjetaAp}{lineas}{planB}{comoB}{notaB}</div></div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{T[1]}</div>{conPlan ? acuerdoB : envio ? adonde : cuando}</div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{E2("Antes de enviar", "Before you send")}</div>{bueno}</div>
          </div>
          <aside className="sticky top-[96px] flex flex-col gap-3">
            {resumen}<PaymentSummary {...pay} />
            <div className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white px-5 py-[18px] shadow-[var(--shadow-float)]">
              {miss.length > 0 && <div className="text-center text-[12px] font-bold text-pro-ink">{miss[0]}</div>}
              <div className="flex items-center gap-3.5">
                <div className="flex-none pl-0.5"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{hoyL}</div><div className="mt-1 font-display text-[21px] font-extrabold leading-none tracking-[-0.02em]">{hoyV}</div></div>
                <div className="flex min-w-0 flex-1"><Button variant="primary" block disabled={miss.length > 0 || ocupado} onClick={() => void enviar()}>{ocupado ? E2("Apartando…", "Holding…") : botonL}</Button></div>
              </div>
              {errorBox}
            </div>
          </aside>
        </div>
      </div>
      {V.hoja}
      {hojaT && pago && (
        <MetodoPago es={es} tarjetas={tarjetas} sel={tarjeta?.pm ?? null} declinada={null} modo={pago.modo} pk={pago.pk} nota={conPlan && cu ? `${E2("SE RETIENE EL ABONO ", "HOLDING DOWN PAYMENT ")}${dinero(cu.abono)}` : `${E2("SE RETIENEN ", "HOLDING ")}${dinero(tot)} · ${E2("SE COBRA AL ENVIARLO", "CHARGED WHEN IT SHIPS")}`}
          onClose={() => setHojaT(false)} onUsar={(t, nueva) => { if (nueva && !tarjetas.some((x) => x.pm === nueva.pm)) setTarjetas((Z) => [nueva, ...Z]); setTarjeta(t); setHojaT(false); }} />)}
    </div>
  );
}
