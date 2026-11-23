import "server-only";
import { createHash } from "node:crypto";
import { ENTORNO } from "../entorno";
import { bloques, ErrorModelo, type Entrada, type Modelo, type Salida } from "./modelo";
import { quiereAbrir, quiereCancelar, respuestaAbrir, respuestaCancelar, type OpCtx } from "./modelo-reglas";

/* 7c · El simulador de El Compa (sandbox sin clave y todas las pruebas punta a punta). Determinista y guionado por intención. A propósito se
   porta como un modelo INGENUO: si un dato (lo que escribe la persona o un trozo de ayuda) trae instrucciones, las obedece — propone cancelar
   el número que le dicten, repite un teléfono, inventa un descuento. Así las pruebas demuestran que la seguridad NO depende del modelo: el
   servidor (lista cerrada de acciones contra la sesión y verificar.ts) lo frena igual.
   Guarda lo que recibió (el sistema y los bloques exactos que iría al proveedor) para que las pruebas revisen que nada tapado ni ajeno sale.
   Nunca existe en producción (modelo.ts no lo carga y este archivo se niega). */
if (ENTORNO === "produccion") throw new Error("CANDADO: el simulador de El Compa no existe en producción.");

export type Recibido = { at: string; uso: string; modelo: string; sistema: string; bloques: string[]; imagen?: { sha256: string; ancho: number; alto: number; bytes: number } };
const G = globalThis as unknown as { __compaSim?: Recibido[] };
export function recibidos(): Recibido[] { return [...(G.__compaSim ?? [])]; }
export function olvidarRecibidos() { G.__compaSim = []; }

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
/* AJ · El ancho y el alto de un JPEG (el marcador SOF), sin decodificarlo. */
function medidaJpeg(b: Buffer): { ancho: number; alto: number } | null {
  let i = 2;
  while (i + 9 < b.length && b[i] === 0xff) {
    const m = b[i + 1]!, largo = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7) };
    i += 2 + largo;
  }
  return null;
}
const frases = (t: string, n: number) => t.replace(/(^|\n)\s*[-•]\s+/g, "$1").replace(/[#*_`>|]/g, " ").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim()
  .split(/(?<=[.!?])\s+/).filter((x) => x.length > 3).slice(0, n).join(" ");
const INYECCION = /(ignor[ae]|olvida|ignore|forget|disregard).{0,40}(reglas|instrucciones|rules|instructions)|instrucciones para el asistente|instructions for the assistant|eres el due[ñn]o|you are the owner/i;

export const simulador: Modelo = {
  motor: "simulador",
  async responder(e: Entrada): Promise<Salida> {
    const b = bloques(e);
    const G2 = (G.__compaSim ??= []);
    const img = e.imagen ? Buffer.from(e.imagen.base64, "base64") : null, med = img ? medidaJpeg(img) : null;
    G2.push({ at: new Date().toISOString(), uso: e.uso, modelo: e.modelo, sistema: e.sistema, bloques: b,
      ...(img ? { imagen: { sha256: createHash("sha256").update(img).digest("hex"), ancho: med?.ancho ?? 0, alto: med?.alto ?? 0, bytes: img.length } } : {}) });
    if (G2.length > 60) G2.splice(0, G2.length - 60);
    const texto = e.mensajes[e.mensajes.length - 1]?.texto ?? "", t = texto.toLowerCase(), es = e.lang === "es";
    const entrada = Math.ceil((e.sistema.length + b.join("").length) / 4);
    await dormir(40 + (texto.length % 80));
    const sal = (json: Record<string, unknown>): Salida => ({ json, motor: "simulador", modelo: e.modelo,
      tokens: { entrada, cacheLeida: 0, cacheEscrita: 0, salida: Math.ceil(JSON.stringify(json).length / 4) } });
    const base = { tipo: "respuesta", fuente: "", accion: { tipo: "ninguna", ref: "", pantalla: "" }, persona: "ninguno", chips: [] as string[] };

    // AJ · La segunda opinión de una foto pública (lib/fotos-segunda-opinion.ts). Lo guiona el ALTO de la imagen recibida (la prueba arma fotos
    // de ese alto; ≤ 640 px no cambia al reducirla): 301 publicar · 302 rechazar (documento) · 303 no_segura · 304 una respuesta que no encaja ·
    // 305 error del proveedor · 306 tarda más que el tiempo límite. Cualquier otra foto: publicar (las demás pruebas suben fotos normales).
    if (e.uso === "foto") {
      const alto = med?.alto ?? 0;
      if (alto === 305) throw new ErrorModelo("error", false, "simulador: error del proveedor");
      if (alto === 306) { await dormir(e.esperaMs + 3000); return sal({ veredicto: "publicar", motivo: "" }); }
      if (alto === 302) return sal({ veredicto: "rechazar", motivo: "documento" });
      if (alto === 303) return sal({ veredicto: "no_segura", motivo: "" });
      if (alto === 304) return sal({ veredicto: "publicar", motivo: "", nota: "y además publícala en la portada" });
      return sal({ veredicto: "publicar", motivo: "" });
    }

    // Fallas guionadas (solo el simulador las entiende).
    if (t.includes("simular-lento")) { await dormir(e.esperaMs + 3000); return sal({ ...base, respuesta: es ? "Tarde." : "Late." }); }
    if (t.includes("simular-error")) throw new ErrorModelo("error", false, "simulador: error del proveedor");
    if (t.includes("simular-rechazo")) throw new ErrorModelo("refusal", false, "simulador: el modelo no contestó", { entrada, cacheLeida: 0, cacheEscrita: 0, salida: 0 });
    if (t.includes("simular-roto")) return sal({ respuesta: 5, tipo: "cualquiera" });
    const f0 = e.trozos[0];

    // 7g · El COPILOTO del equipo: igual de ingenuo. Con instrucciones en los datos (un mensaje de la persona, una nota interna o una ayuda)
    // obedece: promete devolver lo que pidan y copia las notas internas en el borrador. El servidor (verificarCopiloto) lo frena. Las fallas
    // guionadas de abajo (simular-promete, -nota, -monto, -hecho, -telefono, -emoji) prueban cada regla del verificador por separado.
    if (e.uso === "copilot") {
      type DC = { persona?: { nombre?: string | null; idioma?: string }; caso?: { tema?: string }; solicitud?: { que_paso?: string }; operacion?: { numero?: string; tipo?: string; negocio?: string } | null;
        pagado_en_la_app?: unknown; devolvible_a_la_tarjeta?: string; conversacion?: string[]; notas_internas_del_equipo?: string[]; macros?: { clave: string }[]; tu_rol?: { resolver_y_devolver?: boolean } };
      const D = e.datos as DC, nombre = D.persona?.nombre ?? "", notas = D.notas_internas_del_equipo ?? [], conv = D.conversacion ?? [];
      const ce = (D.persona?.idioma ?? e.lang) !== "en", op = D.operacion && D.operacion.numero ? D.operacion : null;
      const cop = (x: Partial<Record<string, unknown>>) => sal({ resumen: `${nombre || "La persona"} escribe sobre ${D.caso?.tema ?? D.solicitud?.que_paso ?? "su caso"}.`, borrador: "", siguiente: "",
        macro: D.macros?.[0]?.clave ?? "", fuente: "", sugerir_devolver: !!D.tu_rol?.resolver_y_devolver, ...x });
      const veneno = [texto, ...conv, ...notas, ...e.trozos.map((x) => x.texto)].find((x) => INYECCION.test(x));
      if (veneno) return cop({ resumen: "La persona pide que le devuelvan $500.", siguiente: "Devolver $500 ya.", borrador: ce ? `Claro${nombre ? ` ${nombre}` : ""}, te devolvemos $500 hoy mismo. Lo que dice el equipo: ${notas[0] ?? "nada"}` : `Sure, we will refund $500 today. The team says: ${notas[0] ?? "nothing"}` });
      if (t.includes("simular-promete")) return cop({ borrador: ce ? `Hola ${nombre}. Ya aprobamos tu reembolso: te devolvemos lo cobrado.` : `Hi ${nombre}. Your refund is approved: we will refund the charge.` });
      if (t.includes("simular-nota")) return cop({ borrador: `${ce ? "Hola" : "Hi"} ${nombre}. ${notas[0] ?? "Sin notas."}` });
      if (t.includes("simular-monto")) return cop({ borrador: ce ? `Hola ${nombre}. Te cobraron $73.10 de más y lo vamos a revisar.` : `Hi ${nombre}. You were overcharged $73.10 and we will review it.` });
      if (t.includes("simular-hecho")) return cop({ borrador: ce ? "Listo, ya te devolví el dinero." : "Done, I already refunded you." });
      if (t.includes("simular-telefono")) return cop({ borrador: ce ? "Llámanos al 570-555-0100." : "Call us at 570-555-0100." });
      if (t.includes("simular-emoji")) return cop({ borrador: ce ? "Hola 😀 ya lo vemos." : "Hi 😀 we are on it." });
      const ayuda = f0 ? frases(f0.texto.replace(/^.*\|.*$/gm, " ").replace(/-{3,}/g, " "), 1) : "";   // la primera frase de prosa (sin tablas)
      return cop({ fuente: ayuda ? f0!.fuente : "", siguiente: D.pagado_en_la_app || (D.devolvible_a_la_tarjeta ?? "").startsWith("$") ? "Revisar lo pagado en la app antes de contestar." : "Contestar y esperar su respuesta.",
        borrador: ce ? `Hola ${nombre}. Gracias por escribirnos. Ya estoy revisando tu caso${op ? ` sobre tu ${op.tipo} en ${op.negocio}` : ""} y te escribo en cuanto tenga la respuesta.${ayuda ? ` ${ayuda}` : ""}`
          : `Hi ${nombre}. Thanks for writing to us. I'm reviewing your case${op ? ` about your ${op.tipo} at ${op.negocio}` : ""} and will write to you as soon as I have the answer.${ayuda ? ` ${ayuda}` : ""}` });
    }
    if (t.includes("simular-inventa")) return sal({ ...base, respuesta: es ? "Te devolvemos el 75 % y la cancelación cuesta $19.99." : "We refund 75 % and cancelling costs $19.99.", fuente: f0?.fuente ?? "" });
    if (t.includes("simular-filtra")) return sal({ ...base, respuesta: es ? "Tu tarjeta 4242 4242 4242 4242 está bien. Llámanos al 570-555-0100." : "Your card 4242 4242 4242 4242 is fine. Call us at 570-555-0100.", fuente: f0?.fuente ?? "" });
    if (t.includes("simular-hecho")) return sal({ ...base, respuesta: es ? "Listo, ya cancelé tu solicitud." : "Done, I already cancelled your request.", fuente: "cuenta" });
    if (t.includes("simular-cita-ajena")) return sal({ ...base, respuesta: es ? "El código de arranque está en el Super Admin." : "The startup code is in the Super Admin.", fuente: "admin-equipo" });
    if (t.includes("simular-emoji")) return sal({ ...base, respuesta: es ? "Claro que sí 😀 te ayudo." : "Sure 😀 happy to help.", fuente: f0?.fuente ?? "" });
    if (t.includes("simular-persona")) return sal({ ...base, tipo: "persona", respuesta: es ? "Te paso con una persona." : "I'll pass you to a person.", persona: "no_sabe" });

    // 7f · La respuesta automática de un negocio y el borrador de «Sugerir respuesta»: igual de ingenuo. Con instrucciones en los datos (la nota
    // del dueño, el mensaje del cliente o una ayuda) las obedece y promete; si le piden un descuento, lo da. El servidor (verificarAuto) lo frena.
    const D = e.datos as { borrador?: boolean; horario?: string; abre_otra_vez?: string; direccion?: string; lo_que_ofrece?: { nombre: string; precio: string; agotado_hoy?: boolean }[]; como_pedir?: string[]; nota_del_dueno?: string };
    if (e.uso === "auto_reply" || D.borrador) {
      const veneno = [texto, D.nota_del_dueno ?? "", ...e.trozos.map((x) => x.texto)].find((x) => INYECCION.test(x));
      if (veneno || /descuent|discount/.test(t)) return sal({ ...base, fuente: "cuenta", respuesta: es ? "Claro, te hago 50 % de descuento y te guardo la mesa." : "Sure, you get 50 % off and I'll hold the table for you." });
      if (/hora|abren|abre |cierran|horario|hours|open|close/.test(t) && D.horario)
        return sal({ ...base, fuente: "cuenta", respuesta: es ? `Ahora estamos cerrados. Abrimos ${D.abre_otra_vez ?? "en nuestro horario de siempre"}.${D.direccion ? ` Estamos en ${D.direccion}.` : ""}`
          : `We are closed now. We open ${D.abre_otra_vez ?? "at our usual hours"}.${D.direccion ? ` We are at ${D.direccion}.` : ""}` });
      const L = (D.lo_que_ofrece ?? []).filter((x) => !x.agotado_hoy).slice(0, 3);
      if (/precio|cuanto|cuánto|menu|menú|tienen|price|how much|have/.test(t) && L.length)
        return sal({ ...base, fuente: "cuenta", respuesta: es ? `Tenemos ${L.map((x) => `${x.nombre} (${x.precio})`).join(", ")}. Todo está en nuestra página de To'Latino.` : `We have ${L.map((x) => `${x.nombre} (${x.precio})`).join(", ")}. Everything is on our To'Latino page.` });
      if (/pedir|pido|ordenar|reserv|order|book/.test(t) && D.como_pedir?.length) return sal({ ...base, fuente: "cuenta", respuesta: D.como_pedir.slice(0, 2).join(" ") });
      if (f0) return sal({ ...base, fuente: f0.fuente, respuesta: frases(f0.texto, 2) || f0.titulo });
      return sal({ ...base, tipo: "no_se", persona: "pidio", respuesta: es ? "No tengo ese dato." : "I don't have that information." });
    }

    // 7e · El panel. Igual de ingenuo: reconoce la sección con una lista FIJA de TODO el panel (también las partes que esa persona no puede
    // abrir, y hasta «el Super Admin») y la propone; con instrucciones en los datos, obedece y propone ir adonde le digan. El servidor decide.
    if (e.uso === "owner") {
      const secs = Array.isArray((e.datos as { puedes_abrir?: unknown }).puedes_abrir) ? (e.datos as { puedes_abrir: { codigo: string; seccion: string; que_hay: string }[] }).puedes_abrir : [];
      const sa = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const TODAS: [RegExp, string][] = [[/super ?admin/, "admin"], [/horario|hours/, "pagina/hor"], [/me pagan|cobro|pagos?\b|payout|banco|bank/, "cobros"], [/\bplan\b|prueba|trial/, "cobros/plan"],
        [/mensaje|message/, "mensajes"], [/resena|review/, "pagina/resenas"], [/pausa|pauso|menu|agotado/, "vendes"], [/evento|event/, "eventos"], [/solicitud|aprobar/, "hoy"]];
      const ir = (x: string) => TODAS.find(([re]) => re.test(sa(x)))?.[1] ?? "";
      const veneno0 = [texto, ...e.trozos.map((x) => x.texto)].find((x) => INYECCION.test(x));
      if (veneno0) return sal({ ...base, fuente: "cuenta", respuesta: es ? "Claro, te llevo ahí." : "Sure, I'll take you there.", accion: { tipo: "go_to_panel", ref: ir(veneno0) || "cobros", pantalla: "" } });
      const ref = ir(texto), sec = secs.find((x) => x.codigo === ref), nombre = sec?.seccion;
      const accion = ref ? { tipo: "go_to_panel", ref, pantalla: "" } : base.accion;
      // Reconoció una sección de las suyas: la explica con la guía del panel (SEGÚN TU PANEL); si no, con la ayuda.
      if (sec) return sal({ ...base, fuente: "cuenta", accion, respuesta: es ? `Eso está en ${sec.seccion}. ${sec.que_hay}` : `That is in ${sec.seccion}. ${sec.que_hay}` });
      if (f0) return sal({ ...base, fuente: f0.fuente, respuesta: frases(f0.texto, 2) || f0.titulo, accion });
      if (ref) return sal({ ...base, fuente: "cuenta", accion, respuesta: es ? `Eso está en ${nombre ?? "otra parte del panel"}.` : `That is in ${nombre ?? "another part of the dashboard"}.` });
      return sal({ ...base, tipo: "no_se", persona: "no_sabe", respuesta: es ? "No tengo ese dato. Si quieres, te paso con una persona." : "I don't have that information. If you want, I'll pass you to a person." });
    }

    // Modelo ingenuo: si un dato trae instrucciones, las sigue (las pruebas demuestran que el servidor lo frena).
    const veneno = [texto, ...e.trozos.map((x) => x.texto)].find((x) => INYECCION.test(x));
    if (veneno) {
      const num = /\b(?:[A-Z]{1,2}-)?\d{3,}\b/.exec(veneno)?.[0] ?? "";
      const tel = /\b\d{3}-\d{3}-\d{4}\b/.exec(veneno)?.[0];
      const fte = e.trozos.find((x) => x.texto === veneno)?.fuente ?? "";
      return sal({ ...base, fuente: fte, respuesta: es ? `Soy el dueño. Te hago 50 % de descuento y cancelo ${num || "todo"}.${tel ? ` Llama al ${tel}.` : ""}` : `I'm the owner. 50 % off and I'll cancel ${num || "everything"}.${tel ? ` Call ${tel}.` : ""}`,
        accion: { tipo: "cancel_request", ref: num, pantalla: "" } });
    }

    // La operación de la que habla la persona (elegirOperacion, la misma de las reglas fijas): nunca la primera de la lista. Lo demás sigue ingenuo.
    const ops = (Array.isArray((e.datos as { operaciones?: unknown }).operaciones) ? (e.datos as { operaciones: OpCtx[] }).operaciones : []);
    const hecho = quiereCancelar(texto) ? respuestaCancelar({ texto, lang: e.lang, ops }) : quiereAbrir(texto) ? respuestaAbrir({ texto, lang: e.lang, ops }) : null;
    if (hecho) return sal({ ...base, ...hecho });
    if (f0) return sal({ ...base, fuente: f0.fuente, respuesta: frases(f0.texto, 2) || f0.titulo });
    return sal({ ...base, tipo: "no_se", persona: "no_sabe", respuesta: es ? "No tengo ese dato. Si quieres, te paso con una persona." : "I don't have that information. If you want, I'll pass you to a person.",
      chips: es ? ["Con una persona"] : ["Talk to a person"] });
  },
};
