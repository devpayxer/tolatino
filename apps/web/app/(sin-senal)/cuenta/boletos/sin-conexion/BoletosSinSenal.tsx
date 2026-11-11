"use client";
/* 6h · USR-BOLETO sin señal (Mi cuenta L561 «Si no hay señal, el código funciona igual»): los boletos que esta cuenta abrió con señal en
   este teléfono, con su QR real (TicketQR / QrCode del sistema), el código y el estado de cuando se guardó. Sin la cookie de la sesión
   (salió de la cuenta u otra cuenta) no se ve nada. */
import { useBrilloQr } from "@/lib/nativo/pantalla";
import * as UI from "@tolatino/ui";
import { useEffect, useState, type ComponentType } from "react";
import { idiomaGuardado, leerBoletos, matrizDe, type BoletoGuardado } from "@/lib/boletos-sin-conexion";
import { irAlServidor } from "@/lib/nativo/puente";

type N = "Icon" | "Button" | "TicketQR" | "QrCode";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, TicketQR, QrCode } = UI as unknown as Record<N, ComponentType<any>>;

export function BoletosSinSenal() {
  const [es, setEs] = useState(true), [L, setL] = useState<BoletoGuardado[] | null>(null), [sel, setSel] = useState<string | null>(null), [grande, setGrande] = useState(false);
  useEffect(() => {
    setEs(idiomaGuardado());
    void leerBoletos().then((x) => { setL(x); const c = new URLSearchParams(location.search).get("c"); setSel(x.find((b) => b.code === c)?.code ?? (x.length === 1 ? x[0]!.code : null)); });
  }, []);
  const E2 = (a: string, b: string) => (es ? a : b), b = L?.find((x) => x.code === sel) ?? null;
  useBrilloQr(!!b); // 8e · el QR del boleto con el brillo al máximo (se devuelve al salir)
  return (
    <div data-pantalla="USR-BOLETO-SIN-SENAL" className="min-h-[100dvh] bg-paper">
      <div className="mx-auto flex max-w-[460px] flex-col gap-4 px-4 pb-12 pt-4 lg:pt-8">
        <div role="status" className="flex items-center gap-2 self-start rounded-full bg-ink px-3 py-1.5 font-mono text-[10.5px] font-bold tracking-[0.12em] text-white"><Icon name="wifi" size={14} color="var(--tl-white)" />{E2("SIN CONEXIÓN", "OFFLINE")}</div>
        {L === null ? null : b ? (<>
          {L.length > 1 ? <button type="button" onClick={() => setSel(null)} className="inline-flex items-center gap-1.5 self-start text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{E2("Tus boletos en este teléfono", "Your tickets on this phone")}</button> : null}
          <div>
            <div className="font-mono text-[10.5px] font-bold tracking-[0.16em] text-ink/50">{b.cuando}</div>
            <h1 className="m-0 mt-1.5 font-display text-[26px] font-extrabold leading-[1.08] tracking-[-0.04em]">{b.titulo}</h1>
            <div className="mt-1.5 text-[13px] font-semibold text-ink/65">{b.lugar}</div>
          </div>
          <div role="button" tabIndex={0} aria-label={E2("Ver el código grande", "See the code big")} onClick={() => setGrande(true)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setGrande(true); } }} className="cursor-pointer">
            <TicketQR type={b.tipo} name={b.nombre} status={b.estado} statusBg={b.estadoBg} statusColor={b.estadoFg} matrix={matrizDe(b.filas)} qrSize={260} qrLabel={E2(`Código QR del boleto ${b.code}`, `QR code for ticket ${b.code}`)} code={b.code} when={b.cuando} />
          </div>
          <div className="flex flex-col gap-2 rounded-[18px] border border-ink/[.07] bg-white p-4 text-[12.5px] font-medium leading-[1.5] text-ink/75">
            {[E2("Sin señal, el código funciona igual: la puerta lo revisa con la firma.", "Without signal, the code still works: the door checks its signature."), E2("Toca el código para verlo grande. Sube el brillo.", "Tap the code to see it big. Turn up the brightness."),
              E2("El estado es el de la última vez que lo abriste con señal.", "The status is from the last time you opened it with signal.")].map((s) => <div key={s} className="flex items-start gap-2"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open-text)" /></span>{s}</div>)}
          </div>
        </>) : L.length ? (<>
          <h1 className="m-0 font-display text-[26px] font-extrabold leading-[1.08] tracking-[-0.04em]">{E2("Tus boletos en este teléfono", "Your tickets on this phone")}</h1>
          <div className="flex flex-col gap-2">
            {L.map((x) => (
              <button key={x.code} type="button" onClick={() => setSel(x.code)} className="flex items-center gap-3 rounded-[18px] border border-ink/[.07] bg-white p-4 text-left">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-ink/[.06]"><Icon name="ticket" size={18} /></span>
                <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-[14px] font-extrabold">{x.titulo}</span><span className="text-[12px] font-semibold text-ink/60">{x.cuando} · {x.code}</span></span>
                <Icon name="chevronRight" size={16} />
              </button>))}
          </div>
        </>) : (
          <div className="flex flex-col gap-3 rounded-[18px] border border-ink/[.07] bg-white p-5">
            <div className="font-display text-[20px] font-extrabold">{E2("No hay boletos guardados en este teléfono", "No tickets saved on this phone")}</div>
            <div className="text-[13px] font-medium leading-[1.5] text-ink/70">{E2("Abre tu boleto una vez con señal y queda guardado para verlo sin conexión. Si saliste de tu cuenta, se borró.", "Open your ticket once with signal and it is saved to view offline. If you signed out, it was erased.")}</div>
            <div className="flex"><Button variant="secondary" onClick={() => { void irAlServidor("/cuenta/boletos"); }}>{E2("Probar con señal", "Try with signal")}</Button></div>
          </div>
        )}
      </div>
      {grande && b && (
        <div role="dialog" aria-modal="true" aria-label={E2("Código QR grande", "Big QR code")} onClick={() => setGrande(false)} className="fixed inset-0 z-50 grid place-items-center bg-white p-6">
          <div className="flex flex-col items-center gap-4">
            <QrCode matrix={matrizDe(b.filas)} size={Math.min(340, typeof window !== "undefined" ? window.innerWidth - 48 : 320)} label={E2(`Código QR del boleto ${b.code}`, `QR code for ticket ${b.code}`)} />
            <div className="font-mono text-[15px] font-bold tracking-[0.12em]">{b.code}</div>
            <div className="text-[12px] font-semibold text-ink/55">{E2("Toca para cerrar", "Tap to close")}</div>
          </div>
        </div>
      )}
    </div>);
}
