'use client';

// Business panel content model — ported from the Handoff v2 dashboard
// prototype. Business identities localized to our Houston fixture world
// (the prototype used SF placeholder names); structure and copy otherwise
// verbatim. Content varies by plan (free/verified/premium) and rubro.

import type { LucideIcon } from 'lucide-react';
import {
  BarChart3, Bell, Bike, Briefcase, Building2, Calendar, Clock, CreditCard, DollarSign, Eye, Globe, HardHat, Heart, Image as ImageIcon, LayoutGrid, Link2, MapPin, Megaphone, MessageCircle, Package, Pencil, Phone, Route, Scissors, Settings, Shield, ShoppingBag, Star, Store, Tag, Ticket, Truck, User, Users, Utensils, Wrench,
} from 'lucide-react';

export type Tier = 'free' | 'verified' | 'premium';
export type Rubro = 'restaurant' | 'beauty' | 'auto' | 'retail' | 'rental';
export type TabKey =
  | 'insights' | 'listing' | 'photos' | 'hours' | 'related'
  | 'menu' | 'services' | 'bookings' | 'products' | 'shipping' | 'drivers' | 'rental' | 'events'
  | 'customers' | 'orders' | 'messages' | 'reviews' | 'updates'
  | 'payments' | 'staff' | 'jobs' | 'modules' | 'billing' | 'settings';

export type Lx = (es: string, en: string) => string;

export type CatInfo = { es: string; en: string; name: string; initials: string; area: string; tile: string; svc: LucideIcon };

export const CAT_INFO: Record<Rubro, CatInfo> = {
  restaurant: { es: 'Restaurante · Taquería', en: 'Restaurant · Taco shop', name: 'Taquería La Esperanza', initials: 'TE', area: 'Bellaire · Bellaire Blvd', tile: '#ECE3F8 0 9px,#E3D7F4 9px 18px', svc: Utensils },
  beauty: { es: 'Belleza · Salón', en: 'Beauty · Hair Salon', name: 'Salón Bella Vida', initials: 'BV', area: 'Gulfton · Hillcroft Ave', tile: '#FCE3EC 0 9px,#F6CEDD 9px 18px', svc: Scissors },
  auto: { es: 'Auto · Taller', en: 'Auto Repair · Shop', name: 'Don Beto Mecánica', initials: 'DB', area: 'Spring Branch · Long Point Rd', tile: '#E4ECFB 0 9px,#D7E3F6 9px 18px', svc: Wrench },
  retail: { es: 'Boutique · Ropa', en: 'Boutique · Apparel', name: 'Casa Bonita Shop', initials: 'CB', area: 'East End · Harrisburg Blvd', tile: '#EAE2F8 0 9px,#DCCEF2 9px 18px', svc: Store },
  rental: { es: 'Renta · Equipo', en: 'Rental · Equipment', name: 'Bahía Rentals', initials: 'BR', area: 'Katy · Mason Rd', tile: '#E3F5EA 0 9px,#D6E7D0 9px 18px', svc: Bike },
};

export type Mods = Record<'menu' | 'services' | 'bookings' | 'products' | 'rental' | 'events' | 'updates' | 'staff', boolean>;

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
  const { isFree, mods } = ctx;
  if (isFree) return { menu: true, services: false, bookings: false, products: false, rental: false, events: false, updates: false, staff: false };
  return { ...mods, bookings: mods.services && mods.bookings };
}

export function buildNav(ctx: PanelCtx): NavGroup[] {
  const { L, isFree, ci, go, photoCount } = ctx;
  // Real gallery count when known (>0); no badge otherwise.
  const photoBadge = photoCount != null && photoCount > 0 ? String(photoCount) : null;
  const am = activeMods(ctx);
  const it = (id: TabKey, label: string, Icon: LucideIcon, opts: Partial<NavItem> & { lockedFree?: boolean } = {}): NavItem => ({
    id, label, Icon,
    locked: !!opts.locked || (isFree && !!opts.lockedFree),
    indent: opts.indent, count: opts.count ?? null, live: opts.live, warn: opts.warn, sub: opts.sub ?? null,
  });
  return [
    { label: '', items: [it('insights', L('Resumen', 'Insights'), BarChart3)] },
    {
      label: L('Listado', 'Listing'),
      add: { label: L('siempre activo', 'always on'), color: '#B7B3C6' },
      items: [
        it('listing', L('Información general', 'General info'), Building2, { sub: isFree ? null : 'OK' }),
        it('photos', L('Fotos y media', 'Photos & media'), ImageIcon, { count: photoBadge }),
        it('hours', L('Horario', 'Hours & holidays'), Clock),
        it('related', L('Listados relacionados', 'Related listings'), Link2, { lockedFree: true }),
      ],
    },
    {
      label: L('Módulos', 'Modules'),
      add: { label: '⚙ Setup', color: '#6D4DF6', onAdd: () => go('modules') },
      items: [
        it('menu', L('Menú de comida', 'Food menu'), Utensils, { count: am.menu ? (isFree ? '8' : '68') : null, locked: !am.menu }),
        it('services', L('Servicios', 'Services'), ci.svc, { count: am.services ? '14' : null, locked: !am.services }),
        ...(am.services ? [it('bookings', L('Reservas', 'Bookings'), Calendar, { count: am.bookings ? '24' : null, live: am.bookings, locked: !am.bookings, indent: true })] : []),
        it('products', L('Productos', 'Products'), Package, { count: am.products ? '42' : null, locked: !am.products }),
        ...(am.products
          ? [
              it('shipping', L('Zonas de envío', 'Shipping zones'), Route, { locked: !am.products, indent: true }),
              it('drivers', L('Repartidores', 'Drivers'), HardHat, { count: '3', locked: !am.products, indent: true }),
            ]
          : []),
        it('rental', L('Renta', 'Rental'), Bike, { count: am.rental ? '12' : null, locked: !am.rental }),
        it('events', L('Eventos y boletos', 'Events & tickets'), Ticket, { count: am.events ? '4' : null, locked: !am.events }),
      ],
    },
    {
      label: L('Clientes', 'Customers'),
      items: [
        it('customers', L('Clientes', 'Customers'), Users, { count: isFree ? '12' : '4.2k' }),
        it('orders', L('Pedidos', 'Orders'), ShoppingBag, { count: isFree ? null : '12', live: !isFree, lockedFree: true }),
        it('messages', L('Mensajes', 'Messages'), MessageCircle, { count: isFree ? '2' : '7', live: !isFree, warn: isFree }),
        it('reviews', L('Reseñas', 'Reviews'), Star, { count: isFree ? '3' : '412', warn: !isFree }),
        it('updates', L('Novedades', 'Updates'), Megaphone, { count: am.updates ? '18' : null, locked: !am.updates }),
      ],
    },
    {
      label: L('Cuenta', 'Account'),
      items: [
        it('payments', L('Pagos', 'Payouts'), DollarSign, { lockedFree: true }),
        it('staff', L('Personal', 'Staff'), User, { count: am.staff ? '14' : null, locked: !am.staff }),
        ...(am.staff ? [it('jobs', L('Empleos', 'Jobs'), Briefcase, { count: '3', indent: true })] : []),
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
    insights: [L('Resumen', 'Insights'), isFree ? L('Tu listado está activo, pero te falta el kit. Mejora para desbloquear todo.', "Your listing is live, but you're missing the toolkit. Upgrade to unlock everything.") : L('Tu negocio va muy bien esta semana — los ingresos van en aumento.', 'Your business is having a great week — revenue is trending up.')],
    listing: [L('Información general', 'General info'), L('Así te ven tus clientes en To’Latino.', 'This is what customers see on To’Latino.')],
    photos: [L('Fotos y media', 'Photos & media'), L('Sube fotos de tu negocio, productos y equipo.', 'Upload photos of your business, products and team.')],
    hours: [L('Horario y feriados', 'Hours & holidays'), L('Define cuándo estás abierto.', 'Set when you are open.')],
    related: [L('Listados relacionados', 'Related listings'), L('Vincula sucursales y marcas que administras.', 'Link branches and brands you manage.')],
    menu: [L('Menú de comida', 'Food menu'), L('Organiza tu menú por secciones · activa entrega.', 'Organize your menu by sections · enables delivery.')],
    services: [L('Servicios', 'Services'), L('Servicios bookables o solo informativos.', 'Bookable or inquiry-only services.')],
    bookings: [L('Reservas', 'Bookings'), L('Citas, depósitos y disponibilidad.', 'Appointments, deposits and availability.')],
    products: [L('Productos', 'Products'), L('Catálogo, inventario, variantes y envío.', 'Catalog, inventory, variants and shipping.')],
    shipping: [L('Zonas de envío', 'Shipping zones'), L('Área de entrega local, recogida y envío nacional.', 'Local delivery area, pickup and national shipping.')],
    drivers: [L('Repartidores', 'Drivers'), L('Repartidor propio o apps externas.', 'Own driver or external apps.')],
    rental: [L('Renta', 'Rental'), L('Artículos para rentar con precio por día.', 'Rentable items with daily pricing.')],
    events: [L('Eventos y boletos', 'Events & tickets'), L('Crea eventos y gestiona boletos.', 'Create events and manage tickets.')],
    customers: [L('Clientes', 'Customers'), L('Tu base de clientes y su historial.', 'Your customer base and history.')],
    orders: [L('Pedidos', 'Orders'), L('Gestiona pedidos por estado.', 'Manage orders by status.')],
    messages: [L('Mensajes', 'Messages'), L('Conversaciones con tus clientes.', 'Conversations with your customers.')],
    reviews: [L('Reseñas', 'Reviews'), L('Responde y construye tu reputación.', 'Reply and build your reputation.')],
    updates: [L('Novedades', 'Updates'), L('Publica ofertas, eventos y avisos.', 'Post offers, events and news.')],
    payments: [L('Pagos', 'Payouts'), L('Depósitos, balance y método de pago.', 'Payouts, balance and payment method.')],
    staff: [L('Personal', 'Staff'), L('Equipo, roles y permisos.', 'Team, roles and permissions.')],
    jobs: [L('Empleos', 'Jobs'), L('Publica vacantes para la comunidad.', 'Post openings for the community.')],
    modules: [L('Configurar módulos', 'Module setup'), L('Activa solo lo que tu negocio necesita.', 'Turn on only what your business needs.')],
    billing: [L('Plan y facturación', 'Billing & plan'), L('Tu plan, método de pago e historial.', 'Your plan, payment method and history.')],
    settings: [L('Ajustes', 'Settings'), L('Perfil, seguridad, notificaciones e idioma.', 'Profile, security, notifications and language.')],
  };
  const ctaMap: Partial<Record<TabKey, string>> = {
    listing: L('Guardar', 'Save'), photos: L('Subir', 'Upload'), menu: L('Agregar platillo', 'Add item'), services: L('Agregar servicio', 'Add service'), products: L('Agregar producto', 'Add product'), events: L('Crear evento', 'Create event'), rental: L('Agregar artículo', 'Add item'), updates: L('Nueva publicación', 'New post'), staff: L('Invitar', 'Invite'), reviews: L('Exportar', 'Export'), customers: L('Exportar', 'Export'), orders: L('Nuevo pedido', 'New order'), insights: L('Nuevo pedido', 'New order'), modules: L('Guardar', 'Save'), billing: L('Cambiar plan', 'Change plan'), settings: L('Guardar', 'Save'),
  };
  const [title, sub] = titles[tab];
  return { title, sub, cta: ctaMap[tab] ?? L('Nuevo', 'New'), hasGhost: ['insights', 'orders', 'customers'].includes(tab), ghost: L('Exportar', 'Export'), hasAccent: tab === 'insights', accent: L('Últimos 7 días', 'Last 7 days') };
}

// ---------- generic module content ----------
export type GRow = {
  title: string;
  sub?: string;
  body?: string;
  thumb?: string; // striped tile stops
  avatar?: [string, string]; // initials, color
  Icon?: LucideIcon;
  iconC?: string;
  iconBg?: string;
  right?: string;
  action?: string;
  pill?: [string, string, string]; // label, bg, color
  toggle?: boolean; // on/off switch state (undefined = no switch)
};
export type GSideRow = { Icon: LucideIcon; c: string; bg: string; title: string; sub: string; right?: string };
export type GKpi = { Icon: LucideIcon; c: string; bg: string; label: string; value: string; delta: string; dC?: string };
export type G = {
  banner?: { Icon: LucideIcon; title: string; sub: string; btn?: string; onBtn?: TabKey };
  tabs?: string[];
  compose?: string;
  kpis?: GKpi[];
  mainTitle: string;
  form?: { label: string; value: string; area?: boolean }[];
  rows?: GRow[];
  sideTitle?: string;
  side?: GSideRow[];
  sideNote?: { title: string; sub: string; btn: string };
};

export function buildGeneric(tab: TabKey, ctx: PanelCtx): G {
  const { L, isFree, isPremium, rubro, ci, es } = ctx;
  const bizName = isFree ? 'Lupita’s Tortillería' : ci.name;

  if (tab === 'listing') {
    return {
      mainTitle: L('Detalles del negocio', 'Business details'),
      form: [
        { label: L('Nombre del negocio', 'Business name'), value: bizName },
        { label: L('Categoría', 'Category'), value: isFree ? L('Panadería · Tortillería', 'Bakery · Tortillería') : L(ci.es, ci.en) },
        { label: L('Eslogan', 'Tagline'), value: L('Sabor de casa en el corazón de Bellaire.', 'Home-style flavor in the heart of Bellaire.') },
        { label: L('Descripción', 'Description'), value: L('Negocio familiar. Preparamos todo a diario con ingredientes locales. Catering disponible para eventos.', 'Family business. Everything made daily with local ingredients. Catering available for events.'), area: true },
        { label: L('Teléfono', 'Phone'), value: '(832) 555-4521' },
        { label: L('Dirección', 'Address'), value: '5821 Bellaire Blvd, Houston, TX' },
      ],
      sideTitle: L('Estado del listado', 'Listing status'),
      side: [
        { Icon: Shield, c: '#1F8A4C', bg: '#E3F5EA', title: L('Verificado', 'Verified'), sub: L('Insignia activa', 'Badge active') },
        { Icon: ImageIcon, c: '#6D4DF6', bg: '#F1EFFA', title: L('34 fotos', '34 photos'), sub: L('Portada + galería', 'Cover + gallery') },
        { Icon: Clock, c: '#B5791A', bg: '#FCEFD6', title: L('Horario completo', 'Hours set'), sub: L('Mar–Dom', 'Tue–Sun') },
      ],
      sideNote: isFree ? { title: L('Completa tu perfil', 'Complete your profile'), sub: L('Sube 4 fotos más y un logo para verificarte.', 'Add 4 more photos and a logo to get verified.'), btn: L('Continuar', 'Continue') } : undefined,
    };
  }

  if (tab === 'services') {
    const svc: [string, string, string, boolean][] =
      rubro === 'auto'
        ? [['Lavado Exterior', `30 min · ${L('reservable', 'bookable')}`, '$15', true], ['Detallado Completo', `90 min · ${L('reservable', 'bookable')}`, '$45', true], ['Encerado', '60 min', '$35', false]]
        : rubro === 'beauty'
          ? [[L('Corte de cabello', 'Haircut'), `45 min · ${L('reservable', 'bookable')}`, '$25', true], [L('Tinte', 'Color'), `120 min · ${L('reservable', 'bookable')}`, '$80', true], ['Manicure', '40 min', '$20', true]]
          : [[L('Menú degustación', 'Tasting menu'), L('Por reserva · 5 platos', 'By reservation · 5 courses'), '$110', true], ['Catering', L('Cotización · 20+ personas', 'Quote · 20+ ppl'), '$$', false], [L('Clase de cocina', 'Cooking class'), L('Sáb · 2h', 'Sat · 2h'), '$85', true]];
    return {
      banner: { Icon: Calendar, title: L('Módulo de reservas activo', 'Bookings module active'), sub: L('Los servicios reservables aceptan citas y depósitos.', 'Bookable services accept appointments and deposits.'), btn: L('Reservas', 'Bookings'), onBtn: 'bookings' },
      mainTitle: L('Tus servicios', 'Your services'),
      rows: svc.map((s) => ({ thumb: ci.tile, title: s[0], sub: s[1], right: s[2], toggle: s[3] })),
      sideTitle: L('Resumen', 'Summary'),
      side: [
        { Icon: Calendar, c: '#2A5C8A', bg: '#E4ECFB', title: `24 ${L('reservas', 'bookings')}`, sub: L('próximas', 'upcoming'), right: '96%' },
        { Icon: DollarSign, c: '#1F8A4C', bg: '#E3F5EA', title: '$1,240', sub: L('en depósitos', 'in deposits') },
      ],
    };
  }

  if (tab === 'bookings') {
    const fields =
      rubro === 'auto'
        ? [L('Tipo de vehículo', 'Vehicle type'), L('Paquete', 'Package'), L('Fecha', 'Date'), L('Hora', 'Time'), L('En sitio/a domicilio', 'On-site/mobile')]
        : rubro === 'beauty'
          ? [L('Servicio', 'Service'), L('Profesional', 'Stylist'), L('Fecha', 'Date'), L('Hora', 'Time')]
          : [L('Personas', 'Party size'), L('Fecha', 'Date'), L('Hora', 'Time'), L('Mesa/zona', 'Table/area'), L('Notas', 'Notes')];
    const ap: [string, string, string, string, string, string, string][] = [
      ['AM', '#7B61FF', 'Ana M.', `10:30 · ${L('Mesa 4', 'Table 4')}`, L('Confirmada', 'Confirmed'), '#1F8A4C', '#E3F5EA'],
      ['DK', '#2A5C8A', 'Daniel K.', `12:00 · ${L('degustación', 'tasting')}`, L('Confirmada', 'Confirmed'), '#1F8A4C', '#E3F5EA'],
      ['RG', '#E8954A', 'Rosa G.', '14:30', L('En espera', 'Pending'), '#9A6A12', '#FCEFD6'],
    ];
    return {
      banner: { Icon: Calendar, title: L('Campos personalizados para ', 'Custom fields for ') + L(ci.es, ci.en), sub: fields.join(' · ') },
      mainTitle: L('Citas de hoy', "Today's appointments"),
      rows: ap.map((a) => ({ avatar: [a[0], a[1]], title: a[2], sub: a[3], pill: [a[4], a[6], a[5]] })),
      sideTitle: L('Esta semana', 'This week'),
      side: [
        { Icon: Calendar, c: '#6D4DF6', bg: '#F1EFFA', title: `24 ${L('reservas', 'bookings')}`, sub: L('próximas', 'upcoming') },
        { Icon: Users, c: '#2A5C8A', bg: '#E4ECFB', title: '96%', sub: L('confirmadas', 'confirmed') },
        { Icon: DollarSign, c: '#1F8A4C', bg: '#E3F5EA', title: '$1,240', sub: L('depósitos', 'deposits') },
      ],
    };
  }

  if (tab === 'products') {
    const pr: [string, string, string][] = [
      [L('Salsa Casera', 'House Salsa'), L('Frasco 16oz · 24 en stock', '16oz jar · 24 in stock'), '$8'],
      [L('Camiseta Logo', 'Logo Tee'), L('5 tallas · 7 en stock', '5 sizes · 7 in stock'), '$18'],
      [L('Gorra', 'Cap'), L('Ajustable · agotado', 'Adjustable · out'), '$15'],
      [L('Café en grano', 'Coffee beans'), L('340g · 40 en stock', '340g · 40 in stock'), '$14'],
    ];
    return {
      tabs: [L('Catálogo', 'Catalog'), L('Inventario', 'Inventory'), L('Variantes', 'Variants')],
      mainTitle: L('Productos', 'Products'),
      rows: pr.map((p) => ({ thumb: ci.tile, title: p[0], sub: p[1], right: p[2] })),
      sideTitle: L('Envío y entrega', 'Shipping & delivery'),
      side: [
        { Icon: MapPin, c: '#1F8A4C', bg: '#E3F5EA', title: L('Entrega local', 'Local delivery'), sub: L('5 millas · $4', '5 miles · $4'), right: '›' },
        { Icon: Truck, c: '#2A5C8A', bg: '#E4ECFB', title: L('Envío y recogida', 'Shipping & pickup'), sub: `USPS · ${L('en tienda', 'in-store')}`, right: '›' },
        { Icon: HardHat, c: '#B5791A', bg: '#FCEFD6', title: L('Repartidores', 'Drivers'), sub: L('Propio o apps', 'Own or apps'), right: '3' },
      ],
    };
  }

  if (tab === 'menu') {
    const items: [string, string, string][] = [
      ['Al Pastor', L('Cerdo, piña, cilantro', 'Pork, pineapple, cilantro'), '$2.50'],
      ['Carne Asada', L('Res a la parrilla', 'Grilled beef'), '$2.75'],
      ['Pollo', L('Pollo adobado', 'Marinated chicken'), '$2.25'],
      ['Horchata', L('Arroz y canela', 'Rice & cinnamon'), '$3.00'],
    ];
    return {
      banner: { Icon: Truck, title: L('El menú activa la entrega local', 'Menu activates local delivery'), sub: L('Tus platillos aparecen en el listado público y en pedidos.', 'Your items appear on the public listing and in orders.') },
      mainTitle: L('Tacos · 12 platillos', 'Tacos · 12 items'),
      rows: items.map((it) => ({ title: it[0], sub: it[1], right: it[2], action: L('Editar', 'Edit') })),
      sideTitle: L('Secciones', 'Sections'),
      side: [
        { Icon: Utensils, c: '#B5791A', bg: '#FCEFD6', title: 'Tacos', sub: `12 ${L('platillos', 'items')}`, right: '›' },
        { Icon: Utensils, c: '#6D4DF6', bg: '#F1EFFA', title: L('Bebidas', 'Drinks'), sub: `6 ${L('platillos', 'items')}`, right: '›' },
        { Icon: Tag, c: '#D6336C', bg: '#FDE7EF', title: L('Especiales', 'Specials'), sub: `3 ${L('platillos', 'items')}`, right: '›' },
      ],
    };
  }

  if (tab === 'orders') {
    const od: [string, string, string, string, string, string, string][] = [
      ['#2487', 'María L.', `2× ${L('Quesabirria, Horchata', 'Quesabirria, Horchata')}`, '$48.20', L('Nuevo', 'New'), '#D6336C', '#FDE7EF'],
      ['#2486', L('Mesa 7', 'Table 7'), '3× Tacos al pastor', '$72.50', L('Preparando', 'Preparing'), '#9A6A12', '#FCEFD6'],
      ['#2481', 'Carlos M.', `1× Torta ahogada, 2× ${L('Refrescos', 'Sodas')}`, '$24.50', L('Listo', 'Ready'), '#1F8A4C', '#E3F5EA'],
      ['#2479', L('Mesa 5', 'Table 5'), L('Cena para 4', 'Dinner for 4'), '$186.00', L('Completado', 'Completed'), '#8A86A0', '#F1EFFA'],
    ];
    return {
      kpis: [
        { Icon: ShoppingBag, c: '#7B61FF', bg: '#F1EFFA', label: L('Hoy', 'Today'), value: '68', delta: '▲ 18%' },
        { Icon: DollarSign, c: '#1F9D57', bg: '#E3F5EA', label: L('Ingresos', 'Revenue'), value: '$1,847', delta: '▲ 12%' },
        { Icon: Clock, c: '#F4B740', bg: '#FCEFD6', label: L('Prom. prep', 'Avg prep'), value: '14m', delta: '▼ 2m' },
        { Icon: Route, c: '#2A5C8A', bg: '#E4ECFB', label: L('Entregas', 'Delivery'), value: '142', delta: '▲ 18%' },
      ],
      mainTitle: L('Pedidos recientes', 'Recent orders'),
      rows: od.map((o) => ({ Icon: ShoppingBag, iconC: '#6D4DF6', iconBg: '#F1EFFA', title: `${o[0]} · ${o[1]}`, sub: o[2], pill: [o[4], o[6], o[5]] })),
      sideTitle: L('Por canal', 'By channel'),
      side: [
        { Icon: Utensils, c: '#6D4DF6', bg: '#F1EFFA', title: L('Mostrador', 'Dine-in'), sub: '42%', right: '28' },
        { Icon: ShoppingBag, c: '#D6336C', bg: '#FDE7EF', title: L('Recoger', 'Pickup'), sub: '24%', right: '16' },
        { Icon: Truck, c: '#1F8A4C', bg: '#E3F5EA', title: L('Entrega', 'Delivery'), sub: '22%', right: '15' },
      ],
    };
  }

  if (tab === 'customers') {
    const cu: [string, string, string, string, string, string, string][] = [
      ['ML', '#7B61FF', 'María L.', `18 ${L('pedidos', 'orders')} · $1,840`, 'VIP', '#F1EFFA', '#6D4DF6'],
      ['JT', '#E8954A', 'James T.', `7 ${L('pedidos', 'orders')} · $420`, L('Recurrente', 'Returning'), '#E3F5EA', '#1F8A4C'],
      ['AF', '#1F9D57', 'Ana F.', `3 ${L('pedidos', 'orders')} · $184`, L('Nuevo', 'New'), '#FCEFD6', '#9A6A12'],
      ['DK', '#D6336C', 'Daniel K.', `12 ${L('pedidos', 'orders')} · $980`, L('Recurrente', 'Returning'), '#E3F5EA', '#1F8A4C'],
    ];
    return {
      kpis: [
        { Icon: Users, c: '#7B61FF', bg: '#F1EFFA', label: L('Total', 'Total'), value: '4,218', delta: '▲ 6%' },
        { Icon: User, c: '#1F9D57', bg: '#E3F5EA', label: L('Nuevos/sem', 'New/wk'), value: '62', delta: '▲ 28%' },
        { Icon: Heart, c: '#D6336C', bg: '#FDE7EF', label: L('Recurrentes', 'Returning'), value: '72%', delta: '▲ 4pp' },
        { Icon: DollarSign, c: '#F4B740', bg: '#FCEFD6', label: L('LTV prom.', 'Avg LTV'), value: '$184', delta: '▲ 9%' },
      ],
      mainTitle: L('Tus clientes', 'Your customers'),
      rows: cu.map((c) => ({ avatar: [c[0], c[1]], title: c[2], sub: c[3], pill: [c[4], c[5], c[6]] })),
      sideTitle: L('Segmentos', 'Segments'),
      side: [
        { Icon: Star, c: '#6D4DF6', bg: '#F1EFFA', title: 'VIP', sub: L('Top 10% gasto', 'Top 10% spend'), right: '142' },
        { Icon: Heart, c: '#D6336C', bg: '#FDE7EF', title: L('Leales', 'Loyal'), sub: `5+ ${L('pedidos', 'orders')}`, right: '880' },
        { Icon: Clock, c: '#B5791A', bg: '#FCEFD6', title: L('En riesgo', 'At risk'), sub: L('sin pedir 60d', 'no order 60d'), right: '210' },
      ],
    };
  }

  if (tab === 'reviews') {
    const rv: [string, string, string, string, string][] = [
      ['ML', '#7B61FF', 'María L.', `★★★★★ · ${L('hace 2h', '2h ago')}`, L('El mejor al pastor de Houston. Los martes de 2x1 son una experiencia.', 'Best al pastor in Houston. Taco Tuesday is a religious experience.')],
      ['JT', '#E8954A', 'James T.', `★★★★☆ · ${L('hace 1d', '1d ago')}`, L('El servicio fue un poco lento en la cena pero la comida lo compensó.', 'Service was a bit slow at dinner but the food made up for it.')],
    ];
    return {
      kpis: [
        { Icon: Star, c: '#F4B740', bg: '#FCEFD6', label: L('Calificación', 'Rating'), value: '4.8', delta: `412 ${L('reseñas', 'reviews')}`, dC: '#8A86A0' },
        { Icon: MessageCircle, c: '#7B61FF', bg: '#F1EFFA', label: L('Respuestas', 'Replied'), value: '88%', delta: '▲ 5%' },
        { Icon: Heart, c: '#D6336C', bg: '#FDE7EF', label: L('Recomiendan', 'Recommend'), value: '94%', delta: '▲ 2%' },
        { Icon: Clock, c: '#1F9D57', bg: '#E3F5EA', label: L('Resp. prom.', 'Avg reply'), value: '3h', delta: '▼ 1h' },
      ],
      mainTitle: L('Reseñas recientes', 'Recent reviews'),
      rows: rv.map((r) => ({ avatar: [r[0], r[1]], title: r[2], sub: r[3], body: r[4], action: isFree ? undefined : L('Responder', 'Reply') })),
      sideTitle: L('Distribución', 'Breakdown'),
      side: [
        { Icon: Star, c: '#1F8A4C', bg: '#E3F5EA', title: '5 ★', sub: '320', right: '78%' },
        { Icon: Star, c: '#B5791A', bg: '#FCEFD6', title: '4 ★', sub: '64', right: '16%' },
        { Icon: Star, c: '#D6336C', bg: '#FDE7EF', title: '≤3 ★', sub: '28', right: '6%' },
      ],
    };
  }

  if (tab === 'updates') {
    const up: [string, string, string, string, string, string][] = [
      [L('OFERTA', 'OFFER'), '#FCEFD6', '#B5791A', L('hace 2d', '2d ago'), L('🌮 Martes de tacos: 2x1 todo el día.', '🌮 Taco Tuesday: 2-for-1 all day.'), '480 · ♥ 36'],
      [L('AVISO', 'NEWS'), '#F1EFFA', '#6D4DF6', L('hace 5d', '5d ago'), L('Ahora abrimos domingos 10–4.', 'Now open Sundays 10–4.'), '320 · ♥ 21'],
    ];
    return {
      compose: L('Comparte una novedad con tus clientes…', 'Share an update with your customers…'),
      mainTitle: L('Publicadas', 'Published'),
      rows: up.map((u) => ({ pill: [u[0], u[1], u[2]], title: '', sub: u[3], body: u[4], right: u[5] })),
      sideTitle: L('Alcance · 30 días', 'Reach · 30 days'),
      side: [
        { Icon: Eye, c: '#6D4DF6', bg: '#F1EFFA', title: L('Impresiones', 'Impressions'), sub: L('en el feed', 'in the feed'), right: '8.2k' },
        { Icon: Heart, c: '#D6336C', bg: '#FDE7EF', title: L('Interacciones', 'Engagement'), sub: '♥ + 💬', right: '612' },
      ],
    };
  }

  if (tab === 'staff') {
    const stf: [string, string, string, string, string, string, string][] = [
      ['LM', '#7B61FF', 'Lupita M.', 'lupita@mail.com', L('Dueña', 'Owner'), '#F1EFFA', '#6D4DF6'],
      ['CR', '#1F9D57', 'Carlos R.', 'carlos@mail.com', L('Gerente', 'Manager'), '#E3F5EA', '#1F8A4C'],
      ['AS', '#E8954A', 'Ana S.', 'ana@mail.com', 'Staff', '#FCEFD6', '#9A6A12'],
    ];
    return {
      mainTitle: L('Tu equipo', 'Your team'),
      rows: stf.map((s) => ({ avatar: [s[0], s[1]], title: s[2], sub: s[3], pill: [s[4], s[5], s[6]] })),
      sideTitle: L('Roles y permisos', 'Roles & permissions'),
      side: [
        { Icon: Shield, c: '#6D4DF6', bg: '#F1EFFA', title: L('Dueña', 'Owner'), sub: L('Acceso total', 'Full access'), right: '1' },
        { Icon: User, c: '#1F8A4C', bg: '#E3F5EA', title: L('Gerente', 'Manager'), sub: L('Pedidos, menú', 'Orders, menu'), right: '2' },
        { Icon: Briefcase, c: '#B5791A', bg: '#FCEFD6', title: L('Empleos abiertos', 'Open jobs'), sub: L('Recibiendo solicitudes', 'Receiving applicants'), right: '3' },
      ],
    };
  }

  if (tab === 'billing') {
    return {
      mainTitle: L('Tu plan', 'Your plan'),
      rows: [
        { Icon: CreditCard, iconC: '#6D4DF6', iconBg: '#F1EFFA', title: isFree ? 'Free' : isPremium ? 'Premium · $49/mo' : 'Verified · $19/mo', sub: isFree ? L('Sin costo', 'No cost') : L('Renueva el 5 ago', 'Renews Aug 5'), pill: [isFree ? 'Free' : L('Activo', 'Active'), '#E3F5EA', '#1F8A4C'] },
        { Icon: CreditCard, iconC: '#2A5C8A', iconBg: '#E4ECFB', title: 'Visa •• 4242', sub: L('Vence 08/27', 'Expires 08/27'), action: L('Cambiar', 'Edit') },
        { Icon: DollarSign, iconC: '#1F8A4C', iconBg: '#E3F5EA', title: L('Factura · jun', 'Invoice · Jun'), sub: `$19.00 · ${L('pagada', 'paid')}`, right: 'PDF' },
      ],
      sideTitle: L('Beneficios del plan', 'Plan benefits'),
      side: [
        { Icon: Shield, c: '#1F8A4C', bg: '#E3F5EA', title: L('Insignia verificada', 'Verified badge'), sub: L('Activa', 'Active') },
        { Icon: LayoutGrid, c: '#6D4DF6', bg: '#F1EFFA', title: L('Todos los módulos', 'All modules'), sub: L('Desbloqueados', 'Unlocked') },
        { Icon: Eye, c: '#B5791A', bg: '#FCEFD6', title: L('5× descubrimiento', '5× discovery'), sub: L('En el mapa', 'On the map') },
      ],
      sideNote: !isPremium ? { title: L('Mejorar a Premium', 'Upgrade to Premium'), sub: L('Insights AI, posición destacada y soporte 24/7 por $49/mes.', 'Insights AI, featured placement and 24/7 support for $49/mo.'), btn: L('Mejorar', 'Upgrade') } : undefined,
    };
  }

  if (tab === 'settings') {
    const rows: [LucideIcon, string, string, string, string][] = [
      [Globe, '#6D4DF6', '#F1EFFA', L('Perfil del negocio', 'Business profile'), ''],
      [Shield, '#1F8A4C', '#E3F5EA', L('Seguridad', 'Security'), ''],
      [Bell, '#B5791A', '#FCEFD6', L('Notificaciones', 'Notifications'), ''],
      [Globe, '#D6336C', '#FDE7EF', L('Idioma', 'Language'), es ? 'Español' : 'English'],
      [Settings, '#2A5C8A', '#E4ECFB', L('Integraciones', 'Integrations'), '3'],
      [User, '#7B61FF', '#F1EFFA', L('Cuenta', 'Account'), ''],
    ];
    return {
      mainTitle: L('Configuración', 'Settings'),
      rows: rows.map((s) => ({ Icon: s[0], iconC: s[1], iconBg: s[2], title: s[3], right: s[4] || '›' })),
      sideTitle: L('Idioma del panel', 'Dashboard language'),
      side: [{ Icon: Globe, c: '#6D4DF6', bg: '#F1EFFA', title: es ? 'Español' : 'English', sub: L('Activo', 'Active') }],
    };
  }

  // photos, hours, related, shipping, drivers, rental, events, payments, jobs, messages
  const genMap: Partial<Record<TabKey, { kpis?: GKpi[]; mainTitle: string; thumb?: boolean; avatar?: boolean; items?: [string, string][] | [string, string, string, string][]; rows?: [string, string][]; side?: [string, string][] }>> = {
    photos: {
      kpis: [
        { Icon: ImageIcon, c: '#6D4DF6', bg: '#F1EFFA', label: L('Fotos', 'Photos'), value: '34', delta: L('publicadas', 'live'), dC: '#8A86A0' },
        { Icon: Eye, c: '#1F9D57', bg: '#E3F5EA', label: L('Vistas', 'Views'), value: '8.1k', delta: '▲ 31%' },
      ],
      mainTitle: L('Galería', 'Gallery'), thumb: true,
      items: [[L('Portada', 'Cover'), L('Exterior · destacada', 'Exterior · featured')], [L('Interior', 'Interior'), L('Comedor', 'Dining room')], [L('Productos', 'Products'), L('Platillos y bebidas', 'Dishes & drinks')], [L('Equipo', 'Team'), L('Detrás de cámaras', 'Behind the scenes')]],
    },
    hours: { mainTitle: L('Horario semanal', 'Weekly hours'), rows: [[L('Lun – Vie', 'Mon – Fri'), '7:00 – 19:00'], [L('Sábado', 'Saturday'), '8:00 – 20:00'], [L('Domingo', 'Sunday'), '8:00 – 16:00']], side: [[L('Feriados', 'Holidays'), L('3 configurados', '3 set')], [L('Horas especiales', 'Special hours'), 'Halloween']] },
    related: { mainTitle: L('Sucursales y marcas', 'Branches & brands'), rows: [[`${bizName} · Bellaire`, L('Principal', 'Primary')], [`${bizName} · Katy`, L('Sucursal', 'Branch')], ['Café Hermano', L('Marca hermana', 'Sister brand')]], side: [[L('Listados vinculados', 'Linked listings'), '3'], [L('Solicitudes', 'Requests'), '1']] },
    shipping: { mainTitle: L('Zonas de envío', 'Shipping zones'), rows: [[L('Entrega local', 'Local delivery'), '5 mi · $4'], [L('Recogida en tienda', 'Store pickup'), L('Gratis', 'Free')], [L('Envío nacional', 'National shipping'), 'USPS · $8']], side: [[L('Pedidos entregados', 'Delivered'), '142'], [L('Tiempo prom.', 'Avg time'), '18 min']] },
    drivers: { mainTitle: L('Repartidores', 'Drivers'), rows: [['Marco D.', L('Propio · activo', 'Own · active')], ['Sofía R.', L('Propio · activo', 'Own · active')], ['App externa', L('Externo · conectado', 'External · connected')]], side: [[L('Entregas hoy', 'Deliveries today'), '38'], [L('En ruta', 'On route'), '3']] },
    rental: { mainTitle: L('Artículos en renta', 'Rental items'), thumb: true, items: [[L('Bici urbana', 'City bike'), `$25/${L('día', 'day')}`], [L('Bici eléctrica', 'E-bike'), `$45/${L('día', 'day')}`], [L('Casco', 'Helmet'), `$5/${L('día', 'day')}`]], side: [[L('Rentas activas', 'Active rentals'), '12'], [L('Disponibles', 'Available'), '28']] },
    events: {
      kpis: [
        { Icon: Ticket, c: '#D6336C', bg: '#FDE7EF', label: L('Eventos', 'Events'), value: '4', delta: L('próximos', 'upcoming'), dC: '#8A86A0' },
        { Icon: DollarSign, c: '#1F9D57', bg: '#E3F5EA', label: L('Boletos', 'Tickets'), value: '$2,420', delta: '▲ 24%' },
      ],
      mainTitle: L('Próximos eventos', 'Upcoming events'),
      rows: [[L('Noche de Lotería', 'Lotería Night'), '14/16 · $10'], [L('Cena de Halloween · 6 platos', 'Halloween dinner · 6 courses'), '32/48 · $140'], [L('Música en vivo', 'Live music'), '22/30 · $15']],
      side: [[L('Boletos vendidos', 'Tickets sold'), '68'], [L('Ingresos', 'Revenue'), '$2,420']],
    },
    payments: {
      kpis: [
        { Icon: DollarSign, c: '#1F9D57', bg: '#E3F5EA', label: L('Balance', 'Balance'), value: '$4,184', delta: L('disponible', 'available'), dC: '#8A86A0' },
        { Icon: CreditCard, c: '#6D4DF6', bg: '#F1EFFA', label: L('Este mes', 'This month'), value: '$48k', delta: '▲ 14%' },
      ],
      mainTitle: L('Pagos recientes', 'Recent payouts'),
      rows: [[L('Pago · 16 jul', 'Payout · Jul 16'), '$4,184.20'], [L('Pago · 9 jul', 'Payout · Jul 9'), '$3,920.00'], [L('Pago · 2 jul', 'Payout · Jul 2'), '$4,510.50']],
      side: [[L('Cuenta', 'Account'), 'Chase ••4421'], [L('Próximo pago', 'Next payout'), '23 jul']],
    },
    jobs: { mainTitle: L('Vacantes publicadas', 'Open positions'), rows: [[L('Cocinero de línea', 'Line Cook'), `$18/hr · ${L('tiempo completo', 'full-time')}`], ['Barista', `$16/hr · ${L('medio tiempo', 'part-time')}`], [L('Repartidor', 'Driver'), `$17/hr · ${L('por turno', 'shift')}`]], side: [[L('Solicitudes', 'Applicants'), '24'], [L('Por revisar', 'To review'), '8']] },
    messages: { mainTitle: L('Conversaciones', 'Conversations'), avatar: true, items: [['SR', '#7B61FF', 'Sofía R.', L('¿Hacen catering para 50?', 'Do you cater for 50?')], ['JM', '#1F9D57', 'Juan M.', L('¿Tienen opción vegana?', 'Any vegan options?')], ['AL', '#E8954A', 'Ana L.', L('Gracias por el pedido 🙏', 'Thanks for the order 🙏')]] as [string, string, string, string][], side: [[L('Sin leer', 'Unread'), '7'], [L('Resp. prom.', 'Avg reply'), '12 min']] },
  };
  const d = genMap[tab] ?? { mainTitle: '—', rows: [['—', '']] as [string, string][] };
  const rows: GRow[] = d.items
    ? d.avatar
      ? (d.items as [string, string, string, string][]).map((x) => ({ avatar: [x[0], x[1]], title: x[2], sub: x[3], action: L('Abrir', 'Open') }))
      : (d.items as [string, string][]).map((x) => ({ thumb: d.thumb ? ci.tile : undefined, title: x[0], sub: x[1], right: x[1] ? undefined : undefined }))
    : (d.rows ?? []).map((r) => ({ title: r[0], right: r[1] }));
  return {
    kpis: d.kpis,
    mainTitle: d.mainTitle,
    rows,
    sideTitle: L('Resumen', 'Summary'),
    side: (d.side ?? []).map((s) => ({ Icon: BarChart3, c: '#6D4DF6', bg: '#F1EFFA', title: s[0], sub: '', right: s[1] })),
  };
}
