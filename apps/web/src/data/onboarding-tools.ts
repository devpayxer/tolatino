// Herramientas del onboarding de negocio (handoff "Business Onboarding", 2026-08).
//
// El handoff modela el onboarding alrededor de HERRAMIENTAS: la categoría que el
// dueño elige decide qué herramienta se le activa en el panel ("Activaremos:
// Menú y pedidos en línea"). Este archivo traduce ese modelo a NUESTRA realidad,
// sin inventar taxonomías nuevas:
//   · las categorías son las 17 reales de `@/lib/tiles` (las que valida
//     `create_business` contra la tabla `categories`, y que usan los 548
//     negocios sembrados, la búsqueda y el directorio);
//   · las herramientas apuntan a los MÓDULOS reales del panel
//     (`businesses.modules`: menu, products, services, rental, events…), los
//     mismos que gobiernan qué tabs salen en la ficha del cliente.
//
// Por qué por CATEGORÍA y no por subcategoría: `create_business` guarda UNA
// `category_id`, y el panel provisiona por módulo a nivel negocio (nunca por
// ítem — regla "Vender vs Catálogo"). Un mapa categoría→herramienta es el
// default correcto y honesto; el dueño afina cada módulo desde su panel después.

import type { CatKey } from '@/lib/tiles';

/** Los códigos de herramienta del handoff. */
export type ToolCode =
  | 'pedidos' | 'citas' | 'eventos' | 'renta' | 'shop'
  | 'autos' | 'realestate' | 'transport';

/** Clave del módulo del panel que la herramienta enciende (`businesses.modules`). */
export type ModuleKey =
  | 'menu' | 'services' | 'events' | 'rental' | 'products'
  | 'autos' | 'realestate' | 'transport';

export type Tool = {
  /** El módulo del panel que se enciende al provisionar esta herramienta. */
  module: ModuleKey;
  es: string; en: string;      // nombre visible
  descEs: string; descEn: string; // qué hace (una línea, como en el handoff)
};

/**
 * Herramienta → módulo + copy. Los nombres y descripciones son los del handoff
 * (§2 "Tool codes → dashboard modules"), en español primero.
 */
export const TOOL: Record<ToolCode, Tool> = {
  pedidos: {
    module: 'menu',
    es: 'Menú y pedidos en línea', en: 'Menu & online orders',
    descEs: 'Sube tu menú con fotos y recibe pedidos para recoger o a domicilio.',
    descEn: 'Upload your menu with photos and take orders for pickup or delivery.',
  },
  citas: {
    module: 'services',
    es: 'Agenda y reservas', en: 'Calendar & bookings',
    descEs: 'Tus clientes ven tus horarios libres y reservan solos, con recordatorios.',
    descEn: 'Customers see your open slots and book themselves, with reminders.',
  },
  eventos: {
    module: 'events',
    es: 'Eventos y boletos', en: 'Events & tickets',
    descEs: 'Publica tus eventos y vende boletos con QR y control de acceso.',
    descEn: 'Post your events and sell tickets with QR codes and check-in.',
  },
  renta: {
    module: 'rental',
    es: 'Catálogo de renta', en: 'Rental catalog',
    descEs: 'Calendario de disponibilidad, depósitos y registro de daños.',
    descEn: 'Availability calendar, deposits and damage records.',
  },
  shop: {
    module: 'products',
    es: 'Catálogo de productos', en: 'Product catalog',
    descEs: 'Inventario, variantes y venta en línea con envío o recoger.',
    descEn: 'Inventory, variants and online sales with shipping or pickup.',
  },
  autos: {
    module: 'autos',
    es: 'Inventario de autos', en: 'Vehicle inventory',
    descEs: 'Publica tus unidades con financiamiento y pruebas de manejo.',
    descEn: 'List your vehicles with financing and test drives.',
  },
  realestate: {
    module: 'realestate',
    es: 'Listados de propiedades', en: 'Property listings',
    descEs: 'Publica propiedades con mapa, visitas y solicitudes.',
    descEn: 'List properties with a map, tours and applications.',
  },
  transport: {
    module: 'transport',
    es: 'Viajes y cotizaciones', en: 'Trips & quotes',
    descEs: 'Recibe solicitudes, cotiza y da seguimiento a cada viaje.',
    descEn: 'Take requests, quote and track every trip.',
  },
};

/**
 * Categoría (las 17 reales) → su herramienta principal. Es el default de
 * provisión al publicar; el dueño puede prender/apagar cualquier módulo desde
 * el panel después. Elegida por lo que la mayoría de negocios de ese rubro
 * necesita primero.
 */
export const TOOL_FOR_CAT: Record<CatKey, ToolCode> = {
  FoodDrinks: 'pedidos',
  NightLife: 'pedidos',
  Grocery: 'shop',
  Shops: 'shop',
  BeautyHealth: 'citas',
  HealthMedicine: 'citas',
  HomeServices: 'citas',
  AutoServices: 'citas',
  ProServices: 'citas',
  Children: 'citas',
  Education: 'citas',
  Sports: 'citas',
  Churches: 'eventos',
  Party: 'renta',
  Transportation: 'transport',
  CarDealer: 'autos',
  RealEstate: 'realestate',
};

/** La herramienta que se activará para una categoría dada. */
export function toolForCat(cat: CatKey): Tool {
  return TOOL[TOOL_FOR_CAT[cat]];
}
