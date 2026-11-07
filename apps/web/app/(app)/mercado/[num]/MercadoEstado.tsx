"use client";
/* APP-NEG-MERC-ESTADO (neg-merc-flow.js · s.mped): el encabezado de cada estado (enviado · preparando · así lo pesaron · listo /
   en camino · recogido / entregado · no aceptaron · sin respuesta · cancelado), lo que se cambió (con tu OK), cada línea con «Pediste
   3 lb · pesó 2.84 lb» y la FOTO DE LA BALANZA, el dinero (estimado · peso real · retenido · se cobra · se libera), «Está bien,
   cobrar», la línea de tiempo (OrderTracker) y cancelar mientras no lo acepten. El servidor decide; aquí solo se muestra. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import type { MercadoVista } from "@/lib/mercado";
import { mercAprobar, mercCancelar, mercSustituto } from "./acciones";

type N = "Icon" | "Button" | "OrderTracker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, OrderTracker } = UI as unknown as Record<N, ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const K = "font-mono text-[10px] font-bold tracking-[0.18em] text-ink/45";
const caja = "rounded-[18px] border border-ink/[.07] bg-white p-4";

export function MercadoEstado({ v, es }: { v: MercadoVista; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b), nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null), [flash, setFlash] = useState<string | null>(null), [foto, setFoto] = useState<string | null>(null);
  // Lo que cambia por el mercado (acepta, pesa, propone) se ve sin recargar: se vuelve a leer cada 15 s mientras sigue vivo.
  useEffect(() => { if (!["pending", "confirmed"].includes(v.st)) return; const t = setInterval(() => router.refresh(), 15000); return () => clearInterval(t); }, [v.st, router]);
  const t = v.t, del = v.modo === "delivery", D = v.detalle;
  const cuando = new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(v.cuando)).replace(/\./g, "");
  const hacer = async (f: () => Promise<{ ok: true; mensaje?: { es: string; en: string } } | { ok: false; msg: { es: string; en: string } }>, ok: string) => {
    if (ocupado) return; setOcupado(true); setError(null);
    const r = await f().catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not do it. Check your connection." } }));
    setOcupado(false);
    if (r.ok) { setFlash(r.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : ok); router.refresh(); } else setError(es ? r.msg.es : r.msg.en);
  };
  const H: [string, string, string, string, string] =
    v.st === "pending" ? ["clock", "var(--tl-action)", E2("PEDIDO ENVIADO", "ORDER SENT"), E2(`Esperando a ${v.negocio.nombre}`, `Waiting for ${v.negocio.nombre}`), v.local ? E2("Pagas en el mercado al recoger. Si no aceptan en 10 min, se cancela.", "You pay at the market at pickup. If they do not accept within 10 min, it is cancelled.") : E2(`Se retuvieron ${money(t.ret)}. Si no aceptan en 10 min, se libera.`, `${money(t.ret)} was held. If they do not accept within 10 min, it is released.`)]
      : v.st === "confirmed" && D === "preparando" ? ["bag", "var(--tl-action)", E2("PREPARANDO", "PREPARING"), E2("Están armando tu pedido", "Your order is being prepared"), E2("Te mandan la foto de la balanza de lo que va por peso.", "They send the scale photo for by-weight items.")]
      : v.st === "confirmed" && D === "pesado" && !v.aprobado ? ["scale", "var(--tl-pro-ink)", E2("ASÍ LO PESARON", "HERE IS THE WEIGHT"), `${E2("Total real: ", "Real total: ")}${money(t.real)}`, v.local ? E2("Lo pagas en el mercado al recoger.", "You pay it at the market at pickup.") : E2("Revísalo. Se cobra cuando digas que está bien.", "Check it. It is charged when you say it is OK.")]
      : v.st === "confirmed" && D === "camino" ? ["truck", "var(--tl-open-text)", E2("EN CAMINO", "ON THE WAY"), E2("Tu pedido va en camino", "Your order is on the way"), v.win ? E2(`Llega antes de las ${v.win}.`, `Arrives before ${v.win}.`) : ""]
      : v.st === "confirmed" && D === "listo" ? ["check", "var(--tl-open-text)", E2("LISTO PARA RECOGER", "READY FOR PICKUP"), E2(`En el mostrador de ${v.negocio.nombre}`, `At the ${v.negocio.nombre} counter`), v.negocio.dir]
      : v.st === "confirmed" ? ["check", "var(--tl-open-text)", E2("COBRADO", "CHARGED"), `${E2("Pagaste ", "You paid ")}${money(t.cobrado)}`, E2("Te avisan cuando esté listo.", "They let you know when it is ready.")]
      : v.st === "done" ? ["check", "var(--tl-open-text)", del ? E2("ENTREGADO", "DELIVERED") : E2("RECOGIDO", "PICKED UP"), v.local ? `${E2("Total ", "Total ")}${money(t.real)}` : `${E2("Pagaste ", "You paid ")}${money(t.cobrado)}`, !v.local && t.liberado ? E2(`Se liberaron ${money(t.liberado)} · 3–5 días hábiles.`, `${money(t.liberado)} released · 3–5 business days.`) : ""]
      : v.st === "declined" ? ["close", "var(--tl-danger)", E2("NO ACEPTARON", "NOT ACCEPTED"), E2("El mercado no puede hoy", "The market cannot today"), v.local ? E2("No se cobró nada.", "Nothing was charged.") : E2(`Liberamos los ${money(t.ret)}. No se cobró nada.`, `We released the ${money(t.ret)}. Nothing was charged.`)]
      : v.st === "expired" ? ["clock", "var(--tl-danger)", E2("SIN RESPUESTA", "NO ANSWER"), E2("No aceptaron en 10 min", "Not accepted within 10 min"), E2("No se cobró nada.", "Nothing was charged.")]
      : ["close", "rgba(11,14,18,.6)", E2("CANCELADO", "CANCELLED"), E2("Cancelaste tu pedido", "You cancelled your order"), v.local ? E2("No se cobró nada.", "Nothing was charged.") : E2("Liberamos la retención.", "We released the hold.")];
  const pasos = [{ label: E2("Enviado", "Sent"), state: "done" }, { label: E2("Preparando", "Preparing"), state: v.st === "pending" ? "next" : D === "preparando" ? "current" : "done" },
    { label: E2("Pesado", "Weighed"), state: v.st === "pending" || D === "preparando" ? "next" : D === "pesado" ? "current" : "done" },
    { label: del ? E2("En camino", "On the way") : E2("Listo", "Ready"), state: D === "listo" || D === "camino" ? "current" : v.st === "done" ? "done" : "next" },
    { label: del ? E2("Entregado", "Delivered") : E2("Recogido", "Picked up"), state: v.st === "done" ? "done" : "next" }];
  const vivo = !["declined", "expired", "cancelled"].includes(v.st);
  const pesado = v.st === "done" || (v.st === "confirmed" && D !== "preparando");
  const head = (
    <div data-screen-label="Pedido del mercado · estado" className="flex items-start gap-3.5 rounded-[20px] border border-ink/[.08] bg-white p-[18px]">
      <span className="grid h-[46px] w-[46px] flex-none place-items-center rounded-[15px] bg-paper"><Icon name={H[0]} size={22} color={H[1]} /></span>
      <div className="min-w-0 flex-1"><div className="font-mono text-[9.5px] font-bold tracking-[0.14em]" style={{ color: H[1] }}>{H[2]}</div>
        <div className="mt-1.5 text-pretty font-display text-[19px] font-extrabold leading-[1.2] tracking-[-0.03em]">{H[3]}</div>
        {H[4] && <div className="mt-2 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/[.62]">{H[4]}</div>}</div>
    </div>);
  const props = v.props.length > 0 && (
    <div data-screen-label="Pedido del mercado · cambio propuesto" className="flex flex-col gap-2.5 rounded-[20px] border-[1.5px] border-ink bg-white p-4">
      <div className={K}>{E2("ALGO NO HAY · SIN TU OK NO SE COBRA", "SOMETHING IS OUT · NOT CHARGED WITHOUT YOUR OK")}</div>
      {v.props.map((p) => { const orig = v.lineas.find((l) => l.id === p.line); return (
        <div key={p.id} className="flex flex-col gap-2">
          <div className="text-pretty text-[13.5px] font-semibold">{`${E2("No hay ", "Out of ")}${orig ? nm(orig.name) : ""}. ${E2("Proponen: ", "Proposed: ")}${nm(p.name)} ${money(p.cents)}`}</div>
          <div className="grid grid-cols-2 gap-2"><Button size="md" disabled={ocupado} onClick={() => void hacer(() => mercSustituto(v.numero, p.id, true), E2("Listo: aceptaste el cambio.", "Done: you accepted the swap."))}>{E2("Sí, cámbialo", "Yes, swap it")}</Button>
            <Button size="md" variant="secondary" disabled={ocupado} onClick={() => void hacer(() => mercSustituto(v.numero, p.id, false), E2("Listo: se quita y no se cobra.", "Done: removed and not charged."))}>{E2("No, quítalo", "No, remove it")}</Button></div>
        </div>); })}
    </div>);
  const lineas = (
    <div data-screen-label="Pedido del mercado · tus productos" className={caja}>
      <div className={K}>{E2("TUS PRODUCTOS", "YOUR PRODUCTS")}</div>
      <div className="mt-1 flex flex-col">{v.lineas.map((l) => (
        <div key={l.id} className="border-b border-ink/[.06] py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><div className={`text-[13.5px] font-bold ${l.st === "out" ? "text-ink/40 line-through" : ""}`}>{nm(l.name)}{l.subOf ? E2(" · cambio con tu OK", " · swap with your OK") : ""}</div>
              <div className="mt-0.5 text-[12px] font-medium text-ink/60">{l.st === "out" ? E2("No había · no se cobra", "Out · not charged") : l.peso ? (l.lbReal != null ? E2(`Pediste ${l.lb} lb · pesó ${l.lbReal} lb`, `You asked ${l.lb} lb · weighed ${l.lbReal} lb`) : E2(`${l.lb} lb · estimado`, `${l.lb} lb · estimate`)) : `× ${l.q}`}{l.ops.length ? ` · ${l.ops.join(" · ")}` : ""}</div></div>
            <div className="text-right text-[13.5px] font-bold">{l.st === "out" ? "$0.00" : money(pesado ? l.final : l.est)}</div>
          </div>
          {l.foto && <button type="button" onClick={() => setFoto(foto === l.foto ? null : l.foto)} className="mt-2 flex items-center gap-2 text-[12px] font-bold text-action"><Icon name="image" size={14} color="var(--tl-action)" />{E2("Foto de la balanza", "Scale photo")}</button>}
          {foto && foto === l.foto && <span className="mt-2 block h-[200px] w-full rounded-[14px] bg-photo-bg" style={{ backgroundImage: `url(${l.foto})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
        </div>))}</div>
    </div>);
  const filas: [string, string][] = [[E2("Estimado", "Estimate"), money(t.est)], ...(pesado ? [[E2("Peso real", "Real total"), money(t.real)] as [string, string]] : []), ...(t.envio ? [[E2("Incluye envío", "Includes delivery"), money(t.envio)] as [string, string]] : []),
    ...(!v.local ? [[E2("Retenido", "Held"), money(t.ret)] as [string, string]] : []), ...(t.cobrado ? [[E2("Cobrado", "Charged"), money(t.cobrado)] as [string, string]] : []), ...(t.liberado ? [[E2("Liberado · 3–5 días hábiles", "Released · 3–5 business days"), money(t.liberado)] as [string, string]] : [])];
  const dinero = vivo && (
    <div data-screen-label="Pedido del mercado · dinero" className={caja}>
      <div className={K}>{v.local ? E2("PAGAS EN EL MERCADO", "YOU PAY AT THE MARKET") : `${E2("TARJETA", "CARD")}${t.tarjeta ? ` · ${t.tarjeta}` : ""}`}</div>
      <div className="mt-1 flex flex-col">{filas.map(([k, x]) => <div key={k} className="flex justify-between gap-3 border-b border-ink/[.06] py-2.5 text-[13px] font-semibold"><span className="text-ink/70">{k}</span><span>{x}</span></div>)}</div>
      {pesado && !v.local && !t.cobrado && t.ret > t.real && <div className="mt-2.5 text-pretty text-[12.5px] font-semibold text-open-text">{t.real < t.est ? E2(`Lo que va por peso pesó menos que el estimado: pagas ${money(t.real)}. Se liberan ${money(t.ret - t.real)} de la retención.`, `By-weight items weighed less than the estimate: you pay ${money(t.real)}. ${money(t.ret - t.real)} of the hold is released.`) : E2(`Se liberan ${money(t.ret - t.real)} de la retención.`, `${money(t.ret - t.real)} of the hold is released.`)}</div>}
    </div>);
  const acts = (
    <div className="flex flex-col gap-2">
      {v.st === "confirmed" && D !== "preparando" && !v.aprobado && !v.local && !v.props.length && <Button block icon="check" disabled={ocupado} onClick={() => void hacer(() => mercAprobar(v.numero), E2("Listo.", "Done."))}>{`${E2("Está bien, cobrar ", "Looks good, charge ")}${money(Math.min(t.real, t.ret))}`}</Button>}
      {v.st === "pending" && <Button block variant="secondary" icon="close" disabled={ocupado} onClick={() => void hacer(() => mercCancelar(v.numero), E2("Cancelado. No se cobró nada.", "Cancelled. Nothing was charged."))}>{E2("Cancelar pedido", "Cancel order")}</Button>}
      {v.negocio.tel && <Button block variant="secondary" icon="phone" onClick={() => { location.href = `tel:${v.negocio.tel}`; }}>{E2("Llamar al mercado", "Call the market")}</Button>}
      {v.st === "done" && <Button block icon="star" onClick={() => router.push(`/n/${v.negocio.id}/resena?pedido=${v.numero}`)}>{E2("¿Cómo te fue? · Reseña verificada", "How was it? · Verified review")}</Button>}
      {v.st === "done" && <Button block variant="secondary" icon="help" onClick={() => router.push(`/mercado/${v.numero}/ayuda`)}>{E2("Ayuda con el pedido", "Order help")}</Button>}
      {!vivo && <Button block variant="secondary" icon="search" onClick={() => router.push(`/n/${v.negocio.id}`)}>{E2("Volver al mercado", "Back to the market")}</Button>}
    </div>);
  return (
    <div data-pantalla="APP-NEG-MERC-ESTADO" className="min-h-dvh bg-paper pb-[60px] lg:px-[30px] lg:pt-[22px]">
      <div className="mx-auto lg:max-w-[1080px]">
        <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:px-0">
          <button type="button" aria-label={E2("Volver", "Back")} onClick={() => router.push(`/n/${v.negocio.id}`)} className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[11px] bg-paper lg:bg-white"><Icon name="chevronLeft" size={16} strokeWidth={2} /></button>
          <div className="min-w-0 flex-1"><div className="truncate font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em] lg:text-[26px]">{`${E2("Pedido ", "Order ")}${v.numero}`}</div><div className="mt-[3px] truncate font-mono text-[9px] font-semibold tracking-[0.06em] text-ink/50">{`${v.negocio.nombre} · ${del ? E2("ENVÍO", "DELIVERY") : "PICKUP"} · ${cuando}`.toUpperCase()}</div></div>
        </div>
        <div className="flex flex-col gap-3 px-4 pt-4 lg:mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-10 lg:px-0 lg:pt-0">
          <div className="flex min-w-0 flex-col gap-3">
            {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
            {flash && <div role="status" className="rounded-[14px] bg-signal/[.16] px-3.5 py-3 text-[12.5px] font-bold text-open-text">{flash}</div>}
            {head}{props}{lineas}<div className="lg:hidden">{dinero}</div><div className="lg:hidden">{acts}</div>
          </div>
          <div className="flex flex-col gap-3 lg:sticky lg:top-6"><div className="grid"><OrderTracker steps={pasos} /></div><div className="hidden lg:block">{dinero}</div><div className="hidden lg:block">{acts}</div></div>
        </div>
      </div>
    </div>
  );
}
