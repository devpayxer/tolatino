'use client';

// Escribir en la base diciendo la verdad.
//
// POR QUÉ EXISTE: la auditoría de Negocios (2026-08-04) encontró siete sitios
// del panel con el mismo patrón — se pinta el cambio, se lanza la escritura, se
// TIRA el error y se anuncia «listo» pase lo que pase. En el panel de un negocio
// eso no es un detalle: el dueño ve una cita confirmada que el cliente nunca
// recibió, o un pedido rechazado que sigue vivo. Es la misma familia que se
// cerró en Comunidad (guardar y ♥ fingían haber guardado).
//
// Cómo se usa:
//   const err = await escribir(supabase.from('x').update({...}).eq('id', id));
//   if (err) { revertir(); flash(err); return; }
//   flash(L('Guardado', 'Saved'));

type Resultado = { error: { message?: string } | null };

/** Mensaje en español si la escritura falló; `null` si salió bien. */
export async function escribir(
  q: PromiseLike<Resultado>,
  ingles = false,
): Promise<string | null> {
  let error: { message?: string } | null = null;
  try {
    ({ error } = await q);
  } catch (e) {
    // Sin red, la promesa ni siquiera resuelve con `error`.
    error = { message: String(e) };
  }
  if (!error) return null;
  const m = error.message ?? '';
  if (/Demasiadas|rate limit/i.test(m)) {
    return ingles ? 'Too many actions in a row. Wait a moment.' : 'Demasiadas acciones seguidas. Espera un momento.';
  }
  if (/suspend/i.test(m)) {
    return ingles ? 'Your account is temporarily suspended.' : 'Tu cuenta está suspendida temporalmente.';
  }
  if (/row-level security|permission denied|not authorized/i.test(m)) {
    return ingles ? "You don't have permission to do that." : 'No tienes permiso para hacer eso.';
  }
  if (/Failed to fetch|NetworkError|network/i.test(m)) {
    return ingles ? 'No connection. Check your internet.' : 'Sin conexión. Revisa tu internet.';
  }
  return ingles ? "Couldn't save. Try again." : 'No se pudo guardar. Inténtalo de nuevo.';
}
