"use client";
/* 7h · El enlace de un uso de WhatsApp y SMS (hueco #6 de fase7-compa.md §1b): la misma hoja de El Compa (CompaFrame page, como los pasos
   guiados 2at) con lo que El Compa preparó por mensaje — SOBRE ESTA OPERACIÓN, «Así queda» y la barra «EL COMPA LO PREPARÓ · CONFÍRMALO TÚ»
   (cancelar) o «Abrir» (una pantalla) —, siempre con el aviso de IA y «Con una persona». Usado, vencido o de otra cuenta: una línea, sin datos.
   Aquí solo se MUESTRA: lo decide el servidor (acciones.ts → lib/compa/enlace.ts → confirmar()). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import type { EstadoEnlace } from "@/lib/compa/enlace";
import { enlaceUsar } from "./acciones";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = UI as unknown as Record<"CompaFrame" | "CompaSysLine" | "CompaMsg" | "CompaSlot" | "CompaActionCard" | "RequestCard" | "Button", ComponentType<any>>;
type Bi = { es: string; en: string };
type Linea = { k: "sys" | "note"; t: string };

function useAncho() {
  const [w, setW] = useState(390);
  useEffect(() => { const f = () => setW(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return w;
}
const hora = (iso: string, _es: boolean) => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export function EnlaceCompa({ es, token, nombre, e }: { es: boolean; token: string; nombre: string | null; e: EstadoEnlace }) {
  const E2 = (a: string, b: string) => (es ? a : b), L = (x: Bi) => (es ? x.es : x.en);
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [hecho, setHecho] = useState<Linea[]>([]), [busy, setBusy] = useState(false), [vivo, setVivo] = useState(e.k === "ok");
  const ok = e.k === "ok" ? e : null, canal = ok ? (ok.canal === "whatsapp" ? "WhatsApp" : "SMS") : null;
  const usar = async (d: "si" | "no") => {
    if (!vivo || busy) return;
    setBusy(true);
    try {
      const r = await enlaceUsar(token, d);
      setVivo(false);
      if (r.ok && r.href) { router.push(r.href); return; }
      if (r.ok && d === "si") setHecho([{ k: "sys", t: L(r.linea ?? { es: "LISTO", en: "DONE" }) }, { k: "note", t: E2("Listo. ¿Te ayudo con algo más? Escríbeme por aquí o por mensaje.", "Done. Anything else? Write to me here or by message.") }]);
      else if (r.ok) setHecho([{ k: "note", t: E2("Perfecto, la dejamos como está.", "Sure, we'll leave it as is.") }]);
      else setHecho([{ k: "note", t: L(r.msg) }]);
      router.refresh();
    } catch { setHecho([{ k: "note", t: E2("No se pudo. Prueba otra vez o habla con una persona.", "It didn't work. Try again or talk to a person.") }]); }
    finally { setBusy(false); }
  };
  const fin: Record<string, Bi> = {
    usado: { es: "Ya usaste este enlace. Cada enlace sirve una sola vez.", en: "You already used this link. Each link works only once." },
    vencido: { es: "Este enlace ya venció. Escríbele otra vez al Compa por mensaje o pregúntale aquí en To'Latino.", en: "This link has expired. Message El Compa again or ask in To'Latino." },
    otra: { es: "Este enlace es de otra cuenta. Sal y entra con la cuenta del teléfono que recibió el mensaje.", en: "This link belongs to another account. Sign out and sign in with the account of the phone that got the message." },
    no: { es: "Ese enlace no existe. Revisa que esté completo.", en: "That link does not exist. Check that it is complete." },
  };
  const cuerpo: ReactNode[] = [];
  if (!ok) {
    cuerpo.push(<C.CompaMsg key="fin">{L(fin[e.k] ?? fin.no!)}</C.CompaMsg>);
    cuerpo.push(<C.CompaSlot key="ir"><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <C.Button size="md" block icon="chat" onClick={() => router.push("/soporte/compa")}>{E2("Pregúntale al Compa", "Ask El Compa")}</C.Button>
      <C.Button size="md" block variant="secondary" onClick={() => router.push("/")}>{E2("Ir al inicio", "Go home")}</C.Button></div></C.CompaSlot>);
  } else {
    cuerpo.push(<C.CompaSysLine key="sys">{E2(`DESDE ${canal!.toUpperCase()} · UN SOLO USO · VENCE A LAS ${hora(ok.vence, true)}`, `FROM ${canal!.toUpperCase()} · ONE USE · EXPIRES AT ${hora(ok.vence, false)}`)}</C.CompaSysLine>);
    cuerpo.push(<C.CompaMsg key="hola">{`${nombre ? E2(`Hola, ${nombre}.`, `Hi, ${nombre}.`) : E2("Hola.", "Hi.")} ${ok.tipo === "cancel_request"
      ? E2(`Esto es lo que te preparé por ${canal}. Hasta que lo confirmes, no cambia nada.`, `This is what I prepared for you by ${canal}. Nothing changes until you confirm it.`)
      : E2(`Esto es lo que me pediste por ${canal}.`, `This is what you asked me for by ${canal}.`)}`}</C.CompaMsg>);
    if (ok.op) cuerpo.push(<C.CompaSlot key="ctx"><C.RequestCard label={ok.op.grupo === "pedido" ? E2("SOBRE ESTE PEDIDO", "ABOUT THIS ORDER") : E2("SOBRE ESTA OPERACIÓN", "ABOUT THIS ITEM")}
      tag={L(ok.op.estado.l)} tone={ok.op.estado.tone} title={`${ok.op.negocio} · ${L(ok.op.titulo)}`} sub={L(ok.op.cuando)} /></C.CompaSlot>);
    if (ok.tipo === "cancel_request") cuerpo.push(<C.CompaActionCard key="act" active={vivo} label={E2("ASÍ QUEDA", "HERE'S HOW IT ENDS UP")} title={E2("Cancelar la solicitud", "Cancel the request")}
      sub={[ok.negocio, ok.op ? `${L(ok.op.titulo)} · ${L(ok.op.cuando)}` : null].filter(Boolean).join(" · ")} rows={[
        { k: E2("Cobro", "Charge"), v: "$0", c: "var(--tl-ink)" },
        { k: E2("Lo retenido", "Any hold"), v: ok.op && !ok.op.retenido ? E2("No hay nada retenido", "Nothing is held") : E2("Retenido → Liberado", "Held → Released"), c: ok.op && !ok.op.retenido ? "var(--tl-ink)" : "var(--tl-open-text)" },
        { k: E2("El negocio", "The business"), v: E2("Lo ve al instante", "Sees it right away"), c: "var(--tl-ink)" }]} />);
    else cuerpo.push(<C.CompaSlot key="abrir"><C.RequestCard label={E2("EL COMPA LO PREPARÓ", "EL COMPA PREPARED IT")} tag={E2("ABRIR", "OPEN")} tone="action" title={L(ok.pantalla)}
      sub={vivo ? E2("Toca para abrirlo", "Tap to open it") : E2("Ya se usó", "Already used")} onClick={vivo && !busy ? () => usar("si") : undefined} /></C.CompaSlot>);
  }
  for (const [i, h] of hecho.entries()) cuerpo.push(h.k === "sys" ? <C.CompaSysLine key={`h${i}`}>{h.t}</C.CompaSysLine> : <C.CompaMsg key={`h${i}`}>{h.t}</C.CompaMsg>);
  const disc = <>{E2("EL COMPA ES UNA IA Y PUEDE EQUIVOCARSE. LO QUE MUEVE DINERO O CAMBIA TU CUENTA LO REVISA UNA PERSONA.", "EL COMPA IS AN AI AND CAN MAKE MISTAKES. ANYTHING THAT MOVES MONEY OR CHANGES YOUR ACCOUNT IS REVIEWED BY A PERSON.")}
    {" "}<a href="/ayuda/privacidad-de-el-compa" data-privacidad style={{ color: "var(--tl-action)", textDecoration: "none" }}>{E2("QUÉ VE Y QUIÉN LO LEE", "WHAT IT SEES AND WHO READS IT")}</a></>;
  return (
    <div data-pantalla="APP-COMPA-ENLACE" data-enlace={e.k} data-screen-label={`El Compa · enlace de ${canal ?? "mensaje"} · ${desk ? "desktop" : "móvil"}`} className="bg-paper">
      <C.CompaFrame mode="page" desktop={desk} top={0} title="El Compa" sub={canal ? E2(`TE ESCRIBIÓ POR ${canal.toUpperCase()} · IA`, `WROTE TO YOU BY ${canal.toUpperCase()} · AI`) : E2("ASISTENTE DE IA", "AI ASSISTANT")}
        onBack={() => router.push("/soporte")} personLabel={E2("Con una persona", "Talk to a person")} person2Label={E2("Hablar con una persona", "Talk to a person")}
        onPerson={() => router.push("/soporte/compa")} disclaimer={disc}
        confirm={ok && ok.tipo === "cancel_request" && vivo ? { note: E2("EL COMPA LO PREPARÓ · CONFÍRMALO TÚ", "EL COMPA PREPARED IT · YOU CONFIRM"), okLabel: E2("Sí, cancelar la solicitud", "Yes, cancel the request"),
          noLabel: E2("No, dejarla", "No, keep it"), onOk: () => usar("si"), onNo: () => usar("no") } : null}
        composer={null}>
        {cuerpo}
      </C.CompaFrame>
    </div>
  );
}
