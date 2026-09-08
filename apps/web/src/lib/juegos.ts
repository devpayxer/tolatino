// juegos.ts — la capa de datos de la sala de juegos y la gamificación.
//
// De dónde salen los datos: las funciones de la migración `0158`
// (`mi_progreso`, `ranking_barrio`, `mis_puntos`) y `0159`
// (`apuntarme_lista`, `espera_conteo`).
//
// NADA DE ESTO INVENTA PUNTOS. El navegador solo LEE. Los puntos los otorgan
// disparadores en la base sobre las acciones reales — no existe ninguna función
// que el cliente pueda llamar para sumarse nada, y eso es a propósito: unos
// puntos que se pudieran pedir desde fuera no valdrían para un ranking.

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type Progreso = {
  puntos: number;
  nivelOrden: number;
  nivelEs: string;
  nivelEn: string;
  siguienteEs: string | null;
  siguienteEn: string | null;
  siguienteDesde: number | null;
  faltan: number;
};

export type FilaRanking = {
  posicion: number;
  userId: string;
  nombre: string;
  iniciales: string;
  color: string;
  puntos: number;
  nivelEs: string;
  nivelEn: string;
  soyYo: boolean;
};

/** Mi progreso: puntos, nivel y cuánto falta para el siguiente.
 *  `null` si no hay sesión — la sala se puede mirar sin entrar. */
export async function miProgreso(): Promise<Progreso | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.rpc('mi_progreso');
  if (error || !data?.length) return null;
  const r = data[0] as Record<string, unknown>;
  return {
    puntos: Number(r.puntos ?? 0),
    nivelOrden: Number(r.nivel_orden ?? 1),
    nivelEs: String(r.nivel_es ?? 'Vecino'),
    nivelEn: String(r.nivel_en ?? 'Neighbor'),
    siguienteEs: (r.siguiente_es as string) ?? null,
    siguienteEn: (r.siguiente_en as string) ?? null,
    siguienteDesde: r.siguiente_desde == null ? null : Number(r.siguiente_desde),
    faltan: Number(r.faltan ?? 0),
  };
}

/** El ranking de una ciudad. Público: nombre, iniciales y puntos — nada más.
 *  Ni correo ni ubicación; eso se decidió en la propia función de la base. */
export async function rankingBarrio(ciudad: string, limite = 20): Promise<FilaRanking[]> {
  if (!isSupabaseConfigured || !supabase || !ciudad) return [];
  const { data, error } = await supabase.rpc('ranking_barrio', { in_ciudad: ciudad, in_limite: limite });
  if (error || !Array.isArray(data)) return [];
  return data.map((r: Record<string, unknown>) => ({
    posicion: Number(r.posicion ?? 0),
    userId: String(r.user_id ?? ''),
    nombre: String(r.nombre ?? ''),
    iniciales: String(r.iniciales ?? ''),
    color: String(r.color ?? ''),
    puntos: Number(r.puntos ?? 0),
    nivelEs: String(r.nivel_es ?? ''),
    nivelEn: String(r.nivel_en ?? ''),
    soyYo: r.soy_yo === true,
  }));
}

/** Apuntarse a la lista de espera de un módulo que aún no abre.
 *
 *  Devuelve `false` si el correo no vale — y lo decide el SERVIDOR, no este
 *  archivo: el `type="email"` de un formulario se salta con dos clics. */
export async function apuntarmeLista(modulo: string, email: string, ciudad?: string | null): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data, error } = await supabase.rpc('apuntarme_lista', {
    in_modulo: modulo,
    in_email: email,
    in_ciudad: ciudad ?? null,
  });
  return !error && data === true;
}

/** Cuánta gente espera un módulo. Solo el número; los correos no salen nunca. */
export async function esperaConteo(modulo: string): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 0;
  const { data, error } = await supabase.rpc('espera_conteo', { in_modulo: modulo });
  return error ? 0 : Number(data ?? 0);
}

/** Miles con espacio fino, que es como se leen los puntos en el diseño
 *  («1 240», no «1,240»): el separador de coma se confunde con un decimal en
 *  la mitad de los países de donde viene esta gente. */
export const puntosFmt = (n: number): string =>
  Math.max(0, Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
