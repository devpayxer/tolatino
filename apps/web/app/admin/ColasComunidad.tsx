"use client";
/* 5d · Casos de la Comunidad en Colas (ADM-COLAS qDetail; adm-data rep L159–164, repUsr L170, apel L171): una publicación o un
   comentario reportado o marcado por una regla (sigue visible mientras decides, salvo auto-ocultado), una persona reportada, una foto que
   el modelo marcó o no pudo revisar, y una apelación (segunda revisión: nunca quien ocultó o sancionó). Bloques del sistema (kv, nota,
   filas, fotos, acciones) y confirmación con motivo; cada decisión avisa a la persona con el motivo y abre la apelación. */
import type { PanelBloqueT as Bloque } from "@tolatino/ui";
import type { Caso } from "@/lib/admin-colas";
import { APELABLE, MOTIVO_REP, REP } from "@/lib/moderacion-comun";
import { SANCIONES, type Sancion } from "@/lib/sanciones";
import { decidirApel, decidirFotoCom, decidirRepCom, decidirRepUsr } from "./acciones-confianza";
import type { Confirmar } from "./Colas";
import type { ResAdm } from "./acciones-colas";

/* 9f-4 · E2(español, English) según el idioma de la persona del equipo (Colas lo pasa con useE2()); sin él, español. */
type EF = (es: string, en: string) => string;
const ES: EF = (es) => es;
const esEn = (E2: EF) => E2("", "x") === "x";
type Acc = { l: string; v?: string; icon?: string; off?: boolean; onClick: () => void };
type Ctx = { setConf: (c: Confirmar) => void; run: (f: () => Promise<ResAdm>, after?: (r: ResAdm) => void) => void; fuera: () => void; abrir: (h: string) => void; usuario: (id: string) => void; apelarDias: number; ahora: number; E2?: EF };
const fecha = (d: string, en = false) => new Date(d).toLocaleDateString(en ? "en-US" : "es-US", { day: "numeric", month: "short", timeZone: "America/New_York" });
const hace = (d: string, ahora: number, E2: EF = ES) => { const h = (ahora - new Date(d).getTime()) / 3_600_000; return h < 1 ? E2("hace un momento", "just now") : h < 24 ? E2(`hace ${Math.floor(h)} h`, `${Math.floor(h)} h ago`) : E2(`hace ${Math.floor(h / 24)} d`, `${Math.floor(h / 24)} d ago`); };
export const PLANT_COM = (E2: EF): Record<"ocultar" | "queda" | "usr" | "levantar" | "mantener" | "foto", string[]> => ({
  ocultar: [E2("Venta, spam o cadena", "Sales, spam or chain message"), E2("Datos de otra persona", "Someone else's personal info"), E2("Insulto o acoso", "Insult or harassment"), E2("Lenguaje discriminatorio", "Discriminatory language"), E2("Información falsa", "False information"), E2("Se recomienda a sí mismo", "Self-promotion")],
  queda: [E2("No rompe las reglas del barrio", "Doesn't break the neighborhood rules"), E2("Es una opinión", "It's an opinion"), E2("El reporte no trae evidencia", "The report has no evidence")],
  usr: [E2("Reincidente", "Repeat offender"), E2("Primera vez", "First time"), E2("Cuentas vinculadas al mismo dispositivo", "Accounts linked to the same device"), E2("El contexto justifica la acción", "The context justifies the action")],
  levantar: [E2("Tenía razón: no rompe las reglas", "They were right: it doesn't break the rules"), E2("El contexto lo justifica", "The context justifies it"), E2("Primera vez: basta con la advertencia", "First time: a warning is enough")],
  mantener: [E2("Rompe las reglas del barrio", "Breaks the neighborhood rules"), E2("Reincidente", "Repeat offender"), E2("La evidencia lo sostiene", "The evidence supports it")],
  foto: [E2("Desnudez", "Nudity"), E2("Violencia", "Violence"), E2("Muestra a otra persona sin permiso", "Shows another person without permission"), E2("Es publicidad", "It's advertising")]
});
export const plantCom = (E2: EF = ES) => PLANT_COM(E2);
/* REGLA_L de lib/moderacion-comun.ts (el servidor la usa en español) con su inglés: el mismo español, por E2. */
const REGLA_T = (E2: EF): Record<string, string> => ({
  phone: E2("Teléfono", "Phone number"), pii: E2("Dónde vive alguien", "Where someone lives"), spam: E2("Repetido", "Repeated"),
  hate: E2("Lenguaje discriminatorio", "Discriminatory language"), rev5: E2("Reseñas en ráfaga", "Review burst"), img: E2("Foto", "Photo"),
  autohide: E2("Auto-ocultada", "Auto-hidden"), red: E2("Posible red de cuentas", "Possible account network"),
  estafa: E2("Posible estafa", "Possible scam"), migra: E2("Inmigración", "Immigration"), autolesion: E2("Autolesión", "Self-harm"),
  evt: E2("Señal de Eventos", "Events signal"), foto1: E2("Fotos · modelo propio", "Photos · own model"), foto2: E2("Fotos · segunda opinión", "Photos · second opinion"),
  foto3: E2("Fotos · reportes", "Photos · reports"), foto4: E2("Fotos · confianza", "Photos · confidence")
});
const MOTIVO_REP_EN: Record<string, string> = Object.fromEntries(REP.map(([k, l]) => [k, l.en]));
const sanciones = (admin: boolean, ninguna: boolean, E2: EF = ES) => { const en = esEn(E2); return [...(ninguna ? [{ k: "ninguna", l: E2("Sin sanción", "No sanction") }] : []),
  ...(["adv", "mute7", "nopub", "susp14", ...(admin ? ["ban"] : [])] as Sancion[]).map((k) => ({ k, l: en ? `${SANCIONES[k].en} · ${SANCIONES[k].com.en}` : `${SANCIONES[k].es} · ${SANCIONES[k].com.es}` }))]; };

export function tituloComunidad(k: Caso, E2: EF = ES): string | null {
  if (k.queue === "rep" && "com" in k && k.com) return k.com.kind === "com_post" ? E2(`Publicación de ${k.com.quien}`, `Post by ${k.com.quien}`) : E2(`Comentario de ${k.com.quien}`, `Comment by ${k.com.quien}`);
  if (k.queue === "repUsr" && "persona" in k) return E2(`Vecino reportado · ${k.persona?.quien ?? ""}`, `Reported neighbor · ${k.persona?.quien ?? ""}`);
  if (k.queue === "apel" && "apel" in k) return k.apel ? E2(`Apelación ${k.apel.numero} · ${APELABLE[k.apel.k].es}`, `Appeal ${k.apel.numero} · ${APELABLE[k.apel.k].en}`) : E2("Apelación", "Appeal");
  if (k.queue === "medios" && "fotoCom" in k) return E2("Foto de la Comunidad", "Community photo");
  if (k.queue === "medios" && "fotoChat" in k) return E2(`Foto de Mensajes · ${k.fotoChat.negocioN ?? ""}`, `Messages photo · ${k.fotoChat.negocioN ?? ""}`);
  if (k.queue === "medios" && "fotoDm" in k) return E2("Foto de Mensajes entre vecinos", "Neighbor messages photo");
  return null;
}

export function cuerpoComunidad(k: Caso, x: Ctx): { bloques: Bloque[]; acts: Acc[] } | null {
  const B: Bloque[] = [], E2 = x.E2 ?? ES, en = esEn(E2), P = plantCom(E2);
  const REGLA = REGLA_T(E2), MREP = en ? MOTIVO_REP_EN : MOTIVO_REP;
  const sanL = (kind: string) => { const s = SANCIONES[kind as Sancion]; return s ? (en ? s.en : s.es) : kind; };
  if (k.queue === "rep" && "com" in k && k.com) {
    const c = k.com, auto = c.status === "hidden" && c.hidden_by === "auto";
    B.push({ type: "kv", cols: 2, items: [{ k: E2("AUTOR", "AUTHOR"), v: c.quien }, { k: E2("QUÉ", "WHAT"), v: c.kind === "com_post" ? E2("Publicación", "Post") : E2("Comentario", "Comment") },
      { k: E2("ESTADO", "STATUS"), v: auto ? E2("Oculta por reportes (auto)", "Hidden by reports (auto)") : c.status === "hidden" ? E2("Oculta", "Hidden") : c.status === "deleted" ? E2("La borró su autor", "Deleted by its author") : E2("Visible mientras decides", "Visible while you decide"), fg: c.status === "visible" ? undefined : "var(--tl-danger)" },
      { k: E2("REPORTES ABIERTOS", "OPEN REPORTS"), v: String(c.reportes.length) }, { k: E2("SANCIONES ANTES", "PRIOR SANCTIONS"), v: String(c.historial.sanciones) }, { k: E2("CONTENIDO OCULTO", "HIDDEN CONTENT"), v: String(c.historial.ocultas) }] });
    B.push({ type: "note", tone: "ink", icon: "quote", t: E2(`LO QUE ESCRIBIÓ · «${c.body}»`, `WHAT THEY WROTE · “${c.body}”`) });
    if (c.fotos.length) B.push({ type: "photos", k: E2("FOTOS", "PHOTOS"), cols: 4, items: c.fotos.map((u) => ({ bg: `url(${u})`, key: u, onClick: () => x.abrir(u) })) });
    if (auto) B.push({ type: "note", tone: "warn", icon: "warning", t: E2("Se ocultó sola: varias personas con dispositivos distintos la reportaron. «Se queda» la vuelve a mostrar y le avisa a su autor.", "It hid itself: several people on different devices reported it. “Keep” shows it again and notifies its author.") });
    if (c.reportes.length) B.push({ type: "group", k: E2("REPORTES", "REPORTS") }, { type: "rows", items: c.reportes.map((r, i) => ({ key: String(i), icon: "warning", t: MREP[r.reason] ?? E2("Otro motivo", "Other reason"), s: `${r.note ? `«${r.note}» · ` : ""}${r.quien ?? E2("Vecino", "Neighbor")}${r.rango >= 8 ? E2(` · rango ${r.rango}`, ` · rank ${r.rango}`) : ""} · ${hace(r.at, x.ahora, E2)}` })) });
    if (c.marcas.length) B.push({ type: "group", k: E2("LO QUE MARCARON LAS REGLAS", "WHAT THE RULES FLAGGED") }, { type: "rows", items: c.marcas.map((f, i) => ({ key: `f${i}`, icon: "bolt", t: REGLA[f.regla] ?? f.regla, s: `${f.detalle} · ${hace(f.at, x.ahora, E2)}` })) });
    return { bloques: B, acts: [
      { l: E2("Ver en la Comunidad", "See in the Community"), icon: "search", onClick: () => x.abrir(`/comunidad/p/${c.post}`) },
      { l: auto ? E2("Vuelve a verse", "Show again") : E2("Se queda", "Keep"), v: "action", icon: "check", onClick: () => x.setConf({ titulo: auto ? E2("¿Por qué vuelve a verse?", "Why is it shown again?") : E2("¿Por qué se queda?", "Why does it stay?"), sub: E2("Quienes lo reportaron reciben el resultado (sin nombres). Queda en la auditoría.", "Those who reported it get the outcome (no names). It stays in the audit log."), plantillas: P.queda, nota: "interna", hacer: (m) => decidirRepCom(k.id, "mantener", m) }) },
      { l: E2("Ocultar", "Hide"), v: "danger", icon: "ban", onClick: () => x.setConf({ titulo: c.kind === "com_post" ? E2(`Ocultar la publicación de ${c.quien}`, `Hide ${c.quien}'s post`) : E2(`Ocultar el comentario de ${c.quien}`, `Hide ${c.quien}'s comment`), sub: E2(`Su autor recibe el motivo tal cual y puede apelar ${x.apelarDias} días; la apelación la decide otra persona. Nada se borra.`, `The author gets the reason as written and can appeal for ${x.apelarDias} days; another person decides the appeal. Nothing is deleted.`), peligro: true, plantillas: P.ocultar,
        elegir: { label: E2("SANCIÓN (OPCIONAL)", "SANCTION (OPTIONAL)"), items: sanciones("banea" in k && !!k.banea, true, E2) }, nota: "persona", hacer: (m, e) => decidirRepCom(k.id, "ocultar", m, e && e !== "ninguna" ? e : null) }) },
    ] };
  }
  if (k.queue === "repUsr" && "persona" in k && k.persona) {
    const p = k.persona, c = p.cifras;
    const estado = p.estado === "active" ? E2("activa", "active") : p.estado === "muted" ? E2("silenciada", "muted") : p.estado === "suspended" ? E2("suspendida", "suspended") : p.estado;
    B.push({ type: "rows", items: [{ icon: "users", t: p.quien, s: E2(`${p.ciudad ?? "Sin ciudad"} · en To'Latino desde ${fecha(p.creada)} · rango ${p.rango} · ${estado}`, `${p.ciudad ?? "No city"} · on To'Latino since ${fecha(p.creada, true)} · rank ${p.rango} · ${estado}`), chev: true, onClick: () => x.usuario(p.id) }] });
    B.push({ type: "kv", cols: 2, items: [{ k: E2("PUBLICACIONES · 30 D", "POSTS · 30 D"), v: String(c.posts) }, { k: E2("COMENTARIOS · 30 D", "COMMENTS · 30 D"), v: String(c.cms) }, { k: E2("CONTENIDO OCULTO", "HIDDEN CONTENT"), v: String(c.ocultas) },
      { k: E2("RESEÑAS SIN TRANSACCIÓN · 24 H", "REVIEWS WITHOUT A TRANSACTION · 24 H"), v: String(c.resenas24), fg: c.resenas24 >= 5 ? "var(--tl-danger)" : undefined }, { k: E2("SUS DISPOSITIVOS", "THEIR DEVICES"), v: String(c.dispositivos) }, { k: E2("OTRAS CUENTAS EN ELLOS", "OTHER ACCOUNTS ON THEM"), v: String(c.otras), fg: c.otras ? "var(--tl-danger)" : undefined }] });
    if (p.reportes.length) B.push({ type: "group", k: E2("REPORTES DE VECINOS", "NEIGHBOR REPORTS") }, { type: "rows", items: p.reportes.map((r, i) => ({ key: String(i), icon: "warning", t: MREP[r.reason] ?? E2("Otro motivo", "Other reason"), s: `${r.note ? `«${r.note}» · ` : ""}${r.quien ?? E2("Vecino", "Neighbor")} · ${hace(r.at, x.ahora, E2)}` })) });
    if (p.marcas.length) B.push({ type: "group", k: E2("LO QUE MARCARON LAS REGLAS", "WHAT THE RULES FLAGGED") }, { type: "rows", items: p.marcas.map((f, i) => ({ key: `f${i}`, icon: "bolt", t: REGLA[f.regla] ?? f.regla, s: `${f.detalle} · ${hace(f.at, x.ahora, E2)}` })) });
    if (p.sanciones.length) B.push({ type: "group", k: E2("SANCIONES ANTES", "PRIOR SANCTIONS") }, { type: "rows", items: p.sanciones.map((s, i) => ({ key: `s${i}`, icon: "shield", t: sanL(s.kind), s: `${s.reason} · ${fecha(s.at, en)}${s.vigente ? E2(" · vigente", " · active") : ""}` })) });
    B.push({ type: "note", tone: "info", t: E2("Escalera: advertencia → silencio 7 días → bloquear publicación 30 días → suspender 14 días → banear (solo un Admin). Toda sanción avisa con el motivo y se puede apelar.", "Ladder: warning → mute 7 days → block posting 30 days → suspend 14 days → ban (Admin only). Every sanction notifies with the reason and can be appealed.") });
    return { bloques: B, acts: p.staff ? [] : [
      { l: E2("Sin acción", "No action"), icon: "check", onClick: () => x.setConf({ titulo: E2("¿Por qué no se hace nada?", "Why is no action taken?"), plantillas: [E2("El reporte no trae evidencia", "The report has no evidence"), E2("No rompe las reglas del barrio", "Doesn't break the neighborhood rules"), E2("Ya se resolvió", "Already resolved")], nota: "interna", hacer: (m) => decidirRepUsr(k.id, "sin_accion", m) }) },
      { l: E2("Sancionar", "Sanction"), v: "danger", icon: "shield", onClick: () => x.setConf({ titulo: E2(`Sancionar a ${p.quien}`, `Sanction ${p.quien}`), sub: E2(`La persona recibe el motivo tal cual y puede apelar ${x.apelarDias} días; la apelación la decide otra persona.`, `The person gets the reason as written and can appeal for ${x.apelarDias} days; another person decides the appeal.`), peligro: true, plantillas: P.usr,
        elegir: { label: E2("SANCIÓN", "SANCTION"), items: sanciones("banea" in k && !!k.banea, false, E2) }, nota: "persona", hacer: (m, e) => decidirRepUsr(k.id, "sancionar", m, e) }) },
    ] };
  }
  if (k.queue === "apel" && "apel" in k) {
    const a = k.apel;
    if (!a) return { bloques: [{ type: "empty", icon: "check", t: E2("Ya se decidió", "Already decided"), s: E2("Lo apelado solo se ve con la apelación abierta.", "The appealed item is only visible while the appeal is open.") }], acts: [] };
    if (a.mia) B.push({ type: "note", tone: "warn", icon: "lock", t: E2("Tú ocultaste o sancionaste esto: la apelación la decide otra persona del equipo.", "You hid or sanctioned this: another team member decides the appeal.") });
    B.push({ type: "kv", cols: 2, items: [{ k: E2("APELACIÓN", "APPEAL"), v: a.numero }, { k: E2("QUÉ APELA", "APPEALING"), v: a.sancion ? (en ? SANCIONES[a.sancion].en : SANCIONES[a.sancion].es) : en ? APELABLE[a.k].en : APELABLE[a.k].es }, { k: E2("LO DECIDIÓ", "DECIDED BY"), v: a.por ? a.por_nombre ?? E2("Equipo", "Team") : E2("Las reglas (auto-ocultar)", "The rules (auto-hide)") },
      { k: E2("ENVIADA", "SENT"), v: `${fecha(a.at, en)} · ${hace(a.at, x.ahora, E2)}` }, ...(a.hasta ? [{ k: E2("TERMINA", "ENDS"), v: fecha(a.hasta, en) }] : [])] });
    B.push({ type: "rows", items: [{ icon: "users", t: a.quien, s: E2("Quien apela · ver su 360°", "Appellant · see their 360°"), chev: true, onClick: () => x.usuario(a.uid) }] });
    if (a.motivo) B.push({ type: "note", tone: "info", icon: "shield", t: E2(`MOTIVO QUE RECIBIÓ · ${a.motivo}`, `REASON THEY RECEIVED · ${a.motivo}`) });
    B.push({ type: "note", tone: "ink", icon: "quote", t: E2(`LO QUE ESCRIBIÓ · «${a.texto}»`, `WHAT THEY WROTE · “${a.texto}”`) });
    if (a.contenido.foto) B.push({ type: "photos", k: E2("LA FOTO", "THE PHOTO"), cols: 2, items: [{ bg: `url(${a.contenido.foto})`, key: "f", onClick: () => x.abrir(a.contenido.foto!) }] });
    if (a.contenido.texto) B.push({ type: "note", tone: "ink", icon: "quote", t: E2(`LO APELADO · «${a.contenido.texto}»`, `APPEALED CONTENT · “${a.contenido.texto}”`) });
    if (a.historial.length) B.push({ type: "group", k: E2("SU HISTORIAL", "THEIR HISTORY") }, { type: "rows", items: a.historial.map((s, i) => ({ key: String(i), icon: "shield", t: sanL(s.kind), s: `${s.reason} · ${fecha(s.at, en)}${s.lifted ? E2(" · levantada", " · lifted") : ""}` })) });
    return { bloques: B, acts: a.mia ? [] : [
      ...(a.contenido.href ? [{ l: E2("Ver dónde estaba", "See where it was"), icon: "search", onClick: () => x.abrir(a.contenido.href!) }] : []),
      { l: E2("Levantar", "Lift"), v: "action", icon: "check", onClick: () => x.setConf({ titulo: E2("¿Por qué se levanta?", "Why is it lifted?"), sub: a.k === "sanction" ? E2("La sanción termina y la cuenta vuelve a la normalidad. La persona recibe el motivo.", "The sanction ends and the account goes back to normal. The person gets the reason.") : E2("El contenido vuelve a verse y los casos abiertos se cierran. La persona recibe el motivo.", "The content is shown again and open cases are closed. The person gets the reason."), cta: E2("Levantar", "Lift"), plantillas: P.levantar, nota: "persona", hacer: (m) => decidirApel(k.id, "lifted", m) }) },
      { l: E2("Mantener", "Uphold"), v: "danger", icon: "close", onClick: () => x.setConf({ titulo: E2("¿Por qué se mantiene?", "Why is it upheld?"), sub: E2("Esta revisión es final. La persona recibe el motivo.", "This review is final. The person gets the reason."), peligro: true, cta: E2("Mantener", "Uphold"), plantillas: P.mantener, nota: "persona", hacer: (m) => decidirApel(k.id, "upheld", m) }) },
    ] };
  }
  // 9t · La foto de un mensaje (privada): la ves porque este caso está abierto (queda en la auditoría). La otra parte no la ve hasta decidir.
  if (k.queue === "medios" && "fotoChat" in k) {
    const f = k.fotoChat;
    B.push({ type: "kv", cols: 2, items: [{ k: E2("QUIÉN LA MANDÓ", "SENT BY"), v: f.de === "business" ? (f.negocioN ?? E2("El negocio", "The business")) : f.vecino ?? E2("El vecino", "The neighbor") },
      { k: E2("CONVERSACIÓN", "CONVERSATION"), v: `${f.vecino ?? ""} · ${f.negocioN ?? ""}` }] });
    B.push({ type: "photos", k: f.status === "review" ? E2("NO SE VE HASTA QUE DECIDAS", "HIDDEN UNTIL YOU DECIDE") : E2("VISIBLE", "VISIBLE"), cols: 2, items: [{ bg: `url(${f.url})`, key: "f", onClick: () => x.abrir(f.url) }] });
    for (const m of f.marcas) B.push({ type: "note", tone: "warn", icon: "image", t: `${REGLA[m.regla] ?? m.regla} · ${m.detalle}` });
    B.push({ type: "note", tone: "info", icon: "lock", t: E2("Es una foto privada entre dos personas: la ves solo por este caso y cada vez queda en la auditoría. El texto de la conversación no se lee desde aquí.", "It's a private photo between two people: you see it only through this case and every view is logged. The conversation text isn't readable from here.") });
    B.push({ type: "note", tone: "info", t: E2("El modelo propio (NudeNet) solo mide desnudez. Violencia, texto promocional y fotos de otras personas los decides tú.", "Our own model (NudeNet) only checks for nudity. You decide on violence, promotional text and photos of other people.") });
    return { bloques: B, acts: [
      { l: E2("Está bien", "It's fine"), v: "action", icon: "check", onClick: () => x.run(() => decidirFotoCom(k.id, "mantener", ""), x.fuera) },
      { l: E2("Quitar foto", "Remove photo"), v: "danger", icon: "trash", onClick: () => x.setConf({ titulo: E2("¿Por qué se quita?", "Why is it removed?"), sub: E2("Quien la mandó recibe el motivo. En la conversación sale «Foto quitada por To’Latino».", "The sender gets the reason. The conversation shows “Photo removed by To’Latino”."), peligro: true, plantillas: P.foto, nota: "persona", hacer: (m) => decidirFotoCom(k.id, "quitar", m) }) },
    ] };
  }
  // 9t (19 nov) · La foto de un mensaje entre vecinos (privada): la ves porque este caso está abierto (queda en la auditoría). Ni el texto ni la otra
  // persona se leen desde aquí (los mensajes entre vecinos solo con un reporte abierto). La otra persona no la ve hasta decidir.
  if (k.queue === "medios" && "fotoDm" in k) {
    const f = k.fotoDm;
    B.push({ type: "kv", cols: 2, items: [{ k: E2("QUIÉN LA MANDÓ", "SENT BY"), v: f.de }, { k: E2("DÓNDE", "WHERE"), v: E2("Mensajes entre vecinos", "Neighbor messages") }] });
    B.push({ type: "photos", k: f.status === "review" ? E2("NO SE VE HASTA QUE DECIDAS", "HIDDEN UNTIL YOU DECIDE") : E2("VISIBLE", "VISIBLE"), cols: 2, items: [{ bg: `url(${f.url})`, key: "f", onClick: () => x.abrir(f.url) }] });
    for (const m of f.marcas) B.push({ type: "note", tone: "warn", icon: "image", t: `${REGLA[m.regla] ?? m.regla} · ${m.detalle}` });
    B.push({ type: "note", tone: "info", icon: "lock", t: E2("Es una foto privada entre dos vecinos: la ves solo por este caso y cada vez queda en la auditoría. La conversación no se lee desde aquí.", "It's a private photo between two neighbors: you see it only through this case and every view is logged. The conversation isn't readable from here.") });
    B.push({ type: "note", tone: "info", t: E2("El modelo propio (NudeNet) solo mide desnudez. Violencia, texto promocional y fotos de otras personas los decides tú.", "Our own model (NudeNet) only checks for nudity. You decide on violence, promotional text and photos of other people.") });
    return { bloques: B, acts: [
      { l: E2("Está bien", "It's fine"), v: "action", icon: "check", onClick: () => x.run(() => decidirFotoCom(k.id, "mantener", ""), x.fuera) },
      { l: E2("Quitar foto", "Remove photo"), v: "danger", icon: "trash", onClick: () => x.setConf({ titulo: E2("¿Por qué se quita?", "Why is it removed?"), sub: E2("Quien la mandó recibe el motivo. En la conversación sale «Foto quitada por To’Latino».", "The sender gets the reason. The conversation shows “Photo removed by To’Latino”."), peligro: true, plantillas: P.foto, nota: "persona", hacer: (m) => decidirFotoCom(k.id, "quitar", m) }) },
    ] };
  }
  if (k.queue === "medios" && "fotoCom" in k) {
    const f = k.fotoCom;
    if (!f) return { bloques: [{ type: "empty", icon: "image", t: E2("Esa foto ya no está", "That photo is gone"), s: E2("Su autor la quitó de la publicación.", "Its author removed it from the post.") }], acts: [] };
    B.push({ type: "photos", k: f.status === "review" ? E2("NO SE VE HASTA QUE DECIDAS", "HIDDEN UNTIL YOU DECIDE") : E2("VISIBLE", "VISIBLE"), cols: 2, items: [{ bg: `url(${f.url})`, key: "f", onClick: () => x.abrir(f.url) }] });
    for (const m of f.marcas) B.push({ type: "note", tone: "warn", icon: "image", t: `${REGLA[m.regla] ?? m.regla} · ${m.detalle}` });
    B.push({ type: "note", tone: "info", t: E2("El modelo propio (NudeNet) solo mide desnudez. Violencia, texto promocional y fotos de otras personas los decides tú.", "Our own model (NudeNet) only checks for nudity. You decide on violence, promotional text and photos of other people.") });
    return { bloques: B, acts: [
      ...(f.post ? [{ l: E2("Ver la publicación", "See the post"), icon: "search", onClick: () => x.abrir(`/comunidad/p/${f.post}`) }] : []),
      { l: E2("Está bien", "It's fine"), v: "action", icon: "check", onClick: () => x.run(() => decidirFotoCom(k.id, "mantener", ""), x.fuera) },
      { l: E2("Quitar foto", "Remove photo"), v: "danger", icon: "trash", onClick: () => x.setConf({ titulo: E2("¿Por qué se quita?", "Why is it removed?"), sub: E2(`Su autor recibe el motivo y puede apelar ${x.apelarDias} días.`, `The author gets the reason and can appeal for ${x.apelarDias} days.`), peligro: true, plantillas: P.foto, nota: "persona", hacer: (m) => decidirFotoCom(k.id, "quitar", m) }) },
    ] };
  }
  return null;
}
