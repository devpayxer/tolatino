"use client";
/* 9k · Confirmar el pago que el banco pidió verificar (renovación de Pro fuera de sesión): la misma hoja «Tu banco pide confirmar» de la app, abierta
   desde el aviso. Hecho → «Listo» y al plan; vencida o rechazada → lo dice y al plan (el siguiente intento sale solo). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { ModoTarjeta } from "../MetodoPago";
import { Verificacion, type VerificarT } from "../Verificacion";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Button } = UI as unknown as Record<"Button", ComponentType<any>>;
export function VerificarCobro({ es, v, estado, negocio, modo, pk }: { es: boolean; v: VerificarT; estado: string; negocio: string | null; modo: ModoTarjeta; pk: string | null }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [abierta, setAbierta] = useState(estado === "pendiente"), [listo, setListo] = useState(estado === "verificada");
  const plan = negocio ? `/panel/${negocio}/cobros/plan` : "/cuenta";
  const t = listo ? [E2("Listo: tu banco lo confirmó", "Done: your bank confirmed it"), E2("El cobro quedó hecho y tu plan sigue. Te llega el recibo.", "The charge went through and your plan continues. You will get the receipt.")]
    : estado === "pendiente" ? [E2("Tu banco pide confirmar", "Your bank asks you to confirm"), E2("Confirma con tu banco para que el cobro quede hecho.", "Confirm with your bank so the charge goes through.")]
    : [E2("Esta confirmación ya no sirve", "This confirmation is no longer valid"), E2("Venció o tu banco la rechazó. No se cobró nada; el siguiente intento sale solo y te avisamos.", "It expired or your bank declined it. Nothing was charged; the next attempt runs on its own and we will let you know.")];
  return (
    <>
    <main data-pantalla="PAGO-VERIFICAR" className="mx-auto flex min-h-dvh max-w-[560px] flex-col gap-4 bg-paper px-5 pb-10 pt-8">
      <div className="font-mono text-[10px] font-bold tracking-[0.16em] text-ink/45">{E2("PAGO SEGURO · 3D SECURE", "SECURE PAYMENT · 3D SECURE")}</div>
      <h1 className="font-display text-[24px] font-extrabold leading-[1.15] tracking-[-0.03em]">{t[0]}</h1>
      <p className="text-pretty text-[14px] font-medium leading-[1.55] text-ink/70">{t[1]}</p>
      <div className="flex flex-col gap-2.5">
        {!listo && !abierta && estado === "pendiente" && <Button variant="primary" block onClick={() => setAbierta(true)}>{E2("Confirmar con mi banco", "Confirm with my bank")}</Button>}
        <Button variant="secondary" block onClick={() => router.push(plan)}>{negocio ? E2("Ir a mi plan", "Go to my plan") : E2("Ir a mi cuenta", "Go to my account")}</Button>
      </div>
    </main>
    {abierta && !listo && <Verificacion es={es} v={v} modo={modo} pk={pk} onCerrar={() => setAbierta(false)} onListo={() => { setAbierta(false); setListo(true); router.refresh(); }} />}
    </>
  );
}
