"use client";
/* APP-NEG-CHECKOUT · móvil y desktop (prototipo ckVals). Delivery o Pickup: a dónde (tu dirección, o el local), cuándo
   (lo antes posible o una hora de hoy), cómo te lo entregamos y la propina (delivery), cómo pagas (efectivo al recibir o
   en el local) y el resumen. El servidor vuelve a calcular todo al enviar: precios, zona, mínimo, envío y propina. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import type { DropPref, MenuPublico } from "@/lib/pedir";
import { calc, carritoGuardado, entrega, EnvioGratis, guardarCarrito, guardarModo, limpiar, modoDe, modoGuardado, Modos, type Linea, type Modo } from "../MenuCliente";
import { enviarPedido } from "../acciones-pedido";

type N = "Icon" | "Button" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip } = UI as unknown as Record<N, ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const hora = (m: number) => { m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const hm2m = (v: string) => { const [h = 0, m = 0] = v.split(":").map(Number); return h * 60 + m; };
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white p-[15px]";
const AT = [["timbre", "Toca el timbre", "Ring the bell"], ["noTimbre", "No toques el timbre", "Don't ring the bell"], ["llamar", "Llámame al llegar", "Call me on arrival"], ["texto", "Escríbeme al llegar", "Text me on arrival"]] as const;
const LB: Record<string, [string, string]> = { casa: ["Casa", "Home"], trabajo: ["Trabajo", "Work"], otra: ["Otra", "Other"] };

export function Pagar({ m, es }: { m: MenuPublico; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const biz = m.negocio.id, est = m.estado, D = est.dlv, dir = m.dir;
  const [cart, setCart] = useState<Linea[] | null>(null);
  const [modoG, setModoG] = useState<Modo | null>(null);
  const modo = modoDe(m, modoG), dl = modo === "delivery";
  const slotsAll = dl ? est.slotsD : est.slots;
  const [cuando, setCuando] = useState<string>("asap");
  const [verHoras, setVerHoras] = useState(false);
  const [error, setError] = useState<{ msg: string; menu: boolean } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const dp0: DropPref = dir?.drop ?? { drop: "mano", at: ["timbre"], note: "" };
  const [drop, setDrop] = useState<DropPref["drop"]>(dp0.drop);
  const [at, setAt] = useState<string[]>(dp0.at);
  const [nota, setNota] = useState(dp0.note);
  const [guardar, setGuardar] = useState(true);
  const [tip, setTip] = useState("p18");
  const [tipAmt, setTipAmt] = useState("");
  const clave = useMemo(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(16).padStart(8, "0")}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`), []);
  useEffect(() => { setCart(limpiar(m, carritoGuardado(biz))); setModoG(modoGuardado(biz)); window.scrollTo(0, 0); }, [m, biz]);
  useEffect(() => { setCuando(est.later ? slotsAll[0]?.v ?? "asap" : "asap"); setVerHoras(false); }, [dl]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = cart ?? [];
  const C = calc(m, lines), ENT = entrega(m, lines, modo, es);
  const tipOn = dl && !!D?.tip;
  const tipC = !tipOn ? 0 : tip === "otro" ? Math.max(0, Math.min(10000, Math.round((parseFloat(tipAmt) || 0) * 100))) : tip === "p0" ? 0 : Math.round((C.sub * Number(tip.slice(1))) / 100);
  const total = ENT.total + tipC;
  const volver = () => router.push(`/n/${biz}?tab=menu`);
  const aqui = encodeURIComponent(`/n/${biz}/pagar`);
  // Platos con horario propio (p. ej. almuerzo hasta las 4): se programa hasta media hora antes.
  const hasta = Math.min(99999, ...lines.map((l) => m.items[l.id]?.hasta ?? 99999));
  const slots = slotsAll.filter((s) => hm2m(s.v) <= hasta - 30);
  const listo = est.now + est.readyMin + C.extra;
  const llega = D ? [est.now + D.d1 + C.extra, est.now + D.d2 + C.extra] : [listo, listo];
  const etaNow = dl ? `${hora(llega[0]!)}–${hora(llega[1]!)}` : hora(listo);
  const whenL = cuando === "asap" ? `${E2("Lo antes posible · ", "As soon as possible · ")}${etaNow}` : `${E2("Programado · ", "Scheduled · ")}${hora(hm2m(cuando))}${dl ? `–${hora(hm2m(cuando) + 10)}` : ""}`;
  const dia = est.dia.charAt(0).toUpperCase() + est.dia.slice(1);
  const whenSub = est.later && est.openAt != null ? E2(`${m.negocio.nombre} abre a las ${hora(est.openAt)} · hoy, ${est.dia}`, `${m.negocio.nombre} opens at ${hora(est.openAt)} · today, ${est.dia}`)
    : cuando === "asap" ? (!est.sched ? E2(`${m.negocio.nombre} no toma pedidos programados`, `${m.negocio.nombre} does not take scheduled orders`) : E2("O programa una hora de hoy", "Or schedule a time today"))
    : E2(`Hoy, ${est.dia}`, `Today, ${dia}`);
  const chips = (est.later ? [] : [{ l: E2("Lo antes posible", "ASAP"), v: "asap" }]).concat(slots.map((s) => ({ l: s.l, v: s.v })));
  const items = (n: number) => `${n} ${es ? (n === 1 ? "artículo" : "artículos") : n === 1 ? "item" : "items"}`;
  const countCaps = `${m.negocio.nombre.toUpperCase()} · ${items(C.count).toUpperCase()}`;
  const taxL = C.taxPct != null ? E2(`Impuestos (${C.taxPct}%)`, `Taxes (${C.taxPct}%)`) : E2("Impuestos", "Taxes");
  // No se puede enviar: zona, plato de un solo modo o mínimo (se dice por qué); delivery sin dirección o sin ubicar.
  const sinDir = dl && !dir, sinMapa = dl && !!dir && dir.mi == null;
  const bloqueo = ENT.blk || (sinMapa ? E2("No encontramos tu dirección en el mapa. Revisa la calle y el número, o pide pickup.", "We couldn't find your address on the map. Check the street and number, or order pickup.") : "");
  const cta = sinDir ? E2("Agrega tu dirección", "Add your address") : ENT.blk ? ENT.blkS : `${E2("Enviar pedido · ", "Place order · ")}${money(total)}`;
  const hold = dl ? E2(`Pagas ${money(total)} en efectivo al recibir. No se cobra nada en la app.`, `You pay ${money(total)} in cash on delivery. Nothing is charged in the app.`)
    : E2(`Pagas ${money(total)} en el local al recoger. No se cobra nada en la app.`, `You pay ${money(total)} at the store when you pick up. Nothing is charged in the app.`);
  const sinPedidos = !est.canOrd;
  const dropL = drop === "mano" ? E2("En la mano", "Hand it to me") : E2("Dejar en la puerta", "Leave at door");
  const atL = AT.filter((a) => at.includes(a[0])).map((a) => (es ? a[1] : a[2]));
  const dirT = dir ? `${es ? LB[dir.label]?.[0] ?? "" : LB[dir.label]?.[1] ?? ""} · ${dir.street}` : "";
  const togAt = (k: string) => {
    let a = at.includes(k) ? at.filter((x) => x !== k) : [...at, k];
    if (k === "timbre" && a.includes("timbre")) a = a.filter((x) => x !== "noTimbre");
    if (k === "noTimbre" && a.includes("noTimbre")) a = a.filter((x) => x !== "timbre");
    setAt(a);
  };

  const enviar = async () => {
    if (!lines.length || enviando || sinPedidos) return;
    if (sinDir) { router.push(`/cuenta/direcciones/nueva?volver=${aqui}`); return; }
    if (bloqueo) { setError({ msg: bloqueo, menu: !!ENT.blk && !ENT.blk.includes(" mi ") }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setEnviando(true); setError(null);
    try {
      const r = await enviarPedido({
        negocio: biz, cuando, clave, modo, lineas: lines.map((l) => ({ item: l.id, ch: l.ch, k: l.k, q: l.q, nota: l.nt })),
        ...(dl ? { direccion: dir?.id, propina: tipOn ? { k: tip, monto: tipC } : undefined, entrega: { drop, at, note: nota.trim(), guardar } } : {}),
      });
      if (r.ok) { guardarCarrito(biz, []); router.push(`/pedido/${r.numero}`); return; }
      if (r.entrar || r.perfil) { router.push(`/entrar?volver=${aqui}`); return; }
      setError({ msg: es ? r.msg.es : r.msg.en, menu: !!r.menu }); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError({ msg: E2("No se pudo enviar. Revisa tu conexión y prueba de nuevo.", "Could not send. Check your connection and try again."), menu: false });
    }
    setEnviando(false);
  };
  const cambiaModo = (k: Modo) => { setModoG(k); guardarModo(biz, k); setError(null); };

  const resumen = (
    <>
      <div className={K}>{E2("RESUMEN", "SUMMARY")}</div>
      <div className="mt-1.5">
        {lines.map((l, i) => {
          const it = m.items[l.id]!;
          const sum = [it.grp.flatMap((gk) => (l.ch[gk] || []).map((x) => m.grps[gk]?.o[x]?.l ?? "")).join(" · "), l.nt ? `“${l.nt}”` : ""].filter(Boolean).join(" · ");
          return (
            <div key={i} className={`flex gap-2.5 py-2.5 ${i ? "border-t border-ink/[.07]" : ""}`}>
              <span className="min-w-5 flex-none font-display text-[12px] font-extrabold leading-[1.4]">{l.q}×</span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold leading-[1.35]">{it.name}</div>
                {sum && <div className="mt-0.5 text-[11.5px] font-medium leading-[1.4] text-ink/55">{sum}</div>}
              </div>
              <span className="flex-none font-mono text-[12.5px] font-bold">{money(C.unit(it, l.ch) * l.q)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex flex-col gap-[9px] border-t border-line pt-3 text-[12.5px] font-medium text-ink/60">
        <div className="flex justify-between"><span>Subtotal</span><span className="font-mono text-ink">{money(C.sub)}</span></div>
        {dl && <div className="flex justify-between"><span>{E2("Envío", "Delivery")}</span><span className="font-mono text-ink">{ENT.fee ? money(ENT.fee) : E2("Gratis", "Free")}</span></div>}
        {tipOn && <div className="flex justify-between"><span>{E2("Propina", "Tip")}</span><span className="font-mono text-ink">{money(tipC)}</span></div>}
        <div className="flex justify-between"><span>{taxL}</span><span className="font-mono text-ink">{money(C.tax)}</span></div>
        <div className="h-px bg-line" />
        <div className="flex items-baseline justify-between"><span className="text-[13.5px] font-bold text-ink">Total</span><span className="font-display text-[20px] font-extrabold leading-none tracking-[-0.02em] text-ink">{money(total)}</span></div>
      </div>
    </>
  );
  const notaPago = (
    <div className="flex items-start gap-2.5 rounded-2xl bg-pro/[.12] px-3.5 py-[13px]">
      <span className="grid flex-none pt-px"><Icon name="lock" size={16} color="var(--tl-pro-ink)" /></span>
      <span className="text-pretty text-[12.5px] font-medium leading-[1.55] text-pro-ink">{hold}</span>
    </div>
  );
  const boton = <Button variant="action" block disabled={enviando || sinPedidos} onClick={enviar}>{enviando ? E2("Enviando…", "Sending…") : cta}</Button>;

  return (
    <div data-pantalla="APP-NEG-CHECKOUT" className="min-h-dvh bg-paper pb-[130px] lg:px-[30px] lg:pb-[60px] lg:pt-[22px]">
      {/* Teléfono: barra de arriba */}
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:hidden">
        <button type="button" aria-label={E2("Volver", "Back")} onClick={volver} className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{E2("Finalizar pedido", "Checkout")}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{countCaps}</div>
        </div>
        <Icon name="shield" size={19} color="var(--tl-open)" />
      </div>
      {/* Escritorio: volver y título */}
      <div className="mx-auto hidden max-w-[1380px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{m.negocio.nombre}</button>
        <div className="mt-3.5 flex items-center gap-3"><h1 className="font-display text-[32px] font-extrabold leading-none tracking-[-0.045em]">{E2("Finalizar pedido", "Checkout")}</h1><Icon name="shield" size={22} color="var(--tl-open)" /></div>
        <div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{countCaps}</div>
      </div>

      {cart && !lines.length && (
        <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
          <div className="text-[15px] font-bold">{E2("Tu pedido está vacío", "Your order is empty")}</div>
          <div className="text-[12.5px] font-medium text-ink/55">{E2("Vuelve al menú para agregar platos.", "Go back to the menu to add dishes.")}</div>
          <div className="mt-2.5 flex"><Button variant="secondary" onClick={volver}>{E2("Volver al menú", "Back to menu")}</Button></div>
        </div>
      )}

      {lines.length > 0 && (
        <div className="mx-auto max-w-[1380px] lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_372px] lg:items-start lg:gap-x-12 lg:gap-y-8">
          <div className="flex min-w-0 flex-col gap-3 px-4 pt-4 lg:gap-3.5 lg:p-0">
            {(error || sinPedidos) && (
              <div data-screen-label="Checkout · no se pudo enviar" role="alert" className="rounded-2xl border border-danger/25 bg-danger/[.08] px-[15px] py-3.5">
                <div className="flex items-start gap-[11px]">
                  <span className="grid flex-none pt-px"><Icon name="warning" size={17} color="var(--tl-danger)" /></span>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-bold leading-[1.4] text-danger">{error ? error.msg : est.closedT || E2("Este negocio no toma más pedidos en línea este mes.", "This business takes no more online orders this month.")}</div>
                    {!error && est.closedS && <div className="mt-[3px] text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/[.72]">{est.closedS}</div>}
                  </div>
                </div>
                {(error?.menu || sinPedidos) && <div className="mt-3 flex"><Button variant="secondary" size="md" onClick={volver}>{E2("Volver al menú", "Back to menu")}</Button></div>}
              </div>
            )}
            {(ENT.hasFree && dl) && <EnvioGratis e={ENT} />}
            <div className={caja}>
              {est.modes.length > 0 && <Modos modes={est.modes.map((k) => ({ k, l: k === "delivery" ? "Delivery" : "Pickup", icon: k === "delivery" ? "truck" : "bag", on: k === modo, onClick: () => cambiaModo(k) }))} />}
              <div className={`mt-3.5 ${K}`}>{dl ? E2("ENTREGA", "DELIVER TO") : "PICKUP"}</div>
              {dl ? (
                <div className="mt-[11px] flex items-center gap-[11px]">
                  <span className="grid size-9 flex-none place-items-center rounded-[11px] bg-action/10"><Icon name="home" size={17} color="var(--tl-action)" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold">{dir ? dirT : E2("Agrega tu dirección", "Add your address")}</div>
                    <div className="mt-0.5 text-[11.5px] font-medium text-ink/50">{dir ? [dir.apt, dropL].filter(Boolean).join(" · ") : E2("A dónde te lo llevan", "Where to deliver")}</div>
                  </div>
                  <button type="button" onClick={() => router.push(dir ? `/cuenta/direcciones?volver=${aqui}` : `/cuenta/direcciones/nueva?volver=${aqui}`)} className="flex-none text-[12px] font-bold text-action">{dir ? E2("Cambiar", "Change") : E2("Agregar", "Add")}</button>
                </div>
              ) : (
                <div className="mt-[11px] flex items-center gap-[11px]">
                  <span className="grid size-9 flex-none place-items-center rounded-[11px] bg-action/10"><Icon name="store" size={17} color="var(--tl-action)" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold">{E2("Recoges en ", "Pick up at ")}{m.negocio.direccion ?? m.negocio.nombre}</div>
                    <div className="mt-0.5 text-[11.5px] font-medium text-ink/50">{m.negocio.pickupNote || E2("Di tu número de pedido.", "Give your order number.")}</div>
                  </div>
                  {m.negocio.lat != null && m.negocio.lng != null && (
                    <button type="button" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${m.negocio.lat},${m.negocio.lng}`, "_blank", "noopener")} className="flex-none text-[12px] font-bold text-action">{E2("Cómo llegar", "Directions")}</button>
                  )}
                </div>
              )}
              <button type="button" disabled={!chips.length || sinPedidos} onClick={() => setVerHoras(!verHoras)} className="mt-[13px] flex w-full items-center gap-[11px] border-t border-ink/[.07] pt-[13px] text-left">
                <span className="grid size-9 flex-none place-items-center rounded-[11px] bg-signal/[.14]"><Icon name="clock" size={17} color="var(--tl-open-text)" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold">{whenL}</div>
                  <div className="mt-0.5 text-[11.5px] font-medium text-ink/50">{whenSub}</div>
                </div>
                {chips.length > 1 && <span className="flex-none text-[12px] font-bold text-action">{E2("Cambiar", "Change")}</span>}
              </button>
              {verHoras && (
                <div className="mt-3 flex flex-wrap gap-[7px]">
                  {chips.map((x) => <Chip key={x.v} variant={x.v === cuando ? "selected" : "filter"} onClick={() => { setCuando(x.v); setVerHoras(false); }}>{x.l}</Chip>)}
                </div>
              )}
              {verHoras && hasta < 99999 && (
                <div className="mt-2.5 text-pretty text-[11.5px] font-medium leading-[1.5] text-ink/60">
                  {E2(`Tu pedido tiene platos que se sirven hasta las ${hora(hasta)}: puedes programar hasta las ${hora(hasta - 30)}.`, `Your order has dishes served until ${hora(hasta)}: you can schedule up to ${hora(hasta - 30)}.`)}
                </div>
              )}
            </div>
            {dl && dir && (
              <div data-screen-label="Checkout · cómo entregar" className={caja}>
                <div className={K}>{E2("CÓMO TE LO ENTREGAMOS", "HOW WE DELIVER")}</div>
                <div className="mt-[11px] grid grid-cols-2 gap-2">
                  {([["mano", "users", E2("En la mano", "Hand it to me"), E2("Te lo entregan en persona", "Handed to you in person")], ["puerta", "home", E2("Dejar en la puerta", "Leave at door"), E2("Sin contacto", "No contact")]] as const).map(([k, ic, l, sub]) => {
                    const on = drop === k;
                    return (
                      <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setDrop(k)} className={`flex flex-col gap-2.5 rounded-[14px] border-[1.5px] bg-white p-3 text-left ${on ? "border-ink" : "border-ink/10"}`}>
                        <div className="flex items-center justify-between">
                          <span className={`grid size-8 place-items-center rounded-[10px] ${on ? "bg-action/10" : "bg-ink/5"}`}><Icon name={ic} size={16} color={on ? "var(--tl-action)" : "rgba(11,14,18,.6)"} /></span>
                          <span className={`size-[18px] rounded-full bg-white ${on ? "border-[5.5px] border-ink" : "border-[1.5px] border-ink/20"}`} />
                        </div>
                        <div><div className="text-[13px] font-bold leading-[1.25]">{l}</div><div className="mt-[3px] text-pretty text-[11px] font-medium leading-[1.4] text-ink/55">{sub}</div></div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3.5 font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("AL LLEGAR", "ON ARRIVAL")}</div>
                <div className="mt-2 flex flex-wrap gap-[7px]">{AT.map(([k, a, b]) => <Chip key={k} variant={at.includes(k) ? "selected" : "filter"} onClick={() => togAt(k)}>{es ? a : b}</Chip>)}</div>
                <div className="mt-3.5 flex items-baseline justify-between gap-2.5"><span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("INSTRUCCIONES PARA EL REPARTIDOR", "NOTES FOR THE DRIVER")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{nota.length}/200</span></div>
                <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 200))} placeholder={E2("Portón, piso, dónde estacionar…", "Gate, floor, where to park…")} aria-label={E2("Instrucciones para el repartidor", "Notes for the driver")} rows={2}
                  className="mt-2 w-full resize-none rounded-[13px] border border-ink/[.12] bg-white px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] text-ink outline-none" />
                {/* La foto al dejarlo y la espera de 5 min las hace la app Repartidor (aún sin diseño): no se promete aquí hasta que exista. */}
                <button type="button" role="checkbox" aria-checked={guardar} onClick={() => setGuardar(!guardar)} className="mt-3 flex w-full items-center gap-2.5 border-t border-ink/[.07] pt-3 text-left">
                  <span className={`grid size-5 flex-none place-items-center rounded-md ${guardar ? "bg-ink" : "border-[1.5px] border-ink/20 bg-white"}`}>{guardar && <Icon name="check" size={12} color="var(--tl-white)" strokeWidth={2.8} />}</span>
                  <span className="text-[12.5px] font-semibold text-ink/75">{E2(`Guardar para ${dirT}`, `Save for ${dirT}`)}</span>
                </button>
              </div>
            )}
            {tipOn && (
              <div className={caja}>
                <div className={K}>{E2("PROPINA AL REPARTIDOR", "DRIVER TIP")}</div>
                <div className="mt-[11px] grid grid-cols-4 gap-2">
                  {([["p15", "15%"], ["p18", "18%"], ["p20", "20%"], ["otro", E2("Otro", "Other")]] as const).map(([k, l]) => {
                    const on = tip === k;
                    return (
                      <button key={k} type="button" aria-pressed={on} onClick={() => setTip(k)} className={`flex h-12 flex-col items-center justify-center gap-[3px] rounded-xl border ${on ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink"}`}>
                        <span className="text-[12.5px] font-bold">{l}</span>
                        {k !== "otro" && <span className={`font-mono text-[9.5px] font-semibold ${on ? "text-white/60" : "text-ink/50"}`}>{money(Math.round((C.sub * Number(k.slice(1))) / 100))}</span>}
                      </button>
                    );
                  })}
                </div>
                {tip === "otro" && (
                  <div className="mt-2.5 flex h-[46px] items-center gap-1.5 rounded-[13px] border border-ink/[.12] px-3.5">
                    <span className="text-[14px] font-bold text-ink/50">$</span>
                    <input value={tipAmt} onChange={(e) => setTipAmt(e.target.value.replace(/[^0-9.]/g, "").slice(0, 6))} placeholder={E2("Monto en dólares", "Amount in dollars")} inputMode="decimal" aria-label={E2("Monto de la propina", "Tip amount")} className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-bold text-ink outline-none" />
                  </div>
                )}
                <div className="mt-2.5 text-[11.5px] font-medium text-ink/55">{E2("La propina va completa al repartidor.", "The full tip goes to the driver.")}</div>
              </div>
            )}
            <div className={caja}>
              <div className={K}>{E2("PAGO", "PAYMENT")}</div>
              <div className="mt-[11px] flex gap-1.5 rounded-[14px] bg-ink/5 p-1">
                <div className="flex h-[38px] min-w-0 flex-1 items-center justify-center gap-[7px] rounded-[11px] bg-white text-[12.5px] font-bold text-ink shadow-[0_1px_4px_rgba(11,14,18,.1)]"><Icon name="dollar" size={15} />{dl ? E2("Efectivo al recibir", "Cash on delivery") : E2("Pagas en el local", "Pay at the store")}</div>
              </div>
            </div>
            <div className={`${caja} lg:hidden`}>{resumen}</div>
            <div className="lg:hidden">{notaPago}</div>
          </div>
          <div className="hidden lg:sticky lg:top-[96px] lg:block">
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white p-5 shadow-[var(--shadow-float)]">
                <div>{resumen}</div>
                <div className="flex">{boton}</div>
              </div>
              {notaPago}
            </div>
          </div>
        </div>
      )}

      {lines.length > 0 && (
        <div data-screen-label="Checkout · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-5 pt-3 backdrop-blur-[14px] lg:hidden">
          <div className="flex">{boton}</div>
        </div>
      )}
    </div>
  );
}
