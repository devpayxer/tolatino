"use client";
/* 6g · Panel › Eventos › la PUERTA (Panel negocio v2.dc.html evView L2996–2997 «PORTEROS · ESCANEAN EN LA PUERTA» y «REGLAS DE PUERTA»,
   doorDet L3091 «modo puerta»; apps-delivery-checkin.md §2.5 Monitor en vivo). En vez del «Código de un uso · sin cuenta» del prototipo,
   el portero entra con SU cuenta + el código de invitación (§6 #11), como el Repartidor. El modo puerta del panel abre la sesión de esta
   persona como miembro del negocio y escanea con la misma pieza de To'Latino Puerta (Escanear), con los mismos resultados. Sin montos (D1). */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { bi, diaCorto, hora } from "@/lib/evt-comun";
import type { EvtPanel } from "@/lib/evt";
import { lineaUltimo, MOTIVOS_MANUAL, QUE_HACER, RESULTADO, textoIncidencia, type FilaPuerta } from "@/lib/puerta-comun";
import { puertaBuscar } from "../(puerta)/puerta/acciones";
import { Escanear, mandar } from "../(puerta)/puerta/Escanear";
import { evtIncidenciaCerrar, evtPorteroAsignar, evtPorteroDesasignar, evtPorteroInvitar, evtPorteroQuitar, evtPuertaAbrir, evtPuertaCerrarSesion, evtPuertaReglas, evtPuertaRevocar } from "./acciones-puerta";
import type { Ctx, Sec } from "./Panel";

type Bi = { es: string; en: string };
const CIERRE: [number | null, string, string][] = [[null, "Sin hora", "No time"], [60, "1 h después de empezar", "1 h after start"], [120, "2 h después", "2 h after"], [180, "3 h después", "3 h after"]];

/* En la ficha del evento: PUERTA (adentro, abrir el modo puerta), PORTEROS y REGLAS DE PUERTA. */
export function puertaFicha(c: Ctx, e: EvtPanel): Bloque[] {
  const { E2, es, ui } = c, P = c.evt?.puerta, out: Bloque[] = [];
  if (!P || ["draft", "cancelled", "rejected"].includes(e.st)) return out;
  const v = e.pending ? e.vivo : e.d;
  out.push({ type: "group", k: E2("PUERTA", "DOOR") });
  if (P.fecha && P.r) out.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [
    { k: E2("ADENTRO", "INSIDE"), v: String(P.r.adentro), s: P.r.aforo ? E2(`de ${P.r.aforo}`, `of ${P.r.aforo}`) : E2("ahora", "now"), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
    { k: E2("ENTRARON", "CAME IN"), v: String(P.r.entraron), s: E2(`de ${P.r.esperados}`, `of ${P.r.esperados}`) },
    { k: E2("INCIDENCIAS", "INCIDENTS"), v: String(P.incidencias.length), s: P.incidencias.some((x) => x.st === "open") ? E2("abiertas", "open") : E2("ninguna abierta", "none open") }] });
  if (P.fecha) out.push({ type: "acts", items: [{ l: E2("Abrir modo puerta", "Open door mode"), v: "primary", icon: "grid", onClick: () => c.det(`door:${e.id}@${P.fecha}`) }] });
  // PORTEROS · ESCANEAN EN LA PUERTA (Agregar: nombre + teléfono + este evento o todos → código de 7 días).
  const nuevo = ui.pAdd as { n: string; t: string; todos: boolean } | undefined, quitar = ui.pQuitar as { id: string; m: string } | undefined;
  out.push({ type: "rows", k: E2("PORTEROS · ESCANEAN EN LA PUERTA", "DOOR STAFF · SCAN AT THE DOOR"), link: nuevo ? "" : E2("Agregar", "Add"), onLink: () => c.setUi({ pAdd: { n: "", t: "", todos: false }, pCode: null }),
    items: P.porteros.length ? P.porteros.map((p): Fila => {
      const aqui = p.todos || p.eventos.includes(e.id);
      return { key: p.id, icon: "key", t: p.nombre, compact: true, chev: false, dim: !aqui,
        s: [`··${p.tel4}`, p.todos ? E2("Todos tus eventos", "All your events") : aqui ? E2("Este evento", "This event") : E2("Otros eventos", "Other events"),
          p.estado === "invited" ? E2(`Código ${p.codigo} · vence ${new Date(p.vence!).toLocaleDateString(es ? "es-US" : "en-US", { day: "numeric", month: "short", timeZone: c.d.hoy.tz })}`, `Code ${p.codigo} · expires ${new Date(p.vence!).toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: c.d.hoy.tz })}`) : p.enPuerta ? E2("En la puerta ahora", "At the door now") : null].filter(Boolean).join(" · "),
        tag: p.estado === "active" ? E2("ACTIVO", "ACTIVE") : E2("INVITADO", "INVITED"), tone: p.estado === "active" ? "signal" : "pro",
        acts: [...(!aqui ? [{ l: E2("Poner en este evento", "Add to this event"), v: "secondary", onClick: () => c.run(() => evtPorteroAsignar(c.d.id, p.id, e.id), E2(`${p.nombre} ya escanea en este evento.`, `${p.nombre} now scans this event.`)) }]
          : !p.todos && p.eventos.length > 1 ? [{ l: E2("Quitar de este evento", "Remove from this event"), v: "secondary", onClick: () => c.run(() => evtPorteroDesasignar(c.d.id, p.id, e.id), E2("Listo.", "Done.")) }] : []),
          { l: E2("Quitar", "Remove"), v: "secondary", icon: "trash", onClick: () => c.setUi({ pQuitar: { id: p.id, m: "" } }) }] };
    }) : [{ key: "x", icon: "key", t: E2("Sin porteros", "No door staff"), s: E2("Tú puedes escanear desde aquí con «Abrir modo puerta».", "You can scan from here with “Open door mode”."), compact: true, chev: false }] });
  if (ui.pCode) out.push({ type: "note", tone: "ok", icon: "key", t: E2(`Código ${ui.pCode as string}: le llegó por SMS. Vale 7 días y solo con su teléfono. Entra a To’Latino Puerta con su cuenta y lo escribe.`, `Code ${ui.pCode as string}: sent by text. Valid 7 days and only with their phone. They open To’Latino Door with their account and type it.`) });
  if (nuevo) {
    out.push({ type: "field", k: E2("NOMBRE DEL PORTERO", "DOOR STAFF NAME"), val: nuevo.n, max: 40, onChange: (x: string) => c.setUi({ pAdd: { ...nuevo, n: x.slice(0, 40) } }) });
    out.push({ type: "field", k: E2("SU TELÉFONO · CON ÉL ENTRA A LA PUERTA", "THEIR PHONE · THEY SIGN IN WITH IT"), val: nuevo.t, im: "tel", ph: "(570) 555-0100", onChange: (x: string) => c.setUi({ pAdd: { ...nuevo, t: x.slice(0, 20) } }) });
    out.push({ type: "chips", k: E2("¿EN QUÉ EVENTOS ESCANEA?", "WHICH EVENTS DO THEY SCAN?"), items: [{ l: E2("Solo este evento", "Only this event"), v: nuevo.todos ? "filter" : "selected", onClick: () => c.setUi({ pAdd: { ...nuevo, todos: false } }) },
      { l: E2("Todos tus eventos", "All your events"), v: nuevo.todos ? "selected" : "filter", onClick: () => c.setUi({ pAdd: { ...nuevo, todos: true } }) }] });
    out.push({ type: "note", tone: "ink", icon: "shield", t: E2("Entra con su propia cuenta de To’Latino y el código que le mandamos. Solo escanea: no vende, no ve teléfonos ni lo que pagó cada quien.", "They sign in with their own To’Latino account and the code we text them. They only scan: no selling, no phones, no payment details.") });
    out.push({ type: "acts", items: [{ l: E2("Invitar", "Invite"), v: "primary", icon: "check", off: c.pending || nuevo.n.trim().length < 2 || nuevo.t.replace(/\D/g, "").length < 10,
      onClick: () => c.run(() => evtPorteroInvitar(c.d.id, nuevo.n, nuevo.t, nuevo.todos ? null : e.id), "", (r: { codigo?: string }) => c.setUi({ pAdd: undefined, pCode: r.codigo ?? null })) },
      { l: E2("Cancelar", "Cancel"), v: "secondary", onClick: () => c.setUi({ pAdd: undefined }) }] });
  }
  if (quitar) {
    out.push({ type: "field", k: E2("¿POR QUÉ LO QUITAS?", "WHY ARE YOU REMOVING THEM?"), val: quitar.m, max: 200, onChange: (x: string) => c.setUi({ pQuitar: { ...quitar, m: x.slice(0, 200) } }) });
    out.push({ type: "acts", items: [{ l: E2("Quitar portero", "Remove door staff"), v: "danger", icon: "trash", off: c.pending || quitar.m.trim().length < 3,
      onClick: () => c.run(() => evtPorteroQuitar(c.d.id, quitar.id, quitar.m), E2("Quitado: su puerta se cerró al momento.", "Removed: their door closed right away."), () => c.setUi({ pQuitar: undefined })) },
      { l: E2("Cancelar", "Cancel"), v: "secondary", onClick: () => c.setUi({ pQuitar: undefined }) }] });
  }
  // REGLAS DE PUERTA (reentrada, pedir ID, hora de cerrar la puerta, aforo por puerta).
  const R = P.reglas, guardar = (x: Partial<typeof R>) => c.run(() => evtPuertaReglas(c.d.id, e.id, { ...R, ...x }), E2("Reglas de puerta guardadas.", "Door rules saved."));
  out.push({ type: "rows", k: E2("REGLAS DE PUERTA", "DOOR RULES"), items: [
    { key: "re", icon: "shield", t: E2("Se puede salir y volver a entrar", "Re-entry allowed"), s: E2("El QR marca la salida y deja volver.", "The QR marks the exit and lets them back in."), compact: true, tgOn: R.reentrada, onTg: () => guardar({ reentrada: !R.reentrada }) },
    ...(v.edad > 0 ? [{ key: "id", icon: "shield", t: E2(`Pedir ID · ${v.edad}+`, `Check ID · ${v.edad}+`), s: E2("El portero confirma la edad antes de marcar cada entrada.", "Door staff confirm age before marking each entry."), compact: true, tgOn: R.pideId, onTg: () => guardar({ pideId: !R.pideId }) } as Fila] : []),
  ] });
  out.push({ type: "chips", k: E2("HORA DE CERRAR LA PUERTA", "DOOR CLOSING TIME"), help: E2("DESPUÉS NO ENTRA NADIE NUEVO", "NO NEW ENTRIES AFTER"), items: CIERRE.map(([m, a, b]) => ({ l: es ? a : b, v: R.cierre === m ? "selected" : "filter", onClick: () => guardar({ cierre: m }) })) });
  const capN = (ui.pCap as { n: string; v: string } | undefined) ?? { n: "", v: "" }, caps = Object.entries(R.caps);
  out.push({ type: "rows", k: E2("AFORO POR PUERTA", "CAPACITY BY DOOR"), items: caps.length ? caps.map(([n, x]): Fila => ({ key: n, icon: "key", t: n, r: String(x), compact: true, chev: false,
    acts: [{ l: E2("Quitar", "Remove"), v: "secondary", onClick: () => { const k = { ...R.caps }; delete k[n]; guardar({ caps: k }); } }] }))
    : [{ key: "n", icon: "key", t: E2("Sin aforo por puerta", "No capacity by door"), s: E2("Cada puerta deja entrar sin tope propio.", "Each door lets people in with no cap of its own."), compact: true, chev: false }] });
  if (caps.length < 6) {
    out.push({ type: "field", k: E2("NOMBRE DE LA PUERTA", "DOOR NAME"), val: capN.n, ph: E2("Principal", "Main"), max: 30, onChange: (x: string) => c.setUi({ pCap: { ...capN, n: x.slice(0, 30) } }) });
    out.push({ type: "field", k: E2("AFORO DE ESA PUERTA", "THAT DOOR’S CAPACITY"), val: capN.v, im: "numeric", onChange: (x: string) => c.setUi({ pCap: { ...capN, v: x.replace(/\D/g, "").slice(0, 5) } }) });
    out.push({ type: "acts", items: [{ l: E2("Poner aforo", "Set capacity"), v: "secondary", icon: "plus", off: c.pending || !capN.n.trim() || !Number(capN.v), onClick: () => { guardar({ caps: { ...R.caps, [capN.n.trim()]: Number(capN.v) } }); c.setUi({ pCap: { n: "", v: "" } }); } }] });
  }
  return out;
}

/* El modo puerta del panel (doorDet) + el Monitor en vivo de esa fecha. */
export function puertaDetalle(c: Ctx): Sec {
  const { E2, es, ui } = c, X = c.evt!, P = X.puerta, e = X.det, out: Bloque[] = [];
  const [eid = ""] = c.ruta.det!.slice(5).split("@");
  if (!e || e.id !== eid || !P || !P.fecha) return { blocks: [{ type: "head", t: E2("Ya no está", "No longer here"), onBack: () => c.closeDet() }], ed: null };
  const f = e.fechas.find((x) => x.id === P.fecha), v = e.pending ? e.vivo : e.d, tix = v.entrada === "tickets", r = P.r!;
  out.push({ type: "head", onBack: () => c.det(`evt:${e.id}@${P.fecha}`), eye: `${E2("MODO PUERTA", "DOOR MODE")} · ${f ? `${diaCorto(f.dia, es)} · ${hora(f.h0)}` : ""}`.toUpperCase(), t: bi(v.ti, es),
    s: tix ? E2("Escanea el QR del boleto. Cada boleto entra una sola vez.", "Scan the ticket QR. Each ticket gets in once.") : E2("Marca a cada uno que llega. Así sabes cuántos vinieron de verdad.", "Mark each person who arrives. So you know how many really came.") });
  if (e.kind === "span") out.push({ type: "chips", k: E2("ESTÁS EN LA PUERTA DEL", "YOU ARE AT THE DOOR ON"), items: e.fechas.filter((x) => x.st === "scheduled" || x.st === "done").map((x, i) => ({ l: `${E2("Día", "Day")} ${i + 1} · ${diaCorto(x.dia, es)}`, v: x.id === P.fecha ? "selected" : "filter", onClick: () => c.det(`door:${e.id}@${x.id}`) })) });
  if (v.edad > 0) out.push({ type: "note", tone: "ink", icon: "shield", t: `${P.reglas.pideId ? E2(`Pide ID: ${v.edad}+.`, `Check ID: ${v.edad}+.`) : E2(`Evento ${v.edad}+.`, `${v.edad}+ event.`)} ${P.reglas.reentrada ? E2("Pueden salir y volver a entrar.", "Re-entry allowed.") : E2("Sin reentrada.", "No re-entry.")}` });
  out.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [
    { k: E2("ADENTRO", "INSIDE"), v: String(r.adentro), s: r.aforo ? E2(`de ${r.aforo}`, `of ${r.aforo}`) : E2(`de ${r.esperados}`, `of ${r.esperados}`), bg: r.lleno ? "var(--tl-danger)" : "var(--tl-ink)", fg: "var(--tl-white)" },
    { k: E2("FALTAN", "TO COME"), v: String(r.faltan) }, { k: E2("RECHAZADOS", "REJECTED"), v: String(r.rechazados), s: r.repetidos ? E2(`${r.repetidos} ya ${r.repetidos === 1 ? "había" : "habían"} entrado`, `${r.repetidos} were already in`) : undefined }] });
  if (r.lleno) out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`Llegaste al aforo de hoy (${r.aforo}). Deja entrar solo a medida que salgan.`, `You reached today’s capacity (${r.aforo}). Only let people in as others leave.`) });
  else if (r.alerta) out.push({ type: "note", tone: "warn", icon: "users", t: E2(`Adentro ${r.pct} % del aforo.`, `${r.pct}% of capacity inside.`) });
  if (ui.pRes) { const z = ui.pRes as { t: string; tone: "ok" | "danger" }; out.push({ type: "note", tone: z.tone, icon: z.tone === "ok" ? "check" : "warning", t: z.t }); }
  if (P.miSesion) {
    out.push({ type: "acts", items: [{ l: tix ? E2("Escanear boleto", "Scan ticket") : v.entrada === "free" ? E2("Contar en la puerta", "Count at the door") : E2("Escanear o marcar llegada", "Scan or mark arrival"), v: "primary", icon: "grid", onClick: () => c.setUi({ puertaCam: P.miSesion }) },
      { l: E2("Abrir en To’Latino Puerta", "Open in To’Latino Door"), v: "secondary", icon: "key", onClick: () => c.nav(`/puerta/s/${P.miSesion}`) }] });
    // Buscar por nombre o código (entrada a mano con motivo; RSVP: llegó).
    const q = (ui.pQ as string) ?? "", L = (ui.pL as FilaPuerta[] | null) ?? null, man = ui.pMan as { x: FilaPuerta; motivo: string } | undefined;
    const buscar = async (s: string) => { c.setUi({ pQ: s }); if (s.trim().length < 2) { c.setUi({ pL: null }); return; } const z = await puertaBuscar(P.miSesion!, s.trim()).catch(() => null); if (z?.ok) c.setUi({ pL: (z as unknown as { filas: FilaPuerta[] }).filas }); };
    const entrar = async (x: FilaPuerta, n: number, motivo?: string) => {
      const id = crypto.randomUUID(), z = await mandar(x.kind === "rsvp" ? { sesion: P.miSesion, tipo: "rsvp", rsvp: x.id, id, at: Date.now(), n } : { sesion: P.miSesion, tipo: "boleto", boleto: x.id, motivo, id, at: Date.now(), n, previo: false });
      if (!z.ok) { c.setUi({ pRes: { t: es ? z.msg.es : z.msg.en, tone: "danger" }, pMan: undefined }); return; }
      const res = "v" in z ? z.v.res : (z as unknown as { res: keyof typeof RESULTADO }).res, R0 = RESULTADO[res], h = QUE_HACER[res];
      c.setUi({ pMan: undefined, pRes: { t: R0.tono === "ok" ? E2(`VÁLIDO · ${x.nombre} entró${n > 1 ? ` (${n})` : ""}.`, `VALID · ${x.nombre} is in${n > 1 ? ` (${n})` : ""}.`) : `${bi(R0.t, es)} · ${x.nombre}${"v" in z && z.v.ya ? E2(` · entró por ${z.v.ya.puerta} a las ${z.v.ya.hora}`, ` · in through ${z.v.ya.puerta} at ${z.v.ya.hora}`) : ""}${h ? ` · ${bi(h, es)}` : ""}`, tone: R0.tono === "ok" ? "ok" : "danger" } });
      void buscar(q); c.nav(`/panel/${c.d.id}/eventos?det=door:${e.id}@${P.fecha}`);
    };
    out.push({ type: "search", val: q, ph: E2("Buscar por nombre o código", "Search by name or code"), onChange: (s: string) => void buscar(s), onClear: () => c.setUi({ pQ: "", pL: null }) });
    if (man) {
      out.push({ type: "chips", k: E2(`${man.x.nombre.toUpperCase()} · ¿POR QUÉ ENTRA SIN ESCANEAR?`, `${man.x.nombre.toUpperCase()} · WHY NO SCAN?`), items: MOTIVOS_MANUAL.map((o) => ({ l: bi(o.l, es), v: man.motivo === bi(o.l, es) ? "selected" : "filter", onClick: () => c.setUi({ pMan: { ...man, motivo: bi(o.l, es) } }) })) });
      out.push({ type: "acts", items: [{ l: E2("Dejar entrar", "Let in"), v: "primary", icon: "check", off: !man.motivo, onClick: () => void entrar(man.x, man.x.de - man.x.entraron, man.motivo) }, { l: E2("Cancelar", "Cancel"), v: "secondary", onClick: () => c.setUi({ pMan: undefined }) }] });
    }
    if (L) out.push(L.length ? { type: "rows", items: L.map((x): Fila => {
      const quedan = x.de - x.entraron, vivo = ["valid", "used", "going", "attended", "expired"].includes(x.estado);
      return { key: `${x.kind}${x.id}`, icon: x.kind === "rsvp" ? "users" : "ticket", t: x.nombre, s: [x.tipo, x.code, x.de > 1 ? E2(`entraron ${x.entraron} de ${x.de}`, `${x.entraron} of ${x.de} in`) : null].filter(Boolean).join(" · "), compact: true, chev: false, dim: !vivo,
        tag: !vivo ? E2("NO ENTRA", "NO ENTRY") : quedan <= 0 ? E2("ADENTRO", "INSIDE") : E2("DEJAR ENTRAR", "LET IN"), tone: !vivo ? "danger" : quedan <= 0 ? "neutral" : "action",
        onClick: vivo && quedan > 0 ? () => (x.kind === "rsvp" ? void entrar(x, quedan) : c.setUi({ pMan: { x, motivo: "" } })) : undefined };
    }) } : { type: "empty", icon: "ticket", t: E2("No hay nadie con eso", "Nobody matches"), s: "" });
  } else if (P.abrible) {
    out.push({ type: "acts", items: [{ l: E2("Empezar a escanear", "Start scanning"), v: "primary", icon: "grid", off: c.pending, onClick: () => c.run(() => evtPuertaAbrir(c.d.id, P.fecha!, E2("Panel", "Panel")), E2("Modo puerta abierto.", "Door mode open.")) }] });
  } else out.push({ type: "note", tone: "info", icon: "clock", t: E2("El modo puerta se activa el día del evento: 2 horas antes de abrir las puertas y hasta 2 horas después de terminar.", "Door mode turns on the day of the event: 2 hours before doors open until 2 hours after it ends.") });
  if (P.ultimos.length) out.push({ type: "rows", k: E2("ÚLTIMOS EN LA PUERTA", "LATEST AT THE DOOR"), items: P.ultimos.map((x): Fila => ({ key: x.id, icon: RESULTADO[x.res].tono === "bad" ? "warning" : "check", t: x.nombre,
    s: lineaUltimo(x, es), m: x.hora, compact: true, chev: false,
    ibg: RESULTADO[x.res].tono === "bad" ? "rgba(192,57,43,.1)" : "rgba(0,229,196,.18)", ifg: RESULTADO[x.res].tono === "bad" ? "var(--tl-danger)" : "var(--tl-open-text)" })) });
  // MONITOR EN VIVO: por portero y puerta, incidencias.
  out.push({ type: "group", k: E2("MONITOR EN VIVO", "LIVE MONITOR") });
  // 6h · Cada puerta es un teléfono: lo que subió sin conexión, los repetidos, el reloj y «Revocar este teléfono» (lo que no subió ya no entra).
  out.push(P.equipo.length ? { type: "rows", k: E2("EN LA PUERTA · CADA UNA ES UN TELÉFONO", "AT THE DOOR · EACH ONE IS A PHONE"), items: P.equipo.map((x): Fila => ({ key: x.sesion, icon: "key", t: `${x.nombre}${x.miembro ? E2(" · equipo", " · team") : ""}`,
    s: [`${E2("Puerta", "Door")} ${x.puerta} · ${E2("desde", "since")} ${x.desde}`, x.rechazos ? E2(`${x.rechazos} rechazos`, `${x.rechazos} rejections`) : null, x.sinConexion ? E2(`${x.sinConexion} sin conexión (subió ${x.subio})`, `${x.sinConexion} offline (uploaded ${x.subio})`) : null,
      x.repetidos ? E2(`${x.repetidos} repetidos`, `${x.repetidos} repeated`) : null, x.desfase != null && Math.abs(x.desfase) > 120000 ? (x.desfase < 0 ? E2(`reloj adelantado ${Math.round(-x.desfase / 60000)} min`, `clock ${Math.round(-x.desfase / 60000)} min ahead`) : E2(`reloj atrasado ${Math.round(x.desfase / 60000)} min`, `clock ${Math.round(x.desfase / 60000)} min behind`)) : null].filter(Boolean).join(" · "),
    r: String(x.entradas), tag: x.activa ? E2("ABIERTA", "OPEN") : x.cerradaPor === "revoked" ? E2("REVOCADO", "REVOKED") : E2("CERRADA", "CLOSED"), tone: x.activa ? "signal" : x.cerradaPor === "revoked" ? "danger" : "neutral", compact: true, chev: false,
    acts: x.sesion === P.miSesion ? undefined : [
      ...(x.activa ? [{ l: E2("Cerrar su puerta", "Close their door"), v: "secondary", onClick: () => c.run(() => evtPuertaCerrarSesion(c.d.id, x.sesion), E2("Puerta cerrada. Lo que escaneó sin señal todavía sube.", "Door closed. What they scanned offline can still upload.")) }] : []),
      ...(x.revocable ? [{ l: E2("Revocar este teléfono", "Revoke this phone"), v: "danger", onClick: () => { if (window.confirm(E2("¿Revocar este teléfono? Se borra su lista en la próxima señal y lo que no haya subido ya no cuenta.", "Revoke this phone? Its list is wiped on the next signal and anything not uploaded no longer counts."))) c.run(() => evtPuertaRevocar(c.d.id, x.sesion), E2("Teléfono revocado.", "Phone revoked.")); } }] : []),
    ] })) }
    : { type: "note", tone: "info", icon: "key", t: E2("Ninguna puerta abierta todavía.", "No door open yet.") });
  if (P.incidencias.length) out.push({ type: "rows", k: E2("INCIDENCIAS", "INCIDENTS"), items: P.incidencias.map((x): Fila => ({ key: x.id, icon: textoIncidencia(x, es).icon,
    t: textoIncidencia(x, es).t, s: textoIncidencia(x, es).s, m: x.hora, compact: true, chev: false,
    tag: x.st === "open" ? E2("ABIERTA", "OPEN") : E2("CERRADA", "CLOSED"), tone: x.st === "open" ? "pro" : "neutral",
    acts: x.st === "open" ? [{ l: E2("Cerrar", "Close"), v: "secondary", onClick: () => c.run(() => evtIncidenciaCerrar(c.d.id, x.id, ""), E2("Incidencia cerrada.", "Incident closed.")) }] : undefined })) });
  return { blocks: out, ed: null };
}

/* La cámara del modo puerta del panel (la misma pieza de To'Latino Puerta) a pantalla completa. */
export function PuertaCamaraPanel({ sesion, es, reentrada, libre, onCerrar }: { sesion: string; es: boolean; reentrada: boolean; libre: boolean; onCerrar: () => void }) {
  const router = useRouter();
  return (
    <div role="dialog" aria-modal="true" aria-label={es ? "Modo puerta" : "Door mode"} style={{ position: "fixed", inset: 0, zIndex: 95, background: "var(--tl-dark-1)", overflowY: "auto" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "18px 16px 30px", display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ font: "800 20px Sora,sans-serif", color: "var(--tl-white)" }}>{es ? "Modo puerta" : "Door mode"}</span>
          <span role="button" tabIndex={0} onClick={() => { onCerrar(); router.refresh(); }} onKeyDown={(e) => { if (e.key === "Enter") { onCerrar(); router.refresh(); } }}
            style={{ height: 44, padding: "0 16px", borderRadius: 13, border: "1px solid var(--tl-dark-line)", color: "var(--tl-white)", display: "grid", placeItems: "center", font: "700 13px Manrope,sans-serif", cursor: "pointer" }}>{es ? "Listo" : "Done"}</span>
        </div>
        <Escanear sesion={sesion} es={es} reentrada={reentrada} libre={libre} onCerrada={() => { onCerrar(); router.refresh(); }} />
      </div>
    </div>);
}

/* El Monitor en vivo: el SSE de esa fecha (miembro con «evt») refresca la ficha; si se cae, cada 5 s. */
export function PuertaVivo({ negocio, fecha }: { negocio: string; fecha: string }) {
  const router = useRouter(), ultimo = useRef(0);
  useEffect(() => {
    let s: EventSource | null = null, poll: ReturnType<typeof setInterval> | null = null;
    try {
      s = new EventSource(`/api/puerta/vivo?negocio=${encodeURIComponent(negocio)}&fecha=${fecha}`);
      s.addEventListener("resumen", () => { if (Date.now() - ultimo.current > 3000) { ultimo.current = Date.now(); router.refresh(); } });
      s.onerror = () => { if (!poll) poll = setInterval(() => router.refresh(), 5000); };
      s.onopen = () => { if (poll) { clearInterval(poll); poll = null; } };
    } catch { poll = setInterval(() => router.refresh(), 5000); }
    return () => { s?.close(); if (poll) clearInterval(poll); };
  }, [negocio, fecha, router]);
  return null;
}
