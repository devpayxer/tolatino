"use client";
/* 7c · Super Admin › El Compa (Super Admin.dc.html secCompa, pestaña «Interruptores» + el tope compuesto del hueco #3 de fase7-compa.md:
   el gasto del mes con su barra y sus cifras (rvsum), POR NIVEL, POR CANAL y REGLAS FIJAS como en el diseño, más POR CIUDAD y POR NEGOCIO,
   los modelos (kv) y el HISTORIAL). «Conversaciones» en solo lectura: cifras (kpis), chips DÓNDE y RESULTADO, la lista (AdminList) con
   cursor. Pausar, levantar y cambiar el tope piden motivo (ConfirmarMotivo, patrón 2ao) y quedan en la auditoría. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { DatosCompaAdmin } from "@/lib/compa/admin-compa";
import { compaInterruptor, compaLevantar, compaPausarEn, compaTope } from "./acciones-compa";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList", ComponentType<any>>;
const NIVEL: Record<string, [string, string]> = {
  neighbor: ["Vecinos", "Apagado: la ayuda de cada operación abre el formulario de siempre y Soporte dice «Escríbenos»."],
  owner: ["Panel del negocio", "Apagado: el panel muestra el aviso y lleva a Soporte."],
  auto_reply: ["Respuestas automáticas", "Apagado para todos: los clientes esperan al dueño. Por negocio, abajo."],
  copilot: ["Copiloto", "Apagado: Soporte responde solo con macros."],
};
const CANAL: Record<string, [string, string, string]> = {
  app: ["Chat de To'Latino", "App y web.", "chat"],
  whatsapp: ["WhatsApp", "La acción se confirma con un enlace a la app.", "phone"],
  sms: ["SMS", "La acción se confirma con un enlace a la app.", "phone"],
};
const RESULTADO: Record<string, [string, string]> = { open: ["ABIERTA", "neutral"], self_resolved: ["RESOLVIÓ SOLO", "neutral"], action_done: ["ACCIÓN CONFIRMADA", "signal"], handed_off: ["A UNA PERSONA", "action"], to_owner: ["AL DUEÑO", "action"] };
const MOTIVO: Record<string, string> = { money: "dinero", account: "cuenta", safety: "seguridad", asked_person: "lo pidió", unknown: "no supo", owner: "dueño" };
const SUP: Record<string, string> = { support_page: "Soporte", help_sheet: "Hoja de ayuda", panel: "Panel", business_chat: "Chat del negocio", ticket: "Caso" };
const MOTOR: Record<string, string> = { claude: "Claude (con la llave del entorno)", simulador: "Simulador del sandbox (todavía sin llave de Anthropic)", reglas: "Reglas fijas (sin IA)" };
const ACCION: Record<string, string> = { "compa.pausar": "Pausó", "compa.encender": "Encendió", "compa.pausar_en": "Pausó", "compa.levantar": "Levantó la pausa", "config.cambiar": "Cambió" };
const plata = (c: number) => `$${(c / 100).toFixed(c > 0 && c < 1 ? 4 : 2)}`;
const cuando = (iso: string | null) => (iso ? new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "") : "—");
const valores = (o: Record<string, string> | null) => (o ? Object.values(o).join(" · ") : "");
const pares = (o: Record<string, string> | null) => (o ? Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(" · ") : "");
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesL = (m: string) => { const [a, b] = m.split("-"); return `${MESES[Number(b) - 1] ?? b} de ${a}`; };

export function ElCompaAdmin({ d, tab, uso, res, antes, cambiar }: { d: DatosCompaAdmin; tab: "ctl" | "conv"; uso: string | null; res: string | null; antes: string | null; cambiar: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo."); setConf(null); router.refresh(); };
  const ir = (p: { tab?: string; uso?: string | null; res?: string | null; antes?: string | null }) => {
    const x = new URLSearchParams(), t = p.tab ?? tab, u = p.uso !== undefined ? p.uso : uso, r = p.res !== undefined ? p.res : res;
    if (t !== "ctl") x.set("tab", t); if (t === "conv" && u) x.set("uso", u); if (t === "conv" && r) x.set("res", r); if (p.antes) x.set("antes", p.antes);
    router.push(x.size ? `/admin/compa?${x}` : "/admin/compa", { scroll: false });
  };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "EL COMPA · INTERRUPTORES Y TOPE", t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );
  const I = d.interruptores, g = d.gasto;
  const pausados = [...I.niveles.filter((x) => !x.on).map((x) => NIVEL[x.uso]![0]), ...I.canales.filter((x) => !x.on).map((x) => CANAL[x.canal]![0]), ...I.pausas.map((p) => p.nombre || p.donde)];
  const sinPermiso = () => setToast("Tu rol no cambia interruptores.");
  const tgNivel = (clave: string, on: boolean, l: string) => !cambiar ? sinPermiso() : setConf(on
    ? { titulo: `Poner en pausa: ${l}`, peligro: true, cta: "Poner en pausa", sub: "Mientras esté en pausa, la gente ve el camino de siempre (formularios y Soporte con personas). Queda en el historial.",
      plantillas: ["Respuestas incorrectas: lo revisamos.", "Gasto fuera de lo normal.", "Mantenimiento."], hacer: (m) => compaInterruptor(clave, false, m) }
    : { titulo: `Encender: ${l}`, cta: "Encender", sub: "El Compa vuelve a contestar aquí desde el mensaje siguiente.", plantillas: ["Revisado: ya está bien.", "Fin del mantenimiento."], hacer: (m) => compaInterruptor(clave, true, m) });
  const NIV_OPC = { label: "QUÉ SE PAUSA", items: [{ k: "todo", l: "Todo El Compa" }, ...Object.entries(NIVEL).map(([k, v]) => ({ k, l: v[0] }))] };
  const pausarCiudad = (id: string, nombre: string) => !cambiar ? sinPermiso() : setConf({ titulo: `Pausar El Compa en ${nombre}`, peligro: true, cta: "Pausar aquí", elegir: NIV_OPC,
    sub: "En esa ciudad la gente ve el camino de siempre. Queda en el historial.", plantillas: ["Problema con la ayuda de esta ciudad.", "Mantenimiento."],
    hacer: (m, e) => compaPausarEn("city", id, e === "todo" ? "" : e ?? "", m) });
  const pausarNegocio = () => !cambiar ? sinPermiso() : setConf({ titulo: "Pausar El Compa en un negocio", peligro: true, cta: "Pausar en ese negocio", elegir: NIV_OPC, valor: { k: "NEGOCIO (ID O NOMBRE EXACTO)", ini: "", max: 80 },
    sub: "Por ejemplo las respuestas automáticas de un negocio que reportan. Queda en el historial.", plantillas: ["Reportaron respuestas incorrectas.", "Lo pidió el dueño por Soporte."],
    hacer: (m, e, v) => compaPausarEn("business", v, e === "todo" ? "" : e ?? "", m) });
  const levantar = (id: string, nombre: string) => !cambiar ? sinPermiso() : setConf({ titulo: `Levantar la pausa · ${nombre}`, cta: "Levantar", sub: "El Compa vuelve a contestar ahí.",
    plantillas: ["Revisado: ya está bien.", "Fin del mantenimiento."], hacer: (m) => compaLevantar(id, m) });
  const tope = () => !cambiar ? sinPermiso() : setConf({ titulo: "Cambiar el tope del mes", cta: "Guardar el tope", valor: { k: "TOPE AL MES (EN DÓLARES)", ini: (g.tope / 100).toFixed(0), max: 9 },
    sub: `Hoy: ${plata(g.tope)} al mes (gastado ${plata(g.gastado)}). Al tope, El Compa contesta con reglas fijas y ofrece «Con una persona». Entre $0 y $10,000. Queda en la auditoría.`,
    plantillas: ["Más vecinos usan El Compa.", "Bajar el gasto este mes."], hacer: (m, _e, v) => compaTope(v, m) });

  const alTope = !!g.topeEn || g.pct >= 100, aviso = g.pct >= g.alertaPct;
  const porNivel = new Map(g.porNivel.map((x) => [x.uso, x]));
  const B: Bloque[] = [
    { type: "head", eye: "OPERAR", t: "El Compa · IA", s: "Lo que contesta El Compa a vecinos y negocios, cuánto gasta y dónde está encendido. Nunca mueve dinero ni cambia cuentas: eso llega a Soporte con el resumen.", h1: desk ? 26 : 22 },
    ...(I.candado ? [{ type: "note" as const, tone: "warn" as const, t: "Producción: El Compa queda apagado hasta que se encienda todo (fase 9), aunque los interruptores digan otra cosa." }] : []),
    ...(pausados.length ? [{ type: "note" as const, tone: "warn" as const, t: `En pausa: ${pausados.join(" · ")}.` }] : []),
    { type: "tabs", items: [{ l: "Interruptores y tope", n: pausados.length ? String(pausados.length) : undefined, on: tab === "ctl", onClick: () => ir({ tab: "ctl" }) },
      { l: "Conversaciones", n: d.conv.total7d ? String(d.conv.total7d) : undefined, on: tab === "conv", onClick: () => ir({ tab: "conv" }) }] },
  ];
  if (tab === "ctl") {
    B.push(
      { type: "rvsum", icon: "wallet", t: "Gastado este mes", s: `${mesL(g.mes)} · vuelve a cero el día 1 (hora del este)`, tag: alTope ? "AL TOPE" : aviso ? `${g.pct} %` : "DENTRO DEL TOPE", tone: alTope ? "danger" : aviso ? "warn" : "signal",
        progT: `${plata(g.gastado)} de ${plata(g.tope)}`, progR: `${g.pct} %`, pct: `${Math.min(100, g.pct)}%`, barC: alTope ? "var(--tl-danger)" : aviso ? "var(--tl-pro)" : "var(--tl-action)",
        stats: [{ k: "TOPE", v: plata(g.tope), s: "al mes" }, { k: "AVISO", v: `${g.alertaPct} %`, s: g.alertaEn ? `avisado ${cuando(g.alertaEn)}` : "al equipo Admin" }, { k: "EN CURSO", v: plata(g.reservado), s: "reservado ahora" }],
        tools: cambiar ? [{ l: "Cambiar el tope", icon: "edit", onClick: tope }] : [] },
      { type: "note", tone: alTope ? "danger" : "info", t: alTope ? "Al tope: El Compa contesta con reglas fijas y ofrece «Con una persona» hasta el mes que viene o hasta que subas el tope. Nada se rompe."
        : "Al tope, El Compa contesta con reglas fijas y ofrece «Con una persona». Nada se rompe: la ayuda, Soporte, los pedidos y los pagos siguen igual." },
      { type: "group", k: "POR NIVEL" },
      { type: "rows", items: I.niveles.map((x) => { const n = porNivel.get(x.uso), l = NIVEL[x.uso]![0]; return { key: x.uso, icon: "help", t: l,
        s: `${NIVEL[x.uso]![1]} Este mes: ${plata(n?.costo ?? 0)} · ${n?.llamadas ?? 0} con IA · ${n?.alTope ?? 0} al tope · ${n?.aReglas ?? 0} a reglas.`, tgOn: x.on, onTg: () => tgNivel(`compa.use.${x.uso}`, x.on, l) }; }) },
      { type: "group", k: "POR CANAL" },
      { type: "rows", items: I.canales.map((x) => ({ key: x.canal, icon: CANAL[x.canal]![2], t: CANAL[x.canal]![0], s: CANAL[x.canal]![1], tgOn: x.on, onTg: () => tgNivel(`compa.channel.${x.canal}`, x.on, CANAL[x.canal]![0]) })) },
      { type: "group", k: "POR CIUDAD" },
      { type: "rows", items: I.ciudades.map((ci) => { const p = I.pausas.filter((z) => z.scope === "city" && z.donde === ci.id); return { key: ci.id, icon: "pin", t: ci.nombre,
        s: p.length ? p.map((z) => `En pausa${z.uso ? ` · ${NIVEL[z.uso]![0]}` : ""} · ${z.motivo} · ${z.quien ?? ""} ${cuando(z.at)}`).join(" / ") : "Encendido",
        tag: p.length ? "EN PAUSA" : null, tone: "danger", acts: cambiar ? [...p.map((z) => ({ l: "Levantar", v: "secondary", onClick: () => levantar(z.id, ci.nombre) })), ...(p.some((z) => !z.uso) ? [] : [{ l: "Pausar aquí", v: "secondary", onClick: () => pausarCiudad(ci.id, ci.nombre) }])] : undefined }; }) },
      { type: "group", k: "POR NEGOCIO", ...(cambiar ? { link: "Pausar en un negocio", onLink: pausarNegocio } : {}) },
      { type: "rows", items: I.pausas.filter((z) => z.scope === "business").length ? I.pausas.filter((z) => z.scope === "business").map((z) => ({ key: z.id, icon: "store", t: z.nombre || z.donde,
        s: `En pausa${z.uso ? ` · ${NIVEL[z.uso]![0]}` : " · todo El Compa"} · ${z.motivo} · ${z.quien ?? ""} ${cuando(z.at)}`, tag: "EN PAUSA", tone: "danger",
        acts: cambiar ? [{ l: "Levantar", v: "secondary", onClick: () => levantar(z.id, z.nombre || z.donde) }] : undefined })) : [{ key: "nada", icon: "store", t: "Ningún negocio en pausa", s: "Las respuestas automáticas las enciende cada dueño Pro en su panel.", chev: false }] },
      { type: "group", k: "MODELO" },
      { type: "kv", cols: desk ? 3 : 1, items: [
        ...d.modelos.map((m) => ({ k: m.role === "copiloto" ? "COPILOTO DEL EQUIPO" : m.role === "cotidiano" ? "VECINOS, PANEL Y RESPUESTAS" : "SIN USO", v: `${m.label} · $${m.entrada.toFixed(2)} / $${m.salida.toFixed(2)} por millón de tokens (+${m.geo - 100} % EE. UU.) · precios del ${m.precioDe}` })),
        { k: "CONTESTA AHORA", v: MOTOR[d.motor] ?? d.motor, fg: d.motor === "claude" ? undefined : "var(--tl-pro-ink)" }] },
      { type: "group", k: "REGLAS FIJAS (NO SE APAGAN)" },
      { type: "rows", items: [["Siempre dice que es IA", "Y «Con una persona» siempre a la vista."], ["Nunca mueve dinero ni cambia la cuenta", "Prepara la acción; el vecino confirma. Lo demás pasa a una persona con el resumen."],
        ["Nunca pide tarjeta, contraseñas, SSN ni estatus", "Y no da consejo legal, médico ni de inmigración."], ["Responde en el idioma del vecino", "Español neutro con tú, o inglés."]]
        .map(([t, s], i) => ({ key: `r${i}`, icon: "lock", ibg: "rgba(11,14,18,.05)", ifg: "var(--tl-ink)", t: t!, s, chev: false })) },
      { type: "rows", k: "HISTORIAL", items: d.historial.length ? d.historial.map((h, i) => ({ key: `h${i}`, icon: h.accion === "compa.pausar" || h.accion === "compa.pausar_en" ? "ban" : h.accion === "config.cambiar" ? "edit" : "check",
        t: `${ACCION[h.accion] ?? h.accion} · ${pares(h.despues) || h.objetivo}`, s: `${cuando(h.at)}${h.quien ? ` · ${h.quien}` : ""}${h.antes ? ` · antes: ${valores(h.antes)}` : ""}${h.motivo ? ` · ${h.motivo}` : ""}`, chev: false, compact: true }))
        : [{ key: "x", icon: "folder", t: "Sin cambios todavía", chev: false }] },
    );
  } else {
    const k = d.conv.porResultado, tot = d.conv.total7d, solo = (k.self_resolved ?? 0) + (k.action_done ?? 0) + (k.open ?? 0);
    B.push(
      { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
        { k: "CONVERSACIONES · 7 D", v: String(tot), s: `${k.open ?? 0} abiertas`, bg: "var(--tl-ink)", fg: "var(--tl-white)" },
        { k: "RESOLVIÓ SOLO", v: tot ? `${Math.round((solo / tot) * 100)} %` : "—", s: "sin pasar a nadie" },
        { k: "A UNA PERSONA", v: String((k.handed_off ?? 0) + (k.to_owner ?? 0)), s: "con caso en Soporte o al dueño", onClick: () => ir({ res: "handed_off" }) },
        { k: "ACCIONES CONFIRMADAS", v: String(k.action_done ?? 0), s: "la persona dijo que sí", onClick: () => ir({ res: "action_done" }) }] },
      { type: "chips", k: "DÓNDE", items: [["", "Todo"], ...Object.entries(NIVEL).map(([key, v]) => [key, v[0]])].map(([key, l]) => ({ l: l!, v: (uso ?? "") === key ? "selected" : "filter", onClick: () => ir({ uso: key || null }) })) },
      { type: "chips", k: "RESULTADO", items: [["", "Todos"], ...Object.entries(RESULTADO).map(([key, v]) => [key, v[0].charAt(0) + v[0].slice(1).toLowerCase()])].map(([key, l]) => ({ l: l!, v: (res ?? "") === key ? "selected" : "filter", onClick: () => ir({ res: key || null }) })) },
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      {tab === "conv" ? (d.conv.filas.length
        ? <A.AdminList label={`${d.conv.filas.length}${d.conv.sig ? "+" : ""} CONVERSACIONES`} rows={d.conv.filas.map((x) => ({ icon: x.ai ? "chat" : "lock",
            title: `${x.num} · ${NIVEL[x.uso]?.[0] ?? x.uso}`, sub: `${SUP[x.superficie] ?? x.superficie} · ${CANAL[x.canal]?.[0] ?? x.canal} · ${x.turnos} ${x.turnos === 1 ? "mensaje" : "mensajes"} · ${x.ciudad} · ${cuando(x.at)}${x.motivo ? ` · motivo: ${MOTIVO[x.motivo] ?? x.motivo}` : ""}${x.ai ? "" : " · contestó sin IA (reglas fijas)"}`,
            tag: RESULTADO[x.resultado]?.[0] ?? x.resultado, tone: RESULTADO[x.resultado]?.[1] ?? "neutral" }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "chat", t: "Todavía no hay conversaciones", s: uso || res ? "Nada con ese filtro: quita uno." : "Cuando los vecinos le escriban al Compa, salen aquí." }]} />) : null}
      {tab === "conv" ? <PanelBloques bloques={[
        ...(d.conv.sig || antes ? [{ type: "acts" as const, items: [...(antes ? [{ l: "← Desde el principio", v: "secondary", onClick: () => ir({ antes: null }) }] : []), ...(d.conv.sig ? [{ l: "Siguientes →", v: "secondary", onClick: () => ir({ antes: d.conv.sig }) }] : [])] }] : []),
        { type: "note", tone: "info", t: "Aquí solo hay cifras, sin el texto. La ficha con lo que se habló la abre solo el equipo con permiso y cada lectura queda anotada (Super Admin completo de El Compa)." },
      ]} /> : null}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
