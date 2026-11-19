"use client";
/* USR-CHAT-NEG (diseño «To'Latino Mi cuenta» · chatV + plantilla isChat): el contexto (toca para ir al negocio), las
   burbujas (tuyas oscuras a la derecha; del negocio blancas; respuesta automática y avisos del sistema suaves) y la caja
   para escribir. Sin teléfonos en el texto. 9m: lo nuevo llega en vivo (SSE propio, sin preguntar cada 4 segundos).
   7f · Cuando contesta El Compa (respuestas automáticas Pro del negocio): su burbuja con el tinte de IA y «EL COMPA · IA · {hora}» (diseño Mi
   cuenta · chat, m[4] === 'compa'), «El Compa está escribiendo…» mientras el servidor contesta (y se pregunta más seguido) y, para reportar,
   «Una respuesta de El Compa».
   9t · Fotos: el IconButton «image» del composer (como Soporte) sube la foto PRIVADA (/api/mensajes/foto; la revisa el modelo propio) y la
   miniatura queda con «Quitar foto» hasta enviar; se puede mandar solo la foto. En la burbuja: la foto (180 × 140; se abre aparte), o «Foto en
   revisión» mientras To'Latino la revisa (quien la mandó la ve con «EN REVISIÓN»), o «Foto quitada por To’Latino». «Ver traducción» ES↔EN
   bajo los mensajes del negocio que no están en tu idioma (useTraducir de la Comunidad: traductor propio, caché y tope; el original se queda). */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { subirFotoMensaje } from "@/lib/subir-foto";
import { LineaTr, useTraducir } from "../../../Traducir";
import type { Conversacion, Msj } from "@/lib/mensajes";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../../Marco";
import { cuando, sistema } from "../Mensajes";
import { mensajeEnviar, mensajeReportar, mensajesNuevos } from "../acciones";
import { useAhora } from "@/lib/ahora";
import { useMensajesVivo } from "@/lib/vivo-cliente";
import { dosIdiomas } from "@/lib/dos-idiomas";

// Un teléfono son 10 dígitos (con +1 delante o no); una tarjeta (13–19) no es un teléfono: el servidor la tapa como Soporte (9m).
const TEL = /(?<!\d[\s.\-()]*)(?:\+?1[\s.\-()]*)?(?:\d[\s.\-()]*){9}\d(?![\s.\-()]*\d)/;
export function Chat({ c, op, es, yo }: { c: Conversacion; op: string | null; es: boolean; yo: Yo }) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  const router = useRouter(), ui = useCuentaUi();
  const [msjs, setMsjs] = useState<Msj[]>(c.msjs), [v, setV] = useState(""), [pend, start] = useTransition();
  const [hilo, setHilo] = useState(c.id), [rep, setRep] = useState(false), [escribe, setEscribe] = useState(c.compaEscribe);
  const tr = useTraducir(es), file = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<{ id: string; url: string; revision: boolean } | null>(null), [subiendo, setSubiendo] = useState(false);
  const subir = async (f: File) => {
    if (!/^image\//.test(f.type)) { ui.toast(E2("Eso no parece una foto. Prueba con otra.", "That doesn’t look like a photo. Try another one.")); return; }
    setSubiendo(true);
    const r = await subirFotoMensaje(f).catch(() => ({ ok: false as const, mensaje: undefined, revision: false }));
    setSubiendo(false);
    if (r.ok && r.id && r.url) setFoto({ id: r.id, url: r.url, revision: !!r.revision });
    else ui.toast(r.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo subir la foto.", "The photo could not be uploaded."));
  };
  const fin = useRef<HTMLDivElement>(null), ultimo = msjs.length ? msjs[msjs.length - 1]!.id : "0";
  useEffect(() => { fin.current?.scrollIntoView({ block: "end" }); }, [msjs.length]);
  // 9m · En vivo (SSE propio, /api/vivo): cuando llega algo a ESTA conversación se trae lo nuevo; al conectarse (y al volver de un corte), una vez.
  const traer = useRef<() => void>(() => undefined);
  traer.current = () => {
    if (!hilo) return;
    // 9t · Si hay una foto en revisión, se trae desde ella (el aviso en vivo también llega cuando To'Latino la decide) y lo que cambió se reemplaza.
    const rev = msjs.find((m) => m.fotoEst === "revision"), desde = rev ? String(Math.max(0, Number(rev.id) - 1)) : ultimo;
    void mensajesNuevos(hilo, desde).catch(() => []).then((L) => {
      if (L.length) setMsjs((m) => [...m.map((y) => L.find((x) => x.id === y.id) ?? y), ...L.filter((x) => !m.some((y) => y.id === x.id))]);
      if (L.some((x) => x.de !== "user")) setEscribe(false);
    });
  };
  useMensajesVivo({ apagado: !hilo, on: (x) => { if (x.k === "chat" && x.t === hilo) traer.current(); }, listo: () => traer.current() });
  // «Escribiendo…» nunca se queda pegado: a los 25 s se quita (la respuesta de El Compa llega en vivo cuando se guarda).
  useEffect(() => { if (!escribe) return; const t = window.setTimeout(() => setEscribe(false), 25000); return () => window.clearTimeout(t); }, [escribe]);
  const enviar = () => {
    const x = v.trim();
    if ((!x && !foto) || pend || subiendo) return;
    if (TEL.test(x)) { ui.toast(E2("Por seguridad, sin teléfonos en los mensajes.", "For your safety, no phone numbers in messages.")); return; }
    start(async () => {
      const r = await mensajeEnviar(c.negocio.id, x, op, foto?.id ?? null);
      if (!r.ok) { ui.toast(es ? r.msg.es : r.msg.en); return; }
      setV(""); setFoto(null);
      if (r.tapado) ui.toast(E2("No compartas eso aquí. Nunca te lo pedimos. Lo tapamos.", "Don't share that here. We never ask for it. We covered it."));
      else if (r.revision) ui.toast(E2("Tu foto se ve cuando To’Latino la revise.", "Your photo shows once To’Latino reviews it."));
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
    msgs: msjs.length ? [...msjs.map((m) => {
      // 9t · «Ver traducción» solo en lo del negocio (lo tuyo no se traduce) y si el texto no está en tu idioma; el original se queda.
      const x = m.oculto || m.de !== "business" ? { body: m.t, translate: undefined } : tr("chat_message", m.id, m.lang, m.t, false);
      return {
        yo: m.de === "user", suave: m.de === "auto" || m.de === "system" || m.oculto || (m.fotoEst === "quitada" && !m.t), ia: m.compa && !m.oculto,
        t: m.oculto ? E2("Mensaje oculto por To’Latino.", "Message hidden by To’Latino.") : m.de === "system" ? sistema(m.t, es) : m.fotoEst === "quitada" && !m.t ? E2("Foto quitada por To’Latino.", "Photo removed by To’Latino.") : x.body,
        foto: m.foto, fotoAlt: E2("Foto", "Photo"),
        fotoL: m.foto || !m.fotoEst || m.fotoEst === "quitada" ? undefined : m.fotoEst === "revision" ? E2("Foto en revisión", "Photo under review") : E2("Foto", "Photo"),
        tr: x.translate ? <LineaTr t={x.translate} mt={0} /> : undefined,
        time: `${m.de === "auto" ? (m.compa ? E2("EL COMPA · IA · ", "EL COMPA · AI · ") : E2("RESPUESTA AUTOMÁTICA · ", "AUTO-REPLY · ")) : m.de === "business" && m.quien ? `${m.quien.toUpperCase()} · ` : ""}${m.fotoEst === "revision" && m.de === "user" ? E2("EN REVISIÓN · ", "UNDER REVIEW · ") : ""}${cuando(m.at, es, ahora)}`,
      };
    }), ...(escribe ? [{ yo: false, suave: true, t: E2("El Compa está escribiendo…", "El Compa is typing…"), time: E2("EL COMPA · IA", "EL COMPA · AI") }] : [])] : [{ yo: false, suave: true, t: E2(`Escríbele a ${c.negocio.nombre}. Te contesta aquí y te avisamos.`, `Write to ${c.negocio.nombre}. They reply here and we let you know.`), time: c.negocio.abierto ? E2("ABIERTO AHORA", "OPEN NOW") : E2("AHORA CERRADO · CONTESTA CUANDO ABRA", "CLOSED NOW · THEY REPLY WHEN THEY OPEN") }],
    v, onV: (x) => setV(x.slice(0, 1000)), ph2: E2(`Escribe a ${c.negocio.nombre}…`, `Write to ${c.negocio.nombre}…`), send: E2("Enviar", "Send"), onSend: enviar,
    off: !c.puede, nota: c.motivo ? (es ? c.motivo.es : c.motivo.en) : undefined,
    onFoto: () => file.current?.click(), fotoL: E2("Agregar una foto", "Add a photo"), subiendo: subiendo ? E2("Subiendo la foto…", "Uploading the photo…") : null,
    adj: foto ? { url: foto.url, quitar: () => setFoto(null), quitarL: E2("Quitar foto", "Remove photo"), nota: foto.revision ? E2("To’Latino la revisa antes de que se vea.", "To’Latino reviews it before it shows.") : undefined } : null,
  });
  return (
    <>
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void subir(f); e.target.value = ""; }} />
      <Marco es={es} code="USR-MENSAJES" t={c.negocio.nombre} s={ctx} back="/cuenta/mensajes" blocks={B} yo={yo} ui={ui}
        act={hilo ? { l: E2("Reportar", "Report"), ic: "warning", on: () => setRep((x) => !x) } : undefined}
        rcards={[{ label: "Chat · el negocio", k: E2("EL NEGOCIO", "THE BUSINESS"), rows: [{ t: c.negocio.nombre, s: `${c.negocio.cat}${c.negocio.rating ? ` · ★ ${c.negocio.rating.toFixed(1)}` : ""}`.toUpperCase(), on: () => router.push(`/n/${c.negocio.id}`) }], cta: E2("Ver el negocio", "See the business"), onCta: () => router.push(`/n/${c.negocio.id}`) }]} />
      <div ref={fin} />
    </>
  );
}
