// Marcadores de foto + paleta de rubros.
//
// LOS COLORES YA NO VIVEN AQUÍ (paso 2 de la migración, 2026-08-20): salen de
// `lib/paleta.ts`, que es la única fuente. Este módulo solo los junta con los
// nombres en los dos idiomas.
//
// POR QUÉ SE CAMBIÓ: cuando los 17 rubros tenían su color escrito a mano aquí,
// el barrido automático del paso 2 —que reasigna por SIGNIFICADO— mandó dos
// rubros distintos al mismo sitio: «Servicios de Auto» y «Tiendas» acabaron
// los dos en el rosa de marca, y con ellos se perdía justo lo que el color
// hace en esta lista, que es distinguir. Con una sola fuente eso no puede
// volver a pasar: los 17 se generan repartidos por el círculo de tono.

import { CAT_COLOR, TIRA, AVATAR } from '@/lib/paleta';

/** Striped gradient placeholder for photos (handoff spec). */
export const tile = (a: string, b: string, w = 11) =>
  `repeating-linear-gradient(135deg, ${a} 0 ${w}px, ${b} ${w}px ${w * 2}px)`;

export type CatKey =
  | 'AutoServices'
  | 'BeautyHealth'
  | 'FoodDrinks'
  | 'HomeServices'
  | 'NightLife'
  | 'Grocery'
  | 'Party'
  | 'HealthMedicine'
  | 'ProServices'
  | 'Shops'
  | 'Transportation'
  | 'Education'
  | 'Children'
  | 'Sports'
  | 'Churches'
  | 'RealEstate'
  | 'CarDealer';

/** Nombres de los 17 rubros. El COLOR sale de `CAT_COLOR` (paleta.ts). */
const NOMBRE: Record<CatKey, [string, string]> = {
  AutoServices: ['Servicios de Auto', 'Auto Services'],
  BeautyHealth: ['Belleza y Salud', 'Beauty & Health'],
  FoodDrinks: ['Comida y Bebida', 'Food & Drinks'],
  HomeServices: ['Servicios del Hogar', 'Home Services'],
  NightLife: ['Vida Nocturna', 'Night Life'],
  Grocery: ['Supermercado', 'Grocery & Market'],
  Party: ['Fiestas y Celebraciones', 'Party & Celebrations'],
  HealthMedicine: ['Salud y Medicina', 'Health & Medicine'],
  ProServices: ['Servicios Profesionales', 'Professional Services'],
  Shops: ['Tiendas', 'Shops & Stores'],
  Transportation: ['Transporte', 'Transportation'],
  Education: ['Cursos y Educación', 'Courses & Education'],
  Children: ['Niños', 'Children'],
  Sports: ['Vida Activa y Deportes', 'Active Life & Sports'],
  Churches: ['Iglesias y Religión', 'Churches & Religion'],
  RealEstate: ['Bienes Raíces', 'Real Estate'],
  CarDealer: ['Dealer de carros', 'Car Dealers'],
};

export const CAT: Record<CatKey, { bg: string; dot: string; es: string; en: string }> =
  Object.fromEntries(
    (Object.keys(NOMBRE) as CatKey[]).map((k) => [
      k,
      { bg: CAT_COLOR[k].bg, dot: CAT_COLOR[k].fg, es: NOMBRE[k][0], en: NOMBRE[k][1] },
    ]),
  ) as Record<CatKey, { bg: string; dot: string; es: string; en: string }>;

export const CAT_KEYS = Object.keys(CAT) as CatKey[];

/** Las dos rayas del marcador de foto, por rubro. */
export const CAT_TIRA = TIRA;

/** Rotación de avatares (reseñas, equipo, comentarios). */
export const AVATAR_PALETTE: readonly string[] = AVATAR;
