"use client";
/* USR-TELEFONO (diseño «To'Latino Mi cuenta» · phoneV): 2 pasos. El número nuevo (no puede ser el mismo ni uno con
   cuenta) y el código de 6 números que le mandamos; el servidor lo revisa con tope de intentos. Tu cuenta sigue igual. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { telCambiar, telCodigo } from "../../acciones-perfil";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../../Marco";

const fmt = (d: string) => (d.length < 4 ? d : d.length < 7 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`);
export function Telefono({ actual, es, yo, pruebas }: { actual: string; es: boolean; yo: Yo; pruebas: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const [step, setStep] = useState(1), [ph, setPh] = useState(""), [code, setCode] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [prueba, setPrueba] = useState<string | null>(null);
  const cur = actual.replace(/\D/g, "").slice(-10);
  const pedir = async () => {
    if (ph.length !== 10 || busy) { setErr(ph.length !== 10 ? E2("Escribe los 10 números.", "Enter all 10 digits.") : ""); return; }
    if (ph === cur) { setErr(E2("Es el mismo número que ya tienes.", "That is the number you already have.")); return; }
    setBusy(true); const r = await telCodigo(ph).catch(() => null); setBusy(false);
    if (r?.ok) { setStep(2); setCode(""); setErr(""); setPrueba(r.codigoPrueba ?? null); ui.toast(E2(`Te mandamos un código al +1 ${fmt(ph)}.`, `We texted a code to +1 ${fmt(ph)}.`)); return; }
    setErr(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection."));
  };
  const confirmar = async () => {
    if (code.length !== 6 || busy) return;
    setBusy(true); const r = await telCambiar(ph, code).catch(() => null); setBusy(false);
    if (r?.ok) { ui.toast(E2(`Listo. Ahora entras con el +1 ${fmt(ph)}.`, `Done. You now sign in with +1 ${fmt(ph)}.`)); router.push("/cuenta/perfil"); router.refresh(); return; }
    setErr(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection.")); setCode("");
  };
  const B: Bloque[] = [{ type: "rows", rows: [
    { ic: step > 1 ? "check" : "phone", ibg: step > 1 ? "rgba(0,229,196,.16)" : undefined, ifg: step > 1 ? "var(--tl-open-text)" : undefined, t: E2("Tu número nuevo", "Your new number"), s: step > 1 ? `+1 ${fmt(ph)}` : E2("PASO 1 DE 2", "STEP 1 OF 2") },
    { ic: "lock", ibg: step === 2 ? undefined : "rgba(11,14,18,.05)", ifg: step === 2 ? undefined : "rgba(11,14,18,.4)", t: E2("Confirma con el código que te mandamos", "Confirm with the code we send"), s: E2("PASO 2 DE 2", "STEP 2 OF 2") },
  ] }];
  if (step === 1) {
    B.push({ type: "kv", kw: "130px", rows: [{ k: E2("NÚMERO ACTUAL", "CURRENT NUMBER"), v: `+1 ${fmt(cur)}${E2(" · verificado", " · verified")}` }] });
    B.push({ type: "form", fields: [{ k: E2("NÚMERO NUEVO · +1", "NEW NUMBER · +1"), v: fmt(ph), onV: (v) => { setPh(v.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10)); setErr(""); }, ph: "(570) 555-0199", type: "tel", im: "numeric", max: 16, err, h: E2("Te mandamos un código por SMS para confirmar que es tuyo.", "We text you a code to confirm it is yours.") }] });
    B.push({ type: "sec", t: E2("Qué pasa al cambiarlo", "What happens when you change it"), fs: "14px", mt: "4px" });
    B.push({ type: "rows", rows: [
      { ic: "check", ibg: "rgba(0,229,196,.16)", ifg: "var(--tl-open-text)", t: E2("Tu cuenta sigue igual", "Your account stays the same"), s: E2("PEDIDOS, RESERVAS, RESEÑAS Y GUARDADOS", "ORDERS, BOOKINGS, REVIEWS AND SAVED") },
      { ic: "lock", t: E2("Tu número viejo deja de servir para entrar", "Your old number stops working to sign in"), s: E2("ENTRAS CON EL NUEVO", "YOU SIGN IN WITH THE NEW ONE") },
      { ic: "store", t: E2("Los negocios con un pedido o reservación abierta ven el nuevo", "Businesses with an open order or booking see the new one"), s: E2("LOS DEMÁS NUNCA VEN TU NÚMERO", "OTHERS NEVER SEE YOUR NUMBER") },
    ] });
    B.push({ type: "desk", b: [{ type: "acts", cols: "minmax(0,260px)", btns: [[E2("Mandarme el código", "Text me the code"), "primary", "chat", pedir, ph.length !== 10 || busy]] }] });
  } else {
    if (pruebas && prueba) B.push({ type: "note", tone: "warn", ic: "info", s: E2(`Sandbox: el código es ${prueba} (en producción llega por SMS).`, `Sandbox: the code is ${prueba} (in production it arrives by text).`) });
    B.push({ type: "form", fields: [{ k: E2("CÓDIGO DE 6 NÚMEROS", "6-DIGIT CODE"), v: code, onV: (v) => { setCode(v.replace(/\D/g, "").slice(0, 6)); setErr(""); }, ph: "482913", im: "numeric", max: 6, err, h: E2(`Lo mandamos por SMS al +1 ${fmt(ph)}.`, `Texted to +1 ${fmt(ph)}.`) }] });
    B.push({ type: "note", tone: "info", ic: "chat", s: E2("¿No te llegó? Revisa el número o pide otro código.", "Didn't get it? Check the number or ask for another code."), a: E2("Reenviar", "Resend"), onA: pedir });
    B.push({ type: "acts", cols: "repeat(2,minmax(0,220px))", btns: [[E2("Cambiar el número", "Change the number"), "secondary", "edit", () => { setStep(1); setCode(""); setErr(""); }]] });
    B.push({ type: "desk", b: [{ type: "acts", cols: "minmax(0,220px)", btns: [[E2("Confirmar cambio", "Confirm change"), "primary", "check", confirmar, code.length !== 6 || busy]] }] });
  }
  return <Marco es={es} code="USR-TELEFONO" back="/cuenta/perfil" t={E2("Cambiar mi número", "Change my number")} s={E2("TU CUENTA SE QUEDA IGUAL", "YOUR ACCOUNT STAYS THE SAME")} blocks={B} yo={yo} ui={ui}
    bar={step === 1 ? [[E2("Mandarme el código", "Text me the code"), "primary", pedir, ph.length !== 10 || busy]] : [[E2("Confirmar cambio", "Confirm change"), "primary", confirmar, code.length !== 6 || busy]]} />;
}
