// instalar.ts — saber si la app se puede instalar, y en qué teléfono estamos.
//
// DE DÓNDE SALE: el fundador quiere que la app «esté presente en el teléfono»
// (2026-08-06). No hace falta construir una app nativa para eso: el manifiesto
// ya declara `display: standalone` con sus iconos, así que añadirla a la
// pantalla de inicio ya da icono, pantalla completa y —clave— notificaciones
// con la app cerrada. Lo que faltaba es que NADIE sabía que podía hacerlo: no
// había ni un botón ni una instrucción en toda la app.
//
// LOS DOS CAMINOS SON DISTINTOS DE VERDAD, y por eso este archivo existe:
//  · Android/Chrome dispara `beforeinstallprompt`. Se guarda el evento y se
//    lanza el instalador REAL del sistema cuando el usuario toca el botón.
//  · iPhone NO tiene instalador: el usuario tiene que ir a Compartir → «Añadir
//    a pantalla de inicio» A MANO. Ahí lo único que se puede hacer es enseñarle
//    exactamente dónde tocar. Si no, no lo encuentra nadie.
//
// Y en los dos casos: si la app YA está instalada, no se enseña nada.

/** ¿La app se está viendo ya instalada (desde el icono, sin barra del navegador)? */
export function yaInstalada(): boolean {
  if (typeof window === 'undefined') return false;
  // `standalone` es la marca de Apple; `display-mode` la del estándar.
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

/** iPhone/iPad en Safari — el único camino es a mano. */
export function esIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  // El iPad moderno se anuncia como Mac; se distingue porque tiene tacto.
  const ipadOS = /Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document;
  return /iPhone|iPad|iPod/.test(ua) || ipadOS;
}

/** Safari de verdad (en iOS, Chrome y Firefox son Safari por dentro, pero su
 *  menú Compartir NO ofrece «Añadir a pantalla de inicio»). */
export function esSafariIOS(): boolean {
  if (!esIOS() || typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

/** Escritorio: la invitación no aplica (el objetivo es el teléfono). */
export function esEscritorio(): boolean {
  if (typeof window === 'undefined') return true;
  return !esIOS() && !/Android|Mobile/.test(window.navigator.userAgent);
}

// ── Memoria de «ahora no» ───────────────────────────────────────────────────
// Descartar no puede ser para siempre (perderíamos a quien lo cerró sin leer)
// ni para siempre-jamás-preguntar (sería acoso). Se calla 14 días.
const CLAVE = 'tl.instalar.pospuesto';
const DIAS = 14;

export function posponer(): void {
  try { localStorage.setItem(CLAVE, String(Date.now())); } catch { /* modo privado */ }
}

export function pospuesta(): boolean {
  try {
    const t = Number(localStorage.getItem(CLAVE) ?? 0);
    return Boolean(t) && Date.now() - t < DIAS * 86400000;
  } catch { return false; }
}

// ── El instalador real de Android ───────────────────────────────────────────
// Chrome dispara `beforeinstallprompt` ANTES de que exista nuestro componente,
// así que se captura lo antes posible (desde el layout) y se guarda aquí.
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let guardado: PromptEvent | null = null;
const oyentes = new Set<() => void>();

export function capturarPrompt(): () => void {
  if (typeof window === 'undefined') return () => {};
  const alPreguntar = (e: Event) => {
    e.preventDefault(); // sin esto Chrome pone su propia barra, fuera de nuestro diseño
    guardado = e as PromptEvent;
    oyentes.forEach((f) => f());
  };
  const alInstalar = () => { guardado = null; oyentes.forEach((f) => f()); };
  window.addEventListener('beforeinstallprompt', alPreguntar);
  window.addEventListener('appinstalled', alInstalar);
  return () => {
    window.removeEventListener('beforeinstallprompt', alPreguntar);
    window.removeEventListener('appinstalled', alInstalar);
  };
}

export function hayPromptNativo(): boolean { return guardado != null; }

export function suscribirPrompt(f: () => void): () => void {
  oyentes.add(f);
  return () => { oyentes.delete(f); };
}

/** Lanza el instalador del sistema (Android). Devuelve si aceptó. */
export async function instalarNativo(): Promise<boolean> {
  if (!guardado) return false;
  const ev = guardado;
  guardado = null;
  oyentes.forEach((f) => f());
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  return outcome === 'accepted';
}
