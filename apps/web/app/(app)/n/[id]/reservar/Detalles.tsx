"use client";
/* APP-NEG-RESERVA · móvil y desktop (prototipo rsvDetVals). Te guardamos esta mesa 5 minutos; al enviar, el servidor vuelve
   a revisar que la mesa siga libre (si pasaron los 5 minutos y nadie la tomó, se envía igual). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import type { RsvHold } from "@/lib/reservas";
import { diaL } from "../Reservar";
import { enviarMesa } from "../acciones-reserva";

type N = "Icon" | "Button" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip } = UI as unknown as Record<N, ComponentType<any>>;
const hora = (m: number) => { m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white p-[15px]";
const AREA = { salon: ["Salón", "Dining room"], terraza: ["Terraza", "Patio"], barra: ["Barra", "Bar"] } as Record<string, [string, string]>;
const OCC = [["cumple", "Cumpleaños", "Birthday"], ["aniv", "Aniversario", "Anniversary"], ["cita", "Cita", "Date night"], ["neg", "Negocios", "Business"], ["cele", "Celebración", "Celebration"]] as const;
const NEED = [["bebe", "Silla para bebé", "High chair"], ["ruedas", "Silla de ruedas", "Wheelchair"], ["alergia", "Alergias", "Allergies"], ["tranq", "Mesa tranquila", "Quiet table"]] as const;
const tel = (p: string) => { const d = p.replace(/\D/g, "").slice(-10); return d.length === 10 ? `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p; };

function Caja({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={onClick} className="flex w-full items-center gap-2.5 text-left">
      <span className={`grid size-5 flex-none place-items-center rounded-md ${on ? "bg-ink" : "border-[1.5px] border-ink/20 bg-white"}`}>{on && <Icon name="check" size={12} color="var(--tl-white)" strokeWidth={2.8} />}</span>
      <span className="text-[12.5px] font-semibold leading-[1.45] text-ink/75">{children}</span>
    </button>
  );
}

export function Detalles({ h, es }: { h: RsvHold; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [fin] = useState(() => Date.now() + h.segundos * 1000);
  const [ahora, setAhora] = useState(() => Date.now());
  const [occ, setOcc] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [other, setOther] = useState(false);
  const [otherName, setOtherName] = useState("");
  const [sms, setSms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => { window.scrollTo(0, 0); const t = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = Math.max(0, Math.ceil((fin - ahora) / 1000)), exp = left <= 0;
  const P = (n: number) => `${n} ${n > 1 ? E2("personas", "guests") : E2("persona", "guest")}`;
  const areaL = AREA[h.area] ? (es ? AREA[h.area]![0] : AREA[h.area]![1]) : h.area;
  const nombre = h.negocio.nombre, ed = !!h.editar, edConf = ed && h.editarConfirmada;
  const meta = `${nombre} · ${P(h.p)}`.toUpperCase();
  const volver = () => router.push(`/n/${h.negocio.id}?tab=rsv${ed ? `&editar=${h.editar}` : ""}`);
  const title = ed ? E2("Cambiar reservación", "Change reservation") : E2("Solicitud de mesa", "Table request");
  const durL = h.dur === 60 ? E2("1 hora", "1 hour") : h.dur === 120 ? E2("2 horas", "2 hours") : "1 h 30 min";
  const pol = [
    ["dollar", E2("Sin depósito ni cargo por reservar.", "No deposit or charge to book.")],
    ["clock", E2(`Te guardan la mesa ${h.hold} minutos después de la hora.`, `They hold your table ${h.hold} minutes past the time.`)],
    ["calendar", E2(`Cambiar o cancelar: gratis hasta ${h.cxH} ${h.cxH === 1 ? "hora" : "horas"} antes.`, `Change or cancel for free up to ${h.cxH} ${h.cxH === 1 ? "hour" : "hours"} before.`)],
    ["restaurant", E2(`La mesa es tuya por ${durL}.`, `The table is yours for ${durL}.`)],
    ["info", E2("Si no llegas ni avisas, queda en tu historial de reservaciones.", "If you don't show up or let them know, it stays in your reservation history.")],
  ] as const;
  const cta = exp ? E2("Se liberó la mesa", "Table released") : ed ? (edConf ? E2("Solicitar cambio", "Request change") : E2("Actualizar solicitud", "Update request")) : E2("Enviar solicitud", "Send request");
  const ctaNote = (h.auto && (!ed || edConf) ? E2("SIN DEPÓSITO · SE CONFIRMA AL INSTANTE", "NO DEPOSIT · CONFIRMED INSTANTLY") : `${E2("SIN DEPÓSITO · ", "NO DEPOSIT · ")}${nombre}${E2(" RESPONDE EN UNOS ", " REPLIES IN ABOUT ")}${h.reply} MIN`).toUpperCase();

  const enviar = async () => {
    if (exp || enviando) return;
    setEnviando(true); setError(null);
    try {
      const r = await enviarMesa(h.id, { occ, needs, note: note.trim(), other, otherName: otherName.trim(), sms });
      if (r.ok) { router.replace(`/reserva/${r.numero}`); return; }
      if ("entrar" in r && r.entrar) { router.push(`/entrar?volver=${encodeURIComponent(`/n/${h.negocio.id}?tab=rsv`)}`); return; }
      setError(es ? r.msg.es : r.msg.en); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { setError(E2("No se pudo enviar. Revisa tu conexión y prueba de nuevo.", "Could not send. Check your connection and try again.")); }
    setEnviando(false);
  };

  const retenida = !exp ? (
    <div className="flex items-center gap-2.5 rounded-2xl bg-pro/[.12] px-3.5 py-3">
      <span className="grid flex-none"><Icon name="lock" size={16} color="var(--tl-pro-ink)" /></span>
      <div className="min-w-0 flex-1"><div className="text-[13px] font-bold leading-[1.35] text-pro-ink">{E2("Te guardamos esta mesa", "We're holding this table")}</div><div className="mt-0.5 text-[11.5px] font-medium leading-[1.45] text-pro-ink">{E2("Completa tu solicitud antes de que se libere.", "Complete your request before it is released.")}</div></div>
      <span aria-live="off" className="flex-none font-mono text-[18px] font-extrabold leading-none text-pro-ink">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span>
    </div>
  ) : (
    <div className="flex items-start gap-[11px] rounded-2xl bg-ink/5 px-[15px] py-3.5">
      <span className="grid flex-none pt-px"><Icon name="clock" size={17} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-bold leading-[1.4]">{E2("Se liberó la mesa", "The table was released")}</div>
        <div className="mt-[3px] text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/65">{E2("Pasaron 5 minutos. Elige la hora otra vez: puede que siga libre.", "5 minutes passed. Pick the time again: it may still be free.")}</div>
        <button type="button" onClick={volver} className="mt-[9px] text-[12.5px] font-bold text-action">{E2("Elegir la hora otra vez", "Pick the time again")}</button>
      </div>
    </div>
  );
  const fallo = error && (
    <div role="alert" className="flex items-start gap-[11px] rounded-2xl border border-danger/25 bg-danger/[.08] px-[15px] py-3.5">
      <span className="grid flex-none pt-px"><Icon name="warning" size={17} color="var(--tl-danger)" /></span>
      <div className="min-w-0"><div className="text-[13.5px] font-bold leading-[1.4] text-danger">{error}</div><button type="button" onClick={volver} className="mt-2 text-[12.5px] font-bold text-action">{E2("Elegir la hora otra vez", "Pick the time again")}</button></div>
    </div>
  );
  const editando = ed && (
    <div className="flex items-start gap-2.5 rounded-[14px] bg-ink/[.04] px-3.5 py-3">
      <span className="grid flex-none pt-px"><Icon name="info" size={15} color="rgba(11,14,18,.6)" /></span>
      <div className="min-w-0"><div className="text-[12.5px] font-bold leading-[1.4]">{edConf ? E2("Tu reservación actual sigue en pie", "Your current reservation stands") : E2("Actualizas tu solicitud", "You update your request")}</div><div className="mt-0.5 text-pretty text-[12px] font-medium leading-[1.5] text-ink/65">{edConf ? E2(`Si ${nombre} no puede hacer el cambio, se queda como está.`, `If ${nombre} can't make the change, it stays as it is.`) : E2(`${nombre} todavía no ha respondido: verá la nueva hora.`, `${nombre} hasn't replied yet: they will see the new time.`)}</div></div>
    </div>
  );
  const mesa = (desk: boolean) => (
    <div className={`${caja} flex items-center gap-[13px]`}>
      <span className={`flex-none rounded-[14px] bg-[var(--tl-photo-bg)] bg-cover bg-center ${desk ? "size-16" : "size-[54px]"}`} style={h.negocio.foto ? { backgroundImage: `url(${h.negocio.foto})` } : undefined} />
      <div className="min-w-0 flex-1">
        <div className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{nombre}</div>
        <div className="mt-[5px] text-[13.5px] font-bold leading-[1.35]">{diaL(h.ymd, h.dia, es, true)} · {hora(h.h)}</div>
        <div className="mt-0.5 text-[12px] font-medium leading-[1.45] text-ink/60">{P(h.p)} · {areaL}</div>
      </div>
      <button type="button" onClick={volver} className="flex-none text-[12px] font-bold text-action">{E2("Cambiar", "Change")}</button>
    </div>
  );
  const nombreCaja = (
    <div className={caja}>
      <div className={K}>{E2("A NOMBRE DE", "NAME")}</div>
      <div className="mt-[9px] flex items-center gap-[11px]">
        <span className="grid size-9 flex-none place-items-center rounded-[11px] bg-action/10"><Icon name="users" size={17} color="var(--tl-action)" /></span>
        <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{h.quien}</div><div className="mt-0.5 font-mono text-[11px] font-semibold text-ink/50">{tel(h.telefono)}</div></div>
      </div>
      <div className="mt-3 border-t border-line pt-3"><Caja on={other} onClick={() => setOther(!other)}>{E2("La reservación es para otra persona", "The reservation is for someone else")}</Caja></div>
      {other && (
        <div className="mt-2.5 flex h-[46px] items-center rounded-[13px] border border-ink/[.12] px-3.5">
          <input value={otherName} onChange={(e) => setOtherName(e.target.value.slice(0, 60))} placeholder={E2("Nombre de quien llega", "Name of the person arriving")} aria-label={E2("Nombre de quien llega", "Name of the person arriving")} className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-semibold text-ink outline-none" />
        </div>
      )}
    </div>
  );
  const chips = (k: string, items: readonly (readonly [string, string, string])[], on: (x: string) => boolean, set: (x: string) => void) => (
    <div className={caja}>
      <div className={K}>{k}</div>
      <div className="mt-[11px] flex flex-wrap gap-[7px]">{items.map(([v, a, b]) => <Chip key={v} variant={on(v) ? "selected" : "filter"} onClick={() => set(v)}>{es ? a : b}</Chip>)}</div>
    </div>
  );
  const ocasion = chips(E2("OCASIÓN · OPCIONAL", "OCCASION · OPTIONAL"), OCC, (v) => occ === v, (v) => setOcc(occ === v ? "" : v));
  const necesitan = chips(E2("¿NECESITAN ALGO? · OPCIONAL", "ANYTHING YOU NEED? · OPTIONAL"), NEED, (v) => needs.includes(v), (v) => setNeeds(needs.includes(v) ? needs.filter((y) => y !== v) : [...needs, v]));
  const notaCaja = (
    <div className={caja}>
      <div className="flex items-baseline justify-between gap-2.5"><span className={K}>{E2("NOTA PARA EL RESTAURANTE · OPCIONAL", "NOTE FOR THE RESTAURANT · OPTIONAL")}</span><span className="flex-none font-mono text-[9.5px] font-semibold text-ink/[.42]">{note.length}/200</span></div>
      <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} rows={3} aria-label={E2("Nota para el restaurante", "Note for the restaurant")}
        placeholder={needs.includes("alergia") ? E2("Cuéntales las alergias: ej. mariscos, maní…", "Tell them the allergies: e.g. shellfish, peanuts…") : E2("Ej.: vamos con una persona mayor, preferimos cerca de la entrada", "E.g. coming with an older person, we prefer near the entrance")}
        className="mt-2.5 w-full resize-none rounded-[13px] border border-ink/[.12] bg-white px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] text-ink outline-none" />
      <div className="mt-3 border-t border-line pt-3"><Caja on={sms} onClick={() => setSms(!sms)}>{E2("Avísame por SMS cuando confirmen y el día de la reservación", "Text me when they confirm and on the day")}</Caja></div>
    </div>
  );
  const politicas = (
    <div className={caja}>
      <div className={K}>{E2("ANTES DE ENVIAR", "BEFORE YOU SEND")}</div>
      <div className="mt-[11px] flex flex-col gap-2.5">{pol.map(([ic, l]) => <div key={ic} className="flex items-start gap-2.5"><span className="grid flex-none pt-px"><Icon name={ic} size={15} color="rgba(11,14,18,.55)" /></span><span className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/70">{l}</span></div>)}</div>
    </div>
  );
  const boton = <Button variant="primary" icon="calendar" block disabled={exp || enviando} onClick={enviar}>{cta}</Button>;
  const nota = <div className="text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-ink/45">{ctaNote}</div>;

  return (
    <div data-pantalla="APP-NEG-RESERVA" className="min-h-dvh bg-paper pb-[130px] lg:px-[30px] lg:pb-[60px] lg:pt-[22px]">
      {/* Teléfono */}
      <div data-screen-label="APP-NEG-RESERVA · móvil" className="lg:hidden">
        <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3">
          <button type="button" aria-label={E2("Volver", "Back")} onClick={volver} className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
          <div className="min-w-0 flex-1"><div className="font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{title}</div><div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{meta}</div></div>
        </div>
        <div className="flex flex-col gap-3 px-4 pt-4">{fallo}{retenida}{editando}{mesa(false)}{nombreCaja}{ocasion}{necesitan}{notaCaja}{politicas}</div>
        <div data-screen-label="Reserva · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex">{boton}</div><div className="mt-[9px]">{nota}</div>
        </div>
      </div>
      {/* Escritorio */}
      <div data-screen-label="APP-NEG-RESERVA · desktop" className="mx-auto hidden max-w-[1380px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{nombre}</button>
        <div className="mt-3.5"><h1 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em]">{title}</h1><div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{meta}</div></div>
        <div className="mt-6 grid items-start gap-x-12 gap-y-8 min-[1100px]:grid-cols-[minmax(0,1fr)_372px]">
          <div className="flex min-w-0 flex-col gap-3.5">{fallo}{editando}{mesa(true)}{nombreCaja}{ocasion}{necesitan}{notaCaja}</div>
          <div className="flex flex-col gap-3.5 min-[1100px]:sticky min-[1100px]:top-[96px]">{retenida}{politicas}<div className="flex">{boton}</div>{nota}</div>
        </div>
      </div>
    </div>
  );
}
