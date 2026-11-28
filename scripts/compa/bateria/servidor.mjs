/* Batería de El Compa · El camino REAL del servidor. Carga apps/web/lib/compa/conversacion.ts con el mismo transpilador de las pruebas de Node
   (pruebas/lib/ts-servidor.cjs, cargarApp) y LLAMA a sus funciones —turno (vecino), turnoPanel, respuestaAuto (respuestas automáticas y «Sugerir
   respuesta») y borradorCopiloto— contra la base de pruebas (DATABASE_URL): los límites, las conversaciones, el interruptor, el tope y el libro de
   uso son los de verdad, y la búsqueda de ayuda es la de Postgres (ayuda-indice.ts trozosCompa, con sus sinónimos). Nada de esto reproduce el orden
   de pasos: lo que conversacion.ts haga primero, pasa primero aquí.
   Lo ÚNICO que se cambia por un doble (y por qué):
   · los lectores de contexto (contexto-vecino, contexto-panel, contexto-negocio no hace falta, contexto-copiloto): lo que el servidor LEERÍA de la
     base de esa persona (sus operaciones, las secciones de su panel, el caso de Soporte) lo trae el escenario del caso (escenarios.json), igual
     que antes. Todo lo que se hace con ese contexto es el código real;
   · audienciasDe: las audiencias de ayuda que lee cada uso (AUDIENCIAS_DEL_USO), sin armar una persona real con sus membresías;
   · proponer (acciones.ts) y pasarAPersona (persona.ts): no se crean acciones ni casos de Soporte reales; el doble anota LO QUE el servidor
     decidió proponer o a quién pasó (validarAccion y todo lo demás de acciones.ts es el real);
   · el avisar de avisos.ts (no se manda ningún aviso) y lo que solo usan las pantallas (admin, mensajes);
   · los dos modelos (modelo-claude, modelo-simulador): el REAL, envuelto para contar las llamadas, ponerles el tope de la corrida (solo el real
     gasta) y poner el identificador del modelo de la corrida; el motor lo elige la variable que modelo.ts ya lee (TOLATINO_COMPA_MOTOR).
   Cada paso (tapar, detectar, buscar ayuda, gastar, modelo, verificar, anotar uso) queda en un registro por pregunta: el corredor revisa el ORDEN
   (revisarOrden): un cambio en el orden de pasos de conversacion.ts lo cae. */
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import { RAIZ, TopeDeLlamadas } from "./motor.mjs";

const require = createRequire(import.meta.url);
/* La base de pruebas: DATABASE_URL del entorno o, si no, la de los secretos de la corrida local (pruebas/lib/entorno.cjs: solo rellena lo que falta). */
if (!process.env.DATABASE_URL) { try { require("../../../pruebas/lib/entorno.cjs"); } catch { /* sin secretos: base() lo dice */ } }
const TS = require("../../../pruebas/lib/ts-servidor.cjs");
const LIB = "apps/web/lib/compa";
const als = new AsyncLocalStorage();
const hoy = () => als.getStore();

const delEntorno = (n) => (process.env[n] ?? "").trim() || null;
const DOBLE_LLAVES = { llaveYa: delEntorno, llave: async (n) => delEntorno(n) };
const mudo = () => new Proxy(function () {}, { get: (_t, k) => (k === "__esModule" ? false : mudo()), apply: () => mudo() });
/* Lo que solo usan las pantallas o manda avisos: un objeto mudo (si algo de esto se llamara en el camino, lo vería la prueba: devuelve otro mudo). */
const COMUNES = { "apps/web/lib/llaves-proveedores.ts": DOBLE_LLAVES, "apps/web/lib/admin.ts": mudo(), "apps/web/lib/mensajes.ts": mudo(), "apps/web/lib/avisos.ts": { avisar: async () => undefined },
  "../../../../scripts/ayuda/forma.mjs": require("../../ayuda/forma.mjs") };   // el partidor de la ayuda (lo usa ayuda-indice.ts al editar; es ESM)
const real = (rel, extra = {}) => TS.cargarApp(rel, { ...COMUNES, ...extra });

/* ── El registro de pasos de una pregunta ── */
const anotar = (k, d = {}) => { const s = hoy(); if (s) s.eventos.push({ k, ...d }); };
const espiar = (nombre, f) => (...a) => { anotar(nombre, { arg: typeof a[0] === "string" ? a[0] : undefined }); return f(...a); };

let _S = null, _motor = null;
export function servidor({ motor, eng = null, ids = {} }) {
  if (_S && _motor !== motor) throw new Error("el servidor real ya está cargado con otro motor en este proceso");
  if (_S) return _S;
  _motor = motor;
  if (motor === "claude") delete process.env.TOLATINO_COMPA_MOTOR; else process.env.TOLATINO_COMPA_MOTOR = motor;
  const T = real(`${LIB}/tapar.ts`), R = real(`${LIB}/reglas.ts`), V = real(`${LIB}/verificar.ts`), A = real(`${LIB}/acciones.ts`), AY = real(`${LIB}/ayuda-indice.ts`);
  const CP = real(`${LIB}/contexto-panel.ts`), TO = real(`${LIB}/tope.ts`), MC = real(`${LIB}/modelo-claude.ts`), MS = (() => { try { return real(`${LIB}/modelo-simulador.ts`); } catch (e) { return { error: String(e?.message ?? e) }; } })();
  /* Los dos modelos: el real, contado y con tope; el identificador del modelo de la corrida (Configuración › compa_models) para el real. */
  const envolver = (base, nombre) => base && !base.error ? { ...base, responder: async (entrada) => {
    const s = hoy();
    if (s) s.eventos.push({ k: "modelo", entrada });
    if (nombre === "claude" && eng) {
      if (eng.llamadas >= eng.max) { if (s) s.tope = `tope de ${eng.max} llamadas al modelo`; throw new TopeDeLlamadas(`tope de ${eng.max} llamadas al modelo`); }
      eng.llamadas++;
    }
    const e2 = nombre === "claude" && (ids.cotidiano || ids.copiloto) ? { ...entrada, modelo: entrada.uso === "copilot" ? ids.copiloto : ids.cotidiano } : entrada;
    const sal = await base.responder(e2);
    if (eng) { eng.tokens.entrada += sal.tokens?.entrada ?? 0; eng.tokens.salida += sal.tokens?.salida ?? 0; }
    return sal;
  } } : base;
  const claude = envolver(MC.claude, "claude"), simulador = envolver(MS.simulador, "simulador");
  const stubs = {
    ...COMUNES,
    [`${LIB}/tapar.ts`]: { ...T, tapar: espiar("tapar", T.tapar) },
    [`${LIB}/reglas.ts`]: { ...R, detectar: espiar("detectar", R.detectar), detectarAuto: espiar("detectarAuto", R.detectarAuto), detectarPanel: espiar("detectarPanel", R.detectarPanel) },
    [`${LIB}/verificar.ts`]: { ...V, verificar: espiar("verificar", V.verificar), verificarAuto: espiar("verificarAuto", V.verificarAuto), verificarCopiloto: espiar("verificarCopiloto", V.verificarCopiloto) },
    [`${LIB}/modelo-claude.ts`]: { ...MC, claude },
    [`${LIB}/modelo-simulador.ts`]: { ...MS, simulador },
    [`${LIB}/tope.ts`]: { ...TO, gastar: (...a) => { anotar("gastar"); return TO.gastar(...a); }, anotarUso: (...a) => { anotar("anotarUso", { resultado: a[0]?.resultado }); return TO.anotarUso(...a); } },
    /* La búsqueda de ayuda es la real (Postgres); se anotan los trozos que devolvió y las audiencias las da el caso. */
    [`${LIB}/ayuda-indice.ts`]: { ...AY, audienciasDe: async () => hoy()?.audiencias ?? ["vecino"],
      trozosCompa: async (...a) => { const r = await AY.trozosCompa(...a); const s = hoy(); if (s) { s.eventos.push({ k: "ayuda", arg: a[0] }); s.hallados.push(...r); } return r; } },
    [`${LIB}/contexto-vecino.ts`]: { contextoVecino: async () => hoy().vecino },
    [`${LIB}/contexto-panel.ts`]: { ...CP, contextoPanel: async () => hoy().panel },
    [`${LIB}/contexto-copiloto.ts`]: { contextoCopiloto: async () => hoy().copiloto },
    [`${LIB}/persona.ts`]: { pasarAPersona: async (x) => { const s = hoy(); s.eventos.push({ k: "persona", motivo: x.motivo }); s.persona = x.motivo; return { ok: true, caso: "TK-0000", promesa: { es: "Una persona del equipo te va a contestar.", en: "A person on the team will answer you." } }; } },
    [`${LIB}/acciones.ts`]: { ...A, proponer: async (_c, x) => { const s = hoy(); s.eventos.push({ k: "proponer", tipo: x.p.type }); s.propuesta = x.p; return "0"; } },
  };
  const conv = TS.cargarApp(`${LIB}/conversacion.ts`, stubs);
  _S = { conv, T, R, V, motor, claude, simulador, hayClave: MC.hayClave, SISTEMAS: ["SISTEMA_VECINO", "SISTEMA_PANEL", "SISTEMA_AUTO", "SISTEMA_BORRADOR", "SISTEMA_COPILOTO"] };
  return _S;
}

/* Correr algo con el contexto de UNA pregunta (el registro de pasos, lo que el escenario le pone a los lectores). */
export async function conContexto(datos, f) {
  const s = { eventos: [], hallados: [], persona: null, propuesta: null, ...datos };
  const r = await als.run(s, () => f(s));
  // conversacion.ts atrapa el error de una llamada al modelo (cae a las reglas): el tope de la batería no puede pasar por ahí, así que se avisa aquí.
  if (s.tope) throw new TopeDeLlamadas(s.tope);
  return { r, s };
}

/* ── Las personas de la prueba: una por pregunta, estables entre corridas (+1570555 + 4 dígitos), solo en la base de pruebas ── */
let _pg = null;
export async function base() {
  if (_pg) return _pg;
  if (!process.env.DATABASE_URL) throw new Error("falta DATABASE_URL (la batería llama al servidor real y necesita la base de pruebas: corre pruebas/servir/base.sh o pásala)");
  const { Pool } = require(require.resolve("pg", { paths: [`${RAIZ}/apps/web`] }));
  _pg = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  return _pg;
}
export async function cerrarBase() { if (_pg) { await _pg.end(); _pg = null; } }
export const TEL_BASE = 7000;   // 5705557000 … 5705559999
export async function fixtures(n, ciudad = "hzl") {
  if (n > 3000) throw new Error("la batería pide más de 3000 personas de prueba");
  const pg = await base(), tels = Array.from({ length: n }, (_, i) => `+1570555${TEL_BASE + i}`);
  await pg.query(`insert into users (phone, phone_verified_at, first_name, lang, home_city_id, is_test)
                  select t, now(), 'Bateria', 'es', $2, true from unnest($1::text[]) t on conflict (phone) do nothing`, [tels, ciudad]);
  const ids = (await pg.query(`select phone, id::text from users where phone = any($1::text[])`, [tels])).rows;
  const por = new Map(ids.map((r) => [r.phone, r.id]));
  // Los límites por persona son por hora y por día: los mensajes de corridas anteriores pasan a hace 2 días (solo en esta base; la prueba compa7c hace lo mismo).
  const c = await pg.connect();
  try { await c.query("begin"); await c.query("set local session_replication_role = replica");
    await c.query(`update compa_messages set at = at - interval '2 days' where user_id = any($1::uuid[]) and at > now() - interval '1 day'`, [[...por.values()]]);
    await c.query("commit"); } catch (e) { await c.query("rollback").catch(() => undefined); throw e; } finally { c.release(); }
  // El copiloto trabaja sobre un caso de Soporte (compa_drafts lo exige): uno por persona de prueba, TK-9NNNN.
  const nums = tels.map((_, i) => `TK-9${TEL_BASE + i}`);
  await pg.query(`insert into support_cases (number, user_id, city_id, topic, origin, summary, sla_due_at, is_test)
                  select n, u, $3, 'pago', 'form', 'caso de la batería de El Compa', now() + interval '3 days', true from unnest($1::text[], $2::uuid[]) as x(n, u) on conflict (number) do nothing`, [nums, tels.map((t) => por.get(t)), ciudad]);
  const casos = new Map((await pg.query(`select number, id::text from support_cases where number = any($1::text[])`, [nums])).rows.map((r) => [r.number, r.id]));
  return tels.map((t, i) => ({ id: por.get(t), casoNum: nums[i], casoId: casos.get(nums[i]) }));
}
