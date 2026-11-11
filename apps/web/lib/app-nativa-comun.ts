/* 8a · Las cuatro cáscaras (fase8-apps.md §3.1): lo que se puede decidir SIN la base, en el middleware (edge) y en el servidor.
   La fuente es apps/mobile/apps.json (guardián appsUnaFuente): nada de ids, entradas ni alcances escritos a mano aquí.
   El rótulo TLApp del user-agent («TLApp/{app}/{ios|android}/{versión} ({build})») DICE qué app es; nunca da permisos ni cambia lo que se
   cobra o se ve (guardián appNoAutoriza): solo sirve para mandar a la entrada correcta, mostrar «Actualiza la app» y anotar la sesión. */
import APPS from "../../mobile/apps.json";

export type ClaveApp = "cliente" | "negocio" | "delivery" | "checkin";
export type Plataforma = "ios" | "android";
export type AppNativa = { app: ClaveApp; plataforma: Plataforma; version: string; build: number };
type Bi = { es: string; en: string };
export type DefApp = { key: ClaveApp; nombre: Bi; ios: string; android: string; entrada: string; alcance: string[]; islas: string[] };

export const DEF_APPS = APPS.apps as unknown as DefApp[];
export const CLAVES_APP = DEF_APPS.map((a) => a.key);
const PRIMERA = DEF_APPS.find((a) => a.alcance.includes("/")) ?? DEF_APPS[0]!;
export const defApp = (k: ClaveApp): DefApp => DEF_APPS.find((a) => a.key === k) ?? PRIMERA;

/* El rótulo. Estricto: una versión semver y un build entero; cualquier otra cosa = no es la app (la web de siempre). */
const RE = /\bTLApp\/(cliente|negocio|delivery|checkin)\/(ios|android)\/(\d{1,3}\.\d{1,3}\.\d{1,3}) \((\d{1,9})\)/;
export function leerRotulo(ua: string | null | undefined): AppNativa | null {
  const m = RE.exec(String(ua ?? "").slice(0, 600));
  return m ? { app: m[1] as ClaveApp, plataforma: m[2] as Plataforma, version: m[3]!, build: Number(m[4]) } : null;
}

const bajo = (ruta: string, p: string) => p === "/" ? true : ruta === p || ruta.startsWith(p + "/");
/* De quién es una ruta: «tecnico» y «comun» los abren las cuatro; «web» solo el navegador (Super Admin); si no, la app dueña.
   La app con alcance «/» (To'Latino) se queda con todo lo que no es de otra. */
export type Dueno = ClaveApp | "comun" | "tecnico" | "web";
export function duenoDe(ruta: string): Dueno {
  const r = ruta.split("?")[0]!.split("#")[0]! || "/";
  if (APPS.tecnico.some((p) => bajo(r, p))) return "tecnico";
  if (APPS.comun.some((p) => bajo(r, p))) return "comun";
  if (APPS.soloWeb.some((p) => bajo(r, p))) return "web";
  for (const a of DEF_APPS) if (!a.alcance.includes("/") && a.alcance.some((p) => bajo(r, p))) return a.key;
  return PRIMERA.key;
}
/* ¿La abre esta app (sin salir de la cáscara)? */
export function enAlcance(app: ClaveApp, ruta: string): boolean {
  const d = duenoDe(ruta);
  return d === "tecnico" || d === "comun" || d === app;
}
/* Las rutas de «inicio» (/ y Mi cuenta) llevan a la entrada de cada app. */
export const esInicio = (ruta: string) => APPS.inicio.includes(ruta.split("?")[0]!.replace(/\/$/, "") || "/");

/* Lo que hace el middleware con una petición de página de la cáscara: nada, a su entrada o a «Esto se abre en otra app». */
export function destinoEnApp(app: ClaveApp, ruta: string): string | null {
  const e = defApp(app).entrada;
  if (esInicio(ruta) && e !== "/") return e;
  if (enAlcance(app, ruta)) return null;
  return `/app/fuera?r=${encodeURIComponent(ruta.slice(0, 300))}`;
}
