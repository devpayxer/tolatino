'use client';

// "Vender en To'Latino" — the guided activator. The LISTING is already published
// (the master); this screen is where the owner opts INTO selling, in plain
// Spanish, tailored to their business type. Benchmark: Shopify's setup guide /
// Square "Add features" / Google Business guided setup — framed value + a clear
// recommendation, not a raw wall of toggles. Free tier sees everything behind
// Verified.

import {
  IconBike as Bike, IconCircleCheck as Check, IconCreditCard as Card, IconLock as Lock,
  IconSpeakerphone as Megaphone, IconPackage as Package, IconShoppingBag as Bag, IconStarFilled as StarFilled,
  IconHome as HomeIcon, IconCar as CarIcon, IconTicket as Ticket, IconToolsKitchen2 as Utensils, IconTruck as Truck,
} from '@tabler/icons-react';
import type { Mods, PanelCtx, Rubro } from '@/screens/negocio/tabs';
import { useBizAdmin } from '@/lib/bizAdmin';
import { Switch } from '@/components/ui';

// which sellable channel we recommend for each business type
const RECOMMEND: Record<Rubro, keyof Mods> = {
  restaurant: 'menu', retail: 'products', beauty: 'services', auto: 'services', rental: 'rental', realestate: 'inmuebles', cardealer: 'vehiculos',
};

export function ModulesSetup({ ctx, onToggle }: { ctx: PanelCtx; onToggle: (k: keyof Mods) => void }) {
  const { L, ci, isFree, mods, rubro, go } = ctx;
  const admin = useBizAdmin();
  const real = admin.active;
  // Selling requires Stripe. Until the account can charge (0071), any active sell
  // module is CATALOG-ONLY (shoppers see it, can't pay) — surfaced here so the
  // owner isn't surprised. connect_charges_enabled comes from the businesses row.
  const canCharge = !!real?.connect_charges_enabled;
  const recKey = RECOMMEND[rubro] ?? 'menu';

  // the sellable channels — what the owner OFFERS (pick any).
  const sell = [
    { key: 'menu' as const, Icon: Utensils, bg: '#FCEFD6', label: L('Menú de comida', 'Food menu'), desc: L('Publica tus platillos y recibe pedidos a domicilio o para recoger.', 'Publish dishes and take delivery/pickup orders.'), adds: L('Añade Pedidos y Entregas a tu panel', 'Adds Orders and Delivery') },
    { key: 'products' as const, Icon: Package, bg: '#E4ECFB', label: L('Productos', 'Products'), desc: L('Vende productos con inventario, variantes y envío.', 'Sell products with inventory, variants and shipping.'), adds: L('Añade Pedidos y Envíos a tu panel', 'Adds Orders and Shipping') },
    { key: 'services' as const, Icon: ci.svc, bg: '#F1EFFA', label: L('Servicios', 'Services'), desc: L('Ofrece servicios con precios; agenda citas con reservas.', 'Offer priced services; take appointments with bookings.'), adds: L('Puedes activar Reservas con cita', 'Enables appointment Bookings') },
    { key: 'rental' as const, Icon: Bike, bg: '#E3F5EA', label: L('Renta', 'Rental'), desc: L('Renta equipo, mobiliario o vehículos por hora o día.', 'Rent equipment, furniture or vehicles by hour/day.'), adds: L('Calendario de disponibilidad', 'Availability calendar') },
    { key: 'events' as const, Icon: Ticket, bg: '#FDE7EF', label: L('Eventos y boletos', 'Events & tickets'), desc: L('Crea eventos y vende boletos con cupos.', 'Create events and sell tickets with capacity.'), adds: L('Control de cupos y check-in', 'Capacity control and check-in') },
    { key: 'inmuebles' as const, Icon: HomeIcon, bg: '#E5DEF9', label: L('Bienes Raíces', 'Real Estate'), desc: L('Publica propiedades en venta o renta y gestiona leads y visitas.', 'List properties for sale or rent and manage leads and tours.'), adds: L('Leads, visitas y ofertas en tu panel', 'Leads, tours and offers in your panel') },
    { key: 'vehiculos' as const, Icon: CarIcon, bg: '#E4EEFB', label: L('Autos', 'Vehicles'), desc: L('Publica tu inventario de autos y gestiona leads, pruebas y financiamiento.', 'List your vehicle inventory and manage leads, test drives and financing.'), adds: L('Leads, pruebas y financiamiento en tu panel', 'Leads, test drives and financing in your panel') },
  ];
  // recommended channel first
  const ordered = [...sell].sort((a, b) => (a.key === recKey ? -1 : b.key === recKey ? 1 : 0));

  const anySell = !isFree && sell.some((s) => mods[s.key]);
  const updatesOn = !isFree && mods.updates;

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-4 pb-8">
      {/* framing: the listing is already done — this is the optional part */}
      <div className="rounded-card-sm border border-lilac-line p-4" style={{ background: 'linear-gradient(135deg,#efe9ff,#f7f3ff)' }}>
        <div className="flex items-center gap-2 text-[11.5px] font-extrabold text-green-dark">
          <Check size={16} stroke={2.4} className="text-green-dark" />
          {L('Tu página ya está publicada y visible en To’Latino', 'Your page is already published and visible on To’Latino')}
        </div>
        <h2 className="mt-1.5 text-[17px] font-extrabold tracking-[-.02em] text-ink md:text-[19px]">{L('Activa lo que quieras vender — es opcional', 'Turn on what you want to sell — it’s optional')}</h2>
        <p className="mt-1 max-w-[620px] text-[12.5px] font-semibold leading-snug text-ink-2">
          {L('Tu negocio ya aparece para que la gente te encuentre. Aquí prendes solo lo que ofreces (menú, productos, servicios…). Puedes prender o apagar cuando quieras — nada de esto es obligatorio.', 'Your business is already listed so people find you. Turn on only what you offer (menu, products, services…). You can switch it on or off anytime — none of this is required.')}
        </p>
        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-extrabold text-primary-dark shadow-[inset_0_0_0_1px_rgba(123,97,255,.15)]">
          {anySell
            ? <>{L('Estás vendiendo con:', 'Selling with:')} {sell.filter((s) => mods[s.key]).map((s) => s.label).join(' · ')}</>
            : L('Aún no vendes en línea — y está bien: tu página ya te consigue clientes.', 'Not selling online yet — and that’s fine: your page already brings customers.')}
        </div>
      </div>

      {/* payments — the moment they turn on selling, clarify the two ways to get
          paid: CASH now (works today) and CARD online (needs Stripe). Never frame
          Stripe as required to sell. */}
      {real && anySell && (
        canCharge ? (
          <div className="flex items-center gap-2.5 rounded-card-sm border border-green/40 bg-green-bg px-4 py-3">
            <Check size={17} stroke={2.5} className="flex-none text-green-dark" />
            <div className="text-[12px] font-bold text-green-dark">{L('Aceptas pagos con tarjeta (Stripe) y en efectivo. Los pagos con tarjeta se depositan a tu banco.', 'You accept card (Stripe) and cash. Card payments deposit to your bank.')}</div>
          </div>
        ) : (
          <div className="rounded-card-sm border border-lilac-line bg-white p-4 shadow-card">
            <div className="flex items-center gap-2 text-[11.5px] font-extrabold text-green-dark">
              <Check size={15} stroke={2.5} className="flex-none text-green-dark" />
              {L('Ventas activas — ya puedes cobrar en efectivo', 'Sales active — you can charge cash now')}
            </div>
            <div className="mt-1.5 text-[14px] font-extrabold tracking-[-.01em] text-ink">{L('Cobras en efectivo contra entrega o al recoger', 'Get paid in cash — on delivery or at pickup')}</div>
            <p className="mt-1 max-w-[560px] text-[12.5px] font-semibold leading-snug text-ink-2">
              {L('Tus clientes ya pueden pedirte y pagarte en efectivo. Para vender en línea y aceptar pagos con tarjeta —con depósito automático a tu banco— conecta Stripe. Es opcional; puedes hacerlo cuando quieras.', 'Customers can already order and pay you in cash. To sell online and accept card payments —with automatic bank deposits— connect Stripe. It’s optional; do it whenever you like.')}
            </p>
            <button onClick={() => go('payments')} className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-btn bg-primary px-4 py-2.5 text-[12px] font-extrabold text-white shadow-cta-sm">
              <Card size={13} stroke={2.4} />{L('Aceptar pagos con tarjeta', 'Accept card payments')}
            </button>
          </div>
        )
      )}

      {/* the sellable channels */}
      <div className="px-0.5 text-[11px] font-bold uppercase tracking-[.05em] text-muted-2">{L('¿Qué ofreces?', 'What do you offer?')}</div>
      <div className="grid gap-3 md:grid-cols-2">
        {ordered.map((m) => {
          const on = !isFree && mods[m.key];
          const rec = m.key === recKey;
          return (
            <div key={m.key} className={`relative rounded-card-sm border bg-white p-4 shadow-card ${on ? 'border-[rgba(123,97,255,.35)] ring-1 ring-[rgba(123,97,255,.18)]' : rec ? 'border-[rgba(123,97,255,.25)]' : 'border-hair'}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-btn" style={{ background: m.bg }}>
                  <m.Icon size={21} strokeWidth={2.2} className="text-primary-dark" />
                </span>
                {isFree ? (
                  <span className="flex items-center gap-1 rounded-full bg-lilac-2 px-2.5 py-1 text-[10px] font-extrabold text-muted"><Lock size={10} stroke={2.6} />Verified</span>
                ) : (
                  <Switch on={on} onClick={() => onToggle(m.key)} label={m.label} />
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[14.5px] font-extrabold text-ink">{m.label}</span>
                {rec && <span className="inline-flex items-center gap-1 rounded-full bg-amber-bg px-2 py-0.5 text-[9.5px] font-extrabold text-amber-ink"><StarFilled size={9} />{L('Recomendado', 'Recommended')}</span>}
              </div>
              <div className="mt-0.5 text-[12px] font-semibold leading-snug text-muted">{m.desc}</div>
              <div className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10.5px] font-extrabold ${on ? 'bg-green-bg text-green-dark' : 'bg-app text-muted-2'}`}>
                {on ? <Check size={11} stroke={2.6} /> : <span className="text-[12px] leading-none">→</span>}{m.adds}
              </div>
            </div>
          );
        })}
      </div>

      {/* what turns on automatically once you sell — removes the "do I need to set
          up Pedidos/Entregas/Pagos too?" confusion */}
      <div className="rounded-card-sm border border-hair bg-white p-4 shadow-card">
        <div className="text-[12.5px] font-extrabold text-ink">{L('Al activar ventas, To’Latino agrega solo:', 'When you start selling, To’Latino adds automatically:')}</div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {[
            { Icon: Bag, label: L('Pedidos', 'Orders') },
            { Icon: Truck, label: L('Entregas y envíos', 'Delivery & shipping') },
            { Icon: Card, label: L('Pagos', 'Payouts') },
          ].map(({ Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-app px-3 py-1.5 text-[11px] font-extrabold text-ink-soft">
              <Icon size={13} stroke={2.3} className="text-primary-dark" />{label}
            </span>
          ))}
        </div>
        <div className="mt-2 text-[11px] font-semibold text-muted">{L('No tienes que configurarlos por separado — aparecen en tu panel cuando activas algo para vender.', 'No separate setup — they appear in your panel once you enable something to sell.')}</div>
      </div>

      {/* extra: Novedades (engagement, not selling) */}
      <div className="px-0.5 text-[11px] font-bold uppercase tracking-[.05em] text-muted-2">{L('Extra', 'Extra')}</div>
      <div className={`flex items-center gap-3 rounded-card-sm border bg-white p-4 shadow-card ${updatesOn ? 'border-[rgba(123,97,255,.35)]' : 'border-hair'}`}>
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-btn" style={{ background: '#F1EFFA' }}><Megaphone size={21} strokeWidth={2.2} className="text-primary-dark" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-extrabold text-ink">{L('Novedades', 'Updates')}</div>
          <div className="mt-0.5 text-[12px] font-semibold leading-snug text-muted">{L('Publica ofertas y avisos en el feed de la comunidad. No es para vender — es para que te sigan.', 'Post offers and news to the community feed. Not for selling — it keeps you top of mind.')}</div>
        </div>
        {isFree ? (
          <span className="flex flex-none items-center gap-1 rounded-full bg-lilac-2 px-2.5 py-1 text-[10px] font-extrabold text-muted"><Lock size={10} stroke={2.6} />Verified</span>
        ) : (
          <Switch on={updatesOn} onClick={() => onToggle('updates')} label={L('Novedades', 'Updates')} />
        )}
      </div>

      {isFree && (
        <div className="rounded-card-sm border border-lilac-line bg-white p-4 text-center shadow-card">
          <div className="text-[13px] font-extrabold text-ink">{L('Vender es parte de Verified', 'Selling is part of Verified')}</div>
          <div className="mt-0.5 text-[12px] font-semibold text-muted">{L('Tu página gratis ya te hace visible. Mejora a Verified para activar menú, productos, reservas y más.', 'Your free page already makes you visible. Upgrade to Verified to enable menu, products, bookings and more.')}</div>
          <button onClick={() => ctx.go('billing')} className="mt-3 cursor-pointer rounded-btn bg-primary px-4 py-2.5 text-[12px] font-extrabold text-white shadow-cta-sm">{L('Ver planes', 'See plans')}</button>
        </div>
      )}
    </div>
  );
}
