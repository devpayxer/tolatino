"use client";
/* 7e · Panel › El Compa (DASH-COMPA; Panel negocio v2 cpaBlocks L1129): el asistente de IA que explica el panel y lleva a la sección. Compuesto con
   los bloques del panel, como el prototipo: cabecera, la nota fija de IA, PREGÚNTALE SOBRE TU PANEL con el hilo (la persona a la derecha, El
   Compa a la izquierda con su rótulo «EL COMPA · IA» y la fuente), «Ir a {sección}» (solo una sección que esa persona puede abrir: lo decide el
   servidor), «Tu caso pasó a Soporte», chips (de partes que sí tiene), TU PREGUNTA, Preguntar · Empezar de nuevo · «Con una persona» (siempre).
   Apagado o al tope: la nota «El Compa no está disponible ahora» y Ayuda y Soporte (nada más se rompe). Las respuestas automáticas a clientes
   (Pro) llegan en 7f: hoy la sección es solo el asistente. La pantalla no decide nada: todo lo dice el servidor (lib/compa). */
import type { PanelBloqueT as Bloque } from "@tolatino/ui";
import type { CpaPanel } from "@/lib/compa/asistente-panel";
import { compaPanelIr, compaPanelNuevo, compaPanelPersona, compaPanelPreguntar } from "./acciones-compa";
import type { Ctx, Sec } from "./Panel";

export type { CpaPanel };

export function compaBloques(c: Ctx): Sec {
  const { E2, d } = c, x = c.cpa ?? null, sop = `/soporte?negocio=${encodeURIComponent(d.id)}`;
  const out: (Bloque | null)[] = [
    { type: "head", t: "El Compa", s: E2("El asistente de IA de To’Latino. Te explica tu panel y te lleva a la sección donde se hace cada cosa.", "To’Latino’s AI assistant. It explains your dashboard and takes you to the section where each thing is done.") },
  ];
  if (!x || !x.on) {
    out.push({ type: "note", tone: "warn", icon: "info", t: x
      ? E2(`El Compa no está disponible ahora. Si necesitas ayuda, escríbele a Soporte: te contesta una persona del equipo, ${x.horario}.`, `El Compa is not available right now. If you need help, write to Support: a person on the team answers, ${x.horario}.`)
      : E2("El Compa no está disponible ahora. Si necesitas ayuda, escríbele a Soporte: te contesta una persona del equipo.", "El Compa is not available right now. If you need help, write to Support: a person on the team answers."),
      cta: E2("Ayuda y Soporte", "Help and Support"), onCta: () => window.location.assign(sop) });
    return { blocks: out, ed: null };
  }
  const h = x.hilo, pend = c.pending && typeof c.ui.cpaQ === "string" ? (c.ui.cpaQ as string) : null;
  out.push(
    { type: "note", tone: "info", icon: "info", t: E2(`El Compa es una IA. No cambia nada en tu panel: te dice dónde se hace y te lleva. Lo de dinero o tu cuenta lo ve una persona del equipo, ${x.horario}.`,
      `El Compa is an AI. It changes nothing in your dashboard: it tells you where things are and takes you there. Money or account issues go to a person on the team, ${x.horario}.`) },
    { type: "group", k: E2("PREGÚNTALE SOBRE TU PANEL", "ASK ABOUT YOUR DASHBOARD") },
  );
  const items: { t: string; mine?: boolean; soft?: boolean; m?: string }[] = (h?.msjs ?? []).map((m) => m.de === "user" ? { t: m.t, mine: true }
    : { t: m.t, soft: true, m: `EL COMPA · ${m.motor === "reglas" ? E2("SIN IA", "NO AI") : "IA"}${m.etiqueta ? ` · ${m.etiqueta}${m.fuente ? ` · ${(c.es ? m.fuente.titulo.es : m.fuente.titulo.en).toUpperCase()}` : ""}` : ""}` });
  if (pend) items.push({ t: pend, mine: true }, { t: E2("El Compa está escribiendo…", "El Compa is typing…"), soft: true });
  if (items.length) out.push({ type: "thread", items });
  const ult = h?.msjs.length ? h.msjs[h.msjs.length - 1]! : null;
  if (ult && ult.de === "compa" && !pend) {
    if (h!.ir) out.push({ type: "acts", items: [{ l: `${E2("Ir a ", "Go to ")}${h!.ir.titulo}`, v: "primary", icon: "right", off: c.pending,
      onClick: () => c.run(() => compaPanelIr(d.id, h!.ir!.id), undefined, (r: { href?: string }) => { if (r.href) c.nav(r.href); }) }] });
    if (ult.fuente) out.push({ type: "rows", items: [{ icon: "help", t: c.es ? ult.fuente.titulo.es : ult.fuente.titulo.en, s: E2("SEGÚN EL CENTRO DE AYUDA · leer el artículo", "PER THE HELP CENTER · read the article"),
      onClick: () => window.open(`/ayuda/${ult.fuente!.slug}`, "_blank", "noopener") }] });
    if (h!.caso) out.push({ type: "note", tone: "warn", icon: "users", t: E2(`Tu caso pasó a Soporte · ${h!.caso}. Te escribe una persona del equipo, ${x.horario}.`, `Your case went to Support · ${h!.caso}. A person on the team writes to you, ${x.horario}.`),
      cta: E2("Ver mi caso", "See my case"), onCta: () => window.location.assign(`/soporte?caso=${encodeURIComponent(h!.caso!)}&negocio=${encodeURIComponent(d.id)}`) });
  }
  const F = c.form("cpa:q", { txt: "" }), t = F.d.txt;
  const preguntar = (q: string) => { const v = q.trim(); if (!v || c.pending) return; c.setUi({ cpaQ: v }); c.run(() => compaPanelPreguntar(d.id, v, h?.conversacion ?? null), undefined, () => { F.set({ txt: "" }); c.setUi({ cpaQ: null }); }); };
  if (!pend && x.chips.length) out.push({ type: "chips", items: x.chips.map((q) => ({ l: q, v: "filter", onClick: () => preguntar(q) })) });
  out.push(
    { type: "field", k: E2("TU PREGUNTA", "YOUR QUESTION"), val: t, area: true, rows: 2, max: 400, count: `${t.length}/400`, ph: E2("Escribe con tus palabras…", "Type in your own words…"), onChange: (v: string) => F.set({ txt: v.slice(0, 400) }) },
    { type: "acts", items: [
      { l: E2("Preguntar", "Ask"), v: "primary", icon: "chat", off: !t.trim() || c.pending, onClick: () => preguntar(t) },
      { l: E2("Con una persona", "Talk to a person"), v: "secondary", icon: "users", off: c.pending, onClick: () => { c.setUi({ cpaQ: E2("Quiero hablar con una persona", "I want to talk to a person") }); c.run(() => compaPanelPersona(d.id, h?.conversacion ?? null), undefined, () => c.setUi({ cpaQ: null })); } },
      ...(h ? [{ l: E2("Empezar de nuevo", "Start over"), v: "secondary", icon: null, off: c.pending, onClick: () => c.run(() => compaPanelNuevo(d.id)) }] : []),
    ] },
  );
  return { blocks: out, ed: null };
}
