"use client";
/* APP-NEG-RESERVA-ESTADO · móvil y desktop (prototipo rsvStVals): estado (pendiente, te proponen otra hora, confirmada,
   en tu mesa, terminada, no llegaste, no pudo, sin respuesta, cancelada), los pasos con su hora real, voy tarde, detalles,
   lo que conviene recordar, Calendario · Compartir · Cómo llegar · Llamar, cambiar la solicitud y cancelar. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import type { RsvVista } from "@/lib/reservas";
import { diaL } from "../../n/[id]/Reservar";
import { reservaAccion } from "./acciones";

type N = "Icon" | "Button" | "Chip" | "Tag";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, Tag } = UI as unknown as Record<N, ComponentType<any>>;
const hora = (m: number) => { m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
// «a la 1:00 PM» / «a las 7:30 PM»
const aLas = (m: number) => `${hora(m).startsWith("1:") ? "a la" : "a las"} ${hora(m)}`;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white p-[15px]";
const AREA = { salon: ["Salón", "Dining room"], terraza: ["Terraza", "Patio"], barra: ["Barra", "Bar"] } as Record<string, [string, string]>;
const OCC: Record<string, [string, string]> = { cumple: ["Cumpleaños", "Birthday"], aniv: ["Aniversario", "Anniversary"], cita: ["Cita", "Date night"], neg: ["Negocios", "Business"], cele: ["Celebración", "Celebration"] };
const NEED: Record<string, [string, string]> = { bebe: ["Silla para bebé", "High chair"], ruedas: ["Silla de ruedas", "Wheelchair"], alergia: ["Alergias", "Allergies"], tranq: ["Mesa tranquila", "Quiet table"] };
const WHY = [["planes", "Cambié de planes", "Plans changed"], ["otro", "Encontré otro lugar", "Found another place"], ["hora", "Me equivoqué de hora", "Wrong time"], ["grupo", "Cambió el grupo", "Group changed"]] as const;
const tel = (p: string) => { const d = p.replace(/\D/g, "").slice(-10); return d.length === 10 ? `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p; };

export function Estado({ r, otras, telefono, es }: { r: RsvVista; otras: number[]; telefono: string; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const L = (x: [string, string] | undefined, d = "") => (x ? (es ? x[0] : x[1]) : d);
  const router = useRouter();
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const [cx, setCx] = useState(false);
  const [why, setWhy] = useState("");
  const [late, setLate] = useState(10);
  const [ocupado, setOcupado] = useState(false);
  const vivo = r.st === "pend" || r.st === "alt" || r.st === "ok" || r.st === "in";
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { if (!vivo) return; const t = setInterval(() => router.refresh(), 20000); return () => clearInterval(t); }, [vivo, router]);

  const n = r.negocio.nombre, T = hora(r.h), aT = aLas(r.h), holdM = r.h + r.hold;
  const P = (k: number) => `${k} ${k > 1 ? E2("personas", "guests") : E2("persona", "guest")}`;
  const areaL = (k: string) => L(AREA[k], k);
  const dL = diaL(r.ymd, r.dia, es, true);
  const whenIn = r.dia === 0 ? E2("hoy", "today") : r.dia === 1 ? E2("mañana", "tomorrow") : E2(`el ${dL.toLowerCase()}`, `on ${dL}`);
  const tab = (q = "") => router.push(`/n/${r.negocio.id}?tab=rsv${q}`);
  const ok = r.st === "ok", pend = r.st === "pend", alt = r.st === "alt", lost = r.st === "no" || r.st === "exp", cxd = r.st === "cx";
  const H: Record<RsvVista["st"], [string, string, string, string, string, string, string, string, string]> = {
    pend: ["clock", "bg-ink/5", "var(--tl-ink)", E2("ESPERANDO RESPUESTA", "WAITING FOR REPLY"), E2("Solicitud enviada", "Request sent"), E2(`${n} responde en unos ${r.reply} min. Te guardamos la mesa mientras tanto.`, `${n} replies in about ${r.reply} min. We hold the table meanwhile.`), E2("PENDIENTE", "PENDING"), "bg-pro/[.16]", "text-pro-ink"],
    ok: ["check", "bg-signal/[.16]", "var(--tl-open-text)", E2("CONFIRMADA", "CONFIRMED"), E2("Tu mesa está confirmada", "Your table is confirmed"), E2(`${n} te espera ${whenIn} ${aT}. Te guardan la mesa hasta ${aLas(holdM).slice(2)}.`, `${n} expects you ${whenIn} at ${T}. Table held until ${hora(holdM)}.`), E2("CONFIRMADA", "CONFIRMED"), "bg-signal/[.16]", "text-open-text"],
    alt: ["warning", "bg-pro/[.16]", "var(--tl-pro-ink)", E2("TE PROPONEN UN CAMBIO", "THEY PROPOSE A CHANGE"), E2("Te proponen otra hora", "They suggest another time"), E2(`${aT.charAt(0).toUpperCase()}${aT.slice(1)} no tienen mesa para ${r.p}.`, `At ${T} they have no table for ${r.p}.`), E2("ELIGE UNA OPCIÓN", "CHOOSE AN OPTION"), "bg-pro/[.16]", "text-pro-ink"],
    no: ["close", "bg-ink/5", "var(--tl-ink)", E2("NO PUDO", "COULD NOT"), E2(`${n} no tiene mesa a esa hora`, `${n} has no table at that time`), E2(`No tienen mesa ${aT}.${otras.length ? " Estas horas sí tienen mesa." : ""}`, `They have no table at ${T}.${otras.length ? " These times have tables." : ""}`), E2("NO PUDO", "COULD NOT"), "bg-ink/[.06]", "text-ink/60"],
    exp: ["clock", "bg-ink/5", "var(--tl-ink)", E2("SIN RESPUESTA", "NO RESPONSE"), E2("No respondieron a tiempo", "They didn't reply in time"), E2(`${n} no respondió a tiempo, así que cerramos tu solicitud.${otras.length ? " Estas horas sí tienen mesa." : ""}`, `${n} didn't reply in time, so we closed your request.${otras.length ? " These times have tables." : ""}`), E2("CERRADA", "CLOSED"), "bg-ink/[.06]", "text-ink/60"],
    in: ["check", "bg-signal/[.16]", "var(--tl-open-text)", E2("EN TU MESA", "AT YOUR TABLE"), E2("Ya estás en tu mesa", "You are at your table"), E2(`${n} marcó que llegaste. ¡Buen provecho!`, `${n} marked you as arrived. Enjoy!`), E2("EN CURSO", "IN PROGRESS"), "bg-action/10", "text-action"],
    done: ["check", "bg-ink/5", "var(--tl-ink)", E2("TERMINADA", "DONE"), E2("Gracias por venir", "Thanks for coming"), E2(`${n} marcó tu mesa como libre. Tu reservación terminó.`, `${n} marked your table as free. Your reservation is done.`), E2("TERMINADA", "DONE"), "bg-ink/[.06]", "text-ink/60"],
    nos: ["ban", "bg-danger/[.08]", "var(--tl-danger)", E2("NO LLEGASTE", "NO-SHOW"), E2("Marcaron que no llegaste", "Marked as a no-show"), E2(`${n} te guardó la mesa ${r.hold} min y la liberó. No hay ningún cargo. Si fue un error, llama al negocio.`, `${n} held your table ${r.hold} min and freed it. There is no charge. If this is a mistake, call the business.`), E2("NO LLEGASTE", "NO-SHOW"), "bg-danger/[.08]", "text-danger"],
    cx: ["ban", "bg-ink/5", "var(--tl-ink)", E2("CANCELADA", "CANCELLED"), r.cxPorAlt ? E2("No tomaste la hora propuesta", "You didn't take the suggested time") : E2("Cancelaste tu reservación", "You cancelled your reservation"), E2(`${n} ya lo sabe. No hay ningún cargo.`, `${n} already knows. There is no charge.`), E2("CANCELADA", "CANCELLED"), "bg-ink/[.06]", "text-ink/60"],
  };
  const [ic, icBg, icFg, eyebrow, title, sub, chip, chipBg, chipFg] = H[r.st];
  type Paso = { l: string; tm: string; k: "d" | "c" | "" };
  const pasos: Paso[] = pend ? [{ l: E2("Solicitud enviada", "Request sent"), tm: r.enviado, k: "d" }, { l: `${n}${E2(" confirma", " confirms")}`, tm: "", k: "c" }, { l: E2("Tu mesa", "Your table"), tm: T, k: "" }]
    : ok ? [{ l: E2("Solicitud enviada", "Request sent"), tm: r.enviado, k: "d" }, { l: E2("Confirmada", "Confirmed"), tm: r.respondido ?? r.enviado, k: "d" }, { l: E2("Tu mesa", "Your table"), tm: `${diaL(r.ymd, r.dia, es)} · ${T}`, k: "c" }]
    : alt && r.alt ? [{ l: E2("Solicitud enviada", "Request sent"), tm: r.enviado, k: "d" }, { l: es ? `Te proponen ${aLas(r.alt.h)}` : `They suggest ${hora(r.alt.h)}`, tm: r.respondido ?? "", k: "c" }, { l: E2("Tu mesa", "Your table"), tm: "", k: "" }]
    : r.st === "in" || r.st === "done" || r.st === "nos" ? [{ l: E2("Confirmada", "Confirmed"), tm: r.respondido ?? r.enviado, k: "d" }, { l: r.st === "nos" ? E2("No llegaste", "No-show") : E2("Llegaste", "Arrived"), tm: T, k: r.st === "done" ? "d" : "c" },
      ...(r.st === "done" ? [{ l: E2("Terminada", "Done"), tm: hora(r.h + r.dur), k: "c" as const }] : [])] : [];
  const rows = [[E2("A NOMBRE DE", "NAME"), r.otro || r.quien], [E2("PERSONAS", "GUESTS"), P(r.p)], [E2("ÁREA", "AREA"), areaL(r.area)], r.occ ? [E2("OCASIÓN", "OCCASION"), L(OCC[r.occ])] : null,
    r.needs.length ? [E2("NECESITAN", "NEEDS"), r.needs.map((k) => L(NEED[k])).join(" · ")] : null, r.nota ? [E2("NOTA", "NOTE"), `“${r.nota}”`] : null].filter(Boolean) as [string, string][];
  const pol = ([["clock", E2(`Te guardan la mesa ${r.hold} minutos después de la hora.`, `Table held ${r.hold} minutes past the time.`)], ["calendar", E2(`Cambiar o cancelar: gratis hasta ${r.cxH} ${r.cxH === 1 ? "hora" : "horas"} antes.`, `Change or cancel for free up to ${r.cxH} ${r.cxH === 1 ? "hour" : "hours"} before.`)], ["dollar", E2("Sin depósito ni cargo.", "No deposit or charge.")]] as const).filter((x) => !(ok && x[0] === "clock"));
  const cxFree = pend || r.minutosFaltan >= r.cxH * 60;
  const lateOn = ok && r.dia === 0 && r.minutosFaltan <= 120;

  const hacer = async (que: "cancelar" | "aceptar" | "nogracias" | "tarde" | "chgvisto", extra: string | number | undefined, msg: string, luego?: () => void) => {
    if (ocupado) return;
    setOcupado(true); setError("");
    const x = await reservaAccion(r.numero, que, extra).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false);
    if (!x.ok) { setError(es ? x.msg.es : x.msg.en); return; }
    setFlash(msg); setCx(false);
    if (luego) luego(); else router.refresh();
  };
  const ics = () => {
    const ymd = r.ymd.replaceAll("-", ""), hm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}${String(m % 60).padStart(2, "0")}00`;
    const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ToLatino//ES", "BEGIN:VEVENT", `UID:${r.numero}@tolatino`, `DTSTART:${ymd}T${hm(r.h)}`, `DTEND:${ymd}T${hm(Math.min(r.h + r.dur, 1439))}`,
      `SUMMARY:${E2("Mesa en ", "Table at ")}${n} · ${P(r.p)}`, `LOCATION:${(r.negocio.direccion ?? "").replace(/[,;]/g, "\\$&")}`, `DESCRIPTION:${E2("Reservación #", "Reservation #")}${r.numero}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar" })); a.download = `${r.numero}.ics`; a.click();
  };
  const compartir = async () => {
    const t = `${E2("Mesa en ", "Table at ")}${n} · ${dL} · ${T} · ${P(r.p)}`, url = `${location.origin}/n/${r.negocio.id}`;
    try { if (navigator.share) { await navigator.share({ title: n, text: t, url }); return; } await navigator.clipboard.writeText(`${t}\n${url}`); setFlash(E2("Copiamos los datos de tu mesa.", "We copied your table details.")); } catch { /* cancelado */ }
  };
  const llegar = r.negocio.lat != null && r.negocio.lng != null ? () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${r.negocio.lat},${r.negocio.lng}`, "_blank", "noopener") : null;
  const llamar = r.negocio.telefono ? () => { location.href = `tel:${r.negocio.telefono}`; } : null;
  const acts = ok ? ([["calendar", E2("Calendario", "Calendar"), ics], ["share", E2("Compartir", "Share"), compartir], ["pin", E2("Cómo llegar", "Directions"), llegar], ["phone", E2("Llamar", "Call"), llamar]] as const).filter((a) => a[2]) : [];

  const aviso = (
    <>
      {flash && <div role="status" className="flex items-center gap-[9px] rounded-[14px] bg-signal/[.16] px-3.5 py-[11px]"><Icon name="check" size={15} color="var(--tl-open-text)" strokeWidth={2.4} /><span className="text-[12.5px] font-bold text-open-text">{flash}</span></div>}
      {error && <div role="alert" className="flex items-start gap-[11px] rounded-2xl border border-danger/25 bg-danger/[.08] px-[15px] py-3.5"><span className="grid flex-none pt-px"><Icon name="warning" size={17} color="var(--tl-danger)" /></span><span className="text-[13.5px] font-bold leading-[1.4] text-danger">{error}</span></div>}
    </>
  );
  const principal = (desk: boolean) => (
    <div className={`rounded-[22px] border border-ink/[.08] bg-white ${desk ? "p-[26px]" : "p-5"}`}>
      <div className="flex items-start gap-3.5">
        <span className={`grid flex-none place-items-center rounded-[15px] ${icBg} ${desk ? "size-[52px]" : "size-[46px]"}`}><Icon name={ic} size={22} color={icFg} strokeWidth={2.2} /></span>
        <div className="min-w-0 flex-1">
          <div className={K}>{eyebrow}</div>
          <h1 className={`mt-[7px] text-pretty font-display font-extrabold leading-[1.1] tracking-[-0.04em] ${desk ? "text-[30px]" : "text-[24px]"}`}>{title}</h1>
          <div className={`mt-[7px] text-pretty font-medium leading-[1.5] text-ink/[.62] ${desk ? "text-[14px]" : "text-[13.5px]"}`}>{ok && r.chgOk ? E2("Cambio confirmado. ", "Change confirmed. ") : ""}{sub}</div>
        </div>
      </div>
      <div className="mt-[18px] flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
        <div className="min-w-0">
          <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("TU MESA", "YOUR TABLE")}</div>
          <div className="mt-1.5 font-display text-[20px] font-extrabold leading-[1.15] tracking-[-0.035em]">{dL} · {T}</div>
          <div className="mt-[5px] font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/50">{`${P(r.p)} · ${areaL(r.area)}`.toUpperCase()}</div>
        </div>
        <span className={`rounded-lg px-[9px] py-1.5 font-mono text-[9.5px] font-extrabold tracking-[0.08em] ${chipBg} ${chipFg}`}>{chip}</span>
      </div>
    </div>
  );
  const propuesta = alt && r.alt && (
    <div data-screen-label="Reserva · hora propuesta" className="rounded-[18px] border-[1.5px] border-ink bg-white p-4">
      <div className={K}>{E2("HORA PROPUESTA", "SUGGESTED TIME")}</div>
      <div className="mt-[9px] font-display text-[20px] font-extrabold leading-[1.15] tracking-[-0.03em]">{hora(r.alt.h)} · {areaL(r.alt.area)}</div>
      <div className="mt-[5px] text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2(`En lugar de ${aT} · ${P(r.p)}. Te guardan esta opción hasta ${r.alt.hasta.startsWith("1:") ? "la" : "las"} ${r.alt.hasta}.`, `Instead of ${T} · ${P(r.p)}. They hold this option until ${r.alt.hasta}.`)}</div>
      <div className="mt-3 flex flex-col gap-2">
        {([
          ["check", es ? `Aceptar ${aLas(r.alt.h)}` : `Accept ${hora(r.alt.h)}`, E2("Tu mesa queda confirmada", "Your table is confirmed"), false, () => hacer("aceptar", undefined, es ? `Listo: tu mesa es ${aLas(r.alt!.h)}.` : `Done: your table is at ${hora(r.alt!.h)}.`)],
          ["calendar", E2("Buscar otra hora", "Look for another time"), E2("Otra hora u otro día", "Another time or day"), false, () => hacer("nogracias", undefined, "", () => tab(`&p=${r.p}&d=${Math.max(0, r.dia)}`))],
          ["ban", E2("No, gracias", "No, thanks"), E2("Se cierra la solicitud", "The request is closed"), true, () => hacer("nogracias", undefined, E2("Cerramos tu solicitud.", "We closed your request."))],
        ] as const).map(([i, l, s, dg, on]) => (
          <button key={i} type="button" disabled={ocupado} onClick={on} className="flex w-full items-center gap-3 rounded-[14px] border border-ink/[.12] px-3.5 py-3 text-left">
            <span className={`grid size-[34px] flex-none place-items-center rounded-[10px] ${dg ? "bg-danger/10" : "bg-action/10"}`}><Icon name={i} size={16} color={dg ? "var(--tl-danger)" : "var(--tl-action)"} /></span>
            <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold leading-[1.3]">{l}</div><div className="mt-0.5 text-[11.5px] font-medium leading-[1.45] text-ink/55">{s}</div></div>
            <Icon name="chevronRight" size={16} color="rgba(11,14,18,.35)" />
          </button>
        ))}
      </div>
    </div>
  );
  // El cambio que pediste a una reservación confirmada (prototipo rvs.hasChg): pendiente, o no confirmado con «Entendido».
  const cambio = r.chg && (
    <div data-screen-label="Reserva · cambio solicitado" className="rounded-[18px] border-[1.5px] border-ink bg-white px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={K}>{r.chg.st === "no" ? E2("CAMBIO NO CONFIRMADO", "CHANGE NOT CONFIRMED") : E2("CAMBIO SOLICITADO", "CHANGE REQUESTED")}</span>
        <Tag tone={r.chg.st === "no" ? "danger" : "neutral"}>{r.chg.st === "no" ? E2("NO CONFIRMADO", "NOT CONFIRMED") : E2("PENDIENTE", "PENDING")}</Tag>
      </div>
      <div className="mt-2 text-[13.5px] font-bold leading-[1.3]">{`${diaL(r.chg.ymd, r.chg.dia, es, true)} · ${hora(r.chg.h)} · ${P(r.chg.p)}`}</div>
      <div className="mt-[3px] text-pretty text-[12px] font-medium leading-[1.5] text-ink/60">{r.chg.st === "no"
        ? E2(`No pudieron hacer el cambio. Tu reservación ${aT} sigue en pie.`, `They couldn't make the change. Your ${T} reservation stands.`)
        : E2(`Tu reservación ${aT} sigue en pie hasta que ${n} confirme el cambio.`, `Your ${T} reservation stands until ${n} confirms the change.`)}</div>
      {r.chg.st === "no" && <button type="button" disabled={ocupado} onClick={() => hacer("chgvisto", undefined, "")} className="mt-[9px] text-[12.5px] font-bold text-action">{E2("Entendido", "Got it")}</button>}
    </div>
  );
  const horasOtra = lost && otras.length > 0 && (
    <div className={caja}>
      <div className={K}>{E2("HORAS CON MESA ESE DÍA", "TIMES WITH TABLES THAT DAY")}</div>
      <div className="mt-[11px] flex flex-wrap gap-[7px]">{otras.map((h) => <Chip key={h} variant="filter" onClick={() => tab(`&p=${r.p}&d=${r.dia}&h=${h}`)}>{hora(h)}</Chip>)}</div>
    </div>
  );
  const linea = pasos.length > 0 && (
    <div className="rounded-[18px] border border-ink/[.08] bg-white px-[18px] py-4">
      {pasos.map((s, j) => (
        <div key={j} className="flex gap-[13px]">
          <div className="flex w-4 flex-none flex-col items-center">
            <span className={`size-4 rounded-full border-[2.5px] ${s.k === "d" ? "border-open bg-open" : s.k === "c" ? "border-ink bg-ink" : "border-ink/20 bg-white"}`} />
            {j < pasos.length - 1 && <span className={`min-h-[22px] w-0.5 flex-1 ${s.k === "d" ? "bg-open" : "bg-ink/10"}`} />}
          </div>
          <div className="flex min-w-0 flex-1 justify-between gap-2.5 pb-3.5">
            <span className={`text-[13.5px] leading-[1.2] ${s.k === "c" ? "font-extrabold" : "font-bold"} ${s.k ? "text-ink" : "text-ink/[.42]"}`}>{s.l}</span>
            <span className="flex-none font-mono text-[11px] font-bold text-ink/50">{s.tm}</span>
          </div>
        </div>
      ))}
    </div>
  );
  const tarde = lateOn && (
    <div className={caja}>
      {r.tarde ? (
        <div className="flex items-center gap-[11px]">
          <span className="grid size-9 flex-none place-items-center rounded-[11px] bg-signal/[.16]"><Icon name="clock" size={17} color="var(--tl-open-text)" /></span>
          <div className="min-w-0"><div className="text-[13.5px] font-bold leading-[1.3]">{E2(`Avisaste que llegas ${r.tarde} min tarde`, `You said you will be ${r.tarde} min late`)}</div><div className="mt-[3px] text-[12px] font-medium leading-[1.45] text-ink/55">{E2(`Te guardan la mesa hasta ${aLas(holdM).slice(2)}.`, `Your table is held until ${hora(holdM)}.`)}</div></div>
        </div>
      ) : (
        <>
          <div className={K}>{E2("¿VAS TARDE?", "RUNNING LATE?")}</div>
          <div className="mt-1.5 text-[12px] font-medium leading-[1.5] text-ink/60">{E2(`Te guardan la mesa hasta ${aLas(holdM).slice(2)}.`, `Your table is held until ${hora(holdM)}.`)}</div>
          <div className="mt-2.5 flex flex-wrap gap-[7px]">{[5, 10, 15].map((k) => <Chip key={k} variant={late === k ? "selected" : "filter"} onClick={() => setLate(k)}>{`${k} min`}</Chip>)}</div>
          <div className="mt-3 flex"><Button variant="secondary" icon="clock" block disabled={ocupado} onClick={() => hacer("tarde", late, E2(`Avisamos a ${n}: llegas ${late} min tarde.`, `We told ${n}: you'll be ${late} min late.`))}>{`${E2("Avisar a ", "Tell ")}${n}`}</Button></div>
        </>
      )}
    </div>
  );
  const detalles = (
    <div className={caja}>
      <div className={K}>{E2("DETALLES", "DETAILS")}</div>
      <div className="mt-2.5 grid grid-cols-2 gap-x-3.5 gap-y-3">{rows.map(([k, v]) => <div key={k} className="min-w-0"><div className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{k}</div><div className="mt-[5px] text-pretty text-[13px] font-semibold leading-[1.4]">{v}</div></div>)}</div>
      {r.sms && !cxd && !lost && <div className="mt-3 flex items-center gap-[9px] border-t border-line pt-3"><Icon name="chat" size={15} color="rgba(11,14,18,.55)" /><span className="text-[12px] font-medium text-ink/65">{E2("Te avisamos por SMS al ", "We text you at ")}{tel(telefono)}</span></div>}
    </div>
  );
  const recuerda = (ok || pend) && (
    <div className={caja}>
      <div className={K}>{E2("RECUERDA", "REMEMBER")}</div>
      <div className="mt-[11px] flex flex-col gap-2.5">{pol.map(([i, l]) => <div key={i} className="flex items-start gap-2.5"><span className="grid flex-none pt-px"><Icon name={i} size={15} color="rgba(11,14,18,.55)" /></span><span className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/70">{l}</span></div>)}</div>
    </div>
  );
  const botones = (
    <>
      {acts.length > 0 && <div className="grid grid-cols-2 gap-2">{acts.map(([i, l, on]) => <button key={i} type="button" onClick={on!} className="flex items-center gap-2.5 rounded-[15px] border-[1.5px] border-ink/[.14] bg-white px-3.5 py-[13px] text-left"><Icon name={i} size={17} /><span className="text-[13px] font-bold leading-[1.25]">{l}</span></button>)}</div>}
      {(cxd || lost || r.st === "done" || r.st === "nos") && <div className="flex"><Button variant="primary" icon="calendar" block onClick={() => tab(`&p=${r.p}`)}>{E2("Reservar otra vez", "Book again")}</Button></div>}
      {!cxd && !ok && llamar && <div className="flex"><Button variant="secondary" icon="phone" block onClick={llamar}>{`${E2("Llamar a ", "Call ")}${n}`}</Button></div>}
      {!cxd && <div className="flex"><Button variant="secondary" icon="chat" block onClick={() => router.push(`/cuenta/mensajes/${r.negocio.id}?op=${encodeURIComponent(r.numero)}`)}>{E2("Escribir al negocio", "Message the business")}</Button></div>}
      {(ok || pend) && (
        <div className="flex flex-wrap items-center justify-center gap-[22px] py-1">
          {(pend || (ok && !r.chg && r.minutosFaltan > 0)) && <button type="button" onClick={() => tab(`&editar=${r.numero}&p=${r.p}&d=${Math.max(0, r.dia)}&h=${r.h}`)} className="text-[13px] font-bold text-action">{pend ? E2("Cambiar solicitud", "Change request") : E2("Cambiar reservación", "Change reservation")}</button>}
          <button type="button" onClick={() => { setWhy(""); setCx(true); }} className="text-[13px] font-bold text-danger">{pend ? E2("Cancelar solicitud", "Cancel request") : E2("Cancelar reservación", "Cancel reservation")}</button>
        </div>
      )}
    </>
  );
  const cancelar = (
    <>
      <div className="font-display text-[18px] font-extrabold leading-[1.2] tracking-[-0.025em]">{pend ? E2("¿Cancelar tu solicitud?", "Cancel your request?") : E2("¿Cancelar tu reservación?", "Cancel your reservation?")}</div>
      <div className="mt-1.5 text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/65">
        {cxFree ? E2(`Cancelas gratis. ${n} libera la mesa para otra persona.`, `You cancel for free. ${n} frees the table for someone else.`)
          : E2(`Faltan menos de ${r.cxH} ${r.cxH === 1 ? "hora" : "horas"}: ${n} lo verá como cancelación tardía. No hay cargo.`, `Less than ${r.cxH} ${r.cxH === 1 ? "hour" : "hours"} left: ${n} will see it as a late cancellation. No charge.`)}
      </div>
      <div className="mt-3.5 font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{E2("¿POR QUÉ? · OPCIONAL", "WHY? · OPTIONAL")}</div>
      <div className="mt-[9px] flex flex-wrap gap-[7px]">{WHY.map(([k, a, b]) => <Chip key={k} variant={why === k ? "selected" : "filter"} onClick={() => setWhy(why === k ? "" : k)}>{es ? a : b}</Chip>)}</div>
      <div className="mt-3.5 flex flex-col gap-2">
        <div className="flex"><Button variant="primary" block disabled={ocupado} onClick={() => hacer("cancelar", why || undefined, pend ? E2("Cancelaste tu solicitud.", "You cancelled your request.") : E2("Cancelaste tu reservación.", "You cancelled your reservation."))}>{E2("Sí, cancelar", "Yes, cancel")}</Button></div>
        <div className="flex"><Button variant="secondary" block onClick={() => setCx(false)}>{E2("No, mantenerla", "No, keep it")}</Button></div>
      </div>
    </>
  );
  const num = `${E2("RESERVACIÓN #", "RESERVATION #")}${r.numero}`;

  return (
    <div data-pantalla="APP-NEG-RESERVA-ESTADO" className="min-h-dvh bg-paper pb-10 lg:px-[30px] lg:pb-[60px] lg:pt-[22px]">
      <div data-screen-label="APP-NEG-RESERVA-ESTADO · móvil" className="lg:hidden">
        <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3">
          <button type="button" aria-label={E2("Cerrar", "Close")} onClick={() => tab()} className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
          <div className="min-w-0 flex-1"><div className="font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{n}</div><div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{num}</div></div>
        </div>
        <div className="flex flex-col gap-3 px-4 pt-4">{aviso}{principal(false)}{propuesta}{cambio}{horasOtra}{linea}{tarde}{detalles}{recuerda}{botones}</div>
      </div>
      <div data-screen-label="APP-NEG-RESERVA-ESTADO · desktop" className="mx-auto hidden max-w-[1380px] lg:block">
        <button type="button" onClick={() => tab()} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{`${E2("Volver a ", "Back to ")}${n}`}</button>
        <div className="mt-3 font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{num}</div>
        <div className="mt-4 grid items-start gap-x-12 gap-y-8 min-[1100px]:grid-cols-[minmax(0,1fr)_372px]">
          <div className="flex min-w-0 flex-col gap-3.5">{aviso}{principal(true)}{propuesta}{cambio}{horasOtra}{linea}{tarde}</div>
          <div className="flex flex-col gap-3.5 min-[1100px]:sticky min-[1100px]:top-[96px]">{detalles}{recuerda}{botones}</div>
        </div>
      </div>
      {cx && (
        <>
          <div data-screen-label="Reserva · cancelar" className="fixed inset-0 z-[90] lg:hidden">
            <button type="button" aria-label={E2("Cerrar", "Close")} onClick={() => setCx(false)} className="absolute inset-0 bg-ink/50" />
            <div role="dialog" aria-modal="true" className="absolute inset-x-0 bottom-0 rounded-t-[26px] bg-white px-5 pb-7 pt-3"><div className="mx-auto mb-4 h-1 w-[38px] rounded-full bg-ink/15" />{cancelar}</div>
          </div>
          <div data-screen-label="Reserva · cancelar · desktop" className="fixed inset-0 z-[90] hidden lg:block">
            <button type="button" aria-label={E2("Cerrar", "Close")} onClick={() => setCx(false)} className="absolute inset-0 bg-ink/45" />
            <div role="dialog" aria-modal="true" className="absolute left-1/2 top-[18vh] w-[460px] -translate-x-1/2 rounded-[22px] bg-white p-6 shadow-[0_30px_60px_-20px_rgba(11,14,18,.5)]">{cancelar}</div>
          </div>
        </>
      )}
    </div>
  );
}
