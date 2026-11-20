/* 5d · Moderación: lo que comparten la pantalla y el servidor (sin base): motivos de reporte (com-data.js REP), las 6 reglas de
   Contenido › Auto-moderación con su texto (Super Admin.dc.html secCont sub «auto»), los límites del día, la línea del 988 y las
   etiquetas de lo que se puede apelar. El servidor decide; esto solo nombra. */
type Bi = { es: string; en: string };

/* Motivos para reportar una publicación, un comentario o a una persona (com-data.js REP L41–46). */
export const REP: [string, Bi][] = [
  ["spam", { es: "Venta, spam o cadena", en: "Sales, spam or chain message" }],
  ["priv", { es: "Datos de otra persona", en: "Someone else's personal info" }],
  ["acoso", { es: "Insulto o acoso", en: "Insult or harassment" }],
  ["falso", { es: "Información falsa", en: "False information" }],
  ["propio", { es: "Se recomienda a sí mismo", en: "Self-promotion" }],
  ["otro", { es: "Otra cosa", en: "Something else" }],
];
export const MOTIVO_REP: Record<string, string> = Object.fromEntries(REP.map(([k, l]) => [k, l.es]));
export const MAX_NOTA = 300;

/* Las reglas (mod_rules). `fija` = no se apaga (la base lo impone). */
export type ReglaKey = "phone" | "pii" | "spam" | "hate" | "rev5" | "img" | "autohide" | "foto1" | "foto2" | "foto3" | "foto4";
export const REGLAS: Record<ReglaKey, { t: string; s: string; fija?: string }> = {
  phone: { t: "Teléfonos en publicaciones y comentarios", s: "Se bloquea al escribir; el vecino recomienda el negocio y el teléfono sale en su página.", fija: "Siempre activa: la base nunca guarda un teléfono, un correo ni un número privado." },
  pii: { t: "Direcciones de personas", s: "Número y calle se rechazan al escribir (siempre). Con la regla encendida, lo que señala dónde vive alguien o una placa va a la cola Reportes para una persona." },
  spam: { t: "Enlaces y ventas repetidas", s: "{n} publicaciones o comentarios parecidos en {horas} h → cola Reportes. Los enlaces se muestran como texto." },
  hate: { t: "Lenguaje discriminatorio", s: "Listas ES/EN (odio, estafa, inmigración): marca para una persona, nunca oculta sola. Inmigración va con prioridad." },
  rev5: { t: "Reseñas en ráfaga", s: "{n} reseñas sin transacción en {min} min → cola Reportes de usuario." },
  img: { t: "Fotos: desnudez", s: "Modelo propio (NudeNet, ONNX) antes de publicar → cola Medios marcados. Si no responde, la foto espera revisión manual." },
  autohide: { t: "Auto-ocultar por reportes", s: "{reportes} reportes de personas y dispositivos distintos en {horas} h (cuentas de más de {edad_h} h) → oculta por revisión, con aviso y apelación." },
  // AJ · Revisión automática de las fotos públicas (lib/fotos-revision.ts): una regla por capa, con su interruptor y sus valores.
  foto1: { t: "Fotos públicas · capa 1: modelo propio", s: "Al subir: menos de {duda_pct} % de desnudez → se publica; {rechazo_pct} % o más → se rechaza con aviso y «Pedir revisión»; entre los dos → capa 2. Apagada (o si no responde): todo pasa a la capa 2." },
  foto2: { t: "Fotos públicas · capa 2: segunda opinión (IA)", s: "La foto reducida y una pauta fija, en el mismo pedido ({espera_s} s como mucho): publica, rechaza con motivo o la retiene. Tope de ${tope_dolares} al mes; {intentos} reintentos del barrido. Apagada o al tope: las dudosas quedan retenidas." },
  foto3: { t: "Fotos públicas · capa 3: reportes", s: "{reportes} reportes de cuentas distintas (de más de {edad_h} h; un mismo dispositivo cuenta una vez) → la foto se oculta sola, su archivo sale de lo público y pasa a la capa 2." },
  foto4: { t: "Fotos públicas · capa 4: confianza", s: "Negocio verificado con {fotos} fotos visibles y ninguna quitada en {dias} días: sus dudosas se publican sin la capa 2 (las claras se rechazan igual). Cuentas de menos de {nueva_dias} días: {nueva_hora} fotos por hora." },
};
export const ORDEN_REGLAS: ReglaKey[] = ["phone", "pii", "spam", "hate", "rev5", "img", "autohide", "foto1", "foto2", "foto3", "foto4"];
/* Parámetros editables de cada regla: [clave, etiqueta, mínimo, máximo]. */
export const PARAMS: Partial<Record<ReglaKey, [string, string, number, number][]>> = {
  spam: [["n", "Cuántas parecidas", 2, 20], ["horas", "En cuántas horas", 1, 168]],
  rev5: [["n", "Cuántas reseñas", 2, 50], ["min", "En cuántos minutos", 1, 1440]],
  img: [["umbral", "Umbral del modelo (0–1)", 0.3, 0.95]],
  autohide: [["reportes", "Reportes", 2, 50], ["horas", "En cuántas horas", 1, 168], ["edad_h", "Cuentas de más de (h)", 0, 720]],
  // AJ · Enteros (los umbrales en por ciento): reglaParams redondea todo lo que no es «umbral».
  foto1: [["duda_pct", "Desde qué % es dudosa", 30, 95], ["rechazo_pct", "Desde qué % se rechaza", 50, 99]],
  foto2: [["tope_cents", "Tope al mes (centavos)", 0, 100000], ["espera_s", "Tiempo límite (s)", 3, 20], ["intentos", "Reintentos del barrido", 1, 10]],
  foto3: [["reportes", "Reportes de cuentas distintas", 2, 50], ["edad_h", "Cuentas de más de (h)", 0, 720]],
  foto4: [["fotos", "Fotos visibles del negocio", 1, 100], ["dias", "Sin fotos quitadas en (días)", 7, 365], ["nueva_dias", "Cuenta nueva: menos de (días)", 0, 60], ["nueva_hora", "Cuenta nueva: fotos por hora", 1, 60]],
};
/* {tope_dolares}: el tope de la capa 2 se guarda en centavos y se lee en dólares. */
export const conDolares = (p: Record<string, number>) => ("tope_cents" in p ? { ...p, tope_dolares: (Number(p.tope_cents) / 100).toFixed(2) } : p) as Record<string, number | string>;
export const textoRegla = (k: ReglaKey, p: Record<string, number>) => REGLAS[k].s.replace(/\{(\w+)\}/g, (_, x) => String(conDolares(p)[x] ?? ""));

/* Cómo se nombra en el Super Admin lo que marcó cada regla (mod_flags.rule_key). */
export const REGLA_L: Record<string, string> = { phone: "Teléfono", pii: "Dónde vive alguien", spam: "Repetido", hate: "Lenguaje discriminatorio", rev5: "Reseñas en ráfaga", img: "Foto", autohide: "Auto-ocultada", red: "Posible red de cuentas", estafa: "Posible estafa", migra: "Inmigración", autolesion: "Autolesión", evt: "Señal de Eventos", foto1: "Fotos · modelo propio", foto2: "Fotos · segunda opinión", foto3: "Fotos · reportes", foto4: "Fotos · confianza" };
export const TIPOS_TERMINO: [string, string][] = [["odio", "Odio"], ["estafa", "Estafa"], ["migra", "Inmigración"], ["autolesion", "Autolesión"]];

/* Límites del día: el valor vive en Configuración (config_keys + platform_config; lib/config.ts); aquí solo la clave y cómo se nombra. */
export type Limite = "publicaciones" | "comentarios" | "votos" | "conversaciones" | "reportes";
export const LIMITES: Record<Limite, { key: "com_lim_publicaciones" | "com_lim_comentarios" | "com_lim_votos" | "com_lim_conversaciones" | "com_lim_reportes"; es: string; en: string }> = {
  publicaciones: { key: "com_lim_publicaciones", es: "publicaciones", en: "posts" },
  comentarios: { key: "com_lim_comentarios", es: "comentarios", en: "comments" },
  votos: { key: "com_lim_votos", es: "votos", en: "votes" },
  conversaciones: { key: "com_lim_conversaciones", es: "conversaciones nuevas", en: "new conversations" },
  reportes: { key: "com_lim_reportes", es: "reportes", en: "reports" },
};
export const ORDEN_LIMITES: Limite[] = ["publicaciones", "comentarios", "votos", "conversaciones", "reportes"];

/* Autolesión: la persona ve la línea del 988 (como Iglesias). */
export const LINEA988: Bi = {
  es: "Si piensas hacerte daño, no estás sola ni solo: llama o escribe al 988 (en español también). Si es una emergencia, llama al 911.",
  en: "If you are thinking of hurting yourself, you are not alone: call or text 988 (Spanish available). If it is an emergency, call 911.",
};

/* Lo que se puede apelar. */
export type Apelable = "com_post" | "com_comment" | "dm_message" | "media" | "sanction" | "event" | "evt_org";
export const APELABLE: Record<Apelable, { es: string; en: string; oculto: Bi }> = {
  com_post: { es: "publicación", en: "post", oculto: { es: "Ocultamos tu publicación", en: "We hid your post" } },
  com_comment: { es: "comentario", en: "comment", oculto: { es: "Ocultamos tu comentario", en: "We hid your comment" } },
  dm_message: { es: "mensaje", en: "message", oculto: { es: "Ocultamos tu mensaje", en: "We hid your message" } },
  media: { es: "foto", en: "photo", oculto: { es: "Quitamos tu foto", en: "We removed your photo" } },
  sanction: { es: "sanción", en: "sanction", oculto: { es: "Recibiste una sanción", en: "You received a sanction" } },
  // 6a · lo apela el dueño del negocio organizador.
  event: { es: "evento", en: "event", oculto: { es: "To’Latino ocultó o no aprobó tu evento", en: "To’Latino hid or did not approve your event" } },
  evt_org: { es: "bloqueo de eventos", en: "event block", oculto: { es: "No puedes publicar eventos", en: "You cannot publish events" } },
};
export const MIN_APELACION = 20, MAX_APELACION = 500;
