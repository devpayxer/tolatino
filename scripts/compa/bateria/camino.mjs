/* Batería de El Compa · Los cuatro usos por el CAMINO REAL del servidor (servidor.mjs carga conversacion.ts y lo llama). Aquí solo se arma lo que el
   servidor leería de la base de esa persona (el escenario del caso: operaciones, secciones del panel, página del negocio, caso de Soporte), se
   llama a la función de siempre y se traduce lo que devolvió a la «salida» que revisa revision.mjs. Nada de lo que decide el servidor está aquí.
   - vecino:   conversacion.turno
   - panel:    conversacion.turnoPanel
   - negocio:  conversacion.respuestaAuto (respuestas automáticas a un cliente y «Sugerir respuesta»; quien la llama, unaRespuestaAuto, tapa el
               mensaje antes: aquí lo hace la batería con el mismo tapar())
   - equipo:   conversacion.borradorCopiloto
   revisarOrden() mira el registro de pasos de cada pregunta (servidor.mjs): el orden que exige el plan (servidor antes que ayuda y modelo,
   tapar antes de todo, gastar antes del modelo, verificar después, el libro al final) es el del código de verdad: si conversacion.ts lo cambia, cae. */
import { conContexto, servidor } from "./servidor.mjs";

const limpio = (s, n) => String(s ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const NADA = { tipo: "ninguna", ref: "", pantalla: "" };
const bi = (x, lang) => (x && typeof x === "object" ? x[lang] ?? x.es : x);
const MOTIVO = { money: "dinero", safety: "seguridad", asked_person: "pidio", account: "cuenta" };
const PARA_PROBAR = "sabor-dominicano";   // un negocio de la base de pruebas (las conversaciones del panel y de las respuestas automáticas llevan business_id)

const textos = (x) => (typeof x === "string" ? [x] : x && typeof x === "object" ? Object.values(x).flatMap(textos) : []);
const lineasFijas = (S, N = "Sabor Dominicano") => new Set([...textos(S.R.LINEAS), ...Object.values(S.R.LINEAS_AUTO).flatMap((f) => (typeof f === "function" ? textos(f(N)) : textos(f)))].map((t) => t.trim()));

/* Lo que el modelo y el verificador pudieron leer de la ayuda: lo que devolvió la búsqueda de Postgres (ya tapado, como lo recibe el modelo). */
const trozosHallados = (S, s) => s.hallados.map((h) => ({ fuente: h.slug, titulo: h.title[h.lang] ?? h.title.es, seccion: h.heading, texto: S.T.tapar(h.body).texto }));
const leyo = (trozos) => trozos.map((z) => `${z.titulo} ${z.seccion} ${z.texto}`);
function ctxRevision(S, { idx, aud, trozos, permitido, extra = {} }) {
  const mapa = new Map([...idx.entries()].map(([k, a]) => [k, a.audiencia]));
  return { permitido, fuentes: trozos.map((z) => z.fuente), audiencias: aud, ayuda: mapa, telefonos: [], notas: [], operaciones: [], confirmadas: false, ...extra };
}
/* Por qué cayó a las reglas: lo que anotó el libro de uso (timeout, error, invalid…) o el motivo del servidor. */
const resultadoDelLibro = (s) => s.eventos.filter((e) => e.k === "anotarUso").map((e) => e.resultado).find((r) => r && r !== "ok") ?? "";

/* ════════ El orden de los pasos ════════ */
export function revisarOrden(uso, { esperado, eventos, sinServidor }) {
  const out = [], f = (porque) => out.push({ regla: "orden_de_pasos", porque });
  const ix = (k, desde = 0) => eventos.findIndex((e, i) => i >= desde && e.k === k);
  const iDet = ix("detectar"), iTapar = ix("tapar"), iAyuda = ix("ayuda"), iGasto = ix("gastar"), iModelo = ix("modelo");
  const iVer = Math.max(ix("verificar"), ix("verificarAuto"), ix("verificarCopiloto"));
  const iLibro = eventos.findLastIndex((e) => e.k === "anotarUso");
  const conTapar = uso === "neighbor" || uso === "owner";
  if (conTapar) {
    if (iTapar < 0 || iTapar > (iDet < 0 ? 1e9 : iDet)) f("lo que escribe la persona se tapa ANTES de que el servidor lo lea (tapar → detectar)");
    const d = eventos.find((e) => e.k === "detectar");
    if (d && esperado.tapado !== undefined && d.arg !== esperado.tapado) f("las reglas del servidor leyeron el texto SIN tapar (detectar recibe lo tapado)");
  }
  if (uso === "copilot" && iTapar < 0) f("el copiloto tapa lo que guarda antes de seguir");
  const antesDelModelo = (nombre, i) => { if (i >= 0 && iModelo >= 0 && i > iModelo) f(`${nombre} va DESPUÉS de llamar al modelo (tiene que ir antes)`); };
  if (uso !== "copilot") {
    if (iDet < 0) f("el servidor no consultó sus reglas fijas (detectar)");
    // Lo que decide el servidor va ANTES de la ayuda, del tope y del modelo.
    for (const [n, i] of [["buscar la ayuda", iAyuda], ["reservar en el tope", iGasto], ["llamar al modelo", iModelo]]) if (iDet >= 0 && i >= 0 && i < iDet) f(`${n} va antes de lo que decide el servidor (detectar)`);
    if (sinServidor && (iAyuda >= 0 || iGasto >= 0 || iModelo >= 0)) f("el servidor ya decidía esta pregunta (emergencia, dinero, seguridad, «quiero una persona»…) y aun así se buscó ayuda o se llamó al modelo");
  }
  if (iAyuda >= 0 && iModelo >= 0 && iAyuda > iModelo) f("la ayuda se busca DESPUÉS de llamar al modelo (tiene que ir antes)");
  if (iModelo >= 0) {
    if (iGasto < 0 || iGasto > iModelo) f("el modelo se llamó sin reservar antes en el tope de gasto (gastar → modelo)");
    antesDelModelo("la ayuda", iAyuda);
    if (iVer < 0 || iVer < iModelo) f("lo que contestó el modelo no pasó por el verificador de salida (modelo → verificar)");
    if (iLibro < iModelo) f("la llamada al modelo no quedó en el libro de uso (modelo → anotar uso)");
    const m = eventos.find((e) => e.k === "modelo")?.entrada;
    if (esperado.enviado !== undefined) {
      const u = (m?.mensajes ?? []).at(-1)?.texto;
      if (u !== esperado.enviado) f("al modelo le llegó el texto de la persona SIN tapar o distinto del que se le tenía que dar");
    }
  } else if (iGasto >= 0 && iLibro < iGasto) f("se reservó en el tope y no se liquidó en el libro de uso");
  return out;
}
const conOrden = (uso, esperado, s, extra = {}) => ({ orden: revisarOrden(uso, { esperado, eventos: s.eventos, ...extra }) });

/* ════════ Vecino (conversacion.turno) ════════ */
function ctxVecino(esc, lang) {
  const ops = esc.operaciones ?? [], refs = new Map();
  ops.forEach((o, i) => refs.set(o.ref, { id: String(i + 1), numero: o.numero, kind: o.kind, status: o.status, detail: null, pago: o.pago ?? null, negocio: o.negocio, negocioId: "x", cancelableGratis: !!o.cancelable_gratis }));
  const datos = { persona: { nombre: esc.nombre ?? null, idioma: lang, ciudad: esc.ciudad ?? null },
    operaciones: ops.map((o) => ({ ref: o.ref, numero: o.numero, tipo: bi(o.tipo, lang), negocio: o.negocio, estado: bi(o.estado, lang), cuando: o.cuando, total: o.total ?? null, cancelable_gratis: !!o.cancelable_gratis })) };
  return { datos, refs, texto: JSON.stringify(datos), confirmadas: ops.some((o) => o.status === "confirmed"), canceladasNum: ops.filter((o) => o.status === "cancelled").map((o) => o.numero),
    activasNum: ops.filter((o) => o.status !== "cancelled").map((o) => o.numero), ciudad: "hzl", lang };
}
const accionDe = (p, refs) => {
  if (!p) return NADA;
  const ref = p.type === "go_to_panel" ? p.target.seccion : [...refs.entries()].find(([, o]) => o.id === p.operationId)?.[0] ?? "";
  return { tipo: p.type, ref: p.operationId || p.type === "go_to_panel" ? ref : "", pantalla: p.target?.pantalla ?? "" };
};
function salidaTurno(S, eng, { r, s, uso, lang, refs, fijas }) {
  if (!r.ok) throw new Error(`el servidor no contestó (${r.apagado ? "apagado" : r.limite ? "límite" : "mensaje"}): ${String(r.msg?.[lang] ?? "").slice(0, 120)}`);
  const porque = r.porque ?? "", fija = fijas.has(String(r.texto).trim());
  const cayo = eng.nombre !== "reglas" && r.motor === "reglas" && !porque.startsWith("modelo:") && (s.eventos.some((e) => e.k === "modelo") || /^(tope|apagado|sin_ia|sin_modelo|accion_rechazada)/.test(porque));
  return { uso, lang, motor: r.motor, motor_pedido: eng.nombre, aviso: !!r.aviso, chips: r.chips ?? [], texto: r.texto, tipo: r.tipo, fuente: r.fuente?.slug ?? (r.fuenteCuenta ? "cuenta" : ""),
    accion: accionDe(s.propuesta, refs), escalo: MOTIVO[s.persona] ?? "", fija, porque, crudo_rechazado: cayo ? (porque || resultadoDelLibro(s) || "caida_a_reglas") : null,
    accion_rechazada: uso === "neighbor" && porque === "accion_rechazada" };
}
export async function turnoVecino(M, eng, { caso, texto, lang, esc, idx, uid }) {
  const S = servidor({ motor: eng.nombre, eng, ids: eng.ids }), cx = ctxVecino(esc, lang), t = S.T.tapar(limpio(texto, 800));
  const { r, s } = await conContexto({ vecino: cx, audiencias: ["vecino"] }, () => S.conv.turno({ userId: uid.id }, { texto, uso: "neighbor", canal: "app", superficie: "help_sheet", lang }));
  const salida = salidaTurno(S, eng, { r, s, uso: "neighbor", lang, refs: cx.refs, fijas: lineasFijas(S) });
  const trozos = trozosHallados(S, s), permitido = [cx.texto, ...leyo(trozos), t.texto].join("\n");
  const ctx = ctxRevision(S, { idx, aud: ["vecino"], trozos, permitido: [cx.texto, ...leyo(trozos)].join("\n"), extra: { operaciones: [...cx.refs].filter(([, o]) => o.cancelableGratis).map(([k]) => k), confirmadas: cx.confirmadas } });
  const det = S.R.detectar(t.texto);
  return { salida, ctx, trozos, ...conOrden("neighbor", { tapado: t.texto, enviado: t.texto }, s, { sinServidor: !!det }), permitido };
}

/* ════════ Panel (conversacion.turnoPanel) ════════ */
function ctxPanel(esc, lang) {
  const partes = esc.partes ?? ["all"], puede = (p) => !p || partes.includes("all") || partes.includes(p);
  const mk = (s) => ({ code: s.codigo, ruta: s.codigo, parte: s.parte ?? null, needs: "always", title: s.seccion, what: s.que_hay, slugs: s.slugs ?? [], words: s.words ?? [] });
  const secciones = new Map(), prohibidas = new Map();
  for (const s of esc.secciones ?? []) (puede(s.parte) ? secciones : prohibidas).set(s.codigo, mk(s));
  const slugsProhibidos = new Set(); for (const s of prohibidas.values()) for (const g of s.slugs) slugsProhibidos.add(g);
  const pay = puede("pay");
  const datos = { negocio: esc.negocio, categoria: esc.categoria ?? null, tu_rol: bi(esc.rol, lang), abierto_ahora: esc.abierto_ahora ?? null,
    ...(pay ? { plan: bi(esc.plan, lang) } : {}), puedes_abrir: [...secciones.values()].map((s) => ({ codigo: s.code, seccion: s.title[lang], que_hay: s.what[lang] })), cifras: esc.cifras ?? {} };
  return { negocio: { id: PARA_PROBAR, nombre: esc.negocio, ciudad: "hzl" }, kind: "staff", partes, pay, datos, texto: JSON.stringify(datos), secciones, prohibidas, slugsProhibidos };
}
export async function turnoPanel(M, eng, { caso, texto, lang, esc, idx, uid }) {
  const S = servidor({ motor: eng.nombre, eng, ids: eng.ids }), cx = ctxPanel(esc, lang), t = S.T.tapar(limpio(texto, 800));
  const { r, s } = await conContexto({ panel: cx, audiencias: ["vecino", "negocio"] }, () => S.conv.turnoPanel({ userId: uid.id }, { negocio: PARA_PROBAR, texto, lang }));
  const salida = salidaTurno(S, eng, { r, s, uso: "owner", lang, refs: new Map(), fijas: lineasFijas(S) });
  const trozos = trozosHallados(S, s), permitido = [cx.texto, ...leyo(trozos)].join("\n");
  const ctx = ctxRevision(S, { idx, aud: ["vecino", "negocio"], trozos, permitido, extra: { confirmadas: true } });
  const det = S.R.detectar(t.texto);
  const fijo = !!det || !!S.R.detectarPanel(t.texto) || (r.porque ?? "").startsWith("seccion_prohibida") || r.porque === "ayuda_prohibida";
  return { salida, ctx, trozos, ...conOrden("owner", { tapado: t.texto, enviado: t.texto }, s, { sinServidor: !!det || !!S.R.detectarPanel(t.texto) }), permitido, fijo };
}

/* ════════ Cliente que escribe a un negocio cerrado y «Sugerir respuesta» (conversacion.respuestaAuto) ════════ */
const TEMA_ETQ = { hours: ["Horario y dirección", "Hours and address"], menu: ["Menú, servicios y precios", "Menu, services and prices"], how_to_order: ["Cómo pedir o reservar", "How to order or book"], faq: ["Tus preguntas frecuentes", "Your FAQ"] };
function ctxNegocio(esc, lang, borrador) {
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
  return { negocio: { id: PARA_PROBAR, nombre: esc.negocio, ciudad: "hzl" }, abierto: false, temas: [...T], horario: hor.horario || null, proxima: hor.proxima || null, direccion: hor.direccion || null,
    items, comoPedir, preguntas, nota, datos, texto };
}
export async function turnoAuto(M, eng, { caso, texto, lang, esc, idx, uid }) {
  const S = servidor({ motor: eng.nombre, eng, ids: eng.ids }), borrador = caso.modo === "borrador", cx = ctxNegocio(esc, lang, borrador), N = esc.negocio;
  const ultimo = S.T.tapar(limpio(texto, 800)).texto;
  const historial = [...(caso.historial ?? []).map((h) => ({ de: h.de, texto: S.T.tapar(h.texto).texto })), { de: "persona", texto: ultimo }];
  const { r, s } = await conContexto({ audiencias: ["vecino"] }, () => S.conv.respuestaAuto({ userId: uid.id }, { borrador, convId: null, ciudad: "hzl", negocio: { id: PARA_PROBAR, nombre: N }, lang, ultimo, historial, ctx: cx }));
  if (r.off) throw new Error(`el servidor no contestó (${r.porque})`);
  const trozos = trozosHallados(S, s), permitido = [cx.texto, ...leyo(trozos)].join("\n");
  const porque = r.porque ?? "", delModelo = /^modelo:/.test(porque), cayo = eng.nombre !== "reglas" && r.motor === "reglas" && !delModelo && !r.pasar && (s.eventos.some((e) => e.k === "modelo") || /^(tope|apagado|sin_ia|sin_modelo)/.test(porque));
  const cayoAlPasar = eng.nombre !== "reglas" && r.motor === "reglas" && r.pasar && /\+reglas/.test(porque);
  const fuente = r.fuente === "pagina" ? "cuenta" : r.fuente?.slug ?? "";
  const emerg = /(^|:)emergencia$/.test(porque);
  const salida = { uso: "auto_reply", borrador, lang, motor: r.motor, motor_pedido: eng.nombre, aviso: false, chips: [], texto: r.texto, tipo: emerg ? "emergencia" : r.pasar ? "persona" : "respuesta",
    fuente: borrador && r.pasar === false && /^borrador:/.test(porque) ? "cuenta" : fuente, accion: NADA, escalo: r.pasar ? "negocio" : "", fija: !!r.pasar || /^borrador:/.test(porque) && r.texto === S.R.LINEAS_AUTO.borradorRevisar[lang],
    porque, crudo_rechazado: cayo || cayoAlPasar ? (porque || "caida_a_reglas") : null };
  const ctx = ctxRevision(S, { idx, aud: ["vecino"], trozos, permitido, extra: { confirmadas: false } });
  const det = S.R.detectar(ultimo);
  return { salida, ctx, trozos, ...conOrden("auto_reply", {}, s, { sinServidor: !!det || !!S.R.detectarAuto(ultimo) }), permitido };
}

/* ════════ Copiloto del equipo (conversacion.borradorCopiloto) ════════ */
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
export async function turnoCopiloto(M, eng, { caso, texto, lang, esc, idx, uid }) {
  const S = servidor({ motor: eng.nombre, eng, ids: eng.ids });
  // contexto-copiloto.ts paraModelo: tapado de siempre y, además, sin teléfonos ni correos antes de ir al modelo.
  const pm = (t) => S.T.tapar(String(t ?? "")).texto.replace(/(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[tapado]").replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[tapado]").replace(/\s+/g, " ").trim().slice(0, 600);
  const c = { ...esc, mensaje: pm(texto), notas_internas: (esc.notas_internas ?? []).map(pm), equipo_escribio: (esc.equipo_escribio ?? []).map(pm), conversacion_previa: (esc.conversacion_previa ?? []).map((x) => ({ ...x, texto: pm(x.texto) })) };
  const X = datosCopiloto(c, lang), tema = typeof c.tema === "object" ? c.tema : { es: c.tema, en: c.tema };
  const macros = (c.macros ?? []).map((m) => ({ clave: m.clave, titulo: m.titulo })), confirmadas = c.operacion?.estado === "confirmada";
  const dinero = !!c.cobrado || /cobr|pag[oó]|devol|reembols|cargo|charge|refund|paid|payment/i.test(X.caso);
  const op = c.operacion ? { tipo: typeof c.operacion.tipo === "object" ? c.operacion.tipo : { es: c.operacion.tipo, en: c.operacion.tipo }, numero: c.operacion.numero, negocio: c.operacion.negocio } : null;
  const cp = { tipo: c.tipo === "ayuda" ? "ayuda" : "caso", numero: uid.casoNum, casoId: uid.casoId, ayudaId: null, ciudad: "hzl", negocio: null, lang, nombre: c.persona?.nombre ?? "", tema, op, dinero,
    datos: X.datos, ultimo: X.ultimo, consulta: X.consulta, publico: X.publico, caso: X.caso, internas: X.internas, confirmadas, canceladasNum: [], activasNum: [], macros, puedeDevolver: X.puedeDevolver, maxBorrador: c.tipo === "ayuda" ? 480 : 2000 };
  const { r, s } = await conContexto({ copiloto: cp, audiencias: ["vecino", "negocio", "portero", "equipo"] }, () => S.conv.borradorCopiloto({ id: uid.id }, { caso: uid.casoNum, cola: null }, "es"));
  if (!r.ok) throw new Error(`el servidor no contestó (${r.apagado ? "apagado" : "límite"}): ${String(r.msg).slice(0, 120)}`);
  const trozos = trozosHallados(S, s), aud = ["vecino", "negocio", "portero", "equipo"];
  const publico = [X.publico, ...leyo(trozos)].join("\n");
  const cae = eng.nombre !== "reglas" && !r.ai;
  const salida = { uso: "copilot", lang, motor: r.motor, motor_pedido: eng.nombre, aviso: false, chips: [], crudo_rechazado: cae ? (resultadoDelLibro(s) || "caida_a_reglas") : null, porque: "", tipo: "respuesta", accion: NADA, escalo: "", fija: false,
    texto: r.borrador, resumen: r.resumen, siguiente: r.siguiente, macro: r.macro?.clave ?? "", fuente: r.fuente?.slug ?? "", sugerir_devolver: r.devolver };
  const ctx = ctxRevision(S, { idx, aud, trozos, permitido: publico, extra: { notas: X.internas, confirmadas } });
  return { salida, ctx, trozos, ...conOrden("copilot", {}, s, {}), permitido: publico };
}

export const PIPELINES = { neighbor: turnoVecino, owner: turnoPanel, auto_reply: turnoAuto, copilot: turnoCopiloto };
