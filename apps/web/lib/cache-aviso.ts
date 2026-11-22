import "server-only";
import { alCambiarConfig } from "./cambios-config";

/* 22 nov (LAUNCH «Caché de Configuración, del producto») · La ÚNICA forma de guardar en la memoria del proceso algo que el Super Admin cambia y la base
   avisa (NOTIFY tl_config / ciudades, lib/cambios-config.ts): Configuración, interruptores, ciudades, cadenas, reglas y términos de moderación, sinónimos…
   La carrera que cierra: una lectura sale ANTES de un cambio (su consulta ve el valor viejo), el cambio se confirma, llega el aviso y la copia se olvida;
   DESPUÉS vuelve la lectura y, sin esto, guardaba el valor viejo como copia nueva: se servía viejo hasta que vencía (15–60 s) aunque el aviso ya había
   llegado. Aquí cada aviso (y cada olvidar() a mano, la escritura del propio proceso) sube la GENERACIÓN; quien vuelve de la base solo guarda si la
   generación es la misma con la que salió. Si cambió, devuelve lo que leyó (es de antes del cambio, como cualquier lectura que empezó antes) y no lo guarda:
   la siguiente lectura va a la base. Sin carrera nada cambia: la misma copia, el mismo vencimiento (ttlMs desde que vuelve la consulta) y ninguna consulta
   de más. Guardián cacheConGeneracion (al revés: alrevesCacheGen); prueba: pruebas/e2e/cachegen9t.cjs.
   - ttlMs: cuánto vale la copia (el respaldo si la escucha se corta).
   - clave: una copia por clave (p. ej. por ciudad); sin ella, una sola. El aviso olvida todas.
   - siFalla: si la base no respondió, este valor, que se vuelve a intentar a los reintentoMs (2 s): la pantalla no se corta y no se queda con un vacío de 15 s.
     Sin siFalla, el error sube a quien llamó y no se guarda nada.
   - juntar: las lecturas a la vez de la MISMA generación comparten la consulta; después de un aviso, la nueva no se junta con la que salió antes.
   - alGuardar: se llama con lo que se guarda (y solo si se guarda): lo que se copia además a otro lado (las ediciones de las pantallas, dos-idiomas.ts).
   - releer: al llegar el aviso se vuelve a leer al momento (una copia sin argumentos que otro lado necesita lista antes de pintar).
   La escucha se pide en la primera lectura (nunca al importar: el build no se queda esperando). */
export type OpcionesCache<A extends unknown[], V> = {
  ttlMs: number;
  cargar: (...a: A) => Promise<V>;
  clave?: (...a: A) => string;
  siFalla?: (e: unknown) => V;
  reintentoMs?: number;
  juntar?: boolean;
  alGuardar?: (v: V) => void;
  releer?: boolean;
};
export type CacheAviso<A extends unknown[], V> = { leer: (...a: A) => Promise<V>; olvidar: () => void };

export function cacheConAviso<A extends unknown[], V>(o: OpcionesCache<A, V>): CacheAviso<A, V> {
  const copias = new Map<string, { hasta: number; v: V }>();
  const enVuelo = new Map<string, { gen: number; p: Promise<V> }>();
  let gen = 0, escucha = false;
  const olvidar = () => { gen++; copias.clear(); enVuelo.clear(); };
  async function traer(k: string, a: A): Promise<V> {
    const g = gen;
    let v: V, ms = o.ttlMs;
    try { v = await o.cargar(...a); }
    catch (e) { if (!o.siFalla) throw e; v = o.siFalla(e); ms = o.reintentoMs ?? 2_000; }
    if (g === gen) { copias.set(k, { hasta: Date.now() + ms, v }); o.alGuardar?.(v); }
    return v;
  }
  function leer(...a: A): Promise<V> {
    if (!escucha) {
      escucha = true;
      alCambiarConfig(() => { olvidar(); if (o.releer) void leer(...([] as unknown as A)).catch(() => undefined); });
    }
    const k = o.clave ? o.clave(...a) : "";
    const c = copias.get(k);
    if (c && Date.now() < c.hasta) return Promise.resolve(c.v);
    if (!o.juntar) return traer(k, a);
    const x = enVuelo.get(k);
    if (x && x.gen === gen) return x.p;
    const p: Promise<V> = traer(k, a).finally(() => { if (enVuelo.get(k)?.p === p) enVuelo.delete(k); });
    enVuelo.set(k, { gen, p });
    return p;
  }
  return { leer, olvidar };
}
