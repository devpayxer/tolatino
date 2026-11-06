"use client";
/* Resultado de confirmar el correo (2q): listo (te llegan tus recibos) o el enlace no sirve (pide otro en Perfil). */
import { useRouter } from "next/navigation";
import { Marco, useCuentaUi, type Yo } from "../Marco";

export function Correo({ ok, email, msg, es, yo }: { ok: boolean; email: string | null; msg: { es: string; en: string } | null; es: boolean; yo: Yo }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  return <Marco es={es} code="USR-PERFIL" back="/cuenta/perfil" t={E2("Correo", "Email")} s={ok ? E2("CONFIRMADO", "CONFIRMED") : E2("SIN CONFIRMAR", "NOT CONFIRMED")} yo={yo} ui={ui}
    blocks={[ok
      ? { type: "empty", ic: "verified", t: E2("Tu correo está confirmado", "Your email is confirmed"), s: E2(`Desde ahora te llegan tus recibos a ${email}.`, `From now on your receipts go to ${email}.`), cta: E2("Ir a mi perfil", "Go to my profile"), onCta: () => router.push("/cuenta/perfil") }
      : { type: "empty", ic: "warning", t: E2("Ese enlace no sirve", "That link does not work"), s: msg ? (es ? msg.es : msg.en) : "", cta: E2("Pedir otro", "Ask for another"), onCta: () => router.push("/cuenta/perfil") }]} />;
}
