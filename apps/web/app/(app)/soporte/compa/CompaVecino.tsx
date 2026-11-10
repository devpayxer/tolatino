"use client";
/* 7d · El Compa para vecinos (diseño `To'Latino Compa.dc.html` con `To'Latino Compa (variantes).dc.html` 1b + 1c; fase7-compa.md §4 7d y §5).
   Un solo componente con dos modos del sistema (CompaFrame):
   - sheet = 2as · hoja de ayuda sobre la operación (móvil 88 %, escritorio panel de 420 a la derecha): SOBRE ESTA … con el estado del
     servidor, las razones fijas de su tipo y estado, «Así queda» + confirmar, «Tu caso pasó a Soporte» y el texto libre;
   - page  = 2at · pasos guiados en Soporte (/soporte/compa): Una cita o reservación · Un pedido · Un boleto · Un pago o cobro · Mi cuenta.
   Siempre: el aviso de IA con su línea de privacidad, «Con una persona» y la fuente que abre /ayuda/[slug]. Aquí solo se MUESTRA: todo lo
   decide el servidor (acciones-compa.ts → lib/compa). Una acción preparada se confirma con otro toque (otra petición, el id de un uso). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import type { Hoja, OpHoja, Razon } from "@/lib/compa/hoja";
import type { TurnoOk } from "@/lib/compa/conversacion";
import { compaConfirmar, compaDescartar, compaPaso, compaTurno } from "./acciones-compa";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = UI as unknown as Record<"CompaFrame" | "CompaSysLine" | "CompaUserMsg" | "CompaMsg" | "CompaTyping" | "CompaSlot" | "CompaActionCard" | "CompaHandoffCard" | "CompaChips" | "RequestCard" | "HelpReasonList" | "OptionCard" | "Button", ComponentType<any>>;
type Bi = { es: string; en: string };
type Fuente = { label: string; href?: string; titulo?: string; slug?: string };
type Blq =
  | { k: "sys"; t: string } | { k: "qa"; t: string } | { k: "note"; t: string; src?: Fuente | null }
  | { k: "ctx"; op: OpHoja } | { k: "reasons"; op: OpHoja } | { k: "kinds" } | { k: "oplist"; ops: OpHoja[] } | { k: "pay" } | { k: "acct" }
  | { k: "act"; t: string; s: string; retenido: boolean | null } | { k: "abrir"; id: string; t: string; s: string }
  | { k: "hand"; caso: string; promesa: Bi; lines: string[] } | { k: "chips"; items: string[] } | { k: "entrar" };
type Pend = { id: string; negocio: string };

function useAncho() {
  const [w, setW] = useState(390);
  useEffect(() => { const f = () => setW(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return w;
}

export function CompaVecino({ modo, es, nombre, hoja, ops, hor, conSesion }: {
  modo: "sheet" | "page"; es: boolean; nombre: string | null; hoja?: Hoja | null; ops?: OpHoja[]; hor: string; conSesion: boolean;
}) {
  const E2 = (a: string, b: string) => (es ? a : b), L = (x: Bi) => (es ? x.es : x.en);
  const router = useRouter(), w = useAncho(), desk = w >= 1024, sheet = modo === "sheet";
  const op0 = hoja?.op ?? null, sup = sheet ? "help_sheet" : "support_page";
  const hola = nombre ? E2(`Hola, ${nombre}.`, `Hi, ${nombre}.`) : E2("Hola.", "Hi.");
  const inicio = (): Blq[] => {
    if (!conSesion) return [{ k: "note", t: E2("Entra para que El Compa vea tus pedidos y citas.", "Sign in so El Compa can see your orders and bookings.") }, { k: "entrar" }];
    if (op0) return [{ k: "ctx", op: op0 }, { k: "note", t: `${hola} ${E2(`¿Qué necesitas con ${op0.grupo === "pedido" ? "este pedido" : op0.f ? `esta ${op0.titulo.es.replace(/ (#\d+|[A-Z]{1,2}-\d+)$/, "").toLowerCase()}` : `este ${op0.titulo.es.replace(/ (#\d+|[A-Z]{1,2}-\d+)$/, "").toLowerCase()}`}?`, `What do you need with this ${op0.titulo.en.replace(/ (#\d+|[A-Z]{1,2}-\d+)$/, "").toLowerCase()}?`)}` }, { k: "reasons", op: op0 }];
    return [{ k: "note", t: `${hola} ${E2("Soy El Compa, el asistente de IA de To'Latino. ¿Con qué te ayudo? Toca una opción o escríbelo con tus palabras.", "I'm El Compa, To'Latino's AI assistant. What can I help with? Tap an option or type it in your own words.")}` }, { k: "kinds" }];
  };
  const [th, setTh] = useState<Blq[]>(inicio);
  const [pend, setPend] = useState<Pend | null>(null), [busy, setBusy] = useState(false), [txt, setTxt] = useState("");
  const conv = useRef<string | null>(null), opSel = useRef<OpHoja | null>(op0), body = useRef<HTMLDivElement | null>(null);
  const push = (b: Blq[]) => setTh((x) => [...x, ...b]);
  useEffect(() => {
    const t = setTimeout(() => {
      const el = body.current; if (!el) return;
      if (sheet) { el.scrollTop = el.scrollHeight; return; }
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 80);
    return () => clearTimeout(t);
  }, [th, busy, sheet]);
  // La hoja tapa la pantalla: sin scroll debajo mientras está abierta.
  useEffect(() => { if (!sheet) return; const o = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = o; }; }, [sheet]);

  const ir = (href: string, ms = 700) => setTimeout(() => router.push(href), ms);
  const fuenteDe = (r: TurnoOk): Fuente | null => r.fuente ? { label: E2("SEGÚN EL CENTRO DE AYUDA", "PER THE HELP CENTER"), href: r.fuente.href, titulo: L(r.fuente.titulo), slug: r.fuente.slug }
    : r.etiqueta ? { label: r.etiqueta } : r.fuenteCuenta ? { label: E2("SEGÚN TU CUENTA", "PER YOUR ACCOUNT") } : null;
  const qas = () => th.filter((b): b is { k: "qa"; t: string } => b.k === "qa").map((b) => b.t);
  // Lo que contestó el servidor (un turno o un paso): el mensaje, su fuente, la acción preparada, el caso o adónde ir.
  const mostrar = (r: TurnoOk & { ir?: string | null }, dicho: string[]) => {
    conv.current = r.conversacion;
    const b: Blq[] = [];
    if (r.aviso) b.push({ k: "sys", t: L(r.aviso).toUpperCase() });
    b.push({ k: "note", t: r.texto, src: fuenteDe(r) });
    if (r.accion?.tipo === "cancel_request") {
      const o = opSel.current, neg = r.accion.target.negocio ?? o?.negocio ?? "";
      b.push({ k: "act", t: E2("Cancelar la solicitud", "Cancel the request"), s: [neg, o && o.numero === r.accion.target.numero ? `${L(o.titulo)} · ${L(o.cuando)}` : r.accion.target.numero].filter(Boolean).join(" · "),
        retenido: o && o.numero === r.accion.target.numero ? o.retenido : null });
      setPend({ id: r.accion.id, negocio: neg });
    } else if (r.accion?.tipo === "open_screen") {
      b.push({ k: "abrir", id: r.accion.id, t: r.accion.target.numero ? `${E2("Abrir", "Open")} ${r.accion.target.numero}` : E2("Abrir Mi cuenta", "Open My account"), s: E2("Toca para abrirlo", "Tap to open it") });
    }
    if (r.persona) {
      const o = opSel.current;
      b.push({ k: "hand", caso: r.persona.caso, promesa: r.persona.promesa,
        lines: [o ? `${L(o.titulo)} · ${o.negocio}` : E2("Sin operación", "No transaction"), ...dicho.slice(-2).map((x) => `«${x}»`), E2("Tu conversación con El Compa", "Your conversation with El Compa")] });
    }
    if (r.chips.length) b.push({ k: "chips", items: r.chips });
    push(b);
    if (r.ir) ir(r.ir);
  };
  const fallo = (r: { msg: Bi; ir?: string | null; apagado?: true }) => { push([{ k: "note", t: L(r.msg) }]); if (r.apagado && r.ir) ir(r.ir, 1200); };

  const tocar = async (k: string, etiqueta: string, op?: OpHoja | null) => {
    if (busy || pend) return;
    if (op) opSel.current = op;
    push([{ k: "qa", t: etiqueta }]);
    setBusy(true);
    try {
      const r = await compaPaso(k, op?.numero ?? opSel.current?.numero ?? null, conv.current, sup);
      if (r.ok) mostrar(r, [...qas(), etiqueta]); else fallo(r);
    } catch { push([{ k: "note", t: E2("No se pudo. Prueba otra vez o habla con una persona.", "It didn't work. Try again or talk to a person.") }]); }
    finally { setBusy(false); }
  };
  const enviar = async (t0?: string) => {
    const t = String(t0 ?? txt).trim();
    if (!t || busy || pend) return;
    if (/^(con una persona|talk to a person)$/i.test(t)) return persona();
    push([{ k: "qa", t }]); setTxt(""); setBusy(true);
    try {
      const r = await compaTurno(t, conv.current, sheet ? op0?.numero ?? null : null);
      if (r.ok) mostrar(r, [...qas(), t]); else fallo(r);
    } catch { push([{ k: "note", t: E2("No se pudo. Prueba otra vez o habla con una persona.", "It didn't work. Try again or talk to a person.") }]); }
    finally { setBusy(false); }
  };
  const persona = () => tocar("persona", E2("Quiero hablar con una persona", "I want to talk to a person"), sheet ? op0 : null);
  const confirmar = async () => {
    if (!pend || busy) return;
    setBusy(true);
    try {
      const r = await compaConfirmar(pend.id);
      if (r.ok) push([{ k: "sys", t: L(r.linea ?? { es: `CANCELASTE LA SOLICITUD EN ${pend.negocio.toUpperCase()} · NO SE COBRÓ NADA`, en: `YOU CANCELLED THE REQUEST AT ${pend.negocio.toUpperCase()} · NOTHING WAS CHARGED` }) },
        { k: "note", t: E2("Listo. ¿Te ayudo con algo más?", "Done. Anything else?") }]);
      else push([{ k: "note", t: L(r.msg) }, ...(opSel.current ? [{ k: "ctx" as const, op: opSel.current }] : [])]);
      setPend(null);
      router.refresh();
    } finally { setBusy(false); }
  };
  const dejar = async () => {
    if (!pend || busy) return;
    setBusy(true);
    try { await compaDescartar(pend.id); push([{ k: "note", t: E2("Perfecto, la dejamos como está.", "Sure, we'll leave it as is.") }]); setPend(null); }
    finally { setBusy(false); }
  };
  const abrir = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try { const r = await compaConfirmar(id); if (r.ok && r.href) router.push(r.href); else if (!r.ok) push([{ k: "note", t: L(r.msg) }]); }
    finally { setBusy(false); }
  };
  const cerrar = () => router.replace(op0?.opHref ?? "/soporte");

  const deGrupo = (k: string) => (ops ?? []).filter((o) => k === "cita" ? o.grupo === "cita" || o.grupo === "evento" : o.grupo === k);
  const elegirTipo = (k: string, t: string) => {
    push([{ k: "qa", t }]);
    if (k === "pago") return push([{ k: "note", t: E2("¿Qué pasó con el pago?", "What happened with the payment?") }, { k: "pay" }]);
    if (k === "cuenta") return push([{ k: "note", t: E2("¿Qué quieres hacer con tu cuenta?", "What do you want to do with your account?") }, { k: "acct" }]);
    const Lx = deGrupo(k);
    if (!Lx.length) return push([{ k: "note", t: E2(`No veo ${k === "pedido" ? "pedidos" : k === "boleto" ? "boletos" : "citas ni reservaciones"} recientes en tu cuenta. Cuéntame qué pasó y lo vemos.`, `I don't see recent ${k === "pedido" ? "orders" : k === "boleto" ? "tickets" : "bookings"} on your account. Tell me what happened and we'll look into it.`) }]);
    if (Lx.length === 1) { opSel.current = Lx[0]!; return push([{ k: "ctx", op: Lx[0]! }, { k: "reasons", op: Lx[0]! }]); }
    push([{ k: "note", t: E2("¿Cuál?", "Which one?") }, { k: "oplist", ops: Lx }]);
  };

  const ultimo = th.length - 1;
  const vivo = (i: number) => i >= ultimo - 1 && !busy && !pend;
  const bloque = (b: Blq, i: number): ReactNode => {
    const on = vivo(i);
    switch (b.k) {
      case "sys": return <C.CompaSysLine key={i}>{b.t}</C.CompaSysLine>;
      case "qa": return <C.CompaUserMsg key={i}>{b.t}</C.CompaUserMsg>;
      case "note": return <C.CompaMsg key={i} source={b.src ? (b.src.href
        ? <a href={b.src.href} data-fuente={b.src.slug} style={{ color: "var(--tl-action)", textDecoration: "none" }}>{`${b.src.label} · ${(b.src.titulo ?? "").toUpperCase()}`}</a> : b.src.label) : undefined}>{b.t}</C.CompaMsg>;
      case "ctx": return <C.CompaSlot key={i}><C.RequestCard label={b.op.grupo === "pedido" ? E2("SOBRE ESTE PEDIDO", "ABOUT THIS ORDER") : E2("SOBRE ESTA OPERACIÓN", "ABOUT THIS ITEM")}
        tag={L(b.op.estado.l)} tone={b.op.estado.tone} title={`${b.op.negocio} · ${L(b.op.titulo)}`} sub={L(b.op.cuando)} onClick={() => router.push(b.op.opHref)} /></C.CompaSlot>;
      case "reasons": return <div key={i} data-razones={b.op.numero}><C.CompaSlot><C.HelpReasonList items={razones(b.op).map((r) => ({ label: L(r.l), sub: L(r.s), icon: r.icon,
        onClick: on ? () => tocar(r.k, L(r.l), b.op) : undefined }))} /></C.CompaSlot></div>;
      case "kinds": {
        const K: [string, string, string][] = [["cita", "calendar", E2("Una cita o reservación", "A booking or reservation")], ["pedido", "bag", E2("Un pedido", "An order")], ["boleto", "ticket", E2("Un boleto", "A ticket")],
          ["pago", "card", E2("Un pago o cobro", "A payment or charge")], ["cuenta", "users", E2("Mi cuenta", "My account")]];
        return <C.CompaSlot key={i} stack>{K.map(([k, ic, t]) => { const o = deGrupo(k)[0];
          return <C.OptionCard key={k} icon={ic} title={t} on={false} onClick={on ? () => elegirTipo(k, t) : undefined}
            sub={o ? `${o.negocio} · ${L(o.cuando)}` : k === "pago" ? E2("Cobros, devoluciones y tarjetas", "Charges, refunds and cards") : k === "cuenta" ? E2("Teléfono, ciudad y privacidad", "Phone, city and privacy")
              : k === "boleto" ? E2("Tus boletos de eventos", "Your event tickets") : E2("No hay recientes", "None recent")} />; })}</C.CompaSlot>;
      }
      case "oplist": return <C.CompaSlot key={i} stack>{b.ops.map((o) => <C.OptionCard key={o.numero} icon={o.grupo === "pedido" ? "bag" : o.grupo === "boleto" ? "ticket" : "calendar"} title={o.negocio}
        sub={`${L(o.titulo)} · ${L(o.cuando)}`} on={false} onClick={on ? () => { opSel.current = o; push([{ k: "ctx", op: o }, { k: "reasons", op: o }]); } : undefined} />)}</C.CompaSlot>;
      case "pay": return <C.CompaSlot key={i} stack>{([["pago_dup", "card", E2("Me cobraron dos veces", "I was charged twice")], ["pago_ref", "dollar", E2("No me llegó una devolución", "A refund didn't arrive")],
        ["pago_unk", "warning", E2("Un cobro que no reconozco", "A charge I don't recognize")]] as const).map(([k, ic, t]) =>
        <C.OptionCard key={k} icon={ic} title={t} sub={E2("Lo revisa una persona", "A person reviews it")} on={false} onClick={on ? () => { opSel.current = null; tocar(k, t); } : undefined} />)}</C.CompaSlot>;
      case "acct": return <C.CompaSlot key={i} stack>{([["cuenta_tel", "phone", E2("Cambiar mi teléfono", "Change my phone")], ["cuenta_ciudad", "pin", E2("Cambiar de ciudad", "Change city")],
        ["cuenta_priv", "lock", E2("Privacidad o borrar mi cuenta", "Privacy or delete my account")], ["cuenta_rob", "shield", E2("Alguien entró a mi cuenta", "Someone got into my account")]] as const).map(([k, ic, t]) =>
        <C.OptionCard key={k} icon={ic} title={t} sub={k === "cuenta_rob" ? E2("Te atiende una persona", "A person helps you") : E2("Te abro la pantalla", "I'll open the screen")} on={false}
          onClick={on ? () => { opSel.current = null; tocar(k, t); } : undefined} />)}</C.CompaSlot>;
      case "act": return <C.CompaActionCard key={i} active={!!pend} label={E2("ASÍ QUEDA", "HERE'S HOW IT ENDS UP")} title={b.t} sub={b.s} rows={[
        { k: E2("Cobro", "Charge"), v: "$0", c: "var(--tl-ink)" },
        { k: E2("Lo retenido", "Any hold"), v: b.retenido === false ? E2("No hay nada retenido", "Nothing is held") : E2("Retenido → Liberado", "Held → Released"), c: b.retenido === false ? "var(--tl-ink)" : "var(--tl-open-text)" },
        { k: E2("El negocio", "The business"), v: E2("Lo ve al instante", "Sees it right away"), c: "var(--tl-ink)" }]} />;
      case "abrir": return <C.CompaSlot key={i}><C.RequestCard label={E2("EL COMPA LO PREPARÓ", "EL COMPA PREPARED IT")} tag={E2("ABRIR", "OPEN")} tone="action" title={b.t} sub={b.s} onClick={on || !pend ? () => abrir(b.id) : undefined} /></C.CompaSlot>;
      case "hand": return <C.CompaHandoffCard key={i} title={E2("Tu caso pasó a Soporte", "Your case went to Support")} tag={b.caso}
        sub={E2(`Una persona te escribe ${b.promesa.es}. El equipo atiende de ${hor}.`, `A person writes to you ${b.promesa.en}. The team works ${hor}.`)}
        label={E2("LO QUE RECIBIÓ EL EQUIPO", "WHAT THE TEAM RECEIVED")} lines={b.lines} openLabel={E2("Ver mi caso", "See my case")} onOpen={() => router.push(`/soporte?caso=${encodeURIComponent(b.caso)}`)} />;
      case "chips": return <C.CompaChips key={i} items={b.items.map((l) => ({ l, onClick: on ? () => enviar(l) : undefined }))} />;
      case "entrar": return <C.CompaSlot key={i}><div style={{ display: "flex" }}><C.Button size="md" block icon="users" onClick={() => router.push(`/entrar?volver=${encodeURIComponent(sheet && op0 ? `${op0.ayudaHref ?? op0.opHref}` : "/soporte/compa")}`)}>{E2("Entrar", "Sign in")}</C.Button></div></C.CompaSlot>;
    }
  };
  const razones = (op: OpHoja): Razon[] => (op0 && op.numero === op0.numero && hoja ? hoja.razones : razonesCliente(op));

  const disc = <>{E2("EL COMPA ES UNA IA Y PUEDE EQUIVOCARSE. LO QUE MUEVE DINERO O CAMBIA TU CUENTA LO REVISA UNA PERSONA.", "EL COMPA IS AN AI AND CAN MAKE MISTAKES. ANYTHING THAT MOVES MONEY OR CHANGES YOUR ACCOUNT IS REVIEWED BY A PERSON.")}
    {" "}<a href="/ayuda/privacidad-de-el-compa" data-privacidad style={{ color: "var(--tl-action)", textDecoration: "none" }}>{E2("QUÉ VE Y QUIÉN LO LEE", "WHAT IT SEES AND WHO READS IT")}</a></>;
  const frame = (
    <C.CompaFrame mode={modo} desktop={desk} top={0} title={sheet ? "El Compa" : E2("Ayuda", "Help")} sub={sheet ? E2("ASISTENTE DE IA", "AI ASSISTANT") : E2("TE GUÍA EL COMPA · IA", "EL COMPA GUIDES YOU · AI")}
      onClose={cerrar} onBack={() => router.push("/soporte")} personLabel={E2("Con una persona", "Talk to a person")} person2Label={E2("Hablar con una persona", "Talk to a person")}
      onPerson={() => { if (!busy && !pend && conSesion) persona(); else if (!conSesion) router.push(`/entrar?volver=${encodeURIComponent("/soporte/compa")}`); }}
      disclaimer={disc} bodyRef={body}
      confirm={pend ? { note: E2("EL COMPA LO PREPARÓ · CONFÍRMALO TÚ", "EL COMPA PREPARED IT · YOU CONFIRM"), okLabel: E2("Sí, cancelar la solicitud", "Yes, cancel the request"), noLabel: E2("No, dejarla", "No, keep it"), onOk: confirmar, onNo: dejar } : null}
      composer={pend || !conSesion ? null : { value: txt, placeholder: E2("O escríbelo con tus palabras", "Or type it in your own words"), onChange: (e: { target: { value: string } }) => setTxt(e.target.value.slice(0, 800)),
        onKeyDown: (e: { key: string }) => { if (e.key === "Enter") enviar(); }, onSend: () => enviar(), canSend: !!(txt.trim() && !busy) }}>
      {th.map(bloque)}
      {busy ? <C.CompaTyping /> : null}
    </C.CompaFrame>
  );
  if (!sheet) return <div data-pantalla="APP-COMPA" data-screen-label={`APP-COMPA · pasos guiados (2at) · ${desk ? "desktop" : "móvil"}`} className="bg-paper">{frame}</div>;
  // 2as: la hoja va sobre la operación. Escritorio: panel de 420 a la derecha, de arriba abajo.
  return (
    <div data-pantalla="APP-COMPA-HOJA" data-hoja-compa data-screen-label={`El Compa · hoja de ayuda (2as) · ${desk ? "desktop" : "móvil"}`} className="fixed inset-0 z-[96]">
      {desk ? <style>{"[data-hoja-compa]>div>div:nth-child(2){height:auto!important;bottom:0}"}</style> : null}
      {frame}
    </div>
  );
}

/* Las razones de una operación elegida en los pasos guiados vienen del servidor con la lista (ops); esta es la misma regla para pintarlas
   (la elección la vuelve a decidir el servidor en compaPaso). */
function razonesCliente(op: OpHoja): Razon[] { return op.razones ?? []; }
