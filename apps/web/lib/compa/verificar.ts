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
  canceladas?: boolean;         // alguna operación del contexto está cancelada de verdad (sin él, «ya quedó cancelada» se descarta como «ya lo hice»)
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
/* «Ya lo hice» (dice_que_hizo). Fronteras de LETRA, nunca \b: en JavaScript \b solo conoce a-z, 0-9 y _, así que tras «cancelé», «devolví» o
   «cambié» no hay frontera y la forma no casaba nunca (23 nov: «Ya cancelé tu solicitud», «Te devolví el dinero» y «Cambié tu teléfono»
   pasaban). Guardián compaFronteraConTilde: ninguna expresión de lib/compa con \b pegado a una letra con tilde o ñ, y CASOS_HECHO (abajo)
   corre contra este código. Caza la primera persona (pretérito con tilde; sin tilde solo tras «ya», porque «que la cancele» es un deseo),
   «he cancelado», «acabo de cancelar», «hice la devolución», «ya quedó cancelada», «ya está hecho», «Listo,» / «Hecho,» y el inglés.
   Deja: lo que hace otro («el negocio canceló», «fue cancelada por el negocio»), lo que se ofrece («puedo cancelarla si confirmas»), lo negado
   («no cancelé nada») y lo condicionado («cuando confirmes, ya queda cancelada»). */
const LI = "(?<![\\p{L}\\p{N}])", LD = "(?![\\p{L}\\p{N}])";                              // frontera de letra (con tilde y ñ), a la izquierda y a la derecha
const PRON = "(?:(?:te|le|les|lo|la|los|las|se|me)\\s+){0,2}";
const NEGADO = `(?<!${LI}(?:no|nunca|jamás|jamas|todavía no|todavia no|aún no|aun no)\\s+${PRON})`;
const CONDICION = `(?<!${LI}(?:cuando|cuándo|en cuanto|apenas|una vez que|después de que|despues de que|al confirmar|si|once|when|after|if)${LD}[^.!?]{0,40})`;
// Lo que NO es una afirmación de El Compa: una pregunta («¿Me devuelven todo lo que pagué?», «Can I delete a photo I already sent?»: así
// se escriben las preguntas frecuentes de la ayuda, con la voz de la persona) y lo que va entre comillas (el nombre de un botón: «Ya lo mandé»).
const FUERA = `(?<!¿[^¿?.!]*)(?<!(?:^|[.!?:*]\\s*)(?:can|could|do|does|did|is|are|am|was|were|will|would|should|what|when|where|why|how|which|who)${LD}[^.!?]*)(?<!«[^»]*)(?<!“[^”]*)`;
const YO_CON_TILDE = "cancelé|anulé|reembolsé|cambié|confirmé|reservé|borré|eliminé|actualicé|modifiqué|envié|mandé|procesé|cobré|pagué|agendé|programé|aparté|bloqueé|desbloqueé|devolví";
const YO_SIN_TILDE = "cancele|anule|reembolse|cambie|confirme|reserve|borre|elimine|actualice|modifique|envie|mande|procese|cobre|pague|agende|programe|aparte|devolvi|hice";
const INFINITIVO = "(?:cancelar|anular|devolver|reembolsar|cambiar|confirmar|reservar|borrar|eliminar|actualizar|modificar|enviar|mandar|procesar|cobrar|pagar|agendar|programar|hacer)(?:te|le|les|lo|la|los|las|se|me)?";
const PARTICIPIO = "cancelado|anulado|devuelto|reembolsado|cambiado|confirmado|reservado|borrado|eliminado|actualizado|modificado|enviado|mandado|procesado|cobrado|pagado|agendado|programado|hecho";
const QUEDO = "cancelad[oa]s?|anulad[oa]s?|devuelt[oa]s?|reembolsad[oa]s?|cambiad[oa]s?|actualizad[oa]s?|borrad[oa]s?|eliminad[oa]s?|modificad[oa]s?|procesad[oa]s?|hech[oa]s?";
const TRAMITE = "devoluci[oó]n|cancelaci[oó]n|reembolso|cambio|pedido|reserva|reservaci[oó]n|pago|cobro|cita|solicitud";
const hechoRe = (quedo: string, cancelado: string) => new RegExp(`${FUERA}(?:${[
  `${NEGADO}${LI}(?:${YO_CON_TILDE})${LD}(?!\\s+(?:de|mi|mis)${LD})`,  // «cancelé», «te devolví» (no «cambié de teléfono»: la voz de la persona)
  `${LI}ya\\s+${PRON}(?:${YO_SIN_TILDE})${LD}`,                                                // «ya cancele» (sin tilde), «ya lo hice»
  `${NEGADO}${LI}(?:hice\\s+(?:la|el|tu|su|un|una)\\s+(?:${TRAMITE})|(?:lo|la)\\s+hice\\s+por\\s+ti|ped[ií]\\s+por\\s+ti)${LD}`,
  `${NEGADO}${LI}he\\s+(?:ya\\s+)?(?:${PARTICIPIO})${LD}`,                                     // «he cancelado», «te he devuelto»
  `${LI}acabo\\s+de\\s+${INFINITIVO}${LD}`,                                                    // «acabo de cancelarla»
  `${CONDICION}${LI}ya\\s+(?:qued[oó]|queda)\\s+(?:${quedo})${LD}`,                            // «ya quedó cancelada»
  `${CONDICION}${LI}ya\\s+(?:est[aá]|qued[oó]|queda)\\s+hech[oa]s?${LD}`,                      // «ya está hecho»
  `(?:^|[.!?:;]\\s*)hecho[,.!:](?=\\s|$)`,                                                    // «Hecho, …»
  `\\bI(?:'ve| have)?\\s+(?:(?:already|just|went ahead and)\\s+)*(?:cancell?ed|refunded|changed|booked|confirmed|deleted|removed|updated|sent|processed|issued|modified|charged|made the (?:refund|change|cancellation))\\b`,
  `(?:^|[.!?]\\s+)(?:it'?s|it is|that'?s|that is|all|everything(?:'s| is))\\s+(?:already\\s+|all\\s+)?done(?=\\s*(?:[.!]|$))|${CONDICION}\\balready done\\b`,  // «It's done.» al cerrar la frase (no «Once you confirm, it's done», no «It's done: we ask…»)
  `\\b(?:is|are|has been|have been)\\s+now\\s+(?:${cancelado}refunded|changed|updated|deleted|processed)\\b`,
  `${CONDICION}\\b(?:done|listo)[,.]\\s`,                                                      // «Listo, …» (no «si todavía no está listo, …»)
].join("|")})`, "iu");
/* Lo que el Compa puede AFIRMAR de verdad: que una operación ya está cancelada, si el contexto trae una cancelada («Ya quedó cancelada» es un estado, no
   que El Compa la cancelara). HECHO es el rechazo completo; HECHO_SIN_CANCELADA es el mismo sin esas dos formas («ya quedó cancelada», «is now cancelled»):
   se descarta como «dice_que_hizo» salvo que SOLO case HECHO y haya una cancelada en el contexto. Lo demás («cancelé», «ya está hecho») nunca se relaja. */
const HECHO = hechoRe(QUEDO, "cancell?ed|");
const HECHO_SIN_CANCELADA = hechoRe(QUEDO.replace("cancelad[oa]s?|", ""), "");
export const CASOS_CANCELADA = {
  // Con una operación cancelada en el contexto: estas pasan (es un estado, no que El Compa la cancelara) y estas siguen cayendo.
  pasa: ["Ya quedó cancelada tu solicitud.", "Tu cita ya quedó cancelada.", "Your request is now cancelled."],
  cae: ["Ya cancelé tu solicitud.", "I cancelled your request.", "Ya está hecho.", "Hecho, tu cita quedó cancelada.", "Ya quedó devuelto tu dinero.", "Ya quedó cancelada y te devolví el pago."],
} as const;
const diceQueHizo = (texto: string, canceladas?: boolean) => HECHO.test(texto) && !(canceladas === true && !HECHO_SIN_CANCELADA.test(texto));
/* La tabla de HECHO: lo que verificar() y verificarCopiloto() DEBEN rechazar con «dice_que_hizo» y lo que NO deben rechazar por eso. La corre el
   guardián compaFronteraConTilde contra este archivo real; quitar una forma, la bandera u o volver al \b la pone en rojo. Solo se añade. */
export const CASOS_HECHO = {
  caza: {
    es: ["Ya cancelé tu solicitud.", "Cancelé tu solicitud de la mesa.", "Te devolví el dinero.", "Cambié tu teléfono.", "Ya cancele tu solicitud.", "He cancelado tu reserva.",
      "Ya quedó cancelada tu solicitud.", "Ya quedó cancelado tu pedido.", "Hice la devolución.", "Ya hice la devolución de tu pago.", "Ya está hecho.", "Actualicé tu ciudad.",
      "Borré tu cuenta.", "Envié tu mensaje al negocio.", "Ya envié el aviso.", "Eliminé la reseña.", "Anulé el pedido.", "Reembolsé el cargo.", "Confirmé tu reserva.",
      "Reservé la mesa para ti.", "Te reembolsé lo de tu pedido.", "Ya te devolví lo de tu pedido.", "Listo, ya está.", "Hecho, tu cita quedó cancelada.", "Ya lo cancelé.",
      "Ya la cancelé.", "Lo cambié por ti.", "Acabo de cancelar tu solicitud.", "Acabo de cancelarla.", "Ya procesé el reembolso.", "Ya he devuelto el dinero.", "Ya cambié el número.",
      "Ya actualicé tus datos.", "Ya modifiqué tu dirección.", "Ya mandé el mensaje.", "Pedí por ti el pedido.", "Cancelé", "Devolví todo.", "YA CANCELÉ TU SOLICITUD.",
      "Te he devuelto el pago.", "Ya lo hice.", "Te agendé la cita.", "Ya devolvi tu dinero.", "Ya cancelé tu solicitud, ¿algo más?", "Cambié tu número de teléfono."],
    en: ["I cancelled your request.", "I've cancelled your request.", "I have refunded your order.", "I changed your phone number.", "Done, your request is cancelled.",
      "I already updated your city.", "I sent your message to the business.", "I deleted your review.", "I just cancelled it.", "It's done.", "I've processed your refund.",
      "I went ahead and cancelled your booking.", "Your request is now cancelled.", "That's already done."],
  },
  deja: {
    es: ["Puedo cancelarla si confirmas.", "Si quieres, la cancelo cuando confirmes.", "El negocio canceló tu cita.", "Tu cita fue cancelada por el negocio.",
      "El negocio ya canceló tu cita.", "Para cancelar, toca Cancelar solicitud.", "Puedes cambiar tu teléfono en Cuenta.", "Cuando confirmes, se cancela.",
      "Te preparé la cancelación: confirma abajo.", "La devolución la decide el negocio.", "Cancela desde Mis reservas.", "Puedes pedir una devolución desde la operación.",
      "¿Quieres que la cancele?", "¿Quieres que cancele la reserva? Toca Confirmar.", "Si lo cambias, te llega un código.", "El dueño envió un mensaje.", "Tu pedido fue enviado.",
      "Te envío al panel.", "Toca Confirmar para cancelar.", "No puedo cancelar por ti; toca el botón.", "La cancelación queda lista cuando confirmes.",
      "No cancelé nada: solo preparé la cancelación.", "Todavía no la cancelé: falta que confirmes.", "Cuando confirmes, ya queda cancelada.", "Ya le pasé tu caso con el resumen.",
      "Le pasé tu mensaje a El Fogón y te contesta cuando abra.", "Ya estoy revisando tu caso y te escribo en cuanto tenga la respuesta.", "Tu solicitud está cancelada.",
      "Si ya pagaste, el negocio te lo devuelve.", "Te preparé la cancelación de tu solicitud en El Fogón. Como todavía no está confirmada, no pagas nada.",
      "¿Me devuelven todo lo que pagué? A la tarjeta vuelve, como mucho, el depósito que pagaste en la app.", "Cambié de teléfono. Entra con tu mismo número en el teléfono nuevo.",
      "Toca «Ya lo mandé» y vuelve a revisión.", "Si la devolución ya quedó hecha, la alerta es solo informativa.", "¿Puedo borrar una foto que ya mandé? No: en Mensajes nada se borra."],
    en: ["You can cancel it if you confirm.", "The business cancelled your appointment.", "Tap Confirm to cancel.", "I can change it once you confirm.",
      "Your request was cancelled by the business.", "Once you confirm, it's done.", "I prepared the cancellation; confirm below.", "I haven't cancelled anything yet.",
      "I passed your message to El Fogón and they will reply when they open.", "I already passed your case on with a summary.",
      "Can I delete a photo I already sent? No: nothing is deleted in Messages.", "When am I charged? On the day of your first visit.", "It's done: we ask for your review.", "If the refund is already done, the alert is informational only."],
  },
} as const;
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
  if (HECHO.test(r.respuesta) && diceQueHizo(r.respuesta, c.canceladas)) return { ok: false, motivo: "dice_que_hizo" };
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

/* 7g · El COPILOTO del equipo (Super Admin › Soporte y la cola de ayudas escaladas; guardianes compaSalidaLimpia y copilotoSoloBorrador). Su salida
   tiene dos partes: lo que lee el EQUIPO (resumen, siguiente) y el BORRADOR que leerá la PERSONA si alguien del equipo lo envía con su nombre.
   Determinista, en TODA salida (del modelo y de las reglas), antes de que nadie la vea. Rechaza:
   - lo que no cumple el esquema (tipos, largo, ≤ 4 frases en el borrador, ≤ 2 en el resumen y el siguiente paso);
   - emoji, enlaces, datos que tapar() taparía o «[tapado]», teléfonos y correos (en las tres partes);
   - en el borrador: prometer devoluciones, reembolsos, créditos, cupones, regalos, sanciones o garantías; decir que algo ya se hizo; «confirmada»
     si nada del caso lo está; montos, porcentajes y plazos que NO estén en lo que la persona ya ve del caso (la operación, lo pagado en la app, lo
     que el equipo ya le escribió) o en la ayuda dada — nunca los que ella pidió ni los de una nota interna; y cualquier pedazo de una NOTA
     INTERNA (cinco palabras seguidas, o un número que solo está en una nota);
   - en el resumen y el siguiente paso: montos que no estén en el caso (ni en lo que pidió la persona ni en las notas).
   La macro solo vale si es de la lista dada; la fuente, si estaba entre los trozos dados (si no, se quitan); «sugerir_devolver» solo si el rol
   de quien lo pidió tiene «Resolver y devolver» y hay algo pagado en la app. Lo que falla no se muestra: sale el borrador de reglas. */
export type CtxCopiloto = {
  fuentes: string[]; macros: string[]; confirmadas: boolean; canceladas?: boolean; maxBorrador: number; puedeDevolver: boolean;
  publico: string;        // lo que la persona ya ve: la operación, lo pagado en la app, lo que el equipo le escribió, la respuesta del negocio y la ayuda dada
  caso: string;           // lo que escribió la persona y el resumen de su caso (vale para el resumen del equipo, nunca para prometer en el borrador)
  internas: string[];     // las notas internas que vio el modelo (nunca en el borrador)
};
export type SalidaCopiloto = { resumen: string; borrador: string; siguiente: string; macro: string; fuente: string; sugerir_devolver: boolean };
export type VeredictoCopiloto = { ok: true; r: SalidaCopiloto } | { ok: false; motivo: string };
const PROMETE_COP = new RegExp([
  "\\b(te|le|les)\\s+(vamos a |voy a |van a |vas a )?(devolv|devuelv|reembols|abon|acredit|reintegr|compens|regal)",
  "\\b(devolvemos|reembolsamos|reintegramos|compensamos|te devuelvo|te reembolso)\\b",
  "\\b(recibiras|vas a recibir|tendras) (tu |el |la |una |un )?(devolucion|reembolso|dinero|credito|cupon)",
  "\\b(devolucion|reembolso|refund)( ya)? (esta |fue |ha sido |is |has been |was )?(aprobad|hech|procesad|en camino|confirmad|approved|issued|processed|on its way)",
  "\\bwe('ll| will| are going to| can)? (refund|reimburse|credit|compensate)\\b",
  "\\bi('ll| will| am going to| can)? (refund|reimburse|credit)\\b",
  "\\byou('ll| will) (get|receive) (a |your |the )?(refund|money back|credit)",
  "\\b(cupon|coupon|store credit|credito a tu cuenta|monedas de regalo|puntos de regalo|gratis|free of charge|on the house)\\b",
  "\\b(vamos a|voy a|we will|we'll|we are going to)\\s+(suspender|sancionar|bloquear|cerrar|banear|multar|castigar|suspend|sanction|ban|block|fine|close)\\b",
  "\\b(suspendimos|sancionamos|bloqueamos|baneamos|multamos)\\b|\\bwe (suspended|sanctioned|banned|blocked|fined)\\b",
  "garantiz|guarante|te prometo|le prometo|\\bi promise|\\bwe promise",
].join("|"));
const palabrasV = (s: string) => sinAcentosV(s).replace(/[^a-z0-9ñ$%]+/g, " ").trim().split(" ").filter(Boolean);
const tejas = (s: string, n: number) => { const w = palabrasV(s), out = new Set<string>(); for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" ")); return out; };
const limpioV = (s: string) => s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
const frasesN = (s: string) => s.split(/(?<=[.!?])\s+/).filter((f) => f.trim().length > 1).length;
const enTexto = (m: string, compacto: string) => compacto.includes(m.replace(/\s/g, "").replace(/,/g, "")) || compacto.includes(m.replace(/\s/g, ""));
export function verificarCopiloto(x: unknown, c: CtxCopiloto): VeredictoCopiloto {
  if (!x || typeof x !== "object") return { ok: false, motivo: "esquema" };
  const o = x as Record<string, unknown>;
  if (typeof o.resumen !== "string" || typeof o.borrador !== "string" || typeof o.siguiente !== "string" || typeof o.macro !== "string" || typeof o.fuente !== "string"
    || typeof o.sugerir_devolver !== "boolean") return { ok: false, motivo: "esquema" };
  const r: SalidaCopiloto = { resumen: limpioV(o.resumen), borrador: limpioV(o.borrador), siguiente: limpioV(o.siguiente), macro: o.macro.trim(), fuente: o.fuente.trim(), sugerir_devolver: o.sugerir_devolver };
  if (r.resumen.length < 5 || r.resumen.length > 300 || r.borrador.length < 2 || r.borrador.length > c.maxBorrador || r.siguiente.length > 200 || r.macro.length > 40 || r.fuente.length > 80) return { ok: false, motivo: "esquema" };
  if (frasesN(r.borrador) > 4 || frasesN(r.resumen) > 2 || frasesN(r.siguiente) > 2) return { ok: false, motivo: "largo" };
  const todo = [r.resumen, r.borrador, r.siguiente].join(" \n ");
  if (EMOJI.test(todo)) return { ok: false, motivo: "emoji" };
  if (URL.test(todo)) return { ok: false, motivo: "enlace" };
  if (todo.includes(TAPADO) || tapar(todo).tapado) return { ok: false, motivo: "dato_tapado" };
  if ((todo.match(TEL) ?? []).length || (todo.match(CORREO) ?? []).length) return { ok: false, motivo: "telefono" };
  // El borrador: lo que leerá la persona.
  if (HECHO.test(r.borrador) && diceQueHizo(r.borrador, c.canceladas)) return { ok: false, motivo: "dice_que_hizo" };
  if (PROMETE_COP.test(sinAcentosV(r.borrador))) return { ok: false, motivo: "promete" };
  const pub = norm(c.publico), pubC = pub.replace(/\s/g, "");
  for (const m of r.borrador.match(MONTO) ?? []) if (!enTexto(m, pubC)) return { ok: false, motivo: "monto" };
  for (const m of r.borrador.match(PCT) ?? []) if (!pubC.includes(m.replace(/\s/g, ""))) return { ok: false, motivo: "porcentaje" };
  for (const m of r.borrador.match(PLAZO) ?? []) { const n = /\d+/.exec(m)![0]; if (!new RegExp(`(^|\\D)${n}\\s?[a-zá-ú]`, "i").test(pub)) return { ok: false, motivo: "plazo" }; }
  if (!c.confirmadas) for (const m of r.borrador.matchAll(CONF)) if (!NEG.test(r.borrador.slice(Math.max(0, m.index! - 40), m.index!))) return { ok: false, motivo: "confirmada" };
  // Nada de una nota interna en el borrador: cinco palabras seguidas o un número que solo está en una nota.
  if (c.internas.length) {
    const t = tejas(r.borrador, 5);
    for (const nota of c.internas) for (const s of tejas(nota, 5)) if (t.has(s)) return { ok: false, motivo: "nota_interna" };
    const numsPub = new Set(palabrasV(c.publico).filter((w) => /\d{3,}/.test(w)));
    const numsInt = new Set(c.internas.flatMap((n) => palabrasV(n)).filter((w) => /\d{3,}/.test(w) && !numsPub.has(w)));
    for (const w of palabrasV(r.borrador)) if (numsInt.has(w)) return { ok: false, motivo: "nota_interna" };
  }
  // Lo del equipo: montos solo del caso (lo que ve la persona, lo que pidió o una nota), nunca inventados.
  const todoCaso = norm([c.publico, c.caso, ...c.internas].join("\n")).replace(/\s/g, "");
  for (const m of `${r.resumen} ${r.siguiente}`.match(MONTO) ?? []) if (!enTexto(m, todoCaso)) return { ok: false, motivo: "monto_equipo" };
  return { ok: true, r: { ...r, macro: c.macros.includes(r.macro) ? r.macro : "", fuente: c.fuentes.includes(r.fuente) ? r.fuente : "", sugerir_devolver: r.sugerir_devolver && c.puedeDevolver } };
}
