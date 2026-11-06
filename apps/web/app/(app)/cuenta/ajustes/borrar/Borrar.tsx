"use client";
/* USR-BORRAR (diseño «To'Latino Mi cuenta» · delV): 3 pasos. Por qué te vas (opcional; «muchos avisos» lleva a Avisos),
   qué pasa con tu cuenta, y el código que te mandamos a tu teléfono. Queda programado a 30 días: entrar o «Cancelar el
   borrado» lo quita. Si ya está programado, solo se ve la fecha y cancelar. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { borrarCancelar, borrarCodigo, borrarConfirmar } from "../../acciones-perfil";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../../Marco";

export function Borrar({ d, tel, es, yo, pruebas }: { d: { d: string | null; admin: boolean }; tel: string; es: boolean; yo: Yo; pruebas: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const [step, setStep] = useState(1), [why, setWhy] = useState(""), [code, setCode] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [prueba, setPrueba] = useState<string | null>(null);
  const dia = (iso: string) => new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: "America/New_York", day: "numeric", month: "long" }).format(new Date(iso));
  const t = E2("Borrar mi cuenta", "Delete my account"), telL = tel.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "+1 ($1) $2-$3");
  if (d.d) {
    const B: Bloque[] = [{ type: "note", tone: "danger", ic: "clock", t: E2(`Tu cuenta se borra el ${dia(d.d)}`, `Your account will be deleted on ${dia(d.d)}`), s: d.admin ? E2("To'Latino programó el borrado. Si es un error, escríbele a Soporte.", "To'Latino scheduled the deletion. If it is a mistake, contact Support.") : E2("Hasta entonces puedes cancelarlo. Después no se puede recuperar.", "Until then you can cancel. After that it cannot be recovered.") }];
    if (!d.admin) B.push({ type: "acts", cols: "minmax(0,280px)", btns: [[E2("Cancelar el borrado", "Cancel deletion"), "primary", "check", async () => { const r = await borrarCancelar().catch(() => null); if (r?.ok) { ui.toast(E2("Listo. Tu cuenta sigue activa.", "Done. Your account stays active.")); router.push("/cuenta"); router.refresh(); } }]] });
    return <Marco es={es} code="USR-BORRAR" back="/cuenta/ajustes" t={t} s={E2("30 DÍAS PARA ARREPENTIRTE", "30 DAYS TO CHANGE YOUR MIND")} blocks={B} yo={yo} ui={ui} />;
  }
  const pedir = async () => {
    setBusy(true); const r = await borrarCodigo().catch(() => null); setBusy(false);
    if (r?.ok) { setStep(3); setCode(""); setErr(""); setPrueba(r.codigoPrueba ?? null); return; }
    ui.toast(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection."));
  };
  const confirmar = async () => {
    if (!/^\d{6}$/.test(code) || busy) return;
    setBusy(true); const r = await borrarConfirmar(code, why).catch(() => null); setBusy(false);
    if (r?.ok) { router.push("/cuenta"); router.refresh(); return; }
    setErr(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection.")); setCode("");
  };
  const paso = (n: number, l: string) => ({ ic: step > n ? "check" : String(n) === "1" ? "help" : n === 2 ? "info" : "lock", ibg: step > n ? "rgba(0,229,196,.16)" : step === n ? undefined : "rgba(11,14,18,.05)", ifg: step > n ? "var(--tl-open-text)" : step === n ? undefined : "rgba(11,14,18,.4)", t: l, s: `${E2("PASO", "STEP")} ${n} ${E2("DE", "OF")} 3` });
  const B: Bloque[] = [{ type: "rows", rows: [paso(1, E2("Por qué te vas", "Why you are leaving")), paso(2, E2("Qué pasa con tu cuenta", "What happens to your account")), paso(3, E2("Confirma con un código", "Confirm with a code"))] }];
  if (step === 1) {
    B.push({ type: "form", fields: [{ k: E2("¿POR QUÉ TE VAS?", "WHY ARE YOU LEAVING?"), v: why, onV: () => undefined, opt: E2("OPCIONAL", "OPTIONAL"),
      chips: ([["uso", E2("Ya no la uso", "I no longer use it")], ["avisos", E2("Muchos avisos", "Too many notifications")], ["priv", E2("Privacidad", "Privacy")], ["ciudad", E2("Me mudé", "I moved")], ["otra", E2("Otra razón", "Other reason")]] as [string, string][])
        .map(([k, l]) => ({ l, on: why === k, onClick: () => setWhy(why === k ? "" : k) })) }] });
    if (why === "avisos") B.push({ type: "note", tone: "info", ic: "bell", t: E2("Puedes bajar los avisos sin irte", "You can reduce notifications without leaving"), s: E2("Elige qué te llega y pon horas de silencio.", "Choose what you get and set quiet hours."), a: E2("Ver avisos", "See notifications"), onA: () => router.push("/cuenta/avisos") });
    if (why === "ciudad") B.push({ type: "note", tone: "info", ic: "pin", s: E2("Si te mudaste a otra ciudad abierta, puedes cambiar tu ciudad sin borrar la cuenta.", "If you moved to another open city, you can change your city without deleting the account."), a: E2("Mi ciudad", "My city"), onA: () => router.push("/cuenta/ajustes/ciudad") });
    B.push({ type: "acts", cols: "minmax(0,240px)", btns: [[E2("Seguir", "Continue"), "primary", "chevronRight", () => setStep(2)]] });
  }
  if (step === 2) {
    B.push({ type: "rows", rows: [
      { ic: "trash", ibg: "rgba(11,14,18,.05)", ifg: "rgba(11,14,18,.6)", t: E2("Se borran tu perfil, tus direcciones y lo que guardaste", "Your profile, addresses and saved items are deleted") },
      { ic: "star", ibg: "rgba(11,14,18,.05)", ifg: "rgba(11,14,18,.6)", t: E2("Tus reseñas y comentarios se borran", "Your reviews and comments are deleted") },
      { ic: "brief", ibg: "rgba(11,14,18,.05)", ifg: "rgba(11,14,18,.6)", t: E2("Tus solicitudes de empleo se cierran", "Your job applications are closed") },
      { ic: "folder", ibg: "rgba(11,14,18,.05)", ifg: "rgba(11,14,18,.6)", t: E2("Tus pedidos y reservaciones se borran de tu cuenta", "Your orders and bookings are deleted from your account") },
    ] });
    B.push({ type: "note", tone: "warn", ic: "clock", t: E2("Tienes 30 días para arrepentirte", "You have 30 days to change your mind"), s: E2("Si entras antes, se cancela el borrado.", "If you sign in before then, the deletion is canceled.") });
    B.push({ type: "acts", cols: "repeat(2,minmax(0,200px))", btns: [[E2("Mandarme el código", "Text me the code"), "primary", "chat", () => void pedir(), busy], [E2("Atrás", "Back"), "secondary", "chevronLeft", () => setStep(1)]] });
  }
  if (step === 3) {
    if (pruebas && prueba) B.push({ type: "note", tone: "warn", ic: "info", s: E2(`Sandbox: el código es ${prueba} (en producción llega por SMS).`, `Sandbox: the code is ${prueba} (in production it arrives by text).`) });
    B.push({ type: "form", fields: [{ k: E2("CÓDIGO QUE TE MANDAMOS POR SMS", "CODE WE TEXTED YOU"), v: code, onV: (v) => { setCode(v.replace(/\D/g, "").slice(0, 6)); setErr(""); }, ph: "482913", im: "numeric", max: 6, err, h: `${E2("Lo mandamos al ", "Sent to ")}${telL}` }] });
    B.push({ type: "acts", cols: "repeat(2,minmax(0,200px))", btns: [[E2("Borrar mi cuenta", "Delete my account"), "danger", "trash", () => void confirmar(), !/^\d{6}$/.test(code) || busy], [E2("Mejor no", "Never mind"), "secondary", "close", () => router.push("/cuenta/ajustes")]] });
  }
  return <Marco es={es} code="USR-BORRAR" back="/cuenta/ajustes" t={t} s={E2("30 DÍAS PARA ARREPENTIRTE", "30 DAYS TO CHANGE YOUR MIND")} blocks={B} yo={yo} ui={ui} />;
}
