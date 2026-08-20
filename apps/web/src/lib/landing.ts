'use client';

// Tarjeta de comunidad de la portada (handoff "To'Latino — Official Home Page").
//
// ⚠️ ESTAS 19 PUBLICACIONES SON DE MUESTRA — decisión explícita del fundador
// (2026-08-02): «deja los de muestra por ahora, así como está el handoff».
//
// Se había conectado al feed REAL (`posts_near`), que es lo que pide el propio
// handoff para producción («The community feed is static sample data —
// production should read the real feed»). Se revirtió a petición del fundador:
// hoy no hay publicaciones cerca y la tarjeta quedaba vacía, lo que deja el
// hero más pobre de lo diseñado.
//
// Qué implica y por qué está anotado en docs/LAUNCH-CHECKLIST.md: son personas
// y negocios que NO existen ("José M.", "Tacos Yucatán", "Doña Chuy"), en la
// página más vista, presentados como conversación de vecinos. Es exactamente la
// clase de dato que se limpió el 2026-07-29 (regla #8). Aquí es ilustración de
// marketing, no un listado navegable — nada de esto se puede abrir, guardar ni
// contactar — pero **hay que cambiarlo por el feed real antes de abrir el
// registro al público**. Volver a conectarlo es sustituir este archivo por la
// llamada a `posts_near`: la tarjeta ya está escrita para cualquiera de las dos
// fuentes.

/** Los seis tipos del handoff, con la etiqueta y los colores de su tabla. */
export type FeedKind = 'ask' | 'rec' | 'job' | 'sale' | 'rent' | 'evt';

export const FEED_KIND: Record<FeedKind, { es: string; en: string; bg: string; color: string }> = {
  ask: { es: 'Busca servicio', en: 'Needs a pro', bg: '#FFF6E3', color: '#8A5A00' },
  rec: { es: 'Recomienda', en: 'Recommends', bg: '#E6FAF3', color: '#007A57' },
  job: { es: 'Empleo', en: 'Job', bg: '#FFECF2', color: '#C4144C' },
  sale: { es: 'Vende', en: 'For sale', bg: '#DAF6FD', color: '#007698' },
  rent: { es: 'Renta', en: 'Rental', bg: '#FFF1E5', color: '#FF7A1A' },
  evt: { es: 'Evento', en: 'Event', bg: '#FFECF2', color: '#E11D48' },
};

export type FeedTeaser = {
  initials: string;
  color: string;
  who: string;
  kind: FeedKind;
  es: string;
  en: string;
  hood: string;
  agoEs: string;
  agoEn: string;
};

/** Las 19 del handoff, en su orden y con su texto exacto. */
export const FEED_SAMPLE: FeedTeaser[] = [
  { initials: 'JM', color: '#FF2D6F', who: 'José M.', kind: 'ask', hood: 'Gulfton', agoEs: 'hace 4 min', agoEn: '4 min ago',
    es: 'Necesito un mecánico a domicilio, mi troca no arranca.', en: 'I need a mobile mechanic, my truck will not start.' },
  { initials: 'LR', color: '#E11D48', who: 'Lupita R.', kind: 'rec', hood: 'East End', agoEs: 'hace 12 min', agoEn: '12 min ago',
    es: 'Recomiendo Tacos Yucatán, muy buenos y bien servidos.', en: 'I recommend Tacos Yucatán, really good and generous portions.' },
  { initials: 'CS', color: '#00A878', who: 'Carlos S.', kind: 'rent', hood: 'Spring Branch', agoEs: 'hace 20 min', agoEn: '20 min ago',
    es: '¿Alguien renta brincolines para este sábado?', en: 'Anyone renting bounce houses for this Saturday?' },
  { initials: 'AM', color: '#007698', who: 'Ana M.', kind: 'job', hood: 'Pasadena', agoEs: 'hace 35 min', agoEn: '35 min ago',
    es: 'Busco trabajo de cocinera, 6 años de experiencia.', en: 'Looking for a cook position, 6 years of experience.' },
  { initials: 'RT', color: '#FF7A1A', who: 'Ramón T.', kind: 'sale', hood: 'Northside', agoEs: 'hace 1 h', agoEn: '1 h ago',
    es: 'Vendo Tacoma 2018, buen estado y papeles al día.', en: 'Selling a 2018 Tacoma, good shape and clean title.' },
  { initials: 'MV', color: '#A3499A', who: 'Marisol V.', kind: 'rec', hood: 'Gulfton', agoEs: 'hace 2 h', agoEn: '2 h ago',
    es: 'Barbería El Corte me atendió sin cita, excelente.', en: 'Barbería El Corte took me without an appointment, excellent.' },
  { initials: 'DG', color: '#007A7E', who: 'Diana G.', kind: 'ask', hood: 'Bellaire', agoEs: 'hace 3 h', agoEn: '3 h ago',
    es: '¿Quién sabe de un dentista que hable español?', en: 'Anyone know a dentist who speaks Spanish?' },
  { initials: 'EO', color: '#C4144C', who: 'Efraín O.', kind: 'evt', hood: 'Salón Tropicana', agoEs: 'hace 3 h', agoEn: '3 h ago',
    es: 'Hay baile con banda en vivo este sábado, ¿quién va?', en: 'Live banda dance this Saturday — who is coming?' },
  { initials: 'SP', color: '#625B7D', who: 'Sara P.', kind: 'rent', hood: 'Midtown', agoEs: 'hace 4 h', agoEn: '4 h ago',
    es: 'Se renta cuarto amueblado, servicios incluidos.', en: 'Furnished room for rent, utilities included.' },
  { initials: 'NC', color: '#00A878', who: 'Noé C.', kind: 'rec', hood: 'Northside', agoEs: 'hace 5 h', agoEn: '5 h ago',
    es: 'Doña Chuy hace los mejores tamales de la zona.', en: 'Doña Chuy makes the best tamales around here.' },
  { initials: 'PA', color: '#E11D48', who: 'Paola A.', kind: 'evt', hood: 'East End Plaza', agoEs: 'hace 6 h', agoEn: '6 h ago',
    es: 'Mercadito de artesanos el domingo en la plaza, entrada gratis.', en: 'Artisan market this Sunday at the plaza, free entry.' },
  { initials: 'JC', color: '#FF2D6F', who: 'Juan C.', kind: 'rec', hood: 'Spring Branch', agoEs: 'hace 6 h', agoEn: '6 h ago',
    es: 'El mecánico de la Long Point me salvó, cobró justo y rápido.', en: 'The mechanic on Long Point saved me — fair price and fast.' },
  { initials: 'GM', color: '#FF7A1A', who: 'Gaby M.', kind: 'evt', hood: 'Arena Sur', agoEs: 'hace 7 h', agoEn: '7 h ago',
    es: 'Lucha libre este viernes, van a estar los enmascarados.', en: 'Lucha libre this Friday, the masked wrestlers are coming.' },
  { initials: 'IV', color: '#007A7E', who: 'Irma V.', kind: 'rec', hood: 'Bellaire', agoEs: 'hace 8 h', agoEn: '8 h ago',
    es: 'Clínica Salud Latina atiende en español y sin cita.', en: 'Clínica Salud Latina serves in Spanish, no appointment needed.' },
  { initials: 'HD', color: '#A3499A', who: 'Hugo D.', kind: 'evt', hood: 'Northside', agoEs: 'hace 9 h', agoEn: '9 h ago',
    es: 'Kermés de la iglesia el sábado, habrá antojitos y música.', en: 'Church kermés on Saturday, food and live music.' },
  { initials: 'TS', color: '#007698', who: 'Tania S.', kind: 'rec', hood: 'Spring Branch', agoEs: 'hace 10 h', agoEn: '10 h ago',
    es: 'Fiestas Martínez nos puso todo para el bautizo, súper cumplidos.', en: 'Fiestas Martínez set up everything for the baptism, very reliable.' },
  { initials: 'OM', color: '#C4144C', who: 'Omar M.', kind: 'evt', hood: 'Sharpstown', agoEs: 'hace 11 h', agoEn: '11 h ago',
    es: 'Torneo de fútbol llanero el domingo, faltan dos equipos.', en: 'Sunday pickup soccer tournament, two teams still needed.' },
  { initials: 'BC', color: '#00A878', who: 'Brenda C.', kind: 'rec', hood: 'Gulfton', agoEs: 'hace 12 h', agoEn: '12 h ago',
    es: 'Las uñas de Nayeli quedan preciosas y dura semanas.', en: 'Nayeli does beautiful nails and they last for weeks.' },
  { initials: 'FR', color: '#FFB020', who: 'Fernando R.', kind: 'evt', hood: 'Salón Tropicana', agoEs: 'hace 14 h', agoEn: '14 h ago',
    es: 'Noche de banda en vivo, boletos todavía disponibles.', en: 'Live banda night, tickets still available.' },
];
