// stripe-subscribe — crea la suscripción de un plan de negocio (Verified) y
// devuelve el `clientSecret` de su primera factura, para que la tarjeta se cobre
// DENTRO de la hoja de To'Latino (Payment Element).
//
// POR QUÉ EXISTE, habiendo ya `stripe-checkout`. Aquella crea una *Checkout
// Session* y devuelve una URL de Stripe: saca al dueño de nuestra marca justo en
// el momento de pagar. La regla del fundador es «checkout propio SIEMPRE»
// (CLAUDE.md): Stripe puede renderizar los campos de tarjeta —así el PCI sigue
// siendo mínimo— pero el aspecto, el idioma y el flujo son nuestros. Esta función
// es la mitad de servidor de esa regla para SUSCRIPCIONES; `stripe-checkout` se
// queda para no romper lo que ya la use, pero lo nuevo entra por aquí.
//
// CÓMO. Patrón oficial de Stripe para suscripciones con Payment Element:
//   subscriptions.create(payment_behavior=default_incomplete)
//     → expand latest_invoice.payment_intent → client_secret
// El navegador confirma ese PaymentIntent; el webhook (`stripe-webhook`) recibe
// `customer.subscription.*` y llama a `apply_subscription`, que es quien de
// verdad pone `businesses.tier`. Esta función NUNCA otorga el tier por su
// cuenta: si lo hiciera, una llamada a medias dejaría un negocio verificado sin
// haber pagado.
//
// PRECIO. Vive aquí, en el servidor, porque es el que se cobra. El cliente solo
// lo muestra (`VERIFIED_PRICE` en `BizOnboarding`); si divergen, manda este.
// El `lookup_key` lleva el importe dentro a propósito: cambiar el precio crea un
// Price nuevo en Stripe en vez de reescribir en silencio el que ya cobran los
// suscriptores actuales.
//
// Secretos (env de la Edge Function): STRIPE_SECRET_KEY.
// Inyectados por Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Desplegar con verify_jwt = true (Supabase valida el JWT antes de entrar).

const PLANS: Record<string, { amount: number; name: string }> = {
  // 1499 = $14.99/mes (handoff "Business Onboarding", decisión del fundador
  // 2026-08-05). Antes había tres cifras distintas en el repo — $4.99 en el
  // wizard, $19.00 en `stripe-checkout`, $14.99 en el handoff. Esta es la buena.
  verified: { amount: 1499, name: "To'Latino Verified" },
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

async function stripePost(path: string, key: string, form: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });
  return res.json();
}
async function stripeGet(path: string, key: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${key}` } });
  return res.json();
}

/**
 * El Price recurrente del plan, creado la primera vez y reusado después.
 * Se busca por `lookup_key` para que esto sea idempotente y no haga falta que el
 * fundador cree nada a mano en el panel de Stripe.
 */
async function priceFor(plan: string, key: string): Promise<{ id?: string; error?: string }> {
  const p = PLANS[plan];
  const lookup = `tolatino_${plan}_${p.amount}_monthly`;

  const found = await stripeGet(`prices?lookup_keys[]=${lookup}&active=true&limit=1`, key);
  if (found?.data?.[0]?.id) return { id: found.data[0].id };

  const product = await stripePost('products', key, { name: p.name, 'metadata[plan]': plan });
  if (product.error) return { error: product.error.message };

  const price = await stripePost('prices', key, {
    currency: 'usd',
    product: product.id,
    unit_amount: String(p.amount),
    'recurring[interval]': 'month',
    lookup_key: lookup,
  });
  if (price.error) return { error: price.error.message };
  return { id: price.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  try {
    const { plan, businessId } = await req.json();
    const p = PLANS[plan];
    if (!p || !businessId) return json({ error: 'bad request' }, 400);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const STRIPE = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE) return json({ error: 'stripe not configured' }, 500);

    // Quién llama (el JWT ya lo validó Supabase antes de entrar aquí).
    const authHeader = req.headers.get('Authorization') ?? '';
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authHeader, apikey: SERVICE } });
    const uid = (await userRes.json())?.id;
    if (!uid) return json({ error: 'auth required' }, 401);

    // Y que el negocio sea SUYO. Sin esto, cualquiera con sesión podría
    // suscribir el negocio de otro (o, peor, cobrarle a su propia tarjeta el
    // tier de un tercero).
    const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
    const bizRes = await fetch(`${SUPABASE_URL}/rest/v1/businesses?id=eq.${businessId}&select=id,name,owner_id`, { headers: svc });
    const biz = (await bizRes.json())?.[0];
    if (!biz || biz.owner_id !== uid) return json({ error: 'not your business' }, 403);

    // Cliente de Stripe: se reusa el del negocio si ya lo tenía.
    const subRes = await fetch(
      `${SUPABASE_URL}/rest/v1/business_subscriptions?business_id=eq.${businessId}&select=stripe_customer_id,stripe_subscription_id,status`,
      { headers: svc },
    );
    const existing = (await subRes.json())?.[0];

    // Si ya tiene una suscripción viva, no se crea otra: se le cobraría dos veces.
    if (existing?.status === 'active' || existing?.status === 'trialing') {
      return json({ error: 'already subscribed', alreadyActive: true }, 409);
    }

    let customer: string | undefined = existing?.stripe_customer_id;
    if (!customer) {
      const c = await stripePost('customers', STRIPE, {
        name: biz.name ?? "To'Latino",
        'metadata[business_id]': businessId,
      });
      if (c.error) return json({ error: c.error.message }, 400);
      customer = c.id;
    }

    const price = await priceFor(plan, STRIPE);
    if (price.error || !price.id) return json({ error: price.error ?? 'price failed' }, 400);

    // `default_incomplete` deja la suscripción esperando el pago de su primera
    // factura; ese cobro es el que confirma el navegador en NUESTRA hoja.
    const sub = await stripePost('subscriptions', STRIPE, {
      customer: customer!,
      'items[0][price]': price.id,
      payment_behavior: 'default_incomplete',
      'payment_settings[save_default_payment_method]': 'on_subscription',
      'metadata[business_id]': businessId,
      'metadata[plan]': plan,
    });
    if (sub.error) return json({ error: sub.error.message }, 400);

    // De dónde sale el secreto para confirmar el primer cobro DEPENDE de la
    // versión de la API de Stripe que tenga la cuenta:
    //   · hasta 2025-03  → invoice.payment_intent.client_secret
    //   · desde 2025-03  → invoice.confirmation_secret.client_secret
    //     (Stripe retiró `invoice.payment_intent` en la versión «basil»)
    // Se prueban las dos en vez de adivinar: si se asume una sola, la función
    // devuelve «no client secret» en cuentas nuevas — pasó al probar.
    const invoiceId: string | undefined =
      typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice?.id;
    let clientSecret: string | undefined;

    if (invoiceId) {
      const inv = await stripeGet(`invoices/${invoiceId}?expand[]=confirmation_secret`, STRIPE);
      clientSecret = inv?.confirmation_secret?.client_secret;
      if (!clientSecret) {
        const piId = typeof inv?.payment_intent === 'string' ? inv.payment_intent : inv?.payment_intent?.id;
        if (piId) {
          const pi = await stripeGet(`payment_intents/${piId}`, STRIPE);
          clientSecret = pi?.client_secret;
        }
      }
    }
    if (!clientSecret) return json({ error: 'no client secret' }, 500);

    // Se guarda el cliente y la suscripción como `incomplete`. El TIER no se
    // toca aquí: eso es trabajo del webhook cuando Stripe confirme el cobro.
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/apply_subscription`, {
      method: 'POST',
      headers: { ...svc, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        in_business: businessId, in_customer: customer, in_sub: sub.id,
        in_plan: plan, in_status: 'incomplete', in_period_end: null,
      }),
    });

    return json({ clientSecret, subscriptionId: sub.id, amount: p.amount });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
