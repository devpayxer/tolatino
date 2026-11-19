/* 9t · El aviso oficial de Next.js de «empieza una navegación» (Link, router.push/replace, atrás y adelante): se lo pasa a la barra de
   navegación (app/BarraNavegacion.tsx) con un evento de la ventana, para que responda en el mismo toque aunque la navegación salga de un
   botón (router.push) y no de un enlace. No mide ni manda nada a ningún lado. */
export function onRouterTransitionStart(url: string, tipo: "push" | "replace" | "traverse") {
  window.dispatchEvent(new CustomEvent("tl:navega", { detail: { url, tipo } }));
}
