"use client";
/* APP-NEG-SALUD-BOOKING · móvil y desktop (neg-salud-flow.js, vistas «ab»): 1 Tu seguro (obligatorio o «No tengo seguro») +
   ¿Para quién es? + ¿Para qué es la cita? (opcional, solo lo ve el consultorio) → 2 Día y hora (con quién: solo con licencia
   verificada) → 3 Revisa y envía (911, resumen, precio con o sin seguro, cómo se paga: hoy $0, intérprete, avisos). En el
   teléfono un paso a la vez; en escritorio todo en una página con la columna. El servidor decide horas, seguro y precio. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { HorasSalud } from "@/lib/citas-salud";
import { compat, nombreSeguro, precioSalud, type SeguroRef } from "@/lib/salud-compat";
import type { SaludPublico } from "@/lib/salud-publico";
import { SaSeguro, useSalud } from "../Salud";
import { horasDeConsulta, pedirConsulta } from "./acciones";

type N = "Icon" | "Button" | "Chip" | "StepHeader" | "DateStrip" | "TimeSlots";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, StepHeader, DateStrip, TimeSlots } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const horaL = (m: number) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const DOW = { es: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"], en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] };
const DL = { es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const PARA = [["yo", "Para mí", "For me"], ["hijo", "Para mi hijo o hija", "For my child"], ["otro", "Para otra persona", "For someone else"]] as const;
const WHY = [["nuevo", "Algo nuevo", "Something new"], ["seguimiento", "Seguimiento", "Follow-up"], ["receta", "Receta o resultados", "Prescription or results"], ["papeles", "Papeles (trabajo, escuela)", "Forms (work, school)"], ["chequeo", "Chequeo", "Checkup"]] as const;

export function Consulta({ sa, svcId, con0, seg0, es, yo }: { sa: SaludPublico; svcId: string; con0: string; seg0: string | null; es: boolean; yo: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const v = useSalud(sa, es)!;
  const s = sa.servicios.find((x) => x.id === svcId)!, nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es), tele = s.k === "tele";
  const principal = sa.segs.find((x) => x.principal)?.id ?? sa.segs[0]?.id ?? null;
  const [segSel, setSegSel] = useState<string | null>(seg0 ?? principal);
  const [para, setPara] = useState<string>(""), [why, setWhy] = useState<string | null>(null), [nota, setNota] = useState("");
  const [con, setCon] = useState(con0), [paso, setPaso] = useState(0), [i, setI] = useState(0), [hSel, setH] = useState<number | null>(null), [H, setHoras] = useState<HorasSalud | null>(null), [cargando, setCargando] = useState(true);
  const [interp, setInterp] = useState(false), [sms, setSms] = useState(true), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const clave = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "");
  useEffect(() => { let vivo = true; setCargando(true); void horasDeConsulta(sa.negocio.id, s.id, con, i).then((x) => { if (!vivo) return; setHoras(x); setCargando(false); if (x && i === 0 && !x.sl.some((h) => h.free) && x.sig) setI(x.sig.i); }); return () => { vivo = false; }; }, [sa.negocio.id, s.id, con, i]);
  // Al volver de «Tu seguro» con uno nuevo, queda elegido.
  useEffect(() => { if (v.seg && v.seg.cuenta) setSegSel(v.seg.id); }, [v.seg]);

  const segRef: SeguroRef | null = segSel === "none" ? { kind: "none", insurer: null, plan: null } : (() => { const x = sa.segs.find((z) => z.id === segSel); return x ? { kind: x.kind, insurer: x.insurer, plan: x.plan } : null; })();
  const cp = compat(sa.clinica, segRef, sa.cat, es), P = precioSalud(s, sa.clinica, segRef, es);
  const prof = con !== "any" ? sa.gente.find((p) => p.id === con) ?? null : null;
  const hablaEs = prof ? prof.langs.includes("es") : sa.tags.includes("medesp");
  const ymd = H?.dias[i]?.ymd ?? "", dowN = ymd ? new Date(`${ymd}T12:00:00Z`).getUTCDay() : 0, diaL = ymd ? `${(es ? DL.es : DL.en)[dowN]} ${Number(ymd.slice(8))}` : "";
  const dias = (H?.dias ?? []).map((d) => ({ id: `d${d.i}`, dow: d.i === 0 ? E2("HOY", "TODAY") : (es ? DOW.es : DOW.en)[d.dow], num: d.num, off: d.off }));
  const slots = (H?.sl ?? []).map((h) => ({ t: horaL(h.m), taken: !h.free, m: h.m }));
  const hayLibres = slots.some((x) => !x.taken);
  const cuandoL = hSel != null ? `${cap(diaL)} · ${horaL(hSel)}` : E2("Elige día y hora", "Choose day and time");
  const ok0 = !!segRef && !!para, ok1 = hSel != null, listo = ok0 && ok1;
  const okPaso = paso === 0 ? ok0 : paso === 1 ? ok1 : listo;
  const falta = !segRef ? E2("Agrega tu seguro o elige «No tengo seguro»", "Add your insurance or choose “No insurance”") : !para ? E2("Elige para quién es", "Choose who it is for") : hSel == null ? E2("Elige día y hora", "Choose day and time") : "";
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  const volver = () => router.push(`/n/${sa.negocio.id}?tab=svc`);
  const enviar = async () => {
    if (!listo || ocupado || hSel == null || !segSel) return;
    if (!yo) return entrar();
    setOcupado(true); setError(null);
    const r = await pedirConsulta(sa.negocio.id, { svc: s.id, con, i, m: hSel, seg: segSel, para, why, nota, interp, sms, clave: clave.current })
      .catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    if (r.ok) { router.push(`/cita/${r.numero}`); return; }
    if ("entrar" in r && r.entrar) return entrar();
    setError(es ? r.msg.es : r.msg.en); setOcupado(false);
    if ("hora" in r && r.hora) { setH(null); setPaso(1); void horasDeConsulta(sa.negocio.id, s.id, con, i).then(setHoras); }
  };
  const sigue = () => { if (!okPaso) return; if (paso === 2) return void enviar(); setPaso(paso + 1); window.scrollTo({ top: 0 }); };
  const T = [E2("Tu seguro", "Your insurance"), E2("Día y hora", "Day and time"), E2("Revisa y envía", "Review and send")];
  const radio = (on: boolean, t: string, sub: string, tag: string, onClick: () => void, key: string) => (
    <button key={key} type="button" role="radio" aria-checked={on} onClick={onClick} className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"}`}>
      <span className={`box-border h-5 w-5 flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
      <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{t}</span>{sub && <span className="mt-0.5 block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{sub}</span>}</span>
      {tag && <span className="flex-none font-mono text-[8.5px] font-bold tracking-[0.1em] text-open-text">{tag}</span>}
    </button>
  );

  const bloqueSeguro = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      <div><div className="flex items-center justify-between gap-2"><span className={K}>{E2("TU SEGURO", "YOUR INSURANCE")}</span><span className="font-mono text-[9px] font-bold tracking-[0.1em] text-pro-ink">{E2("OBLIGATORIO", "REQUIRED")}</span></div>
        <div role="radiogroup" aria-label={E2("Tu seguro", "Your insurance")} className="mt-2.5 flex flex-col gap-2">
          {sa.segs.map((x) => radio(segSel === x.id, nombreSeguro(x, sa.cat, es), [x.last4 ? `••• ${x.last4}` : "", PARA.find((z) => z[0] === x.para)?.[es ? 1 : 2] ?? ""].filter(Boolean).join(" · ").toUpperCase(), E2("EN TU CUENTA", "IN YOUR ACCOUNT"), () => setSegSel(x.id), x.id))}
          {radio(segSel === "none", E2("No tengo seguro", "No insurance"), sa.h.sin ? E2(`CONSULTA SIN SEGURO ${`$${sa.h.cash / 100}`}`, `UNINSURED VISIT $${sa.h.cash / 100}`) : "", "", () => setSegSel("none"), "none")}
        </div>
        <div className="mt-2.5 flex">{yo ? <Button variant="secondary" size="md" icon="plus" onClick={() => v.setSegHoja(true)}>{sa.segs.length ? E2("Agregar otro seguro", "Add another insurance") : E2("Agrega tu seguro", "Add your insurance")}</Button>
          : <Button variant="secondary" size="md" icon="users" onClick={entrar}>{E2("Entra para usar tu seguro", "Sign in to use your insurance")}</Button>}</div>
        {cp && <div className="mt-2.5 flex items-start gap-[7px] text-[12px] font-bold leading-[1.45]" style={{ color: cp.ok ? "var(--tl-open-text)" : "var(--tl-pro-ink)" }}><span className="grid flex-none pt-px"><Icon name={cp.ok ? "check" : "warning"} size={13} color="currentColor" /></span>{cp.t}{!cp.ok && E2(". Puedes pedir la cita igual y pagar el precio sin seguro.", ". You can still request and pay the uninsured price.")}</div>}
      </div>
      <div><div className={K}>{E2("¿PARA QUIÉN ES?", "WHO IS IT FOR?")}</div>
        <div className="mt-2 flex flex-wrap gap-2">{PARA.map(([k, a, b]) => <Chip key={k} variant={para === k ? "selected" : "filter"} onClick={() => setPara(k)}>{es ? a : b}</Chip>)}</div>
        {para === "hijo" && <div className="mt-2 rounded-[12px] bg-pro/[.14] px-3 py-2.5 text-[12px] font-semibold leading-[1.5] text-pro-ink">{E2("Escribe su nombre y edad en la nota. Un adulto responsable va con el niño o la niña.", "Write their name and age in the note. A responsible adult comes with the child.")}</div>}
        {para === "otro" && <div className="mt-2 rounded-[12px] bg-pro/[.14] px-3 py-2.5 text-[12px] font-semibold leading-[1.5] text-pro-ink">{E2("La persona tiene que estar de acuerdo con la cita.", "The person has to agree to the visit.")}</div>}
      </div>
      <div><div className={K}>{E2("¿PARA QUÉ ES LA CITA? · OPCIONAL", "WHAT IS THE VISIT FOR? · OPTIONAL")}</div>
        <div className="mt-1 text-[11.5px] font-medium leading-[1.45] text-ink/55">{E2("Solo lo ve el consultorio; nunca sale en reseñas.", "Only the clinic sees it; never in reviews.")}</div>
        <div className="mt-2 flex flex-wrap gap-2">{WHY.map(([k, a, b]) => <Chip key={k} variant={why === k ? "selected" : "filter"} onClick={() => setWhy(why === k ? null : k)}>{es ? a : b}</Chip>)}</div>
      </div>
      <div>
        <div className="flex justify-between gap-2.5"><span className={K}>{E2("NOTA PARA EL CONSULTORIO · OPCIONAL", "NOTE FOR THE CLINIC · OPTIONAL")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{nota.length}/300</span></div>
        <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 300))} rows={3} aria-label={E2("Nota para el consultorio", "Note for the clinic")}
          placeholder={E2("Ej.: es para mi hija Ana, 6 años", "E.g. it is for my daughter Ana, age 6")} className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] outline-none" />
        <div className="mt-1.5 text-[11.5px] font-medium leading-[1.45] text-ink/55">{E2("No mandes fotos de documentos ni resultados. Se guarda cifrada y se borra 30 días después de la cita.", "Do not send photos of documents or results. It is stored encrypted and deleted 30 days after the visit.")}</div>
      </div>
    </div>
  );
  const bloqueHora = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      {sa.gente.length > 0 && (
        <div><div className={K}>{E2("¿CON QUIÉN?", "WITH WHOM?")}</div>
          <div role="radiogroup" aria-label={E2("¿Con quién?", "With whom?")} className="mt-2 flex flex-col gap-2">
            {[{ id: "any", t: E2("Cualquiera", "Anyone"), s: E2("EL PRIMERO LIBRE", "FIRST AVAILABLE") }, ...sa.gente.filter((p) => !s.who.length || s.who.includes(p.id)).map((p) => ({ id: p.id, t: p.nombre, s: p.langs.includes("es") ? E2("HABLA ESPAÑOL", "SPEAKS SPANISH") : E2("HABLA INGLÉS · INTÉRPRETE GRATIS", "SPEAKS ENGLISH · FREE INTERPRETER") }))]
              .map((o) => radio(con === o.id, o.t, o.s, "", () => { setCon(o.id); setH(null); }, o.id))}
          </div></div>)}
      <div><div className={K}>{E2("DÍA", "DAY")}</div><div className="mt-[11px] grid min-w-0">{dias.length ? <DateStrip days={dias} selected={`d${i}`} onSelect={(id: string) => { setI(Number(id.slice(1))); setH(null); }} /> : <div className="h-[66px]" />}</div></div>
      {cargando && !H ? <div className="h-24 animate-pulse rounded-[15px] bg-paper" /> : hayLibres ? (
        <div aria-busy={cargando}><div className={K}>{E2("HORA", "TIME")}</div><div className="mt-[9px] grid"><TimeSlots slots={slots.map(({ t, taken }) => ({ t, taken }))} selected={hSel != null ? horaL(hSel) : ""} onSelect={(t: string) => { const x = slots.find((z) => z.t === t && !z.taken); if (x) setH(x.m); }} /></div></div>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-[15px] bg-paper px-[15px] py-3.5">
          <div className="text-[13.5px] font-bold leading-[1.4]">{H ? E2("Ese día no hay consulta. Elige otro.", "No visits that day. Pick another.") : E2("No hay horas para pedir en línea. Llama al consultorio.", "No times to book online. Call the clinic.")}</div>
          {H?.sig && <button type="button" onClick={() => { setI(H.sig!.i); setH(null); }} className="text-left text-[12.5px] font-bold text-action">{E2(`Ver el siguiente día libre · desde las ${horaL(H.sig.m)}`, `See the next open day · from ${horaL(H.sig.m)}`)}</button>}
        </div>
      )}
      <div className="flex items-center gap-[9px] rounded-[13px] bg-action/[.07] px-[13px] py-[11px]"><Icon name="clock" size={15} color="var(--tl-action)" /><span className="text-[12.5px] font-bold leading-[1.4] text-action-hover">{`${E2("DURA", "LASTS")} ${H?.dur ?? s.dur} MIN · ${hablaEs ? E2("HABLA ESPAÑOL", "SPEAKS SPANISH") : E2("INTÉRPRETE GRATIS SI LO PIDES", "FREE INTERPRETER IF YOU ASK")}`}</span></div>
      {hSel != null && <div className="text-[12.5px] font-bold">{cuandoL}</div>}
    </div>
  );
  const filas: [string, string][] = [[E2("SEGURO", "INSURANCE"), segRef ? nombreSeguro(segRef, sa.cat, es) : "—"], [E2("PACIENTE", "PATIENT"), PARA.find((z) => z[0] === para)?.[es ? 1 : 2] ?? "—"], [E2("CUÁNDO", "WHEN"), cuandoL],
    [E2("CON", "WITH"), prof?.nombre ?? E2("El primero libre", "First available")], [E2("IDIOMA", "LANGUAGE"), hablaEs ? E2("Español", "Spanish") : E2("Inglés · intérprete gratis", "English · free interpreter")],
    [E2("DÓNDE", "WHERE"), tele ? E2("Por video · el enlace te llega a tus Avisos", "By video · the link arrives in your Alerts") : sa.negocio.direccion ?? sa.negocio.nombre]];
  const resumen = (
    <div className={`overflow-hidden ${caja}`}>
      <div className="border-b border-ink/[.07] px-[15px] py-3.5"><div className={K}>{E2("TU CITA", "YOUR VISIT")}</div><div className="mt-[5px] font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]">{nm(s.name)} · {sa.negocio.nombre}</div></div>
      <div className="px-[15px] py-0.5">{filas.map(([k, v2], n) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v2}</span></div>)}</div>
    </div>
  );
  const pago = (
    <div className={`flex flex-col gap-3 p-4 ${caja}`}>
      <div className="flex items-baseline justify-between gap-3"><span className={K}>{E2("PRECIO", "PRICE")}</span><span className="font-display text-[18px] font-extrabold">{P.l}</span></div>
      {P.s && <div className="text-right font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{P.s}</div>}
      {cp && !cp.ok && <div className="rounded-[12px] bg-pro/[.14] px-3 py-2.5 text-[12px] font-semibold leading-[1.5] text-pro-ink">{cp.t}{E2(". Puedes pedir la cita igual y pagar el precio sin seguro.", ". You can still request and pay the uninsured price.")}</div>}
      <div className="border-t border-ink/[.07] pt-3"><div className={K}>{E2("CÓMO SE PAGA", "HOW YOU PAY")}</div>
        <div className="mt-2 flex justify-between gap-3 text-[13px] font-bold"><span>{E2("Hoy, al enviar", "Today, when you send")}</span><span>$0</span></div>
        <div className="text-[11.5px] font-medium text-ink/55">{E2("No se cobra nada al pedir la cita.", "Nothing is charged when you request.")}</div>
        <div className="mt-2 flex justify-between gap-3 text-[13px] font-bold"><span>{E2("En la consulta", "At the visit")}</span><span>{P.l}</span></div>
        <div className="text-[11.5px] font-medium text-ink/55">{E2("Lo que te toque según tu seguro.", "Whatever applies with your insurance.")}</div></div>
    </div>
  );
  const toggle = (on: boolean, set: (x: boolean) => void, t: string, s2: string) => (
    <div role="switch" aria-checked={on} aria-label={t} tabIndex={0} onClick={() => set(!on)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); set(!on); } }} className="flex cursor-pointer items-center gap-3 border-t border-ink/[.07] pt-3.5 first:border-0 first:pt-0">
      <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{t}</div><div className="mt-0.5 text-[12px] font-medium leading-[1.45] text-ink/55">{s2}</div></div>
      <span className={`relative h-6 w-[42px] flex-none rounded-full transition-colors ${on ? "bg-ink" : "bg-ink/20"}`}><span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-transform ${on ? "translate-x-[21px]" : "translate-x-[3px]"}`} /></span>
    </div>
  );
  const extras = (
    <div className={`flex flex-col gap-3.5 p-4 ${caja}`}>
      {!hablaEs && toggle(interp, setInterp, E2("Necesito intérprete", "I need an interpreter"), E2("Gratis, por teléfono o en persona. Es tu derecho.", "Free, by phone or in person. It is your right."))}
      {toggle(sms, setSms, E2("Avisos", "Alerts"), E2("Te avisamos cuando confirmen y el día antes. Sin el nombre del consultorio.", "We let you know when confirmed and the day before. Without the clinic’s name."))}
    </div>
  );
  const bueno = (
    <div className={`flex flex-col gap-2.5 p-4 ${caja}`}>
      <div className={K}>{E2("BUENO SABER", "GOOD TO KNOW")}</div>
      {[E2("Cancelar es gratis hasta 24 horas antes.", "Canceling is free up to 24 hours before."), tele ? E2("El enlace del video te llega a tus Avisos 10 minutos antes.", "The video link arrives in your Alerts 10 minutes before.") : E2("Llega 15 minutos antes con tu tarjeta del seguro y una identificación.", "Arrive 15 minutes early with your insurance card and an ID."),
        E2("To’Latino no da consejo médico. La cita es una solicitud: el consultorio revisa tu seguro y confirma.", "To’Latino does not give medical advice. The visit is a request: the clinic checks your insurance and confirms.")].map((t) => <div key={t} className="flex items-start gap-2 text-[12.5px] font-medium leading-[1.5] text-ink/70"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open)" /></span>{t}</div>)}
    </div>
  );
  const emer = <div className="flex items-start gap-[11px] rounded-2xl bg-danger/[.07] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="emergency" size={17} color="var(--tl-danger)" /></span><span className="flex-1 text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/75">{E2("Si es una emergencia, llama al 911. No esperes una cita.", "If it is an emergency, call 911. Do not wait for an appointment.")}</span></div>;
  const errorBox = error ? <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div> : null;
  const enviarL = sa.can ? E2("Enviar solicitud", "Send request") : E2("Enviar solicitud", "Send request");

  return (
    <div className="min-h-[100dvh] bg-paper">
      <div data-screen-label="APP-NEG-SALUD-BOOKING · móvil" className="pb-[150px] lg:hidden">
        <div className="sticky top-[57px] z-20 grid"><StepHeader title={T[paso]} step={paso + 1} total={3} backLabel={E2("Volver", "Back")} onBack={paso > 0 ? () => { setPaso(paso - 1); window.scrollTo({ top: 0 }); } : volver} /></div>
        <div className="flex flex-col gap-3 px-4 pt-4">
          {paso === 0 && bloqueSeguro}
          {paso === 1 && bloqueHora}
          {paso === 2 && <>{emer}{resumen}{pago}{extras}{bueno}</>}
          {errorBox}
        </div>
        <div data-screen-label="Booking · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex items-center gap-3.5">
            <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{E2("HOY PAGAS", "TODAY YOU PAY")}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">$0</div></div>
            <div className="flex min-w-0 flex-1"><Button block disabled={!okPaso || ocupado} onClick={sigue}>{paso === 2 ? (ocupado ? E2("Enviando…", "Sending…") : enviarL) : E2("Continuar", "Continue")}</Button></div>
          </div>
          {!okPaso && falta && <div className="mt-[9px] text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-pro-ink">{falta.toUpperCase()}</div>}
          {paso === 2 && <div className="mt-[7px] text-center font-mono text-[9px] font-semibold tracking-[0.08em] text-ink/45">{`${E2("EN LA CONSULTA: ", "AT THE VISIT: ")}${P.l}`.toUpperCase()}</div>}
        </div>
      </div>
      <div data-screen-label="APP-NEG-SALUD-BOOKING · desktop" className="mx-auto hidden max-w-[1180px] px-[30px] pb-[60px] pt-[22px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{sa.negocio.nombre}</button>
        <div className="mt-3.5"><h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em]">Booking</h1><div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{`${sa.negocio.nombre} · ${nm(s.name)}`.toUpperCase()}</div></div>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-12 gap-y-8">
          <div className="flex min-w-0 flex-col gap-[26px]">
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{T[0]}</div>{bloqueSeguro}</div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{T[1]}</div>{bloqueHora}</div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{E2("Antes de enviar", "Before you send")}</div><div className="flex flex-col gap-3">{emer}{extras}{bueno}</div></div>
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
      {v.segHoja && <SaSeguro v={v} />}
    </div>
  );
}
