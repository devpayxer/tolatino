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

const NOV: Record<string, string> = { oferta: "Oferta", hoy: "Hoy hay / Llegó", aviso: "Aviso", encuesta: "Encuesta", novedad: "Novedad" };
const hace = (iso: string) => { const h = (Date.now() - new Date(iso).getTime()) / 3_600_000; return h < 1 ? "hace un momento" : `hace ${Math.floor(h)} h`; };
const fecha = (iso: string) => new Intl.DateTimeFormat("es-US", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(iso)).replace(/\./g, "");

function Marco({ conf, setConf, toast, setToast, desk, children }: { conf: Confirmar | null; setConf: (c: Confirmar | null) => void; toast: string | null; setToast: (t: string | null) => void; desk: boolean; children: React.ReactNode }) {
  const router = useRouter();
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "CONTENIDO", t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={{ ...conf, titulo: "¿Por qué?" }} desk={desk} onBack={() => setConf(null)} onDone={(r) => { setToast(r.mensaje ?? "Listo."); setConf(null); router.refresh(); }} />
      <Toast t={toast} desk={desk} />
    </div>);
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}<Toast t={toast} desk={desk} /></div>;
}

export function HoyAdmin({ d, puede, arriba }: { d: DatosHoy; puede: boolean; arriba: Bloque[] }) {
  const router = useRouter(), desk = useAncho() >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const retirar = (x: DatosHoy["filas"][number], si: boolean) => setConf({
    titulo: si ? `Retirar de Hoy: «${x.title}»` : `Devolver a Hoy: «${x.title}»`,
    sub: si ? `Sale de Hoy en el barrio y se queda en la página de ${x.bname}. El negocio recibe el motivo. Queda en la auditoría.` : "Vuelve a Hoy en el barrio hasta cumplir sus 24 horas.",
    peligro: si, cta: si ? "Retirar de Hoy" : "Devolver a Hoy",
    plantillas: si ? ["No es una novedad del negocio", "Engañosa o con precio falso", "Datos personales o de otra persona", "Repetida varias veces el mismo día", "Rompe las reglas del barrio"] : ["Se revisó y no rompe las reglas", "Fue un error"],
    hacer: (m) => hoyRetirar(x.id, si, m),
  });
  const B: Bloque[] = [...arriba,
    { type: "note", tone: "info", icon: "news", t: "Hoy en el barrio sale de Novedades: lo que un negocio Pro publica para todos sale aquí 24 horas, en tarjetas por negocio. Retirarlo de Hoy no lo quita de su página (para eso, «Ocultar» en Novedades)." },
    { type: "kpis", cols: desk ? "repeat(3,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", items: [
      { k: "EN HOY AHORA", v: String(d.enHoy), s: "avisos de 24 h" }, { k: "NEGOCIOS", v: String(d.negocios), s: "con tarjeta hoy" }, { k: "RETIRADAS", v: String(d.retiradas), s: "últimas 24 h" }] },
    d.filas.length ? { type: "rows", items: d.filas.map((x) => ({
      key: x.id, icon: "news", t: x.title, dim: !x.enHoy,
      s: x.enHoy ? `${NOV[x.kind] ?? "Novedad"} · ${x.bname} · origen: Novedades${x.quien ? `, publicó ${x.quien}` : ""} · ${hace(x.at)} · ${x.seguidores} seguidores`
        : `${NOV[x.kind] ?? "Novedad"} · ${x.bname} · retirada de Hoy${x.offBy ? ` por ${x.offBy}` : ""}${x.off ? `: ${x.off}` : ""}`,
      tag: x.enHoy ? `EN HOY · QUEDAN ${x.quedan} H` : "FUERA DE HOY", tone: x.enHoy ? "signal" : "danger",
      acts: [...(puede ? [x.enHoy ? { l: "Retirar de Hoy", v: "danger", icon: "ban", onClick: () => retirar(x, true) } : x.off ? { l: "Devolver a Hoy", v: "secondary", icon: "undo", onClick: () => retirar(x, false) } : null].filter(Boolean) as { l: string; v: string; icon: string; onClick: () => void }[] : []),
        { l: "Ver en su página", v: "secondary", icon: "store", onClick: () => window.open(`/n/${x.biz}?tab=nov`, "_blank", "noopener") }, { l: "Negocio 360", v: "secondary", onClick: () => router.push(`/admin/negocios/${x.biz}?tab=cont`) }],
    })) } : { type: "empty", icon: "news", t: "Nada en Hoy ahora", s: "Cuando un negocio Pro publique una novedad para todos, sale aquí 24 horas." },
  ];
  return <Marco conf={conf} setConf={setConf} toast={toast} setToast={setToast} desk={desk}><PanelBloques bloques={B} h1={desk ? 26 : 22} /></Marco>;
}

type Form = { ciudad: string; kind: "pregunta" | "encuesta" | "publicacion"; topic: string; body: string; opts: string[]; dias: number; lang: "es" | "en"; cuando: "ya" | "prog"; sale: string; fijar: number };

export function OficialAdmin({ d, escribe, arriba }: { d: CuentaOficial; escribe: boolean; arriba: Bloque[] }) {
  const router = useRouter(), desk = useAncho() >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const [abierto, setAbierto] = useState(false), [err, setErr] = useState<string | null>(null), [pend, start] = useTransition();
  const f0: Form = { ciudad: d.cuentas[0]?.city_id ?? "", kind: "pregunta", topic: "otro", body: "", opts: ["", ""], dias: d.diasEnc[d.diasEnc.length - 1] ?? 1, lang: "es", cuando: "ya", sale: "", fijar: 7 };
  const [f, setF] = useState<Form>(f0);
  const pon = (p: Partial<Form>) => { setErr(null); setF((x) => ({ ...x, ...p })); };
  const nombre = (c: string) => d.cuentas.find((x) => x.city_id === c)?.name.es ?? "Cuenta oficial";
  const enviar = () => start(async () => {
    const r: ResAdm = await oficialPublicar(f.ciudad, { kind: f.kind, body: f.body, topic: f.kind === "pregunta" ? f.topic : null, opts: f.kind === "encuesta" ? f.opts : undefined, dias: f.dias, lang: f.lang, sale: f.cuando === "prog" ? f.sale.replace(" ", "T") : null, fijar: f.fijar })
      .catch(() => ({ ok: false as const, mensaje: "No se pudo. Revisa tu conexión." }));
    if (!r.ok) { setErr(r.mensaje); return; }
    setToast(r.mensaje ?? "Listo."); setF(f0); setAbierto(false); router.refresh();
  });
  const fijar = (x: CuentaOficial["filas"][number], dias: number) => setConf({
    titulo: dias ? `Fijar ${dias} días` : "Desfijar", sub: dias ? "Sale arriba del muro de su ciudad. Solo una a la vez: la anterior se desfija. No cambia los votos de nadie." : "Deja de salir arriba del muro.",
    cta: dias ? "Fijar" : "Desfijar", plantillas: dias ? ["Pregunta de la semana", "Encuesta de la semana", "Aviso importante de la ciudad"] : ["Ya pasó", "Sale otra fijada"], hacer: (m) => oficialFijar(x.id, dias, m),
  });
  const form: Bloque[] = !abierto ? [] : [
    { type: "group", k: "NUEVA PUBLICACIÓN DE LA CUENTA OFICIAL" },
    ...(d.cuentas.length > 1 ? [{ type: "chips" as const, k: "CIUDAD", items: d.cuentas.map((c) => ({ l: c.name.es, v: f.ciudad === c.city_id ? "selected" : "filter", onClick: () => pon({ ciudad: c.city_id }) })) }] : []),
    { type: "chips", k: "QUÉ ES", items: ([["pregunta", "Pregunta de la semana"], ["encuesta", "Encuesta de la semana"], ["publicacion", "Aviso"]] as const).map(([k, l]) => ({ l, v: f.kind === k ? "selected" : "filter", onClick: () => pon({ kind: k }) })) },
    ...(f.kind === "pregunta" ? [{ type: "chips" as const, k: "TEMA", items: TEMAS.map(([k, l]) => ({ l, v: f.topic === k ? "selected" : "filter", onClick: () => pon({ topic: k }) })) }] : []),
    { type: "field", k: f.kind === "encuesta" ? "LA PREGUNTA DE LA ENCUESTA" : "EL TEXTO", val: f.body, onChange: (v) => pon({ body: v }), area: true, rows: 4, max: 1000, count: `${f.body.length}/1000`,
      ph: f.kind === "pregunta" ? "Pregunta de la semana: ¿quién conoce un buen sastre en la ciudad?" : f.kind === "encuesta" ? "Encuesta de la semana: ¿qué quieres más en el festival?" : "Aviso de la ciudad" },
    ...(f.kind === "encuesta" ? [
      ...f.opts.map((o, i) => ({ type: "field" as const, k: `OPCIÓN ${i + 1}`, val: o, max: 60, onChange: (v: string) => pon({ opts: f.opts.map((y, j) => (j === i ? v : y)) }) })),
      { type: "acts" as const, items: [...(f.opts.length < 4 ? [{ l: "Agregar opción", v: "secondary", icon: "plus", onClick: () => pon({ opts: [...f.opts, ""] }) }] : []), ...(f.opts.length > 2 ? [{ l: "Quitar la última", v: "secondary", onClick: () => pon({ opts: f.opts.slice(0, -1) }) }] : [])] },
      { type: "chips" as const, k: "CUÁNTO DURA", items: d.diasEnc.map((n) => ({ l: n === 1 ? "1 día" : `${n} días`, v: f.dias === n ? "selected" : "filter", onClick: () => pon({ dias: n }) })) },
    ] : []),
    { type: "chips", k: "IDIOMA DEL TEXTO", items: ([["es", "Español"], ["en", "Inglés"]] as const).map(([k, l]) => ({ l, v: f.lang === k ? "selected" : "filter", onClick: () => pon({ lang: k }) })) },
    { type: "chips", k: "CUÁNDO SALE", items: ([["ya", "Ahora"], ["prog", "Programar"]] as const).map(([k, l]) => ({ l, v: f.cuando === k ? "selected" : "filter", onClick: () => pon({ cuando: k }) })) },
    ...(f.cuando === "prog" ? [{ type: "field" as const, k: "FECHA Y HORA (HORA DE LA CIUDAD)", val: f.sale, ph: "2026-11-09 09:00", max: 16, onChange: (v: string) => pon({ sale: v.replace(/[^\d\-: T]/g, "") }), help: "Sale sola a esa hora, hasta 30 días adelante." }] : []),
    { type: "chips", k: "FIJADA ARRIBA DEL MURO", help: "Una a la vez por ciudad: al salir, la anterior se desfija.", items: [0, 1, 3, 7].map((n) => ({ l: n ? `${n} ${n === 1 ? "día" : "días"}` : "No", v: f.fijar === n ? "selected" : "filter", onClick: () => pon({ fijar: n }) })) },
    ...(err ? [{ type: "note" as const, tone: "danger" as const, t: err }] : []),
    { type: "acts", items: [{ l: pend ? "Guardando…" : f.cuando === "prog" ? `Programar como ${nombre(f.ciudad)}` : `Publicar como ${nombre(f.ciudad)}`, v: "primary", icon: f.cuando === "prog" ? "clock" : "check", off: pend, onClick: enviar }, { l: "Cancelar", v: "secondary", onClick: () => { setAbierto(false); setErr(null); } }] },
  ];
  const B: Bloque[] = [...arriba,
    { type: "note", tone: "info", icon: "verified", t: "Lo que publica To’Latino como cuenta oficial: pregunta y encuesta de la semana, avisos. Sale con el sello de To’Latino, fijada arriba en Comunidad si se fija, y no gana puntos ni sale en la Tabla del Barrio. No es una persona: nadie la sigue ni le escribe." },
    ...(escribe && !abierto ? [{ type: "acts" as const, items: [{ l: "Nueva publicación", v: "action", icon: "plus", onClick: () => setAbierto(true) }] }] : []),
    ...(!escribe ? [{ type: "note" as const, tone: "warn" as const, t: "Solo Admin y Ciudad manager escriben como la cuenta oficial." }] : []),
    ...form,
    { type: "group", k: `PUBLICACIONES · ${d.filas.length}` },
    d.filas.length ? { type: "rows", items: d.filas.map((x) => ({
      key: x.id, icon: x.kind === "encuesta" ? "check" : x.kind === "pregunta" ? "help" : "news", t: x.body, dim: x.status !== "visible",
      s: `${nombre(x.city_id)} · ${x.kind === "pregunta" ? "Pregunta" : x.kind === "encuesta" ? "Encuesta" : "Aviso"} · ${x.prog ? `sale ${fecha(x.publish)}` : `${hace(x.publish)} · +${x.up}${x.dn ? ` / −${x.dn}` : ""} · ${x.cms} comentarios${x.votos != null ? ` · ${x.votos} votos en la encuesta` : ""}`}${x.fijada && x.hasta ? ` · fijada hasta ${fecha(x.hasta)}` : ""}${x.staff ? ` · escribió ${x.staff}` : ""}`,
      tag: x.status !== "visible" ? "OCULTA" : x.prog ? "PROGRAMADA" : x.fijada ? "FIJADA" : null, tone: x.prog ? "action" : x.fijada ? "ink" : "neutral",
      acts: [...(escribe && x.status === "visible" ? [x.fijada ? { l: "Desfijar", v: "secondary", onClick: () => fijar(x, 0) } : { l: "Fijar 7 días", v: "secondary", icon: "bolt", onClick: () => fijar(x, 7) }] : []),
        ...(x.prog ? [] : [{ l: "Ver", v: "secondary", onClick: () => window.open(`/comunidad/p/${x.id}`, "_blank", "noopener") }])],
    })) } : { type: "empty", icon: "verified", t: "Todavía no hay publicaciones", s: "La pregunta de la semana se escribe aquí." },
  ];
  return <Marco conf={conf} setConf={setConf} toast={toast} setToast={setToast} desk={desk}><PanelBloques bloques={B} h1={desk ? 26 : 22} /></Marco>;
}
