"use client";
/* APP-NEG-AUTO-PREEST-ESTADO / APP-NEG-HOGAR-PREEST-ESTADO (diseño neg-auto-pre.js / neg-hogar-pre.js › stVals): el estado
   (enviado · tu pre-estimado · hay que verlo · no lo hacen · sin respuesta · reservaste · cancelado), el camino, la respuesta
   del negocio (rango, qué incluye, qué puede cambiarlo, válido 7 días) con «Reservar con este pre-estimado», lo que mandaste
   y, si no lo hacen, otros negocios de la ciudad. Se actualiza solo mientras espera. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import type { SolicitudVista } from "@/lib/solicitudes";
import { solicitudAccion } from "./acciones";

type N = "Icon" | "Button" | "OrderTracker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, OrderTracker } = UI as unknown as Record<N, ComponentType<any>>;
const dinero = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});
const LIGHTS: Record<string, [string, string]> = { ce: ["Check engine", "Check engine"], bat: ["Batería", "Battery"], temp: ["Temperatura", "Temperature"], abs: ["Frenos o ABS", "Brakes or ABS"], oil: ["Aceite", "Oil"], tpms: ["Presión de gomas", "Tire pressure"] };
const AREAS: Record<string, [string, string]> = { cocina: ["Cocina", "Kitchen"], bano: ["Baño", "Bathroom"], sotano: ["Sótano", "Basement"], cuarto: ["Cuarto", "Bedroom"], sala: ["Sala", "Living room"], afuera: ["Afuera", "Outside"], toda: ["Toda la casa", "Whole house"] };

export function Solicitud({ s, es }: { s: SolicitudVista; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter(), nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null);
  const d = s.destinos[0]!, auto = s.rubro === "auto", who = d.negocio.quien?.split(" ")[0] ?? d.negocio.nombre;
  const st = s.st === "cancelled" ? "cx" : s.st === "used" ? "used" : s.st === "expired" ? "exp" : d.st === "sent" ? "sent" : d.st === "used" ? "used" : d.st;
  useEffect(() => { if (st !== "sent") return; const t = setInterval(() => router.refresh(), 15000); return () => clearInterval(t); }, [st, router]);
  const hacer = async (que: "cancelar" | "reenviar") => {
    if (ocupado) return; setOcupado(true); setError(null);
    const r = await solicitudAccion(s.numero, que).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false); if (r.ok) router.refresh(); else setError(es ? r.msg.es : r.msg.en);
  };
  const r = d.reply ?? {}, rng = r.lo ? `${dinero(r.lo)}–${dinero(r.hi ?? r.lo)}` : "", que = auto ? E2(`tu ${s.form.veh?.t.split(" ").slice(2).join(" ") || "carro"}`, `your ${s.form.veh?.t.split(" ").slice(2).join(" ") || "car"}`) : E2("tu casa", "your home");
  const H: Record<string, [string, string, string, string, string, string]> = {
    sent: ["clock", "bg-action/10", "var(--tl-action)", E2("ENVIADO", "SENT"), E2(`Esperando a ${who}`, `Waiting for ${who}`), E2(`Responde a más tardar el ${s.vence?.es ?? ""}. Te avisamos en Avisos.`, `Replies by ${s.vence?.en ?? ""}. We notify you in Alerts.`)],
    rng: ["dollar", "bg-signal/[.18]", "var(--tl-open-text)", E2("TU PRE-ESTIMADO", "YOUR PRE-ESTIMATE"), rng, auto ? E2(`Para ${que}. Es un rango con fotos: el precio real sale en el estimado, después de verlo.`, `For ${que}. A range from photos: the real price comes in the estimate after they see it.`) : E2("Es un rango con fotos: el precio completo te llega antes de empezar.", "A range from photos: the full price reaches you before they start.")],
    see: ["warning", "bg-pro/20", "var(--tl-pro-ink)", E2("HAY QUE VERLO", "NEEDS AN INSPECTION"), rng, auto ? E2("Con las fotos no se ve bien. El rango es amplio; se cierra con el diagnóstico en el taller.", "The photos do not show enough. The range is wide; the diagnosis at the shop narrows it.") : E2("Con las fotos no se ve bien. El rango es amplio; se cierra con la visita.", "The photos do not show enough. The range is wide; the visit narrows it.")],
    no: ["close", "bg-danger/10", "var(--tl-danger)", E2("NO LO HACEN", "NOT A SERVICE THEY DO"), E2(`${d.negocio.nombre} no hace este trabajo`, `${d.negocio.nombre} does not do this job`), E2("Te dejamos negocios de la ciudad que sí lo hacen.", "Here are businesses in the city that do.")],
    exp: ["clock", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("SIN RESPUESTA", "NO REPLY"), E2(`${who} no respondió a tiempo`, `${who} did not reply in time`), E2("Puedes mandarlo otra vez o pedirlo a otro negocio.", "Send it again or ask another business.")],
    used: ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("RESERVASTE", "YOU BOOKED"), rng, auto ? E2("Tu cita lleva este pre-estimado. Si el estimado se pasa, te explican por qué antes de aprobar.", "Your booking carries this pre-estimate. If the estimate goes over, they explain why before you approve.") : E2("Tu visita lleva este pre-estimado. Si el precio se pasa, te explican por qué antes de aprobar.", "Your visit carries this pre-estimate. If the price goes over, they explain why before you approve.")],
    cx: ["close", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("CANCELADO", "CANCELLED"), E2("Ya no lo necesitas", "No longer needed"), E2("No se cobró nada.", "Nothing was charged.")],
  };
  const h = H[st] ?? H.sent!;
  const steps = [{ label: E2("Enviado", "Sent"), time: s.enviada, state: "done" }, { label: `${E2("Respuesta de ", "Reply from ")}${who}`, time: d.at ?? "", state: st === "sent" ? "current" : "done" },
    { label: E2("Reservas", "You book"), time: "", state: st === "used" ? "done" : ["rng", "see"].includes(st) ? "current" : "next" }];
  const reservar = (svc: string) => router.push(`/n/${d.negocio.id}?tab=svc&of=${svc}&pre=${s.numero}`);
  const cta = st === "rng" ? { l: E2("Reservar con este pre-estimado", "Book with this pre-estimate"), on: () => reservar(d.item ?? "") }
    : st === "see" ? d.diag ? { l: `${auto ? E2("Reservar el diagnóstico · ", "Book the diagnosis · ") : E2("Reservar la visita · ", "Book the visit · ")}${d.diag.cents ? dinero(d.diag.cents) : E2("gratis", "free")}`, on: () => reservar(d.diag!.id) } : { l: E2("Reservar para que lo vean", "Book an inspection"), on: () => reservar(d.item ?? "") } : null;
  const filas: [string, string][] = [
    ...(s.form.veh ? [[E2("VEHÍCULO", "VEHICLE"), `${s.form.veh.t}${s.form.veh.mi ? ` · ${s.form.veh.mi.toLocaleString("en-US")} mi` : ""}`] as [string, string]] : []),
    ...(s.form.casa ? [[E2("CASA", "HOME"), s.form.casa.dir] as [string, string]] : []),
    [E2("SERVICIO", "SERVICE"), nm(s.svc)],
    ...(s.form.area ? [[E2("DÓNDE", "WHERE"), (AREAS[s.form.area] ?? [s.form.area, s.form.area])[es ? 0 : 1]] as [string, string]] : []),
    ...(s.form.luces.length ? [[E2("LUCES", "LIGHTS"), s.form.luces.map((k) => (LIGHTS[k] ?? [k, k])[es ? 0 : 1]).join(" · ")] as [string, string]] : []),
    ...(s.form.code ? [[E2("CÓDIGO", "CODE"), s.form.code] as [string, string]] : []),
    ...(s.form.marca || s.form.edad ? [[E2("EQUIPO", "EQUIPMENT"), [s.form.marca, s.form.edad].filter(Boolean).join(" · ")] as [string, string]] : []),
    ...(s.form.nota ? [[E2("LE CONTASTE", "YOU SAID"), `«${s.form.nota}»`] as [string, string]] : []),
    [E2("PARA", "NEEDED"), s.form.cuando === "hoy" ? E2("Lo necesito hoy", "I need it today") : s.form.cuando === "nada" ? E2("Sin prisa", "No rush") : E2("Esta semana", "This week")],
  ];
  const acts: [string, string, () => void][] = st === "sent" ? [["close", E2("Ya no lo necesito", "No longer needed"), () => void hacer("cancelar")]]
    : ["rng", "see"].includes(st) ? [["bubble", E2("Preguntar algo", "Ask a question"), () => router.push(`/cuenta/mensajes/${d.negocio.id}`)], ["close", E2("Ya no lo necesito", "No longer needed"), () => void hacer("cancelar")]]
      : st === "exp" ? [["image", E2("Mandarlo otra vez", "Send again"), () => void hacer("reenviar")]] : st === "used" && s.cita ? [["calendar", E2("Ver tu cita", "See your booking"), () => router.push(`/cita/${s.cita}`)]] : [];
  return (
    <div data-screen-label={auto ? "APP-NEG-AUTO-PREEST-ESTADO" : "APP-NEG-HOGAR-PREEST-ESTADO"} className="min-h-[100dvh] bg-paper pb-10">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:top-0">
        <button type="button" aria-label={E2("Volver al negocio", "Back to the business")} onClick={() => router.push(`/n/${d.negocio.id}?tab=svc`)} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{nm(s.svc)}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${E2("PRE-ESTIMADO #", "PRE-ESTIMATE #")}${s.numero} · ${d.negocio.nombre}`.toUpperCase()}</div></div>
      </div>
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pt-4">
        {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
        <div data-screen-label="Pre-estimado · estado" className="rounded-[20px] border border-ink/[.07] bg-white px-[18px] pb-5 pt-6 text-center">
          <div className={`mx-auto grid h-[60px] w-[60px] place-items-center rounded-[20px] ${h[1]}`}><Icon name={h[0]} size={26} color={h[2]} strokeWidth={2.2} /></div>
          <div className="mt-[13px] font-mono text-[9.5px] font-bold tracking-[0.14em]" style={{ color: h[2] }}>{h[3]}</div>
          <h1 className={`m-0 mt-2 font-display font-extrabold leading-[1.12] tracking-[-0.04em] ${["rng", "see", "used"].includes(st) ? "text-[32px]" : "text-[22px]"}`}>{h[4]}</h1>
          <p className="m-0 mt-[9px] text-pretty text-[13px] leading-[1.55] text-ink/[.62]">{h[5]}</p>
        </div>
        {(st === "rng" || st === "see") && (
          <div data-screen-label="Pre-estimado · respuesta" className="rounded-[18px] border border-ink/[.07] bg-white p-4">
            <div className="flex items-center gap-2.5"><span className="h-9 w-9 flex-none rounded-full bg-photo-bg" style={fondo(d.negocio.foto)} />
              <div className="min-w-0 flex-1"><div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{`${E2("RESPUESTA DE ", "REPLY FROM ")}${who}`.toUpperCase()}</div><div className="mt-0.5 font-mono text-[9.5px] font-semibold text-ink/40">{d.at}</div></div></div>
            {r.nota && <p className="m-0 mt-3 text-pretty text-[13.5px] font-medium leading-[1.55]">{r.nota}</p>}
            {st === "rng" && (r.inc ?? []).length > 0 && <div className="mt-3.5"><div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("LO QUE INCLUYE EL RANGO", "WHAT THE RANGE COVERS")}</div>
              <div className="mt-2 flex flex-col gap-1.5">{r.inc!.map((t) => <div key={t} className="flex items-start gap-2 text-[12.5px] font-medium leading-[1.45] text-ink/75"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open)" strokeWidth={2.2} /></span>{t}</div>)}</div></div>}
            {(r.chg ?? []).length > 0 && <div className="mt-3.5"><div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{E2("LO QUE PUEDE CAMBIARLO", "WHAT CAN CHANGE IT")}</div>
              <div className="mt-2 flex flex-col gap-1.5">{r.chg!.map((t) => <div key={t} className="flex items-start gap-2 text-[12.5px] font-medium leading-[1.45] text-ink/65"><span className="grid flex-none pt-0.5"><Icon name="info" size={13} color="rgba(11,14,18,.45)" /></span>{t}</div>)}</div></div>}
            {s.valida && <div className="mt-3.5 text-[12px] font-semibold text-ink/55">{E2(`Válido 7 días: hasta el ${s.valida.es}.`, `Valid 7 days: until ${s.valida.en}.`)}{r.dias ? ` ${E2("Suele tardar ", "Usually takes ")}${r.dias}.` : ""}</div>}
            {cta && <div className="mt-3.5 grid"><Button block onClick={cta.on}>{cta.l}</Button></div>}
          </div>
        )}
        <div className="grid"><OrderTracker steps={steps} /></div>
        <div className="overflow-hidden rounded-[18px] border border-ink/[.07] bg-white">
          <div className="border-b border-ink/[.07] px-[15px] py-3 font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("LO QUE MANDASTE", "WHAT YOU SENT")}</div>
          <div className="px-[15px] py-0.5">
            {filas.map(([k, v], n) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-pretty text-right text-[13px] font-semibold leading-[1.45]">{v}</span></div>)}
            {s.fotos.length > 0 && <div className="flex flex-wrap gap-2 border-t border-ink/[.06] py-[11px]">{s.fotos.map((u) => <span key={u} className="h-14 w-14 rounded-xl bg-photo-bg" style={fondo(u)} />)}</div>}
          </div>
        </div>
        {s.otros.length > 0 && (
          <div className="rounded-[18px] border border-ink/[.07] bg-white p-4">
            <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("LO HACEN EN TU CIUDAD", "BUSINESSES IN YOUR CITY THAT DO IT")}</div>
            <div className="mt-2.5 flex flex-col gap-2">{s.otros.map((o) => <button key={o.id} type="button" onClick={() => router.push(`/n/${o.id}?tab=svc`)} className="flex items-center gap-3 rounded-[14px] border border-ink/[.08] px-3 py-2.5 text-left">
              <span className="h-10 w-10 flex-none rounded-xl bg-photo-bg" style={fondo(o.foto)} /><span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-bold">{o.nombre}</span><span className="mt-0.5 block truncate font-mono text-[9.5px] font-semibold text-ink/50">{o.meta.toUpperCase()}</span></span>
              <Icon name="chevronRight" size={15} color="rgba(11,14,18,.35)" /></button>)}</div>
          </div>
        )}
        {acts.length > 0 && <div className="grid grid-cols-2 gap-2">{acts.map(([icon, l, on]) => <div key={l} className="grid"><Button variant="secondary" size="md" icon={icon} disabled={ocupado} onClick={on}>{l}</Button></div>)}</div>}
        <div className="flex items-center gap-2.5 rounded-[14px] bg-signal/[.12] px-3.5 py-3"><Icon name="shield" size={16} color="var(--tl-open-text)" /><span className="text-pretty text-[12.5px] font-extrabold leading-[1.4] text-open-text">{E2("Un rango con fotos no es un precio final. Nada se hace ni se cobra sin tu OK.", "A range from photos is not a final price. Nothing is done or charged without your OK.")}</span></div>
      </div>
    </div>
  );
}
