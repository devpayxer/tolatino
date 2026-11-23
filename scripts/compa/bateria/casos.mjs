/* Batería de El Compa · Carga y validación de los casos (casos/*.json) y de sus escenarios (casos/escenarios.json). La usan el corredor y el guardián
   bateriaCompaFija: una sola definición de «un caso bien hecho».
   Un caso: { id, audiencia, tema, clase, es, en, contexto, espera, ayuda?, historial?, modo?, nota? }
   - audiencia: vecino · panel (dueño o miembro del panel) · negocio (un cliente le escribe a un negocio cerrado) · equipo (el copiloto)
   - clase: ver ESPERA_DE_FABRICA (revision.mjs): trae lo que el plan exige de esa clase de pregunta
   - es / en: la pregunta en cada idioma (un caso = dos preguntas; el porcentaje se saca sobre las preguntas)
   - contexto: { escenario } (un escenario de escenarios.json que arma lo que el servidor leería de la base) más lo que el caso cambia de él;
     en el equipo, los datos del caso van en `contexto` (sin escenario)
   - espera: lo que una respuesta correcta DEBE y NO DEBE contener (revision.mjs)
   - ayuda: «esperada» (la ficha esperada y parecidas) · «buscar» · «ninguna» (por omisión: esperada si espera.fuente trae fichas, si no, buscar) */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AUDIENCIAS_DEL_USO } from "./ayuda.mjs";
import { ESPERA_DE_FABRICA, idiomaDe, luhn } from "./revision.mjs";

export const DIR = dirname(fileURLToPath(import.meta.url));
export const AUDIENCIAS = ["vecino", "panel", "negocio", "equipo"];
export const USO_DE = { vecino: "neighbor", panel: "owner", negocio: "auto_reply", equipo: "copilot" };
export const PREFIJO = { vecino: "vec", panel: "pan", negocio: "neg", equipo: "equ" };
/* El reparto mínimo por audiencia (el plan pide ≥ 150 preguntas ES/EN y nombra las audiencias: vecino con todos sus temas, el panel, las respuestas
   automáticas a clientes, el copiloto). El plan no da cuotas: esta es la propuesta; el guardián la exige. */
export const CUOTAS = { vecino: 80, panel: 28, negocio: 28, equipo: 16 };
export const TOTAL_MIN = 150;

export function cargarCasos(dir = join(DIR, "casos")) {
  const casos = [], escenarios = JSON.parse(readFileSync(join(dir, "escenarios.json"), "utf8"));
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json") && x !== "escenarios.json").sort()) {
    const lista = JSON.parse(readFileSync(join(dir, f), "utf8"));
    for (const c of lista) casos.push({ ...c, _archivo: f });
  }
  return { casos, escenarios };
}

/* Lo que el caso le da al motor (normalizado). */
export function preparar(caso, escenarios) {
  const esc = caso.audiencia === "equipo" ? { ...(caso.contexto ?? {}) } : { ...(escenarios[caso.audiencia]?.[caso.contexto?.escenario] ?? {}), ...(caso.contexto ?? {}) };
  if (esc.secciones === "@panel") esc.secciones = escenarios.panel_secciones;
  const fuentes = (caso.espera?.fuente ?? []).filter((x) => x && x !== "cuenta");
  const modoAyuda = caso.ayuda ?? (fuentes.length ? "esperada" : "buscar");
  return { esc, fuentes, modoAyuda };
}

const PERMITIDO_TEL = /^570555\d{4}$/;   // regla del repo: teléfonos de prueba solo +1570555 + 4 dígitos
const TARJETAS_PRUEBA = new Set(["4242424242424242", "4000056655665556"]);
const SSN_PRUEBA = new Set(["123-45-6789", "000-00-0000"]);

/* Datos personales que NO pueden estar en una pregunta: teléfonos reales, correos reales, tarjetas fuera de las de prueba, seguros sociales reales. */
export function datosPersonales(texto) {
  const out = [], t = String(texto ?? "");
  for (const m of t.matchAll(/(?:\+?1[\s.-]?)?\(?\b(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/g)) if (!PERMITIDO_TEL.test(`${m[1]}${m[2]}${m[3]}`)) out.push(`teléfono ${m[0]}`);
  for (const m of t.matchAll(/\b[\w.+-]+@([\w-]+\.[\w.-]+)\b/g)) if (!/^(example\.(com|org|net)|prueba\.tolatino\.test)$/i.test(m[1])) out.push(`correo ${m[0]}`);
  for (const m of t.matchAll(/(?:\d[ -]?){12,18}\d/g)) { const d = m[0].replace(/\D/g, ""); if (luhn(d) && !TARJETAS_PRUEBA.has(d)) out.push(`tarjeta ${m[0]}`); }
  for (const m of t.matchAll(/(^|[^\d])(\d{3}-\d{2}-\d{4})(?!\d)/g)) if (!SSN_PRUEBA.has(m[2])) out.push(`seguro social ${m[2]}`);
  return out;
}

export function validar(casos, escenarios, idx) {
  const p = [], falla = (c, m) => p.push(`${c?.id ?? "?"}: ${m}`), ids = new Set();
  if (casos.length < TOTAL_MIN) p.push(`la batería tiene ${casos.length} casos y el plan pide al menos ${TOTAL_MIN}`);
  for (const a of AUDIENCIAS) { const n = casos.filter((c) => c.audiencia === a).length; if (n < CUOTAS[a]) p.push(`audiencia ${a}: ${n} casos y el reparto pide al menos ${CUOTAS[a]}`); }
  for (const c of casos) {
    const rx = new RegExp(`^${PREFIJO[c.audiencia] ?? "zzz"}-\\d{3}$`);
    if (!AUDIENCIAS.includes(c.audiencia)) { falla(c, `audiencia «${c.audiencia}» no existe`); continue; }
    if (!rx.test(String(c.id))) falla(c, `el id es ${PREFIJO[c.audiencia]}-NNN`);
    if (ids.has(c.id)) falla(c, "id repetido"); ids.add(c.id);
    if (!c.tema || typeof c.tema !== "string") falla(c, "falta el tema");
    if (!(c.clase in ESPERA_DE_FABRICA)) falla(c, `clase «${c.clase}» no existe`);
    for (const l of ["es", "en"]) {
      const q = c[l];
      if (typeof q !== "string" || q.trim().length < 3) { falla(c, `falta la pregunta en ${l}`); continue; }
      const d = idiomaDe(q); if (d !== "?" && d !== l && !(c.espera?.sin_reglas ?? []).includes("idioma")) falla(c, `la pregunta «${l}» parece estar en ${d}`);
      for (const x of datosPersonales(q)) falla(c, `la pregunta ${l} lleva un dato personal que no es de prueba (${x})`);
    }
    if (c.es === c.en) falla(c, "es y en son iguales");
    const e = c.espera ?? {};
    for (const s of e.fuente ?? []) {
      if (s === "cuenta" || s === "") continue;
      const a = idx.get(s);
      if (!a) falla(c, `la ficha «${s}» no existe en docs/ayuda`);
      else if (!AUDIENCIAS_DEL_USO[USO_DE[c.audiencia]].includes(a.audiencia)) falla(c, `la ficha «${s}» es de la audiencia ${a.audiencia} y este uso no la lee: el caso sería imposible`);
    }
    for (const s of e.fuente_ok ?? []) if (s && s !== "cuenta" && !idx.has(s)) falla(c, `la ficha «${s}» no existe en docs/ayuda`);
    for (const k of ["debe", "no_debe"]) for (const r of e[k] ?? []) for (const l of ["es", "en"]) {
      const src = typeof r === "string" ? r : r[l] ?? r.es ?? r.en;
      try { new RegExp(src, "i"); } catch { falla(c, `${k}: la expresión «${String(src).slice(0, 40)}» no compila`); }
      if (/[áéíóúüñ]/i.test(String(src ?? "")) && k) falla(c, `${k}: «${String(src).slice(0, 40)}» lleva acentos y la revisión compara sin acentos`);
    }
    const f = ESPERA_DE_FABRICA[c.clase] ?? {};
    if (c.clase === "ficha" && !(e.fuente ?? []).filter((x) => x !== "cuenta").length) falla(c, "clase ficha sin la ficha esperada (espera.fuente)");
    if (!Object.keys(f).length && !Object.keys(e).length) falla(c, "no pide nada comprobable");
    if (c.audiencia === "equipo") { if (!c.contexto?.persona || !c.contexto?.tema) falla(c, "el copiloto necesita contexto.persona y contexto.tema"); }
    else if (!escenarios[c.audiencia]?.[c.contexto?.escenario]) falla(c, `escenario «${c.contexto?.escenario}» no existe para ${c.audiencia}`);
    // La acción pedida existe en la lista cerrada.
    for (const ac of (Array.isArray(e.accion) ? e.accion : e.accion ? [e.accion] : []).filter((x) => x && x !== "ninguna")) {
      if (!["cancel_request", "open_screen", "go_to_panel"].includes(ac.tipo)) falla(c, `acción «${ac.tipo}» fuera de la lista cerrada`);
      if (ac.tipo === "cancel_request") { const ops = (escenarios.vecino?.[c.contexto?.escenario]?.operaciones ?? []).concat(c.contexto?.operaciones ?? []); if (!ops.some((o) => o.ref === ac.ref && o.cancelable_gratis)) falla(c, "pide cancelar una operación que el escenario no tiene como pendiente y gratis (caso imposible)"); }
      if (ac.tipo === "go_to_panel") { const s = (escenarios.panel_secciones ?? []).find((x) => x.codigo === ac.ref); if (!s) falla(c, "pide ir a una sección que el escenario no tiene"); }
    }
  }
  return p;
}
