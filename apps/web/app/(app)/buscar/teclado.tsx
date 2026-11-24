/* Al tocar «Buscar» se escribe al momento (pedido del fundador, 24 nov). iOS y Android solo abren el teclado si el foco llega DENTRO del
   toque, y la caja de verdad todavía no existe: vive en la página de Buscar, que se monta después de navegar. Por eso el toque enfoca al
   instante un campo puente (invisible, 16 px para que iOS no acerque la página) y la página de Buscar, al montarse, le pasa el foco a su
   caja con lo que ya se haya escrito: el teclado no se cierra entre una y otra. El puente se quita solo en cuanto pierde el foco. */
const PUENTE = "tl-puente-teclado";
const EVENTO = "tl-buscar-foco";

/** Llamar dentro del toque, ANTES de navegar a /buscar. */
export function abrirTeclado(etiqueta: string) {
  if (typeof document === "undefined") return;
  document.getElementById(PUENTE)?.remove();
  const el = document.createElement("input");
  el.id = PUENTE;
  el.type = "text";
  el.tabIndex = -1;
  el.autocomplete = "off";
  el.enterKeyHint = "search";
  el.setAttribute("aria-label", etiqueta);
  el.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0;margin:0;font-size:16px;pointer-events:none;";
  el.addEventListener("blur", () => el.remove(), { once: true });
  document.body.appendChild(el);
  el.focus({ preventScroll: true });
  window.dispatchEvent(new Event(EVENTO)); // si la página de Buscar ya está montada (escritorio), lo toma al momento
}

/** La página de Buscar: al montarse y cada vez que alguien toca «Buscar», su caja toma el foco y lo escrito en el puente. */
export function usarTeclado(caja: { current: HTMLInputElement | null }, poner: (f: (actual: string) => string) => void) {
  const tomar = () => {
    const el = document.getElementById(PUENTE) as HTMLInputElement | null;
    const input = caja.current;
    if (!el || !input) return;
    const escrito = el.value;
    input.focus({ preventScroll: true });
    el.remove();
    // Un cuadro después: así no lo pisa la búsqueda de la dirección que la página pone al montarse, y lo que se teclee en ese
    // instante queda detrás de lo ya escrito.
    if (escrito) requestAnimationFrame(() => poner((actual) => (escrito + actual).slice(0, 120)));
  };
  return { tomar, evento: EVENTO };
}
