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
   - 22 nov (los dos huecos que se vieron en main) · Y además el código tiene que estar CONFIRMADO: el de un push de solo documentos es el de
     «before», y «before» no dice si se probó (un push de documentos que sustituye en la cola a uno de código, o que llega sobre un main rojo,
     salía verde sin que nadie corriera ese código: ec26b14 y b990f36 sobre ceaaba2, 21 nov). Se busca el ancla: «before», o, si «before» fue a su
     vez de solo documentos, se sigue hacia atrás por el primer padre hasta el primer commit que no lo es (como mucho TOPE_ATRAS pasos). El ancla
     tiene que tener en main una corrida de ci.yml de evento push, terminada en verde y con sus carriles largos corridos, no saltados
     (scripts/ci/corrida.mjs, con la API de GitHub y un token de solo lectura). Sin ancla, sin token, sin permiso, sin red o con duda: «todo».

   DOCUMENTOS es la única lista (el guardián ciSoloDocumentos la lee de aquí y exige que sea docs/<NOMBRE>.md de primer nivel, sin nada que el
   producto lea). Lo que NO está y por qué:
   - docs/ayuda/**: el centro de ayuda y El Compa (scripts/ayuda/indexar.mjs, apps/mobile/scripts/fichas.mjs): es producto.
   - docs/legal/**: las páginas legales (scripts/legal/indexar.mjs; el CI las indexa en una base real).
   - docs/LAUNCH-CHECKLIST.md: la app la lee (apps/web/lib/ciudades/launch.ts, «Comprobar» del asistente de ciudades; viaja con el build por
     outputFileTracingIncludes en apps/web/next.config.ts).
   - docs/DESPUES-DE-ABRIR.md: va de la mano de LAUNCH (guardián launchConDestino y alreves9a); se queda fuera por la duda.
   - docs/diseno/**, docs/incidentes/**: los leen guardianes y pruebas de contenido (datos de pantallas, simulacros).
   Uso:
     node scripts/ci/alcance.mjs                 lee EVENTO, ANTES, DESPUES, REPO y GH_TOKEN del entorno, dice el alcance y lo escribe en
                                                 $GITHUB_OUTPUT (alcance=todo|documentos, n=<archivos cambiados>, ancla=<commit>, corrida=<id>)
     node scripts/ci/alcance.mjs --decidir       lee de la entrada un JSON con listas de archivos y responde un JSON con el veredicto de cada una */
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { apiGh, confirmado as confirmadoEnGithub } from "./corrida.mjs";

export const DOCUMENTOS = Object.freeze([
  "docs/PROGRESS.md",
  "docs/REVISION.md",
  "docs/DECISIONES.md",
  "docs/HERRAMIENTAS.md",
  "docs/PLAN.md",
]);
const DOC = new Set(DOCUMENTOS);
const SHA = /^[0-9a-f]{40}$/;
// Cuántos commits seguidos de solo documentos se recorren hacia atrás buscando el código que hay que confirmar (más = «todo»).
export const TOPE_ATRAS = 20;

/** El veredicto de una lista de archivos cambiados: «documentos» solo si hay al menos uno y todos están en DOCUMENTOS. */
export function veredicto(archivos) {
  try {
    if (!Array.isArray(archivos) || archivos.length === 0) return "todo";
    return archivos.every((f) => typeof f === "string" && DOC.has(f)) ? "documentos" : "todo";
  } catch {
    return "todo";
  }
}

/** El ancla de «sha»: el primer commit, yendo hacia atrás por el primer padre desde «sha», que NO es de solo documentos respecto de su padre
    (sin padre a la vista, él mismo). Todos los de en medio tienen el mismo código que el ancla. Más de «tope» pasos: sin ancla. */
export function anclaDe(sha, git, tope = TOPE_ATRAS) {
  let x = sha;
  for (let i = 0; i <= tope; i++) {
    let p = "";
    try { p = git("rev-parse", "-q", "--verify", `${x}^1^{commit}`).trim(); } catch { /* raíz, o el borde de un clon sin historia: él es el ancla */ }
    if (!SHA.test(p)) return { sha: x, pasos: i };
    if (veredicto(git("diff", "--no-renames", "--name-only", "-z", p, x).split("\0").filter((f) => f !== "")) !== "documentos") return { sha: x, pasos: i };
    x = p;
  }
  return { sha: "", pasos: tope, motivo: `más de ${tope} commits seguidos de solo documentos` };
}

/** El alcance de una corrida: { alcance, archivos, motivo, ancla?, corrida? }. Cualquier error = «todo».
    api: la de scripts/ci/corrida.mjs (corridas, trabajos); sin ella, «todo». traer(sha): trae «before» con su historia (en el CI, git fetch). */
export function alcance({ evento, antes, despues, cwd = process.cwd(), repo, api = null, traer }) {
  try {
    if (evento !== "push") return { alcance: "todo", archivos: [], motivo: `evento ${evento || "(vacío)"}: siempre todo` };
    if (!SHA.test(antes ?? "") || /^0+$/.test(antes)) return { alcance: "todo", archivos: [], motivo: "sin commit anterior de la rama (rama nueva o «before» vacío)" };
    if (!SHA.test(despues ?? "")) return { alcance: "todo", archivos: [], motivo: "sin commit nuevo" };
    const git = (...a) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
    // El checkout del CI es de un solo commit: el anterior se trae con la historia que hace falta para buscar el ancla.
    (traer ?? ((s) => { try { git("fetch", "--no-tags", `--depth=${TOPE_ATRAS + 2}`, "origin", s); } catch { /* sin remoto: lo que haya aquí */ } }))(antes);
    git("cat-file", "-e", `${antes}^{commit}`);
    const archivos = git("diff", "--no-renames", "--name-only", "-z", antes, despues).split("\0").filter((f) => f !== "");
    const a = veredicto(archivos);
    if (a !== "documentos") return { alcance: "todo", archivos, motivo: "hay archivos que no son documentos de trabajo" };
    // Solo documentos: el código es el de «antes». ¿Quedó confirmado el commit que lo trajo?
    const ancla = anclaDe(antes, git);
    if (!ancla.sha) return { alcance: "todo", archivos, motivo: `solo documentos, pero ${ancla.motivo}: todo` };
    const c = confirmadoEnGithub(ancla.sha, { repo, api });
    if (!c.ok) return { alcance: "todo", archivos, ancla: ancla.sha, motivo: `solo documentos, pero el código (${ancla.sha.slice(0, 12)}, ${ancla.pasos} paso(s) atrás) no quedó confirmado: ${String(c.motivo).slice(0, 300)}` };
    return { alcance: "documentos", archivos, ancla: ancla.sha, corrida: c.corrida, motivo: `todos los archivos cambiados son documentos de trabajo y el código (${ancla.sha.slice(0, 12)}) lo confirmó la corrida ${c.corrida}` };
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
    try {
      const repo = process.env.REPO;
      r = alcance({ evento: process.env.EVENTO, antes: process.env.ANTES, despues: process.env.DESPUES, repo, api: process.env.GH_TOKEN ? apiGh({ repo }) : null });
    } catch (e) { r = { alcance: "todo", archivos: [], motivo: `error: ${e?.message ?? e}` }; }
    const valor = r.alcance === "documentos" ? "documentos" : "todo", n = r.archivos.length;
    const ancla = valor === "documentos" && SHA.test(r.ancla ?? "") ? r.ancla : "", corrida = valor === "documentos" && /^\d+$/.test(String(r.corrida)) ? String(r.corrida) : "";
    console.log(`alcance: ${valor} · ${n} archivo(s) cambiado(s) · ${r.motivo}`);
    for (const f of r.archivos.slice(0, 50)) console.log(`  ${JSON.stringify(f)}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `alcance=${valor}\nn=${n}\nancla=${ancla}\ncorrida=${corrida}\n`);
  }
}
