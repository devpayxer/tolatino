"use client";
/* 7b · Super Admin › Soporte (Super Admin.dc.html secSop + la ficha `ticket` de Colas). Cifras (ABIERTOS · fuera de plazo, MÍOS, 1.ª RESPUESTA,
   RESUELTOS · 7 D con «¿Se resolvió?»), pestañas Abiertos · Míos · Escalados · Resueltos · Macros, buscador y chips, la lista (QueueCard,
   la más urgente primero) y la ficha al lado (≥ 1200) o a pantalla completa: contexto automático (persona, negocio, operación, ayuda,
   dispositivo y versión), el hilo con las NOTAS INTERNAS marcadas (solo el equipo), MACROS ES/EN que llenan la respuesta, «A la persona» /
   «Nota interna», Resolver · Resolver y devolver (con el tope del rol que dice la base) · Pasar a Finanzas · Unir · Ligar · Reabrir · Ocultar
   un mensaje, cada una con motivo (ConfirmarMotivo, patrón 2ao) y el historial. El servidor decide todo.
   7g · El copiloto (Super Admin.dc.html, la ficha `ticket` de Colas): «Sugerir respuesta con El Compa» / «Otro borrador con El Compa» → la nota
   «EL COMPA · {resumen} Siguiente paso: …» («(sin IA: borrador de reglas)» si no hubo IA) y el borrador en el campo RESPUESTA; «Revísalo antes de
   enviar: sale con tu nombre.». Nada se envía solo: sale con «Enviar», como siempre. Sin copiloto (apagado o al tope), la ficha es la de siempre. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type ComponentType, type ReactNode } from "react";
import type { CasoEquipo, FilaSop, Macro, MsjEquipo, TabSop } from "@/lib/soporte-equipo";
import { ESTADO_EQUIPO, TEMAS, type Tema } from "@/lib/soporte-comun";
import type { ResAdm } from "./acciones-colas";
import { sopDevolver, sopEscalar, sopLigar, sopMacroEstado, sopMacroGuardar, sopNota, sopOcultar, sopReabrir, sopResolver, sopResponder, sopTomar, sopTomarSiguiente, sopUnir } from "./acciones-soporte";
import { copilotoSugerir } from "./acciones-copiloto";
import type { BorradorCopiloto } from "@/lib/compa/copiloto";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { uuid } from "@/lib/uuid";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"QueueCard" | "AdminNote" | "AdminList" | "AuditLog" | "Button", ComponentType<any>>;
type Bi = { es: string; en: string };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const nuevaClave = () => (uuid());
const hace = (iso: string) => {
  const m = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "ahora" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.floor(m / 60)} h` : `hace ${Math.floor(m / 1440)} d`;
};
const fecha = (iso: string | null) => (iso ? new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "") : "—");
const ORIGEN: Record<string, string> = { form: "App · formulario", panel: "Panel del negocio", compa: "El Compa", reporte_app: "App · Reportar un problema" };
const OPST: Record<string, string> = { pending: "pendiente", change_proposed: "con un cambio propuesto", confirmed: "confirmado", declined: "no aceptado", expired: "sin respuesta", cancelled: "cancelado", done: "terminado" };
const vence = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 3 * 3_600_000) return `vence en ${ms < 3_600_000 ? `${Math.max(1, Math.round(ms / 60000))} min` : `${Math.round(ms / 3_600_000)} h`}`;
  return `vence ${new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "")}`;
};
const VERBO_SOP: Record<string, string> = { "soporte.tomar": "tomó el caso", "soporte.responder": "respondió", "soporte.nota": "dejó una nota interna", "soporte.resolver": "resolvió",
  "soporte.devolver": "resolvió y devolvió", "soporte.escalar": "lo pasó", "soporte.unir": "lo unió a otro caso", "soporte.reabrir": "lo reabrió", "soporte.ligar": "lo ligó",
  "soporte.ocultar": "ocultó un mensaje", "soporte.foto.ver": "vio una foto del caso" };
const KIND: Record<string, string> = { order: "Pedido", market_order: "Pedido del mercado", hold: "Apartado", appointment: "Cita", table: "Reservación", party: "Fiesta", trip: "Viaje", night: "Noche", enrollment: "Inscripción", visit: "Visita", tickets: "Boletos", private_event: "Evento privado", quote: "Cotización", rental: "Renta" };
const SISTEMA: Record<string, (v: Record<string, string>) => string> = {
  recibido: (v) => `Aviso automático: recibimos el caso y le dijimos que responde una persona ${v.es ?? "pronto"}.`, resuelto_usuario: () => "La persona lo marcó como resuelto.",
  resuelto_equipo: () => "El equipo lo marcó como resuelto.", reabierto: () => "El equipo lo reabrió.", reabierto_usuario: () => "La persona dijo que NO se resolvió: volvió a la cola.",
  unido: (v) => `Se unió a ${v.num ?? ""}.`, unido_desde: (v) => `Se unió aquí ${v.num ?? ""}.`, devuelto: (v) => `Devueltos ${v.monto ?? ""} a su tarjeta.`,
  escalado: (v) => `Pasado a ${v.a === "admin" ? "un Admin" : "Finanzas"} por ${v.quien ?? "el equipo"}: ${v.motivo ?? ""}`, ligado: (v) => `Ligado a ${v.ref ?? ""} por ${v.quien ?? "el equipo"}.`, tomado: () => "Tomado.",
};

type Cop = Extract<BorradorCopiloto, { ok: true }> & { num: string };
export function SoporteAdmin({ tab, filas, sig, kpis, caso, plazo, macros, q, f, tema, horario, casoPedido, puede, copiloto = false }: {
  tab: TabSop | "macros"; filas: FilaSop[]; sig: string | null; kpis: { abiertos: number; vencidos: number; mios: number; equipo: number; esc: number; mediana: number | null; resueltos: number; si: number; no: number;
    plazo30?: { con: number; cumplido: number; vencido: number; casos: number; compa: number } };
  caso: CasoEquipo | null; plazo: string | null; macros: Macro[]; q: string; f: string | null; tema: Tema | null; horario: string; casoPedido: string | null;
  puede: { editar: boolean; aprobar: boolean; devolver: boolean; usr: boolean; neg: boolean; tx: boolean }; copiloto?: boolean;
}) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams();
  const w = useAncho(), desk = w >= 1024, lado = w >= 1200;
  const [toast, setToast] = useToast(), [conf, setConf] = useState<Confirmar | null>(null), [pend, start] = useTransition();
  const [v, setV] = useState(q), [resp, setResp] = useState(""), [macro, setMacro] = useState<string | null>(null), [modo, setModo] = useState<"persona" | "nota">("persona");
  const [edit, setEdit] = useState<{ key: string | null; tituloEs: string; tituloEn: string; textoEs: string; textoEn: string; tema: string; motivo: string } | null>(null);
  const [cop, setCop] = useState<Cop | null>(null), [copBusy, setCopBusy] = useState(false), [borrador, setBorrador] = useState<string | null>(null);
  useEffect(() => { setConf(null); setResp(""); setMacro(null); setModo("persona"); setCop(null); setBorrador(null); setCopBusy(false); }, [caso?.num]);
  // 7g · El borrador va al campo; nada se envía. Si el copiloto ya no está (lo apagaron o llegó al tope), la ficha vuelve a ser la de siempre.
  const sugerir = (num: string) => { setCopBusy(true); copilotoSugerir({ caso: num }).then((r) => {
    setCopBusy(false);
    if (!r.ok) { setToast(r.msg); if (r.apagado) router.refresh(); return; }
    setCop({ ...r, num }); setModo("persona"); setResp(r.borrador); setMacro(null); setBorrador(r.id); setToast("Revísalo antes de enviar: sale con tu nombre.");
  }, () => { setCopBusy(false); setToast("El Compa no está disponible ahora. Escribe tu respuesta."); }); };
  const ir = (p: Record<string, string | null>) => { const x = new URLSearchParams(sp.toString()); for (const [k, val] of Object.entries(p)) { if (val === null) x.delete(k); else x.set(k, val); } router.push(`${path}${x.size ? `?${x}` : ""}`, { scroll: false }); };
  const run = (fn: () => Promise<ResAdm>, after?: (r: ResAdm) => void) => start(async () => { const r = await fn(); setToast(r.mensaje ?? (r.ok ? "Listo. Quedó en la auditoría." : "")); if (r.ok) { after?.(r); router.refresh(); } });
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const temaL = (t: Tema) => TEMAS[t]?.corto.es ?? t;

  // ── Macros (pestaña) ──
  if (tab === "macros" && edit) {
    const ok = edit.tituloEs.trim() && edit.tituloEn.trim() && edit.textoEs.trim().length >= 10 && edit.textoEn.trim().length >= 10 && edit.motivo.trim().length >= 3;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }} data-screen-label="Soporte · macro">
        <PanelBloques bloques={[
          { type: "head", eye: "SOPORTE · MACROS", t: edit.key ? "Editar macro" : "Nueva macro", onBack: () => setEdit(null), h1: desk ? 26 : 22 },
          { type: "note", tone: "info", icon: "chat", t: "Texto plano en español y en inglés. {nombre} ({name} en inglés) se cambia solo por el nombre de la persona. Sin etiquetas ni enlaces de otros sitios." },
          { type: "field", k: "TÍTULO · ESPAÑOL", val: edit.tituloEs, onChange: (x) => setEdit({ ...edit, tituloEs: x }), max: 60, count: `${edit.tituloEs.length}/60` },
          { type: "field", k: "TÍTULO · INGLÉS", val: edit.tituloEn, onChange: (x) => setEdit({ ...edit, tituloEn: x }), max: 60, count: `${edit.tituloEn.length}/60` },
          { type: "field", k: "TEXTO · ESPAÑOL", val: edit.textoEs, onChange: (x) => setEdit({ ...edit, textoEs: x }), area: true, rows: 4, max: 1000, count: `${edit.textoEs.length}/1000` },
          { type: "field", k: "TEXTO · INGLÉS", val: edit.textoEn, onChange: (x) => setEdit({ ...edit, textoEn: x }), area: true, rows: 4, max: 1000, count: `${edit.textoEn.length}/1000` },
          { type: "chips", k: "TEMA (SALE PRIMERO EN ESOS CASOS)", items: [{ l: "Todos", v: !edit.tema ? "selected" : "filter", onClick: () => setEdit({ ...edit, tema: "" }) }, ...(Object.keys(TEMAS) as Tema[]).map((t) => ({ l: temaL(t), v: edit.tema === t ? "selected" : "filter", onClick: () => setEdit({ ...edit, tema: t }) }))] },
          { type: "field", k: "MOTIVO (QUEDA EN LA AUDITORÍA)", val: edit.motivo, onChange: (x) => setEdit({ ...edit, motivo: x }), max: 300 },
          { type: "acts", items: [{ l: pend ? "Guardando…" : "Guardar", v: "action", icon: "check", off: !ok || pend, onClick: () => run(() => sopMacroGuardar({ key: edit.key, tituloEs: edit.tituloEs, tituloEn: edit.tituloEn, textoEs: edit.textoEs, textoEn: edit.textoEn, tema: edit.tema || null }, edit.motivo), () => setEdit(null)) }, { l: "Volver", onClick: () => setEdit(null) }] },
        ]} />
        <Toast t={toast} desk={desk} />
      </div>
    );
  }
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: `SOPORTE${caso ? ` · ${caso.num}` : ""}`, t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );

  const cabeza: Bloque[] = [
    { type: "head", eye: "OPERAR", t: "Soporte", s: `Casos de vecinos y negocios con To'Latino. Cada caso trae su contexto (persona, negocio, operación) y las macros ES/EN responden en un toque. Plazo: horas del equipo (${horario}).`,
      act: puede.editar && tab !== "macros" ? { l: "Tomar el siguiente caso", v: "action", icon: "check", onClick: () => run(sopTomarSiguiente, (r) => { const n = (r as { numero?: string }).numero; if (r.ok && n) ir({ caso: n }); }) } : undefined, h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "ABIERTOS", v: String(kpis.abiertos), s: `${kpis.vencidos} fuera de plazo`, sFg: kpis.vencidos ? "var(--tl-danger)" : undefined, bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: "MÍOS", v: String(kpis.mios), s: "asignados a ti" },
      { k: "1.ª RESPUESTA", v: kpis.mediana == null ? "—" : kpis.mediana < 3600 ? `${Math.max(1, Math.round(kpis.mediana / 60))} min` : `${(kpis.mediana / 3600).toFixed(1)} h`, s: "mediana · 7 días" },
      { k: "RESUELTOS · 7 D", v: String(kpis.resueltos), s: kpis.si + kpis.no ? `¿Se resolvió? sí ${Math.round((kpis.si / (kpis.si + kpis.no)) * 100)} % · 30 d` : "¿Se resolvió?: sin respuestas" },
    ] },
    // 7i · El plazo en 30 días (de soporte_analitica_dia, sin personas): primera respuesta dentro de las horas hábiles del plazo.
    ...(kpis.plazo30 ? [{ type: "kv" as const, cols: desk ? 3 : 1, items: [
      { k: "PLAZO CUMPLIDO · 30 D", v: kpis.plazo30.con ? `${Math.round((kpis.plazo30.cumplido / kpis.plazo30.con) * 100)} % · ${kpis.plazo30.cumplido} de ${kpis.plazo30.con} con respuesta` : "—" },
      { k: "FUERA DE PLAZO · 30 D", v: `${kpis.plazo30.vencido} de ${kpis.plazo30.casos} casos`, fg: kpis.plazo30.vencido ? "var(--tl-danger)" : undefined },
      { k: "DESDE EL COMPA", v: `${kpis.plazo30.compa} de ${kpis.plazo30.casos} casos en 30 días` }] }] : []),
    { type: "tabs", items: ([["open", "Abiertos", kpis.abiertos], ["mine", "Míos", kpis.mios], ["esc", "Escalados", kpis.esc], ["res", "Resueltos"], ["macros", "Macros"]] as [string, string, number?][])
      .map(([k, l, n]) => ({ l, n: n ? String(n) : undefined, on: tab === k, onClick: () => ir({ tab: k === "open" ? null : k, caso: null, antes: null }) })) },
  ];
  if (tab === "macros") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-screen-label="Soporte · macros">
        <PanelBloques bloques={[...cabeza,
          { type: "note", tone: "info", icon: "chat", t: "Las macros salen como atajos al responder un caso. {nombre} se cambia solo por el nombre de la persona. Apagar una la quita de las respuestas; no se borra." },
          ...(puede.aprobar ? [{ type: "acts" as const, items: [{ l: "Nueva macro", v: "action", icon: "plus", onClick: () => setEdit({ key: null, tituloEs: "", tituloEn: "", textoEs: "", textoEn: "", tema: "", motivo: "" }) }] }] : []),
          { type: "rows", items: macros.map((m) => ({ key: m.key, icon: "chat", t: `${m.title.es} · ${m.title.en}`, s: `${m.body.es}\n${m.body.en}`, m: `${m.topic ? temaL(m.topic).toUpperCase() + " · " : ""}${m.quien ? `${m.quien.toUpperCase()} · ` : ""}${fecha(m.at).toUpperCase()}`,
            tag: m.on ? null : "APAGADA", tone: "neutral", dim: !m.on,
            acts: puede.aprobar ? [{ l: "Editar", icon: "edit", onClick: () => setEdit({ key: m.key, tituloEs: m.title.es, tituloEn: m.title.en, textoEs: m.body.es, textoEn: m.body.en, tema: m.topic ?? "", motivo: "" }) },
              { l: m.on ? "Apagar" : "Encender", icon: m.on ? "close" : "check", onClick: () => setConf({ titulo: m.on ? `Apagar «${m.title.es}»` : `Encender «${m.title.es}»`, sub: "Queda en la auditoría.", hacer: (mo) => sopMacroEstado(m.key, !m.on, mo) }) }] : undefined })) },
        ]} />
        <Toast t={toast} desk={desk} />
      </div>
    );
  }

  const lista: Bloque[] = [...cabeza,
    { type: "search", val: v, ph: "Buscar: TK-…, nombre o negocio", onChange: (x) => setV(x), onClear: v ? () => { setV(""); ir({ q: null }); } : undefined, link: "Buscar", onLink: () => ir({ q: v.trim() || null, antes: null }) },
    { type: "chips", items: [["alta", "Alta"], ["venc", "Vencidos"]].map(([k, l]) => ({ l: l!, v: f === k ? "selected" : "filter", onClick: () => ir({ f: f === k ? null : k! }) }))
      .concat((["pago", "cuenta", "negocio", "tecnico", "pedido", "cita", "seguridad"] as Tema[]).map((t) => ({ l: temaL(t), v: tema === t ? "selected" : "filter", onClick: () => ir({ tema: tema === t ? null : t }) }))) },
  ];
  const ancho = desk && !(lado && caso);
  const tarjetas = filas.length ? filas.map((x) => {
    const estado = x.status === "resolved" || x.status === "merged" ? "ok" : !x.equipo ? "ok" : x.vencido ? "late" : x.r >= 0.7 ? "soon" : "ok";
    const sla = x.status === "resolved" ? "RESUELTO" : x.status === "merged" ? "UNIDO" : !x.equipo ? "ESPERA A LA PERSONA" : x.vencido ? `VENCIDO · ${hace(x.due)}` : vence(x.due);
    return <div key={x.num} data-tk={x.num}><A.QueueCard icon={x.escalado ? "card" : "chat"} state={estado} title={x.titulo || "(sin texto)"}
      sub={`${x.num} · ${temaL(x.tema)} · ${x.negocio ? `${x.negocio} · ` : ""}${x.quien}`} meta={`${(ESTADO_EQUIPO[x.status]?.es ?? x.status).toUpperCase()}${x.escalado ? ` · A ${x.escalado === "admin" ? "ADMIN" : "FINANZAS"}` : ""}`}
      priority={x.priority === "alta" ? "ALTA" : undefined} who={{ name: x.quien, initials: x.quien.slice(0, 1) }} sla={sla} assignee={x.asignado ? { name: x.asignado } : undefined}
      wide={ancho} columns={ancho ? "40px minmax(0,1.6fr) minmax(0,1fr) auto" : "40px minmax(0,1fr) auto"} active={caso?.num === x.num} onClick={() => ir({ caso: x.num })} /></div>;
  }) : [<PanelBloques key="v" bloques={[{ type: "empty", icon: "help", t: "Nada aquí", s: tab === "mine" ? "No tienes casos asignados. Toma uno de Abiertos." : "Bandeja limpia con estos filtros." }]} />];

  const detalle = caso ? ficha(caso) : casoPedido ? <PanelBloques bloques={[{ type: "empty", icon: "help", t: "Ese caso no existe", s: "O es de una ciudad que no ves." }]} /> : null;
  function ficha(k: CasoEquipo): ReactNode {
    const titulo = k.msjs.find((m) => m.sender === "user" && m.body)?.body?.slice(0, 90) ?? k.num, abierto = k.status !== "resolved" && k.status !== "merged";
    const B: Bloque[] = [{ type: "head", eye: `SOPORTE · ${k.num} · ${temaL(k.tema).toUpperCase()}`, t: titulo, h1: 22, onBack: lado ? undefined : () => ir({ caso: null }) }];
    const notas: ReactNode[] = [];
    if (k.escalado) notas.push(<A.AdminNote key="e" tone="warn" icon="card">{`Pasado a ${k.escalado === "admin" ? "un Admin" : "Finanzas"}: prioridad alta, sin asignar hasta que lo tomen.`}</A.AdminNote>);
    if (abierto && k.asignado && !k.mio) notas.push(<A.AdminNote key="a" tone="warn" icon="users" cta={puede.editar ? "Tomarlo" : undefined} onCta={() => run(() => sopTomar(k.num))}>{`Lo está viendo ${k.asignado.nombre}.`}</A.AdminNote>);
    else if (abierto && !k.asignado && puede.editar) notas.push(<A.AdminNote key="a" tone="info" icon="users" cta="Tomar" onCta={() => run(() => sopTomar(k.num))}>Sin asignar. Tómalo: la persona ve «Lo están viendo».</A.AdminNote>);
    if (k.vencido) notas.push(<A.AdminNote key="v" tone="bad" icon="clock">{`Fuera de plazo: venció ${fecha(k.due)} (${k.horas} h hábiles).`}</A.AdminNote>);
    if (k.status === "merged") notas.push(<A.AdminNote key="u" tone="info" icon="share" cta="Ir" onCta={() => ir({ caso: k.unidoA })}>{`Unido a ${k.unidoA}. La persona sigue ahí.`}</A.AdminNote>);
    if (!puede.editar) notas.push(<A.AdminNote key="p" tone="warn" icon="lock">{puede.devolver ? "Tu rol ve Soporte y devuelve dinero; no responde ni toma casos." : "Tu rol solo puede ver Soporte."}</A.AdminNote>);
    if (k.summary) notas.push(<A.AdminNote key="s" tone="info" icon="help">{k.summary}</A.AdminNote>);
    const kv: Bloque = { type: "kv", cols: 2, items: [
      { k: "CANAL", v: ORIGEN[k.origin] ?? k.origin }, { k: "PRIORIDAD", v: k.priority === "alta" ? "Alta" : "Normal", fg: k.priority === "alta" ? "var(--tl-danger)" : undefined },
      { k: "ESTADO", v: ESTADO_EQUIPO[k.status]?.es ?? k.status }, { k: "PLAZO", v: k.equipo ? `${k.vencido ? "Venció" : "Vence"} ${plazo ?? fecha(k.due)}` : "Le toca a la persona", fg: k.vencido ? "var(--tl-danger)" : undefined },
      { k: "ABIERTO", v: fecha(k.at) }, { k: "1.ª RESPUESTA", v: fecha(k.primeraRespuesta) },
      ...(k.status === "resolved" ? [{ k: "¿SE RESOLVIÓ?", v: k.csat === "yes" ? "Sí" : k.csat === "no" ? "No" : "Sin respuesta" }] : []),
      ...(k.enlazado ? [{ k: "ENLAZADO A", v: k.enlazado }] : []), ...(k.unidos.length ? [{ k: "UNIDOS AQUÍ", v: k.unidos.join(", ") }] : []),
    ] };
    const ctx = [
      { icon: "users", title: k.persona.nombre, sub: `${k.persona.tel} · ${k.persona.ciudad ?? "Sin ciudad"} · ${k.persona.lang === "en" ? "inglés" : "español"} · ${k.persona.casos} ${k.persona.casos === 1 ? "caso" : "casos"}${k.persona.estado !== "active" ? ` · cuenta ${k.persona.estado}` : ""}`, chevron: puede.usr, onClick: puede.usr ? () => router.push(`/admin/usuarios/${k.persona.id}`) : undefined },
      ...(k.negocio ? [{ icon: "store", title: k.negocio.name, sub: "Lo abrió desde el panel del negocio", chevron: puede.neg, onClick: puede.neg ? () => router.push(`/admin/negocios/${k.negocio!.id}`) : undefined }] : []),
      ...(k.op ? [{ icon: "bag", title: `${KIND[k.op.kind] ?? "Operación"} ${/^\d/.test(k.op.num) ? "#" : ""}${k.op.num} · ${k.op.biz}`, sub: `${money(k.op.total)} · ${OPST[k.op.status] ?? k.op.status}` }] : []),
      ...(k.ayuda ? [{ icon: "help", title: `Ayuda ${k.ayuda.num}`, sub: `${k.ayuda.status === "escalated" ? "En la cola de ayudas" : k.ayuda.status} · ${k.ayuda.opnum}`, chevron: true, onClick: () => router.push("/admin/colas?cola=sop") }] : []),
      { icon: "phone", title: k.device ? `${k.device} · ${k.version ?? "web"}` : "Dispositivo sin datos", sub: "DISPOSITIVO Y VERSIÓN" },
    ];
    const hilo = k.msjs.map((m: MsjEquipo) => ({
      t: m.sender === "system" ? SISTEMA[m.sys_key ?? ""]?.(m.vars ?? {}) ?? "" : `${m.oculto ? `[Oculto: ${m.motivoOculto ?? ""}] ` : ""}${m.body ?? ""}${m.foto ? " · [foto]" : ""}`,
      mine: m.sender === "staff", soft: m.internal || m.sender === "system",
      m: `${m.internal ? "NOTA INTERNA · " : m.sender === "system" ? "SISTEMA · " : ""}${(m.quien ?? (m.sender === "user" ? k.persona.nombre : "To'Latino")).toUpperCase()}${m.macro ? " · MACRO" : ""} · ${hace(m.at).toUpperCase()}`,
    })).filter((x) => x.t);
    const fotos = k.msjs.filter((m) => m.foto && !m.oculto);
    const pago = k.pago, queda = pago ? pago.amount - pago.devuelto : 0, topeQueda = k.tope == null ? null : Math.max(0, k.tope - k.devueltoCaso);
    const out: ReactNode[] = [<PanelBloques key="h" bloques={B} />, ...notas, <PanelBloques key="kv" bloques={[kv, { type: "group", k: "CONTEXTO" }]} />, <A.AdminList key="ctx" rows={ctx} />];
    if (pago) out.push(<PanelBloques key="pago" bloques={[{ type: "group", k: "LO PAGADO EN LA APP" }, { type: "kv", cols: 2, items: [
      { k: "COBRADO", v: money(pago.amount) }, { k: "YA DEVUELTO", v: money(pago.devuelto) }, { k: "TARJETA", v: pago.tarjeta ?? "—" },
      { k: "TU TOPE EN ESTE CASO", v: k.tope == null ? `Hasta lo cobrado (${money(queda)})` : k.tope === 0 ? "Tu rol no devuelve" : `${money(topeQueda ?? 0)} de ${money(k.tope)}` }] }]} />);
    if (k.devoluciones.length) out.push(<A.AdminList key="dev" rows={k.devoluciones.map((d) => ({ icon: "card", title: `${money(d.monto)} · ${d.status === "done" ? "devuelto" : d.status === "failed" ? "no se pudo" : "en camino"}`, sub: `${d.quien ?? "Equipo"}${d.rol ? ` (${d.rol})` : ""} · ${fecha(d.at)}` }))} />);
    // 8f · «Reportar un problema»: el registro técnico que mandó el teléfono al tocar «Enviar» (familias de pantalla, errores, señal; tapado).
    if (k.registro) out.push(<PanelBloques key="reg" bloques={[{ type: "group", k: "REGISTRO DE LA APP · LO QUE MANDÓ EL TELÉFONO" },
      { type: "kv", cols: 2, items: [{ k: "SISTEMA", v: k.registro.sistema ?? "—" }, { k: "MODELO", v: k.registro.modelo ?? "—" }, { k: "CAPTURA", v: k.registro.captura === "agitar" ? "De la pantalla (agitar)" : k.registro.captura === "archivo" ? "Un archivo que eligió" : "Sin captura" }, { k: "LÍNEAS", v: String(k.registro.lineas.length) }] },
      k.registro.purgado ? { type: "note", tone: "info", icon: "info", t: "Se borró: la cuenta se cerró hace más de 30 días." }
        : k.registro.lineas.length ? { type: "timeline", items: k.registro.lineas.slice(-60).map((l) => ({ t: l.slice(9), s: l.slice(0, 8) })) } : { type: "note", tone: "info", icon: "info", t: "El teléfono no tenía pantallas anotadas." }]} />);
    out.push(<PanelBloques key="hilo" bloques={[{ type: "group", k: "CONVERSACIÓN" }, { type: "thread", items: hilo }]} />);
    if (fotos.length) out.push(<A.AdminList key="fotos" rows={fotos.map((m) => ({ icon: "image", title: "Foto del caso", sub: `${(m.quien ?? k.persona.nombre)} · ${fecha(m.at)} · se abre aparte y queda en la auditoría`, chevron: true, onClick: () => window.open(m.foto!, "_blank", "noopener") }))} />);
    if (abierto && puede.editar) {
      const mac = [...k.macros].sort((a, b) => Number(b.topic === k.tema) - Number(a.topic === k.tema));
      const nombre = k.persona.nombre.split(" ")[0] ?? "";
      out.push(<PanelBloques key="resp" bloques={[
        { type: "chips", k: "ESCRIBIR", items: [{ l: "A la persona", v: modo === "persona" ? "selected" : "filter", onClick: () => setModo("persona") }, { l: "Nota interna (solo el equipo)", v: modo === "nota" ? "selected" : "filter", onClick: () => { setModo("nota"); setBorrador(null); } }] },
        ...(modo === "persona" && mac.length ? [{ type: "chips" as const, k: "MACROS", items: mac.map((m) => ({ l: m.title.es, v: macro === m.key ? "selected" : "filter", onClick: () => { setMacro(m.key); setBorrador(null); setResp((k.persona.lang === "en" ? m.body.en : m.body.es).replace(/\{nombre\}|\{name\}/g, nombre)); } })) }] : []),
        // 7g · El copiloto: la nota con el resumen y el siguiente paso, y el botón. Solo para «A la persona»; el borrador va al campo.
        ...(modo === "persona" && copiloto && cop && cop.num === k.num ? [{ type: "note" as const, tone: "info" as const, icon: "help",
          t: `EL COMPA · ${cop.resumen}${cop.siguiente ? ` Siguiente paso: ${cop.siguiente}` : ""}${cop.macro ? ` Macro que encaja: «${cop.macro.titulo}».` : ""}${cop.devolver ? " Si corresponde devolver, «Resolver y devolver» lo decides tú." : ""}${cop.ai ? "" : " (sin IA: borrador de reglas)"}`,
          ...(cop.fuente ? { cta: `Ayuda: ${cop.fuente.titulo.es}`, onCta: () => window.open(cop.fuente!.href, "_blank", "noopener") } : {}) }] : []),
        ...(modo === "persona" && copiloto ? [{ type: "acts" as const, items: [{ l: copBusy ? "El Compa está escribiendo…" : cop && cop.num === k.num ? "Otro borrador con El Compa" : "Sugerir respuesta con El Compa", v: "secondary", icon: "help", off: copBusy || pend, onClick: () => sugerir(k.num) }] }] : []),
        { type: "field", k: modo === "persona" ? "RESPUESTA" : "NOTA INTERNA", val: resp, onChange: (x) => { setResp(x); if (!x) { setMacro(null); setBorrador(null); } }, area: true, rows: 3, max: 2000, count: `${resp.length}/2000`,
          ph: modo === "persona" ? "Escríbele como vecino, no como robot." : "Lo que el equipo necesita saber. La persona nunca lo ve." },
        { type: "acts", items: [
          { l: pend ? "Enviando…" : modo === "persona" ? "Enviar" : "Guardar nota", v: "action", icon: modo === "persona" ? "right" : "edit", off: !resp.trim() || pend,
            onClick: () => run(() => (modo === "persona" ? sopResponder(k.num, resp, macro, borrador) : sopNota(k.num, resp)), () => { setResp(""); setMacro(null); if (modo === "persona") { setBorrador(null); setCop(null); } }) },
          { l: "Resolver", icon: "check", onClick: () => setConf({ titulo: "¿Cómo se resolvió?", sub: "Lo lee la persona en su caso; después le preguntamos si se resolvió.", plantillas: resp.trim() ? [resp.trim().slice(0, 300)] : [], hacer: (m) => sopResolver(k.num, m) }) },
        ] },
      ]} />);
    }
    if (abierto && puede.devolver && k.puedeDevolver && pago && queda > 0) {
      out.push(<PanelBloques key="dev2" bloques={[{ type: "acts", items: [{ l: "Resolver y devolver", icon: "card", onClick: () => { const clave = nuevaClave(); setConf({
        titulo: "Resolver y devolver", sub: `A su ${pago.tarjeta ?? "tarjeta"}. Cobrado ${money(pago.amount)}, ya devuelto ${money(pago.devuelto)}. ${k.tope == null ? "Tu rol devuelve hasta lo cobrado." : `Tu rol devuelve hasta ${money(k.tope)} por caso${k.devueltoCaso ? ` (ya ${money(k.devueltoCaso)})` : ""}; más, Finanzas o un Admin.`} El mensaje lo lee la persona.`,
        valor: { k: "MONTO A DEVOLVER (USD)", ini: "", max: 9 }, plantillas: ["Tienes razón. Te devolvemos lo cobrado de más a tu tarjeta: lo ves en 3 a 5 días hábiles."], cta: "Resolver y devolver", peligro: true,
        hacer: (m, _e, monto) => sopDevolver(k.num, monto, clave, m) }); } }] }]} />);
    }
    if (abierto && puede.editar) {
      out.push(<PanelBloques key="mas" bloques={[{ type: "acts", items: [
        { l: "Pasar a Finanzas", icon: "card", onClick: () => setConf({ titulo: "¿A quién se pasa?", sub: "Sube a prioridad alta y sale primero en Escalados. Queda como nota interna.", elegir: { label: "A QUIÉN", items: [{ k: "finanzas", l: "Finanzas" }, { k: "admin", l: "Un Admin" }] },
          plantillas: ["Hay que devolver más del tope de Soporte", "Es un cobro que no reconoce", "Pagos del negocio retenidos"], hacer: (m, a) => sopEscalar(k.num, a ?? "", m) }) },
        { l: "Ligar a una operación", icon: "share", onClick: () => setConf({ titulo: "Ligar a un pedido, una cita o una ayuda", sub: "Solo de esta persona (o de su negocio). Queda como nota interna.", valor: { k: "NÚMERO (1234, C-5678, H-90)", ini: "", max: 20 }, plantillas: ["Es la operación de la que habla"], hacer: (m, _e, ref) => sopLigar(k.num, ref, m) }) },
        { l: "Unir a otro caso", icon: "users", onClick: () => setConf({ titulo: "Unir este caso a otro", sub: "Solo casos de la misma persona. Este queda «unido» con su enlace; nada se borra.", valor: { k: "EL OTRO CASO (TK-…)", ini: "TK-", max: 20 }, plantillas: ["Es el mismo problema"], hacer: (m, _e, d) => sopUnir(k.num, d, m) }) },
      ] }]} />);
    }
    if (puede.aprobar) {
      const ocultables = k.msjs.filter((m) => m.sender !== "system" && !m.oculto && m.body);
      if (ocultables.length) out.push(<PanelBloques key="oc" bloques={[{ type: "acts", items: [{ l: "Ocultar un mensaje", icon: "ban", onClick: () => setConf({ titulo: "Ocultar el texto de un mensaje", sub: "La persona ve «Mensaje oculto por el equipo». El texto no se borra; el motivo queda en la auditoría.",
        elegir: { label: "¿CUÁL?", items: ocultables.map((m) => ({ k: m.id, l: `${m.internal ? "Nota · " : ""}${m.quien ?? "—"}: ${(m.body ?? "").slice(0, 60)}` })) }, plantillas: ["Trae datos que no se guardan (cuenta, código, contraseña)", "Ofensivo"], peligro: true, hacer: (m, id) => sopOcultar(k.num, id ?? "", m) }) }] }]} />);
    }
    if (k.status === "resolved" && puede.editar) out.push(<PanelBloques key="re" bloques={[{ type: "acts", items: [{ l: "Reabrir", icon: "edit", onClick: () => setConf({ titulo: "¿Por qué se reabre?", sub: "Vuelve a la cola con plazo nuevo.", plantillas: ["La persona escribió de nuevo", "Falta un paso"], hacer: (m) => sopReabrir(k.num, m) }) }] }]} />);
    out.push(<PanelBloques key="hg" bloques={[{ type: "group", k: "HISTORIAL" }]} />);
    out.push(k.historial.length ? <A.AuditLog key="hist" rows={k.historial.map((x) => ({ who: x.quien ?? "Equipo", initials: (x.quien ?? "E").slice(0, 1), action: VERBO_SOP[x.action] ?? x.action.replace("soporte.", ""), before: x.before ? JSON.stringify(x.before).replace(/[{}"]/g, "").replace(/:/g, ": ").replace(/,/g, " · ") : undefined, after: x.after ? JSON.stringify(x.after).replace(/[{}"]/g, "").replace(/:/g, ": ").replace(/,/g, " · ") : undefined, why: x.reason ?? undefined, when: hace(x.at) }))} />
      : <A.AdminNote key="hist" tone="info" icon="folder">Nadie del equipo ha hecho cambios aquí todavía.</A.AdminNote>);
    return <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-screen-label="Soporte · caso" data-tk-abierto={k.num}>{out}</div>;
  }

  const colLista = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }} data-screen-label="Soporte · lista">
      <PanelBloques bloques={lista} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{tarjetas}</div>
      {sig ? <div style={{ display: "flex" }}><A.Button variant="secondary" size="md" onClick={() => ir({ antes: sig })}>Ver más</A.Button></div> : null}
      {tab === "open" ? <PanelBloques bloques={[{ type: "note", tone: "ink", icon: "help", t: "Las ayudas con un pedido, una cita o un boleto que el negocio no respondió están en Colas › Ayuda con pedidos y citas.", cta: "Abrir", onCta: () => router.push("/admin/colas?cola=sop") }]} /> : null}
    </div>
  );
  return (
    <>
      {detalle && !lado ? detalle : (
        <div style={{ display: "grid", gridTemplateColumns: detalle && lado ? "minmax(0,1fr) minmax(0,1.1fr)" : "minmax(0,1fr)", gap: 24, alignItems: "start" }}>
          {colLista}
          {detalle && lado ? <div style={{ position: "sticky", top: 16 }}>{detalle}</div> : null}
        </div>
      )}
      <Toast t={toast} desk={desk} />
    </>
  );
}
