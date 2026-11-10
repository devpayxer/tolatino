import "server-only";
import { bloques, ErrorModelo, ESQUEMA, type Entrada, type Modelo, type Salida, type UsoTokens } from "./modelo";

/* 7c · El Compa con Claude (Anthropic Messages API). ÚNICO archivo que habla con el proveedor, nombra su dirección y lee la clave
   (guardianes compaUnSoloProveedor y compaSoloServidor). Sin SDK, como lib/pagos/stripe.ts: una petición fija, versión de la API fija y nada
   más que lo que aquí se escribe (ninguna dependencia nueva).
   - Salida con esquema JSON (output_config.format) y esfuerzo bajo (respuestas cortas: cuesta menos y contesta antes).
   - Sin herramientas, sin búsqueda web, sin memoria entre llamadas: el modelo solo ve lo que manda esta petición.
   - inference_geo «us» (el precio con su recargo vive en compa_models.geo_pct).
   - Caché de prompt en el sistema fijo (lo estable primero); los datos, la ayuda y los mensajes van después, en un solo mensaje de la
     persona, marcados como DATOS. Nunca se manda un turno «assistant» inventado: el historial viaja como dato.
   - Tiempo máximo = compa_espera_ms (AbortSignal); sin reintentos (pasado el tiempo contestan las reglas fijas).
   - La clave nunca se escribe en un registro ni en un error: los errores dicen solo el estado HTTP y el tipo. */
const URL_API = "https://api.anthropic.com/v1/messages";
const VERSION_API = "2026-10-21";

type Respuesta = {
  stop_reason?: string; content?: { type: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
  error?: { type?: string };
};

/* ¿Hay llave? (sin decir cuál). */
export const hayClave = () => !!process.env.ANTHROPIC_API_KEY;

export const claude: Modelo = {
  motor: "claude",
  async responder(e: Entrada): Promise<Salida> {
    const clave = process.env.ANTHROPIC_API_KEY;
    if (!clave) throw new ErrorModelo("error", false, "sin clave");
    const cuerpo = {
      model: e.modelo,
      max_tokens: e.maxTokens,
      system: [{ type: "text", text: e.sistema, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: bloques(e).map((text) => ({ type: "text", text })) }],
      output_config: { format: { type: "json_schema", schema: ESQUEMA }, effort: "low" },
      inference_geo: "us",
    };
    let r: Response;
    try {
      r = await fetch(URL_API, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": VERSION_API },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(e.esperaMs),
        cache: "no-store",
      });
    } catch (err) {
      const t = (err as Error)?.name === "TimeoutError" || (err as Error)?.name === "AbortError";
      // Tiempo agotado o red caída: no sabemos si el proveedor cobró → se anota lo reservado.
      throw new ErrorModelo(t ? "timeout" : "error", true, t ? "tiempo agotado" : "sin conexión con el proveedor");
    }
    let j: Respuesta = {};
    try { j = (await r.json()) as Respuesta; } catch { j = {}; }
    if (!r.ok) throw new ErrorModelo("error", false, `proveedor ${r.status} ${String(j.error?.type ?? "").slice(0, 40)}`);
    const tokens: UsoTokens = {
      entrada: Number(j.usage?.input_tokens ?? 0), salida: Number(j.usage?.output_tokens ?? 0),
      cacheLeida: Number(j.usage?.cache_read_input_tokens ?? 0), cacheEscrita: Number(j.usage?.cache_creation_input_tokens ?? 0),
    };
    if (j.stop_reason === "refusal") throw new ErrorModelo("refusal", false, "el modelo no contestó", tokens);
    if (j.stop_reason === "max_tokens") throw new ErrorModelo("invalid", false, "respuesta cortada", tokens);
    const texto = (j.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    let json: unknown;
    try { json = JSON.parse(texto); } catch { throw new ErrorModelo("invalid", false, "la salida no es JSON", tokens); }
    return { json, tokens, motor: "claude", modelo: e.modelo };
  },
};
