"use client";
/* ADM-COLAS (Super Admin.dc.html secColas / qDetail): todo lo que espera una decisión de una persona. Lista de
   QueueCard (la más vieja contra su plazo primero), detalle al lado (≥ 1200) o a pantalla completa, confirmación con
   motivo (ReasonConfirm). El servidor decide qué ve y qué puede decidir cada quien. */
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

import { crearSemilla,
 decidirCambio, decidirLicencia, decidirMedios, decidirNuevo, decidirRec, decidirReclamo, decidirRep, decidirSop, decidirSello, tomarCaso, tomarSiguiente, chatOcultarMensaje, decidirChat, decidirDisputa, decidirRenta, decidirNoche, decidirEstafa, pausaEstafa, decidirVivienda, type ResAdm, verNinoCaso } from "./acciones-colas";
import { compaHilo } from "./acciones-compa";
import { verFotosSalud } from "./acciones-sistema";
import { copilotoSugerir } from "./acciones-copiloto";
import type { BorradorCopiloto } from "@/lib/compa/copiloto";
import { uuid } from "@/lib/uuid";
import { hoyEn } from "@/lib/fecha-local";
import { useAhora } from "@/lib/ahora";

import { tec } from "@/lib/tec";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"QueueCard" | "AdminNote" | "AdminList" | "ReasonConfirm" | "Button", ComponentType<any>>;
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

export function useAncho() {
  const [w, setW] = useState(390);
  useEffect(() => { const f = () => setW(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return w;
}

export type Confirmar = { titulo: string; sub?: string; plantillas?: string[]; peligro?: boolean; cta?: string; ini?: string; elegir?: { label: string; items: { k: string; l: string }[] }; valor?: { k: string; ini: string; area?: boolean; max: number }; hacer: (motivo: string, elegido: string | null, valor: string) => Promise<ResAdm> };

/* Confirmación con motivo (patrón 2ao): ReasonConfirm, con elección y, si hace falta, el campo del valor nuevo. */
export function ConfirmarMotivo({ c, onBack, onDone, desk }: { c: Confirmar; onBack: () => void; onDone: (r: ResAdm) => void; desk: boolean }) {
  const [motivo, setMotivo] = useState(c.ini ?? ""), [elegido, setElegido] = useState<string | null>(null), [valor, setValor] = useState(c.valor?.ini ?? "");
  const [pend, start] = useTransition(), [err, setErr] = useState<string | null>(null);
  const falta = !motivo.trim() || (!!c.elegir && !elegido) || (!!c.valor && !valor.trim() && c.valor.k !== "QUIÉNES SOMOS");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {c.valor ? <PanelBloques bloques={[{ type: "field", k: c.valor.k, val: valor, onChange: setValor, area: c.valor.area, rows: 4, max: c.valor.max, count: `${valor.length}/${c.valor.max}` }]} /> : null}
      <A.ReasonConfirm desk={desk} title={c.titulo} sub={c.sub ?? "El motivo lo ve la persona afectada y queda en la auditoría."}
        choices={c.elegir ? [{ label: c.elegir.label, items: c.elegir.items.map((x) => ({ label: x.l, on: elegido === x.k, onClick: () => setElegido(x.k) })), empty: "No hay a quién elegir." }] : []}
        templates={(c.plantillas ?? []).map((t) => ({ label: t, on: motivo === t, onClick: () => setMotivo(t) }))}
        reason={motivo} onReason={(e: { target: { value: string } } | string) => setMotivo(typeof e === "string" ? e : e.target.value)}
        autoFocus={!c.plantillas?.length} cta={pend ? "Guardando…" : c.cta ?? "Confirmar"} danger={c.peligro} disabled={falta || pend}
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


export function Colas({ casos, conteo, vencidos, total, visibles, caso, puedeAprobar, apelarDias = 0, slas = {}, puedeRepartir = false, ajustes = null, esAdmin = false, cfgTxt = {} }: {
  casos: CasoLista[]; conteo: Record<string, number>; vencidos: number; total: number; visibles: Cola[]; caso: Caso | null; puedeAprobar: boolean; apelarDias?: number; slas?: Partial<Record<Cola, number>>;
  puedeRepartir?: boolean; ajustes?: AjustesColas | null; esAdmin?: boolean; cfgTxt?: Record<string, number>;
}) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
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
    setCop({ ...r, caso: id }); setToast("Revísalo antes de enviar: sale con tu nombre.");
  }, () => { setCopBusy(false); setToast("El Compa no está disponible ahora. Escribe tu respuesta."); }); };
  const ir = (p: Record<string, string | null>) => { const q = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v === null) q.delete(k); else q.set(k, v); } router.push(`${path}${q.size ? `?${q}` : ""}`, { scroll: false }); };
  const cola = (sp.get("cola") as Cola | null) ?? null, filtro = sp.get("f");
  const run = (f: () => Promise<ResAdm>, after?: (r: ResAdm) => void) => start(async () => { const r = await f(); setToast(r.mensaje ?? (r.ok ? "Listo. Quedó en la auditoría." : "")); if (r.ok) { after?.(r); router.refresh(); } });
  // 9j · Ver las fotos de Salud con motivo no cierra el caso: se queda en él para verlas.
  const quedarse = useRef(false);
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); if (quedarse.current) { quedarse.current = false; router.refresh(); return; } ir({ caso: null }); router.refresh(); };

  const lista: (Bloque | null)[] = [
    { type: "head", eye: `${total} CASOS · ${vencidos} VENCIDOS`, t: "Colas", s: "Todo lo que espera una decisión de una persona. La más vieja contra su plazo va primero.",
      act: puedeAprobar ? { l: "Tomar siguiente", v: "action", icon: "check", onClick: () => run(tomarSiguiente, (r) => { if (r.ok && r.caso) ir({ caso: r.caso }); }) } : undefined, h1: desk ? 26 : 22 },
    { type: "tabs", items: [{ l: "Todas", n: String(total || ""), on: !cola, onClick: () => ir({ cola: null, caso: null }) }, ...visibles.filter((k) => conteo[k]).map((k) => ({ l: COLAS[k].es, n: String(conteo[k]), on: cola === k, onClick: () => ir({ cola: k, caso: null }) }))] },
    { type: "chips", items: [["mios", "Míos"], ["sin", "Sin asignar"], ["venc", "Vencidos"]].map(([k, l]) => ({ l: l!, v: filtro === k ? "selected" : "filter", onClick: () => ir({ f: filtro === k ? null : k! }) })) },
  ];
  const regla = cola ? COLAS[cola] : null;
  const asignarA = (ids: string[]) => start(async () => {
    const eq = await equipoDeCola(ids[0]!);
    if (!eq.length) { setToast("Nadie más del equipo trabaja esa cola en esa ciudad."); return; }
    setConf({ titulo: ids.length === 1 ? "Asignar el caso a…" : `Asignar ${ids.length} casos a…`, cta: "Asignar", elegir: { label: "PERSONA DEL EQUIPO", items: eq.map((x) => ({ k: x.id, l: x.nombre })) },
      sub: "Le sale en «Míos». Si no lo decide en el tiempo de Configuración › Colas, vuelve a la cola. Queda en la auditoría.", ini: "Reparto del día", plantillas: ["Reparto del día", "Sabe de este tema", "Cubre a alguien de vacaciones"],
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
    <A.QueueCard key={x.id} icon={COLAS[x.queue].icon} state={x.esp.state} title={x.title} sub={x.sub} meta={COLAS[x.queue].es}
      priority={x.priority === "alta" ? "ALTA" : undefined} who={x.who} sla={x.esp.label} assignee={x.assignee ? { name: x.assignee } : undefined}
      wide={ancho} columns={ancho ? "40px minmax(0,1.6fr) minmax(0,1fr) auto" : "40px minmax(0,1fr) auto"} active={sel ? sel.includes(x.id) : caso?.id === x.id}
      onClick={() => (sel ? (x.queue === "ticket" ? setToast("Un caso de Soporte se trabaja en Soporte.") : setSel(sel.includes(x.id) ? sel.filter((y) => y !== x.id) : [...sel, x.id])) : x.queue === "ticket" && x.tk ? router.push(`/admin/soporte?caso=${x.tk}`) : ir({ caso: x.id }))} />));

  const detalle = caso ? cuerpo() : null;
  function cuerpo(): ReactNode {
    const k = caso!, Q = COLAS[k.queue], n = k.negocio, out: (Bloque | null)[] = [];
    const titulo = (k.queue === "entrega" ? `Incidencia de entrega${n?.name ? ` · ${n.name}` : ""}` : null) ?? tituloComunidad(k) ?? tituloEventos(k) ?? (k.queue === "cambio" && "cambio" in k && k.cambio ? `${k.cambio.type === "deleteUser" ? "Borrar cuenta" : k.cambio.type === "mergeUser" ? "Fusionar cuentas" : "Cambio sensible"} · ${k.cambio.nombre ?? k.cambio.phone}` : k.queue === "cambio" ? `Reclamo · ${n?.name ?? ""}` : k.queue === "lic" ? `Licencia · ${n?.name ?? ""}` : k.queue === "sello" ? `Sello · ${n?.name ?? ""}` : k.queue === "nuevo" ? n?.name ?? "" : k.queue === "medios" ? `Foto marcada · ${n?.name ?? ""}` : k.queue === "cuidado" ? `Cuidado de niños · ${n?.name ?? ""}` : k.queue === "salir" ? `No le dejan cancelar · ${n?.name ?? ""}` : k.queue === "grupo" ? `Grupos que no abrieron · ${n?.name ?? ""}` : k.queue === "plantones" ? `Plantones · ${n?.name ?? ""}` : k.queue === "vivienda" ? `${k.subject_kind === "listing" ? "Vivienda para mayores" : "Vivienda justa"} · ${n?.name ?? ""}` : k.queue === "estafa" ? `Posible estafa · ${n?.name ?? ""}` : k.queue === "ticket" ? `Soporte · ${"tk" in k && k.tk ? k.tk : "caso"}` : k.queue === "sop" ? `${AYUDA_DE["ayuda" in k && k.ayuda ? k.ayuda.k : "order"] ?? "Ayuda con un pedido"} · ${n?.name ?? ""}` : k.queue === "mesa" ? `Mesas no respetadas · ${n?.name ?? ""}` : k.queue === "noid" ? `Sin identificación · ${n?.name ?? ""}` : k.queue === "rep" ? `Reseña reportada · ${n?.name ?? ""}` : k.queue === "rec" && "rec" in k ? k.rec?.business_name ?? "" : "");
    out.push({ type: "head", eye: `${Q.es.toUpperCase()} · ${k.esp.r >= 1 ? `${k.esp.t} · VENCIDO` : `${k.esp.t} esperando`}`, t: titulo, h1: 22, onBack: lado ? undefined : () => ir({ caso: null }) });
    if (k.status !== "open") return <><PanelBloques bloques={[out[0]!, { type: "empty", icon: "check", t: "Ya se decidió", s: "Este caso salió de la cola." }]} /></>;
    // 7b · Un caso de Soporte se trabaja en su ficha de Soporte (hilo, macros, notas internas, devolver).
    if (k.queue === "ticket") return <PanelBloques bloques={[out[0]!, { type: "note", tone: "info", icon: "chat", t: "Este caso se contesta en Super Admin › Soporte: ahí están el hilo, las macros, las notas internas y «Resolver y devolver».", cta: "Abrir en Soporte", onCta: () => router.push("tk" in k && k.tk ? `/admin/soporte?caso=${k.tk}` : "/admin/soporte") }]} />;
    const notas: ReactNode[] = [];
    if (k.assigned_to && !k.mine) notas.push(<A.AdminNote key="a" tone="warn" icon="users" cta={k.puedeDecidir ? "Tomarlo" : undefined} onCta={() => run(() => tomarCaso(k.id))}>{`Lo está viendo ${k.assignee ?? "otra persona"}.`}</A.AdminNote>);
    else if (!k.assigned_to && k.puedeDecidir) notas.push(<A.AdminNote key="a" tone="info" icon="users" cta="Tomar" onCta={() => run(() => tomarCaso(k.id))}>Sin asignar. Tómalo para que nadie más lo trabaje.</A.AdminNote>);
    if (!k.puedeDecidir) notas.push(<A.AdminNote key="p" tone="warn" icon="lock">Tu rol solo puede ver esta cola.</A.AdminNote>);
    const filaNeg = n ? <A.AdminList key="n" rows={[{ image: n.cover ?? undefined, initials: n.cover ? undefined : n.name.slice(0, 1), title: n.name, sub: `${n.cat} · ${n.plan === "pro" ? "Pro" : "Free"}${n.verified ? " · Verificado" : ""}`, chevron: true, onClick: () => router.push(`/admin/negocios/${n.id}`) }]} /> : null;
    const cuerpoB: (Bloque | null)[] = [];
    let acts: { l: string; v?: string; icon?: string; off?: boolean; onClick: () => void }[] = [];
    let extra: ReactNode = null;
    // 7g · El copiloto (solo la cola «sop» y solo si el servidor dice que está): la nota con el resumen y el siguiente paso, el borrador, y el botón.
    const copOn = k.queue === "sop" && "copiloto" in k && !!k.copiloto, cp = copOn && cop && cop.caso === k.id ? cop : null;
    const copBloques: Bloque[] = cp ? [
      { type: "note", tone: "info", icon: "help", t: `EL COMPA · ${cp.resumen}${cp.siguiente ? ` Siguiente paso: ${cp.siguiente}` : ""}${cp.devolver ? " Si corresponde devolver, «Resolver y devolver» lo decides tú." : ""}${cp.ai ? "" : " (sin IA: borrador de reglas)"}`,
        ...(cp.fuente ? { cta: `Ayuda: ${cp.fuente.titulo.es}`, onCta: () => window.open(cp.fuente!.href, "_blank", "noopener") } : {}) },
      { type: "note", tone: "ink", icon: "quote", t: `BORRADOR DE EL COMPA · «${cp.borrador}» · Revísalo antes de enviar: sale con tu nombre.` }] : [];
    const copAct = copOn ? [{ l: copBusy ? "El Compa está escribiendo…" : cp ? "Otro borrador con El Compa" : "Sugerir respuesta con El Compa", v: "secondary", icon: "help", off: copBusy, onClick: () => sugerir(k.id) }] : [];
    if (k.queue === "sello" && n) {
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: "DIRECCIÓN", v: n.address ?? "—" }, { k: "TELÉFONO", v: n.phone || "—" }, { k: `EN ${n.ciudad.toUpperCase()} DESDE`, v: n.founded ? String(n.founded) : "—" }, { k: "FOTOS", v: String(n.fotos) }, { k: "RESEÑAS", v: String(n.reviews) }, { k: "PLAN", v: n.plan === "pro" ? "Pro" : "Free" }] });
      cuerpoB.push({ type: "group", k: "LISTA DE VERIFICACIÓN" });
      extra = (
        <A.AdminList rows={([["existe", `Existe en ${n.ciudad} (dirección y fotos coinciden)`], ["representa", "Quien pide representa al negocio (teléfono del local)"], ["coincide", "La página dice lo que el negocio hace"]] as const).map(([key, t]) => ({
          icon: checks[key] ? "check" : "help", title: t, toggle: !!checks[key], onClick: () => setChecks((z) => ({ ...z, [key]: !z[key] })), bg: checks[key] ? "var(--tl-ds-e3f4f1)" : undefined }))} />);
      const tres = !!(checks.existe && checks.representa && checks.coincide);
      acts = [
        { l: "Aprobar sello", v: "action", icon: "verified", onClick: () => (tres ? run(() => decidirSello(k.id, "aprobar", "", checks), () => ir({ caso: null })) : setToast("Marca las tres comprobaciones primero.")) },
        { l: "Pedir un dato", v: "ghost", icon: "chat", onClick: () => setConf({ titulo: "¿Qué le falta?", plantillas: PLANT.selloInfo, hacer: (m) => decidirSello(k.id, "info", m, checks) }) },
        { l: "No aprobar", v: "danger", icon: "close", onClick: () => setConf({ titulo: "¿Por qué no se aprueba?", plantillas: PLANT.selloNo, peligro: true, hacer: (m) => decidirSello(k.id, "no", m, checks) }) },
      ];
    }
    if (k.queue === "nuevo" && n) {
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: "CATEGORÍA", v: n.cat }, { k: "SUBCATEGORÍAS", v: n.subs ?? "—" }, { k: "FOTOS", v: String(n.fotos) }, { k: "ORIGEN", v: "Publica tu negocio" }, { k: "PLAN", v: n.plan === "pro" ? (n.trial ? "Pro · prueba 30 días" : "Pro") : "Free" }] });
      cuerpoB.push({ type: "note", tone: "info", t: "Revisión ligera: nombre real, categoría correcta, fotos del negocio. Nada más." });
      acts = [
        { l: "Ver como cliente", icon: "search", onClick: () => window.open(`/n/${n.id}`, "_blank") },
        { l: "Todo bien", v: "action", icon: "check", onClick: () => run(() => decidirNuevo(k.id, "ok", ""), () => ir({ caso: null })) },
        { l: "Ocultar", v: "danger", icon: "ban", onClick: () => setConf({ titulo: "¿Por qué se oculta?", plantillas: PLANT.biz, peligro: true, hacer: (m) => decidirNuevo(k.id, "ocultar", m) }) },
      ];
    }
    if (k.queue === "cambio" && "reclamo" in k && k.reclamo && n) {
      const c = k.reclamo, ROL: Record<string, string> = { dueno: "dueño", socio: "socio", encargado: "encargado" }, DOC: Record<string, string> = { licencia: "Licencia del negocio", servicio: "Factura de luz o agua", ein: "Carta del IRS con el EIN", otro: "Otro documento" };
      const diasAviso = c.notified ? Math.floor((ahora - new Date(c.notified).getTime()) / 86_400_000) : null;
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: "LO RECLAMA", v: `${c.quien ?? "Sin nombre"} · ${c.quien_tel}` }, { k: "AFECTA A", v: "El panel del negocio pasa a esta persona" }, { k: "RECLAMO", v: `#${c.id}` }, { k: "ORIGEN", v: c.source === "publica" ? "Publica tu negocio (nombre repetido)" : "Recuperar tu negocio" }] });
      if (c.doc) extra = <div style={{ height: 220, borderRadius: 18, backgroundImage: `url("/api/admin/reclamo/${c.id}")`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundColor: "var(--tl-photo-bg)" }} />;
      cuerpoB.push({ type: "group", k: "EVIDENCIAS" });
      cuerpoB.push({ type: "rows", items: [
        c.method === "call_code" ? { icon: "check", ibg: "rgba(0,229,196,.14)", ifg: "var(--tl-open-text)", t: "Código por mensaje al teléfono del negocio: correcto" } : { icon: "check", ibg: "rgba(0,229,196,.14)", ifg: "var(--tl-open-text)", t: `Documento: ${DOC[c.doc_kind ?? "otro"]} (foto abajo)` },
        { icon: "users", t: `Dice que es ${ROL[c.role] ?? c.role} del negocio` },
        ...(c.dueno_actual ? [{ icon: "warning", ibg: "rgba(255,176,32,.14)", ifg: "var(--tl-pro-ink)", t: `Ya tiene dueño: ${c.dueno_actual}.`, s: diasAviso == null ? "Sin aviso." : diasAviso >= 7 ? `Vio el aviso hace ${diasAviso} días: ya puede aplicarlo un Admin.` : `Vio el aviso hace ${diasAviso} ${diasAviso === 1 ? "día" : "días"}: tiene 7 días para responder.` }] : []),
      ] });
      cuerpoB.push({ type: "note", tone: "ink", icon: "quote", t: `LO QUE PIDIÓ · «${c.note ?? (c.source === "publica" ? "Pidió recuperar el negocio desde Publica tu negocio (nombre repetido)." : "Pidió recuperar el negocio.")}»` });
      acts = [
        { l: "Aplicar cambio", v: "action", icon: "check", onClick: () => setConf({ titulo: "Confirmar el cambio", sub: "Quien reclama pasa a ser el dueño y entra al panel. El motivo queda en la auditoría.", cta: "Aplicar", hacer: (m) => decidirReclamo(k.id, true, m) }) },
        { l: "Rechazar", v: "danger", icon: "close", onClick: () => setConf({ titulo: "¿Por qué no se aplica?", sub: "El motivo lo ve quien reclamó.", peligro: true, plantillas: ["El documento no muestra el nombre del negocio", "La dirección no coincide con la página", "No pudimos confirmar que eres del negocio"], hacer: (m) => decidirReclamo(k.id, false, m) }) },
      ];
    }
    if (k.queue === "cambio" && "cambio" in k && k.cambio) {
      const c = k.cambio;
      extra = <A.AdminList rows={[{ initials: (c.nombre ?? "?").slice(0, 1), title: c.nombre ?? "(sin nombre todavía)", sub: `${c.phone}${c.ciudad ? ` · ${c.ciudad}` : ""}`, chevron: true, onClick: () => router.push(`/admin/usuarios/${c.target_id}`) }]} />;
      const fusion = c.type === "mergeUser";
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: "LO PIDIÓ", v: c.quien ?? "Equipo" }, { k: "AFECTA A", v: fusion ? `Esta cuenta pasa a la de ${c.hacia ?? "la otra cuenta"}` : "La cuenta y todo lo suyo" }, { k: "PEDIDO", v: `#${c.id}` }, { k: "NEGOCIOS DE LOS QUE ES DUEÑA", v: String(c.negocios) }] });
      cuerpoB.push({ type: "note", tone: "ink", icon: "quote", t: `MOTIVO · «${c.reason}»` });
      // 9d · D5: lo que pasa a los 30 días es lo que hace la purga por el mapa de datos (Usuarios 360° › Privacidad muestra cada tabla).
      cuerpoB.push({ type: "note", tone: "info", t: fusion
        ? "Al aplicarlo, sus pedidos, cobros, direcciones, guardados, reseñas y publicaciones pasan a la otra cuenta; esta queda fusionada y ya no entra. Queda en la auditoría."
        : "Al aplicarlo hay 30 días de gracia para restaurarla. Después se borra todo lo suyo; sus pedidos y cobros quedan como «Cuenta borrada», sin nombre ni teléfono (lo pide la ley), y los pagos con tarjeta quedan en Stripe." });
      if (c.mio) cuerpoB.push({ type: "note", tone: "warn", icon: "lock", t: "Lo pediste tú: lo aplica otra persona del equipo." });
      acts = c.mio ? [] : [
        { l: "Aplicar cambio", v: "action", icon: "check", onClick: () => setConf(fusion ? { titulo: "Confirmar la fusión", sub: "Todo lo que se mueve pasa a la otra cuenta y esta ya no entra. Queda en la auditoría.", cta: "Aplicar", peligro: true, hacer: (m) => decidirCambio(k.id, true, m) }
          : { titulo: "Confirmar el borrado", sub: "La cuenta no puede entrar desde ahora y tiene 30 días de gracia. Queda en la auditoría.", cta: "Aplicar", peligro: true, hacer: (m) => decidirCambio(k.id, true, m) }) },
        { l: "Rechazar", v: "danger", icon: "close", onClick: () => setConf({ titulo: "¿Por qué no se aplica?", hacer: (m) => decidirCambio(k.id, false, m) }) },
      ];
    }
    if (k.queue === "lic" && "licencia" in k && k.licencia && n) {
      const l = k.licencia, est = ({ valid: ["Verificada", "var(--tl-open-text)"], expired: ["Vencida", "var(--tl-danger)"], not_found: ["No aparece", "var(--tl-danger)"], revoked: ["No aparece", "var(--tl-danger)"] } as Record<string, [string, string]>)[l.status] ?? ["Por verificar", "var(--tl-pro-ink)"];
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: "LICENCIA", v: l.title }, { k: "PUEDE", v: l.can }, { k: "NÚMERO", v: l.number ? `${l.label} ${l.number}` : "No lo dio" }, { k: "ESTADO HOY", v: est[0], fg: est[1] }, { k: "ÚLTIMA REVISIÓN", v: l.checked ? new Date(l.checked).toLocaleDateString("es-US", { day: "numeric", month: "short", year: "numeric" }) : "—" }, { k: "REGISTRO", v: l.site }, ...(l.status === "valid" && l.next ? [{ k: "PRÓXIMA REVISIÓN", v: new Date(`${l.next}T12:00:00Z`).toLocaleDateString("es-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }), fg: l.next < hoyEn() ? "var(--tl-danger)" : "var(--tl-pro-ink)" }] : [])] });
      cuerpoB.push({ type: "note", tone: "info", t: "Verifícala en el registro oficial del estado. Lo que decidas se ve en la ficha «Licencia» del negocio.", cta: "Abrir registro", onCta: () => window.open(l.url, "_blank", "noopener") });
      acts = [
        { l: "Verificada", v: "action", icon: "verified", onClick: () => run(() => decidirLicencia(k.id, "valid", ""), () => ir({ caso: null })) },
        { l: "Vencida", icon: "clock", onClick: () => setConf({ titulo: "¿Qué dice el registro?", hacer: (m) => decidirLicencia(k.id, "expired", m) }) },
        { l: "No aparece", v: "danger", icon: "close", onClick: () => setConf({ titulo: "¿Qué buscaste y dónde?", peligro: true, hacer: (m) => decidirLicencia(k.id, "not_found", m) }) },
      ];
    }
    if (k.queue === "medios" && "foto" in k && n) {
      extra = k.foto ? (
        <div style={{ position: "relative", height: 220, borderRadius: 18, backgroundImage: `url("${k.foto.url}")`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "var(--tl-photo-bg)" }}>
          <span style={{ position: "absolute", left: 10, bottom: 10, padding: "4px 8px", borderRadius: 7, background: "rgba(11,14,18,.75)", color: "var(--tl-white)", font: "800 9.5px 'JetBrains Mono',monospace", letterSpacing: ".1em" }}>REPORTADA POR UN VECINO</span>
        </div>) : null;
      const MOT: Record<string, string> = { no_es: "No es de este negocio", inapropiado: "Contenido inapropiado", datos: "Muestra datos personales", spam: "Es publicidad o spam", otro: "Otro motivo" };
      const r0 = k.reportes[0];
      cuerpoB.push({ type: "note", tone: "warn", t: `Reportada por un vecino: ${MOT[r0?.reason ?? "otro"]}${r0?.note ? ` · «${r0.note}»` : ""}${k.reportes.length > 1 ? ` · ${k.reportes.length} reportes` : ""} · Sigue visible mientras decides.` });
      const unica = (k.foto?.visibles ?? 0) <= 1;
      if (unica) cuerpoB.push({ type: "note", tone: "info", icon: "image", t: "Es la única foto visible: para quitarla, pide al dueño que suba otra." });
      acts = [
        { l: "Está bien", v: "action", icon: "check", onClick: () => run(() => decidirMedios(k.id, "mantener", ""), () => ir({ caso: null })) },
        { l: "Quitar foto", v: "danger", icon: "trash", off: unica, onClick: () => setConf({ titulo: "¿Por qué se quita?", plantillas: PLANT.foto, peligro: true, hacer: (m) => decidirMedios(k.id, "quitar", m) }) },
      ];
    }
    // Toda ayuda que no es de un pedido de comida usa esta vista (citas, mercado, apartados, fiestas, viajes, noche e inscripciones; 4eg:
    // antes fiestas, viajes y noche caían en la vista del pedido de comida). También las colas «Cuidado de niños» y «No me dejan cancelar».
    if ((k.queue === "sop" || k.queue === "cuidado" || k.queue === "salir" || k.queue === "estafa") && "ayuda" in k && k.ayuda && k.ayuda.k !== "order") {
      // Ayuda con una cita (3e): qué pasó, qué quiere y cuánto, su nota y fotos, la decisión del negocio y lo que se puede
      // devolver a la tarjeta (el depósito pagado en la app). Resolver con monto devuelve a la tarjeta.
      const h = k.ayuda;
      const DEC: Record<string, string> = { ok: "Aceptó", alt: `Propuso devolver $${((h.offer ?? 0) / 100).toFixed(2)}`, no: "Dijo que no puede" };
      const usd = (c: number) => `$${(c / 100).toFixed(2)}`, dinero = "puedeDinero" in k && !!k.puedeDinero;
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: "SOLICITUD", v: h.number }, { k: h.k === "visit" ? "VISITA" : h.k === "market_order" ? "PEDIDO" : h.k === "hold" ? "APARTADO" : h.k === "party" ? "FIESTA" : h.k === "trip" ? "VIAJE" : h.k === "night" ? "NOCHE" : h.k === "enrollment" ? "INSCRIPCIÓN" : h.k === "tickets" ? "ORDEN DE BOLETOS" : "CITA", v: `${h.num}${h.svc ? ` · ${h.svc}` : ""}${h.k === "visit" ? "" : ` · ${usd(h.total)}`}` }, { k: "CLIENTE", v: h.quien }, { k: "QUÉ PASÓ", v: motivoAyuda(h.reason, h.k === "market_order" ? "merc" : h.k === "hold" ? "tienda" : h.rub)[0] },
        { k: "QUÉ QUIERE", v: `${quiereAyuda(h.wants)[0]}${h.amount ? ` · ${usd(h.amount)}` : ""}` }, { k: "DEVOLVIBLE A LA TARJETA", v: h.pago ? `${usd(h.pago)} (${h.k === "trip" ? "el viaje" : h.k === "tickets" ? "lo cobrado; los boletos siguen valiendo" : "depósito"})` : h.rub === "salud" || h.rub === "pro" || h.rub === "fe" || h.rub === "inm" || h.rub === "dealer" ? "Nada: no se cobra en la app" : "Nada: pagó en el local" }] });
      if (h.body) cuerpoB.push({ type: "note", tone: "ink", icon: "quote", t: `LO QUE CUENTA · «${h.body}»` });
      // 9j · «Vidrio roto»: las fotos de una ayuda de Salud se ven solo después de escribir el motivo (10 minutos; queda en la auditoría).
      if (h.fotos.length && h.salud && !h.vidrio) cuerpoB.push({ type: "lock", t: `${h.fotos.length} ${h.fotos.length === 1 ? "foto" : "fotos"} de Salud`, s: "Son datos de salud: para verlas escribe por qué las necesitas. Queda en la auditoría y valen 10 minutos.", cta: "Ver con motivo",
        onCta: () => setConf({ titulo: "Ver las fotos de Salud", cta: "Ver las fotos", sub: "El motivo queda en la auditoría con tu nombre. Las fotos se abren solo para ti durante 10 minutos.",
          plantillas: ["Revisar la factura para decidir la ayuda.", "El paciente pidió que revisemos su cobro."], hacer: async (m) => { const r = await verFotosSalud(h.hid, m); quedarse.current = r.ok; return r; } }) });
      else if (h.fotos.length) cuerpoB.push({ type: "photos", k: "SUS FOTOS", cols: 4, items: h.fotos.map((u) => ({ bg: `url(${u})`, key: u, onClick: () => window.open(u, "_blank", "noopener") })) });
      cuerpoB.push(h.reply ? { type: "note", tone: "info", icon: "chat", t: `RESPUESTA DEL NEGOCIO · ${DEC[h.decision ?? ""] ?? "Respondió"} · «${h.reply}»${h.escalated_by === "user" ? " · el cliente pidió que lo revisemos" : ""}` } : k.queue === "estafa" || (h.escalated_by === "system" && (k.queue !== "sop" || h.k === "tickets")) ? { type: "note", tone: "warn", icon: "warning", t: "Vino directo a To'Latino: no espera al negocio." } : { type: "note", tone: "warn", icon: "clock", t: "El negocio no respondió en 24 horas." });
      cuerpoB.push(...copBloques);
      // 4if · «Posible estafa»: lo que está en pausa, lo que vio la persona al pedir (la copia) y sus otras ayudas directas; decidir sin dinero.
      const pz = "pausa" in k ? k.pausa : null;
      if (k.queue === "estafa" && pz) {
        const cp = pz.copia as { rent?: number; dep?: number; moveIn?: number; price?: number; otd?: number; item?: string; que?: string } | null;
        cuerpoB.push({ type: "kv", cols: 3, items: [{ k: "EN PAUSA", v: pz.kind ? `${pz.item ?? "—"} · ${pz.fin ? "reanudada" : pz.vivo ? "se ve" : "no se ve"}` : "Nada (ya no se veía)", fg: pz.kind && !pz.fin ? "var(--tl-danger)" : undefined },
          { k: "LO QUE VIO AL PEDIR", v: cp ? [cp.moveIn != null ? `Para mudarse ${usd(cp.moveIn)}` : null, cp.rent != null ? `renta ${usd(cp.rent)}` : null, cp.dep != null ? `depósito ${usd(cp.dep)}` : null, cp.otd != null ? `En la puerta ${usd(cp.otd)}` : null, cp.price != null && cp.otd == null ? `precio ${usd(cp.price)}` : null].filter(Boolean).join(" · ") || "—" : "—" },
          { k: "OTRAS EN 90 DÍAS", v: String(pz.otras), fg: pz.otras > 0 ? "var(--tl-danger)" : undefined }] });
      }
      const plant = ["Revisamos la cita y tus fotos: tienes razón. Te devolvemos lo cobrado de más.", "Hablamos con el negocio: te dan otra cita para arreglarlo sin cargo.", "Revisamos la cita: el servicio fue el publicado. Gracias por avisar."];
      if (k.queue === "estafa") acts = [
        { l: "Sancionar", v: "danger", icon: "warning", onClick: () => setConf({ titulo: "¿Qué encontraste?", sub: "Lo pausado queda fuera de su página (con este motivo) y el negocio recibe una advertencia. La persona ve tu respuesta. No se devuelve dinero desde aquí: no pasó por la app.", cta: "Sancionar", peligro: true,
          plantillas: ["Revisamos tus fotos: te cobraron por ver. En To'Latino ver es gratis; el anuncio queda fuera y el negocio tiene una advertencia.", "Revisamos tus fotos y lo publicado: pidieron más de lo publicado para mudarte. El anuncio queda fuera y el negocio tiene una advertencia.", "La ayuda de la iglesia es gratis. Revisamos lo que nos mandaste: «Pedir fecha» queda fuera y el lugar tiene una advertencia."], hacer: (m) => decidirEstafa(k.id, "sancion", m) }) },
        { l: "Sin acción · se ve otra vez", v: "secondary", icon: "check", onClick: () => setConf({ titulo: "¿Qué encontraste?", sub: "Lo pausado vuelve a verse y el caso se cierra. La persona y el negocio ven tu respuesta.", cta: "Cerrar sin acción",
          plantillas: ["Revisamos tus fotos y lo publicado: lo que te pidieron era lo publicado (primer mes y depósito).", "Hablamos con el negocio y lo corrigió; te devolvió lo cobrado.", "No encontramos un cobro por ver en lo que nos mandaste. Si tienes otra prueba, escríbenos."], hacer: (m) => decidirEstafa(k.id, "sin_accion", m) }) },
        ...(pz && pz.kind ? [pz.fin || pz.vivo ? { l: "Pausar mientras decides", v: "ghost", icon: "close", onClick: () => setConf({ titulo: "¿Por qué se pausa?", sub: "Sale de su página hasta que decidas. Queda en la auditoría.", cta: "Pausar", plantillas: ["Mientras revisamos la solicitud."], hacer: (m) => pausaEstafa(k.id, true, m) }) }
          : { l: "Reanudar mientras decides", v: "ghost", icon: "check", onClick: () => setConf({ titulo: "¿Por qué se vuelve a mostrar?", sub: "Se ve otra vez; el caso sigue abierto. Queda en la auditoría.", cta: "Reanudar", plantillas: ["El negocio ya mandó pruebas; lo vemos con calma."], hacer: (m) => pausaEstafa(k.id, false, m) }) }] : []),
        { l: "Ver el cliente", icon: "users", onClick: () => router.push(`/admin/usuarios/${h.uid}`) },
      ];
      else acts = [
        { l: "Resolver con un mensaje", v: "action", icon: "check", onClick: () => setConf({ titulo: "Tu respuesta al cliente", sub: "La ve en su cita; el negocio la ve en su panel. Queda en la auditoría.", cta: "Resolver", plantillas: cp ? [cp.borrador, ...plant] : plant, ini: cp?.borrador, hacer: (m) => decidirSop(k.id, m, null, null, cp?.id ?? null) }) },
        ...copAct,
        ...(dinero && h.pago > 0 ? [{ l: "Resolver y devolver", v: "secondary", icon: "card", onClick: () => { const clave = uuid(); setConf({ titulo: `Resolver y devolver · ${h.k === "tickets" ? "orden" : "cita"} ${h.num}`, cta: "Resolver y devolver", peligro: true,
          sub: h.k === "tickets" ? `Hasta ${usd(h.pago)} (lo cobrado en la app). Vuelve a su tarjeta en 3 a 5 días hábiles; los boletos siguen valiendo (para quitarlos, se cancelan o se devuelven desde la orden).` : `Hasta ${usd(h.pago)} (el depósito pagado en la app). Vuelve a su tarjeta en 3 a 5 días hábiles; la comisión baja en proporción.`,
          valor: { k: "MONTO EN DÓLARES", ini: ((Math.min(h.amount ?? h.pago, h.pago)) / 100).toFixed(2), max: 8 }, plantillas: cp ? [cp.borrador, ...plant] : plant, hacer: (m, _e, v) => decidirSop(k.id, m, v, clave, cp?.id ?? null) }); } }] : []),
        { l: "Ver el cliente", icon: "users", onClick: () => router.push(`/admin/usuarios/${h.uid}`) },
        // 4eg · «Cuidado de niños»: los datos del niño solo con motivo, y quedan en la auditoría.
        ...(k.queue === "cuidado" ? [{ l: "Ver los datos del niño", icon: "shield", onClick: () => setConf({ titulo: "¿Para qué necesitas ver los datos del niño?", sub: "Solo Soporte o Admin. Queda en la auditoría con tu motivo; se muestran solo en esta pantalla.", cta: "Ver los datos",
          plantillas: ["Para hablar con el lugar sobre lo que pasó con este niño.", "Para pasar el caso a las autoridades (ChildLine)."], hacer: (m) => verNinoCaso(k.id, m) }) }] : []),
      ];
    }
    if (k.queue === "sop" && "ayuda" in k && k.ayuda && k.ayuda.k === "order") {
      // Ayuda con un pedido: qué pasó, qué platos, qué quiere, su nota, la respuesta del negocio y el pedido.
      const h = k.ayuda, MOT: Record<string, string> = { falta: "Falta algo", equivocado: "Llegó algo equivocado", frio: "Llegó frío o mal preparado", danado: "Llegó dañado o derramado", tarde: "Llegó tarde", nollego: "No le llegó", pago: "Problema con el pago", otro: "Otro problema" };
      const Q: Record<string, string> = { reponer: "Que se lo repongan", devolver: "Que le devuelvan lo de esos platos", avisar: "Solo quiere que lo sepan" };
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: "SOLICITUD", v: h.number }, { k: "PEDIDO", v: `#${h.num} · $${(h.total / 100).toFixed(2)}` }, { k: "CLIENTE", v: h.quien }, { k: "QUÉ PASÓ", v: MOT[h.reason] ?? h.reason },
        ...(h.items.length ? [{ k: "PLATOS", v: h.items.map((x) => `${x.q} × ${x.n}`).join(" · ") }] : []), { k: "QUÉ QUIERE", v: Q[h.wants] ?? h.wants }] });
      if (h.body) cuerpoB.push({ type: "note", tone: "ink", icon: "quote", t: `SU NOTA · «${h.body}»` });
      cuerpoB.push(h.reply ? { type: "note", tone: "info", icon: "chat", t: `RESPUESTA DEL NEGOCIO · «${h.reply}»${h.escalated_by === "user" ? " · el cliente pidió que lo revisemos" : ""}` } : { type: "note", tone: "warn", icon: "clock", t: "El negocio no respondió en 24 horas." });
      cuerpoB.push(...copBloques);
      const plantP = ["Hablamos con el negocio: te reponen lo que faltó.", "Hablamos con el negocio: te devuelven lo de esos platos en el local.", "Gracias por avisar. Se lo dijimos al negocio para que no vuelva a pasar."];
      acts = [
        { l: "Resolver con un mensaje", v: "action", icon: "check", onClick: () => setConf({ titulo: "Tu respuesta al cliente", sub: "La ve en su pedido; el negocio la ve en su panel. Queda en la auditoría.", cta: "Resolver",
          plantillas: cp ? [cp.borrador, ...plantP] : plantP, ini: cp?.borrador,
          hacer: (m) => decidirSop(k.id, m, null, null, cp?.id ?? null) }) },
        ...copAct,
        { l: "Ver el cliente", icon: "users", onClick: () => router.push(`/admin/usuarios/${h.uid}`) },
      ];
    }
    if (k.queue === "rep" && "resena" in k) {
      // Reportes de contenido · reseña (adm-data · rep): la cita, quién reportó, cuántos y hace cuánto; sigue visible mientras se decide.
      const r = k.resena, reps = k.reportesR ?? [], hace = (iso: string) => { const h = (ahora - new Date(iso).getTime()) / 3_600_000; return h < 1 ? "menos de 1 h" : h < 24 ? `${Math.floor(h)} h` : `${Math.floor(h / 24)} d`; };
      if (r) cuerpoB.push({ type: "note", tone: "ink", icon: "quote", t: `RESEÑA · ${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)} · ${r.autor} · «${r.body}»${r.reply ? ` — Respuesta del negocio: «${r.reply}»` : ""}` });
      const r0 = reps[0];
      cuerpoB.push({ type: "kv", cols: 3, items: [
        { k: "REPORTADO POR", v: r0 ? (r0.by_business ? "El negocio" : r0.quien ?? "Un vecino") : "—" },
        { k: "REPORTES", v: String(reps.length) },
        { k: "HACE", v: r0 ? hace(r0.at) : "—" },
      ] });
      reps.forEach((x) => cuerpoB.push({ type: "note", tone: x.by_business ? "info" : "warn", t: `${x.by_business ? "El negocio pidió revisarla" : MOTIVO_RESENA[x.reason] ?? "Otro motivo"}${x.note ? ` · «${x.note}»` : ""}` }));
      cuerpoB.push({ type: "note", tone: "info", icon: "shield", t: "Sigue visible mientras decides (regla de 48 h). Ocultar avisa al autor con el motivo." });
      const oculta = r?.status !== "visible";
      acts = [
        { l: "Mantener", v: "action", icon: "check", onClick: () => setConf({ titulo: "¿Por qué se queda?", plantillas: PLANT.keep, hacer: (m) => decidirRep(k.id, "mantener", m) }) },
        { l: "Ocultar", v: "danger", icon: "close", off: oculta, onClick: () => setConf({ titulo: "¿Por qué se oculta?", plantillas: PLANT.hide, peligro: true, hacer: (m) => decidirRep(k.id, "ocultar", m) }) },
        { l: "Ocultar y sancionar", v: "danger", icon: "warning", off: oculta, onClick: () => setConf({ titulo: "¿Por qué se oculta?", sub: "Además, una sanción al autor.", plantillas: PLANT.hide, peligro: true,
          elegir: { label: "SANCIÓN", items: [{ k: "adv", l: "Advertencia" }, { k: "mute7", l: "Silencio 7 días" }, { k: "nopub", l: "Bloquear publicación 30 días" }, { k: "susp14", l: "Suspender 14 días" }] }, hacer: (m, e) => decidirRep(k.id, "ocultar", m, e) }) },
      ];
    }
    if (k.queue === "plantones" && "plantones" in k && k.plantones) {
      // 4ie · Las visitas marcadas «No vino» en 30 días. Pausar quita las visitas de su página (modules_off.svc) hasta que se reanude.
      const p = k.plantones;
      cuerpoB.push({ type: "kv", cols: 3, items: [{ k: "«NO VINO» EN 30 DÍAS", v: String(p.L.length), fg: "var(--tl-pro-ink)" }, { k: "VISITAS QUE PASARON", v: String(p.tot) }, { k: "VISITAS", v: p.pausado ? "En pausa" : "Activas" }] });
      cuerpoB.push({ type: "rows", k: "CADA UNA", items: p.L.map((x) => ({ icon: "clock", t: `${x.num} · ${x.item ?? ""}`, s: `${({ visita: "Visita", prueba: "Prueba de manejo", cita: "Cita", precal: "Precalificación", oferta: "Oferta" } as Record<string, string>)[x.que] ?? x.que} · para el ${x.dia} · ${x.quien} · marcada ${new Date(x.marcada).toLocaleString("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` })) });
      if (k.puedeDecidir) acts = [
        ...(p.pausado ? [] : [{ l: "Pausar visitas", v: "danger", icon: "warning", onClick: () => setConf({ titulo: "¿Por qué se pausan las visitas?", sub: "Sus visitas y pruebas de manejo salen de su página hasta que las reanudes desde Negocios 360°. El dueño ve el motivo en su panel. Lo ya confirmado sigue en pie.", cta: "Pausar", peligro: true,
          plantillas: ["Marca «No vino» para que no lo califiquen.", "Los clientes dicen que sí fueron."], hacer: (m) => decidirNoche(k.id, true, m) }) }]),
        { l: "Revisado, sin cambios", v: "secondary", icon: "check", onClick: () => setConf({ titulo: "¿Qué encontraste?", sub: "El caso se cierra; si marca 3 «No vino» más en 30 días, se abre otro.", cta: "Cerrar el caso",
          plantillas: ["De verdad no fueron: tiene sus mensajes.", "Hablamos con el negocio y lo corrigió."], hacer: (m) => decidirNoche(k.id, false, m) }) },
      ];
    }
    if (k.queue === "vivienda" && "vivienda" in k && k.vivienda) {
      // 4ig · Vivienda justa: la propiedad que se declara para mayores de 62, o los textos que no se guardaron por una frase de la lista.
      const v = k.vivienda, usd = (c: number) => `$${(c / 100).toLocaleString("en-US")}`;
      const fecha = (t: string) => new Date(t).toLocaleString("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
      if (v.tipo === "mayores" && v.propiedad) {
        const p = v.propiedad, EST: Record<string, string> = { available: "Disponible", pending: "Apartada", rented: "Rentada", sold: "Vendida", hidden: "Oculta" };
        cuerpoB.push({ type: "kv", cols: 2, items: [{ k: "PROPIEDAD", v: p.name }, { k: "TIPO", v: "Vivienda para mayores de 62" }, { k: "RENTA AL MES", v: p.rent != null ? usd(p.rent) : "—" },
          { k: "ESTADO", v: p.oculta ? "Oculta" : EST[p.st] ?? p.st }, { k: "ZONA", v: p.zip ? `Código postal ${p.zip}` : "—" }, { k: "DECLARACIÓN", v: p.senior === "review" ? "Por revisar" : p.senior === "ok" ? "Confirmada" : "No confirmada", fg: "var(--tl-pro-ink)" }] });
        cuerpoB.push({ type: "note", tone: "info", t: "La ley de vivienda justa deja preferir a mayores de 62 solo si la vivienda cumple la excepción para mayores. Revisa la declaración con el dueño y el registro público; si no está en orden, no se confirma y la propiedad queda oculta con el motivo." });
        if (k.puedeDecidir) acts = [
          { l: "Confirmar mayores", v: "action", icon: "check", onClick: () => setConf({ titulo: `Confirmar vivienda para mayores · «${p.name}»`, sub: "Sale como vivienda para mayores de 62. El dueño recibe el aviso.", cta: "Confirmar",
            plantillas: ["La declaración de vivienda para mayores está en orden.", "Es un edificio de vivienda para mayores registrado."], hacer: (m) => decidirVivienda(k.id, "confirmar", m) }) },
          { l: "No se confirma", v: "danger", icon: "close", onClick: () => setConf({ titulo: `No se confirma · «${p.name}»`, sub: "La propiedad queda oculta con el motivo hasta que el dueño la corrija o la cambie de tipo. Recibe el aviso.", peligro: true,
            plantillas: ["No hay declaración de vivienda para mayores.", "El edificio no cumple la excepción para mayores."], hacer: (m) => decidirVivienda(k.id, "rechazar", m) }) },
        ];
      } else if (v.tipo === "frases") {
        cuerpoB.push({ type: "kv", cols: 3, items: [{ k: "FRENADAS EN 30 DÍAS", v: String(v.total), fg: "var(--tl-pro-ink)" }, { k: "SE PUBLICÓ", v: "Nada" }, { k: "ADVERTENCIAS VIGENTES", v: String(v.advertencias) }] });
        cuerpoB.push({ type: "rows", k: v.total > v.frenadas.length ? `LAS ÚLTIMAS ${v.frenadas.length}` : "CADA TEXTO FRENADO", items: v.frenadas.map((x) => ({ icon: "warning", t: `«${x.frase}»${x.propiedad ? ` · ${x.propiedad}` : ""}`, s: `${x.quien} · ${fecha(x.at)} · no se guardó` })) });
        cuerpoB.push({ type: "note", tone: "info", t: "Nada de esto se publicó: el panel le dijo qué frase quitar. Si es un error de buena fe, ciérralo como revisado; si insiste en preferir o excluir a alguien por quién vive, deja una advertencia." });
        if (k.puedeDecidir) acts = [
          { l: "Advertir al negocio", v: "danger", icon: "warning", onClick: () => setConf({ titulo: "¿Qué le dices al negocio?", sub: "Queda una advertencia en el negocio y recibe el aviso con tu motivo.", cta: "Advertir", peligro: true,
            plantillas: ["Intentó varias veces preferir o excluir a personas por quién vive.", "Los anuncios no pueden decir a quién se renta por familia, origen o religión."], hacer: (m) => decidirVivienda(k.id, "advertir", m) }) },
          { l: "Revisado, sin acción", v: "secondary", icon: "check", onClick: () => setConf({ titulo: "¿Qué encontraste?", sub: "El caso se cierra; una frenada nueva abre otro.", cta: "Cerrar el caso",
            plantillas: ["Error de buena fe: lo corrigió y guardó sin la frase.", "La frase no buscaba excluir a nadie."], hacer: (m) => decidirVivienda(k.id, "revisado", m) }) },
        ];
      }
    }
    if (k.queue === "grupo" && "grupos" in k && k.grupos) {
      // 4eg · Los grupos cancelados en 90 días (cada uno con su motivo y a cuántos se les devolvió todo). Pausar quita las inscripciones
      // de su página (modules_off.svc) hasta que se reanude desde Negocios 360°.
      const g = k.grupos;
      cuerpoB.push({ type: "kv", cols: 3, items: [{ k: "EN 90 DÍAS", v: String(g.L.length), fg: "var(--tl-pro-ink)" }, { k: "PERSONAS CON DEVOLUCIÓN", v: String(g.L.reduce((a, x) => a + x.n, 0)) }, { k: "INSCRIPCIONES", v: g.pausado ? "En pausa" : "Activas" }] });
      cuerpoB.push({ type: "rows", k: "CADA GRUPO", items: g.L.map((x) => ({ icon: "users", t: `${x.svc} · ${x.label}`, s: `Empezaba el ${x.inicio} · ${x.n} inscrito${x.n === 1 ? "" : "s"} con devolución completa${x.motivo ? ` · «${x.motivo}»` : ""}` })) });
      if (k.puedeDecidir) acts = [
        ...(g.pausado ? [] : [{ l: "Pausar inscripciones", v: "danger", icon: "warning", onClick: () => setConf({ titulo: "¿Por qué se pausan las inscripciones?", sub: "Sus servicios salen de su página hasta que los reanudes desde Negocios 360°. El dueño ve el motivo en su panel. Lo ya confirmado sigue en pie.", cta: "Pausar", peligro: true,
          plantillas: ["Cancela grupos seguidos: la gente se queda sin curso.", "Anuncia cursos que no da."], hacer: (m) => decidirNoche(k.id, true, m) }) }]),
        { l: "Revisado, sin cambios", v: "secondary", icon: "check", onClick: () => setConf({ titulo: "¿Qué encontraste?", sub: "El caso se cierra; si cancela 3 grupos más en 90 días, se abre otro.", cta: "Cerrar el caso",
          plantillas: ["Cada grupo tiene una razón razonable (pocos alumnos, maestro enfermo).", "Hablamos con el lugar y lo corrigió.", "A todos se les devolvió completo."], hacer: (m) => decidirNoche(k.id, false, m) }) },
      ];
    }
    if ((k.queue === "mesa" || k.queue === "noid") && "noche" in k && k.noche) {
      // 4ne · Noche: cada noche de los últimos 30 días que cuenta para esta cola, con lo que pasó y el depósito. Pausar quita
      // mesas y lista de la página del local (modules_off.rsv) hasta que se reanude desde Negocios 360°.
      const nc = k.noche, usd = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
      const QUE = (x: (typeof nc.L)[number]) => x.det === "noid" ? "No entró: sin identificación" : x.ayuda === "mesa" ? "Ayuda: no respetaron la mesa" : x.ayuda === "lista" ? "Ayuda: no respetaron la lista" : "Canceló el local una mesa confirmada";
      cuerpoB.push({ type: "kv", cols: 3, items: [{ k: "EN 30 NOCHES", v: String(nc.L.length), fg: "var(--tl-pro-ink)" }, { k: "DEPÓSITOS QUE SE QUEDARON", v: usd(nc.L.filter((x) => x.pago === "captured" || x.pago === "partially_refunded").filter((x) => x.st === "done").reduce((a, x) => a + x.dep - x.devuelto, 0)) }, { k: "MESAS Y LISTA", v: nc.pausado ? "En pausa" : "Activas" }] });
      cuerpoB.push({ type: "rows", k: "CADA NOCHE", items: nc.L.map((x) => ({ icon: "drink", t: `${x.num} · ${x.noche} · ${x.k === "lista" ? "lista" : "mesa"} para ${x.pax}`, s: `${x.quien} · ${QUE(x)}${x.motivo ? ` · «${x.motivo}»` : ""}${x.dep ? ` · depósito ${usd(x.dep)}${x.devuelto ? ` (devuelto ${usd(x.devuelto)})` : x.pago === "captured" && x.st === "done" ? " se quedó" : ""}` : " · sin depósito"}` })) });
      if (k.puedeDecidir) acts = [
        ...(nc.pausado ? [] : [{ l: "Pausar mesas y lista", v: "danger", icon: "warning", onClick: () => setConf({ titulo: "¿Por qué se pausan mesas y lista?", sub: "Salen de su página hasta que las reanudes desde Negocios 360°. El dueño ve el motivo en su panel. Lo ya confirmado sigue en pie.", cta: "Pausar", peligro: true,
          plantillas: k.queue === "mesa" ? ["Canceló mesas confirmadas varias noches.", "Los clientes dicen que no respetan la mesa ni la lista."] : ["Marca «sin identificación» para quedarse depósitos.", "No responde a nuestras preguntas sobre la puerta."], hacer: (m) => decidirNoche(k.id, true, m) }) }]),
        { l: "Revisado, sin cambios", v: "secondary", icon: "check", onClick: () => setConf({ titulo: "¿Qué encontraste?", sub: "El caso se cierra; si vuelve a pasar 3 veces en 30 noches, se abre otro.", cta: "Cerrar el caso",
          plantillas: ["Cada caso tiene una explicación razonable.", "Hablamos con el local y lo corrigió.", "Los depósitos ya se devolvieron."], hacer: (m) => decidirNoche(k.id, false, m) }) },
      ];
    }
    if (k.queue === "renta" && "renta" in k) {
      // Daño de una renta (4f-2): la foto y el monto que mandó el negocio, el depósito retenido y el cliente que no está de
      // acuerdo. Descontar (sale del depósito; lo demás se libera) o no descontar (se libera todo, menos los días tarde).
      const r = k.renta, usd = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
      if (r) {
        cuerpoB.push({ type: "kv", cols: 3, items: [
          { k: "RENTA", v: `#${r.numero} · ${r.n.es}` }, { k: "CLIENTE", v: r.cliente }, { k: "DAÑO", v: usd(r.cents), fg: "var(--tl-pro-ink)" },
          { k: "DEPÓSITO", v: `${usd(r.dep)} retenido` }, { k: "DÍAS TARDE", v: r.late ? usd(r.late) : "No" }, { k: "ESTADO", v: r.st === "disputed" ? "Sin acuerdo" : r.st === "asked" ? "Espera al cliente" : r.st ?? "—" },
        ] });
        if (r.foto) cuerpoB.push({ type: "photos", k: "FOTO DEL DAÑO (LA MANDÓ EL NEGOCIO)", cols: 3, items: [{ key: r.foto, bg: `url("${r.foto}")`, onClick: () => window.open(r.foto!, "_blank", "noopener") }] });
        if (r.nota) cuerpoB.push({ type: "note", tone: "ink", icon: "bubble", t: `«${r.nota}»` });
        if (!k.puedeDinero) cuerpoB.push({ type: "note", tone: "warn", icon: "lock", t: "Tu rol no decide sobre dinero." });
        if (k.puedeDinero && (r.st === "disputed" || r.st === "asked")) acts = [
          { l: `Descontar ${usd(r.cents)}`, v: "action", icon: "dollar", onClick: () => setConf({ titulo: "¿Por qué se descuenta?", sub: `Sale del depósito; lo demás vuelve a su tarjeta. Los dos ven tu decisión.`, cta: "Descontar", plantillas: ["La foto muestra el daño y coincide con la herramienta.", "El cliente aceptó por teléfono.", "El daño está documentado por el negocio."], hacer: (m) => decidirRenta(k.id, true, m) }) },
          { l: "No descontar", v: "secondary", icon: "close", onClick: () => setConf({ titulo: "¿Por qué no se descuenta?", sub: "Se libera el depósito (menos los días tarde, si los hubo). Los dos ven tu decisión.", cta: "No descontar", plantillas: ["La foto no muestra un daño claro.", "El daño parece desgaste normal.", "El negocio no respondió a nuestras preguntas."], hacer: (m) => decidirRenta(k.id, false, m) }) },
        ];
      }
    }
    if (k.queue === "disputa" && "disputa" in k) {
      // Disputas con el banco (diseño «disputa»): referencia, monto, negocio, cliente, plazo del banco y motivo; la evidencia
      // que ya tenemos; Responder con evidencia / Aceptar devolución.
      const dp = k.disputa, ev = k.evidencia, dias = dp?.due ? Math.ceil((new Date(dp.due).getTime() - Date.now()) / 86_400_000) : null;
      if (dp) {
        cuerpoB.push({ type: "kv", cols: 3, items: [
          { k: "REFERENCIA", v: dp.num ? `Pedido #${dp.num}` : dp.sid }, { k: "MONTO", v: `$${(dp.amount / 100).toFixed(2)}` }, { k: "CLIENTE", v: dp.cliente ?? "—" },
          { k: "PLAZO DEL BANCO", v: dp.due ? `${new Date(dp.due).toLocaleDateString("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric" })} · ${dias! > 0 ? `${dias} días` : "vence hoy"}` : "—", fg: dias != null && dias <= 3 ? "var(--tl-danger)" : "var(--tl-pro-ink)" },
          { k: "MOTIVO", v: dp.motivo }, { k: "ESTADO", v: ({ needs_response: "Falta responder", under_review: "El banco revisa", won: "Ganada", lost: "Perdida", accepted: "Aceptada" } as Record<string, string>)[dp.status] ?? dp.status },
        ] });
        if (dp.sim) cuerpoB.push({ type: "note", tone: "info", icon: "info", t: "Sandbox: disputa simulada. No hay banco; el resultado se simula desde Transacciones." });
        if (ev) cuerpoB.push({ type: "timeline", k: "EVIDENCIA QUE TENEMOS", items: ev.lineas.map((t) => ({ t })) });
        else cuerpoB.push({ type: "note", tone: "warn", icon: "warning", t: "No encontramos el pedido de este cobro: responde con lo que sepas o acepta." });
        // 9k · Los archivos para el banco: se arman al responder (recibo en PDF, conversación sin teléfonos, constancia de entrega) y se suben por la API de
        // archivos de Stripe en el mismo envío.
        const AR = "archivos" in k ? (k.archivos as { kind: string; bytes: number; enviado: boolean }[]) : [];
        cuerpoB.push({ type: "rows", k: "ARCHIVOS PARA EL BANCO", items: (["recibo", "conversacion", "entrega"] as const).map((x) => { const f = AR.find((a) => a.kind === x);
          return { key: x, icon: x === "recibo" ? "folder" : x === "conversacion" ? "chat" : "truck", t: ({ recibo: "Recibo en PDF", conversacion: "Conversación con el cliente (PDF, sin teléfonos)", entrega: "Constancia de entrega y línea de tiempo (PDF)" } as const)[x],
            s: f ? `${Math.max(1, Math.round(f.bytes / 1024))} KB · ${f.enviado ? "enviado al banco" : "listo, sin enviar"}` : "se arma al responder", tag: f?.enviado ? "ENVIADO" : null, tone: "signal", chev: false, compact: true }; }) });
        if (!k.puedeDinero) cuerpoB.push({ type: "note", tone: "warn", icon: "lock", t: "Tu rol no decide sobre dinero." });
        if (dp.status === "needs_response" && k.puedeDinero) acts = [
          { l: "Responder con evidencia", v: "action", icon: "right", onClick: () => setConf({ titulo: "Resumen para el banco", sub: "Se envía junto con la evidencia de arriba. Escribe en inglés si puedes: lo lee el banco.", cta: "Enviar al banco",
            plantillas: ["The customer placed this order from their verified account and it was delivered as shown in the timeline.", "The customer picked up the order in person; the business confirmed the pickup at the time shown.", "We already refunded part of this order as shown; the rest was delivered as ordered."],
            hacer: (x) => decidirDisputa(k.id, "responder", x) }) },
          { l: "Aceptar devolución", v: "danger", icon: "dollar", onClick: () => setConf({ titulo: "¿Por qué se acepta?", sub: "El dinero vuelve al cliente y la disputa se cierra. No se puede deshacer.", peligro: true, cta: "Aceptar devolución",
            plantillas: ["El negocio confirmó que el pedido no se entregó.", "No tenemos evidencia suficiente.", "Cobro duplicado confirmado."], hacer: (x) => decidirDisputa(k.id, "aceptar", x) }) },
        ];
      }
    }
    if (k.queue === "chat" && "dm" in k) {
      // 5c · Mensajes entre vecinos: se leen solo con el caso y un reporte abiertos (lib/admin-dm.ts). Ocultar avisa a quien lo escribió.
      const d = k.dm, MD: Record<string, string> = { acoso: "Acoso o amenazas", spam: "Spam o ventas", priv: "Pide o comparte datos privados", otro: "Otra cosa" };
      const hace = (iso: string) => { const h = (ahora - new Date(iso).getTime()) / 3_600_000; return h < 1 ? "menos de 1 h" : h < 24 ? `${Math.floor(h)} h` : `${Math.floor(h / 24)} d`; };
      if (!d) cuerpoB.push({ type: "note", tone: "info", icon: "lock", t: "Este caso ya no tiene un reporte abierto: la conversación no se puede leer." });
      else {
        cuerpoB.push({ type: "kv", cols: 3, items: [{ k: "VECINOS", v: `${d.a.nombre} · ${d.b.nombre}` }, { k: "REPORTES", v: `${d.reportes.length}${d.reportes[0] ? ` · hace ${hace(d.reportes[0].at)}` : ""}` }, { k: "ESTADO", v: d.cerrada ? "Cerrada por un bloqueo" : "Abierta" }] });
        d.reportes.forEach((x) => cuerpoB.push({ type: "note", tone: "warn", t: `Lo reportó ${x.quien ?? "un vecino"} · ${MD[x.reason] ?? "Otra cosa"}${x.note ? ` · «${x.note}»` : ""}` }));
        cuerpoB.push({ type: "note", tone: "info", icon: "lock", t: "Ves esta conversación porque hay un reporte abierto. Al cerrar el caso deja de verse aquí." });
        cuerpoB.push({ type: "group", k: `CONVERSACIÓN · ${d.msjs.length} MENSAJES` });
        extra = <A.AdminList rows={d.msjs.map((m) => ({
          icon: "users", title: m.oculto ? `${m.t}` : m.t, sub: `${m.quien} · hace ${hace(m.at)}`, tag: m.oculto ? "OCULTO" : undefined, tone: m.oculto ? "danger" : undefined,
          actions: k.puedeDecidir && !m.oculto ? [{ label: "Ocultar", variant: "secondary", onClick: () => setConf({ titulo: "¿Por qué se oculta este mensaje?", sub: "Quien lo escribió ve el motivo. La conversación sigue.", plantillas: PLANT.hide, peligro: true, hacer: (x) => chatOcultarMensaje(k.id, m.id, x) }) }] : undefined,
        }))} />;
      }
      acts = [
        { l: "Todo bien", v: "action", icon: "check", onClick: () => setConf({ titulo: "¿Por qué está bien?", plantillas: PLANT.keep, hacer: (x) => decidirChat(k.id, "mantener", x) }) },
        { l: "Resuelto", v: "ghost", icon: "shield", onClick: () => setConf({ titulo: "¿Qué se hizo?", plantillas: ["Se ocultaron los mensajes que no cumplían las reglas.", "Se sancionó a la cuenta desde Usuarios.", "La persona ya bloqueó a quien le escribía."], hacer: (x) => decidirChat(k.id, "resuelto", x) }) },
        ...(d ? [{ l: `Ver a ${d.a.nombre.split(" ")[0]}`, v: "ghost", icon: "users", onClick: () => router.push(`/admin/usuarios/${d.a.id}?tab=comunidad`) }, { l: `Ver a ${d.b.nombre.split(" ")[0]}`, v: "ghost", icon: "users", onClick: () => router.push(`/admin/usuarios/${d.b.id}?tab=comunidad`) }] : []),
      ];
    }
    if (k.queue === "chat" && "chat" in k) {
      // Mensajes reportados (2p): el hilo se lee solo con el caso abierto. Ocultar un mensaje avisa a quien lo escribió.
      const t = k.chat, reps = k.reportesC ?? [], MC: Record<string, string> = { spam: "Spam o publicidad", off: "Ofensivo o amenaza", pii: "Pide datos o dinero", otro: "Otra cosa", compa: "Una respuesta de El Compa" };
      // 7f · Si El Compa contestó aquí (respuestas automáticas Pro del negocio): sus mensajes van marcados y se puede apagar en esta conversación
      // (o en todo el negocio, desde Negocios 360° › El Compa).
      const conCompa = !!t?.msjs.some((m) => m.compa);
      const hace = (iso: string) => { const h = (ahora - new Date(iso).getTime()) / 3_600_000; return h < 1 ? "menos de 1 h" : h < 24 ? `${Math.floor(h)} h` : `${Math.floor(h / 24)} d`; };
      cuerpoB.push({ type: "kv", cols: 3, items: [
        { k: "VECINO", v: t?.vecino ?? "—" }, { k: "CONTEXTO", v: t?.ctx?.es ?? "Consulta general" }, { k: "REPORTES", v: `${reps.length}${reps[0] ? ` · hace ${hace(reps[0].at)}` : ""}` },
      ] });
      reps.forEach((x) => cuerpoB.push({ type: "note", tone: x.by_business ? "info" : "warn", t: `${x.by_business ? "Lo reportó el negocio" : `Lo reportó ${x.quien ?? "el vecino"}`} · ${MC[x.reason] ?? "Otra cosa"}${x.note ? ` · «${x.note}»` : ""}` }));
      cuerpoB.push({ type: "note", tone: "info", icon: "lock", t: "Ves esta conversación porque hay un reporte abierto. Al cerrar el caso deja de verse aquí." });
      if (t?.bloqueado) cuerpoB.push({ type: "note", tone: "ink", icon: "ban", t: "El negocio ya bloqueó a este vecino." });
      if (conCompa) cuerpoB.push({ type: "note", tone: t?.compa_off ? "ink" : "info", icon: "help", t: t?.compa_off ? `El Compa está apagado en esta conversación: ${t.compa_off}.` : "En esta conversación contestó El Compa (respuestas automáticas del negocio, marcadas abajo como «El Compa · IA»). Si una respuesta no está bien, apágalo aquí o en todo el negocio." });
      cuerpoB.push({ type: "group", k: `CONVERSACIÓN · ${t?.msjs.length ?? 0} MENSAJES` });
      extra = t ? <A.AdminList rows={t.msjs.map((m) => ({
        icon: m.de === "user" ? "users" : m.de === "business" ? "store" : "info", title: m.de === "system" ? m.t.split(" · ")[0] : m.t,
        sub: `${m.de === "user" ? t.vecino : m.de === "business" ? `${n?.name ?? "Negocio"}${m.quien ? ` · ${m.quien}` : ""}` : m.de === "auto" ? (m.compa ? "El Compa · IA (respuesta automática del negocio)" : "Respuesta automática") : "Aviso del sistema"} · hace ${hace(m.at)}`,
        tag: m.oculto ? "OCULTO" : m.compa ? "EL COMPA" : undefined, tone: m.oculto ? "danger" : m.compa ? "action" : undefined,
        actions: k.puedeDecidir && !m.oculto && (m.de === "user" || m.de === "business") ? [{ label: "Ocultar", variant: "secondary", onClick: () => setConf({ titulo: "¿Por qué se oculta este mensaje?", sub: "Quien lo escribió ve el motivo. La conversación sigue.", plantillas: PLANT.hide, peligro: true, hacer: (x) => chatOcultarMensaje(k.id, m.id, x) }) }] : undefined,
      }))} /> : null;
      acts = [
        { l: "Todo bien", v: "action", icon: "check", onClick: () => setConf({ titulo: "¿Por qué está bien?", plantillas: PLANT.keep, hacer: (x) => decidirChat(k.id, "mantener", x) }) },
        { l: "Resuelto", v: "ghost", icon: "shield", onClick: () => setConf({ titulo: "¿Qué se hizo?", plantillas: ["Se ocultaron los mensajes que no cumplían las reglas.", "Se sancionó a la cuenta desde Usuarios.", "El negocio ya bloqueó a la persona."], hacer: (x) => decidirChat(k.id, "resuelto", x) }) },
        ...(t ? [{ l: "Ver al vecino", v: "ghost", icon: "users", onClick: () => router.push(`/admin/usuarios/${t.vecino_id}`) }] : []),
        ...(conCompa && !t?.compa_off ? [{ l: "Apagar El Compa aquí", v: "ghost", icon: "ban", onClick: () => setConf({ titulo: "¿Por qué se apaga El Compa en esta conversación?", peligro: true, sub: "El Compa deja de contestar en esta conversación; el negocio la sigue viendo y contestando como siempre. Queda en el historial.",
          plantillas: ["Contestó algo que no está en la página del negocio.", "Prometió algo que el negocio no ofrece.", "El vecino pidió hablar solo con el negocio."], hacer: (x) => compaHilo(k.id, false, x) }) }] : []),
        ...(conCompa && n ? [{ l: "El Compa en el negocio", v: "ghost", icon: "store", onClick: () => router.push(`/admin/negocios/${n.id}?tab=compa`) }] : []),
      ];
    }
    if (k.queue === "rec" && "rec" in k && k.rec) {
      const r = k.rec;
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: "CATEGORÍA", v: r.cat ?? "—" }, { k: "DÓNDE", v: r.where === "sin_local" ? "Sin local (en casa / a domicilio)" : r.address ?? "—" }, { k: "CONTACTO", v: r.contact_phone ?? "No dejó" }, { k: "CÓMO LO CONOCE", v: ({ cli: "Es cliente", fam: "Es de un familiar o amigo", mio: "Es suyo" } as Record<string, string>)[r.how_known ?? ""] ?? r.how_known ?? "—" }, { k: "CIUDAD", v: r.ciudad }, { k: "RECOMENDÓ", v: r.quien ?? "Vecino con sesión" }] });
      if (r.note) cuerpoB.push({ type: "note", tone: "ink", icon: "quote", t: `POR QUÉ LO RECOMIENDA · «${r.note}»` });
      const par = ("parecidos" in k ? k.parecidos : []).filter(Boolean) as NonNullable<Caso["negocio"]>[];
      if (par.length) {
        cuerpoB.push({ type: "group", k: "¿YA EXISTE?" });
        extra = <A.AdminList rows={par.map((p) => ({ image: p.cover ?? undefined, initials: p.cover ? undefined : p.name.slice(0, 1), title: p.name, sub: `${p.cat}${p.address ? ` · ${p.address}` : ""}`, chevron: true, onClick: () => router.push(`/admin/negocios/${p.id}`) }))} />;
      }
      acts = [
        { l: "Crear semilla", v: "action", icon: "plus", off: !r.cat, onClick: () => run(() => crearSemilla(k.id), () => ir({ caso: null })) },
        { l: "Ya existe", icon: "check", off: !par.length, onClick: () => setConf({ titulo: "¿Cuál negocio es?", sub: "La recomendación queda enlazada a ese negocio.", cta: "Guardar", elegir: { label: "ES ESTE", items: par.map((p) => ({ k: p.id, l: p.name })) }, plantillas: ["Ya estaba en To’Latino"], hacer: (_m, e) => decidirRec(k.id, "existe", "", e) }) },
        { l: "Descartar", v: "danger", icon: "close", onClick: () => setConf({ titulo: "¿Por qué se descarta?", peligro: true, hacer: (m) => decidirRec(k.id, "descartar", m) }) },
      ];
    }
    // 9n · Incidencia de entrega (k.queue === "entrega"): qué pasó, la prueba y el repartidor; «Resolver» con motivo (dlv:editar).
    if (k.queue === "entrega" && "incidencia" in k && k.incidencia) {
      const i = k.incidencia, PR: Record<string, string> = { foto: "foto", codigo: "código del cliente", negocio: "marcado por el negocio" };
      cuerpoB.push({ type: "note", tone: i.kind === "accidente" ? "danger" : "warn", icon: i.kind === "accidente" ? "warning" : "truck", t: i.nota.es });
      cuerpoB.push({ type: "rows", items: [
        { icon: "users", t: i.rep, s: "Repartidor · su 360° con entregas, incidencias y sanciones", chev: true, onClick: () => router.push(`/admin/repartidores/${i.repId}`) },
        ...(i.numero ? [{ icon: "bag", t: `Pedido #${i.numero}`, s: i.prueba ? `Prueba: ${i.prueba.split(",").map((p) => PR[p] ?? p).join(" · ")}` : "Sin prueba de entrega todavía", chev: false,
          acts: i.foto ? [{ l: "Ver foto", v: "secondary", icon: "camera", onClick: () => window.open(`/api/entrega/foto/${i.foto}`, "_blank", "noopener") }] : undefined }] : []),
      ] });
      acts = "puedeResolver" in k && k.puedeResolver ? [{ l: "Resolver", icon: "check", onClick: () => setConf({ titulo: "¿Cómo se resolvió?", cta: "Resolver",
        plantillas: ["Hablamos con el repartidor y el negocio", "La prueba de la entrega está bien", "Fue un accidente: nadie salió herido", "Se sancionó en Repartidores"],
        sub: "Queda en la auditoría. Para sancionar, abre el 360° del repartidor.", hacer: (m) => dlvResolver(i.id, m) }) }] : [];
    }
    // 5d · Casos de la Comunidad (rep de publicaciones y comentarios, repUsr, apel y fotos de la Comunidad): ./ColasComunidad.tsx.
    const com = cuerpoComunidad(k, { setConf, run, fuera: () => ir({ caso: null }), abrir: (h) => window.open(h, "_blank", "noopener"), usuario: (id) => router.push(`/admin/usuarios/${id}`), apelarDias, ahora });
    if (com) { cuerpoB.push(...com.bloques); acts = com.acts; extra = null; }
    // 6a · Eventos a revisar (k.queue === "evt"): ./ColasEventos.tsx.
    const evt = cuerpoEventos(k, { setConf, abrir: (h) => (h.startsWith("/admin/") ? router.push(h) : window.open(h, "_blank", "noopener")), negocio: (id) => router.push(`/admin/negocios/${id}`) });
    if (evt) { cuerpoB.push(...evt.bloques); acts = evt.acts; extra = null; }
    const arriba = k.queue === "medios" || ("cambio" in k && !!k.cambio);
    if (conf) return <><PanelBloques bloques={[out[0]!]} h1={22} /><ConfirmarMotivo c={conf} desk={false} onBack={() => setConf(null)} onDone={hecho} /></>;
    // 9n · Asignar este caso a alguien del equipo (quien reparte) y lo que hacen los atajos A/R.
    if (puedeRepartir) acts = [...acts, { l: k.assigned_to ? "Asignar a otra persona" : "Asignar a…", v: "secondary", icon: "users", onClick: () => asignarA([k.id]) }];
    actsRef.current = k.puedeDecidir ? acts : [];
    return (
      <>
        <PanelBloques bloques={out} h1={22} />
        {notas}
        {extra && arriba ? extra : null}
        {filaNeg}
        <PanelBloques bloques={cuerpoB} />
        {extra && !arriba ? extra : null}
        {k.queue === "sello" ? <A.AdminNote tone="ink" icon="shield">Nunca se piden documentos de identidad para el sello.</A.AdminNote> : null}
        {k.puedeDecidir ? <PanelBloques bloques={[{ type: "acts", items: acts.map((a) => ({ ...a, off: a.off || pend })) }]} /> : null}
      </>
    );
  }

  // 9n · Lote (escritorio): la barra de selección del sistema (SelectionBar) con Tomar, Asignar a… y Soltar.
  const lote: Bloque | null = !desk || !puedeAprobar ? null : sel ? { type: "bulk", t: `${sel.length} ${sel.length === 1 ? "elegido" : "elegidos"}`, allL: "Todos", onAll: () => setSel(casos.filter((x) => x.queue !== "ticket").map((x) => x.id)), onClose: () => setSel(null),
    acts: [{ l: "Tomar", icon: "check", off: !sel.length || pend, onClick: () => run(() => tomarLote(sel), () => setSel(null)) },
      ...(puedeRepartir ? [{ l: "Asignar a…", icon: "users", off: !sel.length || pend, onClick: () => asignarA(sel) }, { l: "Soltar", icon: "close", off: !sel.length || pend, onClick: () => run(() => asignarCaso(sel, null), () => setSel(null)) }] : [])] }
    : { type: "acts", items: [{ l: "Elegir varios", v: "secondary", icon: "check", onClick: () => { setSel([]); ir({ caso: null }); } }, ...(esAdmin ? [{ l: "Quién ve cada cola · feriados", v: "secondary", icon: "users", onClick: () => ir({ ajustes: "1", caso: null }) }] : [])] };
  const columnaLista = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      <PanelBloques bloques={lista} h1={desk ? 26 : 22} />
      {lote ? <PanelBloques bloques={[lote]} /> : null}
      {desk && !sel ? <A.AdminNote tone="ink" icon="info">Atajos: J siguiente · K anterior · A aprobar · R rechazar.</A.AdminNote> : null}
      {regla ? <A.AdminNote tone="ink" icon={regla.icon}>{`Plazo de esta cola: ${(cola && slas[cola]) ?? regla.sla} h${regla.regla ? ` · ${textoCola(regla.regla[0], cfgTxt)}` : ""}`}</A.AdminNote> : null}
      {casos.length ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{tarjetas}</div>
        : <PanelBloques bloques={[{ type: "empty", icon: "check", t: "Nada por aquí", s: "Esta cola está al día con los filtros que elegiste." }]} />}
    </div>
  );
  if (conf && !caso) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "COLAS", t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  // 9n · Colas › Ajustes (solo un Admin): quién ve cada cola, los plazos (en Configuración › Colas) y los feriados del equipo.
  if (ajustes) {
    const AB: Bloque[] = [{ type: "head", eye: "COLAS · AJUSTES", t: "Quién ve cada cola", s: "Además del rol, la matriz de permisos (Colas) y las ciudades de cada persona deciden. Cada cambio pide el motivo y queda en la auditoría.", onBack: () => ir({ ajustes: null }), h1: desk ? 26 : 22 },
      { type: "note", tone: "info", icon: "clock", t: "El plazo de cada cola y cuánto dura un caso tomado se cambian en Sistema › Configuración › Colas.", cta: "Ir", onCta: () => router.push("/admin/sistema/configuracion") }];
    AB.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: ORDEN_COLAS.map((q) => ({ key: q, icon: COLAS[q].icon, t: COLAS[q].es, s: `Plazo ${slas[q] ?? COLAS[q].sla} h`, chev: false,
      acts: ajustes.roles.filter((r) => r.key !== "admin").map((r) => { const on = (ajustes.vis[q] ?? []).includes(r.key); return { l: r.nombre, v: on ? "primary" : "secondary", onClick: () => setConf({ titulo: `${on ? "Quitar" : "Dar"} «${COLAS[q].es}» a ${r.nombre}`, cta: "Guardar", sub: on ? "Ese rol deja de ver esta cola (y sus casos tomados vuelven a la cola cuando venzan)." : "Ese rol empieza a ver esta cola.", plantillas: ["Cambio de responsabilidades", "Lo pidió el fundador"], hacer: (m) => colaVisibilidad(q, r.key, !on, m) }) }; }) })) });
    AB.push({ type: "group", k: "FERIADOS DEL EQUIPO · EL PLAZO DE SOPORTE NO LOS CUENTA" });
    AB.push({ type: "rows", items: ajustes.feriados.length ? ajustes.feriados.map((f) => ({ key: f.id, icon: "calendar", t: `${f.dia} · ${f.nombre}`, s: f.ciudad ?? "Todas las ciudades", chev: false,
      acts: [{ l: "Quitar", v: "secondary", onClick: () => run(() => quitarFeriadoEquipo(f.id)) }] })) : [{ icon: "calendar", t: "Sin feriados", s: "Lunes a viernes cuentan todos (Configuración › Soporte).", chev: false }] });
    AB.push({ type: "acts", items: [{ l: "Agregar un feriado", v: "secondary", icon: "plus", onClick: () => setConf({ titulo: "Feriado del equipo", cta: "Guardar", sub: "El motivo es el nombre del feriado. El plazo de Soporte no cuenta ese día.",
      valor: { k: "FECHA (AAAA-MM-DD)", ini: "", max: 10 }, elegir: { label: "DÓNDE", items: [{ k: "todas", l: "Todas las ciudades" }, ...ajustes.ciudades.map((c) => ({ k: c.id, l: c.nombre }))] },
      plantillas: ["Navidad", "Año Nuevo", "Día de Acción de Gracias", "Día de la Independencia"], hacer: (m, e, v) => feriadoEquipo(v, e === "todas" ? null : e, m) }) }] });
    return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={AB} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
  }
  return (
    <>
      {caso && !lado ? (
        desk ? (
          <>{columnaLista}
            <div onClick={() => ir({ caso: null })} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(11,14,18,.45)", display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 70 }}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: 600, maxHeight: "86vh", overflowY: "auto", padding: 18, borderRadius: 24, background: "var(--tl-white)", display: "flex", flexDirection: "column", gap: 14 }}>{detalle}</div>
            </div>
          </>
        ) : <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{detalle}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: lado && caso ? "minmax(0,1fr) 400px" : "minmax(0,1fr)", gap: 24, alignItems: "start" }}>
          {columnaLista}
          {lado && caso ? <aside style={{ position: "sticky", top: 76, maxHeight: "calc(100vh - 92px)", overflowY: "auto", padding: 16, borderRadius: 22, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ font: "700 9.5px 'JetBrains Mono',monospace", letterSpacing: ".14em", color: "rgba(11,14,18,.45)" }}>CASO</span>
              <span role="button" aria-label="Cerrar" onClick={() => ir({ caso: null })} {...tec(() => ir({ caso: null }))} style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(11,14,18,.05)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono name="close" size={15} /></span></div>
            {detalle}</aside> : null}
        </div>
      )}
      <Toast t={toast} desk={desk} />
    </>
  );
}
