// Sample data — verbatim from the Handoff v2 prototype (To'Latino Studio).
// In production this comes from the geo-scoped API (Supabase / PostGIS);
// the shapes below are the contract the UI is built against.

import { tile, type CatKey } from '@/lib/tiles';
import type { WeekHours, HoursException } from '@/lib/hours';

// hours helpers — minutes from midnight; build a week as [Sun..Sat].
const hm = (h: number, m = 0) => h * 60 + m;
/** week(mon-fri, sat, sun) — pass null for a closed day. */
function week(mf: [number, number] | null, sat: [number, number] | null, sun: [number, number] | null): WeekHours {
  const d = (x: [number, number] | null): [number, number][] => (x ? [x] : []);
  return [d(sun), d(mf), d(mf), d(mf), d(mf), d(mf), d(sat)];
}

export const CITIES: [string, string][] = [
  ['Houston', 'TX'],
  ['Dallas', 'TX'],
  ['Austin', 'TX'],
  ['San Antonio', 'TX'],
  ['El Paso', 'TX'],
  ['Fort Worth', 'TX'],
  ['Los Ángeles', 'CA'],
  ['Phoenix', 'AZ'],
  ['Chicago', 'IL'],
  ['Miami', 'FL'],
  ['Nueva York', 'NY'],
  ['Atlanta', 'GA'],
];

export const DEFAULT_CITY = 'Houston, TX';

// ---------- businesses ----------
export type Business = {
  id: number;
  slug: string; // stable key (matches supabase `businesses.slug`) — used for saves
  name: string;
  cat: CatKey;
  subcats?: string[]; // canonical (es) subcategory labels from SUBCATS
  features?: string[]; // canonical (es) feature labels from FEATURES_* (dynamic filter)
  rating: string;
  reviews: number;
  dist: string;
  price: '$' | '$$' | '$$$';
  open: boolean; // fallback when `hours` is absent
  hours?: WeekHours; // real schedule → drives the live open/closed status
  hoursExceptions?: HoursException[]; // date overrides (holidays/vacations)
  verified: boolean;
  endorse: number;
  t: [string, string];
  specEs: string;
  specEn: string;
  amEs: string[];
  amEn: string[];
  revEs: string;
  revEn: string;
  // Owner-entered contact + description (from the dashboard). Present on live
  // businesses; absent on demo fixtures → BizDetail falls back to placeholders.
  phone?: string;
  address?: string;
  city?: string;
  website?: string; // clean host (no protocol) — the listing links to https://<website>
  logoUrl?: string; // uploaded business logo (WebP-compressed) — shown on cards
  cardFeatures?: string[]; // up to 3 features the owner highlights on the search card
  acceptsMessages?: boolean; // owner opted in to being messaged
  messageChannel?: 'sms' | 'whatsapp'; // which channel the Mensaje button opens
  messagePhone?: string; // separate messaging number; falls back to `phone`
  descEs?: string;
  descEn?: string;
  // Owner-enabled surfaces (from the dashboard, `businesses.modules`). Gates which
  // detail tabs appear so a real listing never shows fixtures it never configured.
  // Absent on demo fixtures.
  modules?: Record<string, boolean>;
  // Seller has an active Stripe Connect account → the app offers "Pagar ahora"
  // (online card) instead of pay-on-pickup. Absent/false on demo fixtures.
  acceptsPayments?: boolean;
  // The business's delivery offer (from its own settings; business_by_slug only).
  // radius = max delivery distance in miles; undefined = the owner set no limit.
  // tips = the OWNER's own driver-tip policy (opt-in, 100% to their driver — the
  // platform takes nothing). Absent/`{on:false}` → the cart shows no tip option.
  delivery?: {
    on: boolean; fee: number; min: number; prep: number; radius?: number;
    time?: string; // the owner's delivery-time label from their first zone ("2–5 días", "30–45 min")
    tips?: TipPolicy;
  };
};

// Driver-tip policy each business owner configures. `mode:'percent'` → presets are
// % of the order; `'amount'` → fixed $ presets. `def` = preselected preset value
// (0 = "Sin propina"). `minOrder` = only offer tips at/above this subtotal.
export type TipPolicy = {
  on: boolean;
  mode: 'percent' | 'amount';
  presets: number[];   // up to 3
  def: number;         // preselected value (must be in presets, or 0 for none)
  minOrder: number;
  custom: boolean;     // allow an "Otra" free amount
};

// BUSINESSES ELIMINADO (2026-07-29): contenido fabricado (negocios, posts,
// eventos, notificaciones, comentarios) que viajaba en el paquete de producción y
// podía volver a mostrarse por cualquier respaldo. Regla #8. Los TIPOS se quedan.


export const bizTile = (b: Business) => tile(b.t[0], b.t[1]);

// Full subcategory taxonomy per top-level category (bilingual [es, en]). This is
// the source of truth the Negocios filter renders; aim for exhaustive coverage
// tailored to the US Latino local market.
export const SUBCATS: Record<CatKey, [string, string][]> = {
  AutoServices: [
    ['Taller mecánico', 'Mechanic'], ['Mecánico a domicilio', 'Mobile mechanic'], ['Afinación', 'Tune-up'],
    ['Cambio de aceite', 'Oil change'], ['Frenos', 'Brakes'], ['Transmisiones', 'Transmission'],
    ['Suspensión', 'Suspension'], ['Motor', 'Engine repair'], ['Eléctrico automotriz', 'Auto electrical'],
    ['Aire acondicionado', 'Auto A/C'], ['Diagnóstico', 'Diagnostics'], ['Llantas', 'Tires'],
    ['Alineación y balanceo', 'Alignment & balancing'], ['Rines', 'Rims'], ['Hojalatería y pintura', 'Body shop & paint'],
    ['Vidrios', 'Auto glass'], ['Detallado', 'Auto detailing'], ['Autolavado', 'Car wash'],
    ['Polarizado', 'Window tinting'], ['Audio y alarmas', 'Car audio & alarms'], ['Grúas', 'Towing'],
    ['Cerrajero automotriz', 'Auto locksmith'], ['Motocicletas', 'Motorcycle repair'], ['Camiones', 'Truck repair'],
    ['Diésel', 'Diesel repair'], ['Refacciones', 'Auto parts'], ['Deshuesadero', 'Salvage/junkyard'],
    ['Verificación e inspección', 'Emissions & inspection'], ['Rótulos y vinil', 'Wraps & decals'],
  ],
  BeautyHealth: [
    ['Salón de belleza', 'Beauty salon'], ['Barbería', 'Barber shop'], ['Estilista', 'Hair stylist'],
    ['Corte de cabello', 'Haircut'], ['Tinte y color', 'Hair color'], ['Alaciado / keratina', 'Keratin / straightening'],
    ['Extensiones', 'Hair extensions'], ['Trenzas', 'Braids'], ['Uñas', 'Nails'], ['Manicure y pedicure', 'Mani-pedi'],
    ['Uñas acrílicas', 'Acrylic nails'], ['Pestañas', 'Eyelashes'], ['Cejas', 'Eyebrows'], ['Microblading', 'Microblading'],
    ['Depilación con hilo', 'Threading'], ['Maquillaje', 'Makeup'], ['Maquillaje de novia', 'Bridal makeup'],
    ['Spa', 'Spa'], ['Masajes', 'Massage'], ['Faciales', 'Facials'], ['Depilación', 'Waxing'],
    ['Depilación láser', 'Laser hair removal'], ['Cuidado de la piel', 'Skincare'], ['Medicina estética', 'Med spa / Botox'],
    ['Bronceado', 'Tanning'], ['Tatuajes', 'Tattoo'], ['Perforaciones', 'Piercing'], ['Pelucas', 'Wigs'],
    ['Productos de belleza', 'Beauty supply'], ['Nutrición', 'Nutrition'],
  ],
  FoodDrinks: [
    ['Mexicana', 'Mexican'], ['Taquería', 'Taqueria'], ['Tacos', 'Tacos'], ['Birria', 'Birria'],
    ['Antojitos', 'Mexican street food'], ['Tortas', 'Tortas'], ['Mariscos', 'Seafood'], ['Pupusería', 'Pupusas'],
    ['Salvadoreña', 'Salvadoran'], ['Guatemalteca', 'Guatemalan'], ['Hondureña', 'Honduran'], ['Dominicana', 'Dominican'],
    ['Puertorriqueña', 'Puerto Rican'], ['Cubana', 'Cuban'], ['Colombiana', 'Colombian'], ['Venezolana', 'Venezuelan'],
    ['Peruana', 'Peruvian'], ['Argentina', 'Argentinian'], ['Brasileña', 'Brazilian'], ['Ecuatoriana', 'Ecuadorian'],
    ['Española', 'Spanish'], ['Comida rápida', 'Fast food'], ['Hamburguesas', 'Burgers'], ['Pizza', 'Pizza'],
    ['Pollo asado', 'Rotisserie chicken'], ['Parrilla / asados', 'Grill & BBQ'], ['Buffet', 'Buffet'],
    ['Desayunos', 'Breakfast'], ['Cafetería', 'Café'], ['Café', 'Coffee shop'], ['Panadería', 'Bakery'],
    ['Pastelería', 'Cakes & pastry'], ['Repostería', 'Desserts'], ['Heladería', 'Ice cream'], ['Paletería', 'Paletas'],
    ['Nieves / raspados', 'Shaved ice'], ['Dulcería', 'Candy shop'], ['Jugos y licuados', 'Juices & smoothies'],
    ['Aguas frescas', 'Aguas frescas'], ['Comida saludable', 'Healthy food'], ['Vegetariana / vegana', 'Vegetarian / vegan'],
    ['China', 'Chinese'], ['Asiática', 'Asian'], ['Sushi', 'Sushi'], ['Italiana', 'Italian'],
    ['Food truck', 'Food truck'], ['Cocina económica', 'Home-style meals'], ['Botanas', 'Snacks'],
    ['Comida a domicilio', 'Food delivery'],
  ],
  HomeServices: [
    ['Plomería', 'Plumbing'], ['Destapado de drenajes', 'Drain cleaning'], ['Electricidad', 'Electrical'],
    ['Aire y calefacción', 'HVAC'], ['Refrigeración', 'Refrigeration'], ['Limpieza de casa', 'House cleaning'],
    ['Limpieza profunda', 'Deep cleaning'], ['Limpieza de oficinas', 'Office cleaning'], ['Limpieza de alfombras', 'Carpet cleaning'],
    ['Lavado a presión', 'Pressure washing'], ['Limpieza de ventanas', 'Window cleaning'], ['Jardinería', 'Landscaping'],
    ['Corte de césped', 'Lawn care'], ['Poda de árboles', 'Tree service'], ['Control de plagas', 'Pest control'],
    ['Fumigación', 'Fumigation'], ['Pintura', 'Painting'], ['Construcción', 'Construction'], ['Remodelación', 'Remodeling'],
    ['Albañilería', 'Masonry'], ['Techos', 'Roofing'], ['Pisos', 'Flooring'], ['Azulejos', 'Tile'], ['Drywall', 'Drywall'],
    ['Carpintería', 'Carpentry'], ['Gabinetes y cocinas', 'Cabinets & kitchens'], ['Ventanas', 'Windows'], ['Puertas', 'Doors'],
    ['Cercas', 'Fencing'], ['Concreto', 'Concrete'], ['Herrería', 'Ironwork & welding'], ['Estucado', 'Stucco'],
    ['Cerrajería', 'Locksmith'], ['Reparación de electrodomésticos', 'Appliance repair'], ['Handyman', 'Handyman'],
    ['Mudanzas', 'Moving'], ['Acarreos', 'Junk removal'], ['Paneles solares', 'Solar panels'],
    ['Cámaras y seguridad', 'Cameras & security'], ['Persianas y cortinas', 'Blinds & curtains'], ['Piscinas', 'Pool service'],
    ['Portones automáticos', 'Automatic gates'],
  ],
  NightLife: [
    ['Bar', 'Bar'], ['Cantina', 'Cantina'], ['Bar deportivo', 'Sports bar'], ['Cervecería', 'Brewery'],
    ['Discoteca', 'Nightclub'], ['Antro', 'Club'], ['Salón de baile', 'Dance hall'], ['Karaoke', 'Karaoke'],
    ['Billar', 'Pool hall'], ['Lounge', 'Lounge'], ['Terraza', 'Rooftop'], ['Música en vivo', 'Live music'],
    ['Hookah', 'Hookah lounge'], ['Bar de vinos', 'Wine bar'], ['Mezcalería', 'Mezcal bar'], ['Pulquería', 'Pulqueria'],
  ],
  Grocery: [
    ['Supermercado', 'Supermarket'], ['Tienda latina', 'Latin market'], ['Mercado mexicano', 'Mexican market'],
    ['Carnicería', 'Butcher / meat market'], ['Pollería', 'Poultry shop'], ['Pescadería', 'Fish market'],
    ['Frutería', 'Produce'], ['Tortillería', 'Tortilla shop'], ['Panadería', 'Bakery'], ['Cremería', 'Dairy & cheese'],
    ['Abarrotes', 'Grocery store'], ['Tienda de conveniencia', 'Convenience store'], ['Licorería', 'Liquor store'],
    ['Vinos y licores', 'Wine & spirits'], ['Productos naturales', 'Natural foods'], ['Hierbería', 'Herb shop / botánica'],
    ['Dulcería', 'Candy store'], ['Especias', 'Spices'], ['Productos importados', 'Imported goods'],
    ['Semillas y granos', 'Grains & seeds'], ['Mercado de agricultores', 'Farmers market'],
  ],
  Party: [
    ['Salón de fiestas', 'Event hall'], ['Jardín para eventos', 'Event garden'], ['Salón de quinceañeras', 'Quinceañera hall'],
    ['DJ', 'DJ'], ['Renta de sonido', 'Sound rental'], ['Grupo musical', 'Live band'], ['Mariachi', 'Mariachi'],
    ['Norteño / banda', 'Norteño / banda'], ['Payasos', 'Clowns'], ['Animación', 'Entertainers'], ['Botargas', 'Mascots'],
    ['Brincolines', 'Bounce houses'], ['Renta de inflables', 'Inflatable rental'], ['Renta de sillas y mesas', 'Chair & table rental'],
    ['Renta de carpas', 'Tent rental'], ['Renta de vajilla', 'Tableware rental'], ['Catering', 'Catering'],
    ['Taquiza', 'Taco catering'], ['Banquetes', 'Banquets'], ['Pasteles', 'Cakes'], ['Mesa de dulces', 'Candy table'],
    ['Decoración', 'Decorations'], ['Globos', 'Balloons'], ['Flores', 'Florist'], ['Fotografía', 'Photography'],
    ['Video', 'Videography'], ['Cabina de fotos', 'Photo booth'], ['Invitaciones', 'Invitations'],
    ['Vestidos de quinceañera', 'Quinceañera dresses'], ['Recuerdos', 'Party favors'], ['Meseros', 'Waitstaff'],
    ['Bartender', 'Bartender'], ['Limosinas', 'Limo rental'], ['Wedding planner', 'Wedding planner'],
  ],
  HealthMedicine: [
    ['Clínica', 'Clinic'], ['Médico general', 'General doctor'], ['Urgencias', 'Urgent care'], ['Pediatra', 'Pediatrician'],
    ['Dentista', 'Dentist'], ['Ortodoncista', 'Orthodontist'], ['Farmacia', 'Pharmacy'], ['Óptica', 'Optical / optometry'],
    ['Ginecólogo', 'OB-GYN'], ['Dermatólogo', 'Dermatologist'], ['Cardiólogo', 'Cardiologist'], ['Podólogo', 'Podiatrist'],
    ['Quiropráctico', 'Chiropractor'], ['Fisioterapia', 'Physical therapy'], ['Terapia / consejería', 'Therapy / counseling'],
    ['Psicólogo', 'Psychologist'], ['Salud mental', 'Mental health'], ['Adicciones', 'Addiction & rehab'],
    ['Nutriólogo', 'Nutritionist'], ['Laboratorio', 'Lab & bloodwork'], ['Radiología', 'Imaging & X-ray'],
    ['Vacunas', 'Vaccinations'], ['Medicina alternativa', 'Alternative medicine'], ['Acupuntura', 'Acupuncture'],
    ['Naturista', 'Naturopath / herbalist'], ['Partera / doula', 'Midwife / doula'], ['Enfermería a domicilio', 'Home nursing'],
    ['Cuidado de ancianos', 'Elder care'], ['Ambulancia', 'Ambulance'],
  ],
  ProServices: [
    ['Abogado', 'Lawyer'], ['Abogado de inmigración', 'Immigration lawyer'], ['Abogado de accidentes', 'Accident / injury lawyer'],
    ['Notario', 'Notary'], ['Contador', 'Accountant'], ['Preparación de taxes', 'Tax preparation'],
    ['Bienes raíces', 'Real estate agent'], ['Hipotecas', 'Mortgage'], ['Seguros', 'Insurance'],
    ['Seguro de auto', 'Auto insurance'], ['Seguro médico', 'Health insurance'], ['Envío de dinero', 'Money transfer'],
    ['Cambio de cheques', 'Check cashing'], ['Reparación de crédito', 'Credit repair'], ['Fianzas', 'Bail bonds'],
    ['Traducción', 'Translation'], ['Trámites y documentos', 'Document services'], ['Consultoría', 'Consulting'],
    ['Marketing', 'Marketing'], ['Diseño gráfico', 'Graphic design'], ['Páginas web', 'Web design'],
    ['Publicidad', 'Advertising'], ['Imprenta', 'Printing'], ['Reparación de computadoras', 'Computer repair'],
    ['Reparación de celulares', 'Phone repair'], ['Fotografía profesional', 'Professional photography'],
    ['Agencia de viajes', 'Travel agency'], ['Agencia de empleo', 'Employment agency'], ['Investigador privado', 'Private investigator'],
  ],
  Shops: [
    ['Ropa', 'Clothing'], ['Boutique', 'Boutique'], ['Ropa de mujer', 'Womenswear'], ['Ropa de hombre', 'Menswear'],
    ['Ropa vaquera', 'Western wear'], ['Botas', 'Boots'], ['Zapatería', 'Shoe store'], ['Joyería', 'Jewelry'],
    ['Relojería', 'Watch repair'], ['Vestidos de quinceañera', 'Quinceañera dresses'], ['Vestidos de novia', 'Bridal shop'],
    ['Electrónica', 'Electronics'], ['Celulares', 'Cell phones'], ['Muebles', 'Furniture'], ['Colchones', 'Mattresses'],
    ['Electrodomésticos', 'Appliances'], ['Decoración', 'Home decor'], ['Regalos', 'Gifts'], ['Florería', 'Florist'],
    ['Juguetería', 'Toy store'], ['Librería', 'Bookstore'], ['Papelería', 'Stationery'], ['Mercería', 'Fabric & sewing'],
    ['Artículos deportivos', 'Sporting goods'], ['Tienda de mascotas', 'Pet store'], ['Ferretería', 'Hardware store'],
    ['Herramientas', 'Tools'], ['Segunda mano', 'Thrift & second-hand'], ['Antigüedades', 'Antiques'],
    ['Cosméticos', 'Cosmetics'], ['Perfumería', 'Perfume'], ['Artículos religiosos', 'Religious goods'], ['Piñatas', 'Piñatas'],
  ],
  Transportation: [
    ['Taxi', 'Taxi'], ['Transporte privado', 'Private ride'], ['Chofer', 'Driver service'], ['Aeropuerto', 'Airport transport'],
    ['Mudanzas', 'Moving'], ['Fletes', 'Freight & hauling'], ['Mensajería', 'Courier'], ['Paquetería', 'Package delivery'],
    ['Encomiendas', 'Shipping'], ['Envíos a Latinoamérica', 'Shipping to Latin America'], ['Renta de autos', 'Car rental'],
    ['Renta de camionetas', 'Van & truck rental'], ['Autobuses / charter', 'Bus & charter'], ['Líneas de viaje', 'Bus lines'],
    ['Grúas', 'Towing'], ['Transporte escolar', 'School transport'], ['Transporte médico', 'Medical transport'], ['Limosinas', 'Limousines'],
  ],
  Education: [
    ['Tutoría', 'Tutoring'], ['Clases de inglés (ESL)', 'English classes (ESL)'], ['Clases de español', 'Spanish classes'],
    ['Ciudadanía', 'Citizenship classes'], ['Preparación GED', 'GED prep'], ['Matemáticas', 'Math tutoring'],
    ['Regularización', 'Academic support'], ['Computación', 'Computer classes'], ['Música', 'Music lessons'],
    ['Guitarra', 'Guitar'], ['Piano', 'Piano'], ['Canto', 'Singing'], ['Baile', 'Dance classes'], ['Arte', 'Art classes'],
    ['Escuela de manejo', 'Driving school'], ['Manejo comercial (CDL)', 'CDL truck driving'], ['Cosmetología', 'Cosmetology school'],
    ['Certificaciones y oficios', 'Trade certifications'], ['Licencia de bienes raíces', 'Real estate license'],
    ['Primeros auxilios / CPR', 'First aid / CPR'], ['Cursos en línea', 'Online courses'], ['Idiomas', 'Languages'],
  ],
  Children: [
    ['Guardería', 'Daycare'], ['Preescolar', 'Preschool'], ['Cuidado de niños', 'Childcare'], ['Niñera', 'Nanny / babysitter'],
    ['Pediatría', 'Pediatrics'], ['Terapia infantil', 'Child therapy'], ['Ropa infantil', 'Kids clothing'],
    ['Juguetes', 'Toys'], ['Artículos para bebé', 'Baby goods'], ['Muebles para bebé', 'Baby furniture'],
    ['Fiestas infantiles', 'Kids parties'], ['Renta para fiestas', 'Party rentals'], ['Clases para niños', 'Kids classes'],
    ['Deportes para niños', 'Kids sports'], ['Música para niños', 'Kids music'], ['Baile para niños', 'Kids dance'],
    ['Tutoría infantil', 'Kids tutoring'], ['Campamentos', 'Camps'], ['Fotografía infantil', 'Kids photography'],
    ['Bautizos', 'Baptisms'],
  ],
  Sports: [
    ['Gimnasio', 'Gym'], ['Entrenador personal', 'Personal trainer'], ['CrossFit', 'CrossFit'], ['Yoga', 'Yoga'],
    ['Pilates', 'Pilates'], ['Zumba', 'Zumba'], ['Spinning', 'Spinning'], ['Baile fitness', 'Dance fitness'],
    ['Boxeo', 'Boxing'], ['Artes marciales', 'Martial arts'], ['Karate', 'Karate'], ['Jiu-jitsu', 'BJJ'],
    ['Fútbol', 'Soccer'], ['Ligas de fútbol', 'Soccer leagues'], ['Béisbol', 'Baseball'], ['Básquetbol', 'Basketball'],
    ['Voleibol', 'Volleyball'], ['Natación', 'Swimming'], ['Tenis', 'Tennis'], ['Ciclismo', 'Cycling'],
    ['Correr', 'Running'], ['Senderismo', 'Hiking'], ['Escalada', 'Climbing'], ['Renta de canchas', 'Field rentals'],
    ['Nutrición deportiva', 'Sports nutrition'], ['Fisioterapia deportiva', 'Sports therapy'],
  ],
  Churches: [
    ['Iglesia católica', 'Catholic church'], ['Iglesia cristiana', 'Christian church'], ['Iglesia evangélica', 'Evangelical church'],
    ['Iglesia pentecostal', 'Pentecostal church'], ['Templo', 'Temple'], ['Ministerios', 'Ministries'],
    ['Grupos juveniles', 'Youth groups'], ['Estudio bíblico', 'Bible study'], ['Coro', 'Choir'], ['Retiros', 'Retreats'],
    ['Consejería', 'Counseling'], ['Voluntariado', 'Volunteering'], ['Ayuda social', 'Social aid'], ['Banco de alimentos', 'Food bank'],
    ['Bodas religiosas', 'Religious weddings'], ['Bautizos', 'Baptisms'], ['Primera comunión', 'First communion'],
    ['Quinceañera (misa)', 'Quinceañera mass'], ['Funerales', 'Funeral services'], ['Artículos religiosos', 'Religious goods'],
  ],
  RealEstate: [['Agente independiente', 'Independent agent'], ['Inmobiliaria', 'Real estate agency'], ['Broker', 'Broker'], ['Administración de propiedades', 'Property management'], ['Bienes raíces comercial', 'Commercial real estate'], ['Rentas', 'Rentals']],
  CarDealer: [['Dealer de autos usados', 'Used car dealer'], ['Dealer de autos nuevos', 'New car dealer'], ['Lote de autos', 'Car lot'], ['Aquí pagas aquí', 'Buy here pay here'], ['Vendedor particular', 'Private seller'], ['Motos', 'Motorcycles']],
};

// ---------- business features / attributes (dynamic filter) ----------
// Yelp-style "Características": the filter shown under Negocios changes with the
// picked category. `FEATURES_COMMON` ("Sugeridos") apply to every rubro; each
// entry in `FEATURES_BY_CAT` is that category's own attribute set. A business
// stores the canonical (es) labels it offers in `Business.features`; the filter
// keeps only businesses that offer every selected feature.
export type Feature = [string, string]; // [es, en]

// Universal quick toggles — relevant to essentially any local business, and
// especially meaningful for this audience (Spanish spoken, delivery, cards).
export const FEATURES_COMMON: Feature[] = [
  ['Se habla español', 'Spanish spoken'],
  ['A domicilio', 'Delivery'],
  ['Para llevar', 'Takeout / pickup'],
  ['Acepta tarjeta', 'Accepts cards'],
  ['Estacionamiento', 'Parking'],
  ['Wifi gratis', 'Free Wi-Fi'],
];

// Category-specific attributes (the dynamic half). Curated per rubro for the US
// Latino local market; the first ~8 show by default, the rest behind "Ver todas".
export const FEATURES_BY_CAT: Record<CatKey, Feature[]> = {
  AutoServices: [
    ['Servicio a domicilio', 'Mobile service'], ['Diagnóstico gratis', 'Free diagnostics'], ['Presupuesto gratis', 'Free estimates'],
    ['Garantía', 'Warranty'], ['Grúa', 'Towing'], ['Servicio express', 'Express service'], ['Planes de pago', 'Payment plans'],
    ['Abierto fines de semana', 'Open weekends'], ['Refacciones incluidas', 'Parts included'], ['Certificado ASE', 'ASE certified'],
  ],
  BeautyHealth: [
    ['Con cita', 'By appointment'], ['Sin cita', 'Walk-ins welcome'], ['A domicilio', 'Home service'], ['Unisex', 'Unisex'],
    ['Solo mujeres', 'Women only'], ['Novias', 'Bridal'], ['Apto para niños', 'Kid friendly'], ['Productos veganos', 'Vegan products'],
    ['Abierto tarde', 'Open late'],
  ],
  FoodDrinks: [
    ['Reservaciones', 'Reservations'], ['Comedor', 'Dine-in'], ['Para llevar', 'Takeout'], ['A domicilio', 'Delivery'],
    ['Servicio en auto', 'Drive-thru'], ['Terraza / al aire libre', 'Outdoor seating'], ['Desayuno', 'Breakfast'], ['Alcohol', 'Serves alcohol'],
    ['Música en vivo', 'Live music'], ['Apto para niños', 'Kid friendly'], ['Opciones veganas', 'Vegan options'], ['Catering', 'Catering'],
  ],
  HomeServices: [
    ['Presupuesto gratis', 'Free estimates'], ['Servicio de emergencia', 'Emergency service'], ['Disponible 24/7', '24/7 available'],
    ['Con licencia', 'Licensed'], ['Asegurado', 'Insured'], ['Garantía', 'Warranty'], ['Planes de pago', 'Payment plans'],
    ['Abierto fines de semana', 'Open weekends'],
  ],
  NightLife: [
    ['Barra completa', 'Full bar'], ['Happy hour', 'Happy hour'], ['Música en vivo', 'Live music'], ['DJ', 'DJ'],
    ['Pista de baile', 'Dance floor'], ['Karaoke', 'Karaoke'], ['Terraza', 'Rooftop / patio'], ['Área VIP', 'VIP area'],
    ['Hookah', 'Hookah'], ['Buena para grupos', 'Good for groups'], ['+21', '21+'],
  ],
  Grocery: [
    ['Carnicería', 'Butcher counter'], ['Tortillería', 'Fresh tortillas'], ['Panadería', 'Bakery'], ['Productos importados', 'Imported goods'],
    ['Envío de dinero', 'Money transfer'], ['Acepta WIC/EBT', 'Accepts WIC/EBT'], ['Abierto tarde', 'Open late'], ['A domicilio', 'Delivery'],
  ],
  Party: [
    ['Paquetes', 'Packages'], ['Renta de equipo', 'Equipment rental'], ['Montaje incluido', 'Setup included'], ['A domicilio', 'Delivery'],
    ['Personalizado', 'Custom'], ['Bilingüe', 'Bilingual'], ['Disponible fines de semana', 'Weekend availability'], ['Fotos y video', 'Photo & video'],
  ],
  HealthMedicine: [
    ['Sin seguro OK', 'No insurance OK'], ['Acepta seguro', 'Accepts insurance'], ['Mismo día', 'Same-day'], ['Planes de pago', 'Payment plans'],
    ['Telemedicina', 'Telemedicine'], ['A domicilio', 'Home visits'], ['Personal bilingüe', 'Bilingual staff'], ['Abierto fines de semana', 'Open weekends'],
  ],
  ProServices: [
    ['Consulta gratis', 'Free consultation'], ['Planes de pago', 'Payment plans'], ['A domicilio', 'Mobile / home visits'], ['En línea', 'Online service'],
    ['Bilingüe', 'Bilingual'], ['Sin cita', 'Walk-ins welcome'], ['Mismo día', 'Same-day service'], ['Abierto fines de semana', 'Open weekends'],
  ],
  Shops: [
    ['Recoge en tienda', 'In-store pickup'], ['A domicilio', 'Delivery'], ['Apartado', 'Layaway'], ['Planes de pago', 'Payment plans'],
    ['Compra en línea', 'Shop online'], ['Devoluciones', 'Returns'], ['Productos importados', 'Imported goods'], ['Estacionamiento', 'Parking'],
  ],
  Transportation: [
    ['Servicio 24/7', '24/7 service'], ['Al aeropuerto', 'Airport service'], ['A domicilio', 'Door-to-door'], ['Presupuesto gratis', 'Free quotes'],
    ['Envíos a Latinoamérica', 'Ships to Latin America'], ['Asegurado', 'Insured'], ['Reservación', 'Reservations'], ['Bilingüe', 'Bilingual'],
  ],
  Education: [
    ['En línea', 'Online'], ['Presencial', 'In-person'], ['A domicilio', 'At-home tutoring'], ['Clases en español', 'Classes in Spanish'],
    ['Certificado', 'Certificate'], ['Horario flexible', 'Flexible schedule'], ['Clase de prueba gratis', 'Free trial class'], ['Para adultos', 'For adults'],
  ],
  Children: [
    ['Con licencia', 'Licensed'], ['Personal bilingüe', 'Bilingual staff'], ['Horario extendido', 'Extended hours'], ['Comidas incluidas', 'Meals included'],
    ['Acepta subsidio', 'Accepts subsidy'], ['Cámaras de seguridad', 'Security cameras'], ['Área de juegos', 'Play area'], ['Recién nacidos', 'Infants welcome'],
  ],
  Sports: [
    ['Clase de prueba gratis', 'Free trial'], ['Entrenador personal', 'Personal trainer'], ['Clases en grupo', 'Group classes'], ['Abierto 24 horas', 'Open 24 hours'],
    ['Regaderas', 'Showers'], ['Para niños', 'Kids welcome'], ['Sin contrato', 'No contract'], ['Clases en español', 'Classes in Spanish'],
  ],
  Churches: [
    ['Servicios en español', 'Services in Spanish'], ['Servicios en inglés', 'Services in English'], ['Grupos juveniles', 'Youth groups'], ['Estudio bíblico', 'Bible study'],
    ['Guardería', 'Childcare'], ['Ayuda social', 'Social aid'], ['Banco de alimentos', 'Food bank'], ['Música en vivo', 'Live music'],
  ],
  RealEstate: [
    ['Atención bilingüe', 'Bilingual service'], ['Agentes con licencia', 'Licensed agents'], ['Sin verificación de crédito', 'No credit check options'], ['Acepta aval', 'Co-signer accepted'],
    ['Tours virtuales', 'Virtual tours'], ['Financiamiento', 'Financing help'], ['Primera consulta gratis', 'Free first consultation'], ['Administración de rentas', 'Rental management'],
  ],
  CarDealer: [
    ['Aquí pagas aquí', 'Buy here pay here'], ['Sin verificación de crédito', 'No credit check'], ['Acepta ITIN', 'ITIN accepted'], ['Financiamiento', 'Financing'],
    ['Acepta trade-in', 'Trade-in accepted'], ['Historial limpio', 'Clean history'], ['Garantía', 'Warranty'], ['Atención bilingüe', 'Bilingual service'],
  ],
};

// ---------- community posts ----------
export type PostType = 'ask' | 'rec' | 'local' | 'sale' | 'poll';

export type Post = {
  id: string;
  type: PostType;
  initials: string;
  color: string;
  name: string;
  authorId?: string; // auth user id — drives owner-only edit/delete
  hoodEs: string;
  city?: string; // full city label ("Houston, TX") — shown as "Barrio, Ciudad"
  timeEs: string;
  timeEn: string;
  recommends: number;
  business?: string;
  /** Slug del negocio etiquetado — lo resuelve el servidor (migración 0135) y es
   *  lo que convierte la etiqueta en un enlace a la ficha. */
  businessSlug?: string;
  bizRating?: string;
  poll?: string[];
  pollBase?: number[];
  images?: string[];
  es: string;
  en: string;
};

// POSTS ELIMINADO (2026-07-29): contenido fabricado (negocios, posts,
// eventos, notificaciones, comentarios) que viajaba en el paquete de producción y
// podía volver a mostrarse por cualquier respaldo. Regla #8. Los TIPOS se quedan.


export type Comment = {
  id: string;
  initials: string;
  color: string;
  name: string;
  /** Autor — para pintar su foto de perfil (ver `lib/avatars`). */
  authorId?: string;
  hoodEs?: string;
  timeEs: string;
  timeEn: string;
  likes: number;
  biz?: { name: string; slug?: string; rating?: string };
  es: string;
  en: string;
};

// SEED_COMMENTS ELIMINADO (2026-07-29): contenido fabricado (negocios, posts,
// eventos, notificaciones, comentarios) que viajaba en el paquete de producción y
// podía volver a mostrarse por cualquier respaldo. Regla #8. Los TIPOS se quedan.


// SEED_REPLIES ELIMINADO (2026-07-29): contenido fabricado (negocios, posts,
// eventos, notificaciones, comentarios) que viajaba en el paquete de producción y
// podía volver a mostrarse por cualquier respaldo. Regla #8. Los TIPOS se quedan.


// Neighborhoods per city (keyed by the city's short name — the part before the
// comma, e.g. "Houston", "The Bronx"). Drives both the Comunidad barrios rail
// and the neighborhood picker when creating a post. The seeded names here match
// the hoods used in supabase/seed*.sql so the filter lines up with real data.
// Cities not listed fall back to whatever hoods appear in their live posts, and
// the composer offers a free-text field — so it works for any of the 6,978
// gazetteer cities without hardcoding them all.
export const HOODS_BY_CITY: Record<string, string[]> = {
  Houston: ['Bellaire', 'Gulfton', 'Spring Branch', 'East End', 'Katy', 'Alief', 'Sharpstown', 'Pasadena'],
  Hazleton: ['Downtown', 'Alter St', 'West Hazleton', 'Hazle Township', 'Heights', 'Diamond'],
  Boston: ['East Boston', 'Jamaica Plain', 'Chelsea', 'Roxbury', 'Dorchester', 'Revere', 'Everett'],
  'The Bronx': ['Concourse', 'Fordham', 'Mott Haven', 'Soundview', 'University Heights', 'Kingsbridge'],
};

/** Curated neighborhoods for a city (empty if we don't have a list for it). */
export function hoodsForCity(cityShort: string): string[] {
  return HOODS_BY_CITY[cityShort] ?? [];
}

// TRENDING ELIMINADO (2026-07-29): contenido fabricado (negocios, posts,
// eventos, notificaciones, comentarios) que viajaba en el paquete de producción y
// podía volver a mostrarse por cualquier respaldo. Regla #8. Los TIPOS se quedan.


// NEIGHBORS ELIMINADO (2026-07-29): contenido fabricado (negocios, posts,
// eventos, notificaciones, comentarios) que viajaba en el paquete de producción y
// podía volver a mostrarse por cualquier respaldo. Regla #8. Los TIPOS se quedan.


// TAG_BIZ_NAMES ELIMINADO (2026-07-29): contenido fabricado (negocios, posts,
// eventos, notificaciones, comentarios) que viajaba en el paquete de producción y
// podía volver a mostrarse por cualquier respaldo. Regla #8. Los TIPOS se quedan.


// ---------- events ----------
// Professional event category taxonomy (Eventbrite-grade). Stable ids drive the DB
// `events.cat` (migration 0062) + the striped-tile placeholder; both the consumer
// filters and the create wizard read this single source.
export const EVENT_CATS: { id: string; es: string; en: string; tile: [string, string] }[] = [
  { id: 'musica', es: 'Música', en: 'Music', tile: ['#E5DEF9', '#D9CEF3'] },
  { id: 'nightlife', es: 'Vida nocturna', en: 'Nightlife', tile: ['#E8E4FB', '#DCD6F6'] },
  { id: 'comida', es: 'Comida y bebida', en: 'Food & drink', tile: ['#FCEBD6', '#F6DCBF'] },
  { id: 'familia', es: 'Familia y niños', en: 'Family & kids', tile: ['#FBE9F0', '#F5D8E6'] },
  { id: 'comunidad', es: 'Comunidad', en: 'Community', tile: ['#E3F5EA', '#D6E7D0'] },
  { id: 'arte', es: 'Arte y cultura', en: 'Arts & culture', tile: ['#F3E2CE', '#ECD3B4'] },
  { id: 'deportes', es: 'Deportes', en: 'Sports & fitness', tile: ['#E7EEFB', '#DAE5F6'] },
  { id: 'negocios', es: 'Negocios', en: 'Business', tile: ['#ECE3F8', '#E2D6F3'] },
  { id: 'salud', es: 'Salud y bienestar', en: 'Health & wellness', tile: ['#D6F3EF', '#C3E9E3'] },
  { id: 'mercado', es: 'Mercado y bazar', en: 'Market & bazaar', tile: ['#FCF1C7', '#F6E8AE'] },
  { id: 'fe', es: 'Religión y fe', en: 'Faith', tile: ['#EFEBFF', '#E5DEF9'] },
  { id: 'taller', es: 'Talleres y clases', en: 'Workshops & classes', tile: ['#F3D9E2', '#E8BFCD'] },
  { id: 'otro', es: 'Otro', en: 'Other', tile: ['#EAE2F8', '#DCCEF2'] },
];
export const EVENT_CAT_BY_ID: Record<string, { es: string; en: string; tile: [string, string] }> =
  Object.fromEntries(EVENT_CATS.map((c) => [c.id, { es: c.es, en: c.en, tile: c.tile }]));

export type EventItem = {
  id: number;
  slug?: string; // supabase events.slug — present on live events; drives tickets/RSVP
  iso?: string;  // supabase events.starts_at — the real date, keys date chips without year collapse
  cover?: string; // supabase events.cover_url — real cover photo for the list card (else gradient)
  dEs: string;
  day: string;
  cat: string; // one of EVENT_CATS ids
  tEs: string;
  tEn: string;
  lEs: string;
  lEn: string;
  going: number;
  free: boolean;
  price?: string;
  t: [string, string];
  timeEs: string;
  timeEn: string;
  descEs: string;
  descEn: string;
};

// EVENTS ELIMINADO (2026-07-29): contenido fabricado (negocios, posts,
// eventos, notificaciones, comentarios) que viajaba en el paquete de producción y
// podía volver a mostrarse por cualquier respaldo. Regla #8. Los TIPOS se quedan.


export const eventTile = (e: EventItem) => tile(e.t[0], e.t[1]);

// ---------- notifications ----------
export type Notif = {
  id: string;
  g: 'hoy' | 'semana' | 'antes';
  ic: 'heart' | 'message' | 'calendar' | 'store' | 'user' | 'tag';
  color: string;
  bg: string;
  unread: boolean;
  titleEs: string;
  titleEn: string;
  subEs: string;
  subEn: string;
  timeEs: string;
  timeEn: string;
  view: 'comunidad' | 'negocios' | 'eventos';
};

// NOTIFS ELIMINADO (2026-07-29): contenido fabricado (negocios, posts,
// eventos, notificaciones, comentarios) que viajaba en el paquete de producción y
// podía volver a mostrarse por cualquier respaldo. Regla #8. Los TIPOS se quedan.


// ---------- coming soon ----------
export const SOON: Record<string, { icon: 'truck' | 'home' | 'car' | 'briefcase'; bg: string; color: string; titleEs: string; titleEn: string; subEs: string; subEn: string }> = {
  transporte: { icon: 'truck', bg: '#FBE9F0', color: '#E0568F', titleEs: 'Transporte', titleEn: 'Transport', subEs: 'Mudanzas, viajes al aeropuerto, encomiendas a Latinoamérica y fletes — de gente de confianza de tu comunidad.', subEn: 'Moving, airport rides, parcels to Latin America and hauling — from trusted people in your community.' },
  inmuebles: { icon: 'home', bg: '#E3F5EA', color: '#1F9D57', titleEs: 'Bienes Raíces', titleEn: 'Real Estate', subEs: 'Renta y venta de casas, apartamentos, cuartos y locales comerciales publicados por dueños y agentes latinos.', subEn: 'Homes, apartments, rooms and commercial spaces for rent and sale, posted by Latino owners and agents.' },
  autos: { icon: 'car', bg: '#EFEBFF', color: '#7B61FF', titleEs: 'Dealer de carros', titleEn: 'Car Dealers', subEs: 'Autos de dealers y dueños latinos de confianza, con financiamiento y sin complicaciones de idioma.', subEn: 'Cars from trusted Latino dealers and owners, with financing and no language barrier.' },
  trabajos: { icon: 'briefcase', bg: '#FCF1C7', color: '#D6A22A', titleEs: 'Trabajos', titleEn: 'Jobs', subEs: 'Vacantes en negocios latinos cerca de ti — tiempo completo, medio tiempo y bilingües.', subEn: 'Openings at Latino businesses near you — full-time, part-time and bilingual.' },
};

// ---------- client categories (7-category bar) ----------
export type ViewKey = 'comunidad' | 'negocios' | 'eventos' | 'transporte' | 'inmuebles' | 'autos' | 'trabajos';

export const NAV_CATS: { k: ViewKey; icon: 'users' | 'store' | 'calendar' | 'truck' | 'home' | 'car' | 'briefcase'; es: string; en: string; soon: boolean }[] = [
  { k: 'comunidad', icon: 'users', es: 'Comunidad', en: 'Community', soon: false },
  { k: 'negocios', icon: 'store', es: 'Negocios', en: 'Business', soon: false },
  { k: 'eventos', icon: 'calendar', es: 'Eventos', en: 'Events', soon: false },
  { k: 'transporte', icon: 'truck', es: 'Transporte', en: 'Transport', soon: true },
  { k: 'inmuebles', icon: 'home', es: 'Bienes Raíces', en: 'Real Estate', soon: false },
  { k: 'autos', icon: 'car', es: 'Dealer de carros', en: 'Car Dealers', soon: false },
  { k: 'trabajos', icon: 'briefcase', es: 'Trabajos', en: 'Jobs', soon: true },
];

export const VIEW_PATH: Record<ViewKey, string> = {
  comunidad: '/comunidad',
  negocios: '/negocios',
  eventos: '/eventos',
  transporte: '/transporte',
  inmuebles: '/bienes-raices',
  autos: '/autos',
  trabajos: '/trabajos',
};
