"use client";
/* Ficha de Fiestas y «Tu fecha» (4u · prototipo neg-fiesta-listing.js listingAdd L225–267, sheetVals L268–279, fechaVals
   L193–205, resAdd L280–286). Tesis: ¿esa fecha está libre? La línea fija «La fecha no es tuya hasta que te la confirmen.»
   va en la pestaña, la hoja, el Resumen, el riel y Tu fecha. El calendario es el real (fechas ocupadas derivadas en el
   servidor); el teléfono solo muestra. Guardar tu fecha no aparta nada. Compuesto con el sistema de diseño (Button, Chip,
   Icon). Hueco del diseño: «Otra fecha» con el selector de fecha del teléfono (REVISION). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ComponentType, type MouseEvent } from "react";
import { diaFiesta, dispoFiesta, EVT, findes, GUESTS, LINEA_FIESTA, metaFiesta, precioFiesta, sumarDias, tuFechaValida, WHERE, type SvcFiesta, type TuFecha } from "@/lib/fiestas-comun";
import type { FiestaPublico } from "@/lib/fiestas-publico";
import { tuFechaGuardar } from "./acciones-fiesta";
import { abrirComoLlegar } from "@/lib/como-llegar";

type N = "Icon" | "Button" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip } = UI as unknown as Record<N, ComponentType<any>>;
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});
const stop = (e?: MouseEvent) => e?.stopPropagation();
const K = "font-mono text-[10px] font-bold tracking-[0.18em] text-ink/45";
const usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
const LLAVE = "tl.tuFecha";
const leerLocal = (): TuFecha | null => { try { const x = JSON.parse(localStorage.getItem(LLAVE) ?? "null"); return tuFechaValida(x) ? x : null; } catch { return null; } };
const guardarLocal = (f: TuFecha) => { try { localStorage.setItem(LLAVE, JSON.stringify(f)); } catch { /* sin almacenamiento: solo esta vista */ } };

export function useFiesta(fp: FiestaPublico | null, es: boolean, pro: boolean) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [hoja, setHoja] = useState<string | null>(null);
  const [fechaHoja, setFechaHoja] = useState(false);
  const [fecha, setFecha] = useState<TuFecha | null>(fp?.fecha ?? null);
  // Sin sesión, «Tu fecha» vive en el teléfono; al entrar, la que estaba en el teléfono pasa a la cuenta.
  useEffect(() => {
    if (!fp) return;
    const local = leerLocal();
    if (!fp.sesion) { if (local) setFecha(local); return; }
    if (!fp.fecha && local) tuFechaGuardar(local).then((r) => { if (r.ok) { setFecha(r.fecha); try { localStorage.removeItem(LLAVE); } catch { /* nada */ } } }).catch(() => undefined);
  }, [fp]);
  if (!fp) return null;
  const nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es), tg = (k: string) => fp.tags.includes(k), linea = nm(LINEA_FIESTA);
  const dispo = dispoFiesta(fp.cal, fecha, es);
  const diaF = fecha ? diaFiesta(fecha.day, es) : "";
  const item = (s: SvcFiesta) => {
    const P = precioFiesta(s, es), d = fecha && s.k !== "visita" ? dispoFiesta(fp.cal, fecha, es, s.cap) : null;
    return { id: s.id, name: nm(s.name), foto: s.foto, price: P.l, visita: s.k === "visita",
      meta: [metaFiesta(s, es), P.s, d ? `${d.short} ${E2("EL", "ON")} ${diaF}`.toUpperCase() : ""].filter(Boolean).join(" · ") };
  };
  const secs = [...fp.secciones.map((sc) => ({ title: nm(sc.name).toUpperCase(), items: fp.servicios.filter((s) => s.sec === sc.id).map(item) })),
    { title: E2("OTROS", "OTHER"), items: fp.servicios.filter((s) => !fp.secciones.some((sc) => sc.id === s.sec)).map(item) }].filter((x) => x.items.length);
  // Notas (máx. 4, listingAdd L232–235). El depósito: se retiene al enviar y se cobra cuando confirman (Preguntas #1, REVISION).
  const notes: [string, string][] = [["dateFree", `${linea} ${E2("Cada negocio muestra su calendario real; el depósito aparta la fecha solo cuando confirman.", "Each business shows its real calendar; the deposit holds the date only once they confirm.")}`]];
  if (fp.dep) notes.push(["dollar", E2(`Depósito de ${usd(fp.dep)} para apartar: se retiene al enviar y se cobra cuando confirman; se descuenta del total. Si no confirman, se libera completo.`, `${usd(fp.dep)} deposit to hold: held when you send and charged once they confirm; credited to the total. If they do not confirm, it is fully released.`)]);
  if (fp.zone) notes.push(["truck", E2(`Van a tu lugar hasta ${fp.zone} millas de ${fp.negocio.ciudad}.`, `They come to you up to ${fp.zone} miles from ${fp.negocio.ciudad}.`)]);
  if (tg("montaje")) notes.push(["check", E2("Montaje incluido: llegan antes y recogen al terminar.", "Setup included: they arrive early and pick up after.")]);
  const c0 = fp.servicios.find((x) => x.k === "pack") ?? fp.servicios.find((x) => x.k !== "visita") ?? fp.servicios[0]!;
  const desde = pro ? `${E2("Desde ", "From ")}${precioFiesta(c0, es).l}` : fp.soloTienda ? E2("Ve directo a la tienda", "Walk in") : E2("Llama para tu fecha", "Call about your date");
  const riel: { k: string; v: string }[] = [
    { k: fecha ? E2("TU FECHA", "YOUR DATE") : E2("PRÓXIMA LIBRE", "NEXT FREE"), v: fecha ? `${dispo.short} · ${diaF}` : dispo.short },
    { k: E2("DEPÓSITO", "DEPOSIT"), v: fp.dep ? usd(fp.dep) : E2("No pide", "None") },
    fp.cal.guests ? { k: E2("INVITADOS", "GUESTS"), v: E2(`Hasta ${fp.cal.guests}`, `Up to ${fp.cal.guests}`) } : fp.zone ? { k: E2("VA HASTA", "TRAVELS"), v: `${fp.zone} mi` } : { k: E2("DESDE", "FROM"), v: precioFiesta(c0, es).l },
  ];
  const llamar = () => { if (fp.negocio.telefono) location.href = `tel:${fp.negocio.telefono}`; };
  const llegar = () => abrirComoLlegar({ dir: fp.negocio.direccion ?? fp.negocio.nombre });
  const guardar = async (f: TuFecha): Promise<string | null> => {
    if (!fp.sesion) { guardarLocal(f); setFecha(f); return null; }
    const r = await tuFechaGuardar(f).catch(() => null);
    if (!r || !r.ok) return r && !r.ok ? nm(r.msg) : E2("No se pudo guardar.", "Could not save.");
    setFecha(r.fecha); router.refresh(); return null;
  };
  return { fp, es, E2, nm, pro, secs, notes, riel, desde, linea, fecha, dispo, diaF, hoja, fechaHoja, setFechaHoja, guardar, llamar, llegar, router,
    abrir: (id: string, e?: MouseEvent) => { stop(e); if (pro) setHoja(id); }, cerrar: () => setHoja(null), top: fp.servicios.slice(0, pro ? 4 : 5).map(item) };
}
export type Fi = NonNullable<ReturnType<typeof useFiesta>>;

/* La tarjeta «¿ESTÁ LIBRE TU FECHA?» / «TU FECHA» con el semáforo (V.ax.veh). */
function TuFechaCard({ v, cap }: { v: Fi; cap?: number | null }) {
  const { E2, fecha, fp, es } = v;
  if (!v.pro) return null;
  const d = cap !== undefined ? dispoFiesta(fp.cal, fecha, es, cap) : v.dispo;
  return (
    <button type="button" data-screen-label={fecha ? "Ficha · Tu fecha" : "Ficha · ¿Está libre tu fecha?"} onClick={(e) => { stop(e); v.setFechaHoja(true); }} className="flex w-full items-center gap-3 rounded-[15px] bg-paper px-3.5 py-[13px] text-left">
      <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-ink"><Icon name="dateFree" size={20} color="var(--tl-white)" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{fecha ? E2("TU FECHA", "YOUR DATE") : E2("¿ESTÁ LIBRE TU FECHA?", "IS YOUR DATE FREE?")}</span>
        <span className="mt-1 block text-[14.5px] font-bold leading-[1.3]">{fecha ? `${v.diaF}${fecha.g ? E2(` · ${fecha.g} invitados`, ` · ${fecha.g} guests`) : ""}` : E2("Agrega tu fecha", "Add your date")}</span>
        {fecha ? <span className="mt-1.5 flex items-center gap-[5px] text-[11.5px] font-bold" style={{ color: d.ok ? "var(--tl-open-text)" : "var(--tl-danger)" }}><Icon name={d.ok ? "check" : "warning"} size={13} color="currentColor" />{d.t}</span>
          : <span className="mt-[3px] block text-[12px] font-medium leading-[1.45] text-ink/55">{d.t}</span>}
      </span>
      <span className="flex-none text-[12.5px] font-bold text-action">{fecha ? E2("Cambiar", "Change") : E2("Agregar", "Add")}</span>
    </button>
  );
}

function Fila({ v, it, tarjeta }: { v: Fi; it: Fi["top"][number]; tarjeta?: boolean }) {
  const { E2 } = v, can = v.pro;
  return (
    <div role={can ? "button" : undefined} tabIndex={can ? 0 : undefined} onClick={(e) => v.abrir(it.id, e)} onKeyDown={(e) => { if (can && e.key === "Enter") v.abrir(it.id); }}
      className={`${tarjeta ? "flex items-center gap-[13px] rounded-[18px] border border-ink/[.08] bg-white p-3.5" : "flex items-center gap-[13px] border-b border-ink/[.07] py-3.5"} ${can ? "cursor-pointer" : ""}`}>
      <span className="h-14 w-14 flex-none rounded-[15px] bg-photo-bg" style={fondo(it.foto)} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold leading-[1.3]">{it.name}</div>
        {it.meta && <div className="mt-1 font-mono text-[10px] font-semibold leading-[1.4] tracking-[0.04em] text-ink/50">{it.meta}</div>}
        <div className="mt-1.5 font-display text-[16px] font-extrabold leading-none tracking-[-0.02em]">{it.price}</div>
      </div>
      {can && <Button variant="soft" size="md" onClick={(e: MouseEvent) => v.abrir(it.id, e)}>{it.visita ? E2("Pedir visita", "Request tour") : "Booking"}</Button>}
    </div>
  );
}
const Nota = ({ ic, t }: { ic: string; t: string }) => (
  <div className="flex items-start gap-[11px] rounded-2xl bg-action/[.07] px-3.5 py-[13px]"><span className="grid flex-none pt-px"><Icon name={ic} size={17} color="var(--tl-action)" /></span><span className="flex-1 text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/75">{t}</span></div>
);

export function FiTab({ v, desk }: { v: Fi; desk: boolean }) {
  return (
    <div data-screen-label={desk ? "Ficha · servicios · desktop" : "Ficha · servicios"} className={desk ? "flex max-w-[760px] flex-col gap-4 pt-6" : "flex flex-col gap-4 px-5 pt-[18px]"}>
      <TuFechaCard v={v} />
      {v.notes.map(([ic, t]) => <Nota key={t} ic={ic} t={t} />)}
      <div className="flex flex-col gap-[22px]">
        {v.secs.map((sc) => (
          <div key={sc.title}>
            <div className="font-mono text-[11px] font-extrabold tracking-[0.14em] text-ink/45">{sc.title}</div>
            <div className={desk ? "mt-3 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1"}>{sc.items.map((it) => <Fila key={it.id} v={v} it={it} tarjeta={desk} />)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* La hoja del servicio (sheetVals L268–279): foto, precio, INCLUYE, TU FECHA con el semáforo, el depósito y la línea. */
export function FiHoja({ v }: { v: Fi }) {
  const { fp, E2, es, nm, fecha } = v;
  if (!v.hoja) return null;
  const s = fp.servicios.find((x) => x.id === v.hoja);
  if (!s) return null;
  const P = precioFiesta(s, es), visita = s.k === "visita", d = dispoFiesta(fp.cal, fecha, es, s.cap), meta = metaFiesta(s, es);
  const pago = visita ? E2("La visita es gratis y no aparta la fecha.", "The tour is free and does not hold the date.")
    : fp.dep ? E2(`Hoy se retiene el depósito de ${usd(fp.dep)} para apartar la fecha y se cobra cuando confirman; se descuenta del total. Si no confirman, se libera completo.`, `Today the ${usd(fp.dep)} deposit is held to reserve the date and charged once they confirm; credited to the total. If they do not confirm, it is fully released.`)
      : E2("No pide depósito. Pagas como diga el acuerdo.", "No deposit. You pay per the agreement.");
  const otra = !visita && fecha && !d.ok;
  // 4v: «Pedir la fecha» abre el Booking de Fiestas con el servicio y Tu fecha.
  const go = () => {
    if (otra) { v.cerrar(); v.setFechaHoja(true); return; }
    if (!fp.booking) return v.llamar();
    const q = new URLSearchParams({ s: s.id }); if (fecha && !visita) q.set("d", fecha.day);
    v.router.push(`/n/${fp.negocio.id}/fiesta?${q.toString()}`);
  };
  const cta = visita ? E2("Pedir visita", "Request tour") : otra ? E2("Ver otra fecha", "Pick another date") : !fp.booking ? E2("Llama para tu fecha", "Call about your date") : E2("Pedir la fecha", "Request the date");
  return (
    <div data-screen-label="Servicio · Fiestas" className="fixed inset-0 z-[60]">
      <div onClick={v.cerrar} className="absolute inset-0 bg-ink/50" />
      <div role="dialog" aria-modal="true" aria-label={nm(s.name)} className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col overflow-hidden rounded-t-[26px] bg-white lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[86vh] lg:w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
        <div className="flex-1 overflow-y-auto">
          <div className="relative h-[170px] flex-none bg-photo-bg" style={fondo(s.foto ?? fp.negocio.foto)}>
            <button type="button" aria-label={E2("Cerrar", "Close")} onClick={v.cerrar} className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-xl bg-white/[.94]"><Icon name="close" size={15} strokeWidth={2.4} /></button>
          </div>
          <div className="flex flex-col gap-4 px-5 pb-6 pt-[18px]">
            <div>
              <div className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.035em]">{nm(s.name)}</div>
              <div className="mt-[9px] flex flex-wrap items-center gap-2.5"><span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">{P.l}</span>{meta && <span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/50">{meta}</span>}</div>
              {nm(s.desc) && <p className="mt-2.5 text-pretty text-[13px] leading-[1.6] text-ink/65">{nm(s.desc)}</p>}
            </div>
            {s.inc.length > 0 && (
              <div data-screen-label="Servicio · incluye" className="rounded-2xl border border-ink/[.08] px-4 py-3">
                <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("INCLUYE", "INCLUDES")}</div>
                {s.inc.map((z) => <div key={z.es} className="mt-2 flex items-start gap-2 text-[13px] font-semibold leading-[1.45]"><span className="grid flex-none pt-0.5"><Icon name="check" size={14} color="var(--tl-open-text)" /></span>{nm(z)}</div>)}
                <div className="mt-2.5 text-[11.5px] font-medium leading-[1.45] text-ink/55">{E2("Lo que no está escrito en el paquete, no está incluido.", "If it is not written in the package, it is not included.")}</div>
              </div>)}
            {!visita && <TuFechaCard v={v} cap={s.cap} />}
            <Nota ic={visita ? "pin" : "dollar"} t={`${pago} ${v.linea}`} />
          </div>
        </div>
        <div className="flex flex-none items-center gap-3.5 border-t border-ink/[.08] bg-white px-4 pb-[22px] pt-3 lg:pb-4">
          <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{P.s || E2("PRECIO", "PRICE")}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{P.l}</div></div>
          <div className="flex min-w-0 flex-1"><Button block icon={otra ? "dateFree" : !fp.booking && !visita ? "phone" : "calendar"} onClick={go}>{cta}</Button></div>
        </div>
      </div>
    </div>
  );
}

/* La hoja «Tu fecha» (fechaVals): qué celebras, qué día, cuántos invitados y dónde. Vale para todos los negocios. */
export function FiFecha({ v }: { v: Fi }) {
  const { fp, E2, es } = v;
  const f0 = v.fecha;
  const [f, setF] = useState<{ e: string; day: string; g: number | null; w: string }>({ e: f0?.e ?? "", day: f0?.day ?? "", g: f0?.g ?? null, w: f0?.w ?? "" });
  const [err, setErr] = useState(""), [busy, start] = useTransition();
  useEffect(() => { if (v.fechaHoja) { setF({ e: v.fecha?.e ?? "", day: v.fecha?.day ?? "", g: v.fecha?.g ?? null, w: v.fecha?.w ?? "" }); setErr(""); } }, [v.fechaHoja, v.fecha]);
  if (!v.fechaHoja) return null;
  const dias = findes(fp.cal.hoy, 8), otra = f.day && !dias.includes(f.day) ? f.day : "";
  const cerrar = () => v.setFechaHoja(false);
  const can = /^\d{4}-\d{2}-\d{2}$/.test(f.day);
  const ver = () => { if (!can) return; setErr(""); start(async () => { const e = await v.guardar(f); if (e) setErr(e); else cerrar(); }); };
  const grupo = (k: string, items: { id: string; l: string; on: boolean; go: () => void }[], hint?: string) => (
    <div><div className={K}>{k}</div><div className="mt-2 flex flex-wrap gap-2">{items.map((x) => <Chip key={x.id} variant={x.on ? "selected" : "filter"} onClick={x.go}>{x.l}</Chip>)}</div>{hint && <div className="mt-1.5 text-[11.5px] font-medium leading-[1.45] text-ink/55">{hint}</div>}</div>
  );
  return (
    <div data-screen-label="Tu fecha" className="fixed inset-0 z-[70]">
      <div onClick={cerrar} className="absolute inset-0 bg-ink/50" />
      <div role="dialog" aria-modal="true" aria-label={E2("Tu fecha", "Your date")} className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col overflow-hidden rounded-t-[26px] bg-white lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[86vh] lg:w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
        <div className="flex items-start gap-3 border-b border-ink/[.07] px-5 pb-3.5 pt-5">
          <div className="min-w-0 flex-1"><div className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{E2("Tu fecha", "Your date")}</div><div className="mt-1 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2("Día, invitados y dónde. Cambia cuando quieras.", "Day, guests and where. Change it any time.")}</div></div>
          <button type="button" aria-label={E2("Cerrar", "Close")} onClick={cerrar} className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {err && <div role="alert" className="rounded-[12px] bg-danger/[.08] px-3 py-2.5 text-[12.5px] font-semibold text-danger">{err}</div>}
          {grupo(E2("¿QUÉ CELEBRAS?", "WHAT ARE YOU CELEBRATING?"), EVT.map(([k, a, b]) => ({ id: k, l: es ? a : b, on: f.e === k, go: () => setF({ ...f, e: f.e === k ? "" : k }) })))}
          <div>
            {grupo(E2("¿QUÉ DÍA?", "WHICH DAY?"), dias.map((d) => ({ id: d, l: diaFiesta(d, es), on: f.day === d, go: () => setF({ ...f, day: f.day === d ? "" : d }) })), E2("Te decimos en cada negocio si esa fecha está libre.", "We tell you at each business if that date is free."))}
            <label className="mt-3 block"><span className={K}>{E2("OTRA FECHA", "ANOTHER DATE")}</span>
              <input type="date" aria-label={E2("Otra fecha", "Another date")} value={otra} min={fp.cal.hoy} max={sumarDias(fp.cal.hoy, 730)} onChange={(e) => setF({ ...f, day: e.target.value })}
                className={`mt-2 box-border h-11 w-full rounded-[13px] border px-3.5 font-mono text-[13.5px] font-bold outline-none ${otra ? "border-ink" : "border-ink/[.12]"}`} />
            </label>
          </div>
          {grupo(E2("¿CUÁNTOS INVITADOS?", "HOW MANY GUESTS?"), GUESTS.map((g) => ({ id: String(g), l: g === 300 ? "300+" : String(g), on: f.g === g, go: () => setF({ ...f, g: f.g === g ? null : g }) })))}
          {grupo(E2("¿DÓNDE?", "WHERE?"), WHERE.map(([k, a, b]) => ({ id: k, l: es ? a : b, on: f.w === k, go: () => setF({ ...f, w: f.w === k ? "" : k }) })))}
          {!fp.sesion && <div className="text-pretty text-[12px] font-medium leading-[1.5] text-ink/55">{E2("Sin cuenta, tu fecha se queda en este teléfono. Entra para guardarla en tu cuenta.", "Without an account, your date stays on this phone. Sign in to save it to your account.")}</div>}
          <Nota ic="dateFree" t={`${v.linea} ${E2("Guardar tu fecha no aparta nada: solo te muestra quién está libre.", "Saving your date holds nothing: it only shows who is free.")}`} />
        </div>
        <div className="flex flex-none border-t border-ink/[.08] px-4 pb-[22px] pt-3 lg:pb-4"><Button block disabled={!can || busy} onClick={ver}>{busy ? E2("Guardando…", "Saving…") : E2("Ver quién está libre", "See who is free")}</Button></div>
      </div>
    </div>
  );
}

export function FiResumen({ v, desk, onAll }: { v: Fi; desk: boolean; onAll?: () => void }) {
  const { E2, fp, es } = v;
  const libres = fp.cal.libres.map((d) => diaFiesta(d, es)).join(" · ");
  const facts: [string, string, string][] = [
    ["dateFree", E2("FECHAS LIBRES", "FREE DATES"), libres || E2("Pregunta por fechas", "Ask for dates")],
    ["dollar", E2("DEPÓSITO", "DEPOSIT"), fp.dep ? `${usd(fp.dep)}${E2(" · se libera si no confirman", " · released if not confirmed")}` : E2("No pide", "None")],
    ["language", E2("IDIOMAS", "LANGUAGES"), fp.esp ? "Español · English" : "English"],
    ["card", E2("PAGO", "PAYMENT"), E2("Depósito con tarjeta · el resto como diga el acuerdo", "Deposit by card · the rest per the agreement")],
  ];
  const pasos = [E2("Agrega tu fecha: te decimos si está libre.", "Add your date: we tell you if it is free."), E2("Pides la fecha y se retiene el depósito para apartarla.", "Request the date and the deposit is held to reserve it."),
    E2("El negocio confirma por escrito. Si no puede, el depósito se libera completo.", "The business confirms in writing. If they cannot, the deposit is fully released."), E2("El resto lo pagas como diga el acuerdo, nunca más de lo confirmado.", "You pay the rest per the agreement, never more than confirmed.")];
  return (
    <div>
      {v.pro && <div className="mb-5 flex flex-col gap-3"><TuFechaCard v={v} />
        <div data-screen-label="Resumen · la línea" className="rounded-[18px] bg-ink px-4 py-4 text-white"><div className="font-display text-[16px] font-extrabold leading-[1.25] tracking-[-0.02em]">{v.linea}</div><div className="mt-1.5 text-pretty text-[12.5px] font-medium leading-[1.55] text-white/70">{E2("Aquí ves el calendario real, el precio del paquete y lo que incluye. El depósito se libera si no te confirman.", "Here you see the real calendar, the package price and what it includes. The deposit is released if they do not confirm.")}</div></div></div>}
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-display text-[18px] font-extrabold leading-[1.1] tracking-[-0.03em] lg:text-[24px] lg:tracking-[-0.035em]">{E2("Servicios", "Services")}</div>
        {onAll && <button type="button" onClick={onAll} className="text-[12.5px] font-bold text-action">{E2("Ver todos", "See all")}</button>}
      </div>
      <div data-screen-label={desk ? "Resumen desktop · servicios" : "Resumen · servicios"} className={desk ? "mt-4 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1.5"}>
        {v.top.map((it) => <Fila key={it.id} v={v} it={it} tarjeta={desk} />)}
      </div>
      {!v.pro && <div className="mt-3 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{fp.soloTienda ? E2("Tienda: ve directo, no hace falta cita.", "Store: just walk in, no appointment needed.") : `${E2("No toma reservas en To’Latino: llama para preguntar por tu fecha.", "No To’Latino bookings: call to ask about your date.")} ${v.linea}`}</div>}
      {v.pro && (
        <div className="mt-6 flex flex-col gap-4">
          <div data-screen-label="Resumen · datos de la fiesta" className="rounded-[18px] border border-ink/[.08] bg-white px-4">
            {facts.map(([ic, k, val], i) => (
              <div key={k} className={`flex items-start gap-3 py-3.5 ${i ? "border-t border-ink/[.06]" : ""}`}>
                <span className="grid flex-none pt-0.5"><Icon name={ic} size={17} color="rgba(11,14,18,.55)" /></span>
                <div className="min-w-0 flex-1"><div className="font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{k}</div><div className="mt-1 text-pretty text-[13.5px] font-semibold leading-[1.45]">{val}</div></div>
              </div>))}
          </div>
          <div data-screen-label="Resumen · cómo funciona">
            <div className="font-display text-[16px] font-extrabold tracking-[-0.02em]">{E2("Cómo funciona", "How it works")}</div>
            <div className="mt-2.5 flex flex-col gap-2.5">{pasos.map((p, i) => (
              <div key={p} className="flex items-start gap-3"><span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-ink font-mono text-[11px] font-bold text-white">{i + 1}</span><span className="flex-1 text-pretty pt-0.5 text-[13px] font-medium leading-[1.5] text-ink/75">{p}</span></div>))}</div>
          </div>
        </div>)}
    </div>
  );
}

function Cta({ v, onCta, block }: { v: Fi; onCta: () => void; block?: boolean }) {
  const { E2 } = v;
  if (v.fp.soloTienda) return <Button icon="pin" block={block} onClick={v.llegar}>{E2("Cómo llegar", "Directions")}</Button>;
  if (!v.pro) return v.fp.negocio.telefono ? <Button icon="phone" block={block} onClick={v.llamar}>{E2("Llamar", "Call")}</Button> : null;
  return <Button icon="calendar" block={block} onClick={onCta}>Booking</Button>;
}
export function FiRiel({ v, onCta }: { v: Fi; onCta: () => void }) {
  const { E2 } = v;
  return (
    <div data-screen-label="Ficha · Booking · columna" className="flex flex-col gap-4 rounded-[22px] border border-ink/10 bg-white p-[22px] shadow-[0_24px_48px_-34px_rgba(11,14,18,.45)]">
      <div className="font-display text-[28px] font-extrabold leading-none tracking-[-0.04em]">{v.desde}</div>
      {v.pro && <div className="grid grid-cols-3 gap-2">
        {v.riel.map((m) => <div key={m.k} className="min-w-0 rounded-[14px] bg-paper px-2.5 py-[11px]"><div className="font-mono text-[8.5px] font-bold tracking-[0.1em] text-ink/45">{m.k}</div><div className="mt-1.5 text-[13px] font-bold leading-[1.3]">{m.v}</div></div>)}
      </div>}
      <div className="text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/60">{v.pro ? `${v.linea} ${E2("Pides la fecha aquí; el negocio confirma por escrito.", "Request the date here; the business confirms in writing.")}` : `${v.linea} ${E2("Llama para preguntar por tu fecha.", "Call to ask about your date.")}`}</div>
      <div className="flex"><Cta v={v} onCta={onCta} block /></div>
    </div>
  );
}
export function FiBarra({ v, onCta }: { v: Fi; onCta: () => void }) {
  if (v.hoja || v.fechaHoja) return null;
  const sub = v.pro ? `${v.riel[0]!.k} · ${v.riel[0]!.v}` : v.fp.zone && !v.fp.soloTienda ? v.E2(`VA HASTA ${v.fp.zone} MI`, `TRAVELS ${v.fp.zone} MI`) : "";
  return (
    <div data-screen-label="Ficha · barra de Fiestas" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-paper/95 px-5 pb-[22px] pt-[13px] backdrop-blur-[14px] lg:hidden">
      <div className="min-w-0 flex-1">
        <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.02em]">{v.desde}</div>
        {sub && <div className="mt-1.5 truncate font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{sub.toUpperCase()}</div>}
      </div>
      <Cta v={v} onCta={onCta} />
    </div>
  );
}
