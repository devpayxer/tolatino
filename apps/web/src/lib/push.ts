'use client';

// Web Push (VAPID) client — registers the service worker, subscribes the device,
// and upserts the subscription to public.push_subscriptions so the send-push Edge
// Function can deliver order updates to this phone/browser even with the app
// closed. Free (VAPID, no vendor). See supabase/functions/send-push + migration
// 0089. Everything is best-effort: unsupported browsers / denied permission just
// no-op so the app never breaks.

import { supabase } from '@/lib/supabase';

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type PushState = 'unsupported' | 'default' | 'granted' | 'denied';

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushState(): PushState {
  if (!pushSupported() || !VAPID) return 'unsupported';
  return Notification.permission as PushState; // 'default' | 'granted' | 'denied'
}

function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/sw.js');
  const reg = existing ?? (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  return reg;
}

async function subscribeAndStore(lang: 'es' | 'en'): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return false;
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToArrayBuffer(VAPID) });
  }
  const j = sub.toJSON();
  const p256dh = j.keys?.p256dh;
  const auth = j.keys?.auth;
  if (!sub.endpoint || !p256dh || !auth) return false;
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: user.id, endpoint: sub.endpoint, p256dh, auth, lang, ua: navigator.userAgent.slice(0, 200) },
    { onConflict: 'endpoint' },
  );
  return !error;
}

/** From a user gesture: request permission if needed, then subscribe + store. */
export async function enablePush(lang: 'es' | 'en' = 'es'): Promise<PushState> {
  if (!pushSupported() || !VAPID) return 'unsupported';
  const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (perm !== 'granted') return perm as PushState;
  await subscribeAndStore(lang);
  return 'granted';
}

/** Silent: refresh the stored subscription when permission is already granted. */
export async function syncPush(lang: 'es' | 'en' = 'es'): Promise<void> {
  if (!pushSupported() || !VAPID || Notification.permission !== 'granted') return;
  try { await subscribeAndStore(lang); } catch { /* best-effort */ }
}

/** Turn off push on this device and forget the subscription. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe().catch(() => {});
      if (supabase) await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }
  } catch { /* best-effort */ }
}
