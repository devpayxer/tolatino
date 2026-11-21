"use client";
/* 5e · ADM-CONT › Hoy en el barrio (Super Admin.dc.html secCont sub «hoy») y › Cuenta oficial (sub «off»).
   Hoy: lo que sale ahora (la misma regla de la base) con su origen — la novedad de qué negocio, quién la publicó, cuándo y cuánto le
   queda — y lo retirado en las últimas 24 h. «Retirar de Hoy» pide motivo, avisa al negocio y deja la novedad en su página.
   Cuenta oficial: escribir (pregunta o encuesta de la semana, aviso), programar a una hora de la ciudad y fijar arriba (una a la vez,
   hasta 7 días). Solo Admin y Ciudad manager escriben; los demás ven. El servidor decide todo. */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { HoyAdmin as DatosHoy } from "@/lib/admin-contenido";
import type { CuentaOficial } from "@/lib/oficial";
import { TEMAS } from "@/lib/comunidad-filtro";
import { hoyRetirar, oficialFijar, oficialPublicar } from "./acciones-hoy";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { useAhora } from "@/lib/ahora";
import { useE } from "./idioma-admin";

type EF = (es: string, en: string) => string;
const NOV = (E: EF): Record<string, string> => ({ oferta: E("Oferta", "Offer"), hoy: E("Hoy hay / Llegó", "Today / Just in"), aviso: E("Aviso", "Notice"), encuesta: E("Encuesta", "Poll"), novedad: E("Novedad", "Update") });
const hace = (iso: string, ahora: number, E: EF) => { const h = (ahora - new Date(iso).getTime()) / 3_600_000; return h < 1 ? E("hace un momento", "just now") : E(`hace ${Math.floor(h)} h`, `${Math.floor(h)} h ago`); };
const fecha = (iso: string, en = false) => new Intl.DateTimeFormat(en ? "en-US" : "es-US", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(iso)).replace(/\./g, "");

function Marco({ conf, setConf, toast, setToast, desk, children }: { conf: Confirmar | null; setConf: (c: Confirmar | null) => void; toast: string | null; setToast: (t: string | null) => void; desk: boolean; children: React.ReactNode }) {
  const router = useRouter(), E = useE();
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("CONTENIDO", "CONTENT"), t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={{ ...conf, titulo: E("¿Por qué?", "Why?") }} desk={desk} onBack={() => setConf(null)} onDone={(r) => { setToast(r.mensaje ?? E("Listo.", "Done.")); setConf(null); router.refresh(); }} />
      <Toast t={toast} desk={desk} />
    </div>);
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}<Toast t={toast} desk={desk} /></div>;
}

export function HoyAdmin({ d, puede, arriba }: { d: DatosHoy; puede: boolean; arriba: Bloque[] }) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), desk = useAncho() >= 1024, E = useE(), N = NOV(E);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const retirar = (x: DatosHoy["filas"][number], si: boolean) => setConf({
    titulo: si ? E(`Retirar de Hoy: «${x.title}»`, `Remove from Today: “${x.title}”`) : E(`Devolver a Hoy: «${x.title}»`, `Put back on Today: “${x.title}”`),
    sub: si ? E(`Sale de Hoy en el barrio y se queda en la página de ${x.bname}. El negocio recibe el motivo. Queda en la auditoría.`, `It leaves Today in the neighborhood and stays on ${x.bname}’s page. The business gets the reason. It stays in the audit log.`) : E("Vuelve a Hoy en el barrio hasta cumplir sus 24 horas.", "It goes back to Today in the neighborhood until its 24 hours are up."),
    peligro: si, cta: si ? E("Retirar de Hoy", "Remove from Today") : E("Devolver a Hoy", "Put back on Today"),
    plantillas: si ? [E("No es una novedad del negocio", "Not an update from the business"), E("Engañosa o con precio falso", "Misleading or with a false price"), E("Datos personales o de otra persona", "Personal data or someone else’s"), E("Repetida varias veces el mismo día", "Repeated several times the same day"), E("Rompe las reglas del barrio", "Breaks the neighborhood rules")] : [E("Se revisó y no rompe las reglas", "Reviewed and it doesn’t break the rules"), E("Fue un error", "It was a mistake")],
    nota: si ? "persona" : "interna", hacer: (m) => hoyRetirar(x.id, si, m),
  });
  const B: Bloque[] = [...arriba,
    { type: "note", tone: "info", icon: "news", t: E("Hoy en el barrio sale de Novedades: lo que un negocio Pro publica para todos sale aquí 24 horas, en tarjetas por negocio. Retirarlo de Hoy no lo quita de su página (para eso, «Ocultar» en Novedades).", "Today in the neighborhood comes from Updates: what a Pro business posts for everyone shows here for 24 hours, in cards per business. Removing it from Today doesn’t take it off their page (for that, “Hide” in Updates).") },
    { type: "kpis", cols: desk ? "repeat(3,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", items: [
      { k: E("EN HOY AHORA", "ON TODAY NOW"), v: String(d.enHoy), s: E("avisos de 24 h", "24 h posts") }, { k: E("NEGOCIOS", "BUSINESSES"), v: String(d.negocios), s: E("con tarjeta hoy", "with a card today") }, { k: E("RETIRADAS", "REMOVED"), v: String(d.retiradas), s: E("últimas 24 h", "last 24 h") }] },
    d.filas.length ? { type: "rows", items: d.filas.map((x) => ({
      key: x.id, icon: "news", t: x.title, dim: !x.enHoy,
      s: x.enHoy ? `${N[x.kind] ?? N.novedad} · ${x.bname} · ${E("origen: Novedades", "source: Updates")}${x.quien ? E(`, publicó ${x.quien}`, `, posted by ${x.quien}`) : ""} · ${hace(x.at, ahora, E)} · ${x.seguidores} ${E("seguidores", "followers")}`
        : `${N[x.kind] ?? N.novedad} · ${x.bname} · ${E("retirada de Hoy", "removed from Today")}${x.offBy ? ` ${E("por", "by")} ${x.offBy}` : ""}${x.off ? `: ${x.off}` : ""}`,
      tag: x.enHoy ? E(`EN HOY · QUEDAN ${x.quedan} H`, `ON TODAY · ${x.quedan} H LEFT`) : E("FUERA DE HOY", "OFF TODAY"), tone: x.enHoy ? "signal" : "danger",
      acts: [...(puede ? [x.enHoy ? { l: E("Retirar de Hoy", "Remove from Today"), v: "danger", icon: "ban", onClick: () => retirar(x, true) } : x.off ? { l: E("Devolver a Hoy", "Put back on Today"), v: "secondary", icon: "plus", onClick: () => retirar(x, false) } : null].filter(Boolean) as { l: string; v: string; icon: string; onClick: () => void }[] : []),
        { l: E("Ver en su página", "See on their page"), v: "secondary", icon: "store", onClick: () => window.open(`/n/${x.biz}?tab=nov`, "_blank", "noopener") }, { l: E("Negocio 360", "Business 360"), v: "secondary", onClick: () => router.push(`/admin/negocios/${x.biz}?tab=cont`) }],
    })) } : { type: "empty", icon: "news", t: E("Nada en Hoy ahora", "Nothing on Today now"), s: E("Cuando un negocio Pro publique una novedad para todos, sale aquí 24 horas.", "When a Pro business posts an update for everyone, it shows here for 24 hours.") },
  ];
  return <Marco conf={conf} setConf={setConf} toast={toast} setToast={setToast} desk={desk}><PanelBloques bloques={B} h1={desk ? 26 : 22} /></Marco>;
}

type Form = { ciudad: string; kind: "pregunta" | "encuesta" | "publicacion"; topic: string; body: string; opts: string[]; dias: number; lang: "es" | "en"; cuando: "ya" | "prog"; sale: string; fijar: number };

export function OficialAdmin({ d, escribe, arriba }: { d: CuentaOficial; escribe: boolean; arriba: Bloque[] }) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), desk = useAncho() >= 1024, E = useE(), en = E("", "x") === "x";
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const [abierto, setAbierto] = useState(false), [err, setErr] = useState<string | null>(null), [pend, start] = useTransition();
  const f0: Form = { ciudad: d.cuentas[0]?.city_id ?? "", kind: "pregunta", topic: "otro", body: "", opts: ["", ""], dias: d.diasEnc[d.diasEnc.length - 1] ?? 1, lang: "es", cuando: "ya", sale: "", fijar: 7 };
  const [f, setF] = useState<Form>(f0);
  const pon = (p: Partial<Form>) => { setErr(null); setF((x) => ({ ...x, ...p })); };
  const nombre = (c: string) => { const n = d.cuentas.find((x) => x.city_id === c)?.name; return (en ? n?.en || n?.es : n?.es) ?? E("Cuenta oficial", "Official account"); };
  const enviar = () => start(async () => {
    const r: ResAdm = await oficialPublicar(f.ciudad, { kind: f.kind, body: f.body, topic: f.kind === "pregunta" ? f.topic : null, opts: f.kind === "encuesta" ? f.opts : undefined, dias: f.dias, lang: f.lang, sale: f.cuando === "prog" ? f.sale.replace(" ", "T") : null, fijar: f.fijar })
      .catch(() => ({ ok: false as const, mensaje: E("No se pudo. Revisa tu conexión.", "It didn’t work. Check your connection.") }));
    if (!r.ok) { setErr(r.mensaje); return; }
    setToast(r.mensaje ?? E("Listo.", "Done.")); setF(f0); setAbierto(false); router.refresh();
  });
  const fijar = (x: CuentaOficial["filas"][number], dias: number) => setConf({
    titulo: dias ? E(`Fijar ${dias} días`, `Pin for ${dias} days`) : E("Desfijar", "Unpin"), sub: dias ? E("Sale arriba del muro de su ciudad. Solo una a la vez: la anterior se desfija. No cambia los votos de nadie.", "It shows at the top of its city’s wall. Only one at a time: the previous one is unpinned. Nobody’s votes change.") : E("Deja de salir arriba del muro.", "It stops showing at the top of the wall."),
    cta: dias ? E("Fijar", "Pin") : E("Desfijar", "Unpin"), plantillas: dias ? [E("Pregunta de la semana", "Question of the week"), E("Encuesta de la semana", "Poll of the week"), E("Aviso importante de la ciudad", "Important city notice")] : [E("Ya pasó", "It’s over"), E("Sale otra fijada", "Another one is pinned")], nota: "interna", hacer: (m) => oficialFijar(x.id, dias, m),
  });
  const form: Bloque[] = !abierto ? [] : [
    { type: "group", k: E("NUEVA PUBLICACIÓN DE LA CUENTA OFICIAL", "NEW OFFICIAL ACCOUNT POST") },
    ...(d.cuentas.length > 1 ? [{ type: "chips" as const, k: E("CIUDAD", "CITY"), items: d.cuentas.map((c) => ({ l: en ? c.name.en || c.name.es : c.name.es, v: f.ciudad === c.city_id ? "selected" : "filter", onClick: () => pon({ ciudad: c.city_id }) })) }] : []),
    { type: "chips", k: E("QUÉ ES", "WHAT IT IS"), items: ([["pregunta", E("Pregunta de la semana", "Question of the week")], ["encuesta", E("Encuesta de la semana", "Poll of the week")], ["publicacion", E("Aviso", "Notice")]] as const).map(([k, l]) => ({ l, v: f.kind === k ? "selected" : "filter", onClick: () => pon({ kind: k }) })) },
    ...(f.kind === "pregunta" ? [{ type: "chips" as const, k: E("TEMA", "TOPIC"), items: TEMAS.map(([k, l, lEn]) => ({ l: en ? lEn : l, v: f.topic === k ? "selected" : "filter", onClick: () => pon({ topic: k }) })) }] : []),
    { type: "field", k: f.kind === "encuesta" ? E("LA PREGUNTA DE LA ENCUESTA", "THE POLL QUESTION") : E("EL TEXTO", "THE TEXT"), val: f.body, onChange: (v) => pon({ body: v }), area: true, rows: 4, max: 1000, count: `${f.body.length}/1000`,
      ph: f.kind === "pregunta" ? E("Pregunta de la semana: ¿quién conoce un buen sastre en la ciudad?", "Question of the week: who knows a good tailor in town?") : f.kind === "encuesta" ? E("Encuesta de la semana: ¿qué quieres más en el festival?", "Poll of the week: what do you want most at the festival?") : E("Aviso de la ciudad", "City notice") },
    ...(f.kind === "encuesta" ? [
      ...f.opts.map((o, i) => ({ type: "field" as const, k: E(`OPCIÓN ${i + 1}`, `OPTION ${i + 1}`), val: o, max: 60, onChange: (v: string) => pon({ opts: f.opts.map((y, j) => (j === i ? v : y)) }) })),
      { type: "acts" as const, items: [...(f.opts.length < 4 ? [{ l: E("Agregar opción", "Add option"), v: "secondary", icon: "plus", onClick: () => pon({ opts: [...f.opts, ""] }) }] : []), ...(f.opts.length > 2 ? [{ l: E("Quitar la última", "Remove the last one"), v: "secondary", onClick: () => pon({ opts: f.opts.slice(0, -1) }) }] : [])] },
      { type: "chips" as const, k: E("CUÁNTO DURA", "HOW LONG IT LASTS"), items: d.diasEnc.map((n) => ({ l: n === 1 ? E("1 día", "1 day") : E(`${n} días`, `${n} days`), v: f.dias === n ? "selected" : "filter", onClick: () => pon({ dias: n }) })) },
    ] : []),
    { type: "chips", k: E("IDIOMA DEL TEXTO", "LANGUAGE OF THE TEXT"), items: ([["es", E("Español", "Spanish")], ["en", E("Inglés", "English")]] as const).map(([k, l]) => ({ l, v: f.lang === k ? "selected" : "filter", onClick: () => pon({ lang: k }) })) },
    { type: "chips", k: E("CUÁNDO SALE", "WHEN IT GOES OUT"), items: ([["ya", E("Ahora", "Now")], ["prog", E("Programar", "Schedule")]] as const).map(([k, l]) => ({ l, v: f.cuando === k ? "selected" : "filter", onClick: () => pon({ cuando: k }) })) },
    ...(f.cuando === "prog" ? [{ type: "field" as const, k: E("FECHA Y HORA (HORA DE LA CIUDAD)", "DATE AND TIME (CITY TIME)"), val: f.sale, ph: "2026-11-09 09:00", max: 16, onChange: (v: string) => pon({ sale: v.replace(/[^\d\-: T]/g, "") }), help: E("Sale sola a esa hora, hasta 30 días adelante.", "It goes out on its own at that time, up to 30 days ahead.") }] : []),
    { type: "chips", k: E("FIJADA ARRIBA DEL MURO", "PINNED AT THE TOP OF THE WALL"), help: E("Una a la vez por ciudad: al salir, la anterior se desfija.", "One at a time per city: when it goes out, the previous one is unpinned."), items: [0, 1, 3, 7].map((n) => ({ l: n ? (n === 1 ? E("1 día", "1 day") : E(`${n} días`, `${n} days`)) : "No", v: f.fijar === n ? "selected" : "filter", onClick: () => pon({ fijar: n }) })) },
    ...(err ? [{ type: "note" as const, tone: "danger" as const, t: err }] : []),
    { type: "acts", items: [{ l: pend ? E("Guardando…", "Saving…") : f.cuando === "prog" ? E(`Programar como ${nombre(f.ciudad)}`, `Schedule as ${nombre(f.ciudad)}`) : E(`Publicar como ${nombre(f.ciudad)}`, `Post as ${nombre(f.ciudad)}`), v: "primary", icon: f.cuando === "prog" ? "clock" : "check", off: pend, onClick: enviar }, { l: E("Cancelar", "Cancel"), v: "secondary", onClick: () => { setAbierto(false); setErr(null); } }] },
  ];
  const B: Bloque[] = [...arriba,
    { type: "note", tone: "info", icon: "verified", t: E("Lo que publica To’Latino como cuenta oficial: pregunta y encuesta de la semana, avisos. Sale con el sello de To’Latino, fijada arriba en Comunidad si se fija, y no gana puntos ni sale en la Tabla del Barrio. No es una persona: nadie la sigue ni le escribe.", "What To’Latino posts as the official account: question and poll of the week, notices. It carries the To’Latino seal, pinned at the top of Community if pinned, and earns no points nor shows on the Neighborhood Board. It isn’t a person: nobody follows it or messages it.") },
    ...(escribe && !abierto ? [{ type: "acts" as const, items: [{ l: E("Nueva publicación", "New post"), v: "action", icon: "plus", onClick: () => setAbierto(true) }] }] : []),
    ...(!escribe ? [{ type: "note" as const, tone: "warn" as const, t: E("Solo Admin y Ciudad manager escriben como la cuenta oficial.", "Only Admin and City manager post as the official account.") }] : []),
    ...form,
    { type: "group", k: E(`PUBLICACIONES · ${d.filas.length}`, `POSTS · ${d.filas.length}`) },
    d.filas.length ? { type: "rows", items: d.filas.map((x) => ({
      key: x.id, icon: x.kind === "encuesta" ? "check" : x.kind === "pregunta" ? "help" : "news", t: x.body, dim: x.status !== "visible",
      s: `${nombre(x.city_id)} · ${x.kind === "pregunta" ? E("Pregunta", "Question") : x.kind === "encuesta" ? E("Encuesta", "Poll") : E("Aviso", "Notice")} · ${x.prog ? `${E("sale", "goes out")} ${fecha(x.publish, en)}` : `${hace(x.publish, ahora, E)} · +${x.up}${x.dn ? ` / −${x.dn}` : ""} · ${x.cms} ${E("comentarios", "comments")}${x.votos != null ? ` · ${x.votos} ${E("votos en la encuesta", "poll votes")}` : ""}`}${x.fijada && x.hasta ? ` · ${E("fijada hasta", "pinned until")} ${fecha(x.hasta, en)}` : ""}${x.staff ? ` · escribió ${x.staff}` : ""}`,
      tag: x.status !== "visible" ? E("OCULTA", "HIDDEN") : x.prog ? E("PROGRAMADA", "SCHEDULED") : x.fijada ? E("FIJADA", "PINNED") : null, tone: x.prog ? "action" : x.fijada ? "ink" : "neutral",
      acts: [...(escribe && x.status === "visible" ? [x.fijada ? { l: E("Desfijar", "Unpin"), v: "secondary", onClick: () => fijar(x, 0) } : { l: E("Fijar 7 días", "Pin 7 days"), v: "secondary", icon: "bolt", onClick: () => fijar(x, 7) }] : []),
        ...(x.prog ? [] : [{ l: E("Ver", "View"), v: "secondary", onClick: () => window.open(`/comunidad/p/${x.id}`, "_blank", "noopener") }])],
    })) } : { type: "empty", icon: "verified", t: E("Todavía no hay publicaciones", "No posts yet"), s: E("La pregunta de la semana se escribe aquí.", "The question of the week is written here.") },
  ];
  return <Marco conf={conf} setConf={setConf} toast={toast} setToast={setToast} desk={desk}><PanelBloques bloques={B} h1={desk ? 26 : 22} /></Marco>;
}
