/* 9t · Objetivos táctiles de 44 px (Apple HIG 44 pt, WCAG 2.5.5) SIN cambiar lo que se ve.

   Muchos controles del sistema miden menos de lo que pide un dedo (íconos de 30–36 px, chips de 35, filas compactas) y agrandarlos cambia el
   diseño aprobado. El primer intento (19 nov, revertido) agrandaba un `::after` invisible de cada control: el área de uno tapaba la caja de un
   control de OTRO contenedor (los topes por grupo solo sabían de los hermanos) y le robaba el toque («To’Latino» encima de «Ver las 3 fotos»;
   los clics de menu2b, rsv2e, apt4f, apt4q, fic4id y avisos2j caducaban). Además, volver `position: relative` a cada control cambiaba pixeles.

   Ahora el área se decide EN EL MOMENTO DEL TOQUE, con lo que el navegador de verdad tiene debajo del dedo (como el TouchDelegate de Android):
   no se agrega ni un estilo ni un elemento, así que la página es la misma pixel a pixel, y un toque que cae en la caja de un control o de un
   campo es SIEMPRE de ese control o campo, esté en el contenedor que esté. Solo un toque que cayó en NADA tocable se le da al control más
   cercano, si está a su alcance:

   1. Solo dedo o lápiz (pointerType touch / pen), un toque corto que no se movió (si la página se desplaza, el navegador lo cancela). El
      ratón es preciso y doble clic sobre un texto lo selecciona: con el ratón no hay área ampliada.
   2. Lo que hay debajo del dedo (elementFromPoint) no es ni está dentro de nada accionable (ACCIONABLE: controles, enlaces, campos, etiquetas,
      lienzos, videos, marcos, lo arrastrable, `data-toque="no"`). Si lo es, el toque es suyo y aquí no se hace nada.
   3. Lo de debajo no tiene acción propia: ni cursor de mano (una fila que abre el plato) ni un manejador de clic o de puntero de React entre
      él y el control (el mapa que arrastra, la galería que desliza, el fondo de una hoja que la cierra).
   4. El más cercano de todo lo accionable que se VE (su punto más cercano al dedo no está tapado) es un control (CONTROL) y el dedo está en
      su área de 44 × 44: su caja agrandada lo que le falta para 44, repartido a los dos lados (un control de 44 o más no crece). Si lo más
      cercano es un campo, una etiqueta u otro control fuera de su área, o hay empate, no se hace nada: entre dos vecinos, cada uno se queda
      con su mitad del hueco y nadie toca la caja del otro.
   5. El control está en la misma capa que lo tocado (la misma hoja, el mismo encabezado fijo; si no, el fondo de una hoja o el encabezado
      que flota encima del contenido le darían el toque a lo de abajo).
   Entonces se le da el clic al control (`click()`: su onClick, su enlace, su casilla), y el clic del navegador que llega después de ese
   mismo toque se descarta (si la hoja que abrió quedó bajo el dedo, no se toca nada en ella; el próximo toque ya no se descarta).

   Lo mide a11y9c sobre lo servido (pruebas/lib/toque.cjs): que nadie reciba un toque en la caja de otro control o campo, que cada control del
   sistema reciba el toque en 44 × 44 o lo limite un vecino, que un toque real con el dedo junto a un control llegue a ese control, y que la
   página con esto y sin esto sea la misma pixel a pixel. Guardián: toqueDe44. Al revés: alreves9ttoque2. */

export const TOQUE_MIN = 44;
/* Lo que es de alguien: un toque aquí es suyo (o del navegador) y nunca se reparte. */
export const ACCIONABLE = [
  "a[href]", "button", "input", "select", "textarea", "label", "summary", "option",
  "[role=button]", "[role=link]", "[role=tab]", "[role=radio]", "[role=checkbox]", "[role=switch]", "[role=option]",
  "[role=menuitem]", "[role=menuitemcheckbox]", "[role=menuitemradio]", "[role=slider]", "[role=spinbutton]", "[role=combobox]",
  "[role=textbox]", "[role=searchbox]", "[role=scrollbar]", "[contenteditable]:not([contenteditable=false])",
  "video", "audio", "iframe", "canvas", "embed", "object", "[draggable=true]", "[data-toque=no]",
].join(",");
/* Lo que puede recibir el área ampliada: los controles que se activan con un clic. */
export const CONTROL = [
  "a[href]", "button", "input[type=checkbox]", "input[type=radio]", "summary",
  "[role=button]", "[role=link]", "[role=tab]", "[role=radio]", "[role=checkbox]", "[role=switch]", "[role=option]",
  "[role=menuitem]", "[role=menuitemcheckbox]", "[role=menuitemradio]",
].join(",");
/* Lo que se mueve el dedo y lo que dura un toque (más es arrastrar o mantener). */
const MOVER = 10, LARGO = 800;
/* El clic del navegador que llega después del toque ampliado (antes del próximo toque) se descarta durante este tiempo. Va sin mirar dónde:
   Chrome en Android corrige el punto de un toque hacia lo tocable de al lado («touch adjustment») y ese clic puede llegar movido o a otro. */
const TRAGAR_MS = 700;

/* `quien`: lo accionable más cercano que se ve (a quién se le preguntó), para que la medición sepa si el punto era de un vecino. */
export type Destino = { el: HTMLElement | null; razon: string; quien?: HTMLElement };
type Caja = { left: number; top: number; right: number; bottom: number; width: number; height: number };

const distancia = (r: Caja, x: number, y: number) => Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
/* El área de 44 × 44 de un control: su caja agrandada lo que le falta, repartido a los dos lados. */
export const areaDe = (r: Caja): Caja => {
  const ex = Math.max(0, (TOQUE_MIN - r.width) / 2), ey = Math.max(0, (TOQUE_MIN - r.height) / 2);
  return { left: r.left - ex, top: r.top - ey, right: r.right + ex, bottom: r.bottom + ey, width: r.width + 2 * ex, height: r.height + 2 * ey };
};
const dentroDe = (r: Caja, x: number, y: number) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

/* React guarda los manejadores de cada elemento en una propiedad `__reactProps$…`: un elemento con onClick (o de puntero) tiene acción propia. */
const MANEJADORES = ["onClick", "onClickCapture", "onPointerDown", "onPointerUp", "onMouseDown", "onMouseUp", "onTouchStart", "onTouchEnd"];
const tieneAccion = (e: Element) => {
  const k = Object.keys(e).find((x) => x.startsWith("__reactProps$"));
  const p = k ? (e as unknown as Record<string, Record<string, unknown> | undefined>)[k] : undefined;
  return !!p && MANEJADORES.some((m) => typeof p[m] === "function");
};
/* Un enlace dentro de un párrafo (WCAG 2.5.8 lo exceptúa): crecer pondría el toque de las palabras de al lado en el enlace. */
const enTexto = (e: HTMLElement) => e.tagName === "A" && getComputedStyle(e).display === "inline" && !!e.parentElement
  && (e.parentElement.textContent ?? "").trim().length > (e.textContent ?? "").trim().length + 8;
const apagado = (e: HTMLElement) => (e as HTMLButtonElement).disabled === true || e.getAttribute("aria-disabled") === "true" || !!e.closest("[inert],[aria-hidden=true],[data-toque=no]");

/* Lo que no cambia entre varias preguntas seguidas (la medición de a11y9c pregunta por miles de puntos de la misma pantalla). */
export type Cache = { capa: Map<Element, Element>; lista: { e: HTMLElement; r: Caja }[] | null };
const nuevoCache = (): Cache => ({ capa: new Map(), lista: null });
const accionables = (c: Cache) => (c.lista ??= [...document.querySelectorAll<HTMLElement>(ACCIONABLE + "," + CONTROL)]
  .map((e) => ({ e, r: e.getBoundingClientRect() as Caja })).filter((x) => x.r.width > 0 && x.r.height > 0));
/* La capa: la hoja (diálogo) o lo fijo / pegado más cercano que lo contiene; si no, la página. */
const capaDe = (e: Element, c: Cache): Element => {
  const v = c.capa.get(e); if (v) return v;
  let r: Element = document.documentElement;
  if (e !== document.documentElement && e !== document.body) {
    if (e.matches("dialog,[role=dialog],[role=alertdialog]")) r = e;
    else { const pos = getComputedStyle(e).position; r = pos === "fixed" || pos === "sticky" ? e : e.parentElement ? capaDe(e.parentElement, c) : r; }
  }
  c.capa.set(e, r); return r;
};
/* ¿Se ve el control? (no lo tapa una hoja ni lo corta su carrusel) En su punto más cercano al dedo o, si es redondo (la esquina de su caja
   queda fuera del círculo), en su centro. Si lo que se ve es su centro y el dedo cae en algo que flota encima, lo frena la capa. */
const seVeCerca = (e: HTMLElement, r: Caja, x: number, y: number) => {
  const m = Math.min(2, r.width / 2, r.height / 2);
  const es = (h: Element | null) => !!h && (h === e || e.contains(h));
  return es(document.elementFromPoint(Math.min(Math.max(x, r.left + m), r.right - m), Math.min(Math.max(y, r.top + m), r.bottom - m)))
    || es(document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2));
};
const nombre = (e: Element) => `<${e.tagName.toLowerCase()}${e.getAttribute("role") ? " role=" + e.getAttribute("role") : ""}> «${(e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28)}»`;

/* A quién le toca un toque del dedo en (x, y), que el navegador le daría a `objetivo` (lo de debajo). `el: null` = a nadie más que a lo de
   debajo (el navegador hace lo de siempre); `razon` dice por qué (la usa la medición de a11y9c). */
export function destinoToque(x: number, y: number, objetivo?: Element | null, cache: Cache = nuevoCache()): Destino {
  const t = objetivo === undefined ? document.elementFromPoint(x, y) : objetivo;
  if (!t) return { el: null, razon: "fuera" };
  if (t.closest(ACCIONABLE)) return { el: null, razon: "propio" };
  if (t.closest("[inert]")) return { el: null, razon: "inerte" };
  if (getComputedStyle(t).cursor === "pointer") return { el: null, razon: "clicable" };
  // Lo accionable a menos de 22 px (el área más grande crece 22 de cada lado), del más cercano al más lejano.
  const cerca: { e: HTMLElement; r: Caja; d: number }[] = [];
  for (const { e, r } of accionables(cache)) { const d = distancia(r, x, y); if (d <= TOQUE_MIN / 2) cerca.push({ e, r, d }); }
  cerca.sort((a, b) => a.d - b.d);
  // Lo de adentro de un control (un ícono dentro del botón) no compite con su control: se queda el de afuera.
  const vistos = cerca.filter((c) => !cerca.some((o) => o !== c && o.e.contains(c.e) && o.e.matches(CONTROL)));
  let ganador: { e: HTMLElement; r: Caja; d: number } | null = null;
  for (const c of vistos) {
    if (!seVeCerca(c.e, c.r, x, y)) continue;
    if (ganador) { if (c.d - ganador.d < 0.5 && !ganador.e.contains(c.e) && !c.e.contains(ganador.e)) return { el: null, razon: "empate " + nombre(ganador.e) + " · " + nombre(c.e) }; break; }
    ganador = c;
  }
  if (!ganador) return { el: null, razon: "lejos" };
  const g = ganador.e;
  if (!g.matches(CONTROL) || apagado(g) || enTexto(g)) return { el: null, razon: "vecino " + nombre(g), quien: g };
  if (!dentroDe(areaDe(ganador.r), x, y)) return { el: null, razon: "lejos " + nombre(g), quien: g };
  if (capaDe(t, cache) !== capaDe(g, cache)) return { el: null, razon: "otra capa " + nombre(g), quien: g };
  for (let a: Element | null = t; a && a !== document.documentElement; a = a.parentElement) {
    if (tieneAccion(a)) return { el: null, razon: "clicable", quien: g };
    if (a.contains(g)) break; // hasta el ancestro común (incluido): lo de más arriba recibe el clic igual, venga de donde venga
  }
  return { el: g, razon: "ampliado", quien: g };
}

/* Se instala una vez (apps/web/app/AreaDeToque.tsx, en el layout raíz). Devuelve con qué quitarlo. */
export function instalarToque(w: Window & { __tlToque?: unknown } = window): () => void {
  let toque: { id: number; x: number; y: number; t: number; el: HTMLElement } | null = null;
  let tragar: { hasta: number } | null = null;
  let pausa = false;
  const abajo = (e: PointerEvent) => {
    tragar = null; // el clic del toque anterior ya llegó (o no llega: iOS no lo manda sobre lo que no es tocable)
    toque = null;
    if (pausa || e.pointerType === "mouse" || !e.isPrimary) return;
    const d = destinoToque(e.clientX, e.clientY);
    if (!d.el) return;
    // Es para un control: sin los eventos de ratón de compatibilidad sobre lo de debajo (no le quitan el foco a una hoja que se abra ni
    // empiezan a seleccionar texto). No frena el desplazamiento: eso lo decide touch-action, y si la página se mueve llega pointercancel.
    e.preventDefault();
    toque = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, el: d.el };
  };
  const cancela = () => { toque = null; };
  const arriba = (e: PointerEvent) => {
    const t = toque; toque = null;
    if (!t || e.pointerId !== t.id || !t.el.isConnected) return;
    if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > MOVER || e.timeStamp - t.t > LARGO) return;
    tragar = { hasta: performance.now() + TRAGAR_MS };
    t.el.click();
  };
  const clic = (e: MouseEvent) => {
    const g = tragar;
    // Solo el clic de un puntero (detail > 0): un Enter del teclado da un clic con detail 0 y ese nunca se descarta.
    if (!g || !e.isTrusted || e.detail === 0) return;
    tragar = null;
    if (performance.now() <= g.hasta) { e.preventDefault(); e.stopImmediatePropagation(); }
  };
  const op = { capture: true } as const;
  w.addEventListener("pointerdown", abajo, op);
  w.addEventListener("pointercancel", cancela, op);
  w.addEventListener("pointerup", arriba, op);
  w.addEventListener("click", clic, op);
  // Para medirlo sobre lo servido (pruebas/lib/toque.cjs): la MISMA función que decide cada toque; `destinos` pregunta por muchos puntos de
  // la pantalla tal como está (una sola lectura de las cajas).
  w.__tlToque = {
    version: 2,
    destino: (x: number, y: number) => destinoToque(x, y),
    destinos: (puntos: [number, number][]) => { const c = nuevoCache(); return puntos.map(([x, y]) => destinoToque(x, y, undefined, c)); },
    // a11y9c compara la página con el área y con ella en pausa (toqueInvisible): no pinta nada, así que tienen que ser iguales.
    pausar: (v: boolean) => { pausa = v; toque = null; tragar = null; },
  };
  return () => {
    w.removeEventListener("pointerdown", abajo, op);
    w.removeEventListener("pointercancel", cancela, op);
    w.removeEventListener("pointerup", arriba, op);
    w.removeEventListener("click", clic, op);
    delete w.__tlToque;
  };
}
