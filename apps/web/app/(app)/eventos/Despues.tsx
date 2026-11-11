"use client";
/* 6d · Las hojas de después de comprar (prototipo «To'Latino Eventos» shVals L1485 y su marcado L559–580): Transferir boletos (teléfono →
   «Enviar boleto»; «EL QR ANTERIOR QUEDA ANULADO»), Ayuda con esta orden (HelpReasonList: No veo mis boletos · Cambiar un nombre · Un
   problema con el pago · Cancelar mis boletos), Cancelar mis boletos (lo que se devuelve y hasta cuándo, del servidor) y Cambiar el nombre.
   La hoja es la de la app (fondo, esquinas de 26 px abajo en el teléfono, centrada en escritorio) como Cita › cancelar. Montos: solo los
   muestra; los decide el servidor al confirmar. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import type { PrevioCancelar } from "@/lib/boletos-despues";
import { diaCorto, dinero, hora } from "@/lib/evt-comun";
import { bolCancelar, bolNombre, bolPrevioCancelar, bolReenviarme, bolTransferir } from "./acciones-despues";
import { uuid } from "@/lib/uuid";

type N = "Icon" | "Button" | "HelpReasonList" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, HelpReasonList, Chip } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.16em] text-ink/45";
/* Una hora del servidor (UTC) en la zona de la ciudad, con el formato de la app: «dom 15 nov · 8 PM». */
export const fechaHora = (iso: string, tz: string, es: boolean) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${diaCorto(`${p.year}-${p.month}-${p.day}`, es)} · ${hora((Number(p.hour) % 24) * 60 + Number(p.minute))}`;
};
const nuevaClave = () => (uuid());

export function Hoja({ titulo, label, onClose, children, es, fondo = "bg-white" }: { titulo: string; label: string; onClose: () => void; children: ReactNode; es: boolean; fondo?: string }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60]">
      <div onClick={onClose} className="absolute inset-0 bg-ink/50" />
      <div role="dialog" aria-modal="true" aria-label={titulo} data-screen-label={label}
        className={`absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[26px] ${fondo} px-4 pb-6 pt-[18px] lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[460px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px] lg:px-5`}>
        <div className="flex items-center justify-between gap-2.5">
          <span className="font-display text-[17px] font-extrabold tracking-[-0.02em]">{titulo}</span>
          <button type="button" onClick={onClose} aria-label={es ? "Cerrar" : "Close"} className="grid size-8 place-items-center rounded-full bg-ink/[.06]"><Icon name="close" size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* Transferir: uno o varios boletos de la orden (se elige cuál) a un teléfono. */
export function HojaTransferir({ es, boletos, horas, hasta, tz, onClose, onDone }: {
  es: boolean; boletos: { code: string; tipo: string }[]; horas: number; hasta: string; tz: string; onClose: () => void; onDone: (msg: string) => void;
}) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [code, setCode] = useState(boletos[0]?.code ?? ""), [tel, setTel] = useState(""), [error, setError] = useState(""), [ocupado, setOcupado] = useState(false);
  const enviar = async () => {
    if (ocupado) return;
    if (tel.replace(/\D/g, "").length < 10) { setError(E2("Escribe el teléfono.", "Enter the phone number.")); return; }
    setOcupado(true); setError("");
    const r = await bolTransferir(code, tel).catch(() => null);
    setOcupado(false);
    if (r?.ok) { onDone(E2(`Boleto enviado a ${r.a}. Lo puedes deshacer mientras nadie lo reciba.`, `Ticket sent to ${r.a}. You can undo it until someone receives it.`)); return; }
    setError(r?.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again."));
  };
  return (
    <Hoja titulo={E2("Transferir boletos", "Transfer tickets")} label="Orden · transferir" onClose={onClose} es={es}>
      <div className="mt-[7px] text-[12.5px] leading-[1.6] text-ink/60">{E2(`Le avisamos a ese teléfono con el enlace para recibir su boleto y su QR en To'Latino. Puedes transferir hasta ${horas} h antes del evento (${fechaHora(hasta, tz, es)}).`, `We notify that phone with the link to receive the ticket and its QR on To'Latino. You can transfer up to ${horas} h before the event (${fechaHora(hasta, tz, es)}).`)}</div>
      {boletos.length > 1 && (
        <div className="mt-3"><div className={K}>{E2("¿CUÁL BOLETO?", "WHICH TICKET?")}</div>
          <div className="mt-2 flex flex-wrap gap-2">{boletos.map((b) => <Chip key={b.code} variant={b.code === code ? "selected" : "filter"} onClick={() => setCode(b.code)}>{`${b.tipo} · ${b.code}`}</Chip>)}</div></div>
      )}
      <label className="mt-3 block"><span className="sr-only">{E2("Teléfono de la persona", "Their phone number")}</span>
        <input value={tel} onChange={(e) => setTel(e.target.value.replace(/[^\d()+\s-]/g, "").slice(0, 16))} placeholder="(570) 555-0123" inputMode="tel" autoComplete="off" aria-label={E2("Teléfono de la persona", "Their phone number")}
          className="w-full rounded-[14px] border-[1.5px] border-ink/[.14] bg-paper px-[15px] py-[13px] text-[15px] font-bold outline-none" /></label>
      {error && <div role="alert" className="mt-2 text-[12.5px] font-semibold text-danger">{error}</div>}
      <div className="mt-3 flex"><Button variant="primary" size="lg" block disabled={ocupado} onClick={() => void enviar()}>{ocupado ? E2("Enviando…", "Sending…") : E2("Enviar boleto", "Send ticket")}</Button></div>
      <div className="mt-[9px] text-center font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/45">{E2("EL QR ANTERIOR QUEDA ANULADO", "THE OLD QR IS VOIDED")}</div>
    </Hoja>
  );
}

/* Cancelar mis boletos: lo que se devuelve (precio − cargo de servicio) y hasta cuándo, según el servidor; confirmar = el servidor lo vuelve a calcular. */
export function HojaCancelar({ es, numero, tz, onClose, onDone }: { es: boolean; numero: string; tz: string; onClose: () => void; onDone: (msg: string) => void }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [p, setP] = useState<PrevioCancelar | null | "cargando">("cargando"), [sel, setSel] = useState<string[]>([]), [error, setError] = useState(""), [ocupado, setOcupado] = useState(false);
  const clave = useRef(nuevaClave());
  useEffect(() => { void bolPrevioCancelar(numero).then((x) => { setP(x); setSel(x ? x.boletos.map((b) => b.code) : []); }).catch(() => setP(null)); }, [numero]);
  const todos = p && p !== "cargando" && sel.length === p.boletos.length;
  const total = p && p !== "cargando" ? p.boletos.filter((b) => sel.includes(b.code)).reduce((s, b) => s + b.devuelve, 0) + (todos && p.extras ? p.extras.devuelve : 0) : 0;
  const cancelar = async () => {
    if (ocupado || !sel.length) return;
    setOcupado(true); setError("");
    const r = await bolCancelar(numero, sel, clave.current).catch(() => null);
    setOcupado(false);
    if (r?.ok) { onDone(E2(`Listo. Te devolvemos ${dinero(r.monto)} a tu tarjeta en 3–5 días hábiles.`, `Done. We refund ${dinero(r.monto)} to your card in 3–5 business days.`)); return; }
    setError(r?.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again."));
  };
  return (
    <Hoja titulo={E2("Cancelar mis boletos", "Cancel my tickets")} label="Orden · cancelar" onClose={onClose} es={es}>
      {p === "cargando" ? <div className="mt-4 text-[13px] text-ink/55">{E2("Calculando lo que se devuelve…", "Working out the refund…")}</div>
        : !p || !p.boletos.length ? <div className="mt-3 text-[13px] leading-[1.55] text-ink/65">{E2("No tienes boletos de esta orden para cancelar.", "You have no tickets in this order to cancel.")}</div>
        : !p.abierto ? (
          <div data-estado="cerrado" className="mt-3 flex flex-col gap-3">
            <div className="rounded-[14px] bg-pro/[.14] px-3.5 py-3 text-[13px] font-semibold leading-[1.5] text-pro-ink">{E2(`Ya no se puede cancelar con devolución: era hasta ${p.horas} h antes del evento (${fechaHora(p.hasta, tz, es)}).`, `You can no longer cancel with a refund: it was up to ${p.horas} h before the event (${fechaHora(p.hasta, tz, es)}).`)}</div>
            <div className="text-[12.5px] leading-[1.55] text-ink/65">{E2(`Todavía puedes transferirlo a otra persona hasta el ${fechaHora(p.transferirHasta, tz, es)}.`, `You can still transfer it to someone until ${fechaHora(p.transferirHasta, tz, es)}.`)}</div>
            <div className="flex"><Button variant="secondary" block onClick={onClose}>{E2("Entendido", "Got it")}</Button></div>
          </div>
        ) : (
          <>
            <div className="mt-[7px] text-[12.5px] leading-[1.6] text-ink/60">{E2(`Puedes cancelar hasta ${p.horas} h antes del evento (${fechaHora(p.hasta, tz, es)}). Se devuelve lo que pagaste por cada boleto menos el cargo de servicio.`, `You can cancel up to ${p.horas} h before the event (${fechaHora(p.hasta, tz, es)}). You get back what you paid for each ticket minus the service fee.`)}</div>
            <div role="group" aria-label={E2("Boletos a cancelar", "Tickets to cancel")} className="mt-3 flex flex-col gap-2">
              {p.boletos.map((b) => { const on = sel.includes(b.code); return (
                <button key={b.code} type="button" role="checkbox" aria-checked={on} onClick={() => setSel((L) => (on ? L.filter((x) => x !== b.code) : [...L, b.code]))}
                  className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"}`}>
                  <span className={`grid size-5 flex-none place-items-center rounded-[6px] ${on ? "bg-ink" : "border-[1.5px] border-ink/25"}`}>{on && <Icon name="check" size={13} color="var(--tl-white)" />}</span>
                  <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{`${b.tipo} · ${b.code}`}</span>
                    <span className="mt-0.5 block text-[11.5px] font-medium text-ink/55">{E2(`Pagaste ${dinero(b.precio)} · cargo ${dinero(b.cargo)}`, `You paid ${dinero(b.precio)} · fee ${dinero(b.cargo)}`)}</span></span>
                  <span className="flex-none font-display text-[14px] font-extrabold">{dinero(b.devuelve)}</span>
                </button>); })}
              {p.extras && todos && <div className="flex items-center justify-between gap-3 rounded-[14px] bg-paper px-3.5 py-3 text-[12.5px] font-semibold text-ink/70"><span>{E2(`Extras · pagaste ${dinero(p.extras.monto)} · cargo ${dinero(p.extras.cargo)}`, `Extras · you paid ${dinero(p.extras.monto)} · fee ${dinero(p.extras.cargo)}`)}</span><span className="font-display text-[14px] font-extrabold text-ink">{dinero(p.extras.devuelve)}</span></div>}
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-ink/[.08] pt-3"><span className={K}>{E2("TE DEVOLVEMOS", "WE REFUND")}</span><span className="font-display text-[22px] font-extrabold tracking-[-0.03em]">{dinero(total)}</span></div>
            <div className="mt-1 text-[11.5px] text-ink/55">{E2("A tu tarjeta en 3–5 días hábiles. Los boletos cancelados dejan de entrar.", "To your card in 3–5 business days. Cancelled tickets no longer get in.")}</div>
            {error && <div role="alert" className="mt-2 text-[12.5px] font-semibold text-danger">{error}</div>}
            <div className="mt-3 flex flex-col gap-2">
              <div className="grid"><Button variant="danger" disabled={ocupado || !sel.length} onClick={() => void cancelar()}>{ocupado ? E2("Cancelando…", "Cancelling…") : E2(`Cancelar y devolver ${dinero(total)}`, `Cancel and refund ${dinero(total)}`)}</Button></div>
              <div className="grid"><Button variant="secondary" onClick={onClose}>{E2("No, me quedo con ellos", "No, keep them")}</Button></div>
            </div>
          </>
        )}
      {p && p !== "cargando" && !p.boletos.length && <div className="mt-3 flex"><Button variant="secondary" block onClick={() => { onClose(); router.refresh(); }}>{E2("Cerrar", "Close")}</Button></div>}
    </Hoja>
  );
}

/* Ayuda con esta orden (HelpReasonList del sistema). */
export function HojaAyuda({ es, numero, horas, puedeCancelar, devuelto, onClose, onCancelar, onNombre, toast }: {
  es: boolean; numero: string; horas: number; puedeCancelar: boolean; devuelto: boolean; onClose: () => void; onCancelar: () => void; onNombre: (() => void) | null; toast: (t: string) => void;
}) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const items = [
    { icon: "ticket", label: E2("No veo mis boletos", "I can’t see my tickets"), sub: E2("Te los mandamos a tu cuenta", "We send them to your account"),
      onClick: async () => { onClose(); const r = await bolReenviarme(numero).catch(() => null); toast(r?.ok ? E2("Listo: te llegó un aviso con tus boletos. También están en Mi cuenta › Boletos.", "Done: you got a notice with your tickets. They are also in My account › Tickets.") : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again.")); } },
    ...(onNombre ? [{ icon: "edit", label: E2("Cambiar un nombre", "Change a name"), sub: E2(`Gratis hasta ${horas} h antes`, `Free up to ${horas} h before`), onClick: () => { onClose(); onNombre(); } }] : []),
    { icon: "card", label: E2("Un problema con el pago", "A payment problem"), sub: E2("Lo revisa To’Latino", "To’Latino reviews it"), onClick: () => { onClose(); router.push(`/eventos/orden/${numero}/ayuda`); } },
    { icon: "trash", label: E2("Cancelar mis boletos", "Cancel my tickets"), sub: devuelto ? E2("Devolución en camino", "Refund on the way") : puedeCancelar ? E2("Se devuelve menos el cargo de servicio", "Refunded minus the service fee") : E2("Ya solo se puede transferir", "Now you can only transfer"), danger: true, onClick: () => { onClose(); onCancelar(); } },
  ];
  return (
    <Hoja titulo={E2("¿Qué pasó?", "What happened?")} label="Orden · ayuda" onClose={onClose} es={es} fondo="bg-paper">
      <div className="mt-3 grid"><HelpReasonList items={items} /></div>
    </Hoja>
  );
}

/* Cambiar el nombre en un boleto (no va en el QR). */
export function HojaNombre({ es, horas, boletos, onClose, onDone }: { es: boolean; horas: number; boletos: { code: string; tipo: string; nombre: string | null }[]; onClose: () => void; onDone: (msg: string) => void }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [code, setCode] = useState(boletos[0]?.code ?? ""), [n, setN] = useState(boletos[0]?.nombre ?? ""), [error, setError] = useState(""), [ocupado, setOcupado] = useState(false);
  const guardar = async () => {
    setOcupado(true); setError("");
    const r = await bolNombre(code, n).catch(() => null);
    setOcupado(false);
    if (r?.ok) { onDone(E2("Nombre cambiado. Tu QR sigue igual.", "Name changed. Your QR stays the same.")); return; }
    setError(r?.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again."));
  };
  return (
    <Hoja titulo={E2("Cambiar un nombre", "Change a name")} label="Boleto · nombre" onClose={onClose} es={es}>
      {boletos.length > 1 && <div className="mt-3 flex flex-wrap gap-2">{boletos.map((b) => <Chip key={b.code} variant={b.code === code ? "selected" : "filter"} onClick={() => { setCode(b.code); setN(b.nombre ?? ""); }}>{`${b.tipo} · ${b.code}`}</Chip>)}</div>}
      <input value={n} maxLength={40} onChange={(e) => setN(e.target.value.slice(0, 40))} placeholder={E2("A nombre de…", "Name…")} aria-label={E2("Nombre en el boleto", "Name on the ticket")}
        className="mt-3 w-full rounded-[14px] border-[1.5px] border-ink/[.14] bg-paper px-[15px] py-[13px] text-[15px] font-bold outline-none" />
      <div className="mt-2 text-[11.5px] text-ink/55">{E2(`Gratis hasta ${horas} h antes del evento. El nombre no va en el QR.`, `Free up to ${horas} h before the event. The name is not in the QR.`)}</div>
      {error && <div role="alert" className="mt-2 text-[12.5px] font-semibold text-danger">{error}</div>}
      <div className="mt-3 flex"><Button variant="primary" block disabled={ocupado} onClick={() => void guardar()}>{E2("Guardar", "Save")}</Button></div>
    </Hoja>
  );
}
