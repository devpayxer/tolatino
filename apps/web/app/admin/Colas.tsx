"use client";
/* ADM-COLAS (Super Admin.dc.html secColas / qDetail): todo lo que espera una decisión de una persona. Lista de
   QueueCard (la más vieja contra su plazo primero), detalle al lado (≥ 1200) o a pantalla completa, confirmación con
   motivo (ReasonConfirm). El servidor decide qué ve y qué puede decidir cada quien. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type ComponentType, type ReactNode } from "react";
import type { Caso, CasoLista } from "@/lib/admin-colas";
import { AYUDA_DE, COLAS, MOTIVO_RESENA, type Cola } from "@/lib/colas";
import { motivoAyuda, quiereAyuda } from "@/lib/ayuda-motivos";
import { crearSemilla, decidirCambio, decidirLicencia, decidirMedios, decidirNuevo, decidirRec, decidirReclamo, decidirRep, decidirSop, decidirSello, tomarCaso, tomarSiguiente, chatOcultarMensaje, decidirChat, decidirDisputa, decidirRenta, decidirNoche, decidirEstafa, pausaEstafa, type ResAdm, verNinoCaso } from "./acciones-colas";

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

export type Confirmar = { titulo: string; sub?: string; plantillas?: string[]; peligro?: boolean; cta?: string; elegir?: { label: string; items: { k: string; l: string }[] }; valor?: { k: string; ini: string; area?: boolean; max: number }; hacer: (motivo: string, elegido: string | null, valor: string) => Promise<ResAdm> };

/* Confirmación con motivo (patrón 2ao): ReasonConfirm, con elección y, si hace falta, el campo del valor nuevo. */
export function ConfirmarMotivo({ c, onBack, onDone, desk }: { c: Confirmar; onBack: () => void; onDone: (r: ResAdm) => void; desk: boolean }) {
  const [motivo, setMotivo] = useState(""), [elegido, setElegido] = useState<string | null>(null), [valor, setValor] = useState(c.valor?.ini ?? "");
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


export function Colas({ casos, conteo, vencidos, total, visibles, caso, puedeAprobar }: {
  casos: CasoLista[]; conteo: Record<string, number>; vencidos: number; total: number; visibles: Cola[]; caso: Caso | null; puedeAprobar: boolean;
}) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams();
  const w = useAncho(), desk = w >= 1024, lado = w >= 1200;
  const [toast, setToast] = useToast();
  const [conf, setConf] = useState<Confirmar | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [pend, start] = useTransition();
  useEffect(() => { setConf(null); setChecks({}); }, [caso?.id]);
  const ir = (p: Record<string, string | null>) => { const q = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v === null) q.delete(k); else q.set(k, v); } router.push(`${path}${q.size ? `?${q}` : ""}`, { scroll: false }); };
  const cola = (sp.get("cola") as Cola | null) ?? null, filtro = sp.get("f");
  const run = (f: () => Promise<ResAdm>, after?: (r: ResAdm) => void) => start(async () => { const r = await f(); setToast(r.mensaje ?? (r.ok ? "Listo. Quedó en la auditoría." : "")); if (r.ok) { after?.(r); router.refresh(); } });
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); ir({ caso: null }); router.refresh(); };

  const lista: (Bloque | null)[] = [
    { type: "head", eye: `${total} CASOS · ${vencidos} VENCIDOS`, t: "Colas", s: "Todo lo que espera una decisión de una persona. La más vieja contra su plazo va primero.",
      act: puedeAprobar ? { l: "Tomar siguiente", v: "action", icon: "check", onClick: () => run(tomarSiguiente, (r) => { if (r.ok && r.caso) ir({ caso: r.caso }); }) } : undefined, h1: desk ? 26 : 22 },
    { type: "tabs", items: [{ l: "Todas", n: String(total || ""), on: !cola, onClick: () => ir({ cola: null, caso: null }) }, ...visibles.filter((k) => conteo[k]).map((k) => ({ l: COLAS[k].es, n: String(conteo[k]), on: cola === k, onClick: () => ir({ cola: k, caso: null }) }))] },
    { type: "chips", items: [["mios", "Míos"], ["sin", "Sin asignar"], ["venc", "Vencidos"]].map(([k, l]) => ({ l: l!, v: filtro === k ? "selected" : "filter", onClick: () => ir({ f: filtro === k ? null : k! }) })) },
  ];
  const regla = cola ? COLAS[cola] : null;
  const ancho = desk && !(lado && caso);
  const tarjetas = casos.map((x) => (
    <A.QueueCard key={x.id} icon={COLAS[x.queue].icon} state={x.esp.state} title={x.title} sub={x.sub} meta={COLAS[x.queue].es}
      priority={x.priority === "alta" ? "ALTA" : undefined} who={x.who} sla={x.esp.label} assignee={x.assignee ? { name: x.assignee } : undefined}
      wide={ancho} columns={ancho ? "40px minmax(0,1.6fr) minmax(0,1fr) auto" : "40px minmax(0,1fr) auto"} active={caso?.id === x.id} onClick={() => ir({ caso: x.id })} />));

  const detalle = caso ? cuerpo() : null;
  function cuerpo(): ReactNode {
    const k = caso!, Q = COLAS[k.queue], n = k.negocio, out: (Bloque | null)[] = [];
    const titulo = k.queue === "cambio" && "cambio" in k && k.cambio ? `${k.cambio.type === "deleteUser" ? "Borrar cuenta" : "Cambio sensible"} · ${k.cambio.nombre ?? k.cambio.phone}` : k.queue === "cambio" ? `Reclamo · ${n?.name ?? ""}` : k.queue === "lic" ? `Licencia · ${n?.name ?? ""}` : k.queue === "sello" ? `Sello · ${n?.name ?? ""}` : k.queue === "nuevo" ? n?.name ?? "" : k.queue === "medios" ? `Foto marcada · ${n?.name ?? ""}` : k.queue === "cuidado" ? `Cuidado de niños · ${n?.name ?? ""}` : k.queue === "salir" ? `No le dejan cancelar · ${n?.name ?? ""}` : k.queue === "grupo" ? `Grupos que no abrieron · ${n?.name ?? ""}` : k.queue === "plantones" ? `Plantones · ${n?.name ?? ""}` : k.queue === "estafa" ? `Posible estafa · ${n?.name ?? ""}` : k.queue === "sop" ? `${AYUDA_DE["ayuda" in k && k.ayuda ? k.ayuda.k : "order"] ?? "Ayuda con un pedido"} · ${n?.name ?? ""}` : k.queue === "mesa" ? `Mesas no respetadas · ${n?.name ?? ""}` : k.queue === "noid" ? `Sin identificación · ${n?.name ?? ""}` : k.queue === "rep" ? `Reseña reportada · ${n?.name ?? ""}` : k.queue === "rec" && "rec" in k ? k.rec?.business_name ?? "" : "";
    out.push({ type: "head", eye: `${Q.es.toUpperCase()} · ${k.esp.r >= 1 ? `${k.esp.t} · VENCIDO` : `${k.esp.t} esperando`}`, t: titulo, h1: 22, onBack: lado ? undefined : () => ir({ caso: null }) });
    if (k.status !== "open") return <><PanelBloques bloques={[out[0]!, { type: "empty", icon: "check", t: "Ya se decidió", s: "Este caso salió de la cola." }]} /></>;
    const notas: ReactNode[] = [];
    if (k.assigned_to && !k.mine) notas.push(<A.AdminNote key="a" tone="warn" icon="users" cta={k.puedeDecidir ? "Tomarlo" : undefined} onCta={() => run(() => tomarCaso(k.id))}>{`Lo está viendo ${k.assignee ?? "otra persona"}.`}</A.AdminNote>);
    else if (!k.assigned_to && k.puedeDecidir) notas.push(<A.AdminNote key="a" tone="info" icon="users" cta="Tomar" onCta={() => run(() => tomarCaso(k.id))}>Sin asignar. Tómalo para que nadie más lo trabaje.</A.AdminNote>);
    if (!k.puedeDecidir) notas.push(<A.AdminNote key="p" tone="warn" icon="lock">Tu rol solo puede ver esta cola.</A.AdminNote>);
    const filaNeg = n ? <A.AdminList key="n" rows={[{ image: n.cover ?? undefined, initials: n.cover ? undefined : n.name.slice(0, 1), title: n.name, sub: `${n.cat} · ${n.plan === "pro" ? "Pro" : "Free"}${n.verified ? " · Verificado" : ""}`, chevron: true, onClick: () => router.push(`/admin/negocios/${n.id}`) }]} /> : null;
    const cuerpoB: (Bloque | null)[] = [];
    let acts: { l: string; v?: string; icon?: string; off?: boolean; onClick: () => void }[] = [];
    let extra: ReactNode = null;
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
      const diasAviso = c.notified ? Math.floor((Date.now() - new Date(c.notified).getTime()) / 86_400_000) : null;
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
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: "LO PIDIÓ", v: c.quien ?? "Equipo" }, { k: "AFECTA A", v: "La cuenta y todo lo suyo" }, { k: "PEDIDO", v: `#${c.id}` }, { k: "NEGOCIOS DE LOS QUE ES DUEÑA", v: String(c.negocios) }] });
      cuerpoB.push({ type: "note", tone: "ink", icon: "quote", t: `MOTIVO · «${c.reason}»` });
      cuerpoB.push({ type: "note", tone: "info", t: "Al aplicarlo hay 30 días de gracia para restaurarla. Después se borra todo, también sus transacciones; los pagos con tarjeta quedan solo en Stripe." });
      if (c.mio) cuerpoB.push({ type: "note", tone: "warn", icon: "lock", t: "Lo pediste tú: lo aplica otra persona del equipo." });
      acts = c.mio ? [] : [
        { l: "Aplicar cambio", v: "action", icon: "check", onClick: () => setConf({ titulo: "Confirmar el borrado", sub: "La cuenta no puede entrar desde ahora y tiene 30 días de gracia. Queda en la auditoría.", cta: "Aplicar", peligro: true, hacer: (m) => decidirCambio(k.id, true, m) }) },
        { l: "Rechazar", v: "danger", icon: "close", onClick: () => setConf({ titulo: "¿Por qué no se aplica?", hacer: (m) => decidirCambio(k.id, false, m) }) },
      ];
    }
    if (k.queue === "lic" && "licencia" in k && k.licencia && n) {
      const l = k.licencia, est = ({ valid: ["Verificada", "var(--tl-open-text)"], expired: ["Vencida", "var(--tl-danger)"], not_found: ["No aparece", "var(--tl-danger)"], revoked: ["No aparece", "var(--tl-danger)"] } as Record<string, [string, string]>)[l.status] ?? ["Por verificar", "var(--tl-pro-ink)"];
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: "LICENCIA", v: l.title }, { k: "PUEDE", v: l.can }, { k: "NÚMERO", v: l.number ? `${l.label} ${l.number}` : "No lo dio" }, { k: "ESTADO HOY", v: est[0], fg: est[1] }, { k: "ÚLTIMA REVISIÓN", v: l.checked ? new Date(l.checked).toLocaleDateString("es-US", { day: "numeric", month: "short", year: "numeric" }) : "—" }, { k: "REGISTRO", v: l.site }] });
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
      cuerpoB.push({ type: "kv", cols: 2, items: [{ k: "SOLICITUD", v: h.number }, { k: h.k === "visit" ? "VISITA" : h.k === "market_order" ? "PEDIDO" : h.k === "hold" ? "APARTADO" : h.k === "party" ? "FIESTA" : h.k === "trip" ? "VIAJE" : h.k === "night" ? "NOCHE" : h.k === "enrollment" ? "INSCRIPCIÓN" : "CITA", v: `${h.num}${h.svc ? ` · ${h.svc}` : ""}${h.k === "visit" ? "" : ` · ${usd(h.total)}`}` }, { k: "CLIENTE", v: h.quien }, { k: "QUÉ PASÓ", v: motivoAyuda(h.reason, h.k === "market_order" ? "merc" : h.k === "hold" ? "tienda" : h.rub)[0] },
        { k: "QUÉ QUIERE", v: `${quiereAyuda(h.wants)[0]}${h.amount ? ` · ${usd(h.amount)}` : ""}` }, { k: "DEVOLVIBLE A LA TARJETA", v: h.pago ? `${usd(h.pago)} (${h.k === "trip" ? "el viaje" : "depósito"})` : h.rub === "salud" || h.rub === "pro" || h.rub === "fe" || h.rub === "inm" || h.rub === "dealer" ? "Nada: no se cobra en la app" : "Nada: pagó en el local" }] });
      if (h.body) cuerpoB.push({ type: "note", tone: "ink", icon: "quote", t: `LO QUE CUENTA · «${h.body}»` });
      if (h.fotos.length) cuerpoB.push({ type: "photos", k: "SUS FOTOS", cols: 4, items: h.fotos.map((u) => ({ bg: `url(${u})`, key: u, onClick: () => window.open(u, "_blank", "noopener") })) });
      cuerpoB.push(h.reply ? { type: "note", tone: "info", icon: "chat", t: `RESPUESTA DEL NEGOCIO · ${DEC[h.decision ?? ""] ?? "Respondió"} · «${h.reply}»${h.escalated_by === "user" ? " · el cliente pidió que lo revisemos" : ""}` } : k.queue === "estafa" || (h.escalated_by === "system" && k.queue !== "sop") ? { type: "note", tone: "warn", icon: "warning", t: "Vino directo a To'Latino: no espera al negocio." } : { type: "note", tone: "warn", icon: "clock", t: "El negocio no respondió en 24 horas." });
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
        { l: "Resolver con un mensaje", v: "action", icon: "check", onClick: () => setConf({ titulo: "Tu respuesta al cliente", sub: "La ve en su cita; el negocio la ve en su panel. Queda en la auditoría.", cta: "Resolver", plantillas: plant, hacer: (m) => decidirSop(k.id, m) }) },
        ...(dinero && h.pago > 0 ? [{ l: "Resolver y devolver", v: "secondary", icon: "card", onClick: () => { const clave = crypto.randomUUID(); setConf({ titulo: `Resolver y devolver · cita ${h.num}`, cta: "Resolver y devolver", peligro: true,
          sub: `Hasta ${usd(h.pago)} (el depósito pagado en la app). Vuelve a su tarjeta en 3 a 5 días hábiles; la comisión baja en proporción.`,
          valor: { k: "MONTO EN DÓLARES", ini: ((Math.min(h.amount ?? h.pago, h.pago)) / 100).toFixed(2), max: 8 }, plantillas: plant, hacer: (m, _e, v) => decidirSop(k.id, m, v, clave) }); } }] : []),
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
      acts = [
        { l: "Resolver con un mensaje", v: "action", icon: "check", onClick: () => setConf({ titulo: "Tu respuesta al cliente", sub: "La ve en su pedido; el negocio la ve en su panel. Queda en la auditoría.", cta: "Resolver",
          plantillas: ["Hablamos con el negocio: te reponen lo que faltó.", "Hablamos con el negocio: te devuelven lo de esos platos en el local.", "Gracias por avisar. Se lo dijimos al negocio para que no vuelva a pasar."],
          hacer: (m) => decidirSop(k.id, m) }) },
        { l: "Ver el cliente", icon: "users", onClick: () => router.push(`/admin/usuarios/${h.uid}`) },
      ];
    }
    if (k.queue === "rep" && "resena" in k) {
      // Reportes de contenido · reseña (adm-data · rep): la cita, quién reportó, cuántos y hace cuánto; sigue visible mientras se decide.
      const r = k.resena, reps = k.reportesR ?? [], hace = (iso: string) => { const h = (Date.now() - new Date(iso).getTime()) / 3_600_000; return h < 1 ? "menos de 1 h" : h < 24 ? `${Math.floor(h)} h` : `${Math.floor(h / 24)} d`; };
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
    if (k.queue === "chat" && "chat" in k) {
      // Mensajes reportados (2p): el hilo se lee solo con el caso abierto. Ocultar un mensaje avisa a quien lo escribió.
      const t = k.chat, reps = k.reportesC ?? [], MC: Record<string, string> = { spam: "Spam o publicidad", off: "Ofensivo o amenaza", pii: "Pide datos o dinero", otro: "Otra cosa" };
      const hace = (iso: string) => { const h = (Date.now() - new Date(iso).getTime()) / 3_600_000; return h < 1 ? "menos de 1 h" : h < 24 ? `${Math.floor(h)} h` : `${Math.floor(h / 24)} d`; };
      cuerpoB.push({ type: "kv", cols: 3, items: [
        { k: "VECINO", v: t?.vecino ?? "—" }, { k: "CONTEXTO", v: t?.ctx?.es ?? "Consulta general" }, { k: "REPORTES", v: `${reps.length}${reps[0] ? ` · hace ${hace(reps[0].at)}` : ""}` },
      ] });
      reps.forEach((x) => cuerpoB.push({ type: "note", tone: x.by_business ? "info" : "warn", t: `${x.by_business ? "Lo reportó el negocio" : `Lo reportó ${x.quien ?? "el vecino"}`} · ${MC[x.reason] ?? "Otra cosa"}${x.note ? ` · «${x.note}»` : ""}` }));
      cuerpoB.push({ type: "note", tone: "info", icon: "lock", t: "Ves esta conversación porque hay un reporte abierto. Al cerrar el caso deja de verse aquí." });
      if (t?.bloqueado) cuerpoB.push({ type: "note", tone: "ink", icon: "ban", t: "El negocio ya bloqueó a este vecino." });
      cuerpoB.push({ type: "group", k: `CONVERSACIÓN · ${t?.msjs.length ?? 0} MENSAJES` });
      extra = t ? <A.AdminList rows={t.msjs.map((m) => ({
        icon: m.de === "user" ? "users" : m.de === "business" ? "store" : "info", title: m.de === "system" ? m.t.split(" · ")[0] : m.t,
        sub: `${m.de === "user" ? t.vecino : m.de === "business" ? `${n?.name ?? "Negocio"}${m.quien ? ` · ${m.quien}` : ""}` : m.de === "auto" ? "Respuesta automática" : "Aviso del sistema"} · hace ${hace(m.at)}`,
        tag: m.oculto ? "OCULTO" : undefined, tone: m.oculto ? "danger" : undefined,
        actions: k.puedeDecidir && !m.oculto && (m.de === "user" || m.de === "business") ? [{ label: "Ocultar", variant: "secondary", onClick: () => setConf({ titulo: "¿Por qué se oculta este mensaje?", sub: "Quien lo escribió ve el motivo. La conversación sigue.", plantillas: PLANT.hide, peligro: true, hacer: (x) => chatOcultarMensaje(k.id, m.id, x) }) }] : undefined,
      }))} /> : null;
      acts = [
        { l: "Todo bien", v: "action", icon: "check", onClick: () => setConf({ titulo: "¿Por qué está bien?", plantillas: PLANT.keep, hacer: (x) => decidirChat(k.id, "mantener", x) }) },
        { l: "Resuelto", v: "ghost", icon: "shield", onClick: () => setConf({ titulo: "¿Qué se hizo?", plantillas: ["Se ocultaron los mensajes que no cumplían las reglas.", "Se sancionó a la cuenta desde Usuarios.", "El negocio ya bloqueó a la persona."], hacer: (x) => decidirChat(k.id, "resuelto", x) }) },
        ...(t ? [{ l: "Ver al vecino", v: "ghost", icon: "users", onClick: () => router.push(`/admin/usuarios/${t.vecino_id}`) }] : []),
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
    const arriba = k.queue === "medios" || ("cambio" in k && !!k.cambio);
    if (conf) return <><PanelBloques bloques={[out[0]!]} h1={22} /><ConfirmarMotivo c={conf} desk={false} onBack={() => setConf(null)} onDone={hecho} /></>;
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

  const columnaLista = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      <PanelBloques bloques={lista} h1={desk ? 26 : 22} />
      {regla ? <A.AdminNote tone="ink" icon={regla.icon}>{`Plazo de esta cola: ${regla.sla} h${regla.regla ? ` · ${regla.regla[0]}` : ""}`}</A.AdminNote> : null}
      {casos.length ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{tarjetas}</div>
        : <PanelBloques bloques={[{ type: "empty", icon: "check", t: "Nada por aquí", s: "Esta cola está al día con los filtros que elegiste." }]} />}
    </div>
  );
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
              <span role="button" aria-label="Cerrar" onClick={() => ir({ caso: null })} style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(11,14,18,.05)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono name="close" size={15} /></span></div>
            {detalle}</aside> : null}
        </div>
      )}
      <Toast t={toast} desk={desk} />
    </>
  );
}
