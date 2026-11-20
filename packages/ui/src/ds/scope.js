/* Registro común de los componentes portados: cada módulo se agrega aquí y busca a los demás aquí. */
import { fotoCss, fotoFondo } from "../foto";
export const __ds_scope = {};

/* Fotos a la medida (F2a, scripts/portar-sistema.mjs, tabla FOTO): `__fondo(url, caja)` = el url("…") de la variante que le toca a una caja de ese
   ancho en px; `__fondoCss(valor, caja)` = lo mismo para un fondo que ya trae sus url(…) (o un color o degradado, que quedan igual). */
__ds_scope.__fondo = fotoFondo;
__ds_scope.__fondoCss = fotoCss;

/* 9c · Accesibilidad de lo que era un <div>/<span> con onClick (scripts/portar-sistema.mjs, tabla A11Y). `__btn(clic, nombre, extra, dentro)` devuelve
   role="button", tabIndex 0, Enter/Espacio (solo con el foco en el propio elemento, para no robarle la tecla a un campo de dentro) y el nombre
   si no hay texto que lo dé; sin clic no devuelve nada (un elemento sin acción no es un botón). `dentro`: el elemento lleva controles de verdad
   dentro, así que no puede ser un botón (interactivo anidado) y solo queda como zona de clic para el ratón. `__key`: lo mismo para quien ya
   trae su rol (tab, option). */
const tecla = (fn) => (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
    e.preventDefault();
    fn(e);
  }
};
__ds_scope.__btn = (fn, label, extra, dentro) =>
  !fn ? {} : dentro ? { role: "presentation" } : { role: "button", tabIndex: 0, ...(label ? { "aria-label": label } : null), ...extra, onKeyDown: tecla(fn) };
__ds_scope.__key = (fn) => (fn ? { tabIndex: 0, onKeyDown: tecla(fn) } : {});
/* 9c · Las flechas entre pestañas (WAI-ARIA tabs): ← → mueven el foco a la anterior / siguiente (en círculo), Inicio y Fin a la primera y la
   última; Enter o Espacio la eligen (activación manual: moverse no cambia de pestaña). Cada pestaña sigue en el orden de Tab. */
__ds_scope.__flechas = (e) => {
  const k = e.key;
  if (k !== "ArrowRight" && k !== "ArrowLeft" && k !== "Home" && k !== "End") return;
  const L = [...e.currentTarget.querySelectorAll('[role="tab"]')], i = L.indexOf(document.activeElement);
  if (i < 0 || !L.length) return;
  e.preventDefault();
  const j = k === "Home" ? 0 : k === "End" ? L.length - 1 : (i + (k === "ArrowRight" ? 1 : -1) + L.length) % L.length;
  L[j].focus();
  L[j].scrollIntoView?.({ block: "nearest", inline: "nearest" });
};
