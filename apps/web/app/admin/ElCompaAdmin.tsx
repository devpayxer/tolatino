"use client";
/* 7c · Super Admin › El Compa (Super Admin.dc.html secCompa, pestaña «Interruptores» + el tope compuesto del hueco #3 de fase7-compa.md:
   el gasto del mes con su barra y sus cifras (rvsum), POR NIVEL, POR CANAL y REGLAS FIJAS como en el diseño, más POR CIUDAD y POR NEGOCIO,
   los modelos (kv) y el HISTORIAL). «Conversaciones» en solo lectura: cifras (kpis), chips DÓNDE y RESULTADO, la lista (AdminList) con
   cursor. Pausar, levantar y cambiar el tope piden motivo (ConfirmarMotivo, patrón 2ao) y quedan en la auditoría.
   7i · Las 4 pestañas del diseño (secCompa): RESUMEN (por defecto: KPI de 7 días, barras POR QUÉ PASÓ A UNA PERSONA · DÓNDE CONTESTA · POR DÓNDE
   ESCRIBEN (HBars), COPILOTO EN SOPORTE, MARCADAS POR EL EQUIPO, PERSONAS DEL EQUIPO y «LO QUE EL COMPA NO SUPO · PARA EL CENTRO DE AYUDA» con
   «Anotado» / «Corregido en {artículo}»), CONVERSACIONES (+ RESULTADO «Marcadas»; la ficha compaDetail con «Marcar respuesta incorrecta» con
   motivo / «Quitar la marca» y su HISTORIAL), NEGOCIOS e INTERRUPTORES Y TOPE (+ Canales de 7h). */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { DatosCompaAdmin, FichaConv, ResumenCompa } from "@/lib/compa/admin-compa";
import type { DatosCanales, Simulado } from "@/lib/compa/canales";
import type { AutoNegocio } from "@/lib/compa/respuesta-auto";
import { compaDesmarcar, compaInterruptor, compaLevantar, compaMarcar, compaNoSupo, compaNumero, compaNumeroRetirar, compaPausarEn, compaSimular, compaTope } from "./acciones-compa";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList" | "HBars", ComponentType<any>>;
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
// 7i · Resumen: por qué pasó a una persona (secCompa compaWhy) y «Marcar respuesta incorrecta» (MD CompaReview.reason).
const POR_QUE: Record<string, string> = { money: "Dinero", account: "Su cuenta", safety: "Seguridad", asked_person: "Pidió una persona", unknown: "No supo", owner: "Al dueño del negocio" };
const MARCA: Record<string, string> = { wrong_info: "Dato equivocado", should_hand_off: "Debía pasar a una persona", tone: "El tono", language: "El idioma", other: "Otra cosa" };
const NO_SUPO_E: Record<string, string> = { open: "Abiertas", noted: "Anotadas", fixed: "Corregidas" };
const SUP: Record<string, string> = { support_page: "Soporte", help_sheet: "Hoja de ayuda", panel: "Panel", business_chat: "Chat del negocio", ticket: "Caso", channel: "WhatsApp o SMS" };
// 7h · Canales: lo que pasó con cada entrada y con cada salida (sin texto ni teléfono).
const RES_E: Record<string, [string, string]> = { respuesta: ["CONTESTÓ", "signal"], enlace: ["MANDÓ UN ENLACE", "signal"], persona: ["A UNA PERSONA", "action"], fija: ["RESPUESTA FIJA", "neutral"],
  baja: ["STOP", "danger"], alta: ["START", "signal"], ayuda: ["HELP", "neutral"], en_baja: ["DE BAJA · NADA", "neutral"], limite: ["LÍMITE DEL DÍA", "action"], apagado: ["APAGADO · NADA", "neutral"],
  tope: ["AL TOPE · NADA", "action"], auto: ["RESPUESTA DEL NEGOCIO", "signal"], auto_paso: ["PASÓ AL NEGOCIO", "action"], auto_nada: ["EL NEGOCIO CONTESTA", "neutral"], sin_ruta: ["NO ES NUESTRO", "neutral"],
  media: ["SOLO TEXTO", "neutral"], error: ["FALLÓ", "danger"] };
const SAL: Record<string, string> = { simulado: "simulado (sandbox)", pendiente: "pendiente", enviado: "enviado", fallo: "falló", apagado: "no salió: canal apagado", baja: "no salió: pidió STOP",
  silencio: "no salió: horas de silencio", ventana: "no salió: fuera de las 24 h de WhatsApp", sin_proveedor: "sin proveedor" };
const MODO: Record<string, string> = { simulador: "Simulador del sandbox (no sale nada)", real: "Proveedor real", apagado: "Apagado: no sale nada" };
const ACC_T: Record<string, string> = { cancel_request: "Cancelar una solicitud", open_screen: "Abrir una pantalla", go_to_panel: "Ir al panel" };
const ACC_E: Record<string, string> = { proposed: "propuesta", confirming: "confirmando", confirmed: "confirmada", dismissed: "la dejó", expired: "venció", failed: "falló" };
const MOTOR: Record<string, string> = { claude: "Claude (con la llave del entorno)", simulador: "Simulador del sandbox (todavía sin llave de Anthropic)", reglas: "Reglas fijas (sin IA)" };
const ACCION: Record<string, string> = { "compa.pausar": "Pausó", "compa.encender": "Encendió", "compa.pausar_en": "Pausó", "compa.levantar": "Levantó la pausa", "config.cambiar": "Cambió",
  "compa.numero": "Conectó", "compa.numero_retirar": "Retiró", "compa.simular": "Probó", "compa.marcar": "Marcó", "compa.desmarcar": "Quitó la marca", "compa.no_supo_anotado": "Anotó",
  "compa.no_supo_corregido": "Corrigió", "compa.modelo": "Cambió el modelo" };
const plata = (c: number) => `$${(c / 100).toFixed(c > 0 && c < 1 ? 4 : 2)}`;
const cuando = (iso: string | null) => (iso ? new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "") : "—");
const valores = (o: Record<string, string> | null) => (o ? Object.values(o).join(" · ") : "");
const pares = (o: Record<string, string> | null) => (o ? Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(" · ") : "");
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesL = (m: string) => { const [a, b] = m.split("-"); return `${MESES[Number(b) - 1] ?? b} de ${a}`; };

export function ElCompaAdmin({ d, tab, uso, res, canal = null, buscar = null, antes, cambiar, cp = null, ficha = null, leer = false, negocios = [], canales = null, resumen = null, ns = "open" }: {
  d: DatosCompaAdmin; tab: "res" | "ctl" | "conv" | "neg" | "can"; uso: string | null; res: string | null; canal?: string | null; buscar?: string | null; antes: string | null; cambiar: boolean;
  cp?: string | null; ficha?: FichaConv | null; leer?: boolean; negocios?: AutoNegocio[]; canales?: DatosCanales | null; resumen?: ResumenCompa | null; ns?: string;
}) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [q, setQ] = useState(buscar ?? "");
  const [sim, setSim] = useState<{ num: string; tel: string; txt: string; res: Simulado | null; busy: boolean }>({ num: canales?.numeros[0]?.id ?? "", tel: "", txt: "", res: null, busy: false });
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo."); setConf(null); router.refresh(); };
  const ir = (p: { tab?: string; uso?: string | null; res?: string | null; canal?: string | null; buscar?: string | null; antes?: string | null; cp?: string | null; ns?: string | null }) => {
    const x = new URLSearchParams(), t = p.tab ?? tab, u = p.uso !== undefined ? p.uso : uso, r = p.res !== undefined ? p.res : res;
    const ca = p.canal !== undefined ? p.canal : canal, bq = p.buscar !== undefined ? p.buscar : buscar;
    if (t !== "res" && !(p.cp && t === "conv")) x.set("tab", t); if (t === "res" && p.ns && p.ns !== "open") x.set("ns", p.ns); if (t === "conv" && u) x.set("uso", u); if (t === "conv" && r) x.set("res", r); if (t === "conv" && ca) x.set("canal", ca);
    if (t === "conv" && bq) x.set("buscar", bq); if (p.antes) x.set("antes", p.antes); if (p.cp) x.set("cp", p.cp);
    router.push(x.size ? `/admin/compa?${x}` : "/admin/compa", { scroll: false });
  };
  // 7d · La ficha de una conversación (compaDetail): solo con permiso de leer hilos; cada apertura ya quedó anotada en el servidor.
  if (cp && !conf) {
    const f = ficha, volver = () => ir({ cp: null });
    const FB: Bloque[] = [{ type: "head", eye: "EL COMPA · CONVERSACIONES", t: f?.num ?? cp, s: f ? `${NIVEL[f.uso]?.[0] ?? f.uso} · ${cuando(f.at)}` : undefined, onBack: volver, h1: desk ? 26 : 22 }];
    if (!leer) FB.push({ type: "note", tone: "warn", t: "Tu rol ve las cifras de El Compa, no lo que se habló. El hilo lo leen Admin y Soporte, y cada lectura queda anotada." });
    else if (!f) FB.push({ type: "empty", icon: "chat", t: "Esa conversación no existe", s: "Revisa el número CP-." });
    else {
      FB.push({ type: "kv", cols: desk ? 3 : 2, items: [
        { k: "QUIÉN", v: f.quien?.nombre ?? "—" }, { k: "NEGOCIO", v: f.negocio?.nombre ?? "—" }, { k: "CANAL", v: CANAL[f.canal === "web" ? "app" : f.canal]?.[0] ?? f.canal },
        { k: "RESULTADO", v: RESULTADO[f.resultado]?.[0] ?? f.resultado, fg: f.resultado === "handed_off" ? "var(--tl-action)" : f.resultado === "action_done" ? "var(--tl-open-text)" : undefined },
        ...(f.motivo ? [{ k: "MOTIVO", v: MOTIVO[f.motivo] ?? f.motivo }] : []), ...(f.caso ? [{ k: "CASO EN SOPORTE", v: f.caso, fg: "var(--tl-action)" }] : []),
        { k: "DÓNDE", v: `${SUP[f.superficie] ?? f.superficie}${f.operacion ? ` · ${f.operacion}` : ""}` }, { k: "CIUDAD", v: f.ciudad }] });
      // 7i · La marca viva («Marcar respuesta incorrecta») y la purga por retención (solo quedan las cifras).
      if (f.marca) FB.push({ type: "note", tone: "danger", icon: "warning", t: `Marcada por ${f.marca.quien ?? "el equipo"} · ${MARCA[f.marca.motivo] ?? f.marca.motivo}${f.marca.nota ? `: ${f.marca.nota}` : ""} · ${cuando(f.marca.at)}` });
      if (f.purgada) FB.push({ type: "note", tone: "ink", icon: "lock", t: `El texto se borró el ${cuando(f.purgada)} por la retención (Configuración › El Compa) o porque la cuenta se cerró: quedan las cifras.` });
      if (!f.ai) FB.push({ type: "note", tone: "warn", t: "Contestó sin IA (reglas fijas) al menos una vez: un paso fijo de la hoja, el tope, la IA lenta o una respuesta que no pasó el verificador." });
      FB.push({ type: "thread", items: f.msjs.map((m) => ({ t: m.t ?? "(borrado por la retención)", mine: m.de === "compa", m: m.de === "user" ? (f.quien?.nombre ?? "Vecino") : m.de === "compa" ? `El Compa · ${m.motor === "reglas" ? "reglas fijas" : "IA"}${m.fuente ? ` · ${m.fuente}` : ""} · ${cuando(m.at)}` : "Sistema", soft: m.de === "system" })) });
      FB.push({ type: "note", tone: "ink", icon: "shield", t: "El equipo solo lee lo que el vecino habló con El Compa para revisar la calidad; los chats privados entre vecinos no se leen." });
      const marcar = () => setConf({ titulo: "¿Qué contestó mal El Compa?", peligro: true, cta: "Marcar", elegir: { label: "QUÉ ESTUVO MAL", items: Object.entries(MARCA).map(([k, l]) => ({ k, l })) },
        sub: "Sirve para corregir la ayuda y las reglas. No le llega al vecino. Queda en el historial.", plantillas: ["Dio un dato que no está en la ayuda.", "Tenía que pasar a una persona.", "Contestó en otro idioma."],
        hacer: (m, e) => compaMarcar(f.num, e ?? "", m) });
      const desmarcar = () => setConf({ titulo: "Quitar la marca", cta: "Quitar la marca", sub: "La conversación deja de contar como marcada. Queda en el historial.", plantillas: ["Revisado: la respuesta estaba bien.", "Ya se corrigió la ayuda."],
        hacer: (m) => compaDesmarcar(f.num, m) });
      FB.push({ type: "acts", items: [
        ...(f.marca ? [{ l: "Quitar la marca", v: "secondary", icon: "check", onClick: desmarcar }] : f.purgada ? [] : [{ l: "Marcar respuesta incorrecta", v: "danger", icon: "warning", onClick: marcar }]),
        ...(f.caso ? [{ l: `Ver ${f.caso} en Soporte`, v: "secondary", onClick: () => router.push(`/admin/soporte?caso=${encodeURIComponent(f.caso!)}`) }] : []),
        ...(f.quien ? [{ l: "Ver a la persona", v: "secondary", onClick: () => router.push(`/admin/usuarios/${f.quien!.id}`) }] : [])] });
      FB.push({ type: "rows", k: "ACCIONES", items: f.acciones.length ? f.acciones.map((a, i) => ({ key: `a${i}`, icon: a.tipo === "cancel_request" ? "close" : "right", chev: false, compact: true,
        t: `${ACC_T[a.tipo] ?? a.tipo} · ${ACC_E[a.estado] ?? a.estado}`, s: `${cuando(a.at)}${a.via ? ` · desde ${a.via === "link" ? "el enlace" : "la app"}` : ""}${a.motivo ? ` · ${a.motivo}` : ""}` }))
        : [{ key: "x", icon: "folder", t: "Ninguna acción preparada", chev: false }] });
      FB.push({ type: "rows", k: "QUIÉN LA LEYÓ", items: f.lecturas.map((r, i) => ({ key: `l${i}`, icon: "users", t: r.quien ?? "Alguien del equipo", s: cuando(r.at), chev: false, compact: true })) });
      FB.push({ type: "rows", k: "HISTORIAL", items: f.historial.length ? f.historial.map((h, i) => ({ key: `h${i}`, icon: h.accion === "compa.marcar" ? "warning" : "check", chev: false, compact: true,
        t: `${ACCION[h.accion] ?? h.accion} · ${pares(h.despues)}`, s: `${cuando(h.at)}${h.quien ? ` · ${h.quien}` : ""}${h.motivo ? ` · ${h.motivo}` : ""}` }))
        : [{ key: "x", icon: "folder", t: "Sin marcas ni cambios", chev: false }] });
    }
    return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 820 }}><PanelBloques bloques={FB} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
  }
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: cp ? `EL COMPA · ${cp}` : tab === "res" ? "EL COMPA · RESUMEN" : "EL COMPA · INTERRUPTORES Y TOPE", t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
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
    { type: "tabs", items: [{ l: "Resumen", on: tab === "res", onClick: () => ir({ tab: "res" }) },
      { l: "Conversaciones", n: d.conv.total7d ? String(d.conv.total7d) : undefined, on: tab === "conv", onClick: () => ir({ tab: "conv" }) },
      { l: "Negocios", on: tab === "neg", onClick: () => ir({ tab: "neg" }) },
      { l: "Interruptores y tope", n: pausados.length ? String(pausados.length) : undefined, on: tab === "ctl", onClick: () => ir({ tab: "ctl" }) },
      { l: "Canales", n: canales?.cifras.entradas24 ? String(canales.cifras.entradas24) : undefined, on: tab === "can", onClick: () => ir({ tab: "can" }) }] },
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
  } else if (tab === "can" && canales) {
    // 7h · Canales: WhatsApp y SMS (secCompa POR CANAL + hueco de diseño: números, registro y simulador, compuestos con piezas del sistema).
    const C2 = canales, k = C2.cifras;
    const numero = () => !cambiar ? sinPermiso() : setConf({ titulo: "Conectar un número", cta: "Conectar", elegir: { label: "CANAL", items: [
        { k: "whatsapp:whatsapp", l: "WhatsApp · Meta" }, { k: "sms:telnyx", l: "SMS · Telnyx" }, ...(C2.sandbox ? [{ k: "whatsapp:sim", l: "WhatsApp · de prueba" }, { k: "sms:sim", l: "SMS · de prueba" }] : [])] },
      valor: { k: "NÚMERO (Y, SI ES DE UN NEGOCIO, SU ID DESPUÉS DE UNA COMA)", ini: "", max: 120 },
      sub: "Sin negocio = el número de To'Latino (El Compa de los vecinos). Con negocio = sus respuestas automáticas por ese canal (el dueño las enciende en su panel). WhatsApp de Meta: el phone_number_id. Queda en la auditoría.",
      plantillas: ["Número del sandbox para probar.", "Lo pidió el dueño por Soporte."], hacer: (m, e, v) => compaNumero(e ?? "", v, m) });
    const retirar = (id: string, t: string) => !cambiar ? sinPermiso() : setConf({ titulo: `Retirar ${t}`, peligro: true, cta: "Retirar", sub: "Ese número deja de recibir: lo que llegue ahí no se contesta. Queda en la auditoría.",
      plantillas: ["Ya no se usa.", "Lo pidió el dueño."], hacer: (m) => compaNumeroRetirar(id, m) });
    const simular = async () => {
      if (sim.busy || !sim.num || !sim.tel.trim() || !sim.txt.trim()) return;
      setSim({ ...sim, busy: true });
      const r = await compaSimular(sim.num, sim.tel, sim.txt).catch(() => ({ ok: false as const, msg: "No se pudo. Prueba otra vez." }));
      setSim((x) => ({ ...x, busy: false, res: r, txt: r.ok ? "" : x.txt }));
      router.refresh();
    };
    B.push(
      { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
        { k: "ENTRADAS · 24 H", v: String(k.entradas24), s: "con firma buena", bg: "var(--tl-ink)", fg: "var(--tl-white)" },
        { k: "RECHAZADAS · 24 H", v: String(k.rechazadas24), s: "firma, hora o tamaño" },
        { k: "RESPUESTAS · 24 H", v: String(k.respuestas24), s: "enviadas o simuladas" },
        { k: "STOP · 30 D", v: String(k.bajas30), s: `${k.enlaces7} enlaces en 7 d · ${k.usados7} confirmados` }] },
      { type: "kv", cols: desk ? 2 : 1, items: [
        { k: "WHATSAPP", v: `${MODO[C2.modo.whatsapp]}${C2.on.whatsapp ? "" : " · el interruptor POR CANAL está en pausa"}`, fg: C2.modo.whatsapp === "real" ? undefined : "var(--tl-pro-ink)" },
        { k: "SMS", v: `${MODO[C2.modo.sms]}${C2.on.sms ? "" : " · el interruptor POR CANAL está en pausa"}`, fg: C2.modo.sms === "real" ? undefined : "var(--tl-pro-ink)" }] },
      { type: "note", tone: "ink", icon: "shield", t: "La firma del proveedor prueba que el mensaje vino de Meta o de Telnyx, no quién lo escribe. Por eso El Compa solo contesta a ese mismo teléfono, solo a una cuenta que lo encendió en Mi cuenta › Avisos, y nunca hace nada por mensaje: manda un enlace de un uso que se confirma en la app después de entrar." },
      { type: "group", k: "NÚMEROS QUE RECIBEN", ...(cambiar ? { link: "Conectar un número", onLink: numero } : {}) },
      { type: "rows", items: C2.numeros.length ? C2.numeros.map((x) => ({ key: x.id, icon: x.canal === "whatsapp" ? "chat" : "phone", chev: false,
        t: `${x.canal === "whatsapp" ? "WhatsApp" : "SMS"} · ${x.numero}`, s: `${x.negocio ? `${x.negocio.nombre} (respuestas automáticas)` : "To'Latino (El Compa de los vecinos)"} · ${x.ciudad} · ${x.motivo} · ${cuando(x.at)}`,
        tag: x.proveedor === "sim" ? "DE PRUEBA" : x.proveedor === "telnyx" ? "TELNYX" : "META", tone: x.proveedor === "sim" ? "ink" : "neutral",
        acts: cambiar ? [{ l: "Retirar", v: "secondary", onClick: () => retirar(x.id, `${x.canal === "whatsapp" ? "WhatsApp" : "SMS"} ${x.numero}`) }] : undefined }))
        : [{ key: "x", icon: "phone", t: "Ningún número conectado", s: "Sin número, nada entra ni sale por WhatsApp o SMS.", chev: false }] },
    );
    if (C2.sandbox && cambiar) {
      const SR = sim.res;
      B.push(
        { type: "group", k: "SIMULADOR DEL SANDBOX" },
        { type: "note", tone: "info", icon: "info", t: "Manda un mensaje como si fueras un teléfono y mira qué contesta El Compa. Pasa por lo mismo que un mensaje de verdad (STOP, límite, identidad, el turno) y no sale nada. Queda en la auditoría." },
        ...(C2.numeros.length ? [{ type: "chips" as const, k: "A QUÉ NÚMERO", items: C2.numeros.map((x) => ({ l: `${x.canal === "whatsapp" ? "WhatsApp" : "SMS"} · ${x.negocio ? x.negocio.nombre : "To'Latino"}`, v: sim.num === x.id ? "selected" : "filter", onClick: () => setSim({ ...sim, num: x.id, res: null }) })) }] : []),
        { type: "field", k: "DESDE EL TELÉFONO", val: sim.tel, max: 20, ph: "570 555 0122", onChange: (v: string) => setSim({ ...sim, tel: v.slice(0, 20) }) },
        { type: "field", k: "EL MENSAJE", val: sim.txt, area: true, rows: 2, max: 300, count: `${sim.txt.length}/300`, ph: "¿Cómo va mi reservación?", onChange: (v: string) => setSim({ ...sim, txt: v.slice(0, 300) }) },
        { type: "acts", items: [{ l: sim.busy ? "Mandando…" : "Mandar como ese teléfono", v: "primary", icon: "chat", off: sim.busy || !sim.num || !sim.tel.trim() || !sim.txt.trim(), onClick: () => void simular() }] },
      );
      if (SR && !SR.ok) B.push({ type: "note", tone: "warn", t: SR.msg });
      if (SR && SR.ok) B.push({ type: "thread", items: [
        ...SR.salidas.map((o) => ({ t: o.texto ?? "(sin texto)", soft: true, m: `EL COMPA · ${o.tipo.toUpperCase()} · ${SAL[o.estado] ?? o.estado}` })),
        ...(SR.salidas.length ? [] : [{ t: "No contestó nada.", soft: true, m: `RESULTADO · ${RES_E[SR.resultado]?.[0] ?? SR.resultado}` }])] },
        { type: "kv", cols: desk ? 2 : 1, items: [{ k: "RESULTADO", v: RES_E[SR.resultado]?.[0] ?? SR.resultado }, ...(SR.cp ? [{ k: "CONVERSACIÓN", v: SR.cp, fg: "var(--tl-action)" }] : [])] });
    }
    B.push({ type: "group", k: "REGISTRO DE ENTRADA" });
  } else if (tab === "res" && resumen) {
    // 7i · RESUMEN (secCompa sub «res»): 7 días; las barras van aparte (HBars) entre estos bloques y los de abajo.
    const R = resumen, pct = (n: number, t: number) => (t ? `${Math.round((n / t) * 100)} %` : "—");
    B.push({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "CONVERSACIONES · 7 D", v: String(R.total), s: `${R.abiertas} abiertas · ${R.sinIa} sin IA`, bg: "var(--tl-ink)", fg: "var(--tl-white)", onClick: () => ir({ tab: "conv" }) },
      { k: "RESOLVIÓ SOLO", v: pct(R.solo, R.total), s: `${R.solo} sin pasar a nadie` },
      { k: "A UNA PERSONA", v: String(R.persona + R.dueno), s: `${R.conCaso} con caso en Soporte · ${R.dueno} al dueño`, onClick: () => ir({ tab: "conv", res: "handed_off" }) },
      { k: "ACCIONES CONFIRMADAS", v: String(R.acciones), s: "la persona dijo que sí", onClick: () => ir({ tab: "conv", res: "action_done" }) }] });
  } else if (tab === "neg") {
    // 7f · Respuestas automáticas por negocio (secCompa · Negocios): cifras de 30 días, sin texto ni personas. «Apagar El Compa aquí» está en la
    // ficha del negocio (Negocios 360° › El Compa), con motivo y aviso al dueño.
    B.push({ type: "note", tone: "info", icon: "help", t: "Cada dueño Pro enciende sus respuestas automáticas en su panel; solo contestan fuera de su horario, con lo que dice su página. Aquí ves dónde están encendidas y dónde las apagó To'Latino." });
  } else {
    B.push(
      // 7e · Cuántas por nivel en 7 días (vecinos, panel del negocio…): tocar uno filtra DÓNDE. (Las cifras completas y el copiloto: Resumen.)
      { type: "kv", cols: desk ? 4 : 2, items: Object.entries(NIVEL).map(([key, v]) => ({ k: `${v[0].toUpperCase()} · 7 D`, v: String(d.conv.porUso[key] ?? 0), fg: (uso ?? "") === key ? "var(--tl-action)" : undefined })) },
      { type: "chips", k: "DÓNDE", items: [["", "Todo"], ...Object.entries(NIVEL).map(([key, v]) => [key, v[0]])].map(([key, l]) => ({ l: l!, v: (uso ?? "") === key ? "selected" : "filter", onClick: () => ir({ uso: key || null }) })) },
      { type: "chips", k: "RESULTADO", items: [["", "Todos"], ...Object.entries(RESULTADO).map(([key, v]) => [key, v[0].charAt(0) + v[0].slice(1).toLowerCase()]), ["flag", "Marcadas"]].map(([key, l]) => ({ l: l!, v: (res ?? "") === key ? "selected" : "filter", onClick: () => ir({ res: key || null }) })) },
      { type: "chips", k: "CANAL", items: [["", "Todos"], ...Object.entries(CANAL).map(([key, v]) => [key, v[0]])].map(([key, l]) => ({ l: l!, v: (canal ?? "") === key ? "selected" : "filter", onClick: () => ir({ canal: key || null }) })) },
      { type: "search", val: q, ph: "Número CP-…", onChange: setQ, onClear: () => { setQ(""); ir({ buscar: null }); }, link: "Buscar", onLink: () => ir({ buscar: q.trim() || null }) },
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      {tab === "res" && resumen ? <Resumen R={resumen} desk={desk} leer={leer} ns={ns} ir={ir} setConf={setConf} /> : null}
      {tab === "can" && canales ? (canales.entradas.length
        ? <A.AdminList label={`${canales.entradas.length}${canales.sig ? "+" : ""} ENTRADAS`} rows={canales.entradas.map((x) => ({ icon: x.canal === "whatsapp" ? "chat" : "phone",
            onClick: x.cp && leer ? () => ir({ tab: "conv", cp: x.cp }) : undefined, chevron: !!(x.cp && leer),
            title: `${x.canal === "whatsapp" ? "WhatsApp" : "SMS"} · teléfono #${x.tel} · ${x.cuenta ? "con cuenta" : "sin cuenta"} → ${x.destino}`,
            sub: `${cuando(x.at)} · ${x.proveedor === "sim" ? "simulador" : x.proveedor === "telnyx" ? "Telnyx" : "Meta"}${x.tipo !== "text" ? ` · ${x.tipo.toUpperCase()}` : ""}${x.salida ? ` · salida: ${SAL[x.salida] ?? x.salida}` : ""}${x.cp ? ` · ${x.cp}` : ""}${x.estado !== "hecho" ? ` · ${x.estado}` : ""}`,
            tag: RES_E[x.resultado ?? ""]?.[0] ?? (x.estado === "hecho" ? "—" : "EN CURSO"), tone: RES_E[x.resultado ?? ""]?.[1] ?? "neutral" }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "chat", t: "Todavía no entró nada", s: "Cuando alguien escriba por WhatsApp o SMS a un número conectado, sale aquí (sin el texto ni el teléfono)." }]} />) : null}
      {tab === "can" && canales ? <PanelBloques bloques={[
        ...(canales.sig || antes ? [{ type: "acts" as const, items: [...(antes ? [{ l: "← Desde el principio", v: "secondary", onClick: () => ir({ antes: null }) }] : []), ...(canales.sig ? [{ l: "Siguientes →", v: "secondary", onClick: () => ir({ antes: canales.sig }) }] : [])] }] : []),
        { type: "note", tone: "info", t: "El registro no guarda ni muestra el teléfono ni el texto: una huella corta para ver que es el mismo teléfono, si era una cuenta, qué pasó y la conversación. El texto se vacía a los días de Configuración › El Compa." },
      ]} /> : null}
      {tab === "neg" ? (negocios.length
        ? <A.AdminList label={`${negocios.length} NEGOCIOS`} rows={negocios.map((x) => ({ icon: x.pausa ? "ban" : "store", chevron: true, onClick: () => router.push(`/admin/negocios/${x.id}?tab=compa`),
            title: `${x.nombre} · ${x.ciudad}`, sub: `30 días: ${x.contesto30} respuestas · ${x.paso30} pasadas al negocio${x.reportes ? ` · ${x.reportes} reportes` : ""}${x.pausa ? ` · apagadas por To'Latino: ${x.pausa.motivo}` : ""}`,
            tag: x.pausa ? "APAGADAS POR TO'LATINO" : !x.pro ? "SIN PRO" : x.enabled ? "ENCENDIDAS" : "APAGADAS", tone: x.pausa ? "danger" : x.enabled && x.pro ? "signal" : "neutral" }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "store", t: "Ningún negocio tiene respuestas automáticas", s: "Cuando un dueño Pro las encienda en su panel, sale aquí." }]} />) : null}
      {tab === "conv" ? (d.conv.filas.length
        ? <A.AdminList label={`${d.conv.filas.length}${d.conv.sig ? "+" : ""} CONVERSACIONES`} rows={d.conv.filas.map((x) => ({ icon: x.ai ? "chat" : "lock",
            onClick: () => ir({ cp: x.num }), chevron: leer,
            title: `${x.num} · ${NIVEL[x.uso]?.[0] ?? x.uso}`, sub: `${SUP[x.superficie] ?? x.superficie} · ${CANAL[x.canal]?.[0] ?? x.canal} · ${x.turnos} ${x.turnos === 1 ? "mensaje" : "mensajes"} · ${x.ciudad} · ${cuando(x.at)}${x.motivo ? ` · motivo: ${MOTIVO[x.motivo] ?? x.motivo}` : ""}${x.ai ? "" : " · contestó sin IA (reglas fijas)"}`,
            tag: RESULTADO[x.resultado]?.[0] ?? x.resultado, tone: RESULTADO[x.resultado]?.[1] ?? "neutral" }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "chat", t: "Todavía no hay conversaciones", s: uso || res || canal || buscar ? "Nada con ese filtro: quita uno." : "Cuando los vecinos o los negocios le escriban al Compa, salen aquí." }]} />) : null}
      {tab === "conv" ? <PanelBloques bloques={[
        ...(d.conv.sig || antes ? [{ type: "acts" as const, items: [...(antes ? [{ l: "← Desde el principio", v: "secondary", onClick: () => ir({ antes: null }) }] : []), ...(d.conv.sig ? [{ l: "Siguientes →", v: "secondary", onClick: () => ir({ antes: d.conv.sig }) }] : [])] }] : []),
        { type: "note", tone: "info", t: leer ? "La lista no muestra lo que se habló. Al abrir una conversación ves el hilo (tapado como se guardó) y tu lectura queda anotada."
          : "Tu rol ve las cifras, sin el texto. El hilo lo leen Admin y Soporte, y cada lectura queda anotada." },
      ]} /> : null}
      <Toast t={toast} desk={desk} />
    </div>
  );
}

/* 7i · RESUMEN: las barras (HBars, como el diseño: POR QUÉ PASÓ A UNA PERSONA · DÓNDE CONTESTA · POR DÓNDE ESCRIBEN), COPILOTO EN SOPORTE, MARCADAS
   POR EL EQUIPO, PERSONAS DEL EQUIPO y «LO QUE EL COMPA NO SUPO · PARA EL CENTRO DE AYUDA» (hueco #7: solo la lista; «Anotado» con motivo o
   «Corregido en {artículo}»; el texto de la ayuda se corrige en el repo). La pregunta (tapada, sin la persona) la ve solo quien lee hilos. */
const NO_SUPO_CANAL: Record<string, string> = { app: "Chat de To'Latino", whatsapp: "WhatsApp", sms: "SMS" };
function Resumen({ R, desk, leer, ns, ir, setConf }: { R: ResumenCompa; desk: boolean; leer: boolean; ns: string; ir: (p: { tab?: string; res?: string | null; cp?: string | null; ns?: string | null }) => void;
  setConf: (c: Confirmar) => void }) {
  const barras = (o: Record<string, number>, L: (k: string) => string, color: (k: string) => string) => {
    const e = Object.entries(o).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]), mx = Math.max(1, ...e.map(([, n]) => n));
    return e.map(([k, n]) => ({ label: L(k), width: `${Math.max(2, Math.round((n / mx) * 100))}%`, color: color(k), value: String(n) }));
  };
  const motivo = barras(R.porMotivo, (k) => POR_QUE[k] ?? k, (k) => (k === "unknown" ? "var(--tl-pro)" : "var(--tl-ink)"));
  const donde = barras(R.porUso, (k) => NIVEL[k]?.[0] ?? k, () => "var(--tl-action)");
  const canal = barras(R.porCanal, (k) => NO_SUPO_CANAL[k] ?? k, () => "var(--tl-ink)");
  const c = R.copiloto, pctB = (n: number) => (c.borradores ? `${Math.round((n / c.borradores) * 100)} %` : "—");
  const h = R.horario, hora = (x: number) => (x === 0 || x === 24 ? "12 AM" : x === 12 ? "12 PM" : x < 12 ? `${x} AM` : `${x - 12} PM`);
  const dias = h.dias >= 7 ? "todos los días" : h.dias === 6 ? "lun–sáb" : "lun–vie";
  const anotar = (id: string) => setConf({ titulo: "Anotado", cta: "Anotar", sub: "Queda como pendiente para corregir la ayuda en el repo. Sale de «Abiertas». Queda en el historial de la conversación.",
    plantillas: ["Falta en la ayuda: se agrega en el próximo despliegue.", "Pide datos de otra persona: El Compa hizo bien en no saber.", "Fuera de tema."], hacer: (m) => compaNoSupo(id, "noted", m, "") });
  const corregido = (id: string) => setConf({ titulo: "Corregido en un artículo", cta: "Guardar", elegir: { label: "ARTÍCULO DEL CENTRO DE AYUDA", items: R.articulos.map((a) => ({ k: a.slug, l: a.titulo })) },
    sub: "El artículo ya dice lo que faltaba (se corrigió en el repo y se desplegó). Queda en el historial de la conversación.", plantillas: ["Se agregó a la ayuda.", "Se corrigió el dato en la ayuda."],
    hacer: (m, e) => compaNoSupo(id, "fixed", m, e ?? "") });
  const B2: Bloque[] = [
    { type: "kv", cols: desk ? 3 : 1, items: [
      { k: "COPILOTO EN SOPORTE", v: `${c.borradores} ${c.borradores === 1 ? "borrador" : "borradores"} · 30 d` },
      { k: "MARCADAS POR EL EQUIPO", v: `${R.marcadas}${R.marcadas7 ? ` · ${R.marcadas7} esta semana` : ""}`, fg: R.marcadas ? "var(--tl-danger)" : undefined },
      { k: "PERSONAS DEL EQUIPO", v: `${dias} ${hora(h.desde)}–${hora(h.hasta)}` }] },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "COPILOTO EN SOPORTE · 30 D", v: `${c.borradores} ${c.borradores === 1 ? "borrador" : "borradores"}`, s: `${c.casos} en casos · ${c.ayudas} en ayudas escaladas` },
      { k: "ENVIADOS TAL CUAL", v: pctB(c.tal), s: `${c.tal} de ${c.borradores}` }, { k: "EDITADOS", v: pctB(c.editados), s: `${c.tal + c.editados} enviados en total` },
      { k: "DESCARTADOS", v: pctB(c.descartados), s: `${c.abiertos} sin usar todavía · ${c.sinIA} sin IA (reglas)` }] },
    ...(R.marcadas ? [{ type: "note" as const, tone: "danger" as const, icon: "warning", t: `${R.marcadas} ${R.marcadas === 1 ? "conversación marcada" : "conversaciones marcadas"} como respuesta incorrecta.`, cta: "Ver", onCta: () => ir({ tab: "conv", res: "flag" }) }] : []),
    { type: "group", k: "LO QUE EL COMPA NO SUPO · PARA EL CENTRO DE AYUDA" },
    { type: "chips", items: (["open", "noted", "fixed"] as const).map((k) => ({ l: `${NO_SUPO_E[k]}${k === "open" ? ` · ${R.noSupoAbiertos}` : ""}`, v: ns === k ? "selected" : "filter", onClick: () => ir({ tab: "res", ns: k }) })) },
    { type: "rows", items: R.noSupo.length ? R.noSupo.map((x) => ({ key: x.id, icon: x.estado === "fixed" ? "check" : "help", chev: false,
      t: x.q ? `«${x.q}»` : `Pregunta de ${x.audiencia === "negocio" ? "un negocio" : "un vecino"}`,
      s: `${x.audiencia === "negocio" ? "Ayuda de negocios" : "Ayuda de vecinos"} · ${x.lang === "en" ? "inglés" : "español"} · ${x.ciudad} · ${x.num} · ${cuando(x.at)}${x.estado !== "open" ? ` · ${x.estado === "fixed" ? `Corregido en ${x.titulo ?? x.slug}` : "Anotado"}${x.quien ? ` por ${x.quien}` : ""}${x.nota ? `: ${x.nota}` : ""}` : ""}`,
      tag: x.estado === "fixed" ? "CORREGIDO" : x.estado === "noted" ? "ANOTADO" : null, tone: x.estado === "fixed" ? "signal" : "action",
      acts: leer ? [...(x.estado === "open" ? [{ l: "Anotado", v: "secondary", onClick: () => anotar(x.id) }] : []), ...(x.estado !== "fixed" ? [{ l: "Corregido en…", v: "secondary", onClick: () => corregido(x.id) }] : []),
        { l: "Ver conversación", v: "secondary", onClick: () => ir({ tab: "conv", cp: x.num }) }] : undefined }))
      : [{ key: "x", icon: "help", t: ns === "open" ? "El Compa supo contestar todo" : `Nada ${ns === "noted" ? "anotado" : "corregido"} todavía`, s: "Cuando conteste «No tengo ese dato», la pregunta (tapada, sin la persona) sale aquí para mejorar la ayuda.", chev: false }] },
    { type: "note", tone: "info", icon: "lock", t: leer ? "Solo la pregunta, tapada y sin la persona. El artículo se corrige en el repo (se despliega con la app); aquí queda anotado." : "Tu rol ve las cifras. La pregunta la leen Admin y Soporte." },
  ];
  return (
    <>
      {motivo.length ? <A.HBars label="POR QUÉ PASÓ A UNA PERSONA · 7 D" items={motivo} /> : null}
      {donde.length ? <A.HBars label="DÓNDE CONTESTA · 7 D" items={donde} /> : null}
      {canal.length ? <A.HBars label="POR DÓNDE ESCRIBEN · 7 D" items={canal} /> : null}
      <PanelBloques bloques={B2} h1={desk ? 26 : 22} />
    </>
  );
}
