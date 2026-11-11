"use client";
/* 8a · Lo que se guarda en el teléfono para sin señal (fase8-apps.md §3.1 «Islas locales», §3.4 TLLocal): UNA interfaz con dos lugares.
   - En la web: IndexedDB, como siempre (las mismas bases y tiendas de 6h: «tl-puerta», «tl-boletos»; y «tl-repartidor»).
   - En la app: TLLocal (Keychain en iOS, Android Keystore; los datos cifrados con AES-GCM en archivos del contenedor, fuera de la copia en
     la nube). Así Safari ya no borra nada a los 7 días (LAUNCH L892), las islas locales —otro origen, sin el IndexedDB ni las cookies de la
     web— ven lo mismo, y la llave queda en el llavero del teléfono (LAUNCH L908).
   Las pantallas (Puerta, Mis boletos, Repartidor) no cambian su lógica: guardan y leen filas con su clave como antes. Lo que ya venía
   cifrado (paquete de la Puerta, QR de los boletos) sigue cifrado con su llave de sesión: TLLocal lo cifra otra vez por debajo.
   Una CryptoKey no viaja al nativo: en la app la llave de la sesión se guarda en bruto en TLLocal y se importa NO exportable en memoria. */
import { esApp, plugin } from "./puente";

type Tiendas = Record<string, { clave: string; indice?: string }>;
type Fila = Record<string, unknown>;
type TLLocal = {
  poner(o: { ns: string; tienda: string; clave: string; valor: string }): Promise<void>;
  leer(o: { ns: string; tienda: string; clave: string }): Promise<{ valor: string | null }>;
  quitar(o: { ns: string; tienda: string; clave: string }): Promise<void>;
  todos(o: { ns: string; tienda: string }): Promise<{ valores: string[] }>;
  borrar(o: { ns: string }): Promise<void>;
};
export type Almacen = {
  leer<T>(tienda: string, clave: string): Promise<T | undefined>;
  poner(tienda: string, fila: Fila): Promise<void>;
  quitar(tienda: string, clave: string): Promise<void>;
  todos<T>(tienda: string): Promise<T[]>;
  porIndice<T>(tienda: string, valor: string): Promise<T[]>;
  contar(tienda: string, valor: string): Promise<number>;
  vaciar(tienda: string): Promise<void>;
  /* La llave AES-GCM de una sesión (no exportable). */
  llave(tienda: string, clave: string): Promise<CryptoKey | null>;
  guardarLlave(tienda: string, clave: string, raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey>;
  /* Salir de la cuenta: nada queda. */
  borrarTodo(): Promise<void>;
};

/* JSON con binarios (el iv y el texto cifrado) para el lado nativo. */
const b64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
const aTexto = (v: unknown) => JSON.stringify(v, (_k, x: unknown) => x instanceof ArrayBuffer ? { $ab: b64(new Uint8Array(x)) } : ArrayBuffer.isView(x) ? { $u8: b64(new Uint8Array(x.buffer, x.byteOffset, x.byteLength)) } : x);
const deTexto = <T,>(s: string): T => JSON.parse(s, (_k, x: { $ab?: string; $u8?: string } | unknown) => {
  if (x && typeof x === "object" && "$ab" in x && typeof x.$ab === "string") return deB64(x.$ab).buffer;
  if (x && typeof x === "object" && "$u8" in x && typeof x.$u8 === "string") return deB64(x.$u8);
  return x;
}) as T;
const importar = (raw: Uint8Array<ArrayBuffer>) => crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);

export function almacen(nombre: string, version: number, tiendas: Tiendas): Almacen {
  const nativo = (): TLLocal | null => (esApp() ? plugin<TLLocal>("TLLocal") : null);
  const enMemoria = new Map<string, CryptoKey>();

  /* ── IndexedDB (la web) ── */
  let dbp: Promise<IDBDatabase> | null = null;
  const pedir = <T,>(r: IDBRequest<T>) => new Promise<T>((ok, mal) => { r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); });
  const abrir = (): Promise<IDBDatabase> => {
    if (dbp) return dbp;
    dbp = new Promise((ok, mal) => {
      const r = indexedDB.open(nombre, version);
      r.onupgradeneeded = () => {
        const d = r.result;
        for (const [t, def] of Object.entries(tiendas)) {
          if (d.objectStoreNames.contains(t)) continue;
          const st = d.createObjectStore(t, { keyPath: def.clave });
          if (def.indice) st.createIndex(def.indice, def.indice);
        }
      };
      r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); dbp = null; }; ok(r.result); };
      r.onerror = () => { dbp = null; mal(r.error); };
    });
    return dbp;
  };
  const st = async (t: string, m: IDBTransactionMode = "readonly") => (await abrir()).transaction(t, m).objectStore(t);

  /* ── TLLocal (la app) ── */
  const clave = (t: string, f: Fila) => String(f[tiendas[t]!.clave]);
  const todosN = async <T,>(p: TLLocal, t: string): Promise<T[]> => {
    const r = await p.todos({ ns: nombre, tienda: t });
    const out: T[] = [];
    for (const v of r.valores ?? []) { try { out.push(deTexto<T>(v)); } catch { /* dañada: fuera */ } }
    return out;
  };

  const a: Almacen = {
    async leer<T>(t: string, k: string) {
      const p = nativo();
      if (!p) return (await pedir((await st(t)).get(k))) as T | undefined;
      const r = await p.leer({ ns: nombre, tienda: t, clave: k });
      return r.valor == null ? undefined : deTexto<T>(r.valor);
    },
    async poner(t, f) {
      const p = nativo();
      if (!p) { await pedir((await st(t, "readwrite")).put(f)); return; }
      await p.poner({ ns: nombre, tienda: t, clave: clave(t, f), valor: aTexto(f) });
    },
    async quitar(t, k) {
      enMemoria.delete(`${t}:${k}`);
      const p = nativo();
      if (!p) { await pedir((await st(t, "readwrite")).delete(k)); return; }
      await p.quitar({ ns: nombre, tienda: t, clave: k });
    },
    async todos<T>(t: string) {
      const p = nativo();
      if (!p) return (await pedir((await st(t)).getAll())) as T[];
      return todosN<T>(p, t);
    },
    async porIndice<T>(t: string, v: string) {
      const p = nativo(), i = tiendas[t]!.indice!;
      if (!p) return (await pedir((await st(t)).index(i).getAll(v))) as T[];
      return (await todosN<Fila>(p, t)).filter((f) => f[i] === v) as T[];
    },
    async contar(t, v) {
      const p = nativo(), i = tiendas[t]!.indice!;
      if (!p) return pedir((await st(t)).index(i).count(v));
      return (await todosN<Fila>(p, t)).filter((f) => f[i] === v).length;
    },
    async vaciar(t) {
      const p = nativo();
      if (!p) { await pedir((await st(t, "readwrite")).clear()); return; }
      for (const f of await todosN<Fila>(p, t)) await p.quitar({ ns: nombre, tienda: t, clave: clave(t, f) });
    },
    async llave(t, k) {
      const id = `${t}:${k}`;
      if (enMemoria.has(id)) return enMemoria.get(id)!;
      const p = nativo();
      if (!p) {
        const x = (await pedir((await st(t)).get(k))) as { k?: CryptoKey } | undefined;
        if (x?.k) enMemoria.set(id, x.k);
        return x?.k ?? null;
      }
      const x = await a.leer<{ raw?: Uint8Array<ArrayBuffer> }>(t, k);
      if (!x?.raw) return null;
      const ck = await importar(x.raw);
      enMemoria.set(id, ck);
      return ck;
    },
    async guardarLlave(t, k, raw) {
      const ck = await importar(raw), p = nativo(), c = tiendas[t]!.clave;
      // En la web, la CryptoKey no exportable vive en IndexedDB (el navegador no la deja sacar); en la app, el valor en bruto en el llavero.
      if (!p) await pedir((await st(t, "readwrite")).put({ [c]: k, k: ck }));
      else await a.poner(t, { [c]: k, raw });
      enMemoria.set(`${t}:${k}`, ck);
      return ck;
    },
    async borrarTodo() {
      enMemoria.clear();
      const idb = async () => {
        try { (await dbp)?.close(); } catch { /* nada */ }
        dbp = null;
        await new Promise<void>((ok) => {
          try { const r = indexedDB.deleteDatabase(nombre); r.onsuccess = r.onerror = r.onblocked = () => ok(); setTimeout(ok, 1500); } catch { ok(); }
        });
      };
      const p = nativo();
      if (!p) { await idb(); return; }
      // En la app: lo del llavero del teléfono y, por si quedó de antes de la app (la web del mismo origen), también IndexedDB.
      await p.borrar({ ns: nombre }).catch(() => undefined);
      await idb();
    },
  };
  return a;
}

/* Las bases de cada isla (una sola definición: la Puerta, Mis boletos y el Repartidor las abren desde aquí). */
export const PUERTA = () => almacen("tl-puerta", 1, { llaves: { clave: "s" }, paquetes: { clave: "s" }, cola: { clave: "id", indice: "s" }, meta: { clave: "k" } });
export const BOLETOS = () => almacen("tl-boletos", 2, { b: { clave: "code" }, meta: { clave: "k" } });
export const REPARTIDOR = () => almacen("tl-repartidor", 1, { cola: { clave: "id" }, turno: { clave: "k" } });

/* Salir de la cuenta: nada de boletos, puertas ni entregas queda en el teléfono (web y app). */
export async function olvidarTodo() {
  await Promise.all([PUERTA(), BOLETOS(), REPARTIDOR()].map((x) => x.borrarTodo().catch(() => undefined)));
}
