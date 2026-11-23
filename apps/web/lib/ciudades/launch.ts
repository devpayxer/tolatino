import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/* 9i · «Comprobar» (paso 6 del asistente): las líneas pendientes de docs/LAUNCH-CHECKLIST.md que nombran a la ciudad, leídas del archivo que viaja CON
   el build que corre (next.config.ts lo incluye en el paquete de /admin/ciudades: outputFileTracingIncludes). Una línea pendiente es «- [ ] …» con sus
   renglones de continuación. Si el archivo no se puede leer, el paso no pasa (falla cerrada: nunca se abre sin mirar). */
export type Pendiente = { linea: number; texto: string };
const CANDIDATOS = () => [path.join(process.cwd(), "../../docs/LAUNCH-CHECKLIST.md"), path.join(process.cwd(), "docs/LAUNCH-CHECKLIST.md")];

export function pendientesLaunch(nombres: string[]): { leida: boolean; total: number; deLaCiudad: Pendiente[] } {
  const f = CANDIDATOS().find((x) => existsSync(x));
  if (!f) return { leida: false, total: 0, deLaCiudad: [] };
  let txt: string;
  try { txt = readFileSync(f, "utf8"); } catch { return { leida: false, total: 0, deLaCiudad: [] }; }
  const L = txt.split("\n"), items: Pendiente[] = [];
  for (let i = 0; i < L.length; i++) {
    if (!/^- \[ \]/.test(L[i]!)) continue;
    let t = L[i]!;
    for (let j = i + 1; j < L.length && /^\s+\S/.test(L[j]!) && !/^\s*- \[/.test(L[j]!); j++) t += " " + L[j]!.trim();
    items.push({ linea: i + 1, texto: t.replace(/^- \[ \]\s*/, "").replace(/\s+/g, " ") });
  }
  const re = nombraA(nombres);
  return { leida: true, total: items.length, deLaCiudad: items.filter((x) => re.test(x.texto)).map((x) => ({ linea: x.linea, texto: x.texto.slice(0, 200) })) };
}

/* 23 nov · La línea nombra a la ciudad si su nombre aparece ENTERO: fronteras de LETRA, nunca \b. En JavaScript \b solo conoce a-z, 0-9 y _: junto
   a una letra con tilde o ñ no hay frontera, así que «Bogotá.» o «Ángeles» no casarían nunca (y un nombre casaría dentro de otra palabra que sigue con tilde o ñ: «Cata» dentro de «Cataño»). Con
   la bandera u, (?<![\p{L}\p{N}]) y (?![\p{L}\p{N}]) ven la tilde y la ñ, y la i compara mayúsculas con tilde («BAYAMÓN»). El guion no se escapa
   (con u, «\-» fuera de una clase es un error). Sin nombres, nada casa. Guardián fronteraConTildeEnDatos (su tabla corre contra esta función). */
export function nombraA(nombres: string[]): RegExp {
  const alt = nombres.map((n) => n.trim()).filter(Boolean).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return alt.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${alt.join("|")})(?![\\p{L}\\p{N}])`, "iu") : /(?!)/;
}
