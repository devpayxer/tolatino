/* Bajar un archivo con un POST del mismo sitio: «Descargar mis datos» (Mi cuenta), «Exportar los datos del negocio» (Panel › Más), «Exportar sus
   datos» del equipo (Super Admin › Usuarios 360°) y la app de prueba (Beta). Un formulario oculto navega la página a la ruta; el servidor contesta
   «attachment» y el navegador guarda el archivo sin dejar la pantalla. Un uso: un GET (la vista previa de un enlace) nunca lo gasta.
   28 nov · Safari (WebKit; en el iPhone, cualquier navegador) corta TODAS las cargas en vuelo de la página en cuanto arranca esa navegación, y
   rechaza al instante («Load failed») las que empiezan mientras sigue pendiente, aunque termine en descarga; Chromium no corta nada. Si una de esas
   cargas es del router de Next (router.refresh, router.push, la respuesta de una acción del servidor que revalida), Next la da por caída y navega
   «a lo duro» a la misma pantalla, y ESA navegación cancela la del formulario: el archivo no se guarda y el enlace, de un uso, ya se gastó en el
   servidor (CI 45933165937: expeq9t y usr1l en el iPhone SE y el iPad; el router.refresh() iba justo detrás del envío). Por eso:
   - bajarPorPost se llama con la página quieta: nunca junto con router.refresh()/push/replace, ni con la respuesta de una acción que revalida
     todavía llegando (la acción que arma el archivo del equipo no revalida: exportarDatos con sinRevalidar);
   - lo que la pantalla haga después (refrescar) va en `despues` y corre cuando la página vuelve a poder cargar: una sonda del mismo sitio (HEAD
     de un archivo estático, sin caché) falla mientras la navegación está pendiente y pasa en cuanto terminó en descarga (en Chromium pasa siempre).
     Nunca un tiempo fijo: con la respuesta del servidor lenta, el refresco «a los 2,5 s» que tenía Mi cuenta cortaba la descarga igual.
   Guardián bajarSinCarrera (y su al revés en alreves9texpflujo). e2e expeq9t, usr1l y datos9d en WebKit (iPhone SE, iPad). */
const SONDA = "/assets/logo-tolatino.svg";
const PASO_MS = 250; // entre una sonda y la siguiente
const ARRANQUE_MS = 1000; // la navegación arranca en milisegundos: si las sondas pasan desde antes de esto y ninguna falló, el navegador no corta (Chromium)
const TOPE_MS = 120_000; // sin poder cargar en 2 minutos no se refresca: refrescar con la navegación aún pendiente la cortaría

export function bajarPorPost(accion: string, despues?: () => void): void {
  const f = document.createElement("form");
  f.method = "post"; f.action = accion; f.style.display = "none";
  document.body.appendChild(f); f.submit(); f.remove();
  if (despues) cuandoPuedaCargar(despues);
}

/* `fn` cuando la página vuelve a poder cargar (la navegación del formulario ya terminó en descarga), nunca antes. */
function cuandoPuedaCargar(fn: () => void): void {
  const t0 = Date.now();
  let fallo = false;
  const probar = () => {
    void fetch(SONDA, { method: "HEAD", cache: "no-store", credentials: "same-origin" }).then(() => true, () => false).then((ok) => {
      const t = Date.now() - t0;
      if (!ok) fallo = true;
      if (ok && (fallo || t >= ARRANQUE_MS)) { fn(); return; }
      if (t < TOPE_MS) window.setTimeout(probar, PASO_MS);
    });
  };
  window.setTimeout(probar, PASO_MS);
}
