import "server-only";
import sharp from "sharp";
import { db } from "./db";
import { borrarObjeto, existeObjeto, guardarObjeto, leerObjeto, mediosListos } from "./medios";

/* Fotos a la medida (decisión AI, 20 nov; docs/diseno/plan/fotos-a-la-medida.md, F1). De cada foto pública (la maestra JPEG n/<uuid>.jpg, que
   no cambia) salen variantes WebP con pérdida en anchos fijos, con nombre fijo: n/<uuid>.w<ancho>.webp → /medios/n/<uuid>.w<ancho>.webp. Quien
   pinta una foto arma el nombre solo (sin consultar la base). Si una variante no existe, o el navegador no acepta WebP, nginx entrega la maestra en
   esa misma dirección con caché corta (nginx-pruebas.conf y nginx-produccion.conf): nunca una foto rota.
   - Anchos: 320, 640, 1080 y 1600, solo los que caben en la maestra (nunca se agranda), más uno exactamente del ancho de la maestra cuando es más
     angosta que el siguiente: la variante más grande siempre mide lo que la maestra.
   - WebP calidad 80, esfuerzo 4, sin metadatos (sharp no copia EXIF, GPS ni perfiles salvo que se le pida: aquí nunca se le pide).
   - Al subir (app/api/medios) se generan en el mismo pedido; un fallo NO tumba la subida (la maestra ya vale): no se anota nada y el barrido lo
     repara. Las fotos de antes las convierte el barrido (fotosVariantes), por tandas. Lo anotado (media.bytes, var_widths, var_bytes, var_at;
     0195) lo escribe solo este archivo. Guardián fotosConVariantes; pruebas fot9u (punta a punta), fotos9uvariantes (variantesDe) y
     pruebas/infra/medios-nginx.test.sh (el respaldo en nginx). */
export const ANCHOS = [320, 640, 1080, 1600] as const;
export const CALIDAD_WEBP = 80;
const MAX = 1600; // el ancho más grande de ANCHOS (y el de la maestra reducida en app/api/medios)
// La tanda del barrido y su tope de tiempo: ~0,2 s por foto → 20 fotos caben de sobra en un minuto sin frenar a las demás tareas.
export const TANDA = 20;
const PRESUPUESTO_MS = 20_000;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const MAESTRA = new RegExp(`^n/(${UUID})\\.jpg$`);

export const claveVariante = (uuid: string, ancho: number) => `n/${uuid}.w${ancho}.webp`;

/* Los anchos que salen de una maestra de `ancho` px: los fijos que caben, más el de la maestra si es más angosta que el siguiente fijo. */
export function anchosDe(ancho: number): number[] {
  const w = Math.floor(ancho);
  if (!Number.isFinite(w) || w < 1) return [];
  const out: number[] = ANCHOS.filter((a) => a <= w);
  if (w < MAX && !out.includes(w)) out.push(w);
  return out;
}

/* Pura: las variantes WebP de una maestra (el buffer y su ancho real). No guarda nada. */
export async function variantesDe(maestra: Buffer, anchoMaestra: number): Promise<{ width: number; buffer: Buffer }[]> {
  return Promise.all(anchosDe(anchoMaestra).map(async (width) => ({
    width,
    buffer: await sharp(maestra, { limitInputPixels: 50_000_000 }).resize({ width, withoutEnlargement: true }).webp({ quality: CALIDAD_WEBP, effort: 4 }).toBuffer(),
  })));
}

/* Todas las llaves de variantes que pueden existir de una maestra (la purga de una cuenta las saca junto con la maestra). F3: también las de una
   foto de destino privado (privado/o/<uuid>.jpg → privado/o/<uuid>.w<ancho>.webp; lib/fotos-privadas.ts) y, F3b, las de las otras rutas privadas
   (Mensajes privado/m/, ayuda privado/a/, entrega privado/e/, reclamo privado/r/), con su variante al lado de su maestra. */
const MAESTRA_PRIVADA = new RegExp(`^privado/([oamer])/(${UUID})\\.jpg$`);
export function clavesVariantes(claveMaestra: string, ancho?: number | null, hechos?: number[] | null): string[] {
  const m = MAESTRA.exec(claveMaestra), p = MAESTRA_PRIVADA.exec(claveMaestra);
  if (!m && !p) return [];
  const ws = new Set<number>([...ANCHOS, ...(hechos ?? [])]);
  if (ancho && ancho > 0 && ancho < MAX) ws.add(Math.floor(ancho));
  return [...ws].sort((a, b) => a - b).map((w) => (m ? claveVariante(m[1]!, w) : `privado/${p![1]}/${p![2]}.w${w}.webp`));
}

type Resultado = "ok" | "ilegible" | "sin_maestra" | "fallo";
/* Genera, guarda (caché de un año: guardarObjeto la pone a toda llave pública) y anota en la fila (o filas: el original y una copia). Nunca
   lanza. Después de guardar se confirma que la maestra sigue: si la purga de la cuenta la sacó mientras tanto, las variantes también salen
   (la purga borra primero la maestra y después las variantes; así ninguna sobrevive). */
export async function guardarVariantes(uuid: string, maestra: Buffer, anchoMaestra?: number | null, filas: string[] = [uuid]): Promise<Resultado> {
  let vs: { width: number; buffer: Buffer }[];
  try {
    const ancho = anchoMaestra ?? (await sharp(maestra, { limitInputPixels: 50_000_000 }).metadata()).width ?? 0;
    vs = await variantesDe(maestra, ancho);
    if (!vs.length) return "ilegible";
  } catch { return "ilegible"; }
  try {
    await Promise.all(vs.map((v) => guardarObjeto(claveVariante(uuid, v.width), v.buffer, "image/webp")));
    if (!(await existeObjeto(`n/${uuid}.jpg`))) {
      await Promise.all(vs.map((v) => borrarObjeto(claveVariante(uuid, v.width)).catch(() => undefined)));
      return "sin_maestra";
    }
    await db().query(`update media set bytes = $2, var_widths = $3::smallint[], var_bytes = $4::int[], var_at = now() where id = any($1::uuid[])`,
      [filas, maestra.length, vs.map((v) => v.width), vs.map((v) => v.buffer.length)]);
    return "ok";
  } catch { return "fallo"; }
}

/* La maestra ya no está o no se puede leer: se anota sin variantes ('{}') para no reintentarla cada minuto. */
async function sinVariantes(filas: string[]) {
  await db().query(`update media set var_widths = '{}', var_bytes = '{}', var_at = now() where id = any($1::uuid[]) and var_at is null`, [filas]);
}

/* El barrido (cada minuto, en lib/barrido.ts): una tanda de fotos públicas de NUESTRO almacén sin variantes. Las de afuera (la semilla usa
   Pexels) no se tocan. Idempotente (mismo nombre, mismo contenido) y sin pisarse con una subida: solo toma las que tienen más de 2 minutos (la
   subida genera las suyas en el mismo pedido). Una copia de otra fila (Repetir evento, foto de la galería en una novedad) toma lo anotado del
   original si ya está. Un error del almacén deja la foto para la próxima vuelta; una maestra que ya no está o no se puede leer queda con '{}'. */
export async function barrerVariantes(): Promise<{ hechas: number; copiadas: number; sinMaestra: number; fallos: number }> {
  const out = { hechas: 0, copiadas: 0, sinMaestra: 0, fallos: 0 };
  if (!mediosListos()) return out;
  const t0 = Date.now();
  const r = await db().query<{ id: string; url: string }>(
    `select id::text, url from media
      where var_at is null and status = 'visible' and purged_at is null and url like '/medios/n/%.jpg' and created_at < now() - interval '2 minutes'
      order by created_at limit ${TANDA}`);
  for (const m of r.rows) {
    if (Date.now() - t0 > PRESUPUESTO_MS) break;
    const clave = m.url.replace(/^\/medios\//, ""), u = MAESTRA.exec(clave);
    if (!u) { await sinVariantes([m.id]); out.sinMaestra++; continue; }
    const uuid = u[1]!;
    if (uuid !== m.id) {
      const c = await db().query(`update media c set bytes = o.bytes, var_widths = o.var_widths, var_bytes = o.var_bytes, var_at = o.var_at
                                    from media o where c.id = $1::uuid and o.id = $2::uuid and o.var_at is not null and c.var_at is null`, [m.id, uuid]);
      if (c.rowCount) { out.copiadas++; continue; }
    }
    // El original (si existe y es otra fila) queda anotado junto con esta.
    const filas = uuid === m.id ? [m.id] : [m.id, uuid];
    let maestra: Buffer;
    try { maestra = await leerObjeto(clave); }
    catch (e) {
      if (/^almacenamiento 404\b/.test(String((e as Error)?.message ?? e))) { await sinVariantes(filas); out.sinMaestra++; } else out.fallos++;
      continue;
    }
    const x = await guardarVariantes(uuid, maestra, null, filas);
    if (x === "ok") out.hechas++;
    else if (x === "fallo") out.fallos++;
    else { await sinVariantes(filas); out.sinMaestra++; }
  }
  return out;
}

/* Cifras para el Super Admin (la pantalla es de F4). El universo: las fotos públicas de nuestro almacén que se ven (visibles, sin purgar), una
   por archivo: una copia comparte el archivo de su original y no se cuenta dos veces (la fila original es la que tiene el id del nombre).
   Ahorro estimado: lo que baja una caja de 640 px (320 de ancho en una pantalla de alta densidad, como una tarjeta), por foto convertida: la
   maestra contra la variante que esa caja pide (la más angosta de ≥ 640; si la foto es más chica, la más grande). Por eso se guarda el peso de
   cada ancho (var_bytes en el orden de var_widths) y no solo la suma. Una foto de ≥ 640 px siempre tiene la de 640 (anchosDe); una más chica
   da su variante más grande (la última). Como mucho hay 4 variantes por foto (los 4 anchos fijos, o los que caben más el de la maestra), por eso
   la suma va por posición, sin unnest: una pasada por las filas públicas, ~125 ms con 200 mil fotos (base local, 20 nov); F4 la pide a demanda. */
export type CifrasFotos = {
  publicas: number; convertidas: number; pendientes: number; sinMaestra: number;
  bytesMaestras: number; bytesVariantes: number;
  vista640: { maestras: number; variantes: number; ahorro: number };
};
export async function cifrasFotos(): Promise<CifrasFotos> {
  const r = (await db().query<{ publicas: number; convertidas: number; pendientes: number; sin_maestra: number; bytes_maestras: number; bytes_variantes: number; m640: number; v640: number }>(
    `select count(*)::int as publicas,
            count(*) filter (where cardinality(var_widths) > 0)::int as convertidas,
            count(*) filter (where var_at is null)::int as pendientes,
            count(*) filter (where var_widths = '{}')::int as sin_maestra,
            coalesce(sum(bytes), 0)::float8 as bytes_maestras,
            coalesce(sum(coalesce(var_bytes[1], 0) + coalesce(var_bytes[2], 0) + coalesce(var_bytes[3], 0) + coalesce(var_bytes[4], 0)), 0)::float8 as bytes_variantes,
            coalesce(sum(bytes) filter (where cardinality(var_widths) > 0), 0)::float8 as m640,
            coalesce(sum(coalesce(var_bytes[array_position(var_widths, 640::smallint)], var_bytes[cardinality(var_bytes)])) filter (where cardinality(var_widths) > 0), 0)::float8 as v640
       from media
      where status = 'visible' and purged_at is null and url like '/medios/n/%.jpg' and url = '/medios/n/' || id::text || '.jpg'`)).rows[0]!;
  return {
    publicas: r.publicas, convertidas: r.convertidas, pendientes: r.pendientes, sinMaestra: r.sin_maestra,
    bytesMaestras: r.bytes_maestras, bytesVariantes: r.bytes_variantes,
    vista640: { maestras: r.m640, variantes: r.v640, ahorro: r.m640 > 0 ? Math.round((1 - r.v640 / r.m640) * 1000) / 1000 : 0 },
  };
}
