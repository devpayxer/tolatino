"use client";
/* USR-PAGOS · Tus tarjetas (9k, L360): cada tarjeta guardada con «Quitar» (pide confirmar; queda «quitada», nada se borra, y con Stripe se desliga de
   tu cliente). La que paga Pro de un negocio no se quita aquí: primero se cambia en el panel (lo dice el servidor). Compuesto con el Marco de Mi cuenta. */
import { useRouter } from "next/navigation";
import { quitarTarjeta } from "../../pago/acciones";
import { marcaL } from "../../pago/MetodoPago";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";

type T = { pm: string; marca: string; ultimos4: string; vence: string; def: boolean };
export function Pagos({ es, yo, tarjetas }: { es: boolean; yo: Yo; tarjetas: T[] }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const quitar = (t: T) => ui.setHoja({
    title: E2(`¿Quitar ${marcaL(t.marca)} ·· ${t.ultimos4}?`, `Remove ${marcaL(t.marca)} ·· ${t.ultimos4}?`),
    sub: E2("Deja de salir al pagar. Lo que ya pagaste con ella no cambia; las devoluciones siguen llegando a esa tarjeta.", "It stops showing when you pay. What you already paid with it does not change; refunds still go to that card."),
    yes: E2("Quitar tarjeta", "Remove card"),
    onYes: async () => {
      const r = await quitarTarjeta(t.pm).catch(() => null);
      ui.toast(r?.ok ? E2("Tarjeta quitada.", "Card removed.") : r ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not. Check your connection."));
      if (r?.ok) router.refresh();
    },
  });
  const B: Bloque[] = [
    { type: "sec", t: E2("Tus tarjetas", "Your cards"), s: E2("SE AGREGAN AL PAGAR", "ADDED WHEN YOU PAY"), fs: "14px", mt: "0" },
    tarjetas.length
      ? { type: "rows", rows: tarjetas.map((t) => ({ ic: "card", t: `${marcaL(t.marca)} ·· ${t.ultimos4}`, s: `${E2("VENCE ", "EXPIRES ")}${t.vence}${t.def ? E2(" · PREDETERMINADA", " · DEFAULT") : ""}`, acts: [[E2("Quitar", "Remove"), "secondary", () => quitar(t)]] })) }
      : { type: "empty", ic: "card", t: E2("Sin tarjetas guardadas", "No saved cards"), s: E2("Al pagar con tarjeta puedes guardarla para la próxima. To'Latino nunca ve el número completo.", "When you pay by card you can save it for next time. To'Latino never sees the full number.") },
    { type: "note", tone: "info", ic: "lock", s: E2("Tu tarjeta la guarda Stripe. Aquí solo ves la marca, los últimos 4 y el vencimiento.", "Stripe keeps your card. Here you only see the brand, the last 4 and the expiry.") },
  ];
  return <Marco es={es} code="USR-PAGOS" back="/cuenta/ajustes" t={E2("Pagos", "Payments")} s={E2("TUS TARJETAS", "YOUR CARDS")} blocks={B} yo={yo} ui={ui} />;
}
