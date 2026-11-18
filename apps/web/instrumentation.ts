/* 9f-3 · Al arrancar el proceso, lo editado de los textos de las pantallas (lib/cms.ts › edicionesE2) queda cargado antes de la primera página: dosIdiomas
   (lib/dos-idiomas.ts) lo ve desde la primera respuesta, en cualquier capa. Espera 3 s como mucho: sin base, la app arranca igual con el texto del código. */
export async function register() {
  // Misma forma que onRequestError: la condición con NEXT_RUNTIME la resuelve Next al compilar y el borde no arrastra la base.
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build" && !!process.env.DATABASE_URL) {
    try {
      const { edicionesE2 } = await import("./lib/cms");
      await Promise.race([edicionesE2(), new Promise((r) => { const t = setTimeout(r, 3000); (t as unknown as { unref?: () => void }).unref?.(); })]);
    } catch {
      /* la primera página la vuelve a pedir */
    }
  }
}

/* 9j · Los errores del SERVIDOR (fase9-apertura.md §4 9j; 8f ya junta los de la web y las apps): Next llama a onRequestError cuando una página, una
   acción o una ruta se cae. Va a lib/errores/ingesta.ts (recibirErrorServidor): tapado (teléfonos, correos, tarjetas, valores entre comillas), con
   su huella y agrupado, en las mismas tablas que los demás (kind «servidor»). Sistema › Salud y Sistema › Apps › Salud los muestran; «Errores en
   vivo» avisa a los Admins. Nada de aquí puede tumbar la respuesta: si guardar falla, se ignora. Solo en el proceso de Node: la condición con
   NEXT_RUNTIME es la que Next resuelve al compilar, así el borde (middleware) no arrastra la base. */
export async function onRequestError(err: unknown, request: { path: string }) {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { recibirErrorServidor } = await import("./lib/errores/ingesta");
      await recibirErrorServidor(err, typeof request?.path === "string" ? request.path.slice(0, 300) : null);
    } catch {
      /* sin base o con el tope lleno: el error ya salió en el registro del proceso */
    }
  }
}
