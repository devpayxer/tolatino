// Business onboarding fixtures (Handoff v2 → "Publica tu negocio" flow):
// 16 main categories with their service sub-categories.

export type Bi = [string, string];

export const ONB_CATS: { k: string; es: string; en: string }[] = [
  { k: 'auto', es: 'Servicios Automotrices', en: 'Auto Services' },
  { k: 'belleza', es: 'Belleza y Salud', en: 'Beauty & Health' },
  { k: 'comida', es: 'Comida y Bebidas', en: 'Food & Drinks' },
  { k: 'hogar', es: 'Servicios del Hogar', en: 'Home Services' },
  { k: 'noche', es: 'Vida Nocturna', en: 'Night Life' },
  { k: 'abarrotes', es: 'Abarrotes y Mercado', en: 'Grocery & Market' },
  { k: 'fiestas', es: 'Fiestas y Eventos', en: 'Party & Celebrations' },
  { k: 'salud', es: 'Salud y Medicina', en: 'Health & Medicine' },
  { k: 'profesional', es: 'Servicios Profesionales', en: 'Professional Services' },
  { k: 'tiendas', es: 'Tiendas y Comercios', en: 'Shops & Stores' },
  { k: 'transporte', es: 'Transporte', en: 'Transportation' },
  { k: 'educacion', es: 'Cursos y Educación', en: 'Courses & Education' },
  { k: 'ninos', es: 'Niños', en: 'Children' },
  { k: 'deportes', es: 'Vida Activa y Deportes', en: 'Active Life & Sports' },
  { k: 'iglesias', es: 'Iglesias y Religión', en: 'Churches & Religion' },
  { k: 'mascotas', es: 'Mascotas y Veterinaria', en: 'Pets & Veterinary' },
];

export const ONB_SUBS: Record<string, Bi[]> = {
  auto: [['Taller mecánico', 'Mechanic'], ['Hojalatería y pintura', 'Body & paint'], ['Llantas', 'Tires'], ['Lavado de autos', 'Car wash'], ['Audio y accesorios', 'Audio & accessories'], ['Grúas', 'Towing']],
  belleza: [['Salón de belleza', 'Beauty salon'], ['Barbería', 'Barbershop'], ['Uñas', 'Nails'], ['Spa', 'Spa'], ['Estética', 'Aesthetics'], ['Maquillaje', 'Makeup']],
  comida: [['Restaurante', 'Restaurant'], ['Taquería', 'Taco shop'], ['Food truck', 'Food truck'], ['Panadería', 'Bakery'], ['Cafetería', 'Café'], ['Catering', 'Catering']],
  hogar: [['Plomería', 'Plumbing'], ['Electricidad', 'Electrical'], ['Limpieza', 'Cleaning'], ['Jardinería', 'Landscaping'], ['Aire acondicionado', 'HVAC'], ['Remodelación', 'Remodeling']],
  noche: [['Bar', 'Bar'], ['Cantina', 'Cantina'], ['Discoteca', 'Nightclub'], ['Karaoke', 'Karaoke'], ['Lounge', 'Lounge'], ['Salón de eventos', 'Event hall']],
  abarrotes: [['Tienda', 'Store'], ['Carnicería', 'Butcher'], ['Frutería', 'Produce'], ['Tortillería', 'Tortillería'], ['Mercado', 'Market'], ['Licorería', 'Liquor store']],
  fiestas: [['Salón de fiestas', 'Party hall'], ['Renta de mobiliario', 'Rentals'], ['Decoración', 'Decoration'], ['DJ y música', 'DJ & music'], ['Payasos', 'Clowns'], ['Brincolines', 'Bounce houses']],
  salud: [['Clínica', 'Clinic'], ['Dentista', 'Dentist'], ['Farmacia', 'Pharmacy'], ['Médico general', 'General doctor'], ['Terapia', 'Therapy'], ['Laboratorio', 'Lab']],
  profesional: [['Abogado', 'Lawyer'], ['Contador', 'Accountant'], ['Notario', 'Notary'], ['Seguros', 'Insurance'], ['Inmigración', 'Immigration'], ['Traducción', 'Translation']],
  tiendas: [['Ropa', 'Clothing'], ['Calzado', 'Shoes'], ['Electrónica', 'Electronics'], ['Mueblería', 'Furniture'], ['Joyería', 'Jewelry'], ['Regalos', 'Gifts']],
  transporte: [['Mudanzas', 'Moving'], ['Fletes', 'Freight'], ['Paquetería', 'Courier'], ['Taxi / Ride', 'Taxi / Ride'], ['Renta de autos', 'Car rental'], ['Transporte escolar', 'School transport']],
  educacion: [['Inglés', 'English'], ['Computación', 'Computers'], ['Música', 'Music'], ['Tutorías', 'Tutoring'], ['Manejo', 'Driving'], ['Oficios', 'Trades']],
  ninos: [['Guardería', 'Daycare'], ['Ropa infantil', 'Kids clothing'], ['Juguetes', 'Toys'], ['Pediatría', 'Pediatrics'], ['Clases', 'Classes'], ['Fiestas infantiles', 'Kids parties']],
  deportes: [['Gimnasio', 'Gym'], ['Fútbol', 'Soccer'], ['Yoga', 'Yoga'], ['Box', 'Boxing'], ['Entrenador personal', 'Personal trainer'], ['Artes marciales', 'Martial arts']],
  iglesias: [['Católica', 'Catholic'], ['Cristiana', 'Christian'], ['Bautista', 'Baptist'], ['Pentecostal', 'Pentecostal'], ['Grupo de oración', 'Prayer group'], ['Ministerio', 'Ministry']],
  mascotas: [['Veterinaria', 'Veterinary'], ['Estética canina', 'Pet grooming'], ['Pensión', 'Boarding'], ['Tienda de mascotas', 'Pet store'], ['Adiestramiento', 'Training'], ['Paseo', 'Walking']],
};
