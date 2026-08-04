'use client';

// Búsquedas recientes — las últimas 5, 30 días.
//
// EN EL TELÉFONO, no en la base, y es una decisión, no una comodidad:
//   · Funciona SIN cuenta, que es como llega la mayoría de la gente.
//   · Es instantáneo: no hay viaje al servidor para pintar una lista de cinco.
//   · Y sobre todo: **lo que uno busca dice mucho de uno** — salud, dinero,
//     situación migratoria. Guardarlo en el servidor atado a un usuario obliga a
//     poder borrarlo, a explicar por qué se tiene y a protegerlo. Aquí ese
//     problema no existe: el dato no sale del aparato de su dueño.
//
// (La analítica de búsqueda —qué se busca y qué NO encuentra nada— es otra cosa
// y va aparte: anónima y agregada, sin usuario. Ver docs/LAUNCH-CHECKLIST.md.)

import { useSyncExternalStore } from 'react';

const CLAVE = 'tl_busquedas_recientes';
const MAX = 5;
const DIAS = 30;
const MS = DIAS * 24 * 60 * 60 * 1000;

export type Reciente = { q: string; ts: number };

function leerCrudo(): Reciente[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CLAVE);
    if (!raw) return [];
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter((r): r is Reciente => !!r && typeof r.q === 'string' && typeof r.ts === 'number')
      .slice(0, MAX);
  } catch {
    // Un `localStorage` lleno o bloqueado (modo privado de iOS) no puede tirar
    // el buscador: sin recientes se sigue buscando igual.
    return [];
  }
}

function escribir(lista: Reciente[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, MAX)));
  } catch { /* sin sitio: se pierde el historial, no la búsqueda */ }
}

/** Las recientes vivas: las de los últimos 30 días, de la más nueva a la más vieja. */
export function leerRecientes(): Reciente[] {
  const corte = Date.now() - MS;
  const vivas = leerCrudo().filter((r) => r.ts > corte);
  // Se limpia al leer, no con un temporizador: así una pestaña abierta un mes
  // tampoco enseña lo caducado.
  if (vivas.length !== leerCrudo().length) escribir(vivas);
  return vivas;
}

/** Guarda una búsqueda. Si ya estaba, sube al principio en vez de duplicarse. */
export function guardarReciente(q: string): void {
  const limpio = q.trim();
  if (limpio.length < 2) return;
  const clave = limpio.toLowerCase();
  const resto = leerRecientes().filter((r) => r.q.toLowerCase() !== clave);
  escribir([{ q: limpio, ts: Date.now() }, ...resto]);
  notificar();
}

export function borrarReciente(q: string): void {
  const clave = q.trim().toLowerCase();
  escribir(leerRecientes().filter((r) => r.q.toLowerCase() !== clave));
  notificar();
}

export function borrarTodasLasRecientes(): void {
  escribir([]);
  notificar();
}

// ── La lista, viva ────────────────────────────────────────────────────────
// `localStorage` no avisa de sus propios cambios dentro de la misma pestaña, así
// que quien pinte la lista tiene que enterarse por otro lado. La primera versión
// lo resolvía refrescando A MANO desde los dos sitios que escribían — y el Enter
// no pasaba por ninguno de los dos: la lista se quedaba vieja hasta recargar la
// página. Lo reportó el fundador el 2026-08-04.
//
// Se arregla donde no se puede olvidar: aquí. Cualquier escritura avisa, y quien
// use `useRecientes()` se entera sola. No hay «sitios que acordarse de tocar».
const oyentes = new Set<() => void>();
let cache: Reciente[] | null = null;
const VACIO: Reciente[] = [];

function notificar(): void {
  cache = null;                 // la próxima lectura vuelve a mirar el almacén
  oyentes.forEach((f) => f());
}

function suscribir(f: () => void): () => void {
  oyentes.add(f);
  // Y si el cambio viene de OTRA pestaña, el navegador sí lo avisa por aquí.
  const deOtraPestana = (e: StorageEvent) => { if (e.key === CLAVE) notificar(); };
  window.addEventListener('storage', deOtraPestana);
  return () => { oyentes.delete(f); window.removeEventListener('storage', deOtraPestana); };
}

// `useSyncExternalStore` exige que dos lecturas seguidas devuelvan el MISMO
// objeto si nada cambió; por eso la caché, y por eso `notificar` la invalida.
function instantanea(): Reciente[] {
  if (cache === null) cache = leerRecientes();
  return cache;
}

/** Las búsquedas recientes, siempre al día. */
export function useRecientes(): Reciente[] {
  return useSyncExternalStore(suscribir, instantanea, () => VACIO);
}
