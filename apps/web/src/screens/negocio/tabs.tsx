'use client';

// Business panel content model — ported from the Handoff v2 dashboard
// prototype. Business identities localized to our Houston fixture world
// (the prototype used SF placeholder names); structure and copy otherwise
// verbatim. Content varies by plan (free/verified/premium) and rubro.

import { Icon as LucideIcon } from '@tabler/icons-react';
import { IconChartBar as BarChart3, IconChartLine as ChartLine, IconBike as Bike, IconBriefcase as Briefcase, IconBuilding as Building2, IconCalendar as Calendar, IconClock as Clock, IconCreditCard as CreditCard, IconCurrencyDollar as DollarSign, IconPhoto as ImageIcon, IconLayoutGrid as LayoutGrid, IconLink as Link2, IconSpeakerphone as Megaphone, IconMessageCircle as MessageCircle, IconPackage as Package, IconScissors as Scissors, IconSettings as Settings, IconShoppingBag as ShoppingBag, IconStar as Star, IconBuildingStore as Store, IconTicket as Ticket, IconHome as HomeIcon, IconCar as CarIcon, IconTruck as Truck, IconUser as User, IconUsers as Users, IconToolsKitchen2 as Utensils, IconTool as Wrench } from '@tabler/icons-react';

export type Tier = 'free' | 'verified' | 'premium';
export type Rubro = 'restaurant' | 'beauty' | 'auto' | 'retail' | 'rental' | 'realestate' | 'cardealer';
export type TabKey =
  | 'insights' | 'stats' | 'listing' | 'photos' | 'hours' | 'related'
  | 'menu' | 'services' | 'bookings' | 'products' | 'fulfillment' | 'shipping' | 'drivers' | 'rental' | 'events' | 'inmuebles' | 'vehiculos'
  | 'customers' | 'orders' | 'messages' | 'reviews' | 'updates'
  | 'promos' | 'payments' | 'staff' | 'jobs' | 'modules' | 'billing' | 'settings';

export type Lx = (es: string, en: string) => string;

// name/initials/area quedan VACÍOS a propósito (2026-07-29): traían negocios y
// direcciones inventadas ('Taquería La Esperanza · Bellaire Blvd') que el panel
// usaba como respaldo y el dueño leía como suyas. Lo legítimo de este mapa es la
// etiqueta del rubro (es/en), el degradado (tile) y el icono (svc).
export type CatInfo = { es: string; en: string; name: string; initials: string; area: string; tile: string; svc: LucideIcon };

export const CAT_INFO: Record<Rubro, CatInfo> = {
  restaurant: { es: 'Restaurante · Taquería', en: 'Restaurant · Taco shop', name: '', initials: '', area: '', tile: '#F0EDFF 0 9px,#E9D7FB 9px 18px', svc: Utensils },
  beauty: { es: 'Belleza · Salón', en: 'Beauty · Hair Salon', name: '', initials: '', area: '', tile: '#FFE8F0 0 9px,#FED2DF 9px 18px', svc: Scissors },
  auto: { es: 'Auto · Taller', en: 'Auto Repair · Shop', name: '', initials: '', area: '', tile: '#DEF4FF 0 9px,#C0E6FF 9px 18px', svc: Wrench },
  retail: { es: 'Boutique · Ropa', en: 'Boutique · Apparel', name: '', initials: '', area: '', tile: '#F0EDFF 0 9px,#E0DAFF 9px 18px', svc: Store },
  rental: { es: 'Renta · Equipo', en: 'Rental · Equipment', name: '', initials: '', area: '', tile: '#E6FAF3 0 9px,#CDE9C9 9px 18px', svc: Bike },
  realestate: { es: 'Bienes Raíces · Agencia', en: 'Real Estate · Agency', name: '', initials: '', area: '', tile: '#FED2DF 0 9px,#E0DAFF 9px 18px', svc: HomeIcon },
  cardealer: { es: 'Dealer · Autos', en: 'Car Dealer', name: '', initials: '', area: '', tile: '#DAF6FD 0 9px,#C0E6FF 9px 18px', svc: CarIcon },
};

export type Mods = Record<'menu' | 'services' | 'bookings' | 'products' | 'rental' | 'events' | 'inmuebles' | 'vehiculos' | 'updates' | 'staff', boolean>;

export type PanelCtx = {
  L: Lx;
  es: boolean;
  tier: Tier;
  rubro: Rubro;
  ci: CatInfo;
  isFree: boolean;
  isPremium: boolean;
  mods: Mods;
  photoCount?: number; // real gallery photo count for the active business (nav badge)
  isReal: boolean; // true when a real signed-in business is active (not demo) → suppress fabricated counts
  reviewsCount?: number | null; // real reviews count for the active business (nav badge when isReal)
  go: (tab: TabKey) => void;
};

// ---------- sidebar ----------
export type NavItem = {
  id: TabKey;
  label: string;
  Icon: LucideIcon;
  locked: boolean;
  indent?: boolean;
  count?: string | null;
  live?: boolean;
  warn?: boolean;
  sub?: string | null;
};
export type NavGroup = { label: string; add?: { label: string; color: string; onAdd?: () => void } | null; items: NavItem[] };

export function activeMods(ctx: PanelCtx): Mods {
  const { isFree, mods, rubro } = ctx;
  if (isFree) {
    // Free tier unlocks the ONE module that matches the rubro — not always the
    // food menu (a beauty/auto listing gets Servicios, retail gets Productos, etc.).
    const primary: keyof Mods = rubro === 'cardealer' ? 'vehiculos' : rubro === 'realestate' ? 'inmuebles' : rubro === 'retail' ? 'products' : rubro === 'rental' ? 'rental' : rubro === 'beauty' || rubro === 'auto' ? 'services' : 'menu';
    const base: Mods = { menu: false, services: false, bookings: false, products: false, rental: false, events: false, inmuebles: false, vehiculos: false, updates: false, staff: false };
    base[primary] = true;
    return base;
  }
  return { ...mods, bookings: mods.services && mods.bookings };
}

// Panel nav — listing-first (the LISTING is the master; SELLING is an optional
// add-on): Inicio · Tu página · Cómo te encuentran · Clientes · Vender (opcional)
// · Cuenta. Groups by frequency/purpose.
export function buildNav(ctx: PanelCtx): NavGroup[] {
  const { L, isFree, ci, go, photoCount, isReal, reviewsCount } = ctx;
  const photoBadge = photoCount != null && photoCount > 0 ? String(photoCount) : null;
  const dc = (v: string | null) => (isReal ? null : v);
  const reviewsBadge = isReal ? (reviewsCount && reviewsCount > 0 ? String(reviewsCount) : null) : isFree ? '3' : '412';
  const am = activeMods(ctx);
  const it = (id: TabKey, label: string, Icon: LucideIcon, opts: Partial<NavItem> & { lockedFree?: boolean } = {}): NavItem => ({
    id, label, Icon,
    locked: !!opts.locked || (isFree && !!opts.lockedFree),
    indent: opts.indent, count: opts.count ?? null, live: opts.live, warn: opts.warn, sub: opts.sub ?? null,
  });

  // Vender = the "adherido". Only the commerce modules the owner turned on; a
  // listing that doesn't sell sees a single, friendly "Activar ventas" instead.
  const sellItems: NavItem[] = [];
  if (am.menu) sellItems.push(it('menu', L('Menú de comida', 'Food menu'), Utensils, { count: dc(isFree ? '8' : '68') }));
  if (am.services) {
    sellItems.push(it('services', L('Servicios', 'Services'), ci.svc, { count: dc('14') }));
    if (am.bookings) sellItems.push(it('bookings', L('Reservas', 'Bookings'), Calendar, { count: dc('24'), live: true, indent: true }));
  }
  if (am.products) sellItems.push(it('products', L('Productos', 'Products'), Package, { count: dc('42') }));
  if (am.rental) sellItems.push(it('rental', L('Renta', 'Rental'), Bike, { count: dc('12') }));
  if (am.events) sellItems.push(it('events', L('Eventos y boletos', 'Events & tickets'), Ticket, { count: dc('4') }));
  if (am.inmuebles) sellItems.push(it('inmuebles', L('Propiedades', 'Listings'), HomeIcon, { count: dc('6') }));
  if (am.vehiculos) sellItems.push(it('vehiculos', L('Autos', 'Vehicles'), CarIcon, { count: dc('8') }));
  const sells = sellItems.length > 0;
  // Orders/Payouts are commerce concerns — a listings-only real-estate agency
  // (inmuebles active, nothing else) doesn't get them.
  const commerce = am.menu || am.services || am.products || am.rental || am.events;
  if (commerce) {
    sellItems.push(it('orders', L('Pedidos', 'Orders'), ShoppingBag, { count: dc(isFree ? null : '12'), live: !isFree, lockedFree: true }));
    if (am.menu || am.products) sellItems.push(it('fulfillment', L('Entregas y envíos', 'Delivery & shipping'), Truck));
    // Promociones — unified promo/discount hub across Menú + Tienda. Premium benefit.
    if (am.menu || am.products) sellItems.push(it('promos', L('Promociones', 'Promotions'), Megaphone, { lockedFree: true }));
    sellItems.push(it('payments', L('Pagos', 'Payouts'), DollarSign, { lockedFree: true }));
  } else {
    sellItems.push(it('modules', L('Activar ventas', 'Enable selling'), ShoppingBag));
  }

  return [
    { label: '', items: [it('insights', L('Inicio', 'Home'), BarChart3)] },
    {
      label: L('Tu página', 'Your page'),
      add: { label: L('así te encuentran', 'how you’re found'), color: '#B3ADC7' },
      items: [
        it('listing', L('Información general', 'General info'), Building2, { sub: isFree ? null : 'OK' }),
        it('photos', L('Fotos y media', 'Photos & media'), ImageIcon, { count: photoBadge }),
        it('hours', L('Horario', 'Hours & holidays'), Clock),
        it('related', L('Listados relacionados', 'Related listings'), Link2, { lockedFree: true }),
      ],
    },
    {
      label: L('Cómo te encuentran', 'How they find you'),
      items: [
        it('stats', L('Estadísticas', 'Insights'), ChartLine),
        it('reviews', L('Reseñas', 'Reviews'), Star, { count: reviewsBadge, warn: !isFree && !isReal }),
        it('updates', L('Novedades', 'Updates'), Megaphone, { count: am.updates ? dc('18') : null, locked: !am.updates }),
      ],
    },
    {
      label: L('Clientes', 'Customers'),
      items: [
        it('messages', L('Mensajes', 'Messages'), MessageCircle, { count: dc(isFree ? '2' : '7'), live: !isFree, warn: isFree }),
        it('customers', L('Directorio', 'Directory'), Users, { count: dc(isFree ? '12' : '4.2k') }),
      ],
    },
    {
      label: L('Vender en To’Latino', 'Sell on To’Latino'),
      add: { label: L('opcional', 'optional'), color: '#9A93B3', onAdd: sells ? () => go('modules') : undefined },
      items: sellItems,
    },
    {
      label: L('Cuenta', 'Account'),
      items: [
        it('staff', L('Personal', 'Staff'), User, { count: am.staff ? dc('14') : null, locked: !am.staff }),
        ...(am.staff ? [it('jobs', L('Empleos', 'Jobs'), Briefcase, { count: dc('3'), indent: true })] : []),
        it('modules', L('Configurar módulos', 'Module setup'), LayoutGrid),
        it('billing', L('Plan y facturación', 'Billing & plan'), CreditCard),
        it('settings', L('Ajustes', 'Settings'), Settings),
      ],
    },
  ];
}

// ---------- page head ----------
export function pageHead(tab: TabKey, ctx: PanelCtx) {
  const { L, isFree } = ctx;
  const titles: Record<TabKey, [string, string]> = {
    insights: [L('Inicio', 'Home'), isFree ? L('Tu listado está activo, pero te falta el kit. Mejora para desbloquear todo.', "Your listing is live, but you're missing the toolkit. Upgrade to unlock everything.") : L('Tu negocio va muy bien esta semana — los ingresos van en aumento.', 'Your business is having a great week — revenue is trending up.')],
    stats: [L('Estadísticas', 'Insights'), L('Cómo te encuentran y qué hacen tus clientes.', 'How people find you and what customers do.')],
    listing: [L('Información general', 'General info'), L('Así te ven tus clientes en To’Latino.', 'This is what customers see on To’Latino.')],
    photos: [L('Fotos y media', 'Photos & media'), L('Sube fotos de tu negocio, productos y equipo.', 'Upload photos of your business, products and team.')],
    hours: [L('Horario y feriados', 'Hours & holidays'), L('Define cuándo estás abierto.', 'Set when you are open.')],
    related: [L('Listados relacionados', 'Related listings'), L('Vincula sucursales y marcas que administras.', 'Link branches and brands you manage.')],
    menu: [L('Menú de comida', 'Food menu'), L('Organiza tu menú por secciones · activa entrega.', 'Organize your menu by sections · enables delivery.')],
    services: [L('Servicios', 'Services'), L('Servicios bookables o solo informativos.', 'Bookable or inquiry-only services.')],
    bookings: [L('Reservas', 'Bookings'), L('Citas, depósitos y disponibilidad.', 'Appointments, deposits and availability.')],
    products: [L('Productos', 'Products'), L('Catálogo, inventario, variantes y colecciones.', 'Catalog, inventory, variants and collections.')],
    fulfillment: [L('Entregas y envíos', 'Delivery & shipping'), L('Entrega local y envío — compartido con Menú y Productos.', 'Local delivery and shipping — shared by Menu and Products.')],
    shipping: [L('Zonas de envío', 'Shipping zones'), L('Área de entrega local, recogida y envío nacional.', 'Local delivery area, pickup and national shipping.')],
    drivers: [L('Repartidores', 'Drivers'), L('Repartidor propio o apps externas.', 'Own driver or external apps.')],
    rental: [L('Renta', 'Rental'), L('Artículos para rentar con precio por día.', 'Rentable items with daily pricing.')],
    events: [L('Eventos y boletos', 'Events & tickets'), L('Crea eventos y gestiona boletos.', 'Create events and manage tickets.')],
    inmuebles: [L('Bienes Raíces', 'Real Estate'), L('Publica propiedades y gestiona leads, visitas y ofertas.', 'Publish listings and manage leads, tours and offers.')],
    vehiculos: [L('Autos', 'Vehicles'), L('Publica tu inventario y gestiona leads, pruebas y financiamiento.', 'Publish inventory and manage leads, test drives and financing.')],
    customers: [L('Clientes', 'Customers'), L('Tu base de clientes y su historial.', 'Your customer base and history.')],
    orders: [L('Pedidos', 'Orders'), L('Gestiona pedidos por estado.', 'Manage orders by status.')],
    messages: [L('Mensajes', 'Messages'), L('Conversaciones con tus clientes.', 'Conversations with your customers.')],
    reviews: [L('Reseñas', 'Reviews'), L('Responde y construye tu reputación.', 'Reply and build your reputation.')],
    updates: [L('Novedades', 'Updates'), L('Publica ofertas, eventos y avisos.', 'Post offers, events and news.')],
    payments: [L('Pagos', 'Payouts'), L('Depósitos, balance y método de pago.', 'Payouts, balance and payment method.')],
    promos: [L('Promociones', 'Promotions'), L('Todas tus campañas — Menú, Servicios, Renta y Tienda — en un solo lugar.', 'All your campaigns — Menu, Services, Rental and Shop — in one place.')],
    staff: [L('Personal', 'Staff'), L('Equipo, roles y permisos.', 'Team, roles and permissions.')],
    jobs: [L('Empleos', 'Jobs'), L('Publica vacantes para la comunidad.', 'Post openings for the community.')],
    modules: [L('Configurar módulos', 'Module setup'), L('Activa solo lo que tu negocio necesita.', 'Turn on only what your business needs.')],
    billing: [L('Plan y facturación', 'Billing & plan'), L('Tu plan, método de pago e historial.', 'Your plan, payment method and history.')],
    settings: [L('Ajustes', 'Settings'), L('Perfil, seguridad, notificaciones e idioma.', 'Profile, security, notifications and language.')],
  };
  const ctaMap: Partial<Record<TabKey, string>> = {
    listing: L('Guardar', 'Save'), photos: L('Subir', 'Upload'), menu: L('Agregar platillo', 'Add item'), services: L('Agregar servicio', 'Add service'), products: L('Agregar producto', 'Add product'), events: L('Crear evento', 'Create event'), inmuebles: L('Publicar propiedad', 'Publish listing'), vehiculos: L('Publicar auto', 'Publish vehicle'), rental: L('Agregar artículo', 'Add item'), updates: L('Nueva publicación', 'New post'), staff: L('Invitar', 'Invite'), reviews: L('Exportar', 'Export'), customers: L('Exportar', 'Export'), orders: L('Nuevo pedido', 'New order'), insights: L('Nuevo pedido', 'New order'), modules: L('Guardar', 'Save'), billing: L('Cambiar plan', 'Change plan'), settings: L('Guardar', 'Save'), promos: L('Nueva campaña', 'New campaign'),
  };
  const [title, sub] = titles[tab];
  return { title, sub, cta: ctaMap[tab] ?? L('Nuevo', 'New'), hasGhost: ['insights', 'orders', 'customers'].includes(tab), ghost: L('Exportar', 'Export'), hasAccent: tab === 'insights', accent: L('Últimos 7 días', 'Last 7 days') };
}
