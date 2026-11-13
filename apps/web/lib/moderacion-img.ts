import "server-only";
import { estadoCorte, resultadoCorte } from "./topes";

/* 5d · Cliente del servicio propio de moderación de imágenes (services/moderacion-img; regla `img`). Solo la red interna
   (MODERACION_IMG_URL). Nunca bloquea una subida: 3 s de límite y, si falla, corta 30 s sin volver a intentar (corta-circuito, compartido
   entre los procesos de la app desde 9b-3: lib/topes.ts; pasado el corte, un solo proceso prueba).
   Si no responde, el resultado es «sin_servicio» y la foto se queda en revisión manual (cerrado, nunca abierto: nada se publica
   sin revisar). La prueba de la app usa un servicio de mentira solo en pruebas; aquí no hay resultados inventados. */
export type ResultadoImg = { estado: "ok" | "marcada" | "sin_servicio"; desnudez: number | null; ms: number | null };
const URL_SVC = () => (process.env.MODERACION_IMG_URL ?? "").replace(/\/+$/, "");
const CORTE_MS = 30_000;

export async function revisarImagen(datos: Buffer, umbral: number): Promise<ResultadoImg> {
  const base = URL_SVC();
  if (!base || (await estadoCorte("moderacion_img", CORTE_MS)) === "abierto") return { estado: "sin_servicio", desnudez: null, ms: null };
  try {
    const r = await fetch(`${base}/clasificar`, { method: "POST", body: new Uint8Array(datos), headers: { "content-type": "application/octet-stream" }, signal: AbortSignal.timeout(3000) });
    const j = (await r.json().catch(() => null)) as { ok?: boolean; desnudez?: number; ms?: number } | null;
    if (!r.ok || !j?.ok || typeof j.desnudez !== "number") throw new Error(`servicio ${r.status}`);
    await resultadoCorte("moderacion_img", true, 1);
    return { estado: j.desnudez >= umbral ? "marcada" : "ok", desnudez: j.desnudez, ms: j.ms ?? null };
  } catch {
    await resultadoCorte("moderacion_img", false, 1);
    return { estado: "sin_servicio", desnudez: null, ms: null };
  }
}

/* Para el Super Admin: ¿responde? (2 s). Nunca un «sí» sin haber preguntado. */
export async function saludImagen(): Promise<{ ok: boolean; modelo: string | null; licencia: string | null; ms: number | null; configurado: boolean }> {
  const base = URL_SVC();
  if (!base) return { ok: false, modelo: null, licencia: null, ms: null, configurado: false };
  const t = Date.now();
  try {
    const r = await fetch(`${base}/salud`, { signal: AbortSignal.timeout(2000), cache: "no-store" });
    const j = (await r.json().catch(() => null)) as { ok?: boolean; modelo?: string; licencia?: string } | null;
    return { ok: r.ok && !!j?.ok, modelo: j?.modelo ?? null, licencia: j?.licencia ?? null, ms: Date.now() - t, configurado: true };
  } catch {
    return { ok: false, modelo: null, licencia: null, ms: null, configurado: true };
  }
}
