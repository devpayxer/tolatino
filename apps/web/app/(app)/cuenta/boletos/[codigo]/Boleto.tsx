"use client";
/* USR-BOLETO (diseño «To'Latino Mi cuenta» L398 «Toca el código para verlo grande. Sube el brillo», L561 «Si no hay señal, el código
   funciona igual»): el boleto con su QR real, grande, el código humano y el estado. Usado, devuelto o anulado: el QR sale apagado.
   6h: con señal, el QR queda guardado CIFRADO en este teléfono para esta cuenta (lib/boletos-sin-conexion.ts); sin señal lo muestra la
   cáscara /cuenta/boletos/sin-conexion. Si deja de valer (transferido, devuelto, anulado, pasado), se quita. */
import { useBrilloQr } from "@/lib/nativo/pantalla";
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { filasDe, guardarBoleto, recordarIdioma, registrarSWBoletos } from "@/lib/boletos-sin-conexion";
import type { BoletoVista, OrdenVista } from "@/lib/boletos";
import { diaCorto, hora } from "@/lib/evt-comun";
import type { Ventanas } from "@/lib/boletos";
import { estadoBoleto } from "../../../eventos/orden/[num]/Orden";
import { useToast } from "../../../eventos/comun";
import { bolDeshacer } from "../../../eventos/acciones-despues";
import { fechaHora, HojaNombre, HojaTransferir } from "../../../eventos/Despues";
import { WalletBotones } from "./Wallet";

type N = "Icon" | "Button" | "TicketQR" | "QrCode";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, TicketQR, QrCode } = UI as unknown as Record<N, ComponentType<any>>;

export function Boleto({ x, es, wallet = { apple: false, google: false }, walletNo = false }: { x: { b: BoletoVista; numero: string; evento: OrdenVista["evento"]; mia: boolean; ventanas: Ventanas }; es: boolean; wallet?: { apple: boolean; google: boolean }; walletNo?: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [grande, setGrande] = useState(false);
  // 6d · Transferir este boleto, deshacer mientras nadie lo reciba y cambiar el nombre (hasta inicio − bol_transferir_h).
  const [hoja, setHoja] = useState<"tr" | "nombre" | null>(null), { toast, el } = useToast(), V = x.ventanas;
  const listo = (m: string) => { setHoja(null); toast(m); router.refresh(); };
  const deshacer = async () => { const r = await bolDeshacer(x.b.code).catch(() => null); toast(r?.ok ? E2("Listo: el boleto vuelve a ti con un QR nuevo.", "Done: the ticket is yours again with a new QR.") : r?.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again.")); router.refresh(); };
  const { b, evento: ev } = x, [t, bg, fg] = estadoBoleto(b, es);
  const cuando = ev.rango ? ev.rango.toUpperCase() : `${diaCorto(ev.dia, es).toUpperCase()} · ${hora(ev.h0)}`;
  const guardable = !!b.matriz && !b.envio && !ev.pasado && (b.estado === "valid" || !!b.sigue);
  // 8e · En la app: el QR vivo con el brillo al máximo mientras se ve (se devuelve al salir).
  useBrilloQr(!!b.matriz && !b.envio && !ev.pasado && (b.estado === "valid" || !!b.sigue));
  useEffect(() => {
    registrarSWBoletos(); recordarIdioma(es);
    void guardarBoleto(guardable && b.matriz ? { code: b.code, filas: filasDe(b.matriz), tipo: b.mesa ? `${b.tipo} · ${b.admits} ${es ? "entradas" : "entries"}` : b.vale ? `${b.tipo} · ${b.vale}` : b.tipo,
      nombre: (b.nombre || (es ? "A tu nombre" : "In your name")).toUpperCase(), estado: t, estadoBg: bg, estadoFg: fg, titulo: ev.title, cuando, lugar: ev.venue, dia: ev.dia } : null, b.code);
  }, [b.code, guardable]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div data-pantalla="USR-BOLETO" className="min-h-[100dvh] bg-paper">
      <div className="mx-auto flex max-w-[460px] flex-col gap-4 px-4 pb-12 pt-4 lg:pt-8">
        <button type="button" onClick={() => router.push(x.mia ? `/eventos/orden/${x.numero}` : "/cuenta/boletos")} className="inline-flex items-center gap-1.5 self-start text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{x.mia ? `${E2("Orden", "Order")} ${x.numero}` : E2("Mis boletos", "My tickets")}</button>
        <div>
          <div className="font-mono text-[10.5px] font-bold tracking-[0.16em] text-ink/50">{cuando}</div>
          <h1 className="m-0 mt-1.5 font-display text-[26px] font-extrabold leading-[1.08] tracking-[-0.04em]">{ev.title}</h1>
          <div className="mt-1.5 text-[13px] font-semibold text-ink/65">{ev.venue}</div>
        </div>
        <div role="button" tabIndex={0} aria-label={E2("Ver el código grande", "See the code big")} onClick={() => setGrande(true)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setGrande(true); } }} className="cursor-pointer">
          <TicketQR type={b.mesa ? `${b.tipo} · ${b.admits} ${E2("entradas", "entries")}` : b.vale ? `${b.tipo} · ${b.vale}` : b.tipo} name={(b.nombre || E2("A tu nombre", "In your name")).toUpperCase()} status={t} statusBg={bg} statusColor={fg}
            matrix={b.matriz} qrSize={b.matriz ? 260 : 96} qrLabel={E2(`Código QR del boleto ${b.code}`, `QR code for ticket ${b.code}`)} used={(b.estado !== "valid" && !b.sigue) || !!b.envio} code={b.code} when={cuando} />
        </div>
        {b.envio && (
          <div role="status" data-screen-label="Boleto · enviado" className="flex flex-col gap-2.5 rounded-[18px] bg-pro/[.14] p-4">
            <div className="font-mono text-[10px] font-bold tracking-[0.14em] text-pro-ink">{E2(`ENVIADO A ${b.envio.a} · EL QR ANTERIOR QUEDA ANULADO`, `SENT TO ${b.envio.a} · THE OLD QR IS VOIDED`)}</div>
            <div className="text-[12.5px] font-semibold leading-[1.5] text-ink/75">{E2(`Lo puede recibir hasta ${fechaHora(b.envio.hasta, ev.tz, true)}. Si nadie lo recibe, vuelve a ti con un QR nuevo.`, `They can receive it until ${fechaHora(b.envio.hasta, ev.tz, false)}. If nobody does, it comes back to you with a new QR.`)}</div>
            <div className="flex"><Button variant="secondary" onClick={() => void deshacer()}>{E2("Deshacer", "Undo")}</Button></div>
          </div>
        )}
        {b.estado === "used" && b.entro && <div role="status" className="rounded-[18px] bg-ink/[.06] p-4 text-[12.5px] font-semibold leading-[1.5] text-ink/70">{b.sigue ? E2(`Entraste a las ${b.entro}. Tu pase entra una vez cada día: muestra el mismo QR.`, `You got in at ${b.entro}. Your pass gets in once each day: show the same QR.`) : E2(`Usado · entraste a las ${b.entro}.`, `Used · you got in at ${b.entro}.`)}</div>}
        {b.estado === "replaced" && <div role="status" className="rounded-[18px] bg-ink/[.06] p-4 text-[12.5px] font-semibold leading-[1.5] text-ink/70">{E2("Transferiste este boleto: ya es de otra persona y este QR no entra.", "You transferred this ticket: it belongs to someone else now and this QR does not get in.")}</div>}
        {b.estado === "valid" && !b.envio && !ev.pasado && (V.transferir ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon="share" onClick={() => setHoja("tr")}>{E2("Transferir este boleto", "Transfer this ticket")}</Button>
            <Button variant="secondary" icon="edit" onClick={() => setHoja("nombre")}>{E2("Cambiar el nombre", "Change the name")}</Button>
          </div>
        ) : <div className="text-[12px] font-medium leading-[1.5] text-ink/55">{E2(`Ya no se transfiere ni cambia de nombre: era hasta ${V.horasTransferir} h antes del evento.`, `It can no longer be transferred or renamed: that was up to ${V.horasTransferir} h before the event.`)}</div>)}
        {/* 8g · El boleto en Apple Wallet / Google Wallet (el mismo QR; se actualiza solo). */}
        {guardable && <WalletBotones code={b.code} es={es} d={wallet} avisar={toast} />}
        {walletNo && <div role="status" className="rounded-[18px] bg-ink/[.06] p-4 text-[12.5px] font-semibold leading-[1.5] text-ink/70">{E2("Este boleto no se puede guardar en Wallet ahora: ya no vale, se está transfiriendo o ya pasó.", "This ticket cannot be saved to Wallet right now: it is no longer valid, it is being transferred or it is past.")}</div>}
        <div className="flex flex-col gap-2 rounded-[18px] border border-ink/[.07] bg-white p-4 text-[12.5px] font-medium leading-[1.5] text-ink/75">
          {[E2("Toca el código para verlo grande. Sube el brillo.", "Tap the code to see it big. Turn up the brightness."), E2("Si no hay señal, el código funciona igual.", "Without signal, the code still works."),
            ...(guardable ? [E2("Guardado en este teléfono: se abre sin señal. Al salir de tu cuenta se borra.", "Saved on this phone: it opens without signal. Signing out erases it.")] : []),
            E2(`Si la persona de la puerta no puede leerlo, dile el código ${b.code}.`, `If the door staff cannot scan it, tell them the code ${b.code}.`)]
            .map((s) => <div key={s} className="flex items-start gap-2"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open-text)" /></span>{s}</div>)}
        </div>
        <Button variant="secondary" onClick={() => router.push("/cuenta/boletos")}>{E2("Mis boletos", "My tickets")}</Button>
      </div>
      {hoja === "tr" && <HojaTransferir es={es} boletos={[{ code: b.code, tipo: b.tipo }]} horas={V.horasTransferir} hasta={V.transferirHasta} tz={ev.tz} onClose={() => setHoja(null)} onDone={listo} />}
      {hoja === "nombre" && <HojaNombre es={es} horas={V.horasTransferir} boletos={[{ code: b.code, tipo: b.tipo, nombre: b.nombre }]} onClose={() => setHoja(null)} onDone={listo} />}
      {el}
      {grande && b.matriz && (
        <div role="dialog" aria-modal="true" aria-label={E2("Código QR grande", "Big QR code")} onClick={() => setGrande(false)} className="fixed inset-0 z-50 grid place-items-center bg-white p-6">
          <div className="flex flex-col items-center gap-4">
            <QrCode matrix={b.matriz} size={Math.min(340, typeof window !== "undefined" ? window.innerWidth - 48 : 320)} label={E2(`Código QR del boleto ${b.code}`, `QR code for ticket ${b.code}`)} faded={b.estado !== "valid" && !b.sigue} />
            <div className="font-mono text-[15px] font-bold tracking-[0.12em]">{b.code}</div>
            <div className="text-[12px] font-semibold text-ink/55">{E2("Toca para cerrar", "Tap to close")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
