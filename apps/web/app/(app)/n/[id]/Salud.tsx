"use client";
/* Ficha de Doctores (4i · prototipo neg-salud-listing.js: listingAdd, sheetVals, segVals). Servicios por sección con su precio
   según TU seguro, notas (911, idioma, según ingresos, cómo funciona), «Tu seguro» (lista EN TU CUENTA / SOLO ESTA VISITA y
   formulario), la hoja del servicio (precio con o sin seguro, IMPORTANTE, ¿Con quién?) y la columna / barra. Compuesto con el
   sistema de diseño (Button, Chip, Icon). El servidor decide: la compatibilidad se vuelve a calcular al pedir la cita. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentType, type MouseEvent } from "react";
import type { Seguro } from "@/lib/mis-seguros";
import { compat, nombreSeguro, precioSalud, type SeguroRef } from "@/lib/salud-compat";
import type { SaludPublico, SvcPub } from "@/lib/salud-publico";
import { seguroGuardar, seguroUsar } from "../../cuenta/seguros/acciones";

type N = "Icon" | "Button" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip } = UI as unknown as Record<N, ComponentType<any>>;
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});
const stop = (e?: MouseEvent) => e?.stopPropagation();
const K = "font-mono text-[10px] font-bold tracking-[0.18em] text-ink/45";
const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const TIPOS = [["medicaid", "Medicaid", "Medicaid"], ["medicare", "Medicare", "Medicare"], ["chip", "CHIP (niños)", "CHIP (kids)"], ["priv", "Seguro del trabajo o privado", "Employer or private"], ["none", "No tengo seguro", "No insurance"]] as const;
const PARA = [["yo", "Para mí", "For me"], ["hijo", "Para mi hijo o hija", "For my child"], ["otro", "Para otra persona", "For someone else"]] as const;
const LANG: Record<string, [string, string]> = { es: ["Español", "Spanish"], en: ["English", "English"], pt: ["Português", "Portuguese"], ht: ["Kreyòl", "Haitian Creole"] };
type Seg = SeguroRef & { id: string; last4: string | null; para: string; cuenta: boolean };

export function useSalud(sp: SaludPublico | null, es: boolean) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [hoja, setHoja] = useState<string | null>(null);
  const [segHoja, setSegHoja] = useState(false);
  const [tmp, setTmp] = useState<Seg | null>(null); // «solo esta visita» (sin cuenta)
  const [sel, setSel] = useState<string | null>(null);
  if (!sp) return null;
  const nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const cuenta: Seg[] = sp.segs.map((x: Seguro) => ({ id: x.id, kind: x.kind, insurer: x.insurer, plan: x.plan, last4: x.last4, para: x.para, cuenta: true }));
  const segs = [...cuenta, ...(tmp ? [tmp] : [])];
  const seg = segs.find((x) => x.id === sel) ?? (tmp && !cuenta.length ? tmp : null) ?? cuenta.find((x) => sp.segs.find((y) => y.id === x.id)?.principal) ?? segs[0] ?? null;
  const cp = compat(sp.clinica, seg, sp.cat, es);
  const tg = (k: string) => sp.tags.includes(k);
  const soloSinCita = sp.servicios.every((s) => s.k === "walk");
  const meta = (s: SvcPub) => [{ cons: E2("CONSULTA", "VISIT"), tele: E2("POR VIDEO", "VIDEO"), walk: E2("SIN CITA", "WALK-IN"), free: E2("GRATIS CON TU SEGURO", "FREE WITH INSURANCE"), proc: E2("PRECIO FIJO", "FLAT PRICE") }[s.k] ?? "",
    s.k !== "walk" ? `${s.dur} MIN` : "", s.k === "walk" && sp.espera ? E2(`ESPERA ~${sp.espera.min} MIN AHORA`, `~${sp.espera.min} MIN WAIT NOW`) : ""].filter(Boolean).join(" · ");
  const item = (s: SvcPub) => { const P = precioSalud(s, sp.clinica, seg, es); return { id: s.id, name: nm(s.name), foto: s.foto, meta: `${meta(s)}${P.s ? ` · ${P.s}` : ""}`, price: P.l, walk: s.k === "walk" }; };
  const secs = [...sp.secciones.map((sc) => ({ title: nm(sc.name).toUpperCase(), items: sp.servicios.filter((s) => s.sec === sc.id).map(item) })),
    { title: E2("OTROS", "OTHER"), items: sp.servicios.filter((s) => !sp.secciones.some((sc) => sc.id === s.sec)).map(item) }].filter((x) => x.items.length);
  const notes: [string, string][] = [["emergency", E2("Si es una emergencia, llama al 911. Dolor de pecho, falta de aire, sangrado fuerte o señales de derrame: no esperes una cita.", "If it is an emergency, call 911. Chest pain, trouble breathing, heavy bleeding or stroke signs: do not wait for an appointment.")]];
  if (tg("medesp")) notes.push(["language", E2("El médico habla español. Cada profesional dice sus idiomas en Staff.", "The doctor speaks Spanish. Each provider lists their languages in Staff.")]);
  else if (sp.h.interp) notes.push(["language", E2("Intérprete gratis por teléfono en cada consulta.", "Free phone interpreter at every visit.")]);
  else if (sp.h.langs.includes("es")) notes.push(["language", E2("Personal bilingüe en recepción.", "Bilingual front desk.")]);
  if (sp.h.escala) notes.push(["dollar", E2("Si no tienes seguro, pagas según tus ingresos.", "If uninsured, you pay based on income.") + (sp.h.sinid ? E2(" No piden papeles ni seguro social.", " No papers or SSN required.") : "")]);
  notes.push(["calendar", soloSinCita ? E2("No toma citas: llegas y te atienden por orden. La espera se actualiza aquí.", "No appointments: walk in and you are seen in order. The wait updates here.")
    : !sp.h.nuevos ? E2("Por ahora solo atiende a sus pacientes: si ya eres paciente, pide tu cita aquí.", "For now it only sees its own patients: if you already are one, request your visit here.")
      : E2("Booking es una solicitud: el consultorio revisa tu seguro y confirma la hora.", "Booking is a request: the clinic checks your insurance and confirms the time.")]);
  const insL = sp.h.ins.map((k) => { const c = sp.cat.find((z) => z.key === k); return c ? nm(c.name).replace(/ \(.*\)$/, "") : k; });
  const riel = [soloSinCita || sp.espera ? { k: E2("SIN CITA AHORA", "WALK-IN NOW"), v: sp.espera ? E2(`Espera ~${sp.espera.min} min`, `~${sp.espera.min} min wait`) : E2("Llega y te atienden", "Walk in") } : { k: E2("SEGUROS", "INSURANCE"), v: `${sp.h.ins.length}` },
    { k: E2("SEGUROS", "INSURANCE"), v: insL.slice(0, 2).join(" · ") || "—" },
    tg("medesp") ? { k: E2("IDIOMA", "LANGUAGE"), v: E2("El médico habla español", "Doctor speaks Spanish") } : { k: E2("SIN SEGURO", "UNINSURED"), v: sp.h.sin ? usd(sp.h.cash) : "—" }];
  if (!(soloSinCita || sp.espera)) riel[0] = { k: E2("SIN SEGURO", "UNINSURED"), v: sp.h.sin ? usd(sp.h.cash) : "—" };
  const desde = seg && cp?.ok && !cp.sinSeguro ? E2("Con tu seguro", "With your insurance") : sp.h.sin ? `${E2("Sin seguro ", "Uninsured ")}${usd(sp.h.cash)}` : E2("Servicios", "Services");
  const llamar = () => { if (sp.negocio.telefono) location.href = `tel:${sp.negocio.telefono}`; };
  const llegar = () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(sp.negocio.direccion ?? sp.negocio.nombre)}`, "_blank", "noopener");
  return {
    sp, es, E2, nm, secs, notes, seg, segs, cp, riel, desde, soloSinCita, insL, tg, hoja, abrir: (id: string, e?: MouseEvent) => { stop(e); setHoja(id); }, cerrar: () => setHoja(null),
    segHoja, setSegHoja, setTmp, elegir: (id: string) => setSel(id), top: sp.servicios.slice(0, 4).map(item), llamar, llegar, router,
  };
}
export type Sa = NonNullable<ReturnType<typeof useSalud>>;

/* «Tu seguro» (V.ax.veh): en la pestaña y en la hoja del servicio. */
function TuSeguro({ v }: { v: Sa }) {
  const { E2 } = v, s = v.seg;
  return (
    <button type="button" data-screen-label="Ficha · Tu seguro" onClick={() => v.setSegHoja(true)} className="flex w-full items-center gap-3 rounded-[15px] bg-paper px-3.5 py-[13px] text-left">
      <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-ink"><Icon name="insurance" size={20} color="var(--tl-white)" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{s ? E2("TU SEGURO", "YOUR INSURANCE") : E2("¿ACEPTAN TU SEGURO?", "DO THEY TAKE YOUR INSURANCE?")}</span>
        <span className="mt-1 block text-[14.5px] font-bold leading-[1.3]">{s ? nombreSeguro(s, v.sp.cat, v.es) : E2("Agrega tu seguro", "Add your insurance")}</span>
        {s?.last4 ? <span className="mt-[3px] block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">••• {s.last4}</span>
          : !s ? <span className="mt-[3px] block text-[12px] font-medium leading-[1.45] text-ink/55">{E2("Te decimos si lo aceptan y cuánto pagas en cada servicio.", "We tell you if they take it and what you pay for each service.")}</span> : null}
        {v.cp && <span className="mt-1.5 flex items-center gap-[5px] text-[11.5px] font-bold" style={{ color: v.cp.ok ? "var(--tl-open-text)" : "var(--tl-pro-ink)" }}><Icon name={v.cp.ok ? "check" : "warning"} size={13} color="currentColor" />{v.cp.t}</span>}
      </span>
      <span className="flex-none text-[12.5px] font-bold text-action">{s ? E2("Cambiar", "Change") : E2("Agregar", "Add")}</span>
    </button>
  );
}

function Fila({ v, it, tarjeta }: { v: Sa; it: Sa["top"][number]; tarjeta?: boolean }) {
  const cta = it.walk ? v.E2("Cómo llegar", "Directions") : "Booking";
  return (
    <div role="button" tabIndex={0} onClick={(e) => v.abrir(it.id, e)} onKeyDown={(e) => { if (e.key === "Enter") v.abrir(it.id); }}
      className={tarjeta ? "flex cursor-pointer items-center gap-[13px] rounded-[18px] border border-ink/[.08] bg-white p-3.5" : "flex cursor-pointer items-center gap-[13px] border-b border-ink/[.07] py-3.5"}>
      <span className="h-14 w-14 flex-none rounded-[15px] bg-photo-bg" style={fondo(it.foto)} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold leading-[1.3]">{it.name}</div>
        <div className="mt-1 font-mono text-[10px] font-semibold leading-[1.4] tracking-[0.04em] text-ink/50">{it.meta}</div>
        <div className="mt-1.5 font-display text-[16px] font-extrabold leading-none tracking-[-0.02em]">{it.price}</div>
      </div>
      <Button variant="soft" size="md" onClick={(e: MouseEvent) => { if (it.walk) { stop(e); v.llegar(); } else v.abrir(it.id, e); }}>{cta}</Button>
    </div>
  );
}

export function SaTab({ v, desk }: { v: Sa; desk: boolean }) {
  return (
    <div data-screen-label={desk ? "Ficha · servicios · desktop" : "Ficha · servicios"} className={desk ? "flex max-w-[760px] flex-col gap-4 pt-6" : "flex flex-col gap-4 px-5 pt-[18px]"}>
      <TuSeguro v={v} />
      {v.notes.map(([ic, t]) => (
        <div key={t} className={`flex items-start gap-[11px] rounded-2xl px-3.5 py-[13px] ${ic === "emergency" ? "bg-danger/[.07]" : "bg-action/[.07]"}`}>
          <span className="grid flex-none pt-px"><Icon name={ic} size={17} color={ic === "emergency" ? "var(--tl-danger)" : "var(--tl-action)"} /></span>
          <span className="flex-1 text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/75">{t}</span>
        </div>
      ))}
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

/* La hoja del servicio (sheetVals, salud: 1). */
export function SaHoja({ v }: { v: Sa }) {
  const { sp, E2, es, nm } = v;
  const [con, setCon] = useState<string>("any");
  if (!v.hoja) return null;
  const s = sp.servicios.find((x) => x.id === v.hoja);
  if (!s) return null;
  const P = precioSalud(s, sp.clinica, v.seg, es), walk = s.k === "walk";
  const docs = sp.gente.filter((p) => !s.who.length || s.who.includes(p.id));
  const habla = (p: { langs: string[] }) => (p.langs.includes("es") ? E2("HABLA ESPAÑOL", "SPEAKS SPANISH") : sp.h.interp ? E2("HABLA INGLÉS · INTÉRPRETE GRATIS", "SPEAKS ENGLISH · FREE INTERPRETER") : p.langs.map((l) => (LANG[l] ?? [l, l])[es ? 0 : 1]).join(" · ").toUpperCase());
  const llamar = !walk && (!sp.can || !sp.booking);
  const cta = walk ? E2("Cómo llegar", "Directions") : llamar ? (sp.negocio.telefono ? E2("Llama para tu cita", "Call to book") : E2("Pide tu cita en el consultorio", "Book at the clinic")) : s.k === "tele" ? E2("Elegir hora del video", "Choose video time") : E2("Elegir hora", "Choose a time");
  const go = () => {
    if (walk) return v.llegar();
    if (llamar) return v.llamar();
    const q = new URLSearchParams({ s: s.id }); if (con !== "any") q.set("c", con); if (v.seg && v.seg.cuenta) q.set("seg", v.seg.id);
    v.router.push(`/n/${sp.negocio.id}/cita?${q.toString()}`);
  };
  const pagoT = P.l === "$0" ? E2("Con tu seguro no pagas esta consulta. Lleva tu tarjeta del seguro.", "With your insurance you do not pay for this visit. Bring your insurance card.")
    : P.l === E2("Copago", "Copay") ? E2("Pagas tu copago en la consulta. Nada se cobra antes.", "You pay your copay at the visit. Nothing is charged before.")
      : E2("Pagas en la consulta. Nada se cobra antes.", "You pay at the visit. Nothing is charged before.");
  return (
    <div data-screen-label="Servicio · Salud" className="fixed inset-0 z-[60]">
      <div onClick={v.cerrar} className="absolute inset-0 bg-ink/50" />
      <div role="dialog" aria-modal="true" aria-label={nm(s.name)} className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col overflow-hidden rounded-t-[26px] bg-white lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[86vh] lg:w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
        <div className="flex-1 overflow-y-auto">
          <div className="relative h-[180px] flex-none bg-photo-bg" style={fondo(s.foto ?? sp.negocio.foto)}>
            <button type="button" aria-label={E2("Cerrar", "Close")} onClick={v.cerrar} className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-xl bg-white/[.94]"><Icon name="close" size={15} strokeWidth={2.4} /></button>
          </div>
          <div className="flex flex-col gap-4 px-5 pb-6 pt-[18px]">
            <div>
              <div className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.035em]">{nm(s.name)}</div>
              <div className="mt-[9px] flex flex-wrap items-center gap-2.5"><span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">{P.l}</span>{P.s && <span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/50">{P.s}</span>}</div>
              {nm(s.desc) && <p className="mt-2.5 text-pretty text-[13px] leading-[1.6] text-ink/65">{nm(s.desc)}</p>}
            </div>
            {s.no.length > 0 && (
              <div className="rounded-2xl bg-pro/[.14] px-3.5 py-3">
                <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-pro-ink">{E2("IMPORTANTE", "IMPORTANT")}</div>
                {s.no.map((z) => <div key={z.es} className="mt-1.5 text-pretty text-[12.5px] font-semibold leading-[1.5] text-ink/80">{nm(z)}</div>)}
              </div>)}
            {!walk && <TuSeguro v={v} />}
            {!walk && docs.length > 0 && (
              <div>
                <div className={K}>{E2("¿CON QUIÉN?", "WITH WHOM?")}</div>
                <div role="radiogroup" aria-label={E2("¿Con quién?", "With whom?")} className="mt-2 flex flex-col gap-2">
                  {[{ id: "any", t: E2("Cualquiera", "Anyone"), s: E2("EL PRIMERO LIBRE", "FIRST AVAILABLE") }, ...docs.map((p) => ({ id: p.id, t: p.nombre, s: `${p.lic ? nm(p.lic).toUpperCase() + " · " : ""}${habla(p)}` }))].map((o) => (
                    <button key={o.id} type="button" role="radio" aria-checked={con === o.id} onClick={() => setCon(o.id)} className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${con === o.id ? "border-[1.5px] border-ink" : "border border-ink/10"}`}>
                      <span className={`box-border h-5 w-5 flex-none rounded-full ${con === o.id ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
                      <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{o.t}</span><span className="mt-0.5 block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{o.s}</span></span>
                    </button>))}
                </div>
              </div>)}
            <div className="flex items-start gap-[11px] rounded-2xl bg-paper px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="card" size={16} color="rgba(11,14,18,.55)" /></span><span className="flex-1 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/70">{walk ? (sp.espera ? E2(`Sin cita: llegas y te atienden por orden. Espera ahora ~${sp.espera.min} min.`, `Walk-in: you are seen in order. Wait now ~${sp.espera.min} min.`) : E2("Sin cita: llegas y te atienden por orden.", "Walk-in: you are seen in order.")) : pagoT}</span></div>
          </div>
        </div>
        <div className="flex flex-none items-center gap-3.5 border-t border-ink/[.08] bg-white px-4 pb-[22px] pt-3 lg:pb-4">
          <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{v.seg && !v.cp?.sinSeguro && v.cp?.ok ? E2("CON TU SEGURO", "WITH YOUR INSURANCE") : E2("SIN SEGURO", "UNINSURED")}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{P.l}</div></div>
          <div className="flex min-w-0 flex-1"><Button block icon={walk ? "pin" : llamar ? "phone" : "calendar"} onClick={go}>{cta}</Button></div>
        </div>
      </div>
    </div>
  );
}

/* «Tu seguro» (segVals): lista (EN TU CUENTA / SOLO ESTA VISITA) o formulario. */
export function SaSeguro({ v }: { v: Sa }) {
  const { sp, E2, es } = v;
  const [modo, setModo] = useState<"list" | "form">(v.segs.length ? "list" : "form");
  const [f, setF] = useState({ kind: "", plan: "", num: "", para: "yo" });
  const [err, setErr] = useState(""), [busy, start] = useTransition();
  if (!v.segHoja) return null;
  const pubs = sp.cat.filter((c) => c.kind === "pub"), privs = sp.cat.filter((c) => c.kind === "priv");
  const planes = f.kind === "priv" ? privs.map((p) => ({ key: p.key, l: es ? p.name.es : p.name.en })) : (pubs.find((p) => p.key === f.kind)?.plans ?? []).map((p) => ({ key: p.key, l: es ? p.name.es : p.name.en }));
  const can = !!f.kind && (f.kind === "none" || (f.kind === "priv" ? !!f.plan : !planes.length || !!f.plan));
  const cerrar = () => v.setSegHoja(false);
  const guardar = () => {
    if (!can) return;
    setErr("");
    if (!sp.sesion) { // sin cuenta: solo para esta visita (no se guarda en ningún lado)
      v.setTmp({ id: "tmp", kind: f.kind as SeguroRef["kind"], insurer: f.kind === "priv" ? f.plan : f.kind === "none" ? null : f.kind, plan: f.kind === "priv" || f.kind === "none" ? null : f.plan || null, last4: f.num ? f.num.slice(-4).toUpperCase() : null, para: f.para, cuenta: false });
      v.elegir("tmp"); cerrar(); return;
    }
    start(async () => {
      const r = await seguroGuardar({ kind: f.kind, plan: f.plan || null, num: f.num || null, para: f.para }).catch(() => null);
      if (!r || !r.ok) { setErr(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo guardar.", "Could not save.")); return; }
      await seguroUsar(r.id).catch(() => null); v.elegir(r.id); cerrar(); v.router.refresh();
    });
  };
  const usar = (x: Seg) => { v.elegir(x.id); if (x.cuenta) start(async () => { await seguroUsar(x.id).catch(() => null); v.router.refresh(); }); };
  const lista = modo === "list" && v.segs.length > 0;
  const para = (p: string) => { const x = PARA.find((z) => z[0] === p); return x ? (es ? x[1] : x[2]) : ""; };
  return (
    <div data-screen-label="Tu seguro" className="fixed inset-0 z-[70]">
      <div onClick={cerrar} className="absolute inset-0 bg-ink/50" />
      <div role="dialog" aria-modal="true" aria-label={E2("Tu seguro", "Your insurance")} className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col overflow-hidden rounded-t-[26px] bg-white lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[86vh] lg:w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
        <div className="flex items-start gap-3 border-b border-ink/[.07] px-5 pb-3.5 pt-5">
          <div className="min-w-0 flex-1"><div className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{E2("Tu seguro", "Your insurance")}</div><div className="mt-1 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2("Te decimos en cada consultorio si lo aceptan y cuánto pagas.", "We tell you at every clinic whether they take it and what you pay.")}</div></div>
          <button type="button" aria-label={E2("Cerrar", "Close")} onClick={cerrar} className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {err && <div role="alert" className="rounded-[12px] bg-danger/[.08] px-3 py-2.5 text-[12.5px] font-semibold text-danger">{err}</div>}
          {lista ? (<>
            <div role="radiogroup" aria-label={E2("Tus seguros", "Your insurance")} className="flex flex-col gap-2">
              {v.segs.map((x) => { const on = v.seg?.id === x.id; return (
                <button key={x.id} type="button" role="radio" aria-checked={on} onClick={() => usar(x)} className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"}`}>
                  <span className={`box-border h-5 w-5 flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
                  <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{nombreSeguro(x, sp.cat, es)}</span><span className="mt-0.5 block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{[x.last4 ? `••• ${x.last4}` : "", para(x.para)].filter(Boolean).join(" · ").toUpperCase()}</span></span>
                  <span className="flex-none font-mono text-[8.5px] font-bold tracking-[0.1em] text-open-text">{x.cuenta ? E2("EN TU CUENTA", "IN YOUR ACCOUNT") : E2("SOLO ESTA VISITA", "THIS VISIT ONLY")}</span>
                </button>); })}
            </div>
            <div className="flex"><Button variant="secondary" icon="plus" onClick={() => setModo("form")}>{E2("Agregar otro seguro", "Add another insurance")}</Button></div>
          </>) : (<>
            {v.segs.length > 0 && <button type="button" onClick={() => setModo("list")} className="inline-flex items-center gap-1.5 self-start text-[12.5px] font-bold text-action"><Icon name="chevronLeft" size={14} />{E2("Tus seguros", "Your insurance")}</button>}
            <div><div className={K}>{E2("TU SEGURO", "YOUR INSURANCE")}</div><div className="mt-2 flex flex-wrap gap-2">{TIPOS.map(([k, a, b]) => <Chip key={k} variant={f.kind === k ? "selected" : "filter"} onClick={() => setF({ ...f, kind: f.kind === k ? "" : k, plan: "" })}>{es ? a : b}</Chip>)}</div>
              {f.kind === "none" && <div className="mt-2 rounded-[12px] bg-pro/[.14] px-3 py-2.5 text-[12px] font-semibold leading-[1.5] text-pro-ink">{E2("Cada consultorio dice su precio sin seguro. Algunos cobran según tus ingresos o no piden papeles.", "Each clinic shows its uninsured price. Some charge by income or ask for no papers.")}</div>}</div>
            {f.kind && f.kind !== "none" && planes.length > 0 && <div><div className={K}>{f.kind === "priv" ? E2("COMPAÑÍA", "COMPANY") : E2("PLAN", "PLAN")}</div><div className="mt-2 flex flex-wrap gap-2">{planes.map((p) => <Chip key={p.key} variant={f.plan === p.key ? "selected" : "filter"} onClick={() => setF({ ...f, plan: f.plan === p.key ? "" : p.key })}>{p.l}</Chip>)}</div></div>}
            {f.kind && f.kind !== "none" && <div><div className={K}>{E2("NÚMERO DE MIEMBRO · OPCIONAL", "MEMBER ID · OPTIONAL")}</div><input aria-label={E2("Número de miembro", "Member ID")} value={f.num} onChange={(e) => setF({ ...f, num: e.target.value.replace(/[^0-9A-Za-z]/g, "").slice(0, 20) })} placeholder={E2("Está en tu tarjeta", "It is on your card")} className="mt-2 box-border h-11 w-full rounded-[13px] border border-ink/[.12] px-3.5 font-mono text-[13.5px] font-bold outline-none" />
              <div className="mt-1.5 text-[11.5px] font-medium leading-[1.45] text-ink/55">{E2("Guardamos solo los últimos 4. Los ve el consultorio que confirma tu cita.", "We keep only the last 4. The clinic that confirms your visit sees them.")}</div></div>}
            <div><div className={K}>{E2("¿PARA QUIÉN ES?", "WHO IS IT FOR?")}</div><div className="mt-2 flex flex-wrap gap-2">{PARA.map(([k, a, b]) => <Chip key={k} variant={f.para === k ? "selected" : "filter"} onClick={() => setF({ ...f, para: k })}>{es ? a : b}</Chip>)}</div></div>
            {!sp.sesion && <div className="text-pretty text-[12px] font-medium leading-[1.5] text-ink/55">{E2("Sin cuenta, lo usamos solo en esta visita. Entra para guardarlo.", "Without an account, we use it only on this visit. Sign in to save it.")}</div>}
          </>)}
          <div className="flex items-start gap-[11px] rounded-2xl bg-action/[.07] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="lock" size={16} color="var(--tl-action)" /></span><span className="flex-1 text-pretty text-[12px] font-medium leading-[1.5] text-ink/70">{E2("To’Latino no ve tu historial médico. Tu seguro solo se usa para decirte si lo aceptan y cuánto pagas.", "To’Latino never sees your medical records. Your insurance is only used to tell you if it is accepted and what you pay.")}</span></div>
        </div>
        <div className="flex flex-none border-t border-ink/[.08] px-4 pb-[22px] pt-3 lg:pb-4">{lista ? <Button block onClick={cerrar}>{E2("Listo", "Done")}</Button> : <Button block disabled={!can || busy} onClick={guardar}>{busy ? E2("Guardando…", "Saving…") : E2("Guardar seguro", "Save insurance")}</Button>}</div>
      </div>
    </div>
  );
}

export function SaResumen({ v, desk, onAll }: { v: Sa; desk: boolean; onAll?: () => void }) {
  const { E2 } = v;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-display text-[18px] font-extrabold leading-[1.1] tracking-[-0.03em] lg:text-[24px] lg:tracking-[-0.035em]">{E2("Servicios", "Services")}</div>
        {onAll && <button type="button" onClick={onAll} className="text-[12.5px] font-bold text-action">{E2("Ver todos", "See all")}</button>}
      </div>
      {v.sp.espera && (
        <div data-screen-label="Resumen · sin cita ahora" className="mt-3 flex items-center gap-3 rounded-[16px] bg-signal/[.12] px-3.5 py-3">
          <Icon name="clock" size={18} color="var(--tl-open-text)" />
          <div className="min-w-0 flex-1"><div className="font-mono text-[9px] font-bold tracking-[0.14em] text-open-text">{E2("SIN CITA · AHORA", "WALK-IN · NOW")}</div><div className="mt-1 text-[14px] font-bold">{E2(`Espera ~${v.sp.espera.min} min`, `~${v.sp.espera.min} min wait`)}</div><div className="text-[11.5px] font-medium text-ink/60">{E2("Si es grave, llama al 911.", "If it is serious, call 911.")}</div></div>
          <span className="flex-none font-mono text-[9px] font-bold tracking-[0.08em] text-ink/45">{E2(`HACE ${v.sp.espera.hace} MIN`, `${v.sp.espera.hace} MIN AGO`)}</span>
        </div>)}
      <div data-screen-label={desk ? "Resumen desktop · servicios" : "Resumen · servicios"} className={desk ? "mt-4 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1.5"}>
        {v.top.map((it) => <Fila key={it.id} v={v} it={it} tarjeta={desk} />)}
      </div>
      <SaDatos v={v} />
    </div>
  );
}

/* Hechos (SEGUROS · SIN SEGURO · IDIOMAS · PAGO) y «Cómo funciona» en 4 pasos (listingAdd facts / how). */
function SaDatos({ v }: { v: Sa }) {
  const { E2, sp, es } = v;
  const idiomas = v.tg("medesp") ? E2("El médico habla español · English", "Doctor speaks Spanish · English") : sp.h.interp ? E2("Inglés · intérprete gratis", "English · free interpreter") : sp.h.langs.map((l) => (LANG[l] ?? [l, l])[es ? 0 : 1]).join(" · ");
  const facts: [string, string, string][] = [
    ["insurance", E2("SEGUROS", "INSURANCE"), v.insL.join(" · ") || E2("Pregunta en recepción", "Ask the front desk")],
    ["dollar", E2("SIN SEGURO", "UNINSURED"), `${sp.h.sin ? E2(`Consulta ${usd(sp.h.cash)}`, `Visit ${usd(sp.h.cash)}`) : "—"}${sp.h.escala ? E2(" · según tus ingresos", " · income-based") : ""}`],
    ["language", E2("IDIOMAS", "LANGUAGES"), idiomas],
    ["card", E2("PAGO", "PAYMENT"), E2("Copago o precio en la consulta", "Copay or price at the visit")],
  ];
  const pasos = [E2("Agrega tu seguro: te decimos si lo aceptan y cuánto pagas.", "Add your insurance: we tell you if they take it and what you pay."), E2("Si no lo aceptan o no tienes, ves el precio sin seguro antes de pedir la cita.", "If they do not take it or you have none, you see the uninsured price before booking."),
    E2("La cita es una solicitud: el consultorio revisa tu seguro y confirma.", "The visit is a request: the clinic checks your insurance and confirms."), E2("Pagas el copago o el precio en la consulta. Nada se cobra antes.", "You pay the copay or price at the visit. Nothing is charged before.")];
  return (
    <div className="mt-6 flex flex-col gap-4">
      <div data-screen-label="Resumen · datos de salud" className="rounded-[18px] border border-ink/[.08] bg-white px-4">
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
        <div className="mt-3 text-pretty text-[12px] font-medium leading-[1.5] text-ink/55">{E2("To’Latino no da consejo médico. Aquí ves qué seguros aceptan, el precio sin seguro y quién habla español. Si es una emergencia, llama al 911.", "To’Latino does not give medical advice. Here you see which insurance they take, the uninsured price and who speaks Spanish. If it is an emergency, call 911.")}</div>
      </div>
    </div>
  );
}
export function SaRiel({ v, onCta }: { v: Sa; onCta: () => void }) {
  const { E2 } = v;
  return (
    <div data-screen-label="Ficha · Booking · columna" className="flex flex-col gap-4 rounded-[22px] border border-ink/10 bg-white p-[22px] shadow-[0_24px_48px_-34px_rgba(11,14,18,.45)]">
      <div className="font-display text-[28px] font-extrabold leading-none tracking-[-0.04em]">{v.desde}</div>
      <TuSeguro v={v} />
      <div className="grid grid-cols-3 gap-2">
        {v.riel.map((m) => <div key={m.k} className="min-w-0 rounded-[14px] bg-paper px-2.5 py-[11px]"><div className="font-mono text-[8.5px] font-bold tracking-[0.1em] text-ink/45">{m.k}</div><div className="mt-1.5 text-[13px] font-bold leading-[1.3]">{m.v}</div></div>)}
      </div>
      <div className="text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/60">{E2("To’Latino no da consejo médico. ", "To’Latino does not give medical advice. ")}{v.soloSinCita ? E2("Ve directo: no hace falta cita.", "Just walk in.") : E2("Booking es una solicitud: el consultorio revisa tu seguro y confirma.", "Booking is a request: the clinic checks your insurance and confirms.")}</div>
      <div className="flex">{v.soloSinCita ? <Button icon="pin" block onClick={v.llegar}>{E2("Cómo llegar", "Directions")}</Button> : <Button icon="calendar" block onClick={onCta}>Booking</Button>}</div>
    </div>
  );
}
export function SaBarra({ v, onCta }: { v: Sa; onCta: () => void }) {
  const { E2 } = v;
  if (v.hoja || v.segHoja) return null;
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
