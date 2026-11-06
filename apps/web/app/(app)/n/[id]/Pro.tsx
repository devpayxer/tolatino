"use client";
/* Ficha de Profesionales (4k · prototipo neg-pro-listing.js / neg-pro-kind.js: priceFor, notas, hoja con EL TOTAL, licencia de la
   persona). El precio dice el TOTAL: el honorario y lo que se paga al gobierno, por separado. Los legales: «Nadie te garantiza un
   resultado», la licencia y lo que no puede; los no legales: listo en, garantía, presupuesto antes («Nada se cobra sin tu OK»).
   Compuesto con el sistema de diseño (Button, Icon). El servidor decide; el cliente solo muestra. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType, type MouseEvent } from "react";
import { precioPro, usd } from "@/lib/pro-comun";
import type { ProPublico, SvcPro } from "@/lib/pro-publico";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});
const stop = (e?: MouseEvent) => e?.stopPropagation();
const K = "font-mono text-[10px] font-bold tracking-[0.18em] text-ink/45";
const LANG: Record<string, [string, string]> = { es: ["Español", "Spanish"], en: ["English", "English"], pt: ["Português", "Portuguese"], ht: ["Kreyòl", "Haitian Creole"] };

export function usePro(pp: ProPublico | null, es: boolean) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [hoja, setHoja] = useState<string | null>(null);
  if (!pp) return null;
  const nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es), h = pp.h, legal = h.legal;
  const meta = (s: SvcPro) => [{ cons: E2("CONSULTA", "CONSULTATION"), fijo: E2("PRECIO FIJO", "FLAT PRICE"), hora: E2("POR HORA", "HOURLY"), pct: E2("% SOLO SI GANAS", "% ONLY IF YOU WIN"), walk: E2("SIN CITA", "WALK-IN"), cotiza: E2("SE COTIZA", "QUOTED") }[s.k] ?? "",
    s.k !== "walk" && s.k !== "pct" ? `${s.dur} MIN` : "", s.rem ? E2("VIDEO O TELÉFONO", "VIDEO OR PHONE") : ""].filter(Boolean).join(" · ");
  const item = (s: SvcPro) => { const P = precioPro(s, es); return { id: s.id, name: nm(s.name), foto: s.foto, meta: `${meta(s)}${P.s ? ` · ${P.s}` : ""}`, price: P.l, walk: s.k === "walk" }; };
  const secs = [...pp.secciones.map((sc) => ({ title: nm(sc.name).toUpperCase(), items: pp.servicios.filter((s) => s.sec === sc.id).map(item) })),
    { title: E2("OTROS", "OTHER"), items: pp.servicios.filter((s) => !pp.secciones.some((sc) => sc.id === s.sec)).map(item) }].filter((x) => x.items.length);
  const notes: [string, string][] = [];
  if (legal) {
    notes.push(["shield", E2("Nadie te garantiza un resultado. Nadie puede prometerte una visa, una green card, un reembolso ni ganar un caso.", "No one can guarantee a result. No one can promise you a visa, a green card, a refund or winning a case.")]);
    if (pp.lic) notes.push(["law", `${nm(pp.lic.titulo)}${E2(" · verificada por To’Latino en el registro oficial.", " · verified by To’Latino in the official registry.")}`]);
    if (pp.cant) notes.push(["ban", `${E2("No puede: ", "Cannot: ")}${nm(pp.cant)}`]);
    notes.push(["dollar", E2("El precio dice el total: el honorario y lo que se paga al gobierno, por separado.", "The price shows the total: the fee and what goes to the government, separately.")]);
  } else {
    notes.push(["check", h.kind === "seg" ? E2(`Comparan ${h.cos} compañías. El precio final lo pone la compañía, no el agente.`, `They compare ${h.cos} insurers. The final price is set by the insurer, not the agent.`)
      : h.kind === "repair" ? E2("Lo revisan y te dicen el precio antes de arreglar. Nada se cobra sin tu OK.", "They check it and tell you the price before fixing it. Nothing is charged without your OK.")
        : h.kind === "print" ? E2("Te mandan la prueba: nada se imprime sin tu OK.", "They send you a proof: nothing is printed without your OK.")
          : h.est ? E2("Presupuesto antes de empezar. Nada se cobra sin tu OK.", "Estimate before starting. Nothing is charged without your OK.") : E2("Nada se cobra sin tu OK.", "Nothing is charged without your OK.")]);
    if (pp.cant) notes.push(["ban", `${E2("No hace: ", "Does not: ")}${nm(pp.cant)}`]);
  }
  notes.push(["calendar", E2("Booking es una solicitud: la oficina confirma la hora. No se cobra nada al pedirla.", "Booking is a request: the office confirms the time. Nothing is charged when you request it.")]);
  const cons = pp.servicios.find((s) => s.k === "cons"), soloSinCita = pp.servicios.every((s) => s.k === "walk");
  const dl = (n: number) => (n <= 1 ? E2("El mismo día", "Same day") : E2(`${n} días`, `${n} days`));
  const riel = legal
    ? [{ k: E2("LICENCIA", "LICENSE"), v: pp.lic || pp.gente.some((p) => p.lic) ? E2("Verificada", "Verified") : "—" }, { k: E2("CONSULTA", "CONSULTATION"), v: cons ? (cons.cents ? usd(cons.cents) : E2("Gratis", "Free")) : "—" }, { k: E2("PLAN DE PAGOS", "PAYMENT PLAN"), v: h.plan ? E2("Sí", "Yes") : E2("No", "No") }]
    : h.kind === "seg" ? [{ k: E2("COMPAÑÍAS", "INSURERS"), v: String(h.cos) }, { k: E2("COMPARA", "COMPARES"), v: h.cmp ? E2("Sí", "Yes") : E2("No", "No") }, { k: E2("COTIZACIÓN", "QUOTE"), v: cons && !cons.cents ? E2("Gratis", "Free") : "—" }]
      : [{ k: h.kind === "repair" || h.kind === "print" ? E2("LISTO EN", "READY IN") : E2("ENTREGA", "DELIVERY"), v: dl(h.days) }, { k: E2("GARANTÍA", "WARRANTY"), v: h.warr ? E2(`${h.warr} días`, `${h.warr} days`) : "—" }, { k: E2("PRESUPUESTO", "ESTIMATE"), v: h.est ? E2("Antes", "First") : "—" }];
  const precios = pp.servicios.filter((s) => s.k !== "pct" && s.cents > 0).map((s) => s.cents + s.gov);
  const desde = cons && !cons.cents ? E2("Consulta gratis", "Free consultation") : precios.length ? `${E2("Desde ", "From ")}${usd(Math.min(...precios))}` : E2("Servicios", "Services");
  const llamar = () => { if (pp.negocio.telefono) location.href = `tel:${pp.negocio.telefono}`; };
  const llegar = () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pp.negocio.direccion ?? pp.negocio.nombre)}`, "_blank", "noopener");
  return { pp, es, E2, nm, secs, notes, riel, desde, legal, soloSinCita, hoja, abrir: (id: string, e?: MouseEvent) => { stop(e); setHoja(id); }, cerrar: () => setHoja(null), top: pp.servicios.slice(0, 4).map(item), llamar, llegar };
}
export type Pr = NonNullable<ReturnType<typeof usePro>>;

function Fila({ v, it, tarjeta }: { v: Pr; it: Pr["top"][number]; tarjeta?: boolean }) {
  return (
    <div role="button" tabIndex={0} onClick={(e) => v.abrir(it.id, e)} onKeyDown={(e) => { if (e.key === "Enter") v.abrir(it.id); }}
      className={tarjeta ? "flex cursor-pointer items-center gap-[13px] rounded-[18px] border border-ink/[.08] bg-white p-3.5" : "flex cursor-pointer items-center gap-[13px] border-b border-ink/[.07] py-3.5"}>
      <span className="h-14 w-14 flex-none rounded-[15px] bg-photo-bg" style={fondo(it.foto)} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold leading-[1.3]">{it.name}</div>
        <div className="mt-1 font-mono text-[10px] font-semibold leading-[1.4] tracking-[0.04em] text-ink/50">{it.meta}</div>
        <div className="mt-1.5 font-display text-[16px] font-extrabold leading-none tracking-[-0.02em]">{it.price}</div>
      </div>
      <Button variant="soft" size="md" onClick={(e: MouseEvent) => { if (it.walk) { stop(e); v.llegar(); } else v.abrir(it.id, e); }}>{it.walk ? v.E2("Cómo llegar", "Directions") : "Booking"}</Button>
    </div>
  );
}
const Nota = ({ ic, t }: { ic: string; t: string }) => (
  <div className="flex items-start gap-[11px] rounded-2xl bg-action/[.07] px-3.5 py-[13px]"><span className="grid flex-none pt-px"><Icon name={ic} size={17} color="var(--tl-action)" /></span><span className="flex-1 text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/75">{t}</span></div>
);

export function PrTab({ v, desk }: { v: Pr; desk: boolean }) {
  return (
    <div data-screen-label={desk ? "Ficha · servicios · desktop" : "Ficha · servicios"} className={desk ? "flex max-w-[760px] flex-col gap-4 pt-6" : "flex flex-col gap-4 px-5 pt-[18px]"}>
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

/* La hoja del servicio (prof: 1): precio, EL TOTAL, lo que no incluye, ¿con quién? (con su licencia) y la CTA. */
export function PrHoja({ v }: { v: Pr }) {
  const { pp, E2, es, nm } = v;
  const router = useRouter();
  const [con, setCon] = useState("any");
  if (!v.hoja) return null;
  const s = pp.servicios.find((x) => x.id === v.hoja);
  if (!s) return null;
  const P = precioPro(s, es), walk = s.k === "walk";
  const gente = pp.gente.filter((p) => !s.who.length || s.who.includes(p.id));
  const llamar = !walk && !pp.booking;
  const cta = walk ? E2("Cómo llegar", "Directions") : llamar ? (pp.negocio.telefono ? E2("Llama para tu consulta", "Call for your consultation") : E2("Pide tu consulta en la oficina", "Ask at the office")) : E2("Elegir hora", "Choose a time");
  const go = () => { if (walk) return v.llegar(); if (llamar) return v.llamar(); const q = new URLSearchParams({ s: s.id }); if (con !== "any") q.set("c", con); router.push(`/n/${pp.negocio.id}/tramite?${q.toString()}`); };
  return (
    <div data-screen-label="Servicio · Profesionales" className="fixed inset-0 z-[60]">
      <div onClick={v.cerrar} className="absolute inset-0 bg-ink/50" />
      <div role="dialog" aria-modal="true" aria-label={nm(s.name)} className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col overflow-hidden rounded-t-[26px] bg-white lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[86vh] lg:w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
        <div className="flex-1 overflow-y-auto">
          <div className="relative h-[170px] flex-none bg-photo-bg" style={fondo(s.foto ?? pp.negocio.foto)}>
            <button type="button" aria-label={E2("Cerrar", "Close")} onClick={v.cerrar} className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-xl bg-white/[.94]"><Icon name="close" size={15} strokeWidth={2.4} /></button>
          </div>
          <div className="flex flex-col gap-4 px-5 pb-6 pt-[18px]">
            <div>
              <div className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.035em]">{nm(s.name)}</div>
              <div className="mt-[9px] flex flex-wrap items-center gap-2.5"><span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">{P.l}</span><span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/50">{P.s}</span></div>
              {nm(s.desc) && <p className="mt-2.5 text-pretty text-[13px] leading-[1.6] text-ink/65">{nm(s.desc)}</p>}
            </div>
            {s.k === "fijo" && s.gov > 0 && (
              <div data-screen-label="Servicio · el total" className="rounded-2xl border border-ink/[.08] px-4 py-1">
                <div className="pb-1 pt-3 font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("EL TOTAL", "THE TOTAL")}</div>
                {[[E2(`Honorario de ${pp.negocio.nombre}`, `${pp.negocio.nombre} fee`), usd(s.cents)], [E2("Tarifa del gobierno (se paga aparte, a la agencia)", "Government fee (paid separately, to the agency)"), usd(s.gov)]].map(([k, val]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-ink/[.06] py-2.5 text-[13px] font-semibold"><span className="text-ink/70">{k}</span><span>{val}</span></div>))}
                <div className="flex justify-between gap-3 py-3 text-[14px] font-extrabold"><span>Total</span><span>{usd(s.cents + s.gov)}</span></div>
              </div>)}
            {s.k === "pct" && <Nota ic="dollar" t={E2(`Cobra el ${s.cents / 100} % solo si ganas. Si no ganas, no pagas nada.`, `Charges ${s.cents / 100}% only if you win. If you do not win, you pay nothing.`)} />}
            {s.k === "cons" && s.cred && <Nota ic="dollar" t={E2("Si contratas el servicio, la consulta se descuenta del total.", "If you hire the service, the consultation is credited to the total.")} />}
            {s.no.length > 0 && (
              <div className="rounded-2xl bg-pro/[.14] px-3.5 py-3">
                <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-pro-ink">{E2("LO QUE NO INCLUYE", "WHAT IT DOES NOT INCLUDE")}</div>
                {s.no.map((z) => <div key={z.es} className="mt-1.5 text-pretty text-[12.5px] font-semibold leading-[1.5] text-ink/80">{nm(z)}</div>)}
              </div>)}
            {!walk && gente.length > 0 && (
              <div>
                <div className={K}>{E2("¿CON QUIÉN?", "WITH WHOM?")}</div>
                <div role="radiogroup" aria-label={E2("¿Con quién?", "With whom?")} className="mt-2 flex flex-col gap-2">
                  {[{ id: "any", t: E2("Cualquiera", "Anyone"), s: E2("EL PRIMERO LIBRE", "FIRST AVAILABLE") }, ...gente.map((p) => ({ id: p.id, t: p.nombre, s: [p.lic ? nm(p.lic).toUpperCase() : "", p.langs.map((l) => (LANG[l] ?? [l, l])[es ? 0 : 1]).join(" · ").toUpperCase()].filter(Boolean).join(" · ") }))].map((o) => (
                    <button key={o.id} type="button" role="radio" aria-checked={con === o.id} onClick={() => setCon(o.id)} className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${con === o.id ? "border-[1.5px] border-ink" : "border border-ink/10"}`}>
                      <span className={`box-border h-5 w-5 flex-none rounded-full ${con === o.id ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
                      <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{o.t}</span><span className="mt-0.5 block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{o.s}</span></span>
                    </button>))}
                </div>
              </div>)}
            {v.legal && <Nota ic="shield" t={E2("Nadie te garantiza un resultado. Si alguien te lo promete, desconfía.", "No one can guarantee a result. If someone promises one, be wary.")} />}
          </div>
        </div>
        <div className="flex flex-none items-center gap-3.5 border-t border-ink/[.08] bg-white px-4 pb-[22px] pt-3 lg:pb-4">
          <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">TOTAL</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{P.l}</div></div>
          <div className="flex min-w-0 flex-1"><Button block icon={walk ? "pin" : llamar ? "phone" : "calendar"} onClick={go}>{cta}</Button></div>
        </div>
      </div>
    </div>
  );
}

export function PrResumen({ v, desk, onAll }: { v: Pr; desk: boolean; onAll?: () => void }) {
  const { E2, pp, es, nm } = v;
  const facts: [string, string, string][] = v.legal ? [
    ["law", E2("LICENCIA", "LICENSE"), pp.lic ? nm(pp.lic.titulo) : pp.gente.some((p) => p.lic) ? E2("Verificada (de su equipo)", "Verified (team)") : E2("No declaró licencia", "No license declared")],
    ...(pp.cant ? [["ban", E2("NO PUEDE", "CANNOT"), nm(pp.cant)] as [string, string, string]] : []),
    ["language", E2("IDIOMAS", "LANGUAGES"), pp.langs.map((l) => (LANG[l] ?? [l, l])[es ? 0 : 1]).join(" · ")],
    ["card", E2("PAGO", "PAYMENT"), `${E2("En la oficina", "At the office")}${pp.h.plan ? E2(" · plan de pagos", " · payment plan") : ""}`],
  ] : [
    ["clock", E2("LISTO EN", "READY IN"), pp.h.days <= 1 ? E2("El mismo día", "Same day") : E2(`${pp.h.days} días`, `${pp.h.days} days`)],
    ["dollar", E2("PRESUPUESTO", "ESTIMATE"), pp.h.est ? E2("Antes de empezar · nada se cobra sin tu OK", "Before starting · nothing charged without your OK") : E2("Nada se cobra sin tu OK", "Nothing charged without your OK")],
    ["language", E2("IDIOMAS", "LANGUAGES"), pp.langs.map((l) => (LANG[l] ?? [l, l])[es ? 0 : 1]).join(" · ")],
  ];
  const pasos = v.legal ? [E2("Pide una consulta: te dicen qué opciones tienes y cuánto cuesta cada una.", "Book a consultation: they tell you your options and what each costs."), E2("Te dan el total por escrito: el honorario y lo del gobierno, por separado.", "You get the total in writing: the fee and the government fee, separately."),
    E2("Tú decides si lo contratas. Nadie te garantiza un resultado.", "You decide whether to hire. No one can guarantee a result."), E2("Pagas en la oficina; lo del gobierno lo pagas tú a la agencia.", "You pay at the office; the government fee goes from you to the agency.")]
    : [E2("Pide una cita o pasa por el local.", "Book or stop by."), E2("Te dicen el precio antes de empezar.", "They tell you the price before starting."), E2("Nada se cobra sin tu OK.", "Nothing is charged without your OK."), E2("Pagas al recoger o al terminar.", "You pay at pickup or when done.")];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-display text-[18px] font-extrabold leading-[1.1] tracking-[-0.03em] lg:text-[24px] lg:tracking-[-0.035em]">{E2("Servicios", "Services")}</div>
        {onAll && <button type="button" onClick={onAll} className="text-[12.5px] font-bold text-action">{E2("Ver todos", "See all")}</button>}
      </div>
      <div data-screen-label={desk ? "Resumen desktop · servicios" : "Resumen · servicios"} className={desk ? "mt-4 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1.5"}>
        {v.top.map((it) => <Fila key={it.id} v={v} it={it} tarjeta={desk} />)}
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <div data-screen-label="Resumen · datos del profesional" className="rounded-[18px] border border-ink/[.08] bg-white px-4">
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
      </div>
    </div>
  );
}
export function PrRiel({ v, onCta }: { v: Pr; onCta: () => void }) {
  const { E2 } = v;
  return (
    <div data-screen-label="Ficha · Booking · columna" className="flex flex-col gap-4 rounded-[22px] border border-ink/10 bg-white p-[22px] shadow-[0_24px_48px_-34px_rgba(11,14,18,.45)]">
      <div className="font-display text-[28px] font-extrabold leading-none tracking-[-0.04em]">{v.desde}</div>
      <div className="grid grid-cols-3 gap-2">
        {v.riel.map((m) => <div key={m.k} className="min-w-0 rounded-[14px] bg-paper px-2.5 py-[11px]"><div className="font-mono text-[8.5px] font-bold tracking-[0.1em] text-ink/45">{m.k}</div><div className="mt-1.5 text-[13px] font-bold leading-[1.3]">{m.v}</div></div>)}
      </div>
      <div className="text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/60">{v.legal ? E2("Nadie te garantiza un resultado. El precio dice el total.", "No one can guarantee a result. The price shows the total.") : E2("Nada se cobra sin tu OK.", "Nothing is charged without your OK.")}</div>
      <div className="flex">{v.soloSinCita ? <Button icon="pin" block onClick={v.llegar}>{E2("Cómo llegar", "Directions")}</Button> : <Button icon="calendar" block onClick={onCta}>Booking</Button>}</div>
    </div>
  );
}
export function PrBarra({ v, onCta }: { v: Pr; onCta: () => void }) {
  const { E2 } = v;
  if (v.hoja) return null;
  return (
    <div data-screen-label="Ficha · barra de citas" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-paper/95 px-5 pb-[22px] pt-[13px] backdrop-blur-[14px] lg:hidden">
      <div className="min-w-0 flex-1">
        <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.02em]">{v.desde}</div>
        <div className="mt-1.5 truncate font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{`${v.riel[0]!.k} · ${v.riel[0]!.v}`.toUpperCase()}</div>
      </div>
      {v.soloSinCita ? <Button icon="pin" onClick={v.llegar}>{E2("Cómo llegar", "Directions")}</Button> : <Button icon="calendar" onClick={onCta}>Booking</Button>}
    </div>
  );
}
