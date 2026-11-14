"use client";
/* 9i · Super Admin › Ciudades (ADM-CIUD; prototipo del Super Admin secCiud y cityDetail — el asistente es el hueco #6 de fase9-apertura.md: se porta con
   los bloques del admin y suma «Comprobar»). El listado con la lista de espera y la regla de cada ciudad; el detalle con su estado, la regla por categoría
   clave, el asistente de 7 pasos (en el teléfono, un paso por pantalla; en escritorio, la lista de los 7), la beta y sus invitaciones, los barrios, la zona
   horaria, el impuesto, el radio, la cuenta oficial, el equipo local, el aviso a la lista y el historial. Todo cambio con motivo (ConfirmarMotivo, patrón 2ao)
   y auditoría; el servidor decide (lib/ciudades/apertura.ts). ES/EN por el idioma del admin. */
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DetalleCiudad, FilaCiudad } from "@/lib/ciudades/admin";
import { CLAVES, ESTADO, ESTADO_LARGO, NOMBRE_ZONA, PASOS, ZONAS_HORARIAS, type Bi, type Estado, type Res } from "@/lib/ciudades/comun";
import {
  ciudadAjuste, ciudadBarrio, ciudadBeta, ciudadCancelarAsistente, ciudadDecidirCierre, ciudadInvitar, ciudadPaso, ciudadPedirCierre, ciudadQuitarInvitacion, ciudadRegla,
  ciudadRetirarBarrio, ciudadRetirarCierre,
} from "./acciones-ciudades";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { cuandoL, par, selectorIdioma, type L } from "./TextosComun";

const TONO: Record<Estado, string> = { on: "signal", beta: "action", soon: "neutral", off: "danger" };
const OK = "var(--tl-open-text)", NO = "var(--tl-danger)";

export type Puede = { editar: boolean; aprobar: boolean; admin: boolean };
export type DatosLista = { filas: FilaCiudad[]; pedidas: { n: string; veces: number; ultima: string }[]; fecha: { visible: boolean; fecha: string | null } };

function useConfirmar(l: L) {
  const E = par(l), router = useRouter(), [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const res = async (p: Promise<Res>) => { const r = await p; return { ok: r.ok, mensaje: E(r.msg.es, r.msg.en) }; };
  const hecho = (m?: string) => { setToast(m ?? E("Listo.", "Done.")); setConf(null); router.refresh(); };
  return { conf, setConf, toast, res, hecho };
}

/* ── El listado ── */
export function CiudadesLista({ d, l }: { d: DatosLista; l: L }) {
  const E = par(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const n = (e: Estado) => d.filas.filter((x) => x.status === e).length;
  const espera = d.filas.reduce((a, x) => a + (x.status === "on" ? 0 : x.espera), 0);
  const B: Bloque[] = [
    { type: "head", eye: E("CONTENIDO Y OFERTA", "CONTENT & SUPPLY"), t: E("Ciudades", "Cities"), h1: desk ? 26 : 22,
      s: E("Cada ciudad tiene su radio, sus barrios, su equipo local y su regla de apertura. Una ciudad solo abre con el asistente de 7 pasos; cerrarla pide motivo y otra persona.",
        "Each city has its radius, neighborhoods, local team and opening rule. A city only opens with the 7-step wizard; closing it needs a reason and another person.") },
    selectorIdioma(l, router),
    { type: "kpis", items: [
      { k: E("ABIERTAS", "OPEN"), v: String(n("on")) }, { k: E("EN BETA", "IN BETA"), v: String(n("beta")), s: E("solo invitados", "invited only") },
      { k: E("PRÓXIMAS", "UP NEXT"), v: String(n("soon")) }, { k: E("EN LISTA DE ESPERA", "ON WAITLISTS"), v: espera.toLocaleString("en-US"), s: E("de las que vienen", "of those coming") },
      { k: E("PEDIDAS", "REQUESTED"), v: String(d.pedidas.length), s: E("«Avísame cuando llegue»", "«Tell me when it arrives»") },
    ] },
    { type: "rows", k: E(`${d.filas.length} CIUDADES`, `${d.filas.length} CITIES`), cols: desk ? "repeat(auto-fill,minmax(360px,1fr))" : undefined, items: d.filas.map((c) => ({
      key: c.id, icon: "pin", t: `${c.name}, ${c.state}`,
      s: c.status === "on" ? E(`${c.listos} negocios · radio ${c.radio} mi · ${c.barrios} barrios`, `${c.listos} businesses · ${c.radio} mi radius · ${c.barrios} neighborhoods`)
        : E(`${c.espera} en lista de espera · ${c.listos}/${c.meta} negocios listos · ${c.pct} % de la regla${c.paso ? ` · asistente en el paso ${c.paso} de 7` : ""}`,
          `${c.espera} on the waitlist · ${c.listos}/${c.meta} businesses ready · ${c.pct}% of the rule${c.paso ? ` · wizard at step ${c.paso} of 7` : ""}`)
        + (c.cierre ? E(" · CIERRE POR APROBAR", " · CLOSE PENDING") : ""),
      tag: E(ESTADO[c.status].es, ESTADO[c.status].en), tone: TONO[c.status], chev: true, onClick: () => router.push(`/admin/ciudades/${c.id}`),
    })) },
    { type: "group", k: E("FECHA DE APERTURA (LANDING)", "OPENING DATE (LANDING)"), link: E("Cambiarla en Crecimiento", "Change it in Growth"), onLink: () => router.push("/admin/crecimiento?t=lista") },
    { type: "kv", items: [{ k: E("EN LA PÁGINA", "ON THE PAGE"), v: d.fecha.visible ? E("Visible", "Visible") : E("Oculta · dice «Muy pronto»", "Hidden · says «Coming soon»") },
      { k: E("FECHA", "DATE"), v: d.fecha.fecha ?? "—" }] },
  ];
  if (d.pedidas.length) B.push({ type: "rows", k: E("PIDE TU CIUDAD · LUGARES QUE TODAVÍA NO SON NUESTROS", "ASK FOR YOUR CITY · PLACES NOT YET OURS"), cols: desk ? "repeat(auto-fill,minmax(360px,1fr))" : undefined,
    items: d.pedidas.map((x) => ({ key: x.n, icon: "bell", t: x.n, s: E(`${x.veces} ${x.veces === 1 ? "pedido" : "pedidos"} · último ${x.ultima}`, `${x.veces} ${x.veces === 1 ? "request" : "requests"} · last ${x.ultima}`) })) });
  return <div data-pantalla="ADM-CIUD" style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /></div>;
}

/* ── El detalle ── */
type Form = { t: "barrio"; id: string | null; es: string; en: string; calleEs: string; calleEn: string; lat: string; lng: string }
  | { t: "regla"; listos: string; espera: string; cats: Record<string, string> }
  | { t: "invitar"; tel: string };

export function CiudadDetalle({ d, l, puede }: { d: DetalleCiudad; l: L; puede: Puede }) {
  const E = par(l), cuando = cuandoL(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const { conf, setConf, toast, res, hecho } = useConfirmar(l);
  const [form, setForm] = useState<Form | null>(null);
  const B2 = (x: Bi) => E(x.es, x.en);
  const est = (e: string) => B2(ESTADO_LARGO[e as Estado] ?? { es: e, en: e });
  const eye = `${E("CIUDADES", "CITIES")} · ${B2(ESTADO[d.status])}`;
  const nombre = `${d.name}, ${d.state}`;

  if (conf) return (
    <div data-pantalla="ADM-CIUD" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye, t: conf.titulo, s: nombre, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={(r) => { setForm(null); hecho(r.mensaje); }} />
      <Toast t={toast} desk={desk} />
    </div>);

  if (form) {
    const F: Bloque[] = [{ type: "head", eye, t: form.t === "barrio" ? (form.id ? E("Corregir barrio", "Edit neighborhood") : E("Agregar barrio", "Add neighborhood")) : form.t === "regla" ? E("Regla de apertura", "Opening rule") : E("Invitar a la beta", "Invite to the beta"),
      s: nombre, onBack: () => setForm(null), h1: desk ? 26 : 22 }];
    const set = (p: Partial<Form>) => setForm({ ...form, ...p } as Form);
    if (form.t === "barrio") {
      F.push({ type: "field", k: E("NOMBRE EN ESPAÑOL", "NAME IN SPANISH"), val: form.es, onChange: (v) => set({ es: v }), max: 50 },
        { type: "field", k: E("NOMBRE EN INGLÉS", "NAME IN ENGLISH"), val: form.en, onChange: (v) => set({ en: v }), max: 50 },
        { type: "field", k: E("CALLES DE REFERENCIA (ESPAÑOL)", "REFERENCE STREETS (SPANISH)"), val: form.calleEs, onChange: (v) => set({ calleEs: v }), max: 80, ph: "N 9th St y Turner St" },
        { type: "field", k: E("CALLES DE REFERENCIA (INGLÉS)", "REFERENCE STREETS (ENGLISH)"), val: form.calleEn, onChange: (v) => set({ calleEn: v }), max: 80, ph: "N 9th St & Turner St" },
        { type: "field", k: E("LATITUD", "LATITUDE"), val: form.lat, onChange: (v) => set({ lat: v.replace(/[^0-9.-]/g, "") }), im: "decimal", max: 12, ph: "40.6069" },
        { type: "field", k: E("LONGITUD", "LONGITUDE"), val: form.lng, onChange: (v) => set({ lng: v.replace(/[^0-9.-]/g, "") }), im: "decimal", max: 12, ph: "-75.4737",
          help: E("El punto del centro del barrio: desde ahí mide quien lo elige. Tiene que quedar a menos de 15 mi de la ciudad.", "The point at the center of the neighborhood: whoever picks it measures from there. It has to be within 15 mi of the city.") });
      const acts = [{ l: E("Guardar", "Save"), v: "action", off: !form.es.trim() || !form.en.trim() || !form.calleEs.trim() || !form.calleEn.trim() || !form.lat || !form.lng,
        onClick: () => setConf({ titulo: form.id ? E("Corregir barrio", "Edit neighborhood") : E("Agregar barrio", "Add neighborhood"), cta: E("Guardar", "Save"),
          sub: E("El selector de ciudad lo muestra al momento. Queda en la auditoría con tu motivo.", "The city selector shows it right away. It goes in the audit log with your reason."),
          plantillas: [E("Lo pidió el equipo local.", "The local team asked for it."), E("El punto estaba corrido.", "The point was off.")],
          hacer: (m) => res(ciudadBarrio(d.id, { id: form.id, es: form.es, en: form.en, calleEs: form.calleEs, calleEn: form.calleEn, lat: Number(form.lat), lng: Number(form.lng) }, m)) }) }];
      if (form.id && !form.id.endsWith("-centro")) acts.push({ l: E("Retirar barrio", "Retire neighborhood"), v: "danger", off: false,
        onClick: () => setConf({ titulo: E("Retirar barrio", "Retire neighborhood"), peligro: true, cta: E("Retirar", "Retire"), sub: E("No se borra: deja de salir y quien medía desde ahí pasa al centro.", "It is not deleted: it stops showing and whoever measured from there moves to downtown."),
          hacer: (m) => res(ciudadRetirarBarrio(d.id, form.id!, m)) }) });
      F.push({ type: "acts", items: acts });
    } else if (form.t === "regla") {
      F.push({ type: "note", tone: "info", icon: "info", t: E("Cumple = (negocios listos ≥ el mínimo o personas en la lista ≥ el mínimo) y cada categoría clave con su mínimo. Una categoría en 0 no se pide.",
        "Meets = (businesses ready ≥ the minimum or people on the waitlist ≥ the minimum) and each key category with its minimum. A category at 0 is not required.") },
        { type: "field", k: E("NEGOCIOS LISTOS (MÍNIMO)", "BUSINESSES READY (MINIMUM)"), val: form.listos, onChange: (v) => set({ listos: v.replace(/\D/g, "") }), im: "numeric", max: 6 },
        { type: "field", k: E("EN LISTA DE ESPERA (MÍNIMO)", "ON THE WAITLIST (MINIMUM)"), val: form.espera, onChange: (v) => set({ espera: v.replace(/\D/g, "") }), im: "numeric", max: 7 },
        ...CLAVES.map(([k, n]): Bloque => ({ type: "field", k: `${B2(n).toUpperCase()} (${E("MÍNIMO", "MINIMUM")})`, val: form.cats[k] ?? "0", onChange: (v) => set({ cats: { ...form.cats, [k]: v.replace(/\D/g, "") } }), im: "numeric", max: 4 })),
        { type: "acts", items: [{ l: E("Guardar la regla", "Save the rule"), v: "action", onClick: () => setConf({ titulo: E("Cambiar la regla de apertura", "Change the opening rule"), cta: E("Guardar", "Save"),
          sub: E("El paso «Comprobar» del asistente la vuelve a mirar. Queda en la auditoría con antes y después.", "The wizard's «Check» step looks at it again. It goes in the audit log with before and after."),
          hacer: (m) => res(ciudadRegla(d.id, { listos: Number(form.listos || 0), espera: Number(form.espera || 0), cats: Object.fromEntries(CLAVES.map(([k]) => [k, Number(form.cats[k] || 0)])) }, m)) }) }] });
    } else {
      F.push({ type: "note", tone: "info", icon: "info", t: E("La persona tiene que tener cuenta (que entre una vez con su teléfono). Desde que la invitas, ve la ciudad abierta.", "The person must have an account (they sign in once with their phone). From the moment you invite them, they see the city open.") },
        { type: "field", k: E("TELÉFONO", "PHONE"), val: form.tel, onChange: (v) => set({ tel: v.replace(/[^0-9 ()+-]/g, "") }), im: "tel", max: 16, ph: "(570) 555-0100" },
        { type: "acts", items: [{ l: E("Invitar", "Invite"), v: "action", off: form.tel.replace(/\D/g, "").length < 10, onClick: () => setConf({ titulo: E("Invitar a la beta", "Invite to the beta"), cta: E("Invitar", "Invite"),
          plantillas: [E("Vecino de confianza para la beta.", "Trusted neighbor for the beta."), E("Dueño de un negocio de la beta.", "Owner of a beta business.")],
          hacer: (m) => res(ciudadInvitar(d.id, form.tel, m)) }) }] });
    }
    return <div data-pantalla="ADM-CIUD" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}><PanelBloques bloques={F} /><Toast t={toast} desk={desk} /></div>;
  }

  const B: Bloque[] = [
    { type: "head", eye, t: nombre, onBack: () => router.push("/admin/ciudades"), h1: desk ? 26 : 22,
      s: d.status === "on" ? E(`Abierta desde ${cuando(d.abierta)}.`, `Open since ${cuando(d.abierta)}.`)
        : d.status === "beta" ? E(`En beta desde ${cuando(d.beta)}: solo la ven las cuentas invitadas y las de revisión.`, `In beta since ${cuando(d.beta)}: only invited and review accounts see it.`)
        : d.status === "soon" ? E("Próximamente: se ve la pantalla «pronto» y se anota la lista de espera.", "Coming soon: the «soon» screen shows and the waitlist grows.")
        : E(`Cerrada${d.motivoCierre ? `: ${d.motivoCierre}` : ""}.`, `Closed${d.motivoCierre ? `: ${d.motivoCierre}` : ""}.`) },
    selectorIdioma(l, router),
  ];

  // Cierre pendiente: lo decide OTRA persona.
  if (d.cierre) {
    const x = d.cierre;
    B.push({ type: "note", tone: "warn", icon: "warning", t: E(`CIERRE POR APROBAR · ${x.quien ?? "Alguien"} pidió pasarla a ${est(x.a)} (${cuando(x.at)}): «${x.motivo}». La aprueba otra persona del equipo.`,
      `CLOSE PENDING · ${x.quien ?? "Someone"} asked to move it to ${est(x.a)} (${cuando(x.at)}): «${x.motivo}». Another team member approves it.`) });
    if (puede.aprobar) B.push({ type: "acts", items: x.mio
      ? [{ l: E("Retirar mi pedido", "Withdraw my request"), v: "secondary", onClick: () => setConf({ titulo: E("Retirar el pedido de cierre", "Withdraw the close request"), cta: E("Retirar", "Withdraw"), hacer: (m) => res(ciudadRetirarCierre(d.id, x.id, m)) }) }]
      : [{ l: E("Aprobar el cierre", "Approve the close"), v: "danger", onClick: () => setConf({ titulo: E(`Aprobar: ${d.name} pasa a ${est(x.a)}`, `Approve: ${d.name} goes to ${est(x.a)}`), peligro: true, cta: E("Aprobar", "Approve"),
          sub: E("Se nota al instante en la app y en todos los procesos. Queda en el historial de la ciudad.", "It shows right away in the app and in every process. It goes in the city's history."), hacer: (m) => res(ciudadDecidirCierre(d.id, x.id, true, m)) }) },
        { l: E("Rechazar", "Reject"), v: "secondary", onClick: () => setConf({ titulo: E("Rechazar el cierre", "Reject the close"), cta: E("Rechazar", "Reject"), hacer: (m) => res(ciudadDecidirCierre(d.id, x.id, false, m)) }) }] });
  }

  const R = d.regla;
  B.push({ type: "kv", items: [
    { k: E("ESTADO", "STATUS"), v: est(d.status), fg: d.status === "on" ? OK : undefined },
    { k: E("LISTA DE ESPERA", "WAITLIST"), v: String(R.espera) },
    { k: E("NEGOCIOS LISTOS", "BUSINESSES READY"), v: `${R.listos} / ${R.min.listos}` },
    { k: E("REGLA DE APERTURA", "OPENING RULE"), v: R.cumple ? E("Cumple", "Met") : E(`${R.pct} %`, `${R.pct}%`), fg: R.cumple ? OK : undefined },
    { k: E("ZONA HORARIA", "TIME ZONE"), v: B2(NOMBRE_ZONA[d.tz] ?? { es: d.tz, en: d.tz }) },
    { k: E("IMPUESTO", "TAX"), v: `${d.tax} %` },
    { k: E("RADIO POR DEFECTO", "DEFAULT RADIUS"), v: `${d.radio} mi` },
    { k: E("CUENTA OFICIAL", "OFFICIAL ACCOUNT"), v: d.oficial ? B2(d.oficial) : "—" },
    { k: E("EQUIPO LOCAL", "LOCAL TEAM"), v: d.equipo.length ? d.equipo.map((x) => `${x.nombre} · ${x.rol}`).join(", ") : E("Nadie todavía", "No one yet") },
    { k: E("CÓDIGOS POSTALES", "ZIP CODES"), v: d.zips.join(", ") || "—" },
  ] });

  // El aviso a la lista (después de abrir con el asistente).
  if (d.aviso && (d.aviso.avisados || d.aviso.faltan || d.aviso.sin)) {
    const a = d.aviso;
    B.push({ type: "group", k: E("AVISO DE APERTURA A LA LISTA DE ESPERA", "OPENING NOTICE TO THE WAITLIST") },
      { type: "kv", cols: desk ? 4 : 2, items: [{ k: E("AVISADAS", "NOTIFIED"), v: String(a.avisados), fg: OK }, { k: E("FALTAN", "PENDING"), v: String(a.faltan) },
        { k: E("SIN CUENTA (NO SE LES ESCRIBE)", "NO ACCOUNT (NOT CONTACTED)"), v: String(a.sin) }, { k: E("TAMBIÉN POR CORREO", "ALSO BY EMAIL"), v: String(a.correo) }] });
    if (a.faltan && !a.saleAhora) B.push({ type: "note", tone: "info", icon: "clock", t: E(`Ahora es de noche en ${d.name}: el resto sale a las 9 AM de allá.`, `It is night in ${d.name} now: the rest goes out at 9 AM local time.`) });
  }

  // El asistente de apertura.
  if (d.actual) {
    const hechos = d.asistente.lanzamiento?.status === "en_curso" ? d.asistente.pasos : [];
    const a = d.actual, P = PASOS[a.paso - 1]!;
    B.push({ type: "group", k: E("ASISTENTE DE APERTURA", "OPENING WIZARD") });
    if (desk) B.push({ type: "timeline", items: PASOS.map((p, i) => {
      const h = hechos.find((x) => x.step === i + 1);
      return { t: `${i + 1} · ${B2(p)}`, s: h ? `${cuando(h.at)} · ${h.by ?? ""} · ${h.reason}`.toUpperCase() : i + 1 === a.paso ? E("TOCA AHORA", "UP NOW") : undefined, now: i + 1 === a.paso, future: i + 1 > a.paso };
    }) });
    else B.push({ type: "kv", items: [{ k: E("PASO", "STEP"), v: `${a.paso} ${E("de", "of")} 7` }, { k: E("HECHOS", "DONE"), v: hechos.map((x) => String(x.step)).join(" · ") || "—" }] });
    B.push({ type: "group", k: `${E("PASO", "STEP")} ${a.paso} · ${B2(P).toUpperCase()}` });
    if (a.ev.lineas.length) B.push({ type: "kv", items: a.ev.lineas.map((x) => ({ k: B2(x.k), v: x.v, fg: x.ok === true ? OK : x.ok === false ? NO : undefined })) });
    for (const p of a.ev.problemas.slice(0, 6)) B.push({ type: "note", tone: "warn", icon: "warning", t: B2(p) });
    for (const p of (a.ev.avisos ?? []).slice(0, 6)) B.push({ type: "note", tone: "info", icon: "info", t: B2(p) });
    if (a.paso === 6) B.push({ type: "note", tone: "info", icon: "info", t: E("Los guardianes los corre el CI antes de que un commit llegue a la rama que se despliega; aquí queda anotado el commit que corre.", "The guardians run in CI before a commit reaches the branch that is deployed; the running commit is recorded here.") });
    if (a.paso === 7) B.push({ type: "note", tone: "info", icon: "bell", t: E("Al abrir: la app deja de mostrar «próximamente» al momento en todos los procesos y la lista recibe UN aviso (en la app y push; SMS solo a quien no tiene la app; correo si está verificado), por partes y de 9 AM a 9 PM de la ciudad.",
      "On opening: the app stops showing «coming soon» right away in every process and the list gets ONE notice (in the app and push; SMS only to those without the app; email if verified), in parts and from 9 AM to 9 PM city time.") });
    const acts: { l: string; v?: string; icon?: string; off?: boolean; onClick?: () => void }[] = [];
    if (puede.aprobar) {
      if (a.paso < 7) acts.push({ l: `${E("Confirmar paso", "Confirm step")} ${a.paso}: ${B2(P)}`, v: "action", icon: "check", off: !a.ev.ok,
        onClick: () => setConf({ titulo: `${E("Paso", "Step")} ${a.paso} · ${B2(P)}`, cta: E("Confirmar", "Confirm"),
          sub: E("Se guarda lo que ves arriba como evidencia, con tu nombre y tu motivo. El asistente solo avanza.", "What you see above is saved as evidence, with your name and reason. The wizard only moves forward."),
          hacer: (m) => res(ciudadPaso(d.id, a.paso, m, false)) }) });
      else acts.push({ l: `${E("Abrir", "Open")} ${d.name}`, v: "primary", icon: "globe", off: !a.ev.ok || !puede.admin,
        onClick: () => setConf({ titulo: `${E("Abrir", "Open")} ${d.name}`, cta: E("Abrir la ciudad", "Open the city"),
          sub: E("Deja de salir «próximamente» en Inicio, Negocios, Buscar y Eventos y la lista de espera recibe su aviso. Se puede cerrar de nuevo con motivo y otra persona.",
            "It stops showing «coming soon» in Home, Businesses, Search and Events and the waitlist gets its notice. It can be closed again with a reason and another person."),
          hacer: (m) => res(ciudadPaso(d.id, 7, m, false)) }) });
      if (a.paso === 6 && !a.ev.ok && a.ev.abrirIgual && puede.admin) acts.push({ l: E("Abrir igual (la regla no se cumple)", "Open anyway (the rule is not met)"), v: "danger",
        onClick: () => setConf({ titulo: E("Comprobar y abrir igual", "Check and open anyway"), peligro: true, cta: E("Confirmar", "Confirm"),
          sub: E("La regla de apertura no se cumple. Queda anotado que se decidió abrir igual, quién y por qué (§6 #17: lo decide el fundador).", "The opening rule is not met. It is recorded that the decision was to open anyway, who and why (§6 #17: the founder decides)."),
          hacer: (m) => res(ciudadPaso(d.id, 6, m, true)) }) });
      if (d.asistente.lanzamiento?.status === "en_curso") acts.push({ l: E("Cancelar asistente", "Cancel wizard"), v: "ghost", onClick: () => setConf({ titulo: E("Cancelar el asistente", "Cancel the wizard"), cta: E("Cancelar asistente", "Cancel wizard"),
        sub: E("Lo hecho queda en el historial; para abrir se empieza otro desde el paso 1.", "What was done stays in the history; to open, start another one from step 1."), hacer: (m) => res(ciudadCancelarAsistente(d.id, m)) }) });
    }
    if (acts.length) B.push({ type: "acts", items: acts });
    if (a.paso === 7 && !puede.admin) B.push({ type: "note", tone: "info", icon: "lock", t: E("Abrir una ciudad lo hace un Admin.", "Opening a city is done by an Admin.") });
  }

  // La beta: quién entra.
  if (d.status === "soon" && puede.aprobar) B.push({ type: "acts", items: [{ l: E("Pasar a beta (solo invitados)", "Move to beta (invited only)"), v: "secondary", icon: "users",
    onClick: () => setConf({ titulo: E(`${d.name} en beta`, `${d.name} in beta`), cta: E("Pasar a beta", "Move to beta"),
      sub: E("Solo la ven abierta las cuentas que invites y las de revisión de Apple y Google; para los demás sigue «próximamente».", "Only the accounts you invite and the Apple and Google review accounts see it open; for everyone else it stays «coming soon»."),
      hacer: (m) => res(ciudadBeta(d.id, m)) }) }] });
  if (d.status === "beta") {
    B.push({ type: "rows", k: E(`BETA · ${d.invitadas.length} INVITADAS · ${d.revision} CUENTAS DE REVISIÓN ACTIVAS`, `BETA · ${d.invitadas.length} INVITED · ${d.revision} ACTIVE REVIEW ACCOUNTS`),
      link: puede.aprobar ? E("Invitar", "Invite") : undefined, onLink: puede.aprobar ? () => setForm({ t: "invitar", tel: "" }) : undefined,
      items: d.invitadas.length ? d.invitadas.map((x): Fila => ({ key: x.id, icon: "users", t: `${x.nombre} · ${x.tel}`, s: `${E("Invitada", "Invited")} ${cuando(x.at)}${x.por ? ` · ${x.por}` : ""}`, tag: x.prueba ? E("PRUEBA", "TEST") : undefined, tone: "neutral",
        acts: puede.aprobar ? [{ l: E("Quitar", "Remove"), v: "ghost", onClick: () => setConf({ titulo: E(`Quitar a ${x.nombre} de la beta`, `Remove ${x.nombre} from the beta`), cta: E("Quitar", "Remove"), hacer: (m) => res(ciudadQuitarInvitacion(d.id, x.id, m)) }) }] : undefined }))
        : [{ icon: "users", t: E("Nadie invitado todavía", "No one invited yet"), s: E("Invita por teléfono a quien entra a la beta.", "Invite by phone whoever joins the beta.") }] });
  }

  // La regla por categoría clave.
  B.push({ type: "rows", k: E("REGLA DE APERTURA · CATEGORÍAS CLAVE", "OPENING RULE · KEY CATEGORIES"), link: puede.admin ? E("Cambiar", "Change") : undefined,
    onLink: puede.admin ? () => setForm({ t: "regla", listos: String(R.min.listos), espera: String(R.min.espera), cats: Object.fromEntries(CLAVES.map(([k]) => [k, String(R.cats.find((x) => x.k === k)?.min ?? 0)])) }) : undefined,
    cols: desk ? "repeat(auto-fill,minmax(220px,1fr))" : undefined,
    items: R.cats.map((x) => ({ key: x.k, icon: "store", t: B2(x.nombre), s: `${x.n} ${E("listos", "ready")} · ${E("mínimo", "minimum")} ${x.min}`, tag: x.n >= x.min ? E("CUMPLE", "MET") : E("FALTA", "MISSING"), tone: x.n >= x.min ? "signal" : "warn" })) });
  const activas = d.categorias.filter((x) => x.n > 0);
  B.push({ type: "kv", cols: 1, items: [{ k: E(`CATEGORÍAS CON NEGOCIOS (${activas.length} DE ${d.categorias.length})`, `CATEGORIES WITH BUSINESSES (${activas.length} OF ${d.categorias.length})`),
    v: activas.length ? activas.map((x) => `${E(x.es, x.en)} ${x.n}`).join(" · ") : E("Todavía ninguna", "None yet") }] });

  // Ajustes: radio (ciud:editar), zona horaria e impuesto (Admin).
  if (puede.editar) B.push({ type: "chips", k: E("RADIO POR DEFECTO PARA QUIEN LLEGA NUEVO", "DEFAULT RADIUS FOR NEWCOMERS"), items: d.radios.map((r) => ({ l: `${r} mi`, v: r === d.radio ? "selected" : "filter",
    onClick: r === d.radio ? undefined : () => setConf({ titulo: E(`Radio por defecto: ${r} mi`, `Default radius: ${r} mi`), cta: E("Guardar", "Save"), hacer: (m) => res(ciudadAjuste(d.id, "radio", String(r), m)) }) })) });
  if (puede.admin) {
    B.push({ type: "chips", k: E("ZONA HORARIA", "TIME ZONE"), items: ZONAS_HORARIAS.map((z) => ({ l: B2(NOMBRE_ZONA[z]!), v: z === d.tz ? "selected" : "filter",
      onClick: z === d.tz ? undefined : () => setConf({ titulo: E("Cambiar la zona horaria", "Change the time zone"), cta: E("Guardar", "Save"), sub: B2(NOMBRE_ZONA[z]!), hacer: (m) => res(ciudadAjuste(d.id, "zona", z, m)) }) })) });
    B.push({ type: "acts", items: [{ l: E("Cambiar el impuesto", "Change the tax"), v: "secondary", icon: "card", onClick: () => setConf({ titulo: E(`Impuesto de ${d.name}`, `${d.name} tax`), cta: E("Guardar", "Save"),
      sub: E("Vale para lo que se cobre desde ahora; lo ya cobrado no cambia. El contador lo confirma antes de abrir (9s).", "It applies to what is charged from now on; what was already charged does not change. The accountant confirms it before opening (9s)."),
      valor: { k: E("IMPUESTO (%)", "TAX (%)"), ini: d.tax, max: 5 }, hacer: (m, _e, v) => res(ciudadAjuste(d.id, "impuesto", v, m)) }) }] });
  }

  // Barrios.
  B.push({ type: "rows", k: E(`BARRIOS · ${d.barrios.filter((z) => !z.retirado).length}`, `NEIGHBORHOODS · ${d.barrios.filter((z) => !z.retirado).length}`), cols: desk ? "repeat(auto-fill,minmax(320px,1fr))" : undefined,
    link: puede.editar ? E("Agregar barrio", "Add neighborhood") : undefined, onLink: puede.editar ? () => setForm({ t: "barrio", id: null, es: "", en: "", calleEs: "", calleEn: "", lat: "", lng: "" }) : undefined,
    items: d.barrios.map((z) => ({ key: z.id, icon: z.centro ? "pin" : "home", t: E(z.es, z.en), dim: z.retirado,
      s: `${E(z.calleEs, z.calleEn)} · ${z.lat.toFixed(4)}, ${z.lng.toFixed(4)}${z.editado ? ` · ${E("corregido", "edited")} ${cuando(z.editado)}` : ""}`,
      tag: z.retirado ? E("RETIRADO", "RETIRED") : z.centro ? E("CENTRO", "DOWNTOWN") : undefined, tone: "neutral", chev: puede.editar && !z.retirado,
      onClick: puede.editar && !z.retirado ? () => setForm({ t: "barrio", id: z.id, es: z.es, en: z.en, calleEs: z.calleEs, calleEn: z.calleEn, lat: String(z.lat), lng: String(z.lng) }) : undefined })) });
  B.push({ type: "kv", cols: 1, items: [{ k: E(`PUEBLOS CERCANOS (${d.towns.length})`, `NEARBY TOWNS (${d.towns.length})`), v: d.towns.map((t) => t.n).join(" · ") || "—" }] });

  // Cerrar (o bajar): lo pide una persona, lo aprueba otra.
  if ((d.status === "on" || d.status === "beta") && !d.cierre && puede.aprobar) {
    const opciones = (d.status === "on" ? ["beta", "soon", "off"] : ["soon", "off"]).map((k) => ({ k, l: est(k) }));
    B.push({ type: "acts", items: [{ l: E("Pedir cierre", "Request close"), v: "danger", icon: "ban", onClick: () => setConf({ titulo: E(`Cerrar ${d.name}`, `Close ${d.name}`), peligro: true, cta: E("Pedir el cierre", "Request the close"),
      sub: E("Lo aprueba otra persona del equipo; mientras, la ciudad sigue como está. Tu motivo lo ve quien lo aprueba.", "Another team member approves it; meanwhile the city stays as it is. The approver sees your reason."),
      elegir: { label: E("PASA A", "GOES TO"), items: opciones }, hacer: (m, e) => res(ciudadPedirCierre(d.id, e ?? "", m)) }) }] });
  }

  // Historial de estados (solo inserción).
  if (d.historial.length) B.push({ type: "timeline", k: E("HISTORIAL DE LA CIUDAD", "CITY HISTORY"), items: d.historial.map((h) => ({
    t: `${est(h.de)} → ${est(h.a)} · ${h.via === "asistente" ? E("con el asistente", "with the wizard") : h.via === "cierre" ? E("cierre aprobado", "approved close") : h.via === "equipo" ? E("el equipo", "the team") : E("directo (semilla o prueba del sandbox)", "direct (sandbox seed or test)")}`,
    s: `${cuando(h.at)}${h.quien ? ` · ${h.quien}` : ""}${h.motivo ? ` · ${h.motivo}` : ""}`.toUpperCase() })) });

  return <div data-pantalla="ADM-CIUD" data-ciudad={d.id} data-estado={d.status} style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
