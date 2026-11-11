import "server-only";
import { createHash } from "node:crypto";
import { normalizar } from "./tapar";
import { original } from "./simbolizar";

/* 8f · El stack ya TAPADO (lib/errores/tapar.ts): se lee cuadro por cuadro (Chrome / Android «at fn (archivo:l:c)», Safari / Firefox
   «fn@archivo:l:c», los cierres nativos «3  To'Latino  0x… fn + 12»), se simboliza lo nuestro de /_next/static con los mapas del servidor y
   se saca la HUELLA del grupo: app + plataforma + tipo + el mensaje normalizado (sin números) + los 5 primeros cuadros propios por archivo y
   función (sin hash del archivo, sin línea ni columna: cambian en cada build). Así 1 000 veces el mismo error, con otros números o en otro
   build, son UN grupo. */
export type Cuadro = { fn: string; archivo: string; linea: number; col: number; simbolizado: boolean };
const CHROME = /^\s*at (?:(.+?) \()?(.+?):(\d{1,7}):(\d{1,7})\)?\s*$/;
const SAFARI = /^\s*(.*?)@(.+?):(\d{1,7}):(\d{1,7})\s*$/;

export function cuadros(stack: string): Cuadro[] {
  return stack.split("\n").slice(0, 60).map(cuadro).filter((c): c is Cuadro => !!c);
}
function cuadro(l: string): Cuadro | null {
  // Un cuadro real es corto: una línea larga no se intenta (las expresiones con dos «.+?» serían cuadráticas en 16 KB sin saltos).
  if (l.length > 500) return null;
  const m = CHROME.exec(l) ?? SAFARI.exec(l);
  return m ? { fn: (m[1] ?? "").trim().slice(0, 80) || "<anonymous>", archivo: m[2]!.trim().slice(0, 200), linea: Number(m[3]), col: Number(m[4]), simbolizado: false } : null;
}

/* Simboliza los cuadros de /_next/static que tengan mapa y reescribe SOLO esas líneas (las demás —el mensaje, «[url]», lo nativo— quedan como
   llegaron). Devuelve el stack, los cuadros y si alguno se pudo. */
export async function simbolizar(stack: string): Promise<{ stack: string; cuadros: Cuadro[]; ok: boolean }> {
  const L = stack.split("\n").slice(0, 200), C: Cuadro[] = [];
  let ok = false;
  for (let i = 0; i < L.length; i++) {
    const c = cuadro(L[i]!);
    if (!c) continue;
    C.push(c);
    if (C.length > 40 || !c.archivo.startsWith("/_next/static/")) continue;
    const o = await original(c.archivo, c.linea, c.col).catch(() => null);
    if (!o) continue;
    c.archivo = o.fuente; c.linea = o.linea; c.col = o.columna; c.fn = o.nombre ?? c.fn; c.simbolizado = true; ok = true;
    L[i] = `    at ${c.fn} (${c.archivo}:${c.linea}:${c.col})`;
  }
  return { stack: L.join("\n"), cuadros: C, ok };
}

/* Un archivo sin el hash del build («page-29cea7f906ff1d19.js» → «page.js»). */
const sinHash = (a: string) => a.replace(/[-.][0-9a-f]{8,}(?=\.js$)/i, "").replace(/\/[0-9]{2,6}-[0-9a-f]{8,}\.js$/i, "/chunk.js");
const PROPIO = /^(\/_next\/static\/|app\/|lib\/|components\/|packages\/|apps\/)/;

export function huellaError(x: { app: string; plataforma: string; tipo: string; titulo: string; cuadros: Cuadro[]; stackNativo?: string }): string {
  let partes: string[];
  if (x.tipo === "cierre" || x.tipo === "nativo") {
    // Nativo: los primeros cuadros (binario + desplazamiento, o clase.método(Archivo:línea) en Java), sin el número de cuadro. Sin símbolos todavía
    // (dSYM / mapping.txt en 8h), el desplazamiento es lo que distingue un cierre de otro dentro de un build.
    partes = (x.stackNativo ?? "").split("\n").map((l) => l.replace(/^\s*\d+\s+/, "").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 5);
  } else {
    const propios = x.cuadros.filter((c) => PROPIO.test(c.archivo));
    partes = (propios.length ? propios : x.cuadros).slice(0, 5).map((c) => `${sinHash(c.archivo)}:${c.fn}`);
  }
  return createHash("sha1").update([x.app, x.plataforma, x.tipo, normalizar(x.titulo), ...partes].join("\n")).digest("hex");
}
