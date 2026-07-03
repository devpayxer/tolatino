// Sample data — verbatim from the Handoff v2 prototype (To'Latino Studio).
// In production this comes from the geo-scoped API (Supabase / PostGIS);
// the shapes below are the contract the UI is built against.

import { tile, type CatKey } from '@/lib/tiles';
import type { WeekHours } from '@/lib/hours';

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
  verified: boolean;
  endorse: number;
  t: [string, string];
  specEs: string;
  specEn: string;
  amEs: string[];
  amEn: string[];
  revEs: string;
  revEn: string;
};

export const BUSINESSES: Business[] = [
  { id: 0, slug: 'taqueria-la-esperanza', name: 'Taquería La Esperanza', cat: 'FoodDrinks', subcats: ['Taquería', 'Tacos', 'Mexicana'], features: ['A domicilio', 'Para llevar', 'Comedor', 'Apto para niños', 'Se habla español'], rating: '4.9', reviews: 320, dist: '0.8 mi', price: '$$', open: true, hours: week([hm(9), hm(22)], [hm(9), hm(23)], [hm(10), hm(20)]), verified: true, endorse: 47, t: ['#ECE3F8', '#E3D7F4'], specEs: 'Especialidad · Tacos al pastor', specEn: 'Specialty · Tacos al pastor', amEs: ['A domicilio', 'Español', 'Estacionamiento'], amEn: ['Delivery', 'Spanish', 'Parking'], revEs: '“El mejor pastor de Houston, sin exagerar.” — Carlos R.', revEn: '“Best pastor in Houston, no joke.” — Carlos R.' },
  { id: 1, slug: 'don-beto-mecanica', name: 'Don Beto Mecánica', cat: 'AutoServices', subcats: ['Taller mecánico', 'Afinación', 'Frenos'], features: ['Presupuesto gratis', 'Garantía', 'Servicio a domicilio', 'Se habla español'], rating: '4.7', reviews: 128, dist: '2.6 mi', price: '$', open: true, hours: week([hm(8), hm(18)], [hm(8), hm(14)], null), verified: true, endorse: 23, t: ['#E7EEFB', '#DAE5F6'], specEs: 'Especialidad · Frenos y suspensión', specEn: 'Specialty · Brakes & suspension', amEs: ['Presupuesto gratis', 'Español', 'Garantía'], amEn: ['Free quote', 'Spanish', 'Warranty'], revEs: '“Honrado y rápido, no te roba.” — María G.', revEn: '“Honest and fast, won’t rip you off.” — María G.' },
  { id: 2, slug: 'dulces-encanto', name: 'Dulces Encanto', cat: 'FoodDrinks', subcats: ['Dulcería', 'Repostería', 'Pastelería'], features: ['Para llevar', 'A domicilio', 'Catering', 'Se habla español'], rating: '5.0', reviews: 96, dist: '1.2 mi', price: '$$', open: true, hours: week([hm(9), hm(20)], [hm(9), hm(20)], [hm(10), hm(18)]), verified: true, endorse: 31, t: ['#FBE9F0', '#F6DCE8'], specEs: 'Especialidad · Pasteles temáticos', specEn: 'Specialty · Theme cakes', amEs: ['Por encargo', 'Español', 'Entregas'], amEn: ['Custom orders', 'Spanish', 'Delivery'], revEs: '“El pastel de Encanto quedó precioso.” — Jonathan P.', revEn: '“The Encanto cake came out gorgeous.” — Jonathan P.' },
  { id: 3, slug: 'salon-bella-vida', name: 'Salón Bella Vida', cat: 'BeautyHealth', subcats: ['Salón de belleza', 'Uñas', 'Corte de cabello'], features: ['Con cita', 'Sin cita', 'Unisex', 'Se habla español'], rating: '4.8', reviews: 154, dist: '1.5 mi', price: '$$', open: true, hours: week([hm(9), hm(19)], [hm(9), hm(18)], null), verified: true, endorse: 19, t: ['#FBE9F0', '#F5D8E6'], specEs: 'Especialidad · Color y tratamientos', specEn: 'Specialty · Color & treatments', amEs: ['Con cita', 'Español', 'Sin espera'], amEn: ['Appointments', 'Spanish', 'No wait'], revEs: '“Salgo feliz cada vez, súper amables.” — Sofía L.', revEn: '“I leave happy every time, so kind.” — Sofía L.' },
  { id: 4, slug: 'clinica-familiar-sana', name: 'Clínica Familiar Sana', cat: 'HealthMedicine', subcats: ['Clínica', 'Médico general', 'Pediatra'], features: ['Sin seguro OK', 'Mismo día', 'Personal bilingüe'], rating: '4.6', reviews: 78, dist: '3.1 mi', price: '$$', open: false, hours: week([hm(8), hm(17)], null, null), verified: true, endorse: 14, t: ['#E3F5EA', '#D6EFDF'], specEs: 'Especialidad · Medicina familiar', specEn: 'Specialty · Family medicine', amEs: ['Sin seguro OK', 'Español', 'Mismo día'], amEn: ['No insurance OK', 'Spanish', 'Same day'], revEs: '“Me atendieron sin seguro, muy humanos.” — Ana E.', revEn: '“Seen without insurance, very caring.” — Ana E.' },
  { id: 5, slug: 'abogada-ramirez', name: 'Abogada Ramírez', cat: 'ProServices', subcats: ['Abogado', 'Abogado de inmigración', 'Notario'], features: ['Consulta gratis', 'Planes de pago', 'Bilingüe'], rating: '4.9', reviews: 42, dist: '4.0 mi', price: '$$$', open: true, hours: week([hm(9), hm(17)], [hm(10), hm(14)], null), verified: true, endorse: 12, t: ['#E8E4FB', '#DCD6F6'], specEs: 'Especialidad · Inmigración', specEn: 'Specialty · Immigration', amEs: ['Consulta gratis', 'Español', 'Planes de pago'], amEn: ['Free consult', 'Spanish', 'Payment plans'], revEs: '“Nos guió en todo el proceso con paciencia.” — Roberto M.', revEn: '“Guided us through it all patiently.” — Roberto M.' },
  { id: 6, slug: 'lavado-express-sol', name: 'Lavado Express Sol', cat: 'AutoServices', subcats: ['Autolavado', 'Detallado', 'Polarizado'], features: ['Servicio express', 'Estacionamiento'], rating: '4.5', reviews: 64, dist: '2.0 mi', price: '$', open: true, hours: week([hm(8), hm(19)], [hm(8), hm(19)], [hm(8), hm(19)]), verified: false, endorse: 0, t: ['#E5EFFB', '#D7E5F6'], specEs: 'Especialidad · Detallado completo', specEn: 'Specialty · Full detail', amEs: ['Sin cita', 'Rápido'], amEn: ['Walk-in', 'Fast'], revEs: '', revEn: '' },
  { id: 7, slug: 'ferreteria-el-tornillo', name: 'Ferretería El Tornillo', cat: 'HomeServices', subcats: ['Handyman', 'Construcción'], features: ['Presupuesto gratis', 'Se habla español', 'Estacionamiento'], rating: '4.4', reviews: 53, dist: '1.9 mi', price: '$', open: true, hours: week([hm(7), hm(19)], [hm(7), hm(19)], [hm(9), hm(15)]), verified: false, endorse: 0, t: ['#FCF1C7', '#F6E8AE'], specEs: 'Especialidad · Herramienta y plomería', specEn: 'Specialty · Tools & plumbing', amEs: ['Español', 'Cerca'], amEn: ['Spanish', 'Nearby'], revEs: '', revEn: '' },
];

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
  bizRating?: string;
  poll?: string[];
  pollBase?: number[];
  images?: string[];
  es: string;
  en: string;
};

export const POSTS: Post[] = [
  { id: 'p0', type: 'rec', initials: 'CR', color: '#1F9D57', name: 'Carlos R.', hoodEs: 'Bellaire', timeEs: 'hace 4 h', timeEn: '4h', recommends: 47, business: 'Taquería La Esperanza', bizRating: '4.9', es: 'El mejor al pastor de todo Houston, se los juro por mi abuela. Díganle a Don Beto que van de parte de Carlos. 🌮', en: 'Best al pastor in all of Houston, I swear on my abuela. Tell Don Beto that Carlos sent you. 🌮' },
  { id: 'p1', type: 'poll', initials: 'AE', color: '#0E9384', name: 'Ana E.', hoodEs: 'Bellaire', timeEs: 'hace 5 h', timeEn: '5h', recommends: 6, poll: ['Taquería La Esperanza', 'El Rey del Taco', 'Doña Mary'], pollBase: [24, 18, 9], es: '¿Cuál es la mejor taquería del barrio? 🌮 ¡Voten!', en: 'Which is the best taquería in the hood? 🌮 Vote!' },
  { id: 'p2', type: 'ask', initials: 'MG', color: '#7B61FF', name: 'María G.', hoodEs: 'Spring Branch', timeEs: 'hace 2 h', timeEn: '2h', recommends: 12, es: '¿Alguien conoce un buen mecánico que no me robe? 😅 Mi Honda lleva días haciendo un ruido rarísimo.', en: "Anyone know a good mechanic who won't rob me? 😅 My Honda's been making a weird noise for days." },
  { id: 'p3', type: 'local', initials: 'DL', color: '#2F6FED', name: 'Doña Lucía', hoodEs: 'Gulfton', timeEs: 'hace 6 h', timeEn: '6h', recommends: 31, es: 'Mañana hay pulga en el parque de la 59. Lleven efectivo y sombrero, que va a estar el solazo ☀️', en: "Flea market tomorrow at the park off 59. Bring cash and a hat — it's gonna be scorching ☀️" },
  { id: 'p4', type: 'ask', initials: 'JP', color: '#E8A23D', name: 'Jonathan P.', hoodEs: 'Katy', timeEs: 'hace 8 h', timeEn: '8h', recommends: 9, es: 'Busco quién haga pasteles para el cumple de mi hija, tema de Encanto. ¡Recomiéndenme porfa! 🎂', en: "Looking for someone who makes cakes for my daughter's bday, Encanto theme. Recs please! 🎂" },
];

export type Comment = {
  id: string;
  initials: string;
  color: string;
  name: string;
  hoodEs?: string;
  timeEs: string;
  timeEn: string;
  likes: number;
  biz?: { name: string; rating: string };
  es: string;
  en: string;
};

export const SEED_COMMENTS: Record<string, Comment[]> = {
  p0: [
    { id: 'p0c1', initials: 'ME', color: '#E8954A', name: 'Melissa E.', hoodEs: 'Bellaire', timeEs: 'hace 3 h', timeEn: '3h', likes: 6, es: '¡Totalmente de acuerdo! Los de birria también están de otro nivel. 🔥', en: 'Totally agree! The birria ones are next level too. 🔥' },
    { id: 'p0c2', initials: 'JR', color: '#7B61FF', name: 'Jorge R.', hoodEs: 'Gulfton', timeEs: 'hace 2 h', timeEn: '2h', likes: 2, es: 'Voy este finde, gracias por el dato Carlos.', en: 'Going this weekend, thanks for the tip Carlos.' },
  ],
  p1: [
    { id: 'p1c1', initials: 'DB', color: '#1F9D57', name: 'Don Beto', hoodEs: 'Spring Branch', timeEs: 'hace 1 h', timeEn: '1h', likes: 9, biz: { name: 'Taller Don Beto', rating: '4.8' }, es: 'Yo te lo reviso sin compromiso, María. Pásate por el taller cuando gustes. 🔧', en: 'I can check it out no charge, María. Come by the shop anytime. 🔧' },
  ],
  p2: [
    { id: 'p2c1', initials: 'RM', color: '#7B61FF', name: 'Roberto M.', hoodEs: 'Gulfton', timeEs: 'hace 4 h', timeEn: '4h', likes: 3, es: '¡Ahí estaré! ¿A qué hora empieza?', en: "I'll be there! What time does it start?" },
  ],
  p3: [],
};

export const SEED_REPLIES: Record<string, Comment[]> = {
  p0c1: [
    { id: 'p0c1r1', initials: 'CR', color: '#1F9D57', name: 'Carlos R.', timeEs: 'hace 2 h', timeEn: '2h', likes: 1, es: '¡Gracias Melissa! La birria de los domingos es sagrada. 🙏', en: 'Thanks Melissa! Sunday birria is sacred. 🙏' },
  ],
};

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

export const TRENDING = [
  { tag: '#MejorMecánico', posts: 84 },
  { tag: '#TaqueríasHTX', posts: 156 },
  { tag: '#PulgaDel59', posts: 42 },
  { tag: '#EncantoCakes', posts: 27 },
];

export const NEIGHBORS = [
  { initials: 'AE', color: '#E8954A', name: 'Ana E.', hood: 'Bellaire' },
  { initials: 'RM', color: '#7B61FF', name: 'Roberto M.', hood: 'Spring Branch' },
  { initials: 'SL', color: '#1F9D57', name: 'Sofía L.', hood: 'Gulfton' },
];

export const TAG_BIZ_NAMES = ['Taquería La Esperanza', 'Salón Glamour', 'Taller Don Beto', 'Panadería Dulce Hogar'];

// ---------- events ----------
export type EventItem = {
  id: number;
  dEs: string;
  day: string;
  cat: 'musica' | 'mercado' | 'familia' | 'comida';
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

export const EVENTS: EventItem[] = [
  { id: 0, dEs: 'JUL', day: '05', cat: 'musica', tEs: 'Sábados de Reggaetón', tEn: 'Reggaetón Saturdays', lEs: 'Club Tropikal · Bellaire', lEn: 'Club Tropikal · Bellaire', going: 512, free: false, price: '$15', t: ['#E5DEF9', '#D9CEF3'], timeEs: 'Sáb · 10:00 pm', timeEn: 'Sat · 10:00 pm', descEs: 'La mejor noche de reggaetón y perreo con DJ en vivo. Barra completa y zona VIP. +21.', descEn: 'The best reggaetón night with a live DJ. Full bar and VIP area. 21+.' },
  { id: 1, dEs: 'JUL', day: '21', cat: 'mercado', tEs: 'Pulga del Parque 59', tEn: 'Park 59 Flea Market', lEs: 'Parque de la 59 · Gulfton', lEn: 'Park off 59 · Gulfton', going: 240, free: true, t: ['#FCF1C7', '#F6E8AE'], timeEs: 'Dom · 8:00 am', timeEn: 'Sun · 8:00 am', descEs: 'Encuentra de todo: ropa, antojitos, plantas y tesoros usados. Trae efectivo y sombrero.', descEn: 'Find everything: clothes, snacks, plants and used treasures. Bring cash and a hat.' },
  { id: 2, dEs: 'JUL', day: '27', cat: 'musica', tEs: 'Noche de Lotería', tEn: 'Lotería Night', lEs: 'Salón Jalisco · Bellaire', lEn: 'Salón Jalisco · Bellaire', going: 88, free: false, price: '$10', t: ['#EFEBFF', '#E5DEF9'], timeEs: 'Sáb · 7:00 pm', timeEn: 'Sat · 7:00 pm', descEs: 'Lotería con premios en efectivo, cena y música. Ambiente familiar.', descEn: 'Lotería with cash prizes, dinner and music. Family-friendly.' },
  { id: 3, dEs: 'AGO', day: '05', cat: 'familia', tEs: 'Taller de Piñatas', tEn: 'Piñata Workshop', lEs: 'Centro Comunitario · Alief', lEn: 'Community Center · Alief', going: 64, free: false, price: '$15', t: ['#FBE9F0', '#F5D8E6'], timeEs: 'Sáb · 11:00 am', timeEn: 'Sat · 11:00 am', descEs: 'Aprende a hacer piñatas tradicionales. Materiales incluidos. Para toda la familia.', descEn: 'Learn to make traditional piñatas. Materials included. For the whole family.' },
  { id: 4, dEs: 'AGO', day: '13', cat: 'comida', tEs: 'Feria del Taco', tEn: 'Taco Fair', lEs: 'East End Market · Houston', lEn: 'East End Market · Houston', going: 380, free: true, t: ['#FCEBD6', '#F6DCBF'], timeEs: 'Dom · 12:00 pm', timeEn: 'Sun · 12:00 pm', descEs: 'Más de 20 taquerías, concurso de salsas y música regional. Entrada libre.', descEn: '20+ taquerías, a salsa contest and regional music. Free entry.' },
  { id: 5, dEs: 'AGO', day: '18', cat: 'musica', tEs: 'Concierto de Banda', tEn: 'Banda Concert', lEs: 'Arena Tejano · Pasadena', lEn: 'Arena Tejano · Pasadena', going: 720, free: false, price: '$25', t: ['#E8E4FB', '#DCD6F6'], timeEs: 'Sáb · 8:00 pm', timeEn: 'Sat · 8:00 pm', descEs: 'Una noche de pura banda y corridos con artistas invitados. Boletos limitados.', descEn: 'A night of pure banda and corridos with guest artists. Limited tickets.' },
];

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

export const NOTIFS: Notif[] = [
  { id: 'n1', g: 'hoy', ic: 'heart', color: '#F0466E', bg: '#FDE7EF', unread: true, titleEs: 'Carlos R. recomendó Taquería La Esperanza', titleEn: 'Carlos R. recommended Taquería La Esperanza', subEs: 'En tu barrio · Bellaire', subEn: 'In your area · Bellaire', timeEs: 'hace 20 min', timeEn: '20m', view: 'comunidad' },
  { id: 'n2', g: 'hoy', ic: 'message', color: '#6D4DF6', bg: '#EFEBFF', unread: true, titleEs: 'María G. respondió a tu pregunta', titleEn: 'María G. replied to your question', subEs: '“Yo llevo mi carro con Don Beto…”', subEn: '“I take my car to Don Beto…”', timeEs: 'hace 1 h', timeEn: '1h', view: 'comunidad' },
  { id: 'n3', g: 'hoy', ic: 'calendar', color: '#2F6FED', bg: '#E5EFFB', unread: true, titleEs: '“Sábados de Reggaetón” es mañana', titleEn: '“Reggaetón Saturdays” is tomorrow', subEs: 'Club Tropikal · 10:00 PM', subEn: 'Club Tropikal · 10:00 PM', timeEs: 'hace 3 h', timeEn: '3h', view: 'eventos' },
  { id: 'n4', g: 'semana', ic: 'store', color: '#1F9D57', bg: '#E3F5EA', unread: false, titleEs: 'Nuevo negocio verificado: Dulces Encanto', titleEn: 'New verified business: Dulces Encanto', subEs: 'Repostería · Katy', subEn: 'Bakery · Katy', timeEs: 'hace 2 d', timeEn: '2d', view: 'negocios' },
  { id: 'n5', g: 'semana', ic: 'user', color: '#E8954A', bg: '#FCEBD6', unread: false, titleEs: 'Ana E. te empezó a seguir', titleEn: 'Ana E. started following you', subEs: 'Bellaire', subEn: 'Bellaire', timeEs: 'hace 3 d', timeEn: '3d', view: 'comunidad' },
  { id: 'n6', g: 'semana', ic: 'tag', color: '#9A6A12', bg: '#FCEFD6', unread: false, titleEs: '−20% en Taquería La Esperanza esta semana', titleEn: '−20% at Taquería La Esperanza this week', subEs: 'Oferta de la semana', subEn: 'Deal of the week', timeEs: 'hace 4 d', timeEn: '4d', view: 'negocios' },
  { id: 'n7', g: 'antes', ic: 'message', color: '#6D4DF6', bg: '#EFEBFF', unread: false, titleEs: 'Doña Lucía publicó sobre la pulga del 59', titleEn: 'Doña Lucía posted about the 59 flea market', subEs: 'Gulfton', subEn: 'Gulfton', timeEs: 'hace 1 sem', timeEn: '1w', view: 'comunidad' },
];

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
  { k: 'inmuebles', icon: 'home', es: 'Bienes Raíces', en: 'Real Estate', soon: true },
  { k: 'autos', icon: 'car', es: 'Dealer de carros', en: 'Car Dealers', soon: true },
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
