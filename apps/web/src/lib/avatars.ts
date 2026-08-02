'use client';

// Fotos de perfil de OTROS usuarios.
//
// El problema: `profiles` es privado por RLS (migración 0082) porque guarda las
// coordenadas de la casa de cada quien, así que el navegador no puede leer la
// fila de nadie más. Los posts llevan el nombre y las iniciales denormalizados,
// pero la foto no puede ir por ahí: una foto se cambia, y una copia pegada en
// cada post dejaría la cara vieja en todo lo publicado antes.
//
// La solución: `public_avatars(ids)` (migración 0134) devuelve SOLO la URL de la
// foto, y este módulo la pide **una vez por lote**. Veinte tarjetas del feed
// piden su autor en el mismo tick del navegador y salen todas en UNA consulta
// por clave primaria — no veinte. Lo pedido se guarda en memoria mientras dure
// la pestaña, así que al desplazarse hacia arriba no se vuelve a preguntar.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** id → URL, o `null` = ya preguntamos y esa persona no tiene foto. */
const cache = new Map<string, string | null>();
const pending = new Set<string>();
const listeners = new Set<() => void>();
let timer: number | null = null;

function notify() {
  listeners.forEach((fn) => fn());
}

async function flush() {
  timer = null;
  const ids = [...pending];
  pending.clear();
  if (!ids.length || !supabase) {
    // Sin Supabase no habrá foto nunca: se marca resuelto para no reintentar.
    ids.forEach((id) => cache.set(id, null));
    if (ids.length) notify();
    return;
  }
  // La función topa en 200; se trocea por si una vista pide más de golpe.
  for (let i = 0; i < ids.length; i += 200) {
    const lote = ids.slice(i, i + 200);
    try {
      const { data, error } = await supabase.rpc('public_avatars', { ids: lote });
      // Resueltos primero como "sin foto"; la respuesta solo trae a quien SÍ tiene.
      lote.forEach((id) => cache.set(id, null));
      if (!error && Array.isArray(data)) {
        for (const r of data as { id: string; avatar_url: string | null }[]) {
          if (r?.id && r.avatar_url) cache.set(r.id, r.avatar_url);
        }
      }
    } catch {
      // Sin red: se deja sin resolver para poder reintentar en otra vista.
      lote.forEach((id) => cache.delete(id));
    }
  }
  notify();
}

function request(id: string) {
  if (cache.has(id) || pending.has(id)) return;
  pending.add(id);
  if (timer === null) timer = window.setTimeout(flush, 0);
}

/**
 * La foto de un usuario por su id, o `null` mientras se resuelve / si no tiene.
 * Quien lo llama sigue pintando las iniciales como respaldo, así que nunca hay
 * un hueco vacío esperando.
 */
export function useAvatar(userId?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() => (userId ? cache.get(userId) ?? null : null));

  useEffect(() => {
    if (!userId) { setUrl(null); return; }
    const read = () => setUrl(cache.get(userId) ?? null);
    read();
    if (cache.has(userId)) return;
    listeners.add(read);
    request(userId);
    return () => { listeners.delete(read); };
  }, [userId]);

  return url;
}

/** Tras cambiar la propia foto, para que el feed la muestre sin recargar. */
export function setCachedAvatar(userId: string, url: string | null) {
  cache.set(userId, url);
  notify();
}
