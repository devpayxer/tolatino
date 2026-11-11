import "server-only";
import { ACCIONES, MOTIVOS, PANTALLAS, TIPOS } from "./modelo";
import { tapar, TAPADO } from "./tapar";

/* 7c · El verificador de salida (fase7-compa.md §3 «Inyección de instrucciones» punto 4; guardián compaSalidaLimpia). Determinista: corre
   en TODA respuesta del modelo (y en las de las reglas) antes de que alguien la lea o se guarde. Lo que falla no se muestra: contestan las
   reglas fijas. Rechaza:
   - lo que no cumple el esquema (tipos, listas cerradas, largo, ≤ 3 frases; 4 en el copiloto; ≤ 3 chips);
   - una respuesta que afirma algo sin fuente (ni un trozo de ayuda de los que se le dieron ni «cuenta» con operaciones en el contexto);
     una cita a un artículo que NO estaba entre los trozos dados (de otra audiencia o inventado) se quita y la respuesta queda sin fuente;
   - datos que no se comparten: algo que tapar() taparía (tarjeta, SSN, códigos, contraseñas, cuentas), «[tapado]», teléfonos y correos que
     no sean los públicos del contexto;
   - enlaces fuera de To'Latino (solo rutas /ayuda/…);
   - montos, porcentajes y plazos que no están en el contexto ni en la ayuda dada (precios y políticas inventadas);
   - «confirmada» cuando ninguna operación del contexto lo está;
   - decir que HIZO algo (cancelé, devolví, cambié…): El Compa solo prepara; lo hace la persona al confirmar;
   - hacerse pasar por una persona o por el dueño; emoji. */
export type Respuesta = {
  respuesta: string; tipo: (typeof TIPOS)[number]; fuente: string;
  accion: { tipo: (typeof ACCIONES)[number]; ref: string; pantalla: (typeof PANTALLAS)[number] | "" };
  persona: (typeof MOTIVOS)[number]; chips: string[];
};
export type Contexto = {
  fuentes: string[];            // los slugs de los trozos que se le dieron
  conCuenta: boolean;           // hay operaciones de la persona en el contexto
  confirmadas: boolean;         // alguna operación del contexto está confirmada
  texto: string;                // todo lo que el modelo pudo leer (contexto + trozos + lo que escribió la persona), para montos y plazos
  permitidos: string[];         // teléfonos o correos públicos que sí se pueden decir (del negocio del contexto)
  maxFrases: number;
};
export type Veredicto = { ok: true; r: Respuesta } | { ok: false; motivo: string };

const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
const URL = /\bhttps?:\/\/|\bwww\.|\b[a-z0-9-]+\.(com|net|org|io|app|co|me|ly|info|biz|us|link)\b/i;
const TEL = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const CORREO = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
const MONTO = /\$\s?\d[\d,]*(?:\.\d{1,2})?/g;
const PCT = /\b\d{1,3}(?:[.,]\d+)?\s?%/g;
const PLAZO = /\b\d{1,4}\s?(?:h\b|horas?\b|hrs?\b|d[ií]as?\b|days?\b|hours?\b|min(?:utos?|utes?)?\b|semanas?\b|weeks?\b|meses\b|months?\b)/gi;
const HECHO = /\b(?:ya\s+)?(?:cancel[eé]|he cancelado|anul[eé]|devolv[ií]|he devuelto|reembols[eé]|cambi[eé]|he cambiado|confirm[eé]|reserv[eé]|ped[ií] por ti|te devolv[ií]|te reembols[eé]|borr[eé]|elimin[eé])\b|\bI(?:'ve| have)?\s+(?:already\s+)?(?:cancell?ed|refunded|changed|booked|confirmed|deleted|removed)\b|\b(?:done|listo)[,.]\s/i;
const PERSONA = /\bsoy (?:una persona|un humano|humano|humana|el due[ñn]o|la due[ñn]a|del equipo)\b|\bI(?:'m| am) (?:a (?:real )?(?:person|human)|the owner|human)\b/i;
const CONF = /confirmad[oa]s?\b|\bconfirmed\b/gi;
const NEG = /\b(?:no|not|isn'?t|aren'?t|sin|todav[ií]a no|a[uú]n no|yet|hasta que|until|antes de que|before)\b[^.!?]{0,25}$/i;

const soloDigitos = (s: string) => s.replace(/\D/g, "");
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");

export function forma(x: unknown, maxFrases: number): Respuesta | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>, a = o.accion as Record<string, unknown> | undefined;
  if (typeof o.respuesta !== "string" || typeof o.tipo !== "string" || typeof o.fuente !== "string" || typeof o.persona !== "string" || !Array.isArray(o.chips)) return null;
  if (!a || typeof a !== "object" || typeof a.tipo !== "string" || typeof a.ref !== "string" || typeof a.pantalla !== "string") return null;
  if (!(TIPOS as readonly string[]).includes(o.tipo) || !(MOTIVOS as readonly string[]).includes(o.persona) || !(ACCIONES as readonly string[]).includes(a.tipo)) return null;
  if (a.pantalla !== "" && !(PANTALLAS as readonly string[]).includes(a.pantalla)) return null;
  const respuesta = o.respuesta.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
  if (respuesta.length < 2 || respuesta.length > 600 || o.fuente.length > 80 || a.ref.length > 20) return null;
  if (respuesta.split(/(?<=[.!?])\s+/).filter((f) => f.trim().length > 1).length > maxFrases) return null;
  if (o.chips.length > 3 || o.chips.some((c) => typeof c !== "string" || !c.trim() || c.length > 40)) return null;
  return { respuesta, tipo: o.tipo as Respuesta["tipo"], fuente: o.fuente.trim(), accion: { tipo: a.tipo as Respuesta["accion"]["tipo"], ref: a.ref.trim(), pantalla: a.pantalla as Respuesta["accion"]["pantalla"] },
    persona: o.persona as Respuesta["persona"], chips: (o.chips as string[]).map((c) => c.trim()) };
}

export function verificar(x: unknown, c: Contexto): Veredicto {
  const r = forma(x, c.maxFrases);
  if (!r) return { ok: false, motivo: "esquema" };
  const todo = [r.respuesta, ...r.chips].join(" \n ");
  if (EMOJI.test(todo)) return { ok: false, motivo: "emoji" };
  if (URL.test(todo)) return { ok: false, motivo: "enlace" };
  if (todo.includes(TAPADO) || tapar(todo).tapado) return { ok: false, motivo: "dato_tapado" };
  const permit = new Set(c.permitidos.map((p) => (p.includes("@") ? p.toLowerCase() : soloDigitos(p).slice(-10))));
  for (const m of todo.match(TEL) ?? []) if (!permit.has(soloDigitos(m).slice(-10))) return { ok: false, motivo: "telefono" };
  for (const m of todo.match(CORREO) ?? []) if (!permit.has(m.toLowerCase())) return { ok: false, motivo: "correo" };
  if (PERSONA.test(todo)) return { ok: false, motivo: "se_hace_pasar" };
  if (HECHO.test(r.respuesta)) return { ok: false, motivo: "dice_que_hizo" };
  const fuentes = norm(c.texto), compacto = fuentes.replace(/\s/g, "");
  for (const m of r.respuesta.match(MONTO) ?? []) if (!compacto.includes(m.replace(/\s/g, "").replace(/,/g, "")) && !compacto.includes(m.replace(/\s/g, ""))) return { ok: false, motivo: "monto" };
  for (const m of r.respuesta.match(PCT) ?? []) if (!compacto.includes(m.replace(/\s/g, ""))) return { ok: false, motivo: "porcentaje" };
  for (const m of r.respuesta.match(PLAZO) ?? []) { const n = /\d+/.exec(m)![0]; if (!new RegExp(`(^|\\D)${n}\\s?[a-zá-ú]`, "i").test(fuentes)) return { ok: false, motivo: "plazo" }; }
  if (!c.confirmadas) for (const m of r.respuesta.matchAll(CONF)) if (!NEG.test(r.respuesta.slice(Math.max(0, m.index! - 40), m.index!))) return { ok: false, motivo: "confirmada" };
  // La fuente: un trozo de los que se dieron o la cuenta de la persona. Otra cosa se quita (no se inventa una cita).
  let fuente = r.fuente;
  if (fuente && fuente !== "cuenta" && !c.fuentes.includes(fuente)) fuente = "";
  if (fuente === "cuenta" && !c.conCuenta) fuente = "";
  if (r.tipo === "respuesta" && !fuente) return { ok: false, motivo: "sin_fuente" };
  return { ok: true, r: { ...r, fuente } };
}

/* 7f · La respuesta automática (y el borrador de «Sugerir respuesta») habla EN NOMBRE DE UN NEGOCIO: además de verificar(), nunca promete ni
   compromete al negocio (fase7-compa.md §3 punto 5, guardián compaRespuestaAuto). Rechaza:
   - cualquier acción (la respuesta automática no prepara nada);
   - cualquier porcentaje (un negocio no necesita uno para decir su horario o su menú; así un «50 %» de una inyección nunca sale);
   - descuentos, rebajas, regalos, cupones o promociones; devoluciones o reembolsos; «confirmado», «reservado», «te lo guardo / aparto»;
     disponibilidad («hay mesa», «tenemos lugar», «available»); garantías y promesas;
   - hacerse pasar por el dueño (también lo frena verificar()).
   Lo que falla no sale: contestan las reglas fijas o pasa al dueño. */
const PROMETE = /descuent|rebaj|gratis|regal|cupon|promocion|oferta especial|precio especial|discount|for free|free of charge|coupon|promo\b|reembols|devoluci|devolv|refund|money back|\bte (lo |la |los |las )?(guardo|aparto|reservo|confirmo|separo|garantizo)\b|\b(queda|quedo|esta|estan|esta ya) (confirmad|reservad|apartad|guardad)|confirmad|\bconfirmed\b|reserved for you|garantiz|guarantee|te prometo|\bpromise|disponib|\bavailab|\bhay (mesa|lugar|cupo|espacio|sitio)|\b(si|ya) (tenemos|hay) (mesa|lugar|cupo|espacio)|\bwe (have|got) (a )?(table|room|space|spot)|\b(soy|i am|i'm) (el|la|the) (dueno|duena|owner)\b/;
const PCT_TODO = /\d\s?%|\bpor ?ciento\b|\bpercent\b/i;
const sinAcentosV = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function verificarAuto(r: Respuesta): Veredicto {
  if (r.accion.tipo !== "ninguna") return { ok: false, motivo: "auto_accion" };
  const todo = [r.respuesta, ...r.chips].join(" \n ");
  if (PCT_TODO.test(todo)) return { ok: false, motivo: "auto_porcentaje" };
  if (PROMETE.test(sinAcentosV(todo))) return { ok: false, motivo: "auto_promete" };
  return { ok: true, r: { ...r, chips: [] } };
}
