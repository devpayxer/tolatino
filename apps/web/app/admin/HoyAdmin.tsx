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
import { useE2 } from "./idioma-admin";

type EF = (es: string, en: string) => string;
const NOV = (E2: EF): Record<string, string> => ({ oferta: E2("Oferta", "Offer"), hoy: E2("Hoy hay / Llegó", "Today / Just in"), aviso: E2("Aviso", "Notice"), encuesta: E2("Encuesta", "Poll"), novedad: E2("Novedad", "Update") });
const hace = (iso: string, ahora: number, E2: EF) => { const h = (ahora - new Date(iso).getTime()) / 3_600_000; return h < 1 ? E2("hace un momento", "just now") : E2(`hace ${Math.floor(h)} h`, `${Math.floor(h)} h ago`); };
const fecha = (iso: string, en = false) => new Intl.DateTimeFormat(en ? "en-US" : "es-US", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(iso)).replace(/\./g, "");

function Marco({ conf, setConf, toast, setToast, desk, children }: { conf: Confirmar | null; setConf: (c: Confirmar | null) => void; toast: string | null; setToast: (t: string | null) => void; desk: boolean; children: React.ReactNode }) {
  const router = useRouter(), { E2 } = useE2();
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("CONTENIDO", "CONTENT"), t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={{ ...conf, titulo: E2("¿Por qué?", "Why?") }} desk={desk} onBack={() => setConf(null)} onDone={(r) => { setToast(r.mensaje ?? E2("Listo.", "Done.")); setConf(null); router.refresh(); }} />
      <Toast t={toast} desk={desk} />
    </div>);
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}<Toast t={toast} desk={desk} /></div>;
}

export function HoyAdmin({ d, puede, arriba }: { d: DatosHoy; puede: boolean; arriba: Bloque[] }) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), desk = useAncho() >= 1024, { E2 } = useE2(), N = NOV(E2);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const retirar = (x: DatosHoy["filas"][number], si: boolean) => setConf({
    titulo: si ? E2(`Retirar de Hoy: «${x.title}»`, `Remove from Today: “${x.title}”`) : E2(`Devolver a Hoy: «${x.title}»`, `Put back on Today: “${x.title}”`),
    sub: si ? E2(`Sale de Hoy en el barrio y se queda en la página de ${x.bname}. El negocio recibe el motivo. Queda en la auditoría.`, `It leaves Today in the neighborhood and stays on ${x.bname}’s page. The business gets the reason. It stays in the audit log.`) : E2("Vuelve a Hoy en el barrio hasta cumplir sus 24 horas.", "It goes back to Today in the neighborhood until its 24 hours are up."),
    peligro: si, cta: si ? E2("Retirar de Hoy", "Remove from Today") : E2("Devolver a Hoy", "Put back on Today"),
    plantillas: si ? [E2("No es una novedad del negocio", "Not an update from the business"), E2("Engañosa o con precio falso", "Misleading or with a false price"), E2("Datos personales o de otra persona", "Personal data or someone else’s"), E2("Repetida varias veces el mismo día", "Repeated several times the same day"), E2("Rompe las reglas del barrio", "Breaks the neighborhood rules")] : [E2("Se revisó y no rompe las reglas", "Reviewed and it doesn’t break the rules"), E2("Fue un error", "It was a mistake")],
    nota: si ? "persona" : "interna", hacer: (m) => hoyRetirar(x.id, si, m),
  });
  const B: Bloque[] = [...arriba,
    { type: "note", tone: "info", icon: "news", t: E2("Hoy en el barrio sale de Novedades: lo que un negocio Pro publica para todos sale aquí 24 horas, en tarjetas por negocio. Retirarlo de Hoy no lo quita de su página (para eso, «Ocultar» en Novedades).", "Today in the neighborhood comes from Updates: what a Pro business posts for everyone shows here for 24 hours, in cards per business. Removing it from Today doesn’t take it off their page (for that, “Hide” in Updates).") },
    { type: "kpis", cols: desk ? "repeat(3,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", items: [
      { k: E2("EN HOY AHORA", "ON TODAY NOW"), v: String(d.enHoy), s: E2("avisos de 24 h", "24 h posts") }, { k: E2("NEGOCIOS", "BUSINESSES"), v: String(d.negocios), s: E2("con tarjeta hoy", "with a card today") }, { k: E2("RETIRADAS", "REMOVED"), v: String(d.retiradas), s: E2("últimas 24 h", "last 24 h") }] },
    d.filas.length ? { type: "rows", items: d.filas.map((x) => ({
      key: x.id, icon: "news", t: x.title, dim: !x.enHoy,
      s: x.enHoy ? `${N[x.kind] ?? N.novedad} · ${x.bname} · ${E2("origen: Novedades", "source: Updates")}${x.quien ? E2(`, publicó ${x.quien}`, `, posted by ${x.quien}`) : ""} · ${hace(x.at, ahora, E2)} · ${x.seguidores} ${E2("seguidores", "followers")}`
        : `${N[x.kind] ?? N.novedad} · ${x.bname} · ${E2("retirada de Hoy", "removed from Today")}${x.offBy ? ` ${E2("por", "by")} ${x.offBy}` : ""}${x.off ? `: ${x.off}` : ""}`,
      tag: x.enHoy ? E2(`EN HOY · QUEDAN ${x.quedan} H`, `ON TODAY · ${x.quedan} H LEFT`) : E2("FUERA DE HOY", "OFF TODAY"), tone: x.enHoy ? "signal" : "danger",
      acts: [...(puede ? [x.enHoy ? { l: E2("Retirar de Hoy", "Remove from Today"), v: "danger", icon: "ban", onClick: () => retirar(x, true) } : x.off ? { l: E2("Devolver a Hoy", "Put back on Today"), v: "secondary", icon: "plus", onClick: () => retirar(x, false) } : null].filter(Boolean) as { l: string; v: string; icon: string; onClick: () => void }[] : []),
        { l: E2("Ver en su página", "See on their page"), v: "secondary", icon: "store", onClick: () => window.open(`/n/${x.biz}?tab=nov`, "_blank", "noopener") }, { l: E2("Negocio 360", "Business 360"), v: "secondary", onClick: () => router.push(`/admin/negocios/${x.biz}?tab=cont`) }],
    })) } : { type: "empty", icon: "news", t: E2("Nada en Hoy ahora", "Nothing on Today now"), s: E2("Cuando un negocio Pro publique una novedad para todos, sale aquí 24 horas.", "When a Pro business posts an update for everyone, it shows here for 24 hours.") },
  ];
  return <Marco conf={conf} setConf={setConf} toast={toast} setToast={setToast} desk={desk}><PanelBloques bloques={B} h1={desk ? 26 : 22} /></Marco>;
}

type Form = { ciudad: string; kind: "pregunta" | "encuesta" | "publicacion"; topic: string; body: string; opts: string[]; dias: number; lang: "es" | "en"; cuando: "ya" | "prog"; sale: string; fijar: number };

export function OficialAdmin({ d, escribe, arriba }: { d: CuentaOficial; escribe: boolean; arriba: Bloque[] }) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), desk = useAncho() >= 1024, { E2 } = useE2(), en = E2("", "x") === "x";
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const [abierto, setAbierto] = useState(false), [err, setErr] = useState<string | null>(null), [pend, start] = useTransition();
  const f0: Form = { ciudad: d.cuentas[0]?.city_id ?? "", kind: "pregunta", topic: "otro", body: "", opts: ["", ""], dias: d.diasEnc[d.diasEnc.length - 1] ?? 1, lang: "es", cuando: "ya", sale: "", fijar: 7 };
  const [f, setF] = useState<Form>(f0);
  const pon = (p: Partial<Form>) => { setErr(null); setF((x) => ({ ...x, ...p })); };
  const nombre = (c: string) => { const n = d.cuentas.find((x) => x.city_id === c)?.name; return (en ? n?.en || n?.es : n?.es) ?? E2("Cuenta oficial", "Official account"); };
  const enviar = () => start(async () => {
    const r: ResAdm = await oficialPublicar(f.ciudad, { kind: f.kind, body: f.body, topic: f.kind === "pregunta" ? f.topic : null, opts: f.kind === "encuesta" ? f.opts : undefined, dias: f.dias, lang: f.lang, sale: f.cuando === "prog" ? f.sale.replace(" ", "T") : null, fijar: f.fijar })
      .catch(() => ({ ok: false as const, mensaje: E2("No se pudo. Revisa tu conexión.", "It didn’t work. Check your connection.") }));
    if (!r.ok) { setErr(r.mensaje); return; }
    setToast(r.mensaje ?? E2("Listo.", "Done.")); setF(f0); setAbierto(false); router.refresh();
  });
  const fijar = (x: CuentaOficial["filas"][number], dias: number) => setConf({
    titulo: dias ? E2(`Fijar ${dias} días`, `Pin for ${dias} days`) : E2("Desfijar", "Unpin"), sub: dias ? E2("Sale arriba del muro de su ciudad. Solo una a la vez: la anterior se desfija. No cambia los votos de nadie.", "It shows at the top of its city’s wall. Only one at a time: the previous one is unpinned. Nobody’s votes change.") : E2("Deja de salir arriba del muro.", "It stops showing at the top of the wall."),
    cta: dias ? E2("Fijar", "Pin") : E2("Desfijar", "Unpin"), plantillas: dias ? [E2("Pregunta de la semana", "Question of the week"), E2("Encuesta de la semana", "Poll of the week"), E2("Aviso importante de la ciudad", "Important city notice")] : [E2("Ya pasó", "It’s over"), E2("Sale otra fijada", "Another one is pinned")], nota: "interna", hacer: (m) => oficialFijar(x.id, dias, m),
  });
  const form: Bloque[] = !abierto ? [] : [
    { type: "group", k: E2("NUEVA PUBLICACIÓN DE LA CUENTA OFICIAL", "NEW OFFICIAL ACCOUNT POST") },
    ...(d.cuentas.length > 1 ? [{ type: "chips" as const, k: E2("CIUDAD", "CITY"), items: d.cuentas.map((c) => ({ l: en ? c.name.en || c.name.es : c.name.es, v: f.ciudad === c.city_id ? "selected" : "filter", onClick: () => pon({ ciudad: c.city_id }) })) }] : []),
    { type: "chips", k: E2("QUÉ ES", "WHAT IT IS"), items: ([["pregunta", E2("Pregunta de la semana", "Question of the week")], ["encuesta", E2("Encuesta de la semana", "Poll of the week")], ["publicacion", E2("Aviso", "Notice")]] as const).map(([k, l]) => ({ l, v: f.kind === k ? "selected" : "filter", onClick: () => pon({ kind: k }) })) },
    ...(f.kind === "pregunta" ? [{ type: "chips" as const, k: E2("TEMA", "TOPIC"), items: TEMAS(!en).map(([k, l]) => ({ l, v: f.topic === k ? "selected" : "filter", onClick: () => pon({ topic: k }) })) }] : []),
    { type: "field", k: f.kind === "encuesta" ? E2("LA PREGUNTA DE LA ENCUESTA", "THE POLL QUESTION") : E2("EL TEXTO", "THE TEXT"), val: f.body, onChange: (v) => pon({ body: v }), area: true, rows: 4, max: 1000, count: `${f.body.length}/1000`,
      ph: f.kind === "pregunta" ? E2("Pregunta de la semana: ¿quién conoce un buen sastre en la ciudad?", "Question of the week: who knows a good tailor in town?") : f.kind === "encuesta" ? E2("Encuesta de la semana: ¿qué quieres más en el festival?", "Poll of the week: what do you want most at the festival?") : E2("Aviso de la ciudad", "City notice") },
    ...(f.kind === "encuesta" ? [
      ...f.opts.map((o, i) => ({ type: "field" as const, k: E2(`OPCIÓN ${i + 1}`, `OPTION ${i + 1}`), val: o, max: 60, onChange: (v: string) => pon({ opts: f.opts.map((y, j) => (j === i ? v : y)) }) })),
      { type: "acts" as const, items: [...(f.opts.length < 4 ? [{ l: E2("Agregar opción", "Add option"), v: "secondary", icon: "plus", onClick: () => pon({ opts: [...f.opts, ""] }) }] : []), ...(f.opts.length > 2 ? [{ l: E2("Quitar la última", "Remove the last one"), v: "secondary", onClick: () => pon({ opts: f.opts.slice(0, -1) }) }] : [])] },
      { type: "chips" as const, k: E2("CUÁNTO DURA", "HOW LONG IT LASTS"), items: d.diasEnc.map((n) => ({ l: n === 1 ? E2("1 día", "1 day") : E2(`${n} días`, `${n} days`), v: f.dias === n ? "selected" : "filter", onClick: () => pon({ dias: n }) })) },
    ] : []),
    { type: "chips", k: E2("IDIOMA DEL TEXTO", "LANGUAGE OF THE TEXT"), items: ([["es", E2("Español", "Spanish")], ["en", E2("Inglés", "English")]] as const).map(([k, l]) => ({ l, v: f.lang === k ? "selected" : "filter", onClick: () => pon({ lang: k }) })) },
    { type: "chips", k: E2("CUÁNDO SALE", "WHEN IT GOES OUT"), items: ([["ya", E2("Ahora", "Now")], ["prog", E2("Programar", "Schedule")]] as const).map(([k, l]) => ({ l, v: f.cuando === k ? "selected" : "filter", onClick: () => pon({ cuando: k }) })) },
    ...(f.cuando === "prog" ? [{ type: "field" as const, k: E2("FECHA Y HORA (HORA DE LA CIUDAD)", "DATE AND TIME (CITY TIME)"), val: f.sale, ph: "2026-11-09 09:00", max: 16, onChange: (v: string) => pon({ sale: v.replace(/[^\d\-: T]/g, "") }), help: E2("Sale sola a esa hora, hasta 30 días adelante.", "It goes out on its own at that time, up to 30 days ahead.") }] : []),
    { type: "chips", k: E2("FIJADA ARRIBA DEL MURO", "PINNED AT THE TOP OF THE WALL"), help: E2("Una a la vez por ciudad: al salir, la anterior se desfija.", "One at a time per city: when it goes out, the previous one is unpinned."), items: [0, 1, 3, 7].map((n) => ({ l: n ? (n === 1 ? E2("1 día", "1 day") : E2(`${n} días`, `${n} days`)) : "No", v: f.fijar === n ? "selected" : "filter", onClick: () => pon({ fijar: n }) })) },
    ...(err ? [{ type: "note" as const, tone: "danger" as const, t: err }] : []),
    { type: "acts", items: [{ l: pend ? E2("Guardando…", "Saving…") : f.cuando === "prog" ? E2(`Programar como ${nombre(f.ciudad)}`, `Schedule as ${nombre(f.ciudad)}`) : E2(`Publicar como ${nombre(f.ciudad)}`, `Post as ${nombre(f.ciudad)}`), v: "primary", icon: f.cuando === "prog" ? "clock" : "check", off: pend, onClick: enviar }, { l: E2("Cancelar", "Cancel"), v: "secondary", onClick: () => { setAbierto(false); setErr(null); } }] },
  ];
  const B: Bloque[] = [...arriba,
    { type: "note", tone: "info", icon: "verified", t: E2("Lo que publica To’Latino como cuenta oficial: pregunta y encuesta de la semana, avisos. Sale con el sello de To’Latino, fijada arriba en Comunidad si se fija, y no gana puntos ni sale en la Tabla del Barrio. No es una persona: nadie la sigue ni le escribe.", "What To’Latino posts as the official account: question and poll of the week, notices. It carries the To’Latino seal, pinned at the top of Community if pinned, and earns no points nor shows on the Neighborhood Board. It isn’t a person: nobody follows it or messages it.") },
    ...(escribe && !abierto ? [{ type: "acts" as const, items: [{ l: E2("Nueva publicación", "New post"), v: "action", icon: "plus", onClick: () => setAbierto(true) }] }] : []),
    ...(!escribe ? [{ type: "note" as const, tone: "warn" as const, t: E2("Solo Admin y Ciudad manager escriben como la cuenta oficial.", "Only Admin and City manager post as the official account.") }] : []),
    ...form,
    { type: "group", k: E2(`PUBLICACIONES · ${d.filas.length}`, `POSTS · ${d.filas.length}`) },
    d.filas.length ? { type: "rows", items: d.filas.map((x) => ({
      key: x.id, icon: x.kind === "encuesta" ? "check" : x.kind === "pregunta" ? "help" : "news", t: x.body, dim: x.status !== "visible",
      s: `${nombre(x.city_id)} · ${x.kind === "pregunta" ? E2("Pregunta", "Question") : x.kind === "encuesta" ? E2("Encuesta", "Poll") : E2("Aviso", "Notice")} · ${x.prog ? `${E2("sale", "goes out")} ${fecha(x.publish, en)}` : `${hace(x.publish, ahora, E2)} · +${x.up}${x.dn ? ` / −${x.dn}` : ""} · ${x.cms} ${E2("comentarios", "comments")}${x.votos != null ? ` · ${x.votos} ${E2("votos en la encuesta", "poll votes")}` : ""}`}${x.fijada && x.hasta ? ` · ${E2("fijada hasta", "pinned until")} ${fecha(x.hasta, en)}` : ""}${x.staff ? ` · escribió ${x.staff}` : ""}`,
      tag: x.status !== "visible" ? E2("OCULTA", "HIDDEN") : x.prog ? E2("PROGRAMADA", "SCHEDULED") : x.fijada ? E2("FIJADA", "PINNED") : null, tone: x.prog ? "action" : x.fijada ? "ink" : "neutral",
      acts: [...(escribe && x.status === "visible" ? [x.fijada ? { l: E2("Desfijar", "Unpin"), v: "secondary", onClick: () => fijar(x, 0) } : { l: E2("Fijar 7 días", "Pin 7 days"), v: "secondary", icon: "bolt", onClick: () => fijar(x, 7) }] : []),
        ...(x.prog ? [] : [{ l: E2("Ver", "View"), v: "secondary", onClick: () => window.open(`/comunidad/p/${x.id}`, "_blank", "noopener") }])],
    })) } : { type: "empty", icon: "verified", t: E2("Todavía no hay publicaciones", "No posts yet"), s: E2("La pregunta de la semana se escribe aquí.", "The question of the week is written here.") },
  ];
  return <Marco conf={conf} setConf={setConf} toast={toast} setToast={setToast} desk={desk}><PanelBloques bloques={B} h1={desk ? 26 : 22} /></Marco>;
}
