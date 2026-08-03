// send-push — fan-out a notification row to the user's Web Push subscriptions.
// Called by the DB trigger tg_push_fanout (pg_net) on every notifications insert.
// verify_jwt = false; authenticated by the shared x-hook-secret header instead
// (the DB is the only caller). Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT, PUSH_HOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

const money = (v: unknown) => (v == null ? '' : `$${Number(v).toFixed(2)}`);
type L = 'es' | 'en';
const pick = (l: L, es: string, en: string) => (l === 'en' ? en : es);
// Qué cosa se compró / se reclama, en palabras. La base manda claves distintas
// según de dónde venga (`payments.kind` en inglés, los reclamos en español).
const COSA: Record<string, [string, string]> = {
  order: ['tu pedido', 'your order'], orden: ['tu pedido', 'your order'],
  booking: ['tu reserva', 'your booking'], reserva: ['tu reserva', 'your booking'],
  rental: ['tu renta', 'your rental'], renta: ['tu renta', 'your rental'],
  ticket: ['tu boleto', 'your ticket'], boleto: ['tu boleto', 'your ticket'],
  otro: ['tu compra', 'your purchase'],
};
const cosa = (v: string, l: L) => (COSA[v] ?? ['tu compra', 'your purchase'])[l === 'en' ? 1 : 0];
const cuando = (v: unknown, l: L) => {
  const t = v ? new Date(String(v)) : null;
  if (!t || Number.isNaN(t.getTime())) return '';
  return t.toLocaleString(l === 'en' ? 'en-US' : 'es-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

// Localized push copy — mirrors apps/web/src/lib/notifications.tsx (Spanish-first).
function render(kind: string, d: Record<string, unknown>, l: L): { title: string; body: string } {
  const s = (k: string) => String(d[k] ?? '');
  const biz = s('business') || s('code');
  const STATUS: Record<string, [string, string]> = {
    new: ['nuevo', 'new'], preparing: ['en preparación', 'preparing'], ready: ['listo', 'ready'],
    completed: ['completado', 'completed'], cancelled: ['cancelado', 'cancelled'],
    pending: ['pendiente', 'pending'], confirmed: ['confirmado', 'confirmed'], seated: ['en curso', 'in progress'],
    done: ['completado', 'done'], out: ['entregado', 'handed out'], returned: ['devuelto', 'returned'],
    used: ['usado', 'used'], refunded: ['reembolsado', 'refunded'], no_show: ['no asistió', 'no-show'],
  };
  const st = (v: unknown): [string, string] => STATUS[String(v)] ?? [String(v ?? ''), String(v ?? '')];
  switch (kind) {
    case 'order_status': {
      const disp = s('dispatch');
      // STORE orders (Tienda) speak Amazon: packing 📦, truck 🚚, store pickup 🛍️.
      const store = s('kind') === 'store';
      if (disp === 'assigned') return { title: pick(l, 'Repartidor asignado a tu pedido', 'A driver was assigned to your order'), body: biz };
      if (disp === 'picked_up') return { title: pick(l, `${s('driver') || 'El repartidor'} recogió tu pedido`, `${s('driver') || 'Your driver'} picked up your order`), body: biz };
      if (disp === 'on_the_way') return { title: pick(l, `¡Tu pedido va en camino! ${store ? '🚚' : '🛵'}`, `Your order is on the way! ${store ? '🚚' : '🛵'}`), body: biz };
      if (disp === 'delivered') return { title: pick(l, 'Tu pedido fue entregado ✅', 'Your order was delivered ✅'), body: biz };
      const status = s('status');
      if (status === 'preparing') {
        return store
          ? { title: pick(l, 'El negocio confirmó tu compra y está empacando tu pedido 📦', 'The business confirmed your purchase and is packing your order 📦'), body: biz }
          : { title: pick(l, 'El negocio aceptó tu pedido y lo está preparando', 'The business accepted your order and is preparing it'), body: biz };
      }
      if (status === 'ready') {
        return store && s('channel') !== 'delivery'
          ? { title: pick(l, 'Tu pedido está listo para recoger en tienda 🛍️', 'Your order is ready for store pickup 🛍️'), body: biz }
          : { title: pick(l, 'Tu pedido está listo 🎉', 'Your order is ready 🎉'), body: biz };
      }
      const [a, b] = st(status);
      return { title: pick(l, `Tu pedido está ${a}`, `Your order is ${b}`), body: biz };
    }
    case 'order_new': return { title: pick(l, 'Nuevo pedido', 'New order'), body: `${s('code')} · ${money(d.total)}`.trim() };
    case 'booking_status': {
      const status = s('status');
      if (status === 'confirmed') return { title: pick(l, '¡Tu cita está confirmada! 📅', 'Your appointment is confirmed! 📅'), body: s('service') };
      if (status === 'cancelled') return { title: pick(l, 'Tu cita fue cancelada', 'Your appointment was cancelled'), body: s('service') };
      if (status === 'no_show') return { title: pick(l, 'Se marcó que no asististe a tu cita', 'You were marked as a no-show'), body: s('service') };
      if (status === 'seated') return { title: pick(l, 'Tu cita está en curso', 'Your appointment is in progress'), body: s('service') };
      if (status === 'done') return { title: pick(l, '¡Gracias por tu visita! ⭐', 'Thanks for coming in! ⭐'), body: s('service') };
      const [a, b] = st(status);
      return { title: pick(l, `Tu reserva está ${a}`, `Your booking is ${b}`), body: s('service') };
    }
    case 'booking_new': return { title: pick(l, 'Nueva reserva 📅', 'New booking 📅'), body: [s('service'), s('name')].filter(Boolean).join(' · ') };
    case 'booking_cancelled': return { title: pick(l, 'Reserva cancelada por el cliente', 'Booking cancelled by the client'), body: [s('service'), s('name')].filter(Boolean).join(' · ') };
    case 'booking_resched': return { title: pick(l, 'El cliente reagendó su cita', 'The client rescheduled their appointment'), body: [s('service'), s('name')].filter(Boolean).join(' · ') };
    case 'rental_status': { const [a, b] = st(s('status')); return { title: pick(l, `Tu renta está ${a}`, `Your rental is ${b}`), body: s('item') }; }
    case 'rental_new': return { title: pick(l, 'Nueva renta', 'New rental'), body: s('item') || s('name') };
    case 'ticket_status': { const [a, b] = st(s('status')); return { title: pick(l, `Tu boleto: ${a}`, `Your ticket: ${b}`), body: s('event') }; }
    case 'event_cancelled': return { title: pick(l, 'Evento cancelado', 'Event cancelled'), body: s('event') };
    case 'waitlist_open': return { title: pick(l, '¡Se liberó un lugar!', 'A spot opened up!'), body: s('event') };
    case 'message': return { title: pick(l, `Mensaje de ${s('name')}`, `Message from ${s('name')}`), body: s('preview') || pick(l, 'Toca para leerlo', 'Tap to read it') };
    // ── Comunidad (0136) ── llegaban al teléfono con el cuerpo vacío.
    case 'comment_new': return { title: pick(l, `${s('name')} comentó tu publicación`, `${s('name')} commented on your post`), body: s('preview') || pick(l, 'Toca para leerlo', 'Tap to read it') };
    case 'reply_new': return { title: pick(l, `${s('name')} te respondió`, `${s('name')} replied to you`), body: s('preview') || pick(l, 'Toca para leerlo', 'Tap to read it') };
    case 'post_like': return { title: pick(l, `A ${s('name')} le gustó tu publicación`, `${s('name')} liked your post`), body: s('preview') || pick(l, 'Tu publicación', 'Your post') };
    case 'follow_new': return { title: pick(l, `${s('name')} te sigue`, `${s('name')} is following you`), body: pick(l, 'Ahora ve tus publicaciones en su inicio', 'They now see your posts in their feed') };
    // ── Reseñas y recomendaciones ──
    case 'review_new': {
      const stars = '★'.repeat(Math.max(1, Math.min(5, Number(d.rating) || 5)));
      return { title: pick(l, 'Nueva reseña ⭐', 'New review ⭐'), body: `${stars} · ${s('name')}` };
    }
    case 'review_reply': return { title: pick(l, 'Respondieron tu reseña 💬', 'Your review got a reply 💬'), body: s('business') };
    case 'endorse_new': return { title: pick(l, 'Nueva recomendación 👍', 'New recommendation 👍'), body: pick(l, `${s('name')} te recomendó`, `${s('name')} recommended you`) };
    // ── Eventos y boletos ──
    case 'ticket_new': return { title: pick(l, 'Boletos vendidos', 'Tickets sold'), body: `${s('event')} · ${s('qty')} · ${s('name')}` };
    case 'rsvp_new': return { title: pick(l, 'Nuevo asistente', 'New attendee'), body: s('event') };
    // ── Cuenta y plan ──
    case 'account_suspended': return {
      title: pick(l, 'Tu cuenta quedó suspendida', 'Your account was suspended'),
      body: d.until ? pick(l, `Hasta el ${cuando(d.until, l)}`, `Until ${cuando(d.until, l)}`) : s('reason'),
    };
    case 'account_restored': return {
      title: pick(l, 'Tu cuenta volvió a estar activa ✅', 'Your account is active again ✅'),
      body: pick(l, 'Ya puedes publicar y comprar como siempre', 'You can post and buy again as usual'),
    };
    case 'business_tier_changed': return {
      title: pick(l, `Tu negocio pasó al plan ${s('tier')}`, `Your business moved to the ${s('tier')} plan`),
      body: s('business'),
    };
    // ── Dinero y reclamos ──
    case 'order_status_admin': {
      const [a, b] = st(s('status'));
      return { title: pick(l, `Soporte actualizó ${cosa(s('kind'), 'es')}`, `Support updated ${cosa(s('kind'), 'en')}`), body: `${s('code')} · ${pick(l, a, b)}`.trim() };
    }
    case 'purchase_fulfilled': return {
      title: pick(l, 'Tu compra ya quedó registrada ✅', 'Your purchase went through ✅'),
      body: pick(l, `Ya puedes ver ${cosa(s('kind'), 'es')} en tu cuenta`, `You can now see ${cosa(s('kind'), 'en')} in your account`),
    };
    case 'purchase_refunded': return {
      title: pick(l, `Te reembolsamos ${cosa(s('kind'), 'es')}`, `We refunded ${cosa(s('kind'), 'en')}`),
      body: `${s('code')}${s('reason') ? ` · ${s('reason')}` : ''}`.trim(),
    };
    case 'claim_opened': return {
      title: pick(l, 'Un cliente abrió un reclamo', 'A customer opened a claim'),
      body: pick(l, `${s('code')} · sobre ${cosa(s('kind'), 'es')}`, `${s('code')} · about ${cosa(s('kind'), 'en')}`),
    };
    case 'claim_message': return { title: pick(l, 'Nuevo mensaje en tu reclamo 💬', 'New message on your claim 💬'), body: s('code') };
    case 'claim_resuelto': return { title: pick(l, 'Tu reclamo se resolvió ✅', 'Your claim was resolved ✅'), body: s('resolution') || s('code') };
    case 'claim_rechazado': return { title: pick(l, 'Tu reclamo fue rechazado', 'Your claim was declined'), body: s('resolution') || s('code') };
    // ── Dealer de carros (0119) ──
    case 'auto_lead': {
      const body = [s('name'), s('vehicle')].filter(Boolean).join(' · ');
      if (s('kind') === 'oferta') return { title: pick(l, 'Recibiste una oferta por un carro 💵', 'You got an offer on a car 💵'), body };
      if (s('kind') === 'prequal') return { title: pick(l, 'Alguien pidió precalificar un crédito', 'Someone asked to get pre-qualified'), body };
      if (s('kind') === 'prueba') return { title: pick(l, 'Alguien quiere una prueba de manejo 🚗', 'Someone wants a test drive 🚗'), body };
      return { title: pick(l, 'Nuevo interesado en un carro 🚗', 'New lead on a car 🚗'), body };
    }
    case 'auto_test': return {
      title: pick(l, 'Prueba de manejo agendada 🚗', 'Test drive booked 🚗'),
      body: [s('vehicle'), cuando(d.at, l)].filter(Boolean).join(' · '),
    };
    // ── Bienes raíces (0117) ──
    case 're_lead': {
      const body = [s('name'), s('property')].filter(Boolean).join(' · ');
      if (s('kind') === 'oferta') return { title: pick(l, `Recibiste una oferta${d.offer ? ` de ${money(d.offer)}` : ''} 💵`, `You got an offer${d.offer ? ` of ${money(d.offer)}` : ''} 💵`), body };
      if (s('kind') === 'solicitud') return { title: pick(l, 'Nueva solicitud de renta 🏠', 'New rental application 🏠'), body };
      return { title: pick(l, 'Nuevo interesado en una propiedad 🏠', 'New lead on a property 🏠'), body };
    }
    case 're_tour': return {
      title: s('mode') === 'video'
        ? pick(l, 'Visita por video agendada 🏠', 'Video tour booked 🏠')
        : pick(l, 'Visita agendada 🏠', 'Tour booked 🏠'),
      body: [s('property'), cuando(d.at, l)].filter(Boolean).join(' · '),
    };
    default: return { title: "To'Latino", body: '' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const SECRET = Deno.env.get('PUSH_HOOK_SECRET');
  if (!SECRET || req.headers.get('x-hook-secret') !== SECRET) return json({ error: 'forbidden' }, 403);

  const PUB = Deno.env.get('VAPID_PUBLIC_KEY');
  const PRIV = Deno.env.get('VAPID_PRIVATE_KEY');
  const SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:dev@payxer.com';
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!PUB || !PRIV) return json({ error: 'vapid not configured' }, 500);
  webpush.setVapidDetails(SUBJECT, PUB, PRIV);

  let payload: { user_id?: string; kind?: string; data?: Record<string, unknown>; link?: string };
  try { payload = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const { user_id, kind, data = {}, link } = payload;
  if (!user_id || !kind) return json({ error: 'bad request' }, 400);

  const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
  const subs = await (await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${user_id}&select=id,endpoint,p256dh,auth,lang`,
    { headers: svc },
  )).json();
  if (!Array.isArray(subs) || subs.length === 0) return json({ sent: 0 });

  let sent = 0;
  const stale: string[] = [];
  await Promise.all(subs.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string; lang: string }) => {
    const { title, body } = render(kind, data, (sub.lang === 'en' ? 'en' : 'es'));
    const msg = JSON.stringify({ title, body, url: link || '/cuenta', tag: kind });
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, msg);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) stale.push(sub.id); // gone → prune
    }
  }));

  // prune dead subscriptions so we don't keep retrying them
  if (stale.length) {
    await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=in.(${stale.join(',')})`, { method: 'DELETE', headers: svc });
  }
  return json({ sent, pruned: stale.length });
});
