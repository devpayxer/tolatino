/* Batería de El Compa · El motor sin base ni servidor. Carga el código REAL de apps/web/lib/compa/ (el mismo que corre en el servidor: tapar, reglas
   fijas, verificador de salida, las tres implementaciones del modelo, los sistemas fijos y la validación de acciones) con el transpilador de
   pruebas/lib/ts-servidor.cjs, y reproduce el camino de cada uso (conversacion.ts: turno, turnoPanel, respuestaAuto, borradorCopiloto) con lo que
   el servidor lee de la base puesto a mano en el caso (escenarios.json). Lo que NO está aquí: la base, los límites por persona, el tope de gasto
   del mes (la batería tiene el suyo: --max-llamadas), la búsqueda de Postgres (ayuda.mjs) y el libro de uso.
   Si conversacion.ts cambia el orden de lo que decide (servidor → ayuda → modelo → verificador → reglas), este archivo se corrige a la par: el
   guardián bateriaCompaFija compara las llamadas a detectar/verificar de los dos. */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, posix } from "node:path";
import { trozosDelCaso } from "./ayuda.mjs";

const require = createRequire(import.meta.url);
const TS = require("../../../pruebas/lib/ts-servidor.cjs");
export const RAIZ = TS.RAIZ;
const LIB = "apps/web/lib/compa";

/* Todo lo que el archivo importa y no es del núcleo de El Compa (la base, la sesión, los módulos de cobros…) se cambia por un objeto mudo: estos
   archivos solo lo usan DENTRO de funciones que la batería no llama. Si un archivo del núcleo se importa a sí mismo mal, falla fuerte (no mudo). */
const mudo = () => new Proxy(function () {}, { get: (_t, k) => (k === "__esModule" ? false : mudo()), apply: () => mudo() });
const delEntorno = (n) => (process.env[n] ?? "").trim() || null;
const DOBLE_LLAVES = { llaveYa: delEntorno, llave: async (n) => delEntorno(n) };
function cargarReal(rel, reales = []) {
  const src = readFileSync(join(RAIZ, rel), "utf8"), stubs = {};
  for (const m of src.matchAll(/from "(\.{1,2}\/[^"]+)"/g)) {
    const base = posix.join(posix.dirname(rel), m[1]);
    if (reales.some((r) => base === `${LIB}/${r}`)) continue;
    // El lector de llaves de la app (lib/llaves-proveedores.ts) lee el entorno y, si no, el llavero de la base. La batería corre sin base: su doble lee
    // SOLO el entorno (un doble mudo diría que hay llave siempre y el corredor llamaría al modelo real sin ella).
    if (base === "apps/web/lib/llaves-proveedores") { stubs[`${base}.ts`] = DOBLE_LLAVES; continue; }
    stubs[`${base}.ts`] = mudo(); stubs[`${base}.tsx`] = mudo();
  }
  return TS.cargarApp(rel, stubs);
}
const NUCLEO = ["modelo", "modelo-reglas", "reglas", "tapar", "verificar", "modelo-claude", "modelo-simulador"];
const real = (n) => cargarReal(`${LIB}/${n}.ts`, NUCLEO);

let _M = null;
export function modulos() {
  if (_M) return _M;
  const m = real("modelo"), r = real("reglas"), t = real("tapar"), v = real("verificar"), mr = real("modelo-reglas"), mc = real("modelo-claude");
  const conv = cargarReal(`${LIB}/conversacion.ts`, NUCLEO);
  const acc = cargarReal(`${LIB}/acciones.ts`, NUCLEO), cp = cargarReal(`${LIB}/contexto-panel.ts`, NUCLEO);
  let simulador = null;
  try { simulador = real("modelo-simulador").simulador; } catch (e) { simulador = { error: String(e?.message ?? e) }; }   // en producción el archivo se niega a cargar
  _M = { m, r, t, v, mr, mc, conv, acc, cp, simulador, claude: mc.claude, hayClave: mc.hayClave };
  return _M;
}

/* ── El modelo elegido ── */
export class TopeDeLlamadas extends Error {}
export function crearMotor(nombre, { max = 0, esperaMs = 20000, ids = {} } = {}) {
  const M = modulos(), o = { nombre, llamadas: 0, max, esperaMs, ids, responder: null, tokens: { entrada: 0, salida: 0 } };
  if (nombre === "reglas") return o;
  const base = nombre === "claude" ? M.claude : M.simulador;
  if (!base || base.error) throw new Error(`el motor «${nombre}» no está disponible${base?.error ? `: ${base.error}` : ""}`);
  o.responder = async (entrada) => {
    // Sin reintentos silenciosos y con tope: una llamada de más no se hace (y la corrida lo dice).
    if (nombre === "claude" && o.llamadas >= o.max) throw new TopeDeLlamadas(`tope de ${o.max} llamadas al modelo`);
    o.llamadas++;
    const s = await base.responder({ ...entrada, esperaMs: o.esperaMs });
    o.tokens.entrada += s.tokens?.entrada ?? 0; o.tokens.salida += s.tokens?.salida ?? 0;
    return s;
  };
  return o;
}

/* ── Utilidades ── */
const limpio = (s, n) => String(s ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const NADA = { tipo: "ninguna", ref: "", pantalla: "" };
const MOTIVO = { dinero: "dinero", seguridad: "seguridad", pidio: "pidio", cuenta: "cuenta" };
const bi = (x, lang) => (x && typeof x === "object" ? x[lang] ?? x.es : x);
const ESQ = { maxTokens: 600 };

async function consultar(eng, M, e, verificador) {
  if (!eng.responder) return { ok: false, porque: "sin_ia" };
  const id = eng.nombre === "simulador" ? "simulador" : e.uso === "copilot" ? eng.ids.copiloto : eng.ids.cotidiano;
  if (!id) throw new Error("falta el identificador del modelo (variable de entorno de la corrida)");
  try {
    const sal = await eng.responder({ ...e, modelo: id, maxTokens: ESQ.maxTokens });
    const v = verificador(sal.json);
    return v.ok ? { ok: true, r: v.r, motor: sal.motor } : { ok: false, porque: `verificador:${v.motivo}`, crudo: sal.json };
  } catch (err) {
    if (err instanceof TopeDeLlamadas) throw err;
    return { ok: false, porque: `error:${err?.tipo ?? "falla"}` };
  }
}
const mensajesDe = (M, caso, texto) => [...(caso.historial ?? []).map((h) => ({ de: h.de, texto: M.t.tapar(h.texto).texto })), { de: "persona", texto }];
const trozosTapados = (M, lista) => lista.map((z) => ({ ...z, texto: M.t.tapar(z.texto).texto }));
const leyo = (trozos) => trozos.map((z) => `${z.titulo} ${z.seccion} ${z.texto}`);

/* Lo que se le entrega a la revisión de lo que el motor pudo leer (nunca lo que escribió la persona). */
function ctxRevision({ uso, ayuda, aud, trozos, permitido, extra = {} }) {
  const mapa = new Map([...ayuda.entries()].map(([k, a]) => [k, a.audiencia]));
  return { permitido, fuentes: trozos.map((z) => z.fuente), audiencias: aud, ayuda: mapa, telefonos: [], notas: [], operaciones: [], confirmadas: false, ...extra };
}

/* ════════ Vecino (conversacion.ts turno) ════════ */
function opsDe(esc, lang) {
  const ops = esc.operaciones ?? [];
  const refs = new Map(ops.map((o) => [o.ref, { id: "0", numero: o.numero, kind: o.kind, status: o.status, detail: null, pago: o.pago ?? null, negocio: o.negocio, negocioId: "x", cancelableGratis: !!o.cancelable_gratis }]));
  const datos = { persona: { nombre: esc.nombre ?? null, idioma: lang, ciudad: esc.ciudad ?? null },
    operaciones: ops.map((o) => ({ ref: o.ref, numero: o.numero, tipo: bi(o.tipo, lang), negocio: o.negocio, estado: bi(o.estado, lang), cuando: o.cuando, total: o.total ?? null, cancelable_gratis: !!o.cancelable_gratis })) };
  return { refs, datos, texto: JSON.stringify(datos), confirmadas: ops.some((o) => o.status === "confirmed"), cancelables: ops.filter((o) => o.cancelable_gratis).map((o) => o.ref) };
}

export async function turnoVecino(M, eng, { caso, texto, lang, esc, idx, lineas }) {
  const L = M.r.LINEAS, t = M.t.tapar(limpio(texto, 800)), aviso = t.tapado;
  const base = { uso: "neighbor", lang, motor: eng.nombre === "reglas" ? "reglas" : eng.nombre, motor_pedido: eng.nombre, aviso, chips: [], crudo_rechazado: null, porque: "" };
  const aud = ["vecino"], ayuda = idx;
  const cx = opsDe(esc, lang);
  const fija = (txt, tipo, escalo = "", accion = NADA, porque = "") => ({ salida: { ...base, texto: txt[lang], tipo, fuente: "", accion, escalo, fija: true, porque }, ctx: ctxRevision({ uso: "neighbor", ayuda, aud, trozos: [], permitido: cx.texto, extra: { operaciones: cx.cancelables, confirmadas: cx.confirmadas } }), trozos: [] });
  const det = M.r.detectar(t.texto);
  if (det?.tipo === "emergencia") return fija(L.emergencia, "emergencia", "", NADA, "emergencia");
  if (det?.tipo === "dinero" || det?.tipo === "seguridad" || det?.tipo === "pidio") return fija(L[det.tipo === "pidio" ? "pidio" : det.tipo], "persona", MOTIVO[det.tipo], NADA, det.tipo);
  if (det?.tipo === "cuenta") return fija(L.cuenta, "respuesta", "", { tipo: "open_screen", ref: "", pantalla: det.pantalla }, "cuenta");
  const trozos = trozosTapados(M, trozosDelCaso(idx, { pregunta: t.texto, lang, uso: "neighbor", fuentes: caso.fuentes, modo: caso.modoAyuda }));
  const permitido = [cx.texto, ...leyo(trozos)].join("\n");
  const vctx = { fuentes: trozos.map((z) => z.fuente), conCuenta: cx.refs.size > 0, confirmadas: cx.confirmadas, permitidos: [], maxFrases: 3, texto: [permitido, t.texto].join("\n") };
  const ctx = ctxRevision({ uso: "neighbor", ayuda, aud, trozos, permitido: vctx.texto, extra: { operaciones: cx.cancelables, confirmadas: cx.confirmadas } });
  const valida = (a) => M.acc.validarAccion({ uso: "neighbor", accion: a, refs: cx.refs });
  const accionDe = (r, p) => (p ? { tipo: r.accion.tipo, ref: r.accion.ref, pantalla: r.accion.pantalla } : NADA);
  const sal = (r, p, extra = {}) => ({ salida: { ...base, texto: r.respuesta, tipo: r.tipo, fuente: r.fuente, accion: accionDe(r, p), escalo: "", chips: r.chips, fija: false, accion_rechazada: r.accion.tipo !== "ninguna" && !p, ...extra }, ctx, trozos });
  const desdeReglas = (porque, crudo) => {
    const ops = cx.datos.operaciones;
    const v = M.v.verificar(M.mr.responderConReglas({ texto: t.texto, lang, ops, trozos }), vctx);
    const meta = { motor: "reglas", porque, crudo_rechazado: eng.nombre === "reglas" ? null : porque, crudo };
    if (!v.ok) return { salida: { ...base, ...meta, texto: L.noSe[lang], tipo: "no_se", fuente: "", accion: NADA, escalo: "", fija: true }, ctx, trozos };
    return sal(v.r, valida(v.r.accion), meta);
  };
  if (eng.nombre === "reglas") return desdeReglas("reglas");
  const q = await consultar(eng, M, { uso: "neighbor", lang, sistema: M.conv.SISTEMA_VECINO, datos: cx.datos, trozos, mensajes: mensajesDe(M, caso, t.texto) }, (j) => M.v.verificar(j, vctx));
  if (!q.ok) return desdeReglas(q.porque, q.crudo);
  const r = q.r, mot = { dinero: "dinero", seguridad: "seguridad", pidio: "pidio" }[r.persona];
  if (mot) return fija(L[mot === "pidio" ? "pidio" : mot], "persona", mot, NADA, `modelo:${mot}`);
  if (r.persona === "cuenta") return fija(L.cuenta, "respuesta", "", { tipo: "open_screen", ref: "", pantalla: r.accion.pantalla.startsWith("cuenta_") ? r.accion.pantalla : "cuenta_telefono" }, "modelo:cuenta");
  const p = valida(r.accion);
  return sal(r, p, { porque: r.accion.tipo !== "ninguna" && !p ? "accion_rechazada" : "", motor: q.motor });
}

/* ════════ Panel (conversacion.ts turnoPanel) ════════ */
export async function turnoPanel(M, eng, { caso, texto, lang, esc, idx }) {
  const L = M.r.LINEAS, t = M.t.tapar(limpio(texto, 800)), aviso = t.tapado, es = lang === "es";
  const partes = esc.partes ?? ["all"], puede = (p) => !p || partes.includes("all") || partes.includes(p);
  const mk = (s) => ({ code: s.codigo, ruta: s.codigo, parte: s.parte ?? null, needs: "always", title: s.seccion, what: s.que_hay, slugs: s.slugs ?? [], words: s.words ?? [] });
  const secciones = new Map(), prohibidas = new Map();
  for (const s of esc.secciones ?? []) (puede(s.parte) ? secciones : prohibidas).set(s.codigo, mk(s));
  const slugsProhibidos = new Set(); for (const s of prohibidas.values()) for (const g of s.slugs) slugsProhibidos.add(g);
  const pay = puede("pay");
  const datos = { negocio: esc.negocio, categoria: esc.categoria ?? null, tu_rol: bi(esc.rol, lang), abierto_ahora: esc.abierto_ahora ?? null,
    ...(pay ? { plan: bi(esc.plan, lang) } : {}), puedes_abrir: [...secciones.values()].map((s) => ({ codigo: s.code, seccion: s.title[lang], que_hay: s.what[lang] })), cifras: esc.cifras ?? {} };
  const texto0 = JSON.stringify(datos), aud = ["vecino", "negocio"], ayuda = idx;
  const base = { uso: "owner", lang, motor: eng.nombre, motor_pedido: eng.nombre, aviso, chips: [], crudo_rechazado: null, porque: "" };
  const ctx0 = (trozos, permitido) => ctxRevision({ uso: "owner", ayuda, aud, trozos, permitido, extra: { confirmadas: true } });
  const fija = (txt, tipo, escalo = "", porque = "") => ({ salida: { ...base, texto: txt[lang], tipo, fuente: "", accion: NADA, escalo, fija: true, porque }, ctx: ctx0([], texto0), trozos: [] });
  const det = M.r.detectar(t.texto);
  if (det?.tipo === "emergencia") return fija(L.emergencia, "emergencia", "", "emergencia");
  if (det?.tipo === "seguridad") return fija(L.seguridad, "persona", "seguridad", "seguridad");
  if (det?.tipo === "dinero") return pay ? fija(L.dinero, "persona", "dinero", "dinero") : fija(L.dueno, "respuesta", "", "dinero:sin_cobros");
  if (det?.tipo === "pidio") return fija(L.pidio, "persona", "pidio", "pidio");
  if (det?.tipo === "cuenta" || M.r.detectarPanel(t.texto)) return fija(L.panelCuenta, "persona", "cuenta", "cuenta");
  const sec = M.cp.seccionPedida(t.texto, { secciones, prohibidas });
  if (sec && !sec.permitida) return fija(L.dueno, "respuesta", "", `seccion_prohibida:${sec.s.code}`);
  const trozos = trozosTapados(M, trozosDelCaso(idx, { pregunta: t.texto, lang, uso: "owner", fuentes: caso.fuentes, modo: caso.modoAyuda, prohibidos: slugsProhibidos }));
  const permitido = [texto0, ...leyo(trozos)].join("\n");
  const vctx = { fuentes: trozos.map((z) => z.fuente), conCuenta: true, confirmadas: true, permitidos: [], maxFrases: 3, texto: [permitido, t.texto].join("\n") };
  const ctx = ctx0(trozos, vctx.texto);
  const ir = (ref) => M.acc.validarAccion({ uso: "owner", accion: { tipo: "go_to_panel", ref, pantalla: "" }, refs: new Map(), negocio: esc.slug ?? "negocio", secciones });
  const delServidor = sec?.permitida ? ir(sec.s.code) : null;
  const sal = (r, p, extra = {}) => ({ salida: { ...base, texto: r.respuesta, tipo: r.tipo, fuente: r.fuente, accion: p ? { tipo: "go_to_panel", ref: p.target.seccion, pantalla: "" } : NADA, escalo: "", chips: r.chips, fija: false, ...extra }, ctx, trozos });
  const desdeReglas = (porque, crudo) => {
    const v = M.v.verificar(M.mr.responderPanelConReglas({ lang, seccion: sec?.permitida ? { code: sec.s.code, titulo: sec.s.title[lang] } : null, puede: [...secciones.values()].map((z) => z.title[lang]), trozos }), vctx);
    const meta = { motor: "reglas", porque, crudo_rechazado: eng.nombre === "reglas" ? null : porque, crudo };
    if (!v.ok) return { salida: { ...base, ...meta, texto: L.noSe[lang], tipo: "no_se", fuente: "", accion: NADA, escalo: "", fija: true }, ctx, trozos };
    return sal(v.r, v.r.accion.tipo === "go_to_panel" ? ir(v.r.accion.ref) : null, meta);
  };
  if (eng.nombre === "reglas") return desdeReglas("reglas");
  const q = await consultar(eng, M, { uso: "owner", lang, sistema: M.conv.SISTEMA_PANEL, datos, trozos, mensajes: mensajesDe(M, caso, t.texto) }, (j) => M.v.verificar(j, vctx));
  if (!q.ok) return desdeReglas(q.porque, q.crudo);
  const r = q.r, mot = { dinero: "dinero", seguridad: "seguridad", pidio: "pidio", cuenta: "cuenta" }[r.persona];
  if (mot === "dinero") return pay ? fija(L.dinero, "persona", "dinero", "modelo:dinero") : fija(L.dueno, "respuesta", "", "modelo:dinero:sin_cobros");
  if (mot === "seguridad") return fija(L.seguridad, "persona", "seguridad", "modelo:seguridad");
  if (mot === "pidio") return fija(L.pidio, "persona", "pidio", "modelo:pidio");
  if (mot === "cuenta") return fija(L.panelCuenta, "persona", "cuenta", "modelo:cuenta");
  if (r.accion.tipo === "go_to_panel" && prohibidas.has(r.accion.ref)) return fija(L.dueno, "respuesta", "", `modelo:seccion_prohibida:${r.accion.ref}`);
  const p = r.accion.tipo === "go_to_panel" ? ir(r.accion.ref) : null;
  if (r.accion.tipo !== "ninguna" && !p) return desdeReglas("accion_rechazada", q.crudo);
  return sal(r, p ?? delServidor, { motor: q.motor });
}

/* ════════ Cliente que escribe a un negocio cerrado (conversacion.ts respuestaAuto) y «Sugerir respuesta» ════════ */
const TEMA_ETQ = { hours: ["Horario y dirección", "Hours and address"], menu: ["Menú, servicios y precios", "Menu, services and prices"], how_to_order: ["Cómo pedir o reservar", "How to order or book"], faq: ["Tus preguntas frecuentes", "Your FAQ"] };
function datosNegocio(esc, lang, borrador) {
  // Solo lo de los temas que el dueño encendió (contexto-negocio.ts): lo apagado no llega al modelo ni al verificador.
  const es = lang === "es", T = new Set(esc.temas ?? []), items = T.has("menu") ? (esc.items ?? []).map((x) => ({ nombre: x.nombre, precio: x.precio ?? "", agotado: !!x.agotado })) : [];
  const hor = T.has("hours") ? { horario: bi(esc.horario, lang) ?? "", proxima: bi(esc.proxima, lang) ?? "", direccion: bi(esc.direccion, lang) ?? "" } : { horario: "", proxima: "", direccion: "" };
  const comoPedir = T.has("how_to_order") ? [...(esc.como_pedir ?? []).map((x) => bi(x, lang)), es ? "Todo se pide desde la página del negocio en To'Latino." : "Everything is requested from the business page on To'Latino."] : [];
  const preguntas = T.has("faq") ? (esc.preguntas ?? []).map((x) => ({ q: bi(x.q, lang), a: bi(x.a, lang) })) : [];
  const nota = bi(esc.nota_del_dueno, lang) ?? "";
  const datos = { negocio: esc.negocio, ciudad: esc.ciudad, abierto_ahora: false, ahora: bi(esc.ahora, lang), temas: [...T].map((x) => TEMA_ETQ[x][es ? 0 : 1]),
    ...(T.has("hours") ? { horario: bi(esc.horario, lang), ...(esc.proxima ? { abre_otra_vez: bi(esc.proxima, lang) } : {}), ...(esc.direccion ? { direccion: bi(esc.direccion, lang) } : {}) } : {}),
    ...(T.has("menu") ? { lo_que_ofrece: items.map((x) => ({ nombre: x.nombre, precio: x.precio, ...(x.agotado ? { agotado_hoy: true } : {}) })) } : {}),
    ...(T.has("how_to_order") ? { como_pedir: comoPedir } : {}),
    ...(T.has("faq") && preguntas.length ? { preguntas_frecuentes: preguntas.map((x) => ({ pregunta: x.q, respuesta: x.a })) } : {}),
    ...(nota ? { nota_del_dueno: nota } : {}), ...(borrador ? { borrador: true } : {}) };
  const texto = [esc.negocio, hor.horario, hor.proxima, hor.direccion, ...items.map((x) => `${x.nombre} ${x.precio}`), ...comoPedir, ...preguntas.map((x) => `${x.q} ${x.a}`), nota].join("\n");
  const ctxReglas = { temas: [...T], proxima: hor.proxima || null, direccion: hor.direccion || null, horario: hor.horario || null, items, comoPedir, preguntas };
  return { datos, texto, ctxReglas };
}
export async function turnoAuto(M, eng, { caso, texto, lang, esc, idx }) {
  const L = M.r.LINEAS, LA = M.r.LINEAS_AUTO, N = esc.negocio, borrador = caso.modo === "borrador", ultimo = M.t.tapar(limpio(texto, 800)).texto;
  const nd = datosNegocio(esc, lang, borrador), aud = ["vecino"], ayuda = idx;
  const base = { uso: "auto_reply", borrador, lang, motor: eng.nombre, motor_pedido: eng.nombre, aviso: false, chips: [], crudo_rechazado: null, porque: "" };
  const ctx0 = (trozos, permitido) => ctxRevision({ uso: "auto_reply", ayuda, aud, trozos, permitido, extra: { confirmadas: false } });
  const pasar = (l, porque, tipo = "persona") => (borrador ? { salida: { ...base, texto: LA.borradorRevisar[lang], tipo: "respuesta", fuente: "cuenta", accion: NADA, escalo: "", fija: true, porque: `borrador:${porque}`, motor: "reglas" }, ctx: ctx0([], nd.texto), trozos: [] }
    : { salida: { ...base, texto: l[lang], tipo, fuente: "", accion: NADA, escalo: "negocio", fija: true, porque, motor: "reglas" }, ctx: ctx0([], nd.texto), trozos: [] });
  const det = M.r.detectar(ultimo);
  if (det?.tipo === "emergencia") return pasar(LA.emergencia(N), "emergencia", "emergencia");
  if (det?.tipo === "seguridad") return pasar(LA.seguridad(N), "seguridad");
  if (det?.tipo === "pidio") return pasar(LA.ultimo(N), "pidio");
  if (det || M.r.detectarAuto(ultimo)) return pasar(LA.decide(N), `decide:${det?.tipo ?? "negocio"}`);
  const trozos = trozosTapados(M, trozosDelCaso(idx, { pregunta: ultimo, lang, uso: "auto_reply", fuentes: caso.fuentes, modo: caso.modoAyuda }));
  const permitido = [nd.texto, ...leyo(trozos)].join("\n");   // la página del negocio y la ayuda, NUNCA lo que escribió el cliente
  const vctx = { fuentes: trozos.map((z) => z.fuente), conCuenta: true, confirmadas: false, permitidos: [], maxFrases: 3, texto: permitido };
  const ctx = ctx0(trozos, permitido);
  const reglas = (porque, crudo) => {
    const v = M.v.verificar(M.mr.responderAutoConReglas({ texto: ultimo, lang, ctx: nd.ctxReglas }), vctx), w = v.ok ? M.v.verificarAuto(v.r) : v;
    if (!w.ok || w.r.tipo !== "respuesta") { const p = pasar(LA.noSe(N), `${porque}+reglas`); p.salida.crudo_rechazado = eng.nombre === "reglas" ? null : porque; p.salida.crudo = crudo; return p; }
    return { salida: { ...base, texto: w.r.respuesta, tipo: "respuesta", fuente: w.r.fuente, accion: NADA, escalo: "", fija: false, motor: "reglas", porque, crudo_rechazado: eng.nombre === "reglas" ? null : porque, crudo }, ctx, trozos };
  };
  if (eng.nombre === "reglas") return reglas("reglas");
  const q = await consultar(eng, M, { uso: borrador ? "owner" : "auto_reply", lang, sistema: borrador ? M.conv.SISTEMA_BORRADOR : M.conv.SISTEMA_AUTO, datos: nd.datos, trozos, mensajes: mensajesDe(M, caso, ultimo) }, (j) => M.v.verificar(j, vctx));
  if (!q.ok) return reglas(q.porque, q.crudo);
  const w = M.v.verificarAuto(q.r);
  if (!w.ok) return reglas(`verificador:${w.motivo}`, q.crudo ?? null);
  const r = w.r;
  if (r.tipo === "emergencia") return pasar(LA.emergencia(N), "modelo:emergencia", "emergencia");
  if (borrador && (r.persona !== "ninguno" || r.tipo === "no_se" || r.tipo === "persona")) return reglas(`borrador:${r.persona}:${r.tipo}`);
  if (r.persona !== "ninguno" || r.tipo === "no_se" || r.tipo === "persona") return pasar(r.persona === "dinero" || r.persona === "cuenta" ? LA.decide(N) : LA.noSe(N), `modelo:${r.persona}:${r.tipo}`);
  return { salida: { ...base, texto: r.respuesta, tipo: r.tipo, fuente: r.fuente, accion: NADA, escalo: "", chips: [], fija: false, motor: q.motor }, ctx, trozos };
}

/* ════════ Copiloto del equipo (conversacion.ts borradorCopiloto) ════════ */
export function datosCopiloto(c, lang) {
  const ce = lang === "es", op = c.operacion ?? null, notas = c.notas_internas ?? [], eq = c.equipo_escribio ?? [], prev = c.conversacion_previa ?? [];
  const conv = [...prev.map((x) => `${x.de === "equipo" ? "EQUIPO" : "PERSONA"}: ${x.texto}`), `PERSONA: ${c.mensaje}`];
  const pago = c.cobrado ? { cobrado: c.cobrado, ya_devuelto: c.ya_devuelto ?? "$0.00" } : null;
  const puede = !!c.puede_devolver && !!pago;
  const datos = c.datos ?? {
    tipo: "caso de Soporte de To'Latino (el borrador es la respuesta del equipo en el caso)",
    caso: { numero: c.numero ?? "TK-0001", tema: bi(c.tema, "es"), estado: "lo están viendo", prioridad: c.prioridad ?? "normal", abierto_desde: "la app" },
    persona: { nombre: c.persona?.nombre ?? null, idioma: lang, ciudad: c.persona?.ciudad ?? "Hazleton", casos: 1 }, negocio_que_escribe: null,
    operacion: op ? { numero: op.numero, tipo: bi(op.tipo, "es"), negocio: op.negocio, estado: op.estado, total: op.total ?? null } : null, ayuda_ligada: null, pagado_en_la_app: pago,
    tu_rol: { resolver_y_devolver: puede, devuelve: puede ? "hasta lo cobrado" : "no devuelve" }, resumen_de_el_compa: c.resumen ?? null, dispositivo: null, conversacion: conv,
    notas_internas_del_equipo: notas, macros: (c.macros ?? []).map((m) => ({ clave: m.clave, titulo: m.titulo, texto: m.texto ?? "" })) };
  const publico = [...eq, ...(op ? [`${bi(op.tipo, "es")} ${op.numero} ${op.negocio} ${op.estado} ${op.total ?? ""}`] : []), ...(pago ? [`cobrado ${pago.cobrado} ya devuelto ${pago.ya_devuelto}`] : [])].join("\n");
  const delCaso = [c.mensaje, ...prev.filter((x) => x.de !== "equipo").map((x) => x.texto), c.resumen ?? ""].filter(Boolean).join("\n");
  return { datos, publico, caso: delCaso, internas: notas, puedeDevolver: puede, ultimo: c.mensaje, consulta: `${bi(c.tema, "es")} ${c.mensaje}`.slice(0, 120), ce };
}
export async function turnoCopiloto(M, eng, { caso, texto, lang, esc, idx }) {
  // contexto-copiloto.ts paraModelo: tapado de siempre y, además, sin teléfonos ni correos antes de ir al modelo.
  const pm = (t) => M.t.tapar(String(t ?? "")).texto.replace(/(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[tapado]").replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[tapado]").replace(/\s+/g, " ").trim().slice(0, 600);
  const c = { ...esc, mensaje: pm(texto), notas_internas: (esc.notas_internas ?? []).map(pm), equipo_escribio: (esc.equipo_escribio ?? []).map(pm), conversacion_previa: (esc.conversacion_previa ?? []).map((x) => ({ ...x, texto: pm(x.texto) })) };
  const X = datosCopiloto(c, lang), tema = typeof c.tema === "object" ? c.tema : { es: c.tema, en: c.tema };
  const trozos = trozosTapados(M, trozosDelCaso(idx, { pregunta: X.consulta, lang, uso: "copilot", fuentes: caso.fuentes, modo: caso.modoAyuda }));
  const aud = ["vecino", "negocio", "portero", "equipo"], ayuda = idx;
  const macros = (c.macros ?? []).map((m) => m.clave), confirmadas = c.operacion?.estado === "confirmada";
  const vc = { fuentes: trozos.map((z) => z.fuente), macros, confirmadas, maxBorrador: c.tipo === "ayuda" ? 480 : 2000, puedeDevolver: X.puedeDevolver, publico: [X.publico, ...leyo(trozos)].join("\n"), caso: X.caso, internas: X.internas };
  const ctx = ctxRevision({ uso: "copilot", ayuda, aud, trozos, permitido: vc.publico, extra: { notas: X.internas, confirmadas } });
  const base = { uso: "copilot", lang, motor: eng.nombre, motor_pedido: eng.nombre, aviso: false, chips: [], crudo_rechazado: null, porque: "", tipo: "respuesta", accion: NADA, escalo: "", fija: false };
  const dinero = !!c.cobrado || /cobr|pag[oó]|devol|reembols|cargo|charge|refund|paid|payment/i.test(X.caso);
  const reglas = (porque, crudo) => {
    const v = M.v.verificarCopiloto(M.mr.borradorCopilotoConReglas({ lang, nombre: c.persona?.nombre ?? "", tema, ayuda: c.tipo === "ayuda", op: c.operacion ? { tipo: typeof c.operacion.tipo === "object" ? c.operacion.tipo : { es: c.operacion.tipo, en: c.operacion.tipo }, numero: c.operacion.numero, negocio: c.operacion.negocio } : null,
      dinero, macro: macros[0] ?? "", devolver: X.puedeDevolver && dinero, eq: "es" }), vc);
    const r = v.ok ? v.r : { resumen: `${c.persona?.nombre || "La persona"} escribe sobre ${tema.es}.`, borrador: lang === "es" ? "Hola. Gracias por escribirnos." : "Hi. Thanks for writing to us.", siguiente: "", macro: "", fuente: "", sugerir_devolver: false };
    return { salida: { ...base, motor: "reglas", texto: r.borrador, resumen: r.resumen, siguiente: r.siguiente, macro: r.macro, fuente: r.fuente, sugerir_devolver: r.sugerir_devolver, porque, crudo_rechazado: eng.nombre === "reglas" ? null : porque, crudo }, ctx, trozos };
  };
  if (eng.nombre === "reglas") return reglas("reglas");
  const datos = { ...X.datos, equipo: { idioma: "español" } };
  const q = await consultar(eng, M, { uso: "copilot", lang, sistema: M.conv.SISTEMA_COPILOTO, datos, trozos, mensajes: [{ de: "persona", texto: X.ultimo }], esquema: M.m.ESQUEMA_COPILOTO }, (j) => M.v.verificarCopiloto(j, vc));
  if (!q.ok) return reglas(q.porque, q.crudo);
  const r = q.r;
  return { salida: { ...base, motor: q.motor, texto: r.borrador, resumen: r.resumen, siguiente: r.siguiente, macro: r.macro, fuente: r.fuente, sugerir_devolver: r.sugerir_devolver }, ctx, trozos };
}

export const PIPELINES = { neighbor: turnoVecino, owner: turnoPanel, auto_reply: turnoAuto, copilot: turnoCopiloto };
