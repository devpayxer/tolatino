"use client";
/* 5d · Casos de la Comunidad en Colas (ADM-COLAS qDetail; adm-data rep L159–164, repUsr L170, apel L171): una publicación o un
   comentario reportado o marcado por una regla (sigue visible mientras decides, salvo auto-ocultado), una persona reportada, una foto que
   el modelo marcó o no pudo revisar, y una apelación (segunda revisión: nunca quien ocultó o sancionó). Bloques del sistema (kv, nota,
   filas, fotos, acciones) y confirmación con motivo; cada decisión avisa a la persona con el motivo y abre la apelación. */
import type { PanelBloqueT as Bloque } from "@tolatino/ui";
import type { Caso } from "@/lib/admin-colas";
import { APELABLE, MOTIVO_REP, REGLA_L } from "@/lib/moderacion-comun";
import { SANCIONES, type Sancion } from "@/lib/sanciones";
import { decidirApel, decidirFotoCom, decidirRepCom, decidirRepUsr } from "./acciones-confianza";
import type { Confirmar } from "./Colas";
import type { ResAdm } from "./acciones-colas";

type Acc = { l: string; v?: string; icon?: string; off?: boolean; onClick: () => void };
type Ctx = { setConf: (c: Confirmar) => void; run: (f: () => Promise<ResAdm>, after?: (r: ResAdm) => void) => void; fuera: () => void; abrir: (h: string) => void; usuario: (id: string) => void; apelarDias: number; ahora: number };
const fecha = (d: string) => new Date(d).toLocaleDateString("es-US", { day: "numeric", month: "short", timeZone: "America/New_York" });
const hace = (d: string, ahora: number) => { const h = (ahora - new Date(d).getTime()) / 3_600_000; return h < 1 ? "hace un momento" : h < 24 ? `hace ${Math.floor(h)} h` : `hace ${Math.floor(h / 24)} d`; };
export const PLANT_COM = {
  ocultar: ["Venta, spam o cadena", "Datos de otra persona", "Insulto o acoso", "Lenguaje discriminatorio", "Información falsa", "Se recomienda a sí mismo"],
  queda: ["No rompe las reglas del barrio", "Es una opinión", "El reporte no trae evidencia"],
  usr: ["Reincidente", "Primera vez", "Cuentas vinculadas al mismo dispositivo", "El contexto justifica la acción"],
  levantar: ["Tenía razón: no rompe las reglas", "El contexto lo justifica", "Primera vez: basta con la advertencia"],
  mantener: ["Rompe las reglas del barrio", "Reincidente", "La evidencia lo sostiene"],
  foto: ["Desnudez", "Violencia", "Muestra a otra persona sin permiso", "Es publicidad"],
};
const sanciones = (admin: boolean, ninguna: boolean) => [...(ninguna ? [{ k: "ninguna", l: "Sin sanción" }] : []),
  ...(["adv", "mute7", "nopub", "susp14", ...(admin ? ["ban"] : [])] as Sancion[]).map((k) => ({ k, l: `${SANCIONES[k].es} · ${SANCIONES[k].com.es}` }))];

export function tituloComunidad(k: Caso): string | null {
  if (k.queue === "rep" && "com" in k && k.com) return `${k.com.kind === "com_post" ? "Publicación" : "Comentario"} de ${k.com.quien}`;
  if (k.queue === "repUsr" && "persona" in k) return `Vecino reportado · ${k.persona?.quien ?? ""}`;
  if (k.queue === "apel" && "apel" in k) return k.apel ? `Apelación ${k.apel.numero} · ${APELABLE[k.apel.k].es}` : "Apelación";
  if (k.queue === "medios" && "fotoCom" in k) return "Foto de la Comunidad";
  return null;
}

export function cuerpoComunidad(k: Caso, x: Ctx): { bloques: Bloque[]; acts: Acc[] } | null {
  const B: Bloque[] = [];
  if (k.queue === "rep" && "com" in k && k.com) {
    const c = k.com, auto = c.status === "hidden" && c.hidden_by === "auto";
    B.push({ type: "kv", cols: 2, items: [{ k: "AUTOR", v: c.quien }, { k: "QUÉ", v: c.kind === "com_post" ? "Publicación" : "Comentario" },
      { k: "ESTADO", v: auto ? "Oculta por reportes (auto)" : c.status === "hidden" ? "Oculta" : c.status === "deleted" ? "La borró su autor" : "Visible mientras decides", fg: c.status === "visible" ? undefined : "var(--tl-danger)" },
      { k: "REPORTES ABIERTOS", v: String(c.reportes.length) }, { k: "SANCIONES ANTES", v: String(c.historial.sanciones) }, { k: "CONTENIDO OCULTO", v: String(c.historial.ocultas) }] });
    B.push({ type: "note", tone: "ink", icon: "quote", t: `LO QUE ESCRIBIÓ · «${c.body}»` });
    if (c.fotos.length) B.push({ type: "photos", k: "FOTOS", cols: 4, items: c.fotos.map((u) => ({ bg: `url(${u})`, key: u, onClick: () => x.abrir(u) })) });
    if (auto) B.push({ type: "note", tone: "warn", icon: "warning", t: "Se ocultó sola: varias personas con dispositivos distintos la reportaron. «Se queda» la vuelve a mostrar y le avisa a su autor." });
    if (c.reportes.length) B.push({ type: "group", k: "REPORTES" }, { type: "rows", items: c.reportes.map((r, i) => ({ key: String(i), icon: "warning", t: MOTIVO_REP[r.reason] ?? "Otro motivo", s: `${r.note ? `«${r.note}» · ` : ""}${r.quien ?? "Vecino"}${r.rango >= 8 ? ` · rango ${r.rango}` : ""} · ${hace(r.at, x.ahora)}` })) });
    if (c.marcas.length) B.push({ type: "group", k: "LO QUE MARCARON LAS REGLAS" }, { type: "rows", items: c.marcas.map((f, i) => ({ key: `f${i}`, icon: "bolt", t: REGLA_L[f.regla] ?? f.regla, s: `${f.detalle} · ${hace(f.at, x.ahora)}` })) });
    return { bloques: B, acts: [
      { l: "Ver en la Comunidad", icon: "search", onClick: () => x.abrir(`/comunidad/p/${c.post}`) },
      { l: auto ? "Vuelve a verse" : "Se queda", v: "action", icon: "check", onClick: () => x.setConf({ titulo: auto ? "¿Por qué vuelve a verse?" : "¿Por qué se queda?", sub: "Quienes lo reportaron reciben el resultado (sin nombres). Queda en la auditoría.", plantillas: PLANT_COM.queda, hacer: (m) => decidirRepCom(k.id, "mantener", m) }) },
      { l: "Ocultar", v: "danger", icon: "ban", onClick: () => x.setConf({ titulo: `Ocultar ${c.kind === "com_post" ? "la publicación" : "el comentario"} de ${c.quien}`, sub: `Su autor recibe el motivo tal cual y puede apelar ${x.apelarDias} días; la apelación la decide otra persona. Nada se borra.`, peligro: true, plantillas: PLANT_COM.ocultar,
        elegir: { label: "SANCIÓN (OPCIONAL)", items: sanciones("banea" in k && !!k.banea, true) }, hacer: (m, e) => decidirRepCom(k.id, "ocultar", m, e && e !== "ninguna" ? e : null) }) },
    ] };
  }
  if (k.queue === "repUsr" && "persona" in k && k.persona) {
    const p = k.persona, c = p.cifras;
    B.push({ type: "rows", items: [{ icon: "users", t: p.quien, s: `${p.ciudad ?? "Sin ciudad"} · en To'Latino desde ${fecha(p.creada)} · rango ${p.rango} · ${p.estado === "active" ? "activa" : p.estado === "muted" ? "silenciada" : p.estado === "suspended" ? "suspendida" : p.estado}`, chev: true, onClick: () => x.usuario(p.id) }] });
    B.push({ type: "kv", cols: 2, items: [{ k: "PUBLICACIONES · 30 D", v: String(c.posts) }, { k: "COMENTARIOS · 30 D", v: String(c.cms) }, { k: "CONTENIDO OCULTO", v: String(c.ocultas) },
      { k: "RESEÑAS SIN TRANSACCIÓN · 24 H", v: String(c.resenas24), fg: c.resenas24 >= 5 ? "var(--tl-danger)" : undefined }, { k: "SUS DISPOSITIVOS", v: String(c.dispositivos) }, { k: "OTRAS CUENTAS EN ELLOS", v: String(c.otras), fg: c.otras ? "var(--tl-danger)" : undefined }] });
    if (p.reportes.length) B.push({ type: "group", k: "REPORTES DE VECINOS" }, { type: "rows", items: p.reportes.map((r, i) => ({ key: String(i), icon: "warning", t: MOTIVO_REP[r.reason] ?? "Otro motivo", s: `${r.note ? `«${r.note}» · ` : ""}${r.quien ?? "Vecino"} · ${hace(r.at, x.ahora)}` })) });
    if (p.marcas.length) B.push({ type: "group", k: "LO QUE MARCARON LAS REGLAS" }, { type: "rows", items: p.marcas.map((f, i) => ({ key: `f${i}`, icon: "bolt", t: REGLA_L[f.regla] ?? f.regla, s: `${f.detalle} · ${hace(f.at, x.ahora)}` })) });
    if (p.sanciones.length) B.push({ type: "group", k: "SANCIONES ANTES" }, { type: "rows", items: p.sanciones.map((s, i) => ({ key: `s${i}`, icon: "shield", t: SANCIONES[s.kind]?.es ?? s.kind, s: `${s.reason} · ${fecha(s.at)}${s.vigente ? " · vigente" : ""}` })) });
    B.push({ type: "note", tone: "info", t: "Escalera: advertencia → silencio 7 días → bloquear publicación 30 días → suspender 14 días → banear (solo un Admin). Toda sanción avisa con el motivo y se puede apelar." });
    return { bloques: B, acts: p.staff ? [] : [
      { l: "Sin acción", icon: "check", onClick: () => x.setConf({ titulo: "¿Por qué no se hace nada?", plantillas: ["El reporte no trae evidencia", "No rompe las reglas del barrio", "Ya se resolvió"], hacer: (m) => decidirRepUsr(k.id, "sin_accion", m) }) },
      { l: "Sancionar", v: "danger", icon: "shield", onClick: () => x.setConf({ titulo: `Sancionar a ${p.quien}`, sub: `La persona recibe el motivo tal cual y puede apelar ${x.apelarDias} días; la apelación la decide otra persona.`, peligro: true, plantillas: PLANT_COM.usr,
        elegir: { label: "SANCIÓN", items: sanciones("banea" in k && !!k.banea, false) }, hacer: (m, e) => decidirRepUsr(k.id, "sancionar", m, e) }) },
    ] };
  }
  if (k.queue === "apel" && "apel" in k) {
    const a = k.apel;
    if (!a) return { bloques: [{ type: "empty", icon: "check", t: "Ya se decidió", s: "Lo apelado solo se ve con la apelación abierta." }], acts: [] };
    if (a.mia) B.push({ type: "note", tone: "warn", icon: "lock", t: "Tú ocultaste o sancionaste esto: la apelación la decide otra persona del equipo." });
    B.push({ type: "kv", cols: 2, items: [{ k: "APELACIÓN", v: a.numero }, { k: "QUÉ APELA", v: a.sancion ? SANCIONES[a.sancion].es : APELABLE[a.k].es }, { k: "LO DECIDIÓ", v: a.por ? a.por_nombre ?? "Equipo" : "Las reglas (auto-ocultar)" },
      { k: "ENVIADA", v: `${fecha(a.at)} · ${hace(a.at, x.ahora)}` }, ...(a.hasta ? [{ k: "TERMINA", v: fecha(a.hasta) }] : [])] });
    B.push({ type: "rows", items: [{ icon: "users", t: a.quien, s: "Quien apela · ver su 360°", chev: true, onClick: () => x.usuario(a.uid) }] });
    if (a.motivo) B.push({ type: "note", tone: "info", icon: "shield", t: `MOTIVO QUE RECIBIÓ · ${a.motivo}` });
    B.push({ type: "note", tone: "ink", icon: "quote", t: `LO QUE ESCRIBIÓ · «${a.texto}»` });
    if (a.contenido.foto) B.push({ type: "photos", k: "LA FOTO", cols: 2, items: [{ bg: `url(${a.contenido.foto})`, key: "f", onClick: () => x.abrir(a.contenido.foto!) }] });
    if (a.contenido.texto) B.push({ type: "note", tone: "ink", icon: "quote", t: `LO APELADO · «${a.contenido.texto}»` });
    if (a.historial.length) B.push({ type: "group", k: "SU HISTORIAL" }, { type: "rows", items: a.historial.map((s, i) => ({ key: String(i), icon: "shield", t: SANCIONES[s.kind]?.es ?? s.kind, s: `${s.reason} · ${fecha(s.at)}${s.lifted ? " · levantada" : ""}` })) });
    return { bloques: B, acts: a.mia ? [] : [
      ...(a.contenido.href ? [{ l: "Ver dónde estaba", icon: "search", onClick: () => x.abrir(a.contenido.href!) }] : []),
      { l: "Levantar", v: "action", icon: "check", onClick: () => x.setConf({ titulo: "¿Por qué se levanta?", sub: a.k === "sanction" ? "La sanción termina y la cuenta vuelve a la normalidad. La persona recibe el motivo." : "El contenido vuelve a verse y los casos abiertos se cierran. La persona recibe el motivo.", cta: "Levantar", plantillas: PLANT_COM.levantar, hacer: (m) => decidirApel(k.id, "lifted", m) }) },
      { l: "Mantener", v: "danger", icon: "close", onClick: () => x.setConf({ titulo: "¿Por qué se mantiene?", sub: "Esta revisión es final. La persona recibe el motivo.", peligro: true, cta: "Mantener", plantillas: PLANT_COM.mantener, hacer: (m) => decidirApel(k.id, "upheld", m) }) },
    ] };
  }
  if (k.queue === "medios" && "fotoCom" in k) {
    const f = k.fotoCom;
    if (!f) return { bloques: [{ type: "empty", icon: "image", t: "Esa foto ya no está", s: "Su autor la quitó de la publicación." }], acts: [] };
    B.push({ type: "photos", k: f.status === "review" ? "NO SE VE HASTA QUE DECIDAS" : "VISIBLE", cols: 2, items: [{ bg: `url(${f.url})`, key: "f", onClick: () => x.abrir(f.url) }] });
    for (const m of f.marcas) B.push({ type: "note", tone: "warn", icon: "image", t: `${REGLA_L[m.regla] ?? m.regla} · ${m.detalle}` });
    B.push({ type: "note", tone: "info", t: "El modelo propio (NudeNet) solo mide desnudez. Violencia, texto promocional y fotos de otras personas los decides tú." });
    return { bloques: B, acts: [
      ...(f.post ? [{ l: "Ver la publicación", icon: "search", onClick: () => x.abrir(`/comunidad/p/${f.post}`) }] : []),
      { l: "Está bien", v: "action", icon: "check", onClick: () => x.run(() => decidirFotoCom(k.id, "mantener", ""), x.fuera) },
      { l: "Quitar foto", v: "danger", icon: "trash", onClick: () => x.setConf({ titulo: "¿Por qué se quita?", sub: `Su autor recibe el motivo y puede apelar ${x.apelarDias} días.`, peligro: true, plantillas: PLANT_COM.foto, hacer: (m) => decidirFotoCom(k.id, "quitar", m) }) },
    ] };
  }
  return null;
}
