"use client";
/* 8a · Permisos del teléfono (fase8-apps.md §1b #2, §3.6 Apple 5.1.1(iv)): saber si la cámara o la ubicación ya están concedidas o negadas
   antes de pedirlas, para mostrar la hoja previa solo cuando sirve, y abrir los Ajustes de la app si la persona dijo que no. La hoja previa
   (app/_cascara/HojaPermiso.tsx) nunca imita el diálogo del sistema; la pregunta de verdad la hace el sistema al usar la cámara o la ubicación.
   En la app: Permissions API del WebView (lo que el sistema le dio a la app) y TLPantalla.ajustes() para abrir los Ajustes. En la web: la
   Permissions API del navegador; los Ajustes no se pueden abrir desde la web (devuelve false y la pantalla dice dónde están). */
import { plugin } from "./puente";

export type Permiso = "camara" | "ubicacion";
export type EstadoPermiso = "concedido" | "negado" | "preguntar";
const NOMBRE: Record<Permiso, string> = { camara: "camera", ubicacion: "geolocation" };

export async function estadoPermiso(p: Permiso): Promise<EstadoPermiso> {
  try {
    const r = await navigator.permissions.query({ name: NOMBRE[p] as PermissionName });
    return r.state === "granted" ? "concedido" : r.state === "denied" ? "negado" : "preguntar";
  } catch { return "preguntar"; } // sin Permissions API para ese permiso: se pregunta (la hoja previa sale una vez)
}

type TLPantalla = { ajustes(): Promise<void> };
export async function abrirAjustes(): Promise<boolean> {
  const x = plugin<TLPantalla>("TLPantalla");
  if (!x) return false; // la web no abre los Ajustes del teléfono
  await x.ajustes().catch(() => undefined);
  return true;
}

/* ¿Ya se mostró la hoja previa de este permiso en este teléfono? (una vez; si la persona dijo «Ahora no», vuelve a salir la próxima vez que
   use la función). Solo una marca local, nada de la persona. */
const CLAVE = (p: Permiso) => `tl-hoja-permiso-${p}`;
export function hojaVista(p: Permiso): boolean { try { return localStorage.getItem(CLAVE(p)) === "1"; } catch { return false; } }
export function marcarHoja(p: Permiso) { try { localStorage.setItem(CLAVE(p), "1"); } catch { /* sin almacenamiento */ } }
