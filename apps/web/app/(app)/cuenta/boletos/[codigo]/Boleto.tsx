"use client";
/* USR-BOLETO (diseño «To'Latino Mi cuenta» L398 «Toca el código para verlo grande. Sube el brillo», L561 «Si no hay señal, el código
   funciona igual»): el boleto con su QR real, grande, el código humano y el estado. Usado, devuelto o anulado: el QR sale apagado. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { BoletoVista, OrdenVista } from "@/lib/boletos";
import { diaCorto, hora } from "@/lib/evt-comun";
import { estadoBoleto } from "../../../eventos/orden/[num]/Orden";

type N = "Icon" | "Button" | "TicketQR" | "QrCode";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, TicketQR, QrCode } = UI as unknown as Record<N, ComponentType<any>>;

export function Boleto({ x, es }: { x: { b: BoletoVista; numero: string; evento: OrdenVista["evento"] }; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [grande, setGrande] = useState(false);
  const { b, evento: ev } = x, [t, bg, fg] = estadoBoleto(b, es);
  const cuando = `${diaCorto(ev.dia, es).toUpperCase()} · ${hora(ev.h0)}`;
  return (
    <div data-pantalla="USR-BOLETO" className="min-h-[100dvh] bg-paper">
      <div className="mx-auto flex max-w-[460px] flex-col gap-4 px-4 pb-12 pt-4 lg:pt-8">
        <button type="button" onClick={() => router.push(`/eventos/orden/${x.numero}`)} className="inline-flex items-center gap-1.5 self-start text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{`${E2("Orden", "Order")} ${x.numero}`}</button>
        <div>
          <div className="font-mono text-[10.5px] font-bold tracking-[0.16em] text-ink/50">{cuando}</div>
          <h1 className="m-0 mt-1.5 font-display text-[26px] font-extrabold leading-[1.08] tracking-[-0.04em]">{ev.title}</h1>
          <div className="mt-1.5 text-[13px] font-semibold text-ink/65">{ev.venue}</div>
        </div>
        <div role="button" tabIndex={0} aria-label={E2("Ver el código grande", "See the code big")} onClick={() => setGrande(true)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setGrande(true); } }} className="cursor-pointer">
          <TicketQR type={b.mesa ? `${b.tipo} · ${b.admits} ${E2("entradas", "entries")}` : b.tipo} name={(b.nombre || E2("A tu nombre", "In your name")).toUpperCase()} status={t} statusBg={bg} statusColor={fg}
            matrix={b.matriz} qrSize={260} qrLabel={E2(`Código QR del boleto ${b.code}`, `QR code for ticket ${b.code}`)} used={b.estado !== "valid"} code={b.code} when={cuando} />
        </div>
        <div className="flex flex-col gap-2 rounded-[18px] border border-ink/[.07] bg-white p-4 text-[12.5px] font-medium leading-[1.5] text-ink/75">
          {[E2("Toca el código para verlo grande. Sube el brillo.", "Tap the code to see it big. Turn up the brightness."), E2("Si no hay señal, el código funciona igual.", "Without signal, the code still works."),
            E2(`Si la persona de la puerta no puede leerlo, dile el código ${b.code}.`, `If the door staff cannot scan it, tell them the code ${b.code}.`)]
            .map((s) => <div key={s} className="flex items-start gap-2"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open-text)" /></span>{s}</div>)}
        </div>
        <Button variant="secondary" onClick={() => router.push("/cuenta/boletos")}>{E2("Mis boletos", "My tickets")}</Button>
      </div>
      {grande && b.matriz && (
        <div role="dialog" aria-modal="true" aria-label={E2("Código QR grande", "Big QR code")} onClick={() => setGrande(false)} className="fixed inset-0 z-50 grid place-items-center bg-white p-6">
          <div className="flex flex-col items-center gap-4">
            <QrCode matrix={b.matriz} size={Math.min(340, typeof window !== "undefined" ? window.innerWidth - 48 : 320)} label={E2(`Código QR del boleto ${b.code}`, `QR code for ticket ${b.code}`)} faded={b.estado !== "valid"} />
            <div className="font-mono text-[15px] font-bold tracking-[0.12em]">{b.code}</div>
            <div className="text-[12px] font-semibold text-ink/55">{E2("Toca para cerrar", "Tap to close")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
