/* 9i · Ciudades: lo que comparten el servidor y la pantalla del Super Admin (sin servidor). */
export type Bi = { es: string; en: string };
export type Res<T = object> = ({ ok: true; msg: Bi } & T) | { ok: false; msg: Bi };
export const mal = (es: string, en: string): { ok: false; msg: Bi } => ({ ok: false, msg: { es, en } });
export const bien = <T extends object>(es: string, en: string, x?: T): { ok: true; msg: Bi } & T => ({ ok: true, msg: { es, en }, ...(x ?? ({} as T)) });

export type Estado = "on" | "beta" | "soon" | "off";
export const ESTADO: Record<Estado, Bi> = {
  on: { es: "ABIERTA", en: "OPEN" }, beta: { es: "BETA", en: "BETA" }, soon: { es: "PRÓXIMAMENTE", en: "COMING SOON" }, off: { es: "CERRADA", en: "CLOSED" },
};
export const ESTADO_LARGO: Record<Estado, Bi> = {
  on: { es: "abierta", en: "open" }, beta: { es: "en beta (solo invitados)", en: "in beta (invited only)" }, soon: { es: "próximamente", en: "coming soon" }, off: { es: "cerrada", en: "closed" },
};

/* Los 7 pasos del asistente de apertura (prototipo del Super Admin «STEPS» + «Comprobar», hueco #6 de fase9-apertura.md). */
export const PASOS: Bi[] = [
  { es: "Ciudad y centro", en: "City and center" },
  { es: "Radio y barrios", en: "Radius and neighborhoods" },
  { es: "Categorías de arranque", en: "Starting categories" },
  { es: "Equipo local", en: "Local team" },
  { es: "Negocios listos", en: "Businesses ready" },
  { es: "Comprobar", en: "Check" },
  { es: "Avisar a la lista de espera", en: "Notify the waitlist" },
];

/* Las categorías clave de la regla de apertura (pantallas-iniciales.md: comida, belleza, hogar, fiestas, iglesias). */
export const CLAVES: [string, Bi][] = [
  ["NEG-FOOD", { es: "Comida", en: "Food" }], ["NEG-BELL", { es: "Belleza", en: "Beauty" }], ["NEG-HOGAR", { es: "Hogar", en: "Home" }],
  ["NEG-FIESTA", { es: "Fiestas", en: "Parties" }], ["NEG-FE", { es: "Iglesias", en: "Churches" }],
];
export const nombreCategoria = (k: string): Bi => CLAVES.find(([x]) => x === k)?.[1] ?? { es: k, en: k };

/* Las zonas horarias que se pueden elegir para una ciudad de EE. UU. continental. */
export const ZONAS_HORARIAS = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"] as const;
export const NOMBRE_ZONA: Record<string, Bi> = {
  "America/New_York": { es: "Este (Nueva York)", en: "Eastern (New York)" }, "America/Chicago": { es: "Centro (Chicago)", en: "Central (Chicago)" },
  "America/Denver": { es: "Montaña (Denver)", en: "Mountain (Denver)" }, "America/Los_Angeles": { es: "Pacífico (Los Ángeles)", en: "Pacific (Los Angeles)" },
};

/* El aviso de apertura sale solo de 9 AM a 9 PM de la ciudad (nunca en las horas de silencio, ni en sus orillas). */
export const AVISO_DESDE = 9, AVISO_HASTA = 20;
