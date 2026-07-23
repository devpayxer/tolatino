// Image placeholders + category palette (Handoff v2 → Design Tokens).
// These hex values are design-system data (like the token table), consumed by
// components through this module — never inline hex in JSX.

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
  | 'RealEstate';

export const CAT: Record<CatKey, { bg: string; dot: string; es: string; en: string }> = {
  AutoServices: { bg: '#EFEBFF', dot: '#7B61FF', es: 'Servicios de Auto', en: 'Auto Services' },
  BeautyHealth: { bg: '#FBE9F0', dot: '#E0568F', es: 'Belleza y Salud', en: 'Beauty & Health' },
  FoodDrinks: { bg: '#FCEBD6', dot: '#E8954A', es: 'Comida y Bebida', en: 'Food & Drinks' },
  HomeServices: { bg: '#FCF1C7', dot: '#D6A22A', es: 'Servicios del Hogar', en: 'Home Services' },
  NightLife: { bg: '#E8E4FB', dot: '#6D4DF6', es: 'Vida Nocturna', en: 'Night Life' },
  Grocery: { bg: '#E3F5EA', dot: '#1F9D57', es: 'Supermercado', en: 'Grocery & Market' },
  Party: { bg: '#F7E6F4', dot: '#C24D9E', es: 'Fiestas y Celebraciones', en: 'Party & Celebrations' },
  HealthMedicine: { bg: '#D6F3EF', dot: '#0E9384', es: 'Salud y Medicina', en: 'Health & Medicine' },
  ProServices: { bg: '#E5EFFB', dot: '#2F6FED', es: 'Servicios Profesionales', en: 'Professional Services' },
  Shops: { bg: '#FDE7EF', dot: '#F0466E', es: 'Tiendas', en: 'Shops & Stores' },
  Transportation: { bg: '#E4EDF9', dot: '#4E7CC4', es: 'Transporte', en: 'Transportation' },
  Education: { bg: '#FCEFD6', dot: '#B26A00', es: 'Cursos y Educación', en: 'Courses & Education' },
  Children: { bg: '#DEF1FA', dot: '#34A5D6', es: 'Niños', en: 'Children' },
  Sports: { bg: '#EAF6E0', dot: '#4FA02C', es: 'Vida Activa y Deportes', en: 'Active Life & Sports' },
  Churches: { bg: '#EDE7FC', dot: '#8A5CF0', es: 'Iglesias y Religión', en: 'Churches & Religion' },
  RealEstate: { bg: '#EFE9FB', dot: '#5B3FD6', es: 'Bienes Raíces', en: 'Real Estate' },
};

export const CAT_KEYS = Object.keys(CAT) as CatKey[];

/** Avatar palette rotation used across reviewers / staff / comments. */
export const AVATAR_PALETTE = ['#1F9D57', '#2F6FED', '#E8954A', '#E0568F', '#6D4DF6'];
