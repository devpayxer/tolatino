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

type Tab = "res" | "sanc" | "act" | "apel" | "fraud" | "priv";
const fecha = (d: string) => new Date(d).toLocaleDateString("es-US", { day: "numeric", month: "short", year: "numeric", timeZone: "America/New_York" });
const EST: Record<string, string> = { open: "EN REVISIÓN", upheld: "SE MANTIENE", lifted: "LEVANTADA" };

export function Confianza({ d, tab }: { d: D; tab: Tab }) {
  const router = useRouter(), path = usePathname(), desk = useAncho() >= 1024, cols = desk ? "repeat(auto-fill,minmax(320px,1fr))" : undefined;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const reportes = d.cola.rep!.n + d.cola.repUsr!.n + d.cola.chat!.n + d.cola.medios!.n, activas = d.sanc.length;
  const B: Bloque[] = [
    { type: "head", eye: "CONTROL", t: "Confianza y seguridad", s: "Reportes, catálogo de sanciones, apelaciones con segunda revisión, fraude y bloqueos, y privacidad. Toda acción sobre una persona avisa con el motivo y abre la apelación.", h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "REPORTES ABIERTOS", v: String(reportes), s: d.cola.rep!.tarde + d.cola.repUsr!.tarde ? "hay fuera de plazo" : "al día", bg: reportes ? "var(--tl-ink)" : undefined, fg: reportes ? "var(--tl-white)" : undefined, onClick: () => router.push("/admin/colas?cola=rep") },
      { k: "APELACIONES", v: String(d.cola.apel!.n), s: "segunda persona revisa", onClick: () => router.push("/admin/colas?cola=apel") },
      { k: "SANCIONES ACTIVAS", v: String(activas), s: "personas", onClick: () => router.push(`${path}?tab=act`) },
      { k: "FRAUDE · 30 D", v: String(d.fraude.length + d.evt.length), s: d.evt.length ? `redes, ráfagas y ${d.evt.length} de Eventos` : "redes y ráfagas marcadas", onClick: () => router.push(`${path}?tab=fraud`) },
    ] },
    { type: "tabs", items: ([["res", "Resumen"], ["sanc", "Catálogo de sanciones"], ["act", "Sancionados"], ["apel", "Apelaciones"], ["fraud", "Fraude y bloqueos"], ["priv", "Privacidad"]] as [Tab, string][])
      .map(([k, l]) => ({ l, on: tab === k, onClick: () => router.push(k === "res" ? path : `${path}?tab=${k}`) })) },
  ];
  if (tab === "res") {
    B.push({ type: "group", k: "LO QUE ESPERA UNA DECISIÓN", first: true, link: "Ir a Colas", onLink: () => router.push("/admin/colas") });
    B.push({ type: "rows", cols, items: (["rep", "repUsr", "chat", "medios", "apel"] as const).map((k) => { const x = d.cola[k]!; return {
      key: k, icon: COLAS[k].icon, t: COLAS[k].es, s: x.n ? `${x.n} esperando${x.tarde ? ` · ${x.tarde} fuera de plazo` : ""} ${x.sla ? ` · plazo ${x.sla} h` : ""}` : "Al día", r: String(x.n), chev: true, onClick: () => router.push(`/admin/colas?cola=${k}`) }; }) });
    B.push({ type: "group", k: "CÓMO FUNCIONA" });
    B.push({ type: "timeline", k: "FLUJO", items: [
      { t: "Reporte o regla automática", s: "Entra a una cola con plazo. Lo reportado deja de verse solo para quien reporta; las reglas marcan y una persona decide. Solo se oculta solo con 5 reportes de personas y dispositivos distintos." },
      { t: "Una persona decide con motivo", s: "Plantillas de motivo; queda en la auditoría." },
      { t: `Aviso a la persona + apelación ${d.apelarDias} días`, s: "El motivo se envía tal cual; «Apelar» está en el aviso." },
      { t: "Otra persona revisa la apelación", s: "Nunca quien ocultó o sancionó (la base lo impide). Baneo, solo un Admin. Es final." },
    ] });
  }
  if (tab === "sanc") {
    B.push({ type: "note", tone: "ink", icon: "scale", t: `Escalera: advertencia → silencio 7 días → bloquear publicación 30 días → suspender 14 días → baneo (solo un Admin). La reincidencia sube un peldaño. Todas avisan con el motivo y se apelan ${d.apelarDias} días.` });
    B.push({ type: "rows", cols, items: d.catalogo.map((s) => ({ key: s.k, icon: s.k === "ban" ? "ban" : "users", t: s.es, s: `${s.dias ? `${s.dias} días · se levanta sola` : s.k === "ban" ? "Permanente · lo confirma un Admin" : "Hasta que una persona la levante"} · En la Comunidad: ${s.com.es}`, tag: s.m, tone: s.k === "ban" || s.k === "susp14" ? "danger" : "neutral" })) });
  }
  if (tab === "act") B.push(d.sanc.length ? { type: "rows", items: d.sanc.map((x) => ({ key: x.id, icon: "shield", t: x.quien, s: `${x.reason} · desde ${fecha(x.at)}${x.hasta ? ` · hasta ${fecha(x.hasta)}` : ""}${x.ciudad ? ` · ${x.ciudad}` : ""}${x.apelada ? ` · apelación ${x.apelada.replace("open", "en revisión").replace("upheld", "se mantiene").replace("lifted", "levantada")}` : ""}`,
    tag: ({ adv: "ADVERTENCIA", mute7: "SILENCIO", nopub: "SIN PUBLICAR", susp14: "SUSPENDIDA", ban: "BANEADA" } as Record<string, string>)[x.kind] ?? x.kind.toUpperCase(), tone: x.kind === "ban" || x.kind === "susp14" ? "danger" : "action", chev: true, onClick: () => router.push(`/admin/usuarios/${x.uid}`) })) }
    : { type: "empty", icon: "check", t: "Nadie sancionado", s: "No hay sanciones vigentes en tus ciudades." });
  if (tab === "apel") B.push(d.apel.length ? { type: "rows", items: d.apel.map((a) => ({ key: a.id, icon: "scale", t: `${a.numero} · ${a.quien}`, s: `${APELABLE[a.k as Apelable]?.es ?? a.k} · enviada ${fecha(a.at)}${a.decidida ? ` · decidida ${fecha(a.decidida)}` : ""}`,
    tag: EST[a.estado] ?? a.estado, tone: a.estado === "open" ? "action" : a.estado === "lifted" ? "signal" : "neutral", chev: !!a.caso, onClick: a.caso ? () => router.push(`/admin/colas?cola=apel&caso=${a.caso}`) : undefined })) }
    : { type: "empty", icon: "check", t: "Sin apelaciones", s: "Cuando alguien apele, llega aquí y a Colas › Apelaciones." });
  if (tab === "fraud") {
    B.push({ type: "group", k: "REDES Y RÁFAGAS · 30 DÍAS", first: true });
    B.push(d.fraude.length ? { type: "rows", items: d.fraude.map((f) => ({ key: f.id, icon: f.regla === "red" ? "users" : "star", t: `${REGLA_L[f.regla] ?? f.regla} · ${f.quien ?? "Vecino"}`, s: `${f.detalle} · ${fecha(f.at)}`,
      tag: f.abierto ? "CASO ABIERTO" : "REVISADO", tone: f.abierto ? "danger" : "neutral", chev: true, onClick: () => router.push(f.abierto && f.caso ? `/admin/colas?cola=repUsr&caso=${f.caso}` : `/admin/usuarios/${f.uid}`) })) }
      : { type: "empty", icon: "shield", t: "Nada marcado", s: "Votos o seguidores desde un mismo dispositivo y reseñas en ráfaga aparecen aquí (el barrido revisa cada minuto)." });
    // 9k · La misma tarjeta en varias cuentas (por su huella, card.fingerprint; L938): se mira cada cuenta; la señal no sanciona sola.
    B.push({ type: "group", k: "LA MISMA TARJETA EN VARIAS CUENTAS · 90 DÍAS" });
    B.push(d.tarjetas.length ? { type: "rows", items: d.tarjetas.map((x) => ({ key: x.huella, icon: "card", t: `${x.marca ? x.marca.toUpperCase() : "Tarjeta"}${x.l4 ? ` ·· ${x.l4}` : ""} · ${x.cuentas} cuentas`,
      s: `${x.nombres.join(", ")} · última vez ${fecha(x.ultima)}`, tag: x.cuentas >= 5 ? "REVISAR" : null, tone: "danger", chev: true, onClick: () => router.push(`/admin/usuarios/${x.uid}?tab=act`) })) }
      : { type: "empty", icon: "card", t: "Ninguna tarjeta en varias cuentas", s: "La misma tarjeta (por su huella) guardada o usada en varias cuentas aparece aquí, desde el número de Configuración › Dinero." });
    // 6j · Eventos (admin-dashboard L291 «boletos duplicados», hueco #9): la señal no sanciona sola; «Abrir caso» la manda a Reportes de usuario.
    B.push({ type: "group", k: "EVENTOS Y BOLETOS · 30 DÍAS" });
    B.push(d.evt.length ? { type: "rows", items: d.evt.map((x) => ({ key: `${x.kind}${x.uid}`, icon: "ticket", t: `${SENAL_L_UI[x.kind]?.t ?? x.kind} · ${x.quien}`, s: `${SENAL_L_UI[x.kind]?.s(x.n) ?? x.n} · ${x.ciudad ?? "Sin ciudad"} · ${fecha(x.at)}`,
      tag: x.abierto ? "CASO ABIERTO" : x.caso ? "REVISADO" : null, tone: x.abierto ? "danger" : "neutral", chev: true,
      onClick: () => router.push(x.abierto && x.caso ? `/admin/colas?cola=repUsr&caso=${x.caso}` : `/admin/usuarios/${x.uid}?tab=act`),
      acts: !x.abierto && d.abreCaso ? [{ l: "Abrir caso", icon: "shield", onClick: () => setConf({ titulo: `Caso de Eventos · ${x.quien}`, cta: "Abrir caso",
        sub: "Va a Colas › Reportes de usuario con la marca «Señal de Eventos». Lo decide una persona, con la escalera de sanciones y la apelación. Queda en la auditoría.",
        plantillas: ["Posible reventa de boletos", "Compra con bots", "Entradas duplicadas en la puerta", "Contracargos repetidos"], hacer: (m) => evtCasoSenal(x.uid, x.kind, m) }) }] : undefined })) }
      : { type: "empty", icon: "ticket", t: "Nada marcado en Eventos", s: "Órdenes en ráfaga desde un dispositivo, boletos recibidos y pasados a otro, entradas duplicadas y contracargos de boletos aparecen aquí." });
    B.push({ type: "group", k: "CUENTAS POR DISPOSITIVO · 3 O MÁS · 90 DÍAS" });
    B.push(d.disp.length ? { type: "rows", items: d.disp.map((x) => ({ key: x.device, icon: "phone", t: `${x.cuentas} cuentas en un dispositivo`, s: `${x.nombres.join(", ")} · última vez ${fecha(x.ultima)}`, tag: x.bloqueado ? "BLOQUEADO" : undefined, tone: "danger", chev: true, onClick: () => router.push(`/admin/usuarios/${x.uid}`) })) }
      : { type: "empty", icon: "check", t: "Ningún dispositivo con 3 cuentas o más", s: "Los votos entre cuentas de un mismo dispositivo ya no cuentan ni dan puntos." });
    B.push({ type: "group", k: "LISTAS DE BLOQUEO" }, { type: "kv", cols: 2, items: [{ k: "DISPOSITIVOS BLOQUEADOS", v: String(d.bloqueados) }, { k: "CÓMO SE BLOQUEA", v: "Usuarios › 360° › Seguridad" }] });
  }
  if (tab === "priv") {
    B.push({ type: "note", tone: "info", t: "Solo lectura: así se cuida la privacidad en To'Latino. Cambiarlo es una decisión del fundador." });
    B.push({ type: "rows", cols, items: [
      ["phone", "Teléfonos", "Nunca visibles entre vecinos; la base no guarda un teléfono en lo que escribe un vecino. El del negocio, solo en su página."],
      ["pin", "Ubicación", "Una publicación lleva el centro del barrio, nunca el GPS ni la dirección de nadie."],
      ["chat", "Mensajes entre vecinos", "El equipo los lee solo con un reporte abierto de esa conversación, o solo el mensaje apelado mientras la apelación sigue abierta."],
      ["warning", "Reportes", "Nadie sabe quién reportó. Quien reporta deja de verlo; los demás lo siguen viendo mientras una persona decide."],
      ["shield", "Estatus migratorio", "Nunca se pide. Señalar el estatus de alguien es doxxing: la lista «Inmigración» lo manda a revisión con prioridad."],
      ["trash", "Borrado de cuenta", "30 días de gracia: la persona lo puede cancelar en Ajustes antes de esa fecha."],
    ].map(([ic, t, s]) => ({ key: t!, icon: ic!, t: t!, s: s! })) });
  }
  if (conf) return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}><PanelBloques bloques={[B[0]!]} h1={22} /><ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} /><Toast t={toast} desk={desk} /></div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
