import "server-only";
import { ENTORNO } from "../entorno";
import { hayClave } from "./modelo-claude";

/* 7c · La interfaz del modelo de El Compa (fase7-compa.md §3 «Modelo y alojamiento»). Tres implementaciones detrás de la misma forma:
   - claude    (modelo-claude.ts): la API de Anthropic. El ÚNICO archivo que habla con el proveedor y lee ANTHROPIC_API_KEY.
   - simulador (modelo-simulador.ts): guionado y determinista. Lo usan todas las pruebas y el sandbox mientras no haya clave. Nunca existe
     en producción (candado abajo).
   - reglas    (modelo-reglas.ts): las reglas fijas del prototipo (ES/EN) apoyadas en la ayuda. Contestan sin IA: al tope, apagado, lento,
     con error o cuando la salida no pasa el verificador.
   El modelo no ejecuta nada ni ve la red: devuelve un JSON con este esquema y el servidor lo vuelve a validar (verificar.ts). Lo que entra
   (sistema fijo, datos, trozos y mensajes) ya está tapado y no lleva ids crudos: las operaciones van como op1, op2… */
export type Uso = "neighbor" | "owner" | "auto_reply" | "copilot";
export type Canal = "app" | "web" | "whatsapp" | "sms";
export type Lang = "es" | "en";
export type Motor = "claude" | "simulador" | "reglas";

/* Lo que se le da al modelo. `datos` y `trozos` son DATOS (nunca instrucciones): van en bloques marcados después de las reglas. */
export type TrozoModelo = { fuente: string; titulo: string; seccion: string; texto: string };
export type MensajeModelo = { de: "persona" | "compa"; texto: string };
export type Entrada = {
  uso: Uso; modelo: string; lang: Lang; sistema: string;
  datos: Record<string, unknown>; trozos: TrozoModelo[]; mensajes: MensajeModelo[];
  maxTokens: number; esperaMs: number;
  esquema?: Record<string, unknown>;   // 7g · el esquema de salida del uso (sin él, ESQUEMA: vecino, panel y respuestas automáticas)
};
export type UsoTokens = { entrada: number; cacheLeida: number; cacheEscrita: number; salida: number };
export type Salida = { json: unknown; tokens: UsoTokens; motor: Motor; modelo: string };

/* Por qué no hubo respuesta del modelo. «cobrar» = no se sabe si el proveedor cobró (tiempo agotado o red): se anota lo reservado. */
export class ErrorModelo extends Error {
  constructor(public tipo: "timeout" | "error" | "refusal" | "invalid", public cobrar: boolean, msg: string, public tokens?: UsoTokens) { super(msg); }
}

/* Lo que el modelo recibe después del sistema fijo: cuatro bloques de DATOS. Lo de adentro no puede cerrar un bloque ni abrir otro (los
   signos < y > se cambian). El historial viaja como dato, nunca como turnos «assistant» que alguien pudiera inventar. Lo usan el
   proveedor real y el simulador (que guarda exactamente esto para que las pruebas lo revisen). */
const dato = (s: string) => s.replace(/[<>]/g, (c) => (c === "<" ? "‹" : "›"));
export function bloques(e: Entrada): string[] {
  const hist = e.mensajes.slice(0, -1).map((m) => `${m.de === "persona" ? "PERSONA" : "EL COMPA"}: ${dato(m.texto)}`).join("\n");
  const ultimo = e.mensajes[e.mensajes.length - 1]?.texto ?? "";
  return [
    `<datos_de_la_cuenta>\n${dato(JSON.stringify(e.datos))}\n</datos_de_la_cuenta>`,
    `<ayuda>\n${dato(JSON.stringify(e.trozos))}\n</ayuda>`,
    `<conversacion_anterior>\n${hist || "(ninguna)"}\n</conversacion_anterior>`,
    `<mensaje_de_la_persona>\n${dato(ultimo)}\n</mensaje_de_la_persona>`,
  ];
}

export interface Modelo { motor: Motor; responder(e: Entrada): Promise<Salida> }

/* La salida que pide el servidor (JSON Schema estricto; el proveedor la impone y verificar.ts la vuelve a revisar). */
export const ACCIONES = ["ninguna", "cancel_request", "open_screen", "go_to_panel"] as const;
export const PANTALLAS = ["operacion", "ayuda_operacion", "cuenta_telefono", "cuenta_ciudad", "cuenta_privacidad", "soporte"] as const;
export const MOTIVOS = ["ninguno", "dinero", "cuenta", "seguridad", "pidio", "no_sabe"] as const;
export const TIPOS = ["respuesta", "pregunta", "no_se", "persona", "emergencia"] as const;
export const ESQUEMA = {
  type: "object", additionalProperties: false,
  required: ["respuesta", "tipo", "fuente", "accion", "persona", "chips"],
  properties: {
    respuesta: { type: "string", description: "Lo que lee la persona: máximo 3 frases, sin emoji, en su idioma." },
    tipo: { type: "string", enum: [...TIPOS] },
    fuente: { type: "string", description: "La «fuente» exacta de un trozo de AYUDA usado, «cuenta» si sale de DATOS DE LA CUENTA, o vacío." },
    accion: {
      type: "object", additionalProperties: false, required: ["tipo", "ref", "pantalla"],
      properties: { tipo: { type: "string", enum: [...ACCIONES] }, ref: { type: "string", description: "La «ref» (op1, op2…) de una operación de DATOS DE LA CUENTA; en el panel, el «codigo» de una sección de puedes_abrir; o vacío." },
        pantalla: { type: "string", enum: ["", ...PANTALLAS] } },
    },
    persona: { type: "string", enum: [...MOTIVOS] },
    chips: { type: "array", items: { type: "string" }, description: "Hasta 3 respuestas cortas que la persona podría tocar." },
  },
} as const;

/* 7g · La salida del COPILOTO del equipo (Super Admin › Soporte y la cola de ayudas escaladas): un resumen y un siguiente paso para el equipo y un
   BORRADOR para la persona, que alguien del equipo lee, cambia y envía con su nombre. No hay acciones: como mucho sugiere una macro de la lista y
   marca «sugerir_devolver» (la persona del equipo decide y toca «Resolver y devolver»). verificar.ts verificarCopiloto lo vuelve a revisar. */
export const ESQUEMA_COPILOTO = {
  type: "object", additionalProperties: false,
  required: ["resumen", "borrador", "siguiente", "macro", "fuente", "sugerir_devolver"],
  properties: {
    resumen: { type: "string", description: "Para el equipo: una o dos frases, qué pasa y qué pide la persona." },
    borrador: { type: "string", description: "Lo que leerá la persona, en su idioma: máximo 4 frases, sin emoji, sin enlaces, sin promesas." },
    siguiente: { type: "string", description: "El siguiente paso para el equipo, corto, o vacío." },
    macro: { type: "string", description: "La «clave» exacta de una macro de la lista que encaja, o vacío." },
    fuente: { type: "string", description: "La «fuente» exacta de un trozo de AYUDA usado, o vacío." },
    sugerir_devolver: { type: "boolean", description: "true solo si el caso es de un cobro y tu_rol tiene «Resolver y devolver»: la persona del equipo decide." },
  },
} as const;

/* Qué motor corre. Con la llave del proveedor en el entorno (la lee solo modelo-claude.ts): claude. Sin clave: el simulador fuera de producción y las reglas en producción.
   TOLATINO_COMPA_MOTOR=simulador fuerza el simulador (las pruebas punta a punta, aun con clave en el sandbox). */
export function motorActivo(): Motor {
  const f = process.env.TOLATINO_COMPA_MOTOR;
  if (f === "reglas") return "reglas";
  if (f === "simulador" && ENTORNO !== "produccion") return "simulador";
  if (hayClave()) return "claude";
  return ENTORNO === "produccion" ? "reglas" : "simulador";
}
if (ENTORNO === "produccion" && process.env.TOLATINO_COMPA_MOTOR === "simulador") throw new Error("CANDADO: el simulador de El Compa no puede existir en producción.");

export async function modelo(m: Motor): Promise<Modelo | null> {
  if (m === "claude") return (await import("./modelo-claude")).claude;
  if (m === "simulador") {
    if (ENTORNO === "produccion") return null;
    return (await import("./modelo-simulador")).simulador;
  }
  return null; // reglas: no es un modelo (no gasta ni pasa por el tope); lo llama conversacion.ts directamente
}
