import "server-only";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

/* 8f · Simbolizar en el servidor (fase8-apps.md §4 8f: «la ficha con el stack simbolizado»). Los mapas de fuente del navegador viven en
   .next/mapas/static/… (scripts/mapas-privados.mjs los sacó de lo que se sirve; guardián mapasPrivados) y solo los lee este archivo.
   Decodificador propio del formato v3 (VLQ base64), sin dependencias. Defensas: la ruta del archivo viene del navegador → solo
   /_next/static/…js, sin «..», resuelta y comprobada DENTRO de la carpeta de mapas; un mapa de más de 40 MB no se abre; los mapas abiertos se
   guardan en una caché chica (12) por proceso. Un archivo sin mapa (otro build, la web en desarrollo) queda como llegó. */
const RAIZ = () => path.join(process.cwd(), ".next", "mapas");
const ESTATICO = /^\/_next\/static\/[A-Za-z0-9_\-./()[\]@~%]+\.js$/;
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const VAL = new Int8Array(128).fill(-1);
for (let i = 0; i < B64.length; i++) VAL[B64.charCodeAt(i)] = i;

type Mapa = { sources: string[]; names: string[]; lineas: Int32Array[] };   // cada línea: [col, src, linea, colSrc, nombre(-1)] × n
const cache = new Map<string, Mapa | null>();

/* Decodifica todas las líneas (el estado de fuente, línea, columna y nombre sigue de una línea a la otra; la columna generada no). */
export function decodificar(mappings: string): Int32Array[] {
  const out: Int32Array[] = [];
  let src = 0, sl = 0, sc = 0, nm = 0, i = 0;
  const n = mappings.length;
  while (i <= n) {
    const seg: number[] = [];
    let col = 0;
    while (i < n && mappings[i] !== ";") {
      const campos: number[] = [];
      while (i < n && mappings[i] !== "," && mappings[i] !== ";") {
        let v = 0, sh = 0, d: number;
        do {
          const c = mappings.charCodeAt(i++);
          d = c < 128 ? VAL[c]! : -1;
          if (d < 0) throw new Error("mapa_invalido");
          v += (d & 31) << sh; sh += 5;
        } while (d & 32);
        campos.push(v & 1 ? -(v >>> 1) : v >>> 1);
      }
      if (campos.length) {
        col += campos[0]!;
        if (campos.length >= 4) { src += campos[1]!; sl += campos[2]!; sc += campos[3]!; if (campos.length >= 5) nm += campos[4]!; }
        seg.push(col, campos.length >= 4 ? src : -1, sl, sc, campos.length >= 5 ? nm : -1);
      }
      if (mappings[i] === ",") i++;
    }
    out.push(Int32Array.from(seg));
    i++;
  }
  return out;
}

async function cargar(rel: string): Promise<Mapa | null> {
  if (!ESTATICO.test(rel) || rel.includes("..")) return null;
  if (cache.has(rel)) { const m = cache.get(rel)!; cache.delete(rel); cache.set(rel, m); return m; }
  const raiz = RAIZ(), f = path.resolve(raiz, rel.slice("/_next/".length) + ".map");
  let m: Mapa | null = null;
  if (f.startsWith(raiz + path.sep)) {
    const st = await stat(f).catch(() => null);
    if (st?.isFile() && st.size <= 40 * 1024 * 1024) {
      try {
        const j = JSON.parse(await readFile(f, "utf8")) as { version?: number; sources?: string[]; names?: string[]; mappings?: string; sourceRoot?: string };
        if (j.version === 3 && typeof j.mappings === "string" && Array.isArray(j.sources))
          m = { sources: j.sources.map((s) => fuente((j.sourceRoot ?? "") + s)), names: Array.isArray(j.names) ? j.names : [], lineas: decodificar(j.mappings) };
      } catch { m = null; }
    }
  }
  cache.set(rel, m);
  if (cache.size > 12) cache.delete(cache.keys().next().value!);
  return m;
}

/* «webpack://_N_E/./app/(app)/soporte/Soporte.tsx» → «app/(app)/soporte/Soporte.tsx»; lo de node_modules desde node_modules/. */
export function fuente(s: string): string {
  let x = s.replace(/^webpack:\/\/[^/]*\//, "").replace(/^(\.\.?\/)+/, "");
  const nm = x.lastIndexOf("node_modules/");
  if (nm >= 0) x = x.slice(nm);
  return x.replace(/\?.*$/, "").slice(0, 160);
}

/* El lugar original de (línea, columna) — las dos como las da el stack (empiezan en 1). */
export async function original(archivo: string, linea: number, columna: number): Promise<{ fuente: string; linea: number; columna: number; nombre: string | null } | null> {
  const m = await cargar(archivo);
  const L = m?.lineas[linea - 1];
  if (!m || !L || !L.length) return null;
  const c = columna - 1;
  let lo = 0, hi = L.length / 5 - 1, k = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (L[mid * 5]! <= c) { k = mid; lo = mid + 1; } else hi = mid - 1; }
  if (k < 0 || L[k * 5 + 1]! < 0) return null;
  const nom = L[k * 5 + 4]!;
  return { fuente: m.sources[L[k * 5 + 1]!] ?? "?", linea: L[k * 5 + 2]! + 1, columna: L[k * 5 + 3]! + 1, nombre: nom >= 0 ? (m.names[nom] ?? null) : null };
}
