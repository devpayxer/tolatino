/**
 * Sample business data for the discovery + detail screens (UI-only for now;
 * gets replaced by Supabase queries when we wire the data layer). Bilingual
 * fields are stored as { es, en } and resolved with L() at render time.
 */

export type Bilingual = { es: string; en: string };

export type Business = {
  id: string;
  name: string;
  cat: Bilingual;
  seed: string; // categoryTile() gradient seed
  dist: string;
  rating: number;
  reviews: number;
  price: string; // $, $$, $$$
  open: boolean;
  verified: boolean;
  promo?: Bilingual;
  about?: Bilingual;
  address?: string;
  hours?: Bilingual;
  phone?: string;
  amenities?: Bilingual[];
};

export const BUSINESSES: Business[] = [
  {
    id: "esperanza",
    name: "Taquería La Esperanza",
    cat: { es: "Comida Mexicana", en: "Mexican Food" },
    seed: "taqueria",
    dist: "0.8 mi",
    rating: 4.9,
    reviews: 320,
    price: "$$",
    open: true,
    verified: true,
    promo: { es: "Martes 2×1", en: "Tuesday 2×1" },
    about: {
      es: "Tacos al pastor, birria y aguas frescas hechas en casa. Negocio familiar desde 2009.",
      en: "Al pastor tacos, birria, and homemade aguas frescas. Family-owned since 2009.",
    },
    address: "2890 Mission St, Houston, TX",
    hours: { es: "Abierto · cierra 10:00 PM", en: "Open · closes 10:00 PM" },
    phone: "(713) 555-0148",
    amenities: [
      { es: "A domicilio", en: "Delivery" },
      { es: "Para llevar", en: "Takeout" },
      { es: "Acepta tarjeta", en: "Cards accepted" },
      { es: "Apto familias", en: "Family friendly" },
    ],
  },
  {
    id: "primo",
    name: "Tacos El Primo",
    cat: { es: "Food truck", en: "Food truck" },
    seed: "tacoselprimo",
    dist: "1.2 mi",
    rating: 4.6,
    reviews: 54,
    price: "$",
    open: true,
    verified: false,
    address: "Harrisburg Blvd, Houston, TX",
  },
  {
    id: "dulce",
    name: "Panadería Dulce",
    cat: { es: "Panadería", en: "Bakery" },
    seed: "panaderia",
    dist: "1.5 mi",
    rating: 4.8,
    reviews: 210,
    price: "$$",
    open: false,
    verified: true,
    promo: { es: "Pan caliente 6 PM", en: "Fresh bread 6 PM" },
    about: {
      es: "Pan dulce, conchas y pasteles por encargo. Café de olla todas las mañanas.",
      en: "Pan dulce, conchas, and custom cakes. Café de olla every morning.",
    },
    address: "5410 Gulfton St, Houston, TX",
    hours: { es: "Cerrado · abre 7:00 AM", en: "Closed · opens 7:00 AM" },
    phone: "(713) 555-0192",
    amenities: [
      { es: "Por encargo", en: "Custom orders" },
      { es: "Para llevar", en: "Takeout" },
      { es: "Acepta tarjeta", en: "Cards accepted" },
    ],
  },
];

export function getBusiness(id: string): Business | undefined {
  return BUSINESSES.find((b) => b.id === id);
}
