import "server-only";
import type { Staff } from "../admin";
import { caso as casoCola } from "../admin-colas";
import { motivoAyuda, quiereAyuda } from "../ayuda-motivos";
import { AYUDA_DE } from "../colas";
import { db } from "../db";
import { TEMAS, type Tema } from "../soporte-comun";
import { casoEquipo, money } from "../soporte-equipo";
import type { Lang } from "./modelo";
import { tapar, TAPADO } from "./tapar";

/* 7g · Lo que El Compa sabe de un caso para el COPILOTO del equipo (fase7-compa.md §3 «Qué datos ve» · Copiloto; guardianes compaSoloSusDatos,
   compaSinDatosSensibles y copilotoSoloBorrador). Recibe a la persona del equipo de la SESIÓN (Staff, con sus permisos de la matriz y sus
   ciudades) y arma el contexto SOLO con lo que ella ya ve en ese caso, con las mismas lecturas de siempre:
   - un caso TK- con lib/soporte-equipo casoEquipo (sop:ver y su ciudad; null = no existe para ella). El copiloto pide además sop:editar (el
     borrador alimenta «Enviar», que pide eso). Las notas internas van solo si su rol las lee en la ficha (hoy: quien ve Soporte), aparte y
     marcadas: el borrador nunca las cuenta (verificarCopiloto).
   - una ayuda escalada H- con lib/admin-colas caso (la cola es de su rol y de su ciudad). El copiloto pide además colas:aprobar (el borrador
     alimenta «Resolver con un mensaje», que pide eso) y solo en la cola «sop»: nunca Cuidado de niños, No me dejan cancelar ni Posible estafa.
   - la operación y lo pagado en la app SOLO como los muestra la ficha (número, tipo, negocio, estado, total; cobrado y ya devuelto); nunca la
     tarjeta, ids, teléfonos ni correos. Una operación de Salud, Profesionales, una inscripción (Niños) o con datos privados no se lee: en un
     caso va como «operación privada»; en una ayuda escalada el copiloto no sale.
   - lo que puede su rol con el dinero del caso (el tope de «Resolver y devolver» que dice la base): solo para sugerir el botón, que toca ella.
   Todo pasa por tapar() y además se quitan teléfonos y correos antes de ir al modelo. Al modelo no le llega ningún id: el caso va por su
   número público (TK-…, H-…) y la persona por su nombre de pila. */
type Bi = { es: string; en: string };
export type ContextoCopiloto = {
  tipo: "caso" | "ayuda"; numero: string; casoId: string | null; ayudaId: string | null; ciudad: string; negocio: string | null;
  lang: Lang; nombre: string; tema: Bi; op: { tipo: Bi; numero: string; negocio: string } | null; dinero: boolean;
  datos: Record<string, unknown>; ultimo: string; consulta: string;
  publico: string; caso: string; internas: string[]; confirmadas: boolean;
  macros: { clave: string; titulo: string }[]; puedeDevolver: boolean; maxBorrador: number;
};

const TEL = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const CORREO = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
/* Para el modelo: tapado (tarjeta, SSN, códigos, contraseñas, cuentas) y sin teléfonos ni correos (Soporte los guarda porque un caso de cuenta los
   necesita; el modelo no). */
export const paraModelo = (t: string | null | undefined, n = 600) => tapar(String(t ?? "")).texto.replace(TEL, TAPADO).replace(CORREO, TAPADO).replace(/\s+/g, " ").trim().slice(0, n);
const KIND: Record<string, Bi> = {
  order: { es: "pedido", en: "order" }, market_order: { es: "pedido del mercado", en: "market order" }, hold: { es: "apartado", en: "layaway" },
  appointment: { es: "cita", en: "appointment" }, table: { es: "reservación", en: "reservation" }, party: { es: "fiesta", en: "party" }, trip: { es: "viaje", en: "trip" },
  night: { es: "noche", en: "night out" }, visit: { es: "visita", en: "visit" }, tickets: { es: "orden de boletos", en: "ticket order" }, private_event: { es: "evento privado", en: "private event" },
  quote: { es: "cotización", en: "quote" }, rental: { es: "renta", en: "rental" }, enrollment: { es: "inscripción", en: "enrollment" },
};
const OPST: Record<string, string> = { pending: "pendiente, sin confirmar", change_proposed: "con un cambio propuesto", confirmed: "confirmada", declined: "no aceptada", expired: "sin respuesta",
  cancelled: "cancelada", done: "terminada" };
const ESTADO: Record<string, string> = { new: "recibido", in_progress: "lo están viendo", waiting: "esperando a la persona", reopened: "reabierto", resolved: "resuelto", merged: "unido" };
const SISTEMA_PUBLICO: Record<string, (v: Record<string, string>) => string> = {
  recibido: () => "le avisamos que recibimos el caso", resuelto_usuario: () => "la persona lo marcó como resuelto", resuelto_equipo: () => "el equipo lo marcó como resuelto",
  reabierto: () => "el equipo lo reabrió", reabierto_usuario: () => "la persona dijo que no se resolvió", unido: (v) => `se unió a ${v.num ?? "otro caso"}`,
  devuelto: (v) => `To'Latino le devolvió ${v.monto ?? ""} a su tarjeta`,
};
const ORDEN_MOT: Record<string, string> = { falta: "Falta algo", equivocado: "Llegó algo equivocado", frio: "Llegó frío o mal preparado", danado: "Llegó dañado o derramado", tarde: "Llegó tarde",
  nollego: "No le llegó", pago: "Problema con el pago", otro: "Otro problema" };
const ORDEN_Q: Record<string, string> = { reponer: "Que se lo repongan", devolver: "Que le devuelvan lo de esos platos", avisar: "Solo quiere que lo sepan" };
const DECISION: Record<string, string> = { ok: "aceptó", alt: "propuso otra solución", no: "dijo que no puede" };

/* ¿La operación es de las que El Compa nunca lee? (Salud, Profesionales, inscripciones de Niños o con datos privados.) Lo dice la base. */
async function sensible(numero: string, userId: string | null, negocio: string | null): Promise<boolean> {
  const r = (await db().query<{ s: boolean }>(
    `select not (o.kind not in ('enrollment') and not (coalesce(o.details->>'rubro', '') in ('salud', 'pro')) and not exists (select 1 from op_private p where p.operation_id = o.id)) as s
       from operations o where o.number = $1 and (o.user_id = $2::uuid or ($3::text is not null and o.business_id = $3)) limit 1`, [numero, userId, negocio])).rows[0];
  return r?.s !== false;   // si no se encuentra, como sensible (no se lee)
}

export async function contextoCopiloto(s: Staff, x: { caso?: string | null; cola?: string | null }): Promise<ContextoCopiloto | null> {
  if (x.caso) return contextoCaso(s, String(x.caso));
  if (x.cola) return contextoAyuda(s, String(x.cola));
  return null;
}

/* ── Un caso de Soporte (TK-) ── */
async function contextoCaso(s: Staff, numero: string): Promise<ContextoCopiloto | null> {
  if (!(s.puede("sop", "ver") && s.puede("sop", "editar"))) return null;
  const k = await casoEquipo(s, numero);   // la misma lectura de la ficha: su permiso y sus ciudades
  if (!k || k.status === "resolved" || k.status === "merged") return null;
  const lang: Lang = k.persona.lang === "en" ? "en" : "es", nombre = paraModelo(k.persona.nombre.split(" ")[0] ?? "", 40);
  const leeNotas = s.puede("sop", "ver");   // la ficha muestra las notas internas a quien ve Soporte
  const priv = k.op ? await sensible(k.op.num, k.persona.id, k.negocio?.id ?? null) : false;
  const op = k.op && !priv ? { tipo: KIND[k.op.kind] ?? { es: "operación", en: "transaction" }, numero: `${/^\d/.test(k.op.num) ? "#" : ""}${k.op.num}`, negocio: paraModelo(k.op.biz, 80) } : null;
  const conv: string[] = [], internas: string[] = [], publico: string[] = [], delCaso: string[] = [];
  let ultimo = "";
  for (const m of k.msjs.slice(-24)) {
    if (m.sender === "system") {
      const f = m.sys_key && !m.internal ? SISTEMA_PUBLICO[m.sys_key] : null;
      if (f) { const t = f((m.vars ?? {}) as Record<string, string>); conv.push(`SISTEMA: ${t}`); publico.push(t); }
      continue;
    }
    const body = m.oculto ? "[mensaje oculto por el equipo]" : `${paraModelo(m.body)}${m.foto ? " [foto]" : ""}`.trim();
    if (!body) continue;
    if (m.internal) { if (leeNotas) internas.push(body); continue; }
    if (m.sender === "user") { conv.push(`PERSONA: ${body}`); delCaso.push(body); if (!m.oculto) ultimo = body; }
    else { conv.push(`EQUIPO: ${body}`); publico.push(body); }
  }
  const pago = k.pago && !priv ? { cobrado: money(k.pago.amount), ya_devuelto: money(k.pago.devuelto) } : null;
  if (op && k.op) publico.push(`${op.tipo.es} ${op.numero} ${op.negocio} ${OPST[k.op.status] ?? k.op.status} ${money(k.op.total)}`);
  if (pago) publico.push(`cobrado ${pago.cobrado} ya devuelto ${pago.ya_devuelto}`);
  const resumen = k.summary ? paraModelo(k.summary, 500) : null;
  if (resumen) delCaso.push(resumen);
  const queda = k.pago ? k.pago.amount - k.pago.devuelto : 0;
  const puedeDevolver = k.puedeDevolver && !!pago && queda > 0;
  const dev = k.tope == null ? "hasta lo cobrado" : k.tope === 0 ? "no devuelve" : `hasta ${money(k.tope)} por caso${k.devueltoCaso ? ` (ya se devolvieron ${money(k.devueltoCaso)})` : ""}`;
  const macros = k.macros.filter((m) => m.on).sort((a, b) => Number(b.topic === k.tema) - Number(a.topic === k.tema)).slice(0, 12);
  const tema = TEMAS[k.tema as Tema]?.corto ?? { es: k.tema, en: k.tema };
  const datos: Record<string, unknown> = {
    tipo: "caso de Soporte de To'Latino (el borrador es la respuesta del equipo en el caso)",
    caso: { numero: k.num, tema: tema.es, estado: ESTADO[k.status] ?? k.status, prioridad: k.priority, abierto_desde: k.origin === "panel" ? "el panel de un negocio" : k.origin === "compa" ? "El Compa" : "la app" },
    persona: { nombre: nombre || null, idioma: lang, ciudad: k.persona.ciudad, casos: k.persona.casos },
    negocio_que_escribe: k.negocio ? paraModelo(k.negocio.name, 80) : null,
    operacion: k.op ? (op ? { numero: op.numero, tipo: op.tipo.es, negocio: op.negocio, estado: OPST[k.op.status] ?? k.op.status, total: money(k.op.total) } : { privada: "El Compa no lee esta operación (salud, niños o datos privados)." }) : null,
    ayuda_ligada: k.ayuda ? { numero: k.ayuda.num, estado: k.ayuda.status } : null,
    pagado_en_la_app: pago,
    tu_rol: { resolver_y_devolver: puedeDevolver, devuelve: dev },
    resumen_de_el_compa: resumen,
    dispositivo: k.device ? paraModelo(`${k.device} · ${k.version ?? "web"}`, 80) : null,
    conversacion: conv,
    notas_internas_del_equipo: leeNotas ? internas : [],
    macros: macros.map((m) => ({ clave: m.key, titulo: m.title.es, texto: paraModelo(lang === "en" ? m.body.en : m.body.es, 400) })),
  };
  const dinero = k.tema === "pago" || !!pago || /cobr|pag[oó]|devol|reembols|cargo|charge|refund|paid|payment/i.test(delCaso.join(" "));
  return {
    tipo: "caso", numero: k.num, casoId: k.id, ayudaId: null, ciudad: k.ciudad, negocio: k.negocio?.id ?? null, lang, nombre, tema, op, dinero,
    datos, ultimo: ultimo || delCaso.at(-1) || tema.es, consulta: `${tema.es} ${ultimo}`.slice(0, 120),
    publico: publico.join("\n"), caso: delCaso.join("\n"), internas, confirmadas: k.op?.status === "confirmed",
    macros: macros.map((m) => ({ clave: m.key, titulo: m.title.es })), puedeDevolver, maxBorrador: 2000,
  };
}

/* ── Una ayuda escalada (cola «sop»: Ayuda con pedidos y citas) ── */
async function contextoAyuda(s: Staff, id: string): Promise<ContextoCopiloto | null> {
  if (!s.puede("colas", "aprobar")) return null;
  const k = await casoCola(s, id);   // la misma lectura de la ficha: la cola es de su rol y de su ciudad
  if (!k || k.queue !== "sop" || k.status !== "open" || !("ayuda" in k) || !k.ayuda) return null;
  const h = k.ayuda;
  if (h.k === "enrollment" || h.rub === "salud" || h.rub === "pro") return null;
  const u = (await db().query<{ lang: string | null }>(`select lang from users where id = $1::uuid`, [h.uid])).rows[0];
  if (await sensible(h.num, h.uid, null)) return null;
  const lang: Lang = u?.lang === "en" ? "en" : "es", nombre = paraModelo(String(h.quien ?? "").split(" ")[0] ?? "", 40);
  const negocio = k.negocio?.name ? paraModelo(k.negocio.name, 80) : "";
  const tipo = KIND[h.k] ?? { es: "operación", en: "transaction" }, numero = `${/^\d/.test(h.num) ? "#" : ""}${h.num}`;
  const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
  const quePaso = h.k === "order" ? ORDEN_MOT[h.reason] ?? h.reason : motivoAyuda(h.reason, h.k === "market_order" ? "merc" : h.k === "hold" ? "tienda" : h.rub)[0];
  const quiere = h.k === "order" ? ORDEN_Q[h.wants] ?? h.wants : quiereAyuda(h.wants)[0];
  const cuerpo = h.body ? paraModelo(h.body) : "", resp = h.reply ? paraModelo(h.reply) : "";
  const publico = [`${tipo.es} ${numero} ${negocio} ${usd(h.total)}`, h.pago > 0 ? `devolvible a la tarjeta ${usd(h.pago)}` : "", resp, h.offer ? `el negocio propuso ${usd(h.offer)}` : ""].filter(Boolean);
  // «Resolver y devolver» existe en la ficha de una ayuda que no es un pedido de comida (lo de un pedido lo arregla el negocio en el local).
  const puedeDevolver = "puedeDinero" in k && !!k.puedeDinero && h.pago > 0 && h.k !== "order";
  const datos: Record<string, unknown> = {
    tipo: "ayuda con una operación que pasó a To'Latino (el borrador es el mensaje con el que To'Latino la RESUELVE: lo leen la persona y el negocio)",
    solicitud: { numero: h.number, que_paso: quePaso, que_pide: `${quiere}${h.amount ? ` (pide ${usd(h.amount)})` : ""}`, ...(h.k === "order" && h.items.length ? { platos: h.items.map((i) => `${i.q} × ${paraModelo(i.n, 60)}`) } : {}) },
    persona: { nombre: nombre || null, idioma: lang },
    operacion: { numero, tipo: tipo.es, negocio, ...(h.svc ? { servicio: paraModelo(h.svc, 80) } : {}), total: usd(h.total) },
    lo_que_cuenta_la_persona: cuerpo || null,
    respuesta_del_negocio: resp ? { decision: DECISION[h.decision ?? ""] ?? "respondió", texto: resp, ...(h.offer ? { propuso: usd(h.offer) } : {}) } : (h.escalated_by === "system" ? "vino directo a To'Latino" : "el negocio no respondió en 24 horas"),
    devolvible_a_la_tarjeta: h.pago > 0 ? usd(h.pago) : "nada: no se pagó en la app",
    fotos: h.fotos.length,
    tu_rol: { resolver_y_devolver: puedeDevolver },
    conversacion: [cuerpo ? `PERSONA: ${cuerpo}` : "", resp ? `NEGOCIO: ${resp}` : ""].filter(Boolean),
    notas_internas_del_equipo: [],
    macros: [],
  };
  const tema = { es: (AYUDA_DE[h.k] ?? "Ayuda con un pedido").replace(/^Ayuda con /, ""), en: tipo.en };
  return {
    tipo: "ayuda", numero: h.number, casoId: null, ayudaId: (k as { subject_id: string }).subject_id, ciudad: k.city_id ?? "hzl", negocio: k.business_id ?? null, lang, nombre,
    tema, op: { tipo, numero, negocio }, dinero: h.pago > 0 || /cobr|pago|devol|reembols/i.test(`${h.reason} ${h.wants}`),
    datos, ultimo: cuerpo || quePaso, consulta: `${tipo.es} ${quePaso} ${cuerpo}`.slice(0, 120),
    publico: publico.join("\n"), caso: [cuerpo, h.amount ? `pide ${usd(h.amount)}` : ""].filter(Boolean).join("\n"), internas: [], confirmadas: false,
    macros: [], puedeDevolver, maxBorrador: 480,
  };
}
