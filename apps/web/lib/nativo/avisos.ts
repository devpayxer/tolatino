"use client";
/* 8c · Los avisos en este teléfono (fase8-apps.md §3.3): en las cáscaras, el plugin oficial PushNotifications de Capacitor (iOS: el token de APNs
   directo; Android: el de FCM, solo mensajería); en la web (y en la web instalada en la pantalla de inicio del iPhone), Web Push con el service
   worker /sw-push.js (alcance «/», solo muestra y abre; no guarda nada) y la llave VAPID del servidor. El token lo guarda el servidor atado a
   la sesión (acciones-avisos.ts). Sin contexto seguro (el sandbox por HTTP en la IP), sin service worker o sin Push API: «no disponible», y la
   campana y el SMS siguen como siempre. Cada función hace lo mismo sin la cáscara (guardián nativoConRespaldo). */
import { avisosApagarEste, avisosClave, avisosRegistrar } from "@/app/_cascara/acciones-avisos";
import { plataforma, plugin } from "./puente";

export type EstadoAvisos = "no_disponible" | "preguntar" | "concedido" | "negado";
type Permisos = { receive: "prompt" | "prompt-with-rationale" | "granted" | "denied" };
type Escucha = { remove(): Promise<void> };
type Toque = { notification: { data?: { u?: string } } };
type PushNotifications = {
  checkPermissions(): Promise<Permisos>; requestPermissions(): Promise<Permisos>; register(): Promise<void>; unregister(): Promise<void>;
  addListener(e: "registration", f: (t: { value: string }) => void): Promise<Escucha>;
  addListener(e: "registrationError", f: (x: { error: string }) => void): Promise<Escucha>;
  addListener(e: "pushNotificationActionPerformed", f: (a: Toque) => void): Promise<Escucha>;
};
const SW = "/sw-push.js";
/* base64url → bytes (applicationServerKey: algunos navegadores no aceptan el texto). */
const bytes = (s: string) => { const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

/* ¿Puede este navegador recibir Web Push? Contexto seguro (https o localhost), service worker, Push API y notificaciones. */
export function webPushPosible(): boolean {
  return typeof window !== "undefined" && window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
const desdeSistema = (r: Permisos["receive"]): EstadoAvisos => (r === "granted" ? "concedido" : r === "denied" ? "negado" : "preguntar");

export async function estadoAvisos(): Promise<EstadoAvisos> {
  const p = plugin<PushNotifications>("PushNotifications");
  if (!p) {
    if (!webPushPosible()) return "no_disponible";
    // El permiso de la página (Permissions API) y, si no está, el de Notification.
    let st: string = Notification.permission;
    try { const q = await navigator.permissions.query({ name: "notifications" as PermissionName }); st = q.state === "prompt" ? "default" : q.state; } catch { /* sin Permissions API */ }
    return st === "granted" ? "concedido" : st === "denied" ? "negado" : "preguntar";
  }
  if (plataforma() === "android" && !(await clave()).fcm) return "no_disponible";
  try { return desdeSistema((await p.checkPermissions()).receive); } catch { return "no_disponible"; }
}
let claveP: Promise<{ vapid: string; fcm: boolean }> | null = null;
const clave = () => (claveP ??= avisosClave().catch(() => { claveP = null; return { vapid: "", fcm: false }; }));

/* El service worker de push (alcance «/»). Se registra temprano en las pantallas que ofrecen avisos, así el permiso se pide en el mismo toque. */
export async function prepararAvisos(): Promise<ServiceWorkerRegistration | null> {
  if (!webPushPosible()) return null;
  try {
    const r = await navigator.serviceWorker.register(SW, { scope: "/" });
    if (!r.active) await new Promise<void>((ok) => {
      const w = r.installing ?? r.waiting;
      if (!w) return ok();
      w.addEventListener("statechange", () => { if (w.state === "activated" || w.state === "redundant") ok(); });
      setTimeout(ok, 8000);
    });
    return r;
  } catch { return null; }
}

/* Pedir y registrar. Llamarla DENTRO del toque de la persona: en la web el permiso se pide antes de cualquier espera (Safari lo exige). */
export async function activarAvisos(): Promise<{ ok: boolean; motivo?: "no_disponible" | "negado" | "error" }> {
  const p = plugin<PushNotifications>("PushNotifications");
  if (!p) {
    if (!webPushPosible()) return { ok: false, motivo: "no_disponible" };
    const permiso = Notification.requestPermission();
    const [perm, reg, { vapid }] = await Promise.all([permiso, prepararAvisos(), clave()]);
    if (perm !== "granted") return { ok: false, motivo: perm === "denied" ? "negado" : "error" };
    if (!reg || !vapid) return { ok: false, motivo: "error" };
    try {
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(vapid) }));
      const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!j.endpoint || !j.keys?.p256dh || !j.keys.auth) return { ok: false, motivo: "error" };
      const r = await avisosRegistrar({ provider: "webpush", token: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth });
      return r.ok ? { ok: true } : { ok: false, motivo: "error" };
    } catch { return { ok: false, motivo: "error" }; }
  }
  if (plataforma() === "android" && !(await clave()).fcm) return { ok: false, motivo: "no_disponible" };
  try {
    const perm = await p.requestPermissions();
    if (perm.receive !== "granted") return { ok: false, motivo: perm.receive === "denied" ? "negado" : "error" };
    const token = await new Promise<string | null>((ok) => {
      const hs: Promise<Escucha>[] = [];
      const fin = (t: string | null) => { for (const h of hs) void h.then((x) => x.remove()).catch(() => undefined); ok(t); };
      hs.push(p.addListener("registration", (t) => fin(t.value)), p.addListener("registrationError", () => fin(null)));
      setTimeout(() => fin(null), 15_000);
      void p.register().catch(() => fin(null));
    });
    if (!token) return { ok: false, motivo: "error" };
    const r = await avisosRegistrar({ provider: plataforma() === "ios" ? "apns" : "fcm", token });
    return r.ok ? { ok: true } : { ok: false, motivo: "error" };
  } catch { return { ok: false, motivo: "error" }; }
}

/* Apagar en este teléfono: el servidor deja de mandarle (revocado «apagado») y el navegador suelta la suscripción. */
export async function desactivarAvisos(): Promise<boolean> {
  const r = await avisosApagarEste().catch(() => ({ ok: false }));
  const p = plugin<PushNotifications>("PushNotifications");
  if (!p) {
    if (webPushPosible()) {
      const reg = await navigator.serviceWorker.getRegistration("/").catch(() => undefined);
      await (await reg?.pushManager.getSubscription().catch(() => null))?.unsubscribe().catch(() => false);
    }
    return r.ok;
  }
  await p.unregister().catch(() => undefined);
  return r.ok;
}

/* Al abrir la app o la página con el permiso ya dado: vuelve a registrar el token (rota, y «visto» evita que venza por falta de uso). */
export async function refrescarAvisos(): Promise<void> {
  if ((await estadoAvisos()) !== "concedido") return;
  const p = plugin<PushNotifications>("PushNotifications");
  if (!p) {
    const reg = await navigator.serviceWorker.getRegistration("/").catch(() => undefined);
    const sub = await reg?.pushManager.getSubscription().catch(() => null);
    const j = sub?.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;
    if (j?.endpoint && j.keys?.p256dh && j.keys.auth) await avisosRegistrar({ provider: "webpush", token: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }).catch(() => undefined);
    return;
  }
  await activarAvisos().catch(() => undefined);
}

/* Tocar un aviso en la app: abre /app/aviso/{id} en el servidor (marca abierto y lleva a su pantalla). Solo esa ruta: nada de otro origen. */
export async function escucharToques(): Promise<() => void> {
  const p = plugin<PushNotifications>("PushNotifications");
  if (!p) return () => undefined; // la web: lo abre el service worker
  const h = await p.addListener("pushNotificationActionPerformed", (a) => {
    const u = String(a.notification.data?.u ?? "");
    if (/^\/app\/aviso\/\d{1,18}(\?v=push)?$/.test(u)) location.href = u;
  });
  return () => { void h.remove(); };
}
