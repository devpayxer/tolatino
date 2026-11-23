"use client";
/* Super Admin › Contenido › Anfitriones (decisión AO; regla 8: el triángulo de las voces de la casa). Compuesto con las piezas del admin que ya
   existen (PanelBloques: cabecera, cifras, notas, filas con interruptor y acciones; ConfirmarMotivo para todo cambio, con motivo y auditoría):
   «Pausar a todos», las ocho voces (encender, apagar, editar el estilo), los tipos de publicación, la pregunta del día, el control por ciudad con la
   actividad real que ve y sus cupos de hoy, el gasto del mes contra su tope y el registro por pieza (voz, fuente, motor, modelo, costo y a qué dio
   lugar o por qué se descartó). Los números (espera, tramos, tope) viven en Sistema › Configuración › Comunidad. El servidor decide todo. */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { AnfAdm } from "@/lib/anfitriones";
import type { FuentesAdm } from "@/lib/anfitriones-fuentes";
import { PAIS_L } from "@/lib/noticias-comun";
import { MARCA_ANF } from "@/lib/comunidad-comun";
import { TEMA_L, TIPO_ANF_L, type TipoAnf } from "@/lib/anfitriones-comun";
import { anfCiudad, anfFuente, anfFuenteEstado, anfFuenteProbar, anfPausa, anfPregunta, anfPreguntaRetirar, anfTipo, anfVoz } from "./acciones-anfitriones";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { useE } from "./idioma-admin";

const dolares = (centavos: number) => `$${(centavos / 100).toFixed(2)}`;
const MOTIVO: Record<string, [string, string]> = {
  tope: ["Tope de costo alcanzado", "Cost cap reached"], motor: ["El modelo no respondió", "The model did not answer"], filtro: ["El filtro propio la frenó", "Blocked by the hosts' filter"],
  moderacion: ["La moderación la frenó", "Blocked by moderation"], delicado: ["Tema delicado: silencio", "Sensitive topic: silence"], bloqueo: ["Quien publicó la bloqueó o silenció", "The author blocked or muted it"],
  limite: ["Límite del día de la voz", "The voice's daily limit"], error: ["Error", "Error"], voz_apagada: ["Voz apagada", "Voice off"],
};

/* 5b · El motivo de una nota descartada. */
const MOTIVO_NOTA: Record<string, [string, string]> = {
  politica: ["Política partidista", "Partisan politics"], violencia: ["Suceso violento", "Violent incident"], menores: ["Menores", "Minors"], delicado: ["Tema delicado", "Sensitive topic"],
  palabra: ["Palabra de la fuente", "Source's blocked word"], vieja: ["Ya no es reciente", "No longer recent"], enlace: ["Sin enlace del medio", "No link from the outlet"], filtro: ["El filtro de las voces la frenó", "Blocked by the hosts' filter"],
};
type Forma = { id: string | null; nombre: string; url: string; pais: string; lang: string; veto: string };

export function AnfitrionesAdmin({ d, edita, arriba }: { d: AnfAdm & { noticias: FuentesAdm }; edita: boolean; arriba: Bloque[] }) {
  const router = useRouter(), desk = useAncho() >= 1024, E = useE(), en = E("", "x") === "x";
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  // 5b · La ficha de una fuente (alta o edición) y el resultado de la última «Probar» (se queda a la vista, no solo en el aviso).
  const [forma, setForma] = useState<Forma | null>(null), fRef = useRef<Forma | null>(null);
  const [prueba, setPrueba] = useState<{ id: string; ok: boolean; t: string } | null>(null), [probando, setProbando] = useState<string | null>(null);
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); setForma(null); router.refresh(); };
  const L = (x: { es: string; en: string }) => (en ? x.en : x.es);
  const marca = (g: "m" | "f") => L(MARCA_ANF[g]);
  const nombreVoz = (id: string) => d.voces.find((v) => v.id === id)?.nombre ?? "—";
  const MODO: Record<string, string> = { auto: E("Automático", "Automatic"), manual: E("Manual", "Manual"), off: E("Apagado", "Off") };

  // 5b · La ficha de una fuente: los campos y, debajo, la confirmación con el tema (y su voz) y el motivo (todo queda en la auditoría).
  if (forma) {
    fRef.current = forma;
    const campo = (k: keyof Forma) => (v: string) => setForma((x) => (x ? { ...x, [k]: v } : x));
    const actual = forma.id ? d.noticias.fuentes.find((f) => f.id === forma.id) : null;
    const cf: Confirmar = {
      titulo: forma.id ? E("Guardar la fuente", "Save the source") : E("Fuente nueva", "New source"),
      sub: E("La dirección se revisa con las reglas del lector: solo https, un servidor con nombre y que no resuelva a una dirección privada. Una fuente nueva queda apagada.", "The address is checked with the reader's rules: https only, a named server that does not resolve to a private address. A new source starts off."),
      elegir: { label: E("TEMA Y VOZ", "TOPIC AND VOICE"), items: [{ k: "noticias", l: E("Noticias · Yadira", "News · Yadira") }, { k: "deportes", l: E("Deportes · Rafelito", "Sports · Rafelito") }], ini: actual?.tema ?? "noticias" },
      plantillas: forma.id ? [E("Ajuste de la fuente", "Source adjustment")] : [E("Fuente nueva", "New source")], ini: forma.id ? undefined : E("Fuente nueva", "New source"),
      cta: E("Guardar", "Save"), nota: "interna",
      hacer: (m, tema) => { const f = fRef.current!; return anfFuente(f.id, { nombre: f.nombre, url: f.url, pais: f.pais, tema: tema ?? "", lang: f.lang, veto: f.veto }, m); },
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }} data-screen-label="ADM-CONT · Anfitriones · fuente">
        <PanelBloques bloques={[{ type: "head", eye: E("CONTENIDO · ANFITRIONES · FUENTES", "CONTENT · HOSTS · SOURCES"), t: forma.id ? forma.nombre : E("Fuente nueva", "New source"), onBack: () => setForma(null), h1: desk ? 26 : 22 },
          { type: "field", k: E("MEDIO", "OUTLET"), val: forma.nombre, onChange: campo("nombre"), ph: E("Nombre del medio", "Outlet name"), max: 60 },
          { type: "field", k: E("DIRECCIÓN DEL RSS O ATOM", "RSS OR ATOM ADDRESS"), val: forma.url, onChange: campo("url"), ph: "https://", max: 500, im: "url", help: E("La dirección pública del RSS o Atom del medio. Nunca se copia el artículo: la nota lleva el enlace.", "The outlet's public RSS or Atom address. The article is never copied: the post carries the link.") },
          { type: "field", k: E("PAÍS (DOS LETRAS)", "COUNTRY (TWO LETTERS)"), val: forma.pais, onChange: campo("pais"), ph: "DO", max: 2, help: PAIS_L[forma.pais.toUpperCase()] ?? E("DO, PR, MX, CO, VE, CU…", "DO, PR, MX, CO, VE, CU…") },
          { type: "field", k: E("IDIOMA (ES O EN)", "LANGUAGE (ES OR EN)"), val: forma.lang, onChange: campo("lang"), ph: "es", max: 2 },
          { type: "field", k: E("PALABRAS QUE DESCARTAN UNA NOTA", "WORDS THAT DISCARD A NEWS ITEM"), val: forma.veto, onChange: campo("veto"), area: true, rows: 2, max: 1200, ph: E("separadas por comas", "separated by commas"),
            help: E("Además de lo que nunca se publica: política partidista, sucesos violentos, menores y temas delicados.", "On top of what is never posted: partisan politics, violent incidents, minors and sensitive topics.") }]} />
        <ConfirmarMotivo c={cf} desk={desk} onBack={() => setForma(null)} onDone={hecho} />
        <Toast t={toast} desk={desk} />
      </div>);
  }

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

  // 5b · Fuentes: encender o apagar, retirar (no vuelve) y «Probar» (una lectura, con el resultado a la vista).
  const N = d.noticias;
  const fecha = (iso: string) => new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  const fuenteTg = (f: FuentesAdm["fuentes"][number]) => setConf({
    titulo: f.status === "on" ? E(`Apagar «${f.nombre}»`, `Turn off «${f.nombre}»`) : E(`Encender «${f.nombre}»`, `Turn on «${f.nombre}»`),
    sub: f.status === "on" ? E("Deja de leerse. Lo ya publicado se queda, con su enlace.", "It stops being read. What was posted stays, with its link.") : E(`La lee el barrido y ${f.vozNombre} publica sus notas, con el enlace, dentro del cupo de cada ciudad. Antes de encender se revisa otra vez la dirección.`, `The sweep reads it and ${f.vozNombre} posts its news, with the link, within each city's quota. The address is checked again before turning on.`),
    peligro: f.status === "on", plantillas: [E("Prueba en el sandbox", "Sandbox test"), E("La fuente falla", "The source fails")],
    nota: "interna", hacer: (m) => anfFuenteEstado(f.id, f.status === "on" ? "off" : "on", m),
  });
  const fuenteFuera = (f: FuentesAdm["fuentes"][number]) => setConf({
    titulo: E(`Retirar «${f.nombre}»`, `Retire «${f.nombre}»`), sub: E("Una fuente retirada no vuelve (se da de alta otra). Lo ya publicado se queda.", "A retired source does not come back (add a new one). What was posted stays."),
    peligro: true, plantillas: [E("Ya no sirve", "No longer useful"), E("El medio cerró su RSS", "The outlet closed its RSS")], nota: "interna", hacer: (m) => anfFuenteEstado(f.id, "retired", m),
  });
  const probar = (f: FuentesAdm["fuentes"][number]) => { if (probando) return; setProbando(f.id); anfFuenteProbar(f.id).then((r) => {
    setProbando(null); setPrueba({ id: f.id, ok: r.ok, t: r.mensaje ?? "" }); setToast(r.mensaje ?? ""); router.refresh();
  }, () => { setProbando(null); setToast(E("No se pudo probar ahora.", "Could not test right now.")); }); };

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
      t: L(TIPO_ANF_L[t.key as TipoAnf]), s: t.key === "noticias" ? E(`Yadira y Rafelito, desde las fuentes de abajo (${N.fuentes.filter((f) => f.status === "on").length} encendidas) · resumen con ayuda automática y el enlace al medio`, `Yadira and Rafelito, from the sources below (${N.fuentes.filter((f) => f.status === "on").length} on) · summary with automated help and the link to the outlet`) : E(`Lo publica ${nombreVoz(t.voz)} · datos de la app, sin IA`, `${nombreVoz(t.voz)} posts it · app data, no AI`),
      tag: t.active ? E("ENCENDIDO", "ON") : E("APAGADO", "OFF"), tone: t.active ? "action" : "neutral",
      ...(edita ? { tgOn: t.active, onTg: () => tipoTg(t) } : {}) })) },
    { type: "group", k: E("PREGUNTA DEL DÍA", "QUESTION OF THE DAY"), ...(edita ? { link: E("Agregar", "Add"), onLink: preguntaNueva } : {}) },
    { type: "rows", items: d.preguntas.map((q) => ({ key: q.id, icon: "help", t: q.body, s: nombreVoz(q.voz), dim: q.status !== "active",
      tag: q.status === "active" ? undefined : E("RETIRADA", "RETIRED"), ...(edita && q.status === "active" ? { acts: [{ l: E("Retirar", "Retire"), v: "secondary", onClick: () => preguntaFuera(q) }] } : {}) })) },
    { type: "group", k: E("POR CIUDAD · SE BAJAN SOLAS", "BY CITY · THEY STEP BACK ON THEIR OWN") },
    { type: "rows", items: d.ciudades.map((c) => ({ key: c.id, icon: "pin", t: `${c.name} · ${MODO[c.mode]}`,
      s: E(`Actividad real en 7 días: ${c.actividad} · Cupo de hoy: ${c.pub} publicaciones y ${c.resp} respuestas · Usadas: ${c.usadasPub} y ${c.usadasResp}`, `Real activity in 7 days: ${c.actividad} · Today's quota: ${c.pub} posts and ${c.resp} replies · Used: ${c.usadasPub} and ${c.usadasResp}`),
      tag: c.mode === "off" ? E("APAGADO", "OFF") : c.pub + c.resp === 0 ? E("CUPO EN CERO", "QUOTA AT ZERO") : MODO[c.mode]!.toUpperCase(), tone: c.mode === "off" ? "neutral" : "action",
      ...(edita ? { acts: [{ l: E("Cambiar", "Change"), v: "secondary", onClick: () => ciudad(c) }] } : {}) })) },
    // 5b · Fuentes de noticias: las cifras de 7 días, cada fuente con su estado, su último error y «Probar», y las últimas notas leídas con su motivo.
    { type: "group", k: E("FUENTES DE NOTICIAS", "NEWS SOURCES"), ...(edita ? { link: E("Agregar fuente", "Add source"), onLink: () => setForma({ id: null, nombre: "", url: "https://", pais: "DO", lang: "es", veto: "" }) } : {}) },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("LEÍDAS · 7 DÍAS", "READ · 7 DAYS"), v: String(N.cifras.leidas) }, { k: E("PUBLICADAS · 7 DÍAS", "POSTED · 7 DAYS"), v: String(N.cifras.publicadas) },
      { k: E("DESCARTADAS · 7 DÍAS", "DISCARDED · 7 DAYS"), v: String(N.cifras.descartadas) },
      { k: E("FALLOS DE LECTURA · 7 DÍAS", "READ FAILURES · 7 DAYS"), v: String(N.cifras.fallos), bg: N.cifras.fallos ? "var(--tl-ink)" : undefined, fg: N.cifras.fallos ? "var(--tl-white)" : undefined },
    ] },
    ...(prueba ? [{ type: "note" as const, tone: prueba.ok ? ("ok" as const) : ("danger" as const), icon: prueba.ok ? "check" : "ban", t: `${N.fuentes.find((f) => f.id === prueba.id)?.nombre ?? ""} · ${prueba.t}` }] : []),
    ...(N.fuentes.length ? [{ type: "rows" as const, items: N.fuentes.map((f) => ({ key: f.id, icon: "news", t: `${f.nombre} · ${f.tema === "deportes" ? E("Deportes", "Sports") : E("Noticias", "News")} · ${f.vozNombre}`,
      s: `${f.host} · ${f.pais} · ${f.lang.toUpperCase()} · ${E(`${f.leidas7} ${f.leidas7 === 1 ? "lectura" : "lecturas"}, ${f.nuevas7} ${f.nuevas7 === 1 ? "nota nueva" : "notas nuevas"} y ${f.fallos7} ${f.fallos7 === 1 ? "fallo" : "fallos"} en 7 días`, `${f.leidas7} ${f.leidas7 === 1 ? "read" : "reads"}, ${f.nuevas7} new ${f.nuevas7 === 1 ? "item" : "items"} and ${f.fallos7} ${f.fallos7 === 1 ? "failure" : "failures"} in 7 days`)}`,
      m: f.error && f.fails ? E(`Falló ${f.fails} ${f.fails === 1 ? "vez" : "veces seguidas"}: ${f.error}`, `Failed ${f.fails} ${f.fails === 1 ? "time" : "times in a row"}: ${f.error}`) : f.ultimaOk ? E(`Última lectura bien: ${fecha(f.ultimaOk)}`, `Last good read: ${fecha(f.ultimaOk)}`) : E("Todavía no se ha leído.", "Not read yet."),
      mFg: f.error && f.fails ? "var(--tl-danger)" : undefined, dim: f.status === "retired",
      tag: f.status === "on" ? E("ENCENDIDA", "ON") : f.status === "off" ? E("APAGADA", "OFF") : E("RETIRADA", "RETIRED"), tone: f.status === "on" ? (f.fails ? "danger" : "action") : "neutral",
      ...(edita && f.status !== "retired" ? { tgOn: f.status === "on", onTg: () => fuenteTg(f), acts: [
        { l: probando === f.id ? E("Probando…", "Testing…") : E("Probar", "Test"), v: "secondary", off: !!probando, onClick: () => probar(f) },
        { l: E("Editar", "Edit"), v: "secondary", onClick: () => setForma({ id: f.id, nombre: f.nombre, url: f.url, pais: f.pais, lang: f.lang, veto: f.veto.join(", ") }) },
        { l: E("Retirar", "Retire"), v: "secondary", onClick: () => fuenteFuera(f) }] } : {}) })) }]
      : [{ type: "empty" as const, icon: "news", t: E("Sin fuentes", "No sources"), s: E("En producción las fuentes nacen vacías. Agrega el RSS o Atom de un medio, pruébalo y enciéndelo.", "In production sources start empty. Add an outlet's RSS or Atom, test it and turn it on.") }]),
    { type: "group", k: E("ÚLTIMAS NOTAS LEÍDAS", "LATEST NEWS ITEMS READ") },
    ...(N.notas.length ? [{ type: "rows" as const, items: N.notas.map((n) => ({ key: n.id, icon: n.status === "publicada" ? "check" : n.status === "descartada" ? "ban" : "news",
      t: n.titulo ?? E("(vaciada por retención)", "(cleared by retention)"), dim: n.vaciada,
      s: `${n.fuente} · ${n.status === "publicada" ? E("Publicada", "Posted") : n.status === "nueva" ? E("Nueva", "New") : `${E("Descartada", "Discarded")}: ${MOTIVO_NOTA[n.reason ?? ""] ? (en ? MOTIVO_NOTA[n.reason!]![1] : MOTIVO_NOTA[n.reason!]![0]) : n.reason}`}${n.detail ? ` (${n.detail})` : ""}`,
      m: fecha(n.at), tag: n.status === "publicada" ? E("PUBLICADA", "POSTED") : n.status === "nueva" ? E("NUEVA", "NEW") : E("DESCARTADA", "DISCARDED"), tone: n.status === "descartada" ? "neutral" : "action",
      ...(n.post ? { chev: true, onClick: () => router.push(`/admin/contenido/hilo/${n.post}`) } : {}) })) }]
      : [{ type: "empty" as const, icon: "news", t: E("Todavía nada", "Nothing yet"), s: E("Lo que lean las fuentes encendidas sale aquí con su estado y el motivo si se descartó.", "What the sources that are on read shows here with its status and the reason if discarded.") }]),
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
