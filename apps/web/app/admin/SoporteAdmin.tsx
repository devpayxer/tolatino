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
import type { CorreoEntrante } from "@/lib/correo/entrante";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { uuid } from "@/lib/uuid";
import { useAhora } from "@/lib/ahora";
import { useE2 } from "./idioma-admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"QueueCard" | "AdminNote" | "AdminList" | "AuditLog" | "Button", ComponentType<any>>;
type Bi = { es: string; en: string };
type EF = (es: string, en: string) => string;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const nuevaClave = () => (uuid());
const hace = (iso: string, ahora: number, E2: EF) => {
  const m = Math.floor(Math.max(0, ahora - new Date(iso).getTime()) / 60000);
  return m < 1 ? E2("ahora", "now") : m < 60 ? E2(`hace ${m} min`, `${m} min ago`) : m < 1440 ? E2(`hace ${Math.floor(m / 60)} h`, `${Math.floor(m / 60)} h ago`) : E2(`hace ${Math.floor(m / 1440)} d`, `${Math.floor(m / 1440)} d ago`);
};
const fecha = (iso: string | null, en = false) => (iso ? new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "") : "—");
const ORIGEN = (E2: EF): Record<string, string> => ({
  form: E2("App · formulario", "App · form"), panel: E2("Panel del negocio", "Business panel"), compa: "El Compa",
  reporte_app: E2("App · Reportar un problema", "App · Report a problem"), correo: E2("Correo a Soporte", "Email to Support")
});
const OPST = (E2: EF): Record<string, string> => ({ pending: E2("pendiente", "pending"), change_proposed: E2("con un cambio propuesto", "with a proposed change"), confirmed: E2("confirmado", "confirmed"), declined: E2("no aceptado", "declined"), expired: E2("sin respuesta", "no response"), cancelled: E2("cancelado", "canceled"), done: E2("terminado", "done") });
const vence = (iso: string, E2: EF, en = false) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 3 * 3_600_000) { const t = ms < 3_600_000 ? `${Math.max(1, Math.round(ms / 60000))} min` : `${Math.round(ms / 3_600_000)} h`; return E2(`vence en ${t}`, `due in ${t}`); }
  const d = new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");
  return E2(`vence ${d}`, `due ${d}`);
};
const VERBO_SOP = (E2: EF): Record<string, string> => ({ "soporte.tomar": E2("tomó el caso", "took the case"), "soporte.responder": E2("respondió", "replied"), "soporte.nota": E2("dejó una nota interna", "left an internal note"), "soporte.resolver": E2("resolvió", "resolved"),
  "soporte.devolver": E2("resolvió y devolvió", "resolved and refunded"), "soporte.escalar": E2("lo pasó", "escalated it"), "soporte.unir": E2("lo unió a otro caso", "merged it into another case"), "soporte.reabrir": E2("lo reabrió", "reopened it"), "soporte.ligar": E2("lo ligó", "linked it"),
  "soporte.ocultar": E2("ocultó un mensaje", "hid a message"), "soporte.foto.ver": E2("vio una foto del caso", "viewed a case photo") });
const KIND = (E2: EF): Record<string, string> => ({ order: E2("Pedido", "Order"), market_order: E2("Pedido del mercado", "Market order"), hold: E2("Apartado", "Hold"), appointment: E2("Cita", "Appointment"), table: E2("Reservación", "Reservation"), party: E2("Fiesta", "Party"), trip: E2("Viaje", "Trip"), night: E2("Noche", "Night"), enrollment: E2("Inscripción", "Enrollment"), visit: E2("Visita", "Visit"), tickets: E2("Boletos", "Tickets"), private_event: E2("Evento privado", "Private event"), quote: E2("Cotización", "Quote"), rental: E2("Renta", "Rental") });
const SISTEMA = (E2: EF, en: boolean): Record<string, (v: Record<string, string>) => string> => ({
  recibido: (v) => E2(`Aviso automático: recibimos el caso y le dijimos que responde una persona ${v.es ?? "pronto"}.`, `Automatic notice: we got the case and told them a person will reply ${(en ? v.en ?? v.es : v.es) ?? "soon"}.`), resuelto_usuario: () => E2("La persona lo marcó como resuelto.", "The person marked it as resolved."),
  resuelto_equipo: () => E2("El equipo lo marcó como resuelto.", "The team marked it as resolved."), reabierto: () => E2("El equipo lo reabrió.", "The team reopened it."), reabierto_usuario: () => E2("La persona dijo que NO se resolvió: volvió a la cola.", "The person said it was NOT resolved: it went back to the queue."),
  unido: (v) => E2(`Se unió a ${v.num ?? ""}.`, `Merged into ${v.num ?? ""}.`), unido_desde: (v) => E2(`Se unió aquí ${v.num ?? ""}.`, `${v.num ?? ""} was merged here.`), devuelto: (v) => E2(`Devueltos ${v.monto ?? ""} a su tarjeta.`, `${v.monto ?? ""} refunded to their card.`),
  escalado: (v) => E2(`Pasado a ${v.a === "admin" ? "un Admin" : "Finanzas"} por ${v.quien ?? "el equipo"}: ${v.motivo ?? ""}`, `Escalated to ${v.a === "admin" ? "an Admin" : "Finance"} by ${v.quien ?? "the team"}: ${v.motivo ?? ""}`), ligado: (v) => E2(`Ligado a ${v.ref ?? ""} por ${v.quien ?? "el equipo"}.`, `Linked to ${v.ref ?? ""} by ${v.quien ?? "the team"}.`), tomado: () => E2("Tomado.", "Taken."),
});

type Cop = Extract<BorradorCopiloto, { ok: true }> & { num: string };
export function SoporteAdmin({ tab, filas, sig, kpis, caso, plazo, macros, q, f, tema, horario, casoPedido, puede, copiloto = false, correos = [] }: {
  tab: TabSop | "macros" | "correo"; correos?: CorreoEntrante[]; filas: FilaSop[]; sig: string | null; kpis: { abiertos: number; vencidos: number; mios: number; equipo: number; esc: number; mediana: number | null; resueltos: number; si: number; no: number;
    plazo30?: { con: number; cumplido: number; vencido: number; casos: number; compa: number } };
  caso: CasoEquipo | null; plazo: string | null; macros: Macro[]; q: string; f: string | null; tema: Tema | null; horario: string; casoPedido: string | null;
  puede: { editar: boolean; aprobar: boolean; devolver: boolean; usr: boolean; neg: boolean; tx: boolean }; copiloto?: boolean;
}) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), path = usePathname(), sp = useSearchParams();
  const w = useAncho(), desk = w >= 1024, lado = w >= 1200;
  const { E2 } = useE2(), en = E2("", "x") === "x", tx = (x: Bi) => (en ? x.en || x.es : x.es), fe = (iso: string | null) => fecha(iso, en), hc = (iso: string) => hace(iso, ahora, E2);
  const origen = ORIGEN(E2), opst = OPST(E2), verbo = VERBO_SOP(E2), kind = KIND(E2), sistema = SISTEMA(E2, en);
  const [toast, setToast] = useToast(), [conf, setConf] = useState<Confirmar | null>(null), [pend, start] = useTransition();
  const [v, setV] = useState(q), [resp, setResp] = useState(""), [macro, setMacro] = useState<string | null>(null), [modo, setModo] = useState<"persona" | "nota">("persona");
  const [edit, setEdit] = useState<{ key: string | null; tituloEs: string; tituloEn: string; textoEs: string; textoEn: string; tema: string; motivo: string } | null>(null);
  const [cop, setCop] = useState<Cop | null>(null), [copBusy, setCopBusy] = useState(false), [borrador, setBorrador] = useState<string | null>(null);
  useEffect(() => { setConf(null); setResp(""); setMacro(null); setModo("persona"); setCop(null); setBorrador(null); setCopBusy(false); }, [caso?.num]);
  // 7g · El borrador va al campo; nada se envía. Si el copiloto ya no está (lo apagaron o llegó al tope), la ficha vuelve a ser la de siempre.
  const sugerir = (num: string) => { setCopBusy(true); copilotoSugerir({ caso: num }).then((r) => {
    setCopBusy(false);
    if (!r.ok) { setToast(r.msg); if (r.apagado) router.refresh(); return; }
    setCop({ ...r, num }); setModo("persona"); setResp(r.borrador); setMacro(null); setBorrador(r.id); setToast(E2("Revísalo antes de enviar: sale con tu nombre.", "Review it before sending: it goes out with your name."));
  }, () => { setCopBusy(false); setToast(E2("El Compa no está disponible ahora. Escribe tu respuesta.", "El Compa isn’t available right now. Write your reply.")); }); };
  const ir = (p: Record<string, string | null>) => { const x = new URLSearchParams(sp.toString()); for (const [k, val] of Object.entries(p)) { if (val === null) x.delete(k); else x.set(k, val); } router.push(`${path}${x.size ? `?${x}` : ""}`, { scroll: false }); };
  const run = (fn: () => Promise<ResAdm>, after?: (r: ResAdm) => void) => start(async () => { const r = await fn(); setToast(r.mensaje ?? (r.ok ? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.") : "")); if (r.ok) { after?.(r); router.refresh(); } });
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  const temaL = (t: Tema) => (TEMAS[t] ? tx(TEMAS[t].corto) : t);

  // ── Macros (pestaña) ──
  if (tab === "macros" && edit) {
    const ok = edit.tituloEs.trim() && edit.tituloEn.trim() && edit.textoEs.trim().length >= 10 && edit.textoEn.trim().length >= 10 && edit.motivo.trim().length >= 3;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }} data-screen-label="Soporte · macro">
        <PanelBloques bloques={[
          { type: "head", eye: E2("SOPORTE · MACROS", "SUPPORT · MACROS"), t: edit.key ? E2("Editar macro", "Edit macro") : E2("Nueva macro", "New macro"), onBack: () => setEdit(null), h1: desk ? 26 : 22 },
          { type: "note", tone: "info", icon: "chat", t: E2("Texto plano en español y en inglés. {nombre} ({name} en inglés) se cambia solo por el nombre de la persona. Sin etiquetas ni enlaces de otros sitios.", "Plain text in Spanish and English. {nombre} ({name} in English) is replaced automatically with the person’s name. No tags or links to other sites.") },
          { type: "field", k: E2("TÍTULO · ESPAÑOL", "TITLE · SPANISH"), val: edit.tituloEs, onChange: (x) => setEdit({ ...edit, tituloEs: x }), max: 60, count: `${edit.tituloEs.length}/60` },
          { type: "field", k: E2("TÍTULO · INGLÉS", "TITLE · ENGLISH"), val: edit.tituloEn, onChange: (x) => setEdit({ ...edit, tituloEn: x }), max: 60, count: `${edit.tituloEn.length}/60` },
          { type: "field", k: E2("TEXTO · ESPAÑOL", "TEXT · SPANISH"), val: edit.textoEs, onChange: (x) => setEdit({ ...edit, textoEs: x }), area: true, rows: 4, max: 1000, count: `${edit.textoEs.length}/1000` },
          { type: "field", k: E2("TEXTO · INGLÉS", "TEXT · ENGLISH"), val: edit.textoEn, onChange: (x) => setEdit({ ...edit, textoEn: x }), area: true, rows: 4, max: 1000, count: `${edit.textoEn.length}/1000` },
          { type: "chips", k: E2("TEMA (SALE PRIMERO EN ESOS CASOS)", "TOPIC (SHOWS FIRST IN THOSE CASES)"), items: [{ l: E2("Todos", "All"), v: !edit.tema ? "selected" : "filter", onClick: () => setEdit({ ...edit, tema: "" }) }, ...(Object.keys(TEMAS) as Tema[]).map((t) => ({ l: temaL(t), v: edit.tema === t ? "selected" : "filter", onClick: () => setEdit({ ...edit, tema: t }) }))] },
          { type: "field", k: E2("MOTIVO (QUEDA EN LA AUDITORÍA)", "REASON (STAYS IN THE AUDIT LOG)"), val: edit.motivo, onChange: (x) => setEdit({ ...edit, motivo: x }), max: 300 },
          { type: "acts", items: [{ l: pend ? E2("Guardando…", "Saving…") : E2("Guardar", "Save"), v: "action", icon: "check", off: !ok || pend, onClick: () => run(() => sopMacroGuardar({ key: edit.key, tituloEs: edit.tituloEs, tituloEn: edit.tituloEn, textoEs: edit.textoEs, textoEn: edit.textoEn, tema: edit.tema || null }, edit.motivo), () => setEdit(null)) }, { l: E2("Volver", "Back"), onClick: () => setEdit(null) }] },
        ]} />
        <Toast t={toast} desk={desk} />
      </div>
    );
  }
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: `${E2("SOPORTE", "SUPPORT")}${caso ? ` · ${caso.num}` : ""}`, t: E2("Soporte", "Support"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );

  const cabeza: Bloque[] = [
    { type: "head", eye: E2("OPERAR", "OPERATE"), t: E2("Soporte", "Support"), s: E2(`Casos de vecinos y negocios con To'Latino. Cada caso trae su contexto (persona, negocio, operación) y las macros ES/EN responden en un toque. Plazo: horas del equipo (${horario}).`, `Cases from neighbors and businesses with To'Latino. Each case comes with its context (person, business, transaction) and ES/EN macros reply in one tap. Deadline: team hours (${horario}).`),
      act: puede.editar && tab !== "macros" ? { l: E2("Tomar el siguiente caso", "Take the next case"), v: "action", icon: "check", onClick: () => run(sopTomarSiguiente, (r) => { const n = (r as { numero?: string }).numero; if (r.ok && n) ir({ caso: n }); }) } : undefined, h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E2("ABIERTOS", "OPEN"), v: String(kpis.abiertos), s: E2(`${kpis.vencidos} fuera de plazo`, `${kpis.vencidos} overdue`), sFg: kpis.vencidos ? "var(--tl-danger)" : undefined, bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: E2("MÍOS", "MINE"), v: String(kpis.mios), s: E2("asignados a ti", "assigned to you") },
      { k: E2("1.ª RESPUESTA", "1ST REPLY"), v: kpis.mediana == null ? "—" : kpis.mediana < 3600 ? `${Math.max(1, Math.round(kpis.mediana / 60))} min` : `${(kpis.mediana / 3600).toFixed(1)} h`, s: E2("mediana · 7 días", "median · 7 days") },
      { k: E2("RESUELTOS · 7 D", "RESOLVED · 7 D"), v: String(kpis.resueltos), s: kpis.si + kpis.no ? E2(`¿Se resolvió? sí ${Math.round((kpis.si / (kpis.si + kpis.no)) * 100)} % · 30 d`, `Resolved? yes ${Math.round((kpis.si / (kpis.si + kpis.no)) * 100)}% · 30 d`) : E2("¿Se resolvió?: sin respuestas", "Resolved?: no answers") },
    ] },
    // 7i · El plazo en 30 días (de soporte_analitica_dia, sin personas): primera respuesta dentro de las horas hábiles del plazo.
    ...(kpis.plazo30 ? [{ type: "kv" as const, cols: desk ? 3 : 1, items: [
      { k: E2("PLAZO CUMPLIDO · 30 D", "DEADLINE MET · 30 D"), v: kpis.plazo30.con ? E2(`${Math.round((kpis.plazo30.cumplido / kpis.plazo30.con) * 100)} % · ${kpis.plazo30.cumplido} de ${kpis.plazo30.con} con respuesta`, `${Math.round((kpis.plazo30.cumplido / kpis.plazo30.con) * 100)}% · ${kpis.plazo30.cumplido} of ${kpis.plazo30.con} with a reply`) : "—" },
      { k: E2("FUERA DE PLAZO · 30 D", "OVERDUE · 30 D"), v: E2(`${kpis.plazo30.vencido} de ${kpis.plazo30.casos} casos`, `${kpis.plazo30.vencido} of ${kpis.plazo30.casos} cases`), fg: kpis.plazo30.vencido ? "var(--tl-danger)" : undefined },
      { k: E2("DESDE EL COMPA", "FROM EL COMPA"), v: E2(`${kpis.plazo30.compa} de ${kpis.plazo30.casos} casos en 30 días`, `${kpis.plazo30.compa} of ${kpis.plazo30.casos} cases in 30 days`) }] }] : []),
    { type: "tabs", items: ([["open", E2("Abiertos", "Open"), kpis.abiertos], ["mine", E2("Míos", "Mine"), kpis.mios], ["esc", E2("Escalados", "Escalated"), kpis.esc], ["res", E2("Resueltos", "Resolved")], ["correo", E2("Por correo", "By email")], ["macros", "Macros"]] as [string, string, number?][])
      .map(([k, l, n]) => ({ l, n: n ? String(n) : undefined, on: tab === k, onClick: () => ir({ tab: k === "open" ? null : k, caso: null, antes: null }) })) },
  ];
  // 9l · Los correos que entraron a Soporte por SES (solo lo firmado y aprobado abre un caso; sin el remitente: su dominio). Tocar uno abre su caso.
  if (tab === "correo") {
    const EST: Record<string, [string, string]> = { caso: [E2("CASO NUEVO", "NEW CASE"), "signal"], mensaje: [E2("EN SU CASO", "IN THEIR CASE"), "signal"], sin_cuenta: [E2("SIN CUENTA CONFIRMADA", "NO CONFIRMED ACCOUNT"), "neutral"], rechazado: [E2("RECHAZADO", "REJECTED"), "danger"] };
    const MOT: Record<string, string> = { spf: E2("no pasó SPF ni DKIM", "failed SPF and DKIM"), dkim: E2("la firma DKIM falló", "the DKIM signature failed"), spam: E2("SES lo marcó como spam", "SES marked it as spam"), virus: E2("SES encontró un virus", "SES found a virus"), vacio: E2("sin texto", "no text"), varias_cuentas: E2("ese correo está en varias cuentas", "that email is on several accounts"), tope: E2("llegó al tope de casos del día", "hit the daily case cap") };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-screen-label="Soporte · por correo">
        <PanelBloques bloques={[...cabeza,
          { type: "note", tone: "info", icon: "info", t: E2("Al correo de Soporte solo entra lo que Amazon firma y aprueba (SPF o DKIM, sin spam ni virus). Abre un caso solo el correo CONFIRMADO de una cuenta (aunque esté suspendida: es quien no puede entrar); la respuesta del equipo le llega también por correo y, si contesta el correo, vuelve al mismo caso. El texto entra tapado.", "Only what Amazon signs and approves gets into the Support inbox (SPF or DKIM, no spam or viruses). Only an account’s CONFIRMED email opens a case (even if suspended: that’s who can’t sign in); the team’s reply also reaches them by email and, if they reply to the email, it goes back to the same case. The text comes in masked.") },
          correos.length ? { type: "rows", items: correos.map((x) => ({ key: x.id, icon: "info", t: x.asunto || E2("(sin asunto)", "(no subject)"), s: `@${x.dominio} · SPF ${x.spf} · DKIM ${x.dkim}${x.motivo ? ` · ${MOT[x.motivo] ?? x.motivo}` : ""}${x.caso ? ` · ${x.caso}` : ""}`,
            m: fe(x.at).toUpperCase(), tag: EST[x.estado]?.[0] ?? x.estado, tone: EST[x.estado]?.[1] ?? "neutral", chev: !!x.caso, onClick: x.caso ? () => ir({ tab: null, caso: x.caso }) : undefined })) }
            : { type: "empty", icon: "info", t: E2("Todavía no entra ningún correo", "No emails yet"), s: E2("Aparecen aquí cuando alguien le escribe al correo de Soporte.", "They show here when someone writes to the Support email.") },
        ]} />
        <Toast t={toast} desk={desk} />
      </div>
    );
  }
  if (tab === "macros") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-screen-label="Soporte · macros">
        <PanelBloques bloques={[...cabeza,
          { type: "note", tone: "info", icon: "chat", t: E2("Las macros salen como atajos al responder un caso. {nombre} se cambia solo por el nombre de la persona. Apagar una la quita de las respuestas; no se borra.", "Macros show as shortcuts when replying to a case. {nombre} is replaced automatically with the person’s name. Turning one off removes it from replies; it isn’t deleted.") },
          ...(puede.aprobar ? [{ type: "acts" as const, items: [{ l: E2("Nueva macro", "New macro"), v: "action", icon: "plus", onClick: () => setEdit({ key: null, tituloEs: "", tituloEn: "", textoEs: "", textoEn: "", tema: "", motivo: "" }) }] }] : []),
          { type: "rows", items: macros.map((m) => ({ key: m.key, icon: "chat", t: `${m.title.es} · ${m.title.en}`, s: `${m.body.es}\n${m.body.en}`, m: `${m.topic ? temaL(m.topic).toUpperCase() + " · " : ""}${m.quien ? `${m.quien.toUpperCase()} · ` : ""}${fe(m.at).toUpperCase()}`,
            tag: m.on ? null : E2("APAGADA", "OFF"), tone: "neutral", dim: !m.on,
            acts: puede.aprobar ? [{ l: E2("Editar", "Edit"), icon: "edit", onClick: () => setEdit({ key: m.key, tituloEs: m.title.es, tituloEn: m.title.en, textoEs: m.body.es, textoEn: m.body.en, tema: m.topic ?? "", motivo: "" }) },
              { l: m.on ? E2("Apagar", "Turn off") : E2("Encender", "Turn on"), icon: m.on ? "close" : "check", onClick: () => setConf({ titulo: m.on ? E2(`Apagar «${m.title.es}»`, `Turn off “${tx(m.title)}”`) : E2(`Encender «${m.title.es}»`, `Turn on “${tx(m.title)}”`), sub: E2("Queda en la auditoría.", "It stays in the audit log."), nota: "interna", hacer: (mo) => sopMacroEstado(m.key, !m.on, mo) }) }] : undefined })) },
        ]} />
        <Toast t={toast} desk={desk} />
      </div>
    );
  }

  const lista: Bloque[] = [...cabeza,
    { type: "search", val: v, ph: E2("Buscar: TK-…, nombre o negocio", "Search: TK-…, name or business"), onChange: (x) => setV(x), onClear: v ? () => { setV(""); ir({ q: null }); } : undefined, link: E2("Buscar", "Search"), onLink: () => ir({ q: v.trim() || null, antes: null }) },
    { type: "chips", items: [["alta", E2("Alta", "High")], ["venc", E2("Vencidos", "Overdue")]].map(([k, l]) => ({ l: l!, v: f === k ? "selected" : "filter", onClick: () => ir({ f: f === k ? null : k! }) }))
      .concat((["pago", "cuenta", "negocio", "tecnico", "pedido", "cita", "seguridad"] as Tema[]).map((t) => ({ l: temaL(t), v: tema === t ? "selected" : "filter", onClick: () => ir({ tema: tema === t ? null : t }) }))) },
  ];
  const ancho = desk && !(lado && caso);
  const tarjetas = filas.length ? filas.map((x) => {
    const estado = x.status === "resolved" || x.status === "merged" ? "ok" : !x.equipo ? "ok" : x.vencido ? "late" : x.r >= 0.7 ? "soon" : "ok";
    const sla = x.status === "resolved" ? E2("RESUELTO", "RESOLVED") : x.status === "merged" ? E2("UNIDO", "MERGED") : !x.equipo ? E2("ESPERA A LA PERSONA", "WAITING ON THE PERSON") : x.vencido ? `${E2("VENCIDO", "OVERDUE")} · ${hc(x.due)}` : vence(x.due, E2, en);
    return <div key={x.num} data-tk={x.num}><A.QueueCard icon={x.escalado ? "card" : "chat"} state={estado} title={x.titulo || E2("(sin texto)", "(no text)")}
      sub={`${x.num} · ${temaL(x.tema)} · ${x.negocio ? `${x.negocio} · ` : ""}${x.quien}`} meta={`${(ESTADO_EQUIPO[x.status] ? tx(ESTADO_EQUIPO[x.status]!) : x.status).toUpperCase()}${x.escalado ? ` · ${x.escalado === "admin" ? E2("A ADMIN", "TO ADMIN") : E2("A FINANZAS", "TO FINANCE")}` : ""}`}
      priority={x.priority === "alta" ? E2("ALTA", "HIGH") : undefined} who={{ name: x.quien, initials: x.quien.slice(0, 1) }} sla={sla} assignee={x.asignado ? { name: x.asignado } : undefined}
      wide={ancho} columns={ancho ? "40px minmax(0,1.6fr) minmax(0,1fr) auto" : "40px minmax(0,1fr) auto"} active={caso?.num === x.num} onClick={() => ir({ caso: x.num })} /></div>;
  }) : [<PanelBloques key="v" bloques={[{ type: "empty", icon: "help", t: E2("Nada aquí", "Nothing here"), s: tab === "mine" ? E2("No tienes casos asignados. Toma uno de Abiertos.", "You have no assigned cases. Take one from Open.") : E2("Bandeja limpia con estos filtros.", "Inbox clear with these filters.") }]} />];

  const detalle = caso ? ficha(caso) : casoPedido ? <PanelBloques bloques={[{ type: "empty", icon: "help", t: E2("Ese caso no existe", "That case doesn’t exist"), s: E2("O es de una ciudad que no ves.", "Or it’s from a city you can’t see.") }]} /> : null;
  function ficha(k: CasoEquipo): ReactNode {
    const titulo = k.msjs.find((m) => m.sender === "user" && m.body)?.body?.slice(0, 90) ?? k.num, abierto = k.status !== "resolved" && k.status !== "merged";
    const B: Bloque[] = [{ type: "head", eye: `${E2("SOPORTE", "SUPPORT")} · ${k.num} · ${temaL(k.tema).toUpperCase()}`, t: titulo, h1: 22, onBack: lado ? undefined : () => ir({ caso: null }) }];
    const notas: ReactNode[] = [];
    if (k.escalado) notas.push(<A.AdminNote key="e" tone="warn" icon="card">{k.escalado === "admin" ? E2("Pasado a un Admin: prioridad alta, sin asignar hasta que lo tomen.", "Escalated to an Admin: high priority, unassigned until someone takes it.") : E2("Pasado a Finanzas: prioridad alta, sin asignar hasta que lo tomen.", "Escalated to Finance: high priority, unassigned until someone takes it.")}</A.AdminNote>);
    if (abierto && k.asignado && !k.mio) notas.push(<A.AdminNote key="a" tone="warn" icon="users" cta={puede.editar ? E2("Tomarlo", "Take it") : undefined} onCta={() => run(() => sopTomar(k.num))}>{E2(`Lo está viendo ${k.asignado.nombre}.`, `${k.asignado.nombre} is on it.`)}</A.AdminNote>);
    else if (abierto && !k.asignado && puede.editar) notas.push(<A.AdminNote key="a" tone="info" icon="users" cta={E2("Tomar", "Take")} onCta={() => run(() => sopTomar(k.num))}>{E2("Sin asignar. Tómalo: la persona ve «Lo están viendo».", "Unassigned. Take it: the person sees “In review”.")}</A.AdminNote>);
    if (k.vencido) notas.push(<A.AdminNote key="v" tone="bad" icon="clock">{E2(`Fuera de plazo: venció ${fe(k.due)} (${k.horas} h hábiles).`, `Overdue: was due ${fe(k.due)} (${k.horas} business h).`)}</A.AdminNote>);
    if (k.status === "merged") notas.push(<A.AdminNote key="u" tone="info" icon="share" cta={E2("Ir", "Go")} onCta={() => ir({ caso: k.unidoA })}>{E2(`Unido a ${k.unidoA}. La persona sigue ahí.`, `Merged into ${k.unidoA}. The person continues there.`)}</A.AdminNote>);
    if (!puede.editar) notas.push(<A.AdminNote key="p" tone="warn" icon="lock">{puede.devolver ? E2("Tu rol ve Soporte y devuelve dinero; no responde ni toma casos.", "Your role sees Support and refunds money; it doesn’t reply or take cases.") : E2("Tu rol solo puede ver Soporte.", "Your role can only view Support.")}</A.AdminNote>);
    if (k.summary) notas.push(<A.AdminNote key="s" tone="info" icon="help">{k.summary}</A.AdminNote>);
    const kv: Bloque = { type: "kv", cols: 2, items: [
      { k: E2("CANAL", "CHANNEL"), v: origen[k.origin] ?? k.origin }, { k: E2("PRIORIDAD", "PRIORITY"), v: k.priority === "alta" ? E2("Alta", "High") : E2("Normal", "Normal"), fg: k.priority === "alta" ? "var(--tl-danger)" : undefined },
      { k: E2("ESTADO", "STATUS"), v: ESTADO_EQUIPO[k.status] ? tx(ESTADO_EQUIPO[k.status]!) : k.status }, { k: E2("PLAZO", "DEADLINE"), v: k.equipo ? `${k.vencido ? E2("Venció", "Was due") : E2("Vence", "Due")} ${plazo ?? fe(k.due)}` : E2("Le toca a la persona", "The person’s turn"), fg: k.vencido ? "var(--tl-danger)" : undefined },
      { k: E2("ABIERTO", "OPENED"), v: fe(k.at) }, { k: E2("1.ª RESPUESTA", "1ST REPLY"), v: fe(k.primeraRespuesta) },
      ...(k.status === "resolved" ? [{ k: E2("¿SE RESOLVIÓ?", "RESOLVED?"), v: k.csat === "yes" ? E2("Sí", "Yes") : k.csat === "no" ? "No" : E2("Sin respuesta", "No answer") }] : []),
      ...(k.enlazado ? [{ k: E2("ENLAZADO A", "LINKED TO"), v: k.enlazado }] : []), ...(k.unidos.length ? [{ k: E2("UNIDOS AQUÍ", "MERGED HERE"), v: k.unidos.join(", ") }] : []),
    ] };
    const ctx = [
      { icon: "users", title: k.persona.nombre, sub: `${k.persona.tel} · ${k.persona.ciudad ?? E2("Sin ciudad", "No city")} · ${k.persona.lang === "en" ? E2("inglés", "English") : E2("español", "Spanish")} · ${k.persona.casos} ${k.persona.casos === 1 ? E2("caso", "case") : E2("casos", "cases")}${k.persona.estado !== "active" ? ` · ${E2("cuenta", "account")} ${k.persona.estado}` : ""}`, chevron: puede.usr, onClick: puede.usr ? () => router.push(`/admin/usuarios/${k.persona.id}`) : undefined },
      ...(k.negocio ? [{ icon: "store", title: k.negocio.name, sub: E2("Lo abrió desde el panel del negocio", "Opened from the business panel"), chevron: puede.neg, onClick: puede.neg ? () => router.push(`/admin/negocios/${k.negocio!.id}`) : undefined }] : []),
      ...(k.op ? [{ icon: "bag", title: `${kind[k.op.kind] ?? E2("Operación", "Transaction")} ${/^\d/.test(k.op.num) ? "#" : ""}${k.op.num} · ${k.op.biz}`, sub: `${money(k.op.total)} · ${opst[k.op.status] ?? k.op.status}` }] : []),
      ...(k.ayuda ? [{ icon: "help", title: `${E2("Ayuda", "Help request")} ${k.ayuda.num}`, sub: `${k.ayuda.status === "escalated" ? E2("En la cola de ayudas", "In the help queue") : k.ayuda.status} · ${k.ayuda.opnum}`, chevron: true, onClick: () => router.push("/admin/colas?cola=sop") }] : []),
      { icon: "phone", title: k.device ? `${k.device} · ${k.version ?? "web"}` : E2("Dispositivo sin datos", "No device data"), sub: E2("DISPOSITIVO Y VERSIÓN", "DEVICE AND VERSION") },
    ];
    const hilo = k.msjs.map((m: MsjEquipo) => ({
      t: m.sender === "system" ? sistema[m.sys_key ?? ""]?.(m.vars ?? {}) ?? "" : `${m.oculto ? `[${E2("Oculto", "Hidden")}: ${m.motivoOculto ?? ""}] ` : ""}${m.body ?? ""}${m.foto ? E2(" · [foto]", " · [photo]") : ""}`,
      mine: m.sender === "staff", soft: m.internal || m.sender === "system",
      m: `${m.internal ? E2("NOTA INTERNA · ", "INTERNAL NOTE · ") : m.sender === "system" ? E2("SISTEMA · ", "SYSTEM · ") : ""}${(m.quien ?? (m.sender === "user" ? k.persona.nombre : "To'Latino")).toUpperCase()}${m.macro ? " · MACRO" : ""} · ${hc(m.at).toUpperCase()}`,
    })).filter((x) => x.t);
    const fotos = k.msjs.filter((m) => m.foto && !m.oculto);
    const pago = k.pago, queda = pago ? pago.amount - pago.devuelto : 0, topeQueda = k.tope == null ? null : Math.max(0, k.tope - k.devueltoCaso);
    const out: ReactNode[] = [<PanelBloques key="h" bloques={B} />, ...notas, <PanelBloques key="kv" bloques={[kv, { type: "group", k: E2("CONTEXTO", "CONTEXT") }]} />, <A.AdminList key="ctx" rows={ctx} />];
    if (pago) out.push(<PanelBloques key="pago" bloques={[{ type: "group", k: E2("LO PAGADO EN LA APP", "PAID IN THE APP") }, { type: "kv", cols: 2, items: [
      { k: E2("COBRADO", "CHARGED"), v: money(pago.amount) }, { k: E2("YA DEVUELTO", "ALREADY REFUNDED"), v: money(pago.devuelto) }, { k: E2("TARJETA", "CARD"), v: pago.tarjeta ?? "—" },
      { k: E2("TU TOPE EN ESTE CASO", "YOUR CAP ON THIS CASE"), v: k.tope == null ? E2(`Hasta lo cobrado (${money(queda)})`, `Up to the amount charged (${money(queda)})`) : k.tope === 0 ? E2("Tu rol no devuelve", "Your role doesn’t refund") : E2(`${money(topeQueda ?? 0)} de ${money(k.tope)}`, `${money(topeQueda ?? 0)} of ${money(k.tope)}`) }] }]} />);
    if (k.devoluciones.length) out.push(<A.AdminList key="dev" rows={k.devoluciones.map((d) => ({ icon: "card", title: `${money(d.monto)} · ${d.status === "done" ? E2("devuelto", "refunded") : d.status === "failed" ? E2("no se pudo", "failed") : E2("en camino", "on its way")}`, sub: `${d.quien ?? E2("Equipo", "Team")}${d.rol ? ` (${d.rol})` : ""} · ${fe(d.at)}` }))} />);
    // 8f · «Reportar un problema»: el registro técnico que mandó el teléfono al tocar «Enviar» (familias de pantalla, errores, señal; tapado).
    if (k.registro) out.push(<PanelBloques key="reg" bloques={[{ type: "group", k: E2("REGISTRO DE LA APP · LO QUE MANDÓ EL TELÉFONO", "APP LOG · WHAT THE PHONE SENT") },
      { type: "kv", cols: 2, items: [{ k: E2("SISTEMA", "SYSTEM"), v: k.registro.sistema ?? "—" }, { k: E2("MODELO", "MODEL"), v: k.registro.modelo ?? "—" }, { k: E2("CAPTURA", "SCREENSHOT"), v: k.registro.captura === "agitar" ? E2("De la pantalla (agitar)", "From the screen (shake)") : k.registro.captura === "archivo" ? E2("Un archivo que eligió", "A file they chose") : E2("Sin captura", "No screenshot") }, { k: E2("LÍNEAS", "LINES"), v: String(k.registro.lineas.length) }] },
      k.registro.purgado ? { type: "note", tone: "info", icon: "info", t: E2("Se borró: la cuenta se cerró hace más de 30 días.", "Deleted: the account was closed more than 30 days ago.") }
        : k.registro.lineas.length ? { type: "timeline", items: k.registro.lineas.slice(-60).map((l) => ({ t: l.slice(9), s: l.slice(0, 8) })) } : { type: "note", tone: "info", icon: "info", t: E2("El teléfono no tenía pantallas anotadas.", "The phone had no screens logged.") }]} />);
    out.push(<PanelBloques key="hilo" bloques={[{ type: "group", k: E2("CONVERSACIÓN", "CONVERSATION") }, { type: "thread", items: hilo }]} />);
    if (fotos.length) out.push(<A.AdminList key="fotos" rows={fotos.map((m) => ({ icon: "image", title: E2("Foto del caso", "Case photo"), sub: `${(m.quien ?? k.persona.nombre)} · ${fe(m.at)} · ${E2("se abre aparte y queda en la auditoría", "opens separately and stays in the audit log")}`, chevron: true, onClick: () => window.open(m.foto!, "_blank", "noopener") }))} />);
    if (abierto && puede.editar) {
      const mac = [...k.macros].sort((a, b) => Number(b.topic === k.tema) - Number(a.topic === k.tema));
      const nombre = k.persona.nombre.split(" ")[0] ?? "";
      out.push(<PanelBloques key="resp" bloques={[
        { type: "chips", k: E2("ESCRIBIR", "WRITE"), items: [{ l: E2("A la persona", "To the person"), v: modo === "persona" ? "selected" : "filter", onClick: () => setModo("persona") }, { l: E2("Nota interna (solo el equipo)", "Internal note (team only)"), v: modo === "nota" ? "selected" : "filter", onClick: () => { setModo("nota"); setBorrador(null); } }] },
        ...(modo === "persona" && mac.length ? [{ type: "chips" as const, k: "MACROS", items: mac.map((m) => ({ l: tx(m.title), v: macro === m.key ? "selected" : "filter", onClick: () => { setMacro(m.key); setBorrador(null); setResp((k.persona.lang === "en" ? m.body.en : m.body.es).replace(/\{nombre\}|\{name\}/g, nombre)); } })) }] : []),
        // 7g · El copiloto: la nota con el resumen y el siguiente paso, y el botón. Solo para «A la persona»; el borrador va al campo.
        ...(modo === "persona" && copiloto && cop && cop.num === k.num ? [{ type: "note" as const, tone: "info" as const, icon: "help",
          t: `EL COMPA · ${cop.resumen}${cop.siguiente ? ` ${E2("Siguiente paso", "Next step")}: ${cop.siguiente}` : ""}${cop.macro ? E2(` Macro que encaja: «${cop.macro.titulo}».`, ` Matching macro: “${cop.macro.titulo}”.`) : ""}${cop.devolver ? E2(" Si corresponde devolver, «Resolver y devolver» lo decides tú.", " If a refund is due, you decide with “Resolve and refund”.") : ""}${cop.ai ? "" : E2(" (sin IA: borrador de reglas)", " (no AI: rules-based draft)")}`,
          ...(cop.fuente ? { cta: `${E2("Ayuda", "Help")}: ${tx(cop.fuente.titulo)}`, onCta: () => window.open(cop.fuente!.href, "_blank", "noopener") } : {}) }] : []),
        ...(modo === "persona" && copiloto ? [{ type: "acts" as const, items: [{ l: copBusy ? E2("El Compa está escribiendo…", "El Compa is writing…") : cop && cop.num === k.num ? E2("Otro borrador con El Compa", "Another draft with El Compa") : E2("Sugerir respuesta con El Compa", "Suggest a reply with El Compa"), v: "secondary", icon: "help", off: copBusy || pend, onClick: () => sugerir(k.num) }] }] : []),
        { type: "field", k: modo === "persona" ? E2("RESPUESTA", "REPLY") : E2("NOTA INTERNA", "INTERNAL NOTE"), val: resp, onChange: (x) => { setResp(x); if (!x) { setMacro(null); setBorrador(null); } }, area: true, rows: 3, max: 2000, count: `${resp.length}/2000`,
          ph: modo === "persona" ? E2("Escríbele como vecino, no como robot.", "Write like a neighbor, not a robot.") : E2("Lo que el equipo necesita saber. La persona nunca lo ve.", "What the team needs to know. The person never sees it.") },
        { type: "acts", items: [
          { l: pend ? E2("Enviando…", "Sending…") : modo === "persona" ? E2("Enviar", "Send") : E2("Guardar nota", "Save note"), v: "action", icon: modo === "persona" ? "right" : "edit", off: !resp.trim() || pend,
            onClick: () => run(() => (modo === "persona" ? sopResponder(k.num, resp, macro, borrador) : sopNota(k.num, resp)), () => { setResp(""); setMacro(null); if (modo === "persona") { setBorrador(null); setCop(null); } }) },
          { l: E2("Resolver", "Resolve"), icon: "check", onClick: () => setConf({ titulo: E2("¿Cómo se resolvió?", "How was it resolved?"), sub: E2("Lo lee la persona en su caso; después le preguntamos si se resolvió.", "The person reads it in their case; then we ask them if it was resolved."), plantillas: resp.trim() ? [resp.trim().slice(0, 300)] : [], nota: "persona", hacer: (m) => sopResolver(k.num, m, borrador).then((r) => { if (r.ok) { setBorrador(null); setCop(null); } return r; }) }) },
        ] },
      ]} />);
    }
    if (abierto && puede.devolver && k.puedeDevolver && pago && queda > 0) {
      out.push(<PanelBloques key="dev2" bloques={[{ type: "acts", items: [{ l: E2("Resolver y devolver", "Resolve and refund"), icon: "card", onClick: () => { const clave = nuevaClave(); setConf({
        titulo: E2("Resolver y devolver", "Resolve and refund"), sub: E2(`A su ${pago.tarjeta ?? "tarjeta"}. Cobrado ${money(pago.amount)}, ya devuelto ${money(pago.devuelto)}. ${k.tope == null ? "Tu rol devuelve hasta lo cobrado." : `Tu rol devuelve hasta ${money(k.tope)} por caso${k.devueltoCaso ? ` (ya ${money(k.devueltoCaso)})` : ""}; más, Finanzas o un Admin.`} El mensaje lo lee la persona.`,
          `To their ${pago.tarjeta ?? "card"}. Charged ${money(pago.amount)}, already refunded ${money(pago.devuelto)}. ${k.tope == null ? "Your role refunds up to the amount charged." : `Your role refunds up to ${money(k.tope)} per case${k.devueltoCaso ? ` (already ${money(k.devueltoCaso)})` : ""}; more needs Finance or an Admin.`} The person reads the message.`),
        valor: { k: E2("MONTO A DEVOLVER (USD)", "AMOUNT TO REFUND (USD)"), ini: "", max: 9 }, plantillas: [...(borrador && resp.trim() ? [resp.trim().slice(0, 300)] : []), E2("Tienes razón. Te devolvemos lo cobrado de más a tu tarjeta: lo ves en 3 a 5 días hábiles.", "You’re right. We’re refunding the overcharge to your card: you’ll see it in 3 to 5 business days.")], cta: E2("Resolver y devolver", "Resolve and refund"), peligro: true,
        nota: "persona", hacer: (m, _e, monto) => sopDevolver(k.num, monto, clave, m, borrador).then((r) => { if (r.ok) { setBorrador(null); setCop(null); } return r; }) }); } }] }]} />);
    }
    if (abierto && puede.editar) {
      out.push(<PanelBloques key="mas" bloques={[{ type: "acts", items: [
        { l: E2("Pasar a Finanzas", "Escalate to Finance"), icon: "card", onClick: () => setConf({ titulo: E2("¿A quién se pasa?", "Escalate to whom?"), sub: E2("Sube a prioridad alta y sale primero en Escalados. Queda como nota interna.", "It goes to high priority and shows first in Escalated. It stays as an internal note."), elegir: { label: E2("A QUIÉN", "TO WHOM"), items: [{ k: "finanzas", l: E2("Finanzas", "Finance") }, { k: "admin", l: E2("Un Admin", "An Admin") }] },
          plantillas: [E2("Hay que devolver más del tope de Soporte", "Need to refund more than Support’s cap"), E2("Es un cobro que no reconoce", "It’s a charge they don’t recognize"), E2("Pagos del negocio retenidos", "Business payouts on hold")], nota: "interna", hacer: (m, a) => sopEscalar(k.num, a ?? "", m) }) },
        { l: E2("Ligar a una operación", "Link to a transaction"), icon: "share", onClick: () => setConf({ titulo: E2("Ligar a un pedido, una cita o una ayuda", "Link to an order, an appointment or a help request"), sub: E2("Solo de esta persona (o de su negocio). Queda como nota interna.", "Only this person’s (or their business’s). It stays as an internal note."), valor: { k: E2("NÚMERO (1234, C-5678, H-90)", "NUMBER (1234, C-5678, H-90)"), ini: "", max: 20 }, plantillas: [E2("Es la operación de la que habla", "It’s the transaction they’re talking about")], nota: "interna", hacer: (m, _e, ref) => sopLigar(k.num, ref, m) }) },
        { l: E2("Unir a otro caso", "Merge into another case"), icon: "users", onClick: () => setConf({ titulo: E2("Unir este caso a otro", "Merge this case into another"), sub: E2("Solo casos de la misma persona. Este queda «unido» con su enlace; nada se borra.", "Only cases from the same person. This one stays “merged” with its link; nothing is deleted."), valor: { k: E2("EL OTRO CASO (TK-…)", "THE OTHER CASE (TK-…)"), ini: "TK-", max: 20 }, plantillas: [E2("Es el mismo problema", "It’s the same problem")], nota: "interna", hacer: (m, _e, d) => sopUnir(k.num, d, m) }) },
      ] }]} />);
    }
    if (puede.aprobar) {
      const ocultables = k.msjs.filter((m) => m.sender !== "system" && !m.oculto && m.body);
      if (ocultables.length) out.push(<PanelBloques key="oc" bloques={[{ type: "acts", items: [{ l: E2("Ocultar un mensaje", "Hide a message"), icon: "ban", onClick: () => setConf({ titulo: E2("Ocultar el texto de un mensaje", "Hide a message’s text"), sub: E2("La persona ve «Mensaje oculto por el equipo». El texto no se borra; el motivo queda en la auditoría.", "The person sees “Message hidden by the team”. The text isn’t deleted; the reason stays in the audit log."),
        elegir: { label: E2("¿CUÁL?", "WHICH ONE?"), items: ocultables.map((m) => ({ k: m.id, l: `${m.internal ? E2("Nota · ", "Note · ") : ""}${m.quien ?? "—"}: ${(m.body ?? "").slice(0, 60)}` })) }, plantillas: [E2("Trae datos que no se guardan (cuenta, código, contraseña)", "Has data we don’t store (account, code, password)"), E2("Ofensivo", "Offensive")], peligro: true, nota: "interna", hacer: (m, id) => sopOcultar(k.num, id ?? "", m) }) }] }]} />);
    }
    if (k.status === "resolved" && puede.editar) out.push(<PanelBloques key="re" bloques={[{ type: "acts", items: [{ l: E2("Reabrir", "Reopen"), icon: "edit", onClick: () => setConf({ titulo: E2("¿Por qué se reabre?", "Why is it being reopened?"), sub: E2("Vuelve a la cola con plazo nuevo.", "It goes back to the queue with a new deadline."), plantillas: [E2("La persona escribió de nuevo", "The person wrote again"), E2("Falta un paso", "A step is missing")], nota: "interna", hacer: (m) => sopReabrir(k.num, m) }) }] }]} />);
    out.push(<PanelBloques key="hg" bloques={[{ type: "group", k: E2("HISTORIAL", "HISTORY") }]} />);
    out.push(k.historial.length ? <A.AuditLog key="hist" rows={k.historial.map((x) => ({ who: x.quien ?? E2("Equipo", "Team"), initials: (x.quien ?? "E").slice(0, 1), action: verbo[x.action] ?? x.action.replace("soporte.", ""), before: x.before ? JSON.stringify(x.before).replace(/[{}"]/g, "").replace(/:/g, ": ").replace(/,/g, " · ") : undefined, after: x.after ? JSON.stringify(x.after).replace(/[{}"]/g, "").replace(/:/g, ": ").replace(/,/g, " · ") : undefined, why: x.reason ?? undefined, when: hc(x.at) }))} />
      : <A.AdminNote key="hist" tone="info" icon="folder">{E2("Nadie del equipo ha hecho cambios aquí todavía.", "Nobody on the team has made changes here yet.")}</A.AdminNote>);
    return <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-screen-label="Soporte · caso" data-tk-abierto={k.num}>{out}</div>;
  }

  const colLista = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }} data-screen-label="Soporte · lista">
      <PanelBloques bloques={lista} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{tarjetas}</div>
      {sig ? <div style={{ display: "flex" }}><A.Button variant="secondary" size="md" onClick={() => ir({ antes: sig })}>{E2("Ver más", "See more")}</A.Button></div> : null}
      {tab === "open" ? <PanelBloques bloques={[{ type: "note", tone: "ink", icon: "help", t: E2("Las ayudas con un pedido, una cita o un boleto que el negocio no respondió están en Colas › Ayuda con pedidos y citas.", "Help requests about an order, an appointment or a ticket the business didn’t answer are in Queues › Help with orders and appointments."), cta: E2("Abrir", "Open"), onCta: () => router.push("/admin/colas?cola=sop") }]} /> : null}
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

/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */
