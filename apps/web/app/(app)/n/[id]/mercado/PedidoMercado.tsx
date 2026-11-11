"use client";
/* APP-NEG-MERC-PEDIDO (neg-merc-flow.js · vistas ab): 1 Tu pedido (líneas con su estimado, cómo lo recibes, si algo no hay, nota)
   · 2 Cuándo (hoy / mañana; pickup cada 30 min, envío en franjas de 1 h, con cupo) · 3 Revisa y envía (lo que se retiene, cómo
   se cobra, bueno saber, tarjeta o pagar en el mercado). Los montos que se ven aquí son para mostrar: el servidor los vuelve a
   calcular y decide. Compuesto con el sistema de diseño (Button, Icon, MetodoPago). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { OpcionesMerc } from "@/lib/mercado";
import { MetodoPago, tarjetaL, type ModoTarjeta, type Tarjeta } from "../../../pago/MetodoPago";
import { guardarCarritoMerc, leerCarritoMerc, type CarritoMerc } from "../Mercado";
import { enviarMercado } from "./acciones";
import { uuid } from "@/lib/uuid";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const K = "font-mono text-[10px] font-bold tracking-[0.18em] text-ink/45";
const caja = "rounded-[18px] border border-ink/[.07] bg-white p-4";
const T17 = "font-display text-[17px] font-extrabold leading-[1.2] tracking-[-0.03em]";

export function PedidoMercado({ o, es, yo, pago }: { o: OpcionesMerc; es: boolean; yo: boolean; pago: { modo: ModoTarjeta; pk: string | null; tarjetas: Tarjeta[] } | null }) {
  const E2 = (a: string, b: string) => (es ? a : b), nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const router = useRouter();
  const [cart, setCart] = useState<CarritoMerc | null>(null), [listo, setListo] = useState(false);
  useEffect(() => { const c = leerCarritoMerc(); setCart(c && c.biz === o.negocio.id ? c : null); setListo(true); }, [o.negocio.id]);
  const [modo, setModo] = useState<"pickup" | "delivery">(o.pk ? "pickup" : "delivery"), [sub, setSub] = useState(o.sub), [nota, setNota] = useState("");
  const dias = o.dias.filter((d) => (modo === "pickup" ? d.pk : d.dl).some((f) => !f.lleno));
  const [dia, setDia] = useState<"hoy" | "man">("hoy"), [hora, setHora] = useState<string | null>(null);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(pago?.tarjetas ?? []), [tarjeta, setTarjeta] = useState<Tarjeta | null>(pago?.tarjetas.find((t) => t.def) ?? pago?.tarjetas[0] ?? null);
  const [enMercado, setEnMercado] = useState(!pago), [hoja, setHoja] = useState(false), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const clave = useRef(uuid());
  useEffect(() => { if (!dias.some((d) => d.k === dia) && dias[0]) setDia(dias[0].k); setHora(null); }, [modo]); // eslint-disable-line react-hooks/exhaustive-deps
  const lineas = (cart?.lines ?? []).map((l) => ({ l, p: o.prods.find((x) => x.id === l.item) })).filter((x): x is { l: CarritoMerc["lines"][number]; p: OpcionesMerc["prods"][number] } => !!x.p);
  const est = (p: OpcionesMerc["prods"][number], q: number) => p.cents * q;
  const sub0 = lineas.reduce((a, x) => a + est(x.p, x.l.q), 0), tax = lineas.reduce((a, x) => a + Math.round((est(x.p, x.l.q) * x.p.tax) / 100), 0);
  const pesoT = lineas.filter((x) => x.p.k === "peso").reduce((a, x) => a + est(x.p, x.l.q) + Math.round((est(x.p, x.l.q) * x.p.tax) / 100), 0);
  const envio = modo === "delivery" ? (o.free && sub0 >= o.free ? 0 : o.fee) : 0, extra = Math.round(pesoT * 0.1), total = sub0 + tax + envio, retener = total + extra;
  const faltaMin = modo === "delivery" && o.min > sub0 ? o.min - sub0 : 0;
  const local = enMercado || !pago;
  const quitar = (i: number) => { if (!cart) return; const n = { ...cart, lines: cart.lines.filter((_, j) => j !== i) }; guardarCarritoMerc(n.lines.length ? n : null); setCart(n.lines.length ? n : null); };
  const fr = (o.dias.find((d) => d.k === dia)?.[modo === "pickup" ? "pk" : "dl"] ?? []);
  const miss = [!lineas.length ? E2("Agrega productos", "Add products") : null, !hora ? E2("Elige la hora", "Pick the time") : null, faltaMin ? E2(`Te faltan ${money(faltaMin)} para el envío`, `Add ${money(faltaMin)} for delivery`) : null,
    modo === "delivery" && (!o.dir || !o.dir.dentro) ? E2("Una dirección dentro de la zona", "An address inside the area") : null, modo === "delivery" && local ? E2("El envío se paga con tarjeta", "Delivery is paid by card") : null,
    !local && !tarjeta ? E2("Tu tarjeta", "Your card") : null].filter((x): x is string => !!x);
  const enviar = async () => {
    if (!yo) { router.push(`/entrar?volver=${encodeURIComponent(`/n/${o.negocio.id}/mercado`)}`); return; }
    if (miss.length || ocupado || !hora) return;
    setOcupado(true); setError(null);
    const r = await enviarMercado({ negocio: o.negocio.id, clave: clave.current, lineas: lineas.map((x) => ({ item: x.l.item, q: x.l.q, o: x.l.o })), modo, sub, nota, dia, hora, pago: local ? { tipo: "local" } : { tipo: "tarjeta", pm: tarjeta?.pm }, direccion: o.dir?.id ?? null })
      .catch(() => ({ ok: false as const, msg: { es: "No se pudo enviar. Revisa tu conexión.", en: "Could not send. Check your connection." } }));
    if (r.ok) { guardarCarritoMerc(null); router.push(`/mercado/${r.numero}`); return; }
    if ("entrar" in r && r.entrar) { router.push(`/entrar?volver=${encodeURIComponent(`/n/${o.negocio.id}/mercado`)}`); return; }
    setOcupado(false); setError(es ? r.msg.es : r.msg.en);
  };
  if (!listo) return <div className="min-h-dvh bg-paper" />;
  const radio = (on: boolean) => `box-border h-5 w-5 flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`;
  const opcion = (on: boolean, dis = false) => `flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"}${dis ? " opacity-40" : ""}`;

  const tuPedido = (
    <div data-screen-label="Pedido del mercado · tu pedido" className={caja}>
      <div className="flex items-baseline justify-between"><div className={T17}>{E2("1 · Tu pedido", "1 · Your order")}</div><button type="button" onClick={() => router.push(`/n/${o.negocio.id}?tab=svc`)} className="text-[12.5px] font-bold text-action">{E2("Agregar más", "Add more")}</button></div>
      {lineas.length ? <div className="mt-2 flex flex-col">{lineas.map((x, i) => (
        <div key={`${x.l.item}-${x.l.o}-${i}`} className="flex items-center gap-3 border-b border-ink/[.06] py-3">
          <span className="h-11 w-11 flex-none rounded-xl bg-photo-bg" style={x.p.foto ? { backgroundImage: `url(${x.p.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
          <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{nm(x.p.name)}</div>
            <div className="mt-0.5 font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{[x.p.k === "peso" ? `${x.l.q} LB · ${E2("ESTIMADO", "ESTIMATE")}` : `× ${x.l.q}`, x.p.opc && x.l.o != null ? nm(x.p.opc.o[x.l.o] ?? { es: "", en: "" }).toUpperCase() : ""].filter(Boolean).join(" · ")}</div></div>
          <div className="text-right"><div className="text-[13.5px] font-bold">{money(est(x.p, x.l.q))}{x.p.k === "peso" ? E2(" aprox.", " approx.") : ""}</div>
            <button type="button" onClick={() => quitar(i)} className="mt-0.5 text-[12px] font-bold text-danger">{E2("Quitar", "Remove")}</button></div>
        </div>))}</div>
        : <div className="mt-2 text-[13px] font-medium text-ink/60">{E2("Tu pedido está vacío. Agrega productos en la página del mercado.", "Your order is empty. Add products on the market page.")}</div>}
      <div className="mt-4"><div className={K}>{E2("¿CÓMO LO RECIBES?", "HOW DO YOU GET IT?")}</div>
        <div role="radiogroup" aria-label={E2("Cómo lo recibes", "How you get it")} className="mt-2 flex flex-col gap-2">
          {o.pk && <button type="button" role="radio" aria-checked={modo === "pickup"} onClick={() => setModo("pickup")} className={opcion(modo === "pickup")}><span className={radio(modo === "pickup")} /><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{E2("Pickup en el mercado", "Pickup at the market")}</span><span className="block text-[12px] font-medium text-ink/55">{o.negocio.dir}</span></span><span className="text-[12.5px] font-bold">{E2("Gratis", "Free")}</span></button>}
          {o.env && <button type="button" role="radio" aria-checked={modo === "delivery"} onClick={() => setModo("delivery")} className={opcion(modo === "delivery")}><span className={radio(modo === "delivery")} /><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{E2("Envío a tu casa", "Delivery to your home")}</span><span className="block text-[12px] font-medium text-ink/55">{o.min ? E2(`El envío pide un mínimo de ${money(o.min)}`, `Delivery needs a ${money(o.min)} minimum`) : E2("Sin mínimo", "No minimum")}</span></span><span className="text-[12.5px] font-bold">{o.fee ? money(o.fee) : E2("Gratis", "Free")}</span></button>}
        </div>
        {modo === "delivery" && (o.dir ? <div className={`mt-2 rounded-[13px] px-3.5 py-2.5 text-[12.5px] font-semibold ${o.dir.dentro ? "bg-paper text-ink/70" : "bg-danger/[.08] text-danger"}`}>{o.dir.dentro ? `${E2("A ", "To ")}${o.dir.label} · ${o.dir.street}` : E2(`Tu dirección queda a ${o.dir.mi ?? "?"} mi y el mercado lleva hasta ${o.zona} mi. Elige pickup.`, `Your address is ${o.dir.mi ?? "?"} mi away; the market delivers up to ${o.zona} mi. Choose pickup.`)}</div>
          : <button type="button" onClick={() => router.push("/cuenta/direcciones")} className="mt-2 text-[12.5px] font-bold text-action">{E2("Agrega tu dirección en Mis direcciones", "Add your address in My addresses")}</button>)}
      </div>
      <div className="mt-4"><div className={K}>{E2("SI ALGO NO HAY", "IF SOMETHING IS OUT")}</div>
        <div role="radiogroup" aria-label={E2("Si algo no hay", "If something is out")} className="mt-2 flex flex-col gap-2">
          {([["call", E2("Llámame", "Call me")], ["similar", E2("Uno parecido, con mi OK", "A similar one, with my OK")], ["no", E2("No sustituir", "Do not substitute")]] as const).map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={sub === k} onClick={() => setSub(k)} className={opcion(sub === k)}><span className={radio(sub === k)} /><span className="text-[13.5px] font-bold">{l}</span></button>))}
        </div>
        <div className="mt-1.5 text-[12px] font-medium text-ink/55">{E2("Sin tu OK no se cambia nada.", "Nothing is swapped without your OK.")}</div>
      </div>
      <div className="mt-4"><div className={K}>{E2("NOTA · OPCIONAL", "NOTE · OPTIONAL")}</div>
        <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 200))} rows={2} aria-label={E2("Nota para el mercado", "Note for the market")} placeholder={E2("Ej.: el pernil con cuero, plátanos bien verdes…", "E.g. pork leg with skin, very green plantains…")}
          className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] bg-white px-3.5 py-3 text-[13.5px] font-medium leading-[1.5] text-ink outline-none" />
        <div className="mt-1 text-right font-mono text-[9.5px] font-semibold text-ink/40">{nota.length} / 200</div></div>
    </div>);

  const cuando = (
    <div data-screen-label="Pedido del mercado · cuándo" className={caja}>
      <div className={T17}>{E2("2 · Cuándo", "2 · When")}</div>
      <div className="mt-3 flex gap-2">{o.dias.map((d) => <button key={d.k} type="button" onClick={() => { setDia(d.k); setHora(null); }} className={`rounded-full px-4 py-2 text-[13px] font-bold ${dia === d.k ? "bg-ink text-white" : "border border-ink/15"}`}>{d.k === "hoy" ? E2("Hoy", "Today") : E2("Mañana", "Tomorrow")}</button>)}</div>
      {fr.length ? <div role="radiogroup" aria-label={E2("Hora", "Time")} className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-4">{fr.map((f) => (
        <button key={f.v} type="button" role="radio" aria-checked={hora === f.v} aria-disabled={f.lleno} disabled={f.lleno} onClick={() => setHora(f.v)} className={`rounded-[12px] px-2 py-2.5 text-center text-[12.5px] font-bold ${hora === f.v ? "bg-ink text-white" : "border border-ink/12"} ${f.lleno ? "opacity-35 line-through" : ""}`}>{f.l}</button>))}</div>
        : <div className="mt-3 text-[13px] font-semibold text-ink/60">{dia === "hoy" ? E2("Ya no hay horas hoy. Elige mañana.", "No more times today. Choose tomorrow.") : E2("Mañana no abre.", "Closed tomorrow.")}</div>}
    </div>);

  const filas: [string, string, boolean?][] = [[E2("Estimado de los productos", "Products estimate"), money(sub0 + tax)], ...(extra ? [[E2("Extra retenido por peso (10 %)", "Extra held for weight (10%)"), money(extra)] as [string, string]] : []), ...(modo === "delivery" ? [[E2("Envío", "Delivery"), envio ? money(envio) : E2("Gratis", "Free")] as [string, string]] : [])];
  const revisa = (
    <div data-screen-label="Pedido del mercado · revisa" className={`${caja} flex flex-col gap-3.5`}>
      <div className={T17}>{E2("3 · Revisa y envía", "3 · Review and send")}</div>
      <div className="flex flex-col">{filas.map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-ink/[.06] py-2.5 text-[13px] font-semibold"><span className="text-ink/70">{k}</span><span>{v}</span></div>)}
        <div className="flex justify-between gap-3 py-3 text-[15px] font-extrabold"><span>{local ? E2("Pagas en el mercado", "You pay at the market") : E2("Hoy se retiene", "Held today")}</span><span>{local ? money(total) : money(retener)}</span></div></div>
      {pago && <div><div className={K}>{E2("CÓMO PAGAS", "HOW YOU PAY")}</div>
        <div role="radiogroup" aria-label={E2("Cómo pagas", "How you pay")} className="mt-2 flex flex-col gap-2">
          <button type="button" role="radio" aria-checked={!enMercado} onClick={() => setEnMercado(false)} className={opcion(!enMercado)}><span className={radio(!enMercado)} /><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{E2("Tarjeta", "Card")}</span><span className="block text-[12px] font-medium text-ink/55">{tarjeta ? tarjetaL(tarjeta) : E2("Agrega una tarjeta", "Add a card")}</span></span>{!enMercado && <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setHoja(true); }} className="text-[12.5px] font-bold text-action">{E2("Cambiar", "Change")}</span>}</button>
          {modo === "pickup" && <button type="button" role="radio" aria-checked={enMercado} onClick={() => setEnMercado(true)} className={opcion(enMercado)}><span className={radio(enMercado)} /><span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{E2("Pagar en el mercado", "Pay at the market")}</span><span className="block text-[12px] font-medium text-ink/55">{o.ebt ? E2("EBT, efectivo o tarjeta al recoger", "EBT, cash or card at pickup") : E2("Efectivo o tarjeta al recoger", "Cash or card at pickup")}</span></span></button>}
        </div></div>}
      {!local && <div><div className={K}>{E2("CÓMO SE COBRA", "HOW YOU ARE CHARGED")}</div>
        {[[E2("Hoy, al enviar", "Today, when you send"), `${E2("Se retiene ", "")}${money(retener)}${E2("", " held")}`, E2("No se cobra todavía. Incluye un 10 % extra en lo que va por peso.", "Nothing is charged yet. Includes 10% extra for by-weight items.")], [E2("Al pesar", "When weighed"), E2("Peso real", "Real weight"), E2("Te mandan la foto de la balanza y se cobra lo que pesó.", "They send the scale photo and you pay what it weighed.")], [E2("Al terminar", "When done"), E2("Se libera", "Released"), E2("Lo que sobre de la retención, en 3–5 días.", "Whatever is left of the hold, in 3–5 days.")]].map(([k, v, s]) => (
          <div key={k} className="flex items-start justify-between gap-3 border-b border-ink/[.06] py-2.5"><div><div className="text-[13px] font-bold">{k}</div><div className="text-[11.5px] font-medium text-ink/55">{s}</div></div><div className="text-[13px] font-bold">{v}</div></div>))}</div>}
      <div className="rounded-[14px] bg-paper px-3.5 py-3"><div className={K}>{E2("BUENO SABER", "GOOD TO KNOW")}</div>
        {[E2("Lo que va por peso se pesa delante de ti y se cobra el peso real.", "What goes by weight is weighed in front of you and you pay the real weight."), E2("Si algo no hay, te preguntan antes; si no contestas en 10 minutos, se quita y no se cobra.", "If something is out, they ask first; if you do not answer in 10 minutes, it is removed and not charged."),
          E2("Si el mercado no acepta el pedido en 10 minutos, se libera la retención.", "If the market does not accept within 10 minutes, the hold is released."), ...(o.ebt ? [E2("¿Pagas con EBT? Elige pagar en el mercado al recoger.", "Paying with EBT? Choose to pay at the market at pickup.")] : [])].map((t) => <div key={t} className="mt-1.5 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/75">{t}</div>)}</div>
      {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
      {miss.length > 0 && <div className="rounded-[14px] bg-pro/[.14] px-3.5 py-3"><div className={K}>{E2("TE FALTA", "STILL NEEDED")}</div>{miss.map((m) => <div key={m} className="mt-1 text-[12.5px] font-semibold text-pro-ink">{m}</div>)}</div>}
      <div className="hidden lg:flex"><Button block icon="bag" disabled={miss.length > 0 || ocupado} onClick={() => void enviar()}>{ocupado ? E2("Enviando…", "Sending…") : yo ? E2("Enviar pedido", "Send order") : E2("Entra para enviar", "Sign in to send")}</Button></div>
    </div>);

  return (
    <div data-pantalla="APP-NEG-MERC-PEDIDO" className="min-h-dvh bg-paper pb-[130px] lg:px-[30px] lg:pb-[60px] lg:pt-[22px]">
      <div className="mx-auto lg:max-w-[1080px]">
        <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:px-0">
          <button type="button" aria-label={E2("Volver", "Back")} onClick={() => router.push(`/n/${o.negocio.id}?tab=svc`)} className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[11px] bg-paper lg:bg-white"><Icon name="chevronLeft" size={16} strokeWidth={2} /></button>
          <div className="min-w-0 flex-1"><div className="truncate font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em] lg:text-[26px]">{E2("Tu pedido del mercado", "Your market order")}</div><div className="mt-[3px] truncate font-mono text-[9px] font-semibold tracking-[0.06em] text-ink/50">{o.negocio.nombre.toUpperCase()}</div></div>
        </div>
        <div className="flex flex-col gap-3 px-4 pt-4 lg:mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-x-10 lg:px-0 lg:pt-0">
          <div className="flex min-w-0 flex-col gap-3">{tuPedido}{cuando}</div>
          <div className="flex flex-col gap-3 lg:sticky lg:top-6">{revisa}</div>
        </div>
      </div>
      <div data-screen-label="Pedido del mercado · barra" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-ink/[.08] bg-paper/95 px-5 pb-[22px] pt-3 backdrop-blur-[14px] lg:hidden">
        <div className="min-w-0 flex-1"><div className="font-mono text-[9.5px] font-bold tracking-[0.1em] text-ink/50">{local ? E2("PAGAS EN EL MERCADO", "YOU PAY AT THE MARKET") : E2("HOY SE RETIENE", "HELD TODAY")}</div><div className="mt-1 font-display text-[18px] font-extrabold leading-none tracking-[-0.02em]">{money(local ? total : retener)}</div></div>
        <Button icon="bag" disabled={(yo && miss.length > 0) || ocupado} onClick={() => void enviar()}>{ocupado ? E2("Enviando…", "Sending…") : yo ? E2("Enviar pedido", "Send order") : E2("Entra para enviar", "Sign in to send")}</Button>
      </div>
      {hoja && pago && (
        <MetodoPago es={es} tarjetas={tarjetas} sel={tarjeta?.pm ?? null} declinada={null} modo={pago.modo} pk={pago.pk} nota={`${E2("SE RETIENEN ", "HOLDING ")}${money(retener)} · ${E2("SE COBRA LO QUE PESE", "YOU PAY WHAT IT WEIGHS")}`}
          onClose={() => setHoja(false)} onUsar={(t, nueva) => { if (nueva && !tarjetas.some((x) => x.pm === nueva.pm)) setTarjetas((L) => [nueva, ...L]); setTarjeta(t); setHoja(false); setEnMercado(false); }} />)}
    </div>
  );
}
