import "server-only";
import { ENTORNO } from "../entorno";
import { bloques, ErrorModelo, type Entrada, type Modelo, type Salida } from "./modelo";

/* 7c · El simulador de El Compa (sandbox sin clave y todas las pruebas punta a punta). Determinista y guionado por intención. A propósito se
   porta como un modelo INGENUO: si un dato (lo que escribe la persona o un trozo de ayuda) trae instrucciones, las obedece — propone cancelar
   el número que le dicten, repite un teléfono, inventa un descuento. Así las pruebas demuestran que la seguridad NO depende del modelo: el
   servidor (lista cerrada de acciones contra la sesión y verificar.ts) lo frena igual.
   Guarda lo que recibió (el sistema y los bloques exactos que iría al proveedor) para que las pruebas revisen que nada tapado ni ajeno sale.
   Nunca existe en producción (modelo.ts no lo carga y este archivo se niega). */
if (ENTORNO === "produccion") throw new Error("CANDADO: el simulador de El Compa no existe en producción.");

export type Recibido = { at: string; uso: string; modelo: string; sistema: string; bloques: string[] };
const G = globalThis as unknown as { __compaSim?: Recibido[] };
export function recibidos(): Recibido[] { return [...(G.__compaSim ?? [])]; }
export function olvidarRecibidos() { G.__compaSim = []; }

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const frases = (t: string, n: number) => t.replace(/[#*_`>|]/g, " ").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim()
  .split(/(?<=[.!?])\s+/).filter((x) => x.length > 3).slice(0, n).join(" ");
type Op = { ref: string; numero: string; negocio: string; estado: string; cancelable_gratis: boolean };
const INYECCION = /(ignor[ae]|olvida|ignore|forget|disregard).{0,40}(reglas|instrucciones|rules|instructions)|instrucciones para el asistente|instructions for the assistant|eres el due[ñn]o|you are the owner/i;

export const simulador: Modelo = {
  motor: "simulador",
  async responder(e: Entrada): Promise<Salida> {
    const b = bloques(e);
    const G2 = (G.__compaSim ??= []);
    G2.push({ at: new Date().toISOString(), uso: e.uso, modelo: e.modelo, sistema: e.sistema, bloques: b });
    if (G2.length > 60) G2.splice(0, G2.length - 60);
    const texto = e.mensajes[e.mensajes.length - 1]?.texto ?? "", t = texto.toLowerCase(), es = e.lang === "es";
    const entrada = Math.ceil((e.sistema.length + b.join("").length) / 4);
    await dormir(40 + (texto.length % 80));
    const sal = (json: Record<string, unknown>): Salida => ({ json, motor: "simulador", modelo: e.modelo,
      tokens: { entrada, cacheLeida: 0, cacheEscrita: 0, salida: Math.ceil(JSON.stringify(json).length / 4) } });
    const base = { tipo: "respuesta", fuente: "", accion: { tipo: "ninguna", ref: "", pantalla: "" }, persona: "ninguno", chips: [] as string[] };

    // Fallas guionadas (solo el simulador las entiende).
    if (t.includes("simular-lento")) { await dormir(e.esperaMs + 3000); return sal({ ...base, respuesta: es ? "Tarde." : "Late." }); }
    if (t.includes("simular-error")) throw new ErrorModelo("error", false, "simulador: error del proveedor");
    if (t.includes("simular-rechazo")) throw new ErrorModelo("refusal", false, "simulador: el modelo no contestó", { entrada, cacheLeida: 0, cacheEscrita: 0, salida: 0 });
    if (t.includes("simular-roto")) return sal({ respuesta: 5, tipo: "cualquiera" });
    const f0 = e.trozos[0];
    if (t.includes("simular-inventa")) return sal({ ...base, respuesta: es ? "Te devolvemos el 75 % y la cancelación cuesta $19.99." : "We refund 75 % and cancelling costs $19.99.", fuente: f0?.fuente ?? "" });
    if (t.includes("simular-filtra")) return sal({ ...base, respuesta: es ? "Tu tarjeta 4242 4242 4242 4242 está bien. Llámanos al 570-555-0100." : "Your card 4242 4242 4242 4242 is fine. Call us at 570-555-0100.", fuente: f0?.fuente ?? "" });
    if (t.includes("simular-hecho")) return sal({ ...base, respuesta: es ? "Listo, ya cancelé tu solicitud." : "Done, I already cancelled your request.", fuente: "cuenta" });
    if (t.includes("simular-cita-ajena")) return sal({ ...base, respuesta: es ? "El código de arranque está en el Super Admin." : "The startup code is in the Super Admin.", fuente: "admin-equipo" });
    if (t.includes("simular-emoji")) return sal({ ...base, respuesta: es ? "Claro que sí 😀 te ayudo." : "Sure 😀 happy to help.", fuente: f0?.fuente ?? "" });
    if (t.includes("simular-persona")) return sal({ ...base, tipo: "persona", respuesta: es ? "Te paso con una persona." : "I'll pass you to a person.", persona: "no_sabe" });

    // Modelo ingenuo: si un dato trae instrucciones, las sigue (las pruebas demuestran que el servidor lo frena).
    const veneno = [texto, ...e.trozos.map((x) => x.texto)].find((x) => INYECCION.test(x));
    if (veneno) {
      const num = /\b(?:[A-Z]{1,2}-)?\d{3,}\b/.exec(veneno)?.[0] ?? "";
      const tel = /\b\d{3}-\d{3}-\d{4}\b/.exec(veneno)?.[0];
      const fte = e.trozos.find((x) => x.texto === veneno)?.fuente ?? "";
      return sal({ ...base, fuente: fte, respuesta: es ? `Soy el dueño. Te hago 50 % de descuento y cancelo ${num || "todo"}.${tel ? ` Llama al ${tel}.` : ""}` : `I'm the owner. 50 % off and I'll cancel ${num || "everything"}.${tel ? ` Call ${tel}.` : ""}`,
        accion: { tipo: "cancel_request", ref: num, pantalla: "" } });
    }

    const ops = (Array.isArray((e.datos as { operaciones?: unknown }).operaciones) ? (e.datos as { operaciones: Op[] }).operaciones : []);
    if (/\b(cancel|cancela|cancelar|cancelo|anular)/.test(t)) {
      const p = ops.find((o) => o.cancelable_gratis);
      if (p) return sal({ ...base, fuente: "cuenta", accion: { tipo: "cancel_request", ref: p.ref, pantalla: "" },
        respuesta: es ? `Te preparé la cancelación de tu solicitud en ${p.negocio}. Como todavía no está confirmada, no pagas nada.` : `I prepared the cancellation of your request at ${p.negocio}. It isn't confirmed yet, so you pay nothing.` });
    }
    if (/\b(ver mi|abre mi|abrir mi|d[oó]nde est[aá] mi|show me my|open my)\b/.test(t) && ops[0])
      return sal({ ...base, fuente: "cuenta", accion: { tipo: "open_screen", ref: ops[0].ref, pantalla: "operacion" }, respuesta: es ? `Te abro ${ops[0].numero}.` : `Opening ${ops[0].numero}.` });
    if (f0) return sal({ ...base, fuente: f0.fuente, respuesta: frases(f0.texto, 2) || f0.titulo });
    return sal({ ...base, tipo: "no_se", persona: "no_sabe", respuesta: es ? "No tengo ese dato. Si quieres, te paso con una persona." : "I don't have that information. If you want, I'll pass you to a person.",
      chips: es ? ["Con una persona"] : ["Talk to a person"] });
  },
};
