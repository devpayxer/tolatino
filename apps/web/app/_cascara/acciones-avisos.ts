"use server";
/* 8c · Los avisos en ESTE teléfono (fase8-apps.md §3.3, Mi cuenta › Avisos «En este teléfono», Panel › Tus apps, la hoja previa). Cada acción:
   que venga de nuestra página (mismoOrigen), con sesión, y todo lo de la cuenta lo decide el servidor (la sesión de la cookie; nunca un id que
   mande el teléfono). Registrar ata el token a ESTA sesión; apagar solo toca los teléfonos de la persona. */
import { mismoOrigen, sesionActual, yo } from "@/lib/cuenta";
import { evento } from "@/lib/eventos";
import { fcmListo, llaveVapid } from "@/lib/push/llaves";
import { apagar, apagarEste, misDispositivos, registrar, type Dispositivo, type Registro } from "@/lib/push/tokens";

type Res = { ok: boolean; motivo?: string };
const PROV = ["apns", "fcm", "webpush"] as const;

/* La llave pública VAPID (applicationServerKey del navegador; pública por naturaleza) y si Android ya puede pedir su token de FCM: la cáscara
   de Android solo trae la configuración de Firebase cuando el CI de las tiendas (8h) la pone desde el llavero, con la misma cuenta de servicio;
   sin ella, pedir el token cerraría la app, así que hasta entonces Android dice «no disponible» y el SMS sigue. */
export async function avisosClave(): Promise<{ vapid: string; fcm: boolean }> { // solo lectura
  return { vapid: llaveVapid().publica, fcm: await fcmListo() };
}

export async function avisosRegistrar(r: Registro): Promise<Res> {
  if (!(await mismoOrigen())) return { ok: false, motivo: "origen" };
  const [u, ses] = await Promise.all([yo(), sesionActual()]);
  if (!u || !ses) return { ok: false, motivo: "sin_sesion" };
  if (!r || typeof r !== "object" || !(PROV as readonly string[]).includes(String(r.provider)) || typeof r.token !== "string" || r.token.length > 4096) return { ok: false, motivo: "datos" };
  const x = await registrar(u.id, ses, { provider: r.provider, token: r.token, p256dh: typeof r.p256dh === "string" ? r.p256dh.slice(0, 200) : undefined, auth: typeof r.auth === "string" ? r.auth.slice(0, 60) : undefined });
  if (!x.ok) return { ok: false, motivo: x.msg };
  if (x.nuevo) await evento("permiso_respuesta", { props: { permiso: "avisos", respuesta: "registrado" } }).catch(() => undefined);
  return { ok: true };
}

export async function avisosApagarEste(): Promise<Res> {
  if (!(await mismoOrigen())) return { ok: false, motivo: "origen" };
  const [u, ses] = await Promise.all([yo(), sesionActual()]);
  if (!u || !ses) return { ok: false, motivo: "sin_sesion" };
  await apagarEste(u.id, ses);
  return { ok: true };
}

export async function avisosApagar(id: string): Promise<Res> {
  if (!(await mismoOrigen())) return { ok: false, motivo: "origen" };
  const u = await yo();
  if (!u) return { ok: false, motivo: "sin_sesion" };
  return { ok: await apagar(u.id, String(id ?? "")) };
}

export async function avisosDispositivos(): Promise<Dispositivo[]> { // solo lectura
  const [u, ses] = await Promise.all([yo(), sesionActual()]);
  return u ? misDispositivos(u.id, ses) : [];
}
