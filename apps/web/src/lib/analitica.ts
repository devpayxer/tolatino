'use client';

// Analítica de búsqueda: qué se busca y, sobre todo, qué NO encuentra nada.
//
// Esa segunda lista es la más valiosa que produce la app: es, literalmente, a
// qué negocios hay que ir a tocarles la puerta. Hoy se perdía en cada búsqueda.
//
// ANÓNIMA POR DISEÑO, no por promesa. Lo que uno busca dice mucho de uno —
// salud, dinero, situación migratoria—, y esta app sirve a una comunidad que ya
// vive vigilada. Así que no se manda quién busca: ni usuario, ni sesión. El
// servidor tampoco guarda la hora (solo el día) ni una fila por búsqueda, sino
// un CONTADOR por (día, término, sección, ciudad). Ver la migración 0145.

import { supabase } from '@/lib/supabase';

// Un término solo se cuenta UNA vez por pantalla: el buscador reconsulta al
// cambiar un filtro, y sin esto una sola búsqueda se contaría cinco veces.
const yaContado = new Set<string>();

export function registrarBusqueda(
  termino: string,
  seccion: 'negocios' | 'eventos' | 'comunidad' | 'renta' | 'carros',
  resultados: number,
  ciudad?: string | null,
): void {
  if (!supabase) return;
  const t = termino.trim();
  if (t.length < 2) return;
  const clave = `${seccion}:${t.toLowerCase()}:${resultados === 0 ? '0' : '1'}`;
  if (yaContado.has(clave)) return;
  yaContado.add(clave);
  // Sin `await` y con los errores tragados a propósito: que la analítica falle
  // no puede ralentizar ni romper una búsqueda. Es información, no función.
  void supabase
    .rpc('registrar_busqueda', {
      in_q: t, in_seccion: seccion, in_resultados: resultados, in_ciudad: ciudad ?? null,
    })
    .then(() => {}, () => {});
}
