/* Registro común de los componentes portados: cada módulo se agrega aquí y busca a los demás aquí. */
export const __ds_scope = {};

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
