/* Comunidad · lo que nunca se publica y las líneas fijas (fase5-comunidad.md §1c y §3). ÚNICO lugar de las reglas al escribir:
   publicaciones, encuestas y «para…» (y en 5b–5c comentarios, bio y mensajes). Puro (sin base ni cookies): el teléfono lo usa para
   avisar antes de enviar y el servidor lo vuelve a correr y decide. La base lo impone otra vez con com_sin_datos() (0097), así que
   ni un insert directo guarda un teléfono (guardián comunidadSinTelefonos).
   - Teléfonos (10 dígitos con o sin separadores, wa.me), correos: PII de las reseñas (lib/resenas-filtro.ts, el mismo patrón que TEL
     de lib/mensajes.ts).
   - SSN/ITIN, tarjetas, A-number y número de caso de USCIS (la parte de números de PRIVADO; los diagnósticos no: preguntar por
     un pediatra o una clínica es lo que se hace aquí).
   - Direcciones exactas de personas (número + calle): se rechazan; la ubicación se da como barrio o calle sin número.
   - Enlaces: se guardan como texto y nunca se vuelven enlace (§6 #20); un enlace a WhatsApp cuenta como teléfono.
   - Emergencias: no se preguntan aquí. Si el texto parece una emergencia, se muestra la línea del 911 (y la publicación la lleva). */
import { PII } from "./resenas-filtro";

type Bi = { es: string; en: string };
export type Tipo = "pregunta" | "recomendacion" | "encuesta" | "publicacion";
export const TIPOS: Tipo[] = ["pregunta", "recomendacion", "encuesta", "publicacion"];
export const TEMAS: [string, string, string][] = [["comida", "Comida", "Food"], ["belleza", "Belleza", "Beauty"], ["autos", "Autos", "Cars"], ["hogar", "Hogar", "Home"],
  ["salud", "Salud", "Health"], ["tramites", "Trámites", "Paperwork"], ["fiestas", "Fiestas", "Parties"], ["ninos", "Niños", "Kids"], ["otro", "Otro", "Other"]];
export const MIN_TEXTO = 10, MAX_TEXTO = 1000, MAX_FOTOS = 4, MAX_OPCION = 60, MAX_PARA = 40;
export const DESHACER_S = 10, RANGO_ENCUESTA = 3;
/* 5i · Cuánto dura una encuesta: las opciones 1 · 3 · 7 días hasta el máximo de Configuración (com_encuesta_dias_max), y el máximo
   mismo si no es una de ellas. El servidor manda el máximo; el teléfono solo lo pinta. Editar (com_editar_min) y apelar
   (com_apelar_dias) también viven en Configuración (lib/config.ts): aquí no hay copias. */
export const OPCIONES_ENCUESTA = [1, 3, 7] as const;
export const diasEncuesta = (max: number): number[] => [...new Set([...OPCIONES_ENCUESTA.filter((d) => d <= max), max])].sort((a, b) => a - b);
const listaDias = (L: number[], es: boolean) => { const t = L.map(String); return t.length < 2 ? t.join("") : `${t.slice(0, -1).join(", ")} ${es ? "o" : "or"} ${t[t.length - 1]}`; };

/* Líneas fijas (verbatim; nunca se suavizan). */
export const LINEA_FIJA: Bi = { es: "Aquí nada se compra: el orden lo ponen los votos de los vecinos.", en: "Nothing here is bought: neighbors’ votes set the order." };
export const LINEA911: Bi = { es: "Una recomendación no reemplaza al médico. Si es una emergencia, llama al 911.", en: "A recommendation does not replace a doctor. If it is an emergency, call 911." };
export const EMERGENCIA911: Bi = { es: "Una emergencia no se pregunta aquí: llama al 911.", en: "An emergency isn't asked here: call 911." };
export const reglas = (ciudad: string): Bi[] => [
  { es: `Habla de ${ciudad} y de lo que pasa aquí.`, en: `Talk about ${ciudad} and what happens here.` },
  { es: "Recomienda por experiencia, nunca tu propio negocio. Tu negocio publica en sus Novedades.", en: "Recommend from experience, never your own business. Your business posts in its Updates." },
  { es: "Nada de ventas, rifas ni cadenas.", en: "No sales, raffles or chain messages." },
  { es: "No publiques teléfonos, direcciones ni fotos de otras personas sin su permiso.", en: "Don't post other people's phones, addresses or photos without permission." },
  { es: "Respeto siempre: sin insultos ni acoso.", en: "Respect always: no insults or harassment." },
  EMERGENCIA911,
];

const TEL = /(\d[\s().-]*){10}|wa\.me\/|api\.whatsapp\.com/i;
const NUMEROS = /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b|\bA[\s-]?\d{8,9}\b|\b[A-Z]{3}\d{10}\b/;
// Número de casa + nombre de calle (1–3 palabras, sin «y / la / de…») + tipo de calle; o «calle X 123».
const SIN = "(?!(?:y|e|o|and|or|la|el|los|las|de|del|con|a|al|en|por|para|the|at|on|of|to)\\b)";
const CALLE = "(?:st|street|ave|avenue|av|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pl|place|way|ter|terrace|hwy|highway|pike|cir|circle)";
const DIRECCION = new RegExp(`\\b\\d{1,5}\\s+(?:[nsew]\\.?\\s+)?(?:${SIN}[\\wÁÉÍÓÚÑáéíóúñü'.-]+\\s+){1,3}${CALLE}\\b`, "i");
const DIRECCION_ES = /\b(?:calle|avenida|ave\.?|av\.)\s+[A-Za-zÁÉÍÓÚÑáéíóúñü][\wÁÉÍÓÚÑáéíóúñü .'-]{0,30}?\s#?\d{1,5}\b|\b(?:n[uú]mero|no\.|#)\s?\d{1,5}\s+(?:de\s+la\s+)?(?:calle|avenida)\b/i;
export const EMERGENCIA = /\b(emergencia|incendio|se est[aá] quemando|disparos?|balacera|tiroteo|no respira|infarto|sobredosis|convulsi\w+|me (?:est[aá]n )?(?:robando|atacando|siguiendo)|emergency|on fire|shooting|not breathing|overdose|heart attack)\b/i;

export type Falla = { campo: "texto" | "negocio" | "opciones" | "para" | "tema" | "tipo" | "fotos" | "dias"; msg: Bi };
export const MAX_COMENTARIO = 600;
const falla = (campo: Falla["campo"], es: string, en: string): Falla => ({ campo, msg: { es, en } });

/* Un texto que escribe un vecino (publicación, opción de encuesta, «para…»; luego comentario, bio y mensaje). */
export function revisarTexto(t: string, campo: Falla["campo"] = "texto"): Falla | null {
  if (TEL.test(t)) return falla(campo, "No publiques teléfonos. Recomienda el negocio: su teléfono sale en su página.", "Don't post phone numbers. Recommend the business: its phone shows on its page.");
  if (PII.test(t)) return falla(campo, "No publiques correos ni datos de contacto de nadie.", "Don't post emails or anyone's contact details.");
  if (NUMEROS.test(t)) return falla(campo, "No publiques números de seguro social, de tarjeta ni de inmigración.", "Don't post Social Security, card or immigration numbers.");
  if (DIRECCION.test(t) || DIRECCION_ES.test(t)) return falla(campo, "Sin direcciones exactas: di el barrio o la calle, sin el número de la casa.", "No exact addresses: say the neighborhood or the street, without the house number.");
  return null;
}
export const pareceEmergencia = (t: string) => EMERGENCIA.test(t);

export type Borrador = { kind: Tipo; body: string; topic?: string | null; business?: string | null; para?: string[]; opts?: string[]; dias?: number; fotos?: string[]; noEsMio?: boolean };
/* Todas las reglas de una publicación que no necesitan la base (la base: negocio activo y no propio, rango, límites, sanciones). */
export function revisarPublicacion(p: Borrador, dias?: number[]): Falla | null {
  if (!TIPOS.includes(p.kind)) return falla("tipo", "Elige qué quieres publicar.", "Choose what you want to post.");
  const t = String(p.body ?? "").trim();
  if (p.kind === "recomendacion" && !p.business) return falla("negocio", "Elige el negocio que recomiendas.", "Pick the business you recommend.");
  if (t.length < MIN_TEXTO) return falla("texto", `Escribe al menos ${MIN_TEXTO} letras.`, `Write at least ${MIN_TEXTO} characters.`);
  if (t.length > MAX_TEXTO) return falla("texto", `Máximo ${MAX_TEXTO} letras.`, `${MAX_TEXTO} characters at most.`);
  const f = revisarTexto(t);
  if (f) return f;
  if (p.topic && !TEMAS.some((x) => x[0] === p.topic)) return falla("tema", "Ese tema no existe.", "That topic does not exist.");
  if (p.kind === "encuesta") {
    const o = (p.opts ?? []).map((x) => String(x ?? "").trim()).filter(Boolean);
    if (o.length < 2) return falla("opciones", "Pon al menos 2 opciones.", "Add at least 2 options.");
    if (o.length > 4) return falla("opciones", "Máximo 4 opciones.", "4 options at most.");
    if (o.some((x) => x.length > MAX_OPCION)) return falla("opciones", `Cada opción, máximo ${MAX_OPCION} letras.`, `Each option, ${MAX_OPCION} characters at most.`);
    if (new Set(o.map((x) => x.toLowerCase())).size !== o.length) return falla("opciones", "Hay dos opciones iguales.", "Two options are the same.");
    for (const x of o) { const e = revisarTexto(x, "opciones"); if (e) return e; }
    if (dias && !dias.includes(Number(p.dias))) return falla("dias", `Elige cuánto dura: ${listaDias(dias, true)} días.`, `Choose how long it runs: ${listaDias(dias, false)} days.`);
    if ((p.fotos ?? []).length) return falla("fotos", "Las encuestas van sin fotos.", "Polls go without photos.");
  }
  if (p.kind === "recomendacion") {
    if (!p.noEsMio) return falla("negocio", "Confirma que no es tu negocio.", "Confirm it is not your business.");
    const para = (p.para ?? []).map((x) => String(x ?? "").trim()).filter(Boolean);
    if (para.length > 3 || para.some((x) => x.length > MAX_PARA)) return falla("para", "Máximo 3, cortos.", "Up to 3, short.");
    for (const x of para) { const e = revisarTexto(x, "para"); if (e) return e; }
  }
  if ((p.fotos ?? []).length > MAX_FOTOS) return falla("fotos", `Hasta ${MAX_FOTOS} fotos.`, `Up to ${MAX_FOTOS} photos.`);
  return null;
}

/* Un comentario o una respuesta (5b): texto de hasta 600 letras, o solo el negocio que recomienda; mismas reglas que una publicación. */
export function revisarComentario(c: { body: string; business?: string | null }): Falla | null {
  const t = String(c.body ?? "").trim();
  if (!t && !c.business) return falla("texto", "Escribe algo o recomienda un negocio.", "Write something or recommend a business.");
  if (t.length > MAX_COMENTARIO) return falla("texto", `Máximo ${MAX_COMENTARIO} letras.`, `${MAX_COMENTARIO} characters at most.`);
  return t ? revisarTexto(t) : null;
}

/* 5c · Un mensaje a un vecino: solo texto (1–1000), con las mismas reglas que lo que se publica (sin teléfonos, correos ni números
   privados; sin direcciones exactas). El teléfono también se rechaza en la base (dm_messages_body_datos). */
export const MAX_MENSAJE = 1000;
export function revisarMensaje(texto: string): Falla | null {
  const t = String(texto ?? "").trim();
  if (!t) return falla("texto", "Escribe tu mensaje.", "Type your message.");
  if (t.length > MAX_MENSAJE) return falla("texto", `Máximo ${MAX_MENSAJE} letras.`, `${MAX_MENSAJE} characters at most.`);
  const f = revisarTexto(t);
  if (f && TEL.test(t)) return falla("texto", "Por seguridad, sin teléfonos en los mensajes.", "For your safety, no phone numbers in messages.");
  return f;
}

/* 5c · Lo que la persona escribe de sí en su perfil: bio (≤ 160) y cómo le dicen (≤ 20). Mismas reglas. */
export const MAX_BIO = 160, MAX_APODO = 20;
export function revisarPerfil(p: { bio?: string | null; apodo?: string | null }): Falla | null {
  const bio = String(p.bio ?? "").trim(), apodo = String(p.apodo ?? "").trim();
  if (bio.length > MAX_BIO) return falla("texto", `Tu presentación, máximo ${MAX_BIO} letras.`, `Your intro, ${MAX_BIO} characters at most.`);
  if (apodo.length > MAX_APODO) return falla("texto", `Cómo te dicen, máximo ${MAX_APODO} letras.`, `What people call you, ${MAX_APODO} characters at most.`);
  return (bio ? revisarTexto(bio) : null) ?? (apodo ? revisarTexto(apodo) : null) ?? (/\d{3,}|@|https?:|www\./i.test(apodo) ? falla("texto", "Cómo te dicen: sin números, correos ni enlaces.", "What people call you: no numbers, emails or links.") : null);
}
