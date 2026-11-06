"use client";
/* APP-NEG-CITA · móvil (prototipo citaVals): «Cita · estado» (Solicitud enviada / Cita confirmada / Te propone otra hora
   / No pudo tomarla / Sin respuesta / Cita cancelada / Cita terminada), el camino (OrderTracker), los detalles, el dinero
   y Llamar · Mensaje. Se actualiza solo mientras espera respuesta. Compuesto con el sistema de diseño. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, type ComponentType } from "react";
import type { CitaVista } from "@/lib/citas";

type N = "Icon" | "Button" | "OrderTracker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, OrderTracker } = UI as unknown as Record<N, ComponentType<any>>;

const dinero = (c: number) => (c % 100 === 0 ? `$${c / 100}` : `$${(c / 100).toFixed(2)}`);
const horaL = (m: number) => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const DL = { es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
const DS = { es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
const MO = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});

export function Estado({ c, yo, es }: { c: CitaVista; yo: string; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  // Mientras espera respuesta, se mira cada 15 s (la respuesta también llega a Avisos).
  useEffect(() => { if (c.st !== "pend" && c.st !== "alt") return; const t = setInterval(() => router.refresh(), 15000); return () => clearInterval(t); }, [c.st, router]);
  const d = new Date(`${c.ymd}T12:00:00Z`);
  const diaL = es ? `${DL.es[d.getUTCDay()]} ${d.getUTCDate()} ${MO.es[d.getUTCMonth()]}` : `${DL.en[d.getUTCDay()]}, ${MO.en[d.getUTCMonth()]} ${d.getUTCDate()}`;
  const diaS = c.i === 0 ? E2("Hoy", "Today") : c.i === 1 ? E2("Mañana", "Tomorrow") : `${DS[es ? "es" : "en"][d.getUTCDay()]} ${d.getUTCDate()}`;
  const silla = c.model === "chair";
  const who1 = silla && c.con ? c.con.corto : c.negocio.nombre;
  const withL = c.con ? (silla ? `${c.con.nombre} · ${nm(c.silla).toLowerCase()} ${c.con.silla ?? ""}` : c.con.nombre) : c.negocio.nombre;
  const mins = c.resp >= 60 ? `${Math.round(c.resp / 60)} h` : `${c.resp} min`;
  const dev = c.dep ? E2(`Te devolvemos los ${dinero(c.dep)} del depósito.`, `We refund your ${dinero(c.dep)} deposit.`) : E2("No se cobró nada.", "Nothing was charged.");
  const H: Record<CitaVista["st"], [string, string, string, string, string, string, string, string]> = {
    pend: ["clock", "bg-pro/[.18]", "var(--tl-pro-ink)", E2("Solicitud enviada", "Request sent"), E2(`${who1} tiene ${c.exp} horas para contestar. Suele tardar ${mins}. Te avisamos en Avisos apenas responda.`, `${who1} has ${c.exp} hours to reply. Usually ${mins}. We notify you in Alerts as soon as they do.`), E2("PENDIENTE DE CONFIRMAR", "WAITING FOR CONFIRMATION"), "bg-pro/20", "var(--tl-pro-ink)"],
    ok: ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("Cita confirmada", "Booking confirmed"), `${cap(diaL)}${E2(" a las ", " at ")}${horaL(c.m)}${E2(" con ", " with ")}${withL}.`, `${E2("CONFIRMADA POR ", "CONFIRMED BY ")}${silla ? who1 : E2("EL NEGOCIO", "THE BUSINESS")}`.toUpperCase(), "bg-signal/20", "var(--tl-open-text)"],
    alt: ["calendar", "bg-action/10", "var(--tl-action)", E2("Te propone otra hora", "A new time was proposed"), E2(`${who1} no puede a las ${horaL(c.m)}. ${c.dep ? `Si no te sirve, te devolvemos los ${dinero(c.dep)}.` : "Decide abajo."}`, `${who1} cannot do ${horaL(c.m)}. ${c.dep ? `If it does not work for you, we refund the ${dinero(c.dep)}.` : "Decide below."}`), E2("TE PROPONEN UN CAMBIO", "THEY PROPOSE A CHANGE"), "bg-action/10", "var(--tl-action)"],
    no: ["close", "bg-danger/10", "var(--tl-danger)", E2("No pudo tomarla", "Could not take it"), `${E2(`${who1} no tiene otra hora que ofrecerte. `, `${who1} has no other time to offer. `)}${dev}`, E2("NO PUDO", "COULD NOT"), "bg-danger/10", "var(--tl-danger)"],
    exp: ["clock", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("Sin respuesta", "No reply"), `${E2(`${who1} no contestó en ${c.exp} horas. `, `${who1} did not reply in ${c.exp} hours. `)}${dev}`, E2("VENCIDA", "EXPIRED"), "bg-ink/[.06]", "rgba(11,14,18,.6)"],
    cx: ["close", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("Cita cancelada", "Booking cancelled"), c.cxPor === "user" ? `${E2("Cancelaste a tiempo. ", "Cancelled in time. ")}${dev}` : dev, E2("CANCELADA", "CANCELLED"), "bg-ink/[.06]", "rgba(11,14,18,.6)"],
    done: ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("Cita terminada", "Appointment done"), `${cap(diaL)}${E2(" con ", " with ")}${withL}.${c.dep ? E2(` El depósito de ${dinero(c.dep)} se descontó del total.`, ` The ${dinero(c.dep)} deposit came off the total.`) : ""}`, E2("TERMINADA", "DONE"), "bg-signal/20", "var(--tl-open-text)"],
  };
  const [ic, icBg, icFg, t, line, pill, pillBg, pillFg] = H[c.st];
  const pend = c.st === "pend", ok = c.st === "ok", alt = c.st === "alt", done = c.st === "done", dead = c.st === "no" || c.st === "exp" || c.st === "cx";
  const steps = [{ label: E2("Solicitud enviada", "Request sent"), time: horaL(c.enviada), state: "done" },
    { label: pend ? `${E2("Esperando a ", "Waiting for ")}${who1}` : ok || done ? (c.auto ? E2("Confirmada al instante", "Confirmed instantly") : `${E2("Confirmada por ", "Confirmed by ")}${who1}`) : alt ? E2("Propuso otra hora", "Proposed another time") : c.st === "no" ? E2("No pudo tomarla", "Could not take it") : c.st === "exp" ? E2("Sin respuesta", "No reply") : E2("Cancelada", "Cancelled"),
      time: c.contestada != null ? horaL(c.contestada) : `~${mins.toUpperCase()}`, state: pend || alt ? "current" : "done" },
    ...(dead ? [] : [{ label: E2("Tu cita", "Your appointment"), time: `${diaS} ${horaL(c.m)}`.toUpperCase(), state: done ? "done" : ok ? "current" : "next" }, { label: `${E2("Calificas a ", "You rate ")}${who1}`, time: "", state: done ? "current" : "next" }])];
  const optL = c.opts.map((o) => nm(o.o)).join(" · "), addL = c.adds.map((a) => nm(a.name)).join(" · ");
  const paraL = c.para === "me" ? yo : `${c.nombre ?? E2("Otra persona", "Someone else")}${c.para === "kid" && c.edad ? ` · ${c.edad}${E2(" años", " yrs")}` : ""}`;
  const rows = [[E2("SERVICIO", "SERVICE"), `${nm(c.svc)}${optL ? ` · ${optL}` : ""}`], ...(addL ? [["EXTRAS", addL]] : []), [E2("CUÁNDO", "WHEN"), `${cap(diaL)} · ${horaL(c.m)} – ${horaL(c.m + c.dur)}`],
    [E2("CON", "WITH"), withL], [E2("DÓNDE", "WHERE"), c.negocio.direccion ?? c.negocio.nombre], [E2("PARA", "FOR"), paraL], ...(c.nota ? [[E2("NOTA", "NOTE"), c.nota]] : []), ["TOTAL", dinero(c.total)]];
  const rest = c.total - c.dep, tarjeta = c.tarjeta ?? E2("tu tarjeta", "your card");
  const restW = silla && c.con ? E2(`en la silla de ${c.con.corto}`, `at ${c.con.corto}'s chair`) : E2("en el local", "at the shop");
  const plata: [string, string, string, string, string][] = [];
  if (c.dep) {
    if (pend || alt) plata.push(["card", E2("Depósito cobrado", "Deposit charged"), dinero(c.dep), "var(--tl-pro-ink)", `${tarjeta}${E2(" · se devuelve si no se confirma", " · refunded if not confirmed")}`]);
    else if (ok || done) plata.push(["check", E2("Depósito pagado", "Deposit paid"), dinero(c.dep), "var(--tl-open-text)", `${tarjeta}${E2(" · se descuenta del total", " · taken off the total")}`]);
    else plata.push(["check", E2("Depósito devuelto", "Deposit refunded"), dinero(c.dep), "var(--tl-open-text)", `${tarjeta}${E2(" · 1 a 5 días hábiles", " · 1 to 5 business days")}`]);
  }
  if (!dead) plata.push(["store", `${cap(diaL)}, ${restW}`, dinero(c.dep ? rest : c.total), "var(--tl-ink)", silla && c.con ? E2(`Efectivo o tarjeta, a ${c.con.corto}. No al local.`, `Cash or card, to ${c.con.corto}. Not to the shop.`) : E2("Efectivo o tarjeta.", "Cash or card.")]);
  const foto = silla && c.con?.foto ? c.con.foto : c.negocio.foto;
  const llamar = () => { if (c.negocio.telefono) location.href = `tel:${c.negocio.telefono}`; };

  return (
    <div data-screen-label="APP-NEG-CITA · móvil" className="min-h-[100dvh] bg-paper pb-10">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b lg:top-0 border-ink/[.07] bg-white px-4 py-3">
        <button type="button" aria-label={E2("Cerrar", "Close")} onClick={() => router.push(`/n/${c.negocio.id}?tab=svc`)} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{t}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${E2("CITA ", "BOOKING ")}#${c.numero} · ${c.negocio.nombre}`.toUpperCase()}</div></div>
      </div>
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pt-4">
        <div data-screen-label="Cita · estado" className="rounded-[20px] border border-ink/[.07] bg-white px-[18px] pb-5 pt-6 text-center">
          <div className={`mx-auto grid h-[60px] w-[60px] place-items-center rounded-[20px] ${icBg}`}><Icon name={ic} size={26} color={icFg} strokeWidth={2.2} /></div>
          <h1 className="m-0 mt-4 font-display text-[24px] font-extrabold leading-[1.12] tracking-[-0.04em]">{t}</h1>
          <p className="m-0 mt-[9px] text-pretty text-[13px] leading-[1.55] text-ink/[.62]">{line}</p>
          <div className={`mt-[13px] inline-flex items-center gap-2 rounded-[10px] px-3 py-[7px] font-mono text-[9.5px] font-bold tracking-[0.12em] ${pillBg}`} style={{ color: pillFg }}><span className="h-[7px] w-[7px] rounded-full" style={{ background: pillFg }} />{pill}</div>
        </div>
        <div className="grid"><OrderTracker steps={steps} /></div>
        <div className="overflow-hidden rounded-[18px] border border-ink/[.07] bg-white">
          <div className="flex items-center gap-3 border-b border-ink/[.07] px-[15px] py-3.5">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-[14px] bg-photo-bg font-display text-[15px] font-extrabold text-ink/40" style={fondo(foto)}>{foto ? null : who1.charAt(0)}</span>
            <div className="min-w-0 flex-1"><div className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("TU CITA", "YOUR BOOKING")}</div><div className="mt-[5px] font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]">{withL}</div>
              <div className="mt-[3px] font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{(c.negocio.direccion ?? c.negocio.nombre).toUpperCase()}</div></div>
          </div>
          <div className="px-[15px] py-0.5">
            {rows.map(([k, v], n) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v}</span></div>)}
            {c.fotos.length > 0 && <div className="flex gap-2 border-t border-ink/[.06] py-[11px]">{c.fotos.map((u) => <span key={u} className="h-14 w-14 rounded-xl bg-photo-bg" style={fondo(u)} />)}</div>}
          </div>
        </div>
        <div className="rounded-[18px] border border-ink/[.07] bg-white p-[15px]">
          <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("DINERO", "MONEY")}</div>
          {c.dep > 0 && !dead && <div className="mt-3 flex h-1.5 gap-[3px]"><span className="rounded-full bg-ink" style={{ flex: c.dep }} /><span className="rounded-full bg-ink/[.12]" style={{ flex: Math.max(rest, 1) }} /></div>}
          <div className="mt-3 flex flex-col gap-[11px]">
            {plata.map(([icon, k, v, fg, sub]) => (
              <div key={k} className="flex items-center gap-[11px]">
                <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[11px] bg-ink/5"><Icon name={icon} size={16} color={fg} /></span>
                <div className="min-w-0 flex-1"><div className="text-[13px] font-bold" style={{ color: fg }}>{k}</div><div className="mt-[3px] font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{sub}</div></div>
                <span className="font-display text-[15px] font-extrabold leading-none tracking-[-0.02em]">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {c.negocio.telefono && <div className="grid min-w-0 flex-1"><Button variant="secondary" size="md" icon="phone" onClick={llamar}>{E2("Llamar", "Call")}</Button></div>}
          <div className="grid min-w-0 flex-1"><Button variant="secondary" size="md" icon="bubble" onClick={() => router.push(`/cuenta/mensajes/${c.negocio.id}?op=${encodeURIComponent(c.numero)}`)}>{E2("Mensaje", "Message")}</Button></div>
        </div>
      </div>
    </div>
  );
}
