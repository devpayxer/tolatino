"use client";
/* 5d · Casos de la Comunidad en Colas (ADM-COLAS qDetail; adm-data rep L159–164, repUsr L170, apel L171): una publicación o un
   comentario reportado o marcado por una regla (sigue visible mientras decides, salvo auto-ocultado), una persona reportada, una foto que
   el modelo marcó o no pudo revisar, y una apelación (segunda revisión: nunca quien ocultó o sancionó). Bloques del sistema (kv, nota,
   filas, fotos, acciones) y confirmación con motivo; cada decisión avisa a la persona con el motivo y abre la apelación. */
import type { PanelBloqueT as Bloque } from "@tolatino/ui";
import type { Caso } from "@/lib/admin-colas";
import { APELABLE, MOTIVO_REP, REGLA_L, REP } from "@/lib/moderacion-comun";
import { SANCIONES, type Sancion } from "@/lib/sanciones";
import { decidirApel, decidirFotoCom, decidirRepCom, decidirRepUsr } from "./acciones-confianza";
import type { Confirmar } from "./Colas";
import type { ResAdm } from "./acciones-colas";

/* 9f-4 · E(español, English) según el idioma de la persona del equipo (Colas lo pasa con useE()); sin él, español. */
type EF = (es: string, en: string) => string;
const ES: EF = (es) => es;
const esEn = (E: EF) => E("", "x") === "x";
type Acc = { l: string; v?: string; icon?: string; off?: boolean; onClick: () => void };
type Ctx = { setConf: (c: Confirmar) => void; run: (f: () => Promise<ResAdm>, after?: (r: ResAdm) => void) => void; fuera: () => void; abrir: (h: string) => void; usuario: (id: string) => void; apelarDias: number; ahora: number; E?: EF };
const fecha = (d: string, en = false) => new Date(d).toLocaleDateString(en ? "en-US" : "es-US", { day: "numeric", month: "short", timeZone: "America/New_York" });
const hace = (d: string, ahora: number, E: EF = ES) => { const h = (ahora - new Date(d).getTime()) / 3_600_000; return h < 1 ? E("hace un momento", "just now") : h < 24 ? E(`hace ${Math.floor(h)} h`, `${Math.floor(h)} h ago`) : E(`hace ${Math.floor(h / 24)} d`, `${Math.floor(h / 24)} d ago`); };
export const PLANT_COM = {
  ocultar: ["Venta, spam o cadena", "Datos de otra persona", "Insulto o acoso", "Lenguaje discriminatorio", "Información falsa", "Se recomienda a sí mismo"],
  queda: ["No rompe las reglas del barrio", "Es una opinión", "El reporte no trae evidencia"],
  usr: ["Reincidente", "Primera vez", "Cuentas vinculadas al mismo dispositivo", "El contexto justifica la acción"],
  levantar: ["Tenía razón: no rompe las reglas", "El contexto lo justifica", "Primera vez: basta con la advertencia"],
  mantener: ["Rompe las reglas del barrio", "Reincidente", "La evidencia lo sostiene"],
  foto: ["Desnudez", "Violencia", "Muestra a otra persona sin permiso", "Es publicidad"],
};
/* Las mismas plantillas en el idioma de la persona del equipo (PLANT_COM se queda en español para quien la importe). */
const PLANT_COM_EN: Record<keyof typeof PLANT_COM, string[]> = {
  ocultar: ["Sales, spam or chain message", "Someone else's personal info", "Insult or harassment", "Discriminatory language", "False information", "Self-promotion"],
  queda: ["Doesn't break the neighborhood rules", "It's an opinion", "The report has no evidence"],
  usr: ["Repeat offender", "First time", "Accounts linked to the same device", "The context justifies the action"],
  levantar: ["They were right: it doesn't break the rules", "The context justifies it", "First time: a warning is enough"],
  mantener: ["Breaks the neighborhood rules", "Repeat offender", "The evidence supports it"],
  foto: ["Nudity", "Violence", "Shows another person without permission", "It's advertising"],
};
export const plantCom = (E: EF = ES) => (esEn(E) ? PLANT_COM_EN : PLANT_COM);
const REGLA_EN: Record<string, string> = { phone: "Phone number", pii: "Where someone lives", spam: "Repeated", hate: "Discriminatory language", rev5: "Review burst", img: "Photo", autohide: "Auto-hidden", red: "Possible account network", estafa: "Possible scam", migra: "Immigration", autolesion: "Self-harm", evt: "Events signal" };
const MOTIVO_REP_EN: Record<string, string> = Object.fromEntries(REP.map(([k, l]) => [k, l.en]));
const sanciones = (admin: boolean, ninguna: boolean, E: EF = ES) => { const en = esEn(E); return [...(ninguna ? [{ k: "ninguna", l: E("Sin sanción", "No sanction") }] : []),
  ...(["adv", "mute7", "nopub", "susp14", ...(admin ? ["ban"] : [])] as Sancion[]).map((k) => ({ k, l: en ? `${SANCIONES[k].en} · ${SANCIONES[k].com.en}` : `${SANCIONES[k].es} · ${SANCIONES[k].com.es}` }))]; };

export function tituloComunidad(k: Caso, E: EF = ES): string | null {
  if (k.queue === "rep" && "com" in k && k.com) return k.com.kind === "com_post" ? E(`Publicación de ${k.com.quien}`, `Post by ${k.com.quien}`) : E(`Comentario de ${k.com.quien}`, `Comment by ${k.com.quien}`);
  if (k.queue === "repUsr" && "persona" in k) return E(`Vecino reportado · ${k.persona?.quien ?? ""}`, `Reported neighbor · ${k.persona?.quien ?? ""}`);
  if (k.queue === "apel" && "apel" in k) return k.apel ? E(`Apelación ${k.apel.numero} · ${APELABLE[k.apel.k].es}`, `Appeal ${k.apel.numero} · ${APELABLE[k.apel.k].en}`) : E("Apelación", "Appeal");
  if (k.queue === "medios" && "fotoCom" in k) return E("Foto de la Comunidad", "Community photo");
  if (k.queue === "medios" && "fotoChat" in k) return E(`Foto de Mensajes · ${k.fotoChat.negocioN ?? ""}`, `Messages photo · ${k.fotoChat.negocioN ?? ""}`);
  if (k.queue === "medios" && "fotoDm" in k) return E("Foto de Mensajes entre vecinos", "Neighbor messages photo");
  return null;
}

export function cuerpoComunidad(k: Caso, x: Ctx): { bloques: Bloque[]; acts: Acc[] } | null {
  const B: Bloque[] = [], E = x.E ?? ES, en = esEn(E), P = plantCom(E);
  const REGLA = en ? REGLA_EN : REGLA_L, MREP = en ? MOTIVO_REP_EN : MOTIVO_REP;
  const sanL = (kind: string) => { const s = SANCIONES[kind as Sancion]; return s ? (en ? s.en : s.es) : kind; };
  if (k.queue === "rep" && "com" in k && k.com) {
    const c = k.com, auto = c.status === "hidden" && c.hidden_by === "auto";
    B.push({ type: "kv", cols: 2, items: [{ k: E("AUTOR", "AUTHOR"), v: c.quien }, { k: E("QUÉ", "WHAT"), v: c.kind === "com_post" ? E("Publicación", "Post") : E("Comentario", "Comment") },
      { k: E("ESTADO", "STATUS"), v: auto ? E("Oculta por reportes (auto)", "Hidden by reports (auto)") : c.status === "hidden" ? E("Oculta", "Hidden") : c.status === "deleted" ? E("La borró su autor", "Deleted by its author") : E("Visible mientras decides", "Visible while you decide"), fg: c.status === "visible" ? undefined : "var(--tl-danger)" },
      { k: E("REPORTES ABIERTOS", "OPEN REPORTS"), v: String(c.reportes.length) }, { k: E("SANCIONES ANTES", "PRIOR SANCTIONS"), v: String(c.historial.sanciones) }, { k: E("CONTENIDO OCULTO", "HIDDEN CONTENT"), v: String(c.historial.ocultas) }] });
    B.push({ type: "note", tone: "ink", icon: "quote", t: E(`LO QUE ESCRIBIÓ · «${c.body}»`, `WHAT THEY WROTE · “${c.body}”`) });
    if (c.fotos.length) B.push({ type: "photos", k: E("FOTOS", "PHOTOS"), cols: 4, items: c.fotos.map((u) => ({ bg: `url(${u})`, key: u, onClick: () => x.abrir(u) })) });
    if (auto) B.push({ type: "note", tone: "warn", icon: "warning", t: E("Se ocultó sola: varias personas con dispositivos distintos la reportaron. «Se queda» la vuelve a mostrar y le avisa a su autor.", "It hid itself: several people on different devices reported it. “Keep” shows it again and notifies its author.") });
    if (c.reportes.length) B.push({ type: "group", k: E("REPORTES", "REPORTS") }, { type: "rows", items: c.reportes.map((r, i) => ({ key: String(i), icon: "warning", t: MREP[r.reason] ?? E("Otro motivo", "Other reason"), s: `${r.note ? `«${r.note}» · ` : ""}${r.quien ?? E("Vecino", "Neighbor")}${r.rango >= 8 ? E(` · rango ${r.rango}`, ` · rank ${r.rango}`) : ""} · ${hace(r.at, x.ahora, E)}` })) });
    if (c.marcas.length) B.push({ type: "group", k: E("LO QUE MARCARON LAS REGLAS", "WHAT THE RULES FLAGGED") }, { type: "rows", items: c.marcas.map((f, i) => ({ key: `f${i}`, icon: "bolt", t: REGLA[f.regla] ?? f.regla, s: `${f.detalle} · ${hace(f.at, x.ahora, E)}` })) });
    return { bloques: B, acts: [
      { l: E("Ver en la Comunidad", "See in the Community"), icon: "search", onClick: () => x.abrir(`/comunidad/p/${c.post}`) },
      { l: auto ? E("Vuelve a verse", "Show again") : E("Se queda", "Keep"), v: "action", icon: "check", onClick: () => x.setConf({ titulo: auto ? E("¿Por qué vuelve a verse?", "Why is it shown again?") : E("¿Por qué se queda?", "Why does it stay?"), sub: E("Quienes lo reportaron reciben el resultado (sin nombres). Queda en la auditoría.", "Those who reported it get the outcome (no names). It stays in the audit log."), plantillas: P.queda, nota: "interna", hacer: (m) => decidirRepCom(k.id, "mantener", m) }) },
      { l: E("Ocultar", "Hide"), v: "danger", icon: "ban", onClick: () => x.setConf({ titulo: c.kind === "com_post" ? E(`Ocultar la publicación de ${c.quien}`, `Hide ${c.quien}'s post`) : E(`Ocultar el comentario de ${c.quien}`, `Hide ${c.quien}'s comment`), sub: E(`Su autor recibe el motivo tal cual y puede apelar ${x.apelarDias} días; la apelación la decide otra persona. Nada se borra.`, `The author gets the reason as written and can appeal for ${x.apelarDias} days; another person decides the appeal. Nothing is deleted.`), peligro: true, plantillas: P.ocultar,
        elegir: { label: E("SANCIÓN (OPCIONAL)", "SANCTION (OPTIONAL)"), items: sanciones("banea" in k && !!k.banea, true, E) }, nota: "persona", hacer: (m, e) => decidirRepCom(k.id, "ocultar", m, e && e !== "ninguna" ? e : null) }) },
    ] };
  }
  if (k.queue === "repUsr" && "persona" in k && k.persona) {
    const p = k.persona, c = p.cifras;
    const estado = p.estado === "active" ? E("activa", "active") : p.estado === "muted" ? E("silenciada", "muted") : p.estado === "suspended" ? E("suspendida", "suspended") : p.estado;
    B.push({ type: "rows", items: [{ icon: "users", t: p.quien, s: E(`${p.ciudad ?? "Sin ciudad"} · en To'Latino desde ${fecha(p.creada)} · rango ${p.rango} · ${estado}`, `${p.ciudad ?? "No city"} · on To'Latino since ${fecha(p.creada, true)} · rank ${p.rango} · ${estado}`), chev: true, onClick: () => x.usuario(p.id) }] });
    B.push({ type: "kv", cols: 2, items: [{ k: E("PUBLICACIONES · 30 D", "POSTS · 30 D"), v: String(c.posts) }, { k: E("COMENTARIOS · 30 D", "COMMENTS · 30 D"), v: String(c.cms) }, { k: E("CONTENIDO OCULTO", "HIDDEN CONTENT"), v: String(c.ocultas) },
      { k: E("RESEÑAS SIN TRANSACCIÓN · 24 H", "REVIEWS WITHOUT A TRANSACTION · 24 H"), v: String(c.resenas24), fg: c.resenas24 >= 5 ? "var(--tl-danger)" : undefined }, { k: E("SUS DISPOSITIVOS", "THEIR DEVICES"), v: String(c.dispositivos) }, { k: E("OTRAS CUENTAS EN ELLOS", "OTHER ACCOUNTS ON THEM"), v: String(c.otras), fg: c.otras ? "var(--tl-danger)" : undefined }] });
    if (p.reportes.length) B.push({ type: "group", k: E("REPORTES DE VECINOS", "NEIGHBOR REPORTS") }, { type: "rows", items: p.reportes.map((r, i) => ({ key: String(i), icon: "warning", t: MREP[r.reason] ?? E("Otro motivo", "Other reason"), s: `${r.note ? `«${r.note}» · ` : ""}${r.quien ?? E("Vecino", "Neighbor")} · ${hace(r.at, x.ahora, E)}` })) });
    if (p.marcas.length) B.push({ type: "group", k: E("LO QUE MARCARON LAS REGLAS", "WHAT THE RULES FLAGGED") }, { type: "rows", items: p.marcas.map((f, i) => ({ key: `f${i}`, icon: "bolt", t: REGLA[f.regla] ?? f.regla, s: `${f.detalle} · ${hace(f.at, x.ahora, E)}` })) });
    if (p.sanciones.length) B.push({ type: "group", k: E("SANCIONES ANTES", "PRIOR SANCTIONS") }, { type: "rows", items: p.sanciones.map((s, i) => ({ key: `s${i}`, icon: "shield", t: sanL(s.kind), s: `${s.reason} · ${fecha(s.at, en)}${s.vigente ? E(" · vigente", " · active") : ""}` })) });
    B.push({ type: "note", tone: "info", t: E("Escalera: advertencia → silencio 7 días → bloquear publicación 30 días → suspender 14 días → banear (solo un Admin). Toda sanción avisa con el motivo y se puede apelar.", "Ladder: warning → mute 7 days → block posting 30 days → suspend 14 days → ban (Admin only). Every sanction notifies with the reason and can be appealed.") });
    return { bloques: B, acts: p.staff ? [] : [
      { l: E("Sin acción", "No action"), icon: "check", onClick: () => x.setConf({ titulo: E("¿Por qué no se hace nada?", "Why is no action taken?"), plantillas: [E("El reporte no trae evidencia", "The report has no evidence"), E("No rompe las reglas del barrio", "Doesn't break the neighborhood rules"), E("Ya se resolvió", "Already resolved")], nota: "interna", hacer: (m) => decidirRepUsr(k.id, "sin_accion", m) }) },
      { l: E("Sancionar", "Sanction"), v: "danger", icon: "shield", onClick: () => x.setConf({ titulo: E(`Sancionar a ${p.quien}`, `Sanction ${p.quien}`), sub: E(`La persona recibe el motivo tal cual y puede apelar ${x.apelarDias} días; la apelación la decide otra persona.`, `The person gets the reason as written and can appeal for ${x.apelarDias} days; another person decides the appeal.`), peligro: true, plantillas: P.usr,
        elegir: { label: E("SANCIÓN", "SANCTION"), items: sanciones("banea" in k && !!k.banea, false, E) }, nota: "persona", hacer: (m, e) => decidirRepUsr(k.id, "sancionar", m, e) }) },
    ] };
  }
  if (k.queue === "apel" && "apel" in k) {
    const a = k.apel;
    if (!a) return { bloques: [{ type: "empty", icon: "check", t: E("Ya se decidió", "Already decided"), s: E("Lo apelado solo se ve con la apelación abierta.", "The appealed item is only visible while the appeal is open.") }], acts: [] };
    if (a.mia) B.push({ type: "note", tone: "warn", icon: "lock", t: E("Tú ocultaste o sancionaste esto: la apelación la decide otra persona del equipo.", "You hid or sanctioned this: another team member decides the appeal.") });
    B.push({ type: "kv", cols: 2, items: [{ k: E("APELACIÓN", "APPEAL"), v: a.numero }, { k: E("QUÉ APELA", "APPEALING"), v: a.sancion ? (en ? SANCIONES[a.sancion].en : SANCIONES[a.sancion].es) : en ? APELABLE[a.k].en : APELABLE[a.k].es }, { k: E("LO DECIDIÓ", "DECIDED BY"), v: a.por ? a.por_nombre ?? E("Equipo", "Team") : E("Las reglas (auto-ocultar)", "The rules (auto-hide)") },
      { k: E("ENVIADA", "SENT"), v: `${fecha(a.at, en)} · ${hace(a.at, x.ahora, E)}` }, ...(a.hasta ? [{ k: E("TERMINA", "ENDS"), v: fecha(a.hasta, en) }] : [])] });
    B.push({ type: "rows", items: [{ icon: "users", t: a.quien, s: E("Quien apela · ver su 360°", "Appellant · see their 360°"), chev: true, onClick: () => x.usuario(a.uid) }] });
    if (a.motivo) B.push({ type: "note", tone: "info", icon: "shield", t: E(`MOTIVO QUE RECIBIÓ · ${a.motivo}`, `REASON THEY RECEIVED · ${a.motivo}`) });
    B.push({ type: "note", tone: "ink", icon: "quote", t: E(`LO QUE ESCRIBIÓ · «${a.texto}»`, `WHAT THEY WROTE · “${a.texto}”`) });
    if (a.contenido.foto) B.push({ type: "photos", k: E("LA FOTO", "THE PHOTO"), cols: 2, items: [{ bg: `url(${a.contenido.foto})`, key: "f", onClick: () => x.abrir(a.contenido.foto!) }] });
    if (a.contenido.texto) B.push({ type: "note", tone: "ink", icon: "quote", t: E(`LO APELADO · «${a.contenido.texto}»`, `APPEALED CONTENT · “${a.contenido.texto}”`) });
    if (a.historial.length) B.push({ type: "group", k: E("SU HISTORIAL", "THEIR HISTORY") }, { type: "rows", items: a.historial.map((s, i) => ({ key: String(i), icon: "shield", t: sanL(s.kind), s: `${s.reason} · ${fecha(s.at, en)}${s.lifted ? E(" · levantada", " · lifted") : ""}` })) });
    return { bloques: B, acts: a.mia ? [] : [
      ...(a.contenido.href ? [{ l: E("Ver dónde estaba", "See where it was"), icon: "search", onClick: () => x.abrir(a.contenido.href!) }] : []),
      { l: E("Levantar", "Lift"), v: "action", icon: "check", onClick: () => x.setConf({ titulo: E("¿Por qué se levanta?", "Why is it lifted?"), sub: a.k === "sanction" ? E("La sanción termina y la cuenta vuelve a la normalidad. La persona recibe el motivo.", "The sanction ends and the account goes back to normal. The person gets the reason.") : E("El contenido vuelve a verse y los casos abiertos se cierran. La persona recibe el motivo.", "The content is shown again and open cases are closed. The person gets the reason."), cta: E("Levantar", "Lift"), plantillas: P.levantar, nota: "persona", hacer: (m) => decidirApel(k.id, "lifted", m) }) },
      { l: E("Mantener", "Uphold"), v: "danger", icon: "close", onClick: () => x.setConf({ titulo: E("¿Por qué se mantiene?", "Why is it upheld?"), sub: E("Esta revisión es final. La persona recibe el motivo.", "This review is final. The person gets the reason."), peligro: true, cta: E("Mantener", "Uphold"), plantillas: P.mantener, nota: "persona", hacer: (m) => decidirApel(k.id, "upheld", m) }) },
    ] };
  }
  // 9t · La foto de un mensaje (privada): la ves porque este caso está abierto (queda en la auditoría). La otra parte no la ve hasta decidir.
  if (k.queue === "medios" && "fotoChat" in k) {
    const f = k.fotoChat;
    B.push({ type: "kv", cols: 2, items: [{ k: E("QUIÉN LA MANDÓ", "SENT BY"), v: f.de === "business" ? (f.negocioN ?? E("El negocio", "The business")) : f.vecino ?? E("El vecino", "The neighbor") },
      { k: E("CONVERSACIÓN", "CONVERSATION"), v: `${f.vecino ?? ""} · ${f.negocioN ?? ""}` }] });
    B.push({ type: "photos", k: f.status === "review" ? E("NO SE VE HASTA QUE DECIDAS", "HIDDEN UNTIL YOU DECIDE") : E("VISIBLE", "VISIBLE"), cols: 2, items: [{ bg: `url(${f.url})`, key: "f", onClick: () => x.abrir(f.url) }] });
    for (const m of f.marcas) B.push({ type: "note", tone: "warn", icon: "image", t: `${REGLA[m.regla] ?? m.regla} · ${m.detalle}` });
    B.push({ type: "note", tone: "info", icon: "lock", t: E("Es una foto privada entre dos personas: la ves solo por este caso y cada vez queda en la auditoría. El texto de la conversación no se lee desde aquí.", "It's a private photo between two people: you see it only through this case and every view is logged. The conversation text isn't readable from here.") });
    B.push({ type: "note", tone: "info", t: E("El modelo propio (NudeNet) solo mide desnudez. Violencia, texto promocional y fotos de otras personas los decides tú.", "Our own model (NudeNet) only checks for nudity. You decide on violence, promotional text and photos of other people.") });
    return { bloques: B, acts: [
      { l: E("Está bien", "It's fine"), v: "action", icon: "check", onClick: () => x.run(() => decidirFotoCom(k.id, "mantener", ""), x.fuera) },
      { l: E("Quitar foto", "Remove photo"), v: "danger", icon: "trash", onClick: () => x.setConf({ titulo: E("¿Por qué se quita?", "Why is it removed?"), sub: E("Quien la mandó recibe el motivo. En la conversación sale «Foto quitada por To’Latino».", "The sender gets the reason. The conversation shows “Photo removed by To’Latino”."), peligro: true, plantillas: P.foto, nota: "persona", hacer: (m) => decidirFotoCom(k.id, "quitar", m) }) },
    ] };
  }
  // 9t (19 nov) · La foto de un mensaje entre vecinos (privada): la ves porque este caso está abierto (queda en la auditoría). Ni el texto ni la otra
  // persona se leen desde aquí (los mensajes entre vecinos solo con un reporte abierto). La otra persona no la ve hasta decidir.
  if (k.queue === "medios" && "fotoDm" in k) {
    const f = k.fotoDm;
    B.push({ type: "kv", cols: 2, items: [{ k: E("QUIÉN LA MANDÓ", "SENT BY"), v: f.de }, { k: E("DÓNDE", "WHERE"), v: E("Mensajes entre vecinos", "Neighbor messages") }] });
    B.push({ type: "photos", k: f.status === "review" ? E("NO SE VE HASTA QUE DECIDAS", "HIDDEN UNTIL YOU DECIDE") : E("VISIBLE", "VISIBLE"), cols: 2, items: [{ bg: `url(${f.url})`, key: "f", onClick: () => x.abrir(f.url) }] });
    for (const m of f.marcas) B.push({ type: "note", tone: "warn", icon: "image", t: `${REGLA[m.regla] ?? m.regla} · ${m.detalle}` });
    B.push({ type: "note", tone: "info", icon: "lock", t: E("Es una foto privada entre dos vecinos: la ves solo por este caso y cada vez queda en la auditoría. La conversación no se lee desde aquí.", "It's a private photo between two neighbors: you see it only through this case and every view is logged. The conversation isn't readable from here.") });
    B.push({ type: "note", tone: "info", t: E("El modelo propio (NudeNet) solo mide desnudez. Violencia, texto promocional y fotos de otras personas los decides tú.", "Our own model (NudeNet) only checks for nudity. You decide on violence, promotional text and photos of other people.") });
    return { bloques: B, acts: [
      { l: E("Está bien", "It's fine"), v: "action", icon: "check", onClick: () => x.run(() => decidirFotoCom(k.id, "mantener", ""), x.fuera) },
      { l: E("Quitar foto", "Remove photo"), v: "danger", icon: "trash", onClick: () => x.setConf({ titulo: E("¿Por qué se quita?", "Why is it removed?"), sub: E("Quien la mandó recibe el motivo. En la conversación sale «Foto quitada por To’Latino».", "The sender gets the reason. The conversation shows “Photo removed by To’Latino”."), peligro: true, plantillas: P.foto, nota: "persona", hacer: (m) => decidirFotoCom(k.id, "quitar", m) }) },
    ] };
  }
  if (k.queue === "medios" && "fotoCom" in k) {
    const f = k.fotoCom;
    if (!f) return { bloques: [{ type: "empty", icon: "image", t: E("Esa foto ya no está", "That photo is gone"), s: E("Su autor la quitó de la publicación.", "Its author removed it from the post.") }], acts: [] };
    B.push({ type: "photos", k: f.status === "review" ? E("NO SE VE HASTA QUE DECIDAS", "HIDDEN UNTIL YOU DECIDE") : E("VISIBLE", "VISIBLE"), cols: 2, items: [{ bg: `url(${f.url})`, key: "f", onClick: () => x.abrir(f.url) }] });
    for (const m of f.marcas) B.push({ type: "note", tone: "warn", icon: "image", t: `${REGLA[m.regla] ?? m.regla} · ${m.detalle}` });
    B.push({ type: "note", tone: "info", t: E("El modelo propio (NudeNet) solo mide desnudez. Violencia, texto promocional y fotos de otras personas los decides tú.", "Our own model (NudeNet) only checks for nudity. You decide on violence, promotional text and photos of other people.") });
    return { bloques: B, acts: [
      ...(f.post ? [{ l: E("Ver la publicación", "See the post"), icon: "search", onClick: () => x.abrir(`/comunidad/p/${f.post}`) }] : []),
      { l: E("Está bien", "It's fine"), v: "action", icon: "check", onClick: () => x.run(() => decidirFotoCom(k.id, "mantener", ""), x.fuera) },
      { l: E("Quitar foto", "Remove photo"), v: "danger", icon: "trash", onClick: () => x.setConf({ titulo: E("¿Por qué se quita?", "Why is it removed?"), sub: E(`Su autor recibe el motivo y puede apelar ${x.apelarDias} días.`, `The author gets the reason and can appeal for ${x.apelarDias} days.`), peligro: true, plantillas: P.foto, nota: "persona", hacer: (m) => decidirFotoCom(k.id, "quitar", m) }) },
    ] };
  }
  return null;
}
