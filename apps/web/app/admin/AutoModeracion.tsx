"use client";
/* 5d · ADM-CONT › Auto-moderación (Super Admin.dc.html secCont sub «auto»): las 6 reglas con su interruptor y su texto (+ el umbral de
   auto-ocultar), sus valores, las listas de términos ES/EN (odio · estafa · inmigración · autolesión) y los límites del día. «Teléfonos»
   no se apaga (lo impone la base) y se ve con candado. La regla de fotos dice si el modelo propio responde y, si está apagada o no
   responde, por qué y qué pasa con las fotos. Cada cambio pide motivo y queda en la auditoría. El servidor decide. */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { fotoFondo, type PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { AutoMod } from "@/lib/admin-confianza";
import { conDolares, LIMITES, PARAMS, TIPOS_TERMINO, type ReglaKey } from "@/lib/moderacion-comun";
import { limiteCambiar, reglaCambiar, reglaParams, terminoAgregar, terminoApagar, traduccionTope } from "./acciones-confianza";
import type { ResAdm } from "./acciones-colas";
import type { ResumenFotos } from "@/lib/fotos-resumen";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { useE2 } from "./idioma-admin";

type EF = (es: string, en: string) => string;

/* 9f-4 · Las reglas, sus valores y las listas en inglés para el equipo (lib/moderacion-comun solo las nombra en español). */
const REGLAS_T = (E2: EF): Record<ReglaKey, { t: string; s: string; fija?: string }> => ({
  phone: { t: E2("Teléfonos en publicaciones y comentarios", "Phone numbers in posts and comments"), s: E2("Se bloquea al escribir; el vecino recomienda el negocio y el teléfono sale en su página.", "Blocked while typing; the neighbor recommends the business and the phone shows on its page."), fija: E2("Siempre activa: la base nunca guarda un teléfono, un correo ni un número privado.", "Always on: the database never stores a phone, an email or a private number.") },
  pii: { t: E2("Direcciones de personas", "People’s addresses"), s: E2("Número y calle se rechazan al escribir (siempre). Con la regla encendida, lo que señala dónde vive alguien o una placa va a la cola Reportes para una persona.", "Street number and name are rejected while typing (always). With the rule on, anything pointing to where someone lives or a license plate goes to the Reports queue for a person.") },
  spam: { t: E2("Enlaces y ventas repetidas", "Links and repeated sales"), s: E2("{n} publicaciones o comentarios parecidos en {horas} h → cola Reportes. Los enlaces se muestran como texto.", "{n} similar posts or comments in {horas} h → Reports queue. Links show as text.") },
  hate: { t: E2("Lenguaje discriminatorio", "Discriminatory language"), s: E2("Listas ES/EN (odio, estafa, inmigración): marca para una persona, nunca oculta sola. Inmigración va con prioridad.", "ES/EN lists (hate, scam, immigration): flags for a person, never hides on its own. Immigration gets priority.") },
  rev5: { t: E2("Reseñas en ráfaga", "Review bursts"), s: E2("{n} reseñas sin transacción en {min} min → cola Reportes de usuario.", "{n} reviews without a transaction in {min} min → User reports queue.") },
  img: { t: E2("Fotos: desnudez", "Photos: nudity"), s: E2("Modelo propio (NudeNet, ONNX) antes de publicar → cola Medios marcados. Si no responde, la foto espera revisión manual.", "Our own model (NudeNet, ONNX) before posting → Flagged media queue. If it doesn’t respond, the photo waits for manual review.") },
  autohide: { t: E2("Auto-ocultar por reportes", "Auto-hide by reports"), s: E2("{reportes} reportes de personas y dispositivos distintos en {horas} h (cuentas de más de {edad_h} h) → oculta por revisión, con aviso y apelación.", "{reportes} reports from different people and devices in {horas} h (accounts older than {edad_h} h) → hidden for review, with notice and appeal.") },
  foto1: { t: E2("Fotos públicas · capa 1: modelo propio", "Public photos · layer 1: own model"), s: E2("Al subir: menos de {duda_pct} % de desnudez → se publica; {rechazo_pct} % o más → se rechaza con aviso y «Pedir revisión»; entre los dos → capa 2. Apagada (o si no responde): todo pasa a la capa 2.", "On upload: under {duda_pct} % nudity → published; {rechazo_pct} % or more → rejected with a notice and “Ask for a review”; in between → layer 2. Off (or not responding): everything goes to layer 2.") },
  foto2: { t: E2("Fotos públicas · capa 2: segunda opinión (IA)", "Public photos · layer 2: second opinion (AI)"), s: E2("La foto reducida y una pauta fija, en el mismo pedido ({espera_s} s como mucho): publica, rechaza con motivo o la retiene. Tope de ${tope_dolares} al mes; {intentos} reintentos del barrido. Apagada o al tope: las dudosas quedan retenidas.", "The reduced photo and a fixed guideline, in the same request ({espera_s} s at most): publishes, rejects with a reason or holds it. Cap of ${tope_dolares} a month; {intentos} retries by the sweep. Off or at the cap: doubtful photos are held.") },
  foto3: { t: E2("Fotos públicas · capa 3: reportes", "Public photos · layer 3: reports"), s: E2("{reportes} reportes de cuentas distintas (de más de {edad_h} h; un mismo dispositivo cuenta una vez) → la foto se oculta sola, su archivo sale de lo público y pasa a la capa 2.", "{reportes} reports from different accounts (older than {edad_h} h; one device counts once) → the photo is hidden on its own, its file leaves public storage and goes to layer 2.") },
  foto4: { t: E2("Fotos públicas · capa 4: confianza", "Public photos · layer 4: trust"), s: E2("Negocio verificado con {fotos} fotos visibles y ninguna quitada en {dias} días: sus dudosas se publican sin la capa 2 (las claras se rechazan igual). Cuentas de menos de {nueva_dias} días: {nueva_hora} fotos por hora.", "A verified business with {fotos} visible photos and none removed in {dias} days: its doubtful photos are published without layer 2 (clear ones are still rejected). Accounts younger than {nueva_dias} days: {nueva_hora} photos an hour.") }
});
const PARAMS_T = (E2: EF): Partial<Record<ReglaKey, Record<string, string>>> => ({
  spam: { n: E2("Cuántas parecidas", "How many similar"), horas: E2("En cuántas horas", "Within how many hours") },
  rev5: { n: E2("Cuántas reseñas", "How many reviews"), min: E2("En cuántos minutos", "Within how many minutes") },
  img: { umbral: E2("Umbral del modelo (0–1)", "Model threshold (0–1)") },
  autohide: { reportes: E2("Reportes", "Reports"), horas: E2("En cuántas horas", "Within how many hours"), edad_h: E2("Cuentas de más de (h)", "Accounts older than (h)") },
  foto1: { duda_pct: E2("Desde qué % es dudosa", "Doubtful from %"), rechazo_pct: E2("Desde qué % se rechaza", "Rejected from %") },
  foto2: { tope_cents: E2("Tope al mes (en centavos: 1000 = $10)", "Monthly cap (in cents: 1000 = $10)"), espera_s: E2("Tiempo límite (s)", "Time limit (s)"), intentos: E2("Reintentos del barrido", "Sweep retries") },
  foto3: { reportes: E2("Reportes de cuentas distintas", "Reports from different accounts"), edad_h: E2("Cuentas de más de (h)", "Accounts older than (h)") },
  foto4: { fotos: E2("Fotos visibles del negocio", "Visible business photos"), dias: E2("Sin fotos quitadas en (días)", "No removed photos in (days)"), nueva_dias: E2("Cuenta nueva: menos de (días)", "New account: under (days)"), nueva_hora: E2("Cuenta nueva: fotos por hora", "New account: photos an hour") }
});
const TIPOS_T = (E2: EF): Record<string, string> => ({ odio: E2("Odio", "Hate"), estafa: E2("Estafa", "Scam"), migra: E2("Inmigración", "Immigration"), autolesion: E2("Autolesión", "Self-harm") });
const llena = (s: string, p: Record<string, number>) => s.replace(/\{(\w+)\}/g, (_, x) => String(conDolares(p)[x] ?? ""));

const esFoto = (k: string) => k.startsWith("foto");
export function AutoModeracion({ d, edita, arriba }: { d: AutoMod; edita: boolean; arriba: Bloque[] }) {
  const router = useRouter(), desk = useAncho() >= 1024, { E2 } = useE2(), en = E2("", "x") === "x";
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const [lista, setLista] = useState<string>("odio"), [vals, setVals] = useState<{ k: ReglaKey; v: Record<string, string> } | null>(null);
  const valsRef = useRef(vals); valsRef.current = vals;
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); setVals(null); router.refresh(); };
  const sinPermiso = () => setToast(E2("Tu rol no edita reglas.", "Your role can’t edit rules."));
  const reglasT = REGLAS_T(E2), paramsT = PARAMS_T(E2), tiposT = TIPOS_T(E2), tipoL = (k: string, l: string) => tiposT[k] ?? l;
  const lim = (k: keyof typeof LIMITES) => (en ? LIMITES[k].en : LIMITES[k].es);
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("CONTENIDO · AUTO-MODERACIÓN", "CONTENT · AUTO-MODERATION"), t: conf.titulo, onBack: () => { setConf(null); setVals(null); }, h1: desk ? 26 : 22 }]} />
      {vals && <PanelBloques bloques={(PARAMS[vals.k] ?? []).map(([key, label, min, max]) => ({ type: "field" as const, k: `${(paramsT[vals.k]?.[key] ?? label).toUpperCase()} · ${min}–${max}`, val: vals.v[key] ?? "", im: "decimal", onChange: (v: string) => setVals((x) => (x ? { ...x, v: { ...x.v, [key]: v.replace(/[^\d.,]/g, "").slice(0, 6) } } : x)) }))} />}
      <ConfirmarMotivo c={{ ...conf, titulo: E2("¿Por qué?", "Why?") }} desk={desk} onBack={() => { setConf(null); setVals(null); }} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  const img = d.img, ri = d.reglas.find((r) => r.k === "img")!;
  const estadoImg = !ri.on ? E2("Apagada: las fotos de la Comunidad se publican sin pasar por el modelo. Enciéndela para revisarlas antes de que se vean.", "Off: Community photos are posted without going through the model. Turn it on to check them before they show.")
    : !img.configurado ? E2("Encendida, pero el servicio no está configurado aquí: cada foto nueva espera revisión manual en Medios marcados (nunca se publica sin revisar).", "On, but the service isn’t set up here: every new photo waits for manual review in Flagged media (never posted unreviewed).")
      : img.ok ? E2(`Encendida · ${img.modelo ?? "modelo propio"} · responde en ${img.ms} ms. Solo mide desnudez; violencia y texto promocional los revisa una persona.`, `On · ${img.modelo ?? "own model"} · responds in ${img.ms} ms. It only measures nudity; violence and promotional text are reviewed by a person.`)
        : E2("Encendida, pero el servicio no responde: cada foto nueva espera revisión manual en Medios marcados (nunca se publica sin revisar).", "On, but the service isn’t responding: every new photo waits for manual review in Flagged media (never posted unreviewed).");
  const estadoTrad = !d.trad.configurado ? E2("No está configurado aquí: «Ver traducción» dice «La traducción no está disponible ahora.» y todo lo demás sigue igual. El texto nunca va a un tercero.", "It isn’t set up here: “See translation” says “Translation isn’t available right now.” and everything else stays the same. The text never goes to a third party.")
    : d.trad.ok ? E2(`Responde en ${d.trad.ms} ms · ${d.trad.idiomas.join(" · ")}. Corre en nuestro servidor: el texto de los vecinos nunca sale de él. Lo traducido se guarda y se reutiliza.`, `Responds in ${d.trad.ms} ms · ${d.trad.idiomas.join(" · ")}. It runs on our server: neighbors’ text never leaves it. Translations are saved and reused.`)
      : d.trad.cortado ? E2("No respondió varias veces seguidas: la app dejó de llamarlo un minuto y vuelve a probar sola. Mientras, «Ver traducción» dice que no está disponible.", "It didn’t respond several times in a row: the app stopped calling it for a minute and will retry on its own. Meanwhile, “See translation” says it isn’t available.")
        : E2("No responde: «Ver traducción» dice «La traducción no está disponible ahora.» y todo lo demás sigue igual. El texto nunca va a un tercero.", "Not responding: “See translation” says “Translation isn’t available right now.” and everything else stays the same. The text never goes to a third party.");
  const lnom = TIPOS_TERMINO.find((x) => x[0] === lista);
  const fila = (r: AutoMod["reglas"][number]): Fila => {
    const R = reglasT[r.k], fija = !!R.fija, Rt = R.t, Rf = R.fija;
    return { key: r.k, icon: r.k === "img" || r.k.startsWith("foto") ? "image" : r.k === "autohide" ? "ban" : "bolt", t: Rt,
      s: `${llena(R.s, r.params)}${fija ? ` ${Rf}` : ""}${r.k === "img" ? ` · ${estadoImg}` : ""}${r.quien ? ` · ${E2("Último cambio", "Last change")}: ${r.quien}` : ""}`,
      m: E2(`${r.n30} EN 30 DÍAS`, `${r.n30} IN 30 DAYS`), tag: r.k === "img" && ri.on ? (img.ok ? E2("RESPONDE", "RESPONDING") : E2("NO RESPONDE", "NOT RESPONDING")) : undefined, tone: img.ok ? "signal" : "danger",
      tgOn: r.on, onTg: fija ? () => setToast(Rf!) : !edita ? sinPermiso : () => setConf({ titulo: "", sub: E2(`${r.on ? "Apagar" : "Encender"} «${R.t}». Queda en la auditoría.`, `Turn ${r.on ? "off" : "on"} “${Rt}”. It stays in the audit log.`), peligro: r.on, cta: r.on ? E2("Apagar", "Turn off") : E2("Encender", "Turn on"),
        plantillas: r.on ? [E2("Da demasiados falsos positivos", "Too many false positives"), E2("Prueba controlada", "Controlled test")] : [E2("Volver a la regla de siempre", "Back to the usual rule")], nota: "interna", hacer: (m) => reglaCambiar(r.k, !r.on, m) }),
      acts: PARAMS[r.k] && edita ? [{ l: E2("Cambiar valores", "Change values"), v: "secondary", icon: "edit", onClick: () => { setVals({ k: r.k, v: Object.fromEntries((PARAMS[r.k] ?? []).map(([key]) => [key, String(r.params[key] ?? "")])) }); setConf({ titulo: "", sub: E2(`Valores de «${R.t}».`, `Values for “${Rt}”.`), cta: E2("Guardar", "Save"), plantillas: [E2("Ajuste por falsos positivos", "Adjustment for false positives"), E2("Más estricto", "Stricter")], nota: "interna", hacer: (m) => reglaParams(r.k, valsRef.current?.v ?? {}, m) }); } }] : undefined };
  };
  /* R3 · Fotos públicas · revisión automática (decisión AJ): las cuatro capas con su interruptor y sus valores (la misma fila de arriba), el gasto del mes
     de la segunda opinión contra su tope, las cifras del día y de la semana por capa y cinco publicadas por los modelos, al azar, para que una persona
     las mire. Lo que llega a una persona son las apelaciones (Colas › Apelaciones) y las fotos reportadas (Colas › Medios marcados). */
  const F = d.fotos, usd = (n: number) => `$${n.toFixed(2)}`, tope = F.gasto.topeUsd, usado = F.gasto.gastadoUsd + F.gasto.reservadoUsd, alTope = tope <= 0 || usado >= tope;
  const pct = tope > 0 ? Math.min(100, Math.round((usado / tope) * 100)) : 100;
  const capaL = (c: string) => ({ c1: E2("Capa 1 · modelo propio", "Layer 1 · own model"), c2: E2("Capa 2 · segunda opinión", "Layer 2 · second opinion"), c3: E2("Capa 3 · reportes", "Layer 3 · reports"), c4: E2("Capa 4 · confianza", "Layer 4 · trust"),
    memoria: E2("Memoria de contenido", "Content memory"), persona: E2("Una persona del equipo", "A team member") } as Record<string, string>)[c] ?? c;
  const cifras = (t: ResumenFotos): Bloque => ({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
    { k: E2("PUBLICADAS", "PUBLISHED"), v: String(t.totales.publicadas) }, { k: E2("RETENIDAS", "HELD"), v: String(t.totales.retenidas) },
    { k: E2("RECHAZADAS", "REJECTED"), v: String(t.totales.rechazadas) }, { k: E2("OCULTAS POR REPORTES", "HIDDEN BY REPORTS"), v: String(t.totales.ocultadas) }] });
  const porCapa = (t: ResumenFotos): Bloque => ({ type: "rows", items: t.porCapa.length ? t.porCapa.map((x) => ({ key: x.capa, icon: "image", t: capaL(x.capa),
    s: E2(`${x.publicadas} publicadas · ${x.retenidas} retenidas · ${x.rechazadas} rechazadas · ${x.ocultadas} ocultas`, `${x.publicadas} published · ${x.retenidas} held · ${x.rechazadas} rejected · ${x.ocultadas} hidden`) }))
    : [{ key: "nada", icon: "image", t: E2("Sin movimiento", "No activity"), s: E2("Ninguna foto pasó por la revisión en este periodo.", "No photo went through the review in this period.") }] });
  const bloquesFotos: Bloque[] = [
    { type: "group", k: E2("FOTOS PÚBLICAS · REVISIÓN AUTOMÁTICA (4 CAPAS)", "PUBLIC PHOTOS · AUTOMATIC REVIEW (4 LAYERS)") },
    { type: "note", tone: "info", icon: "image", t: E2("Cada foto pública pasa por cuatro capas antes de verse: el modelo propio, la segunda opinión (IA, con tope de gasto), los reportes de vecinos y la confianza ganada. Ante la duda se retiene, nunca se publica por si acaso. Toda decisión queda en la auditoría; a una persona solo le llegan las apelaciones y las fotos reportadas.",
      "Every public photo goes through four layers before it shows: our own model, the second opinion (AI, with a spending cap), neighbor reports and earned trust. When in doubt it is held, never published just in case. Every decision is in the audit log; a person only gets appeals and reported photos.") },
    { type: "rows", items: d.reglas.filter((r) => esFoto(r.k)).map(fila) },
    { type: "kpis", cols: desk ? "repeat(3,minmax(0,1fr))" : "repeat(1,minmax(0,1fr))", items: [
      { k: E2("GASTO DEL MES · SEGUNDA OPINIÓN", "THIS MONTH · SECOND OPINION"), v: usd(F.gasto.gastadoUsd), s: tope > 0 ? E2(`de ${usd(tope)} de tope · ${pct} %`, `of ${usd(tope)} cap · ${pct} %`) : E2("tope en $0.00: apagada", "cap at $0.00: off"), sFg: alTope ? "var(--tl-danger)" : undefined },
      { k: E2("LLAMADAS EN EL MES", "CALLS THIS MONTH"), v: String(F.gasto.llamadasMes), s: F.gasto.reservadoUsd > 0 ? E2(`${usd(F.gasto.reservadoUsd)} reservados ahora`, `${usd(F.gasto.reservadoUsd)} reserved now`) : undefined },
      { k: E2("TOPE AL MES", "MONTHLY CAP"), v: usd(tope), s: edita ? E2("se cambia en la capa 2 › Cambiar valores", "change it in layer 2 › Change values") : undefined }] },
    ...(alTope ? [{ type: "note" as const, tone: "warn" as const, icon: "warning", t: tope > 0 ? E2("Llegó al tope del mes: hasta que cambie el mes o subas el tope, las fotos dudosas quedan retenidas con «Pedir revisión» y una persona las ve en Colas › Apelaciones.",
      "It hit this month’s cap: until the month changes or you raise it, doubtful photos are held with “Ask for a review” and a person sees them in Queues › Appeals.") : E2("El tope está en $0.00: la segunda opinión no se llama y las fotos dudosas quedan retenidas con «Pedir revisión».", "The cap is $0.00: the second opinion is not called and doubtful photos are held with “Ask for a review”.") }] : []),
    { type: "group", k: E2("HOY", "TODAY") }, cifras(F.hoy),
    { type: "group", k: E2("ÚLTIMOS 7 DÍAS · POR CAPA", "LAST 7 DAYS · BY LAYER") }, cifras(F.semana), porCapa(F.semana),
    { type: "group", k: E2("PARA MIRAR · CINCO PUBLICADAS POR LOS MODELOS, AL AZAR", "TO LOOK AT · FIVE PUBLISHED BY THE MODELS, AT RANDOM") },
    ...(F.semana.muestra.length ? [{ type: "photos" as const, cols: 5, items: F.semana.muestra.map((x) => ({ key: x.mediaId, bg: fotoFondo(x.url, 240), tag: capaL(x.capa).toUpperCase(), onClick: () => window.open(x.url, "_blank", "noopener") })) },
      { type: "note" as const, tone: "info" as const, t: E2("Son fotos ya publicadas (por el modelo propio, la segunda opinión o la confianza). Si una no debió salir, quítala desde la ficha del negocio o de la publicación.", "These are already published (by our own model, the second opinion or trust). If one should not be out, remove it from the business or the post.") }]
      : [{ type: "note" as const, tone: "info" as const, t: E2("Esta semana no hubo fotos publicadas por los modelos para mirar.", "No photos published by the models this week to look at.") }]),
  ];
  /* F4 · Fotos a la medida (decisión AI): el espejo de lo que el servidor convierte al subir y en el barrido. Todo son cifras (lib/admin-confianza.ts
     › cifrasFotos y cifrasFotosPrivadas): solo lectura, sin fotos ni personas. 1 MB = 1 048 576 bytes. */
  const M = d.medios.pub, MP = d.medios.priv;
  const dec = (n: number) => (en ? n.toFixed(1) : n.toFixed(1).replace(".", ","));
  const mb = (b: number) => `${dec(b / 1048576)} MB`;
  const colKpi = desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))";
  const bloquesMedios: Bloque[] = [
    { type: "group", k: E2("FOTOS A LA MEDIDA", "PHOTOS SIZED TO FIT") },
    { type: "note", tone: "info", icon: "image", t: E2("Al subir una foto se guarda la original y salen sus tamaños (WebP en 320, 640, 1080 y 1600 de ancho): cada pantalla pide el de su caja y baja mucho menos. Las que ya existían las convierte el barrido por tandas; si una falta o no tiene archivo, se ve la original, nunca una foto rota. Aquí solo se lee.",
      "When a photo is uploaded the original is kept and its sizes are made (WebP at 320, 640, 1080 and 1600 wide): each screen asks for the one its box needs and downloads far less. Photos that already existed are converted by the sweep in batches; if one is missing or has no file, the original shows, never a broken photo. Read-only here.") },
    { type: "kpis", cols: colKpi, items: [
      { k: E2("FOTOS PÚBLICAS", "PUBLIC PHOTOS"), v: String(M.publicas), s: E2("visibles, de nuestro almacén", "visible, in our storage") },
      { k: E2("CON SUS TAMAÑOS", "WITH THEIR SIZES"), v: String(M.convertidas), s: E2("ya convertidas", "already converted") },
      { k: E2("FALTAN", "PENDING"), v: String(M.pendientes), s: E2("las convierte el barrido", "the sweep converts them") },
      { k: E2("SIN ARCHIVO", "NO FILE"), v: String(M.sinMaestra), s: E2("la original ya no está", "the original is gone"), sFg: M.sinMaestra > 0 ? "var(--tl-danger)" : undefined }] },
    { type: "kpis", cols: desk ? "repeat(3,minmax(0,1fr))" : "repeat(1,minmax(0,1fr))", items: [
      { k: E2("PESO DE LAS ORIGINALES", "WEIGHT OF THE ORIGINALS"), v: mb(M.bytesMaestras), s: E2("todas las que tienen peso anotado", "all those with a recorded weight") },
      { k: E2("PESO DE LOS TAMAÑOS", "WEIGHT OF THE SIZES"), v: mb(M.bytesVariantes), s: E2("suma de todos los tamaños", "sum of all the sizes") },
      { k: E2("AHORRO A 640", "SAVING AT 640"), v: `${dec(M.vista640.ahorro * 100)} %`, s: E2(`${mb(M.vista640.maestras)} de originales contra ${mb(M.vista640.variantes)} servidas a 640 (${mb(M.vista640.maestras - M.vista640.variantes)} menos)`, `${mb(M.vista640.maestras)} of originals against ${mb(M.vista640.variantes)} served at 640 (${mb(M.vista640.maestras - M.vista640.variantes)} less)`) }] },
    { type: "group", k: E2("FOTOS PRIVADAS (SOLO NÚMEROS)", "PRIVATE PHOTOS (NUMBERS ONLY)") },
    { type: "kpis", cols: colKpi, items: [
      { k: E2("PRIVADAS", "PRIVATE"), v: String(MP.privadas), s: E2(`originales ${mb(MP.bytesMaestras)} · tamaños ${mb(MP.bytesVariantes)}`, `originals ${mb(MP.bytesMaestras)} · sizes ${mb(MP.bytesVariantes)}`) },
      { k: E2("PRIVADAS CON SUS TAMAÑOS", "PRIVATE WITH SIZES"), v: String(MP.convertidas) },
      { k: E2("PRIVADAS QUE FALTAN", "PRIVATE PENDING"), v: String(MP.pendientes) },
      { k: E2("PRIVADAS SIN ARCHIVO", "PRIVATE NO FILE"), v: String(MP.sinMaestra) }] },
  ];
  const B: Bloque[] = [...arriba,
    { type: "note", tone: "ink", icon: "shield", t: E2("Las reglas marcan; una persona decide. Nada se oculta solo salvo los teléfonos (se frenan antes de publicarse), el auto-ocultar por reportes de personas distintas y las fotos públicas, que se revisan solas en cuatro capas (siempre con aviso y apelación).", "Rules flag; a person decides. Nothing is hidden automatically except phone numbers (stopped before posting), auto-hide from reports by different people and public photos, which are reviewed automatically in four layers (always with notice and appeal).") },
    { type: "group", k: E2("REGLAS", "RULES") },
    { type: "rows", items: d.reglas.filter((r) => !esFoto(r.k)).map(fila) },
    ...bloquesFotos,
    ...bloquesMedios,
    { type: "group", k: E2("LISTAS DE TÉRMINOS (ES/EN)", "TERM LISTS (ES/EN)") },
    { type: "chips", items: TIPOS_TERMINO.map(([k, l]) => ({ l: `${tipoL(k, l)} · ${d.terminos.filter((t) => t.kind === k && t.enabled).length}`, v: lista === k ? "selected" : "filter", onClick: () => setLista(k) })) },
    { type: "note", tone: "info", t: lista === "autolesion" ? E2("Autolesión: siempre activa (aunque la regla de listas esté apagada). Marca con prioridad y quien escribe ve la línea del 988.", "Self-harm: always on (even if the list rule is off). It flags with priority and the writer sees the 988 line.") : lista === "migra" ? E2("Inmigración: va con prioridad. Los avisos de operativos se permiten sin fotos de personas, placas ni direcciones; nunca se pide ni se señala el estatus de nadie.", "Immigration: gets priority. Alerts about raids are allowed without photos of people, plates or addresses; nobody’s status is ever asked about or pointed out.") : E2("Marcan para revisión; nunca ocultan solas. Un término se apaga, no se borra.", "They flag for review; they never hide on their own. A term is turned off, not deleted.") },
    { type: "rows", items: d.terminos.filter((t) => t.kind === lista).map((t) => ({ key: t.id, t: t.term, s: t.lang === "es" ? E2("Español", "Spanish") : E2("Inglés", "English"), tgOn: t.enabled, dim: !t.enabled,
      onTg: !edita ? sinPermiso : () => setConf({ titulo: "", sub: E2(`${t.enabled ? "Apagar" : "Encender"} «${t.term}».`, `Turn ${t.enabled ? "off" : "on"} “${t.term}”.`), cta: t.enabled ? E2("Apagar", "Turn off") : E2("Encender", "Turn on"), plantillas: [E2("Da falsos positivos", "Gives false positives"), E2("Se usa en el barrio sin mala intención", "Used in the neighborhood with no bad intent"), E2("Volver a marcarlo", "Flag it again")], nota: "interna", hacer: (m) => terminoApagar(t.id, !t.enabled, m) }) })) },
    ...(edita ? [{ type: "acts" as const, items: [{ l: E2("Agregar término", "Add term"), v: "secondary", icon: "plus", onClick: () => setConf({ titulo: "", sub: E2(`A la lista «${lnom?.[1]}». Palabra o frase, en minúsculas.`, `To the “${lnom ? tipoL(lnom[0], lnom[1]) : ""}” list. A word or phrase, in lowercase.`), cta: E2("Agregar", "Add"),
      elegir: { label: E2("IDIOMA", "LANGUAGE"), items: [{ k: "es", l: E2("Español", "Spanish") }, { k: "en", l: E2("Inglés", "English") }] }, valor: { k: E2("TÉRMINO", "TERM"), ini: "", max: 60 }, plantillas: [E2("Lo reportaron vecinos", "Neighbors reported it"), E2("Revisión de la lista", "List review")],
      nota: "interna", hacer: (m, e, v) => terminoAgregar(e ?? "es", lista, v, m) }) }] }] : []),
    { type: "group", k: E2("LÍMITES DEL DÍA (POR PERSONA)", "DAILY LIMITS (PER PERSON)") },
    { type: "note", tone: "info", t: E2("Día local de la ciudad. La mitad el primer día de la cuenta. Al llegar al límite, la app dice cuál y hasta cuándo.", "The city’s local day. Half on the account’s first day. When the limit is reached, the app says which one and until when.") },
    { type: "rows", items: d.limites.map((x) => ({ key: x.k, icon: "clock", t: E2(`${x.v} ${LIMITES[x.k].es} al día`, `${x.v} ${LIMITES[x.k].en} a day`), s: E2(`De fábrica: ${x.def} · de ${x.min} a ${x.max} · también en Sistema › Configuración`, `Default: ${x.def} · from ${x.min} to ${x.max} · also in System › Settings`),
      acts: edita ? [{ l: E2("Cambiar", "Change"), v: "secondary", icon: "edit", onClick: () => setConf({ titulo: "", sub: E2(`Límite de ${LIMITES[x.k].es} al día por persona.`, `Limit of ${LIMITES[x.k].en} a day per person.`), cta: E2("Guardar", "Save"), valor: { k: E2(`${LIMITES[x.k].es.toUpperCase()} AL DÍA`, `${lim(x.k).toUpperCase()} A DAY`), ini: String(x.v), max: 4 }, plantillas: [E2("Mucho spam", "Lots of spam"), E2("Vecinos llegan al límite sin abusar", "Neighbors hit the limit without abusing it")], nota: "interna", hacer: (m, _e, v) => limiteCambiar(x.k, v, m) }) }] : undefined })) },
    // 5h · «Ver traducción» con el traductor propio: si responde (nunca muestra textos: aquí todo se ve en el original) y el tope por persona.
    { type: "group", k: E2("VER TRADUCCIÓN (TRADUCTOR PROPIO)", "SEE TRANSLATION (OWN TRANSLATOR)") },
    { type: "rows", items: [
      { key: "trad-salud", icon: "language", t: E2("Traductor propio · español ↔ inglés", "Own translator · Spanish ↔ English"), s: estadoTrad, tag: d.trad.ok ? E2("RESPONDE", "RESPONDING") : E2("NO RESPONDE", "NOT RESPONDING"), tone: d.trad.ok ? "signal" : "danger" },
      { key: "trad-tope", icon: "clock", t: E2(`${d.trad.tope} traducciones por hora`, `${d.trad.tope} translations per hour`), s: E2(`Por persona (o por dispositivo sin cuenta). De fábrica: ${d.trad.def} · de ${d.trad.min} a ${d.trad.max}. Al llegar, la app dice cuántas y que vuelva en un rato.`, `Per person (or per device without an account). Default: ${d.trad.def} · from ${d.trad.min} to ${d.trad.max}. When reached, the app says how many and to come back in a while.`),
        acts: edita ? [{ l: E2("Cambiar", "Change"), v: "secondary", icon: "edit", onClick: () => setConf({ titulo: "", sub: E2("«Ver traducción» por persona en una hora.", "“See translation” per person in one hour."), cta: E2("Guardar", "Save"), valor: { k: E2("TRADUCCIONES POR HORA", "TRANSLATIONS PER HOUR"), ini: String(d.trad.tope), max: 4 }, plantillas: [E2("El traductor va lento", "The translator is slow"), E2("Vecinos llegan al límite sin abusar", "Neighbors hit the limit without abusing it")], nota: "interna", hacer: (m, _e, v) => traduccionTope(v, m) }) }] : undefined },
    ] },
  ];
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}

/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */
