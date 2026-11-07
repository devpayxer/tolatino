"use client";
/* Ficha · Tienda (diseño neg-hogar-book.js / neg-auto-book.js › V.shop y la pestaña «Ficha · tienda» del prototipo): la
   nota de cómo se aparta; en gomas, los filtros «Para tu …», medidas, nuevas y usadas; la cuadrícula con foto, etiqueta
   (RENTA · NUEVA · USADA), precio, cuántos quedan y «Apartar». Lo que se renta va a Rentar (4f-2); lo que se vende abre la
   hoja del artículo (TLTiendaL.sheetVals: ¿cuántos?, «Apartar no cobra nada…») y entra a Tu apartado (el apartado de
   Tiendas, 4f-3). La tarjeta «Tu apartado» y la barra llevan a /n/{id}/apartar. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import type { ArticuloVenta } from "@/lib/apartados";
import type { ArticuloRenta } from "@/lib/rentas";
import { cuotas, type ReglaPlan } from "@/lib/layaway-comun";

type N = "Button" | "Tag" | "Chip" | "Icon" | "OptionGroup" | "DepositNote" | "ReservationCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Button, Tag, Chip, Icon, OptionGroup, DepositNote, ReservationCard } = UI as unknown as Record<N, ComponentType<any>>;
const dinero = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
export type Carrito = { item: string; qty: number; v?: string }[];
export const llaveLinea = (l: { item: string; v?: string }) => `${l.item}:${l.v ?? ""}`;
export const claveCarrito = (negocio: string) => `tl-apartado-${negocio}`;
export function leerCarrito(negocio: string): Carrito { try { const x = JSON.parse(localStorage.getItem(claveCarrito(negocio)) ?? "[]"); return Array.isArray(x) ? x.filter((l) => typeof l?.item === "string" && Number.isInteger(l?.qty) && (l.v === undefined || typeof l.v === "string")).slice(0, 10) : []; } catch { return []; } }
export function guardarCarrito(negocio: string, c: Carrito) { try { if (c.length) localStorage.setItem(claveCarrito(negocio), JSON.stringify(c)); else localStorage.removeItem(claveCarrito(negocio)); } catch { /* sin almacenamiento: el carrito vive en la pantalla */ } }
type Mia = { abiertos: { numero: string; st: string; n: number; tot: number }[]; goma: { modelo: string; size: string } | null };

/* Una línea del carrito sigue valiendo si el artículo sigue a la venta y, si tiene tallas, la talla existe. */
export const lineaValida = (V: ArticuloVenta[], l: { item: string; v?: string }) => { const a = V.find((x) => x.id === l.item); return !!a && (a.tallas.length ? a.tallas.some((t) => t.id === l.v) : !l.v); };
export function TiendaTab({ L, V, negocio, es, mia, auto, tienda = false, horas = 48, plan = null }: { L: ArticuloRenta[]; V: ArticuloVenta[]; negocio: string; es: boolean; mia: Mia; auto: boolean; tienda?: boolean; horas?: number; plan?: ReglaPlan | null }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter(), nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const [carro, setCarro] = useState<Carrito>([]), [hoja, setHoja] = useState<ArticuloVenta | null>(null), [qi, setQi] = useState(0), [ti, setTi] = useState<number | null>(null);
  const gomas = V.some((x) => x.size), [fSize, setFSize] = useState<"mine" | "all">(mia.goma && gomas ? "mine" : "all"), [fCond, setFCond] = useState<"all" | "n" | "u">("all");
  useEffect(() => { setCarro(leerCarrito(negocio).filter((l) => lineaValida(V, l))); }, [negocio, V]);
  const mine = fSize === "mine" && mia.goma;
  const ventas = V.filter((x) => !x.size || ((!mine || x.size === mia.goma!.size) && (fCond === "all" || x.cond === fCond)));
  const sinGoma = gomas && !ventas.some((x) => x.size);
  const nC = carro.reduce((s, l) => s + l.qty, 0), totC = carro.reduce((s, l) => s + (V.find((x) => x.id === l.item)?.precio ?? 0) * l.qty, 0);
  // Lo que va en plan se aparta solo (con su acuerdo): al agregarlo se quita lo demás, y al revés.
  const esPlan = (id: string) => V.find((x) => x.id === id)?.k === "plan";
  const agregar = (a: ArticuloVenta, q: number, v?: string) => { const n = { item: a.id, qty: q, ...(v ? { v } : {}) }; const c = [...carro.filter((l) => llaveLinea(l) !== llaveLinea(n) && esPlan(l.item) === (a.k === "plan") && a.k !== "plan"), n].slice(-10); setCarro(c); guardarCarrito(negocio, c); setHoja(null); };
  const H = `${horas}`, enCarro = (a: ArticuloVenta) => carro.filter((l) => l.item === a.id).reduce((s, l) => s + l.qty, 0);
  const ab = mia.abiertos[0];
  const nota = tienda ? E2(`El precio que ves es el que pagas en la caja. Apartar no cobra nada: te lo guardan ${H} horas y pagas en la caja lo mismo que ves aquí.`, `The price you see is the price you pay at the register. Holding costs nothing: they keep it ${H} hours and you pay at the register the same as you see here.`)
    : L.length ? E2("Apartas en la app y pagas al recoger en el local; te lo guardan 48 horas. Herramienta: pagas el día y dejas un depósito que se devuelve al traerla.", "Hold it in the app and pay at pickup; kept for 48 hours. Tools: pay the day and leave a deposit, returned when you bring it back.")
    : gomas ? E2("Precio por goma instalada: montaje, balanceo, válvula y desecho de la vieja. Apartas en la app y pagas al recogerla; te la guardan 48 horas.", "Price per installed tire: mounting, balancing, valve and old tire disposal. Hold it in the app and pay at pickup; kept for 48 hours.")
      : auto ? E2("Apartas en la app y pagas al recogerlo en el taller. Te lo guardan 48 horas.", "Hold it in the app and pay at pickup. Kept for 48 hours.")
        : E2("Apartas en la app y pagas al recoger en el local. Te lo guardan 48 horas. Lo que dice \"instalado\" incluye la visita.", "Hold it in the app and pay at pickup. Kept for 48 hours. \"Installed\" includes the visit.");
  const tarjeta = (x: { id: string; n: { es: string; en: string }; d: { es: string; en: string }; foto: string | null; quedan: number }, precio: string, tag: { t: string; tone: string } | null, onClick: () => void, renta: boolean, ya = 0) => {
    const pocos = x.quedan <= 3, agotado = x.quedan < 1;
    return (
      <div key={x.id} className="flex min-w-0 flex-col gap-2">
        <div className="aspect-square rounded-[14px] bg-photo-bg" style={x.foto ? { backgroundImage: `url(${x.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} role="img" aria-label={nm(x.n)} />
        <div className="min-w-0">
          {tag && <div className="mb-[5px] flex"><Tag tone={tag.tone}>{tag.t}</Tag></div>}
          <div className="text-[13.5px] font-bold leading-[1.3]">{nm(x.n)}</div>
          {nm(x.d) && <div className="mt-0.5 text-[11.5px] font-medium leading-[1.4] text-ink/55">{nm(x.d)}</div>}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-[15px] font-extrabold leading-none tracking-[-0.02em]">{precio}</span>
          <span className="text-right font-mono text-[9.5px] font-bold leading-[1.2] tracking-[0.08em]" style={{ color: pocos ? "var(--tl-pro-ink)" : "var(--tl-open-text)" }}>{agotado ? (renta ? E2("RENTADAS HOY", "ALL OUT") : E2("AGOTADO", "SOLD OUT")) : pocos ? `${E2("QUEDAN ", "ONLY ")}${x.quedan}${renta ? E2(" PARA RENTAR", " TO RENT") : ""}` : E2("EN EXISTENCIA", "IN STOCK")}</span>
        </div>
        {ya > 0 && <div className="font-mono text-[9.5px] font-bold tracking-[0.08em] text-action">{`${E2("APARTADO: ", "ON HOLD: ")}${ya}`}</div>}
        <div className="grid"><Button variant="secondary" size="sm" block disabled={agotado} aria-label={`${E2("Apartar", "Hold")} ${nm(x.n)}`} onClick={onClick}>{E2("Apartar", "Hold")}</Button></div>
      </div>
    );
  };
  return (
    <div data-screen-label="Ficha · tienda" className={`flex flex-col gap-4 px-5 pt-5 lg:px-0 lg:pt-8 ${nC ? "pb-[120px] lg:pb-6" : "pb-6"}`}>
      {ab && <div className="grid lg:max-w-[460px]"><ReservationCard label={E2("TU APARTADO", "YOUR HOLD")} tag={ab.st === "confirmed" ? E2("GUARDADO", "HELD") : ab.st === "change_proposed" ? E2("FALTA ALGO", "ITEM MISSING") : E2("ENVIADO", "SENT")} tone={ab.st === "confirmed" ? "signal" : "action"}
        title={`${ab.n} ${ab.n === 1 ? E2("artículo", "item") : E2("artículos", "items")} · ${dinero(ab.tot)}`} sub="" onClick={() => router.push(`/apartado/${ab.numero}`)} /></div>}
      <div className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{nota}</div>
      {gomas && (
        <div className="hs flex gap-2 overflow-x-auto">
          {mia.goma ? <Chip variant={mine ? "selected" : "filter"} onClick={() => setFSize("mine")}>{`${E2("Para tu ", "For your ")}${mia.goma.modelo} · ${mia.goma.size}`}</Chip> : <Chip variant="feature" onClick={() => router.push(`/n/${negocio}?tab=svc`)}>{E2("Agrega tu vehículo", "Add your vehicle")}</Chip>}
          <Chip variant={!mine ? "selected" : "filter"} onClick={() => setFSize("all")}>{E2("Todas las medidas", "All sizes")}</Chip>
          <Chip variant={fCond === "n" ? "selected" : "filter"} onClick={() => setFCond(fCond === "n" ? "all" : "n")}>{E2("Nuevas", "New")}</Chip>
          <Chip variant={fCond === "u" ? "selected" : "filter"} onClick={() => setFCond(fCond === "u" ? "all" : "u")}>{E2("Usadas", "Used")}</Chip>
        </div>
      )}
      {sinGoma && (
        <div className="flex flex-col items-start gap-1.5 rounded-[17px] border border-ink/[.08] bg-white px-4 py-[18px]">
          <div className="font-display text-[15px] font-extrabold leading-[1.25] tracking-[-0.02em]">{mine ? E2(`Hoy no hay gomas ${mia.goma!.size}`, `No ${mia.goma!.size} tires today`) : E2("No hay gomas con ese filtro", "No tires with that filter")}</div>
          <div className="text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2("Pregunta al taller: las consiguen en uno o dos días.", "Ask the shop: they can get them in a day or two.")}</div>
          <div className="mt-1.5 flex"><Button variant="secondary" size="sm" onClick={() => { setFSize("all"); setFCond("all"); }}>{E2("Ver todas", "See all")}</Button></div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-4 lg:gap-x-5">
        {L.map((x) => tarjeta({ ...x }, `${dinero(x.precio)}${E2("/día", "/day")}`, { t: E2("RENTA", "RENTAL"), tone: "signal" }, () => router.push(`/n/${negocio}/rentar?a=${x.id}`), true))}
        {ventas.map((x) => x.k === "plan" && !plan ? null : tarjeta(x, dinero(x.precio), x.k === "plan" && plan ? { t: `${E2("ABONO", "DOWN")} ${plan.pct} % · ${plan.n} ${E2("PAGOS", "PAYMENTS")}`, tone: "signal" } : x.cond ? { t: x.cond === "u" ? E2("USADA", "USED") : E2("NUEVA", "NEW"), tone: x.cond === "u" ? "neutral" : "signal" } : null, () => { const l = carro.find((z) => z.item === x.id); setQi(Math.max(0, (l?.qty ?? 1) - 1)); const k = x.tallas.findIndex((t) => t.id === l?.v); setTi(k >= 0 ? k : x.tallas.length === 1 && x.tallas[0]!.quedan > 0 ? 0 : null); setHoja(x); }, false, enCarro(x)))}
      </div>
      {nC > 0 && (
        <div data-screen-label="Tienda · tu apartado" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-paper/95 px-5 pb-[22px] pt-[13px] backdrop-blur-[14px] lg:static lg:mt-2 lg:max-w-[460px] lg:rounded-[18px] lg:border lg:bg-white lg:p-4">
          <div className="min-w-0 flex-1">
            <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.02em]">{`${dinero(totC)}${E2(" en la caja", " at the register")}`}</div>
            <div className="mt-1.5 truncate font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{`${E2("TU APARTADO · ", "YOUR HOLD · ")}${nC} ${nC === 1 ? E2("ARTÍCULO", "ITEM") : E2("ARTÍCULOS", "ITEMS")} · ${E2("HOY NO SE COBRA NADA", "NOTHING TODAY")}`}</div>
          </div>
          <Button icon="bag" onClick={() => router.push(`/n/${negocio}/apartar`)}>{E2("Ver apartado", "View hold")}</Button>
        </div>
      )}
      {hoja && (() => {
        const tl = ti != null ? hoja.tallas[ti] ?? null : null, tq = hoja.tallas.length ? (tl?.quedan ?? 3) : hoja.quedan;
        const enPlan = hoja.k === "plan" && !!plan, q = [1, 2, 3].filter((n) => n <= Math.max(1, tq) && (!enPlan || n === 1)), qv = q[Math.min(qi, q.length - 1)]!, falta = hoja.tallas.length > 0 && !tl;
        const cu = enPlan ? cuotas(hoja.precio, plan!) : null, otros = carro.some((l) => esPlan(l.item) !== enPlan || (enPlan && l.item !== hoja.id));
        const tit = hoja.label ? nm(hoja.label) : E2("Talla", "Size");
        return (
          <div data-screen-label="Tienda · artículo" className="fixed inset-0 z-[60]">
            <div onClick={() => setHoja(null)} className="absolute inset-0 bg-ink/50" />
            <div role="dialog" aria-modal="true" aria-label={nm(hoja.n)} className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col overflow-hidden rounded-t-[26px] bg-white lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[86vh] lg:w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
              <div className="flex-1 overflow-y-auto">
                <div className="relative h-[220px] flex-none bg-photo-bg" style={hoja.foto ? { backgroundImage: `url(${hoja.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                  <div className="absolute left-1/2 top-2.5 -ml-[19px] h-1 w-[38px] rounded-[9px] bg-white/85 lg:hidden" />
                  <button type="button" aria-label={E2("Cerrar", "Close")} onClick={() => setHoja(null)} className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-xl bg-white/[.94]"><Icon name="close" size={15} strokeWidth={2.4} /></button>
                </div>
                <div className="px-5 pb-6 pt-[18px]">
                  <div className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.035em]">{nm(hoja.n)}</div>
                  <div className="mt-[9px] flex flex-wrap items-center gap-2.5"><span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">{dinero(hoja.precio)}</span>
                    <span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/50">{hoja.quedan <= 3 ? `${E2("QUEDAN ", "ONLY ")}${hoja.quedan}` : E2("EN EXISTENCIA", "IN STOCK")}</span></div>
                  {nm(hoja.d) && <p className="mt-2.5 text-pretty text-[13px] leading-[1.6] text-ink/65">{nm(hoja.d)}</p>}
                  {hoja.tallas.length > 0 && <div className="mt-5 grid"><OptionGroup title={tit} meta={E2("ELIGE 1", "CHOOSE 1")} required done={!falta} reqLabel={E2("Elige: ", "Choose: ")} doneLabel={E2("Listo", "Done")}
                    options={hoja.tallas.map((t, i) => ({ label: t.label, price: t.quedan < 1 ? E2("Agotada", "Sold out") : t.quedan <= 2 ? `${E2("quedan ", "")}${t.quedan}${E2("", " left")}` : "", selected: i === ti, disabled: t.quedan < 1 }))} onToggle={(i: number) => { if (hoja.tallas[i]!.quedan > 0) { setTi(i); setQi(0); } }} /></div>}
                  <div className="mt-5 grid"><OptionGroup title={E2("¿Cuántos?", "How many?")} meta={E2("ELIGE 1", "CHOOSE 1")} required done reqLabel={E2("Elige: ", "Choose: ")} doneLabel={E2("Listo", "Done")}
                    options={q.map((n, i) => ({ label: String(n), price: dinero(hoja.precio * n), selected: i === Math.min(qi, q.length - 1) }))} onToggle={(i: number) => setQi(i)} /></div>
                  <div className="mt-[18px] grid"><DepositNote>{cu ? E2(`Plan: hoy se retiene el abono de ${dinero(cu.abono)} (${plan!.pct} %) y el resto en ${plan!.n} pagos de ${dinero(cu.pagos[0]!)}, uno cada ${plan!.cada} días, sin intereses. Te lo entregan al terminar de pagar.`, `Layaway: the ${dinero(cu.abono)} down payment (${plan!.pct}%) is held today and the rest in ${plan!.n} payments of ${dinero(cu.pagos[0]!)}, one every ${plan!.cada} days, no interest. You get it when fully paid.`)
                    : `${E2(`Apartar no cobra nada. Te lo guardan ${H} horas y pagas ${dinero(hoja.precio * qv)} en la caja.`, `Holding costs nothing. They keep it ${H} hours and you pay ${dinero(hoja.precio * qv)} at the register.`)} ${E2("El precio que ves es el que pagas en la caja.", "The price you see is the price you pay at the register.")}`}</DepositNote></div>
                  {otros && <div className="mt-2.5 text-pretty text-[12px] font-semibold leading-[1.45] text-pro-ink">{E2("Lo que va en plan se aparta solo: se quita lo demás de tu apartado.", "Layaway items are held on their own: the rest leaves your hold.")}</div>}
                </div>
              </div>
              <div className="flex flex-none items-center gap-3.5 border-t border-ink/[.08] bg-white px-4 pb-[22px] pt-3 lg:pb-4">
                <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{cu ? E2("ABONO HOY", "DOWN TODAY") : E2("EN LA CAJA", "AT THE REGISTER")}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{dinero(cu ? cu.abono : hoja.precio * qv)}</div></div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5"><div className="flex"><Button block disabled={falta} onClick={() => agregar(hoja, qv, tl?.id)}>{E2("Apartar", "Hold")}</Button></div>
                  {falta && <div className="text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-pro-ink">{`${E2("ELIGE LA ", "CHOOSE THE ")}${tit.toUpperCase()}`}</div>}</div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
