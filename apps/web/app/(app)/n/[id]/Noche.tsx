"use client";
/* Ficha de Noche (4nb · prototipo neg-noche-listing.js listingAdd L118–157, sheetVals L158–171, resAdd L172–177, tonight L114–117 y
   neg-noche-kind.js post). Tesis: ¿cuánto es el cover y cómo está la fila? La línea fija «El cover que ves es el que pagas en la
   puerta.» va en la pestaña, la hoja, el Resumen y el riel. La tarjeta de esta noche (cover, después de, edad, quién toca, código) y
   la fila con su hora real (solo «Ahora» si el local la puso hace 60 min o menos). La Entrada sigue al cover y la Lista a su hora.
   DJ, promotor y salón: «Para tu fecha» y «Pedir fecha» (Mensajes). Anotarse y pedir mesa en la app llegan con 4nc. */
import * as UI from "@tolatino/ui";
import { useState, type ComponentType, type MouseEvent } from "react";
import { coverTexto, diaNoche, filaCorta, filaCuando, filaEtiqueta, hNoche, LINEA_NOCHE, precioNoche, usdN } from "@/lib/noche-comun";
import type { NochePublica, SvcNoche } from "@/lib/noche-publico";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});
const stop = (e?: MouseEvent) => e?.stopPropagation();
const DOW = { es: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };

type Acc = { llegar: () => void; escribir: () => void; llamar: () => void; reservar: (svc: string, pax: number) => void };
export function useNoche(np: NochePublica | null, es: boolean, pro: boolean, acc: Acc) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [hoja, setHoja] = useState<string | null>(null);
  const [pax, setPax] = useState(2);
  if (!np) return null;
  const nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es), linea = nm(LINEA_NOCHE), e = np.noche;
  const cuando = !e ? "" : e.cuando === "hoy" ? E2("ESTA NOCHE", "TONIGHT") : e.cuando === "manana" ? E2("MAÑANA", "TOMORROW") : E2(`EL ${diaNoche(e.dow, true).toUpperCase()}`, diaNoche(e.dow, false).toUpperCase());
  // La Entrada y la Lista dicen lo de esta noche (liveIt L101–106).
  const desc = (s: SvcNoche) => {
    if (s.k === "cover" && e) {
      const otras = np.otras.map((n) => `${diaNoche(n.dow, es)} ${n.cover ? usdN(n.cover) : E2("sin cover", "no cover")}`).join(" · ");
      return `${e.cover ? `${usdN(e.cover)}${e.after ? E2(` hasta las ${hNoche(e.after.min)}, ${usdN(e.after.cents)} después`, ` until ${hNoche(e.after.min)}, ${usdN(e.after.cents)} after`) : ""}${E2(". Se paga en la puerta.", ". Paid at the door.")}` : E2("Sin cover esta noche.", "No cover tonight.")}${otras ? E2(` Otras noches: ${otras}.`, ` Other nights: ${otras}.`) : ""}`;
    }
    if (s.k === "lista" && s.until != null && e) {
      const aft = e.after && e.after.min <= s.until ? e.after.cents : e.cover;
      return `${s.cents ? usdN(s.cents) : E2("Gratis", "Free")}${E2(` hasta las ${hNoche(s.until)} con tu nombre en la lista. Después, ${aft ? `cover de ${usdN(aft)}.` : "sin cover."}`, ` until ${hNoche(s.until)} with your name on the list. After that, ${aft ? `${usdN(aft)} cover.` : "no cover."}`)}`;
    }
    return nm(s.desc);
  };
  const btn = (s: SvcNoche) => (s.k === "fecha" ? E2("Pedir fecha", "Ask for a date") : s.k === "cover" ? E2("Cómo llegar", "Directions") : s.k === "lista" ? E2("Anotarme", "Join the list") : E2("Reservar", "Reserve"));
  const item = (s: SvcNoche) => {
    const P = precioNoche(s, es), dias = s.dows.length ? `${E2("SOLO ", "ONLY ")}${s.dows.map((d) => DOW[es ? "es" : "en"][d]).join(" · ").toUpperCase()}` : "";
    return { id: s.id, k: s.k, name: nm(s.name), desc: desc(s), foto: s.foto, price: P.l, meta: [P.s, s.dep ? E2(`DEPÓSITO ${usdN(s.dep)}`, `${usdN(s.dep)} DEPOSIT`) : "", dias].filter(Boolean).join(" · "), btn: btn(s) };
  };
  const secs = [...np.secciones.map((sc) => ({ title: nm(sc.name).toUpperCase(), items: np.servicios.filter((s) => s.sec === sc.id).map(item) })),
    { title: E2("OTROS", "OTHER"), items: np.servicios.filter((s) => !np.secciones.some((sc) => sc.id === s.sec)).map(item) }].filter((x) => x.items.length);
  // Notas (L130–133, máx. 4).
  const notes: [string, string][] = [];
  if (e) {
    notes.push(["dollar", `${linea} ${cuando.charAt(0)}${cuando.slice(1).toLowerCase()}: ${coverTexto(e, es)}.`]);
    notes.push(["users", `${E2("Edad: ", "Age: ")}${e.edad}+ ${E2("con licencia, pasaporte o ID del estado vigente. Sin identificación no entras, aunque estés en la lista.", "with a valid license, passport or state ID. No ID, no entry, even if you are on the list.")}${np.vestimenta ? E2(` Código: ${nm(np.vestimenta)}.`, ` Dress code: ${nm(np.vestimenta)}.`) : ""}`]);
  } else if (!np.porFecha) notes.push(["dollar", E2("Aún no publica el cover en To’Latino: pregúntalo en la puerta.", "No cover posted on To’Latino yet: ask at the door.")]);
  if (np.lista) notes.push(["check", E2("La lista es gratis y no cobra nada. Solo te guarda el precio de la lista hasta la hora que dice.", "The list is free and charges nothing. It holds the list price until the time shown.")]);
  if (np.mesas) notes.push(["drink", E2("Mesas: el mínimo es consumo, no un cargo aparte. Si piden depósito, se descuenta de tu cuenta.", "Tables: the minimum is spend, not an extra fee. If there is a deposit, it comes off your bill.")]);
  // El riel (TD L142): COVER · EDAD · LA FILA; sin «Esta noche» publicada: HASTA · EDAD · COVER.
  const f = np.fila;
  const td: { k: string; v: string }[] = np.porFecha ? [{ k: E2("TRABAJA", "WORKS"), v: E2("Por fecha", "By date") }, { k: E2("PRECIO", "PRICE"), v: E2("Por escrito", "In writing") }, { k: E2("PAGO", "PAYMENT"), v: E2("Lo acuerdan", "Agreed") }]
    : e ? [{ k: E2("COVER", "COVER"), v: e.cover ? usdN(e.cover) : E2("Sin cover", "No cover") }, { k: E2("EDAD", "AGE"), v: `${e.edad}+` }, f ? { k: filaEtiqueta(f, es), v: filaCorta(f, es) } : { k: E2("LA FILA", "THE LINE"), v: "—" }]
    : [{ k: E2("HASTA", "UNTIL"), v: np.cierra != null ? hNoche(np.cierra) : "—" }, { k: E2("EDAD", "AGE"), v: np.tags.includes("e18") ? "18+" : "21+" }, { k: E2("COVER", "COVER"), v: np.tags.includes("sincover") ? E2("Sin cover", "No cover") : E2("Sin publicar", "Not posted") }];
  const precios = np.servicios.filter((s) => s.k === "fecha" && s.cents > 0).map((s) => s.cents);
  const desde = np.porFecha ? (precios.length && pro ? `${E2("Desde ", "From ")}${usdN(Math.min(...precios))}` : E2("Por fecha", "By date")) : e ? (e.cover ? `${E2("Cover ", "Cover ")}${usdN(e.cover)}` : E2("Sin cover", "No cover")) : np.tags.includes("sincover") ? E2("Sin cover", "No cover") : E2("Cover en la puerta", "Cover at the door");
  // La pestaña (tabL L143): «Esta noche» / «Mañana viernes» / «El sábado» / «Para tu fecha» / «Próximas noches».
  const tabL = np.porFecha ? (np.kind === "promo" ? E2("Próximas noches", "Upcoming nights") : E2("Para tu fecha", "For your date"))
    : !e || e.cuando === "hoy" ? E2("Esta noche", "Tonight") : e.cuando === "manana" ? E2(`Mañana ${diaNoche(e.dow, true)}`, `Tomorrow ${diaNoche(e.dow, false)}`) : E2(`El ${diaNoche(e.dow, true)}`, diaNoche(e.dow, false));
  const hacer = (k: string, id?: string, ev?: MouseEvent) => { stop(ev); if (k === "fecha") return acc.escribir(); if (k === "cover") return acc.llegar(); if (id && pro) setHoja(id); };
  const cta = np.porFecha ? { l: E2("Pedir fecha", "Ask for a date"), icon: "bubble", go: acc.escribir }
    : (np.lista || np.mesas) && pro ? { l: E2("Lista y mesas", "List & tables"), icon: "drink", go: null } : pro ? { l: E2("Cómo llegar", "Directions"), icon: "pin", go: acc.llegar } : { l: E2("Llamar", "Call"), icon: "phone", go: acc.llamar };
  return { np, es, E2, nm, pro, secs, notes: notes.slice(0, 4), td, desde, linea, cuando, tabL, hoja, pax, setPax, acc, cta,
    abrir: (id: string, k: string, ev?: MouseEvent) => hacer(k, id, ev), cerrar: () => setHoja(null), top: np.servicios.slice(0, pro ? 4 : 5).map(item) };
}
export type No = NonNullable<ReturnType<typeof useNoche>>;

/* La tarjeta de esta noche (ax.veh L136) y la de la fila (ax.q L137). */
export function NoNoche({ v }: { v: No }) {
  const { np, E2, nm } = v, e = np.noche, f = np.fila;
  if (np.porFecha) return null;
  const up = np.hoy === "aun" && np.abre != null ? E2(`AÚN NO ABRE · ABRE A LAS ${hNoche(np.abre)}`, `NOT OPEN YET · OPENS AT ${hNoche(np.abre)}`) : np.hoy === "cerrado" ? E2("HOY NO ABRE", "CLOSED TONIGHT") : null;
  if (!e) return (
    <div data-screen-label="Ficha · Noche · sin publicar" className="rounded-[18px] border border-ink/[.08] bg-white px-4 py-3.5 text-pretty text-[13px] font-semibold leading-[1.5] text-ink/70">
      {E2("Aún no publica el cover en To’Latino: pregúntalo en la puerta.", "No cover posted on To’Latino yet: ask at the door.")}
    </div>);
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <div data-screen-label="Ficha · Noche · esta noche" className="rounded-[18px] bg-ink px-4 py-4 text-white">
        <div className="font-mono text-[9px] font-bold tracking-[0.14em] text-white/60">{`${v.cuando} · COVER`}</div>
        <div className="mt-1.5 font-display text-[20px] font-extrabold leading-[1.15] tracking-[-0.03em]">{coverTexto(e, v.es)}</div>
        <div className="mt-1.5 font-mono text-[10px] font-semibold tracking-[0.06em] text-white/70">{[`${e.edad}+`, np.nota ? nm(np.nota) : ""].filter(Boolean).join(" · ").toUpperCase()}</div>
        {np.vestimenta && <div className="mt-1.5 text-[12.5px] font-medium text-white/80">{E2("Código: ", "Dress code: ")}{nm(np.vestimenta)}</div>}
        <div className="mt-2.5 flex items-center gap-1.5 text-[12px] font-semibold text-white/85"><Icon name="check" size={13} color="currentColor" />{E2("Lo publica el local; es lo que pagas en la puerta", "Posted by the venue; it is what you pay at the door")}</div>
      </div>
      <div data-screen-label="Ficha · Noche · la fila" className="rounded-[18px] border border-ink/[.08] bg-white px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{E2("LA FILA", "THE LINE")}</div>
          {up && <div className="font-mono text-[9px] font-bold tracking-[0.1em] text-ink/55">{up}</div>}
        </div>
        <div className="mt-1.5 font-display text-[20px] font-extrabold leading-none tracking-[-0.03em]">{f ? filaCorta(f, v.es) : "—"}</div>
        <div className="mt-2 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/65">{f ? filaCuando(f, v.es) : E2("El local todavía no ha puesto la fila. Sale en vivo desde que abren.", "The venue has not posted the line yet. It shows live from opening.")}</div>
      </div>
    </div>
  );
}

function Fila({ v, it, tarjeta, desc }: { v: No; it: No["top"][number]; tarjeta?: boolean; desc?: boolean }) {
  const can = v.pro;
  return (
    <div role={can ? "button" : undefined} tabIndex={can ? 0 : undefined} onClick={(e) => (can ? v.abrir(it.id, it.k === "fecha" ? "fecha" : "hoja", e) : undefined)}
      onKeyDown={(e) => { if (can && e.key === "Enter") v.abrir(it.id, it.k === "fecha" ? "fecha" : "hoja"); }}
      className={`${tarjeta ? "flex items-center gap-[13px] rounded-[18px] border border-ink/[.08] bg-white p-3.5" : "flex items-center gap-[13px] border-b border-ink/[.07] py-3.5"} ${can ? "cursor-pointer" : ""}`}>
      <span className="h-14 w-14 flex-none rounded-[15px] bg-photo-bg" style={fondo(it.foto)} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold leading-[1.3]">{it.name}</div>
        {desc && it.desc && <div className="mt-1 line-clamp-3 text-pretty text-[12.5px] leading-[1.5] text-ink/60">{it.desc}</div>}
        {it.meta && <div className="mt-1 font-mono text-[10px] font-semibold leading-[1.4] tracking-[0.04em] text-ink/50">{it.meta}</div>}
        <div className="mt-1.5 font-display text-[16px] font-extrabold leading-none tracking-[-0.02em]">{it.price}</div>
      </div>
      {can && <Button variant="soft" size="md" onClick={(e: MouseEvent) => v.abrir(it.id, it.k, e)}>{it.btn}</Button>}
    </div>
  );
}
const Nota = ({ ic, t }: { ic: string; t: string }) => (
  <div className="flex items-start gap-[11px] rounded-2xl bg-action/[.07] px-3.5 py-[13px]"><span className="grid flex-none pt-px"><Icon name={ic} size={17} color="var(--tl-action)" /></span><span className="flex-1 text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/75">{t}</span></div>
);

export function NoTab({ v, desk }: { v: No; desk: boolean }) {
  return (
    <div data-screen-label={desk ? "Ficha · esta noche · desktop" : "Ficha · esta noche"} className={desk ? "flex max-w-[760px] flex-col gap-4 pt-6" : "flex flex-col gap-4 px-5 pt-[18px]"}>
      <NoNoche v={v} />
      {v.notes.map(([ic, t]) => <Nota key={t} ic={ic} t={t} />)}
      <div className="flex flex-col gap-[22px]">
        {v.secs.map((sc) => (
          <div key={sc.title}>
            <div className="font-mono text-[11px] font-extrabold tracking-[0.14em] text-ink/45">{sc.title}</div>
            <div className={desk ? "mt-3 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1"}>{sc.items.map((it) => <Fila key={it.id} v={v} it={it} tarjeta={desk} desc />)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* La hoja del servicio (sheetVals L158–171): personas, precio, la tarjeta de esta noche y cómo se paga. */
export function NoHoja({ v }: { v: No }) {
  const { np, E2, es, nm } = v;
  if (!v.hoja) return null;
  const s = np.servicios.find((x) => x.id === v.hoja);
  if (!s) return null;
  const texto = v.secs.flatMap((x) => x.items).find((x) => x.id === s.id)?.desc ?? "";
  const P = precioNoche(s, es), e = np.noche, max = Math.min(10, s.pax ?? 10), pn = Math.min(v.pax, max);
  const pago = s.k === "lista" ? E2(`Anotarte no cobra nada. En la puerta pagas ${s.cents ? `${usdN(s.cents)} por persona` : "nada"} si llegas antes de las ${hNoche(s.until ?? 660)}; después, el cover normal.`, `Joining costs nothing. At the door you pay ${s.cents ? `${usdN(s.cents)} per person` : "nothing"} if you arrive before ${hNoche(s.until ?? 660)}; after that, the regular cover.`)
    : s.k === "cover" ? v.linea
    : `${s.dep ? E2(`Hoy se retiene el depósito de ${usdN(s.dep)}; se cobra cuando confirmen y se descuenta de tu cuenta. Si no confirman, se libera completo. `, `Today a ${usdN(s.dep)} deposit is held; it is charged when they confirm and comes off your bill. If they do not confirm, it is fully released. `) : E2("Sin depósito y sin tarjeta. ", "No deposit and no card. ")}${!s.hr && s.cents ? E2("El mínimo es consumo, no un cargo aparte.", "The minimum is spend, not an extra fee.") : ""}`;
  const app = np.booking && s.k !== "cover";
  const cta = s.k === "cover" ? E2("Cómo llegar", "Directions") : !app ? E2("Llamar al local", "Call the venue") : s.k === "lista" ? E2("Anotarme en la lista", "Join the list") : E2("Pedir la mesa", "Request the table");
  const go = () => { v.cerrar(); if (s.k === "cover") v.acc.llegar(); else if (!app) v.acc.llamar(); else v.acc.reservar(s.id, pn); };
  return (
    <div data-screen-label="Servicio · Noche" className="fixed inset-0 z-[60]">
      <div onClick={v.cerrar} className="absolute inset-0 bg-ink/50" />
      <div role="dialog" aria-modal="true" aria-label={nm(s.name)} className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col overflow-hidden rounded-t-[26px] bg-white lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[86vh] lg:w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
        <div className="flex-1 overflow-y-auto">
          <div className="relative h-[170px] flex-none bg-photo-bg" style={fondo(s.foto ?? np.negocio.foto)}>
            <button type="button" aria-label={E2("Cerrar", "Close")} onClick={v.cerrar} className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-xl bg-white/[.94]"><Icon name="close" size={15} strokeWidth={2.4} /></button>
          </div>
          <div className="flex flex-col gap-4 px-5 pb-6 pt-[18px]">
            <div>
              <div className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.035em]">{nm(s.name)}</div>
              <div className="mt-[9px] flex flex-wrap items-center gap-2.5"><span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">{P.l}</span><span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/50">{P.s}</span></div>
              {texto && <p className="mt-2.5 text-pretty text-[13px] leading-[1.6] text-ink/65">{texto}</p>}
            </div>
            {s.k !== "cover" && (
              <div role="radiogroup" aria-label={E2("¿Cuántos van?", "How many are going?")}>
                <div className="flex items-baseline justify-between"><div className="text-[14px] font-bold">{E2("¿Cuántos van?", "How many are going?")}</div><div className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{E2("ELIGE 1", "CHOOSE 1")}</div></div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={pn === n} aria-label={String(n)} onClick={() => v.setPax(n)} className={`h-10 min-w-10 rounded-xl px-3 text-[14px] font-bold ${pn === n ? "bg-ink text-white" : "border border-ink/[.12] bg-white"}`}>{n}</button>
                  ))}
                </div>
              </div>)}
            {e && (
              <div data-screen-label="Servicio · esta noche" className="rounded-2xl bg-paper px-4 py-3">
                <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{v.cuando}</div>
                <div className="mt-1 text-[14px] font-bold">{coverTexto(e, es)}</div>
                <div className="mt-1 font-mono text-[10px] font-semibold tracking-[0.04em] text-ink/50">{[`${e.edad}+`, np.vestimenta ? nm(np.vestimenta) : ""].filter(Boolean).join(" · ").toUpperCase()}</div>
              </div>)}
            {s.inc.length > 0 && (
              <div className="rounded-2xl border border-ink/[.08] px-4 py-3">
                <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("INCLUYE", "INCLUDES")}</div>
                {s.inc.map((z) => <div key={z.es} className="mt-2 flex items-start gap-2 text-[13px] font-semibold leading-[1.45]"><span className="grid flex-none pt-0.5"><Icon name="check" size={14} color="var(--tl-open-text)" /></span>{nm(z)}</div>)}
              </div>)}
            <Nota ic={s.k === "lista" ? "check" : "dollar"} t={pago} />
            {s.k !== "cover" && !app && <div className="text-pretty text-[12px] font-medium leading-[1.5] text-ink/55">{E2("Este local no toma listas ni mesas en To’Latino por ahora: llama al local.", "This venue is not taking lists or tables on To’Latino right now: call the venue.")}</div>}
          </div>
        </div>
        <div className="flex flex-none items-center gap-3.5 border-t border-ink/[.08] bg-white px-4 pb-[22px] pt-3 lg:pb-4">
          <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{P.s || E2("PRECIO", "PRICE")}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{P.l}</div></div>
          <div className="flex min-w-0 flex-1"><Button block icon={s.k === "cover" ? "pin" : !app ? "phone" : s.k === "lista" ? "check" : "drink"} onClick={go}>{cta}</Button></div>
        </div>
      </div>
    </div>
  );
}

export function NoResumen({ v, desk, onAll }: { v: No; desk: boolean; onAll?: () => void }) {
  const { E2, np, nm } = v, e = np.noche;
  const facts: [string, string, string][] = np.porFecha ? [] : [
    ["dollar", E2("COVER", "COVER"), e ? coverTexto(e, v.es) : E2("Sin publicar: pregúntalo en la puerta", "Not posted: ask at the door")],
    ["users", E2("EDAD", "AGE"), `${e?.edad ?? (np.tags.includes("e18") ? 18 : 21)}+ ${E2("con identificación", "with ID")}`],
    ...(np.vestimenta ? [["check", E2("CÓDIGO", "DRESS CODE"), nm(np.vestimenta)] as [string, string, string]] : []),
    ...(np.lic ? [["shield", E2("LICENCIA DE LICOR", "LIQUOR LICENSE"), E2("Verificada por To’Latino (PLCB)", "Verified by To’Latino (PLCB)")] as [string, string, string]] : []),
  ];
  return (
    <div>
      {v.pro && !np.porFecha && (
        <div data-screen-label="Resumen · cover y fila" className="mb-4 flex flex-col gap-2.5">
          <div className="text-pretty text-[13px] font-semibold leading-[1.5] text-ink/70">{`${np.lista && np.mesas ? E2("Anótate en la lista o pide mesa aquí. ", "Join the list or request a table here. ") : np.lista ? E2("Anótate en la lista aquí. ", "Join the list here. ") : np.mesas ? E2("Pide mesa aquí. ", "Request a table here. ") : ""}${e ? v.linea : ""}`}</div>
          <NoNoche v={v} />
        </div>)}
      {v.top.length > 0 && <>
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-display text-[18px] font-extrabold leading-[1.1] tracking-[-0.03em] lg:text-[24px] lg:tracking-[-0.035em]">{v.tabL}</div>
        {onAll && <button type="button" onClick={onAll} className="text-[12.5px] font-bold text-action">{E2("Ver todo", "See all")}</button>}
      </div>
      <div data-screen-label={desk ? "Resumen desktop · servicios" : "Resumen · servicios"} className={desk ? "mt-4 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1.5"}>
        {v.top.map((it) => <Fila key={it.id} v={v} it={it} tarjeta={desk} />)}
      </div></>}
      {!v.pro && !np.porFecha && !e && <div className="mt-3 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2("Aún no publica el cover en To’Latino: pregúntalo en la puerta.", "No cover posted on To’Latino yet: ask at the door.")}</div>}
      {v.pro && facts.length > 0 && (
        <div data-screen-label="Resumen · datos de la noche" className="mt-6 rounded-[18px] border border-ink/[.08] bg-white px-4">
          {facts.map(([ic, k, val], i) => (
            <div key={k} className={`flex items-start gap-3 py-3.5 ${i ? "border-t border-ink/[.06]" : ""}`}>
              <span className="grid flex-none pt-0.5"><Icon name={ic} size={17} color="rgba(11,14,18,.55)" /></span>
              <div className="min-w-0 flex-1"><div className="font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{k}</div><div className="mt-1 text-pretty text-[13.5px] font-semibold leading-[1.45]">{val}</div></div>
            </div>))}
        </div>)}
    </div>
  );
}

function Cta({ v, onCta, block }: { v: No; onCta: () => void; block?: boolean }) {
  return <Button icon={v.cta.icon} block={block} onClick={v.cta.go ?? onCta}>{v.cta.l}</Button>;
}
export function NoRiel({ v, onCta }: { v: No; onCta: () => void }) {
  return (
    <div data-screen-label="Ficha · Noche · columna" className="flex flex-col gap-4 rounded-[22px] border border-ink/10 bg-white p-[22px] shadow-[0_24px_48px_-34px_rgba(11,14,18,.45)]">
      <div className="font-display text-[28px] font-extrabold leading-none tracking-[-0.04em]">{v.desde}</div>
      {v.pro && <div className="grid grid-cols-3 gap-2">
        {v.td.map((m) => <div key={m.k} className="min-w-0 rounded-[14px] bg-paper px-2.5 py-[11px]"><div className="font-mono text-[8.5px] font-bold tracking-[0.1em] text-ink/45">{m.k}</div><div className="mt-1.5 text-[13px] font-bold leading-[1.3]">{m.v}</div></div>)}
      </div>}
      <div className="text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/60">{v.np.porFecha ? v.E2("Trabaja por fecha: pide la tuya y te mandan el precio por escrito.", "Works by date: ask for yours and get the price in writing.") : v.linea}</div>
      <div className="flex"><Cta v={v} onCta={onCta} block /></div>
    </div>
  );
}
export function NoBarra({ v, onCta }: { v: No; onCta: () => void }) {
  if (v.hoja) return null;
  const sub = v.pro && v.td.length > 1 ? `${v.td[1]!.k} · ${v.td[1]!.v}` : "";
  return (
    <div data-screen-label="Ficha · barra de Noche" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-paper/95 px-5 pb-[22px] pt-[13px] backdrop-blur-[14px] lg:hidden">
      <div className="min-w-0 flex-1">
        <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.02em]">{v.desde}</div>
        {sub && <div className="mt-1.5 truncate font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{sub.toUpperCase()}</div>}
      </div>
      <Cta v={v} onCta={onCta} />
    </div>
  );
}
