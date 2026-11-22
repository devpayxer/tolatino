#!/usr/bin/env node
/* 22 nov · ¿Una corrida de .github/workflows/ci.yml deja confirmado un commit? Lo usa el alcance de un push de solo documentos
   (scripts/ci/alcance.mjs): el código de ese push es el de un commit anterior, y los carriles largos solo se saltan si ESE commit tiene una
   corrida que los corrió de verdad y en verde.
   Se decide con lo que la API de GitHub dice de la corrida y de cada uno de sus trabajos, nunca con lo que la corrida diga de sí misma:
   - la corrida: evento push, rama main, flujo .github/workflows/ci.yml de ESTE repo, el commit pedido, terminada y en verde;
   - sus trabajos: todo lo que corrió, en verde; solo «confirmación» y «anchos» pueden quedar saltados (en un push no corren);
     alcance, tipos · build · guardianes, seguridad y web, uno cada uno y en verde; los 9 dispositivos, uno cada uno y en verde; y los carriles
     «punta a punta · al revés» y «punta a punta · todas las fases» con TODAS sus partes (1/n … n/n, una vez cada una) en verde.
   Un carril saltado (un push de solo documentos), una parte que falta, un trabajo rojo, cancelado o en curso, una lista de trabajos
   incompleta, otro evento, otra rama u otro repo: no confirma. Cualquier error = no.
   Uso:
     node scripts/ci/corrida.mjs --decidir   lee de la entrada [[corrida, trabajos, {sha, repo}], …] y responde [{ok, motivo}, …] (sin red) */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Los mismos 9 de la matriz «dispositivos» de ci.yml (el guardián ciSoloDocumentos exige que coincidan).
export const DISPOSITIVOS = Object.freeze(["iphone-se", "iphone-15", "iphone-15-pro-max", "pixel", "galaxy", "ipad", "escritorio-1024", "escritorio-1280", "escritorio-1440"]);
// Los trabajos que corren una vez en toda corrida completa (por el principio de su nombre en ci.yml).
const FIJOS = Object.freeze([
  ["alcance", /^alcance \(/],
  ["tipos · build · guardianes", /^tipos · build · guardianes$/],
  ["seguridad", /^seguridad · /],
  ["web", /^web · /],
  ["la tubería", /^la tubería /],
]);
const CARRILES = Object.freeze(["punta a punta · al revés", "punta a punta · todas las fases"]);
const SHA40 = /^[0-9a-f]{40}$/;
const no = (motivo) => ({ ok: false, motivo });
const nombre = (j) => String(j?.name ?? "");
const verde = (j) => j?.status === "completed" && j?.conclusion === "success";

/** Un carril repartido en partes: «<base>» solo, o «<base> · i/n» con i = 1…n, una vez cada una, todas en verde. */
export function carrilCompleto(trabajos, base) {
  const js = trabajos.filter((j) => nombre(j) === base || nombre(j).startsWith(`${base} · `));
  if (!js.length) return no(`no corrió «${base}»`);
  const partes = js.map((j) => /^ · (\d+)\/(\d+)$/.exec(nombre(j).slice(base.length)) ?? (nombre(j) === base ? ["", "1", "1"] : null));
  if (partes.some((p) => !p)) return no(`«${base}»: una parte con un nombre raro`);
  const n = Number(partes[0][2]);
  if (!(n >= 1) || partes.some((p) => Number(p[2]) !== n) || js.length !== n || new Set(partes.map((p) => Number(p[1]))).size !== n || partes.some((p) => !(Number(p[1]) >= 1 && Number(p[1]) <= n)))
    return no(`«${base}»: ${js.length} parte(s) de ${n} (tienen que estar todas, una vez cada una)`);
  const mal = js.find((j) => !verde(j));
  return mal ? no(`«${nombre(mal)}» terminó ${mal?.status}/${mal?.conclusion}`) : { ok: true };
}

/** ¿Los trabajos de una corrida son los de una pasada completa en verde? */
export function trabajosCompletos(trabajos) {
  if (!Array.isArray(trabajos) || trabajos.length === 0) return no("sin trabajos");
  for (const j of trabajos) {
    const n = nombre(j), opcional = /^(confirmación|punta a punta · ancho) /.test(n);
    const ok = verde(j) || (opcional && j?.status === "completed" && j?.conclusion === "skipped");
    if (!ok) return no(`«${n.slice(0, 80)}» terminó ${j?.status}/${j?.conclusion}`);
  }
  for (const [que, re] of FIJOS) { const k = trabajos.filter((j) => re.test(nombre(j))).length; if (k !== 1) return no(`«${que}»: ${k} trabajo(s); tiene que haber uno, en verde`); }
  for (const d of DISPOSITIVOS) { const k = trabajos.filter((j) => nombre(j) === `dispositivo · ${d}`).length; if (k !== 1) return no(`«dispositivo · ${d}»: ${k} trabajo(s); tiene que haber uno, en verde`); }
  for (const c of CARRILES) { const r = carrilCompleto(trabajos, c); if (!r.ok) return r; }
  return { ok: true };
}

/** ¿La corrida (como la da la API) es un push a main de ci.yml de este repo sobre ese commit, terminado en verde? */
export function corridaDePush(r, { sha, repo }) {
  if (!r || typeof r !== "object") return no("corrida vacía");
  if (!SHA40.test(sha ?? "") || r.head_sha !== sha) return no(`es de otro commit (${String(r.head_sha).slice(0, 12)})`);
  if (r.event !== "push") return no(`evento ${r.event}`);
  if (r.head_branch !== "main") return no(`rama ${r.head_branch}`);
  if (r.path !== ".github/workflows/ci.yml") return no(`flujo ${r.path}`);
  if (!repo || r.repository?.full_name !== repo || r.head_repository?.full_name !== repo) return no("de otro repositorio");
  if (r.status !== "completed" || r.conclusion !== "success") return no(`terminó ${r.status}/${r.conclusion}`);
  return { ok: true };
}

/** La corrida y sus trabajos juntos (lo que responde --decidir). */
export function corridaConfirma(r, trabajos, { sha, repo }) {
  try {
    const c = corridaDePush(r, { sha, repo });
    return c.ok ? trabajosCompletos(trabajos) : c;
  } catch (e) {
    return no(`error: ${String(e?.message ?? e).slice(0, 120)}`);
  }
}

/** ¿Hay en la API una corrida que confirme `sha`? api.corridas(sha) → lista; api.trabajos(id) → lista completa. Sin api o con error: no. */
export function confirmado(sha, { repo, api }) {
  try {
    if (!api) return no("sin acceso a la API de GitHub (sin token o sin repo)");
    const lista = api.corridas(sha);
    if (!Array.isArray(lista)) return no("la API respondió algo que no es una lista de corridas");
    const motivos = [];
    for (const r of lista.slice(0, 10)) {
      const c = corridaDePush(r, { sha, repo });
      if (!c.ok) { motivos.push(`${r?.id}: ${c.motivo}`); continue; }
      const t = trabajosCompletos(api.trabajos(r.id));
      if (t.ok) return { ok: true, corrida: r.id };
      motivos.push(`${r.id}: ${t.motivo}`);
    }
    return no(motivos.join(" · ") || "ninguna corrida de ci.yml para ese commit");
  } catch (e) {
    return no(`la API falló (${String(e?.message ?? e).split("\n")[0].slice(0, 160)})`);
  }
}

/** La API de verdad, con «gh api» (GH_TOKEN en el CI; solo lectura). Sin un repo «dueño/nombre»: null. */
export function apiGh({ repo }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? "")) return null;
  const pide = (ruta) => JSON.parse(execFileSync("gh", ["api", "-H", "Accept: application/vnd.github+json", ruta], { encoding: "utf8", timeout: 30000, maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }));
  return {
    corridas: (sha) => { if (!SHA40.test(sha)) throw new Error("commit raro"); return pide(`repos/${repo}/actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=30`).workflow_runs; },
    trabajos: (id) => {
      if (!/^\d+$/.test(String(id))) throw new Error("corrida rara");
      const d = pide(`repos/${repo}/actions/runs/${id}/jobs?filter=latest&per_page=100`);
      if (!Array.isArray(d?.jobs) || d.total_count !== d.jobs.length) throw new Error(`lista de trabajos incompleta (${d?.jobs?.length} de ${d?.total_count})`);
      return d.jobs;
    },
  };
}

/* 22 nov · La puerta de producción (scripts/produccion/promover.sh): mientras no exista el sello de la confirmación completa, se recalcula aquí
   desde la API de trabajos. Una corrida vale para producción si:
   - es de evento push, programada o a mano, en main, de ci.yml de este repo, sobre ese commit, terminada en verde y en su PRIMER intento
     (un «volver a correr lo que falló» no cuenta);
   - sus entradas son las de una corrida entera: el paso «entradas: …» del trabajo «alcance» dice alcance=todo, solo vacío, aprobar=no y
     medir=no (la API no enseña las entradas de una corrida a mano; ci.yml las escribe en el nombre de ese paso);
   - TODOS sus trabajos de regresión, «al revés» y dispositivos están presentes y en verde (no saltados): las partes de «al revés», las de
     «todas las fases» (o, con confirmar=si, las de «confirmación · dos veces seguidas» y «confirmación · barajada»), y los 9 dispositivos.
   PENDIENTE (lo decide el fundador): la «confirmación completa» de la decisión AD (todo dos veces seguidas en la misma base + barajada) es un
   nivel MÁS ALTO que este y todavía no se exige aquí; tampoco los anchos. Hoy pasa la puerta una corrida entera de push en verde. */
export const ENTRADAS_ENTERAS = /^entradas: alcance=todo · solo=«» · aprobar=no · medir=no$/;
export function corridaDeProduccion(r, trabajos, { sha, repo }) {
  try {
    if (!r || typeof r !== "object") return no("corrida vacía");
    if (!SHA40.test(sha ?? "") || r.head_sha !== sha) return no(`es de otro commit (${String(r.head_sha).slice(0, 12)})`);
    if (!["push", "schedule", "workflow_dispatch"].includes(r.event)) return no(`evento ${r.event}`);
    if (r.head_branch !== "main") return no(`rama ${r.head_branch}`);
    if (r.path !== ".github/workflows/ci.yml") return no(`flujo ${r.path}`);
    if (!repo || r.repository?.full_name !== repo || r.head_repository?.full_name !== repo) return no("de otro repositorio");
    if (r.run_attempt !== 1) return no(`intento ${r.run_attempt} (solo vale el primero)`);
    if (r.status !== "completed" || r.conclusion !== "success") return no(`terminó ${r.status}/${r.conclusion}`);
    if (!Array.isArray(trabajos) || !trabajos.length) return no("sin trabajos");
    const al = trabajos.find((j) => /^alcance \(/.test(nombre(j)));
    const entradas = (al?.steps ?? []).map((s) => String(s?.name ?? "")).filter((s) => s.startsWith("entradas: "));
    if (entradas.length !== 1 || !ENTRADAS_ENTERAS.test(entradas[0])) return no(`no es una corrida entera (${entradas[0] ?? "sin el paso de las entradas"})`);
    // Lo de una pasada, salvo «todas las fases», que con confirmar=si corre dentro de la confirmación.
    const sinFases = trabajos.filter((j) => !nombre(j).startsWith("punta a punta · todas las fases"));
    const fases = carrilCompleto(trabajos, "punta a punta · todas las fases");
    const conf = ["confirmación · dos veces seguidas", "confirmación · barajada"].map((c) => carrilCompleto(trabajos, c));
    if (!fases.ok && !conf.every((c) => c.ok)) return no(`la regresión entera no corrió: ${fases.motivo}${conf.some((c) => c.ok) ? "" : " · " + conf.map((c) => c.motivo).join(" · ")}`);
    const t = trabajosCompletos(fases.ok ? trabajos : [...sinFases, { name: "punta a punta · todas las fases", status: "completed", conclusion: "success" }]);
    return t.ok ? { ok: true } : t;
  } catch (e) {
    return no(`error: ${String(e?.message ?? e).slice(0, 120)}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const i = process.argv.indexOf("--produccion");
  if (process.argv.includes("--decidir") || process.argv.includes("--decidir-produccion")) {
    const f = process.argv.includes("--decidir") ? corridaConfirma : corridaDeProduccion;
    let casos;
    try { casos = JSON.parse(readFileSync(0, "utf8")); } catch { casos = null; }
    console.log(JSON.stringify(Array.isArray(casos) ? casos.map((c) => (Array.isArray(c) ? f(c[0], c[1], c[2] ?? {}) : no("caso raro"))) : no("entrada rara")));
  } else if (i > 0) {
    // promover.sh: ¿hay una corrida de ci.yml que deje este commit listo para producción? Sale con 0 solo si la hay.
    const sha = process.argv[i + 1] ?? "";
    let repo = process.env.REPO ?? "", hallada = null;
    try {
      if (!repo) repo = execFileSync("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], { encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "pipe"] }).trim();
      const pide = (ruta) => JSON.parse(execFileSync("gh", ["api", "-H", "Accept: application/vnd.github+json", ruta], { encoding: "utf8", timeout: 30000, maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }));
      if (!SHA40.test(sha) || !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error(`commit o repo raros (${sha} · ${repo})`);
      const lista = pide(`repos/${repo}/actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=50`).workflow_runs;
      if (!Array.isArray(lista)) throw new Error("la API no dio una lista de corridas");
      for (const r of lista) {
        let t = null;
        if (/^\d+$/.test(String(r?.id)) && r?.run_attempt === 1 && r?.conclusion === "success") {
          const d = pide(`repos/${repo}/actions/runs/${r.id}/attempts/1/jobs?per_page=100`);
          if (Array.isArray(d?.jobs) && d.total_count === d.jobs.length) t = d.jobs;
        }
        const c = corridaDeProduccion(r, t, { sha, repo });
        console.log(`  ${c.ok ? "✓" : "·"} corrida ${r?.id} (${r?.event}, ${r?.head_branch}, intento ${r?.run_attempt}): ${c.ok ? "entera y en verde" : c.motivo}`);
        if (c.ok) { hallada = r.id; break; }
      }
    } catch (e) {
      console.log(`  ✗ no se pudo comprobar (${String(e?.message ?? e).split("\n")[0].slice(0, 200)})`);
    }
    if (hallada) console.log(`✓ ${sha.slice(0, 12)}: la corrida ${hallada} lo deja listo para producción (nivel «corrida entera»; la confirmación completa de AD todavía no se exige)`);
    else console.log(`✗ ${sha.slice(0, 12)}: ninguna corrida de ci.yml entera, en main, de primer intento y con todos sus carriles en verde`);
    process.exit(hallada ? 0 : 1);
  }
}
