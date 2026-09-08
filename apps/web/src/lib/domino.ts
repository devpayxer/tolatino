// domino.ts — la capa de datos de la mesa.
//
// TODO lo que decide el juego vive en la base (migraciones 0160 y 0161). Este
// archivo solo pide y recibe: no valida jugadas, no reparte, no cuenta el
// tiempo. Si algo de eso apareciera aquí, se podría hacer trampa cambiándolo
// desde las herramientas del navegador.
//
// El reloj que se pinta en pantalla es una CUENTA ATRÁS DECORATIVA sobre el
// número que manda el servidor (`segundos`): sirve para que el usuario vea el
// tiempo correr, pero quien decide si venció es Postgres.

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/** Una ficha, como la guarda la base: [a, b]. */
export type Ficha = [number, number];

export type EstadoMesa = {
  id: string;
  estado: 'esperando' | 'jugando' | 'terminada';
  mesa: Ficha[];
  izq: number | null;
  der: number | null;
  miMano: Ficha[];
  fichasRival: number;
  pozo: number;
  meToca: boolean;
  puedoJugar: boolean;
  segundos: number;
  ganador: string | null;
  motivoFin: 'domino' | 'tranque' | 'abandono' | null;
  rival: string | null;
  /** La cara del rival, tal como la manda el servidor.
   *
   *  No se pide a `profiles`: esa tabla solo deja leer TU propio perfil
   *  (política «self read profiles»), así que el navegador nunca podría ver el
   *  del contrario. Lo devuelve `domino_estado`, que ya decide qué puedes ver. */
  rivalNombre: string | null;
  rivalIniciales: string | null;
  rivalColor: string | null;
  /** true si estás mirando una partida en la que no juegas. */
  mirando: boolean;
};

function normaliza(d: Record<string, unknown> | null): EstadoMesa | null {
  if (!d) return null;
  return {
    id: String(d.id ?? ''),
    estado: (d.estado as EstadoMesa['estado']) ?? 'esperando',
    mesa: (d.mesa as Ficha[]) ?? [],
    izq: d.izq == null ? null : Number(d.izq),
    der: d.der == null ? null : Number(d.der),
    miMano: (d.mi_mano as Ficha[]) ?? [],
    fichasRival: Number(d.fichas_rival ?? 0),
    pozo: Number(d.pozo ?? 0),
    meToca: d.me_toca === true,
    puedoJugar: d.puedo_jugar === true,
    segundos: Number(d.segundos ?? 0),
    ganador: (d.ganador as string) ?? null,
    motivoFin: (d.motivo_fin as EstadoMesa['motivoFin']) ?? null,
    rival: (d.rival as string) ?? null,
    rivalNombre: (d.rival_nombre as string) ?? null,
    rivalIniciales: (d.rival_iniciales as string) ?? null,
    rivalColor: (d.rival_color as string) ?? null,
    mirando: d.mirando === true,
  };
}

/** El estado de la mesa, ya filtrado por el servidor: tu mano entera y del
 *  rival solo el número de fichas. */
export async function estadoMesa(partida: string): Promise<EstadoMesa | null> {
  if (!isSupabaseConfigured || !supabase || !partida) return null;
  const { data, error } = await supabase.rpc('domino_estado', { in_partida: partida });
  if (error) return null;
  return normaliza(data as Record<string, unknown> | null);
}

/** «Jugar»: se sienta en una mesa que espere o abre una. Devuelve su id. */
export async function jugarYa(ciudad: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.rpc('domino_jugar_ya', { in_ciudad: ciudad });
  return error ? null : (data as string) ?? null;
}

/** Poner una ficha. `lado` solo importa si encaja en los dos extremos. */
export async function ponerFicha(partida: string, f: Ficha, lado: 'izq' | 'der'): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data, error } = await supabase.rpc('domino_jugar', {
    in_partida: partida, in_a: f[0], in_b: f[1], in_lado: lado,
  });
  return !error && data === true;
}

export async function robar(partida: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data, error } = await supabase.rpc('domino_robar', { in_partida: partida });
  return !error && data === true;
}

export async function pasar(partida: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data, error } = await supabase.rpc('domino_pasar', { in_partida: partida });
  return !error && data === true;
}

/** ¿En qué extremos encaja esta ficha? Se calcula en el cliente SOLO para
 *  encender las fichas jugables y saber si hay que preguntar el lado. La
 *  jugada la valida el servidor igual; esto es comodidad, no permiso. */
export function encajaEn(f: Ficha, izq: number | null, der: number | null): ('izq' | 'der')[] {
  if (izq == null) return ['der'];          // mesa vacía: la primera abre
  const lados: ('izq' | 'der')[] = [];
  if (f[0] === izq || f[1] === izq) lados.push('izq');
  if (f[0] === der || f[1] === der) lados.push('der');
  return lados;
}

/** Escucha los cambios de la mesa.
 *
 *  Lo que llega por el canal es «algo cambió en esta partida» — nunca las
 *  fichas de nadie: la tabla de manos no se publica. Al recibirlo se vuelve a
 *  pedir `domino_estado`, que es quien decide qué puedes ver. */
export function escucharMesa(partida: string, alCambiar: () => void): () => void {
  const sb = supabase;
  if (!isSupabaseConfigured || !sb || !partida) return () => {};
  const canal = sb
    .channel(`domino:${partida}`)
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'domino_partidas', filter: `id=eq.${partida}` },
      () => alCambiar())
    .subscribe();
  return () => { void sb.removeChannel(canal); };
}
