// Business-detail fixtures (menu / shop / services / events / staff / reviews)
// — from the Handoff v2 prototype. Bilingual pairs as [es, en].

export type Bi = [string, string];

export type MenuItem = {
  id?: string; // real business_items.id (live menu/shop) — used to re-price orders server-side
  n: Bi;
  d: Bi;
  price: number;
  orig?: number;
  tag?: Bi;
  tagBg?: string;
  tagC?: string;
  bg: string; // striped tile stops "A 0 8px,B 8px 16px"
  img?: string; // real photo URL (live menus) — bg stays as the fallback
  kcal?: number; // calories (ordering flow) — from attrs.kcal
  desc2?: Bi; // longer bilingual description (falls back to d)
  stock?: number; // shop products only: units left (0 = sold out); undefined = untracked
  variantStock?: Record<string, number>; // per-variant units, keyed `setId:idx|…` (undefined = not tracked per variant)
  // Rich product detail (OPTIONAL — set per product in the dashboard's Detalles
  // section; furniture/appliance-grade PDP à la Wayfair/Amazon). All display-only.
  brand?: string; // manufacturer / brand line above the name
  longD?: Bi; // long-form description paragraphs
  specs?: { k: Bi; v: Bi }[]; // spec table rows (Dimensiones / Material / Color / Garantía…)
  photos?: string[]; // photo gallery URLs (img stays the primary/fallback)
};

export type MenuCat = { key: string; name: Bi; items: MenuItem[] };

export const MENU: MenuCat[] = [
  {
    key: 'tacos',
    name: ['Tacos', 'Tacos'],
    items: [
      { n: ['Taco al Pastor', 'Al Pastor Taco'], d: ['Cerdo marinado, piña y cilantro', 'Marinated pork, pineapple & cilantro'], price: 2.5, tag: ['Popular', 'Popular'], tagBg: '#EFEBFF', tagC: '#6D4DF6', bg: '#EFEBFF 0 8px,#E5DEF9 8px 16px' },
      { n: ['Taco de Carne Asada', 'Carne Asada Taco'], d: ['Res a la parrilla con cebollita', 'Grilled beef with onion'], price: 3.0, bg: '#FCEBD6 0 8px,#F6DEC0 8px 16px' },
      { n: ['Taco de Suadero', 'Suadero Taco'], d: ['Corte suave, doble tortilla de maíz', 'Tender cut, double corn tortilla'], price: 2.75, bg: '#E3F5EA 0 8px,#D6EFDF 8px 16px' },
      { n: ['Taco de Pollo', 'Chicken Taco'], d: ['Pollo asado con guacamole', 'Grilled chicken with guacamole'], price: 2.5, bg: '#FBE9F0 0 8px,#F5D8E6 8px 16px' },
    ],
  },
  {
    key: 'esp',
    name: ['Especialidades', 'Specialties'],
    items: [
      { n: ['Quesabirria (3)', 'Quesabirria (3)'], d: ['Con consomé para remojar 🔥', 'With consommé to dip 🔥'], price: 12.0, tag: ['Recomendado', 'Recommended'], tagBg: '#E3F5EA', tagC: '#1F8A4C', bg: '#EFEBFF 0 8px,#E5DEF9 8px 16px' },
      { n: ['Torta Ahogada', 'Torta Ahogada'], d: ['Bañada en salsa de chile de árbol', 'Drowned in chile de árbol sauce'], price: 9.5, bg: '#FCEBD6 0 8px,#F6DEC0 8px 16px' },
      { n: ['Gringa', 'Gringa'], d: ['Tortilla de harina con queso', 'Flour tortilla with cheese'], price: 7.0, bg: '#FCF1C7 0 8px,#F6E8AE 8px 16px' },
    ],
  },
  {
    key: 'beb',
    name: ['Bebidas', 'Drinks'],
    items: [
      { n: ['Agua de Horchata', 'Horchata'], d: ['Hecha en casa', 'House-made'], price: 3.0, bg: '#F1EFFA 0 8px,#E5DEF9 8px 16px' },
      { n: ['Agua de Jamaica', 'Jamaica'], d: ['Refrescante', 'Refreshing'], price: 3.0, bg: '#FBE9F0 0 8px,#F5D8E6 8px 16px' },
      { n: ['Refresco', 'Mexican Soda'], d: ['De vidrio', 'Glass bottle'], price: 2.5, bg: '#E5EFFB 0 8px,#D7E5F6 8px 16px' },
    ],
  },
];

export const SHOP: MenuCat[] = [
  {
    key: 'salsas',
    name: ['Salsas y conservas', 'Salsas & preserves'],
    items: [
      { n: ['Salsa Roja Tatemada', 'Roasted Red Salsa'], d: ['Frasco 8oz · picante', '8oz jar · spicy'], price: 4.5, orig: 6, bg: '#FBE9F0 0 8px,#F5D8E6 8px 16px' },
      { n: ['Salsa Verde', 'Green Salsa'], d: ['Frasco 8oz', '8oz jar'], price: 4.5, bg: '#E3F5EA 0 8px,#D6EFDF 8px 16px' },
      { n: ['Chiles en escabeche', 'Pickled chiles'], d: ['Frasco 12oz', '12oz jar'], price: 5.5, bg: '#FCF1C7 0 8px,#F6E8AE 8px 16px' },
    ],
  },
  {
    key: 'despensa',
    name: ['Despensa', 'Pantry'],
    items: [
      { n: ['Tortillas hechas a mano', 'Handmade tortillas'], d: ['Docena · maíz', 'Dozen · corn'], price: 3.5, bg: '#FCF1C7 0 8px,#F6E8AE 8px 16px' },
      { n: ['Chips caseros', 'House chips'], d: ['Bolsa grande', 'Large bag'], price: 2.5, orig: 3.5, bg: '#FCEBD6 0 8px,#F6DEC0 8px 16px' },
      { n: ['Frijoles de la casa', 'House beans'], d: ['1 lb', '1 lb'], price: 4.0, bg: '#EFEBFF 0 8px,#E5DEF9 8px 16px' },
    ],
  },
  {
    key: 'mercancia',
    name: ['Mercancía', 'Merch'],
    items: [
      { n: ['Playera La Esperanza', 'La Esperanza tee'], d: ['Algodón · S–XXL', 'Cotton · S–XXL'], price: 15.0, bg: '#EFEBFF 0 8px,#E5DEF9 8px 16px' },
      { n: ['Taza de cerámica', 'Ceramic mug'], d: ['12oz', '12oz'], price: 9.0, bg: '#E5EFFB 0 8px,#D7E5F6 8px 16px' },
    ],
  },
];

export type OptionGroup = { id: string; name: Bi; type: 'single' | 'multi'; required?: boolean; max?: number; choices: { label: Bi; price: number }[] };
/** Per-item badge for the ordering flow (design: Popular/Nuevo/Picante/Vegano). */
export type MenuBadge = '' | 'Popular' | 'Nuevo' | 'Picante' | 'Vegano' | 'Vegetariano';

export const OPTION_GROUPS: Record<string, OptionGroup[]> = {
  tacos: [
    { id: 'prep', name: ['Preparación', 'Prep'], type: 'single', choices: [{ label: ['Con todo', 'With everything'], price: 0 }, { label: ['Sin cebolla', 'No onion'], price: 0 }, { label: ['Sin cilantro', 'No cilantro'], price: 0 }] },
    { id: 'extras', name: ['Extras', 'Extras'], type: 'multi', choices: [{ label: ['Queso', 'Cheese'], price: 0.75 }, { label: ['Guacamole', 'Guacamole'], price: 1.5 }, { label: ['Doble carne', 'Double meat'], price: 2 }] },
    { id: 'salsa', name: ['Salsa', 'Salsa'], type: 'single', choices: [{ label: ['Roja', 'Red'], price: 0 }, { label: ['Verde', 'Green'], price: 0 }, { label: ['Habanero', 'Habanero'], price: 0 }] },
  ],
  esp: [
    { id: 'size', name: ['Porción', 'Portion'], type: 'single', choices: [{ label: ['Individual', 'Individual'], price: 0 }, { label: ['Familiar', 'Family'], price: 5 }] },
    { id: 'extras', name: ['Extras', 'Extras'], type: 'multi', choices: [{ label: ['Consomé extra', 'Extra consommé'], price: 1 }, { label: ['Queso', 'Cheese'], price: 0.75 }, { label: ['Tortillas extra', 'Extra tortillas'], price: 1 }] },
  ],
  beb: [
    { id: 'size', name: ['Tamaño', 'Size'], type: 'single', choices: [{ label: ['Mediano', 'Medium'], price: 0 }, { label: ['Grande', 'Large'], price: 1 }] },
    { id: 'ice', name: ['Hielo', 'Ice'], type: 'single', choices: [{ label: ['Normal', 'Normal'], price: 0 }, { label: ['Sin hielo', 'No ice'], price: 0 }] },
  ],
  salsas: [{ id: 'size', name: ['Tamaño', 'Size'], type: 'single', choices: [{ label: ['8oz', '8oz'], price: 0 }, { label: ['16oz', '16oz'], price: 2 }] }],
  mercancia: [{ id: 'talla', name: ['Talla', 'Size'], type: 'single', choices: [{ label: ['S', 'S'], price: 0 }, { label: ['M', 'M'], price: 0 }, { label: ['L', 'L'], price: 0 }, { label: ['XL', 'XL'], price: 0 }] }],
};

export const SHOP_PROMOS: { t: Bi; sub: Bi; bg: string; c: string }[] = [
  { t: ['Envío gratis', 'Free delivery'], sub: ['En pedidos +$25', 'On orders $25+'], bg: '#EFEBFF 0 12px,#E5DEF9 12px 24px', c: '#5B3FD6' },
  { t: ['2x1 en salsas', '2-for-1 salsas'], sub: ['Solo esta semana', 'This week only'], bg: '#FCEBD6 0 12px,#F6DEC0 12px 24px', c: '#B26A00' },
  { t: ['Nuevo: mercancía', 'New: merch'], sub: ['Playeras y tazas', 'Tees & mugs'], bg: '#E3F5EA 0 12px,#D6EFDF 12px 24px', c: '#1F8A4C' },
];

export const SERVICES: { n: Bi; d: Bi; price: Bi }[] = [
  { n: ['Catering para eventos', 'Event catering'], d: ['Desde 20 personas · menú a elegir', 'From 20 people · choose your menu'], price: ['Desde $180', 'From $180'] },
  { n: ['Reservación de mesa', 'Table reservation'], d: ['Grupos grandes y celebraciones', 'Large groups & celebrations'], price: ['Gratis', 'Free'] },
  { n: ['Pedidos por mayoreo', 'Wholesale orders'], d: ['Restaurantes y tiendas locales', 'Restaurants & local shops'], price: ['Cotización', 'Quote'] },
  { n: ['Renta del salón', 'Venue rental'], d: ['Quinceañeras, cumpleaños y más', 'Quinces, birthdays & more'], price: ['Desde $350', 'From $350'] },
];

export const SVC_DATES: { lab: Bi; sub: string }[] = [
  { lab: ['Hoy', 'Today'], sub: 'Jul 2' },
  { lab: ['Mañana', 'Tomorrow'], sub: 'Jul 3' },
  { lab: ['Jue', 'Thu'], sub: 'Jul 4' },
  { lab: ['Vie', 'Fri'], sub: 'Jul 5' },
  { lab: ['Sáb', 'Sat'], sub: 'Jul 6' },
];

export const SVC_TIMES = ['9:00 am', '12:00 pm', '3:00 pm', '6:00 pm'];

// Consumer-facing rentable items (mirror the business Rental module's catalog).
// Rented by hour / day / week with a refundable deposit — drives the Renta tab.
export type RentItem = { n: Bi; d: Bi; tile: string; hour: number | null; day: number; week: number; dep: number };
export const RENTAL: RentItem[] = [
  { n: ['Salón de eventos', 'Event hall'], d: ['Quinces, bodas y fiestas · hasta 120', 'Quinces, weddings & parties · up to 120'], tile: '#EAE2F8 0 11px,#DCCEF2 11px 22px', hour: 60, day: 350, week: 1400, dep: 150 },
  { n: ['Mesa larga · 8 lugares', 'Long table · 8 seats'], d: ['Mesa de banquete con sillas', 'Banquet table with chairs'], tile: '#F3E2CE 0 11px,#ECD3B4 11px 22px', hour: null, day: 45, week: 180, dep: 40 },
  { n: ['Vajilla de fiesta · 100', 'Party tableware · 100'], d: ['Platos, copas y cubiertos completos', 'Full plates, glasses & cutlery'], tile: '#FBEFD3 0 11px,#F5E1B0 11px 22px', hour: null, day: 120, week: 480, dep: 200 },
  { n: ['Bocina y micrófono', 'Speaker & microphone'], d: ['Sonido profesional para tu evento', 'Pro sound for your event'], tile: '#E3F5EA 0 11px,#D6E7D0 11px 22px', hour: 25, day: 90, week: 360, dep: 80 },
];

export const DETAIL_EVENTS: { d: Bi; day: string; title: Bi; loc: Bi; base: number; desc: Bi }[] = [
  { d: ['JUL', 'JUL'], day: '27', title: ['Noche de Lotería', 'Lotería Night'], loc: ['En el local · 7:00 pm', 'In-store · 7:00 pm'], base: 88, desc: ['Ven a jugar lotería con premios, antojitos y música en vivo. Entrada libre para toda la familia.', 'Come play lotería with prizes, snacks and live music. Free entry for the whole family.'] },
  { d: ['AGO', 'AUG'], day: '13', title: ['Feria del Taco', 'Taco Fair'], loc: ['Terraza · 12:00 pm', 'Patio · 12:00 pm'], base: 220, desc: ['Degustación de tacos, concurso de salsas y música regional toda la tarde.', 'Taco tasting, a salsa contest and regional music all afternoon.'] },
  { d: ['AGO', 'AUG'], day: '30', title: ['Música en vivo', 'Live music'], loc: ['En el local · 8:00 pm', 'In-store · 8:00 pm'], base: 54, desc: ['Noche de banda y cumbia con invitados especiales. Reserva tu mesa.', 'Banda and cumbia night with special guests. Reserve your table.'] },
];

export const STAFF: { name: string; role: Bi }[] = [
  { name: 'Don Beto', role: ['Dueño y cocinero', 'Owner & cook'] },
  { name: 'María G.', role: ['Gerente', 'Manager'] },
  { name: 'Carlos R.', role: ['Taquero', 'Taquero'] },
  { name: 'Ana E.', role: ['Cajera', 'Cashier'] },
];

export const SEED_REVIEWS: { id: string; ini: string; name: string; color: string; stars: number; when: Bi; text: Bi; base: number }[] = [
  { id: 'r1', ini: 'AM', name: 'Ana M.', color: '#2F6FED', stars: 5, when: ['hace 1 semana', '1w'], text: ['Lugar familiar y limpio, precios justos. Volveré pronto.', 'Family-friendly and clean, fair prices. Coming back soon.'], base: 8 },
  { id: 'r2', ini: 'JP', name: 'Jonathan P.', color: '#E8954A', stars: 4, when: ['hace 2 semanas', '2w'], text: ['Buen servicio y muy amables. Súper recomendado.', 'Great service and very kind. Highly recommended.'], base: 3 },
  { id: 'r3', ini: 'RM', name: 'Roberto M.', color: '#7B61FF', stars: 5, when: ['hace 1 mes', '1mo'], text: ['El mejor de la zona, siempre fresco y con buena sazón.', 'Best in the area, always fresh and full of flavor.'], base: 5 },
];

export const UPDATE_POSTS: { tag?: Bi; tagBg?: string; tagC?: string; when: Bi; textEs: (biz: string) => string; textEn: (biz: string) => string; tile: string | null; base: number }[] = [
  { tag: ['Promoción', 'Promo'], tagBg: '#EFEBFF', tagC: '#6D4DF6', when: ['hace 2 días', '2d'], textEs: (b) => `📢 Promoción de la semana en ${b}. ¡Aprovecha y pásate con la familia!`, textEn: (b) => `📢 This week's promo at ${b}. Come by with the family!`, tile: 'repeating-linear-gradient(135deg,#ECE3F8 0 12px,#E2D6F3 12px 24px)', base: 84 },
  { when: ['hace 5 días', '5d'], textEs: () => '¡Gracias a la comunidad por tanto apoyo! 🙌 Seguimos creciendo juntos.', textEn: () => 'Thank you to the community for all the support! 🙌 Growing together.', tile: 'repeating-linear-gradient(135deg,#FCEBD6 0 12px,#F6DEC0 12px 24px)', base: 52 },
  { tag: ['Aviso', 'Notice'], tagBg: '#FCE7EA', tagC: '#D7263D', when: ['hace 1 semana', '1w'], textEs: () => 'Horario especial este feriado — cerramos a las 6pm. ¡Feliz día a toda la comunidad! 🎉', textEn: () => 'Special holiday hours — closing at 6pm. Happy holiday, community! 🎉', tile: null, base: 31 },
];

export const DETAIL_PHOTOS = [
  'repeating-linear-gradient(135deg,#ECE3F8 0 10px,#E2D6F3 10px 20px)',
  'repeating-linear-gradient(135deg,#E4ECFB 0 10px,#D7E3F6 10px 20px)',
  'repeating-linear-gradient(135deg,#FCEBD6 0 10px,#F6DEC0 10px 20px)',
  'repeating-linear-gradient(135deg,#E3F5EA 0 10px,#D6EFDF 10px 20px)',
];

export const WEEK: Bi[] = [
  ['Lunes', 'Monday'],
  ['Martes', 'Tuesday'],
  ['Miércoles', 'Wednesday'],
  ['Jueves', 'Thursday'],
  ['Viernes', 'Friday'],
  ['Sábado', 'Saturday'],
  ['Domingo', 'Sunday'],
];
