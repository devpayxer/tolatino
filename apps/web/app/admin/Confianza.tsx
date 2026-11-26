"use client";
/* 5d · ADM-CONF · Confianza y seguridad (Super Admin.dc.html secConf): cifras, lo que espera una decisión (unido con Colas: rep ·
   repUsr · chat · medios · apel), cómo funciona, catálogo de sanciones con su efecto en la Comunidad, sancionados, apelaciones (segunda
   revisión), fraude (cuentas por dispositivo, reseñas en ráfaga, redes de votos y seguidores; dispositivos bloqueados) y privacidad
   (solo lectura). La pestaña «Reglas del sello» del prototipo vive en Colas › Sello. Solo bloques del sistema; el servidor decide. */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Confianza as D } from "@/lib/admin-confianza";
import { COLAS } from "@/lib/colas";
import { APELABLE, REGLA_L, type Apelable } from "@/lib/moderacion-comun";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { evtCasoSenal } from "./acciones-eventos";
import type { ResAdm } from "./acciones-colas";
import { SENAL_L_UI } from "@/lib/evt-comun";
import { useE2 } from "./idioma-admin";

type EF = (es: string, en: string) => string;

type Tab = "res" | "sanc" | "act" | "apel" | "fraud" | "priv";
let EN = false;
const fecha = (d: string) => new Date(d).toLocaleDateString(EN ? "en-US" : "es-US", { day: "numeric", month: "short", year: "numeric", timeZone: "America/New_York" });
const EST = (E2: EF): Record<string, string> => ({ open: E2("EN REVISIÓN", "UNDER REVIEW"), upheld: E2("SE MANTIENE", "UPHELD"), lifted: E2("LEVANTADA", "LIFTED") });

export function Confianza({ d, tab }: { d: D; tab: Tab }) {
  const router = useRouter(), path = usePathname(), desk = useAncho() >= 1024, cols = desk ? "repeat(auto-fill,minmax(320px,1fr))" : undefined, { E2 } = useE2();
  EN = E2("", "x") === "x"; const est = EST(E2);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  const reportes = d.cola.rep!.n + d.cola.repUsr!.n + d.cola.chat!.n + d.cola.medios!.n, activas = d.sanc.length;
  const B: Bloque[] = [
    { type: "head", eye: "CONTROL", t: E2("Confianza y seguridad", "Trust and safety"), s: E2("Reportes, catálogo de sanciones, apelaciones con segunda revisión, fraude y bloqueos, y privacidad. Toda acción sobre una persona avisa con el motivo y abre la apelación.", "Reports, sanctions catalog, appeals with a second review, fraud and blocks, and privacy. Every action on a person notifies them with the reason and opens the appeal."), h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E2("REPORTES ABIERTOS", "OPEN REPORTS"), v: String(reportes), s: d.cola.rep!.tarde + d.cola.repUsr!.tarde ? E2("hay fuera de plazo", "some are overdue") : E2("al día", "up to date"), bg: reportes ? "var(--tl-ink)" : undefined, fg: reportes ? "var(--tl-white)" : undefined, onClick: () => router.push("/admin/colas?cola=rep") },
      { k: E2("APELACIONES", "APPEALS"), v: String(d.cola.apel!.n), s: E2("segunda persona revisa", "a second person reviews"), onClick: () => router.push("/admin/colas?cola=apel") },
      { k: E2("SANCIONES ACTIVAS", "ACTIVE SANCTIONS"), v: String(activas), s: E2("personas", "people"), onClick: () => router.push(`${path}?tab=act`) },
      { k: E2("FRAUDE · 30 D", "FRAUD · 30 D"), v: String(d.fraude.length + d.evt.length), s: d.evt.length ? E2(`redes, ráfagas y ${d.evt.length} de Eventos`, `rings, bursts and ${d.evt.length} from Events`) : E2("redes y ráfagas marcadas", "rings and bursts flagged"), onClick: () => router.push(`${path}?tab=fraud`) },
    ] },
    { type: "tabs", items: ([["res", E2("Resumen", "Overview")], ["sanc", E2("Catálogo de sanciones", "Sanctions catalog")], ["act", E2("Sancionados", "Sanctioned")], ["apel", E2("Apelaciones", "Appeals")], ["fraud", E2("Fraude y bloqueos", "Fraud and blocks")], ["priv", E2("Privacidad", "Privacy")]] as [Tab, string][])
      .map(([k, l]) => ({ l, on: tab === k, onClick: () => router.push(k === "res" ? path : `${path}?tab=${k}`) })) },
  ];
  if (tab === "res") {
    B.push({ type: "group", k: E2("LO QUE ESPERA UNA DECISIÓN", "WAITING FOR A DECISION"), first: true, link: E2("Ir a Colas", "Go to Queues"), onLink: () => router.push("/admin/colas") });
    B.push({ type: "rows", cols, items: (["rep", "repUsr", "chat", "medios", "apel"] as const).map((k) => { const x = d.cola[k]!; return {
      key: k, icon: COLAS[k].icon, t: EN ? COLAS[k].en : COLAS[k].es, s: x.n ? E2(`${x.n} esperando${x.tarde ? ` · ${x.tarde} fuera de plazo` : ""} ${x.sla ? ` · plazo ${x.sla} h` : ""}`, `${x.n} waiting${x.tarde ? ` · ${x.tarde} overdue` : ""} ${x.sla ? ` · ${x.sla} h deadline` : ""}`) : E2("Al día", "Up to date"), r: String(x.n), chev: true, onClick: () => router.push(`/admin/colas?cola=${k}`) }; }) });
    B.push({ type: "group", k: E2("CÓMO FUNCIONA", "HOW IT WORKS") });
    B.push({ type: "timeline", k: E2("FLUJO", "FLOW"), items: [
      { t: E2("Reporte o regla automática", "Report or automatic rule"), s: E2("Entra a una cola con plazo. Lo reportado deja de verse solo para quien reporta; las reglas marcan y una persona decide. Solo se oculta solo con 5 reportes de personas y dispositivos distintos.", "It enters a queue with a deadline. What’s reported is hidden only for the reporter; rules flag and a person decides. It only hides on its own with 5 reports from different people and devices.") },
      { t: E2("Una persona decide con motivo", "A person decides with a reason"), s: E2("Plantillas de motivo; queda en la auditoría.", "Reason templates; it stays in the audit log.") },
      { t: E2(`Aviso a la persona + apelación ${d.apelarDias} días`, `Notice to the person + ${d.apelarDias}-day appeal`), s: E2("El motivo se envía tal cual; «Apelar» está en el aviso.", "The reason is sent as is; “Appeal” is in the notice.") },
      { t: E2("Otra persona revisa la apelación", "Someone else reviews the appeal"), s: E2("Nunca quien ocultó o sancionó (la base lo impide). Baneo, solo un Admin. Es final.", "Never whoever hid or sanctioned (the database prevents it). Bans, only an Admin. It’s final.") },
    ] });
  }
  if (tab === "sanc") {
    B.push({ type: "note", tone: "ink", icon: "scale", t: E2(`Escalera: advertencia → silencio 7 días → bloquear publicación 30 días → suspender 14 días → baneo (solo un Admin). La reincidencia sube un peldaño. Todas avisan con el motivo y se apelan ${d.apelarDias} días.`, `Ladder: warning → 7-day mute → 30-day posting block → 14-day suspension → ban (Admin only). Repeat offenses move up a step. All notify with the reason and can be appealed for ${d.apelarDias} days.`) });
    B.push({ type: "rows", cols, items: d.catalogo.map((s) => ({ key: s.k, icon: s.k === "ban" ? "ban" : "users", t: EN ? s.en : s.es, s: `${s.dias ? E2(`${s.dias} días · se levanta sola`, `${s.dias} days · lifts on its own`) : s.k === "ban" ? E2("Permanente · lo confirma un Admin", "Permanent · an Admin confirms it") : E2("Hasta que una persona la levante", "Until a person lifts it")} · ${E2("En la Comunidad", "In the Community")}: ${EN ? s.com.en : s.com.es}`, tag: s.m, tone: s.k === "ban" || s.k === "susp14" ? "danger" : "neutral" })) });
  }
  if (tab === "act") B.push(d.sanc.length ? { type: "rows", items: d.sanc.map((x) => ({ key: x.id, icon: "shield", t: x.quien, s: `${x.reason} · ${E2("desde", "since")} ${fecha(x.at)}${x.hasta ? ` · ${E2("hasta", "until")} ${fecha(x.hasta)}` : ""}${x.ciudad ? ` · ${x.ciudad}` : ""}${x.apelada ? ` · ${E2("apelación", "appeal")} ${(est[x.apelada] ?? x.apelada).toLowerCase()}` : ""}`,
    tag: ({ adv: E2("ADVERTENCIA", "WARNING"), mute7: E2("SILENCIO", "MUTED"), nopub: E2("SIN PUBLICAR", "NO POSTING"), susp14: E2("SUSPENDIDA", "SUSPENDED"), ban: E2("BANEADA", "BANNED") } as Record<string, string>)[x.kind] ?? x.kind.toUpperCase(), tone: x.kind === "ban" || x.kind === "susp14" ? "danger" : "action", chev: true, onClick: () => router.push(`/admin/usuarios/${x.uid}`) })) }
    : { type: "empty", icon: "check", t: E2("Nadie sancionado", "No one sanctioned"), s: E2("No hay sanciones vigentes en tus ciudades.", "No active sanctions in your cities.") });
  if (tab === "apel") B.push(d.apel.length ? { type: "rows", items: d.apel.map((a) => ({ key: a.id, icon: "scale", t: `${a.numero} · ${a.quien}`, s: `${(EN ? APELABLE[a.k as Apelable]?.en : APELABLE[a.k as Apelable]?.es) ?? a.k} · ${E2("enviada", "sent")} ${fecha(a.at)}${a.decidida ? ` · ${E2("decidida", "decided")} ${fecha(a.decidida)}` : ""}`,
    tag: est[a.estado] ?? a.estado, tone: a.estado === "open" ? "action" : a.estado === "lifted" ? "signal" : "neutral", chev: !!a.caso, onClick: a.caso ? () => router.push(`/admin/colas?cola=apel&caso=${a.caso}`) : undefined })) }
    : { type: "empty", icon: "check", t: E2("Sin apelaciones", "No appeals"), s: E2("Cuando alguien apele, llega aquí y a Colas › Apelaciones.", "When someone appeals, it arrives here and in Queues › Appeals.") });
  if (tab === "fraud") {
    B.push({ type: "group", k: E2("REDES Y RÁFAGAS · 30 DÍAS", "RINGS AND BURSTS · 30 DAYS"), first: true });
    B.push(d.fraude.length ? { type: "rows", items: d.fraude.map((f) => ({ key: f.id, icon: f.regla === "red" ? "users" : "star", t: `${REGLA_L[f.regla] ?? f.regla} · ${f.quien ?? E2("Vecino", "Neighbor")}`, s: `${f.detalle} · ${fecha(f.at)}`,
      tag: f.abierto ? E2("CASO ABIERTO", "OPEN CASE") : E2("REVISADO", "REVIEWED"), tone: f.abierto ? "danger" : "neutral", chev: true, onClick: () => router.push(f.abierto && f.caso ? `/admin/colas?cola=repUsr&caso=${f.caso}` : `/admin/usuarios/${f.uid}`) })) }
      : { type: "empty", icon: "shield", t: E2("Nada marcado", "Nothing flagged"), s: E2("Votos o seguidores desde un mismo dispositivo y reseñas en ráfaga aparecen aquí (el barrido revisa cada minuto).", "Votes or followers from the same device and review bursts show here (the sweep checks every minute).") });
    // 9k · La misma tarjeta en varias cuentas (por su huella, card.fingerprint; L938): se mira cada cuenta; la señal no sanciona sola.
    B.push({ type: "group", k: E2("LA MISMA TARJETA EN VARIAS CUENTAS · 90 DÍAS", "SAME CARD ON SEVERAL ACCOUNTS · 90 DAYS") });
    B.push(d.tarjetas.length ? { type: "rows", items: d.tarjetas.map((x) => ({ key: x.huella, icon: "card", t: `${x.marca ? x.marca.toUpperCase() : E2("Tarjeta", "Card")}${x.l4 ? ` ·· ${x.l4}` : ""} · ${x.cuentas} ${E2("cuentas", "accounts")}`,
      s: `${x.nombres.join(", ")} · ${E2("última vez", "last seen")} ${fecha(x.ultima)}`, tag: x.cuentas >= 5 ? E2("REVISAR", "REVIEW") : null, tone: "danger", chev: true, onClick: () => router.push(`/admin/usuarios/${x.uid}?tab=act`) })) }
      : { type: "empty", icon: "card", t: E2("Ninguna tarjeta en varias cuentas", "No card on several accounts"), s: E2("La misma tarjeta (por su huella) guardada o usada en varias cuentas aparece aquí, desde el número de Configuración › Dinero.", "The same card (by its fingerprint) saved or used on several accounts shows here, from the number in Settings › Money.") });
    // 6j · Eventos (admin-dashboard L291 «boletos duplicados», hueco #9): la señal no sanciona sola; «Abrir caso» la manda a Reportes de usuario.
    B.push({ type: "group", k: E2("EVENTOS Y BOLETOS · 30 DÍAS", "EVENTS AND TICKETS · 30 DAYS") });
    B.push(d.evt.length ? { type: "rows", items: d.evt.map((x) => ({ key: `${x.kind}${x.uid}`, icon: "ticket", t: `${SENAL_L_UI[x.kind]?.t ?? x.kind} · ${x.quien}`, s: `${SENAL_L_UI[x.kind]?.s(x.n) ?? x.n} · ${x.ciudad ?? E2("Sin ciudad", "No city")} · ${fecha(x.at)}`,
      tag: x.abierto ? E2("CASO ABIERTO", "OPEN CASE") : x.caso ? E2("REVISADO", "REVIEWED") : null, tone: x.abierto ? "danger" : "neutral", chev: true,
      onClick: () => router.push(x.abierto && x.caso ? `/admin/colas?cola=repUsr&caso=${x.caso}` : `/admin/usuarios/${x.uid}?tab=act`),
      acts: !x.abierto && d.abreCaso ? [{ l: E2("Abrir caso", "Open case"), icon: "shield", onClick: () => setConf({ titulo: E2(`Caso de Eventos · ${x.quien}`, `Events case · ${x.quien}`), cta: E2("Abrir caso", "Open case"),
        sub: E2("Va a Colas › Reportes de usuario con la marca «Señal de Eventos». Lo decide una persona, con la escalera de sanciones y la apelación. Queda en la auditoría.", "It goes to Queues › User reports marked “Events signal”. A person decides, with the sanctions ladder and the appeal. It stays in the audit log."),
        plantillas: [E2("Posible reventa de boletos", "Possible ticket resale"), E2("Compra con bots", "Bot purchasing"), E2("Entradas duplicadas en la puerta", "Duplicate entries at the door"), E2("Contracargos repetidos", "Repeated chargebacks")], nota: "interna", hacer: (m) => evtCasoSenal(x.uid, x.kind, m) }) }] : undefined })) }
      : { type: "empty", icon: "ticket", t: E2("Nada marcado en Eventos", "Nothing flagged in Events"), s: E2("Órdenes en ráfaga desde un dispositivo, boletos recibidos y pasados a otro, entradas duplicadas y contracargos de boletos aparecen aquí.", "Order bursts from one device, tickets received and passed on, duplicate entries and ticket chargebacks show here.") });
    B.push({ type: "group", k: E2("CUENTAS POR DISPOSITIVO · 3 O MÁS · 90 DÍAS", "ACCOUNTS PER DEVICE · 3 OR MORE · 90 DAYS") });
    B.push(d.disp.length ? { type: "rows", items: d.disp.map((x) => ({ key: x.device, icon: "phone", t: E2(`${x.cuentas} cuentas en un dispositivo`, `${x.cuentas} accounts on one device`), s: `${x.nombres.join(", ")} · ${E2("última vez", "last seen")} ${fecha(x.ultima)}`, tag: x.bloqueado ? E2("BLOQUEADO", "BLOCKED") : undefined, tone: "danger", chev: true, onClick: () => router.push(`/admin/usuarios/${x.uid}`) })) }
      : { type: "empty", icon: "check", t: E2("Ningún dispositivo con 3 cuentas o más", "No device with 3 or more accounts"), s: E2("Los votos entre cuentas de un mismo dispositivo ya no cuentan ni dan puntos.", "Votes between accounts on the same device no longer count or earn points.") });
    B.push({ type: "group", k: E2("LISTAS DE BLOQUEO", "BLOCK LISTS") }, { type: "kv", cols: 2, items: [{ k: E2("DISPOSITIVOS BLOQUEADOS", "BLOCKED DEVICES"), v: String(d.bloqueados) }, { k: E2("CÓMO SE BLOQUEA", "HOW TO BLOCK"), v: E2("Usuarios › 360° › Seguridad", "Users › 360° › Security") }] });
  }
  if (tab === "priv") {
    B.push({ type: "note", tone: "info", t: E2("Solo lectura: así se cuida la privacidad en To'Latino. Cambiarlo es una decisión del fundador.", "Read only: this is how privacy is protected on To'Latino. Changing it is the founder’s decision.") });
    B.push({ type: "rows", cols, items: [
      ["phone", E2("Teléfonos", "Phones"), E2("Nunca visibles entre vecinos; la base no guarda un teléfono en lo que escribe un vecino. El del negocio, solo en su página.", "Never visible between neighbors; the database doesn’t store a phone in what a neighbor writes. A business’s, only on its page.")],
      ["pin", E2("Ubicación", "Location"), E2("Una publicación lleva el centro del barrio, nunca el GPS ni la dirección de nadie.", "A post carries the neighborhood center, never anyone’s GPS or address.")],
      ["chat", E2("Mensajes entre vecinos", "Messages between neighbors"), E2("El equipo los lee solo con un reporte abierto de esa conversación, o solo el mensaje apelado mientras la apelación sigue abierta.", "The team reads them only with an open report on that conversation, or only the appealed message while the appeal is open.")],
      ["warning", E2("Reportes", "Reports"), E2("Nadie sabe quién reportó. Quien reporta deja de verlo; los demás lo siguen viendo mientras una persona decide.", "Nobody knows who reported. The reporter stops seeing it; others still see it while a person decides.")],
      ["shield", E2("Estatus migratorio", "Immigration status"), E2("Nunca se pide. Señalar el estatus de alguien es doxxing: la lista «Inmigración» lo manda a revisión con prioridad.", "Never asked. Pointing out someone’s status is doxxing: the “Immigration” list sends it to priority review.")],
      ["trash", E2("Borrado de cuenta", "Account deletion"), E2("30 días de gracia: la persona lo puede cancelar en Ajustes antes de esa fecha.", "30-day grace period: the person can cancel it in Settings before that date.")],
    ].map(([ic, t, s]) => ({ key: t!, icon: ic!, t: t!, s: s! })) });
  }
  if (conf) return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}><PanelBloques bloques={[B[0]!]} h1={22} /><ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} /><Toast t={toast} desk={desk} /></div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
