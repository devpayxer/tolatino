"use client";
/* ADM-COLAS (Super Admin.dc.html secColas / qDetail): todo lo que espera una decisión de una persona. Lista de
   QueueCard (la más vieja contra su plazo primero), detalle al lado (≥ 1200) o a pantalla completa, confirmación con
   motivo (ReasonConfirm). El servidor decide qué ve y qué puede decidir cada quien. */
import { useAncho } from "@/app/_ancho/Ancho";
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ComponentType, type ReactNode } from "react";
import type { Caso, CasoLista } from "@/lib/admin-colas";
import { AYUDA_DE, COLAS, MOTIVO_RESENA, ORDEN_COLAS, textoCola, type Cola } from "@/lib/colas";
import { motivoAyuda, quiereAyuda } from "@/lib/ayuda-motivos";
import { cuerpoComunidad, tituloComunidad } from "./ColasComunidad";
import { cuerpoEventos, tituloEventos } from "./ColasEventos";
import { dlvResolver } from "./acciones-repartidores";
import { asignarCaso, colaVisibilidad, equipoDeCola, feriadoEquipo, quitarFeriadoEquipo, tomarLote } from "./acciones-colas";
import type { AjustesColas } from "@/lib/admin-colas";
import { useE } from "./idioma-admin";

import { crearSemilla,
 decidirCambio, decidirLicencia, decidirMedios, decidirNuevo, decidirRec, decidirReclamo, decidirRep, decidirSop, reponerSop, decidirSello, tomarCaso, tomarSiguiente, chatOcultarMensaje, decidirChat, decidirDisputa, decidirRenta, decidirNoche, decidirEstafa, pausaEstafa, decidirVivienda, type ResAdm, verNinoCaso } from "./acciones-colas";
import { compaHilo } from "./acciones-compa";
import { verFotosSalud } from "./acciones-sistema";
import { copilotoSugerir } from "./acciones-copiloto";
import type { BorradorCopiloto } from "@/lib/compa/copiloto";
import { uuid } from "@/lib/uuid";
import { hoyEn } from "@/lib/fecha-local";
import { useAhora } from "@/lib/ahora";
import { horasTxt } from "@/lib/plazo-txt";

import { tec } from "@/lib/tec";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"QueueCard" | "AdminNote" | "AdminList" | "ReasonConfirm" | "Button" | "Pager", ComponentType<any>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Icono = UI.Icon as ComponentType<any>;
export const PLANT = {
  selloNo: ["La dirección no coincide con la página", "No pudimos confirmar que representas el negocio", "Las fotos no son del local", "El nombre puede confundirse con otro negocio"],
  selloInfo: ["Mándanos una foto de la fachada con el letrero", "Confírmanos el teléfono fijo del local", "Dinos en qué horario podemos llamar"],
  biz: ["Varios reportes coinciden", "El negocio no responde a To’Latino", "Datos de contacto falsos", "Se resolvió con el dueño"],
  // Reseñas (adm-data TPL hide / keep).
  hide: ["Tiene datos personales", "Ofensiva o discriminatoria", "No fue cliente: sin transacción", "Spam o publicidad", "Amenaza o acoso"],
  keep: ["No rompe las reglas del barrio", "Es una opinión sobre el servicio", "El reporte no trae evidencia"],
  // Fotos: los mismos motivos con los que un vecino reporta (photo_reports.reason).
  foto: ["No es de este negocio", "Contenido inapropiado", "Muestra datos personales", "Es publicidad o spam"],
};
/* 9f-4 · Las mismas plantillas en inglés: PLANT se queda en español para quien la importe; plantE(E) da las del idioma de la persona. */
type EF = (es: string, en: string) => string;
const PLANT_EN: typeof PLANT = {
  selloNo: ["The address doesn't match the page", "We couldn't confirm you represent the business", "The photos aren't of the location", "The name could be confused with another business"],
  selloInfo: ["Send us a photo of the storefront with the sign", "Confirm the location's landline number", "Tell us what hours we can call"],
  biz: ["Several reports match", "The business doesn't respond to To’Latino", "Fake contact details", "Resolved with the owner"],
  hide: ["Contains personal data", "Offensive or discriminatory", "Not a customer: no transaction", "Spam or advertising", "Threat or harassment"],
  keep: ["Doesn't break the neighborhood rules", "It's an opinion about the service", "The report has no evidence"],
  foto: ["Not from this business", "Inappropriate content", "Shows personal data", "It's advertising or spam"],
};
export const plantE = (E: EF): typeof PLANT => (E("", "x") === "x" ? PLANT_EN : PLANT);

/* 9c · El ancho sin salto al cargar (arranca con la estimación del servidor): app/_ancho/Ancho.tsx. */
export { useAncho };

const CAMBIO_NEG: Record<string, string> = { mergeBiz: "Fusionar negocios", changeCategory: "Cambio de categoría", transferOwner: "Transferir dueño" };
const CAMBIO_NEG_EN: Record<string, string> = { mergeBiz: "Merge businesses", changeCategory: "Category change", transferOwner: "Transfer owner" };
const AYUDA_DE_EN: Record<string, string> = { appointment: "Help with an appointment", hold: "Help with a purchase", market_order: "Help with a market order", party: "Help with a party", trip: "Help with a trip", night: "Help with a night out", enrollment: "Help with an enrollment", visit: "Help with a visit", order: "Help with an order", tickets: "Help with a ticket order" };
const MOTIVO_RESENA_EN: Record<string, string> = { fake: "Fake review", off: "Offensive", pii: "Personal data", spam: "Spam or advertising", coi: "Written by the owner or a competitor", otro: "Other reason", negocio: "The business asked for a review" };
export type Confirmar = { titulo: string; sub?: string; plantillas?: string[]; peligro?: boolean; cta?: string; ini?: string; elegir?: { label: string; items: { k: string; l: string }[] }; valor?: { k: string; ini: string; area?: boolean; max: number }; hacer: (motivo: string, elegido: string | null, valor: string) => Promise<ResAdm> };

/* Confirmación con motivo (patrón 2ao): ReasonConfirm, con elección y, si hace falta, el campo del valor nuevo. */
export function ConfirmarMotivo({ c, onBack, onDone, desk }: { c: Confirmar; onBack: () => void; onDone: (r: ResAdm) => void; desk: boolean }) {
  const E = useE();
  const [motivo, setMotivo] = useState(c.ini ?? ""), [elegido, setElegido] = useState<string | null>(null), [valor, setValor] = useState(c.valor?.ini ?? "");
  const [pend, start] = useTransition(), [err, setErr] = useState<string | null>(null);
  const falta = !motivo.trim() || (!!c.elegir && !elegido) || (!!c.valor && !valor.trim() && c.valor.k !== "QUIÉNES SOMOS");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {c.valor ? <PanelBloques bloques={[{ type: "field", k: c.valor.k, val: valor, onChange: setValor, area: c.valor.area, rows: 4, max: c.valor.max, count: `${valor.length}/${c.valor.max}` }]} /> : null}
      <A.ReasonConfirm desk={desk} title={c.titulo} sub={c.sub ?? E("El motivo lo ve la persona afectada y queda en la auditoría.", "The person affected sees the reason, and it stays in the audit log.")}
        choices={c.elegir ? [{ label: c.elegir.label, items: c.elegir.items.map((x) => ({ label: x.l, on: elegido === x.k, onClick: () => setElegido(x.k) })), empty: E("No hay a quién elegir.", "No one to choose.") }] : []}
        templates={(c.plantillas ?? []).map((t) => ({ label: t, on: motivo === t, onClick: () => setMotivo(t) }))}
        reason={motivo} onReason={(e: { target: { value: string } } | string) => setMotivo(typeof e === "string" ? e : e.target.value)}
        autoFocus={!c.plantillas?.length} cta={pend ? E("Guardando…", "Saving…") : c.cta ?? E("Confirmar", "Confirm")} danger={c.peligro} disabled={falta || pend}
        onConfirm={() => { if (falta || pend) return; start(async () => { const r = await c.hacer(motivo.trim(), elegido, valor); if (!r.ok) setErr(r.mensaje); else onDone(r); }); }}
        onBack={onBack} />
      {err ? <A.AdminNote tone="bad">{err}</A.AdminNote> : null}
    </div>
  );
}

export function Toast({ t, desk }: { t: string | null; desk: boolean }): ReactNode {
  return t ? <div role="status" style={{ position: "fixed", left: "50%", bottom: desk ? 28 : 96, transform: "translateX(-50%)", zIndex: 90, maxWidth: 380, width: "calc(100% - 40px)", boxSizing: "border-box", padding: "12px 16px", borderRadius: 14, background: "var(--tl-ink)", color: "var(--tl-white)", font: "700 13px/1.4 Manrope,sans-serif", textAlign: "center" }}>{t}</div> : null;
}
export function useToast() {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => { if (!t) return; const x = setTimeout(() => setT(null), 2600); return () => clearTimeout(x); }, [t]);
  return [t, setT] as const;
}


export function Colas({ casos, hay = casos.length, pag = 1, porPagina = 50, conteo, vencidos, total, visibles, caso, puedeAprobar, apelarDias = 0, slas = {}, puedeRepartir = false, ajustes = null, esAdmin = false, cfgTxt = {}, ayudaH }: {
  casos: CasoLista[]; hay?: number; pag?: number; porPagina?: number; conteo: Record<string, number>; vencidos: number; total: number; visibles: Cola[]; caso: Caso | null; puedeAprobar: boolean; apelarDias?: number; slas?: Partial<Record<Cola, number>>;
  puedeRepartir?: boolean; ajustes?: AjustesColas | null; esAdmin?: boolean; cfgTxt?: Record<string, number>;
  ayudaH: number; // 9n-5 · las horas del negocio para responder una ayuda (Configuración · ayuda_negocio_h)
}) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const E = useE(), en = E("", "x") === "x", P = plantE(E), qn = (q: Cola) => (en ? COLAS[q].en : COLAS[q].es);
  const router = useRouter(), path = usePathname(), sp = useSearchParams();
  const w = useAncho(), desk = w >= 1024, lado = w >= 1200;
  const [toast, setToast] = useToast();
  const [conf, setConf] = useState<Confirmar | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  // 9n · Lote en escritorio (elegir varios → Tomar / Asignar a… / Soltar) y los atajos J/K (siguiente/anterior) · A (aprobar) · R (rechazar).
  const [sel, setSel] = useState<string[] | null>(null);
  const actsRef = useRef<{ l: string; v?: string; off?: boolean; onClick: () => void }[]>([]);
  const [pend, start] = useTransition();
  // 7g · El copiloto en una ayuda escalada (cola «sop»): el borrador va al mensaje de «Resolver con un mensaje»; nada se envía solo.
  const [cop, setCop] = useState<(Extract<BorradorCopiloto, { ok: true }> & { caso: string }) | null>(null), [copBusy, setCopBusy] = useState(false);
  useEffect(() => { setConf(null); setChecks({}); setCop(null); setCopBusy(false); }, [caso?.id]);
  const sugerir = (id: string) => { setCopBusy(true); copilotoSugerir({ cola: id }).then((r) => {
    setCopBusy(false);
    if (!r.ok) { setToast(r.msg); if (r.apagado) router.refresh(); return; }
    setCop({ ...r, caso: id }); setToast(E("Revísalo antes de enviar: sale con tu nombre.", "Review it before sending: it goes out under your name."));
  }, () => { setCopBusy(false); setToast(E("El Compa no está disponible ahora. Escribe tu respuesta.", "El Compa isn't available right now. Write your reply.")); }); };
  const ir = (p: Record<string, string | null>) => { const q = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v === null) q.delete(k); else q.set(k, v); } if (!("pag" in p)) q.delete("pag"); router.push(`${path}${q.size ? `?${q}` : ""}`, { scroll: false }); };
  const cola = (sp.get("cola") as Cola | null) ?? null, filtro = sp.get("f");
  const run = (f: () => Promise<ResAdm>, after?: (r: ResAdm) => void) => start(async () => { const r = await f(); setToast(r.mensaje ?? (r.ok ? E("Listo. Quedó en la auditoría.", "Done. It's in the audit log.") : "")); if (r.ok) { after?.(r); router.refresh(); } });
  // 9j · Ver las fotos de Salud con motivo no cierra el caso: se queda en él para verlas.
  const quedarse = useRef(false);
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo. Quedó en la auditoría.", "Done. It's in the audit log.")); setConf(null); if (quedarse.current) { quedarse.current = false; router.refresh(); return; } ir({ caso: null }); router.refresh(); };

  const lista: (Bloque | null)[] = [
    { type: "head", eye: E(`${total} CASOS · ${vencidos} VENCIDOS`, `${total} CASES · ${vencidos} OVERDUE`), t: E("Colas", "Queues"), s: E("Todo lo que espera una decisión de una persona. La más vieja contra su plazo va primero.", "Everything waiting for a person's decision. The oldest against its deadline goes first."),
      act: puedeAprobar ? { l: E("Tomar siguiente", "Take next"), v: "action", icon: "check", onClick: () => run(tomarSiguiente, (r) => { if (r.ok && r.caso) ir({ caso: r.caso }); }) } : undefined, h1: desk ? 26 : 22 },
    { type: "tabs", items: [{ l: E("Todas", "All"), n: String(total || ""), on: !cola, onClick: () => ir({ cola: null, caso: null }) }, ...visibles.filter((k) => conteo[k]).map((k) => ({ l: qn(k), n: String(conteo[k]), on: cola === k, onClick: () => ir({ cola: k, caso: null }) }))] },
    { type: "chips", items: [["mios", E("Míos", "Mine")], ["sin", E("Sin asignar", "Unassigned")], ["venc", E("Vencidos", "Overdue")]].map(([k, l]) => ({ l: l!, v: filtro === k ? "selected" : "filter", onClick: () => ir({ f: filtro === k ? null : k! }) })) },
  ];
  const regla = cola ? COLAS[cola] : null;
  const asignarA = (ids: string[]) => start(async () => {
    const eq = await equipoDeCola(ids[0]!);
    if (!eq.length) { setToast(E("Nadie más del equipo trabaja esa cola en esa ciudad.", "No one else on the team works that queue in that city.")); return; }
    setConf({ titulo: ids.length === 1 ? E("Asignar el caso a…", "Assign the case to…") : E(`Asignar ${ids.length} casos a…`, `Assign ${ids.length} cases to…`), cta: E("Asignar", "Assign"), elegir: { label: E("PERSONA DEL EQUIPO", "TEAM MEMBER"), items: eq.map((x) => ({ k: x.id, l: x.nombre })) },
      sub: E("Le sale en «Míos». Si no lo decide en el tiempo de Configuración › Colas, vuelve a la cola. Queda en la auditoría.", "It shows in their “Mine”. If they don't decide within the time set in Configuration › Queues, it goes back to the queue. It stays in the audit log."), ini: E("Reparto del día", "Today's assignments"), plantillas: [E("Reparto del día", "Today's assignments"), E("Sabe de este tema", "Knows this topic"), E("Cubre a alguien de vacaciones", "Covering for someone on vacation")],
      hacer: async (_m, e) => { const r = await asignarCaso(ids, e); if (r.ok) setSel(null); return r; } });
  });
  // Atajos de teclado (escritorio): no se activan escribiendo en un campo.
  useEffect(() => {
    if (!desk) return;
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || conf || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return;
      const k = e.key.toLowerCase(), i = casos.findIndex((x) => x.id === caso?.id);
      if (k === "j" || k === "k") {
        const n = casos[k === "j" ? Math.min(casos.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1)];
        if (n && n.queue !== "ticket") { e.preventDefault(); ir({ caso: n.id }); }
      } else if ((k === "a" || k === "r") && caso) {
        const a = actsRef.current.filter((x) => !x.off), b = k === "a" ? a.find((x) => x.v !== "danger") : a.find((x) => x.v === "danger");
        if (b) { e.preventDefault(); b.onClick(); }
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [desk, casos, caso?.id, conf]); // eslint-disable-line react-hooks/exhaustive-deps
  const ancho = desk && !(lado && caso);
  const tarjetas = casos.map((x) => (
    <A.QueueCard key={x.id} icon={COLAS[x.queue].icon} state={x.esp.state} title={x.title} sub={x.sub} meta={qn(x.queue)}
      priority={x.priority === "alta" ? E("ALTA", "HIGH") : undefined} who={x.who} sla={en ? x.esp.label.replace("VENCIDO", "OVERDUE") : x.esp.label} assignee={x.assignee ? { name: x.assignee } : undefined}
      wide={ancho} columns={ancho ? "40px minmax(0,1.6fr) minmax(0,1fr) auto" : "40px minmax(0,1fr) auto"} active={sel ? sel.includes(x.id) : caso?.id === x.id}
      onClick={() => (sel ? (x.queue === "ticket" ? setToast(E("Un caso de Soporte se trabaja en Soporte.", "A Support case is handled in Support.")) : setSel(sel.includes(x.id) ? sel.filter((y) => y !== x.id) : [...sel, x.id])) : x.queue === "ticket" && x.tk ? router.push(`/admin/soporte?caso=${x.tk}`) : ir({ caso: x.id }))} />));

  const detalle = caso ? cuerpo() : null;
  function cuerpo(): ReactNode {
    const k = caso!, Q = COLAS[k.queue], n = k.negocio, out: (Bloque | null)[] = [];
    const esEntrega = k.queue === "entrega";
    const nn = n?.name ?? "", AYD = en ? AYUDA_DE_EN : AYUDA_DE;
    const titulo = (esEntrega ? `${E("Incidencia de entrega", "Delivery incident")}${n?.name ? ` · ${n.name}` : ""}` : null) ?? tituloComunidad(k, E) ?? tituloEventos(k, E) ?? ("cambioNeg" in k && k.cambioNeg ? `${(en ? CAMBIO_NEG_EN : CAMBIO_NEG)[k.cambioNeg.type] ?? E("Cambio sensible", "Sensitive change")} · ${k.cambioNeg.nombre}` : null) ?? (k.queue === "cambio" && "cambio" in k && k.cambio ? `${k.cambio.type === "deleteUser" ? E("Borrar cuenta", "Delete account") : k.cambio.type === "mergeUser" ? E("Fusionar cuentas", "Merge accounts") : E("Cambio sensible", "Sensitive change")} · ${k.cambio.nombre ?? k.cambio.phone}` : k.queue === "cambio" ? `${E("Reclamo", "Claim")} · ${nn}` : k.queue === "lic" ? `${E("Licencia", "License")} · ${nn}` : k.queue === "sello" ? `${E("Sello", "Seal")} · ${nn}` : k.queue === "nuevo" ? n?.name ?? "" : k.queue === "medios" ? `${E("Foto marcada", "Flagged photo")} · ${nn}` : k.queue === "cuidado" ? `${E("Cuidado de niños", "Child care")} · ${nn}` : k.queue === "salir" ? `${E("No le dejan cancelar", "Won't let them cancel")} · ${nn}` : k.queue === "grupo" ? `${E("Grupos que no abrieron", "Groups that didn't open")} · ${nn}` : k.queue === "plantones" ? `${E("Plantones", "No-shows")} · ${nn}` : k.queue === "vivienda" ? `${k.subject_kind === "listing" ? E("Vivienda para mayores", "Senior housing") : E("Vivienda justa", "Fair housing")} · ${nn}` : k.queue === "estafa" ? `${E("Posible estafa", "Possible scam")} · ${nn}` : k.queue === "ticket" ? `${E("Soporte", "Support")} · ${"tk" in k && k.tk ? k.tk : E("caso", "case")}` : k.queue === "sop" ? `${AYD["ayuda" in k && k.ayuda ? k.ayuda.k : "order"] ?? E("Ayuda con un pedido", "Help with an order")} · ${nn}` : k.queue === "mesa" ? `${E("Mesas no respetadas", "Tables not honored")} · ${nn}` : k.queue === "noid" ? `${E("Sin identificación", "No ID")} · ${nn}` : k.queue === "rep" ? `${E("Reseña reportada", "Reported review")} · ${nn}` : k.queue === "rec" && "rec" in k ? k.rec?.business_name ?? "" : "");
    out.push({ type: "head", eye: `${en ? Q.en.toUpperCase() : Q.es.toUpperCase()} · ${k.esp.r >= 1 ? E(`${k.esp.t} · VENCIDO`, `${k.esp.t} · OVERDUE`) : E(`${k.esp.t} esperando`, `${k.esp.t} waiting`)}`, t: titulo, h1: 22, onBack: lado ? undefined : () => ir({ caso: null }) });
    if (k.status !== "open") return <><PanelBloques bloques={[out[0]!, { type: "empty", icon: "check", t: E("Ya se decidió", "Already decided"), s: E("Este caso salió de la cola.", "This case has left the queue.") }]} /></>;
    // 7b · Un caso de Soporte se trabaja en su ficha de Soporte (hilo, macros, notas internas, devolver).
    if (k.queue === "ticket") return <PanelBloques bloques={[out[0]!, { type: "note", tone: "info", icon: "chat", t: E("Este caso se contesta en Super Admin › Soporte: ahí están el hilo, las macros, las notas internas y «Resolver y devolver».", "This case is answered in Super Admin › Support: the thread, macros, internal notes and “Resolve and refund” are there."), cta: E("Abrir en Soporte", "Open in Support"), onCta: () => router.push("tk" in k && k.tk ? `/admin/soporte?caso=${k.tk}` : "/admin/soporte") }]} />;
    const notas: ReactNode[] = [];
    if (k.assigned_to && !k.mine) notas.push(<A.AdminNote key="a" tone="warn" icon="users" cta={k.puedeDecidir ? E("Tomarlo", "Take it") : undefined} onCta={() => run(() => tomarCaso(k.id))}>{E(`Lo está viendo ${k.assignee ?? "otra persona"}.`, `${k.assignee ?? "Someone else"} is looking at it.`)}</A.AdminNote>);
    else if (!k.assigned_to && k.puedeDecidir) notas.push(<A.AdminNote key="a" tone="info" icon="users" cta={E("Tomar", "Take")} onCta={() => run(() => tomarCaso(k.id))}>{E("Sin asignar. Tómalo para que nadie más lo trabaje.", "Unassigned. Take it so no one else works on it.")}</A.AdminNote>);
    if (!k.puedeDecidir) notas.push(<A.AdminNote key="p" tone="warn" icon="lock">{E("Tu rol solo puede ver esta cola.", "Your role can only view this queue.")}</A.AdminNote>);
    const filaNeg = n ? <A.AdminList key="n" rows={[{ image: n.cover ?? undefined, initials: n.cover ? undefined : n.name.slice(0, 1), title: n.name, sub: `${n.cat} · ${n.plan === "pro" ? "Pro" : "Free"}${n.verified ? E(" · Verificado", " · Verified") : ""}`, chevron: true, onClick: () => router.push(`/admin/negocios/${n.id}`) }]} /> : null;
    const cuerpoB: (Bloque | null)[] = [];
    let acts: { l: string; v?: string; icon?: string; off?: boolean; onClick: () => void }[] = [];
    let extra: ReactNode = null;
    // 7g · El copiloto (solo la cola «sop» y solo si el servidor dice que está): la nota con el resumen y el siguiente paso, el borrador, y el botón.
    const copOn = k.queue === "sop" && "copiloto" in k && !!k.copiloto, cp = copOn && cop && cop.caso === k.id ? cop : null;
    const copBloques: Bloque[] = cp ? [
      { type: "note", tone: "info", icon: "help", t: `EL COMPA · ${cp.resumen}${cp.siguiente ? E(` Siguiente paso: ${cp.siguiente}`, ` Next step: ${cp.siguiente}`) : ""}${cp.devolver ? E(" Si corresponde devolver, «Resolver y devolver» lo decides tú.", " If a refund applies, you decide with “Resolve and refund”.") : ""}${cp.ai ? "" : E(" (sin IA: borrador de reglas)", " (no AI: rules-based draft)")}`,
        ...(cp.fuente ? { cta: E(`Ayuda: ${cp.fuente.titulo.es}`, `Help: ${cp.fuente.titulo.en}`), onCta: () => window.open(cp.fuente!.href, "_blank", "noopener") } : {}) },
      { type: "note", tone: "ink", icon: "quote", t: E(`BORRADOR DE EL COMPA · «${cp.borrador}» · Revísalo antes de enviar: sale con tu nombre.`, `EL COMPA DRAFT · “${cp.borrador}” · Review it before sending: it goes out under your name.`) }] : [];
    const copAct = copOn ? [{ l: copBusy ? E("El Compa está escribiendo…", "El Compa is writing…") : cp ? E("Otro borrador con El Compa", "Another draft with El Compa") : E("Sugerir respuesta con El Compa", "Suggest a reply with El Compa"), v: "secondary", icon: "help", off: copBusy, onClick: () => sugerir(k.id) }] : [];
    if (k.queue === "sello" && n) {
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: E("DIRECCIÓN", "ADDRESS"), v: n.address ?? "—" }, { k: E("TELÉFONO", "PHONE"), v: n.phone || "—" }, { k: E(`EN ${n.ciudad.toUpperCase()} DESDE`, `IN ${n.ciudad.toUpperCase()} SINCE`), v: n.founded ? String(n.founded) : "—" }, { k: E("FOTOS", "PHOTOS"), v: String(n.fotos) }, { k: E("RESEÑAS", "REVIEWS"), v: String(n.reviews) }, { k: "PLAN", v: n.plan === "pro" ? "Pro" : "Free" }] });
      cuerpoB.push({ type: "group", k: E("LISTA DE VERIFICACIÓN", "VERIFICATION CHECKLIST") });
      extra = (
        <A.AdminList rows={([["existe", E(`Existe en ${n.ciudad} (dirección y fotos coinciden)`, `Exists in ${n.ciudad} (address and photos match)`)], ["representa", E("Quien pide representa al negocio (teléfono del local)", "The requester represents the business (location phone)")], ["coincide", E("La página dice lo que el negocio hace", "The page says what the business does")]] as const).map(([key, t]) => ({
          icon: checks[key] ? "check" : "help", title: t, toggle: !!checks[key], onClick: () => setChecks((z) => ({ ...z, [key]: !z[key] })), bg: checks[key] ? "var(--tl-ds-e3f4f1)" : undefined }))} />);
      const tres = !!(checks.existe && checks.representa && checks.coincide);
      acts = [
        { l: E("Aprobar sello", "Approve seal"), v: "action", icon: "verified", onClick: () => (tres ? run(() => decidirSello(k.id, "aprobar", "", checks), () => ir({ caso: null })) : setToast(E("Marca las tres comprobaciones primero.", "Check all three items first."))) },
        { l: E("Pedir un dato", "Ask for info"), v: "ghost", icon: "chat", onClick: () => setConf({ titulo: E("¿Qué le falta?", "What's missing?"), plantillas: P.selloInfo, hacer: (m) => decidirSello(k.id, "info", m, checks) }) },
        { l: E("No aprobar", "Don't approve"), v: "danger", icon: "close", onClick: () => setConf({ titulo: E("¿Por qué no se aprueba?", "Why isn't it approved?"), plantillas: P.selloNo, peligro: true, hacer: (m) => decidirSello(k.id, "no", m, checks) }) },
      ];
    }
    if (k.queue === "nuevo" && n) {
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: E("CATEGORÍA", "CATEGORY"), v: n.cat }, { k: E("SUBCATEGORÍAS", "SUBCATEGORIES"), v: n.subs ?? "—" }, { k: E("FOTOS", "PHOTOS"), v: String(n.fotos) }, { k: E("ORIGEN", "SOURCE"), v: E("Publica tu negocio", "List your business") }, { k: "PLAN", v: n.plan === "pro" ? (n.trial ? E("Pro · prueba 30 días", "Pro · 30-day trial") : "Pro") : "Free" }] });
      cuerpoB.push({ type: "note", tone: "info", t: E("Revisión ligera: nombre real, categoría correcta, fotos del negocio. Nada más.", "Light review: real name, correct category, photos of the business. Nothing else.") });
      acts = [
        { l: E("Ver como cliente", "View as customer"), icon: "search", onClick: () => window.open(`/n/${n.id}`, "_blank") },
        { l: E("Todo bien", "All good"), v: "action", icon: "check", onClick: () => run(() => decidirNuevo(k.id, "ok", ""), () => ir({ caso: null })) },
        { l: E("Ocultar", "Hide"), v: "danger", icon: "ban", onClick: () => setConf({ titulo: E("¿Por qué se oculta?", "Why is it hidden?"), plantillas: P.biz, peligro: true, hacer: (m) => decidirNuevo(k.id, "ocultar", m) }) },
      ];
    }
    if (k.queue === "cambio" && "reclamo" in k && k.reclamo && n) {
      const c = k.reclamo, ROL: Record<string, string> = en ? { dueno: "owner", socio: "partner", encargado: "manager" } : { dueno: "dueño", socio: "socio", encargado: "encargado" }, DOC: Record<string, string> = en ? { licencia: "Business license", servicio: "Electric or water bill", ein: "IRS letter with the EIN", otro: "Other document" } : { licencia: "Licencia del negocio", servicio: "Factura de luz o agua", ein: "Carta del IRS con el EIN", otro: "Otro documento" };
      const diasAviso = c.notified ? Math.floor((ahora - new Date(c.notified).getTime()) / 86_400_000) : null;
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: E("LO RECLAMA", "CLAIMED BY"), v: `${c.quien ?? E("Sin nombre", "No name")} · ${c.quien_tel}` }, { k: E("AFECTA A", "AFFECTS"), v: E("El panel del negocio pasa a esta persona", "The business dashboard goes to this person") }, { k: E("RECLAMO", "CLAIM"), v: `#${c.id}` }, { k: E("ORIGEN", "SOURCE"), v: c.source === "publica" ? E("Publica tu negocio (nombre repetido)", "List your business (duplicate name)") : E("Recuperar tu negocio", "Recover your business") }] });
      if (c.doc) extra = <div style={{ height: 220, borderRadius: 18, backgroundImage: `url("/api/admin/reclamo/${c.id}")`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundColor: "var(--tl-photo-bg)" }} />;
      cuerpoB.push({ type: "group", k: E("EVIDENCIAS", "EVIDENCE") });
      cuerpoB.push({ type: "rows", items: [
        c.method === "call_code" ? { icon: "check", ibg: "rgba(0,229,196,.14)", ifg: "var(--tl-open-text)", t: E("Código por mensaje al teléfono del negocio: correcto", "Code by text to the business phone: correct") } : { icon: "check", ibg: "rgba(0,229,196,.14)", ifg: "var(--tl-open-text)", t: E(`Documento: ${DOC[c.doc_kind ?? "otro"]} (foto abajo)`, `Document: ${DOC[c.doc_kind ?? "otro"]} (photo below)`) },
        { icon: "users", t: E(`Dice que es ${ROL[c.role] ?? c.role} del negocio`, `Says they're the business ${ROL[c.role] ?? c.role}`) },
        ...(c.dueno_actual ? [{ icon: "warning", ibg: "rgba(255,176,32,.14)", ifg: "var(--tl-pro-ink)", t: E(`Ya tiene dueño: ${c.dueno_actual}.`, `Already has an owner: ${c.dueno_actual}.`), s: diasAviso == null ? E("Sin aviso.", "Not notified.") : diasAviso >= 7 ? E(`Vio el aviso hace ${diasAviso} días: ya puede aplicarlo un Admin.`, `Saw the notice ${diasAviso} days ago: an Admin can apply it now.`) : E(`Vio el aviso hace ${diasAviso} ${diasAviso === 1 ? "día" : "días"}: tiene 7 días para responder.`, `Saw the notice ${diasAviso} ${diasAviso === 1 ? "day" : "days"} ago: they have 7 days to respond.`) }] : []),
      ] });
      cuerpoB.push({ type: "note", tone: "ink", icon: "quote", t: E(`LO QUE PIDIÓ · «${c.note ?? (c.source === "publica" ? "Pidió recuperar el negocio desde Publica tu negocio (nombre repetido)." : "Pidió recuperar el negocio.")}»`, `WHAT THEY ASKED · “${c.note ?? (c.source === "publica" ? "Asked to recover the business from List your business (duplicate name)." : "Asked to recover the business.")}”`) });
      acts = [
        { l: E("Aplicar cambio", "Apply change"), v: "action", icon: "check", onClick: () => setConf({ titulo: E("Confirmar el cambio", "Confirm the change"), sub: E("Quien reclama pasa a ser el dueño y entra al panel. El motivo queda en la auditoría.", "The claimant becomes the owner and gets into the dashboard. The reason stays in the audit log."), cta: E("Aplicar", "Apply"), hacer: (m) => decidirReclamo(k.id, true, m) }) },
        { l: E("Rechazar", "Reject"), v: "danger", icon: "close", onClick: () => setConf({ titulo: E("¿Por qué no se aplica?", "Why isn't it applied?"), sub: E("El motivo lo ve quien reclamó.", "The claimant sees the reason."), peligro: true, plantillas: [E("El documento no muestra el nombre del negocio", "The document doesn't show the business name"), E("La dirección no coincide con la página", "The address doesn't match the page"), E("No pudimos confirmar que eres del negocio", "We couldn't confirm you're with the business")], hacer: (m) => decidirReclamo(k.id, false, m) }) },
      ];
    }
    if (k.queue === "cambio" && "cambio" in k && k.cambio) {
      const c = k.cambio;
      extra = <A.AdminList rows={[{ initials: (c.nombre ?? "?").slice(0, 1), title: c.nombre ?? E("(sin nombre todavía)", "(no name yet)"), sub: `${c.phone}${c.ciudad ? ` · ${c.ciudad}` : ""}`, chevron: true, onClick: () => router.push(`/admin/usuarios/${c.target_id}`) }]} />;
      const fusion = c.type === "mergeUser";
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: E("LO PIDIÓ", "REQUESTED BY"), v: c.quien ?? E("Equipo", "Team") }, { k: E("AFECTA A", "AFFECTS"), v: fusion ? E(`Esta cuenta pasa a la de ${c.hacia ?? "la otra cuenta"}`, `This account moves into ${c.hacia ?? "the other account"}`) : E("La cuenta y todo lo suyo", "The account and everything in it") }, { k: E("PEDIDO", "REQUEST"), v: `#${c.id}` }, { k: E("NEGOCIOS DE LOS QUE ES DUEÑA", "BUSINESSES IT OWNS"), v: String(c.negocios) }] });
      cuerpoB.push({ type: "note", tone: "ink", icon: "quote", t: E(`MOTIVO · «${c.reason}»`, `REASON · “${c.reason}”`) });
      // 9d · D5: lo que pasa a los 30 días es lo que hace la purga por el mapa de datos (Usuarios 360° › Privacidad muestra cada tabla).
      cuerpoB.push({ type: "note", tone: "info", t: fusion
        ? E("Al aplicarlo, sus pedidos, cobros, direcciones, guardados, reseñas y publicaciones pasan a la otra cuenta; esta queda fusionada y ya no entra. Queda en la auditoría.", "When applied, its orders, charges, addresses, saved items, reviews and posts move to the other account; this one is merged and can no longer sign in. It stays in the audit log.")
        : E("Al aplicarlo hay 30 días de gracia para restaurarla. Después se borra todo lo suyo; sus pedidos y cobros quedan como «Cuenta borrada», sin nombre ni teléfono (lo pide la ley), y los pagos con tarjeta quedan en Stripe.", "When applied, there's a 30-day grace period to restore it. After that everything in it is deleted; its orders and charges stay as “Deleted account”, with no name or phone (required by law), and card payments stay in Stripe.") });
      if (c.mio) cuerpoB.push({ type: "note", tone: "warn", icon: "lock", t: E("Lo pediste tú: lo aplica otra persona del equipo.", "You requested it: another team member applies it.") });
      acts = c.mio ? [] : [
        { l: E("Aplicar cambio", "Apply change"), v: "action", icon: "check", onClick: () => setConf(fusion ? { titulo: E("Confirmar la fusión", "Confirm the merge"), sub: E("Todo lo que se mueve pasa a la otra cuenta y esta ya no entra. Queda en la auditoría.", "Everything that moves goes to the other account and this one can no longer sign in. It stays in the audit log."), cta: E("Aplicar", "Apply"), peligro: true, hacer: (m) => decidirCambio(k.id, true, m) }
          : { titulo: E("Confirmar el borrado", "Confirm the deletion"), sub: E("La cuenta no puede entrar desde ahora y tiene 30 días de gracia. Queda en la auditoría.", "The account can't sign in from now on and has a 30-day grace period. It stays in the audit log."), cta: E("Aplicar", "Apply"), peligro: true, hacer: (m) => decidirCambio(k.id, true, m) }) },
        { l: E("Rechazar", "Reject"), v: "danger", icon: "close", onClick: () => setConf({ titulo: E("¿Por qué no se aplica?", "Why isn't it applied?"), hacer: (m) => decidirCambio(k.id, false, m) }) },
      ];
    }
    // 9n-8 · El cambio de un NEGOCIO (lo pidió alguien desde el 360° o desde «Posibles duplicados»): lo aplica otra persona.
    if (k.queue === "cambio" && "cambioNeg" in k && k.cambioNeg) {
      const c = k.cambioNeg, T = c.type;
      extra = <A.AdminList rows={[
        { icon: "store", title: c.nombre, sub: T === "mergeBiz" ? `${E("Queda", "Stays")}${c.ciudad ? ` · ${c.ciudad}` : ""}` : c.ciudad ?? "", chevron: true, onClick: () => router.push(`/admin/negocios/${c.target_id}`) },
        ...(T === "mergeBiz" && c.dup_id ? [{ icon: "store", title: c.dup ?? c.dup_id, sub: E("Se cierra y su página lleva al que queda", "It closes and its page leads to the one that stays"), chevron: true, onClick: () => router.push(`/admin/negocios/${c.dup_id}`) }] : []),
        ...(T === "transferOwner" && c.nuevo_id ? [{ initials: (c.nuevo ?? "?").slice(0, 1), title: c.nuevo ?? E("Sin nombre", "No name"), sub: `${E("Nuevo dueño", "New owner")} · ${c.nuevo_tel ?? ""}`, chevron: true, onClick: () => router.push(`/admin/usuarios/${c.nuevo_id}`) }] : []),
      ]} />;
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: E("LO PIDIÓ", "REQUESTED BY"), v: c.quien ?? E("Equipo", "Team") }, { k: E("PEDIDO", "REQUEST"), v: `#${c.id}` },
        ...(T === "mergeBiz" ? [{ k: E("SE CIERRA", "CLOSES"), v: c.dup ?? "—" }, { k: E("AFECTA A", "AFFECTS"), v: E("Reseñas, seguidores y guardados del duplicado pasan a este; el duplicado se cierra", "The duplicate's reviews, followers and saves move to this one; the duplicate closes") }]
          : T === "changeCategory" ? [{ k: E("DE", "FROM"), v: c.de ?? "—" }, { k: E("A", "TO"), v: c.a ?? "—" }]
          : [{ k: E("DUEÑO HOY", "CURRENT OWNER"), v: c.dueno ?? E("Sin dueño", "No owner") }, { k: E("NUEVO DUEÑO", "NEW OWNER"), v: c.nuevo ?? E("Sin nombre", "No name") }])] });
      cuerpoB.push({ type: "note", tone: "ink", icon: "quote", t: E(`MOTIVO · «${c.reason}»`, `REASON · “${c.reason}”`) });
      cuerpoB.push({ type: "note", tone: "info", t: T === "mergeBiz"
        ? E("Al aplicarlo, el duplicado sale de búsquedas y su página lleva al que queda. Sus pedidos y cobros se quedan con él (su liquidación es de su cuenta de cobro). Si tiene pedidos o citas abiertas, o paga Pro, no se puede todavía.", "When applied, the duplicate leaves search and its page leads to the one that stays. Its orders and charges stay with it (its payout belongs to its payout account). If it has open orders or appointments, or pays for Pro, it can't be done yet.")
        : T === "changeCategory" ? E("Al aplicarlo cambian sus módulos en la página, sus filtros y «lo que importa» en reseñas. Las subcategorías las elige el dueño otra vez; le llega un aviso.", "When applied, its page modules, filters and “what matters” in reviews change. The owner picks subcategories again; they get a notice.")
        : E("Al aplicarlo, el nuevo dueño entra al panel con todo el acceso y el anterior sale; los dos reciben su aviso. La cuenta de cobro es del negocio y no cambia.", "When applied, the new owner gets full dashboard access and the previous one is removed; both are notified. The payout account belongs to the business and doesn't change.") });
      if (c.mio) cuerpoB.push({ type: "note", tone: "warn", icon: "lock", t: E("Lo pediste tú: lo aplica otra persona del equipo.", "You requested it: another team member applies it.") });
      acts = c.mio ? [] : [
        { l: E("Aplicar cambio", "Apply change"), v: "action", icon: "check", onClick: () => setConf({ titulo: E("Confirmar el cambio", "Confirm the change"), sub: E("Queda en la auditoría con tu motivo.", "It stays in the audit log with your reason."), cta: E("Aplicar", "Apply"), peligro: T !== "changeCategory", hacer: (m) => decidirCambio(k.id, true, m) }) },
        { l: E("Rechazar", "Reject"), v: "danger", icon: "close", onClick: () => setConf({ titulo: E("¿Por qué no se aplica?", "Why isn't it applied?"), hacer: (m) => decidirCambio(k.id, false, m) }) },
      ];
    }
    if (k.queue === "lic" && "licencia" in k && k.licencia && n) {
      const l = k.licencia, est = (en ? { valid: ["Verified", "var(--tl-open-text)"], expired: ["Expired", "var(--tl-danger)"], not_found: ["Not found", "var(--tl-danger)"], revoked: ["Not found", "var(--tl-danger)"] } as Record<string, [string, string]> : { valid: ["Verificada", "var(--tl-open-text)"], expired: ["Vencida", "var(--tl-danger)"], not_found: ["No aparece", "var(--tl-danger)"], revoked: ["No aparece", "var(--tl-danger)"] } as Record<string, [string, string]>)[l.status] ?? [E("Por verificar", "To verify"), "var(--tl-pro-ink)"];
      const loc = en ? "en-US" : "es-US";
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: E("LICENCIA", "LICENSE"), v: l.title }, { k: E("PUEDE", "ALLOWS"), v: l.can }, { k: E("NÚMERO", "NUMBER"), v: l.number ? `${l.label} ${l.number}` : E("No lo dio", "Not provided") }, { k: E("ESTADO HOY", "STATUS TODAY"), v: est[0], fg: est[1] }, { k: E("ÚLTIMA REVISIÓN", "LAST CHECK"), v: l.checked ? new Date(l.checked).toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" }) : "—" }, { k: E("REGISTRO", "REGISTRY"), v: l.site }, ...(l.status === "valid" && l.next ? [{ k: E("PRÓXIMA REVISIÓN", "NEXT CHECK"), v: new Date(`${l.next}T12:00:00Z`).toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }), fg: l.next < hoyEn() ? "var(--tl-danger)" : "var(--tl-pro-ink)" }] : [])] });
      cuerpoB.push({ type: "note", tone: "info", t: E("Verifícala en el registro oficial del estado. Lo que decidas se ve en la ficha «Licencia» del negocio.", "Verify it in the official state registry. Your decision shows on the business's “License” page."), cta: E("Abrir registro", "Open registry"), onCta: () => window.open(l.url, "_blank", "noopener") });
      acts = [
        { l: E("Verificada", "Verified"), v: "action", icon: "verified", onClick: () => run(() => decidirLicencia(k.id, "valid", ""), () => ir({ caso: null })) },
        { l: E("Vencida", "Expired"), icon: "clock", onClick: () => setConf({ titulo: E("¿Qué dice el registro?", "What does the registry say?"), hacer: (m) => decidirLicencia(k.id, "expired", m) }) },
        { l: E("No aparece", "Not found"), v: "danger", icon: "close", onClick: () => setConf({ titulo: E("¿Qué buscaste y dónde?", "What did you search and where?"), peligro: true, hacer: (m) => decidirLicencia(k.id, "not_found", m) }) },
      ];
    }
    if (k.queue === "medios" && "foto" in k && n) {
      extra = k.foto ? (
        <div style={{ position: "relative", height: 220, borderRadius: 18, backgroundImage: `url("${k.foto.url}")`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "var(--tl-photo-bg)" }}>
          <span style={{ position: "absolute", left: 10, bottom: 10, padding: "4px 8px", borderRadius: 7, background: "rgba(11,14,18,.75)", color: "var(--tl-white)", font: "800 9.5px 'JetBrains Mono',monospace", letterSpacing: ".1em" }}>{E("REPORTADA POR UN VECINO", "REPORTED BY A NEIGHBOR")}</span>
        </div>) : null;
      const MOT: Record<string, string> = en ? { no_es: "Not from this business", inapropiado: "Inappropriate content", datos: "Shows personal data", spam: "It's advertising or spam", otro: "Other reason" } : { no_es: "No es de este negocio", inapropiado: "Contenido inapropiado", datos: "Muestra datos personales", spam: "Es publicidad o spam", otro: "Otro motivo" };
      const r0 = k.reportes[0];
      cuerpoB.push({ type: "note", tone: "warn", t: `${E("Reportada por un vecino", "Reported by a neighbor")}: ${MOT[r0?.reason ?? "otro"]}${r0?.note ? ` · «${r0.note}»` : ""}${k.reportes.length > 1 ? E(` · ${k.reportes.length} reportes`, ` · ${k.reportes.length} reports`) : ""} · ${E("Sigue visible mientras decides.", "It stays visible while you decide.")}` });
      const unica = (k.foto?.visibles ?? 0) <= 1;
      if (unica) cuerpoB.push({ type: "note", tone: "info", icon: "image", t: E("Es la única foto visible: para quitarla, pide al dueño que suba otra.", "It's the only visible photo: to remove it, ask the owner to upload another.") });
      acts = [
        { l: E("Está bien", "It's fine"), v: "action", icon: "check", onClick: () => run(() => decidirMedios(k.id, "mantener", ""), () => ir({ caso: null })) },
        { l: E("Quitar foto", "Remove photo"), v: "danger", icon: "trash", off: unica, onClick: () => setConf({ titulo: E("¿Por qué se quita?", "Why is it removed?"), plantillas: P.foto, peligro: true, hacer: (m) => decidirMedios(k.id, "quitar", m) }) },
      ];
    }
    // Toda ayuda que no es de un pedido de comida usa esta vista (citas, mercado, apartados, fiestas, viajes, noche e inscripciones; 4eg:
    // antes fiestas, viajes y noche caían en la vista del pedido de comida). También las colas «Cuidado de niños» y «No me dejan cancelar».
    if ((k.queue === "sop" || k.queue === "cuidado" || k.queue === "salir" || k.queue === "estafa") && "ayuda" in k && k.ayuda && k.ayuda.k !== "order") {
      // Ayuda con una cita (3e): qué pasó, qué quiere y cuánto, su nota y fotos, la decisión del negocio y lo que se puede
      // devolver a la tarjeta (el depósito pagado en la app). Resolver con monto devuelve a la tarjeta.
      const h = k.ayuda;
      const DEC: Record<string, string> = { ok: E("Aceptó", "Accepted"), alt: E(`Propuso devolver $${((h.offer ?? 0) / 100).toFixed(2)}`, `Offered to refund $${((h.offer ?? 0) / 100).toFixed(2)}`), no: E("Dijo que no puede", "Said they can't") };
      const usd = (c: number) => `$${(c / 100).toFixed(2)}`, dinero = "puedeDinero" in k && !!k.puedeDinero, li = en ? 1 : 0;
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: E("SOLICITUD", "REQUEST"), v: h.number }, { k: h.k === "visit" ? E("VISITA", "VISIT") : h.k === "market_order" ? E("PEDIDO", "ORDER") : h.k === "hold" ? E("APARTADO", "HOLD") : h.k === "party" ? E("FIESTA", "PARTY") : h.k === "trip" ? E("VIAJE", "TRIP") : h.k === "night" ? E("NOCHE", "NIGHT") : h.k === "enrollment" ? E("INSCRIPCIÓN", "ENROLLMENT") : h.k === "tickets" ? E("ORDEN DE BOLETOS", "TICKET ORDER") : E("CITA", "APPOINTMENT"), v: `${h.num}${h.svc ? ` · ${h.svc}` : ""}${h.k === "visit" ? "" : ` · ${usd(h.total)}`}` }, { k: E("CLIENTE", "CUSTOMER"), v: h.quien }, { k: E("QUÉ PASÓ", "WHAT HAPPENED"), v: motivoAyuda(h.reason, h.k === "market_order" ? "merc" : h.k === "hold" ? "tienda" : h.rub)[li] },
        { k: E("QUÉ QUIERE", "WHAT THEY WANT"), v: `${quiereAyuda(h.wants)[li]}${h.amount ? ` · ${usd(h.amount)}` : ""}` }, { k: E("DEVOLVIBLE A LA TARJETA", "REFUNDABLE TO CARD"), v: h.pago ? `${usd(h.pago)} (${h.k === "trip" ? E("el viaje", "the trip") : h.k === "tickets" ? E("lo cobrado; los boletos siguen valiendo", "the amount charged; the tickets remain valid") : E("depósito", "deposit")})` : h.rub === "salud" || h.rub === "pro" || h.rub === "fe" || h.rub === "inm" || h.rub === "dealer" ? E("Nada: no se cobra en la app", "Nothing: not charged in the app") : E("Nada: pagó en el local", "Nothing: paid in store") }] });
      if (h.body) cuerpoB.push({ type: "note", tone: "ink", icon: "quote", t: E(`LO QUE CUENTA · «${h.body}»`, `WHAT THEY SAY · “${h.body}”`) });
      // 9j · «Vidrio roto»: las fotos de una ayuda de Salud se ven solo después de escribir el motivo (10 minutos; queda en la auditoría).
      if (h.fotos.length && h.salud && !h.vidrio) cuerpoB.push({ type: "lock", t: E(`${h.fotos.length} ${h.fotos.length === 1 ? "foto" : "fotos"} de Salud`, `${h.fotos.length} Health ${h.fotos.length === 1 ? "photo" : "photos"}`), s: E("Son datos de salud: para verlas escribe por qué las necesitas. Queda en la auditoría y valen 10 minutos.", "This is health data: to view them, write why you need them. It stays in the audit log and access lasts 10 minutes."), cta: E("Ver con motivo", "View with a reason"),
        onCta: () => setConf({ titulo: E("Ver las fotos de Salud", "View the Health photos"), cta: E("Ver las fotos", "View the photos"), sub: E("El motivo queda en la auditoría con tu nombre. Las fotos se abren solo para ti durante 10 minutos.", "The reason stays in the audit log with your name. The photos open only for you for 10 minutes."),
          plantillas: [E("Revisar la factura para decidir la ayuda.", "Review the bill to decide the help request."), E("El paciente pidió que revisemos su cobro.", "The patient asked us to review their charge.")], hacer: async (m) => { const r = await verFotosSalud(h.hid, m); quedarse.current = r.ok; return r; } }) });
      else if (h.fotos.length) cuerpoB.push({ type: "photos", k: E("SUS FOTOS", "THEIR PHOTOS"), cols: 4, items: h.fotos.map((u) => ({ bg: `url(${u})`, key: u, onClick: () => window.open(u, "_blank", "noopener") })) });
      cuerpoB.push(h.reply ? { type: "note", tone: "info", icon: "chat", t: `${E("RESPUESTA DEL NEGOCIO", "BUSINESS REPLY")} · ${DEC[h.decision ?? ""] ?? E("Respondió", "Replied")} · «${h.reply}»${h.escalated_by === "user" ? E(" · el cliente pidió que lo revisemos", " · the customer asked us to review it") : ""}` } : k.queue === "estafa" || (h.escalated_by === "system" && (k.queue !== "sop" || h.k === "tickets")) ? { type: "note", tone: "warn", icon: "warning", t: E("Vino directo a To'Latino: no espera al negocio.", "It came straight to To'Latino: it doesn't wait for the business.") } : { type: "note", tone: "warn", icon: "clock", t: E(`El negocio no respondió en ${horasTxt(ayudaH, true)}.`, `The business didn't reply within ${horasTxt(ayudaH, false)}.`) });
      cuerpoB.push(...copBloques);
      // 4if · «Posible estafa»: lo que está en pausa, lo que vio la persona al pedir (la copia) y sus otras ayudas directas; decidir sin dinero.
      const pz = "pausa" in k ? k.pausa : null;
      if (k.queue === "estafa" && pz) {
        const cp = pz.copia as { rent?: number; dep?: number; moveIn?: number; price?: number; otd?: number; item?: string; que?: string } | null;
        cuerpoB.push({ type: "kv", cols: 3, items: [{ k: E("EN PAUSA", "PAUSED"), v: pz.kind ? `${pz.item ?? "—"} · ${pz.fin ? E("reanudada", "resumed") : pz.vivo ? E("se ve", "visible") : E("no se ve", "not visible")}` : E("Nada (ya no se veía)", "Nothing (it was no longer visible)"), fg: pz.kind && !pz.fin ? "var(--tl-danger)" : undefined },
          { k: E("LO QUE VIO AL PEDIR", "WHAT THEY SAW WHEN ASKING"), v: cp ? [cp.moveIn != null ? E(`Para mudarse ${usd(cp.moveIn)}`, `Move-in ${usd(cp.moveIn)}`) : null, cp.rent != null ? E(`renta ${usd(cp.rent)}`, `rent ${usd(cp.rent)}`) : null, cp.dep != null ? E(`depósito ${usd(cp.dep)}`, `deposit ${usd(cp.dep)}`) : null, cp.otd != null ? E(`En la puerta ${usd(cp.otd)}`, `Out the door ${usd(cp.otd)}`) : null, cp.price != null && cp.otd == null ? E(`precio ${usd(cp.price)}`, `price ${usd(cp.price)}`) : null].filter(Boolean).join(" · ") || "—" : "—" },
          { k: E("OTRAS EN 90 DÍAS", "OTHERS IN 90 DAYS"), v: String(pz.otras), fg: pz.otras > 0 ? "var(--tl-danger)" : undefined }] });
      }
      const plant = [E("Revisamos la cita y tus fotos: tienes razón. Te devolvemos lo cobrado de más.", "We reviewed the appointment and your photos: you're right. We're refunding the overcharge."), E("Hablamos con el negocio: te dan otra cita para arreglarlo sin cargo.", "We talked to the business: they'll give you another appointment to fix it at no charge."), E("Revisamos la cita: el servicio fue el publicado. Gracias por avisar.", "We reviewed the appointment: the service was as listed. Thanks for letting us know.")];
      if (k.queue === "estafa") acts = [
        { l: E("Sancionar", "Sanction"), v: "danger", icon: "warning", onClick: () => setConf({ titulo: E("¿Qué encontraste?", "What did you find?"), sub: E("Lo pausado queda fuera de su página (con este motivo) y el negocio recibe una advertencia. La persona ve tu respuesta. No se devuelve dinero desde aquí: no pasó por la app.", "What's paused stays off their page (with this reason) and the business gets a warning. The person sees your reply. No money is refunded from here: it didn't go through the app."), cta: E("Sancionar", "Sanction"), peligro: true,
          plantillas: [E("Revisamos tus fotos: te cobraron por ver. En To'Latino ver es gratis; el anuncio queda fuera y el negocio tiene una advertencia.", "We reviewed your photos: you were charged to view. On To'Latino viewing is free; the listing is removed and the business has a warning."), E("Revisamos tus fotos y lo publicado: pidieron más de lo publicado para mudarte. El anuncio queda fuera y el negocio tiene una advertencia.", "We reviewed your photos and the listing: they asked for more than listed to move in. The listing is removed and the business has a warning."), E("La ayuda de la iglesia es gratis. Revisamos lo que nos mandaste: «Pedir fecha» queda fuera y el lugar tiene una advertencia.", "Church help is free. We reviewed what you sent: “Request a date” is removed and the place has a warning.")], hacer: (m) => decidirEstafa(k.id, "sancion", m) }) },
        { l: E("Sin acción · se ve otra vez", "No action · show again"), v: "secondary", icon: "check", onClick: () => setConf({ titulo: E("¿Qué encontraste?", "What did you find?"), sub: E("Lo pausado vuelve a verse y el caso se cierra. La persona y el negocio ven tu respuesta.", "What's paused shows again and the case closes. The person and the business see your reply."), cta: E("Cerrar sin acción", "Close with no action"),
          plantillas: [E("Revisamos tus fotos y lo publicado: lo que te pidieron era lo publicado (primer mes y depósito).", "We reviewed your photos and the listing: what they asked for was what was listed (first month and deposit)."), E("Hablamos con el negocio y lo corrigió; te devolvió lo cobrado.", "We talked to the business and they fixed it; they refunded what they charged."), E("No encontramos un cobro por ver en lo que nos mandaste. Si tienes otra prueba, escríbenos.", "We didn't find a viewing charge in what you sent. If you have other proof, write to us.")], hacer: (m) => decidirEstafa(k.id, "sin_accion", m) }) },
        ...(pz && pz.kind ? [pz.fin || pz.vivo ? { l: E("Pausar mientras decides", "Pause while you decide"), v: "ghost", icon: "close", onClick: () => setConf({ titulo: E("¿Por qué se pausa?", "Why is it paused?"), sub: E("Sale de su página hasta que decidas. Queda en la auditoría.", "It leaves their page until you decide. It stays in the audit log."), cta: E("Pausar", "Pause"), plantillas: [E("Mientras revisamos la solicitud.", "While we review the request.")], hacer: (m) => pausaEstafa(k.id, true, m) }) }
          : { l: E("Reanudar mientras decides", "Resume while you decide"), v: "ghost", icon: "check", onClick: () => setConf({ titulo: E("¿Por qué se vuelve a mostrar?", "Why is it shown again?"), sub: E("Se ve otra vez; el caso sigue abierto. Queda en la auditoría.", "It's visible again; the case stays open. It stays in the audit log."), cta: E("Reanudar", "Resume"), plantillas: [E("El negocio ya mandó pruebas; lo vemos con calma.", "The business already sent proof; we'll review it carefully.")], hacer: (m) => pausaEstafa(k.id, false, m) }) }] : []),
        { l: E("Ver el cliente", "View the customer"), icon: "users", onClick: () => router.push(`/admin/usuarios/${h.uid}`) },
      ];
      else acts = [
        { l: E("Resolver con un mensaje", "Resolve with a message"), v: "action", icon: "check", onClick: () => setConf({ titulo: E("Tu respuesta al cliente", "Your reply to the customer"), sub: E("La ve en su cita; el negocio la ve en su panel. Queda en la auditoría.", "They see it on their appointment; the business sees it in its dashboard. It stays in the audit log."), cta: E("Resolver", "Resolve"), plantillas: cp ? [cp.borrador, ...plant] : plant, ini: cp?.borrador, hacer: (m) => decidirSop(k.id, m, null, null, cp?.id ?? null) }) },
        ...copAct,
        ...(dinero && h.pago > 0 ? [{ l: E("Resolver y devolver", "Resolve and refund"), v: "secondary", icon: "card", onClick: () => { const clave = uuid(); setConf({ titulo: h.k === "tickets" ? E(`Resolver y devolver · orden ${h.num}`, `Resolve and refund · order ${h.num}`) : E(`Resolver y devolver · cita ${h.num}`, `Resolve and refund · appointment ${h.num}`), cta: E("Resolver y devolver", "Resolve and refund"), peligro: true,
          sub: h.k === "tickets" ? E(`Hasta ${usd(h.pago)} (lo cobrado en la app). Vuelve a su tarjeta en 3 a 5 días hábiles; los boletos siguen valiendo (para quitarlos, se cancelan o se devuelven desde la orden).`, `Up to ${usd(h.pago)} (what was charged in the app). It goes back to their card in 3 to 5 business days; the tickets remain valid (to remove them, cancel or refund them from the order).`) : E(`Hasta ${usd(h.pago)} (el depósito pagado en la app). Vuelve a su tarjeta en 3 a 5 días hábiles; la comisión baja en proporción.`, `Up to ${usd(h.pago)} (the deposit paid in the app). It goes back to their card in 3 to 5 business days; the commission goes down proportionally.`),
          valor: { k: E("MONTO EN DÓLARES", "AMOUNT IN DOLLARS"), ini: ((Math.min(h.amount ?? h.pago, h.pago)) / 100).toFixed(2), max: 8 }, plantillas: cp ? [cp.borrador, ...plant] : plant, hacer: (m, _e, v) => decidirSop(k.id, m, v, clave, cp?.id ?? null) }); } }] : []),
        { l: E("Ver el cliente", "View the customer"), icon: "users", onClick: () => router.push(`/admin/usuarios/${h.uid}`) },
        // 4eg · «Cuidado de niños»: los datos del niño solo con motivo, y quedan en la auditoría.
        ...(k.queue === "cuidado" ? [{ l: E("Ver los datos del niño", "View the child's details"), icon: "shield", onClick: () => setConf({ titulo: E("¿Para qué necesitas ver los datos del niño?", "Why do you need to see the child's details?"), sub: E("Solo Soporte o Admin. Queda en la auditoría con tu motivo; se muestran solo en esta pantalla.", "Support or Admin only. It stays in the audit log with your reason; they're shown only on this screen."), cta: E("Ver los datos", "View the details"),
          plantillas: [E("Para hablar con el lugar sobre lo que pasó con este niño.", "To talk with the place about what happened with this child."), E("Para pasar el caso a las autoridades (ChildLine).", "To refer the case to the authorities (ChildLine).")], hacer: (m) => verNinoCaso(k.id, m) }) }] : []),
      ];
    }
    if (k.queue === "sop" && "ayuda" in k && k.ayuda && k.ayuda.k === "order") {
      // Ayuda con un pedido: qué pasó, qué platos, qué quiere, su nota, la respuesta del negocio y el pedido.
      const h = k.ayuda, MOT: Record<string, string> = en ? { falta: "Something missing", equivocado: "Wrong item", frio: "Arrived cold or poorly made", danado: "Arrived damaged or spilled", tarde: "Arrived late", nollego: "Never arrived", pago: "Payment issue", otro: "Other issue" } : { falta: "Falta algo", equivocado: "Llegó algo equivocado", frio: "Llegó frío o mal preparado", danado: "Llegó dañado o derramado", tarde: "Llegó tarde", nollego: "No le llegó", pago: "Problema con el pago", otro: "Otro problema" };
      const Q: Record<string, string> = en ? { reponer: "Wants it replaced", devolver: "Wants a refund for those items", avisar: "Just wants them to know" } : { reponer: "Que se lo repongan", devolver: "Que le devuelvan lo de esos platos", avisar: "Solo quiere que lo sepan" };
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: E("SOLICITUD", "REQUEST"), v: h.number }, { k: E("PEDIDO", "ORDER"), v: `#${h.num} · $${(h.total / 100).toFixed(2)}` }, { k: E("CLIENTE", "CUSTOMER"), v: h.quien }, { k: E("QUÉ PASÓ", "WHAT HAPPENED"), v: MOT[h.reason] ?? h.reason },
        ...(h.items.length ? [{ k: E("PLATOS", "ITEMS"), v: h.items.map((x) => `${x.q} × ${x.n}`).join(" · ") }] : []), { k: E("QUÉ QUIERE", "WHAT THEY WANT"), v: Q[h.wants] ?? h.wants }] });
      if (h.body) cuerpoB.push({ type: "note", tone: "ink", icon: "quote", t: E(`SU NOTA · «${h.body}»`, `THEIR NOTE · “${h.body}”`) });
      cuerpoB.push(h.reply ? { type: "note", tone: "info", icon: "chat", t: `${E("RESPUESTA DEL NEGOCIO", "BUSINESS REPLY")} · «${h.reply}»${h.escalated_by === "user" ? E(" · el cliente pidió que lo revisemos", " · the customer asked us to review it") : ""}` } : { type: "note", tone: "warn", icon: "clock", t: E(`El negocio no respondió en ${horasTxt(ayudaH, true)}.`, `The business didn't reply within ${horasTxt(ayudaH, false)}.`) });
      cuerpoB.push(...copBloques);
      const plantP = [E("Hablamos con el negocio: te reponen lo que faltó.", "We talked to the business: they'll replace what was missing."), E("Hablamos con el negocio: te devuelven lo de esos platos en el local.", "We talked to the business: they'll refund those items at the store."), E("Gracias por avisar. Se lo dijimos al negocio para que no vuelva a pasar.", "Thanks for letting us know. We told the business so it doesn't happen again.")];
      acts = [
        { l: E("Resolver con un mensaje", "Resolve with a message"), v: "action", icon: "check", onClick: () => setConf({ titulo: E("Tu respuesta al cliente", "Your reply to the customer"), sub: E("La ve en su pedido; el negocio la ve en su panel. Queda en la auditoría.", "They see it on their order; the business sees it in its dashboard. It stays in the audit log."), cta: E("Resolver", "Resolve"),
          plantillas: cp ? [cp.borrador, ...plantP] : plantP, ini: cp?.borrador,
          hacer: (m) => decidirSop(k.id, m, null, null, cp?.id ?? null) }) },
        ...copAct,
        // 9n-4 · Reponer con un pedido nuevo de $0 (sigue el flujo del negocio y del Repartidor) y devolver a la tarjeta lo pagado en la app.
        ...(h.wants === "reponer" && ["falta", "equivocado", "frio", "danado", "nollego"].includes(h.reason) ? [{ l: E("Resolver y reponer", "Resolve and replace"), v: "secondary", icon: "bag", onClick: () => setConf({ titulo: E(`Resolver y reponer · pedido #${h.num}`, `Resolve and replace · order #${h.num}`), cta: E("Resolver y reponer", "Resolve and replace"),
          sub: E("Un pedido nuevo de $0 con esos platos (o todo el pedido si no le llegó), a la misma dirección. Entra aceptado a la cocina del negocio y, si es delivery, al Repartidor. Queda en la auditoría.", "A new $0 order with those items (or the whole order if it never arrived), to the same address. It goes straight to the business's kitchen as accepted and, if it's delivery, to the Driver app. It stays in the audit log."),
          plantillas: [E("Hablamos con el negocio: te reponen lo que faltó sin costo. Lo ves como un pedido nuevo de $0.", "We talked to the business: they'll replace what was missing at no cost. You'll see it as a new $0 order."), E("Lo sentimos. Te reponemos tu pedido sin costo: ya lo están preparando.", "We're sorry. We're replacing your order at no cost: they're already preparing it.")], hacer: (m) => reponerSop(k.id, m) }) }] : []),
        ...("puedeDinero" in k && k.puedeDinero && h.pago > 0 ? [{ l: E("Resolver y devolver", "Resolve and refund"), v: "secondary", icon: "card", onClick: () => { const clave = uuid(); setConf({ titulo: E(`Resolver y devolver · pedido #${h.num}`, `Resolve and refund · order #${h.num}`), cta: E("Resolver y devolver", "Resolve and refund"), peligro: true,
          sub: E(`Hasta $${(h.pago / 100).toFixed(2)} (lo cobrado en la app). Vuelve a su tarjeta en 3 a 5 días hábiles; la comisión baja en proporción.`, `Up to $${(h.pago / 100).toFixed(2)} (what was charged in the app). It goes back to their card in 3 to 5 business days; the commission goes down proportionally.`),
          valor: { k: E("MONTO EN DÓLARES", "AMOUNT IN DOLLARS"), ini: (h.pago / 100).toFixed(2), max: 8 }, plantillas: [E("Revisamos tu pedido: tienes razón. Te devolvemos lo de esos platos a tu tarjeta.", "We reviewed your order: you're right. We're refunding those items to your card."), ...plantP], hacer: (m, _e, v) => decidirSop(k.id, m, v, clave, cp?.id ?? null) }); } }] : []),
        { l: E("Ver el cliente", "View the customer"), icon: "users", onClick: () => router.push(`/admin/usuarios/${h.uid}`) },
      ];
    }
    if (k.queue === "rep" && "resena" in k) {
      // Reportes de contenido · reseña (adm-data · rep): la cita, quién reportó, cuántos y hace cuánto; sigue visible mientras se decide.
      const r = k.resena, reps = k.reportesR ?? [], hace = (iso: string) => { const h = (ahora - new Date(iso).getTime()) / 3_600_000; return h < 1 ? E("menos de 1 h", "under 1 h") : h < 24 ? `${Math.floor(h)} h` : `${Math.floor(h / 24)} d`; };
      if (r) cuerpoB.push({ type: "note", tone: "ink", icon: "quote", t: `${E("RESEÑA", "REVIEW")} · ${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)} · ${r.autor} · «${r.body}»${r.reply ? E(` — Respuesta del negocio: «${r.reply}»`, ` — Business reply: “${r.reply}”`) : ""}` });
      const r0 = reps[0];
      cuerpoB.push({ type: "kv", cols: 3, items: [
        { k: E("REPORTADO POR", "REPORTED BY"), v: r0 ? (r0.by_business ? E("El negocio", "The business") : r0.quien ?? E("Un vecino", "A neighbor")) : "—" },
        { k: E("REPORTES", "REPORTS"), v: String(reps.length) },
        { k: E("HACE", "AGO"), v: r0 ? hace(r0.at) : "—" },
      ] });
      reps.forEach((x) => cuerpoB.push({ type: "note", tone: x.by_business ? "info" : "warn", t: `${x.by_business ? E("El negocio pidió revisarla", "The business asked for a review") : (en ? MOTIVO_RESENA_EN : MOTIVO_RESENA)[x.reason] ?? E("Otro motivo", "Other reason")}${x.note ? ` · «${x.note}»` : ""}` }));
      cuerpoB.push({ type: "note", tone: "info", icon: "shield", t: E("Sigue visible mientras decides (regla de 48 h). Ocultar avisa al autor con el motivo.", "It stays visible while you decide (48 h rule). Hiding notifies the author with the reason.") });
      const oculta = r?.status !== "visible";
      acts = [
        { l: E("Mantener", "Keep"), v: "action", icon: "check", onClick: () => setConf({ titulo: E("¿Por qué se queda?", "Why does it stay?"), plantillas: P.keep, hacer: (m) => decidirRep(k.id, "mantener", m) }) },
        { l: E("Ocultar", "Hide"), v: "danger", icon: "close", off: oculta, onClick: () => setConf({ titulo: E("¿Por qué se oculta?", "Why is it hidden?"), plantillas: P.hide, peligro: true, hacer: (m) => decidirRep(k.id, "ocultar", m) }) },
        { l: E("Ocultar y sancionar", "Hide and sanction"), v: "danger", icon: "warning", off: oculta, onClick: () => setConf({ titulo: E("¿Por qué se oculta?", "Why is it hidden?"), sub: E("Además, una sanción al autor.", "Plus, a sanction for the author."), plantillas: P.hide, peligro: true,
          elegir: { label: E("SANCIÓN", "SANCTION"), items: [{ k: "adv", l: E("Advertencia", "Warning") }, { k: "mute7", l: E("Silencio 7 días", "Mute 7 days") }, { k: "nopub", l: E("Bloquear publicación 30 días", "Block posting 30 days") }, { k: "susp14", l: E("Suspender 14 días", "Suspend 14 days") }] }, hacer: (m, e) => decidirRep(k.id, "ocultar", m, e) }) },
      ];
    }
    if (k.queue === "plantones" && "plantones" in k && k.plantones) {
      // 4ie · Las visitas marcadas «No vino» en 30 días. Pausar quita las visitas de su página (modules_off.svc) hasta que se reanude.
      const p = k.plantones;
      cuerpoB.push({ type: "kv", cols: 3, items: [{ k: E("«NO VINO» EN 30 DÍAS", "“NO-SHOW” IN 30 DAYS"), v: String(p.L.length), fg: "var(--tl-pro-ink)" }, { k: E("VISITAS QUE PASARON", "PAST VISITS"), v: String(p.tot) }, { k: E("VISITAS", "VISITS"), v: p.pausado ? E("En pausa", "Paused") : E("Activas", "Active") }] });
      cuerpoB.push({ type: "rows", k: E("CADA UNA", "EACH ONE"), items: p.L.map((x) => ({ icon: "clock", t: `${x.num} · ${x.item ?? ""}`, s: `${((en ? { visita: "Visit", prueba: "Test drive", cita: "Appointment", precal: "Pre-qualification", oferta: "Offer" } : { visita: "Visita", prueba: "Prueba de manejo", cita: "Cita", precal: "Precalificación", oferta: "Oferta" }) as Record<string, string>)[x.que] ?? x.que} · ${E(`para el ${x.dia}`, `for ${x.dia}`)} · ${x.quien} · ${E("marcada", "marked")} ${new Date(x.marcada).toLocaleString(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` })) });
      if (k.puedeDecidir) acts = [
        ...(p.pausado ? [] : [{ l: E("Pausar visitas", "Pause visits"), v: "danger", icon: "warning", onClick: () => setConf({ titulo: E("¿Por qué se pausan las visitas?", "Why are visits paused?"), sub: E("Sus visitas y pruebas de manejo salen de su página hasta que las reanudes desde Negocios 360°. El dueño ve el motivo en su panel. Lo ya confirmado sigue en pie.", "Their visits and test drives leave their page until you resume them from Business 360°. The owner sees the reason in their dashboard. Anything already confirmed still stands."), cta: E("Pausar", "Pause"), peligro: true,
          plantillas: [E("Marca «No vino» para que no lo califiquen.", "Marks “No-show” to avoid being rated."), E("Los clientes dicen que sí fueron.", "Customers say they did go.")], hacer: (m) => decidirNoche(k.id, true, m) }) }]),
        { l: E("Revisado, sin cambios", "Reviewed, no changes"), v: "secondary", icon: "check", onClick: () => setConf({ titulo: E("¿Qué encontraste?", "What did you find?"), sub: E("El caso se cierra; si marca 3 «No vino» más en 30 días, se abre otro.", "The case closes; if they mark 3 more “No-show” in 30 days, a new one opens."), cta: E("Cerrar el caso", "Close the case"),
          plantillas: [E("De verdad no fueron: tiene sus mensajes.", "They really didn't come: they have the messages."), E("Hablamos con el negocio y lo corrigió.", "We talked to the business and they fixed it.")], hacer: (m) => decidirNoche(k.id, false, m) }) },
      ];
    }
    if (k.queue === "vivienda" && "vivienda" in k && k.vivienda) {
      // 4ig · Vivienda justa: la propiedad que se declara para mayores de 62, o los textos que no se guardaron por una frase de la lista.
      const v = k.vivienda, usd = (c: number) => `$${(c / 100).toLocaleString("en-US")}`;
      const fecha = (t: string) => new Date(t).toLocaleString(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
      if (v.tipo === "mayores" && v.propiedad) {
        const p = v.propiedad, EST: Record<string, string> = en ? { available: "Available", pending: "On hold", rented: "Rented", sold: "Sold", hidden: "Hidden" } : { available: "Disponible", pending: "Apartada", rented: "Rentada", sold: "Vendida", hidden: "Oculta" };
        cuerpoB.push({ type: "kv", cols: 2, items: [{ k: E("PROPIEDAD", "PROPERTY"), v: p.name }, { k: E("TIPO", "TYPE"), v: E("Vivienda para mayores de 62", "Housing for people 62+") }, { k: E("RENTA AL MES", "MONTHLY RENT"), v: p.rent != null ? usd(p.rent) : "—" },
          { k: E("ESTADO", "STATUS"), v: p.oculta ? E("Oculta", "Hidden") : EST[p.st] ?? p.st }, { k: E("ZONA", "AREA"), v: p.zip ? E(`Código postal ${p.zip}`, `ZIP code ${p.zip}`) : "—" }, { k: E("DECLARACIÓN", "DECLARATION"), v: p.senior === "review" ? E("Por revisar", "To review") : p.senior === "ok" ? E("Confirmada", "Confirmed") : E("No confirmada", "Not confirmed"), fg: "var(--tl-pro-ink)" }] });
        cuerpoB.push({ type: "note", tone: "info", t: E("La ley de vivienda justa deja preferir a mayores de 62 solo si la vivienda cumple la excepción para mayores. Revisa la declaración con el dueño y el registro público; si no está en orden, no se confirma y la propiedad queda oculta con el motivo.", "Fair housing law allows preferring people 62+ only if the housing meets the senior exemption. Review the declaration with the owner and the public record; if it isn't in order, it isn't confirmed and the property stays hidden with the reason.") });
        if (k.puedeDecidir) acts = [
          { l: E("Confirmar mayores", "Confirm senior"), v: "action", icon: "check", onClick: () => setConf({ titulo: E(`Confirmar vivienda para mayores · «${p.name}»`, `Confirm senior housing · “${p.name}”`), sub: E("Sale como vivienda para mayores de 62. El dueño recibe el aviso.", "It shows as housing for people 62+. The owner is notified."), cta: E("Confirmar", "Confirm"),
            plantillas: [E("La declaración de vivienda para mayores está en orden.", "The senior housing declaration is in order."), E("Es un edificio de vivienda para mayores registrado.", "It's a registered senior housing building.")], hacer: (m) => decidirVivienda(k.id, "confirmar", m) }) },
          { l: E("No se confirma", "Not confirmed"), v: "danger", icon: "close", onClick: () => setConf({ titulo: E(`No se confirma · «${p.name}»`, `Not confirmed · “${p.name}”`), sub: E("La propiedad queda oculta con el motivo hasta que el dueño la corrija o la cambie de tipo. Recibe el aviso.", "The property stays hidden with the reason until the owner fixes it or changes its type. They're notified."), peligro: true,
            plantillas: [E("No hay declaración de vivienda para mayores.", "There's no senior housing declaration."), E("El edificio no cumple la excepción para mayores.", "The building doesn't meet the senior exemption.")], hacer: (m) => decidirVivienda(k.id, "rechazar", m) }) },
        ];
      } else if (v.tipo === "frases") {
        cuerpoB.push({ type: "kv", cols: 3, items: [{ k: E("FRENADAS EN 30 DÍAS", "BLOCKED IN 30 DAYS"), v: String(v.total), fg: "var(--tl-pro-ink)" }, { k: E("SE PUBLICÓ", "PUBLISHED"), v: E("Nada", "Nothing") }, { k: E("ADVERTENCIAS VIGENTES", "ACTIVE WARNINGS"), v: String(v.advertencias) }] });
        cuerpoB.push({ type: "rows", k: v.total > v.frenadas.length ? E(`LAS ÚLTIMAS ${v.frenadas.length}`, `THE LAST ${v.frenadas.length}`) : E("CADA TEXTO FRENADO", "EACH BLOCKED TEXT"), items: v.frenadas.map((x) => ({ icon: "warning", t: `«${x.frase}»${x.propiedad ? ` · ${x.propiedad}` : ""}`, s: `${x.quien} · ${fecha(x.at)} · ${E("no se guardó", "not saved")}` })) });
        cuerpoB.push({ type: "note", tone: "info", t: E("Nada de esto se publicó: el panel le dijo qué frase quitar. Si es un error de buena fe, ciérralo como revisado; si insiste en preferir o excluir a alguien por quién vive, deja una advertencia.", "None of this was published: the dashboard told them which phrase to remove. If it's a good-faith mistake, close it as reviewed; if they keep trying to prefer or exclude people based on who lives there, leave a warning.") });
        if (k.puedeDecidir) acts = [
          { l: E("Advertir al negocio", "Warn the business"), v: "danger", icon: "warning", onClick: () => setConf({ titulo: E("¿Qué le dices al negocio?", "What do you tell the business?"), sub: E("Queda una advertencia en el negocio y recibe el aviso con tu motivo.", "A warning stays on the business and they get the notice with your reason."), cta: E("Advertir", "Warn"), peligro: true,
            plantillas: [E("Intentó varias veces preferir o excluir a personas por quién vive.", "Tried several times to prefer or exclude people based on who lives there."), E("Los anuncios no pueden decir a quién se renta por familia, origen o religión.", "Listings can't say who they rent to based on family, origin or religion.")], hacer: (m) => decidirVivienda(k.id, "advertir", m) }) },
          { l: E("Revisado, sin acción", "Reviewed, no action"), v: "secondary", icon: "check", onClick: () => setConf({ titulo: E("¿Qué encontraste?", "What did you find?"), sub: E("El caso se cierra; una frenada nueva abre otro.", "The case closes; a new blocked text opens another."), cta: E("Cerrar el caso", "Close the case"),
            plantillas: [E("Error de buena fe: lo corrigió y guardó sin la frase.", "Good-faith mistake: they fixed it and saved without the phrase."), E("La frase no buscaba excluir a nadie.", "The phrase wasn't meant to exclude anyone.")], hacer: (m) => decidirVivienda(k.id, "revisado", m) }) },
        ];
      }
    }
    if (k.queue === "grupo" && "grupos" in k && k.grupos) {
      // 4eg · Los grupos cancelados en 90 días (cada uno con su motivo y a cuántos se les devolvió todo). Pausar quita las inscripciones
      // de su página (modules_off.svc) hasta que se reanude desde Negocios 360°.
      const g = k.grupos;
      cuerpoB.push({ type: "kv", cols: 3, items: [{ k: E("EN 90 DÍAS", "IN 90 DAYS"), v: String(g.L.length), fg: "var(--tl-pro-ink)" }, { k: E("PERSONAS CON DEVOLUCIÓN", "PEOPLE REFUNDED"), v: String(g.L.reduce((a, x) => a + x.n, 0)) }, { k: E("INSCRIPCIONES", "ENROLLMENTS"), v: g.pausado ? E("En pausa", "Paused") : E("Activas", "Active") }] });
      cuerpoB.push({ type: "rows", k: E("CADA GRUPO", "EACH GROUP"), items: g.L.map((x) => ({ icon: "users", t: `${x.svc} · ${x.label}`, s: `${E(`Empezaba el ${x.inicio} · ${x.n} inscrito${x.n === 1 ? "" : "s"} con devolución completa`, `Was starting ${x.inicio} · ${x.n} enrolled with a full refund`)}${x.motivo ? ` · «${x.motivo}»` : ""}` })) });
      if (k.puedeDecidir) acts = [
        ...(g.pausado ? [] : [{ l: E("Pausar inscripciones", "Pause enrollments"), v: "danger", icon: "warning", onClick: () => setConf({ titulo: E("¿Por qué se pausan las inscripciones?", "Why are enrollments paused?"), sub: E("Sus servicios salen de su página hasta que los reanudes desde Negocios 360°. El dueño ve el motivo en su panel. Lo ya confirmado sigue en pie.", "Their services leave their page until you resume them from Business 360°. The owner sees the reason in their dashboard. Anything already confirmed still stands."), cta: E("Pausar", "Pause"), peligro: true,
          plantillas: [E("Cancela grupos seguidos: la gente se queda sin curso.", "Keeps cancelling groups: people are left without a course."), E("Anuncia cursos que no da.", "Announces courses they don't run.")], hacer: (m) => decidirNoche(k.id, true, m) }) }]),
        { l: E("Revisado, sin cambios", "Reviewed, no changes"), v: "secondary", icon: "check", onClick: () => setConf({ titulo: E("¿Qué encontraste?", "What did you find?"), sub: E("El caso se cierra; si cancela 3 grupos más en 90 días, se abre otro.", "The case closes; if they cancel 3 more groups in 90 days, a new one opens."), cta: E("Cerrar el caso", "Close the case"),
          plantillas: [E("Cada grupo tiene una razón razonable (pocos alumnos, maestro enfermo).", "Each group has a reasonable cause (few students, sick teacher)."), E("Hablamos con el lugar y lo corrigió.", "We talked to the place and they fixed it."), E("A todos se les devolvió completo.", "Everyone got a full refund.")], hacer: (m) => decidirNoche(k.id, false, m) }) },
      ];
    }
    if ((k.queue === "mesa" || k.queue === "noid") && "noche" in k && k.noche) {
      // 4ne · Noche: cada noche de los últimos 30 días que cuenta para esta cola, con lo que pasó y el depósito. Pausar quita
      // mesas y lista de la página del local (modules_off.rsv) hasta que se reanude desde Negocios 360°.
      const nc = k.noche, usd = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
      const QUE = (x: (typeof nc.L)[number]) => x.det === "noid" ? E("No entró: sin identificación", "Not admitted: no ID") : x.ayuda === "mesa" ? E("Ayuda: no respetaron la mesa", "Help: table not honored") : x.ayuda === "lista" ? E("Ayuda: no respetaron la lista", "Help: list not honored") : E("Canceló el local una mesa confirmada", "The venue cancelled a confirmed table");
      cuerpoB.push({ type: "kv", cols: 3, items: [{ k: E("EN 30 NOCHES", "IN 30 NIGHTS"), v: String(nc.L.length), fg: "var(--tl-pro-ink)" }, { k: E("DEPÓSITOS QUE SE QUEDARON", "DEPOSITS KEPT"), v: usd(nc.L.filter((x) => x.pago === "captured" || x.pago === "partially_refunded").filter((x) => x.st === "done").reduce((a, x) => a + x.dep - x.devuelto, 0)) }, { k: E("MESAS Y LISTA", "TABLES AND LIST"), v: nc.pausado ? E("En pausa", "Paused") : E("Activas", "Active") }] });
      cuerpoB.push({ type: "rows", k: E("CADA NOCHE", "EACH NIGHT"), items: nc.L.map((x) => ({ icon: "drink", t: `${x.num} · ${x.noche} · ${x.k === "lista" ? E("lista", "list") : E("mesa", "table")} ${E("para", "for")} ${x.pax}`, s: `${x.quien} · ${QUE(x)}${x.motivo ? ` · «${x.motivo}»` : ""}${x.dep ? ` · ${E("depósito", "deposit")} ${usd(x.dep)}${x.devuelto ? E(` (devuelto ${usd(x.devuelto)})`, ` (refunded ${usd(x.devuelto)})`) : x.pago === "captured" && x.st === "done" ? E(" se quedó", " kept") : ""}` : E(" · sin depósito", " · no deposit")}` })) });
      if (k.puedeDecidir) acts = [
        ...(nc.pausado ? [] : [{ l: E("Pausar mesas y lista", "Pause tables and list"), v: "danger", icon: "warning", onClick: () => setConf({ titulo: E("¿Por qué se pausan mesas y lista?", "Why are tables and list paused?"), sub: E("Salen de su página hasta que las reanudes desde Negocios 360°. El dueño ve el motivo en su panel. Lo ya confirmado sigue en pie.", "They leave their page until you resume them from Business 360°. The owner sees the reason in their dashboard. Anything already confirmed still stands."), cta: E("Pausar", "Pause"), peligro: true,
          plantillas: k.queue === "mesa" ? [E("Canceló mesas confirmadas varias noches.", "Cancelled confirmed tables on several nights."), E("Los clientes dicen que no respetan la mesa ni la lista.", "Customers say they don't honor the table or the list.")] : [E("Marca «sin identificación» para quedarse depósitos.", "Marks “no ID” to keep deposits."), E("No responde a nuestras preguntas sobre la puerta.", "Doesn't answer our questions about the door.")], hacer: (m) => decidirNoche(k.id, true, m) }) }]),
        { l: E("Revisado, sin cambios", "Reviewed, no changes"), v: "secondary", icon: "check", onClick: () => setConf({ titulo: E("¿Qué encontraste?", "What did you find?"), sub: E("El caso se cierra; si vuelve a pasar 3 veces en 30 noches, se abre otro.", "The case closes; if it happens 3 more times in 30 nights, a new one opens."), cta: E("Cerrar el caso", "Close the case"),
          plantillas: [E("Cada caso tiene una explicación razonable.", "Each case has a reasonable explanation."), E("Hablamos con el local y lo corrigió.", "We talked to the venue and they fixed it."), E("Los depósitos ya se devolvieron.", "The deposits were already refunded.")], hacer: (m) => decidirNoche(k.id, false, m) }) },
      ];
    }
    if (k.queue === "renta" && "renta" in k) {
      // Daño de una renta (4f-2): la foto y el monto que mandó el negocio, el depósito retenido y el cliente que no está de
      // acuerdo. Descontar (sale del depósito; lo demás se libera) o no descontar (se libera todo, menos los días tarde).
      const r = k.renta, usd = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
      if (r) {
        cuerpoB.push({ type: "kv", cols: 3, items: [
          { k: E("RENTA", "RENTAL"), v: `#${r.numero} · ${en ? (r.n as { es: string; en?: string }).en || r.n.es : r.n.es}` }, { k: E("CLIENTE", "CUSTOMER"), v: r.cliente }, { k: E("DAÑO", "DAMAGE"), v: usd(r.cents), fg: "var(--tl-pro-ink)" },
          { k: E("DEPÓSITO", "DEPOSIT"), v: E(`${usd(r.dep)} retenido`, `${usd(r.dep)} held`) }, { k: E("DÍAS TARDE", "LATE DAYS"), v: r.late ? usd(r.late) : E("No", "No") }, { k: E("ESTADO", "STATUS"), v: r.st === "disputed" ? E("Sin acuerdo", "No agreement") : r.st === "asked" ? E("Espera al cliente", "Waiting on customer") : r.st ?? "—" },
        ] });
        if (r.foto) cuerpoB.push({ type: "photos", k: E("FOTO DEL DAÑO (LA MANDÓ EL NEGOCIO)", "DAMAGE PHOTO (SENT BY THE BUSINESS)"), cols: 3, items: [{ key: r.foto, bg: `url("${r.foto}")`, onClick: () => window.open(r.foto!, "_blank", "noopener") }] });
        if (r.nota) cuerpoB.push({ type: "note", tone: "ink", icon: "bubble", t: `«${r.nota}»` });
        if (!k.puedeDinero) cuerpoB.push({ type: "note", tone: "warn", icon: "lock", t: E("Tu rol no decide sobre dinero.", "Your role doesn't decide on money.") });
        if (k.puedeDinero && (r.st === "disputed" || r.st === "asked")) acts = [
          { l: E(`Descontar ${usd(r.cents)}`, `Deduct ${usd(r.cents)}`), v: "action", icon: "dollar", onClick: () => setConf({ titulo: E("¿Por qué se descuenta?", "Why is it deducted?"), sub: E(`Sale del depósito; lo demás vuelve a su tarjeta. Los dos ven tu decisión.`, `It comes out of the deposit; the rest goes back to their card. Both see your decision.`), cta: E("Descontar", "Deduct"), plantillas: [E("La foto muestra el daño y coincide con la herramienta.", "The photo shows the damage and matches the tool."), E("El cliente aceptó por teléfono.", "The customer agreed by phone."), E("El daño está documentado por el negocio.", "The damage is documented by the business.")], hacer: (m) => decidirRenta(k.id, true, m) }) },
          { l: E("No descontar", "Don't deduct"), v: "secondary", icon: "close", onClick: () => setConf({ titulo: E("¿Por qué no se descuenta?", "Why isn't it deducted?"), sub: E("Se libera el depósito (menos los días tarde, si los hubo). Los dos ven tu decisión.", "The deposit is released (minus late days, if any). Both see your decision."), cta: E("No descontar", "Don't deduct"), plantillas: [E("La foto no muestra un daño claro.", "The photo doesn't show clear damage."), E("El daño parece desgaste normal.", "The damage looks like normal wear."), E("El negocio no respondió a nuestras preguntas.", "The business didn't answer our questions.")], hacer: (m) => decidirRenta(k.id, false, m) }) },
        ];
      }
    }
    if (k.queue === "disputa" && "disputa" in k) {
      // Disputas con el banco (diseño «disputa»): referencia, monto, negocio, cliente, plazo del banco y motivo; la evidencia
      // que ya tenemos; Responder con evidencia / Aceptar devolución.
      const dp = k.disputa, ev = k.evidencia, dias = dp?.due ? Math.ceil((new Date(dp.due).getTime() - Date.now()) / 86_400_000) : null;
      if (dp) {
        cuerpoB.push({ type: "kv", cols: 3, items: [
          { k: E("REFERENCIA", "REFERENCE"), v: dp.num ? E(`Pedido #${dp.num}`, `Order #${dp.num}`) : dp.sid }, { k: E("MONTO", "AMOUNT"), v: `$${(dp.amount / 100).toFixed(2)}` }, { k: E("CLIENTE", "CUSTOMER"), v: dp.cliente ?? "—" },
          { k: E("PLAZO DEL BANCO", "BANK DEADLINE"), v: dp.due ? `${new Date(dp.due).toLocaleDateString(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric" })} · ${dias! > 0 ? E(`${dias} días`, `${dias} days`) : E("vence hoy", "due today")}` : "—", fg: dias != null && dias <= 3 ? "var(--tl-danger)" : "var(--tl-pro-ink)" },
          { k: E("MOTIVO", "REASON"), v: dp.motivo }, { k: E("ESTADO", "STATUS"), v: ((en ? { needs_response: "Needs response", under_review: "Bank reviewing", won: "Won", lost: "Lost", accepted: "Accepted" } : { needs_response: "Falta responder", under_review: "El banco revisa", won: "Ganada", lost: "Perdida", accepted: "Aceptada" }) as Record<string, string>)[dp.status] ?? dp.status },
        ] });
        if (dp.sim) cuerpoB.push({ type: "note", tone: "info", icon: "info", t: E("Sandbox: disputa simulada. No hay banco; el resultado se simula desde Transacciones.", "Sandbox: simulated dispute. There's no bank; the outcome is simulated from Transactions.") });
        if (ev) cuerpoB.push({ type: "timeline", k: E("EVIDENCIA QUE TENEMOS", "EVIDENCE WE HAVE"), items: ev.lineas.map((t) => ({ t })) });
        else cuerpoB.push({ type: "note", tone: "warn", icon: "warning", t: E("No encontramos el pedido de este cobro: responde con lo que sepas o acepta.", "We couldn't find the order for this charge: respond with what you know or accept.") });
        // 9k · Los archivos para el banco: se arman al responder (recibo en PDF, conversación sin teléfonos, constancia de entrega) y se suben por la API de
        // archivos de Stripe en el mismo envío.
        const AR = "archivos" in k ? (k.archivos as { kind: string; bytes: number; enviado: boolean }[]) : [];
        cuerpoB.push({ type: "rows", k: E("ARCHIVOS PARA EL BANCO", "FILES FOR THE BANK"), items: (["recibo", "conversacion", "entrega"] as const).map((x) => { const f = AR.find((a) => a.kind === x);
          return { key: x, icon: x === "recibo" ? "folder" : x === "conversacion" ? "chat" : "truck", t: (en ? { recibo: "PDF receipt", conversacion: "Conversation with the customer (PDF, no phone numbers)", entrega: "Proof of delivery and timeline (PDF)" } : { recibo: "Recibo en PDF", conversacion: "Conversación con el cliente (PDF, sin teléfonos)", entrega: "Constancia de entrega y línea de tiempo (PDF)" })[x],
            s: f ? `${Math.max(1, Math.round(f.bytes / 1024))} KB · ${f.enviado ? E("enviado al banco", "sent to the bank") : E("listo, sin enviar", "ready, not sent")}` : E("se arma al responder", "built when you respond"), tag: f?.enviado ? E("ENVIADO", "SENT") : null, tone: "signal", chev: false, compact: true }; }) });
        if (!k.puedeDinero) cuerpoB.push({ type: "note", tone: "warn", icon: "lock", t: E("Tu rol no decide sobre dinero.", "Your role doesn't decide on money.") });
        if (dp.status === "needs_response" && k.puedeDinero) acts = [
          { l: E("Responder con evidencia", "Respond with evidence"), v: "action", icon: "right", onClick: () => setConf({ titulo: E("Resumen para el banco", "Summary for the bank"), sub: E("Se envía junto con la evidencia de arriba. Escribe en inglés si puedes: lo lee el banco.", "It's sent with the evidence above. Write in English if you can: the bank reads it."), cta: E("Enviar al banco", "Send to the bank"),
            plantillas: ["The customer placed this order from their verified account and it was delivered as shown in the timeline.", "The customer picked up the order in person; the business confirmed the pickup at the time shown.", "We already refunded part of this order as shown; the rest was delivered as ordered."],
            hacer: (x) => decidirDisputa(k.id, "responder", x) }) },
          { l: E("Aceptar devolución", "Accept refund"), v: "danger", icon: "dollar", onClick: () => setConf({ titulo: E("¿Por qué se acepta?", "Why is it accepted?"), sub: E("El dinero vuelve al cliente y la disputa se cierra. No se puede deshacer.", "The money goes back to the customer and the dispute closes. It can't be undone."), peligro: true, cta: E("Aceptar devolución", "Accept refund"),
            plantillas: [E("El negocio confirmó que el pedido no se entregó.", "The business confirmed the order wasn't delivered."), E("No tenemos evidencia suficiente.", "We don't have enough evidence."), E("Cobro duplicado confirmado.", "Duplicate charge confirmed.")], hacer: (x) => decidirDisputa(k.id, "aceptar", x) }) },
        ];
      }
    }
    if (k.queue === "chat" && "dm" in k) {
      // 5c · Mensajes entre vecinos: se leen solo con el caso y un reporte abiertos (lib/admin-dm.ts). Ocultar avisa a quien lo escribió.
      const d = k.dm, MD: Record<string, string> = en ? { acoso: "Harassment or threats", spam: "Spam or sales", priv: "Asks for or shares private data", otro: "Something else" } : { acoso: "Acoso o amenazas", spam: "Spam o ventas", priv: "Pide o comparte datos privados", otro: "Otra cosa" };
      const hace = (iso: string) => { const h = (ahora - new Date(iso).getTime()) / 3_600_000; return h < 1 ? E("menos de 1 h", "under 1 h") : h < 24 ? `${Math.floor(h)} h` : `${Math.floor(h / 24)} d`; };
      if (!d) cuerpoB.push({ type: "note", tone: "info", icon: "lock", t: E("Este caso ya no tiene un reporte abierto: la conversación no se puede leer.", "This case no longer has an open report: the conversation can't be read.") });
      else {
        cuerpoB.push({ type: "kv", cols: 3, items: [{ k: E("VECINOS", "NEIGHBORS"), v: `${d.a.nombre} · ${d.b.nombre}` }, { k: E("REPORTES", "REPORTS"), v: `${d.reportes.length}${d.reportes[0] ? E(` · hace ${hace(d.reportes[0].at)}`, ` · ${hace(d.reportes[0].at)} ago`) : ""}` }, { k: E("ESTADO", "STATUS"), v: d.cerrada ? E("Cerrada por un bloqueo", "Closed by a block") : E("Abierta", "Open") }] });
        d.reportes.forEach((x) => cuerpoB.push({ type: "note", tone: "warn", t: `${E(`Lo reportó ${x.quien ?? "un vecino"}`, `Reported by ${x.quien ?? "a neighbor"}`)} · ${MD[x.reason] ?? E("Otra cosa", "Something else")}${x.note ? ` · «${x.note}»` : ""}` }));
        cuerpoB.push({ type: "note", tone: "info", icon: "lock", t: E("Ves esta conversación porque hay un reporte abierto. Al cerrar el caso deja de verse aquí.", "You can see this conversation because there's an open report. When the case closes, it's no longer visible here.") });
        cuerpoB.push({ type: "group", k: E(`CONVERSACIÓN · ${d.msjs.length} MENSAJES`, `CONVERSATION · ${d.msjs.length} MESSAGES`) });
        extra = <A.AdminList rows={d.msjs.map((m) => ({
          icon: "users", title: m.oculto ? `${m.t}` : m.t, sub: `${m.quien} · ${E(`hace ${hace(m.at)}`, `${hace(m.at)} ago`)}`, tag: m.oculto ? E("OCULTO", "HIDDEN") : undefined, tone: m.oculto ? "danger" : undefined,
          actions: k.puedeDecidir && !m.oculto ? [{ label: E("Ocultar", "Hide"), variant: "secondary", onClick: () => setConf({ titulo: E("¿Por qué se oculta este mensaje?", "Why is this message hidden?"), sub: E("Quien lo escribió ve el motivo. La conversación sigue.", "Its author sees the reason. The conversation continues."), plantillas: P.hide, peligro: true, hacer: (x) => chatOcultarMensaje(k.id, m.id, x) }) }] : undefined,
        }))} />;
      }
      acts = [
        { l: E("Todo bien", "All good"), v: "action", icon: "check", onClick: () => setConf({ titulo: E("¿Por qué está bien?", "Why is it fine?"), plantillas: P.keep, hacer: (x) => decidirChat(k.id, "mantener", x) }) },
        { l: E("Resuelto", "Resolved"), v: "ghost", icon: "shield", onClick: () => setConf({ titulo: E("¿Qué se hizo?", "What was done?"), plantillas: [E("Se ocultaron los mensajes que no cumplían las reglas.", "Messages that broke the rules were hidden."), E("Se sancionó a la cuenta desde Usuarios.", "The account was sanctioned from Users."), E("La persona ya bloqueó a quien le escribía.", "The person already blocked whoever was writing to them.")], hacer: (x) => decidirChat(k.id, "resuelto", x) }) },
        ...(d ? [{ l: E(`Ver a ${d.a.nombre.split(" ")[0]}`, `View ${d.a.nombre.split(" ")[0]}`), v: "ghost", icon: "users", onClick: () => router.push(`/admin/usuarios/${d.a.id}?tab=comunidad`) }, { l: E(`Ver a ${d.b.nombre.split(" ")[0]}`, `View ${d.b.nombre.split(" ")[0]}`), v: "ghost", icon: "users", onClick: () => router.push(`/admin/usuarios/${d.b.id}?tab=comunidad`) }] : []),
      ];
    }
    if (k.queue === "chat" && "chat" in k) {
      // Mensajes reportados (2p): el hilo se lee solo con el caso abierto. Ocultar un mensaje avisa a quien lo escribió.
      const t = k.chat, reps = k.reportesC ?? [], MC: Record<string, string> = en ? { spam: "Spam or advertising", off: "Offensive or threatening", pii: "Asks for data or money", otro: "Something else", compa: "An El Compa reply" } : { spam: "Spam o publicidad", off: "Ofensivo o amenaza", pii: "Pide datos o dinero", otro: "Otra cosa", compa: "Una respuesta de El Compa" };
      // 7f · Si El Compa contestó aquí (respuestas automáticas Pro del negocio): sus mensajes van marcados y se puede apagar en esta conversación
      // (o en todo el negocio, desde Negocios 360° › El Compa).
      const conCompa = !!t?.msjs.some((m) => m.compa);
      const hace = (iso: string) => { const h = (ahora - new Date(iso).getTime()) / 3_600_000; return h < 1 ? E("menos de 1 h", "under 1 h") : h < 24 ? `${Math.floor(h)} h` : `${Math.floor(h / 24)} d`; };
      cuerpoB.push({ type: "kv", cols: 3, items: [
        { k: E("VECINO", "NEIGHBOR"), v: t?.vecino ?? "—" }, { k: E("CONTEXTO", "CONTEXT"), v: (en ? t?.ctx?.en : t?.ctx?.es) ?? E("Consulta general", "General inquiry") }, { k: E("REPORTES", "REPORTS"), v: `${reps.length}${reps[0] ? E(` · hace ${hace(reps[0].at)}`, ` · ${hace(reps[0].at)} ago`) : ""}` },
      ] });
      reps.forEach((x) => cuerpoB.push({ type: "note", tone: x.by_business ? "info" : "warn", t: `${x.by_business ? E("Lo reportó el negocio", "Reported by the business") : E(`Lo reportó ${x.quien ?? "el vecino"}`, `Reported by ${x.quien ?? "the neighbor"}`)} · ${MC[x.reason] ?? E("Otra cosa", "Something else")}${x.note ? ` · «${x.note}»` : ""}` }));
      cuerpoB.push({ type: "note", tone: "info", icon: "lock", t: E("Ves esta conversación porque hay un reporte abierto. Al cerrar el caso deja de verse aquí.", "You can see this conversation because there's an open report. When the case closes, it's no longer visible here.") });
      if (t?.bloqueado) cuerpoB.push({ type: "note", tone: "ink", icon: "ban", t: E("El negocio ya bloqueó a este vecino.", "The business already blocked this neighbor.") });
      if (conCompa) cuerpoB.push({ type: "note", tone: t?.compa_off ? "ink" : "info", icon: "help", t: t?.compa_off ? E(`El Compa está apagado en esta conversación: ${t.compa_off}.`, `El Compa is off in this conversation: ${t.compa_off}.`) : E("En esta conversación contestó El Compa (respuestas automáticas del negocio, marcadas abajo como «El Compa · IA»). Si una respuesta no está bien, apágalo aquí o en todo el negocio.", "El Compa replied in this conversation (the business's automatic replies, marked below as “El Compa · AI”). If a reply isn't right, turn it off here or for the whole business.") });
      cuerpoB.push({ type: "group", k: E(`CONVERSACIÓN · ${t?.msjs.length ?? 0} MENSAJES`, `CONVERSATION · ${t?.msjs.length ?? 0} MESSAGES`) });
      extra = t ? <A.AdminList rows={t.msjs.map((m) => ({
        icon: m.de === "user" ? "users" : m.de === "business" ? "store" : "info", title: m.de === "system" ? m.t.split(" · ")[0] : m.t,
        sub: `${m.de === "user" ? t.vecino : m.de === "business" ? `${n?.name ?? E("Negocio", "Business")}${m.quien ? ` · ${m.quien}` : ""}` : m.de === "auto" ? (m.compa ? E("El Compa · IA (respuesta automática del negocio)", "El Compa · AI (business's automatic reply)") : E("Respuesta automática", "Automatic reply")) : E("Aviso del sistema", "System notice")} · ${E(`hace ${hace(m.at)}`, `${hace(m.at)} ago`)}`,
        tag: m.oculto ? E("OCULTO", "HIDDEN") : m.compa ? "EL COMPA" : undefined, tone: m.oculto ? "danger" : m.compa ? "action" : undefined,
        actions: k.puedeDecidir && !m.oculto && (m.de === "user" || m.de === "business") ? [{ label: E("Ocultar", "Hide"), variant: "secondary", onClick: () => setConf({ titulo: E("¿Por qué se oculta este mensaje?", "Why is this message hidden?"), sub: E("Quien lo escribió ve el motivo. La conversación sigue.", "Its author sees the reason. The conversation continues."), plantillas: P.hide, peligro: true, hacer: (x) => chatOcultarMensaje(k.id, m.id, x) }) }] : undefined,
      }))} /> : null;
      acts = [
        { l: E("Todo bien", "All good"), v: "action", icon: "check", onClick: () => setConf({ titulo: E("¿Por qué está bien?", "Why is it fine?"), plantillas: P.keep, hacer: (x) => decidirChat(k.id, "mantener", x) }) },
        { l: E("Resuelto", "Resolved"), v: "ghost", icon: "shield", onClick: () => setConf({ titulo: E("¿Qué se hizo?", "What was done?"), plantillas: [E("Se ocultaron los mensajes que no cumplían las reglas.", "Messages that broke the rules were hidden."), E("Se sancionó a la cuenta desde Usuarios.", "The account was sanctioned from Users."), E("El negocio ya bloqueó a la persona.", "The business already blocked the person.")], hacer: (x) => decidirChat(k.id, "resuelto", x) }) },
        ...(t ? [{ l: E("Ver al vecino", "View the neighbor"), v: "ghost", icon: "users", onClick: () => router.push(`/admin/usuarios/${t.vecino_id}`) }] : []),
        ...(conCompa && !t?.compa_off ? [{ l: E("Apagar El Compa aquí", "Turn off El Compa here"), v: "ghost", icon: "ban", onClick: () => setConf({ titulo: E("¿Por qué se apaga El Compa en esta conversación?", "Why is El Compa turned off in this conversation?"), peligro: true, sub: E("El Compa deja de contestar en esta conversación; el negocio la sigue viendo y contestando como siempre. Queda en el historial.", "El Compa stops replying in this conversation; the business still sees it and replies as usual. It stays in the history."),
          plantillas: [E("Contestó algo que no está en la página del negocio.", "It replied with something that isn't on the business page."), E("Prometió algo que el negocio no ofrece.", "It promised something the business doesn't offer."), E("El vecino pidió hablar solo con el negocio.", "The neighbor asked to talk only with the business.")], hacer: (x) => compaHilo(k.id, false, x) }) }] : []),
        ...(conCompa && n ? [{ l: E("El Compa en el negocio", "El Compa for the business"), v: "ghost", icon: "store", onClick: () => router.push(`/admin/negocios/${n.id}?tab=compa`) }] : []),
      ];
    }
    if (k.queue === "rec" && "rec" in k && k.rec) {
      const r = k.rec;
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: E("CATEGORÍA", "CATEGORY"), v: r.cat ?? "—" }, { k: E("DÓNDE", "WHERE"), v: r.where === "sin_local" ? E("Sin local (en casa / a domicilio)", "No storefront (home-based / mobile)") : r.address ?? "—" }, { k: E("CONTACTO", "CONTACT"), v: r.contact_phone ?? E("No dejó", "Not provided") }, { k: E("CÓMO LO CONOCE", "HOW THEY KNOW IT"), v: ((en ? { cli: "Is a customer", fam: "Belongs to a relative or friend", mio: "It's theirs" } : { cli: "Es cliente", fam: "Es de un familiar o amigo", mio: "Es suyo" }) as Record<string, string>)[r.how_known ?? ""] ?? r.how_known ?? "—" }, { k: E("CIUDAD", "CITY"), v: r.ciudad }, { k: E("RECOMENDÓ", "RECOMMENDED BY"), v: r.quien ?? E("Vecino con sesión", "Signed-in neighbor") }] });
      if (r.note) cuerpoB.push({ type: "note", tone: "ink", icon: "quote", t: E(`POR QUÉ LO RECOMIENDA · «${r.note}»`, `WHY THEY RECOMMEND IT · “${r.note}”`) });
      const par = ("parecidos" in k ? k.parecidos : []).filter(Boolean) as NonNullable<Caso["negocio"]>[];
      if (par.length) {
        cuerpoB.push({ type: "group", k: E("¿YA EXISTE?", "ALREADY LISTED?") });
        extra = <A.AdminList rows={par.map((p) => ({ image: p.cover ?? undefined, initials: p.cover ? undefined : p.name.slice(0, 1), title: p.name, sub: `${p.cat}${p.address ? ` · ${p.address}` : ""}`, chevron: true, onClick: () => router.push(`/admin/negocios/${p.id}`) }))} />;
      }
      acts = [
        { l: E("Crear semilla", "Create seed"), v: "action", icon: "plus", off: !r.cat, onClick: () => run(() => crearSemilla(k.id), () => ir({ caso: null })) },
        { l: E("Ya existe", "Already listed"), icon: "check", off: !par.length, onClick: () => setConf({ titulo: E("¿Cuál negocio es?", "Which business is it?"), sub: E("La recomendación queda enlazada a ese negocio.", "The recommendation is linked to that business."), cta: E("Guardar", "Save"), elegir: { label: E("ES ESTE", "IT'S THIS ONE"), items: par.map((p) => ({ k: p.id, l: p.name })) }, plantillas: [E("Ya estaba en To’Latino", "Already on To’Latino")], hacer: (_m, e) => decidirRec(k.id, "existe", "", e) }) },
        { l: E("Descartar", "Discard"), v: "danger", icon: "close", onClick: () => setConf({ titulo: E("¿Por qué se descarta?", "Why is it discarded?"), peligro: true, hacer: (m) => decidirRec(k.id, "descartar", m) }) },
      ];
    }
    // 9n · Incidencia de entrega (k.queue === "entrega"): qué pasó, la prueba y el repartidor; «Resolver» con motivo (dlv:editar).
    if (esEntrega && "incidencia" in k && k.incidencia) {
      const i = k.incidencia, PR: Record<string, string> = en ? { foto: "photo", codigo: "customer code", negocio: "marked by the business" } : { foto: "foto", codigo: "código del cliente", negocio: "marcado por el negocio" };
      cuerpoB.push({ type: "note", tone: i.kind === "accidente" ? "danger" : "warn", icon: i.kind === "accidente" ? "warning" : "truck", t: en ? i.nota.en || i.nota.es : i.nota.es });
      cuerpoB.push({ type: "rows", items: [
        { icon: "users", t: i.rep, s: E("Repartidor · su 360° con entregas, incidencias y sanciones", "Driver · their 360° with deliveries, incidents and sanctions"), chev: true, onClick: () => router.push(`/admin/repartidores/${i.repId}`) },
        ...(i.numero ? [{ icon: "bag", t: E(`Pedido #${i.numero}`, `Order #${i.numero}`), s: i.prueba ? `${E("Prueba", "Proof")}: ${i.prueba.split(",").map((p) => PR[p] ?? p).join(" · ")}` : E("Sin prueba de entrega todavía", "No proof of delivery yet"), chev: false,
          acts: i.foto ? [{ l: E("Ver foto", "View photo"), v: "secondary", icon: "image", onClick: () => window.open(`/api/entrega/foto/${i.foto}`, "_blank", "noopener") }] : undefined }] : []),
      ] });
      acts = "puedeResolver" in k && k.puedeResolver ? [{ l: E("Resolver", "Resolve"), icon: "check", onClick: () => setConf({ titulo: E("¿Cómo se resolvió?", "How was it resolved?"), cta: E("Resolver", "Resolve"),
        plantillas: [E("Hablamos con el repartidor y el negocio", "We talked to the driver and the business"), E("La prueba de la entrega está bien", "The proof of delivery is fine"), E("Fue un accidente: nadie salió herido", "It was an accident: no one was hurt"), E("Se sancionó en Repartidores", "Sanctioned in Drivers")],
        sub: E("Queda en la auditoría. Para sancionar, abre el 360° del repartidor.", "It stays in the audit log. To sanction, open the driver's 360°."), hacer: (m) => dlvResolver(i.id, m) }) }] : [];
    }
    // 5d · Casos de la Comunidad (rep de publicaciones y comentarios, repUsr, apel y fotos de la Comunidad): ./ColasComunidad.tsx.
    const com = cuerpoComunidad(k, { setConf, run, fuera: () => ir({ caso: null }), abrir: (h) => window.open(h, "_blank", "noopener"), usuario: (id) => router.push(`/admin/usuarios/${id}`), apelarDias, ahora, E });
    if (com) { cuerpoB.push(...com.bloques); acts = com.acts; extra = null; }
    // 6a · Eventos a revisar (k.queue === "evt"): ./ColasEventos.tsx.
    const evt = cuerpoEventos(k, { setConf, abrir: (h) => (h.startsWith("/admin/") ? router.push(h) : window.open(h, "_blank", "noopener")), negocio: (id) => router.push(`/admin/negocios/${id}`), E });
    if (evt) { cuerpoB.push(...evt.bloques); acts = evt.acts; extra = null; }
    const arriba = k.queue === "medios" || ("cambio" in k && !!k.cambio) || ("cambioNeg" in k && !!k.cambioNeg);
    if (conf) return <><PanelBloques bloques={[out[0]!]} h1={22} /><ConfirmarMotivo c={conf} desk={false} onBack={() => setConf(null)} onDone={hecho} /></>;
    // 9n · Asignar este caso a alguien del equipo (quien reparte) y lo que hacen los atajos A/R.
    if (puedeRepartir) acts = [...acts, { l: k.assigned_to ? E("Asignar a otra persona", "Assign to someone else") : E("Asignar a…", "Assign to…"), v: "secondary", icon: "users", onClick: () => asignarA([k.id]) }];
    actsRef.current = k.puedeDecidir ? acts : [];
    return (
      <>
        <PanelBloques bloques={out} h1={22} />
        {notas}
        {extra && arriba ? extra : null}
        {filaNeg}
        <PanelBloques bloques={cuerpoB} />
        {extra && !arriba ? extra : null}
        {k.queue === "sello" ? <A.AdminNote tone="ink" icon="shield">{E("Nunca se piden documentos de identidad para el sello.", "Identity documents are never requested for the seal.")}</A.AdminNote> : null}
        {k.puedeDecidir ? <PanelBloques bloques={[{ type: "acts", items: acts.map((a) => ({ ...a, off: a.off || pend })) }]} /> : null}
      </>
    );
  }

  // 9n · Lote (escritorio): la barra de selección del sistema (SelectionBar) con Tomar, Asignar a… y Soltar.
  const lote: Bloque | null = !desk || !puedeAprobar ? null : sel ? { type: "bulk", t: E(`${sel.length} ${sel.length === 1 ? "elegido" : "elegidos"}`, `${sel.length} selected`), allL: E("Todos", "All"), onAll: () => setSel(casos.filter((x) => x.queue !== "ticket").map((x) => x.id)), onClose: () => setSel(null),
    acts: [{ l: E("Tomar", "Take"), icon: "check", off: !sel.length || pend, onClick: () => run(() => tomarLote(sel), () => setSel(null)) },
      ...(puedeRepartir ? [{ l: E("Asignar a…", "Assign to…"), icon: "users", off: !sel.length || pend, onClick: () => asignarA(sel) }, { l: E("Soltar", "Release"), icon: "close", off: !sel.length || pend, onClick: () => run(() => asignarCaso(sel, null), () => setSel(null)) }] : [])] }
    : { type: "acts", items: [{ l: E("Elegir varios", "Select several"), v: "secondary", icon: "check", onClick: () => { setSel([]); ir({ caso: null }); } }, ...(esAdmin ? [{ l: E("Quién ve cada cola · feriados", "Who sees each queue · holidays"), v: "secondary", icon: "users", onClick: () => ir({ ajustes: "1", caso: null }) }] : [])] };
  const columnaLista = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      <PanelBloques bloques={lista} h1={desk ? 26 : 22} />
      {lote ? <PanelBloques bloques={[lote]} /> : null}
      {desk && !sel ? <A.AdminNote tone="ink" icon="info">{E("Atajos: J siguiente · K anterior · A aprobar · R rechazar.", "Shortcuts: J next · K previous · A approve · R reject.")}</A.AdminNote> : null}
      {regla ? <A.AdminNote tone="ink" icon={regla.icon}>{`${E("Plazo de esta cola", "Deadline for this queue")}: ${(cola && slas[cola]) ?? regla.sla} h${regla.regla ? ` · ${textoCola(regla.regla[en ? 1 : 0], cfgTxt).replace("{horas}", horasTxt(ayudaH, !en))}` : ""}`}</A.AdminNote> : null}
      {casos.length ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{tarjetas}</div>
        : <PanelBloques bloques={[{ type: "empty", icon: "check", t: E("Nada por aquí", "Nothing here"), s: E("Esta cola está al día con los filtros que elegiste.", "This queue is up to date with the filters you chose.") }]} />}
      {/* 9n-3 · De a 50 casos por página (antes se cortaba en 200 sin avisar): el contador y las pestañas cuentan TODOS. */}
      {hay > porPagina ? <A.Pager label={`${(pag - 1) * porPagina + 1}–${Math.min(hay, pag * porPagina)} · ${hay}`} hasPrev={pag > 1} hasNext={pag * porPagina < hay} onPrev={() => ir({ pag: String(pag - 1), caso: null })} onNext={() => ir({ pag: String(pag + 1), caso: null })} /> : null}
    </div>
  );
  if (conf && !caso) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("COLAS", "QUEUES"), t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  // 9n · Colas › Ajustes (solo un Admin): quién ve cada cola, los plazos (en Configuración › Colas) y los feriados del equipo.
  if (ajustes) {
    const AB: Bloque[] = [{ type: "head", eye: E("COLAS · AJUSTES", "QUEUES · SETTINGS"), t: E("Quién ve cada cola", "Who sees each queue"), s: E("Además del rol, la matriz de permisos (Colas) y las ciudades de cada persona deciden. Cada cambio pide el motivo y queda en la auditoría.", "Besides the role, the permissions matrix (Queues) and each person's cities decide. Every change asks for a reason and stays in the audit log."), onBack: () => ir({ ajustes: null }), h1: desk ? 26 : 22 },
      { type: "note", tone: "info", icon: "clock", t: E("El plazo de cada cola y cuánto dura un caso tomado se cambian en Sistema › Configuración › Colas.", "Each queue's deadline and how long a taken case lasts are changed in System › Configuration › Queues."), cta: E("Ir", "Go"), onCta: () => router.push("/admin/sistema/configuracion") }];
    AB.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: ORDEN_COLAS.map((q) => ({ key: q, icon: COLAS[q].icon, t: qn(q), s: E(`Plazo ${slas[q] ?? COLAS[q].sla} h`, `Deadline ${slas[q] ?? COLAS[q].sla} h`), chev: false,
      acts: ajustes.roles.filter((r) => r.key !== "admin").map((r) => { const on = (ajustes.vis[q] ?? []).includes(r.key); return { l: r.nombre, v: on ? "primary" : "secondary", onClick: () => setConf({ titulo: on ? E(`Quitar «${COLAS[q].es}» a ${r.nombre}`, `Remove “${COLAS[q].en}” from ${r.nombre}`) : E(`Dar «${COLAS[q].es}» a ${r.nombre}`, `Give “${COLAS[q].en}” to ${r.nombre}`), cta: E("Guardar", "Save"), sub: on ? E("Ese rol deja de ver esta cola (y sus casos tomados vuelven a la cola cuando venzan).", "That role stops seeing this queue (and its taken cases go back to the queue when they expire).") : E("Ese rol empieza a ver esta cola.", "That role starts seeing this queue."), plantillas: [E("Cambio de responsabilidades", "Change of responsibilities"), E("Lo pidió el fundador", "The founder asked for it")], hacer: (m) => colaVisibilidad(q, r.key, !on, m) }) }; }) })) });
    AB.push({ type: "group", k: E("FERIADOS DEL EQUIPO · EL PLAZO DE SOPORTE NO LOS CUENTA", "TEAM HOLIDAYS · THE SUPPORT DEADLINE DOESN'T COUNT THEM") });
    AB.push({ type: "rows", items: ajustes.feriados.length ? ajustes.feriados.map((f) => ({ key: f.id, icon: "calendar", t: `${f.dia} · ${f.nombre}`, s: f.ciudad ?? E("Todas las ciudades", "All cities"), chev: false,
      acts: [{ l: E("Quitar", "Remove"), v: "secondary", onClick: () => run(() => quitarFeriadoEquipo(f.id)) }] })) : [{ icon: "calendar", t: E("Sin feriados", "No holidays"), s: E("Lunes a viernes cuentan todos (Configuración › Soporte).", "Monday to Friday all count (Configuration › Support)."), chev: false }] });
    AB.push({ type: "acts", items: [{ l: E("Agregar un feriado", "Add a holiday"), v: "secondary", icon: "plus", onClick: () => setConf({ titulo: E("Feriado del equipo", "Team holiday"), cta: E("Guardar", "Save"), sub: E("El motivo es el nombre del feriado. El plazo de Soporte no cuenta ese día.", "The reason is the holiday's name. The Support deadline doesn't count that day."),
      valor: { k: E("FECHA (AAAA-MM-DD)", "DATE (YYYY-MM-DD)"), ini: "", max: 10 }, elegir: { label: E("DÓNDE", "WHERE"), items: [{ k: "todas", l: E("Todas las ciudades", "All cities") }, ...ajustes.ciudades.map((c) => ({ k: c.id, l: c.nombre }))] },
      plantillas: [E("Navidad", "Christmas"), E("Año Nuevo", "New Year's Day"), E("Día de Acción de Gracias", "Thanksgiving"), E("Día de la Independencia", "Independence Day")], hacer: (m, e, v) => feriadoEquipo(v, e === "todas" ? null : e, m) }) }] });
    return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={AB} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
  }
  return (
    <>
      {caso && !lado ? (
        desk ? (
          <>{columnaLista}
            <div onClick={() => ir({ caso: null })} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(11,14,18,.45)", display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 70 }}>
              <div role="dialog" aria-modal="true" aria-label={E("Caso", "Case")} onClick={(e) => e.stopPropagation()} style={{ width: 600, maxHeight: "86vh", overflowY: "auto", padding: 18, borderRadius: 24, background: "var(--tl-white)", display: "flex", flexDirection: "column", gap: 14 }}>{detalle}</div>
            </div>
          </>
        ) : <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{detalle}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: lado && caso ? "minmax(0,1fr) 400px" : "minmax(0,1fr)", gap: 24, alignItems: "start" }}>
          {columnaLista}
          {lado && caso ? <aside style={{ position: "sticky", top: 76, maxHeight: "calc(100vh - 92px)", overflowY: "auto", padding: 16, borderRadius: 22, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ font: "700 9.5px 'JetBrains Mono',monospace", letterSpacing: ".14em", color: "rgba(11,14,18,.6)" }}>{E("CASO", "CASE")}</span>
              <span role="button" aria-label={E("Cerrar", "Close")} onClick={() => ir({ caso: null })} {...tec(() => ir({ caso: null }))} style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(11,14,18,.05)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono name="close" size={15} /></span></div>
            {detalle}</aside> : null}
        </div>
      )}
      <Toast t={toast} desk={desk} />
    </>
  );
}
