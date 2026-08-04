'use client';

// Vecinos activos cerca de ti — la mitad SOSTENIBLE de la columna derecha que el
// Handoff pide en escritorio.
//
// La columna se retiró el 2026-07-29 porque sus dos tarjetas eran inventadas
// (hashtags con conteos falsos y tres vecinos que no existían, con un botón
// Seguir que funcionaba). Esta vuelve con datos reales: el RPC `neighbors_nearby`
// (migración 0143) devuelve gente que HA PUBLICADO dentro de tu radio y a la que
// todavía no sigues — nunca a ti mismo, nunca a quien bloqueaste ni a quien te
// bloqueó. Sin sesión no devuelve nada, así que un invitado no ve la tarjeta.
//
// Los «temas en tendencia» NO se reconstruyen: no hay hashtags en el modelo de
// datos y cualquier cifra volvería a ser inventada.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type Vecino = {
  id: string;
  name: string;
  initials: string;
  color: string;
  hood: string | null;
  posts: number;
};

type Row = {
  id: string;
  name: string | null;
  initials: string | null;
  color: string | null;
  hood: string | null;
  posts_count: number | string | null;
};

/**
 * @param lat/lng  centro del radio (las coordenadas de la ciudad elegida)
 * @param radiusM  el mismo radio del feed, para que no sugiera a alguien que
 *                 el usuario no vería publicar
 * @param enabled  permite no consultar cuando la tarjeta ni siquiera se pinta
 */
export function useNeighborsNearby(
  lat: number | null | undefined,
  lng: number | null | undefined,
  radiusM: number,
  enabled = true,
  max = 4,
): { vecinos: Vecino[]; loading: boolean } {
  const [vecinos, setVecinos] = useState<Vecino[]>([]);
  // Arranca cargando para que la tarjeta no parpadee «no hay nadie» antes de
  // preguntar. Sin backend nunca habrá respuesta, así que ahí arranca en false.
  const [loading, setLoading] = useState(!!supabase && enabled);

  useEffect(() => {
    if (!supabase || !enabled) {
      setVecinos([]);
      setLoading(false);
      return;
    }
    let cancelado = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase!.rpc('neighbors_nearby', {
        user_lat: lat ?? null,
        user_lng: lng ?? null,
        radius_m: radiusM,
        max_results: max,
      });
      if (cancelado) return;
      // Un error (o una sesión ausente) deja la lista VACÍA a propósito: la
      // tarjeta desaparece en vez de quedarse con vecinos de otra ciudad.
      setVecinos(
        !error && Array.isArray(data)
          ? (data as Row[])
              .filter((r) => r?.id && r.name)
              .map((r) => ({
                id: r.id,
                name: r.name!,
                initials: r.initials || r.name!.slice(0, 1).toUpperCase(),
                color: r.color || '#7B61FF',
                hood: r.hood,
                posts: Number(r.posts_count ?? 0),
              }))
          : [],
      );
      setLoading(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [lat, lng, radiusM, enabled, max]);

  return { vecinos, loading };
}
