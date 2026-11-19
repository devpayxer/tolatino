"use client";
/* Ficha · Tienda (diseño neg-hogar-book.js / neg-auto-book.js › V.shop y la pestaña «Ficha · tienda» del prototipo): la
   nota de cómo se aparta; en gomas, los filtros «Para tu …», medidas, nuevas y usadas; la cuadrícula con foto, etiqueta
   (RENTA · NUEVA · USADA), precio, cuántos quedan y «Apartar». Lo que se renta va a Rentar (4f-2); lo que se vende abre la
   hoja del artículo (TLTiendaL.sheetVals: ¿cuántos?, «Apartar no cobra nada…») y entra a Tu apartado (el apartado de
   Tiendas, 4f-3). La tarjeta «Tu apartado» y la barra llevan a /n/{id}/apartar. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { ArticuloVenta } from "@/lib/apartados";
import type { ArticuloRenta } from "@/lib/rentas";
import { cuotas, type ReglaPlan } from "@/lib/layaway-comun";
import { PrecioAntes } from "./PrecioAntes";
import { dosIdiomas } from "@/lib/dos-idiomas";
import { CorazonGuardar, useGuardados } from "./Corazon";

type N = "Button" | "Tag" | "Chip" | "Icon" | "OptionGroup" | "DepositNote" | "ReservationCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Button, Tag, Chip, Icon, OptionGroup, DepositNote, ReservationCard, MenuTile, MenuItemRow, OrderBar } = UI as unknown as Record<N | "MenuTile" | "MenuItemRow" | "OrderBar", ComponentType<any>>;
const dinero = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
export type Carrito = { item: string; qty: number; v?: string }[];
export const llaveLinea = (l: { item: string; v?: string }) => `${l.item}:${l.v ?? ""}`;
export const claveCarrito = (negocio: string) => `tl-apartado-${negocio}`;
export function leerCarrito(negocio: string): Carrito { try { const x = JSON.parse(localStorage.getItem(claveCarrito(negocio)) ?? "[]"); return Array.isArray(x) ? x.filter((l) => typeof l?.item === "string" && Number.isInteger(l?.qty) && (l.v === undefined || typeof l.v === "string")).slice(0, 10) : []; } catch { return []; } }
export function guardarCarrito(negocio: string, c: Carrito) { try { if (c.length) localStorage.setItem(claveCarrito(negocio), JSON.stringify(c)); else localStorage.removeItem(claveCarrito(negocio)); } catch { /* sin almacenamiento: el carrito vive en la pantalla */ } }
type Mia = { abiertos: { numero: string; st: string; n: number; tot: number }[]; goma: { modelo: string; size: string } | null };

/* Una línea del carrito sigue valiendo si el artículo sigue a la venta y, si tiene tallas, la talla existe. */
export const lineaValida = (V: ArticuloVenta[], l: { item: string; v?: string }) => { const a = V.find((x) => x.id === l.item); return !!a && (a.tallas.length ? a.tallas.some((t) => t.id === l.v) : !l.v); };
/* C-008 · `c`: el menú «C» de la ficha nueva para las Tiendas (canvas «Menú con fotos»): «Lo más pedido» (`pop`, de verdad: lo que el negocio fija y lo
   más apartado en 30 días), cada artículo en su tarjeta con foto y +, y en el teléfono la barra negra «Ver lo que apartas». El + aparta directo lo que
   no tiene talla ni va en plan; lo demás abre la hoja de siempre. «Ver lo que apartas» lleva al apartado de siempre (pagas al recoger). */
export function TiendaTab({ L, V, negocio, es, mia, auto, tienda = false, horas, plan = null, c = false, pop = [], guardados, sesion = false, abrirInicial }: { L: ArticuloRenta[]; V: ArticuloVenta[]; negocio: string; es: boolean; mia: Mia; auto: boolean; tienda?: boolean; horas: number; plan?: ReglaPlan | null; c?: boolean; pop?: string[]; guardados?: string[]; sesion?: boolean; abrirInicial?: string }) {
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b), router = useRouter(), nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const [carro, setCarro] = useState<Carrito>([]), [hoja, setHoja] = useState<ArticuloVenta | null>(null), [qi, setQi] = useState(0), [ti, setTi] = useState<number | null>(null);
  const gomas = V.some((x) => x.size), [fSize, setFSize] = useState<"mine" | "all">(mia.goma && gomas ? "mine" : "all"), [fCond, setFCond] = useState<"all" | "n" | "u">("all");
  useEffect(() => { setCarro(leerCarrito(negocio).filter((l) => lineaValida(V, l))); }, [negocio, V]);
  // 9t · Productos guardados (./Corazon): sin sesión, a entrar y de vuelta a la hoja de ese artículo (?tab=shop&producto=); el aviso, abajo de la hoja.
  const gd = useGuardados(guardados, sesion, (id) => `/n/${negocio}?tab=shop&producto=${id}`, es), [avisoG, setAvisoG] = useState<string | null>(null);
  const guardar = (id: string) => { void gd.cambiar(id).then((x) => { if (x) { setAvisoG(x); setTimeout(() => setAvisoG(null), 2600); } }); };
  const mine = fSize === "mine" && mia.goma;
  const ventas = V.filter((x) => !x.size || ((!mine || x.size === mia.goma!.size) && (fCond === "all" || x.cond === fCond)));
  const sinGoma = gomas && !ventas.some((x) => x.size);
  const nC = carro.reduce((s, l) => s + l.qty, 0), totC = carro.reduce((s, l) => s + (V.find((x) => x.id === l.item)?.precio ?? 0) * l.qty, 0);
  // Lo que va en plan se aparta solo (con su acuerdo): al agregarlo se quita lo demás, y al revés.
  const esPlan = (id: string) => V.find((x) => x.id === id)?.k === "plan";
  const agregar = (a: ArticuloVenta, q: number, v?: string) => { const n = { item: a.id, qty: q, ...(v ? { v } : {}) }; const c = [...carro.filter((l) => llaveLinea(l) !== llaveLinea(n) && esPlan(l.item) === (a.k === "plan") && a.k !== "plan"), n].slice(-10); setCarro(c); guardarCarrito(negocio, c); setHoja(null); };
  const H = `${horas}`, enCarro = (a: ArticuloVenta) => carro.filter((l) => l.item === a.id).reduce((s, l) => s + l.qty, 0);
  const ab = mia.abiertos[0];
  const abrir = (x: ArticuloVenta) => { const l = carro.find((z) => z.item === x.id); setQi(Math.max(0, (l?.qty ?? 1) - 1)); const k = x.tallas.findIndex((t) => t.id === l?.v); setTi(k >= 0 ? k : x.tallas.length === 1 && x.tallas[0]!.quedan > 0 ? 0 : null); setHoja(x); };
  // 9t · ?producto=<id> (de vuelta de entrar, o «Apartar» en Mi cuenta › Guardados): la hoja de ese artículo se abre una vez, si la tienda lo vende.
  const abiertoIni = useRef(false);
  useEffect(() => { if (abiertoIni.current || !abrirInicial) return; abiertoIni.current = true; const x = V.find((z) => z.id === abrirInicial); if (x && !(x.k === "plan" && !plan)) abrir(x); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const directo = (x: ArticuloVenta) => !x.tallas.length && x.k !== "plan" && x.quedan > 0;
  const mas = (x: ArticuloVenta) => { const q = enCarro(x); if (directo(x) && q < Math.min(3, x.quedan)) agregar(x, q + 1); else abrir(x); };
  const menos = (x: ArticuloVenta) => { const q = enCarro(x); if (directo(x) && q > 1) agregar(x, q - 1); else { const c2 = carro.filter((l) => l.item !== x.id); setCarro(c2); guardarCarrito(negocio, c2); } };
  const nota = tienda ? E2(`El precio que ves es el que pagas en la caja. Apartar no cobra nada: te lo guardan ${H} horas y pagas en la caja lo mismo que ves aquí.`, `The price you see is the price you pay at the register. Holding costs nothing: they keep it ${H} hours and you pay at the register the same as you see here.`)
    : L.length ? E2(`Apartas en la app y pagas al recoger en el local; te lo guardan ${H} horas. Herramienta: pagas el día y dejas un depósito que se devuelve al traerla.`, `Hold it in the app and pay at pickup; kept for ${H} hours. Tools: pay the day and leave a deposit, returned when you bring it back.`)
    : gomas ? E2(`Precio por goma instalada: montaje, balanceo, válvula y desecho de la vieja. Apartas en la app y pagas al recogerla; te la guardan ${H} horas.`, `Price per installed tire: mounting, balancing, valve and old tire disposal. Hold it in the app and pay at pickup; kept for ${H} hours.`)
      : auto ? E2(`Apartas en la app y pagas al recogerlo en el taller. Te lo guardan ${H} horas.`, `Hold it in the app and pay at pickup. Kept for ${H} hours.`)
        : E2(`Apartas en la app y pagas al recoger en el local. Te lo guardan ${H} horas. Lo que dice "instalado" incluye la visita.`, `Hold it in the app and pay at pickup. Kept for ${H} hours. "Installed" includes the visit.`);
  // 9n · `antes`: el precio de siempre cuando una oferta en vivo de Novedades lo baja (x.was, del servidor); sale tachado al lado del de la oferta.
  const tarjeta = (x: { id: string; n: { es: string; en: string }; d: { es: string; en: string }; foto: string | null; quedan: number }, precio: string, tag: { t: string; tone: string } | null, onClick: () => void, renta: boolean, ya = 0, antes: number | null = null) => {
    const pocos = x.quedan <= 3, agotado = x.quedan < 1;
    return (
      <div key={x.id} className="flex min-w-0 flex-col gap-2">
        <div className="aspect-square rounded-[14px] bg-photo-bg" style={x.foto ? { backgroundImage: `url(${x.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} role="img" aria-label={nm(x.n)} />
        <div className="min-w-0">
          {tag && <div className="mb-[5px] flex"><Tag tone={tag.tone}>{tag.t}</Tag></div>}
          <div className="text-[13.5px] font-bold leading-[1.3]">{nm(x.n)}</div>
          {nm(x.d) && <div className="mt-0.5 text-[11.5px] font-medium leading-[1.4] text-ink/60">{nm(x.d)}</div>}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1"><span className="font-display text-[15px] font-extrabold leading-none tracking-[-0.02em]">{precio}</span>{antes != null && <PrecioAntes t={dinero(antes)} es={es} tachado />}</span>
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
      {c ? (
        <>
          {L.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-4 lg:gap-x-5">{L.map((x) => tarjeta({ ...x }, `${dinero(x.precio)}${E2("/día", "/day")}`, { t: E2("RENTA", "RENTAL"), tone: "signal" }, () => router.push(`/n/${negocio}/rentar?a=${x.id}`), true))}</div> : null}
          {pop.length ? (
            <div data-screen-label="Ficha · tienda · lo más pedido">
              <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.03em]">{E2("Lo más pedido", "Most ordered")}</div>
              <div className="hs -mx-5 mt-3 flex gap-2.5 overflow-x-auto px-5 pb-1.5 lg:mx-0 lg:px-0">
                {pop.map((id) => V.find((x) => x.id === id)).filter((x): x is ArticuloVenta => !!x).map((x) => (
                  <MenuTile key={x.id} lang={es ? "ES" : "EN"} name={nm(x.n)} price={dinero(x.precio)} was={x.was != null ? <PrecioAntes t={dinero(x.was)} es={es} /> : null} image={x.foto ?? undefined} qty={enCarro(x)} off={x.quedan < 1} width={156} height={124}
                    onOpen={() => abrir(x)} onPlus={() => mas(x)} onMinus={() => menos(x)} onExpand={() => abrir(x)} />))}
              </div>
            </div>) : null}
          <div data-menu="c" className="flex flex-col gap-2.5 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
            {ventas.map((x) => x.k === "plan" && !plan ? null : (
              <div key={x.id} className="grid min-w-0">
                <MenuItemRow lang={es ? "ES" : "EN"} card name={nm(x.n)} desc={nm(x.d) || undefined} price={dinero(x.precio)} was={x.was != null ? <PrecioAntes t={dinero(x.was)} es={es} /> : null} image={x.foto ?? undefined} qty={enCarro(x)} off={x.quedan < 1}
                  tags={[x.quedan < 1 ? { label: E2("AGOTADO", "SOLD OUT"), tone: "neutral" } : x.quedan <= 3 ? { label: `${E2("QUEDAN ", "ONLY ")}${x.quedan}`, tone: "pro" } : null,
                    x.k === "plan" && plan ? { label: `${E2("ABONO", "DOWN")} ${plan.pct} % · ${plan.n} ${E2("PAGOS", "PAYMENTS")}`, tone: "signal" } : null,
                    x.cond ? { label: x.cond === "u" ? E2("USADA", "USED") : E2("NUEVA", "NEW"), tone: x.cond === "u" ? "neutral" : "signal" } : null,
                    x.tallas.length ? { label: nm(x.label ?? { es: "Tallas", en: "Sizes" }).toUpperCase(), tone: "neutral" } : null].filter(Boolean)}
                  onOpen={() => abrir(x)} onPlus={() => mas(x)} onMinus={() => menos(x)} onExpand={() => abrir(x)} />
              </div>))}
          </div>
        </>
      ) : (
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-4 lg:gap-x-5">
        {L.map((x) => tarjeta({ ...x }, `${dinero(x.precio)}${E2("/día", "/day")}`, { t: E2("RENTA", "RENTAL"), tone: "signal" }, () => router.push(`/n/${negocio}/rentar?a=${x.id}`), true))}
        {ventas.map((x) => x.k === "plan" && !plan ? null : tarjeta(x, dinero(x.precio), x.k === "plan" && plan ? { t: `${E2("ABONO", "DOWN")} ${plan.pct} % · ${plan.n} ${E2("PAGOS", "PAYMENTS")}`, tone: "signal" } : x.cond ? { t: x.cond === "u" ? E2("USADA", "USED") : E2("NUEVA", "NEW"), tone: x.cond === "u" ? "neutral" : "signal" } : null, () => abrir(x), false, enCarro(x), x.was))}
      </div>
      )}
      {c && nC > 0 ? (
        <div data-screen-label="Tienda · ver lo que apartas" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-[14px] lg:hidden">
          <OrderBar label={`${E2("Ver lo que apartas", "View your hold")} · ${nC} ${nC === 1 ? E2("artículo", "item") : E2("artículos", "items")}`} sub={`${E2("TE LO GUARDAN ", "KEPT FOR ")}${H} H · ${E2("PAGAS AL RECOGER", "PAY AT PICKUP")}`}
            total={dinero(totC)} onClick={() => router.push(`/n/${negocio}/apartar`)} />
        </div>) : null}
      {nC > 0 && (
        <div data-screen-label="Tienda · tu apartado" className={`${c ? "hidden lg:flex" : "flex"} fixed inset-x-0 bottom-0 z-30 items-center gap-3 border-t border-line bg-paper/95 px-5 pb-[22px] pt-[13px] backdrop-blur-[14px] lg:static lg:mt-2 lg:max-w-[460px] lg:rounded-[18px] lg:border lg:bg-white lg:p-4`}>
          <div className="min-w-0 flex-1">
            <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.02em]">{`${dinero(totC)}${E2(" en la caja", " at the register")}`}</div>
            <div className="mt-1.5 truncate font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/60">{`${E2("TU APARTADO · ", "YOUR HOLD · ")}${nC} ${nC === 1 ? E2("ARTÍCULO", "ITEM") : E2("ARTÍCULOS", "ITEMS")} · ${E2("HOY NO SE COBRA NADA", "NOTHING TODAY")}`}</div>
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
                  <div className="mt-[9px] flex flex-wrap items-center gap-2.5"><span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">{dinero(hoja.precio)}</span>{hoja.was != null && <PrecioAntes t={dinero(hoja.was)} es={es} tachado />}
                    <span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/60">{hoja.quedan <= 3 ? `${E2("QUEDAN ", "ONLY ")}${hoja.quedan}` : E2("EN EXISTENCIA", "IN STOCK")}</span></div>
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
              {avisoG && <div role="status" className="mx-4 mb-2 rounded-[13px] bg-ink px-3.5 py-[11px] text-[12.5px] font-bold text-white">{avisoG}</div>}
              <div className="flex flex-none items-center gap-3.5 border-t border-ink/[.08] bg-white px-4 pb-[22px] pt-3 lg:pb-4">
                <CorazonGuardar etiqueta={E2("Guardar producto", "Save product")} guardado={gd.guardado(hoja.id)} onClick={() => guardar(hoja.id)} />
                <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/60">{cu ? E2("ABONO HOY", "DOWN TODAY") : E2("EN LA CAJA", "AT THE REGISTER")}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{dinero(cu ? cu.abono : hoja.precio * qv)}</div></div>
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
