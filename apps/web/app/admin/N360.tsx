"use client";
/* ADM-NEG · 360° (Super Admin.dc.html negDetail): el negocio como lo ve el cliente, como lo edita el dueño y lo que
   hizo el equipo. Pestañas de la Fase 1: Resumen, Ficha, Equipo, Confianza (Lo que vende, Operación, Dinero y
   Contenido llegan con sus módulos). Cada acción pide motivo y queda en la auditoría. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentType, type ReactNode } from "react";
import type { Negocio360 } from "@/lib/admin-negocios";
import { fmtHora } from "@/lib/panel-reglas";
import { cambiarEstado, cierreTemporal, editarCampo, foto, nota, reabrir, restaurar, sello, staffPagina } from "./acciones-negocios";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminNote" | "AdminList" | "AuditLog" | "HBars" | "Icon", ComponentType<any>>;
const BIZ = ["Varios reportes coinciden", "El negocio no responde a To’Latino", "Datos de contacto falsos", "Se resolvió con el dueño"];
const FOTO = ["No es de este negocio", "Contenido inapropiado", "Muestra datos personales", "Es publicidad o spam"];
const SELLO_NO = ["La dirección no coincide con la página", "No pudimos confirmar que representas el negocio", "Las fotos no son del local", "El nombre puede confundirse con otro negocio"];
/* Verbo de cada acción en el historial (prototipo actL). */
const VERBO: Record<string, string> = {
  "negocio.ocultar": "ocultó", "negocio.suspender": "suspendió", "negocio.cerrar": "cerró", "negocio.restaurar": "restauró", "negocio.cierre_temporal": "cerró temporalmente",
  "negocio.reabrir": "reabrió", "negocio.sello.dar": "dio el sello a", "negocio.sello.quitar": "quitó el sello a", "negocio.sello.aprobar": "aprobó el sello de",
  "negocio.sello.pedir_dato": "pidió un dato a", "negocio.sello.rechazar": "no aprobó el sello de", "negocio.editar": "editó", "negocio.foto.quitar": "quitó una foto de",
  "negocio.foto.restaurar": "restauró una foto de", "negocio.staff.quitar": "quitó de la página a alguien de", "negocio.staff.mostrar": "volvió a mostrar a alguien de",
  "negocio.nota": "agregó una nota a", "negocio.revisado": "revisó",
};
const DIAS = [["Lunes", 1], ["Martes", 2], ["Miércoles", 3], ["Jueves", 4], ["Viernes", 5], ["Sábado", 6], ["Domingo", 0]] as const;
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-US", { day: "numeric", month: "short", year: "numeric" }) : "—");
const hace = (iso: string) => { const h = (Date.now() - new Date(iso).getTime()) / 3_600_000; return h < 1 ? "hace un momento" : h < 24 ? `hace ${Math.floor(h)} h` : `hace ${Math.floor(h / 24)} d`; };
const val = (x: unknown) => (x && typeof x === "object" ? Object.values(x as Record<string, unknown>).filter((v) => typeof v === "string" || typeof v === "number").join(" · ") : String(x ?? "—"));

export function N360({ n, tab }: { n: Negocio360; tab: string }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [toast, setToast] = useToast();
  const [conf, setConf] = useState<Confirmar | null>(null);
  const [pend] = useTransition();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const P = n.puede, ir = (t: string) => router.push(`/admin/negocios/${n.id}${t === "resumen" ? "" : `?tab=${t}`}`, { scroll: false });
  const malo = ["oculto", "susp", "cerrado"].includes(n.estado);
  const stL = n.estado === "susp" ? "SUSPENDIDO" : n.estado === "oculto" ? "OCULTO" : n.estado === "cerrado" ? "CERRADO" : n.plan === "pro" ? (n.verified ? "PRO · VERIFICADO" : "PRO · SIN SELLO") : "FREE";
  const casosAbiertos = n.casos.filter((c) => c.status === "open");
  const cab: (Bloque | null)[] = [
    { type: "hero", t: n.name, s: `${n.cat}${n.subs ? ` · ${n.subs}` : ""} · ${n.ciudad}`, ph: n.fotos[0]?.status === "visible" ? `url("${n.fotos[0].url}")` : "", ini: n.fotos[0]?.status === "visible" ? "" : n.name.slice(0, 1),
      st: stL, stFg: malo ? "var(--tl-pro)" : "var(--tl-signal)", stDot: malo ? "var(--tl-pro)" : "var(--tl-signal)", kn: desk ? 4 : 2,
      kpis: [
        { v: n.reviews ? `${n.rating?.toFixed(1) ?? "—"} ★` : "Nuevo", k: `${n.reviews} RESEÑAS` },
        { v: String(n.cifras.v30), k: "VISTAS · 30 D" },
        { v: String(n.cifras.c30), k: "CONTACTOS · 30 D" },
        { v: n.mi != null ? `${n.mi} mi` : "—", k: "DEL CENTRO" },
      ],
      acts: n.status === "active" ? [{ l: "Ver como cliente", icon: "search", onClick: () => window.open(`/n/${n.id}`, "_blank") }] : [] },
  ];
  const notasEstado: ReactNode[] = [];
  if (malo) notasEstado.push(<A.AdminNote key="e" tone="bad" icon="ban" cta={P.retirar ? "Restaurar" : undefined} onCta={() => setConf({ titulo: "¿Por qué se restaura?", hacer: (m) => restaurar(n.id, m) })}>
    {`${n.estado === "cerrado" ? "Cerrado" : n.estado === "susp" ? "Suspendido" : "Oculto"}: ${n.status_reason ?? "sin motivo"} · No sale en búsquedas ni en la categoría; el dueño ve el motivo en su panel.`}</A.AdminNote>);
  else if (n.temp_until && new Date(n.temp_until).getTime() > Date.now()) notasEstado.push(<A.AdminNote key="t" tone="warn" icon="clock" cta={P.editar ? "Reabrir" : undefined} onCta={() => setConf({ titulo: "¿Por qué se reabre?", hacer: (m) => reabrir(n.id, m) })}>
    {`Cerrado temporalmente hasta el ${fecha(n.temp_until)}: ${n.temp_reason ?? ""}. La ficha dice «Cerrado temporalmente».`}</A.AdminNote>);
  const tabs: Bloque = { type: "tabs", items: [["resumen", "Resumen"], ["ficha", "Ficha"], ["equipo", "Equipo"], ["confianza", "Confianza"]].map(([k, l]) => ({ l: l!, n: k === "confianza" && casosAbiertos.length ? String(casosAbiertos.length) : undefined, on: tab === k, onClick: () => ir(k!) })) };

  const historial = (filtro?: (a: string) => boolean): ReactNode => {
    const h = n.historial.filter((x) => !filtro || filtro(x.action));
    return h.length ? <A.AuditLog rows={h.map((x) => ({ who: x.quien ?? "Equipo", initials: (x.quien ?? "E").slice(0, 1), action: `${VERBO[x.action] ?? x.action} ${n.name}`, before: val(x.before), after: val(x.after), why: x.reason ?? undefined, when: hace(x.at) }))} />
      : <A.AdminNote tone="info" icon="folder">Nadie del equipo ha hecho cambios aquí todavía.</A.AdminNote>;
  };

  let cuerpo: ReactNode;
  if (tab === "ficha") {
    const vis = n.fotos.filter((f) => f.status === "visible"), quit = n.fotos.filter((f) => f.status !== "visible");
    const campo = (k: "name" | "about" | "phone" | "address", t: string, v: string, area = false) => ({
      icon: "edit", title: t, sub: v || "—", tag: n.admin_edits?.[k] ? "EDITADO POR TO’LATINO" : undefined, tone: "action",
      actions: P.editar ? [{ label: "Editar", variant: "secondary", onClick: () => setConf({ titulo: `Editar en nombre del negocio · ${t}`, sub: "El dueño ve el cambio y el motivo en su panel. Queda en el historial.", cta: "Guardar", valor: { k: `NUEVO VALOR · ${t.toUpperCase()}`, ini: v, area, max: k === "about" ? 300 : k === "address" ? 160 : 80 }, hacer: (m, _e, valor) => editarCampo(n.id, k, valor, m) }) }] : undefined,
    });
    cuerpo = (
      <>
        <A.AdminNote tone="info" icon="store">Así lo ve el cliente y así lo edita el negocio. Si editas en su nombre, queda en el historial y el dueño lo ve en su panel.</A.AdminNote>
        {vis[0] ? <div style={{ height: 220, borderRadius: 18, backgroundImage: `url("${vis[0].url}")`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "var(--tl-photo-bg)" }} /> : null}
        <A.AdminList label={`FOTOS DEL NEGOCIO · ${vis.length}${quit.length ? ` · ${quit.length} QUITADAS` : ""}`} rows={n.fotos.map((f, i) => ({
          image: f.url, imageSize: 52, title: f.status === "visible" ? (i === 0 ? "Portada" : `Foto ${i + 1}`) : "Foto", sub: f.status === "visible" ? "La sube el negocio" : `Quitada: ${f.removed_note ?? ""}`,
          tag: f.status !== "visible" ? "QUITADA" : undefined, tone: "danger",
          actions: P.retirar ? (f.status === "visible" ? (vis.length > 1 ? [{ label: "Quitar", variant: "danger", onClick: () => setConf({ titulo: "¿Por qué se quita esta foto?", plantillas: FOTO, peligro: true, hacer: (m) => foto(n.id, f.id, true, m) }) }] : [])
            : [{ label: "Restaurar", variant: "secondary", onClick: () => setConf({ titulo: "¿Por qué vuelve esta foto?", plantillas: ["No rompe las reglas del barrio", "El reporte no trae evidencia"], hacer: (m) => foto(n.id, f.id, false, m) }) }]) : undefined,
        }))} />
        {vis.length === 1 ? <A.AdminNote tone="info" icon="image">Es la única foto visible: para quitarla, pide al dueño que suba otra.</A.AdminNote> : null}
        <A.AdminList label="LO QUE VE EL CLIENTE" rows={[campo("name", "Nombre", n.name), campo("about", "Quiénes somos", n.about?.es ?? "", true), { icon: "grid", title: "Categoría y subcategorías", sub: `${n.cat}${n.subs ? ` · ${n.subs}` : ""}` }, campo("phone", "Teléfono", n.phone), campo("address", "Dirección", n.address ?? "")]} />
        <PanelBloques bloques={[{ type: "group", k: "HORARIO" }, { type: "kv", cols: 2, items: DIAS.map(([d], i) => { const x = n.horas[i]!; return { k: d.toUpperCase(), v: x.on ? `${fmtHora(x.a)} – ${fmtHora(x.b)}${x.two ? ` · ${fmtHora(x.a2)} – ${fmtHora(x.b2)}` : ""}` : "Cerrado", fg: x.on ? undefined : "rgba(11,14,18,.45)" }; }) }]} />
      </>);
  } else if (tab === "equipo") {
    const dueño = n.equipo.find((m) => m.kind === "owner"), staff = n.equipo.filter((m) => m.kind !== "owner");
    cuerpo = (
      <>
        {dueño ? <A.AdminList label="CUENTAS CON ACCESO AL PANEL" rows={[{ icon: "shield", title: n.owner ?? dueño.name, sub: `Dueño · ${n.owner_phone || "—"}`, tag: "DUEÑO", tone: "ink", chevron: !!n.owner_id, onClick: n.owner_id ? () => router.push(`/admin/usuarios/${n.owner_id}`) : undefined }]} />
          : <A.AdminNote tone="warn" icon="lock">Nadie tiene acceso: el negocio no está reclamado.</A.AdminNote>}
        <A.AdminList label={`STAFF · COMO LO DEJÓ EL DUEÑO · ${staff.length}`} rows={staff.map((m) => ({
          icon: "users", title: m.name, sub: [m.role?.es, m.since ? `desde ${m.since}` : null, m.phone || null, m.hidden ? m.hidden_reason : null].filter(Boolean).join(" · "),
          tag: m.hidden ? "QUITADO" : m.status === "invited" ? "INVITADO" : m.status === "requested" ? "PIDE UNIRSE" : !m.show ? "OCULTO POR EL DUEÑO" : n.plan !== "pro" ? "NO SALE CON FREE" : undefined, tone: m.hidden ? "danger" : "neutral",
          actions: P.retirar && m.status === "active" ? [m.hidden
            ? { label: "Volver a mostrar", variant: "secondary", onClick: () => setConf({ titulo: `¿Por qué vuelve ${m.name}?`, hacer: (x) => staffPagina(n.id, m.id, false, x) }) }
            : { label: "Quitar de la página", variant: "secondary", onClick: () => setConf({ titulo: `Quitar a ${m.name} de la página`, sub: "Sigue en el equipo del negocio; deja de salir en su página. El dueño ve el motivo en su panel.", plantillas: BIZ, peligro: true, hacer: (x) => staffPagina(n.id, m.id, true, x) }) }] : undefined,
        }))} />
        {!staff.length ? <A.AdminNote tone="info" icon="users">Solo el dueño. Las personas del equipo salen aquí cuando el dueño las invita.</A.AdminNote> : null}
      </>);
  } else if (tab === "confianza") {
    const COL: Record<string, string> = { sello: "Sello de verificación", nuevo: "Negocios nuevos", medios: "Medios marcados", rec: "Recomendaciones" };
    const selloL = n.verified ? "Verificado" : n.sello?.status === "review" ? "En revisión" : n.sello?.status === "info" ? "Te falta un dato" : n.sello?.status === "no" ? "No aprobado" : "Sin sello";
    cuerpo = (
      <>
        {casosAbiertos.length ? <A.AdminList label={`REPORTES Y CASOS ABIERTOS · ${casosAbiertos.length}`} rows={casosAbiertos.map((c) => ({ icon: "bell", title: COL[c.queue] ?? c.queue, sub: `${hace(c.opened_at)}`, tag: "ABIERTO", tone: "action", chevron: true, onClick: () => router.push(`/admin/colas?caso=${c.id}`) }))} />
          : <PanelBloques bloques={[{ type: "group", k: "REPORTES ABIERTOS · 0", first: true }]} />}
        {!casosAbiertos.length ? <A.AdminNote tone="ok">Ninguno.</A.AdminNote> : null}
        <PanelBloques bloques={[{ type: "group", k: "SELLO Y LICENCIA" }, { type: "kv", cols: 2, items: [{ k: "SELLO", v: selloL, fg: n.verified ? "var(--tl-open-text)" : undefined }, { k: "LICENCIA", v: "Llega con la ficha Licencia" }] }, { type: "group", k: "ESTADO Y SANCIONES" }]} />
        {historial((a) => /ocultar|suspender|cerrar|restaurar|sello|cierre|reabrir/.test(a))}
      </>);
  } else {
    const selloL = n.verified ? "Verificado" : n.sello?.status === "review" ? "En revisión" : n.sello?.status === "info" ? "Te falta un dato" : n.sello?.status === "no" ? "No aprobado" : n.sello?.status === "revoked" ? "Quitado por To’Latino" : "Sin sello";
    const viejo = Date.now() - new Date(n.updated).getTime() > 30 * 86_400_000;
    const acts: { l: string; v?: string; icon?: string; onClick: () => void }[] = [];
    if (P.editar && n.status === "active") {
      if (n.plan === "pro" && !n.verified) acts.push({ l: "Dar sello", icon: "verified", onClick: () => setConf({ titulo: "Dar el sello Verificado", sub: "¿Cómo lo verificaste?", hacer: (m) => sello(n.id, true, m) }) });
      if (n.verified) acts.push({ l: "Quitar sello", icon: "shield", onClick: () => setConf({ titulo: "¿Por qué se quita el sello?", plantillas: SELLO_NO, peligro: true, hacer: (m) => sello(n.id, false, m) }) });
      if (!(n.temp_until && new Date(n.temp_until).getTime() > Date.now())) acts.push({ l: "Cierre temporal", icon: "clock", onClick: () => setConf({ titulo: `Cerrar ${n.name} por unos días`, sub: "La ficha dice «Cerrado temporalmente» y no recibe pedidos ni citas. Vuelve sola al vencer. El dueño ve el motivo en su panel.", elegir: { label: "POR CUÁNTO", items: [["1", "1 día"], ["3", "3 días"], ["7", "7 días"], ["14", "14 días"]].map(([k, l]) => ({ k: k!, l: l! })) }, plantillas: BIZ, hacer: (m, e) => cierreTemporal(n.id, Number(e), m) }) });
    }
    if (P.retirar && n.status === "active") {
      acts.push({ l: "Ocultar", v: "danger", icon: "ban", onClick: () => setConf({ titulo: `¿Por qué se oculta ${n.name}?`, plantillas: BIZ, peligro: true, hacer: (m) => cambiarEstado(n.id, "hidden", m) }) });
      acts.push({ l: "Suspender", v: "danger", icon: "lock", onClick: () => setConf({ titulo: `¿Por qué se suspende ${n.name}?`, plantillas: BIZ, peligro: true, hacer: (m) => cambiarEstado(n.id, "suspended", m) }) });
    }
    if (P.cerrar && n.status === "active") acts.push({ l: "Cerrar el negocio", v: "danger", icon: "close", onClick: () => setConf({ titulo: `Cerrar ${n.name}`, sub: "Para negocios que ya no existen. Sale de búsquedas y categoría; las reseñas se guardan. Se puede reabrir.", peligro: true, cta: "Cerrar", hacer: (m) => cambiarEstado(n.id, "closed", m) }) });
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "kv", cols: desk ? 3 : 2, items: [
          { k: "DUEÑO", v: n.owner ?? "Sin reclamar", fg: n.owner ? undefined : "var(--tl-pro-ink)" },
          { k: "PLAN", v: n.trial ? `Pro · prueba · quedan ${n.trial.left} d` : n.plan === "pro" ? "Pro" : "Free" },
          { k: "SELLO", v: selloL, fg: n.verified ? "var(--tl-open-text)" : undefined },
          { k: "TELÉFONO", v: n.phone || "—" },
          { k: "DIRECCIÓN", v: n.address ?? (n.op === "casa" ? "A domicilio · zona" : "—") },
          { k: "EN TO’LATINO DESDE", v: fecha(n.created) },
          { k: "ÚLTIMA ACTIVIDAD", v: fecha(n.updated), fg: viejo ? "var(--tl-pro-ink)" : undefined },
        ] }]} />
        <A.HBars label="FUERZA DEL PERFIL" help={`${n.fuerza.sc} %`} items={n.fuerza.todas.map((t) => ({ label: t.t[0], width: t.ok ? "100%" : "6%", color: t.ok ? "var(--tl-open)" : "var(--tl-pro)", value: t.ok ? "Sí" : "Falta" }))} />
        {casosAbiertos.length ? <A.AdminNote tone="warn" cta="Ver" onCta={() => ir("confianza")}>{`${casosAbiertos.length} ${casosAbiertos.length === 1 ? "caso abierto" : "casos abiertos"} sobre este negocio.`}</A.AdminNote> : null}
        <PanelBloques bloques={[{ type: "group", k: "NOTAS INTERNAS", link: P.editar ? "Agregar nota" : undefined, onLink: () => setConf({ titulo: `Nota sobre ${n.name}`, sub: "Solo la ve el equipo. El negocio nunca la ve.", cta: "Guardar", hacer: (m) => nota(n.id, m) }) }]} />
        {n.notas.length ? <A.AdminList rows={n.notas.map((x) => ({ icon: "edit", title: x.text, sub: `${x.quien ?? "Equipo"} · ${fecha(x.at)}` }))} /> : <A.AdminNote tone="info">Sin notas.</A.AdminNote>}
        {acts.length ? <PanelBloques bloques={[{ type: "group", k: "ACCIONES" }, { type: "acts", items: acts.map((a) => ({ ...a, off: pend })) }]} /> : null}
      </>);
  }

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "NEGOCIO 360°", t: n.name, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
      <span role="link" onClick={() => router.push("/admin/negocios")} style={{ display: "flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><A.Icon name="chevronLeft" size={15} color="var(--tl-action)" />Negocios</span>
      <span style={{ font: "700 9.5px 'JetBrains Mono',monospace", letterSpacing: ".14em", color: "rgba(11,14,18,.45)" }}>NEGOCIO 360°</span>
      <PanelBloques bloques={cab} />
      {notasEstado}
      <PanelBloques bloques={[tabs]} />
      {cuerpo}
      <PanelBloques bloques={[{ type: "group", k: "HISTORIAL RECIENTE" }]} />
      {historial()}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
