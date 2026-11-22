#!/usr/bin/env node
/* 22 nov · El alcance de una corrida del CI (.github/workflows/ci.yml, trabajo «cambios»): «todo» o «documentos».
   Una subida a main que SOLO cambia documentos de trabajo (lo que se anota para el fundador y para retomar) no corre los carriles largos
   (regresión, dispositivos): esos 20 trabajos hacían cola delante de todo lo demás (GitHub gratis da 20 a la vez) por un renglón de PROGRESS.
   Los guardianes, los textos de las pruebas al revés y la seguridad corren siempre.

   Reglas (cualquier duda o error = «todo»; nunca al revés):
   - Solo en push, con el commit anterior de la rama (github.event.before) y el nuevo (github.sha) como SHA de 40. Sin «before», con «before» en
     ceros (rama nueva), en pull_request, programado o a mano: «todo».
   - Los archivos cambiados son los de «git diff --no-renames --name-only -z before sha» (un renombre cuenta el nombre viejo Y el nuevo: mover
     código a un nombre de la lista no lo vuelve documento).
   - «documentos» solo si hay al menos uno y TODOS son exactamente un nombre de DOCUMENTOS (comparación exacta, sin patrones: una ruta con
     espacios, con «./», en otra carpeta o con otra mayúscula es «todo").

   DOCUMENTOS es la única lista (el guardián ciSoloDocumentos la lee de aquí y exige que sea docs/<NOMBRE>.md de primer nivel, sin nada que el
   producto lea). Lo que NO está y por qué:
   - docs/ayuda/**: el centro de ayuda y El Compa (scripts/ayuda/indexar.mjs, apps/mobile/scripts/fichas.mjs): es producto.
   - docs/legal/**: las páginas legales (scripts/legal/indexar.mjs; el CI las indexa en una base real).
   - docs/LAUNCH-CHECKLIST.md: la app la lee (apps/web/lib/ciudades/launch.ts, «Comprobar» del asistente de ciudades; viaja con el build por
     outputFileTracingIncludes en apps/web/next.config.ts).
   - docs/DESPUES-DE-ABRIR.md: va de la mano de LAUNCH (guardián launchConDestino y alreves9a); se queda fuera por la duda.
   - docs/diseno/**, docs/incidentes/**: los leen guardianes y pruebas de contenido (datos de pantallas, simulacros).
   Uso:
     node scripts/ci/alcance.mjs                 lee EVENTO, ANTES y DESPUES del entorno, dice el alcance y lo escribe en $GITHUB_OUTPUT
                                                 (alcance=todo|documentos, n=<archivos cambiados>)
     node scripts/ci/alcance.mjs --decidir       lee de la entrada un JSON con listas de archivos y responde un JSON con el veredicto de cada una */
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const DOCUMENTOS = Object.freeze([
  "docs/PROGRESS.md",
  "docs/REVISION.md",
  "docs/DECISIONES.md",
  "docs/HERRAMIENTAS.md",
  "docs/PLAN.md",
]);
const DOC = new Set(DOCUMENTOS);
const SHA = /^[0-9a-f]{40}$/;

/** El veredicto de una lista de archivos cambiados: «documentos» solo si hay al menos uno y todos están en DOCUMENTOS. */
export function veredicto(archivos) {
  try {
    if (!Array.isArray(archivos) || archivos.length === 0) return "todo";
    return archivos.every((f) => typeof f === "string" && DOC.has(f)) ? "documentos" : "todo";
  } catch {
    return "todo";
  }
}

/** El alcance de una corrida: { alcance, archivos, motivo }. Cualquier error = «todo». */
export function alcance({ evento, antes, despues, cwd = process.cwd() }) {
  try {
    if (evento !== "push") return { alcance: "todo", archivos: [], motivo: `evento ${evento || "(vacío)"}: siempre todo` };
    if (!SHA.test(antes ?? "") || /^0+$/.test(antes)) return { alcance: "todo", archivos: [], motivo: "sin commit anterior de la rama (rama nueva o «before» vacío)" };
    if (!SHA.test(despues ?? "")) return { alcance: "todo", archivos: [], motivo: "sin commit nuevo" };
    const git = (...a) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
    // El checkout del CI es de un solo commit: el anterior se trae solo (sin historia; el diff compara los dos árboles).
    try { git("cat-file", "-e", `${antes}^{commit}`); } catch { git("fetch", "--no-tags", "--depth=1", "origin", antes); }
    const archivos = git("diff", "--no-renames", "--name-only", "-z", antes, despues).split("\0").filter((f) => f !== "");
    const a = veredicto(archivos);
    return { alcance: a, archivos, motivo: a === "documentos" ? "todos los archivos cambiados son documentos de trabajo" : "hay archivos que no son documentos de trabajo" };
  } catch (e) {
    return { alcance: "todo", archivos: [], motivo: `error al calcular (${String(e?.message ?? e).split("\n")[0].slice(0, 200)}): todo` };
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes("--decidir")) {
    let listas;
    try { listas = JSON.parse(readFileSync(0, "utf8")); } catch { listas = null; }
    console.log(JSON.stringify(Array.isArray(listas) ? listas.map((l) => veredicto(l)) : "todo"));
  } else {
    let r;
    try { r = alcance({ evento: process.env.EVENTO, antes: process.env.ANTES, despues: process.env.DESPUES }); }
    catch (e) { r = { alcance: "todo", archivos: [], motivo: `error: ${e?.message ?? e}` }; }
    const valor = r.alcance === "documentos" ? "documentos" : "todo", n = r.archivos.length;
    console.log(`alcance: ${valor} · ${n} archivo(s) cambiado(s) · ${r.motivo}`);
    for (const f of r.archivos.slice(0, 50)) console.log(`  ${JSON.stringify(f)}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `alcance=${valor}\nn=${n}\n`);
  }
}
