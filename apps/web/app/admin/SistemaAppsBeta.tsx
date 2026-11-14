"use client";
/* 8f · Super Admin › Sistema › Apps completo (fase8-apps.md §4 8f; hueco #7: tabs + kpis + rows + la ficha, compuesto con el sistema):
   - Versiones: lo que hay en TestFlight interno, Play interno, el APK propio y la tienda; 8h: en vivo desde el CI (compilando → subido →
     procesando → disponible; se pone al día sola cada 8 s mientras algo está en curso), «Pedir un build» (lanza el flujo de las tiendas con el
     token del llavero; motivo y auditoría), los pedidos y qué llaves de la tubería faltan.
   - Testers: invitar a una cuenta To'Latino (motivo; el correo de Apple solo para TestFlight), quitar con motivo, «Ya está en la lista» (Play) y
     otro enlace de un uso (APK propio).
   - Salud › Errores: grupos por app, plataforma y build (cursor), sesiones sin cierre, la ficha con el stack simbolizado y Visto / Resuelto en el
     build N / Silenciar con motivo / Reabrir. Sin personas.
   - Reportes: los casos «Reportar un problema» de la cola ticket de Soporte (se abren en Soporte).
   Cambiar: apps:editar (lo revisa cada acción en el servidor). */
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { FilaBuild, FilaTester } from "@/lib/beta";
import type { FichaGrupo, SaludApps } from "@/lib/errores/admin";
import type { EstadoTuberia } from "@/lib/tiendas/tuberia";
import type { FilaReporte } from "@/lib/reportar";
import { buildPedir, errorEstado, testerEnlace, testerEnPlay, testerInvitar, testerQuitar } from "./acciones-beta";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { PESTANAS_SISTEMA } from "./sistema/Pestanas";
import { useAhora } from "@/lib/ahora";

export type VistaApps = "resumen" | "versiones" | "testers" | "salud" | "reportes" | "fichas" | "toca" | "declaraciones";
// 8i · Fichas y revisión · Lo que te toca · Declaraciones (SistemaAppsTiendas).
const SUB: [VistaApps, string][] = [["resumen", "Resumen"], ["versiones", "Versiones"], ["testers", "Testers"], ["salud", "Salud · errores"], ["reportes", "Reportes"], ["fichas", "Fichas y revisión"], ["toca", "Lo que te toca"], ["declaraciones", "Declaraciones"]];
const APP: Record<string, string> = { cliente: "To'Latino", negocio: "Negocios", delivery: "Repartidor", checkin: "Puerta", web: "Web" };
const PLAT: Record<string, string> = { ios: "iPhone", android: "Android", web: "Navegador" };
const CANAL: Record<string, string> = { testflight_interno: "TestFlight interno", play_interno: "Play interno", apk_propio: "APK propio", tienda: "Tienda", testflight: "TestFlight interno" };
const EST_BUILD: Record<string, [string, string]> = { compilando: ["COMPILANDO", "neutral"], subido: ["SUBIDO", "action"], procesando: ["PROCESANDO", "action"], disponible: ["DISPONIBLE", "signal"], fallo: ["FALLÓ", "danger"], retirado: ["RETIRADO", "neutral"] };
const EST_PEDIDO: Record<string, [string, string]> = { pendiente: ["PENDIENTE", "neutral"], enviado: ["ENVIADO", "action"], corriendo: ["COMPILANDO", "action"], terminado: ["TERMINADO", "signal"], sin_llave: ["SIN TOKEN", "danger"], error: ["ERROR", "danger"] };
const EST_TESTER: Record<string, [string, string]> = { invitado: ["INVITADO", "action"], activo: ["ACTIVO", "signal"], pendiente_consola: ["FALTA EN PLAY", "action"], quitado: ["QUITADO", "neutral"] };
const SYNC: Record<string, string> = { ok: "Apple al día", pendiente: "Apple pendiente", sin_llave: "Sin la llave de App Store Connect", error: "Apple no contestó bien" };
const EST_GRUPO: Record<string, [string, string]> = { nuevo: ["NUEVO", "danger"], visto: ["VISTO", "action"], resuelto: ["RESUELTO", "signal"], silenciado: ["SILENCIADO", "neutral"] };
const TIPO: Record<string, string> = { js: "Error de la página", red: "Sin conexión con el servidor", cierre: "Cierre de la app", nativo: "Error nativo", servidor: "Error del servidor" };
const EST_CASO: Record<string, string> = { new: "Nuevo", in_progress: "En curso", waiting: "Esperando a la persona", resolved: "Resuelto", reopened: "Reabierto", merged: "Unido" };
const cuando = (iso: string | null) => (iso ? new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "") : "—");
const hace = (iso: string, ahora: number) => { const m = Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60000)); return m < 1 ? "ahora" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.floor(m / 60)} h` : cuando(iso); };
const peso = (b: number | null) => (b == null ? "—" : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export type DatosBeta =
  | { v: "versiones"; builds: FilaBuild[]; tuberia: EstadoTuberia }
  | { v: "testers"; testers: FilaTester[] | null }
  | { v: "salud"; salud: SaludApps; ficha: FichaGrupo | null; filtro: { app: string | null; estado: string | null; tipo: string | null } }
  | { v: "reportes"; reportes: FilaReporte[]; sop: boolean };

/* La segunda fila de pestañas (Resumen · Versiones · Testers · Salud · Reportes): la usa también SistemaApps (Resumen). */
export function subApps(on: VistaApps, ir: (href: string) => void): Bloque {
  return { type: "chips", items: SUB.map(([k, l]) => ({ l, v: k === on ? "selected" : "filter", onClick: () => ir(k === "resumen" ? "/admin/sistema/apps" : `/admin/sistema/apps?v=${k}`) })) };
}

export function SistemaAppsBeta({ d, editar }: { d: DatosBeta; editar: boolean }) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [invitando, setInvitando] = useState(false), [pidiendo, setPidiendo] = useState(false);
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Guardado."); setConf(null); router.refresh(); };
  // 8h · En vivo: mientras un build está en curso o un pedido espera a GitHub, la pantalla se pone al día sola (cada 8 s).
  const vivo = d.v === "versiones" && (d.tuberia.enCurso > 0 || d.tuberia.pedidos.some((p) => ["pendiente", "enviado", "corriendo"].includes(p.estado)));
  useEffect(() => { if (!vivo || conf || pidiendo) return; const t = setInterval(() => router.refresh(), 8000); return () => clearInterval(t); }, [vivo, conf, pidiendo, router]);
  const cabeza: Bloque[] = [
    { type: "head", eye: "SUPER ADMIN · SISTEMA", t: "Apps", s: "Las cuatro apps de las tiendas: versiones, testers del programa beta, la salud (errores y cierres) y los reportes de la gente.", h1: desk ? 26 : 22 },
    { type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: p.l, on: p.k === "apps", onClick: () => (p.k === "apps" ? undefined : router.push(p.href)) })) },
    subApps(d.v, (h) => router.push(h)),
  ];
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "SISTEMA · APPS", t: "Apps", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  if (pidiendo && d.v === "versiones") return <PedirBuild desk={desk} onBack={() => setPidiendo(false)} onDone={(r) => { setPidiendo(false); hecho(r); }} />;
  if (invitando && d.v === "testers") return <Invitar desk={desk} onBack={() => setInvitando(false)} onDone={(r) => { setInvitando(false); hecho(r); }} />;

  const B: Bloque[] = [...cabeza];
  if (d.v === "versiones") {
    const t = d.tuberia, L = t.llaves, nLl = Object.values(L).filter(Boolean).length;
    B.push({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "EN CURSO", v: String(t.enCurso), s: "compilando, subido o procesando", bg: t.enCurso ? "var(--tl-ink)" : undefined, fg: t.enCurso ? "var(--tl-white)" : undefined },
      { k: "DISPONIBLES", v: String(d.builds.filter((b) => b.estado === "disponible").length), s: "para los testers" },
      { k: "LLAVES DE LA TUBERÍA", v: `${nLl} de 4`, s: nLl === 4 ? "completas" : "faltan en el llavero" },
      { k: "ÚLTIMO CI", v: t.ultimaCi ? hace(t.ultimaCi, ahora) : "nunca", s: t.ultimaCi ? cuando(t.ultimaCi) : "espera el dominio con HTTPS" }] });
    B.push({ type: "note", tone: t.ultimaCi ? "info" : "warn", icon: t.ultimaCi ? "info" : "lock", t: t.ultimaCi
      ? "Cada build sube solo desde el CI: pide sus llaves por OIDC (sin ninguna guardada en GitHub), firma, sube a TestFlight interno, Play interno y el APK propio, y avisa aquí. El build es creciente por app, plataforma y canal, y su estado solo avanza."
      : "El CI de las tiendas todavía no entró: pide sus llaves solo por HTTPS y el servidor de pruebas sigue en HTTP (falta el dominio). Mientras, compila sin llaves y nada se sube a las tiendas. Aquí ves la semilla del sandbox." });
    if (vivo) B.push({ type: "note", tone: "ok", icon: "clock", t: "En vivo · esta pantalla se pone al día sola mientras un build está en curso." });
    B.push({ type: "group", k: "LO QUE NECESITA LA TUBERÍA" });
    B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: ([["asc_api_key", "App Store Connect · llave de la API", "Firma de iOS y subida a TestFlight interno"], ["android_upload_keystore", "Android · llave de subida", "Firma del .aab y del APK propio"],
      ["play_service_account", "Google Play · cuenta de servicio", "El servidor sube el .aab a Play interno"], ["github_token", "GitHub · token para pedir builds", "«Pedir un build» desde aquí"]] as const).map(([k, l, s]): Fila => ({
      key: k, icon: L[k] ? "key" : "lock", t: l, s, tag: L[k] ? "VIVA" : "FALTA", tone: L[k] ? "signal" : "neutral", ...(editar ? { onClick: () => router.push("/admin/sistema/integraciones") } : { chev: false }) })) });
    if (editar) B.push({ type: "acts", items: [{ l: "Pedir un build", v: "primary", icon: "plus", onClick: () => setPidiendo(true) }] });
    B.push({ type: "group", k: `PEDIDOS · ${t.pedidos.length}` });
    B.push(t.pedidos.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: t.pedidos.map((p): Fila => ({ key: `p${p.id}`, icon: "clock",
      t: `Pedido ${p.id} · ${p.app === "todas" ? "las cuatro apps" : APP[p.app] ?? p.app} · ${p.plat === "ambas" ? "iPhone y Android" : PLAT[p.plat] ?? p.plat}`,
      s: [p.motivo, `${p.quien ?? "equipo"} · ${cuando(p.at)}`, p.builds ? `${p.builds} ${p.builds === 1 ? "build" : "builds"}` : null, p.resultado].filter(Boolean).join(" · "),
      tag: EST_PEDIDO[p.estado]?.[0] ?? p.estado, tone: EST_PEDIDO[p.estado]?.[1] ?? "neutral", chev: false })) }
      : { type: "empty", icon: "clock", t: "Sin pedidos todavía", s: "«Pedir un build» lanza el CI de las tiendas para una app o las cuatro. Un cambio en lo nativo también lo lanza solo." });
    for (const a of ["cliente", "negocio", "delivery", "checkin"]) {
      const L = d.builds.filter((b) => b.app === a);
      B.push({ type: "group", k: `${(APP[a] ?? a).toUpperCase()} · ${L.length} ${L.length === 1 ? "BUILD" : "BUILDS"}` });
      B.push(L.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: L.map((b): Fila => ({ key: b.id, icon: "phone",
        t: `${PLAT[b.plat]} · ${b.version} (${b.build})`, s: [CANAL[b.canal] ?? b.canal, b.commit ? `commit ${b.commit.slice(0, 7)}` : null, b.size ? peso(b.size) : null, b.sha ? `sha256 ${b.sha.slice(0, 12)}…` : null,
          b.simbolos ? "con símbolos" : null, b.pedido ? `pedido ${b.pedido}` : null, b.envio ? `tienda: ${b.envio}` : null, b.estado === "subido" && b.canal === "play_interno" && !d.tuberia.llaves.play_service_account ? "espera la cuenta de Play" : null,
          cuando(b.at), b.estado !== "disponible" && b.estado !== "retirado" && b.cambio !== b.at ? `cambió ${hace(b.cambio, ahora)}` : null, b.motivo].filter(Boolean).join(" · "),
        tag: EST_BUILD[b.estado]?.[0] ?? b.estado, tone: EST_BUILD[b.estado]?.[1] ?? "neutral", chev: false, ...(b.ci ? { onClick: () => window.open(b.ci!, "_blank", "noopener") } : {}) })) }
        : { type: "empty", icon: "phone", t: "Sin builds todavía", s: "Aparecen cuando el CI compile esta app (8h)." });
    }
  } else if (d.v === "testers" && !d.testers) {
    B.push({ type: "note", tone: "info", icon: "lock", t: "Solo un Admin ve y cambia los testers (tienen nombre y teléfono)." });
  } else if (d.v === "testers" && d.testers) {
    const T = d.testers, vivos = T.filter((t) => t.estado !== "quitado");
    B.push({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "ACTIVOS", v: String(vivos.filter((t) => t.estado === "activo").length), s: "prueban hoy" }, { k: "INVITADOS", v: String(vivos.filter((t) => t.estado === "invitado").length), s: "esperan a Apple" },
      { k: "FALTAN EN PLAY", v: String(vivos.filter((t) => t.estado === "pendiente_consola").length), s: "paso de Play Console" }, { k: "QUITADOS", v: String(T.length - vivos.length), s: "con motivo" }] });
    B.push({ type: "note", tone: "info", icon: "info", t: "En la Fase 8 la beta es solo interna, contra el sandbox (hasta ~10 personas de confianza). TestFlight interno pide el correo de la cuenta de Apple; Play no deja agregar correos por la API (se agrega en Play Console); el APK propio manda un enlace de un uso a la campana del tester." });
    if (editar) B.push({ type: "acts", items: [{ l: "Invitar a una cuenta", v: "primary", icon: "plus", onClick: () => setInvitando(true) }] });
    B.push(T.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: T.map((t): Fila => ({ key: t.id, icon: t.plat === "ios" ? "phone" : "phone", dim: t.estado === "quitado",
      t: `${t.nombre} · ${t.tel}`, s: [`${APP[t.app]} · ${PLAT[t.plat]} · ${CANAL[t.canal]}`, t.correo, t.canal === "testflight" && t.estado !== "quitado" ? (t.syncError ? `${SYNC[t.sync]}: ${t.syncError}` : SYNC[t.sync]) : null,
        t.enlace ? `enlace ${t.enlace.estado === "vivo" ? `vivo hasta ${cuando(t.enlace.vence)}` : t.enlace.estado}` : null,
        t.estado === "quitado" ? `quitado ${cuando(t.quitado)} · ${t.quitadoMotivo}` : `invitó ${t.quien ?? "—"} ${cuando(t.at)} · ${t.motivo}`].filter(Boolean).join(" · "),
      tag: EST_TESTER[t.estado]?.[0] ?? t.estado, tone: EST_TESTER[t.estado]?.[1] ?? "neutral", chev: false,
      ...(editar && t.estado !== "quitado" ? { acts: [
        ...(t.estado === "pendiente_consola" ? [{ l: "Ya está en la lista", icon: "check", onClick: () => setConf({ titulo: `${t.nombre} · Play interno`, cta: "Marcar", sub: "Solo cuando ya lo agregaste a la lista de Play interno en Play Console.", plantillas: ["Agregado en Play Console"], hacer: (m) => testerEnPlay(t.id, m) }) }] : []),
        ...(t.canal === "apk_propio" ? [{ l: "Otro enlace", icon: "share", onClick: () => setConf({ titulo: `${t.nombre} · enlace del APK`, cta: "Mandar", sub: "Anula el enlace que siga vivo y le manda uno nuevo de un uso a su campana.", plantillas: ["No le llegó", "Se le venció", "Build nuevo"], hacer: (m) => testerEnlace(t.id, m) }) }] : []),
        { l: "Quitar", icon: "close", onClick: () => setConf({ titulo: `Quitar a ${t.nombre}`, cta: "Quitar", peligro: true, sub: t.canal === "testflight" ? "Sale del grupo interno de TestFlight (y el usuario que creamos para la prueba). Se le avisa." : "Deja de probar esta app; su enlace del APK (si tiene) se anula. Se le avisa.", plantillas: ["Terminó la prueba", "Ya no participa", "Cambió de teléfono"], hacer: (m) => testerQuitar(t.id, m) }) },
      ] } : {}) })) } : { type: "empty", icon: "users", t: "Todavía no hay testers", s: "Invita al fundador y a las personas de confianza que van a probar las apps contra el sandbox." });
  } else if (d.v === "salud") {
    const s = d.salud, f = d.filtro;
    if (d.ficha) return <Ficha g={d.ficha} desk={desk} editar={editar} onConf={setConf} toast={toast} />;
    const ir = (o: Partial<typeof f> & { cursor?: string | null }) => {
      const x = { ...f, ...o }, q = new URLSearchParams({ v: "salud" });
      if (x.app) q.set("app", x.app); if (x.estado) q.set("estado", x.estado); if (x.tipo) q.set("tipo", x.tipo); if (o.cursor) q.set("c", o.cursor);
      router.push(`/admin/sistema/apps?${q}`);
    };
    B.push({ type: "kpis", cols: desk ? "repeat(5,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "GRUPOS ABIERTOS", v: String(s.kpis.grupos), s: "nuevos o vistos", bg: s.kpis.grupos ? "var(--tl-ink)" : undefined, fg: s.kpis.grupos ? "var(--tl-white)" : undefined },
      { k: "NUEVOS · 24 H", v: String(s.kpis.nuevos24) }, { k: "ERRORES · 24 H", v: String(s.kpis.eventos24) }, { k: "ALERTAS · 24 H", v: String(s.kpis.alertas24), s: "errores en vivo" },
      { k: "DESCARTADOS", v: String(s.kpis.descartados), s: "por el tope · últimas 24 h (todos los servidores)" }] });
    B.push({ type: "group", k: "SESIONES SIN CIERRE · 7 DÍAS (APROXIMADO)" });
    B.push(s.sinCierre.length ? { type: "rows", cols: desk ? "repeat(4,minmax(0,1fr))" : "1fr", items: s.sinCierre.map((x): Fila => ({ key: `${x.app}-${x.plat}`, icon: "phone", t: `${APP[x.app] ?? x.app} · ${PLAT[x.plat] ?? x.plat}`,
      r: x.pct == null ? "—" : `${x.pct} %`, s: `${x.sesiones} ${x.sesiones === 1 ? "sesión" : "sesiones"} · ${x.conCierre} ${x.conCierre === 1 ? "teléfono" : "teléfonos"} con un cierre`, chev: false })) }
      : { type: "empty", icon: "phone", t: "Sin sesiones de las apps todavía", s: "La tasa sale cuando haya sesiones desde TestFlight, Play interno o el APK propio." });
    B.push({ type: "chips", k: "APP", items: [["", "Todas"], ...Object.entries(APP)].map(([k, l]) => ({ l: l!, v: (f.app ?? "") === k ? "selected" : "filter", onClick: () => ir({ app: k || null }) })) });
    B.push({ type: "chips", k: "ESTADO", items: [["", "Todos"], ["nuevo", "Nuevos"], ["visto", "Vistos"], ["resuelto", "Resueltos"], ["silenciado", "Silenciados"]].map(([k, l]) => ({ l: l!, v: (f.estado ?? "") === k ? "selected" : "filter", onClick: () => ir({ estado: k || null }) })) });
    B.push({ type: "chips", k: "TIPO", items: [["", "Todos"], ...Object.entries(TIPO)].map(([k, l]) => ({ l: l!, v: (f.tipo ?? "") === k ? "selected" : "filter", onClick: () => ir({ tipo: k || null }) })) });
    B.push(s.grupos.length ? { type: "rows", k: "GRUPOS · LO MÁS RECIENTE PRIMERO", items: s.grupos.map((g): Fila => ({ key: g.id, icon: g.tipo === "cierre" ? "warning" : g.tipo === "red" ? "info" : "help",
      t: g.titulo, s: `${APP[g.app] ?? g.app} · ${PLAT[g.plat] ?? g.plat} · ${TIPO[g.tipo] ?? g.tipo} · ${g.n} ${g.n === 1 ? "vez" : "veces"} · ${g.tel} ${g.tel === 1 ? "teléfono" : "teléfonos"} · build ${g.build ?? "—"} · ${hace(g.ultimo, ahora)}${g.n24 ? ` · ${g.n24} hoy` : ""}`,
      tag: EST_GRUPO[g.estado]?.[0] ?? g.estado, tone: EST_GRUPO[g.estado]?.[1] ?? "neutral", onClick: () => router.push(`/admin/sistema/apps?v=salud&g=${g.id}`) })),
      ...(s.siguiente ? { link: "Ver más", onLink: () => ir({ cursor: s.siguiente }) } : {}) }
      : { type: "empty", icon: "check", t: "Sin errores con estos filtros", s: "Los errores de la web y de las apps llegan aquí tapados y agrupados. «Errores en vivo» avisa a los Admins de un grupo nuevo, un pico o uno que vuelve." });
  } else if (d.v === "reportes") {
    B.push({ type: "note", tone: "info", icon: "info", t: d.sop ? "Cada reporte es un caso de Soporte (tema técnico) en la cola de casos, con la captura como foto privada y el registro de la app. Ábrelo para contestar." : "Cada reporte es un caso de Soporte; tu rol no abre Soporte, así que aquí solo ves las cifras." });
    B.push(d.reportes.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: d.reportes.map((r): Fila => ({ key: r.num, icon: "warning",
      t: `${r.num}${r.texto ? ` · ${r.texto}` : ""}`, s: [EST_CASO[r.estado] ?? r.estado, r.device ? `${r.device} · ${r.version ?? "web"}` : null, r.captura ? (r.captura === "agitar" ? "captura de la pantalla" : "captura de un archivo") : "sin captura", `${r.lineas} líneas de registro`, r.negocio ? "desde el panel" : null, cuando(r.at)].filter(Boolean).join(" · "),
      tag: r.estado === "resolved" ? "RESUELTO" : r.estado === "merged" ? "UNIDO" : "ABIERTO", tone: r.estado === "resolved" || r.estado === "merged" ? "signal" : "action",
      ...(d.sop ? { onClick: () => router.push(`/admin/soporte?caso=${r.num}`) } : { chev: false }) })) } : { type: "empty", icon: "warning", t: "Sin reportes todavía", s: "Llegan cuando alguien toca «Reportar un problema» (o agita el teléfono en una app de prueba)." });
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}

/* La ficha de un grupo de errores. */
function Ficha({ g, desk, editar, onConf, toast }: { g: FichaGrupo; desk: boolean; editar: boolean; onConf: (c: Confirmar) => void; toast: string | null }) {
  const router = useRouter(), e0 = g.eventos[0];
  const B: Bloque[] = [{ type: "head", eye: `SALUD · ${(APP[g.app] ?? g.app).toUpperCase()} · ${(PLAT[g.plat] ?? g.plat).toUpperCase()} · ${(TIPO[g.tipo] ?? g.tipo).toUpperCase()}`, t: g.titulo, onBack: () => router.push("/admin/sistema/apps?v=salud"), h1: desk ? 24 : 20 }];
  if (g.regreso && g.estado === "nuevo") B.push({ type: "note", tone: "danger", icon: "warning", t: `Volvió ${cuando(g.regreso)} en un build posterior al arreglo: se reabrió solo y avisó a los Admins.` });
  if (g.motivo) B.push({ type: "note", tone: g.estado === "silenciado" ? "warn" : "info", icon: "info", t: `${EST_GRUPO[g.estado]?.[0] ?? g.estado} · ${g.quien ?? "—"} · ${cuando(g.cuando)} · ${g.motivo}` });
  B.push({ type: "kv", cols: desk ? 4 : 2, items: [
    { k: "ESTADO", v: EST_GRUPO[g.estado]?.[0] ?? g.estado }, { k: "VECES", v: String(g.n) }, { k: "TELÉFONOS (APROX.)", v: String(g.tel) }, { k: "HOY", v: String(g.n24) },
    { k: "PRIMERA VEZ", v: cuando(g.primero) }, { k: "ÚLTIMA VEZ", v: cuando(g.ultimo) }, { k: "ÚLTIMO BUILD", v: g.build ?? "—" }, { k: "RESUELTO EN", v: g.resueltoEn ?? "—" }] });
  if (editar) B.push({ type: "acts", items: [
    ...(g.estado === "nuevo" ? [{ l: "Visto", v: "secondary", icon: "check", onClick: () => onConf({ titulo: "Marcar como visto", cta: "Visto", sub: "Alguien del equipo ya lo está mirando. Sigue contando y avisando.", plantillas: ["Lo estoy revisando"], hacer: (m: string) => errorEstado(g.id, "visto", "", m) }) }] : []),
    ...(g.estado !== "resuelto" ? [{ l: "Resuelto en…", v: "primary", icon: "check", onClick: () => onConf({ titulo: "Resuelto en el build", cta: "Guardar", sub: "El build donde quedó arreglado (el número en las apps; el commit en la web). Si vuelve en uno posterior, se reabre solo y avisa.", valor: { k: "BUILD O COMMIT", ini: g.build ?? "", max: 12 }, plantillas: ["Arreglado en este build", "Era del servidor: ya corregido"], hacer: (m: string, _e: string | null, v: string) => errorEstado(g.id, "resuelto", v, m) }) }] : []),
    ...(g.estado !== "silenciado" ? [{ l: "Silenciar", v: "secondary", icon: "close", onClick: () => onConf({ titulo: "Silenciar este grupo", cta: "Silenciar", peligro: true, sub: "No avisa más (ni nuevo ni pico); se sigue contando aquí. Pide motivo.", plantillas: ["Es de un navegador viejo", "Ruido de una extensión", "Ya se sabe y no afecta"], hacer: (m: string) => errorEstado(g.id, "silenciar", "", m) }) }] : []),
    ...(g.estado === "resuelto" || g.estado === "silenciado" ? [{ l: "Reabrir", v: "secondary", icon: "edit", onClick: () => onConf({ titulo: "Reabrir", cta: "Reabrir", sub: "Vuelve a «nuevo».", plantillas: ["Sigue pasando", "Lo silenciamos por error"], hacer: (m: string) => errorEstado(g.id, "reabrir", "", m) }) }] : []),
  ] });
  B.push({ type: "group", k: e0?.simbolizado ? "STACK · SIMBOLIZADO EN EL SERVIDOR" : "STACK · TAL COMO LLEGÓ (SIN MAPA PARA ESE BUILD)" });
  const lineas = (e0?.stack ?? "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 25);
  B.push(lineas.length ? { type: "timeline", items: [{ t: e0?.mensaje ?? g.titulo, s: "MENSAJE" }, ...lineas.map((l) => ({ t: l.replace(/^at /, ""), s: undefined as string | undefined }))] } : { type: "note", tone: "info", icon: "info", t: e0?.mensaje ?? "Sin stack (el teléfono no lo mandó)." });
  B.push({ type: "group", k: "POR BUILD" });
  B.push({ type: "rows", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: g.builds.map((b): Fila => ({ key: b.build, icon: "phone", t: `Build ${b.build}`, r: String(b.n), chev: false })) });
  B.push({ type: "group", k: "POR PANTALLA (FAMILIA DE RUTA)" });
  B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: g.rutas.map((r): Fila => ({ key: r.ruta, icon: "search", t: r.ruta, r: String(r.n), chev: false })) });
  B.push({ type: "group", k: "ÚLTIMAS VECES · SIN PERSONAS" });
  B.push({ type: "rows", items: g.eventos.slice(0, 10).map((e, i): Fila => ({ key: `${i}`, icon: "clock", t: `${cuando(e.at)} · build ${e.build ?? "—"}${e.version ? ` (${e.version})` : ""}`, s: [e.os, e.modelo, e.ruta].filter(Boolean).join(" · ") || "—", chev: false })) });
  if (g.alertas.length) {
    B.push({ type: "group", k: "ERRORES EN VIVO · AVISOS AL EQUIPO" });
    B.push({ type: "rows", items: g.alertas.map((a, i): Fila => ({ key: `${i}`, icon: "bell", t: `${a.tipo === "pico" ? "Pico" : a.tipo === "regresion" ? "Volvió" : "Nuevo"} · build ${a.build || "—"}`, s: `${a.n} ${a.n === 1 ? "vez" : "veces"} · ${cuando(a.at)}`, chev: false })) });
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 980 }}><PanelBloques bloques={B} h1={desk ? 24 : 20} /><Toast t={toast} desk={desk} /></div>;
}

/* 8h · «Pedir un build» (hueco #7: el formulario del sistema, como Invitar): qué app, qué plataforma y el motivo. Lanza el flujo de las tiendas
   en GitHub con el token del llavero; sin el token queda anotado y no se lanza nada. */
function PedirBuild({ desk, onBack, onDone }: { desk: boolean; onBack: () => void; onDone: (r: ResAdm) => void }) {
  const [app, setApp] = useState("todas"), [plat, setPlat] = useState("ambas"), [motivo, setMotivo] = useState(""), [err, setErr] = useState<string | null>(null), [pend, start] = useTransition();
  const enviar = () => start(async () => { const r = await buildPedir(app, plat, motivo); if (!r.ok) setErr(r.mensaje ?? "No se pudo."); else onDone(r); });
  const B: Bloque[] = [
    { type: "head", eye: "SISTEMA · APPS · VERSIONES", t: "Pedir un build", s: "Lanza el CI de las tiendas: compila, firma y sube a TestFlight interno, Play interno y el APK propio. Unos 15 minutos por app; lo ves en Versiones en vivo.", onBack, h1: desk ? 24 : 20 },
    { type: "chips", k: "APP", items: [["todas", "Las cuatro"], ...Object.entries(APP).filter(([k]) => k !== "web")].map(([k, l]) => ({ l: l!, v: app === k ? "selected" : "filter", onClick: () => setApp(k!) })) },
    { type: "chips", k: "PLATAFORMA", items: [["ambas", "iPhone y Android"], ["ios", "iPhone"], ["android", "Android"]].map(([k, l]) => ({ l: l!, v: plat === k ? "selected" : "filter", onClick: () => setPlat(k!) })) },
    { type: "note", tone: "info", icon: "info", t: "Sale de la rama de pruebas, con el sabor de pruebas (apunta al sandbox). Las tiendas públicas no se tocan." },
    { type: "field", k: "MOTIVO · QUEDA EN LA AUDITORÍA", val: motivo, onChange: setMotivo, area: true, rows: 2, max: 300, count: `${motivo.length}/300` },
    { type: "chips", items: ["Versión nueva para los testers", "Arreglo en lo nativo", "Volver a probar la firma"].map((p) => ({ l: p, v: motivo === p ? "selected" : "filter", onClick: () => setMotivo(p) })) },
    err ? { type: "note", tone: "danger", icon: "warning", t: err } : null,
    { type: "acts", items: [{ l: pend ? "Pidiendo…" : "Pedir el build", v: "primary", icon: "check", off: pend || motivo.trim().length < 3, onClick: enviar }, { l: "Cancelar", v: "secondary", onClick: onBack }] },
  ].filter(Boolean) as Bloque[];
  return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}><PanelBloques bloques={B} h1={desk ? 24 : 20} /></div>;
}

/* Invitar a una cuenta To'Latino (hueco #7): teléfono de la cuenta, app, por dónde, el correo de Apple (solo TestFlight) y el motivo. */
function Invitar({ desk, onBack, onDone }: { desk: boolean; onBack: () => void; onDone: (r: ResAdm) => void }) {
  const [tel, setTel] = useState(""), [app, setApp] = useState("cliente"), [canal, setCanal] = useState("testflight"), [correo, setCorreo] = useState(""), [motivo, setMotivo] = useState("");
  const [err, setErr] = useState<string | null>(null), [pend, start] = useTransition();
  const enviar = () => start(async () => { const r = await testerInvitar(tel, app, canal, correo, motivo); if (!r.ok) setErr(r.mensaje ?? "No se pudo."); else onDone(r); });
  const B: Bloque[] = [
    { type: "head", eye: "SISTEMA · APPS · TESTERS", t: "Invitar a una cuenta", s: "La persona ya tiene cuenta en To'Latino (su teléfono). Le llega un aviso; en TestFlight, además, el correo de Apple.", onBack, h1: desk ? 24 : 20 },
    { type: "field", k: "TELÉFONO DE SU CUENTA", val: tel, onChange: setTel, ph: "(570) 555-0122", im: "tel", max: 20 },
    { type: "chips", k: "APP", items: Object.entries(APP).filter(([k]) => k !== "web").map(([k, l]) => ({ l, v: app === k ? "selected" : "filter", onClick: () => setApp(k) })) },
    { type: "chips", k: "POR DÓNDE", items: [["testflight", "TestFlight interno · iPhone"], ["play_interno", "Play interno · Android"], ["apk_propio", "APK propio · Android"]].map(([k, l]) => ({ l: l!, v: canal === k ? "selected" : "filter", onClick: () => setCanal(k!) })) },
    canal === "testflight" ? { type: "field", k: "CORREO DE SU CUENTA DE APPLE", val: correo, onChange: setCorreo, ph: "nombre@icloud.com", im: "email", max: 254, help: "Apple lo pide para invitar al equipo de prueba. Se guarda cifrado; aquí solo se ve tapado." } : null,
    canal === "play_interno" ? { type: "note", tone: "warn", icon: "info", t: "Play no deja agregar un correo por la API: después de invitar, agrégalo a la lista de Play interno en Play Console y marca «Ya está en la lista». Mientras, el APK propio funciona sin Play." } : null,
    { type: "field", k: "MOTIVO · QUEDA EN LA AUDITORÍA", val: motivo, onChange: setMotivo, area: true, rows: 2, max: 300, count: `${motivo.length}/300` },
    { type: "chips", items: ["Prueba interna del fundador", "Persona de confianza", "Equipo de To'Latino"].map((p) => ({ l: p, v: motivo === p ? "selected" : "filter", onClick: () => setMotivo(p) })) },
    err ? { type: "note", tone: "danger", icon: "warning", t: err } : null,
    { type: "acts", items: [{ l: pend ? "Invitando…" : "Invitar", v: "primary", icon: "check", off: pend || !tel.trim() || motivo.trim().length < 3, onClick: enviar }, { l: "Cancelar", v: "secondary", onClick: onBack }] },
  ].filter(Boolean) as Bloque[];
  return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}><PanelBloques bloques={B} h1={desk ? 24 : 20} /></div>;
}
