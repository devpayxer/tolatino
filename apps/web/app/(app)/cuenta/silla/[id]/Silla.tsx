"use client";
/* Tu cuenta de cobro (silla rentada, 3d): estado, qué recibe y el botón para conectar en Stripe. Compuesto con el marco
   de Mi cuenta (empty, kv, note, acts). */
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CobroSilla } from "@/lib/sillas";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../../Marco";
import { conectarCobro } from "./acciones";

export function Silla({ s, vuelta, es, yo }: { s: CobroSilla; vuelta: boolean; es: boolean; yo: Yo }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const dep = s.dep ? `$${(s.dep / 100).toFixed(2)}` : null;
  const conectar = async () => {
    if (ocupado) return; setOcupado(true); setError(null);
    const r = await conectarCobro(s.miembro).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    if (r.ok && r.url) { location.href = r.url; return; }
    setOcupado(false); setError(r.ok ? null : es ? r.msg.es : r.msg.en);
  };
  const on = s.estado === "enabled";
  const B: Bloque[] = [
    on ? { type: "empty", ic: "verified", t: E2("Tu cuenta de cobro está conectada", "Your payout account is connected"), s: E2(`Los depósitos de tus citas llegan a tu banco terminado en ${s.banco ?? "····"}. To'Latino se queda con su comisión; el resto es tuyo.`, `Your booking deposits go to your bank ending in ${s.banco ?? "····"}. To'Latino keeps its fee; the rest is yours.`), cta: E2("Ver mi silla", "See my chair"), onCta: () => router.push(`/n/${s.negocio.id}/silla/${s.silla ?? 1}`) }
      : { type: "empty", ic: "wallet", t: E2("Conecta tu cuenta de cobro", "Connect your payout account"), s: E2(`Rentas la silla ${s.silla ?? ""} en ${s.negocio.nombre}. Con tu cuenta conectada, tu silla pide${dep ? ` el depósito de ${dep}` : " depósito si lo pones"} y el dinero llega a tu banco, no al del local.`, `You rent chair ${s.silla ?? ""} at ${s.negocio.nombre}. With your account connected, your chair takes${dep ? ` the ${dep} deposit` : " deposits if you set one"} and the money goes to your bank, not the shop's.`),
          cta: ocupado ? E2("Abriendo…", "Opening…") : s.estado === "none" ? E2("Conectar mi cuenta", "Connect my account") : E2("Terminar de conectar", "Finish connecting"), onCta: conectar },
    { type: "kv", rows: [{ k: E2("SILLA", "CHAIR"), v: `${s.silla ?? "—"} · ${s.negocio.nombre}` }, { k: E2("ESTADO", "STATUS"), v: on ? E2("Conectada", "Connected") : s.estado === "restricted" ? E2("Stripe pide un dato", "Stripe needs info") : s.estado === "pending" ? E2("Sin terminar", "Not finished") : E2("Sin conectar", "Not connected") }, { k: E2("DEPÓSITO DE TU SILLA", "YOUR CHAIR'S DEPOSIT"), v: dep ?? E2("No pides", "None") }] },
    { type: "note", tone: "info", ic: "lock", s: E2("Tus datos y tu banco los pones en Stripe, el procesador de pagos. To'Latino no los ve. Tus precios, tu agenda y el depósito los ajusta el dueño del local en su panel.", "You enter your details and bank in Stripe, the payment processor. To'Latino never sees them. Your prices, schedule and deposit are set by the shop owner in their panel.") },
  ];
  if (vuelta && !on) B.unshift({ type: "note", tone: "warn", ic: "warning", s: E2("Todavía falta completar el alta en Stripe. Toca «Terminar de conectar».", "The Stripe signup is not finished yet. Tap “Finish connecting”.") });
  if (error) B.unshift({ type: "note", tone: "danger", ic: "warning", s: error });
  return <Marco es={es} code="USR-PERFIL" back="/cuenta" t={E2("Tu cuenta de cobro", "Your payout account")} s={on ? E2("CONECTADA", "CONNECTED") : E2("SIN CONECTAR", "NOT CONNECTED")} yo={yo} ui={ui} blocks={B} />;
}
