'use client';

// Shared UI primitives — compose every screen from these; don't fork markup.

import { IconX as X } from '@tabler/icons-react';
import { imgUrl, ANCHO } from '@/lib/img';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useScrollLock } from '@/lib/scrollLock';
import { useLang } from '@/lib/i18n';
import { textoSobre } from '@/lib/paleta';

/**
 * Logotipo de la marca — el globo con América en negativo.
 *
 * FUENTE ÚNICA: este trazo es el mismo que `apps/web/public/logo-tolatino.svg`
 * y el que usa `scripts/make-brand-assets.mjs` para generar los iconos y la
 * imagen para redes. Va INCRUSTADO (no `<img src>`) para que herede el color
 * del sitio donde se ponga y no cueste una petición más.
 *
 * Sustituye al rombo ámbar que se usaba de marcador mientras no había logotipo.
 */
export function LogoMark({ size = 16, color = '#FF2D6F', className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 482 482" fill="none" aria-hidden focusable="false" className={className}
         style={{ width: size, height: size, flex: 'none' }}>
      <path fill={color} d="M241 0C374.101 0 482 107.899 482 241C482 368.894 382.378 473.519 256.5 481.509V450.929L381.533 334.135C382.856 332.899 383.895 331.39 384.577 329.714L418.577 246.214C420.824 240.696 418.864 234.358 413.894 231.072L294.394 152.072C292.802 151.02 290.991 150.347 289.102 150.103L288.723 150.06L205.263 141.857L151.825 107.028C151.144 106.585 150.422 106.208 149.668 105.904L117.808 93.0771L110.363 43.1562C110.159 41.785 109.729 40.4722 109.104 39.2637C147 14.4373 192.314 0 241 0ZM57.3691 122.079C58.9823 126.176 62.6321 129.122 66.9775 129.835L155.481 144.344L181.041 163.33L159.012 237.961C157.746 242.248 158.867 246.885 161.95 250.122L218.336 309.304L199.104 457.391C198.508 461.983 200.499 466.528 204.279 469.203L221.23 481.199C97.3773 471.143 0 367.444 0 241C0 187.108 17.6887 137.348 47.5771 97.209L57.3691 122.079ZM297 91.5V116.5H308.5V91.5H297ZM241 113.5H282.5V88.5H241V113.5ZM187.655 61.1211C184.505 59.3389 180.743 59.0113 177.341 60.2119L177.013 60.333L157.513 67.833L166.487 91.167L180.48 85.7842L213.345 104.379L225.655 82.6211L187.655 61.1211Z" />
    </svg>
  );
}

/** La marca escrita: To’Latino + el logotipo.
 *
 *  Sigue la regla del sistema (handoff 2026-08-20): Bricolage Grotesque 800,
 *  tracking −.045em, y **el APÓSTROFO es lo que va en color, nunca en tinta**.
 *  Antes el color se lo llevaba la palabra «Latino» entera; ahora el nombre se
 *  lee de una pieza y el acento es ese único signo, que es de donde sale la
 *  marca (el apóstrofo del «to’» dominicano). */
export function Wordmark({ size = 'md', onClick }: { size?: 'sm' | 'md' | 'lg'; onClick?: () => void }) {
  const fs = size === 'lg' ? 21 : size === 'md' ? 20 : 18;
  const px = size === 'lg' ? 'text-[21px]' : size === 'md' ? 'text-[20px]' : 'text-[18px]';
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-baseline font-display font-extrabold tracking-display-lg text-ink ${px} ${onClick ? 'cursor-pointer' : ''}`}
    >
      To<span className="text-primary">&rsquo;</span>Latino
      <LogoMark size={Math.round(fs * 0.88)} className="ml-1 self-center" />
    </span>
  );
}

/** Sello de verificado.
 *
 *  MORADO, no el acento de marca. Es una de las cinco entradas de la tabla de
 *  estado del sistema (`verified` #7C3AED sobre #F3EEFF) y tiene que
 *  distinguirse de un CTA: un sello que comparte color con el botón de comprar
 *  deja de leerse como una garantía y pasa a leerse como decoración. */
export function VerifiedBadge({ size = 19 }: { size?: number }) {
  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-full bg-verified"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

/** Titular de pantalla — Bricolage Grotesque, la tipografía de DISPLAY.
 *  El sistema la reserva para titulares, precios grandes y cifras de héroe; el
 *  resto de la interfaz va en Onest. `as` permite el nivel semántico correcto
 *  sin cambiar el tamaño. */
export function Display({
  children, level = 3, as, className = '',
}: { children: ReactNode; level?: 1 | 2 | 3; as?: 'h1' | 'h2' | 'h3' | 'div'; className?: string }) {
  const T = as ?? (level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3');
  const esc = level === 1
    ? 'text-[34px] md:text-[56px] font-extrabold tracking-display-lg'
    : level === 2
      ? 'text-[26px] md:text-[34px] font-bold tracking-display-lg'
      : 'text-[20px] md:text-[24px] font-bold tracking-display';
  return <T className={`font-display text-ink ${esc} ${className}`}>{children}</T>;
}

/** Antetítulo en versalitas — Space Mono. Es el acento «light sci-fi» del
 *  sistema: se usa para rotular una sección, nunca para texto corrido. */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-[11px] uppercase tracking-eyebrow text-muted ${className}`}>
      {children}
    </span>
  );
}

/** Precio. Bricolage 700 con cifras de ancho fijo (`tabular-nums`), que es lo
 *  que evita que una lista de precios baile de fila en fila. */
export function Price({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-display font-bold tabular-nums text-ink ${className}`}>{children}</span>;
}

/**
 * El logo de un negocio en el lado del cliente: su imagen si la subió, y si no
 * un MONOGRAMA con sus iniciales sobre el color de su rubro.
 *
 * Por qué existe (decisión del fundador, 2026-08-05). Antes, un negocio sin
 * logo salía como un cuadrado rayado VACÍO — un listado lleno de huecos grises,
 * justo lo contrario de la confianza que tiene que dar. Se descartó tirar de un
 * servicio de avatares externo (dicebear, ui-avatars): sería una petición a un
 * tercero cada vez que alguien abre el listado, y a escala eso es una
 * dependencia en el camino crítico. Esto se pinta solo, sin red y sin guardar
 * nada.
 *
 * Se eligió monograma y no un icono del rubro a propósito: con iconos, las 36
 * barberías de una ciudad se verían IGUAL. Las iniciales distinguen cada
 * negocio y el color ya dice de qué es. Mismo criterio que Gmail o Slack.
 *
 * El panel del dueño tiene su propia versión (`bizAvatar` en `Panel.tsx`), que
 * colorea por PLAN en vez de por rubro — es intencional allí y no se toca.
 */
export function BizLogo({ name, logoUrl, color = '#FF2D6F', size = 84, radius = 14, className = '' }: {
  name: string;
  logoUrl?: string | null;
  /** Color del rubro (`tile_b` del negocio). */
  color?: string;
  size?: number;
  radius?: number;
  className?: string;
}) {
  const initials = (name || '')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'TL';
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imgUrl(logoUrl, ANCHO.icono)} alt=""
        className={`flex-none border border-line object-cover ${className}`}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`flex flex-none items-center justify-center font-extrabold leading-none ${className}`}
      style={{
        width: size, height: size, borderRadius: radius, color: textoSobre(color),
        // El mismo degradado que usa el paso "Logo y fotos" del alta, para que
        // el dueño vea en el listado exactamente lo que se le enseñó al publicar.
        background: `linear-gradient(140deg, ${color}, #FF2D6F)`,
        fontSize: Math.round(size * 0.34),
        letterSpacing: '-.02em',
      }}
    >
      {initials}
    </span>
  );
}

/**
 * Paginación de una lista de resultados.
 *
 * POR QUÉ ES UN COMPONENTE Y NO ESTÁ COPIADO EN CADA PANTALLA. Lo reportó el
 * fundador el 2026-08-05: al tocar la página 2 en Negocios, la vista se quedaba
 * ABAJO, en los propios botones, y había que subir a mano para ver los
 * resultados nuevos. El mismo bloque estaba duplicado en Negocios y en Eventos,
 * así que el mismo fallo estaba en las dos. Ahora vive aquí una sola vez: quien
 * pagine, sube.
 *
 * Sube al principio de la LISTA (no al tope absoluto de la página) descontando
 * la altura del encabezado pegajoso, que se mide en vivo — el mismo criterio de
 * «sin números mágicos» que ya usa Comunidad. Así la primera tarjeta queda justo
 * debajo del encabezado y no escondida detrás.
 *
 * El salto es instantáneo a propósito: la lista entera cambió, no hay
 * continuidad visual que preservar, y un desplazamiento suave por una lista
 * larga se siente lento (mismo comportamiento que Amazon o Yelp).
 */
export function Paginacion({ page, totalPages, onChange, listaRef, resumen }: {
  page: number;
  totalPages: number;
  onChange: (n: number) => void;
  /** Contenedor de los resultados: es a donde se sube al cambiar de página. */
  listaRef?: { current: HTMLElement | null };
  /** Texto opcional a la derecha, p. ej. «1–6 de 50». */
  resumen?: ReactNode;
}) {
  if (totalPages <= 1) return null;

  const ir = (n: number) => {
    const destino = Math.min(totalPages, Math.max(1, n));
    if (destino === page) return;
    onChange(destino);
    if (typeof window === 'undefined') return;
    // Después del repintado: si se sube antes, se mide la lista vieja.
    window.requestAnimationFrame(() => {
      const lista = listaRef?.current;
      if (!lista) { window.scrollTo({ top: 0 }); return; }
      const header = document.querySelector('header');
      const alto = header instanceof HTMLElement ? header.offsetHeight : 0;
      const y = lista.getBoundingClientRect().top + window.scrollY - alto - 8;
      window.scrollTo({ top: Math.max(0, y) });
    });
  };

  const flecha = 'flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border-[1.5px] border-lilac-line bg-white';
  return (
    <div className="mt-5 flex items-center justify-center gap-2">
      <button onClick={() => ir(page - 1)} aria-label="Anterior" className={`${flecha} ${page > 1 ? 'cursor-pointer' : 'opacity-40'}`}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => ir(n)}
          aria-current={n === page ? 'page' : undefined}
          className={`flex h-[34px] min-w-[34px] cursor-pointer items-center justify-center rounded-[10px] border-[1.5px] px-2 text-[12.5px] font-extrabold ${
 n === page ? 'border-primary bg-primary text-white shadow-cta-sm' : 'border-lilac-line bg-white text-ink-soft'
 }`}
        >
          {n}
        </button>
      ))}
      <button onClick={() => ir(page + 1)} aria-label="Siguiente" className={`${flecha} ${page < totalPages ? 'cursor-pointer' : 'opacity-40'}`}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
      {resumen && <span className="ml-2 text-[11.5px] font-bold text-muted">{resumen}</span>}
    </div>
  );
}

export function Avatar({
  initials,
  color,
  size = 44,
  className = '',
  /** Foto de perfil. Si falta o no carga, quedan las iniciales debajo. */
  src,
  /** Redondez en px. Por defecto círculo; el alta lo pide cuadrado-redondeado. */
  radius,
}: {
  initials: string;
  color?: string;
  size?: number;
  className?: string;
  src?: string | null;
  radius?: number;
}) {
  // Una URL rota (archivo borrado, sin red) no puede dejar un cuadro gris: al
  // fallar la carga se descarta la foto y vuelven las iniciales.
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const photo = src && !broken ? src : null;

  return (
    <span
      // La tinta de las iniciales NO es fija: el color del avatar llega de la
      // base (`profiles.avatar_color`) y puede ser claro. Con blanco fijo, unas
      // iniciales sobre el ámbar del sistema daban 1.8 de contraste.
      // `aria-hidden` en las iniciales: el nombre de la persona va SIEMPRE al
      // lado, así que leerlas en voz alta es repetir. (Y de paso las saca del
      // umbral de contraste del arnés, donde son un icono, no texto.)
      aria-hidden
      className={`relative flex flex-none items-center justify-center overflow-hidden font-extrabold ${className}`}
      style={{ width: size, height: size, background: color, color: textoSobre(color ?? "#FF2D6F"), fontSize: size * 0.34, borderRadius: radius ?? '50%' }}
    >
      {initials}
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- export estático: sin optimizador de imágenes
        <img
          src={imgUrl(photo, ANCHO.icono)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}

/** The signed-in "TÚ" avatar (lilac). */
export function YouAvatar({ size = 40, onClick }: { size?: number; onClick?: () => void }) {
  const { L } = useLang();
  return (
    <button
      onClick={onClick}
      className="tap flex flex-none cursor-pointer items-center justify-center rounded-full border-2 border-lilac-ring bg-lilac font-extrabold text-primary-dark"
      style={{ width: size, height: size, fontSize: 12 }}
      aria-label={L('Tu cuenta', 'Your account')}
    >
      {L('TÚ', 'YOU')}
    </button>
  );
}

export function Chip({
  active,
  children,
  onClick,
  className = '',
  style,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={style}
      // Inactivo = el terciario del sistema (blanco con borde de 1.5px). Antes
      // era una sombra interior, que a escala 2× de un móvil se veía difusa y
      // hacía que la fila de filtros pareciera desenfocada.
      className={`tap-y flex-none whitespace-nowrap rounded-full px-[15px] py-2 text-[12.5px] font-extrabold transition-colors ${
 active
 ? 'bg-primary text-white shadow-cta-sm'
 : 'border-[1.5px] border-sys-line-strong bg-white text-ink-soft'
 } ${className}`}
    >
      {children}
    </button>
  );
}

/** On/off toggle. The visual pill stays compact, but the tappable area is ≥44px
 *  (mobile touch minimum) and colors come from tokens — never raw hex. Replaces
 *  the hand-rolled per-screen switches. */
export function Switch({ on, onClick, big, label }: { on: boolean; onClick: () => void; big?: boolean; label?: string }) {
  const w = big ? 44 : 40;
  const h = big ? 26 : 24;
  const k = h - 6;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className="relative flex min-h-11 flex-none cursor-pointer items-center"
      style={{ width: w }}
    >
      <span
        className={`relative block w-full rounded-full transition-colors ${on ? 'bg-primary' : 'bg-lilac-ring'}`}
        style={{ height: h }}
      >
        <span
          className="absolute top-[3px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,.18)] transition-all"
          style={{ width: k, height: k, left: on ? w - k - 3 : 3 }}
        />
      </span>
    </button>
  );
}

export function SoonTag({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-amber-bg px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-[.03em] text-amber-ink">
      {label}
    </span>
  );
}

/**
 * Responsive overlay: bottom sheet on mobile, centered dialog (or side panel)
 * on ≥768px — per handoff modal specs.
 */
export function Overlay({
  open,
  onClose,
  children,
  align = 'center',
  width = 460,
  fullHeightSheet = false,
  zIndex,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'center' | 'right' | 'top';
  width?: number;
  fullHeightSheet?: boolean;
  // Base overlays share z-index 70. Pass a higher value for an overlay that must
  // stack ABOVE another open overlay (e.g. a confirm/customize sheet opened from
  // WITHIN the cart) — with equal z-index the later-in-DOM overlay would win and
  // hide it.
  zIndex?: number;
}) {
  useScrollLock(open); // lock background scroll while this overlay is open (site-wide)
  // Una hoja no era un diálogo: sin `role`, sin Escape, sin trampa de foco y sin
  // devolver el foco al cerrar. Con el teclado te salías de la hoja sin que ella
  // se enterara y seguías tabulando por el feed de detrás; con lector de pantalla
  // no se anunciaba nada. (2ª auditoría de Comunidad, 2026-08-03.)
  const caja = useRef<HTMLDivElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);
  // `onClose` llega casi siempre como una flecha nueva en cada render del padre
  // (`onClose={close}` con `const close = () => …`). Si el efecto dependiera de
  // ella, se DESMONTARÍA Y VOLVERÍA A MONTAR en cada render — y su limpieza
  // devuelve el foco al elemento anterior. Resultado: escribías una letra, el
  // padre re-renderizaba, y el foco saltaba fuera del campo; en el teléfono se
  // cerraba el teclado y en escritorio había que volver a hacer clic tras cada
  // letra. Por eso el manejador vive en una ref y el efecto solo depende de
  // `open`. (Regresión mía del 2026-08-03 al convertir la hoja en diálogo;
  // reportada por el fundador el 2026-08-04.)
  const alCerrar = useRef(onClose);
  alCerrar.current = onClose;
  useEffect(() => {
    if (!open) return;
    focoPrevio.current = document.activeElement as HTMLElement | null;
    // El primer control de la hoja recibe el foco; si no hay ninguno, la caja.
    const t = window.setTimeout(() => {
      const c = caja.current;
      if (!c) return;
      const foco = c.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      (foco ?? c).focus({ preventScroll: true });
    }, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); alCerrar.current(); return; }
      if (e.key !== 'Tab') return;
      const c = caja.current;
      if (!c) return;
      const focos = [...c.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focos.length === 0) return;
      const primero = focos[0], ultimo = focos[focos.length - 1];
      // El foco da la vuelta DENTRO de la hoja en vez de escaparse al fondo.
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey, true);
      focoPrevio.current?.focus?.({ preventScroll: true });
    };
    // OJO: `onClose` NO va aquí a propósito — ver la nota de `alCerrar` arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!open) return null;
  const desktopAlign =
    align === 'right'
      ? 'md:items-start md:justify-end md:p-[14px]'
      : align === 'top'
        ? 'md:items-start md:justify-center md:p-10'
        : 'md:items-center md:justify-center md:p-6';
  return (
    <div
      style={zIndex != null ? { zIndex } : undefined}
      className={`fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(30,27,46,.45)] ${desktopAlign}`}
      onClick={onClose}
    >
      <div
        ref={caja}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ ['--w' as string]: `${width}px` }}
        className={`w-full overflow-y-auto rounded-t-panel bg-white p-4 pb-7 shadow-sheet outline-none md:w-[var(--w)] md:max-w-[calc(100%-28px)] md:rounded-card md:p-5 md:shadow-modal ${
 fullHeightSheet ? 'h-[90%] md:h-auto md:max-h-[min(640px,calc(100%-40px))]' : 'max-h-[88%] md:max-h-[calc(100%-24px)]'
 }`}
      >
        {children}
      </div>
    </div>
  );
}

export function OverlayTitle({ title, onClose, onBack }: { title: string; onClose: () => void; onBack?: () => void }) {
  const { L } = useLang();
  return (
    <div className="mb-3 flex items-center gap-2">
      {onBack && (
        <button
          onClick={onBack}
          className="tap flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2"
          aria-label={L('Atrás', 'Back')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-ink">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      <div className="text-[16px] font-extrabold text-ink">{title}</div>
      <button
        onClick={onClose}
        className="tap ml-auto flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink-2"
        aria-label={L('Cerrar', 'Close')}
      >
        <X size={15} stroke={2.8} />
      </button>
    </div>
  );
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-card border border-line bg-white ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function Stars({ className = '', rating }: { className?: string; rating?: number }) {
  // Con una calificación se pintan estrellas proporcionales (llenas vs
  // apagadas) — nunca un ★★★★★ plano sobre un 3.2 real. Sin ella (uso
  // decorativo/marketing), se dejan las cinco.
  //
  // `aria-hidden` no es un adorno: las estrellas SIEMPRE van acompañadas del
  // número («4.8 · 5 reseñas»), que es quien lleva el dato. Para un lector de
  // pantalla, leer «estrella estrella estrella…» además del número es ruido. Y
  // sirve de paso para el arnés de contraste: el ámbar del sistema da 1.8
  // sobre blanco, insuficiente para TEXTO — pero esto no es texto, es un icono
  // dibujado con un carácter, y el dato legible está al lado.
  if (rating == null || !Number.isFinite(rating)) {
    return <span aria-hidden className={`font-bold tracking-[1px] text-amber ${className}`}>★★★★★</span>;
  }
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span aria-hidden className={`font-bold tracking-[1px] ${className}`}>
      <span className="text-amber">{'★'.repeat(full)}</span>
      <span className="text-lilac-line">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

/** Estado vacío — tarjeta de borde discontinuo, azulejo de icono teñido, una
 *  línea de texto y UNA acción (spec del sistema).
 *
 *  `icon` y `action` son opcionales para no romper las ~40 llamadas que ya
 *  existen: sin ellos se comporta igual que antes. Pero un vacío sin salida es
 *  un callejón — cuando haya una acción posible, pásala. */
export function EmptyState({
  title, sub, icon, action,
}: { title: string; sub?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-lilac-ring bg-white p-8 text-center">
      {icon && (
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-tile bg-tint-lilac text-primary-dark">
          {icon}
        </span>
      )}
      <div className="text-[13.5px] font-bold text-ink-soft">{title}</div>
      {sub && <div className="mt-1 text-[12px] font-semibold text-muted">{sub}</div>}
      {action && <div className="mx-auto mt-4 max-w-[240px]">{action}</div>}
    </div>
  );
}

/** Esqueletos de carga — se enseñan mientras llegan los datos de verdad, para
 *  que ninguna pantalla parpadee con contenido de ejemplo. `card` = tarjeta con
 *  imagen (Negocios/Eventos); `post` = publicación del muro (Comunidad). Las
 *  clases de rejilla de cada pantalla se pasan por `className`.
 *
 *  El brillo que recorre la pieza es `tlShine`, la animación del sistema
 *  (handoff 2026-08-20). Sustituye al `animate-pulse` de Tailwind, que apaga y
 *  enciende el bloque entero: a pantalla completa parpadeaba, y el barrido de
 *  izquierda a derecha se lee como «está cargando» en vez de como un error. */
const BRILLO = 'animate-shine bg-[linear-gradient(90deg,#F1EEFA_0%,#FCFBFF_50%,#F1EEFA_100%)] bg-[length:200%_100%]';

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      <div className={`aspect-[16/10] w-full ${BRILLO}`} />
      <div className="flex flex-col gap-2 p-3.5">
        <div className={`h-3.5 w-2/3 rounded ${BRILLO}`} />
        <div className={`h-3 w-1/2 rounded ${BRILLO}`} />
        <div className={`h-3 w-1/3 rounded ${BRILLO}`} />
      </div>
    </div>
  );
}
function SkeletonPost() {
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 flex-none rounded-full ${BRILLO}`} />
        <div className="flex flex-col gap-1.5">
          <div className={`h-3 w-28 rounded ${BRILLO}`} />
          <div className={`h-2.5 w-20 rounded ${BRILLO}`} />
        </div>
      </div>
      <div className="mt-3.5 flex flex-col gap-2">
        <div className={`h-3 w-full rounded ${BRILLO}`} />
        <div className={`h-3 w-11/12 rounded ${BRILLO}`} />
        <div className={`h-3 w-2/3 rounded ${BRILLO}`} />
      </div>
    </div>
  );
}
export function SkeletonList({ count = 6, variant = 'card', className = '' }: { count?: number; variant?: 'card' | 'post'; className?: string }) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }, (_, i) => (variant === 'post' ? <SkeletonPost key={i} /> : <SkeletonCard key={i} />))}
    </div>
  );
}

/** ─────────────────────────────────────────────────────────────────────────
 *  LOS CUATRO BOTONES DEL SISTEMA (handoff 2026-08-20).
 *
 *  Hasta ahora la app tenía UNO (`PrimaryBtn`) y cada pantalla se inventaba el
 *  resto con clases sueltas. El sistema define cuatro, y cada uno dice algo
 *  distinto — por eso importan:
 *    · Principal  degradado Calor. La acción de la pantalla. UNA por pantalla.
 *    · Secundario relleno de tinta. La otra acción de peso (guardar, seguir).
 *    · Terciario  blanco con borde. La salida sin consecuencias (cancelar).
 *    · Callado    relleno teñido + texto de acento. Acción menor dentro de una
 *                 tarjeta, donde un botón de verdad gritaría.
 *  ───────────────────────────────────────────────────────────────────────── */

/** Tamaño y forma comunes. Radio 16 y 44px de alto mínimo (zona de toque). */
const BOTON = 'inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-btn px-[26px] py-[13px] text-[14px] font-extrabold disabled:cursor-not-allowed';

/** Botón principal — el degradado Calor de la marca.
 *
 *  El `hover:-translate-y-0.5` es del handoff («lifts 2px on hover») y solo se
 *  nota en escritorio.
 *
 *  NO lleva `transition-colors`, a propósito (2026-08-05): el fundador notaba
 *  que el botón «tardaba en activarse» al completar un paso del alta. La
 *  transición fundía el gris→color en vez de cambiarlo al instante, y en un
 *  teléfono ese fundido se lee como retraso. Habilitarse es un cambio de
 *  ESTADO, no una animación. Solo se anima el desplazamiento. */
export function PrimaryBtn({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${BOTON} text-white transition-transform duration-150 ${
        disabled ? 'bg-lilac-ring' : 'bg-calor shadow-cta hover:-translate-y-0.5'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Botón secundario — relleno de tinta. */
export function SecondaryBtn({
  children, onClick, disabled, className = '',
}: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${BOTON} text-white ${disabled ? 'bg-lilac-ring' : 'bg-ink'} ${className}`}>
      {children}
    </button>
  );
}

/** Botón terciario — blanco con borde de 1.5px. */
export function TertiaryBtn({
  children, onClick, disabled, className = '',
}: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${BOTON} border-[1.5px] border-sys-line-strong bg-white text-ink disabled:text-muted-2 ${className}`}>
      {children}
    </button>
  );
}

/** Botón callado — relleno teñido, texto de acento. */
export function QuietBtn({
  children, onClick, disabled, className = '',
}: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${BOTON} bg-tint-pink text-primary-dark disabled:text-muted-2 ${className}`}>
      {children}
    </button>
  );
}
