"use client";
/* Super Admin › Contenido › Anfitriones (decisión AO; regla 8: el triángulo de las voces de la casa). Compuesto con las piezas del admin que ya
   existen (PanelBloques: cabecera, cifras, notas, filas con interruptor y acciones; ConfirmarMotivo para todo cambio, con motivo y auditoría):
   «Pausar a todos», las ocho voces (encender, apagar, editar el estilo), los tipos de publicación, la pregunta del día, el control por ciudad con la
   actividad real que ve y sus cupos de hoy, el gasto del mes contra su tope y el registro por pieza (voz, fuente, motor, modelo, costo y a qué dio
   lugar o por qué se descartó). Los números (espera, tramos, tope) viven en Sistema › Configuración › Comunidad. El servidor decide todo. */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AnfAdm } from "@/lib/anfitriones";
import { MARCA_ANF } from "@/lib/comunidad-comun";
import { TEMA_L, TIPO_ANF_L, type TipoAnf } from "@/lib/anfitriones-comun";
import { anfCiudad, anfPausa, anfPregunta, anfPreguntaRetirar, anfTipo, anfVoz } from "./acciones-anfitriones";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { useE } from "./idioma-admin";

const dolares = (centavos: number) => `$${(centavos / 100).toFixed(2)}`;
const MOTIVO: Record<string, [string, string]> = {
  tope: ["Tope de costo alcanzado", "Cost cap reached"], motor: ["El modelo no respondió", "The model did not answer"], filtro: ["El filtro propio la frenó", "Blocked by the hosts' filter"],
  moderacion: ["La moderación la frenó", "Blocked by moderation"], delicado: ["Tema delicado: silencio", "Sensitive topic: silence"], bloqueo: ["Quien publicó la bloqueó o silenció", "The author blocked or muted it"],
  limite: ["Límite del día de la voz", "The voice's daily limit"], error: ["Error", "Error"], voz_apagada: ["Voz apagada", "Voice off"],
};

export function AnfitrionesAdmin({ d, edita, arriba }: { d: AnfAdm; edita: boolean; arriba: Bloque[] }) {
  const router = useRouter(), desk = useAncho() >= 1024, E = useE(), en = E("", "x") === "x";
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  const L = (x: { es: string; en: string }) => (en ? x.en : x.es);
  const marca = (g: "m" | "f") => L(MARCA_ANF[g]);
  const nombreVoz = (id: string) => d.voces.find((v) => v.id === id)?.nombre ?? "—";
  const MODO: Record<string, string> = { auto: E("Automático", "Automatic"), manual: E("Manual", "Manual"), off: E("Apagado", "Off") };

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("CONTENIDO · ANFITRIONES", "CONTENT · HOSTS"), t: E("Anfitriones", "Hosts"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  const pausa = () => setConf({
    titulo: d.pausa ? E("Reanudar a todas las voces", "Resume all voices") : E("Pausar a todas las voces", "Pause all voices"),
    sub: d.pausa ? E("Vuelven a publicar y responder según el modo de cada ciudad.", "They post and reply again according to each city's mode.") : E("Ninguna voz publica ni responde en ninguna ciudad hasta que la reanudes. Lo ya publicado se queda.", "No voice posts or replies in any city until you resume. What was posted stays."),
    peligro: !d.pausa, cta: d.pausa ? E("Reanudar", "Resume") : E("Pausar a todos", "Pause all"),
    plantillas: d.pausa ? [E("Revisado", "Reviewed")] : [E("Revisión del contenido", "Content review"), E("Algo salió mal", "Something went wrong")],
    nota: "interna", hacer: (m) => anfPausa(!d.pausa, m),
  });
  const vozTg = (v: AnfAdm["voces"][number]) => setConf({
    titulo: v.active ? E(`Apagar a ${v.nombre}`, `Turn off ${v.nombre}`) : E(`Encender a ${v.nombre}`, `Turn on ${v.nombre}`),
    sub: v.active ? E("Deja de publicar y de responder en todas las ciudades. Lo que ya publicó se queda, con su marca.", "It stops posting and replying in every city. What it posted stays, with its mark.") : E("Publica y responde en las ciudades encendidas, siempre con su marca.", "It posts and replies in the cities that are on, always with its mark."),
    peligro: v.active, plantillas: [E("Prueba en el sandbox", "Sandbox test"), E("La ciudad ya conversa sola", "The city already talks on its own")],
    nota: "interna", hacer: (m) => anfVoz(v.id, { active: !v.active }, m),
  });
  const vozEstilo = (v: AnfAdm["voces"][number]) => setConf({
    titulo: E(`Cómo habla ${v.nombre}`, `How ${v.nombre} talks`), sub: E("El texto que guía su forma de hablar. Nunca cambia sus reglas: sin precios, sin datos de nadie, sin política ni religión.", "The text that guides how it talks. It never changes its rules: no prices, no one's data, no politics or religion."),
    valor: { k: E("ESTILO", "STYLE"), ini: v.style, area: true, max: 1500 }, plantillas: [E("Ajuste de tono", "Tone adjustment")],
    nota: "interna", hacer: (m, _e, valor) => anfVoz(v.id, { style: valor }, m),
  });
  const tipoTg = (t: AnfAdm["tipos"][number]) => setConf({
    titulo: t.active ? E(`Apagar «${L(TIPO_ANF_L[t.key])}»`, `Turn off «${L(TIPO_ANF_L[t.key])}»`) : E(`Encender «${L(TIPO_ANF_L[t.key])}»`, `Turn on «${L(TIPO_ANF_L[t.key])}»`),
    sub: E(`Lo publica ${nombreVoz(t.voz)}, con los datos de la app y sin IA de fuera.`, `${nombreVoz(t.voz)} posts it, with app data and no outside AI.`),
    peligro: t.active, plantillas: [E("Prueba en el sandbox", "Sandbox test"), E("No aporta", "Not useful")],
    nota: "interna", hacer: (m) => anfTipo(t.key, !t.active, m),
  });
  const preguntaNueva = () => setConf({
    titulo: E("Pregunta del día nueva", "New question of the day"), sub: E("Entra a la lista; cada ciudad recibe una al día, en orden.", "It joins the list; each city gets one a day, in order."),
    valor: { k: E("PREGUNTA", "QUESTION"), ini: "", area: true, max: 300 }, elegir: { label: E("QUIÉN LA PUBLICA", "WHO POSTS IT"), items: d.voces.map((v) => ({ k: v.id, l: v.nombre })) },
    ini: E("Pregunta nueva", "New question"), nota: "interna", hacer: (m, voz, valor) => anfPregunta(valor, voz ?? "", m),
  });
  const preguntaFuera = (q: AnfAdm["preguntas"][number]) => setConf({
    titulo: E("Retirar la pregunta", "Retire the question"), sub: `«${q.body}»`, peligro: true, plantillas: [E("Ya se usó", "Already used"), E("No funciona", "Doesn't work")],
    nota: "interna", hacer: (m) => anfPreguntaRetirar(q.id, m),
  });
  const ciudad = (c: AnfAdm["ciudades"][number]) => setConf({
    titulo: E(`Anfitriones en ${c.name}`, `Hosts in ${c.name}`),
    sub: E(`Actividad real en 7 días: ${c.actividad}. Automático: los tramos de Configuración deciden los cupos y bajan solos cuando la gente conversa. Manual: escribe «publicaciones/respuestas» al día.`, `Real activity in 7 days: ${c.actividad}. Automatic: the Settings tiers set the quotas and drop on their own as people talk. Manual: write «posts/replies» per day.`),
    elegir: { label: E("MODO", "MODE"), items: (["auto", "manual", "off"] as const).map((k) => ({ k, l: MODO[k]! })), ini: c.mode }, valor: { k: E("MANUAL · PUBLICACIONES/RESPUESTAS AL DÍA", "MANUAL · POSTS/REPLIES PER DAY"), ini: `${c.mp}/${c.mr}`, max: 7 },
    plantillas: [E("Arranque de la ciudad", "City launch"), E("La ciudad ya conversa sola", "The city already talks on its own")],
    nota: "interna", hacer: (m, modo, valor) => { const [a, b] = valor.split("/").map((x) => Number(x.trim())); return anfCiudad(c.id, modo ?? c.mode, a ?? 0, b ?? 0, m); },
  });

  const enc = d.ciudades.filter((c) => c.mode !== "off").length, pubs = d.voces.reduce((a, v) => a + v.pubs7, 0), resp = d.voces.reduce((a, v) => a + v.resp7, 0);
  const pct = d.gasto.tope > 0 ? Math.min(100, Math.floor((d.gasto.gastado / d.gasto.tope) * 100)) : 100;
  const B: Bloque[] = [
    { type: "note", tone: d.pausa ? "danger" : "info", icon: d.pausa ? "ban" : "users",
      t: d.pausa ? E("Todas las voces están en pausa: ninguna publica ni responde.", "All voices are paused: none posts or replies.")
        : E("Voces de la casa, siempre marcadas «Anfitrión» o «Anfitriona». Se bajan solas cuando la gente real conversa.", "House voices, always marked «Host». They step back on their own as real people talk."),
      cta: edita ? (d.pausa ? E("Reanudar", "Resume") : E("Pausar a todos", "Pause all")) : undefined, onCta: edita ? pausa : undefined },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("GASTO DEL MES", "SPEND THIS MONTH"), v: dolares(d.gasto.gastado), s: E(`de ${dolares(d.gasto.tope)} · ${pct} %`, `of ${dolares(d.gasto.tope)} · ${pct} %`), bg: pct >= 100 ? "var(--tl-ink)" : undefined, fg: pct >= 100 ? "var(--tl-white)" : undefined },
      { k: E("PUBLICACIONES · 7 DÍAS", "POSTS · 7 DAYS"), v: String(pubs) }, { k: E("RESPUESTAS · 7 DÍAS", "REPLIES · 7 DAYS"), v: String(resp) },
      { k: E("CIUDADES ENCENDIDAS", "CITIES ON"), v: `${enc}/${d.ciudades.length}` },
    ] },
    { type: "group", k: E("LAS VOCES", "THE VOICES") },
    { type: "rows", items: d.voces.map((v) => ({ key: v.id, imgIni: v.nombre.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(), t: `${v.nombre} · ${marca(v.gender)}`,
      s: `${L(TEMA_L[v.topic])} · ${v.country} · ${E(`${v.pubs7} publicaciones y ${v.resp7} respuestas en 7 días`, `${v.pubs7} posts and ${v.resp7} replies in 7 days`)}`, m: v.style.slice(0, 140) + (v.style.length > 140 ? "…" : ""),
      tag: v.active ? E("ENCENDIDA", "ON") : E("APAGADA", "OFF"), tone: v.active ? "action" : "neutral",
      ...(edita ? { tgOn: v.active, onTg: () => vozTg(v), acts: [{ l: E("Cómo habla", "How it talks"), v: "secondary", onClick: () => vozEstilo(v) }] } : {}) })) },
    { type: "group", k: E("QUÉ PUBLICAN", "WHAT THEY POST") },
    { type: "rows", items: d.tipos.map((t) => ({ key: t.key, icon: t.key === "empleos" ? "brief" : t.key === "eventos" ? "calendar" : t.key === "negocio_nuevo" ? "store" : t.key === "noticias" ? "news" : "help",
      t: L(TIPO_ANF_L[t.key as TipoAnf]), s: t.key === "noticias" ? E("Fuentes RSS: todavía no está construido.", "RSS sources: not built yet.") : E(`Lo publica ${nombreVoz(t.voz)} · datos de la app, sin IA`, `${nombreVoz(t.voz)} posts it · app data, no AI`),
      tag: t.active ? E("ENCENDIDO", "ON") : E("APAGADO", "OFF"), tone: t.active ? "action" : "neutral",
      ...(edita && t.key !== "noticias" ? { tgOn: t.active, onTg: () => tipoTg(t) } : {}) })) },
    { type: "group", k: E("PREGUNTA DEL DÍA", "QUESTION OF THE DAY"), ...(edita ? { link: E("Agregar", "Add"), onLink: preguntaNueva } : {}) },
    { type: "rows", items: d.preguntas.map((q) => ({ key: q.id, icon: "help", t: q.body, s: nombreVoz(q.voz), dim: q.status !== "active",
      tag: q.status === "active" ? undefined : E("RETIRADA", "RETIRED"), ...(edita && q.status === "active" ? { acts: [{ l: E("Retirar", "Retire"), v: "secondary", onClick: () => preguntaFuera(q) }] } : {}) })) },
    { type: "group", k: E("POR CIUDAD · SE BAJAN SOLAS", "BY CITY · THEY STEP BACK ON THEIR OWN") },
    { type: "rows", items: d.ciudades.map((c) => ({ key: c.id, icon: "pin", t: `${c.name} · ${MODO[c.mode]}`,
      s: E(`Actividad real en 7 días: ${c.actividad} · Cupo de hoy: ${c.pub} publicaciones y ${c.resp} respuestas · Usadas: ${c.usadasPub} y ${c.usadasResp}`, `Real activity in 7 days: ${c.actividad} · Today's quota: ${c.pub} posts and ${c.resp} replies · Used: ${c.usadasPub} and ${c.usadasResp}`),
      tag: c.mode === "off" ? E("APAGADO", "OFF") : c.pub + c.resp === 0 ? E("CUPO EN CERO", "QUOTA AT ZERO") : MODO[c.mode]!.toUpperCase(), tone: c.mode === "off" ? "neutral" : "action",
      ...(edita ? { acts: [{ l: E("Cambiar", "Change"), v: "secondary", onClick: () => ciudad(c) }] } : {}) })) },
    { type: "note", tone: "info", icon: "info", t: E("Los minutos de espera, las respuestas por hilo, los tramos y el tope de costo están en Sistema › Configuración › Comunidad.", "Wait minutes, replies per thread, tiers and the cost cap are in System › Settings › Community."),
      cta: E("Abrir", "Open"), onCta: () => router.push("/admin/sistema/configuracion") },
    { type: "group", k: E("REGISTRO · ÚLTIMAS 50", "LOG · LAST 50") },
    ...(d.registro.length ? [{ type: "rows" as const, items: d.registro.map((x) => ({ key: x.id, icon: x.outcome === "publicada" ? "check" : "ban",
      t: `${x.voz ?? "—"} · ${x.kind === "respuesta" ? E("Respuesta", "Reply") : L(TIPO_ANF_L[x.kind as TipoAnf] ?? { es: x.kind, en: x.kind })} · ${x.ciudad}`,
      s: `${x.outcome === "publicada" ? E("Publicada", "Posted") : `${E("Descartada", "Discarded")}: ${MOTIVO[x.reason ?? "error"] ? (en ? MOTIVO[x.reason ?? "error"]![1] : MOTIVO[x.reason ?? "error"]![0]) : x.reason}`}${x.detail ? ` (${x.detail})` : ""} · ${x.motor}${x.modelo ? ` · ${x.modelo}` : ""} · ${E("costo", "cost")} ${dolares(x.costo)} · ${x.ref}`,
      m: new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(x.at)),
      ...(x.post ? { chev: true, onClick: () => router.push(`/admin/contenido/hilo/${x.post}`) } : {}) })) }]
      : [{ type: "empty" as const, icon: "users", t: E("Todavía nada", "Nothing yet"), s: E("Cuando una voz publique o descarte algo, sale aquí con su costo.", "When a voice posts or discards something, it shows here with its cost.") }]),
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-screen-label="ADM-CONT · Anfitriones">
      <PanelBloques bloques={[...arriba, ...B]} h1={desk ? 26 : 22} />
      <Toast t={toast} desk={desk} />
    </div>
  );
}
