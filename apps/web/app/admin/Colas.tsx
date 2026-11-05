"use client";
/* ADM-COLAS (Super Admin.dc.html secColas / qDetail): todo lo que espera una decisión de una persona. Lista de
   QueueCard (la más vieja contra su plazo primero), detalle al lado (≥ 1200) o a pantalla completa, confirmación con
   motivo (ReasonConfirm). El servidor decide qué ve y qué puede decidir cada quien. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type ComponentType, type ReactNode } from "react";
import type { Caso, CasoLista } from "@/lib/admin-colas";
import { COLAS, type Cola } from "@/lib/colas";
import { crearSemilla, decidirLicencia, decidirMedios, decidirNuevo, decidirRec, decidirReclamo, decidirSello, tomarCaso, tomarSiguiente, type ResAdm } from "./acciones-colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"QueueCard" | "AdminNote" | "AdminList" | "ReasonConfirm" | "Button", ComponentType<any>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Icono = UI.Icon as ComponentType<any>;
const PLANT = {
  selloNo: ["La dirección no coincide con la página", "No pudimos confirmar que representas el negocio", "Las fotos no son del local", "El nombre puede confundirse con otro negocio"],
  selloInfo: ["Mándanos una foto de la fachada con el letrero", "Confírmanos el teléfono fijo del local", "Dinos en qué horario podemos llamar"],
  biz: ["Varios reportes coinciden", "El negocio no responde a To’Latino", "Datos de contacto falsos", "Se resolvió con el dueño"],
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
    const titulo = k.queue === "cambio" ? `Reclamo · ${n?.name ?? ""}` : k.queue === "lic" ? `Licencia · ${n?.name ?? ""}` : k.queue === "sello" ? `Sello · ${n?.name ?? ""}` : k.queue === "nuevo" ? n?.name ?? "" : k.queue === "medios" ? `Foto marcada · ${n?.name ?? ""}` : k.queue === "rec" && "rec" in k ? k.rec?.business_name ?? "" : "";
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
    if (conf) return <><PanelBloques bloques={[out[0]!]} h1={22} /><ConfirmarMotivo c={conf} desk={false} onBack={() => setConf(null)} onDone={hecho} /></>;
    return (
      <>
        <PanelBloques bloques={out} h1={22} />
        {notas}
        {extra && k.queue === "medios" ? extra : null}
        {filaNeg}
        <PanelBloques bloques={cuerpoB} />
        {extra && k.queue !== "medios" ? extra : null}
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
