import "server-only";
import sharp from "sharp";
import { db } from "./db";
import { ErrorModelo, modelo, motorActivo, type Salida } from "@/lib/compa/modelo";
import { modeloDe } from "@/lib/compa/tope";
import { ESQUEMA_FOTO, PAUTA, type Segunda } from "./fotos-decision";

/* Revisión automática de las fotos públicas (decisión AJ) · CAPA 2, la segunda opinión: Claude con visión, por la MISMA interfaz `Modelo` de
   El Compa (misma llave del entorno, que solo lee lib/compa/modelo-claude.ts; el simulador en las pruebas y en el sandbox sin llave; en
   producción sin llave no hay segunda opinión y la foto queda retenida). Solo la llaman la subida pública, el barrido de la revisión y la capa 3
   (guardián fotosRevisionPrivacidad: nadie más importa este archivo).
   Privacidad (lo que no se rompe):
   - Solo fotos DESTINADAS A LO PÚBLICO: aquí mismo se rechaza una foto marcada privada, de Mensajes, de ayuda, de la entrega o de un reclamo, o
     cuya llave no es la pública (n/) o la de revisión (privado/rev/). Con una fila, se vuelve a leer de la base (no se confía en quien llama).
   - Ni una foto que va solo a un negocio o al equipo (destino «privado» al subirla: sinC2 sin fila, media.rev_sin_c2 con fila), aunque su
     dirección sea de n/: solicitudes, citas, estimados, viajes, la balanza o el daño de una renta.
   - A Claude va solo la imagen reducida (≤ 640 px, JPEG, sin metadatos) y la pauta fija. Nada de quién la subió, ni negocio, ni ciudad.
   Tope y gasto, como El Compa: gastar() reserva en la base el máximo ANTES de llamar (foto2_reservar, contra el tope de la regla foto2);
   anotarUso() liquida DESPUÉS con los tokens que devolvió el proveedor (foto2_anotar), en el camino del error y en el de la respuesta. El costo
   y los tokens van además al libro de veredictos (photo_reviews) con el veredicto. Tiempo límite corto (la regla foto2, 8 s por defecto). */

/* Lo que nunca sale de casa: dueños de fotos privadas (Mensajes, ayuda, entrega, reclamo, soporte) y las llaves privadas que no son la de revisión. */
export const DUENOS_PRIVADOS = ["chat", "dm", "help", "support", "claim", "delivery", "appointment", "estimate_line", "request", "line", "trip"] as const;
const LLAVE_PUBLICA = /^(n\/|privado\/rev\/)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;
export type FotoPublica = { mediaId: string | null; llave: string; privada: boolean; dueno: string; sinC2: boolean };
export type ResultadoSegunda = Segunda & { modelo: string | null; costo: number; tokens: { entrada: number; salida: number }; ms: number };

/* La foto es pública por destino (lo comprueba aquí; con fila, desde la base). */
export async function esPublica(f: FotoPublica): Promise<boolean> {
  if (f.privada || f.sinC2 || (DUENOS_PRIVADOS as readonly string[]).includes(f.dueno) || !LLAVE_PUBLICA.test(f.llave)) return false;
  if (!f.mediaId) return f.dueno === "user";   // una subida pública que todavía no tiene fila: es de quien la sube
  const r = (await db().query<{ private: boolean; owner_kind: string; url: string; rev_llave: string | null; rev_sin_c2: boolean }>(
    `select private, owner_kind, url, rev_llave, rev_sin_c2 from media where id = $1::uuid`, [f.mediaId])).rows[0];
  if (!r || r.private || r.rev_sin_c2 || (DUENOS_PRIVADOS as readonly string[]).includes(r.owner_kind)) return false;
  return r.rev_llave === f.llave || r.url === `/medios/${f.llave}`;
}

const conTiempo = <T>(p: Promise<T>, ms: number): Promise<T> => {
  let t: ReturnType<typeof setTimeout>;
  return Promise.race([p, new Promise<T>((_, no) => { t = setTimeout(() => no(new ErrorModelo("timeout", true, "tiempo agotado")), ms); })]).finally(() => clearTimeout(t));
};

/* El tope (la regla foto2 vive en mod_rules; quien llama ya miró que está encendida). */
async function gastar(modeloId: string, entradaMax: number, salidaMax: number): Promise<string | null> {
  return (await db().query<{ id: string | null }>(`select foto2_reservar($1, $2, $3)::text as id`, [modeloId, Math.ceil(entradaMax), Math.ceil(salidaMax)])).rows[0]?.id ?? null;
}
async function anotarUso(a: { reserva: string; modelo: string; tokens?: { entrada: number; salida: number }; cobrarReservado?: boolean }): Promise<number> {
  const t = a.tokens ?? { entrada: 0, salida: 0 };
  return Number((await db().query<{ c: string }>(`select foto2_anotar($1::uuid, $2, $3, $4, $5)::text as c`,
    [a.reserva, a.modelo, Math.max(0, Math.round(t.entrada)), Math.max(0, Math.round(t.salida)), !!a.cobrarReservado])).rows[0]?.c ?? 0);
}

/* La imagen que ve el modelo: ≤ 640 px por lado, JPEG, sin metadatos (sharp no los copia). */
export async function reducida(datos: Buffer): Promise<Buffer> {
  return sharp(datos, { limitInputPixels: 50_000_000 }).rotate().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
}

export const SALIDA_MAX = 60;
export async function segundaOpinion(f: FotoPublica, datos: Buffer, o: { esperaMs: number }): Promise<ResultadoSegunda> {
  const nada = { modelo: null, costo: 0, tokens: { entrada: 0, salida: 0 }, ms: 0 };
  // Nunca una foto privada: ni siquiera se lee la imagen.
  if (!(await esPublica(f))) throw new Error("segunda opinión: solo fotos destinadas a lo público");
  const motor = motorActivo(), m = await modelo(motor);
  if (!m) return { estado: "sin_respuesta", ...nada };   // producción sin llave: no hay segunda opinión (la foto queda retenida)
  const id = motor === "simulador" ? "simulador" : await modeloDe("neighbor");   // el modelo cotidiano de El Compa (Configuración › El Compa)
  if (!id) return { estado: "sin_respuesta", ...nada };
  let img: Buffer;
  try { img = await reducida(datos); } catch { return { estado: "sin_respuesta", ...nada }; }
  // Una imagen de 640 px son ~550 tokens; la pauta, ~350: se reserva de sobra.
  const reserva = await gastar(id, 1600, SALIDA_MAX);
  if (!reserva) return { estado: "sin_presupuesto", ...nada, modelo: id };
  const t0 = Date.now();
  let sal: Salida;
  try {
    sal = await conTiempo(m.responder({ uso: "foto", modelo: id, lang: "es", sistema: PAUTA, datos: {}, trozos: [], mensajes: [{ de: "persona", texto: "Revisa la foto con la pauta." }],
      maxTokens: SALIDA_MAX, esperaMs: o.esperaMs, esquema: ESQUEMA_FOTO as unknown as Record<string, unknown>, imagen: { tipo: "image/jpeg", base64: img.toString("base64") } }), o.esperaMs);
  } catch (e) {
    const err = e instanceof ErrorModelo ? e : new ErrorModelo("error", false, "error");
    const costo = await anotarUso({ reserva, modelo: id, tokens: err.tokens ? { entrada: err.tokens.entrada, salida: err.tokens.salida } : undefined, cobrarReservado: err.cobrar && !err.tokens });
    return { estado: "sin_respuesta", modelo: id, costo, tokens: { entrada: err.tokens?.entrada ?? 0, salida: err.tokens?.salida ?? 0 }, ms: Date.now() - t0 };
  }
  const costo = await anotarUso({ reserva, modelo: id, tokens: sal.tokens });
  return { estado: "respuesta", json: sal.json, modelo: sal.modelo, costo, tokens: { entrada: sal.tokens.entrada, salida: sal.tokens.salida }, ms: Date.now() - t0 };
}
