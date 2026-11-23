#!/usr/bin/env node
/* Batería de El Compa (fase7-compa.md §7 «Calidad del modelo real»): ≥ 150 casos ES/EN con revisión determinista y meta ≥ 95 %. Se corre al cambiar
   reglas, modelo o ayuda, y antes de encender El Compa en producción (con la clave del entorno; gasta dinero, dentro del tope de llamadas).

   Uso:
     TOLATINO_BATERIA_MOTOR=reglas|simulador node scripts/compa/bateria/correr.mjs [--audiencia vecino|panel|negocio|equipo] [--lang es|en] [--solo id,id]
                                                                                    [--json ruta] [--todo] [--plan]
     TOLATINO_BATERIA_MOTOR=claude TOLATINO_BATERIA_MODELO=… TOLATINO_BATERIA_MODELO_COPILOTO=… node scripts/compa/bateria/correr.mjs [--max-llamadas N]
     node scripts/compa/bateria/correr.mjs --casos        los casos propios de la revisión (sin red, sin base, sin motor)

   El motor real SOLO corre con TOLATINO_BATERIA_MOTOR=claude escrito a propósito (sin la variable, el motor es el simulador), con la clave del
   proveedor en el entorno (la lee lib/compa/modelo-claude.ts; este archivo no la nombra ni la imprime) y con los identificadores de los modelos en
   TOLATINO_BATERIA_MODELO (el cotidiano) y TOLATINO_BATERIA_MODELO_COPILOTO: salen de compa_models / Configuración, nunca del código.
   Sin reintentos: una llamada que falla es un caso que cae a las reglas fijas (y la revisión lo cuenta contra el modelo). Tope de llamadas por
   corrida: --max-llamadas o TOLATINO_BATERIA_TOPE_LLAMADAS (por omisión 400 = un poco más de las ~340 preguntas); al llegar al tope la corrida
   para y lo dice (código 6): lo que no corrió no se cuenta como acierto.
   Códigos de salida: 0 meta cumplida · 1 corrida completa por debajo de la meta · 2 mal uso · 3 sin clave del proveedor · 4 prohibido en producción ·
   5 faltan los identificadores de los modelos · 6 se acabó el tope de llamadas (corrida incompleta) · 7 los casos o el motor no cargan.
   Nunca imprime la clave ni una respuesta con un dato personal sin tapar: lo cuenta como fallo y lo tapa al imprimir. */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cargarIndice } from "./ayuda.mjs";
import { AUDIENCIAS, cargarCasos, preparar, USO_DE, validar } from "./casos.mjs";
import { crearMotor, modulos, PIPELINES, RAIZ, TopeDeLlamadas } from "./motor.mjs";
import { revisar, taparParaImprimir } from "./revision.mjs";

export const META = 95;
export const SALIDA = { OK: 0, BAJO_META: 1, MAL_USO: 2, SIN_CLAVE: 3, PRODUCCION: 4, SIN_MODELO: 5, TOPE: 6, NO_CARGA: 7 };
const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; }, flag = (k) => args.includes(k);
const salir = (codigo, msg) => { if (msg) (codigo === 0 ? console.log : console.error)(msg); process.exit(codigo); };

/* Qué motor se pide: la variable. `--motor` solo cambia entre los dos que no gastan (nunca pide el real). */
export function motorPedido(env = process.env, o = null) {
  const v = String(env.TOLATINO_BATERIA_MOTOR ?? "simulador").trim();
  if (o) { if (o === "claude") return { error: "el motor real solo se pide con la variable TOLATINO_BATERIA_MOTOR=claude (no con --motor)" }; if (!["reglas", "simulador"].includes(o)) return { error: `--motor ${o}: reglas o simulador` }; return { motor: o }; }
  if (!["reglas", "simulador", "claude"].includes(v)) return { error: `TOLATINO_BATERIA_MOTOR=${v}: reglas, simulador o claude` };
  return { motor: v };
}

async function main() {
  if (flag("--casos")) { const { correrCasos } = await import("./revision-casos.mjs"); process.exit(correrCasos() ? 0 : 1); }
  if (String(process.env.TOLATINO_ENTORNO ?? "") === "produccion") salir(SALIDA.PRODUCCION, "La batería no corre en el entorno de producción (el simulador no existe allí y el motor real se mide en el sandbox).");
  const mp = motorPedido(process.env, opt("--motor"));
  if (mp.error) salir(SALIDA.MAL_USO, mp.error);
  const nombre = mp.motor;
  let casos, escenarios, idx, M;
  try { ({ casos, escenarios } = cargarCasos()); idx = cargarIndice(RAIZ); M = modulos(); } catch (e) { salir(SALIDA.NO_CARGA, `No cargan los casos o el motor: ${String(e?.message ?? e).slice(0, 300)}`); }
  const malos = validar(casos, escenarios, idx);
  if (malos.length) salir(SALIDA.NO_CARGA, `Los casos no pasan su validación (${malos.length}):\n  ${malos.slice(0, 12).join("\n  ")}`);

  // El motor real: la variable explícita, la clave del entorno (sin decir cuál es) y los identificadores de los modelos.
  const max = Number(opt("--max-llamadas") ?? process.env.TOLATINO_BATERIA_TOPE_LLAMADAS ?? 400);
  const ids = { cotidiano: process.env.TOLATINO_BATERIA_MODELO, copiloto: process.env.TOLATINO_BATERIA_MODELO_COPILOTO };
  if (nombre === "claude") {
    if (!M.hayClave()) salir(SALIDA.SIN_CLAVE, "El motor real necesita la clave del proveedor en el entorno de la corrida (secretos del entorno; nunca en el chat ni en el repo). No hay clave: no se corrió nada.");
    if (!ids.cotidiano || !ids.copiloto) salir(SALIDA.SIN_MODELO, "Faltan TOLATINO_BATERIA_MODELO y TOLATINO_BATERIA_MODELO_COPILOTO (los identificadores salen de Configuración › compa_models, no del código). No se corrió nada.");
    if (!Number.isFinite(max) || max < 1) salir(SALIDA.MAL_USO, "--max-llamadas: un número mayor que cero");
  }

  let sel = casos;
  if (opt("--audiencia")) { if (!AUDIENCIAS.includes(opt("--audiencia"))) salir(SALIDA.MAL_USO, `--audiencia: ${AUDIENCIAS.join(", ")}`); sel = sel.filter((c) => c.audiencia === opt("--audiencia")); }
  if (opt("--solo")) { const s = new Set(opt("--solo").split(",")); sel = sel.filter((c) => s.has(c.id)); }
  const langs = opt("--lang") ? [opt("--lang")] : ["es", "en"];
  if (langs.some((l) => !["es", "en"].includes(l))) salir(SALIDA.MAL_USO, "--lang: es o en");
  const unidades = sel.flatMap((c) => langs.map((l) => ({ c, l })));
  if (flag("--plan")) salir(0, `Motor: ${nombre}${nombre === "claude" ? ` (tope ${max} llamadas, ${unidades.length} preguntas)` : ""} · casos: ${sel.length} · preguntas: ${unidades.length} · no se llamó a nada.`);

  const eng = crearMotor(nombre, { max, ids });
  const resultados = new Array(unidades.length);
  let parar = null, i = 0;
  const trabajo = async () => {
    while (!parar) {
      const k = i++; if (k >= unidades.length) return;
      const { c, l } = unidades[k], { esc, fuentes, modoAyuda } = preparar(c, escenarios);
      const t0 = Date.now(), base = { id: c.id, lang: l, audiencia: c.audiencia, tema: c.tema, clase: c.clase, pregunta: taparParaImprimir(l === "es" ? c.es : c.en) };
      try {
        const r = await PIPELINES[USO_DE[c.audiencia]](M, eng, { caso: { ...c, fuentes, modoAyuda }, texto: l === "es" ? c.es : c.en, lang: l, esc, idx });
        const rev = revisar({ ...c, lang: l }, r.salida, r.ctx);
        const dato = rev.fallos.some((f) => ["sin_telefono_ni_correo", "sin_dato_crudo", "no_eco"].includes(f.regla));
        const s = r.salida;
        resultados[k] = { ...base, ok: rev.ok, fallos: rev.fallos, motor_final: s.motor, escalo: s.escalo ?? "", fuente: s.fuente ?? "", tipo: s.tipo, accion: s.accion?.tipo ?? "ninguna", porque: s.porque ?? "", crudo_rechazado: s.crudo_rechazado ?? null,
          dato_personal_sin_tapar: dato, texto: taparParaImprimir(s.texto), ms: Date.now() - t0, ...(s.uso === "copilot" ? { resumen: taparParaImprimir(s.resumen ?? ""), siguiente: taparParaImprimir(s.siguiente ?? "") } : {}) };
      } catch (e) {
        if (e instanceof TopeDeLlamadas) { parar = e.message; resultados[k] = { ...base, ok: false, sin_correr: true, fallos: [{ regla: "sin_correr", porque: "se acabó el tope de llamadas antes de llegar a esta pregunta" }] }; return; }
        resultados[k] = { ...base, ok: false, fallos: [{ regla: "error_del_corredor", porque: String(e?.message ?? e).slice(0, 200) }] };
      }
    }
  };
  await Promise.all(Array.from({ length: nombre === "claude" ? 1 : 6 }, trabajo));
  for (let k = 0; k < resultados.length; k++) if (!resultados[k]) { const { c, l } = unidades[k]; resultados[k] = { id: c.id, lang: l, audiencia: c.audiencia, tema: c.tema, clase: c.clase, ok: false, sin_correr: true, fallos: [{ regla: "sin_correr", porque: "no corrió" }] }; }

  // La tabla: por audiencia y total, sobre las preguntas (cada caso en cada idioma); y por caso (pasa si pasan sus dos idiomas).
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  const fila = (r) => ({ preguntas: r.length, ok: r.filter((x) => x.ok).length, casos: new Set(r.map((x) => x.id)).size, casos_ok: [...new Set(r.map((x) => x.id))].filter((id) => r.filter((x) => x.id === id).every((x) => x.ok)).length });
  const porAud = Object.fromEntries(AUDIENCIAS.map((a) => [a, fila(resultados.filter((r) => r.audiencia === a))]).filter(([, f]) => f.preguntas));
  const total = fila(resultados), porcentaje = pct(total.ok, total.preguntas);
  const sinCorrer = resultados.filter((r) => r.sin_correr).length;
  const caidas = resultados.filter((r) => r.crudo_rechazado).length;
  console.log(`\nBatería de El Compa · motor ${nombre}${nombre === "claude" ? ` · ${eng.llamadas} llamadas de ${max}` : ""} · ${total.casos} casos · ${total.preguntas} preguntas${sinCorrer ? ` (${sinCorrer} sin correr)` : ""}`);
  console.log("audiencia    casos  preguntas   bien      %");
  for (const [a, f] of Object.entries(porAud)) console.log(`${a.padEnd(12)} ${String(f.casos).padStart(5)} ${String(f.preguntas).padStart(10)} ${String(f.ok).padStart(6)} ${String(pct(f.ok, f.preguntas)).padStart(6)} %`);
  console.log(`${"TOTAL".padEnd(12)} ${String(total.casos).padStart(5)} ${String(total.preguntas).padStart(10)} ${String(total.ok).padStart(6)} ${String(porcentaje).padStart(6)} %   (meta ${META} %) · casos con sus dos idiomas bien: ${total.casos_ok}/${total.casos} (${pct(total.casos_ok, total.casos)} %)`);
  if (nombre !== "reglas") console.log(`El verificador de salida descartó lo que dijo el motor y contestaron las reglas fijas en ${caidas} preguntas.`);
  const peor = {}; for (const r of resultados) for (const f of r.fallos ?? []) peor[f.regla] = (peor[f.regla] ?? 0) + 1;
  const reglas = Object.entries(peor).sort((a, b) => b[1] - a[1]);
  if (reglas.length) console.log(`Reglas que más fallan: ${reglas.slice(0, 8).map(([r, n]) => `${r} ${n}`).join(" · ")}`);
  const malas = resultados.filter((r) => !r.ok);
  const limite = flag("--todo") ? malas.length : 25;
  if (malas.length) console.log(`\nFallos (${malas.length}${malas.length > limite ? `, los primeros ${limite}; --todo para todos` : ""}):`);
  for (const r of malas.slice(0, limite)) console.log(`  ${r.id} ${r.lang} [${r.clase}] «${taparParaImprimir(String(r.pregunta ?? "")).slice(0, 70)}» → ${r.fallos.map((f) => `${f.regla}: ${f.porque}`).join(" | ")}${r.dato_personal_sin_tapar ? " | (la respuesta traía un dato personal: tapada aquí)" : ""}`);
  const json = opt("--json") ?? join(tmpdir(), `bateria-compa-${nombre}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  mkdirSync(join(json, ".."), { recursive: true });
  writeFileSync(json, JSON.stringify({ motor: nombre, meta: META, porcentaje, total, por_audiencia: porAud, llamadas: eng.llamadas, tokens: eng.tokens, sin_correr: sinCorrer, descartadas_por_el_verificador: caidas, reglas_que_fallan: Object.fromEntries(reglas), resultados }, null, 1) + "\n");
  console.log(`\nJSON completo: ${json}`);
  if (parar) salir(SALIDA.TOPE, `Se acabó el tope de llamadas (${parar}). La corrida está incompleta: ${sinCorrer} preguntas no corrieron y cuentan como no pasadas.`);
  process.exit(porcentaje >= META && !sinCorrer ? SALIDA.OK : SALIDA.BAJO_META);
}
if (import.meta.url === `file://${process.argv[1]}`) main();
