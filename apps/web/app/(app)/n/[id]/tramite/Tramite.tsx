"use client";
/* APP-NEG-PRO-BOOKING · móvil y desktop (neg-pro-flow.js): 1 Tu trámite (¿puede hacerlo por ley?, cómo quieres la consulta,
   tu situación, nota) → 2 Día y hora (con quién: con su licencia) → 3 Revisa y envía (hoy $0; cómo se paga según la forma de
   cobrar; nadie te garantiza un resultado). Nada se cobra en la app. El servidor decide horas y precio. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { HorasSalud } from "@/lib/citas-salud";
import { precioPro, usd } from "@/lib/pro-comun";
import type { ProPublico } from "@/lib/pro-publico";
import { horasDeTramite, pedirTramite } from "./acciones";
import { uuid } from "@/lib/uuid";

type N = "Icon" | "Button" | "Chip" | "StepHeader" | "DateStrip" | "TimeSlots";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, StepHeader, DateStrip, TimeSlots } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const horaL = (m: number) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const DOW = { es: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"], en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] };
const DL = { es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const MODO = [["oficina", "En la oficina", "At the office"], ["video", "Por video", "By video"], ["telefono", "Por teléfono", "By phone"]] as const;
const SIT = [["primera", "Primera vez", "First time"], ["caso", "Ya tengo un caso", "I already have a case"], ["carta", "Me llegó una carta", "I got a letter"], ["fecha", "Tengo fecha límite", "I have a deadline"]] as const;

export function Tramite({ pp, svcId, con0, es, yo }: { pp: ProPublico; svcId: string; con0: string; es: boolean; yo: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const s = pp.servicios.find((x) => x.id === svcId)!, nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es), legal = pp.h.legal;
  const [modo, setModo] = useState<string>(s.rem ? "" : "oficina"), [sit, setSit] = useState<string | null>(null), [nota, setNota] = useState("");
  const [con, setCon] = useState(con0), [paso, setPaso] = useState(0), [i, setI] = useState(0), [hSel, setH] = useState<number | null>(null), [H, setHoras] = useState<HorasSalud | null>(null), [cargando, setCargando] = useState(true);
  const [sms, setSms] = useState(true), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const clave = useRef(uuid());
  const remoto = modo === "video" || modo === "telefono";
  useEffect(() => { let vivo = true; setCargando(true); void horasDeTramite(pp.negocio.id, s.id, con, i, remoto).then((x) => { if (!vivo) return; setHoras(x); setCargando(false); if (x && i === 0 && !x.sl.some((h) => h.free) && x.sig) setI(x.sig.i); }); return () => { vivo = false; }; }, [pp.negocio.id, s.id, con, i, remoto]);

  const P = precioPro(s, es), gente = pp.gente.filter((p) => !s.who.length || s.who.includes(p.id)), prof = con !== "any" ? gente.find((p) => p.id === con) ?? null : null;
  const licL = prof?.lic ? nm(prof.lic) : pp.lic ? nm(pp.lic.titulo) : (() => { const g = gente.find((p) => p.lic)?.lic; return g ? nm(g) : null; })();
  const ymd = H?.dias[i]?.ymd ?? "", diaL = ymd ? `${(es ? DL.es : DL.en)[new Date(`${ymd}T12:00:00Z`).getUTCDay()]} ${Number(ymd.slice(8))}` : "";
  const dias = (H?.dias ?? []).map((d) => ({ id: `d${d.i}`, dow: d.i === 0 ? E2("HOY", "TODAY") : (es ? DOW.es : DOW.en)[d.dow], num: d.num, off: d.off }));
  const slots = (H?.sl ?? []).map((h) => ({ t: horaL(h.m), taken: !h.free, m: h.m })), hayLibres = slots.some((x) => !x.taken);
  const cuandoL = hSel != null ? `${cap(diaL)} · ${horaL(hSel)}` : E2("Elige día y hora", "Choose day and time");
  const ok0 = !!modo, ok1 = hSel != null, listo = ok0 && ok1, okPaso = paso === 0 ? ok0 : paso === 1 ? ok1 : listo;
  const falta = !modo ? E2("Elige cómo quieres la consulta", "Choose how you want the consultation") : hSel == null ? E2("Elige día y hora", "Choose day and time") : "";
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  const volver = () => router.push(`/n/${pp.negocio.id}?tab=svc`);
  const enviar = async () => {
    if (!listo || ocupado || hSel == null) return;
    if (!yo) return entrar();
    setOcupado(true); setError(null);
    const r = await pedirTramite(pp.negocio.id, { svc: s.id, con, i, m: hSel, modo, sit, nota, sms, clave: clave.current })
      .catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    if (r.ok) { router.push(`/cita/${r.numero}`); return; }
    if ("entrar" in r && r.entrar) return entrar();
    setError(es ? r.msg.es : r.msg.en); setOcupado(false);
    if ("hora" in r && r.hora) { setH(null); setPaso(1); void horasDeTramite(pp.negocio.id, s.id, con, i, remoto).then(setHoras); }
  };
  const sigue = () => { if (!okPaso) return; if (paso === 2) return void enviar(); setPaso(paso + 1); window.scrollTo({ top: 0 }); };
  const T = [E2("Tu trámite", "Your case"), E2("Día y hora", "Day and time"), E2("Revisa y envía", "Review and send")];
  const radio = (on: boolean, t: string, sub: string, onClick: () => void, key: string) => (
    <button key={key} type="button" role="radio" aria-checked={on} onClick={onClick} className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"}`}>
      <span className={`box-border h-5 w-5 flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
      <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{t}</span>{sub && <span className="mt-0.5 block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{sub}</span>}</span>
    </button>
  );
  const bloque0 = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      {legal && (
        <div className="rounded-[14px] bg-paper px-3.5 py-3">
          <div className={K}>{E2("¿PUEDE HACERLO POR LEY?", "ARE THEY ALLOWED BY LAW?")}</div>
          <div className="mt-1.5 text-[13.5px] font-bold">{licL ? `${licL} · ${E2("verificada", "verified")}` : E2("No declaró licencia", "No license declared")}</div>
          {pp.cant && <div className="mt-1 text-[12px] font-medium text-ink/60">{E2("No puede: ", "Cannot: ")}{nm(pp.cant)}</div>}
        </div>)}
      <div><div className={K}>{E2("¿CÓMO QUIERES LA CONSULTA?", "HOW DO YOU WANT THE CONSULTATION?")}</div>
        <div className="mt-2 flex flex-wrap gap-2">{MODO.filter(([k]) => k === "oficina" || s.rem).map(([k, a, b]) => <Chip key={k} variant={modo === k ? "selected" : "filter"} onClick={() => { setModo(k); setH(null); }}>{es ? a : b}</Chip>)}</div></div>
      {legal && <div><div className={K}>{E2("¿QUÉ PASA CON TU TRÁMITE? · OPCIONAL", "WHAT IS GOING ON WITH YOUR CASE? · OPTIONAL")}</div>
        <div className="mt-2 flex flex-wrap gap-2">{SIT.map(([k, a, b]) => <Chip key={k} variant={sit === k ? "selected" : "filter"} onClick={() => setSit(sit === k ? null : k)}>{es ? a : b}</Chip>)}</div>
        {sit === "fecha" && <div className="mt-2 rounded-[12px] bg-pro/[.14] px-3 py-2.5 text-[12px] font-semibold leading-[1.5] text-pro-ink">{E2("Escribe la fecha límite en la nota. Si es en menos de 3 días, llama también a la oficina.", "Write the deadline in the note. If it is within 3 days, also call the office.")}</div>}</div>}
      <div>
        <div className="flex justify-between gap-2.5"><span className={K}>{E2("NOTA PARA LA OFICINA · OPCIONAL", "NOTE FOR THE OFFICE · OPTIONAL")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{nota.length}/300</span></div>
        <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 300))} rows={3} aria-label={E2("Nota para la oficina", "Note for the office")} placeholder={E2("Ej.: es para renovar; vence en noviembre", "E.g. it is a renewal; it expires in November")} className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] outline-none" />
        <div className="mt-1.5 text-[11.5px] font-medium leading-[1.45] text-ink/55">{E2("Solo lo ve la oficina; nunca sale en reseñas. No escribas números de caso, A-number ni documentos. Se borra 30 días después.", "Only the office sees it; never in reviews. Do not write case numbers, A-numbers or documents. Deleted 30 days later.")}</div>
      </div>
    </div>
  );
  const bloque1 = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      {gente.length > 0 && <div><div className={K}>{E2("¿CON QUIÉN?", "WITH WHOM?")}</div>
        <div role="radiogroup" aria-label={E2("¿Con quién?", "With whom?")} className="mt-2 flex flex-col gap-2">
          {[{ id: "any", t: E2("Cualquiera", "Anyone"), s: E2("EL PRIMERO LIBRE", "FIRST AVAILABLE") }, ...gente.map((p) => ({ id: p.id, t: p.nombre, s: p.lic ? nm(p.lic).toUpperCase() : "" }))].map((o) => radio(con === o.id, o.t, o.s, () => { setCon(o.id); setH(null); }, o.id))}
        </div></div>}
      <div><div className={K}>{E2("DÍA", "DAY")}</div><div className="mt-[11px] grid min-w-0">{dias.length ? <DateStrip days={dias} selected={`d${i}`} onSelect={(id: string) => { setI(Number(id.slice(1))); setH(null); }} /> : <div className="h-[66px]" />}</div></div>
      {cargando && !H ? <div className="h-24 animate-pulse rounded-[15px] bg-paper" /> : hayLibres ? (
        <div aria-busy={cargando}><div className={K}>{E2("HORA", "TIME")}</div><div className="mt-[9px] grid"><TimeSlots slots={slots.map(({ t, taken }) => ({ t, taken }))} selected={hSel != null ? horaL(hSel) : ""} onSelect={(t: string) => { const x = slots.find((z) => z.t === t && !z.taken); if (x) setH(x.m); }} /></div></div>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-[15px] bg-paper px-[15px] py-3.5">
          <div className="text-[13.5px] font-bold leading-[1.4]">{H ? E2("Ese día no hay consulta. Elige otro.", "No consultations that day. Pick another.") : E2("No hay horas para pedir en línea. Llama a la oficina.", "No times to book online. Call the office.")}</div>
          {H?.sig && <button type="button" onClick={() => { setI(H.sig!.i); setH(null); }} className="text-left text-[12.5px] font-bold text-action">{E2(`Ver el siguiente día libre · desde las ${horaL(H.sig.m)}`, `See the next open day · from ${horaL(H.sig.m)}`)}</button>}
        </div>)}
      {hSel != null && <div className="text-[12.5px] font-bold">{cuandoL}</div>}
    </div>
  );
  const modoL = MODO.find((z) => z[0] === modo)?.[es ? 1 : 2] ?? "—";
  const filas: [string, string][] = [[E2("SERVICIO", "SERVICE"), nm(s.name)], [E2("CUÁNDO", "WHEN"), cuandoL], [E2("CÓMO", "HOW"), modoL], [E2("CON", "WITH"), prof?.nombre ?? E2("El primero libre", "First available")],
    ...(licL ? [[E2("LICENCIA", "LICENSE"), licL] as [string, string]] : []), [E2("DÓNDE", "WHERE"), remoto ? E2("El enlace o la llamada te llegan a tus Avisos", "The link or call arrives in your Alerts") : pp.negocio.direccion ?? pp.negocio.nombre]];
  const como: [string, string][] = [[E2("Hoy, al enviar", "Today, when you send"), "$0"],
    ...(s.k === "cons" ? [[E2("La consulta, en la oficina", "The consultation, at the office"), s.cents ? usd(s.cents) : E2("Gratis", "Free")] as [string, string]] : []),
    ...(s.k === "pct" ? [[E2("Solo si ganas", "Only if you win"), E2(`${s.cents / 100} %. Si no ganas, no pagas nada.`, `${s.cents / 100}%. If you do not win, you pay nothing.`)] as [string, string]] : []),
    ...(s.k === "fijo" ? [[E2(`Honorario a ${pp.negocio.nombre}`, `Fee to ${pp.negocio.nombre}`), usd(s.cents)] as [string, string], ...(s.gov ? [[E2("Gobierno, aparte, a la agencia", "Government, separately, to the agency"), usd(s.gov)] as [string, string]] : [])] : []),
    [E2("Antes de empezar", "Before starting"), E2("Te dan el total por escrito.", "You get the total in writing.")]];
  const resumen = (
    <div className={`overflow-hidden ${caja}`}>
      <div className="border-b border-ink/[.07] px-[15px] py-3.5"><div className={K}>{E2("TU CONSULTA", "YOUR CONSULTATION")}</div><div className="mt-[5px] font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]">{pp.negocio.nombre}</div></div>
      <div className="px-[15px] py-0.5">{filas.map(([k, v2], n) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v2}</span></div>)}</div>
    </div>
  );
  const pago = (
    <div className={`flex flex-col gap-2 p-4 ${caja}`}>
      <div className="flex items-baseline justify-between gap-3"><span className={K}>{E2("PRECIO", "PRICE")}</span><span className="font-display text-[18px] font-extrabold">{P.l}</span></div>
      <div className="text-right font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{P.s}</div>
      <div className="mt-1 border-t border-ink/[.07] pt-3"><div className={K}>{E2("CÓMO SE PAGA", "HOW YOU PAY")}</div>
        {como.map(([k, v2]) => <div key={k} className="mt-2 flex justify-between gap-3 text-[13px] font-bold"><span>{k}</span><span className="text-right">{v2}</span></div>)}</div>
    </div>
  );
  const bueno = (
    <div className={`flex flex-col gap-2.5 p-4 ${caja}`}>
      <div className={K}>{E2("BUENO SABER", "GOOD TO KNOW")}</div>
      {[E2("Cancelar es gratis hasta 24 horas antes.", "Canceling is free up to 24 hours before."), E2("Antes de contratar, la oficina te da el total por escrito. Nada se cobra sin tu OK.", "Before hiring, the office gives you the total in writing. Nothing is charged without your OK."),
        remoto ? E2("El enlace o la llamada te llegan a tus Avisos 10 minutos antes.", "The link or call arrives in your Alerts 10 minutes before.") : E2("Trae tu identificación y los papeles de tu trámite.", "Bring your ID and the papers for your case."),
        legal ? E2("To’Latino no da consejo legal. Nadie te garantiza un resultado.", "To’Latino does not give legal advice. No one can guarantee a result.") : E2("Nada se cobra sin tu OK.", "Nothing is charged without your OK.")]
        .map((t) => <div key={t} className="flex items-start gap-2 text-[12.5px] font-medium leading-[1.5] text-ink/70"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open)" /></span>{t}</div>)}
      <div role="switch" aria-checked={sms} aria-label={E2("Avisos", "Alerts")} tabIndex={0} onClick={() => setSms(!sms)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setSms(!sms); } }} className="mt-1 flex cursor-pointer items-center gap-3 border-t border-ink/[.07] pt-3.5">
        <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{E2("Avisos", "Alerts")}</div><div className="mt-0.5 text-[12px] font-medium leading-[1.45] text-ink/55">{E2("Te avisamos cuando confirmen y el día antes.", "We let you know when confirmed and the day before.")}</div></div>
        <span className={`relative h-6 w-[42px] flex-none rounded-full transition-colors ${sms ? "bg-ink" : "bg-ink/20"}`}><span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-transform ${sms ? "translate-x-[21px]" : "translate-x-[3px]"}`} /></span>
      </div>
    </div>
  );
  const errorBox = error ? <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div> : null;
  const enviarL = E2("Enviar solicitud", "Send request");
  return (
    <div className="min-h-[100dvh] bg-paper">
      <div data-screen-label="APP-NEG-PRO-BOOKING · móvil" className="pb-[150px] lg:hidden">
        <div className="sticky top-[57px] z-20 grid"><StepHeader title={T[paso]} step={paso + 1} total={3} backLabel={E2("Volver", "Back")} onBack={paso > 0 ? () => { setPaso(paso - 1); window.scrollTo({ top: 0 }); } : volver} /></div>
        <div className="flex flex-col gap-3 px-4 pt-4">{paso === 0 && bloque0}{paso === 1 && bloque1}{paso === 2 && <>{resumen}{pago}{bueno}</>}{errorBox}</div>
        <div data-screen-label="Booking · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex items-center gap-3.5">
            <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{E2("HOY PAGAS", "TODAY YOU PAY")}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">$0</div></div>
            <div className="flex min-w-0 flex-1"><Button block disabled={!okPaso || ocupado} onClick={sigue}>{paso === 2 ? (ocupado ? E2("Enviando…", "Sending…") : enviarL) : E2("Continuar", "Continue")}</Button></div>
          </div>
          {!okPaso && falta && <div className="mt-[9px] text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-pro-ink">{falta.toUpperCase()}</div>}
        </div>
      </div>
      <div data-screen-label="APP-NEG-PRO-BOOKING · desktop" className="mx-auto hidden max-w-[1180px] px-[30px] pb-[60px] pt-[22px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{pp.negocio.nombre}</button>
        <div className="mt-3.5"><h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em]">Booking</h1><div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{`${pp.negocio.nombre} · ${nm(s.name)}`.toUpperCase()}</div></div>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-12 gap-y-8">
          <div className="flex min-w-0 flex-col gap-[26px]">
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{T[0]}</div>{bloque0}</div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{T[1]}</div>{bloque1}</div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{E2("Antes de enviar", "Before you send")}</div>{bueno}</div>
          </div>
          <aside className="sticky top-[96px] flex flex-col gap-3">
            {resumen}{pago}
            <div className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white px-5 py-[18px] shadow-[var(--shadow-float)]">
              {!listo && <div className="text-center text-[12px] font-bold text-pro-ink">{falta}</div>}
              <div className="flex items-center gap-3.5">
                <div className="flex-none pl-0.5"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{E2("HOY PAGAS", "TODAY YOU PAY")}</div><div className="mt-1 font-display text-[21px] font-extrabold leading-none tracking-[-0.02em]">$0</div></div>
                <div className="flex min-w-0 flex-1"><Button variant="primary" block disabled={!listo || ocupado} onClick={() => void enviar()}>{ocupado ? E2("Enviando…", "Sending…") : enviarL}</Button></div>
              </div>
              {errorBox}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
