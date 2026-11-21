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
import { useE } from "./idioma-admin";

export type VistaApps = "resumen" | "versiones" | "testers" | "salud" | "reportes" | "fichas" | "toca" | "declaraciones";
// 8i · Fichas y revisión · Lo que te toca · Declaraciones (SistemaAppsTiendas).
type EF = (es: string, en: string) => string;
const ES: EF = (es) => es;
const APP: Record<string, string> = { cliente: "To'Latino", negocio: "Negocios", delivery: "Repartidor", checkin: "Puerta", web: "Web" };
// 9f-4 · Los textos en el idioma de la persona del equipo (E de useE()).
const textos = (E: EF) => ({
  SUB: [["resumen", E("Resumen", "Overview")], ["versiones", E("Versiones", "Versions")], ["testers", E("Testers", "Testers")], ["salud", E("Salud · errores", "Health · errors")], ["reportes", E("Reportes", "Reports")], ["fichas", E("Fichas y revisión", "Listings and review")], ["toca", E("Lo que te toca", "Your steps")], ["declaraciones", E("Declaraciones", "Declarations")]] as [VistaApps, string][],
  PLAT: { ios: "iPhone", android: "Android", web: E("Navegador", "Browser") } as Record<string, string>,
  CANAL: { testflight_interno: E("TestFlight interno", "TestFlight internal"), play_interno: E("Play interno", "Play internal"), apk_propio: E("APK propio", "Own APK"), tienda: E("Tienda", "Store"), testflight: E("TestFlight interno", "TestFlight internal") } as Record<string, string>,
  EST_BUILD: { compilando: [E("COMPILANDO", "BUILDING"), "neutral"], subido: [E("SUBIDO", "UPLOADED"), "action"], procesando: [E("PROCESANDO", "PROCESSING"), "action"], disponible: [E("DISPONIBLE", "AVAILABLE"), "signal"], fallo: [E("FALLÓ", "FAILED"), "danger"], retirado: [E("RETIRADO", "WITHDRAWN"), "neutral"] } as Record<string, [string, string]>,
  EST_PEDIDO: { pendiente: [E("PENDIENTE", "PENDING"), "neutral"], enviado: [E("ENVIADO", "SENT"), "action"], corriendo: [E("COMPILANDO", "BUILDING"), "action"], terminado: [E("TERMINADO", "FINISHED"), "signal"], sin_llave: [E("SIN TOKEN", "NO TOKEN"), "danger"], error: ["ERROR", "danger"] } as Record<string, [string, string]>,
  EST_TESTER: { invitado: [E("INVITADO", "INVITED"), "action"], activo: [E("ACTIVO", "ACTIVE"), "signal"], pendiente_consola: [E("FALTA EN PLAY", "MISSING IN PLAY"), "action"], quitado: [E("QUITADO", "REMOVED"), "neutral"] } as Record<string, [string, string]>,
  SYNC: { ok: E("Apple al día", "Apple up to date"), pendiente: E("Apple pendiente", "Apple pending"), sin_llave: E("Sin la llave de App Store Connect", "No App Store Connect key"), error: E("Apple no contestó bien", "Apple did not answer correctly") } as Record<string, string>,
  EST_GRUPO: { nuevo: [E("NUEVO", "NEW"), "danger"], visto: [E("VISTO", "SEEN"), "action"], resuelto: [E("RESUELTO", "RESOLVED"), "signal"], silenciado: [E("SILENCIADO", "MUTED"), "neutral"] } as Record<string, [string, string]>,
  TIPO: { js: E("Error de la página", "Page error"), red: E("Sin conexión con el servidor", "No connection to the server"), cierre: E("Cierre de la app", "App crash"), nativo: E("Error nativo", "Native error"), servidor: E("Error del servidor", "Server error") } as Record<string, string>,
  EST_CASO: { new: E("Nuevo", "New"), in_progress: E("En curso", "In progress"), waiting: E("Esperando a la persona", "Waiting on the person"), resolved: E("Resuelto", "Resolved"), reopened: E("Reabierto", "Reopened"), merged: E("Unido", "Merged") } as Record<string, string>,
});
const fechas = (E: EF) => {
  const cuando = (iso: string | null) => (iso ? new Intl.DateTimeFormat(E("es-US", "en-US"), { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "") : "—");
  const hace = (iso: string, ahora: number) => { const m = Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60000)); return m < 1 ? E("ahora", "now") : m < 60 ? E(`hace ${m} min`, `${m} min ago`) : m < 1440 ? E(`hace ${Math.floor(m / 60)} h`, `${Math.floor(m / 60)} h ago`) : cuando(iso); };
  return { cuando, hace };
};
const peso = (b: number | null) => (b == null ? "—" : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export type DatosBeta =
  | { v: "versiones"; builds: FilaBuild[]; tuberia: EstadoTuberia }
  | { v: "testers"; testers: FilaTester[] | null }
  | { v: "salud"; salud: SaludApps; ficha: FichaGrupo | null; filtro: { app: string | null; estado: string | null; tipo: string | null } }
  | { v: "reportes"; reportes: FilaReporte[]; sop: boolean };

/* La segunda fila de pestañas (Resumen · Versiones · Testers · Salud · Reportes): la usa también SistemaApps (Resumen). */
export function subApps(on: VistaApps, ir: (href: string) => void, E: EF = ES): Bloque {
  return { type: "chips", items: textos(E).SUB.map(([k, l]) => ({ l, v: k === on ? "selected" : "filter", onClick: () => ir(k === "resumen" ? "/admin/sistema/apps" : `/admin/sistema/apps?v=${k}`) })) };
}

export function SistemaAppsBeta({ d, editar }: { d: DatosBeta; editar: boolean }) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), w = useAncho(), desk = w >= 1024, E = useE();
  const { PLAT, CANAL, EST_BUILD, EST_PEDIDO, EST_TESTER, SYNC, EST_GRUPO, TIPO, EST_CASO } = textos(E), { cuando, hace } = fechas(E);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [invitando, setInvitando] = useState(false), [pidiendo, setPidiendo] = useState(false);
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Guardado.", "Saved.")); setConf(null); router.refresh(); };
  // 8h · En vivo: mientras un build está en curso o un pedido espera a GitHub, la pantalla se pone al día sola (cada 8 s).
  const vivo = d.v === "versiones" && (d.tuberia.enCurso > 0 || d.tuberia.pedidos.some((p) => ["pendiente", "enviado", "corriendo"].includes(p.estado)));
  useEffect(() => { if (!vivo || conf || pidiendo) return; const t = setInterval(() => router.refresh(), 8000); return () => clearInterval(t); }, [vivo, conf, pidiendo, router]);
  const cabeza: Bloque[] = [
    { type: "head", eye: E("SUPER ADMIN · SISTEMA", "SUPER ADMIN · SYSTEM"), t: "Apps", s: E("Las cuatro apps de las tiendas: versiones, testers del programa beta, la salud (errores y cierres) y los reportes de la gente.", "The four store apps: versions, beta program testers, health (errors and crashes) and reports from people."), h1: desk ? 26 : 22 },
    { type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: E(p.l, p.en), on: p.k === "apps", onClick: () => (p.k === "apps" ? undefined : router.push(p.href)) })) },
    subApps(d.v, (h) => router.push(h), E),
  ];
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("SISTEMA · APPS", "SYSTEM · APPS"), t: "Apps", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  if (pidiendo && d.v === "versiones") return <PedirBuild desk={desk} onBack={() => setPidiendo(false)} onDone={(r) => { setPidiendo(false); hecho(r); }} />;
  if (invitando && d.v === "testers") return <Invitar desk={desk} onBack={() => setInvitando(false)} onDone={(r) => { setInvitando(false); hecho(r); }} />;

  const B: Bloque[] = [...cabeza];
  if (d.v === "versiones") {
    const t = d.tuberia, L = t.llaves, nLl = Object.values(L).filter(Boolean).length;
    B.push({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("EN CURSO", "IN PROGRESS"), v: String(t.enCurso), s: E("compilando, subido o procesando", "building, uploaded or processing"), bg: t.enCurso ? "var(--tl-ink)" : undefined, fg: t.enCurso ? "var(--tl-white)" : undefined },
      { k: E("DISPONIBLES", "AVAILABLE"), v: String(d.builds.filter((b) => b.estado === "disponible").length), s: E("para los testers", "for testers") },
      { k: E("LLAVES DE LA TUBERÍA", "PIPELINE KEYS"), v: E(`${nLl} de 4`, `${nLl} of 4`), s: nLl === 4 ? E("completas", "complete") : E("faltan en el llavero", "missing from the keychain") },
      { k: E("ÚLTIMO CI", "LAST CI"), v: t.ultimaCi ? hace(t.ultimaCi, ahora) : E("nunca", "never"), s: t.ultimaCi ? cuando(t.ultimaCi) : E("espera el dominio con HTTPS", "waiting for the HTTPS domain") }] });
    B.push({ type: "note", tone: t.ultimaCi ? "info" : "warn", icon: t.ultimaCi ? "info" : "lock", t: t.ultimaCi
      ? E("Cada build sube solo desde el CI: pide sus llaves por OIDC (sin ninguna guardada en GitHub), firma, sube a TestFlight interno, Play interno y el APK propio, y avisa aquí. El build es creciente por app, plataforma y canal, y su estado solo avanza.", "Every build uploads on its own from CI: it requests its keys via OIDC (none stored in GitHub), signs, uploads to TestFlight internal, Play internal and our own APK, and reports here. The build number increases per app, platform and channel, and its status only moves forward.")
      : E("El CI de las tiendas todavía no entró: pide sus llaves solo por HTTPS y el servidor de pruebas sigue en HTTP (falta el dominio). Mientras, compila sin llaves y nada se sube a las tiendas. Aquí ves la semilla del sandbox.", "The store CI has not signed in yet: it requests its keys only over HTTPS and the test server is still on HTTP (the domain is missing). Meanwhile it builds without keys and nothing is uploaded to the stores. Here you see the sandbox seed.") });
    if (vivo) B.push({ type: "note", tone: "ok", icon: "clock", t: E("En vivo · esta pantalla se pone al día sola mientras un build está en curso.", "Live · this screen updates itself while a build is in progress.") });
    B.push({ type: "group", k: E("LO QUE NECESITA LA TUBERÍA", "WHAT THE PIPELINE NEEDS") });
    B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: ([["asc_api_key", E("App Store Connect · llave de la API", "App Store Connect · API key"), E("Firma de iOS y subida a TestFlight interno", "iOS signing and upload to TestFlight internal")], ["android_upload_keystore", E("Android · llave de subida", "Android · upload key"), E("Firma del .aab y del APK propio", "Signing of the .aab and our own APK")],
      ["play_service_account", E("Google Play · cuenta de servicio", "Google Play · service account"), E("El servidor sube el .aab a Play interno", "The server uploads the .aab to Play internal")], ["github_token", E("GitHub · token para pedir builds", "GitHub · token to request builds"), E("«Pedir un build» desde aquí", "“Request a build” from here")]] as const).map(([k, l, s]): Fila => ({
      key: k, icon: L[k] ? "key" : "lock", t: l, s, tag: L[k] ? E("VIVA", "LIVE") : E("FALTA", "MISSING"), tone: L[k] ? "signal" : "neutral", ...(editar ? { onClick: () => router.push("/admin/sistema/integraciones") } : { chev: false }) })) });
    if (editar) B.push({ type: "acts", items: [{ l: E("Pedir un build", "Request a build"), v: "primary", icon: "plus", onClick: () => setPidiendo(true) }] });
    B.push({ type: "group", k: `${E("PEDIDOS", "REQUESTS")} · ${t.pedidos.length}` });
    B.push(t.pedidos.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: t.pedidos.map((p): Fila => ({ key: `p${p.id}`, icon: "clock",
      t: `${E("Pedido", "Request")} ${p.id} · ${p.app === "todas" ? E("las cuatro apps", "all four apps") : APP[p.app] ?? p.app} · ${p.plat === "ambas" ? E("iPhone y Android", "iPhone and Android") : PLAT[p.plat] ?? p.plat}`,
      s: [p.motivo, `${p.quien ?? E("equipo", "team")} · ${cuando(p.at)}`, p.builds ? `${p.builds} ${p.builds === 1 ? "build" : "builds"}` : null, p.resultado].filter(Boolean).join(" · "),
      tag: EST_PEDIDO[p.estado]?.[0] ?? p.estado, tone: EST_PEDIDO[p.estado]?.[1] ?? "neutral", chev: false })) }
      : { type: "empty", icon: "clock", t: E("Sin pedidos todavía", "No requests yet"), s: E("«Pedir un build» lanza el CI de las tiendas para una app o las cuatro. Un cambio en lo nativo también lo lanza solo.", "“Request a build” runs the store CI for one app or all four. A native change also runs it on its own.") });
    for (const a of ["cliente", "negocio", "delivery", "checkin"]) {
      const L = d.builds.filter((b) => b.app === a);
      B.push({ type: "group", k: `${(APP[a] ?? a).toUpperCase()} · ${L.length} ${L.length === 1 ? "BUILD" : "BUILDS"}` });
      B.push(L.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: L.map((b): Fila => ({ key: b.id, icon: "phone",
        t: `${PLAT[b.plat]} · ${b.version} (${b.build})`, s: [CANAL[b.canal] ?? b.canal, b.commit ? `commit ${b.commit.slice(0, 7)}` : null, b.size ? peso(b.size) : null, b.sha ? `sha256 ${b.sha.slice(0, 12)}…` : null,
          b.simbolos ? E("con símbolos", "with symbols") : null, b.pedido ? `${E("pedido", "request")} ${b.pedido}` : null, b.envio ? `${E("tienda", "store")}: ${b.envio}` : null, b.estado === "subido" && b.canal === "play_interno" && !d.tuberia.llaves.play_service_account ? E("espera la cuenta de Play", "waiting for the Play account") : null,
          cuando(b.at), b.estado !== "disponible" && b.estado !== "retirado" && b.cambio !== b.at ? `${E("cambió", "changed")} ${hace(b.cambio, ahora)}` : null, b.motivo].filter(Boolean).join(" · "),
        tag: EST_BUILD[b.estado]?.[0] ?? b.estado, tone: EST_BUILD[b.estado]?.[1] ?? "neutral", chev: false, ...(b.ci ? { onClick: () => window.open(b.ci!, "_blank", "noopener") } : {}) })) }
        : { type: "empty", icon: "phone", t: E("Sin builds todavía", "No builds yet"), s: E("Aparecen cuando el CI compile esta app (8h).", "They show up when CI builds this app (8h).") });
    }
  } else if (d.v === "testers" && !d.testers) {
    B.push({ type: "note", tone: "info", icon: "lock", t: E("Solo un Admin ve y cambia los testers (tienen nombre y teléfono).", "Only an Admin sees and changes testers (they have a name and phone).") });
  } else if (d.v === "testers" && d.testers) {
    const T = d.testers, vivos = T.filter((t) => t.estado !== "quitado");
    B.push({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("ACTIVOS", "ACTIVE"), v: String(vivos.filter((t) => t.estado === "activo").length), s: E("prueban hoy", "testing today") }, { k: E("INVITADOS", "INVITED"), v: String(vivos.filter((t) => t.estado === "invitado").length), s: E("esperan a Apple", "waiting on Apple") },
      { k: E("FALTAN EN PLAY", "MISSING IN PLAY"), v: String(vivos.filter((t) => t.estado === "pendiente_consola").length), s: E("paso de Play Console", "Play Console step") }, { k: E("QUITADOS", "REMOVED"), v: String(T.length - vivos.length), s: E("con motivo", "with a reason") }] });
    B.push({ type: "note", tone: "info", icon: "info", t: E("En la Fase 8 la beta es solo interna, contra el sandbox (hasta ~10 personas de confianza). TestFlight interno pide el correo de la cuenta de Apple; Play no deja agregar correos por la API (se agrega en Play Console); el APK propio manda un enlace de un uso a la campana del tester.", "In Phase 8 the beta is internal only, against the sandbox (up to ~10 trusted people). TestFlight internal needs the Apple account email; Play does not allow adding emails through the API (it is added in Play Console); our own APK sends a one-time link to the tester’s bell.") });
    if (editar) B.push({ type: "acts", items: [{ l: E("Invitar a una cuenta", "Invite an account"), v: "primary", icon: "plus", onClick: () => setInvitando(true) }] });
    B.push(T.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: T.map((t): Fila => ({ key: t.id, icon: t.plat === "ios" ? "phone" : "phone", dim: t.estado === "quitado",
      t: `${t.nombre} · ${t.tel}`, s: [`${APP[t.app]} · ${PLAT[t.plat]} · ${CANAL[t.canal]}`, t.correo, t.canal === "testflight" && t.estado !== "quitado" ? (t.syncError ? `${SYNC[t.sync]}: ${t.syncError}` : SYNC[t.sync]) : null,
        t.enlace ? `${E("enlace", "link")} ${t.enlace.estado === "vivo" ? `${E("vivo hasta", "live until")} ${cuando(t.enlace.vence)}` : t.enlace.estado}` : null,
        t.estado === "quitado" ? `${E("quitado", "removed")} ${cuando(t.quitado)} · ${t.quitadoMotivo}` : `${E("invitó", "invited by")} ${t.quien ?? "—"} ${cuando(t.at)} · ${t.motivo}`].filter(Boolean).join(" · "),
      tag: EST_TESTER[t.estado]?.[0] ?? t.estado, tone: EST_TESTER[t.estado]?.[1] ?? "neutral", chev: false,
      ...(editar && t.estado !== "quitado" ? { acts: [
        ...(t.estado === "pendiente_consola" ? [{ l: E("Ya está en la lista", "Already on the list"), icon: "check", onClick: () => setConf({ titulo: `${t.nombre} · ${E("Play interno", "Play internal")}`, cta: E("Marcar", "Mark"), sub: E("Solo cuando ya lo agregaste a la lista de Play interno en Play Console.", "Only once you have added them to the Play internal list in Play Console."), plantillas: [E("Agregado en Play Console", "Added in Play Console")], nota: "interna", hacer: (m) => testerEnPlay(t.id, m) }) }] : []),
        ...(t.canal === "apk_propio" ? [{ l: E("Otro enlace", "New link"), icon: "share", onClick: () => setConf({ titulo: `${t.nombre} · ${E("enlace del APK", "APK link")}`, cta: E("Mandar", "Send"), sub: E("Anula el enlace que siga vivo y le manda uno nuevo de un uso a su campana.", "Cancels any live link and sends a new one-time link to their bell."), plantillas: [E("No le llegó", "They didn’t get it"), E("Se le venció", "It expired"), E("Build nuevo", "New build")], nota: "interna", hacer: (m) => testerEnlace(t.id, m) }) }] : []),
        { l: E("Quitar", "Remove"), icon: "close", onClick: () => setConf({ titulo: E(`Quitar a ${t.nombre}`, `Remove ${t.nombre}`), cta: E("Quitar", "Remove"), peligro: true, sub: t.canal === "testflight" ? E("Sale del grupo interno de TestFlight (y el usuario que creamos para la prueba). Se le avisa.", "Leaves the TestFlight internal group (and the user we created for testing). They are notified.") : E("Deja de probar esta app; su enlace del APK (si tiene) se anula. Se le avisa.", "Stops testing this app; their APK link (if any) is cancelled. They are notified."), plantillas: [E("Terminó la prueba", "Testing finished"), E("Ya no participa", "No longer taking part"), E("Cambió de teléfono", "Changed phones")], nota: "interna", hacer: (m) => testerQuitar(t.id, m) }) },
      ] } : {}) })) } : { type: "empty", icon: "users", t: E("Todavía no hay testers", "No testers yet"), s: E("Invita al fundador y a las personas de confianza que van a probar las apps contra el sandbox.", "Invite the founder and the trusted people who will test the apps against the sandbox.") });
  } else if (d.v === "salud") {
    const s = d.salud, f = d.filtro;
    if (d.ficha) return <Ficha g={d.ficha} desk={desk} editar={editar} onConf={setConf} toast={toast} />;
    const ir = (o: Partial<typeof f> & { cursor?: string | null }) => {
      const x = { ...f, ...o }, q = new URLSearchParams({ v: "salud" });
      if (x.app) q.set("app", x.app); if (x.estado) q.set("estado", x.estado); if (x.tipo) q.set("tipo", x.tipo); if (o.cursor) q.set("c", o.cursor);
      router.push(`/admin/sistema/apps?${q}`);
    };
    B.push({ type: "kpis", cols: desk ? "repeat(5,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("GRUPOS ABIERTOS", "OPEN GROUPS"), v: String(s.kpis.grupos), s: E("nuevos o vistos", "new or seen"), bg: s.kpis.grupos ? "var(--tl-ink)" : undefined, fg: s.kpis.grupos ? "var(--tl-white)" : undefined },
      { k: E("NUEVOS · 24 H", "NEW · 24 H"), v: String(s.kpis.nuevos24) }, { k: E("ERRORES · 24 H", "ERRORS · 24 H"), v: String(s.kpis.eventos24) }, { k: E("ALERTAS · 24 H", "ALERTS · 24 H"), v: String(s.kpis.alertas24), s: E("errores en vivo", "live errors") },
      { k: E("DESCARTADOS", "DROPPED"), v: String(s.kpis.descartados), s: E("por el tope · últimas 24 h (todos los servidores)", "over the cap · last 24 h (all servers)") }] });
    B.push({ type: "group", k: E("SESIONES SIN CIERRE · 7 DÍAS (APROXIMADO)", "CRASH-FREE SESSIONS · 7 DAYS (APPROXIMATE)") });
    B.push(s.sinCierre.length ? { type: "rows", cols: desk ? "repeat(4,minmax(0,1fr))" : "1fr", items: s.sinCierre.map((x): Fila => ({ key: `${x.app}-${x.plat}`, icon: "phone", t: `${APP[x.app] ?? x.app} · ${PLAT[x.plat] ?? x.plat}`,
      r: x.pct == null ? "—" : `${x.pct} %`, s: E(`${x.sesiones} ${x.sesiones === 1 ? "sesión" : "sesiones"} · ${x.conCierre} ${x.conCierre === 1 ? "teléfono" : "teléfonos"} con un cierre`, `${x.sesiones} ${x.sesiones === 1 ? "session" : "sessions"} · ${x.conCierre} ${x.conCierre === 1 ? "phone" : "phones"} with a crash`), chev: false })) }
      : { type: "empty", icon: "phone", t: E("Sin sesiones de las apps todavía", "No app sessions yet"), s: E("La tasa sale cuando haya sesiones desde TestFlight, Play interno o el APK propio.", "The rate shows once there are sessions from TestFlight, Play internal or our own APK.") });
    B.push({ type: "chips", k: "APP", items: [["", E("Todas", "All")], ...Object.entries(APP)].map(([k, l]) => ({ l: l!, v: (f.app ?? "") === k ? "selected" : "filter", onClick: () => ir({ app: k || null }) })) });
    B.push({ type: "chips", k: E("ESTADO", "STATUS"), items: [["", E("Todos", "All")], ["nuevo", E("Nuevos", "New")], ["visto", E("Vistos", "Seen")], ["resuelto", E("Resueltos", "Resolved")], ["silenciado", E("Silenciados", "Muted")]].map(([k, l]) => ({ l: l!, v: (f.estado ?? "") === k ? "selected" : "filter", onClick: () => ir({ estado: k || null }) })) });
    B.push({ type: "chips", k: E("TIPO", "TYPE"), items: [["", E("Todos", "All")], ...Object.entries(TIPO)].map(([k, l]) => ({ l: l!, v: (f.tipo ?? "") === k ? "selected" : "filter", onClick: () => ir({ tipo: k || null }) })) });
    B.push(s.grupos.length ? { type: "rows", k: E("GRUPOS · LO MÁS RECIENTE PRIMERO", "GROUPS · MOST RECENT FIRST"), items: s.grupos.map((g): Fila => ({ key: g.id, icon: g.tipo === "cierre" ? "warning" : g.tipo === "red" ? "info" : "help",
      t: g.titulo, s: `${APP[g.app] ?? g.app} · ${PLAT[g.plat] ?? g.plat} · ${TIPO[g.tipo] ?? g.tipo} · ${g.n} ${g.n === 1 ? E("vez", "time") : E("veces", "times")} · ${g.tel} ${g.tel === 1 ? E("teléfono", "phone") : E("teléfonos", "phones")} · build ${g.build ?? "—"} · ${hace(g.ultimo, ahora)}${g.n24 ? ` · ${g.n24} ${E("hoy", "today")}` : ""}`,
      tag: EST_GRUPO[g.estado]?.[0] ?? g.estado, tone: EST_GRUPO[g.estado]?.[1] ?? "neutral", onClick: () => router.push(`/admin/sistema/apps?v=salud&g=${g.id}`) })),
      ...(s.siguiente ? { link: E("Ver más", "See more"), onLink: () => ir({ cursor: s.siguiente }) } : {}) }
      : { type: "empty", icon: "check", t: E("Sin errores con estos filtros", "No errors with these filters"), s: E("Los errores de la web y de las apps llegan aquí tapados y agrupados. «Errores en vivo» avisa a los Admins de un grupo nuevo, un pico o uno que vuelve.", "Web and app errors arrive here redacted and grouped. “Live errors” alerts Admins to a new group, a spike or one that comes back.") });
  } else if (d.v === "reportes") {
    B.push({ type: "note", tone: "info", icon: "info", t: d.sop ? E("Cada reporte es un caso de Soporte (tema técnico) en la cola de casos, con la captura como foto privada y el registro de la app. Ábrelo para contestar.", "Each report is a Support case (technical topic) in the case queue, with the screenshot as a private photo and the app log. Open it to reply.") : E("Cada reporte es un caso de Soporte; tu rol no abre Soporte, así que aquí solo ves las cifras.", "Each report is a Support case; your role can’t open Support, so here you only see the numbers.") });
    B.push(d.reportes.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: d.reportes.map((r): Fila => ({ key: r.num, icon: "warning",
      t: `${r.num}${r.texto ? ` · ${r.texto}` : ""}`, s: [EST_CASO[r.estado] ?? r.estado, r.device ? `${r.device} · ${r.version ?? "web"}` : null, r.captura ? (r.captura === "agitar" ? E("captura de la pantalla", "screen capture") : E("captura de un archivo", "screenshot from a file")) : E("sin captura", "no screenshot"), E(`${r.lineas} líneas de registro`, `${r.lineas} log lines`), r.negocio ? E("desde el panel", "from the dashboard") : null, cuando(r.at)].filter(Boolean).join(" · "),
      tag: r.estado === "resolved" ? E("RESUELTO", "RESOLVED") : r.estado === "merged" ? E("UNIDO", "MERGED") : E("ABIERTO", "OPEN"), tone: r.estado === "resolved" || r.estado === "merged" ? "signal" : "action",
      ...(d.sop ? { onClick: () => router.push(`/admin/soporte?caso=${r.num}`) } : { chev: false }) })) } : { type: "empty", icon: "warning", t: E("Sin reportes todavía", "No reports yet"), s: E("Llegan cuando alguien toca «Reportar un problema» (o agita el teléfono en una app de prueba).", "They arrive when someone taps “Report a problem” (or shakes the phone in a test app).") });
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}

/* La ficha de un grupo de errores. */
function Ficha({ g, desk, editar, onConf, toast }: { g: FichaGrupo; desk: boolean; editar: boolean; onConf: (c: Confirmar) => void; toast: string | null }) {
  const router = useRouter(), e0 = g.eventos[0], E = useE();
  const { PLAT, EST_GRUPO, TIPO } = textos(E), { cuando } = fechas(E);
  const B: Bloque[] = [{ type: "head", eye: `${E("SALUD", "HEALTH")} · ${(APP[g.app] ?? g.app).toUpperCase()} · ${(PLAT[g.plat] ?? g.plat).toUpperCase()} · ${(TIPO[g.tipo] ?? g.tipo).toUpperCase()}`, t: g.titulo, onBack: () => router.push("/admin/sistema/apps?v=salud"), h1: desk ? 24 : 20 }];
  if (g.regreso && g.estado === "nuevo") B.push({ type: "note", tone: "danger", icon: "warning", t: E(`Volvió ${cuando(g.regreso)} en un build posterior al arreglo: se reabrió solo y avisó a los Admins.`, `Came back ${cuando(g.regreso)} in a build after the fix: it reopened on its own and alerted the Admins.`) });
  if (g.motivo) B.push({ type: "note", tone: g.estado === "silenciado" ? "warn" : "info", icon: "info", t: `${EST_GRUPO[g.estado]?.[0] ?? g.estado} · ${g.quien ?? "—"} · ${cuando(g.cuando)} · ${g.motivo}` });
  B.push({ type: "kv", cols: desk ? 4 : 2, items: [
    { k: E("ESTADO", "STATUS"), v: EST_GRUPO[g.estado]?.[0] ?? g.estado }, { k: E("VECES", "TIMES"), v: String(g.n) }, { k: E("TELÉFONOS (APROX.)", "PHONES (APPROX.)"), v: String(g.tel) }, { k: E("HOY", "TODAY"), v: String(g.n24) },
    { k: E("PRIMERA VEZ", "FIRST SEEN"), v: cuando(g.primero) }, { k: E("ÚLTIMA VEZ", "LAST SEEN"), v: cuando(g.ultimo) }, { k: E("ÚLTIMO BUILD", "LATEST BUILD"), v: g.build ?? "—" }, { k: E("RESUELTO EN", "RESOLVED IN"), v: g.resueltoEn ?? "—" }] });
  if (editar) B.push({ type: "acts", items: [
    ...(g.estado === "nuevo" ? [{ l: E("Visto", "Seen"), v: "secondary", icon: "check", onClick: () => onConf({ titulo: E("Marcar como visto", "Mark as seen"), cta: E("Visto", "Seen"), sub: E("Alguien del equipo ya lo está mirando. Sigue contando y avisando.", "Someone on the team is already looking at it. It keeps counting and alerting."), plantillas: [E("Lo estoy revisando", "I’m looking into it")], nota: "interna", hacer: (m: string) => errorEstado(g.id, "visto", "", m) }) }] : []),
    ...(g.estado !== "resuelto" ? [{ l: E("Resuelto en…", "Resolved in…"), v: "primary", icon: "check", onClick: () => onConf({ titulo: E("Resuelto en el build", "Resolved in build"), cta: E("Guardar", "Save"), sub: E("El build donde quedó arreglado (el número en las apps; el commit en la web). Si vuelve en uno posterior, se reabre solo y avisa.", "The build where it was fixed (the number in the apps; the commit on the web). If it comes back in a later one, it reopens on its own and alerts."), valor: { k: E("BUILD O COMMIT", "BUILD OR COMMIT"), ini: g.build ?? "", max: 12 }, plantillas: [E("Arreglado en este build", "Fixed in this build"), E("Era del servidor: ya corregido", "It was the server: already fixed")], nota: "interna", hacer: (m: string, _e: string | null, v: string) => errorEstado(g.id, "resuelto", v, m) }) }] : []),
    ...(g.estado !== "silenciado" ? [{ l: E("Silenciar", "Mute"), v: "secondary", icon: "close", onClick: () => onConf({ titulo: E("Silenciar este grupo", "Mute this group"), cta: E("Silenciar", "Mute"), peligro: true, sub: E("No avisa más (ni nuevo ni pico); se sigue contando aquí. Pide motivo.", "No more alerts (neither new nor spike); it keeps counting here. Asks for a reason."), plantillas: [E("Es de un navegador viejo", "It’s from an old browser"), E("Ruido de una extensión", "Noise from an extension"), E("Ya se sabe y no afecta", "Known and harmless")], nota: "interna", hacer: (m: string) => errorEstado(g.id, "silenciar", "", m) }) }] : []),
    ...(g.estado === "resuelto" || g.estado === "silenciado" ? [{ l: E("Reabrir", "Reopen"), v: "secondary", icon: "edit", onClick: () => onConf({ titulo: E("Reabrir", "Reopen"), cta: E("Reabrir", "Reopen"), sub: E("Vuelve a «nuevo».", "Goes back to “new”."), plantillas: [E("Sigue pasando", "Still happening"), E("Lo silenciamos por error", "We muted it by mistake")], nota: "interna", hacer: (m: string) => errorEstado(g.id, "reabrir", "", m) }) }] : []),
  ] });
  B.push({ type: "group", k: e0?.simbolizado ? E("STACK · SIMBOLIZADO EN EL SERVIDOR", "STACK · SYMBOLICATED ON THE SERVER") : E("STACK · TAL COMO LLEGÓ (SIN MAPA PARA ESE BUILD)", "STACK · AS RECEIVED (NO MAP FOR THAT BUILD)") });
  const lineas = (e0?.stack ?? "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 25);
  B.push(lineas.length ? { type: "timeline", items: [{ t: e0?.mensaje ?? g.titulo, s: E("MENSAJE", "MESSAGE") }, ...lineas.map((l) => ({ t: l.replace(/^at /, ""), s: undefined as string | undefined }))] } : { type: "note", tone: "info", icon: "info", t: e0?.mensaje ?? E("Sin stack (el teléfono no lo mandó).", "No stack (the phone didn’t send it).") });
  B.push({ type: "group", k: E("POR BUILD", "BY BUILD") });
  B.push({ type: "rows", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: g.builds.map((b): Fila => ({ key: b.build, icon: "phone", t: `Build ${b.build}`, r: String(b.n), chev: false })) });
  B.push({ type: "group", k: E("POR PANTALLA (FAMILIA DE RUTA)", "BY SCREEN (ROUTE FAMILY)") });
  B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: g.rutas.map((r): Fila => ({ key: r.ruta, icon: "search", t: r.ruta, r: String(r.n), chev: false })) });
  B.push({ type: "group", k: E("ÚLTIMAS VECES · SIN PERSONAS", "LATEST OCCURRENCES · NO PEOPLE") });
  B.push({ type: "rows", items: g.eventos.slice(0, 10).map((e, i): Fila => ({ key: `${i}`, icon: "clock", t: `${cuando(e.at)} · build ${e.build ?? "—"}${e.version ? ` (${e.version})` : ""}`, s: [e.os, e.modelo, e.ruta].filter(Boolean).join(" · ") || "—", chev: false })) });
  if (g.alertas.length) {
    B.push({ type: "group", k: E("ERRORES EN VIVO · AVISOS AL EQUIPO", "LIVE ERRORS · TEAM ALERTS") });
    B.push({ type: "rows", items: g.alertas.map((a, i): Fila => ({ key: `${i}`, icon: "bell", t: `${a.tipo === "pico" ? E("Pico", "Spike") : a.tipo === "regresion" ? E("Volvió", "Came back") : E("Nuevo", "New")} · build ${a.build || "—"}`, s: `${a.n} ${a.n === 1 ? E("vez", "time") : E("veces", "times")} · ${cuando(a.at)}`, chev: false })) });
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 980 }}><PanelBloques bloques={B} h1={desk ? 24 : 20} /><Toast t={toast} desk={desk} /></div>;
}

/* 8h · «Pedir un build» (hueco #7: el formulario del sistema, como Invitar): qué app, qué plataforma y el motivo. Lanza el flujo de las tiendas
   en GitHub con el token del llavero; sin el token queda anotado y no se lanza nada. */
function PedirBuild({ desk, onBack, onDone }: { desk: boolean; onBack: () => void; onDone: (r: ResAdm) => void }) {
  const E = useE();
  const [app, setApp] = useState("todas"), [plat, setPlat] = useState("ambas"), [motivo, setMotivo] = useState(""), [err, setErr] = useState<string | null>(null), [pend, start] = useTransition();
  const enviar = () => start(async () => { const r = await buildPedir(app, plat, motivo); if (!r.ok) setErr(r.mensaje ?? E("No se pudo.", "It didn’t work.")); else onDone(r); });
  const B: Bloque[] = [
    { type: "head", eye: E("SISTEMA · APPS · VERSIONES", "SYSTEM · APPS · VERSIONS"), t: E("Pedir un build", "Request a build"), s: E("Lanza el CI de las tiendas: compila, firma y sube a TestFlight interno, Play interno y el APK propio. Unos 15 minutos por app; lo ves en Versiones en vivo.", "Runs the store CI: builds, signs and uploads to TestFlight internal, Play internal and our own APK. About 15 minutes per app; you can watch it live in Versions."), onBack, h1: desk ? 24 : 20 },
    { type: "chips", k: "APP", items: [["todas", E("Las cuatro", "All four")], ...Object.entries(APP).filter(([k]) => k !== "web")].map(([k, l]) => ({ l: l!, v: app === k ? "selected" : "filter", onClick: () => setApp(k!) })) },
    { type: "chips", k: E("PLATAFORMA", "PLATFORM"), items: [["ambas", E("iPhone y Android", "iPhone and Android")], ["ios", "iPhone"], ["android", "Android"]].map(([k, l]) => ({ l: l!, v: plat === k ? "selected" : "filter", onClick: () => setPlat(k!) })) },
    { type: "note", tone: "info", icon: "info", t: E("Sale de la rama de pruebas, con el sabor de pruebas (apunta al sandbox). Las tiendas públicas no se tocan.", "Built from the test branch, with the test flavor (points to the sandbox). The public stores are not touched.") },
    { type: "field", k: E("MOTIVO · QUEDA EN LA AUDITORÍA", "REASON · KEPT IN THE AUDIT LOG"), val: motivo, onChange: setMotivo, area: true, rows: 2, max: 300, count: `${motivo.length}/300` },
    { type: "chips", items: [E("Versión nueva para los testers", "New version for testers"), E("Arreglo en lo nativo", "Native fix"), E("Volver a probar la firma", "Retest signing")].map((p) => ({ l: p, v: motivo === p ? "selected" : "filter", onClick: () => setMotivo(p) })) },
    err ? { type: "note", tone: "danger", icon: "warning", t: err } : null,
    { type: "acts", items: [{ l: pend ? E("Pidiendo…", "Requesting…") : E("Pedir el build", "Request the build"), v: "primary", icon: "check", off: pend || motivo.trim().length < 3, onClick: enviar }, { l: E("Cancelar", "Cancel"), v: "secondary", onClick: onBack }] },
  ].filter(Boolean) as Bloque[];
  return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}><PanelBloques bloques={B} h1={desk ? 24 : 20} /></div>;
}

/* Invitar a una cuenta To'Latino (hueco #7): teléfono de la cuenta, app, por dónde, el correo de Apple (solo TestFlight) y el motivo. */
function Invitar({ desk, onBack, onDone }: { desk: boolean; onBack: () => void; onDone: (r: ResAdm) => void }) {
  const E = useE();
  const [tel, setTel] = useState(""), [app, setApp] = useState("cliente"), [canal, setCanal] = useState("testflight"), [correo, setCorreo] = useState(""), [motivo, setMotivo] = useState("");
  const [err, setErr] = useState<string | null>(null), [pend, start] = useTransition();
  const enviar = () => start(async () => { const r = await testerInvitar(tel, app, canal, correo, motivo); if (!r.ok) setErr(r.mensaje ?? E("No se pudo.", "It didn’t work.")); else onDone(r); });
  const B: Bloque[] = [
    { type: "head", eye: E("SISTEMA · APPS · TESTERS", "SYSTEM · APPS · TESTERS"), t: E("Invitar a una cuenta", "Invite an account"), s: E("La persona ya tiene cuenta en To'Latino (su teléfono). Le llega un aviso; en TestFlight, además, el correo de Apple.", "The person already has a To’Latino account (their phone). They get a notification; on TestFlight, also the Apple email."), onBack, h1: desk ? 24 : 20 },
    { type: "field", k: E("TELÉFONO DE SU CUENTA", "ACCOUNT PHONE"), val: tel, onChange: setTel, ph: "(570) 555-0122", im: "tel", max: 20 },
    { type: "chips", k: "APP", items: Object.entries(APP).filter(([k]) => k !== "web").map(([k, l]) => ({ l, v: app === k ? "selected" : "filter", onClick: () => setApp(k) })) },
    { type: "chips", k: E("POR DÓNDE", "CHANNEL"), items: [["testflight", E("TestFlight interno · iPhone", "TestFlight internal · iPhone")], ["play_interno", E("Play interno · Android", "Play internal · Android")], ["apk_propio", E("APK propio · Android", "Own APK · Android")]].map(([k, l]) => ({ l: l!, v: canal === k ? "selected" : "filter", onClick: () => setCanal(k!) })) },
    canal === "testflight" ? { type: "field", k: E("CORREO DE SU CUENTA DE APPLE", "APPLE ACCOUNT EMAIL"), val: correo, onChange: setCorreo, ph: E("nombre@icloud.com", "name@icloud.com"), im: "email", max: 254, help: E("Apple lo pide para invitar al equipo de prueba. Se guarda cifrado; aquí solo se ve tapado.", "Apple needs it to invite to the test team. It is stored encrypted; here it only shows masked.") } : null,
    canal === "play_interno" ? { type: "note", tone: "warn", icon: "info", t: E("Play no deja agregar un correo por la API: después de invitar, agrégalo a la lista de Play interno en Play Console y marca «Ya está en la lista». Mientras, el APK propio funciona sin Play.", "Play doesn’t allow adding an email through the API: after inviting, add it to the Play internal list in Play Console and tap “Already on the list”. Meanwhile, our own APK works without Play.") } : null,
    { type: "field", k: E("MOTIVO · QUEDA EN LA AUDITORÍA", "REASON · KEPT IN THE AUDIT LOG"), val: motivo, onChange: setMotivo, area: true, rows: 2, max: 300, count: `${motivo.length}/300` },
    { type: "chips", items: [E("Prueba interna del fundador", "Founder internal test"), E("Persona de confianza", "Trusted person"), E("Equipo de To'Latino", "To’Latino team")].map((p) => ({ l: p, v: motivo === p ? "selected" : "filter", onClick: () => setMotivo(p) })) },
    err ? { type: "note", tone: "danger", icon: "warning", t: err } : null,
    { type: "acts", items: [{ l: pend ? E("Invitando…", "Inviting…") : E("Invitar", "Invite"), v: "primary", icon: "check", off: pend || !tel.trim() || motivo.trim().length < 3, onClick: enviar }, { l: E("Cancelar", "Cancel"), v: "secondary", onClick: onBack }] },
  ].filter(Boolean) as Bloque[];
  return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}><PanelBloques bloques={B} h1={desk ? 24 : 20} /></div>;
}
