"use client";
/* Ficha de Mercados (4o · prototipo neg-merc-listing.js: listingAdd, sheetVals, resAdd). La pestaña Productos por sección con su
   precio (por libra «/lb · SE COBRA LO QUE PESE»), la hoja con «¿Cuánto? · estimado» y el corte o el punto, el carrito de UN
   mercado a la vez (en el teléfono; el servidor lo vuelve a revisar todo al pedir), «¿Lo pesan delante de ti?», cómo se cobra
   lo que va por peso en 4 pasos, el riel y la barra. Lo de 21+ o solo en la tienda sale con su precio y «Cómo llegar».
   Compuesto con el sistema de diseño (Button, Icon). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type MouseEvent } from "react";
import type { MercPublico, ProdMerc } from "@/lib/merc-publico";
import { abrirComoLlegar } from "@/lib/como-llegar";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});
const stop = (e?: MouseEvent) => e?.stopPropagation();
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const K = "font-mono text-[10px] font-bold tracking-[0.18em] text-ink/45";
const QTY: Record<ProdMerc["k"], number[]> = { peso: [1, 2, 3, 5, 10], unid: [1, 2, 3, 6, 12], plato: [1, 2, 3, 4] };

/* El carrito del mercado: uno a la vez en el teléfono. */
export type LineaMerc = { item: string; q: number; o: number | null };
export type CarritoMerc = { biz: string; lines: LineaMerc[] };
const CLAVE = "tl-mercado";
export function leerCarritoMerc(): CarritoMerc | null {
  try { const x = JSON.parse(localStorage.getItem(CLAVE) ?? "null"); return x && typeof x.biz === "string" && Array.isArray(x.lines) ? { biz: x.biz, lines: x.lines.filter((l: LineaMerc) => typeof l?.item === "string" && Number(l?.q) > 0).slice(0, 30) } : null; } catch { return null; }
}
export function guardarCarritoMerc(c: CarritoMerc | null) { try { if (c && c.lines.length) localStorage.setItem(CLAVE, JSON.stringify(c)); else localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento: vive en la pantalla */ } }

export function useMerc(mp: MercPublico | null, es: boolean) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [hoja, setHoja] = useState<string | null>(null);
  const [cart, setCart] = useState<CarritoMerc | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => { setCart(leerCarritoMerc()); }, []);
  if (!mp) return null;
  const nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es), h = mp.h, ord = mp.ord;
  const mio = cart && cart.biz === mp.negocio.id ? cart : null;
  const pod = (p: ProdMerc) => ord && !p.tienda && !p.edad && !p.ago;
  const est = (p: ProdMerc, q: number) => p.cents * q;
  const tot = (mio?.lines ?? []).reduce((a, l) => { const p = mp.prods.find((x) => x.id === l.item); if (!p) return a; const v = est(p, l.q); return { est: a.est + v, lb: a.lb + (p.k === "peso" ? v : 0), n: a.n + 1 }; }, { est: 0, lb: 0, n: 0 });
  const enPedido = (id: string) => (mio?.lines ?? []).filter((l) => l.item === id).reduce((a, l) => a + l.q, 0);
  const precio = (p: ProdMerc) => ({ l: `${money(p.cents)}${p.k === "peso" ? "/lb" : ""}`, s: p.k === "peso" ? E2("SE COBRA LO QUE PESE", "YOU PAY WHAT IT WEIGHS") : p.k === "plato" ? E2("LISTO PARA LLEVAR", "READY TO GO") : "" });
  const meta = (p: ProdMerc) => { const n = enPedido(p.id); return [precio(p).s, p.ago ? E2("SE ACABÓ HOY", "SOLD OUT TODAY") : "", p.edad ? E2("21+ · SOLO EN LA TIENDA", "21+ · IN STORE ONLY") : p.tienda ? E2("SOLO EN LA TIENDA", "IN STORE ONLY") : "", n ? `${E2("EN TU PEDIDO: ", "IN YOUR ORDER: ")}${n}${p.k === "peso" ? " LB" : ""}` : ""].filter(Boolean).join(" · "); };
  const secs = [...mp.secciones.map((sc) => ({ title: nm(sc.name).toUpperCase(), items: mp.prods.filter((p) => p.sec === sc.id) })), { title: E2("OTROS", "OTHER"), items: mp.prods.filter((p) => !mp.secciones.some((sc) => sc.id === p.sec)) }].filter((x) => x.items.length);
  const linea = E2("Lo que va por peso se pesa delante de ti y se cobra el peso real.", "What goes by weight is weighed in front of you and you pay the real weight.");
  const notes: [string, string][] = [["scale", `${linea}${h.pesa ? E2(" Aquí la balanza está de frente al cliente.", " Here the scale faces the customer.") : ""}`]];
  if (ord) notes.push(["dollar", E2("En pedidos por libra se retiene el estimado + 10 % y se cobra lo que pesó, con la foto de la balanza. Lo que sobra se libera.", "For by-the-pound orders the estimate + 10% is held and you pay what it weighed, with the scale photo. The rest is released.")]);
  if (ord) notes.push(["phone", E2("Si algo no hay, te preguntan antes de cambiarlo. Sin tu OK no se sustituye.", "If something is out, they ask before swapping. Nothing is swapped without your OK.")]);
  if (h.ebt) notes.push(["card", E2(`Acepta EBT / SNAP en la tienda${ord && h.pk ? " y en pickup" : ""}.`, `Takes EBT / SNAP in store${ord && h.pk ? " and at pickup" : ""}.`)]);
  if (mp.edad21) notes.push(["shield", E2("21+ con ID; no hay envío de alcohol ni tabaco.", "21+ with ID; no delivery of alcohol or tobacco.")]);
  const riel: { k: string; v: string }[] = [{ k: "PICKUP", v: h.pk ? E2("En 30–45 min", "In 30–45 min") : "No" }, { k: E2("ENVÍO", "DELIVERY"), v: h.env ? `${h.fee ? money(h.fee) : E2("Gratis", "Free")}${h.min ? E2(` · mín. ${money(h.min)}`, ` · min ${money(h.min)}`) : ""}` : "No" },
    { k: E2("PAGO", "PAYMENT"), v: [h.ebt ? "EBT" : "", E2("tarjeta", "card"), h.cash ? E2("efectivo", "cash") : ""].filter(Boolean).join(" · ") }];
  const agregar = (p: ProdMerc, q: number, o: number | null) => {
    const otro = !!cart && cart.biz !== mp.negocio.id && cart.lines.length > 0;
    const base = mio?.lines ?? [], lines = [...base.filter((l) => !(l.item === p.id && l.o === o)), { item: p.id, q, o }];
    const nuevo = { biz: mp.negocio.id, lines }; guardarCarritoMerc(nuevo); setCart(nuevo); setHoja(null);
    setAviso(otro ? E2("Se reemplazó tu pedido del otro mercado.", "Your order at the other market was replaced.") : E2("Agregado a tu pedido.", "Added to your order."));
    setTimeout(() => setAviso(null), 2600);
  };
  const quitar = (item: string, o: number | null) => { if (!mio) return; const nuevo = { ...mio, lines: mio.lines.filter((l) => !(l.item === item && l.o === o)) }; guardarCarritoMerc(nuevo); setCart(nuevo.lines.length ? nuevo : null); };
  const verPedido = () => router.push(`/n/${mp.negocio.id}/mercado`);
  const llegar = () => abrirComoLlegar({ dir: mp.negocio.direccion ?? mp.negocio.nombre });
  const llamar = () => { if (mp.negocio.telefono) location.href = `tel:${mp.negocio.telefono}`; };
  return { mp, es, E2, nm, h, ord, secs, notes, riel, precio, meta, pod, tot, mio, hoja, aviso, abrir: (id: string, e?: MouseEvent) => { stop(e); setHoja(id); }, cerrar: () => setHoja(null), agregar, quitar, verPedido, llegar, llamar, linea,
    otroMercado: !!cart && cart.biz !== mp.negocio.id && cart.lines.length > 0, top: mp.prods.filter((p) => !p.ago).slice(0, 4) };
}
export type Me = NonNullable<ReturnType<typeof useMerc>>;

function Fila({ v, p, tarjeta }: { v: Me; p: ProdMerc; tarjeta?: boolean }) {
  const P = v.precio(p), puede = v.pod(p);
  return (
    <div role="button" tabIndex={0} onClick={(e) => v.abrir(p.id, e)} onKeyDown={(e) => { if (e.key === "Enter") v.abrir(p.id); }}
      className={`${tarjeta ? "flex cursor-pointer items-center gap-[13px] rounded-[18px] border border-ink/[.08] bg-white p-3.5" : "flex cursor-pointer items-center gap-[13px] border-b border-ink/[.07] py-3.5"}${p.ago ? " opacity-60" : ""}`}>
      <span className="h-14 w-14 flex-none rounded-[15px] bg-photo-bg" style={fondo(p.foto)} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold leading-[1.3]">{v.nm(p.name)}</div>
        {v.meta(p) && <div className="mt-1 font-mono text-[10px] font-semibold leading-[1.4] tracking-[0.04em] text-ink/50">{v.meta(p)}</div>}
        <div className="mt-1.5 font-display text-[16px] font-extrabold leading-none tracking-[-0.02em]">{P.l}</div>
      </div>
      {puede ? <Button variant="soft" size="md" onClick={(e: MouseEvent) => v.abrir(p.id, e)}>{v.E2("Agregar", "Add")}</Button>
        : !p.ago && <Button variant="soft" size="md" icon="pin" onClick={(e: MouseEvent) => { stop(e); v.llegar(); }}>{v.E2("Cómo llegar", "Directions")}</Button>}
    </div>
  );
}
const Nota = ({ ic, t }: { ic: string; t: string }) => (
  <div className="flex items-start gap-[11px] rounded-2xl bg-action/[.07] px-3.5 py-[13px]"><span className="grid flex-none pt-px"><Icon name={ic} size={17} color="var(--tl-action)" /></span><span className="flex-1 text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/75">{t}</span></div>
);

/* «Tu pedido»: lo que lleva el carrito de este mercado y el estimado. */
export function MeTuPedido({ v }: { v: Me }) {
  const { E2 } = v;
  if (!v.mio || !v.tot.n) return null;
  return (
    <button type="button" data-screen-label="Ficha · tu pedido del mercado" onClick={v.verPedido} className="flex w-full items-center gap-3.5 rounded-[18px] border-[1.5px] border-ink bg-white px-4 py-3.5 text-left">
      <span className="grid h-11 w-11 flex-none place-items-center rounded-[14px] bg-ink"><Icon name="bag" size={20} color="var(--tl-white)" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[9.5px] font-bold tracking-[0.14em] text-action">{`${E2("TU PEDIDO", "YOUR ORDER")} · ${v.tot.n} ${v.tot.n === 1 ? E2("ARTÍCULO", "ITEM") : E2("ARTÍCULOS", "ITEMS")}`}</span>
        <span className="mt-1 block font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">{`${E2("Estimado ", "Estimate ")}${money(v.tot.est)}`}</span>
        {v.tot.lb > 0 && <span className="mt-1 block text-[12px] font-medium text-ink/60">{E2("Lo que va por peso se cobra al pesar", "By-weight items are charged when weighed")}</span>}
      </span>
      <span className="flex-none text-[13px] font-bold text-action">{E2("Ver", "View")}</span>
    </button>
  );
}

export function MeTab({ v, desk }: { v: Me; desk: boolean }) {
  return (
    <div data-screen-label={desk ? "Ficha · productos · desktop" : "Ficha · productos"} className={desk ? "flex max-w-[760px] flex-col gap-4 pt-6" : "flex flex-col gap-4 px-5 pt-[18px]"}>
      <MeTuPedido v={v} />
      {v.notes.slice(0, 4).map(([ic, t]) => <Nota key={t} ic={ic} t={t} />)}
      <div className="flex flex-col gap-[22px]">
        {v.secs.map((sc) => (
          <div key={sc.title}>
            <div className="font-mono text-[11px] font-extrabold tracking-[0.14em] text-ink/45">{sc.title}</div>
            <div className={desk ? "mt-3 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1"}>{sc.items.map((p) => <Fila key={p.id} v={v} p={p} tarjeta={desk} />)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* La hoja del producto: ¿cuánto? (estimado por libra) o ¿cuántos?, corte o punto, lo que se retiene y la CTA. */
export function MeHoja({ v }: { v: Me }) {
  const { mp, E2, nm } = v;
  const [qi, setQi] = useState(0), [oi, setOi] = useState(0);
  useEffect(() => { setQi(0); setOi(0); }, [v.hoja]);
  if (!v.hoja) return null;
  const p = mp.prods.find((x) => x.id === v.hoja);
  if (!p) return null;
  const P = v.precio(p), QS = QTY[p.k], q = QS[qi] ?? QS[0]!, est = p.cents * q, puede = v.pod(p);
  const pay = p.k === "peso" ? E2(`Es un estimado: pesa distinto cada pieza. Se retiene ${money(Math.round(est * 1.1))} y se cobra lo que pese, con la foto de la balanza.`, `This is an estimate: each piece weighs differently. ${money(Math.round(est * 1.1))} is held and you pay what it weighs, with the scale photo.`)
    : E2("Precio del estante. Si no hay, te preguntan antes de cambiarlo.", "Shelf price. If it is out, they ask before swapping.");
  const grupos: { t: string; ops: { l: string; s: string }[]; sel: number; set: (i: number) => void }[] = [
    { t: p.k === "peso" ? E2("¿Cuánto? · estimado", "How much? · estimate") : E2("¿Cuántos?", "How many?"), ops: QS.map((n) => ({ l: p.k === "peso" ? `${n} lb` : String(n), s: `${money(p.cents * n)}${p.k === "peso" ? E2(" aprox.", " approx.") : ""}` })), sel: qi, set: setQi },
    ...(p.opc && p.opc.o.length ? [{ t: /^corte$/i.test(p.opc.t.es) ? E2("¿Cómo lo quieres?", "How do you want it?") : /^punto$/i.test(p.opc.t.es) ? E2("¿De qué punto?", "How ripe?") : nm(p.opc.t), ops: p.opc.o.map((o) => ({ l: nm(o), s: "" })), sel: oi, set: setOi }] : []),
  ];
  return (
    <div data-screen-label="Producto · Mercados" className="fixed inset-0 z-[60]">
      <div onClick={v.cerrar} className="absolute inset-0 bg-ink/50" />
      <div role="dialog" aria-modal="true" aria-label={nm(p.name)} className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col overflow-hidden rounded-t-[26px] bg-white lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[86vh] lg:w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
        <div className="flex-1 overflow-y-auto">
          <div className="relative h-[190px] flex-none bg-photo-bg" style={fondo(p.foto ?? mp.negocio.foto)}>
            <button type="button" aria-label={E2("Cerrar", "Close")} onClick={v.cerrar} className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-xl bg-white/[.94]"><Icon name="close" size={15} strokeWidth={2.4} /></button>
          </div>
          <div className="flex flex-col gap-4 px-5 pb-6 pt-[18px]">
            <div>
              <div className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.035em]">{nm(p.name)}</div>
              <div className="mt-[9px] flex flex-wrap items-center gap-2.5"><span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">{P.l}</span>{P.s && <span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/50">{P.s}</span>}</div>
              {nm(p.desc) && <p className="mt-2.5 text-pretty text-[13px] leading-[1.6] text-ink/65">{nm(p.desc)}</p>}
            </div>
            {puede ? grupos.map((g) => (
              <div key={g.t}>
                <div className="flex items-baseline justify-between"><div className="text-[14.5px] font-extrabold">{g.t}</div><div className={K}>{E2("ELIGE 1", "CHOOSE 1")}</div></div>
                <div role="radiogroup" aria-label={g.t} className="mt-2 flex flex-col gap-2">
                  {g.ops.map((o, i) => (
                    <button key={o.l} type="button" role="radio" aria-checked={g.sel === i} onClick={() => g.set(i)} className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${g.sel === i ? "border-[1.5px] border-ink" : "border border-ink/10"}`}>
                      <span className={`box-border h-5 w-5 flex-none rounded-full ${g.sel === i ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
                      <span className="min-w-0 flex-1 text-[13.5px] font-bold">{o.l}</span>{o.s && <span className="text-[12.5px] font-semibold text-ink/60">{o.s}</span>}
                    </button>))}
                </div>
              </div>)) : (
              <Nota ic={p.edad ? "shield" : "store"} t={p.ago ? E2("Se acabó hoy. Vuelve mañana.", "Sold out today. Back tomorrow.") : p.edad ? E2("21+ con ID: se compra en la tienda. No se pide por la app.", "21+ with ID: bought in store. Not ordered in the app.") : !v.ord ? E2("Este mercado no toma pedidos en To’Latino: ve directo.", "This market does not take To’Latino orders: walk in.") : E2("Solo en la tienda: no se pide por la app.", "In store only: not ordered in the app.")} />)}
            {puede && <div className="rounded-2xl bg-paper px-3.5 py-3 text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/75">{pay}{v.otroMercado ? E2(" Tienes un pedido en otro mercado; si agregas aquí, se reemplaza.", " You have an order at another market; adding here replaces it.") : ""}</div>}
          </div>
        </div>
        <div className="flex flex-none items-center gap-3.5 border-t border-ink/[.08] bg-white px-4 pb-[22px] pt-3 lg:pb-4">
          {puede && <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{p.k === "peso" ? E2("ESTIMADO", "ESTIMATE") : "TOTAL"}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{`${money(est)}${p.k === "peso" ? E2(" aprox.", " approx.") : ""}`}</div></div>}
          <div className="flex min-w-0 flex-1">{puede ? <Button block icon="bag" onClick={() => v.agregar(p, q, p.opc && p.opc.o.length ? oi : null)}>{E2("Agregar al pedido", "Add to order")}</Button> : <Button block icon="pin" onClick={v.llegar}>{E2("Cómo llegar", "Directions")}</Button>}</div>
        </div>
      </div>
    </div>
  );
}

export function MeResumen({ v, desk, onAll }: { v: Me; desk: boolean; onAll?: () => void }) {
  const { E2, h, mp } = v;
  const [fq, setFq] = useState<number | null>(null);
  const FQ: [string, string][] = [[E2("¿Cómo se cobra lo que va por peso?", "How are by-weight items charged?"), E2("Se retiene el estimado + 10 %. Lo pesan, te mandan la foto de la balanza y se cobra el peso real. El resto se libera en 3–5 días.", "The estimate + 10% is held. They weigh it, send the scale photo and charge the real weight. The rest is released in 3–5 days.")],
    [E2("¿Y si algo no hay?", "What if something is out?"), E2("Te preguntan antes de cambiarlo por otro. Si no contestas en 10 minutos, lo quitan y no se cobra.", "They ask before swapping. If you do not answer in 10 minutes, it is removed and not charged.")],
    [E2("¿Aceptan EBT?", "Do they take EBT?"), h.ebt ? E2("Sí, en la tienda y al recoger. El envío se paga con tarjeta. El EBT no cubre comida caliente, alcohol ni tabaco.", "Yes, in store and at pickup. Delivery is paid by card. EBT does not cover hot food, alcohol or tobacco.") : E2("No.", "No.")],
    ...(mp.edad21 ? [[E2("¿Piden identificación?", "Do they ask for ID?"), E2("Sí: licor, cerveza, tabaco y vape son 21+ con ID y se compran en la tienda.", "Yes: liquor, beer, tobacco and vape are 21+ with ID and bought in store.")] as [string, string]] : [])];
  const pasos = [E2("Agregas lo que quieres; por libra es un estimado.", "Add what you want; by the pound is an estimate."), E2("Se retiene el estimado + 10 %. No se cobra todavía.", "The estimate + 10% is held. Nothing is charged yet."),
    E2("Lo pesan y te mandan la foto de la balanza. Si algo no hay, te preguntan.", "They weigh it and send the scale photo. If something is out, they ask."), E2("Se cobra lo que pesó y se libera el resto.", "You pay what it weighed and the rest is released.")];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-display text-[18px] font-extrabold leading-[1.1] tracking-[-0.03em] lg:text-[24px] lg:tracking-[-0.035em]">{E2("Productos", "Products")}</div>
        {onAll && <button type="button" onClick={onAll} className="text-[12.5px] font-bold text-action">{E2("Ver productos", "See products")}</button>}
      </div>
      <div className="mt-3"><MeTuPedido v={v} /></div>
      <div data-screen-label={desk ? "Resumen desktop · productos" : "Resumen · productos"} className={desk ? "mt-4 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1.5"}>
        {v.top.map((p) => <Fila key={p.id} v={v} p={p} tarjeta={desk} />)}
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <div data-screen-label="Resumen · ¿lo pesan delante de ti?" className="rounded-[18px] border border-ink/[.08] bg-white p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-[14px] bg-signal/[.16]"><Icon name="scale" size={20} color="var(--tl-open-text)" /></span>
            <div className="min-w-0 flex-1">
              <div className={K}>{E2("¿LO PESAN DELANTE DE TI?", "IS IT WEIGHED IN FRONT OF YOU?")}</div>
              <div className="mt-1.5 text-[15px] font-extrabold leading-[1.3]">{h.pesa ? E2("Sí: la balanza está de frente al cliente", "Yes: the scale faces the customer") : E2("Pregunta en el mostrador", "Ask at the counter")}</div>
              {v.ord && <div className="mt-1 text-[12.5px] font-medium text-ink/60">{E2("En pedidos: foto de la balanza en cada artículo por peso.", "On orders: a scale photo for every by-weight item.")}</div>}
            </div>
          </div>
        </div>
        {v.ord && (
          <div data-screen-label="Resumen · cómo se cobra lo que va por peso">
            <div className="font-display text-[16px] font-extrabold tracking-[-0.02em]">{E2("Cómo se cobra lo que va por peso", "How by-weight items are charged")}</div>
            <div className="mt-2.5 flex flex-col gap-2.5">{pasos.map((p, i) => (
              <div key={p} className="flex items-start gap-3"><span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-ink font-mono text-[11px] font-bold text-white">{i + 1}</span><span className="flex-1 text-pretty pt-0.5 text-[13px] font-medium leading-[1.5] text-ink/75">{p}</span></div>))}</div>
          </div>)}
        {mp.pro && (
          <div data-screen-label="Resumen · preguntas del mercado" className="rounded-[18px] border border-ink/[.08] bg-white px-4">
            {FQ.map(([q, a], i) => (
              <div key={q} className={i ? "border-t border-ink/[.06]" : ""}>
                <button type="button" aria-expanded={fq === i} onClick={() => setFq(fq === i ? null : i)} className="flex w-full items-center justify-between gap-3 py-3.5 text-left text-[13.5px] font-bold">{q}<span style={{ transform: `rotate(${fq === i ? 180 : 0}deg)` }}><Icon name="chevronDown" size={15} /></span></button>
                {fq === i && <div className="pb-3.5 text-pretty text-[13px] font-medium leading-[1.55] text-ink/70">{a}</div>}
              </div>))}
          </div>)}
      </div>
    </div>
  );
}
export function MeRiel({ v, onCta }: { v: Me; onCta: () => void }) {
  const { E2 } = v;
  return (
    <div data-screen-label="Ficha · pedido del mercado · columna" className="flex flex-col gap-4 rounded-[22px] border border-ink/10 bg-white p-[22px] shadow-[0_24px_48px_-34px_rgba(11,14,18,.45)]">
      <div className="font-display text-[26px] font-extrabold leading-none tracking-[-0.04em]">{v.mio && v.tot.n ? `${E2("Estimado ", "Estimate ")}${money(v.tot.est)}` : v.ord ? E2("Pide para pickup", "Order for pickup") : E2("Ve directo", "Walk in")}</div>
      <div className="grid grid-cols-3 gap-2">
        {v.riel.map((m) => <div key={m.k} className="min-w-0 rounded-[14px] bg-paper px-2.5 py-[11px]"><div className="font-mono text-[8.5px] font-bold tracking-[0.1em] text-ink/45">{m.k}</div><div className="mt-1.5 text-[12.5px] font-bold leading-[1.3]">{m.v}</div></div>)}
      </div>
      <div className="text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/60">{`${v.linea}${v.ord ? E2(" Pides aquí; se cobra lo que pesó.", " Order here; you pay what it weighed.") : ""}`}</div>
      <div className="flex">{v.ord ? (v.mio && v.tot.n ? <Button icon="bag" block onClick={v.verPedido}>{E2("Ver pedido", "View order")}</Button> : <Button icon="bag" block onClick={onCta}>{E2("Ordenar", "Order")}</Button>) : <Button icon="pin" block onClick={v.llegar}>{E2("Cómo llegar", "Directions")}</Button>}</div>
    </div>
  );
}
export function MeBarra({ v, onCta }: { v: Me; onCta: () => void }) {
  const { E2 } = v;
  if (v.hoja) return null;
  const hay = !!v.mio && v.tot.n > 0;
  return (
    <div data-screen-label="Ficha · barra del mercado" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-paper/95 px-5 pb-[22px] pt-[13px] backdrop-blur-[14px] lg:hidden">
      {v.aviso && <div role="status" className="absolute inset-x-5 -top-12 rounded-[14px] bg-ink px-3.5 py-2.5 text-center text-[12.5px] font-bold text-white">{v.aviso}</div>}
      <div className="min-w-0 flex-1">
        <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.02em]">{hay ? `${E2("Estimado ", "Estimate ")}${money(v.tot.est)}` : v.ord ? E2("Pide para pickup", "Order for pickup") : E2("Ve directo", "Walk in")}</div>
        <div className="mt-1.5 truncate font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{`${v.riel[0]!.k} · ${v.riel[0]!.v}`.toUpperCase()}</div>
      </div>
      {v.ord ? <Button icon="bag" onClick={hay ? v.verPedido : onCta}>{hay ? E2("Ver pedido", "View order") : E2("Ordenar", "Order")}</Button> : <Button icon="pin" onClick={v.llegar}>{E2("Cómo llegar", "Directions")}</Button>}
    </div>
  );
}
