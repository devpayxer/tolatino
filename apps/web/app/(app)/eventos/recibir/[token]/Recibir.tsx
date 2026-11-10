"use client";
/* Recibir un boleto transferido o una cortesía (hueco #4 · compuesto con Entrar (0c) + TicketQR del sistema): qué es (evento, fecha, lugar,
   tipo y quién lo manda: nombre + inicial o el negocio), el boleto sin QR todavía y lo que se puede hacer según el estado que decide el
   servidor (entrar con tu teléfono · recibirlo · ya es tuyo · es para otro teléfono · lo mandaste tú · venció o se deshizo). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { Recibir as R } from "@/lib/boletos-despues";
import { diaCorto, hora } from "@/lib/evt-comun";
import { bolRecibir } from "../../acciones-despues";
import { fechaHora } from "../../Despues";

type N = "Icon" | "Button" | "TicketQR";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, TicketQR } = UI as unknown as Record<N, ComponentType<any>>;

export function Recibir({ x, token, es }: { x: R; token: string; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState("");
  const ev = x.evento, cuando = `${diaCorto(ev.dia, es).toUpperCase()} · ${hora(ev.h0)}`, comp = x.kind === "comp";
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(`/eventos/recibir/${token}`)}`);
  const recibir = async () => {
    setOcupado(true); setError("");
    const r = await bolRecibir(token).catch(() => null);
    if (r?.ok) { router.push(`/cuenta/boletos/${r.codigo}`); return; }
    setOcupado(false);
    if (r && !r.ok && r.entrar) { entrar(); return; }
    setError(r?.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again."));
  };
  const estado: Record<R["estado"], { t: string; s: string; tono: string; cta?: [string, () => void] }> = {
    entrar: { t: E2("Entra con tu teléfono para recibirlo", "Sign in with your phone to get it"), tono: "bg-white",
      s: E2("Solo lo recibe el número al que te lo mandaron. Si todavía no tienes cuenta, la creas en un minuto con ese teléfono.", "Only the number it was sent to can get it. If you do not have an account yet, you create one in a minute with that phone."),
      cta: [E2("Entrar con mi teléfono", "Sign in with my phone"), entrar] },
    pendiente: { t: comp ? E2("Tu cortesía te espera", "Your comp is waiting") : E2("Este boleto es para ti", "This ticket is for you"), tono: "bg-white",
      s: E2(`Al recibirlo pasa a Mi cuenta › Boletos con su QR. Recíbelo antes del ${fechaHora(x.hasta, ev.tz, true)}.`, `Once you get it, it goes to My account › Tickets with its QR. Get it before ${fechaHora(x.hasta, ev.tz, false)}.`),
      cta: [comp ? E2("Recibir cortesía", "Get comp") : E2("Recibir boleto", "Get ticket"), () => void recibir()] },
    recibida: { t: E2("Ya es tuyo", "It is yours"), tono: "bg-signal/[.14]", s: E2("Está en Mi cuenta › Boletos con su QR. Funciona sin señal.", "It is in My account › Tickets with its QR. It works without signal."),
      cta: x.codigo ? [E2("Ver mi boleto", "See my ticket"), () => router.push(`/cuenta/boletos/${x.codigo}`)] : undefined },
    otro_telefono: { t: E2("Este boleto se mandó a otro teléfono", "This ticket was sent to another phone"), tono: "bg-pro/[.14]",
      s: E2("Entra con el número al que te lo mandaron (sal de esta cuenta en Mi cuenta y vuelve a este enlace).", "Sign in with the number it was sent to (sign out of this account in My account and come back to this link).") },
    tuya: { t: E2("Tú lo mandaste", "You sent it"), tono: "bg-white", s: E2("Lo recibe la otra persona con su teléfono. Mientras nadie lo reciba, lo puedes deshacer desde tu orden.", "The other person gets it with their phone. Until someone does, you can undo it from your order.") },
    usada: { t: E2("Este enlace ya se usó", "This link was already used"), tono: "bg-ink/[.06]", s: E2("El boleto ya lo recibió la persona a la que se lo mandaron.", "The ticket was already received by the person it was sent to.") },
    vencida: { t: E2("Este enlace ya no vale", "This link is no longer valid"), tono: "bg-ink/[.06]", s: E2("Venció o el evento ya no está. Si lo esperabas, pídele a quien te lo mandó que lo envíe otra vez.", "It expired or the event is off. If you expected it, ask the sender to send it again.") },
    cancelada: { t: E2("Quien lo mandó lo deshizo", "The sender undid it"), tono: "bg-ink/[.06]", s: E2("Si lo esperabas, pídele que lo envíe otra vez.", "If you expected it, ask them to send it again.") },
  };
  const e = estado[x.estado];
  return (
    <div data-pantalla="APP-EVT-RECIBIR" data-estado={x.estado} className="min-h-[100dvh] bg-paper">
      <div className="mx-auto flex max-w-[460px] flex-col gap-4 px-4 pb-12 pt-5 lg:pt-10">
        <div className="flex items-center gap-3">
          <span className="size-[56px] flex-none rounded-[14px] bg-ink bg-cover bg-center" style={ev.img ? { backgroundImage: `url(${ev.img})` } : undefined} />
          <div className="min-w-0">
            <div className="font-mono text-[10.5px] font-bold tracking-[0.16em] text-ink/50">{comp ? E2(`CORTESÍA DE ${x.de.toUpperCase()}`, `COMP FROM ${x.de.toUpperCase()}`) : E2(`TE LO MANDA ${x.de.toUpperCase()}`, `SENT BY ${x.de.toUpperCase()}`)}</div>
            <h1 className="m-0 mt-1 font-display text-[22px] font-extrabold leading-[1.1] tracking-[-0.035em]">{ev.title}</h1>
            <div className="mt-1 text-[12.5px] font-semibold text-ink/65">{`${cuando} · ${ev.venue}`}</div>
          </div>
        </div>
        <TicketQR type={comp && x.cuantas > 1 ? `${x.tipo} · ${x.cuantas} ${E2("entradas", "entries")}` : x.admits > 1 ? `${x.tipo} · ${x.admits} ${E2("entradas", "entries")}` : x.tipo} name={E2("POR RECIBIR", "TO RECEIVE")}
          status={x.estado === "recibida" ? E2("TUYO", "YOURS") : x.estado === "pendiente" || x.estado === "entrar" ? E2("ESPERANDO", "WAITING") : E2("SIN VALIDEZ", "NOT VALID")}
          statusBg="rgba(255,255,255,.14)" statusColor="var(--tl-white)" matrix={null} qrSize={96} qrLabel={E2("El QR sale al recibirlo", "The QR appears once received")} used code="" when={cuando} />
        <div data-screen-label="Recibir · estado" className={`flex flex-col gap-2.5 rounded-[18px] border border-ink/[.07] p-4 ${e.tono}`}>
          <div className="font-display text-[17px] font-extrabold tracking-[-0.02em]">{e.t}</div>
          <div className="text-[12.5px] font-medium leading-[1.55] text-ink/70">{e.s}</div>
          {error && <div role="alert" className="text-[12.5px] font-semibold text-danger">{error}</div>}
          {e.cta && <div className="flex"><Button variant="primary" block disabled={ocupado} onClick={e.cta[1]}>{ocupado ? E2("Recibiendo…", "Receiving…") : e.cta[0]}</Button></div>}
        </div>
        <div className="flex flex-col gap-2 rounded-[18px] border border-ink/[.07] bg-white p-4 text-[12px] font-medium leading-[1.5] text-ink/70">
          {[E2("Tu QR es la entrada; no hace falta imprimir.", "Your QR is your entry; no need to print."), E2("En la puerta no se venden boletos: el portero solo escanea.", "No tickets are sold at the door: the door staff only scans."),
            ...(ev.edad >= 18 ? [E2(`Es ${ev.edad}+: si en la puerta no muestras ID, no entras.`, `It is ${ev.edad}+: if you do not show ID at the door, you do not get in.`)] : [])]
            .map((t) => <div key={t} className="flex items-start gap-2"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open-text)" /></span>{t}</div>)}
        </div>
        <button type="button" onClick={() => router.push(`/eventos/${ev.slug}?fecha=${ev.fecha}`)} className="self-start text-[13px] font-bold text-action">{E2("Ver el evento", "See the event")}</button>
      </div>
    </div>
  );
}
