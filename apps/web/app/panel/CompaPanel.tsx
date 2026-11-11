"use client";
/* 7e · Panel › El Compa (DASH-COMPA; Panel negocio v2 cpaBlocks L1129): el asistente de IA que explica el panel y lleva a la sección. Compuesto con
   los bloques del panel, como el prototipo: cabecera, la nota fija de IA, PREGÚNTALE SOBRE TU PANEL con el hilo (la persona a la derecha, El
   Compa a la izquierda con su rótulo «EL COMPA · IA» y la fuente), «Ir a {sección}» (solo una sección que esa persona puede abrir: lo decide el
   servidor), «Tu caso pasó a Soporte», chips (de partes que sí tiene), TU PREGUNTA, Preguntar · Empezar de nuevo · «Con una persona» (siempre).
   Apagado o al tope: la nota «El Compa no está disponible ahora» y Ayuda y Soporte (nada más se rompe). Las respuestas automáticas a clientes
   (Pro) llegan en 7f: hoy la sección es solo el asistente. La pantalla no decide nada: todo lo dice el servidor (lib/compa).
   7f · RESPUESTAS AUTOMÁTICAS (cpaBlocks L1129–1160): solo para el dueño o quien lleva Mensajes (lo decide el servidor: auto.puede). Free → lock
   con «Ver Pro»; Pro → «El Compa contesta por ti» (interruptor), CUÁNDO (fuera de tu horario), DE QUÉ PUEDE HABLAR, POR DÓNDE (el chat de
   To'Latino), las reglas fijas (verbatim), LO QUE EL COMPA DEBE SABER (≤ 400, con «Traducir» del traductor propio), PRUÉBALO COMO CLIENTE y
   LO QUE CONTESTÓ EL COMPA · N · TE PASÓ N. «To'Latino apagó las respuestas automáticas…» si el Super Admin lo apagó aquí. Las respuestas
   automáticas no dependen del asistente: salen aunque el asistente del panel esté en pausa. */
import { ctaPro } from "./pro-cta";
import type { PanelBloqueT as Bloque } from "@tolatino/ui";
import type { CpaPanel } from "@/lib/compa/asistente-panel";
import type { AutoPanel } from "@/lib/compa/respuesta-auto";
import { compaAutoGuardar, compaAutoProbar, compaAutoTraducir, compaPanelIr, compaPanelNuevo, compaPanelPersona, compaPanelPreguntar } from "./acciones-compa";
import type { Ctx, Sec } from "./Panel";

export type { AutoPanel, CpaPanel };

export function compaBloques(c: Ctx): Sec {
  const { E2, d } = c, x = c.cpa ?? null, sop = `/soporte?negocio=${encodeURIComponent(d.id)}`;
  const out: (Bloque | null)[] = [
    { type: "head", t: "El Compa", s: E2("El asistente de IA de To’Latino. Te explica tu panel y, con Pro, contesta a tus clientes cuando tú no puedes.", "To’Latino’s AI assistant. It explains your dashboard and, with Pro, replies to your clients when you can’t.") },
  ];
  if (!x || !x.on) {
    out.push({ type: "note", tone: "warn", icon: "info", t: x
      ? E2(`El Compa no está disponible ahora. Si necesitas ayuda, escríbele a Soporte: te contesta una persona del equipo, ${x.horario}.`, `El Compa is not available right now. If you need help, write to Support: a person on the team answers, ${x.horario}.`)
      : E2("El Compa no está disponible ahora. Si necesitas ayuda, escríbele a Soporte: te contesta una persona del equipo.", "El Compa is not available right now. If you need help, write to Support: a person on the team answers."),
      cta: E2("Ayuda y Soporte", "Help and Support"), onCta: () => window.location.assign(sop) });
    out.push(...autoBloques(c));
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
  out.push(...autoBloques(c));
  return { blocks: out, ed: null };
}

/* 7f · Respuestas automáticas (Pro). Todo lo decide el servidor (lib/compa/respuesta-auto ajustesAuto: Pro AHORA, quién puede, la pausa de
   To'Latino); la pantalla solo muestra y pide. */
const TEMA_L: Record<string, [string, string]> = { hours: ["Horario y dirección", "Hours and address"], menu: ["Menú, servicios y precios", "Menu, services and prices"], how_to_order: ["Cómo pedir o reservar", "How to order or book"], faq: ["Tus preguntas frecuentes", "Your FAQ"] };
function hace(c: Ctx, iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000), E2 = c.E2;
  return min < 1 ? E2("AHORA", "NOW") : min < 60 ? E2(`HACE ${min} MIN`, `${min} MIN AGO`) : min < 1440 ? E2(`HACE ${Math.floor(min / 60)} H`, `${Math.floor(min / 60)} H AGO`) : E2(`HACE ${Math.floor(min / 1440)} D`, `${Math.floor(min / 1440)} D AGO`);
}
function autoBloques(c: Ctx): Bloque[] {
  const { E2, d, es } = c, a = c.cpaAuto;
  if (!a || !a.puede) return [];
  const out: Bloque[] = [{ type: "group", k: E2("RESPUESTAS AUTOMÁTICAS", "AUTO-REPLIES") }];
  if (!a.pro) {
    out.push({ type: "lock", t: E2("El Compa contesta a tus clientes cuando tú no puedes", "El Compa replies to your clients when you can’t"),
      s: E2("Horario, dirección, menú y cómo pedir, con los datos de tu página. Siempre dice que es IA y lo que no sabe te lo pasa.", "Hours, address, menu and how to order, from your page. It always says it’s AI and passes on what it doesn’t know."),
      ...ctaPro(c, E2("Ver Pro", "See Pro")) });
    return out;
  }
  const sop = `/soporte?negocio=${encodeURIComponent(d.id)}`;
  if (a.apagadoPor) out.push({ type: "note", tone: "danger", icon: "ban", t: E2(`To’Latino apagó las respuestas automáticas de tu negocio (${a.apagadoPor.motivo}). Si crees que es un error, escríbele a Soporte.`, `To’Latino turned off auto-replies for your business (${a.apagadoPor.motivo}). If you think it’s a mistake, write to Support.`),
    cta: E2("Ayuda y Soporte", "Help and Support"), onCta: () => window.location.assign(sop) });
  const encender = (on: boolean) => {
    if (on && a.apagadoPor) { c.toast(E2("Lo apagó To’Latino. Escríbele a Soporte.", "Turned off by To’Latino. Write to Support.")); return; }
    c.run(() => compaAutoGuardar(d.id, { enabled: on }), on ? E2("Encendido. Contesta fuera de tu horario.", "On. It replies when you are closed.") : E2("Apagado. Ya no contesta por ti.", "Off. It no longer replies for you."));
  };
  out.push({ type: "rows", items: [{ key: "on", icon: "chat", t: E2("El Compa contesta por ti", "El Compa replies for you"),
    s: a.enabled && !a.apagadoPor ? (a.nivelOn ? E2("Encendido · fuera de tu horario", "On · when you are closed") : E2("Encendido, pero El Compa no está contestando ahora: tus clientes reciben tu respuesta de siempre.", "On, but El Compa is not replying right now: your clients get your usual reply."))
      : E2("Apagado. Tus clientes esperan tu respuesta.", "Off. Clients wait for your reply."),
    tgOn: a.enabled && !a.apagadoPor, onTg: () => encender(!a.enabled) }] });
  if (!a.enabled || a.apagadoPor) { out.push(...registro(c, a)); return out; }
  out.push(
    { type: "chips", k: E2("CUÁNDO CONTESTA", "WHEN IT REPLIES"), items: [{ l: E2("Fuera de tu horario", "When you are closed"), v: "selected" }] },
    { type: "chips", k: E2("DE QUÉ PUEDE HABLAR", "WHAT IT CAN TALK ABOUT"), help: E2("Lo demás te lo pasa a ti.", "Anything else it passes to you."), items: Object.keys(TEMA_L).map((k) => {
      const has = a.temas.includes(k as AutoPanel["temas"][number]);
      return { l: TEMA_L[k]![es ? 0 : 1], v: has ? "selected" : "filter", onClick: () => {
        if (has && a.temas.length === 1) { c.toast(E2("Deja al menos un tema.", "Keep at least one topic.")); return; }
        c.run(() => compaAutoGuardar(d.id, { temas: has ? a.temas.filter((x) => x !== k) : [...a.temas, k] }), E2("Guardado.", "Saved."));
      } };
    }) },
    // 7h · POR DÓNDE: el chat siempre; WhatsApp y SMS solo con el número del negocio conectado a To'Latino (lo conecta el equipo; sin número, apagados).
    { type: "rows", k: E2("POR DÓNDE", "WHERE"), items: [{ key: "app", icon: "chat", t: E2("Chat de To’Latino", "To’Latino chat"), s: E2("En tu página y en Mensajes.", "On your page and in Messages."), tag: E2("ENCENDIDO", "ON"), tone: "signal", chev: false },
      ...(["whatsapp", "sms"] as const).map((k) => { const on = a.canales.includes(k), con = a.conectados[k], L = k === "whatsapp" ? "WhatsApp" : "SMS";
        return { key: k, icon: "phone", t: L, chev: false,
          s: !con ? E2(`Sin tu número de ${L} conectado a To’Latino. Para conectarlo, escríbele a Soporte.`, `Your ${L} number is not connected to To’Latino. To connect it, write to Support.`)
            : E2(`A tu número de ${L}. Lo que El Compa no contesta lo ves en tu ${k === "whatsapp" ? "WhatsApp" : "teléfono"}, como siempre.`, `To your ${L} number. What El Compa doesn’t answer you see on your ${k === "whatsapp" ? "WhatsApp" : "phone"}, as always.`),
          ...(con ? { tgOn: on, onTg: () => c.run(() => compaAutoGuardar(d.id, { canales: on ? a.canales.filter((x) => x !== k) : [...a.canales, k] }), on ? E2(`${L} apagado.`, `${L} off.`) : E2(`${L} encendido.`, `${L} on.`)) }
            : { tag: E2("SIN NÚMERO", "NO NUMBER"), tone: "neutral" }) }; })] },
    { type: "note", tone: "ink", icon: "shield", t: E2("Siempre dice que es IA. Nunca confirma citas ni pedidos, no da descuentos ni cambia precios, no mueve dinero y no comparte tu teléfono. Si se lo piden, te lo pasa y sale en Mensajes.",
      "It always says it’s AI. It never confirms bookings or orders, gives discounts, changes prices, moves money or shares your phone. If asked, it passes it to you and it shows in Messages.") },
  );
  const FN = c.form("cpa:nota", { es: a.nota.es, en: a.nota.en });
  out.push(
    { type: "field", k: E2("LO QUE EL COMPA DEBE SABER", "WHAT EL COMPA SHOULD KNOW"), val: FN.d.es, area: true, rows: 3, max: 400, count: `${FN.d.es.length}/400`,
      ph: E2("Ej.: Los sábados hay sancocho desde las 12.", "E.g. Sancocho on Saturdays from 12."),
      help: E2("Ya lee tu página: horario, dirección, lo que ofreces con sus precios y tus preguntas frecuentes. No escribas teléfonos ni promesas.", "It already reads your page: hours, address, what you offer with prices and your FAQ. Don’t write phone numbers or promises."),
      onChange: (v: string) => FN.set({ es: v.slice(0, 400) }) },
    { type: "group", k: E2("EN INGLÉS · OPCIONAL", "IN ENGLISH · OPTIONAL"), link: FN.d.es.trim() ? E2("Traducir", "Translate") : undefined,
      onLink: () => c.run(() => compaAutoTraducir(d.id, FN.d.es), E2("Traducido. Revísalo antes de guardar.", "Translated. Check it before saving."), (r: { en?: string }) => { if (typeof r.en === "string") FN.set({ en: r.en }); }) },
    { type: "field", k: E2("LO QUE EL COMPA DEBE SABER · INGLÉS", "WHAT EL COMPA SHOULD KNOW · ENGLISH"), val: FN.d.en, area: true, rows: 2, max: 400, count: `${FN.d.en.length}/400`, onChange: (v: string) => FN.set({ en: v.slice(0, 400) }) },
    { type: "acts", items: [{ l: E2("Guardar nota", "Save note"), v: "primary", icon: "check", off: !FN.dirty || c.pending, onClick: () => c.run(() => compaAutoGuardar(d.id, { nota: FN.d }), E2("Guardado. El Compa ya lo sabe.", "Saved. El Compa knows it now.")) }] },
  );
  // Pruébalo como cliente: la respuesta de AHORA con tus ajustes (no sale en Mensajes ni en tu registro).
  const T = (c.ui.cpaTest as { t: string; mine?: boolean; soft?: boolean; m?: string }[] | undefined) ?? [], probando = c.pending && c.ui.cpaTestQ;
  const probar = (q: string) => {
    const v = q.trim();
    if (!v || c.pending) return;
    c.setUi({ cpaTestQ: v });
    c.run(() => compaAutoProbar(d.id, v, (c.ui.cpaTestConv as string | undefined) ?? null), undefined, (r: { texto?: string; pasa?: boolean; conversacion?: string; etiqueta?: string | null }) => {
      c.setUi({ cpaTestQ: null, cpaTestConv: r.conversacion ?? null, cpaTest: [...T, { t: v, mine: true }, { t: r.texto ?? "", soft: true, m: `EL COMPA · IA${r.etiqueta ? ` · ${r.etiqueta}` : ""}${r.pasa ? E2(" · TE LO PASARÍA", " · WOULD PASS IT TO YOU") : ""}` }] });
      FT.set({ txt: "" });
    });
  };
  const FT = c.form("cpa:test", { txt: "" });
  out.push({ type: "group", k: E2("PRUÉBALO COMO CLIENTE", "TRY IT AS A CLIENT") });
  const items = [...T, ...(probando ? [{ t: String(c.ui.cpaTestQ), mine: true }, { t: E2("El Compa está escribiendo…", "El Compa is typing…"), soft: true }] : [])];
  if (items.length) out.push({ type: "thread", items });
  else out.push({ type: "note", tone: "info", icon: "info", t: E2("Escribe como si fueras un cliente y mira qué contestaría. La prueba no sale en Mensajes.", "Write as if you were a client and see what it would reply. The test does not show in Messages.") });
  if (!probando) out.push({ type: "chips", items: [E2("¿A qué hora abren mañana?", "What time do you open tomorrow?"), E2("¿Me hacen un descuento?", "Can I get a discount?"), E2("¿Cómo hago un pedido?", "How do I order?")].map((q) => ({ l: q, v: "filter", onClick: () => probar(q) })) });
  out.push(
    { type: "field", k: E2("LO QUE ESCRIBE EL CLIENTE", "WHAT THE CLIENT WRITES"), val: FT.d.txt, max: 200, ph: E2("Escribe como si fueras un cliente…", "Write as if you were a client…"), onChange: (v: string) => FT.set({ txt: v.slice(0, 200) }) },
    { type: "acts", items: [{ l: E2("Ver qué contesta", "See the reply"), v: "secondary", icon: "chat", off: !FT.d.txt.trim() || c.pending, onClick: () => probar(FT.d.txt) },
      ...(T.length ? [{ l: E2("Borrar prueba", "Clear test"), v: "secondary", icon: null, onClick: () => c.setUi({ cpaTest: [], cpaTestConv: null }) }] : [])] },
  );
  out.push(...registro(c, a));
  return out;
}
function registro(c: Ctx, a: AutoPanel): Bloque[] {
  const { E2 } = c;
  if (!a.registro.length) return [];
  return [{ type: "rows", k: `${E2("LO QUE CONTESTÓ EL COMPA · ", "WHAT EL COMPA ANSWERED · ")}${a.contesto}${a.paso ? E2(` · TE PASÓ ${a.paso}`, ` · PASSED TO YOU ${a.paso}`) : ""}`,
    items: a.registro.map((x) => ({ key: x.id, icon: x.paso ? "users" : "chat", t: `${x.quien}: «${x.q}»`, s: `El Compa: ${x.a}`, m: hace(c, x.at), tag: x.paso ? E2("TE LO PASÓ", "PASSED TO YOU") : null, tone: "action", chev: false })) }];
}
