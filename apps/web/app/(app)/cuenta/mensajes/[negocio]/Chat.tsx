"use client";
/* USR-CHAT-NEG (diseño «To'Latino Mi cuenta» · chatV + plantilla isChat): el contexto (toca para ir al negocio), las
   burbujas (tuyas oscuras a la derecha; del negocio blancas; respuesta automática y avisos del sistema suaves) y la caja
   para escribir. Sin teléfonos en el texto. Mientras la pantalla está abierta trae lo nuevo cada 4 segundos.
   7f · Cuando contesta El Compa (respuestas automáticas Pro del negocio): su burbuja con el tinte de IA y «EL COMPA · IA · {hora}» (diseño Mi
   cuenta · chat, m[4] === 'compa'), «El Compa está escribiendo…» mientras el servidor contesta (y se pregunta más seguido) y, para reportar,
   «Una respuesta de El Compa». */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Conversacion, Msj } from "@/lib/mensajes";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../../Marco";
import { cuando, sistema } from "../Mensajes";
import { mensajeEnviar, mensajeReportar, mensajesNuevos } from "../acciones";
import { useAhora } from "@/lib/ahora";

const TEL = /(\d[\s.\-()]*){10}/;
export function Chat({ c, op, es, yo }: { c: Conversacion; op: string | null; es: boolean; yo: Yo }) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const [msjs, setMsjs] = useState<Msj[]>(c.msjs), [v, setV] = useState(""), [pend, start] = useTransition();
  const [hilo, setHilo] = useState(c.id), [rep, setRep] = useState(false), [escribe, setEscribe] = useState(c.compaEscribe);
  const fin = useRef<HTMLDivElement>(null), ultimo = msjs.length ? msjs[msjs.length - 1]!.id : "0";
  useEffect(() => { fin.current?.scrollIntoView({ block: "end" }); }, [msjs.length]);
  useEffect(() => {
    if (!hilo) return;
    const t = window.setInterval(async () => {
      if (document.hidden) return;
      const L = await mensajesNuevos(hilo, ultimo).catch(() => []);
      if (L.length) setMsjs((m) => [...m, ...L.filter((x) => !m.some((y) => y.id === x.id))]);
      if (L.some((x) => x.de !== "user")) setEscribe(false);
    }, escribe ? 1500 : 4000);
    return () => window.clearInterval(t);
  }, [hilo, ultimo, escribe]);
  // «Escribiendo…» nunca se queda pegado: a los 25 s se quita (la respuesta llega igual con la pregunta de cada 4 s).
  useEffect(() => { if (!escribe) return; const t = window.setTimeout(() => setEscribe(false), 25000); return () => window.clearTimeout(t); }, [escribe]);
  const enviar = () => {
    const x = v.trim();
    if (!x || pend) return;
    if (TEL.test(x)) { ui.toast(E2("Por seguridad, sin teléfonos en los mensajes.", "For your safety, no phone numbers in messages.")); return; }
    start(async () => {
      const r = await mensajeEnviar(c.negocio.id, x, op);
      if (!r.ok) { ui.toast(es ? r.msg.es : r.msg.en); return; }
      setV("");
      if (r.compa) setEscribe(true);
      const id = r.id ?? hilo;
      if (id && !hilo) setHilo(id);
      if (id) { const L = await mensajesNuevos(id, ultimo).catch(() => []); setMsjs((m) => [...m, ...L.filter((z) => !m.some((y) => y.id === z.id))]); }
    });
  };
  const ctx = (c.ctx ? (es ? c.ctx.es : c.ctx.en) : msjs.length ? E2("Consulta general", "General question") : E2("Conversación nueva", "New conversation")).toUpperCase();
  const B: Bloque[] = [];
  if (rep && hilo) B.push({ type: "note", tone: "info", ic: "warning", s: E2("¿Por qué la reportas? To’Latino la revisa y, solo con tu reporte, puede leerla.", "Why are you reporting it? To’Latino reviews it and, only with your report, can read it.") },
    { type: "acts", btns: ([...(msjs.some((m) => m.compa) ? [["compa", E2("Una respuesta de El Compa", "An El Compa reply")]] as const : []), ["spam", E2("Spam o publicidad", "Spam or ads")], ["off", E2("Ofensivo o amenaza", "Offensive or threat")], ["pii", E2("Pide datos o dinero", "Asks for data or money")], ["otro", E2("Otra cosa", "Something else")]] as const).map(([k, l]) => [l, "secondary", "warning", () => start(async () => { const r = await mensajeReportar(hilo, k, ""); setRep(false); ui.toast(r.ok ? E2("Gracias. To’Latino lo revisa en 48 horas.", "Thank you. To’Latino reviews it within 48 hours.") : (es ? r.msg.es : r.msg.en)); })] as [string, string, string, () => void]), cols: "1fr 1fr" });
  if (hilo) B.unshift({ type: "tel", b: [{ type: "sec", t: E2("Conversación", "Conversation"), a: rep ? E2("Cancelar", "Cancel") : E2("Reportar", "Report"), onA: () => setRep((x) => !x), mt: "0" }] });
  B.push({
    type: "chat", ph: c.negocio.foto, ini: c.negocio.nombre.slice(0, 1), ctx, onBiz: () => router.push(`/n/${c.negocio.id}`),
    msgs: msjs.length ? [...msjs.map((m) => ({
      yo: m.de === "user", suave: m.de === "auto" || m.de === "system" || m.oculto, ia: m.compa && !m.oculto,
      t: m.oculto ? E2("Mensaje oculto por To’Latino.", "Message hidden by To’Latino.") : m.de === "system" ? sistema(m.t, es) : m.t,
      time: `${m.de === "auto" ? (m.compa ? E2("EL COMPA · IA · ", "EL COMPA · AI · ") : E2("RESPUESTA AUTOMÁTICA · ", "AUTO-REPLY · ")) : m.de === "business" && m.quien ? `${m.quien.toUpperCase()} · ` : ""}${cuando(m.at, es, ahora)}`,
    })), ...(escribe ? [{ yo: false, suave: true, t: E2("El Compa está escribiendo…", "El Compa is typing…"), time: E2("EL COMPA · IA", "EL COMPA · AI") }] : [])] : [{ yo: false, suave: true, t: E2(`Escríbele a ${c.negocio.nombre}. Te contesta aquí y te avisamos.`, `Write to ${c.negocio.nombre}. They reply here and we let you know.`), time: c.negocio.abierto ? E2("ABIERTO AHORA", "OPEN NOW") : E2("AHORA CERRADO · CONTESTA CUANDO ABRA", "CLOSED NOW · THEY REPLY WHEN THEY OPEN") }],
    v, onV: (x) => setV(x.slice(0, 1000)), ph2: E2(`Escribe a ${c.negocio.nombre}…`, `Write to ${c.negocio.nombre}…`), send: E2("Enviar", "Send"), onSend: enviar,
    off: !c.puede, nota: c.motivo ? (es ? c.motivo.es : c.motivo.en) : undefined,
  });
  return (
    <>
      <Marco es={es} code="USR-MENSAJES" t={c.negocio.nombre} s={ctx} back="/cuenta/mensajes" blocks={B} yo={yo} ui={ui}
        act={hilo ? { l: E2("Reportar", "Report"), ic: "warning", on: () => setRep((x) => !x) } : undefined}
        rcards={[{ label: "Chat · el negocio", k: E2("EL NEGOCIO", "THE BUSINESS"), rows: [{ t: c.negocio.nombre, s: `${c.negocio.cat}${c.negocio.rating ? ` · ★ ${c.negocio.rating.toFixed(1)}` : ""}`.toUpperCase(), on: () => router.push(`/n/${c.negocio.id}`) }], cta: E2("Ver el negocio", "See the business"), onCta: () => router.push(`/n/${c.negocio.id}`) }]} />
      <div ref={fin} />
    </>
  );
}
