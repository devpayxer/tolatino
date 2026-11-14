"use client";
/* 9k · 3-D Secure: «Tu banco pide confirmar» (hoja en el teléfono, ventana de 560 en escritorio, el mismo marco que Método de pago; hueco del diseño
   compuesto con sus piezas, REVISION 9k). Con Stripe de verdad, la verificación del banco se abre aquí mismo con Stripe.js (handleNextAction; en una
   renovación de Pro, confirmCardPayment con la tarjeta guardada): To'Latino nunca ve lo que la persona escribe en su banco. En el sandbox, el «banco»
   simulado contesta con dos botones. Después, el servidor mira la respuesta en Stripe (nunca le cree a la pantalla) y la pantalla vuelve a enviar lo
   mismo con la misma llave: nada se cobra dos veces. Cerrar no cobra nada: lo retenido se suelta solo si no se confirma a tiempo. */
import * as UI from "@tolatino/ui";
import { useState, type ComponentType } from "react";
import { bancoSimulado, verificarPago } from "./acciones";
import { cargarStripe, type ModoTarjeta } from "./MetodoPago";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
/* Lo que el servidor manda cuando el banco pide verificar (lib/pagos/pasarela.ts · Verificar). */
export type VerificarT = { pi: string; secreto: string; monto: number; pm: string | null; vence: string; renovacion: boolean };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const K = "font-mono text-[10px] font-bold tracking-[0.16em] text-ink/45";

export function Verificacion({ es, v, modo, pk, onListo, onCerrar }: { es: boolean; v: VerificarT; modo: ModoTarjeta; pk: string | null; onListo: () => void; onCerrar: () => void }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState("");
  const despues = async (r: { ok: true; listo: boolean } | { ok: false; msg: { es: string; en: string } }) => {
    if (!r.ok) { setError(es ? r.msg.es : r.msg.en); return; }
    if (!r.listo) { setError(E2("Tu banco todavía no lo confirma. Termina en la ventana de tu banco o prueba otra vez.", "Your bank has not confirmed it yet. Finish in your bank's window or try again.")); return; }
    onListo();
  };
  const confirmar = async () => {
    if (ocupado) return;
    setOcupado(true); setError("");
    try {
      if (modo === "simulador") { await despues(await bancoSimulado(v.pi, true)); return; }
      if (!pk) { setError(E2("El pago seguro no está disponible ahora.", "Secure payment is not available right now.")); return; }
      const s = await cargarStripe(pk);
      const r = v.renovacion && v.pm ? await s.confirmCardPayment(v.secreto, { payment_method: v.pm }) : await s.handleNextAction({ clientSecret: v.secreto });
      if (r.error) { setError(r.error.message); return; }
      await despues(await verificarPago(v.pi));
    } catch {
      setError(E2("No se pudo abrir tu banco. Revisa tu conexión y prueba de nuevo.", "Could not open your bank. Check your connection and try again."));
    } finally { setOcupado(false); }
  };
  const noFuiYo = async () => {
    if (ocupado) return;
    setOcupado(true); setError("");
    try { await despues(await bancoSimulado(v.pi, false)); } finally { setOcupado(false); }
  };
  const cuerpo = (
    <div className="flex flex-col gap-3.5" data-pantalla="PAGO-3DS">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-display text-[19px] font-extrabold leading-[1.2] tracking-[-0.03em]">{E2("Tu banco pide confirmar", "Your bank asks you to confirm")}</div>
          <div className="mt-1 font-mono text-[10px] font-bold tracking-[0.12em] text-ink/45">{`3-D SECURE · ${money(v.monto)}`}</div>
        </div>
        <button type="button" aria-label={E2("Cerrar", "Close")} onClick={onCerrar} className="grid size-9 flex-none place-items-center rounded-[11px] bg-ink/5"><Icon name="close" size={15} /></button>
      </div>
      <div className="text-pretty text-[13.5px] font-medium leading-[1.55] text-ink/70">
        {v.renovacion
          ? E2(`Para cobrar ${money(v.monto)} de Pro, tu banco pide que confirmes que eres tú. Se abre aquí mismo; To'Latino no ve lo que escribes en tu banco.`, `To charge ${money(v.monto)} for Pro, your bank asks you to confirm it is you. It opens right here; To'Latino does not see what you type at your bank.`)
          : E2(`Para retener ${money(v.monto)} en tu tarjeta, tu banco pide que confirmes que eres tú. Se abre aquí mismo; To'Latino no ve lo que escribes en tu banco.`, `To hold ${money(v.monto)} on your card, your bank asks you to confirm it is you. It opens right here; To'Latino does not see what you type at your bank.`)}
      </div>
      {modo === "simulador" && (
        <div className="rounded-[15px] border border-ink/10 bg-white px-3.5 py-3">
          <div className={K}>{E2("BANCO DE PRUEBA · SANDBOX", "TEST BANK · SANDBOX")}</div>
          <div className="mt-1 text-[12.5px] font-semibold leading-[1.5] text-ink/70">{E2("Así se ve la pregunta de un banco de verdad. Elige qué contesta tu banco.", "This is how a real bank's question looks. Choose what your bank answers.")}</div>
        </div>
      )}
      {error && <div role="alert" className="text-[12px] font-semibold text-danger">{error}</div>}
      <div className="flex"><Button variant="primary" block disabled={ocupado} onClick={confirmar}>{ocupado ? E2("Esperando a tu banco…", "Waiting for your bank…") : E2("Confirmar con mi banco", "Confirm with my bank")}</Button></div>
      {modo === "simulador" && <div className="flex"><Button variant="secondary" block disabled={ocupado} onClick={noFuiYo}>{E2("No fui yo", "It was not me")}</Button></div>}
      <div className="text-pretty text-[12px] font-medium leading-[1.5] text-ink/55">{E2("Si cierras sin confirmar, no se cobra nada: lo retenido se suelta solo.", "If you close without confirming, nothing is charged: the hold is released on its own.")}</div>
      <div className="text-center font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/40">{E2("PAGO SEGURO CON STRIPE · 3D SECURE", "SECURED BY STRIPE · 3D SECURE")}</div>
    </div>
  );
  return (
    <>
      <div data-screen-label="Verificación del banco" className="fixed inset-0 z-[96] lg:hidden">
        <button type="button" aria-label={E2("Cerrar", "Close")} onClick={onCerrar} className="absolute inset-0 bg-ink/50" />
        <div role="dialog" aria-modal="true" className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-[26px] bg-paper px-5 pb-7 pt-3"><div className="mx-auto mb-4 h-1 w-[38px] rounded-full bg-ink/15" />{cuerpo}</div>
      </div>
      <div data-screen-label="Verificación del banco · desktop" className="fixed inset-0 z-[96] hidden lg:block">
        <button type="button" aria-label={E2("Cerrar", "Close")} onClick={onCerrar} className="absolute inset-0 bg-ink/45" />
        <div role="dialog" aria-modal="true" className="absolute left-1/2 top-[10vh] max-h-[80vh] w-[560px] -translate-x-1/2 overflow-y-auto rounded-[22px] bg-paper p-6 shadow-[0_30px_60px_-20px_rgba(11,14,18,.5)]">{cuerpo}</div>
      </div>
    </>
  );
}

/* Para cada pantalla que cobra: si el servidor contestó `verificar`, abre la hoja y, al confirmar, vuelve a enviar lo mismo (la misma llave). */
export function useVerificacion(es: boolean, modo: ModoTarjeta | null | undefined, pk: string | null | undefined) {
  const [v, setV] = useState<{ x: VerificarT; luego: () => void } | null>(null);
  return {
    /* true si había que verificar (la pantalla no muestra el error de siempre). */
    pide: (r: unknown, luego: () => void) => {
      const x = r && typeof r === "object" && "verificar" in r ? (r as { verificar?: VerificarT }).verificar : undefined;
      if (!x || !modo) return false;
      setV({ x, luego }); return true;
    },
    hoja: v && modo ? <Verificacion es={es} v={v.x} modo={modo} pk={pk ?? null} onCerrar={() => setV(null)} onListo={() => { const f = v.luego; setV(null); f(); }} /> : null,
  };
}
