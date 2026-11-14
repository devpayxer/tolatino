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
