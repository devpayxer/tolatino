import "server-only";

/* 5h · Cliente del traductor PROPIO (servicio `traductor` del compose: LibreTranslate autoalojado con los modelos Argos ES↔EN; §4 5h).
   El texto de los vecinos nunca sale de nuestros servidores (guardián traduccionPropia): la única dirección es TRADUCTOR_URL, que
   apunta al servicio por la red interna (http://traductor:5000); no hay otra. Si falta, no hay traducción (nunca un tercero).
   - Límite de 3 s por traducción (1.5 s para detectar el idioma al publicar: publicar no espera al traductor).
   - Corta-circuito: 5 fallas seguidas → 60 s sin llamarlo (abierto); luego deja pasar una prueba (medio abierto): si falla, otros
     60 s; si responde, se cierra. Mientras está abierto, «Ver traducción» dice «La traducción no está disponible ahora.» al instante
     y publicar usa el idioma de la app. Vive en la memoria de cada proceso de la app.
   - Nada inventado: si el servicio no responde o responde algo raro, es una falla, no un texto. */
import type { LangTr } from "./traduccion-comun";

export const MOTOR = "libretranslate";
export const LIMITE_MS = 3000, LIMITE_DETECTAR_MS = 1500, FALLAS_PARA_CORTAR = 5, CORTE_MS = 60_000;
const base = () => (process.env.TRADUCTOR_URL ?? "").replace(/\/+$/, "");

const corta = { fallas: 0, abiertoHasta: 0, medio: false };
export class SinTraductor extends Error {}

function falla() {
  if (corta.medio || ++corta.fallas >= FALLAS_PARA_CORTAR) { corta.abiertoHasta = Date.now() + CORTE_MS; corta.fallas = 0; }
  corta.medio = false;
}

async function llamar(ruta: "/translate" | "/detect", cuerpo: Record<string, string>, ms: number): Promise<unknown> {
  const b = base();
  if (!b) throw new SinTraductor("sin TRADUCTOR_URL");
  if (corta.abiertoHasta) {
    if (Date.now() < corta.abiertoHasta) throw new SinTraductor("corta-circuito abierto");
    corta.abiertoHasta = 0; corta.medio = true; // pasó el minuto: una prueba
  }
  try {
    const r = await fetch(b + ruta, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(ms), cache: "no-store" });
    if (!r.ok) throw new Error(`traductor ${r.status}`);
    const j = (await r.json()) as unknown;
    corta.fallas = 0; corta.medio = false;
    return j;
  } catch {
    falla();
    throw new SinTraductor("el traductor no respondió");
  }
}

/* Traduce un texto de un idioma al otro. Devuelve el texto y cuánto tardó; si no se puede, lanza SinTraductor. */
export async function traducirTexto(texto: string, de: LangTr, a: LangTr): Promise<{ texto: string; ms: number }> {
  const t0 = Date.now();
  const j = (await llamar("/translate", { q: texto, source: de, target: a, format: "text" }, LIMITE_MS)) as { translatedText?: unknown } | null;
  const out = typeof j?.translatedText === "string" ? j.translatedText.trim() : "";
  if (!out) { falla(); throw new SinTraductor("respuesta vacía"); }
  return { texto: out.slice(0, 4000), ms: Date.now() - t0 };
}

/* El idioma de un texto al publicar: el /detect del servicio (español o inglés con confianza ≥ 50). null = no se sabe (texto muy corto,
   otro idioma, poca confianza o el servicio no responde): quien llama usa el idioma de la app de quien escribe. Se llama ANTES de abrir
   la transacción (publicar nunca retiene la base esperando al traductor). */
export async function detectarIdioma(texto: string): Promise<LangTr | null> {
  const t = String(texto ?? "").trim();
  if (t.replace(/[^\p{L}]/gu, "").length < 12) return null;
  try {
    const j = (await llamar("/detect", { q: t.slice(0, 1000) }, LIMITE_DETECTAR_MS)) as { language?: unknown; confidence?: unknown }[] | null;
    const m = Array.isArray(j) ? j[0] : null;
    const l = m?.language, c = Number(m?.confidence);
    return (l === "es" || l === "en") && c >= 50 ? l : null;
  } catch {
    return null;
  }
}
/* El idioma que se guarda: el detectado o, si no se sabe, el de la app de quien escribe. */
export const idiomaTexto = (detectado: LangTr | null, app: string | null | undefined): LangTr => detectado ?? (app === "en" ? "en" : "es");

/* Para el Super Admin: ¿responde? (2 s, sin tocar el corta-circuito). Nunca un «sí» sin haber preguntado. */
export async function saludTraductor(): Promise<{ configurado: boolean; ok: boolean; ms: number | null; idiomas: string[]; cortado: boolean }> {
  const b = base(), cortado = Date.now() < corta.abiertoHasta;
  if (!b) return { configurado: false, ok: false, ms: null, idiomas: [], cortado };
  const t0 = Date.now();
  try {
    const r = await fetch(b + "/languages", { signal: AbortSignal.timeout(2000), cache: "no-store" });
    const j = (await r.json().catch(() => null)) as { code?: string }[] | null;
    const idiomas = Array.isArray(j) ? j.map((x) => String(x?.code ?? "")).filter(Boolean) : [];
    return { configurado: true, ok: r.ok && idiomas.includes("es") && idiomas.includes("en"), ms: Date.now() - t0, idiomas, cortado };
  } catch {
    return { configurado: true, ok: false, ms: null, idiomas: [], cortado };
  }
}
